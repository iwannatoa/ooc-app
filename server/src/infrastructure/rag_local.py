"""
Local RAG placeholder (no cloud): future embedding + vector store hooks.

Callers should use only user-configured endpoints or fully offline models.
"""
from __future__ import annotations

from typing import List


def chunk_text(text: str, max_chars: int = 800) -> List[str]:
    """Deterministic naive chunking for future local indexing tests."""
    text = (text or "").strip()
    if not text:
        return []
    return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]


def rag_status() -> dict:
    """Report capability flags without performing network I/O."""
    return {"enabled": False, "vector_backend": "none", "notes": "placeholder"}
