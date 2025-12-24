"""
Conversation summary data access layer
"""
from typing import Optional
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, Session
from model.conversation_summary import ConversationSummary, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class SummaryRepository:
    """Conversation summary repository"""
    
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
            Base.metadata.create_all(self.engine, checkfirst=True)
            logger.info(f"Summary database initialized at: {self.db_path}")
        except OperationalError as e:
            error_str = str(e).lower()
            if "index" in error_str and "already exists" in error_str:
                logger.warning(f"Index already exists, skipping: {str(e)}")
                logger.info(f"Summary database already initialized at: {self.db_path}")
            else:
                logger.error(f"Failed to initialize summary database: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Failed to initialize summary database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        return self.SessionLocal()
    
    def create_or_update_summary(
        self,
        conversation_id: str,
        summary: str,
        message_count: int = 0,
        token_count: Optional[int] = None
    ) -> ConversationSummary:
        """
        Create or update conversation summary
        
        Args:
            conversation_id: Conversation ID
            summary: Summary content
            message_count: Message count
            token_count: Token count (optional)
        
        Returns:
            Summary object
        """
        session = self._get_session()
        try:
            # Check if summary already exists
            existing = session.query(ConversationSummary).filter(
                ConversationSummary.conversation_id == conversation_id
            ).first()
            
            if existing:
                existing.summary = summary
                existing.message_count = message_count
                existing.token_count = token_count
                existing.updated_at = datetime.utcnow()
                session.commit()
                session.refresh(existing)
                logger.info(f"Updated summary for conversation: {conversation_id}")
                return existing
            else:
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
        Get conversation summary
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Summary object, or None if not exists
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
        Delete conversation summary
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
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

