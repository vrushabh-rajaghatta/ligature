// ============================================================================
// Responsive Layout Components - v141
// Adaptive layout containers for mobile-first design
// ============================================================================


import React, { ReactNode, createContext, useContext } from 'react';
import { useResponsive, useIsMobile, useIsTablet, Breakpoint } from '@/hooks/useResponsive';

// ============================================
// Responsive Context
// ============================================

interface ResponsiveContextValue {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  compactMode: boolean;
}

const ResponsiveContext = createContext<ResponsiveContextValue | null>(null);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const responsive = useResponsive();
  
  return (
    <ResponsiveContext.Provider value={responsive}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveContext(): ResponsiveContextValue {
  const context = useContext(ResponsiveContext);
  if (!context) {
    // Return defaults if not in provider (SSR or tests)
    return {
      breakpoint: 'lg',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      compactMode: false,
    };
  }
  return context;
}

// ============================================
// Show/Hide Components
// ============================================

interface ShowProps {
  children: ReactNode;
  above?: Breakpoint;
  below?: Breakpoint;
  at?: Breakpoint | Breakpoint[];
  fallback?: ReactNode;
}

/**
 * Conditionally show content based on breakpoint
 */
export function Show({ children, above, below, at, fallback = null }: ShowProps) {
  const { breakpoint } = useResponsive();
  
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  let shouldShow = true;
  
  if (above) {
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldShow = shouldShow && currentIndex > aboveIndex;
  }
  
  if (below) {
    const belowIndex = breakpointOrder.indexOf(below);
    shouldShow = shouldShow && currentIndex < belowIndex;
  }
  
  if (at) {
    const atBreakpoints = Array.isArray(at) ? at : [at];
    shouldShow = shouldShow && atBreakpoints.includes(breakpoint);
  }
  
  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show only on mobile (xs, sm)
 */
export function MobileOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show only on tablet (md)
 */
export function TabletOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isTablet = useIsTablet();
  return isTablet ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show only on desktop (lg+)
 */
export function DesktopOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isDesktop } = useResponsive();
  return isDesktop ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hide on mobile
 */
export function HideOnMobile({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? null : <>{children}</>;
}

/**
 * Hide on desktop
 */
export function HideOnDesktop({ children }: { children: ReactNode }) {
  const { isDesktop } = useResponsive();
  return isDesktop ? null : <>{children}</>;
}

// ============================================
// Responsive Grid
// ============================================

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

/**
 * Responsive grid with breakpoint-based columns
 */
export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: 3, md: 4, lg: 6 },
  className = '',
}: ResponsiveGridProps) {
  // Build Tailwind classes
  const colClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(' ');
  
  const gapClasses = [
    gap.xs && `gap-${gap.xs}`,
    gap.sm && `sm:gap-${gap.sm}`,
    gap.md && `md:gap-${gap.md}`,
    gap.lg && `lg:gap-${gap.lg}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`grid ${colClasses} ${gapClasses} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Responsive Stack
// ============================================

interface ResponsiveStackProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  reverseOnMobile?: boolean;
  gap?: number;
  className?: string;
}

/**
 * Flex stack that can reverse direction on mobile
 */
export function ResponsiveStack({
  children,
  direction = 'row',
  reverseOnMobile = false,
  gap = 4,
  className = '',
}: ResponsiveStackProps) {
  const baseDirection = direction === 'row' ? 'flex-col md:flex-row' : 'flex-row md:flex-col';
  const reverseClass = reverseOnMobile ? 'flex-col-reverse md:flex-row' : '';
  
  return (
    <div className={`flex ${reverseClass || baseDirection} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Responsive Container
// ============================================

interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

/**
 * Responsive container with adaptive padding
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'full',
  padding = { xs: 4, md: 6 },
  className = '',
}: ResponsiveContainerProps) {
  const paddingClasses = [
    padding.xs && `p-${padding.xs}`,
    padding.sm && `sm:p-${padding.sm}`,
    padding.md && `md:p-${padding.md}`,
    padding.lg && `lg:p-${padding.lg}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Responsive Split View
// ============================================

interface ResponsiveSplitProps {
  children: [ReactNode, ReactNode];
  sidebar: 'left' | 'right';
  sidebarWidth?: {
    collapsed?: number;
    expanded?: number;
    mobile?: 'full' | 'sheet';
  };
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * Split view that adapts to mobile (stacked or sheet)
 */
export function ResponsiveSplit({
  children,
  sidebar = 'left',
  sidebarWidth = { collapsed: 16, expanded: 72, mobile: 'full' },
  className = '',
}: ResponsiveSplitProps) {
  const isMobile = useIsMobile();
  const [sidebarContent, mainContent] = sidebar === 'left' ? children : [children[1], children[0]];
  
  if (isMobile) {
    // On mobile, stack vertically or handle via sheet
    return (
      <div className={`flex flex-col ${className}`}>
        {mainContent}
      </div>
    );
  }
  
  // Desktop: side-by-side
  return (
    <div className={`flex ${className}`}>
      {sidebar === 'left' && (
        <div className={`w-${sidebarWidth.expanded} flex-shrink-0`}>
          {sidebarContent}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {mainContent}
      </div>
      {sidebar === 'right' && (
        <div className={`w-${sidebarWidth.expanded} flex-shrink-0`}>
          {sidebarContent}
        </div>
      )}
    </div>
  );
}

// ============================================
// Responsive Stat Grid
// ============================================

interface ResponsiveStatGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Stat card grid that adapts from 4 cols → 2 cols → 1 col
 */
export function ResponsiveStatGrid({ children, className = '' }: ResponsiveStatGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Responsive Two Column Layout
// ============================================

interface ResponsiveTwoColumnProps {
  children: [ReactNode, ReactNode];
  ratio?: '8-4' | '7-5' | '6-6' | '9-3';
  stackOnTablet?: boolean;
  reverseOnMobile?: boolean;
  gap?: number;
  className?: string;
}

const ratioClasses = {
  '8-4': ['lg:col-span-8', 'lg:col-span-4'],
  '7-5': ['lg:col-span-7', 'lg:col-span-5'],
  '6-6': ['lg:col-span-6', 'lg:col-span-6'],
  '9-3': ['lg:col-span-9', 'lg:col-span-3'],
};

/**
 * Two column layout that stacks on mobile
 */
export function ResponsiveTwoColumn({
  children,
  ratio = '8-4',
  stackOnTablet = true,
  reverseOnMobile = false,
  gap = 6,
  className = '',
}: ResponsiveTwoColumnProps) {
  const [left, right] = children;
  const [leftClass, rightClass] = ratioClasses[ratio];
  
  const breakpointClass = stackOnTablet ? 'lg:grid-cols-12' : 'md:grid-cols-12';
  const orderClass = reverseOnMobile ? 'flex flex-col-reverse' : '';
  
  return (
    <div className={`grid grid-cols-1 ${breakpointClass} gap-${gap} ${orderClass} ${className}`}>
      <div className={`col-span-1 ${leftClass}`}>
        {left}
      </div>
      <div className={`col-span-1 ${rightClass}`}>
        {right}
      </div>
    </div>
  );
}

// ============================================
// Responsive Table Wrapper
// ============================================

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper that adds horizontal scroll on mobile
 */
export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`overflow-x-auto -mx-4 md:mx-0 ${className}`}>
      <div className="min-w-max md:min-w-0 px-4 md:px-0">
        {children}
      </div>
    </div>
  );
}

// ============================================
// Mobile Sheet
// ============================================

interface MobileSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right' | 'bottom';
  className?: string;
}

/**
 * Slide-in sheet for mobile navigation/panels
 */
export function MobileSheet({
  children,
  isOpen,
  onClose,
  title,
  side = 'left',
  className = '',
}: MobileSheetProps) {
  if (!isOpen) return null;
  
  const sideClasses = {
    left: 'left-0 top-0 h-full w-80 max-w-[85vw] animate-slide-in-left',
    right: 'right-0 top-0 h-full w-80 max-w-[85vw] animate-slide-in-right',
    bottom: 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-xl animate-fade-in-up',
  };
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className={`absolute bg-surface-elevated border-border ${sideClasses[side]} ${className}`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export {
  ResponsiveContext,
};
