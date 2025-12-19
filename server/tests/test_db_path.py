"""
Unit tests for db_path utility
"""
import pytest
import os
import sys
import tempfile
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from utils.db_path import get_database_path, get_app_data_dir


class TestDbPath:
    """Test database path utilities"""
    
    def test_get_database_path_with_env(self, monkeypatch):
        """Test getting database path from environment variable"""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            test_path = f.name
        
        try:
            monkeypatch.setenv('DB_PATH', test_path)
            result = get_database_path()
            assert result == test_path
        finally:
            os.unlink(test_path)
    
    def test_get_database_path_default(self, monkeypatch):
        """Test getting default database path"""
        if 'DB_PATH' in os.environ:
            monkeypatch.delenv('DB_PATH')
        
        result = get_database_path()
        assert result is not None
        assert result.endswith('.db')
    
    def test_get_app_data_dir_with_env(self, monkeypatch):
        """Test getting app data dir from environment variable"""
        test_dir = '/test/app/data'
        test_db = '/test/app/data/chat.db'
        monkeypatch.setenv('DB_PATH', test_db)
        
        result = get_app_data_dir()
        assert str(result) == test_dir or result == Path(test_dir)
    
    def test_get_app_data_dir_default(self, monkeypatch):
        """Test getting default app data dir"""
        if 'DB_PATH' in os.environ:
            monkeypatch.delenv('DB_PATH')
        
        result = get_app_data_dir()
        assert result is not None
        assert isinstance(result, Path) or isinstance(result, str)

