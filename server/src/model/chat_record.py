"""
Chat record data model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ChatRecord(Base):
    """Chat record model"""
    __tablename__ = 'chat_records'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, index=True, comment='Conversation ID')
    role = Column(String(20), nullable=False, comment='Role: user, assistant')
    content = Column(Text, nullable=False, comment='Message content')
    model = Column(String(100), nullable=True, comment='Model used')
    provider = Column(String(50), nullable=True, comment='AI provider: ollama, deepseek')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True, comment='Created at')
    
    # Add index to improve query performance
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'model': self.model,
            'provider': self.provider,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

