import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { GeneralSettings, GeneralSettingsRef } from '../GeneralSettings';
import { renderWithProviders } from '@/test/utils';
import { DEFAULT_SETTINGS } from '@/types/constants';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
  availableLocales: ['en', 'zh'],
}));

// Helper function to find input/select by label text
const getInputByLabel = (labelText: string, container: HTMLElement) => {
  // Find the label within the container
  const labels = Array.from(container.querySelectorAll('label'));
  const label = labels.find((l) => l.textContent === labelText);
  if (!label) return null;

  // Find the parent div that contains both label and input/select
  const settingItem =
    label.closest('[class*="settingItem"]') || label.parentElement;
  if (!settingItem) return null;

  // Find input or select that is a sibling of the label
  const input = settingItem.querySelector('input, select');
  return input as HTMLInputElement | HTMLSelectElement | null;
};

describe('GeneralSettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const defaultSettings = {
    language: 'en',
    autoStart: false,
    minimizeToTray: false,
    startWithSystem: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render general settings section', () => {
    renderWithProviders(<GeneralSettings settings={defaultSettings} />);
    expect(screen.getByText('settingsPanel.tabs.general')).toBeInTheDocument();
  });

  it('should render language selector', () => {
    const { container } = renderWithProviders(
      <GeneralSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.language',
      container
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('en');
  });

  it('should have all available locales as options', () => {
    const { container } = renderWithProviders(
      <GeneralSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.language',
      container
    ) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map(
      (opt) => opt.value
    );
    expect(options).toEqual(['en', 'zh']);
  });

  it('should update local state when language changes', async () => {
    const ref = React.createRef<GeneralSettingsRef>();
    const { container } = renderWithProviders(
      <GeneralSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const select = getInputByLabel(
      'settingsPanel.language',
      container
    ) as HTMLSelectElement;
    await user.selectOptions(select, 'zh');
    expect(ref.current?.getCurrentSettings().language).toBe('zh');
  });

  it('should display language names using translation keys', () => {
    const { container } = renderWithProviders(
      <GeneralSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.language',
      container
    ) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option'));
    expect(options[0].textContent).toBe('language.en');
    expect(options[1].textContent).toBe('language.zh');
  });

  it('should use default values when settings are undefined', () => {
    renderWithProviders(<GeneralSettings settings={undefined} />);
    const languageSelect = screen.getByRole('combobox') as HTMLSelectElement;

    expect(languageSelect.value).toBe(DEFAULT_SETTINGS.general.language);
  });

  it('should use default values when individual settings are undefined', () => {
    const partialSettings = {
      language: 'zh',
      // autoStart, minimizeToTray, startWithSystem are undefined
    };
    renderWithProviders(<GeneralSettings settings={partialSettings} />);
    const languageSelect = screen.getByRole('combobox') as HTMLSelectElement;

    expect(languageSelect.value).toBe('zh');
  });
});
