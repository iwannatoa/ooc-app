"""
Chat record data access layer
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import desc
from sqlalchemy.orm import Session, sessionmaker

from model.chat_record import ChatRecord
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatRepository:
    """Chat record repository class"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        parent_message_id: Optional[int] = None,
        variant_group_id: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> ChatRecord:
        with repository_session(self._session_factory, session) as sess:
            record = ChatRecord(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model=model,
                provider=provider,
                parent_message_id=parent_message_id,
                variant_group_id=variant_group_id,
                created_at=datetime.utcnow(),
            )
            sess.add(record)
            sess.flush()
            sess.refresh(record)
            logger.info(f"Saved message: conversation_id={conversation_id}, role={role}")
            return record

    def get_conversation_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[ChatRecord]:
        with repository_session(self._session_factory, None) as sess:
            query = (
                sess.query(ChatRecord)
                .filter(ChatRecord.conversation_id == conversation_id)
                .order_by(ChatRecord.created_at)
            )
            if offset > 0:
                query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            return query.all()

    def get_all_conversations(self) -> List[str]:
        with repository_session(self._session_factory, None) as sess:
            result = sess.query(ChatRecord.conversation_id).distinct().all()
            return [row[0] for row in result]

    def delete_conversation(self, conversation_id: str) -> bool:
        with repository_session(self._session_factory, None) as sess:
            deleted = sess.query(ChatRecord).filter(
                ChatRecord.conversation_id == conversation_id
            ).delete()
            logger.info(f"Deleted conversation: {conversation_id}, {deleted} messages")
            return deleted > 0

    def get_conversation_count(self) -> int:
        with repository_session(self._session_factory, None) as sess:
            return sess.query(ChatRecord.conversation_id).distinct().count()

    def get_last_assistant_message(self, conversation_id: str) -> Optional[ChatRecord]:
        with repository_session(self._session_factory, None) as sess:
            return (
                sess.query(ChatRecord)
                .filter(
                    ChatRecord.conversation_id == conversation_id,
                    ChatRecord.role == 'assistant',
                )
                .order_by(desc(ChatRecord.created_at))
                .first()
            )

    def delete_last_message(self, conversation_id: str) -> Optional[ChatRecord]:
        with repository_session(self._session_factory, None) as sess:
            last_message = (
                sess.query(ChatRecord)
                .filter(ChatRecord.conversation_id == conversation_id)
                .order_by(desc(ChatRecord.created_at))
                .first()
            )
            if last_message:
                message_info = ChatRecord(
                    id=last_message.id,
                    conversation_id=last_message.conversation_id,
                    role=last_message.role,
                    content=last_message.content,
                    model=last_message.model,
                    provider=last_message.provider,
                    created_at=last_message.created_at,
                )
                message_id = last_message.id
                sess.delete(last_message)
                logger.info(
                    f"Deleted last message: conversation_id={conversation_id}, message_id={message_id}"
                )
                return message_info
            return None
