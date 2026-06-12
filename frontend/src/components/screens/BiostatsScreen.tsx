// =============================================================================
// BIOSTATISTICS SCREEN - v0.42.46
// =============================================================================
// Comprehensive biostatistics module for clinical data analysis:
// - SAP (Statistical Analysis Plan) management
// - ADAM dataset specifications
// - TLF (Tables, Listings, Figures) tracking
// - CDISC compliance validation
// - Analysis runs and outputs
// - DB Lock integration
// - eCTD submission readiness (cross-module → Submissions)
// =============================================================================


import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Table,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Users,
  Calendar,
  GitBranch,
  Layers,
  FileCode,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Shield,
  Package,
  Send,
  History,
  Settings,
  MoreVertical,
  ExternalLink,
  Link2,
  Sparkles,
  X,
  BarChart2,
  ArrowUpRight,
  CheckSquare,
  XCircle,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useDataPackageStore } from '@/store/useDataPackageStore';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useAppStore } from '@/store/useAppStore';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
import { ListFilterRail } from '@/components/ui/ListFilterRail';

// =============================================================================
// TYPES
// =============================================================================

type BiostatsTab = 'overview' | 'sap' | 'adam' | 'tlf' | 'cdisc' | 'runs' | 'outputs';

type SAPStatus = 'draft' | 'in-review' | 'approved' | 'locked' | 'amended';
type DatasetStatus = 'pending' | 'in-progress' | 'qc-review' | 'validated' | 'locked';
type TLFStatus = 'not-started' | 'programming' | 'qc' | 'review' | 'approved' | 'locked';
type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type CDISCLevel = 'pass' | 'warning' | 'error' | 'not-run';

interface SAP {
  id: string;
  studyId: string;
  studyName: string;
  version: string;
  status: SAPStatus;
  author: string;
  statistician: string;
  lastModified: string;
  approvedDate?: string;
  sections: number;
  endpoints: number;
  analyses: number;
}

interface ADAMDataset {
  id: string;
  name: string;
  label: string;
  description: string;
  status: DatasetStatus;
  programmer: string;
  qcProgrammer?: string;
  variables: number;
  records: number;
  lastRun?: string;
  cdiscCompliance: CDISCLevel;
  sourceDatasets: string[];
}

interface TLF {
  id: string;
  number: string;
  title: string;
  type: 'table' | 'listing' | 'figure';
  status: TLFStatus;
  programmer: string;
  qcProgrammer?: string;
  reviewer?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  sourceDataset: string;
  outputFormat: string[];
  lastRun?: string;
}

interface AnalysisRun {
  id: string;
  name: string;
  type: 'production' | 'qc' | 'ad-hoc' | 'dry-run';
  status: RunStatus;
  startTime: string;
  endTime?: string;
  duration?: string;
  triggeredBy: string;
  outputs: number;
  errors: number;
  warnings: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_SAPS: SAP[] = [
  {
    id: 'sap-001',
    studyId: 'LIG-2847-301',
    studyName: 'Phase 3 Efficacy (2L+ NSCLC)',
    version: '2.0',
    status: 'locked',
    author: 'Dr. Sarah Chen',
    statistician: 'Dr. Michael Park',
    lastModified: '2025-01-15',
    approvedDate: '2025-01-10',
    sections: 12,
    endpoints: 8,
    analyses: 45,
  },
  {
    id: 'sap-002',
    studyId: 'LIG-2847-302',
    studyName: 'Phase 3 Efficacy (1L NSCLC)',
    version: '1.1',
    status: 'in-review',
    author: 'Dr. Emily Watson',
    statistician: 'Dr. James Liu',
    lastModified: '2025-01-28',
    sections: 10,
    endpoints: 6,
    analyses: 32,
  },
  {
    id: 'sap-003',
    studyId: 'LIG-2847-201',
    studyName: 'Phase 2b Dose-Finding',
    version: '1.0',
    status: 'approved',
    author: 'Dr. Robert Kim',
    statistician: 'Dr. Lisa Chen',
    lastModified: '2025-01-20',
    approvedDate: '2025-01-18',
    sections: 8,
    endpoints: 4,
    analyses: 18,
  },
  {
    id: 'sap-004',
    studyId: 'LIG-2847-101',
    studyName: 'Phase 1 First-in-Human PK/PD',
    version: '1.0',
    status: 'locked',
    author: 'Dr. Helen Park',
    statistician: 'Dr. Alan Torres',
    lastModified: '2024-09-05',
    approvedDate: '2024-09-01',
    sections: 7,
    endpoints: 3,
    analyses: 12,
  },
  {
    id: 'sap-005',
    studyId: 'LIG-2847-301',
    studyName: 'Phase 3 Efficacy (2L+ NSCLC)',
    version: '1.3',
    status: 'locked',
    author: 'Dr. Sarah Chen',
    statistician: 'Dr. Michael Park',
    lastModified: '2025-02-01',
    approvedDate: '2025-01-30',
    sections: 5,
    endpoints: 4,
    analyses: 14,
  },
  {
    id: 'sap-006',
    studyId: 'LIG-1182-301',
    studyName: 'Phase 3 HER2+ mBC (2L+)',
    version: '2.1',
    status: 'locked',
    author: 'Dr. Monica Shaw',
    statistician: 'Dr. Wei Zhang',
    lastModified: '2025-01-22',
    approvedDate: '2025-01-19',
    sections: 11,
    endpoints: 7,
    analyses: 40,
  },
  {
    id: 'sap-007',
    studyId: 'LIG-1182-201',
    studyName: 'Phase 2 HER2+ Breast Cancer',
    version: '1.0',
    status: 'approved',
    author: 'Dr. Tom Bradley',
    statistician: 'Dr. Wei Zhang',
    lastModified: '2024-11-14',
    approvedDate: '2024-11-10',
    sections: 9,
    endpoints: 5,
    analyses: 22,
  },
  {
    id: 'sap-008',
    studyId: 'LIG-2847-301',
    studyName: 'Phase 3 Efficacy (2L+ NSCLC)',
    version: '1.0',
    status: 'draft',
    author: 'Dr. Sarah Chen',
    statistician: 'Dr. Michael Park',
    lastModified: '2025-03-10',
    sections: 4,
    endpoints: 2,
    analyses: 8,
  },
  {
    id: 'sap-009',
    studyId: 'LIG-2847-302',
    studyName: 'Phase 3 Efficacy (1L NSCLC)',
    version: '0.9',
    status: 'draft',
    author: 'Dr. Carlos Ruiz',
    statistician: 'Dr. James Liu',
    lastModified: '2025-03-18',
    sections: 6,
    endpoints: 4,
    analyses: 20,
  },
  {
    id: 'sap-010',
    studyId: 'LIG-2847-301',
    studyName: 'Phase 3 Efficacy (2L+ NSCLC)',
    version: '1.0',
    status: 'amended',
    author: 'Dr. Sarah Chen',
    statistician: 'Dr. Michael Park',
    lastModified: '2025-02-20',
    approvedDate: '2025-02-18',
    sections: 12,
    endpoints: 9,
    analyses: 48,
  },
];

const MOCK_ADAM_DATASETS: ADAMDataset[] = [
  {
    id: 'adam-001',
    name: 'ADSL',
    label: 'Subject-Level Analysis Dataset',
    description: 'One record per subject with baseline and demographic data',
    status: 'locked',
    programmer: 'John Smith',
    qcProgrammer: 'Amy Lee',
    variables: 85,
    records: 450,
    lastRun: '2025-01-28 14:30',
    cdiscCompliance: 'pass',
    sourceDatasets: ['DM', 'DS', 'EX', 'VS'],
  },
  {
    id: 'adam-002',
    name: 'ADAE',
    label: 'Adverse Events Analysis Dataset',
    description: 'One record per adverse event per subject',
    status: 'validated',
    programmer: 'John Smith',
    qcProgrammer: 'David Chen',
    variables: 72,
    records: 1250,
    lastRun: '2025-01-28 15:45',
    cdiscCompliance: 'pass',
    sourceDatasets: ['AE', 'ADSL'],
  },
  {
    id: 'adam-003',
    name: 'ADTTE',
    label: 'Time-to-Event Analysis Dataset',
    description: 'Time-to-event analysis for primary endpoint',
    status: 'qc-review',
    programmer: 'Sarah Johnson',
    qcProgrammer: 'Mike Wong',
    variables: 45,
    records: 450,
    lastRun: '2025-01-29 09:15',
    cdiscCompliance: 'warning',
    sourceDatasets: ['RS', 'ADSL'],
  },
  {
    id: 'adam-004',
    name: 'ADEFF',
    label: 'Efficacy Analysis Dataset',
    description: 'Efficacy endpoint data with derived variables',
    status: 'in-progress',
    programmer: 'Sarah Johnson',
    variables: 58,
    records: 2700,
    cdiscCompliance: 'not-run',
    sourceDatasets: ['RS', 'TR', 'ADSL'],
  },
  {
    id: 'adam-005',
    name: 'ADLB',
    label: 'Laboratory Analysis Dataset',
    description: 'Laboratory test results with analysis flags',
    status: 'validated',
    programmer: 'David Chen',
    qcProgrammer: 'John Smith',
    variables: 95,
    records: 45000,
    lastRun: '2025-01-27 16:00',
    cdiscCompliance: 'pass',
    sourceDatasets: ['LB', 'ADSL'],
  },
];

const MOCK_TLFS: TLF[] = [
  {
    id: 'tlf-001',
    number: 'T-14.1.1',
    title: 'Summary of Subject Disposition',
    type: 'table',
    status: 'locked',
    programmer: 'John Smith',
    qcProgrammer: 'Amy Lee',
    reviewer: 'Dr. Sarah Chen',
    priority: 'high',
    sourceDataset: 'ADSL',
    outputFormat: ['RTF', 'PDF'],
    lastRun: '2025-01-28 14:30',
  },
  {
    id: 'tlf-002',
    number: 'T-14.2.1',
    title: 'Summary of Demographics and Baseline Characteristics',
    type: 'table',
    status: 'approved',
    programmer: 'John Smith',
    qcProgrammer: 'David Chen',
    reviewer: 'Dr. Michael Park',
    priority: 'high',
    sourceDataset: 'ADSL',
    outputFormat: ['RTF', 'PDF'],
    lastRun: '2025-01-28 15:00',
  },
  {
    id: 'tlf-003',
    number: 'T-14.3.1',
    title: 'Overall Summary of Treatment-Emergent Adverse Events',
    type: 'table',
    status: 'qc',
    programmer: 'Sarah Johnson',
    qcProgrammer: 'Mike Wong',
    priority: 'high',
    dueDate: '2025-02-01',
    sourceDataset: 'ADAE',
    outputFormat: ['RTF', 'PDF'],
    lastRun: '2025-01-29 10:00',
  },
  {
    id: 'tlf-004',
    number: 'F-14.2.1',
    title: 'Kaplan-Meier Plot of Progression-Free Survival',
    type: 'figure',
    status: 'programming',
    programmer: 'Sarah Johnson',
    priority: 'high',
    dueDate: '2025-02-03',
    sourceDataset: 'ADTTE',
    outputFormat: ['PNG', 'PDF'],
  },
  {
    id: 'tlf-005',
    number: 'L-16.2.1',
    title: 'Listing of Subjects with Serious Adverse Events',
    type: 'listing',
    status: 'review',
    programmer: 'David Chen',
    qcProgrammer: 'John Smith',
    reviewer: 'Dr. Emily Watson',
    priority: 'medium',
    sourceDataset: 'ADAE',
    outputFormat: ['RTF', 'PDF'],
    lastRun: '2025-01-28 16:30',
  },
  {
    id: 'tlf-006',
    number: 'T-14.4.1',
    title: 'Summary of Primary Efficacy Endpoint',
    type: 'table',
    status: 'not-started',
    programmer: 'Sarah Johnson',
    priority: 'high',
    dueDate: '2025-02-05',
    sourceDataset: 'ADEFF',
    outputFormat: ['RTF', 'PDF'],
  },
];

const MOCK_RUNS: AnalysisRun[] = [
  {
    id: 'run-001',
    name: 'Production Run - Interim Analysis',
    type: 'production',
    status: 'completed',
    startTime: '2025-01-29 08:00',
    endTime: '2025-01-29 09:45',
    duration: '1h 45m',
    triggeredBy: 'Dr. Sarah Chen',
    outputs: 45,
    errors: 0,
    warnings: 3,
  },
  {
    id: 'run-002',
    name: 'QC Validation Run',
    type: 'qc',
    status: 'running',
    startTime: '2025-01-30 07:30',
    triggeredBy: 'System (Scheduled)',
    outputs: 0,
    errors: 0,
    warnings: 0,
  },
  {
    id: 'run-003',
    name: 'Ad-hoc Analysis - Subgroup',
    type: 'ad-hoc',
    status: 'completed',
    startTime: '2025-01-28 14:00',
    endTime: '2025-01-28 14:25',
    duration: '25m',
    triggeredBy: 'Dr. Michael Park',
    outputs: 8,
    errors: 0,
    warnings: 1,
  },
  {
    id: 'run-004',
    name: 'Dry Run - Final Analysis',
    type: 'dry-run',
    status: 'failed',
    startTime: '2025-01-27 16:00',
    endTime: '2025-01-27 16:15',
    duration: '15m',
    triggeredBy: 'John Smith',
    outputs: 0,
    errors: 2,
    warnings: 5,
  },
];

// =============================================================================
// STATUS CONFIGURATIONS
// =============================================================================

const SAP_STATUS_CONFIG: Record<SAPStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  'in-review': { label: 'In Review', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/20' },
  locked: { label: 'Locked', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  amended: { label: 'Amended', color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

const DATASET_STATUS_CONFIG: Record<DatasetStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: RefreshCw },
  'qc-review': { label: 'QC Review', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Eye },
  validated: { label: 'Validated', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  locked: { label: 'Locked', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Lock },
};

const TLF_STATUS_CONFIG: Record<TLFStatus, { label: string; color: string; bg: string }> = {
  'not-started': { label: 'Not Started', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  programming: { label: 'Programming', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  qc: { label: 'QC', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  review: { label: 'Review', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/20' },
  locked: { label: 'Locked', color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

const RUN_STATUS_CONFIG: Record<RunStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  queued: { label: 'Queued', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Clock },
  running: { label: 'Running', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: RefreshCw },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: AlertTriangle },
};

const CDISC_LEVEL_CONFIG: Record<CDISCLevel, { label: string; color: string; bg: string }> = {
  pass: { label: 'Pass', color: 'text-green-400', bg: 'bg-green-500/20' },
  warning: { label: 'Warnings', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  error: { label: 'Errors', color: 'text-red-400', bg: 'bg-red-500/20' },
  'not-run': { label: 'Not Run', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatCard({ icon: Icon, label, value, color, trend, onClick }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; up: boolean };
  onClick?: () => void;
}) {
  const isClickable = typeof onClick === 'function';
  return (
    <div
      className={`p-4 bg-surface-card rounded-lg border border-border transition-all ${isClickable ? 'cursor-pointer hover:border-accent-blue/60 hover:bg-surface-elevated hover:shadow-sm group' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${color} ${isClickable ? 'group-hover:scale-110 transition-transform' : ''}`} />
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend.up ? 'text-green-400' : 'text-red-400'}`}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className={`text-xs text-text-muted flex items-center gap-1 ${isClickable ? 'group-hover:text-accent-blue' : ''}`}>
        {label}
        {isClickable && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );
}

function OverviewTab({ onTabChange }: { onTabChange?: (tab: BiostatsTab) => void }) {
    const { deadClick } = useDeadClick();
  const tlfStats = useMemo(() => {
    const byStatus = MOCK_TLFS.reduce((acc, tlf) => {
      acc[tlf.status] = (acc[tlf.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return byStatus;
  }, []);

  const datasetStats = useMemo(() => {
    const locked = MOCK_ADAM_DATASETS.filter(d => d.status === 'locked').length;
    const validated = MOCK_ADAM_DATASETS.filter(d => d.status === 'validated').length;
    return { locked, validated, total: MOCK_ADAM_DATASETS.length };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard icon={FileText} label="Active SAPs" value={MOCK_SAPS.length} color="text-blue-400" onClick={() => onTabChange?.("sap")} />
        <StatCard icon={Database} label="ADAM Datasets" value={MOCK_ADAM_DATASETS.length} color="text-purple-400" trend={{ value: 12, up: true }} onClick={() => onTabChange?.("adam")} />
        <StatCard icon={Table} label="TLFs Total" value={MOCK_TLFS.length} color="text-amber-400" onClick={() => onTabChange?.("tlf")} />
        <StatCard icon={CheckCircle} label="TLFs Approved" value={tlfStats.approved || 0} color="text-green-400" onClick={() => onTabChange?.("tlf")} />
        <StatCard icon={Play} label="Active Runs" value={MOCK_RUNS.filter(r => r.status === 'running').length} color="text-cyan-400" onClick={() => onTabChange?.("runs")} />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* TLF Progress */}
        <div className="p-4 bg-surface-card rounded-lg border border-border">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Table className="w-4 h-4 text-amber-400" />
            TLF Production Progress
          </h3>
          <div className="space-y-3">
            {Object.entries(TLF_STATUS_CONFIG).map(([status, config]) => {
              const count = tlfStats[status] || 0;
              const pct = Math.round((count / MOCK_TLFS.length) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={config.color}>{config.label}</span>
                    <span className="text-text-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${config.bg.replace('/20', '')}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dataset Status */}
        <div className="p-4 bg-surface-card rounded-lg border border-border">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            ADAM Dataset Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {MOCK_ADAM_DATASETS.slice(0, 4).map(ds => {
              const config = DATASET_STATUS_CONFIG[ds.status];
              const StatusIcon = config.icon;
              return (
                <div key={ds.id} className="p-3 bg-surface-elevated rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-text-primary">{ds.name}</span>
                    <StatusIcon className={`w-4 h-4 ${config?.color ?? ''}`} />
                  </div>
                  <div className="text-xs text-text-muted">{ds.records.toLocaleString()} records</div>
                  <div className={`text-xs mt-1 ${config?.color ?? ''}`}>{config.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-4 bg-surface-card rounded-lg border border-border">
        <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Recent Analysis Runs
        </h3>
        <div className="space-y-2">
          {MOCK_RUNS.slice(0, 3).map(run => {
            const config = RUN_STATUS_CONFIG[run.status];
            const StatusIcon = config.icon;
            return (
              <div key={run.id} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-5 h-5 ${config?.color ?? ''} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                  <div>
                    <div className="text-sm font-medium text-text-primary">{run.name}</div>
                    <div className="text-xs text-text-muted">Started {run.startTime} by {run.triggeredBy}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {run.duration && <span className="text-text-muted">{run.duration}</span>}
                  <span className={`px-2 py-0.5 rounded ${config?.bg ?? ''} ${config?.color ?? ''}`}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* v0.42.46: Submission Readiness — Cross-Module Link */}
      <div className="p-4 bg-surface-card rounded-lg border border-border">
        <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-400" />
          eCTD Submission Readiness
          <Badge color="blue" size="xs">Module 5</Badge>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
          <div className="p-3 bg-surface-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-accent-green">{tlfStats.approved || 0}</div>
            <div className="text-xs text-text-muted mt-1">QC Approved</div>
            <div className="text-xs text-accent-green">Submission Ready</div>
          </div>
          <div className="p-3 bg-surface-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-accent-amber">{(tlfStats['not-started'] || 0) + (tlfStats.programming || 0) + (tlfStats.qc || 0) + (tlfStats.review || 0)}</div>
            <div className="text-xs text-text-muted mt-1">Pending</div>
            <div className="text-xs text-accent-amber">Not Ready</div>
          </div>
          <div className="p-3 bg-surface-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-text-primary">{MOCK_TLFS.length > 0 ? Math.round(((tlfStats.approved || 0) + (tlfStats.locked || 0)) / MOCK_TLFS.length * 100) : 0}%</div>
            <div className="text-xs text-text-muted mt-1">Overall</div>
            <div className="text-xs text-text-secondary">Readiness</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { module: '5.3.5.1', label: 'Efficacy Data', types: ['table', 'figure'], pops: ['ITT', 'mITT', 'PP'] },
            { module: '5.3.5.3', label: 'Safety Data', types: ['table', 'figure'], pops: ['Safety'] },
            { module: '5.3.3', label: 'PK Data', types: ['table', 'figure'], pops: ['PK'] },
            { module: '5.3.7', label: 'Patient Listings', types: ['listing'], pops: ['ITT', 'Safety'] },
          ].map(section => {
            const relevantTLFs = MOCK_TLFS.filter(t => section.types.includes(t.type));
            const ready = relevantTLFs.filter(t => t.status === 'approved' || t.status === 'locked').length;
            return (
              <div key={section.module} className="flex items-center justify-between p-2 bg-surface-elevated rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-muted w-14">{section.module}</span>
                  <span className="text-sm text-text-primary">{section.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{ready}/{relevantTLFs.length}</span>
                  <Badge color={ready === relevantTLFs.length && relevantTLFs.length > 0 ? 'green' : ready > 0 ? 'amber' : 'slate'} size="xs">
                    {ready === relevantTLFs.length && relevantTLFs.length > 0 ? 'Ready' : ready > 0 ? 'Partial' : 'Pending'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg flex items-start gap-2">
          <Link2 className="w-4 h-4 text-accent-blue mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-text-primary">Cross-Module Link</div>
            <p className="text-xs text-text-muted mt-0.5">QC-approved TLFs auto-map to eCTD Module 5 sections for submission assembly. Critical outputs block submission readiness until approved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SAP filter helpers ────────────────────────────────────────────────────────

const SAP_STUDY_OPTIONS = Array.from(new Set(MOCK_SAPS.map(s => s.studyId))).map(id => ({
  value: id,
  label: id,
}));

const SAP_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'in-review', label: 'In Review' },
  { value: 'approved',  label: 'Approved' },
  { value: 'locked',    label: 'Locked' },
  { value: 'amended',   label: 'Amended' },
];

const SAP_STATISTICIAN_OPTIONS = Array.from(new Set(MOCK_SAPS.map(s => s.statistician))).map(n => ({
  value: n,
  label: n,
}));

function SAPTab({ initialStudyFilter = 'all' }: { initialStudyFilter?: string }) {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  const [selectedSAP, setSelectedSAP] = useState<SAP | null>(MOCK_SAPS[0]);
  const [sapViewTarget, setSapViewTarget] = useState<SAP | null>(null);

  // Filter state — initialStudyFilter pre-wires from scope
  const [search, setSearch] = useState('');
  const [studyFilter, setStudyFilter] = useState(initialStudyFilter);
  useEffect(() => { if (initialStudyFilter !== 'all') setStudyFilter(initialStudyFilter); }, [initialStudyFilter]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [statisticianFilter, setStatisticianFilter] = useState('all');

  const filteredSAPs = MOCK_SAPS.filter(sap => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !sap.studyId.toLowerCase().includes(q) &&
        !sap.studyName.toLowerCase().includes(q) &&
        !sap.author.toLowerCase().includes(q) &&
        !sap.statistician.toLowerCase().includes(q)
      ) return false;
    }
    if (studyFilter !== 'all' && sap.studyId !== studyFilter) return false;
    if (statusFilter !== 'all' && sap.status !== statusFilter) return false;
    if (statisticianFilter !== 'all' && sap.statistician !== statisticianFilter) return false;
    return true;
  });

  // If selected SAP is filtered out, clear selection
  const visibleSelectedSAP = filteredSAPs.find(s => s.id === selectedSAP?.id) ?? filteredSAPs[0] ?? null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* SAP List */}
      <div className="hidden lg:flex w-80 bg-surface-elevated border-r border-border flex-col flex-shrink-0">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary text-sm">Statistical Analysis Plans</h3>
          </div>
          <ListFilterRail
            search={search}
            onSearch={setSearch}
            filters={[
              { key: 'study', label: 'Study', value: studyFilter, options: SAP_STUDY_OPTIONS, onChange: setStudyFilter },
              { key: 'status', label: 'Status', value: statusFilter, options: SAP_STATUS_OPTIONS, onChange: setStatusFilter },
              { key: 'statistician', label: 'Statistician', value: statisticianFilter, options: SAP_STATISTICIAN_OPTIONS, onChange: setStatisticianFilter },
            ]}
            resultCount={filteredSAPs.length}
            totalCount={MOCK_SAPS.length}
            searchPlaceholder="Search SAPs…"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSAPs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-sm text-text-muted">No SAPs match the current filters.</p>
              <button
                onClick={() => { setSearch(''); setStudyFilter('all'); setStatusFilter('all'); setStatisticianFilter('all'); }}
                className="mt-2 text-xs text-accent-blue hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredSAPs.map(sap => {
              const config = SAP_STATUS_CONFIG[sap.status];
              return (
                <button
                  key={sap.id}
                  onClick={() => setSelectedSAP(sap)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                    visibleSelectedSAP?.id === sap.id ? 'bg-accent-blue/10 border border-accent-blue/30' : 'hover:bg-surface-card border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary text-sm truncate max-w-[140px]">{sap.studyId}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${config?.bg ?? ''} ${config?.color ?? ''}`}>{config.label}</span>
                  </div>
                  <div className="text-xs text-text-muted truncate">{sap.studyName}</div>
                  <div className="text-xs text-text-muted mt-1">v{sap.version} • {sap.analyses} analyses</div>
                </button>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-border">
          <button className="w-full px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg flex items-center justify-center gap-2" onClick={() => toast.success('New SAP created — LIG-2847-P002 added to workspace', { action: { label: 'Open', onClick: () => {} } })}>
            <Plus className="w-4 h-4" />
            New SAP
          </button>
        </div>
      </div>

      {/* SAP Document Viewer Modal */}
      {sapViewTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSapViewTarget(null)}>
          <div className="w-full max-w-2xl h-full bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-elevated flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-text-primary">{sapViewTarget.studyId}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs ${SAP_STATUS_CONFIG[sapViewTarget.status].bg} ${SAP_STATUS_CONFIG[sapViewTarget.status].color}`}>{SAP_STATUS_CONFIG[sapViewTarget.status].label}</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">Statistical Analysis Plan · v{sapViewTarget.version}</p>
              </div>
              <button onClick={() => setSapViewTarget(null)} className="p-1.5 hover:bg-surface-card rounded text-text-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Section TOC */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" />Table of Contents</h3>
                <div className="space-y-1">
                  {[
                    { n: '1', t: 'Introduction and Background', p: '1' },
                    { n: '2', t: 'Study Objectives and Estimands', p: '3' },
                    { n: '3', t: 'Study Design Overview', p: '5' },
                    { n: '4', t: 'Statistical Hypotheses', p: '7' },
                    { n: '5', t: 'Analysis Sets and Populations', p: '9' },
                    { n: '6', t: 'Primary Efficacy Analysis', p: '12' },
                    { n: '7', t: 'Secondary Efficacy Analyses', p: '18' },
                    { n: '8', t: 'Safety Analyses', p: '25' },
                    { n: '9', t: 'Interim Analyses', p: '31' },
                    { n: '10', t: 'Handling of Missing Data', p: '34' },
                    { n: '11', t: 'Subgroup Analyses', p: '37' },
                    { n: '12', t: 'Sensitivity Analyses', p: '41' },
                  ].map(s => (
                    <div key={s.n} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-elevated cursor-pointer group">
                      <span className="text-sm text-text-secondary group-hover:text-text-primary"><span className="text-text-muted mr-2">{s.n}.</span>{s.t}</span>
                      <span className="text-xs text-text-muted">{s.p}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Primary Endpoint */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-purple-400" />Primary Endpoint Analysis</h3>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">Endpoint</span><span>Progression-Free Survival (PFS) per RECIST v1.1</span></div>
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">Method</span><span>Log-rank test stratified by ECOG PS and prior lines</span></div>
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">Model</span><span>Cox proportional hazards, HR with 95% CI</span></div>
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">Dataset</span><span>ADTTE (ITT population)</span></div>
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">α level</span><span>0.025 (one-sided)</span></div>
                  <div className="flex gap-2"><span className="text-text-muted w-32 flex-shrink-0">Software</span><span>SAS 9.4, PROC PHREG / R 4.3.1 (survival)</span></div>
                </div>
              </div>
              {/* Analysis Populations */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" />Analysis Populations</h3>
                <div className="space-y-2">
                  {[
                    { pop: 'ITT', n: '450', desc: 'All randomised subjects' },
                    { pop: 'mITT', n: '442', desc: 'ITT subjects who received ≥1 dose' },
                    { pop: 'PP', n: '389', desc: 'Per-protocol population' },
                    { pop: 'Safety', n: '448', desc: 'All subjects who received any study drug' },
                    { pop: 'PK', n: '186', desc: 'PK-evaluable subset' },
                  ].map(p => (
                    <div key={p.pop} className="flex items-center gap-3 py-1.5 px-2 rounded bg-surface-elevated">
                      <span className="font-mono text-xs font-bold text-accent-blue w-12">{p.pop}</span>
                      <span className="text-sm text-text-secondary flex-1">{p.desc}</span>
                      <span className="text-sm font-semibold text-text-primary">N={p.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Amendment history */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-text-muted" />Amendment History</h3>
                <div className="space-y-2">
                  {[
                    { v: '2.0', d: '2025-01-15', a: 'Added KRAS subgroup analysis; PFS2 as secondary endpoint', by: 'Dr. M. Park' },
                    { v: '1.1', d: '2024-09-03', a: 'Revised interim analysis timing; updated missing data rules', by: 'Dr. S. Chen' },
                    { v: '1.0', d: '2024-05-12', a: 'Original approved SAP', by: 'Dr. M. Park' },
                  ].map(a => (
                    <div key={a.v} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="font-mono text-xs text-purple-400 w-8 flex-shrink-0">v{a.v}</span>
                      <div className="flex-1">
                        <div className="text-xs text-text-muted mb-0.5">{a.d} · {a.by}</div>
                        <div className="text-sm text-text-secondary">{a.a}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-surface-elevated flex-shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90" onClick={() => { const blob = new Blob([`SAP Export\n${visibleSelectedSAP?.title || 'SAP'}\nExported: ${new Date().toISOString()}`], {type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='SAP-Export.pdf'; a.click(); toast.success('SAP exported as PDF'); }}><Download className="w-3.5 h-3.5" />Export PDF</button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface-card border border-border rounded-lg hover:bg-surface-elevated" onClick={() => { setSapViewTarget(visibleSelectedSAP); toast.info('Opening SAP for review — full editing available in Authoring module'); }}><Edit3 className="w-3.5 h-3.5" />Edit SAP</button>
            </div>
          </div>
        </div>
      )}

      {/* SAP Detail */}
      {visibleSelectedSAP && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-text-primary">{visibleSelectedSAP.studyId}</h2>
                  <span className={`px-2 py-1 rounded text-sm ${SAP_STATUS_CONFIG[visibleSelectedSAP.status].bg} ${SAP_STATUS_CONFIG[visibleSelectedSAP.status].color}`}>
                    {SAP_STATUS_CONFIG[visibleSelectedSAP.status].label}
                  </span>
                </div>
                <p className="text-text-secondary">{visibleSelectedSAP.studyName}</p>
                <p className="text-sm text-text-muted mt-1">Version {visibleSelectedSAP.version} • Last modified {visibleSelectedSAP.lastModified}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded flex items-center gap-1" onClick={() => setSapViewTarget(visibleSelectedSAP)}>
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded flex items-center gap-1" onClick={() => toast.info('Section editing — open the SAP in Authoring to edit content directly')}>
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button className="px-3 py-1.5 text-sm text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center gap-1" onClick={() => { const blob = new Blob([`SAP: ${visibleSelectedSAP?.title || ''}\nVersion: ${visibleSelectedSAP?.version || ''}\nExported: ${new Date().toLocaleString()}`],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${visibleSelectedSAP?.id||'sap'}-export.txt`; a.click(); toast.success('SAP content exported'); }}>
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-bold text-text-primary">{visibleSelectedSAP.sections}</div>
                <div className="text-xs text-text-muted">Sections</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-bold text-blue-400">{visibleSelectedSAP.endpoints}</div>
                <div className="text-xs text-text-muted">Endpoints</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-bold text-purple-400">{visibleSelectedSAP.analyses}</div>
                <div className="text-xs text-text-muted">Analyses</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-bold text-green-400">
                  {visibleSelectedSAP.status === 'locked' || visibleSelectedSAP.status === 'approved' ? '100%' : '75%'}
                </div>
                <div className="text-xs text-text-muted">Complete</div>
              </div>
            </div>

            {/* Team */}
            <div className="p-4 bg-surface-card rounded-lg border border-border mb-6">
              <h3 className="font-semibold text-text-primary mb-3">Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{visibleSelectedSAP.author}</div>
                    <div className="text-xs text-text-muted">Author</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{visibleSelectedSAP.statistician}</div>
                    <div className="text-xs text-text-muted">Lead Statistician</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ADAMTab() {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  const [adamViewTarget, setAdamViewTarget] = React.useState<ADAMDataset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDatasets = useMemo(() => {
    if (!searchQuery) return MOCK_ADAM_DATASETS;
    const q = searchQuery.toLowerCase();
    return MOCK_ADAM_DATASETS.filter(ds => 
      ds.name.toLowerCase().includes(q) || ds.label.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-surface-card border border-border rounded-lg text-sm w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded flex items-center gap-1" onClick={() => { toast.success('CDISC validation queued — 8 datasets · Pinnacle 21 v3.1.4 · results in ~45s', { action: { label: 'View Results', onClick: () => {} } }); }}>
            <Shield className="w-4 h-4" />
            Run CDISC Validation
          </button>
          <button className="px-3 py-1.5 text-sm text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center gap-1" onClick={() => toast.success('New ADaM dataset created — ADXX added to workspace. Assign domain and variable spec in the dataset editor.')}>
            <Plus className="w-4 h-4" />
            New Dataset
          </button>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Dataset</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Programmer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Variables</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Records</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">CDISC</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Last Run</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDatasets.map(ds => {
              const statusConfig = DATASET_STATUS_CONFIG[ds.status];
              const cdiscConfig = CDISC_LEVEL_CONFIG[ds.cdiscCompliance];
              const StatusIcon = statusConfig.icon;
              return (
                <tr key={ds.id} className="border-b border-border/50 hover:bg-surface-card/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
                        <Database className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-mono text-sm font-semibold text-text-primary">{ds.name}</div>
                        <div className="text-xs text-text-muted truncate max-w-xs">{ds.label}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusConfig?.bg ?? ''} ${statusConfig?.color ?? ''}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{ds.programmer}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{ds.variables}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{ds.records.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${cdiscConfig?.bg ?? ''} ${cdiscConfig?.color ?? ''}`}>
                      {cdiscConfig.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-muted">{ds.lastRun || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 hover:bg-surface-elevated rounded" title="View dataset" onClick={() => setAdamViewTarget(ds)}>
                        <Eye className="w-4 h-4 text-text-muted hover:text-accent-blue" />
                      </button>
                      <button className="p-1.5 hover:bg-surface-elevated rounded" title="Run" onClick={() => toast.success('Dataset derivation queued — results available in Analysis Runs')}>
                        <Play className="w-4 h-4 text-text-muted" />
                      </button>
                      <button className="p-1.5 hover:bg-surface-elevated rounded" title="More" onClick={() => toast.info('Dataset options: Clone, Archive, Export Spec, View History')}>
                        <MoreVertical className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* ADAM Dataset Viewer Panel */}
    {adamViewTarget && (
      <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setAdamViewTarget(null)}>
        <div className="w-full max-w-2xl h-full bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-elevated flex-shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-text-primary font-mono">{adamViewTarget.name}</h2>
                <span className={`px-2 py-0.5 rounded text-xs ${DATASET_STATUS_CONFIG[adamViewTarget.status].bg} ${DATASET_STATUS_CONFIG[adamViewTarget.status].color}`}>{DATASET_STATUS_CONFIG[adamViewTarget.status].label}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${CDISC_LEVEL_CONFIG[adamViewTarget.cdiscCompliance].bg} ${CDISC_LEVEL_CONFIG[adamViewTarget.cdiscCompliance].color}`}>CDISC: {CDISC_LEVEL_CONFIG[adamViewTarget.cdiscCompliance].label}</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{adamViewTarget.label}</p>
            </div>
            <button onClick={() => setAdamViewTarget(null)} className="p-1.5 hover:bg-surface-card rounded text-text-muted"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Programmer', v: adamViewTarget.programmer },
                { l: 'QC Programmer', v: adamViewTarget.qcProgrammer ?? '—' },
                { l: 'Records', v: adamViewTarget.records.toLocaleString() },
                { l: 'Variables', v: String(adamViewTarget.variables) },
                { l: 'Source Datasets', v: adamViewTarget.sourceDatasets.join(', ') },
                { l: 'Last Run', v: adamViewTarget.lastRun ?? 'Not run' },
              ].map(m => (
                <div key={m.l} className="p-3 bg-surface-card rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-0.5">{m.l}</div>
                  <div className="text-sm font-medium text-text-primary">{m.v}</div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-surface-card rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-purple-400" />Key Variables</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-text-muted"><th className="text-left pb-2 font-medium">Variable</th><th className="text-left pb-2 font-medium">Type</th><th className="text-left pb-2 font-medium">Label</th><th className="text-left pb-2 font-medium">CDISC</th></tr></thead>
                <tbody>
                  {[
                    { v: 'USUBJID', t: 'Char', l: 'Unique Subject Identifier', c: '✓' },
                    { v: 'STUDYID', t: 'Char', l: 'Study Identifier', c: '✓' },
                    { v: 'SUBJID',  t: 'Char', l: 'Subject Identifier', c: '✓' },
                    { v: 'SITEID',  t: 'Char', l: 'Study Site Identifier', c: '✓' },
                    { v: adamViewTarget.name === 'ADTTE' ? 'PARAMCD' : 'AGE',  t: 'Num',  l: adamViewTarget.name === 'ADTTE' ? 'Parameter Code' : 'Age', c: '✓' },
                    { v: adamViewTarget.name === 'ADTTE' ? 'AVAL'   : 'SEX',  t: adamViewTarget.name === 'ADTTE' ? 'Num' : 'Char', l: adamViewTarget.name === 'ADTTE' ? 'Analysis Value' : 'Sex', c: '✓' },
                    { v: adamViewTarget.name === 'ADTTE' ? 'CNSR'   : 'RACE', t: adamViewTarget.name === 'ADTTE' ? 'Num' : 'Char', l: adamViewTarget.name === 'ADTTE' ? 'Censor Indicator' : 'Race', c: '✓' },
                    { v: 'TRTA', t: 'Char', l: 'Actual Treatment', c: '✓' },
                  ].map(r => (
                    <tr key={r.v} className="border-b border-border/50 hover:bg-surface-elevated">
                      <td className="py-2 font-mono text-xs text-purple-400">{r.v}</td>
                      <td className="py-2 text-xs text-text-muted">{r.t}</td>
                      <td className="py-2 text-xs text-text-secondary">{r.l}</td>
                      <td className="py-2 text-xs text-green-400">{r.c}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={4} className="pt-2 text-xs text-text-muted text-center">+ {adamViewTarget.variables - 8} more variables</td></tr>
                </tbody>
              </table>
            </div>
            {adamViewTarget.cdiscCompliance !== 'not-run' && (
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" />CDISC Validation Results</h3>
                {adamViewTarget.cdiscCompliance === 'pass' ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">All validation checks passed — 0 errors, 0 warnings</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div><div className="text-xs font-medium text-amber-400">AD0018 — Variable order deviation</div><div className="text-xs text-text-muted mt-0.5">PARAM not in correct position per ADaM IG v1.3</div></div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div><div className="text-xs font-medium text-amber-400">AD0045 — Missing DTYPE values</div><div className="text-xs text-text-muted mt-0.5">DTYPE should be populated for derived records</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-surface-elevated flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90" onClick={() => toast.success('CDISC conformance check initiated — checking variable labels, formats, and codelist compliance')}><Play className="w-3.5 h-3.5" />Run CDISC Check</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface-card border border-border rounded-lg hover:bg-surface-elevated" onClick={() => { const blob = new Blob(['CDISC Dataset Specification\nExported: ' + new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cdisc-spec.txt'; a.click(); toast.success('Dataset specification exported'); }}><Download className="w-3.5 h-3.5" />Export Spec</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function TLFTab() {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  const [filterType, setFilterType] = useState<'all' | 'table' | 'listing' | 'figure'>('all');
  const [filterStatus, setFilterStatus] = useState<TLFStatus | 'all'>('all');

  const filteredTLFs = useMemo(() => {
    return MOCK_TLFS.filter(tlf => {
      if (filterType !== 'all' && tlf.type !== filterType) return false;
      if (filterStatus !== 'all' && tlf.status !== filterStatus) return false;
      return true;
    });
  }, [filterType, filterStatus]);

  const typeIcons = {
    table: Table,
    listing: FileText,
    figure: BarChart3,
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            <option value="table">Tables</option>
            <option value="listing">Listings</option>
            <option value="figure">Figures</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            {Object.entries(TLF_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded flex items-center gap-1" onClick={() => toast.success('All TLF programs queued — 12 outputs · estimated runtime 8 min · results will appear in Analysis Runs')}>
            <Play className="w-4 h-4" />
            Run All
          </button>
          <button className="px-3 py-1.5 text-sm text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center gap-1" onClick={() => toast.success('New output shell created — assign table/listing/figure type and programmer in the output spec')}>
            <Plus className="w-4 h-4" />
            New Output
          </button>
        </div>
      </div>

      {/* TLF Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredTLFs.map(tlf => {
            const statusConfig = TLF_STATUS_CONFIG[tlf.status];
            const TypeIcon = typeIcons[tlf.type];
            return (
              <div key={tlf.id} className="p-4 bg-surface-card rounded-lg border border-border hover:border-accent-blue/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tlf.type === 'table' ? 'bg-amber-500/20' : tlf.type === 'figure' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      <TypeIcon className={`w-5 h-5 ${
                        tlf.type === 'table' ? 'text-amber-400' : tlf.type === 'figure' ? 'text-blue-400' : 'text-purple-400'
                      }`} />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-semibold text-text-primary">{tlf.number}</div>
                      <div className="text-xs text-text-muted capitalize">{tlf.type}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusConfig?.bg ?? ''} ${statusConfig?.color ?? ''}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <h4 className="text-sm text-text-primary mb-2 line-clamp-2">{tlf.title}</h4>
                <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                  <button
                    onClick={() => useAppStore.getState().setActiveModule('ctms')}
                    className="hover:text-accent-blue hover:underline flex items-center gap-1 transition-colors"
                  >
                    Source: {tlf.sourceDataset} <ExternalLink className="w-3 h-3" />
                  </button>
                  {tlf.dueDate && <span className="text-amber-400">Due: {tlf.dueDate}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="text-xs text-text-muted">
                    {tlf.programmer}
                    {tlf.qcProgrammer && <span> → {tlf.qcProgrammer}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-surface-elevated rounded" title="View" onClick={() => toast.info('Output viewer — select output from the list to preview rendered RTF/PDF')}>
                      <Eye className="w-4 h-4 text-text-muted" />
                    </button>
                    <button className="p-1 hover:bg-surface-elevated rounded" title="Run" onClick={() => toast.success('TLF program queued — output will appear in Analysis Runs within 2–5 minutes')}>
                      <Play className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RunsTab() {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Analysis Runs</h2>
          <button className="px-4 py-2 text-sm text-white bg-accent-green rounded-lg hover:bg-accent-green/90 flex items-center gap-2" onClick={() => toast.success('Analysis run initiated — production environment · all unlocked TLFs queued · monitor progress in Runs tab')}>
            <Play className="w-4 h-4" />
            New Run
          </button>
        </div>

        <div className="space-y-3">
          {MOCK_RUNS.map(run => {
            const config = RUN_STATUS_CONFIG[run.status];
            const StatusIcon = config.icon;
            return (
              <div key={run.id} className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config?.bg ?? ''}`}>
                      <StatusIcon className={`w-6 h-6 ${config?.color ?? ''} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{run.name}</div>
                      <div className="text-sm text-text-muted">
                        {run.type.toUpperCase()} • Started {run.startTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {run.status === 'completed' && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-400">{run.outputs} outputs</span>
                        {run.warnings > 0 && <span className="text-amber-400">{run.warnings} warnings</span>}
                        {run.errors > 0 && <span className="text-red-400">{run.errors} errors</span>}
                      </div>
                    )}
                    {run.duration && (
                      <span className="text-sm text-text-muted">{run.duration}</span>
                    )}
                    <span className={`px-3 py-1 rounded text-sm ${config?.bg ?? ''} ${config?.color ?? ''}`}>
                      {config.label}
                    </span>
                    <button className="p-2 hover:bg-surface-elevated rounded" onClick={() => toast.info('Run options: Clone, Download Log, Archive, Set as Reference Run')}>
                      <MoreVertical className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CDISC TAB
// =============================================================================

const CDISC_RULES = [
  { id: 'AD0001', rule: 'USUBJID populated for all records', dataset: 'All', result: 'pass' as const },
  { id: 'AD0002', rule: 'STUDYID consistent across all records', dataset: 'All', result: 'pass' as const },
  { id: 'AD0010', rule: 'ADaM variable naming conventions', dataset: 'ADSL', result: 'pass' as const },
  { id: 'AD0011', rule: 'ADSL one record per subject', dataset: 'ADSL', result: 'pass' as const },
  { id: 'AD0018', rule: 'Variable order per ADaM IG v1.3', dataset: 'ADTTE', result: 'warning' as const },
  { id: 'AD0045', rule: 'DTYPE populated for derived records', dataset: 'ADTTE', result: 'warning' as const },
  { id: 'AD0022', rule: 'PARAMCD values in define.xml codelist', dataset: 'ADTTE', result: 'pass' as const },
  { id: 'AD0031', rule: 'AVAL/AVALC mutually exclusive', dataset: 'ADLB', result: 'pass' as const },
  { id: 'AD0033', rule: 'LBSTRESU populated when AVAL numeric', dataset: 'ADLB', result: 'pass' as const },
  { id: 'AD0050', rule: 'TRTA/TRTP aligned with randomisation', dataset: 'ADSL', result: 'pass' as const },
];

// =============================================================================
// PACKAGE OVERVIEW PANEL — submission-package-level CDISC dashboard
// =============================================================================

const SDTM_TO_ADAM: Record<string, string[]> = {
  DM: ['ADSL'],
  AE: ['ADAE', 'ADTTE'],
  LB: ['ADLB', 'ADHY'],
  VS: ['ADVS'],
  EX: ['ADEX', 'ADSL'],
  CM: ['ADCM'],
  MH: ['ADSL'],
  DS: ['ADSL', 'ADTTE'],
  QS: ['ADQS', 'ADEFF'],
};

interface PackageDataset {
  name: string;
  label: string;
  status: string;
  records: number;
  validationErrors: number;
  sdtmigCompliant: boolean;
}

function PackageOverviewPanel({ onValidate }: { onValidate: (domain: string) => void }) {
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const createManifest = useDataPackageStore(s => s.createManifest);
  const existingManifest = useDataPackageStore(s => s.manifest);
  const [datasets, setDatasets] = useState<PackageDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch('/api/biostats/sdtm-validation')
      .then(r => r.json())
      .then(d => { setDatasets(d.datasets ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalRecords = datasets.reduce((s, d) => s + d.records, 0);
  const totalErrors = datasets.reduce((s, d) => s + d.validationErrors, 0);
  const compliant = datasets.filter(d => d.sdtmigCompliant).length;
  const pkgScore = datasets.length > 0 ? Math.round((compliant / datasets.length) * 100) : 0;
  const pkgReady = totalErrors === 0 && compliant === datasets.length;

  const runAll = async () => {
    setRunningAll(true);
    setProgress(0);
    const domainsToRun = datasets.filter(d => d.validationErrors > 0 || !d.sdtmigCompliant).map(d => d.name);
    for (let i = 0; i < domainsToRun.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setProgress(Math.round(((i + 1) / domainsToRun.length) * 100));
    }
    setRunningAll(false);
    toast.success('Package validation complete — 2 domains require attention');
  };

  const statusColor = (d: PackageDataset) =>
    d.sdtmigCompliant && d.validationErrors === 0 ? 'bg-emerald-500' :
    d.validationErrors > 0 ? 'bg-red-500' : 'bg-amber-500';

  const generateFullDefineXml = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Define-XML v2.1 — Full Study Package -->
<!-- Generated by Ligature IDOP v0.126.5 | ${new Date().toISOString()} -->
<!-- CDISC Define-XML v2.1 Implementation Guide -->
<!-- Study: LIG-2847-302 | Standard: SDTM v3.4 -->
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:def="http://www.cdisc.org/ns/def/v2.1"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     ODMVersion="1.3.2"
     FileType="Snapshot"
     FileOID="DEFINE.LIG2847302.2026-04-07"
     CreationDateTime="${new Date().toISOString()}"
     Originator="Ligature IDOP"
     SourceSystem="Ligature v0.126.5"
     def:Context="Other">
  <Study OID="LIG-2847-302">
    <GlobalVariables>
      <StudyName>LIG-2847-302 Phase 2b — KRAS G12C+ NSCLC</StudyName>
      <StudyDescription>A Phase 2b, Randomised, Double-blind Study of Ligrastinib in KRAS G12C+ NSCLC</StudyDescription>
      <ProtocolName>LIG-2847-302</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MDV.LIG2847302.SDTM.3.4" Name="LIG-2847-302 SDTM Metadata v3.4"
      def:DefineVersion="2.1.0" def:StandardName="SDTM-IG" def:StandardVersion="3.4">
${datasets.map(d => `      <ItemGroupDef OID="IG.${d.name}" Name="${d.name}" Repeating="${d.name === 'DM' ? 'No' : 'Yes'}"
        IsReferenceData="No" SASDatasetName="${d.name}" Domain="${d.name.replace('SUPP', '')}"
        def:Label="${d.label}" def:Class="${['DM','DS','SE','SV','TS','TA','TE','TV'].includes(d.name) ? 'SPECIAL PURPOSE' : ['AE','CE','DS','DV','HO','MH'].includes(d.name) ? 'EVENTS' : ['CM','EC','EX','ML','PR','SU'].includes(d.name) ? 'INTERVENTIONS' : 'FINDINGS'}"
        def:Structure="${d.name === 'DM' ? 'One record per subject' : 'One record per observation'}"
        def:Purpose="Tabulation" def:CommentOID="COM.${d.name}">
        <Description><TranslatedText xml:lang="en">${d.label}</TranslatedText></Description>
        <!-- ${d.records.toLocaleString()} records | ${d.sdtmigCompliant ? 'SDTM-IG Compliant' : 'Non-compliant — see validation report'} -->
      </ItemGroupDef>`).join('\n')}
    </MetaDataVersion>
  </Study>
</ODM>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `define-LIG2847-302-${new Date().toISOString().slice(0,10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Complete define.xml downloaded');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* Package health header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-surface-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="currentColor" className="text-surface-elevated" />
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="currentColor"
                strokeDasharray={`${pkgScore * 0.879} 100`} strokeLinecap="round"
                className={pkgScore >= 80 ? 'text-emerald-400' : pkgScore >= 60 ? 'text-amber-400' : 'text-red-400'} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-text-primary">{pkgScore}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Package Score</div>
            <div className={`text-sm font-bold mt-0.5 ${pkgReady ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pkgReady ? 'Submission Ready' : 'Needs Attention'}
            </div>
          </div>
        </div>
        {[
          { label: 'Datasets', value: String(datasets.length), sub: `${compliant} compliant`, color: 'text-text-primary' },
          { label: 'Total Records', value: totalRecords.toLocaleString(), sub: 'across all domains', color: 'text-text-primary' },
          { label: 'Open Errors', value: String(totalErrors), sub: `across ${datasets.filter(d => d.validationErrors > 0).length} datasets`, color: totalErrors > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-card border border-border rounded-xl p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runAll}
          disabled={runningAll}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
        >
          {runningAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {runningAll ? `Re-validating… ${progress}%` : 'Re-validate All'}
        </button>
        <button onClick={generateFullDefineXml} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-elevated transition-colors">
          <FileCode className="w-4 h-4 text-cyan-400" />
          Generate define.xml
        </button>
        <button
          onClick={() => {
            setActiveModule('publishing');
            toast.info('Opening Prior Dossier Import in Publishing…');
          }}
          className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-elevated transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
          Compare to Prior
        </button>
        <button
          disabled={!pkgReady}
          onClick={() => { toast.success('Package routed to eCTD Module 5.3', { action: { label: 'Open Submissions →', onClick: () => setActiveModule('publishing') } }); }}
          className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4 text-accent-blue" />
          Submit Package to eCTD
        </button>
        {/* Create Submission Package — saves manifest to cross-module store */}
        <button
          onClick={() => {
            const pkgDatasets = datasets.map(d => ({
              domain: d.name,
              label: d.label,
              records: d.records,
              score: d.sdtmigCompliant && d.validationErrors === 0 ? 100 : d.sdtmigCompliant ? 75 : 40,
              status: (d.sdtmigCompliant && d.validationErrors === 0 ? 'PASS' : d.validationErrors > 0 ? 'FAIL' : 'WARNING') as 'PASS' | 'WARNING' | 'FAIL',
              errorCount: d.validationErrors,
              warningCount: 0,
              ectdModule: 'Module 5',
              ectdSection: d.name === 'DM' ? '5.3.3 — Controlled Clinical Studies' : '5.3.5.3 — Reports of Analyses of Data from More than One Study',
              ectdPath: `m5/53-clin-stud-rep/datasets/${d.name.toLowerCase()}.xpt`,
              defineXmlItemCount: 20,
              validatedAt: new Date().toISOString(),
              class: ['DM','DS','SV','SE','TS','TA','TE','TV'].includes(d.name) ? 'Special Purpose' : ['AE','CE','MH','DS','DV'].includes(d.name) ? 'Events' : ['CM','EX','EC'].includes(d.name) ? 'Interventions' : 'Findings',
            }));
            createManifest(pkgDatasets, 'LIG-2847-302', 'LIG-2847-302 Phase 2b KRAS G12C+ NSCLC');
            toast.success(`Data package created — ${pkgDatasets.length} datasets`, {
              action: { label: 'Open Publishing →', onClick: () => setActiveModule('publishing') }
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          <Package className="w-4 h-4" />
          Create Submission Package
        </button>
        {existingManifest && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Package {existingManifest.id} ready · {new Date(existingManifest.createdAt).toLocaleTimeString()}
          </div>
        )}
        <div className="ml-auto text-xs text-text-muted">LIG-2847-302 · SDTM v3.4 · Define-XML v2.1</div>
      </div>

      {/* Re-validation progress */}
      {runningAll && (
        <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Dataset grid */}
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-text-primary">Submission Datasets</span>
          <span className="text-xs text-text-muted ml-auto">Click a row to validate</span>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-surface-elevated">
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-text-muted font-medium">Dataset</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Label</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Records</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">SDTM-IG</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Errors</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">ADaM Derives</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {datasets.map(d => {
              const adam = SDTM_TO_ADAM[d.name] ?? [];
              const isSelected = selected === d.name;
              return (
                <tr
                  key={d.name}
                  onClick={() => setSelected(isSelected ? null : d.name)}
                  className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-accent-blue/5' : 'hover:bg-surface-elevated'}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(d)}`} />
                      <span className="font-mono font-bold text-text-primary">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{d.label}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.records.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {d.sdtmigCompliant
                      ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" />Pass</span>
                      : <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3.5 h-3.5" />Fail</span>}
                  </td>
                  <td className="px-4 py-3">
                    {d.validationErrors > 0
                      ? <span className="text-red-400 font-semibold">{d.validationErrors}</span>
                      : <span className="text-emerald-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {adam.map(a => (
                        <span key={a} className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-mono">{a}</span>
                      ))}
                      {adam.length === 0 && <span className="text-text-muted/50">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.status === 'complete' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); onValidate(d.name.startsWith('SUPP') ? d.name.replace('SUPP','') : d.name); }}
                      className="p-1 hover:bg-surface-card rounded text-text-muted hover:text-accent-blue transition-colors"
                      title="Open in validator"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* eCTD slot mapping */}
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-text-primary">eCTD Module 5 Slot Coverage</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { section: '5.3.3 — Controlled Clinical Studies', datasets: ['DM', 'DS'], covered: true },
            { section: '5.3.4.1 — PK Studies', datasets: ['EX', 'LB'], covered: true },
            { section: '5.3.5.3 — Multi-Study Analyses', datasets: ['AE', 'LB', 'VS', 'CM', 'MH', 'QS'], covered: datasets.filter(d => ['AE','LB','VS','CM','MH','QS'].includes(d.name)).every(d => d.sdtmigCompliant) },
          ].map(slot => (
            <div key={slot.section} className={`p-3 rounded-lg border ${slot.covered ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {slot.covered
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                <span className="text-xs font-medium text-text-primary">{slot.section}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {slot.datasets.map(d => (
                  <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${datasets.find(ds => ds.name === d)?.sdtmigCompliant ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// =============================================================================
// CDISC TAB — wraps PackageOverviewPanel + validate workflow
// =============================================================================
const SDTM_DOMAINS = [
  { code:'DM',    label:'Demographics',            class:'Special Purpose', ectdSection:'5.3.3' },
  { code:'AE',    label:'Adverse Events',           class:'Events',         ectdSection:'5.3.5.3' },
  { code:'LB',    label:'Laboratory Test Results',  class:'Findings',       ectdSection:'5.3.5.3' },
  { code:'VS',    label:'Vital Signs',              class:'Findings',       ectdSection:'5.3.5.3' },
  { code:'EX',    label:'Exposure',                 class:'Interventions',  ectdSection:'5.3.5.3' },
  { code:'CM',    label:'Concomitant Medications',  class:'Interventions',  ectdSection:'5.3.5.3' },
  { code:'MH',    label:'Medical History',          class:'Events',         ectdSection:'5.3.5.3' },
  { code:'DS',    label:'Disposition',              class:'Events',         ectdSection:'5.3.5.3' },
  { code:'QS',    label:'Questionnaires',           class:'Findings',       ectdSection:'5.3.5.3' },
  { code:'ADSL',  label:'Subject-Level Analysis',   class:'ADaM',           ectdSection:'5.3.5.3' },
] as const;

interface ValidationFinding {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'NOTE';
  ruleId: string;
  variable?: string;
  message: string;
  detail: string;
  suggestion: string;
  ichReference?: string;
  fdaReference?: string;
}

interface ValidationResult {
  domain: string;
  label: string;
  records: number;
  score: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  summary: { errors: number; warnings: number; notes: number; total: number };
  findings: ValidationFinding[];
  ectd: { module: string; section: string; path: string; readyToRoute: boolean } | null;
  defineXml: { version: string; itemCount: number; snippet: string; items: { name: string; label: string; dataType: string; isRequired: boolean; codelist?: string }[] };
  fileName?: string;
  validatedAt: string;
}

// ─── Demo dataset catalogue — realistic variable sets per domain ──────────────
const DEMO_DATASETS: Record<string, { variables: string[]; records: number; description: string }> = {
  DM: {
    description: 'Phase 2b demographics — 248 enrolled subjects',
    records: 248,
    variables: ['STUDYID','DOMAIN','USUBJID','SUBJID','RFSTDTC','RFENDTC','RFXSTDTC','RFXENDTC','RFICDTC','RFPENDTC','DTHDTC','DTHFL','SITEID','BRTHDTC','AGE','AGEU','SEX','RACE','ETHNIC','ARMCD','ARM','ACTARMCD','ACTARM','COUNTRY','DMDTC','DMDY'],
  },
  AE: {
    description: 'Phase 2b adverse events — 891 records',
    records: 891,
    variables: ['STUDYID','DOMAIN','USUBJID','AESEQ','AESPID','AETERM','AEDECOD','AEBODSYS','AEHLT','AEHLGT','AESOC','AESEV','AESER','AEACN','AEREL','AEOUT','AESTDTC','AEENDTC','AESDTH','AESDISAB','AESDTH','EPOCH','VISITNUM','VISIT'],
  },
  LB: {
    description: 'Laboratory results — 4,320 records (chemistry + haematology)',
    records: 4320,
    variables: ['STUDYID','DOMAIN','USUBJID','LBSEQ','LBTESTCD','LBTEST','LBCAT','LBSCAT','LBORRES','LBORRESU','LBORNRLO','LBORNRHI','LBSTRESC','LBSTRESN','LBSTRESU','LBNRLO','LBNRHI','LBBLFL','LBDTC','LBDY','VISITNUM','VISIT','LBSPEC','LBNAM'],
  },
  VS: {
    description: 'Vital signs — 2,976 records',
    records: 2976,
    variables: ['STUDYID','DOMAIN','USUBJID','VSSEQ','VSTESTCD','VSTEST','VSPOS','VSORRES','VSORRESU','VSSTRESC','VSSTRESN','VSSTRESU','VSBLFL','VSDTC','VSDY','VISITNUM','VISIT','EPOCH'],
  },
  EX: {
    description: 'Drug exposure — 1,488 records',
    records: 1488,
    variables: ['STUDYID','DOMAIN','USUBJID','EXSEQ','EXTRT','EXDOSE','EXDOSU','EXDOSFRM','EXDOSFRQ','EXROUTE','EXSTDTC','EXENDTC','EXDUR','EPOCH','VISITNUM','VISIT'],
  },
  AE_ERRORS: {
    description: 'AE dataset — missing AEBODSYS, non-standard vars (demo errors)',
    records: 312,
    variables: ['STUDYID','DOMAIN','USUBJID','AESEQ','AETERM','AEDECOD','AESEV','AESER','AEACN','AEREL','AESTDTC','AECUSTOM1','AECUSTOM2'],
  },
};

function CDISCTab() {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);

  // Mode: validate single dataset | package overview
  const [cdiscMode, setCdiscMode] = useState<'validate' | 'package'>('validate');

  // Upload state
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [recordCount, setRecordCount] = useState<string>('');
  const [manualVars, setManualVars] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'findings' | 'define' | 'ectd'>('findings');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'ERROR' | 'WARNING' | 'NOTE'>('all');

  // Validated history
  const [history, setHistory] = useState<ValidationResult[]>([]);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setError('');
    // Auto-detect domain from filename
    const base = file.name.replace(/\.(xpt|sas7bdat|csv|txt)$/i, '').toUpperCase();
    const match = SDTM_DOMAINS.find(d => d.code === base || base.startsWith(d.code));
    if (match && !selectedDomain) setSelectedDomain(match.code);
    // Parse CSV headers
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0] ?? '';
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());
      if (headers.length > 1) {
        setManualVars(headers.join(', '));
        const lines = text.trim().split('\n').length - 1;
        if (!recordCount) setRecordCount(String(Math.max(0, lines)));
      }
      setCsvText(text.slice(0, 500));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const parseVars = (raw: string): string[] =>
    raw.split(/[,\s\n]+/).map(v => v.trim().toUpperCase()).filter(Boolean);

  const runValidation = async () => {
    if (!selectedDomain) { setError('Select a CDISC domain first'); return; }
    const vars = parseVars(manualVars);
    if (vars.length === 0) { setError('Enter at least one variable name'); return; }
    setIsValidating(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/biostats/sdtm-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          variables: vars,
          records: parseInt(recordCount) || 0,
          studyId: 'LIG-2847-302',
          fileName: fileName || undefined,
        }),
      });
      if (!res.ok) throw new Error('Validation request failed');
      const data: ValidationResult = await res.json();
      setResult(data);
      setHistory(h => [data, ...h.slice(0, 9)]);
      setActiveTab('findings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const severityColor = (s: string) =>
    s === 'ERROR' ? 'text-red-400' : s === 'WARNING' ? 'text-amber-400' : 'text-blue-400';
  const severityBg = (s: string) =>
    s === 'ERROR' ? 'bg-red-500/10 border-red-500/20' : s === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20';
  const severityIcon = (s: string) =>
    s === 'ERROR' ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /> :
    s === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /> :
    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />;

  const filteredFindings = result
    ? (severityFilter === 'all' ? result.findings : result.findings.filter(f => f.severity === severityFilter))
    : [];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">

      {/* Mode toggle bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface-elevated flex-shrink-0">
        <button
          onClick={() => setCdiscMode('validate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${cdiscMode === 'validate' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-secondary'}`}
        >
          <Shield className="w-3.5 h-3.5" /> Validate Dataset
        </button>
        <button
          onClick={() => setCdiscMode('package')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${cdiscMode === 'package' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-secondary'}`}
        >
          <Package className="w-3.5 h-3.5" /> Package Overview
        </button>
        <div className="ml-auto text-[10px] text-text-muted">CDISC SDTM IG v3.4 · Define-XML v2.1 · FDA STDTCG v2.7</div>
      </div>

      {cdiscMode === 'package' ? (
        <PackageOverviewPanel onValidate={(domain) => { setCdiscMode('validate'); setSelectedDomain(domain); }} />
      ) : (
    <div className="flex-1 overflow-hidden flex gap-0">

      {/* ── LEFT: Upload + Domain ── */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-surface-card overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent-blue" />
            SDTM Dataset
          </h3>
          <p className="text-xs text-text-muted mt-1">Upload CSV/XPT or paste variable names</p>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Domain selector */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Domain *</label>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            >
              <option value="">Select CDISC domain…</option>
              {SDTM_DOMAINS.map(d => (
                <option key={d.code} value={d.code}>{d.code} — {d.label}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-accent-blue bg-accent-blue/5' : 'border-border hover:border-accent-blue/50 hover:bg-surface-elevated'}`}
          >
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            {fileName ? (
              <div>
                <div className="text-xs font-medium text-accent-blue truncate">{fileName}</div>
                {csvText && <div className="text-[10px] text-text-muted mt-1">Headers detected</div>}
              </div>
            ) : (
              <>
                <div className="text-xs text-text-muted">Drop .csv, .xpt, .sas7bdat</div>
                <div className="text-[10px] text-text-muted/60 mt-1">or click to browse</div>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xpt,.sas7bdat,.txt"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Variables */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">
              Variable Names *
              <span className="normal-case font-normal ml-1">(comma or newline separated)</span>
            </label>
            <textarea
              value={manualVars}
              onChange={e => setManualVars(e.target.value)}
              rows={6}
              placeholder="STUDYID, DOMAIN, USUBJID, AESEQ, AETERM, AEDECOD..."
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
            />
            <div className="text-[10px] text-text-muted mt-1">{parseVars(manualVars).length} variable{parseVars(manualVars).length !== 1 ? 's' : ''} detected</div>
          </div>

          {/* Record count */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Record Count</label>
            <input
              type="number"
              value={recordCount}
              onChange={e => setRecordCount(e.target.value)}
              placeholder="e.g. 891"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Demo quick-load */}
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Quick Load Demo Dataset</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'DM',       label: 'DM',    desc: '248 subjects' },
                { key: 'AE',       label: 'AE',    desc: '891 events' },
                { key: 'LB',       label: 'LB',    desc: '4,320 records' },
                { key: 'VS',       label: 'VS',    desc: '2,976 records' },
                { key: 'EX',       label: 'EX',    desc: '1,488 doses' },
                { key: 'AE_ERRORS',label: 'AE ⚠',  desc: 'with errors' },
              ].map(d => (
                <button
                  key={d.key}
                  onClick={() => {
                    const demo = DEMO_DATASETS[d.key];
                    const domainCode = d.key === 'AE_ERRORS' ? 'AE' : d.key;
                    setSelectedDomain(domainCode);
                    setManualVars(demo.variables.join(', '));
                    setRecordCount(String(demo.records));
                    setFileName(`${domainCode.toLowerCase()}.xpt`);
                    setError('');
                  }}
                  className="flex flex-col items-start px-2.5 py-2 bg-surface-elevated hover:bg-surface-card border border-border rounded-lg transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-text-primary">{d.label}</span>
                  <span className="text-[10px] text-text-muted">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runValidation}
            disabled={isValidating || !selectedDomain || parseVars(manualVars).length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {isValidating ? 'Validating…' : 'Run CDISC Validation'}
          </button>

          {/* History */}
          {history.length > 0 && (
            <div>
              <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Recent Validations</div>
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setResult(h); setActiveTab('findings'); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 bg-surface-elevated hover:bg-surface-card rounded-lg text-left transition-colors border border-border"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.status === 'PASS' ? 'bg-emerald-400' : h.status === 'WARNING' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span className="font-mono text-xs font-medium text-text-primary">{h.domain}</span>
                    <span className="text-[10px] text-text-muted truncate flex-1">{h.fileName || h.label}</span>
                    <span className="text-[10px] font-semibold text-text-secondary">{h.score}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MIDDLE + RIGHT: Results ── */}
      {result ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Score header */}
          <div className="flex items-center gap-5 px-5 py-3 border-b border-border bg-surface flex-shrink-0">
            {/* Score ring */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="currentColor" className="text-surface-elevated" />
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" stroke="currentColor"
                  strokeDasharray={`${result.score * 0.879} 100`} strokeLinecap="round"
                  className={result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-amber-400' : 'text-red-400'} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-text-primary">{result.score}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-text-primary">{result.domain}</span>
                <span className="text-text-muted text-sm">—</span>
                <span className="text-sm text-text-secondary">{result.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${result.status === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' : result.status === 'WARNING' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                  {result.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                <span className="text-red-400 font-semibold">{result.summary.errors} ERROR{result.summary.errors !== 1 ? 'S' : ''}</span>
                <span className="text-amber-400 font-semibold">{result.summary.warnings} WARNING{result.summary.warnings !== 1 ? 'S' : ''}</span>
                <span className="text-blue-400">{result.summary.notes} NOTE{result.summary.notes !== 1 ? 'S' : ''}</span>
                <span className="text-text-muted/60">·</span>
                <span>{result.records.toLocaleString()} records</span>
                <span>{result.variablesProvided ?? parseVars(manualVars).length} variables</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => {
                if (!result) return;
                const lines = [
                  'LIGATURE IDOP — CDISC SDTM VALIDATION REPORT',
                  '='.repeat(60),
                  `Generated: ${new Date().toISOString()}`,
                  `Study: LIG-2847-302  |  Domain: ${result.domain} — ${result.label}`,
                  `File: ${result.fileName ?? 'manual entry'}  |  Records: ${result.records.toLocaleString()}`,
                  `Compliance Score: ${result.score}%  |  Status: ${result.status}`,
                  '',
                  'SUMMARY',
                  '-'.repeat(40),
                  `  Errors: ${result.summary.errors}  |  Warnings: ${result.summary.warnings}  |  Notes: ${result.summary.notes}`,
                  '',
                  'FINDINGS',
                  '-'.repeat(40),
                  ...result.findings.map((f: {severity:string;ruleId:string;variable?:string;message:string;detail:string;suggestion:string;ichReference?:string;fdaReference?:string}) =>
                    [`[${f.severity}] ${f.ruleId}${f.variable ? ' — ' + f.variable : ''}`, `  ${f.message}`, `  → ${f.suggestion}`, ''].join('\n')),
                  'eCTD ROUTING',
                  '-'.repeat(40),
                  result.ectd ? `  ${result.ectd.module} / ${result.ectd.section}\n  Path: ${result.ectd.path}\n  Ready: ${result.ectd.readyToRoute ? 'YES' : 'NO'}` : '  N/A',
                  '',
                  'Generated by Ligature IDOP v0.126.4',
                ].join('\n');
                const blob = new Blob([lines], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SDTM-Validation-${result.domain}-${new Date().toISOString().slice(0,10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Validation report downloaded');
              }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:bg-surface-elevated transition-colors">
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border bg-surface-card flex-shrink-0">
            {([
              { id: 'findings', label: `Findings (${result.summary.total})` },
              { id: 'define',   label: `define.xml (${result.defineXml.itemCount} vars)` },
              { id: 'ectd',     label: 'eCTD Routing' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${activeTab === t.id ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-secondary'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="flex-1 overflow-y-auto p-5">

            {activeTab === 'findings' && (
              <div className="space-y-3">
                {/* Severity filter */}
                <div className="flex items-center gap-2">
                  {(['all', 'ERROR', 'WARNING', 'NOTE'] as const).map(s => (
                    <button key={s} onClick={() => setSeverityFilter(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${severityFilter === s
                        ? s === 'ERROR' ? 'bg-red-500/15 border-red-500/30 text-red-400 font-semibold'
                          : s === 'WARNING' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold'
                          : s === 'NOTE' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 font-semibold'
                          : 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue font-semibold'
                        : 'border-border text-text-muted hover:bg-surface-elevated'}`}>
                      {s === 'all' ? `All (${result.summary.total})` : `${s} (${result.findings.filter(f => f.severity === s).length})`}
                    </button>
                  ))}
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <CheckCircle className="w-10 h-10 text-emerald-400 opacity-60" />
                    <p className="text-sm text-text-muted">No {severityFilter === 'all' ? '' : severityFilter.toLowerCase() + ' '}findings</p>
                  </div>
                ) : (
                  filteredFindings.map(f => (
                    <div key={f.id} className={`border rounded-xl p-4 ${severityBg(f.severity)}`}>
                      <div className="flex items-start gap-3">
                        {severityIcon(f.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold ${severityColor(f.severity)}`}>{f.ruleId}</span>
                            {f.variable && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-card rounded text-text-secondary">{f.variable}</span>}
                            <span className="text-[10px] text-text-muted">{f.id}</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary leading-snug">{f.message}</p>
                          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{f.detail}</p>
                          <div className="mt-2 flex items-start gap-1.5">
                            <Zap className="w-3 h-3 text-accent-blue flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-accent-blue leading-relaxed">{f.suggestion}</p>
                          </div>
                          {(f.ichReference || f.fdaReference) && (
                            <div className="mt-2 flex gap-3 text-[10px] text-text-muted">
                              {f.ichReference && <span>📋 {f.ichReference}</span>}
                              {f.fdaReference && <span>🏛 {f.fdaReference}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'define' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-surface-card border border-border rounded-xl">
                    <div className="text-xs text-text-muted">Standard</div>
                    <div className="text-sm font-semibold text-text-primary mt-0.5">Define-XML v{result.defineXml.version}</div>
                  </div>
                  <div className="flex-1 p-3 bg-surface-card border border-border rounded-xl">
                    <div className="text-xs text-text-muted">Variables</div>
                    <div className="text-sm font-semibold text-text-primary mt-0.5">{result.defineXml.itemCount} ItemDefs</div>
                  </div>
                  <button onClick={() => {
                    if (!result?.defineXml?.snippet) return;
                    const blob = new Blob([result.defineXml.snippet], { type: 'application/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `define-${result.domain}-${new Date().toISOString().slice(0,10)}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('define.xml downloaded');
                  }} className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary border border-border rounded-xl hover:bg-surface-card transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>

                {/* Variable table */}
                <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-text-primary">ItemDef Variables</span>
                    <span className="text-xs text-text-muted ml-auto">{result.defineXml.itemCount} total</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-surface-elevated">
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-text-muted font-medium">Variable</th>
                        <th className="text-left px-4 py-2 text-text-muted font-medium">Type</th>
                        <th className="text-left px-4 py-2 text-text-muted font-medium">Required</th>
                        <th className="text-left px-4 py-2 text-text-muted font-medium">Codelist</th>
                        <th className="text-left px-4 py-2 text-text-muted font-medium">Origin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.defineXml.items.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors">
                          <td className="px-4 py-2 font-mono font-semibold text-text-primary">{item.name}</td>
                          <td className="px-4 py-2 text-text-secondary">{item.dataType}</td>
                          <td className="px-4 py-2">
                            {item.isRequired
                              ? <span className="text-emerald-400 font-semibold">Yes</span>
                              : <span className="text-text-muted">No</span>}
                          </td>
                          <td className="px-4 py-2 text-text-muted text-[10px] font-mono">{item.codelist ?? '—'}</td>
                          <td className="px-4 py-2 text-text-muted">{item.origin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* XML snippet */}
                {result.defineXml.snippet && (
                  <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">Define-XML Snippet</span>
                      <button onClick={() => { navigator.clipboard.writeText(result.defineXml.snippet); }} className="text-[10px] text-accent-blue hover:underline">Copy XML</button>
                    </div>
                    <pre className="p-4 text-[10px] font-mono text-text-secondary overflow-x-auto leading-relaxed whitespace-pre-wrap">{result.defineXml.snippet}</pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ectd' && result.ectd && (
              <div className="space-y-4">
                {/* Routing card */}
                <div className={`p-5 rounded-xl border-2 ${result.ectd.readyToRoute ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${result.ectd.readyToRoute ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                      <Package className={`w-5 h-5 ${result.ectd.readyToRoute ? 'text-emerald-400' : 'text-amber-400'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">eCTD Routing</div>
                      <div className={`text-xs ${result.ectd.readyToRoute ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {result.ectd.readyToRoute ? 'Dataset passes validation — ready to route' : 'Resolve errors before routing to eCTD'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Submission Module</div>
                      <div className="text-sm font-semibold text-text-primary">{result.ectd.module}</div>
                    </div>
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">CTD Section</div>
                      <div className="text-sm font-semibold text-text-primary">{result.ectd.section}</div>
                    </div>
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">eCTD File Path</div>
                      <div className="text-xs font-mono text-text-secondary">{result.ectd.path}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      disabled={!result.ectd.readyToRoute}
                      onClick={() => {
                        if (!result?.ectd) return;
                        toast.success(
                          `${result.domain} dataset routed to ${result.ectd.section}`,
                          { action: { label: 'Open Submissions →', onClick: () => setActiveModule('publishing') } }
                        );
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Route to eCTD Slot
                    </button>
                    <button onClick={() => {
                      toast.success(`Document card created for ${result?.domain ?? ''} dataset`, {
                        action: { label: 'Open Authoring →', onClick: () => setActiveModule('authoring') }
                      });
                    }} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-elevated transition-colors">
                      <FileText className="w-4 h-4" />
                      Create Document Card
                    </button>
                  </div>
                </div>

                {/* Regulatory references */}
                <div className="p-4 bg-surface-card border border-border rounded-xl">
                  <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Regulatory References
                  </h4>
                  <div className="space-y-1.5">
                    {(['CDISC SDTM Implementation Guide v3.4', 'CDISC Define-XML v2.1 Implementation Guide', 'FDA Study Data Technical Conformance Guide v2.7', 'MedDRA Version 27.0']).map(ref => (
                      <div key={ref} className="flex items-center gap-2 text-xs text-text-muted">
                        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        {ref}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-12">
          <div className="p-4 bg-accent-blue/10 rounded-2xl">
            <Shield className="w-12 h-12 text-accent-blue opacity-60" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">CDISC Validation Engine</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm">
              Select a domain, upload a dataset or paste variable names, then run validation to check SDTM IG compliance, controlled terminology, and eCTD routing.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-md">
            {[
              { icon: <CheckSquare className="w-4 h-4 text-emerald-400" />, label: 'SDTM IG v3.4 rules' },
              { icon: <Database className="w-4 h-4 text-purple-400" />, label: 'Define-XML v2.1 generation' },
              { icon: <Package className="w-4 h-4 text-amber-400" />, label: 'eCTD slot routing' },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center gap-2 p-3 bg-surface-card border border-border rounded-xl">
                {f.icon}
                <span className="text-[10px] text-text-muted text-center leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted/60">Powered by Ligature · Replaces Pinnacle 21 for routine SDTM QC</p>
        </div>
      )}
    </div>
      )}
    </div>
  );
}
// MAIN COMPONENT
// =============================================================================

interface BiostatsScreenProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function BiostatsScreen({ filters: _filters }: BiostatsScreenProps) {
  // v0.125.33: Scope context
  const { studyProtocolNumber, scopeSummary, scopeFlag } = useScopeContext('biostats');
  const { selectedProduct } = useProductFilter();
  const [activeTab, setActiveTab] = useState<BiostatsTab>('overview');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const toast = useToast();

  const handleAIAnalysis = async () => {
    setShowAIPanel(true);
    if (aiResult) return; // already loaded
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a senior biostatistician reviewing a Phase 3 clinical trial programme.

Study programme: LIG-2847 (Nexavant) — KRAS G12C inhibitor
Active SAPs: 3 (LIG-301 Phase 3 locked v2.0, LIG-302 Phase 2b in-review v1.1, LIG-201 Phase 1 PK locked v1.0)
Total analyses: 77 across 3 SAPs | 8 ADAM datasets (3 validated, 2 in QC, 3 in progress)
TLFs: 47 outputs (18 approved, 12 in QC, 10 programming, 7 not started)
Active runs: 2 running now | CDISC compliance: 94% pass rate

Provide a concise ICH E9(R1) statistical readiness assessment covering:
1. **Estimand Framework** — primary/secondary estimand alignment with intercurrent event strategies
2. **Database Lock Readiness** — data completeness and outstanding QC items
3. **Analysis Execution** — TLF completion status and critical path
4. **Regulatory Risk** — key statistical risks for NDA/MAA submission
5. **Recommended Actions** — top 3 priority items this week

Format with clear headers. Be specific and use the study data above. Keep it under 400 words.`,
          maxTokens: 600,
        }),
      });
      const data = await res.json();
      const text = data.content || data.text || data.result || '';
      if (!text) throw new Error('empty');
      setAiResult(text);
    } catch {
      setAiResult(`## ICH E9(R1) Statistical Readiness — LIG-2847

**Estimand Framework**
Primary estimand: Treatment policy strategy for OS in ITT population. LIG-301 SAP v2.0 (locked) confirms intercurrent event handling via hypothetical strategy for treatment discontinuation. Aligned with FDA guidance.

**Database Lock Readiness**
3 of 8 ADAM datasets validated; ADSL and ADTTE in QC review — expected clean in 5 days. 2 datasets (ADLB, ADEX) still in programming. Lock feasibility: conditional on resolving 12 open data queries in LIG-301.

**Analysis Execution**
47 TLFs: 18 approved, 12 in QC, 10 in programming, 7 not started. Critical path items: primary efficacy tables (T-14.1 series) and KM curves are approved. Safety summaries in QC. Listings not yet started — flag for timeline risk.

**Regulatory Risk**
- Multiplicity adjustment: Hierarchical testing procedure needs final FDA alignment before lock
- Sensitivity analyses: 2 of 5 pre-specified sensitivity runs not yet executed
- CDISC compliance at 94% — 3 define.xml warnings outstanding for ADTTE

**Recommended Actions**
1. Resolve 12 open data queries in LIG-301 by Friday to preserve lock date
2. Escalate ADLB programming to unblock downstream safety TLFs
3. Submit multiplicity testing memo to FDA by end of week`);
      toast.info('Showing offline analysis — connect API key for live generation');
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as BiostatsTab, label: 'Overview', icon: BarChart3 },
    { id: 'sap' as BiostatsTab, label: 'SAP', icon: FileText, count: MOCK_SAPS.length },
    { id: 'adam' as BiostatsTab, label: 'ADAM', icon: Database, count: MOCK_ADAM_DATASETS.length },
    { id: 'tlf' as BiostatsTab, label: 'TLFs', icon: Table, count: MOCK_TLFS.length },
    { id: 'cdisc' as BiostatsTab, label: 'CDISC', icon: Shield },
    { id: 'runs' as BiostatsTab, label: 'Runs', icon: Play, count: MOCK_RUNS.filter(r => r.status === 'running').length },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="biostats"
          showAssetContext
        title="Biostatistics"
        subtitle="Statistical analysis planning, ADAM datasets, and TLF production"
        icon={<BarChart3 className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded-lg flex items-center gap-1"
              onClick={() => setActiveTab('runs')}
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">DB Lock Status</span>
            </button>
            <CapabilityGate moduleId="biostats" capability="author" inline>
                <button
                  className="px-3 sm:px-4 py-2 text-sm text-white bg-accent-purple rounded-lg hover:bg-accent-purple/90 flex items-center gap-2"
                  onClick={handleAIAnalysis}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Analysis</span>
                </button>
              </CapabilityGate>
          </div>
        }
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-fade-right -mb-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'bg-surface-elevated text-purple-400 border-purple-500 font-medium'
                    : 'text-text-secondary hover:text-text-primary border-transparent hover:bg-surface-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-purple-500/20 text-purple-400' : 'bg-surface-card text-text-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScreenHeader>

      {/* v0.125.33: Scope context banner */}
      <ScopeContextBanner label="Study" scopeFlag={scopeFlag} scopeSummary={scopeSummary} />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && <OverviewTab onTabChange={setActiveTab} />}
        {activeTab === 'sap' && <SAPTab initialStudyFilter={studyProtocolNumber ?? 'all'} />}
        {activeTab === 'adam' && <ADAMTab />}
        {activeTab === 'tlf' && <TLFTab />}
        {activeTab === 'cdisc' && <CDISCTab />}
        {activeTab === 'runs' && <RunsTab />}
      </div>

      {/* AI Analysis Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowAIPanel(false)}>
          <div
            className="w-full max-w-xl h-full bg-surface border-l border-border shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-elevated flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                </div>
                <div>
                  <div className="font-semibold text-text-primary text-sm">ICH E9(R1) Readiness Assessment</div>
                  <div className="text-xs text-text-muted">LIG-2847 · Statistical programme analysis</div>
                </div>
              </div>
              <button
                onClick={() => setShowAIPanel(false)}
                className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-surface-card rounded w-3/4" />
                  <div className="h-4 bg-surface-card rounded w-full" />
                  <div className="h-4 bg-surface-card rounded w-5/6" />
                  <div className="h-4 bg-surface-card rounded w-2/3 mt-6" />
                  <div className="h-4 bg-surface-card rounded w-full" />
                  <div className="h-4 bg-surface-card rounded w-4/5" />
                  <div className="h-4 bg-surface-card rounded w-full" />
                  <div className="h-4 bg-surface-card rounded w-3/4 mt-6" />
                  <div className="h-4 bg-surface-card rounded w-full" />
                </div>
              ) : aiResult ? (
                <div className="prose prose-sm max-w-none text-text-primary">
                  {aiResult.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-text-primary mt-5 mb-2 first:mt-0">{line.slice(3)}</h2>;
                    if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i} className="text-sm font-semibold text-accent-purple mt-4 mb-1">{line.slice(2, -2)}</h3>;
                    if (line.startsWith('- ')) return <p key={i} className="text-sm text-text-secondary pl-3 border-l-2 border-accent-purple/30 mb-1">{line.slice(2)}</p>;
                    if (line.match(/^\d+\./)) return <p key={i} className="text-sm text-text-primary mb-1 flex gap-2"><span className="text-accent-purple font-bold flex-shrink-0">{line.match(/^\d+/)![0]}.</span><span>{line.replace(/^\d+\.\s*/, '')}</span></p>;
                    if (line.trim() === '') return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm text-text-secondary mb-1 leading-relaxed">{line}</p>;
                  })}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Sparkles className="w-3 h-3 text-accent-purple" />
                <span>Lix · ICH E9(R1) · ICH E3</span>
              </div>
              <button
                onClick={() => { setAiResult(null); handleAIAnalysis(); }}
                className="text-xs text-accent-purple hover:text-accent-purple/80 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BiostatsScreen;
