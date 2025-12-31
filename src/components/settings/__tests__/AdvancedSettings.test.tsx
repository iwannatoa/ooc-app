import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AdvancedSettings, AdvancedSettingsRef } from '../AdvancedSettings';
import { renderWithProviders } from '@/test/utils';
import { DEFAULT_SETTINGS } from '@/types/constants';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

// Helper function to find input/select by label text
const getInputByLabel = (labelText: string) => {
  const label = screen.getByText(labelText);
  // Find the parent div that contains both label and input/select
  const settingItem =
    label.closest('[class*="settingItem"]') || label.parentElement;
  if (!settingItem) return null;

  // Find input or select that is a sibling of the label
  const input = settingItem.querySelector('input, select');
  return input as HTMLInputElement | HTMLSelectElement | null;
};

describe('AdvancedSettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const defaultSettings = {
    enableStreaming: true,
    apiTimeout: 30000,
    maxRetries: 3,
    logLevel: 'info' as const,
    enableDiagnostics: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render advanced settings section', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    expect(screen.getByText('settingsPanel.tabs.advanced')).toBeInTheDocument();
  });

  it('should render enable streaming checkbox', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const checkbox = screen.getByLabelText('settingsPanel.enableStreaming');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('should update local state when enableStreaming checkbox is toggled', async () => {
    const ref = React.createRef<AdvancedSettingsRef>();
    renderWithProviders(
      <AdvancedSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const checkbox = screen.getByLabelText('settingsPanel.enableStreaming');
    await user.click(checkbox);
    expect(ref.current?.getCurrentSettings().enableStreaming).toBe(false);
  });

  it('should render API timeout input', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const input = getInputByLabel(
      'settingsPanel.apiTimeout'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(30000);
  });

  it('should update local state when apiTimeout changes', async () => {
    const ref = React.createRef<AdvancedSettingsRef>();
    renderWithProviders(
      <AdvancedSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const input = getInputByLabel(
      'settingsPanel.apiTimeout'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input).toBeInTheDocument();
    await user.click(input);
    await user.clear(input);
    await user.type(input, '60000');
    expect(ref.current?.getCurrentSettings().apiTimeout).toBe(60000);
  });

  it('should render max retries input', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const input = getInputByLabel(
      'settingsPanel.maxRetries'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(3);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
  });

  it('should update local state when maxRetries changes', async () => {
    const ref = React.createRef<AdvancedSettingsRef>();
    renderWithProviders(
      <AdvancedSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const input = getInputByLabel(
      'settingsPanel.maxRetries'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input).toBeInTheDocument();
    await user.click(input);
    await user.clear(input);
    await user.type(input, '5');
    expect(ref.current?.getCurrentSettings().maxRetries).toBe(5);
  });

  it('should render log level selector', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const select = getInputByLabel(
      'settingsPanel.logLevel'
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('info');
  });

  it('should have all log level options', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const select = getInputByLabel(
      'settingsPanel.logLevel'
    ) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map(
      (opt) => opt.value
    );
    expect(options).toEqual(['error', 'warn', 'info', 'debug']);
  });

  it('should update local state when logLevel changes', async () => {
    const ref = React.createRef<AdvancedSettingsRef>();
    renderWithProviders(
      <AdvancedSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const select = getInputByLabel(
      'settingsPanel.logLevel'
    ) as HTMLSelectElement;
    await user.selectOptions(select, 'debug');
    expect(ref.current?.getCurrentSettings().logLevel).toBe('debug');
  });

  it('should render enable diagnostics checkbox', () => {
    renderWithProviders(<AdvancedSettings settings={defaultSettings} />);
    const checkbox = screen.getByLabelText('settingsPanel.enableDiagnostics');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('should update local state when enableDiagnostics checkbox is toggled', async () => {
    const ref = React.createRef<AdvancedSettingsRef>();
    renderWithProviders(
      <AdvancedSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const checkbox = screen.getByLabelText('settingsPanel.enableDiagnostics');
    await user.click(checkbox);
    expect(ref.current?.getCurrentSettings().enableDiagnostics).toBe(true);
  });

  it('should use default value for enableDiagnostics when undefined', () => {
    const settingsWithUndefined = {
      ...defaultSettings,
      enableDiagnostics: undefined as any,
    };
    renderWithProviders(<AdvancedSettings settings={settingsWithUndefined} />);
    const checkbox = screen.getByLabelText(
      'settingsPanel.enableDiagnostics'
    ) as HTMLInputElement;
    // Should use DEFAULT_SETTINGS.advanced.enableDiagnostics
    expect(checkbox.checked).toBe(DEFAULT_SETTINGS.advanced.enableDiagnostics);
  });
});
