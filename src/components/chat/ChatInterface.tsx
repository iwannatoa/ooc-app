import React from 'react';
import { useChatState } from '@/hooks/useChatState';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationSettingsDialog } from '@/hooks/useDialog';
import MessageList from './MessageList';
import { StoryActions } from '../story';
import styles from './ChatInterface.module.scss';

interface ChatInterfaceProps {
  // Optional props for backward compatibility, but component will use hooks directly
  messages?: never;
  onGenerate?: never;
  onConfirm?: never;
  onRewrite?: never;
  onModify?: never;
  onAddSettings?: never;
  onDeleteLastMessage?: never;
  loading?: never;
  disabled?: never;
  canConfirm?: never;
  canGenerate?: never;
  canDeleteLast?: never;
}

const ChatInterface: React.FC<ChatInterfaceProps> = () => {
  const { messages, isSending } = useChatState();
  const { activeConversationId, currentSettings } = useConversationManagement();
  const {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
    handleDeleteLastMessage,
    canConfirm,
    canGenerate,
    canDeleteLast,
    isFirstChapter,
  } = useAppLogic();
  const settingsDialog = useConversationSettingsDialog();

  const handleAddSettings = () => {
    if (activeConversationId) {
      settingsDialog.open(activeConversationId, {
        settings: currentSettings,
      });
    }
  };

  return (
    <div className={styles.chatInterface}>
      <MessageList
        messages={messages}
        loading={isSending}
      />
      <StoryActions
        onGenerate={handleGenerateStory}
        onConfirm={handleConfirmSection}
        onRewrite={handleRewriteSection}
        onModify={handleModifySection}
        onAddSettings={handleAddSettings}
        onDeleteLastMessage={handleDeleteLastMessage}
        loading={isSending}
        disabled={!activeConversationId}
        canConfirm={canConfirm}
        canGenerate={canGenerate}
        canDeleteLast={canDeleteLast}
        isFirstChapter={isFirstChapter}
      />
    </div>
  );
};

export default ChatInterface;
