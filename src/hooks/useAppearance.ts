import { useEffect } from 'react';
import { useAppSelector } from './redux';
import { getEffectiveTheme, saveAppearanceToStorage } from '@/utils/theme';

/**
 * Hook to apply appearance settings to the document
 * Applies theme, fontSize, and fontFamily to the root element
 * Also persists theme to localStorage to prevent flash on startup
 */
export const useAppearance = () => {
  const appearance = useAppSelector(
    (state) => state.settings.settings.appearance
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply theme
    const theme = appearance.theme;
    const effectiveTheme = getEffectiveTheme(theme);

    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    body.classList.remove('theme-light', 'theme-dark');

    // Add new theme class
    root.classList.add(`theme-${effectiveTheme}`);
    body.classList.add(`theme-${effectiveTheme}`);

    // Save to localStorage for next startup
    saveAppearanceToStorage({
      theme: appearance.theme,
      fontSize: appearance.fontSize,
      fontFamily: appearance.fontFamily,
    });

    // Apply font size (small: 12px, medium: 14px, large: 16px)
    const fontSizeMap = {
      small: '12px',
      medium: '14px',
      large: '16px',
    };
    const fontSize = fontSizeMap[appearance.fontSize] || fontSizeMap.medium;
    root.style.setProperty('font-size', fontSize, 'important');
    body.style.setProperty('font-size', fontSize, 'important');

    // Apply font family
    const fontFamily =
      appearance.fontFamily || 'system-ui, -apple-system, sans-serif';
    root.style.setProperty('font-family', fontFamily, 'important');
    body.style.setProperty('font-family', fontFamily, 'important');

    // Listen for system theme changes if theme is 'auto'
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        root.classList.remove('theme-light', 'theme-dark');
        body.classList.remove('theme-light', 'theme-dark');
        root.classList.add(`theme-${newTheme}`);
        body.classList.add(`theme-${newTheme}`);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [appearance]);
};

