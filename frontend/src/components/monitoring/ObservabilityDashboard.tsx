
/**
 * Observability Dashboard Component
 * Real-time monitoring of health, metrics, and errors
 * 
 * @version 0.15.32
 */


import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Bug,
  Shield,
  Gauge
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  lastChecked: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: HealthCheck[];
}

interface RequestMetrics {
  total: number;
  errorRate: number;
  requestsPerSecond: number;
  latency: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  byStatusCode: Record<number, number>;
  byMethod: Record<string, number>;
  byPath: Record<string, { count: number; avgLatencyMs: number; errorRate: number }>;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  last24Hours: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

interface TrackedError {
  id: string;
  timestamp: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  count: number;
  lastSeen: string;
  resolved: boolean;
}

interface MetricsData {
  timestamp: string;
  uptime: number;
  requests: RequestMetrics;
  errors: ErrorStats;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    healthy: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
    degraded: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4" /> },
    unhealthy: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
    live: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <Activity className="w-4 h-4" /> },
    ready: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
  };

  const { bg, text, icon } = config[status] || config.unhealthy;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-gray-800/50 border-gray-700',
    success: 'bg-green-900/20 border-green-700/50',
    warning: 'bg-amber-900/20 border-amber-700/50',
    danger: 'bg-red-900/20 border-red-700/50',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-gray-700/50">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
             trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ObservabilityDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [errors, setErrors] = useState<TrackedError[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, metricsRes, errorsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/metrics'),
        fetch('/api/errors?limit=10'),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }
      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }
      if (errorsRes.ok) {
        const data = await errorsRes.json();
        setErrors(data.data || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Observability</h1>
          <p className="text-sm text-gray-400">
            Real-time health, metrics, and error tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-700 text-gray-400 border border-gray-600'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="System Status"
          value={health?.status || 'Unknown'}
          subtitle={`Version ${health?.version || '?'}`}
          icon={<Server className="w-5 h-5 text-cyan-400" />}
          variant={health?.status === 'healthy' ? 'success' : health?.status === 'degraded' ? 'warning' : 'danger'}
        />
        <StatCard
          title="Uptime"
          value={formatUptime(health?.uptime || 0)}
          icon={<Clock className="w-5 h-5 text-green-400" />}
        />
        <StatCard
          title="Total Requests"
          value={metrics?.requests.total.toLocaleString() || '0'}
          subtitle={`${metrics?.requests.requestsPerSecond.toFixed(2) || 0} req/s`}
          icon={<Activity className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          title="Error Rate"
          value={`${metrics?.requests.errorRate.toFixed(2) || 0}%`}
          subtitle={`${metrics?.errors.unresolved || 0} unresolved`}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          variant={
            (metrics?.requests.errorRate || 0) > 5 ? 'danger' :
            (metrics?.requests.errorRate || 0) > 1 ? 'warning' : 'default'
          }
        />
      </div>

      {/* Health Checks */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Health Checks
        </h2>
        <div className="space-y-3">
          {health?.checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.name === 'database' ? (
                  <Database className="w-5 h-5 text-gray-400" />
                ) : check.name === 'memory' ? (
                  <HardDrive className="w-5 h-5 text-gray-400" />
                ) : (
                  <Zap className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-white font-medium capitalize">{check.name}</p>
                  {check.message && (
                    <p className="text-sm text-gray-400">{check.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{check.latencyMs}ms</span>
                <StatusBadge status={check.status} />
              </div>
            </div>
          ))}
          {(!health?.checks || health.checks.length === 0) && (
            <p className="text-gray-400 text-center py-4">No health checks registered</p>
          )}
        </div>
      </div>

      {/* Latency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            Response Latency
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-white">
                {metrics?.requests.latency.avgMs || 0}ms
              </p>
              <p className="text-sm text-gray-400">Average</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-white">
                {metrics?.requests.latency.p50Ms || 0}ms
              </p>
              <p className="text-sm text-gray-400">P50</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-amber-400">
                {metrics?.requests.latency.p95Ms || 0}ms
              </p>
              <p className="text-sm text-gray-400">P95</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-red-400">
                {metrics?.requests.latency.p99Ms || 0}ms
              </p>
              <p className="text-sm text-gray-400">P99</p>
            </div>
          </div>
        </div>

        {/* HTTP Methods */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Requests by Method
          </h2>
          <div className="space-y-2">
            {Object.entries(metrics?.requests.byMethod || {}).map(([method, count]) => {
              const total = metrics?.requests.total || 1;
              const percentage = (count / total) * 100;
              const colors: Record<string, string> = {
                GET: 'bg-green-500',
                POST: 'bg-blue-500',
                PUT: 'bg-amber-500',
                PATCH: 'bg-orange-500',
                DELETE: 'bg-red-500',
              };

              return (
                <div key={method} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-mono text-gray-400">{method}</span>
                  <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[method] || 'bg-gray-500'} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-gray-400 text-right">
                    {count.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {Object.keys(metrics?.requests.byMethod || {}).length === 0 && (
              <p className="text-gray-400 text-center py-4">No requests recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bug className="w-5 h-5 text-red-400" />
          Recent Errors
          {metrics?.errors.unresolved && metrics.errors.unresolved > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
              {metrics.errors.unresolved} unresolved
            </span>
          )}
        </h2>
        <div className="space-y-2">
          {errors.map((error) => (
            <div
              key={error.id}
              className={`p-3 rounded-lg border ${
                error.resolved
                  ? 'bg-gray-900/30 border-gray-700/50'
                  : 'bg-gray-900/50 border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={error.severity} />
                    <span className="text-xs text-gray-500 font-mono">{error.category}</span>
                    {error.count > 1 && (
                      <span className="text-xs text-gray-400">×{error.count}</span>
                    )}
                  </div>
                  <p className="text-sm text-white truncate">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last seen: {new Date(error.lastSeen).toLocaleString()}
                  </p>
                </div>
                {error.resolved && (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 ml-2" />
                )}
              </div>
            </div>
          ))}
          {errors.length === 0 && (
            <p className="text-gray-400 text-center py-8">
              No errors tracked yet - that&apos;s a good thing! 🎉
            </p>
          )}
        </div>
      </div>

      {/* Error Stats */}
      {metrics?.errors && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/30 text-center">
            <p className="text-2xl font-bold text-red-400">{metrics.errors.bySeverity.critical || 0}</p>
            <p className="text-sm text-gray-400">Critical</p>
          </div>
          <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-700/30 text-center">
            <p className="text-2xl font-bold text-orange-400">{metrics.errors.bySeverity.high || 0}</p>
            <p className="text-sm text-gray-400">High</p>
          </div>
          <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/30 text-center">
            <p className="text-2xl font-bold text-amber-400">{metrics.errors.bySeverity.medium || 0}</p>
            <p className="text-sm text-gray-400">Medium</p>
          </div>
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30 text-center">
            <p className="text-2xl font-bold text-blue-400">{metrics.errors.bySeverity.low || 0}</p>
            <p className="text-sm text-gray-400">Low</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservabilityDashboard;
