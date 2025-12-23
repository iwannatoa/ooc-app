/**
 * Settings API Client
 * 
 * Handles all settings-related API calls:
 * - Get app settings
 * - Update app settings
 */

import { BaseApiClient } from './base';
import type { GetApiUrlFn } from './base';
import { AppSettings } from '@/types';

export class SettingsApi extends BaseApiClient {
  /**
   * Get app settings
   */
  async getAppSettings(): Promise<AppSettings> {
    const response = await this.get<{ settings: string }>('/api/app-settings');
    
    // Settings are stored as JSON string in backend
    try {
      return JSON.parse(response.settings);
    } catch (error) {
      throw new Error('Failed to parse app settings');
    }
  }

  /**
   * Update app settings
   */
  async updateAppSettings(settings: AppSettings): Promise<boolean> {
    const response = await this.post<{ success: boolean }>('/api/app-settings', {
      settings: JSON.stringify(settings),
    });
    return response.success;
  }
}

