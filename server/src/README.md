# Flask 应用源代码结构

## 目录结构

```
server/src/
├── config/          # 配置模块
│   ├── __init__.py
│   └── config.py    # 应用配置（类似 Spring 的 @Configuration）
│
├── controller/      # 控制器层（类似 Spring 的 @RestController）
│   ├── __init__.py
│   └── chat_controller.py  # 聊天控制器
│
├── service/         # 服务层（类似 Spring 的 @Service）
│   ├── __init__.py
│   ├── ai_service.py        # AI 服务统一接口
│   ├── ollama_service.py    # Ollama 服务
│   └── deepseek_service.py  # DeepSeek 服务
│
├── utils/           # 工具模块
│   ├── __init__.py
│   ├── logger.py    # 日志配置
│   └── exceptions.py # 自定义异常
│
└── di/              # 依赖注入配置
    ├── __init__.py
    └── module.py    # DI 模块（类似 Spring 的 @Configuration）
```

## 架构说明

### Controller-Service 架构（类似 Spring MVC）

```
Controller (控制器)
    ↓ 调用
Service (服务层)
    ↓ 调用
外部 API (Ollama, DeepSeek)
```

### 依赖注入流程

1. **DI 模块配置** (`src/di/module.py`)
   - 注册所有服务为单例
   - 类似 Spring 的 `@Configuration` 和 `@Bean`

2. **服务层** (`src/service/`)
   - `AIService` 通过构造函数注入 `OllamaService` 和 `DeepSeekService`
   - 类似 Spring 的 `@Service` 和 `@Autowired`

3. **控制器层** (`src/controller/`)
   - `ChatController` 通过构造函数注入 `AIService`
   - 类似 Spring 的 `@RestController` 和 `@Autowired`

4. **路由层** (`app.py`)
   - 使用 `@inject` 装饰器自动注入 `ChatController`
   - 类似 Spring 的 `@Autowired` 参数注入

## 使用方式

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行应用

```bash
python app.py
```

## 代码示例

### Controller（类似 Spring 的 @RestController）

```python
# src/controller/chat_controller.py
from injector import inject
from src.service.ai_service import AIService

class ChatController:
    @inject
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
    
    def chat(self):
        # 处理逻辑
        return self.ai_service.chat(...)
```

### Service（类似 Spring 的 @Service）

```python
# src/service/ai_service.py
class AIService:
    def __init__(
        self,
        ollama_service: OllamaService,  # 自动注入
        deepseek_service: DeepSeekService  # 自动注入
    ):
        self.ollama_service = ollama_service
        self.deepseek_service = deepseek_service
```

### 路由（类似 Spring 的 @RequestMapping）

```python
# app.py
from injector import inject

@app.route('/api/chat', methods=['POST'])
@inject  # 自动注入
def chat(chat_controller: ChatController):  # 通过参数注入
    return chat_controller.chat()
```

## 与 Spring 的对比

| Spring | Flask (当前实现) |
|--------|-----------------|
| `@RestController` | `ChatController` 类 |
| `@Service` | `AIService` 类 |
| `@Autowired` | `@inject` 装饰器 |
| `@Configuration` | `AppModule` 类 |
| `@Bean` | `binder.bind()` |
| `@RequestMapping` | `@app.route()` |

## 优势

1. ✅ **依赖注入** - 自动管理依赖，易于测试
2. ✅ **模块化** - Controller-Service 分层清晰
3. ✅ **无 Blueprint** - 直接使用 `app.route()`，更简单
4. ✅ **代码组织** - 所有代码在 `src/` 目录下
5. ✅ **类似 Spring** - 熟悉 Spring 的开发者容易理解

