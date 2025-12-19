"""
Internationalization (i18n) utility
Provides localization support for error messages and user messages
"""
from typing import Dict, Any, Optional
from utils.prompt_template_loader import PromptTemplateLoader


class I18n:
    """Internationalization helper class"""
    
    _cache: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def get_text(cls, language: str, key: str, default: Optional[str] = None) -> str:
        """
        Get localized text by key
        
        Args:
            language: Language code ('zh' or 'en')
            key: Dot-separated key path (e.g., 'error_messages.outline_required')
            default: Default value if key not found
        
        Returns:
            Localized text string
        """
        if language not in cls._cache:
            template = PromptTemplateLoader.get_template(language)
            cls._cache[language] = template
        
        template = cls._cache[language]
        keys = key.split('.')
        value = template
        
        try:
            for k in keys:
                value = value[k]
            return value if isinstance(value, str) else str(value)
        except (KeyError, TypeError):
            if default is not None:
                return default
            # Fallback to English if key not found
            if language != 'en':
                return cls.get_text('en', key, default=key)
            return key
    
    @classmethod
    def clear_cache(cls):
        """Clear i18n cache"""
        cls._cache.clear()


def get_i18n_text(language: str, key: str, default: Optional[str] = None) -> str:
    """
    Convenience function to get localized text
    
    Args:
        language: Language code ('zh' or 'en')
        key: Dot-separated key path
        default: Default value if key not found
    
    Returns:
        Localized text string
    """
    return I18n.get_text(language, key, default)

