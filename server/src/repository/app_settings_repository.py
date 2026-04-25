"""
Application settings data access layer
"""
from typing import Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session, sessionmaker

from model.app_settings import AppSettings
from repository.session_context import repository_session
from utils.logger import get_logger

logger = get_logger(__name__)


class AppSettingsRepository:
    """Application settings repository"""

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def get_setting(self, key: str) -> Optional[AppSettings]:
        with repository_session(self._session_factory, None) as sess:
            return sess.query(AppSettings).filter(AppSettings.key == key).first()

    def get_value(self, key: str, default: Optional[str] = None) -> Optional[str]:
        setting = self.get_setting(key)
        return setting.value if setting else default

    def set_setting(self, key: str, value: str, session: Optional[Session] = None) -> AppSettings:
        with repository_session(self._session_factory, session) as sess:
            setting = sess.query(AppSettings).filter(AppSettings.key == key).first()
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
            else:
                setting = AppSettings(
                    key=key,
                    value=value,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                sess.add(setting)
            sess.flush()
            sess.refresh(setting)
            logger.info(f"Saved app setting: key={key}")
            return setting

    def get_all_settings(self) -> Dict[str, str]:
        with repository_session(self._session_factory, None) as sess:
            settings = sess.query(AppSettings).all()
            return {s.key: s.value for s in settings}
