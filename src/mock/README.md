# Mock Data Usage Guide

## Overview

The Mock data module is used in development environment to provide simulated API responses, allowing frontend development without starting the backend server.

## Enabling Mock Mode

### Method 1: Environment Variable

Set in `.env` or `.env.local` file:

```env
VITE_USE_MOCK=true
```

### Method 2: Auto-Enable (Development Mode)

In development mode (`npm run dev`), Mock mode will be automatically enabled if `VITE_USE_MOCK=false` is not explicitly set.

## Mock Data Content

### Story Data

- 3 preset stories:
  - Fantasy Adventure Story
  - Sci-Fi Future World
  - Modern Urban Suspense

### Message Data

Each story contains some sample messages demonstrating the conversation flow.

### Model List

Includes the following Mock models:
- llama2
- deepseek-chat
- mistral

## Features

### 1. Story Management

- ✅ Get story list
- ✅ Get story settings
- ✅ Create/update story settings
- ✅ Get story messages
- ✅ Delete story

### 2. AI Chat

- ✅ Send messages (simulated delay 1-2 seconds)
- ✅ Generate intelligent replies (based on keyword matching)

### 3. Outline Generation

- ✅ Generate outline based on story background, characters, personality
- ✅ Simulate generation delay (1.5 seconds)
- ✅ Provide multiple preset outline templates

### 4. Server Status

- ✅ Health check
- ✅ Get model list

## Usage Example

```typescript
import { isMockMode } from '@/mock';

if (isMockMode()) {
  // Mock mode is automatically handled by mockRouter
  // API calls will be intercepted and return mock responses
  const response = await fetch('/api/conversations/list');
} else {
  // Use real API
  const response = await fetch('/api/conversations/list');
}
```

## Notes

1. **Data Persistence**: Mock data will reset after page refresh
2. **Delay Simulation**: All Mock API calls include simulated delays to more realistically simulate network requests
3. **Production Environment**: Mock mode will not be enabled in production builds

## Customizing Mock Data

You can modify Mock data in `src/mock/data.ts`:

- `mockConversations`: Story list
- `mockMessages`: Message data
- `mockModels`: Model list
- `mockOutlines`: Outline templates

## Debugging

You can see Mock mode prompt information in the console. All Mock API calls will output logs to the console (if debug mode is enabled).
