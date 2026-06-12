
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalReviewPortal, ExternalReviewLogin } from '@/components/screens/ExternalReviewPortal';
import { Shield, Loader2 } from 'lucide-react';

/**
 * External Review Route
 * 
 * Handles token-based authentication for external reviewers.
 * Access via: /review?token=ext-xxxxx-xxxxx
 * 
 * This is a standalone page without the main application chrome,
 * providing a focused review experience for external collaborators.
 */

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL params
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setAccessToken(urlToken);
    }
    setIsLoading(false);
  }, [searchParams]);

  const handleTokenSubmit = (token: string) => {
    setAccessToken(token);
    // Update URL with token for bookmarking/sharing
    const url = new URL(window.location.href);
    url.searchParams.set('token', token);
    window.history.replaceState({}, '', url.toString());
  };

  const handleLogout = () => {
    setAccessToken(null);
    // Clear token from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading review portal...</p>
        </div>
      </div>
    );
  }

  // If no token, show login screen
  if (!accessToken) {
    return <ExternalReviewLogin onTokenSubmit={handleTokenSubmit} />;
  }

  // If token present, show the portal
  return <ExternalReviewPortal accessToken={accessToken} onLogout={handleLogout} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-accent-blue mx-auto mb-4" />
          <p className="text-text-secondary">Initializing secure review portal...</p>
        </div>
      </div>
    }>
      <ReviewPageContent />
    </Suspense>
  );
}
