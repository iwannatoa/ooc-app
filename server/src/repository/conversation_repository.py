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
        """Initialize database, create tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"Conversation settings database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize conversation settings database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        return self.SessionLocal()
    
    def create_or_update_settings(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        background: Optional[str] = None,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        outline: Optional[str] = None,
        allow_auto_generate_characters: Optional[bool] = None
    ) -> ConversationSettings:
        """
        创建或更新会话设置
        
        Args:
            conversation_id: 会话ID
            title: 会话标题
            background: 故事背景
            characters: 人物列表
            character_personality: 人物设定字典
            outline: 大纲
        
        Returns:
            会话设置对象
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
                if outline is not None:
                    settings.outline = outline
                if allow_auto_generate_characters is not None:
                    settings.allow_auto_generate_characters = allow_auto_generate_characters
                settings.updated_at = datetime.utcnow()
            else:
                settings = ConversationSettings(
                    conversation_id=conversation_id,
                    title=title,
                    background=background,
                    characters=json.dumps(characters, ensure_ascii=False) if characters else None,
                    character_personality=json.dumps(character_personality, ensure_ascii=False) if character_personality else None,
                    outline=outline,
                    allow_auto_generate_characters=allow_auto_generate_characters if allow_auto_generate_characters is not None else True,
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
        获取会话设置
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            会话设置对象，如果不存在则返回 None
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
        获取所有会话及其设置
        
        Returns:
            会话列表（包含设置信息）
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
        删除会话设置
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
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

