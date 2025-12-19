/**
 * Mock 数据模块
 * 用于开发环境，提供模拟的API响应
 */

export { mockConversationClient } from './conversationClient';
export { mockAiClient } from './aiClient';
export { mockServerClient } from './serverClient';
export { mockStoryClient } from './storyClient';
export {
  mockConversations,
  mockMessages,
  mockModels,
  mockDelay,
  generateMockId,
} from './data';

// Mock 模式状态（由 useMockMode hook 管理）
let globalMockModeEnabled: boolean | null = null;

// 设置全局 Mock 模式状态
export const setMockModeEnabled = (enabled: boolean): void => {
  globalMockModeEnabled = enabled;
};

// 检查是否启用 Mock 模式
export const isMockMode = (): boolean => {
  // 如果设置了全局状态，优先使用
  if (globalMockModeEnabled !== null) {
    return globalMockModeEnabled;
  }
  
  // 否则使用环境变量
  return import.meta.env.VITE_USE_MOCK === 'true' || 
         (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false');
};

