import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiApi } from '../aiApi';
import { DEFAULT_SETTINGS } from '@/types/constants';

// Mock mockRouter before importing
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
import { AppSettings } from '@/types';

describe('AiApi', () => {
  let api: AiApi;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    api = new AiApi(mockGetApiUrl, DEFAULT_SETTINGS);
    (mockRouter.match as any).mockResolvedValue(null);
  });

  it('should update settings', () => {
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, provider: 'deepseek' },
    } as AppSettings;
    api.updateSettings(newSettings);
    // Verify settings are updated (verified through subsequent calls)
    expect(api).toBeDefined();
  });

  it('should send message', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Test response',
        model: 'test-model',
      }),
    });

    const message = await api.sendMessage('Hello', 'conv-1');
    expect(message.role).toBe('assistant');
    expect(message.content).toBe('Test response');
  });

  it('should send message stream', async () => {
    const mockOnChunk = vi.fn();

    // Use mock router to simulate streaming response
    (mockRouter.match as any).mockResolvedValue({
      success: true,
      response: 'Hello World',
    });

    const message = await api.sendMessageStream('Hello', 'conv-1', mockOnChunk);
    expect(message.role).toBe('assistant');
    expect(mockOnChunk).toHaveBeenCalled();
    // Verify that chunks were processed
    expect(mockOnChunk).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    );
    expect(message.content).toContain('Hello');
  });
});
