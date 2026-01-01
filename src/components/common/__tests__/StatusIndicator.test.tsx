import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusIndicator from '../StatusIndicator';
import * as useI18n from '@/i18n/i18n';

vi.mock('@/i18n/i18n');

describe('StatusIndicator', () => {
  beforeEach(() => {
    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('should show normal status', () => {
    render(
      <StatusIndicator
        pythonStatus='started'
        ollamaStatus='connected'
        provider='ollama'
      />
    );
    expect(
      screen.getByText(/serverStatus.status.serviceNormal/)
    ).toBeInTheDocument();
  });

  it('should show error status', () => {
    render(
      <StatusIndicator
        pythonStatus='error'
        ollamaStatus='disconnected'
        provider='ollama'
      />
    );
    expect(
      screen.getByText(/serverStatus.status.serviceError/)
    ).toBeInTheDocument();
  });

  it('should show Ollama disconnected status', () => {
    render(
      <StatusIndicator
        pythonStatus='started'
        ollamaStatus='disconnected'
        provider='ollama'
      />
    );
    expect(
      screen.getByText(/serverStatus.status.ollamaNotConnected/)
    ).toBeInTheDocument();
  });

  it('should show starting status', () => {
    render(
      <StatusIndicator
        pythonStatus='starting'
        ollamaStatus='checking'
        provider='ollama'
      />
    );
    expect(
      screen.getByText(/serverStatus.status.starting/)
    ).toBeInTheDocument();
  });

  it('should show normal status for non-Ollama provider', () => {
    render(
      <StatusIndicator
        pythonStatus='started'
        ollamaStatus='checking'
        provider='openai'
      />
    );
    expect(
      screen.getByText(/serverStatus.status.serviceNormal/)
    ).toBeInTheDocument();
  });
});
