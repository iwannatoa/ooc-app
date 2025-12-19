import {
  ConversationWithSettings,
  ConversationSettings,
  ChatMessage,
  CharacterRecord,
} from '@/types';
import {
  mockConversations,
  mockMessages,
  mockDelay,
  generateMockId,
} from './data';

// Mock 大纲生成内容
const mockOutlines = [
  `# 故事大纲

## 第一章：开端
- 介绍主要人物和背景设定
- 建立故事的基本冲突

## 第二章：发展
- 人物关系的发展
- 冲突逐渐升级

## 第三章：高潮
- 主要冲突达到顶点
- 关键转折点

## 第四章：结局
- 解决主要冲突
- 人物成长和变化`,

  `# 详细故事大纲

## 第一部分：背景设定
故事发生在一个充满魔法元素的世界中，主要角色包括勇敢的战士、智慧的法师和幽默的矮人。

## 第二部分：主要冲突
一群冒险者为了寻找失落的魔法神器而踏上旅程，途中遇到了各种挑战和敌人。

## 第三部分：故事发展
- 冒险者们在旅途中逐渐了解彼此
- 发现了关于神器的更多秘密
- 遇到了强大的敌人

## 第四部分：高潮与结局
最终决战，冒险者们必须团结一致才能成功。`,
];

let mockConversationsData = [...mockConversations];
let mockMessagesData: Record<string, ChatMessage[]> = { ...mockMessages };

export const mockConversationClient = {
  getConversationsList: async (): Promise<ConversationWithSettings[]> => {
    await mockDelay(300);
    return [...mockConversationsData];
  },

  getConversationSettings: async (
    conversationId: string
  ): Promise<ConversationSettings | null> => {
    await mockDelay(200);
    const conversation = mockConversationsData.find(
      (c) => c.id === conversationId
    );
    return conversation?.settings || null;
  },

  createOrUpdateSettings: async (
    settings: Partial<ConversationSettings>
  ): Promise<ConversationSettings> => {
    await mockDelay(400);
    const conversationId = settings.conversation_id || generateMockId();
    const newSettings: ConversationSettings = {
      conversation_id: conversationId,
      title: settings.title,
      background: settings.background,
      characters: settings.characters,
      character_personality: settings.character_personality,
      outline: settings.outline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 更新或创建故事
    const existingIndex = mockConversationsData.findIndex(
      (c) => c.id === conversationId
    );
    if (existingIndex >= 0) {
      mockConversationsData[existingIndex] = {
        ...mockConversationsData[existingIndex],
        title: newSettings.title || mockConversationsData[existingIndex].title,
        settings: newSettings,
        updatedAt: Date.now(),
      };
    } else {
      mockConversationsData.push({
        id: conversationId,
        title: newSettings.title || '未命名故事',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: newSettings,
      });
    }

    return newSettings;
  },

  getConversationMessages: async (
    conversationId: string
  ): Promise<ChatMessage[]> => {
    await mockDelay(200);
    // 返回当前故事的所有消息（包括新添加的）
    return [...(mockMessagesData[conversationId] || [])];
  },
  
  // 添加消息到故事（用于模拟后端保存）
  addMessageToConversation: (
    conversationId: string,
    message: ChatMessage
  ): void => {
    if (!mockMessagesData[conversationId]) {
      mockMessagesData[conversationId] = [];
    }
    mockMessagesData[conversationId].push(message);
  },

  deleteConversation: async (conversationId: string): Promise<boolean> => {
    await mockDelay(300);
    mockConversationsData = mockConversationsData.filter(
      (c) => c.id !== conversationId
    );
    delete mockMessagesData[conversationId];
    return true;
  },

  generateOutline: async (
    _background: string,
    characters?: string[],
    characterPersonality?: Record<string, string>
  ): Promise<string> => {
    await mockDelay(1500);
    const outline =
      mockOutlines[Math.floor(Math.random() * mockOutlines.length)];
    
    let customizedOutline = outline;
    if (characters && characters.length > 0) {
      customizedOutline += `\n\n## 主要人物\n`;
      characters.forEach((char, index) => {
        const personality = characterPersonality?.[char] || '待补充';
        customizedOutline += `${index + 1}. ${char} - ${personality}\n`;
      });
    }
    
    return customizedOutline;
  },

  getSummary: async (_conversationId: string) => {
    await mockDelay(200);
    return null;
  },

  generateSummary: async (
    conversationId: string,
    _provider: string,
    _model?: string
  ): Promise<string> => {
    await mockDelay(2000);
    return `这是故事 ${conversationId} 的总结内容。总结包含了故事的主要情节发展、关键事件和转折点，以及人物关系和互动。`;
  },

  saveSummary: async (
    conversationId: string,
    summary: string
  ) => {
    await mockDelay(300);
    return {
      conversation_id: conversationId,
      summary,
      message_count: 0,
      token_count: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  getProgress: async (_conversationId: string) => {
    await mockDelay(200);
    return null;
  },

  confirmOutline: async (_conversationId: string): Promise<boolean> => {
    await mockDelay(300);
    return true;
  },

  updateProgress: async (
    conversationId: string,
    progress: any
  ) => {
    await mockDelay(300);
    return {
      conversation_id: conversationId,
      outline_confirmed: true,
      current_section: 0,
      total_sections: null,
      status: 'idle',
      ...progress,
    };
  },

  getCharacters: async (
    _conversationId: string,
    _includeUnavailable: boolean = false
  ): Promise<CharacterRecord[]> => {
    await mockDelay(200);
    return [];
  },

  updateCharacter: async (
    conversationId: string,
    name: string,
    updates: {
      is_main?: boolean;
      is_unavailable?: boolean;
      notes?: string;
    }
  ): Promise<CharacterRecord> => {
    await mockDelay(300);
    return {
      id: 1,
      conversation_id: conversationId,
      name,
      is_main: updates.is_main ?? false,
      is_unavailable: updates.is_unavailable ?? false,
      first_appeared_message_id: undefined,
      is_auto_generated: false,
      notes: updates.notes ?? undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  generateCharacter: async (
    _conversationId: string,
    _provider: string,
    _model?: string,
    _characterHints?: string
  ) => {
    await mockDelay(2000);
    return {
      name: '新角色',
      personality: '这是一个新生成的角色性格描述。',
    };
  },

  deleteLastMessage: async (conversationId: string): Promise<boolean> => {
    await mockDelay(300);
    if (mockMessagesData[conversationId] && mockMessagesData[conversationId].length > 0) {
      mockMessagesData[conversationId].pop();
      return true;
    }
    return false;
  },
};

