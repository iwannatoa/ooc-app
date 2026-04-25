import { describe, it, expect, vi, afterEach } from 'vitest';
import { discoverFlaskPortBrowser } from '../discoverFlaskPortBrowser';

describe('discoverFlaskPortBrowser', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('returns first port where /api/health succeeds', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes(':5002/api/health')) {
        return { ok: true } as Response;
      }
      return { ok: false } as Response;
    });

    await expect(discoverFlaskPortBrowser()).resolves.toBe(5002);
  });

  it('returns null when no port responds ok', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false } as Response));

    await expect(discoverFlaskPortBrowser()).resolves.toBeNull();
  });
});
