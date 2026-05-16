"""
Tests for ChatOrchestrationService (non-stream chat persistence semantics).
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from service.chat_orchestration_service import ChatOrchestrationService


@pytest.fixture
def patch_uow():
    """Avoid requiring a real SQLite engine when exercising persistence paths."""
    mock_sess = MagicMock()
    cm = MagicMock()
    cm.__enter__.return_value = mock_sess
    cm.__exit__.return_value = None
    with patch('service.chat_orchestration_service.unit_of_work', return_value=cm) as m:
        yield m, mock_sess


@pytest.fixture
def mock_ai_service():
    return Mock()


@pytest.fixture
def mock_chat_service():
    return Mock()


@pytest.fixture
def mock_ai_config_service():
    svc = Mock()
    svc.get_config_for_api.return_value = {
        'provider': 'ollama',
        'model': 'llama',
        'api_key': None,
        'base_url': 'http://localhost:11434',
        'max_tokens': 1024,
        'temperature': 0.7,
    }
    return svc


@pytest.fixture
def mock_conversation_service():
    svc = Mock()
    svc.get_settings.return_value = None
    return svc


@pytest.fixture
def orchestration(
    mock_ai_service,
    mock_chat_service,
    mock_ai_config_service,
    mock_conversation_service,
):
    return ChatOrchestrationService(
        mock_ai_service,
        mock_chat_service,
        mock_ai_config_service,
        mock_conversation_service,
    )


def test_process_chat_persist_failure_marks_unsuccessful(
    patch_uow, orchestration, mock_ai_service, mock_chat_service
):
    mock_ai_service.chat.return_value = {
        'success': True,
        'response': 'Hello from model',
        'model': 'llama',
    }
    mock_chat_service.save_user_message.side_effect = RuntimeError('disk full')

    result = orchestration.process_chat(
        message='hi',
        provider='ollama',
        conversation_id='conv-1',
        language='en',
    )

    assert result['success'] is False
    assert result.get('persisted') is False
    assert 'error' in result
    assert 'persist' in result['error'].lower() or 'save' in result['error'].lower()
    assert result.get('conversation_id') == 'conv-1'


def test_process_chat_success_sets_persisted(
    patch_uow, orchestration, mock_ai_service, mock_chat_service
):
    _mock_uow, mock_sess = patch_uow
    mock_ai_service.chat.return_value = {
        'success': True,
        'response': 'Reply',
        'model': 'llama',
    }

    result = orchestration.process_chat(
        message='hi',
        provider='ollama',
        conversation_id='conv-2',
        language='en',
    )

    assert result['success'] is True
    assert result.get('persisted') is True
    assert result.get('conversation_id') == 'conv-2'
    mock_chat_service.save_user_message.assert_called_once_with(
        'conv-2', 'hi', session=mock_sess
    )
    mock_chat_service.save_assistant_message.assert_called_once()
    call_kw = mock_chat_service.save_assistant_message.call_args[1]
    assert call_kw.get('session') is mock_sess


def test_process_chat_applies_conversation_overrides(
    patch_uow,
    orchestration,
    mock_ai_service,
    mock_ai_config_service,
    mock_conversation_service,
):
    _mock_uow, _mock_sess = patch_uow
    mock_ai_service.chat.return_value = {
        'success': True,
        'response': 'Reply',
        'model': 'llama',
    }
    mock_conversation_service.get_settings.return_value = {
        'additional_settings': {
            'conversationTemperature': '0.2',
            'conversationMaxTokens': '333',
            'conversationStopWords': ['END', 'STOP'],
        }
    }

    orchestration.process_chat(
        message='hi',
        provider='ollama',
        conversation_id='conv-3',
        language='en',
    )

    chat_kwargs = mock_ai_service.chat.call_args[1]
    assert chat_kwargs['temperature'] == 0.2
    assert chat_kwargs['max_tokens'] == 333
    assert chat_kwargs['stop_words'] == ['END', 'STOP']
    mock_ai_config_service.get_config_for_api.assert_called_once()

