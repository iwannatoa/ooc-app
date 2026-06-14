import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
global.window.__TAURI__ = {
  invoke: vi.fn(),
  event: {
    listen: vi.fn(),
  },
};

// Mock fetch
global.fetch = vi.fn();

