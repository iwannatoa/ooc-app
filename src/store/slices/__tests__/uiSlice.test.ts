import { describe, it, expect } from 'vitest';
import uiReducer, {
  setConversationListCollapsed,
  setSettingsSidebarCollapsed,
  setIsNewConversation,
  setPendingConversationId,
} from '../uiSlice';

describe('uiSlice', () => {
  it('should set conversation list collapsed state', () => {
    const state = uiReducer(undefined, setConversationListCollapsed(true));
    expect(state.conversationListCollapsed).toBe(true);
  });

  it('should set settings sidebar collapsed state', () => {
    const state = uiReducer(undefined, setSettingsSidebarCollapsed(true));
    expect(state.settingsSidebarCollapsed).toBe(true);
  });

  it('should set is new conversation', () => {
    const state = uiReducer(undefined, setIsNewConversation(true));
    expect(state.isNewConversation).toBe(true);
  });

  it('should set pending conversation ID', () => {
    const state = uiReducer(undefined, setPendingConversationId('conv-1'));
    expect(state.pendingConversationId).toBe('conv-1');
  });
});

