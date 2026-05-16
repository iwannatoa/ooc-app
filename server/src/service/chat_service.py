"""
Chat record service layer
"""
from typing import List, Optional, Dict, Any
from uuid import uuid4
import json

from sqlalchemy.orm import Session

from repository.chat_repository import ChatRepository
from service.attachment_storage_service import AttachmentStorageService
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatService:
    """Chat record service class"""
    
    def __init__(
        self,
        chat_repository: ChatRepository,
        attachment_storage_service: AttachmentStorageService,
    ):
        """
        Initialize service
        
        Args:
            chat_repository: Chat record repository instance
        """
        self.repository = chat_repository
        self.attachment_storage_service = attachment_storage_service
    
    def save_user_message(
        self,
        conversation_id: str,
        message: str,
        content_type: str = 'text',
        attachment_ref: Optional[str] = None,
        branch_id: Optional[str] = None,
        savepoint_id: Optional[str] = None,
        session: Optional[Session] = None,
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
            content=message,
            content_type=content_type,
            attachment_ref=attachment_ref,
            branch_id=branch_id,
            savepoint_id=savepoint_id,
            session=session,
        )
        return record.to_dict()
    
    def save_assistant_message(
        self,
        conversation_id: str,
        content: str,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        parent_message_id: Optional[int] = None,
        variant_group_id: Optional[str] = None,
        content_type: str = 'text',
        attachment_ref: Optional[str] = None,
        branch_id: Optional[str] = None,
        savepoint_id: Optional[str] = None,
        ending_tag: Optional[str] = None,
        session: Optional[Session] = None,
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
            provider=provider,
            content_type=content_type,
            attachment_ref=attachment_ref,
            parent_message_id=parent_message_id,
            variant_group_id=variant_group_id,
            branch_id=branch_id,
            savepoint_id=savepoint_id,
            ending_tag=ending_tag,
            session=session,
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
        rows = [record.to_dict() for record in records]
        message_ids = [int(row['id']) for row in rows if row.get('id') is not None]
        attachments_by_message = self.attachment_storage_service.list_by_message_ids(
            message_ids
        )
        for row in rows:
            message_id = row.get('id')
            attachment_items = []
            if message_id is not None:
                attachment_rows = attachments_by_message.get(int(message_id), [])
                attachment_items = [
                    {
                        'type': 'image'
                        if str(att.get('mime_type', '')).startswith('image/')
                        else 'file',
                        'name': att.get('filename'),
                        'mimeType': att.get('mime_type'),
                        'sizeBytes': att.get('size_bytes'),
                        'assetRef': att.get('asset_ref'),
                        'status': att.get('status'),
                        'storagePath': att.get('storage_path'),
                    }
                    for att in attachment_rows
                ]
            if not attachment_items:
                attachment_items = _parse_attachment_ref(row.get('attachment_ref'))
            if attachment_items:
                row['attachments'] = attachment_items
                parts = []
                if row.get('content'):
                    parts.append({'type': 'text', 'content': row.get('content')})
                for item in attachment_items:
                    parts.append(
                        {
                            'type': item.get('type', 'file'),
                            'name': item.get('name'),
                            'mimeType': item.get('mimeType'),
                            'sizeBytes': item.get('sizeBytes'),
                            'assetRef': item.get('assetRef'),
                            'storagePath': item.get('storagePath'),
                        }
                    )
                row['parts'] = parts
        return rows
    
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

    def get_assistant_variants(self, conversation_id: str, limit: int = 30) -> List[Dict]:
        rows = self.repository.get_assistant_messages(conversation_id, limit=limit)
        return [row.to_dict() for row in rows]

    def restore_assistant_variant(
        self,
        conversation_id: str,
        message_id: int,
        session: Optional[Session] = None,
    ) -> Optional[Dict]:
        source = self.repository.get_message_by_id(
            conversation_id,
            message_id,
            session=session,
        )
        if not source or source.role != 'assistant':
            return None
        variant_group_id = source.variant_group_id or f"vg-{uuid4().hex[:12]}"
        restored = self.repository.save_message(
            conversation_id=conversation_id,
            role='assistant',
            content=source.content,
            model=source.model,
            provider=source.provider,
            content_type=source.content_type or 'text',
            attachment_ref=source.attachment_ref,
            parent_message_id=source.id,
            variant_group_id=variant_group_id,
            branch_id=source.branch_id,
            savepoint_id=source.savepoint_id,
            ending_tag=source.ending_tag,
            session=session,
        )
        return restored.to_dict()

    def create_branch(
        self,
        conversation_id: str,
        parent_message_id: Optional[int] = None,
        label: Optional[str] = None,
        branch_id: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> Dict[str, Any]:
        resolved_branch_id = branch_id or f"br-{uuid4().hex[:12]}"
        return self.repository.create_branch(
            conversation_id=conversation_id,
            branch_id=resolved_branch_id,
            parent_message_id=parent_message_id,
            label=label,
            session=session,
        )

    def list_branches(self, conversation_id: str) -> List[Dict[str, Any]]:
        return self.repository.list_branches(conversation_id)

    def create_savepoint(
        self,
        conversation_id: str,
        message_id: Optional[int] = None,
        label: Optional[str] = None,
        savepoint_id: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> Dict[str, Any]:
        resolved_savepoint_id = savepoint_id or f"sp-{uuid4().hex[:12]}"
        return self.repository.create_savepoint(
            conversation_id=conversation_id,
            savepoint_id=resolved_savepoint_id,
            message_id=message_id,
            label=label,
            session=session,
        )

    def list_savepoints(self, conversation_id: str) -> List[Dict[str, Any]]:
        return self.repository.list_savepoints(conversation_id)

    def mark_ending(
        self,
        conversation_id: str,
        ending_tag: str,
        branch_id: Optional[str] = None,
        message_id: Optional[int] = None,
        session: Optional[Session] = None,
    ) -> Dict[str, Any]:
        return self.repository.mark_ending(
            conversation_id=conversation_id,
            ending_tag=ending_tag,
            branch_id=branch_id,
            message_id=message_id,
            session=session,
        )

    def list_endings(self, conversation_id: str) -> List[Dict[str, Any]]:
        return self.repository.list_endings(conversation_id)


def _parse_attachment_ref(raw_ref: Optional[str]) -> List[Dict[str, Any]]:
    if not raw_ref:
        return []
    try:
        payload = json.loads(raw_ref)
    except Exception:
        return []
    if not isinstance(payload, list):
        return []
    output: List[Dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        mime_type = str(item.get('mime_type') or item.get('mimeType') or '')
        output.append(
            {
                'type': 'image' if mime_type.startswith('image/') else 'file',
                'name': item.get('name'),
                'mimeType': mime_type,
                'sizeBytes': item.get('size_bytes') or item.get('sizeBytes'),
                'assetRef': item.get('asset_ref') or item.get('assetRef'),
                'storagePath': item.get('storage_path') or item.get('storagePath'),
                'status': item.get('status') or 'uploaded',
            }
        )
    return output

