"""
会话总结服务层
"""
from typing import Optional, Dict, List
from src.repository.summary_repository import SummaryRepository
from src.service.ai_service import AIService
from src.utils.logger import get_logger

logger = get_logger(__name__)


class SummaryService:
    """会话总结服务类"""
    
    def __init__(
        self,
        summary_repository: SummaryRepository,
        ai_service: AIService
    ):
        """
        初始化服务
        
        Args:
            summary_repository: 总结仓库实例
            ai_service: AI 服务实例
        """
        self.repository = summary_repository
        self.ai_service = ai_service
    
    def create_or_update_summary(
        self,
        conversation_id: str,
        summary: str,
        message_count: int = 0,
        token_count: Optional[int] = None
    ) -> Dict:
        """
        创建或更新会话总结
        
        Args:
            conversation_id: 会话ID
            summary: 总结内容
            message_count: 消息数量
            token_count: token 数量
        
        Returns:
            总结字典
        """
        summary_obj = self.repository.create_or_update_summary(
            conversation_id=conversation_id,
            summary=summary,
            message_count=message_count,
            token_count=token_count
        )
        return summary_obj.to_dict()
    
    def get_summary(self, conversation_id: str) -> Optional[Dict]:
        """
        获取会话总结
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            总结字典，如果不存在则返回 None
        """
        summary = self.repository.get_summary(conversation_id)
        return summary.to_dict() if summary else None
    
    def generate_summary(
        self,
        conversation_id: str,
        messages: List[Dict],
        provider: str = 'deepseek',
        model: str = 'deepseek-chat',
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> str:
        """
        使用 AI 生成故事总结
        
        Args:
            conversation_id: 会话ID
            messages: 消息列表
            provider: AI提供商
            model: 模型名称
            api_key: API密钥
            base_url: 基础URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            生成的总结内容
        """
        # 构建总结提示
        prompt_parts = [
            "请对以下故事对话进行总结，生成一个简洁但完整的故事进展总结。",
            "总结应该包括：",
            "1. 故事的主要情节发展",
            "2. 关键事件和转折点",
            "3. 人物关系和互动",
            "4. 当前故事状态",
            "",
            "总结要求：",
            "- 保持故事的连贯性和逻辑性",
            "- 突出重要情节和人物发展",
            "- 长度适中，能够作为后续创作的上下文",
            "- 使用第三人称叙述",
            "",
            "以下是故事对话内容：",
            ""
        ]
        
        # 添加消息内容
        for msg in messages:
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role == 'user':
                prompt_parts.append(f"【用户】{content}")
            elif role == 'assistant':
                prompt_parts.append(f"【故事】{content}")
            prompt_parts.append("")
        
        prompt = "\n".join(prompt_parts)
        
        # 调用 AI 服务生成总结
        result = self.ai_service.chat(
            provider=provider,
            message=prompt,
            model=model,
            api_key=api_key,
            base_url=base_url,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        if result.get('success'):
            summary = result.get('response', '')
            # 保存总结
            self.create_or_update_summary(
                conversation_id=conversation_id,
                summary=summary,
                message_count=len(messages),
                token_count=None  # 可以后续添加 token 计算
            )
            return summary
        else:
            raise Exception(result.get('error', 'Failed to generate summary'))
    
    def should_summarize(
        self,
        conversation_id: str,
        message_count: int,
        threshold: int = 150,
        estimated_tokens_per_message: int = 500
    ) -> bool:
        """
        判断是否需要总结
        
        基于消息数量和估算的 token 数量进行判断
        
        Args:
            conversation_id: 会话ID
            message_count: 当前消息数量
            threshold: 总结阈值（默认150条消息）
            estimated_tokens_per_message: 每条消息估算的 token 数量
        
        Returns:
            是否需要总结
        """
        # 如果消息数量超过阈值，且还没有总结，则需要总结
        if message_count >= threshold:
            existing_summary = self.repository.get_summary(conversation_id)
            if not existing_summary:
                return True
            # 如果有总结，但消息数量比总结时多了很多，也需要更新总结
            # 使用阈值的一半作为更新间隔，避免频繁更新
            update_interval = threshold // 2
            if existing_summary and message_count >= existing_summary.message_count + update_interval:
                return True
        return False
    
    def estimate_tokens(self, text: str) -> int:
        """
        估算文本的 token 数量（简单估算：中文1字符≈1.5 tokens，英文1词≈1.3 tokens）
        
        Args:
            text: 文本内容
        
        Returns:
            估算的 token 数量
        """
        if not text:
            return 0
        
        # 简单估算：中文字符数 * 1.5 + 英文单词数 * 1.3
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        english_words = len([w for w in text.split() if w.isalpha()])
        
        estimated = int(chinese_chars * 1.5 + english_words * 1.3)
        return estimated

