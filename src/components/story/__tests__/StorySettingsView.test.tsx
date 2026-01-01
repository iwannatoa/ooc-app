import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StorySettingsView from '../StorySettingsView';
import { renderWithProviders } from '@/test/utils';
import { tick } from '@/test/utils';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    locale: 'en',
  })),
}));

// Mock hooks
vi.mock('@/hooks/useConversationClient', () => ({
  useConversationClient: vi.fn(),
}));

import { useConversationClient } from '@/hooks/useConversationClient';

describe('StorySettingsView', () => {
  const mockOnEdit = vi.fn();
  const mockOnClose = vi.fn();
  const mockGetCharacters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useConversationClient as any).mockReturnValue({
      getCharacters: mockGetCharacters,
    });
  });

  it('should not render when settings is null', () => {
    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={null}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when settings is provided', () => {
    const settings = {
      title: 'Test Story',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText('storySettings.titleAndOutline')
    ).toBeInTheDocument();
  });

  it('should render title section', () => {
    const settings = {
      title: 'Test Story Title',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('storySettings.titleLabel')).toBeInTheDocument();
    expect(screen.getByText('Test Story Title')).toBeInTheDocument();
  });

  it('should render background section', () => {
    const settings = {
      title: 'Test Story',
      background: 'This is the background',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('storySettings.background')).toBeInTheDocument();
    expect(screen.getByText('This is the background')).toBeInTheDocument();
  });

  it('should render characters section', () => {
    const settings = {
      title: 'Test Story',
      characters: ['Character 1', 'Character 2'],
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText('storySettings.characterRoles')
    ).toBeInTheDocument();
    expect(screen.getByText('Character 1')).toBeInTheDocument();
    expect(screen.getByText('Character 2')).toBeInTheDocument();
  });

  it('should render character personality', () => {
    const settings = {
      title: 'Test Story',
      characters: ['Character 1'],
      character_personality: {
        'Character 1': 'Brave and kind',
      },
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Brave and kind')).toBeInTheDocument();
  });

  it('should render outline section', () => {
    const settings = {
      title: 'Test Story',
      outline: 'This is the outline',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('storySettings.outline')).toBeInTheDocument();
    expect(screen.getByText('This is the outline')).toBeInTheDocument();
  });

  it('should show empty state when no settings', () => {
    const settings = {
      title: 'Test Story',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('storySettings.noSettings')).toBeInTheDocument();
    expect(screen.getByText('storySettings.addSettings')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const settings = {
      title: 'Test Story',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    const editButton = screen.getByText('storySettings.edit');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const settings = {
      title: 'Test Story',
    };

    mockGetCharacters.mockResolvedValue([]);

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should load and display appeared characters', async () => {
    const settings = {
      title: 'Test Story',
    };

    const characters = [
      {
        id: '1',
        name: 'Character 1',
        is_main: true,
        is_auto_generated: false,
        is_unavailable: false,
      },
      {
        id: '2',
        name: 'Character 2',
        is_main: false,
        is_auto_generated: true,
        is_unavailable: false,
      },
    ];

    mockGetCharacters.mockResolvedValue(characters);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    await waitFor(
      () => {
        expect(
          screen.getByText('storySettings.appearedCharacters')
        ).toBeInTheDocument();
        expect(screen.getByText('Character 1')).toBeInTheDocument();
        expect(screen.getByText('Character 2')).toBeInTheDocument();
      },
      { container }
    );
  });

  it('should display character badges', async () => {
    const settings = {
      title: 'Test Story',
    };

    const characters = [
      {
        id: '1',
        name: 'Main Character',
        is_main: true,
        is_auto_generated: false,
        is_unavailable: false,
      },
    ];

    mockGetCharacters.mockResolvedValue(characters);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    await waitFor(
      () => {
        expect(
          screen.getByText('storySettings.mainCharacter')
        ).toBeInTheDocument();
      },
      { container }
    );
  });

  it('should separate available and unavailable characters', async () => {
    const settings = {
      title: 'Test Story',
    };

    const characters = [
      {
        id: '1',
        name: 'Available Character',
        is_unavailable: false,
      },
      {
        id: '2',
        name: 'Unavailable Character',
        is_unavailable: true,
      },
    ];

    mockGetCharacters.mockResolvedValue(characters);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    await waitFor(
      () => {
        expect(
          screen.getByText('storySettings.availableCharacters')
        ).toBeInTheDocument();
        expect(
          screen.getByText('storySettings.unavailableCharacters')
        ).toBeInTheDocument();
      },
      { container }
    );
  });

  it('should format date correctly', async () => {
    const settings = {
      title: 'Test Story',
    };

    const characters = [
      {
        id: '1',
        name: 'Character 1',
        first_appeared_at: '2024-01-15T10:30:00Z',
        is_unavailable: false,
      },
    ];

    mockGetCharacters.mockResolvedValue(characters);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    await waitFor(
      () => {
        const elements = screen.getAllByText((content, element) => {
          return (
            element?.textContent === 'storySettings.firstAppeared:' ||
            element?.textContent?.includes('storySettings.firstAppeared')
          );
        });
        expect(elements.length).toBeGreaterThan(0);
      },
      { container }
    );
  });

  it('should display character notes', async () => {
    const settings = {
      title: 'Test Story',
    };

    const characters = [
      {
        id: '1',
        name: 'Character 1',
        notes: 'Important character notes',
        is_unavailable: false,
      },
    ];

    mockGetCharacters.mockResolvedValue(characters);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    await waitFor(
      () => {
        const elements = screen.getAllByText((content, element) => {
          return (
            element?.textContent === 'storySettings.characterNotes:' ||
            element?.textContent?.includes('storySettings.characterNotes')
          );
        });
        expect(elements.length).toBeGreaterThan(0);
        expect(
          screen.getByText('Important character notes')
        ).toBeInTheDocument();
      },
      { container }
    );
  });

  it('should handle character loading error', async () => {
    const settings = {
      title: 'Test Story',
    };

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockGetCharacters.mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    await tick();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should stop propagation when modal is clicked', () => {
    const settings = {
      title: 'Test Story',
    };

    mockGetCharacters.mockResolvedValue([]);

    const { container } = renderWithProviders(
      <StorySettingsView
        conversationId='conv1'
        settings={settings}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    );

    const modal = container.querySelector('[class*="modal"]');
    const stopPropagationSpy = vi.fn();
    const clickEvent = new MouseEvent('click', { bubbles: true });
    clickEvent.stopPropagation = stopPropagationSpy;

    if (modal) {
      fireEvent(modal, clickEvent);
    }
  });
});
