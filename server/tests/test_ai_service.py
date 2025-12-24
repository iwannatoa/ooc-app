"""
Unit tests for AIService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.ai_service import AIService
from service.ollama_service import OllamaService
from service.deepseek_service import DeepSeekService


class TestAIService:
    """Test AIService"""
    
    @pytest.fixture
    def mock_ollama_service(self):
        """Mock Ollama service"""
        mock = Mock(spec=OllamaService)
        mock.generate = Mock(return_value={'response': 'Ollama response'})
        mock.health_check = Mock(return_value={'status': 'healthy', 'available': True})
        return mock
    
    @pytest.fixture
    def mock_deepseek_service(self):
        """Mock DeepSeek service"""
        mock = Mock(spec=DeepSeekService)
        mock.chat_completion = Mock(return_value={
            'choices': [{'message': {'content': 'DeepSeek response'}}]
        })
        return mock
    
    @pytest.fixture
    def service(self, mock_ollama_service, mock_deepseek_service):
        """Create AIService instance"""
        return AIService(mock_ollama_service, mock_deepseek_service)
    
    def test_chat_with_ollama(self, service, mock_ollama_service):
        """Test chat with Ollama provider"""
        mock_ollama_service.generate.return_value = {
            'response': 'Ollama response'
        }
        
        result = service.chat(
            provider='ollama',
            message='Test message',
            model='llama2',
            base_url='http://localhost:11434'
        )
        
        assert result['success'] is True
        assert result['response'] == 'Ollama response'
        mock_ollama_service.generate.assert_called_once()
    
    def test_chat_with_deepseek(self, service, mock_deepseek_service):
        """Test chat with DeepSeek provider"""
        mock_deepseek_service.chat_completion.return_value = {
            'choices': [{'message': {'content': 'DeepSeek response'}}]
        }
        
        result = service.chat(
            provider='deepseek',
            message='Test message',
            model='deepseek-chat',
            api_key='test_key',
            base_url='https://api.deepseek.com'
        )
        
        assert result['success'] is True
        assert result['response'] == 'DeepSeek response'
        mock_deepseek_service.chat_completion.assert_called_once()
    
    def test_chat_invalid_provider(self, service):
        """Test chat with invalid provider"""
        with pytest.raises(Exception, match='Unsupported provider'):
            service.chat(
                provider='invalid',
                message='Test message',
                model='test-model'
            )
    
    def test_health_check_ollama(self, service, mock_ollama_service):
        """Test health check for Ollama"""
        mock_ollama_service.health_check.return_value = {
            'status': 'healthy',
            'available': True
        }
        
        result = service.health_check('ollama')
        
        assert result['status'] == 'healthy'
        mock_ollama_service.health_check.assert_called_once()
    
    def test_health_check_deepseek(self, service):
        """Test health check for DeepSeek (always healthy)"""
        result = service.health_check('deepseek')
        
        assert result['status'] == 'healthy'

