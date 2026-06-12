
/**
 * useUndoRedo Hook
 * Client-side operation history with undo/redo support
 * 
 * v0.41.7 - Undo/Redo Stack
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { 
  Operation, 
  OT,
  createOperation,
} from '@/services/collaboration/operational-transform';

// =============================================================================
// TYPES
// =============================================================================

export interface UndoRedoOptions {
  maxHistory?: number;        // Max operations to keep
  groupTimeout?: number;      // ms to group rapid operations
  userId: string;
  onUndo?: (operation: Operation) => void;
  onRedo?: (operation: Operation) => void;
}

export interface UndoRedoState {
  past: Operation[];
  future: Operation[];
  current: Operation | null;
}

export interface UseUndoRedoReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  currentOperation: Operation | null;
  
  // Actions
  pushOperation: (operation: Operation) => void;
  undo: () => Operation | null;
  redo: () => Operation | null;
  clear: () => void;
  
  // Inspection
  getUndoStack: () => Operation[];
  getRedoStack: () => Operation[];
  peekUndo: () => Operation | null;
  peekRedo: () => Operation | null;
  
  // Grouping
  startGroup: () => void;
  endGroup: () => void;
  isGrouping: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useUndoRedo(
  content: string,
  options: UndoRedoOptions
): UseUndoRedoReturn {
  const {
    maxHistory = 100,
    groupTimeout = 500,
    userId,
    onUndo,
    onRedo,
  } = options;

  // State
  const [past, setPast] = useState<Operation[]>([]);
  const [future, setFuture] = useState<Operation[]>([]);
  
  // Refs for grouping
  const isGroupingRef = useRef(false);
  const groupOperationsRef = useRef<Operation[]>([]);
  const lastOperationTimeRef = useRef(0);
  const groupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Push Operation
  // ---------------------------------------------------------------------------

  const pushOperation = useCallback((operation: Operation) => {
    const now = Date.now();
    
    // If grouping, add to group
    if (isGroupingRef.current) {
      groupOperationsRef.current.push(operation);
      return;
    }
    
    // Check if should auto-group with previous operation
    const timeSinceLast = now - lastOperationTimeRef.current;
    const shouldGroup = timeSinceLast < groupTimeout && past.length > 0;
    
    setPast(prev => {
      let newPast: Operation[];
      
      if (shouldGroup) {
        // Try to compose with last operation
        const lastOp = prev[prev.length - 1];
        const composed = OT.compose(lastOp, operation);
        
        if (composed) {
          // Replace last with composed
          newPast = [...prev.slice(0, -1), composed];
        } else {
          // Can't compose, add as new
          newPast = [...prev, operation];
        }
      } else {
        newPast = [...prev, operation];
      }
      
      // Trim to max history
      if (newPast.length > maxHistory) {
        newPast = newPast.slice(-maxHistory);
      }
      
      return newPast;
    });
    
    // Clear redo stack when new operation is pushed
    setFuture([]);
    
    lastOperationTimeRef.current = now;
  }, [maxHistory, groupTimeout, past.length]);

  // ---------------------------------------------------------------------------
  // Undo
  // ---------------------------------------------------------------------------

  const undo = useCallback((): Operation | null => {
    if (past.length === 0) return null;
    
    const operation = past[past.length - 1];
    
    // Create inverse operation
    const inverseOp = OT.invert(operation, content);
    
    // Move operation to future
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [operation, ...prev]);
    
    // Callback
    onUndo?.(inverseOp);
    
    return inverseOp;
  }, [past, content, onUndo]);

  // ---------------------------------------------------------------------------
  // Redo
  // ---------------------------------------------------------------------------

  const redo = useCallback((): Operation | null => {
    if (future.length === 0) return null;
    
    const operation = future[0];
    
    // Move operation back to past
    setFuture(prev => prev.slice(1));
    setPast(prev => [...prev, operation]);
    
    // Callback
    onRedo?.(operation);
    
    return operation;
  }, [future, onRedo]);

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
    groupOperationsRef.current = [];
    isGroupingRef.current = false;
    if (groupTimeoutRef.current) {
      clearTimeout(groupTimeoutRef.current);
      groupTimeoutRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Grouping
  // ---------------------------------------------------------------------------

  const startGroup = useCallback(() => {
    isGroupingRef.current = true;
    groupOperationsRef.current = [];
  }, []);

  const endGroup = useCallback(() => {
    isGroupingRef.current = false;
    
    if (groupOperationsRef.current.length === 0) return;
    
    // Compose all grouped operations into one
    let composedOp = groupOperationsRef.current[0];
    
    for (let i = 1; i < groupOperationsRef.current.length; i++) {
      const nextOp = groupOperationsRef.current[i];
      const composed = OT.compose(composedOp, nextOp);
      
      if (composed) {
        composedOp = composed;
      } else {
        // Can't compose all, push composed so far and continue
        setPast(prev => [...prev, composedOp]);
        composedOp = nextOp;
      }
    }
    
    // Push final composed operation
    setPast(prev => {
      const newPast = [...prev, composedOp];
      return newPast.length > maxHistory ? newPast.slice(-maxHistory) : newPast;
    });
    
    // Clear redo
    setFuture([]);
    
    groupOperationsRef.current = [];
  }, [maxHistory]);

  // ---------------------------------------------------------------------------
  // Inspection
  // ---------------------------------------------------------------------------

  const getUndoStack = useCallback(() => [...past], [past]);
  const getRedoStack = useCallback(() => [...future], [future]);
  
  const peekUndo = useCallback(() => {
    return past.length > 0 ? past[past.length - 1] : null;
  }, [past]);
  
  const peekRedo = useCallback(() => {
    return future.length > 0 ? future[0] : null;
  }, [future]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
    currentOperation: past[past.length - 1] || null,
    
    // Actions
    pushOperation,
    undo,
    redo,
    clear,
    
    // Inspection
    getUndoStack,
    getRedoStack,
    peekUndo,
    peekRedo,
    
    // Grouping
    startGroup,
    endGroup,
    isGrouping: isGroupingRef.current,
  };
}

// =============================================================================
// KEYBOARD SHORTCUT HELPER
// =============================================================================

export function useUndoRedoKeyboard(
  undoRedo: UseUndoRedoReturn,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (cmdKey && e.key === 'z') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Cmd+Shift+Z = Redo
        undoRedo.redo();
      } else {
        // Cmd+Z = Undo
        undoRedo.undo();
      }
    }
    
    // Cmd+Y = Redo (Windows convention)
    if (cmdKey && e.key === 'y') {
      e.preventDefault();
      undoRedo.redo();
    }
  }, [enabled, undoRedo]);

  // Attach listener
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }
}

// =============================================================================
// UNDO/REDO TOOLBAR COMPONENT
// =============================================================================

export function UndoRedoToolbar({
  undoRedo,
  size = 'md',
  showCounts = false,
}: {
  undoRedo: UseUndoRedoReturn;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
}) {
  const sizeClass = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }[size];
  
  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="flex items-center gap-1">
      {/* Undo */}
      <button
        onClick={() => undoRedo.undo()}
        disabled={!undoRedo.canUndo}
        className={`
          ${sizeClass} rounded flex items-center justify-center
          ${undoRedo.canUndo 
            ? 'text-gray-300 hover:text-white hover:bg-white/10' 
            : 'text-gray-600 cursor-not-allowed'
          }
          transition-colors
        `}
        title={`Undo (${undoRedo.undoCount})`}
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10h10a5 5 0 0 1 5 5v2" />
          <path d="M3 10l5-5M3 10l5 5" />
        </svg>
      </button>
      
      {showCounts && undoRedo.undoCount > 0 && (
        <span className="text-xs text-gray-500">{undoRedo.undoCount}</span>
      )}
      
      {/* Redo */}
      <button
        onClick={() => undoRedo.redo()}
        disabled={!undoRedo.canRedo}
        className={`
          ${sizeClass} rounded flex items-center justify-center
          ${undoRedo.canRedo 
            ? 'text-gray-300 hover:text-white hover:bg-white/10' 
            : 'text-gray-600 cursor-not-allowed'
          }
          transition-colors
        `}
        title={`Redo (${undoRedo.redoCount})`}
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10H11a5 5 0 0 0-5 5v2" />
          <path d="M21 10l-5-5M21 10l-5 5" />
        </svg>
      </button>
      
      {showCounts && undoRedo.redoCount > 0 && (
        <span className="text-xs text-gray-500">{undoRedo.redoCount}</span>
      )}
    </div>
  );
}

export default useUndoRedo;
