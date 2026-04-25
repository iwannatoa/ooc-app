import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from infrastructure.rag_local import chunk_text, rag_status


def test_chunk_text_splits():
    assert chunk_text("abcdef", max_chars=2) == ["ab", "cd", "ef"]


def test_rag_status_placeholder():
    s = rag_status()
    assert s["enabled"] is False

