"""
Unit tests for CharacterRecordRepository
"""
import pytest
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from repository.character_record_repository import CharacterRecordRepository
from model.character_record import CharacterRecord


class TestCharacterRecordRepository:
    """Test CharacterRecordRepository"""
    
    def test_create_character(self, temp_db, sample_conversation_id):
        """Test creating a character record"""
        repo = CharacterRecordRepository(temp_db)
        
        character = repo.create_character(
            conversation_id=sample_conversation_id,
            name='Alice',
            is_main=True,
            is_auto_generated=False
        )
        
        assert character.id is not None
        assert character.name == 'Alice'
        assert character.conversation_id == sample_conversation_id
        assert character.is_main is True
        assert character.is_auto_generated is False
    
    def test_get_character(self, temp_db, sample_conversation_id):
        """Test getting a character by name"""
        repo = CharacterRecordRepository(temp_db)
        
        # Create a character
        created = repo.create_character(
            conversation_id=sample_conversation_id,
            name='Bob',
            is_main=False
        )
        
        # Get the character
        retrieved = repo.get_character(sample_conversation_id, 'Bob')
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.name == 'Bob'
    
    def test_get_characters_by_conversation(self, temp_db, sample_conversation_id):
        """Test getting all characters for a conversation"""
        repo = CharacterRecordRepository(temp_db)
        
        # Create multiple characters
        repo.create_character(
            conversation_id=sample_conversation_id,
            name='Alice',
            is_main=True
        )
        repo.create_character(
            conversation_id=sample_conversation_id,
            name='Bob',
            is_main=False
        )
        repo.create_character(
            conversation_id=sample_conversation_id,
            name='Charlie',
            is_unavailable=True
        )
        
        # Get all characters
        all_chars = repo.get_characters_by_conversation(sample_conversation_id, include_unavailable=True)
        assert len(all_chars) == 3
        
        # Get only available characters
        available_chars = repo.get_characters_by_conversation(sample_conversation_id, include_unavailable=False)
        assert len(available_chars) == 2
        assert all(not char.is_unavailable for char in available_chars)
    
    def test_update_character(self, temp_db, sample_conversation_id):
        """Test updating a character"""
        repo = CharacterRecordRepository(temp_db)
        
        # Create a character
        character = repo.create_character(
            conversation_id=sample_conversation_id,
            name='David',
            is_main=False,
            is_unavailable=False
        )
        
        # Update the character
        updated = repo.update_character(
            conversation_id=sample_conversation_id,
            name='David',
            is_main=True,
            is_unavailable=True,
            notes='Updated character'
        )
        
        assert updated is not None
        assert updated.is_main is True
        assert updated.is_unavailable is True
        assert updated.notes == 'Updated character'
    
    def test_delete_characters_by_message_id(self, temp_db, sample_conversation_id):
        """Test deleting characters by message ID"""
        repo = CharacterRecordRepository(temp_db)
        
        # Create characters with message IDs
        char1 = repo.create_character(
            conversation_id=sample_conversation_id,
            name='Eve',
            first_appeared_message_id=1
        )
        char2 = repo.create_character(
            conversation_id=sample_conversation_id,
            name='Frank',
            first_appeared_message_id=2
        )
        
        # Delete characters by message ID
        deleted_count = repo.delete_characters_by_message_id(1)
        assert deleted_count == 1
        
        # Verify the character is deleted
        retrieved = repo.get_character(sample_conversation_id, 'Eve')
        assert retrieved is None
        
        # Verify other character still exists
        retrieved2 = repo.get_character(sample_conversation_id, 'Frank')
        assert retrieved2 is not None

