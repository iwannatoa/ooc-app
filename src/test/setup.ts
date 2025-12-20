import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
global.window = {
  ...global.window,
  __TAURI__: {
    invoke: vi.fn(),
    event: {
      listen: vi.fn(),
    },
  },
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
