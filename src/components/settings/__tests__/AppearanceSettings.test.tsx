import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AppearanceSettings,
  AppearanceSettingsRef,
} from '../AppearanceSettings';
import { AppearanceSettings as AppearanceSettingsType } from '@/types';
import { renderWithProviders } from '@/test/utils';
import { DEFAULT_SETTINGS } from '@/types/constants';
import React from 'react';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
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

describe('AppearanceSettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const defaultSettings: AppearanceSettingsType = {
    theme: 'dark',
    fontSize: 'medium',
    fontFamily: 'Arial',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render appearance settings section', () => {
    renderWithProviders(<AppearanceSettings settings={defaultSettings} />);
    expect(
      screen.getByText('settingsPanel.tabs.appearance')
    ).toBeInTheDocument();
  });

  it('should render theme selector', () => {
    const { container } = renderWithProviders(
      <AppearanceSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.theme',
      container
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('dark');
  });

  it('should have all theme options', () => {
    const { container } = renderWithProviders(
      <AppearanceSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.theme',
      container
    ) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map(
      (opt) => opt.value
    );
    expect(options).toEqual(['dark', 'light', 'auto']);
  });

  it('should update local state when theme changes', async () => {
    const ref = React.createRef<AppearanceSettingsRef>();
    const { container } = renderWithProviders(
      <AppearanceSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const select = getInputByLabel(
      'settingsPanel.theme',
      container
    ) as HTMLSelectElement;
    await user.selectOptions(select, 'light');
    expect(ref.current?.getCurrentSettings().theme).toBe('light');
  });

  it('should render font size selector', () => {
    const { container } = renderWithProviders(
      <AppearanceSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.fontSize',
      container
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('medium');
  });

  it('should have all font size options', () => {
    const { container } = renderWithProviders(
      <AppearanceSettings settings={defaultSettings} />
    );
    const select = getInputByLabel(
      'settingsPanel.fontSize',
      container
    ) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map(
      (opt) => opt.value
    );
    expect(options).toEqual(['small', 'medium', 'large']);
  });

  it('should update local state when font size changes', async () => {
    const ref = React.createRef<AppearanceSettingsRef>();
    const { container } = renderWithProviders(
      <AppearanceSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const select = getInputByLabel(
      'settingsPanel.fontSize',
      container
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select).toBeInTheDocument();
    await user.selectOptions(select, 'large');
    expect(ref.current?.getCurrentSettings().fontSize).toBe('large');
  });

  it('should render font family input', () => {
    const { container } = renderWithProviders(
      <AppearanceSettings settings={defaultSettings} />
    );
    const input = getInputByLabel(
      'settingsPanel.fontFamily',
      container
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Arial');
    expect(input).toHaveAttribute(
      'placeholder',
      'settingsPanel.fontFamilyPlaceholder'
    );
  });

  it('should update local state when font family changes', async () => {
    const ref = React.createRef<AppearanceSettingsRef>();
    const { container } = renderWithProviders(
      <AppearanceSettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const input = getInputByLabel(
      'settingsPanel.fontFamily',
      container
    ) as HTMLInputElement;
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'Helvetica');
    // Check that getCurrentSettings returns the updated value
    expect(ref.current?.getCurrentSettings().fontFamily).toBe('Helvetica');
  });

  it('should handle all settings changes together', async () => {
    const ref = React.createRef<AppearanceSettingsRef>();
    const { container } = renderWithProviders(
      <AppearanceSettings
        ref={ref}
        settings={defaultSettings}
      />
    );

    const themeSelect = getInputByLabel(
      'settingsPanel.theme',
      container
    ) as HTMLSelectElement;
    const fontSizeSelect = getInputByLabel(
      'settingsPanel.fontSize',
      container
    ) as HTMLSelectElement;
    const fontFamilyInput = getInputByLabel(
      'settingsPanel.fontFamily',
      container
    ) as HTMLInputElement;

    expect(themeSelect).not.toBeNull();
    expect(fontSizeSelect).not.toBeNull();
    expect(fontFamilyInput).not.toBeNull();

    await user.selectOptions(themeSelect, 'light');
    expect(ref.current?.getCurrentSettings().theme).toBe('light');

    await user.selectOptions(fontSizeSelect, 'small');
    expect(ref.current?.getCurrentSettings().fontSize).toBe('small');

    await user.click(fontFamilyInput);
    await user.clear(fontFamilyInput);
    await user.type(fontFamilyInput, 'Courier');
    const currentSettings = ref.current?.getCurrentSettings();
    expect(currentSettings?.fontFamily).toBe('Courier');
    expect(currentSettings?.theme).toBe('light');
    expect(currentSettings?.fontSize).toBe('small');
  });

  it('should use default values when settings are undefined', () => {
    renderWithProviders(<AppearanceSettings settings={undefined} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    expect(selects[0].value).toBe(DEFAULT_SETTINGS.appearance.theme);
    expect(selects[1].value).toBe(DEFAULT_SETTINGS.appearance.fontSize);
    expect(inputs[0].value).toBe(DEFAULT_SETTINGS.appearance.fontFamily);
  });

  it('should use default values when individual settings are undefined', () => {
    const partialSettings: Partial<AppearanceSettingsType> = {
      theme: 'light',
      // fontSize and fontFamily are undefined
    };
    renderWithProviders(<AppearanceSettings settings={partialSettings} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    expect(selects[1].value).toBe(DEFAULT_SETTINGS.appearance.fontSize);
    expect(inputs[0].value).toBe(DEFAULT_SETTINGS.appearance.fontFamily);
  });
});
