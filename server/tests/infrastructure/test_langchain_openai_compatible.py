import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))


@patch("langchain_openai.ChatOpenAI")
def test_openai_compatible_uses_normalized_v1_base(mock_cls: MagicMock) -> None:
    from infrastructure.langchain_chat import get_chat_model

    mock_cls.return_value = MagicMock(name="chat")
    get_chat_model(
        "openai_compatible",
        "my-model",
        api_key="sk-test",
        base_url="http://127.0.0.1:1234",
        max_tokens=512,
        temperature=0.2,
    )
    mock_cls.assert_called_once()
    kwargs = mock_cls.call_args.kwargs
    assert kwargs["model"] == "my-model"
    assert kwargs["base_url"].rstrip("/").endswith("/v1")
    assert kwargs["api_key"] == "sk-test"


@patch("langchain_openai.ChatOpenAI")
def test_openai_provider_uses_default_base(mock_cls: MagicMock) -> None:
    from infrastructure.langchain_chat import get_chat_model

    mock_cls.return_value = MagicMock(name="chat")
    get_chat_model(
        "openai",
        "gpt-4o-mini",
        api_key="sk-openai",
        max_tokens=512,
        temperature=0.2,
    )
    kwargs = mock_cls.call_args.kwargs
    assert kwargs["base_url"].rstrip("/").endswith("/v1")
    assert kwargs["api_key"] == "sk-openai"


def test_anthropic_provider_uses_chat_anthropic() -> None:
    pytest.importorskip("langchain_anthropic")
    from infrastructure.langchain_chat import get_chat_model

    with patch("langchain_anthropic.ChatAnthropic") as mock_cls:
        mock_cls.return_value = MagicMock(name="chat")
        get_chat_model(
            "anthropic",
            "claude-3-5-sonnet-latest",
            api_key="sk-anthropic",
            max_tokens=512,
            temperature=0.2,
        )
        kwargs = mock_cls.call_args.kwargs
        assert kwargs["model"] == "claude-3-5-sonnet-latest"
        assert kwargs["api_key"] == "sk-anthropic"

