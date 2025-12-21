/**
 * Hook for managing chat controls
 * 
 * Encapsulates chat control bar state and handlers to reduce prop drilling.
 */

import { useCallback } from 'react';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { useSettingsState } from './useSettingsState';
import { useUIState } from './useUIState';
import { ConversationSettings, AppSettings } from '@/types';

export interface ChatControlsState {
  conversationListCollapsed: boolean;
  settingsSidebarCollapsed: boolean;
  activeConversationId: string | null;
  currentSettings: ConversationSettings | undefined;
  appSettings: AppSettings;
  models: any[];
  currentModel: string;
}

export interface ChatControlsHandlers {
  onModelChange: (model: string) => void;
  onExpandConversationList: () => void;
  onNewConversation: () => void;
  onExpandSettingsSidebar: () => void;
}

export interface UseChatControlsParams {
  activeConversationId: string | null;
  currentSettings: ConversationSettings | undefined;
  onNewConversation: () => void;
}

export interface UseChatControlsReturn {
  state: ChatControlsState;
  handlers: ChatControlsHandlers;
}

/**
 * Hook to get chat controls state and handlers
 */
export const useChatControls = ({
  activeConversationId,
  currentSettings,
  onNewConversation,
}: UseChatControlsParams): UseChatControlsReturn => {
  const { models } = useChatState();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const { settings: appSettings } = useSettingsState();
  const uiState = useUIState();

  const state: ChatControlsState = {
    conversationListCollapsed: uiState.conversationListCollapsed,
    settingsSidebarCollapsed: uiState.settingsSidebarCollapsed,
    activeConversationId,
    currentSettings,
    appSettings,
    models,
    currentModel: getCurrentModel(),
  };

  const handlers: ChatControlsHandlers = {
    onModelChange: handleModelChange,
    onExpandConversationList: useCallback(() => {
      uiState.setConversationListCollapsed(false);
    }, [uiState]),
    onNewConversation,
    onExpandSettingsSidebar: useCallback(() => {
      uiState.setSettingsSidebarCollapsed(false);
    }, [uiState]),
  };

  return {
    state,
    handlers,
  };
};

