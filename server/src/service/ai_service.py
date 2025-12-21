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
        Send chat request
        
        Args:
            provider: Provider name (ollama, deepseek)
            message: User message
            model: Model name
            api_key: API key (required for DeepSeek)
            base_url: Custom base URL
            max_tokens: Maximum tokens
            temperature: Temperature parameter
            system_prompt: System prompt (optional)
            messages: Message history list (optional, format: [{"role": "user/assistant", "content": "..."}]
        
        Returns:
            Dictionary containing response and model information
        
        Raises:
            ValidationError: When parameter validation fails
            ProviderError: When provider is not supported or call fails
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
        Send chat request using Ollama
        
        Args:
            message: User message
            model: Model name
            system_prompt: System prompt
            messages: Message history
        
        Returns:
            Dictionary containing response and model information
        """
        try:
            # Build complete prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n"
            else:
                full_prompt = ""
            
            # Add message history if available
            if messages:
                for msg in messages:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'user':
                        full_prompt += f"User: {content}\n\n"
                    elif role == 'assistant':
                        full_prompt += f"Assistant: {content}\n\n"
            
            # Add current message
            full_prompt += f"User: {message}\n\nAssistant:"
            
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
        Get available models list
        
        Args:
            provider: Provider name (currently only supports ollama)
        
        Returns:
            Dictionary containing models list
        
        Raises:
            ProviderError: When provider is not supported
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
        Check service health status
        
        Args:
            provider: Provider name
        
        Returns:
            Health status dictionary
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

