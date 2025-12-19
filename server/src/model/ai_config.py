"""
全局 AI 配置数据模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class AIConfig(Base):
    """全局 AI 配置模型"""
    __tablename__ = 'ai_configs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False, unique=True, index=True, comment='AI提供商（ollama, deepseek）')
    model = Column(String(100), nullable=True, comment='默认模型名称')
    api_key = Column(Text, nullable=True, comment='API密钥（DeepSeek需要）')
    base_url = Column(String(500), nullable=True, comment='自定义基础URL')
    max_tokens = Column(Integer, nullable=True, default=2048, comment='最大令牌数')
    temperature = Column(String(10), nullable=True, default='0.7', comment='温度参数')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    # Ensure only one record per provider
    __table_args__ = (
        UniqueConstraint('provider', name='uq_provider'),
    )
    
    def to_dict(self, include_api_key: bool = False) -> dict:
        """
        转换为字典
        
        Args:
            include_api_key: 是否包含 API Key（默认 False，安全考虑）
        """
        result = {
            'id': self.id,
            'provider': self.provider,
            'model': self.model,
            'base_url': self.base_url,
            'max_tokens': self.max_tokens,
            'temperature': float(self.temperature) if self.temperature else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Return API Key only when explicitly requested
        if include_api_key:
            result['api_key'] = self.api_key
        
        return result

