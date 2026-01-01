import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock ReactDOM.createRoot BEFORE any imports
const mockRender = vi.fn();
const mockRoot = {
  render: mockRender,
};

const mockCreateRoot = vi.fn(() => mockRoot);

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}));

// Mock theme initialization
const mockInitializeTheme = vi.fn();
vi.mock('../utils/theme', () => ({
  initializeTheme: mockInitializeTheme,
}));

// Mock store
vi.mock('../store', () => ({
  store: {
    getState: vi.fn(() => ({})),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock I18nProvider
vi.mock('../i18n/i18n', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

// Mock App component
vi.mock('../App', () => ({
  default: () => <div data-testid="app-component">App</div>,
}));

// Mock global styles
vi.mock('../styles/global.scss', () => ({}));

describe('main.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create a mock root element
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize theme and render app with all providers', async () => {
    // Since main.tsx executes on import, we need to reset modules and re-import
    vi.resetModules();
    
    // Re-import main to trigger execution
    await import('../main');

    // Theme should be initialized
    expect(mockInitializeTheme).toHaveBeenCalled();

    // Should call createRoot with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(
      document.getElementById('root')
    );

    // Should call render with the app wrapped in providers
    expect(mockRender).toHaveBeenCalled();

    // Check that React.StrictMode is used
    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall.type).toBe(React.StrictMode);

    // Check provider hierarchy
    const strictModeChildren = renderCall.props.children;

    // Should have Provider (Redux)
    expect(strictModeChildren.type.name).toBe('Provider');

    // Provider should have I18nProvider as child
    const providerChildren = strictModeChildren.props.children;
    expect(providerChildren.type.name).toBe('I18nProvider');

    // I18nProvider should have App as child
    const i18nChildren = providerChildren.props.children;
    expect(i18nChildren.type.name).toBe('default');
  });
});

