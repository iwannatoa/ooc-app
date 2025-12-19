"""
Character service layer
"""
import re
from typing import List, Optional, Dict, Set
from repository.character_record_repository import CharacterRecordRepository
from repository.chat_repository import ChatRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class CharacterService:
    """Character service"""
    
    def __init__(
        self,
        character_repository: CharacterRecordRepository,
        chat_repository: ChatRepository
    ):
        """
        Initialize service
        
        Args:
            character_repository: Character record repository instance
            chat_repository: Chat repository instance
        """
        self.repository = character_repository
        self.chat_repository = chat_repository
    
    def extract_characters_from_text(self, text: str, existing_characters: Set[str]) -> List[str]:
        """
        Extract character names from text
        This is a simple implementation that looks for common name patterns
        In production, you might want to use NLP libraries for better accuracy
        
        Args:
            text: Text to extract characters from
            existing_characters: Set of existing character names to avoid duplicates
        
        Returns:
            List of extracted character names
        """
        characters = []
        existing_lower = {name.lower() for name in existing_characters}
        
        # Simple pattern: look for names (capitalized words, possibly with common name particles)
        # This is a basic implementation - could be improved with NLP
        patterns = [
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized names
        ]
        
        found_names = set()
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                name = match.strip()
                # Skip if too short, contains common words, or already exists
                if (len(name) >= 2 and 
                    name.lower() not in ['the', 'this', 'that', 'they', 'them', 'their', 'there'] and
                    name.lower() not in existing_lower and
                    name not in found_names):
                    found_names.add(name)
                    characters.append(name)
        
        return characters
    
    def record_characters_from_message(
        self,
        conversation_id: str,
        message_id: int,
        content: str,
        predefined_characters: List[str],
        allow_auto_generate: bool = True
    ) -> List[Dict]:
        """
        Record characters that appear in a message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID
            content: Message content
            predefined_characters: List of predefined character names (from settings)
            allow_auto_generate: Whether to allow auto-generating new characters
        
        Returns:
            List of created/updated character records
        """
        existing_characters = self.repository.get_characters_by_conversation(conversation_id)
        existing_names = {char.name for char in existing_characters}
        
        recorded = []
        
        # Record predefined characters if they appear and aren't recorded yet
        for char_name in predefined_characters:
            if char_name not in existing_names and char_name.lower() in content.lower():
                character = self.repository.create_character(
                    conversation_id=conversation_id,
                    name=char_name,
                    first_appeared_message_id=message_id,
                    is_main=True,  # Predefined characters are considered main
                    is_auto_generated=False
                )
                recorded.append(character.to_dict())
                existing_names.add(char_name)
        
        # Auto-generate new characters if allowed
        if allow_auto_generate:
            extracted = self.extract_characters_from_text(content, existing_names)
            for char_name in extracted:
                if char_name not in existing_names:
                    character = self.repository.create_character(
                        conversation_id=conversation_id,
                        name=char_name,
                        first_appeared_message_id=message_id,
                        is_main=False,  # Auto-generated characters are not main by default
                        is_auto_generated=True
                    )
                    recorded.append(character.to_dict())
                    existing_names.add(char_name)
        
        return recorded
    
    def get_characters(
        self,
        conversation_id: str,
        include_unavailable: bool = True
    ) -> List[Dict]:
        """
        Get all characters for a conversation
        
        Args:
            conversation_id: Conversation ID
            include_unavailable: Whether to include unavailable characters
        
        Returns:
            List of character dictionaries
        """
        characters = self.repository.get_characters_by_conversation(
            conversation_id=conversation_id,
            include_unavailable=include_unavailable
        )
        return [char.to_dict() for char in characters]
    
    def update_character(
        self,
        conversation_id: str,
        name: str,
        is_main: Optional[bool] = None,
        is_unavailable: Optional[bool] = None,
        notes: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Update character properties
        
        Args:
            conversation_id: Conversation ID
            name: Character name
            is_main: Whether this is a main character
            is_unavailable: Whether this character is unavailable
            notes: Additional notes
        
        Returns:
            Updated character dictionary or None if not found
        """
        character = self.repository.update_character(
            conversation_id=conversation_id,
            name=name,
            is_main=is_main,
            is_unavailable=is_unavailable,
            notes=notes
        )
        return character.to_dict() if character else None
    
    def handle_message_deletion(
        self,
        conversation_id: str,
        message_id: int
    ) -> int:
        """
        Handle character records when a message is deleted
        Deletes characters that first appeared in this message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID that was deleted
        
        Returns:
            Number of character records deleted
        """
        return self.repository.delete_characters_by_message_id(message_id)
    
    def delete_conversation_characters(self, conversation_id: str) -> int:
        """
        Delete all characters for a conversation
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Number of characters deleted
        """
        return self.repository.delete_characters_by_conversation(conversation_id)
    
    def generate_character_with_ai(
        self,
        conversation_id: str,
        background: Optional[str] = None,
        existing_characters: Optional[List[str]] = None,
        character_hints: Optional[str] = None
    ) -> Dict:
        """
        Generate a character using AI based on story background and existing characters
        
        Args:
            conversation_id: Conversation ID
            background: Story background
            existing_characters: List of existing character names
            character_hints: Optional hints for character generation
        
        Returns:
            Dictionary with generated character name and personality
        """
        # This will be called from a service that has access to AI service
        # We'll return a structure that can be used to generate the character
        return {
            'conversation_id': conversation_id,
            'background': background,
            'existing_characters': existing_characters or [],
            'character_hints': character_hints
        }

