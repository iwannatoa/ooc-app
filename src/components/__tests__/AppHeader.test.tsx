import * as useMockMode from '@/hooks/useMockMode';
import * as useI18n from '@/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '../AppHeader';

// Mock dependencies
vi.mock('@/i18n');
vi.mock('@/hooks/useMockMode');
vi.mock('../ServerStatus', () => ({
  default: () => <div data-testid='server-status'>Server Status</div>,
}));

describe('AppHeader', () => {
  const mockOnOpenSettings = vi.fn();
  const mockSetLocale = vi.fn();
  const mockToggleMockMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n.useI18n as any).mockReturnValue({
      locale: 'zh',
      setLocale: mockSetLocale,
      t: (key: string) => key,
    });

    (useMockMode.useMockMode as any).mockReturnValue({
      mockModeEnabled: false,
      toggleMockMode: mockToggleMockMode,
      isDev: true,
    });
  });

  it('should render header with title', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    expect(screen.getByText('app.title')).toBeInTheDocument();
  });

  it('should call onOpenSettings when settings button is clicked', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    const settingsButton = screen.getByText('common.settings');
    fireEvent.click(settingsButton);

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('should toggle locale when language button is clicked', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    const languageButton = screen.getByText('EN');
    fireEvent.click(languageButton);

    // With availableLocales, it cycles through all locales
    // If current is 'zh', next should be 'en' (assuming ['zh', 'en'] order)
    expect(mockSetLocale).toHaveBeenCalled();
  });

  it('should show mock mode button in dev mode', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    expect(screen.getByText('app.mockModeOff')).toBeInTheDocument();
  });

  it('should not show mock mode button in production mode', () => {
    (useMockMode.useMockMode as any).mockReturnValue({
      mockModeEnabled: false,
      toggleMockMode: mockToggleMockMode,
      isDev: false,
    });

    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    expect(screen.queryByText('app.mockModeOff')).not.toBeInTheDocument();
  });

  it('should toggle mock mode when mock button is clicked', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    const mockButton = screen.getByText('app.mockModeOff');
    fireEvent.click(mockButton);

    expect(mockToggleMockMode).toHaveBeenCalledTimes(1);
  });

  it('should render server status', () => {
    render(<AppHeader onOpenSettings={mockOnOpenSettings} />);

    expect(screen.getByTestId('server-status')).toBeInTheDocument();
  });
});
