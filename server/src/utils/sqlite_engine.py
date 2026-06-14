"""
Shared SQLite engine factory for app repositories.
Unifies connect_args, pool options, and PRAGMA settings (WAL, etc.).
"""
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


def create_app_sqlite_engine(db_path: str) -> Engine:
    """
    Create a SQLAlchemy Engine for app SQLite databases with consistent settings.

    Args:
        db_path: Absolute or relative path to the SQLite database file.

    Returns:
        Configured SQLAlchemy Engine (tables not created here).
    """
    engine = create_engine(
        f'sqlite:///{db_path}',
        echo=False,
        connect_args={
            'check_same_thread': False,
            'timeout': 20.0,
        },
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    with engine.connect() as conn:
        conn.execute(text('PRAGMA journal_mode=WAL'))
        conn.execute(text('PRAGMA synchronous=NORMAL'))
        conn.execute(text('PRAGMA cache_size=-64000'))
        conn.execute(text('PRAGMA temp_store=MEMORY'))
        conn.commit()
    return engine
