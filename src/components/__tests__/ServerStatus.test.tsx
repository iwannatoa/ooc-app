import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import ServerStatus from '../ServerStatus';
import * as useServerState from '@/hooks/useServerState';
import * as useFlaskPort from '@/hooks/useFlaskPort';
import * as useChatState from '@/hooks/useChatState';
import * as useSettingsState from '@/hooks/useSettingsState';
import * as useConversationClient from '@/hooks/useConversationClient';
import * as useConversationManagement from '@/hooks/useConversationManagement';
import * as useApiClients from '@/hooks/useApiClients';
import * as useI18n from '@/i18n/i18n';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@/hooks/useServerState');
vi.mock('@/hooks/useFlaskPort');
vi.mock('@/hooks/useChatState');
vi.mock('@/hooks/useSettingsState');
vi.mock('@/hooks/useConversationClient');
vi.mock('@/hooks/useConversationManagement');
vi.mock('@/hooks/useApiClients');
vi.mock('@/i18n/i18n');
vi.mock('@tauri-apps/api/core');

describe('ServerStatus', () => {
  const mockSetPythonServerStatus = vi.fn();
  const mockSetOllamaStatus = vi.fn();
  const mockSetError = vi.fn();
  const mockRefetchPort = vi.fn();
  const mockSetModels = vi.fn();
  const mockSetSelectedModel = vi.fn();
  const mockSetMessages = vi.fn();
  const mockUpdateOllamaConfig = vi.fn();
  const mockGetConversationMessages = vi.fn();
  const mockLoadConversations = vi.fn();
  const mockCheckHealth = vi.fn();
  const mockGetModels = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });

    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'started',
      ollamaStatus: 'connected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    (useFlaskPort.useFlaskPort as any).mockReturnValue({
      apiUrl: 'http://localhost:5000',
      refetch: mockRefetchPort,
    });

    (useChatState.useChatState as any).mockReturnValue({
      setModels: mockSetModels,
      setSelectedModel: mockSetSelectedModel,
      activeConversationId: null,
      setMessages: mockSetMessages,
    });

    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'ollama',
          ollama: { model: 'test-model' },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
    });

    (useConversationClient.useConversationClient as any).mockReturnValue({
      getConversationMessages: mockGetConversationMessages,
    });

    (
      useConversationManagement.useConversationManagement as any
    ).mockReturnValue({
      loadConversations: mockLoadConversations,
    });

    (useApiClients.useApiClients as any).mockReturnValue({
      serverApi: {
        checkHealth: mockCheckHealth,
        getModels: mockGetModels,
      },
    });

    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render server status', () => {
    renderWithProviders(<ServerStatus />);
    expect(screen.getByText(/serverStatus.status/)).toBeInTheDocument();
  });

  it('should show restart button when server error', () => {
    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'error',
      ollamaStatus: 'disconnected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    renderWithProviders(<ServerStatus />);
    expect(screen.getByText('serverStatus.restartServer')).toBeInTheDocument();
  });

  it('should be able to restart server', async () => {
    // Use real timers for this test since waitFor needs them
    vi.useRealTimers();

    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'error',
      ollamaStatus: 'disconnected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    (invoke as any).mockResolvedValue({ success: true });

    const { container } = renderWithProviders(<ServerStatus />);
    const restartButton = screen.getByText('serverStatus.restartServer');
    fireEvent.click(restartButton);

    // Wait for async invoke calls
    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith('stop_python_server');
      },
      { container, timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith('start_python_server');
      },
      { container, timeout: 1000 }
    );
  });
});
