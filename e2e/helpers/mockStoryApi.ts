import type { Page, Route } from '@playwright/test';

type Role = 'user' | 'assistant';

interface MockMessage {
  id: string;
  role: Role;
  content: string;
  created_at: string;
  attachments?: Array<{
    type: 'image' | 'file';
    name: string;
    mimeType?: string;
    sizeBytes?: number;
    status?: string;
  }>;
}

interface MockConversation {
  id: string;
  title: string;
  background: string;
  outline: string;
  created_at: string;
  updated_at: string;
  messages: MockMessage[];
  summary: string | null;
}

interface MockProgress {
  current_section: number;
  total_sections: number | null;
  outline_confirmed: boolean;
  status: string;
}

export interface MockApiState {
  conversations: Map<string, MockConversation>;
  progress: Map<string, MockProgress>;
  counters: {
    healthProbe: number;
    healthChecks: number;
    conversationList: number;
    conversationMessages: number;
    models: number;
  };
  /** Latest JSON string returned/served by mock GET `/api/app-settings`. */
  getAppSettingsJson: () => string;
}

const buildInitialAppSettingsJson = (): string =>
  JSON.stringify({
    general: {
      language: 'en',
      autoStart: false,
      minimizeToTray: true,
      startWithSystem: false,
    },
    appearance: {
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    ai: {
      provider: 'ollama',
      ollama: {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
      },
      deepseek: {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        timeout: 60000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      openai_compatible: {
        provider: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:1234/v1',
        model: 'gpt-4o-mini',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      openai: {
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4o-mini',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      azure: {
        provider: 'azure',
        baseUrl: 'https://example-resource.openai.azure.com/openai/v1',
        model: 'gpt-4o-mini',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      anthropic: {
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-5-sonnet-latest',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      glm: {
        provider: 'glm',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      kimi: {
        provider: 'kimi',
        baseUrl: 'https://api.moonshot.cn',
        model: 'moonshot-v1-8k',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      minimax: {
        provider: 'minimax',
        baseUrl: 'https://api.minimax.chat',
        model: 'MiniMax-Text-01',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
    },
    advanced: {
      enableStreaming: false,
      apiTimeout: 120000,
      maxRetries: 3,
      logLevel: 'info',
      enableDiagnostics: false,
      enableAnonymousTelemetry: false,
      enableFreeformNote: false,
    },
    profiles: [],
    activeProfileId: undefined,
  });

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, X-Flask-Instance-Id',
};

const nowIso = (): string => new Date().toISOString();

const json = async (route: Route, body: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
};

const readBody = (route: Route): Record<string, unknown> => {
  try {
    return route.request().postDataJSON() as Record<string, unknown>;
  } catch {
    const raw = route.request().postData() || '';
    if (!raw) {
      return {};
    }
    const fields = ['conversation_id', 'message', 'provider', 'model', 'input_mode'];
    const parsed: Record<string, unknown> = {};
    for (const field of fields) {
      const regex = new RegExp(`name="${field}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n`, 'm');
      const match = raw.match(regex);
      if (match && match[1] !== undefined) {
        parsed[field] = match[1];
      }
    }
    const fileNames = [...raw.matchAll(/filename="([^"]+)"/g)].map((m) => m[1]);
    if (fileNames.length > 0) {
      parsed._file_names = fileNames;
    }
    return parsed;
  }
};

const ensureConversation = (
  state: MockApiState,
  conversationId: string
): MockConversation => {
  const existing = state.conversations.get(conversationId);
  if (existing) {
    return existing;
  }

  const created: MockConversation = {
    id: conversationId,
    title: `Story ${conversationId.slice(-4)}`,
    background: '',
    outline: '',
    created_at: nowIso(),
    updated_at: nowIso(),
    messages: [],
    summary: null,
  };
  state.conversations.set(conversationId, created);
  state.progress.set(conversationId, {
    current_section: 0,
    total_sections: 3,
    outline_confirmed: true,
    status: 'draft',
  });
  return created;
};

const buildAssistantReply = (
  message: string,
  turn: number,
  previousAssistant: string | undefined
): string => {
  const anchor = previousAssistant
    ? `Continuing from "${previousAssistant.slice(0, 18)}..."`
    : 'Starting the story arc';
  return `Turn ${turn}: ${anchor}. Plot advances with: ${message}`;
};

export interface InstallMockStoryOptions {
  /** When true, the first POST `/api/chat-stream` returns 503 once (then succeeds). */
  failChatStreamOnce?: boolean;
}

export const installMockStoryApi = async (
  page: Page,
  options: InstallMockStoryOptions = {}
): Promise<MockApiState> => {
  let appSettingsJson = buildInitialAppSettingsJson();
  let chatStreamFailRemaining = options.failChatStreamOnce ? 1 : 0;

  const state: MockApiState = {
    conversations: new Map<string, MockConversation>(),
    progress: new Map<string, MockProgress>(),
    counters: {
      healthProbe: 0,
      healthChecks: 0,
      conversationList: 0,
      conversationMessages: 0,
      models: 0,
    },
    getAppSettingsJson: () => appSettingsJson,
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
      return;
    }

    if (pathname === '/api/health' && method === 'GET') {
      const hasProvider = url.searchParams.has('provider');
      if (hasProvider) {
        state.counters.healthChecks += 1;
      } else {
        state.counters.healthProbe += 1;
      }
      await json(route, { status: 'healthy', ollama_available: true });
      return;
    }

    if (pathname === '/api/app-settings/language' && method === 'GET') {
      await json(route, { success: true, language: 'en' });
      return;
    }

    if (pathname === '/api/app-settings/language' && method === 'POST') {
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/app-settings' && method === 'GET') {
      await json(route, { settings: appSettingsJson });
      return;
    }

    if (pathname === '/api/app-settings' && method === 'POST') {
      const body = readBody(route);
      const next = body.settings;
      if (typeof next === 'string') {
        appSettingsJson = next;
      }
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/story-templates' && method === 'GET') {
      await json(route, {
        templates: [
          {
            id: 'tpl-1',
            title: 'Adventure Starter',
            background: 'A city floating above endless clouds.',
            outline_hint: '1) Arrival 2) Conflict 3) Resolution',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/models' && method === 'GET') {
      state.counters.models += 1;
      const provider = url.searchParams.get('provider') || 'ollama';
      const byProvider: Record<string, Array<{ name: string }>> = {
        ollama: [{ name: 'llama3' }, { name: 'qwen2.5' }],
        openai: [{ name: 'gpt-4o-mini' }],
        azure: [{ name: 'azure-gpt' }],
        deepseek: [{ name: 'deepseek-chat' }],
      };
      await json(route, {
        success: true,
        models: byProvider[provider] || [{ name: `${provider}-model` }],
      });
      return;
    }

    if (pathname === '/api/conversations/list' && method === 'GET') {
      state.counters.conversationList += 1;
      const rows = Array.from(state.conversations.values()).map((conv) => ({
        conversation_id: conv.id,
        title: conv.title,
        background: conv.background,
        outline: conv.outline,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      }));
      await json(route, { conversations: rows });
      return;
    }

    if (pathname === '/api/conversation/settings' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      if (!conversationId) {
        await json(route, { error: 'conversation_id required' }, 400);
        return;
      }
      const conversation = ensureConversation(state, conversationId);
      conversation.title = String(body.title || conversation.title || '').trim();
      conversation.background = String(body.background || '').trim();
      conversation.outline = String(body.outline || '').trim();
      conversation.updated_at = nowIso();
      await json(route, {
        settings: {
          conversation_id: conversationId,
          title: conversation.title,
          background: conversation.background,
          outline: conversation.outline,
          characters: [],
          character_personality: {},
        },
      });
      return;
    }

    if (pathname === '/api/conversation/settings' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      const conversation = state.conversations.get(conversationId);
      if (!conversation) {
        await json(route, { error: 'not found' }, 404);
        return;
      }
      await json(route, {
        settings: {
          conversation_id: conversation.id,
          title: conversation.title,
          background: conversation.background,
          outline: conversation.outline,
          characters: [],
          character_personality: {},
        },
      });
      return;
    }

    if (pathname === '/api/conversation' && method === 'GET') {
      state.counters.conversationMessages += 1;
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      const conversation = ensureConversation(state, conversationId);
      await json(route, {
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          attachments: msg.attachments,
        })),
      });
      return;
    }

    if (pathname === '/api/conversation' && method === 'DELETE') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      state.conversations.delete(conversationId);
      state.progress.delete(conversationId);
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/chat-stream' && method === 'POST') {
      if (chatStreamFailRemaining > 0) {
        chatStreamFailRemaining -= 1;
        await json(route, { error: 'E2E simulated chat stream failure' }, 503);
        return;
      }
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      const userText = String(body.message || '').trim();
      const conversation = ensureConversation(state, conversationId);
      const turn = conversation.messages.filter((m) => m.role === 'assistant').length + 1;
      const previousAssistant = [...conversation.messages]
        .reverse()
        .find((m) => m.role === 'assistant')?.content;
      const assistantText = buildAssistantReply(userText, turn, previousAssistant);

      const userMessage: MockMessage = {
        id: `u-${Date.now()}-${turn}`,
        role: 'user',
        content: userText,
        created_at: nowIso(),
        attachments: Array.isArray(body._file_names)
          ? (body._file_names as string[]).map((name) => ({
              type: name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/)
                ? 'image'
                : 'file',
              name,
              status: 'uploaded',
            }))
          : undefined,
      };
      const assistantMessage: MockMessage = {
        id: `a-${Date.now()}-${turn}`,
        role: 'assistant',
        content: assistantText,
        created_at: nowIso(),
      };
      conversation.messages.push(userMessage, assistantMessage);
      conversation.updated_at = nowIso();

      const sseParts: string[] = [`data: ${assistantText}\n\n`];
      if (userText.includes('__E2E_TRIGGER_SUMMARY__')) {
        sseParts.push(
          `data: ${JSON.stringify({ needs_summary: true, message_count: 12 })}\n\n`
        );
      }
      sseParts.push(`data: ${JSON.stringify({ done: true })}\n\n`);
      const sse = sseParts.join('');
      await route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: sse,
      });
      return;
    }

    if (pathname === '/api/story/generate-stream' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      const conversation = ensureConversation(state, conversationId);
      const genText = 'E2E generated chapter prose.';
      const assistantMessage: MockMessage = {
        id: `gen-${Date.now()}`,
        role: 'assistant',
        content: genText,
        created_at: nowIso(),
      };
      conversation.messages.push(assistantMessage);
      conversation.updated_at = nowIso();
      const sse = `data: ${genText}\n\ndata: ${JSON.stringify({ done: true })}\n\n`;
      await route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: sse,
      });
      return;
    }

    if (pathname === '/api/story/confirm' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      ensureConversation(state, conversationId);
      const progress = state.progress.get(conversationId) || {
        current_section: 0,
        total_sections: 3,
        outline_confirmed: true,
        status: 'draft',
      };
      const nextSection = (progress.current_section ?? 0) + 1;
      const updated: MockProgress = {
        ...progress,
        current_section: nextSection,
      };
      state.progress.set(conversationId, updated);
      const conversation = ensureConversation(state, conversationId);
      const responseText = 'E2E confirm: chapter advanced.';
      conversation.messages.push({
        id: `conf-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        created_at: nowIso(),
      });
      conversation.updated_at = nowIso();
      await json(route, {
        success: true,
        response: responseText,
        story_progress: {
          conversation_id: conversationId,
          current_section: nextSection,
          total_sections: progress.total_sections ?? 3,
          outline_confirmed: true,
          status: 'completed',
        },
      });
      return;
    }

    if (pathname === '/api/conversation/summary/generate' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      const conversation = ensureConversation(state, conversationId);
      const assistantTexts = conversation.messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.content);
      const first = assistantTexts[0] || '';
      const last = assistantTexts[assistantTexts.length - 1] || '';
      await json(route, {
        summary: `Summary: ${first.slice(0, 24)} ... ${last.slice(0, 24)}`,
      });
      return;
    }

    if (pathname === '/api/conversation/summary' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      const summary = String(body.summary || '').trim();
      const conversation = ensureConversation(state, conversationId);
      conversation.summary = summary;
      await json(route, {
        summary: {
          conversation_id: conversationId,
          summary,
          updated_at: nowIso(),
        },
      });
      return;
    }

    if (pathname === '/api/conversation/summary' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      const conversation = ensureConversation(state, conversationId);
      if (!conversation.summary) {
        await json(route, { error: 'not found' }, 404);
        return;
      }
      await json(route, {
        summary: {
          conversation_id: conversationId,
          summary: conversation.summary,
          updated_at: nowIso(),
        },
      });
      return;
    }

    if (pathname === '/api/conversation/progress' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      ensureConversation(state, conversationId);
      await json(route, { progress: state.progress.get(conversationId) || null });
      return;
    }

    if (pathname === '/api/conversation/progress' && method === 'POST') {
      const body = readBody(route);
      const conversationId = String(body.conversation_id || '').trim();
      ensureConversation(state, conversationId);
      const current = state.progress.get(conversationId) || {
        current_section: 0,
        total_sections: 3,
        outline_confirmed: true,
        status: 'draft',
      };
      const next: MockProgress = {
        ...current,
        ...Object.fromEntries(
          Object.entries(body).filter(([key]) => key !== 'conversation_id')
        ),
      } as MockProgress;
      state.progress.set(conversationId, next);
      await json(route, { progress: next });
      return;
    }

    if (pathname === '/api/conversation/progress/confirm-outline' && method === 'POST') {
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/conversation/assistant-variants' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      const conversation = ensureConversation(state, conversationId);
      const assistantRows = conversation.messages
        .filter((m) => m.role === 'assistant')
        .map((m, idx) => ({
          id: idx + 1,
          content: m.content,
          model: 'llama3',
          provider: 'ollama',
          created_at: m.created_at,
        }))
        .reverse();
      const variants =
        assistantRows.length >= 2
          ? assistantRows
          : [
              {
                id: 2,
                content: 'Fallback variant B',
                model: 'llama3',
                provider: 'ollama',
                created_at: nowIso(),
              },
              {
                id: 1,
                content: 'Fallback variant A',
                model: 'llama3',
                provider: 'ollama',
                created_at: nowIso(),
              },
            ];
      await json(route, { variants });
      return;
    }

    if (pathname === '/api/conversation/assistant-variants/restore' && method === 'POST') {
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/story/branches' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      await json(route, {
        branches: [
          {
            branch_id: 'main',
            conversation_id: conversationId,
            parent_message_id: null,
            label: 'Main',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/story/branches' && method === 'POST') {
      await json(route, { success: true, branch_id: `branch-${Date.now()}` });
      return;
    }

    if (pathname === '/api/story/savepoint' && method === 'GET') {
      const conversationId = String(
        url.searchParams.get('conversation_id') || ''
      ).trim();
      const conversation = ensureConversation(state, conversationId);
      const assistantCount = conversation.messages.filter((m) => m.role === 'assistant').length;
      await json(route, {
        savepoints: [
          {
            savepoint_id: 'sp-1',
            conversation_id: conversationId,
            message_id: assistantCount,
            label: 'Latest',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/story/savepoint' && method === 'POST') {
      await json(route, { success: true, savepoint_id: `sp-${Date.now()}` });
      return;
    }

    if (pathname === '/api/story/savepoint/restore' && method === 'POST') {
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/story/ending' && method === 'GET') {
      await json(route, { endings: [] });
      return;
    }

    if (pathname === '/api/story/ending' && method === 'POST') {
      await json(route, { success: true });
      return;
    }

    if (pathname === '/api/export/pdf' && method === 'POST') {
      await json(route, {
        success: true,
        pdf_base64: 'UERG',
        filename: 'story.pdf',
      });
      return;
    }

    if (pathname === '/api/export/project-bundle' && method === 'POST') {
      const body = readBody(route);
      await json(route, {
        success: true,
        bundle: {
          version: 3,
          conversation_id: body.conversation_id || '',
          settings: {},
          progress: {},
          messages: [],
          integrity: { sha256: 'mock', message_count: 0 },
        },
        filename: 'story.ooc-project.json',
      });
      return;
    }

    if (pathname === '/api/import/project-bundle/validate' && method === 'POST') {
      await json(route, { success: true, valid: true });
      return;
    }

    if (pathname === '/api/conversation/characters' && method === 'GET') {
      await json(route, { characters: [] });
      return;
    }

    await json(route, { error: `Unhandled mock endpoint: ${pathname}` }, 404);
  });

  return state;
};

