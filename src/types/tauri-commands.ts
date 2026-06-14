/**
 * Tauri Commands Types
 *
 * Types for Tauri command definitions.
 */

import { ApiResponse } from './api';

/**
 * Tauri command definitions
 */
export interface TauriCommands {
  start_python_server: () => Promise<ApiResponse<string>>;
  stop_python_server: () => Promise<ApiResponse<string>>;
  check_python_server_status: () => Promise<ApiResponse<boolean>>;
  get_flask_api_token: () => Promise<ApiResponse<string>>;
  frontend_log: (level: string, message: string) => Promise<ApiResponse<string>>;
  build_python_executable: () => Promise<ApiResponse<string>>;
}

