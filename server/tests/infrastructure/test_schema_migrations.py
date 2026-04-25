"""PRAGMA user_version schema migration runner."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from infrastructure.database import get_engine
from infrastructure.schema_migrations import (
    SCHEMA_USER_VERSION,
    apply_schema_migrations,
    get_schema_user_version,
    set_schema_user_version,
)


def test_apply_schema_migrations_leaves_newer_db_unchanged(injector):
    eng = get_engine()
    set_schema_user_version(eng, SCHEMA_USER_VERSION + 50)
    apply_schema_migrations(eng)
    assert get_schema_user_version(eng) == SCHEMA_USER_VERSION + 50

