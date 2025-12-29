import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitleBar } from '../TitleBar';
import * as useI18n from '@/i18n/i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';

vi.mock('@/i18n/i18n');
vi.mock('@tauri-apps/api/window');

describe('TitleBar', () => {
  const mockMinimize = vi.fn();
  const mockToggleMaximize = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });

    (getCurrentWindow as any).mockReturnValue({
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
});
