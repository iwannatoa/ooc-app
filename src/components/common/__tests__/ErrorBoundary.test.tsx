import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

function ThrowError(): never {
  throw new Error('test-boundary');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>ok</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders fallback when a child throws during render', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload/i })
    ).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
