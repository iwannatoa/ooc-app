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

    // 消息操作
    setMessages: (messages: ChatMessage[]) => dispatch(setMessages(messages)),
    addMessage: (message: ChatMessage) => dispatch(addMessage(message)),
    updateMessage: (id: string, content: string) =>
      dispatch(updateMessage({ id, content })),
    removeMessage: (id: string) => dispatch(removeMessage(id)),
    clearMessages: () => dispatch(clearMessages()),

    // 模型操作
    setModels: (models: OllamaModel[]) => dispatch(setModels(models)),
    addModel: (model: OllamaModel) => dispatch(addModel(model)),
    removeModel: (modelName: string) => dispatch(removeModel(modelName)),
    setSelectedModel: (model: string) => dispatch(setSelectedModel(model)),

    // 发送状态
    setSending: (sending: boolean) => dispatch(setSending(sending)),

    // 当前消息
    setCurrentMessage: (message: string) =>
      dispatch(setCurrentMessage(message)),
    clearCurrentMessage: () => dispatch(clearCurrentMessage()),

    // 对话历史
    setConversationHistory: (history: any) =>
      dispatch(setConversationHistory(history)),
    addConversation: (conversation: any) =>
      dispatch(addConversation(conversation)),
    updateConversation: (id: string, updates: any) =>
      dispatch(updateConversation({ id, updates })),
    removeConversation: (id: string) => dispatch(removeConversation(id)),
    clearConversationHistory: () => dispatch(clearConversationHistory()),

    // 活跃对话
    setActiveConversation: (id: string | null) =>
      dispatch(setActiveConversation(id)),
    loadConversation: (conversation: any, messages: ChatMessage[]) =>
      dispatch(loadConversation({ conversation, messages })),

    // 重置
    resetChat: () => dispatch(resetChat()),
    sendMessage,
  };
};
