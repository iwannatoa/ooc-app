"""
Story generation service layer
"""
from typing import Optional, Dict, List, TYPE_CHECKING, Generator
import json
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.chat_service import ChatService
from service.conversation_service import ConversationService
from service.summary_service import SummaryService
from service.story_service import StoryService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from utils.system_prompt import build_system_prompt, build_feedback_prompt
from utils.i18n import get_i18n_text
from config import get_config
from utils.logger import get_logger

if TYPE_CHECKING:
    from service.character_service import CharacterService

logger = get_logger(__name__)


class StoryGenerationService:
    """Story generation service"""
    
    def __init__(
        self,
        ai_service: AIService,
        ai_service_streaming: AIServiceStreaming,
        chat_service: ChatService,
        conversation_service: ConversationService,
        summary_service: SummaryService,
        story_service: StoryService,
        ai_config_service: AIConfigService,
        app_settings_service: AppSettingsService,
        character_service: Optional['CharacterService'] = None
    ):
        """
        Initialize service
        
        Args:
            ai_service: AI service instance
            chat_service: Chat service instance
            conversation_service: Conversation service instance
            summary_service: Summary service instance
            story_service: Story service instance
            ai_config_service: AI config service instance
            app_settings_service: App settings service instance
        """
        self.ai_service = ai_service
        self.ai_service_streaming = ai_service_streaming
        self.chat_service = chat_service
        self.conversation_service = conversation_service
        self.summary_service = summary_service
        self.story_service = story_service
        self.ai_config_service = ai_config_service
        self.app_settings_service = app_settings_service
        self.character_service = character_service
        self.config = get_config()
    
    def _record_characters_from_message(
        self,
        conversation_id: str,
        message_id: int,
        content: str,
        settings: Optional[Dict]
    ) -> str:
        """
        Record characters from generated message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID
            content: Message content (may include <CHARACTERS> tags)
            settings: Conversation settings
        
        Returns:
            Cleaned story content (without character tags)
        """
        if not self.character_service or not settings:
            return content
        
        predefined_chars = settings.get('characters', [])
        allow_auto = settings.get('allow_auto_generate_characters', True)
        # Get more granular control from additional_settings
        additional_settings = settings.get('additional_settings', {}) or {}
        allow_auto_main = additional_settings.get('allow_auto_generate_main_characters', True)
        
        try:
            # Parse content to extract story and character information
            story_content, character_info = self.character_service.parse_story_with_characters(content)
            
            # Record characters using AI-extracted information (preferred)
            self.character_service.record_characters_from_message(
                conversation_id=conversation_id,
                message_id=message_id,
                content=story_content,  # Use cleaned story content
                predefined_characters=predefined_chars,
                allow_auto_generate=allow_auto,
                allow_auto_generate_main=allow_auto_main,
                ai_extracted_characters=character_info.get("new") if character_info.get("new") else None,
                ai_extracted_characters_with_settings=character_info.get("new_with_settings") if character_info.get("new_with_settings") else None,
                ai_status_changes=character_info.get("status_changes") if character_info.get("status_changes") else None
            )
            
            # Return cleaned story content
            return story_content
        except Exception as e:
            logger.warning(f"Failed to record characters: {str(e)}")
            # Return original content if parsing fails
            return content
    
    def generate_story_section(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        生成故事的一个部分
        
        Args:
            conversation_id: 会话ID
            provider: AI提供商
            model: 模型名称，如果不提供则使用全局配置的默认模型
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取
        
        Returns:
            生成结果字典
        """
        # Check if outline exists in database
        settings = self.conversation_service.get_settings(conversation_id)
        if not settings or not settings.get('outline'):
            language = self.app_settings_service.get_language()
            error_msg = get_i18n_text(language, 'error_messages.outline_required')
            return {
                "success": False,
                "error": error_msg
            }
        
        progress = self.story_service.get_progress(conversation_id)
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        self.story_service.update_progress(
            conversation_id=conversation_id,
            status='generating'
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id)
        
        language = self.app_settings_service.get_language()
        user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            # Remove think content before processing
            response_content = self.conversation_service._strip_think_content(response_content)
            
            # Record characters from generated content and get cleaned story content
            settings = self.conversation_service.get_settings(conversation_id)
            clean_content = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            
            self.chat_service.save_user_message(conversation_id, user_message)
            assistant_msg = self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=clean_content,  # Save cleaned content without character tags
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            # Ensure progress is a dict before calling .get()
            if isinstance(progress, dict):
                current_section = progress.get('current_section', 0) or 0
            else:
                current_section = 0
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=clean_content,  # Use cleaned content
                last_generated_section=current_section,
                status='completed'
            )
            
            self._check_and_mark_summary_needed(conversation_id, result)
            
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def generate_story_section_stream(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        流式生成故事的一个部分
        
        Args:
            conversation_id: 会话ID
            provider: AI提供商
            model: 模型名称，如果不提供则使用全局配置的默认模型
        
        Yields:
            文本块
        """
        # Check if outline exists in database
        settings = self.conversation_service.get_settings(conversation_id)
        if not settings or not settings.get('outline'):
            language = self.app_settings_service.get_language()
            error_msg = get_i18n_text(language, 'error_messages.outline_required')
            yield json.dumps({"error": error_msg}) + "\n"
            return
        
        progress = self.story_service.get_progress(conversation_id)
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        self.story_service.update_progress(
            conversation_id=conversation_id,
            status='generating'
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id)
        
        language = self.app_settings_service.get_language()
        user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        
        # Stream the response
        accumulated_content = ""
        try:
            for chunk in self.ai_service_streaming.chat_stream(
                provider=api_config['provider'],
                message=user_message,
                model=api_config['model'],
                api_key=api_config['api_key'],
                base_url=api_config['base_url'],
                max_tokens=api_config['max_tokens'],
                temperature=api_config['temperature'],
                system_prompt=system_prompt,
                messages=messages
            ):
                accumulated_content += chunk
                yield chunk
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in stream: {error_msg}", exc_info=True)
            # Also print to stderr for immediate visibility in Tauri
            import sys
            print(f"[ERROR] Error in stream: {error_msg}", file=sys.stderr, flush=True)
            yield json.dumps({"error": error_msg}) + "\n"
            return
        
        # Save messages after streaming completes
        if accumulated_content:
            try:
                # Remove think content before processing
                accumulated_content = self.conversation_service._strip_think_content(accumulated_content)
                
                # Record characters from generated content and get cleaned story content
                settings = self.conversation_service.get_settings(conversation_id)
                clean_content = self._record_characters_from_message(
                    conversation_id=conversation_id,
                    message_id=0,  # Will be set after message is saved
                    content=accumulated_content,
                    settings=settings
                )
                
                self.chat_service.save_user_message(conversation_id, user_message)
                assistant_msg = self.chat_service.save_assistant_message(
                    conversation_id=conversation_id,
                    content=clean_content,  # Save cleaned content without character tags
                    model=api_config['model'],
                    provider=api_config['provider']
                )
                
                # Get current section from progress (re-fetch to ensure we have the latest)
                current_progress = self.story_service.get_progress(conversation_id)
                if isinstance(current_progress, dict):
                    current_section = current_progress.get('current_section', 0)
                elif progress and isinstance(progress, dict):
                    current_section = progress.get('current_section', 0)
                else:
                    current_section = 0
                    
                self.story_service.update_progress(
                    conversation_id=conversation_id,
                    last_generated_content=accumulated_content,
                    last_generated_section=current_section,
                    status='completed'
                )
                
                # Check if summary is needed
                result = {"success": True, "response": accumulated_content}
                self._check_and_mark_summary_needed(conversation_id, result)
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error saving streamed content: {error_msg}", exc_info=True)
                # Also print to stderr for immediate visibility in Tauri
                import sys
                print(f"[ERROR] Error saving streamed content: {error_msg}", file=sys.stderr, flush=True)
    
    def confirm_section(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        Confirm current section, generate next section
        
        Args:
            conversation_id: Conversation ID
            provider: AI provider (ollama or deepseek)
            model: Model name (uses default from global config if not provided)
        
        Returns:
            Generation result dictionary
        """
        progress = self.story_service.get_progress(conversation_id)
        if not progress:
            language = self.app_settings_service.get_language()
            error_msg = get_i18n_text(language, 'error_messages.story_progress_not_found')
            return {
                "success": False,
                "error": error_msg
            }
        
        # Ensure progress is a dict
        if not isinstance(progress, dict):
            language = self.app_settings_service.get_language()
            error_msg = get_i18n_text(language, 'error_messages.invalid_progress_data')
            return {
                "success": False,
                "error": error_msg
            }
        
        new_section = (progress.get('current_section') or 0) + 1
        self.story_service.update_progress(
            conversation_id=conversation_id,
            current_section=new_section,
            status='generating'
        )
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id, current_section=new_section)
        
        language = self.app_settings_service.get_language()
        from utils.prompt_template_loader import PromptTemplateLoader
        template = PromptTemplateLoader.get_template(language)
        user_message = template['user_messages']['continue_story']
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            # Remove think content before processing
            response_content = self.conversation_service._strip_think_content(response_content)
            
            # Record characters from generated content and get cleaned story content
            settings = self.conversation_service.get_settings(conversation_id)
            clean_content = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            
            self.chat_service.save_user_message(conversation_id, user_message)
            assistant_msg = self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=clean_content,  # Save cleaned content without character tags
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=clean_content,  # Use cleaned content
                last_generated_section=new_section,
                status='completed'
            )
            
            self._check_and_mark_summary_needed(conversation_id, result)
            
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def rewrite_section(
        self,
        conversation_id: str,
        feedback: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        Rewrite current section
        
        Args:
            conversation_id: Conversation ID
            feedback: User feedback/rewrite request
            provider: AI provider (ollama or deepseek)
            model: Model name (uses default from global config if not provided)
        
        Returns:
            Generation result dictionary
        """
        progress = self.story_service.get_progress(conversation_id)
        language = self.app_settings_service.get_language()
        
        if not progress:
            error_msg = get_i18n_text(language, 'error_messages.story_progress_not_found')
            return {
                "success": False,
                "error": error_msg
            }
        
        # Ensure progress is a dict
        if not isinstance(progress, dict):
            error_msg = get_i18n_text(language, 'error_messages.invalid_progress_data')
            return {
                "success": False,
                "error": error_msg
            }
        
        previous_content = progress.get('last_generated_content')
        if not previous_content:
            error_msg = get_i18n_text(language, 'error_messages.no_content_to_rewrite')
            return {
                "success": False,
                "error": error_msg
            }
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id)
        
        language = self.app_settings_service.get_language()
        user_message = build_feedback_prompt(feedback, previous_content, language)
        
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            # Remove think content before processing
            response_content = self.conversation_service._strip_think_content(response_content)
            
            # Before recording new characters, revert character status changes from the previous assistant message
            # Get the last assistant message to revert its character changes
            if self.character_service:
                last_assistant_msg = self.chat_service.get_last_assistant_message(conversation_id)
                if last_assistant_msg and last_assistant_msg.get('content'):
                    try:
                        # Parse the previous message to find character status changes and revert them
                        story_content, character_info = self.character_service.parse_story_with_characters(last_assistant_msg['content'])
                        
                        # Revert status changes that occurred in the previous message
                        if character_info.get("status_changes"):
                            for char_name, status_changes in character_info["status_changes"].items():
                                existing_char = self.character_service.repository.get_character(conversation_id, char_name)
                                if existing_char:
                                    # Revert status changes
                                    updates = {}
                                    if "is_main" in status_changes:
                                        if status_changes["is_main"]:
                                            updates["is_main"] = False
                                    if "is_unavailable" in status_changes:
                                        if status_changes["is_unavailable"]:
                                            updates["is_unavailable"] = False
                                        else:
                                            updates["is_unavailable"] = True
                                    
                                    if updates:
                                        self.character_service.repository.update_character(
                                            conversation_id=conversation_id,
                                            name=char_name,
                                            **updates
                                        )
                                        logger.info(f"Reverted status changes for character {char_name} before rewrite")
                    except Exception as e:
                        logger.warning(f"Failed to revert character status changes before rewrite: {str(e)}")
                        # Don't fail the rewrite if status reversion fails
            
            # Record characters from generated content and get cleaned story content
            settings = self.conversation_service.get_settings(conversation_id)
            clean_content = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            
            self.chat_service.save_user_message(conversation_id, feedback)
            assistant_msg = self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=clean_content,  # Save cleaned content without character tags
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=clean_content,  # Use cleaned content
                status='completed'
            )
            
            self._check_and_mark_summary_needed(conversation_id, result)
            
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def modify_section(
        self,
        conversation_id: str,
        feedback: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        Modify current section (similar to rewrite, but semantically more like adjustment)
        
        Args:
            conversation_id: Conversation ID
            feedback: User feedback/modification request
            provider: AI provider (ollama or deepseek)
            model: Model name (uses default from global config if not provided)
        
        Returns:
            Generation result dictionary
        """
        return self.rewrite_section(
            conversation_id=conversation_id,
            feedback=feedback,
            provider=provider,
            model=model
        )
    
    def _prepare_generation_context(
        self,
        conversation_id: str,
        current_section: Optional[int] = None
    ) -> tuple[List[Dict], str]:
        """
        准备生成上下文
        
        Args:
            conversation_id: 会话ID
            current_section: 当前部分编号，如果不提供则从进度中获取
        
        Returns:
            (消息列表, 系统提示)
        """
        settings = self.conversation_service.get_settings(conversation_id)
        
        progress = self.story_service.get_progress(conversation_id)
        if current_section is None:
            if isinstance(progress, dict):
                current_section = progress.get('current_section')
            else:
                current_section = None
        if isinstance(progress, dict):
            total_sections = progress.get('total_sections')
        else:
            total_sections = None
        
        summary = self.summary_service.get_summary(conversation_id)
        summary_text = summary.get('summary') if summary else None
        
        # Get language setting
        language = self.app_settings_service.get_language()
        
        # Get appeared characters
        appeared_characters = None
        if self.character_service:
            appeared_characters = self.character_service.get_characters(
                conversation_id=conversation_id,
                include_unavailable=True
            )
        
        # Get supplement from additional_settings
        supplement = None
        if settings and settings.get('additional_settings'):
            additional_settings = settings.get('additional_settings')
            if isinstance(additional_settings, dict):
                supplement = additional_settings.get('supplement')
        
        # Build system prompt
        system_prompt = build_system_prompt(
            background=settings.get('background') if settings else None,
            characters=settings.get('characters') if settings else None,
            character_personality=settings.get('character_personality') if settings else None,
            outline=settings.get('outline') if settings else None,
            summary=summary_text,
            current_section=current_section,
            total_sections=total_sections,
            appeared_characters=appeared_characters,
            supplement=supplement,
            language=language
        )
        
        all_messages = self.chat_service.get_conversation(conversation_id)
        
        estimated_system_tokens = self.summary_service.estimate_tokens(system_prompt)
        
        messages_for_ai = []
        if summary_text:
            recent_count = self.config.RECENT_MESSAGES_WITH_SUMMARY
            recent_messages = all_messages[-recent_count:] if len(all_messages) > recent_count else all_messages
            messages_for_ai = [
                {"role": msg.get('role', 'user'), "content": msg.get('content', '')}
                for msg in recent_messages
            ]
        else:
            max_history = self.config.MAX_MESSAGE_HISTORY
            max_tokens = self.config.MAX_CONTEXT_TOKENS
            
            selected_messages = []
            current_tokens = estimated_system_tokens
            
            for msg in reversed(all_messages):
                msg_content = msg.get('content', '')
                msg_tokens = self.summary_service.estimate_tokens(msg_content)
                
                if current_tokens + msg_tokens > max_tokens and len(selected_messages) > 0:
                    break
                
                if len(selected_messages) >= max_history:
                    break
                
                selected_messages.insert(0, msg)
                current_tokens += msg_tokens
            
            messages_for_ai = [
                {"role": msg.get('role', 'user'), "content": msg.get('content', '')}
                for msg in selected_messages
            ]
        
        return messages_for_ai, system_prompt
    
    def _check_and_mark_summary_needed(self, conversation_id: str, result: Dict):
        """
        Check if summary is needed and mark in result
        
        Args:
            conversation_id: Conversation ID
            result: Result dictionary
        """
        updated_messages = self.chat_service.get_conversation(conversation_id)
        message_count = len(updated_messages)
        
        should_summarize = self.summary_service.should_summarize(
            conversation_id=conversation_id,
            message_count=message_count,
            threshold=self.config.SUMMARY_THRESHOLD,
            estimated_tokens_per_message=self.config.ESTIMATED_TOKENS_PER_MESSAGE
        )
        
        if should_summarize:
            result['needs_summary'] = True
            result['message_count'] = message_count
        else:
            result['needs_summary'] = False

