import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsApi } from '../settingsApi';
import { DEFAULT_SETTINGS } from '@/types/constants';

// Mock mockRouter before importing
vi.mock('@/mock/router', () => ({
  mockRouter: {
    match: vi.fn().mockResolvedValue(null),
  },
}));

describe('SettingsApi', () => {
  let api: SettingsApi;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    api = new SettingsApi(mockGetApiUrl);
  });

  it('should get app settings', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: JSON.stringify(DEFAULT_SETTINGS),
      }),
    });

    const settings = await api.getAppSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should update app settings', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await api.updateAppSettings(DEFAULT_SETTINGS);
    expect(result).toBe(true);
  });
});

