

/**
 * VirtualTable - v139
 * 
 * Virtualized table component for large data sets (50+ rows).
 * Only renders rows that are visible in the viewport + buffer.
 * 
 * Features:
 * - Smooth scrolling with overscan
 * - Dynamic row heights support
 * - Sticky header
 * - Keyboard navigation
 * - Mobile touch support
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface VirtualTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header text */
  header: string;
  /** Width in pixels or 'auto' */
  width?: number | 'auto';
  /** Minimum width */
  minWidth?: number;
  /** Render function for cell content */
  render?: (row: T, index: number) => ReactNode;
  /** Accessor for simple text content */
  accessor?: keyof T;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom header render */
  headerRender?: () => ReactNode;
  /** CSS class for cells */
  className?: string;
}

export interface VirtualTableProps<T> {
  /** Data rows */
  data: T[];
  /** Column definitions */
  columns: VirtualTableColumn<T>[];
  /** Unique key extractor for rows */
  rowKey: (row: T, index: number) => string;
  /** Row height in pixels (default: 48) */
  rowHeight?: number;
  /** Header height in pixels (default: 44) */
  headerHeight?: number;
  /** Number of rows to render outside viewport (default: 5) */
  overscan?: number;
  /** Maximum height of table (default: 600) */
  maxHeight?: number;
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Selected row key */
  selectedKey?: string;
  /** Additional table className */
  className?: string;
  /** Sort handler */
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
}

// ============================================
// Component
// ============================================

export function VirtualTable<T>({
  data,
  columns,
  rowKey,
  rowHeight = 48,
  headerHeight = 44,
  overscan = 5,
  maxHeight = 600,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedKey,
  className = '',
  onSort,
  sortColumn,
  sortDirection,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  // Calculate visible range
  const totalHeight = data.length * rowHeight;
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(data.length - 1, startIndex + visibleCount + overscan * 2);
  
  // Visible rows with positioning
  const visibleRows = useMemo(() => {
    const rows = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (data[i]) {
        rows.push({
          data: data[i],
          index: i,
          top: i * rowHeight,
        });
      }
    }
    return rows;
  }, [data, startIndex, endIndex, rowHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Handle sort
  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  }, [onSort, sortColumn, sortDirection]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: T, index: number) => {
    if (!onRowClick) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row, index);
    }
  }, [onRowClick]);

  // Column widths
  const columnStyles = useMemo(() => {
    return columns.map(col => ({
      width: col.width === 'auto' ? 'auto' : col.width,
      minWidth: col.minWidth || 80,
      textAlign: col.align || 'left',
    }));
  }, [columns]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-surface-card border border-border rounded-lg overflow-hidden ${className}`}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex border-b border-border" style={{ height: headerHeight }}>
            {columns.map((col, i) => (
              <div
                key={col.key}
                className="px-4 flex items-center"
                style={{ width: columnStyles[i]?.width, minWidth: columnStyles[i]?.minWidth }}
              >
                <div className="h-4 bg-surface rounded w-20" />
              </div>
            ))}
          </div>
          {/* Row skeletons */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex border-b border-border" style={{ height: rowHeight }}>
              {columns.map((col, j) => (
                <div
                  key={col.key}
                  className="px-4 flex items-center"
                  style={{ width: columnStyles[j]?.width, minWidth: columnStyles[j]?.minWidth }}
                >
                  <div className="h-4 bg-surface rounded w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`bg-surface-card border border-border rounded-lg overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex border-b border-border bg-surface-elevated" style={{ height: headerHeight }}>
          {columns.map((col, i) => (
            <div
              key={col.key}
              className="px-4 flex items-center text-xs font-medium text-text-muted uppercase tracking-wide"
              style={{ 
                width: columnStyles[i]?.width, 
                minWidth: columnStyles[i]?.minWidth,
                textAlign: columnStyles[i]?.textAlign as 'left' | 'center' | 'right',
              }}
            >
              {col.headerRender ? col.headerRender() : col.header}
            </div>
          ))}
        </div>
        {/* Empty message */}
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Sticky Header */}
      <div 
        className="flex border-b border-border bg-surface-elevated sticky top-0 z-10" 
        style={{ height: headerHeight }}
      >
        {columns.map((col, i) => (
          <div
            key={col.key}
            className={`px-4 flex items-center text-xs font-medium text-text-muted uppercase tracking-wide ${
              col.sortable ? 'cursor-pointer hover:text-text-secondary select-none' : ''
            }`}
            style={{ 
              width: columnStyles[i]?.width, 
              minWidth: columnStyles[i]?.minWidth,
              textAlign: columnStyles[i]?.textAlign as 'left' | 'center' | 'right',
            }}
            onClick={col.sortable ? () => handleSort(col.key) : undefined}
          >
            {col.headerRender ? col.headerRender() : col.header}
            {col.sortable && sortColumn === col.key && (
              <span className="ml-1">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable Body */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight: maxHeight - headerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual scroll container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleRows.map(({ data: row, index, top }) => {
            const key = rowKey(row, index);
            const isSelected = selectedKey === key;
            
            return (
              <div
                key={key}
                className={`
                  flex border-b border-border transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-surface' : ''}
                  ${isSelected ? 'bg-accent-blue/10' : ''}
                `}
                style={{ 
                  height: rowHeight,
                  position: 'absolute',
                  top,
                  left: 0,
                  right: 0,
                }}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                onKeyDown={(e) => handleKeyDown(e, row, index)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-selected={isSelected}
              >
                {columns.map((col, i) => (
                  <div
                    key={col.key}
                    className={`px-4 flex items-center text-sm text-text-primary ${col.className || ''}`}
                    style={{ 
                      width: columnStyles[i]?.width, 
                      minWidth: columnStyles[i]?.minWidth,
                      textAlign: columnStyles[i]?.textAlign as 'left' | 'center' | 'right',
                    }}
                  >
                    {col.render 
                      ? col.render(row, index)
                      : col.accessor 
                        ? String(row[col.accessor] ?? '')
                        : null
                    }
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with row count */}
      <div className="px-4 py-2 border-t border-border bg-surface-elevated text-xs text-text-muted">
        Showing {Math.min(visibleCount, data.length)} of {data.length} rows
        {data.length > 50 && (
          <span className="ml-2 text-accent-blue">• Virtualized</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// useVirtualScroll Hook (for custom implementations)
// ============================================

export interface UseVirtualScrollOptions {
  /** Total number of items */
  itemCount: number;
  /** Height of each item */
  itemHeight: number;
  /** Container height */
  containerHeight: number;
  /** Number of items to render outside viewport */
  overscan?: number;
}

export interface VirtualScrollResult {
  /** Start index of visible items */
  startIndex: number;
  /** End index of visible items */
  endIndex: number;
  /** Total height of the virtual list */
  totalHeight: number;
  /** Handler for scroll events */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  /** Current scroll position */
  scrollTop: number;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = itemCount * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    startIndex,
    endIndex,
    totalHeight,
    onScroll,
    scrollTop,
  };
}

export default VirtualTable;
