import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerApi } from '../serverApi';

// Mock mockRouter before importing
vi.mock('@/mock/router', () => ({
  mockRouter: {
    match: vi.fn().mockResolvedValue(null),
  },
}));

describe('ServerApi', () => {
  let api: ServerApi;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    api = new ServerApi(mockGetApiUrl);
  });

  it('should check server health status', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: 'healthy',
        ollama_available: true,
      }),
    });

    const health = await api.checkHealth('ollama');
    expect(health.status).toBe('healthy');
  });

  it('should get models list', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        models: [
          { name: 'Model 1', model: 'model1' },
        ],
      }),
    });

    const models = await api.getModels('ollama');
    expect(models.success).toBe(true);
    expect(models.models).toHaveLength(1);
  });
});

