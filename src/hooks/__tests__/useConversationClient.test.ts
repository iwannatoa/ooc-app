import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationClient } from '../useConversationClient';

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
  mockConversationClient: {},
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

describe('useConversationClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('should return API client functions', () => {
    const { result } = renderHook(() => useConversationClient());

    expect(result.current).toHaveProperty('getConversationsList');
    expect(result.current).toHaveProperty('getConversationSettings');
    expect(result.current).toHaveProperty('createOrUpdateSettings');
    expect(result.current).toHaveProperty('getCharacters');
    expect(result.current).toHaveProperty('generateCharacter');
    expect(result.current).toHaveProperty('deleteLastMessage');
  });

  it('should fetch conversations list', async () => {
    const mockResponse = {
      success: true,
      conversations: [
        {
          conversation_id: 'test_001',
          title: 'Test Story',
          created_at: '2024-01-01T00:00:00',
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useConversationClient());

    const conversations = await result.current.getConversationsList();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe('test_001');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/conversations/list'
    );
  });

  it('should handle API errors', async () => {
    const mockResponse = {
      success: false,
      error: 'Failed to fetch',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useConversationClient());

    await expect(result.current.getConversationsList()).rejects.toThrow();
  });

  it('should get conversation settings', async () => {
    const mockResponse = {
      success: true,
      settings: {
        conversation_id: 'test_001',
        title: 'Test Story',
        background: 'Test background',
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useConversationClient());

    const settings = await result.current.getConversationSettings('test_001');

    expect(settings).not.toBeNull();
    expect(settings?.conversation_id).toBe('test_001');
  });

  it('should generate character', async () => {
    const mockResponse = {
      success: true,
      character: {
        name: 'Alice',
        personality: 'Brave and kind',
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useConversationClient());

    const character = await result.current.generateCharacter(
      'test_001',
      'deepseek',
      'deepseek-chat'
    );

    expect(character.name).toBe('Alice');
    expect(character.personality).toBe('Brave and kind');
  });

  it('should delete last message', async () => {
    const mockResponse = {
      success: true,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useConversationClient());

    const success = await result.current.deleteLastMessage('test_001');

    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/conversation/delete-last-message',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
