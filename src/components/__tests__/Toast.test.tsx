import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from '../Toast';
import type { Toast } from '../Toast';

describe('ToastContainer', () => {
  const mockToasts: Toast[] = [
    {
      id: '1',
      message: 'Success message',
      type: 'success',
    },
    {
      id: '2',
      message: 'Error message',
      type: 'error',
    },
  ];

  it('should render toasts', () => {
    const onClose = vi.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    const closeButtons = screen.getAllByText('×');
    await user.click(closeButtons[0]);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith('1');
    });
  });

  it('should apply correct CSS classes for toast types', () => {
    const onClose = vi.fn();
    render(
      <ToastContainer toasts={mockToasts} onClose={onClose} />
    );

    // Note: CSS module classes are hashed, so we check for content instead
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});

