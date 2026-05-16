/**
 * Story Types
 *
 * Types related to story generation and progress tracking.
 */

/**
 * Story generation progress
 */
export interface StoryProgress {
  id?: number;
  conversation_id: string;
  current_section: number;
  total_sections?: number;
  last_generated_content?: string;
  last_generated_section?: number;
  status: 'pending' | 'generating' | 'completed';
  outline_confirmed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoryContextTrace {
  selectedSources: string[];
  droppedSources: string[];
  trimReasons: string[];
  summaryVersion?: string;
  budgetUsed?: {
    totalBudget?: number;
    usedTokens?: number;
    usedByLayer?: {
      recent?: number;
      history?: number;
      summary?: number;
      system?: number;
    };
  };
  strategy?: {
    recentMessagesWithSummary?: number;
    maxMessageHistory?: number;
    maxContextTokens?: number;
    effectiveBudgetRatio?: number;
    recentBudgetRatio?: number;
    summaryBudgetRatio?: number;
    summaryRefreshDeltaMessages?: number;
  };
}

/**
 * Redux/UI: which long-running story or chat operation is active (for labels and loading).
 */
export type ChatStoryOperation =
  | 'idle'
  | 'generate'
  | 'confirm'
  | 'rewrite'
  | 'modify'
  | 'chat_stream';

/**
 * Story action types
 */
export type StoryActionType =
  | 'auto'
  | 'generate'
  | 'confirm'
  | 'rewrite'
  | 'modify'
  | 'add_settings';

