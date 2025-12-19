
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest?: string;
  details?: ModelDetails;
  model: string;
}

export interface ModelDetails {
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: GenerateOptions;
}

export interface GenerateOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
}

export interface GenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ModelsResponse {
  success: boolean;
  models: OllamaModel[];
  error: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  model?: string;
  timestamp?: number;
  id?: string;
  needsSummary?: boolean;
  messageCount?: number;
  storyProgress?: StoryProgress;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

export interface ConversationSettings {
  id?: number;
  conversation_id: string;
  title?: string;
  background?: string;
  characters?: string[];
  character_personality?: Record<string, string>;
  outline?: string;
  allow_auto_generate_characters?: boolean;
  created_at?: string;
  updated_at?: string;
}

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

export interface ConversationWithSettings extends Conversation {
  settings?: ConversationSettings;
}

export interface ConversationSummary {
  id?: number;
  conversation_id: string;
  summary: string;
  message_count?: number;
  token_count?: number;
  created_at?: string;
  updated_at?: string;
}

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

export type StoryActionType = 'auto' | 'generate' | 'confirm' | 'rewrite' | 'modify' | 'add_settings';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  message?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  ollama_available: boolean;
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
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
export type AIProvider = 'ollama' | 'deepseek';

export interface AIProviderConfig {
  provider: AIProvider;
  baseUrl: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
}

export interface OllamaConfig extends AIProviderConfig {
  provider: 'ollama';
}

export interface DeepSeekConfig extends AIProviderConfig {
  provider: 'deepseek';
  apiKey: string;
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  ai: AISettings;
  advanced: AdvancedSettings;
}

export interface AISettings {
  provider: AIProvider;
  ollama: OllamaConfig;
  deepseek: DeepSeekConfig;
}
export type PythonServerStatus =
  | 'stopped'
  | 'starting'
  | 'started'
  | 'restarting'
  | 'error';

export type OllamaStatus = 'checking' | 'connected' | 'disconnected' | 'error';

export type AppStatus = 'initializing' | 'ready' | 'error' | 'offline';

export interface TauriCommands {
  start_python_server: () => Promise<ApiResponse<string>>;
  stop_python_server: () => Promise<ApiResponse<string>>;
  check_python_server_status: () => Promise<ApiResponse<boolean>>;
  build_python_executable: () => Promise<ApiResponse<string>>;
}

export interface GeneralSettings {
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  startWithSystem: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  compactMode: boolean;
}

export interface ModelSettings {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface AdvancedSettings {
  enableStreaming: boolean;
  apiTimeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDiagnostics: boolean;
}

export interface AppEvents {
  'server-status-changed': PythonServerStatus;
  'ollama-status-changed': OllamaStatus;
  'message-sent': ChatMessage;
  'message-received': ChatMessage;
  'conversation-cleared': void;
  'model-changed': string;
  'error-occurred': ErrorEvent;
}

export interface ErrorEvent {
  type: 'network' | 'server' | 'ollama' | 'unknown';
  message: string;
  code?: number;
  timestamp: number;
}

export interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

export interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  className?: string;
}

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

export interface StatusIndicatorProps {
  pythonStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  className?: string;
}

export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

export interface Storage {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string, model?: string) => Promise<void>;
  clearMessages: () => void;
  loading: boolean;
  error: string | null;
}

export interface UseModelsReturn {
  models: OllamaModel[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  loading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
}

export interface UseServerStatusReturn {
  pythonStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  isReady: boolean;
  restartServer: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

export interface AppConstants {
  DEFAULT_MODEL: string;
  MAX_MESSAGE_LENGTH: number;
  API_TIMEOUT: number;
  SUPPORTED_MODELS: string[];
  THEMES: readonly string[];
  LANGUAGES: readonly string[];
}

export enum ErrorCode {
  NETWORK_ERROR = 1001,
  SERVER_ERROR = 1002,
  OLLAMA_ERROR = 1003,
  MODEL_NOT_FOUND = 1004,
  INVALID_REQUEST = 1005,
  TIMEOUT_ERROR = 1006,
  UNKNOWN_ERROR = 9999,
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export interface ReactiveState<T> {
  value: T;
  set: (value: T) => void;
  get: () => T;
  subscribe: (callback: (value: T) => void) => () => void;
}
