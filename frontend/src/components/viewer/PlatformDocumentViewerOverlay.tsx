

import { useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { DocumentViewer } from '@/components/viewer/DocumentViewer';
import { 
  useDocumentViewerService,
  useViewerIsOpen,
  useViewerDocument,
  useViewerContext,
  useViewerNavigation,
} from '@/hooks/useDocumentViewerService';

// ============================================================================
// PLATFORM VIEWER OVERLAY
// ============================================================================
// This component should be rendered once at the app level (e.g., in layout.tsx)
// It automatically shows/hides based on the viewer service state

export function PlatformDocumentViewerOverlay() {
  const isOpen = useViewerIsOpen();
  const viewerDoc = useViewerDocument();
  const context = useViewerContext();
  const { canBack, canForward, back, forward } = useViewerNavigation();
  const closeViewer = useDocumentViewerService(s => s.closeViewer);
  
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeViewer();
      }
      // Alt+Left/Right for history navigation
      if (e.altKey && e.key === 'ArrowLeft' && canBack) {
        back();
      }
      if (e.altKey && e.key === 'ArrowRight' && canForward) {
        forward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeViewer, canBack, canForward, back, forward]);
  
  // Prevent body scroll when open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (isOpen) {
      window.document.body.style.overflow = 'hidden';
    } else {
      window.document.body.style.overflow = '';
    }
    return () => {
      window.document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen || !viewerDoc) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Navigation bar with source context */}
      <div className="h-10 bg-surface-elevated border-b border-border flex items-center px-3 gap-2">
        {/* History navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={back}
            disabled={!canBack}
            className="p-1.5 rounded hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Back (Alt+←)"
          >
            <ArrowLeft className="w-4 h-4 text-text-muted" />
          </button>
          <button
            onClick={forward}
            disabled={!canForward}
            className="p-1.5 rounded hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Forward (Alt+→)"
          >
            <ArrowRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        
        {/* Source context */}
        <div className="flex-1 flex items-center gap-2 text-xs text-text-muted">
          <span className="px-2 py-0.5 bg-surface-card rounded capitalize">
            {context?.sourceModule || 'Document'}
          </span>
          <span>•</span>
          <span className="truncate">{viewerDoc.title}</span>
        </div>
        
        {/* Close button */}
        <button
          onClick={closeViewer}
          className="p-1.5 rounded hover:bg-surface-card transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>
      
      {/* Document Viewer */}
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          document={viewerDoc}
          onClose={closeViewer}
          readOnly={context?.readOnly}
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PlatformDocumentViewerOverlay as default };
