/**
 * 移除AI响应中的think部分
 */
export const stripThinkContent = (text: string): string => {
  // Remove <think>...</think> tags
  let result = text.replace(/<think>.*?<\/redacted_reasoning>/gis, '');
  // Remove unclosed <think> or <think> tags
  result = result.replace(/<(?:redacted_reasoning|think)>.*$/gis, '');
  // Remove ```think\n...\n``` code blocks
  result = result.replace(/```think\s*\n.*?\n```/gis, '');
  // Remove standalone ```think``` markers
  result = result.replace(/```think\s*```/gi, '');
  // Clean up extra whitespace
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return result.trim();
};

