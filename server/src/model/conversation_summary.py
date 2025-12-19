"""
会话总结数据模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ConversationSummary(Base):
    """会话总结模型"""
    __tablename__ = 'conversation_summaries'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, index=True, comment='会话ID')
    summary = Column(Text, nullable=False, comment='故事总结内容')
    message_count = Column(Integer, nullable=False, default=0, comment='总结时的消息数量')
    token_count = Column(Integer, nullable=True, comment='总结时的 token 数量（估算）')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    # Add index
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'summary': self.summary,
            'message_count': self.message_count,
            'token_count': self.token_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

