"""
Logging configuration module
"""
import logging
import sys
from typing import Optional

# Delayed import of Config to avoid circular dependency
def _get_config():
    from config import Config
    return Config


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
    log_level = level or Config.LOG_LEVEL
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Create console handler - use stderr to ensure logs are visible in Tauri
    # Tauri captures stderr and outputs it via eprintln! to console
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Set format
    formatter = logging.Formatter(
        format_string or Config.LOG_FORMAT
    )
    console_handler.setFormatter(formatter)
    
    # Add handler
    logger.addHandler(console_handler)
    
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

