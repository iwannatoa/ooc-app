"""
Application settings service layer
"""
from typing import Optional, Dict
from repository.app_settings_repository import AppSettingsRepository
from utils.logger import get_logger
import time

logger = get_logger(__name__)


class AppSettingsService:
    """Application settings service"""
    
    def __init__(self, app_settings_repository: AppSettingsRepository):
        """
        Initialize service
        
        Args:
            app_settings_repository: App settings repository instance
        """
        self.repository = app_settings_repository
        self._language_cache: Optional[str] = None
        self._language_cache_time: float = 0
        self._language_cache_ttl: float = 60.0
    
    def get_language(self) -> str:
        """
        Get language setting (with caching)
        
        Returns:
            Language code ('zh' or 'en'), defaults to 'zh'
        """
        current_time = time.time()
        if (self._language_cache is not None and 
            (current_time - self._language_cache_time) < self._language_cache_ttl):
            return self._language_cache
        
        value = self.repository.get_value('language', 'zh')
        result = value if value in ('zh', 'en') else 'zh'
        
        self._language_cache = result
        self._language_cache_time = current_time
        
        return result
    
    def set_language(self, language: str) -> Dict:
        """
        Set language setting
        
        Args:
            language: Language code ('zh' or 'en')
        
        Returns:
            Settings dictionary
        """
        if language not in ('zh', 'en'):
            raise ValueError(f"Invalid language: {language}. Must be 'zh' or 'en'")
        
        setting = self.repository.set_setting('language', language)
        self._language_cache = language
        self._language_cache_time = time.time()
        return setting.to_dict()
    
    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get setting value by key
        
        Args:
            key: Setting key
            default: Default value if not found
        
        Returns:
            Setting value or default
        """
        return self.repository.get_value(key, default)
    
    def set_setting(self, key: str, value: str) -> Dict:
        """
        Set or update setting
        
        Args:
            key: Setting key
            value: Setting value
        
        Returns:
            Settings dictionary
        """
        setting = self.repository.set_setting(key, value)
        return setting.to_dict()
    
    def get_all_settings(self) -> Dict[str, str]:
        """
        Get all settings
        
        Returns:
            Dictionary of key-value pairs
        """
        return self.repository.get_all_settings()

