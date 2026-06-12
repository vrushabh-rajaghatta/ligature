
/**
 * Skeleton - v115
 * 
 * Shimmer loading placeholders for improved perceived performance.
 * Includes variants for common UI patterns:
 * - Base Skeleton (text, boxes)
 * - StatCardSkeleton
 * - TableSkeleton
 * - CardSkeleton
 * - ListSkeleton
 */

import React from 'react';

interface SkeletonProps {
  /** Width - number (px) or string (e.g., '100%', '12rem') */
  width?: number | string;
  /** Height - number (px) or string */
  height?: number | string;
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Additional CSS classes */
  className?: string;
  /** Animate the shimmer effect */
  animate?: boolean;
}

const ROUNDED_CLASSES = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  animate = true,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }
  
  return (
    <div
      className={`
        bg-surface-card
        ${ROUNDED_CLASSES[rounded]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  );
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

/**
 * StatCard skeleton
 */
export function StatCardSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        bg-surface-card border border-border rounded-xl p-4
        animate-pulse
        ${className}
      `}
    >
      {/* Icon placeholder */}
      <div className="flex items-start justify-between mb-3">
        <Skeleton width={40} height={40} rounded="lg" animate={false} />
        <Skeleton width={60} height={20} rounded="full" animate={false} />
      </div>
      
      {/* Value placeholder */}
      <Skeleton width={80} height={32} rounded="md" className="mb-2" animate={false} />
      
      {/* Label placeholder */}
      <Skeleton width="60%" height={14} rounded="sm" animate={false} />
    </div>
  );
}

/**
 * Multiple StatCards skeleton grid
 */
export function StatCardGridSkeleton({
  count = 4,
  columns = 4,
  className = '',
}: {
  count?: number;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };
  
  return (
    <div className={`grid ${gridClasses[columns]} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      {showHeader && (
        <div className="bg-surface-elevated border-b border-border px-4 py-3 flex gap-4 animate-pulse">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              height={14}
              width={i === 0 ? '25%' : '15%'}
              rounded="sm"
              animate={false}
            />
          ))}
        </div>
      )}
      
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3 flex gap-4 animate-pulse">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                height={16}
                width={colIdx === 0 ? '30%' : colIdx === columns - 1 ? '10%' : '20%'}
                rounded="sm"
                animate={false}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card skeleton (generic content card)
 */
export function CardSkeleton({
  showHeader = true,
  contentLines = 3,
  showFooter = false,
  className = '',
}: {
  showHeader?: boolean;
  contentLines?: number;
  showFooter?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`
        bg-surface-card border border-border rounded-xl overflow-hidden
        animate-pulse
        ${className}
      `}
    >
      {showHeader && (
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <Skeleton width="40%" height={18} rounded="sm" animate={false} />
          <Skeleton width={24} height={24} rounded="md" animate={false} />
        </div>
      )}
      
      <div className="p-4">
        <SkeletonText lines={contentLines} />
      </div>
      
      {showFooter && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <Skeleton width="30%" height={14} rounded="sm" animate={false} />
          <Skeleton width={80} height={32} rounded="md" animate={false} />
        </div>
      )}
    </div>
  );
}

/**
 * List skeleton
 */
export function ListSkeleton({
  items = 5,
  showIcon = true,
  showAction = false,
  className = '',
}: {
  items?: number;
  showIcon?: boolean;
  showAction?: boolean;
  className?: string;
}) {
  return (
    <div className={`divide-y divide-border ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="py-3 flex items-center gap-3 animate-pulse">
          {showIcon && (
            <Skeleton width={36} height={36} rounded="lg" animate={false} />
          )}
          
          <div className="flex-1 space-y-1.5">
            <Skeleton width="60%" height={16} rounded="sm" animate={false} />
            <Skeleton width="40%" height={12} rounded="sm" animate={false} />
          </div>
          
          {showAction && (
            <Skeleton width={60} height={28} rounded="md" animate={false} />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Detail panel skeleton (for right panels, modals)
 */
export function DetailPanelSkeleton({
  showHeader = true,
  sections = 3,
  className = '',
}: {
  showHeader?: boolean;
  sections?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      {showHeader && (
        <div className="animate-pulse">
          <Skeleton width="70%" height={24} rounded="md" className="mb-2" animate={false} />
          <Skeleton width="40%" height={14} rounded="sm" animate={false} />
        </div>
      )}
      
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <Skeleton width="30%" height={14} rounded="sm" className="mb-3" animate={false} />
          <div className="space-y-2">
            <Skeleton width="100%" height={16} rounded="sm" animate={false} />
            <Skeleton width="85%" height={16} rounded="sm" animate={false} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Avatar skeleton
 */
export function AvatarSkeleton({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      rounded="full"
      className={className}
    />
  );
}

/**
 * Badge skeleton
 */
export function BadgeSkeleton({
  width = 60,
  className = '',
}: {
  width?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={width}
      height={20}
      rounded="full"
      className={className}
    />
  );
}

/**
 * Button skeleton
 */
export function ButtonSkeleton({
  width = 100,
  size = 'md',
  className = '',
}: {
  width?: number | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const heights = {
    sm: 28,
    md: 36,
    lg: 44,
  };
  
  return (
    <Skeleton
      width={width}
      height={heights[size]}
      rounded="lg"
      className={className}
    />
  );
}

export default Skeleton;
