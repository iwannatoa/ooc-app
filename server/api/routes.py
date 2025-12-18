"""
API 路由定义
"""
import sys
from pathlib import Path
from flask import request, jsonify
import threading
import time
import os

# 添加 server 目录到 Python 路径
server_dir = Path(__file__).parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

from api import api_bp
from services.ai_service import AIService
from utils.logger import get_logger
from utils.exceptions import APIError, ValidationError, ProviderError

logger = get_logger(__name__)

# 创建 AI 服务实例
ai_service = AIService()


@api_bp.route('/chat', methods=['POST'])
def chat():
    """
    聊天接口
    
    请求体:
        - provider: AI 提供商 (ollama, deepseek)
        - message: 用户消息
        - model: 模型名称
        - apiKey: API 密钥（DeepSeek 需要）
        - baseUrl: 自定义基础 URL
        - maxTokens: 最大令牌数
        - temperature: 温度参数
    
    返回:
        - success: 是否成功
        - response: AI 响应内容
        - model: 使用的模型
        - error: 错误信息（如果失败）
    """
    try:
        data = request.json or {}
        
        # 提取参数
        provider = data.get('provider', 'ollama')
        message = data.get('message', '')
        model = data.get('model', 'deepseek-chat')
        api_key = data.get('apiKey', '')
        base_url = data.get('baseUrl', '')
        max_tokens = data.get('maxTokens', 2048)
        temperature = data.get('temperature', 0.7)
        
        logger.info(
            f"Chat request - Provider: {provider}, "
            f"Model: {model}, Message length: {len(message)}"
        )
        
        # 调用 AI 服务
        result = ai_service.chat(
            provider=provider,
            message=message,
            model=model,
            api_key=api_key,
            base_url=base_url,
            max_tokens=max_tokens,
            temperature=temperature
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


@api_bp.route('/models', methods=['GET'])
def get_models():
    """
    获取可用模型列表（仅支持 Ollama）
    
    返回:
        - success: 是否成功
        - models: 模型列表
        - error: 错误信息（如果失败）
    """
    try:
        provider = request.args.get('provider', 'ollama')
        logger.info(f"Fetching models for provider: {provider}")
        
        result = ai_service.get_models(provider=provider)
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


@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    健康检查接口
    
    返回:
        - status: 健康状态 (healthy, unhealthy)
        - ollama_available: Ollama 是否可用
        - error: 错误信息（如果有）
    """
    try:
        provider = request.args.get('provider', 'ollama')
        result = ai_service.health_check(provider=provider)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "ollama_available": False,
            "error": str(e)
        }), 503


@api_bp.route('/stop', methods=['POST'])
def stop_server():
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

