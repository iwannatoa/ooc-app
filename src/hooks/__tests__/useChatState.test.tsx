import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi } from 'vitest';
import { useChatState } from '../useChatState';
import { createTestStore } from '@/test/utils';
import { ChatMessage } from '@/types';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useChatState', () => {
  it('should return chat state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('isSending');
    expect(result.current).toHaveProperty('setMessages');
    expect(result.current).toHaveProperty('addMessage');
  });

  it('should set messages', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
      },
    ];

    act(() => {
      result.current.setMessages(messages);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('should add message', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const message: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Hi there',
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hi there');
  });

  it('should clear messages', () => {
    const store = createTestStore({
      chat: {
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
          },
        ],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('should set sending state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setSending(true);
    });

    expect(result.current.isSending).toBe(true);
  });

  it('should send message with sendAIMessage callback', async () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const mockSendAIMessage = vi.fn().mockResolvedValue({
      id: 'ai-1',
      role: 'assistant',
      content: 'AI response',
      timestamp: Date.now(),
    });

    await act(async () => {
      result.current.sendMessage('Hello', mockSendAIMessage);
    });

    // Wait for async thunk to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSendAIMessage).toHaveBeenCalledWith('Hello');
  });

  it('should update message', () => {
    const store = createTestStore({
      chat: {
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
          },
        ],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateMessage('1', 'Updated content');
    });

    expect(result.current.messages[0].content).toBe('Updated content');
  });

  it('should remove message', () => {
    const store = createTestStore({
      chat: {
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Hi',
          },
        ],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.removeMessage('1');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('2');
  });

  it('should set current message', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setCurrentMessage('Typing...');
    });

    expect(result.current.currentMessage).toBe('Typing...');
  });

  it('should clear current message', () => {
    const store = createTestStore({
      chat: {
        messages: [],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: 'Some text',
        conversationHistory: [],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.clearCurrentMessage();
    });

    expect(result.current.currentMessage).toBe('');
  });

  it('should set conversation history', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const history = [
      {
        id: 'conv1',
        title: 'Conversation 1',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    act(() => {
      result.current.setConversationHistory(history);
    });

    expect(result.current.conversationHistory).toEqual(history);
  });

  it('should add conversation', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const conversation = {
      id: 'conv1',
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    act(() => {
      result.current.addConversation(conversation);
    });

    expect(result.current.conversationHistory).toHaveLength(1);
    expect(result.current.conversationHistory[0].id).toBe('conv1');
  });

  it('should update conversation', () => {
    const store = createTestStore({
      chat: {
        messages: [],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [
          {
            id: 'conv1',
            title: 'Old Title',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateConversation('conv1', { title: 'New Title' });
    });

    expect(result.current.conversationHistory[0].title).toBe('New Title');
  });

  it('should remove conversation', () => {
    const store = createTestStore({
      chat: {
        messages: [],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [
          {
            id: 'conv1',
            title: 'Conversation 1',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'conv2',
            title: 'Conversation 2',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.removeConversation('conv1');
    });

    expect(result.current.conversationHistory).toHaveLength(1);
    expect(result.current.conversationHistory[0].id).toBe('conv2');
  });

  it('should clear conversation history', () => {
    const store = createTestStore({
      chat: {
        messages: [],
        isSending: false,
        models: [],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [
          {
            id: 'conv1',
            title: 'Conversation 1',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.clearConversationHistory();
    });

    expect(result.current.conversationHistory).toHaveLength(0);
  });

  it('should set active conversation', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setActiveConversation('conv1');
    });

    expect(result.current.activeConversationId).toBe('conv1');
  });

  it('should load conversation', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const conversation = {
      id: 'conv1',
      title: 'Test Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Hello',
      },
    ];

    act(() => {
      result.current.loadConversation(conversation, messages);
    });

    expect(result.current.activeConversationId).toBe('conv1');
    expect(result.current.messages).toEqual(messages);
  });

  it('should reset chat', () => {
    const store = createTestStore({
      chat: {
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
        isSending: true,
        models: [{ name: 'test', size: 1000 }],
        selectedModel: 'test',
        currentMessage: 'test',
        conversationHistory: [
          {
            id: 'conv1',
            title: 'Test',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        activeConversationId: 'conv1',
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.resetChat();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isSending).toBe(false);
    expect(result.current.models).toHaveLength(0);
    expect(result.current.selectedModel).toBe('');
    expect(result.current.currentMessage).toBe('');
    expect(result.current.conversationHistory).toHaveLength(0);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('should set models', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const models = [
      { name: 'model1', size: 1000 },
      { name: 'model2', size: 2000 },
    ];

    act(() => {
      result.current.setModels(models);
    });

    expect(result.current.models).toEqual(models);
  });

  it('should add model', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    const model = { name: 'new-model', size: 3000 };

    act(() => {
      result.current.addModel(model);
    });

    expect(result.current.models).toHaveLength(1);
    expect(result.current.models[0]).toEqual(model);
  });

  it('should remove model', () => {
    const store = createTestStore({
      chat: {
        messages: [],
        isSending: false,
        models: [
          { name: 'model1', size: 1000 },
          { name: 'model2', size: 2000 },
        ],
        selectedModel: '',
        currentMessage: '',
        conversationHistory: [],
        activeConversationId: null,
      },
    });
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.removeModel('model1');
    });

    expect(result.current.models).toHaveLength(1);
    expect(result.current.models[0].name).toBe('model2');
  });

  it('should set selected model', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useChatState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setSelectedModel('model1');
    });

    expect(result.current.selectedModel).toBe('model1');
  });
});

