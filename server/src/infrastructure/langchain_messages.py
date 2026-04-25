"""
LangChain message builders (todo.txt: prompt / history bridge).

Converts the app's ``{"role","content"}`` history plus system and final user text
into ``langchain_core`` BaseMessage lists for invoke/stream.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda


def dict_messages_to_base_messages(
    system_prompt: Optional[str],
    messages: Optional[List[Dict[str, Any]]],
    current_user_message: str,
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
    if current_user_message:
        out.append(HumanMessage(content=current_user_message))
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
