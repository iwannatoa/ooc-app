import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { mockFn } from '@/test/mockFn';
import ConversationSettingsForm from '../index';
import * as useConversationClient from '@/hooks/useConversationClient';
import * as useConversationSettingsForm from '@/hooks/useConversationSettingsForm';
import * as useConversationSettingsGeneration from '@/hooks/useConversationSettingsGeneration';
import * as useConversationSettingsConverter from '@/hooks/useConversationSettingsConverter';

vi.mock('@/hooks/useConversationClient');
vi.mock('@/hooks/useConversationSettingsForm');
vi.mock('@/hooks/useConversationSettingsGeneration');
vi.mock('@/hooks/useConversationSettingsConverter');

vi.mock('@/i18n/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockUpdateFields = vi.fn();
const mockToApiFormat = vi.fn();

const baseFormData = {
  title: 'Demo',
  background: 'old background',
  supplement: '',
  characters: ['Old Role'],
  characterPersonality: { 'Old Role': 'old trait' },
  characterIsMain: {},
  characterGenerationHints: '',
  outline: 'old outline',
  generatedOutline: null,
  outlineConfirmed: false,
  allowAutoGenerateCharacters: true,
  allowAutoGenerateMainCharacters: true,
  serializationOpenEnded: true,
  finiteTotalSections: 10,
  conversationTemperature: '0.6',
  conversationMaxTokens: '1800',
  conversationStopWords: '',
  contextRecentMessagesWithSummary: '',
  contextMaxMessageHistory: '',
  contextMaxContextTokens: '',
  contextEffectiveBudgetRatio: '',
  contextRecentBudgetRatio: '',
  contextSummaryBudgetRatio: '',
  summaryRefreshDeltaMessages: '',
};

describe('ConversationSettingsForm preset apply/undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFn(useConversationClient.useConversationClient).mockReturnValue({
      getProgress: vi.fn().mockResolvedValue(null),
      getStoryTemplates: vi.fn().mockResolvedValue([
        {
          id: 'builtin_fantasy',
          title: 'Fantasy starter',
          background: 'new background',
          outline_hint: 'new outline',
          characters: ['Alden', 'Mira'],
          character_personality: { Alden: 'scout', Mira: 'mage' },
          additional_settings: {
            conversationTemperature: 0.8,
            conversationMaxTokens: 2400,
          },
        },
      ]),
      updateProgress: vi.fn().mockResolvedValue({}),
      confirmOutline: vi.fn().mockResolvedValue(true),
    } as unknown as ReturnType<typeof useConversationClient.useConversationClient>);

    mockFn(
      useConversationSettingsForm.useConversationSettingsForm
    ).mockReturnValue({
      formData: { ...baseFormData },
      conversationId: 'conv_001',
      isNewConversation: false,
      updateFields: mockUpdateFields,
    });

    mockFn(
      useConversationSettingsGeneration.useConversationSettingsGeneration
    ).mockReturnValue({
      generateOutline: vi.fn().mockResolvedValue(null),
    });

    mockFn(
      useConversationSettingsConverter.useConversationSettingsConverter
    ).mockReturnValue({
      toApiFormat: mockToApiFormat,
      fromApiFormat: vi.fn(),
    });
  });

  it('applies preset over roles/outline/params and supports undo', async () => {
    renderWithProviders(<ConversationSettingsForm />);

    await waitFor(() =>
      expect(screen.getByLabelText('Story Template')).toBeInTheDocument()
    );
    fireEvent.change(screen.getByLabelText('Story Template'), {
      target: { value: 'builtin_fantasy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(mockUpdateFields).toHaveBeenCalledWith(
      expect.objectContaining({
        background: 'new background',
        outline: 'new outline',
        characters: ['Alden', 'Mira'],
        characterPersonality: { Alden: 'scout', Mira: 'mage' },
        conversationTemperature: '0.8',
        conversationMaxTokens: '2400',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo Preset' }));
    expect(mockUpdateFields).toHaveBeenCalledWith(
      expect.objectContaining({
        background: 'old background',
        outline: 'old outline',
        characters: ['Old Role'],
        characterPersonality: { 'Old Role': 'old trait' },
        conversationTemperature: '0.6',
        conversationMaxTokens: '1800',
      })
    );
  });
});
