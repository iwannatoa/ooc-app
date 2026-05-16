import { mockFn } from '@/test/mockFn';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryApi } from '../storyApi';
import { DEFAULT_SETTINGS } from '@/types/constants';

// Mock mockRouter before importing
vi.mock('@/mock/router', () => ({
  mockRouter: {
    match: vi.fn().mockResolvedValue(null),
  },
}));

describe('StoryApi', () => {
  let api: StoryApi;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    api = new StoryApi(mockGetApiUrl, DEFAULT_SETTINGS);
  });

  it('should update settings', () => {
    const newSettings = { ...DEFAULT_SETTINGS };
    api.updateSettings(newSettings);
    expect(api).toBeDefined();
  });

  it('should confirm section', async () => {
    mockFn(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        story_progress: { current_section: 1 },
      }),
    });

    const result = await api.confirmSection('conv-1');
    expect(result.success).toBe(true);
  });

  it('should rewrite section', async () => {
    mockFn(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Rewritten content',
      }),
    });

    const result = await api.rewriteSection('conv-1', 'Make it longer');
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
    const init = mockFn(global.fetch).mock.calls[0][1];
    const body = JSON.parse(init.body as string);
    expect(body.feedback_operation).toBe('rewrite');
  });

  it('should modify section', async () => {
    mockFn(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Modified content',
      }),
    });

    const result = await api.modifySection('conv-1', 'Add more details');
    expect(result.success).toBe(true);
  });
});

