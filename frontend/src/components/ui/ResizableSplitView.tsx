/**
 * ResizableSplitView Component - v0.27.0
 * 
 * Provides consistent resizable split panel layouts for screens.
 * Supports horizontal and vertical splits with drag handles.
 * 
 * USAGE:
 * <ResizableSplitView
 *   leftPanel={<ListPanel />}
 *   rightPanel={<DetailPanel />}
 *   leftWidth={320}
 *   leftMinWidth={240}
 *   leftMaxWidth={480}
 * />
 */


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { layout } from '@/styles/design-system';

// ============================================================================
// TYPES
// ============================================================================

export interface ResizableSplitViewProps {
  // Panels
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  topPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  
  // Horizontal split config
  leftWidth?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  rightMinWidth?: number;
  
  // Vertical split config
  topHeight?: number;
  topMinHeight?: number;
  topMaxHeight?: number;
  bottomMinHeight?: number;
  
  // Display options
  orientation?: 'horizontal' | 'vertical';
  showLeftBorder?: boolean;
  showRightBorder?: boolean;
  showTopBorder?: boolean;
  showBottomBorder?: boolean;
  
  // Collapse support
  leftCollapsible?: boolean;
  rightCollapsible?: boolean;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  onLeftCollapse?: (collapsed: boolean) => void;
  onRightCollapse?: (collapsed: boolean) => void;
  
  // Persistence
  storageKey?: string;
  
  // Styling
  className?: string;
}

// ============================================================================
// RESIZE HANDLE COMPONENT
// ============================================================================

interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onDragStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ orientation, onDragStart, isResizing }: ResizeHandleProps) {
  const isHorizontal = orientation === 'horizontal';
  
  return (
    <div
      onMouseDown={onDragStart}
      className={`
        ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        relative group flex-shrink-0 bg-transparent hover:bg-accent-blue/20 transition-colors
        ${isResizing ? 'bg-accent-blue/30' : ''}
      `}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label="Resize handle"
    >
      {/* Visible drag indicator */}
      <div 
        className={`
          absolute transition-all duration-150
          ${isHorizontal 
            ? 'inset-y-0 w-0.5 left-0.5 group-hover:bg-accent-blue' 
            : 'inset-x-0 h-0.5 top-0.5 group-hover:bg-accent-blue'
          }
          ${isResizing ? 'bg-accent-blue' : 'bg-transparent'}
        `}
      />
      
      {/* Larger hit area */}
      <div 
        className={`
          absolute
          ${isHorizontal 
            ? 'inset-y-0 w-3 -left-1' 
            : 'inset-x-0 h-3 -top-1'
          }
        `}
      />
    </div>
  );
}

// ============================================================================
// HOOK: USE RESIZE LOGIC
// ============================================================================

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  orientation: 'horizontal' | 'vertical';
  storageKey?: string;
}

function useResize({ initialSize, minSize, maxSize, orientation, storageKey }: UseResizeOptions) {
  const [size, setSize] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          return Math.min(maxSize, Math.max(minSize, parsed));
        }
      }
    }
    return initialSize;
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const startPosition = useRef(0);
  const startSize = useRef(0);
  
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosition.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
  }, [size, orientation]);
  
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentPosition = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPosition - startPosition.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
      setSize(newSize);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Persist to localStorage
      if (storageKey) {
        localStorage.setItem(storageKey, size.toString());
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, minSize, maxSize, orientation, storageKey, size]);
  
  return { size, isResizing, handleDragStart };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResizableSplitView({
  leftPanel,
  rightPanel,
  topPanel,
  bottomPanel,
  leftWidth = layout.splitView.leftPanel.default,
  leftMinWidth = layout.splitView.leftPanel.min,
  leftMaxWidth = layout.splitView.leftPanel.max,
  rightMinWidth = 400,
  topHeight = 300,
  topMinHeight = 100,
  topMaxHeight = 600,
  bottomMinHeight = 200,
  orientation = 'horizontal',
  showLeftBorder = false,
  showRightBorder = true,
  showTopBorder = false,
  showBottomBorder = true,
  leftCollapsible = false,
  rightCollapsible = false,
  leftCollapsed = false,
  rightCollapsed = false,
  onLeftCollapse,
  onRightCollapse,
  storageKey,
  className = '',
}: ResizableSplitViewProps) {
  
  // Horizontal resize
  const {
    size: currentLeftWidth,
    isResizing: isHorizontalResizing,
    handleDragStart: handleHorizontalDragStart,
  } = useResize({
    initialSize: leftWidth,
    minSize: leftMinWidth,
    maxSize: leftMaxWidth,
    orientation: 'horizontal',
    storageKey: storageKey ? `${storageKey}-left` : undefined,
  });
  
  // Vertical resize
  const {
    size: currentTopHeight,
    isResizing: isVerticalResizing,
    handleDragStart: handleVerticalDragStart,
  } = useResize({
    initialSize: topHeight,
    minSize: topMinHeight,
    maxSize: topMaxHeight,
    orientation: 'vertical',
    storageKey: storageKey ? `${storageKey}-top` : undefined,
  });
  
  // Horizontal split (left + right)
  if (orientation === 'horizontal' && (leftPanel || rightPanel)) {
    return (
      <div className={`flex-1 flex overflow-hidden ${className}`}>
        {/* Left Panel */}
        {leftPanel && !leftCollapsed && (
          <div 
            className={`
              flex-shrink-0 overflow-hidden flex flex-col
              ${showLeftBorder ? 'border-r border-border' : ''}
            `}
            style={{ width: currentLeftWidth }}
          >
            {leftPanel}
          </div>
        )}
        
        {/* Resize Handle */}
        {leftPanel && rightPanel && !leftCollapsed && !rightCollapsed && (
          <ResizeHandle
            orientation="horizontal"
            onDragStart={handleHorizontalDragStart}
            isResizing={isHorizontalResizing}
          />
        )}
        
        {/* Right Panel */}
        {rightPanel && !rightCollapsed && (
          <div 
            className={`
              flex-1 min-w-0 overflow-hidden flex flex-col
              ${showRightBorder ? 'border-l border-border' : ''}
            `}
            style={{ minWidth: rightMinWidth }}
          >
            {rightPanel}
          </div>
        )}
      </div>
    );
  }
  
  // Vertical split (top + bottom)
  if (orientation === 'vertical' && (topPanel || bottomPanel)) {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${className}`}>
        {/* Top Panel */}
        {topPanel && (
          <div 
            className={`
              flex-shrink-0 overflow-hidden flex flex-col
              ${showTopBorder ? 'border-b border-border' : ''}
            `}
            style={{ height: currentTopHeight }}
          >
            {topPanel}
          </div>
        )}
        
        {/* Resize Handle */}
        {topPanel && bottomPanel && (
          <ResizeHandle
            orientation="vertical"
            onDragStart={handleVerticalDragStart}
            isResizing={isVerticalResizing}
          />
        )}
        
        {/* Bottom Panel */}
        {bottomPanel && (
          <div 
            className={`
              flex-1 min-h-0 overflow-hidden flex flex-col
              ${showBottomBorder ? 'border-t border-border' : ''}
            `}
            style={{ minHeight: bottomMinHeight }}
          >
            {bottomPanel}
          </div>
        )}
      </div>
    );
  }
  
  return null;
}

// ============================================================================
// THREE-PANEL LAYOUT
// ============================================================================

export interface ThreePanelLayoutProps {
  leftPanel?: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  leftMinWidth?: number;
  rightMinWidth?: number;
  leftMaxWidth?: number;
  rightMaxWidth?: number;
  storageKey?: string;
  className?: string;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftWidth = 280,
  rightWidth = 360,
  leftMinWidth = 200,
  rightMinWidth = 280,
  leftMaxWidth = 400,
  rightMaxWidth = 500,
  storageKey,
  className = '',
}: ThreePanelLayoutProps) {
  
  const {
    size: currentLeftWidth,
    isResizing: isLeftResizing,
    handleDragStart: handleLeftDragStart,
  } = useResize({
    initialSize: leftWidth,
    minSize: leftMinWidth,
    maxSize: leftMaxWidth,
    orientation: 'horizontal',
    storageKey: storageKey ? `${storageKey}-left` : undefined,
  });
  
  const {
    size: currentRightWidth,
    isResizing: isRightResizing,
    handleDragStart: handleRightDragStart,
  } = useResize({
    initialSize: rightWidth,
    minSize: rightMinWidth,
    maxSize: rightMaxWidth,
    orientation: 'horizontal',
    storageKey: storageKey ? `${storageKey}-right` : undefined,
  });
  
  return (
    <div className={`flex-1 flex overflow-hidden ${className}`}>
      {/* Left Panel */}
      {leftPanel && (
        <>
          <div 
            className="flex-shrink-0 overflow-hidden flex flex-col border-r border-border"
            style={{ width: currentLeftWidth }}
          >
            {leftPanel}
          </div>
          <ResizeHandle
            orientation="horizontal"
            onDragStart={handleLeftDragStart}
            isResizing={isLeftResizing}
          />
        </>
      )}
      
      {/* Center Panel */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {centerPanel}
      </div>
      
      {/* Right Panel */}
      {rightPanel && (
        <>
          <ResizeHandle
            orientation="horizontal"
            onDragStart={handleRightDragStart}
            isResizing={isRightResizing}
          />
          <div 
            className="flex-shrink-0 overflow-hidden flex flex-col border-l border-border"
            style={{ width: currentRightWidth }}
          >
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MASTER-DETAIL LAYOUT (Common Pattern)
// ============================================================================

export interface MasterDetailLayoutProps {
  masterContent: React.ReactNode;
  detailContent?: React.ReactNode;
  masterWidth?: number;
  masterMinWidth?: number;
  masterMaxWidth?: number;
  showDetail?: boolean;
  onCloseDetail?: () => void;
  storageKey?: string;
  className?: string;
}

export function MasterDetailLayout({
  masterContent,
  detailContent,
  masterWidth = 400,
  masterMinWidth = 320,
  masterMaxWidth = 600,
  showDetail = false,
  onCloseDetail,
  storageKey,
  className = '',
}: MasterDetailLayoutProps) {
  
  return (
    <ResizableSplitView
      orientation="horizontal"
      leftPanel={masterContent}
      rightPanel={showDetail ? detailContent : null}
      leftWidth={masterWidth}
      leftMinWidth={masterMinWidth}
      leftMaxWidth={masterMaxWidth}
      storageKey={storageKey}
      className={className}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ResizableSplitView;
