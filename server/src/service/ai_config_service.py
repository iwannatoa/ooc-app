"""
全局 AI 配置服务层
"""
from typing import Optional, Dict, List
from src.repository.ai_config_repository import AIConfigRepository
from src.utils.logger import get_logger

logger = get_logger(__name__)


class AIConfigService:
    """全局 AI 配置服务类"""
    
    def __init__(self, ai_config_repository: AIConfigRepository):
        """
        初始化服务
        
        Args:
            ai_config_repository: AI 配置仓库实例
        """
        self.repository = ai_config_repository
    
    def get_config(self, provider: str, include_api_key: bool = True) -> Optional[Dict]:
        """
        获取指定 provider 的配置（用于调用 AI API）
        
        Args:
            provider: AI提供商（ollama, deepseek）
            include_api_key: 是否包含 API Key（默认 True，因为需要用于 API 调用）
        
        Returns:
            配置字典，如果不存在则返回 None
        """
        config = self.repository.get_config(provider, include_api_key=include_api_key)
        if not config:
            return None
        
        return config.to_dict(include_api_key=include_api_key)
    
    def get_all_configs(self, include_api_key: bool = False) -> List[Dict]:
        """
        获取所有 AI 配置
        
        Args:
            include_api_key: 是否包含 API Key（默认 False，安全考虑）
        
        Returns:
            配置列表
        """
        configs = self.repository.get_all_configs(include_api_key=include_api_key)
        return [config.to_dict(include_api_key=include_api_key) for config in configs]
    
    def create_or_update_config(
        self,
        provider: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict:
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
            配置字典（不包含 API Key）
        """
        config = self.repository.create_or_update_config(
            provider=provider,
            model=model,
            api_key=api_key,
            base_url=base_url,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return config.to_dict(include_api_key=False)
    
    def get_config_for_api(
        self,
        provider: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict:
        """
        获取用于 API 调用的配置（从数据库获取，只接受 provider 和 model）
        
        Args:
            provider: AI提供商（ollama, deepseek）
            model: 模型名称（可选，如果提供则覆盖全局配置的默认模型）
            **kwargs: 其他参数（保留用于未来扩展，但通常不需要）
        
        Returns:
            配置字典（包含 provider, model, api_key, base_url, max_tokens, temperature）
        """
        global_config = self.get_config(provider, include_api_key=True)
        
        if not global_config:
            default_model = f'{provider}-chat' if provider == 'deepseek' else 'llama2'
            return {
                'provider': provider,
                'model': model or default_model,
                'api_key': '',
                'base_url': '',
                'max_tokens': 2048,
                'temperature': 0.7
            }
        
        return {
            'provider': provider,
            'model': model or global_config.get('model') or (f'{provider}-chat' if provider == 'deepseek' else 'llama2'),
            'api_key': global_config.get('api_key') or '',
            'base_url': global_config.get('base_url') or '',
            'max_tokens': global_config.get('max_tokens') or 2048,
            'temperature': global_config.get('temperature') or 0.7
        }

