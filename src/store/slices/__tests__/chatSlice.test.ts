import { describe, it, expect } from 'vitest';
import chatReducer, {
  setMessages,
  addMessage,
  clearMessages,
  setModels,
  setSelectedModel,
  setSending,
  setStoryOperation,
  setActiveConversation,
  applyStreamingAssistantChunk,
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

  it('should set story operation', () => {
    const state = chatReducer(undefined, setStoryOperation('generate'));
    expect(state.storyOperation).toBe('generate');
  });

  it('should reset story operation when sending stops', () => {
    let state = chatReducer(undefined, setStoryOperation('rewrite'));
    state = chatReducer(state, setSending(true));
    expect(state.storyOperation).toBe('rewrite');
    state = chatReducer(state, setSending(false));
    expect(state.isSending).toBe(false);
    expect(state.storyOperation).toBe('idle');
  });

  it('should set active conversation', () => {
    const state = chatReducer(undefined, setActiveConversation('conv-1'));
    expect(state.activeConversationId).toBe('conv-1');
  });

  it('applyStreamingAssistantChunk updates last assistant', () => {
    let state = chatReducer(
      undefined,
      addMessage({
        id: 'a1',
        role: 'assistant',
        content: 'x',
        timestamp: 1,
      })
    );
    state = chatReducer(state, applyStreamingAssistantChunk('hello'));
    expect(state.messages[state.messages.length - 1].content).toBe('hello');
  });

  it('applyStreamingAssistantChunk appends when last is not assistant', () => {
    const state = chatReducer(
      undefined,
      addMessage({
        id: 'u1',
        role: 'user',
        content: 'q',
        timestamp: 1,
      })
    );
    const next = chatReducer(state, applyStreamingAssistantChunk('reply'));
    const last = next.messages[next.messages.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.content).toBe('reply');
  });
});

