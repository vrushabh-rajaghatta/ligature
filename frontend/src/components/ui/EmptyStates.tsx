// ============================================================================
// Empty State Components - v143: Final Polish
// Polished empty states for all modules with consistent styling
// ============================================================================


import React from 'react';
import { 
  FileText, 
  Search, 
  AlertCircle, 
  Plus, 
  Upload, 
  Filter, 
  Database,
  FolderOpen,
  MessageSquare,
  Shield,
  FlaskConical,
  ClipboardList,
  BarChart3,
  Settings,
  Zap,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type EmptyStateVariant = 
  | 'no-data'
  | 'no-results'
  | 'no-selection'
  | 'loading-error'
  | 'access-denied'
  | 'coming-soon'
  | 'filter-empty'
  | 'search-empty';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: EmptyStateAction[];
  compact?: boolean;
  className?: string;
}

// ============================================================================
// VARIANT CONFIGS
// ============================================================================

const VARIANT_CONFIGS: Record<EmptyStateVariant, { 
  icon: LucideIcon; 
  title: string; 
  description: string;
  iconColor: string;
}> = {
  'no-data': {
    icon: Database,
    title: 'No Data Available',
    description: 'There is no data to display. Get started by adding your first item.',
    iconColor: 'text-text-muted',
  },
  'no-results': {
    icon: Search,
    title: 'No Results Found',
    description: 'We couldn\'t find any items matching your criteria. Try adjusting your search or filters.',
    iconColor: 'text-text-muted',
  },
  'no-selection': {
    icon: FolderOpen,
    title: 'Nothing Selected',
    description: 'Select an item from the list to view its details here.',
    iconColor: 'text-text-muted',
  },
  'loading-error': {
    icon: AlertCircle,
    title: 'Unable to Load',
    description: 'Something went wrong while loading this content. Please try again.',
    iconColor: 'text-status-error',
  },
  'access-denied': {
    icon: Shield,
    title: 'Access Restricted',
    description: 'You don\'t have permission to view this content. Contact your administrator for access.',
    iconColor: 'text-status-warning',
  },
  'coming-soon': {
    icon: Zap,
    title: 'Coming Soon',
    description: 'This feature is under development and will be available in a future release.',
    iconColor: 'text-accent-primary',
  },
  'filter-empty': {
    icon: Filter,
    title: 'No Matches',
    description: 'No items match your current filters. Try removing some filters to see more results.',
    iconColor: 'text-text-muted',
  },
  'search-empty': {
    icon: Search,
    title: 'No Search Results',
    description: 'Your search didn\'t match any items. Try using different keywords.',
    iconColor: 'text-text-muted',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  icon: CustomIcon,
  actions = [],
  compact = false,
  className = '',
}: EmptyStateProps) {
  const config = VARIANT_CONFIGS[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 text-text-muted ${className}`}>
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-secondary">{displayTitle}</p>
          {displayDescription && (
            <p className="text-xs text-text-muted truncate">{displayDescription}</p>
          )}
        </div>
        {actions.length > 0 && (
          <button
            onClick={actions[0].onClick}
            className="text-xs text-accent-primary hover:text-accent-primary/80 font-medium"
          >
            {actions[0].label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {/* Icon */}
      <div className={`
        h-16 w-16 rounded-2xl bg-surface-raised 
        flex items-center justify-center mb-4
        ring-1 ring-border-subtle
      `}>
        <Icon className={`h-8 w-8 ${config.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-muted max-w-sm mb-6">
        {displayDescription}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex items-center gap-3">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant === 'primary' || (index === 0 && !action.variant);
            
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isPrimary 
                    ? 'bg-accent-primary text-white hover:bg-accent-primary/90' 
                    : 'bg-surface-raised text-text-secondary hover:bg-surface-raised/80 ring-1 ring-border-subtle'
                  }
                `}
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODULE-SPECIFIC EMPTY STATES
// ============================================================================

interface ModuleEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

export function DocumentsEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No Documents"
      description="Get started by creating your first document or importing existing files."
      actions={onAction ? [
        { label: 'Create Document', onClick: onAction, icon: Plus },
        { label: 'Import', onClick: () => {}, variant: 'secondary', icon: Upload },
      ] : []}
      className={className}
    />
  );
}

export function HAQEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No Health Authority Questions"
      description="No HAQs have been received for this product. Questions will appear here when health authorities submit them."
      actions={onAction ? [
        { label: 'View All Products', onClick: onAction },
      ] : []}
      className={className}
    />
  );
}

export function SafetyEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={Shield}
      title="No Safety Cases"
      description="No adverse event reports or safety cases match your current filters."
      actions={onAction ? [
        { label: 'Clear Filters', onClick: onAction, icon: RefreshCw },
      ] : []}
      className={className}
    />
  );
}

export function ClinicalEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={FlaskConical}
      title="No Clinical Data"
      description="Clinical trial data will appear here once studies are set up and data collection begins."
      actions={onAction ? [
        { label: 'Set Up Study', onClick: onAction, icon: Plus },
      ] : []}
      className={className}
    />
  );
}

export function SubmissionsEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No Submissions"
      description="Start building your first regulatory submission or import an existing sequence."
      actions={onAction ? [
        { label: 'New Submission', onClick: onAction, icon: Plus },
        { label: 'Import', onClick: () => {}, variant: 'secondary', icon: Upload },
      ] : []}
      className={className}
    />
  );
}

export function AnalyticsEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Analytics Data"
      description="Analytics will populate as you use the platform. Check back after some activity."
      className={className}
    />
  );
}

export function SettingsEmptyState({ onAction, className }: ModuleEmptyStateProps) {
  return (
    <EmptyState
      icon={Settings}
      title="No Configuration"
      description="Configure your workspace settings to customize your experience."
      actions={onAction ? [
        { label: 'Configure', onClick: onAction, icon: Settings },
      ] : []}
      className={className}
    />
  );
}

// ============================================================================
// SEARCH/FILTER EMPTY STATES
// ============================================================================

interface SearchEmptyStateProps {
  query?: string;
  onClear?: () => void;
  className?: string;
}

export function SearchEmptyState({ query, onClear, className }: SearchEmptyStateProps) {
  return (
    <EmptyState
      variant="search-empty"
      title={query ? `No results for "${query}"` : 'No Results'}
      description="Try searching with different keywords or check your spelling."
      actions={onClear ? [
        { label: 'Clear Search', onClick: onClear, icon: RefreshCw },
      ] : []}
      className={className}
    />
  );
}

interface FilterEmptyStateProps {
  filterCount?: number;
  onClear?: () => void;
  className?: string;
}

export function FilterEmptyState({ filterCount, onClear, className }: FilterEmptyStateProps) {
  return (
    <EmptyState
      variant="filter-empty"
      title="No Matching Items"
      description={filterCount 
        ? `${filterCount} filter${filterCount > 1 ? 's' : ''} applied. Try removing some filters to see more results.`
        : 'No items match your current filters.'}
      actions={onClear ? [
        { label: 'Clear Filters', onClick: onClear, icon: Filter },
      ] : []}
      className={className}
    />
  );
}

// ============================================================================
// ERROR EMPTY STATES
// ============================================================================

interface ErrorEmptyStateProps {
  error?: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorEmptyState({ error, onRetry, className }: ErrorEmptyStateProps) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'An unexpected error occurred.';
  
  return (
    <EmptyState
      variant="loading-error"
      title="Something Went Wrong"
      description={errorMessage}
      actions={onRetry ? [
        { label: 'Try Again', onClick: onRetry, icon: RefreshCw },
      ] : []}
      className={className}
    />
  );
}

export function AccessDeniedEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      variant="access-denied"
      title="Access Restricted"
      description="You don't have permission to view this content. Please contact your administrator if you believe this is an error."
      className={className}
    />
  );
}

// ============================================================================
// SPECIAL EMPTY STATES
// ============================================================================

export function ComingSoonEmptyState({ 
  feature, 
  className 
}: { 
  feature?: string; 
  className?: string;
}) {
  return (
    <EmptyState
      variant="coming-soon"
      title={feature ? `${feature} Coming Soon` : 'Coming Soon'}
      description="We're working hard to bring you this feature. Stay tuned for updates!"
      className={className}
    />
  );
}

interface SelectionEmptyStateProps {
  itemType?: string;
  className?: string;
}

export function SelectionEmptyState({ itemType = 'item', className }: SelectionEmptyStateProps) {
  return (
    <EmptyState
      variant="no-selection"
      title={`Select a ${itemType}`}
      description={`Choose a ${itemType} from the list to view its details here.`}
      className={className}
    />
  );
}

// ============================================================================
// INLINE EMPTY STATE
// ============================================================================

interface InlineEmptyStateProps {
  message: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineEmptyState({ 
  message, 
  icon: Icon = FolderOpen,
  action,
  className = '',
}: InlineEmptyStateProps) {
  return (
    <div className={`
      flex items-center justify-center gap-3 p-8 
      text-text-muted border border-dashed border-border-subtle rounded-lg
      ${className}
    `}>
      <Icon className="h-5 w-5" />
      <span className="text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium ml-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// CARD EMPTY STATE (for inside cards/panels)
// ============================================================================

interface CardEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  subMessage?: string;
  className?: string;
}

export function CardEmptyState({
  icon: Icon = FolderOpen,
  message,
  subMessage,
  className = '',
}: CardEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
      <div className="h-10 w-10 rounded-lg bg-surface-raised flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text-secondary">{message}</p>
      {subMessage && (
        <p className="text-xs text-text-muted mt-1">{subMessage}</p>
      )}
    </div>
  );
}

// ============================================================================
// TABLE EMPTY STATE (for inside data tables)
// ============================================================================

interface TableEmptyStateProps {
  colSpan: number;
  message?: string;
  icon?: LucideIcon;
  onAction?: () => void;
  actionLabel?: string;
}

export function TableEmptyState({
  colSpan,
  message = 'No data available',
  icon: Icon = Database,
  onAction,
  actionLabel = 'Add Item',
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <Icon className="h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">{message}</p>
          {onAction && (
            <button
              onClick={onAction}
              className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
