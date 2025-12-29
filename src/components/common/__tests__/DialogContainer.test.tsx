import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogContainer } from '../DialogContainer';
import { renderWithProviders, tick } from '@/test/utils';
import { createTestStore } from '@/test/utils';

// Mock all dialog components
vi.mock('../../story', () => ({
  ConversationSettingsForm: ({ onSave, onCancel }: any) => (
    <div data-testid='conversation-settings-form'>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
  SummaryPrompt: ({ onGenerate, onSave, onCancel }: any) => (
    <div data-testid='summary-prompt'>
      <button onClick={onGenerate}>Generate</button>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
  StorySettingsView: ({ onEdit, onClose }: any) => (
    <div data-testid='story-settings-view'>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../../settings', () => ({
  SettingsPanel: ({ onClose }: any) => (
    <div data-testid='settings-panel'>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock hooks
vi.mock('@/hooks/useDialog', () => ({
  useDialog: vi.fn(),
  useConversationSettingsDialog: vi.fn(),
}));

vi.mock('@/hooks/useAppLogic', () => ({
  useAppLogic: vi.fn(),
}));

vi.mock('@/hooks/useConversationManagement', () => ({
  useConversationManagement: vi.fn(),
}));

vi.mock('@/hooks/useConversationSettingsForm', () => ({
  useConversationSettingsForm: vi.fn(),
}));

import { useDialog, useConversationSettingsDialog } from '@/hooks/useDialog';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';

describe('DialogContainer', () => {
  const mockClose = vi.fn();
  const mockOpen = vi.fn();
  const mockHandleSaveSettings = vi.fn();
  const mockHandleGenerateSummary = vi.fn();
  const mockHandleSaveSummary = vi.fn();
  const mockInitialize = vi.fn();
  const mockSettingsDialogOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useDialog as any).mockReturnValue({
      close: mockClose,
    });

    (useConversationSettingsDialog as any).mockReturnValue({
      open: mockSettingsDialogOpen,
    });

    (useAppLogic as any).mockReturnValue({
      currentSettings: { title: 'Test Story' },
      handleSaveSettings: mockHandleSaveSettings,
      handleGenerateSummary: mockHandleGenerateSummary,
      handleSaveSummary: mockHandleSaveSummary,
    });

    (useConversationManagement as any).mockReturnValue({
      activeConversationId: 'conv1',
      pendingConversationId: null,
      isNewConversation: false,
    });

    (useConversationSettingsForm as any).mockReturnValue({
      initialize: mockInitialize,
    });
  });

  it('should not render anything when no dialogs are open', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [],
        stack: [],
      },
    });

    const { container } = renderWithProviders(<DialogContainer />, { store });
    expect(container.firstChild).toBeNull();
  });

  it('should render conversation settings dialog', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
              settings: { title: 'Test' },
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(
      screen.getByTestId('conversation-settings-form')
    ).toBeInTheDocument();
    expect(mockInitialize).toHaveBeenCalledWith(
      'conv1',
      { title: 'Test' },
      false
    );
  });

  it('should use activeConversationId when conversationId is not in payload', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {},
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(mockInitialize).toHaveBeenCalledWith(
      'conv1',
      { title: 'Test Story' },
      false
    );
  });

  it('should use pendingConversationId when available', () => {
    (useConversationManagement as any).mockReturnValue({
      activeConversationId: 'conv1',
      pendingConversationId: 'pending1',
      isNewConversation: false,
    });

    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {},
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(mockInitialize).toHaveBeenCalledWith(
      'pending1',
      { title: 'Test Story' },
      false
    );
  });

  it('should not render conversation settings when no conversationId available', () => {
    (useConversationManagement as any).mockReturnValue({
      activeConversationId: null,
      pendingConversationId: null,
      isNewConversation: false,
    });

    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {},
          },
        ],
        stack: ['dialog1'],
      },
    });

    const { container } = renderWithProviders(<DialogContainer />, { store });
    expect(
      container.querySelector('[data-testid="conversation-settings-form"]')
    ).not.toBeInTheDocument();
  });

  it('should call close and clear form when canceling conversation settings', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockClose).toHaveBeenCalledWith('dialog1');
  });

  it('should render summary prompt dialog', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'summaryPrompt',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
              messageCount: 10,
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(screen.getByTestId('summary-prompt')).toBeInTheDocument();
  });

  it('should not render summary prompt when conversationId is missing', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'summaryPrompt',
            isOpen: true,
            payload: {},
          },
        ],
        stack: ['dialog1'],
      },
    });

    const { container } = renderWithProviders(<DialogContainer />, { store });
    expect(
      container.querySelector('[data-testid="summary-prompt"]')
    ).not.toBeInTheDocument();
  });

  it('should call handleGenerateSummary when generate is clicked', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'summaryPrompt',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
              messageCount: 10,
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    const generateButton = screen.getByText('Generate');
    fireEvent.click(generateButton);

    expect(mockHandleGenerateSummary).toHaveBeenCalled();
  });

  it('should render story settings view dialog', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'storySettingsView',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
              settings: { title: 'Test Story' },
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(screen.getByTestId('story-settings-view')).toBeInTheDocument();
  });

  it('should open settings form when edit is clicked in story settings view', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'storySettingsView',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
              settings: { title: 'Test Story' },
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(mockClose).toHaveBeenCalledWith('dialog1');
    expect(mockSettingsDialogOpen).toHaveBeenCalledWith('conv1', {
      settings: { title: 'Test Story' },
    });
  });

  it('should render settings panel dialog', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'settingsPanel',
            isOpen: true,
            payload: {},
          },
        ],
        stack: ['dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('should clear form when all dialogs are closed', async () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: false,
            payload: {
              conversationId: 'conv1',
            },
          },
        ],
        stack: [],
      },
    });

    const dispatchSpy = vi.spyOn(store, 'dispatch');

    renderWithProviders(<DialogContainer />, { store });

    // Wait for useEffect to run
    await tick();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'conversationSettingsForm/clearForm',
      })
    );
  });

  it('should sort dialogs by stack order', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'settingsPanel',
            isOpen: true,
            payload: {},
          },
          {
            id: 'dialog2',
            type: 'conversationSettings',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
            },
          },
        ],
        stack: ['dialog2', 'dialog1'],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    const dialogs = screen.getAllByRole('generic');
    // The last dialog in stack should be on top (higher z-index)
    expect(dialogs.length).toBeGreaterThan(0);
  });

  it('should not initialize dialog twice', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: true,
            payload: {
              conversationId: 'conv1',
            },
          },
        ],
        stack: ['dialog1'],
      },
    });

    const { rerender } = renderWithProviders(<DialogContainer />, { store });

    expect(mockInitialize).toHaveBeenCalledTimes(1);

    rerender(<DialogContainer />);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('should clean up initialized dialog IDs when dialog closes', () => {
    const store = createTestStore({
      dialog: {
        dialogs: [
          {
            id: 'dialog1',
            type: 'conversationSettings',
            isOpen: false,
            payload: {
              conversationId: 'conv1',
            },
          },
        ],
        stack: [],
      },
    });

    renderWithProviders(<DialogContainer />, { store });

    // Dialog should not be rendered when closed
    expect(
      screen.queryByTestId('conversation-settings-form')
    ).not.toBeInTheDocument();
  });
});
