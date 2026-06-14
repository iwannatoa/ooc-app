"""
LangChain message builders (prompt / history bridge).

Converts the app's ``{"role","content"}`` history plus system and final user text
into ``langchain_core`` BaseMessage lists for invoke/stream.
"""
from __future__ import annotations

import base64
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda


def dict_messages_to_base_messages(
    system_prompt: Optional[str],
    messages: Optional[List[Dict[str, Any]]],
    current_user_message: str,
    current_message_parts: Optional[List[Dict[str, Any]]] = None,
) -> List[BaseMessage]:
    """Build ``SystemMessage`` + history + final ``HumanMessage`` (OpenAI-style roles)."""
    out: List[BaseMessage] = []
    if system_prompt:
        out.append(SystemMessage(content=system_prompt))
    if messages:
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                out.append(HumanMessage(content=content))
            elif role == "assistant":
                out.append(AIMessage(content=content))
    if current_user_message or current_message_parts:
        out.append(
            HumanMessage(
                content=_build_human_content(
                    current_user_message=current_user_message,
                    current_message_parts=current_message_parts,
                )
            )
        )
    return out


def build_story_chat_prompt_runnable() -> RunnableLambda:
    """
    Runnable that maps a dict payload to LC messages (todo: Create prompt template).

    Expected input keys: ``system_prompt``, ``messages`` (optional), ``message``.
    """
    return RunnableLambda(
        lambda d: dict_messages_to_base_messages(
            d.get("system_prompt"),
            d.get("messages"),
            d.get("message") or "",
            d.get("message_parts") or None,
        )
    )


def chat_prompt_template_placeholder() -> ChatPromptTemplate:
    """
    Explicit ``ChatPromptTemplate`` for documentation/tests; runtime uses
    ``dict_messages_to_base_messages`` for full dynamic history.
    """
    return ChatPromptTemplate.from_messages(
        [
            ("system", "{system_prompt}"),
            ("human", "{user_message}"),
        ]
    )


def _build_human_content(
    current_user_message: str,
    current_message_parts: Optional[List[Dict[str, Any]]],
) -> Any:
    if not current_message_parts:
        return current_user_message
    content_blocks: List[Dict[str, Any]] = []
    has_text_block = False
    for part in current_message_parts:
        if not isinstance(part, dict):
            continue
        part_type = str(part.get("type") or "").strip().lower()
        if part_type == "text":
            text = str(part.get("content") or "").strip()
            if text:
                content_blocks.append({"type": "text", "text": text})
                has_text_block = True
            continue
        if part_type == "image":
            image_block = _build_image_block(part)
            if image_block is not None:
                content_blocks.append(image_block)
                continue
        filename = str(part.get("name") or "attachment").strip()
        mime_type = str(part.get("mime_type") or part.get("mimeType") or "file")
        content_blocks.append(
            {"type": "text", "text": f"[Attachment: {filename} ({mime_type})]"}
        )
    if current_user_message and not has_text_block:
        content_blocks.insert(0, {"type": "text", "text": current_user_message})
    if not content_blocks:
        return current_user_message
    return content_blocks


def _build_image_block(part: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    mime_type = str(part.get("mime_type") or part.get("mimeType") or "image/png")
    storage_path = str(part.get("storage_path") or part.get("storagePath") or "").strip()
    data_url = str(part.get("data_url") or part.get("dataUrl") or "").strip()
    if data_url:
        return {"type": "image_url", "image_url": {"url": data_url}}
    if not storage_path:
        return None
    path = Path(storage_path)
    if not path.is_file():
        return None
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return {
        "type": "image_url",
        "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
    }
