"""
Character record data access layer
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from model.character_record import CharacterRecord, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class CharacterRecordRepository:
    """Character record repository"""
    
    def __init__(self, db_path: str):
        """
        Initialize repository
        
        Args:
            db_path: Database file path
        """
        self.db_path = db_path
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._init_database()
    
    def _init_database(self):
        """Initialize database, create tables and migrate schema if needed"""
        try:
            Base.metadata.create_all(self.engine)
            self._migrate_database()
            logger.info(f"Character record database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize character record database: {str(e)}")
            raise
    
    def _migrate_database(self):
        """Migrate database schema to add missing columns"""
        from sqlalchemy import inspect, text
        from sqlalchemy.exc import OperationalError
        
        inspector = inspect(self.engine)
        if not inspector.has_table('character_records'):
            return
        
        columns = [col['name'] for col in inspector.get_columns('character_records')]
        session = self._get_session()
        try:
            # Add missing columns (SQLite supports DEFAULT with NOT NULL in ALTER TABLE ADD COLUMN)
            if 'is_unavailable' not in columns:
                session.execute(text('ALTER TABLE character_records ADD COLUMN is_unavailable INTEGER DEFAULT 0 NOT NULL'))
                logger.info("Added column is_unavailable to character_records")
            
            if 'is_auto_generated' not in columns:
                session.execute(text('ALTER TABLE character_records ADD COLUMN is_auto_generated INTEGER DEFAULT 0 NOT NULL'))
                logger.info("Added column is_auto_generated to character_records")
            
            if 'notes' not in columns:
                session.execute(text('ALTER TABLE character_records ADD COLUMN notes TEXT'))
                logger.info("Added column notes to character_records")
            
            if 'first_appeared_at' not in columns:
                session.execute(text('ALTER TABLE character_records ADD COLUMN first_appeared_at DATETIME'))
                # Set default value for existing rows
                if 'created_at' in columns:
                    session.execute(text("UPDATE character_records SET first_appeared_at = created_at WHERE first_appeared_at IS NULL"))
                else:
                    session.execute(text("UPDATE character_records SET first_appeared_at = datetime('now') WHERE first_appeared_at IS NULL"))
                logger.info("Added column first_appeared_at to character_records")
            
            session.commit()
        except OperationalError as e:
            session.rollback()
            error_str = str(e).lower()
            # If column already exists (race condition), that's okay
            if 'duplicate column name' in error_str or 'already exists' in error_str:
                logger.info(f"Column already exists, skipping migration: {str(e)}")
            else:
                logger.warning(f"Database migration warning: {str(e)}")
        except Exception as e:
            session.rollback()
            logger.warning(f"Database migration error: {str(e)}")
        finally:
            session.close()
    
    def _get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    def create_character(
        self,
        conversation_id: str,
        name: str,
        first_appeared_message_id: Optional[int] = None,
        is_main: bool = False,
        is_unavailable: bool = False,
        is_auto_generated: bool = False,
        notes: Optional[str] = None
    ) -> CharacterRecord:
        """
        Create a new character record
        
        Args:
            conversation_id: Conversation ID
            name: Character name
            first_appeared_message_id: ID of the message where this character first appeared
            is_main: Whether this is a main character
            is_unavailable: Whether this character is unavailable
            is_auto_generated: Whether this character was auto-generated
            notes: Additional notes
        
        Returns:
            CharacterRecord object
        """
        session = self._get_session()
        try:
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
                updated_at=datetime.utcnow()
            )
            session.add(character)
            session.commit()
            session.refresh(character)
            logger.info(f"Created character record: conversation_id={conversation_id}, name={name}")
            return character
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to create character record: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_character(self, conversation_id: str, name: str) -> Optional[CharacterRecord]:
        """
        Get a character by conversation_id and name
        
        Args:
            conversation_id: Conversation ID
            name: Character name
        
        Returns:
            CharacterRecord object or None
        """
        session = self._get_session()
        try:
            character = session.query(CharacterRecord).filter(
                CharacterRecord.conversation_id == conversation_id,
                CharacterRecord.name == name
            ).first()
            return character
        except Exception as e:
            logger.error(f"Failed to get character: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_characters_by_conversation(
        self,
        conversation_id: str,
        include_unavailable: bool = True
    ) -> List[CharacterRecord]:
        """
        Get all characters for a conversation
        
        Args:
            conversation_id: Conversation ID
            include_unavailable: Whether to include unavailable characters
        
        Returns:
            List of CharacterRecord objects
        """
        session = self._get_session()
        try:
            query = session.query(CharacterRecord).filter(
                CharacterRecord.conversation_id == conversation_id
            )
            if not include_unavailable:
                query = query.filter(~CharacterRecord.is_unavailable)
            return query.order_by(CharacterRecord.first_appeared_at).all()
        except Exception as e:
            logger.error(f"Failed to get characters: {str(e)}")
            raise
        finally:
            session.close()
    
    def update_character(
        self,
        conversation_id: str,
        name: str,
        is_main: Optional[bool] = None,
        is_unavailable: Optional[bool] = None,
        notes: Optional[str] = None
    ) -> Optional[CharacterRecord]:
        """
        Update character properties
        
        Args:
            conversation_id: Conversation ID
            name: Character name
            is_main: Whether this is a main character
            is_unavailable: Whether this character is unavailable
            notes: Additional notes
        
        Returns:
            Updated CharacterRecord object or None if not found
        """
        session = self._get_session()
        try:
            character = session.query(CharacterRecord).filter(
                CharacterRecord.conversation_id == conversation_id,
                CharacterRecord.name == name
            ).first()
            
            if not character:
                return None
            
            if is_main is not None:
                character.is_main = is_main
            if is_unavailable is not None:
                character.is_unavailable = is_unavailable
            if notes is not None:
                character.notes = notes
            character.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(character)
            logger.info(f"Updated character: conversation_id={conversation_id}, name={name}")
            return character
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to update character: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_characters_by_message_id(self, message_id: int) -> int:
        """
        Delete characters that first appeared in a specific message
        This is used when deleting the latest message to clean up character records
        
        Args:
            message_id: Message ID
        
        Returns:
            Number of deleted characters
        """
        session = self._get_session()
        try:
            deleted = session.query(CharacterRecord).filter(
                CharacterRecord.first_appeared_message_id == message_id
            ).delete()
            session.commit()
            logger.info(f"Deleted {deleted} character records for message_id={message_id}")
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete characters by message_id: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_characters_by_conversation(self, conversation_id: str) -> int:
        """
        Delete all characters for a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Number of deleted characters
        """
        session = self._get_session()
        try:
            deleted = session.query(CharacterRecord).filter(
                CharacterRecord.conversation_id == conversation_id
            ).delete()
            session.commit()
            logger.info(f"Deleted {deleted} character records for conversation_id={conversation_id}")
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete characters by conversation: {str(e)}")
            raise
        finally:
            session.close()

