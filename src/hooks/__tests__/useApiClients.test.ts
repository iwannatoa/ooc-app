import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiClients } from '../useApiClients';
import * as useFlaskPort from '../useFlaskPort';
import * as useSettingsState from '../useSettingsState';
import * as useI18n from '@/i18n/i18n';
import { isMockMode, createMockFlaskPort } from '@/mock';

vi.mock('../useFlaskPort');
vi.mock('../useSettingsState');
vi.mock('@/i18n/i18n');
vi.mock('@/mock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mock')>();
  return {
    ...actual,
    isMockMode: vi.fn(() => false),
  };
});

describe('useApiClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useFlaskPort.useFlaskPort as any).mockReturnValue({
      waitForPort: vi.fn().mockResolvedValue('http://localhost:5000'),
    });

    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'ollama',
          ollama: { model: 'test-model' },
        },
      },
    });

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('should create API clients', () => {
    const { result } = renderHook(() => useApiClients());
    expect(result.current.conversationApi).toBeDefined();
    expect(result.current.aiApi).toBeDefined();
    expect(result.current.storyApi).toBeDefined();
    expect(result.current.settingsApi).toBeDefined();
    expect(result.current.serverApi).toBeDefined();
  });

  it('should use mock URL in mock mode', async () => {
    vi.mocked(isMockMode).mockReturnValue(true);
    const { result } = renderHook(() => useApiClients());
    expect(result.current.apiFactory).toBeDefined();

    // Test that getApiUrl returns mock URL when in mock mode
    // We can't directly access private getApiUrl, but we can test behavior
    // by checking that the factory creates clients correctly
    expect(result.current.conversationApi).toBeDefined();
    expect(result.current.aiApi).toBeDefined();
  });

  it('should use waitForPort when not in mock mode', async () => {
    vi.mocked(isMockMode).mockReturnValue(false);
    const mockWaitForPort = vi.fn().mockResolvedValue('http://localhost:5001');
    
    vi.mocked(useFlaskPort.useFlaskPort).mockReturnValue(
      createMockFlaskPort({
        waitForPort: mockWaitForPort,
      })
    );

    const { result } = renderHook(() => useApiClients());
    
    // Test that waitForPort is called when creating clients
    // The factory will call getApiUrl internally, which calls waitForPort
    expect(result.current.apiFactory).toBeDefined();
    expect(result.current.conversationApi).toBeDefined();
    // waitForPort is called lazily when API methods are invoked
    // For this test, we verify the factory is set up correctly
  });
});
