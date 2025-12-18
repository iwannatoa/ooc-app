import { AppConstants, AppSettings, EnvConfig, AIProvider } from './index';

export const CONSTANTS: AppConstants = {
  DEFAULT_MODEL: 'llama2',
  MAX_MESSAGE_LENGTH: 4000,
  API_TIMEOUT: 120000,
  SUPPORTED_MODELS: [
    'llama2',
    'llama2:13b',
    'llama2:70b',
    'codellama',
    'mistral',
    'mixtral',
    'vicuna',
    'wizardcoder',
    'wizardlm',
  ],
  THEMES: ['light', 'dark', 'auto'] as const,
  LANGUAGES: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'] as const,
} as const;

export const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  DEEPSEEK: 'deepseek',
} as const;

export const DEFAULT_AI_CONFIGS = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama2',
    timeout: 120000,
    maxTokens: 2048,
    temperature: 0.7,
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    timeout: 60000,
    maxTokens: 2048,
    temperature: 0.7,
  },
} as const;

// 环境配置
export const ENV_CONFIG: EnvConfig = {
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'Ollama Chat',
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  VITE_APP_DESCRIPTION:
    import.meta.env.VITE_APP_DESCRIPTION ||
    'A desktop chat application using Ollama AI models',
  VITE_FLASK_API_URL:
    import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000',
  VITE_OLLAMA_BASE_URL:
    import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
  VITE_DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  VITE_DEBUG: import.meta.env.VITE_DEBUG === 'true',
  VITE_LOG_LEVEL:
    (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
    'info',
  VITE_DEFAULT_MODEL: import.meta.env.VITE_DEFAULT_MODEL || 'llama2',
  VITE_API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '120000'),
  VITE_HEALTH_CHECK_TIMEOUT: parseInt(
    import.meta.env.VITE_HEALTH_CHECK_TIMEOUT || '5000'
  ),
  VITE_MAX_MESSAGE_LENGTH: parseInt(
    import.meta.env.VITE_MAX_MESSAGE_LENGTH || '4000'
  ),
  VITE_ENABLE_STREAMING: import.meta.env.VITE_ENABLE_STREAMING === 'true',
  VITE_ENABLE_MODEL_MANAGEMENT:
    import.meta.env.VITE_ENABLE_MODEL_MANAGEMENT === 'true',
  VITE_ENABLE_CHAT_HISTORY: import.meta.env.VITE_ENABLE_CHAT_HISTORY === 'true',
  VITE_ENABLE_DEV_TOOLS: import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true',
  VITE_ENABLE_HOT_RELOAD: import.meta.env.VITE_ENABLE_HOT_RELOAD === 'true',
  VITE_ENABLE_CONSOLE_LOGS: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true',
  VITE_ENABLE_COMPRESSION: import.meta.env.VITE_ENABLE_COMPRESSION === 'true',
  VITE_ENABLE_CACHE: import.meta.env.VITE_ENABLE_CACHE === 'true',
};

const createAiConfig = <T extends AIProvider>(config: {
  provider: T;
  baseUrl: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}) => config;

// 默认设置
export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: 'zh-CN',
    autoStart: false,
    minimizeToTray: true,
    startWithSystem: false,
  },
  appearance: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    compactMode: false,
  },
  ai: {
    provider: 'ollama',
    ollama: createAiConfig({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      timeout: 120000,
      maxTokens: 2048,
      temperature: 0.7,
      apiKey: '',
    }),
    deepseek: createAiConfig({
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      timeout: 60000,
      maxTokens: 2048,
      temperature: 0.7,
      apiKey: '',
    }),
  },
  advanced: {
    enableStreaming: false,
    apiTimeout: 120000,
    maxRetries: 3,
    logLevel: 'info',
    enableDiagnostics: false,
  },
};
