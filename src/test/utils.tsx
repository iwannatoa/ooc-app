import React, { ReactElement } from 'react';
// @ts-ignore - Testing library types may not be installed during type check
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import serverReducer from '../store/slices/serverSlice';
import chatReducer from '../store/slices/chatSlice';
import settingsReducer from '../store/slices/settingsSlice';

const createTestStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      server: serverReducer,
      chat: chatReducer,
      settings: settingsReducer,
    } as any,
    preloadedState: initialState,
  });
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: ReturnType<typeof createTestStore>;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialState = {},
    store = createTestStore(initialState),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <Provider store={store}>{children}</Provider>;
  };

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// @ts-ignore - Testing library may not be installed during type check
export * from '@testing-library/react';
