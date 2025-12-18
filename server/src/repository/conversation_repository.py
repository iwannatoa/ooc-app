"""
会话设置数据访问层
"""
from typing import List, Optional, Dict
from datetime import datetime
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.model.conversation_settings import ConversationSettings, Base
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ConversationRepository:
    """会话设置仓库类"""
    
    def __init__(self, db_path: str):
        """
        初始化仓库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        # 创建数据库引擎
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}
        )
        # 创建会话工厂
        self.SessionLocal = sessionmaker(bind=self.engine)
        # 创建表（如果不存在）
        self._init_database()
    
    def _init_database(self):
        """初始化数据库，创建表"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"Conversation settings database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize conversation settings database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def create_or_update_settings(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        background: Optional[str] = None,
        characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        outline: Optional[str] = None
    ) -> ConversationSettings:
        """
        创建或更新会话设置
        
        Args:
            conversation_id: 会话ID
            title: 会话标题
            background: 故事背景
            characters: 人物列表
            character_personality: 人物性格字典
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
                # 更新现有设置
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
                settings.updated_at = datetime.utcnow()
            else:
                # 创建新设置
                settings = ConversationSettings(
                    conversation_id=conversation_id,
                    title=title,
                    background=background,
                    characters=json.dumps(characters, ensure_ascii=False) if characters else None,
                    character_personality=json.dumps(character_personality, ensure_ascii=False) if character_personality else None,
                    outline=outline,
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

