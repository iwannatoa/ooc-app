"""
Chat controller
"""
from flask import Flask, request, jsonify
from injector import inject
import threading
import time
import os
from service.chat_orchestration_service import ChatOrchestrationService
from service.summary_service import SummaryService
from service.summary_orchestration_service import SummaryOrchestrationService
from service.story_generation_service import StoryGenerationService
from service.ai_service import AIService
from service.chat_service import ChatService
from service.character_service import CharacterService
from utils.logger import get_logger
from utils.exceptions import APIError, ValidationError, ProviderError

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
        chat_service: ChatService,
        character_service: CharacterService
    ):
        """
        Initialize controller
        
        Args:
            chat_orchestration_service: Chat orchestration service instance
            summary_service: Summary service instance
            summary_orchestration_service: Summary orchestration service instance
            story_generation_service: Story generation service instance
            ai_service: AI service instance
            chat_service: Chat record service instance
        """
        self.chat_orchestration_service = chat_orchestration_service
        self.summary_service = summary_service
        self.summary_orchestration_service = summary_orchestration_service
        self.story_generation_service = story_generation_service
        self.ai_service = ai_service
        self.chat_service = chat_service
        self.character_service = character_service
    
    def register_routes(self, app: Flask):
        """
        Register controller routes to Flask app
        
        Args:
            app: Flask app instance
        """
        @app.route('/api/chat', methods=['POST'])
        def chat():
            return self.chat()
        
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
        try:
            data = request.json or {}
            message = data.get('message', '')
            provider = data.get('provider')
            
            if not message:
                return jsonify({
                    "success": False,
                    "error": "message is required"
                }), 400
            
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
            result = self.chat_orchestration_service.process_chat(
                message=message,
                provider=provider,
                conversation_id=data.get('conversation_id'),
                model=data.get('model')
            )
            
            return jsonify(result)
        
        except ValidationError as e:
            logger.warning(f"Validation error: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except ProviderError as e:
            logger.error(f"Provider error ({e.provider}): {e.message}")
            return jsonify(e.to_dict()), e.status_code
        
        except Exception as e:
            logger.error(f"Unexpected error in chat endpoint: {str(e)}", exc_info=True)
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not feedback:
                return jsonify({
                    "success": False,
                    "error": "feedback is required"
                }), 400
            
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not feedback:
                return jsonify({
                    "success": False,
                    "error": "feedback is required"
                }), 400
            
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
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
        try:
            conversation_id = request.args.get('conversation_id')
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get conversation: {str(e)}"
            }), 500
    
    def get_all_conversations(self):
        """
        获取所有会话ID列表
        
        返回:
            - success: 是否成功
            - conversations: 会话ID列表
            - count: 会话数量
        """
        try:
            conversations = self.chat_service.get_all_conversations()
            return jsonify({
                "success": True,
                "conversations": conversations,
                "count": len(conversations)
            })
        except Exception as e:
            logger.error(f"Failed to get all conversations: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get conversations: {str(e)}"
            }), 500
    
    def delete_conversation(self):
        """
        删除会话
        
        请求体:
            - conversation_id: 会话ID
        
        返回:
            - success: 是否成功
            - message: 消息
        """
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            deleted = self.chat_service.delete_conversation(conversation_id)
            
            return jsonify({
                "success": deleted,
                "message": "Conversation deleted" if deleted else "Conversation not found"
            })
        
        except Exception as e:
            logger.error(f"Failed to delete conversation: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to delete conversation: {str(e)}"
            }), 500
    
    def get_summary(self):
        """
        获取会话总结
        
        查询参数:
            - conversation_id: 会话ID
        
        返回:
            - success: 是否成功
            - summary: 总结内容
        """
        try:
            conversation_id = request.args.get('conversation_id')
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to get summary: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to get summary: {str(e)}"
            }), 500
    
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
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
            result = self.summary_orchestration_service.generate_summary(
                conversation_id=conversation_id,
                provider=provider,
                model=data.get('model')
            )
            
            if not result.get('success'):
                return jsonify(result), 400
            
            return jsonify(result)
        
        except Exception as e:
            logger.error(f"Failed to generate summary: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to generate summary: {str(e)}"
            }), 500
    
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
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            summary_text = data.get('summary')
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
            if not summary_text:
                return jsonify({
                    "success": False,
                    "error": "summary is required"
                }), 400
            
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
        
        except Exception as e:
            logger.error(f"Failed to save summary: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "error": f"Failed to save summary: {str(e)}"
            }), 500
    
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
            
            if not conversation_id:
                return jsonify({
                    "success": False,
                    "error": "conversation_id is required"
                }), 400
            
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

