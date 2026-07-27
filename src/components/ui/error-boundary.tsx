"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * SKED-styled error boundary.
 *
 * Wraps a component tree and catches rendering errors.
 * Shows a calm, actionable error message instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <div className="mb-3 text-3xl">⚠️</div>
          <h2 className="mb-1 text-lg font-semibold">Something went wrong</h2>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            This section encountered an unexpected error. Try refreshing, or go
            back and try again.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
            <Button onClick={this.handleReset}>Try again</Button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-4 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-foreground/5 p-3 text-xs">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
