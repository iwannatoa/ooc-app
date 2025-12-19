import { AppSettings } from './index';

export const ENV_CONFIG = {
  VITE_DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: 'zh',
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
    ollama: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      timeout: 120000,
      maxTokens: 2048,
      temperature: 0.7,
    },
    deepseek: {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      timeout: 60000,
      maxTokens: 2048,
      temperature: 0.7,
      apiKey: '',
    },
  },
  advanced: {
    enableStreaming: false,
    apiTimeout: 120000,
    maxRetries: 3,
    logLevel: 'info',
    enableDiagnostics: false,
  },
};
