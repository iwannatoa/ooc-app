import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoryActions } from '../story';
import { renderWithProviders } from '@/test/utils';
import * as useI18n from '@/i18n/i18n';
import * as useAppLogic from '@/hooks/useAppLogic';
import * as useConversationSettingsDialog from '@/hooks/useDialog';
import * as useConversationManagement from '@/hooks/useConversationManagement';
import * as useChatState from '@/hooks/useChatState';

// Mock dependencies
vi.mock('@/i18n/i18n');
vi.mock('@/hooks/useAppLogic');
vi.mock('@/hooks/useDialog');
vi.mock('@/hooks/useConversationManagement');
vi.mock('@/hooks/useChatState');

describe('StoryActions', () => {
  const mockHandleGenerateStory = vi.fn();
  const mockHandleConfirmSection = vi.fn();
  const mockHandleRewriteSection = vi.fn();
  const mockHandleModifySection = vi.fn();
  const mockHandleDeleteLastMessage = vi.fn();
  const mockSettingsDialogOpen = vi.fn();
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n.useI18n as any).mockReturnValue({
      t: mockT,
    });

    (useChatState.useChatState as any).mockReturnValue({
      isSending: false,
    });

    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      activeConversationId: 'conv_001',
      conversationSettings: {
        title: 'Test Story',
      },
    });

    (
      useConversationSettingsDialog.useConversationSettingsDialog as any
    ).mockReturnValue({
      open: mockSettingsDialogOpen,
      close: vi.fn(),
    });

    (useAppLogic.useAppLogic as any).mockReturnValue({
      handleGenerateStory: mockHandleGenerateStory,
      handleConfirmSection: mockHandleConfirmSection,
      handleRewriteSection: mockHandleRewriteSection,
      handleModifySection: mockHandleModifySection,
      handleDeleteLastMessage: mockHandleDeleteLastMessage,
      canConfirm: true,
      canGenerate: true,
      canDeleteLast: true,
      isFirstChapter: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render action buttons', () => {
    renderWithProviders(<StoryActions />);

    expect(
      screen.getByText(/storyActions.generateCurrent/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/storyActions.nextChapter/i)).toBeInTheDocument();
    expect(screen.getByText(/storyActions.rewrite/i)).toBeInTheDocument();
    expect(screen.getByText(/storyActions.modify/i)).toBeInTheDocument();
    expect(screen.getByText(/storyActions.addSettings/i)).toBeInTheDocument();
    expect(
      screen.getByText(/storyActions.deleteLastMessage/i)
    ).toBeInTheDocument();
  });

  it('should call handleGenerateStory when generate button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const generateButton = screen.getByText(/storyActions.generateCurrent/i);
    fireEvent.click(generateButton);

    expect(mockHandleGenerateStory).toHaveBeenCalled();
  });

  it('should call handleConfirmSection when confirm button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const confirmButton = screen.getByText(/storyActions.nextChapter/i);
    fireEvent.click(confirmButton);

    expect(mockHandleConfirmSection).toHaveBeenCalled();
  });

  it('should open rewrite dialog when rewrite button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const rewriteButton = screen.getByText(/storyActions.rewrite/i);
    fireEvent.click(rewriteButton);

    expect(screen.getByText(/storyActions.rewriteTitle/i)).toBeInTheDocument();
  });

  it('should open modify dialog when modify button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const modifyButton = screen.getByText(/storyActions.modify/i);
    fireEvent.click(modifyButton);

    expect(screen.getByText(/storyActions.modifyTitle/i)).toBeInTheDocument();
  });

  it('should call handleAddSettings when add settings button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const addSettingsButton = screen.getByText(/storyActions.addSettings/i);
    fireEvent.click(addSettingsButton);

    expect(mockSettingsDialogOpen).toHaveBeenCalledWith('conv_001', {
      settings: { title: 'Test Story' },
    });
  });

  it('should call handleDeleteLastMessage when delete button is clicked', () => {
    renderWithProviders(<StoryActions />);

    const deleteButton = screen.getByText(/storyActions.deleteLastMessage/i);
    fireEvent.click(deleteButton);

    expect(mockHandleDeleteLastMessage).toHaveBeenCalled();
  });

  it('should disable buttons when loading', () => {
    (useChatState.useChatState as any).mockReturnValue({
      isSending: true,
    });

    renderWithProviders(<StoryActions />);

    // When loading, button text changes to "generating" - use title to find specific button
    const generateButton = screen.getByTitle(
      /storyActions.generateCurrentTooltip/i
    );
    expect(generateButton).toBeDisabled();
  });

  it('should disable buttons when no active conversation', () => {
    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
    });

    renderWithProviders(<StoryActions />);

    const generateButton = screen.getByText(/storyActions.generateCurrent/i);
    expect(generateButton).toBeDisabled();
  });

  it('should show first chapter text when isFirstChapter is true', () => {
    (useAppLogic.useAppLogic as any).mockReturnValue({
      handleGenerateStory: mockHandleGenerateStory,
      handleConfirmSection: mockHandleConfirmSection,
      handleRewriteSection: mockHandleRewriteSection,
      handleModifySection: mockHandleModifySection,
      handleDeleteLastMessage: mockHandleDeleteLastMessage,
      canConfirm: true,
      canGenerate: true,
      canDeleteLast: true,
      isFirstChapter: true,
    });

    renderWithProviders(<StoryActions />);

    expect(
      screen.getByText(/storyActions.generateFirstChapter/i)
    ).toBeInTheDocument();
  });

  it('should not show generate button when canGenerate is false', () => {
    (useAppLogic.useAppLogic as any).mockReturnValue({
      handleGenerateStory: mockHandleGenerateStory,
      handleConfirmSection: mockHandleConfirmSection,
      handleRewriteSection: mockHandleRewriteSection,
      handleModifySection: mockHandleModifySection,
      handleDeleteLastMessage: mockHandleDeleteLastMessage,
      canConfirm: true,
      canGenerate: false,
      canDeleteLast: true,
      isFirstChapter: false,
    });

    renderWithProviders(<StoryActions />);

    expect(
      screen.queryByText(/storyActions.generateCurrent/i)
    ).not.toBeInTheDocument();
  });

  it('should not show confirm button when canConfirm is false', () => {
    (useAppLogic.useAppLogic as any).mockReturnValue({
      handleGenerateStory: mockHandleGenerateStory,
      handleConfirmSection: mockHandleConfirmSection,
      handleRewriteSection: mockHandleRewriteSection,
      handleModifySection: mockHandleModifySection,
      handleDeleteLastMessage: mockHandleDeleteLastMessage,
      canConfirm: false,
      canGenerate: true,
      canDeleteLast: true,
      isFirstChapter: false,
    });

    renderWithProviders(<StoryActions />);

    expect(
      screen.queryByText(/storyActions.nextChapter/i)
    ).not.toBeInTheDocument();
  });

  it('should not show delete button when canDeleteLast is false', () => {
    (useAppLogic.useAppLogic as any).mockReturnValue({
      handleGenerateStory: mockHandleGenerateStory,
      handleConfirmSection: mockHandleConfirmSection,
      handleRewriteSection: mockHandleRewriteSection,
      handleModifySection: mockHandleModifySection,
      handleDeleteLastMessage: mockHandleDeleteLastMessage,
      canConfirm: true,
      canGenerate: true,
      canDeleteLast: false,
      isFirstChapter: false,
    });

    renderWithProviders(<StoryActions />);

    expect(
      screen.queryByText(/storyActions.deleteLastMessage/i)
    ).not.toBeInTheDocument();
  });

  it('should open rewrite dialog and show feedback input', async () => {
    const { container } = renderWithProviders(<StoryActions />);

    // Open rewrite dialog
    const rewriteButton = screen.getByText(/storyActions.rewrite/i);
    fireEvent.click(rewriteButton);

    // Wait for dialog to be rendered
    await waitFor(
      () => {
        expect(
          screen.getByText(/storyActions.rewriteTitle/i)
        ).toBeInTheDocument();
      },
      { container }
    );

    // Verify dialog elements are present
    expect(screen.getByText(/storyActions.rewritePrompt/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/storyActions.rewritePlaceholder/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/storyActions.confirmRewrite/i)
    ).toBeInTheDocument();
  });

  it('should handle rewrite dialog cancel', () => {
    renderWithProviders(<StoryActions />);

    // Open rewrite dialog
    const rewriteButton = screen.getByText(/storyActions.rewrite/i);
    fireEvent.click(rewriteButton);

    // Enter feedback
    const textarea = screen.getByPlaceholderText(
      /storyActions.rewritePlaceholder/i
    );
    fireEvent.change(textarea, { target: { value: 'Some feedback' } });

    // Cancel
    const cancelButton = screen.getByText(/common.cancel/i);
    fireEvent.click(cancelButton);

    // Dialog should be closed
    expect(
      screen.queryByText(/storyActions.rewriteTitle/i)
    ).not.toBeInTheDocument();
  });

  it('should open modify dialog and show feedback input', async () => {
    const { container } = renderWithProviders(<StoryActions />);

    // Open modify dialog
    const modifyButton = screen.getByText(/storyActions.modify/i);
    fireEvent.click(modifyButton);

    // Wait for dialog to be rendered
    await waitFor(
      () => {
        expect(
          screen.getByText(/storyActions.modifyTitle/i)
        ).toBeInTheDocument();
      },
      { container }
    );

    // Verify dialog elements are present
    expect(screen.getByText(/storyActions.modifyPrompt/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/storyActions.modifyPlaceholder/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/storyActions.confirmModify/i)).toBeInTheDocument();
  });

  it('should handle modify dialog cancel', () => {
    renderWithProviders(<StoryActions />);

    // Open modify dialog
    const modifyButton = screen.getByText(/storyActions.modify/i);
    fireEvent.click(modifyButton);

    // Enter feedback
    const textarea = screen.getByPlaceholderText(
      /storyActions.modifyPlaceholder/i
    );
    fireEvent.change(textarea, { target: { value: 'Some feedback' } });

    // Cancel
    const cancelButton = screen.getByText(/common.cancel/i);
    fireEvent.click(cancelButton);

    // Dialog should be closed
    expect(
      screen.queryByText(/storyActions.modifyTitle/i)
    ).not.toBeInTheDocument();
  });

  it('should disable confirm button in rewrite dialog when feedback is empty', () => {
    renderWithProviders(<StoryActions />);

    // Open rewrite dialog
    const rewriteButton = screen.getByText(/storyActions.rewrite/i);
    fireEvent.click(rewriteButton);

    // Confirm button should be disabled
    const confirmButton = screen.getByText(/storyActions.confirmRewrite/i);
    expect(confirmButton).toBeDisabled();
  });

  it('should disable confirm button in modify dialog when feedback is empty', () => {
    renderWithProviders(<StoryActions />);

    // Open modify dialog
    const modifyButton = screen.getByText(/storyActions.modify/i);
    fireEvent.click(modifyButton);

    // Confirm button should be disabled
    const confirmButton = screen.getByText(/storyActions.confirmModify/i);
    expect(confirmButton).toBeDisabled();
  });

  it('should not call handleRewriteSection when feedback is empty', () => {
    renderWithProviders(<StoryActions />);

    // Open rewrite dialog
    const rewriteButton = screen.getByText(/storyActions.rewrite/i);
    fireEvent.click(rewriteButton);

    // Try to confirm with empty feedback (button should be disabled, but test the logic)
    const confirmButton = screen.getByText(/storyActions.confirmRewrite/i);
    expect(confirmButton).toBeDisabled();

    expect(mockHandleRewriteSection).not.toHaveBeenCalled();
  });

  it('should not call handleModifySection when feedback is empty', () => {
    renderWithProviders(<StoryActions />);

    // Open modify dialog
    const modifyButton = screen.getByText(/storyActions.modify/i);
    fireEvent.click(modifyButton);

    // Try to confirm with empty feedback (button should be disabled, but test the logic)
    const confirmButton = screen.getByText(/storyActions.confirmModify/i);
    expect(confirmButton).toBeDisabled();

    expect(mockHandleModifySection).not.toHaveBeenCalled();
  });

  it('should not open settings dialog when activeConversationId is null', () => {
    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
    });

    renderWithProviders(<StoryActions />);

    const addSettingsButton = screen.getByText(/storyActions.addSettings/i);
    fireEvent.click(addSettingsButton);

    // Should not be called when activeConversationId is null
    expect(mockSettingsDialogOpen).not.toHaveBeenCalled();
  });
});
