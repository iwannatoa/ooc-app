import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThinkContent from '../ThinkContent';
import zhLocale from '@/i18n/locales/zh.json';
import enLocale from '@/i18n/locales/en.json';

// Mock useFlaskPort
vi.mock('@/hooks/useFlaskPort', () => ({
  useFlaskPort: () => ({
    apiUrl: null,
    flaskPort: null,
    waitForPort: vi.fn(),
  }),
}));

// Mock useI18n hook
let mockLocale = 'zh';
vi.mock('@/i18n', async () => {
  return {
    useI18n: () => {
      const translations = mockLocale === 'zh' ? zhLocale : enLocale;
      const getNestedValue = (obj: any, path: string): string => {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            return path;
          }
        }
        return typeof value === 'string' ? value : path;
      };
      return {
        locale: mockLocale,
        setLocale: vi.fn((newLocale: string) => { mockLocale = newLocale; }),
        t: (key: string) => getNestedValue(translations, key),
      };
    },
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const renderWithI18n = (component: React.ReactElement, locale: 'zh' | 'en' = 'zh') => {
  mockLocale = locale;
  return render(component);
};

describe('ThinkContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when content is empty', () => {
    const { container } = renderWithI18n(<ThinkContent content="" isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render think content with closed state', () => {
    renderWithI18n(<ThinkContent content="thinking content" isOpen={false} />);
    
    expect(screen.getByText(zhLocale.messages.thinkProcess)).toBeInTheDocument();
    expect(screen.queryByText('thinking content')).not.toBeInTheDocument();
  });

  it('should render think content with open state', () => {
    renderWithI18n(<ThinkContent content="thinking content" isOpen={true} />);
    
    expect(screen.getByText(zhLocale.messages.thinkingInProgress)).toBeInTheDocument();
    expect(screen.getByText('thinking content')).toBeInTheDocument();
  });

  it('should toggle collapse state when header is clicked', () => {
    renderWithI18n(<ThinkContent content="thinking content" isOpen={false} />);
    
    const header = screen.getByText(zhLocale.messages.thinkProcess).closest('div');
    expect(header).toBeInTheDocument();
    
    // Initially collapsed, content should not be visible
    expect(screen.queryByText('thinking content')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(header!);
    expect(screen.getByText('thinking content')).toBeInTheDocument();
    
    // Click to collapse again
    fireEvent.click(header!);
    expect(screen.queryByText('thinking content')).not.toBeInTheDocument();
  });

  it('should automatically expand when isOpen is true', () => {
    renderWithI18n(<ThinkContent content="thinking content" isOpen={true} />);
    
    expect(screen.getByText('thinking content')).toBeInTheDocument();
  });

  it('should automatically collapse when isOpen changes from true to false', () => {
    const { rerender } = renderWithI18n(
      <ThinkContent content="thinking content" isOpen={true} />
    );
    
    expect(screen.getByText('thinking content')).toBeInTheDocument();
    
    rerender(<ThinkContent content="thinking content" isOpen={false} />);
    
    // Component should be collapsed
    const thinkContent = screen.getByText(zhLocale.messages.thinkProcess).closest('div')?.parentElement;
    expect(thinkContent).toBeInTheDocument();
  });

  it('should call onComplete when isOpen changes from true to false', () => {
    const onComplete = vi.fn();
    const { rerender } = renderWithI18n(
      <ThinkContent content="thinking content" isOpen={true} onComplete={onComplete} />
    );
    
    rerender(<ThinkContent content="thinking content" isOpen={false} onComplete={onComplete} />);
    
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should handle multiline content', () => {
    const multilineContent = 'line1\nline2\nline3';
    renderWithI18n(<ThinkContent content={multilineContent} isOpen={true} />);
    
    expect(screen.getByText('line1')).toBeInTheDocument();
    expect(screen.getByText('line2')).toBeInTheDocument();
    expect(screen.getByText('line3')).toBeInTheDocument();
  });

  it('should handle empty lines in content', () => {
    const contentWithEmptyLines = 'line1\n\nline2';
    renderWithI18n(<ThinkContent content={contentWithEmptyLines} isOpen={true} />);
    
    const lines = screen.getAllByText(/\u00A0|line1|line2/);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should use English locale when locale is en', () => {
    mockLocale = 'en';
    renderWithI18n(<ThinkContent content="thinking content" isOpen={false} />, 'en');
    
    expect(screen.getByText(enLocale.messages.thinkProcess)).toBeInTheDocument();
  });

  it('should display thinking in progress text when isOpen is true in English', () => {
    mockLocale = 'en';
    renderWithI18n(<ThinkContent content="thinking content" isOpen={true} />, 'en');
    
    expect(screen.getByText(enLocale.messages.thinkingInProgress)).toBeInTheDocument();
  });

  it('should not call onComplete if isOpen changes from false to true', () => {
    const onComplete = vi.fn();
    const { rerender } = renderWithI18n(
      <ThinkContent content="thinking content" isOpen={false} onComplete={onComplete} />
    );
    
    rerender(<ThinkContent content="thinking content" isOpen={true} onComplete={onComplete} />);
    
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should maintain collapse state when isOpen stays false', () => {
    const { rerender } = renderWithI18n(
      <ThinkContent content="thinking content" isOpen={false} />
    );
    
    const header = screen.getByText(zhLocale.messages.thinkProcess).closest('div');
    
    // Expand manually
    fireEvent.click(header!);
    expect(screen.getByText('thinking content')).toBeInTheDocument();
    
    // Rerender with same isOpen=false
    rerender(<ThinkContent content="thinking content" isOpen={false} />);
    
    // Should still be expanded (user expanded it)
    expect(screen.getByText('thinking content')).toBeInTheDocument();
  });
});

