# Frontend Code Structure

This document describes the organization and architecture of the frontend codebase to help developers better understand and maintain the code.

## Directory Structure

```
src/
├── components/          # React components
│   ├── __tests__/      # Component tests
│   └── *.tsx           # Various UI components
├── hooks/              # Custom React Hooks
│   ├── __tests__/      # Hook tests
│   └── *.ts            # Business logic and state management Hooks
├── store/              # Redux state management
│   └── slices/         # Redux slices
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── i18n/               # Internationalization
├── mock/               # Mock data and services
├── styles/             # Global styles
├── test/               # Test utilities and configuration
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## Core Architecture

### 1. App.tsx - Main Application Component

`App.tsx` is the root component of the application, responsible for:
- Integrating all business logic and UI state
- Rendering the main application layout
- Handling dialogs and modals display

**Improvements:**
- Uses `useAppLogic` Hook to encapsulate main business logic, improving readability
- Extracts complex conditional rendering logic to separate components (e.g., `ChatControls`)
- Groups import statements by functionality (business logic, UI components, styles and utilities)

### 2. Custom Hooks

#### useAppLogic
Encapsulates the main business logic of the App component, including:
- Conversation management logic
- Story action logic
- Delete message logic
- Derived state calculations

**Location:** `src/hooks/useAppLogic.ts`

#### useConversationManagement
Manages conversation-related state and operations:
- Conversation list management
- Conversation selection, creation, deletion
- Settings form and summary prompt display

**Location:** `src/hooks/useConversationManagement.ts`

#### useStoryActions
Handles story-related operations:
- Generate story
- Confirm, rewrite, modify sections

**Location:** `src/hooks/useStoryActions.ts`

### 3. Component Hierarchy

```
App
├── AppHeader              # Application header
├── ConversationList       # Conversation list
├── ChatArea
│   ├── ChatControls       # Chat controls bar (model selection, title, etc.)
│   └── ChatInterface      # Chat interface
│       ├── MessageList    # Message list
│       └── StoryActions   # Story action buttons
├── StorySettingsSidebar   # Story settings sidebar
├── ConversationSettingsForm  # Conversation settings form (modal)
├── SummaryPrompt          # Summary prompt (modal)
├── StorySettingsView      # Story settings view (modal)
├── SettingsPanel          # Application settings panel
├── ToastContainer         # Toast notification container
└── ConfirmDialog          # Confirmation dialog
```

### 4. State Management

Uses Redux Toolkit for state management:

- **chatSlice**: Chat messages, conversation history, model list
- **serverSlice**: Server status, Flask port
- **settingsSlice**: Application settings

**Location:** `src/store/slices/`

### 5. Code Organization Principles

#### Import Statement Organization
```typescript
// ===== Business Logic Hooks =====
import { useAppLogic } from './hooks/useAppLogic';
// ...

// ===== UI Components =====
import { AppHeader } from './components/AppHeader';
// ...

// ===== Styles and Utilities =====
import styles from './styles.module.scss';
```

#### Component Internal Grouping
```typescript
function Component() {
  // ===== State Management =====
  const state = useState();
  
  // ===== Business Logic =====
  const handleAction = () => {};
  
  // ===== Render =====
  return <div>...</div>;
}
```

## Code Improvement History

### 2025-01-XX: Code Readability Improvements

1. **Refactored App.tsx**
   - Extracted business logic to `useAppLogic` Hook
   - Created `ChatControls` component to handle complex conditional rendering
   - Improved import statement organization and grouping

2. **Added Documentation Comments**
   - Added JSDoc comments for main components and Hooks
   - Created code structure documentation

3. **Improved Code Organization**
   - Grouped code by functionality
   - Added clear separator comments

## Development Guide

### Adding New Features

1. **New Component**
   - Create component file in `components/` directory
   - Define Props using TypeScript interfaces
   - Add necessary style file (.module.scss)

2. **New Hook**
   - Create Hook file in `hooks/` directory
   - Follow React Hooks naming convention (start with "use")
   - Add type definitions and documentation comments

3. **New State Management**
   - Create new slice in `store/slices/`
   - Use Redux Toolkit's createSlice

### Code Standards

1. **Naming Conventions**
   - Components: PascalCase (e.g., `ChatInterface`)
   - Hooks: camelCase, start with "use" (e.g., `useAppLogic`)
   - Functions: camelCase (e.g., `handleClick`)
   - Constants: UPPER_SNAKE_CASE

2. **File Organization**
   - One main export per file
   - Keep related code together
   - Use separator comments to organize code blocks

3. **Type Definitions**
   - All Props and function parameters should have type definitions
   - Use TypeScript's interface for object types
   - Avoid using `any` type

## Testing

Test files are located in:
- Component tests: `components/__tests__/`
- Hook tests: `hooks/__tests__/`
- Utility function tests: `utils/__tests__/`

Run tests:
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:ui       # Test UI
npm run test:coverage # Test coverage
```
