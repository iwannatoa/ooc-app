/**
 * Application Configuration
 * 
 * Centralized configuration values that may vary between environments.
 */

// ===== Environment Configuration =====
export const ENV_CONFIG = {
  // Development settings
  DEV: {
    ENABLE_MOCK_MODE: true,
    ENABLE_DEV_TOOLS: true,
    LOG_LEVEL: 'debug' as const,
    API_BASE_URL: 'http://localhost:5000',
  },
  
  // Production settings
  PROD: {
    ENABLE_MOCK_MODE: false,
    ENABLE_DEV_TOOLS: false,
    LOG_LEVEL: 'error' as const,
    API_BASE_URL: 'http://localhost:5000',
  },
} as const;

// ===== Feature Flags =====
export const FEATURE_FLAGS = {
  ENABLE_STREAMING: true,
  ENABLE_CHARACTER_AUTO_GENERATION: true,
  ENABLE_OUTLINE_GENERATION: true,
  ENABLE_STORY_REWRITE: true,
  ENABLE_DIAGNOSTICS: false,
} as const;

// ===== Default Values =====
export const DEFAULT_VALUES = {
  // Conversation settings
  CONVERSATION: {
    TITLE: '',
    BACKGROUND: '',
    SUPPLEMENT: '',
    OUTLINE: '',
    CHARACTERS: [''],
    ALLOW_AUTO_GENERATE_CHARACTERS: true,
    ALLOW_AUTO_GENERATE_MAIN_CHARACTERS: true,
  },
  
  // AI Settings
  AI: {
    PROVIDER: 'ollama' as const,
    MODEL: 'llama3.2',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 2000,
    TIMEOUT: 60,
  },
  
  // Appearance
  APPEARANCE: {
    THEME: 'dark' as const,
    FONT_SIZE: 'medium' as const,
    FONT_FAMILY: 'system-ui, -apple-system, sans-serif',
  },
} as const;

// ===== API Configuration =====
export const API_CONFIG = {
  // Request headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Request options
  OPTIONS: {
    credentials: 'same-origin' as const,
    mode: 'cors' as const,
  },
} as const;

