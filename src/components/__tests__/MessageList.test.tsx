import { renderWithProviders, screen } from '@/test/utils';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageList from '../chat/MessageList';

let useLargeFirstRow = false;

class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const text = target.textContent || '';
    const height =
      useLargeFirstRow && text.includes('Assistant message 1') ? 1000 : 100;
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 0,
            height,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: height,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }

  unobserve(): void {}

  disconnect(): void {}
}

// Mock useI18n hook
vi.mock('@/i18n/i18n', async () => {
  const zhLocale = await import('@/i18n/locales/zh.json');
  return {
    useI18n: () => {
      const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
        const keys = path.split('.');
        let value: unknown = obj;
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
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
    useLargeFirstRow = false;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
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

  it('should load older messages in batches for long sessions', async () => {
    const longMessages = Array.from({ length: 150 }, (_, i) => ({
      id: String(i + 1),
      role: 'assistant' as const,
      content: `Assistant message ${i + 1}`,
      timestamp: Date.now() + i,
    }));
    const { container } = renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages: longMessages,
          isSending: false,
        },
      },
    });
    const list = container.querySelector(
      '[aria-busy="false"][aria-live="polite"]'
    ) as HTMLDivElement;
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 999999,
    });
    fireEvent.scroll(list);

    expect(screen.getByText('Assistant message 150')).toBeInTheDocument();
    expect(screen.queryByText('Assistant message 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /加载更早消息/i }));
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    });
    fireEvent.scroll(list);
    expect(screen.getByText('Assistant message 1')).toBeInTheDocument();
  });

  it('should keep large first row mounted at deep scroll with dynamic height', () => {
    useLargeFirstRow = true;
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      role: 'assistant' as const,
      content: `Assistant message ${i + 1}`,
      timestamp: Date.now() + i,
    }));
    const { container } = renderWithProviders(<MessageList />, {
      initialState: {
        chat: {
          messages,
          isSending: false,
        },
      },
    });

    const list = container.querySelector(
      '[aria-busy="false"][aria-live="polite"]'
    ) as HTMLDivElement;
    Object.defineProperty(list, 'clientHeight', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 800,
    });

    fireEvent.scroll(list);

    expect(screen.getByText('Assistant message 1')).toBeInTheDocument();
  });
});
