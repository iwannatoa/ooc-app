"""
Global AI configuration data model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class AIConfig(Base):
    """Global AI configuration model"""
    __tablename__ = 'ai_configs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False, unique=True, index=True, comment='AI provider (ollama, deepseek)')
    model = Column(String(100), nullable=True, comment='Default model name')
    api_key = Column(Text, nullable=True, comment='API key (required for DeepSeek)')
    base_url = Column(String(500), nullable=True, comment='Custom base URL')
    max_tokens = Column(Integer, nullable=True, default=2048, comment='Maximum tokens')
    temperature = Column(String(10), nullable=True, default='0.7', comment='Temperature parameter')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='Created at')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='Updated at')
    
    # Ensure only one record per provider
    __table_args__ = (
        UniqueConstraint('provider', name='uq_provider'),
    )
    
    def to_dict(self, include_api_key: bool = False) -> dict:
        """
        Convert to dictionary
        
        Args:
            include_api_key: Whether to include API Key (default False, for security)
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

