import { mockFn } from '@/test/mockFn';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatControls } from '../ChatControls';
import { renderWithProviders } from '@/test/utils';

// Mock i18n first
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(),
}));

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useConversationManagement', () => ({
  useConversationManagement: vi.fn(),
}));

vi.mock('@/hooks/useChatState', () => ({
  useChatState: vi.fn(),
}));

vi.mock('@/hooks/useChatActions', () => ({
  useChatActions: vi.fn(),
}));

vi.mock('@/hooks/useSettingsState', () => ({
  useSettingsState: vi.fn(),
}));

vi.mock('@/hooks/useUIState', () => ({
  useUIState: vi.fn(),
}));

vi.mock('@/hooks/useStoryProgress', () => ({
  useStoryProgress: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));
vi.mock('@/hooks/useConversationClient', () => ({
  useConversationClient: vi.fn(),
}));

vi.mock('../ModelSelector', () => ({
  default: ({
    models,
    selectedModel,
    onModelChange,
    disabled,
  }: {
    models: { model: string; name: string }[];
    selectedModel: string;
    onModelChange: (model: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid='model-selector'>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
      >
        {models.map((m) => (
          <option
            key={m.model}
            value={m.model}
          >
            {m.name}
          </option>
        ))}
      </select>
    </div>
  ),
}));

import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useUIState } from '@/hooks/useUIState';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/i18n/i18n';
import { useConversationClient } from '@/hooks/useConversationClient';

describe('ChatControls', () => {
  const mockHandleNewConversation = vi.fn();
  const mockHandleModelChange = vi.fn();
  const mockGetCurrentModel = vi.fn();
  const mockSetConversationListCollapsed = vi.fn();
  const mockSetSettingsSidebarCollapsed = vi.fn();
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockConversationClient = {
    getAssistantVariants: vi.fn(),
    restoreAssistantVariant: vi.fn(),
    getConversationMessages: vi.fn(),
    createStoryBranch: vi.fn(),
    createStorySavepoint: vi.fn(),
    getStorySavepoints: vi.fn(),
    restoreStorySavepoint: vi.fn(),
    getStoryBranches: vi.fn(),
    markStoryEnding: vi.fn(),
    exportStoryPdf: vi.fn(),
    exportProjectBundle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFn(useI18n).mockReturnValue({
      t: (key: string, params?: Record<string, string | number>) => {
        if (key === 'chat.chapter' && params) {
          return `Chapter ${params.number}`;
        }
        return key;
      },
    });

    mockFn(useConversationManagement).mockReturnValue({
      activeConversationId: 'conv1',
      conversationSettings: {
        title: 'Test Story',
      },
      handleNewConversation: mockHandleNewConversation,
    });

    mockFn(useChatState).mockReturnValue({
      models: [{ name: 'Model 1', model: 'model1' }],
      messages: [],
      setMessages: vi.fn(),
    });

    mockFn(useChatActions).mockReturnValue({
      handleModelChange: mockHandleModelChange,
      getCurrentModel: mockGetCurrentModel.mockReturnValue('model1'),
    });

    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ai: {
          provider: 'ollama',
        },
      },
    });

    mockFn(useUIState).mockReturnValue({
      conversationListCollapsed: false,
      settingsSidebarCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    mockFn(useStoryProgress).mockReturnValue({
      progress: null,
    });

    mockFn(useToast).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });
    mockFn(useConversationClient).mockReturnValue(mockConversationClient);
  });

  it('should render model selector for ollama provider', () => {
    renderWithProviders(<ChatControls />);

    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });

  it('should render model info for non-ollama provider', () => {
    mockFn(useSettingsState).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
        },
      },
    });

    renderWithProviders(<ChatControls />);

    expect(screen.queryByTestId('model-selector')).not.toBeInTheDocument();
    expect(screen.getByText(/settingsPanel.currentModel/)).toBeInTheDocument();
  });

  it('should show expand button when conversation list is collapsed', () => {
    mockFn(useUIState).mockReturnValue({
      conversationListCollapsed: true,
      settingsSidebarCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    renderWithProviders(<ChatControls />);

    const expandButton = screen.getByText(/conversation.titleShort/);
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(mockSetConversationListCollapsed).toHaveBeenCalledWith(false);
  });

  it('should show story info when conversation is active', () => {
    renderWithProviders(<ChatControls />);

    expect(screen.getByText('Test Story')).toBeInTheDocument();
  });

  it('should show chapter info when progress is available', () => {
    mockFn(useStoryProgress).mockReturnValue({
      progress: {
        current_section: 2,
        total_sections: 5,
      },
    });

    renderWithProviders(<ChatControls />);

    expect(screen.getByText(/Chapter 3/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 5/)).toBeInTheDocument();
  });

  it('should show export button when messages exist', () => {
    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi' },
      ],
    });

    renderWithProviders(<ChatControls />);

    expect(screen.getByText('chat.export')).toBeInTheDocument();
  });

  it('should not show export button when no messages', () => {
    renderWithProviders(<ChatControls />);

    expect(screen.queryByText('chat.export')).not.toBeInTheDocument();
  });

  it('should show new button when list is collapsed and no active conversation', () => {
    mockFn(useUIState).mockReturnValue({
      conversationListCollapsed: true,
      settingsSidebarCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    mockFn(useConversationManagement).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
      handleNewConversation: mockHandleNewConversation,
    });

    renderWithProviders(<ChatControls />);

    const newButton = screen.getByText(/common.new/);
    expect(newButton).toBeInTheDocument();

    fireEvent.click(newButton);
    expect(mockHandleNewConversation).toHaveBeenCalled();
  });

  it('should show expand settings sidebar button when collapsed', () => {
    mockFn(useUIState).mockReturnValue({
      conversationListCollapsed: false,
      settingsSidebarCollapsed: true,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    renderWithProviders(<ChatControls />);

    const expandButton = screen.getByText(/storySettings.titleShort/);
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(mockSetSettingsSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('should export story successfully', async () => {
    mockFn(save).mockResolvedValue('/path/to/file.txt');
    mockFn(writeTextFile).mockResolvedValue(undefined);

    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [
        { id: '1', role: 'assistant', content: 'Story content 1' },
        { id: '2', role: 'assistant', content: 'Story content 2' },
      ],
    });

    mockFn(useStoryProgress).mockReturnValue({
      progress: {
        current_section: 0,
        total_sections: 10,
      },
    });

    const { container } = renderWithProviders(<ChatControls />);

    const exportButton = screen.getByText('chat.export');
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(save).toHaveBeenCalled();
      },
      { container }
    );

    await waitFor(
      () => {
        expect(writeTextFile).toHaveBeenCalled();
      },
      { container }
    );

    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('should handle export cancellation', async () => {
    mockFn(save).mockResolvedValue(null);

    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    const { container } = renderWithProviders(<ChatControls />);

    const exportButton = screen.getByText('chat.export');
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(save).toHaveBeenCalled();
      },
      { container }
    );

    expect(writeTextFile).not.toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it('should handle export error', async () => {
    mockFn(save).mockResolvedValue('/path/to/file.txt');
    mockFn(writeTextFile).mockRejectedValue(new Error('Write failed'));

    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    const { container } = renderWithProviders(<ChatControls />);

    const exportButton = screen.getByText('chat.export');
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(mockShowError).toHaveBeenCalled();
      },
      { container }
    );
  });

  it('should not export when no active conversation', () => {
    mockFn(useConversationManagement).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
      handleNewConversation: mockHandleNewConversation,
    });

    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    renderWithProviders(<ChatControls />);

    expect(screen.queryByText('chat.export')).not.toBeInTheDocument();
  });

  it('should sanitize filename when exporting', async () => {
    mockFn(save).mockResolvedValue('/path/to/file.txt');
    mockFn(writeTextFile).mockResolvedValue(undefined);

    mockFn(useConversationManagement).mockReturnValue({
      activeConversationId: 'conv1',
      conversationSettings: {
        title: 'Test<>Story',
      },
      handleNewConversation: mockHandleNewConversation,
    });

    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    const { container } = renderWithProviders(<ChatControls />);

    const exportButton = screen.getByText('chat.export');
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(save).toHaveBeenCalled();
        const callArgs = mockFn(save).mock.calls[0][0];
        expect(callArgs.defaultPath).toContain('Test__Story_Chapter 1.txt');
      },
      { container }
    );
  });

  it('should restore savepoint and refresh messages', async () => {
    const setMessages = vi.fn();
    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [
        { id: '1', role: 'assistant', content: 'Story content' },
      ],
      setMessages,
    });
    mockConversationClient.getStorySavepoints.mockResolvedValue([
      { savepoint_id: 'sp-1', label: 'checkpoint' },
    ]);
    mockConversationClient.restoreStorySavepoint.mockResolvedValue(true);
    mockConversationClient.getConversationMessages.mockResolvedValue([
      { id: '1', role: 'assistant', content: 'Restored' },
    ]);
    vi.spyOn(window, 'prompt').mockReturnValue('sp-1');

    renderWithProviders(<ChatControls />);
    fireEvent.click(screen.getByText('Restore'));

    await waitFor(() => {
      expect(mockConversationClient.restoreStorySavepoint).toHaveBeenCalledWith(
        'conv1',
        'sp-1'
      );
      expect(setMessages).toHaveBeenCalled();
    });
  });

  it('should rollback using explicit selected variant target', async () => {
    const setMessages = vi.fn();
    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [
        { id: '11', role: 'assistant', content: 'Latest A' },
      ],
      setMessages,
    });
    mockConversationClient.getAssistantVariants.mockResolvedValue([
      { id: 11, content: 'Latest A' },
      { id: 10, content: 'Prev B' },
    ]);
    mockConversationClient.restoreAssistantVariant.mockResolvedValue(true);
    mockConversationClient.getConversationMessages.mockResolvedValue([
      { id: '99', role: 'assistant', content: 'Restored B' },
    ]);

    renderWithProviders(<ChatControls />);
    fireEvent.click(screen.getByText('Rollback'));

    await waitFor(() => {
      expect(screen.getByText('Variant Diff')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('rollback-target'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('Confirm Rollback'));

    await waitFor(() => {
      expect(mockConversationClient.restoreAssistantVariant).toHaveBeenCalledWith(
        'conv1',
        10
      );
      expect(setMessages).toHaveBeenCalled();
    });
  });

  it('should export pdf via server endpoint', async () => {
    mockFn(save).mockResolvedValue('/path/to/file.pdf');
    mockFn(writeFile).mockResolvedValue(undefined);
    mockConversationClient.exportStoryPdf.mockResolvedValue({
      pdf_base64: btoa('%PDF-1.4'),
      filename: 'story.pdf',
    });
    mockFn(useChatState).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
      setMessages: vi.fn(),
    });

    renderWithProviders(<ChatControls />);
    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(mockConversationClient.exportStoryPdf).toHaveBeenCalledWith(
        'conv1',
        'Test Story'
      );
      expect(writeFile).toHaveBeenCalled();
    });
  });
});
