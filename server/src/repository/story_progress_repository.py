"""
Story progress data access layer
"""
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session, sessionmaker

from model.story_progress import StoryProgress
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


class StoryProgressRepository:
    """Story progress repository class"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def get_progress(
        self, conversation_id: str, session: Optional[Session] = None
    ) -> Optional[StoryProgress]:
        with repository_session(self._session_factory, session) as sess:
            return (
                sess.query(StoryProgress)
                .filter(StoryProgress.conversation_id == conversation_id)
                .first()
            )

    def create_or_update_progress(
        self,
        conversation_id: str,
        current_section: int = 0,
        total_sections: Optional[int] = None,
        last_generated_content: Optional[str] = None,
        last_generated_section: Optional[int] = None,
        status: str = 'pending',
        outline_confirmed: bool = False,
        session: Optional[Session] = None,
        *,
        update_total_sections: bool = False,
    ) -> StoryProgress:
        with repository_session(self._session_factory, session) as sess:
            existing = (
                sess.query(StoryProgress)
                .filter(StoryProgress.conversation_id == conversation_id)
                .first()
            )
            if existing:
                existing.current_section = current_section
                if update_total_sections:
                    existing.total_sections = total_sections
                if last_generated_content is not None:
                    existing.last_generated_content = last_generated_content
                if last_generated_section is not None:
                    existing.last_generated_section = last_generated_section
                existing.status = status
                existing.outline_confirmed = 'true' if outline_confirmed else 'false'
                existing.updated_at = datetime.utcnow()
                sess.flush()
                sess.refresh(existing)
                logger.info(f"Updated progress for conversation: {conversation_id}")
                return existing
            new_progress = StoryProgress(
                conversation_id=conversation_id,
                current_section=current_section,
                total_sections=total_sections,
                last_generated_content=last_generated_content,
                last_generated_section=last_generated_section,
                status=status,
                outline_confirmed='true' if outline_confirmed else 'false',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            sess.add(new_progress)
            sess.flush()
            sess.refresh(new_progress)
            logger.info(f"Created progress for conversation: {conversation_id}")
            return new_progress

    def mark_outline_confirmed(self, conversation_id: str) -> bool:
        with repository_session(self._session_factory, None) as sess:
            progress = (
                sess.query(StoryProgress)
                .filter(StoryProgress.conversation_id == conversation_id)
                .first()
            )
            if progress:
                progress.outline_confirmed = 'true'
                progress.status = 'pending'
                progress.updated_at = datetime.utcnow()
            else:
                progress = StoryProgress(
                    conversation_id=conversation_id,
                    current_section=0,
                    status='pending',
                    outline_confirmed='true',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                sess.add(progress)
            sess.flush()
            sess.refresh(progress)
            logger.info(f"Marked outline confirmed for conversation: {conversation_id}")
            return True

    def delete_progress(self, conversation_id: str) -> bool:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(StoryProgress)
                .filter(StoryProgress.conversation_id == conversation_id)
                .delete()
            )
            logger.info(f"Deleted progress for conversation: {conversation_id}")
            return deleted > 0
