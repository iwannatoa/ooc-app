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
    
    # 数据库配置
    DB_PATH: Optional[str] = os.getenv('DB_PATH')  # 如果未设置，将从 Tauri 获取
    
    # 总结配置
    # 现代大语言模型通常支持 32K-128K tokens 的上下文窗口
    # 假设每条消息平均 500-1000 tokens，那么：
    # - 32K tokens ≈ 32-64 条消息
    # - 64K tokens ≈ 64-128 条消息
    # - 128K tokens ≈ 128-256 条消息
    # 考虑到 System prompt 和总结也会占用 tokens，设置合理的阈值
    SUMMARY_THRESHOLD: int = int(os.getenv('SUMMARY_THRESHOLD', '150'))  # 总结阈值（消息数量，对应约 75K tokens）
    MAX_MESSAGE_HISTORY: int = int(os.getenv('MAX_MESSAGE_HISTORY', '100'))  # 最大消息历史数量（无总结时，对应约 50K tokens）
    RECENT_MESSAGES_WITH_SUMMARY: int = int(os.getenv('RECENT_MESSAGES_WITH_SUMMARY', '15'))  # 有总结时使用的最近消息数（对应约 7.5K tokens）
    
    # Token 估算配置（用于更精确的控制）
    ESTIMATED_TOKENS_PER_MESSAGE: int = int(os.getenv('ESTIMATED_TOKENS_PER_MESSAGE', '500'))  # 每条消息估算的 token 数量
    MAX_CONTEXT_TOKENS: int = int(os.getenv('MAX_CONTEXT_TOKENS', '60000'))  # 最大上下文 token 数量（默认 60K，适用于大多数模型）


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

