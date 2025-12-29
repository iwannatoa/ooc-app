import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadThemeFromStorage,
  saveThemeToStorage,
  applyTheme,
  getEffectiveTheme,
  initializeTheme,
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
});

