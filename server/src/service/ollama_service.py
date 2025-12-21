"""
Ollama service module
"""
import requests
from typing import Dict, List, Optional
from utils.logger import get_logger
from utils.exceptions import ProviderError
from config import Config

logger = get_logger(__name__)


class OllamaService:
    """Ollama API service class"""
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize Ollama service
        
        Args:
            base_url: Ollama API base URL
        """
        self.base_url = base_url or Config.OLLAMA_BASE_URL
        self.timeout = Config.OLLAMA_TIMEOUT
    
    def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = False,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Generate text response
        
        Args:
            model: Model name
            prompt: Prompt text
            stream: Whether to stream response
            options: Generation options
        
        Returns:
            Generation result dictionary
        
        Raises:
            ProviderError: When API call fails
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        
        if options:
            payload["options"] = options
        
        try:
            logger.info(f"Calling Ollama API - Model: {model}, Prompt length: {len(prompt)}")
            response = requests.post(
                url,
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Ollama API call successful")
                logger.debug(f" - {response.text}")
                return result
            else:
                error_msg = f"Ollama API error: {response.status_code}"
                logger.error(f"{error_msg} - {response.text}")
                raise ProviderError(
                    error_msg,
                    provider='ollama',
                    status_code=response.status_code
                )
        
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to Ollama: {str(e)}"
            logger.error(error_msg)
            raise ProviderError(
                error_msg,
                provider='ollama',
                status_code=503
            )
    
    def list_models(self) -> List[Dict]:
        """
        Get available model list
        
        Returns:
            Model list
        
        Raises:
            ProviderError: When API call fails
        """
        url = f"{self.base_url}/api/tags"
        
        try:
            logger.info("Fetching Ollama models")
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                models = data.get('models', [])
                logger.info(f"Found {len(models)} Ollama models")
                return models
            else:
                error_msg = f"Failed to fetch models: {response.status_code}"
                logger.error(error_msg)
                raise ProviderError(
                    error_msg,
                    provider='ollama',
                    status_code=response.status_code
                )
        
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to Ollama: {str(e)}"
            logger.error(error_msg)
            raise ProviderError(
                error_msg,
                provider='ollama',
                status_code=503
            )
    
    def health_check(self) -> bool:
        """
        Check Ollama service health status
        
        Returns:
            True if service is available, False otherwise
        """
        try:
            url = f"{self.base_url}/api/tags"
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

