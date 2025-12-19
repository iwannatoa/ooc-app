import { useState, useEffect, useCallback } from 'react';
import { setMockModeEnabled as setGlobalMockMode } from '@/mock';

const MOCK_MODE_STORAGE_KEY = 'dev_mock_mode_enabled';

export const useMockMode = () => {
  const [mockModeEnabled, setMockModeEnabled] = useState<boolean>(() => {
    // 只在开发模式下读取 localStorage
    if (import.meta.env.DEV) {
      const stored = localStorage.getItem(MOCK_MODE_STORAGE_KEY);
      const enabled = stored === 'true';
      // 初始化时同步全局状态
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
      // 更新全局状态
      setGlobalMockMode(newValue);
      return newValue;
    });
  }, []);

  // 确保在非开发模式下禁用
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

