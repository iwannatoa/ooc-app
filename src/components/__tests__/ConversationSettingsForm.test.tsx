import * as useConversationClient from '@/hooks/useConversationClient';
import * as useConversationSettingsForm from '@/hooks/useConversationSettingsForm';
import * as useConversationSettingsGeneration from '@/hooks/useConversationSettingsGeneration';
import * as useConversationSettingsConverter from '@/hooks/useConversationSettingsConverter';
import * as useI18n from '@/i18n/i18n';
import {
  createMockConversationClient,
  createMockConversationSettingsForm,
  createMockConversationSettingsGeneration,
  createMockConversationSettingsConverter,
  createMockI18n,
} from '@/mock';
import { vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationSettingsForm } from '../story';
import { renderWithProviders } from '@/test/utils';

// Mock dependencies
vi.mock('@/hooks/useConversationClient');
vi.mock('@/hooks/useConversationSettingsForm');
vi.mock('@/hooks/useConversationSettingsGeneration');
vi.mock('@/hooks/useConversationSettingsConverter');
vi.mock('@/i18n/i18n');

describe('ConversationSettingsForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockConversationClient = {
    confirmOutline: vi.fn(),
  };
  const mockUpdateFields = vi.fn();
  const mockGenerateOutline = vi.fn();
  const mockToApiFormat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useConversationClient.useConversationClient).mockReturnValue(
      createMockConversationClient({
        confirmOutline: mockConversationClient.confirmOutline,
      })
    );

    vi.mocked(useConversationSettingsForm.useConversationSettingsForm).mockReturnValue(
      createMockConversationSettingsForm({
        formData: {
          title: '',
          background: '',
          supplement: '',
          characters: [],
          characterPersonality: {},
          characterIsMain: {},
          characterGenerationHints: '',
          outline: '',
          generatedOutline: null,
          outlineConfirmed: false,
          allowAutoGenerateCharacters: false,
          allowAutoGenerateMainCharacters: false,
        },
        conversationId: 'test_001',
        isNewConversation: false,
        updateFields: mockUpdateFields,
      })
    );

    vi.mocked(useConversationSettingsGeneration.useConversationSettingsGeneration).mockReturnValue(
      createMockConversationSettingsGeneration({
        generateOutline: mockGenerateOutline,
        generateCharacter: vi.fn(),
      })
    );

    vi.mocked(useConversationSettingsConverter.useConversationSettingsConverter).mockReturnValue(
      createMockConversationSettingsConverter({
        toApiFormat: mockToApiFormat,
      })
    );

    vi.mocked(useI18n.useI18n).mockReturnValue(
      createMockI18n({
        t: (key: string) => key,
      })
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('should render form fields', () => {
    renderWithProviders(
      <ConversationSettingsForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/storyTitle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/background/i)).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    renderWithProviders(
      <ConversationSettingsForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButtons = screen.getAllByText(/cancel/i);
    fireEvent.click(cancelButtons[0]);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onSave when form is submitted', async () => {
    mockToApiFormat.mockReturnValue({ conversation_id: 'test_001' });

    const { container } = renderWithProviders(
      <ConversationSettingsForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(
      () => {
        expect(mockToApiFormat).toHaveBeenCalled();
      },
      { container }
    );
  });
});
