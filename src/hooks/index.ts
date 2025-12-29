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
export { useToast } from './useToast';

// ===== Business Logic Hooks =====
export { useAppLogic } from './useAppLogic';
export { useConversationManagement } from './useConversationManagement';
export { useStoryActions } from './useStoryActions';
export { useChatActions } from './useChatActions';

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

// ===== Dialog Hooks =====
export {
  useDialog,
  useConversationSettingsDialog,
  useSummaryPromptDialog,
  useStorySettingsViewDialog,
  useSettingsPanelDialog,
} from './useDialog';

// ===== Form Hooks =====
export { useConversationSettingsForm as useConversationSettingsFormRedux } from './useConversationSettingsForm';
export { useConversationSettingsGeneration as useConversationSettingsGenerationRedux } from './useConversationSettingsGeneration';
export { useConversationSettingsConverter } from './useConversationSettingsConverter';

// Export types from Redux slice
export type { ConversationSettingsFormData } from '@/store/slices/conversationSettingsFormSlice';

// ===== Redux Hooks =====
export { useAppDispatch, useAppSelector } from './redux';

