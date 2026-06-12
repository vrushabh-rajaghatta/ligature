/**
 * CursorOverlay
 * Renders remote user cursors and selections over content
 * 
 * v0.41.7 - Collaboration UI Components
 */


import React, { useState, useEffect, useRef, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  position: number;
  sectionId?: string;
  selection?: {
    start: number;
    end: number;
  };
  isActive: boolean;
  lastUpdated: number;
}

export interface CursorOverlayProps {
  cursors: CursorPosition[];
  content: string;
  containerRef: React.RefObject<HTMLElement | null>;
  currentUserId: string;
  showLabels?: boolean;
  cursorStyle?: 'line' | 'caret' | 'block';
  selectionOpacity?: number;
  labelTimeout?: number; // ms to hide label after inactivity
  onCursorClick?: (cursor: CursorPosition) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// Get text coordinates for a character position
function getPositionCoordinates(
  container: HTMLElement,
  content: string,
  position: number
): { x: number; y: number; height: number } | null {
  // Create a hidden range to measure position
  const textNode = findTextNode(container, position, content);
  if (!textNode) return null;

  try {
    const range = document.createRange();
    const offset = Math.min(position, textNode.length);
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      height: rect.height || 20,
    };
  } catch {
    return null;
  }
}

function findTextNode(container: HTMLElement, position: number, content: string): Text | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let currentPos = 0;
  let node: Text | null = null;

  while ((node = walker.nextNode() as Text)) {
    const nodeLength = node.textContent?.length || 0;
    if (currentPos + nodeLength >= position) {
      return node;
    }
    currentPos += nodeLength;
  }

  return node;
}

// Get selection rectangles
function getSelectionRects(
  container: HTMLElement,
  start: number,
  end: number
): DOMRect[] {
  try {
    const range = document.createRange();
    
    // Find start and end text nodes
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentPos = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;
    let node: Text | null = null;

    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      
      if (!startNode && currentPos + nodeLength >= start) {
        startNode = node;
        startOffset = start - currentPos;
      }
      
      if (currentPos + nodeLength >= end) {
        endNode = node;
        endOffset = end - currentPos;
        break;
      }
      
      currentPos += nodeLength;
    }

    if (!startNode || !endNode) return [];

    range.setStart(startNode, Math.min(startOffset, startNode.length));
    range.setEnd(endNode, Math.min(endOffset, endNode.length));

    return Array.from(range.getClientRects());
  } catch {
    return [];
  }
}

// =============================================================================
// CURSOR COMPONENT
// =============================================================================

function Cursor({
  cursor,
  coordinates,
  style,
  showLabel,
  labelTimeout,
  onClick,
}: {
  cursor: CursorPosition;
  coordinates: { x: number; y: number; height: number };
  style: 'line' | 'caret' | 'block';
  showLabel: boolean;
  labelTimeout: number;
  onClick?: () => void;
}) {
  const [labelVisible, setLabelVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset label visibility on cursor update
    setLabelVisible(true);
    
    if (labelTimeout > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLabelVisible(false);
      }, labelTimeout);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cursor.lastUpdated, labelTimeout]);

  const cursorStyles = {
    line: {
      width: '2px',
      height: `${coordinates.height}px`,
      borderRadius: '1px',
    },
    caret: {
      width: '2px',
      height: `${coordinates.height}px`,
      borderRadius: '0 0 1px 1px',
    },
    block: {
      width: '8px',
      height: `${coordinates.height}px`,
      borderRadius: '2px',
      opacity: 0.5,
    },
  }[style];

  return (
    <div
      className="absolute pointer-events-none transition-all duration-75"
      style={{
        left: coordinates.x,
        top: coordinates.y,
        zIndex: 50,
      }}
    >
      {/* Cursor line/block */}
      <div
        className="cursor-blink"
        style={{
          backgroundColor: cursor.userColor,
          ...cursorStyles,
        }}
        onClick={onClick}
      />

      {/* Label */}
      {showLabel && labelVisible && (
        <div
          className="absolute left-0 bottom-full mb-1 whitespace-nowrap
                     px-1.5 py-0.5 rounded text-xs font-medium
                     shadow-lg transition-opacity duration-200"
          style={{
            backgroundColor: cursor.userColor,
            color: '#fff',
          }}
        >
          {cursor.userName}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SELECTION HIGHLIGHT COMPONENT
// =============================================================================

function SelectionHighlight({
  cursor,
  rects,
  containerRect,
  opacity,
}: {
  cursor: CursorPosition;
  rects: DOMRect[];
  containerRect: DOMRect;
  opacity: number;
}) {
  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: cursor.userColor,
            opacity,
            zIndex: 40,
          }}
        />
      ))}
    </>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CursorOverlay({
  cursors,
  content,
  containerRef,
  currentUserId,
  showLabels = true,
  cursorStyle = 'line',
  selectionOpacity = 0.2,
  labelTimeout = 3000,
  onCursorClick,
}: CursorOverlayProps) {
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [cursorCoords, setCursorCoords] = useState<Map<string, { x: number; y: number; height: number }>>(new Map());
  const [selectionRects, setSelectionRects] = useState<Map<string, DOMRect[]>>(new Map());

  // Update container rect on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateRect = () => {
      setContainerRect(container.getBoundingClientRect());
    };

    updateRect();
    
    const observer = new ResizeObserver(updateRect);
    observer.observe(container);
    
    window.addEventListener('scroll', updateRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateRect);
    };
  }, [containerRef]);

  // Calculate cursor positions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const newCoords = new Map<string, { x: number; y: number; height: number }>();
    const newSelectionRects = new Map<string, DOMRect[]>();

    for (const cursor of cursors) {
      if (cursor.userId === currentUserId) continue;

      // Cursor position
      const coords = getPositionCoordinates(container, content, cursor.position);
      if (coords) {
        newCoords.set(cursor.userId, coords);
      }

      // Selection rects
      if (cursor.selection && cursor.selection.start !== cursor.selection.end) {
        const rects = getSelectionRects(
          container,
          cursor.selection.start,
          cursor.selection.end
        );
        if (rects.length > 0) {
          newSelectionRects.set(cursor.userId, rects);
        }
      }
    }

    setCursorCoords(newCoords);
    setSelectionRects(newSelectionRects);
  }, [cursors, content, containerRef, currentUserId]);

  // Filter other users' cursors
  const otherCursors = useMemo(
    () => cursors.filter(c => c.userId !== currentUserId),
    [cursors, currentUserId]
  );

  if (!containerRef.current || !containerRect) return null;

  return (
    <div className="cursor-overlay absolute inset-0 pointer-events-none overflow-hidden">
      {/* Selection highlights (render first, below cursors) */}
      {otherCursors.map((cursor) => {
        const rects = selectionRects.get(cursor.userId);
        if (!rects || rects.length === 0) return null;

        return (
          <SelectionHighlight
            key={`sel-${cursor.userId}`}
            cursor={cursor}
            rects={rects}
            containerRect={containerRect}
            opacity={selectionOpacity}
          />
        );
      })}

      {/* Cursors */}
      {otherCursors.map((cursor) => {
        const coords = cursorCoords.get(cursor.userId);
        if (!coords) return null;

        return (
          <Cursor
            key={`cur-${cursor.userId}`}
            cursor={cursor}
            coordinates={coords}
            style={cursorStyle}
            showLabel={showLabels}
            labelTimeout={labelTimeout}
            onClick={() => onCursorClick?.(cursor)}
          />
        );
      })}

      {/* Cursor blink animation */}
      <style jsx global>{`
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .cursor-blink {
          animation: cursor-blink 1s infinite;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Cursor, SelectionHighlight };
