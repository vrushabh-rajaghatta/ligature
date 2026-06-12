
import { useAppStore } from '@/store/useAppStore';
import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Target,
  TrendingUp,
  Users,
  Zap,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Calendar,
  Languages,
  Banknote,
  Scale,
  PackageCheck,
  Truck,
  Brain,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { SearchInput } from '@/components/ui/Input';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TimelineSlider, MilestoneTimelineRow } from '@/components/clinical/TimelineSlider';
import {
  mockStudyStartupState,
  mockTimelineState,
  getStudyStartupState,
  getTimelineState,
  mockProtocolArms,
  mockProtocolCohorts,
  mockProtocolAmendments,
  type ProtocolArm,
  type ProtocolCohort,
  type ProtocolAmendment,
} from '@/data/study-startup-data';
import { WORKSTREAM_META, type WorkstreamType, type BlockedSite, type WorkstreamStatus } from '@/store/studyStartupTypes';
import { useDeadClick } from '@/hooks/useDeadClick';

// =============================================================================
// ICON MAPPING
// =============================================================================

const workstreamIcons: Record<WorkstreamType, React.ReactNode> = {
  'translation': <Languages className="w-5 h-5" />,
  'budget-contracting': <Banknote className="w-5 h-5" />,
  'regulatory-ethics': <Scale className="w-5 h-5" />,
  'qp-release': <PackageCheck className="w-5 h-5" />,
  'site-qualification': <Building2 className="w-5 h-5" />,
  'supply-comparator': <Truck className="w-5 h-5" />,
};

// =============================================================================
// CRITICAL BLOCKER BANNER
// =============================================================================

interface CriticalBlockerBannerProps {
  blocker: typeof mockStudyStartupState.criticalBlocker;
  onViewTask: () => void;
  onDismiss: () => void;
}

function CriticalBlockerBanner({ blocker, onViewTask, onDismiss }: CriticalBlockerBannerProps) {
  if (!blocker) return null;

  const meta = WORKSTREAM_META[blocker.type];

  return (
    <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/30 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <Target className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-red-400 uppercase tracking-wide">Critical Blocker</span>
              <Badge color="red" size="xs">{blocker.daysOverdue} days overdue</Badge>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">{blocker.title}</h3>
            <p className="text-sm text-text-secondary mb-4">{blocker.description}</p>
            
            {/* Impact stats */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{blocker.affectedSiteCount}</span> sites blocked
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{blocker.affectedSubjects}</span> subjects at risk
                </span>
              </div>
            </div>
            
            {/* Recommendation */}
            <div className="bg-surface/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-amber-400 mb-1">Recommended Action</div>
                  <p className="text-sm text-text-secondary">{blocker.recommendedAction}</p>
                </div>
              </div>
            </div>
            
            {/* Impact if resolved */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>If resolved: Activation moves to {blocker.impactIfResolved.newPredictedDate}</span>
              </div>
              <span className="text-text-muted">({blocker.impactIfResolved.daysSaved} days saved)</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="sm" onClick={onViewTask}>
            View Task
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// WORKSTREAM CARD
// =============================================================================

interface WorkstreamCardProps {
  workstream: WorkstreamStatus;
  onClick?: () => void;
}

function WorkstreamCard({ workstream, onClick }: WorkstreamCardProps) {
  const meta = WORKSTREAM_META[workstream.type];
  const icon = workstreamIcons[workstream.type];
  
  const colorClasses: Record<string, { bg: string; text: string; progress: string }> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', progress: 'blue' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', progress: 'emerald' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', progress: 'purple' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', progress: 'amber' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', progress: 'teal' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', progress: 'blue' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', progress: 'emerald' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', progress: 'red' },
  };
  
  const colors = colorClasses[meta.color] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      className={`relative bg-surface-card border rounded-xl p-4 text-left transition-all hover:border-border-hover hover:shadow-lg ${
        workstream.isBottleneck ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-border'
      }`}
    >
      {/* Bottleneck indicator */}
      {workstream.isBottleneck && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded-full">
          BOTTLENECK
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors?.bg ?? ''}`}>
          <div className={colors.text}>{icon}</div>
        </div>
        <span className={`text-2xl font-bold ${colors?.text ?? ''}`}>{workstream.progressPercent}%</span>
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-medium text-text-primary mb-1">{meta.name}</h4>
      
      {/* Progress bar */}
      <ProgressBar 
        value={workstream.progressPercent} 
        max={100} 
        color={workstream.isBottleneck ? 'red' : colors.progress as any}
        size="sm" 
        className="mb-3"
      />
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-semibold text-text-primary">{workstream.completed}</div>
          <div className="text-[10px] text-text-muted truncate">{workstream.completedLabel}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-400">{workstream.inProgress}</div>
          <div className="text-[10px] text-text-muted truncate">{workstream.inProgressLabel}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-text-muted">{workstream.pending}</div>
          <div className="text-[10px] text-text-muted truncate">{workstream.pendingLabel}</div>
        </div>
      </div>
      
      {/* Blocked indicator */}
      {workstream.blocked > 0 && (
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-center gap-1 text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs font-medium">{workstream.blocked} blocked</span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// BLOCKED SITES LIST
// =============================================================================

interface BlockedSitesListProps {
  sites: BlockedSite[];
  onSiteClick: (siteId: string) => void;
  maxItems?: number;
}

function BlockedSitesList({ sites, onSiteClick, maxItems = 10 }: BlockedSitesListProps) {
    const { deadClick } = useDeadClick();
  const [filter, setFilter] = useState<WorkstreamType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSites = useMemo(() => {
    let result = sites;
    
    if (filter !== 'all') {
      result = result.filter(s => s.blockingWorkstream === filter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.siteName.toLowerCase().includes(q) ||
        s.siteNumber.includes(q) ||
        s.country.toLowerCase().includes(q)
      );
    }
    
    return result.slice(0, maxItems);
  }, [sites, filter, searchQuery, maxItems]);

  const getBlockerColor = (ws: WorkstreamType): string => {
    const meta = WORKSTREAM_META[ws];
    const colorMap: Record<string, string> = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      purple: 'text-purple-400',
      amber: 'text-amber-400',
      teal: 'text-teal-400',
      cyan: 'text-cyan-400',
      red: 'text-red-400',
    };
    return colorMap[meta.color] || 'text-text-muted';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-text-primary">Blocked Sites ({sites.length})</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => toast.success('Study startup action recorded — site notified')}>
            View All Sites
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <SearchInput
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-xs"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as WorkstreamType | 'all')}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Workstreams</option>
            {Object.values(WORKSTREAM_META).map(ws => (
              <option key={ws.type} value={ws.type}>{ws.shortName}</option>
            ))}
          </select>
        </div>
        
        {/* Sites list */}
        <div className="space-y-2">
          {filteredSites.map((site) => {
            const meta = WORKSTREAM_META[site.blockingWorkstream];
            
            return (
              <button
                key={site.siteId}
                onClick={() => onSiteClick(site.siteId)}
                className="w-full flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-surface-card transition-colors text-left group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {site.isOverdue ? (
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-text-muted">Site {site.siteNumber}</span>
                      <span className="text-sm font-medium text-text-primary truncate">{site.siteName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />
                      <span>{site.country}</span>
                      <span>•</span>
                      <span className={getBlockerColor(site.blockingWorkstream)}>{meta.shortName}</span>
                      <span>•</span>
                      <span>{site.daysBlocked}d blocked</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">{site.plannedSubjects}</div>
                    <div className="text-[10px] text-text-muted">subjects</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
        
        {filteredSites.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No blocked sites matching filters</p>
          </div>
        )}
        
        {sites.length > maxItems && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => toast.success('Study startup action recorded — site notified')}>
              Show {sites.length - maxItems} more sites
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ACTIVATION PROGRESS RING
// =============================================================================

interface ActivationProgressProps {
  active: number;
  pending: number;
  blocked: number;
  total: number;
  predictedDate: string;
  targetDate: string;
  daysToTarget: number;
  isOnTrack: boolean;
}

function ActivationProgress({
  active,
  pending,
  blocked,
  total,
  predictedDate,
  targetDate,
  daysToTarget,
  isOnTrack,
}: ActivationProgressProps) {
  const activePercent = (active / total) * 100;
  const pendingPercent = (pending / total) * 100;
  const blockedPercent = (blocked / total) * 100;
  
  // SVG ring calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const activeStroke = (activePercent / 100) * circumference;
  const pendingStroke = (pendingPercent / 100) * circumference;
  const blockedStroke = (blockedPercent / 100) * circumference;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-surface"
              />
              {/* Blocked (red) */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${blockedStroke} ${circumference}`}
                strokeDashoffset={0}
                className="text-red-500"
              />
              {/* Pending (amber) */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${pendingStroke} ${circumference}`}
                strokeDashoffset={-blockedStroke}
                className="text-amber-500"
              />
              {/* Active (green) */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${activeStroke} ${circumference}`}
                strokeDashoffset={-(blockedStroke + pendingStroke)}
                className="text-emerald-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-text-primary">{active}</span>
              <span className="text-[10px] text-text-muted">of {total}</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex-1 space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-text-muted">{active} Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-text-muted">{pending} Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-text-muted">{blocked} Blocked</span>
              </div>
            </div>
            
            {/* Predicted date */}
            <div className="bg-surface rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Predicted All Sites Active</span>
                <Badge color={isOnTrack ? 'green' : 'amber'} size="xs">
                  {isOnTrack ? 'On Track' : 'At Risk'}
                </Badge>
              </div>
              <div className="text-lg font-semibold text-text-primary">{predictedDate}</div>
            </div>
            
            {/* Days to target */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Days to Target FPFV</span>
              <span className="font-medium text-text-primary">{daysToTarget} days</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// MOCK STUDY LIST — multi-study selector (v0.125.28)
// =============================================================================

const MOCK_STARTUP_STUDIES = [
  {
    protocolNumber: 'ENDURA-1',
    studyTitle: 'ENDURA-1 Phase IIIA — Pulmonary Disease, Chronic Obstructive',
    phase: 'Phase 3',
    status: 'Enrolling',
  },
  {
    protocolNumber: 'ENDURA-2',
    studyTitle: 'ENDURA-2 Phase IIb — COPD Dose Optimisation',
    phase: 'Phase 2b',
    status: 'Active',
  },
  {
    protocolNumber: 'RHEUM-301',
    studyTitle: 'RHEUM-301 Phase III — Psoriatic Arthritis Maintenance',
    phase: 'Phase 3',
    status: 'Enrolling',
  },
];

// =============================================================================
// MAIN ORCHESTRATOR SCREEN
// =============================================================================

export function StudyStartupOrchestratorScreen() {
  const { deadClick } = useDeadClick();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const [studyStartup] = useState(mockStudyStartupState);
  const [activeView, setActiveView] = useState<'overview' | 'protocol'>('overview');
  const [selectedStudyIdx, setSelectedStudyIdx] = useState(0);
  const [studySelectorOpen, setStudySelectorOpen] = useState(false);
  const selectedStudy = MOCK_STARTUP_STUDIES[selectedStudyIdx];

  // Workstreams as array for grid
  const workstreamList = Object.values(studyStartup.workstreams);

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-surface-elevated">
        <Breadcrumb
          items={[
            { label: 'CTMS', href: '#' },
            { label: 'Study Start-Up', href: '#' },
            { label: studyStartup.protocolNumber },
          ]}
        />
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              Study Start-Up Orchestrator
            </h1>
            {/* Study selector */}
            <div className="relative mt-1">
              <button
                onClick={() => setStudySelectorOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors group"
              >
                <span>{selectedStudy.studyTitle}</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-transform" style={{transform: studySelectorOpen ? 'rotate(180deg)' : 'none'}} />
              </button>
              {studySelectorOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-surface-elevated border border-border rounded-lg shadow-lg min-w-[340px] py-1">
                  {MOCK_STARTUP_STUDIES.map((study, idx) => (
                    <button
                      key={study.protocolNumber}
                      onClick={() => { setSelectedStudyIdx(idx); setStudySelectorOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-card transition-colors ${idx === selectedStudyIdx ? 'text-accent-teal bg-accent-teal/5' : 'text-text-secondary'}`}
                    >
                      <div className="font-medium text-text-primary">{study.protocolNumber}</div>
                      <div className="text-xs text-text-muted mt-0.5">{study.phase} · {study.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-surface rounded-lg p-1 mr-2">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeView === 'overview'
                    ? 'bg-accent-teal/20 text-accent-teal'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveView('protocol')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeView === 'protocol'
                    ? 'bg-accent-teal/20 text-accent-teal'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Protocol Design
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toast.success('Study startup action recorded — site notified')}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Badge color="gray" size="sm">
              Last updated: {new Date(studyStartup.lastUpdated).toLocaleTimeString()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 md:space-y-6">
        {activeView === 'overview' ? (
          <>
            {/* OVERVIEW TAB CONTENT */}

        {/* Critical Blocker Banner */}
        {studyStartup.criticalBlocker && (
          <CriticalBlockerBanner
            blocker={studyStartup.criticalBlocker}
            onViewTask={() => setActiveModule('action-center')}
            onDismiss={() => { /* Dismiss */ }}
          />
        )}

        {/* Progress + Milestones Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <ActivationProgress
            active={studyStartup.sitesActive}
            pending={studyStartup.sitesPending}
            blocked={studyStartup.sitesBlocked}
            total={studyStartup.sitesTotal}
            predictedDate={studyStartup.predictedActivationDate}
            targetDate={studyStartup.targetFPFVDate}
            daysToTarget={studyStartup.daysToFPFV}
            isOnTrack={studyStartup.isOnTrack}
          />
          <div className="col-span-1 md:col-span-2">
            <MilestoneTimelineRow milestones={mockTimelineState.milestones} />
          </div>
        </div>

        {/* Workstream Cards */}
        <div>
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Workstream Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            {workstreamList.map((ws) => (
              <WorkstreamCard
                key={ws.type}
                workstream={ws}
                onClick={() => setActiveModule('action-center')}
              />
            ))}
          </div>
        </div>

        {/* Blocked Sites */}
        <BlockedSitesList
          sites={studyStartup.blockedSites}
          onSiteClick={() => { /* Site clicked */ }}
          maxItems={10}
        />

        {/* Country Breakdown + KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <CountryBreakdown 
            sites={studyStartup.blockedSites}
            totalSites={studyStartup.sitesTotal}
            activeSites={studyStartup.sitesActive}
          />
          <KPIVariancePanel
            enrollment={{
              participants: mockTimelineState.currentSnapshot?.enrollment?.participants || { actual: 61, target: 160, planned: 80 },
              sites: mockTimelineState.currentSnapshot?.enrollment?.sites || { activated: 12, target: 35, planned: 20 },
            }}
            budget={{
              spent: mockTimelineState.currentSnapshot?.kpis?.budgetSpent || 1200000,
              total: mockTimelineState.currentSnapshot?.kpis?.budgetTotal || 3000000,
            }}
          />
        </div>

        {/* Site Activation Projection Chart */}
        <SiteActivationChart projections={studyStartup.activationProjections} />
          </>
        ) : (
          <>
            {/* PROTOCOL DESIGN TAB CONTENT */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Amendment History Sidebar */}
              <div className="col-span-1">
                <ProtocolAmendmentSidebar amendments={mockProtocolAmendments} />
              </div>
              
              {/* Protocol Design Diagram */}
              <div className="col-span-3 space-y-4 md:space-y-6">
                <ProtocolDesignDiagram 
                  arms={mockProtocolArms}
                  cohorts={mockProtocolCohorts}
                />
                
                {/* Cohort Gantt Chart */}
                <CohortGanttChart 
                  cohorts={mockProtocolCohorts}
                  arms={mockProtocolArms}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SITE ACTIVATION CHART
// =============================================================================

interface SiteActivationChartProps {
  projections: typeof mockStudyStartupState.activationProjections;
}

function SiteActivationChart({ projections }: SiteActivationChartProps) {
  const chartData = projections.map(p => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    activated: p.cumulativeActivated,
    weekly: p.sitesActivated,
    isProjected: p.isProjected,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-text-primary">Site Activation Timeline</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-text-muted">Actual</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/50" />
              <span className="text-text-muted">Projected</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-1">
          {chartData.map((d, i) => {
            const maxValue = Math.max(...chartData.map(c => c.activated));
            const height = (d.activated / maxValue) * 100;
            const today = chartData.findIndex(c => !c.isProjected && chartData[c.isProjected ? i : i + 1]?.isProjected);
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-text-muted">{d.activated}</div>
                <div 
                  className={`w-full rounded-t transition-all ${
                    d.isProjected 
                      ? 'bg-gradient-to-t from-blue-600/30 to-blue-500/50' 
                      : 'bg-gradient-to-t from-emerald-600 to-emerald-500'
                  }`}
                  style={{ height: `${height}%`, minHeight: '8px' }}
                />
                <div className="text-[9px] text-text-muted whitespace-nowrap">{d.date}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COUNTRY BREAKDOWN CARDS
// =============================================================================

interface CountryBreakdownProps {
  sites: typeof mockStudyStartupState.blockedSites;
  totalSites: number;
  activeSites: number;
}

function CountryBreakdown({ sites, totalSites, activeSites }: CountryBreakdownProps) {
  // Group sites by country
  const { deadClick } = useDeadClick();
  const countryData = useMemo(() => {
    const countries: Record<string, { 
      name: string; 
      total: number; 
      active: number; 
      blocked: number; 
      subjects: number;
      blockedSites: typeof sites;
    }> = {};
    
    // Add blocked sites
    sites.forEach(site => {
      if (!countries[site.country]) {
        countries[site.country] = { 
          name: site.country, 
          total: 0, 
          active: 0, 
          blocked: 0, 
          subjects: 0,
          blockedSites: [] 
        };
      }
      countries[site.country].blocked++;
      countries[site.country].subjects += site.plannedSubjects;
      countries[site.country].blockedSites.push(site);
    });
    
    // Estimate totals (blocked + active sites per country from general distribution)
    const countryList = Object.values(countries);
    const avgSitesPerCountry = Math.ceil(totalSites / Math.max(countryList.length, 1));
    
    countryList.forEach(c => {
      c.total = Math.max(c.blocked + 1, Math.min(avgSitesPerCountry, c.blocked + 3));
      c.active = c.total - c.blocked;
    });
    
    return countryList.sort((a, b) => b.blocked - a.blocked);
  }, [sites, totalSites]);

  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-text-primary">Country Breakdown</h3>
          <Badge color="gray" size="xs">{countryData.length} countries</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {countryData.slice(0, 6).map(country => {
            const progressPercent = ((country.total - country.blocked) / country.total) * 100;
            const isExpanded = expandedCountry === country.name;
            
            return (
              <button
                key={country.name}
                onClick={() => setExpandedCountry(isExpanded ? null : country.name)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  isExpanded 
                    ? 'bg-surface-elevated border-accent-teal ring-1 ring-accent-teal/30' 
                    : 'bg-surface-card border-border hover:border-accent-teal/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{country.name}</span>
                  {country.blocked > 0 && (
                    <Badge color="red" size="xs">{country.blocked} blocked</Badge>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{country.total - country.blocked}/{country.total} sites</span>
                  <span>{country.subjects} subjects</span>
                </div>
                
                {/* Expanded view - show blocked sites */}
                {isExpanded && country.blockedSites.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {country.blockedSites.map(site => (
                      <div key={site.siteId} className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{site.siteNumber} - {site.siteName.slice(0, 20)}...</span>
                        <Badge 
                          color={site.isOverdue ? 'red' : 'amber'} 
                          size="xs"
                        >
                          {site.daysBlocked}d
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {countryData.length > 6 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => toast.success('Study startup action recorded — site notified')}>
              View all {countryData.length} countries
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// KPI VARIANCE PANEL
// =============================================================================

interface KPIVariancePanelProps {
  enrollment: {
    participants: { actual: number; target: number; planned: number };
    sites: { activated: number; target: number; planned: number };
  };
  budget: {
    spent: number;
    total: number;
  };
}

function KPIVariancePanel({ enrollment, budget }: KPIVariancePanelProps) {
  const participantVariance = enrollment.participants.planned > 0 
    ? ((enrollment.participants.actual - enrollment.participants.planned) / enrollment.participants.planned) * 100 
    : 0;
  const siteVariance = enrollment.sites.activated > 0 && enrollment.sites.planned > 0
    ? ((enrollment.sites.activated - enrollment.sites.planned) / enrollment.sites.planned) * 100 
    : 0;
  const budgetVariance = ((budget.spent / budget.total) * 100) - 40; // Assuming 40% planned spend at this point

  const kpis = [
    {
      label: 'Participants',
      actual: enrollment.participants.actual,
      target: enrollment.participants.target,
      variance: participantVariance,
      format: (v: number) => v.toFixed(0),
    },
    {
      label: 'Sites Activated',
      actual: enrollment.sites.activated,
      target: enrollment.sites.target,
      variance: siteVariance,
      format: (v: number) => v.toFixed(0),
    },
    {
      label: 'Budget Spent',
      actual: budget.spent,
      target: budget.total,
      variance: budgetVariance,
      format: (v: number) => `£${(v / 1000000).toFixed(1)}M`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-text-primary">KPIs vs Plan</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {kpis.map(kpi => {
            const isPositive = kpi.variance >= 0;
            const progressPercent = (kpi.actual / kpi.target) * 100;
            
            return (
              <div key={kpi.label} className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {kpi.format(kpi.actual)}
                </div>
                <div className="text-xs text-text-muted mb-2">
                  of {kpi.format(kpi.target)} {kpi.label}
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-surface rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      progressPercent >= 90 ? 'bg-emerald-500' :
                      progressPercent >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                
                {/* Variance badge */}
                <Badge 
                  color={isPositive ? 'green' : 'red'} 
                  size="xs"
                  className="font-mono"
                >
                  {isPositive ? '+' : ''}{kpi.variance.toFixed(1)}%
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PROTOCOL AMENDMENT SIDEBAR (v0.37.1)
// =============================================================================

interface ProtocolAmendmentSidebarProps {
  amendments: ProtocolAmendment[];
}

function ProtocolAmendmentSidebar({ amendments }: ProtocolAmendmentSidebarProps) {
  const sortedAmendments = [...amendments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-text-primary">Amendment History</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-0">
            {sortedAmendments.map((amendment, idx) => (
              <div 
                key={amendment.version}
                className={`relative pl-12 pr-4 py-3 border-b border-border last:border-b-0 ${
                  amendment.status === 'approved' ? 'bg-emerald-500/5' : 
                  amendment.status === 'pending' ? 'bg-amber-500/5' : ''
                }`}
              >
                {/* Timeline dot */}
                <div className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 border-white ${
                  amendment.status === 'approved' ? 'bg-emerald-500' :
                  amendment.status === 'pending' ? 'bg-amber-500' : 'bg-slate-500'
                }`} />
                
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-text-primary">v{amendment.version}</span>
                  <Badge 
                    color={amendment.status === 'approved' ? 'green' : amendment.status === 'pending' ? 'amber' : 'gray'}
                    size="xs"
                  >
                    {amendment.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-text-muted mb-1">
                  {new Date(amendment.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-text-secondary">{amendment.summary}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PROTOCOL DESIGN DIAGRAM (v0.37.1)
// Visual representation of study arms and phases
// =============================================================================

interface ProtocolDesignDiagramProps {
  arms: ProtocolArm[];
  cohorts: ProtocolCohort[];
}

function ProtocolDesignDiagram({ arms, cohorts }: ProtocolDesignDiagramProps) {
  const armTypeColors = {
    experimental: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
    comparator: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30' },
    placebo: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500/30' },
  };

  const cohortStatusColors = {
    recruiting: 'bg-emerald-500',
    active: 'bg-blue-500',
    'follow-up': 'bg-amber-500',
    completed: 'bg-slate-500',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-text-primary">Protocol Design</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-text-muted">Experimental</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-text-muted">Comparator</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Phase indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            <Badge color="purple" size="sm">Phase IIIA</Badge>
            <ArrowRight className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted">Randomized, Open-Label, Multi-Center</span>
          </div>
        </div>

        {/* Arms flow diagram */}
        <div className="space-y-4">
          {arms.map((arm) => {
            const colors = armTypeColors[arm.type];
            const armCohorts = cohorts.filter(c => c.armId === arm.id);
            const progressPercent = (arm.actualEnrollment / arm.targetEnrollment) * 100;
            
            return (
              <div key={arm.id} className={`border rounded-lg p-4 ${colors?.border ?? ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded ${colors?.bg ?? ''}`} />
                      <span className="text-sm font-semibold text-text-primary">{arm.shortName}</span>
                      <Badge color={arm.status === 'active' ? 'green' : 'gray'} size="xs">
                        {arm.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-muted">{arm.dosing}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-primary">
                      {arm.actualEnrollment}/{arm.targetEnrollment}
                    </div>
                    <div className="text-[10px] text-text-muted">enrolled</div>
                  </div>
                </div>
                
                {/* Enrollment progress */}
                <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full ${colors?.bg ?? ''}`}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>

                {/* Cohorts */}
                <div className="flex gap-2 flex-wrap">
                  {armCohorts.map(cohort => (
                    <div 
                      key={cohort.id}
                      className="flex items-center gap-2 px-2 py-1 bg-surface rounded text-xs"
                    >
                      <div className={`w-2 h-2 rounded-full ${cohortStatusColors[cohort.status]}`} />
                      <span className="text-text-secondary">{cohort.name.split(' ').slice(-1)[0]}</span>
                      <span className="text-text-muted">{cohort.enrolled}/{cohort.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COHORT GANTT CHART (v0.37.1)
// Horizontal timeline showing cohort progression
// =============================================================================

interface CohortGanttChartProps {
  cohorts: ProtocolCohort[];
  arms: ProtocolArm[];
}

function CohortGanttChart({ cohorts, arms }: CohortGanttChartProps) {
  // Calculate timeline range
  const allDates = cohorts.flatMap(c => [new Date(c.startDate), new Date(c.endDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const today = new Date('2026-01-29');
  const todayPosition = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;

  const getArmColor = (armId: string) => {
    const arm = arms.find(a => a.id === armId);
    if (!arm) return 'bg-slate-500';
    return arm.type === 'experimental' ? 'bg-blue-500' : 
           arm.type === 'comparator' ? 'bg-purple-500' : 'bg-slate-500';
  };

  const formatMonth = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

  // Generate month markers
  const monthMarkers: { label: string; position: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor <= maxDate) {
    const position = ((cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
    monthMarkers.push({ label: formatMonth(cursor), position });
    cursor.setMonth(cursor.getMonth() + 3); // Quarterly markers
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-text-primary">Cohort Timeline</h3>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month axis */}
        <div className="relative h-6 mb-2 border-b border-border">
          {monthMarkers.map(({ label, position }) => (
            <div
              key={label}
              className="absolute transform -translate-x-1/2 text-[10px] text-text-muted"
              style={{ left: `${position}%` }}
            >
              <div className="w-px h-2 bg-border mx-auto mb-0.5" />
              {label}
            </div>
          ))}
        </div>

        {/* Gantt bars */}
        <div className="space-y-2 relative">
          {/* Today marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[9px] text-amber-400 whitespace-nowrap">
              Today
            </div>
          </div>

          {cohorts.map(cohort => {
            const startDays = (new Date(cohort.startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const endDays = (new Date(cohort.endDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const left = (startDays / totalDays) * 100;
            const width = ((endDays - startDays) / totalDays) * 100;
            const progressPercent = (cohort.enrolled / cohort.target) * 100;
            
            return (
              <div key={cohort.id} className="flex items-center gap-3 h-8">
                {/* Label */}
                <div className="w-32 flex-shrink-0 text-xs text-text-secondary truncate" title={cohort.name}>
                  {cohort.name.split(' ').slice(-1)[0]}
                </div>
                
                {/* Bar container */}
                <div className="flex-1 relative h-6">
                  {/* Bar */}
                  <div
                    className={`absolute h-full rounded ${getArmColor(cohort.armId)} opacity-30`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                  {/* Progress fill */}
                  <div
                    className={`absolute h-full rounded ${getArmColor(cohort.armId)}`}
                    style={{ left: `${left}%`, width: `${width * (progressPercent / 100)}%` }}
                  />
                  
                  {/* Interim analysis marker */}
                  {cohort.interimAnalysis && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-purple-500"
                      style={{ 
                        left: `${((new Date(cohort.interimAnalysis).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100}%` 
                      }}
                    >
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full" />
                    </div>
                  )}
                  
                  {/* Enrollment count inside bar */}
                  <div
                    className="absolute h-full flex items-center px-2 text-[10px] text-white font-medium"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {cohort.enrolled}/{cohort.target}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Interim Analysis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded bg-blue-500/30" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded bg-blue-500" />
            <span>Enrolled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudyStartupOrchestratorScreen;
