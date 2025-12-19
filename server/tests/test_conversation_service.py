"""
Unit tests for ConversationService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.conversation_service import ConversationService
from repository.conversation_repository import ConversationRepository
from service.ai_service import AIService
from service.ai_config_service import AIConfigService


class TestConversationService:
    """Test ConversationService"""
    
    @pytest.fixture
    def mock_repo(self):
        """Mock conversation repository"""
        return Mock(spec=ConversationRepository)
    
    @pytest.fixture
    def mock_ai_service(self):
        """Mock AI service"""
        return Mock(spec=AIService)
    
    @pytest.fixture
    def mock_ai_config_service(self):
        """Mock AI config service"""
        return Mock(spec=AIConfigService)
    
    @pytest.fixture
    def service(self, mock_repo, mock_ai_service, mock_ai_config_service):
        """Create ConversationService instance"""
        return ConversationService(mock_repo, mock_ai_service, mock_ai_config_service)
    
    def test_create_or_update_settings(self, service, mock_repo):
        """Test creating or updating settings"""
        mock_settings = Mock()
        mock_settings.to_dict.return_value = {
            'conversation_id': 'test_001',
            'title': 'Test Story'
        }
        mock_repo.create_or_update_settings.return_value = mock_settings
        
        result = service.create_or_update_settings(
            conversation_id='test_001',
            title='Test Story',
            background='Test background'
        )
        
        assert result['conversation_id'] == 'test_001'
        mock_repo.create_or_update_settings.assert_called_once()
    
    def test_get_settings(self, service, mock_repo):
        """Test getting settings"""
        mock_settings = Mock()
        mock_settings.to_dict.return_value = {
            'conversation_id': 'test_001',
            'title': 'Test Story'
        }
        mock_repo.get_settings.return_value = mock_settings
        
        result = service.get_settings('test_001')
        
        assert result is not None
        assert result['conversation_id'] == 'test_001'
    
    def test_get_settings_not_found(self, service, mock_repo):
        """Test getting settings when not found"""
        mock_repo.get_settings.return_value = None
        
        result = service.get_settings('nonexistent')
        
        assert result is None
    
    def test_generate_outline(self, service, mock_ai_service, mock_ai_config_service):
        """Test generating outline"""
        mock_ai_config_service.get_config_for_api.return_value = {
            'provider': 'deepseek',
            'model': 'deepseek-chat',
            'api_key': 'test_key',
            'base_url': 'https://api.deepseek.com',
            'max_tokens': 2000,
            'temperature': 0.7
        }
        
        mock_ai_service.chat.return_value = {
            'success': True,
            'response': 'Generated outline here'
        }
        
        result = service.generate_outline(
            background='Test background',
            characters=['Alice'],
            character_personality={'Alice': 'Brave'},
            provider='deepseek',
            model='deepseek-chat'
        )
        
        assert result == 'Generated outline here'
        mock_ai_service.chat.assert_called_once()

