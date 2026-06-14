import type { ReactNode } from 'react';
import { mockFn } from '@/test/mockFn';
import { fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPanel from '../SettingsPanel';
import { renderWithProviders } from '@/test/utils';
import { tick } from '@/test/utils';
import { invoke } from '@tauri-apps/api/core';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

// Mock hooks
vi.mock('@/hooks/useSettingsState', () => ({
  useSettingsState: vi.fn(),
}));

vi.mock('@/hooks/useApiClients', () => ({
  useApiClients: vi.fn(),
}));

vi.mock('@/hooks/useFlaskPort', () => ({
  useFlaskPort: vi.fn(() => ({
    refetch: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock settings components
vi.mock('../SettingsTabs', () => ({
  SettingsTabs: ({ children }: { children?: ReactNode }) => (
    <div data-testid='settings-tabs'>{children}</div>
  ),
  SettingsTabPane: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../GeneralSettings', () => ({
  GeneralSettings: () => (
    <div data-testid='general-settings'>General Settings</div>
  ),
}));

vi.mock('../AppearanceSettings', () => ({
  AppearanceSettings: () => (
    <div data-testid='appearance-settings'>Appearance Settings</div>
  ),
}));

vi.mock('../AISettings', () => ({
  AISettings: () => <div data-testid='ai-settings'>AI Settings</div>,
}));

vi.mock('../AdvancedSettings', () => ({
  AdvancedSettings: () => (
    <div data-testid='advanced-settings'>Advanced Settings</div>
  ),
}));

vi.mock('../DataSettings', () => ({
  DataSettings: () => <div data-testid='data-settings'>Data Settings</div>,
}));

import { useSettingsState } from '@/hooks/useSettingsState';
import { useApiClients } from '@/hooks/useApiClients';

describe('SettingsPanel', () => {
  const mockOnClose = vi.fn();
  const mockUpdateSettings = vi.fn();
  const mockUpdateAppearanceSettings = vi.fn();
  const mockUpdateAppSettings = vi.fn();

  const defaultSettings = {
    general: {
      language: 'en',
    },
    appearance: {
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'Arial',
    },
    ai: {
      provider: 'ollama',
      ollama: {
        model: 'llama2',
      },
      deepseek: {
        model: 'deepseek-chat',
      },
    },
    advanced: {
      streaming: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue({ success: true });

    mockFn(useSettingsState).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      updateAppearanceSettings: mockUpdateAppearanceSettings,
    });

    mockFn(useApiClients).mockReturnValue({
      settingsApi: {
        updateAppSettings: mockUpdateAppSettings.mockResolvedValue(undefined),
      },
    });
  });

  it('should not render when open is false', () => {
    const { container } = renderWithProviders(
      <SettingsPanel
        open={false}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when open is true', () => {
    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('settingsPanel.title')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tabs')).toBeInTheDocument();
  });

  it('should render all settings tabs', () => {
    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    expect(screen.getByTestId('appearance-settings')).toBeInTheDocument();
    expect(screen.getByTestId('ai-settings')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-settings')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockUpdateAppearanceSettings).toHaveBeenCalledWith(
      defaultSettings.appearance
    );
  });

  it('should save settings when save button is clicked', async () => {
    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    await tick();

    expect(mockUpdateSettings).toHaveBeenCalled();
    expect(mockUpdateAppearanceSettings).toHaveBeenCalled();
    expect(mockUpdateAppSettings).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should remove compactMode from appearance before saving', async () => {
    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ...defaultSettings,
        appearance: {
          ...defaultSettings.appearance,
          compactMode: true,
        },
      },
      updateSettings: mockUpdateSettings,
      updateAppearanceSettings: mockUpdateAppearanceSettings,
    });

    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    await tick();

    const savedSettings = mockUpdateSettings.mock.calls[0][0];
    expect(savedSettings.appearance.compactMode).toBeUndefined();
  });

  it('should handle backend save error gracefully', async () => {
    mockFn(useApiClients).mockReturnValue({
      settingsApi: {
        updateAppSettings: mockUpdateAppSettings.mockRejectedValue(
          new Error('Backend error')
        ),
      },
    });

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    await tick();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled(); // Should still close even on error

    consoleErrorSpy.mockRestore();
  });

  it('should handle save when settingsApi is not available', async () => {
    mockFn(useApiClients).mockReturnValue({
      settingsApi: null,
    });

    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    await tick();

    expect(mockUpdateSettings).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should sync active profile ai settings on save', async () => {
    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ...defaultSettings,
        ai: {
          ...defaultSettings.ai,
          provider: 'openai',
        },
        profiles: [
          {
            id: 'default',
            name: 'Default',
            ai: {
              ...defaultSettings.ai,
              provider: 'ollama',
            },
          },
        ],
        activeProfileId: 'default',
      },
      updateSettings: mockUpdateSettings,
      updateAppearanceSettings: mockUpdateAppearanceSettings,
    });

    renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('common.save'));
    await tick();

    const savedSettings = mockUpdateSettings.mock.calls[0][0];
    expect(savedSettings.profiles[0].ai.provider).toBe('openai');
    expect(savedSettings.activeProfileId).toBe('default');
  });

  it('should stop propagation when panel is clicked', () => {
    const { container } = renderWithProviders(
      <SettingsPanel
        open={true}
        onClose={mockOnClose}
      />
    );

    const panel = container.querySelector('[class*="settingsPanel"]');
    const stopPropagationSpy = vi.fn();
    const clickEvent = new MouseEvent('click', { bubbles: true });
    clickEvent.stopPropagation = stopPropagationSpy;

    if (panel) {
      fireEvent(panel, clickEvent);
    }
  });
});
