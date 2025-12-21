"""
Conversation settings data access layer
"""
from typing import List, Optional, Dict
from datetime import datetime
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from model.conversation_settings import ConversationSettings, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class ConversationRepository:
    """Conversation settings repository"""
    
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
            logger.info(f"Conversation settings database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize conversation settings database: {str(e)}")
            raise
    
    def _migrate_database(self):
        """Migrate database schema to add missing columns"""
        from sqlalchemy import inspect, text
        
        inspector = inspect(self.engine)
        if not inspector.has_table('conversation_settings'):
            return
        
        columns = [col['name'] for col in inspector.get_columns('conversation_settings')]
        session = self._get_session()
        try:
            # Add missing allow_auto_generate_characters column
            if 'allow_auto_generate_characters' not in columns:
                session.execute(text(
                    'ALTER TABLE conversation_settings ADD COLUMN allow_auto_generate_characters INTEGER DEFAULT 1 NOT NULL'
                ))
                logger.info("Added column allow_auto_generate_characters to conversation_settings")
                session.commit()
            
            # Add missing additional_settings column
            if 'additional_settings' not in columns:
                session.execute(text(
                    'ALTER TABLE conversation_settings ADD COLUMN additional_settings TEXT'
                ))
                logger.info("Added column additional_settings to conversation_settings")
                session.commit()
            
            # Add missing character_is_main column
            if 'character_is_main' not in columns:
                session.execute(text(
                    'ALTER TABLE conversation_settings ADD COLUMN character_is_main TEXT'
                ))
                logger.info("Added column character_is_main to conversation_settings")
                session.commit()
        except Exception as e:
            session.rollback()
            # If column already exists (race condition), that's okay
            if 'duplicate column name' not in str(e).lower() and 'already exists' not in str(e).lower():
                logger.warning(f"Database migration warning: {str(e)}")
        finally:
            session.close()
    
    def _get_session(self) -> Session:
        return self.SessionLocal()
    
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
        additional_settings: Optional[Dict] = None
    ) -> ConversationSettings:
        """
        Create or update conversation settings
        
        Args:
            conversation_id: Conversation ID
            title: Conversation title
            background: Story background
            characters: Character list
            character_personality: Character personality dictionary
            outline: Outline
        
        Returns:
            Conversation settings object
        """
        session = self._get_session()
        try:
            settings = session.query(ConversationSettings).filter(
                ConversationSettings.conversation_id == conversation_id
            ).first()
            
            if settings:
                if title is not None:
                    settings.title = title
                if background is not None:
                    settings.background = background
                if characters is not None:
                    settings.characters = json.dumps(characters, ensure_ascii=False)
                if character_personality is not None:
                    settings.character_personality = json.dumps(character_personality, ensure_ascii=False)
                if character_is_main is not None:
                    settings.character_is_main = json.dumps(character_is_main, ensure_ascii=False) if character_is_main else None
                if outline is not None:
                    settings.outline = outline
                if allow_auto_generate_characters is not None:
                    settings.allow_auto_generate_characters = allow_auto_generate_characters
                if additional_settings is not None:
                    settings.additional_settings = json.dumps(additional_settings, ensure_ascii=False) if additional_settings else None
                settings.updated_at = datetime.utcnow()
            else:
                settings = ConversationSettings(
                    conversation_id=conversation_id,
                    title=title,
                    background=background,
                    characters=json.dumps(characters, ensure_ascii=False) if characters else None,
                    character_personality=json.dumps(character_personality, ensure_ascii=False) if character_personality else None,
                    character_is_main=json.dumps(character_is_main, ensure_ascii=False) if character_is_main else None,
                    outline=outline,
                    allow_auto_generate_characters=allow_auto_generate_characters if allow_auto_generate_characters is not None else True,
                    additional_settings=json.dumps(additional_settings, ensure_ascii=False) if additional_settings else None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(settings)
            
            session.commit()
            session.refresh(settings)
            logger.info(f"Saved conversation settings: conversation_id={conversation_id}")
            return settings
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save conversation settings: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_settings(self, conversation_id: str) -> Optional[ConversationSettings]:
        """
        Get conversation settings
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Conversation settings object, or None if not exists
        """
        session = self._get_session()
        try:
            settings = session.query(ConversationSettings).filter(
                ConversationSettings.conversation_id == conversation_id
            ).first()
            return settings
        except Exception as e:
            logger.error(f"Failed to get conversation settings: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_all_conversations_with_settings(self) -> List[Dict]:
        """
        Get all conversations with settings
        
        Returns:
            Conversations list (with settings information)
        """
        session = self._get_session()
        try:
            settings_list = session.query(ConversationSettings).order_by(
                ConversationSettings.updated_at.desc()
            ).all()
            return [s.to_dict() for s in settings_list]
        except Exception as e:
            logger.error(f"Failed to get all conversations: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_settings(self, conversation_id: str) -> bool:
        """
        Delete conversation settings
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
        """
        session = self._get_session()
        try:
            deleted = session.query(ConversationSettings).filter(
                ConversationSettings.conversation_id == conversation_id
            ).delete()
            session.commit()
            logger.info(f"Deleted conversation settings: {conversation_id}, {deleted} records")
            return deleted > 0
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete conversation settings: {str(e)}")
            raise
        finally:
            session.close()

