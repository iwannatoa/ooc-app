import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, OllamaModel } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  models: OllamaModel[];
  selectedModel: string;
  isSending: boolean;
  currentMessage: string;
  conversationHistory: {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
  }[];
  activeConversationId: string | null;
}

const initialState: ChatState = {
  messages: [],
  models: [],
  selectedModel: '',
  isSending: false,
  currentMessage: '',
  conversationHistory: [],
  activeConversationId: null,
};

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    payload: {
      message: string;
      sendAIMessage: (msg: string) => Promise<ChatMessage>;
    },
    { dispatch }
  ) => {
    const { message, sendAIMessage } = payload;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    dispatch(addMessage(userMessage));
    dispatch(setSending(true));

    try {
      const aiMessage = await sendAIMessage(message);
      dispatch(addMessage(aiMessage));
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'error',
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setSending(false));
    }
  }
);
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // 消息相关
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (
      state,
      action: PayloadAction<{ id: string; content: string }>
    ) => {
      const message = state.messages.find(
        (msg) => msg.id === action.payload.id
      );
      if (message) {
        message.content = action.payload.content;
      }
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(
        (msg) => msg.id !== action.payload
      );
    },
    clearMessages: (state) => {
      state.messages = [];
    },

    // 模型相关
    setModels: (state, action: PayloadAction<OllamaModel[]>) => {
      state.models = action.payload;
    },
    addModel: (state, action: PayloadAction<OllamaModel>) => {
      state.models.push(action.payload);
    },
    removeModel: (state, action: PayloadAction<string>) => {
      state.models = state.models.filter(
        (model) => model.name !== action.payload
      );
    },
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },

    // 发送状态
    setSending: (state, action: PayloadAction<boolean>) => {
      state.isSending = action.payload;
    },

    // 当前消息
    setCurrentMessage: (state, action: PayloadAction<string>) => {
      state.currentMessage = action.payload;
    },
    clearCurrentMessage: (state) => {
      state.currentMessage = '';
    },

    // 对话历史
    setConversationHistory: (
      state,
      action: PayloadAction<ChatState['conversationHistory']>
    ) => {
      state.conversationHistory = action.payload;
    },
    addConversation: (
      state,
      action: PayloadAction<ChatState['conversationHistory'][0]>
    ) => {
      state.conversationHistory.push(action.payload);
    },
    updateConversation: (
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<ChatState['conversationHistory'][0]>;
      }>
    ) => {
      const conversation = state.conversationHistory.find(
        (conv) => conv.id === action.payload.id
      );
      if (conversation) {
        Object.assign(conversation, action.payload.updates);
      }
    },
    removeConversation: (state, action: PayloadAction<string>) => {
      state.conversationHistory = state.conversationHistory.filter(
        (conv) => conv.id !== action.payload
      );
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null;
        state.messages = [];
      }
    },
    clearConversationHistory: (state) => {
      state.conversationHistory = [];
      state.activeConversationId = null;
      state.messages = [];
    },

    // 活跃对话
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
      if (action.payload) {
        const conversation = state.conversationHistory.find(
          (conv) => conv.id === action.payload
        );
        state.messages = conversation ? conversation.messages : [];
      } else {
        state.messages = [];
      }
    },

    // 批量操作
    loadConversation: (
      state,
      action: PayloadAction<{
        conversation: ChatState['conversationHistory'][0];
        messages: ChatMessage[];
      }>
    ) => {
      state.activeConversationId = action.payload.conversation.id;
      state.messages = action.payload.messages;
    },

    // 重置状态
    resetChat: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendChatMessage.fulfilled, (state) => {
        state.isSending = false;
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.isSending = false;
      });
  },
});

export const {
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
} = chatSlice.actions;

export default chatSlice.reducer;
