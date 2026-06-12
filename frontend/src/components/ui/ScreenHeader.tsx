// =============================================================================
// SCREEN HEADER - Standardized page header for all module screens
// =============================================================================
// v0.48.0 - UI Consistency Pass
//
// Provides a consistent header bar across all 50+ module screens.
// Replaces ad-hoc h1 + subtitle + button patterns with a single component
// that handles title, subtitle, icon, breadcrumb, badge, and action slot.
//
// Usage:
//   <ScreenHeader
//     title="Signal Detection Dashboard"
//     subtitle="Quantitative disproportionality analysis"
//     icon={<Activity className="w-5 h-5" />}
//     badge={{ label: "12 Active", color: "blue" }}
//     actions={<Button variant="primary">New Signal</Button>}
//   />
// =============================================================================


import { type ReactNode } from 'react';
import { ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { useProductFilter } from '@/hooks/useProductFilter';

interface ScreenHeaderProps {
  /** Module title — rendered as h1 */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional icon (left of title) */
  icon?: ReactNode;
  /** Optional badge next to title */
  badge?: { label: string; color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' };
  /** Action buttons (right side) */
  actions?: ReactNode;
  /** Optional module ID for ViewOnlyBanner integration */
  moduleId?: string;
  /** Extra content below the header line (e.g., tab bar, filters) */
  children?: ReactNode;
  /** Override max-width container class */
  maxWidth?: string;
  /** Compact mode - smaller title, tighter spacing */
  compact?: boolean;
  /**
   * v0.126.15: Asset context chip.
   * true  = always show chip (even "All Assets" state)
   * false = never show chip
   * undefined (default) = show only when a product filter is active
   */
  showAssetContext?: boolean;
}

const BADGE_COLORS = {
  blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  green: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  red: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  purple: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  slate: 'bg-surface-card text-text-muted border-border',
};

export function ScreenHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  moduleId,
  children,
  maxWidth,
  compact = false,
  showAssetContext,
}: ScreenHeaderProps) {
  const { selectedProduct, isFiltered } = useProductFilter();

  // Determine whether to render the chip:
  // showAssetContext=true → always; false → never; undefined → only when filtered
  const showChip =
    showAssetContext === true
      ? true
      : showAssetContext === false
      ? false
      : isFiltered && !!selectedProduct;

  return (
    <div className="flex-shrink-0">
      {/* ViewOnlyBanner if moduleId provided */}
      {moduleId && <ViewOnlyBanner moduleId={moduleId} />}

      {/* Header content */}
      <div className={`px-4 md:px-6 pt-3 md:pt-4 pb-3 md:pb-4 ${maxWidth ? maxWidth : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Icon + Title + Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="flex-shrink-0 text-text-muted">
                  {icon}
                </div>
              )}
              <h1 className={`${compact ? 'text-xl' : 'text-xl sm:text-2xl'} font-semibold text-text-primary truncate`}>
                {title}
              </h1>
              {badge && (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${BADGE_COLORS[badge.color ?? 'slate']}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-text-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* v0.126.15: Asset context chip — renders below title when a product filter is active */}
        {showChip && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-text-muted">Viewing:</span>
            {isFiltered && selectedProduct ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs font-medium text-accent-blue">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue inline-block flex-shrink-0" />
                {selectedProduct.name}
                {selectedProduct.brandName ? ` · ${selectedProduct.brandName}` : ''}
                {selectedProduct.indication ? ` · ${selectedProduct.indication}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card border border-border text-xs text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted inline-block flex-shrink-0" />
                All Assets
              </span>
            )}
          </div>
        )}

        {/* Optional children (tabs, filters, etc.) */}
        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ScreenBody — standardized content wrapper below ScreenHeader.
 * Provides consistent padding and overflow scrolling.
 */
export function ScreenBody({
  children,
  maxWidth,
  noPadding = false,
  className = '',
}: {
  children: ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex-1 overflow-auto ${noPadding ? '' : 'px-4 md:px-6 pb-6'} ${className}`}>
      {maxWidth ? (
        <div className={maxWidth}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
