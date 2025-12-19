"""
Unit tests for CharacterService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.character_service import CharacterService
from repository.character_record_repository import CharacterRecordRepository
from repository.chat_repository import ChatRepository
from model.character_record import CharacterRecord


class TestCharacterService:
    """Test CharacterService"""
    
    @pytest.fixture
    def mock_repo(self):
        """Mock character repository"""
        return Mock(spec=CharacterRecordRepository)
    
    @pytest.fixture
    def mock_chat_repo(self):
        """Mock chat repository"""
        return Mock(spec=ChatRepository)
    
    @pytest.fixture
    def service(self, mock_repo, mock_chat_repo):
        """Create CharacterService instance"""
        return CharacterService(mock_repo, mock_chat_repo)
    
    def test_extract_characters_from_text(self, service):
        """Test extracting characters from text"""
        text = "Alice met Bob in the forest. Charlie was also there."
        existing = set()
        
        characters = service.extract_characters_from_text(text, existing)
        
        assert len(characters) > 0
        assert 'Alice' in characters or 'Bob' in characters or 'Charlie' in characters
    
    def test_extract_characters_skips_existing(self, service):
        """Test that extraction skips existing characters"""
        text = "Alice met Bob. Alice was happy."
        existing = {'Alice'}
        
        characters = service.extract_characters_from_text(text, existing)
        
        assert 'Alice' not in characters
    
    def test_record_characters_from_message_predefined(self, service, mock_repo, sample_conversation_id):
        """Test recording predefined characters"""
        content = "Alice and Bob went on an adventure."
        predefined = ['Alice', 'Bob']
        
        # Mock repository methods
        mock_repo.get_characters_by_conversation.return_value = []
        
        def create_char_side_effect(*args, **kwargs):
            char = Mock(spec=CharacterRecord)
            char.name = kwargs.get('name')
            char.to_dict.return_value = {'name': char.name, 'id': 1}
            return char
        
        mock_repo.create_character.side_effect = create_char_side_effect
        
        result = service.record_characters_from_message(
            conversation_id=sample_conversation_id,
            message_id=1,
            content=content,
            predefined_characters=predefined,
            allow_auto_generate=False
        )
        
        assert len(result) == 2
        assert mock_repo.create_character.call_count == 2
    
    def test_record_characters_auto_generate(self, service, mock_repo, sample_conversation_id):
        """Test auto-generating characters"""
        content = "Eve and Frank appeared suddenly."
        predefined = []
        
        # Mock repository
        mock_repo.get_characters_by_conversation.return_value = []
        
        def create_char_side_effect(*args, **kwargs):
            char = Mock(spec=CharacterRecord)
            char.name = kwargs.get('name')
            char.to_dict.return_value = {'name': char.name, 'id': 1}
            return char
        
        mock_repo.create_character.side_effect = create_char_side_effect
        
        result = service.record_characters_from_message(
            conversation_id=sample_conversation_id,
            message_id=1,
            content=content,
            predefined_characters=predefined,
            allow_auto_generate=True
        )
        
        # Should create auto-generated characters
        assert len(result) > 0
    
    def test_get_characters(self, service, mock_repo, sample_conversation_id):
        """Test getting characters"""
        # Mock repository response
        char1 = Mock(spec=CharacterRecord)
        char1.to_dict.return_value = {'name': 'Alice', 'id': 1}
        char2 = Mock(spec=CharacterRecord)
        char2.to_dict.return_value = {'name': 'Bob', 'id': 2}
        
        mock_repo.get_characters_by_conversation.return_value = [char1, char2]
        
        result = service.get_characters(sample_conversation_id, include_unavailable=True)
        
        assert len(result) == 2
        assert result[0]['name'] == 'Alice'
        assert result[1]['name'] == 'Bob'
        mock_repo.get_characters_by_conversation.assert_called_once_with(
            conversation_id=sample_conversation_id,
            include_unavailable=True
        )
    
    def test_update_character(self, service, mock_repo, sample_conversation_id):
        """Test updating a character"""
        # Mock repository
        char = Mock(spec=CharacterRecord)
        char.id = 1
        char.to_dict.return_value = {'name': 'Alice', 'id': 1, 'is_main': True}
        
        mock_repo.get_character.return_value = char
        mock_repo.update_character.return_value = char
        
        result = service.update_character(
            conversation_id=sample_conversation_id,
            name='Alice',
            is_main=True
        )
        
        assert result is not None
        assert result['name'] == 'Alice'
        # Verify update_character was called
        mock_repo.update_character.assert_called_once_with(
            conversation_id=sample_conversation_id,
            name='Alice',
            is_main=True,
            is_unavailable=None,
            notes=None
        )

