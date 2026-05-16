"""
Database path utility
"""
import os
from pathlib import Path
from typing import Optional

from flask import g, has_request_context
from utils.logger import get_logger

logger = get_logger(__name__)


def get_database_path() -> str:
    """
    Get database path
    
    Priority:
    1. DB_PATH environment variable
    2. Development mode: server/data/local/chat.db
    3. Default path: server/data/chat.db
    
    Returns:
        Database file path
    """
    db_path = os.getenv('DB_PATH')
    if db_path:
        logger.info(f"Using database path from environment: {db_path}")
        return db_path
    
    is_dev = os.getenv('FLASK_ENV', '').lower() == 'development' or \
             os.getenv('FLASK_DEBUG', '').lower() == 'true' or \
             os.getenv('DEV', '').lower() == 'true'
    
    if is_dev:
        default_dir = Path(__file__).parent.parent.parent / 'data' / 'local'
        default_dir.mkdir(parents=True, exist_ok=True)
        db_path = str(default_dir / 'chat.db')
        logger.info(f"Using development database path: {db_path}")
        return db_path
    
    default_dir = Path(__file__).parent.parent.parent / 'data'
    default_dir.mkdir(parents=True, exist_ok=True)
    db_path = str(default_dir / 'chat.db')
    
    logger.info(f"Using default database path: {db_path}")
    return db_path


def get_app_data_dir() -> Path:
    """
    Get application data directory
    
    Infer from DB_PATH environment variable. If DB_PATH is /path/to/app_data/chat.db,
    return /path/to/app_data
    
    Returns:
        Application data directory path
    """
    db_path = os.getenv('DB_PATH')
    if db_path:
        db_file = Path(db_path)
        if db_file.is_file() or db_file.suffix == '.db':
            return db_file.parent
        return db_file
    
    default_db_path = get_database_path()
    return Path(default_db_path).parent


def get_active_profile_id(default: str = 'default') -> str:
    """
    Get active profile id from request context or environment.
    """
    if has_request_context():
        profile_id = getattr(g, 'profile_id', None)
        if isinstance(profile_id, str) and profile_id.strip():
            return profile_id.strip()
    env_profile = os.getenv('ACTIVE_PROFILE_ID', '').strip()
    if env_profile:
        return env_profile
    return default


def get_story_library_dir(
    profile_id: Optional[str] = None,
    story_library_path: Optional[str] = None,
) -> Path:
    """
    Get story library directory for active profile.

    Priority:
    1. Explicit story_library_path argument
    2. STORY_LIBRARY_PATH environment variable
    3. <app_data>/story-library (where app_data derives from DB_PATH)
    """
    configured = (story_library_path or os.getenv('STORY_LIBRARY_PATH', '')).strip()
    if configured:
        configured_path = Path(configured)
        if configured_path.is_absolute():
            return configured_path
        return get_app_data_dir() / configured_path

    _ = profile_id or get_active_profile_id()
    return get_app_data_dir() / 'story-library'

