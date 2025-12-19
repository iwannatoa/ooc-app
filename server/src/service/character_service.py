"""
Character service layer
"""
import re
from typing import List, Optional, Dict, Set, Generator, TYPE_CHECKING
from repository.character_record_repository import CharacterRecordRepository
from repository.chat_repository import ChatRepository
from utils.logger import get_logger

if TYPE_CHECKING:
    from service.conversation_service import ConversationService
    from service.chat_service import ChatService
    from service.ai_service import AIService
    from service.ai_service_streaming import AIServiceStreaming
    from service.ai_config_service import AIConfigService
    from service.app_settings_service import AppSettingsService

logger = get_logger(__name__)


class CharacterService:
    """Character service"""
    
    def __init__(
        self,
        character_repository: CharacterRecordRepository,
        chat_repository: ChatRepository,
        conversation_service: Optional['ConversationService'] = None,
        chat_service: Optional['ChatService'] = None,
        ai_service: Optional['AIService'] = None,
        ai_service_streaming: Optional['AIServiceStreaming'] = None,
        ai_config_service: Optional['AIConfigService'] = None,
        app_settings_service: Optional['AppSettingsService'] = None
    ):
        """
        Initialize service
        
        Args:
            character_repository: Character record repository instance
            chat_repository: Chat repository instance
            conversation_service: Conversation service instance (optional, for character generation)
            chat_service: Chat service instance (optional, for character generation)
            ai_service: AI service instance (optional, for character generation)
            ai_service_streaming: Streaming AI service instance (optional, for character generation)
            ai_config_service: AI config service instance (optional, for character generation)
            app_settings_service: App settings service instance (optional, for character generation)
        """
        self.repository = character_repository
        self.chat_repository = chat_repository
        self.conversation_service = conversation_service
        self.chat_service = chat_service
        self.ai_service = ai_service
        self.ai_service_streaming = ai_service_streaming
        self.ai_config_service = ai_config_service
        self.app_settings_service = app_settings_service
    
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
    
    def _build_character_generation_prompt(
        self,
        background: str,
        existing_characters: List[str],
        character_personality_dict: Dict[str, str],
        appeared_characters: List[Dict],
        recent_content: str,
        character_hints: Optional[str],
        language: str
    ) -> str:
        """
        Build prompt for character generation
        
        Args:
            background: Story background
            existing_characters: List of existing character names
            character_personality_dict: Dictionary of character personalities
            appeared_characters: List of appeared character records
            recent_content: Recent story content
            character_hints: Optional hints for character generation
            language: Language code
        
        Returns:
            Built prompt string
        """
        from utils.prompt_template_loader import PromptTemplateLoader
        
        template = PromptTemplateLoader.get_template(language)
        char_template = template['character_generation']
        sections = char_template['sections']
        
        prompt_parts = [char_template['intro'], ""]
        prompt_parts.append(sections['background'])
        prompt_parts.append(background)
        prompt_parts.append("")
        
        if existing_characters:
            prompt_parts.append(sections['existing_characters_from_settings'])
            for char in existing_characters:
                personality = character_personality_dict.get(char, '')
                if personality:
                    prompt_parts.append(f"- {char}: {personality}")
                else:
                    prompt_parts.append(f"- {char}")
            prompt_parts.append("")
        
        if appeared_characters:
            available_chars = [c for c in appeared_characters if not c.get('is_unavailable', False)]
            if available_chars:
                prompt_parts.append(sections['appeared_characters'])
                template_labels = template['appeared_characters']
                for char in available_chars:
                    char_name = char.get('name', '')
                    is_main = char.get('is_main', False)
                    main_label = template_labels['main_label'] if is_main else ""
                    prompt_parts.append(f"- {char_name}{main_label}")
                prompt_parts.append("")
        
        if recent_content:
            prompt_parts.append(sections['recent_content'])
            prompt_parts.append(recent_content[:1000])
            prompt_parts.append("")
        
        if character_hints:
            prompt_parts.append(sections['character_hints'])
            prompt_parts.append(character_hints)
            prompt_parts.append("")
        
        instructions_key = language
        prompt_parts.append(char_template['instructions'].get(instructions_key, char_template['instructions']['en']))
        
        return "\n".join(prompt_parts)
    
    def _parse_character_response(self, response_text: str, language: str) -> Dict[str, Optional[str]]:
        """
        Parse AI response to extract character name and personality
        
        Args:
            response_text: AI response text
            language: Language code
        
        Returns:
            Dictionary with 'name' and 'personality' keys
        """
        character_name = None
        character_personality = None
        
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if language == 'zh':
                if line.startswith('姓名：') or line.startswith('姓名:'):
                    character_name = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                elif line.startswith('设定：') or line.startswith('设定:'):
                    character_personality = line.split('：', 1)[-1].split(':', 1)[-1].strip()
            else:
                if line.startswith('Name:') or line.startswith('Name：'):
                    character_name = line.split(':', 1)[-1].split('：', 1)[-1].strip()
                elif line.startswith('Setting:') or line.startswith('Setting：'):
                    character_personality = line.split(':', 1)[-1].split('：', 1)[-1].strip()
        
        # Fallback: try to extract name from first line if not found
        if not character_name:
            first_line = lines[0].strip() if lines else ''
            if first_line:
                character_name = first_line.split(':')[0].split('：')[0].strip()
                character_name = character_name.replace('姓名', '').replace('Name', '').strip(': ：').strip()
                if character_name:
                    character_personality = '\n'.join(lines[1:]).strip() if len(lines) > 1 else response_text
        
        if not character_name:
            # Last resort: use first non-empty line
            for line in lines:
                line = line.strip()
                if line and not line.startswith('姓名') and not line.startswith('Name') and not line.startswith('设定') and not line.startswith('Setting'):
                    character_name = line.split(' ')[0].split('\t')[0]
                    character_personality = response_text.replace(line, '').strip()
                    break
        
        return {
            'name': character_name,
            'personality': character_personality or ''
        }
    
    def generate_character(
        self,
        conversation_id: str,
        background: Optional[str] = None,
        existing_characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        character_hints: Optional[str] = None,
        provider: str = 'deepseek',
        model: Optional[str] = None
    ) -> Dict:
        """
        Generate a character using AI
        
        Args:
            conversation_id: Conversation ID
            background: Story background (optional, will get from settings if not provided)
            existing_characters: List of existing character names (optional, will get from settings if not provided)
            character_personality: Dictionary of character personalities (optional, will get from settings if not provided)
            character_hints: Optional hints for character generation
            provider: AI provider
            model: Model name
        
        Returns:
            Dictionary with 'success' flag and 'character' (name and personality) or 'error'
        """
        if not self.conversation_service or not self.ai_service or not self.ai_config_service or not self.app_settings_service:
            return {
                "success": False,
                "error": "Character generation services not available"
            }
        
        language = self.app_settings_service.get_language()
        character_personality_dict = character_personality or {}
        
        # Get background and characters from settings if not provided
        if not background or existing_characters is None:
            settings = self.conversation_service.get_settings(conversation_id)
            if settings:
                if not background:
                    background = settings.get('background')
                if existing_characters is None:
                    existing_characters = settings.get('characters', [])
                    if not character_personality_dict:
                        character_personality_dict = settings.get('character_personality', {})
        
        if not background:
            from utils.i18n import get_i18n_text
            error_msg = get_i18n_text(language, 'error_messages.background_required_detailed')
            return {
                "success": False,
                "error": error_msg
            }
        
        if existing_characters is None:
            existing_characters = []
        
        # Get appeared characters from database
        appeared_characters = []
        try:
            appeared_characters = self.get_characters(conversation_id, include_unavailable=True)
        except Exception:
            appeared_characters = []
        
        # Get recent story content
        recent_content = ""
        if self.chat_service:
            try:
                messages = self.chat_service.get_conversation(conversation_id, limit=10)
                recent_messages = [msg for msg in messages if msg.get('role') == 'assistant']
                if recent_messages:
                    recent_content = "\n".join([msg.get('content', '')[:500] for msg in recent_messages[-3:]])
            except Exception:
                recent_content = ""
        
        # Build prompt
        prompt = self._build_character_generation_prompt(
            background=background,
            existing_characters=existing_characters,
            character_personality_dict=character_personality_dict,
            appeared_characters=appeared_characters,
            recent_content=recent_content,
            character_hints=character_hints,
            language=language
        )
        
        # Get AI config
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        # Call AI to generate character
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=prompt,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )
        
        if result.get('success'):
            response_text = result.get('response', '')
            parsed = self._parse_character_response(response_text, language)
            
            if parsed['name']:
                return {
                    "success": True,
                    "character": {
                        "name": parsed['name'],
                        "personality": parsed['personality']
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to parse character name from AI response"
                }
        else:
            return {
                "success": False,
                "error": result.get('error', 'Failed to generate character')
            }
    
    def generate_character_stream(
        self,
        conversation_id: str,
        background: Optional[str] = None,
        existing_characters: Optional[List[str]] = None,
        character_personality: Optional[Dict[str, str]] = None,
        character_hints: Optional[str] = None,
        provider: str = 'deepseek',
        model: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        Stream generate a character using AI
        
        Args:
            conversation_id: Conversation ID
            background: Story background (optional, will get from settings if not provided)
            existing_characters: List of existing character names (optional, will get from settings if not provided)
            character_personality: Dictionary of character personalities (optional, will get from settings if not provided)
            character_hints: Optional hints for character generation
            provider: AI provider
            model: Model name
        
        Yields:
            Text chunks from AI stream
        """
        if not self.conversation_service or not self.ai_service_streaming or not self.ai_config_service or not self.app_settings_service:
            import json
            yield json.dumps({"error": "Character generation services not available"}) + "\n"
            return
        
        language = self.app_settings_service.get_language()
        character_personality_dict = character_personality or {}
        
        # Get background and characters from settings if not provided
        if not background or existing_characters is None:
            settings = self.conversation_service.get_settings(conversation_id)
            if settings:
                if not background:
                    background = settings.get('background')
                if existing_characters is None:
                    existing_characters = settings.get('characters', [])
                    if not character_personality_dict:
                        character_personality_dict = settings.get('character_personality', {})
        
        if not background:
            import json
            from utils.i18n import get_i18n_text
            error_msg = get_i18n_text(language, 'error_messages.background_required_detailed')
            yield json.dumps({"error": error_msg}) + "\n"
            return
        
        if existing_characters is None:
            existing_characters = []
        
        # Get appeared characters from database
        appeared_characters = []
        try:
            appeared_characters = self.get_characters(conversation_id, include_unavailable=True)
        except Exception:
            appeared_characters = []
        
        # Get recent story content
        recent_content = ""
        if self.chat_service:
            try:
                messages = self.chat_service.get_conversation(conversation_id, limit=10)
                recent_messages = [msg for msg in messages if msg.get('role') == 'assistant']
                if recent_messages:
                    recent_content = "\n".join([msg.get('content', '')[:500] for msg in recent_messages[-3:]])
            except Exception:
                recent_content = ""
        
        # Build prompt
        prompt = self._build_character_generation_prompt(
            background=background,
            existing_characters=existing_characters,
            character_personality_dict=character_personality_dict,
            appeared_characters=appeared_characters,
            recent_content=recent_content,
            character_hints=character_hints,
            language=language
        )
        
        # Get AI config
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        # Stream the response
        yield from self.ai_service_streaming.chat_stream(
            provider=api_config['provider'],
            message=prompt,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature']
        )

