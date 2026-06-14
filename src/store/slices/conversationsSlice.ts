import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConversationWithSettings } from '@/types';

export type ConversationListStatus = 'idle' | 'loading' | 'error';

export interface ConversationsState {
  items: ConversationWithSettings[];
  listStatus: ConversationListStatus;
  listError: string | null;
}

const initialState: ConversationsState = {
  items: [],
  listStatus: 'idle',
  listError: null,
};

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setConversationListLoading(state) {
      state.listStatus = 'loading';
      state.listError = null;
    },
    setConversationListSuccess(
      state,
      action: PayloadAction<ConversationWithSettings[]>
    ) {
      state.items = action.payload;
      state.listStatus = 'idle';
      state.listError = null;
    },
    setConversationListFailure(
      state,
      action: PayloadAction<string | undefined>
    ) {
      state.listStatus = 'error';
      state.listError = action.payload ?? null;
    },
    prependConversation(
      state,
      action: PayloadAction<ConversationWithSettings>
    ) {
      const id = action.payload.id;
      state.items = [
        action.payload,
        ...state.items.filter((c) => c.id !== id),
      ];
    },
    removeConversationFromList(state, action: PayloadAction<string>) {
      state.items = state.items.filter((c) => c.id !== action.payload);
    },
    resetConversations: () => initialState,
  },
});

export const {
  setConversationListLoading,
  setConversationListSuccess,
  setConversationListFailure,
  prependConversation,
  removeConversationFromList,
  resetConversations,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
