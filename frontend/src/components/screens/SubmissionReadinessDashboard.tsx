

import { useState, useEffect, useMemo } from 'react';
import {
  Rocket,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  FileText,
  Database,
  FolderOpen,
  FileCheck,
  Send,
  Zap,
  Target,
  Activity,
  RefreshCw,
  Sparkles,
  Layers,
  Shield,
  Brain,
} from 'lucide-react';
import {
  useSubmissionReadinessStore,
  useSelectedStudyCountdown,
  useSelectedStudyWorkstreams,
  useSelectedStudyMilestones,
  useSelectedStudyDataFlow,
  useSelectedStudyCSRProgress,
} from '@/store/useSubmissionReadinessStore';
import type {
  SubmissionMilestone,
  WorkstreamReadiness,
  CSRSection,
  MilestoneStatus,
  WorkstreamCategory,
} from '@/store/submissionReadinessTypes';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CrossModuleBridgeVisualization } from '@/components/cross-module/CrossModuleBridgeVisualization';

// ============================================================================
// COLOR MAPS
// ============================================================================

const statusColorMap: Record<MilestoneStatus, 'green' | 'blue' | 'teal' | 'amber' | 'red' | 'gray'> = {
  'completed': 'green',
  'in-progress': 'blue',
  'on-track': 'teal',
  'at-risk': 'amber',
  'blocked': 'red',
  'not-started': 'gray',
};

const categoryColorMap: Record<WorkstreamCategory, string> = {
  'clinical-data': 'text-emerald-400 bg-emerald-500/20',
  'csr-authoring': 'text-blue-400 bg-blue-500/20',
  'datasets': 'text-purple-400 bg-purple-500/20',
  'tmf': 'text-amber-400 bg-amber-500/20',
  'regulatory-docs': 'text-teal-400 bg-teal-500/20',
  'publishing': 'text-pink-400 bg-pink-500/20',
};

const categoryIcons: Record<WorkstreamCategory, React.ReactNode> = {
  'clinical-data': <Users className="w-4 h-4" />,
  'csr-authoring': <FileText className="w-4 h-4" />,
  'datasets': <Database className="w-4 h-4" />,
  'tmf': <FolderOpen className="w-4 h-4" />,
  'regulatory-docs': <FileCheck className="w-4 h-4" />,
  'publishing': <Send className="w-4 h-4" />,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: MilestoneStatus) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'in-progress': return <Activity className="w-4 h-4 text-blue-400" />;
    case 'on-track': return <TrendingUp className="w-4 h-4 text-teal-400" />;
    case 'at-risk': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'blocked': return <AlertCircle className="w-4 h-4 text-red-400" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionReadinessDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'timeline' | 'workstreams' | 'csr'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const loadMockData = useSubmissionReadinessStore(s => s.loadMockData);
  const countdown = useSelectedStudyCountdown();
  const workstreams = useSelectedStudyWorkstreams();
  const milestones = useSelectedStudyMilestones();
  const dataFlow = useSelectedStudyDataFlow();
  const csrProgress = useSelectedStudyCSRProgress();

  useEffect(() => {
    loadMockData();
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [loadMockData]);

  if (isLoading || !countdown) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-accent-teal animate-pulse" />
          <p className="text-text-muted">Loading submission readiness...</p>
        </div>
      </div>
    );
  }

  const views = [
    { id: 'overview', label: 'Overview', icon: <Target className="w-4 h-4" /> },
    { id: 'timeline', label: '4-Week Timeline', icon: <Calendar className="w-4 h-4" /> },
    { id: 'workstreams', label: 'Workstreams', icon: <Layers className="w-4 h-4" /> },
    { id: 'csr', label: 'CSR Progress', icon: <FileText className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-surface-elevated border-b border-border px-6 py-4">
        <Breadcrumb 
          moduleId="ctms" 
          viewLabel="Submission Readiness"
          className="mb-4"
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent-teal/30 to-emerald-500/30 rounded-lg">
              <Rocket className="w-5 h-5 text-accent-teal" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Submission Readiness</h1>
              <p className="text-sm text-text-muted">LIGATURE-1 (LIG-2847-301) → NDA Module 5</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadMockData}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Hero Countdown Card */}
        <div className="bg-gradient-to-r from-surface-card to-surface rounded-xl border border-border p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-teal">{countdown.daysToLSLV}</div>
                <div className="text-xs text-text-muted uppercase tracking-wide">Days to LSLV</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-4xl font-bold text-text-primary">{countdown.weeksToSubmission}</div>
                <div className="text-xs text-text-muted uppercase tracking-wide">Weeks to Submit</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">{countdown.overallReadiness}%</div>
                <div className="text-xs text-text-muted uppercase tracking-wide">Ready</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-400">Time Compression</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-400">{countdown.timelineReduction}%</span>
                <span className="text-sm text-text-muted">faster</span>
              </div>
              <div className="text-xs text-text-muted mt-1">
                {countdown.ligatureTimeline} days vs {countdown.traditionalTimeline} days traditional
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mb-4">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeView === view.id 
                  ? 'border-accent-teal text-accent-teal' 
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface">
        {activeView === 'overview' && (
          <OverviewView 
            countdown={countdown} 
            workstreams={workstreams} 
            dataFlow={dataFlow}
            csrProgress={csrProgress}
          />
        )}
        {activeView === 'timeline' && (
          <TimelineView milestones={milestones} countdown={countdown} />
        )}
        {activeView === 'workstreams' && (
          <WorkstreamsView workstreams={workstreams} />
        )}
        {activeView === 'csr' && csrProgress && (
          <CSRProgressView csrProgress={csrProgress} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW VIEW
// ============================================================================

interface OverviewViewProps {
  countdown: NonNullable<ReturnType<typeof useSelectedStudyCountdown>>;
  workstreams: WorkstreamReadiness[];
  dataFlow: ReturnType<typeof useSelectedStudyDataFlow>;
  csrProgress: ReturnType<typeof useSelectedStudyCSRProgress>;
}

function OverviewView({ countdown, workstreams, dataFlow, csrProgress }: OverviewViewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Workstream Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Workstream Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {countdown.workstreamSummaries.map(ws => (
            <Card key={ws.category} className="hover:border-border-highlight transition-colors">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg mb-3 ${categoryColorMap[ws.category]}`}>
                  {categoryIcons[ws.category]}
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1">{ws.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-text-primary">{ws.percentComplete}%</span>
                </div>
                <ProgressBar 
                  value={ws.percentComplete} 
                  max={100} 
                  color={ws.status === 'completed' ? 'emerald' : ws.status === 'at-risk' ? 'amber' : 'blue'} 
                  size="sm" 
                />
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-text-muted">{ws.itemsComplete}/{ws.itemsTotal}</span>
                  {ws.blockerCount > 0 && (
                    <Badge color="amber" size="xs">{ws.blockerCount} blockers</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Continuous Data Flow */}
      {dataFlow && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Continuous Data Flow</h2>
            <Badge color="green" size="sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Real-time
            </Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <ContinuousDataCard
              title="Data Completeness"
              value={`${dataFlow.dataCompletenessPercent.toFixed(1)}%`}
              subtitle={`${dataFlow.subjectsWithCompleteData}/${dataFlow.subjectsTotal} subjects`}
              icon={<Users className="w-5 h-5" />}
              color="emerald"
            />
            <ContinuousDataCard
              title="Query Resolution"
              value={`${dataFlow.queryResolutionRate}%`}
              subtitle={`${dataFlow.openQueries} open queries`}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="green"
            />
            <ContinuousDataCard
              title="Data Cleaning"
              value={`${dataFlow.dataCleaningPercent}%`}
              subtitle={`${dataFlow.cleanedCRFs.toLocaleString()} CRFs cleaned`}
              icon={<Shield className="w-5 h-5" />}
              color="teal"
            />
            <ContinuousDataCard
              title="Datasets Ready"
              value={`${dataFlow.sdtmDomainsReady + dataFlow.adamDatasetsReady}/${dataFlow.sdtmDomainsTotal + dataFlow.adamDatasetsTotal}`}
              subtitle="SDTM + ADaM domains"
              icon={<Database className="w-5 h-5" />}
              color="purple"
            />
          </div>
        </div>
      )}

      {/* CSR Real-Time Authoring */}
      {csrProgress && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-text-primary">CSR Authoring Progress</h2>
            <Badge color="blue" size="sm">
              <Brain className="w-3 h-3 mr-1" />
              AI-Assisted
            </Badge>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-text-primary">{csrProgress.csrTitle}</h3>
                  <p className="text-sm text-text-muted">Version {csrProgress.csrVersion}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary">{csrProgress.overallProgress}%</div>
                  <div className="text-xs text-green-400">
                    {csrProgress.daysAheadOfSchedule > 0 && `${csrProgress.daysAheadOfSchedule} days ahead`}
                  </div>
                </div>
              </div>
              <ProgressBar value={csrProgress.overallProgress} max={100} color="blue" size="md" className="mb-4" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-green-400">{csrProgress.sectionsComplete}</div>
                  <div className="text-xs text-text-muted">Complete</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-blue-400">{csrProgress.sectionsInProgress}</div>
                  <div className="text-xs text-text-muted">In Progress</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-purple-400">{csrProgress.aiDraftedSections}</div>
                  <div className="text-xs text-text-muted">AI-Drafted</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-accent-teal">{(csrProgress.sections ?? []).filter(s => s.hasLiveDataConnection).length}</div>
                  <div className="text-xs text-text-muted">Live Data</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* v0.42.51: Cross-Module Bridge Visualization */}
      <CrossModuleBridgeVisualization />

      {/* Key Differentiator Callout */}
      <div className="bg-gradient-to-r from-accent-teal/10 via-blue-500/10 to-purple-500/10 rounded-xl border border-accent-teal/30 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent-teal/20 rounded-lg">
            <Zap className="w-6 h-6 text-accent-teal" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Why 4 Weeks Instead of 16?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-sm">
              <div>
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Continuous Data Flow</span>
                </div>
                <p className="text-text-muted">No database lock bottleneck. Data flows in real-time from EDC to CSR.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">AI-Assisted Authoring</span>
                </div>
                <p className="text-text-muted">89% of CSR written before LSLV. AI drafts tables and narratives from live data.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="font-medium">Parallel Execution</span>
                </div>
                <p className="text-text-muted">TMF, datasets, and regulatory docs progress simultaneously, not sequentially.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTINUOUS DATA CARD
// ============================================================================

interface ContinuousDataCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'emerald' | 'green' | 'teal' | 'purple' | 'blue';
}

function ContinuousDataCard({ title, value, subtitle, icon, color }: ContinuousDataCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/20',
    green: 'text-green-400 bg-green-500/20',
    teal: 'text-accent-teal bg-accent-teal/20',
    purple: 'text-purple-400 bg-purple-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold text-text-primary mb-1">{value}</div>
        <div className="text-xs text-text-muted">{subtitle}</div>
        <div className="text-xs text-text-muted mt-2">{title}</div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TIMELINE VIEW
// ============================================================================

interface TimelineViewProps {
  milestones: SubmissionMilestone[];
  countdown: NonNullable<ReturnType<typeof useSelectedStudyCountdown>>;
}

function TimelineView({ milestones, countdown }: TimelineViewProps) {
  const weekGroups = useMemo(() => {
    const groups: Record<string, SubmissionMilestone[]> = {
      'pre-lslv': [],
      'week-0': [],
      'week-1': [],
      'week-2': [],
      'week-3': [],
      'week-4': [],
    };
    
    milestones.forEach(m => {
      if (m.daysFromLSLV < 0) groups['pre-lslv'].push(m);
      else if (m.daysFromLSLV === 0) groups['week-0'].push(m);
      else if (m.daysFromLSLV <= 7) groups['week-1'].push(m);
      else if (m.daysFromLSLV <= 14) groups['week-2'].push(m);
      else if (m.daysFromLSLV <= 21) groups['week-3'].push(m);
      else groups['week-4'].push(m);
    });
    
    return groups;
  }, [milestones]);

  const weekLabels: Record<string, { title: string; subtitle: string }> = {
    'pre-lslv': { title: 'Pre-LSLV', subtitle: 'Already Complete' },
    'week-0': { title: 'LSLV', subtitle: 'Day 0' },
    'week-1': { title: 'Week 1', subtitle: 'Days 1-7 • DBL' },
    'week-2': { title: 'Week 2', subtitle: 'Days 8-14 • Analysis' },
    'week-3': { title: 'Week 3', subtitle: 'Days 15-21 • CSR' },
    'week-4': { title: 'Week 4', subtitle: 'Days 22-28 • Submit' },
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">4-Week Submission Timeline</h2>
          <p className="text-sm text-text-muted">LSLV: {formatDate(countdown.lslvDate)} → Submit: {formatDate(countdown.submissionTargetDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {Object.entries(weekGroups).map(([weekKey, weekMilestones]) => (
          <div key={weekKey} className="space-y-3">
            <div className={`text-center p-3 rounded-lg ${
              weekKey === 'week-0' ? 'bg-accent-teal/20 border border-accent-teal/30' :
              weekKey === 'week-4' ? 'bg-green-500/20 border border-green-500/30' :
              'bg-surface-card border border-border'
            }`}>
              <div className="font-semibold text-text-primary">{weekLabels[weekKey]?.title}</div>
              <div className="text-xs text-text-muted">{weekLabels[weekKey]?.subtitle}</div>
            </div>
            
            <div className="space-y-2">
              {weekMilestones.map(m => (
                <MilestoneCard key={m.id} milestone={m} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Traditional vs Ligature Comparison */}
      <Card className="mt-8">
        <CardContent className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Traditional Timeline Comparison</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">Traditional Approach</span>
                <span className="text-sm text-text-secondary">{countdown.traditionalTimeline} days</span>
              </div>
              <div className="h-8 bg-surface rounded-lg overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-red-500/30" style={{ width: '100%' }} />
                <div className="absolute inset-y-0 left-0 flex items-center px-3">
                  <span className="text-xs text-red-400">LSLV → DBL (6-8 wks) → Analysis → CSR → Submit</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">Ligature Platform</span>
                <span className="text-sm text-green-400 font-medium">{countdown.ligatureTimeline} days</span>
              </div>
              <div className="h-8 bg-surface rounded-lg overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500/30 to-emerald-500/30" 
                  style={{ width: `${(countdown.ligatureTimeline / countdown.traditionalTimeline) * 100}%` }} 
                />
                <div className="absolute inset-y-0 left-0 flex items-center px-3">
                  <span className="text-xs text-green-400">Continuous flow → Parallel execution → Submit</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MilestoneCard({ milestone }: { milestone: SubmissionMilestone }) {
  return (
    <div className={`p-3 rounded-lg border ${
      milestone.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
      milestone.status === 'in-progress' ? 'bg-blue-500/10 border-blue-500/30' :
      milestone.status === 'on-track' ? 'bg-surface-card border-border' :
      'bg-surface-card border-border'
    }`}>
      <div className="flex items-start gap-2 mb-2">
        {getStatusIcon(milestone.status)}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">{milestone.shortName}</div>
          <div className="text-xs text-text-muted">{formatDate(milestone.targetDate)}</div>
        </div>
      </div>
      <ProgressBar 
        value={milestone.percentComplete} 
        max={100} 
        color={milestone.status === 'completed' ? 'emerald' : 'blue'} 
        size="xs" 
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted">{milestone.percentComplete}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// WORKSTREAMS VIEW
// ============================================================================

function WorkstreamsView({ workstreams }: { workstreams: WorkstreamReadiness[] }) {
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Workstream Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {workstreams.map(ws => (
          <Card key={ws.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${categoryColorMap[ws.category]}`}>
                    {categoryIcons[ws.category]}
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{ws.name}</h3>
                    <p className="text-xs text-text-muted">{ws.description}</p>
                  </div>
                </div>
                <Badge color={statusColorMap[ws.status]} size="sm">{ws.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-muted">Progress</span>
                  <span className="text-text-primary font-medium">{ws.percentComplete}%</span>
                </div>
                <ProgressBar value={ws.percentComplete} max={100} color="blue" size="md" />
              </div>
              
              <div className="space-y-2">
                {ws.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      {item.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      {item.status === 'in-progress' && <Activity className="w-3.5 h-3.5 text-blue-400" />}
                      {item.status === 'not-started' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
                      {item.status === 'blocked' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className={item.status === 'complete' ? 'text-text-muted' : 'text-text-secondary'}>{item.name}</span>
                      {item.aiAssisted && <Sparkles className="w-3 h-3 text-purple-400" />}
                    </div>
                    <span className="text-xs text-text-muted">{item.percentComplete}%</span>
                  </div>
                ))}
              </div>

              {ws.blockers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-amber-400 font-medium mb-2">Blockers ({ws.blockers.length})</div>
                  {ws.blockers.map(b => (
                    <div key={b.id} className="text-xs text-text-muted flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                      {b.description}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CSR PROGRESS VIEW
// ============================================================================

function CSRProgressView({ csrProgress }: { csrProgress: NonNullable<ReturnType<typeof useSelectedStudyCSRProgress>> }) {
  const statusOrder: Record<string, number> = {
    'final': 0, 'approved': 1, 'qc-review': 2, 'medical-review': 3,
    'drafting': 4, 'ai-drafting': 5, 'data-pending': 6, 'not-started': 7,
  };

  const sortedSections = [...csrProgress.sections].sort((a, b) => {
    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
  });

  const getStatusBadge = (status: CSRSection['status']) => {
    const colors: Record<string, 'green' | 'blue' | 'purple' | 'amber' | 'gray'> = {
      'final': 'green', 'approved': 'green', 'qc-review': 'blue', 'medical-review': 'blue',
      'drafting': 'purple', 'ai-drafting': 'purple', 'data-pending': 'amber', 'not-started': 'gray',
    };
    return <Badge color={colors[status] || 'gray'} size="sm">{status.replace(/-/g, ' ')}</Badge>;
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-text-primary">{csrProgress.overallProgress}%</div><div className="text-xs text-text-muted">Overall</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-green-400">{csrProgress.sectionsComplete}</div><div className="text-xs text-text-muted">Complete</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-purple-400">{csrProgress.aiGeneratedTables}</div><div className="text-xs text-text-muted">AI Tables</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-blue-400">{Math.round((csrProgress.aiAssistedWordCount / csrProgress.totalWordCount) * 100)}%</div><div className="text-xs text-text-muted">AI Content</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-accent-teal">{(csrProgress.sections ?? []).filter(s => s.hasLiveDataConnection).length}</div><div className="text-xs text-text-muted">Live Data</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><h3 className="font-medium text-text-primary">CSR Sections</h3></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedSections.map(section => (
              <div key={section.id} className="flex items-center gap-4 p-3 bg-surface rounded-lg">
                <div className="w-16 text-sm font-mono text-text-muted">{section.sectionNumber}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{section.sectionTitle}</span>
                    {section.hasLiveDataConnection && <Badge color="teal" size="xs"><Activity className="w-2.5 h-2.5 mr-1" />Live</Badge>}
                    {section.aiAssistedPercent > 50 && <Badge color="purple" size="xs"><Sparkles className="w-2.5 h-2.5 mr-1" />{section.aiAssistedPercent}%</Badge>}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {section.wordCount.toLocaleString()} words
                    {section.tablesGenerated > 0 && ` • ${section.tablesGenerated} tables`}
                  </div>
                </div>
                <div className="w-32"><ProgressBar value={section.percentComplete} max={100} color={section.status === 'final' ? 'emerald' : 'blue'} size="sm" /></div>
                <div className="w-20 text-right text-sm text-text-secondary">{section.percentComplete}%</div>
                <div className="w-32">{getStatusBadge(section.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
