import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAiClient } from '../useAiClient';
import * as useApiClients from '../useApiClients';
import { AppSettings } from '@/types';
import { createMockApiClients } from '@/mock';

vi.mock('../useApiClients');

describe('useAiClient', () => {
  const mockSendMessage = vi.fn();
  const mockSendMessageStream = vi.fn();
  const mockUpdateSettings = vi.fn();

  const mockAiApi = {
    sendMessage: mockSendMessage,
    sendMessageStream: mockSendMessageStream,
    updateSettings: mockUpdateSettings,
  };

  const mockSettings: AppSettings = {
    general: {
      language: 'en',
      autoStart: false,
      minimizeToTray: false,
      startWithSystem: false,
    },
    appearance: {
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'system-ui',
    },
    ai: {
      provider: 'ollama',
      ollama: {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
      },
      deepseek: {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        timeout: 60000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
    },
    advanced: {
      enableStreaming: false,
      apiTimeout: 120000,
      maxRetries: 3,
      logLevel: 'info',
      enableDiagnostics: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useApiClients.useApiClients).mockReturnValue(
      createMockApiClients({
        aiApi: mockAiApi,
      })
    );
  });

  it('should initialize with loading false', () => {
    const { result } = renderHook(() => useAiClient(mockSettings));

    expect(result.current.loading).toBe(false);
    expect(result.current.sendMessage).toBeDefined();
    expect(result.current.sendMessageStream).toBeDefined();
  });

  it('should update AI API settings when settings change', async () => {
    const { rerender } = renderHook(
      ({ settings }) => useAiClient(settings),
      {
        initialProps: { settings: mockSettings },
      }
    );

    // Wait for useEffect to run after initial render
    // The effect runs asynchronously, so we wait for it
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith(mockSettings);

    mockUpdateSettings.mockClear();

    const newSettings = {
      ...mockSettings,
      ai: {
        ...mockSettings.ai,
        provider: 'deepseek' as const,
      },
    };

    rerender({ settings: newSettings });

    // Wait for useEffect to run after rerender
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith(newSettings);
  });

  it('should not update settings if aiApi does not have updateSettings', () => {
    const aiApiWithoutUpdate = {
      sendMessage: mockSendMessage,
      sendMessageStream: mockSendMessageStream,
    };

    vi.mocked(useApiClients.useApiClients).mockReturnValue(
      createMockApiClients({
        aiApi: aiApiWithoutUpdate,
      })
    );

    renderHook(() => useAiClient(mockSettings));

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('should send message and set loading state', async () => {
    const mockResponse = {
      id: 'msg_1',
      role: 'assistant' as const,
      content: 'Test response',
      timestamp: Date.now(),
    };

    mockSendMessage.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAiClient(mockSettings));

    expect(result.current.loading).toBe(false);

    const sendPromise = result.current.sendMessage('Hello', 'conv_1');
    const response = await sendPromise;

    expect(mockSendMessage).toHaveBeenCalledWith('Hello', 'conv_1');
    expect(response).toEqual(mockResponse);
    expect(result.current.loading).toBe(false);
  });

  it('should handle sendMessage error and reset loading', async () => {
    const error = new Error('Send failed');
    mockSendMessage.mockRejectedValue(error);

    const { result } = renderHook(() => useAiClient(mockSettings));

    await expect(
      result.current.sendMessage('Hello')
    ).rejects.toThrow('Send failed');

    expect(result.current.loading).toBe(false);
  });

  it('should send message stream and set loading state', async () => {
    const mockResponse = {
      id: 'msg_1',
      role: 'assistant' as const,
      content: 'Streamed response',
      timestamp: Date.now(),
    };

    mockSendMessageStream.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAiClient(mockSettings));
    const onChunk = vi.fn();

    expect(result.current.loading).toBe(false);

    const sendPromise = result.current.sendMessageStream(
      'Hello',
      'conv_1',
      onChunk
    );
    const response = await sendPromise;

    expect(mockSendMessageStream).toHaveBeenCalledWith(
      'Hello',
      'conv_1',
      onChunk
    );
    expect(response).toEqual(mockResponse);
    expect(result.current.loading).toBe(false);
  });

  it('should use empty function as default onChunk for sendMessageStream', async () => {
    const mockResponse = {
      id: 'msg_1',
      role: 'assistant' as const,
      content: 'Streamed response',
      timestamp: Date.now(),
    };

    mockSendMessageStream.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAiClient(mockSettings));

    await result.current.sendMessageStream('Hello', 'conv_1');

    expect(mockSendMessageStream).toHaveBeenCalledWith(
      'Hello',
      'conv_1',
      expect.any(Function)
    );
  });

  it('should handle sendMessageStream error and reset loading', async () => {
    const error = new Error('Stream failed');
    mockSendMessageStream.mockRejectedValue(error);

    const { result } = renderHook(() => useAiClient(mockSettings));

    await expect(
      result.current.sendMessageStream('Hello', 'conv_1')
    ).rejects.toThrow('Stream failed');

    expect(result.current.loading).toBe(false);
  });
});

