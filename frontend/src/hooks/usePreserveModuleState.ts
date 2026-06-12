


import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { ModuleId } from '@/types/core';
import { 
  useNavigationStackStore, 
  getModuleLabel,
  type NavigationFrame 
} from '@/store/useNavigationStackStore';

// ============================================================================
// usePreserveModuleState - v0.12.5 (Sprint 3 E.3)
// ============================================================================
// Hook for preserving and restoring module state during navigation.
// 
// Usage:
//   const { restoredState, saveState } = usePreserveModuleState('haq', {
//     viewMode,
//     selectedId,
//     filters,
//   }, ['viewMode', 'selectedId', 'filters']);
//
// On mount: Returns any previously saved state for this module
// On unmount: Automatically saves current state to navigation stack
// ============================================================================

interface UsePreserveModuleStateOptions<T> {
  /** Custom label for breadcrumb (defaults to module name) */
  label?: string;
  /** Function to generate dynamic label based on state */
  labelFn?: (state: T) => string;
  /** Whether to automatically save on unmount (default: true) */
  autoSave?: boolean;
  /** Whether to restore scroll position (default: true) */
  restoreScroll?: boolean;
  /** Dependencies that trigger a state snapshot update */
  deps?: unknown[];
}

interface PreserveModuleStateResult<T> {
  /** State restored from navigation stack (null if none) */
  restoredState: Partial<T> | null;
  /** Manually save current state to stack */
  saveState: () => void;
  /** Whether this is a return navigation (vs fresh navigation) */
  isReturning: boolean;
  /** The navigation frame we're returning to (if any) */
  returnFrame: NavigationFrame | null;
  /** Update the breadcrumb label dynamically */
  updateLabel: (newLabel: string) => void;
  /** Update the current view mode */
  updateViewMode: (viewMode: string) => void;
  /** Mark the current selection for breadcrumb display */
  updateSelection: (id: string, type: string, label?: string) => void;
}

/**
 * Generate breadcrumb label from module and state
 */
function generateBreadcrumbLabel<T>(
  moduleId: ModuleId,
  state: T,
  options?: UsePreserveModuleStateOptions<T>
): string {
  // Use custom label function if provided
  if (options?.labelFn) {
    try {
      return options.labelFn(state);
    } catch {
      // Fall through to default
    }
  }
  
  // Use explicit label if provided
  if (options?.label) {
    return options.label;
  }
  
  // Default to module name
  return getModuleLabel(moduleId);
}

/**
 * Pick specific keys from an object
 */
function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Hook for preserving module state during cross-module navigation
 */
export function usePreserveModuleState<T extends Record<string, unknown>>(
  moduleId: ModuleId,
  currentState: T,
  stateKeys: (keyof T)[],
  options: UsePreserveModuleStateOptions<T> = {}
): PreserveModuleStateResult<T> {
  const {
    autoSave = true,
    restoreScroll = true,
    deps = [],
  } = options;
  
  // Navigation stack store
  const push = useNavigationStackStore((s) => s.push);
  const replaceTop = useNavigationStackStore((s) => s.replaceTop);
  const getCurrentFrame = useNavigationStackStore((s) => s.getCurrentFrame);
  const getPreviousFrame = useNavigationStackStore((s) => s.getPreviousFrame);
  const getFrameByModule = useNavigationStackStore((s) => s.getFrameByModule);
  
  // Track if we've already restored state
  const hasRestored = useRef(false);
  const isFirstMount = useRef(true);
  
  // Get previous frame for this module (if returning)
  const previousFrame = useMemo(() => {
    return getFrameByModule(moduleId);
  }, [getFrameByModule, moduleId]);
  
  // Check if this is a return navigation
  const isReturning = useMemo(() => {
    if (hasRestored.current) return false;
    return previousFrame !== null && previousFrame.state !== undefined;
  }, [previousFrame]);
  
  // Get restored state (only on first render if returning)
  const restoredState = useMemo(() => {
    if (hasRestored.current || !isReturning || !previousFrame?.state) {
      return null;
    }
    
    // Mark as restored
    hasRestored.current = true;
    
    // Return only the keys we're interested in
    const preserved = {} as Partial<T>;
    for (const key of stateKeys) {
      if (key in (previousFrame.state as Record<string, unknown>)) {
        (preserved as Record<string, unknown>)[key as string] = 
          (previousFrame.state as Record<string, unknown>)[key as string];
      }
    }
    
    return Object.keys(preserved).length > 0 ? preserved : null;
  }, [isReturning, previousFrame, stateKeys]);
  
  // Restore scroll position on return
  useEffect(() => {
    if (restoreScroll && isReturning && previousFrame?.scrollPosition) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: previousFrame.scrollPosition,
          behavior: 'smooth',
        });
      });
    }
  }, [restoreScroll, isReturning, previousFrame]);
  
  // Push initial frame on first mount (if not returning)
  useEffect(() => {
    if (isFirstMount.current && !isReturning) {
      isFirstMount.current = false;
      
      const label = generateBreadcrumbLabel(moduleId, currentState, options);
      
      push({
        moduleId,
        label,
        scrollPosition: 0,
        state: pick(currentState, stateKeys) as Record<string, unknown>,
      });
    }
  }, []); // Only on mount
  
  // Save state to stack on unmount (if autoSave enabled)
  useEffect(() => {
    return () => {
      if (autoSave) {
        const scrollPosition = typeof window !== 'undefined' ? window.scrollY : 0;
        const label = generateBreadcrumbLabel(moduleId, currentState, options);
        
        replaceTop({
          scrollPosition,
          label,
          state: pick(currentState, stateKeys) as Record<string, unknown>,
        });
      }
    };
  }, [autoSave, moduleId, currentState, stateKeys, replaceTop, options, ...deps]);
  
  // Manual save function
  const saveState = useCallback(() => {
    const scrollPosition = typeof window !== 'undefined' ? window.scrollY : 0;
    const label = generateBreadcrumbLabel(moduleId, currentState, options);
    
    replaceTop({
      scrollPosition,
      label,
      state: pick(currentState, stateKeys) as Record<string, unknown>,
    });
  }, [moduleId, currentState, stateKeys, replaceTop, options]);
  
  // Update label dynamically
  const updateLabel = useCallback((newLabel: string) => {
    replaceTop({ label: newLabel });
  }, [replaceTop]);
  
  // Update view mode
  const updateViewMode = useCallback((viewMode: string) => {
    replaceTop({ viewMode });
  }, [replaceTop]);
  
  // Update selection
  const updateSelection = useCallback((id: string, type: string, label?: string) => {
    replaceTop({ 
      selection: { id, type, label },
    });
  }, [replaceTop]);
  
  return useMemo(() => ({
    restoredState,
    saveState,
    isReturning,
    returnFrame: isReturning ? previousFrame : null,
    updateLabel,
    updateViewMode,
    updateSelection,
  }), [restoredState, saveState, isReturning, previousFrame, updateLabel, updateViewMode, updateSelection]);
}

// ============================================================================
// Convenience Hooks for Common Patterns
// ============================================================================

/**
 * Simple state preservation with automatic label generation
 */
export function useSimpleStatePreservation(
  moduleId: ModuleId,
  viewMode?: string,
  selectedId?: string | null
) {
  const state = useMemo(() => ({
    viewMode: viewMode || 'default',
    selectedId: selectedId || null,
  }), [viewMode, selectedId]);
  
  return usePreserveModuleState(moduleId, state, ['viewMode', 'selectedId']);
}

/**
 * Filter-focused state preservation
 */
export function useFilterStatePreservation<F extends Record<string, string>>(
  moduleId: ModuleId,
  filters: F,
  viewMode?: string
) {
  const state = useMemo(() => ({
    filters,
    viewMode: viewMode || 'default',
  }), [filters, viewMode]);
  
  return usePreserveModuleState(
    moduleId,
    state,
    ['filters', 'viewMode'],
    {
      labelFn: (s) => {
        const activeFilters = Object.entries(s.filters || {})
          .filter(([_, v]) => v && v !== 'all')
          .length;
        
        if (activeFilters > 0) {
          return `${getModuleLabel(moduleId)} (${activeFilters} filter${activeFilters > 1 ? 's' : ''})`;
        }
        return getModuleLabel(moduleId);
      },
    }
  );
}

export default usePreserveModuleState;
