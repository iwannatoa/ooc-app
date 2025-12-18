"""
Flask 应用主入口
"""
import sys
import os
from pathlib import Path

# 添加 server 目录到 Python 路径
server_dir = Path(__file__).parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

from flask import Flask
from flask_cors import CORS
from config import get_config
from utils.logger import setup_logger
from api import api_bp

# 设置日志
logger = setup_logger(__name__)

# 创建 Flask 应用
app = Flask(__name__)

# 加载配置
config = get_config()
app.config.from_object(config)

# 启用 CORS
if config.CORS_ENABLED:
    CORS(app)

# 注册蓝图
app.register_blueprint(api_bp)

# 设置最大内容长度
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH


@app.route('/')
def index():
    """根路径"""
    return {
        "name": "OOC Flask API",
        "version": "1.0.0",
        "status": "running"
    }


@app.errorhandler(404)
def not_found(error):
    """404 错误处理"""
    return {
        "success": False,
        "error": "Endpoint not found"
    }, 404


@app.errorhandler(500)
def internal_error(error):
    """500 错误处理"""
    logger.error(f"Internal server error: {str(error)}", exc_info=True)
    return {
        "success": False,
        "error": "Internal server error"
    }, 500


if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info(f"Environment: {config.__class__.__name__}")
    logger.info(f"Host: {config.HOST}, Port: {config.PORT}")
    logger.info(f"Debug: {config.DEBUG}")
    
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        use_reloader=False
    )
