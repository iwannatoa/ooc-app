"""
AI 服务统一接口模块
"""
import sys
from pathlib import Path
from typing import Dict, Optional

# 添加 server 目录到 Python 路径
server_dir = Path(__file__).parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

from utils.logger import get_logger
from utils.exceptions import ProviderError, ValidationError
from services.ollama_service import OllamaService
from services.deepseek_service import DeepSeekService

logger = get_logger(__name__)


class AIService:
    """AI 服务统一接口类"""
    
    def __init__(self):
        """初始化 AI 服务"""
        self.ollama_service = OllamaService()
        self.deepseek_service = DeepSeekService()
    
    def chat(
        self,
        provider: str,
        message: str,
        model: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> Dict:
        """
        发送聊天请求
        
        Args:
            provider: 提供商名称 (ollama, deepseek)
            message: 用户消息
            model: 模型名称
            api_key: API 密钥（DeepSeek 需要）
            base_url: 自定义基础 URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            包含响应和模型信息的字典
        
        Raises:
            ValidationError: 当参数验证失败时
            ProviderError: 当提供商不支持或调用失败时
        """
        if not message:
            raise ValidationError("Message cannot be empty", field='message')
        
        if provider == 'ollama':
            return self._chat_with_ollama(message, model)
        elif provider == 'deepseek':
            return self._chat_with_deepseek(
                message, model, api_key, base_url, max_tokens, temperature
            )
        else:
            raise ProviderError(
                f"Unsupported provider: {provider}",
                provider=provider,
                status_code=400
            )
    
    def _chat_with_ollama(self, message: str, model: str) -> Dict:
        """
        使用 Ollama 发送聊天请求
        
        Args:
            message: 用户消息
            model: 模型名称
        
        Returns:
            包含响应和模型信息的字典
        """
        try:
            result = self.ollama_service.generate(
                model=model,
                prompt=message,
                stream=False
            )
            
            return {
                "success": True,
                "response": result.get('response', ''),
                "model": model
            }
        except ProviderError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Ollama chat: {str(e)}")
            raise ProviderError(
                f"Unexpected error: {str(e)}",
                provider='ollama',
                status_code=500
            )
    
    def _chat_with_deepseek(
        self,
        message: str,
        model: str,
        api_key: Optional[str],
        base_url: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> Dict:
        """
        使用 DeepSeek 发送聊天请求
        
        Args:
            message: 用户消息
            model: 模型名称
            api_key: API 密钥
            base_url: 自定义基础 URL
            max_tokens: 最大令牌数
            temperature: 温度参数
        
        Returns:
            包含响应和模型信息的字典
        """
        try:
            result = self.deepseek_service.chat_completion(
                api_key=api_key,
                model=model,
                messages=[{"role": "user", "content": message}],
                max_tokens=max_tokens,
                temperature=temperature,
                base_url=base_url
            )
            
            # 提取响应内容
            choices = result.get('choices', [])
            if choices:
                response_content = choices[0].get('message', {}).get('content', '')
            else:
                response_content = ''
            
            return {
                "success": True,
                "response": response_content,
                "model": model
            }
        except (ValidationError, ProviderError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in DeepSeek chat: {str(e)}")
            raise ProviderError(
                f"Unexpected error: {str(e)}",
                provider='deepseek',
                status_code=500
            )
    
    def get_models(self, provider: str = 'ollama') -> Dict:
        """
        获取可用模型列表
        
        Args:
            provider: 提供商名称（目前仅支持 ollama）
        
        Returns:
            包含模型列表的字典
        
        Raises:
            ProviderError: 当提供商不支持时
        """
        if provider == 'ollama':
            try:
                models = self.ollama_service.list_models()
                return {
                    "success": True,
                    "models": models
                }
            except ProviderError:
                raise
            except Exception as e:
                logger.error(f"Unexpected error fetching models: {str(e)}")
                raise ProviderError(
                    f"Failed to fetch models: {str(e)}",
                    provider='ollama',
                    status_code=500
                )
        else:
            raise ProviderError(
                f"Model listing not supported for provider: {provider}",
                provider=provider,
                status_code=400
            )
    
    def health_check(self, provider: str = 'ollama') -> Dict:
        """
        检查服务健康状态
        
        Args:
            provider: 提供商名称
        
        Returns:
            健康状态字典
        """
        if provider == 'ollama':
            is_healthy = self.ollama_service.health_check()
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "ollama_available": is_healthy
            }
        else:
            return {
                "status": "unknown",
                "ollama_available": False
            }

