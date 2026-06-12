/**
 * Lab Dashboard Component
 * Overview dashboard with metrics, alerts, and quick actions
 * @version 0.21.2
 */


import React, { useMemo } from 'react';
import {
  Atom,
  FlaskConical,
  TestTube,
  Package,
  FlaskRound,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Shield,
  Thermometer,
  Bell,
  ChevronRight,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface LabDashboardMetrics {
  compounds: {
    total: number;
    active: number;
    recentlyRegistered: number; // Last 30 days
    byStatus: Record<string, number>;
  };
  samples: {
    total: number;
    inStorage: number;
    inUse: number;
    expiringSoon: number;
    lowStock: number;
  };
  batches: {
    total: number;
    released: number;
    pendingQC: number;
    expiringSoon: number;
  };
  experiments: {
    total: number;
    active: number;
    inProgress: number;
    completedThisMonth: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    unacknowledged: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'compound' | 'sample' | 'batch' | 'experiment' | 'alert';
  action: string;
  description: string;
  timestamp: Date;
  user?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface LabDashboardProps {
  metrics: LabDashboardMetrics;
  recentActivity?: RecentActivity[];
  onNavigate?: (tab: string) => void;
  onAlertClick?: (alertId: string) => void;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    compound: Atom,
    sample: TestTube,
    batch: Package,
    experiment: FlaskRound,
    alert: Bell,
  };
  return icons[type] || Activity;
}

function getActivityColor(type: string, severity?: string): string {
  if (severity === 'critical') return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  if (severity === 'warning') return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
  
  const colors: Record<string, string> = {
    compound: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    sample: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    batch: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    experiment: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
    alert: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  };
  return colors[type] || 'text-gray-600 bg-gray-100';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', onClick }: MetricCardProps) {
  const variantStyles = {
    default: {
      container: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
      icon: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      value: 'text-gray-900 dark:text-white',
    },
    success: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
      value: 'text-green-700 dark:text-green-300',
    },
    warning: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
      value: 'text-amber-700 dark:text-amber-300',
    },
    danger: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
      value: 'text-red-700 dark:text-red-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`rounded-lg border p-4 ${styles.container} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${styles.value}`}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${styles?.icon ?? ''}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  variant?: 'default' | 'warning' | 'danger';
  onClick?: () => void;
}

function QuickActionCard({ title, description, icon: Icon, count, variant = 'default', onClick }: QuickActionCardProps) {
  const variants = {
    default: {
      border: 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600',
      icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600',
      icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
    danger: {
      border: 'border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600',
      icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
  };

  const style = variants[variant];

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border ${style?.border ?? ''} p-4 cursor-pointer transition-all hover:shadow-sm`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style?.icon ?? ''}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
              {count !== undefined && count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' :
                  variant === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {count}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: RecentActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type, activity.severity);

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`p-1.5 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          <span className="font-medium">{activity.action}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{formatTimeAgo(activity.timestamp)}</span>
          {activity.user && (
            <>
              <span>•</span>
              <span>{activity.user}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LabDashboard({
  metrics,
  recentActivity = [],
  onNavigate,
  onAlertClick,
  className = '',
}: LabDashboardProps) {
  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalItems = 
      metrics.compounds.total + 
      metrics.samples.total + 
      metrics.batches.total + 
      metrics.experiments.total;
    
    const activeItems =
      metrics.compounds.active +
      metrics.samples.inStorage +
      metrics.batches.released +
      metrics.experiments.active;

    const attentionNeeded =
      metrics.samples.expiringSoon +
      metrics.samples.lowStock +
      metrics.batches.pendingQC +
      metrics.alerts.unacknowledged;

    return { totalItems, activeItems, attentionNeeded };
  }, [metrics]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Compounds"
          value={metrics.compounds.total}
          subtitle={`${metrics.compounds.active} active`}
          icon={Atom}
          onClick={() => onNavigate?.('compounds')}
        />
        <MetricCard
          title="Samples"
          value={metrics.samples.total}
          subtitle={`${metrics.samples.inStorage} in storage`}
          icon={TestTube}
          onClick={() => onNavigate?.('samples')}
        />
        <MetricCard
          title="Batches"
          value={metrics.batches.total}
          subtitle={`${metrics.batches.released} released`}
          icon={Package}
          onClick={() => onNavigate?.('batches')}
        />
        <MetricCard
          title="Experiments"
          value={metrics.experiments.total}
          subtitle={`${metrics.experiments.inProgress} in progress`}
          icon={FlaskRound}
          onClick={() => onNavigate?.('experiments')}
        />
        <MetricCard
          title="Pending QC"
          value={metrics.batches.pendingQC}
          subtitle="Batches awaiting QC"
          icon={Shield}
          variant={metrics.batches.pendingQC > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate?.('batches')}
        />
        <MetricCard
          title="Alerts"
          value={metrics.alerts.unacknowledged}
          subtitle={`${metrics.alerts.critical} critical`}
          icon={Bell}
          variant={metrics.alerts.critical > 0 ? 'danger' : metrics.alerts.unacknowledged > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate?.('alerts')}
        />
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Needs Attention</h3>
          <div className="space-y-3">
            {metrics.alerts.critical > 0 && (
              <QuickActionCard
                title="Critical Alerts"
                description="Alerts requiring immediate action"
                icon={AlertCircle}
                count={metrics.alerts.critical}
                variant="danger"
                onClick={() => onNavigate?.('alerts')}
              />
            )}
            {metrics.batches.pendingQC > 0 && (
              <QuickActionCard
                title="Pending QC"
                description="Batches awaiting quality control"
                icon={Shield}
                count={metrics.batches.pendingQC}
                variant="warning"
                onClick={() => onNavigate?.('batches')}
              />
            )}
            {metrics.samples.expiringSoon > 0 && (
              <QuickActionCard
                title="Expiring Samples"
                description="Samples expiring within 30 days"
                icon={Clock}
                count={metrics.samples.expiringSoon}
                variant="warning"
                onClick={() => onNavigate?.('samples')}
              />
            )}
            {metrics.samples.lowStock > 0 && (
              <QuickActionCard
                title="Low Stock"
                description="Samples with critically low quantities"
                icon={AlertTriangle}
                count={metrics.samples.lowStock}
                variant="warning"
                onClick={() => onNavigate?.('samples')}
              />
            )}
            {metrics.batches.expiringSoon > 0 && (
              <QuickActionCard
                title="Expiring Batches"
                description="Batches expiring within 30 days"
                icon={Calendar}
                count={metrics.batches.expiringSoon}
                onClick={() => onNavigate?.('batches')}
              />
            )}
            {summaryMetrics.attentionNeeded === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">All systems normal</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compound Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Atom className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-gray-900 dark:text-white">Compound Status</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.compounds.byStatus).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900 dark:text-white">Sample Status</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">In Storage</span>
              <span className="font-medium text-gray-900 dark:text-white">{metrics.samples.inStorage}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">In Use</span>
              <span className="font-medium text-gray-900 dark:text-white">{metrics.samples.inUse}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-600 dark:text-amber-400">Expiring Soon</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{metrics.samples.expiringSoon}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600 dark:text-red-400">Low Stock</span>
              <span className="font-medium text-red-600 dark:text-red-400">{metrics.samples.lowStock}</span>
            </div>
          </div>
        </div>

        {/* Batch Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-gray-900 dark:text-white">Batch Status</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Released</span>
              <span className="font-medium text-green-600 dark:text-green-400">{metrics.batches.released}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-600 dark:text-amber-400">Pending QC</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{metrics.batches.pendingQC}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expiring Soon</span>
              <span className="font-medium text-gray-900 dark:text-white">{metrics.batches.expiringSoon}</span>
            </div>
          </div>
        </div>

        {/* Experiment Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskRound className="h-5 w-5 text-teal-600" />
            <h4 className="font-medium text-gray-900 dark:text-white">Experiment Status</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Active</span>
              <span className="font-medium text-gray-900 dark:text-white">{metrics.experiments.active}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">In Progress</span>
              <span className="font-medium text-green-600 dark:text-green-400">{metrics.experiments.inProgress}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Completed (Month)</span>
              <span className="font-medium text-gray-900 dark:text-white">{metrics.experiments.completedThisMonth}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMockLabDashboardMetrics(): LabDashboardMetrics {
  return {
    compounds: {
      total: 156,
      active: 42,
      recentlyRegistered: 8,
      byStatus: {
        VIRTUAL: 28,
        SYNTHESIZED: 35,
        CHARACTERIZED: 22,
        ACTIVE: 42,
        INACTIVE: 18,
        DISCONTINUED: 11,
      },
    },
    samples: {
      total: 2847,
      inStorage: 2156,
      inUse: 342,
      expiringSoon: 67,
      lowStock: 23,
    },
    batches: {
      total: 89,
      released: 72,
      pendingQC: 8,
      expiringSoon: 5,
    },
    experiments: {
      total: 234,
      active: 28,
      inProgress: 15,
      completedThisMonth: 12,
    },
    alerts: {
      total: 18,
      critical: 2,
      warning: 8,
      unacknowledged: 5,
    },
  };
}

export function createMockRecentActivity(): RecentActivity[] {
  return [
    {
      id: '1',
      type: 'experiment',
      action: 'Experiment completed',
      description: 'EXP-2025-0042 dose-response study completed successfully',
      timestamp: new Date(Date.now() - 30 * 60000),
      user: 'Dr. Smith',
    },
    {
      id: '2',
      type: 'batch',
      action: 'Batch released',
      description: 'BATCH-2025-023 passed QC and released for use',
      timestamp: new Date(Date.now() - 2 * 3600000),
      user: 'QC Manager',
    },
    {
      id: '3',
      type: 'alert',
      action: 'Low stock alert',
      description: 'Sample SMP-2024-1847 below reorder threshold',
      timestamp: new Date(Date.now() - 4 * 3600000),
      severity: 'warning',
    },
    {
      id: '4',
      type: 'compound',
      action: 'Compound registered',
      description: 'ABC-12456 added to compound library',
      timestamp: new Date(Date.now() - 8 * 3600000),
      user: 'Dr. Johnson',
    },
    {
      id: '5',
      type: 'sample',
      action: 'Sample transferred',
      description: 'SMP-2025-0156 moved to Freezer B',
      timestamp: new Date(Date.now() - 24 * 3600000),
      user: 'Lab Tech',
    },
  ];
}

export default LabDashboard;
