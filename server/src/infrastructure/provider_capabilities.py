"""
Provider capability registry.

Single source of truth for provider-level defaults and behavior flags.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any, Dict, Iterable

from config import Config


@dataclass(frozen=True)
class ProviderCapability:
    provider: str
    client_kind: str  # ollama | chat_openai | chat_anthropic
    requires_api_key: bool
    supports_streaming: bool
    supports_multimodal: bool
    supported_modalities: tuple[str, ...]
    max_attachments: int
    default_base_url: str
    default_model: str


@dataclass(frozen=True)
class MultimodalNormalizationResult:
    normalized_message: str
    content_type: str
    attachment_ref: str | None
    provider_capability_notice: str | None


PROVIDER_CAPABILITIES: Dict[str, ProviderCapability] = {
    "ollama": ProviderCapability(
        provider="ollama",
        client_kind="ollama",
        requires_api_key=False,
        supports_streaming=True,
        supports_multimodal=False,
        supported_modalities=("text",),
        max_attachments=0,
        default_base_url=Config.OLLAMA_BASE_URL,
        default_model="llama2",
    ),
    "deepseek": ProviderCapability(
        provider="deepseek",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.DEEPSEEK_BASE_URL,
        default_model="deepseek-chat",
    ),
    "openai_compatible": ProviderCapability(
        provider="openai_compatible",
        client_kind="chat_openai",
        requires_api_key=False,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.OPENAI_COMPATIBLE_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "openai": ProviderCapability(
        provider="openai",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.OPENAI_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "azure": ProviderCapability(
        provider="azure",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.AZURE_OPENAI_BASE_URL,
        default_model="gpt-4o-mini",
    ),
    "anthropic": ProviderCapability(
        provider="anthropic",
        client_kind="chat_anthropic",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.ANTHROPIC_BASE_URL,
        default_model="claude-3-5-sonnet-latest",
    ),
    "glm": ProviderCapability(
        provider="glm",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.GLM_BASE_URL,
        default_model="glm-4-flash",
    ),
    "kimi": ProviderCapability(
        provider="kimi",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.KIMI_BASE_URL,
        default_model="moonshot-v1-8k",
    ),
    "minimax": ProviderCapability(
        provider="minimax",
        client_kind="chat_openai",
        requires_api_key=True,
        supports_streaming=True,
        supports_multimodal=True,
        supported_modalities=("text", "image"),
        max_attachments=4,
        default_base_url=Config.MINIMAX_BASE_URL,
        default_model="MiniMax-Text-01",
    ),
}


def get_provider_capability(provider: str) -> ProviderCapability | None:
    return PROVIDER_CAPABILITIES.get(provider)


def get_supported_providers() -> Iterable[str]:
    return PROVIDER_CAPABILITIES.keys()


def parse_message_parts(
    message: str,
    message_parts: list | None,
) -> tuple[str, list[dict[str, Any]]]:
    if not message_parts:
        return str(message or '').strip(), []
    text_parts: list[str] = []
    attachment_meta: list[dict[str, Any]] = []
    for part in message_parts:
        if not isinstance(part, dict):
            continue
        part_type = str(part.get('type') or 'text').strip().lower()
        if part_type == 'text':
            content = str(part.get('content') or '').strip()
            if content:
                text_parts.append(content)
            continue
        filename = str(part.get('name') or 'attachment')
        mime_type = str(part.get('mime_type') or part.get('mimeType') or 'unknown')
        attachment_meta.append({
            "type": part_type,
            "name": filename,
            "mime_type": mime_type,
            "size_bytes": part.get('size_bytes') or part.get('size'),
        })
    normalized_text = "\n\n".join(text_parts).strip() or str(message or '').strip()
    return normalized_text, attachment_meta


def _to_modality(part_type: str) -> str:
    if part_type == 'image':
        return 'image'
    if part_type in ('file', 'audio', 'video'):
        return 'file'
    return part_type


def apply_provider_multimodal_policy(
    provider: str | None,
    message: str,
    message_parts: list | None,
) -> MultimodalNormalizationResult:
    normalized_message, attachment_meta = parse_message_parts(message, message_parts)
    attachment_ref = (
        json.dumps(attachment_meta, ensure_ascii=False)
        if attachment_meta
        else None
    )
    if not attachment_meta:
        return MultimodalNormalizationResult(
            normalized_message=normalized_message,
            content_type='text',
            attachment_ref=attachment_ref,
            provider_capability_notice=None,
        )

    capability = get_provider_capability(provider or '')
    provider_name = provider or 'unknown provider'
    supports_multimodal = capability.supports_multimodal if capability else False
    supported_modalities = set(capability.supported_modalities) if capability else {'text'}
    max_attachments = capability.max_attachments if capability else 0

    supported_count = 0
    dropped_unsupported_count = 0
    dropped_limit_count = 0
    for attachment in attachment_meta:
        modality = _to_modality(str(attachment.get('type') or 'file').strip().lower())
        if not supports_multimodal or modality not in supported_modalities:
            dropped_unsupported_count += 1
            continue
        if max_attachments >= 0 and supported_count >= max_attachments:
            dropped_limit_count += 1
            continue
        supported_count += 1

    if supported_count == len(attachment_meta):
        with_marker = (
            f"{normalized_message}\n\n[Multimodal attachments: {supported_count}]"
            if normalized_message
            else f"[Multimodal attachments: {supported_count}]"
        )
        return MultimodalNormalizationResult(
            normalized_message=with_marker,
            content_type='multimodal',
            attachment_ref=attachment_ref,
            provider_capability_notice=None,
        )

    if not supports_multimodal:
        notice = (
            f"{provider_name} does not support multimodal attachments in chat. "
            f"{len(attachment_meta)} attachment(s) were ignored."
        )
    else:
        notice_parts: list[str] = []
        if dropped_unsupported_count:
            notice_parts.append(
                f"{dropped_unsupported_count} attachment(s) used unsupported modalities"
            )
        if dropped_limit_count:
            notice_parts.append(
                f"{dropped_limit_count} attachment(s) exceeded max_attachments={max_attachments}"
            )
        notice = (
            f"{provider_name} accepted {supported_count}/{len(attachment_meta)} "
            f"attachment(s); {'; '.join(notice_parts)}."
        )

    return MultimodalNormalizationResult(
        normalized_message=normalized_message,
        content_type='multimodal' if supported_count > 0 else 'text',
        attachment_ref=attachment_ref,
        provider_capability_notice=notice,
    )

