import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppSettings } from '../useAppSettings';
import { createTestStore, tick } from '@/test/utils';
import { Provider } from 'react-redux';
import React from 'react';

// Mock dependencies
vi.mock('../useApiClients', () => ({
  useApiClients: vi.fn(),
}));

vi.mock('@/mock', () => ({
  isMockMode: vi.fn(),
}));

vi.mock('@/utils/theme', () => ({
  loadAppearanceFromStorage: vi.fn(),
}));

import { useApiClients } from '../useApiClients';
import { isMockMode } from '@/mock';
import { loadAppearanceFromStorage } from '@/utils/theme';
import { DEFAULT_SETTINGS } from '@/types/constants';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useAppSettings', () => {
  const mockGetAppSettings = vi.fn();
  const mockSettingsApi = {
    getAppSettings: mockGetAppSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (isMockMode as any).mockReturnValue(false);
    (loadAppearanceFromStorage as any).mockReturnValue(null);
  });

  it('should not load settings in mock mode', () => {
    (isMockMode as any).mockReturnValue(true);
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    expect(mockGetAppSettings).not.toHaveBeenCalled();
  });

  it('should not load settings when API is not available', () => {
    (useApiClients as any).mockReturnValue({
      settingsApi: null,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    expect(mockGetAppSettings).not.toHaveBeenCalled();
  });

  it('should load and merge settings from API', async () => {
    const loadedSettings = {
      general: {
        language: 'en',
      },
      appearance: {
        theme: 'dark',
        fontSize: 'large',
      },
      ai: {
        provider: 'ollama',
        ollama: {
          model: 'llama3',
        },
      },
    };

    mockGetAppSettings.mockResolvedValue(loadedSettings);
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    await tick();
    expect(mockGetAppSettings).toHaveBeenCalled();

    const state = store.getState();
    expect(state.settings.settings.general.language).toBe('en');
    expect(state.settings.settings.appearance.theme).toBe('dark');
    expect(state.settings.settings.appearance.fontSize).toBe('large');
    expect(state.settings.settings.ai.provider).toBe('ollama');
    expect(state.settings.settings.ai.ollama.model).toBe('llama3');
  });

  it('should merge with default settings', async () => {
    const loadedSettings = {
      general: {
        language: 'en',
      },
    };

    mockGetAppSettings.mockResolvedValue(loadedSettings);
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    await tick();
    expect(mockGetAppSettings).toHaveBeenCalled();

    const state = store.getState();
    // Should have default appearance settings
    expect(state.settings.settings.appearance).toBeDefined();
    expect(state.settings.settings.appearance.theme).toBe(
      DEFAULT_SETTINGS.appearance.theme
    );
  });

  it('should handle invalid fontSize and use default', async () => {
    const loadedSettings = {
      appearance: {
        fontSize: 'invalid' as any,
      },
    };

    mockGetAppSettings.mockResolvedValue(loadedSettings);
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    await tick();
    expect(mockGetAppSettings).toHaveBeenCalled();

    const state = store.getState();
    expect(state.settings.settings.appearance.fontSize).toBe(
      DEFAULT_SETTINGS.appearance.fontSize
    );
  });

  it('should remove compactMode from appearance if present', async () => {
    const loadedSettings = {
      appearance: {
        theme: 'dark',
        compactMode: true,
      },
    };

    mockGetAppSettings.mockResolvedValue(loadedSettings);
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    await tick();
    expect(mockGetAppSettings).toHaveBeenCalled();

    const state = store.getState();
    expect(state.settings.settings.appearance.compactMode).toBeUndefined();
  });

  it('should fallback to localStorage on error', async () => {
    const storedAppearance = {
      theme: 'light',
      fontSize: 'small',
      fontFamily: 'Arial',
    };

    (loadAppearanceFromStorage as any).mockReturnValue(storedAppearance);
    mockGetAppSettings.mockRejectedValue(new Error('API Error'));
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    await tick();
    expect(mockGetAppSettings).toHaveBeenCalled();

    const state = store.getState();
    expect(state.settings.settings.appearance.theme).toBe('light');
    expect(state.settings.settings.appearance.fontSize).toBe('small');
    expect(state.settings.settings.appearance.fontFamily).toBe('Arial');
  });

  it('should only load settings once', async () => {
    mockGetAppSettings.mockResolvedValue({});
    (useApiClients as any).mockReturnValue({
      settingsApi: mockSettingsApi,
    });

    const store = createTestStore();
    const { rerender } = renderHook(() => useAppSettings(), {
      wrapper: createWrapper(store),
    });

    // Wait for the first load to complete
    await tick();

    expect(mockGetAppSettings).toHaveBeenCalledTimes(1);

    rerender();

    // Wait a bit to ensure no additional calls
    await tick();

    expect(mockGetAppSettings).toHaveBeenCalledTimes(1);
  });
});
