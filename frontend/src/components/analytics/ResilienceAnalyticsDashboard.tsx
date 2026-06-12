/**
 * Resilience Analytics Dashboard
 * Visual metrics for storage, circuit breakers, bulkheads, and rate limiters
 * 
 * v0.42.4 - Analytics Dashboard
 */


import React, { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, XCircle, Clock, Database,
  HardDrive, Gauge, Shield, Zap, TrendingUp, TrendingDown,
  RefreshCw, Settings, ChevronDown, ChevronRight, BarChart3,
  ArrowUp, ArrowDown, Minus, PieChart, AlertCircle
} from 'lucide-react';

import { useStorageAnalytics, StorageTrend, StorageAlert } from '@/services/storage-analytics-service';
import { useAllCircuitBreakers, CircuitStats, CircuitState } from '@/services/circuit-breaker-service';
import { useAllBulkheads, BulkheadStats, BulkheadState } from '@/services/bulkhead-service';
import { getRateLimiterRegistry, RateLimitStats } from '@/services/rate-limiter-service';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardTab {
  id: 'overview' | 'storage' | 'circuits' | 'bulkheads' | 'rate-limits';
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ResilienceAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab['id']>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hooks
  const storageAnalytics = useStorageAnalytics();
  const { circuits } = useAllCircuitBreakers();
  const { bulkheads } = useAllBulkheads();
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats[]>([]);

  // Fetch rate limit stats
  useEffect(() => {
    const fetchStats = () => {
      const registry = getRateLimiterRegistry();
      const allStats: RateLimitStats[] = [];
      for (const [, limiter] of Array.from(registry.getAll())) {
        const stats = limiter.getStats();
        if (Array.isArray(stats)) {
          allStats.push(...stats);
        } else {
          allStats.push(stats);
        }
      }
      setRateLimitStats(allStats);
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storageAnalytics.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const tabs: DashboardTab[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'circuits', label: 'Circuits', icon: <Zap className="w-4 h-4" /> },
    { id: 'bulkheads', label: 'Bulkheads', icon: <Shield className="w-4 h-4" /> },
    { id: 'rate-limits', label: 'Rate Limits', icon: <Gauge className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Resilience Analytics</h2>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <OverviewPanel
            storageAnalytics={storageAnalytics}
            circuits={circuits}
            bulkheads={bulkheads}
            rateLimitStats={rateLimitStats}
          />
        )}
        {activeTab === 'storage' && <StoragePanel storageAnalytics={storageAnalytics} />}
        {activeTab === 'circuits' && <CircuitsPanel circuits={circuits} />}
        {activeTab === 'bulkheads' && <BulkheadsPanel bulkheads={bulkheads} />}
        {activeTab === 'rate-limits' && <RateLimitsPanel stats={rateLimitStats} />}
      </div>
    </div>
  );
}

// =============================================================================
// OVERVIEW PANEL
// =============================================================================

interface OverviewPanelProps {
  storageAnalytics: ReturnType<typeof useStorageAnalytics>;
  circuits: Map<string, CircuitStats>;
  bulkheads: Map<string, BulkheadStats>;
  rateLimitStats: RateLimitStats[];
}

function OverviewPanel({ storageAnalytics, circuits, bulkheads, rateLimitStats }: OverviewPanelProps) {
  const { trend, alerts } = storageAnalytics;

  // Calculate aggregate stats
  const openCircuits = Array.from(circuits.values()).filter(c => c.state === 'open').length;
  const totalCircuits = circuits.size;
  
  const overloadedBulkheads = Array.from(bulkheads.values()).filter(b => b.state === 'overloaded').length;
  const totalBulkheads = bulkheads.size;
  
  const totalRejected = rateLimitStats.reduce((sum, s) => sum + s.totalRejected, 0);
  const totalAllowed = rateLimitStats.reduce((sum, s) => sum + s.totalAllowed, 0);

  const systemHealth = calculateSystemHealth(openCircuits, totalCircuits, overloadedBulkheads, totalBulkheads, alerts.length);

  return (
    <div className="space-y-6">
      {/* System Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="System Health"
          value={`${systemHealth}%`}
          icon={<Activity className="w-5 h-5" />}
          status={systemHealth >= 90 ? 'success' : systemHealth >= 70 ? 'warning' : 'error'}
          trend={systemHealth >= 90 ? 'up' : systemHealth >= 70 ? 'flat' : 'down'}
        />
        <MetricCard
          title="Circuit Breakers"
          value={`${totalCircuits - openCircuits}/${totalCircuits}`}
          subtitle="healthy"
          icon={<Zap className="w-5 h-5" />}
          status={openCircuits === 0 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Bulkheads"
          value={`${totalBulkheads - overloadedBulkheads}/${totalBulkheads}`}
          subtitle="healthy"
          icon={<Shield className="w-5 h-5" />}
          status={overloadedBulkheads === 0 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Rate Limits"
          value={totalAllowed > 0 ? `${((totalAllowed / (totalAllowed + totalRejected)) * 100).toFixed(1)}%` : '100%'}
          subtitle="success rate"
          icon={<Gauge className="w-5 h-5" />}
          status={totalRejected === 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Storage Overview */}
      {trend && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Storage Usage
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  {formatBytes(trend.dataPoints[0]?.used || 0)} used
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {formatBytes(trend.dataPoints[0]?.available || 0)} available
                </span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (trend.dataPoints[0]?.usedPercent || 0) >= 90
                      ? 'bg-red-500'
                      : (trend.dataPoints[0]?.usedPercent || 0) >= 70
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${trend.dataPoints[0]?.usedPercent || 0}%` }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {(trend.dataPoints[0]?.usedPercent || 0).toFixed(1)}%
            </div>
          </div>
          {trend.summary.growthRate > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Growing at {formatBytes(trend.summary.growthRate)}/day
              {trend.summary.projectedFull && (
                <span className="text-amber-500 ml-2">
                  • Full in ~{Math.ceil((trend.summary.projectedFull - Date.now()) / (24 * 60 * 60 * 1000))} days
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Active Alerts ({alerts.length})
          </h3>
          {alerts.slice(0, 3).map(alert => (
            <AlertRow key={alert.id} alert={alert} onAcknowledge={storageAnalytics.acknowledgeAlert} />
          ))}
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          label="Avg Circuit Error Rate"
          value={`${calculateAvgErrorRate(circuits).toFixed(1)}%`}
        />
        <QuickStat
          label="Avg Bulkhead Utilization"
          value={`${calculateAvgUtilization(bulkheads).toFixed(1)}%`}
        />
        <QuickStat
          label="Total Rate Limit Hits"
          value={totalRejected.toLocaleString()}
        />
        <QuickStat
          label="Storage Alerts"
          value={alerts.length.toString()}
        />
      </div>
    </div>
  );
}

// =============================================================================
// STORAGE PANEL
// =============================================================================

interface StoragePanelProps {
  storageAnalytics: ReturnType<typeof useStorageAnalytics>;
}

function StoragePanel({ storageAnalytics }: StoragePanelProps) {
  const { trend, alerts, period, setPeriod, acknowledgeAlert } = storageAnalytics;

  const periods: Array<{ value: StorageTrend['period']; label: string }> = [
    { value: 'hour', label: 'Hour' },
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">Period:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-sm transition-colors ${
                period === p.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usage Chart (Simplified) */}
      {trend && trend.dataPoints.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">Usage Over Time</h3>
          <div className="h-32 flex items-end gap-1">
            {trend.dataPoints.slice(-20).map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                style={{ height: `${point.usedPercent}%` }}
                title={`${point.usedPercent.toFixed(1)}% - ${new Date(point.timestamp).toLocaleString()}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>Oldest</span>
            <span>Most Recent</span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {trend && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Avg Usage</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {trend.summary.avgUsage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Max Usage</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {trend.summary.maxUsage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Largest Store</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {trend.summary.largestStore || 'N/A'}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Growth Rate</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatBytes(trend.summary.growthRate)}/day
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="space-y-2">
        <h3 className="font-medium text-slate-900 dark:text-white">Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No active alerts</p>
        ) : (
          alerts.map(alert => (
            <AlertRow key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CIRCUITS PANEL
// =============================================================================

interface CircuitsPanelProps {
  circuits: Map<string, CircuitStats>;
}

function CircuitsPanel({ circuits }: CircuitsPanelProps) {
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {circuits.size === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
          No circuit breakers registered
        </p>
      ) : (
        Array.from(circuits.entries()).map(([name, stats]) => (
          <CircuitRow
            key={name}
            name={name}
            stats={stats}
            isExpanded={expandedCircuit === name}
            onToggle={() => setExpandedCircuit(expandedCircuit === name ? null : name)}
          />
        ))
      )}
    </div>
  );
}

interface CircuitRowProps {
  name: string;
  stats: CircuitStats;
  isExpanded: boolean;
  onToggle: () => void;
}

function CircuitRow({ name, stats, isExpanded, onToggle }: CircuitRowProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <StateIndicator state={stats.state} />
          <span className="font-medium text-slate-900 dark:text-white">{name}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {stats.totalRequests} requests
          </span>
          <span className={stats.errorRate > 50 ? 'text-red-500' : stats.errorRate > 20 ? 'text-amber-500' : 'text-green-500'}>
            {stats.errorRate.toFixed(1)}% error
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Failures</div>
            <div className="font-medium text-slate-900 dark:text-white">{stats.failures}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Successes</div>
            <div className="font-medium text-slate-900 dark:text-white">{stats.successes}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Consecutive Failures</div>
            <div className="font-medium text-slate-900 dark:text-white">{stats.consecutiveFailures}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Last State Change</div>
            <div className="font-medium text-slate-900 dark:text-white">
              {new Date(stats.lastStateChange).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BULKHEADS PANEL
// =============================================================================

interface BulkheadsPanelProps {
  bulkheads: Map<string, BulkheadStats>;
}

function BulkheadsPanel({ bulkheads }: BulkheadsPanelProps) {
  return (
    <div className="space-y-4">
      {bulkheads.size === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
          No bulkheads registered
        </p>
      ) : (
        Array.from(bulkheads.entries()).map(([name, stats]) => (
          <BulkheadRow key={name} name={name} stats={stats} />
        ))
      )}
    </div>
  );
}

interface BulkheadRowProps {
  name: string;
  stats: BulkheadStats;
}

function BulkheadRow({ name, stats }: BulkheadRowProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <BulkheadStateIndicator state={stats.state} />
          <span className="font-medium text-slate-900 dark:text-white">{name}</span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {stats.totalExecuted} executed • {stats.totalRejected} rejected
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Concurrency */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Concurrency</span>
            <span>{stats.activeCount}/{stats.maxConcurrent}</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.utilizationPercent >= 90 ? 'bg-red-500' :
                stats.utilizationPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${stats.utilizationPercent}%` }}
            />
          </div>
        </div>

        {/* Queue */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Queue</span>
            <span>{stats.queuedCount}/{stats.maxQueued}</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.queueUtilizationPercent >= 90 ? 'bg-red-500' :
                stats.queueUtilizationPercent >= 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${stats.queueUtilizationPercent}%` }}
            />
          </div>
        </div>
      </div>

      {stats.avgExecutionTime > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Avg execution time: {stats.avgExecutionTime.toFixed(0)}ms
        </p>
      )}
    </div>
  );
}

// =============================================================================
// RATE LIMITS PANEL
// =============================================================================

interface RateLimitsPanelProps {
  stats: RateLimitStats[];
}

function RateLimitsPanel({ stats }: RateLimitsPanelProps) {
  return (
    <div className="space-y-4">
      {stats.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
          No rate limiters registered
        </p>
      ) : (
        stats.map((stat, i) => (
          <RateLimitRow key={`${stat.key}-${i}`} stats={stat} />
        ))
      )}
    </div>
  );
}

interface RateLimitRowProps {
  stats: RateLimitStats;
}

function RateLimitRow({ stats }: RateLimitRowProps) {
  const total = stats.totalAllowed + stats.totalRejected;
  const successRate = total > 0 ? (stats.totalAllowed / total) * 100 : 100;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {stats.strategy}
          </span>
          <span className="font-medium text-slate-900 dark:text-white">{stats.key}</span>
        </div>
        <div className={`text-sm ${successRate >= 95 ? 'text-green-500' : successRate >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
          {successRate.toFixed(1)}% success
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Allowed</div>
          <div className="font-medium text-green-600 dark:text-green-400">{stats.totalAllowed}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Rejected</div>
          <div className="font-medium text-red-600 dark:text-red-400">{stats.totalRejected}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Queued</div>
          <div className="font-medium text-amber-600 dark:text-amber-400">{stats.totalQueued}</div>
        </div>
      </div>

      {stats.avgWaitTime > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Avg wait time: {stats.avgWaitTime.toFixed(0)}ms
        </p>
      )}
    </div>
  );
}

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  status: 'success' | 'warning' | 'error';
  trend?: 'up' | 'down' | 'flat';
}

function MetricCard({ title, value, subtitle, icon, status, trend }: MetricCardProps) {
  const statusColors = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className={`rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-80">{title}</span>
        {icon}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {subtitle && <span className="text-sm opacity-80 mb-0.5">{subtitle}</span>}
        {trend && (
          <span className="mb-0.5">
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            {trend === 'flat' && <Minus className="w-4 h-4" />}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function StateIndicator({ state }: { state: CircuitState }) {
  const colors = {
    closed: 'bg-green-500',
    open: 'bg-red-500',
    'half-open': 'bg-amber-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[state]}`} />
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {state}
      </span>
    </div>
  );
}

function BulkheadStateIndicator({ state }: { state: BulkheadState }) {
  const colors = {
    healthy: 'bg-green-500',
    saturated: 'bg-amber-500',
    overloaded: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[state]}`} />
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {state}
      </span>
    </div>
  );
}

interface AlertRowProps {
  alert: StorageAlert;
  onAcknowledge: (id: string) => void;
}

function AlertRow({ alert, onAcknowledge }: AlertRowProps) {
  const severityColors = {
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  };

  const severityIcons = {
    info: <AlertCircle className="w-4 h-4 text-blue-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    critical: <XCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${severityColors[alert.severity]}`}>
      {severityIcons[alert.severity]}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
      <button
        onClick={() => onAcknowledge(alert.id)}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
        title="Acknowledge"
      >
        <CheckCircle className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
}

function calculateSystemHealth(
  openCircuits: number,
  totalCircuits: number,
  overloadedBulkheads: number,
  totalBulkheads: number,
  alertCount: number
): number {
  let health = 100;

  // Circuits: -20% per open circuit
  if (totalCircuits > 0) {
    health -= (openCircuits / totalCircuits) * 40;
  }

  // Bulkheads: -15% per overloaded bulkhead
  if (totalBulkheads > 0) {
    health -= (overloadedBulkheads / totalBulkheads) * 30;
  }

  // Alerts: -5% per alert, max -20%
  health -= Math.min(alertCount * 5, 20);

  return Math.max(0, Math.round(health));
}

function calculateAvgErrorRate(circuits: Map<string, CircuitStats>): number {
  if (circuits.size === 0) return 0;
  const total = Array.from(circuits.values()).reduce((sum, c) => sum + c.errorRate, 0);
  return total / circuits.size;
}

function calculateAvgUtilization(bulkheads: Map<string, BulkheadStats>): number {
  if (bulkheads.size === 0) return 0;
  const total = Array.from(bulkheads.values()).reduce((sum, b) => sum + b.utilizationPercent, 0);
  return total / bulkheads.size;
}

export { ResilienceAnalyticsDashboard };
