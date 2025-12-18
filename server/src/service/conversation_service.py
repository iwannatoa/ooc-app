"""
会话设置服务层
"""
from typing import List, Optional, Dict
from src.repository.conversation_repository import ConversationRepository
from src.service.ai_service import AIService
from src.service.ai_config_service import AIConfigService
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ConversationService:
    """会话设置服务类"""
    
    def __init__(
        self,
        conversation_repository: ConversationRepository,
        ai_service: AIService,
        ai_config_service: AIConfigService
    ):
        """
        初始化服务
        
        Args:
            conversation_repository: 会话设置仓库实例
            ai_service: AI 服务实例
            ai_config_service: AI 配置服务实例
        """
        self.repository = conversation_repository
        self.ai_service = ai_service
        self.ai_config_service = ai_config_service
    
    def create_or_update_settings(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        background: Optional[str] = None,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        outline: Optional[str] = None
    ) -> Dict:
        """
        创建或更新会话设置
        
        Args:
            conversation_id: 会话ID
            title: 会话标题
            background: 故事背景
            characters: 人物列表
            character_personality: 人物性格字典
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
            outline=outline
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
        model: Optional[str] = None
    ) -> str:
        """
        使用AI生成故事大纲
        
        Args:
            background: 故事背景
            characters: 人物列表
            character_personality: 人物性格字典
            provider: AI提供商
            model: 模型名称
            api_key: API密钥
            base_url: 基础URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            生成的大纲内容
        """
        prompt_parts = ["请根据以下信息生成一个详细的故事大纲：\n\n"]
        
        prompt_parts.append(f"故事背景：\n{background}\n\n")
        
        if characters:
            prompt_parts.append("主要人物：\n")
            for i, char in enumerate(characters, 1):
                personality = character_personality.get(char, '') if character_personality else ''
                if personality:
                    prompt_parts.append(f"{i}. {char} - 性格：{personality}\n")
                else:
                    prompt_parts.append(f"{i}. {char}\n")
            prompt_parts.append("\n")
        
        prompt_parts.append(
            "请生成一个详细的故事大纲，包括：\n"
            "1. 故事的开端和背景设定\n"
            "2. 主要冲突和矛盾\n"
            "3. 故事发展和转折点\n"
            "4. 高潮部分\n"
            "5. 结局方向\n\n"
            "大纲应该详细且具有可操作性，能够指导后续的故事创作。"
        )
        
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
            return result.get('response', '')
        else:
            raise Exception(result.get('error', 'Failed to generate outline'))

