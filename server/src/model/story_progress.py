"""
故事进度跟踪数据模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class StoryProgress(Base):
    """故事进度跟踪模型"""
    __tablename__ = 'story_progress'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, unique=True, index=True, comment='会话ID')
    current_section = Column(Integer, nullable=False, default=0, comment='当前章节/部分编号')
    total_sections = Column(Integer, nullable=True, comment='总章节数（如果大纲已分段）')
    last_generated_content = Column(Text, nullable=True, comment='最后生成的故事内容')
    last_generated_section = Column(Integer, nullable=True, comment='最后生成的部分编号')
    status = Column(String(50), nullable=False, default='pending', comment='状态：pending(等待开始), generating(生成中), completed(已完成)')
    outline_confirmed = Column(String(10), nullable=False, default='false', comment='大纲是否已确认')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    # 添加索引
    __table_args__ = (
        Index('idx_conversation_status', 'conversation_id', 'status'),
    )
    
    def to_dict(self) -> dict:
        """转换为字典"""
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

