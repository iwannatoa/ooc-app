/**
 * Parse think content in text and return split parts
 * @param text Text that may contain think content
 * @returns Array containing normal content and think content
 */
export interface TextPart {
  type: 'text' | 'think';
  content: string;
  isOpen: boolean; // Whether think is still open (not closed)
}

export const parseThinkContent = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let currentIndex = 0;
  
  // Match think tags
  // Format may be: <think>...</think>
  // According to backend code, should start with <think> and end with </think>
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
  
  // Check if there are unclosed think tags
  const remainingText = text.slice(currentIndex);
  const openThinkRegex = /<(?:redacted_reasoning|think)>([^]*?)$/i;
  const openMatch = remainingText.match(openThinkRegex);
  
  if (openMatch && (!matches.length || matches[matches.length - 1].index + matches[matches.length - 1].length < text.length - openMatch[0].length)) {
    // Has unclosed tag
    const openIndex = text.length - remainingText.length + remainingText.indexOf(openMatch[0]);
    matches.push({
      index: openIndex,
      length: openMatch[0].length,
      content: openMatch[1],
      isOpen: true,
    });
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  // Build result
  for (const matchInfo of matches) {
    // Add content before think tag
    if (matchInfo.index > currentIndex) {
      const beforeContent = text.slice(currentIndex, matchInfo.index).trim();
      if (beforeContent) {
        parts.push({ type: 'text', content: beforeContent, isOpen: false });
      }
    }
    
    // Add think content
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
  
  // Add remaining content
  const remainingContent = text.slice(currentIndex).trim();
  if (remainingContent) {
    parts.push({ type: 'text', content: remainingContent, isOpen: false });
  }
  
  // If no content matched, return entire text as normal content
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text, isOpen: false });
  }
  
  return parts;
};

/**
 * Extract and remove all think content (for saving)
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
  // Clean up extra whitespace - replace multiple spaces with single space
  result = result.replace(/ +/g, ' ');
  // Clean up extra newlines
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return result.trim();
};

