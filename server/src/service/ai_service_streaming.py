"""
Streaming AI service support
"""
from typing import Generator, Optional
from utils.logger import get_logger
from utils.exceptions import ProviderError, ValidationError
from service.ollama_service import OllamaService
from service.deepseek_service import DeepSeekService
import json
import requests

logger = get_logger(__name__)


class AIServiceStreaming:
    """Streaming AI service interface"""
    
    def __init__(
        self,
        ollama_service: OllamaService,
        deepseek_service: DeepSeekService
    ):
        """
        Initialize streaming AI service
        
        Args:
            ollama_service: Ollama service instance
            deepseek_service: DeepSeek service instance
        """
        self.ollama_service = ollama_service
        self.deepseek_service = deepseek_service
    
    def chat_stream(
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
    ) -> Generator[str, None, None]:
        """
        Send streaming chat request
        
        Args:
            provider: Provider name (ollama, deepseek)
            message: User message
            model: Model name
            api_key: API key (required for DeepSeek)
            base_url: Custom base URL
            max_tokens: Max tokens
            temperature: Temperature parameter
            system_prompt: System prompt (optional)
            messages: Message history list (optional)
        
        Yields:
            Text chunks as they arrive
        """
        if not message and not messages:
            raise ValidationError("Message or messages cannot be empty", field='message')
        
        if provider == 'ollama':
            yield from self._chat_stream_ollama(message, model, system_prompt, messages)
        elif provider == 'deepseek':
            yield from self._chat_stream_deepseek(
                message, model, api_key, base_url, max_tokens, temperature,
                system_prompt, messages
            )
        else:
            raise ProviderError(
                f"Unsupported provider: {provider}",
                provider=provider,
                status_code=400
            )
    
    def _chat_stream_ollama(
        self,
        message: str,
        model: str,
        system_prompt: Optional[str] = None,
        messages: Optional[list] = None
    ) -> Generator[str, None, None]:
        """
        Stream chat request using Ollama
        
        Args:
            message: User message
            model: Model name
            system_prompt: System prompt
            messages: Message history
        
        Yields:
            Text chunks
        """
        try:
            # Build full prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n"
            else:
                full_prompt = ""
            
            if messages:
                for msg in messages:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'user':
                        full_prompt += f"用户：{content}\n\n"
                    elif role == 'assistant':
                        full_prompt += f"助手：{content}\n\n"
            
            full_prompt += f"用户：{message}\n\n助手："
            
            # Stream from Ollama
            url = f"{self.ollama_service.base_url}/api/generate"
            payload = {
                "model": model,
                "prompt": full_prompt,
                "stream": True
            }
            
            response = requests.post(
                url,
                json=payload,
                stream=True,
                timeout=self.ollama_service.timeout
            )
            
            if response.status_code != 200:
                error_msg = f"Ollama API error: {response.status_code}"
                logger.error(f"{error_msg} - {response.text}")
                raise ProviderError(
                    error_msg,
                    provider='ollama',
                    status_code=response.status_code
                )
            
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if 'response' in data:
                            yield data['response']
                        if data.get('done', False):
                            break
                    except json.JSONDecodeError:
                        continue
                        
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to Ollama: {str(e)}"
            logger.error(error_msg)
            raise ProviderError(
                error_msg,
                provider='ollama',
                status_code=503
            )
        except Exception as e:
            logger.error(f"Unexpected error in Ollama streaming: {str(e)}")
            raise ProviderError(
                f"Unexpected error: {str(e)}",
                provider='ollama',
                status_code=500
            )
    
    def _chat_stream_deepseek(
        self,
        message: str,
        model: str,
        api_key: Optional[str],
        base_url: Optional[str],
        max_tokens: int,
        temperature: float,
        system_prompt: Optional[str] = None,
        messages: Optional[list] = None
    ) -> Generator[str, None, None]:
        """
        Stream chat request using DeepSeek
        
        Args:
            message: User message
            model: Model name
            api_key: API key
            base_url: Custom base URL
            max_tokens: Max tokens
            temperature: Temperature parameter
            system_prompt: System prompt
            messages: Message history
        
        Yields:
            Text chunks
        """
        if not api_key:
            raise ValidationError("DeepSeek API key is required", field='apiKey')
        
        try:
            message_list = []
            
            if system_prompt:
                message_list.append({"role": "system", "content": system_prompt})
            
            if messages:
                message_list.extend(messages)
            
            message_list.append({"role": "user", "content": message})
            
            url_base = base_url.rstrip('/') if base_url else self.deepseek_service.base_url
            url = f"{url_base}/chat/completions"
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            
            payload = {
                "model": model,
                "messages": message_list,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": True
            }
            
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                stream=True,
                timeout=self.deepseek_service.timeout
            )
            
            if response.status_code != 200:
                error_msg = f"DeepSeek API error: {response.status_code}"
                logger.error(f"{error_msg} - {response.text}")
                raise ProviderError(
                    error_msg,
                    provider='deepseek',
                    status_code=response.status_code
                )
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]  # Remove 'data: ' prefix
                        if data_str == '[DONE]':
                            break
                        try:
                            data = json.loads(data_str)
                            choices = data.get('choices', [])
                            if choices:
                                delta = choices[0].get('delta', {})
                                content = delta.get('content', '')
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
                            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to DeepSeek: {str(e)}"
            logger.error(error_msg)
            raise ProviderError(
                error_msg,
                provider='deepseek',
                status_code=503
            )
        except Exception as e:
            logger.error(f"Unexpected error in DeepSeek streaming: {str(e)}")
            raise ProviderError(
                f"Unexpected error: {str(e)}",
                provider='deepseek',
                status_code=500
            )

