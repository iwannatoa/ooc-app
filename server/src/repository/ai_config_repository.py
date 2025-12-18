"""
全局 AI 配置数据访问层
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.model.ai_config import AIConfig, Base
from src.utils.logger import get_logger

logger = get_logger(__name__)


class AIConfigRepository:
    """全局 AI 配置仓库类"""
    
    def __init__(self, db_path: str):
        """
        初始化仓库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        # 创建数据库引擎
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={'check_same_thread': False}
        )
        # 创建会话工厂
        self.SessionLocal = sessionmaker(bind=self.engine)
        # 创建表（如果不存在）
        self._init_database()
    
    def _init_database(self):
        """初始化数据库，创建表"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"AI config database initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize AI config database: {str(e)}")
            raise
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()
    
    def get_config(self, provider: str, include_api_key: bool = False) -> Optional[AIConfig]:
        """
        获取指定 provider 的配置
        
        Args:
            provider: AI提供商（ollama, deepseek）
            include_api_key: 是否包含 API Key
        
        Returns:
            配置对象，如果不存在则返回 None
        """
        session = self._get_session()
        try:
            config = session.query(AIConfig).filter(
                AIConfig.provider == provider
            ).first()
            return config
        except Exception as e:
            logger.error(f"Failed to get AI config: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_all_configs(self, include_api_key: bool = False) -> List[AIConfig]:
        """
        获取所有 AI 配置
        
        Args:
            include_api_key: 是否包含 API Key
        
        Returns:
            配置列表
        """
        session = self._get_session()
        try:
            configs = session.query(AIConfig).all()
            return configs
        except Exception as e:
            logger.error(f"Failed to get all AI configs: {str(e)}")
            raise
        finally:
            session.close()
    
    def create_or_update_config(
        self,
        provider: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AIConfig:
        """
        创建或更新 AI 配置
        
        Args:
            provider: AI提供商（ollama, deepseek）
            model: 默认模型名称
            api_key: API密钥
            base_url: 自定义基础URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            配置对象
        """
        session = self._get_session()
        try:
            existing = session.query(AIConfig).filter(
                AIConfig.provider == provider
            ).first()
            
            if existing:
                # 更新现有配置
                if model is not None:
                    existing.model = model
                if api_key is not None:
                    existing.api_key = api_key
                if base_url is not None:
                    existing.base_url = base_url
                if max_tokens is not None:
                    existing.max_tokens = max_tokens
                if temperature is not None:
                    existing.temperature = str(temperature)
                existing.updated_at = datetime.utcnow()
                session.commit()
                session.refresh(existing)
                logger.info(f"Updated AI config for provider: {provider}")
                return existing
            else:
                # 创建新配置
                new_config = AIConfig(
                    provider=provider,
                    model=model,
                    api_key=api_key,
                    base_url=base_url,
                    max_tokens=max_tokens,
                    temperature=str(temperature) if temperature is not None else None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_config)
                session.commit()
                session.refresh(new_config)
                logger.info(f"Created AI config for provider: {provider}")
                return new_config
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save AI config: {str(e)}")
            raise
        finally:
            session.close()

