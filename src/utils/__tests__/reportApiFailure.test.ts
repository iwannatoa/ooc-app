import { describe, it, expect, vi } from 'vitest';
import { reportApiFailureToToast } from '../reportApiFailure';

function makeApiError(
  message: string,
  status?: number,
  persistFailed?: boolean
): Error & { name: string; status?: number; persistFailed?: boolean } {
  const err = new Error(message) as Error & {
    name: string;
    status?: number;
    persistFailed?: boolean;
  };
  err.name = 'ApiError';
  err.status = status;
  if (persistFailed) err.persistFailed = true;
  return err;
}

describe('reportApiFailureToToast', () => {
  const t = vi.fn((key: string, params?: Record<string, string | number>) => {
    if (params?.detail !== undefined) {
      return `${key}|${params.detail}`;
    }
    return key;
  });
  const showError = vi.fn();
  const showWarning = vi.fn();

  it('shows persist warning when persist_failed', () => {
    const err = makeApiError('x', 500, true);
    reportApiFailureToToast(err, {
      t,
      showError,
      showWarning,
      detailKey: 'storyErrors.generateFailedDetail',
      hintNamespace: 'storyErrors',
    });
    expect(showWarning).toHaveBeenCalledWith(
      'storyErrors.persistStreamBodySavedNotHistory'
    );
    expect(showError).not.toHaveBeenCalled();
  });

  it('shows error with hint when ApiError has status', () => {
    const err = makeApiError('unauthorized', 401);
    reportApiFailureToToast(err, {
      t,
      showError,
      detailKey: 'storyErrors.confirmFailedDetail',
      hintNamespace: 'storyErrors',
    });
    expect(showError).toHaveBeenCalled();
    const arg = showError.mock.calls[0][0] as string;
    expect(arg).toContain('storyErrors.confirmFailedDetail');
    expect(arg).toContain('storyErrors.hint_auth');
  });
});
