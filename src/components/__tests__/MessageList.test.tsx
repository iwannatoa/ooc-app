import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from '../MessageList';
import { ChatMessage } from '@/types';

// Mock useI18n hook
vi.mock('@/i18n', async () => {
  const zhLocale = await import('@/i18n/locales/zh.json');
  return {
    useI18n: () => {
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
        locale: 'zh',
        setLocale: vi.fn(),
        t: (key: string) => getNestedValue(zhLocale.default || zhLocale, key),
      };
    },
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock ThinkContent component
vi.mock('../ThinkContent', () => ({
  default: ({ content, isOpen }: { content: string; isOpen: boolean }) => (
    <div data-testid="think-content" data-is-open={isOpen}>
      {content}
    </div>
  ),
}));

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty when no messages', () => {
    const messages: ChatMessage[] = [];
    render(<MessageList messages={messages} />);
    
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('should filter out user messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'User message',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Assistant message',
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    expect(screen.queryByText('User message')).not.toBeInTheDocument();
    expect(screen.getByText('Assistant message')).toBeInTheDocument();
  });

  it('should render assistant messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello world',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render messages with think content', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello <think>thinking</think> world',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    // Should render think content
    expect(screen.getByTestId('think-content')).toBeInTheDocument();
    expect(screen.getByText('thinking')).toBeInTheDocument();
    // Should also render regular text
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('should render messages with open think tags', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello <think>thinking',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    const thinkContent = screen.getByTestId('think-content');
    expect(thinkContent).toBeInTheDocument();
    expect(thinkContent.getAttribute('data-is-open')).toBe('true');
  });

  it('should render loading indicator when loading is true', () => {
    const messages: ChatMessage[] = [];
    render(<MessageList messages={messages} loading={true} />);
    
    // Should show loading indicator (thinking text)
    expect(screen.getByText(/思考中/)).toBeInTheDocument();
  });

  it('should not render loading indicator when loading is false', () => {
    const messages: ChatMessage[] = [];
    render(<MessageList messages={messages} loading={false} />);
    
    expect(screen.queryByText(/思考中/)).not.toBeInTheDocument();
  });

  it('should handle empty content messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    // Message should still be rendered but content area should be empty
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('should handle messages with only think content', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: '<think>thinking</think>',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    expect(screen.getByTestId('think-content')).toBeInTheDocument();
  });

  it('should handle messages with multiple think blocks', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Start <think>think1</think> middle <think>think2</think> end',
        timestamp: Date.now(),
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    const thinkContents = screen.getAllByTestId('think-content');
    expect(thinkContents.length).toBe(2);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('middle')).toBeInTheDocument();
    expect(screen.getByText('end')).toBeInTheDocument();
  });

  it('should display timestamp when available', () => {
    const timestamp = Date.now();
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello',
        timestamp,
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    const timeString = new Date(timestamp).toLocaleTimeString();
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });

  it('should handle messages without timestamp', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello',
      },
    ];
    
    render(<MessageList messages={messages} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    // Time should not be rendered
    const timeElements = screen.queryAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBe(0);
  });
});

