# Copyright © 2016-2025 Patrick Zhang.
# All Rights Reserved.
"""
Flask application entry point
"""
import sys
import os
from pathlib import Path

# Add server/src to Python path
src_dir = Path(__file__).parent
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))
server_dir = src_dir.parent

# Development mode: set DB_PATH if not set
if not os.getenv('DB_PATH'):
    is_dev = os.getenv('FLASK_ENV', '').lower() == 'development' or \
             os.getenv('FLASK_DEBUG', '').lower() == 'true' or \
             os.getenv('DEV', '').lower() == 'true'
    
    if is_dev:
        local_db_dir = server_dir / 'data' / 'local'
        local_db_dir.mkdir(parents=True, exist_ok=True)
        local_db_path = str(local_db_dir / 'chat.db')
        os.environ['DB_PATH'] = local_db_path

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_injector import FlaskInjector
from config import get_config
from utils.logger import setup_logger
from di.module import AppModule
from controller.chat_controller import ChatController
from controller.settings_controller import SettingsController

# Setup logger
logger = setup_logger(__name__)

# Create Flask app
app = Flask(__name__)

# Load config
config = get_config()
app.config.from_object(config)

# Enable CORS
if config.CORS_ENABLED:
    CORS(app)

# Set max content length
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

injector = FlaskInjector(app=app, modules=[AppModule()])


@app.route('/')
def index():
    return {
        "name": "OOC Flask API",
        "version": "1.0.0",
        "status": "running"
    }


# Register controller routes after dependency injection
with app.app_context():
    chat_controller_instance = injector.injector.get(ChatController)
    chat_controller_instance.register_routes(app)
    
    settings_controller = injector.injector.get(SettingsController)
    settings_controller.register_routes(app)


@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        from service.ai_service import AIService
        
        provider = request.args.get('provider', 'ollama')
        
        # Get AIService from injector
        with app.app_context():
            ai_service = injector.injector.get(AIService)
            result = ai_service.health_check(provider=provider)
            return jsonify(result)
    
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "ollama_available": False,
            "error": str(e)
        }), 503


@app.route('/api/stop', methods=['POST'])
def stop_server():
    import threading
    import time
    
    def shutdown():
        time.sleep(1)
        func = request.environ.get('werkzeug.server.shutdown')
        if func is None:
            raise RuntimeError('Not running with the Werkzeug Server')
        func()
    
    threading.Thread(target=shutdown).start()
    return jsonify({
        "success": True,
        "message": "Server is shutting down"
    })


@app.errorhandler(404)
def not_found(error):
    return {
        "success": False,
        "error": "Endpoint not found"
    }, 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}", exc_info=True)
    return {
        "success": False,
        "error": "Internal server error"
    }, 500


if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info(f"Environment: {config.__class__.__name__}")
    logger.info(f"Host: {config.HOST}")
    logger.info(f"Debug: {config.DEBUG}")
    
    from werkzeug.serving import make_server
    import socket
    requested_port = int(os.getenv('FLASK_PORT', '0'))
    if requested_port == 0:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        requested_port = s.getsockname()[1]
        s.close()
    
    server = make_server(config.HOST, requested_port, app)
    actual_port = server.server_port
    
    print(f"FLASK_PORT:{actual_port}", flush=True)
    
    logger.info(f"Server running on http://{config.HOST}:{actual_port}")
    
    server.serve_forever()

