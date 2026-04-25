"""Tests for story context message selection (LangChain plan / todo 4)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from utils.story_context_selection import select_messages_for_ai_context


def test_with_summary_recent_slice_and_older_flag():
    all_msgs = [{"role": "user", "content": str(i)} for i in range(20)]
    sel, truncated, older = select_messages_for_ai_context(
        all_msgs,
        summary_text="s",
        estimated_system_tokens=100,
        estimate_tokens=lambda s: len(s),
        recent_messages_with_summary=5,
        max_message_history=100,
        max_context_tokens=999999,
    )
    assert len(sel) == 5
    assert truncated is False
    assert older is True


def test_without_summary_truncates_by_token_budget():
    all_msgs = [{"role": "user", "content": "x" * 1000} for _ in range(50)]

    def est(s: str) -> int:
        return len(s)

    sel, truncated, older = select_messages_for_ai_context(
        all_msgs,
        summary_text=None,
        estimated_system_tokens=50000,
        estimate_tokens=est,
        recent_messages_with_summary=15,
        max_message_history=100,
        max_context_tokens=55000,
    )
    assert older is False
    assert truncated is True
    assert len(sel) < len(all_msgs)

