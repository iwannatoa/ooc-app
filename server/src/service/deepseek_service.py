"""
DeepSeek service module
"""
import requests
from typing import Dict, Optional
from utils.logger import get_logger
from utils.exceptions import ProviderError, ValidationError
from config import Config

logger = get_logger(__name__)


class DeepSeekService:
    """DeepSeek API service class"""
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize DeepSeek service
        
        Args:
            base_url: DeepSeek API base URL
        """
        self.base_url = base_url or Config.DEEPSEEK_BASE_URL
        self.timeout = Config.DEEPSEEK_TIMEOUT
    
    def chat_completion(
        self,
        api_key: str,
        model: str,
        messages: list,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        base_url: Optional[str] = None
    ) -> Dict:
        """
        Send chat completion request
        
        Args:
            api_key: API key
            model: Model name
            messages: Messages list
            max_tokens: Maximum tokens
            temperature: Temperature parameter
            base_url: Custom base URL
        
        Returns:
            Chat completion result dictionary
        
        Raises:
            ValidationError: When API key is missing
            ProviderError: When API call fails
        """
        if not api_key:
            raise ValidationError("DeepSeek API key is required", field='apiKey')
        
        # Use custom URL or default URL
        url_base = base_url.rstrip('/') if base_url else self.base_url
        url = f"{url_base}/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        try:
            logger.info(f"Calling DeepSeek API - Model: {model}, Messages: {len(messages)}")
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("DeepSeek API call successful")
                return result
            else:
                error_msg = f"DeepSeek API error: {response.status_code}"
                logger.error(f"{error_msg} - {response.text}")
                raise ProviderError(
                    error_msg,
                    provider='deepseek',
                    status_code=response.status_code
                )
        
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to DeepSeek: {str(e)}"
            logger.error(error_msg)
            raise ProviderError(
                error_msg,
                provider='deepseek',
                status_code=503
            )

