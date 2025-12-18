"""
会话总结数据访问层
"""
from typing import Optional
from datetime import datetime
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from src.model.conversation_summary import ConversationSummary, Base
from src.utils.logger import get_logger

logger = get_logger(__name__)


class SummaryRepository:
    """会话总结仓库类"""
    
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
            logger.info(f"Summary database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize summary database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def create_or_update_summary(
        self,
        conversation_id: str,
        summary: str,
        message_count: int = 0,
        token_count: Optional[int] = None
    ) -> ConversationSummary:
        """
        创建或更新会话总结
        
        Args:
            conversation_id: 会话ID
            summary: 总结内容
            message_count: 消息数量
            token_count: token 数量（可选）
        
        Returns:
            总结对象
        """
        session = self._get_session()
        try:
            # 查找是否已存在总结
            existing = session.query(ConversationSummary).filter(
                ConversationSummary.conversation_id == conversation_id
            ).first()
            
            if existing:
                # 更新现有总结
                existing.summary = summary
                existing.message_count = message_count
                existing.token_count = token_count
                existing.updated_at = datetime.utcnow()
                session.commit()
                session.refresh(existing)
                logger.info(f"Updated summary for conversation: {conversation_id}")
                return existing
            else:
                # 创建新总结
                new_summary = ConversationSummary(
                    conversation_id=conversation_id,
                    summary=summary,
                    message_count=message_count,
                    token_count=token_count,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_summary)
                session.commit()
                session.refresh(new_summary)
                logger.info(f"Created summary for conversation: {conversation_id}")
                return new_summary
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save summary: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_summary(self, conversation_id: str) -> Optional[ConversationSummary]:
        """
        获取会话总结
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            总结对象，如果不存在则返回 None
        """
        session = self._get_session()
        try:
            summary = session.query(ConversationSummary).filter(
                ConversationSummary.conversation_id == conversation_id
            ).order_by(ConversationSummary.updated_at.desc()).first()
            return summary
        except Exception as e:
            logger.error(f"Failed to get summary: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_summary(self, conversation_id: str) -> bool:
        """
        删除会话总结
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
        """
        session = self._get_session()
        try:
            deleted = session.query(ConversationSummary).filter(
                ConversationSummary.conversation_id == conversation_id
            ).delete()
            session.commit()
            logger.info(f"Deleted summary for conversation: {conversation_id}")
            return deleted > 0
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete summary: {str(e)}")
            raise
        finally:
            session.close()

