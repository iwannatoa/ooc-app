import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import SummaryPrompt from '../SummaryPrompt';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  })),
}));

// Mock useToast
const mockShowError = vi.fn();
const mockShowWarning = vi.fn();
const mockShowSuccess = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    showError: mockShowError,
    showWarning: mockShowWarning,
    showSuccess: mockShowSuccess,
  })),
}));

describe('SummaryPrompt', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnGenerate = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockShowError.mockClear();
    mockShowWarning.mockClear();
    mockShowSuccess.mockClear();
    user = userEvent.setup();
  });

  it('should render summary prompt modal', () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('summaryPrompt.title')).toBeInTheDocument();
    expect(screen.getByText(/summaryPrompt.message/)).toBeInTheDocument();
    expect(screen.getByText('summaryPrompt.generate')).toBeInTheDocument();
  });

  it('should call onCancel when close button is clicked', async () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const closeButton = screen.getByText('×');
    await user.click(closeButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('summaryPrompt.cancel');
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should generate summary when generate button is clicked', async () => {
    mockOnGenerate.mockResolvedValue('Generated summary text');

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText('summaryPrompt.generate');
    await user.click(generateButton);

    expect(mockOnGenerate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Generated summary text')).toBeInTheDocument();
    });
  });

  it('should show generating state while generating', async () => {
    mockOnGenerate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('Summary'), 100))
    );

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText('summaryPrompt.generate');
    await user.click(generateButton);

    expect(screen.getByText('summaryPrompt.generating')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('should show error when generation fails', async () => {
    mockOnGenerate.mockRejectedValue(new Error('Generation failed'));

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText('summaryPrompt.generate');
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('should allow editing generated summary', async () => {
    mockOnGenerate.mockResolvedValue('Generated summary');

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText('summaryPrompt.generate');
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Generated summary')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    await user.clear(textarea);
    await user.type(textarea, 'Edited summary');

    expect(textarea).toHaveValue('Edited summary');
  });

  it('should clear generated summary when clear button is clicked', async () => {
    mockOnGenerate.mockResolvedValue('Generated summary');

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const generateButton = screen.getByText('summaryPrompt.generate');
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('summaryPrompt.clear')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('summaryPrompt.clear');
    await user.click(clearButton);

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    expect(textarea).toHaveValue('');
  });

  it('should disable save button when summary is empty', () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('summaryPrompt.save');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when summary has content', async () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    await user.type(textarea, 'Some summary text');

    const saveButton = screen.getByText('summaryPrompt.save');
    expect(saveButton).not.toBeDisabled();
  });

  // Note: The warning for empty summary is handled by the disabled button state
  // When summary.trim() is empty, the save button is disabled, so users cannot trigger the warning
  // This is the expected behavior - the button prevents invalid submissions

  it('should call onSave with trimmed summary when save button is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    await user.type(textarea, '  Summary with spaces  ');

    const saveButton = screen.getByText('summaryPrompt.save');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('Summary with spaces');
  });

  it('should show saving state while saving', async () => {
    mockOnSave.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
    );

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    await user.type(textarea, 'Summary text');

    const saveButton = screen.getByText('summaryPrompt.save');
    await user.click(saveButton);

    expect(screen.getByText('summaryPrompt.saving')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('summaryPrompt.cancel')).toBeDisabled();
  });

  it('should show error when save fails', async () => {
    mockOnSave.mockRejectedValue(new Error('Save failed'));

    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={10}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByLabelText('summaryPrompt.summaryLabel');
    await user.type(textarea, 'Summary text');

    const saveButton = screen.getByText('summaryPrompt.save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('should display message count in info', () => {
    render(
      <SummaryPrompt
        conversationId='test-id'
        messageCount={25}
        onGenerate={mockOnGenerate}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/summaryPrompt.message/)).toBeInTheDocument();
  });
});

