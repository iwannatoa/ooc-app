/**
 * Hooks module - Centralized export point
 * 
 * This file provides a centralized export point for all custom hooks,
 * organized by functional categories for better code organization.
 */

// ===== State Management Hooks =====
export { useChatState } from './useChatState';
export { useSettingsState } from './useSettingsState';
export { useServerState } from './useServerState';
export { useUIState } from './useUIState';
export { useDialogState } from './useDialogState';
export { useToast } from './useToast';

// ===== Business Logic Hooks =====
export { useAppLogic } from './useAppLogic';
export { useConversationManagement } from './useConversationManagement';
export { useStoryActions } from './useStoryActions';
export { useChatActions } from './useChatActions';
export { useChatControls } from './useChatControls';

// ===== API Client Hooks =====
export { useAiClient } from './useAiClient';
export { useConversationClient } from './useConversationClient';
export { useStoryClient } from './useStoryClient';
export { useApiClients } from './useApiClients';

// ===== Utility Hooks =====
export { useAppearance } from './useAppearance';
export { useAppSettings } from './useAppSettings';
export { useFlaskPort } from './useFlaskPort';
export { useMockMode } from './useMockMode';
export { useErrorHandler } from './useErrorHandler';

// ===== Dialog Hooks =====
export {
  useDialog,
  useConversationSettingsDialog,
  useSummaryPromptDialog,
  useStorySettingsViewDialog,
  useSettingsPanelDialog,
} from './useDialog';

// ===== Redux Hooks =====
export { useAppDispatch, useAppSelector } from './redux';

