import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationApi } from '../conversationApi';

// Mock mockRouter before importing
vi.mock('@/mock/router', () => ({
  mockRouter: {
    match: vi.fn().mockResolvedValue(null),
  },
}));

describe('ConversationApi', () => {
  let api: ConversationApi;
  const mockGetApiUrl = vi.fn().mockResolvedValue('http://localhost:5000');
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    api = new ConversationApi(mockGetApiUrl, mockT);
  });

  it('should get conversations list', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        conversations: [
          {
            conversation_id: '1',
            title: 'Test',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    });

    const conversations = await api.getConversationsList();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe('1');
  });

  it('should get conversation settings', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          conversation_id: '1',
          title: 'Test',
        },
      }),
    });

    const settings = await api.getConversationSettings('1');
    expect(settings?.title).toBe('Test');
  });

  it('should create or update settings', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          conversation_id: '1',
          title: 'Updated',
        },
      }),
    });

    const settings = await api.createOrUpdateSettings({
      conversation_id: '1',
      title: 'Updated',
    });
    expect(settings.title).toBe('Updated');
  });

  it('should delete conversation', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await api.deleteConversation('1');
    expect(result).toBe(true);
  });
});
