import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mockRouter and routes BEFORE any imports that might use them
// This prevents errors when routes are auto-registered at module load time
vi.mock('@/mock/router', () => ({
  mockRouter: {
    match: vi.fn().mockResolvedValue(null),
    register: vi.fn(), // Mock register to prevent errors when routes are auto-registered
  },
}));

// Prevent routes from auto-registering during tests
// The routes file calls register functions at module load time
vi.mock('@/mock/routes', () => ({
  registerConversationRoutes: vi.fn(),
  registerAiRoutes: vi.fn(),
  registerStoryRoutes: vi.fn(),
  registerSettingsRoutes: vi.fn(),
  registerServerRoutes: vi.fn(),
}));

import { ConversationApi } from '../conversationApi';
import {
  createMockResponse,
  createMockReadableStream,
  createMockConversationListResponse,
  createMockConversationSettingsResponse,
  createMockConversationMessagesResponse,
  createMockOutlineResponse,
  createMockSummaryResponse,
  createMockProgressResponse,
  createMockCharactersResponse,
  createMockCharacterResponse,
  createMockSuccessResponse,
  createMockErrorResponse,
} from '@/mock';

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
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockConversationListResponse(1),
      })
    );

    const conversations = await api.getConversationsList();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe('1');
  });

  it('should get conversation settings', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () =>
          createMockConversationSettingsResponse('1', {
            title: 'Test',
          }),
      })
    );

    const settings = await api.getConversationSettings('1');
    expect(settings?.title).toBe('Test');
  });

  it('should create or update settings', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () =>
          createMockConversationSettingsResponse('1', {
            title: 'Updated',
          }),
      })
    );

    const settings = await api.createOrUpdateSettings({
      conversation_id: '1',
      title: 'Updated',
    });
    expect(settings.title).toBe('Updated');
  });

  it('should delete conversation', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockSuccessResponse(),
      })
    );

    const result = await api.deleteConversation('1');
    expect(result).toBe(true);
  });

  it('should handle conversation settings 404 error', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        json: async () => createMockErrorResponse('Not found'),
      })
    );

    const settings = await api.getConversationSettings('1');
    expect(settings).toBeNull();
  });

  it('should handle conversation settings with missing fields', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            conversation_id: '1',
            title: 'Test',
            // characters and character_personality are intentionally missing
          },
        }),
      })
    );

    const settings = await api.getConversationSettings('1');
    expect(settings?.characters).toEqual([]);
    expect(settings?.character_personality).toEqual({});
  });

  it('should get conversation messages', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          success: true,
          messages: [
            {
              id: 1,
              role: 'user',
              content: 'Hello',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      })
    );

    const messages = await api.getConversationMessages('1');
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello');
  });

  it('should handle empty messages array', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockConversationMessagesResponse(0),
      })
    );

    const messages = await api.getConversationMessages('1');
    expect(messages).toHaveLength(0);
  });

  it('should generate outline', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockOutlineResponse('Generated outline'),
      })
    );

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

    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        body: createMockReadableStream(() => mockReader),
      })
    );

    await api.generateOutlineStream('Background', {}, mockOnChunk);
    // Stream should complete
    expect(mockOnChunk).toHaveBeenCalled();
  });

  it('should get summary', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockSummaryResponse('Test summary', '1'),
      })
    );

    const summary = await api.getSummary('1');
    expect(summary?.summary).toBe('Test summary');
  });

  it('should return null when summary not found', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        json: async () => createMockErrorResponse('Not found'),
      })
    );

    const summary = await api.getSummary('1');
    expect(summary).toBeNull();
  });

  it('should generate summary', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          success: true,
          summary: 'Generated summary text',
        }),
      })
    );

    const summary = await api.generateSummary('1', 'ollama', 'llama2');
    expect(summary).toBe('Generated summary text');
  });

  it('should save summary', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockSummaryResponse('Saved summary', '1'),
      })
    );

    const result = await api.saveSummary('1', 'Summary text');
    expect(result.summary).toBe('Saved summary');
  });

  it('should get progress', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockProgressResponse('1', true),
      })
    );

    const progress = await api.getProgress('1');
    expect(progress?.outline_confirmed).toBe(true);
  });

  it('should return null when progress not found', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          success: true,
          progress: null,
        }),
      })
    );

    const progress = await api.getProgress('1');
    expect(progress).toBeNull();
  });

  it('should confirm outline', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockSuccessResponse(),
      })
    );

    const result = await api.confirmOutline('1');
    expect(result).toBe(true);
  });

  it('should update progress', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockProgressResponse('1', true),
      })
    );

    const progress = await api.updateProgress('1', { outline_confirmed: true });
    expect(progress.outline_confirmed).toBe(true);
  });

  it('should get characters', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockCharactersResponse(1, true),
      })
    );

    const characters = await api.getCharacters('1');
    expect(characters).toHaveLength(1);
    expect(characters[0].name).toBe('Character1');
  });

  it('should handle empty characters array', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
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
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          success: true,
          character: {
            name: 'Character1',
            is_main: true,
            is_unavailable: false,
          },
        }),
      })
    );

    const character = await api.updateCharacter('1', 'Character1', {
      is_main: true,
    });
    expect(character.name).toBe('Character1');
    expect(character.is_main).toBe(true);
  });

  it('should generate character', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () =>
          createMockCharacterResponse('New Character', 'Friendly'),
      })
    );

    const result = await api.generateCharacter('1', 'ollama', {
      model: 'llama2',
    });
    expect(result.character?.name).toBe('New Character');
  });

  it('should delete last message', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => createMockSuccessResponse(),
      })
    );

    const result = await api.deleteLastMessage('1');
    expect(result).toBe(true);
  });

  it('should handle conversations list with missing dates', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
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
      })
    );

    const conversations = await api.getConversationsList();
    expect(conversations[0].title).toBe('conversation.unnamedConversation');
    expect(conversations[0].createdAt).toBeGreaterThan(0);
    expect(conversations[0].updatedAt).toBeGreaterThan(0);
  });

  it('should handle messages with missing id', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
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
      })
    );

    const messages = await api.getConversationMessages('1');
    expect(messages[0].id).toMatch(/^msg_/);
  });
});
