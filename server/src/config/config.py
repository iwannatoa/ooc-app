# Copyright © 2016-2025 Patrick Zhang.
# All Rights Reserved.
"""
Application configuration module
"""
import os
from typing import Optional


class Config:
    """Base configuration class"""
    # Flask configuration
    HOST: str = os.getenv('FLASK_HOST', '127.0.0.1')
    PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # CORS configuration
    CORS_ENABLED: bool = True
    
    # Ollama configuration
    OLLAMA_BASE_URL: str = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_TIMEOUT: Optional[int] = None
    OLLAMA_REQUEST_TIMEOUT: int = int(os.getenv('OLLAMA_REQUEST_TIMEOUT', '300'))
    
    # DeepSeek configuration
    DEEPSEEK_BASE_URL: str = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    DEEPSEEK_TIMEOUT: int = int(os.getenv('DEEPSEEK_TIMEOUT', '60'))
    
    # Logging configuration
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # API configuration
    API_PREFIX: str = '/api'
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB
    
    # Database configuration
    DB_PATH: Optional[str] = os.getenv('DB_PATH')  # If not set, will be obtained from Tauri
    
    # Summary configuration
    # Modern LLMs typically support 32K-128K tokens context window
    # Assuming each message averages 500-1000 tokens, then:
    # - 32K tokens ≈ 32-64 messages
    # - 64K tokens ≈ 64-128 messages
    # - 128K tokens ≈ 128-256 messages
    # Considering System prompt and summaries also consume tokens, set reasonable thresholds
    SUMMARY_THRESHOLD: int = int(os.getenv('SUMMARY_THRESHOLD', '150'))  # Summary threshold (message count, ≈75K tokens)
    MAX_MESSAGE_HISTORY: int = int(os.getenv('MAX_MESSAGE_HISTORY', '100'))  # Max message history (no summary, ≈50K tokens)
    RECENT_MESSAGES_WITH_SUMMARY: int = int(os.getenv('RECENT_MESSAGES_WITH_SUMMARY', '15'))  # Recent messages with summary (≈7.5K tokens)
    
    # Token estimation configuration (for more precise control)
    ESTIMATED_TOKENS_PER_MESSAGE: int = int(os.getenv('ESTIMATED_TOKENS_PER_MESSAGE', '500'))  # Estimated tokens per message
    MAX_CONTEXT_TOKENS: int = int(os.getenv('MAX_CONTEXT_TOKENS', '60000'))  # Max context tokens (default 60K, suitable for most models)


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG: bool = False
    LOG_LEVEL: str = 'INFO'


class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env: Optional[str] = None) -> Config:
    """
    Get configuration object
    
    Args:
        env: Environment name (development, production, testing)
    
    Returns:
        Config object
    """
    if env is None:
        env = os.getenv('FLASK_ENV', 'default')
    
    return config.get(env, config['default'])

