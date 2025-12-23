"""
Global AI configuration data access layer
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from model.ai_config import AIConfig, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class AIConfigRepository:
    """Global AI configuration repository class"""
    
    def __init__(self, db_path: str):
        """
        Initialize repository
        
        Args:
            db_path: Database file path
        """
        self.db_path = db_path
        # Create database engine
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}
        )
        # Create session factory
        self.SessionLocal = sessionmaker(bind=self.engine)
        # Create tables (if not exist)
        self._init_database()
    
    def _init_database(self):
        """Initialize database, create tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"AI config database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize AI config database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    def get_config(self, provider: str, include_api_key: bool = False) -> Optional[AIConfig]:
        """
        Get configuration for specified provider
        
        Args:
            provider: AI provider (ollama, deepseek)
            include_api_key: Whether to include API Key
        
        Returns:
            Config object, or None if not exists
        """
        session = self._get_session()
        try:
            config = session.query(AIConfig).filter(
                AIConfig.provider == provider
            ).first()
            return config
        except Exception as e:
            logger.error(f"Failed to get AI config: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_all_configs(self, include_api_key: bool = False) -> List[AIConfig]:
        """
        Get all AI configurations
        
        Args:
            include_api_key: Whether to include API Key
        
        Returns:
            Config list
        """
        session = self._get_session()
        try:
            configs = session.query(AIConfig).all()
            return configs
        except Exception as e:
            logger.error(f"Failed to get all AI configs: {str(e)}")
            raise
        finally:
            session.close()
    
    def create_or_update_config(
        self,
        provider: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AIConfig:
        """
        Create or update AI configuration
        
        Args:
            provider: AI provider (ollama, deepseek)
            model: Default model name
            api_key: API key
            base_url: Custom base URL
            max_tokens: Maximum tokens
            temperature: Temperature parameter
        
        Returns:
            Config object
        """
        session = self._get_session()
        try:
            existing = session.query(AIConfig).filter(
                AIConfig.provider == provider
            ).first()
            
            if existing:
                # Update existing configuration
                if model is not None:
                    existing.model = model
                # Update API key if it's explicitly provided (including empty string to clear it)
                # If api_key is None, it means the field wasn't in the update, so keep existing value
                if api_key is not None:
                    existing.api_key = api_key
                if base_url is not None:
                    existing.base_url = base_url
                if max_tokens is not None:
                    existing.max_tokens = max_tokens
                if temperature is not None:
                    existing.temperature = str(temperature)
                existing.updated_at = datetime.utcnow()
                session.commit()
                session.refresh(existing)
                logger.info(f"Updated AI config for provider: {provider}")
                return existing
            else:
                # Create new configuration
                new_config = AIConfig(
                    provider=provider,
                    model=model,
                    api_key=api_key,
                    base_url=base_url,
                    max_tokens=max_tokens,
                    temperature=str(temperature) if temperature is not None else None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_config)
                session.commit()
                session.refresh(new_config)
                logger.info(f"Created AI config for provider: {provider}")
                return new_config
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save AI config: {str(e)}")
            raise
        finally:
            session.close()

