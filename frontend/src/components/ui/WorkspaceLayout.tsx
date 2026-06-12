// =============================================================================
// FLEXIBLE WORKSPACE LAYOUT - v0.39.2
// =============================================================================
// Reusable multi-panel workspace with:
// - Horizontal and vertical resizable splits
// - Collapsible sidebars
// - Persistent panel sizes
// - Touch-friendly resize handles
// =============================================================================


import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  GripVertical,
  GripHorizontal,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface PanelConfig {
  id: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  collapsible?: boolean;
  collapsedSize?: number;
}

export interface WorkspaceLayoutProps {
  /** Left sidebar panel */
  leftPanel?: React.ReactNode;
  leftConfig?: Partial<PanelConfig>;
  
  /** Main content panel */
  centerPanel: React.ReactNode;
  
  /** Right sidebar panel */
  rightPanel?: React.ReactNode;
  rightConfig?: Partial<PanelConfig>;
  
  /** Bottom panel (for split view) */
  bottomPanel?: React.ReactNode;
  bottomConfig?: Partial<PanelConfig>;
  
  /** Storage key for persisting sizes */
  storageKey?: string;
  
  /** Show panel collapse buttons */
  showCollapseButtons?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

interface WorkspaceContextValue {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleBottom: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceLayout');
  }
  return context;
}

// =============================================================================
// RESIZE HOOK
// =============================================================================

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: 'horizontal' | 'vertical';
  storageKey?: string;
  onResize?: (size: number) => void;
}

function useResize({
  initialSize,
  minSize,
  maxSize,
  direction,
  storageKey,
  onResize,
}: UseResizeOptions) {
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
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSizeRef.current = size;
  }, [size, direction]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta));
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (storageKey) {
        localStorage.setItem(storageKey, size.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, minSize, maxSize, direction, storageKey, size, onResize]);

  return { size, setSize, isResizing, handleMouseDown };
}

// =============================================================================
// RESIZE HANDLE COMPONENT
// =============================================================================

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
  showGrip?: boolean;
}

function ResizeHandle({ direction, onMouseDown, isResizing, showGrip = true }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal';
  const GripIcon = isHorizontal ? GripVertical : GripHorizontal;

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        relative group flex-shrink-0 flex items-center justify-center
        ${isHorizontal ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'}
        ${isResizing ? 'bg-accent-blue/20' : 'hover:bg-accent-blue/10'}
        transition-colors
      `}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label="Resize handle"
    >
      {/* Visible indicator */}
      <div
        className={`
          absolute transition-all duration-150
          ${isHorizontal
            ? 'inset-y-0 w-0.5 left-1/2 -translate-x-1/2'
            : 'inset-x-0 h-0.5 top-1/2 -translate-y-1/2'
          }
          ${isResizing ? 'bg-accent-blue' : 'bg-border group-hover:bg-accent-blue/50'}
        `}
      />

      {/* Grip indicator */}
      {showGrip && (
        <GripIcon
          className={`
            w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity
            ${isResizing ? 'opacity-100 text-accent-blue' : ''}
          `}
        />
      )}

      {/* Extended hit area */}
      <div
        className={`
          absolute
          ${isHorizontal ? 'inset-y-0 w-4 -left-1' : 'inset-x-0 h-4 -top-1'}
        `}
      />
    </div>
  );
}

// =============================================================================
// COLLAPSE BUTTON COMPONENT
// =============================================================================

interface CollapseButtonProps {
  position: 'left' | 'right' | 'bottom';
  collapsed: boolean;
  onToggle: () => void;
}

function CollapseButton({ position, collapsed, onToggle }: CollapseButtonProps) {
  const icons = {
    left: collapsed ? PanelLeftOpen : PanelLeftClose,
    right: collapsed ? PanelRightOpen : PanelRightClose,
    bottom: collapsed ? ChevronUp : ChevronDown,
  };
  const Icon = icons[position];

  return (
    <button
      onClick={onToggle}
      className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary transition-colors"
      title={collapsed ? 'Expand panel' : 'Collapse panel'}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// =============================================================================
// PANEL HEADER COMPONENT
// =============================================================================

export interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  position: 'left' | 'right' | 'bottom';
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PanelHeader({ title, icon, position, actions, children }: PanelHeaderProps) {
  const workspace = useWorkspace();
  const collapsed = position === 'left' 
    ? workspace.leftCollapsed 
    : position === 'right' 
      ? workspace.rightCollapsed 
      : workspace.bottomCollapsed;
  const toggle = position === 'left'
    ? workspace.toggleLeft
    : position === 'right'
      ? workspace.toggleRight
      : workspace.toggleBottom;

  return (
    <div className="p-3 border-b border-border flex items-center justify-between bg-surface-card">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="font-semibold text-text-primary text-sm truncate">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <CollapseButton position={position} collapsed={collapsed} onToggle={toggle} />
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DEFAULT_LEFT_CONFIG: PanelConfig = {
  id: 'left',
  defaultSize: 280,
  minSize: 200,
  maxSize: 400,
  collapsible: true,
  collapsedSize: 0,
};

const DEFAULT_RIGHT_CONFIG: PanelConfig = {
  id: 'right',
  defaultSize: 360,
  minSize: 280,
  maxSize: 600,
  collapsible: true,
  collapsedSize: 0,
};

const DEFAULT_BOTTOM_CONFIG: PanelConfig = {
  id: 'bottom',
  defaultSize: 300,
  minSize: 150,
  maxSize: 500,
  collapsible: true,
  collapsedSize: 0,
};

export function WorkspaceLayout({
  leftPanel,
  leftConfig: leftConfigProp,
  centerPanel,
  rightPanel,
  rightConfig: rightConfigProp,
  bottomPanel,
  bottomConfig: bottomConfigProp,
  storageKey,
  showCollapseButtons = true,
  className = '',
}: WorkspaceLayoutProps) {
  // Merge configs with defaults
  const leftConfig = { ...DEFAULT_LEFT_CONFIG, ...leftConfigProp };
  const rightConfig = { ...DEFAULT_RIGHT_CONFIG, ...rightConfigProp };
  const bottomConfig = { ...DEFAULT_BOTTOM_CONFIG, ...bottomConfigProp };

  // Collapse states
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  // Resize states
  const leftResize = useResize({
    initialSize: leftConfig.defaultSize,
    minSize: leftConfig.minSize,
    maxSize: leftConfig.maxSize,
    direction: 'horizontal',
    storageKey: storageKey ? `${storageKey}-left` : undefined,
  });

  const rightResize = useResize({
    initialSize: rightConfig.defaultSize,
    minSize: rightConfig.minSize,
    maxSize: rightConfig.maxSize,
    direction: 'horizontal',
    storageKey: storageKey ? `${storageKey}-right` : undefined,
  });

  const bottomResize = useResize({
    initialSize: bottomConfig.defaultSize,
    minSize: bottomConfig.minSize,
    maxSize: bottomConfig.maxSize,
    direction: 'vertical',
    storageKey: storageKey ? `${storageKey}-bottom` : undefined,
  });

  // Context value
  const contextValue: WorkspaceContextValue = {
    leftCollapsed,
    rightCollapsed,
    bottomCollapsed,
    toggleLeft: () => setLeftCollapsed(prev => !prev),
    toggleRight: () => setRightCollapsed(prev => !prev),
    toggleBottom: () => setBottomCollapsed(prev => !prev),
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className={`h-full flex flex-col overflow-hidden ${className}`}>
        {/* Main horizontal split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          {leftPanel && !leftCollapsed && (
            <>
              <div
                className="flex-shrink-0 overflow-hidden flex flex-col bg-surface-card border-r border-border"
                style={{ width: leftResize.size }}
              >
                {leftPanel}
              </div>
              <ResizeHandle
                direction="horizontal"
                onMouseDown={leftResize.handleMouseDown}
                isResizing={leftResize.isResizing}
              />
            </>
          )}

          {/* Collapsed left indicator */}
          {leftPanel && leftCollapsed && (
            <div className="w-8 flex-shrink-0 bg-surface-card border-r border-border flex flex-col items-center py-2">
              <button
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Center + Bottom split */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Center content */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {centerPanel}
            </div>

            {/* Bottom Panel */}
            {bottomPanel && !bottomCollapsed && (
              <>
                <ResizeHandle
                  direction="vertical"
                  onMouseDown={bottomResize.handleMouseDown}
                  isResizing={bottomResize.isResizing}
                />
                <div
                  className="flex-shrink-0 overflow-hidden flex flex-col bg-surface-card border-t border-border"
                  style={{ height: bottomResize.size }}
                >
                  {bottomPanel}
                </div>
              </>
            )}

            {/* Collapsed bottom indicator */}
            {bottomPanel && bottomCollapsed && (
              <div className="h-8 flex-shrink-0 bg-surface-card border-t border-border flex items-center justify-center">
                <button
                  onClick={() => setBottomCollapsed(false)}
                  className="px-3 py-1 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary text-xs flex items-center gap-1"
                >
                  <ChevronUp className="w-3 h-3" />
                  Show Panel
                </button>
              </div>
            )}
          </div>

          {/* Right Panel */}
          {rightPanel && !rightCollapsed && (
            <>
              <ResizeHandle
                direction="horizontal"
                onMouseDown={rightResize.handleMouseDown}
                isResizing={rightResize.isResizing}
              />
              <div
                className="flex-shrink-0 overflow-hidden flex flex-col bg-surface-card border-l border-border"
                style={{ width: rightResize.size }}
              >
                {rightPanel}
              </div>
            </>
          )}

          {/* Collapsed right indicator */}
          {rightPanel && rightCollapsed && (
            <div className="w-8 flex-shrink-0 bg-surface-card border-l border-border flex flex-col items-center py-2">
              <button
                onClick={() => setRightCollapsed(false)}
                className="p-1.5 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default WorkspaceLayout;
