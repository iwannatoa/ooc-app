"""
Chat orchestration service layer
"""
from typing import Optional, Dict
import uuid

from infrastructure.database import unit_of_work
from service.ai_service import AIService
from service.chat_service import ChatService
from service.ai_config_service import AIConfigService
from service.conversation_service import ConversationService
from utils.logger import get_logger
from utils.i18n import get_i18n_text
from utils.think_strip import strip_think_content

logger = get_logger(__name__)


class ChatOrchestrationService:
    """Chat orchestration service class"""
    
    def __init__(
        self,
        ai_service: AIService,
        chat_service: ChatService,
        ai_config_service: AIConfigService,
        conversation_service: ConversationService,
    ):
        """
        Initialize service
        
        Args:
            ai_service: AI service instance
            chat_service: Chat record service instance
            ai_config_service: AI config service instance
        """
        self.ai_service = ai_service
        self.chat_service = chat_service
        self.ai_config_service = ai_config_service
        self.conversation_service = conversation_service

    @staticmethod
    def _merge_conversation_llm_overrides(
        api_config: Dict,
        settings: Optional[Dict],
    ) -> Dict:
        if not settings:
            return api_config
        additional = settings.get('additional_settings')
        if not isinstance(additional, dict):
            return api_config
        out = dict(api_config)
        conversation_temp = additional.get('conversationTemperature')
        conversation_max_tokens = additional.get('conversationMaxTokens')
        conversation_stop_words = additional.get('conversationStopWords')
        try:
            if conversation_temp is not None and str(conversation_temp).strip() != '':
                out['temperature'] = float(conversation_temp)
        except (TypeError, ValueError):
            pass
        try:
            if conversation_max_tokens is not None and str(conversation_max_tokens).strip() != '':
                out['max_tokens'] = int(conversation_max_tokens)
        except (TypeError, ValueError):
            pass
        if isinstance(conversation_stop_words, list):
            sanitized = [
                str(word).strip()
                for word in conversation_stop_words
                if str(word).strip()
            ]
            if sanitized:
                out['stop_words'] = sanitized
        return out
    
    def process_chat(
        self,
        message: str,
        provider: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None,
        language: str = 'en',
    ) -> Dict:
        """
        Process complete chat flow
        
        Args:
            message: User message
            provider: AI provider
            conversation_id: Conversation ID, auto-generated if not provided
            model: Model name, use default model from global config if not provided
            language: Locale for user-facing persistence error messages ('zh' or 'en').
        
        Returns:
            Processing result dictionary
        """
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        settings = (
            self.conversation_service.get_settings(conversation_id)
            if conversation_id
            else None
        )
        api_config = self._merge_conversation_llm_overrides(api_config, settings)
        
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            stop_words=api_config.get('stop_words'),
        )
        
        if result.get('success'):
            try:
                response_content = result.get('response', '')
                clean_content = strip_think_content(response_content)

                with unit_of_work() as session:
                    self.chat_service.save_user_message(
                        conversation_id, message, session=session
                    )
                    self.chat_service.save_assistant_message(
                        conversation_id=conversation_id,
                        content=clean_content,
                        model=result.get('model'),
                        provider=api_config['provider'],
                        session=session,
                    )
                result['conversation_id'] = conversation_id
                result['persisted'] = True
            except Exception:
                logger.error(
                    "Failed to persist chat messages after successful AI call",
                    exc_info=True,
                )
                result['success'] = False
                result['persisted'] = False
                result['conversation_id'] = conversation_id
                result['error'] = get_i18n_text(
                    language,
                    'error_messages.persist_chat_messages_failed',
                )

        return result

