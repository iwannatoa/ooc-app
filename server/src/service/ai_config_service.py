"""
Global AI configuration service layer
"""
from typing import Optional, Dict, List
from repository.ai_config_repository import AIConfigRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class AIConfigService:
    """Global AI configuration service class"""
    
    def __init__(self, ai_config_repository: AIConfigRepository):
        """
        Initialize service
        
        Args:
            ai_config_repository: AI config repository instance
        """
        self.repository = ai_config_repository
    
    def get_config(self, provider: str, include_api_key: bool = True) -> Optional[Dict]:
        """
        Get configuration for specified provider
        
        Args:
            provider: AI provider, ollama or deepseek
            include_api_key: Whether to include API Key, default True
        
        Returns:
            Config dictionary, or None if not exists
        """
        config = self.repository.get_config(provider, include_api_key=include_api_key)
        if not config:
            return None
        
        return config.to_dict(include_api_key=include_api_key)
    
    def get_all_configs(self, include_api_key: bool = False) -> List[Dict]:
        """
        Get all AI configurations
        
        Args:
            include_api_key: Whether to include API Key, default False
        
        Returns:
            Config list
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
        Create or update AI configuration
        
        Args:
            provider: AI provider, ollama or deepseek
            model: Default model name
            api_key: API key
            base_url: Custom base URL
            max_tokens: Maximum tokens
            temperature: Temperature parameter
        
        Returns:
            Config dictionary, without API Key
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
        Get configuration for API calls
        
        Args:
            provider: AI provider, ollama or deepseek
            model: Model name, if provided, overrides default model from global config
            **kwargs: Other parameters, reserved for future extension
        
        Returns:
            Config dictionary, containing provider, model, api_key, base_url, max_tokens, temperature
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

