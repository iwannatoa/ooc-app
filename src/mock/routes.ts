/**
 * Mock Routes Registration
 *
 * Registers all mock API routes using the router system.
 * This file centralizes all mock route definitions.
 */

import { mockRouter } from './router';
import {
  mockConversations,
  mockMessages,
  mockDelay,
  generateMockId,
} from './data';
import {
  ConversationWithSettings,
  ChatMessage,
  CharacterRecord,
} from '@/types';

// Mock outline generation content
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

// Mock data state (simulating backend state)
let mockConversationsData = [...mockConversations];
let mockMessagesData: Record<string, ChatMessage[]> = { ...mockMessages };

/**
 * Register all conversation API routes
 */
export function registerConversationRoutes(): void {
  // GET /api/conversations/list
  mockRouter.register('GET', '/api/conversations/list', async () => {
    await mockDelay(300);
    return {
      success: true,
      conversations: mockConversationsData.map((conv) => ({
        conversation_id: conv.id,
        title: conv.title,
        created_at: new Date(conv.createdAt).toISOString(),
        updated_at: new Date(conv.updatedAt).toISOString(),
        ...conv.settings,
      })),
    };
  });

  // GET /api/conversation/settings
  mockRouter.register(
    'GET',
    '/api/conversation/settings',
    async ({ query }) => {
      await mockDelay(200);
      const conversation = mockConversationsData.find(
        (c) => c.id === query.conversation_id
      );
      if (conversation) {
        return {
          success: true,
          settings: conversation.settings,
        };
      }
      return {
        success: false,
        error: 'Settings not found',
      };
    }
  );

  // POST /api/conversation/settings
  mockRouter.register(
    'POST',
    '/api/conversation/settings',
    async ({ body }) => {
      await mockDelay(400);
      const conversationId = body.conversation_id || generateMockId();
      const newSettings = {
        conversation_id: conversationId,
        title: body.title,
        background: body.background,
        characters: body.characters,
        character_personality: body.character_personality,
        outline: body.outline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existingIndex = mockConversationsData.findIndex(
        (c) => c.id === conversationId
      );
      if (existingIndex >= 0) {
        mockConversationsData[existingIndex] = {
          ...mockConversationsData[existingIndex],
          title:
            newSettings.title || mockConversationsData[existingIndex].title,
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

      return {
        success: true,
        settings: newSettings,
      };
    }
  );

  // GET /api/conversation
  mockRouter.register('GET', '/api/conversation', async ({ query }) => {
    await mockDelay(200);
    const messages = mockMessagesData[query.conversation_id] || [];
    return {
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: new Date(msg.timestamp || Date.now()).toISOString(),
      })),
    };
  });

  // DELETE /api/conversation
  mockRouter.register('DELETE', '/api/conversation', async ({ body }) => {
    await mockDelay(300);
    const conversationId = body.conversation_id;
    mockConversationsData = mockConversationsData.filter(
      (c) => c.id !== conversationId
    );
    delete mockMessagesData[conversationId];
    return {
      success: true,
    };
  });

  // POST /api/conversation/generate-outline
  mockRouter.register(
    'POST',
    '/api/conversation/generate-outline',
    async ({ body }) => {
      await mockDelay(1500);
      const outline =
        mockOutlines[Math.floor(Math.random() * mockOutlines.length)];
      let customizedOutline = outline;
      if (body.characters && body.characters.length > 0) {
        customizedOutline += `\n\n## 主要人物\n`;
        body.characters.forEach((char: string, index: number) => {
          const personality = body.character_personality?.[char] || '待补充';
          customizedOutline += `${index + 1}. ${char} - ${personality}\n`;
        });
      }
      return {
        success: true,
        outline: customizedOutline,
      };
    }
  );

  // POST /api/conversation/generate-outline-stream
  mockRouter.register(
    'POST',
    '/api/conversation/generate-outline-stream',
    async ({ body }) => {
      // Note: Streaming is handled differently, this is a placeholder
      // Actual streaming should be handled in the stream method
      await mockDelay(1500);
      const outline =
        mockOutlines[Math.floor(Math.random() * mockOutlines.length)];
      return {
        success: true,
        outline,
      };
    }
  );

  // GET /api/conversation/summary
  mockRouter.register('GET', '/api/conversation/summary', async ({ query }) => {
    await mockDelay(200);
    return {
      success: false,
      error: 'Summary not found',
    };
  });

  // POST /api/conversation/summary/generate
  mockRouter.register(
    'POST',
    '/api/conversation/summary/generate',
    async ({ body }) => {
      await mockDelay(2000);
      return {
        success: true,
        summary: `这是故事 ${body.conversation_id} 的总结内容。总结包含了故事的主要情节发展、关键事件和转折点，以及人物关系和互动。`,
      };
    }
  );

  // POST /api/conversation/summary
  mockRouter.register('POST', '/api/conversation/summary', async ({ body }) => {
    await mockDelay(300);
    return {
      success: true,
      summary: {
        conversation_id: body.conversation_id,
        summary: body.summary,
        message_count: 0,
        token_count: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  });

  // GET /api/conversation/progress
  mockRouter.register(
    'GET',
    '/api/conversation/progress',
    async ({ query }) => {
      await mockDelay(200);
      return {
        success: true,
        progress: null,
      };
    }
  );

  // POST /api/conversation/progress/confirm-outline
  mockRouter.register(
    'POST',
    '/api/conversation/progress/confirm-outline',
    async ({ body }) => {
      await mockDelay(300);
      return {
        success: true,
      };
    }
  );

  // POST /api/conversation/progress
  mockRouter.register(
    'POST',
    '/api/conversation/progress',
    async ({ body }) => {
      await mockDelay(300);
      return {
        success: true,
        progress: {
          conversation_id: body.conversation_id,
          outline_confirmed: true,
          current_section: 0,
          total_sections: null,
          status: 'idle',
          ...body,
        },
      };
    }
  );

  // GET /api/conversation/characters
  mockRouter.register('GET', '/api/conversation/characters', async () => {
    await mockDelay(200);
    return {
      success: true,
      characters: [],
    };
  });

  // POST /api/conversation/characters/update
  mockRouter.register(
    'POST',
    '/api/conversation/characters/update',
    async ({ body }) => {
      await mockDelay(300);
      return {
        success: true,
        character: {
          id: 1,
          conversation_id: body.conversation_id,
          name: body.name,
          is_main: body.is_main ?? false,
          is_unavailable: body.is_unavailable ?? false,
          first_appeared_message_id: undefined,
          is_auto_generated: false,
          notes: body.notes ?? undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
  );

  // POST /api/conversation/characters/generate
  mockRouter.register(
    'POST',
    '/api/conversation/characters/generate',
    async ({ body }) => {
      await mockDelay(2000);
      return {
        success: true,
        character: {
          name: '新角色',
          personality: '这是一个新生成的角色性格描述。',
        },
      };
    }
  );

  // POST /api/conversation/delete-last-message
  mockRouter.register(
    'POST',
    '/api/conversation/delete-last-message',
    async ({ body }) => {
      await mockDelay(300);
      const conversationId = body.conversation_id;
      if (
        mockMessagesData[conversationId] &&
        mockMessagesData[conversationId].length > 0
      ) {
        mockMessagesData[conversationId].pop();
        return {
          success: true,
        };
      }
      return {
        success: false,
      };
    }
  );
}

/**
 * Register all AI API routes
 */
export function registerAiRoutes(): void {
  // POST /api/chat
  mockRouter.register('POST', '/api/chat', async ({ body }) => {
    await mockDelay(1000 + Math.random() * 1000);
    const mockResponses = [
      '这是一个很有趣的问题。让我为你详细解释一下...',
      '根据你提供的信息，我认为...',
      '从故事的角度来看，这里有几个关键点...',
    ];
    const response =
      mockResponses[Math.floor(Math.random() * mockResponses.length)];
    return {
      success: true,
      response: response + `\n\n${body.message}这个问题让我想到了很多。`,
      model: 'deepseek-chat',
    };
  });

  // POST /api/chat-stream
  mockRouter.register('POST', '/api/chat-stream', async ({ body }) => {
    // Streaming is handled in stream method
    await mockDelay(1000);
    const mockResponses = [
      '这是一个很有趣的问题。让我为你详细解释一下...',
      '根据你提供的信息，我认为...',
    ];
    return {
      success: true,
      response: mockResponses[Math.floor(Math.random() * mockResponses.length)],
    };
  });
}

/**
 * Register all Story API routes
 */
export function registerStoryRoutes(): void {
  // POST /api/story/generate
  mockRouter.register('POST', '/api/story/generate', async ({ body }) => {
    await mockDelay(800);
    const storyTemplates = [
      '这是生成的故事内容。故事继续发展，角色们面临着新的挑战和机遇。',
      '在新的章节中，主角发现了重要的线索，这将改变整个故事的走向。',
    ];
    return {
      success: true,
      response:
        storyTemplates[Math.floor(Math.random() * storyTemplates.length)],
      story_progress: {
        conversation_id: body.conversation_id,
        current_section: 0,
        status: 'completed',
      },
    };
  });

  // POST /api/story/generate-stream
  mockRouter.register(
    'POST',
    '/api/story/generate-stream',
    async ({ body }) => {
      // Streaming is handled in stream method
      await mockDelay(800);
      return {
        success: true,
        response: '这是流式生成的故事内容。',
      };
    }
  );

  // POST /api/story/confirm
  mockRouter.register('POST', '/api/story/confirm', async ({ body }) => {
    await mockDelay(800);
    return {
      success: true,
      response: '这是确认后生成的下一个章节内容。',
      story_progress: {
        conversation_id: body.conversation_id,
        current_section: 1,
        status: 'completed',
      },
    };
  });

  // POST /api/story/rewrite
  mockRouter.register('POST', '/api/story/rewrite', async ({ body }) => {
    await mockDelay(800);
    return {
      success: true,
      response: `[重写] 根据您的反馈"${body.feedback}"，这是重写后的故事内容。`,
    };
  });

  // POST /api/story/modify
  mockRouter.register('POST', '/api/story/modify', async ({ body }) => {
    await mockDelay(800);
    return {
      success: true,
      response: `[修改] 根据您的修改要求"${body.feedback}"，这是修改后的故事内容。`,
    };
  });
}

/**
 * Register all Settings API routes
 */
export function registerSettingsRoutes(): void {
  // GET /api/app-settings
  mockRouter.register('GET', '/api/app-settings', async () => {
    await mockDelay(200);
    return {
      success: true,
      settings: '{}',
    };
  });

  // POST /api/app-settings
  mockRouter.register('POST', '/api/app-settings', async () => {
    await mockDelay(200);
    return {
      success: true,
    };
  });

  // GET /api/app-settings/language
  mockRouter.register('GET', '/api/app-settings/language', async () => {
    await mockDelay(100);
    return {
      success: true,
      language: 'zh',
    };
  });

  // POST /api/app-settings/language
  mockRouter.register(
    'POST',
    '/api/app-settings/language',
    async ({ body }) => {
      await mockDelay(100);
      return {
        success: true,
        language: body.language || 'zh',
      };
    }
  );
}

/**
 * Register all Server API routes
 */
export function registerServerRoutes(): void {
  // GET /api/models
  mockRouter.register('GET', '/api/models', async ({ query }) => {
    await mockDelay(300);
    const { mockModels } = await import('./data');
    return {
      success: true,
      models: query.provider === 'ollama' ? mockModels : [],
    };
  });

  // GET /api/health
  mockRouter.register('GET', '/api/health', async () => {
    await mockDelay(100);
    return {
      status: 'healthy',
      ollama_available: true,
    };
  });
}

// Auto-register all routes when module is imported
registerConversationRoutes();
registerAiRoutes();
registerStoryRoutes();
registerSettingsRoutes();
registerServerRoutes();
