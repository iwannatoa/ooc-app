"""
Character service layer
"""
import re
from typing import List, Optional, Dict, Generator, Tuple, TYPE_CHECKING, Any
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
    
    def parse_story_with_characters(self, content: str, language: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        """
        Parse AI-generated story content to extract story text and character information
        
        Args:
            content: Full content from AI (story + character info with <CHARACTERS> tags)
            language: Language code ('zh' or 'en'), if not provided, will get from app_settings_service
        
        Returns:
            Tuple of (story_content, character_info)
            story_content: Cleaned story content without character tags
            character_info: Dictionary with:
                - "new": List of new character names
                - "new_with_settings": Dict mapping character name to setting description
                - "status_changes": Dict mapping character name to status changes dict
                  (e.g., {"Character Name": {"is_main": True}} or {"Character Name": {"is_unavailable": True}})
        """
        # Get language if not provided
        if language is None and self.app_settings_service:
            language = self.app_settings_service.get_language()
        if language is None:
            language = 'zh'  # Default to Chinese
        
        # Load status keywords from template
        from utils.prompt_template_loader import PromptTemplateLoader
        template = PromptTemplateLoader.get_template(language)
        status_keywords = template.get('output_requirements', {}).get('character_changes', {}).get('status_keywords', {})
        
        became_main_keywords = status_keywords.get('became_main', [])
        became_unavailable_keywords = status_keywords.get('became_unavailable', [])
        restored_available_keywords = status_keywords.get('restored_available', [])
        story_content = content
        character_info = {
            "new": [],
            "new_with_settings": {},
            "status_changes": {}
        }
        
        # Extract character information from <CHARACTERS> tags
        characters_pattern = r'<CHARACTERS>(.*?)</CHARACTERS>'
        characters_match = re.search(characters_pattern, content, re.DOTALL | re.IGNORECASE)
        
        if characters_match:
            characters_section = characters_match.group(1).strip()
            
            # Remove the character section from story content
            story_content = re.sub(characters_pattern, '', content, flags=re.DOTALL | re.IGNORECASE).strip()
            
            # Parse character information from the section
            lines = characters_section.split('\n')
            in_new_characters_section = False
            in_status_changes_section = False
            
            for line in lines:
                line = line.strip()
                
                # Skip empty lines
                if not line:
                    continue
                
                # Check section headers
                if '新增角色' in line or 'New Characters' in line:
                    in_new_characters_section = True
                    in_status_changes_section = False
                    continue
                elif '角色状态变化' in line or 'Status Changes' in line:
                    in_new_characters_section = False
                    in_status_changes_section = True
                    continue
                elif '角色变化' in line or 'Character Changes' in line:
                    # This is the main header, reset sections
                    in_new_characters_section = False
                    in_status_changes_section = False
                    continue
                
                # Extract character name from lines like "- Character Name" or "Character Name"
                if line.startswith('-') or line.startswith('•') or line.startswith('*'):
                    line_content = line.lstrip('- •*').strip()
                else:
                    line_content = line.strip()
                
                # Clean up brackets
                line_content = re.sub(r'^\[|\]$', '', line_content).strip()
                
                if not line_content:
                    continue
                
                # Parse based on section
                if in_new_characters_section:
                    # New character - format: "Character Name - Setting: Setting Description" or "Character Name"
                    # Try to parse character name and setting
                    if ' - 设定：' in line_content or ' - 设定:' in line_content or ' - Setting:' in line_content or ' - Setting：' in line_content:
                        # Has setting
                        parts = re.split(r' - (?:设定|Setting)[：:]', line_content, 1)
                        if len(parts) >= 1:
                            char_name = parts[0].strip()
                            char_name = re.sub(r'^\[|\]$', '', char_name).strip()
                            setting = parts[1].strip() if len(parts) > 1 else ""
                            if char_name and len(char_name) >= 1:
                                character_info["new"].append(char_name)
                                if setting:
                                    character_info["new_with_settings"][char_name] = setting
                    else:
                        # Just the name (backward compatibility)
                        char_name = re.sub(r'^\[|\]$', '', line_content).strip()
                        if char_name and len(char_name) >= 1:
                            character_info["new"].append(char_name)
                        
                elif in_status_changes_section:
                    # Status change - format: "Character Name - Status Description" or "[Character Name] - Status Description"
                    # Parse character name and status change
                    parts = line_content.split('-', 1)
                    if len(parts) >= 1:
                        char_name = parts[0].strip()
                        # Remove brackets if present
                        char_name = re.sub(r'^\[|\]$', '', char_name).strip()
                        status_desc = parts[1].strip() if len(parts) > 1 else ""
                        
                        if char_name and len(char_name) >= 1:
                            # Initialize status changes dict for this character
                            if char_name not in character_info["status_changes"]:
                                character_info["status_changes"][char_name] = {}
                            
                            # Parse status description
                            status_desc_lower = status_desc.lower()
                            
                            # Check for main character status using keywords from template
                            if any(keyword in status_desc_lower for keyword in became_main_keywords):
                                character_info["status_changes"][char_name]["is_main"] = True
                            
                            # Check for unavailable status using keywords from template
                            if any(keyword in status_desc_lower for keyword in became_unavailable_keywords):
                                character_info["status_changes"][char_name]["is_unavailable"] = True
                            
                            # Check for restored to available status using keywords from template
                            if any(keyword in status_desc_lower for keyword in restored_available_keywords):
                                character_info["status_changes"][char_name]["is_unavailable"] = False
        
        return story_content, character_info
    
    def record_characters_from_message(
        self,
        conversation_id: str,
        message_id: int,
        content: str,
        predefined_characters: List[str],
        allow_auto_generate: bool = True,
        allow_auto_generate_main: bool = True,
        ai_extracted_characters: Optional[List[str]] = None,
        ai_extracted_characters_with_settings: Optional[Dict[str, str]] = None,
        ai_status_changes: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> List[Dict]:
        """
        Record characters that appear in a message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID
            content: Message content (story content, without character tags)
            predefined_characters: List of predefined character names (from settings)
            allow_auto_generate: Whether to allow auto-generating new characters (any role, fallback)
            allow_auto_generate_main: Whether to allow auto-generating main characters
            ai_extracted_characters: List of character names extracted by AI (from <CHARACTERS> tags, preferred)
            ai_extracted_characters_with_settings: Dict mapping character name to setting description
            ai_status_changes: Dict mapping character name to status changes (e.g., {"Character Name": {"is_main": True}})
        
        Returns:
            List of created/updated character records
        """
        existing_characters = self.repository.get_characters_by_conversation(conversation_id)
        existing_names = {char.name for char in existing_characters}
        
        recorded = []
        
        # Record predefined characters if they appear and aren't recorded yet
        # Use word boundary matching to avoid false positives (e.g., "Li" matching "like")
        content_lower = content.lower()
        for char_name in predefined_characters:
            if char_name not in existing_names:
                # Use word boundary for better matching (works for both English and Chinese)
                # For English: use word boundaries
                # For Chinese: check if name appears as a standalone word
                char_name_lower = char_name.lower()
                
                # Improved matching: check if character name appears as whole word
                # For English: use word boundaries
                if re.search(r'[A-Za-z]', char_name):
                    # English name: use word boundary
                    pattern = r'\b' + re.escape(char_name) + r'\b'
                    if re.search(pattern, content, re.IGNORECASE):
                        character = self.repository.create_character(
                            conversation_id=conversation_id,
                            name=char_name,
                            first_appeared_message_id=message_id,
                            is_main=True,  # Predefined characters are considered main
                            is_auto_generated=False
                        )
                        recorded.append(character.to_dict())
                        existing_names.add(char_name)
                else:
                    # Chinese name: check if it appears (Chinese doesn't have word boundaries)
                    # Use simple containment but be more careful
                    if char_name in content or char_name_lower in content_lower:
                        character = self.repository.create_character(
                            conversation_id=conversation_id,
                            name=char_name,
                            first_appeared_message_id=message_id,
                            is_main=True,  # Predefined characters are considered main
                            is_auto_generated=False
                        )
                        recorded.append(character.to_dict())
                        existing_names.add(char_name)
        
        # Record AI-extracted characters (preferred method)
        if ai_extracted_characters:
            for char_name in ai_extracted_characters:
                char_name = char_name.strip()
                if char_name and char_name not in existing_names:
                    # Check if this should be a main character based on status changes
                    is_main = False
                    if ai_status_changes and char_name in ai_status_changes:
                        is_main = ai_status_changes[char_name].get("is_main", False)
                    
                    # Check if we should allow this character based on settings
                    if is_main and not allow_auto_generate_main:
                        logger.info(f"Skipping auto-generated main character {char_name} (not allowed)")
                        continue
                    if not is_main and not allow_auto_generate:
                        logger.info(f"Skipping auto-generated character {char_name} (not allowed)")
                        continue
                    
                    # Get character setting if available
                    character_setting = None
                    if ai_extracted_characters_with_settings and char_name in ai_extracted_characters_with_settings:
                        character_setting = ai_extracted_characters_with_settings[char_name]
                    
                    character = self.repository.create_character(
                        conversation_id=conversation_id,
                        name=char_name,
                        first_appeared_message_id=message_id,
                        is_main=is_main,
                        is_auto_generated=True,
                        notes=character_setting  # Store setting in notes field
                    )
                    recorded.append(character.to_dict())
                    existing_names.add(char_name)
                    logger.info(f"Recorded AI-extracted character: {char_name} (main={is_main}) in conversation {conversation_id}")
        
        # Note: Removed fallback text extraction mechanism as it was too inaccurate
        # Only AI-extracted characters (from <CHARACTERS> tags) will be recorded
        
        # Process status changes for existing characters
        if ai_status_changes:
            for char_name, status_changes in ai_status_changes.items():
                if not char_name or not status_changes:
                    continue
                
                # Check if character exists
                existing_char = self.repository.get_character(conversation_id, char_name)
                if existing_char:
                    # Update character status
                    is_main = status_changes.get("is_main")
                    is_unavailable = status_changes.get("is_unavailable")
                    
                    updated_char = self.repository.update_character(
                        conversation_id=conversation_id,
                        name=char_name,
                        is_main=is_main,
                        is_unavailable=is_unavailable
                    )
                    
                    if updated_char:
                        recorded.append(updated_char.to_dict())
                        logger.info(f"Updated character status: {char_name} in conversation {conversation_id}, changes: {status_changes}")
                else:
                    # Character doesn't exist yet, skip status changes
                    logger.warning(f"Character {char_name} not found for status update in conversation {conversation_id}")
        
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
        message_id: int,
        message_content: Optional[str] = None,
        message_role: Optional[str] = None
    ) -> int:
        """
        Handle character records when a message is deleted
        Deletes characters that first appeared in this message
        Also reverts character status changes that occurred in this message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID that was deleted
            message_content: Optional message content (if assistant message, used to revert status changes)
            message_role: Optional message role (to determine if we need to revert status changes)
        
        Returns:
            Number of character records deleted
        """
        deleted_count = self.repository.delete_characters_by_message_id(message_id)
        
        # If it's an assistant message with content, try to revert status changes
        if message_role == 'assistant' and message_content:
            try:
                # Parse the deleted message to find character status changes
                story_content, character_info = self.parse_story_with_characters(message_content)
                
                # Revert status changes that occurred in this message
                if character_info.get("status_changes"):
                    for char_name, status_changes in character_info["status_changes"].items():
                        existing_char = self.repository.get_character(conversation_id, char_name)
                        if existing_char:
                            # Revert status changes
                            updates = {}
                            if "is_main" in status_changes:
                                # Revert to previous state (assume False if was set to True)
                                # In a more sophisticated implementation, we could track previous states
                                if status_changes["is_main"]:
                                    updates["is_main"] = False
                            if "is_unavailable" in status_changes:
                                # Revert to previous state
                                if status_changes["is_unavailable"]:
                                    updates["is_unavailable"] = False
                                else:
                                    updates["is_unavailable"] = True
                            
                            if updates:
                                self.repository.update_character(
                                    conversation_id=conversation_id,
                                    name=char_name,
                                    **updates
                                )
                                logger.info(f"Reverted status changes for character {char_name} after message deletion")
            except Exception as e:
                logger.warning(f"Failed to revert character status changes: {str(e)}")
                # Don't fail the deletion if status reversion fails
        
        return deleted_count
    
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
        
        prompt_parts.append(char_template['instructions'])
        
        return "\n".join(prompt_parts)
    
    def _parse_character_response(self, response_text: str, language: str) -> List[Dict[str, Optional[str]]]:
        """
        Parse AI response to extract character name(s) and personality(ies)
        Supports parsing multiple characters separated by '---'
        
        Args:
            response_text: AI response text
            language: Language code
        
        Returns:
            List of dictionaries, each with 'name' and 'personality' keys
        """
        characters = []
        
        # Split by '---' to handle multiple characters
        # Use regex to handle '---' with optional whitespace around it
        parts = re.split(r'\s*---\s*', response_text)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
                
            character_name = None
            character_personality = None
            
            lines = part.split('\n')
            personality_lines = []
            in_personality_section = False
            
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                    
                if language == 'zh':
                    if line.startswith('姓名：') or line.startswith('姓名:'):
                        # Extract name
                        character_name = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                        in_personality_section = False
                    elif line.startswith('设定：') or line.startswith('设定:'):
                        # Start of personality section
                        personality_text = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                        if personality_text:
                            personality_lines = [personality_text]
                        in_personality_section = True
                    elif in_personality_section:
                        # Continue collecting personality lines until next character or end
                        # Stop if we encounter another "Name:" or "姓名："
                        if line.startswith('姓名：') or line.startswith('姓名:') or line.startswith('Name:') or line.startswith('Name：'):
                            break
                        personality_lines.append(line)
                else:
                    if line.startswith('Name:') or line.startswith('Name：'):
                        # Extract name
                        character_name = line.split(':', 1)[-1].split('：', 1)[-1].strip()
                        in_personality_section = False
                    elif line.startswith('Setting:') or line.startswith('Setting：'):
                        # Start of personality section
                        personality_text = line.split(':', 1)[-1].split('：', 1)[-1].strip()
                        if personality_text:
                            personality_lines = [personality_text]
                        in_personality_section = True
                    elif in_personality_section:
                        # Continue collecting personality lines until next character or end
                        # Stop if we encounter another "Name:" or "姓名："
                        if line.startswith('姓名：') or line.startswith('姓名:') or line.startswith('Name:') or line.startswith('Name：'):
                            break
                        personality_lines.append(line)
            
            # Combine personality lines
            if personality_lines:
                character_personality = '\n'.join(personality_lines).strip()
            
            # Fallback: try to extract name from first line if not found
            if not character_name:
                first_line = lines[0].strip() if lines else ''
                if first_line:
                    character_name = first_line.split(':')[0].split('：')[0].strip()
                    character_name = character_name.replace('姓名', '').replace('Name', '').strip(': ：').strip()
                    if character_name:
                        # Use remaining lines as personality
                        if not character_personality:
                            character_personality = '\n'.join(lines[1:]).strip()
            
            if not character_name:
                # Last resort: use first non-empty line
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('姓名') and not line.startswith('Name') and not line.startswith('设定') and not line.startswith('Setting'):
                        character_name = line.split(' ')[0].split('\t')[0]
                        if not character_personality:
                            character_personality = part.replace(line, '').strip()
                        break
            
            if character_name:
                characters.append({
                    'name': character_name,
                    'personality': character_personality or ''
                })
        
        # If no characters found, return empty list (will be handled by caller)
        return characters
    
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
        
        # Check if API key is required and available
        if provider == 'deepseek' and not api_config.get('api_key'):
            from utils.i18n import get_i18n_text
            error_msg = get_i18n_text(language, 'error_messages.deepseek_api_key_required')
            if not error_msg:
                error_msg = "DeepSeek API key is required. Please configure it in Settings > AI Settings."
            return {
                "success": False,
                "error": error_msg
            }
        
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
            parsed_characters = self._parse_character_response(response_text, language)
            
            if parsed_characters:
                # Return list of characters (supporting multiple)
                return {
                    "success": True,
                    "characters": parsed_characters
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to parse character name(s) from AI response"
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
        
        # Check if API key is required and available
        if provider == 'deepseek' and not api_config.get('api_key'):
            import json
            from utils.i18n import get_i18n_text
            error_msg = get_i18n_text(language, 'error_messages.deepseek_api_key_required')
            if not error_msg:
                error_msg = "DeepSeek API key is required. Please configure it in Settings > AI Settings."
            yield json.dumps({"error": error_msg}) + "\n"
            return
        
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

