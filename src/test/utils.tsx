import React, { ReactElement } from 'react';
// @ts-ignore - Testing library types may not be installed during type check
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import serverReducer from '../store/slices/serverSlice';
import chatReducer from '../store/slices/chatSlice';
import settingsReducer from '../store/slices/settingsSlice';
import uiReducer from '../store/slices/uiSlice';
import dialogReducer from '../store/slices/dialogSlice';
import conversationSettingsFormReducer from '../store/slices/conversationSettingsFormSlice';

const createTestStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      server: serverReducer,
      chat: chatReducer,
      settings: settingsReducer,
      ui: uiReducer,
      dialog: dialogReducer,
      conversationSettingsForm: conversationSettingsFormReducer,
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

// Export createTestStore for use in hook tests
export { createTestStore };

/**
 * Flush promises and React updates in a single call
 * Similar to Jest's tick() - advances the event loop and handles React updates
 * Automatically wraps in act() so you don't need to write act() manually
 *
 * @param delay - Optional delay in milliseconds. Defaults to 0.
 *                Use this to simulate async operations that take time.
 *
 * Usage:
 *   await tick();        // Flush immediately (0ms delay)
 *   await tick(100);     // Wait 100ms before flushing
 *
 * This is equivalent to:
 *   await act(async () => {
 *     await new Promise((resolve) => setTimeout(resolve, delay || 0));
 *   });
 */
export const tick = async (delay: number = 0) => {
  // Dynamically import act to avoid circular dependencies
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
};

/**
 * Creates a promise that resolves after the specified delay
 * Useful for mock implementations that need to simulate async delays
 *
 * @param delay - Delay in milliseconds
 * @param value - Optional value to resolve with. If not provided, resolves with void.
 *
 * Usage:
 *   mockOnSave.mockImplementation(() => delayPromise(100));
 *   mockOnGenerate.mockImplementation(() => delayPromise(100, 'Summary'));
 *
 * This is equivalent to:
 *   () => new Promise<void>((resolve) => setTimeout(() => resolve(), delay))
 *   () => new Promise((resolve) => setTimeout(() => resolve(value), delay))
 */
export const delayPromise = <T = void,>(
  delay: number,
  value?: T
): Promise<T> => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value as T), delay);
  });
};
