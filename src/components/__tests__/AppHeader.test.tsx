import * as useMockMode from '@/hooks/useMockMode';
import * as useI18n from '@/i18n/i18n';
import { createMockI18n, createMockMockMode } from '@/mock';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '../AppHeader';
import { renderWithProviders } from '@/test/utils';

// Mock dependencies
vi.mock('@/i18n/i18n');
vi.mock('@/hooks/useMockMode');
const mockOpen = vi.fn();
vi.mock('@/hooks/useDialog', () => ({
  useSettingsPanelDialog: () => ({
    open: mockOpen,
  }),
}));
vi.mock('../ServerStatus', () => ({
  default: () => <div data-testid='server-status'>Server Status</div>,
}));

describe('AppHeader', () => {
  const mockOnOpenSettings = vi.fn();
  const mockSetLocale = vi.fn();
  const mockToggleMockMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useI18n.useI18n).mockReturnValue(
      createMockI18n({
        locale: 'zh',
        setLocale: mockSetLocale,
        t: (key: string) => key,
      })
    );

    vi.mocked(useMockMode.useMockMode).mockReturnValue(
      createMockMockMode({
        mockModeEnabled: false,
        toggleMockMode: mockToggleMockMode,
        isDev: true,
      })
    );
  });

  it('should render header with title', () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByText('app.title')).toBeInTheDocument();
  });

  it('should open settings dialog when settings button is clicked', () => {
    renderWithProviders(<AppHeader />);

    const settingsButton = screen.getByText('common.settings');
    fireEvent.click(settingsButton);

    // Settings dialog should be opened via hook
    // mockOpen is already defined at the top level
    expect(mockOpen).toHaveBeenCalled();
  });

  it('should toggle locale when language button is clicked', () => {
    renderWithProviders(<AppHeader />);

    const languageButton = screen.getByText('EN');
    fireEvent.click(languageButton);

    // With availableLocales, it cycles through all locales
    // If current is 'zh', next should be 'en' (assuming ['zh', 'en'] order)
    expect(mockSetLocale).toHaveBeenCalled();
  });

  it('should show mock mode button in dev mode', () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByText('app.mockModeOff')).toBeInTheDocument();
  });

  it('should not show mock mode button in production mode', () => {
    vi.mocked(useMockMode.useMockMode).mockReturnValue(
      createMockMockMode({
        mockModeEnabled: false,
        toggleMockMode: mockToggleMockMode,
        isDev: false,
      })
    );

    renderWithProviders(<AppHeader />);

    expect(screen.queryByText('app.mockModeOff')).not.toBeInTheDocument();
  });

  it('should toggle mock mode when mock button is clicked', () => {
    renderWithProviders(<AppHeader />);

    const mockButton = screen.getByText('app.mockModeOff');
    fireEvent.click(mockButton);

    expect(mockToggleMockMode).toHaveBeenCalledTimes(1);
  });

  it('should render server status', () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByTestId('server-status')).toBeInTheDocument();
  });

  it('should show mock mode on tooltip when mock mode is enabled', () => {
    vi.mocked(useMockMode.useMockMode).mockReturnValue(
      createMockMockMode({
        mockModeEnabled: true,
        toggleMockMode: mockToggleMockMode,
        isDev: true,
      })
    );

    renderWithProviders(<AppHeader />);

    const mockButton = screen.getByTitle('app.mockModeTooltipOn');
    expect(mockButton).toBeInTheDocument();
    expect(screen.getByText('app.mockModeOn')).toBeInTheDocument();
  });
});
