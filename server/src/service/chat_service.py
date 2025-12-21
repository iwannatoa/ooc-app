"""
Chat record service layer
"""
from typing import List, Optional, Dict
from repository.chat_repository import ChatRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatService:
    """Chat record service class"""
    
    def __init__(self, chat_repository: ChatRepository):
        """
        Initialize service
        
        Args:
            chat_repository: Chat record repository instance
        """
        self.repository = chat_repository
    
    def save_user_message(
        self,
        conversation_id: str,
        message: str
    ) -> Dict:
        """
        Save user message
        
        Args:
            conversation_id: Conversation ID
            message: User message
        
        Returns:
            Saved record dictionary
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
        Save assistant message
        
        Args:
            conversation_id: Conversation ID
            content: Assistant reply content
            model: Model used
            provider: AI provider
        
        Returns:
            Saved record dictionary
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
        Get conversation messages list
        
        Args:
            conversation_id: Conversation ID
            limit: Limit count
            offset: Offset
        
        Returns:
            Messages list
        """
        records = self.repository.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )
        return [record.to_dict() for record in records]
    
    def get_all_conversations(self) -> List[str]:
        """
        Get all conversation IDs list
        
        Returns:
            Conversation IDs list
        """
        return self.repository.get_all_conversations()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
        """
        return self.repository.delete_conversation(conversation_id)
    
    def get_conversation_count(self) -> int:
        """
        Get total conversation count
        
        Returns:
            Conversation count
        """
        return self.repository.get_conversation_count()
    
    def get_last_assistant_message(self, conversation_id: str) -> Optional[Dict]:
        """
        Get the last assistant message in a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Last assistant message dict or None if not found
        """
        message = self.repository.get_last_assistant_message(conversation_id)
        return message.to_dict() if message else None
    
    def delete_last_message(self, conversation_id: str) -> Optional[Dict]:
        """
        Delete the last message in a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Deleted message dict (with id, role, content) or None if no message found
        """
        message = self.repository.delete_last_message(conversation_id)
        return message.to_dict() if message else None

