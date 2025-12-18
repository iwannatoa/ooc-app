"""
Flask 应用主入口
"""
import sys
from pathlib import Path

# 添加 server/src 目录到 Python 路径
src_dir = Path(__file__).parent
server_dir = src_dir.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

from flask import Flask
from flask_cors import CORS
from flask_injector import FlaskInjector
from injector import inject
from src.config import get_config
from src.utils.logger import setup_logger
from src.di.module import AppModule
from src.controller.chat_controller import ChatController
from src.controller.settings_controller import SettingsController

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

# 设置最大内容长度
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

# 配置依赖注入（类似 Spring 的 ApplicationContext）
injector = FlaskInjector(app=app, modules=[AppModule()])


# 根路径
@app.route('/')
def index():
    """根路径"""
    return {
        "name": "OOC Flask API",
        "version": "1.0.0",
        "status": "running"
    }


# 注册控制器路由（在依赖注入配置后）
# 从注入器获取 controller 实例并注册路由
with app.app_context():
    chat_controller = injector.injector.get(ChatController)
    chat_controller.register_routes(app)
    
    settings_controller = injector.injector.get(SettingsController)
    settings_controller.register_routes(app)


# 应用级别的路由（健康检查和停止服务器）
@app.route('/api/health', methods=['GET'])
@inject
def health_check(chat_controller: ChatController):
    """健康检查"""
    return chat_controller.health_check()


@app.route('/api/stop', methods=['POST'])
@inject
def stop_server(chat_controller: ChatController):
    """停止服务器"""
    return chat_controller.stop_server()


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

