import React from 'react';
import { useI18n } from '@/i18n';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useUIState } from '@/hooks/useUIState';
import styles from './ConversationList.module.scss';

interface ConversationListProps {
  // Optional props for backward compatibility, but component will use hooks directly
  conversations?: never;
  activeConversationId?: never;
  onSelectConversation?: never;
  onDeleteConversation?: never;
  onNewConversation?: never;
  onRefresh?: never;
  onCollapseChange?: never;
  isCollapsed?: never;
  onToggleCollapse?: never;
}

const ConversationList: React.FC<ConversationListProps> = () => {
  const { t } = useI18n();
  const {
    conversations,
    activeConversationId,
    handleSelectConversation,
    handleDeleteConversation,
    handleNewConversation,
    loadConversations,
  } = useConversationManagement();
  const {
    conversationListCollapsed,
    setConversationListCollapsed,
  } = useUIState();
  
  const handleToggleCollapse = () => {
    setConversationListCollapsed(!conversationListCollapsed);
  };
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${styles.conversationList} ${conversationListCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <h2>{t('conversation.title')}</h2>
        <div className={styles.headerActions}>
          {!conversationListCollapsed && (
            <>
              <button
                onClick={loadConversations}
                className={styles.refreshButton}
                title={t('common.refresh')}
              >
                ↻
              </button>
              <button
                onClick={handleNewConversation}
                className={styles.newButton}
                title={t('conversation.newConversation')}
              >
                + {t('common.new')}
              </button>
            </>
          )}
          <button
            onClick={handleToggleCollapse}
            className={styles.collapseButton}
            title={conversationListCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {conversationListCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>
      {!conversationListCollapsed && (
        <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('conversation.noConversations')}</p>
            <button onClick={handleNewConversation} className={styles.emptyButton}>
              {t('conversation.newConversation')}
            </button>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.item} ${
                activeConversationId === conv.id ? styles.active : ''
              }`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <div className={styles.itemContent}>
                <div className={styles.title}>
                  {conv.settings?.title || conv.title || t('conversation.unnamedConversation')}
                </div>
                <div className={styles.meta}>
                  {formatDate(conv.settings?.updated_at || conv.updatedAt.toString())}
                </div>
              </div>
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv.id);
                }}
                title={t('conversation.deleteConversation')}
              >
                ×
              </button>
            </div>
          ))
        )}
        </div>
      )}
    </div>
  );
};

export default ConversationList;

