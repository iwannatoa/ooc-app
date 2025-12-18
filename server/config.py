"""
应用配置模块
"""
import os
from typing import Optional


class Config:
    """基础配置类"""
    # Flask 配置
    HOST: str = os.getenv('FLASK_HOST', '127.0.0.1')
    PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # CORS 配置
    CORS_ENABLED: bool = True
    
    # Ollama 配置
    OLLAMA_BASE_URL: str = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_TIMEOUT: Optional[int] = None
    OLLAMA_REQUEST_TIMEOUT: int = int(os.getenv('OLLAMA_REQUEST_TIMEOUT', '300'))
    
    # DeepSeek 配置
    DEEPSEEK_BASE_URL: str = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    DEEPSEEK_TIMEOUT: int = int(os.getenv('DEEPSEEK_TIMEOUT', '60'))
    
    # 日志配置
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # API 配置
    API_PREFIX: str = '/api'
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG: bool = False
    LOG_LEVEL: str = 'INFO'


class TestingConfig(Config):
    """测试环境配置"""
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = 'DEBUG'


# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env: Optional[str] = None) -> Config:
    """
    获取配置对象
    
    Args:
        env: 环境名称 (development, production, testing)
    
    Returns:
        Config 对象
    """
    if env is None:
        env = os.getenv('FLASK_ENV', 'default')
    
    return config.get(env, config['default'])

