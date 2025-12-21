"""
聊天记录数据访问层
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from model.chat_record import ChatRecord, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatRepository:
    """聊天记录仓库类"""
    
    def __init__(self, db_path: str):
        """
        初始化仓库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        # Create database engine
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}  # SQLite allows multi-threading
        )
        # Create session factory
        self.SessionLocal = sessionmaker(bind=self.engine)
        # Create tables (if not exist)
        self._init_database()
    
    def _init_database(self):
        """初始化数据库，创建表"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"Database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> ChatRecord:
        """
        保存聊天消息
        
        Args:
            conversation_id: 会话ID
            role: 角色 (user, assistant)
            content: 消息内容
            model: 使用的模型
            provider: AI提供商
        
        Returns:
            保存的聊天记录
        """
        session = self._get_session()
        try:
            record = ChatRecord(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model=model,
                provider=provider,
                created_at=datetime.utcnow()
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            logger.info(f"Saved message: conversation_id={conversation_id}, role={role}")
            return record
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save message: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_conversation_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[ChatRecord]:
        """
        获取会话的所有消息
        
        Args:
            conversation_id: 会话ID
            limit: 限制返回数量
            offset: 偏移量
        
        Returns:
            聊天记录列表
        """
        session = self._get_session()
        try:
            query = session.query(ChatRecord).filter(
                ChatRecord.conversation_id == conversation_id
            ).order_by(ChatRecord.created_at)
            
            if offset > 0:
                query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            
            return query.all()
        except Exception as e:
            logger.error(f"Failed to get conversation messages: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_all_conversations(self) -> List[str]:
        """
        获取所有会话ID列表
        
        Returns:
            会话ID列表
        """
        session = self._get_session()
        try:
            # Use DISTINCT to get unique conversation IDs
            result = session.query(ChatRecord.conversation_id).distinct().all()
            return [row[0] for row in result]
        except Exception as e:
            logger.error(f"Failed to get all conversations: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        删除整个会话
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
        """
        session = self._get_session()
        try:
            deleted = session.query(ChatRecord).filter(
                ChatRecord.conversation_id == conversation_id
            ).delete()
            session.commit()
            logger.info(f"Deleted conversation: {conversation_id}, {deleted} messages")
            return deleted > 0
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete conversation: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_conversation_count(self) -> int:
        """
        获取会话总数
        
        Returns:
            会话数量
        """
        session = self._get_session()
        try:
            count = session.query(ChatRecord.conversation_id).distinct().count()
            return count
        except Exception as e:
            logger.error(f"Failed to get conversation count: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_last_assistant_message(self, conversation_id: str) -> Optional[ChatRecord]:
        """
        Get the last assistant message in a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Last assistant ChatRecord or None if not found
        """
        session = self._get_session()
        try:
            last_message = session.query(ChatRecord).filter(
                ChatRecord.conversation_id == conversation_id,
                ChatRecord.role == 'assistant'
            ).order_by(desc(ChatRecord.created_at)).first()
            return last_message
        except Exception as e:
            logger.error(f"Failed to get last assistant message: {str(e)}")
            raise
        finally:
            session.close()
    
    def delete_last_message(self, conversation_id: str) -> Optional[ChatRecord]:
        """
        Delete the last message in a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Deleted ChatRecord object (with id and content) or None if no message found
        """
        session = self._get_session()
        try:
            last_message = session.query(ChatRecord).filter(
                ChatRecord.conversation_id == conversation_id
            ).order_by(desc(ChatRecord.created_at)).first()
            
            if last_message:
                # Store message info before deletion
                message_info = ChatRecord(
                    id=last_message.id,
                    conversation_id=last_message.conversation_id,
                    role=last_message.role,
                    content=last_message.content,
                    model=last_message.model,
                    provider=last_message.provider,
                    created_at=last_message.created_at
                )
                message_id = last_message.id
                session.delete(last_message)
                session.commit()
                logger.info(f"Deleted last message: conversation_id={conversation_id}, message_id={message_id}")
                return message_info
            return None
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete last message: {str(e)}")
            raise
        finally:
            session.close()

