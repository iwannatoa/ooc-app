"""
Prompt template loader
Load and manage prompt templates from JSON files
"""
import json
import sys
from pathlib import Path
from typing import Dict, Any
from functools import lru_cache
from utils.logger import get_logger

logger = get_logger(__name__)

def get_templates_dir() -> Path:
    """
    Get templates directory path
    Supports both development and PyInstaller bundled environments
    """
    if getattr(sys, 'frozen', False):
        # PyInstaller bundled environment
        # sys._MEIPASS is the temporary folder where PyInstaller extracts files
        # In PyInstaller, datas are extracted to sys._MEIPASS with their specified path
        base_path = Path(sys._MEIPASS)
        return base_path / 'utils' / 'prompt_templates'
    else:
        # Development environment
        return Path(__file__).parent / 'prompt_templates'

TEMPLATES_DIR = get_templates_dir()


class PromptTemplateLoader:
    """Load and cache prompt templates"""
    
    _cache: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    @lru_cache(maxsize=10)
    def get_template(cls, language: str) -> Dict[str, Any]:
        """
        Get template for specific language
        
        Args:
            language: Language code ('zh' or 'en')
        
        Returns:
            Template dictionary
        """
        if language not in cls._cache:
            template_path = TEMPLATES_DIR / f'{language}.json'
            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    cls._cache[language] = json.load(f)
                logger.info(f"Loaded prompt template for language: {language}")
            except FileNotFoundError:
                logger.warning(f"Template file not found for language: {language}, falling back to 'zh'")
                if language != 'zh':
                    return cls.get_template('zh')
                else:
                    raise ValueError(f"Template file not found for language: {language}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse template file for language: {language}, error: {str(e)}")
                raise ValueError(f"Invalid template file for language: {language}")
        
        return cls._cache[language]


    @classmethod
    def clear_cache(cls):
        """Clear template cache"""
        cls._cache.clear()
        cls.get_template.cache_clear()

