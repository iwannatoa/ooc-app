import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppearance } from '../useAppearance';
import { createTestStore } from '@/test/utils';
import { Provider } from 'react-redux';
import React from 'react';

// Mock dependencies
vi.mock('@/utils/theme', () => ({
  getEffectiveTheme: vi.fn(),
  saveAppearanceToStorage: vi.fn(),
}));

import { getEffectiveTheme, saveAppearanceToStorage } from '@/utils/theme';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useAppearance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
    document.body.className = '';
    document.documentElement.style.fontSize = '';
    document.body.style.fontSize = '';
    document.documentElement.style.fontFamily = '';
    document.body.style.fontFamily = '';
    (getEffectiveTheme as any).mockReturnValue('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply theme classes to root and body', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.classList.contains('theme-dark')).toBe(
      true
    );
    expect(document.body.classList.contains('theme-dark')).toBe(true);
  });

  it('should remove old theme classes before adding new ones', () => {
    document.documentElement.classList.add('theme-light');
    document.body.classList.add('theme-light');

    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.classList.contains('theme-light')).toBe(
      false
    );
    expect(document.documentElement.classList.contains('theme-dark')).toBe(
      true
    );
  });

  it('should apply font size', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'large',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.style.getPropertyValue('font-size')).toBe(
      '16px'
    );
    expect(document.body.style.getPropertyValue('font-size')).toBe('16px');
  });

  it('should apply small font size', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'small',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.style.getPropertyValue('font-size')).toBe(
      '12px'
    );
  });

  it('should apply medium font size as default', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.style.getPropertyValue('font-size')).toBe(
      '14px'
    );
  });

  it('should apply font family', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            fontFamily: 'Times New Roman',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.style.getPropertyValue('font-family')).toBe(
      'Times New Roman'
    );
    expect(document.body.style.getPropertyValue('font-family')).toBe(
      'Times New Roman'
    );
  });

  it('should use default font family when not provided', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            fontFamily: '',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.style.getPropertyValue('font-family')).toBe(
      'system-ui, -apple-system, sans-serif'
    );
  });

  it('should save appearance to storage', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'large',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(saveAppearanceToStorage).toHaveBeenCalledWith({
      theme: 'dark',
      fontSize: 'large',
      fontFamily: 'Arial',
    });
  });

  it('should listen for system theme changes when theme is auto', () => {
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    window.matchMedia = mockMatchMedia;

    (getEffectiveTheme as any).mockReturnValue('light');

    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'auto',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    const { unmount } = renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    const mediaQuery = mockMatchMedia.mock.results[0].value;
    expect(mediaQuery.addEventListener).toHaveBeenCalled();

    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
  });

  it('should update theme when system preference changes', () => {
    const listenerStore: { listener?: (e: MediaQueryListEvent) => void } = {};
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn((_event, listener) => {
        listenerStore.listener = listener as (e: MediaQueryListEvent) => void;
      }),
      removeEventListener: vi.fn(),
    });
    window.matchMedia = mockMatchMedia;

    (getEffectiveTheme as any).mockReturnValue('light');

    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'auto',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    // Simulate system theme change
    if (listenerStore.listener) {
      listenerStore.listener({ matches: true } as MediaQueryListEvent);
    }

    expect(document.documentElement.classList.contains('theme-dark')).toBe(
      true
    );
  });

  it('should update when appearance settings change', () => {
    const store = createTestStore({
      settings: {
        settings: {
          appearance: {
            theme: 'light',
            fontSize: 'medium',
            fontFamily: 'Arial',
          },
        },
      },
    });

    (getEffectiveTheme as any).mockReturnValue('light');

    const { rerender } = renderHook(() => useAppearance(), {
      wrapper: createWrapper(store),
    });

    expect(document.documentElement.classList.contains('theme-light')).toBe(
      true
    );

    // Update store
    store.dispatch({
      type: 'settings/setSettings',
      payload: {
        ...store.getState().settings.settings,
        appearance: {
          theme: 'dark',
          fontSize: 'large',
          fontFamily: 'Times New Roman',
        },
      },
    });

    (getEffectiveTheme as any).mockReturnValue('dark');
    rerender();

    expect(document.documentElement.classList.contains('theme-dark')).toBe(
      true
    );
    expect(document.documentElement.style.getPropertyValue('font-size')).toBe(
      '16px'
    );
  });
});
