
// ============================================================================
// Resizable Panel Hook - v146
// Provides drag-to-resize functionality for panel components
// ============================================================================


import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

export interface ResizablePanelConfig {
  /** Initial width in pixels */
  initialWidth: number;
  /** Minimum width in pixels */
  minWidth: number;
  /** Maximum width in pixels */
  maxWidth: number;
  /** Storage key for persisting width (optional) */
  storageKey?: string;
  /** Direction of resize handle */
  direction?: 'left' | 'right';
  /** Callback when resize starts */
  onResizeStart?: () => void;
  /** Callback during resize */
  onResize?: (width: number) => void;
  /** Callback when resize ends */
  onResizeEnd?: (width: number) => void;
  /** Snap points for width (optional) */
  snapPoints?: readonly number[];
  /** Snap threshold in pixels */
  snapThreshold?: number;
}

export interface ResizablePanelState {
  /** Current width */
  width: number;
  /** Whether currently resizing */
  isResizing: boolean;
  /** Mouse down handler for resize handle */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** Set width programmatically */
  setWidth: (width: number) => void;
  /** Reset to initial width */
  reset: () => void;
  /** CSS styles to apply to the panel */
  panelStyle: { width: number; flexShrink: 0 };
}

// ============================================
// Local Storage Helpers
// ============================================

const getStoredWidth = (key: string, fallback: number): number => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`ligature-panel-${key}`);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return fallback;
};

const setStoredWidth = (key: string, width: number): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`ligature-panel-${key}`, String(width));
  } catch (e) {
    // Ignore localStorage errors
  }
};

// ============================================
// Hook Implementation
// ============================================

export function useResizablePanel(config: ResizablePanelConfig): ResizablePanelState {
  const {
    initialWidth,
    minWidth,
    maxWidth,
    storageKey,
    direction = 'right',
    onResizeStart,
    onResize,
    onResizeEnd,
    snapPoints = [],
    snapThreshold = 10,
  } = config;

  // Initialize width from storage or default
  const [width, setWidthState] = useState(() => {
    if (storageKey) {
      return getStoredWidth(storageKey, initialWidth);
    }
    return initialWidth;
  });
  
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs for tracking resize operation
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Apply snap points to a width value
  const applySnapPoints = useCallback((rawWidth: number): number => {
    if (snapPoints.length === 0) return rawWidth;
    
    for (const snapPoint of snapPoints) {
      if (Math.abs(rawWidth - snapPoint) <= snapThreshold) {
        return snapPoint;
      }
    }
    return rawWidth;
  }, [snapPoints, snapThreshold]);

  // Clamp width to min/max
  const clampWidth = useCallback((w: number): number => {
    return Math.min(maxWidth, Math.max(minWidth, w));
  }, [minWidth, maxWidth]);

  // Set width with clamping and optional storage
  const setWidth = useCallback((newWidth: number) => {
    const clamped = clampWidth(newWidth);
    setWidthState(clamped);
    if (storageKey) {
      setStoredWidth(storageKey, clamped);
    }
  }, [clampWidth, storageKey]);

  // Reset to initial width
  const reset = useCallback(() => {
    setWidth(initialWidth);
  }, [initialWidth, setWidth]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    
    // Set cursor and prevent selection during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    onResizeStart?.();
  }, [width, onResizeStart]);

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      // Invert delta for left-side resize handles
      const adjustedDelta = direction === 'left' ? -delta : delta;
      const rawWidth = startWidth.current + adjustedDelta;
      const snappedWidth = applySnapPoints(rawWidth);
      const clampedWidth = clampWidth(snappedWidth);
      
      setWidthState(clampedWidth);
      onResize?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Persist final width
      if (storageKey) {
        setStoredWidth(storageKey, width);
      }
      
      onResizeEnd?.(width);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, applySnapPoints, clampWidth, onResize, onResizeEnd, storageKey, width]);

  return {
    width,
    isResizing,
    handleMouseDown,
    setWidth,
    reset,
    panelStyle: { width, flexShrink: 0 },
  };
}

// ============================================
// Panel Width Presets
// ============================================

export const PANEL_PRESETS = {
  hierarchy: {
    initialWidth: 256,
    minWidth: 180,
    maxWidth: 400,
    storageKey: 'hierarchy',
    snapPoints: [48, 180, 256, 320],
  },
  nav: {
    initialWidth: 192,
    minWidth: 48,
    maxWidth: 280,
    storageKey: 'nav',
    snapPoints: [48, 120, 192, 240],
  },
  viewer: {
    initialWidth: 480,
    minWidth: 320,
    maxWidth: 800,
    storageKey: 'viewer',
    direction: 'left' as const,
    snapPoints: [320, 420, 480, 560, 640],
  },
  detail: {
    initialWidth: 384,
    minWidth: 280,
    maxWidth: 600,
    storageKey: 'detail',
    direction: 'left' as const,
    snapPoints: [280, 384, 480],
  },
} as const;

// ============================================
// Export
// ============================================

export default useResizablePanel;
