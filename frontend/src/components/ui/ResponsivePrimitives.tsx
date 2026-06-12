// =============================================================================
// RESPONSIVE PRIMITIVES — v0.43.9
// =============================================================================
// Reusable responsive building blocks to replace hard-coded layouts across
// all 72 screen components. Drop-in replacements for common patterns:
//
//   PageContent    — replaces `<div className="p-6 space-y-6">`
//   PageHeader     — replaces `<div className="flex items-center justify-between">`
//   ModuleToolbar  — replaces the h-14 tab-bar + action-buttons pattern
//   ContentGrid    — replaces `<div className="grid grid-cols-12 gap-6">`
//   ActionBar      — replaces inline button rows that overflow on mobile
//
// MIGRATION: Each component is a strict superset of the old pattern it
// replaces, so screens can be converted one-at-a-time without regressions.
// =============================================================================


import React, { ReactNode } from 'react';

// =============================================================================
// PAGE CONTENT — responsive padding wrapper
// =============================================================================
// Before: <div className="p-6 space-y-6">
// After:  <PageContent>
// =============================================================================

interface PageContentProps {
  children: ReactNode;
  /** Remove vertical spacing between children */
  noGap?: boolean;
  /** Maximum content width */
  maxWidth?: 'none' | 'lg' | 'xl' | '7xl';
  className?: string;
}

const maxWidthMap = {
  none: '',
  lg: 'max-w-screen-lg mx-auto',
  xl: 'max-w-screen-xl mx-auto',
  '7xl': 'max-w-7xl mx-auto',
};

export function PageContent({
  children,
  noGap = false,
  maxWidth = 'none',
  className = '',
}: PageContentProps) {
  return (
    <div className={`p-4 sm:p-5 md:p-6 ${noGap ? '' : 'space-y-4 sm:space-y-5 md:space-y-6'} ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// PAGE HEADER — title + description + action buttons
// =============================================================================
// Before: <div className="flex items-center justify-between mb-6">
//           <div><h1>...</h1><p>...</p></div>
//           <div className="flex gap-2"><button>...</button></div>
//         </div>
//
// After:  <PageHeader
//           title="Clinical Development"
//           description="Programs, trials, sites"
//           actions={<><Button>New</Button></>}
//         />
// =============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Icon element to show before the title */
  icon?: ReactNode;
  /** Action buttons — right-aligned on desktop, wrapped below on mobile */
  actions?: ReactNode;
  /** Additional content below title row (badges, breadcrumbs, etc) */
  meta?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  meta,
  className = '',
  children,
}: PageHeaderProps) {
  return (
    <div className={`${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        {/* Title block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary truncate">{title}</h1>
          </div>
          {description && (
            <p className="text-sm text-text-muted mt-1 line-clamp-2">{description}</p>
          )}
          {meta && <div className="mt-2">{meta}</div>}
        </div>

        {/* Actions — wraps under title on narrow screens */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// MODULE TOOLBAR — the h-14 sticky tab/button bar + right-side actions
// =============================================================================
// Before: <div className="h-14 border-b border-border bg-surface-elevated
//           flex items-center px-4 gap-4">
//           <div className="flex items-center gap-1">...tabs...</div>
//           <div className="flex-1" />
//           <button>New</button>
//         </div>
//
// After:  <ModuleToolbar actions={<Button>New</Button>}>
//           ...tab buttons...
//         </ModuleToolbar>
// =============================================================================

interface ModuleToolbarProps {
  /** Tab buttons or navigation items (will scroll horizontally) */
  children: ReactNode;
  /** Right-side action buttons (pinned, won't scroll) */
  actions?: ReactNode;
  /** Sticky positioning */
  sticky?: boolean;
  className?: string;
}

export function ModuleToolbar({
  children,
  actions,
  sticky = false,
  className = '',
}: ModuleToolbarProps) {
  return (
    <div
      className={`
        min-h-[3.5rem] border-b border-border bg-surface-elevated
        flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3
        ${sticky ? 'sticky top-0 z-10' : ''}
        ${className}
      `}
    >
      {/* Scrollable tab area */}
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max py-2">
          {children}
        </div>
      </div>

      {/* Pinned actions — always visible */}
      {actions && (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2 border-l border-border/50 ml-1">
          {actions}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONTENT GRID — responsive 12-column grid with standard ratios
// =============================================================================
// Before: <div className="grid grid-cols-12 gap-6">
//           <div className="col-span-8">main</div>
//           <div className="col-span-4">sidebar</div>
//         </div>
//
// After:  <ContentGrid ratio="8-4">
//           <div>main</div>
//           <div>sidebar</div>
//         </ContentGrid>
// =============================================================================

interface ContentGridProps {
  children: [ReactNode, ReactNode];
  /** Column ratio — stacks on mobile, splits at lg breakpoint */
  ratio?: '8-4' | '7-5' | '6-6' | '9-3' | '5-7' | '4-8' | '3-9';
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
  /** Stack at md instead of lg */
  stackLater?: boolean;
  /** Reverse order on mobile (show sidebar first) */
  reverseOnMobile?: boolean;
  className?: string;
}

const ratioStyles: Record<string, [string, string]> = {
  '8-4': ['lg:col-span-8', 'lg:col-span-4'],
  '7-5': ['lg:col-span-7', 'lg:col-span-5'],
  '6-6': ['lg:col-span-6', 'lg:col-span-6'],
  '9-3': ['lg:col-span-9', 'lg:col-span-3'],
  '5-7': ['lg:col-span-5', 'lg:col-span-7'],
  '4-8': ['lg:col-span-4', 'lg:col-span-8'],
  '3-9': ['lg:col-span-3', 'lg:col-span-9'],
};

const gapStyles = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 lg:gap-6',
  lg: 'gap-4 lg:gap-8',
};

export function ContentGrid({
  children,
  ratio = '8-4',
  gap = 'md',
  stackLater = false,
  reverseOnMobile = false,
  className = '',
}: ContentGridProps) {
  const [left, right] = children;
  const [leftCols, rightCols] = ratioStyles[ratio] || ratioStyles['8-4'];
  const breakpoint = stackLater ? 'md:grid-cols-12' : 'lg:grid-cols-12';

  return (
    <div className={`grid grid-cols-1 ${breakpoint} ${gapStyles[gap]} ${className}`}>
      <div className={`col-span-1 ${leftCols} ${reverseOnMobile ? 'order-2 lg:order-1' : ''}`}>
        {left}
      </div>
      <div className={`col-span-1 ${rightCols} ${reverseOnMobile ? 'order-1 lg:order-2' : ''}`}>
        {right}
      </div>
    </div>
  );
}

// =============================================================================
// STAT GRID — responsive stat-card grid (replaces hard grid-cols-N)
// =============================================================================
// Before: <div className="grid grid-cols-6 gap-4 mb-6">
// After:  <StatGrid cols={6}>
// =============================================================================

interface StatGridProps {
  children: ReactNode;
  /** Number of columns at max width (will adapt at smaller breakpoints) */
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const statGridStyles: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function StatGrid({
  children,
  cols = 4,
  className = '',
}: StatGridProps) {
  return (
    <div className={`grid ${statGridStyles[cols] || statGridStyles[4]} gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// ACTION BAR — responsive button row
// =============================================================================
// Before: <div className="flex items-center gap-2">
//           <Button>Export</Button><Button>New</Button>
//         </div>
//
// After:  <ActionBar><Button>Export</Button><Button>New</Button></ActionBar>
// =============================================================================

interface ActionBarProps {
  children: ReactNode;
  /** Alignment */
  align?: 'left' | 'right' | 'between';
  className?: string;
}

export function ActionBar({
  children,
  align = 'right',
  className = '',
}: ActionBarProps) {
  const alignClass =
    align === 'left' ? 'justify-start' :
    align === 'right' ? 'justify-end' :
    'justify-between';

  return (
    <div className={`flex items-center flex-wrap gap-2 sm:gap-3 ${alignClass} ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// WORKSPACE LAYOUT — sidebar + main content (for TMF, Authoring, eCTD, etc.)
// =============================================================================
// Before: <div className="flex h-full">
//           <div className="w-72 border-r">sidebar</div>
//           <div className="flex-1">content</div>
//         </div>
//
// After:  <WorkspaceLayout
//           sidebar={<div>tree</div>}
//           sidebarWidth={72}
//         >
//           content
//         </WorkspaceLayout>
// =============================================================================

interface WorkspaceLayoutProps {
  children: ReactNode;
  /** Sidebar content */
  sidebar: ReactNode;
  /** Right panel content */
  rightPanel?: ReactNode;
  /** Sidebar width class number (e.g. 72 → w-72) */
  sidebarWidth?: 64 | 72 | 80 | 96;
  /** Right panel width class number */
  rightPanelWidth?: 64 | 72 | 80 | 96;
  /** Mobile: show sidebar as sheet overlay */
  mobileSidebarOpen?: boolean;
  /** Mobile: toggle sidebar */
  onToggleMobileSidebar?: () => void;
  /** Sidebar label for mobile sheet */
  sidebarTitle?: string;
  className?: string;
}

const widthClasses: Record<number, string> = {
  64: 'w-64',
  72: 'w-72',
  80: 'w-80',
  96: 'w-96',
};

export function WorkspaceLayout({
  children,
  sidebar,
  rightPanel,
  sidebarWidth = 72,
  rightPanelWidth = 72,
  mobileSidebarOpen = false,
  onToggleMobileSidebar,
  sidebarTitle,
  className = '',
}: WorkspaceLayoutProps) {
  return (
    <div className={`flex h-full overflow-hidden ${className}`}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className={`hidden lg:flex flex-col ${widthClasses[sidebarWidth]} border-r border-border flex-shrink-0 overflow-auto`}>
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onToggleMobileSidebar}
          />
          <div className={`absolute left-0 top-0 h-full ${widthClasses[sidebarWidth]} max-w-[85vw] bg-surface-elevated border-r border-border overflow-auto animate-slide-in-left`}>
            {sidebarTitle && (
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">{sidebarTitle}</h2>
                <button
                  onClick={onToggleMobileSidebar}
                  className="p-1.5 hover:bg-surface-card rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-auto flex flex-col">
        {children}
      </div>

      {/* Right panel — hidden on mobile/tablet */}
      {rightPanel && (
        <div className={`hidden xl:flex flex-col ${widthClasses[rightPanelWidth]} border-l border-border flex-shrink-0 overflow-auto`}>
          {rightPanel}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  PageContent,
  PageHeader,
  ModuleToolbar,
  ContentGrid,
  StatGrid,
  ActionBar,
  WorkspaceLayout,
};
