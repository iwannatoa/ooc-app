"""
Unit tests for ChatController.
"""
import sys
from pathlib import Path
from unittest.mock import Mock, patch

from flask import Flask, Response
import pytest

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from controller.chat_controller import ChatController
from service.chat_orchestration_service import ChatOrchestrationService
from service.summary_service import SummaryService
from service.summary_orchestration_service import SummaryOrchestrationService
from service.story_generation_service import StoryGenerationService
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.chat_service import ChatService
from service.character_service import CharacterService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from service.conversation_service import ConversationService
from service.story_service import StoryService


class TestChatController:
    """Test ChatController behavior."""

    @pytest.fixture
    def app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def mock_services(self):
        return {
            'chat_orchestration_service': Mock(spec=ChatOrchestrationService),
            'summary_service': Mock(spec=SummaryService),
            'summary_orchestration_service': Mock(spec=SummaryOrchestrationService),
            'story_generation_service': Mock(spec=StoryGenerationService),
            'ai_service': Mock(spec=AIService),
            'ai_service_streaming': Mock(spec=AIServiceStreaming),
            'chat_service': Mock(spec=ChatService),
            'character_service': Mock(spec=CharacterService),
            'ai_config_service': Mock(spec=AIConfigService),
            'app_settings_service': Mock(spec=AppSettingsService),
            'conversation_service': Mock(spec=ConversationService),
            'story_service': Mock(spec=StoryService),
        }

    @pytest.fixture
    def controller(self, mock_services):
        return ChatController(
            chat_orchestration_service=mock_services['chat_orchestration_service'],
            summary_service=mock_services['summary_service'],
            summary_orchestration_service=mock_services['summary_orchestration_service'],
            story_generation_service=mock_services['story_generation_service'],
            ai_service=mock_services['ai_service'],
            ai_service_streaming=mock_services['ai_service_streaming'],
            chat_service=mock_services['chat_service'],
            character_service=mock_services['character_service'],
            ai_config_service=mock_services['ai_config_service'],
            app_settings_service=mock_services['app_settings_service'],
            conversation_service=mock_services['conversation_service'],
            story_service=mock_services['story_service'],
        )

    @pytest.fixture
    def client(self, app, controller):
        controller.register_routes(app)
        return app.test_client()

    def test_chat_stream_forwards_conversation_stop_words(
        self,
        client,
        mock_services,
    ):
        mock_services['app_settings_service'].get_language.return_value = 'en'
        mock_services['ai_config_service'].get_config_for_api.return_value = {
            'provider': 'deepseek',
            'model': 'deepseek-chat',
            'api_key': 'test-key',
            'base_url': 'https://api.deepseek.com',
            'max_tokens': 2048,
            'temperature': 0.7,
        }
        mock_services['conversation_service'].get_settings.return_value = {
            'additional_settings': {
                'conversationTemperature': '0.3',
                'conversationMaxTokens': '333',
                'conversationStopWords': ['END', 'STOP'],
            }
        }
        mock_services['chat_service'].get_conversation.return_value = []
        mock_services['ai_service_streaming'].chat_stream.return_value = iter(['ok'])

        with patch(
            'controller.chat_controller.create_stream_response',
            return_value=Response("data: ok\n\n", mimetype='text/event-stream'),
        ):
            response = client.post(
                '/api/chat-stream',
                json={
                    'provider': 'deepseek',
                    'message': 'hello',
                    'conversation_id': 'conv-1',
                },
            )

        assert response.status_code == 200
        mock_services['ai_service_streaming'].chat_stream.assert_called_once()
        call_kwargs = mock_services['ai_service_streaming'].chat_stream.call_args.kwargs
        assert call_kwargs['temperature'] == 0.3
        assert call_kwargs['max_tokens'] == 333
        assert call_kwargs['stop_words'] == ['END', 'STOP']
