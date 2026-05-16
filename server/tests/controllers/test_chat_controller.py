"""
Unit tests for ChatController.
"""
import json
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

        def _fake_stream_response(**kwargs):
            stream_generator = kwargs['stream_generator']
            list(stream_generator)
            return Response("data: ok\n\n", mimetype='text/event-stream')

        with patch(
            'controller.chat_controller.create_stream_response',
            side_effect=_fake_stream_response,
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

    def test_chat_stream_supports_message_parts_payload(
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
        mock_services['conversation_service'].get_settings.return_value = None
        mock_services['chat_service'].get_conversation.return_value = []
        mock_services['ai_service_streaming'].chat_stream.return_value = iter(['ok'])

        def _fake_stream_response(**kwargs):
            stream_generator = kwargs['stream_generator']
            list(stream_generator)
            return Response("data: ok\n\n", mimetype='text/event-stream')

        with patch(
            'controller.chat_controller.create_stream_response',
            side_effect=_fake_stream_response,
        ):
            response = client.post(
                '/api/chat-stream',
                json={
                    'provider': 'deepseek',
                    'message': 'hello',
                    'message_parts': [
                        {'type': 'text', 'content': 'hello'},
                        {
                            'type': 'image',
                            'name': 'a.png',
                            'mime_type': 'image/png',
                            'size_bytes': 12,
                        },
                    ],
                    'conversation_id': 'conv-1',
                },
            )

        assert response.status_code == 200
        call_kwargs = mock_services['ai_service_streaming'].chat_stream.call_args.kwargs
        assert '[Multimodal attachments: 1]' in call_kwargs['message']

    def test_chat_downgrades_multimodal_for_ollama_and_returns_notice(
        self,
        client,
        mock_services,
    ):
        mock_services['app_settings_service'].get_language.return_value = 'en'
        mock_services['chat_orchestration_service'].process_chat.return_value = {
            'success': True,
            'response': 'ok',
            'model': 'llama2',
        }

        response = client.post(
            '/api/chat',
            json={
                'provider': 'ollama',
                'message': 'hello',
                'message_parts': [
                    {'type': 'text', 'content': 'hello'},
                    {
                        'type': 'image',
                        'name': 'a.png',
                        'mime_type': 'image/png',
                        'size_bytes': 12,
                    },
                ],
            },
        )

        assert response.status_code == 200
        body = response.get_json()
        assert isinstance(body.get('provider_capability_notice'), str)
        call_kwargs = mock_services['chat_orchestration_service'].process_chat.call_args.kwargs
        assert call_kwargs['content_type'] == 'text'
        assert '[Multimodal attachments:' not in call_kwargs['message']

    def test_chat_stream_sends_provider_capability_notice_frame(
        self,
        client,
        mock_services,
    ):
        mock_services['app_settings_service'].get_language.return_value = 'en'
        mock_services['ai_config_service'].get_config_for_api.return_value = {
            'provider': 'ollama',
            'model': 'llama2',
            'api_key': '',
            'base_url': 'http://localhost:11434',
            'max_tokens': 2048,
            'temperature': 0.7,
        }
        mock_services['conversation_service'].get_settings.return_value = None
        mock_services['chat_service'].get_conversation.return_value = []
        mock_services['ai_service_streaming'].chat_stream.return_value = iter(['ok'])

        response = client.post(
            '/api/chat-stream',
            json={
                'provider': 'ollama',
                'message': 'hello',
                'message_parts': [
                    {'type': 'text', 'content': 'hello'},
                    {'type': 'image', 'name': 'a.png', 'mime_type': 'image/png'},
                ],
                'conversation_id': 'conv-1',
            },
        )

        assert response.status_code == 200
        payload = response.data.decode('utf-8')
        first_data_line = payload.split('\n', 1)[0].replace('data: ', '', 1)
        first_json = json.loads(first_data_line)
        assert 'provider_capability_notice' in first_json
        call_kwargs = mock_services['ai_service_streaming'].chat_stream.call_args.kwargs
        assert '[Multimodal attachments:' not in call_kwargs['message']

    def test_story_branch_savepoint_ending_routes(
        self,
        client,
        mock_services,
    ):
        mock_services['app_settings_service'].get_language.return_value = 'en'
        mock_services['chat_service'].create_branch.return_value = {
            'branch_id': 'br-1',
            'conversation_id': 'conv-1',
        }
        mock_services['chat_service'].list_branches.return_value = [
            {'branch_id': 'br-1'}
        ]
        mock_services['chat_service'].create_savepoint.return_value = {
            'savepoint_id': 'sp-1',
            'conversation_id': 'conv-1',
        }
        mock_services['chat_service'].list_savepoints.return_value = [
            {'savepoint_id': 'sp-1'}
        ]
        mock_services['chat_service'].mark_ending.return_value = {
            'ending_tag': 'open_end',
            'conversation_id': 'conv-1',
        }
        mock_services['chat_service'].list_endings.return_value = [
            {'ending_tag': 'open_end'}
        ]

        branch_resp = client.post(
            '/api/story/branches',
            json={'conversation_id': 'conv-1', 'label': 'test'},
        )
        assert branch_resp.status_code == 200

        branch_list_resp = client.get('/api/story/branches?conversation_id=conv-1')
        assert branch_list_resp.status_code == 200

        savepoint_resp = client.post(
            '/api/story/savepoint',
            json={'conversation_id': 'conv-1', 'label': 'cp1'},
        )
        assert savepoint_resp.status_code == 200

        savepoint_list_resp = client.get('/api/story/savepoint?conversation_id=conv-1')
        assert savepoint_list_resp.status_code == 200

        ending_resp = client.post(
            '/api/story/ending',
            json={'conversation_id': 'conv-1', 'ending_tag': 'open_end'},
        )
        assert ending_resp.status_code == 200

        ending_list_resp = client.get('/api/story/ending?conversation_id=conv-1')
        assert ending_list_resp.status_code == 200
