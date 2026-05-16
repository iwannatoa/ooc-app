"""
Chat controller
"""
import json
from flask import Flask, request, jsonify
from injector import inject
from service.chat_orchestration_service import ChatOrchestrationService
from service.summary_service import SummaryService
from service.summary_orchestration_service import SummaryOrchestrationService
from service.story_generation_service import StoryGenerationService
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.chat_service import ChatService
from service.character_service import CharacterService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from service.conversation_service import ConversationService
from service.story_service import StoryService
from infrastructure.provider_capabilities import (
    get_provider_capability,
    apply_provider_multimodal_policy,
)
from utils.logger import get_logger
from utils.exceptions import APIError, ValidationError, ProviderError
from utils.stream_response import create_stream_response
from utils.i18n import get_i18n_text
from utils.controller_helpers import error_response, handle_errors
from utils.think_strip import strip_think_content

logger = get_logger(__name__)

class ChatController:
    """Chat controller"""
    
    @inject
    def __init__(
        self,
        chat_orchestration_service: ChatOrchestrationService,
        summary_service: SummaryService,
        summary_orchestration_service: SummaryOrchestrationService,
        story_generation_service: StoryGenerationService,
        ai_service: AIService,
        ai_service_streaming: AIServiceStreaming,
        chat_service: ChatService,
        character_service: CharacterService,
        ai_config_service: AIConfigService,
        app_settings_service: AppSettingsService,
        conversation_service: ConversationService,
        story_service: StoryService
    ):
        """
        Initialize controller
        
        Args:
            chat_orchestration_service: Chat orchestration service instance
            summary_service: Summary service instance
            summary_orchestration_service: Summary orchestration service instance
            story_generation_service: Story generation service instance
            ai_service: AI service instance
            ai_service_streaming: AI streaming service instance
            chat_service: Chat record service instance
            character_service: Character service instance
            ai_config_service: AI config service instance
            app_settings_service: App settings service instance
            conversation_service: Conversation service instance
            story_service: Story service instance
        """
        self.chat_orchestration_service = chat_orchestration_service
        self.summary_service = summary_service
        self.summary_orchestration_service = summary_orchestration_service
        self.story_generation_service = story_generation_service
        self.ai_service = ai_service
        self.ai_service_streaming = ai_service_streaming
        self.chat_service = chat_service
        self.character_service = character_service
        self.ai_config_service = ai_config_service
        self.app_settings_service = app_settings_service
        self.conversation_service = conversation_service
        self.story_service = story_service
    
    def register_routes(self, app: Flask):
        """
        Register controller routes to Flask app
        
        Args:
            app: Flask app instance
        """
        @app.route('/api/chat', methods=['POST'])
        def chat():
            return self.chat()
        
        @app.route('/api/chat-stream', methods=['POST'])
        def chat_stream():
            return self.chat_stream()
        
        @app.route('/api/models', methods=['GET'])
        def get_models():
            return self.get_models()
        
        @app.route('/api/conversations', methods=['GET'])
        def get_all_conversations():
            return self.get_all_conversations()
        
        @app.route('/api/conversation', methods=['GET'])
        def get_conversation():
            return self.get_conversation()
        
        @app.route('/api/conversation', methods=['DELETE'])
        def delete_conversation():
            return self.delete_conversation()
        
        @app.route('/api/conversation/summary', methods=['GET'])
        def get_summary():
            return self.get_summary()
        
        @app.route('/api/conversation/summary/generate', methods=['POST'])
        def generate_summary():
            return self.generate_summary()
        
        @app.route('/api/conversation/summary', methods=['POST'])
        def save_summary():
            return self.save_summary()
        
        @app.route('/api/story/generate', methods=['POST'])
        def generate_story_section():
            return self.generate_story_section()
        
        @app.route('/api/story/generate-stream', methods=['POST'])
        def generate_story_section_stream():
            return self.generate_story_section_stream()
        
        @app.route('/api/story/confirm', methods=['POST'])
        def confirm_section():
            return self.confirm_section()
        
        @app.route('/api/story/rewrite', methods=['POST'])
        def rewrite_section():
            return self.rewrite_section()
        
        @app.route('/api/story/modify', methods=['POST'])
        def modify_section():
            return self.modify_section()

        @app.route('/api/story/user-note', methods=['POST'])
        def save_user_note():
            return self.save_user_note()
        
        @app.route('/api/conversation/delete-last-message', methods=['POST'])
        def delete_last_message():
            return self.delete_last_message()

        @app.route('/api/conversation/assistant-variants', methods=['GET'])
        def get_assistant_variants():
            return self.get_assistant_variants()

        @app.route('/api/conversation/assistant-variants/restore', methods=['POST'])
        def restore_assistant_variant():
            return self.restore_assistant_variant()

        @app.route('/api/story/branches', methods=['GET'])
        def list_story_branches():
            return self.list_story_branches()

        @app.route('/api/story/branches', methods=['POST'])
        def create_story_branch():
            return self.create_story_branch()

        @app.route('/api/story/savepoint', methods=['POST'])
        def create_story_savepoint():
            return self.create_story_savepoint()

        @app.route('/api/story/savepoint', methods=['GET'])
        def list_story_savepoints():
            return self.list_story_savepoints()

        @app.route('/api/story/ending', methods=['POST'])
        def mark_story_ending():
            return self.mark_story_ending()

        @app.route('/api/story/ending', methods=['GET'])
        def list_story_endings():
            return self.list_story_endings()
    
    @handle_errors
    def chat(self):
        """
        Regular chat endpoint
        
        Request body:
            - provider: AI provider (ollama or deepseek)
            - message: User message
            - conversation_id: Conversation ID
            - model: Model name (uses default from global config if not provided)
        
        Returns:
            - success: Success flag
            - response: AI response content
            - conversation_id: Conversation ID
        """
        data = request.json or {}
        message = data.get('message', '')
        provider = data.get('provider')
        normalized = apply_provider_multimodal_policy(
            provider=provider,
            message=message,
            message_parts=data.get('message_parts'),
        )
        normalized_message = normalized.normalized_message
        content_type = normalized.content_type
        attachment_ref = normalized.attachment_ref
        
        language = self.app_settings_service.get_language()
        if not normalized_message:
            error_msg = get_i18n_text(language, 'error_messages.message_required')
            return jsonify({
                "success": False,
                "error": error_msg
            }), 400
        
        if not provider:
            error_msg = get_i18n_text(language, 'error_messages.provider_required')
            return jsonify({
                "success": False,
                "error": error_msg
            }), 400
        
        result = self.chat_orchestration_service.process_chat(
            message=normalized_message,
            provider=provider,
            conversation_id=data.get('conversation_id'),
            model=data.get('model'),
            content_type=content_type,
            attachment_ref=attachment_ref,
            language=language,
        )
        if normalized.provider_capability_notice:
            result['provider_capability_notice'] = normalized.provider_capability_notice
        
        return jsonify(result)
    
    def _strip_think_content(self, text: str) -> str:
        """Remove think content from AI response (delegates to shared util)."""
        return strip_think_content(text)
    
    def chat_stream(self):
        """
        Streaming chat endpoint
        
        Request body:
            - provider: AI provider (ollama or deepseek)
            - message: User message
            - conversation_id: Conversation ID
            - model: Model name (uses default from global config if not provided)
        
        Returns:
            SSE stream with chunks of AI response
        """
        try:
            data = request.json or {}
            message = data.get('message', '')
            provider = data.get('provider')
            normalized = apply_provider_multimodal_policy(
                provider=provider,
                message=message,
                message_parts=data.get('message_parts'),
            )
            normalized_message = normalized.normalized_message
            content_type = normalized.content_type
            attachment_ref = normalized.attachment_ref
            conversation_id = data.get('conversation_id')
            
            language = self.app_settings_service.get_language()
            if not normalized_message:
                error_msg = get_i18n_text(language, 'error_messages.message_required')
                return jsonify({
                    "success": False,
                    "error": error_msg
                }), 400
            
            if not provider:
                error_msg = get_i18n_text(language, 'error_messages.provider_required')
                return jsonify({
                    "success": False,
                    "error": error_msg
                }), 400
            
            if not conversation_id:
                import uuid
                conversation_id = str(uuid.uuid4())
            
            api_config = self.ai_config_service.get_config_for_api(
                provider=provider,
                model=data.get('model')
            )
            settings = (
                self.conversation_service.get_settings(conversation_id)
                if conversation_id
                else None
            )
            api_config = ChatOrchestrationService._merge_conversation_llm_overrides(
                api_config,
                settings,
            )
            
            # Get conversation history for context
            messages = []
            if conversation_id:
                history = self.chat_service.get_conversation(conversation_id, limit=10)
                messages = [
                    {"role": msg['role'], "content": msg['content']}
                    for msg in history
                ]
            
            # Create stream generator
            def stream_generator():
                if normalized.provider_capability_notice:
                    yield json.dumps({
                        "provider_capability_notice": normalized.provider_capability_notice
                    }, ensure_ascii=False)
                yield from self.ai_service_streaming.chat_stream(
                    provider=api_config['provider'],
                    message=normalized_message,
                    model=api_config['model'],
                    api_key=api_config['api_key'],
                    base_url=api_config['base_url'],
                    max_tokens=api_config['max_tokens'],
                    temperature=api_config['temperature'],
                    messages=messages if messages else None,
                    stop_words=api_config.get('stop_words'),
                )
            
            persist_metadata: dict = {}

            def on_complete(accumulated_content: str):
                final_content = self._strip_think_content(accumulated_content)
                try:
                    self.chat_service.save_user_message(
                        conversation_id=conversation_id,
                        message=normalized_message,
                        content_type=content_type,
                        attachment_ref=attachment_ref,
                    )
                    self.chat_service.save_assistant_message(
                        conversation_id=conversation_id,
                        content=final_content,
                        model=api_config['model'],
                        provider=api_config['provider'],
                        content_type=content_type,
                        attachment_ref=attachment_ref,
                    )
                except Exception:
                    logger.error(
                        "Failed to persist streamed chat messages",
                        exc_info=True,
                    )
                    persist_metadata['persist_failed'] = get_i18n_text(
                        language,
                        'error_messages.persist_chat_messages_failed',
                    )

            return create_stream_response(
                stream_generator=stream_generator(),
                on_complete=on_complete,
                persist_metadata=persist_metadata,
            )
        
        except ValidationError as e:
            logger.warning(f"Validation error: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except ProviderError as e:
            logger.error(f"Provider error ({e.provider}): {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except Exception as e:
            logger.error(f"Unexpected error in chat_stream endpoint: {str(e)}", exc_info=True)
            error = APIError(
                f"Server error: {str(e)}",
                status_code=500
            )
            return jsonify(error.to_dict()), 500

    @handle_errors
    def create_story_branch(self):
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        branch = self.chat_service.create_branch(
            conversation_id=conversation_id,
            parent_message_id=data.get('parent_message_id'),
            label=data.get('label'),
            branch_id=data.get('branch_id'),
        )
        return jsonify({"success": True, "branch": branch})

    @handle_errors
    def list_story_branches(self):
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        branches = self.chat_service.list_branches(conversation_id)
        return jsonify({"success": True, "branches": branches})

    @handle_errors
    def create_story_savepoint(self):
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        savepoint = self.chat_service.create_savepoint(
            conversation_id=conversation_id,
            message_id=data.get('message_id'),
            label=data.get('label'),
            savepoint_id=data.get('savepoint_id'),
        )
        return jsonify({"success": True, "savepoint": savepoint})

    @handle_errors
    def list_story_savepoints(self):
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        savepoints = self.chat_service.list_savepoints(conversation_id)
        return jsonify({"success": True, "savepoints": savepoints})

    @handle_errors
    def mark_story_ending(self):
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        ending_tag = data.get('ending_tag')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        if not ending_tag:
            return jsonify({"success": False, "error": "ending_tag is required"}), 400
        ending = self.chat_service.mark_ending(
            conversation_id=conversation_id,
            ending_tag=ending_tag,
            branch_id=data.get('branch_id'),
            message_id=data.get('message_id'),
        )
        return jsonify({"success": True, "ending": ending})

    @handle_errors
    def list_story_endings(self):
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        endings = self.chat_service.list_endings(conversation_id)
        return jsonify({"success": True, "endings": endings})
    
    def generate_story_section(self):
        """
        Generate story section
        
        Request body:
            - conversation_id: Conversation ID
            - provider: AI provider (ollama or deepseek)
            - model: Model name (uses default from global config if not provided)
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            provider = data.get('provider')
            
            language = self.app_settings_service.get_language()
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            if not provider:
                return error_response(language, 'error_messages.provider_required')
            
            result = self.story_generation_service.generate_story_section(
                conversation_id=conversation_id,
                provider=provider,
                model=data.get('model')
            )
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error in generate_story_section: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Server error: {str(e)}"
            }), 500
    
    def generate_story_section_stream(self):
        """
        Generate story section with streaming
        
        Request body:
            - conversation_id: Conversation ID
            - provider: AI provider (ollama or deepseek)
            - model: Model name (uses default from global config if not provided)
        
        Returns:
            SSE stream with chunks of story content
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            provider = data.get('provider')
            
            language = self.app_settings_service.get_language()
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            if not provider:
                return error_response(language, 'error_messages.provider_required')
            
            # Create stream generator
            def stream_generator():
                return self.story_generation_service.generate_story_section_stream(
                    conversation_id=conversation_id,
                    provider=provider,
                    model=data.get('model')
                )
            
            return create_stream_response(stream_generator=stream_generator())
        
        except ValidationError as e:
            logger.warning(f"Validation error: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except ProviderError as e:
            logger.error(f"Provider error ({e.provider}): {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except Exception as e:
            logger.error(f"Unexpected error in generate_story_section_stream endpoint: {str(e)}", exc_info=True)
            error = APIError(
                f"Server error: {str(e)}",
                status_code=500
            )
            return jsonify(error.to_dict()), 500
    
    def confirm_section(self):
        """
        Confirm current section, generate next section
        
        Request body:
            - conversation_id: Conversation ID
            - provider: AI provider (ollama or deepseek)
            - model: Model name (uses default from global config if not provided)
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            provider = data.get('provider')
            
            language = self.app_settings_service.get_language()
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            if not provider:
                return error_response(language, 'error_messages.provider_required')
            
            result = self.story_generation_service.confirm_section(
                conversation_id=conversation_id,
                provider=provider,
                model=data.get('model')
            )
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error in confirm_section: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Server error: {str(e)}"
            }), 500
    
    def rewrite_section(self):
        """
        Rewrite current section
        
        Request body:
            - conversation_id: Conversation ID
            - feedback: Rewrite requirements/feedback
            - provider: AI provider (ollama or deepseek)
            - model: Model name
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            feedback = data.get('feedback', '')
            provider = data.get('provider')
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            if not feedback:
                return error_response(language, 'error_messages.feedback_required')
            
            if not provider:
                return error_response(language, 'error_messages.provider_required')
            
            raw_op = data.get('feedback_operation')
            feedback_operation = (
                raw_op if raw_op in ('rewrite', 'modify') else None
            )
            result = self.story_generation_service.rewrite_section(
                conversation_id=conversation_id,
                feedback=feedback,
                provider=provider,
                model=data.get('model'),
                feedback_operation=feedback_operation,
            )
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error in rewrite_section: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Server error: {str(e)}"
            }), 500
    
    def modify_section(self):
        """
        Modify current section
        
        Request body:
            - conversation_id: Conversation ID
            - feedback: Modification requirements/feedback
            - provider: AI provider (ollama or deepseek)
            - model: Model name
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            feedback = data.get('feedback', '')
            provider = data.get('provider')
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            if not feedback:
                return error_response(language, 'error_messages.feedback_required')
            
            if not provider:
                return error_response(language, 'error_messages.provider_required')
            
            result = self.story_generation_service.modify_section(
                conversation_id=conversation_id,
                feedback=feedback,
                provider=provider,
                model=data.get('model')
            )
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Error in modify_section: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Server error: {str(e)}"
            }), 500

    def save_user_note(self):
        """Append a free-form user note as a normal user chat row (no AI call)."""
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        text = (data.get('text') or data.get('message') or '').strip()
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        if not text:
            return jsonify({'success': False, 'error': 'text_required'}), 400
        saved = self.chat_service.save_user_message(conversation_id, text)
        return jsonify({'success': True, 'message': saved})

    def get_models(self):
        """
        Get available models list
        
        Returns:
            - success: Whether successful
            - models: Models list
            - error: Error message
        """
        try:
            provider = request.args.get('provider', 'ollama')
            logger.info(f"Fetching models for provider: {provider}")

            capability = get_provider_capability(provider)
            if capability is None:
                raise ProviderError(
                    f"Unsupported provider: {provider}",
                    provider=provider,
                    status_code=400,
                )

            if provider != 'ollama':
                cfg = self.ai_config_service.get_config(provider, include_api_key=False)
                name = (cfg or {}).get('model') or 'configured-model'
                return jsonify({
                    'success': True,
                    'models': [{
                        'name': name,
                        'model': name,
                        'modified_at': '',
                        'size': 0,
                    }],
                })

            result = self.ai_service.get_models(provider=provider)
            return jsonify(result)
        
        except ProviderError as e:
            logger.error(f"Provider error: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except Exception as e:
            logger.error(f"Unexpected error in models endpoint: {str(e)}", exc_info=True)
            error = APIError(
                f"Failed to fetch models: {str(e)}",
                status_code=500
            )
            return jsonify(error.to_dict()), 500
    
    def health_check(self):
        """
        Health check endpoint
        
        Returns:
            - status: Health status (healthy, unhealthy)
            - ollama_available: Whether Ollama is available
            - error: Error message
        """
        try:
            provider = request.args.get('provider', 'ollama')
            result = self.ai_service.health_check(provider=provider)
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            return jsonify({
                "status": "unhealthy",
                "ollama_available": False,
                "error": str(e)
            }), 503
    
    @handle_errors
    def get_conversation(self):
        """
        Get conversation messages list
        
        Query parameters:
            - conversation_id: Conversation ID
            - limit: Limit count
            - offset: Offset
        
        Returns:
            - success: Whether successful
            - messages: Messages list
            - error: Error message
        """
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        messages = self.chat_service.get_conversation(
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )
        
        return jsonify({
            "success": True,
            "messages": messages,
            "conversation_id": conversation_id
        })
    
    @handle_errors
    def get_all_conversations(self):
        """
        Get all conversation IDs list
        
        Returns:
            - success: Whether successful
            - conversations: Conversation IDs list
            - count: Conversation count
        """
        conversations = self.chat_service.get_all_conversations()
        return jsonify({
            "success": True,
            "conversations": conversations,
            "count": len(conversations)
        })
    
    @handle_errors
    def delete_conversation(self):
        """
        Delete conversation and all related data
        
        Request body:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Whether successful
            - message: Message
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        # Delete all related data for the conversation
        deleted_messages = False
        deleted_settings = False
        deleted_summary = False
        deleted_characters = 0
        deleted_progress = False
        
        try:
            # 1. Delete chat messages
            deleted_messages = self.chat_service.delete_conversation(conversation_id)
            
            # 2. Delete conversation settings
            try:
                deleted_settings = self.conversation_service.delete_settings(conversation_id)
            except Exception as e:
                logger.warning(f"Failed to delete settings for conversation {conversation_id}: {str(e)}")
            
            # 3. Delete conversation summary
            try:
                deleted_summary = self.summary_service.delete_summary(conversation_id)
            except Exception as e:
                logger.warning(f"Failed to delete summary for conversation {conversation_id}: {str(e)}")
            
            # 4. Delete character records
            try:
                deleted_characters = self.character_service.delete_conversation_characters(conversation_id)
            except Exception as e:
                logger.warning(f"Failed to delete characters for conversation {conversation_id}: {str(e)}")
            
            # 5. Delete story progress
            try:
                deleted_progress = self.story_service.delete_progress(conversation_id)
            except Exception as e:
                logger.warning(f"Failed to delete progress for conversation {conversation_id}: {str(e)}")
            
            # Consider deletion successful if at least messages were deleted
            # (other data might not exist)
            success = deleted_messages
            
            logger.info(
                f"Deleted conversation {conversation_id}: "
                f"messages={deleted_messages}, settings={deleted_settings}, "
                f"summary={deleted_summary}, characters={deleted_characters}, "
                f"progress={deleted_progress}"
            )
            
            return jsonify({
                "success": success,
                "message": "Conversation deleted" if success else "Conversation not found"
            })
            
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {str(e)}", exc_info=True)
            error_msg = get_i18n_text(language, 'error_messages.server_error')
            return jsonify({
                "success": False,
                "error": f"{error_msg}: {str(e)}"
            }), 500
    
    @handle_errors
    def get_summary(self):
        """
        Get conversation summary
        
        Query parameters:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Whether successful
            - summary: Summary content
        """
        conversation_id = request.args.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        summary = self.summary_service.get_summary(conversation_id)
        if summary:
            return jsonify({
                "success": True,
                "summary": summary
            })
        else:
            return jsonify({
                "success": False,
                "error": "Summary not found"
            }), 404
    
    @handle_errors
    def generate_summary(self):
        """
        Generate conversation summary
        
        Request body:
            - conversation_id: Conversation ID
            - provider: AI provider, ollama or deepseek
            - model: Model name, if not provided, use default model from global config
            
        Note: Configuration parameters like apiKey, baseUrl, maxTokens, temperature will be automatically retrieved from global config in database, no need to pass from frontend
        
        Returns:
            - success: Whether successful
            - summary: Generated summary content
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        provider = data.get('provider')
        if not provider:
            return error_response(language, 'error_messages.provider_required')
        
        result = self.summary_orchestration_service.generate_summary(
            conversation_id=conversation_id,
            provider=provider,
            model=data.get('model')
        )
        
        if not result.get('success'):
            return jsonify(result), 400
        
        return jsonify(result)
    
    @handle_errors
    def save_summary(self):
        """
        Save conversation summary
        
        Request body:
            - conversation_id: Conversation ID
            - summary: Summary content
        
        Returns:
            - success: Whether successful
            - summary: Saved summary
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        summary_text = data.get('summary')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        if not summary_text:
            return error_response(language, 'error_messages.summary_required')
        
        messages = self.chat_service.get_conversation(conversation_id)
        message_count = len(messages)
        
        summary = self.summary_service.create_or_update_summary(
            conversation_id=conversation_id,
            summary=summary_text,
            message_count=message_count
        )
        
        return jsonify({
            "success": True,
            "summary": summary
        })
    
    def delete_last_message(self):
        """
        Delete the last message in a conversation
        
        Request body:
            - conversation_id: Conversation ID
        
        Returns:
            - success: Success flag
            - message: Status message
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            language = self.app_settings_service.get_language()
            
            if not conversation_id:
                return error_response(language, 'error_messages.conversation_id_required')
            
            deleted_message = self.chat_service.delete_last_message(conversation_id)
            
            if deleted_message:
                # Handle character records
                self.character_service.handle_message_deletion(
                    conversation_id=conversation_id,
                    message_id=deleted_message.get('id'),
                    message_content=deleted_message.get('content') if deleted_message.get('role') == 'assistant' else None,
                    message_role=deleted_message.get('role')
                )
                return jsonify({
                    "success": True,
                    "message": "Last message deleted successfully"
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "No message found to delete"
                }), 404
        
        except Exception as e:
            logger.error(f"Failed to delete last message: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to delete last message: {str(e)}"
            }), 500

    def get_assistant_variants(self):
        data = request.args
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        rows = self.chat_service.get_assistant_variants(conversation_id, limit=50)
        return jsonify({
            "success": True,
            "variants": rows,
        })

    def restore_assistant_variant(self):
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        message_id = data.get('message_id')
        language = self.app_settings_service.get_language()
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        if message_id is None:
            return jsonify({
                "success": False,
                "error": "message_id is required",
            }), 400
        try:
            message_id_int = int(message_id)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "error": "invalid message_id",
            }), 400

        restored = self.chat_service.restore_assistant_variant(
            conversation_id=conversation_id,
            message_id=message_id_int,
        )
        if not restored:
            return jsonify({
                "success": False,
                "error": "Variant message not found",
            }), 404

        self.story_service.update_progress(
            conversation_id=conversation_id,
            last_generated_content=restored.get("content"),
            status='completed',
        )
        return jsonify({
            "success": True,
            "restored": restored,
        })

