import { ChatMessage } from '@/types';
import { mockDelay } from './data';

// Mock AI response templates
const mockResponses = [
  '这是一个很有趣的问题。让我为你详细解释一下...',
  '根据你提供的信息，我认为...',
  '从故事的角度来看，这里有几个关键点...',
  '让我为你展开这个情节...',
  '这个场景可以这样发展...',
  '基于之前的设定，接下来可能会发生...',
];

const generateMockResponse = (userMessage: string): string => {
  // Simple keyword matching to generate response
  const responses = [...mockResponses];
  
  if (userMessage.includes('开始') || userMessage.includes('故事')) {
    responses.push(
      '故事开始了。在一个阳光明媚的早晨，主角从睡梦中醒来，发现今天与往常不同...'
    );
  }
  
  if (userMessage.includes('人物') || userMessage.includes('角色')) {
    responses.push(
      '这个角色有着复杂的背景。他/她曾经经历过...，这使得他/她在面对...时会有独特的反应。'
    );
  }
  
  if (userMessage.includes('冲突') || userMessage.includes('问题')) {
    responses.push(
      '冲突逐渐升级。原本看似简单的问题背后，隐藏着更深的秘密。主角必须做出艰难的选择...'
    );
  }
  
  // Randomly select a response and add some content
  const baseResponse = responses[Math.floor(Math.random() * responses.length)];
  const additionalContent = `\n\n${userMessage}这个问题让我想到了很多。在故事中，我们可以通过以下方式来展开：\n\n1. 首先，...\n2. 然后，...\n3. 最后，...\n\n这样的安排会让故事更加引人入胜。`;
  
  return baseResponse + additionalContent;
};

export const mockAiClient = {
  sendMessage: async (
    message: string,
    _conversationId?: string
  ): Promise<ChatMessage> => {
    // Simulate network delay
    await mockDelay(1000 + Math.random() * 1000);
    
    const response = generateMockResponse(message);
    
    return {
      role: 'assistant',
      content: response,
      model: 'deepseek-chat',
      timestamp: Date.now(),
      id: `mock_msg_${Date.now()}`,
    };
  },
};

