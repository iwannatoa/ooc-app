"""
SQLite schema upgrades tracked with ``PRAGMA user_version``.

Bump ``SCHEMA_USER_VERSION`` and append a ``(version, callable)`` entry when adding a
new one-way migration. Each ``callable(engine)`` must be safe to re-run if the step is
re-executed after a partial failure (prefer IF NOT EXISTS / defensive checks).

Older databases default to user_version 0; new installs run steps until ``SCHEMA_USER_VERSION``.
If the file's user_version exceeds the app's ``SCHEMA_USER_VERSION``, the app does not downgrade.
"""
from __future__ import annotations

from typing import Callable, List, Optional, Tuple

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from utils.logger import get_logger

logger = get_logger(__name__)

# Application code: increment when you add a new tuple to SCHEMA_MIGRATIONS.
SCHEMA_USER_VERSION: int = 2


def get_schema_user_version(engine: Engine) -> int:
    """Read SQLite ``PRAGMA user_version`` (integer stored in the db file header)."""
    with engine.connect() as conn:
        row = conn.execute(text("PRAGMA user_version")).fetchone()
        if row is None or row[0] is None:
            return 0
        return int(row[0])


def set_schema_user_version(engine: Engine, version: int) -> None:
    """Persist schema migration level (must commit via engine.begin)."""
    v = int(version)
    with engine.begin() as conn:
        conn.exec_driver_sql(f"PRAGMA user_version = {v}")


def apply_legacy_sqlite_index_migrations(engine: Engine) -> None:
    """
    Migration step 1: repair chat.db where ``chat_records`` and ``conversation_summaries``
    reused the global index name ``idx_conversation_created``. Idempotent.
    """
    insp = inspect(engine)
    if not insp.has_table("chat_records"):
        return

    with engine.begin() as conn:
        conn.execute(text("DROP INDEX IF EXISTS idx_conversation_created"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_chat_records_conv_created "
                "ON chat_records (conversation_id, created_at)"
            )
        )
        if insp.has_table("conversation_summaries"):
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conv_created "
                    "ON conversation_summaries (conversation_id, created_at)"
                )
            )
    logger.info("Legacy SQLite index migration checked (chat / conversation_summaries)")


def apply_chat_record_lineage_columns(engine: Engine) -> None:
    """Add optional lineage columns for rewrite / branch UX (nullable, idempotent)."""
    insp = inspect(engine)
    if not insp.has_table("chat_records"):
        return
    cols = {c["name"] for c in insp.get_columns("chat_records")}
    with engine.begin() as conn:
        if "parent_message_id" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN parent_message_id INTEGER")
            )
        if "variant_group_id" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN variant_group_id TEXT")
            )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_chat_records_variant_group "
                "ON chat_records (variant_group_id)"
            )
        )
    logger.info("Chat record lineage columns migration checked")


# Ordered by version; each version runs at most once per DB file.
SCHEMA_MIGRATIONS: List[Tuple[int, Callable[[Engine], None]]] = [
    (1, apply_legacy_sqlite_index_migrations),
    (2, apply_chat_record_lineage_columns),
]


def apply_schema_migrations(engine: Optional[Engine] = None) -> None:
    """
    Run pending migrations from ``PRAGMA user_version`` up to ``SCHEMA_USER_VERSION``.
    Pass ``engine`` or rely on ``database.get_engine()`` after ``init_engine``.
    """
    if engine is None:
        from infrastructure.database import get_engine

        engine = get_engine()

    current = get_schema_user_version(engine)
    if current > SCHEMA_USER_VERSION:
        logger.warning(
            "Database PRAGMA user_version (%s) is greater than application "
            "SCHEMA_USER_VERSION (%s); skipping schema migrations (use a newer app).",
            current,
            SCHEMA_USER_VERSION,
        )
        return

    for target_ver, migrate_fn in SCHEMA_MIGRATIONS:
        if current < target_ver:
            logger.info("Applying schema migration step %s", target_ver)
            migrate_fn(engine)
            set_schema_user_version(engine, target_ver)
            current = target_ver
