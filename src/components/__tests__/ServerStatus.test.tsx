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
import {
  createMockI18n,
  createMockServerState,
  createMockFlaskPort,
  createMockChatState,
  createMockSettingsState,
  createMockSettingsStateWithProvider,
  createMockConversationClient,
  createMockConversationManagement,
  createMockApiClients,
} from '@/mock';

vi.mock('@/hooks/useServerState');
vi.mock('@/hooks/useFlaskPort');
vi.mock('@/hooks/useChatState');
vi.mock('@/hooks/useSettingsState');
vi.mock('@/hooks/useConversationClient');
vi.mock('@/hooks/useConversationManagement');
vi.mock('@/hooks/useApiClients');
vi.mock('@/i18n/i18n');
vi.mock('@tauri-apps/api/core');
vi.mock('@/mock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mock')>();
  return {
    ...actual,
    isMockMode: vi.fn(() => false),
  };
});

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

    vi.mocked(useI18n.useI18n).mockReturnValue(createMockI18n());

    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'started',
        ollamaStatus: 'connected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    vi.mocked(useFlaskPort.useFlaskPort).mockReturnValue(
      createMockFlaskPort({
        apiUrl: 'http://localhost:5000',
        refetch: mockRefetchPort,
      })
    );

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: null,
        setMessages: mockSetMessages,
      })
    );

    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsState({
        settings: {
          ai: {
            ollama: {
              model: 'test-model',
            },
          },
        },
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    vi.mocked(useConversationClient.useConversationClient).mockReturnValue(
      createMockConversationClient({
        getConversationMessages: mockGetConversationMessages,
      })
    );

    vi.mocked(
      useConversationManagement.useConversationManagement
    ).mockReturnValue(
      createMockConversationManagement({
        loadConversations: mockLoadConversations,
      })
    );

    vi.mocked(useApiClients.useApiClients).mockReturnValue(
      createMockApiClients({
        serverApi: {
          checkHealth: mockCheckHealth,
          getModels: mockGetModels,
        },
      })
    );

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
    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'error',
        ollamaStatus: 'disconnected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    renderWithProviders(<ServerStatus />);
    expect(screen.getByText('serverStatus.restartServer')).toBeInTheDocument();
  });

  it('should be able to restart server', async () => {
    // Use real timers for this test since waitFor needs them
    vi.useRealTimers();

    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'error',
        ollamaStatus: 'disconnected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    vi.mocked(invoke).mockResolvedValue({ success: true });

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

    // Ensure provider is ollama (default should be ollama, but be explicit)
    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsState({
        settings: {
          ai: {
            provider: 'ollama',
          },
        },
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: true,
    });

    mockGetModels.mockResolvedValue({
      success: true,
      models: [{ name: 'llama2' }, { name: 'mistral' }],
    });

    // Ensure refetchPort resolves immediately
    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for health check to be called
    await waitFor(
      () => {
        expect(mockCheckHealth).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for the health check promise to resolve and fetchModels to be called
    // fetchModels is called synchronously after health check resolves
    await waitFor(
      () => {
        expect(mockGetModels).toHaveBeenCalledWith('ollama');
      },
      { timeout: 5000 }
    );
  });

  it('should not fetch models when provider is not ollama', async () => {
    vi.useRealTimers();
    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsStateWithProvider('deepseek', {
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

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

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: 'conv-1',
        setMessages: mockSetMessages,
      })
    );

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

  it('should show Ollama connection help when disconnected', async () => {
    vi.useRealTimers();

    // Mock health check to return healthy but ollama not available
    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: false,
    });

    // Mock refetchPort to resolve immediately
    mockRefetchPort.mockResolvedValue(undefined);

    // Ensure provider is ollama
    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsState({
        settings: {
          ai: {
            provider: 'ollama',
          },
        },
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'started',
        ollamaStatus: 'disconnected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    renderWithProviders(<ServerStatus />);

    // Wait for health check to complete and set ollama status
    await waitFor(
      () => {
        expect(mockSetOllamaStatus).toHaveBeenCalledWith('disconnected');
      },
      { timeout: 3000 }
    );

    // Wait for the component to re-render with the updated status
    await waitFor(
      () => {
        expect(
          screen.getByText('serverStatus.cannotConnectToOllama')
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('serverStatus.pleaseEnsure')).toBeInTheDocument();
  });

  it('should not show Ollama help when provider is not ollama', () => {
    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'started',
        ollamaStatus: 'disconnected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsStateWithProvider('deepseek', {
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    renderWithProviders(<ServerStatus />);

    expect(
      screen.queryByText('serverStatus.cannotConnectToOllama')
    ).not.toBeInTheDocument();
  });

  it('should handle restart server error', async () => {
    vi.useRealTimers();
    vi.mocked(useServerState.useServerState).mockReturnValue(
      createMockServerState({
        pythonServerStatus: 'error',
        ollamaStatus: 'disconnected',
        setPythonServerStatus: mockSetPythonServerStatus,
        setOllamaStatus: mockSetOllamaStatus,
        setError: mockSetError,
      })
    );

    vi.mocked(invoke).mockRejectedValue(new Error('Restart failed'));

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
    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsStateWithProvider('deepseek', {
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: false,
    });

    renderWithProviders(<ServerStatus />);

    await waitFor(() => {
      expect(mockSetOllamaStatus).toHaveBeenCalledWith('connected');
    });
  });

  it('should clear existing interval when initializing', async () => {
    vi.useRealTimers();
    const { rerender } = renderWithProviders(<ServerStatus />);

    // Change apiUrl to trigger re-initialization
    vi.mocked(useFlaskPort.useFlaskPort).mockReturnValue(
      createMockFlaskPort({
        apiUrl: 'http://localhost:5001',
        refetch: mockRefetchPort,
      })
    );

    rerender(<ServerStatus />);

    // Should call refetchPort when re-initializing
    await waitFor(() => {
      expect(mockRefetchPort).toHaveBeenCalled();
    });
  });

  it('should handle loadConversations error when server becomes healthy', async () => {
    vi.useRealTimers();
    mockLoadConversations.mockRejectedValue(new Error('Load failed'));

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: 'conv-1',
        setMessages: mockSetMessages,
      })
    );

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

    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for health check to complete
    await waitFor(
      () => {
        expect(mockLoadConversations).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );

    // Error should be handled gracefully (no crash)
    expect(mockLoadConversations).toHaveBeenCalled();
  });

  it('should reload conversation history when server becomes healthy', async () => {
    vi.useRealTimers();
    const mockMessages = [
      { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Hi', timestamp: Date.now() },
    ];
    mockGetConversationMessages.mockResolvedValue(mockMessages);

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: 'conv-1',
        setMessages: mockSetMessages,
      })
    );

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

    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for conversation history to be reloaded
    await waitFor(
      () => {
        expect(mockGetConversationMessages).toHaveBeenCalledWith('conv-1');
        expect(mockSetMessages).toHaveBeenCalledWith(mockMessages);
      },
      { timeout: 5000 }
    );
  });

  it('should handle refetchPort error when server becomes healthy', async () => {
    vi.useRealTimers();
    mockRefetchPort.mockRejectedValue(new Error('Refetch failed'));

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: 'conv-1',
        setMessages: mockSetMessages,
      })
    );

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

    renderWithProviders(<ServerStatus />);

    // Wait for health check to complete
    await waitFor(
      () => {
        expect(mockRefetchPort).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );

    // Error should be handled gracefully
    expect(mockRefetchPort).toHaveBeenCalled();
  });

  it('should handle reloadConversationHistory error', async () => {
    vi.useRealTimers();
    mockGetConversationMessages.mockRejectedValue(new Error('Failed to load'));

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        setModels: mockSetModels,
        setSelectedModel: mockSetSelectedModel,
        activeConversationId: 'conv-1',
        setMessages: mockSetMessages,
      })
    );

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

    mockRefetchPort.mockResolvedValue(undefined);

    renderWithProviders(<ServerStatus />);

    // Wait for conversation history reload attempt
    await waitFor(
      () => {
        expect(mockGetConversationMessages).toHaveBeenCalledWith('conv-1');
      },
      { timeout: 5000 }
    );

    // Error should be handled gracefully (no crash)
    expect(mockGetConversationMessages).toHaveBeenCalled();
  });

  it('should handle fetchModels error', async () => {
    vi.useRealTimers();

    // Ensure provider is ollama and health check returns healthy
    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsState({
        settings: {
          ai: {
            provider: 'ollama',
          },
        },
        updateOllamaConfig: mockUpdateOllamaConfig,
      })
    );

    mockCheckHealth.mockResolvedValue({
      status: 'healthy',
      ollama_available: true,
    });

    mockGetModels.mockRejectedValue(new Error('Failed to fetch models'));

    renderWithProviders(<ServerStatus />);

    // Wait for health check to complete
    await waitFor(
      () => {
        expect(mockCheckHealth).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for fetchModels to be called and error handled
    await waitFor(
      () => {
        expect(mockGetModels).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Error should be handled gracefully (no crash)
    expect(mockGetModels).toHaveBeenCalled();
  });
});
