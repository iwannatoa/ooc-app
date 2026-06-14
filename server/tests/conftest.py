"""
Pytest configuration and fixtures
"""
import os
import sys
import tempfile
import time
from pathlib import Path

import pytest
from injector import Injector

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from di.module import AppModule
from infrastructure.database import create_schema, get_engine, init_engine, reset_database_runtime
from infrastructure.schema_migrations import apply_schema_migrations
from repository.character_record_repository import apply_character_record_migrations
from repository.conversation_repository import apply_conversation_settings_migrations


def pytest_configure(config):
    """Stable test env for config class selection (get_config reads FLASK_ENV)."""
    os.environ.setdefault('FLASK_ENV', 'testing')


@pytest.fixture
def temp_db():
    """Temporary DB with single Engine + unified schema (matches production startup)."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)

    prev_db = os.environ.get('DB_PATH')
    os.environ['DB_PATH'] = path

    reset_database_runtime()
    init_engine(path)
    create_schema()
    apply_schema_migrations(get_engine())
    apply_conversation_settings_migrations(get_engine())
    apply_character_record_migrations(get_engine())

    yield path

    reset_database_runtime()
    if prev_db is not None:
        os.environ['DB_PATH'] = prev_db
    else:
        os.environ.pop('DB_PATH', None)

    try:
        time.sleep(0.05)
        os.unlink(path)
    except (PermissionError, OSError):
        pass


@pytest.fixture
def injector(temp_db):
    """Injector bound to the same session factory as temp_db."""
    return Injector([AppModule()])


@pytest.fixture
def mock_ai_response():
    """Mock AI service response"""
    return {
        'success': True,
        'response': 'Test AI response',
        'model': 'test-model',
        'usage': {
            'prompt_tokens': 10,
            'completion_tokens': 20,
            'total_tokens': 30
        }
    }


@pytest.fixture
def sample_conversation_id():
    """Sample conversation ID for testing"""
    return 'test_conv_001'


@pytest.fixture
def sample_character_data():
    """Sample character data for testing"""
    return {
        'name': 'TestCharacter',
        'is_main': True,
        'is_unavailable': False,
        'is_auto_generated': False,
        'notes': 'Test character'
    }
