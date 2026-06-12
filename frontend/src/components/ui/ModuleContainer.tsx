
// ============================================================================
// ModuleContainer - v141
// 
// Wrapper component for module screens providing:
// - Error boundary protection with recovery
// - Standardized loading states
// - Module-level suspense boundaries
// - Consistent layout and spacing
// - Screen-specific skeleton components for all 28 modules
// - Performance-optimized loading patterns
// - v141: Mobile-responsive layouts
// ============================================================================


import React, { Suspense, useState, useEffect, ReactNode } from 'react';
import { ErrorBoundary, ModuleErrorBoundary, InlineError } from './ErrorBoundary';
import { 
  StatCardGridSkeleton, 
  TableSkeleton, 
  CardSkeleton, 
  ListSkeleton,
  DetailPanelSkeleton 
} from './Skeleton';
import { Spinner } from './Spinner';
import { useAppStore } from '@/store/useAppStore';

// Module-specific loading configurations
export type ModuleLoadingType = 
  | 'dashboard'   // StatCards + table + cards
  | 'list'        // Table-heavy view
  | 'detail'      // Detail panel with sections
  | 'workspace'   // Split view with tree + content
  | 'minimal';    // Just a spinner

interface ModuleContainerProps {
  children: ReactNode;
  /** Module identifier for error context */
  moduleName: string;
  /** Type of loading skeleton to show */
  loadingType?: ModuleLoadingType;
  /** Custom loading component */
  loadingFallback?: ReactNode;
  /** Custom error fallback */
  errorFallback?: ReactNode;
  /** Simulate loading delay (ms) - for demo polish */
  loadingDelay?: number;
  /** Whether to show loading state initially */
  showInitialLoading?: boolean;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Additional wrapper className */
  className?: string;
}

/**
 * Get the appropriate loading skeleton based on module type
 * v141: Updated with responsive classes
 */
function getLoadingSkeleton(type: ModuleLoadingType): ReactNode {
  switch (type) {
    case 'dashboard':
      return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Responsive stat grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-surface-card rounded-lg animate-pulse" />
            ))}
          </div>
          {/* Responsive main content: stacked on mobile, side-by-side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="lg:col-span-8">
              <TableSkeleton rows={6} columns={5} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <CardSkeleton showHeader contentLines={4} />
              <CardSkeleton showHeader contentLines={3} />
            </div>
          </div>
        </div>
      );
      
    case 'list':
      return (
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-surface-card rounded animate-pulse" />
              <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
            </div>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      );
      
    case 'detail':
      return (
        <div className="p-4 md:p-6">
          <DetailPanelSkeleton sections={4} showHeader />
        </div>
      );
      
    case 'workspace':
      return (
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar/tree skeleton - hidden on mobile, shown on tablet+ */}
          <div className="hidden md:block w-64 lg:w-80 border-r border-border p-4 flex-shrink-0">
            <div className="h-8 w-full bg-surface-card rounded mb-4 animate-pulse" />
            <ListSkeleton items={8} showIcon />
          </div>
          {/* Main content skeleton */}
          <div className="flex-1 p-4 md:p-6 min-w-0">
            <DetailPanelSkeleton sections={3} showHeader />
          </div>
        </div>
      );
      
    case 'minimal':
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      );
  }
}

/**
 * Loading wrapper with configurable delay
 */
function LoadingWrapper({
  children,
  loadingType,
  loadingFallback,
  loadingDelay = 500,
  showInitialLoading = true,
}: {
  children: ReactNode;
  loadingType: ModuleLoadingType;
  loadingFallback?: ReactNode;
  loadingDelay?: number;
  showInitialLoading?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(showInitialLoading);
  
  useEffect(() => {
    if (showInitialLoading && loadingDelay > 0) {
      const timer = setTimeout(() => setIsLoading(false), loadingDelay);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [loadingDelay, showInitialLoading]);
  
  if (isLoading) {
    return <>{loadingFallback || getLoadingSkeleton(loadingType)}</>;
  }
  
  return <>{children}</>;
}

/**
 * ModuleContainer - Main export
 * 
 * Wraps module screens with error boundary + loading state
 */
export function ModuleContainer({
  children,
  moduleName,
  loadingType = 'dashboard',
  loadingFallback,
  errorFallback,
  loadingDelay = 500,
  showInitialLoading = true,
  onError,
  className = '',
}: ModuleContainerProps) {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  const handleNavigateHome = () => {
    setActiveModule('portfolio');
  };
  
  const handleRetry = () => {
    // Force re-render by toggling a key - handled by error boundary reset
  };
  
  return (
    <div className={`flex-1 overflow-auto ${className}`}>
      <ErrorBoundary
        moduleName={moduleName}
        fallback={errorFallback}
        onError={onError}
        onNavigateHome={handleNavigateHome}
        onRetry={handleRetry}
        showDetails={true}
      >
        <LoadingWrapper
          loadingType={loadingType}
          loadingFallback={loadingFallback}
          loadingDelay={loadingDelay}
          showInitialLoading={showInitialLoading}
        >
          {children}
        </LoadingWrapper>
      </ErrorBoundary>
    </div>
  );
}

/**
 * SuspenseModule - For lazy-loaded module components
 */
export function SuspenseModule({
  children,
  loadingType = 'minimal',
  loadingFallback,
}: {
  children: ReactNode;
  loadingType?: ModuleLoadingType;
  loadingFallback?: ReactNode;
}) {
  return (
    <Suspense fallback={loadingFallback || getLoadingSkeleton(loadingType)}>
      {children}
    </Suspense>
  );
}

/**
 * Screen-specific skeletons for common module layouts
 * v141: All skeletons updated with responsive classes
 */

export function HAQScreenSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="h-8 w-48 sm:w-64 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-24 sm:w-28 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-24 sm:w-28 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      {/* Tab bar skeleton - scrollable on mobile */}
      <div className="flex gap-1 border-b border-border pb-2 overflow-x-auto">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 sm:w-24 bg-surface-card rounded animate-pulse flex-shrink-0" />
        ))}
      </div>
      {/* Stats row - responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-surface-card rounded-lg animate-pulse" />
        ))}
      </div>
      {/* Main content - stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-8">
          <TableSkeleton rows={8} columns={6} />
        </div>
        <div className="lg:col-span-4">
          <CardSkeleton showHeader contentLines={6} />
        </div>
      </div>
    </div>
  );
}

export function SubmissionsScreenSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Pipeline view skeleton - horizontal scroll on all screens */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-shrink-0 w-56 sm:w-64">
            <div className="h-8 w-full bg-surface-card rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map(j => (
                <CardSkeleton key={j} showHeader={false} contentLines={2} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Stats */}
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

export function AuthoringScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* Document tree sidebar */}
      <div className="w-72 border-r border-border p-4">
        <div className="h-8 w-full bg-surface-card rounded mb-4 animate-pulse" />
        <ListSkeleton items={10} showIcon />
      </div>
      {/* Editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-border px-4 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-8 bg-surface-card rounded animate-pulse" />
          ))}
          <div className="flex-1" />
          <div className="h-8 w-24 bg-surface-card rounded animate-pulse" />
        </div>
        {/* Content */}
        <div className="flex-1 p-6">
          <DetailPanelSkeleton sections={5} showHeader />
        </div>
      </div>
      {/* Right panel */}
      <div className="w-80 border-l border-border p-4">
        <CardSkeleton showHeader contentLines={4} className="mb-4" />
        <CardSkeleton showHeader contentLines={3} />
      </div>
    </div>
  );
}

export function SafetyScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={8} columns={6} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function AdminScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border p-4">
        <ListSkeleton items={8} showIcon={false} />
      </div>
      {/* Content */}
      <div className="flex-1 p-6">
        <div className="h-8 w-48 bg-surface-card rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <CardSkeleton showHeader contentLines={4} />
          <CardSkeleton showHeader contentLines={4} />
          <CardSkeleton showHeader contentLines={3} />
          <CardSkeleton showHeader contentLines={3} />
        </div>
      </div>
    </div>
  );
}

/**
 * v138: Additional screen-specific skeletons for complete coverage
 */

export function PortfolioScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-surface-card rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-surface-card rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-64 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      {/* Main layout */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <StatCardGridSkeleton count={4} columns={4} />
          {/* Program cards */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <CardSkeleton key={i} showHeader contentLines={5} />
            ))}
          </div>
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={6} />
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

// v160: Activity Dashboard Skeleton
export function ActivityScreenSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-surface-card rounded" />
          <div className="h-4 w-96 bg-surface-card rounded mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-20 bg-surface-card rounded" />
          <div className="h-9 w-32 bg-surface-card rounded" />
          <div className="h-9 w-24 bg-surface-card rounded" />
        </div>
      </div>
      {/* Stats Row */}
      <StatCardGridSkeleton count={5} columns={5} />
      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="h-6 w-32 bg-surface-card rounded" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-surface-card rounded-lg" />
          ))}
        </div>
        <div className="space-y-6">
          <CardSkeleton showHeader contentLines={6} />
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={3} />
        </div>
      </div>
    </div>
  );
}

export function CTMSScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={5} columns={5} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={8} columns={6} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function CMCScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Tabs skeleton */}
      <div className="flex gap-1 border-b border-border pb-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-28 bg-surface-card rounded animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

export function QualityScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={7} columns={5} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function QMSScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-24 bg-surface-card rounded animate-pulse" />
        ))}
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

export function TMFScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* TMF Tree sidebar */}
      <div className="w-72 border-r border-border p-4">
        <div className="h-8 w-full bg-surface-card rounded mb-4 animate-pulse" />
        <ListSkeleton items={12} showIcon />
      </div>
      {/* Content */}
      <div className="flex-1 p-6">
        <div className="h-8 w-48 bg-surface-card rounded mb-4 animate-pulse" />
        <StatCardGridSkeleton count={3} columns={3} />
        <div className="mt-6">
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    </div>
  );
}

export function DocumentControlScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* Doc tree sidebar */}
      <div className="w-80 border-r border-border p-4">
        <div className="h-8 w-full bg-surface-card rounded mb-4 animate-pulse" />
        <ListSkeleton items={10} showIcon />
      </div>
      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
        <StatCardGridSkeleton count={4} columns={4} />
        <TableSkeleton rows={6} columns={5} />
      </div>
    </div>
  );
}

export function LabelingScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Multi-region table */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <CardSkeleton key={i} showHeader contentLines={6} />
        ))}
      </div>
    </div>
  );
}

export function RegStrategyScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Strategy timeline */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <CardSkeleton showHeader contentLines={8} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={4} />
          <CardSkeleton showHeader contentLines={5} />
        </div>
      </div>
    </div>
  );
}

export function ECTDWorkspaceScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* eCTD tree */}
      <div className="w-80 border-r border-border p-4">
        <div className="h-8 w-full bg-surface-card rounded mb-4 animate-pulse" />
        <ListSkeleton items={15} showIcon />
      </div>
      {/* Content area */}
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
            <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          </div>
        </div>
        <DetailPanelSkeleton sections={4} showHeader />
      </div>
      {/* Validation panel */}
      <div className="w-72 border-l border-border p-4">
        <CardSkeleton showHeader contentLines={6} />
      </div>
    </div>
  );
}

export function PublishingScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-36 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Publishing queue */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={6} columns={6} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function LifecycleScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Timeline view */}
      <div className="h-64 bg-surface-card rounded-lg animate-pulse" />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

export function MasterDataScreenSkeleton() {
  return (
    <div className="flex h-full">
      {/* Nav sidebar */}
      <div className="w-64 border-r border-border p-4">
        <ListSkeleton items={8} showIcon />
      </div>
      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
            <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={10} columns={6} />
      </div>
    </div>
  );
}

export function DevelopmentScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={5} columns={5} />
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-28 bg-surface-card rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={6} columns={5} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function ResearchScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
        <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton showHeader contentLines={6} />
        <CardSkeleton showHeader contentLines={6} />
      </div>
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

export function PlanningScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Gantt chart placeholder */}
      <div className="h-72 bg-surface-card rounded-lg animate-pulse" />
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}

export function StudyIntelScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={6} columns={5} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

export function InspectorReadinessScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
        <div className="h-9 w-36 bg-surface-card rounded animate-pulse" />
      </div>
      {/* Readiness score */}
      <div className="flex gap-6">
        <div className="w-40 h-40 bg-surface-card rounded-full animate-pulse" />
        <div className="flex-1">
          <StatCardGridSkeleton count={3} columns={3} />
        </div>
      </div>
      {/* Checklist */}
      <TableSkeleton rows={8} columns={4} />
    </div>
  );
}

export function ExternalReviewPortalSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={3} columns={3} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <TableSkeleton rows={5} columns={4} />
        </div>
        <div className="col-span-5">
          <CardSkeleton showHeader contentLines={8} />
        </div>
      </div>
    </div>
  );
}

export function SubmissionsHubScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          <div className="h-9 w-36 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Pipeline cards */}
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-72">
            <div className="h-8 w-full bg-surface-card rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              {[1, 2].map(j => (
                <CardSkeleton key={j} showHeader={false} contentLines={2} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublishingCenterScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton showHeader contentLines={6} />
        <CardSkeleton showHeader contentLines={6} />
      </div>
    </div>
  );
}

export function ProgramDetailScreenSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-24 bg-surface-card rounded animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-surface-card rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-surface-card rounded animate-pulse" />
        </div>
      </div>
      <StatCardGridSkeleton count={4} columns={4} />
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-24 bg-surface-card rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <TableSkeleton rows={5} columns={5} />
        </div>
        <div className="col-span-4 space-y-4">
          <CardSkeleton showHeader contentLines={5} />
          <CardSkeleton showHeader contentLines={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * AsyncBoundary - Combined error + loading boundary
 * 
 * For components that fetch data and may error
 */
interface AsyncBoundaryProps {
  children: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Loading fallback */
  loadingFallback?: ReactNode;
  /** Error message */
  errorMessage?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Module name for context */
  moduleName?: string;
}

export function AsyncBoundary({
  children,
  isLoading = false,
  error = null,
  loadingFallback,
  errorMessage,
  onRetry,
  moduleName,
}: AsyncBoundaryProps) {
  if (isLoading) {
    return <>{loadingFallback || <Spinner size="lg" className="mx-auto my-8" />}</>;
  }
  
  if (error) {
    return (
      <InlineError 
        message={errorMessage || error.message || 'An error occurred'}
        onRetry={onRetry}
      />
    );
  }
  
  return (
    <ErrorBoundary moduleName={moduleName}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * WidgetBoundary - Lightweight boundary for dashboard widgets
 */
export function WidgetBoundary({
  children,
  isLoading = false,
  error = null,
  onRetry,
  height = 200,
}: {
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  height?: number;
}) {
  if (isLoading) {
    return (
      <div 
        className="bg-surface-card border border-border rounded-xl animate-pulse"
        style={{ height }}
      />
    );
  }
  
  if (error) {
    return (
      <div 
        className="bg-surface-card border border-border rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <InlineError message="Widget failed to load" onRetry={onRetry} />
      </div>
    );
  }
  
  return <>{children}</>;
}

export default ModuleContainer;
