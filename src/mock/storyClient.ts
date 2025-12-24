import { StoryActionResponse } from '@/hooks/useStoryClient';
import { mockConversationClient } from './conversationClient';
import { mockDelay, generateMockId } from './data';
import { ChatMessage } from '@/types';

// Mock story content templates
const storyTemplates: Record<string, string[]> = {
  conv_001: [
    '艾莉亚在茂密的森林中穿行时，突然听到了一声低沉的咆哮。她紧握手中的剑，小心翼翼地向前走去。在树丛后面，她看到了一只受伤的独角兽，它的腿上有一道深深的伤口。独角兽的眼神中充满了痛苦和恐惧，但同时也有一丝警惕。\n\n艾莉亚的善良本性让她无法对受伤的生物视而不见。她放下剑，慢慢靠近独角兽，用温柔的声音安抚它："别害怕，我不会伤害你。让我帮你处理伤口。"\n\n她从背包中取出草药和绷带，开始为独角兽处理伤口。独角兽似乎感受到了艾莉亚的善意，逐渐放松了警惕，任由她为自己治疗。',
    '治疗完成后，独角兽用它的角轻轻触碰艾莉亚的手，表示感谢。突然，森林中传来了更多的脚步声。艾莉亚警觉地抬起头，看到索伦和梅林从树林中走了出来。\n\n"艾莉亚！"梅林大声喊道，"我们一直在找你。你没事吧？"\n\n"我没事，"艾莉亚回答，同时指了指身边的独角兽，"但我发现了一些有趣的事情。这只独角兽告诉我，森林深处有一座古老的遗迹，那里可能藏着我们一直在寻找的魔法神器。"\n\n索伦的眼睛亮了起来："真的吗？那我们必须立即前往。但首先，我们需要确保这只独角兽安全。"',
    '三人决定护送独角兽回到它的族群，然后再前往遗迹。在前往遗迹的路上，他们遇到了各种挑战：凶猛的森林生物、复杂的魔法陷阱，以及一个神秘的黑暗势力，似乎也在寻找同样的神器。\n\n"我们必须小心，"索伦警告道，"这个黑暗势力看起来非常危险。他们可能已经知道了我们的计划。"\n\n梅林挥舞着他的锤子，笑着说："那就让他们来吧！我们可不是好惹的。"\n\n艾莉亚紧握手中的剑，心中充满了决心。无论前方有什么困难，她都要找到那个神器，保护这个世界。',
  ],
  conv_002: [
    '太空站"希望号"是一个巨大的环形结构，直径超过一公里。它的外壳由高强度合金制成，表面覆盖着太阳能板，在恒星的光芒下闪闪发光。站内分为多个区域：居住区、研究区、农业区和控制中心。\n\n凯特站在控制中心的观景窗前，凝视着外面浩瀚的星空。RX-7的声音从她身后传来："指挥官，检测到一颗未知小行星正在接近地球轨道。根据计算，如果它继续当前轨道，将在72小时后与地球相撞。"\n\n凯特转过身，看着全息投影中显示的数据，眉头紧锁。"RX-7，分析一下可能的应对方案。"',
    'RX-7的全息投影在控制室中央展开，显示着详细的分析数据。"根据我的计算，我们有几个选择：第一，使用核武器摧毁小行星；第二，改变小行星的轨道；第三，在小行星上安装推进器，引导它远离地球。"\n\n凯特仔细研究着每个方案。"核武器可能会产生大量碎片，仍然威胁地球。改变轨道需要精确的计算和大量的资源。推进器方案看起来最可行，但我们需要立即行动。"\n\n"我同意，"RX-7说，"我已经计算出了最佳方案。我们需要派遣一支小队前往小行星，安装推进器。但首先，我们需要确认小行星的组成和结构。"',
    '凯特和RX-7立即开始组织救援任务。他们选择了最优秀的工程师和飞行员，准备前往小行星。在出发前，RX-7发现了一个令人震惊的事实：这颗小行星并不是自然形成的，它的内部结构显示它可能是一个人造物体。\n\n"这改变了所有事情，"凯特说，"如果这是人造的，那么可能有人在控制它。我们需要更加小心。"\n\nRX-7的全息投影闪烁着："我建议我们先进行侦察，了解这个物体的真实性质。如果它确实是人造的，我们可能需要采取不同的策略。"\n\n凯特点点头，心中充满了疑问。这个神秘的物体到底是谁制造的？它的目的是什么？',
  ],
  conv_003: [
    '第一个案件是一起看似普通的入室盗窃案，但现场留下了一些奇怪的线索：一个古老的符号被刻在墙上，而且被盗的物品中有一件看似毫无价值的古董。林侦探敏锐地察觉到这背后可能隐藏着更大的秘密。\n\n"小王，你注意到这个符号了吗？"林侦探指着墙上的刻痕说道。\n\n助手小王凑近仔细观察，"这看起来像是某种古老的文字或者标记。"\n\n"没错，"林侦探点点头，"而且被盗的古董...我总觉得这不是巧合。让我们深入调查一下。"',
    '随着调查的深入，林侦探和小王发现这个案件与一系列其他案件有关联。所有案件都涉及古老的符号和看似无关的古董。更令人不安的是，这些案件似乎都指向一个神秘的组织。\n\n"这个组织可能在进行某种仪式或者寻找什么东西，"林侦探分析道，"我们需要找出他们的真实目的。"\n\n小王翻阅着案件档案，"我发现了一个模式：所有这些案件都发生在月圆之夜。这可能不是巧合。"\n\n林侦探的眼睛亮了起来："月圆之夜...古老的符号...这让我想起了一些关于古代邪教组织的传说。我们需要立即行动，阻止他们。"',
    '林侦探和小王追踪线索，最终找到了这个神秘组织的藏身之处。在一个废弃的仓库中，他们发现了一个巨大的仪式场地，墙上刻满了古老的符号。组织的成员正在进行某种仪式，试图召唤某种古老的力量。\n\n"我们必须阻止他们！"林侦探低声说道，同时示意小王准备行动。\n\n两人冲进仓库，与组织的成员展开了激烈的战斗。在混乱中，林侦探发现了一个惊人的真相：这个组织的首领竟然是他们一直在寻找的幕后黑手，一个被认为已经死去多年的罪犯。\n\n"你...你还活着？"林侦探震惊地说道。\n\n"是的，"罪犯冷笑着说，"我一直在等待这个机会。现在，没有人能阻止我了。"',
  ],
};

// Track story progress for each story
const storyProgress: Record<string, number> = {};

export const mockStoryClient = {
  generateStory: async (
    conversationId: string
  ): Promise<StoryActionResponse> => {
    await mockDelay(800);
    
    // Get current progress
    const currentIndex = storyProgress[conversationId] || 0;
    const templates = storyTemplates[conversationId] || [
      `这是第 ${currentIndex + 1} 部分的故事内容。故事继续发展，角色们面临着新的挑战和机遇。`,
    ];
    
    // Get current section content (if continuing, use current index; if new chapter, use next index)
    const content = templates[currentIndex] || templates[0];
    
    // Create user message and assistant message
    const userMessage: ChatMessage = {
      role: 'user',
      content: '请根据大纲生成当前部分的故事内容。',
      timestamp: Date.now(),
      id: generateMockId(),
    };
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: content,
      timestamp: Date.now() + 100,
      id: generateMockId(),
      model: 'deepseek-chat',
    };
    
    // Add to message list (simulate backend save)
    if (typeof (mockConversationClient as any).addMessageToConversation === 'function') {
      (mockConversationClient as any).addMessageToConversation(conversationId, userMessage);
      (mockConversationClient as any).addMessageToConversation(conversationId, assistantMessage);
    }
    
    return {
      success: true,
      response: content,
    };
  },

  confirmSection: async (
    conversationId: string
  ): Promise<StoryActionResponse> => {
    await mockDelay(800);
    
    // Advance to next chapter
    const currentIndex = storyProgress[conversationId] || 0;
    storyProgress[conversationId] = currentIndex + 1;
    
    const templates = storyTemplates[conversationId] || [
      `这是第 ${currentIndex + 2} 部分的故事内容。故事继续发展，角色们面临着新的挑战和机遇。`,
    ];
    
    // Get next section content
    const nextIndex = storyProgress[conversationId];
    const content = templates[nextIndex] || templates[0];
    
    // Create user message and assistant message
    const userMessage: ChatMessage = {
      role: 'user',
      content: '确认当前章节，请生成下一章节的内容。',
      timestamp: Date.now(),
      id: generateMockId(),
    };
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: content,
      timestamp: Date.now() + 100,
      id: generateMockId(),
      model: 'deepseek-chat',
    };
    
    // Add to message list (simulate backend save)
    if (typeof (mockConversationClient as any).addMessageToConversation === 'function') {
      (mockConversationClient as any).addMessageToConversation(conversationId, userMessage);
      (mockConversationClient as any).addMessageToConversation(conversationId, assistantMessage);
    }
    
    return {
      success: true,
      response: content,
    };
  },

  rewriteSection: async (
    conversationId: string,
    feedback: string
  ): Promise<StoryActionResponse> => {
    await mockDelay(800);
    
    const currentIndex = storyProgress[conversationId] || 0;
    const templates = storyTemplates[conversationId] || [
      `根据您的反馈"${feedback}"，这是重写后的故事内容。`,
    ];
    
    const content = `[重写] ${templates[currentIndex] || templates[0]}\n\n根据您的反馈："${feedback}"`;
    
    // Create user message and assistant message
    const userMessage: ChatMessage = {
      role: 'user',
      content: `请重写当前章节：${feedback}`,
      timestamp: Date.now(),
      id: generateMockId(),
    };
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: content,
      timestamp: Date.now() + 100,
      id: generateMockId(),
      model: 'deepseek-chat',
    };
    
    // Add to message list (simulate backend save)
    if (typeof (mockConversationClient as any).addMessageToConversation === 'function') {
      (mockConversationClient as any).addMessageToConversation(conversationId, userMessage);
      (mockConversationClient as any).addMessageToConversation(conversationId, assistantMessage);
    }
    
    return {
      success: true,
      response: content,
    };
  },

  modifySection: async (
    conversationId: string,
    feedback: string
  ): Promise<StoryActionResponse> => {
    await mockDelay(800);
    
    const currentIndex = storyProgress[conversationId] || 0;
    const templates = storyTemplates[conversationId] || [
      `根据您的修改要求"${feedback}"，这是修改后的故事内容。`,
    ];
    
    const content = `[修改] ${templates[currentIndex] || templates[0]}\n\n根据您的修改："${feedback}"`;
    
    // Create user message and assistant message
    const userMessage: ChatMessage = {
      role: 'user',
      content: `请修改当前章节：${feedback}`,
      timestamp: Date.now(),
      id: generateMockId(),
    };
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: content,
      timestamp: Date.now() + 100,
      id: generateMockId(),
      model: 'deepseek-chat',
    };
    
    // Add to message list (simulate backend save)
    if (typeof (mockConversationClient as any).addMessageToConversation === 'function') {
      (mockConversationClient as any).addMessageToConversation(conversationId, userMessage);
      (mockConversationClient as any).addMessageToConversation(conversationId, assistantMessage);
    }
    
    return {
      success: true,
      response: content,
    };
  },
};

