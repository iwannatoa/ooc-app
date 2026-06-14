# Copyright © 2016-2025 Patrick Zhang.
# All Rights Reserved.
"""
Application configuration module
"""
import os
from typing import FrozenSet, Optional, Tuple


def _parse_csv(value: str) -> Tuple[str, ...]:
    return tuple(x.strip() for x in value.split(',') if x.strip())


class Config:
    """Base configuration class"""
    # Flask configuration
    HOST: str = os.getenv('FLASK_HOST', '127.0.0.1')
    PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # CORS configuration (origins empty + CORS_ENABLED True => no cross-origin in practice)
    CORS_ENABLED: bool = os.getenv('CORS_ENABLED', 'true').lower() == 'true'
    _cors_origins_env: str = os.getenv('CORS_ORIGINS', '').strip()
    CORS_ORIGINS: Tuple[str, ...] = _parse_csv(_cors_origins_env) if _cors_origins_env else ()
    CORS_ALLOW_METHODS: Tuple[str, ...] = _parse_csv(
        os.getenv('CORS_ALLOW_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    )
    CORS_ALLOW_HEADERS: Tuple[str, ...] = _parse_csv(
        os.getenv(
            'CORS_ALLOW_HEADERS',
            'Content-Type,Authorization,X-OOC-Profile-Id,X-OOC-Client-Request-Id',
        )
    )
    CORS_EXPOSE_HEADERS: Tuple[str, ...] = _parse_csv(
        os.getenv('CORS_EXPOSE_HEADERS', 'X-OOC-Request-Id')
    )

    # API Bearer token (optional). If set, all /api/* except exempt paths require
    # Authorization: Bearer <token>. Same value should be set for the Tauri/desktop client.
    _api_token_raw: str = os.getenv('FLASK_API_TOKEN', '').strip()
    FLASK_API_TOKEN: Optional[str] = _api_token_raw if _api_token_raw else None
    FLASK_INSTANCE_ID: str = os.getenv('FLASK_INSTANCE_ID', '').strip()

    # Paths exempt from Bearer check (no leading API prefix duplication for '/')
    API_AUTH_EXEMPT_PATHS: FrozenSet[str] = frozenset(
        p.strip()
        for p in os.getenv(
            'API_AUTH_EXEMPT_PATHS',
            '/',
        ).split(',')
        if p.strip()
    )
    
    # Ollama configuration
    OLLAMA_BASE_URL: str = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_TIMEOUT: Optional[int] = None
    OLLAMA_REQUEST_TIMEOUT: int = int(os.getenv('OLLAMA_REQUEST_TIMEOUT', '300'))
    
    # DeepSeek configuration
    DEEPSEEK_BASE_URL: str = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    DEEPSEEK_TIMEOUT: int = int(os.getenv('DEEPSEEK_TIMEOUT', '60'))
    OPENAI_COMPATIBLE_BASE_URL: str = os.getenv(
        'OPENAI_COMPATIBLE_BASE_URL',
        'http://127.0.0.1:1234/v1'
    )

    # Additional provider base URLs
    OPENAI_BASE_URL: str = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com')
    AZURE_OPENAI_BASE_URL: str = os.getenv(
        'AZURE_OPENAI_BASE_URL',
        'https://example-resource.openai.azure.com/openai/v1'
    )
    ANTHROPIC_BASE_URL: str = os.getenv('ANTHROPIC_BASE_URL', 'https://api.anthropic.com')
    GLM_BASE_URL: str = os.getenv('GLM_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4')
    KIMI_BASE_URL: str = os.getenv('KIMI_BASE_URL', 'https://api.moonshot.cn')
    MINIMAX_BASE_URL: str = os.getenv('MINIMAX_BASE_URL', 'https://api.minimax.chat')
    ANTHROPIC_TIMEOUT: int = int(os.getenv('ANTHROPIC_TIMEOUT', '60'))
    
    # Logging configuration
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = (
        '%(asctime)s - %(name)s - %(levelname)s - '
        'rid=%(request_id)s cid=%(conversation_id)s '
        'pid=%(profile_id)s crid=%(client_request_id)s - %(message)s'
    )
    
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
    CONTEXT_MANAGEMENT_ENABLED: bool = os.getenv(
        'CONTEXT_MANAGEMENT_ENABLED',
        'true',
    ).lower() in ('1', 'true', 'yes')

    # LangChain: unified chat invoke/stream (set false to use legacy Ollama generate + DeepSeek requests)
    USE_LANGCHAIN: bool = os.getenv('USE_LANGCHAIN', 'true').lower() in (
        '1',
        'true',
        'yes',
    )


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'
    _dev_cors = os.getenv('CORS_ORIGINS', '').strip()
    CORS_ORIGINS: Tuple[str, ...] = (
        _parse_csv(_dev_cors)
        if _dev_cors
        else (
            'http://localhost:1420',
            'http://127.0.0.1:1420',
            'tauri://localhost',
            'https://tauri.localhost',
        )
    )


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG: bool = False
    LOG_LEVEL: str = 'INFO'
    # Strict CORS: set CORS_ORIGINS in deployment; default none
    _prod_cors = os.getenv('CORS_ORIGINS', '').strip()
    CORS_ORIGINS: Tuple[str, ...] = _parse_csv(_prod_cors) if _prod_cors else ()


class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'
    # Unit tests mock legacy services; LangChain path would require LC mocks or network.
    USE_LANGCHAIN: bool = os.getenv('USE_LANGCHAIN', 'false').lower() in ('1', 'true', 'yes')
    _test_cors = os.getenv('CORS_ORIGINS', '').strip()
    CORS_ORIGINS: Tuple[str, ...] = (
        _parse_csv(_test_cors) if _test_cors else ('http://127.0.0.1', 'http://localhost')
    )


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

