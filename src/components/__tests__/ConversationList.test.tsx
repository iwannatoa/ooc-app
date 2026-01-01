import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import ConversationList from '../ConversationList';
import * as useI18n from '@/i18n/i18n';
import * as useConversationManagement from '@/hooks/useConversationManagement';
import * as useUIState from '@/hooks/useUIState';
import { createMockI18n, createMockConversationManagement, createMockUIState } from '@/mock';

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

    vi.mocked(useI18n.useI18n).mockReturnValue(
      createMockI18n({
        t: (key: string) => key,
      })
    );

    vi.mocked(useConversationManagement.useConversationManagement).mockReturnValue(
      createMockConversationManagement({
        conversations: [
          {
            id: '1',
            title: 'Test Conversation',
            messages: [],
            createdAt: Date.now(),
            updatedAt: new Date('2024-01-01').getTime(),
            settings: { conversation_id: '1', title: 'Test', updated_at: '2024-01-01T00:00:00Z' },
          },
        ],
        activeConversationId: '1',
        handleSelectConversation: mockHandleSelectConversation,
        handleDeleteConversation: mockHandleDeleteConversation,
        handleNewConversation: mockHandleNewConversation,
        loadConversations: mockLoadConversations,
      })
    );

    vi.mocked(useUIState.useUIState).mockReturnValue(
      createMockUIState({
        conversationListCollapsed: false,
        setConversationListCollapsed: mockSetConversationListCollapsed,
      })
    );
  });

  it('should render conversation list', () => {
    renderWithProviders(<ConversationList />);
    expect(screen.getByText('conversation.title')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    vi.mocked(useConversationManagement.useConversationManagement).mockReturnValue(
      createMockConversationManagement({
        conversations: [],
        activeConversationId: null,
        handleSelectConversation: mockHandleSelectConversation,
        handleDeleteConversation: mockHandleDeleteConversation,
        handleNewConversation: mockHandleNewConversation,
        loadConversations: mockLoadConversations,
      })
    );

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

  it('should show expand button when collapsed', () => {
    vi.mocked(useUIState.useUIState).mockReturnValue(
      createMockUIState({
        conversationListCollapsed: true,
        setConversationListCollapsed: mockSetConversationListCollapsed,
      })
    );

    renderWithProviders(<ConversationList />);
    const expandButton = screen.getByTitle('common.expand');
    expect(expandButton).toBeInTheDocument();
    fireEvent.click(expandButton);
    expect(mockSetConversationListCollapsed).toHaveBeenCalledWith(false);
  });

  it('should use conversation title when settings title is missing', () => {
    (
      useConversationManagement.useConversationManagement
    ).mockReturnValue(
      createMockConversationManagement({
        conversations: [
          {
            id: '1',
            title: 'Fallback Title',
            messages: [],
            createdAt: Date.now(),
            updatedAt: new Date('2024-01-01').getTime(),
            settings: { conversation_id: '1', updated_at: '2024-01-01T00:00:00Z' },
          },
        ],
        activeConversationId: '1',
        handleSelectConversation: mockHandleSelectConversation,
        handleDeleteConversation: mockHandleDeleteConversation,
        handleNewConversation: mockHandleNewConversation,
        loadConversations: mockLoadConversations,
      })
    );

    renderWithProviders(<ConversationList />);
    expect(screen.getByText('Fallback Title')).toBeInTheDocument();
  });

  it('should use unnamed conversation text when both titles are missing', () => {
    (
      useConversationManagement.useConversationManagement
    ).mockReturnValue(
      createMockConversationManagement({
        conversations: [
          {
            id: '1',
            title: '',
            settings: { updated_at: '2024-01-01T00:00:00Z' },
            updatedAt: new Date('2024-01-01'),
          },
        ],
        activeConversationId: '1',
        handleSelectConversation: mockHandleSelectConversation,
        handleDeleteConversation: mockHandleDeleteConversation,
        handleNewConversation: mockHandleNewConversation,
        loadConversations: mockLoadConversations,
      })
    );

    renderWithProviders(<ConversationList />);
    expect(
      screen.getByText('conversation.unnamedConversation')
    ).toBeInTheDocument();
  });
});
