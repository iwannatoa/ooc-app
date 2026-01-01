import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import { useConversationSettingsConverter } from '../useConversationSettingsConverter';
import { createTestStore } from '@/test/utils';
import type { ConversationSettingsFormData } from '@/store/slices/conversationSettingsFormSlice';
import { ConversationSettings } from '@/types';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useConversationSettingsConverter', () => {
  it('should convert form data to API format', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const formData: ConversationSettingsFormData = {
      title: 'Test Story',
      background: 'Test background',
      supplement: 'Test supplement',
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
      outline: 'Test outline',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    };

    const apiFormat = result.current.toApiFormat(formData, 'conv_001');

    expect(apiFormat).toEqual({
      conversation_id: 'conv_001',
      title: 'Test Story',
      background: 'Test background',
      characters: ['Alice', 'Bob'],
      character_personality: {
        Alice: 'Brave',
        Bob: 'Kind',
      },
      character_is_main: {
        Alice: true,
      },
      outline: 'Test outline',
      allow_auto_generate_characters: true,
      additional_settings: {
        allow_auto_generate_main_characters: false,
        supplement: 'Test supplement',
      },
    });
  });

  it('should filter out empty characters', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const formData: ConversationSettingsFormData = {
      title: 'Test Story',
      background: 'Test background',
      supplement: '',
      characters: ['Alice', '', 'Bob', '   '],
      characterPersonality: {
        Alice: 'Brave',
        Bob: 'Kind',
      },
      characterIsMain: {
        Alice: true,
      },
      characterGenerationHints: '',
      outline: '',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    };

    const apiFormat = result.current.toApiFormat(formData, 'conv_001');

    expect(apiFormat.characters).toEqual(['Alice', 'Bob']);
    expect(apiFormat.character_personality).toEqual({
      Alice: 'Brave',
      Bob: 'Kind',
    });
    expect(apiFormat.character_is_main).toEqual({
      Alice: true,
    });
  });

  it('should handle empty strings as undefined', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const formData: ConversationSettingsFormData = {
      title: '   ',
      background: '',
      supplement: '',
      characters: [],
      characterPersonality: {},
      characterIsMain: {},
      characterGenerationHints: '',
      outline: '',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    };

    const apiFormat = result.current.toApiFormat(formData, 'conv_001');

    expect(apiFormat.title).toBeUndefined();
    expect(apiFormat.background).toBeUndefined();
    expect(apiFormat.outline).toBeUndefined();
    expect(apiFormat.characters).toBeUndefined();
    expect(apiFormat.character_personality).toBeUndefined();
    expect(apiFormat.character_is_main).toBeUndefined();
  });

  it('should handle empty characters array', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const formData: ConversationSettingsFormData = {
      title: 'Test',
      background: 'Test',
      supplement: '',
      characters: [],
      characterPersonality: {},
      characterIsMain: {},
      characterGenerationHints: '',
      outline: '',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    };

    const apiFormat = result.current.toApiFormat(formData, 'conv_001');

    expect(apiFormat.characters).toBeUndefined();
  });

  it('should convert API format to form data', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const settings: ConversationSettings = {
      conversation_id: 'conv_001',
      title: 'Test Story',
      background: 'Test background',
      characters: ['Alice', 'Bob'],
      character_personality: {
        Alice: 'Brave',
        Bob: 'Kind',
      },
      character_is_main: {
        Alice: true,
        Bob: false,
      },
      outline: 'Test outline',
      allow_auto_generate_characters: true,
      additional_settings: {
        allow_auto_generate_main_characters: false,
        supplement: 'Test supplement',
      },
    };

    const formData = result.current.fromApiFormat(settings);

    expect(formData).toEqual({
      title: 'Test Story',
      background: 'Test background',
      supplement: 'Test supplement',
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
      outline: 'Test outline',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    });
  });

  it('should handle undefined settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const formData = result.current.fromApiFormat(undefined);

    expect(formData).toEqual({
      title: '',
      background: '',
      supplement: '',
      characters: [''],
      characterPersonality: {},
      characterIsMain: {},
      characterGenerationHints: '',
      outline: '',
      generatedOutline: null,
      outlineConfirmed: false,
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: true,
    });
  });

  it('should handle partial settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const settings: Partial<ConversationSettings> = {
      conversation_id: 'conv_001',
      title: 'Test Story',
    };

    const formData = result.current.fromApiFormat(settings as ConversationSettings);

    expect(formData.title).toBe('Test Story');
    expect(formData.background).toBe('');
    expect(formData.characters).toEqual(['']);
    expect(formData.allowAutoGenerateCharacters).toBe(true);
  });

  it('should handle settings with allow_auto_generate_characters false', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const settings: ConversationSettings = {
      conversation_id: 'conv_001',
      allow_auto_generate_characters: false,
      additional_settings: {
        allow_auto_generate_main_characters: false,
      },
    };

    const formData = result.current.fromApiFormat(settings);

    expect(formData.allowAutoGenerateCharacters).toBe(false);
    expect(formData.allowAutoGenerateMainCharacters).toBe(false);
  });

  it('should handle settings without additional_settings', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationSettingsConverter(), {
      wrapper: createWrapper(store),
    });

    const settings: ConversationSettings = {
      conversation_id: 'conv_001',
      title: 'Test',
    };

    const formData = result.current.fromApiFormat(settings);

    expect(formData.allowAutoGenerateMainCharacters).toBe(true);
    expect(formData.supplement).toBe('');
  });
});

