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
  
} as const;


