"""Tests for utils.think_strip (table-driven)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from utils.think_strip import strip_think_content


@pytest.mark.parametrize(
    "raw,expected",
    [
        (
            "Hello <think>secret</think> world",
            "Hello  world",
        ),
        ("A\n```think\nline1\nline2\n```\nB", "A\n\nB"),
        ("x<thinking>y</thinking>z", "xz"),
        ("<reasoning>r</reasoning>tail", "tail"),
        ("A<think>inner</think>B", "AB"),
        ("```thinking\nx\n```y", "y"),
    ],
)
def test_strip_think_content_table(raw, expected):
    out = strip_think_content(raw)
    assert out == expected

