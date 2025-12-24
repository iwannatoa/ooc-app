"""
Story progress tracking data model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class StoryProgress(Base):
    """Story progress tracking model"""
    __tablename__ = 'story_progress'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, unique=True, index=True, comment='Conversation ID')
    current_section = Column(Integer, nullable=False, default=0, comment='Current section number')
    total_sections = Column(Integer, nullable=True, comment='Total sections (if outline is segmented)')
    last_generated_content = Column(Text, nullable=True, comment='Last generated story content')
    last_generated_section = Column(Integer, nullable=True, comment='Last generated section number')
    status = Column(String(50), nullable=False, default='pending', comment='Status: pending, generating, completed')
    outline_confirmed = Column(String(10), nullable=False, default='false', comment='Whether outline is confirmed')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='Created at')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='Updated at')
    
    # Add index
    __table_args__ = (
        Index('idx_conversation_status', 'conversation_id', 'status'),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'current_section': self.current_section,
            'total_sections': self.total_sections,
            'last_generated_content': self.last_generated_content,
            'last_generated_section': self.last_generated_section,
            'status': self.status,
            'outline_confirmed': self.outline_confirmed == 'true',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

