"""
Database path utility
"""
import os
from pathlib import Path
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

