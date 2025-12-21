import { useState, useEffect, useCallback } from 'react';
import { setMockModeEnabled as setGlobalMockMode } from '@/mock';

const MOCK_MODE_STORAGE_KEY = 'dev_mock_mode_enabled';

export const useMockMode = () => {
  const [mockModeEnabled, setMockModeEnabled] = useState<boolean>(() => {
    // Only read localStorage in development mode
    if (import.meta.env.DEV) {
      const stored = localStorage.getItem(MOCK_MODE_STORAGE_KEY);
      const enabled = stored === 'true';
      // Sync global state on initialization
      setGlobalMockMode(enabled);
      return enabled;
    }
    setGlobalMockMode(false);
    return false;
  });

  const toggleMockMode = useCallback(() => {
    if (!import.meta.env.DEV) return;
    
    setMockModeEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(MOCK_MODE_STORAGE_KEY, String(newValue));
      // Update global state
      setGlobalMockMode(newValue);
      return newValue;
    });
  }, []);

  // Ensure disabled in non-development mode
  useEffect(() => {
    if (!import.meta.env.DEV) {
      setMockModeEnabled(false);
      setGlobalMockMode(false);
    }
  }, []);

  return {
    mockModeEnabled,
    toggleMockMode,
    isDev: import.meta.env.DEV,
  };
};

