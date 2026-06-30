import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '@/i18n/translate';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || translate('error.unknown'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  private handleHome = (): void => {
    window.location.hash = '#/master';
    this.handleRetry();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#808080] p-4">
        <div className="win-dialog-window w-full max-w-md shadow-lg">
          <div className="win-titlebar text-[#800000]">{translate('errorBoundary.title')}</div>
          <div className="space-y-3 bg-[#ece9d8] p-4 text-sm">
            <p className="font-semibold text-content">{translate('errorBoundary.heading')}</p>
            <p className="break-words border border-[#404040] bg-white p-2 font-mono text-xs text-[#800000]">
              {this.state.message}
            </p>
            <p className="text-xs text-content-muted">{translate('errorBoundary.hint')}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="win-button" onClick={this.handleHome}>
                {translate('errorBoundary.home')}
              </button>
              <button
                type="button"
                className="win-button win-button-primary"
                onClick={this.handleRetry}
              >
                {translate('errorBoundary.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
