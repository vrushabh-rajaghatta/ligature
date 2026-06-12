

import { useState, useMemo, useEffect } from 'react';
import { AlertCard } from '@/components/ui/AlertCard';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { LabeledProgress } from '@/components/ui/Progress';
// v0.27.4: Drillable stats for demo polish
import { DrillableStatCard, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { CompactStatBar } from '@/components/ui/CompactStatBar';
import { StatCardGridSkeleton, CardSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { ActivityFeed, CriticalActivityAlert } from '@/components/ui/ActivityFeed';
import { useActivityStore, useRecentActivity } from '@/store/useActivityStore';
import { alerts } from '@/data/mock';
import { FilterState } from '@/components/layout/FilterBar';
// v0.35.0: Collapsible sections with persisted state
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import {
  usePrograms, useApplications, useMilestones, useProgramsWithStats,
  usePortfolioStore, ProgramStatus, DevelopmentStage
} from '@/stores/portfolio-store';
import { ProgramDetailScreen } from './ProgramDetailScreen';
// v0.118.0: End-to-end R&D Timeline screen
import { RdTimelineScreen } from './RdTimelineScreen';
import {
  usePortfolioOverview,
  usePortfolioAlerts,
  useProgramHAQStatus,
  SubmissionReadiness,
  PortfolioAlert,
  ProgramHAQStatus,
} from '@/store/usePortfolioHAQIntegration';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
// v141: Responsive utilities
import { useIsMobile, useIsTablet, useResponsive } from '@/hooks/useResponsive';
// v0.43.8: ScrollableTabs for responsive tab bars
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
// v0.12.0: Role-aware dashboard
// v0.44.2: RoleAwareDashboard removed (role filtering stripped)
import { useAppStore } from '@/store/useAppStore';
import type { ModuleId } from '@/types/core';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
// v0.12.3: Quick actions for StatCard contextual buttons
import { useQuickActions, getPrimaryActionForTask, getSecondaryActionsForTask } from '@/hooks/useQuickActions';
import { QuickActionDrawer } from '@/components/ui/QuickActionDrawer';
import {
  TrendingUp, Calendar, Clock, AlertTriangle, CheckCircle, Send, FileText,
  Users, ChevronRight, Target, Zap, Activity, Building2, Pill, Microscope, Plus, Search,
  MessageSquare, Package, AlertCircle, CircleDot, Workflow, Link2, Shield, Database,
  LayoutDashboard, Factory, Truck, Tag, BookOpen, FolderOpen, Stethoscope, Check, Radio
} from 'lucide-react';
// v0.6.3: Cascade Command Center imports
import {
  unifiedCascades, cascadeTypeMeta, moduleMetadata,
  getCascadeCommandStats, getUnifiedCriticalActions, getModuleImpactSummary,
  getPriorityActionQueue, getRecentUnifiedActivity, UnifiedCascade, UnifiedCascadeAction,
  crossCascadeDependencies, CascadeType
} from '@/data/cascade-command-data';
// v0.27.47: Cross-module event components
// v0.27.75: Added LivePipelineSpotlight for dramatic pipeline visualization
import { CrossModuleEventFeedPanel } from '@/components/cross-module/CrossModuleEventFeedPanel';
import { PipelineOrchestratorPanel } from '@/components/cross-module/PipelineOrchestratorPanel';
import { LivePipelineSpotlight } from '@/components/cross-module/LivePipelineSpotlight';
import { useDeadClick } from '@/hooks/useDeadClick';
// v0.27.64: Removed — demo dashboard stripped from inline screens

// v0.6.3: Portfolio view types; v0.118.0: added r&d-timeline
type PortfolioView = 'dashboard' | 'cascade-command' | 'rd-timeline';

interface PortfolioScreenProps {
  filters?: FilterState;
}

interface SubmissionEvent {
  date: string;
  type: 'submission' | 'response' | 'approval' | 'meeting';
  title: string;
  program: string;
  region: string;
  daysUntil: number;
}

const phaseColors: Record<DevelopmentStage, string> = {
  Discovery: 'bg-slate-500',
  Preclinical: 'bg-indigo-500',
  'IND-Enabling': 'bg-violet-500',
  'Phase 1': 'bg-violet-500',
  'Phase 1/2': 'bg-violet-400',
  'Phase 2': 'bg-accent-teal',
  'Phase 2/3': 'bg-cyan-500',
  'Phase 3': 'bg-accent-blue',
  'NDA/BLA Filed': 'bg-accent-amber',
  Approved: 'bg-accent-green',
  'Post-Marketing': 'bg-emerald-500',
};

const phaseLabels: Record<DevelopmentStage, string> = {
  Discovery: 'Discovery',
  Preclinical: 'Preclinical',
  'IND-Enabling': 'IND-Enabling',
  'Phase 1': 'Phase 1',
  'Phase 1/2': 'Phase 1/2',
  'Phase 2': 'Phase 2',
  'Phase 2/3': 'Phase 2/3',
  'Phase 3': 'Phase 3',
  'NDA/BLA Filed': 'Filed',
  Approved: 'Approved',
  'Post-Marketing': 'Post-Market',
};

const statusColors: Record<ProgramStatus, string> = {
  'on-track': 'text-accent-green',
  'at-risk': 'text-accent-amber',
  'delayed': 'text-accent-red',
  'ahead': 'text-accent-blue',
  'on-hold': 'text-slate-400',
  'terminated': 'text-slate-500',
};

const statusIcons: Record<ProgramStatus, React.ReactNode> = {
  'on-track': <CheckCircle className="w-4 h-4" />,
  'at-risk': <AlertTriangle className="w-4 h-4" />,
  'delayed': <Clock className="w-4 h-4" />,
  'ahead': <TrendingUp className="w-4 h-4" />,
  'on-hold': <Clock className="w-4 h-4" />,
  'terminated': <AlertTriangle className="w-4 h-4" />,
};

const eventTypeStyles: Record<SubmissionEvent['type'], { bg: string; icon: React.ReactNode }> = {
  submission: { bg: 'bg-accent-blue/20 text-accent-blue', icon: <Send className="w-4 h-4" /> },
  response: { bg: 'bg-accent-amber/20 text-accent-amber', icon: <FileText className="w-4 h-4" /> },
  approval: { bg: 'bg-accent-green/20 text-accent-green', icon: <CheckCircle className="w-4 h-4" /> },
  meeting: { bg: 'bg-accent-purple/20 text-accent-purple', icon: <Users className="w-4 h-4" /> },
};

const readinessConfig: Record<SubmissionReadiness, { label: string; color: string; icon: React.ReactNode }> = {
  'ready': { label: 'Ready', color: 'bg-accent-green/20 text-accent-green', icon: <CheckCircle className="w-3 h-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-accent-blue/20 text-accent-blue', icon: <Activity className="w-3 h-3" /> },
  'blocked': { label: 'Blocked', color: 'bg-accent-red/20 text-accent-red', icon: <AlertTriangle className="w-3 h-3" /> },
  'pending-review': { label: 'Review', color: 'bg-accent-amber/20 text-accent-amber', icon: <Clock className="w-3 h-3" /> },
  'not-applicable': { label: 'N/A', color: 'bg-slate-500/20 text-slate-400', icon: <CircleDot className="w-3 h-3" /> },
};

const alertSeverityColors: Record<string, string> = {
  'critical': 'border-accent-red bg-accent-red/5',
  'warning': 'border-accent-amber bg-accent-amber/5',
  'info': 'border-accent-blue bg-accent-blue/5',
};

const alertTypeIcons: Record<string, React.ReactNode> = {
  'overdue': <AlertTriangle className="w-4 h-4 text-accent-red" />,
  'due-soon': <Clock className="w-4 h-4 text-accent-amber" />,
  'unassigned': <Users className="w-4 h-4 text-accent-red" />,
  'blocked': <AlertCircle className="w-4 h-4 text-accent-red" />,
  'ready': <CheckCircle className="w-4 h-4 text-accent-green" />,
};

const resourceCapacity = {
  regulatory: { allocated: 85, capacity: 100 },
  medWriting: { allocated: 95, capacity: 100 },
  cmc: { allocated: 70, capacity: 100 },
  clinical: { allocated: 60, capacity: 100 },
  publishing: { allocated: 45, capacity: 100 },
};

// Component for HAQ Status Badge on program cards
function ProgramHAQBadge({ programId }: { programId: string }) {
  const programStatus = useProgramHAQStatus(programId);
  
  if (!programStatus || programStatus.aggregateHAQSummary.total === 0) {
    return null;
  }
  
  const { aggregateHAQSummary, aggregateCorrespondenceSummary, overallReadiness, urgentItems } = programStatus;
  const readinessStyle = readinessConfig[overallReadiness];
  
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <MessageSquare className="w-3.5 h-3.5 text-accent-purple" />
        <span className="text-text-muted">HAQs:</span>
        <span className="text-text-primary font-medium">{aggregateHAQSummary.total}</span>
        {aggregateHAQSummary.overdue > 0 && (
          <Badge color="red" size="xs">{aggregateHAQSummary.overdue} overdue</Badge>
        )}
        {aggregateHAQSummary.criticalOpen > 0 && (
          <Badge color="amber" size="xs">{aggregateHAQSummary.criticalOpen} critical</Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        <Package className="w-3.5 h-3.5 text-accent-teal" />
        <span className="text-text-muted">Correspondence:</span>
        <span className="text-text-primary font-medium">{aggregateCorrespondenceSummary.total}</span>
        {aggregateCorrespondenceSummary.readyForSubmission > 0 && (
          <Badge color="green" size="xs">{aggregateCorrespondenceSummary.readyForSubmission} ready</Badge>
        )}
        {aggregateCorrespondenceSummary.inProgress > 0 && (
          <Badge color="blue" size="xs">{aggregateCorrespondenceSummary.inProgress} in progress</Badge>
        )}
      </div>
      
      {overallReadiness !== 'not-applicable' && (
        <div className="flex items-center gap-2">
          <Badge 
            color={overallReadiness === 'ready' ? 'green' : overallReadiness === 'blocked' ? 'red' : overallReadiness === 'pending-review' ? 'amber' : 'blue'} 
            size="xs"
            icon={readinessStyle.icon}
          >
            IR Readiness: {readinessStyle.label}
          </Badge>
          {urgentItems > 0 && (
            <span className="text-[10px] text-accent-amber">{urgentItems} urgent</span>
          )}
        </div>
      )}
    </div>
  );
}

// Component for portfolio-level HAQ alerts
function PortfolioAlertsPanel({ alerts, onAlertClick }: { alerts: PortfolioAlert[]; onAlertClick: (alert: PortfolioAlert) => void }) {
  if (alerts.length === 0) {
    return (
      <EmptyState 
        type="success" 
        size="sm"
        title="All Clear"
        description="No HAQ alerts - all items on track"
      />
    );
  }
  
  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {alerts.slice(0, 8).map((alert) => (
        <button
          key={alert.id}
          onClick={() => onAlertClick(alert)}
          className="w-full text-left"
        >
          <Card 
            variant="outlined"
            padding="sm"
            radius="md"
            accentColor={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}
            accentPosition="left"
            className={`${alertSeverityColors[alert.severity]} hover:brightness-95 transition-all cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {alertTypeIcons[alert.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{alert.programCode}</span>
                  <span className="text-xs text-text-muted">•</span>
                  <span className="text-xs text-text-muted">{alert.applicationNumber}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{alert.message}</p>
                {alert.dueDate && (
                  <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {alert.dueDate}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-accent-blue flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </button>
      ))}
      {alerts.length > 8 && (
        <p className="text-xs text-text-muted text-center py-2">
          + {alerts.length - 8} more alert{alerts.length - 8 !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export function PortfolioScreen({ filters }: PortfolioScreenProps) {
  const programsWithStats = useProgramsWithStats();
  const applications = useApplications();
  const milestones = useMilestones();
  const selectProgram = usePortfolioStore(s => s.selectProgram);
  
  // v41: Portfolio HAQ Integration
  const portfolioOverview = usePortfolioOverview();
  const portfolioAlerts = usePortfolioAlerts();
  
  // v111: Cross-module navigation
  const { navigateToHAQ, navigateToSubmissions } = useModuleNavigation();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // v0.12.3: Quick actions for StatCard contextual buttons
  const { 
    isDrawerOpen, 
    openDrawer, 
    closeDrawer, 
    drawerContext,
    executeAction, 
    getStatCardActions,
    navigateToSource 
  } = useQuickActions();
  
    const { deadClick } = useDeadClick();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // v0.6.3: Cascade Command Center view state
  const [activeView, setActiveView] = useState<PortfolioView>('dashboard');
  
  // v127: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);
  
  // v0.35.0: Collapsible dashboard sections
  const { isCollapsed, setCollapsed } = useCollapsedSections('portfolio');
  
  const filteredPrograms = useMemo(() => {
    let result = programsWithStats;
    
    if (filters?.therapeuticArea && filters.therapeuticArea !== 'all') {
      result = result.filter(p => p.therapeuticArea === filters.therapeuticArea);
    }
    if (filters?.modality && filters.modality !== 'all') {
      result = result.filter(p => p.modality === filters.modality);
    }
    if (filters?.stage && filters.stage !== 'all') {
      result = result.filter(p => p.stage === filters.stage);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.code.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.indication.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [programsWithStats, filters, searchQuery]);
  
  // v41: Enhanced metrics with HAQ data
  const metrics = useMemo(() => ({
    totalPrograms: { value: programsWithStats.length, label: 'Total Programs' },
    activeSubmissions: { value: applications.filter(a => a.status === 'Active' || a.status === 'Under Review').length, label: 'Active Submissions' },
    openHAQs: { value: portfolioOverview.totals.openHAQs, label: 'Open HAQs', highlight: portfolioOverview.totals.overdueHAQs > 0 },
    readyToSubmit: { value: portfolioOverview.totals.readyToSubmit, label: 'Ready to Submit', positive: true },
  }), [programsWithStats, applications, portfolioOverview]);

  // v0.27.4: Drillable stats with real data behind each metric
  const portfolioDrillableStats = useMemo(() => {
    const activeApps = applications.filter(a => a.status === 'Active' || a.status === 'Under Review');
    
    const stageBadgeColor: Record<string, 'blue' | 'purple' | 'teal' | 'amber' | 'green' | 'gray'> = {
      'Discovery': 'gray', 'Preclinical': 'purple', 'IND-Enabling': 'purple',
      'Phase 1': 'purple', 'Phase 1/2': 'purple', 'Phase 2': 'teal',
      'Phase 2/3': 'teal', 'Phase 3': 'blue', 'NDA/BLA Filed': 'amber',
      'Approved': 'green', 'Post-Marketing': 'green',
    };
    const statusBadgeColor: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
      'on-track': 'green', 'at-risk': 'amber', 'delayed': 'red', 'ahead': 'blue', 'on-hold': 'gray',
    };

    return [
      {
        id: 'total-programs',
        value: programsWithStats.length,
        label: 'Total Programs',
        accentColor: 'blue' as const,
        icon: <Target className="w-5 h-5" />,
        drilldown: {
          title: 'Development Programs',
          subtitle: `${programsWithStats.length} programs across all stages`,
          items: programsWithStats.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            stage: p.stage,
            status: p.status,
            therapeuticArea: p.therapeuticArea,
            modality: p.modality,
          })),
          columns: [
            { key: 'code', label: 'Code', width: 80, render: (v: string) => <span className="font-semibold text-accent-blue">{v}</span> },
            { key: 'name', label: 'Program', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'stage', label: 'Stage', width: 90, render: (v: string) => <Badge color={stageBadgeColor[v] || 'gray'} size="xs">{phaseLabels[v as DevelopmentStage] || v}</Badge> },
            { key: 'status', label: 'Status', width: 80, render: (v: string) => <Badge color={statusBadgeColor[v] || 'gray'} size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => handleProgramClick(item.id),
          searchable: true,
          searchPlaceholder: 'Search programs...',
        } as DrilldownConfig,
      },
      {
        id: 'active-submissions',
        value: activeApps.length,
        label: 'Active Submissions',
        accentColor: 'teal' as const,
        icon: <Send className="w-5 h-5" />,
        drilldown: {
          title: 'Active Submissions',
          subtitle: 'Submissions currently in progress with health authorities',
          items: activeApps.map(a => {
            const program = programsWithStats.find(p => p.id === a.programId);
            return {
              id: a.id,
              applicationNumber: a.applicationNumber,
              type: a.type,
              status: a.status,
              region: a.region,
              program: program?.code || 'Unknown',
              pdfuaDate: a.pdfuaDate,
            };
          }),
          columns: [
            { key: 'applicationNumber', label: 'App #', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'program', label: 'Program', width: 80, render: (v: string) => <span className="font-semibold text-accent-teal">{v}</span> },
            { key: 'type', label: 'Type', width: 60, render: (v: string) => <Badge color="blue" size="xs">{v}</Badge> },
            { key: 'region', label: 'Region', width: 50, render: (v: string) => <span>{v === 'US' ? '🇺🇸' : v === 'EU' ? '🇪🇺' : v}</span> },
            { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={v === 'Active' ? 'green' : 'amber'} size="xs">{v}</Badge> },
          ],
          onItemClick: () => navigateToSubmissions({ status: 'active' }),
          searchable: true,
        } as DrilldownConfig,
      },
      {
        id: 'open-haqs',
        value: portfolioOverview.totals.openHAQs,
        label: 'Open HAQs',
        accentColor: portfolioOverview.totals.overdueHAQs > 0 ? 'amber' as const : 'purple' as const,
        icon: <MessageSquare className="w-5 h-5" />,
        className: portfolioOverview.totals.overdueHAQs > 0 ? 'ring-1 ring-accent-amber' : '',
        drilldown: {
          title: 'Open Health Authority Questions',
          subtitle: `${portfolioOverview.totals.overdueHAQs} overdue, ${portfolioOverview.totals.criticalHAQs} critical`,
          items: portfolioOverview.programs.flatMap((p: ProgramHAQStatus) => 
            Array(p.aggregateHAQSummary.total).fill(null).map((_, i) => ({
              id: `${p.programId}-haq-${i}`,
              program: p.programName,
              status: i < p.aggregateHAQSummary.overdue ? 'overdue' : i < p.aggregateHAQSummary.overdue + p.aggregateHAQSummary.criticalOpen ? 'critical' : 'open',
            }))
          ).slice(0, 20),
          columns: [
            { key: 'program', label: 'Program', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'status', label: 'Status', width: 80, render: (v: string) => <Badge color={v === 'overdue' ? 'red' : v === 'critical' ? 'amber' : 'blue'} size="xs">{v}</Badge> },
          ],
          onItemClick: () => navigateToHAQ({ viewMode: 'dashboard' }),
        } as DrilldownConfig,
      },
      {
        id: 'ready-to-submit',
        value: portfolioOverview.totals.readyToSubmit,
        label: 'Ready to Submit',
        accentColor: 'green' as const,
        icon: <CheckCircle className="w-5 h-5" />,
        className: 'ring-1 ring-accent-green',
        drilldown: {
          title: 'HAQ Responses Ready to Submit',
          subtitle: 'Completed responses awaiting final submission',
          items: portfolioOverview.programs
            .filter((p: ProgramHAQStatus) => p.aggregateCorrespondenceSummary.readyForSubmission > 0)
            .map((p: ProgramHAQStatus) => ({
              id: p.programId,
              program: p.programName,
              ready: p.aggregateCorrespondenceSummary.readyForSubmission,
              total: p.aggregateHAQSummary.total,
            })),
          columns: [
            { key: 'program', label: 'Program', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'ready', label: 'Ready', width: 60, render: (v: number) => <Badge color="green" size="xs">{v}</Badge> },
            { key: 'total', label: 'Total', width: 60, render: (v: number) => <span className="text-text-muted">{v}</span> },
          ],
          onItemClick: () => navigateToHAQ({ status: 'draft-ready', viewMode: 'questions' }),
        } as DrilldownConfig,
      },
    ];
  }, [programsWithStats, applications, portfolioOverview, navigateToSubmissions, navigateToHAQ]);

  const upcomingEvents = useMemo((): SubmissionEvent[] => {
    const today = new Date();
    const events: SubmissionEvent[] = [];
    
    applications.forEach(app => {
      if (app.pdfuaDate) {
        const date = new Date(app.pdfuaDate);
        const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 180) {
          const program = programsWithStats.find(p => p.id === app.programId);
          events.push({
            date: app.pdfuaDate,
            type: 'approval',
            title: 'PDUFA Goal Date',
            program: program?.code || 'Unknown',
            region: app.region === 'US' ? '🇺🇸' : app.region === 'EU' ? '🇪🇺' : app.region,
            daysUntil,
          });
        }
      }
    });
    
    milestones.forEach(ms => {
      if (ms.status === 'planned' || ms.status === 'in-progress') {
        const date = new Date(ms.targetDate);
        const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 180) {
          const program = programsWithStats.find(p => p.id === ms.programId);
          events.push({
            date: ms.targetDate,
            type: ms.category === 'regulatory' ? 'submission' : 'meeting',
            title: ms.name,
            program: program?.code || 'Unknown',
            region: '🌐',
            daysUntil,
          });
        }
      }
    });
    
    return events.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  }, [applications, milestones, programsWithStats]);
  
  const handleProgramClick = (programId: string) => {
    selectProgram(programId);
    setSelectedProgramId(programId);
  };
  
  if (selectedProgramId) {
    return (
      <ProgramDetailScreen
        programId={selectedProgramId}
        onBack={() => {
          setSelectedProgramId(null);
          selectProgram(null);
        }}
      />
    );
  }
  
  // v141: Responsive state
  const isMobile = useIsMobile();
  const { compactMode } = useResponsive();
  
  // v0.12.3: Get primary action for drawer
  const drawerPrimaryAction = drawerContext?.task 
    ? getPrimaryActionForTask(drawerContext.task)
    : null;
  const drawerSecondaryActions = drawerContext?.task 
    ? getSecondaryActionsForTask(drawerContext.task)
    : [];
  
  return (
    <>
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6">
        {/* v115: Breadcrumb */}
        <Breadcrumb 
          moduleId="portfolio"
          className="mb-3 md:mb-4"
        />
        
        {/* v0.51.0: ScreenHeader adoption — standardized header */}
        <ScreenHeader
          title="Portfolio Command Center"
          subtitle="Real-time view of your regulatory portfolio · HAQ integration enabled"
          icon={<LayoutDashboard className="w-5 h-5" />}
          actions={
            <div className="flex items-center gap-2 sm:gap-3">
              <SearchInput
                placeholder={isMobile ? "Search..." : "Search programs..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full sm:w-48 lg:w-64"
              />
              <Button variant="primary" icon={<Plus className="w-4 h-4" onClick={() => toast.info('Portfolio action — use the filter bar to scope the view')} />} className="flex-shrink-0">
                {isMobile ? '' : 'New Program'}
              </Button>
            </div>
          }
        />

        {/* v0.43.8: ScrollableTabs for responsive tab bars */}
        <div className="mb-4 md:mb-6">
          <ScrollableTabs
            tabs={[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'cascade-command', label: 'Cascade Command', icon: <Workflow className="w-4 h-4" />, count: unifiedCascades.filter(c => c.status === 'active').length || undefined },
              { id: 'rd-timeline', label: 'R&D Timeline', icon: <Activity className="w-4 h-4" /> },
            ]}
            activeTab={activeView}
            onTabChange={(id) => setActiveView(id as PortfolioView)}
          />
        </div>

        {/* Dashboard View */}
        {activeView === 'dashboard' && (
        <>
        
        {/* v141: Responsive 12-col grid - stacks on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            {/* v127: Loading state for stats */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 bg-surface-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
            /* v0.36.7: Compact stat bar saves vertical space */
            <CompactStatBar 
              stats={portfolioDrillableStats.map(stat => ({
                id: stat.id,
                value: stat.value,
                label: stat.label,
                icon: stat.icon,
                color: stat.accentColor,
                drilldown: stat.drilldown,
                highlight: stat.className?.includes('ring-') || false,
              }))}
            />
            )}

            <Card variant="elevated" padding="lg" radius="lg">
              <CardHeader 
                title="Development Programs" 
                subtitle={`${filteredPrograms.length} programs`}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {filteredPrograms.map((program) => (
                  <Card
                    key={program.id}
                    variant="interactive"
                    padding="md"
                    radius="md"
                    onClick={() => handleProgramClick(program.id)}
                    className="group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${phaseColors[program.stage]}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">{program.code}</span>
                            <Badge color="gray" variant="soft" size="xs">
                              {phaseLabels[program.stage]}
                            </Badge>
                          </div>
                          <div className="text-sm text-text-secondary mt-0.5">{program.name}</div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${statusColors[program.status]}`}>
                        {statusIcons[program.status]}
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Pill className="w-4 h-4" />
                        <span className="truncate">{program.therapeuticArea}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{program.modality}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-text-secondary truncate">{program.indication}</div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {program.regions?.map((r, i) => (
                          <span key={i} className="text-sm">{r === 'US' ? '🇺🇸' : r === 'EU' ? '🇪🇺' : r === 'Japan' ? '🇯🇵' : '🌐'}</span>
                        ))}
                        {program.applicationCount > 0 && (
                          <span className="text-xs text-text-muted ml-2">{program.applicationCount} apps</span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-blue transition-colors" />
                    </div>
                    
                    {/* v41: HAQ Status Badge */}
                    <ProgramHAQBadge programId={program.id} />
                    
                    {(program.nextMilestone || program.nextMilestoneDate) && (
                      <div className="mt-3 flex items-center gap-2 bg-surface rounded-lg px-3 py-2 text-sm">
                        <Target className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <span className="text-text-primary truncate">
                          {typeof program.nextMilestone === 'object' ? program.nextMilestone.name : program.nextMilestone}
                        </span>
                        <span className="text-text-muted ml-auto flex-shrink-0">
                          {typeof program.nextMilestone === 'object' ? program.nextMilestone.targetDate : program.nextMilestoneDate}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
                
                {filteredPrograms.length === 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <EmptyState 
                      type="no-results"
                      size="md"
                      title="No programs found"
                      description="No programs match your current filters"
                      icon={<Microscope className="w-12 h-12" />}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* v141: Sidebar - hidden on mobile, shown on tablet as collapsed or full on lg */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            {/* v0.35.0: HAQ Alerts - Collapsible */}
            <CollapsibleSection
              title="HAQ Response Alerts"
              icon={<MessageSquare className="w-5 h-5 text-accent-purple" />}
              count={portfolioAlerts.length}
              defaultExpanded={!isCollapsed('haq-alerts')}
              onToggle={(expanded) => setCollapsed('haq-alerts', !expanded)}
              variant="card"
              size="sm"
            >
              <PortfolioAlertsPanel 
                alerts={portfolioAlerts} 
                onAlertClick={(alert) => {
                  // Navigate to HAQ module with appropriate filter based on alert type
                  const statusMap: Record<PortfolioAlert['type'], string | undefined> = {
                    'overdue': 'overdue',
                    'due-soon': 'in-progress',
                    'unassigned': 'open',
                    'blocked': 'in-progress',
                    'ready': 'draft-ready',
                  };
                  navigateToHAQ({ 
                    status: statusMap[alert.type],
                    viewMode: 'questions',
                  });
                }}
              />
            </CollapsibleSection>
            
            {/* v0.35.0: Upcoming Events - Collapsible */}
            <CollapsibleSection
              title="Upcoming Events"
              icon={<Calendar className="w-5 h-5 text-accent-blue" />}
              count={upcomingEvents.length}
              defaultExpanded={!isCollapsed('upcoming-events')}
              onToggle={(expanded) => setCollapsed('upcoming-events', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => {
                  const style = eventTypeStyles[event.type];
                  return (
                    <Card key={idx} variant="ghost" padding="sm" radius="md" className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style?.bg ?? ''}`}>{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{event.title}</div>
                        <div className="text-xs text-text-muted">{event.program} • {event.region}</div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          color={event.daysUntil <= 30 ? 'red' : event.daysUntil <= 60 ? 'amber' : 'gray'}
                          size="sm"
                        >
                          {event.daysUntil}d
                        </Badge>
                        <div className="text-xs text-text-muted mt-1">{event.date}</div>
                      </div>
                    </Card>
                  );
                }) : (
                  <EmptyState type="no-data" size="sm" title="No upcoming events" />
                )}
              </div>
            </CollapsibleSection>

            {/* v0.35.0: Resource Capacity - Collapsible */}
            <CollapsibleSection
              title="Resource Capacity"
              icon={<Users className="w-5 h-5 text-accent-purple" />}
              defaultExpanded={!isCollapsed('resource-capacity')}
              onToggle={(expanded) => setCollapsed('resource-capacity', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="space-y-4">
                {Object.entries(resourceCapacity).map(([dept, data]) => {
                  const percentage = (data.allocated / data.capacity) * 100;
                  const labels: Record<string, string> = { regulatory: 'Regulatory Affairs', medWriting: 'Medical Writing', cmc: 'CMC', clinical: 'Clinical Ops', publishing: 'Publishing' };
                  const color = percentage >= 90 ? 'red' : percentage >= 70 ? 'amber' : 'green';
                  return (
                    <LabeledProgress 
                      key={dept}
                      label={labels[dept]}
                      value={data.allocated}
                      max={data.capacity}
                      color={color}
                      size="sm"
                    />
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* v0.35.0: Executive Alerts - Collapsible */}
            <CollapsibleSection
              title="Executive Alerts"
              icon={<Zap className="w-5 h-5 text-accent-amber" />}
              count={alerts.length}
              defaultExpanded={!isCollapsed('executive-alerts')}
              onToggle={(expanded) => setCollapsed('executive-alerts', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="space-y-3">
                {alerts.slice(0, 4).map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onClick={() => {
                      const moduleMap: Record<string, ModuleId> = {
                        haq: 'haq',
                        submission: 'submissions-hub',
                        document: 'authoring',
                        study: 'ctms',
                        registration: 'submissions-hub',
                      };
                      const target = moduleMap[alert.entityType] ?? 'haq';
                      setActiveModule(target);
                    }}
                  />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* v127: Critical Activity Alert - shows only when critical events exist */}
        <div className="mt-6">
          <CriticalActivityAlert />
        </div>

        {/* v127: Dynamic Activity Feed - replaces static activity list */}
        <div className="mt-6">
          <ActivityFeed 
            limit={8}
            showHeader
            showFilters
            showChains
            isLoading={isLoading}
          />
        </div>
        </>
        )}

        {/* v0.6.3: Cascade Command Center View */}
        {activeView === 'cascade-command' && (
          <CascadeCommandCenter />
        )}

        {/* v0.118.0: R&D Timeline — cradle-to-grave lifecycle with portfolio overlay */}
        {activeView === 'rd-timeline' && (
          <div className="py-2">
            <RdTimelineScreen />
          </div>
        )}
      </div>
    </div>
    
    {/* v0.12.3: Quick Action Drawer for contextual actions */}
    <QuickActionDrawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      task={drawerContext?.task}
      primaryAction={drawerPrimaryAction ? {
        ...drawerPrimaryAction,
        onClick: () => {
          // Execute primary action then close
          if (drawerContext?.task) {
            navigateToSource();
          }
        }
      } : undefined}
      secondaryActions={drawerSecondaryActions.map(action => ({
        ...action,
        onClick: () => {
          if (action.id === 'view-full') {
            navigateToSource();
          }
        }
      }))}
      onNavigateToModule={navigateToSource}
    />
    </>
  );
}

// ============================================================================
// v0.6.3: Cascade Command Center Component
// "Three events. 127 actions. One command center. Zero spreadsheets."
// ============================================================================

function CascadeCommandCenter() {
  const [showCriticalActions, setShowCriticalActions] = useState(false);
  const [selectedCascadeId, setSelectedCascadeId] = useState<string | null>(null);
  const stats = getCascadeCommandStats();
  const criticalActions = getUnifiedCriticalActions();
  const moduleImpact = getModuleImpactSummary();
  const priorityQueue = getPriorityActionQueue();
  const recentActivity = getRecentUnifiedActivity(8);
  
  // v0.38.4: Navigate to module when clicking an action
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const handleActionClick = (action: UnifiedCascadeAction) => {
    if (action.linkedModule) {
      setActiveModule(action.linkedModule as ModuleId);
    }
  };

  const getModuleIcon = (module: string) => {
    switch(module) {
      case 'safety': return <AlertTriangle className="w-4 h-4" />;
      case 'clinical': return <Activity className="w-4 h-4" />;
      case 'ctms': return <Building2 className="w-4 h-4" />;
      case 'qms': return <Shield className="w-4 h-4" />;
      case 'supply-chain': return <Truck className="w-4 h-4" />;
      case 'manufacturing': return <Factory className="w-4 h-4" />;
      case 'labeling': return <Tag className="w-4 h-4" />;
      case 'authoring': return <FileText className="w-4 h-4" />;
      case 'submissions-hub': return <Send className="w-4 h-4" />;
      case 'publishing': return <BookOpen className="w-4 h-4" />;
      case 'haq': return <MessageSquare className="w-4 h-4" />;
      case 'regulatory': return <CheckCircle className="w-4 h-4" />;
      case 'tmf': return <FolderOpen className="w-4 h-4" />;
      case 'medical-affairs': return <Stethoscope className="w-4 h-4" />;
      default: return <CircleDot className="w-4 h-4" />;
    }
  };

  const getCascadeIcon = (type: CascadeType) => {
    switch(type) {
      case 'safety-signal': return <AlertTriangle className="w-5 h-5" />;
      case 'db-lock': return <Database className="w-5 h-5" />;
      case 'quality-event': return <Shield className="w-5 h-5" />;
      default: return <Workflow className="w-5 h-5" />;
    }
  };

  const getCascadeColor = (type: CascadeType) => {
    switch(type) {
      case 'safety-signal': return 'red';
      case 'db-lock': return 'green';
      case 'quality-event': return 'orange';
      default: return 'blue';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
    <div className="max-w-[1600px] mx-auto">
      {/* Hero Banner - The Capstone Moment */}
      <div className="mb-6 bg-gradient-to-r from-accent-purple/10 via-accent-blue/10 to-accent-teal/10 border border-accent-purple/30 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
              <Workflow className="w-6 h-6 sm:w-8 sm:h-8 text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Cascade Command Center</h1>
                <Badge color="purple" size="sm">UNIFIED VIEW</Badge>
                <Badge color="blue" size="sm">R&D Connected</Badge>
              </div>
              <p className="text-text-secondary mb-4 max-w-3xl text-sm sm:text-base">
                <span className="font-bold text-text-primary">{stats.totalCascades} events</span>. 
                <span className="font-bold text-accent-purple"> {stats.totalActions} actions</span>. 
                One command center. Zero spreadsheets. In legacy systems, coordination takes {stats.legacyComparison}. 
                In Ligature, it takes <span className="font-bold text-accent-green">{stats.avgResponseTime}</span>.
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-text-muted">{stats.activeCascades} Active Cascades</span>
                </div>
                <div>
                  <span className="text-text-muted">Critical Actions:</span>
                  <span className="ml-1 font-semibold text-accent-red">{stats.criticalActions}</span>
                </div>
                <div>
                  <span className="text-text-muted">Automation Rate:</span>
                  <span className="ml-1 font-semibold text-accent-green">{stats.automationRate}%</span>
                </div>
                <div>
                  <span className="text-text-muted">Modules:</span>
                  <span className="ml-1 font-semibold">{stats.modulesImpacted}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-4xl font-bold text-accent-purple">{stats.totalActions}</div>
            <div className="text-sm text-text-muted">Total Actions</div>
            <div className="mt-2 text-xs text-text-muted">
              {stats.completedActions} completed • {stats.totalActions - stats.completedActions} in progress
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
        <StatCard
          label="Response Time"
          value={stats.avgResponseTime}
          icon={<Clock className="w-5 h-5" />}
          accentColor="green"
        >
          <span className="text-xs text-accent-green">vs {stats.legacyComparison} legacy</span>
        </StatCard>
        <StatCard
          label="Active Cascades"
          value={stats.activeCascades}
          icon={<Workflow className="w-5 h-5" />}
          accentColor="purple"
        >
          <span className="text-xs text-text-muted">{stats.totalCascades} total</span>
        </StatCard>
        <StatCard
          label="Modules Impacted"
          value={stats.modulesImpacted}
          icon={<Link2 className="w-5 h-5" />}
          accentColor="blue"
        >
          <span className="text-xs text-text-muted">Cross-R&D connected</span>
        </StatCard>
        <StatCard
          label="Automation Rate"
          value={`${stats.automationRate}%`}
          icon={<Zap className="w-5 h-5" />}
          accentColor="teal"
        >
          <span className="text-xs text-text-muted">Auto-triggered</span>
        </StatCard>
        <StatCard
          label="Critical Actions"
          value={stats.criticalActions}
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="red"
          onClick={() => setShowCriticalActions(true)}
          clickHint="View all critical actions requiring attention"
        >
          <span className="text-xs text-text-muted">Requiring attention</span>
        </StatCard>
        <StatCard
          label="Completion"
          value={`${Math.round((stats.completedActions / stats.totalActions) * 100)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          accentColor="green"
        >
          <span className="text-xs text-text-muted">{stats.completedActions}/{stats.totalActions}</span>
        </StatCard>
      </div>

      {/* Active Cascades Grid */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Active Cascades</h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-red" />
                <span>Safety</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-green" />
                <span>Clinical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-orange" />
                <span>Quality</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {unifiedCascades.map((cascade) => {
              const color = getCascadeColor(cascade.type);
              const progress = Math.round((cascade.completedActions / cascade.totalActions) * 100);
              const criticalCount = cascade.actions.filter(a => 
                a.priority === 'critical' && a.status !== 'completed' && a.status !== 'verified'
              ).length;
              
              return (
                <div 
                  key={cascade.id} 
                  className={`rounded-lg border border-accent-${color}/30 bg-accent-${color}/5 p-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-accent-${color}/20 flex items-center justify-center`}>
                        {getCascadeIcon(cascade.type)}
                      </div>
                      <div>
                        <div className="font-semibold text-text-primary">{cascade.code}</div>
                        <div className="text-xs text-text-muted">{cascadeTypeMeta[cascade.type]?.shortLabel ?? cascade.type}</div>
                      </div>
                    </div>
                    <Badge color={cascade.severity === 'critical' ? 'red' : cascade.severity === 'major' ? 'amber' : 'blue'} size="sm">
                      {cascade.severity}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-text-secondary mb-3 line-clamp-2">{cascade.title}</div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-text-primary font-medium">{cascade.completedActions}/{cascade.totalActions}</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-accent-${color} rounded-full transition-all`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-text-muted" />
                        <span className="text-text-muted">{cascade.modulesImpacted} modules</span>
                      </div>
                      {criticalCount > 0 && (
                        <div className="flex items-center gap-1 text-accent-red">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{criticalCount} critical</span>
                        </div>
                      )}
                    </div>
                    <span className="text-text-muted">{cascade.productName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Module Impact Heat Map + Critical Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 md:mb-6">
        {/* Module Impact */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-accent-purple" />
              <h3 className="font-semibold text-text-primary">Module Impact</h3>
            </div>
          </CardHeader>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {moduleImpact.slice(0, 10).map((module) => (
                <div key={module.module} className="flex items-center gap-3 p-2 bg-surface-card rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    {getModuleIcon(module.module)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{module.label}</div>
                    <div className="text-xs text-text-muted">
                      {module.completedActions}/{module.totalActions} actions
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {module.criticalActions > 0 && (
                      <Badge color="red" size="sm">{module.criticalActions}</Badge>
                    )}
                    <div className="flex -space-x-1">
                      {module.cascadesSources.map((type, i) => (
                        <div 
                          key={type} 
                          className={`w-4 h-4 rounded-full bg-accent-${getCascadeColor(type)} border border-white flex items-center justify-center`}
                          title={cascadeTypeMeta[type]?.shortLabel ?? type}
                        >
                          <span className="text-[8px] text-white font-bold">
                            {type === 'safety-signal' ? 'S' : type === 'db-lock' ? 'D' : 'Q'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Critical Actions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-red" />
              <h3 className="font-semibold text-text-primary">Critical Actions</h3>
              <Badge color="red" size="sm">{criticalActions.length}</Badge>
            </div>
          </CardHeader>
          <div className="p-4">
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {criticalActions.slice(0, 8).map((action) => (
                <div key={action.id} className="p-3 bg-accent-red/5 border border-accent-red/20 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          color={action.status === 'in-progress' ? 'blue' : action.status === 'pending-review' ? 'amber' : 'gray'} 
                          size="sm"
                        >
                          {action.status.replace('-', ' ')}
                        </Badge>
                        <span className="text-xs text-text-muted">
                          {cascadeTypeMeta[action.cascadeType]?.shortLabel ?? action.cascadeType}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-text-primary">{action.title}</div>
                    </div>
                    <div className="text-right text-xs text-text-muted flex-shrink-0">
                      {action.dueDate && (
                        <div className="text-accent-red">Due: {new Date(action.dueDate).toLocaleDateString()}</div>
                      )}
                      {action.assignedTo && (
                        <div>{action.assignedTo}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Cross-Cascade Dependencies + Recent Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 md:mb-6">
        {/* Cross-Cascade Dependencies */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-accent-purple" />
              <h3 className="font-semibold text-text-primary">Cross-Cascade Dependencies</h3>
            </div>
          </CardHeader>
          <div className="p-4">
            <div className="space-y-3">
              {crossCascadeDependencies.map((dep) => (
                <div key={dep.id} className="p-3 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full bg-accent-${getCascadeColor(dep.sourceCascadeType)}/20 flex items-center justify-center`}>
                      {getCascadeIcon(dep.sourceCascadeType)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                    <Badge color={dep.linkType === 'triggers' ? 'red' : dep.linkType === 'blocks' ? 'orange' : 'blue'} size="sm">
                      {dep.linkType}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                    <div className={`w-6 h-6 rounded-full bg-accent-${getCascadeColor(dep.targetCascadeType)}/20 flex items-center justify-center`}>
                      {getCascadeIcon(dep.targetCascadeType)}
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary">{dep.description}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* v0.27.47: Cross-Module Event Feed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-accent-blue" />
              <h3 className="font-semibold text-text-primary">Live Cross-Module Events</h3>
              <Badge color="blue" size="sm">REAL-TIME</Badge>
            </div>
          </CardHeader>
          <div className="p-4">
            <CrossModuleEventFeedPanel limit={8} showFilters={false} />
          </div>
        </Card>
      </div>

      {/* v0.27.75: Live Pipeline Spotlight - Hero visualization */}
      <div className="mb-6">
        <LivePipelineSpotlight />
      </div>

      {/* v0.27.47: Pipeline Orchestrator - Templates & History */}
      <div className="mb-6">
        <PipelineOrchestratorPanel showTemplates allowStart />
      </div>

      {/* R&D Connected Callout */}
      <div className="p-4 bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border border-accent-purple/20 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent-purple" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text-primary">R&D Connected - The Cascade Trifecta</div>
            <div className="text-sm text-text-secondary mt-1">
              Safety signals, database locks, and quality events — all flowing through one unified command center. 
              127 automated actions. 14 connected modules. In legacy systems, this coordination takes 4-6 weeks of emails and spreadsheets. 
              <span className="font-bold text-accent-purple"> In Ligature, it happens in seconds.</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent-purple">{stats.automationRate}%</div>
            <div className="text-xs text-text-muted">Automation Rate</div>
          </div>
        </div>
      </div>
      
      {/* v0.38.4: Critical Actions Drilldown Modal */}
      {showCriticalActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated rounded-xl border border-border shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-red/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-accent-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Critical Actions</h2>
                  <p className="text-sm text-text-muted">{criticalActions.length} actions requiring immediate attention</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCriticalActions(false)}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
              >
                <span className="text-2xl text-text-muted hover:text-text-primary">&times;</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(80vh-130px)]">
              <div className="space-y-3">
                {criticalActions.map((action) => (
                  <div 
                    key={action.id} 
                    className="p-4 bg-surface-card border border-border rounded-lg hover:border-accent-red/50 transition-colors cursor-pointer group"
                    onClick={() => handleActionClick(action)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            color={action.status === 'in-progress' ? 'blue' : action.status === 'pending-review' ? 'amber' : 'gray'} 
                            size="sm"
                          >
                            {action.status.replace('-', ' ')}
                          </Badge>
                          <span className="text-xs text-text-muted px-2 py-0.5 bg-surface-elevated rounded">
                            {cascadeTypeMeta[action.cascadeType]?.shortLabel ?? action.cascadeType}
                          </span>
                          {action.linkedModule && (
                            <span className="text-xs text-accent-blue flex items-center gap-1">
                              → {moduleMetadata[action.linkedModule]?.label || action.linkedModule}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-text-primary group-hover:text-accent-red transition-colors">
                          {action.title}
                        </div>
                        {action.description && (
                          <div className="text-xs text-text-muted mt-1 line-clamp-2">{action.description}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {action.dueDate && (
                          <div className={`text-sm font-medium ${
                            new Date(action.dueDate) < new Date() ? 'text-accent-red' : 'text-accent-amber'
                          }`}>
                            {new Date(action.dueDate) < new Date() ? 'OVERDUE' : `Due ${new Date(action.dueDate).toLocaleDateString()}`}
                          </div>
                        )}
                        {action.assignedTo && (
                          <div className="text-xs text-text-muted mt-1">{action.assignedTo}</div>
                        )}
                        <div className="mt-2 text-xs text-accent-blue group-hover:underline flex items-center gap-1 justify-end">
                          Take Action <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface-card flex items-center justify-between">
              <div className="text-sm text-text-muted">
                Click any action to navigate to its module
              </div>
              <Button variant="secondary" onClick={() => setShowCriticalActions(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
