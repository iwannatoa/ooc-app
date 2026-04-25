"""Shared session context for repositories (single commit vs outer transaction)."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy.orm import Session, sessionmaker


@contextmanager
def repository_session(
    session_factory: sessionmaker[Session],
    outer: Optional[Session] = None,
) -> Generator[Session, None, None]:
    """
    If ``outer`` is provided, yield it (caller owns commit/rollback/close).

    Otherwise open a new session, commit on success, rollback on error, always close.
    """
    if outer is not None:
        yield outer
        return
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
