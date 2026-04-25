"""
Conversation settings data access layer
"""
from typing import List, Optional, Dict
from datetime import datetime
import json
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from model.conversation_settings import ConversationSettings
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


def apply_conversation_settings_migrations(engine: Engine) -> None:
    """Add legacy columns to conversation_settings if missing (runs once at startup)."""
    inspector = inspect(engine)
    if not inspector.has_table('conversation_settings'):
        return
    columns = [col['name'] for col in inspector.get_columns('conversation_settings')]
    from infrastructure.database import get_sessionmaker

    factory = get_sessionmaker()
    session = factory()
    try:
        if 'allow_auto_generate_characters' not in columns:
            session.execute(
                text(
                    'ALTER TABLE conversation_settings ADD COLUMN allow_auto_generate_characters INTEGER DEFAULT 1 NOT NULL'
                )
            )
            logger.info('Added column allow_auto_generate_characters to conversation_settings')
            session.commit()
        if 'additional_settings' not in columns:
            session.execute(
                text('ALTER TABLE conversation_settings ADD COLUMN additional_settings TEXT')
            )
            logger.info('Added column additional_settings to conversation_settings')
            session.commit()
        if 'character_is_main' not in columns:
            session.execute(
                text('ALTER TABLE conversation_settings ADD COLUMN character_is_main TEXT')
            )
            logger.info('Added column character_is_main to conversation_settings')
            session.commit()
    except Exception as e:
        session.rollback()
        err = str(e).lower()
        if 'duplicate column name' not in err and 'already exists' not in err:
            logger.warning(f'Database migration warning: {str(e)}')
    finally:
        session.close()


class ConversationRepository:
    """Conversation settings repository"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

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
        additional_settings: Optional[Dict] = None,
        session: Optional[Session] = None,
    ) -> ConversationSettings:
        with repository_session(self._session_factory, session) as sess:
            settings = (
                sess.query(ConversationSettings)
                .filter(ConversationSettings.conversation_id == conversation_id)
                .first()
            )
            if settings:
                if title is not None:
                    settings.title = title
                if background is not None:
                    settings.background = background
                if characters is not None:
                    settings.characters = json.dumps(characters, ensure_ascii=False)
                if character_personality is not None:
                    settings.character_personality = json.dumps(
                        character_personality, ensure_ascii=False
                    )
                if character_is_main is not None:
                    settings.character_is_main = (
                        json.dumps(character_is_main, ensure_ascii=False)
                        if character_is_main
                        else None
                    )
                if outline is not None:
                    settings.outline = outline
                if allow_auto_generate_characters is not None:
                    settings.allow_auto_generate_characters = allow_auto_generate_characters
                if additional_settings is not None:
                    settings.additional_settings = (
                        json.dumps(additional_settings, ensure_ascii=False)
                        if additional_settings
                        else None
                    )
                settings.updated_at = datetime.utcnow()
            else:
                settings = ConversationSettings(
                    conversation_id=conversation_id,
                    title=title,
                    background=background,
                    characters=json.dumps(characters, ensure_ascii=False) if characters else None,
                    character_personality=(
                        json.dumps(character_personality, ensure_ascii=False)
                        if character_personality
                        else None
                    ),
                    character_is_main=(
                        json.dumps(character_is_main, ensure_ascii=False)
                        if character_is_main
                        else None
                    ),
                    outline=outline,
                    allow_auto_generate_characters=(
                        allow_auto_generate_characters
                        if allow_auto_generate_characters is not None
                        else True
                    ),
                    additional_settings=(
                        json.dumps(additional_settings, ensure_ascii=False)
                        if additional_settings
                        else None
                    ),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                sess.add(settings)
            sess.flush()
            sess.refresh(settings)
            logger.info(f"Saved conversation settings: conversation_id={conversation_id}")
            return settings

    def get_settings(self, conversation_id: str) -> Optional[ConversationSettings]:
        with repository_session(self._session_factory, None) as sess:
            return (
                sess.query(ConversationSettings)
                .filter(ConversationSettings.conversation_id == conversation_id)
                .first()
            )

    def get_all_conversations_with_settings(self) -> List[Dict]:
        with repository_session(self._session_factory, None) as sess:
            settings_list = (
                sess.query(ConversationSettings)
                .order_by(ConversationSettings.updated_at.desc())
                .all()
            )
            return [s.to_dict() for s in settings_list]

    def delete_settings(self, conversation_id: str) -> bool:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(ConversationSettings)
                .filter(ConversationSettings.conversation_id == conversation_id)
                .delete()
            )
            logger.info(f"Deleted conversation settings: {conversation_id}, {deleted} records")
            return deleted > 0
