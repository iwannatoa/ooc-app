/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 *
 * Mock data factories for test files
 * Provides reusable mock data to reduce duplication
 */

import { vi } from 'vitest';
import type {
  AppSettings,
  ChatMessage,
  ConversationWithSettings,
  ConversationSettings,
} from '@/types';

/**
 * Create a default AppSettings object for testing
 */
export const createMockAppSettings = (
  overrides: Partial<AppSettings> = {}
): AppSettings => ({
  general: {
    language: 'en',
    autoStart: false,
    minimizeToTray: false,
    startWithSystem: false,
  },
  appearance: {
    theme: 'auto',
    fontSize: 'medium',
    fontFamily: 'default',
  },
  ai: {
    provider: 'ollama',
    ollama: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
      maxTokens: 2048,
      temperature: 0.7,
    },
    deepseek: {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: '',
      timeout: 30000,
      maxTokens: 2048,
      temperature: 0.7,
    },
  },
  advanced: {
    enableStreaming: true,
    apiTimeout: 30000,
    maxRetries: 3,
    logLevel: 'info',
    enableDiagnostics: false,
  },
  ...overrides,
});

/**
 * Create a mock ChatMessage for testing
 */
export const createMockChatMessage = (
  overrides: Partial<ChatMessage> = {}
): ChatMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  role: 'user',
  content: 'Test message',
  timestamp: Date.now(),
  ...overrides,
});

/**
 * Create an array of mock ChatMessages
 */
export const createMockChatMessages = (
  count: number = 1,
  overrides: Partial<ChatMessage> = {}
): ChatMessage[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockChatMessage({
      id: `msg_${i + 1}`,
      content: `Test message ${i + 1}`,
      ...overrides,
    })
  );
};

/**
 * Create a mock ConversationSettings for testing
 */
export const createMockConversationSettings = (
  overrides: Partial<ConversationSettings> = {}
): ConversationSettings => ({
  conversation_id: `conv_${Date.now()}`,
  title: 'Test Conversation',
  background: 'Test background',
  characters: ['Character1', 'Character2'],
  character_personality: {
    Character1: 'Brave',
    Character2: 'Kind',
  },
  outline: 'Test outline',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock ConversationWithSettings for testing
 */
export const createMockConversation = (
  overrides: Partial<ConversationWithSettings> = {}
): ConversationWithSettings => {
  const conversationId = overrides.id || `conv_${Date.now()}`;
  const now = Date.now();
  return {
    id: conversationId,
    title: 'Test Conversation',
    messages: [],
    createdAt: now - 7 * 24 * 60 * 60 * 1000,
    updatedAt: now - 1 * 60 * 60 * 1000,
    settings: createMockConversationSettings({
      conversation_id: conversationId,
      ...overrides.settings,
    }),
    ...overrides,
  };
};

/**
 * Create mock API response data for conversation endpoints
 */
export const createMockConversationListResponse = (count: number = 1) => ({
  success: true,
  conversations: Array.from({ length: count }, (_, i) => ({
    conversation_id: `${i + 1}`,
    title: `Test Conversation ${i + 1}`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })),
});

/**
 * Create mock API response data for conversation settings
 */
export const createMockConversationSettingsResponse = (
  conversationId: string = 'conv_001',
  overrides: Partial<ConversationSettings> = {}
) => ({
  success: true,
  settings: createMockConversationSettings({
    conversation_id: conversationId,
    ...overrides,
  }),
});

/**
 * Create mock API response data for conversation messages
 */
export const createMockConversationMessagesResponse = (
  count: number = 1
) => ({
  success: true,
  messages: Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
    created_at: new Date().toISOString(),
  })),
});

/**
 * Create mock API response data for outline generation
 */
export const createMockOutlineResponse = (outline: string = 'Generated outline') => ({
  success: true,
  outline,
});

/**
 * Create mock API response data for summary
 */
export const createMockSummaryResponse = (
  summary: string = 'Test summary',
  conversationId: string = 'conv_001'
) => ({
  success: true,
  summary: {
    conversation_id: conversationId,
    summary,
  },
});

/**
 * Create mock API response data for progress
 */
export const createMockProgressResponse = (
  conversationId: string = 'conv_001',
  outlineConfirmed: boolean = false
) => ({
  success: true,
  progress: {
    conversation_id: conversationId,
    outline_confirmed: outlineConfirmed,
  },
});

/**
 * Create mock API response data for characters
 */
export const createMockCharactersResponse = (
  count: number = 1,
  isMain: boolean = false
) => ({
  success: true,
  characters: Array.from({ length: count }, (_, i) => ({
    name: `Character${i + 1}`,
    is_main: isMain,
  })),
});

/**
 * Create mock API response data for character generation
 */
export const createMockCharacterResponse = (
  name: string = 'NewCharacter',
  personality: string = 'Test personality'
) => ({
  success: true,
  character: {
    name,
    personality,
  },
});

/**
 * Create mock API success response
 */
export const createMockSuccessResponse = () => ({
  success: true,
});

/**
 * Create mock API error response
 */
export const createMockErrorResponse = (error: string = 'Test error') => ({
  success: false,
  error,
});

