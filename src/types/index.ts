// 环境配置类型
export interface EnvConfig {
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_APP_DESCRIPTION: string;
  VITE_FLASK_API_URL: string;
  VITE_OLLAMA_BASE_URL: string;
  VITE_DEV_MODE: boolean;
  VITE_DEBUG: boolean;
  VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  VITE_DEFAULT_MODEL: string;
  VITE_API_TIMEOUT: number;
  VITE_HEALTH_CHECK_TIMEOUT: number;
  VITE_MAX_MESSAGE_LENGTH: number;
  VITE_ENABLE_STREAMING: boolean;
  VITE_ENABLE_MODEL_MANAGEMENT: boolean;
  VITE_ENABLE_CHAT_HISTORY: boolean;
  VITE_ENABLE_DEV_TOOLS: boolean;
  VITE_ENABLE_HOT_RELOAD: boolean;
  VITE_ENABLE_CONSOLE_LOGS: boolean;
  VITE_ENABLE_COMPRESSION: boolean;
  VITE_ENABLE_CACHE: boolean;
}

// Ollama 相关类型
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

// 聊天相关类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  model?: string;
  timestamp?: number;
  id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

// API 响应类型
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
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
export type AIProvider =
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'custom';

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

export interface OpenAIConfig extends AIProviderConfig {
  provider: 'openai';
  apiKey: string;
}

export interface AnthropicConfig extends AIProviderConfig {
  provider: 'anthropic';
  apiKey: string;
}

export interface CustomConfig extends AIProviderConfig {
  provider: 'custom';
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
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  custom: CustomConfig;
}
// 服务器状态类型
export type PythonServerStatus =
  | 'stopped'
  | 'starting'
  | 'started'
  | 'restarting'
  | 'error';

export type OllamaStatus = 'checking' | 'connected' | 'disconnected' | 'error';

export type AppStatus = 'initializing' | 'ready' | 'error' | 'offline';

// Tauri 命令类型
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

// 事件类型
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

// 组件 Props 类型
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

// 工具函数类型
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

// Hook 返回类型
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

// 常量类型
export interface AppConstants {
  DEFAULT_MODEL: string;
  MAX_MESSAGE_LENGTH: number;
  API_TIMEOUT: number;
  SUPPORTED_MODELS: string[];
  THEMES: readonly string[];
  LANGUAGES: readonly string[];
}

// 枚举类型
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

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// 响应式类型
export interface ReactiveState<T> {
  value: T;
  set: (value: T) => void;
  get: () => T;
  subscribe: (callback: (value: T) => void) => () => void;
}
