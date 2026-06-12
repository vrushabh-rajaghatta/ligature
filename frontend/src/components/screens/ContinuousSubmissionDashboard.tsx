// ============================================================================
// Continuous Submission Dashboard (v197)
// Real-time view of data readiness for API-first regulatory submissions
// Demonstrates the "zero-latency" vision vs. traditional batch eCTD
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  Cloud, Upload, CheckCircle, XCircle, Clock, AlertTriangle,
  Activity, Database, FileText, Zap, RefreshCw, Settings,
  TrendingUp, TrendingDown, Minus, Pause,
  ExternalLink, Shield, Server, GitBranch, BarChart3,
  Radio, Wifi, WifiOff, ChevronRight, Info
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// TYPES
// ============================================================================

interface DataDomain {
  id: string;
  name: string;
  icon: React.ReactNode;
  readiness: number;
  status: 'ready' | 'near-ready' | 'in-progress' | 'blocked';
  itemsReady: number;
  itemsTotal: number;
  lastSync: string;
  trend: 'up' | 'down' | 'stable';
  blockers: number;
}

interface PipelineStatus {
  id: string;
  name: string;
  target: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
  successRate: number;
  dataPoints: number;
}

interface TimelineComparison {
  approach: string;
  startLabel: string;
  endLabel: string;
  durationDays: number;
  milestones: { label: string; day: number; status: 'done' | 'current' | 'pending' }[];
}

interface HealthAuthorityStatus {
  id: string;
  name: string;
  shortName: string;
  region: string;
  connectionStatus: 'connected' | 'degraded' | 'offline';
  lastExchange: string;
  pendingItems: number;
  acknowledgedToday: number;
  latencyMs: number;
}

interface RecentSubmission {
  id: string;
  submissionId: string;
  product: string;
  module: string;
  target: string;
  submittedAt: string;
  status: 'acknowledged' | 'under-review' | 'accepted' | 'pending';
  sequenceNum: number;
}


interface RecentActivity {
  id: string;
  type: 'sync' | 'submit' | 'validate' | 'acknowledge' | 'error';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_DOMAINS: DataDomain[] = [
  {
    id: 'clinical',
    name: 'Clinical Data',
    icon: <Activity className="w-5 h-5" />,
    readiness: 94,
    status: 'near-ready',
    itemsReady: 847,
    itemsTotal: 901,
    lastSync: '2 min ago',
    trend: 'up',
    blockers: 0,
  },
  {
    id: 'safety',
    name: 'Safety Data',
    icon: <Shield className="w-5 h-5" />,
    readiness: 100,
    status: 'ready',
    itemsReady: 1243,
    itemsTotal: 1243,
    lastSync: '1 min ago',
    trend: 'stable',
    blockers: 0,
  },
  {
    id: 'quality',
    name: 'CMC/Quality',
    icon: <CheckCircle className="w-5 h-5" />,
    readiness: 87,
    status: 'in-progress',
    itemsReady: 156,
    itemsTotal: 179,
    lastSync: '5 min ago',
    trend: 'up',
    blockers: 2,
  },
  {
    id: 'labeling',
    name: 'Labeling/SPL',
    icon: <FileText className="w-5 h-5" />,
    readiness: 100,
    status: 'ready',
    itemsReady: 24,
    itemsTotal: 24,
    lastSync: '3 min ago',
    trend: 'stable',
    blockers: 0,
  },
  {
    id: 'idmp',
    name: 'IDMP Data',
    icon: <Database className="w-5 h-5" />,
    readiness: 92,
    status: 'near-ready',
    itemsReady: 18,
    itemsTotal: 19,
    lastSync: '4 min ago',
    trend: 'up',
    blockers: 1,
  },
  {
    id: 'nonclinical',
    name: 'Nonclinical',
    icon: <GitBranch className="w-5 h-5" />,
    readiness: 100,
    status: 'ready',
    itemsReady: 312,
    itemsTotal: 312,
    lastSync: '10 min ago',
    trend: 'stable',
    blockers: 0,
  },
];

const MOCK_PIPELINES: PipelineStatus[] = [
  {
    id: 'pip-1',
    name: 'FDA Continuous Pipeline',
    target: 'FDA ESG',
    status: 'active',
    lastRun: '2 min ago',
    nextRun: 'Continuous',
    successRate: 99.7,
    dataPoints: 15420,
  },
  {
    id: 'pip-2',
    name: 'Accumulus Synergy Feed',
    target: 'Accumulus',
    status: 'active',
    lastRun: '1 min ago',
    nextRun: 'Real-time',
    successRate: 100,
    dataPoints: 8934,
  },
  {
    id: 'pip-3',
    name: 'EMA CESP Batch',
    target: 'EMA',
    status: 'paused',
    lastRun: '1 day ago',
    nextRun: 'Manual',
    successRate: 98.2,
    dataPoints: 4521,
  },
];

const MOCK_TIMELINE: { traditional: TimelineComparison; continuous: TimelineComparison } = {
  traditional: {
    approach: 'Traditional eCTD',
    startLabel: 'LSLV',
    endLabel: 'Submit',
    durationDays: 120,
    milestones: [
      { label: 'Database Lock', day: 30, status: 'done' },
      { label: 'CSR Draft', day: 60, status: 'done' },
      { label: 'QC Complete', day: 90, status: 'current' },
      { label: 'Publish', day: 110, status: 'pending' },
      { label: 'Submit', day: 120, status: 'pending' },
    ],
  },
  continuous: {
    approach: 'Continuous Submission',
    startLabel: 'LSLV',
    endLabel: 'Submit',
    durationDays: 28,
    milestones: [
      { label: 'Data Ready', day: 0, status: 'done' },
      { label: 'CSR Ready', day: 7, status: 'done' },
      { label: 'Final QC', day: 21, status: 'done' },
      { label: 'Submit', day: 28, status: 'current' },
    ],
  },
};

const MOCK_HA_STATUS: HealthAuthorityStatus[] = [
  {
    id: 'fda',
    name: 'U.S. Food & Drug Administration',
    shortName: 'FDA',
    region: 'US',
    connectionStatus: 'connected',
    lastExchange: '2 min ago',
    pendingItems: 3,
    acknowledgedToday: 12,
    latencyMs: 142,
  },
  {
    id: 'ema',
    name: 'European Medicines Agency',
    shortName: 'EMA',
    region: 'EU',
    connectionStatus: 'connected',
    lastExchange: '8 min ago',
    pendingItems: 1,
    acknowledgedToday: 7,
    latencyMs: 218,
  },
  {
    id: 'pmda',
    name: 'Pharmaceuticals and Medical Devices Agency',
    shortName: 'PMDA',
    region: 'JP',
    connectionStatus: 'degraded',
    lastExchange: '34 min ago',
    pendingItems: 0,
    acknowledgedToday: 2,
    latencyMs: 890,
  },
  {
    id: 'hc',
    name: 'Health Canada',
    shortName: 'HC',
    region: 'CA',
    connectionStatus: 'connected',
    lastExchange: '5 min ago',
    pendingItems: 0,
    acknowledgedToday: 4,
    latencyMs: 167,
  },
];

const MOCK_RECENT_SUBMISSIONS: RecentSubmission[] = [
  {
    id: 'sub-1',
    submissionId: 'NDA-215847/SEQ-0041',
    product: 'Nexavant (LIG-2847)',
    module: 'Module 5.3.5',
    target: 'FDA',
    submittedAt: '2 hours ago',
    status: 'acknowledged',
    sequenceNum: 41,
  },
  {
    id: 'sub-2',
    submissionId: 'MAA-EMEA/H/C/006221/0042',
    product: 'Nexavant (LIG-2847)',
    module: 'Module 1.3.2',
    target: 'EMA',
    submittedAt: '6 hours ago',
    status: 'under-review',
    sequenceNum: 42,
  },
  {
    id: 'sub-3',
    submissionId: 'NDA-215847/SEQ-0040',
    product: 'Nexavant (LIG-2847)',
    module: 'Safety Update',
    target: 'FDA',
    submittedAt: 'Yesterday',
    status: 'accepted',
    sequenceNum: 40,
  },
  {
    id: 'sub-4',
    submissionId: 'IND-187234/SEQ-0012',
    product: 'CardioShield (LIG-3901)',
    module: 'Protocol Amendment',
    target: 'FDA',
    submittedAt: '2 days ago',
    status: 'accepted',
    sequenceNum: 12,
  },
];

const MOCK_ACTIVITIES: RecentActivity[] = [
  { id: '1', type: 'sync', message: 'Clinical data synced: 847 records updated', timestamp: '2 min ago', status: 'success' },
  { id: '2', type: 'validate', message: 'IDMP validation passed for LIG-2847', timestamp: '3 min ago', status: 'success' },
  { id: '3', type: 'submit', message: 'Safety data package submitted to Accumulus', timestamp: '5 min ago', status: 'success' },
  { id: '4', type: 'acknowledge', message: 'FDA acknowledged receipt of Module 5 update', timestamp: '12 min ago', status: 'info' },
  { id: '5', type: 'error', message: 'CMC batch record validation warning: 2 minor issues', timestamp: '15 min ago', status: 'warning' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ready': return 'text-green-400';
    case 'near-ready': return 'text-blue-400';
    case 'in-progress': return 'text-amber-400';
    case 'blocked': return 'text-red-400';
    case 'active': return 'text-green-400';
    case 'paused': return 'text-amber-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case 'ready': return 'bg-green-500/20';
    case 'near-ready': return 'bg-blue-500/20';
    case 'in-progress': return 'bg-amber-500/20';
    case 'blocked': return 'bg-red-500/20';
    case 'active': return 'bg-green-500/20';
    case 'paused': return 'bg-amber-500/20';
    case 'error': return 'bg-red-500/20';
    default: return 'bg-gray-500/20';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
    default: return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'sync': return <RefreshCw className="w-4 h-4" />;
    case 'submit': return <Upload className="w-4 h-4" />;
    case 'validate': return <CheckCircle className="w-4 h-4" />;
    case 'acknowledge': return <FileText className="w-4 h-4" />;
    case 'error': return <AlertTriangle className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getActivityColor = (status: string) => {
  switch (status) {
    case 'success': return 'text-green-400';
    case 'warning': return 'text-amber-400';
    case 'error': return 'text-red-400';
    case 'info': return 'text-blue-400';
    default: return 'text-gray-400';
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContinuousSubmissionDashboard() {
    const { deadClick } = useDeadClick();
  const [selectedProduct] = useState('LIG-2847 (Nexavant)');
  const [isLive, setIsLive] = useState(true);
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // Calculate overall readiness
  const overallReadiness = useMemo(() => {
    const total = MOCK_DOMAINS.reduce((acc, d) => acc + d.readiness, 0);
    return Math.round(total / MOCK_DOMAINS.length);
  }, []);
  
  const readyDomains = MOCK_DOMAINS.filter(d => d.status === 'ready').length;
  const timeSaved = MOCK_TIMELINE.traditional.durationDays - MOCK_TIMELINE.continuous.durationDays;
  const percentReduction = Math.round((timeSaved / MOCK_TIMELINE.traditional.durationDays) * 100);

  return (
    <div className="h-full flex flex-col bg-surface text-text-primary overflow-hidden">
      <ScreenHeader
        title="Continuous Submission"
        subtitle="API-first regulatory exchange — real-time submission tracking and automated package delivery"
        icon={<Cloud className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isLive ? 'bg-green-500/20 text-green-400' : 'bg-surface-elevated text-text-muted'}`}
            >
              {isLive ? <><Radio className="w-4 h-4 animate-pulse" /><span className="text-sm font-medium">Live</span></> : <><WifiOff className="w-4 h-4" /><span className="text-sm font-medium">Paused</span></>}
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated hover:bg-surface-card rounded-lg transition-colors" onClick={() => toast.success('Submission action recorded — eCTD sequence updated')}>
              <RefreshCw className="w-4 h-4" /><span className="text-sm">Refresh</span>
            </button>
            <button className="p-2 hover:bg-surface-elevated rounded-lg transition-colors" onClick={() => toast.success('Submission action recorded — eCTD sequence updated')}>
              <Settings className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4 md:space-y-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Overall Readiness */}
            <div className="bg-surface-elevated rounded-xl p-5 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-muted mb-1">Overall Readiness</p>
                  <p className="text-3xl font-bold text-text-primary">{overallReadiness}%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-teal-400" />
                </div>
              </div>
              <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallReadiness}%` }}
                />
              </div>
            </div>
            
            {/* Ready Domains */}
            <div className="bg-surface-elevated rounded-xl p-5 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-muted mb-1">Domains Ready</p>
                  <p className="text-3xl font-bold text-text-primary">{readyDomains}/{MOCK_DOMAINS.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <p className="text-sm text-text-muted">
                {MOCK_DOMAINS.length - readyDomains} domains in progress
              </p>
            </div>
            
            {/* Time Saved */}
            <div className="bg-surface-elevated rounded-xl p-5 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-muted mb-1">Time Saved</p>
                  <p className="text-3xl font-bold text-green-400">{timeSaved} days</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <p className="text-sm text-text-muted">
                {percentReduction}% faster than traditional
              </p>
            </div>
            
            {/* Active Pipelines */}
            <div className="bg-surface-elevated rounded-xl p-5 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-muted mb-1">Active Pipelines</p>
                  <p className="text-3xl font-bold text-text-primary">
                    {MOCK_PIPELINES.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Server className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <p className="text-sm text-text-muted">
                Real-time data exchange
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Domain Readiness - Left Column */}
            <div className="col-span-1 lg:col-span-8 space-y-4 md:space-y-6">
              {/* Data Domain Cards */}
              <div className="bg-surface-elevated rounded-xl border border-border">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-text-primary">Data Domain Readiness</h2>
                  <span className="text-sm text-text-muted">Last sync: 1 min ago</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {MOCK_DOMAINS.map((domain) => (
                      <div
                        key={domain.id}
                        className="bg-surface-card rounded-lg p-4 border border-border hover:border-border-focus transition-colors cursor-pointer"
                        onClick={() => toast.info(`${domain.name}: ${domain.itemsReady}/${domain.itemsTotal} items ready — ${domain.blockers} blocker${domain.blockers !== 1 ? 's' : ''} pending`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${getStatusBg(domain.status)} flex items-center justify-center ${getStatusColor(domain.status)}`}>
                              {domain.icon}
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">{domain.name}</p>
                              <p className="text-xs text-text-muted">
                                {domain.itemsReady} / {domain.itemsTotal} items
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(domain.trend)}
                            <span className={`text-lg font-bold ${getStatusColor(domain.status)}`}>
                              {domain.readiness}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              domain.status === 'ready' ? 'bg-green-500' :
                              domain.status === 'near-ready' ? 'bg-blue-500' :
                              domain.status === 'in-progress' ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${domain.readiness}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Last sync: {domain.lastSync}</span>
                          {domain.blockers > 0 && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              {domain.blockers} blockers
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline Comparison */}
              <div className="bg-surface-elevated rounded-xl border border-border">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-text-primary">Timeline Comparison</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      Traditional
                    </span>
                    <span className="flex items-center gap-1.5 text-teal-400">
                      <div className="w-2 h-2 rounded-full bg-teal-400" />
                      Continuous
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4 md:space-y-6">
                  {/* Traditional Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Traditional eCTD</span>
                      <span className="text-amber-400 font-medium">{MOCK_TIMELINE.traditional.durationDays} days</span>
                    </div>
                    <div className="relative h-10 bg-surface-card rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center px-3">
                        <div className="flex-1 flex items-center relative">
                          {MOCK_TIMELINE.traditional.milestones.map((m, i) => (
                            <div
                              key={i}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${(m.day / MOCK_TIMELINE.traditional.durationDays) * 100}%`, transform: 'translateX(-50%)' }}
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                m.status === 'done' ? 'bg-green-500' :
                                m.status === 'current' ? 'bg-amber-500' :
                                'bg-gray-500'
                              }`} />
                              <span className="text-[10px] text-text-muted mt-1 whitespace-nowrap">{m.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-full bg-amber-500/30 rounded-lg" />
                    </div>
                  </div>
                  
                  {/* Continuous Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Continuous Submission</span>
                      <span className="text-teal-400 font-medium">{MOCK_TIMELINE.continuous.durationDays} days</span>
                    </div>
                    <div className="relative h-10 bg-surface-card rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500/30 to-cyan-500/30 rounded-lg"
                        style={{ width: `${(MOCK_TIMELINE.continuous.durationDays / MOCK_TIMELINE.traditional.durationDays) * 100}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        {MOCK_TIMELINE.continuous.milestones.map((m, i) => (
                          <div
                            key={i}
                            className="absolute flex flex-col items-center"
                            style={{ 
                              left: `${(m.day / MOCK_TIMELINE.traditional.durationDays) * 100}%`, 
                              transform: 'translateX(-50%)' 
                            }}
                          >
                            <div className={`w-2 h-2 rounded-full ${
                              m.status === 'done' ? 'bg-teal-500' :
                              m.status === 'current' ? 'bg-teal-400 animate-pulse' :
                              'bg-gray-500'
                            }`} />
                            <span className="text-[10px] text-text-muted mt-1 whitespace-nowrap">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Time Saved Banner */}
                  <div className="flex items-center justify-center gap-3 py-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <Zap className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      {timeSaved} days saved ({percentReduction}% reduction)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-1 lg:col-span-4 space-y-4 md:space-y-6">
              {/* Active Pipelines */}
              <div className="bg-surface-elevated rounded-xl border border-border">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-text-primary">Submission Pipelines</h2>
                  <button className="text-xs text-brand hover:text-brand-dark" onClick={() => setActiveModule('submissions-hub')}>View All</button>
                </div>
                <div className="divide-y divide-border">
                  {MOCK_PIPELINES.map((pipeline) => (
                    <div key={pipeline.id} className="px-5 py-4 hover:bg-surface-card transition-colors cursor-pointer" onClick={() => toast.info(`${pipeline.name} → ${pipeline.target}: ${pipeline.successRate}% success rate`)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {pipeline.status === 'active' ? (
                            <Wifi className="w-4 h-4 text-green-400" />
                          ) : pipeline.status === 'paused' ? (
                            <Pause className="w-4 h-4 text-amber-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="font-medium text-text-primary text-sm">{pipeline.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBg(pipeline.status)} ${getStatusColor(pipeline.status)}`}>
                          {pipeline.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>Target: {pipeline.target}</span>
                        <span>{pipeline.dataPoints.toLocaleString()} records</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-muted mt-1">
                        <span>Last: {pipeline.lastRun}</span>
                        <span className="text-green-400">{pipeline.successRate}% success</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-surface-elevated rounded-xl border border-border">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-text-primary">Recent Activity</h2>
                  <div className="flex items-center gap-1 text-green-400">
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span className="text-xs">Live</span>
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                  {MOCK_ACTIVITIES.map((activity) => (
                    <div key={activity.id} className="px-5 py-3 hover:bg-surface-card transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center ${getActivityColor(activity.status)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">{activity.message}</p>
                          <p className="text-xs text-text-muted mt-0.5">{activity.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accumulus Synergy Card */}
              <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-500/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Accumulus Ready</h3>
                    <p className="text-xs text-text-muted">Cloud-native regulatory exchange</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  This submission package is fully compatible with Accumulus Synergy for real-time 
                  health authority collaboration.
                </p>
                <div className="flex items-center gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium" onClick={() => toast.success('Submission action recorded — eCTD sequence updated')}>
                    <ExternalLink className="w-4 h-4" />
                    Open in Accumulus
                  </button>
                  <button className="p-2 hover:bg-teal-500/20 rounded-lg transition-colors" onClick={() => toast.success('Submission action recorded — eCTD sequence updated')}>
                    <Info className="w-5 h-5 text-teal-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Health Authority Connection Status */}
          <div className="bg-surface-elevated rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">Health Authority Connections</h2>
              <span className="text-xs text-text-muted">
                {MOCK_HA_STATUS.filter(h => h.connectionStatus === 'connected').length} of {MOCK_HA_STATUS.length} connected
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {MOCK_HA_STATUS.map((ha) => (
                <div key={ha.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{ha.shortName}</span>
                        <span className="text-xs text-text-muted bg-surface-card px-1.5 py-0.5 rounded">{ha.region}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 truncate max-w-[160px]">{ha.name}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      ha.connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                      ha.connectionStatus === 'degraded' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        ha.connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                        ha.connectionStatus === 'degraded' ? 'bg-amber-400' :
                        'bg-red-400'
                      }`} />
                      {ha.connectionStatus}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-text-primary">{ha.pendingItems}</p>
                      <p className="text-[10px] text-text-muted">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-400">{ha.acknowledgedToday}</p>
                      <p className="text-[10px] text-text-muted">Ack'd today</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${ha.latencyMs > 500 ? 'text-amber-400' : 'text-text-primary'}`}>{ha.latencyMs}ms</p>
                      <p className="text-[10px] text-text-muted">Latency</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-3 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Last exchange {ha.lastExchange}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-surface-elevated rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">Recent Submissions</h2>
              <button className="text-xs text-brand hover:text-brand-dark" onClick={() => setActiveModule('submissions-hub')}>View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Submission ID</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Content</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Target</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Submitted</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_RECENT_SUBMISSIONS.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-card transition-colors cursor-pointer" onClick={() => { setActiveModule('submissions-hub'); toast.info(`Opening submission ${sub.submissionId}…`); }}>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-text-secondary">{sub.submissionId}</span>
                      </td>
                      <td className="px-5 py-3 text-text-primary">{sub.product}</td>
                      <td className="px-5 py-3 text-text-secondary">{sub.module}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-surface-card border border-border rounded text-xs text-text-secondary font-medium">
                          {sub.target}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{sub.submittedAt}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          sub.status === 'acknowledged' ? 'bg-blue-500/20 text-blue-400' :
                          sub.status === 'under-review' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-surface-card text-text-muted'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            sub.status === 'accepted' ? 'bg-green-400' :
                            sub.status === 'acknowledged' ? 'bg-blue-400' :
                            sub.status === 'under-review' ? 'bg-amber-400 animate-pulse' :
                            'bg-status-neutral'
                          }`} />
                          {sub.status.replace(/-/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
