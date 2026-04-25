import type { ApiError } from '@/api/base';

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    (error as ApiError).name === 'ApiError'
  );
}

export function isPersistFailedError(error: unknown): boolean {
  return isApiError(error) && Boolean(error.persistFailed);
}

/**
 * Map common API/network errors to a short user-facing hint (append to toast).
 */
export function getApiErrorActionHint(error: unknown): string | null {
  if (!isApiError(error)) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)) {
      return 'hint_network';
    }
    return null;
  }
  const status = error.status;
  if (status === 401 || status === 403) {
    return 'hint_auth';
  }
  if (status === 408 || /timeout/i.test(error.message)) {
    return 'hint_timeout';
  }
  if (/ollama|connection refused|ECONNREFUSED/i.test(error.message)) {
    return 'hint_ollama';
  }
  if (/api key|401|unauthorized/i.test(error.message)) {
    return 'hint_api_key';
  }
  return null;
}
