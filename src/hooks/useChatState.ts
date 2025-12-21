import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import {
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  clearMessages,
  setModels,
  addModel,
  removeModel,
  setSelectedModel,
  setSending,
  setCurrentMessage,
  clearCurrentMessage,
  setConversationHistory,
  addConversation,
  updateConversation,
  removeConversation,
  clearConversationHistory,
  setActiveConversation,
  loadConversation,
  resetChat,
  sendChatMessage,
} from '@/store/slices/chatSlice';
import { ChatMessage, OllamaModel } from '@/types';

export const useChatState = () => {
  const dispatch = useAppDispatch();

  const chatState = useAppSelector((state) => state.chat);

  const sendMessage = (
    message: string,
    sendAIMessage: (msg: string) => Promise<ChatMessage>
  ) => {
    dispatch(sendChatMessage({ message, sendAIMessage }));
  };
  return {
    ...chatState,

    // Message operations
    setMessages: (messages: ChatMessage[]) => dispatch(setMessages(messages)),
    addMessage: (message: ChatMessage) => dispatch(addMessage(message)),
    updateMessage: (id: string, content: string) =>
      dispatch(updateMessage({ id, content })),
    removeMessage: (id: string) => dispatch(removeMessage(id)),
    clearMessages: () => dispatch(clearMessages()),

    // Model operations
    setModels: (models: OllamaModel[]) => dispatch(setModels(models)),
    addModel: (model: OllamaModel) => dispatch(addModel(model)),
    removeModel: (modelName: string) => dispatch(removeModel(modelName)),
    setSelectedModel: (model: string) => dispatch(setSelectedModel(model)),

    // Sending state
    setSending: (sending: boolean) => dispatch(setSending(sending)),

    // Current message
    setCurrentMessage: (message: string) =>
      dispatch(setCurrentMessage(message)),
    clearCurrentMessage: () => dispatch(clearCurrentMessage()),

    // Conversation history
    setConversationHistory: (history: any) =>
      dispatch(setConversationHistory(history)),
    addConversation: (conversation: any) =>
      dispatch(addConversation(conversation)),
    updateConversation: (id: string, updates: any) =>
      dispatch(updateConversation({ id, updates })),
    removeConversation: (id: string) => dispatch(removeConversation(id)),
    clearConversationHistory: () => dispatch(clearConversationHistory()),

    // Active conversation
    setActiveConversation: (id: string | null) =>
      dispatch(setActiveConversation(id)),
    loadConversation: (conversation: any, messages: ChatMessage[]) =>
      dispatch(loadConversation({ conversation, messages })),

    // Reset
    resetChat: () => dispatch(resetChat()),
    sendMessage,
  };
};
