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

