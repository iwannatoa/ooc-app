"""
聊天记录服务层
"""
from typing import List, Optional, Dict
from repository.chat_repository import ChatRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatService:
    """聊天记录服务类"""
    
    def __init__(self, chat_repository: ChatRepository):
        """
        初始化服务
        
        Args:
            chat_repository: 聊天记录仓库实例
        """
        self.repository = chat_repository
    
    def save_user_message(
        self,
        conversation_id: str,
        message: str
    ) -> Dict:
        """
        保存用户消息
        
        Args:
            conversation_id: 会话ID
            message: 用户消息
        
        Returns:
            保存的记录字典
        """
        record = self.repository.save_message(
            conversation_id=conversation_id,
            role='user',
            content=message
        )
        return record.to_dict()
    
    def save_assistant_message(
        self,
        conversation_id: str,
        content: str,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict:
        """
        保存助手消息
        
        Args:
            conversation_id: 会话ID
            content: 助手回复内容
            model: 使用的模型
            provider: AI提供商
        
        Returns:
            保存的记录字典
        """
        record = self.repository.save_message(
            conversation_id=conversation_id,
            role='assistant',
            content=content,
            model=model,
            provider=provider
        )
        return record.to_dict()
    
    def get_conversation(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[Dict]:
        """
        获取会话消息列表
        
        Args:
            conversation_id: 会话ID
            limit: 限制数量
            offset: 偏移量
        
        Returns:
            消息列表
        """
        records = self.repository.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )
        return [record.to_dict() for record in records]
    
    def get_all_conversations(self) -> List[str]:
        """
        获取所有会话ID列表
        
        Returns:
            会话ID列表
        """
        return self.repository.get_all_conversations()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        删除会话
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
        """
        return self.repository.delete_conversation(conversation_id)
    
    def get_conversation_count(self) -> int:
        """
        获取会话总数
        
        Returns:
            会话数量
        """
        return self.repository.get_conversation_count()
    
    def delete_last_message(self, conversation_id: str) -> Optional[int]:
        """
        Delete the last message in a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Deleted message ID or None if no message found
        """
        return self.repository.delete_last_message(conversation_id)

