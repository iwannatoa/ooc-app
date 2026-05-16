/**
 * API Response Types
 *
 * Types for API responses and error handling.
 */

import { StoryActionType, StoryProgress } from './story';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  message?: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  ollama_available: boolean;
  error?: string;
}

/**
 * Chat API response
 */
export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
  provider_capability_notice?: string;
  conversation_id?: string;
  needs_summary?: boolean;
  message_count?: number;
  action_type?: StoryActionType;
  story_progress?: StoryProgress;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

