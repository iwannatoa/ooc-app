"""
聊天记录数据模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ChatRecord(Base):
    """聊天记录模型"""
    __tablename__ = 'chat_records'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, index=True, comment='会话ID')
    role = Column(String(20), nullable=False, comment='角色: user, assistant')
    content = Column(Text, nullable=False, comment='消息内容')
    model = Column(String(100), nullable=True, comment='使用的模型')
    provider = Column(String(50), nullable=True, comment='AI提供商: ollama, deepseek')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True, comment='创建时间')
    
    # Add index to improve query performance
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'model': self.model,
            'provider': self.provider,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

