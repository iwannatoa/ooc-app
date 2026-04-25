# OOC Story Creator

A desktop AI-powered story creation application built with Tauri, React, and Flask. The application allows users to create and manage interactive stories with AI assistance, supporting multiple AI providers including Ollama and DeepSeek.

## Features

- 🤖 **AI-Powered Story Generation**: Generate story content using Ollama or DeepSeek AI
- 📚 **Story Management**: Create, save, and manage multiple stories with custom settings
- 🎨 **Interactive Story Creation**: Use button-based actions (generate, confirm, rewrite, modify, add settings) instead of direct message input (the desktop UI does not expose a free-form chat box; story progression is driven by these actions)
- 📖 **Story Settings**: Configure story background, characters, character personalities, and outlines
- 🔄 **Story Summarization**: Automatically summarize long stories to manage context window and reduce token usage
- 🌍 **Internationalization**: Support for Chinese and English
- 💾 **Persistent Storage**: All data stored in local SQLite database
- 🎯 **System Prompts**: Dynamically generated prompts based on story context and settings
- 🔧 **Flexible Configuration**: Manage AI provider settings, API keys, and application preferences

## Testing

### Backend Tests

Backend tests use pytest. Install test dependencies:

```bash
cd server
pip install -r requirements-test.txt
```

Run tests:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_character_service.py
```

### Frontend Tests

Frontend tests use Vitest and React Testing Library. Run tests:

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

See `server/tests/README.md` and `src/test/README.md` for more details.

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Desktop Framework**: Tauri 2
- **State Management**: Redux Toolkit
- **Styling**: SCSS Modules
- **Internationalization**: Custom i18n system with JSON files
- **Build Tool**: Vite

### Backend
- **Framework**: Flask (Python)
- **Dependency Injection**: Flask-Injector
- **ORM**: SQLAlchemy
- **Database**: SQLite
- **Architecture**: Controller-Service-Repository pattern
- **Build Tool**: PyInstaller

### Rust
- **Language**: Rust (for Tauri backend)
- **Async Runtime**: Tokio

## Project Structure

```
ooc-app/
├── src/                      # React frontend source code
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Redux store and slices
│   ├── i18n/                # Internationalization (JSON files)
│   ├── mock/                # Mock data for development
│   └── types/               # TypeScript type definitions
│
├── src-tauri/               # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   └── commands.rs     # Tauri commands (IPC)
│   └── tauri.conf.json     # Tauri configuration
│
└── server/                  # Flask Python backend
    ├── src/
    │   ├── app.py          # Flask application entry point
    │   ├── controller/     # API controllers
    │   ├── service/        # Business logic layer
    │   ├── repository/     # Data access layer
    │   ├── model/          # Database models
    │   ├── di/             # Dependency injection configuration
    │   ├── utils/          # Utility modules
    │   │   └── prompt_templates/  # JSON prompt templates
    │   └── config/         # Configuration
    ├── build.py            # Build script for PyInstaller
    └── flask-api.spec      # PyInstaller spec file
```

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Tauri Window   │  (React Frontend)
└────────┬────────┘
         │ IPC Commands
         ↓
┌─────────────────┐
│  Rust Backend   │  (Process Management)
└────────┬────────┘
         │ Spawns & Manages
         ↓
┌─────────────────┐
│  Flask Server   │  (Python Backend)
│  (Dynamic Port) │
└────────┬────────┘
         │ HTTP API
         ↓
┌─────────────────┐
│   AI Providers  │  (Ollama / DeepSeek)
└─────────────────┘
```

### Backend Architecture (Flask)

The Flask backend follows a layered architecture similar to Spring MVC:

- **Controller Layer**: Handles HTTP requests and responses
- **Service Layer**: Contains business logic
- **Repository Layer**: Data access abstraction
- **Model Layer**: Database models (SQLAlchemy ORM)
- **Dependency Injection**: Flask-Injector for automatic dependency management

### Frontend Architecture (React)

- **Component-Based**: React functional components with hooks
- **State Management**: Redux Toolkit for global state
- **Custom Hooks**: Reusable logic for API calls and state management
- **Type Safety**: Full TypeScript support
- **Modular Styling**: SCSS Modules for component-specific styles

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **Rust** (latest stable version)
- **Ollama** (optional, for local AI models)
- **DeepSeek API Key** (optional, for cloud AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ooc-app
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

4. **Install Tauri CLI** (if not already installed)
   ```bash
   npm install -g @tauri-apps/cli
   ```

### Development

#### Running the Application

1. **Start the development server**
   ```bash
   npm run tauri:dev
   ```

   This command will:
   - Start the Vite dev server for the React frontend
   - Compile and run the Tauri application
   - Automatically start the Flask backend server
   - Open the application window

#### Running Individual Components

1. **Frontend only** (for UI development with mock data)
   ```bash
   npm run dev
   ```

2. **Backend only** (Flask server)
   ```bash
   npm run server:dev
   # or
   python server/run.py
   ```

### Building for Production

#### Build the Entire Application

```bash
npm run dist
```

This will:
- Build the React frontend
- Package the Flask backend into an executable
- Build the Tauri application
- Create a distributable package

#### Build Individual Components

1. **Build frontend only**
   ```bash
   npm run build
   ```

2. **Build Flask backend executable**
   ```bash
   npm run build:python
   # or
   python server/build.py
   ```

3. **Build Tauri application only**
   ```bash
   npm run tauri:build
   ```

## Configuration

### Frontend Configuration

Frontend configuration is managed through environment variables (`.env` files):

- `VITE_DEV_MODE`: Enable development mode features

### Backend Configuration

Backend configuration can be set via environment variables:

```bash
# Flask Configuration
FLASK_HOST=127.0.0.1              # Default: 127.0.0.1
FLASK_PORT=0                      # Set to 0 for dynamic port allocation (default: 0)
FLASK_DEBUG=false                 # Enable debug mode (default: false)
FLASK_ENV=development             # Environment: development, production, testing

# Database Configuration
DB_PATH=/path/to/database.db      # Database file path
                                  # - If not set in development: auto-created at server/data/local/chat.db
                                  # - In production: obtained from Tauri app data directory

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434  # Default: http://localhost:11434
OLLAMA_REQUEST_TIMEOUT=300               # Request timeout in seconds (default: 300)

# DeepSeek Configuration
DEEPSEEK_BASE_URL=https://api.deepseek.com  # Default: https://api.deepseek.com
DEEPSEEK_TIMEOUT=60                        # Request timeout in seconds (default: 60)

# Logging Configuration
LOG_LEVEL=INFO                     # Log level: DEBUG, INFO, WARNING, ERROR (default: INFO)

# Story Summarization Configuration (optional)
SUMMARY_THRESHOLD=150              # Message count threshold for summarization (default: 150)
MAX_MESSAGE_HISTORY=100            # Max messages without summary (default: 100)
RECENT_MESSAGES_WITH_SUMMARY=15    # Recent messages to keep with summary (default: 15)
ESTIMATED_TOKENS_PER_MESSAGE=500  # Estimated tokens per message (default: 500)
MAX_CONTEXT_TOKENS=60000          # Max context tokens (default: 60000)
```

### Application Settings

Most settings can be configured through the application's settings panel:
- AI provider selection and configuration
- API keys and endpoints
- Language preference (stored in database)
- Theme and appearance settings
- Advanced options (timeouts, retries, etc.)

## Key Features Explained

### Dynamic Port Allocation

The Flask server dynamically finds an available port and communicates it to the Tauri frontend through events, ensuring no port conflicts.

### Story Management

- **Story Settings**: Each story can have custom background, characters, character personalities, and outlines
- **Story Progress**: Track current section and total sections
- **Story Summarization**: Automatically summarize long stories to manage token limits
- **Story Actions**: Button-based actions (generate, confirm, rewrite, modify) instead of free-form text input

### System Prompts

System prompts are dynamically generated based on:
- Story settings (background, characters, outline)
- Current story progress
- Language preference
- Story summary (if available)

Templates are stored in JSON files (`server/src/utils/prompt_templates/`) for easy extension and maintenance.

### Internationalization

- Language settings stored in database
- Prompt templates support multiple languages
- UI supports Chinese and English
- Language preference affects AI responses

## API Endpoints

### Story Management
- `GET /api/conversations/list` - List all stories
- `GET /api/conversations` - Get conversations (alternative endpoint)
- `GET /api/conversation/settings?conversation_id=<id>` - Get story settings
- `POST /api/conversation/settings` - Create or update story settings
- `GET /api/conversation?conversation_id=<id>` - Get story messages
- `DELETE /api/conversation?conversation_id=<id>` - Delete story
- `POST /api/conversation/delete-last-message` - Delete last message in conversation

### Story Generation
- `POST /api/story/generate` - Generate story section
- `POST /api/story/generate-stream` - Generate story section (streaming)
- `POST /api/story/confirm` - Confirm current section and generate next
- `POST /api/story/rewrite` - Rewrite current section
- `POST /api/story/modify` - Modify current section

### Story Outline & Progress
- `POST /api/conversation/generate-outline` - Generate story outline
- `POST /api/conversation/generate-outline-stream` - Generate story outline (streaming)
- `GET /api/conversation/progress?conversation_id=<id>` - Get story progress
- `POST /api/conversation/progress` - Update story progress
- `POST /api/conversation/progress/confirm-outline` - Confirm outline

### Story Summarization
- `GET /api/conversation/summary?conversation_id=<id>` - Get story summary
- `POST /api/conversation/summary/generate` - Generate summary
- `POST /api/conversation/summary` - Save summary

### Character Management
- `GET /api/conversation/characters?conversation_id=<id>` - Get characters
- `POST /api/conversation/characters/update` - Update character
- `POST /api/conversation/characters/generate` - Generate characters
- `POST /api/conversation/characters/generate-stream` - Generate characters (streaming)

### Chat (API only in current desktop UI)
The Flask API exposes generic chat endpoints for integrations, tests, and future UI. **The shipped Tauri/React app does not include a free-form message input**; in-app AI interaction is through story actions and streaming story endpoints above.

- `POST /api/chat` - Send chat message (non-streaming)
- `POST /api/chat-stream` - Send chat message (streaming)
- `GET /api/models?provider=<provider>` - Get available models

### Application Settings
- `GET /api/app-settings/language` - Get language setting
- `POST /api/app-settings/language` - Set language setting
- `GET /api/app-settings` - Get all app settings
- `POST /api/app-settings` - Save app settings

### AI Configuration
- `GET /api/ai-config` - Get AI configurations
- `POST /api/ai-config` - Update AI configuration

### Health & Status
- `GET /api/health` - Health check
- `POST /api/stop` - Stop server gracefully

## Development Guide

### Adding a New Language

1. Create a new JSON file in `server/src/utils/prompt_templates/` (e.g., `fr.json`)
2. Follow the structure of existing template files
3. Update the language validation in `app_settings_service.py` if needed
4. Add translations to `src/i18n/locales/`

### Adding a New AI Provider

1. Create a new service class in `server/src/service/` (e.g., `openai_service.py`)
2. Implement the provider interface
3. Update `AIService` to support the new provider
4. Register the service in `server/src/di/module.py`
5. Add configuration in `server/src/config/config.py`
6. Update frontend types and UI as needed

### Project Standards

- **Code Comments**: All comments and logs should be in English
- **Code Style**: Follow existing code patterns
- **Type Safety**: Use TypeScript types and Python type hints
- **Error Handling**: Consistent error handling across all layers
- **Logging**: Use the logger utility for all log messages

## Troubleshooting

### Flask Server Not Starting

- Check if the port is already in use
- Verify Python dependencies are installed
- Check database path permissions

### Frontend Can't Connect to Backend

- Check if Flask server is running
- Verify the port in the frontend matches the Flask server port
- Check browser console for CORS errors

### Build Issues

- Ensure all dependencies are installed
- Check Python version compatibility
- Verify Rust toolchain is properly installed

## License

MIT License - see LICENSE file for details

## Author

Patrick Zhang

## Acknowledgments

- Tauri team for the excellent desktop framework
- Flask and Flask-Injector for the backend architecture
- All AI providers (Ollama, DeepSeek) for their APIs

