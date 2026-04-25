"""AIService delegates to LangChain when USE_LANGCHAIN is enabled."""
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from service.ai_service import AIService
from service.ollama_service import OllamaService
from service.deepseek_service import DeepSeekService


@pytest.fixture
def mock_ollama_service():
    mock = Mock(spec=OllamaService)
    mock.generate = Mock(return_value={"response": "legacy"})
    mock.health_check = Mock(return_value=True)
    mock.base_url = "http://ollama:11434"
    return mock


@pytest.fixture
def mock_deepseek_service():
    mock = Mock(spec=DeepSeekService)
    mock.chat_completion = Mock(
        return_value={"choices": [{"message": {"content": "legacy"}}]}
    )
    return mock


@patch("service.ai_service.invoke_langchain_chat")
@patch("service.ai_service.get_config")
def test_chat_uses_langchain_when_enabled(
    mock_get_config, mock_invoke, mock_ollama_service, mock_deepseek_service
):
    mock_get_config.return_value = SimpleNamespace(USE_LANGCHAIN=True)
    mock_invoke.return_value = "lc-response"

    svc = AIService(mock_ollama_service, mock_deepseek_service)
    result = svc.chat(
        provider="deepseek",
        message="hi",
        model="deepseek-chat",
        api_key="k",
        base_url="https://api.deepseek.com",
    )

    assert result["success"] is True
    assert result["response"] == "lc-response"
    mock_invoke.assert_called_once()
    mock_deepseek_service.chat_completion.assert_not_called()

