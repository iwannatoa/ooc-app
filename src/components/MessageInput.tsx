import React, { useState } from 'react';
import styles from './MessageInput.module.scss';

interface MessageInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  loading = false,
  disabled = false,
  maxLength = 4000,
  placeholder = '输入你的消息...',
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !loading && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.messageInput}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled || loading}
        rows={3}
        maxLength={maxLength}
        className={styles.textarea}
      />
      <div className={styles.inputActions}>
        <span className={styles.charCount}>
          {message.length}/{maxLength}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || loading || disabled}
          className={styles.sendButton}
        >
          {loading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
