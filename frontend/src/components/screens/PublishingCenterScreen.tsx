

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { 
  Calendar,
  Users,
  Send,
  History,
  RefreshCw,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { PipelineView } from '@/components/submissions/PipelineView';
import { LifecycleView } from '@/components/submissions/LifecycleView';
import { PlanningView } from '@/components/submissions/PlanningView';
import { PublishingView } from '@/components/submissions/PublishingView';
import { SubmissionTracker } from '@/components/submissions/SubmissionTracker';
import { GatewayMonitor } from '@/components/submissions/GatewayMonitor';
import { GatewayStatusPanel } from '@/components/submissions/GatewayStatusPanel';
import { ectdApplications, getFilteredApplications } from '@/data/ectd-data';
import { FilterState } from '@/components/layout/FilterBar';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { Badge, BadgeColor } from '@/components/ui/Badge';
// v126: Card and Skeleton components
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatCardGridSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

// ============================================================================
// v110 Color Maps - PublishingCenterScreen
// ============================================================================

// Sequence status color map
const sequenceStatusColorMap: Record<string, BadgeColor> = {
  draft: 'amber',
  submitted: 'purple',
  acknowledged: 'blue',
  'under-review': 'green',
  approved: 'green',
  rejected: 'red',
};

// ============================================================================
// v110 Badge Helpers - PublishingCenterScreen
// ============================================================================

export const getSequenceStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={sequenceStatusColorMap[status] || 'gray'} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

interface PublishingCenterScreenProps {
  filters?: FilterState;
  embedded?: boolean; // v0.9.17d: When true, hide header for unified publishing
}

type ViewMode = 'pipeline' | 'planning' | 'publishing' | 'tracker' | 'lifecycle';

export function PublishingCenterScreen({ filters, embedded = false }: PublishingCenterScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const setCurrentDraft = useSequenceBuilderStore(s => s.setCurrentDraft);

  // v130: Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

  const filteredApps = getFilteredApplications({
    product: filters?.product,
    region: filters?.region,
    applicationType: filters?.applicationType,
  });

  const selectedApp = filteredApps[0] || null;

  // Calculate quick stats
  const totalSequences = filteredApps.reduce((acc, app) => acc + app.sequences.length, 0);
  const submitted = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'submitted' || s.status === 'acknowledged').length;
  const underReview = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'under-review').length;
  const drafts = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'draft').length;

  const tabs = [
    { id: 'pipeline' as ViewMode, label: 'Pipeline', icon: <BarChart3 className="w-4 h-4" />, description: 'Submission timeline and pipeline overview' },
    { id: 'planning' as ViewMode, label: 'Team & RACI', icon: <Users className="w-4 h-4" />, description: 'Resource allocation and responsibilities' },
    { id: 'publishing' as ViewMode, label: 'Publishing', icon: <Send className="w-4 h-4" />, description: 'Prepare and validate submissions' },
    { id: 'tracker' as ViewMode, label: 'Tracker', icon: <History className="w-4 h-4" />, description: 'Gateway acknowledgments and status' },
    { id: 'lifecycle' as ViewMode, label: 'Lifecycle', icon: <RefreshCw className="w-4 h-4" />, description: 'Post-approval maintenance and variations' },
  ];

  // v130: Loading state render
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-text-muted">Loading publishing center...</span></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header - hidden when embedded in UnifiedPublishingScreen */}
      {!embedded && (
      <>
      {/* v0.51.0: ScreenHeader adoption — standardized header */}
      <ScreenHeader
        title="Publishing Center"
        subtitle="Pipeline planning, publishing workflow, and lifecycle management"
        icon={<Send className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Sequences:</span>
              <span className="font-semibold text-text-primary">{totalSequences}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              <span className="text-text-muted">Drafts:</span>
              <span className="font-semibold text-accent-amber">{drafts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-accent-purple" />
              <span className="text-text-muted">Submitted:</span>
              <span className="font-semibold text-accent-purple">{submitted}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-text-muted">In Review:</span>
              <span className="font-semibold text-accent-green">{underReview}</span>
            </div>
          </div>
        }
      />
      <div className="border-b border-border bg-surface">
        <div className="px-6 pt-3 pb-2">
          {/* v117: Breadcrumb */}
          <Breadcrumb 
            moduleId="publishing-center" 
            viewLabel={viewMode === 'pipeline' ? 'Pipeline' :
                      viewMode === 'planning' ? 'Team & RACI' :
                      viewMode === 'publishing' ? 'Publishing' :
                      viewMode === 'tracker' ? 'Tracker' :
                      viewMode === 'lifecycle' ? 'Lifecycle' : 'Pipeline'}
            className="mb-1"
          />
        </div>
        {/* Navigation Tabs */}
        <div className="px-6 flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                viewMode === tab.id
                  ? 'bg-surface-elevated text-accent-blue border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary border-transparent hover:bg-surface-card'
              }`}
              title={tab.description}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      </>
      )}

      {/* Embedded Mode Controls - Compact toolbar when header is hidden */}
      {embedded && (
        <div className="border-b border-border bg-surface-elevated px-4 py-2 flex items-center justify-between">
          <div className="flex bg-surface-card rounded-lg p-0.5 border border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === tab.id ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
                title={tab.description}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span><span className="font-semibold text-text-primary">{totalSequences}</span> Sequences</span>
            <span><span className="font-semibold text-accent-amber">{drafts}</span> Drafts</span>
            <span><span className="font-semibold text-accent-purple">{submitted}</span> Submitted</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      {viewMode === 'pipeline' ? (
        <PipelineView />
      ) : viewMode === 'planning' ? (
        <PlanningView filters={filters} />
      ) : viewMode === 'publishing' ? (
        <PublishingView filters={filters} />
      ) : viewMode === 'tracker' ? (
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-auto p-6 space-y-4 md:space-y-6">
            {/* Gateway Status Panel */}
            {selectedApp && (
              <GatewayStatusPanel 
                projectId={selectedApp.id}
                applicationNumber={selectedApp.number || 'N/A'}
                sequenceNumber="0000"
                submissionType={selectedApp.type || 'original-application'}
              />
            )}
            
            {/* Submission Tracker */}
            <SubmissionTracker 
              applicationId={selectedApp?.id}
              onViewSequence={(draft) => {
                setCurrentDraft(draft.id);
              }}
            />
          </div>
          
          {/* Gateway Monitor Sidebar */}
          <div className="hidden xl:block w-80 border-l border-border overflow-auto">
            <GatewayMonitor />
          </div>
        </div>
      ) : viewMode === 'lifecycle' ? (
        <LifecycleView />
      ) : null}
    </div>
  );
}
