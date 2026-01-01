/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 *
 * Mock factories for test files
 * Provides type-safe mock creation utilities
 */

import { vi } from 'vitest';
import * as useChatState from '@/hooks/useChatState';
import * as useSettingsState from '@/hooks/useSettingsState';
import * as useToast from '@/hooks/useToast';
import * as useI18n from '@/i18n/i18n';
import * as useConversationClient from '@/hooks/useConversationClient';
import * as useStoryProgress from '@/hooks/useStoryProgress';
import * as useConversationManagement from '@/hooks/useConversationManagement';
import * as useStoryActions from '@/hooks/useStoryActions';
import * as useServerState from '@/hooks/useServerState';
import * as useFlaskPort from '@/hooks/useFlaskPort';
import * as useUIState from '@/hooks/useUIState';
import * as useDialog from '@/hooks/useDialog';
import * as useAiClient from '@/hooks/useAiClient';
import * as useMockMode from '@/hooks/useMockMode';
import * as useConversationSettingsForm from '@/hooks/useConversationSettingsForm';
import * as useConversationSettingsGeneration from '@/hooks/useConversationSettingsGeneration';
import * as useConversationSettingsConverter from '@/hooks/useConversationSettingsConverter';

// Type aliases for cleaner code
type ChatStateReturn = ReturnType<typeof useChatState.useChatState>;
type SettingsStateReturn = ReturnType<typeof useSettingsState.useSettingsState>;
type ToastReturn = ReturnType<typeof useToast.useToast>;
type I18nReturn = ReturnType<typeof useI18n.useI18n>;
type ConversationClientReturn = ReturnType<
  typeof useConversationClient.useConversationClient
>;
type StoryProgressReturn = ReturnType<typeof useStoryProgress.useStoryProgress>;
type ConversationManagementReturn = ReturnType<
  typeof useConversationManagement.useConversationManagement
>;
type StoryActionsReturn = ReturnType<typeof useStoryActions.useStoryActions>;
type ServerStateReturn = ReturnType<typeof useServerState.useServerState>;
type FlaskPortReturn = ReturnType<typeof useFlaskPort.useFlaskPort>;
type UIStateReturn = ReturnType<typeof useUIState.useUIState>;
type ConversationSettingsDialogReturn = ReturnType<
  typeof useDialog.useConversationSettingsDialog
>;
type SummaryPromptDialogReturn = ReturnType<
  typeof useDialog.useSummaryPromptDialog
>;
type AiClientReturn = ReturnType<typeof useAiClient.useAiClient>;
type MockModeReturn = ReturnType<typeof useMockMode.useMockMode>;
type ConversationSettingsFormReturn = ReturnType<
  typeof useConversationSettingsForm.useConversationSettingsForm
>;
type ConversationSettingsGenerationReturn = ReturnType<
  typeof useConversationSettingsGeneration.useConversationSettingsGeneration
>;
type ConversationSettingsConverterReturn = ReturnType<
  typeof useConversationSettingsConverter.useConversationSettingsConverter
>;

/**
 * Create a mock ChatState with all required properties
 */
export const createMockChatState = (
  overrides: Partial<ChatStateReturn> = {}
): ChatStateReturn => ({
  messages: [],
  models: [],
  selectedModel: '',
  isSending: false,
  currentMessage: '',
  conversationHistory: [],
  activeConversationId: null,
  setMessages: vi.fn(),
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  removeMessage: vi.fn(),
  clearMessages: vi.fn(),
  setModels: vi.fn(),
  addModel: vi.fn(),
  removeModel: vi.fn(),
  setSelectedModel: vi.fn(),
  setSending: vi.fn(),
  setCurrentMessage: vi.fn(),
  clearCurrentMessage: vi.fn(),
  setConversationHistory: vi.fn(),
  addConversation: vi.fn(),
  updateConversation: vi.fn(),
  removeConversation: vi.fn(),
  clearConversationHistory: vi.fn(),
  setActiveConversation: vi.fn(),
  loadConversation: vi.fn(),
  resetChat: vi.fn(),
  sendMessage: vi.fn(),
  ...overrides,
});

import type { AppSettings } from '@/types';

/**
 * Deep partial type helper - makes all nested properties optional
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Default settings structure for tests
 */
const getDefaultSettings = (): AppSettings => ({
  general: {
    language: 'en',
    autoStart: false,
    minimizeToTray: false,
    startWithSystem: false,
  },
  appearance: {
    theme: 'auto',
    fontSize: 'medium',
    fontFamily: 'default',
  },
  ai: {
    provider: 'ollama',
    ollama: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
      maxTokens: 2048,
      temperature: 0.7,
    },
    deepseek: {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: '',
      timeout: 30000,
      maxTokens: 2048,
      temperature: 0.7,
    },
  },
  advanced: {
    enableStreaming: true,
    apiTimeout: 30000,
    maxRetries: 3,
    logLevel: 'info',
    enableDiagnostics: false,
  },
});

/**
 * Deep merge helper for nested objects
 * Merges source into target, preserving target's structure
 */
const deepMerge = <T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] === undefined) continue;

    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key],
        source[key] as Partial<T[Extract<keyof T, string>]>
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }
  return result;
};

/**
 * Create a mock SettingsState with all required properties
 * Supports deep merging of settings overrides
 */
export const createMockSettingsState = (
  overrides: Omit<Partial<SettingsStateReturn>, 'settings'> & {
    settings?: DeepPartial<AppSettings>;
  } = {}
): SettingsStateReturn => {
  const defaultSettings = getDefaultSettings();
  const settingsOverrides = (overrides.settings || {}) as Partial<AppSettings>;

  // Type assertion is safe because defaultSettings is complete and we only merge partials
  const mergedSettings = deepMerge(defaultSettings, settingsOverrides);
  return {
    // @ts-expect-error - Type assertion is safe: defaultSettings is complete, we only merge partials
    settings: mergedSettings as AppSettings,
    updateSettings: vi.fn(),
    setSettings: vi.fn(),
    resetSettings: vi.fn(),
    updateAiProvider: vi.fn(),
    updateOllamaConfig: vi.fn(),
    updateDeepSeekConfig: vi.fn(),
    updateGeneralSettings: vi.fn(),
    updateAppearanceSettings: vi.fn(),
    updateAdvancedSettings: vi.fn(),
    setSettingsOpen: vi.fn(),
    setCurrentTab: vi.fn(),
    setHasUnsavedChanges: vi.fn(),
    markSettingsSaved: vi.fn(),
    isSettingsOpen: false,
    hasUnsavedChanges: false,
    currentTab: 'general',
    ...overrides,
  };
};

/**
 * Helper to create mock settings state with a specific AI provider
 */
export const createMockSettingsStateWithProvider = (
  provider: 'ollama' | 'deepseek',
  overrides: Partial<SettingsStateReturn> = {}
): SettingsStateReturn => {
  const defaultSettings = getDefaultSettings();
  return createMockSettingsState({
    settings: {
      ...defaultSettings,
      ai: {
        ...defaultSettings.ai,
        provider,
      },
    },
    ...overrides,
  });
};

/**
 * Create a mock Toast with all required properties
 */
export const createMockToast = (
  overrides: Partial<ToastReturn> = {}
): ToastReturn => ({
  toasts: [],
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
  removeToast: vi.fn(),
  ...overrides,
});

/**
 * Create a mock I18n with all required properties
 */
export const createMockI18n = (
  overrides: Partial<I18nReturn> = {}
): I18nReturn => ({
  locale: 'en',
  setLocale: vi.fn(),
  t: vi.fn((key: string) => key),
  ...overrides,
});

/**
 * Create a mock ConversationClient with all required properties
 */
export const createMockConversationClient = (
  overrides: Partial<ConversationClientReturn> = {}
): ConversationClientReturn => ({
  getConversationsList: vi.fn(),
  getConversationSettings: vi.fn(),
  createOrUpdateSettings: vi.fn(),
  getConversationMessages: vi.fn(),
  deleteConversation: vi.fn(),
  generateOutline: vi.fn(),
  getSummary: vi.fn(),
  generateSummary: vi.fn(),
  saveSummary: vi.fn(),
  getProgress: vi.fn(),
  confirmOutline: vi.fn(),
  updateProgress: vi.fn(),
  getCharacters: vi.fn(),
  updateCharacter: vi.fn(),
  generateCharacter: vi.fn(),
  deleteLastMessage: vi.fn(),
  ...overrides,
});

/**
 * Create a mock StoryProgress with all required properties
 */
export const createMockStoryProgress = (
  overrides: Partial<StoryProgressReturn> = {}
): StoryProgressReturn => ({
  progress: null,
  loading: false,
  refresh: vi.fn(),
  ...overrides,
});

/**
 * Create a mock ConversationManagement with all required properties
 */
export const createMockConversationManagement = (
  overrides: Partial<ConversationManagementReturn> = {}
): ConversationManagementReturn => ({
  conversations: [],
  activeConversationId: null,
  conversationSettings: undefined,
  isNewConversation: false,
  pendingConversationId: null,
  loading: false,
  summaryMessageCount: 0,
  handleNewConversation: vi.fn(),
  handleSelectConversation: vi.fn(),
  handleDeleteConversation: vi.fn(),
  handleSaveSettings: vi.fn(),
  handleEditSettings: vi.fn(),
  handleSendMessage: vi.fn(),
  handleGenerateSummary: vi.fn(),
  handleSaveSummary: vi.fn(),
  loadConversations: vi.fn(),
  ...overrides,
});

/**
 * Create a mock StoryActions with all required properties
 */
export const createMockStoryActions = (
  overrides: Partial<StoryActionsReturn> = {}
): StoryActionsReturn => ({
  handleGenerateStory: vi.fn(),
  handleConfirmSection: vi.fn(),
  handleRewriteSection: vi.fn(),
  handleModifySection: vi.fn(),
  ...overrides,
});

/**
 * Create a mock ServerState with all required properties
 */
export const createMockServerState = (
  overrides: Partial<ServerStateReturn> = {}
): ServerStateReturn => ({
  pythonServerStatus: 'stopped',
  ollamaStatus: 'checking',
  isServerLoading: false,
  serverError: null,
  flaskPort: null,
  apiUrl: '',
  setPythonServerStatus: vi.fn(),
  setOllamaStatus: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
  ...overrides,
});

/**
 * Create a mock FlaskPort with all required properties
 */
export const createMockFlaskPort = (
  overrides: Partial<FlaskPortReturn> = {}
): FlaskPortReturn => ({
  port: null,
  apiUrl: '',
  refetch: vi.fn(),
  waitForPort: vi.fn(),
  ...overrides,
});

/**
 * Create a mock UIState with all required properties
 */
export const createMockUIState = (
  overrides: Partial<UIStateReturn> = {}
): UIStateReturn => ({
  conversationListCollapsed: false,
  settingsSidebarCollapsed: false,
  setConversationListCollapsed: vi.fn(),
  setSettingsSidebarCollapsed: vi.fn(),
  isNewConversation: false,
  setIsNewConversation: vi.fn(),
  pendingConversationId: null,
  setPendingConversationId: vi.fn(),
  ...overrides,
});

/**
 * Create a mock ConversationSettingsDialog with all required properties
 */
export const createMockConversationSettingsDialog = (
  overrides: Partial<ConversationSettingsDialogReturn> = {}
): ConversationSettingsDialogReturn => ({
  open: vi.fn(),
  close: vi.fn(),
  isOpen: vi.fn(),
  ...overrides,
});

/**
 * Create a mock SummaryPromptDialog with all required properties
 */
export const createMockSummaryPromptDialog = (
  overrides: Partial<SummaryPromptDialogReturn> = {}
): SummaryPromptDialogReturn => ({
  open: vi.fn(),
  close: vi.fn(),
  isOpen: vi.fn(),
  ...overrides,
});

/**
 * Create a mock AiClient with all required properties
 */
export const createMockAiClient = (
  overrides: Partial<AiClientReturn> = {}
): AiClientReturn => ({
  sendMessage: vi.fn(),
  sendMessageStream: vi.fn(),
  loading: false,
  ...overrides,
});

/**
 * Create a mock MockMode with all required properties
 */
export const createMockMockMode = (
  overrides: Partial<MockModeReturn> = {}
): MockModeReturn => ({
  mockModeEnabled: false,
  toggleMockMode: vi.fn(),
  isDev: true,
  ...overrides,
});

/**
 * Create a mock ConversationSettingsForm with all required properties
 */
export const createMockConversationSettingsForm = (
  overrides: Partial<ConversationSettingsFormReturn> = {}
): ConversationSettingsFormReturn => ({
  formData: {
    title: '',
    background: '',
    supplement: '',
    characters: [],
    characterPersonality: {},
    characterIsMain: {},
    characterGenerationHints: '',
    outline: '',
    generatedOutline: null,
    outlineConfirmed: false,
    allowAutoGenerateCharacters: false,
    allowAutoGenerateMainCharacters: false,
  },
  conversationId: '',
  isNewConversation: false,
  isGeneratingCharacter: false,
  isGeneratingOutline: false,
  initialize: vi.fn(),
  updateField: vi.fn(),
  updateFields: vi.fn(),
  addCharacter: vi.fn(),
  removeCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  updateCharacterPersonality: vi.fn(),
  updateCharacterIsMain: vi.fn(),
  confirmOutline: vi.fn(),
  setGeneratingCharacter: vi.fn(),
  setGeneratingOutline: vi.fn(),
  resetForm: vi.fn(),
  clearForm: vi.fn(),
  validCharacters: [],
  validPersonality: {},
  validIsMain: {},
  ...overrides,
});

/**
 * Create a mock ConversationSettingsGeneration with all required properties
 */
export const createMockConversationSettingsGeneration = (
  overrides: Partial<ConversationSettingsGenerationReturn> = {}
): ConversationSettingsGenerationReturn => ({
  generateCharacter: vi.fn(),
  generateOutline: vi.fn(),
  isGeneratingCharacter: false,
  isGeneratingOutline: false,
  ...overrides,
});

/**
 * Create a mock ConversationSettingsConverter with all required properties
 */
export const createMockConversationSettingsConverter = (
  overrides: Partial<ConversationSettingsConverterReturn> = {}
): ConversationSettingsConverterReturn => ({
  toApiFormat: vi.fn(),
  fromApiFormat: vi.fn(),
  ...overrides,
});

/**
 * Create a mock API clients object for useApiClients hook
 */
export const createMockApiClients = (
  overrides: {
    conversationApi?: any;
    aiApi?: any;
    storyApi?: any;
    settingsApi?: any;
    serverApi?: any;
    apiFactory?: any;
  } = {}
) => ({
  conversationApi: overrides.conversationApi || {
    getConversationsList: vi.fn(),
    getConversationSettings: vi.fn(),
    createOrUpdateSettings: vi.fn(),
    getConversationMessages: vi.fn(),
    deleteConversation: vi.fn(),
    generateOutline: vi.fn(),
    getSummary: vi.fn(),
    generateSummary: vi.fn(),
    saveSummary: vi.fn(),
    getProgress: vi.fn(),
    confirmOutline: vi.fn(),
    updateProgress: vi.fn(),
    getCharacters: vi.fn(),
    updateCharacter: vi.fn(),
    generateCharacter: vi.fn(),
    deleteLastMessage: vi.fn(),
  },
  aiApi: overrides.aiApi || {
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
  },
  storyApi: overrides.storyApi || {
    generateStory: vi.fn(),
    confirmSection: vi.fn(),
    rewriteSection: vi.fn(),
    modifySection: vi.fn(),
  },
  settingsApi: overrides.settingsApi || {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  serverApi: overrides.serverApi || {
    checkHealth: vi.fn(),
    getModels: vi.fn(),
  },
  apiFactory: overrides.apiFactory || {
    updateSettings: vi.fn(),
  },
});
