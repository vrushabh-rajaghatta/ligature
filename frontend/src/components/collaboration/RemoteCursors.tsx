
// =============================================================================
// REMOTE CURSORS COMPONENT
// =============================================================================
// Renders remote user cursors and selections in collaborative editing
// Part of v0.18.9 - Collaboration UI Components
// =============================================================================


import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { type RemoteCursor, type SelectionState } from '@/services/collaboration/cursor-sync';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  containerRef: React.RefObject<HTMLElement | null>;
  documentId: string;
  localUserId?: string;
  showLabels?: boolean;
  labelPosition?: 'above' | 'below' | 'auto';
  cursorStyle?: 'line' | 'block' | 'underline';
  selectionOpacity?: number;
  animationDuration?: number;
  maxVisibleCursors?: number;
  onCursorClick?: (cursor: RemoteCursor) => void;
  onCursorHover?: (cursor: RemoteCursor | null) => void;
  className?: string;
}

export interface CursorLabelProps {
  userName: string;
  userColor: string;
  position: 'above' | 'below';
  isActive: boolean;
  onClick?: () => void;
}

export interface SelectionHighlightProps {
  selection: SelectionState;
  userColor: string;
  containerRef: React.RefObject<HTMLElement | null>;
  opacity?: number;
}

// -----------------------------------------------------------------------------
// Cursor Label Component
// -----------------------------------------------------------------------------

export function CursorLabel({
  userName,
  userColor,
  position,
  isActive,
  onClick,
}: CursorLabelProps) {
  const positionClasses = position === 'above' 
    ? 'bottom-full mb-1' 
    : 'top-full mt-1';

  return (
    <div
      className={`
        absolute left-0 ${positionClasses}
        px-1.5 py-0.5 rounded text-xs font-medium
        whitespace-nowrap z-50
        transition-all duration-200
        ${isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}
        ${onClick ? 'cursor-pointer hover:brightness-110' : ''}
      `}
      style={{ 
        backgroundColor: userColor,
        color: getContrastColor(userColor),
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      }}
      onClick={onClick}
    >
      {userName}
      {!isActive && (
        <span className="ml-1 opacity-60">•</span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Selection Highlight Component
// -----------------------------------------------------------------------------

export function SelectionHighlight({
  selection,
  userColor,
  containerRef,
  opacity = 0.25,
}: SelectionHighlightProps) {
  const [highlightRects, setHighlightRects] = useState<DOMRect[]>([]);

  // Calculate selection rectangles based on character positions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get text content and calculate position
    const start = Math.min(selection.anchor, selection.head);
    const end = Math.max(selection.anchor, selection.head);

    // For now, create a simplified highlight
    // In production, this would use Range API or text position mapping
    const rects: DOMRect[] = [];
    
    // Simplified: create a single rect spanning the selection
    const containerRect = container.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(container).lineHeight) || 20;
    const charWidth = 8; // Approximate character width

    const startLine = Math.floor(start / 80); // Assume 80 chars per line
    const endLine = Math.floor(end / 80);

    for (let line = startLine; line <= endLine; line++) {
      const lineStart = line === startLine ? (start % 80) * charWidth : 0;
      const lineEnd = line === endLine ? (end % 80) * charWidth : 80 * charWidth;

      rects.push(new DOMRect(
        lineStart,
        line * lineHeight,
        lineEnd - lineStart,
        lineHeight
      ));
    }

    setHighlightRects(rects);
  }, [selection, containerRef]);

  if (highlightRects.length === 0) return null;

  return (
    <>
      {highlightRects.map((rect, index) => (
        <div
          key={`selection-${selection.userId}-${index}`}
          className="absolute pointer-events-none transition-all duration-150"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: userColor,
            opacity,
            borderRadius: '2px',
          }}
        />
      ))}
    </>
  );
}

// -----------------------------------------------------------------------------
// Single Remote Cursor Component
// -----------------------------------------------------------------------------

interface SingleCursorProps {
  cursor: RemoteCursor;
  containerRef: React.RefObject<HTMLElement | null>;
  showLabel: boolean;
  labelPosition: 'above' | 'below' | 'auto';
  cursorStyle: 'line' | 'block' | 'underline';
  selectionOpacity: number;
  animationDuration: number;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}

function SingleCursor({
  cursor,
  containerRef,
  showLabel,
  labelPosition,
  cursorStyle,
  selectionOpacity,
  animationDuration,
  onClick,
  onHover,
}: SingleCursorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Calculate cursor position
  const cursorPosition = useMemo(() => {
    const container = containerRef.current;
    if (!container) return { left: 0, top: 0 };

    // Simplified position calculation
    // In production, this would use precise text position mapping
    const lineHeight = parseFloat(getComputedStyle(container).lineHeight) || 20;
    const charWidth = 8; // Approximate character width
    const position = cursor.position.position;

    const line = cursor.position.line ?? Math.floor(position / 80);
    const column = cursor.position.column ?? (position % 80);

    return {
      left: column * charWidth,
      top: line * lineHeight,
    };
  }, [cursor.position, containerRef]);

  // Determine label position
  const effectiveLabelPosition = useMemo(() => {
    if (labelPosition !== 'auto') return labelPosition;
    
    // Auto-determine based on cursor position
    return cursorPosition.top < 30 ? 'below' : 'above';
  }, [labelPosition, cursorPosition.top]);

  // Cursor style dimensions
  const cursorDimensions = useMemo(() => {
    const lineHeight = 20;
    switch (cursorStyle) {
      case 'block':
        return { width: '8px', height: `${lineHeight}px` };
      case 'underline':
        return { width: '8px', height: '2px', marginTop: `${lineHeight - 2}px` };
      case 'line':
      default:
        return { width: '2px', height: `${lineHeight}px` };
    }
  }, [cursorStyle]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  return (
    <div
      ref={cursorRef}
      className={`
        absolute z-40
        ${cursor.isActive ? 'animate-cursor-blink' : ''}
      `}
      style={{
        left: cursorPosition.left,
        top: cursorPosition.top,
        transition: `left ${animationDuration}ms ease-out, top ${animationDuration}ms ease-out`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Cursor line/block */}
      <div
        className={`
          transition-opacity duration-200
          ${cursorStyle === 'block' ? 'opacity-50' : 'opacity-100'}
        `}
        style={{
          width: cursorDimensions.width,
          height: cursorDimensions.height,
          marginTop: cursorDimensions.marginTop,
          backgroundColor: cursor.userColor,
          borderRadius: cursorStyle === 'line' ? '1px' : '0',
        }}
      />

      {/* Label */}
      {(showLabel || isHovered) && (
        <CursorLabel
          userName={cursor.userName}
          userColor={cursor.userColor}
          position={effectiveLabelPosition}
          isActive={cursor.isActive}
          onClick={onClick}
        />
      )}

      {/* Selection highlight */}
      {cursor.selection && (
        <SelectionHighlight
          selection={cursor.selection}
          userColor={cursor.userColor}
          containerRef={containerRef}
          opacity={selectionOpacity}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Remote Cursors Container
// -----------------------------------------------------------------------------

export function RemoteCursors({
  cursors,
  containerRef,
  documentId,
  localUserId,
  showLabels = true,
  labelPosition = 'auto',
  cursorStyle = 'line',
  selectionOpacity = 0.25,
  animationDuration = 100,
  maxVisibleCursors = 20,
  onCursorClick,
  onCursorHover,
  className = '',
}: RemoteCursorsProps) {
  const [hoveredCursor, setHoveredCursor] = useState<string | null>(null);

  // Filter out local user and limit visible cursors
  const visibleCursors = useMemo(() => {
    return cursors
      .filter(c => c.userId !== localUserId)
      .filter(c => c.position.documentId === documentId)
      .slice(0, maxVisibleCursors);
  }, [cursors, localUserId, documentId, maxVisibleCursors]);

  const handleCursorHover = useCallback((cursor: RemoteCursor, hovering: boolean) => {
    setHoveredCursor(hovering ? cursor.userId : null);
    onCursorHover?.(hovering ? cursor : null);
  }, [onCursorHover]);

  if (visibleCursors.length === 0) return null;

  return (
    <div 
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      role="group"
      aria-label={`${visibleCursors.length} remote cursor${visibleCursors.length !== 1 ? 's' : ''}`}
    >
      {visibleCursors.map(cursor => (
        <SingleCursor
          key={cursor.userId}
          cursor={cursor}
          containerRef={containerRef}
          showLabel={showLabels}
          labelPosition={labelPosition}
          cursorStyle={cursorStyle}
          selectionOpacity={selectionOpacity}
          animationDuration={animationDuration}
          onClick={() => onCursorClick?.(cursor)}
          onHover={(hovering) => handleCursorHover(cursor, hovering)}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Cursor Summary Component
// -----------------------------------------------------------------------------

export interface CursorSummaryProps {
  cursors: RemoteCursor[];
  localUserId?: string;
  maxDisplay?: number;
  className?: string;
}

export function CursorSummary({
  cursors,
  localUserId,
  maxDisplay = 3,
  className = '',
}: CursorSummaryProps) {
  const otherCursors = cursors.filter(c => c.userId !== localUserId);
  const activeCursors = otherCursors.filter(c => c.isActive);
  const displayCursors = activeCursors.slice(0, maxDisplay);
  const remainingCount = activeCursors.length - maxDisplay;

  if (activeCursors.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayCursors.map(cursor => (
        <div
          key={cursor.userId}
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: cursor.userColor }}
          title={`${cursor.userName} is editing`}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-slate-400">+{remainingCount}</span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default RemoteCursors;
