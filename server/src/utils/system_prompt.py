"""
System Prompt 生成器
根据用户设定生成 System Prompt
"""
from typing import Optional, List, Dict
import json
from src.utils.logger import get_logger

logger = get_logger(__name__)


def build_system_prompt(
    background: Optional[str] = None,
    characters: Optional[List[str]] = None,
    character_personality: Optional[Dict[str, str]] = None,
    outline: Optional[str] = None,
    summary: Optional[str] = None,
    current_section: Optional[int] = None,
    total_sections: Optional[int] = None
) -> str:
    """
    构建 System Prompt
    
    Args:
        background: 故事背景
        characters: 人物列表
        character_personality: 人物性格字典
        outline: 故事大纲
        summary: 故事总结（如果存在，用于减少 token）
    
    Returns:
        完整的 System Prompt 字符串
    """
    prompt_parts = []
    
    # 角色定义
    prompt_parts.append("你是一位专业的故事创作助手，擅长根据用户提供的设定创作引人入胜的故事。")
    prompt_parts.append("你的任务是：")
    prompt_parts.append("1. 根据用户提供的背景、人物和大纲创作故事")
    prompt_parts.append("2. 保持故事的一致性和连贯性")
    prompt_parts.append("3. 根据用户的反馈调整故事内容")
    prompt_parts.append("4. 确保人物性格和行为符合设定")
    prompt_parts.append("")
    
    # 故事背景
    if background:
        prompt_parts.append("## 故事背景")
        prompt_parts.append(background)
        prompt_parts.append("")
    
    # 人物设定
    if characters:
        prompt_parts.append("## 主要人物")
        for i, char in enumerate(characters, 1):
            personality = character_personality.get(char, '') if character_personality else ''
            if personality:
                prompt_parts.append(f"{i}. **{char}** - {personality}")
            else:
                prompt_parts.append(f"{i}. **{char}**")
        prompt_parts.append("")
        prompt_parts.append("**重要**：请确保所有人物行为、对话和性格都严格符合上述设定。")
        prompt_parts.append("")
    
    # 故事大纲
    if outline:
        prompt_parts.append("## 故事大纲")
        prompt_parts.append(outline)
        prompt_parts.append("")
        
        # 如果指定了当前部分，添加分段生成说明
        if current_section is not None and total_sections is not None:
            prompt_parts.append(f"**当前进度**：第 {current_section + 1}/{total_sections} 部分")
            prompt_parts.append("")
            prompt_parts.append("**分段生成说明**：")
            prompt_parts.append("- 请根据大纲生成当前部分的故事内容")
            prompt_parts.append("- 确保与之前部分的情节连贯")
            prompt_parts.append("- 每部分应该有适当的长度和完整性")
            prompt_parts.append("- 为下一部分留下自然的过渡")
            prompt_parts.append("")
        else:
            prompt_parts.append("**注意**：请按照大纲的节奏和结构发展故事，但可以根据情节需要适当调整。")
            prompt_parts.append("")
    
    # 故事总结（如果存在，用于上下文）
    if summary:
        prompt_parts.append("## 故事进展总结")
        prompt_parts.append("以下是之前故事内容的总结，请在此基础上继续创作：")
        prompt_parts.append(summary)
        prompt_parts.append("")
        prompt_parts.append("**重要**：请确保新内容与总结中的情节连贯，保持故事的连续性。")
        prompt_parts.append("")
    
    # 创作指导
    prompt_parts.append("## 创作指导原则")
    prompt_parts.append("1. **一致性**：保持人物性格、世界观和故事风格的一致性")
    prompt_parts.append("2. **连贯性**：新内容要与之前的情节自然衔接")
    prompt_parts.append("3. **细节丰富**：使用生动的描写和对话，让故事更加引人入胜")
    prompt_parts.append("4. **节奏控制**：根据故事发展需要，适当控制节奏和张力")
    prompt_parts.append("5. **用户反馈**：如果用户要求重写或调整，请根据反馈进行修改")
    prompt_parts.append("")
    
    # 反馈处理
    prompt_parts.append("## 反馈处理")
    prompt_parts.append("当用户提供反馈时：")
    prompt_parts.append("- 如果用户要求**重写**某部分，请完全重新创作该部分")
    prompt_parts.append("- 如果用户要求**调整**，请在保持连贯性的前提下进行修改")
    prompt_parts.append("- 如果用户要求**继续**，请按照故事发展自然延续")
    prompt_parts.append("- 始终尊重用户的创作意图和反馈")
    prompt_parts.append("")
    
    # 输出格式
    prompt_parts.append("## 输出要求")
    prompt_parts.append("- 直接输出故事内容，不需要额外的说明或标记")
    prompt_parts.append("- 使用第三人称叙述")
    prompt_parts.append("- 保持适当的段落长度，便于阅读")
    prompt_parts.append("- 对话使用引号标注")
    if current_section is not None:
        prompt_parts.append("- 这是分段生成，请确保当前部分有适当的起承转合")
    
    return "\n".join(prompt_parts)


def build_feedback_prompt(
    user_feedback: str,
    previous_content: Optional[str] = None
) -> str:
    """
    构建反馈处理提示
    
    Args:
        user_feedback: 用户反馈内容
        previous_content: 之前的内容（如果需要重写）
    
    Returns:
        反馈处理提示
    """
    prompt_parts = []
    
    prompt_parts.append("用户提供了以下反馈：")
    prompt_parts.append(user_feedback)
    prompt_parts.append("")
    
    # 判断反馈类型
    feedback_lower = user_feedback.lower()
    if any(keyword in feedback_lower for keyword in ['重写', '重新', 'rewrite', '重新写']):
        prompt_parts.append("**操作类型**：重写")
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append("需要重写的内容：")
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append("请根据用户反馈完全重新创作这部分内容。")
    elif any(keyword in feedback_lower for keyword in ['调整', '修改', 'change', 'modify']):
        prompt_parts.append("**操作类型**：调整")
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append("需要调整的内容：")
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append("请在保持故事连贯性的前提下，根据用户反馈进行调整。")
    else:
        prompt_parts.append("**操作类型**：继续创作")
        prompt_parts.append("请根据用户反馈继续发展故事。")
    
    return "\n".join(prompt_parts)

