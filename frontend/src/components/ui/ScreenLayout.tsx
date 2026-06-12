
/**
 * ScreenLayout Component - v0.27.0
 * 
 * Provides consistent screen structure across all modules.
 * Standardizes spacing, header layout, stats sections, and content areas.
 * 
 * USAGE:
 * <ScreenLayout
 *   title="Safety & Pharmacovigilance"
 *   subtitle="12 Open Cases"
 *   stats={statsArray}
 *   actions={<Button>Create Case</Button>}
 *   tabs={tabConfig}
 * >
 *   <MainContent />
 * </ScreenLayout>
 */


import React, { useState, useMemo, useCallback } from 'react';
import { tw, spacing, layout } from '@/styles/design-system';
import { DrillableStatCard, DrilldownConfig } from './DrillableStatCard';
import { StatCard } from './StatCard';
import { Badge } from './Badge';
import { Button } from './Button';
import { SearchInput } from './Input';
import { 
  Search, Filter, MoreHorizontal, ChevronDown, RefreshCw,
  Download, Settings, Plus
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ScreenStat {
  id: string;
  value: string | number;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  drilldown?: DrilldownConfig;
  onClick?: () => void;
}

export interface ScreenTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: {
    value: string | number;
    color: string;
  };
}

export interface ScreenAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
}

export interface ScreenLayoutProps {
  // Header
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  
  // Stats section
  stats?: ScreenStat[];
  statsColumns?: number; // Override auto column count
  
  // Tabs
  tabs?: ScreenTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  
  // Actions
  actions?: React.ReactNode;
  primaryAction?: ScreenAction;
  secondaryActions?: ScreenAction[];
  
  // Search & Filter
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  showFilter?: boolean;
  filterCount?: number;
  onFilterClick?: () => void;
  
  // Refresh
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date;
  
  // Content
  children: React.ReactNode;
  
  // Layout options
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'full' | 'xl' | '2xl';
  stickyHeader?: boolean;
  
  // Styling
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

// ============================================================================
// STATS GRID COMPONENT
// ============================================================================

interface StatsGridProps {
  stats: ScreenStat[];
  columns?: number;
}

function StatsGrid({ stats, columns }: StatsGridProps) {
  // Calculate responsive columns
  const gridClass = useMemo(() => {
    if (columns) {
      return `grid-cols-${Math.min(columns, 2)} sm:grid-cols-${Math.min(columns, 3)} lg:grid-cols-${Math.min(columns, 4)} xl:grid-cols-${columns}`;
    }
    // Auto: 2 on mobile, 3 on sm, 4 on lg, 5 on xl
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  }, [columns]);
  
  return (
    <div className={`grid ${gridClass} gap-4`}>
      {stats.map((stat) => {
        // Use DrillableStatCard if drilldown config provided
        if (stat.drilldown) {
          return (
            <DrillableStatCard
              key={stat.id}
              value={stat.value}
              label={stat.label}
              color={stat.color}
              icon={stat.icon}
              trend={stat.trend}
              drilldown={stat.drilldown}
            />
          );
        }
        
        // Use regular StatCard
        return (
          <StatCard
            key={stat.id}
            value={stat.value}
            label={stat.label}
            color={stat.color}
            icon={stat.icon}
            trend={stat.trend}
            onClick={stat.onClick}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// TABS COMPONENT
// ============================================================================

interface TabsBarProps {
  tabs: ScreenTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

function TabsBar({ tabs, activeTab, onChange }: TabsBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              border-b-2 transition-colors
              ${isActive 
                ? 'border-accent-blue text-accent-blue' 
                : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
              }
            `}
          >
            {tab.icon && (
              <span className={isActive ? 'text-accent-blue' : 'text-text-muted'}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded
                ${isActive 
                  ? 'bg-accent-blue/10 text-accent-blue' 
                  : 'bg-surface-card text-text-muted'
                }
              `}>
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <Badge color={tab.badge.color as any} size="xs">
                {tab.badge.value}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScreenLayout({
  title,
  subtitle,
  icon,
  stats,
  statsColumns,
  tabs,
  activeTab,
  onTabChange,
  actions,
  primaryAction,
  secondaryActions,
  showSearch = false,
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  showFilter = false,
  filterCount = 0,
  onFilterClick,
  showRefresh = false,
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  children,
  padding = 'md',
  maxWidth = 'full',
  stickyHeader = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
}: ScreenLayoutProps) {
  
  // Internal tab state if not controlled
  const [internalActiveTab, setInternalActiveTab] = useState(tabs?.[0]?.id || '');
  const currentTab = activeTab ?? internalActiveTab;
  const handleTabChange = onTabChange ?? setInternalActiveTab;
  
  // Padding classes
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];
  
  // Max width classes
  const maxWidthClass = {
    full: '',
    xl: 'max-w-7xl mx-auto',
    '2xl': 'max-w-[1600px] mx-auto',
  }[maxWidth];
  
  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-surface ${className}`}>
      {/* Header Section */}
      <div 
        className={`
          flex-none bg-surface border-b border-border
          ${stickyHeader ? 'sticky top-0 z-10' : ''}
          ${headerClassName}
        `}
      >
        <div className={`${paddingClass} ${maxWidthClass}`}>
          {/* Title Row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="p-2 bg-accent-blue/10 rounded-lg flex-shrink-0">
                  <span className="text-accent-blue">{icon}</span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-text-primary truncate">
                  {title}
                </h1>
                {subtitle && (
                  <div className="text-sm text-text-secondary mt-0.5">
                    {typeof subtitle === 'string' ? subtitle : subtitle}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search */}
              {showSearch && (
                <div className="hidden sm:block w-48 lg:w-64">
                  <SearchInput
                    value={searchValue}
                    onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
                    placeholder={searchPlaceholder}
                    inputSize="sm"
                  />
                </div>
              )}
              
              {/* Filter */}
              {showFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Filter className="w-4 h-4" />}
                  onClick={onFilterClick}
                >
                  Filter
                  {filterCount > 0 && (
                    <Badge color="blue" size="xs" className="ml-1">{filterCount}</Badge>
                  )}
                </Button>
              )}
              
              {/* Refresh */}
              {showRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                  onClick={onRefresh}
                  disabled={isRefreshing}
                />
              )}
              
              {/* Secondary Actions */}
              {secondaryActions?.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  icon={action.icon}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ))}
              
              {/* Primary Action */}
              {primaryAction && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={primaryAction.icon || <Plus className="w-4 h-4" />}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.label}
                </Button>
              )}
              
              {/* Custom Actions */}
              {actions}
            </div>
          </div>
          
          {/* Stats Grid */}
          {stats && stats.length > 0 && (
            <div className="mb-4">
              <StatsGrid stats={stats} columns={statsColumns} />
            </div>
          )}
          
          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-text-muted mb-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className={`px-4 sm:px-6 ${maxWidthClass}`}>
            <TabsBar
              tabs={tabs}
              activeTab={currentTab}
              onChange={handleTabChange}
            />
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className={`flex-1 overflow-auto ${contentClassName}`}>
        <div className={`${paddingClass} ${maxWidthClass} min-h-full`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION COMPONENT (For use within ScreenLayout)
// ============================================================================

export interface ScreenSectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ScreenSection({
  title,
  subtitle,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  children,
  className = '',
}: ScreenSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  return (
    <div className={`${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-surface-card rounded transition-colors"
              >
                <ChevronDown 
                  className={`w-4 h-4 text-text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} 
                />
              </button>
            )}
            {title && (
              <div>
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      {!isCollapsed && children}
    </div>
  );
}

// ============================================================================
// CARD GRID COMPONENT
// ============================================================================

export interface CardGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function CardGrid({
  columns = 3,
  gap = 'md',
  children,
  className = '',
}: CardGridProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns];
  
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];
  
  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ScreenLayout;
