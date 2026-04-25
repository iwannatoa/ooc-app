import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

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

