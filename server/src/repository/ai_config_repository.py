"""
Global AI configuration data access layer
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session, sessionmaker

from model.ai_config import AIConfig
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


class AIConfigRepository:
    """Global AI configuration repository class"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def get_config(self, provider: str, include_api_key: bool = False) -> Optional[AIConfig]:
        with repository_session(self._session_factory, None) as sess:
            return sess.query(AIConfig).filter(AIConfig.provider == provider).first()

    def get_all_configs(self, include_api_key: bool = False) -> List[AIConfig]:
        with repository_session(self._session_factory, None) as sess:
            return sess.query(AIConfig).all()

    def create_or_update_config(
        self,
        provider: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        session: Optional[Session] = None,
    ) -> AIConfig:
        with repository_session(self._session_factory, session) as sess:
            existing = sess.query(AIConfig).filter(AIConfig.provider == provider).first()
            if existing:
                if model is not None:
                    existing.model = model
                if api_key is not None:
                    existing.api_key = api_key
                if base_url is not None:
                    existing.base_url = base_url
                if max_tokens is not None:
                    existing.max_tokens = max_tokens
                if temperature is not None:
                    existing.temperature = str(temperature)
                existing.updated_at = datetime.utcnow()
                sess.flush()
                sess.refresh(existing)
                logger.info(f"Updated AI config for provider: {provider}")
                return existing
            new_config = AIConfig(
                provider=provider,
                model=model,
                api_key=api_key,
                base_url=base_url,
                max_tokens=max_tokens,
                temperature=str(temperature) if temperature is not None else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            sess.add(new_config)
            sess.flush()
            sess.refresh(new_config)
            logger.info(f"Created AI config for provider: {provider}")
            return new_config
