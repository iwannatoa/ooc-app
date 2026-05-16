"""
Chat record data access layer
"""
from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy import desc, text
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
        content_type: str = 'text',
        attachment_ref: Optional[str] = None,
        parent_message_id: Optional[int] = None,
        variant_group_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        savepoint_id: Optional[str] = None,
        ending_tag: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> ChatRecord:
        with repository_session(self._session_factory, session) as sess:
            record = ChatRecord(
                conversation_id=conversation_id,
                role=role,
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

    def get_assistant_messages(
        self,
        conversation_id: str,
        limit: int = 30,
    ) -> List[ChatRecord]:
        with repository_session(self._session_factory, None) as sess:
            query = (
                sess.query(ChatRecord)
                .filter(
                    ChatRecord.conversation_id == conversation_id,
                    ChatRecord.role == 'assistant',
                )
                .order_by(desc(ChatRecord.created_at))
                .limit(limit)
            )
            return query.all()

    def get_message_by_id(
        self,
        conversation_id: str,
        message_id: int,
        session: Optional[Session] = None,
    ) -> Optional[ChatRecord]:
        with repository_session(self._session_factory, session) as sess:
            return (
                sess.query(ChatRecord)
                .filter(
                    ChatRecord.conversation_id == conversation_id,
                    ChatRecord.id == message_id,
                )
                .first()
            )

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
                    content_type=last_message.content_type,
                    attachment_ref=last_message.attachment_ref,
                    parent_message_id=last_message.parent_message_id,
                    variant_group_id=last_message.variant_group_id,
                    branch_id=last_message.branch_id,
                    savepoint_id=last_message.savepoint_id,
                    ending_tag=last_message.ending_tag,
                    created_at=last_message.created_at,
                )
                message_id = last_message.id
                sess.delete(last_message)
                logger.info(
                    f"Deleted last message: conversation_id={conversation_id}, message_id={message_id}"
                )
                return message_info
            return None

    def create_branch(
        self,
        conversation_id: str,
        branch_id: str,
        parent_message_id: Optional[int],
        label: Optional[str],
        session: Optional[Session] = None,
    ) -> Dict:
        with repository_session(self._session_factory, session) as sess:
            sess.execute(
                text(
                    "INSERT INTO story_branches "
                    "(conversation_id, branch_id, parent_message_id, label, created_at) "
                    "VALUES (:conversation_id, :branch_id, :parent_message_id, :label, :created_at)"
                ),
                {
                    "conversation_id": conversation_id,
                    "branch_id": branch_id,
                    "parent_message_id": parent_message_id,
                    "label": label,
                    "created_at": datetime.utcnow(),
                },
            )
            return {
                "conversation_id": conversation_id,
                "branch_id": branch_id,
                "parent_message_id": parent_message_id,
                "label": label,
            }

    def list_branches(self, conversation_id: str) -> List[Dict]:
        with repository_session(self._session_factory, None) as sess:
            rows = sess.execute(
                text(
                    "SELECT branch_id, parent_message_id, label, created_at "
                    "FROM story_branches WHERE conversation_id=:conversation_id "
                    "ORDER BY created_at ASC"
                ),
                {"conversation_id": conversation_id},
            ).mappings().all()
            return [dict(r) for r in rows]

    def create_savepoint(
        self,
        conversation_id: str,
        savepoint_id: str,
        message_id: Optional[int],
        label: Optional[str],
        session: Optional[Session] = None,
    ) -> Dict:
        with repository_session(self._session_factory, session) as sess:
            sess.execute(
                text(
                    "INSERT INTO story_savepoints "
                    "(conversation_id, savepoint_id, message_id, label, created_at) "
                    "VALUES (:conversation_id, :savepoint_id, :message_id, :label, :created_at)"
                ),
                {
                    "conversation_id": conversation_id,
                    "savepoint_id": savepoint_id,
                    "message_id": message_id,
                    "label": label,
                    "created_at": datetime.utcnow(),
                },
            )
            return {
                "conversation_id": conversation_id,
                "savepoint_id": savepoint_id,
                "message_id": message_id,
                "label": label,
            }

    def list_savepoints(self, conversation_id: str) -> List[Dict]:
        with repository_session(self._session_factory, None) as sess:
            rows = sess.execute(
                text(
                    "SELECT savepoint_id, message_id, label, created_at "
                    "FROM story_savepoints WHERE conversation_id=:conversation_id "
                    "ORDER BY created_at ASC"
                ),
                {"conversation_id": conversation_id},
            ).mappings().all()
            return [dict(r) for r in rows]

    def get_savepoint(self, conversation_id: str, savepoint_id: str) -> Optional[Dict]:
        with repository_session(self._session_factory, None) as sess:
            row = sess.execute(
                text(
                    "SELECT savepoint_id, message_id, label, created_at "
                    "FROM story_savepoints WHERE conversation_id=:conversation_id "
                    "AND savepoint_id=:savepoint_id LIMIT 1"
                ),
                {
                    "conversation_id": conversation_id,
                    "savepoint_id": savepoint_id,
                },
            ).mappings().first()
            return dict(row) if row else None

    def restore_to_message(self, conversation_id: str, message_id: int) -> int:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(ChatRecord)
                .filter(
                    ChatRecord.conversation_id == conversation_id,
                    ChatRecord.id > message_id,
                )
                .delete(synchronize_session=False)
            )
            logger.info(
                "Restored conversation to savepoint: conversation_id=%s message_id=%s deleted=%s",
                conversation_id,
                message_id,
                deleted,
            )
            return int(deleted or 0)

    def mark_ending(
        self,
        conversation_id: str,
        ending_tag: str,
        branch_id: Optional[str],
        message_id: Optional[int],
        session: Optional[Session] = None,
    ) -> Dict:
        with repository_session(self._session_factory, session) as sess:
            sess.execute(
                text(
                    "INSERT INTO story_endings "
                    "(conversation_id, branch_id, ending_tag, message_id, created_at) "
                    "VALUES (:conversation_id, :branch_id, :ending_tag, :message_id, :created_at)"
                ),
                {
                    "conversation_id": conversation_id,
                    "branch_id": branch_id,
                    "ending_tag": ending_tag,
                    "message_id": message_id,
                    "created_at": datetime.utcnow(),
                },
            )
            return {
                "conversation_id": conversation_id,
                "branch_id": branch_id,
                "ending_tag": ending_tag,
                "message_id": message_id,
            }

    def list_endings(self, conversation_id: str) -> List[Dict]:
        with repository_session(self._session_factory, None) as sess:
            rows = sess.execute(
                text(
                    "SELECT branch_id, ending_tag, message_id, created_at "
                    "FROM story_endings WHERE conversation_id=:conversation_id "
                    "ORDER BY created_at ASC"
                ),
                {"conversation_id": conversation_id},
            ).mappings().all()
            return [dict(r) for r in rows]
