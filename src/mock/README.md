# Mock 数据使用说明

## 概述

Mock 数据模块用于开发环境，提供模拟的 API 响应，方便前端开发时不需要启动后端服务。

## 启用 Mock 模式

### 方法 1: 环境变量

在 `.env` 或 `.env.local` 文件中设置：

```env
VITE_USE_MOCK=true
```

### 方法 2: 自动启用（开发模式）

在开发模式下（`npm run dev`），如果没有明确设置 `VITE_USE_MOCK=false`，会自动启用 Mock 模式。

## Mock 数据内容

### 故事数据

- 3 个预设故事：
  - 奇幻冒险故事
  - 科幻未来世界
  - 现代都市悬疑

### 消息数据

每个故事都包含一些示例消息，展示对话流程。

### 模型列表

包含以下 Mock 模型：
- llama2
- deepseek-chat
- mistral

## 功能特性

### 1. 故事管理

- ✅ 获取故事列表
- ✅ 获取故事设置
- ✅ 创建/更新故事设置
- ✅ 获取故事消息
- ✅ 删除故事

### 2. AI 聊天

- ✅ 发送消息（模拟延迟 1-2 秒）
- ✅ 生成智能回复（基于关键词匹配）

### 3. 大纲生成

- ✅ 基于故事背景、人物、性格生成大纲
- ✅ 模拟生成延迟（1.5 秒）
- ✅ 提供多个预设大纲模板

### 4. 服务器状态

- ✅ 健康检查
- ✅ 获取模型列表

## 使用示例

```typescript
import { isMockMode, mockConversationClient } from '@/mock';

if (isMockMode()) {
  // 使用 Mock 数据
  const conversations = await mockConversationClient.getConversationsList();
} else {
  // 使用真实 API
  const response = await fetch('/api/conversations/list');
}
```

## 注意事项

1. **数据持久化**：Mock 数据在页面刷新后会重置
2. **延迟模拟**：所有 Mock API 调用都包含模拟延迟，以更真实地模拟网络请求
3. **生产环境**：Mock 模式不会在生产构建中启用

## 自定义 Mock 数据

可以在 `src/mock/data.ts` 中修改 Mock 数据：

- `mockConversations`: 故事列表
- `mockMessages`: 消息数据
- `mockModels`: 模型列表
- `mockOutlines`: 大纲模板

## 调试

在控制台中可以看到 Mock 模式的提示信息。所有 Mock API 调用都会在控制台输出日志（如果启用了调试模式）。

