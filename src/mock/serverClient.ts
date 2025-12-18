import { HealthResponse, ModelsResponse, OllamaModel } from '@/types';
import { mockModels, mockDelay } from './data';

export const mockServerClient = {
  checkHealth: async (): Promise<HealthResponse> => {
    await mockDelay(200);
    return {
      status: 'healthy',
      ollama_available: true,
    };
  },

  getModels: async (provider: string = 'ollama'): Promise<ModelsResponse> => {
    await mockDelay(300);
    return {
      success: true,
      models: provider === 'ollama' ? mockModels : [],
      error: '',
    };
  },
};

