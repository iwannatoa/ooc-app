"""
Conversation summary data access layer
"""
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session, sessionmaker

from model.conversation_summary import ConversationSummary
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


class SummaryRepository:
    """Conversation summary repository"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def create_or_update_summary(
        self,
        conversation_id: str,
        summary: str,
        message_count: int = 0,
        token_count: Optional[int] = None,
        session: Optional[Session] = None,
    ) -> ConversationSummary:
        with repository_session(self._session_factory, session) as sess:
            existing = (
                sess.query(ConversationSummary)
                .filter(ConversationSummary.conversation_id == conversation_id)
                .first()
            )
            if existing:
                existing.summary = summary
                existing.message_count = message_count
                existing.token_count = token_count
                existing.updated_at = datetime.utcnow()
                sess.flush()
                sess.refresh(existing)
                logger.info(f"Updated summary for conversation: {conversation_id}")
                return existing
            new_summary = ConversationSummary(
                conversation_id=conversation_id,
                summary=summary,
                message_count=message_count,
                token_count=token_count,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            sess.add(new_summary)
            sess.flush()
            sess.refresh(new_summary)
            logger.info(f"Created summary for conversation: {conversation_id}")
            return new_summary

    def get_summary(self, conversation_id: str) -> Optional[ConversationSummary]:
        with repository_session(self._session_factory, None) as sess:
            return (
                sess.query(ConversationSummary)
                .filter(ConversationSummary.conversation_id == conversation_id)
                .order_by(ConversationSummary.updated_at.desc())
                .first()
            )

    def delete_summary(self, conversation_id: str) -> bool:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(ConversationSummary)
                .filter(ConversationSummary.conversation_id == conversation_id)
                .delete()
            )
            logger.info(f"Deleted summary for conversation: {conversation_id}")
            return deleted > 0
