import React, { useCallback, useState } from 'react';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useI18n } from '@/i18n/i18n';
import { ChatMessagePart } from '@/types';
import styles from './ChatInterface.module.scss';

const ChatInput: React.FC = () => {
  const { t } = useI18n();
  const { handleSendMessage, activeConversationId } = useConversationManagement();
  const { isSending } = useChatState();
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputMode, setInputMode] = useState<'storyAction' | 'freeChat'>(
    'freeChat'
  );

  const onSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content && selectedFiles.length === 0) return;
    const messageParts: ChatMessagePart[] = [];
    if (content) {
      messageParts.push({ type: 'text', content });
    }
    selectedFiles.forEach((file) => {
      const mimeType = file.type || 'application/octet-stream';
      messageParts.push({
        type: mimeType.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        localFile: file,
      });
    });
    await handleSendMessage(content, {
      messageParts,
      inputMode,
    });
    setText('');
    setSelectedFiles([]);
  }, [handleSendMessage, inputMode, selectedFiles, text]);

  // Keep UX focused on story flow; free-chat is available only after conversation starts.
  if (!activeConversationId) {
    return null;
  }

  return (
    <div className={styles.freeChatBar}>
      <select
        value={inputMode}
        onChange={(e) =>
          setInputMode(e.target.value as 'storyAction' | 'freeChat')
        }
        disabled={isSending}
        aria-label='input-mode'
      >
        <option value='freeChat'>Free chat</option>
        <option value='storyAction'>Story action</option>
      </select>
      <input
        type='text'
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void onSubmit();
          }
        }}
        placeholder={t('messages.inputPlaceholder')}
        disabled={isSending}
        aria-label={t('messages.inputPlaceholder')}
      />
      <input
        type='file'
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setSelectedFiles(files.slice(0, 4));
        }}
        disabled={isSending}
        aria-label='chat-attachments'
      />
      {selectedFiles.length > 0 ? (
        <span aria-label='attachment-selection'>
          {selectedFiles.map((file) => file.name).join(', ')}
        </span>
      ) : null}
      <button
        type='button'
        onClick={() => void onSubmit()}
        disabled={isSending || (!text.trim() && selectedFiles.length === 0)}
      >
        {isSending ? t('messages.sending') : t('messages.send')}
      </button>
    </div>
  );
};

export default ChatInput;
