import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();
const mockGetState = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@/store', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

import {
  getTelemetryCounters,
  trackTelemetryEvent,
} from '../telemetryService';

describe('telemetryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetState.mockReturnValue({
      settings: {
        settings: {
          advanced: {
            enableAnonymousTelemetry: false,
          },
        },
      },
    });
  });

  it('should not send telemetry when disabled', async () => {
    await trackTelemetryEvent('app_started');

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(getTelemetryCounters()).toEqual({});
  });

  it('should increment counters and log event when enabled', async () => {
    mockGetState.mockReturnValue({
      settings: {
        settings: {
          advanced: {
            enableAnonymousTelemetry: true,
          },
        },
      },
    });
    mockInvoke.mockResolvedValue('ok');

    await trackTelemetryEvent('chat_message_sent', { provider: 'ollama' });
    await trackTelemetryEvent('chat_message_sent', { provider: 'deepseek' });

    expect(getTelemetryCounters()).toEqual({
      chat_message_sent: 2,
    });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenCalledWith('frontend_log', {
      level: 'info',
      message: expect.stringContaining('"name":"chat_message_sent"'),
    });
  });
});
