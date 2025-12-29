import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConversationSettingsGeneration } from '../useConversationSettingsGeneration';
import { createTestStore } from '@/test/utils';

// Mock dependencies
vi.mock('../useConversationClient', () => ({
  useConversationClient: vi.fn(),
}));

vi.mock('../useSettingsState', () => ({
  useSettingsState: vi.fn(),
}));

vi.mock('../useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('../useConversationSettingsForm', () => ({
  useConversationSettingsForm: vi.fn(),
}));

vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(),
}));

import { useConversationClient } from '../useConversationClient';
import { useSettingsState } from '../useSettingsState';
import { useToast } from '../useToast';
import { useConversationSettingsForm } from '../useConversationSettingsForm';
import { useI18n } from '@/i18n/i18n';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useConversationSettingsGeneration', () => {
  const mockGenerateCharacter = vi.fn();
  const mockGenerateOutline = vi.fn();
  const mockGenerateOutlineStream = vi.fn();
  const mockShowError = vi.fn();
  const mockShowWarning = vi.fn();
  const mockSetGeneratingCharacter = vi.fn();
  const mockSetGeneratingOutline = vi.fn();
  const mockUpdateFields = vi.fn();
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock that delegates to the appropriate function based on onChunk parameter
    // This matches the actual implementation in useConversationClient
    const mockGenerateOutlineWithChunk = vi.fn(
      async (
        background: string,
        characters?: string[],
        personality?: Record<string, string>,
        conversationId?: string,
        provider?: string,
        model?: string,
        onChunk?: (chunk: string, accumulated: string) => void
      ) => {
        if (onChunk) {
          return await mockGenerateOutlineStream(
            background,
            {
              characters,
              characterPersonality: personality,
              conversationId,
              provider,
              model,
            },
            onChunk
          );
        }
        return await mockGenerateOutline(background, {
          characters,
          characterPersonality: personality,
          conversationId,
          provider,
          model,
        });
      }
    );

    (useConversationClient as any).mockReturnValue({
      generateCharacter: mockGenerateCharacter,
      generateOutline: mockGenerateOutlineWithChunk,
      generateOutlineStream: mockGenerateOutlineStream,
    });

    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: {
            model: 'deepseek-chat',
          },
        },
      },
    });

    (useToast as any).mockReturnValue({
      showError: mockShowError,
      showWarning: mockShowWarning,
    });

    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: 'Test background',
        characters: ['Alice', 'Bob'],
        characterPersonality: {
          Alice: 'Brave',
          Bob: 'Kind',
        },
      },
      conversationId: 'conv_001',
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    (useI18n as any).mockReturnValue({
      t: mockT,
    });
  });

  it('should return generation functions and states', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('generateCharacter');
    expect(result.current).toHaveProperty('generateOutline');
    expect(result.current).toHaveProperty('isGeneratingCharacter');
    expect(result.current).toHaveProperty('isGeneratingOutline');
  });

  it('should generate character successfully', async () => {
    const mockResult = {
      character: {
        name: 'Charlie',
        personality: 'Funny and witty',
      },
    };

    mockGenerateCharacter.mockResolvedValueOnce(mockResult);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toEqual([mockResult.character]);
    expect(mockSetGeneratingCharacter).toHaveBeenCalledWith(true);
    expect(mockSetGeneratingCharacter).toHaveBeenCalledWith(false);
    expect(mockGenerateCharacter).toHaveBeenCalledWith(
      'conv_001',
      'deepseek',
      'deepseek-chat',
      'Character hints',
      'Test background',
      ['Alice', 'Bob'],
      {
        Alice: 'Brave',
        Bob: 'Kind',
      }
    );
  });

  it('should generate character with characters array result', async () => {
    const mockResult = {
      characters: [
        { name: 'Charlie', personality: 'Funny' },
        { name: 'Diana', personality: 'Smart' },
      ],
    };

    mockGenerateCharacter.mockResolvedValueOnce(mockResult);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toEqual(mockResult.characters);
  });

  it('should show warning when background is empty', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: '',
        characters: ['Alice'],
        characterPersonality: {},
      },
      conversationId: 'conv_001',
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toBeNull();
    expect(mockShowWarning).toHaveBeenCalled();
    expect(mockGenerateCharacter).not.toHaveBeenCalled();
  });

  it('should show error when conversationId is missing', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: 'Test background',
        characters: ['Alice'],
        characterPersonality: {},
      },
      conversationId: null,
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toBeNull();
    expect(mockShowError).toHaveBeenCalled();
    expect(mockGenerateCharacter).not.toHaveBeenCalled();
  });

  it('should handle character generation error', async () => {
    mockGenerateCharacter.mockRejectedValueOnce(new Error('Generation failed'));

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toBeNull();
    expect(mockShowError).toHaveBeenCalled();
    expect(mockSetGeneratingCharacter).toHaveBeenCalledWith(false);
  });

  it('should handle empty character result', async () => {
    mockGenerateCharacter.mockResolvedValueOnce({});

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedCharacters: any = null;

    await act(async () => {
      generatedCharacters = await result.current.generateCharacter(
        'Character hints'
      );
    });

    expect(generatedCharacters).toBeNull();
    expect(mockShowError).toHaveBeenCalled();
  });

  it('should generate outline successfully', async () => {
    const mockOutline = 'Generated outline text';
    mockGenerateOutline.mockResolvedValueOnce(mockOutline);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline();
    });

    expect(generatedOutline).toBe(mockOutline);
    expect(mockSetGeneratingOutline).toHaveBeenCalledWith(true);
    expect(mockSetGeneratingOutline).toHaveBeenCalledWith(false);
    expect(mockGenerateOutline).toHaveBeenCalledWith('Test background', {
      characters: ['Alice', 'Bob'],
      characterPersonality: {
        Alice: 'Brave',
        Bob: 'Kind',
      },
      conversationId: 'conv_001',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
  });

  it('should generate outline with onChunk callback', async () => {
    const mockOutline = 'Generated outline text';
    const onChunk = vi.fn();
    mockGenerateOutlineStream.mockResolvedValueOnce(mockOutline);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline(onChunk);
    });

    expect(generatedOutline).toBe(mockOutline);
    expect(mockGenerateOutlineStream).toHaveBeenCalledWith(
      'Test background',
      {
        characters: ['Alice', 'Bob'],
        characterPersonality: {
          Alice: 'Brave',
          Bob: 'Kind',
        },
        conversationId: 'conv_001',
        provider: 'deepseek',
        model: 'deepseek-chat',
      },
      onChunk
    );
  });

  it('should show warning when background is empty for outline', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: '',
        characters: ['Alice'],
        characterPersonality: {},
      },
      conversationId: 'conv_001',
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline();
    });

    expect(generatedOutline).toBeNull();
    expect(mockShowWarning).toHaveBeenCalled();
    expect(mockGenerateOutline).not.toHaveBeenCalled();
  });

  it('should show warning when no valid characters for outline', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: 'Test background',
        characters: ['', '   '],
        characterPersonality: {},
      },
      conversationId: 'conv_001',
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline();
    });

    expect(generatedOutline).toBeNull();
    expect(mockShowWarning).toHaveBeenCalled();
    expect(mockGenerateOutline).not.toHaveBeenCalled();
  });

  it('should show error when conversationId is missing for outline', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: 'Test background',
        characters: ['Alice'],
        characterPersonality: {},
      },
      conversationId: null,
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline();
    });

    expect(generatedOutline).toBeNull();
    expect(mockShowError).toHaveBeenCalled();
    expect(mockGenerateOutline).not.toHaveBeenCalled();
  });

  it('should handle outline generation error', async () => {
    mockGenerateOutline.mockRejectedValueOnce(new Error('Generation failed'));

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    let generatedOutline: string | null = null;

    await act(async () => {
      generatedOutline = await result.current.generateOutline();
    });

    expect(generatedOutline).toBeNull();
    expect(mockShowError).toHaveBeenCalled();
    expect(mockSetGeneratingOutline).toHaveBeenCalledWith(false);
  });

  it('should filter valid characters and personality for outline', async () => {
    (useConversationSettingsForm as any).mockReturnValue({
      formData: {
        background: 'Test background',
        characters: ['Alice', '', 'Bob', '   '],
        characterPersonality: {
          Alice: 'Brave',
          Bob: 'Kind',
          Charlie: 'Should not appear',
        },
      },
      conversationId: 'conv_001',
      isGeneratingCharacter: false,
      isGeneratingOutline: false,
      setGeneratingCharacter: mockSetGeneratingCharacter,
      setGeneratingOutline: mockSetGeneratingOutline,
      updateFields: mockUpdateFields,
    });

    const mockOutline = 'Generated outline';
    mockGenerateOutline.mockResolvedValueOnce(mockOutline);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsGeneration(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.generateOutline();
    });

    expect(mockGenerateOutline).toHaveBeenCalledWith('Test background', {
      characters: ['Alice', 'Bob'],
      characterPersonality: {
        Alice: 'Brave',
        Bob: 'Kind',
      },
      conversationId: 'conv_001',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
  });
});
