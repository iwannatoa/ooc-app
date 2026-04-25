import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in the subtree and shows a minimal fallback UI.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          role="alert"
          style={{
            padding: '1.5rem',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '32rem',
            margin: '2rem auto',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#555', marginBottom: '1rem' }}>
            The application hit an unexpected error. You can try reloading the
            page.
          </p>
          <button type="button" onClick={this.handleRetry}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
