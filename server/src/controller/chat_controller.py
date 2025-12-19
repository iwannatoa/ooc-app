"""
Chat controller
"""
from flask import Flask, request, jsonify
from injector import inject
import json
import threading
import time
import os
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
from utils.logger import get_logger
from utils.exceptions import APIError, ValidationError, ProviderError
from utils.stream_response import create_stream_response
from utils.i18n import get_i18n_text
from utils.controller_helpers import error_response, handle_errors
import re

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
        app_settings_service: AppSettingsService
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
        
        @app.route('/api/conversation/delete-last-message', methods=['POST'])
        def delete_last_message():
            return self.delete_last_message()
    
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
        
        language = self.app_settings_service.get_language()
        if not message:
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
            message=message,
            provider=provider,
            conversation_id=data.get('conversation_id'),
            model=data.get('model')
        )
        
        return jsonify(result)
    
    def _strip_think_content(self, text: str) -> str:
        """
        Remove think content from AI response
        
        Args:
            text: Response text that may contain think content
        
        Returns:
            Text with think content removed
        """
        # Remove <think>...</think> tags
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove ```think\n...\n``` code blocks
        text = re.sub(r'```think\s*\n.*?\n```', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove standalone ```think``` markers
        text = re.sub(r'```think\s*```', '', text, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        text = text.strip()
        
        return text
    
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
            conversation_id = data.get('conversation_id')
            
            language = self.app_settings_service.get_language()
            if not message:
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
                return self.ai_service_streaming.chat_stream(
                    provider=api_config['provider'],
                    message=message,
                    model=api_config['model'],
                    api_key=api_config['api_key'],
                    base_url=api_config['base_url'],
                    max_tokens=api_config['max_tokens'],
                    temperature=api_config['temperature'],
                    messages=messages if messages else None
                )
            
            # Define on_complete callback to save messages
            def on_complete(accumulated_content: str):
                # Remove think content from final text before saving
                final_content = self._strip_think_content(accumulated_content)
                
                # Save messages after streaming completes
                try:
                    self.chat_service.save_user_message(conversation_id, message)
                    self.chat_service.save_assistant_message(
                        conversation_id=conversation_id,
                        content=final_content,
                        model=api_config['model'],
                        provider=api_config['provider']
                    )
                except Exception as e:
                    logger.warning(f"Failed to save messages: {str(e)}")
            
            return create_stream_response(
                stream_generator=stream_generator(),
                on_complete=on_complete
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
            
            result = self.story_generation_service.rewrite_section(
                conversation_id=conversation_id,
                feedback=feedback,
                provider=provider,
                model=data.get('model')
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
    
    def get_models(self):
        """
        获取可用模型列表
        
        返回:
            - success: 是否成功
            - models: 模型列表
            - error: 错误信息
        """
        try:
            provider = request.args.get('provider', 'ollama')
            logger.info(f"Fetching models for provider: {provider}")
            
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
        健康检查接口
        
        返回:
            - status: 健康状态 (healthy, unhealthy)
            - ollama_available: Ollama 是否可用
            - error: 错误信息
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
    
    def stop_server(self):
        """
        停止服务器接口
        
        返回:
            - success: 是否成功
            - message: 消息
        """
        def shutdown():
            time.sleep(1)
            os._exit(0)
        
        logger.info("Server shutdown requested")
        threading.Thread(target=shutdown, daemon=True).start()
        
        return jsonify({
            "success": True,
            "message": "Server is shutting down"
        })
    
    @handle_errors
    def get_conversation(self):
        """
        获取会话消息列表
        
        查询参数:
            - conversation_id: 会话ID
            - limit: 限制数量
            - offset: 偏移量
        
        返回:
            - success: 是否成功
            - messages: 消息列表
            - error: 错误信息
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
        获取所有会话ID列表
        
        返回:
            - success: 是否成功
            - conversations: 会话ID列表
            - count: 会话数量
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
        删除会话
        
        请求体:
            - conversation_id: 会话ID
        
        返回:
            - success: 是否成功
            - message: 消息
        """
        data = request.json or {}
        conversation_id = data.get('conversation_id')
        language = self.app_settings_service.get_language()
        
        if not conversation_id:
            return error_response(language, 'error_messages.conversation_id_required')
        
        deleted = self.chat_service.delete_conversation(conversation_id)
        
        return jsonify({
            "success": deleted,
            "message": "Conversation deleted" if deleted else "Conversation not found"
        })
    
    @handle_errors
    def get_summary(self):
        """
        获取会话总结
        
        查询参数:
            - conversation_id: 会话ID
        
        返回:
            - success: 是否成功
            - summary: 总结内容
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
        生成会话总结
        
        请求体:
            - conversation_id: 会话ID
            - provider: AI提供商，ollama 或 deepseek
            - model: 模型名称，如果不提供则使用全局配置的默认模型
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取，无需前端传递
        
        返回:
            - success: 是否成功
            - summary: 生成的总结内容
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
        保存会话总结
        
        请求体:
            - conversation_id: 会话ID
            - summary: 总结内容
        
        返回:
            - success: 是否成功
            - summary: 保存的总结
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
            
            message_id = self.chat_service.delete_last_message(conversation_id)
            
            if message_id:
                # Handle character records
                self.character_service.handle_message_deletion(
                    conversation_id=conversation_id,
                    message_id=message_id
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

