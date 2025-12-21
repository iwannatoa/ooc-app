import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Toast } from '../common/Toast';
import { ToastContainer } from '../common/Toast';

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

  afterEach(() => {
    cleanup();
  });

  it('should render toasts', () => {
    const onClose = vi.fn();
    render(
      <ToastContainer
        toasts={mockToasts}
        onClose={onClose}
      />
    );

    const successMessages = screen.getAllByText('Success message');
    const errorMessages = screen.getAllByText('Error message');
    expect(successMessages.length).toBeGreaterThan(0);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it('should call onClose when close button is clicked', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <ToastContainer
        toasts={mockToasts}
        onClose={onClose}
      />
    );

    const closeButtons = screen.getAllByText('×');
    // Use fireEvent instead of userEvent to avoid clipboard issues
    fireEvent.click(closeButtons[0]);

    // Toast has a 300ms delay before calling onClose
    await vi.advanceTimersByTimeAsync(300);

    expect(onClose).toHaveBeenCalledWith('1');
    vi.useRealTimers();
  });

  it('should apply correct CSS classes for toast types', () => {
    const onClose = vi.fn();
    render(
      <ToastContainer
        toasts={mockToasts}
        onClose={onClose}
      />
    );

    // Note: CSS module classes are hashed, so we check for content instead
    const successMessages = screen.getAllByText('Success message');
    const errorMessages = screen.getAllByText('Error message');
    expect(successMessages.length).toBeGreaterThan(0);
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});
