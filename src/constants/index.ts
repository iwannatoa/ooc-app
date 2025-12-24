/**
 * Application Constants
 * 
 * Centralized location for all application constants, magic numbers, and configuration values.
 */

// ===== UI Constants =====
export const UI_CONSTANTS = {
  // Dialog and modal settings
  DIALOG_Z_INDEX: 1000,
  TOAST_Z_INDEX: 2000,
  
  // Animation durations (ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,
  
  // Scroll behavior
  SCROLL_DEBOUNCE: 100,
  AUTO_SCROLL_THRESHOLD: 100,
  
  // Input limits
  MAX_TITLE_LENGTH: 200,
  MAX_BACKGROUND_LENGTH: 5000,
  MAX_SUPPLEMENT_LENGTH: 3000,
  MAX_CHARACTER_NAME_LENGTH: 50,
  MAX_CHARACTER_PERSONALITY_LENGTH: 500,
  
  // Character generation
  CHARACTER_GENERATION_TIMEOUT: 30000,
  OUTLINE_GENERATION_TIMEOUT: 60000,
  
  // Toast settings
  TOAST_DURATION: 3000,
  TOAST_FADE_OUT: 300,
} as const;

// ===== API Constants =====
export const API_CONSTANTS = {
  // Timeouts (ms)
  DEFAULT_TIMEOUT: 60000,
  STREAMING_TIMEOUT: 300000, // 5 minutes for streaming
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Ports
  FLASK_DEFAULT_PORT: 5000,
  FLASK_DEV_PORT: 5000,
  
  // Endpoints
  ENDPOINTS: {
    CHAT: '/api/chat',
    CONVERSATIONS: '/api/conversations',
    CONVERSATION_SETTINGS: '/api/conversation-settings',
    APP_SETTINGS: '/api/app-settings',
    GENERATE_CHARACTER: '/api/generate-character',
    GENERATE_OUTLINE: '/api/generate-outline',
    STORY_ACTIONS: '/api/story-actions',
  },
} as const;

// ===== Story Generation Constants =====
export const STORY_CONSTANTS = {
  // Story progress thresholds
  PROGRESS_THRESHOLDS: {
    BEGINNING: 0.2,
    MIDDLE: 0.5,
    CLIMAX: 0.8,
    ENDING: 0.95,
  },
  
  // Message count thresholds
  SUMMARY_THRESHOLD: 20,
  LONG_CONVERSATION_THRESHOLD: 50,
  
  // Character status
  CHARACTER_STATUS: {
    MAIN: 'main',
    SUPPORTING: 'supporting',
    UNAVAILABLE: 'unavailable',
  },
} as const;

// ===== Theme Constants =====
export const THEME_CONSTANTS = {
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
  },
  
  FONT_SIZES: {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
  },
  
  FONT_SIZE_MAP: {
    small: 12,
    medium: 14,
    large: 16,
  },
} as const;

// ===== Validation Constants =====
export const VALIDATION_CONSTANTS = {
  // Required field messages
  REQUIRED_FIELDS: {
    TITLE: 'Title is required',
    BACKGROUND: 'Background is required',
    CONVERSATION_ID: 'Conversation ID is required',
  },
  
  // Format validations
  URL_PATTERN: /^https?:\/\/.+/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ===== Component Constants =====
export const COMPONENT_CONSTANTS = {
  // Settings tabs
  SETTINGS_TABS: ['general', 'ai', 'appearance', 'advanced'] as const,
  
  // AI Providers
  AI_PROVIDERS: ['ollama', 'deepseek'] as const,
  
  // Log levels
  LOG_LEVELS: ['error', 'warn', 'info', 'debug'] as const,
  
  // Locales
  LOCALES: ['zh', 'en'] as const,
} as const;

