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

const MOCK_MODE_GLOBAL_KEY = '__OOC_MOCK_MODE_ENABLED__';

// Set global Mock mode state
export const setMockModeEnabled = (enabled: boolean): void => {
  (globalThis as unknown as Record<string, unknown>)[MOCK_MODE_GLOBAL_KEY] =
    enabled;
};

// Check if Mock mode is enabled
export const isMockMode = (): boolean => {
  const globalState = globalThis as unknown as Record<string, unknown>;
  const value = globalState[MOCK_MODE_GLOBAL_KEY];
  if (typeof value === 'boolean') {
    return value;
  }

  return (
    import.meta.env.VITE_USE_MOCK === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false')
  );
};

