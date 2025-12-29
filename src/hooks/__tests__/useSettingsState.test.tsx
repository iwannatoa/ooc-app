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
});

