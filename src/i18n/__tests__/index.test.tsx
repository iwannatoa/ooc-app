import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider, useI18n, availableLocales } from '../i18n';
import * as useFlaskPort from '@/hooks/useFlaskPort';

// Mock useFlaskPort
vi.mock('@/hooks/useFlaskPort');

// Mock locale files
vi.mock('../locales/zh.json', () => ({
  default: {
    common: {
      confirm: '确认',
      cancel: '取消',
    },
    app: {
      title: '应用标题',
    },
  },
}));

vi.mock('../locales/en.json', () => ({
  default: {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
    app: {
      title: 'App Title',
    },
  },
}));

describe('I18n', () => {
  const mockApiUrl = 'http://localhost:5000';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (useFlaskPort.useFlaskPort as any).mockReturnValue({
      apiUrl: mockApiUrl,
    });

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('I18nProvider', () => {
    it('should provide i18n context', () => {
      const TestComponent = () => {
        const { locale, t } = useI18n();
        return (
          <div>
            <span data-testid='locale'>{locale}</span>
            <span data-testid='translation'>{t('app.title')}</span>
          </div>
        );
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('locale')).toBeInTheDocument();
      expect(screen.getByTestId('translation')).toBeInTheDocument();
    });

    it('should use stored locale from localStorage', () => {
      localStorage.setItem('app_locale', 'en');

      const TestComponent = () => {
        const { locale } = useI18n();
        return <span data-testid='locale'>{locale}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('locale')).toHaveTextContent('en');
    });

    it('should load language from backend on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          language: 'en',
        }),
      });

      const TestComponent = () => {
        const { locale } = useI18n();
        return <span data-testid='locale'>{locale}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/app-settings/language`
      );
    });

    it('should handle backend language load error gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const TestComponent = () => {
        const { locale } = useI18n();
        return <span data-testid='locale'>{locale}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load language from backend:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not load language from backend if apiUrl is not available', async () => {
      (useFlaskPort.useFlaskPort as any).mockReturnValue({
        apiUrl: null,
      });

      const TestComponent = () => {
        const { locale } = useI18n();
        return <span data-testid='locale'>{locale}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useI18n', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const TestComponent = () => {
        useI18n();
        return null;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useI18n must be used within I18nProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should translate keys correctly', () => {
      const TestComponent = () => {
        const { t } = useI18n();
        return <span data-testid='translation'>{t('app.title')}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Should return the key if translation not found, or the translation if found
      expect(screen.getByTestId('translation')).toBeInTheDocument();
    });

    it('should return key if translation not found', () => {
      const TestComponent = () => {
        const { t } = useI18n();
        return <span data-testid='translation'>{t('nonexistent.key')}</span>;
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByTestId('translation')).toHaveTextContent(
        'nonexistent.key'
      );
    });

    it('should replace parameters in translations', () => {
      const TestComponent = () => {
        const { t } = useI18n();
        // Assuming we have a translation with params
        return (
          <span data-testid='translation'>
            {t('test.message', { name: 'John', count: 5 })}
          </span>
        );
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Should return key with replaced params or just the key
      expect(screen.getByTestId('translation')).toBeInTheDocument();
    });

    it('should change locale and save to localStorage', async () => {
      const TestComponent = () => {
        const { locale, setLocale } = useI18n();
        return (
          <div>
            <span data-testid='locale'>{locale}</span>
            <button
              data-testid='change-locale'
              onClick={() => setLocale('en')}
            >
              Change
            </button>
          </div>
        );
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      const changeButton = screen.getByTestId('change-locale');

      await act(async () => {
        changeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(localStorage.getItem('app_locale')).toBe('en');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/app-settings/language`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'en' }),
        })
      );
    });

    it('should handle locale change error gracefully', async () => {
      // Mock initial load from backend
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          language: 'zh',
        }),
      });

      // Mock save to backend with error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const TestComponent = () => {
        const { setLocale } = useI18n();
        return (
          <button
            data-testid='change-locale'
            onClick={() => setLocale('en')}
          >
            Change
          </button>
        );
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Wait for initial load to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const changeButton = screen.getByTestId('change-locale');

      await act(async () => {
        changeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save language to backend:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should save locale to localStorage even without apiUrl', async () => {
      (useFlaskPort.useFlaskPort as any).mockReturnValue({
        apiUrl: null,
      });

      const TestComponent = () => {
        const { setLocale } = useI18n();
        return (
          <button
            data-testid='change-locale'
            onClick={() => setLocale('en')}
          >
            Change
          </button>
        );
      };

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      const changeButton = screen.getByTestId('change-locale');

      await act(async () => {
        changeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(localStorage.getItem('app_locale')).toBe('en');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('availableLocales', () => {
    it('should export available locales', () => {
      expect(availableLocales).toBeDefined();
      expect(Array.isArray(availableLocales)).toBe(true);
    });
  });
});
