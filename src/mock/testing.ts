/**
 * Test-only mock exports.
 * Keep Vitest-dependent helpers out of runtime mock entry.
 */

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
