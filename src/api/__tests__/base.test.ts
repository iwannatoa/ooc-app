import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseApiClient, createApiError } from '../base';

// Mock the mock router before importing base
vi.mock('@/mock/router', () => {
  const mockMatch = vi.fn().mockResolvedValue(null);
  return {
    mockRouter: {
      match: mockMatch,
    },
  };
});

// Import mockRouter after mocking
import { mockRouter } from '@/mock/router';

describe('BaseApiClient', () => {
  let client: BaseApiClient;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    client = new BaseApiClient(mockGetApiUrl);
    (mockRouter.match as any).mockResolvedValue(null);
  });

  describe('createApiError', () => {
    it('should create API error', () => {
      const error = createApiError('Test error', 404, 1001, { data: 'test' });
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe(1001);
      expect(error.response).toEqual({ data: 'test' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('request', () => {
    it('should successfully send GET request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'test' }),
      });

      const result = await (client as any).get('/api/test');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle error response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' }),
      });

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await expect(
        (client as any).get('/api/test', { timeout: 50 })
      ).rejects.toThrow();
    });

    it('should use mock router', async () => {
      (mockRouter.match as any).mockResolvedValue({
        success: true,
        data: 'mock',
      });

      const result = await (client as any).get('/api/test');
      expect(result.success).toBe(true);
      expect(result.data).toBe('mock');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('post', () => {
    it('should send POST request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await (client as any).post('/api/test', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should send DELETE request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await (client as any).delete('/api/test', { id: '1' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
