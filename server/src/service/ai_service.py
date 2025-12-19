"""
Unified AI service interface module
"""
from typing import Dict, Optional
from utils.logger import get_logger
from utils.exceptions import ProviderError, ValidationError
from service.ollama_service import OllamaService
from service.deepseek_service import DeepSeekService

logger = get_logger(__name__)


class AIService:
    """Unified AI service interface"""
    
    def __init__(
        self,
        ollama_service: OllamaService,
        deepseek_service: DeepSeekService
    ):
        """
        Initialize AI service
        
        Args:
            ollama_service: Ollama service instance
            deepseek_service: DeepSeek service instance
        """
        self.ollama_service = ollama_service
        self.deepseek_service = deepseek_service
    
    def chat(
        self,
        provider: str,
        message: str,
        model: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        messages: Optional[list] = None
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
            system_prompt: System prompt（可选）
            messages: 消息历史列表（可选，格式：[{"role": "user/assistant", "content": "..."}]
        
        Returns:
            包含响应和模型信息的字典
        
        Raises:
            ValidationError: 当参数验证失败时
            ProviderError: 当提供商不支持或调用失败时
        """
        if not message and not messages:
            raise ValidationError("Message or messages cannot be empty", field='message')
        
        if provider == 'ollama':
            return self._chat_with_ollama(message, model, system_prompt, messages)
        elif provider == 'deepseek':
            return self._chat_with_deepseek(
                message, model, api_key, base_url, max_tokens, temperature,
                system_prompt, messages
            )
        else:
            raise ProviderError(
                f"Unsupported provider: {provider}",
                provider=provider,
                status_code=400
            )
    
    def _chat_with_ollama(
        self,
        message: str,
        model: str,
        system_prompt: Optional[str] = None,
        messages: Optional[list] = None
    ) -> Dict:
        """
        使用 Ollama 发送聊天请求
        
        Args:
            message: 用户消息
            model: 模型名称
            system_prompt: System prompt
            messages: 消息历史
        
        Returns:
            包含响应和模型信息的字典
        """
        try:
            # 构建完整的 prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n"
            else:
                full_prompt = ""
            
            # 如果有消息历史，添加历史对话
            if messages:
                for msg in messages:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'user':
                        full_prompt += f"用户：{content}\n\n"
                    elif role == 'assistant':
                        full_prompt += f"助手：{content}\n\n"
            
            # 添加当前消息
            full_prompt += f"用户：{message}\n\n助手："
            
            result = self.ollama_service.generate(
                model=model,
                prompt=full_prompt,
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
            logger.error(f"Unexpected error in OOC story: {str(e)}")
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
        temperature: float,
        system_prompt: Optional[str] = None,
        messages: Optional[list] = None
    ) -> Dict:
        """
        Send chat request using DeepSeek
        
        Args:
            message: User message
            model: Model name
            api_key: API key
            base_url: Custom base URL
            max_tokens: Max tokens
            temperature: Temperature parameter
            system_prompt: System prompt
            messages: Message history
        
        Returns:
            Dictionary containing response and model information
        """
        try:
            message_list = []
            
            if system_prompt:
                message_list.append({"role": "system", "content": system_prompt})
            
            if messages:
                message_list.extend(messages)
            
            message_list.append({"role": "user", "content": message})
            
            result = self.deepseek_service.chat_completion(
                api_key=api_key,
                model=model,
                messages=message_list,
                max_tokens=max_tokens,
                temperature=temperature,
                base_url=base_url
            )
            
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
            # For other providers (e.g., deepseek), return healthy if Flask service is running
            # They don't require local service
            return {
                "status": "healthy",
                "ollama_available": False
            }

