/**
 * Conversation & Message Types
 *
 * Types related to conversations, messages, and character records.
 */

import { StoryProgress } from './story';

/**
 * Chat message with role and content
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'error' | 'ai';
  content: string;
  model?: string;
  timestamp?: number;
  id?: string;
  needsSummary?: boolean;
  messageCount?: number;
  storyProgress?: StoryProgress;
}

/**
 * Conversation data structure
 */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

/**
 * Conversation settings for story generation
 */
export interface ConversationSettings {
  id?: number;
  conversation_id: string;
  title?: string;
  background?: string;
  characters?: string[];
  character_personality?: Record<string, string>;
  character_is_main?: Record<string, boolean>;
  outline?: string;
  allow_auto_generate_characters?: boolean;
  additional_settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Conversation with associated settings
 */
export interface ConversationWithSettings extends Conversation {
  settings?: ConversationSettings;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  id?: number;
  conversation_id: string;
  summary: string;
  message_count?: number;
  token_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Character record in a conversation
 */
export interface CharacterRecord {
  id?: number;
  conversation_id: string;
  name: string;
  is_main: boolean;
  is_unavailable: boolean;
  first_appeared_message_id?: number;
  first_appeared_at?: string;
  is_auto_generated: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

