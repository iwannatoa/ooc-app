"""
Story progress data access layer
"""
from typing import Optional
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from model.story_progress import StoryProgress, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class StoryProgressRepository:
    """Story progress repository class"""
    
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
            connect_args={
                'check_same_thread': False,
                'timeout': 20.0,
            },
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        with self.engine.connect() as conn:
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('PRAGMA synchronous=NORMAL')
            conn.execute('PRAGMA cache_size=-64000')
            conn.execute('PRAGMA temp_store=MEMORY')
            conn.commit()
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._init_database()
    
    def _init_database(self):
        """Initialize database, create tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"Story progress database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize story progress database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    def get_progress(self, conversation_id: str) -> Optional[StoryProgress]:
        """
        Get story progress
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Progress object, or None if not exists
        """
        session = self._get_session()
        try:
            progress = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).first()
            return progress
        except Exception as e:
            logger.error(f"Failed to get progress: {str(e)}")
            raise
        finally:
            session.close()
    
    def create_or_update_progress(
        self,
        conversation_id: str,
        current_section: int = 0,
        total_sections: Optional[int] = None,
        last_generated_content: Optional[str] = None,
        last_generated_section: Optional[int] = None,
        status: str = 'pending',
        outline_confirmed: bool = False
    ) -> StoryProgress:
        """
        Create or update story progress
        
        Args:
            conversation_id: Conversation ID
            current_section: Current section number
            total_sections: Total sections count
            last_generated_content: Last generated content
            last_generated_section: Last generated section number
            status: Status
            outline_confirmed: Whether outline is confirmed
        
        Returns:
            Progress object
        """
        session = self._get_session()
        try:
            existing = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).first()
            
            if existing:
                # Update existing progress
                existing.current_section = current_section
                if total_sections is not None:
                    existing.total_sections = total_sections
                if last_generated_content is not None:
                    existing.last_generated_content = last_generated_content
                if last_generated_section is not None:
                    existing.last_generated_section = last_generated_section
                existing.status = status
                existing.outline_confirmed = 'true' if outline_confirmed else 'false'
                existing.updated_at = datetime.utcnow()
                session.commit()
                session.refresh(existing)
                logger.info(f"Updated progress for conversation: {conversation_id}")
                return existing
            else:
                # Create new progress
                new_progress = StoryProgress(
                    conversation_id=conversation_id,
                    current_section=current_section,
                    total_sections=total_sections,
                    last_generated_content=last_generated_content,
                    last_generated_section=last_generated_section,
                    status=status,
                    outline_confirmed='true' if outline_confirmed else 'false',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_progress)
                session.commit()
                session.refresh(new_progress)
                logger.info(f"Created progress for conversation: {conversation_id}")
                return new_progress
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save progress: {str(e)}")
            raise
        finally:
            session.close()
    
    def mark_outline_confirmed(self, conversation_id: str) -> bool:
        """
        Mark outline as confirmed
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether successful
        """
        session = self._get_session()
        try:
            progress = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).first()
            
            if progress:
                progress.outline_confirmed = 'true'
                progress.status = 'pending'  # Can start generation after outline is confirmed
                progress.updated_at = datetime.utcnow()
            else:
                # Create progress if it doesn't exist
                progress = StoryProgress(
                    conversation_id=conversation_id,
                    current_section=0,
                    status='pending',
                    outline_confirmed='true',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(progress)
            
            session.commit()
            session.refresh(progress)
            logger.info(f"Marked outline confirmed for conversation: {conversation_id}")
            return True
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to mark outline confirmed: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_progress(self, conversation_id: str) -> bool:
        """
        Delete story progress
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
        """
        session = self._get_session()
        try:
            deleted = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).delete()
            session.commit()
            logger.info(f"Deleted progress for conversation: {conversation_id}")
            return deleted > 0
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete progress: {str(e)}")
            raise
        finally:
            session.close()

