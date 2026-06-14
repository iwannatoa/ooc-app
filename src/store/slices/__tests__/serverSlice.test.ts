import { describe, it, expect } from 'vitest';
import serverReducer, {
  setPythonServerStatus,
  setOllamaStatus,
  setServerLoading,
  setServerError,
  clearServerError,
  setFlaskPort,
} from '../serverSlice';

describe('serverSlice', () => {
  it('should set Python server status', () => {
    const state = serverReducer(undefined, setPythonServerStatus('started'));
    expect(state.pythonServerStatus).toBe('started');
  });

  it('should set Ollama status', () => {
    const state = serverReducer(undefined, setOllamaStatus('connected'));
    expect(state.ollamaStatus).toBe('connected');
  });

  it('should set server loading state', () => {
    const state = serverReducer(undefined, setServerLoading(true));
    expect(state.isServerLoading).toBe(true);
  });

  it('should set server error', () => {
    const state = serverReducer(undefined, setServerError('Test error'));
    expect(state.serverError).toBe('Test error');
  });

  it('should clear server error', () => {
    const stateWithError = serverReducer(undefined, setServerError('Test error'));
    const state = serverReducer(stateWithError, clearServerError());
    expect(state.serverError).toBeNull();
  });

  it('should set Flask port', () => {
    const state = serverReducer(undefined, setFlaskPort(5000));
    expect(state.flaskPort).toBe(5000);
    expect(state.apiUrl).toBe('http://localhost:5000');
  });
});

