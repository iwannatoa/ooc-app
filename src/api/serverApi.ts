/**
 * Server API Client
 *
 * Handles all server-related API calls:
 * - Health check
 * - Get models list
 */

import { BaseApiClient } from './base';
import { HealthResponse, ModelsResponse } from '@/types';

export class ServerApi extends BaseApiClient {
  /**
   * Check server health status
   */
  async checkHealth(provider: string = 'ollama'): Promise<HealthResponse> {
    const response = await this.get<HealthResponse>(
      `/api/health?provider=${provider}`
    );
    return response;
  }

  /**
   * Get available models list
   */
  async getModels(provider: string = 'ollama'): Promise<ModelsResponse> {
    const response = await this.get<ModelsResponse>(
      `/api/models?provider=${provider}`
    );
    return response;
  }
}
