"""
Ollama 服务模块
"""
import requests
from typing import Dict, List, Optional
from src.utils.logger import get_logger
from src.utils.exceptions import ProviderError
from src.config import Config

logger = get_logger(__name__)


class OllamaService:
    """Ollama API 服务类"""
    
    def __init__(self, base_url: Optional[str] = None):
        """
        初始化 Ollama 服务
        
        Args:
            base_url: Ollama API 基础 URL
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
        生成文本响应
        
        Args:
            model: 模型名称
            prompt: 提示文本
            stream: 是否流式返回
            options: 生成选项
        
        Returns:
            生成结果字典
        
        Raises:
            ProviderError: 当 API 调用失败时
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
        获取可用模型列表
        
        Returns:
            模型列表
        
        Raises:
            ProviderError: 当 API 调用失败时
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
        检查 Ollama 服务健康状态
        
        Returns:
            True 如果服务可用，False 否则
        """
        try:
            url = f"{self.base_url}/api/tags"
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

