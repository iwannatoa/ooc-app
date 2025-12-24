import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Layout states
  conversationListCollapsed: boolean;
  settingsSidebarCollapsed: boolean;

  // Conversation form state
  isNewConversation: boolean;
  pendingConversationId: string | null;
}

const initialState: UIState = {
  conversationListCollapsed: false,
  settingsSidebarCollapsed: false,
  isNewConversation: false,
  pendingConversationId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Layout states
    setConversationListCollapsed: (state, action: PayloadAction<boolean>) => {
      state.conversationListCollapsed = action.payload;
    },
    setSettingsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.settingsSidebarCollapsed = action.payload;
    },

    // Conversation form state
    setIsNewConversation: (state, action: PayloadAction<boolean>) => {
      state.isNewConversation = action.payload;
    },
    setPendingConversationId: (state, action: PayloadAction<string | null>) => {
      state.pendingConversationId = action.payload;
    },
  },
});

export const {
  setConversationListCollapsed,
  setSettingsSidebarCollapsed,
  setIsNewConversation,
  setPendingConversationId,
} = uiSlice.actions;

export default uiSlice.reducer;
