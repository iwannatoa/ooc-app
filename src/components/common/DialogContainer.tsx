import React, { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { Dialog } from '@/store/slices/dialogSlice';
import {
  ConversationSettingsForm,
  SummaryPrompt,
  StorySettingsView,
} from '../story';
import { SettingsPanel } from '../settings';
import { useDialog, useConversationSettingsDialog } from '@/hooks/useDialog';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import { clearForm } from '@/store/slices/conversationSettingsFormSlice';

/**
 * Dialog Container Component
 *
 * Centralized component for rendering all dialogs in the application.
 * Supports dialog stacking and proper z-index management.
 *
 * This component should be rendered once at the app root level.
 */
export const DialogContainer: React.FC = () => {
  const dispatch = useAppDispatch();
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

  // Redux form state management
  const { initialize } = useConversationSettingsForm();

  // Clean up form state when all dialogs are closed
  useEffect(() => {
    const hasOpenDialogs = dialogs.some((d) => d.isOpen);
    if (!hasOpenDialogs) {
      dispatch(clearForm());
    }
  }, [dialogs, dispatch]);

  // Track initialized dialog IDs to avoid re-initialization
  const initializedDialogIdsRef = useRef<Set<string>>(new Set());

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

        // Initialize Redux form state when dialog opens (only once per dialog)
        if (dialog.isOpen && !initializedDialogIdsRef.current.has(dialog.id)) {
          initialize(
            conversationId,
            payload.settings || currentSettings,
            payload.isNewConversation ?? isNewConversation
          );
          initializedDialogIdsRef.current.add(dialog.id);
        }

        // Clean up when dialog closes
        if (!dialog.isOpen) {
          initializedDialogIdsRef.current.delete(dialog.id);
        }

        return (
          <ConversationSettingsForm
            key={dialog.id}
            onSave={handleSaveSettings}
            onCancel={() => {
              close(dialog.id);
              // Clear form state when dialog closes
              dispatch(clearForm());
              initializedDialogIdsRef.current.delete(dialog.id);
            }}
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
