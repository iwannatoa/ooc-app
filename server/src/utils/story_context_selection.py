"""
Select which chat messages are included in the LLM context for story generation.

Extracted from story generation flow so the same rules can be reused (including
LangChain message lists) and tested in isolation.
"""
from typing import Callable, Dict, List, Optional, Tuple


def select_messages_for_ai_context(
    all_messages: List[Dict],
    *,
    summary_text: Optional[str],
    estimated_system_tokens: int,
    estimate_tokens: Callable[[str], int],
    recent_messages_with_summary: int,
    max_message_history: int,
    max_context_tokens: int,
) -> Tuple[List[Dict], bool, bool]:
    """
    Mirror ``StoryGenerationService._prepare_generation_context`` history rules.

    Returns:
        ``(messages_for_ai, history_truncated, older_via_summary)``
    """
    history_truncated = False
    older_via_summary = False
    messages_for_ai: List[Dict] = []

    if summary_text:
        recent_messages = (
            all_messages[-recent_messages_with_summary:]
            if len(all_messages) > recent_messages_with_summary
            else all_messages
        )
        older_via_summary = len(all_messages) > recent_messages_with_summary
        messages_for_ai = [
            {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            for msg in recent_messages
        ]
    else:
        selected_messages: List[Dict] = []
        current_tokens = estimated_system_tokens

        for msg in reversed(all_messages):
            msg_content = msg.get("content", "")
            msg_tokens = estimate_tokens(msg_content)

            if current_tokens + msg_tokens > max_context_tokens and len(selected_messages) > 0:
                break

            if len(selected_messages) >= max_message_history:
                break

            selected_messages.insert(0, msg)
            current_tokens += msg_tokens

        history_truncated = len(selected_messages) < len(all_messages)
        messages_for_ai = [
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in selected_messages
        ]

    return messages_for_ai, history_truncated, older_via_summary
