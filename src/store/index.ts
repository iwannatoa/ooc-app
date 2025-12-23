import { configureStore } from '@reduxjs/toolkit';
import serverSlice from './slices/serverSlice';
import chatSlice from './slices/chatSlice';
import settingsSlice from './slices/settingsSlice';
import uiSlice from './slices/uiSlice';
import dialogSlice from './slices/dialogSlice';

export const store = configureStore({
  reducer: {
    server: serverSlice,
    chat: chatSlice,
    settings: settingsSlice,
    ui: uiSlice,
    dialog: dialogSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
