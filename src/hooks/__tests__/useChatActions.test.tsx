import { mockFn } from '@/test/mockFn';
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
  const mockUpdateActiveAiProviderConfig = vi.fn();
  const mockSendAIMessage = vi.fn();

  const baseAiSettings = {
    provider: 'ollama',
    ollama: { model: 'llama2' },
    deepseek: { model: 'deepseek-chat' },
    openai_compatible: { model: 'gpt-4o-mini' },
    openai: { model: 'gpt-4o-mini' },
    anthropic: { model: 'claude-3-5-sonnet-latest' },
    glm: { model: 'glm-4-flash' },
    kimi: { model: 'moonshot-v1-8k' },
    minimax: { model: 'MiniMax-Text-01' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFn(useChatState).mockReturnValue({
      sendMessage: mockSendMessage,
      clearMessages: mockClearMessages,
    });

    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ai: baseAiSettings,
      },
      updateActiveAiProviderConfig: mockUpdateActiveAiProviderConfig,
    });

    mockFn(useAiClient).mockReturnValue({
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

  it('should update active provider config when handleModelChange is called', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleModelChange('llama3');
    });

    expect(mockUpdateActiveAiProviderConfig).toHaveBeenCalledWith({
      model: 'llama3',
    });
  });

  it('should update deepseek model through unified updater', () => {
    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ai: {
          ...baseAiSettings,
          provider: 'deepseek',
        },
      },
      updateActiveAiProviderConfig: mockUpdateActiveAiProviderConfig,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useChatActions(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleModelChange('deepseek-coder');
    });

    expect(mockUpdateActiveAiProviderConfig).toHaveBeenCalledWith({
      model: 'deepseek-coder',
    });
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
    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ai: {
          ...baseAiSettings,
          provider: 'deepseek',
        },
      },
      updateActiveAiProviderConfig: mockUpdateActiveAiProviderConfig,
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

