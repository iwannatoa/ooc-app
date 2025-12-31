import { fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StorySettingsSidebar from '../StorySettingsSidebar';
import { renderWithProviders } from '@/test/utils';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

// Mock hooks
vi.mock('@/hooks/useDialog', () => ({
  useConversationSettingsDialog: vi.fn(),
  useStorySettingsViewDialog: vi.fn(),
}));

vi.mock('@/hooks/useConversationManagement', () => ({
  useConversationManagement: vi.fn(),
}));

import {
  useConversationSettingsDialog,
  useStorySettingsViewDialog,
} from '@/hooks/useDialog';
import { useConversationManagement } from '@/hooks/useConversationManagement';

describe('StorySettingsSidebar', () => {
  const mockOnToggle = vi.fn();
  const mockOpenSettingsDialog = vi.fn();
  const mockOpenViewDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useConversationSettingsDialog as any).mockReturnValue({
      open: mockOpenSettingsDialog,
    });

    (useStorySettingsViewDialog as any).mockReturnValue({
      open: mockOpenViewDialog,
    });

    (useConversationManagement as any).mockReturnValue({
      activeConversationId: 'conv1',
      conversationSettings: {
        title: 'Test Story',
      },
    });
  });

  it('should not render when settings is null', () => {
    const { container } = renderWithProviders(
      <StorySettingsSidebar
        settings={null}
        onToggle={mockOnToggle}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when settings is provided', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      background: 'Test background',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('storySettings.title')).toBeInTheDocument();
  });

  it('should show empty state when no content', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('storySettings.noSettings')).toBeInTheDocument();
    expect(screen.getByText('storySettings.addSettings')).toBeInTheDocument();
  });

  it('should render background section', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      background: 'This is a test background story setting',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(
      screen.getByText('storySettings.backgroundShort')
    ).toBeInTheDocument();
    expect(
      screen.getByText('This is a test background story setting')
    ).toBeInTheDocument();
  });

  it('should truncate long background text', () => {
    const longBackground = 'a'.repeat(150);
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      background: longBackground,
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    const text = screen.getByText(/^a{100}\.\.\.$/);
    expect(text).toBeInTheDocument();
  });

  it('should expand/collapse long background text', () => {
    const longBackground = 'a'.repeat(150);
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      background: longBackground,
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    const expandButton = screen.getByText('storySettings.expand');
    fireEvent.click(expandButton);

    expect(screen.getByText(longBackground)).toBeInTheDocument();
    expect(screen.getByText('storySettings.collapse')).toBeInTheDocument();
  });

  it('should render characters section', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      characters: ['Character 1', 'Character 2'],
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('storySettings.characters')).toBeInTheDocument();
    expect(screen.getByText('Character 1')).toBeInTheDocument();
    expect(screen.getByText('Character 2')).toBeInTheDocument();
  });

  it('should show character personality', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      characters: ['Character 1'],
      character_personality: {
        'Character 1': 'Brave and kind',
      },
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Brave and kind')).toBeInTheDocument();
  });

  it('should truncate long character personality', () => {
    const longPersonality = 'a'.repeat(50);
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      characters: ['Character 1'],
      character_personality: {
        'Character 1': longPersonality,
      },
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText(/^a{30}\.\.\.$/)).toBeInTheDocument();
  });

  it('should show more characters indicator', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      characters: ['Char 1', 'Char 2', 'Char 3', 'Char 4', 'Char 5'],
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(
      screen.getByText(/storySettings.moreCharacters/)
    ).toBeInTheDocument();
  });

  it('should render outline section', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      outline: 'This is the story outline',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('storySettings.outlineShort')).toBeInTheDocument();
    expect(screen.getByText('This is the story outline')).toBeInTheDocument();
  });

  it('should truncate long outline text', () => {
    const longOutline = 'a'.repeat(200);
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      outline: longOutline,
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText(/^a{150}\.\.\.$/)).toBeInTheDocument();
  });

  it('should call onToggle when toggle button is clicked', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    const toggleButton = screen.getByText('▼');
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should show collapsed state', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
      background: 'Test background',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
        collapsed={true}
      />
    );

    expect(screen.queryByText('Test background')).not.toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('should call open settings dialog when edit button is clicked', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    const editButton = screen.getByText('storySettings.edit');
    fireEvent.click(editButton);

    expect(mockOpenSettingsDialog).toHaveBeenCalledWith('conv1', {
      settings: { title: 'Test Story' },
    });
  });

  it('should call open view dialog when view button is clicked', () => {
    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    const viewButton = screen.getByText('conversation.viewSettings');
    fireEvent.click(viewButton);

    expect(mockOpenViewDialog).toHaveBeenCalledWith('conv1', {
      title: 'Test Story',
    });
  });

  it('should not show view button when no active conversation', () => {
    (useConversationManagement as any).mockReturnValue({
      activeConversationId: null,
      conversationSettings: null,
    });

    const settings = {
      conversation_id: 'conv1',
      title: 'Test Story',
    };

    renderWithProviders(
      <StorySettingsSidebar
        settings={settings}
        onToggle={mockOnToggle}
      />
    );

    expect(
      screen.queryByText('conversation.viewSettings')
    ).not.toBeInTheDocument();
  });
});
