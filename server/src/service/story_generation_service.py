"""
Story generation service layer
"""
from typing import List, Optional, Dict, TYPE_CHECKING, Generator, Tuple, Literal
import json
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.chat_service import ChatService
from service.conversation_service import ConversationService
from service.summary_service import SummaryService
from service.story_service import StoryService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from utils.system_prompt import (
    build_system_prompt,
    build_feedback_prompt,
    FeedbackOperation,
)
from utils.i18n import get_i18n_text
from utils.prompt_template_loader import PromptTemplateLoader
from config import get_config
from utils.story_context_selection import select_messages_for_ai_context
from infrastructure.database import unit_of_work
from utils.logger import get_logger

if TYPE_CHECKING:
    from service.character_service import CharacterService

logger = get_logger(__name__)


def merge_story_llm_overrides(api_config: Dict, settings: Optional[Dict]) -> Dict:
    """Apply optional per-story overrides from ``additional_settings`` (JSON on conversation)."""
    if not settings:
        return api_config
    add = settings.get("additional_settings")
    if not isinstance(add, dict):
        return api_config
    out = dict(api_config)
    st = add.get("storyTemperature")
    sm = add.get("storyMaxTokens")
    try:
        if st is not None and str(st).strip() != "":
            out["temperature"] = float(st)
    except (TypeError, ValueError):
        pass
    try:
        if sm is not None and str(sm).strip() != "":
            out["max_tokens"] = int(sm)
    except (TypeError, ValueError):
        pass
    return out


def _prepend_task_anchor(
    language: str,
    flow: Literal["generate", "continue"],
    body: str,
    chapter_number: int,
    current_section: Optional[int],
    total_sections: Optional[int],
) -> str:
    """Prefix one-line task anchor from templates (finite vs open serialization)."""
    template = PromptTemplateLoader.get_template(language)
    anchors = template.get("user_task_anchor") or {}
    finite = total_sections is not None
    if flow == "generate":
        key = "generate_finite" if finite else "generate_open"
    else:
        key = "continue_finite" if finite else "continue_open"
    fmt = anchors.get(key)
    if not fmt:
        return body
    if finite:
        cur = (current_section if current_section is not None else 0) + 1
        line = fmt.format(chapter=chapter_number, total=total_sections, current=cur)
    else:
        line = fmt.format(chapter=chapter_number)
    return f"{line}\n{body}"


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

    def _story_api_config(
        self, conversation_id: str, provider: str, model: Optional[str]
    ) -> Dict:
        settings = self.conversation_service.get_settings(conversation_id)
        api = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model,
        )
        return merge_story_llm_overrides(api, settings)

    def _record_characters_from_message(
        self,
        conversation_id: str,
        message_id: int,
        content: str,
        settings: Optional[Dict]
    ) -> Tuple[str, List[str]]:
        """
        Record characters from generated message
        
        Args:
            conversation_id: Conversation ID
            message_id: Message ID
            content: Message content (may include <CHARACTERS> tags)
            settings: Conversation settings
        
        Returns:
            (cleaned story content without character tags, parse_warning codes)
        """
        if not self.character_service or not settings:
            return content, []
        
        predefined_chars = settings.get('characters', [])
        allow_auto = settings.get('allow_auto_generate_characters', True)
        # Get more granular control from additional_settings
        additional_settings = settings.get('additional_settings', {}) or {}
        allow_auto_main = additional_settings.get('allow_auto_generate_main_characters', True)
        
        try:
            # Parse content to extract story and character information
            story_content, character_info, parse_warnings = (
                self.character_service.parse_story_with_characters(content)
            )
            
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
            return story_content, parse_warnings
        except Exception as e:
            logger.warning(f"Failed to record characters: {str(e)}")
            # Return original content if parsing fails
            return content, ["character_parse_exception"]
    
    def generate_story_section(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        Generate a story section
        
        Args:
            conversation_id: Conversation ID
            provider: AI provider
            model: Model name, if not provided, use default model from global config
            
        Note: Configuration parameters like apiKey, baseUrl, maxTokens, temperature will be automatically retrieved from global config in database
        
        Returns:
            Generation result dictionary
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

        api_config = self._story_api_config(conversation_id, provider, model)

        self.story_service.update_progress(
            conversation_id=conversation_id,
            status='generating'
        )
        
        messages, system_prompt = self._prepare_generation_context(
            conversation_id, context_kind="story_generate"
        )
        
        language = self.app_settings_service.get_language()
        # Get current section number for chapter information
        current_section = None
        total_sections_hint: Optional[int] = None
        if isinstance(progress, dict):
            current_section = progress.get('current_section')
            ts_raw = progress.get("total_sections")
            total_sections_hint = int(ts_raw) if ts_raw is not None else None
        
        # Build user message with chapter information if available
        if current_section is not None:
            chapter_number = current_section + 1  # Convert from 0-based to 1-based
            template = PromptTemplateLoader.get_template(language)
            user_message_template = template.get('user_messages', {}).get('generate_current_section_with_chapter', '')
            if user_message_template:
                user_message = user_message_template.format(chapter_number=chapter_number)
            else:
                # Fallback to default message if template not found
                user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        else:
            chapter_number = 1
            user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        user_message = _prepend_task_anchor(
            language,
            "generate",
            user_message,
            chapter_number,
            current_section,
            total_sections_hint,
        )
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
            clean_content, parse_warnings = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            if parse_warnings:
                result['parse_warnings'] = parse_warnings

            with unit_of_work() as session:
                self.chat_service.save_user_message(
                    conversation_id, user_message, session=session
                )
                self.chat_service.save_assistant_message(
                    conversation_id=conversation_id,
                    content=clean_content,  # Save cleaned content without character tags
                    model=result.get('model'),
                    provider=api_config['provider'],
                    session=session,
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
                    status='completed',
                    session=session,
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
        Stream generate a story section
        
        Args:
            conversation_id: Conversation ID
            provider: AI provider
            model: Model name, if not provided, use default model from global config
        
        Yields:
            Text chunks
        """
        # Check if outline exists in database
        settings = self.conversation_service.get_settings(conversation_id)
        if not settings or not settings.get('outline'):
            language = self.app_settings_service.get_language()
            error_msg = get_i18n_text(language, 'error_messages.outline_required')
            yield json.dumps({"error": error_msg}) + "\n"
            return
        
        progress = self.story_service.get_progress(conversation_id)

        api_config = self._story_api_config(conversation_id, provider, model)

        self.story_service.update_progress(
            conversation_id=conversation_id,
            status='generating'
        )
        
        messages, system_prompt = self._prepare_generation_context(
            conversation_id, context_kind="story_generate"
        )
        
        language = self.app_settings_service.get_language()
        # Get current section number for chapter information
        current_section = None
        total_sections_hint: Optional[int] = None
        if isinstance(progress, dict):
            current_section = progress.get('current_section')
            ts_raw = progress.get("total_sections")
            total_sections_hint = int(ts_raw) if ts_raw is not None else None
        
        # Build user message with chapter information if available
        if current_section is not None:
            chapter_number = current_section + 1  # Convert from 0-based to 1-based
            template = PromptTemplateLoader.get_template(language)
            user_message_template = template.get('user_messages', {}).get('generate_current_section_with_chapter', '')
            if user_message_template:
                user_message = user_message_template.format(chapter_number=chapter_number)
            else:
                # Fallback to default message if template not found
                user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        else:
            chapter_number = 1
            user_message = get_i18n_text(language, 'user_messages.generate_current_section')
        user_message = _prepend_task_anchor(
            language,
            "generate",
            user_message,
            chapter_number,
            current_section,
            total_sections_hint,
        )
        
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
                # Skip empty chunks to avoid sending unnecessary data
                if not chunk or not chunk.strip():
                    continue
                
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
                clean_content, parse_warnings = self._record_characters_from_message(
                    conversation_id=conversation_id,
                    message_id=0,  # Will be set after message is saved
                    content=accumulated_content,
                    settings=settings
                )

                with unit_of_work() as session:
                    self.chat_service.save_user_message(
                        conversation_id, user_message, session=session
                    )
                    self.chat_service.save_assistant_message(
                        conversation_id=conversation_id,
                        content=clean_content,  # Save cleaned content without character tags
                        model=api_config['model'],
                        provider=api_config['provider'],
                        session=session,
                    )

                    current_progress = self.story_service.get_progress(
                        conversation_id, session=session
                    )
                    if isinstance(current_progress, dict):
                        current_section = current_progress.get('current_section', 0)
                    elif progress and isinstance(progress, dict):
                        current_section = progress.get('current_section', 0)
                    else:
                        current_section = 0

                    self.story_service.update_progress(
                        conversation_id=conversation_id,
                        last_generated_content=clean_content,
                        last_generated_section=current_section,
                        status='completed',
                        session=session,
                    )
                
                # Check if summary is needed
                result = {"success": True, "response": accumulated_content}
                self._check_and_mark_summary_needed(conversation_id, result)
                if parse_warnings:
                    yield json.dumps({"parse_warnings": parse_warnings}) + "\n"
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

        api_config = self._story_api_config(conversation_id, provider, model)

        messages, system_prompt = self._prepare_generation_context(
            conversation_id, current_section=new_section, context_kind="story_generate"
        )
        
        language = self.app_settings_service.get_language()
        template = PromptTemplateLoader.get_template(language)
        # Add chapter information to continue_story message
        chapter_number = new_section + 1  # Convert from 0-based to 1-based
        ts_raw = progress.get("total_sections") if isinstance(progress, dict) else None
        total_sections_hint = int(ts_raw) if ts_raw is not None else None
        continue_story_template = template.get('user_messages', {}).get('continue_story_with_chapter', '')
        if continue_story_template:
            user_message = continue_story_template.format(chapter_number=chapter_number)
        else:
            # Fallback to default continue_story message if template not found
            user_message = template['user_messages']['continue_story']
        user_message = _prepend_task_anchor(
            language,
            "continue",
            user_message,
            chapter_number,
            new_section,
            total_sections_hint,
        )
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
            clean_content, parse_warnings = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            if parse_warnings:
                result['parse_warnings'] = parse_warnings
            
            self.chat_service.save_user_message(conversation_id, user_message)
            self.chat_service.save_assistant_message(
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
        model: Optional[str] = None,
        feedback_operation: Optional[FeedbackOperation] = None,
    ) -> Dict:
        """
        Rewrite current section
        
        Args:
            conversation_id: Conversation ID
            feedback: User feedback/rewrite request
            provider: AI provider (ollama or deepseek)
            model: Model name (uses default from global config if not provided)
            feedback_operation: When ``modify`` or ``rewrite``, skip keyword-based detection.
        
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

        api_config = self._story_api_config(conversation_id, provider, model)

        messages, system_prompt = self._prepare_generation_context(
            conversation_id, context_kind="story_feedback"
        )
        
        language = self.app_settings_service.get_language()
        user_message = build_feedback_prompt(
            feedback,
            previous_content,
            language,
            forced_operation=feedback_operation,
        )
        
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
                        story_content, character_info, _ = self.character_service.parse_story_with_characters(
                            last_assistant_msg['content']
                        )
                        
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
            clean_content, parse_warnings = self._record_characters_from_message(
                conversation_id=conversation_id,
                message_id=0,  # Will be set after message is saved
                content=response_content,
                settings=settings
            )
            if parse_warnings:
                result['parse_warnings'] = parse_warnings
            
            self.chat_service.save_user_message(conversation_id, feedback)
            self.chat_service.save_assistant_message(
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
            model=model,
            feedback_operation="modify",
        )
    
    def _prepare_generation_context(
        self,
        conversation_id: str,
        current_section: Optional[int] = None,
        *,
        context_kind: Literal["story_generate", "story_feedback"] = "story_generate",
    ) -> tuple[List[Dict], str]:
        """
        Prepare generation context
        
        Args:
            conversation_id: Conversation ID
            current_section: Current section number, if not provided, get from progress
            context_kind: Controls which optional system blocks are included.
        
        Returns:
            (Messages list, System prompt)
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
        
        all_messages = self.chat_service.get_conversation(conversation_id)
        
        estimated_system_tokens = self.summary_service.estimate_tokens(
            build_system_prompt(
                background=settings.get('background') if settings else None,
                characters=settings.get('characters') if settings else None,
                character_personality=settings.get('character_personality') if settings else None,
                outline=settings.get('outline') if settings else None,
                summary=summary_text,
                current_section=current_section,
                total_sections=total_sections,
                appeared_characters=appeared_characters,
                supplement=supplement,
                language=language,
                context_kind=context_kind,
                history_truncated=False,
                older_via_summary=False,
            )
        )
        
        messages_for_ai, history_truncated, older_via_summary = select_messages_for_ai_context(
            all_messages,
            summary_text=summary_text,
            estimated_system_tokens=estimated_system_tokens,
            estimate_tokens=self.summary_service.estimate_tokens,
            recent_messages_with_summary=self.config.RECENT_MESSAGES_WITH_SUMMARY,
            max_message_history=self.config.MAX_MESSAGE_HISTORY,
            max_context_tokens=self.config.MAX_CONTEXT_TOKENS,
        )
        
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
            language=language,
            context_kind=context_kind,
            history_truncated=history_truncated,
            older_via_summary=older_via_summary,
        )
        
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

