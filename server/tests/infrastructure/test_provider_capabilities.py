import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from infrastructure.provider_capabilities import (  # noqa: E402
    get_provider_capability,
    get_supported_providers,
)


def test_provider_capability_registry_contains_required_providers() -> None:
    providers = set(get_supported_providers())
    assert {
        "ollama",
        "deepseek",
        "openai_compatible",
        "openai",
        "anthropic",
        "glm",
        "kimi",
        "minimax",
    }.issubset(providers)


def test_provider_capability_defaults_are_defined() -> None:
    openai = get_provider_capability("openai")
    anthropic = get_provider_capability("anthropic")
    glm = get_provider_capability("glm")

    assert openai is not None
    assert openai.requires_api_key is True
    assert openai.default_model
    assert openai.default_base_url.startswith("https://")

    assert anthropic is not None
    assert anthropic.client_kind == "chat_anthropic"
    assert anthropic.requires_api_key is True

    assert glm is not None
    assert glm.client_kind == "chat_openai"
    assert glm.supports_streaming is True
