import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadThemeFromStorage,
  saveThemeToStorage,
  applyTheme,
  getEffectiveTheme,
  initializeTheme,
  loadAppearanceFromStorage,
  saveAppearanceToStorage,
} from '../theme';

describe('theme utils', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset document class
    document.documentElement.className = '';
    // Reset prefers-color-scheme mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('loadThemeFromStorage', () => {
    it('should return stored theme from localStorage', () => {
      localStorage.setItem('app-theme', 'dark');
      expect(loadThemeFromStorage()).toBe('dark');
    });

    it('should return null if no theme is stored', () => {
      expect(loadThemeFromStorage()).toBeNull();
    });

    it('should return null for invalid theme values', () => {
      localStorage.setItem('app-theme', 'invalid');
      expect(loadThemeFromStorage()).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock localStorage.getItem to throw an error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(loadThemeFromStorage()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load theme from localStorage:',
        expect.any(Error)
      );

      // Restore
      Storage.prototype.getItem = originalGetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('saveThemeToStorage', () => {
    it('should save theme to localStorage', () => {
      saveThemeToStorage('light');
      expect(localStorage.getItem('app-theme')).toBe('light');
    });

    it('should handle auto theme', () => {
      saveThemeToStorage('auto');
      expect(localStorage.getItem('app-theme')).toBe('auto');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock localStorage.setItem to throw an error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      saveThemeToStorage('dark');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save theme to localStorage:',
        expect.any(Error)
      );

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('applyTheme', () => {
    it('should apply light theme', () => {
      applyTheme('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    });

    it('should apply dark theme', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    });

    it('should apply auto theme based on system preference', () => {
      // Mock dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      applyTheme('auto');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return light for light theme', () => {
      expect(getEffectiveTheme('light')).toBe('light');
    });

    it('should return dark for dark theme', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
    });

    it('should return system preference for auto theme', () => {
      // Mock dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getEffectiveTheme('auto')).toBe('dark');
    });
  });

  describe('initializeTheme', () => {
    it('should load and apply theme from localStorage', () => {
      localStorage.setItem('app-theme', 'dark');
      initializeTheme();
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });

    it('should default to dark if no theme is stored', () => {
      initializeTheme();
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('loadAppearanceFromStorage', () => {
    it('should return appearance data from localStorage', () => {
      const appearance = { theme: 'dark', fontSize: 'large' as const };
      localStorage.setItem('app-appearance', JSON.stringify(appearance));
      expect(loadAppearanceFromStorage()).toEqual(appearance);
    });

    it('should return null if no appearance is stored', () => {
      expect(loadAppearanceFromStorage()).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('app-appearance', 'invalid json');
      expect(loadAppearanceFromStorage()).toBeNull();
    });

    it('should return null for data without theme', () => {
      localStorage.setItem('app-appearance', JSON.stringify({ fontSize: 'large' }));
      expect(loadAppearanceFromStorage()).toBeNull();
    });

    it('should return null for non-object data', () => {
      localStorage.setItem('app-appearance', JSON.stringify('string'));
      expect(loadAppearanceFromStorage()).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock localStorage.getItem to throw an error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(loadAppearanceFromStorage()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load appearance from localStorage:',
        expect.any(Error)
      );

      // Restore
      Storage.prototype.getItem = originalGetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('saveAppearanceToStorage', () => {
    it('should save appearance data to localStorage', () => {
      const appearance = { theme: 'light', fontSize: 'medium' as const };
      saveAppearanceToStorage(appearance);
      expect(localStorage.getItem('app-appearance')).toBe(JSON.stringify(appearance));
      expect(localStorage.getItem('app-theme')).toBe('light');
    });

    it('should save appearance with all optional fields', () => {
      const appearance = {
        theme: 'dark',
        fontSize: 'small' as const,
        fontFamily: 'Arial',
      };
      saveAppearanceToStorage(appearance);
      expect(localStorage.getItem('app-appearance')).toBe(JSON.stringify(appearance));
      expect(localStorage.getItem('app-theme')).toBe('dark');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Mock localStorage.setItem to throw an error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      saveAppearanceToStorage({ theme: 'light' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save appearance to localStorage:',
        expect.any(Error)
      );

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });
  });
});

