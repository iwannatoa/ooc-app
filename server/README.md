# OOC Flask API Server

Flask API 服务器，提供统一的 AI 聊天接口，支持 Ollama 和 DeepSeek。

## 项目结构

```
server/
├── app.py                 # Flask 应用主入口
├── config.py              # 配置管理模块
├── build.py               # 构建脚本
├── requirements.txt       # Python 依赖
├── __init__.py            # 包初始化文件
├── api/                   # API 路由模块
│   ├── __init__.py
│   └── routes.py          # 路由定义
├── services/             # 服务层
│   ├── __init__.py
│   ├── ai_service.py      # AI 服务统一接口
│   ├── ollama_service.py  # Ollama 服务实现
│   └── deepseek_service.py # DeepSeek 服务实现
└── utils/                 # 工具模块
    ├── __init__.py
    ├── logger.py          # 日志配置
    └── exceptions.py      # 自定义异常类
```

## 模块说明

### 配置模块 (`config.py`)
- 管理应用配置（开发、生产、测试环境）
- 支持环境变量配置
- 包含 Ollama、DeepSeek 等服务的配置

### 工具模块 (`utils/`)
- **logger.py**: 统一的日志配置和管理
- **exceptions.py**: 自定义异常类（APIError、ValidationError、ServiceError 等）

### 服务层 (`services/`)
- **ai_service.py**: AI 服务统一接口，处理不同提供商的请求
- **ollama_service.py**: Ollama API 封装，提供模型列表、文本生成等功能
- **deepseek_service.py**: DeepSeek API 封装，提供聊天完成功能

### API 路由 (`api/`)
- **routes.py**: 定义所有 API 端点
  - `POST /api/chat`: 聊天接口
  - `GET /api/models`: 获取模型列表
  - `GET /api/health`: 健康检查
  - `POST /api/stop`: 停止服务器

## 使用方法

### 开发环境

```bash
# 安装依赖
pip install -r requirements.txt

# 运行服务器
python app.py
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
  "models": [
    {
      "name": "模型名称",
      "modified_at": "修改时间",
      "size": 模型大小
    }
  ]
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

## 设计原则

1. **模块化**: 代码按功能分离到不同模块
2. **可扩展**: 易于添加新的 AI 提供商
3. **错误处理**: 统一的异常处理和错误响应
4. **日志记录**: 完整的日志记录系统
5. **配置管理**: 支持多环境配置

## 扩展新提供商

要添加新的 AI 提供商：

1. 在 `services/` 目录创建新的服务类（如 `new_provider_service.py`）
2. 在 `services/ai_service.py` 中添加对新提供商的支持
3. 更新 `config.py` 添加新提供商的配置
4. 在 `api/routes.py` 中更新相关接口（如需要）

