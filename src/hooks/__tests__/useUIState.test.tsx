import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useUIState } from '../useUIState';
import { createTestStore } from '@/test/utils';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useUIState', () => {
  it('should initialize with default values', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useUIState(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.settingsSidebarCollapsed).toBe(false);
    expect(result.current.conversationListCollapsed).toBe(false);
    expect(result.current.isNewConversation).toBe(false);
    expect(result.current.pendingConversationId).toBe(null);
  });

  it('should update settingsSidebarCollapsed', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useUIState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setSettingsSidebarCollapsed(true);
    });

    expect(result.current.settingsSidebarCollapsed).toBe(true);
  });

  it('should update conversationListCollapsed', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useUIState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setConversationListCollapsed(true);
    });

    expect(result.current.conversationListCollapsed).toBe(true);
  });
});

