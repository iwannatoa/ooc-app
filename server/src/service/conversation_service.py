"""
Conversation settings service layer
"""
from typing import List, Optional, Dict, Generator, TYPE_CHECKING
from repository.conversation_repository import ConversationRepository
from service.ai_service import AIService
from service.ai_config_service import AIConfigService
from utils.logger import get_logger

if TYPE_CHECKING:
    from service.ai_service_streaming import AIServiceStreaming

logger = get_logger(__name__)


class ConversationService:
    """Conversation settings service"""
    
    def __init__(
        self,
        conversation_repository: ConversationRepository,
        ai_service: AIService,
        ai_config_service: AIConfigService,
        ai_service_streaming: Optional['AIServiceStreaming'] = None
    ):
        """
        Initialize service
        
        Args:
            conversation_repository: Conversation repository instance
            ai_service: AI service instance
            ai_config_service: AI config service instance
            ai_service_streaming: Streaming AI service instance (optional, for streaming outline generation)
        """
        self.repository = conversation_repository
        self.ai_service = ai_service
        self.ai_config_service = ai_config_service
        self.ai_service_streaming = ai_service_streaming
    
    def create_or_update_settings(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        background: Optional[str] = None,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        character_is_main: Optional[Dict[str, bool]] = None,
        outline: Optional[str] = None,
        allow_auto_generate_characters: Optional[bool] = None,
        additional_settings: Optional[Dict] = None
    ) -> Dict:
        """
        创建或更新会话设置
        
        Args:
            conversation_id: 会话ID
            title: 会话标题
            background: 故事背景
            characters: 人物列表
            character_personality: 人物设定字典
            outline: 大纲
        
        Returns:
            设置字典
        """
        settings = self.repository.create_or_update_settings(
            conversation_id=conversation_id,
            title=title,
            background=background,
            characters=characters,
            character_personality=character_personality,
            character_is_main=character_is_main,
            outline=outline,
            allow_auto_generate_characters=allow_auto_generate_characters,
            additional_settings=additional_settings
        )
        return settings.to_dict()
    
    def get_settings(self, conversation_id: str) -> Optional[Dict]:
        """
        获取会话设置
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            设置字典，如果不存在则返回 None
        """
        settings = self.repository.get_settings(conversation_id)
        return settings.to_dict() if settings else None
    
    def get_all_conversations(self) -> List[Dict]:
        """
        获取所有会话及其设置
        
        Returns:
            会话列表
        """
        return self.repository.get_all_conversations_with_settings()
    
    def delete_settings(self, conversation_id: str) -> bool:
        """
        删除会话设置
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
        """
        return self.repository.delete_settings(conversation_id)
    
    def generate_outline(
        self,
        background: str,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        provider: str = 'deepseek',
        model: Optional[str] = None,
        language: str = 'zh'
    ) -> str:
        """
        使用AI生成故事大纲
        
        Args:
            background: 故事背景
            characters: 人物列表
            character_personality: 人物设定字典
            provider: AI提供商
            model: 模型名称
            api_key: API密钥
            base_url: 基础URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            生成的大纲内容
        """
        # Load prompt template
        from utils.prompt_template_loader import PromptTemplateLoader
        template = PromptTemplateLoader.get_template(language)
        outline_template = template['outline_generation']
        
        prompt_parts = [outline_template['intro'] + "\n\n"]
        
        prompt_parts.append(f"{outline_template['sections']['background']}：\n{background}\n\n")
        
        if characters:
            prompt_parts.append(f"{outline_template['sections']['characters']}：\n")
            format_with = outline_template['character_format']['with_personality']
            format_without = outline_template['character_format']['without_personality']
            for i, char in enumerate(characters, 1):
                personality = character_personality.get(char, '') if character_personality else ''
                if personality:
                    prompt_parts.append(format_with.format(index=i, name=char, personality=personality) + "\n")
                else:
                    prompt_parts.append(format_without.format(index=i, name=char) + "\n")
            prompt_parts.append("\n")
        
        instructions = outline_template['instructions']
        prompt_parts.append(instructions['intro'] + "：\n")
        for item in instructions['items']:
            prompt_parts.append(item + "\n")
        prompt_parts.append("\n")
        prompt_parts.append(instructions['note'] + "\n")
        prompt_parts.append(instructions['warning'])
        
        prompt = ''.join(prompt_parts)
        
        prompt = ''.join(prompt_parts)
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=prompt,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )
        
        if result.get('success'):
            response_text = result.get('response', '')
            # Remove think part if present (e.g., <think>...</think> or ```think\n...\n```)
            response_text = self._strip_think_content(response_text)
            return response_text
        else:
            raise Exception(result.get('error', 'Failed to generate outline'))
    
    def _strip_think_content(self, text: str) -> str:
        """
        Remove think content from AI response
        
        Args:
            text: Response text that may contain think content
        
        Returns:
            Text with think content removed
        """
        import re
        
        # Remove <think>...</think> tags
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove ```think\n...\n``` code blocks
        text = re.sub(r'```think\s*\n.*?\n```', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove standalone ```think``` markers
        text = re.sub(r'```think\s*```', '', text, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        text = text.strip()
        
        return text
    
    def generate_outline_stream(
        self,
        background: str,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        provider: str = 'deepseek',
        model: Optional[str] = None,
        language: str = 'zh'
    ) -> Generator[str, None, None]:
        """
        Stream generate story outline using AI
        
        Args:
            background: Story background
            characters: Character list
            character_personality: Character personality
            provider: AI provider
            model: Model name
            language: Language code
        
        Yields:
            Text chunks from AI stream
        """
        if not self.ai_service_streaming:
            import json
            yield json.dumps({"error": "Streaming service not available"}) + "\n"
            return
        
        # Load prompt template
        from utils.prompt_template_loader import PromptTemplateLoader
        template = PromptTemplateLoader.get_template(language)
        outline_template = template['outline_generation']
        
        # Build prompt (same as non-streaming version)
        prompt_parts = [outline_template['intro'] + "\n\n"]
        prompt_parts.append(f"{outline_template['sections']['background']}：\n{background}\n\n")
        
        if characters:
            prompt_parts.append(f"{outline_template['sections']['characters']}：\n")
            format_with = outline_template['character_format']['with_personality']
            format_without = outline_template['character_format']['without_personality']
            for i, char in enumerate(characters, 1):
                personality = character_personality.get(char, '') if character_personality else ''
                if personality:
                    prompt_parts.append(format_with.format(index=i, name=char, personality=personality) + "\n")
                else:
                    prompt_parts.append(format_without.format(index=i, name=char) + "\n")
            prompt_parts.append("\n")
        
        instructions = outline_template['instructions']
        prompt_parts.append(instructions['intro'] + "：\n")
        for item in instructions['items']:
            prompt_parts.append(item + "\n")
        prompt_parts.append("\n")
        prompt_parts.append(instructions['note'] + "\n")
        prompt_parts.append(instructions['warning'])
        
        prompt = ''.join(prompt_parts)
        
        # Get AI config
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        # Stream the response
        yield from self.ai_service_streaming.chat_stream(
            provider=api_config['provider'],
            message=prompt,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )

