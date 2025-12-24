/**
 * Utility & Infrastructure Types
 *
 * Utility types, helpers, and infrastructure interfaces.
 */

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

/**
 * Storage interface
 */
export interface Storage {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Application constants structure
 */
export interface AppConstants {
  DEFAULT_MODEL: string;
  MAX_MESSAGE_LENGTH: number;
  API_TIMEOUT: number;
  SUPPORTED_MODELS: string[];
  THEMES: readonly string[];
  LANGUAGES: readonly string[];
}

/**
 * Error codes enum
 */
export enum ErrorCode {
  NETWORK_ERROR = 1001,
  SERVER_ERROR = 1002,
  OLLAMA_ERROR = 1003,
  MODEL_NOT_FOUND = 1004,
  INVALID_REQUEST = 1005,
  TIMEOUT_ERROR = 1006,
  UNKNOWN_ERROR = 9999,
}

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Theme enum
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

/**
 * Make specific keys of a type optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract element type from an array type
 */
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/**
 * Reactive state interface
 */
export interface ReactiveState<T> {
  value: T;
  set: (value: T) => void;
  get: () => T;
  subscribe: (callback: (value: T) => void) => () => void;
}

