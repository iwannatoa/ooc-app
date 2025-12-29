import { renderWithProviders, screen } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageList from '../chat/MessageList';

// Mock useI18n hook
vi.mock('@/i18n/i18n', async () => {
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
        t: (key: string) => getNestedValue(zhLocale, key),
      };
    },
    I18nProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Mock ThinkContent component
vi.mock('../ThinkContent', () => ({
  default: ({ content, isOpen }: { content: string; isOpen: boolean }) => (
    <div
      data-testid='think-content'
      data-is-open={isOpen}
    >
      {content}
    </div>
  ),
}));

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty when no messages', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [],
          isSending: false,
        },
      },
    });

    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('should filter out user messages', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
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
          ],
          isSending: false,
        },
      },
    });

    expect(screen.queryByText('User message')).not.toBeInTheDocument();
    expect(screen.getByText('Assistant message')).toBeInTheDocument();
  });

  it('should render assistant messages', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Hello world',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render messages with think content', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Hello <think>thinking</think> world',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    // Should render think content
    expect(screen.getByTestId('think-content')).toBeInTheDocument();
    expect(screen.getByText('thinking')).toBeInTheDocument();
    // Should also render regular text
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('should render messages with open think tags', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Hello <think>thinking',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    const thinkContent = screen.getByTestId('think-content');
    expect(thinkContent).toBeInTheDocument();
    expect(thinkContent.getAttribute('data-is-open')).toBe('true');
  });

  it('should render loading indicator when loading is true', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [],
          isSending: true,
        },
      },
    });

    // Should show loading indicator (thinking text)
    expect(screen.getByText(/思考中/)).toBeInTheDocument();
  });

  it('should not render loading indicator when loading is false', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [],
          isSending: false,
        },
      },
    });

    expect(screen.queryByText(/思考中/)).not.toBeInTheDocument();
  });

  it('should handle empty content messages', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    // Message should still be rendered but content area should be empty
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('should handle messages with only think content', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: '<think>thinking</think>',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    expect(screen.getByTestId('think-content')).toBeInTheDocument();
  });

  it('should handle messages with multiple think blocks', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Start <think>think1</think> middle <think>think2</think> end',
              timestamp: Date.now(),
            },
          ],
          isSending: false,
        },
      },
    });

    const thinkContents = screen.getAllByTestId('think-content');
    expect(thinkContents.length).toBe(2);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('middle')).toBeInTheDocument();
    expect(screen.getByText('end')).toBeInTheDocument();
  });

  it('should display timestamp when available', () => {
    const timestamp = Date.now();
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Hello',
              timestamp,
            },
          ],
          isSending: false,
        },
      },
    });

    const timeString = new Date(timestamp).toLocaleTimeString();
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });

  it('should handle messages without timestamp', () => {
    renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: [
            {
              id: '1',
              role: 'assistant',
              content: 'Hello',
            },
          ],
          isSending: false,
        },
      },
    });

    expect(screen.getByText('Hello')).toBeInTheDocument();
    // Time should not be rendered
    const timeElements = screen.queryAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBe(0);
  });
});
