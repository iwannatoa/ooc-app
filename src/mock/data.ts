import {
  ConversationWithSettings,
  ConversationSettings,
  ChatMessage,
  OllamaModel,
} from '@/types';

// Mock 会话列表数据
export const mockConversations: ConversationWithSettings[] = [
  {
    id: 'conv_001',
    title: '奇幻冒险故事',
    messages: [],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 60 * 60 * 1000,
    settings: {
      conversation_id: 'conv_001',
      title: '奇幻冒险故事',
      background: '在一个充满魔法和神秘生物的世界中，人类与精灵、矮人、龙族共存。',
      characters: ['艾莉亚', '索伦', '梅林'],
      character_personality: {
        '艾莉亚': '勇敢、善良的年轻女战士',
        '索伦': '智慧但有些傲慢的精灵法师',
        '梅林': '幽默风趣的矮人铁匠',
      },
      outline: '故事讲述了一群冒险者为了寻找失落的魔法神器而踏上旅程，途中遇到了各种挑战和敌人。',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'conv_002',
    title: '科幻未来世界',
    messages: [],
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 30 * 60 * 1000,
    settings: {
      conversation_id: 'conv_002',
      title: '科幻未来世界',
      background: '在2087年，人类已经殖民了多个星球，AI和人类共同生活。',
      characters: ['凯特', 'RX-7'],
      character_personality: {
        '凯特': '聪明、果断的太空站指挥官',
        'RX-7': '具有自我意识的AI助手',
      },
      outline: '当一颗未知的小行星威胁到地球时，凯特和RX-7必须合作拯救人类。',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'conv_003',
    title: '现代都市悬疑',
    messages: [],
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 10 * 60 * 1000,
    settings: {
      conversation_id: 'conv_003',
      title: '现代都市悬疑',
      background: '在一个繁华的现代都市，一系列神秘的案件接连发生。',
      characters: ['林侦探', '助手小王'],
      character_personality: {
        '林侦探': '经验丰富但有些固执的资深侦探',
        '助手小王': '年轻、充满热情的新人助手',
      },
      outline: undefined, // 测试没有大纲的情况
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  },
];

// Mock 消息数据
export const mockMessages: Record<string, ChatMessage[]> = {
  conv_001: [
    {
      role: 'user',
      content: '故事开始，艾莉亚在森林中遇到了什么？',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      id: 'msg_001',
    },
    {
      role: 'assistant',
      content: '艾莉亚在茂密的森林中穿行时，突然听到了一声低沉的咆哮。她紧握手中的剑，小心翼翼地向前走去。在树丛后面，她看到了一只受伤的独角兽，它的腿上有一道深深的伤口。',
      timestamp: Date.now() - 2 * 60 * 60 * 1000 + 5000,
      id: 'msg_002',
      model: 'deepseek-chat',
    },
    {
      role: 'user',
      content: '艾莉亚会帮助这只独角兽吗？',
      timestamp: Date.now() - 1 * 60 * 60 * 1000,
      id: 'msg_003',
    },
    {
      role: 'assistant',
      content: '当然会。艾莉亚的善良本性让她无法对受伤的生物视而不见。她放下剑，慢慢靠近独角兽，用温柔的声音安抚它。她从背包中取出草药和绷带，开始为独角兽处理伤口。',
      timestamp: Date.now() - 1 * 60 * 60 * 1000 + 5000,
      id: 'msg_004',
      model: 'deepseek-chat',
    },
  ],
  conv_002: [
    {
      role: 'user',
      content: '描述一下太空站的外观',
      timestamp: Date.now() - 30 * 60 * 1000,
      id: 'msg_005',
    },
    {
      role: 'assistant',
      content: '太空站"希望号"是一个巨大的环形结构，直径超过一公里。它的外壳由高强度合金制成，表面覆盖着太阳能板，在恒星的光芒下闪闪发光。站内分为多个区域：居住区、研究区、农业区和控制中心。',
      timestamp: Date.now() - 30 * 60 * 1000 + 5000,
      id: 'msg_006',
      model: 'deepseek-chat',
    },
  ],
  conv_003: [
    {
      role: 'user',
      content: '第一个案件是什么？',
      timestamp: Date.now() - 10 * 60 * 1000,
      id: 'msg_007',
    },
    {
      role: 'assistant',
      content: '第一个案件是一起看似普通的入室盗窃案，但现场留下了一些奇怪的线索：一个古老的符号被刻在墙上，而且被盗的物品中有一件看似毫无价值的古董。林侦探敏锐地察觉到这背后可能隐藏着更大的秘密。',
      timestamp: Date.now() - 10 * 60 * 1000 + 5000,
      id: 'msg_008',
      model: 'deepseek-chat',
    },
  ],
};

// Mock 模型列表
export const mockModels: OllamaModel[] = [
  {
    name: 'llama2',
    modified_at: '2024-01-15T10:30:00Z',
    size: 3825819519,
    digest: 'sha256:abc123',
    model: 'llama2',
    details: {
      format: 'gguf',
      family: 'llama',
      families: ['llama'],
      parameter_size: '7B',
      quantization_level: 'Q4_0',
    },
  },
  {
    name: 'deepseek-chat',
    modified_at: '2024-01-20T14:20:00Z',
    size: 0,
    model: 'deepseek-chat',
  },
  {
    name: 'mistral',
    modified_at: '2024-01-10T08:15:00Z',
    size: 4106059776,
    digest: 'sha256:def456',
    model: 'mistral',
    details: {
      format: 'gguf',
      family: 'mistral',
      families: ['mistral'],
      parameter_size: '7B',
      quantization_level: 'Q4_0',
    },
  },
];

// 模拟延迟
export const mockDelay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// 生成随机ID
export const generateMockId = () =>
  `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

