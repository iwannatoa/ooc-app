/**
 * Base API Client
 * 
 * Provides common functionality for all API clients:
 * - URL resolution (with Flask port handling)
 * - Error handling
 * - Request/Response interceptors
 * - Mock mode support
 */

import { API_CONSTANTS } from '@/constants';
import { mockRouter } from '@/mock/router';
import { invoke } from '@tauri-apps/api/core';

export interface RequestConfig extends RequestInit {
  timeout?: number;
  skipErrorHandling?: boolean;
}

/** Optional side channels for SSE consumers (e.g. story `parse_warnings` frames). */
export interface StreamExtras {
  parseWarningsCollector?: string[];
}

export interface ApiError extends Error {
  code?: number;
  status?: number;
  response?: unknown;
  /** Stream ended with persist_failed SSE frame (chat saved to UI but not DB). */
  persistFailed?: boolean;
}

/**
 * Create a custom error with additional context
 */
export function createApiError(
  message: string,
  status?: number,
  code?: number,
  response?: unknown
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.response = response;
  error.name = 'ApiError';
  return error;
}

/**
 * Get API base URL
 * This function should be provided by the caller (from useFlaskPort hook)
 */
export type GetApiUrlFn = () => Promise<string>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

let runtimeTokenPromise: Promise<string | null> | null = null;

const reportFrontendApiLog = async (
  level: 'error' | 'warn',
  message: string
): Promise<void> => {
  try {
    await invoke<ApiResponse<string>>('frontend_log', { level, message });
  } catch {
    // Best-effort diagnostics only.
  }
};

const getRuntimeToken = async (): Promise<string | null> => {
  if (!runtimeTokenPromise) {
    runtimeTokenPromise = invoke<ApiResponse<string>>('get_flask_api_token')
      .then((resp) => {
        if (resp.success && resp.data && resp.data.trim()) {
          return resp.data.trim();
        }
        return import.meta.env.VITE_FLASK_API_TOKEN?.trim() || null;
      })
      .catch(() => import.meta.env.VITE_FLASK_API_TOKEN?.trim() || null);
  }

  return runtimeTokenPromise;
};

const resetRuntimeToken = (): void => {
  runtimeTokenPromise = null;
};

export const resetRuntimeTokenForTest = (): void => {
  resetRuntimeToken();
};

async function buildAuthHeaders(
  extra?: HeadersInit
): Promise<Record<string, string>> {
  const token = await getRuntimeToken();
  const base: Record<string, string> = {};
  if (token) {
    base.Authorization = `Bearer ${token}`;
  }
  if (!extra) {
    return base;
  }
  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      base[k] = v;
    });
    return base;
  }
  if (Array.isArray(extra)) {
    for (const [k, v] of extra) {
      base[k] = v;
    }
    return base;
  }
  return { ...base, ...(extra as Record<string, string>) };
}

/**
 * Base API client class
 */
export class BaseApiClient {
  protected getApiUrl: GetApiUrlFn;
  protected defaultTimeout: number;

  constructor(
    getApiUrl: GetApiUrlFn,
    defaultTimeout = API_CONSTANTS.DEFAULT_TIMEOUT
  ) {
    this.getApiUrl = getApiUrl;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Make a fetch request with error handling and timeout
   */
  protected async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    // Check mock router first
    const mockResponse = await mockRouter.match(
      config.method || 'GET',
      endpoint,
      {
        body: config.body ? JSON.parse(config.body as string) : undefined,
      }
    );

    if (mockResponse !== null) {
      return mockResponse as T;
    }

    const {
      timeout = this.defaultTimeout,
      skipErrorHandling,
      ...fetchConfig
    } = config;

    // Get base URL
    const baseUrl = await this.getApiUrl();
    const url = `${baseUrl}${endpoint}`;
    const method = (fetchConfig.method || 'GET').toUpperCase();

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response = await fetch(url, {
        ...fetchConfig,
        headers: await buildAuthHeaders(fetchConfig.headers),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        resetRuntimeToken();
        response = await fetch(url, {
          ...fetchConfig,
          headers: await buildAuthHeaders(fetchConfig.headers),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        await reportFrontendApiLog(
          'error',
          `[API_FAIL] ${method} ${endpoint} -> ${response.status} (${response.statusText}) payload=${JSON.stringify(errorData)}`
        );

        if (skipErrorHandling) {
          throw createApiError(
            errorData.error || 'Request failed',
            response.status,
            errorData.code
          );
        }

        throw createApiError(
          errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      // Parse JSON response
      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        code?: number;
        [key: string]: unknown;
      };

      // Some endpoints (e.g. /api/health) intentionally return plain payload
      // without a `success` wrapper. Only enforce this contract when provided.
      if ('success' in data && !data.success) {
        throw createApiError(
          data.error || 'Request failed',
          response.status,
          data.code,
          data
        );
      }

      // Return the entire response object, not just data.data
      // This allows API clients to extract the fields they need
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await reportFrontendApiLog(
        'error',
        `[API_EXCEPTION] ${method} ${endpoint} url=${url} message=${errorMessage}`
      );

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw createApiError('Request timeout', 408);
        }
        // Re-throw ApiError as-is
        if ((error as ApiError).name === 'ApiError') {
          throw error;
        }
        // Wrap other errors
        throw createApiError(error.message, undefined, undefined, error);
      }

      throw createApiError('Unknown error occurred');
    }
  }

  /**
   * Make a POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a GET request
   */
  protected async get<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
      headers: {
        ...config.headers,
      },
    });
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T>(
    endpoint: string,
    body?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a streaming request
   */
  protected async stream(
    endpoint: string,
    body: unknown,
    onChunk: (chunk: string, accumulated: string) => void,
    config: RequestConfig = {},
    streamExtras?: StreamExtras
  ): Promise<string> {
    // Check mock router first for streaming endpoints
    const mockResponse = await mockRouter.match('POST', endpoint, { body });

    if (mockResponse !== null && mockResponse.success) {
      // Simulate streaming by sending chunks
      const content = mockResponse.response || mockResponse.outline || '';
      const words = content.split('');
      let accumulated = '';

      for (let i = 0; i < words.length; i += 5) {
        const chunk = words.slice(i, i + 5).join('');
        accumulated += chunk;
        onChunk(chunk, accumulated);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      return accumulated;
    }

    // Get base URL
    const baseUrl = await this.getApiUrl();
    const url = `${baseUrl}${endpoint}`;

    let response = await fetch(url, {
      method: 'POST',
      headers: await buildAuthHeaders({
        'Content-Type': 'application/json',
        ...((config.headers as Record<string, string>) || {}),
      }),
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      resetRuntimeToken();
      response = await fetch(url, {
        method: 'POST',
        headers: await buildAuthHeaders({
          'Content-Type': 'application/json',
          ...((config.headers as Record<string, string>) || {}),
        }),
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Failed to start stream',
      }));
      await reportFrontendApiLog(
        'error',
        `[STREAM_FAIL] POST ${endpoint} -> ${response.status} (${response.statusText}) payload=${JSON.stringify(errorData)}`
      );
      throw createApiError(
        errorData.error || 'Failed to start stream',
        response.status
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    if (!reader) {
      throw createApiError('Stream reader not available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw createApiError(data.error);
              }
              if (data.persist_failed) {
                const err = createApiError(
                  data.error || 'Failed to save chat messages'
                ) as ApiError;
                err.persistFailed = true;
                throw err;
              }
              if ('parse_warnings' in data && Array.isArray(data.parse_warnings)) {
                if (streamExtras?.parseWarningsCollector) {
                  for (const w of data.parse_warnings) {
                    if (typeof w === 'string') {
                      streamExtras.parseWarningsCollector.push(w);
                    }
                  }
                }
                continue;
              }
              if (data.done) {
                return accumulated;
              }
              // Parsed JSON but not a recognized SSE control payload — do not append to story text.
              continue;
            } catch (e) {
              // If JSON parse fails, treat as plain text chunk
              if (!(e instanceof SyntaxError)) {
                throw e;
              }
              // Skip empty chunks to avoid unnecessary updates
              if (!dataStr || !dataStr.trim()) {
                continue;
              }
              // Plain text chunk
              accumulated += dataStr;
              onChunk(dataStr, accumulated);
            }
          }
        }
      }

      return accumulated;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown stream error';
      await reportFrontendApiLog(
        'error',
        `[STREAM_EXCEPTION] POST ${endpoint} url=${url} message=${errorMessage}`
      );
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}

