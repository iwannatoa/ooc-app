/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 */
import { ConversationWithSettings, ChatMessage, OllamaModel } from '@/types';

// Mock story list data
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
      background:
        '在一个充满魔法和神秘生物的世界中，人类与精灵、矮人、龙族共存。',
      characters: ['艾莉亚', '索伦', '梅林'],
      character_personality: {
        艾莉亚: '勇敢、善良的年轻女战士',
        索伦: '智慧但有些傲慢的精灵法师',
        梅林: '幽默风趣的矮人铁匠',
      },
      outline:
        '故事讲述了一群冒险者为了寻找失落的魔法神器而踏上旅程，途中遇到了各种挑战和敌人。',
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
        凯特: '聪明、果断的太空站指挥官',
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
        林侦探: '经验丰富但有些固执的资深侦探',
        助手小王: '年轻、充满热情的新人助手',
      },
      outline: undefined, // Test case without outline
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  },
];

// Mock message data (only contains assistant-generated story content, no user messages)
export const mockMessages: Record<string, ChatMessage[]> = {
  conv_001: [
    {
      role: 'assistant',
      content:
        '艾莉亚在茂密的森林中穿行时，突然听到了一声低沉的咆哮。她紧握手中的剑，小心翼翼地向前走去。在树丛后面，她看到了一只受伤的独角兽，它的腿上有一道深深的伤口。独角兽的眼神中充满了痛苦和恐惧，但同时也有一丝警惕。\n\n艾莉亚的善良本性让她无法对受伤的生物视而不见。她放下剑，慢慢靠近独角兽，用温柔的声音安抚它："别害怕，我不会伤害你。让我帮你处理伤口。"\n\n她从背包中取出草药和绷带，开始为独角兽处理伤口。独角兽似乎感受到了艾莉亚的善意，逐渐放松了警惕，任由她为自己治疗。',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      id: 'msg_001',
      model: 'deepseek-chat',
    },
  ],
  conv_002: [
    {
      role: 'assistant',
      content:
        '太空站"希望号"是一个巨大的环形结构，直径超过一公里。它的外壳由高强度合金制成，表面覆盖着太阳能板，在恒星的光芒下闪闪发光。站内分为多个区域：居住区、研究区、农业区和控制中心。\n\n凯特站在控制中心的观景窗前，凝视着外面浩瀚的星空。RX-7的声音从她身后传来："指挥官，检测到一颗未知小行星正在接近地球轨道。根据计算，如果它继续当前轨道，将在72小时后与地球相撞。"\n\n凯特转过身，看着全息投影中显示的数据，眉头紧锁。"RX-7，分析一下可能的应对方案。"',
      timestamp: Date.now() - 30 * 60 * 1000,
      id: 'msg_002',
      model: 'deepseek-chat',
    },
  ],
  conv_003: [
    {
      role: 'assistant',
      content:
        '第一个案件是一起看似普通的入室盗窃案，但现场留下了一些奇怪的线索：一个古老的符号被刻在墙上，而且被盗的物品中有一件看似毫无价值的古董。林侦探敏锐地察觉到这背后可能隐藏着更大的秘密。\n\n"小王，你注意到这个符号了吗？"林侦探指着墙上的刻痕说道。\n\n助手小王凑近仔细观察，"这看起来像是某种古老的文字或者标记。"\n\n"没错，"林侦探点点头，"而且被盗的古董...我总觉得这不是巧合。让我们深入调查一下。"',
      timestamp: Date.now() - 10 * 60 * 1000,
      id: 'msg_003',
      model: 'deepseek-chat',
    },
  ],
};

// Mock model list
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

// Simulate delay
export const mockDelay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Generate random ID
export const generateMockId = () =>
  `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
