import React, { useState } from 'react';
import { ConversationWithSettings } from '@/types';
import { useI18n } from '@/i18n';
import styles from './ConversationList.module.scss';

interface ConversationListProps {
  conversations: ConversationWithSettings[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  onRefresh?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onRefresh,
  onCollapseChange,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useI18n();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const newCollapsed = !internalCollapsed;
      setInternalCollapsed(newCollapsed);
      onCollapseChange?.(newCollapsed);
    }
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
    <div className={`${styles.conversationList} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <h2>{t('conversation.title')}</h2>
        <div className={styles.headerActions}>
          {!isCollapsed && (
            <>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className={styles.refreshButton}
                  title={t('common.refresh')}
                >
                  ↻
                </button>
              )}
              <button
                onClick={onNewConversation}
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
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('conversation.noConversations')}</p>
            <button onClick={onNewConversation} className={styles.emptyButton}>
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
              onClick={() => onSelectConversation(conv.id)}
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
                  onDeleteConversation(conv.id);
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

