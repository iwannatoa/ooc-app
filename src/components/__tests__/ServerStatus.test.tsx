import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('@/mock', () => ({
  isMockMode: vi.fn(() => false),
}));

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
  const mockLoadConversations = vi.fn().mockResolvedValue(undefined);
  const mockCheckHealth = vi.fn();
  const mockGetModels = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mockLoadConversations to return a promise
    mockLoadConversations.mockResolvedValue(undefined);
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

  it('should handle server health check when unhealthy', async () => {
    vi.useRealTimers();
    mockCheckHealth.mockResolvedValue({
      status: 'unhealthy',
      ollama_available: false,
    });

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockSetPythonServerStatus).toHaveBeenCalledWith('error');
    });
  });

  it('should handle server health check error', async () => {
    vi.useRealTimers();
    mockCheckHealth.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockSetPythonServerStatus).toHaveBeenCalledWith('error');
      expect(mockSetOllamaStatus).toHaveBeenCalledWith('disconnected');
    });
  });

  it('should fetch models when provider is ollama and server is healthy', async () => {
    vi.useRealTimers();
    mockGetModels.mockResolvedValue({
      success: true,
      models: [{ name: 'llama2' }, { name: 'mistral' }],
    });

    // Ensure refetchPort resolves immediately
    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for initial health check
    await waitFor(
      () => {
        expect(mockCheckHealth).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for models to be fetched (happens after health check succeeds)
    await waitFor(
      () => {
        expect(mockGetModels).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('should not fetch models when provider is not ollama', async () => {
    vi.useRealTimers();
    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: { model: 'deepseek-chat' },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
    });

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockCheckHealth).toHaveBeenCalled();
    });

    // Models should not be fetched for non-ollama provider
    expect(mockGetModels).not.toHaveBeenCalled();
  });

  it('should reload conversation when server becomes healthy', async () => {
    vi.useRealTimers();
    mockGetConversationMessages.mockResolvedValue([
      { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
    ]);

    (useChatState.useChatState as any).mockReturnValue({
      setModels: mockSetModels,
      setSelectedModel: mockSetSelectedModel,
      activeConversationId: 'conv-1',
      setMessages: mockSetMessages,
    });

    // First return unhealthy, then healthy
    let callCount = 0;
    mockCheckHealth.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 'unhealthy',
          ollama_available: true,
        });
      }
      return Promise.resolve({
        status: 'healthy',
        ollama_available: true,
      });
    });

    // Mock refetchPort to resolve immediately
    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for health check to complete and conversation to reload
    // The component calls loadConversations inside a setTimeout after refetchPort
    await waitFor(
      () => {
        expect(mockLoadConversations).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
  });

  it('should show Ollama connection help when disconnected', () => {
    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'started',
      ollamaStatus: 'disconnected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    renderWithProviders(<ServerStatus />);

    expect(
      screen.getByText('serverStatus.cannotConnectToOllama')
    ).toBeInTheDocument();
    expect(screen.getByText('serverStatus.pleaseEnsure')).toBeInTheDocument();
  });

  it('should not show Ollama help when provider is not ollama', () => {
    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'started',
      ollamaStatus: 'disconnected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: { model: 'deepseek-chat' },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
    });

    renderWithProviders(<ServerStatus />);

    expect(
      screen.queryByText('serverStatus.cannotConnectToOllama')
    ).not.toBeInTheDocument();
  });

  it('should handle restart server error', async () => {
    vi.useRealTimers();
    (useServerState.useServerState as any).mockReturnValue({
      pythonServerStatus: 'error',
      ollamaStatus: 'disconnected',
      setPythonServerStatus: mockSetPythonServerStatus,
      setOllamaStatus: mockSetOllamaStatus,
      setError: mockSetError,
    });

    (invoke as any).mockRejectedValue(new Error('Restart failed'));

    renderWithProviders(<ServerStatus />);
    const restartButton = screen.getByText('serverStatus.restartServer');
    fireEvent.click(restartButton);

    await waitFor(() => {
      expect(mockSetPythonServerStatus).toHaveBeenCalledWith('error');
      expect(mockSetError).toHaveBeenCalled();
    });
  });

  it('should show dev mode badge when in dev mode', () => {
    vi.stubEnv('VITE_DEV_MODE', 'true');
    renderWithProviders(<ServerStatus />);
    expect(screen.getByText('serverStatus.devMode')).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('should show mock mode badge when in mock mode', async () => {
    vi.stubEnv('VITE_DEV_MODE', 'true');

    // Import and mock the isMockMode function
    const mockModule = await import('@/mock');
    vi.spyOn(mockModule, 'isMockMode').mockReturnValue(true);

    renderWithProviders(<ServerStatus />);
    expect(screen.getByText('serverStatus.mockMode')).toBeInTheDocument();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should handle ollama status when provider is ollama', async () => {
    vi.useRealTimers();
    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: false,
    });

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockSetOllamaStatus).toHaveBeenCalledWith('disconnected');
    });
  });

  it('should handle ollama status when provider is not ollama', async () => {
    vi.useRealTimers();
    (useSettingsState.useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: { model: 'deepseek-chat' },
        },
      },
      updateOllamaConfig: mockUpdateOllamaConfig,
    });

    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: false,
    });

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockSetOllamaStatus).toHaveBeenCalledWith('connected');
    });
  });
});
