"""
Process-wide single SQLite Engine and session factory.

Threat model: one chat.db per process; repositories share one pool and can participate
in the same SQLAlchemy session/transaction when passed an explicit Session.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Callable, Generator, Optional, TypeVar

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from model.base import Base
from utils.logger import get_logger

logger = get_logger(__name__)

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker[Session]] = None

T = TypeVar('T')


def reset_database_runtime() -> None:
    """Dispose engine and clear singletons (tests / path change)."""
    global _engine, _SessionLocal
    if _engine is not None:
        try:
            _engine.dispose()
        except Exception:
            pass
    _engine = None
    _SessionLocal = None


def init_engine(db_path: str) -> Engine:
    """
    Lazily create the single Engine and sessionmaker for db_path.

    If already initialized, returns existing engine (ignores path change in same process).
    """
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine
    from utils.sqlite_engine import create_app_sqlite_engine

    _engine = create_app_sqlite_engine(db_path)
    _SessionLocal = sessionmaker(
        bind=_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    logger.info("SQLite engine initialized (single instance)")
    return _engine


def ensure_engine(db_path: str) -> Engine:
    """Idempotent: init engine if needed."""
    return init_engine(db_path)


def create_schema(engine: Optional[Engine] = None) -> None:
    """Create all tables from unified metadata (checkfirst)."""
    eng = engine or _engine
    if eng is None:
        raise RuntimeError("create_schema: engine not initialized")
    Base.metadata.create_all(eng, checkfirst=True)


def get_sessionmaker() -> sessionmaker[Session]:
    if _SessionLocal is None:
        raise RuntimeError("Session factory not initialized; call init_engine(db_path) first")
    return _SessionLocal


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Engine not initialized; call init_engine(db_path) first")
    return _engine


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Short-lived session with commit/rollback/close."""
    factory = get_sessionmaker()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def unit_of_work() -> Generator[Session, None, None]:
    """
    One transaction boundary for multi-repository writes.

    Repositories that receive ``session`` must not commit/close it; callers commit here.
    """
    factory = get_sessionmaker()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def run_in_transaction(fn: Callable[[Session], T]) -> T:
    """Helper: run callable with one session and commit."""
    with unit_of_work() as session:
        return fn(session)
