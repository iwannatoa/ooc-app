"""
Character record data access layer
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from model.character_record import CharacterRecord
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


def apply_character_record_migrations(engine: Engine) -> None:
    """Legacy column adds for character_records."""
    inspector = inspect(engine)
    if not inspector.has_table('character_records'):
        return
    columns = [col['name'] for col in inspector.get_columns('character_records')]
    from infrastructure.database import get_sessionmaker

    factory = get_sessionmaker()
    session = factory()
    try:
        if 'is_unavailable' not in columns:
            session.execute(
                text(
                    'ALTER TABLE character_records ADD COLUMN is_unavailable INTEGER DEFAULT 0 NOT NULL'
                )
            )
            logger.info('Added column is_unavailable to character_records')
        if 'is_auto_generated' not in columns:
            session.execute(
                text(
                    'ALTER TABLE character_records ADD COLUMN is_auto_generated INTEGER DEFAULT 0 NOT NULL'
                )
            )
            logger.info('Added column is_auto_generated to character_records')
        if 'notes' not in columns:
            session.execute(text('ALTER TABLE character_records ADD COLUMN notes TEXT'))
            logger.info('Added column notes to character_records')
        if 'first_appeared_at' not in columns:
            session.execute(text('ALTER TABLE character_records ADD COLUMN first_appeared_at DATETIME'))
            if 'created_at' in columns:
                session.execute(
                    text(
                        "UPDATE character_records SET first_appeared_at = created_at WHERE first_appeared_at IS NULL"
                    )
                )
            else:
                session.execute(
                    text(
                        "UPDATE character_records SET first_appeared_at = datetime('now') WHERE first_appeared_at IS NULL"
                    )
                )
            logger.info('Added column first_appeared_at to character_records')
        session.commit()
    except OperationalError as e:
        session.rollback()
        error_str = str(e).lower()
        if 'duplicate column name' in error_str or 'already exists' in error_str:
            logger.info(f"Column already exists, skipping migration: {str(e)}")
        else:
            logger.warning(f"Database migration warning: {str(e)}")
    except Exception as e:
        session.rollback()
        logger.warning(f"Database migration error: {str(e)}")
    finally:
        session.close()


class CharacterRecordRepository:
    """Character record repository"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def create_character(
        self,
        conversation_id: str,
        name: str,
        first_appeared_message_id: Optional[int] = None,
        is_main: bool = False,
        is_unavailable: bool = False,
        is_auto_generated: bool = False,
        notes: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> CharacterRecord:
        with repository_session(self._session_factory, session) as sess:
            character = CharacterRecord(
                conversation_id=conversation_id,
                name=name,
                first_appeared_message_id=first_appeared_message_id,
                is_main=is_main,
                is_unavailable=is_unavailable,
                is_auto_generated=is_auto_generated,
                notes=notes,
                first_appeared_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            sess.add(character)
            sess.flush()
            sess.refresh(character)
            logger.info(f"Created character record: conversation_id={conversation_id}, name={name}")
            return character

    def get_character(self, conversation_id: str, name: str) -> Optional[CharacterRecord]:
        with repository_session(self._session_factory, None) as sess:
            return (
                sess.query(CharacterRecord)
                .filter(
                    CharacterRecord.conversation_id == conversation_id,
                    CharacterRecord.name == name,
                )
                .first()
            )

    def get_characters_by_conversation(
        self, conversation_id: str, include_unavailable: bool = True
    ) -> List[CharacterRecord]:
        with repository_session(self._session_factory, None) as sess:
            query = sess.query(CharacterRecord).filter(
                CharacterRecord.conversation_id == conversation_id
            )
            if not include_unavailable:
                query = query.filter(~CharacterRecord.is_unavailable)
            return query.order_by(CharacterRecord.first_appeared_at).all()

    def update_character(
        self,
        conversation_id: str,
        name: str,
        is_main: Optional[bool] = None,
        is_unavailable: Optional[bool] = None,
        notes: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> Optional[CharacterRecord]:
        with repository_session(self._session_factory, session) as sess:
            character = (
                sess.query(CharacterRecord)
                .filter(
                    CharacterRecord.conversation_id == conversation_id,
                    CharacterRecord.name == name,
                )
                .first()
            )
            if not character:
                return None
            if is_main is not None:
                character.is_main = is_main
            if is_unavailable is not None:
                character.is_unavailable = is_unavailable
            if notes is not None:
                character.notes = notes
            character.updated_at = datetime.utcnow()
            sess.flush()
            sess.refresh(character)
            logger.info(f"Updated character: conversation_id={conversation_id}, name={name}")
            return character

    def delete_characters_by_message_id(self, message_id: int) -> int:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(CharacterRecord)
                .filter(CharacterRecord.first_appeared_message_id == message_id)
                .delete()
            )
            logger.info(f"Deleted {deleted} character records for message_id={message_id}")
            return deleted

    def delete_characters_by_conversation(self, conversation_id: str) -> int:
        with repository_session(self._session_factory, None) as sess:
            deleted = (
                sess.query(CharacterRecord)
                .filter(CharacterRecord.conversation_id == conversation_id)
                .delete()
            )
            logger.info(
                f"Deleted {deleted} character records for conversation_id={conversation_id}"
            )
            return deleted
