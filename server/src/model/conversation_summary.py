"""
Conversation summary data model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ConversationSummary(Base):
    """Conversation summary model"""
    __tablename__ = 'conversation_summaries'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, index=True, comment='Conversation ID')
    summary = Column(Text, nullable=False, comment='Story summary content')
    message_count = Column(Integer, nullable=False, default=0, comment='Message count at summary time')
    token_count = Column(Integer, nullable=True, comment='Token count at summary time (estimated)')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='Created at')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='Updated at')
    
    # Add index
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'summary': self.summary,
            'message_count': self.message_count,
            'token_count': self.token_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

