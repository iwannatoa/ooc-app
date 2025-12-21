import { useEffect, useRef } from 'react';
import { useAppDispatch } from './redux';
import { setSettings } from '@/store/slices/settingsSlice';
import { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';
import { useFlaskPort } from './useFlaskPort';

/**
 * Hook to load app settings from backend on app startup
 */
export const useAppSettings = () => {
  const dispatch = useAppDispatch();
  const { apiUrl, waitForPort } = useFlaskPort();
  const hasLoadedRef = useRef(false);

  // Load settings from backend on mount (only once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    const loadSettings = async () => {
      hasLoadedRef.current = true;
      
      let url: string;
      try {
        url = apiUrl || await waitForPort();
      } catch {
        // If port is not available, use default settings
        return;
      }

      try {
        const response = await fetch(`${url}/api/app-settings`);
        const data = await response.json();
        
        if (data.success && data.settings) {
          try {
            const loadedSettings: AppSettings = JSON.parse(data.settings);
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
                // Remove compactMode if it exists
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
          } catch (parseError) {
            console.error('Failed to parse settings from backend:', parseError);
          }
        }
      } catch (error) {
        console.error('Failed to load settings from backend:', error);
      }
    };

    loadSettings();
  }, [apiUrl, waitForPort, dispatch]);
};
