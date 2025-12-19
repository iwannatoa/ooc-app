"""
Unit tests for ConversationRepository
"""
import pytest
import json
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from repository.conversation_repository import ConversationRepository
from model.conversation_settings import ConversationSettings


class TestConversationRepository:
    """Test ConversationRepository"""
    
    def test_create_settings(self, temp_db):
        """Test creating conversation settings"""
        repo = ConversationRepository(temp_db)
        
        settings = repo.create_or_update_settings(
            conversation_id='test_conv_001',
            title='Test Story',
            background='A test background',
            characters=['Alice', 'Bob'],
            character_personality={'Alice': 'Brave', 'Bob': 'Kind'},
            outline='Test outline'
        )
        
        assert settings.id is not None
        assert settings.conversation_id == 'test_conv_001'
        assert settings.title == 'Test Story'
        assert settings.background == 'A test background'
    
    def test_get_settings(self, temp_db):
        """Test getting conversation settings"""
        repo = ConversationRepository(temp_db)
        
        # Create settings
        created = repo.create_or_update_settings(
            conversation_id='test_conv_002',
            title='Test Story 2',
            background='Background 2'
        )
        
        # Get settings
        retrieved = repo.get_settings('test_conv_002')
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.title == 'Test Story 2'
    
    def test_update_settings(self, temp_db):
        """Test updating existing settings"""
        repo = ConversationRepository(temp_db)
        
        # Create initial settings
        repo.create_or_update_settings(
            conversation_id='test_conv_003',
            title='Original Title',
            background='Original Background'
        )
        
        # Update settings
        updated = repo.create_or_update_settings(
            conversation_id='test_conv_003',
            title='Updated Title',
            background='Updated Background'
        )
        
        assert updated.title == 'Updated Title'
        assert updated.background == 'Updated Background'
    
    def test_characters_serialization(self, temp_db):
        """Test that characters are properly serialized/deserialized"""
        repo = ConversationRepository(temp_db)
        
        characters = ['Alice', 'Bob', 'Charlie']
        personality = {'Alice': 'Brave', 'Bob': 'Kind'}
        
        settings = repo.create_or_update_settings(
            conversation_id='test_conv_004',
            characters=characters,
            character_personality=personality
        )
        
        # Get and verify
        retrieved = repo.get_settings('test_conv_004')
        settings_dict = retrieved.to_dict()
        
        assert settings_dict['characters'] == characters
        assert settings_dict['character_personality'] == personality

