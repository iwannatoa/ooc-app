"""
会话总结服务层
"""
from typing import Optional, Dict, List
from repository.summary_repository import SummaryRepository
from service.ai_service import AIService
from service.app_settings_service import AppSettingsService
from utils.logger import get_logger
from utils.prompt_template_loader import PromptTemplateLoader

logger = get_logger(__name__)


class SummaryService:
    """Conversation summary service"""
    
    def __init__(
        self,
        summary_repository: SummaryRepository,
        ai_service: AIService,
        app_settings_service: AppSettingsService
    ):
        """
        Initialize service
        
        Args:
            summary_repository: Summary repository instance
            ai_service: AI service instance
            app_settings_service: App settings service instance
        """
        self.repository = summary_repository
        self.ai_service = ai_service
        self.app_settings_service = app_settings_service
    
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
        language = self.app_settings_service.get_language()
        template = PromptTemplateLoader.get_template(language)
        summary_template = template['summary_prompt']
        
        prompt_parts = [
            summary_template['intro'],
            summary_template['should_include']
        ]
        prompt_parts.extend(summary_template['items'])
        prompt_parts.append("")
        prompt_parts.append(summary_template['requirements'])
        prompt_parts.extend(summary_template['requirement_items'])
        prompt_parts.append("")
        prompt_parts.append(summary_template['language_note'])
        prompt_parts.append("")
        prompt_parts.append(summary_template['content_intro'])
        prompt_parts.append("")
        
        role_prefixes = summary_template['role_prefixes']
        
        for msg in messages:
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role in role_prefixes:
                prompt_parts.append(f"{role_prefixes[role]}{content}")
            prompt_parts.append("")
        
        prompt = "\n".join(prompt_parts)
        
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
            self.create_or_update_summary(
                conversation_id=conversation_id,
                summary=summary,
                message_count=len(messages),
                token_count=None
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
        if message_count >= threshold:
            existing_summary = self.repository.get_summary(conversation_id)
            if not existing_summary:
                return True
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
        
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        english_words = len([w for w in text.split() if w.isalpha()])
        
        estimated = int(chinese_chars * 1.5 + english_words * 1.3)
        return estimated

