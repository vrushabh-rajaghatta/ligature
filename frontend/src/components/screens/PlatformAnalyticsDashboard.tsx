

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Globe,
  Zap,
  Shield,
  Brain,
  Target,
  ArrowRight,
  ChevronRight,
  Download,
  RefreshCw,
  Filter,
  Layers,
  GitBranch,
  FileCheck,
  Send,
  Heart,
  FlaskConical,
  Pill,
  Building,
  LayoutDashboard,
  PieChart,
  LineChart,
  BarChart2,
  Sparkles,
  MousePointerClick,
  Route,
  Flame,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usageEventService, UsageSummary } from '@/services/usage-event-service';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// PLATFORM ANALYTICS DASHBOARD - v200
// Comprehensive platform-wide analytics, metrics, and operational intelligence
// ============================================================================

type TimeRange = '24h' | '7d' | '30d' | '90d' | 'ytd' | 'all';
type MetricView = 'overview' | 'modules' | 'data-quality' | 'processing' | 'compliance' | 'ai-insights' | 'user-behavior';

interface PlatformMetric {
  id: string;
  name: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  trend?: number[];
}

interface ModuleHealth {
  moduleId: string;
  moduleName: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  lastActivity: string;
  activeUsers: number;
  pendingItems: number;
  errorRate: number;
}

interface DataQualityScore {
  domain: string;
  score: number;
  recordCount: number;
  validRecords: number;
  issues: number;
  lastAudit: string;
}

interface ProcessingMetric {
  processType: string;
  completed: number;
  pending: number;
  failed: number;
  avgProcessingTime: number;
  throughput: number;
}

// Mock Platform Data
const platformMetrics: PlatformMetric[] = [
  { id: 'pm-1', name: 'Total Products', value: 47, previousValue: 45, change: 4.4, changeType: 'increase', trend: [42, 43, 44, 45, 45, 46, 47] },
  { id: 'pm-2', name: 'Active Studies', value: 28, previousValue: 26, change: 7.7, changeType: 'increase', trend: [24, 25, 25, 26, 27, 27, 28] },
  { id: 'pm-3', name: 'Submissions (YTD)', value: 156, previousValue: 142, change: 9.9, changeType: 'increase', trend: [120, 128, 135, 142, 148, 152, 156] },
  { id: 'pm-4', name: 'HAQ Response Rate', value: '94.2%', previousValue: '92.1%', change: 2.3, changeType: 'increase' },
  { id: 'pm-5', name: 'Documents Authored', value: '12,847', previousValue: '11,234', change: 14.4, changeType: 'increase' },
  { id: 'pm-6', name: 'IDMP Entities', value: '1,247', previousValue: '1,180', change: 5.7, changeType: 'increase' },
  { id: 'pm-7', name: 'AI Consistency Score', value: '97.3%', previousValue: '95.8%', change: 1.6, changeType: 'increase' },
  { id: 'pm-8', name: 'Data Quality Index', value: '94.7%', previousValue: '93.2%', change: 1.6, changeType: 'increase' },
];

const moduleHealth: ModuleHealth[] = [
  { moduleId: 'portfolio', moduleName: 'Portfolio', status: 'healthy', uptime: 99.99, lastActivity: '2 min ago', activeUsers: 12, pendingItems: 3, errorRate: 0.01 },
  { moduleId: 'ctms', moduleName: 'Clinical Trials', status: 'healthy', uptime: 99.95, lastActivity: '5 min ago', activeUsers: 8, pendingItems: 15, errorRate: 0.02 },
  { moduleId: 'safety', moduleName: 'Safety & PV', status: 'warning', uptime: 99.87, lastActivity: '1 min ago', activeUsers: 6, pendingItems: 47, errorRate: 0.15 },
  { moduleId: 'authoring', moduleName: 'Authoring', status: 'healthy', uptime: 99.98, lastActivity: '30 sec ago', activeUsers: 24, pendingItems: 8, errorRate: 0.03 },
  { moduleId: 'submissions-hub', moduleName: 'Submissions Hub', status: 'healthy', uptime: 99.99, lastActivity: '3 min ago', activeUsers: 5, pendingItems: 2, errorRate: 0.01 },
  { moduleId: 'haq', moduleName: 'HAQ', status: 'healthy', uptime: 99.97, lastActivity: '10 min ago', activeUsers: 4, pendingItems: 12, errorRate: 0.02 },
  { moduleId: 'master-data', moduleName: 'Master Data', status: 'healthy', uptime: 99.99, lastActivity: '1 min ago', activeUsers: 3, pendingItems: 0, errorRate: 0.00 },
  { moduleId: 'idmp', moduleName: 'IDMP', status: 'healthy', uptime: 99.99, lastActivity: '5 min ago', activeUsers: 2, pendingItems: 0, errorRate: 0.00 },
  { moduleId: 'ai-consistency', moduleName: 'AI Consistency', status: 'healthy', uptime: 99.94, lastActivity: '2 min ago', activeUsers: 3, pendingItems: 5, errorRate: 0.05 },
  { moduleId: 'qms', moduleName: 'QMS', status: 'healthy', uptime: 99.96, lastActivity: '15 min ago', activeUsers: 7, pendingItems: 23, errorRate: 0.04 },
];

const dataQualityScores: DataQualityScore[] = [
  { domain: 'Products', score: 96.8, recordCount: 47, validRecords: 46, issues: 3, lastAudit: '2025-12-31T08:00:00Z' },
  { domain: 'Substances', score: 94.2, recordCount: 128, validRecords: 121, issues: 12, lastAudit: '2025-12-31T08:00:00Z' },
  { domain: 'Organizations', score: 97.5, recordCount: 892, validRecords: 870, issues: 8, lastAudit: '2025-12-31T08:00:00Z' },
  { domain: 'Studies', score: 93.1, recordCount: 156, validRecords: 145, issues: 18, lastAudit: '2025-12-31T06:00:00Z' },
  { domain: 'Documents', score: 98.2, recordCount: 12847, validRecords: 12615, issues: 45, lastAudit: '2025-12-31T09:00:00Z' },
  { domain: 'IDMP Entities', score: 95.7, recordCount: 1247, validRecords: 1194, issues: 22, lastAudit: '2025-12-31T09:30:00Z' },
];

const processingMetrics: ProcessingMetric[] = [
  { processType: 'Document Authoring', completed: 847, pending: 12, failed: 2, avgProcessingTime: 45, throughput: 94.2 },
  { processType: 'Submission Publishing', completed: 156, pending: 3, failed: 0, avgProcessingTime: 180, throughput: 98.1 },
  { processType: 'HAQ Responses', completed: 234, pending: 12, failed: 1, avgProcessingTime: 2880, throughput: 94.8 },
  { processType: 'Safety Processing', completed: 1247, pending: 47, failed: 8, avgProcessingTime: 15, throughput: 95.9 },
  { processType: 'AI Consistency Checks', completed: 3456, pending: 5, failed: 12, avgProcessingTime: 8, throughput: 99.7 },
  { processType: 'IDMP Sync', completed: 892, pending: 0, failed: 3, avgProcessingTime: 2, throughput: 99.7 },
];

const aiInsights = [
  { id: 'ai-1', type: 'recommendation', title: 'Document Consistency Alert', description: 'Protocol LIG-301 has 3 inconsistencies with the Investigator Brochure that should be reviewed.', priority: 'high', module: 'ai-consistency' },
  { id: 'ai-2', type: 'prediction', title: 'Submission Timeline Risk', description: 'Based on current document progress, NDA-2024-001 may miss its target date by 5 days without acceleration.', priority: 'medium', module: 'submissions-hub' },
  { id: 'ai-3', type: 'opportunity', title: 'Labeling Optimization', description: 'Similar approved products have more detailed dosing information. Consider enhancing Section 2.', priority: 'low', module: 'labeling' },
  { id: 'ai-4', type: 'alert', title: 'Safety Signal Correlation', description: 'New AE reports correlate with findings in study LIG-302. Recommend safety team review.', priority: 'high', module: 'safety' },
  { id: 'ai-5', type: 'insight', title: 'IDMP Data Completeness', description: 'IDMP entity coverage increased 15% this month. 3 products still missing pharmaceutical product data.', priority: 'medium', module: 'idmp' },
];

// Utility functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy': return 'text-emerald-400';
    case 'warning': return 'text-amber-400';
    case 'critical': return 'text-red-400';
    case 'offline': return 'text-text-muted';
    default: return 'text-text-muted';
  }
};

const getStatusBg = (status: string): string => {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/10 border-emerald-500/20';
    case 'warning': return 'bg-amber-500/10 border-amber-500/20';
    case 'critical': return 'bg-red-500/10 border-red-500/20';
    case 'offline': return 'bg-surface-elevated border-border';
    default: return 'bg-surface-elevated border-border';
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-text-muted bg-surface-elevated border-border';
  }
};

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'recommendation': return <Target className="w-4 h-4" />;
    case 'prediction': return <TrendingUp className="w-4 h-4" />;
    case 'opportunity': return <Sparkles className="w-4 h-4" />;
    case 'alert': return <AlertTriangle className="w-4 h-4" />;
    case 'insight': return <Brain className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

export default function PlatformAnalyticsDashboard() {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<MetricView>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [behaviorSummary, setBehaviorSummary] = useState<UsageSummary | null>(null);

  // Load usage summary on mount and after refresh
  useEffect(() => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    setBehaviorSummary(usageEventService.getSummary(days));
  }, [timeRange]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      setBehaviorSummary(usageEventService.getSummary(days));
      setIsRefreshing(false);
    }, 1500);
  };

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const healthyModules = moduleHealth.filter(m => m.status === 'healthy').length;
    const totalModules = moduleHealth.length;
    const avgUptime = moduleHealth.reduce((acc, m) => acc + m.uptime, 0) / totalModules;
    const totalActiveUsers = moduleHealth.reduce((acc, m) => acc + m.activeUsers, 0);
    const totalPending = moduleHealth.reduce((acc, m) => acc + m.pendingItems, 0);
    const avgDataQuality = dataQualityScores.reduce((acc, d) => acc + d.score, 0) / dataQualityScores.length;

    return { healthyModules, totalModules, avgUptime, totalActiveUsers, totalPending, avgDataQuality };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-surface min-h-0 overflow-auto">
      <ScreenHeader
        title="Ligature Analytics"
        subtitle="Comprehensive operational intelligence across all Ligature modules"
        icon={<LayoutDashboard className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
            <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-muted hover:text-text-primary hover:border-violet-500/50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm transition-colors" onClick={() => toast.success('Analytics data refreshed')}>
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        }
      >
        {/* View Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'modules', label: 'Module Health', icon: <Layers className="w-4 h-4" /> },
            { id: 'data-quality', label: 'Data Quality', icon: <Database className="w-4 h-4" /> },
            { id: 'processing', label: 'Processing', icon: <Activity className="w-4 h-4" /> },
            { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
            { id: 'ai-insights', label: 'AI Insights', icon: <Brain className="w-4 h-4" /> },
            { id: 'user-behavior', label: 'User Behavior', icon: <MousePointerClick className="w-4 h-4" /> },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as MetricView)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>
            </ScreenHeader>


      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="space-y-4 md:space-y-6">
            {/* Top-Level KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-sm">Platform Health</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBg('healthy')} ${getStatusColor('healthy')}`}>
                    Healthy
                  </span>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {aggregateMetrics.healthyModules}/{aggregateMetrics.totalModules}
                </div>
                <div className="text-xs text-text-muted mt-1">Modules operational</div>
              </div>
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-sm">System Uptime</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {aggregateMetrics.avgUptime.toFixed(2)}%
                </div>
                <div className="text-xs text-emerald-400 mt-1">+0.03% from last period</div>
              </div>
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-sm">Active Users</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {aggregateMetrics.totalActiveUsers}
                </div>
                <div className="text-xs text-text-muted mt-1">Currently online</div>
              </div>
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-sm">Data Quality</span>
                  <Database className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {aggregateMetrics.avgDataQuality.toFixed(1)}%
                </div>
                <div className="text-xs text-emerald-400 mt-1">+1.2% from last audit</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {platformMetrics.map((metric) => (
                <div key={metric.id} className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-text-muted text-sm">{metric.name}</span>
                    {metric.changeType && (
                      <div className={`flex items-center gap-1 text-xs ${
                        metric.changeType === 'increase' ? 'text-emerald-400' : 
                        metric.changeType === 'decrease' ? 'text-red-400' : 'text-text-muted'
                      }`}>
                        {metric.changeType === 'increase' ? <TrendingUp className="w-3 h-3" /> : 
                         metric.changeType === 'decrease' ? <TrendingDown className="w-3 h-3" /> : null}
                        {metric.change}%
                      </div>
                    )}
                  </div>
                  <div className="text-xl font-bold text-text-primary">{metric.value}</div>
                  {metric.trend && (
                    <div className="mt-3 flex items-end gap-0.5 h-8">
                      {metric.trend.map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-violet-500/30 rounded-t"
                          style={{ height: `${(val / Math.max(...metric.trend!)) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Module Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">Module Status</h3>
                  <button className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1" onClick={() => toast.success('Analytics data refreshed')}>
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {moduleHealth.slice(0, 6).map((module) => (
                    <div key={module.moduleId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          module.status === 'healthy' ? 'bg-emerald-400' :
                          module.status === 'warning' ? 'bg-amber-400' :
                          module.status === 'critical' ? 'bg-red-400' : 'bg-text-muted'
                        }`} />
                        <span className="text-text-primary">{module.moduleName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-text-muted">{module.uptime}%</span>
                        <span className="text-text-muted">{module.activeUsers} users</span>
                        {module.pendingItems > 0 && (
                          <span className="text-amber-400">{module.pendingItems} pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights Preview */}
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold text-text-primary">AI Insights</h3>
                  </div>
                  <button 
                    onClick={() => setActiveView('ai-insights')}
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {aiInsights.slice(0, 4).map((insight) => (
                    <div key={insight.id} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                      <div className={`p-1.5 rounded ${getPriorityColor(insight.priority)}`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-text-primary">{insight.title}</h4>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{insight.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module Health View */}
        {activeView === 'modules' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Module Health Status</h3>
              </div>
              <table className="w-full">
                <thead className="bg-surface-elevated">
                  <tr>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Module</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Uptime</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Active Users</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Pending Items</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Error Rate</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {moduleHealth.map((module) => (
                    <tr key={module.moduleId} className="hover:bg-surface-elevated/50">
                      <td className="px-4 py-4">
                        <span className="font-medium text-text-primary">{module.moduleName}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBg(module.status)} ${getStatusColor(module.status)}`}>
                          {module.status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
                          {module.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                          {module.status === 'critical' && <XCircle className="w-3 h-3" />}
                          {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${module.uptime}%` }}
                            />
                          </div>
                          <span className="text-sm text-text-primary">{module.uptime}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-primary">{module.activeUsers}</td>
                      <td className="px-4 py-4">
                        {module.pendingItems > 0 ? (
                          <span className="text-amber-400">{module.pendingItems}</span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={module.errorRate > 0.1 ? 'text-amber-400' : 'text-text-muted'}>
                          {(module.errorRate * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-text-muted text-sm">{module.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Quality View */}
        {activeView === 'data-quality' && (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {dataQualityScores.map((domain) => (
                <div key={domain.domain} className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary">{domain.domain}</h3>
                    <span className={`text-lg font-bold ${
                      domain.score >= 95 ? 'text-emerald-400' :
                      domain.score >= 90 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {domain.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full ${
                        domain.score >= 95 ? 'bg-emerald-400' :
                        domain.score >= 90 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${domain.score}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface rounded-lg p-2">
                      <div className="text-lg font-bold text-text-primary">{formatNumber(domain.recordCount)}</div>
                      <div className="text-xs text-text-muted">Records</div>
                    </div>
                    <div className="bg-surface rounded-lg p-2">
                      <div className="text-lg font-bold text-emerald-400">{formatNumber(domain.validRecords)}</div>
                      <div className="text-xs text-text-muted">Valid</div>
                    </div>
                    <div className="bg-surface rounded-lg p-2">
                      <div className="text-lg font-bold text-amber-400">{domain.issues}</div>
                      <div className="text-xs text-text-muted">Issues</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-text-muted">
                    Last audit: {formatDate(domain.lastAudit)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing View */}
        {activeView === 'processing' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Processing Metrics</h3>
              </div>
              <table className="w-full">
                <thead className="bg-surface-elevated">
                  <tr>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Process Type</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Completed</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Pending</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Failed</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Avg Time</th>
                    <th className="text-left px-4 py-3 text-text-muted text-sm font-medium">Throughput</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {processingMetrics.map((metric) => (
                    <tr key={metric.processType} className="hover:bg-surface-elevated/50">
                      <td className="px-4 py-4 font-medium text-text-primary">{metric.processType}</td>
                      <td className="px-4 py-4 text-emerald-400">{formatNumber(metric.completed)}</td>
                      <td className="px-4 py-4 text-amber-400">{metric.pending}</td>
                      <td className="px-4 py-4 text-red-400">{metric.failed}</td>
                      <td className="px-4 py-4 text-text-muted">
                        {metric.avgProcessingTime < 60 ? `${metric.avgProcessingTime}s` :
                         metric.avgProcessingTime < 3600 ? `${Math.round(metric.avgProcessingTime / 60)}m` :
                         `${Math.round(metric.avgProcessingTime / 3600)}h`}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-violet-400 rounded-full"
                              style={{ width: `${metric.throughput}%` }}
                            />
                          </div>
                          <span className="text-sm text-text-primary">{metric.throughput}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Compliance View */}
        {activeView === 'compliance' && (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">21 CFR Part 11</h3>
                    <p className="text-xs text-text-muted">Electronic Records</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">100%</div>
                <div className="text-sm text-text-muted">All requirements met</div>
              </div>
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Globe className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">EU Annex 11</h3>
                    <p className="text-xs text-text-muted">Computerized Systems</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">100%</div>
                <div className="text-sm text-text-muted">All requirements met</div>
              </div>
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Database className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">IDMP Standards</h3>
                    <p className="text-xs text-text-muted">ISO 11615/11616/11238</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">97.3%</div>
                <div className="text-sm text-text-muted">3 entities need updates</div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights View */}
        {activeView === 'ai-insights' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-surface-card border border-border rounded-xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold text-text-primary">AI-Powered Insights</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-muted focus:outline-none">
                    <option>All Types</option>
                    <option>Recommendations</option>
                    <option>Predictions</option>
                    <option>Alerts</option>
                  </select>
                  <select className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-muted focus:outline-none">
                    <option>All Priorities</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
              <div className="divide-y divide-border">
                {aiInsights.map((insight) => (
                  <div key={insight.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getPriorityColor(insight.priority)}`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-text-primary">{insight.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(insight.priority)}`}>
                            {insight.priority}
                          </span>
                          <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded">
                            {insight.module}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted">{insight.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1" onClick={() => toast.success('Analytics data refreshed')}>
                            <ArrowRight className="w-4 h-4" />
                            Take Action
                          </button>
                          <button className="text-sm text-text-muted hover:text-text-primary" onClick={() => toast.success('Analytics data refreshed')}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* User Behavior View */}
        {activeView === 'user-behavior' && (
          <UserBehaviorView summary={behaviorSummary} />
        )}

      </div>
    </div>
  );
}

// ============================================================================
// USER BEHAVIOR VIEW
// ============================================================================

function UserBehaviorView({ summary }: { summary: UsageSummary | null }) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading behavior data...
      </div>
    );
  }

  const maxVisits = summary.topModules[0]?.visits ?? 1;
  const maxFeatureCount = summary.topFeatures[0]?.count ?? 1;

  const formatDuration = (ms: number) => {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60_000)}m`;
  };

  const categoryColor: Record<string, string> = {
    feature_action: 'bg-blue-500/20 text-blue-400',
    ai_invocation: 'bg-violet-500/20 text-violet-400',
    module_visit: 'bg-teal-500/20 text-teal-400',
    search: 'bg-amber-500/20 text-amber-400',
    export: 'bg-green-500/20 text-green-400',
    error_encountered: 'bg-red-500/20 text-red-400',
  };

  // Sparkline helper — tiny inline bar chart
  const Sparkline = ({ values, color = 'bg-violet-400' }: { values: number[]; color?: string }) => {
    const max = Math.max(...values, 1);
    return (
      <div className="flex items-end gap-px h-8 w-20">
        {values.map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${color} opacity-70`}
            style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
    <div className="space-y-6">

      {/* Hero stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Events', value: summary.totalEvents.toLocaleString(), icon: <Activity className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/20' },
          { label: 'Sessions', value: summary.totalSessions.toLocaleString(), icon: <Route className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Daily Active Users', value: summary.dailyActiveUsers, icon: <Users className="w-5 h-5" />, color: 'text-teal-400', bg: 'bg-teal-500/20' },
          { label: 'Weekly Active Users', value: summary.weeklyActiveUsers, icon: <Users className="w-5 h-5" />, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { label: 'Avg Session', value: formatDuration(summary.avgSessionDurationMs), icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/20' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-elevated border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-text-muted">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg ${stat?.bg ?? ''} flex items-center justify-center ${stat?.color ?? ''}`}>
                {stat.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold ${stat?.color ?? ''}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Most-used modules */}
        <div className="bg-surface-elevated border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-text-primary">Most-Used Modules</h3>
            <span className="ml-auto text-xs text-text-muted">visits · 7-day trend</span>
          </div>
          <div className="divide-y divide-border">
            {summary.topModules.slice(0, 10).map((mod) => (
              <div
                key={mod.moduleId}
                className={`flex items-center gap-4 px-5 py-3 hover:bg-surface-card cursor-pointer transition-colors ${selectedModule === mod.moduleId ? 'bg-surface-card' : ''}`}
                onClick={() => setSelectedModule(selectedModule === mod.moduleId ? null : mod.moduleId)}
              >
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-text-primary truncate">{mod.moduleName}</p>
                  <p className="text-xs text-text-muted">{mod.uniqueUsers} user{mod.uniqueUsers !== 1 ? 's' : ''} · avg {formatDuration(mod.avgDurationMs)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${(mod.visits / maxVisits) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-text-primary w-8 text-right flex-shrink-0">{mod.visits}</span>
                <Sparkline values={mod.trend} />
              </div>
            ))}
          </div>
        </div>

        {/* Top features / actions */}
        <div className="bg-surface-elevated border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-text-primary">Top Feature Actions</h3>
            <span className="ml-auto text-xs text-text-muted">clicks · unique users</span>
          </div>
          <div className="divide-y divide-border">
            {summary.topFeatures.slice(0, 12).map((feat) => (
              <div key={feat.featureId} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{feat.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">{feat.moduleId}</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-text-muted">{feat.uniqueUsers} user{feat.uniqueUsers !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="w-24 flex-shrink-0">
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(feat.count / maxFeatureCount) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-text-primary w-8 text-right flex-shrink-0">{feat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity over time */}
      <div className="bg-surface-elevated border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-teal-400" />
          <h3 className="font-semibold text-text-primary">Daily Activity</h3>
          <span className="ml-auto text-xs text-text-muted">events per day</span>
        </div>
        <div className="px-5 py-4">
          {(() => {
            const data = summary.dailyEventCounts;
            const max = Math.max(...data.map(d => d.count), 1);
            return (
              <div className="flex items-end gap-1 h-24">
                {data.map((day) => {
                  const isToday = day.date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded px-2 py-1 text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        {day.date}: {day.count} events
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${isToday ? 'bg-teal-500' : 'bg-violet-500/50 hover:bg-violet-500/80'}`}
                        style={{ height: `${Math.max(2, (day.count / max) * 88)}px` }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>{summary.dailyEventCounts[0]?.date}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* User journey flows + recent events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Journey transitions */}
        <div className="bg-surface-elevated border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Route className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-text-primary">Common User Journeys</h3>
            <span className="ml-auto text-xs text-text-muted">module → module transitions</span>
          </div>
          <div className="divide-y divide-border">
            {summary.journeys.slice(0, 10).map((j, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-medium text-text-primary bg-surface-card border border-border rounded px-2 py-0.5 truncate max-w-[110px]">{j.fromModuleId}</span>
                <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-xs font-medium text-text-primary bg-surface-card border border-border rounded px-2 py-0.5 truncate max-w-[110px]">{j.toModuleId}</span>
                <span className="ml-auto text-xs font-semibold text-text-muted flex-shrink-0">{j.count}×</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live event feed */}
        <div className="bg-surface-elevated border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <h3 className="font-semibold text-text-primary">Recent Events</h3>
          </div>
          <div className="divide-y divide-border overflow-y-auto max-h-[380px]">
            {summary.recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${categoryColor[event.category] ?? 'bg-surface-card text-text-muted'}`}>
                  {event.category.replace('_', ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{event.label}</p>
                  <p className="text-xs text-text-muted">{event.userName} · {event.moduleId}</p>
                </div>
                <span className="text-xs text-text-muted flex-shrink-0 mt-0.5">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const csv = usageEventService.exportCSV();
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ligature-usage-events-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-secondary hover:bg-surface transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Events CSV
        </button>
      </div>

    </div>
    </div>
  );
}
