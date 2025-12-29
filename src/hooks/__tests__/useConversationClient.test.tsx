import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationClient } from '../useConversationClient';
import { createTestStore } from '@/test/utils';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

// Mock useFlaskPort
vi.mock('../useFlaskPort', () => ({
  useFlaskPort: vi.fn(() => ({
    apiUrl: 'http://localhost:5000',
    waitForPort: vi.fn(() => Promise.resolve('http://localhost:5000')),
  })),
}));

// Mock @/mock module
vi.mock('@/mock', () => ({
  isMockMode: () => false,
  setMockModeEnabled: vi.fn(),
}));

// Mock useMockMode
vi.mock('../useMockMode', () => ({
  useMockMode: () => ({
    mockModeEnabled: false,
    toggleMockMode: vi.fn(),
    isDev: false,
  }),
}));

// Mock useApiClients
const mockConversationApi = {
  getConversationsList: vi.fn(),
  getConversationSettings: vi.fn(),
  createOrUpdateSettings: vi.fn(),
  getConversationMessages: vi.fn(),
  deleteConversation: vi.fn(),
  getCharacters: vi.fn(),
  generateCharacter: vi.fn(),
  deleteLastMessage: vi.fn(),
  generateOutline: vi.fn(),
  generateOutlineStream: vi.fn(),
  getSummary: vi.fn(),
  confirmOutline: vi.fn(),
  generateSummary: vi.fn(),
  saveSummary: vi.fn(),
  getProgress: vi.fn(),
  updateProgress: vi.fn(),
  updateCharacter: vi.fn(),
};

vi.mock('../useApiClients', () => ({
  useApiClients: () => ({
    conversationApi: mockConversationApi,
  }),
}));

describe('useConversationClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return API client functions', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('getConversationsList');
    expect(result.current).toHaveProperty('getConversationSettings');
    expect(result.current).toHaveProperty('createOrUpdateSettings');
    expect(result.current).toHaveProperty('getCharacters');
    expect(result.current).toHaveProperty('generateCharacter');
    expect(result.current).toHaveProperty('deleteLastMessage');
  });

  it('should fetch conversations list', async () => {
    const mockConversations = [
      {
        id: 'test_001',
        title: 'Test Story',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    mockConversationApi.getConversationsList.mockResolvedValueOnce(
      mockConversations
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const conversations = await result.current.getConversationsList();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe('test_001');
    expect(mockConversationApi.getConversationsList).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockConversationApi.getConversationsList.mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    await expect(result.current.getConversationsList()).rejects.toThrow();
  });

  it('should get conversation settings', async () => {
    const mockSettings = {
      conversation_id: 'test_001',
      title: 'Test Story',
      background: 'Test background',
    };

    mockConversationApi.getConversationSettings.mockResolvedValueOnce(
      mockSettings
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const settings = await result.current.getConversationSettings('test_001');

    expect(settings).not.toBeNull();
    expect(settings?.conversation_id).toBe('test_001');
    expect(mockConversationApi.getConversationSettings).toHaveBeenCalledWith(
      'test_001'
    );
  });

  it('should generate character', async () => {
    const mockCharacter = {
      character: {
        name: 'Alice',
        personality: 'Brave and kind',
      },
    };

    mockConversationApi.generateCharacter.mockResolvedValueOnce(
      mockCharacter
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const character = await result.current.generateCharacter(
      'test_001',
      'deepseek',
      'deepseek-chat'
    );

    expect(character.character?.name).toBe('Alice');
    expect(character.character?.personality).toBe('Brave and kind');
    expect(mockConversationApi.generateCharacter).toHaveBeenCalled();
  });

  it('should delete last message', async () => {
    mockConversationApi.deleteLastMessage.mockResolvedValueOnce(true);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const success = await result.current.deleteLastMessage('test_001');

    expect(success).toBe(true);
    expect(mockConversationApi.deleteLastMessage).toHaveBeenCalledWith(
      'test_001'
    );
  });

  it('should get conversation messages', async () => {
    const mockMessages = [
      { id: 'msg1', role: 'user', content: 'Hello' },
      { id: 'msg2', role: 'assistant', content: 'Hi there' },
    ];

    mockConversationApi.getConversationMessages.mockResolvedValueOnce(
      mockMessages
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const messages = await result.current.getConversationMessages('test_001');

    expect(messages).toEqual(mockMessages);
    expect(mockConversationApi.getConversationMessages).toHaveBeenCalledWith(
      'test_001'
    );
  });

  it('should create or update settings', async () => {
    const mockSettings = {
      conversation_id: 'test_001',
      title: 'Updated Title',
      background: 'Updated background',
    };

    mockConversationApi.createOrUpdateSettings.mockResolvedValueOnce(
      mockSettings
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const settings = await result.current.createOrUpdateSettings({
      conversation_id: 'test_001',
      title: 'Updated Title',
    });

    expect(settings).toEqual(mockSettings);
    expect(
      mockConversationApi.createOrUpdateSettings
    ).toHaveBeenCalledWith({
      conversation_id: 'test_001',
      title: 'Updated Title',
    });
  });

  it('should generate outline without onChunk', async () => {
    const mockOutline = 'Generated outline text';

    mockConversationApi.generateOutline.mockResolvedValueOnce(mockOutline);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const outline = await result.current.generateOutline(
      'Background text',
      ['Character1'],
      { Character1: 'Personality' },
      'test_001',
      'deepseek',
      'deepseek-chat'
    );

    expect(outline).toBe(mockOutline);
    expect(mockConversationApi.generateOutline).toHaveBeenCalledWith(
      'Background text',
      {
        characters: ['Character1'],
        characterPersonality: { Character1: 'Personality' },
        conversationId: 'test_001',
        provider: 'deepseek',
        model: 'deepseek-chat',
      }
    );
  });

  it('should generate outline with onChunk callback', async () => {
    const mockOutline = 'Generated outline text';
    const onChunk = vi.fn();

    mockConversationApi.generateOutlineStream.mockResolvedValueOnce(
      mockOutline
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const outline = await result.current.generateOutline(
      'Background text',
      ['Character1'],
      { Character1: 'Personality' },
      'test_001',
      'deepseek',
      'deepseek-chat',
      onChunk
    );

    expect(outline).toBe(mockOutline);
    expect(mockConversationApi.generateOutlineStream).toHaveBeenCalledWith(
      'Background text',
      {
        characters: ['Character1'],
        characterPersonality: { Character1: 'Personality' },
        conversationId: 'test_001',
        provider: 'deepseek',
        model: 'deepseek-chat',
      },
      onChunk
    );
  });

  it('should get summary', async () => {
    const mockSummary = {
      conversation_id: 'test_001',
      summary: 'This is a summary',
      created_at: Date.now(),
    };

    mockConversationApi.getSummary.mockResolvedValueOnce(mockSummary);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const summary = await result.current.getSummary('test_001');

    expect(summary).toEqual(mockSummary);
    expect(mockConversationApi.getSummary).toHaveBeenCalledWith('test_001');
  });

  it('should return null when summary not found', async () => {
    mockConversationApi.getSummary.mockResolvedValueOnce(null);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const summary = await result.current.getSummary('test_001');

    expect(summary).toBeNull();
  });

  it('should generate summary', async () => {
    const mockSummaryText = 'Generated summary text';

    mockConversationApi.generateSummary.mockResolvedValueOnce(mockSummaryText);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const summary = await result.current.generateSummary(
      'test_001',
      'deepseek',
      'deepseek-chat'
    );

    expect(summary).toBe(mockSummaryText);
    expect(mockConversationApi.generateSummary).toHaveBeenCalledWith(
      'test_001',
      'deepseek',
      'deepseek-chat'
    );
  });

  it('should save summary', async () => {
    const mockSavedSummary = {
      conversation_id: 'test_001',
      summary: 'Saved summary',
      created_at: Date.now(),
    };

    mockConversationApi.saveSummary.mockResolvedValueOnce(mockSavedSummary);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const summary = await result.current.saveSummary(
      'test_001',
      'Summary text'
    );

    expect(summary).toEqual(mockSavedSummary);
    expect(mockConversationApi.saveSummary).toHaveBeenCalledWith(
      'test_001',
      'Summary text'
    );
  });

  it('should get progress', async () => {
    const mockProgress = {
      conversation_id: 'test_001',
      current_chapter: 1,
      current_scene: 2,
    };

    mockConversationApi.getProgress.mockResolvedValueOnce(mockProgress);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const progress = await result.current.getProgress('test_001');

    expect(progress).toEqual(mockProgress);
    expect(mockConversationApi.getProgress).toHaveBeenCalledWith('test_001');
  });

  it('should return null when progress not found', async () => {
    mockConversationApi.getProgress.mockResolvedValueOnce(null);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const progress = await result.current.getProgress('test_001');

    expect(progress).toBeNull();
  });

  it('should confirm outline', async () => {
    mockConversationApi.confirmOutline.mockResolvedValueOnce(true);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const confirmed = await result.current.confirmOutline('test_001');

    expect(confirmed).toBe(true);
    expect(mockConversationApi.confirmOutline).toHaveBeenCalledWith(
      'test_001'
    );
  });

  it('should update progress', async () => {
    const mockUpdatedProgress = {
      conversation_id: 'test_001',
      current_chapter: 2,
      current_scene: 3,
    };

    mockConversationApi.updateProgress.mockResolvedValueOnce(
      mockUpdatedProgress
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const progress = await result.current.updateProgress('test_001', {
      current_chapter: 2,
    });

    expect(progress).toEqual(mockUpdatedProgress);
    expect(mockConversationApi.updateProgress).toHaveBeenCalledWith(
      'test_001',
      { current_chapter: 2 }
    );
  });

  it('should get characters', async () => {
    const mockCharacters = [
      { name: 'Alice', personality: 'Brave', is_main: true },
      { name: 'Bob', personality: 'Kind', is_main: false },
    ];

    mockConversationApi.getCharacters.mockResolvedValueOnce(mockCharacters);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const characters = await result.current.getCharacters('test_001', true);

    expect(characters).toEqual(mockCharacters);
    expect(mockConversationApi.getCharacters).toHaveBeenCalledWith(
      'test_001',
      true
    );
  });

  it('should get characters with default includeUnavailable', async () => {
    const mockCharacters = [{ name: 'Alice', personality: 'Brave' }];

    mockConversationApi.getCharacters.mockResolvedValueOnce(mockCharacters);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    await result.current.getCharacters('test_001');

    expect(mockConversationApi.getCharacters).toHaveBeenCalledWith(
      'test_001',
      true
    );
  });

  it('should update character', async () => {
    const mockUpdatedCharacter = {
      name: 'Alice',
      personality: 'Updated personality',
      is_main: true,
      is_unavailable: false,
      notes: 'Updated notes',
    };

    mockConversationApi.updateCharacter.mockResolvedValueOnce(
      mockUpdatedCharacter
    );

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const character = await result.current.updateCharacter(
      'test_001',
      'Alice',
      {
        is_main: true,
        notes: 'Updated notes',
      }
    );

    expect(character).toEqual(mockUpdatedCharacter);
    expect(mockConversationApi.updateCharacter).toHaveBeenCalledWith(
      'test_001',
      'Alice',
      {
        is_main: true,
        notes: 'Updated notes',
      }
    );
  });

  it('should generate character with all parameters', async () => {
    const mockResult = {
      character: {
        name: 'New Character',
        personality: 'Personality description',
      },
    };

    mockConversationApi.generateCharacter.mockResolvedValueOnce(mockResult);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const character = await result.current.generateCharacter(
      'test_001',
      'deepseek',
      'deepseek-chat',
      'Character hints',
      'Background',
      ['Existing Character'],
      { 'Existing Character': 'Personality' }
    );

    expect(character).toEqual(mockResult);
    expect(mockConversationApi.generateCharacter).toHaveBeenCalledWith(
      'test_001',
      'deepseek',
      {
        model: 'deepseek-chat',
        characterHints: 'Character hints',
        background: 'Background',
        characters: ['Existing Character'],
        characterPersonality: { 'Existing Character': 'Personality' },
      }
    );
  });

  it('should generate character with characters array result', async () => {
    const mockResult = {
      characters: [
        { name: 'Character1', personality: 'Personality1' },
        { name: 'Character2', personality: 'Personality2' },
      ],
    };

    mockConversationApi.generateCharacter.mockResolvedValueOnce(mockResult);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationClient(), {
      wrapper: createWrapper(store),
    });

    const character = await result.current.generateCharacter(
      'test_001',
      'deepseek',
      'deepseek-chat'
    );

    expect(character).toEqual(mockResult);
  });
});
