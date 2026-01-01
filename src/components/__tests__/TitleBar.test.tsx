import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitleBar } from '../TitleBar';
import * as useI18n from '@/i18n/i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createMockI18n } from '@/mock';

vi.mock('@/i18n/i18n');
vi.mock('@tauri-apps/api/window');

describe('TitleBar', () => {
  const mockMinimize = vi.fn();
  const mockToggleMaximize = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useI18n.useI18n).mockReturnValue(
      createMockI18n({
        t: (key: string) => key,
      })
    );

    vi.mocked(getCurrentWindow).mockReturnValue({
      minimize: mockMinimize,
      toggleMaximize: mockToggleMaximize,
      close: mockClose,
    });
  });

  it('should render title bar', () => {
    render(<TitleBar />);
    expect(screen.getByText('OOC story')).toBeInTheDocument();
  });

  it('should be able to minimize window', async () => {
    render(<TitleBar />);
    const minimizeButton = screen.getByTitle('titleBar.minimize');
    fireEvent.click(minimizeButton);
    expect(mockMinimize).toHaveBeenCalled();
  });

  it('should be able to maximize window', async () => {
    render(<TitleBar />);
    const maximizeButton = screen.getByTitle('titleBar.maximize');
    fireEvent.click(maximizeButton);
    expect(mockToggleMaximize).toHaveBeenCalled();
  });

  it('should be able to close window', async () => {
    render(<TitleBar />);
    const closeButton = screen.getByTitle('titleBar.close');
    fireEvent.click(closeButton);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle minimize error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMinimize.mockRejectedValue(new Error('Minimize failed'));

    render(<TitleBar />);
    const minimizeButton = screen.getByTitle('titleBar.minimize');
    fireEvent.click(minimizeButton);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to minimize window:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should handle maximize error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockToggleMaximize.mockRejectedValue(new Error('Maximize failed'));

    render(<TitleBar />);
    const maximizeButton = screen.getByTitle('titleBar.maximize');
    fireEvent.click(maximizeButton);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to maximize window:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should handle close error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockClose.mockRejectedValue(new Error('Close failed'));

    render(<TitleBar />);
    const closeButton = screen.getByTitle('titleBar.close');
    fireEvent.click(closeButton);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to close window:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});
