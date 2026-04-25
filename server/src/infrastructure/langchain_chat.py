"""
LangChain-backed chat invoke and stream (todo.txt: provider + LLM request).

Uses ``langchain_ollama.ChatOllama`` and ``langchain_openai.ChatOpenAI`` (DeepSeek-compatible).
"""
from __future__ import annotations

from typing import Dict, Generator, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel

from config import Config
from infrastructure.langchain_messages import dict_messages_to_base_messages
from utils.exceptions import ProviderError, ValidationError
from utils.logger import get_logger

logger = get_logger(__name__)


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
    """Factory for supported providers (``ollama``, ``deepseek``)."""
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        url = (ollama_base_url or base_url or Config.OLLAMA_BASE_URL).rstrip("/")
        return ChatOllama(
            model=model,
            base_url=url,
            temperature=temperature,
            num_predict=max_tokens,
        )

    if provider == "deepseek":
        if not api_key:
            raise ValidationError("DeepSeek API key is required", field="apiKey")
        from langchain_openai import ChatOpenAI

        root = base_url.rstrip("/") if base_url else Config.DEEPSEEK_BASE_URL.rstrip("/")
        api_base = _normalize_openai_base_url(root)
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=Config.DEEPSEEK_TIMEOUT,
        )

    if provider == "openai_compatible":
        from langchain_openai import ChatOpenAI

        if not base_url or not str(base_url).strip():
            raise ValidationError(
                "OpenAI-compatible base URL is required",
                field="baseUrl",
            )
        key = (api_key or "").strip() or "not-needed"
        root = str(base_url).rstrip("/")
        api_base = _normalize_openai_base_url(root)
        return ChatOpenAI(
            model=model,
            api_key=key,
            base_url=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=Config.DEEPSEEK_TIMEOUT,
        )

    raise ProviderError(
        f"Unsupported provider for LangChain: {provider}",
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
    ollama_base_url: Optional[str] = None,
) -> str:
    """Non-streaming completion; returns assistant text."""
    lc_messages = dict_messages_to_base_messages(system_prompt, messages, message)
    chat = get_chat_model(
        provider,
        model,
        api_key=api_key,
        base_url=base_url,
        max_tokens=max_tokens,
        temperature=temperature,
        ollama_base_url=ollama_base_url,
    )
    try:
        result = chat.invoke(lc_messages)
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
    ollama_base_url: Optional[str] = None,
) -> Generator[str, None, None]:
    """Yield text chunks (sync stream)."""
    lc_messages = dict_messages_to_base_messages(system_prompt, messages, message)
    chat = get_chat_model(
        provider,
        model,
        api_key=api_key,
        base_url=base_url,
        max_tokens=max_tokens,
        temperature=temperature,
        ollama_base_url=ollama_base_url,
    )
    try:
        for chunk in chat.stream(lc_messages):
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
