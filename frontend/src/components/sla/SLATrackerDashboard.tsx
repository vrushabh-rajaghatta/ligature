
/**
 * SLA Tracker Dashboard - v0.13.96
 * Real-time SLA monitoring with escalation prediction and module health metrics
 */


import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Target,
  Zap,
  Shield,
  FileText,
  MessageSquare,
  ClipboardCheck,
  Send,
  FolderTree,
  Users,
  BarChart3,
  ArrowUpRight,
  AlertCircle,
  Timer,
  Pause,
  Play,
  Eye,
} from 'lucide-react';
import { useEscalationRulesStore } from '@/store/useEscalationRulesStore';
import {
  EscalationInstance,
  EscalationRule,
  ModuleScope,
} from '@/store/escalationRulesTypes';

// =============================================================================
// TYPES
// =============================================================================

interface SLAItem {
  id: string;
  name: string;
  module: ModuleScope;
  type: 'approval' | 'response' | 'review' | 'submission' | 'safety';
  dueDate: string;
  startedAt: string;
  assignee: string;
  assigneeId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'on-track' | 'at-risk' | 'breached' | 'completed';
  hoursRemaining: number;
  hoursTotal: number;
  percentComplete: number;
  linkedRuleId?: string;
  linkedInstanceId?: string;
  currentTier?: number;
  nextEscalationIn?: number;
}

interface ModuleHealth {
  module: ModuleScope;
  label: string;
  icon: React.ReactNode;
  totalItems: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  completed: number;
  averageCompletionTime: number;
  slaComplianceRate: number;
  trend: 'up' | 'down' | 'stable';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MODULE_CONFIG: Record<ModuleScope, { label: string; icon: React.ReactNode; color: string }> = {
  haq: { label: 'HAQ', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-red-500' },
  tmf: { label: 'TMF', icon: <FolderTree className="w-4 h-4" />, color: 'bg-blue-500' },
  ctms: { label: 'CTMS', icon: <Users className="w-4 h-4" />, color: 'bg-purple-500' },
  safety: { label: 'Safety', icon: <Shield className="w-4 h-4" />, color: 'bg-amber-500' },
  regulatory: { label: 'Regulatory', icon: <FileText className="w-4 h-4" />, color: 'bg-emerald-500' },
  qms: { label: 'QMS', icon: <ClipboardCheck className="w-4 h-4" />, color: 'bg-indigo-500' },
  'document-control': { label: 'Documents', icon: <FileText className="w-4 h-4" />, color: 'bg-slate-500' },
  submissions: { label: 'Submissions', icon: <Send className="w-4 h-4" />, color: 'bg-cyan-500' },
  all: { label: 'All Modules', icon: <Activity className="w-4 h-4" />, color: 'bg-gray-500' },
};

const STATUS_CONFIG = {
  'on-track': { label: 'On Track', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dotColor: 'bg-emerald-500' },
  'at-risk': { label: 'At Risk', color: 'bg-amber-100 text-amber-700 border-amber-300', dotColor: 'bg-amber-500' },
  breached: { label: 'Breached', color: 'bg-red-100 text-red-700 border-red-300', dotColor: 'bg-red-500' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-300', dotColor: 'bg-slate-400' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-amber-500' },
  critical: { label: 'Critical', color: 'text-red-500' },
};

// =============================================================================
// MOCK SLA DATA
// =============================================================================

const MOCK_SLA_ITEMS: SLAItem[] = [
  {
    id: 'sla-1',
    name: 'FDA HAQ Response - Manufacturing Process',
    module: 'haq',
    type: 'response',
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    startedAt: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
    assignee: 'Dr. Sarah Chen',
    assigneeId: 'user-1',
    priority: 'critical',
    status: 'at-risk',
    hoursRemaining: 4,
    hoursTotal: 48,
    percentComplete: 75,
    currentTier: 1,
    nextEscalationIn: 4,
  },
  {
    id: 'sla-2',
    name: 'Protocol Amendment v2.1 Review',
    module: 'document-control',
    type: 'approval',
    dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 54 * 60 * 60 * 1000).toISOString(),
    assignee: 'Michael Torres',
    assigneeId: 'user-2',
    priority: 'high',
    status: 'on-track',
    hoursRemaining: 18,
    hoursTotal: 72,
    percentComplete: 60,
    currentTier: 0,
    nextEscalationIn: 18,
  },
  {
    id: 'sla-3',
    name: 'ICSR Serious AE - Case 2024-001234',
    module: 'safety',
    type: 'safety',
    dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours overdue
    startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    assignee: 'Dr. Robert Kim',
    assigneeId: 'user-3',
    priority: 'critical',
    status: 'breached',
    hoursRemaining: -2,
    hoursTotal: 24,
    percentComplete: 40,
    currentTier: 2,
    nextEscalationIn: 10,
  },
  {
    id: 'sla-4',
    name: 'TMF Essential Document Upload - Site 101',
    module: 'tmf',
    type: 'review',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    assignee: 'Jennifer Walsh',
    assigneeId: 'user-4',
    priority: 'medium',
    status: 'on-track',
    hoursRemaining: 48,
    hoursTotal: 120,
    percentComplete: 85,
    currentTier: 0,
    nextEscalationIn: 48,
  },
  {
    id: 'sla-5',
    name: 'EMA Submission Package Review',
    module: 'submissions',
    type: 'submission',
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 156 * 60 * 60 * 1000).toISOString(),
    assignee: 'David Park',
    assigneeId: 'user-5',
    priority: 'high',
    status: 'at-risk',
    hoursRemaining: 12,
    hoursTotal: 168,
    percentComplete: 90,
    currentTier: 1,
    nextEscalationIn: 12,
  },
  {
    id: 'sla-6',
    name: 'CAPA Investigation Report',
    module: 'qms',
    type: 'review',
    dueDate: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Maria Garcia',
    assigneeId: 'user-6',
    priority: 'medium',
    status: 'on-track',
    hoursRemaining: 96,
    hoursTotal: 120,
    percentComplete: 30,
    currentTier: 0,
    nextEscalationIn: 96,
  },
  {
    id: 'sla-7',
    name: 'Clinical Study Report - Final Review',
    module: 'regulatory',
    type: 'approval',
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
    assignee: 'Dr. Emily Watson',
    assigneeId: 'user-7',
    priority: 'high',
    status: 'at-risk',
    hoursRemaining: 6,
    hoursTotal: 48,
    percentComplete: 80,
    currentTier: 1,
    nextEscalationIn: 6,
  },
  {
    id: 'sla-8',
    name: 'Site Initiation Visit Documentation',
    module: 'ctms',
    type: 'review',
    dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Wilson',
    assigneeId: 'user-8',
    priority: 'low',
    status: 'on-track',
    hoursRemaining: 72,
    hoursTotal: 120,
    percentComplete: 50,
    currentTier: 0,
    nextEscalationIn: 72,
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

// Progress Ring Component
const ProgressRing: React.FC<{ percent: number; size?: number; status: SLAItem['status'] }> = ({ 
  percent, 
  size = 48,
  status 
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  
  const getColor = () => {
    switch (status) {
      case 'breached': return '#ef4444';
      case 'at-risk': return '#f59e0b';
      case 'completed': return '#6b7280';
      default: return '#10b981';
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-slate-700">{Math.round(percent)}%</span>
      </div>
    </div>
  );
};

// Time Remaining Display
const TimeRemaining: React.FC<{ hours: number; status: SLAItem['status'] }> = ({ hours, status }) => {
  const formatTime = (h: number) => {
    if (h < 0) {
      const absHours = Math.abs(h);
      if (absHours < 24) return `${absHours.toFixed(0)}h overdue`;
      return `${Math.floor(absHours / 24)}d ${Math.floor(absHours % 24)}h overdue`;
    }
    if (h < 1) return `${Math.round(h * 60)}m remaining`;
    if (h < 24) return `${h.toFixed(0)}h remaining`;
    return `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h remaining`;
  };

  const getColor = () => {
    if (hours < 0) return 'text-red-600';
    if (hours < 8) return 'text-amber-600';
    return 'text-slate-600';
  };

  return (
    <div className={`flex items-center gap-1 text-sm ${getColor()}`}>
      <Timer className="w-4 h-4" />
      <span className="font-medium">{formatTime(hours)}</span>
    </div>
  );
};

// SLA Item Card
const SLAItemCard: React.FC<{ item: SLAItem; onView: () => void }> = ({ item, onView }) => {
  const moduleConfig = MODULE_CONFIG[item.module];
  const statusConfig = STATUS_CONFIG[item.status];
  const priorityConfig = PRIORITY_CONFIG[item.priority];

  return (
    <div 
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        item.status === 'breached' ? 'border-red-200' : 
        item.status === 'at-risk' ? 'border-amber-200' : 'border-slate-200'
      }`}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${moduleConfig?.color ?? ''} text-white flex items-center justify-center`}>
            {moduleConfig.icon}
          </div>
          <div>
            <h4 className="font-medium text-slate-900 text-sm line-clamp-1">{item.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{moduleConfig.label}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className={`text-xs ${priorityConfig?.color ?? ''}`}>{priorityConfig.label}</span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig?.color ?? ''}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing percent={item.percentComplete} status={item.status} />
          <div>
            <TimeRemaining hours={item.hoursRemaining} status={item.status} />
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned: {item.assignee}
            </p>
          </div>
        </div>

        {item.currentTier !== undefined && item.currentTier > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
            <ArrowUpRight className="w-3 h-3" />
            Tier {item.currentTier}
          </div>
        )}
      </div>

      {item.nextEscalationIn !== undefined && item.nextEscalationIn > 0 && item.status !== 'completed' && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Next escalation in</span>
            <span className="font-medium text-slate-700">{item.nextEscalationIn}h</span>
          </div>
          <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${Math.max(0, 100 - (item.nextEscalationIn / 48) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Module Health Card
const ModuleHealthCard: React.FC<{ health: ModuleHealth }> = ({ health }) => {
  const moduleConfig = MODULE_CONFIG[health.module];
  
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${moduleConfig?.color ?? ''} text-white flex items-center justify-center`}>
            {moduleConfig.icon}
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{health.label}</h4>
            <p className="text-xs text-slate-500">{health.totalItems} active items</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {health.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
          {health.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          {health.trend === 'stable' && <Activity className="w-4 h-4 text-slate-400" />}
          <span className={`text-sm font-medium ${
            health.trend === 'up' ? 'text-emerald-600' : 
            health.trend === 'down' ? 'text-red-600' : 'text-slate-600'
          }`}>
            {health.slaComplianceRate}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-2 bg-emerald-50 rounded">
          <div className="text-lg font-semibold text-emerald-700">{health.onTrack}</div>
          <div className="text-xs text-emerald-600">On Track</div>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded">
          <div className="text-lg font-semibold text-amber-700">{health.atRisk}</div>
          <div className="text-xs text-amber-600">At Risk</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="text-lg font-semibold text-red-700">{health.breached}</div>
          <div className="text-xs text-red-600">Breached</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="text-lg font-semibold text-slate-700">{health.completed}</div>
          <div className="text-xs text-slate-600">Done</div>
        </div>
      </div>

      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${(health.onTrack / health.totalItems) * 100}%` }} />
        <div className="bg-amber-500 h-full" style={{ width: `${(health.atRisk / health.totalItems) * 100}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${(health.breached / health.totalItems) * 100}%` }} />
        <div className="bg-slate-400 h-full" style={{ width: `${(health.completed / health.totalItems) * 100}%` }} />
      </div>
    </div>
  );
};

// Summary Stat Card
const SummaryStatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' };
}> = ({ icon, label, value, subtext, color, trend }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-lg ${color} text-white flex items-center justify-center`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend.value}%
        </div>
      )}
    </div>
    <div className="mt-3">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {subtext && <div className="text-xs text-slate-400 mt-0.5">{subtext}</div>}
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface SLATrackerDashboardProps {
  embedded?: boolean;
}

export const SLATrackerDashboard: React.FC<SLATrackerDashboardProps> = ({ embedded = false }) => {
  const [slaItems] = useState<SLAItem[]>(MOCK_SLA_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SLAItem['status'] | 'all'>('all');
  const [moduleFilter, setModuleFilter] = useState<ModuleScope | 'all'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'module'>('urgency');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SLAItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = slaItems.length;
    const onTrack = slaItems.filter(i => i.status === 'on-track').length;
    const atRisk = slaItems.filter(i => i.status === 'at-risk').length;
    const breached = slaItems.filter(i => i.status === 'breached').length;
    const completed = slaItems.filter(i => i.status === 'completed').length;
    const escalated = slaItems.filter(i => i.currentTier && i.currentTier > 0).length;
    
    const avgCompletion = slaItems.reduce((acc, i) => acc + i.percentComplete, 0) / total;
    const slaCompliance = ((onTrack + completed) / total) * 100;

    return { total, onTrack, atRisk, breached, completed, escalated, avgCompletion, slaCompliance };
  }, [slaItems]);

  // Calculate module health
  const moduleHealth = useMemo((): ModuleHealth[] => {
    const modules: ModuleScope[] = ['haq', 'safety', 'document-control', 'submissions', 'tmf', 'qms', 'regulatory', 'ctms'];
    
    return modules.map(module => {
      const moduleItems = slaItems.filter(i => i.module === module);
      if (moduleItems.length === 0) return null;
      
      const onTrack = moduleItems.filter(i => i.status === 'on-track').length;
      const atRisk = moduleItems.filter(i => i.status === 'at-risk').length;
      const breached = moduleItems.filter(i => i.status === 'breached').length;
      const completed = moduleItems.filter(i => i.status === 'completed').length;
      
      return {
        module,
        label: MODULE_CONFIG[module].label,
        icon: MODULE_CONFIG[module].icon,
        totalItems: moduleItems.length,
        onTrack,
        atRisk,
        breached,
        completed,
        averageCompletionTime: 48, // Mock
        slaComplianceRate: Math.round(((onTrack + completed) / moduleItems.length) * 100),
        trend: breached > 0 ? 'down' : atRisk > onTrack ? 'down' : 'up',
      };
    }).filter(Boolean) as ModuleHealth[];
  }, [slaItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...slaItems];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.name.toLowerCase().includes(query) ||
        i.assignee.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter(i => i.status === statusFilter);
    }

    // Module filter
    if (moduleFilter !== 'all') {
      items = items.filter(i => i.module === moduleFilter);
    }

    // Sort
    switch (sortBy) {
      case 'urgency':
        items.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
        break;
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'module':
        items.sort((a, b) => a.module.localeCompare(b.module));
        break;
    }

    return items;
  }, [slaItems, searchQuery, statusFilter, moduleFilter, sortBy]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className={`${embedded ? '' : 'h-full overflow-hidden flex flex-col'}`}>
      {/* Header */}
      {!embedded && (
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                SLA Tracker
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Real-time monitoring of service level agreements across modules
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                className={`p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${embedded ? '' : 'p-6'}`}>
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <SummaryStatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Active"
            value={summaryStats.total}
            color="bg-blue-500"
          />
          <SummaryStatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="On Track"
            value={summaryStats.onTrack}
            subtext={`${Math.round((summaryStats.onTrack / summaryStats.total) * 100)}% of total`}
            color="bg-emerald-500"
            trend={{ value: 5, direction: 'up' }}
          />
          <SummaryStatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="At Risk"
            value={summaryStats.atRisk}
            color="bg-amber-500"
          />
          <SummaryStatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Breached"
            value={summaryStats.breached}
            color="bg-red-500"
            trend={summaryStats.breached > 0 ? { value: 2, direction: 'down' } : undefined}
          />
          <SummaryStatCard
            icon={<ArrowUpRight className="w-5 h-5" />}
            label="Escalated"
            value={summaryStats.escalated}
            subtext="Active escalations"
            color="bg-purple-500"
          />
        </div>

        {/* Module Health */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Module Health</h2>
          <div className="grid grid-cols-2 gap-4">
            {moduleHealth.map(health => (
              <ModuleHealthCard key={health.module} health={health} />
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SLAItem['status'] | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="on-track">On Track</option>
            <option value="at-risk">At Risk</option>
            <option value="breached">Breached</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as ModuleScope | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Modules</option>
            {Object.entries(MODULE_CONFIG).filter(([k]) => k !== 'all').map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'urgency' | 'name' | 'module')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="urgency">Sort by Urgency</option>
            <option value="name">Sort by Name</option>
            <option value="module">Sort by Module</option>
          </select>
        </div>

        {/* SLA Items List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Active SLA Items ({filteredItems.length})
          </h2>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-500">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <SLAItemCard
                  key={item.id}
                  item={item}
                  onView={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">SLA Details</h2>
              <button 
                className="p-2 hover:bg-slate-100 rounded-lg"
                onClick={() => setSelectedItem(null)}
              >
                <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-2">{selectedItem.name}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-slate-500 block">Module</span>
                  <span className="font-medium">{MODULE_CONFIG[selectedItem.module].label}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[selectedItem.status].color}`}>
                    {STATUS_CONFIG[selectedItem.status].label}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Assignee</span>
                  <span className="font-medium">{selectedItem.assignee}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Priority</span>
                  <span className={`font-medium ${PRIORITY_CONFIG[selectedItem.priority].color}`}>
                    {PRIORITY_CONFIG[selectedItem.priority].label}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Due Date</span>
                  <span className="font-medium">{new Date(selectedItem.dueDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Time Remaining</span>
                  <TimeRemaining hours={selectedItem.hoursRemaining} status={selectedItem.status} />
                </div>
              </div>

              <div className="mb-4">
                <span className="text-xs text-slate-500 block mb-2">Progress</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        selectedItem.status === 'breached' ? 'bg-red-500' :
                        selectedItem.status === 'at-risk' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedItem.percentComplete}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{selectedItem.percentComplete}%</span>
                </div>
              </div>

              {selectedItem.currentTier !== undefined && selectedItem.currentTier > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="font-medium">Escalation Active - Tier {selectedItem.currentTier}</span>
                  </div>
                  {selectedItem.nextEscalationIn && (
                    <p className="text-sm text-red-600 mt-1">
                      Next escalation in {selectedItem.nextEscalationIn} hours
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View Details
                </button>
                <button className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">
                  Reassign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SLATrackerDashboard;
