"""
Conversation settings controller
"""
from flask import Flask, request, jsonify
from injector import inject
from service.conversation_service import ConversationService
from service.story_service import StoryService
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from service.character_service import CharacterService
from service.story_generation_service import StoryGenerationService
from service.chat_service import ChatService
from utils.logger import get_logger
from utils.stream_response import create_stream_response
from utils.controller_helpers import error_response, handle_errors
import json

logger = get_logger(__name__)


class SettingsController:
    """Conversation settings controller"""
    
    @inject
    def __init__(
        self,
        conversation_service: ConversationService,
        story_service: StoryService,
        ai_service: AIService,
        ai_service_streaming: AIServiceStreaming,
        ai_config_service: AIConfigService,
        app_settings_service: AppSettingsService,
        character_service: CharacterService,
        story_generation_service: StoryGenerationService,
        chat_service: ChatService
    ):
        """
        Initialize controller
        
        Args:
            conversation_service: Conversation service instance
            story_service: Story service instance
            ai_service: AI service instance
            ai_config_service: AI config service instance
        """
        self.conversation_service = conversation_service
        self.story_service = story_service
        self.ai_service = ai_service
        self.ai_service_streaming = ai_service_streaming
        self.ai_config_service = ai_config_service
        self.app_settings_service = app_settings_service
        self.character_service = character_service
        self.story_generation_service = story_generation_service
        self.chat_service = chat_service
    
    def register_routes(self, app: Flask):
        """
        Register controller routes to Flask app
        
        Args:
            app: Flask app instance
        """
        @app.route('/api/conversations/list', methods=['GET'])
        def get_conversations_list():
            return self.get_conversations_list()
        
        @app.route('/api/conversation/settings', methods=['GET'])
        def get_conversation_settings():
            return self.get_conversation_settings()
        
        @app.route('/api/conversation/settings', methods=['POST'])
        def create_or_update_settings():
            return self.create_or_update_settings()
        
        @app.route('/api/conversation/generate-outline', methods=['POST'])
        def generate_outline():
            return self.generate_outline()
        
        @app.route('/api/conversation/generate-outline-stream', methods=['POST'])
        def generate_outline_stream():
            return self.generate_outline_stream()
        
        @app.route('/api/conversation/progress', methods=['GET'])
        def get_progress():
            return self.get_progress()
        
        @app.route('/api/conversation/progress/confirm-outline', methods=['POST'])
        def confirm_outline():
            return self.confirm_outline()
        
        @app.route('/api/conversation/progress', methods=['POST'])
        def update_progress():
            return self.update_progress()
        
        @app.route('/api/app-settings/language', methods=['GET'])
        def get_language():
            return self.get_language()
        
        @app.route('/api/app-settings/language', methods=['POST'])
        def set_language():
            return self.set_language()
        
        @app.route('/api/app-settings', methods=['GET'])
        def get_app_settings():
            return self.get_app_settings()
        
        @app.route('/api/app-settings', methods=['POST'])
        def save_app_settings():
            return self.save_app_settings()
        
        @app.route('/api/conversation/characters', methods=['GET'])
        def get_characters():
            return self.get_characters()
        
        @app.route('/api/conversation/characters/update', methods=['POST'])
        def update_character():
            return self.update_character()
        
        @app.route('/api/conversation/characters/generate', methods=['POST'])
        def generate_character():
            return self.generate_character()
        
        @app.route('/api/conversation/characters/generate-stream', methods=['POST'])
        def generate_character_stream():
            return self.generate_character_stream()
    
    @handle_errors
    def get_conversations_list(self):
        """
        Get all conversations list
        
        Returns:
            - success: Whether successful
            - conversations: Conversations list
        """
        conversations = self.conversation_service.get_all_conversations()
        return jsonify({
            "success": True,
            "conversations": conversations
        })
    
    @handle_errors
    def get_conversation_settings(self):
        """
        Get conversation settings
        
        Query params:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
            - settings: Settings information
        """
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        settings = self.conversation_service.get_settings(conversation_id)
        if settings:
            return jsonify({
                "success": True,
                "settings": settings
            })
        else:
            return jsonify({
                "success": False,
                "error": "Settings not found"
            }), 404
    
    @handle_errors
    def create_or_update_settings(self):
        """
        Create or update conversation settings
        
        Request body:
            - conversation_id: Conversation ID
            - title: Conversation title
            - background: Story background
            - characters: Character list
            - character_personality: Character personality
            - outline: Outline
        
        Returns:
            - success: Success flag
            - settings: Saved settings (without API Key)
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        settings = self.conversation_service.create_or_update_settings(
            conversation_id=conversation_id,
            title=data.get('title'),
            background=data.get('background'),
            characters=data.get('characters'),
            character_personality=data.get('character_personality'),
            character_is_main=data.get('character_is_main'),
            outline=data.get('outline'),
            allow_auto_generate_characters=data.get('allow_auto_generate_characters'),
            additional_settings=data.get('additional_settings')
        )
        
        return jsonify({
            "success": True,
            "settings": settings
        })
    
    def generate_outline(self):
        """
        AI generate story outline
        
        Request body:
            - background: Story background
            - characters: Character list
            - character_personality: Character personality
            - provider: AI provider (ollama or deepseek)
            - model: Model name (uses default from global config if not provided)
        
        Returns:
            - success: Success flag
            - outline: Generated outline content
        """
        try:
            data = request.json or {}
            background = data.get('background')
            language = self.app_settings_service.get_language()
            
            if not background:
                return error_response(language, 'error_messages.background_required')
            
            provider = data.get('provider')
            if not provider:
                # Try to get from app settings, default to deepseek
                try:
                    # For now, default to deepseek
                    # Could be improved to get from app settings if needed
                    provider = 'deepseek'
                except Exception:
                    provider = 'deepseek'
            
            # Get language setting
            language = self.app_settings_service.get_language()
            
            outline = self.conversation_service.generate_outline(
                background=background,
                characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                provider=provider,
                model=data.get('model'),
                language=language
            )
            
            return jsonify({
                "success": True,
                "outline": outline
            })
        
        except Exception as e:
            logger.error(f"Failed to generate outline: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to generate outline: {str(e)}"
            }), 500
    
    @handle_errors
    def generate_outline_stream(self):
        """
        Stream AI generated story outline
        
        Request body:
            - background: Story background
            - characters: Character list
            - character_personality: Character personality
            - provider: AI provider (ollama or deepseek)
            - model: Model name
        
        Returns:
            Server-Sent Events stream with outline chunks
        """
        data = request.json or {}
        background = data.get('background')
        language = self.app_settings_service.get_language()
        
        if not background:
            return error_response(language, 'error_messages.background_required')
        
        provider = data.get('provider', 'deepseek')
        
        # Create stream generator using service
        def stream_generator():
            return self.conversation_service.generate_outline_stream(
                background=background,
                characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                provider=provider,
                model=data.get('model'),
                language=language
            )
        
        return create_stream_response(stream_generator=stream_generator())
    
    def get_progress(self):
        """
        Get story progress
        
        Query params:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
            - progress: Progress information
        """
        try:
            conversation_id = request.args.get('conversation_id')
            language = self.app_settings_service.get_language()
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            progress = self.story_service.get_progress(conversation_id)
            return jsonify({
                "success": True,
                "progress": progress
            })
        
        except Exception as e:
            logger.error(f"Failed to get progress: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get progress: {str(e)}"
            }), 500
    
    @handle_errors
    def confirm_outline(self):
        """
        Confirm outline, can start generating story
        
        Request body:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        success = self.story_service.mark_outline_confirmed(conversation_id)
        if success:
            return jsonify({
                "success": True
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to confirm outline"
            }), 500
    
    @handle_errors
    def update_progress(self):
        """
        Update story progress
        
        Request body:
            - conversation_id: Conversation ID
            - current_section: Current section number
            - total_sections: Total sections (optional)
            - status: Status (optional)
        
        Returns:
            - success: Success flag
            - progress: Updated progress
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        progress = self.story_service.update_progress(
            conversation_id=conversation_id,
            current_section=data.get('current_section'),
            total_sections=data.get('total_sections'),
            status=data.get('status')
        )
        
        return jsonify({
            "success": True,
            "progress": progress
        })
    
    def get_language(self):
        """
        Get language setting
        
        Returns:
            - success: Success flag
            - language: Language code ('zh' or 'en')
        """
        try:
            language = self.app_settings_service.get_language()
            return jsonify({
                "success": True,
                "language": language
            })
        except Exception as e:
            logger.error(f"Failed to get language: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get language: {str(e)}"
            }), 500
    
    @handle_errors
    def set_language(self):
        """
        Set language setting
        
        Request body:
            - language: Language code ('zh' or 'en')
        
        Returns:
            - success: Success flag
            - language: Language code
        """
        data = request.json or {}
        language = data.get('language')
        app_language = self.app_settings_service.get_language()
        
        if not language:
            return error_response(app_language, 'error_messages.language_required')
        
        if language not in ('zh', 'en'):
            return jsonify({
                "success": False,
                "error": "language must be 'zh' or 'en'"
            }), 400
        
        self.app_settings_service.set_language(language)
        return jsonify({
            "success": True,
            "language": language
        })
    
    @handle_errors
    def get_app_settings(self):
        """
        Get all app settings
        
        Returns:
            - success: Success flag
            - settings: App settings JSON string
        """
        try:
            settings_json = self.app_settings_service.get_setting('app_settings', '{}')
            return jsonify({
                "success": True,
                "settings": settings_json
            })
        except Exception as e:
            logger.error(f"Failed to get app settings: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get app settings: {str(e)}"
            }), 500
    
    @handle_errors
    def save_app_settings(self):
        """
        Save app settings
        
        Request body:
            - settings: App settings JSON string
        
        Returns:
            - success: Success flag
        """
        try:
            data = request.json or {}
            settings = data.get('settings')
            
            if settings is None:
                return jsonify({
                    "success": False,
                    "error": "settings is required"
                }), 400
            
            # Parse settings to extract AI config
            if isinstance(settings, str):
                settings_dict = json.loads(settings)  # Parse JSON
            else:
                settings_dict = settings
                settings = json.dumps(settings)  # Convert to JSON string for storage
            
            # Save app settings
            self.app_settings_service.set_setting('app_settings', settings)
            
            # Extract and save AI configurations to ai_config table
            if 'ai' in settings_dict:
                ai_settings = settings_dict['ai']
                provider = ai_settings.get('provider')
                
                if provider:
                    # Get provider-specific config
                    provider_config = ai_settings.get(provider, {})
                    
                    # Extract API key (support both camelCase and snake_case)
                    # Check if apiKey or api_key exists in the config (even if empty)
                    api_key = None
                    if 'apiKey' in provider_config:
                        api_key = provider_config.get('apiKey')
                    elif 'api_key' in provider_config:
                        api_key = provider_config.get('api_key')
                    # Pass api_key as-is (could be None, empty string, or actual key)
                    # Repository will handle None vs empty string appropriately
                    
                    # Save to ai_config table
                    self.ai_config_service.create_or_update_config(
                        provider=provider,
                        model=provider_config.get('model'),
                        api_key=api_key,
                        base_url=provider_config.get('baseUrl') or provider_config.get('base_url'),
                        max_tokens=provider_config.get('maxTokens') or provider_config.get('max_tokens'),
                        temperature=provider_config.get('temperature')
                    )
                    
                    logger.info(f"Saved AI config for provider: {provider}")
            
            return jsonify({
                "success": True
            })
        except json.JSONDecodeError:
            return jsonify({
                "success": False,
                "error": "Invalid JSON format"
            }), 400
        except Exception as e:
            logger.error(f"Failed to save app settings: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to save app settings: {str(e)}"
            }), 500
    
    def get_characters(self):
        """
        Get all characters for a conversation
        
        Query params:
            - conversation_id: Conversation ID
            - include_unavailable: Whether to include unavailable characters (default: true)
        
        Returns:
            - success: Success flag
            - characters: List of character records
        """
        try:
            conversation_id = request.args.get('conversation_id')
            include_unavailable = request.args.get('include_unavailable', 'true').lower() == 'true'
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            characters = self.character_service.get_characters(
                conversation_id=conversation_id,
                include_unavailable=include_unavailable
            )
            
            return jsonify({
                "success": True,
                "characters": characters
            })
        
        except Exception as e:
            logger.error(f"Failed to get characters: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get characters: {str(e)}"
            }), 500
    
    def update_character(self):
        """
        Update character properties
        
        Request body:
            - conversation_id: Conversation ID
            - name: Character name
            - is_main: Whether this is a main character (optional)
            - is_unavailable: Whether this character is unavailable (optional)
            - notes: Additional notes (optional)
        
        Returns:
            - success: Success flag
            - character: Updated character record
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            name = data.get('name')
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            if not name:
                return error_response(language, 'error_messages.name_required')
            
            character = self.character_service.update_character(
                conversation_id=conversation_id,
                name=name,
                is_main=data.get('is_main'),
                is_unavailable=data.get('is_unavailable'),
                notes=data.get('notes')
            )
            
            if character:
                return jsonify({
                    "success": True,
                    "character": character
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "Character not found"
                }), 404
        
        except Exception as e:
            logger.error(f"Failed to update character: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to update character: {str(e)}"
            }), 500
    
    def generate_character(self):
        """
        Generate a character using AI
        
        Request body:
            - conversation_id: Conversation ID (required)
            - provider: AI provider (optional, default: deepseek)
            - model: Model name (optional)
            - character_hints: Optional hints for character generation
            - background: Optional story background (if not provided, will get from database)
            - characters: Optional list of existing character names (if not provided, will get from database)
            - character_personality: Optional dict of character personalities (if not provided, will get from database)
        
        Returns:
            - success: Success flag
            - character: Generated character information (name and personality)
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            # Get language setting
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            # Call service to generate character
            result = self.character_service.generate_character(
                conversation_id=conversation_id,
                background=data.get('background'),
                existing_characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                character_hints=data.get('character_hints', ''),
                provider=data.get('provider', 'deepseek'),
                model=data.get('model')
            )
            
            if result.get('success'):
                return jsonify(result)
            else:
                return jsonify(result), 500
        
        except Exception as e:
            logger.error(f"Failed to generate character: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to generate character: {str(e)}"
            }), 500
    
    @handle_errors
    def generate_character_stream(self):
        """
        Stream generate a character using AI
        
        Request body:
            - conversation_id: Conversation ID (required)
            - provider: AI provider (optional, default: deepseek)
            - model: Model name (optional)
            - character_hints: Optional hints for character generation
            - background: Optional story background (if not provided, will get from database)
            - characters: Optional list of existing character names (if not provided, will get from database)
            - character_personality: Optional dict of character personalities (if not provided, will get from database)
        
        Returns:
            Server-Sent Events stream with character generation chunks
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        # Create stream generator using service
        def stream_generator():
            return self.character_service.generate_character_stream(
                conversation_id=conversation_id,
                background=data.get('background'),
                existing_characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                character_hints=data.get('character_hints', ''),
                provider=data.get('provider', 'deepseek'),
                model=data.get('model')
            )
        
        return create_stream_response(stream_generator=stream_generator())

