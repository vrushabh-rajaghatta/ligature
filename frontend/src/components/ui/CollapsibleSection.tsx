

import { useState, useCallback, ReactNode, useId } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge, BadgeColor } from './Badge';

/**
 * CollapsibleSection - Progressive disclosure component for grouping related content
 * 
 * Use this to reduce visual density by allowing users to expand/collapse
 * sections of content. Great for:
 * - Detail views with many fields
 * - Settings panels with grouped options
 * - Dashboard sections that aren't always needed
 */

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Content to show when expanded */
  children: ReactNode;
  /** Whether the section starts expanded (default: true) */
  defaultExpanded?: boolean;
  /** Optional icon to show before the title */
  icon?: ReactNode;
  /** Optional badge to show after the title */
  badge?: { text: string; color: BadgeColor };
  /** Optional count to display in the header */
  count?: number;
  /** Callback when expand/collapse state changes */
  onToggle?: (expanded: boolean) => void;
  /** Additional class names for the container */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'card' | 'minimal';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to animate the expand/collapse */
  animate?: boolean;
  /** Disable the collapse functionality */
  disabled?: boolean;
  /** Show border around content when expanded */
  bordered?: boolean;
  /** Description text shown below title */
  description?: string;
  /** Action buttons to show in header */
  headerActions?: ReactNode;
}

const sizeStyles = {
  sm: {
    header: 'py-2 px-3',
    title: 'text-sm font-medium',
    description: 'text-xs',
    content: 'p-3',
    icon: 'w-4 h-4',
    chevron: 'w-4 h-4',
  },
  md: {
    header: 'py-3 px-4',
    title: 'text-base font-medium',
    description: 'text-sm',
    content: 'p-4',
    icon: 'w-5 h-5',
    chevron: 'w-5 h-5',
  },
  lg: {
    header: 'py-4 px-5',
    title: 'text-lg font-semibold',
    description: 'text-sm',
    content: 'p-5',
    icon: 'w-6 h-6',
    chevron: 'w-5 h-5',
  },
};

const variantStyles = {
  default: {
    container: 'border border-border rounded-lg overflow-hidden',
    header: 'bg-surface-card hover:bg-surface-card/80',
    content: 'bg-surface',
  },
  card: {
    container: 'bg-surface-elevated rounded-lg border border-border overflow-hidden',
    header: 'hover:bg-surface-card/50',
    content: '',
  },
  minimal: {
    container: '',
    header: 'hover:bg-surface-card rounded-lg',
    content: '',
  },
};

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  icon,
  badge,
  count,
  onToggle,
  className = '',
  variant = 'default',
  size = 'md',
  animate = true,
  disabled = false,
  bordered = false,
  description,
  headerActions,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const headerId = useId();

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newState = !expanded;
    setExpanded(newState);
    onToggle?.(newState);
  }, [expanded, disabled, onToggle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  const styles = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  return (
    <div className={`${variantStyle.container} ${className}`}>
      {/* Header */}
      <div className={`
        w-full flex items-center justify-between gap-3
        ${styles.header}
        ${variantStyle.header}
      `}>
        <button
          id={headerId}
          type="button"
          className={`
            flex items-center gap-3 text-left flex-1 min-w-0
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            transition-colors duration-150
          `}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={expanded}
          aria-controls={contentId}
          disabled={disabled}
        >
          {/* Chevron */}
          <span className={`flex-shrink-0 text-gray-400 ${animate ? 'transition-transform duration-200' : ''} ${expanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className={styles.chevron} />
          </span>

          {/* Icon */}
          {icon && (
            <span className={`flex-shrink-0 text-gray-500 dark:text-gray-400 ${styles?.icon ?? ''}`}>
              {icon}
            </span>
          )}

          {/* Title & Description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`${styles.title} text-gray-900 dark:text-gray-100 truncate`}>
                {title}
              </span>
              {count !== undefined && (
                <span className="flex-shrink-0 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
              {badge && (
                <Badge color={badge.color} size="sm">
                  {badge.text}
                </Badge>
              )}
            </div>
            {description && (
              <p className={`${styles.description} text-gray-500 dark:text-gray-400 mt-0.5 truncate`}>
                {description}
              </p>
            )}
          </div>
        </button>

        {/* Header Actions - Outside button to avoid nested button issues */}
        {headerActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className={`
          ${animate ? 'transition-all duration-200 ease-in-out' : ''}
          ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}
        style={{
          maxHeight: expanded ? '10000px' : '0px',
        }}
      >
        <div className={`
          ${variantStyle.content}
          ${styles.content}
          ${bordered && expanded ? 'border-t border-gray-200 dark:border-gray-700' : ''}
        `}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * CollapsibleSectionGroup - Container for organizing multiple collapsible sections
 * 
 * Provides consistent spacing and optional accordion behavior
 * (only one section open at a time)
 */
export interface CollapsibleSectionGroupProps {
  children: ReactNode;
  /** Only allow one section open at a time */
  accordion?: boolean;
  /** Space between sections */
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CollapsibleSectionGroup({
  children,
  accordion = false,
  gap = 'md',
  className = '',
}: CollapsibleSectionGroupProps) {
  const gapStyles = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
  };

  // Note: accordion behavior would require state management
  // that tracks which section is open - left as future enhancement

  return (
    <div className={`${gapStyles[gap]} ${className}`}>
      {children}
    </div>
  );
}

export default CollapsibleSection;
