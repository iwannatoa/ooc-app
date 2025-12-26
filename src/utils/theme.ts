/**
 * Theme utility functions
 *
 * Handles theme persistence in localStorage to prevent flash of wrong theme
 * on application startup.
 */

const THEME_STORAGE_KEY = 'app-theme';
const APPEARANCE_STORAGE_KEY = 'app-appearance';

export type Theme = 'light' | 'dark' | 'auto';

export interface AppearanceData {
  theme: Theme;
  fontSize?: 'small' | 'medium' | 'large';
  fontFamily?: string;
}

/**
 * Get effective theme (resolves 'auto' to actual theme)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply theme to document (synchronous, for immediate application)
 */
export function applyTheme(theme: Theme): void {
  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;
  const body = document.body;

  // Remove existing theme classes
  root.classList.remove('theme-light', 'theme-dark');
  body.classList.remove('theme-light', 'theme-dark');

  // Add new theme class
  root.classList.add(`theme-${effectiveTheme}`);
  body.classList.add(`theme-${effectiveTheme}`);
}

/**
 * Load theme from localStorage
 */
export function loadThemeFromStorage(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (
      stored &&
      (stored === 'light' || stored === 'dark' || stored === 'auto')
    ) {
      return stored as Theme;
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error);
  }
  return null;
}

/**
 * Save theme to localStorage
 */
export function saveThemeToStorage(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
}

/**
 * Load full appearance settings from localStorage
 */
export function loadAppearanceFromStorage(): AppearanceData | null {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.theme) {
        return parsed as AppearanceData;
      }
    }
  } catch (error) {
    console.warn('Failed to load appearance from localStorage:', error);
  }
  return null;
}

/**
 * Save full appearance settings to localStorage
 */
export function saveAppearanceToStorage(appearance: AppearanceData): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    // Also save theme separately for quick access
    saveThemeToStorage(appearance.theme);
  } catch (error) {
    console.warn('Failed to save appearance to localStorage:', error);
  }
}

/**
 * Initialize theme on app startup (call before React renders)
 * This prevents flash of wrong theme
 */
export function initializeTheme(): void {
  // Try to load from localStorage first
  const storedTheme = loadThemeFromStorage();

  if (storedTheme) {
    // Apply stored theme immediately
    applyTheme(storedTheme);
  } else {
    // Fallback to default (dark)
    applyTheme('dark');
  }
}
