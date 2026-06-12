

import { useState, useCallback, ReactNode, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ShowMore - Progressive disclosure component for lists
 * 
 * Shows a limited number of items initially with an option to reveal more.
 * Great for:
 * - Long lists that would overwhelm the user
 * - Activity feeds with many entries
 * - Search results with pagination alternative
 * - Tag/badge collections
 */

export interface ShowMoreProps<T> {
  /** Array of items to display */
  items: T[];
  /** Number of items to show initially (default: 5) */
  initialCount?: number;
  /** Function to render each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** If total items exceed this, show "Show All" option (default: 20) */
  showAllThreshold?: number;
  /** Label for the "show more" button */
  moreLabel?: string;
  /** Label for the "show less" button */
  lessLabel?: string;
  /** Additional class names for the container */
  className?: string;
  /** Whether to animate the reveal */
  animate?: boolean;
  /** Direction of list (affects animation) */
  direction?: 'vertical' | 'horizontal';
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Callback when show more/less is clicked */
  onToggle?: (showing: 'initial' | 'all') => void;
  /** Custom empty state */
  emptyState?: ReactNode;
  /** Show count in button */
  showCount?: boolean;
}

const gapStyles = {
  none: '',
  sm: 'gap-1',
  md: 'gap-2',
  lg: 'gap-4',
};

export function ShowMore<T>({
  items,
  initialCount = 5,
  renderItem,
  showAllThreshold = 20,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  className = '',
  animate = true,
  direction = 'vertical',
  gap = 'md',
  onToggle,
  emptyState,
  showCount = true,
}: ShowMoreProps<T>) {
  const [showAll, setShowAll] = useState(false);

  const displayedItems = useMemo(() => {
    if (showAll || items.length <= initialCount) {
      return items;
    }
    return items.slice(0, initialCount);
  }, [items, initialCount, showAll]);

  const remainingCount = items.length - initialCount;
  const hasMore = items.length > initialCount;
  const exceedsThreshold = items.length > showAllThreshold;

  const handleToggle = useCallback(() => {
    const newState = !showAll;
    setShowAll(newState);
    onToggle?.(newState ? 'all' : 'initial');
  }, [showAll, onToggle]);

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const containerClass = direction === 'vertical' 
    ? `flex flex-col ${gapStyles[gap]}`
    : `flex flex-wrap ${gapStyles[gap]}`;

  return (
    <div className={className}>
      <div className={`${containerClass} ${animate ? 'transition-all duration-200' : ''}`}>
        {displayedItems.map((item, index) => (
          <div 
            key={index}
            className={animate ? 'transition-opacity duration-200' : ''}
            style={{
              opacity: 1,
              animation: animate && showAll && index >= initialCount 
                ? `fadeIn 0.2s ease-out ${(index - initialCount) * 0.05}s both` 
                : undefined,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-150"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>{lessLabel}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>
                {moreLabel}
                {showCount && remainingCount > 0 && ` (${remainingCount})`}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * ShowMoreText - Simplified ShowMore for truncating text content
 */
export interface ShowMoreTextProps {
  /** Text content to display */
  text: string;
  /** Maximum characters to show initially */
  maxLength?: number;
  /** Additional class names */
  className?: string;
  /** Show more label */
  moreLabel?: string;
  /** Show less label */
  lessLabel?: string;
}

export function ShowMoreText({
  text,
  maxLength = 200,
  className = '',
  moreLabel = 'Read more',
  lessLabel = 'Show less',
}: ShowMoreTextProps) {
  const [expanded, setExpanded] = useState(false);
  
  const shouldTruncate = text.length > maxLength;
  const displayText = expanded || !shouldTruncate 
    ? text 
    : text.slice(0, maxLength).trim() + '...';

  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {displayText}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
      >
        {expanded ? lessLabel : moreLabel}
      </button>
    </span>
  );
}

/**
 * ShowMoreGrid - ShowMore optimized for grid layouts
 */
export interface ShowMoreGridProps<T> {
  items: T[];
  initialRows?: number;
  columns?: number;
  renderItem: (item: T, index: number) => ReactNode;
  moreLabel?: string;
  lessLabel?: string;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

const gridGapStyles = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export function ShowMoreGrid<T>({
  items,
  initialRows = 2,
  columns = 3,
  renderItem,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  className = '',
  gap = 'md',
}: ShowMoreGridProps<T>) {
  const [showAll, setShowAll] = useState(false);
  
  const initialCount = initialRows * columns;
  const displayedItems = showAll ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;
  const remainingCount = items.length - initialCount;

  return (
    <div className={className}>
      <div 
        className={`grid ${gridGapStyles[gap]}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {displayedItems.map((item, index) => (
          <div key={index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="
              inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
              text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
              bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
              rounded-lg transition-colors duration-150
            "
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>{lessLabel}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>{moreLabel} ({remainingCount})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ShowMore;
