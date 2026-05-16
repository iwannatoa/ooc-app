"""Tests for story context message selection (LangChain plan / todo 4)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from utils.story_context_selection import (
    select_messages_for_ai_context,
    select_messages_for_ai_context_with_trace,
)


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


def test_with_trace_contains_required_fields():
    all_msgs = [{"role": "user", "content": f"line-{i}"} for i in range(10)]
    sel, _truncated, _older, trace = select_messages_for_ai_context_with_trace(
        all_msgs,
        summary_text="summary",
        summary_version="v1",
        estimated_system_tokens=120,
        estimate_tokens=lambda s: len(s),
        recent_messages_with_summary=4,
        max_message_history=100,
        max_context_tokens=3000,
    )
    assert len(sel) == 4
    assert "selectedSources" in trace
    assert "droppedSources" in trace
    assert "budgetUsed" in trace
    assert "trimReasons" in trace
    assert "summaryVersion" in trace
    assert trace["summaryVersion"] == "v1"


def test_with_trace_includes_strategy_snapshot_and_budget_ratio():
    all_msgs = [{"role": "user", "content": f"line-{i}"} for i in range(30)]
    _sel, _truncated, _older, trace = select_messages_for_ai_context_with_trace(
        all_msgs,
        summary_text=None,
        summary_version="v2",
        estimated_system_tokens=100,
        estimate_tokens=lambda s: len(s),
        recent_messages_with_summary=6,
        max_message_history=40,
        max_context_tokens=10000,
        effective_budget_ratio=0.6,
        recent_budget_ratio=0.5,
        summary_budget_ratio=0.2,
    )
    strategy = trace.get("strategy") or {}
    assert strategy.get("recentMessagesWithSummary") == 6
    assert strategy.get("maxMessageHistory") == 40
    assert strategy.get("maxContextTokens") == 10000
    assert strategy.get("effectiveBudgetRatio") == 0.6
    assert trace["budgetUsed"]["totalBudget"] == 6000

