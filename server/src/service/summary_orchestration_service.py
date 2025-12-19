"""
总结编排服务层
"""
from typing import Optional, Dict
from service.summary_service import SummaryService
from service.chat_service import ChatService
from service.ai_config_service import AIConfigService
from utils.logger import get_logger

logger = get_logger(__name__)


class SummaryOrchestrationService:
    """总结编排服务类"""
    
    def __init__(
        self,
        summary_service: SummaryService,
        chat_service: ChatService,
        ai_config_service: AIConfigService
    ):
        """
        初始化服务
        
        Args:
            summary_service: 总结服务实例
            chat_service: 聊天记录服务实例
            ai_config_service: AI 配置服务实例
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
        生成会话总结
        
        Args:
            conversation_id: 会话ID
            provider: AI 提供商
            model: 模型名称
        
        Returns:
            总结字典
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

