import { configureStore } from '@reduxjs/toolkit';
import serverSlice from './slices/serverSlice';
import chatSlice from './slices/chatSlice';
import settingsSlice from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    server: serverSlice,
    chat: chatSlice,
    settings: settingsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
