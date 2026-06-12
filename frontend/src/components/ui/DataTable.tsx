
import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

// Column definition
export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

// Table props
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | number;
  emptyState?: ReactNode;
  loading?: boolean;
  className?: string;
}

// Sort state
type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  striped = false,
  hoverable = true,
  compact = false,
  stickyHeader = false,
  onRowClick,
  selectedRowKey,
  emptyState,
  loading = false,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Cell padding based on compact mode
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  
  // Alignment classes
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  // Loading skeleton
  if (loading) {
    return (
      <div className={`overflow-hidden rounded-lg border border-border ${className}`}>
        <table className="w-full">
          <thead className="bg-surface-card">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`${headerPadding} text-left`}>
                  <div className="h-4 bg-surface-hover rounded animate-pulse w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((col) => (
                  <td key={col.key} className={cellPadding}>
                    <div className="h-4 bg-surface-hover rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // Empty state
  if (data.length === 0) {
    return (
      <div className={`overflow-hidden rounded-lg border border-border ${className}`}>
        <table className="w-full">
          <thead className="bg-surface-card">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${headerPadding} text-xs font-medium text-text-muted uppercase tracking-wider ${alignClasses[col.align || 'left']}`}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        {emptyState || <EmptyState type="no-data" size="sm" />}
      </div>
    );
  }
  
  return (
    <div className={`overflow-hidden rounded-lg border border-border ${className}`}>
      <div className={`overflow-auto ${stickyHeader ? 'max-h-[600px]' : ''}`}>
        <table className="w-full">
          <thead className={`bg-surface-card ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    ${headerPadding} 
                    text-xs font-medium text-text-muted uppercase tracking-wider
                    ${alignClasses[col.align || 'left']}
                    ${col.sortable ? 'cursor-pointer select-none hover:text-text-secondary transition-colors' : ''}
                  `}
                  style={col.width ? { width: col.width } : {}}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="w-4 h-4 flex items-center justify-center">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-elevated divide-y divide-border">
            {sortedData.map((row, rowIndex) => {
              const rowKey = row[keyField] as string | number;
              const isSelected = selectedRowKey === rowKey;
              
              return (
                <tr
                  key={rowKey ?? rowIndex}
                  className={`
                    ${striped && rowIndex % 2 === 1 ? 'bg-surface-card/30' : ''}
                    ${hoverable ? 'hover:bg-surface-card transition-colors' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isSelected ? 'bg-accent-blue/10 hover:bg-accent-blue/15' : ''}
                  `}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPadding} text-sm text-text-secondary ${alignClasses[col.align || 'left']}`}
                    >
                      {col.render 
                        ? col.render(row, rowIndex)
                        : (row[col.key] as ReactNode) ?? '-'
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Simple table for quick usage
interface SimpleTableProps {
  headers: string[];
  rows: (string | ReactNode)[][];
  striped?: boolean;
  compact?: boolean;
  className?: string;
}

export function SimpleTable({ headers, rows, striped = false, compact = false, className = '' }: SimpleTableProps) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  
  return (
    <div className={`overflow-hidden rounded-lg border border-border ${className}`}>
      <table className="w-full">
        <thead className="bg-surface-card">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className={`${cellPadding} text-left text-xs font-medium text-text-muted uppercase tracking-wider`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface-elevated divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={striped && rowIndex % 2 === 1 ? 'bg-surface-card/30' : ''}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`${cellPadding} text-sm text-text-secondary`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
