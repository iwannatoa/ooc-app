/**
 * Mock data module
 * Used in development environment to provide simulated API responses
 */

export { mockRouter } from './router';
export {
  mockConversations,
  mockMessages,
  mockModels,
  mockDelay,
  generateMockId,
} from './data';
export {
  createMockChatState,
  createMockSettingsState,
  createMockSettingsStateWithProvider,
  createMockToast,
  createMockI18n,
  createMockConversationClient,
  createMockStoryProgress,
  createMockConversationManagement,
  createMockStoryActions,
  createMockServerState,
  createMockFlaskPort,
  createMockUIState,
  createMockConversationSettingsDialog,
  createMockSummaryPromptDialog,
  createMockAiClient,
  createMockApiClients,
  createMockMockMode,
  createMockConversationSettingsForm,
  createMockConversationSettingsGeneration,
  createMockConversationSettingsConverter,
} from './factories';
export {
  TestableBaseApiClient,
  createTestableBaseApiClient,
  createMockResponse,
  createMockReadableStream,
} from './testHelpers';
export {
  createMockAppSettings,
  createMockChatMessage,
  createMockChatMessages,
  createMockConversationSettings,
  createMockConversation,
  createMockConversationListResponse,
  createMockConversationSettingsResponse,
  createMockConversationMessagesResponse,
  createMockOutlineResponse,
  createMockSummaryResponse,
  createMockProgressResponse,
  createMockCharactersResponse,
  createMockCharacterResponse,
  createMockSuccessResponse,
  createMockErrorResponse,
} from './mockData';

// Import routes to auto-register them
import './routes';

// Mock mode state (managed by useMockMode hook)
let globalMockModeEnabled: boolean | null = null;

// Set global Mock mode state
export const setMockModeEnabled = (enabled: boolean): void => {
  globalMockModeEnabled = enabled;
};

// Check if Mock mode is enabled
export const isMockMode = (): boolean => {
  // If global state is set, use it first
  if (globalMockModeEnabled !== null) {
    return globalMockModeEnabled;
  }
  
  // Otherwise use environment variable
  return import.meta.env.VITE_USE_MOCK === 'true' || 
         (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false');
};

