import { useEffect, useRef } from 'react';
import { useAppDispatch } from './redux';
import { setSettings } from '@/store/slices/settingsSlice';
import { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { useApiClients } from './useApiClients';
import { isMockMode } from '@/mock';
import { loadAppearanceFromStorage } from '@/utils/theme';

/**
 * Hook to load app settings from backend on app startup
 */
export const useAppSettings = () => {
  const dispatch = useAppDispatch();
  const { settingsApi } = useApiClients();
  const hasLoadedRef = useRef(false);

  // Load settings from backend on mount (only once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!settingsApi || isMockMode()) {
      // Skip loading in mock mode or if API is not available
      return;
    }
    
    const loadSettings = async () => {
      hasLoadedRef.current = true;

      try {
        const loadedSettings = await settingsApi.getAppSettings();
        
        // Merge with default settings to ensure all fields exist
        const mergedSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          // Deep merge nested objects
          general: { ...DEFAULT_SETTINGS.general, ...(loadedSettings.general || {}) },
          appearance: { 
            ...DEFAULT_SETTINGS.appearance, 
            ...(loadedSettings.appearance || {}),
            // Ensure fontSize is one of the valid values
            fontSize: ['small', 'medium', 'large'].includes(loadedSettings.appearance?.fontSize as string) 
              ? (loadedSettings.appearance.fontSize as 'small' | 'medium' | 'large')
              : DEFAULT_SETTINGS.appearance.fontSize,
          },
          ai: {
            ...DEFAULT_SETTINGS.ai,
            ...(loadedSettings.ai || {}),
            ollama: { ...DEFAULT_SETTINGS.ai.ollama, ...(loadedSettings.ai?.ollama || {}) },
            deepseek: { ...DEFAULT_SETTINGS.ai.deepseek, ...(loadedSettings.ai?.deepseek || {}) },
          },
          advanced: { ...DEFAULT_SETTINGS.advanced, ...(loadedSettings.advanced || {}) },
        };
        // Remove compactMode if it exists in the loaded settings
        if ('compactMode' in mergedSettings.appearance) {
          delete (mergedSettings.appearance as any).compactMode;
        }
        dispatch(setSettings(mergedSettings));
      } catch (error) {
        console.error('Failed to load settings from backend:', error);
        
        // Fallback to localStorage if backend load fails
        const storedAppearance = loadAppearanceFromStorage();
        if (storedAppearance) {
          const fallbackSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            appearance: {
              ...DEFAULT_SETTINGS.appearance,
              ...storedAppearance,
            },
          };
          dispatch(setSettings(fallbackSettings));
        }
      }
    };

    loadSettings();
  }, [settingsApi, dispatch]);
};
