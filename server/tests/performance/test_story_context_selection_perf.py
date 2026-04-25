"""Baseline: message selection for AI context stays fast on large in-memory histories."""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from utils.story_context_selection import select_messages_for_ai_context


def _estimate_tokens(s: str) -> int:
    return max(1, len(s) // 4)


def test_select_messages_large_history_completes_under_one_second():
    messages = [
        {"role": "assistant" if i % 2 == 0 else "user", "content": "word " * 80}
        for i in range(8000)
    ]
    t0 = time.perf_counter()
    selected, truncated, _older = select_messages_for_ai_context(
        messages,
        summary_text=None,
        estimated_system_tokens=2000,
        estimate_tokens=_estimate_tokens,
        recent_messages_with_summary=15,
        max_message_history=100,
        max_context_tokens=60_000,
    )
    elapsed = time.perf_counter() - t0
    assert elapsed < 1.0, f"selection took {elapsed:.3f}s"
    assert len(selected) <= 100
    assert truncated is True

