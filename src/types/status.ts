/**
 * Status Types
 *
 * Types for application and service status tracking.
 */

/**
 * Python server status
 */
export type PythonServerStatus =
  | 'stopped'
  | 'starting'
  | 'started'
  | 'restarting'
  | 'error';

/**
 * Ollama connection status
 */
export type OllamaStatus = 'checking' | 'connected' | 'disconnected' | 'error';

/**
 * Application status
 */
export type AppStatus = 'initializing' | 'ready' | 'error' | 'offline';

