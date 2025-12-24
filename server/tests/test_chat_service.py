"""
Unit tests for ChatService
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from service.chat_service import ChatService
from repository.chat_repository import ChatRepository
from model.chat_record import ChatRecord


class TestChatService:
    """Test ChatService"""
    
    @pytest.fixture
    def mock_repo(self):
        """Mock chat repository"""
        return Mock(spec=ChatRepository)
    
    @pytest.fixture
    def service(self, mock_repo):
        """Create ChatService instance"""
        return ChatService(mock_repo)
    
    def test_save_user_message(self, service, mock_repo):
        """Test saving user message"""
        mock_record = Mock(spec=ChatRecord)
        mock_record.to_dict.return_value = {
            'id': 1,
            'role': 'user',
            'content': 'Test message'
        }
        mock_repo.save_message.return_value = mock_record
        
        result = service.save_user_message('test_conv_001', 'Test message')
        
        assert result['role'] == 'user'
        assert result['content'] == 'Test message'
        mock_repo.save_message.assert_called_once_with(
            conversation_id='test_conv_001',
            role='user',
            content='Test message'
        )
    
    def test_save_assistant_message(self, service, mock_repo):
        """Test saving assistant message"""
        mock_record = Mock(spec=ChatRecord)
        mock_record.to_dict.return_value = {
            'id': 2,
            'role': 'assistant',
            'content': 'AI response',
            'model': 'deepseek-chat'
        }
        mock_repo.save_message.return_value = mock_record
        
        result = service.save_assistant_message(
            'test_conv_001',
            'AI response',
            model='deepseek-chat',
            provider='deepseek'
        )
        
        assert result['role'] == 'assistant'
        assert result['content'] == 'AI response'
        mock_repo.save_message.assert_called_once()
    
    def test_get_conversation(self, service, mock_repo):
        """Test getting conversation messages"""
        mock_records = [
            Mock(spec=ChatRecord),
            Mock(spec=ChatRecord),
        ]
        mock_records[0].to_dict.return_value = {
            'id': 1,
            'role': 'user',
            'content': 'Message 1'
        }
        mock_records[1].to_dict.return_value = {
            'id': 2,
            'role': 'assistant',
            'content': 'Response 1'
        }
        mock_repo.get_conversation_messages.return_value = mock_records
        
        result = service.get_conversation('test_conv_001')
        
        assert len(result) == 2
        assert result[0]['role'] == 'user'
        assert result[1]['role'] == 'assistant'
    
    def test_delete_last_message(self, service, mock_repo):
        """Test deleting last message"""
        mock_repo.delete_last_message.return_value = 1
        
        result = service.delete_last_message('test_conv_001')
        
        assert result == 1
        mock_repo.delete_last_message.assert_called_once_with('test_conv_001')

