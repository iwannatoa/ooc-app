import React from 'react';
import { useAppSelector } from '@/hooks/redux';
import { Dialog } from '@/store/slices/dialogSlice';
import {
  ConversationSettingsForm,
  SummaryPrompt,
  StorySettingsView,
} from '../story';
import SettingsPanel from '../SettingsPanel';
import { useDialog, useConversationSettingsDialog } from '@/hooks/useDialog';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationManagement } from '@/hooks/useConversationManagement';

/**
 * Dialog Container Component
 *
 * Centralized component for rendering all dialogs in the application.
 * Supports dialog stacking and proper z-index management.
 *
 * This component should be rendered once at the app root level.
 */
export const DialogContainer: React.FC = () => {
  const dialogs = useAppSelector((state) => state.dialog.dialogs);
  const stack = useAppSelector((state) => state.dialog.stack);
  const { close } = useDialog();
  const settingsDialog = useConversationSettingsDialog();

  // Get business logic handlers
  const {
    currentSettings,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
  } = useAppLogic();

  const { activeConversationId, pendingConversationId, isNewConversation } =
    useConversationManagement();

  // Get open dialogs sorted by stack order
  const openDialogs = dialogs
    .filter((d) => d.isOpen)
    .sort((a, b) => {
      const aIndex = stack.indexOf(a.id);
      const bIndex = stack.indexOf(b.id);
      return aIndex - bIndex;
    });

  // Render dialog based on type
  const renderDialog = (dialog: Dialog) => {
    switch (dialog.type) {
      case 'conversationSettings': {
        const payload = (
          dialog as Extract<Dialog, { type: 'conversationSettings' }>
        ).payload;
        const conversationId =
          payload.conversationId ||
          pendingConversationId ||
          activeConversationId;

        if (!conversationId) return null;

        return (
          <ConversationSettingsForm
            key={dialog.id}
            conversationId={conversationId}
            settings={payload.settings || currentSettings}
            onSave={handleSaveSettings}
            onCancel={() => close(dialog.id)}
            isNewConversation={payload.isNewConversation ?? isNewConversation}
          />
        );
      }

      case 'summaryPrompt': {
        const payload = (dialog as Extract<Dialog, { type: 'summaryPrompt' }>)
          .payload;

        if (!payload.conversationId) return null;

        return (
          <SummaryPrompt
            key={dialog.id}
            conversationId={payload.conversationId}
            messageCount={payload.messageCount}
            onGenerate={handleGenerateSummary}
            onSave={handleSaveSummary}
            onCancel={() => close(dialog.id)}
          />
        );
      }

      case 'storySettingsView': {
        const payload = (
          dialog as Extract<Dialog, { type: 'storySettingsView' }>
        ).payload;

        if (!payload.conversationId || !payload.settings) return null;

        return (
          <StorySettingsView
            key={dialog.id}
            conversationId={payload.conversationId}
            settings={payload.settings}
            onEdit={() => {
              close(dialog.id);
              // Open settings form dialog
              if (payload.conversationId) {
                settingsDialog.open(payload.conversationId, {
                  settings: payload.settings,
                });
              }
            }}
            onClose={() => close(dialog.id)}
          />
        );
      }

      case 'settingsPanel': {
        return (
          <SettingsPanel
            key={dialog.id}
            open={true}
            onClose={() => close(dialog.id)}
          />
        );
      }

      case 'confirm': {
        // Confirm dialog is handled by ConfirmDialogContainer
        // This is kept for type completeness
        return null;
      }

      default:
        return null;
    }
  };

  return (
    <>
      {openDialogs.map((dialog, index) => (
        <div
          key={dialog.id}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000 + index,
            pointerEvents: index === openDialogs.length - 1 ? 'auto' : 'none',
          }}
        >
          {renderDialog(dialog)}
        </div>
      ))}
    </>
  );
};
