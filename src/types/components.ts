/**
 * Component Props Types
 *
 * Types for React component props.
 */

import { OllamaModel } from './ai';
import { ChatMessage } from './conversation';
import { PythonServerStatus, OllamaStatus } from './status';

/**
 * Model selector component props
 */
export interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Message list component props
 */
export interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  className?: string;
}

/**
 * Message input component props
 */
export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading?: boolean;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Status indicator component props
 */
export interface StatusIndicatorProps {
  pythonStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  className?: string;
}

