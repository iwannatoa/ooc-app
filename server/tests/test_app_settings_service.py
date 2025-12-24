"""
Unit tests for AppSettingsService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.app_settings_service import AppSettingsService
from repository.app_settings_repository import AppSettingsRepository
from model.app_settings import AppSettings


class TestAppSettingsService:
    """Test AppSettingsService"""
    
    @pytest.fixture
    def mock_repo(self):
        """Mock app settings repository"""
        return Mock(spec=AppSettingsRepository)
    
    @pytest.fixture
    def service(self, mock_repo):
        """Create AppSettingsService instance"""
        return AppSettingsService(mock_repo)
    
    def test_get_language_default(self, service, mock_repo):
        """Test getting default language when not set"""
        mock_repo.get_setting.return_value = None
        
        language = service.get_language()
        
        assert language == 'zh'
    
    def test_get_language_from_db(self, service, mock_repo):
        """Test getting language from database"""
        mock_repo.get_value.return_value = 'en'
        
        language = service.get_language()
        
        assert language == 'en'
    
    def test_set_language(self, service, mock_repo):
        """Test setting language"""
        mock_setting = Mock(spec=AppSettings)
        mock_setting.to_dict.return_value = {'key': 'language', 'value': 'en'}
        mock_repo.set_setting.return_value = mock_setting
        
        result = service.set_language('en')
        
        assert result['value'] == 'en'
        mock_repo.set_setting.assert_called_once_with('language', 'en')
    
    def test_set_language_invalid(self, service, mock_repo):
        """Test setting invalid language"""
        with pytest.raises(ValueError, match="Invalid language: invalid. Must be 'zh' or 'en'"):
            service.set_language('invalid')

