import type { Mock } from 'vitest';

/** Narrow a Vitest-mocked function for `mockReturnValue` / `mockResolvedValue` etc. */
export function mockFn(fn: unknown): Mock {
  return fn as Mock;
}
