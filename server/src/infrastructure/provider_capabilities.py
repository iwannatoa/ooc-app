"""
Provider capability registry.

Single source of truth for provider-level defaults and behavior flags.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable

from config import Config


@dataclass(frozen=True)
class ProviderCapability:
    provider: str
    client_kind: str  # ollama | chat_openai | chat_anthropic
    requires_api_key: bool
    supports_streaming: bool
    default_base_url: str
    default_model: str


PROVIDER_CAPABILITIES: Dict[str, ProviderCapability] = {
    "ollama": ProviderCapability(
        provider="ollama",
        client_kind="ollama",
        requires_api_key=False,
        supports_streaming=True,
        default_base_url=Config.OLLAMA_BASE_URL,
        default_model="llama2",
    ),
    "deepseek": ProviderCapability(
        provider="deepseek",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.DEEPSEEK_BASE_URL,
        default_model="deepseek-chat",
    ),
    "openai_compatible": ProviderCapability(
        provider="openai_compatible",
        client_kind="chat_openai",
        requires_api_key=False,
        supports_streaming=True,
        default_base_url=Config.OPENAI_COMPATIBLE_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "openai": ProviderCapability(
        provider="openai",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.OPENAI_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "azure": ProviderCapability(
        provider="azure",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.AZURE_OPENAI_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "anthropic": ProviderCapability(
        provider="anthropic",
        client_kind="chat_anthropic",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.ANTHROPIC_BASE_URL,
        default_model="claude-3-5-sonnet-latest",
    ),
    "glm": ProviderCapability(
        provider="glm",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.GLM_BASE_URL,
        default_model="glm-4-flash",
    ),
    "kimi": ProviderCapability(
        provider="kimi",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.KIMI_BASE_URL,
        default_model="moonshot-v1-8k",
    ),
    "minimax": ProviderCapability(
        provider="minimax",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        default_base_url=Config.MINIMAX_BASE_URL,
        default_model="MiniMax-Text-01",
    ),
}


def get_provider_capability(provider: str) -> ProviderCapability | None:
    return PROVIDER_CAPABILITIES.get(provider)


def get_supported_providers() -> Iterable[str]:
    return PROVIDER_CAPABILITIES.keys()

