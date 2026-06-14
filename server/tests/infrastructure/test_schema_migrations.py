"""PRAGMA user_version schema migration runner."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from infrastructure.database import get_engine
from infrastructure.schema_migrations import (
    SCHEMA_USER_VERSION,
    apply_schema_migrations,
    get_schema_user_version,
    plan_schema_migrations,
    set_schema_user_version,
)


def test_apply_schema_migrations_leaves_newer_db_unchanged(injector):
    eng = get_engine()
    set_schema_user_version(eng, SCHEMA_USER_VERSION + 50)
    apply_schema_migrations(eng)
    assert get_schema_user_version(eng) == SCHEMA_USER_VERSION + 50


def test_migration_rollback_strategy_is_no_pragma_downgrade(injector):
    """Rollback strategy is backup restore / skip-lowering user_version; never PRAGMA down."""
    eng = get_engine()
    set_schema_user_version(eng, 0)
    plan = plan_schema_migrations(eng)
    assert plan == list(range(1, SCHEMA_USER_VERSION + 1))

    apply_schema_migrations(eng, dry_run=True)
    assert get_schema_user_version(eng) == 0

    set_schema_user_version(eng, SCHEMA_USER_VERSION)
    apply_schema_migrations(eng, target_version=SCHEMA_USER_VERSION - 1)
    assert get_schema_user_version(eng) == SCHEMA_USER_VERSION

