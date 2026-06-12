

// ============================================================================
// ReturnBreadcrumb - v0.12.5: Navigation Stack Integration (Sprint 3 E.2)
// ============================================================================
// Enhanced return navigation component with:
// - Full integration with useNavigationStackStore
// - Forward/back navigation support
// - Stack visualization dropdown
// - Keyboard shortcuts (Alt+Left/Right for back/forward)
// - Smooth scroll restoration
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, X, Clock, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { ModuleId } from '@/types/core';
import { useAppStore } from '@/store/useAppStore';
import { 
  useNavigationStackStore, 
  getModuleLabel,
  type NavigationFrame 
} from '@/store/useNavigationStackStore';

// ============================================================================
// TYPES
// ============================================================================

interface ReturnBreadcrumbProps {
  /** Show navigation history dropdown */
  showHistory?: boolean;
  /** Maximum history items to show */
  maxHistoryItems?: number;
  /** Callback when navigation occurs */
  onNavigate?: (frame: NavigationFrame) => void;
  /** Position variant */
  variant?: 'inline' | 'floating' | 'banner' | 'minimal';
  /** Show forward navigation button */
  showForward?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface HistoryDropdownProps {
  stack: NavigationFrame[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// ============================================================================
// MODULE COLORS
// ============================================================================

const MODULE_COLORS: Record<ModuleId, string> = {
  'portfolio': 'blue',
  'action-center': 'red',
  'activity': 'blue',
  'haq': 'amber',
  'safety': 'red',
  'psmf': 'red',
  'glp': 'amber',
  'nonclinical': 'amber',
  'ctms': 'emerald',
  'tmf': 'purple',
  'qms': 'teal',
  'authoring': 'slate',
  'publishing': 'blue',
  'ectd-workspace': 'blue',
  'submissions': 'amber',
  'submissions-hub': 'amber',
  'publishing-center': 'blue',
  'ectd-publishing': 'blue',
  'research': 'cyan',
  'sample-management': 'cyan',
  'eln': 'emerald',
  'development': 'green',
  'study-design': 'green',
  'quality': 'red',
  'cmc': 'slate',
  'cmc-manufacturing': 'slate',
  'labeling': 'amber',
  'strategy': 'amber',
  'supply-chain': 'green',
  'publications': 'cyan',
  'admin': 'purple',
  'master-data': 'amber',
  'document-control': 'red',
  'study-intel': 'green',
  'inspector-readiness': 'red',
  'archives': 'red',
  'ai-generation': 'teal',
  'analytics': 'teal',
  'reg-calendar': 'teal',
  'medical-affairs': 'teal',
  'continuous-submission': 'teal',
  'ai-consistency': 'teal',
  'idmp': 'teal',
  'commercial': 'purple',
  'manufacturing': 'slate',
  'registrations': 'amber',
  'commitments': 'amber',
  'portfolio-strategy': 'blue',
  // v0.33.23: New modules
  'signal-detection': 'rose',
  'stability': 'orange',
  'batch-records': 'orange',
  'home': 'Home',
  'research-lead-opt': 'Lead Optimization',
  'research-translational': 'Translational Science',
  'research-targets': 'Research Targets',
  'research-preclinical': 'Preclinical Research',
  'research-ind': 'IND Readiness',
  'research-literature': 'Literature Monitoring',
  'research-intelligence': 'Competitive Intelligence',
  'biostats': 'Biostatistics',
  'study-startup': 'Study Startup',
  'submission-command': 'Submission Command',
  'submission-planning': 'Submission Planning',
  'template-registry': 'Template Registry',
  'spl': 'Structured Product Labeling',
  'ectd-intelligence': 'eCTD Intelligence',
  'reg-intel': 'Regulatory Intelligence',
  'gcp': 'GCP Compliance',
  'gmp': 'GMP Compliance',
  'adpromo': 'Ad/Promo Review',
  'rd-connected': 'R&D Connected',
  'agent-hub': 'Agent Hub',
  'ai-authoring': 'cyan',
};

// ============================================================================
// HISTORY DROPDOWN COMPONENT
// ============================================================================

function HistoryDropdown({ stack, currentIndex, isOpen, onClose, onNavigate }: HistoryDropdownProps) {
  if (!isOpen || stack.length === 0) return null;
  
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-surface-elevated border border-border rounded-lg shadow-lg z-50">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Navigation Stack
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-card rounded"
        >
          <X className="w-3.5 h-3.5 text-text-muted" />
        </button>
      </div>
      <div className="max-h-64 overflow-auto p-1">
        {stack.map((frame, index) => {
          const color = MODULE_COLORS[frame.moduleId] || 'blue';
          const isCurrent = index === currentIndex;
          const isClickable = index !== currentIndex;
          
          return (
            <button
              key={frame.id}
              onClick={() => isClickable && onNavigate(index)}
              disabled={!isClickable}
              className={`
                w-full flex items-center gap-2 p-2 text-left rounded transition-colors
                ${isCurrent 
                  ? 'bg-accent-blue/10 border border-accent-blue/30' 
                  : 'hover:bg-surface-card'
                }
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Index indicator */}
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium
                  ${isCurrent 
                    ? 'bg-accent-blue text-white' 
                    : 'bg-surface-card text-text-muted'
                  }
                `}>
                  {stack.length - index}
                </div>
                
                {/* Module color dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `var(--accent-${color})` }}
                />
                
                {/* Frame info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${isCurrent ? 'text-accent-blue font-medium' : 'text-text-primary'}`}>
                    {frame.label || getModuleLabel(frame.moduleId)}
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(frame.timestamp)}
                    {frame.viewMode && (
                      <span className="ml-1">• {frame.viewMode}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Current indicator */}
              {isCurrent && (
                <span className="text-xs text-accent-blue font-medium px-1.5 py-0.5 bg-accent-blue/10 rounded">
                  Current
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReturnBreadcrumb({
  showHistory = true,
  maxHistoryItems = 10,
  onNavigate,
  variant = 'inline',
  showForward = true,
  className = '',
}: ReturnBreadcrumbProps) {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  // Navigation stack store
  const stack = useNavigationStackStore((s) => s.stack);
  const currentIndex = useNavigationStackStore((s) => s.currentIndex);
  const goBack = useNavigationStackStore((s) => s.goBack);
  const goForward = useNavigationStackStore((s) => s.goForward);
  const goToIndex = useNavigationStackStore((s) => s.goToIndex);
  const canGoBack = useNavigationStackStore((s) => s.canGoBack);
  const canGoForward = useNavigationStackStore((s) => s.canGoForward);
  const getPreviousFrame = useNavigationStackStore((s) => s.getPreviousFrame);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const previousFrame = getPreviousFrame();
  const canNavigateBack = canGoBack();
  const canNavigateForward = canGoForward();
  
  // Handle back navigation
  const handleGoBack = useCallback(() => {
    const frame = goBack();
    if (frame) {
      setActiveModule(frame.moduleId);
      
      // Restore scroll position
      if (frame.scrollPosition && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: frame.scrollPosition, behavior: 'smooth' });
        });
      }
      
      onNavigate?.(frame);
    }
  }, [goBack, setActiveModule, onNavigate]);
  
  // Handle forward navigation
  const handleGoForward = useCallback(() => {
    const frame = goForward();
    if (frame) {
      setActiveModule(frame.moduleId);
      
      if (frame.scrollPosition && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: frame.scrollPosition, behavior: 'smooth' });
        });
      }
      
      onNavigate?.(frame);
    }
  }, [goForward, setActiveModule, onNavigate]);
  
  // Handle history navigation
  const handleHistoryNavigate = useCallback((index: number) => {
    const frame = goToIndex(index);
    if (frame) {
      setActiveModule(frame.moduleId);
      
      if (frame.scrollPosition && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: frame.scrollPosition, behavior: 'smooth' });
        });
      }
      
      onNavigate?.(frame);
    }
    setIsHistoryOpen(false);
  }, [goToIndex, setActiveModule, onNavigate]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Left for back
      if (e.altKey && e.key === 'ArrowLeft' && canNavigateBack) {
        e.preventDefault();
        handleGoBack();
      }
      // Alt+Right for forward
      if (e.altKey && e.key === 'ArrowRight' && canNavigateForward) {
        e.preventDefault();
        handleGoForward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigateBack, canNavigateForward, handleGoBack, handleGoForward]);
  
  // Don't render if no navigation history
  if (!canNavigateBack && !canNavigateForward) return null;
  
  const moduleLabel = previousFrame 
    ? (previousFrame.label || getModuleLabel(previousFrame.moduleId))
    : '';
  const color = previousFrame ? (MODULE_COLORS[previousFrame.moduleId] || 'blue') : 'blue';
  
  // Visible stack for dropdown (most recent first)
  const visibleStack = [...stack].reverse().slice(0, maxHistoryItems);
  const reversedCurrentIndex = stack.length - 1 - currentIndex;
  
  // Variant-specific styles
  const variantStyles = {
    inline: 'bg-surface-card border border-border rounded-lg px-3 py-1.5',
    floating: 'fixed top-4 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-full px-4 py-2 shadow-lg z-40',
    banner: 'bg-accent-blue/5 border-b border-accent-blue/20 px-4 py-2',
    minimal: 'px-2 py-1',
  };
  
  // Minimal variant - just back button
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleGoBack}
        disabled={!canNavigateBack}
        className={`
          inline-flex items-center gap-1.5 text-sm text-text-secondary 
          hover:text-text-primary transition-colors disabled:opacity-50 
          disabled:cursor-not-allowed ${className}
        `}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>
    );
  }
  
  return (
    <div className={`relative ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center gap-2">
        {/* Back button */}
        <button
          onClick={handleGoBack}
          disabled={!canNavigateBack}
          className={`
            flex items-center gap-2 text-sm transition-colors group
            ${canNavigateBack 
              ? 'text-text-secondary hover:text-text-primary cursor-pointer' 
              : 'text-text-muted cursor-not-allowed'
            }
          `}
          title="Go back (Alt+←)"
        >
          <ArrowLeft className={`w-4 h-4 ${canNavigateBack ? 'group-hover:-translate-x-0.5' : ''} transition-transform`} />
          {canNavigateBack && (
            <>
              <span className="text-text-muted">Back to</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--accent-${color}) 20%, transparent)`,
                  color: `var(--accent-${color})`,
                }}
              >
                {moduleLabel}
              </span>
            </>
          )}
        </button>
        
        {/* Forward button */}
        {showForward && (
          <button
            onClick={handleGoForward}
            disabled={!canNavigateForward}
            className={`
              p-1 rounded transition-colors
              ${canNavigateForward 
                ? 'text-text-secondary hover:text-text-primary hover:bg-surface-card cursor-pointer' 
                : 'text-text-muted cursor-not-allowed opacity-50'
              }
            `}
            title="Go forward (Alt+→)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        
        {/* Separator */}
        {showHistory && stack.length > 1 && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            
            {/* History toggle */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{stack.length} in stack</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}
      </div>
      
      {/* History dropdown */}
      {showHistory && (
        <HistoryDropdown
          stack={visibleStack}
          currentIndex={reversedCurrentIndex}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onNavigate={(reversedIndex) => {
            // Convert reversed index back to stack index
            const stackIndex = stack.length - 1 - reversedIndex;
            handleHistoryNavigate(stackIndex);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export function ReturnBreadcrumbCompact({
  onNavigate,
  className = '',
}: Pick<ReturnBreadcrumbProps, 'onNavigate' | 'className'>) {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const goBack = useNavigationStackStore((s) => s.goBack);
  const canGoBack = useNavigationStackStore((s) => s.canGoBack);
  const getPreviousFrame = useNavigationStackStore((s) => s.getPreviousFrame);
  
  const previousFrame = getPreviousFrame();
  
  const handleReturn = useCallback(() => {
    const frame = goBack();
    if (frame) {
      setActiveModule(frame.moduleId);
      if (frame.scrollPosition && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: frame.scrollPosition, behavior: 'smooth' });
        });
      }
      onNavigate?.(frame);
    }
  }, [goBack, setActiveModule, onNavigate]);
  
  if (!canGoBack() || !previousFrame) return null;
  
  return (
    <button
      onClick={handleReturn}
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs hover:bg-accent-blue/20 transition-colors ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back to {previousFrame.label || getModuleLabel(previousFrame.moduleId)}</span>
    </button>
  );
}

// ============================================================================
// FLOATING RETURN BUTTON
// ============================================================================

export function FloatingReturnButton({
  onNavigate,
  position = 'bottom-right',
}: {
  onNavigate?: (frame: NavigationFrame) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const goBack = useNavigationStackStore((s) => s.goBack);
  const canGoBack = useNavigationStackStore((s) => s.canGoBack);
  const getPreviousFrame = useNavigationStackStore((s) => s.getPreviousFrame);
  
  const [isVisible, setIsVisible] = useState(true);
  const previousFrame = getPreviousFrame();
  
  const handleReturn = useCallback(() => {
    const frame = goBack();
    if (frame) {
      setActiveModule(frame.moduleId);
      if (frame.scrollPosition && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: frame.scrollPosition, behavior: 'smooth' });
        });
      }
      onNavigate?.(frame);
    }
  }, [goBack, setActiveModule, onNavigate]);
  
  if (!canGoBack() || !previousFrame || !isVisible) return null;
  
  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };
  
  const moduleLabel = previousFrame.label || getModuleLabel(previousFrame.moduleId);
  
  return (
    <div className={`fixed ${positionStyles[position]} z-40 flex items-center gap-2`}>
      <button
        onClick={handleReturn}
        className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-full shadow-lg hover:shadow-xl hover:border-accent-blue transition-all group"
      >
        <ArrowLeft className="w-4 h-4 text-accent-blue group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm text-text-primary">
          Return to <span className="font-medium text-accent-blue">{moduleLabel}</span>
        </span>
      </button>
      <button
        onClick={() => setIsVisible(false)}
        className="p-2 bg-surface-elevated border border-border rounded-full shadow hover:bg-surface-card transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ReturnBreadcrumb;
