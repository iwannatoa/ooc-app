# Copyright © 2016-2025 Patrick Zhang.
# All Rights Reserved.
"""
Flask application entry point
"""
import sys
import os
import secrets
from pathlib import Path

# Set UTF-8 encoding for stdout/stderr to support Chinese characters
# This must be done before any imports that might use logging
if sys.platform == 'win32':
    # On Windows, set default encoding to UTF-8
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    if hasattr(sys.stderr, 'reconfigure'):
        try:
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    # Set environment variable for subprocesses
    os.environ['PYTHONIOENCODING'] = 'utf-8'

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
        # Enable debug logging in development mode
        if not os.getenv('LOG_LEVEL_DEBUG'):
            os.environ['LOG_LEVEL_DEBUG'] = 'true'

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_injector import FlaskInjector
from config import ProductionConfig, get_config
from infrastructure.database import create_schema, get_engine, init_engine
from infrastructure.schema_migrations import apply_schema_migrations
from repository.character_record_repository import apply_character_record_migrations
from repository.conversation_repository import apply_conversation_settings_migrations
from middleware.api_auth import register_api_auth
from middleware.request_context import register_request_context
from utils.db_path import get_database_path
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

is_production = config is ProductionConfig
if not getattr(config, 'FLASK_API_TOKEN', None) and not is_production:
    generated_token = secrets.token_urlsafe(32)
    os.environ['FLASK_API_TOKEN'] = generated_token
    app.config['FLASK_API_TOKEN'] = generated_token
    logger.info('FLASK_API_TOKEN not provided; generated an in-memory development token')

if not os.getenv('FLASK_INSTANCE_ID'):
    os.environ['FLASK_INSTANCE_ID'] = secrets.token_hex(16)
app.config['FLASK_INSTANCE_ID'] = os.getenv('FLASK_INSTANCE_ID', '')

if is_production and not getattr(config, 'FLASK_API_TOKEN', None):
    logger.error('Production mode requires FLASK_API_TOKEN for API authentication')
    raise SystemExit(1)

# Single SQLite engine + schema (repositories share session factory via Injector)
init_engine(get_database_path())
create_schema()
apply_schema_migrations(get_engine())
apply_conversation_settings_migrations(get_engine())
apply_character_record_migrations(get_engine())

# CORS: scoped to /api/* with explicit origins (no wildcard)
if config.CORS_ENABLED and config.CORS_ORIGINS:
    CORS(
        app,
        resources={
            r'/api/*': {
                'origins': list(config.CORS_ORIGINS),
                'methods': list(config.CORS_ALLOW_METHODS),
                'allow_headers': list(config.CORS_ALLOW_HEADERS),
                'expose_headers': list(config.CORS_EXPOSE_HEADERS),
                'supports_credentials': True,
            }
        },
    )
elif config.CORS_ENABLED:
    logger.warning('CORS_ENABLED is True but CORS_ORIGINS is empty; CORS middleware not applied')

# Set max content length
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

register_api_auth(app)
register_request_context(app)

injector = FlaskInjector(app=app, modules=[AppModule()])

# Global server instance for shutdown
_server_instance = None


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
        
        ai_service = injector.injector.get(AIService)
        result = ai_service.health_check(provider=provider)
        if isinstance(result, dict):
            result = dict(result)
            result['instance_id'] = app.config.get('FLASK_INSTANCE_ID')
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
    
    logger.info("=" * 60)
    logger.info("Flask server received shutdown request...")
    logger.info("=" * 60)

    expected_instance_id = (app.config.get('FLASK_INSTANCE_ID') or '').strip()
    presented_instance_id = (request.headers.get('X-Flask-Instance-Id') or '').strip()
    if expected_instance_id and presented_instance_id != expected_instance_id:
        logger.warning(
            'Rejecting /api/stop: instance ownership mismatch (presented=%s)',
            presented_instance_id or '<empty>',
        )
        return jsonify({
            "success": False,
            "error": "Instance ownership mismatch",
        }), 409
    
    if _server_instance:
        def shutdown():
            # Give a small delay to ensure the response is sent first
            time.sleep(0.1)
            try:
                logger.info("Shutting down server via server.shutdown()")
                # shutdown() will stop accepting new requests and wait for current requests to complete
                # Since we're in a separate thread, this won't block the current request
                _server_instance.shutdown()
                logger.info("Server shutdown completed")
                logger.info("=" * 60)
            except Exception as e:
                logger.error(f"Error during shutdown: {e}")
                logger.info("=" * 60)
        
        # Start shutdown in a separate thread (non-daemon so it completes)
        shutdown_thread = threading.Thread(target=shutdown, daemon=False)
        shutdown_thread.start()
        
        # Return response immediately - shutdown will happen in background
        # The shutdown() call will wait for this request to complete before actually shutting down
        return jsonify({
            "success": True,
            "message": "Server shutdown initiated"
        })
    else:
        # Started without make_server (e.g. embedded WSGI): cannot trigger shutdown from here.
        logger.warning(
            "POST /api/stop received but _server_instance is unset; "
            "host process must terminate this Python process."
        )
        logger.info("=" * 60)
        return jsonify({
            "success": False,
            "error": (
                "Graceful shutdown is unavailable (_server_instance not set). "
                "The parent/host process should terminate this worker."
            ),
        }), 503


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
    
    _server_instance = make_server(config.HOST, requested_port, app)
    actual_port = _server_instance.server_port
    
    print(f"FLASK_PORT:{actual_port}", flush=True)
    
    logger.info(f"Server running on http://{config.HOST}:{actual_port}")
    
    _server_instance.serve_forever()

