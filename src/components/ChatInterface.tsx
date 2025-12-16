import React from 'react';
import { ChatMessage } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import styles from './ChatInterface.module.scss';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  disabled: boolean;
  maxLength: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading,
  disabled,
  maxLength,
}) => {
  return (
    <div className={styles.chatInterface}>
      <MessageList
        messages={messages}
        loading={loading}
      />
      <MessageInput
        onSend={onSendMessage}
        loading={loading}
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  );
};

export default ChatInterface;
