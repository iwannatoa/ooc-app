# OOC Flask API Server

Flask API 服务器，提供统一的 AI 聊天接口，支持 Ollama 和 DeepSeek。

## 项目结构

```
server/
├── app.py                 # Flask 应用主入口
├── build.py               # 构建脚本
├── requirements.txt       # Python 依赖
├── src/                   # 源代码目录
│   ├── config/           # 配置模块
│   │   └── config.py     # 应用配置
│   ├── controller/       # 控制器层（类似 Spring 的 @RestController）
│   │   └── chat_controller.py
│   ├── service/          # 服务层（类似 Spring 的 @Service）
│   │   ├── ai_service.py
│   │   ├── ollama_service.py
│   │   └── deepseek_service.py
│   ├── utils/            # 工具模块
│   │   ├── logger.py
│   │   └── exceptions.py
│   └── di/               # 依赖注入配置
│       └── module.py
├── build/                # 构建输出
└── dist/                 # 分发文件
```

## 架构说明

### Controller-Service 架构

采用类似 Spring MVC 的分层架构：

- **Controller 层**: 处理 HTTP 请求和响应
- **Service 层**: 业务逻辑处理
- **依赖注入**: 使用 Flask-Injector 实现自动依赖注入

### 依赖注入

使用 Flask-Injector 实现依赖注入，类似 Spring 的 `@Autowired`：

- `ChatController` 自动注入 `AIService`
- `AIService` 自动注入 `OllamaService` 和 `DeepSeekService`
- 所有服务注册为单例

## 使用方法

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行服务器

```bash
# 方式 1: 使用启动脚本（推荐）
python run.py

# 方式 2: 直接运行
python src/app.py
```

### 环境变量

可以通过环境变量配置服务器：

```bash
# Flask 配置
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=false
FLASK_ENV=development

# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_REQUEST_TIMEOUT=300

# DeepSeek 配置
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_TIMEOUT=60

# 日志配置
LOG_LEVEL=INFO
```

### 构建可执行文件

```bash
python build.py
```

## API 接口

### POST /api/chat

发送聊天请求。

**请求体：**
```json
{
  "provider": "ollama" | "deepseek",
  "message": "用户消息",
  "model": "模型名称",
  "apiKey": "API 密钥（DeepSeek 需要）",
  "baseUrl": "自定义基础 URL（可选）",
  "maxTokens": 2048,
  "temperature": 0.7
}
```

**响应：**
```json
{
  "success": true,
  "response": "AI 响应内容",
  "model": "使用的模型"
}
```

### GET /api/models

获取可用模型列表（仅支持 Ollama）。

**查询参数：**
- `provider`: 提供商名称（默认: ollama）

**响应：**
```json
{
  "success": true,
  "models": [...]
}
```

### GET /api/health

健康检查接口。

**响应：**
```json
{
  "status": "healthy" | "unhealthy",
  "ollama_available": true | false
}
```

### POST /api/stop

停止服务器。

## 设计原则

1. **模块化**: 代码按功能分离到不同模块
2. **依赖注入**: 使用 Flask-Injector 实现自动依赖管理
3. **分层架构**: Controller-Service 分层清晰
4. **可扩展**: 易于添加新的 AI 提供商
5. **错误处理**: 统一的异常处理和错误响应
6. **日志记录**: 完整的日志记录系统
7. **配置管理**: 支持多环境配置

## 扩展新提供商

要添加新的 AI 提供商：

1. 在 `src/service/` 目录创建新的服务类
2. 在 `src/service/ai_service.py` 中添加对新提供商的支持
3. 在 `src/config/config.py` 添加新提供商的配置
4. 在 `src/di/module.py` 注册新服务
5. 在 `src/controller/chat_controller.py` 中添加相关方法（如需要）
