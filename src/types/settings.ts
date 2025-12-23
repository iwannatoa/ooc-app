/**
 * Application Settings Types
 *
 * Types for application configuration and settings.
 */

import { AISettings } from './ai';

/**
 * General application settings
 */
export interface GeneralSettings {
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  startWithSystem: boolean;
}

/**
 * Appearance settings
 */
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
}

/**
 * Model-specific settings (legacy, may not be used)
 */
export interface ModelSettings {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * Advanced application settings
 */
export interface AdvancedSettings {
  enableStreaming: boolean;
  apiTimeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDiagnostics: boolean;
}

/**
 * Complete application settings structure
 */
export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  ai: AISettings;
  advanced: AdvancedSettings;
}

