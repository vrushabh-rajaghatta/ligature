

/**
 * ErrorBoundary - v128
 * 
 * Module-level error boundaries with recovery actions.
 * Provides graceful degradation and error logging.
 */

import React, { Component, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { useErrorLogStore } from '@/store/useErrorLogStore';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Module name for error context */
  moduleName?: string;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to show technical details toggle */
  showDetails?: boolean;
  /** Recovery actions */
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showTechnicalDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showTechnicalDetails: process.env.NODE_ENV === 'development',
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Always log to console with full details
    console.error(
      `[ErrorBoundary] ${this.props.moduleName ?? 'Unknown module'}: ${error.message}`,
      '\nStack:', error.stack,
      '\nComponent stack:', errorInfo.componentStack,
    );

    // v0.122.0: Write to global error log store for Health Check panel
    try {
      useErrorLogStore.getState().logError({
        moduleName: this.props.moduleName ?? 'Unknown',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack ?? undefined,
      });
    } catch { /* store may not be available during SSR */ }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showTechnicalDetails: false 
    });
    this.props.onRetry?.();
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Module: ${this.props.moduleName || 'Unknown'}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      console.error('Failed to copy error details');
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showTechnicalDetails, copied } = this.state;
      const { moduleName, showDetails = true, onNavigateHome } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-lg w-full">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center">
                <AlertOctagon className="w-8 h-8 text-accent-red" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Something went wrong
              </h2>
              <p className="text-text-muted mb-3">
                {moduleName 
                  ? `An error occurred in the ${moduleName} module.`
                  : 'An unexpected error occurred while rendering this component.'
                }
              </p>
              {/* v0.122.0: Show actual error message prominently */}
              {error?.message && (
                <div className="mt-2 px-4 py-2.5 bg-accent-red/8 border border-accent-red/20 rounded-lg text-left">
                  <span className="text-xs font-semibold text-accent-red uppercase tracking-wider">Error</span>
                  <p className="text-sm text-text-primary mt-0.5 font-mono break-all">{error.message}</p>
                </div>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              {onNavigateHome && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onNavigateHome}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              )}
            </div>

            {/* Technical Details (collapsible) */}
            {showDetails && error && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => this.setState(s => ({ showTechnicalDetails: !s.showTechnicalDetails }))}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-muted hover:bg-surface-elevated transition-colors"
                >
                  <span>Technical Details</span>
                  {showTechnicalDetails 
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </button>
                
                {showTechnicalDetails && (
                  <div className="border-t border-border bg-surface-elevated">
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">Error Message</div>
                        <code className="text-xs text-accent-red block bg-surface-base p-2 rounded overflow-x-auto">
                          {error.message}
                        </code>
                      </div>
                      
                      {error.stack && (
                        <div>
                          <div className="text-xs font-medium text-text-muted mb-1">Stack Trace</div>
                          <pre className="text-xs text-text-muted bg-surface-base p-2 rounded overflow-x-auto max-h-32">
                            {error.stack.split('\n').slice(0, 5).join('\n')}
                          </pre>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={this.handleCopyError}
                          className="gap-2 text-xs"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-accent-green" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Error Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for ErrorBoundary with hooks support
 */
interface ModuleErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'onNavigateHome'> {
  children: ReactNode;
}

export function ModuleErrorBoundary({ 
  children, 
  moduleName,
  ...props 
}: ModuleErrorBoundaryProps) {
  const handleNavigateHome = () => {
    // In a real app, this would use the router
    window.location.href = '/';
  };

  return (
    <ErrorBoundary
      moduleName={moduleName}
      onNavigateHome={handleNavigateHome}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Inline error display for non-critical errors
 */
interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ 
  message = 'Failed to load content',
  onRetry,
  className = ''
}: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-accent-red/10 border border-accent-red/20 rounded-lg ${className}`}>
      <AlertOctagon className="w-5 h-5 text-accent-red flex-shrink-0" />
      <span className="text-sm text-text-primary flex-1">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Card-level error state
 */
interface CardErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function CardError({
  title = 'Error Loading Data',
  message = 'We couldn\'t load this content. Please try again.',
  onRetry,
  className = ''
}: CardErrorProps) {
  return (
    <div className={`bg-surface-card border border-border rounded-xl p-6 text-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
        <AlertOctagon className="w-6 h-6 text-accent-red" />
      </div>
      <h4 className="font-medium text-text-primary mb-1">{title}</h4>
      <p className="text-sm text-text-muted mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorBoundary;
