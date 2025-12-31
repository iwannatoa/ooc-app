import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import { useSettingsState } from '../useSettingsState';
import { createTestStore } from '@/test/utils';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useSettingsState', () => {
  it('should return settings state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('settings');
    expect(result.current).toHaveProperty('updateSettings');
    expect(result.current).toHaveProperty('updateAiProvider');
  });

  it('should update AI provider', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateAiProvider('deepseek');
    });

    expect(result.current.settings.ai.provider).toBe('deepseek');
  });

  it('should update appearance settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateAppearanceSettings({ theme: 'dark' });
    });

    expect(result.current.settings.appearance.theme).toBe('dark');
  });

  it('should update settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    const newSettings = {
      general: {
        language: 'en',
        autoStart: true,
        minimizeToTray: false,
        startWithSystem: false,
      },
    };

    act(() => {
      result.current.updateSettings(newSettings);
    });

    expect(result.current.settings.general.language).toBe('en');
    expect(result.current.settings.general.autoStart).toBe(true);
  });

  it('should set settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    const newSettings = {
      general: {
        language: 'zh',
        autoStart: false,
        minimizeToTray: true,
        startWithSystem: true,
      },
      appearance: {
        theme: 'light' as const,
        fontSize: 'medium' as const,
        fontFamily: 'Arial',
      },
      ai: {
        provider: 'ollama' as const,
        ollama: { model: 'test-model' },
      },
      advanced: {
        enableStreaming: true,
        apiTimeout: 5000,
        maxRetries: 3,
        logLevel: 'info' as const,
        enableDiagnostics: false,
      },
    };

    act(() => {
      result.current.setSettings(newSettings);
    });

    expect(result.current.settings.general.language).toBe('zh');
  });

  it('should reset settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    // First update settings
    act(() => {
      result.current.updateSettings({
        general: { language: 'en', autoStart: true, minimizeToTray: false, startWithSystem: false },
      });
    });

    // Then reset
    act(() => {
      result.current.resetSettings();
    });

    // Settings should be reset to default
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should update Ollama config', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateOllamaConfig({ model: 'llama2' });
    });

    expect(result.current.settings.ai.ollama?.model).toBe('llama2');
  });

  it('should update DeepSeek config', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateDeepSeekConfig({ model: 'deepseek-chat' });
    });

    expect(result.current.settings.ai.deepseek?.model).toBe('deepseek-chat');
  });

  it('should update general settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateGeneralSettings({ language: 'en' });
    });

    expect(result.current.settings.general.language).toBe('en');
  });

  it('should update advanced settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateAdvancedSettings({ enableStreaming: false });
    });

    expect(result.current.settings.advanced.enableStreaming).toBe(false);
  });

  it('should set settings open state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setSettingsOpen(true);
    });

    expect(result.current.isSettingsOpen).toBe(true);
  });

  it('should set current tab', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setCurrentTab('appearance');
    });

    expect(result.current.currentTab).toBe('appearance');
  });

  it('should set has unsaved changes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should mark settings saved', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: createWrapper(store),
    });

    // First set unsaved changes
    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    // Then mark as saved
    act(() => {
      result.current.markSettingsSaved();
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});

