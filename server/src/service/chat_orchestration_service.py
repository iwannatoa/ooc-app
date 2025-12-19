"""
聊天编排服务层
"""
from typing import Optional, Dict
from service.ai_service import AIService
from service.chat_service import ChatService
from service.ai_config_service import AIConfigService
from utils.logger import get_logger
import uuid

logger = get_logger(__name__)


class ChatOrchestrationService:
    """聊天编排服务类"""
    
    def __init__(
        self,
        ai_service: AIService,
        chat_service: ChatService,
        ai_config_service: AIConfigService
    ):
        """
        初始化服务
        
        Args:
            ai_service: AI 服务实例
            chat_service: 聊天记录服务实例
            ai_config_service: AI 配置服务实例
        """
        self.ai_service = ai_service
        self.chat_service = chat_service
        self.ai_config_service = ai_config_service
    
    def process_chat(
        self,
        message: str,
        provider: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict:
        """
        处理完整的聊天流程
        
        Args:
            message: 用户消息
            provider: AI 提供商
            conversation_id: 会话ID，如果不提供则自动生成
            model: 模型名称，如果不提供则使用全局配置的默认模型
        
        Returns:
            处理结果字典
        """
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )
        
        if result.get('success'):
            try:
                self.chat_service.save_user_message(conversation_id, message)
                self.chat_service.save_assistant_message(
                    conversation_id=conversation_id,
                    content=result.get('response', ''),
                    model=result.get('model'),
                    provider=api_config['provider']
                )
                result['conversation_id'] = conversation_id
            except Exception as e:
                logger.warning(f"Failed to save messages: {str(e)}")
        
        return result

