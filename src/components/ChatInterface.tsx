import React from 'react';
import { ChatMessage } from '@/types';
import MessageList from './MessageList';
import StoryActions from './StoryActions';
import styles from './ChatInterface.module.scss';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onGenerate: () => void;
  onConfirm: () => void;
  onRewrite: (feedback: string) => void;
  onModify: (feedback: string) => void;
  onAddSettings: () => void;
  onDeleteLastMessage?: () => void;
  loading: boolean;
  disabled: boolean;
  canConfirm?: boolean;
  canGenerate?: boolean;
  canDeleteLast?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onGenerate,
  onConfirm,
  onRewrite,
  onModify,
  onAddSettings,
  onDeleteLastMessage,
  loading,
  disabled,
  canConfirm = false,
  canGenerate = true,
  canDeleteLast = false,
}) => {
  return (
    <div className={styles.chatInterface}>
      <MessageList
        messages={messages}
        loading={loading}
      />
      <StoryActions
        onGenerate={onGenerate}
        onConfirm={onConfirm}
        onRewrite={onRewrite}
        onModify={onModify}
        onAddSettings={onAddSettings}
        onDeleteLastMessage={onDeleteLastMessage}
        loading={loading}
        disabled={disabled}
        canConfirm={canConfirm}
        canGenerate={canGenerate}
        canDeleteLast={canDeleteLast}
      />
    </div>
  );
};

export default ChatInterface;
