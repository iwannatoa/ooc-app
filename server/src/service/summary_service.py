"""
Conversation summary service layer
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
        Create or update conversation summary
        
        Args:
            conversation_id: Conversation ID
            summary: Summary content
            message_count: Message count
            token_count: Token count
        
        Returns:
            Summary dictionary
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
        Get conversation summary
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Summary dictionary, or None if not exists
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
        Generate story summary using AI
        
        Args:
            conversation_id: Conversation ID
            messages: Messages list
            provider: AI provider
            model: Model name
            api_key: API key
            base_url: Base URL
            max_tokens: Maximum tokens
            temperature: Temperature parameter
        
        Returns:
            Generated summary content
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
        Determine if summary is needed
        
        Based on message count and estimated token count
        
        Args:
            conversation_id: Conversation ID
            message_count: Current message count
            threshold: Summary threshold (default 150 messages)
            estimated_tokens_per_message: Estimated tokens per message
        
        Returns:
            Whether summary is needed
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
        Estimate token count for text (simple estimation: Chinese 1 char ≈ 1.5 tokens, English 1 word ≈ 1.3 tokens)
        
        Args:
            text: Text content
        
        Returns:
            Estimated token count
        """
        if not text:
            return 0
        
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        english_words = len([w for w in text.split() if w.isalpha()])
        
        estimated = int(chinese_chars * 1.5 + english_words * 1.3)
        return estimated
    
    def delete_summary(self, conversation_id: str) -> bool:
        """
        Delete conversation summary
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
        """
        return self.repository.delete_summary(conversation_id)

