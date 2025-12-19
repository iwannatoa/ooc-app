/**
 * 解析文本中的 think 内容，返回分割后的部分
 * @param text 可能包含 think 内容的文本
 * @returns 包含普通内容和 think 内容的数组
 */
export interface TextPart {
  type: 'text' | 'think';
  content: string;
  isOpen: boolean; // think 是否还在开放状态（未闭合）
}

export const parseThinkContent = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let currentIndex = 0;
  
  // 匹配 think 标签
  // 格式可能是: <think>...</think> 或 <think>...</think> 或 <think>...</think>
  // 根据后端代码，应该是 <think> 开头 </think> 结尾
  const thinkRegex = /<(?:think|redacted_reasoning)>(.*?)<\/(?:think|redacted_reasoning)>/gis;
  let match;
  const matches: Array<{ index: number; length: number; content: string; isOpen: boolean }> = [];
  
  while ((match = thinkRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      content: match[1],
      isOpen: false,
    });
  }
  
  // 检查是否有未闭合的 think 标签
  const remainingText = text.slice(currentIndex);
  const openThinkRegex = /<(?:redacted_reasoning|think)>([^]*?)$/i;
  const openMatch = remainingText.match(openThinkRegex);
  
  if (openMatch && (!matches.length || matches[matches.length - 1].index + matches[matches.length - 1].length < text.length - openMatch[0].length)) {
    // 有未闭合的标签
    const openIndex = text.length - remainingText.length + remainingText.indexOf(openMatch[0]);
    matches.push({
      index: openIndex,
      length: openMatch[0].length,
      content: openMatch[1],
      isOpen: true,
    });
  }
  
  // 按索引排序匹配项
  matches.sort((a, b) => a.index - b.index);
  
  // 构建结果
  for (const matchInfo of matches) {
    // 添加 think 标签之前的内容
    if (matchInfo.index > currentIndex) {
      const beforeContent = text.slice(currentIndex, matchInfo.index).trim();
      if (beforeContent) {
        parts.push({ type: 'text', content: beforeContent, isOpen: false });
      }
    }
    
    // 添加 think 内容
    const thinkContent = matchInfo.content.trim();
    if (thinkContent || matchInfo.isOpen) {
      parts.push({ 
        type: 'think', 
        content: thinkContent, 
        isOpen: matchInfo.isOpen 
      });
    }
    
    currentIndex = matchInfo.index + matchInfo.length;
  }
  
  // 添加剩余内容
  const remainingContent = text.slice(currentIndex).trim();
  if (remainingContent) {
    parts.push({ type: 'text', content: remainingContent, isOpen: false });
  }
  
  // 如果没有匹配到任何内容，返回整个文本作为普通内容
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text, isOpen: false });
  }
  
  return parts;
};

/**
 * 提取并移除所有 think 内容（用于保存时）
 */
export const stripThinkContent = (text: string): string => {
  // Remove think tags (various formats)
  let result = text.replace(/<(?:think|redacted_reasoning)>.*?<\/(?:think|redacted_reasoning)>/gis, '');
  // Remove unclosed think tags
  result = result.replace(/<(?:redacted_reasoning|think)>.*$/gis, '');
  // Remove ```think\n...\n``` code blocks
  result = result.replace(/```think\s*\n.*?\n```/gis, '');
  // Remove standalone ```think``` markers
  result = result.replace(/```think\s*```/gi, '');
  // Clean up extra whitespace
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return result.trim();
};

