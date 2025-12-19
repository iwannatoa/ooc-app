"""
Conversation settings data model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ConversationSettings(Base):
    """Conversation settings model"""
    __tablename__ = 'conversation_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=True)
    background = Column(Text, nullable=True)
    characters = Column(Text, nullable=True)
    character_personality = Column(Text, nullable=True)
    character_is_main = Column(Text, nullable=True, comment='Character is_main flags (JSON format)')
    outline = Column(Text, nullable=True)
    allow_auto_generate_characters = Column(Boolean, default=True, nullable=False, comment='Whether to allow AI to auto-generate new characters')
    additional_settings = Column(Text, nullable=True, comment='Additional story settings (JSON format)')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        import json
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'title': self.title,
            'background': self.background,
            'characters': json.loads(self.characters) if self.characters else None,
            'character_personality': json.loads(self.character_personality) if self.character_personality else None,
            'character_is_main': json.loads(self.character_is_main) if self.character_is_main and hasattr(self, 'character_is_main') else None,
            'outline': self.outline,
            'allow_auto_generate_characters': self.allow_auto_generate_characters if hasattr(self, 'allow_auto_generate_characters') else True,
            'additional_settings': json.loads(self.additional_settings) if self.additional_settings and hasattr(self, 'additional_settings') else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

