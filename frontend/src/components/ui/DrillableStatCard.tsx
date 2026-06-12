
/**
 * DrillableStatCard Component - v0.27.0
 * 
 * Enhanced StatCard that opens a drill-down panel when clicked.
 * Every metric in the system should be actionable and explorable.
 * 
 * USAGE:
 * <DrillableStatCard
 *   value={42}
 *   label="Open HAQs"
 *   color="text-accent-amber"
 *   icon={<MessageSquare />}
 *   drilldown={{
 *     title: "Open HAQs",
 *     items: haqList,
 *     columns: [...],
 *     onItemClick: (item) => navigateTo(item.id),
 *   }}
 * />
 */


import React, { useState, useCallback, useMemo } from 'react';
import { 
  X, ChevronRight, ArrowUpRight, Search, Filter, 
  Download, ExternalLink, MoreHorizontal, AlertCircle,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { StatCard, StatCardAction } from './StatCard';
import { Button } from './Button';
import { Badge } from './Badge';
import { SearchInput } from './Input';
import { EmptyState } from './EmptyState';
import { tw } from '@/styles/design-system';

// ============================================================================
// TYPES
// ============================================================================

export interface DrilldownColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface DrilldownItem {
  id: string;
  [key: string]: unknown;
}

export interface DrilldownConfig<T extends DrilldownItem = DrilldownItem> {
  title: string;
  subtitle?: string;
  items: T[];
  columns: DrilldownColumn<T>[];
  onItemClick?: (item: T) => void;
  onExport?: () => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  maxItems?: number; // Show "View All" after this many
  groupBy?: keyof T; // Optional grouping
  actions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
}

export interface DrillableStatCardProps {
  // StatCard props
  value: string | number;
  label?: string;
  title?: string;
  color?: string;
  variant?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  className?: string;
  children?: React.ReactNode;
  // Drilldown config
  drilldown: DrilldownConfig;
  // Panel positioning
  panelPosition?: 'right' | 'modal' | 'inline';
  panelWidth?: number;
}

// ============================================================================
// DRILLDOWN PANEL COMPONENT
// ============================================================================

interface DrilldownPanelProps<T extends DrilldownItem> {
  config: DrilldownConfig<T>;
  onClose: () => void;
  position: 'right' | 'modal' | 'inline';
  width?: number;
}

function DrilldownPanel<T extends DrilldownItem>({
  config,
  onClose,
  position,
  width = 480,
}: DrilldownPanelProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery || !config.searchable) return config.items;
    
    const query = searchQuery.toLowerCase();
    return config.items.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(query)
      )
    );
  }, [config.items, searchQuery, config.searchable]);
  
  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;
    
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortKey as keyof T];
      const bVal = b[sortKey as keyof T];
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortKey, sortDir]);
  
  // Limit items if maxItems set
  const displayItems = config.maxItems 
    ? sortedItems.slice(0, config.maxItems)
    : sortedItems;
  
  const hasMore = config.maxItems && sortedItems.length > config.maxItems;
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  
  // Panel positioning styles
  const panelStyles = position === 'right' 
    ? `fixed top-0 right-0 bottom-0 bg-surface-elevated border-l border-border shadow-xl z-50 flex flex-col`
    : position === 'modal'
    ? `fixed inset-4 md:inset-10 bg-surface-elevated border border-border rounded-xl shadow-2xl z-50 flex flex-col`
    : `absolute top-0 right-0 bottom-0 bg-surface-elevated border-l border-border shadow-lg z-30 flex flex-col`;
  
  return (
    <>
      {/* Backdrop */}
      {position !== 'inline' && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div 
        className={`${panelStyles} animate-slide-in-right`}
        style={{ width: position === 'modal' ? undefined : width }}
      >
        {/* Header */}
        <div className="flex-none px-4 py-3 border-b border-border bg-surface flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">
              {config.title}
            </h3>
            {config.subtitle && (
              <p className="text-xs text-text-muted mt-0.5">{config.subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {config.onExport && (
              <Button 
                variant="ghost" 
                size="xs" 
                icon={<Download className="w-4 h-4" />}
                onClick={config.onExport}
              />
            )}
            <Button 
              variant="ghost" 
              size="xs" 
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
            />
          </div>
        </div>
        
        {/* Search */}
        {config.searchable && (
          <div className="flex-none px-4 py-2 border-b border-border/50">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={config.searchPlaceholder || 'Search...'}
              inputSize="sm"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {config.loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-text-muted mt-2">Loading...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <EmptyState
              icon={config.emptyIcon || <AlertCircle className="w-8 h-8" />}
              title="No items found"
              description={config.emptyMessage || 'No data available'}
            />
          ) : (
            <div className="divide-y divide-border/50">
              {displayItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => config.onItemClick?.(item)}
                  className={`
                    px-4 py-3 hover:bg-surface-card transition-colors
                    ${config.onItemClick ? 'cursor-pointer' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {config.columns.map((col) => {
                      const value = col.key === 'index' 
                        ? index + 1 
                        : item[col.key as keyof T];
                      
                      return (
                        <div 
                          key={String(col.key)}
                          className={`
                            ${col.width ? '' : 'flex-1'} min-w-0
                            ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                          `}
                          style={col.width ? { width: col.width, flexShrink: 0 } : undefined}
                        >
                          {col.render 
                            ? col.render(value, item, index)
                            : <span className="text-sm text-text-primary truncate block">{String(value ?? '-')}</span>
                          }
                        </div>
                      );
                    })}
                    
                    {config.onItemClick && (
                      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {(hasMore || config.onViewAll || config.actions) && (
          <div className="flex-none px-4 py-3 border-t border-border bg-surface-card/50 flex items-center justify-between">
            <div className="text-xs text-text-muted">
              {hasMore 
                ? `Showing ${displayItems.length} of ${sortedItems.length}`
                : `${sortedItems.length} item${sortedItems.length !== 1 ? 's' : ''}`
              }
            </div>
            
            <div className="flex items-center gap-2">
              {config.actions?.map(action => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="xs"
                  icon={action.icon}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
              
              {(hasMore || config.onViewAll) && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={config.onViewAll}
                >
                  {config.viewAllLabel || 'View All'}
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillableStatCard({
  value,
  label,
  title,
  color,
  variant,
  accentColor,
  icon,
  trend,
  className = '',
  drilldown,
  panelPosition = 'right',
  panelWidth = 480,
}: DrillableStatCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClick = useCallback(() => {
    if (drilldown.items.length > 0 || drilldown.loading) {
      setIsOpen(true);
    }
  }, [drilldown.items.length, drilldown.loading]);
  
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Show drill indicator if there are items
  const showDrillIndicator = drilldown.items.length > 0 || drilldown.loading;
  
  return (
    <>
      <StatCard
        value={value}
        label={label}
        title={title}
        color={color}
        variant={variant}
        accentColor={accentColor}
        icon={icon}
        trend={trend}
        onClick={showDrillIndicator ? handleClick : undefined}
        clickHint={showDrillIndicator ? `Click to view ${drilldown.title}` : undefined}
        className={`
          ${className}
          ${showDrillIndicator ? 'relative' : ''}
        `}
      >
        {/* Drill indicator */}
        {showDrillIndicator && (
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
        )}
      </StatCard>
      
      {/* Drilldown Panel */}
      {isOpen && (
        <DrilldownPanel
          config={drilldown}
          onClose={handleClose}
          position={panelPosition}
          width={panelWidth}
        />
      )}
    </>
  );
}

// ============================================================================
// PRE-BUILT COLUMN RENDERERS
// ============================================================================

export const columnRenderers = {
  // Status badge
  status: (statusMap: Record<string, { label: string; color: string }>) => 
    (value: string) => {
      const config = statusMap[value] || { label: value, color: 'gray' };
      return <Badge color={config.color as any} size="xs">{config.label}</Badge>;
    },
  
  // Date
  date: (format?: 'short' | 'long') => (value: string | Date) => {
    const date = new Date(value);
    return (
      <span className="text-sm text-text-secondary">
        {format === 'long' 
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      </span>
    );
  },
  
  // Trend
  trend: (value: number) => {
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    const color = value > 0 ? 'text-accent-green' : value < 0 ? 'text-accent-red' : 'text-text-muted';
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${color}`}>
        <Icon className="w-3 h-3" />
        {Math.abs(value)}%
      </span>
    );
  },
  
  // Progress bar
  progress: (value: number) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-card rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent-blue rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-text-muted w-8 text-right">{value}%</span>
    </div>
  ),
  
  // Bold primary text
  primary: (value: string) => (
    <span className="text-sm font-medium text-text-primary">{value}</span>
  ),
  
  // Muted secondary text
  secondary: (value: string) => (
    <span className="text-sm text-text-secondary">{value}</span>
  ),
  
  // ID badge
  id: (value: string) => (
    <span className="text-xs font-mono text-text-muted bg-surface-card px-1.5 py-0.5 rounded">
      {value}
    </span>
  ),
};

// ============================================================================
// EXPORTS
// ============================================================================

export default DrillableStatCard;
