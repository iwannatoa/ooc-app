"""
Pytest configuration and fixtures
"""
import pytest
import tempfile
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from injector import Injector

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from di.module import AppModule
from model.character_record import Base as CharacterBase
from model.chat_record import Base as ChatBase
from model.conversation_settings import Base as ConversationBase
from model.app_settings import Base as AppSettingsBase
from model.story_progress import Base as StoryProgressBase
from model.conversation_summary import Base as SummaryBase
from model.ai_config import Base as AIConfigBase


def _create_tables_safe(engine, base):
    """Create tables with error handling for index already exists"""
    try:
        base.metadata.create_all(engine, checkfirst=True)
    except OperationalError as e:
        error_str = str(e).lower()
        if "index" in error_str and "already exists" in error_str:
            pass
        else:
            raise


@pytest.fixture
def temp_db():
    """Create a temporary database for testing"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    engine = create_engine(f'sqlite:///{path}', connect_args={'check_same_thread': False})
    
    # Create all tables with error handling
    _create_tables_safe(engine, CharacterBase)
    _create_tables_safe(engine, ChatBase)
    _create_tables_safe(engine, ConversationBase)
    _create_tables_safe(engine, AppSettingsBase)
    _create_tables_safe(engine, StoryProgressBase)
    _create_tables_safe(engine, SummaryBase)
    _create_tables_safe(engine, AIConfigBase)
    
    yield path
    
    # Cleanup - close all connections first
    try:
        engine.dispose()
        # Small delay to allow file handles to release on Windows
        import time
        time.sleep(0.1)
    except Exception:
        pass
    
    # Try to remove the file, but ignore errors on Windows
    try:
        os.unlink(path)
    except (PermissionError, OSError):
        # On Windows, file may still be locked - this is okay for tests
        pass


@pytest.fixture
def injector(temp_db):
    """Create an injector with test database"""
    # Override database path in environment
    os.environ['DB_PATH'] = temp_db
    
    injector = Injector([AppModule()])
    yield injector
    
    # Cleanup
    if 'DB_PATH' in os.environ:
        del os.environ['DB_PATH']


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

