"""
Summary orchestration service layer
"""
from typing import Optional, Dict
from service.summary_service import SummaryService
from service.chat_service import ChatService
from service.ai_config_service import AIConfigService
from utils.logger import get_logger

logger = get_logger(__name__)


class SummaryOrchestrationService:
    """Summary orchestration service class"""
    
    def __init__(
        self,
        summary_service: SummaryService,
        chat_service: ChatService,
        ai_config_service: AIConfigService
    ):
        """
        Initialize service
        
        Args:
            summary_service: Summary service instance
            chat_service: Chat record service instance
            ai_config_service: AI config service instance
        """
        self.summary_service = summary_service
        self.chat_service = chat_service
        self.ai_config_service = ai_config_service
    
    def generate_summary(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        Generate conversation summary
        
        Args:
            conversation_id: Conversation ID
            provider: AI provider
            model: Model name
        
        Returns:
            Summary dictionary
        """
        messages = self.chat_service.get_conversation(conversation_id)
        
        if not messages:
            return {
                "success": False,
                "error": "No messages found for summarization"
            }
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        summary = self.summary_service.generate_summary(
            conversation_id=conversation_id,
            messages=messages,
            provider=api_config['provider'],
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )
        
        return {
            "success": True,
            "summary": summary
        }

