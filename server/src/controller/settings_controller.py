"""
Conversation settings controller
"""
from flask import Flask, request, jsonify
from injector import inject
from service.conversation_service import ConversationService
from service.story_service import StoryService
from service.ai_service import AIService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from service.character_service import CharacterService
from service.story_generation_service import StoryGenerationService
from service.chat_service import ChatService
from utils.logger import get_logger

logger = get_logger(__name__)

logger = get_logger(__name__)


class SettingsController:
    """Conversation settings controller"""
    
    @inject
    def __init__(
        self,
        conversation_service: ConversationService,
        story_service: StoryService,
        ai_service: AIService,
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
        
        @app.route('/api/conversation/characters', methods=['GET'])
        def get_characters():
            return self.get_characters()
        
        @app.route('/api/conversation/characters/update', methods=['POST'])
        def update_character():
            return self.update_character()
        
        @app.route('/api/conversation/characters/generate', methods=['POST'])
        def generate_character():
            return self.generate_character()
    
    def get_conversations_list(self):
        """
        获取所有会话列表
        
        返回:
            - success: 是否成功
            - conversations: 会话列表
        """
        try:
            conversations = self.conversation_service.get_all_conversations()
            return jsonify({
                "success": True,
                "conversations": conversations
            })
        except Exception as e:
            logger.error(f"Failed to get conversations list: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get conversations: {str(e)}"
            }), 500
    
    def get_conversation_settings(self):
        """
        Get conversation settings
        
        Query params:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
            - settings: Settings information
        """
        try:
            conversation_id = request.args.get('conversation_id')
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to get conversation settings: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get settings: {str(e)}"
            }), 500
    
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
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            settings = self.conversation_service.create_or_update_settings(
                conversation_id=conversation_id,
                title=data.get('title'),
                background=data.get('background'),
                characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                outline=data.get('outline'),
                allow_auto_generate_characters=data.get('allow_auto_generate_characters')
            )
            
            return jsonify({
                "success": True,
                "settings": settings
            })
        
        except Exception as e:
            logger.error(f"Failed to create/update settings: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to save settings: {str(e)}"
            }), 500
    
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
            
            if not background:
                return jsonify({
                    "success": False,
                    "error": "background is required"
                }), 400
            
            provider = data.get('provider')
            if not provider:
                # Try to get from app settings, default to deepseek
                try:
                    # For now, default to deepseek
                    # Could be improved to get from app settings if needed
                    provider = 'deepseek'
                except Exception:
                    provider = 'deepseek'
            
            outline = self.conversation_service.generate_outline(
                background=background,
                characters=data.get('characters'),
                character_personality=data.get('character_personality'),
                provider=provider,
                model=data.get('model')
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
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
    
    def confirm_outline(self):
        """
        Confirm outline, can start generating story
        
        Request body:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to confirm outline: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to confirm outline: {str(e)}"
            }), 500
    
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
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to update progress: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to update progress: {str(e)}"
            }), 500
    
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
    
    def set_language(self):
        """
        Set language setting
        
        Request body:
            - language: Language code ('zh' or 'en')
        
        Returns:
            - success: Success flag
            - language: Language code
        """
        try:
            data = request.json or {}
            language = data.get('language')
            
            if not language:
                return jsonify({
                    "success": False,
                    "error": "language is required"
                }), 400
            
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
        except ValueError as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Failed to set language: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to set language: {str(e)}"
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not name:
                return jsonify({
                    "success": False,
                    "error": "name is required"
                }), 400
            
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
            - provider: AI provider (required)
            - model: Model name (optional)
            - character_hints: Optional hints for character generation
        
        Returns:
            - success: Success flag
            - character: Generated character information (name and personality)
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            provider = data.get('provider')
            if not provider:
                provider = 'deepseek'
            model = data.get('model')
            
            # Get settings from database
            settings = self.conversation_service.get_settings(conversation_id)
            if not settings:
                return jsonify({
                    "success": False,
                    "error": "Conversation settings not found. Please save settings first."
                }), 404
            
            background = settings.get('background')
            if not background:
                return jsonify({
                    "success": False,
                    "error": "Background is required. Please provide background in settings first."
                }), 400
            
            # Get existing characters from settings
            existing_characters = settings.get('characters', [])
            
            # Get appeared characters from database
            appeared_characters = []
            if self.character_service:
                appeared_characters = self.character_service.get_characters(
                    conversation_id=conversation_id,
                    include_unavailable=True
                )
            
            # Get recent story content to provide context
            recent_content = ""
            try:
                messages = self.chat_service.get_conversation(conversation_id, limit=10)
                recent_messages = [msg for msg in messages if msg.get('role') == 'assistant']
                if recent_messages:
                    recent_content = "\n".join([msg.get('content', '')[:500] for msg in recent_messages[-3:]])
            except Exception as e:
                logger.warning(f"Failed to get recent messages for character generation: {str(e)}")
            
            character_hints = data.get('character_hints', '')
            
            # Get language setting
            language = self.app_settings_service.get_language()
            
            # Build prompt for character generation
            prompt_parts = []
            if language == 'zh':
                prompt_parts.append("请根据以下故事背景，生成一个合适的新人物。")
            else:
                prompt_parts.append("Please generate a suitable new character based on the following story background.")
            prompt_parts.append("")
            
            if language == 'zh':
                prompt_parts.append("故事背景：")
            else:
                prompt_parts.append("Story Background:")
            prompt_parts.append(background)
            prompt_parts.append("")
            
            # Add existing characters from settings
            if existing_characters:
                if language == 'zh':
                    prompt_parts.append("已有角色（从设定中）：")
                else:
                    prompt_parts.append("Existing Characters (from settings):")
                for char in existing_characters:
                    prompt_parts.append(f"- {char}")
                prompt_parts.append("")
            
            # Add appeared characters from database
            if appeared_characters:
                available_chars = [c for c in appeared_characters if not c.get('is_unavailable', False)]
                if available_chars:
                    if language == 'zh':
                        prompt_parts.append("已出场人物：")
                    else:
                        prompt_parts.append("Appeared Characters:")
                    for char in available_chars:
                        char_name = char.get('name', '')
                        is_main = char.get('is_main', False)
                        main_label = "（主要）" if language == 'zh' else " (Main)" if is_main else ""
                        prompt_parts.append(f"- {char_name}{main_label}")
                    prompt_parts.append("")
            
            # Add recent story content for context
            if recent_content:
                if language == 'zh':
                    prompt_parts.append("最近的故事内容（供参考）：")
                else:
                    prompt_parts.append("Recent Story Content (for reference):")
                prompt_parts.append(recent_content[:1000])  # Limit to 1000 chars
                prompt_parts.append("")
            
            if character_hints:
                if language == 'zh':
                    prompt_parts.append("角色提示：")
                else:
                    prompt_parts.append("Character Hints:")
                prompt_parts.append(character_hints)
                prompt_parts.append("")
            
            if language == 'zh':
                prompt_parts.append(
                    "请生成一个新角色的信息，包括：\n"
                    "1. 角色姓名\n"
                    "2. 角色性格和设定（简要描述，100字左右）\n\n"
                    "请按照以下格式返回：\n"
                    "姓名：[角色姓名]\n"
                    "设定：[角色性格和设定描述]"
                )
            else:
                prompt_parts.append(
                    "Please generate information for a new character, including:\n"
                    "1. Character name\n"
                    "2. Character personality and settings (brief description, around 100 words)\n\n"
                    "Please return in the following format:\n"
                    "Name: [Character Name]\n"
                    "Setting: [Character personality and setting description]"
                )
            
            prompt = "\n".join(prompt_parts)
            
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
                
                # Parse response
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
                
                if character_name:
                    return jsonify({
                        "success": True,
                        "character": {
                            "name": character_name,
                            "personality": character_personality or ''
                        }
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": "Failed to parse character name from AI response"
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "error": result.get('error', 'Failed to generate character')
                }), 500
        
        except Exception as e:
            logger.error(f"Failed to generate character: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to generate character: {str(e)}"
            }), 500

