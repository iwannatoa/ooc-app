"""
LangChain-backed chat invoke and stream (provider + LLM request).

Uses ``langchain_ollama.ChatOllama`` and ``langchain_openai.ChatOpenAI`` (DeepSeek-compatible).
"""
from __future__ import annotations

from typing import Dict, Generator, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel

from config import Config
from infrastructure.langchain_messages import dict_messages_to_base_messages
from infrastructure.provider_capabilities import get_provider_capability
from utils.exceptions import ProviderError, ValidationError
from utils.logger import get_logger

logger = get_logger(__name__)


def _bind_stop_words(chat: BaseChatModel, stop_words: Optional[List[str]]):
    if not stop_words:
        return chat
    sanitized = [word.strip() for word in stop_words if word and word.strip()]
    if not sanitized:
        return chat
    return chat.bind(stop=sanitized)


def _normalize_openai_base_url(base_url: str) -> str:
    u = base_url.rstrip("/")
    if not u.endswith("/v1"):
        u = f"{u}/v1"
    return u


def get_chat_model(
    provider: str,
    model: str,
    *,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    ollama_base_url: Optional[str] = None,
) -> BaseChatModel:
    """Factory for supported providers."""
    capability = get_provider_capability(provider)
    if capability is None:
        raise ProviderError(
            f"Unsupported provider for LangChain: {provider}",
            provider=provider,
            status_code=400,
        )

    if capability.client_kind == "ollama":
        from langchain_ollama import ChatOllama

        url = (
            ollama_base_url
            or base_url
            or capability.default_base_url
            or Config.OLLAMA_BASE_URL
        ).rstrip("/")
        return ChatOllama(
            model=model,
            base_url=url,
            temperature=temperature,
            num_predict=max_tokens,
        )

    if capability.client_kind == "chat_openai":
        if capability.requires_api_key and not (api_key or "").strip():
            provider_label = provider.replace("_", " ").title()
            raise ValidationError(
                f"{provider_label} API key is required",
                field="apiKey",
            )
        from langchain_openai import ChatOpenAI

        if provider == "openai_compatible":
            resolved_base_url = (base_url or capability.default_base_url or "").strip()
            if not resolved_base_url:
                raise ValidationError(
                    "OpenAI-compatible base URL is required",
                    field="baseUrl",
                )
            root = str(resolved_base_url).rstrip("/")
            key = (api_key or "").strip() or "not-needed"
        else:
            root = (
                str(base_url).rstrip("/")
                if base_url
                else capability.default_base_url.rstrip("/")
            )
            key = (api_key or "").strip() or "not-needed"

        api_base = _normalize_openai_base_url(root)
        return ChatOpenAI(
            model=model,
            api_key=key,
            base_url=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=Config.DEEPSEEK_TIMEOUT,
        )

    if capability.client_kind == "chat_anthropic":
        if not (api_key or "").strip():
            raise ValidationError("Anthropic API key is required", field="apiKey")
        from langchain_anthropic import ChatAnthropic

        anthropic_url = (
            str(base_url).rstrip("/")
            if base_url
            else capability.default_base_url.rstrip("/")
        )
        return ChatAnthropic(
            model=model,
            api_key=(api_key or "").strip(),
            anthropic_api_url=anthropic_url,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=Config.ANTHROPIC_TIMEOUT,
        )

    raise ProviderError(
        f"Unsupported provider client kind: {capability.client_kind}",
        provider=provider,
        status_code=400,
    )


def invoke_langchain_chat(
    provider: str,
    message: str,
    model: str,
    *,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    messages: Optional[List[Dict]] = None,
    stop_words: Optional[List[str]] = None,
    message_parts: Optional[List[Dict]] = None,
    ollama_base_url: Optional[str] = None,
) -> str:
    """Non-streaming completion; returns assistant text."""
    lc_messages = dict_messages_to_base_messages(
        system_prompt,
        messages,
        message,
        message_parts,
    )
    chat = get_chat_model(
        provider,
        model,
        api_key=api_key,
        base_url=base_url,
        max_tokens=max_tokens,
        temperature=temperature,
        ollama_base_url=ollama_base_url,
    )
    runnable = _bind_stop_words(chat, stop_words)
    try:
        result = runnable.invoke(lc_messages)
        return (result.content or "").strip()
    except ValidationError:
        raise
    except ProviderError:
        raise
    except Exception as e:
        logger.error("LangChain invoke failed: %s", e, exc_info=True)
        raise ProviderError(
            str(e),
            provider=provider,
            status_code=502,
        ) from e


def stream_langchain_chat(
    provider: str,
    message: str,
    model: str,
    *,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    messages: Optional[List[Dict]] = None,
    stop_words: Optional[List[str]] = None,
    message_parts: Optional[List[Dict]] = None,
    ollama_base_url: Optional[str] = None,
) -> Generator[str, None, None]:
    """Yield text chunks (sync stream)."""
    lc_messages = dict_messages_to_base_messages(
        system_prompt,
        messages,
        message,
        message_parts,
    )
    chat = get_chat_model(
        provider,
        model,
        api_key=api_key,
        base_url=base_url,
        max_tokens=max_tokens,
        temperature=temperature,
        ollama_base_url=ollama_base_url,
    )
    runnable = _bind_stop_words(chat, stop_words)
    try:
        for chunk in runnable.stream(lc_messages):
            text = getattr(chunk, "content", None) or ""
            if text:
                yield text
    except ValidationError:
        raise
    except ProviderError:
        raise
    except Exception as e:
        logger.error("LangChain stream failed: %s", e, exc_info=True)
        raise ProviderError(
            str(e),
            provider=provider,
            status_code=502,
        ) from e
