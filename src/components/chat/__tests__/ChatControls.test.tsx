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

vi.mock('../ModelSelector', () => ({
  default: ({ models, selectedModel, onModelChange, disabled }: any) => (
    <div data-testid='model-selector'>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
      >
        {models.map((m: any) => (
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
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useUIState } from '@/hooks/useUIState';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/i18n/i18n';

describe('ChatControls', () => {
  const mockHandleNewConversation = vi.fn();
  const mockHandleModelChange = vi.fn();
  const mockGetCurrentModel = vi.fn();
  const mockSetConversationListCollapsed = vi.fn();
  const mockSetSettingsSidebarCollapsed = vi.fn();
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n as any).mockReturnValue({
      t: (key: string, params?: any) => {
        if (key === 'chat.chapter' && params) {
          return `Chapter ${params.number}`;
        }
        return key;
      },
    });

    (useConversationManagement as any).mockReturnValue({
      activeConversationId: 'conv1',
      conversationSettings: {
        title: 'Test Story',
      },
      handleNewConversation: mockHandleNewConversation,
    });

    (useChatState as any).mockReturnValue({
      models: [{ name: 'Model 1', model: 'model1' }],
      messages: [],
    });

    (useChatActions as any).mockReturnValue({
      handleModelChange: mockHandleModelChange,
      getCurrentModel: mockGetCurrentModel.mockReturnValue('model1'),
    });

    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'ollama',
        },
      },
    });

    (useUIState as any).mockReturnValue({
      conversationListCollapsed: false,
      settingsSidebarCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    (useStoryProgress as any).mockReturnValue({
      progress: null,
    });

    (useToast as any).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });
  });

  it('should render model selector for ollama provider', () => {
    renderWithProviders(<ChatControls />);

    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });

  it('should render model info for non-ollama provider', () => {
    (useSettingsState as any).mockReturnValue({
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
    (useUIState as any).mockReturnValue({
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
    (useStoryProgress as any).mockReturnValue({
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
    (useChatState as any).mockReturnValue({
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
    (useUIState as any).mockReturnValue({
      conversationListCollapsed: true,
      settingsSidebarCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
      setSettingsSidebarCollapsed: mockSetSettingsSidebarCollapsed,
    });

    (useConversationManagement as any).mockReturnValue({
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
    (useUIState as any).mockReturnValue({
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
    (save as any).mockResolvedValue('/path/to/file.txt');
    (writeTextFile as any).mockResolvedValue(undefined);

    (useChatState as any).mockReturnValue({
      models: [],
      messages: [
        { id: '1', role: 'assistant', content: 'Story content 1' },
        { id: '2', role: 'assistant', content: 'Story content 2' },
      ],
    });

    (useStoryProgress as any).mockReturnValue({
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
    (save as any).mockResolvedValue(null);

    (useChatState as any).mockReturnValue({
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
    (save as any).mockResolvedValue('/path/to/file.txt');
    (writeTextFile as any).mockRejectedValue(new Error('Write failed'));

    (useChatState as any).mockReturnValue({
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
    (useConversationManagement as any).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
      handleNewConversation: mockHandleNewConversation,
    });

    (useChatState as any).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    renderWithProviders(<ChatControls />);

    expect(screen.queryByText('chat.export')).not.toBeInTheDocument();
  });

  it('should sanitize filename when exporting', async () => {
    (save as any).mockResolvedValue('/path/to/file.txt');
    (writeTextFile as any).mockResolvedValue(undefined);

    (useConversationManagement as any).mockReturnValue({
      activeConversationId: 'conv1',
      conversationSettings: {
        title: 'Test<>Story',
      },
      handleNewConversation: mockHandleNewConversation,
    });

    (useChatState as any).mockReturnValue({
      models: [],
      messages: [{ id: '1', role: 'assistant', content: 'Story content' }],
    });

    const { container } = renderWithProviders(<ChatControls />);

    const exportButton = screen.getByText('chat.export');
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(save).toHaveBeenCalled();
        const callArgs = (save as any).mock.calls[0][0];
        expect(callArgs.defaultPath).toContain('Test__Story_Chapter 1.txt');
      },
      { container }
    );
  });
});
