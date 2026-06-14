"""Startup migration: legacy idx_conversation_created shared name on SQLite."""
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from infrastructure.database import get_engine
from infrastructure.schema_migrations import (
    SCHEMA_USER_VERSION,
    apply_legacy_sqlite_index_migrations,
    apply_schema_migrations,
    get_schema_user_version,
    set_schema_user_version,
)


def _index_names():
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='index' "
                "AND name IN ("
                "'idx_conversation_created', "
                "'idx_chat_records_conv_created', "
                "'idx_conversation_summaries_conv_created'"
                ")"
            )
        ).fetchall()
    return {r[0] for r in rows}


def test_legacy_migration_removes_shared_name_and_restores_indexes(injector):
    eng = get_engine()
    with eng.begin() as conn:
        conn.execute(text("DROP INDEX IF EXISTS idx_chat_records_conv_created"))
        conn.execute(text("DROP INDEX IF EXISTS idx_conversation_summaries_conv_created"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_conversation_created "
                "ON chat_records (conversation_id, created_at)"
            )
        )

    assert "idx_conversation_created" in _index_names()
    assert "idx_chat_records_conv_created" not in _index_names()

    set_schema_user_version(eng, 0)
    apply_schema_migrations(eng)

    names = _index_names()
    assert "idx_conversation_created" not in names
    assert "idx_chat_records_conv_created" in names
    assert "idx_conversation_summaries_conv_created" in names


def test_legacy_migration_idempotent(injector):
    apply_schema_migrations(get_engine())
    apply_schema_migrations(get_engine())
    names = _index_names()
    assert "idx_chat_records_conv_created" in names
    assert "idx_conversation_summaries_conv_created" in names
    assert get_schema_user_version(get_engine()) == SCHEMA_USER_VERSION


def test_fresh_db_schema_user_version_after_init(injector):
    assert get_schema_user_version(get_engine()) == SCHEMA_USER_VERSION

