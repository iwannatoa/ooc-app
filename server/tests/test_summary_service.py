"""
Unit tests for SummaryService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.summary_service import SummaryService
from repository.summary_repository import SummaryRepository
from service.ai_service import AIService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService


class TestSummaryService:
    """Test SummaryService"""
    
    @pytest.fixture
    def mock_repo(self):
        """Mock summary repository"""
        return Mock(spec=SummaryRepository)
    
    @pytest.fixture
    def mock_ai_service(self):
        """Mock AI service"""
        return Mock(spec=AIService)
    
    @pytest.fixture
    def mock_app_settings_service(self):
        """Mock app settings service"""
        return Mock(spec=AppSettingsService)
    
    @pytest.fixture
    def service(self, mock_repo, mock_ai_service, mock_app_settings_service):
        """Create SummaryService instance"""
        return SummaryService(
            mock_repo,
            mock_ai_service,
            mock_app_settings_service
        )
    
    def test_get_summary(self, service, mock_repo):
        """Test getting summary"""
        mock_summary = Mock()
        mock_summary.to_dict.return_value = {
            'conversation_id': 'test_001',
            'summary': 'Test summary',
            'message_count': 10
        }
        mock_repo.get_summary.return_value = mock_summary
        
        result = service.get_summary('test_001')
        
        assert result is not None
        assert result['summary'] == 'Test summary'
    
    def test_get_summary_not_found(self, service, mock_repo):
        """Test getting summary when not found"""
        mock_repo.get_summary.return_value = None
        
        result = service.get_summary('nonexistent')
        
        assert result is None
    
    def test_should_summarize(self, service, mock_repo):
        """Test should_summarize logic"""
        # Test with message count below threshold
        result = service.should_summarize(
            conversation_id='test_001',
            message_count=10,
            threshold=20
        )
        assert result is False
        
        # Test with message count above threshold and no existing summary
        mock_repo.get_summary.return_value = None
        result = service.should_summarize(
            conversation_id='test_001',
            message_count=25,
            threshold=20
        )
        assert result is True
        
        # Test with message count above threshold but existing summary not old enough
        mock_existing_summary = Mock()
        mock_existing_summary.message_count = 20
        mock_repo.get_summary.return_value = mock_existing_summary
        result = service.should_summarize(
            conversation_id='test_001',
            message_count=25,
            threshold=20
        )
        assert result is False  # 25 < 20 + 10 (update_interval)
        
        # Test with message count above threshold and existing summary old enough
        result = service.should_summarize(
            conversation_id='test_001',
            message_count=35,
            threshold=20
        )
        assert result is True  # 35 >= 20 + 10 (update_interval)
    
    def test_generate_summary(self, service, mock_ai_service, mock_app_settings_service):
        """Test generating summary"""
        mock_app_settings_service.get_language.return_value = 'en'
        
        mock_ai_service.chat.return_value = {
            'success': True,
            'response': 'Generated summary text'
        }
        
        messages = [
            {'role': 'user', 'content': 'Test message 1'},
            {'role': 'assistant', 'content': 'Test response 1'}
        ]
        
        result = service.generate_summary(
            conversation_id='test_001',
            messages=messages,
            provider='deepseek',
            model='deepseek-chat',
            api_key='test_key',
            base_url='https://api.deepseek.com',
            max_tokens=2000,
            temperature=0.7
        )
        
        assert result == 'Generated summary text'
        mock_ai_service.chat.assert_called_once()
    
    def test_save_summary(self, service, mock_repo):
        """Test saving summary"""
        mock_summary = Mock()
        mock_summary.to_dict.return_value = {
            'conversation_id': 'test_001',
            'summary': 'Saved summary',
            'message_count': 10
        }
        mock_repo.create_or_update_summary.return_value = mock_summary
        
        result = service.create_or_update_summary(
            conversation_id='test_001',
            summary='Saved summary',
            message_count=10
        )
        
        assert result['summary'] == 'Saved summary'
        mock_repo.create_or_update_summary.assert_called_once_with(
            conversation_id='test_001',
            summary='Saved summary',
            message_count=10,
            token_count=None
        )

