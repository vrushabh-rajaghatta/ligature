/**
 * CompactStatBar Component - v0.36.7
 * 
 * Space-efficient horizontal stat bar that replaces the tall stat card grid.
 * Saves ~80-100px of vertical space while keeping drilldown functionality.
 * 
 * Before: 5 cards in a grid taking ~120px height
 * After:  Single row taking ~44px height
 * 
 * USAGE:
 * <CompactStatBar stats={[
 *   { id: 'studies', value: 12, label: 'Active Studies', icon: <Flask />, color: 'green', drilldown: {...} },
 *   { id: 'sites', value: 45, label: 'Sites', icon: <Building />, color: 'blue' },
 * ]} />
 */


import React, { useState, useCallback, useMemo } from 'react';
import { 
  X, ChevronRight, ChevronDown, Search, Download, 
  AlertCircle, ArrowUpRight 
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { SearchInput } from './Input';
import { EmptyState } from './EmptyState';
import type { DrilldownConfig, DrilldownItem } from './DrillableStatCard';

// Re-export types for convenience
export type { DrilldownConfig, DrilldownItem, DrilldownColumn } from './DrillableStatCard';

// ============================================================================
// TYPES
// ============================================================================

export interface CompactStat {
  id: string;
  value: number | string;
  label: string;
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'teal' | 'amber' | 'red' | 'purple' | 'gray';
  subValue?: string;
  drilldown?: DrilldownConfig;
  highlight?: boolean; // Highlight when value > 0 (e.g., for alerts)
}

export interface CompactStatBarProps {
  stats: CompactStat[];
  className?: string;
  showLabels?: boolean; // Show labels (default: true on large screens)
  collapsible?: boolean; // Allow collapsing the bar
  defaultCollapsed?: boolean;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

const colorClasses = {
  green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/20', ring: 'ring-emerald-500/30' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', hover: 'hover:bg-blue-500/20', ring: 'ring-blue-500/30' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', hover: 'hover:bg-teal-500/20', ring: 'ring-teal-500/30' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500/20', ring: 'ring-amber-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', hover: 'hover:bg-red-500/20', ring: 'ring-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', hover: 'hover:bg-purple-500/20', ring: 'ring-purple-500/30' },
  gray: { text: 'text-text-muted', bg: 'bg-surface-card', hover: 'hover:bg-surface-elevated', ring: 'ring-border' },
};

// ============================================================================
// DRILLDOWN PANEL (Shared with DrillableStatCard)
// ============================================================================

interface DrilldownPanelProps<T extends DrilldownItem> {
  config: DrilldownConfig<T>;
  onClose: () => void;
  anchorRect?: DOMRect;
}

function DrilldownPanel<T extends DrilldownItem>({
  config,
  onClose,
}: DrilldownPanelProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredItems = useMemo(() => {
    if (!searchQuery || !config.searchable) return config.items;
    const query = searchQuery.toLowerCase();
    return config.items.filter(item => 
      Object.values(item).some(val => String(val).toLowerCase().includes(query))
    );
  }, [config.items, searchQuery, config.searchable]);
  
  const displayItems = config.maxItems 
    ? filteredItems.slice(0, config.maxItems)
    : filteredItems;
  
  const hasMore = config.maxItems && filteredItems.length > config.maxItems;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className="fixed top-0 right-0 bottom-0 w-[480px] max-w-full bg-surface-elevated border-l border-border shadow-xl z-50 flex flex-col animate-slide-in-right"
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
        {(hasMore || config.onViewAll) && (
          <div className="flex-none px-4 py-3 border-t border-border bg-surface-card/50 flex items-center justify-between">
            <div className="text-xs text-text-muted">
              {hasMore 
                ? `Showing ${displayItems.length} of ${filteredItems.length}`
                : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`
              }
            </div>
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
        )}
      </div>
    </>
  );
}

// ============================================================================
// COMPACT STAT ITEM
// ============================================================================

interface CompactStatItemProps {
  stat: CompactStat;
  showLabel?: boolean;
  onDrilldown: (stat: CompactStat) => void;
}

function CompactStatItem({ stat, showLabel = true, onDrilldown }: CompactStatItemProps) {
  const colors = colorClasses[stat.color || 'gray'];
  const hasData = stat.drilldown && (stat.drilldown.items.length > 0 || stat.drilldown.loading);
  const isClickable = hasData;
  const shouldHighlight = stat.highlight && Number(stat.value) > 0;
  
  return (
    <button
      onClick={() => isClickable && onDrilldown(stat)}
      disabled={!isClickable}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
        ${isClickable ? 'cursor-pointer' : 'cursor-default'}
        ${shouldHighlight 
          ? `${colors?.bg ?? ''} border-current/20 ${colors?.hover ?? ''} ring-1 ${colors?.ring ?? ''}` 
          : `bg-surface-card border-border/50 ${isClickable ? 'hover:bg-surface-elevated hover:border-border' : ''}`
        }
        ${isClickable ? 'active:scale-[0.98]' : ''}
      `}
    >
      {/* Icon */}
      {stat.icon && (
        <span className={`w-4 h-4 ${shouldHighlight ? colors.text : 'text-text-muted'}`}>
          {stat.icon}
        </span>
      )}
      
      {/* Value */}
      <span className={`text-sm font-semibold tabular-nums ${shouldHighlight ? colors.text : 'text-text-primary'}`}>
        {stat.value}
      </span>
      
      {/* Label */}
      {showLabel && (
        <span className="text-xs text-text-muted hidden sm:inline">
          {stat.label}
        </span>
      )}
      
      {/* Sub value (like "of 100") */}
      {stat.subValue && showLabel && (
        <span className="text-xs text-text-muted/60 hidden lg:inline">
          {stat.subValue}
        </span>
      )}
      
      {/* Drill indicator */}
      {hasData && (
        <ChevronRight className="w-3 h-3 text-text-muted/50 ml-auto" />
      )}
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CompactStatBar({ 
  stats, 
  className = '',
  showLabels = true,
  collapsible = false,
  defaultCollapsed = false,
}: CompactStatBarProps) {
  const [activeDrilldown, setActiveDrilldown] = useState<CompactStat | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const handleDrilldown = useCallback((stat: CompactStat) => {
    if (stat.drilldown) {
      setActiveDrilldown(stat);
    }
  }, []);
  
  const handleCloseDrilldown = useCallback(() => {
    setActiveDrilldown(null);
  }, []);
  
  if (collapsible && isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={`
          flex items-center gap-2 px-3 py-1 rounded-lg border border-border/50 
          bg-surface-card hover:bg-surface-elevated transition-colors text-sm text-text-muted
          ${className}
        `}
      >
        <ChevronRight className="w-4 h-4" />
        <span>Show metrics ({stats.length})</span>
      </button>
    );
  }
  
  return (
    <>
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded hover:bg-surface-card transition-colors text-text-muted"
            title="Collapse metrics"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        
        {stats.map((stat) => (
          <CompactStatItem
            key={stat.id}
            stat={stat}
            showLabel={showLabels}
            onDrilldown={handleDrilldown}
          />
        ))}
      </div>
      
      {/* Drilldown Panel */}
      {activeDrilldown?.drilldown && (
        <DrilldownPanel
          config={activeDrilldown.drilldown}
          onClose={handleCloseDrilldown}
        />
      )}
    </>
  );
}

// ============================================================================
// HELPER: Convert DrillableStatCard props to CompactStat
// ============================================================================

export function toCompactStat(props: {
  id: string;
  value: number | string;
  label: string;
  accentColor?: string;
  icon?: React.ReactNode;
  subValue?: string;
  drilldown?: DrilldownConfig;
  className?: string;
}): CompactStat {
  return {
    id: props.id,
    value: props.value,
    label: props.label,
    color: props.accentColor as CompactStat['color'],
    icon: props.icon,
    subValue: props.subValue,
    drilldown: props.drilldown,
    highlight: props.className?.includes('ring-') || false,
  };
}

export default CompactStatBar;
