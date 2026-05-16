"""
Select which chat messages are included in the LLM context for story generation.

Extracted from story generation flow so the same rules can be reused (including
LangChain message lists) and tested in isolation.
"""
from typing import Any, Callable, Dict, List, Optional, Tuple


def _context_trace_template(
    *,
    summary_version: Optional[str],
    total_budget: int,
) -> Dict[str, Any]:
    return {
        "selectedSources": [],
        "droppedSources": [],
        "budgetUsed": {
            "totalBudget": total_budget,
            "usedTokens": 0,
            "usedByLayer": {
                "recent": 0,
                "history": 0,
                "summary": 0,
                "system": 0,
            },
        },
        "trimReasons": [],
        "summaryVersion": summary_version or "none",
    }


def select_messages_for_ai_context_with_trace(
    all_messages: List[Dict],
    *,
    summary_text: Optional[str],
    summary_version: Optional[str],
    estimated_system_tokens: int,
    estimate_tokens: Callable[[str], int],
    recent_messages_with_summary: int,
    max_message_history: int,
    max_context_tokens: int,
) -> Tuple[List[Dict], bool, bool, Dict[str, Any]]:
    """
    Context-management aware selector with lightweight trace output.

    Returns:
        ``(messages_for_ai, history_truncated, older_via_summary, context_trace)``
    """
    # Context Management budget rule:
    # - use 80% of model context as working budget
    # - reserve >=40% for recent turns
    effective_budget = max(1, int(max_context_tokens * 0.8))
    recent_budget = max(1, int(effective_budget * 0.4))
    summary_budget = max(1, int(effective_budget * 0.3))

    history_truncated = False
    older_via_summary = False
    messages_for_ai: List[Dict] = []
    trace = _context_trace_template(
        summary_version=summary_version,
        total_budget=effective_budget,
    )
    trace["budgetUsed"]["usedByLayer"]["system"] = estimated_system_tokens

    if summary_text:
        summary_tokens = estimate_tokens(summary_text)
        used_summary_tokens = min(summary_tokens, summary_budget)
        trace["budgetUsed"]["usedByLayer"]["summary"] = used_summary_tokens
        trace["selectedSources"].append("summary")
        if summary_tokens > summary_budget:
            trace["droppedSources"].append("summary_overflow_trimmed")
            trace["trimReasons"].append("summary_exceeded_summary_budget")

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
        recent_tokens = sum(estimate_tokens(m.get("content", "")) for m in recent_messages)
        trace["budgetUsed"]["usedByLayer"]["recent"] = recent_tokens
        trace["selectedSources"].append(f"recent_messages:{len(recent_messages)}")
    else:
        # Keep the previous behaviour (reverse walk + history cap), but track token budget.
        selected_messages: List[Dict] = []
        current_tokens = estimated_system_tokens
        recent_tokens = 0
        history_tokens = 0
        selected_count = 0

        for idx, msg in enumerate(reversed(all_messages)):
            msg_content = msg.get("content", "")
            msg_tokens = estimate_tokens(msg_content)

            if current_tokens + msg_tokens > effective_budget and len(selected_messages) > 0:
                history_truncated = True
                trace["droppedSources"].append("messages_overflow_trimmed")
                trace["trimReasons"].append("context_budget_exceeded")
                break

            if len(selected_messages) >= max_message_history:
                history_truncated = True
                trace["droppedSources"].append("messages_count_trimmed")
                trace["trimReasons"].append("max_message_history_reached")
                break

            selected_messages.insert(0, msg)
            current_tokens += msg_tokens
            selected_count += 1
            if idx < recent_messages_with_summary:
                recent_tokens += msg_tokens
            else:
                history_tokens += msg_tokens

        history_truncated = history_truncated or (len(selected_messages) < len(all_messages))
        messages_for_ai = [
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in selected_messages
        ]
        trace["budgetUsed"]["usedByLayer"]["recent"] = recent_tokens
        trace["budgetUsed"]["usedByLayer"]["history"] = history_tokens
        trace["selectedSources"].append(f"messages:{selected_count}")
        if recent_tokens < recent_budget and len(all_messages) > selected_count:
            trace["trimReasons"].append("recent_budget_not_fully_satisfied")

    trace["budgetUsed"]["usedTokens"] = (
        trace["budgetUsed"]["usedByLayer"]["recent"]
        + trace["budgetUsed"]["usedByLayer"]["history"]
        + trace["budgetUsed"]["usedByLayer"]["summary"]
        + trace["budgetUsed"]["usedByLayer"]["system"]
    )
    return messages_for_ai, history_truncated, older_via_summary, trace


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
    messages_for_ai, history_truncated, older_via_summary, _trace = (
        select_messages_for_ai_context_with_trace(
            all_messages,
            summary_text=summary_text,
            summary_version=None,
            estimated_system_tokens=estimated_system_tokens,
            estimate_tokens=estimate_tokens,
            recent_messages_with_summary=recent_messages_with_summary,
            max_message_history=max_message_history,
            max_context_tokens=max_context_tokens,
        )
    )
    return messages_for_ai, history_truncated, older_via_summary
