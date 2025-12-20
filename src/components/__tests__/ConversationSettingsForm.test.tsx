import * as useConversationClient from '@/hooks/useConversationClient';
import * as useSettingsState from '@/hooks/useSettingsState';
import * as useToast from '@/hooks/useToast';
import * as useI18n from '@/i18n';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConversationSettingsForm from '../ConversationSettingsForm';

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

  afterEach(() => {
    cleanup();
  });

  it('should render form fields', () => {
    render(
      <ConversationSettingsForm
        conversationId='test_001'
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
        conversationId='test_001'
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButtons = screen.getAllByText(/generateCharacter/i);
    expect(generateButtons[0]).toBeDisabled();
  });

  it('should enable generate character button when background is filled', async () => {
    const { container } = render(
      <ConversationSettingsForm
        conversationId='test_001'
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        settings={{ background: 'Test background story' } as any}
      />
    );

    // Button should be enabled when background is provided via props
    await waitFor(
      () => {
        const generateButtons = screen.getAllByText(/generateCharacter/i);
        const button = generateButtons[0];
        expect(button).not.toBeDisabled();
      },
      { container }
    );
  });

  it('should call generateCharacter when button is clicked', async () => {
    mockConversationClient.generateCharacter.mockResolvedValue({
      name: 'Alice',
      personality: 'Brave',
    });

    const { container } = render(
      <ConversationSettingsForm
        conversationId='test_001'
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        settings={{ background: 'Test background' } as any}
      />
    );

    // Button should be enabled when background is provided via props
    const generateButtons = screen.getAllByText(/generateCharacter/i);
    expect(generateButtons[0]).not.toBeDisabled();

    fireEvent.click(generateButtons[0]);

    await waitFor(
      () => {
        expect(mockConversationClient.generateCharacter).toHaveBeenCalled();
        // Check that it was called with correct parameters
        const calls = mockConversationClient.generateCharacter.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0]).toBe('test_001'); // conversationId
        expect(calls[0][1]).toBe('deepseek'); // provider
        expect(calls[0][2]).toBe('deepseek-chat'); // model
      },
      { container }
    );
  });

  it('should show error when generateCharacter fails', async () => {
    mockConversationClient.generateCharacter.mockRejectedValue(
      new Error('Generation failed')
    );

    const { container } = render(
      <ConversationSettingsForm
        conversationId='test_001'
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        settings={{ background: 'Test background' } as any}
      />
    );

    // Button should be enabled when background is provided
    const generateButtons = screen.getAllByText(/generateCharacter/i);
    expect(generateButtons[0]).not.toBeDisabled();
    fireEvent.click(generateButtons[0]);

    await waitFor(
      () => {
        expect(mockShowError).toHaveBeenCalled();
      },
      { container }
    );
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ConversationSettingsForm
        conversationId='test_001'
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButtons = screen.getAllByText(/cancel/i);
    // Use fireEvent instead of userEvent to avoid clipboard issues
    fireEvent.click(cancelButtons[0]);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
