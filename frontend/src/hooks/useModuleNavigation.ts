

/**
 * useModuleNavigation - v174
 * 
 * Cross-module navigation hook that supports:
 * - Navigating to modules with filter presets
 * - Deep linking to specific views within modules
 * - Maintaining navigation context across modules
 * - v174: Return context with scroll position preservation
 * - v174: Cross-module document navigation with breadcrumb trail
 * 
 * v112: Added Safety, RegStrategy, DocumentControl navigation helpers
 *       Added 15 new navigation presets
 * v174: Added return context for cross-module document navigation
 *       Added navigateWithReturn for HAQ context panel
 *       Added navigation history stack
 * 
 * This enables clickable StatCards that navigate users to relevant
 * filtered views, creating a connected E2E experience.
 */

import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ModuleId } from '@/types/core';

// View modes for specific modules
export type HAQViewMode = 'dashboard' | 'correspondence' | 'questions' | 'predictions' | 'analytics';
export type SubmissionsViewMode = 'overview' | 'tracker' | 'builder' | 'validation';
export type SafetyViewMode = 'dashboard' | 'cases' | 'signals' | 'reports';
export type QualityViewMode = 'overview' | 'changes' | 'deviations' | 'batches' | 'stability';
export type RegStrategyViewMode = 'intel' | 'strategy' | 'risks';
export type DocumentControlViewMode = 'overview' | 'documents' | 'workflows' | 'archive';
export type TMFViewMode = 'studies' | 'artifacts' | 'compliance' | 'trends';
export type CTMSViewMode = 'studies' | 'sites' | 'enrollment' | 'safety';

// Navigation targets with optional filter/view context
export interface NavigationTarget {
  module: ModuleId;
  // Optional filter presets to apply
  filters?: {
    status?: string;
    priority?: string;
    discipline?: string;
    product?: string;
  };
  // Optional view mode for modules that support it
  viewMode?: string;
  // Optional selection to make
  selection?: {
    haqId?: string;
    documentId?: string;
    submissionId?: string;
    signalId?: string;
    studyId?: string;
    artifactId?: string;
  };
}

// v174: Return context for cross-module navigation
export interface ReturnContext {
  module: ModuleId;
  viewMode?: string;
  scrollPosition?: number;
  selection?: NavigationTarget['selection'];
  label: string; // e.g., "HAQ CMC-1" for breadcrumb
}

// v174: Navigation history entry
export interface NavigationHistoryEntry {
  module: ModuleId;
  viewMode?: string;
  timestamp: number;
  label: string;
}

// Common navigation presets for quick access
export const NAV_PRESETS = {
  // HAQ presets
  haqOverdue: {
    module: 'haq' as ModuleId,
    filters: { status: 'overdue' },
    viewMode: 'questions',
  },
  haqInProgress: {
    module: 'haq' as ModuleId,
    filters: { status: 'in-progress' },
    viewMode: 'questions',
  },
  haqDraftReady: {
    module: 'haq' as ModuleId,
    filters: { status: 'draft-ready' },
    viewMode: 'questions',
  },
  haqCritical: {
    module: 'haq' as ModuleId,
    filters: { priority: 'critical' },
    viewMode: 'questions',
  },
  haqDashboard: {
    module: 'haq' as ModuleId,
    viewMode: 'dashboard',
  },
  haqAnalytics: {
    module: 'haq' as ModuleId,
    viewMode: 'analytics',
  },
  
  // Submissions presets
  submissionsActive: {
    module: 'submissions' as ModuleId,
    filters: { status: 'active' },
  },
  submissionsPending: {
    module: 'submissions' as ModuleId,
    filters: { status: 'pending' },
  },
  
  // Portfolio presets
  portfolioAll: {
    module: 'portfolio' as ModuleId,
  },
  
  // Quality presets
  qualityOpen: {
    module: 'quality' as ModuleId,
    filters: { status: 'open' },
  },
  
  // v112: Safety presets
  safetyCases: {
    module: 'safety' as ModuleId,
    viewMode: 'cases',
  },
  safetySignals: {
    module: 'safety' as ModuleId,
    viewMode: 'signals',
  },
  safetyCritical: {
    module: 'safety' as ModuleId,
    filters: { priority: 'critical' },
    viewMode: 'signals',
  },
  safetyReports: {
    module: 'safety' as ModuleId,
    viewMode: 'reports',
  },
  
  // v112: Quality presets (expanded)
  qualityChanges: {
    module: 'quality' as ModuleId,
    viewMode: 'changes',
  },
  qualityDeviations: {
    module: 'quality' as ModuleId,
    viewMode: 'deviations',
  },
  qualityBatches: {
    module: 'quality' as ModuleId,
    viewMode: 'batches',
  },
  qualityStability: {
    module: 'quality' as ModuleId,
    viewMode: 'stability',
  },
  
  // v112: Regulatory Strategy presets
  regStrategyIntel: {
    module: 'strategy' as ModuleId,
    viewMode: 'intel',
  },
  regStrategyCritical: {
    module: 'strategy' as ModuleId,
    filters: { priority: 'critical' },
    viewMode: 'intel',
  },
  regStrategyRisks: {
    module: 'strategy' as ModuleId,
    viewMode: 'risks',
  },
  
  // v112: Document Control presets
  docControlDocuments: {
    module: 'document-control' as ModuleId,
    viewMode: 'documents',
  },
  docControlWorkflows: {
    module: 'document-control' as ModuleId,
    viewMode: 'workflows',
  },
} as const;

export type NavPreset = keyof typeof NAV_PRESETS;

/**
 * Navigation context that can be passed to modules
 * Stored in session to support view initialization
 */
export interface NavigationContext {
  fromModule: ModuleId;
  filters?: NavigationTarget['filters'];
  viewMode?: string;
  selection?: NavigationTarget['selection'];
  timestamp: number;
}

// Session storage key for navigation context
const NAV_CONTEXT_KEY = 'ligature-nav-context';
// v174: Session storage key for return context
const RETURN_CONTEXT_KEY = 'ligature-return-context';
// v174: Session storage key for navigation history
const NAV_HISTORY_KEY = 'ligature-nav-history';
// v174: Maximum history entries
const MAX_HISTORY_ENTRIES = 10;

/**
 * Store navigation context for target module to pick up
 */
function storeNavContext(context: NavigationContext) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(NAV_CONTEXT_KEY, JSON.stringify(context));
  }
}

/**
 * v174: Store return context for navigating back
 */
function storeReturnContext(context: ReturnContext) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
  }
}

/**
 * v174: Get return context without consuming it
 */
export function getReturnContext(): ReturnContext | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(RETURN_CONTEXT_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as ReturnContext;
  } catch {
    return null;
  }
}

/**
 * v174: Consume and clear return context
 */
export function consumeReturnContext(): ReturnContext | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(RETURN_CONTEXT_KEY);
  if (!stored) return null;
  
  sessionStorage.removeItem(RETURN_CONTEXT_KEY);
  
  try {
    return JSON.parse(stored) as ReturnContext;
  } catch {
    return null;
  }
}

/**
 * v174: Add entry to navigation history
 */
function addToNavHistory(entry: NavigationHistoryEntry) {
  if (typeof window === 'undefined') return;
  
  const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
  let history: NavigationHistoryEntry[] = [];
  
  if (stored) {
    try {
      history = JSON.parse(stored);
    } catch {
      history = [];
    }
  }
  
  // Add new entry and limit size
  history.push(entry);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history = history.slice(-MAX_HISTORY_ENTRIES);
  }
  
  sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(history));
}

/**
 * v174: Get navigation history
 */
export function getNavHistory(): NavigationHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  
  const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as NavigationHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Retrieve and clear navigation context
 */
export function consumeNavContext(): NavigationContext | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(NAV_CONTEXT_KEY);
  if (!stored) return null;
  
  sessionStorage.removeItem(NAV_CONTEXT_KEY);
  
  try {
    const context = JSON.parse(stored) as NavigationContext;
    // Context expires after 5 seconds
    if (Date.now() - context.timestamp > 5000) return null;
    return context;
  } catch {
    return null;
  }
}

/**
 * Hook for cross-module navigation
 */
export function useModuleNavigation() {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const activeModule = useAppStore((s) => s.selection.activeModule) as ModuleId;
  const selectHAQ = useAppStore((s) => s.selectHAQ);
  const selectDocument = useAppStore((s) => s.selectDocument);
  const selectSubmission = useAppStore((s) => s.selectSubmission);
  
  /**
   * Navigate to a module with optional filter/view context
   */
  const navigateTo = useCallback((target: NavigationTarget) => {
    // Store context for target module
    storeNavContext({
      fromModule: activeModule,
      filters: target.filters,
      viewMode: target.viewMode,
      selection: target.selection,
      timestamp: Date.now(),
    });
    
    // Make selections if specified
    if (target.selection?.haqId) {
      selectHAQ(target.selection.haqId);
    }
    if (target.selection?.documentId) {
      selectDocument(target.selection.documentId);
    }
    if (target.selection?.submissionId) {
      selectSubmission(target.selection.submissionId);
    }
    
    // Navigate to module
    setActiveModule(target.module);
  }, [activeModule, setActiveModule, selectHAQ, selectDocument, selectSubmission]);
  
  /**
   * Navigate using a preset
   */
  const navigateToPreset = useCallback((preset: NavPreset) => {
    navigateTo(NAV_PRESETS[preset]);
  }, [navigateTo]);
  
  /**
   * Quick navigation to HAQ module with filters
   */
  const navigateToHAQ = useCallback((options?: {
    status?: string;
    priority?: string;
    discipline?: string;
    viewMode?: HAQViewMode;
    haqId?: string;
  }) => {
    navigateTo({
      module: 'haq',
      filters: {
        status: options?.status,
        priority: options?.priority,
        discipline: options?.discipline,
      },
      viewMode: options?.viewMode,
      selection: options?.haqId ? { haqId: options.haqId } : undefined,
    });
  }, [navigateTo]);
  
  /**
   * Quick navigation to Submissions module
   */
  const navigateToSubmissions = useCallback((options?: {
    status?: string;
    viewMode?: SubmissionsViewMode;
    submissionId?: string;
  }) => {
    navigateTo({
      module: 'submissions',
      filters: { status: options?.status },
      viewMode: options?.viewMode,
      selection: options?.submissionId ? { submissionId: options.submissionId } : undefined,
    });
  }, [navigateTo]);
  
  /**
   * Quick navigation to Quality module
   */
  const navigateToQuality = useCallback((options?: {
    status?: string;
    viewMode?: QualityViewMode;
  }) => {
    navigateTo({
      module: 'quality',
      filters: { status: options?.status },
      viewMode: options?.viewMode,
    });
  }, [navigateTo]);
  
  /**
   * v112: Quick navigation to Safety module
   */
  const navigateToSafety = useCallback((options?: {
    status?: string;
    priority?: string;
    viewMode?: SafetyViewMode;
  }) => {
    navigateTo({
      module: 'safety',
      filters: { 
        status: options?.status,
        priority: options?.priority,
      },
      viewMode: options?.viewMode,
    });
  }, [navigateTo]);
  
  /**
   * v112: Quick navigation to Regulatory Strategy module
   */
  const navigateToRegStrategy = useCallback((options?: {
    priority?: string;
    viewMode?: RegStrategyViewMode;
  }) => {
    navigateTo({
      module: 'strategy',
      filters: { priority: options?.priority },
      viewMode: options?.viewMode,
    });
  }, [navigateTo]);
  
  /**
   * v112: Quick navigation to Document Control module
   */
  const navigateToDocumentControl = useCallback((options?: {
    status?: string;
    viewMode?: DocumentControlViewMode;
  }) => {
    navigateTo({
      module: 'document-control',
      filters: { status: options?.status },
      viewMode: options?.viewMode,
    });
  }, [navigateTo]);
  
  /**
   * v174: Navigate to a document in another module with return context
   * This enables the "click into linked doc, then navigate back" pattern
   */
  const navigateWithReturn = useCallback((
    target: NavigationTarget,
    returnLabel: string
  ) => {
    // Store return context before navigating
    storeReturnContext({
      module: activeModule,
      label: returnLabel,
      scrollPosition: typeof window !== 'undefined' ? window.scrollY : 0,
    });
    
    // Add to navigation history
    addToNavHistory({
      module: target.module,
      viewMode: target.viewMode,
      timestamp: Date.now(),
      label: returnLabel,
    });
    
    // Navigate
    navigateTo(target);
  }, [activeModule, navigateTo]);
  
  /**
   * v174: Navigate back using return context
   */
  const navigateBack = useCallback(() => {
    const returnContext = consumeReturnContext();
    if (returnContext) {
      navigateTo({
        module: returnContext.module,
        viewMode: returnContext.viewMode,
        selection: returnContext.selection,
      });
      
      // Restore scroll position after a brief delay
      if (returnContext.scrollPosition && typeof window !== 'undefined') {
        setTimeout(() => {
          window.scrollTo(0, returnContext.scrollPosition || 0);
        }, 100);
      }
    }
  }, [navigateTo]);
  
  /**
   * v174: Check if there's a return context available
   */
  const hasReturnContext = useCallback(() => {
    return getReturnContext() !== null;
  }, []);
  
  /**
   * v174: Navigate to Safety signal from HAQ
   */
  const navigateToSignal = useCallback((signalId: string, returnLabel?: string) => {
    if (returnLabel) {
      navigateWithReturn({
        module: 'safety',
        viewMode: 'signals',
        selection: { signalId },
      }, returnLabel);
    } else {
      navigateTo({
        module: 'safety',
        viewMode: 'signals',
        selection: { signalId },
      });
    }
  }, [navigateTo, navigateWithReturn]);
  
  /**
   * v174: Navigate to Clinical study from HAQ
   */
  const navigateToStudy = useCallback((studyId: string, returnLabel?: string) => {
    if (returnLabel) {
      navigateWithReturn({
        module: 'ctms',
        viewMode: 'studies',
        selection: { studyId },
      }, returnLabel);
    } else {
      navigateTo({
        module: 'ctms',
        viewMode: 'studies',
        selection: { studyId },
      });
    }
  }, [navigateTo, navigateWithReturn]);
  
  /**
   * v174: Navigate to TMF artifact from HAQ
   */
  const navigateToTMFArtifact = useCallback((artifactId: string, returnLabel?: string) => {
    if (returnLabel) {
      navigateWithReturn({
        module: 'tmf',
        viewMode: 'artifacts',
        selection: { artifactId },
      }, returnLabel);
    } else {
      navigateTo({
        module: 'tmf',
        viewMode: 'artifacts',
        selection: { artifactId },
      });
    }
  }, [navigateTo, navigateWithReturn]);
  
  return useMemo(() => ({
    navigateTo,
    navigateToPreset,
    navigateToHAQ,
    navigateToSubmissions,
    navigateToQuality,
    navigateToSafety,
    navigateToRegStrategy,
    navigateToDocumentControl,
    // v174 additions
    navigateWithReturn,
    navigateBack,
    hasReturnContext,
    navigateToSignal,
    navigateToStudy,
    navigateToTMFArtifact,
    activeModule,
  }), [
    navigateTo,
    navigateToPreset,
    navigateToHAQ,
    navigateToSubmissions,
    navigateToQuality,
    navigateToSafety,
    navigateToRegStrategy,
    navigateToDocumentControl,
    navigateWithReturn,
    navigateBack,
    hasReturnContext,
    navigateToSignal,
    navigateToStudy,
    navigateToTMFArtifact,
    activeModule,
  ]);
}

/**
 * Hook to consume navigation context on module mount
 * Use in module screens to apply incoming filters/views
 */
export function useIncomingNavigation() {
  const getContext = useCallback(() => {
    return consumeNavContext();
  }, []);
  
  return useMemo(() => ({ getContext }), [getContext]);
}
