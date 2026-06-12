
// ============================================================================
// Resizable Panel Component - v146
// Panel wrapper with drag-to-resize handles
// ============================================================================


import React, { forwardRef } from 'react';
import { useResizablePanel, type ResizablePanelConfig } from '@/hooks/useResizablePanel';

// ============================================
// Types
// ============================================

export interface ResizablePanelProps extends Omit<ResizablePanelConfig, 'direction'> {
  /** Panel content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Handle position: 'left' | 'right' */
  handlePosition?: 'left' | 'right';
  /** Whether the panel is visible */
  visible?: boolean;
  /** Border side matching handle position */
  showBorder?: boolean;
  /** Test ID for testing */
  testId?: string;
}

// ============================================
// Resize Handle Component
// ============================================

interface ResizeHandleProps {
  position: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ position, onMouseDown, isResizing }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        absolute top-0 bottom-0 w-1 z-10 cursor-col-resize group
        ${position === 'right' ? 'right-0' : 'left-0'}
      `}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      tabIndex={0}
      onKeyDown={(e) => {
        // TODO: Add keyboard resize support
      }}
    >
      {/* Visual indicator on hover/active */}
      <div 
        className={`
          absolute inset-y-0 w-1 transition-colors duration-150
          ${position === 'right' ? '-right-0.5' : '-left-0.5'}
          ${isResizing 
            ? 'bg-accent-blue' 
            : 'bg-transparent group-hover:bg-accent-blue/50'
          }
        `}
      />
      {/* Larger invisible hit area for easier grabbing */}
      <div 
        className={`
          absolute inset-y-0 w-3
          ${position === 'right' ? '-right-1' : '-left-1'}
        `}
      />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>(
  function ResizablePanel(
    {
      children,
      className = '',
      handlePosition = 'right',
      visible = true,
      showBorder = true,
      testId,
      ...config
    },
    ref
  ) {
    const {
      width,
      isResizing,
      handleMouseDown,
      panelStyle,
    } = useResizablePanel({
      ...config,
      direction: handlePosition,
    });

    // Don't render if not visible
    if (!visible) return null;

    const borderClass = showBorder
      ? handlePosition === 'right'
        ? 'border-r border-border'
        : 'border-l border-border'
      : '';

    return (
      <div
        ref={ref}
        data-testid={testId}
        data-resizing={isResizing}
        className={`
          relative flex flex-col overflow-hidden transition-opacity
          ${borderClass}
          ${isResizing ? 'select-none' : ''}
          ${className}
        `}
        style={panelStyle}
      >
        {children}
        <ResizeHandle
          position={handlePosition}
          onMouseDown={handleMouseDown}
          isResizing={isResizing}
        />
      </div>
    );
  }
);

// ============================================
// Collapsed Panel Component
// For icon-only sidebar state
// ============================================

export interface CollapsiblePanelProps extends ResizablePanelProps {
  /** Whether panel is collapsed to icon-only mode */
  collapsed?: boolean;
  /** Width when collapsed */
  collapsedWidth?: number;
}

export const CollapsiblePanel = forwardRef<HTMLDivElement, CollapsiblePanelProps>(
  function CollapsiblePanel(
    {
      children,
      collapsed = false,
      collapsedWidth = 48,
      minWidth,
      ...props
    },
    ref
  ) {
    // When collapsed, use fixed width; otherwise use resizable
    if (collapsed) {
      return (
        <div
          ref={ref}
          data-testid={props.testId}
          data-collapsed="true"
          className={`
            relative flex flex-col overflow-hidden
            ${props.showBorder !== false
              ? props.handlePosition === 'left'
                ? 'border-l border-border'
                : 'border-r border-border'
              : ''
            }
            ${props.className || ''}
          `}
          style={{ width: collapsedWidth, flexShrink: 0 }}
        >
          {children}
        </div>
      );
    }

    return (
      <ResizablePanel
        ref={ref}
        minWidth={minWidth}
        {...props}
      >
        {children}
      </ResizablePanel>
    );
  }
);

// ============================================
// Export
// ============================================

export default ResizablePanel;
