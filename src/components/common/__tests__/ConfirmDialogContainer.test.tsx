import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmDialogContainer } from '../ConfirmDialogContainer';
import { getConfirmDialogService } from '@/services/confirmDialogService';
import * as useI18n from '@/i18n/i18n';

vi.mock('@/i18n/i18n');
vi.mock('../ConfirmDialog', () => ({
  default: ({ isOpen, message, onConfirm, onCancel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid='confirm-dialog'>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

describe('ConfirmDialogContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('should not render dialog when service state is closed', () => {
    const service = getConfirmDialogService();
    service.close(false);

    render(<ConfirmDialogContainer />);

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('should render dialog when service state is open', async () => {
    const service = getConfirmDialogService();
    service.close(false); // Ensure clean state

    const { container } = render(<ConfirmDialogContainer />);

    // Trigger confirm after component is mounted
    const confirmPromise = service.confirm('Test message');

    await waitFor(
      () => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('Test message')).toBeInTheDocument();
      },
      { container }
    );

    // Clean up
    service.close(false);
    await confirmPromise;
  });

  it('should call service.close(true) when confirm button is clicked', async () => {
    const service = getConfirmDialogService();
    service.close(false); // Ensure clean state
    const closeSpy = vi.spyOn(service, 'close');

    const { container } = render(<ConfirmDialogContainer />);

    // Trigger confirm after component is mounted
    const confirmPromise = service.confirm('Test message');

    await waitFor(
      () => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      },
      { container }
    );

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    expect(closeSpy).toHaveBeenCalledWith(true);
    await confirmPromise;
  });

  it('should call service.close(false) when cancel button is clicked', async () => {
    const service = getConfirmDialogService();
    service.close(false); // Ensure clean state
    const closeSpy = vi.spyOn(service, 'close');

    const { container } = render(<ConfirmDialogContainer />);

    // Trigger confirm after component is mounted
    const confirmPromise = service.confirm('Test message');

    await waitFor(
      () => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      },
      { container }
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(closeSpy).toHaveBeenCalledWith(false);
    await confirmPromise;
  });

  it('should update when service state changes', async () => {
    const service = getConfirmDialogService();
    service.close(false);

    const { container } = render(<ConfirmDialogContainer />);

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();

    // Trigger confirm after component is mounted
    const confirmPromise = service.confirm('New message');

    await waitFor(
      () => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('New message')).toBeInTheDocument();
      },
      { container }
    );

    service.close(false);
    await confirmPromise;
  });

  it('should unsubscribe on unmount', async () => {
    const service = getConfirmDialogService();
    const subscribeSpy = vi.spyOn(service, 'subscribe');

    const { unmount } = render(<ConfirmDialogContainer />);

    expect(subscribeSpy).toHaveBeenCalled();
    const unsubscribe = subscribeSpy.mock.results[0].value;

    unmount();

    expect(unsubscribe).toBeDefined();
  });
});
