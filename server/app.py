import sys
import os
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Ollama API configuration
OLLAMA_BASE_URL = "http://localhost:11434"

@app.route('/api/chat', methods=['POST'])
def chat_with_ollama():
    try:
        data = request.json
        message = data.get('message', '')
        model = data.get('model', 'deepseek-chat')
        
        logger.info(f"Received request - Model: {model}, Message length: {len(message)}")
        
        # Call Ollama API
        ollama_response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": message,
                "stream": False
            },
            timeout=None
        )
        
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            logger.info(f"Ollama response successful: {result}")
            return jsonify({
                "success": True,
                "response": result.get('response', ''),
                "model": model
            })
        else:
            logger.error(f"Ollama API error: {ollama_response.status_code}")
            return jsonify({
                "success": False,
                "error": f"Ollama API error: {ollama_response.status_code}"
            }), 500
            
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
        if response.status_code == 200:
            models_data = response.json()
            return jsonify({
                "success": True,
                "models": models_data.get('models', [])
            })
        else:
            return jsonify({
                "success": False,
                "error": "Unable to fetch model list"
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to connect to Ollama: {str(e)}"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        return jsonify({
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "ollama_available": response.status_code == 200
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "ollama_available": False,
            "error": str(e)
        }), 503

@app.route('/api/stop', methods=['POST'])
def stop_server():
    """Stop Flask server"""
    def shutdown():
        time.sleep(1)
        os._exit(0)
    
    threading.Thread(target=shutdown).start()
    return jsonify({"success": True, "message": "Server is shutting down"})

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
