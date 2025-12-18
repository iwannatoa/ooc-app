/**
 * Mock 数据模块
 * 用于开发环境，提供模拟的API响应
 */

export { mockConversationClient } from './conversationClient';
export { mockAiClient } from './aiClient';
export { mockServerClient } from './serverClient';
export {
  mockConversations,
  mockMessages,
  mockModels,
  mockDelay,
  generateMockId,
} from './data';

// 检查是否启用 Mock 模式
export const isMockMode = (): boolean => {
  return import.meta.env.VITE_USE_MOCK === 'true' || 
         (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false');
};

