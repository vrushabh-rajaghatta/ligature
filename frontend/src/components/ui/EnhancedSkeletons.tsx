// ============================================================================
// Enhanced Loading Skeletons - v143: Final Polish
// Polished skeleton components with shimmer effects and micro-interactions
// ============================================================================


import React from 'react';

// ============================================================================
// BASE SKELETON COMPONENT
// ============================================================================

interface SkeletonBaseProps {
  className?: string;
  animate?: boolean;
  variant?: 'pulse' | 'shimmer' | 'wave';
  style?: React.CSSProperties;
}

export function SkeletonBase({ 
  className = '', 
  animate = true,
  variant = 'shimmer',
  style,
}: SkeletonBaseProps) {
  const animationClass = animate ? getAnimationClass(variant) : '';
  
  return (
    <div 
      className={`bg-surface-raised rounded ${animationClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function getAnimationClass(variant: SkeletonBaseProps['variant']): string {
  switch (variant) {
    case 'pulse':
      return 'animate-pulse';
    case 'shimmer':
      return 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent';
    case 'wave':
      return 'animate-[wave_1.5s_ease-in-out_infinite]';
    default:
      return 'animate-pulse';
  }
}

// ============================================================================
// TEXT SKELETONS
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: 'full' | '3/4' | '1/2' | '1/4';
  className?: string;
}

export function SkeletonText({ 
  lines = 3, 
  lastLineWidth = '3/4',
  className = '',
}: SkeletonTextProps) {
  const widthClass = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={`h-4 ${i === lines - 1 ? widthClass[lastLineWidth] : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonHeading({ className = '' }: { className?: string }) {
  return <SkeletonBase className={`h-6 w-48 ${className}`} />;
}

export function SkeletonParagraph({ className = '' }: { className?: string }) {
  return <SkeletonText lines={4} lastLineWidth="1/2" className={className} />;
}

// ============================================================================
// CARD SKELETONS
// ============================================================================

interface SkeletonCardProps {
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonCard({ 
  hasImage = false, 
  hasActions = false,
  className = '',
}: SkeletonCardProps) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle overflow-hidden ${className}`}>
      {hasImage && (
        <SkeletonBase className="h-40 w-full rounded-none" />
      )}
      <div className="p-4 space-y-3">
        <SkeletonBase className="h-5 w-3/4" />
        <SkeletonText lines={2} lastLineWidth="1/2" />
        {hasActions && (
          <div className="flex gap-2 pt-2">
            <SkeletonBase className="h-8 w-20 rounded-md" />
            <SkeletonBase className="h-8 w-20 rounded-md" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonCardCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonBase className="h-10 w-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIST SKELETONS
// ============================================================================

interface SkeletonListProps {
  items?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

export function SkeletonList({
  items = 5,
  hasAvatar = false,
  hasAction = false,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} hasAvatar={hasAvatar} hasAction={hasAction} />
      ))}
    </div>
  );
}

interface SkeletonListItemProps {
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

export function SkeletonListItem({
  hasAvatar = false,
  hasAction = false,
  className = '',
}: SkeletonListItemProps) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-surface-raised rounded-lg ${className}`}>
      {hasAvatar && (
        <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
      )}
      <div className="flex-1 space-y-1.5">
        <SkeletonBase className="h-4 w-3/4" />
        <SkeletonBase className="h-3 w-1/2" />
      </div>
      {hasAction && (
        <SkeletonBase className="h-8 w-8 rounded-md flex-shrink-0" />
      )}
    </div>
  );
}

// ============================================================================
// TABLE SKELETONS
// ============================================================================

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  hasHeader?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  hasHeader = true,
  className = '',
}: SkeletonTableProps) {
  return (
    <div className={`rounded-lg ring-1 ring-border-subtle overflow-hidden ${className}`}>
      <table className="w-full">
        {hasHeader && (
          <thead>
            <tr className="bg-surface-raised border-b border-border-subtle">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border-subtle last:border-0">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <SkeletonBase 
                    className={`h-4 ${colIndex === 0 ? 'w-32' : colIndex === cols - 1 ? 'w-16' : 'w-24'}`} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// FORM SKELETONS
// ============================================================================

export function SkeletonInput({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <SkeletonBase className="h-4 w-20" />
      <SkeletonBase className="h-10 w-full rounded-md" />
    </div>
  );
}

export function SkeletonTextarea({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <SkeletonBase className="h-4 w-20" />
      <SkeletonBase className="h-24 w-full rounded-md" />
    </div>
  );
}

export function SkeletonSelect({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <SkeletonBase className="h-4 w-20" />
      <SkeletonBase className="h-10 w-full rounded-md" />
    </div>
  );
}

export function SkeletonForm({ fields = 4, className = '' }: { fields?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonInput key={i} />
      ))}
      <div className="flex gap-3 pt-2">
        <SkeletonBase className="h-10 w-24 rounded-md" />
        <SkeletonBase className="h-10 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ============================================================================
// CHART SKELETONS
// ============================================================================

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase className="h-5 w-32" />
        <div className="flex gap-2">
          <SkeletonBase className="h-6 w-16 rounded-full" />
          <SkeletonBase className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonBase 
            key={i} 
            className={`flex-1 rounded-t`}
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBase key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonLineChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase className="h-5 w-40" />
        <SkeletonBase className="h-8 w-24 rounded-md" />
      </div>
      <div className="h-48 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBase key={i} className="h-3 w-6" />
          ))}
        </div>
        {/* Chart area */}
        <div className="ml-10 h-full flex items-end">
          <SkeletonBase className="h-full w-full rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPieChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle p-4 ${className}`}>
      <SkeletonBase className="h-5 w-32 mb-4" />
      <div className="flex items-center gap-6">
        <SkeletonBase className="h-40 w-40 rounded-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBase className="h-3 w-3 rounded-full" />
              <SkeletonBase className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD SKELETONS
// ============================================================================

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-raised rounded-lg ring-1 ring-border-subtle p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-8 w-16" />
        </div>
        <SkeletonBase className="h-10 w-10 rounded-lg" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <SkeletonBase className="h-4 w-12" />
        <SkeletonBase className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonStatGrid({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// AVATAR & PROFILE SKELETONS
// ============================================================================

export function SkeletonAvatar({ 
  size = 'md',
  className = '',
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  return <SkeletonBase className={`${sizeClasses[size]} rounded-full ${className}`} />;
}

export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SkeletonAvatar size="lg" />
      <div className="space-y-1.5">
        <SkeletonBase className="h-5 w-32" />
        <SkeletonBase className="h-4 w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR SKELETONS
// ============================================================================

export function SkeletonSidebar({ className = '' }: { className?: string }) {
  return (
    <div className={`w-64 bg-surface p-4 space-y-4 ${className}`}>
      <SkeletonProfile />
      <div className="space-y-1 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <SkeletonBase className="h-5 w-5 rounded" />
            <SkeletonBase className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBAR SKELETONS
// ============================================================================

export function SkeletonToolbar({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between p-3 bg-surface-raised rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-9 w-32 rounded-md" />
        <SkeletonBase className="h-9 w-24 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-9 w-9 rounded-md" />
        <SkeletonBase className="h-9 w-9 rounded-md" />
        <SkeletonBase className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT SKELETONS
// ============================================================================

export function SkeletonDocument({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-8 space-y-6 ${className}`}>
      {/* Title */}
      <SkeletonBase className="h-8 w-2/3" />
      
      {/* Metadata */}
      <div className="flex gap-4">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-4 w-32" />
        <SkeletonBase className="h-4 w-20" />
      </div>
      
      {/* Section 1 */}
      <div className="space-y-3">
        <SkeletonBase className="h-6 w-48" />
        <SkeletonText lines={4} />
      </div>
      
      {/* Section 2 */}
      <div className="space-y-3">
        <SkeletonBase className="h-6 w-56" />
        <SkeletonText lines={3} lastLineWidth="3/4" />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={3} cols={3} />
      
      {/* Section 3 */}
      <div className="space-y-3">
        <SkeletonBase className="h-6 w-40" />
        <SkeletonText lines={5} lastLineWidth="1/2" />
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE SKELETONS
// ============================================================================

export function SkeletonTimeline({ items = 4, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-0 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <SkeletonBase className="h-3 w-3 rounded-full" />
            {i < items - 1 && <div className="w-0.5 flex-1 bg-surface-raised" />}
          </div>
          {/* Content */}
          <div className="flex-1 pb-6">
            <SkeletonBase className="h-4 w-32 mb-1" />
            <SkeletonBase className="h-3 w-48 mb-2" />
            <SkeletonBase className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMMENT SKELETONS
// ============================================================================

export function SkeletonComment({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-3 w-16" />
        </div>
        <SkeletonText lines={2} lastLineWidth="3/4" />
      </div>
    </div>
  );
}

export function SkeletonCommentList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComment key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// BADGE SKELETONS
// ============================================================================

export function SkeletonBadge({ className = '' }: { className?: string }) {
  return <SkeletonBase className={`h-5 w-16 rounded-full ${className}`} />;
}

export function SkeletonBadgeGroup({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBadge key={i} />
      ))}
    </div>
  );
}
