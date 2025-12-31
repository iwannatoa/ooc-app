import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import App from '../App';

// Mock all hooks
const mockUseUIState = vi.fn();
const mockUseConversationManagement = vi.fn();
const mockUseAppSettings = vi.fn();
const mockUseAppearance = vi.fn();
const mockUseToast = vi.fn();

vi.mock('../hooks/useUIState', () => ({
  useUIState: () => mockUseUIState(),
}));

vi.mock('../hooks/useConversationManagement', () => ({
  useConversationManagement: () => mockUseConversationManagement(),
}));

vi.mock('../hooks/useAppSettings', () => ({
  useAppSettings: () => mockUseAppSettings(),
}));

vi.mock('../hooks/useAppearance', () => ({
  useAppearance: () => mockUseAppearance(),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => mockUseToast(),
}));

vi.mock('../hooks/useAppSettings', () => ({
  useAppSettings: () => {},
}));

vi.mock('../hooks/useAppearance', () => ({
  useAppearance: () => {},
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

// Mock Tauri window API
const mockShow = vi.fn();
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    show: mockShow,
  }),
}));

// Mock all components
vi.mock('../components/TitleBar', () => ({
  TitleBar: () => <div data-testid="title-bar">TitleBar</div>,
}));

vi.mock('../components/AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header">AppHeader</div>,
}));

vi.mock('../components/ConversationList', () => ({
  default: () => <div data-testid="conversation-list">ConversationList</div>,
}));

vi.mock('../components/chat', () => ({
  ChatControls: () => <div data-testid="chat-controls">ChatControls</div>,
  ChatInterface: () => <div data-testid="chat-interface">ChatInterface</div>,
}));

vi.mock('../components/story', () => ({
  StorySettingsSidebar: ({
    collapsed,
    onToggle,
  }: {
    collapsed: boolean;
    onToggle: () => void;
  }) => (
    <div data-testid="story-settings-sidebar">
      StorySettingsSidebar (collapsed: {String(collapsed)})
      <button onClick={onToggle}>Toggle</button>
    </div>
  ),
}));

vi.mock('../components/common', () => ({
  ConfirmDialogContainer: () => (
    <div data-testid="confirm-dialog-container">ConfirmDialogContainer</div>
  ),
  ToastContainer: () => <div data-testid="toast-container">ToastContainer</div>,
  DialogContainer: () => (
    <div data-testid="dialog-container">DialogContainer</div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementations
    mockUseUIState.mockReturnValue({
      settingsSidebarCollapsed: false,
      setSettingsSidebarCollapsed: vi.fn(),
      conversationListCollapsed: false,
      setConversationListCollapsed: vi.fn(),
      isNewConversation: false,
      setIsNewConversation: vi.fn(),
      pendingConversationId: null,
      setPendingConversationId: vi.fn(),
    });

    mockUseConversationManagement.mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
      conversations: [],
      loading: false,
      summaryMessageCount: 0,
      handleNewConversation: vi.fn(),
      handleSelectConversation: vi.fn(),
      handleDeleteConversation: vi.fn(),
      handleSaveSettings: vi.fn(),
      handleEditSettings: vi.fn(),
      handleSendMessage: vi.fn(),
      handleGenerateSummary: vi.fn(),
      handleSaveSummary: vi.fn(),
      loadConversations: vi.fn(),
    });

    mockUseAppSettings.mockReturnValue(undefined);
    mockUseAppearance.mockReturnValue(undefined);

    mockUseToast.mockReturnValue({
      toasts: [],
      removeToast: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render all main components', () => {
    renderWithProviders(<App />);

    expect(screen.getByTestId('title-bar')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-controls')).toBeInTheDocument();
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-container')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-container')).toBeInTheDocument();
  });

  it('should not render StorySettingsSidebar when no active conversation', () => {
    renderWithProviders(<App />);

    expect(
      screen.queryByTestId('story-settings-sidebar')
    ).not.toBeInTheDocument();
  });

  it('should render StorySettingsSidebar when active conversation exists', () => {
    mockUseConversationManagement.mockReturnValue({
      activeConversationId: 'conv-123',
      conversationSettings: {
        conversation_id: 'conv-123',
        title: 'Test Conversation',
      } as any,
      conversations: [],
      loading: false,
      summaryMessageCount: 0,
      handleNewConversation: vi.fn(),
      handleSelectConversation: vi.fn(),
      handleDeleteConversation: vi.fn(),
      handleSaveSettings: vi.fn(),
      handleEditSettings: vi.fn(),
      handleSendMessage: vi.fn(),
      handleGenerateSummary: vi.fn(),
      handleSaveSummary: vi.fn(),
      loadConversations: vi.fn(),
    });

    renderWithProviders(<App />);

    expect(screen.getByTestId('story-settings-sidebar')).toBeInTheDocument();
  });

  it('should show window after render', async () => {
    renderWithProviders(<App />);

    // Fast-forward timers to trigger the setTimeout
    vi.advanceTimersByTime(100);

    // Wait for async operations
    await vi.runAllTimersAsync();

    expect(mockShow).toHaveBeenCalled();
  });

  it('should handle window show error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockShow.mockRejectedValueOnce(new Error('Window show failed'));

    renderWithProviders(<App />);

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to show window:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

