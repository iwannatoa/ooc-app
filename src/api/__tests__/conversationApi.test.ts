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

  it('should handle conversation settings 404 error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Not found' }),
    });

    const settings = await api.getConversationSettings('1');
    expect(settings).toBeNull();
  });

  it('should handle conversation settings with missing fields', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          conversation_id: '1',
          title: 'Test',
          // characters and character_personality are missing
        },
      }),
    });

    const settings = await api.getConversationSettings('1');
    expect(settings?.characters).toEqual([]);
    expect(settings?.character_personality).toEqual({});
  });

  it('should get conversation messages', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        messages: [
          {
            id: 1,
            role: 'user',
            content: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    });

    const messages = await api.getConversationMessages('1');
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello');
  });

  it('should handle empty messages array', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        messages: [],
      }),
    });

    const messages = await api.getConversationMessages('1');
    expect(messages).toHaveLength(0);
  });

  it('should generate outline', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        outline: 'Generated outline',
      }),
    });

    const outline = await api.generateOutline('Background text', {
      conversationId: '1',
      provider: 'ollama',
      model: 'llama2',
    });
    expect(outline).toBe('Generated outline');
  });

  it('should generate outline stream', async () => {
    const mockOnChunk = vi.fn();
    const encoder = new TextEncoder();
    // Use plain text chunks (not JSON) so onChunk gets called
    const chunks = [
      encoder.encode('data: Test\n'),
      encoder.encode('data: outline\n'),
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

    await api.generateOutlineStream('Background', {}, mockOnChunk);
    // Stream should complete
    expect(mockOnChunk).toHaveBeenCalled();
  });

  it('should get summary', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          conversation_id: '1',
          summary: 'Test summary',
        },
      }),
    });

    const summary = await api.getSummary('1');
    expect(summary?.summary).toBe('Test summary');
  });

  it('should return null when summary not found', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Not found' }),
    });

    const summary = await api.getSummary('1');
    expect(summary).toBeNull();
  });

  it('should generate summary', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: 'Generated summary text',
      }),
    });

    const summary = await api.generateSummary('1', 'ollama', 'llama2');
    expect(summary).toBe('Generated summary text');
  });

  it('should save summary', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          conversation_id: '1',
          summary: 'Saved summary',
        },
      }),
    });

    const result = await api.saveSummary('1', 'Summary text');
    expect(result.summary).toBe('Saved summary');
  });

  it('should get progress', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        progress: {
          conversation_id: '1',
          outline_confirmed: true,
        },
      }),
    });

    const progress = await api.getProgress('1');
    expect(progress?.outline_confirmed).toBe(true);
  });

  it('should return null when progress not found', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        progress: null,
      }),
    });

    const progress = await api.getProgress('1');
    expect(progress).toBeNull();
  });

  it('should confirm outline', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await api.confirmOutline('1');
    expect(result).toBe(true);
  });

  it('should update progress', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        progress: {
          conversation_id: '1',
          outline_confirmed: true,
        },
      }),
    });

    const progress = await api.updateProgress('1', { outline_confirmed: true });
    expect(progress.outline_confirmed).toBe(true);
  });

  it('should get characters', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        characters: [
          { name: 'Character1', is_main: true },
        ],
      }),
    });

    const characters = await api.getCharacters('1');
    expect(characters).toHaveLength(1);
    expect(characters[0].name).toBe('Character1');
  });

  it('should handle empty characters array', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        characters: null,
      }),
    });

    const characters = await api.getCharacters('1');
    expect(characters).toEqual([]);
  });

  it('should update character', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        character: {
          name: 'Character1',
          is_main: true,
          is_unavailable: false,
        },
      }),
    });

    const character = await api.updateCharacter('1', 'Character1', {
      is_main: true,
    });
    expect(character.name).toBe('Character1');
    expect(character.is_main).toBe(true);
  });

  it('should generate character', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        character: {
          name: 'New Character',
          personality: 'Friendly',
        },
      }),
    });

    const result = await api.generateCharacter('1', 'ollama', {
      model: 'llama2',
    });
    expect(result.character?.name).toBe('New Character');
  });

  it('should delete last message', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await api.deleteLastMessage('1');
    expect(result).toBe(true);
  });

  it('should handle conversations list with missing dates', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        conversations: [
          {
            conversation_id: '1',
            title: null,
            // created_at and updated_at are missing
          },
        ],
      }),
    });

    const conversations = await api.getConversationsList();
    expect(conversations[0].title).toBe('conversation.unnamedConversation');
    expect(conversations[0].createdAt).toBeGreaterThan(0);
    expect(conversations[0].updatedAt).toBeGreaterThan(0);
  });

  it('should handle messages with missing id', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        messages: [
          {
            role: 'user',
            content: 'Hello',
            // id is missing
          },
        ],
      }),
    });

    const messages = await api.getConversationMessages('1');
    expect(messages[0].id).toMatch(/^msg_/);
  });
});
