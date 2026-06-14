import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { createApiError, resetRuntimeTokenForTest } from '../base';
import {
  createTestableBaseApiClient,
  TestableBaseApiClient,
  createMockResponse,
  createMockReadableStream,
} from '@/mock/testHelpers';

// Mock the mock router before importing base
vi.mock('@/mock/router', () => {
  const mockMatch = vi.fn().mockResolvedValue(null);
  return {
    mockRouter: {
      match: mockMatch,
    },
  };
});
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Import mockRouter after mocking
import { mockRouter } from '@/mock/router';

describe('BaseApiClient', () => {
  let client: TestableBaseApiClient;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetRuntimeTokenForTest();
    vi.mocked(invoke).mockResolvedValue({ success: false });
    global.fetch = vi.fn();
    client = createTestableBaseApiClient(mockGetApiUrl);
    vi.mocked(mockRouter.match).mockResolvedValue(null);
  });

  describe('createApiError', () => {
    it('should create API error', () => {
      const error = createApiError('Test error', 404, 1001, { data: 'test' });
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe(1001);
      expect(error.response).toEqual({ data: 'test' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('request', () => {
    it('should successfully send GET request', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ success: true, data: 'test' }),
        })
      );

      const result = await client.testGet<{ success: boolean; data: string }>(
        '/api/test'
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle error response', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 404,
          json: async () => ({ success: false, error: 'Not found' }),
        })
      );

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await expect(
        client.testGet('/api/test', { timeout: 50 })
      ).rejects.toThrow();
    });

    it('should use mock router', async () => {
      vi.mocked(mockRouter.match).mockResolvedValue({
        success: true,
        data: 'mock',
      });

      const result = await client.testGet<{ success: boolean; data: string }>(
        '/api/test'
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe('mock');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should refresh token and retry once on 401 response', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ success: true, data: 'token-old' })
        .mockResolvedValueOnce({ success: true, data: 'token-new' });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: 'Unauthorized' }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: 'ok' }),
          })
        );

      const result = await client.testGet<{ success: boolean; data: string }>(
        '/api/test'
      );

      expect(result.data).toBe('ok');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const firstHeaders = vi.mocked(global.fetch).mock.calls[0][1]
        ?.headers as Record<string, string>;
      const secondHeaders = vi.mocked(global.fetch).mock.calls[1][1]
        ?.headers as Record<string, string>;

      expect(firstHeaders.Authorization).toBe('Bearer token-old');
      expect(secondHeaders.Authorization).toBe('Bearer token-new');
      expect(
        vi.mocked(invoke).mock.calls.filter(
          ([command]) => command === 'get_flask_api_token'
        )
      ).toHaveLength(2);
    });

    it('should refresh token and retry once on 403 response', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ success: true, data: 'token-old' })
        .mockResolvedValueOnce({ success: true, data: 'token-new' });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: 'Forbidden' }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: 'ok403' }),
          })
        );

      const result = await client.testGet<{ success: boolean; data: string }>(
        '/api/test'
      );

      expect(result.data).toBe('ok403');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const firstHeaders = vi.mocked(global.fetch).mock.calls[0][1]
        ?.headers as Record<string, string>;
      const secondHeaders = vi.mocked(global.fetch).mock.calls[1][1]
        ?.headers as Record<string, string>;

      expect(firstHeaders.Authorization).toBe('Bearer token-old');
      expect(secondHeaders.Authorization).toBe('Bearer token-new');
    });

    it('should stop retrying after second 401 failure', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ success: true, data: 'token-old' })
        .mockResolvedValueOnce({ success: true, data: 'token-new' });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: 'Unauthorized once' }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: 'Unauthorized twice' }),
          })
        );

      await expect(client.testGet('/api/test')).rejects.toThrow('Unauthorized twice');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should use env token fallback when runtime token command fails', async () => {
      vi.stubEnv('VITE_FLASK_API_TOKEN', 'env-fallback-token');
      vi.mocked(invoke).mockRejectedValueOnce(new Error('invoke unavailable'));
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: 'env-ok' }),
        })
      );

      const result = await client.testGet<{ success: boolean; data: string }>(
        '/api/test'
      );
      expect(result.data).toBe('env-ok');
      const headers = vi.mocked(global.fetch).mock.calls[0][1]
        ?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer env-fallback-token');
      vi.unstubAllEnvs();
    });
  });

  describe('post', () => {
    it('should send POST request', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ success: true }),
        })
      );

      await client.testPost('/api/test', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should send DELETE request', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ success: true }),
        })
      );

      await client.testDelete('/api/test', { id: '1' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle non-OK response with JSON error', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({
            success: false,
            error: 'Server error',
            code: 5001,
          }),
        })
      );

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle non-OK response with invalid JSON', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => {
            throw new Error('Invalid JSON');
          },
        })
      );

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle response with success: false', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          status: 200,
          json: async () => ({
            success: false,
            error: 'Request failed',
            code: 1001,
          }),
        })
      );

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle AbortError', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        const error = new Error('Request aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle generic Error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should handle unknown error', async () => {
      vi.mocked(global.fetch).mockRejectedValue('Unknown error');

      await expect(client.testGet('/api/test')).rejects.toThrow();
    });

    it('should use skipErrorHandling flag', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 404,
          json: async () => ({ success: false, error: 'Not found' }),
        })
      );

      await expect(
        client.testGet('/api/test', { skipErrorHandling: true })
      ).rejects.toThrow();
    });
  });

  describe('stream', () => {
    it('should handle streaming with mock response', async () => {
      const mockOnChunk = vi.fn();
      vi.mocked(mockRouter.match).mockResolvedValue({
        success: true,
        outline: 'Test outline content',
      });

      const result = await client.testStream('/api/stream', {}, mockOnChunk);

      expect(result).toBe('Test outline content');
      expect(mockOnChunk).toHaveBeenCalled();
    });

    it('should handle streaming with real response', async () => {
      const mockOnChunk = vi.fn();
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: createMockReadableStream(() => mockReader) as ReadableStream<Uint8Array>,
        })
      );

      const result = await client.testStream(
        '/api/stream',
        { data: 'test' },
        mockOnChunk
      );

      expect(result).toBe('');
      expect(mockReader.read).toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should refresh token and retry stream once on 403 response', async () => {
      const mockOnChunk = vi.fn();
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.mocked(invoke)
        .mockResolvedValueOnce({ success: true, data: 'token-old' })
        .mockResolvedValueOnce({ success: true, data: 'token-new' });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: 'Forbidden' }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            body: createMockReadableStream(
              () => mockReader
            ) as ReadableStream<Uint8Array>,
          })
        );

      const result = await client.testStream('/api/stream', {}, mockOnChunk);
      expect(result).toBe('');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const firstHeaders = vi.mocked(global.fetch).mock.calls[0][1]
        ?.headers as Record<string, string>;
      const secondHeaders = vi.mocked(global.fetch).mock.calls[1][1]
        ?.headers as Record<string, string>;
      expect(firstHeaders.Authorization).toBe('Bearer token-old');
      expect(secondHeaders.Authorization).toBe('Bearer token-new');
    });

    it('should stop retrying stream after second 403 failure', async () => {
      const mockOnChunk = vi.fn();
      vi.mocked(invoke)
        .mockResolvedValueOnce({ success: true, data: 'token-old' })
        .mockResolvedValueOnce({ success: true, data: 'token-new' });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: 'Forbidden once' }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: 'Forbidden twice' }),
          })
        );

      await expect(client.testStream('/api/stream', {}, mockOnChunk)).rejects.toThrow(
        'Forbidden twice'
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle streaming chunks', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const chunks = [
        encoder.encode('data: {"chunk": "Hello"}\n'),
        encoder.encode('data: {"chunk": " World"}\n'),
        encoder.encode('data: {"done": true}\n'),
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (chunkIndex < chunks.length) {
            return Promise.resolve({
              done: false,
              value: chunks[chunkIndex++],
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
        releaseLock: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: createMockReadableStream(() => mockReader) as ReadableStream<Uint8Array>,
        })
      );

      await client.testStream('/api/stream', {}, mockOnChunk);

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming error in response', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const errorChunk = encoder.encode('data: {"error": "Stream error"}\n');

      const mockReader = {
        read: vi.fn().mockResolvedValue({
          done: false,
          value: errorChunk,
        }),
        releaseLock: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: createMockReadableStream(() => mockReader) as ReadableStream<Uint8Array>,
        })
      );

      await expect(
        client.testStream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle streaming with non-OK response', async () => {
      const mockOnChunk = vi.fn();
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Stream failed' }),
        })
      );

      await expect(
        client.testStream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle streaming with no reader', async () => {
      const mockOnChunk = vi.fn();
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: null,
        })
      );

      await expect(
        client.testStream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle plain text chunks in stream', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const textChunk = encoder.encode('data: plain text\n');

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: textChunk,
          })
          .mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: createMockReadableStream(() => mockReader) as ReadableStream<Uint8Array>,
        })
      );

      await client.testStream('/api/stream', {}, mockOnChunk);

      expect(mockOnChunk).toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle empty chunks in stream', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const emptyChunk = encoder.encode('data: \n');

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: emptyChunk,
          })
          .mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          body: createMockReadableStream(() => mockReader) as ReadableStream<Uint8Array>,
        })
      );

      await client.testStream('/api/stream', {}, mockOnChunk);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });

  describe('request config', () => {
    it('should use custom timeout', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await expect(
        client.testGet('/api/test', { timeout: 50 })
      ).rejects.toThrow();
    });

    it('should handle POST with empty body', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ success: true }),
        })
      );

      await client.testPost('/api/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle DELETE with empty body', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ success: true }),
        })
      );

      await client.testDelete('/api/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
