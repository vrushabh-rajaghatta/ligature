
/**
 * Clinical Dashboard
 * Main clinical operations dashboard with study overview and navigation
 * @version 0.20.9.1
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  Users,
  Building2,
  Calendar,
  FileQuestion,
  ClipboardCheck,
  Shield,
  Shuffle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  RefreshCw,
  Filter,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Target,
  Percent,
  Pill,
  FlaskConical,
  Microscope,
  UserPlus,
  UserCheck,
  UserX,
  MapPin,
  Globe,
  FileText,
  Bell,
  Settings,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import type { StudyPhase, StudyStatus } from '@/types/clinical-trial';

// =============================================================================
// TYPES
// =============================================================================

export type DashboardViewMode = 'overview' | 'sites' | 'subjects' | 'visits' | 'queries' | 'sdv' | 'monitoring' | 'randomization';

export type MetricTrend = 'up' | 'down' | 'stable';

export interface StudyOverviewData {
  id: string;
  protocolNumber: string;
  protocolTitle: string;
  phase: StudyPhase;
  status: StudyStatus;
  therapeuticArea: string;
  indication: string;
  sponsor: string;
}

export interface EnrollmentMetrics {
  planned: number;
  screened: number;
  enrolled: number;
  randomized: number;
  completed: number;
  withdrawn: number;
  screenFailures: number;
  enrollmentRate: number; // subjects per week
  enrollmentTrend: MetricTrend;
  projectedCompletion?: Date;
  isOnTrack: boolean;
}

export interface SiteMetrics {
  total: number;
  active: number;
  activating: number;
  suspended: number;
  closed: number;
  topEnrolling: SiteEnrollmentSummary[];
  underPerforming: SiteEnrollmentSummary[];
}

export interface SiteEnrollmentSummary {
  siteId: string;
  siteName: string;
  siteNumber: string;
  enrolled: number;
  target: number;
  percentComplete: number;
}

export interface VisitMetrics {
  scheduled: number;
  completed: number;
  missed: number;
  upcoming: number;
  overdue: number;
  completionRate: number;
  averageDelay: number; // days
}

export interface QueryMetrics {
  open: number;
  answered: number;
  closed: number;
  overdue: number;
  averageAge: number; // days
  resolutionRate: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface SDVMetrics {
  formsTotal: number;
  formsVerified: number;
  formsPending: number;
  fieldsTotal: number;
  fieldsVerified: number;
  discrepancies: number;
  verificationRate: number;
}

export interface MonitoringMetrics {
  visitsPlanned: number;
  visitsCompleted: number;
  visitsPending: number;
  openFindings: number;
  closedFindings: number;
  criticalFindings: number;
  averageFindingsPerVisit: number;
}

export interface RandomizationMetrics {
  totalRandomized: number;
  byArm: ArmRandomizationSummary[];
  unblindingRequests: number;
  pendingUnblindings: number;
  treatmentDiscontinuations: number;
  balance: number; // percentage deviation from planned
}

export interface ArmRandomizationSummary {
  armId: string;
  armName: string;
  count: number;
  planned: number;
  percentComplete: number;
}

export interface ClinicalDashboardData {
  study: StudyOverviewData;
  enrollment: EnrollmentMetrics;
  sites: SiteMetrics;
  visits: VisitMetrics;
  queries: QueryMetrics;
  sdv: SDVMetrics;
  monitoring: MonitoringMetrics;
  randomization: RandomizationMetrics;
  lastUpdated: Date;
}

export interface DashboardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'enrollment' | 'site' | 'visit' | 'query' | 'sdv' | 'monitoring' | 'randomization';
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  createdAt: Date;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: number;
  badgeType?: 'default' | 'warning' | 'critical';
}

export interface ClinicalDashboardProps {
  data: ClinicalDashboardData;
  alerts?: DashboardAlert[];
  onRefresh?: () => void;
  onExport?: () => void;
  onNavigate?: (view: DashboardViewMode) => void;
  onAlertDismiss?: (alertId: string) => void;
  onAlertAction?: (alertId: string) => void;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPhaseDisplayName(phase: StudyPhase): string {
  const names: Record<StudyPhase, string> = {
    PHASE_1: 'Phase 1',
    PHASE_1_2: 'Phase 1/2',
    PHASE_2: 'Phase 2',
    PHASE_2_3: 'Phase 2/3',
    PHASE_3: 'Phase 3',
    PHASE_4: 'Phase 4',
  };
  return names[phase] || phase;
}

export function getStatusDisplayName(status: StudyStatus): string {
  const names: Record<StudyStatus, string> = {
    DRAFT: 'Draft',
    IN_STARTUP: 'In Startup',
    ENROLLING: 'Enrolling',
    CLOSED_TO_ENROLLMENT: 'Closed to Enrollment',
    COMPLETED: 'Completed',
    TERMINATED: 'Terminated',
  };
  return names[status] || status;
}

export function getStatusColor(status: StudyStatus): string {
  const colors: Record<StudyStatus, string> = {
    DRAFT: 'text-gray-600 bg-gray-100',
    IN_STARTUP: 'text-blue-600 bg-blue-100',
    ENROLLING: 'text-green-600 bg-green-100',
    CLOSED_TO_ENROLLMENT: 'text-amber-600 bg-amber-100',
    COMPLETED: 'text-purple-600 bg-purple-100',
    TERMINATED: 'text-red-600 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getTrendIcon(trend: MetricTrend): LucideIcon {
  switch (trend) {
    case 'up':
      return ArrowUpRight;
    case 'down':
      return ArrowDownRight;
    default:
      return Minus;
  }
}

export function getTrendColor(trend: MetricTrend, isPositive: boolean = true): string {
  if (trend === 'stable') return 'text-gray-500';
  if (trend === 'up') return isPositive ? 'text-green-500' : 'text-red-500';
  return isPositive ? 'text-red-500' : 'text-green-500';
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(date);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: MetricTrend;
  trendValue?: string;
  trendPositive?: boolean;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  trendPositive = true,
  onClick,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  const TrendIcon = trend ? getTrendIcon(trend) : null;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor(trend, trendPositive)}`}>
            <TrendIcon className="h-4 w-4" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-gray-900">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  color = '#3B82F6',
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-gray-900">
          {Math.round(percent * 100)}%
        </span>
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>
    </div>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: { label: string; value: number | string; status?: 'success' | 'warning' | 'error' }[];
  onClick?: () => void;
  badge?: number;
  badgeType?: 'default' | 'warning' | 'critical';
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  metrics,
  onClick,
  badge,
  badgeType = 'default',
}: ModuleCardProps) {
  const badgeColors = {
    default: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[badgeType]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{metric.label}</span>
            <span
              className={`text-sm font-medium ${
                metric.status === 'success'
                  ? 'text-green-600'
                  : metric.status === 'warning'
                  ? 'text-amber-600'
                  : metric.status === 'error'
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
            </span>
          </div>
        ))}
      </div>
      {onClick && (
        <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
          View Details
          <ChevronRight className="h-4 w-4 ml-1" />
        </div>
      )}
    </div>
  );
}

interface AlertBannerProps {
  alert: DashboardAlert;
  onDismiss?: () => void;
  onAction?: () => void;
}

function AlertBanner({ alert, onDismiss, onAction }: AlertBannerProps) {
  const typeStyles = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    critical: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  const IconComponent = alert.type === 'critical' ? XCircle : alert.type === 'warning' ? AlertTriangle : Bell;

  return (
    <div className={`rounded-lg border p-3 ${typeStyles[alert.type]}`}>
      <div className="flex items-start gap-3">
        <IconComponent className={`h-5 w-5 mt-0.5 ${iconStyles[alert.type]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{alert.title}</p>
          <p className="text-sm opacity-90 mt-0.5">{alert.message}</p>
          {alert.actionLabel && (
            <button
              className="mt-2 text-sm font-medium underline hover:no-underline"
              onClick={onAction}
            >
              {alert.actionLabel}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            className="text-current opacity-50 hover:opacity-100"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface SiteRankingTableProps {
  sites: SiteEnrollmentSummary[];
  title: string;
  emptyMessage: string;
  isTopPerforming?: boolean;
}

function SiteRankingTable({ sites, title, emptyMessage, isTopPerforming = true }: SiteRankingTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      {sites.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sites.map((site, idx) => (
            <div key={site.siteId} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isTopPerforming
                      ? idx === 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{site.siteName}</p>
                  <p className="text-xs text-gray-500">Site {site.siteNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {site.enrolled}/{site.target}
                </p>
                <p
                  className={`text-xs ${
                    site.percentComplete >= 100
                      ? 'text-green-600'
                      : site.percentComplete >= 50
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatPercent(site.percentComplete)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ClinicalDashboard({
  data,
  alerts = [],
  onRefresh,
  onExport,
  onNavigate,
  onAlertDismiss,
  onAlertAction,
  isLoading = false,
  className = '',
}: ClinicalDashboardProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedAlerts.has(a.id)),
    [alerts, dismissedAlerts]
  );

  const handleDismissAlert = useCallback(
    (alertId: string) => {
      setDismissedAlerts((prev) => new Set(Array.from(prev).concat([alertId])));
      onAlertDismiss?.(alertId);
    },
    [onAlertDismiss]
  );

  const handleAlertAction = useCallback(
    (alertId: string) => {
      onAlertAction?.(alertId);
    },
    [onAlertAction]
  );

  const enrollmentPercent = data.enrollment.planned > 0
    ? (data.enrollment.enrolled / data.enrollment.planned) * 100
    : 0;

  const queryResolutionPercent = data.queries.closed + data.queries.open > 0
    ? (data.queries.closed / (data.queries.closed + data.queries.open)) * 100
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Clinical Dashboard</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.study.status)}`}>
              {getStatusDisplayName(data.study.status)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{data.study.protocolNumber}</span>
            <span>•</span>
            <span>{getPhaseDisplayName(data.study.phase)}</span>
            <span>•</span>
            <span>{data.study.therapeuticArea}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">{data.study.protocolTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onExport}
            title="Export dashboard"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.slice(0, 3).map((alert) => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => handleDismissAlert(alert.id)}
              onAction={() => handleAlertAction(alert.id)}
            />
          ))}
          {visibleAlerts.length > 3 && (
            <button className="text-sm text-blue-600 hover:underline">
              View {visibleAlerts.length - 3} more alerts
            </button>
          )}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Enrolled"
          value={data.enrollment.enrolled}
          subtitle={`of ${data.enrollment.planned} planned`}
          icon={Users}
          trend={data.enrollment.enrollmentTrend}
          trendValue={`${data.enrollment.enrollmentRate}/wk`}
          color={data.enrollment.isOnTrack ? 'green' : 'amber'}
          onClick={() => onNavigate?.('subjects')}
        />
        <MetricCard
          title="Active Sites"
          value={data.sites.active}
          subtitle={`of ${data.sites.total} total`}
          icon={Building2}
          color="blue"
          onClick={() => onNavigate?.('sites')}
        />
        <MetricCard
          title="Visits Completed"
          value={data.visits.completed}
          subtitle={`${formatPercent(data.visits.completionRate)} completion`}
          icon={Calendar}
          trend={data.visits.overdue > 0 ? 'down' : 'stable'}
          color={data.visits.overdue > 0 ? 'amber' : 'green'}
          onClick={() => onNavigate?.('visits')}
        />
        <MetricCard
          title="Open Queries"
          value={data.queries.open}
          subtitle={`${data.queries.overdue} overdue`}
          icon={FileQuestion}
          trend={data.queries.overdue > 0 ? 'down' : 'stable'}
          trendPositive={false}
          color={data.queries.overdue > 0 ? 'red' : 'green'}
          onClick={() => onNavigate?.('queries')}
        />
        <MetricCard
          title="SDV Progress"
          value={formatPercent(data.sdv.verificationRate)}
          subtitle={`${data.sdv.formsVerified}/${data.sdv.formsTotal} forms`}
          icon={ClipboardCheck}
          color="purple"
          onClick={() => onNavigate?.('sdv')}
        />
        <MetricCard
          title="Randomized"
          value={data.randomization.totalRandomized}
          subtitle={`${data.randomization.byArm.length} arms`}
          icon={Shuffle}
          color="blue"
          onClick={() => onNavigate?.('randomization')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Progress */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Enrollment Progress</h2>
            <button
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              onClick={() => onNavigate?.('subjects')}
            >
              View all subjects
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <ProgressRing
                value={data.enrollment.enrolled}
                max={data.enrollment.planned}
                color={data.enrollment.isOnTrack ? '#22C55E' : '#F59E0B'}
                label="enrolled"
              />
            </div>
            <div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Screened</span>
                  </div>
                  <span className="font-medium">{data.enrollment.screened}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Enrolled</span>
                  </div>
                  <span className="font-medium">{data.enrollment.enrolled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Randomized</span>
                  </div>
                  <span className="font-medium">{data.enrollment.randomized}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Completed</span>
                  </div>
                  <span className="font-medium">{data.enrollment.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-600">Withdrawn</span>
                  </div>
                  <span className="font-medium">{data.enrollment.withdrawn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-600">Screen Failures</span>
                  </div>
                  <span className="font-medium">{data.enrollment.screenFailures}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-semibold text-gray-900">
                  {data.enrollment.enrollmentRate.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">subjects/week</p>
                {data.enrollment.projectedCompletion && (
                  <p className="mt-2 text-xs text-gray-500">
                    Projected: {formatDate(data.enrollment.projectedCompletion)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Enrollment status bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Overall Progress</span>
              <span className="font-medium">
                {data.enrollment.enrolled} / {data.enrollment.planned} ({formatPercent(enrollmentPercent)})
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  data.enrollment.isOnTrack ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Site Rankings */}
        <div className="space-y-4">
          <SiteRankingTable
            sites={data.sites.topEnrolling.slice(0, 3)}
            title="Top Enrolling Sites"
            emptyMessage="No enrollment data yet"
            isTopPerforming
          />
          <SiteRankingTable
            sites={data.sites.underPerforming.slice(0, 3)}
            title="Sites Needing Attention"
            emptyMessage="All sites performing well"
            isTopPerforming={false}
          />
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinical Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModuleCard
            title="Site Management"
            description="Sites, investigators, and activation"
            icon={Building2}
            metrics={[
              { label: 'Active', value: data.sites.active, status: 'success' },
              { label: 'Activating', value: data.sites.activating },
              { label: 'Suspended', value: data.sites.suspended, status: data.sites.suspended > 0 ? 'warning' : undefined },
              { label: 'Total', value: data.sites.total },
            ]}
            onClick={() => onNavigate?.('sites')}
          />

          <ModuleCard
            title="Visit Tracking"
            description="Scheduled visits and compliance"
            icon={Calendar}
            metrics={[
              { label: 'Scheduled', value: data.visits.scheduled },
              { label: 'Completed', value: data.visits.completed, status: 'success' },
              { label: 'Overdue', value: data.visits.overdue, status: data.visits.overdue > 0 ? 'error' : undefined },
              { label: 'Missed', value: data.visits.missed, status: data.visits.missed > 0 ? 'warning' : undefined },
            ]}
            badge={data.visits.overdue}
            badgeType="critical"
            onClick={() => onNavigate?.('visits')}
          />

          <ModuleCard
            title="Query Management"
            description="Data queries and resolution"
            icon={FileQuestion}
            metrics={[
              { label: 'Open', value: data.queries.open },
              { label: 'Answered', value: data.queries.answered },
              { label: 'Overdue', value: data.queries.overdue, status: data.queries.overdue > 0 ? 'error' : undefined },
              { label: 'Avg Age', value: `${data.queries.averageAge}d` },
            ]}
            badge={data.queries.overdue}
            badgeType={data.queries.overdue > 10 ? 'critical' : 'warning'}
            onClick={() => onNavigate?.('queries')}
          />

          <ModuleCard
            title="Source Data Verification"
            description="SDV progress and discrepancies"
            icon={ClipboardCheck}
            metrics={[
              { label: 'Verified', value: data.sdv.formsVerified, status: 'success' },
              { label: 'Pending', value: data.sdv.formsPending },
              { label: 'Discrepancies', value: data.sdv.discrepancies, status: data.sdv.discrepancies > 0 ? 'warning' : undefined },
              { label: 'Rate', value: formatPercent(data.sdv.verificationRate) },
            ]}
            onClick={() => onNavigate?.('sdv')}
          />

          <ModuleCard
            title="Site Monitoring"
            description="Monitoring visits and findings"
            icon={Shield}
            metrics={[
              { label: 'Visits Done', value: data.monitoring.visitsCompleted, status: 'success' },
              { label: 'Pending', value: data.monitoring.visitsPending },
              { label: 'Open Findings', value: data.monitoring.openFindings, status: data.monitoring.openFindings > 0 ? 'warning' : undefined },
              { label: 'Critical', value: data.monitoring.criticalFindings, status: data.monitoring.criticalFindings > 0 ? 'error' : undefined },
            ]}
            badge={data.monitoring.criticalFindings}
            badgeType="critical"
            onClick={() => onNavigate?.('monitoring')}
          />

          <ModuleCard
            title="Randomization"
            description="Treatment assignment and unblinding"
            icon={Shuffle}
            metrics={[
              { label: 'Randomized', value: data.randomization.totalRandomized, status: 'success' },
              { label: 'Arms', value: data.randomization.byArm.length },
              { label: 'Unblinding Req', value: data.randomization.unblindingRequests },
              { label: 'Discontinued', value: data.randomization.treatmentDiscontinuations, status: data.randomization.treatmentDiscontinuations > 0 ? 'warning' : undefined },
            ]}
            badge={data.randomization.pendingUnblindings}
            badgeType="warning"
            onClick={() => onNavigate?.('randomization')}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Last updated: {formatRelativeTime(data.lastUpdated)}</span>
        <span>{data.study.sponsor}</span>
      </div>
    </div>
  );
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export interface CreateDashboardDataOptions {
  studyId: string;
  tenantId: string;
}

export function createEmptyDashboardData(options: CreateDashboardDataOptions): ClinicalDashboardData {
  return {
    study: {
      id: options.studyId,
      protocolNumber: '',
      protocolTitle: '',
      phase: 'PHASE_1',
      status: 'DRAFT',
      therapeuticArea: '',
      indication: '',
      sponsor: '',
    },
    enrollment: {
      planned: 0,
      screened: 0,
      enrolled: 0,
      randomized: 0,
      completed: 0,
      withdrawn: 0,
      screenFailures: 0,
      enrollmentRate: 0,
      enrollmentTrend: 'stable',
      isOnTrack: true,
    },
    sites: {
      total: 0,
      active: 0,
      activating: 0,
      suspended: 0,
      closed: 0,
      topEnrolling: [],
      underPerforming: [],
    },
    visits: {
      scheduled: 0,
      completed: 0,
      missed: 0,
      upcoming: 0,
      overdue: 0,
      completionRate: 0,
      averageDelay: 0,
    },
    queries: {
      open: 0,
      answered: 0,
      closed: 0,
      overdue: 0,
      averageAge: 0,
      resolutionRate: 0,
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
    sdv: {
      formsTotal: 0,
      formsVerified: 0,
      formsPending: 0,
      fieldsTotal: 0,
      fieldsVerified: 0,
      discrepancies: 0,
      verificationRate: 0,
    },
    monitoring: {
      visitsPlanned: 0,
      visitsCompleted: 0,
      visitsPending: 0,
      openFindings: 0,
      closedFindings: 0,
      criticalFindings: 0,
      averageFindingsPerVisit: 0,
    },
    randomization: {
      totalRandomized: 0,
      byArm: [],
      unblindingRequests: 0,
      pendingUnblindings: 0,
      treatmentDiscontinuations: 0,
      balance: 0,
    },
    lastUpdated: new Date(),
  };
}

export default ClinicalDashboard;
