"""
故事进度数据访问层
"""
from typing import Optional
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.model.story_progress import StoryProgress, Base
from src.utils.logger import get_logger

logger = get_logger(__name__)


class StoryProgressRepository:
    """故事进度仓库类"""
    
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
            logger.info(f"Story progress database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize story progress database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def get_progress(self, conversation_id: str) -> Optional[StoryProgress]:
        """
        获取故事进度
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            进度对象，如果不存在则返回 None
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
        创建或更新故事进度
        
        Args:
            conversation_id: 会话ID
            current_section: 当前章节编号
            total_sections: 总章节数
            last_generated_content: 最后生成的内容
            last_generated_section: 最后生成的部分编号
            status: 状态
            outline_confirmed: 大纲是否已确认
        
        Returns:
            进度对象
        """
        session = self._get_session()
        try:
            existing = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).first()
            
            if existing:
                # 更新现有进度
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
                # 创建新进度
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
        标记大纲已确认
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功
        """
        session = self._get_session()
        try:
            progress = session.query(StoryProgress).filter(
                StoryProgress.conversation_id == conversation_id
            ).first()
            
            if progress:
                progress.outline_confirmed = 'true'
                progress.status = 'pending'  # 大纲确认后，可以开始生成
                progress.updated_at = datetime.utcnow()
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to mark outline confirmed: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_progress(self, conversation_id: str) -> bool:
        """
        删除故事进度
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
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

