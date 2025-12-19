# Frontend Tests

This directory contains unit tests for the React frontend.

## Setup

Test dependencies are included in `package.json`. Install them with:

```bash
npm install
```

## Running Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

Run tests with UI:

```bash
npm run test:ui
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Test Structure

- `setup.ts`: Test configuration and global mocks
- `utils.tsx`: Testing utilities and helpers
- `__tests__/`: Test files for components and hooks

## Writing Tests

1. Create test files next to the component/hook with `.test.ts` or `.test.tsx` extension
2. Use `@testing-library/react` for component testing
3. Use `renderWithProviders` from `test/utils.tsx` for components that need Redux
4. Mock Tauri APIs and external dependencies

## Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

