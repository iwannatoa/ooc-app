"""
Unit tests for SettingsController
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from flask import Flask

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from controller.settings_controller import SettingsController
from service.conversation_service import ConversationService
from service.story_service import StoryService
from service.ai_service import AIService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from service.character_service import CharacterService
from service.story_generation_service import StoryGenerationService
from service.chat_service import ChatService


class TestSettingsController:
    """Test SettingsController"""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for testing"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def mock_services(self):
        """Create mock services"""
        return {
            'conversation_service': Mock(spec=ConversationService),
            'story_service': Mock(spec=StoryService),
            'ai_service': Mock(spec=AIService),
            'ai_config_service': Mock(spec=AIConfigService),
            'app_settings_service': Mock(spec=AppSettingsService),
            'character_service': Mock(spec=CharacterService),
            'story_generation_service': Mock(spec=StoryGenerationService),
            'chat_service': Mock(spec=ChatService),
        }
    
    @pytest.fixture
    def controller(self, mock_services):
        """Create SettingsController instance"""
        return SettingsController(
            conversation_service=mock_services['conversation_service'],
            story_service=mock_services['story_service'],
            ai_service=mock_services['ai_service'],
            ai_config_service=mock_services['ai_config_service'],
            app_settings_service=mock_services['app_settings_service'],
            character_service=mock_services['character_service'],
            story_generation_service=mock_services['story_generation_service'],
            chat_service=mock_services['chat_service']
        )
    
    @pytest.fixture
    def client(self, app, controller):
        """Create test client"""
        controller.register_routes(app)
        return app.test_client()
    
    def test_get_conversations_list(self, client, controller, mock_services):
        """Test getting conversations list"""
        mock_services['conversation_service'].get_all_conversations.return_value = [
            {
                'conversation_id': 'test_001',
                'title': 'Test Story',
                'created_at': '2024-01-01T00:00:00'
            }
        ]
        
        response = client.get('/api/conversations/list')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['conversations']) == 1
    
    def test_get_conversation_settings(self, client, controller, mock_services):
        """Test getting conversation settings"""
        mock_services['conversation_service'].get_settings.return_value = {
            'conversation_id': 'test_001',
            'title': 'Test Story',
            'background': 'Test background'
        }
        
        response = client.get('/api/conversation/settings?conversation_id=test_001')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['settings']['title'] == 'Test Story'
    
    def test_get_conversation_settings_not_found(self, client, controller, mock_services):
        """Test getting settings when not found"""
        mock_services['conversation_service'].get_settings.return_value = None
        
        response = client.get('/api/conversation/settings?conversation_id=nonexistent')
        
        assert response.status_code == 404
    
    def test_get_characters(self, client, controller, mock_services):
        """Test getting characters"""
        mock_services['character_service'].get_characters.return_value = [
            {'name': 'Alice', 'is_main': True},
            {'name': 'Bob', 'is_main': False}
        ]
        
        response = client.get('/api/conversation/characters?conversation_id=test_001')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['characters']) == 2
    
    def test_get_language(self, client, controller, mock_services):
        """Test getting language setting"""
        mock_services['app_settings_service'].get_language.return_value = 'zh'
        
        response = client.get('/api/app-settings/language')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['language'] == 'zh'
    
    def test_set_language(self, client, controller, mock_services):
        """Test setting language"""
        mock_services['app_settings_service'].set_language.return_value = {'key': 'language', 'value': 'en'}
        
        response = client.post(
            '/api/app-settings/language',
            json={'language': 'en'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['language'] == 'en'

