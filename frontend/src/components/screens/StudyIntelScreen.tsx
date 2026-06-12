

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
  Users,
  Building2,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  RefreshCw,
  Zap,
  Shield,
  Gauge,
  LineChart,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Brain,
  Lightbulb,
  Flag,
  Timer,
  FlaskConical,
  Globe,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStudyIntelStore } from '@/store/useStudyIntelStore';
import type {
  PerformanceTier,
  PerformanceTrend,
  RiskLevel,
  MilestoneStatus,
  ForecastDataPoint,
  SitePerformanceAnalytics,
  TrackedMilestone,
  SiteRankingEntry,
} from '@/store/studyIntelTypes';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// v110 Color Maps - StudyIntelScreen
// ============================================================================

// Performance tier color map
const performanceTierColorMap: Record<PerformanceTier, BadgeColor> = {
  'top': 'emerald',
  'above-average': 'cyan',
  'average': 'blue',
  'below-average': 'amber',
  'underperforming': 'red',
};

// Risk level color map  
const riskLevelColorMap: Record<RiskLevel, BadgeColor> = {
  'low': 'emerald',
  'medium': 'amber',
  'high': 'orange',
  'critical': 'red',
};

// Milestone status color map
const milestoneStatusColorMap: Record<MilestoneStatus, BadgeColor> = {
  'not-started': 'slate',
  'in-progress': 'blue',
  'at-risk': 'amber',
  'delayed': 'red',
  'completed': 'emerald',
  'cancelled': 'slate',
};

// Alert severity color map
const alertSeverityColorMap: Record<string, BadgeColor> = {
  'info': 'blue',
  'warning': 'amber',
  'critical': 'red',
};

// Warning status color map
const warningStatusColorMap: Record<string, BadgeColor> = {
  'active': 'amber',
  'monitoring': 'blue',
  'resolved': 'emerald',
};

// ============================================================================
// v110 Badge Helpers - StudyIntelScreen
// ============================================================================

export const getPerformanceTierBadgeV110 = (tier: PerformanceTier, size: 'xs' | 'sm' = 'sm') => {
  const labels: Record<PerformanceTier, string> = {
    'top': 'Top Performer',
    'above-average': 'Above Average',
    'average': 'Average',
    'below-average': 'Below Average',
    'underperforming': 'Underperforming',
  };
  return <Badge color={performanceTierColorMap[tier]} size={size}>{labels[tier]}</Badge>;
};

export const getRiskLevelBadge = (level: RiskLevel, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={riskLevelColorMap[level]} size={size}>
    {level.toUpperCase()}
  </Badge>
);

export const getMilestoneStatusBadgeV110 = (status: MilestoneStatus, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={milestoneStatusColorMap[status]} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

export const getAlertSeverityBadge = (severity: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={alertSeverityColorMap[severity] || 'gray'} size={size}>
    {severity}
  </Badge>
);

export const getWarningStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={warningStatusColorMap[status] || 'gray'} size={size}>
    {status}
  </Badge>
);

type StudyIntelTab = 'dashboard' | 'forecast' | 'sites' | 'milestones' | 'risks' | 'benchmarks';

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface StudyIntelScreenProps {
  filters: FilterState;
}

export function StudyIntelScreen({ filters }: StudyIntelScreenProps) {
  const [activeTab, setActiveTab] = useState<StudyIntelTab>('dashboard');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpis', 'forecast', 'sites', 'risks']));
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);

  // v138: Initial loading state for improved perceived performance
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  // Use stable selectors
  const selectedStudyId = useStudyIntelStore(s => s.selectedStudyId);
  const dashboardDataRecord = useStudyIntelStore(s => s.dashboardData);
  const forecastResultsRecord = useStudyIntelStore(s => s.forecastResults);
  const latestForecastByStudy = useStudyIntelStore(s => s.latestForecastByStudy);
  const siteAnalyticsRecord = useStudyIntelStore(s => s.siteAnalytics);
  const siteAnalyticsByStudy = useStudyIntelStore(s => s.siteAnalyticsByStudy);
  const milestoneTrackersRecord = useStudyIntelStore(s => s.milestoneTrackers);
  const trackersByStudy = useStudyIntelStore(s => s.trackersByStudy);
  const riskProfilesRecord = useStudyIntelStore(s => s.riskProfiles);
  const latestRiskByStudy = useStudyIntelStore(s => s.latestRiskByStudy);
  const benchmarksRecord = useStudyIntelStore(s => s.benchmarks);
  const latestBenchmarkByStudy = useStudyIntelStore(s => s.latestBenchmarkByStudy);
  const isLoading = useStudyIntelStore(s => s.isLoading);
  const loadMockData = useStudyIntelStore(s => s.loadMockData);
  const refreshDashboard = useStudyIntelStore(s => s.refreshDashboard);
  const dismissAlert = useStudyIntelStore(s => s.dismissAlert);
  const acknowledgeAlert = useStudyIntelStore(s => s.acknowledgeAlert);

  // Derived data
  const dashboard = selectedStudyId ? dashboardDataRecord[selectedStudyId] : null;
  const forecastId = selectedStudyId ? latestForecastByStudy[selectedStudyId] : null;
  const forecast = forecastId ? forecastResultsRecord[forecastId] : null;
  const siteAnalyticsIds = selectedStudyId ? (siteAnalyticsByStudy[selectedStudyId] || []) : [];
  const siteAnalytics = useMemo(() => 
    siteAnalyticsIds.map(id => siteAnalyticsRecord[id]).filter(Boolean),
    [siteAnalyticsIds, siteAnalyticsRecord]
  );
  const trackerId = selectedStudyId ? trackersByStudy[selectedStudyId] : null;
  const milestoneTracker = trackerId ? milestoneTrackersRecord[trackerId] : null;
  const riskProfileId = selectedStudyId ? latestRiskByStudy[selectedStudyId] : null;
  const riskProfile = riskProfileId ? riskProfilesRecord[riskProfileId] : null;
  const benchmarkId = selectedStudyId ? latestBenchmarkByStudy[selectedStudyId] : null;
  const benchmark = benchmarkId ? benchmarksRecord[benchmarkId] : null;

  const handleLoadData = () => {
    loadMockData();
  };

  const handleRefresh = () => {
    if (selectedStudyId) {
      refreshDashboard(selectedStudyId);
    }
  };

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  const tabs: { id: StudyIntelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'forecast', label: 'Enrollment Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'sites', label: 'Site Performance', icon: <Building2 className="w-4 h-4" /> },
    { id: 'milestones', label: 'Milestones', icon: <Flag className="w-4 h-4" /> },
    { id: 'risks', label: 'Risk Analysis', icon: <Shield className="w-4 h-4" /> },
    { id: 'benchmarks', label: 'Benchmarking', icon: <Layers className="w-4 h-4" /> },
  ];

  // Helper functions - v110: Using Badge component
  const getTrendIcon = (trend: PerformanceTrend) => {
    switch (trend) {
      case 'improving': return <ArrowUp className="w-4 h-4 text-emerald-400" />;
      case 'declining': return <ArrowDown className="w-4 h-4 text-red-400" />;
      case 'stable': return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRiskBadge = (level: RiskLevel) => getRiskLevelBadge(level, 'xs');
  const getPerformanceTierBadge = (tier: PerformanceTier) => getPerformanceTierBadgeV110(tier, 'xs');
  const getMilestoneStatusBadge = (status: MilestoneStatus) => getMilestoneStatusBadgeV110(status, 'xs');

  const getAlertSeverityIcon = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'info': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  // Stats Bar
  const renderStatsBar = () => {
    if (!dashboard) return null;
    const { kpiSummary } = dashboard;

    return (
      <div className="bg-surface-elevated border-b border-border px-6 py-3">
        <div className="flex items-center gap-6 overflow-x-auto">
          <StatItem label="Enrollment" value={`${kpiSummary.enrollment.percentComplete}%`} subValue={`${kpiSummary.enrollment.current}/${kpiSummary.enrollment.target}`} trend={kpiSummary.enrollment.trend} color="emerald" />
          <Divider />
          <StatItem label="Active Sites" value={String(kpiSummary.sites.active)} subValue={`${kpiSummary.sites.enrolling} enrolling`} trend={kpiSummary.sites.trend} color="cyan" />
          <Divider />
          <StatItem label="At-Risk Sites" value={String(kpiSummary.sites.atRisk)} color={kpiSummary.sites.atRisk > 0 ? 'amber' : 'slate'} />
          <Divider />
          <StatItem label="Query Rate" value={`${kpiSummary.dataQuality.queryRate}`} subValue="per 100 subjects" trend={kpiSummary.dataQuality.queryRateTrend} color="blue" />
          <Divider />
          <StatItem label="Timeline" value={kpiSummary.timeline.status.replace('-', ' ')} subValue={`${kpiSummary.timeline.daysToNextMilestone}d to ${kpiSummary.timeline.nextMilestone}`} color={kpiSummary.timeline.status === 'on-track' ? 'emerald' : kpiSummary.timeline.status === 'at-risk' ? 'amber' : 'red'} />
          <Divider />
          <StatItem label="Risk Level" value={kpiSummary.risk.overallLevel.toUpperCase()} subValue={`${kpiSummary.risk.activeWarnings} warnings`} trend={kpiSummary.risk.trend} color={kpiSummary.risk.overallLevel === 'low' ? 'emerald' : kpiSummary.risk.overallLevel === 'medium' ? 'amber' : 'red'} />
        </div>
      </div>
    );
  };

  // v138: Show skeleton during initial load
  if (initialLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-surface-card rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
            <div className="h-9 w-32 bg-surface-card rounded animate-pulse" />
          </div>
        </div>
        <StatCardGridSkeleton count={4} columns={4} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="col-span-1 lg:col-span-8">
            <TableSkeleton rows={6} columns={5} />
          </div>
          <div className="col-span-1 lg:col-span-4 space-y-4">
            <CardSkeleton showHeader contentLines={5} />
            <CardSkeleton showHeader contentLines={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* v117: Breadcrumb */}
      <div className="px-6 pt-4">
        <Breadcrumb 
          moduleId="study-intel" 
          viewLabel={activeTab === 'dashboard' ? 'Dashboard' :
                    activeTab === 'forecast' ? 'Forecast' :
                    activeTab === 'sites' ? 'Sites' :
                    activeTab === 'milestones' ? 'Milestones' :
                    activeTab === 'risks' ? 'Risks' :
                    activeTab === 'benchmarks' ? 'Benchmarks' : 'Dashboard'}
          className="mb-2"
        />
      </div>

      {dashboard && renderStatsBar()}

      {/* Tab Bar */}
      <div className="bg-surface-elevated border-b border-border px-6 py-2">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab.id ? 'bg-violet-500/20 text-violet-400' : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {!selectedStudyId ? (
            <button onClick={handleLoadData} className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors text-sm">
              <Zap className="w-4 h-4" />
              Load Sample Study
            </button>
          ) : (
            <button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-surface-card border border-border rounded-lg hover:bg-surface transition-colors text-sm text-text-secondary disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedStudyId ? (
          <EmptyState onLoad={handleLoadData} />
        ) : activeTab === 'dashboard' ? (
          <DashboardView 
            dashboard={dashboard} 
            forecast={forecast}
            siteAnalytics={siteAnalytics}
            milestoneTracker={milestoneTracker}
            riskProfile={riskProfile}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            getTrendIcon={getTrendIcon}
            getRiskBadge={getRiskBadge}
            getPerformanceTierBadge={getPerformanceTierBadge}
            getMilestoneStatusBadge={getMilestoneStatusBadge}
            getAlertSeverityIcon={getAlertSeverityIcon}
            onDismissAlert={(alertId) => selectedStudyId && dismissAlert(selectedStudyId, alertId)}
            onAcknowledgeAlert={(alertId) => selectedStudyId && acknowledgeAlert(selectedStudyId, alertId, 'user')}
          />
        ) : activeTab === 'forecast' ? (
          <ForecastView forecast={forecast} getTrendIcon={getTrendIcon} getRiskBadge={getRiskBadge} />
        ) : activeTab === 'sites' ? (
          <SitesView siteAnalytics={siteAnalytics} dashboard={dashboard} getPerformanceTierBadge={getPerformanceTierBadge} getTrendIcon={getTrendIcon} />
        ) : activeTab === 'milestones' ? (
          <MilestonesView milestoneTracker={milestoneTracker} getMilestoneStatusBadge={getMilestoneStatusBadge} />
        ) : activeTab === 'risks' ? (
          <RisksView riskProfile={riskProfile} getRiskBadge={getRiskBadge} getTrendIcon={getTrendIcon} />
        ) : activeTab === 'benchmarks' ? (
          <BenchmarksView benchmark={benchmark} />
        ) : null}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatItem({ label, value, subValue, trend, color = 'slate' }: { label: string; value: string; subValue?: string; trend?: PerformanceTrend; color?: string }) {
  const colorClasses: Record<string, string> = { emerald: 'text-emerald-400', cyan: 'text-cyan-400', blue: 'text-blue-400', amber: 'text-amber-400', red: 'text-red-400', slate: 'text-slate-400', violet: 'text-violet-400' };
  return (
    <div className="flex flex-col min-w-0">
      <div className="text-xs text-text-muted whitespace-nowrap">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-semibold ${colorClasses[color] || 'text-text-primary'}`}>{value}</span>
        {trend && (trend === 'improving' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : trend === 'declining' ? <ArrowDown className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-slate-400" />)}
      </div>
      {subValue && <div className="text-xs text-text-muted">{subValue}</div>}
    </div>
  );
}

function Divider() { return <div className="w-px h-10 bg-border" />; }

function EmptyState({ onLoad }: { onLoad: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-20 h-20 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-6">
        <Brain className="w-10 h-10 text-violet-400" />
      </div>
      <h2 className="text-2xl font-semibold text-text-primary mb-2">Study Intelligence Dashboard</h2>
      <p className="text-text-muted text-center max-w-md mb-6">ML-powered enrollment forecasting, site performance analytics, risk scoring, and cross-study benchmarking.</p>
      <button onClick={onLoad} className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors">
        <Zap className="w-5 h-5" />
        Load Sample Study Data
      </button>
    </div>
  );
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, children }: { title: string; icon: React.ReactNode; isExpanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors">
        <div className="flex items-center gap-2">{icon}<span className="text-sm font-medium text-text-primary">{title}</span></div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>
      {isExpanded && <div className="p-4 pt-0">{children}</div>}
    </Card>
  );
}

function MetricCard({ label, value, subValue, icon, valueColor = 'primary' }: { label: string; value: string; subValue?: string; icon: React.ReactNode; valueColor?: string }) {
  const colorClasses: Record<string, string> = { primary: 'text-text-primary', emerald: 'text-emerald-400', cyan: 'text-cyan-400', blue: 'text-blue-400', amber: 'text-amber-400', red: 'text-red-400', violet: 'text-violet-400' };
  return (
    <Card variant="default" padding="md">
      <div className="flex items-start justify-between mb-2"><div className="text-xs text-text-muted">{label}</div>{icon}</div>
      <div className={`text-xl font-semibold ${colorClasses[valueColor]}`}>{value}</div>
      {subValue && <div className="text-xs text-text-muted mt-1">{subValue}</div>}
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-text-muted">{label}</span><span className="text-sm text-text-primary font-medium">{value}</span></div>;
}

function RiskGauge({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const textSize = size === 'lg' ? 'text-xl' : 'text-lg';
  const color = score <= 25 ? 'text-emerald-400' : score <= 50 ? 'text-amber-400' : score <= 75 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className={`${sizeClasses} relative`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-elevated" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${score}, 100`} className={color} />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${textSize} font-bold ${color}`}>{score}</div>
    </div>
  );
}

function EnrollmentMiniChart({ points }: { points: ForecastDataPoint[] }) {
  if (points.length === 0) return null;
  const maxValue = Math.max(...points.map(p => Math.max(p.projected, p.actual || 0)));
  const width = 100, height = 100, padding = 10;
  const getX = (i: number) => padding + (i / (points.length - 1)) * (width - 2 * padding);
  const getY = (v: number) => height - padding - (v / maxValue) * (height - 2 * padding);
  const projectedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.projected)}`).join(' ');
  const actualPoints = points.filter(p => p.actual !== undefined);
  const actualPath = actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(points.indexOf(p))} ${getY(p.actual!)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <path d={projectedPath} fill="none" stroke="rgb(139, 92, 246)" strokeWidth="2" strokeDasharray="4,2" />
      {actualPath && <path d={actualPath} fill="none" stroke="rgb(16, 185, 129)" strokeWidth="2" />}
    </svg>
  );
}

// =============================================================================
// DASHBOARD VIEW
// =============================================================================

interface DashboardViewProps {
  dashboard: ReturnType<typeof useStudyIntelStore.getState>['dashboardData'][string] | null;
  forecast: ReturnType<typeof useStudyIntelStore.getState>['forecastResults'][string] | null;
  siteAnalytics: SitePerformanceAnalytics[];
  milestoneTracker: ReturnType<typeof useStudyIntelStore.getState>['milestoneTrackers'][string] | null;
  riskProfile: ReturnType<typeof useStudyIntelStore.getState>['riskProfiles'][string] | null;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  getTrendIcon: (trend: PerformanceTrend) => React.ReactNode;
  getRiskBadge: (level: RiskLevel) => React.ReactNode;
  getPerformanceTierBadge: (tier: PerformanceTier) => React.ReactNode;
  getMilestoneStatusBadge: (status: MilestoneStatus) => React.ReactNode;
  getAlertSeverityIcon: (severity: 'info' | 'warning' | 'critical') => React.ReactNode;
  onDismissAlert: (alertId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

function DashboardView({ dashboard, forecast, siteAnalytics, milestoneTracker, riskProfile, expandedSections, toggleSection, getTrendIcon, getRiskBadge, getPerformanceTierBadge, getMilestoneStatusBadge, getAlertSeverityIcon, onDismissAlert, onAcknowledgeAlert }: DashboardViewProps) {
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  if (!dashboard) return <div className="text-text-muted">No dashboard data available.</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Alerts */}
      {dashboard.activeAlerts.length > 0 && (
        <Card variant="default" padding="md">
          <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Active Alerts ({dashboard.activeAlerts.length})</h3>
          <div className="space-y-2">
            {dashboard.activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                {getAlertSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium">{alert.title}</div>
                  <div className="text-xs text-text-muted">{alert.message}</div>
                  {alert.suggestedAction && <div className="text-xs text-violet-400 mt-1">💡 {alert.suggestedAction}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {!alert.acknowledged && <button onClick={() => onAcknowledgeAlert(alert.id)} className="text-xs text-text-muted hover:text-text-primary">Acknowledge</button>}
                  <button onClick={() => onDismissAlert(alert.id)} className="text-xs text-text-muted hover:text-red-400">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      {dashboard.suggestedActions.length > 0 && (
        <Card variant="default" padding="md">
          <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" />Suggested Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.suggestedActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-3 bg-surface rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
                onClick={() => {
                  const dest = action.type === 'report' ? 'tmf' : action.type === 'investigate' ? 'study-intel' : 'ctms';
                  setActiveModule(dest as any);
                  toast.info(`${action.title} — navigating to ${dest.toUpperCase()}`);
                }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.priority === 'high' ? 'bg-red-500/20' : action.priority === 'medium' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                  {action.type === 'investigate' && <Search className="w-4 h-4 text-amber-400" />}
                  {action.type === 'intervene' && <Zap className="w-4 h-4 text-red-400" />}
                  {action.type === 'monitor' && <Eye className="w-4 h-4 text-blue-400" />}
                  {action.type === 'report' && <BarChart3 className="w-4 h-4 text-violet-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium">{action.title}</div>
                  <div className="text-xs text-text-muted">{action.description}</div>
                  {action.estimatedImpact && <div className="text-xs text-emerald-400 mt-1">📈 {action.estimatedImpact}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Forecast Mini */}
        {forecast && (
          <CollapsibleSection title="Enrollment Forecast" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} isExpanded={expandedSections.has('forecast')} onToggle={() => toggleSection('forecast')}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><div className="text-2xl font-semibold text-text-primary">{forecast.currentEnrollment} / {forecast.targetEnrollment}</div><div className="text-sm text-text-muted">{forecast.percentComplete}% complete</div></div>
                <div className="text-right"><div className="text-sm text-text-muted">Projected Completion</div><div className="text-lg font-medium text-emerald-400">{forecast.projectedCompletionDate}</div></div>
              </div>
              <div className="h-32 bg-surface rounded-lg flex items-center justify-center"><EnrollmentMiniChart points={forecast.forecastPoints.slice(0, 12)} /></div>
              <div className="flex items-center justify-between text-sm">
                <span className={`${forecast.daysAheadBehind >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{forecast.daysAheadBehind >= 0 ? '+' : ''}{forecast.daysAheadBehind} days vs plan</span>
                <span className="text-text-muted">Confidence: {forecast.confidence} ({forecast.confidenceScore}%)</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Site Rankings Mini */}
        {dashboard.siteRankings && (
          <CollapsibleSection title="Site Performance" icon={<Building2 className="w-4 h-4 text-cyan-400" />} isExpanded={expandedSections.has('sites')} onToggle={() => toggleSection('sites')}>
            <div className="space-y-3">
              <div className="text-xs text-text-muted uppercase tracking-wider">Top Performers</div>
              {dashboard.siteRankings.topPerformers.slice(0, 3).map((site) => (
                <SiteRankingRow key={site.siteId} site={site} getTrendIcon={getTrendIcon} />
              ))}
              {dashboard.siteRankings.bottomPerformers.length > 0 && (
                <>
                  <div className="text-xs text-text-muted uppercase tracking-wider mt-4">Needs Attention</div>
                  {dashboard.siteRankings.bottomPerformers.slice(0, 2).map((site) => (
                    <SiteRankingRow key={site.siteId} site={site} getTrendIcon={getTrendIcon} />
                  ))}
                </>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Milestone Timeline Mini */}
        {milestoneTracker && (
          <CollapsibleSection title="Milestone Timeline" icon={<Flag className="w-4 h-4 text-violet-400" />} isExpanded={expandedSections.has('milestones')} onToggle={() => toggleSection('milestones')}>
            <div className="space-y-3">
              {milestoneTracker.milestones.slice(0, 5).map((milestone) => (
                <MilestoneRow key={milestone.id} milestone={milestone} getMilestoneStatusBadge={getMilestoneStatusBadge} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Risk Summary Mini */}
        {riskProfile && (
          <CollapsibleSection title="Risk Analysis" icon={<Shield className="w-4 h-4 text-red-400" />} isExpanded={expandedSections.has('risks')} onToggle={() => toggleSection('risks')}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RiskGauge score={riskProfile.overallRiskScore} />
                  <div><div className="text-sm text-text-muted">Overall Risk</div><div className="text-lg font-semibold text-text-primary">{getRiskBadge(riskProfile.overallRiskLevel)}</div></div>
                </div>
                <div className="text-right"><div className="text-sm text-text-muted">Early Warnings</div><div className="text-lg font-semibold text-amber-400">{riskProfile.earlyWarnings.filter(w => w.status === 'active').length} active</div></div>
              </div>
              <div className="space-y-2">
                {riskProfile.riskIndicators.slice(0, 4).map((indicator) => (
                  <div key={indicator.id} className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">{indicator.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${indicator.riskLevel === 'low' ? 'bg-emerald-500' : indicator.riskLevel === 'medium' ? 'bg-amber-500' : indicator.riskLevel === 'high' ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${indicator.riskScore}%` }} />
                      </div>
                      {getRiskBadge(indicator.riskLevel)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

function SiteRankingRow({ site, getTrendIcon }: { site: SiteRankingEntry; getTrendIcon: (trend: PerformanceTrend) => React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-surface-elevated rounded-full flex items-center justify-center text-xs font-medium text-text-muted">{site.rank}</div>
        <div><div className="text-sm text-text-primary">{site.siteName}</div><div className="text-xs text-text-muted">{site.siteNumber} • {site.country}</div></div>
      </div>
      <div className="flex items-center gap-2"><span className="text-sm font-medium text-text-primary">{site.performanceScore}</span>{getTrendIcon(site.trend)}</div>
    </div>
  );
}

function MilestoneRow({ milestone, getMilestoneStatusBadge }: { milestone: TrackedMilestone; getMilestoneStatusBadge: (status: MilestoneStatus) => React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${milestone.status === 'completed' ? 'bg-emerald-500' : milestone.status === 'in-progress' ? 'bg-blue-500' : milestone.status === 'at-risk' ? 'bg-amber-500' : milestone.status === 'delayed' ? 'bg-red-500' : 'bg-slate-500'}`} />
        <div>
          <div className="text-sm text-text-primary flex items-center gap-2">{milestone.name}{milestone.isCriticalPath && <Flag className="w-3 h-3 text-violet-400" />}</div>
          <div className="text-xs text-text-muted">{milestone.actualDate || milestone.forecastDate}</div>
        </div>
      </div>
      {getMilestoneStatusBadge(milestone.status)}
    </div>
  );
}

// =============================================================================
// FORECAST VIEW
// =============================================================================

function ForecastView({ forecast, getTrendIcon, getRiskBadge }: { forecast: ReturnType<typeof useStudyIntelStore.getState>['forecastResults'][string] | null; getTrendIcon: (trend: PerformanceTrend) => React.ReactNode; getRiskBadge: (level: RiskLevel) => React.ReactNode }) {
  if (!forecast) return <div className="text-text-muted text-center py-12">No forecast data available.</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Current Enrollment" value={String(forecast.currentEnrollment)} subValue={`of ${forecast.targetEnrollment} target`} icon={<Users className="w-5 h-5 text-emerald-400" />} />
        <MetricCard label="Completion %" value={`${forecast.percentComplete}%`} subValue={`${forecast.enrollmentVariancePercent}% vs plan`} icon={<Target className="w-5 h-5 text-cyan-400" />} />
        <MetricCard label="Days Ahead/Behind" value={`${forecast.daysAheadBehind >= 0 ? '+' : ''}${forecast.daysAheadBehind}`} subValue="vs planned timeline" icon={<Calendar className="w-5 h-5 text-violet-400" />} valueColor={forecast.daysAheadBehind >= 0 ? 'emerald' : 'red'} />
        <MetricCard label="Model Confidence" value={`${forecast.confidenceScore}%`} subValue={`${forecast.confidence} confidence`} icon={<Gauge className="w-5 h-5 text-blue-400" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default" padding="md"><div className="text-sm text-text-muted mb-1">Optimistic Completion</div><div className="text-xl font-semibold text-emerald-400">{forecast.projectedCompletionDateOptimistic}</div></Card>
        <Card variant="default" padding="md"><div className="text-sm text-text-muted mb-1">Base Case Completion</div><div className="text-xl font-semibold text-violet-400">{forecast.projectedCompletionDate}</div></Card>
        <Card variant="default" padding="md"><div className="text-sm text-text-muted mb-1">Pessimistic Completion</div><div className="text-xl font-semibold text-amber-400">{forecast.projectedCompletionDatePessimistic}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default" padding="md">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-violet-400" />Model Performance</h3>
          <div className="space-y-3">
            <MetricRow label="Model Accuracy (MAPE)" value={`${forecast.modelAccuracy.toFixed(2)}%`} />
            <MetricRow label="Model Fit (R²)" value={forecast.modelFit.toFixed(3)} />
            <MetricRow label="Mean Absolute Error" value={forecast.residualAnalysis.meanAbsoluteError.toFixed(2)} />
            <MetricRow label="Autocorrelation" value={forecast.residualAnalysis.autocorrelation.toFixed(3)} />
          </div>
        </Card>

        <Card variant="default" padding="md">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2"><GitBranch className="w-4 h-4 text-cyan-400" />Scenario Analysis</h3>
          <div className="space-y-3">
            {forecast.scenarios.map((scenario) => (
              <div key={scenario.id} className="p-3 bg-surface rounded-lg">
                <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-text-primary">{scenario.name}</span><span className="text-xs text-text-muted">{(scenario.probability * 100).toFixed(0)}% probability</span></div>
                <div className="text-xs text-text-muted">{scenario.description}</div>
                <div className="text-xs text-violet-400 mt-1">Completion: {scenario.projectedCompletionDate}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {forecast.forecastRisks.length > 0 && (
        <Card variant="default" padding="md">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Risks Affecting Forecast</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forecast.forecastRisks.map((risk) => (
              <div key={risk.id} className="p-3 bg-surface rounded-lg">
                <div className="flex items-start justify-between mb-2"><span className="text-sm font-medium text-text-primary">{risk.description}</span><span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">{risk.category}</span></div>
                <div className="text-xs text-text-muted">Potential delay: <span className="text-red-400">{risk.potentialDelayDays} days</span> • Probability: <span className="text-amber-400">{(risk.probability * 100).toFixed(0)}%</span></div>
                {risk.mitigationActions.length > 0 && <div className="text-xs text-emerald-400 mt-2">Mitigations: {risk.mitigationActions.join(', ')}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// SITES VIEW
// =============================================================================

function SitesView({ siteAnalytics, dashboard, getPerformanceTierBadge, getTrendIcon }: { siteAnalytics: SitePerformanceAnalytics[]; dashboard: ReturnType<typeof useStudyIntelStore.getState>['dashboardData'][string] | null; getPerformanceTierBadge: (tier: PerformanceTier) => React.ReactNode; getTrendIcon: (trend: PerformanceTrend) => React.ReactNode }) {
  const [sortBy, setSortBy] = useState<'score' | 'enrollment' | 'trend'>('score');
  const [selectedSite, setSelectedSite] = useState<SitePerformanceAnalytics | null>(null);

  const sortedSites = useMemo(() => {
    return [...siteAnalytics].sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.performanceScore - a.performanceScore;
        case 'enrollment': return b.enrollmentMetrics.percentOfTarget - a.enrollmentMetrics.percentOfTarget;
        case 'trend': return a.performanceTrend === 'improving' ? -1 : b.performanceTrend === 'improving' ? 1 : 0;
        default: return 0;
      }
    });
  }, [siteAnalytics, sortBy]);

  if (siteAnalytics.length === 0) return <div className="text-text-muted text-center py-12">No site performance data available.</div>;

  return (
    <div className="flex gap-6">
      <div className="w-96 shrink-0">
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Sites ({siteAnalytics.length})</h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'score' | 'enrollment' | 'trend')} className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-primary">
                <option value="score">By Score</option><option value="enrollment">By Enrollment</option><option value="trend">By Trend</option>
              </select>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {sortedSites.map((site) => (
              <div key={site.id} onClick={() => setSelectedSite(site)} className={`p-4 border-b border-border cursor-pointer transition-colors ${selectedSite?.id === site.id ? 'bg-violet-500/10' : 'hover:bg-surface'}`}>
                <div className="flex items-start justify-between mb-2"><div><div className="text-sm font-medium text-text-primary">{site.siteName}</div><div className="text-xs text-text-muted">{site.siteNumber} • {site.country}</div></div>{getPerformanceTierBadge(site.performanceTier)}</div>
                <div className="flex items-center gap-4 text-xs"><span className="text-text-muted">Score: <span className="text-text-primary font-medium">{site.performanceScore}</span></span><span className="text-text-muted">Rank: <span className="text-text-primary font-medium">#{site.overallRank}</span></span>{getTrendIcon(site.performanceTrend)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1">
        {selectedSite ? (
          <div className="bg-surface-card border border-border rounded-lg p-6 space-y-4 md:space-y-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-semibold text-text-primary">{selectedSite.siteName}</h2><div className="text-sm text-text-muted">{selectedSite.siteNumber} • {selectedSite.region}, {selectedSite.country}</div></div>
              <div className="text-right">{getPerformanceTierBadge(selectedSite.performanceTier)}<div className="flex items-center gap-1 mt-1 justify-end">{getTrendIcon(selectedSite.performanceTrend)}<span className="text-xs text-text-muted">{selectedSite.trendChangePercent > 0 ? '+' : ''}{selectedSite.trendChangePercent}%</span></div></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="text-center"><div className="text-3xl font-bold text-violet-400">{selectedSite.performanceScore}</div><div className="text-xs text-text-muted">Overall Score</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-emerald-400">{selectedSite.dimensionScores.enrollment}</div><div className="text-xs text-text-muted">Enrollment</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-cyan-400">{selectedSite.dimensionScores.dataQuality}</div><div className="text-xs text-text-muted">Data Quality</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-blue-400">{selectedSite.dimensionScores.compliance}</div><div className="text-xs text-text-muted">Compliance</div></div>
            </div>
            <div><h3 className="text-sm font-medium text-text-primary mb-3">Enrollment Metrics</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"><MetricRow label="Current / Target" value={`${selectedSite.enrollmentMetrics.currentEnrollment} / ${selectedSite.enrollmentMetrics.targetEnrollment}`} /><MetricRow label="% of Target" value={`${selectedSite.enrollmentMetrics.percentOfTarget}%`} /><MetricRow label="Enrollment Rate" value={`${selectedSite.enrollmentMetrics.enrollmentRate}/month`} /><MetricRow label="Screen Failure Rate" value={`${selectedSite.enrollmentMetrics.screenFailureRate}%`} /></div></div>
            <div><h3 className="text-sm font-medium text-text-primary mb-3">Data Quality</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"><MetricRow label="Query Rate" value={`${selectedSite.dataQualityMetrics.queryRate}/100 subjects`} /><MetricRow label="Resolution Time" value={`${selectedSite.dataQualityMetrics.queryResolutionTime} days`} /><MetricRow label="Data Entry Lag" value={`${selectedSite.dataQualityMetrics.dataEntryLag} days`} /><MetricRow label="Forms Completion" value={`${selectedSite.dataQualityMetrics.formsCompletionRate}%`} /></div></div>
          </div>
        ) : (
          <div className="bg-surface-card border border-border rounded-lg h-full flex items-center justify-center text-text-muted">Select a site to view details</div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MILESTONES VIEW
// =============================================================================

function MilestonesView({ milestoneTracker, getMilestoneStatusBadge }: { milestoneTracker: ReturnType<typeof useStudyIntelStore.getState>['milestoneTrackers'][string] | null; getMilestoneStatusBadge: (status: MilestoneStatus) => React.ReactNode }) {
  if (!milestoneTracker) return <div className="text-text-muted text-center py-12">No milestone tracking data available.</div>;
  const { milestones, criticalPath, timelineHealth } = milestoneTracker;

  return (
    <div className="space-y-4 md:space-y-6">
      {criticalPath && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Timeline Status" value={timelineHealth === 'on-track' ? 'On Track' : timelineHealth === 'at-risk' ? 'At Risk' : 'Delayed'} icon={<Flag className="w-5 h-5 text-violet-400" />} valueColor={timelineHealth === 'on-track' ? 'emerald' : timelineHealth === 'at-risk' ? 'amber' : 'red'} />
          <MetricCard label="Total Milestones" value={String(milestoneTracker.totalMilestones)} subValue={`${milestoneTracker.completedMilestones} completed`} icon={<Timer className="w-5 h-5 text-cyan-400" />} />
          <MetricCard label="Projected End Date" value={criticalPath.projectedEndDate || 'TBD'} icon={<Calendar className="w-5 h-5 text-blue-400" />} />
          <MetricCard label="Variance from Plan" value={`${criticalPath.varianceFromPlan >= 0 ? '+' : ''}${criticalPath.varianceFromPlan} days`} icon={<Target className="w-5 h-5 text-emerald-400" />} valueColor={criticalPath.varianceFromPlan <= 0 ? 'emerald' : 'red'} />
        </div>
      )}

      <div className="bg-surface-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-medium text-text-primary mb-6">Milestone Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${milestone.status === 'completed' ? 'bg-emerald-500' : milestone.status === 'in-progress' ? 'bg-blue-500' : milestone.status === 'at-risk' ? 'bg-amber-500' : milestone.status === 'delayed' ? 'bg-red-500' : 'bg-slate-600'}`}>
                  {milestone.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-white" /> : milestone.isCriticalPath ? <Flag className="w-4 h-4 text-white" /> : <span className="text-xs text-white font-medium">{index + 1}</span>}
                </div>
                <div className="flex-1 pb-4">
                  <div className="bg-surface rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div><div className="text-sm font-medium text-text-primary flex items-center gap-2">{milestone.name}{milestone.isCriticalPath && <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">Critical</span>}</div><div className="text-xs text-text-muted">{milestone.category}</div></div>
                      {getMilestoneStatusBadge(milestone.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-xs">
                      <div><div className="text-text-muted">Planned</div><div className="text-text-primary">{milestone.plannedDate}</div></div>
                      <div><div className="text-text-muted">Forecast</div><div className={milestone.varianceDays > 0 ? 'text-red-400' : 'text-emerald-400'}>{milestone.forecastDate}</div></div>
                      {milestone.actualDate && <div><div className="text-text-muted">Actual</div><div className="text-emerald-400">{milestone.actualDate}</div></div>}
                    </div>
                    {milestone.varianceDays !== 0 && <div className={`text-xs mt-2 ${milestone.varianceDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{milestone.varianceDays > 0 ? `${milestone.varianceDays} days behind` : `${Math.abs(milestone.varianceDays)} days ahead`}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RISKS VIEW
// =============================================================================

function RisksView({ riskProfile, getRiskBadge, getTrendIcon }: { riskProfile: ReturnType<typeof useStudyIntelStore.getState>['riskProfiles'][string] | null; getRiskBadge: (level: RiskLevel) => React.ReactNode; getTrendIcon: (trend: PerformanceTrend) => React.ReactNode }) {
  if (!riskProfile) return <div className="text-text-muted text-center py-12">No risk profile data available.</div>;

  const highRiskCount = riskProfile.riskIndicators.filter(i => i.riskLevel === 'high' || i.riskLevel === 'critical').length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-2"><RiskGauge score={riskProfile.overallRiskScore} size="lg" /><div className="text-right"><div className="text-sm text-text-muted">Overall Risk</div><div className="text-lg font-semibold">{getRiskBadge(riskProfile.overallRiskLevel)}</div></div></div>
        </Card>
        <MetricCard label="Risk Indicators" value={String(riskProfile.riskIndicators.length)} subValue={`${highRiskCount} high/critical`} icon={<Shield className="w-5 h-5 text-red-400" />} />
        <MetricCard label="Active Warnings" value={String(riskProfile.earlyWarnings.filter(w => w.status === 'active').length)} subValue="early warning signals" icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} />
        <MetricCard label="Mitigation Plans" value={String(riskProfile.mitigationStatus.totalMitigations)} subValue={`${riskProfile.mitigationStatus.inProgressMitigations} in progress`} icon={<Zap className="w-5 h-5 text-emerald-400" />} />
      </div>

      <Card variant="default" padding="lg">
        <h3 className="text-lg font-medium text-text-primary mb-4">Risk Indicators</h3>
        <div className="space-y-4">
          {riskProfile.riskIndicators.map((indicator) => (
            <div key={indicator.id} className="p-4 bg-surface rounded-lg">
              <div className="flex items-start justify-between mb-3"><div><div className="text-sm font-medium text-text-primary">{indicator.name}</div><div className="text-xs text-text-muted">{indicator.category}</div></div><div className="flex items-center gap-2">{getTrendIcon(indicator.trend)}{getRiskBadge(indicator.riskLevel)}</div></div>
              <div className="w-full h-3 bg-surface-elevated rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full transition-all ${indicator.riskLevel === 'low' ? 'bg-emerald-500' : indicator.riskLevel === 'medium' ? 'bg-amber-500' : indicator.riskLevel === 'high' ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${indicator.riskScore}%` }} /></div>
              <div className="flex items-center justify-between text-xs text-text-muted"><span>Score: {indicator.riskScore}/100</span><span>{indicator.description}</span></div>
            </div>
          ))}
        </div>
      </Card>

      {riskProfile.earlyWarnings.length > 0 && (
        <Card variant="default" padding="lg">
          <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" />Early Warning Signals</h3>
          <div className="space-y-3">
            {riskProfile.earlyWarnings.map((warning) => (
              <div key={warning.id} className={`p-4 rounded-lg border ${warning.status === 'active' ? 'bg-amber-500/5 border-amber-500/30' : warning.status === 'monitoring' ? 'bg-blue-500/5 border-blue-500/30' : 'bg-surface border-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3"><AlertTriangle className={`w-5 h-5 mt-0.5 ${warning.severity === 'critical' ? 'text-red-400' : warning.severity === 'concern' ? 'text-amber-400' : 'text-blue-400'}`} /><div><div className="text-sm font-medium text-text-primary">{warning.name}</div><div className="text-xs text-text-muted">{warning.description}</div></div></div>
                  {getWarningStatusBadge(warning.status, 'xs')}
                </div>
                <div className="text-xs text-text-muted mt-2">Detected: {warning.detectedDate} • Category: {warning.category}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// BENCHMARKS VIEW
// =============================================================================

function BenchmarksView({ benchmark }: { benchmark: ReturnType<typeof useStudyIntelStore.getState>['benchmarks'][string] | null }) {
  if (!benchmark) return <div className="text-text-muted text-center py-12">No benchmark data available.</div>;

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Benchmark Source" value={benchmark.benchmarkSource} icon={<Layers className="w-5 h-5 text-violet-400" />} />
        <MetricCard label="Comparator Studies" value={String(benchmark.comparatorStudies.length)} icon={<FlaskConical className="w-5 h-5 text-cyan-400" />} />
        <MetricCard label="Overall Percentile" value={`${benchmark.overallPercentile}th`} icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} />
        <MetricCard label="Last Updated" value={benchmark.generatedAt.split('T')[0]} icon={<Calendar className="w-5 h-5 text-blue-400" />} />
      </div>

      <Card variant="default" padding="lg">
        <h3 className="text-lg font-medium text-text-primary mb-4">Performance by Dimension</h3>
        <div className="space-y-4">
          {benchmark.dimensionComparisons.map((dim) => (
            <div key={dim.dimension} className="p-4 bg-surface rounded-lg">
              <div className="flex items-center justify-between mb-3"><div><div className="text-sm font-medium text-text-primary">{dim.dimension}</div><div className="text-xs text-text-muted">Your value: {dim.studyValue.toFixed(1)} {dim.studyValueUnit} vs Median: {dim.benchmarkMedian.toFixed(1)}</div></div><div className="text-right"><div className={`text-lg font-semibold ${dim.percentile >= 75 ? 'text-emerald-400' : dim.percentile >= 50 ? 'text-cyan-400' : dim.percentile >= 25 ? 'text-amber-400' : 'text-red-400'}`}>{dim.percentile}th</div><div className="text-xs text-text-muted">percentile</div></div></div>
              <div className="relative h-6 bg-surface-elevated rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-1/4 w-px bg-border" /><div className="absolute inset-y-0 left-1/2 w-px bg-border" /><div className="absolute inset-y-0 left-3/4 w-px bg-border" />
                <div className="absolute top-0 bottom-0 w-2 bg-violet-500 rounded-full" style={{ left: `${dim.percentile}%`, transform: 'translateX(-50%)' }} />
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted mt-2"><span>25th: {dim.benchmarkP25.toFixed(1)}</span><span>50th: {dim.benchmarkMedian.toFixed(1)}</span><span>75th: {dim.benchmarkP75.toFixed(1)}</span></div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="default" padding="lg">
        <h3 className="text-lg font-medium text-text-primary mb-4">Comparator Studies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-muted font-medium">Study</th><th className="text-left py-2 px-3 text-text-muted font-medium">Phase</th><th className="text-left py-2 px-3 text-text-muted font-medium">Therapeutic Area</th><th className="text-right py-2 px-3 text-text-muted font-medium">Sample Size</th><th className="text-right py-2 px-3 text-text-muted font-medium">Similarity</th></tr></thead>
            <tbody>
              {benchmark.comparatorStudies.map((study) => (
                <tr key={study.id} className="border-b border-border hover:bg-surface">
                  <td className="py-2 px-3 text-text-primary">{study.name}</td>
                  <td className="py-2 px-3 text-text-muted">{study.phase}</td>
                  <td className="py-2 px-3 text-text-muted">{study.therapeuticArea}</td>
                  <td className="py-2 px-3 text-right text-text-primary">{study.sampleSize}</td>
                  <td className="py-2 px-3 text-right text-text-primary">{study.similarity}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {benchmark.keyInsights.length > 0 && (
        <Card variant="default" padding="lg">
          <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-400" />Benchmark Insights</h3>
          <div className="space-y-3">
            {benchmark.keyInsights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${insight.impactLevel === 'high' ? 'bg-red-400' : insight.impactLevel === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div><div className="text-sm text-text-primary">{insight.title}</div><div className="text-xs text-text-muted">{insight.description}</div></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
    </div>
  );
}
