import { describe, it, expect } from 'vitest';
import chatReducer, {
  setMessages,
  addMessage,
  clearMessages,
  setModels,
  setSelectedModel,
  setSending,
  setActiveConversation,
} from '../chatSlice';

describe('chatSlice', () => {
  it('should set messages', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
    ];
    const state = chatReducer(undefined, setMessages(messages));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe('Hello');
  });

  it('should add message', () => {
    const message = { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() };
    const state = chatReducer(undefined, addMessage(message));
    expect(state.messages).toHaveLength(1);
  });

  it('should clear messages', () => {
    const initialState = chatReducer(undefined, addMessage({
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    }));
    const state = chatReducer(initialState, clearMessages());
    expect(state.messages).toHaveLength(0);
  });

  it('should set models', () => {
    const models = [{ name: 'Model 1', model: 'model1' }];
    const state = chatReducer(undefined, setModels(models));
    expect(state.models).toHaveLength(1);
  });

  it('should set selected model', () => {
    const state = chatReducer(undefined, setSelectedModel('model1'));
    expect(state.selectedModel).toBe('model1');
  });

  it('should set sending state', () => {
    const state = chatReducer(undefined, setSending(true));
    expect(state.isSending).toBe(true);
  });

  it('should set active conversation', () => {
    const state = chatReducer(undefined, setActiveConversation('conv-1'));
    expect(state.activeConversationId).toBe('conv-1');
  });
});

