
/**
 * Route Error Boundary
 * Catches errors in page components and displays recovery UI
 * 
 * @version 0.38.0
 */

import { useEffect } from 'react';
import { AlertOctagon, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'route', digest: error.digest ?? 'none' },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-accent-red/10 flex items-center justify-center">
            <AlertOctagon className="w-10 h-10 text-accent-red" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-muted mb-6">
          An unexpected error occurred. Our team has been notified.
        </p>

        {/* Error Details (dev only) */}
        {true && (
          <div className="mb-6 p-4 bg-surface-elevated border border-border rounded-lg text-left">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted mb-2">
              <Bug className="w-3.5 h-3.5" />
              Development Error Details
            </div>
            <code className="text-xs text-accent-red block overflow-x-auto">
              {error.message}
            </code>
            {error.digest && (
              <p className="text-xs text-text-muted mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-elevated text-text-primary border border-border rounded-lg font-medium hover:bg-surface-card transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>

        {/* Support Link */}
        <p className="mt-8 text-sm text-text-muted">
          If this problem persists, please{' '}
          <button 
            onClick={() => {
              const subject = encodeURIComponent('Ligature Error Report');
              const body = encodeURIComponent(`Error: ${error.message}\nDigest: ${error.digest || 'N/A'}\nTimestamp: ${new Date().toISOString()}`);
              window.location.href = `mailto:support@ligaturerd.io?subject=${subject}&body=${body}`;
            }}
            className="text-accent-blue hover:underline"
          >
            contact support
          </button>
        </p>
      </div>
    </div>
  );
}
