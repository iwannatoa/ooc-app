import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AISettings, AISettingsRef } from '../AISettings';
import { AppSettings } from '@/types';
import { renderWithProviders } from '@/test/utils';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
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

describe('AISettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const defaultSettings: AppSettings['ai'] = {
    provider: 'ollama',
    ollama: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      timeout: 60,
      maxTokens: 2000,
      temperature: 0.7,
    },
    deepseek: {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: '',
      timeout: 60,
      maxTokens: 2000,
      temperature: 0.7,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render AI settings section', () => {
    renderWithProviders(<AISettings settings={defaultSettings} />);
    expect(screen.getByText('settingsPanel.tabs.ai')).toBeInTheDocument();
  });

  it('should render provider selector', () => {
    renderWithProviders(<AISettings settings={defaultSettings} />);
    const label = screen.getByText('settingsPanel.provider');
    const settingItem = label.closest('div');
    const select = settingItem?.querySelector('select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('ollama');
  });

  it('should update local state when provider changes', async () => {
    const ref = React.createRef<AISettingsRef>();
    renderWithProviders(
      <AISettings
        ref={ref}
        settings={defaultSettings}
      />
    );
    const label = screen.getByText('settingsPanel.provider');
    const settingItem = label.closest('div');
    const select = settingItem?.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(select, 'deepseek');
    expect(ref.current?.getCurrentSettings().provider).toBe('deepseek');
  });

  describe('Ollama configuration', () => {
    it('should render Ollama config when provider is ollama', () => {
      renderWithProviders(<AISettings settings={defaultSettings} />);
      expect(
        screen.getByText('OLLAMA settingsPanel.config')
      ).toBeInTheDocument();
      expect(
        screen.getByText('settingsPanel.ollamaAddress')
      ).toBeInTheDocument();
      expect(screen.getByText('settingsPanel.model')).toBeInTheDocument();
    });

    it('should not render API key field for Ollama', () => {
      renderWithProviders(<AISettings settings={defaultSettings} />);
      const apiKeyInputs = screen.queryAllByPlaceholderText(/apiKey/i);
      expect(apiKeyInputs.length).toBe(0);
    });

    it('should update local state when Ollama baseUrl changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={defaultSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.ollamaAddress'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'http://new-url:11434');
      expect(ref.current?.getCurrentSettings().ollama.baseUrl).toBe(
        'http://new-url:11434'
      );
    });

    it('should update local state when Ollama model changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={defaultSettings}
        />
      );
      const input = getInputByLabel('settingsPanel.model') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'llama3');
      expect(ref.current?.getCurrentSettings().ollama.model).toBe('llama3');
    });

    it('should update local state when Ollama timeout changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={defaultSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.timeout'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '120');
      expect(ref.current?.getCurrentSettings().ollama.timeout).toBe(120);
    });

    it('should update local state when Ollama maxTokens changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={defaultSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.maxTokens'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '4000');
      expect(ref.current?.getCurrentSettings().ollama.maxTokens).toBe(4000);
    });

    it('should update local state when Ollama temperature changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={defaultSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.temperature'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '0.9');
      expect(ref.current?.getCurrentSettings().ollama.temperature).toBe(0.9);
    });
  });

  describe('DeepSeek configuration', () => {
    const deepseekSettings: AppSettings['ai'] = {
      ...defaultSettings,
      provider: 'deepseek',
    };

    it('should render DeepSeek config when provider is deepseek', () => {
      renderWithProviders(<AISettings settings={deepseekSettings} />);
      expect(
        screen.getByText('DEEPSEEK settingsPanel.config')
      ).toBeInTheDocument();
      expect(screen.getByText('settingsPanel.apiUrl')).toBeInTheDocument();
      expect(screen.getByText('settingsPanel.model')).toBeInTheDocument();
    });

    it('should render API key field for DeepSeek', () => {
      renderWithProviders(<AISettings settings={deepseekSettings} />);
      const apiKeyInput = screen.getByPlaceholderText(
        'settingsPanel.apiKeyPlaceholder {"provider":"settingsPanel.providerDeepSeek"}'
      );
      expect(apiKeyInput).toBeInTheDocument();
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });

    it('should update local state when DeepSeek API key changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const apiKeyInput = screen.getByPlaceholderText(
        'settingsPanel.apiKeyPlaceholder {"provider":"settingsPanel.providerDeepSeek"}'
      );
      await user.click(apiKeyInput);
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'test-api-key');
      expect(ref.current?.getCurrentSettings().deepseek.apiKey).toBe(
        'test-api-key'
      );
    });

    it('should update local state when DeepSeek baseUrl changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const input = getInputByLabel('settingsPanel.apiUrl') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'https://new-api.com');
      expect(ref.current?.getCurrentSettings().deepseek.baseUrl).toBe(
        'https://new-api.com'
      );
    });

    it('should update local state when DeepSeek model changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const input = getInputByLabel('settingsPanel.model') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'deepseek-coder');
      expect(ref.current?.getCurrentSettings().deepseek.model).toBe(
        'deepseek-coder'
      );
    });

    it('should update local state when DeepSeek timeout changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.timeout'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '120');
      expect(ref.current?.getCurrentSettings().deepseek.timeout).toBe(120);
    });

    it('should update local state when DeepSeek maxTokens changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.maxTokens'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '4000');
      expect(ref.current?.getCurrentSettings().deepseek.maxTokens).toBe(4000);
    });

    it('should update local state when DeepSeek temperature changes', async () => {
      const ref = React.createRef<AISettingsRef>();
      renderWithProviders(
        <AISettings
          ref={ref}
          settings={deepseekSettings}
        />
      );
      const input = getInputByLabel(
        'settingsPanel.temperature'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input).toBeInTheDocument();
      await user.click(input);
      await user.clear(input);
      await user.type(input, '0.9');
      expect(ref.current?.getCurrentSettings().deepseek.temperature).toBe(0.9);
    });
  });

  it('should display default values when config values are missing', () => {
    // Create settings with missing values to test default handling
    const settingsWithMissingValues = {
      ...defaultSettings,
      ollama: {
        ...defaultSettings.ollama,
        timeout: undefined,
        maxTokens: undefined,
        temperature: undefined,
        // Omit properties to test default value handling
      },
    } as unknown as AppSettings['ai'];
    renderWithProviders(<AISettings settings={settingsWithMissingValues} />);
    const timeoutInput = getInputByLabel(
      'settingsPanel.timeout'
    ) as HTMLInputElement;
    const maxTokensInput = getInputByLabel(
      'settingsPanel.maxTokens'
    ) as HTMLInputElement;
    const temperatureInput = getInputByLabel(
      'settingsPanel.temperature'
    ) as HTMLInputElement;
    // Use DEFAULT_SETTINGS values when undefined values are filtered out
    expect(timeoutInput).toHaveValue(120000);
    expect(maxTokensInput).toHaveValue(2048);
    expect(temperatureInput).toHaveValue(0.7);
  });

  it('should not show apiKey field when provider is ollama', () => {
    renderWithProviders(<AISettings settings={defaultSettings} />);
    expect(
      screen.queryByPlaceholderText(/apiKeyPlaceholder/)
    ).not.toBeInTheDocument();
  });
});
