"""
会话设置控制器
"""
from flask import Flask, request, jsonify
from injector import inject
from src.service.conversation_service import ConversationService
from src.service.story_service import StoryService
from src.service.ai_service import AIService
from src.service.ai_config_service import AIConfigService
from src.utils.logger import get_logger
from src.utils.exceptions import APIError, ValidationError

logger = get_logger(__name__)


class SettingsController:
    """会话设置控制器类"""
    
    @inject
    def __init__(
        self,
        conversation_service: ConversationService,
        story_service: StoryService,
        ai_service: AIService,
        ai_config_service: AIConfigService
    ):
        """
        初始化控制器（通过依赖注入）
        
        Args:
            conversation_service: 会话设置服务实例（自动注入）
            story_service: 故事服务实例（自动注入）
            ai_service: AI 服务实例（自动注入）
            ai_config_service: AI 配置服务实例（自动注入）
        """
        self.conversation_service = conversation_service
        self.story_service = story_service
        self.ai_service = ai_service
        self.ai_config_service = ai_config_service
    
    def register_routes(self, app: Flask):
        """
        注册控制器路由到 Flask 应用
        
        Args:
            app: Flask 应用实例
        """
        # 会话设置相关路由
        @app.route('/api/conversations/list', methods=['GET'])
        def get_conversations_list():
            """获取所有会话列表（包含设置）"""
            return self.get_conversations_list()
        
        @app.route('/api/conversation/settings', methods=['GET'])
        def get_conversation_settings():
            """获取会话设置"""
            return self.get_conversation_settings()
        
        @app.route('/api/conversation/settings', methods=['POST'])
        def create_or_update_settings():
            """创建或更新会话设置"""
            return self.create_or_update_settings()
        
        @app.route('/api/conversation/generate-outline', methods=['POST'])
        def generate_outline():
            """AI生成大纲"""
            return self.generate_outline()
        
        @app.route('/api/conversation/progress', methods=['GET'])
        def get_progress():
            """获取故事进度"""
            return self.get_progress()
        
        @app.route('/api/conversation/progress/confirm-outline', methods=['POST'])
        def confirm_outline():
            """确认大纲"""
            return self.confirm_outline()
        
        @app.route('/api/conversation/progress', methods=['POST'])
        def update_progress():
            """更新故事进度"""
            return self.update_progress()
    
    def get_conversations_list(self):
        """
        获取所有会话列表（包含设置）
        
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
        获取会话设置
        
        查询参数:
            - conversation_id: 会话ID（必需）
        
        返回:
            - success: 是否成功
            - settings: 设置信息
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
        创建或更新会话设置
        
        请求体:
            - conversation_id: 会话ID（必需）
            - title: 会话标题（可选）
            - background: 故事背景（可选）
            - characters: 人物列表（可选，数组）
            - character_personality: 人物性格（可选，对象）
            - outline: 大纲（可选）
        
        返回:
            - success: 是否成功
            - settings: 保存的设置（不包含 API Key）
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
                outline=data.get('outline')
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
        AI生成故事大纲
        
        请求体:
            - background: 故事背景（必需）
            - characters: 人物列表（可选，数组）
            - character_personality: 人物性格（可选，对象）
            - provider: AI提供商（必需，ollama 或 deepseek）
            - model: 模型名称（可选，如果不提供则使用全局配置的默认模型）
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取，无需前端传递
        
        返回:
            - success: 是否成功
            - outline: 生成的大纲内容
        """
        try:
            data = request.json or {}
            background = data.get('background')
            conversation_id = data.get('conversation_id')
            
            if not background:
                return jsonify({
                    "success": False,
                    "error": "background is required"
                }), 400
            
            provider = data.get('provider')
            if not provider:
                return jsonify({
                    "success": False,
                    "error": "provider is required (ollama or deepseek)"
                }), 400
            
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
        获取故事进度
        
        查询参数:
            - conversation_id: 会话ID（必需）
        
        返回:
            - success: 是否成功
            - progress: 进度信息
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
        确认大纲，可以开始生成故事
        
        请求体:
            - conversation_id: 会话ID（必需）
        
        返回:
            - success: 是否成功
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
        更新故事进度
        
        请求体:
            - conversation_id: 会话ID（必需）
            - current_section: 当前章节编号（可选）
            - total_sections: 总章节数（可选）
            - status: 状态（可选）
        
        返回:
            - success: 是否成功
            - progress: 更新后的进度
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

