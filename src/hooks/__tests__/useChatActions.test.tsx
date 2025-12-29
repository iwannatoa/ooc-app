import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatActions } from '../useChatActions';
import { createTestStore } from '@/test/utils';

// Mock dependencies
vi.mock('../useChatState', () => ({
  useChatState: vi.fn(),
}));

vi.mock('../useSettingsState', () => ({
  useSettingsState: vi.fn(),
}));

vi.mock('../useAiClient', () => ({
  useAiClient: vi.fn(),
}));

import { useChatState } from '../useChatState';
import { useSettingsState } from '../useSettingsState';
import { useAiClient } from '../useAiClient';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useChatActions', () => {
  const mockSendMessage = vi.fn();
  const mockClearMessages = vi.fn();
  const mockUpdateOllamaConfig = vi.fn();
  const mockUpdateDeepSeekConfig = vi.fn();
  const mockSendAIMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useChatState as any).mockReturnValue({
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'ollama',
          ollama: {
            model: 'llama2',
          },
          deepseek: {
            model: 'deepseek-chat',
          },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
      updateDeepSeekConfig: mockUpdateDeepSeekConfig,
    });

    (useAiClient as any).mockReturnValue({
      sendMessage: mockSendAIMessage,
    });
  });

  it('should return all expected functions', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('handleSendMessage');
    expect(result.current).toHaveProperty('handleModelChange');
    expect(result.current).toHaveProperty('getCurrentModel');
    expect(result.current).toHaveProperty('clearMessages');
  });

  it('should call sendMessage when handleSendMessage is called', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleSendMessage('Test message');
    });

    expect(mockSendMessage).toHaveBeenCalledWith('Test message', mockSendAIMessage);
  });

  it('should update ollama config when handleModelChange is called with ollama provider', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleModelChange('llama3');
    });

    expect(mockUpdateOllamaConfig).toHaveBeenCalledWith({ model: 'llama3' });
    expect(mockUpdateDeepSeekConfig).not.toHaveBeenCalled();
  });

  it('should update deepseek config when handleModelChange is called with deepseek provider', () => {
    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          ollama: {
            model: 'llama2',
          },
          deepseek: {
            model: 'deepseek-chat',
          },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
      updateDeepSeekConfig: mockUpdateDeepSeekConfig,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleModelChange('deepseek-coder');
    });

    expect(mockUpdateDeepSeekConfig).toHaveBeenCalledWith({ model: 'deepseek-coder' });
    expect(mockUpdateOllamaConfig).not.toHaveBeenCalled();
  });

  it('should return current model for ollama provider', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    const currentModel = result.current.getCurrentModel();
    expect(currentModel).toBe('llama2');
  });

  it('should return current model for deepseek provider', () => {
    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          ollama: {
            model: 'llama2',
          },
          deepseek: {
            model: 'deepseek-chat',
          },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
      updateDeepSeekConfig: mockUpdateDeepSeekConfig,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    const currentModel = result.current.getCurrentModel();
    expect(currentModel).toBe('deepseek-chat');
  });

  it('should return clearMessages function', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.clearMessages).toBe(mockClearMessages);
  });
});

