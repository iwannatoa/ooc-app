import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiClients } from '../useApiClients';
import * as useFlaskPort from '../useFlaskPort';
import * as useSettingsState from '../useSettingsState';
import * as useI18n from '@/i18n/i18n';
import { isMockMode } from '@/mock';

vi.mock('../useFlaskPort');
vi.mock('../useSettingsState');
vi.mock('@/i18n/i18n');
vi.mock('@/mock', () => ({
  isMockMode: vi.fn(() => false),
}));

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

  it('should use mock URL in mock mode', () => {
    (isMockMode as any).mockReturnValue(true);
    const { result } = renderHook(() => useApiClients());
    expect(result.current.apiFactory).toBeDefined();
  });
});
