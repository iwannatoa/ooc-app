import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import { useConversationSettingsForm } from '../useConversationSettingsForm';
import { createTestStore } from '@/test/utils';
import { ConversationSettings } from '@/types';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useConversationSettingsForm', () => {
  it('should return initial form state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.formData).toBeDefined();
    expect(result.current.conversationId).toBeNull();
    expect(result.current.isNewConversation).toBe(false);
    expect(result.current.isGeneratingCharacter).toBe(false);
    expect(result.current.isGeneratingOutline).toBe(false);
  });

  it('should initialize form with conversation ID and settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    const settings: ConversationSettings = {
      conversation_id: 'conv_001',
      title: 'Test Story',
      background: 'Test background',
      characters: ['Alice'],
      character_personality: {
        Alice: 'Brave',
      },
    };

    act(() => {
      result.current.initialize('conv_001', settings, false);
    });

    expect(result.current.conversationId).toBe('conv_001');
    expect(result.current.isNewConversation).toBe(false);
    expect(result.current.formData.title).toBe('Test Story');
    expect(result.current.formData.background).toBe('Test background');
    expect(result.current.formData.characters).toEqual(['Alice']);
    expect(result.current.formData.characterPersonality).toEqual({
      Alice: 'Brave',
    });
  });

  it('should initialize form for new conversation', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.initialize('conv_new', undefined, true);
    });

    expect(result.current.conversationId).toBe('conv_new');
    expect(result.current.isNewConversation).toBe(true);
  });

  it('should update a single field', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateField('title', 'New Title');
    });

    expect(result.current.formData.title).toBe('New Title');
  });

  it('should update multiple fields', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateFields({
        title: 'New Title',
        background: 'New Background',
      });
    });

    expect(result.current.formData.title).toBe('New Title');
    expect(result.current.formData.background).toBe('New Background');
  });

  it('should add character', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice'],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.addCharacter();
    });

    expect(result.current.formData.characters).toHaveLength(2);
    expect(result.current.formData.characters[1]).toBe('');
  });

  it('should remove character', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice', 'Bob'],
          characterPersonality: {
            Alice: 'Brave',
            Bob: 'Kind',
          },
          characterIsMain: {
            Alice: true,
            Bob: false,
          },
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.removeCharacter(0);
    });

    expect(result.current.formData.characters).toHaveLength(1);
    expect(result.current.formData.characters[0]).toBe('Bob');
    expect(result.current.formData.characterPersonality).not.toHaveProperty(
      'Alice'
    );
    expect(result.current.formData.characterIsMain).not.toHaveProperty(
      'Alice'
    );
  });

  it('should update character name', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice'],
          characterPersonality: {
            Alice: 'Brave',
          },
          characterIsMain: {
            Alice: true,
          },
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateCharacter(0, 'Alicia');
    });

    expect(result.current.formData.characters[0]).toBe('Alicia');
    expect(result.current.formData.characterPersonality).toHaveProperty(
      'Alicia'
    );
    expect(result.current.formData.characterPersonality['Alicia']).toBe(
      'Brave'
    );
    expect(result.current.formData.characterPersonality).not.toHaveProperty(
      'Alice'
    );
  });

  it('should update character personality', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice'],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateCharacterPersonality('Alice', 'Brave and kind');
    });

    expect(result.current.formData.characterPersonality['Alice']).toBe(
      'Brave and kind'
    );
  });

  it('should update character isMain flag', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice'],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.updateCharacterIsMain('Alice', true);
    });

    expect(result.current.formData.characterIsMain['Alice']).toBe(true);
  });

  it('should confirm outline', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: [],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: 'Generated outline text',
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.confirmOutline();
    });

    expect(result.current.formData.outline).toBe('Generated outline text');
    expect(result.current.formData.outlineConfirmed).toBe(true);
    expect(result.current.formData.generatedOutline).toBeNull();
  });

  it('should set generating character state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setGeneratingCharacter(true);
    });

    expect(result.current.isGeneratingCharacter).toBe(true);

    act(() => {
      result.current.setGeneratingCharacter(false);
    });

    expect(result.current.isGeneratingCharacter).toBe(false);
  });

  it('should set generating outline state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setGeneratingOutline(true);
    });

    expect(result.current.isGeneratingOutline).toBe(true);

    act(() => {
      result.current.setGeneratingOutline(false);
    });

    expect(result.current.isGeneratingOutline).toBe(false);
  });

  it('should reset form', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: 'Modified Title',
          background: 'Modified Background',
          supplement: '',
          characters: ['Modified'],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: true,
        isGeneratingOutline: true,
        initialSettings: {
          conversation_id: 'conv_001',
          title: 'Original Title',
          background: 'Original Background',
        },
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.title).toBe('Original Title');
    expect(result.current.formData.background).toBe('Original Background');
    expect(result.current.isGeneratingCharacter).toBe(false);
    expect(result.current.isGeneratingOutline).toBe(false);
  });

  it('should clear form', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: true,
        formData: {
          title: 'Test',
          background: 'Test',
          supplement: '',
          characters: ['Alice'],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: true,
        isGeneratingOutline: true,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.clearForm();
    });

    expect(result.current.conversationId).toBeNull();
    expect(result.current.isNewConversation).toBe(false);
    expect(result.current.formData.title).toBe('');
    expect(result.current.isGeneratingCharacter).toBe(false);
    expect(result.current.isGeneratingOutline).toBe(false);
  });

  it('should compute valid characters', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice', '', 'Bob', '   '],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.validCharacters).toEqual(['Alice', 'Bob']);
  });

  it('should compute valid personality', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice', 'Bob'],
          characterPersonality: {
            Alice: 'Brave',
            Bob: 'Kind',
            Charlie: 'Should not appear',
          },
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.validPersonality).toEqual({
      Alice: 'Brave',
      Bob: 'Kind',
    });
    expect(result.current.validPersonality).not.toHaveProperty('Charlie');
  });

  it('should compute valid isMain', () => {
    const store = createTestStore({
      conversationSettingsForm: {
        conversationId: 'conv_001',
        isNewConversation: false,
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: ['Alice', 'Bob'],
          characterPersonality: {},
          characterIsMain: {
            Alice: true,
            Bob: false,
            Charlie: true,
          },
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: true,
          allowAutoGenerateMainCharacters: true,
        },
        isGeneratingCharacter: false,
        isGeneratingOutline: false,
      },
    });
    const { result } = renderHook(() => useConversationSettingsForm(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.validIsMain).toEqual({
      Alice: true,
    });
    expect(result.current.validIsMain).not.toHaveProperty('Charlie');
  });
});

