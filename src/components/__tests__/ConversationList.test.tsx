import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import ConversationList from '../ConversationList';
import * as useI18n from '@/i18n/i18n';
import * as useConversationManagement from '@/hooks/useConversationManagement';
import * as useUIState from '@/hooks/useUIState';

vi.mock('@/i18n/i18n');
vi.mock('@/hooks/useConversationManagement');
vi.mock('@/hooks/useUIState');

describe('ConversationList', () => {
  const mockHandleSelectConversation = vi.fn();
  const mockHandleDeleteConversation = vi.fn();
  const mockHandleNewConversation = vi.fn();
  const mockLoadConversations = vi.fn();
  const mockSetConversationListCollapsed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });

    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      conversations: [
        {
          id: '1',
          title: 'Test Conversation',
          settings: { title: 'Test', updated_at: '2024-01-01T00:00:00Z' },
          updatedAt: new Date('2024-01-01'),
        },
      ],
      activeConversationId: '1',
      handleSelectConversation: mockHandleSelectConversation,
      handleDeleteConversation: mockHandleDeleteConversation,
      handleNewConversation: mockHandleNewConversation,
      loadConversations: mockLoadConversations,
    });

    (useUIState.useUIState as any).mockReturnValue({
      conversationListCollapsed: false,
      setConversationListCollapsed: mockSetConversationListCollapsed,
    });
  });

  it('should render conversation list', () => {
    renderWithProviders(<ConversationList />);
    expect(screen.getByText('conversation.title')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      conversations: [],
      activeConversationId: null,
      handleSelectConversation: mockHandleSelectConversation,
      handleDeleteConversation: mockHandleDeleteConversation,
      handleNewConversation: mockHandleNewConversation,
      loadConversations: mockLoadConversations,
    });

    renderWithProviders(<ConversationList />);
    expect(
      screen.getByText('conversation.noConversations')
    ).toBeInTheDocument();
  });

  it('should be able to collapse list', () => {
    renderWithProviders(<ConversationList />);
    const collapseButton = screen.getByTitle('common.collapse');
    fireEvent.click(collapseButton);
    expect(mockSetConversationListCollapsed).toHaveBeenCalledWith(true);
  });

  it('should be able to select conversation', () => {
    renderWithProviders(<ConversationList />);
    const conversationItem = screen.getByText('Test');
    fireEvent.click(conversationItem);
    expect(mockHandleSelectConversation).toHaveBeenCalledWith('1');
  });

  it('should be able to delete conversation', () => {
    renderWithProviders(<ConversationList />);
    const deleteButton = screen.getByTitle('conversation.deleteConversation');
    fireEvent.click(deleteButton);
    expect(mockHandleDeleteConversation).toHaveBeenCalledWith('1');
  });
});
