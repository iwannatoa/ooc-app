/**
 * Hook Return Types
 *
 * Types for custom hook return values.
 */

import { ChatMessage } from './conversation';
import { OllamaModel } from './ai';
import { PythonServerStatus, OllamaStatus } from './status';

/**
 * Return type for useChat hook
 */
export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string, model?: string) => Promise<void>;
  clearMessages: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Return type for useModels hook
 */
export interface UseModelsReturn {
  models: OllamaModel[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  loading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
}

/**
 * Return type for useServerStatus hook
 */
export interface UseServerStatusReturn {
  pythonStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  isReady: boolean;
  restartServer: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

