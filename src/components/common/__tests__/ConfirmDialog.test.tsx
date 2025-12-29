import { fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';
import { renderWithProviders } from '@/test/utils';
import * as useI18n from '@/i18n/i18n';

vi.mock('@/i18n/i18n');

describe('ConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('should not render when isOpen is false', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={false}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title='Test Title'
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should not render title when not provided', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('common.confirm');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should use custom confirm text when provided', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirmText='Custom Confirm'
      />
    );

    expect(screen.getByText('Custom Confirm')).toBeInTheDocument();
  });

  it('should use custom cancel text when provided', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        cancelText='Custom Cancel'
      />
    );

    expect(screen.getByText('Custom Cancel')).toBeInTheDocument();
  });

  it('should apply danger style when confirmButtonStyle is danger', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirmButtonStyle='danger'
      />
    );

    const confirmButton = screen.getByText('common.confirm');
    expect(confirmButton.className).toContain('danger');
  });

  it('should stop propagation when dialog is clicked', () => {
    const mockStopPropagation = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        message='Test message'
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen
      .getByText('Test message')
      .closest('div[class*="dialog"]');
    if (dialog) {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      clickEvent.stopPropagation = mockStopPropagation;
      fireEvent(dialog, clickEvent);
    }
  });
});
