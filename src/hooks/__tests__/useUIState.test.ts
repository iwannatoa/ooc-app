import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIState } from '../useUIState';

describe('useUIState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUIState());

    expect(result.current.showSettingsView).toBe(false);
    expect(result.current.settingsSidebarCollapsed).toBe(false);
    expect(result.current.conversationListCollapsed).toBe(false);
  });

  it('should update showSettingsView', () => {
    const { result } = renderHook(() => useUIState());

    act(() => {
      result.current.setShowSettingsView(true);
    });

    expect(result.current.showSettingsView).toBe(true);
  });

  it('should update settingsSidebarCollapsed', () => {
    const { result } = renderHook(() => useUIState());

    act(() => {
      result.current.setSettingsSidebarCollapsed(true);
    });

    expect(result.current.settingsSidebarCollapsed).toBe(true);
  });

  it('should update conversationListCollapsed', () => {
    const { result } = renderHook(() => useUIState());

    act(() => {
      result.current.setConversationListCollapsed(true);
    });

    expect(result.current.conversationListCollapsed).toBe(true);
  });
});

