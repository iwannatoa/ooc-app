/**
 * Event Types
 *
 * Types for application events and error events.
 */

import { ChatMessage } from './conversation';
import { PythonServerStatus, OllamaStatus } from './status';

/**
 * Application event types
 */
export interface AppEvents {
  'server-status-changed': PythonServerStatus;
  'ollama-status-changed': OllamaStatus;
  'message-sent': ChatMessage;
  'message-received': ChatMessage;
  'conversation-cleared': void;
  'model-changed': string;
  'error-occurred': ErrorEvent;
}

/**
 * Error event data
 */
export interface ErrorEvent {
  type: 'network' | 'server' | 'ollama' | 'unknown';
  message: string;
  code?: number;
  timestamp: number;
}

