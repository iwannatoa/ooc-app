import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationSettingsForm from '../ConversationSettingsForm';
import * as useConversationClient from '@/hooks/useConversationClient';
import * as useSettingsState from '@/hooks/useSettingsState';
import * as useI18n from '@/i18n';
import * as useToast from '@/hooks/useToast';

// Mock dependencies
vi.mock('@/hooks/useConversationClient');
vi.mock('@/hooks/useSettingsState');
vi.mock('@/i18n');
vi.mock('@/hooks/useToast');

describe('ConversationSettingsForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockConversationClient = {
    generateCharacter: vi.fn(),
    generateOutline: vi.fn(),
    confirmOutline: vi.fn(),
  };
  const mockShowError = vi.fn();
  const mockShowWarning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useConversationClient.useConversationClient as any).mockReturnValue(
      mockConversationClient
    );

    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: { model: 'deepseek-chat' },
        },
      },
    });

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });

    (useToast.useToast as any).mockReturnValue({
      showError: mockShowError,
      showWarning: mockShowWarning,
    });
  });

  it('should render form fields', () => {
    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/storyTitle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/background/i)).toBeInTheDocument();
  });

  it('should disable generate character button when background is empty', () => {
    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText(/generateCharacter/i);
    expect(generateButton).toBeDisabled();
  });

  it('should enable generate character button when background is filled', async () => {
    const user = userEvent.setup();
    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const backgroundInput = screen.getByLabelText(/background/i);
    await user.type(backgroundInput, 'Test background story');

    const generateButton = screen.getByText(/generateCharacter/i);
    expect(generateButton).not.toBeDisabled();
  });

  it('should call generateCharacter when button is clicked', async () => {
    const user = userEvent.setup();
    mockConversationClient.generateCharacter.mockResolvedValue({
      name: 'Alice',
      personality: 'Brave',
    });

    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const backgroundInput = screen.getByLabelText(/background/i);
    await user.type(backgroundInput, 'Test background');

    const generateButton = screen.getByText(/generateCharacter/i);
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockConversationClient.generateCharacter).toHaveBeenCalledWith(
        'test_001',
        'deepseek',
        'deepseek-chat'
      );
    });
  });

  it('should show error when generateCharacter fails', async () => {
    const user = userEvent.setup();
    mockConversationClient.generateCharacter.mockRejectedValue(
      new Error('Generation failed')
    );

    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const backgroundInput = screen.getByLabelText(/background/i);
    await user.type(backgroundInput, 'Test background');

    const generateButton = screen.getByText(/generateCharacter/i);
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConversationSettingsForm
        conversationId="test_001"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText(/cancel/i);
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});

