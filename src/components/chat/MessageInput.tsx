import React, { useState } from 'react';
import { useI18n } from '@/i18n';
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
  placeholder,
}) => {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const defaultPlaceholder = placeholder || t('messages.inputPlaceholder');

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
        placeholder={defaultPlaceholder}
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
          {loading ? t('messages.sending') : t('messages.send')}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
