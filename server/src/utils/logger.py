"""
Logging configuration module
"""
import logging
import sys
import os
from pathlib import Path
from typing import Optional
from logging.handlers import RotatingFileHandler

# Delayed import of Config to avoid circular dependency
def _get_config():
    from config import Config
    return Config

# Maximum log file size: 10MB
MAX_LOG_FILE_SIZE = 10 * 1024 * 1024
# Keep up to 5 backup files
MAX_LOG_BACKUP_COUNT = 5
# Maximum total size for all log files: ~50MB (5 * 10MB)
MAX_TOTAL_LOG_SIZE = MAX_LOG_FILE_SIZE * MAX_LOG_BACKUP_COUNT


def _get_log_dir() -> Optional[Path]:
    """
    Get the log directory path.
    Uses LOG_DIR environment variable if set, otherwise uses app data directory.
    """
    log_dir_env = os.getenv('LOG_DIR')
    if log_dir_env:
        return Path(log_dir_env)
    
    # Try to use app data directory from DB_PATH parent
    db_path = os.getenv('DB_PATH')
    if db_path:
        db_path_obj = Path(db_path)
        if db_path_obj.exists() or db_path_obj.parent.exists():
            log_dir = db_path_obj.parent / 'logs'
            log_dir.mkdir(parents=True, exist_ok=True)
            return log_dir
    
    # Fallback to current directory logs
    log_dir = Path('logs')
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def _setup_file_handler(
    logger: logging.Logger,
    log_dir: Path,
    log_level: int,
    format_string: str
) -> None:
    """
    Setup rotating file handler for error logs.
    """
    log_file = log_dir / 'python_error.log'
    
    # Create rotating file handler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=MAX_LOG_FILE_SIZE,
        backupCount=MAX_LOG_BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.ERROR)  # Only log errors and above to file
    
    formatter = logging.Formatter(format_string)
    file_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    
    # Clean up old log files if total size exceeds limit
    _cleanup_old_logs(log_dir)


def _cleanup_old_logs(log_dir: Path) -> None:
    """
    Clean up old log files if total size exceeds MAX_TOTAL_LOG_SIZE.
    """
    try:
        log_files = sorted(
            log_dir.glob('python_error.log.*'),
            key=lambda p: p.stat().st_mtime if p.exists() else 0,
            reverse=True
        )
        
        total_size = sum(
            f.stat().st_size for f in log_dir.glob('python_error.log*')
            if f.is_file()
        )
        
        # Remove oldest files if total size exceeds limit
        while total_size > MAX_TOTAL_LOG_SIZE and log_files:
            old_file = log_files.pop()
            if old_file.exists():
                total_size -= old_file.stat().st_size
                old_file.unlink()
    except Exception:
        # Silently fail if cleanup fails
        pass


def _is_dev_mode() -> bool:
    """
    Check if running in development mode.
    Development mode is enabled when:
    - FLASK_DEBUG environment variable is set to 'true'
    - FLASK_ENV is set to 'development'
    - DEV environment variable is set to 'true'
    - LOG_LEVEL_DEBUG environment variable is set to 'true'
    
    Returns:
        True if in development mode, False otherwise
    """
    flask_debug = os.getenv('FLASK_DEBUG', '').lower() == 'true'
    flask_env = os.getenv('FLASK_ENV', '').lower() == 'development'
    dev = os.getenv('DEV', '').lower() == 'true'
    log_level_debug = os.getenv('LOG_LEVEL_DEBUG', '').lower() == 'true'
    
    return flask_debug or flask_env or dev or log_level_debug


def setup_logger(
    name: str = __name__,
    level: Optional[str] = None,
    format_string: Optional[str] = None
) -> logging.Logger:
    """
    Setup and return a logger
    
    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_string: Log format string
    
    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Get configuration
    Config = _get_config()
    
    # Set log level
    # If level is explicitly provided, use it
    # Otherwise, use DEBUG in dev mode, or Config.LOG_LEVEL
    if level:
        log_level = level
    elif _is_dev_mode():
        log_level = 'DEBUG'
    else:
        log_level = Config.LOG_LEVEL
    
    log_level_int = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(log_level_int)
    
    # Create console handler - use stderr to ensure logs are visible in Tauri
    # Tauri captures stderr and outputs it via eprintln! to console
    # Set encoding to UTF-8 to support Chinese characters
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(log_level_int)
    
    # Set format
    formatter = logging.Formatter(
        format_string or Config.LOG_FORMAT
    )
    console_handler.setFormatter(formatter)
    
    # Ensure UTF-8 encoding for console output
    if hasattr(sys.stderr, 'reconfigure'):
        try:
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    
    # Add handler
    logger.addHandler(console_handler)
    
    # Setup file handler for error logs
    try:
        log_dir = _get_log_dir()
        if log_dir:
            _setup_file_handler(logger, log_dir, log_level_int, format_string or Config.LOG_FORMAT)
    except Exception:
        # Silently fail if file handler setup fails
        pass
    
    return logger


def get_logger(name: str = __name__) -> logging.Logger:
    """
    Get logger (return existing if available, otherwise create new)
    
    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        return setup_logger(name)
    return logger

