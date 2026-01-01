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


