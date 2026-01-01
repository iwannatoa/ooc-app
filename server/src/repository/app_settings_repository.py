"""
Application settings data access layer
"""
from typing import Optional, Dict
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from model.app_settings import AppSettings, Base
from utils.logger import get_logger

logger = get_logger(__name__)


class AppSettingsRepository:
    """Application settings repository"""
    
    def __init__(self, db_path: str):
        """
        Initialize repository
        
        Args:
            db_path: Database file path
        """
        self.db_path = db_path
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={
                'check_same_thread': False,
                'timeout': 20.0,
            },
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        with self.engine.connect() as conn:
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('PRAGMA synchronous=NORMAL')
            conn.execute('PRAGMA cache_size=-64000')
            conn.execute('PRAGMA temp_store=MEMORY')
            conn.commit()
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._init_database()
    
    def _init_database(self):
        """Initialize database, create tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"App settings database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize app settings database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        return self.SessionLocal()
    
    def get_setting(self, key: str) -> Optional[AppSettings]:
        """
        Get setting by key
        
        Args:
            key: Setting key
        
        Returns:
            AppSettings instance or None
        """
        session = self._get_session()
        try:
            return session.query(AppSettings).filter(AppSettings.key == key).first()
        finally:
            session.close()
    
    def get_value(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get setting value by key
        
        Args:
            key: Setting key
            default: Default value if not found
        
        Returns:
            Setting value or default
        """
        setting = self.get_setting(key)
        return setting.value if setting else default
    
    def set_setting(self, key: str, value: str) -> AppSettings:
        """
        Set or update setting
        
        Args:
            key: Setting key
            value: Setting value
        
        Returns:
            AppSettings instance
        """
        session = self._get_session()
        try:
            setting = session.query(AppSettings).filter(AppSettings.key == key).first()
            
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
            else:
                setting = AppSettings(
                    key=key,
                    value=value,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(setting)
            
            session.commit()
            session.refresh(setting)
            logger.info(f"Saved app setting: key={key}")
            return setting
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save app setting: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_all_settings(self) -> Dict[str, str]:
        """
        Get all settings as dictionary
        
        Returns:
            Dictionary of key-value pairs
        """
        session = self._get_session()
        try:
            settings = session.query(AppSettings).all()
            return {s.key: s.value for s in settings}
        finally:
            session.close()

