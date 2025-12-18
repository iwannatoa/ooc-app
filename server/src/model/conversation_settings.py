"""
会话设置数据模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class ConversationSettings(Base):
    """会话设置模型"""
    __tablename__ = 'conversation_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, unique=True, index=True, comment='会话ID')
    title = Column(String(200), nullable=True, comment='会话标题')
    background = Column(Text, nullable=True, comment='故事背景')
    characters = Column(Text, nullable=True, comment='人物（JSON格式）')
    character_personality = Column(Text, nullable=True, comment='人物性格（JSON格式）')
    outline = Column(Text, nullable=True, comment='大纲（可选）')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    def to_dict(self) -> dict:
        """转换为字典"""
        import json
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'title': self.title,
            'background': self.background,
            'characters': json.loads(self.characters) if self.characters else None,
            'character_personality': json.loads(self.character_personality) if self.character_personality else None,
            'outline': self.outline,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

