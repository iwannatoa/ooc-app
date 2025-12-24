import { useState, useCallback } from 'react';

export const useDialogState = () => {
  const [showDeleteLastMessageDialog, setShowDeleteLastMessageDialog] =
    useState(false);
  const [showDeleteConversationDialog, setShowDeleteConversationDialog] =
    useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);

  const openDeleteConversationDialog = useCallback((conversationId: string) => {
    setConversationToDelete(conversationId);
    setShowDeleteConversationDialog(true);
  }, []);

  const closeDeleteConversationDialog = useCallback(() => {
    setShowDeleteConversationDialog(false);
    setConversationToDelete(null);
  }, []);

  return {
    showDeleteLastMessageDialog,
    setShowDeleteLastMessageDialog,
    showDeleteConversationDialog,
    conversationToDelete,
    openDeleteConversationDialog,
    closeDeleteConversationDialog,
  };
};

