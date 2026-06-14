import { configureStore } from '@reduxjs/toolkit';
import serverSlice from './slices/serverSlice';
import chatSlice from './slices/chatSlice';
import settingsSlice from './slices/settingsSlice';
import uiSlice from './slices/uiSlice';
import dialogSlice from './slices/dialogSlice';
import conversationSettingsFormSlice from './slices/conversationSettingsFormSlice';
import conversationsReducer from './slices/conversationsSlice';

export const store = configureStore({
  reducer: {
    server: serverSlice,
    chat: chatSlice,
    conversations: conversationsReducer,
    settings: settingsSlice,
    ui: uiSlice,
    dialog: dialogSlice,
    conversationSettingsForm: conversationSettingsFormSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
