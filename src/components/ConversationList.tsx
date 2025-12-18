import React from 'react';
import { ConversationWithSettings } from '@/types';
import styles from './ConversationList.module.scss';

interface ConversationListProps {
  conversations: ConversationWithSettings[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}) => {
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
    <div className={styles.conversationList}>
      <div className={styles.header}>
        <h2>会话历史</h2>
        <button
          onClick={onNewConversation}
          className={styles.newButton}
          title="新建会话"
        >
          + 新建
        </button>
      </div>
      <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>暂无会话</p>
            <button onClick={onNewConversation} className={styles.emptyButton}>
              创建新会话
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
                  {conv.settings?.title || conv.title || '未命名会话'}
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
                title="删除会话"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;

