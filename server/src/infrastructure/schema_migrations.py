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
SCHEMA_USER_VERSION: int = 4


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
    (3, lambda engine: apply_phase_a_contract_migrations(engine)),
    (4, lambda engine: apply_chat_attachment_migrations(engine)),
]


def apply_phase_a_contract_migrations(engine: Engine) -> None:
    """Phase A contract migration: chat record metadata + branching/support tables."""
    insp = inspect(engine)
    if not insp.has_table("chat_records"):
        return

    cols = {c["name"] for c in insp.get_columns("chat_records")}
    with engine.begin() as conn:
        if "content_type" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE chat_records ADD COLUMN content_type TEXT DEFAULT 'text' "
                    "NOT NULL"
                )
            )
        if "attachment_ref" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN attachment_ref TEXT")
            )
        if "branch_id" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN branch_id TEXT")
            )
        if "savepoint_id" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN savepoint_id TEXT")
            )
        if "ending_tag" not in cols:
            conn.execute(
                text("ALTER TABLE chat_records ADD COLUMN ending_tag TEXT")
            )

        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS story_branches ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "conversation_id TEXT NOT NULL,"
                "branch_id TEXT NOT NULL,"
                "parent_message_id INTEGER,"
                "label TEXT,"
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS story_savepoints ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "conversation_id TEXT NOT NULL,"
                "savepoint_id TEXT NOT NULL,"
                "message_id INTEGER,"
                "label TEXT,"
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS story_endings ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "conversation_id TEXT NOT NULL,"
                "branch_id TEXT,"
                "ending_tag TEXT NOT NULL,"
                "message_id INTEGER,"
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS media_assets ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "conversation_id TEXT NOT NULL,"
                "asset_ref TEXT NOT NULL,"
                "filename TEXT,"
                "mime_type TEXT,"
                "size_bytes INTEGER,"
                "storage_path TEXT,"
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_chat_records_branch_id "
                "ON chat_records (branch_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_story_branches_conv "
                "ON story_branches (conversation_id, branch_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_story_savepoints_conv "
                "ON story_savepoints (conversation_id, savepoint_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_story_endings_conv "
                "ON story_endings (conversation_id, ending_tag)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_media_assets_conv "
                "ON media_assets (conversation_id, asset_ref)"
            )
        )

    logger.info("Phase A contract migrations checked")


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


def apply_chat_attachment_migrations(engine: Engine) -> None:
    """Add chat_attachments table and indexes."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS chat_attachments ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "conversation_id TEXT NOT NULL,"
                "message_id INTEGER,"
                "profile_id TEXT NOT NULL DEFAULT 'default',"
                "asset_ref TEXT NOT NULL UNIQUE,"
                "filename TEXT NOT NULL,"
                "mime_type TEXT NOT NULL,"
                "size_bytes INTEGER NOT NULL DEFAULT 0,"
                "storage_path TEXT NOT NULL,"
                "status TEXT NOT NULL DEFAULT 'uploaded',"
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_chat_attachments_conv_msg_created "
                "ON chat_attachments (conversation_id, message_id, created_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_chat_attachments_asset_ref "
                "ON chat_attachments (asset_ref)"
            )
        )
