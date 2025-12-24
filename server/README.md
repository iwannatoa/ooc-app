# OOC Flask API Server

Flask API server providing a unified AI chat interface, supporting Ollama and DeepSeek.

## Project Structure

```
server/
├── app.py                 # Flask application main entry point
├── build.py               # Build script
├── requirements.txt       # Python dependencies
├── src/                   # Source code directory
│   ├── config/           # Configuration module
│   │   └── config.py     # Application configuration
│   ├── controller/       # Controller layer (similar to Spring's @RestController)
│   │   └── chat_controller.py
│   ├── service/          # Service layer (similar to Spring's @Service)
│   │   ├── ai_service.py
│   │   ├── ollama_service.py
│   │   └── deepseek_service.py
│   ├── utils/            # Utility modules
│   │   ├── logger.py
│   │   └── exceptions.py
│   └── di/               # Dependency injection configuration
│       └── module.py
├── build/                # Build output
└── dist/                 # Distribution files
```

## Architecture

### Controller-Service Architecture

Adopts a layered architecture similar to Spring MVC:

- **Controller Layer**: Handles HTTP requests and responses
- **Service Layer**: Business logic processing
- **Dependency Injection**: Uses Flask-Injector for automatic dependency injection

### Dependency Injection

Uses Flask-Injector for dependency injection, similar to Spring's `@Autowired`:

- `ChatController` automatically injects `AIService`
- `AIService` automatically injects `OllamaService` and `DeepSeekService`
- All services are registered as singletons

## Usage

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Server

```bash
# Method 1: Use startup script (recommended)
python run.py

# Method 2: Run directly
python src/app.py
```

### Environment Variables

You can configure the server through environment variables:

```bash
# Flask configuration
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=false
FLASK_ENV=development

# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_REQUEST_TIMEOUT=300

# DeepSeek configuration
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_TIMEOUT=60

# Logging configuration
LOG_LEVEL=INFO
```

### Build Executable

```bash
python build.py
```

## API Endpoints

### POST /api/chat

Send a chat request.

**Request Body:**
```json
{
  "provider": "ollama" | "deepseek",
  "message": "User message",
  "model": "Model name",
  "apiKey": "API key (required for DeepSeek)",
  "baseUrl": "Custom base URL (optional)",
  "maxTokens": 2048,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI response content",
  "model": "Model used"
}
```

### GET /api/models

Get list of available models (Ollama only).

**Query Parameters:**
- `provider`: Provider name (default: ollama)

**Response:**
```json
{
  "success": true,
  "models": [...]
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy" | "unhealthy",
  "ollama_available": true | false
}
```

### POST /api/stop

Stop the server.

## Design Principles

1. **Modularity**: Code is separated into different modules by functionality
2. **Dependency Injection**: Uses Flask-Injector for automatic dependency management
3. **Layered Architecture**: Clear Controller-Service separation
4. **Extensibility**: Easy to add new AI providers
5. **Error Handling**: Unified exception handling and error responses
6. **Logging**: Complete logging system
7. **Configuration Management**: Supports multi-environment configuration

## Adding New Providers

To add a new AI provider:

1. Create a new service class in the `src/service/` directory
2. Add support for the new provider in `src/service/ai_service.py`
3. Add the new provider's configuration in `src/config/config.py`
4. Register the new service in `src/di/module.py`
5. Add related methods in `src/controller/chat_controller.py` (if needed)
