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

  describe('error handling', () => {
    it('should handle non-OK response with JSON error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: 'Server error',
          code: 5001,
        }),
      });

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle non-OK response with invalid JSON', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle response with success: false', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Request failed',
          code: 1001,
        }),
      });

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle AbortError', async () => {
      (global.fetch as any).mockImplementation(() => {
        const error = new Error('Request aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle generic Error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should handle unknown error', async () => {
      (global.fetch as any).mockRejectedValue('Unknown error');

      await expect((client as any).get('/api/test')).rejects.toThrow();
    });

    it('should use skipErrorHandling flag', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' }),
      });

      await expect(
        (client as any).get('/api/test', { skipErrorHandling: true })
      ).rejects.toThrow();
    });
  });

  describe('stream', () => {
    it('should handle streaming with mock response', async () => {
      const mockOnChunk = vi.fn();
      (mockRouter.match as any).mockResolvedValue({
        success: true,
        outline: 'Test outline content',
      });

      const result = await (client as any).stream(
        '/api/stream',
        {},
        mockOnChunk
      );

      expect(result).toBe('Test outline content');
      expect(mockOnChunk).toHaveBeenCalled();
    });

    it('should handle streaming with real response', async () => {
      const mockOnChunk = vi.fn();
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const result = await (client as any).stream(
        '/api/stream',
        { data: 'test' },
        mockOnChunk
      );

      expect(result).toBe('');
      expect(mockReader.read).toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming chunks', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const chunks = [
        encoder.encode('data: {"chunk": "Hello"}\n'),
        encoder.encode('data: {"chunk": " World"}\n'),
        encoder.encode('data: {"done": true}\n'),
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (chunkIndex < chunks.length) {
            return Promise.resolve({
              done: false,
              value: chunks[chunkIndex++],
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const result = await (client as any).stream(
        '/api/stream',
        {},
        mockOnChunk
      );

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming error in response', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const errorChunk = encoder.encode('data: {"error": "Stream error"}\n');

      const mockReader = {
        read: vi.fn().mockResolvedValue({
          done: false,
          value: errorChunk,
        }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await expect(
        (client as any).stream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle streaming with non-OK response', async () => {
      const mockOnChunk = vi.fn();
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Stream failed' }),
      });

      await expect(
        (client as any).stream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle streaming with no reader', async () => {
      const mockOnChunk = vi.fn();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: null,
      });

      await expect(
        (client as any).stream('/api/stream', {}, mockOnChunk)
      ).rejects.toThrow();
    });

    it('should handle plain text chunks in stream', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const textChunk = encoder.encode('data: plain text\n');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: textChunk,
          })
          .mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const result = await (client as any).stream(
        '/api/stream',
        {},
        mockOnChunk
      );

      expect(mockOnChunk).toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle empty chunks in stream', async () => {
      const mockOnChunk = vi.fn();
      const encoder = new TextEncoder();
      const emptyChunk = encoder.encode('data: \n');

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: emptyChunk,
          })
          .mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await (client as any).stream('/api/stream', {}, mockOnChunk);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });

  describe('request config', () => {
    it('should use custom timeout', async () => {
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

    it('should handle POST with empty body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await (client as any).post('/api/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle DELETE with empty body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await (client as any).delete('/api/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
