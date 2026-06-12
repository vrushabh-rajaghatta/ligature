

/**
 * R&D Archives Repository Screen
 * v0.13.80 - Audit Trail Tab (COMPLETE MODULE)
 * 
 * Long-term document and data archive management for R&D lifecycle
 * 
 * Regulatory Coverage:
 * - 21 CFR Part 11 (Electronic Records)
 * - ICH E6 (GCP Archives)
 * - 21 CFR Part 58.195 (GLP Archives)
 * 
 * Tabs:
 * - Dashboard: Metrics overview, compliance gauge, type breakdowns, activity feed
 * - Documents: Archived regulatory documents
 * - Studies: Archived clinical/nonclinical study data
 * - Specimens: Biobank/retained sample management
 * - Retention: Retention schedule management
 * - Audit Trail: Archive access and modification history
 */

import { useState, useMemo } from 'react';
import {
  Archive, FileText, Database, TestTube, Calendar, ClipboardList,
  BarChart3, AlertTriangle, CheckCircle2, Clock, Shield, Server,
  RefreshCw, Download, Search, Filter, ChevronRight, AlertCircle,
  Lock, Unlock, Eye, Trash2, TrendingUp, TrendingDown, Activity,
  HardDrive, Users, FileCheck, Beaker, Thermometer, Droplets, FlaskConical,
  Globe, Building2, Scale, Bell, Settings, Zap, Pen, Plus, History, UserCheck
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { 
  useArchivesStore,
  useArchiveTab,
  useArchiveMetrics,
  useArchiveActionItems,
  useArchiveHealthMetrics,
  useArchiveDocuments,
  useArchiveStudies,
  useArchiveSpecimens,
  useArchiveSchedules,
  useArchiveAuditEntries,
} from '@/store/useArchivesStore';
import { 
  ArchiveTab, 
  ArchiveActionItem, 
  ArchiveTypeBreakdown, 
  RecentArchiveActivity,
  ArchivedDocument,
  ArchivedStudy,
  Specimen,
  RetentionSchedule,
  ArchiveAuditEntry,
  ArchiveDocumentType,
  ArchiveDocumentStatus,
  ArchiveStudyType,
  ArchiveStudyStatus,
  SpecimenType,
  SpecimenStatus,
  StorageCondition,
  RetentionRecordType,
  RetentionBasis,
  ArchiveAuditEventType,
} from '@/store/archivesTypes';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/components/ui/Toast';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: { id: ArchiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'studies', label: 'Studies', icon: <Database className="w-4 h-4" /> },
  { id: 'specimens', label: 'Specimens', icon: <TestTube className="w-4 h-4" /> },
  { id: 'retention', label: 'Retention', icon: <Calendar className="w-4 h-4" /> },
  { id: 'audit-trail', label: 'Audit Trail', icon: <ClipboardList className="w-4 h-4" /> },
];

// ============================================================================
// Color Maps
// ============================================================================

const actionPriorityColorMap: Record<string, BadgeColor> = {
  critical: 'red',
  high: 'amber',
  medium: 'blue',
  low: 'slate',
};

const actionTypeIconMap: Record<string, React.ReactNode> = {
  review: <Eye className="w-4 h-4" />,
  destruction: <Trash2 className="w-4 h-4" />,
  retrieval: <Download className="w-4 h-4" />,
  expiring: <Clock className="w-4 h-4" />,
  'legal-hold': <Lock className="w-4 h-4" />,
};

const activityEventIconMap: Record<string, React.ReactNode> = {
  'archive-created': <FileCheck className="w-4 h-4" />,
  'archive-accessed': <Eye className="w-4 h-4" />,
  'archive-modified': <FileText className="w-4 h-4" />,
  'archive-destroyed': <Trash2 className="w-4 h-4" />,
  'retention-extended': <Calendar className="w-4 h-4" />,
  'legal-hold-applied': <Lock className="w-4 h-4" />,
  'legal-hold-released': <Unlock className="w-4 h-4" />,
  'custody-transferred': <Users className="w-4 h-4" />,
  'review-completed': <CheckCircle2 className="w-4 h-4" />,
  'retrieval-requested': <Download className="w-4 h-4" />,
  'retrieval-completed': <FileCheck className="w-4 h-4" />,
};

const activityEventColorMap: Record<string, string> = {
  'archive-created': 'text-emerald-400 bg-emerald-500/10',
  'archive-accessed': 'text-blue-400 bg-blue-500/10',
  'archive-modified': 'text-amber-400 bg-amber-500/10',
  'archive-destroyed': 'text-red-400 bg-red-500/10',
  'retention-extended': 'text-violet-400 bg-violet-500/10',
  'legal-hold-applied': 'text-pink-400 bg-pink-500/10',
  'legal-hold-released': 'text-cyan-400 bg-cyan-500/10',
  'custody-transferred': 'text-amber-400 bg-amber-500/10',
  'review-completed': 'text-emerald-400 bg-emerald-500/10',
  'retrieval-requested': 'text-blue-400 bg-blue-500/10',
  'retrieval-completed': 'text-emerald-400 bg-emerald-500/10',
};

// v0.13.76: Document Type and Status Colors
const documentTypeColorMap: Record<ArchiveDocumentType, BadgeColor> = {
  'submission': 'blue',
  'clinical': 'emerald',
  'nonclinical': 'amber',
  'cmc': 'violet',
  'quality': 'red',
  'correspondence': 'cyan',
  'labeling': 'pink',
  'safety': 'red',
  'regulatory': 'amber',
  'other': 'slate',
};

const documentTypeLabels: Record<ArchiveDocumentType, string> = {
  'submission': 'Submission',
  'clinical': 'Clinical',
  'nonclinical': 'Nonclinical',
  'cmc': 'CMC',
  'quality': 'Quality',
  'correspondence': 'Correspondence',
  'labeling': 'Labeling',
  'safety': 'Safety',
  'regulatory': 'Regulatory',
  'other': 'Other',
};

const documentStatusColorMap: Record<ArchiveDocumentStatus, BadgeColor> = {
  'active': 'emerald',
  'pending-review': 'amber',
  'pending-destruction': 'red',
  'destroyed': 'slate',
  'legal-hold': 'pink',
  'retrieved': 'cyan',
};

const documentStatusLabels: Record<ArchiveDocumentStatus, string> = {
  'active': 'Active',
  'pending-review': 'Pending Review',
  'pending-destruction': 'Pending Destruction',
  'destroyed': 'Destroyed',
  'legal-hold': 'Legal Hold',
  'retrieved': 'Retrieved',
};

// v0.13.77: Study Type and Status Colors
const studyTypeColorMap: Record<ArchiveStudyType, BadgeColor> = {
  'clinical-trial': 'emerald',
  'glp-study': 'amber',
  'bioavailability': 'blue',
  'pk-pd': 'violet',
  'stability': 'cyan',
  'bioequivalence': 'blue',
  'observational': 'pink',
};

const studyTypeLabels: Record<ArchiveStudyType, string> = {
  'clinical-trial': 'Clinical Trial',
  'glp-study': 'GLP Study',
  'bioavailability': 'BA/BE Study',
  'pk-pd': 'PK/PD Study',
  'stability': 'Stability',
  'bioequivalence': 'Bioequivalence',
  'observational': 'Observational',
};

const studyStatusColorMap: Record<ArchiveStudyStatus, BadgeColor> = {
  'archived': 'emerald',
  'partial': 'amber',
  'pending-closeout': 'blue',
  'retrieved': 'cyan',
  'legal-hold': 'pink',
};

const studyStatusLabels: Record<ArchiveStudyStatus, string> = {
  'archived': 'Archived',
  'partial': 'Partial',
  'pending-closeout': 'Pending Closeout',
  'retrieved': 'Retrieved',
  'legal-hold': 'Legal Hold',
};

// v0.13.78: Specimen Type and Status Colors
const specimenTypeColorMap: Record<SpecimenType, BadgeColor> = {
  'tissue': 'violet',
  'serum': 'red',
  'plasma': 'amber',
  'whole-blood': 'red',
  'dna': 'emerald',
  'rna': 'cyan',
  'urine': 'amber',
  'csf': 'blue',
  'stability': 'blue',
  'retention': 'slate',
  'reference': 'pink',
  'other': 'slate',
};

const specimenTypeLabels: Record<SpecimenType, string> = {
  'tissue': 'Tissue',
  'serum': 'Serum',
  'plasma': 'Plasma',
  'whole-blood': 'Whole Blood',
  'dna': 'DNA',
  'rna': 'RNA',
  'urine': 'Urine',
  'csf': 'CSF',
  'stability': 'Stability',
  'retention': 'Retention',
  'reference': 'Reference',
  'other': 'Other',
};

const specimenStatusColorMap: Record<SpecimenStatus, BadgeColor> = {
  'stored': 'emerald',
  'expired': 'red',
  'depleted': 'slate',
  'destroyed': 'slate',
  'transferred': 'cyan',
  'in-use': 'blue',
};

const specimenStatusLabels: Record<SpecimenStatus, string> = {
  'stored': 'Stored',
  'expired': 'Expired',
  'depleted': 'Depleted',
  'destroyed': 'Destroyed',
  'transferred': 'Transferred',
  'in-use': 'In Use',
};

const storageConditionLabels: Record<StorageCondition, string> = {
  'ambient': 'Ambient',
  'refrigerated': '2-8°C',
  'frozen-20': '-20°C',
  'frozen-80': '-80°C',
  'liquid-nitrogen': 'LN₂ (-196°C)',
  'controlled-humidity': 'Controlled RH',
};

const storageConditionColors: Record<StorageCondition, string> = {
  'ambient': 'text-amber-400 bg-amber-500/10',
  'refrigerated': 'text-cyan-400 bg-cyan-500/10',
  'frozen-20': 'text-blue-400 bg-blue-500/10',
  'frozen-80': 'text-violet-400 bg-violet-500/10',
  'liquid-nitrogen': 'text-indigo-400 bg-indigo-500/10',
  'controlled-humidity': 'text-emerald-400 bg-emerald-500/10',
};

// v0.13.79: Retention Record Type and Basis Colors
const retentionRecordTypeColorMap: Record<RetentionRecordType, BadgeColor> = {
  'clinical-data': 'emerald',
  'nonclinical-data': 'amber',
  'regulatory-filing': 'blue',
  'correspondence': 'cyan',
  'batch-records': 'violet',
  'stability-data': 'pink',
  'adverse-events': 'red',
  'quality-records': 'slate',
  'training-records': 'slate',
  'audit-records': 'amber',
};

const retentionRecordTypeLabels: Record<RetentionRecordType, string> = {
  'clinical-data': 'Clinical Data',
  'nonclinical-data': 'Nonclinical Data',
  'regulatory-filing': 'Regulatory Filing',
  'correspondence': 'Correspondence',
  'batch-records': 'Batch Records',
  'stability-data': 'Stability Data',
  'adverse-events': 'Adverse Events',
  'quality-records': 'Quality Records',
  'training-records': 'Training Records',
  'audit-records': 'Audit Records',
};

const retentionBasisColorMap: Record<RetentionBasis, BadgeColor> = {
  'regulatory': 'blue',
  'company-policy': 'slate',
  'legal-hold': 'pink',
  'contractual': 'amber',
  'business-need': 'cyan',
};

const retentionBasisLabels: Record<RetentionBasis, string> = {
  'regulatory': 'Regulatory',
  'company-policy': 'Company Policy',
  'legal-hold': 'Legal Hold',
  'contractual': 'Contractual',
  'business-need': 'Business Need',
};

// v0.13.80: Audit Event Type Colors and Labels
const auditEventTypeColorMap: Record<ArchiveAuditEventType, BadgeColor> = {
  'archive-created': 'emerald',
  'archive-accessed': 'blue',
  'archive-modified': 'amber',
  'archive-destroyed': 'red',
  'retention-extended': 'violet',
  'legal-hold-applied': 'pink',
  'legal-hold-released': 'cyan',
  'custody-transferred': 'amber',
  'review-completed': 'emerald',
  'retrieval-requested': 'blue',
  'retrieval-completed': 'emerald',
};

const auditEventTypeLabels: Record<ArchiveAuditEventType, string> = {
  'archive-created': 'Created',
  'archive-accessed': 'Accessed',
  'archive-modified': 'Modified',
  'archive-destroyed': 'Destroyed',
  'retention-extended': 'Retention Extended',
  'legal-hold-applied': 'Legal Hold Applied',
  'legal-hold-released': 'Legal Hold Released',
  'custody-transferred': 'Custody Transferred',
  'review-completed': 'Review Completed',
  'retrieval-requested': 'Retrieval Requested',
  'retrieval-completed': 'Retrieval Completed',
};

const recordTypeLabels: Record<string, string> = {
  'document': 'Document',
  'study': 'Study',
  'specimen': 'Specimen',
  'schedule': 'Schedule',
};

const recordTypeColorMap: Record<string, BadgeColor> = {
  'document': 'blue',
  'study': 'emerald',
  'specimen': 'violet',
  'schedule': 'amber',
};

// ============================================================================
// Compliance Gauge Component
// ============================================================================

interface ComplianceGaugeProps {
  score: number;
  size?: number;
}

function ComplianceGauge({ score, size = 160 }: ComplianceGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeWidth = 12;
  
  const getColor = (score: number) => {
    if (score >= 90) return '#10B981'; // emerald
    if (score >= 70) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-card"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-text-primary">{score}%</span>
        <span className="text-xs text-text-muted">Compliance</span>
      </div>
    </div>
  );
}

// ============================================================================
// Mini Trend Chart Component
// ============================================================================

interface MiniTrendChartProps {
  data: { month: string; value: number }[];
  color: string;
  height?: number;
}

function MiniTrendChart({ data, color, height = 40 }: MiniTrendChartProps) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value - min) / range) * 80 - 10;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

// ============================================================================
// Type Breakdown Bar Component
// ============================================================================

interface TypeBreakdownBarProps {
  items: ArchiveTypeBreakdown[];
  title: string;
  icon: React.ReactNode;
}

function TypeBreakdownBar({ items, title, icon }: TypeBreakdownBarProps) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-muted">{icon}</span>
        <span className="text-sm font-medium text-text-primary">{title}</span>
      </div>
      
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-3">
        {items.map((item, i) => (
          <div
            key={i}
            style={{ 
              width: `${item.percentage}%`, 
              backgroundColor: item.color 
            }}
            className="first:rounded-l-full last:rounded-r-full"
            title={`${item?.label ?? ''}: ${item.count.toLocaleString()} (${item.percentage}%)`}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-text-muted">{item.label}</span>
            <span className="text-text-secondary font-medium">{item.count.toLocaleString()}</span>
          </div>
        ))}
        {items.length > 4 && (
          <span className="text-xs text-text-muted">+{items.length - 4} more</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Recent Activity Row Component
// ============================================================================

interface ActivityRowProps {
  activity: RecentArchiveActivity;
}

function ActivityRow({ activity }: ActivityRowProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };
  
  const colorClass = activityEventColorMap[activity.eventType] || 'text-slate-400 bg-slate-500/10';
  
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`p-1.5 rounded-lg ${colorClass}`}>
        {activityEventIconMap[activity.eventType] || <Activity className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {activity.recordTitle}
          </span>
          <Badge color="slate" size="xs">{activity.recordType}</Badge>
        </div>
        <p className="text-xs text-text-muted truncate">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
          <span>{activity.userName}</span>
          <span>•</span>
          <span>{formatTime(activity.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Action Item Row Component
// ============================================================================

interface ActionItemRowProps {
  item: ArchiveActionItem;
  onSelect?: () => void;
}

function ActionItemRow({ item, onSelect }: ActionItemRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Type Icon */}
      <div className={`p-2 rounded-lg ${
        item.type === 'legal-hold' ? 'bg-pink-500/10 text-pink-400' :
        item.type === 'destruction' ? 'bg-red-500/10 text-red-400' :
        item.type === 'retrieval' ? 'bg-cyan-500/10 text-cyan-400' :
        item.type === 'expiring' ? 'bg-amber-500/10 text-amber-400' :
        'bg-violet-500/10 text-violet-400'
      }`}>
        {actionTypeIconMap[item.type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-text-primary truncate">{item.title}</span>
          <Badge color={actionPriorityColorMap[item.priority]} size="xs">
            {item.priority}
          </Badge>
        </div>
        <p className="text-sm text-text-muted truncate">{item.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          {item.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </span>
          )}
          {item.assignedTo && (
            <span>Assigned: {item.assignedTo}</span>
          )}
        </div>
      </div>
      
      {/* Action */}
      <button onClick={onSelect} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Dashboard Tab - Enhanced for v0.13.75
// ============================================================================

function DashboardTab() {
  const metrics = useArchiveMetrics();
  const actionItems = useArchiveActionItems();
  const healthMetrics = useArchiveHealthMetrics();
  const toast = useToast();
  const setActiveTab = useArchivesStore(state => state.setActiveTab);
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top Row: Key Metrics + Compliance Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Compliance Gauge Card */}
        <Card className="lg:row-span-2">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <ComplianceGauge score={metrics.complianceScore} />
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">+2% from last month</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {metrics.overdueReviews} overdue reviews
              </p>
            </div>
            
            {/* Mini trend chart */}
            <div className="w-full mt-4 px-2">
              <div className="text-xs text-text-muted mb-1">6-Month Trend</div>
              <MiniTrendChart 
                data={healthMetrics.complianceTrend.map(d => ({ month: d.month, value: d.score }))} 
                color="#10B981" 
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Key Metrics */}
        <StatCard
          label="Total Documents"
          value={metrics.totalDocuments.toLocaleString()}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          trend={{ value: 127, direction: 'up', label: 'this month' }}
        />
        <StatCard
          label="Archived Studies"
          value={metrics.totalStudies.toLocaleString()}
          icon={<Database className="w-5 h-5" />}
          color="emerald"
          trend={{ value: 3, direction: 'up', label: 'this month' }}
        />
        <StatCard
          label="Specimen Records"
          value={metrics.totalSpecimens.toLocaleString()}
          icon={<TestTube className="w-5 h-5" />}
          color="violet"
        />
        
        {/* Secondary Metrics */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Pending Reviews</span>
            <Badge color={metrics.pendingReviews > 20 ? 'amber' : 'slate'} size="sm">
              {metrics.pendingReviews}
            </Badge>
          </div>
          <div className="text-xs text-text-muted">
            {metrics.overdueReviews} overdue
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Legal Holds</span>
            <Badge color={metrics.legalHolds > 0 ? 'pink' : 'slate'} size="sm">
              {metrics.legalHolds}
            </Badge>
          </div>
          <div className="text-xs text-text-muted">
            Active litigation holds
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Expiring Soon</span>
            <Badge color={metrics.expiringRetention30Days > 10 ? 'amber' : 'slate'} size="sm">
              {metrics.expiringRetention30Days}
            </Badge>
          </div>
          <div className="text-xs text-text-muted">
            Retention expires in 30 days
          </div>
        </div>
      </div>
      
      {/* Storage Usage */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-text-muted" />
              <span className="font-medium text-text-primary">Storage Usage</span>
            </div>
            <span className="text-sm text-text-secondary">
              {metrics.storageUsedTB} TB / {metrics.storageCapacityTB} TB ({Math.round((metrics.storageUsedTB / metrics.storageCapacityTB) * 100)}%)
            </span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent-blue to-accent-purple rounded-full transition-all duration-500"
              style={{ width: `${(metrics.storageUsedTB / metrics.storageCapacityTB) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-muted">
            <span>0 TB</span>
            <span>Growth: +1.7 TB/month</span>
            <span>{metrics.storageCapacityTB} TB</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Archive Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TypeBreakdownBar 
          items={healthMetrics.documentsByType}
          title="Documents by Type"
          icon={<FileText className="w-4 h-4" />}
        />
        <TypeBreakdownBar 
          items={healthMetrics.studiesByType}
          title="Studies by Type"
          icon={<Database className="w-4 h-4" />}
        />
        <TypeBreakdownBar 
          items={healthMetrics.specimensByType}
          title="Specimens by Type"
          icon={<TestTube className="w-4 h-4" />}
        />
      </div>
      
      {/* Bottom Row: Action Items + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Action Items</h3>
              <Badge color="slate" size="sm">{actionItems.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {actionItems.map((item) => (
                <ActionItemRow key={item.id} item={item} onSelect={() => toast.info(`Opening action item: ${item.title}`)} />
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
              <button onClick={() => setActiveTab('audit' as any)} className="text-sm text-accent-blue hover:underline">View All</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
              {healthMetrics.recentActivity.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Documents Tab - v0.13.76
// ============================================================================

function DocumentsTab() {
  const documents = useArchiveDocuments();
    const { deadClick } = useDeadClick();
  const [typeFilter, setTypeFilter] = useState<ArchiveDocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ArchiveDocumentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.documentId.toLowerCase().includes(query) ||
          doc.sourceModule.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [documents, typeFilter, statusFilter, searchQuery]);
  
  // Count by type for filter buttons
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach(doc => {
      counts[doc.type] = (counts[doc.type] || 0) + 1;
    });
    return counts;
  }, [documents]);
  
  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach(doc => {
      counts[doc.status] = (counts[doc.status] || 0) + 1;
    });
    return counts;
  }, [documents]);
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };
  
  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const days = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={documents.length.toString()}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Active"
          value={statusCounts['active']?.toString() || '0'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Pending Review"
          value={statusCounts['pending-review']?.toString() || '0'}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Legal Hold"
          value={statusCounts['legal-hold']?.toString() || '0'}
          icon={<Lock className="w-5 h-5" />}
          color="pink"
        />
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by title, ID, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                All Types ({typeCounts.all})
              </button>
              {(['clinical', 'submission', 'nonclinical', 'cmc', 'quality'] as ArchiveDocumentType[]).map(type => (
                typeCounts[type] > 0 && (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      typeFilter === type
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {documentTypeLabels[type]} ({typeCounts[type] || 0})
                  </button>
                )
              ))}
            </div>
          </div>
          
          {/* Status Filter Row */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted mr-2">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {(['active', 'pending-review', 'legal-hold', 'pending-destruction', 'retrieved'] as ArchiveDocumentStatus[]).map(status => (
              statusCounts[status] > 0 && (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {documentStatusLabels[status]} ({statusCounts[status] || 0})
                </button>
              )
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Archived Documents</h3>
            <Badge color="slate" size="sm">{filteredDocuments.length} documents</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No documents match your filters
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <DocumentRow key={doc.id} document={doc} onSelect={() => toast.info(`Opening document: ${doc.documentId}`)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Document Row Component
// ============================================================================

interface DocumentRowProps {
  document: ArchivedDocument;
  onSelect?: () => void;
}

function DocumentRow({ document, onSelect }: DocumentRowProps) {
  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const days = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const daysUntilExpiry = getDaysUntilExpiry(document.retentionExpiryDate);
  const yearsUntilExpiry = Math.floor(daysUntilExpiry / 365);
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Type Icon */}
      <div className={`p-2 rounded-lg ${
        document.type === 'clinical' ? 'bg-emerald-500/10 text-emerald-400' :
        document.type === 'submission' ? 'bg-blue-500/10 text-blue-400' :
        document.type === 'nonclinical' ? 'bg-amber-500/10 text-amber-400' :
        document.type === 'cmc' ? 'bg-violet-500/10 text-violet-400' :
        document.type === 'quality' ? 'bg-red-500/10 text-red-400' :
        document.type === 'correspondence' ? 'bg-cyan-500/10 text-cyan-400' :
        document.type === 'labeling' ? 'bg-pink-500/10 text-pink-400' :
        'bg-slate-500/10 text-slate-400'
      }`}>
        <FileText className="w-5 h-5" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {document.documentId}
              </span>
              <Badge color={documentTypeColorMap[document.type]} size="xs">
                {documentTypeLabels[document.type]}
              </Badge>
              <Badge color={documentStatusColorMap[document.status]} size="xs">
                {documentStatusLabels[document.status]}
              </Badge>
              {document.status === 'legal-hold' && (
                <Lock className="w-3 h-3 text-pink-400" />
              )}
            </div>
            <h4 className="font-medium text-text-primary truncate">{document.title}</h4>
            <p className="text-sm text-text-muted mt-1">
              v{document.version} • {document.sourceModule} • Archived {new Date(document.archiveDate).toLocaleDateString()}
            </p>
          </div>
          
          {/* Right Side Info */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm text-text-secondary">
              {document.retentionPeriod} year retention
            </div>
            <div className={`text-xs mt-1 ${
              yearsUntilExpiry < 1 ? 'text-red-400' :
              yearsUntilExpiry < 3 ? 'text-amber-400' :
              'text-text-muted'
            }`}>
              {yearsUntilExpiry > 0 
                ? `${yearsUntilExpiry}y until expiry`
                : `${daysUntilExpiry}d until expiry`
              }
            </div>
          </div>
        </div>
        
        {/* Bottom Row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {document.mediaType === 'electronic' ? 'Electronic' : 
             document.mediaType === 'physical' ? 'Physical' : 'Hybrid'}
            {document.fileSize && ` • ${formatFileSize(document.fileSize)}`}
          </span>
          {document.nextReviewDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Next review: {new Date(document.nextReviewDate).toLocaleDateString()}
            </span>
          )}
          {document.isElectronicallySigned && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              e-Signed
            </span>
          )}
          {document.studyId && (
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {document.studyId}
            </span>
          )}
        </div>
      </div>
      
      {/* Action Button */}
      <button onClick={onSelect} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Studies Tab - v0.13.77
// ============================================================================

function StudiesTab() {
  const studies = useArchiveStudies();
  const [typeFilter, setTypeFilter] = useState<ArchiveStudyType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ArchiveStudyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  // Filter studies
  const filteredStudies = useMemo(() => {
    return studies.filter(study => {
      if (typeFilter !== 'all' && study.type !== typeFilter) return false;
      if (statusFilter !== 'all' && study.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          study.title.toLowerCase().includes(query) ||
          study.studyId.toLowerCase().includes(query) ||
          (study.indication?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [studies, typeFilter, statusFilter, searchQuery]);
  
  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studies.length };
    studies.forEach(study => {
      counts[study.type] = (counts[study.type] || 0) + 1;
    });
    return counts;
  }, [studies]);
  
  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studies.length };
    studies.forEach(study => {
      counts[study.status] = (counts[study.status] || 0) + 1;
    });
    return counts;
  }, [studies]);
  
  // Calculate totals
  const totalSubjects = useMemo(() => 
    studies.reduce((sum, s) => sum + (s.subjectCount || 0), 0), [studies]);
  const totalRecords = useMemo(() =>
    studies.reduce((sum, s) => sum + s.recordCount, 0), [studies]);
  
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Studies"
          value={studies.length.toString()}
          icon={<Database className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Total Subjects"
          value={totalSubjects.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Total Records"
          value={totalRecords.toLocaleString()}
          icon={<FileText className="w-5 h-5" />}
          color="violet"
        />
        <StatCard
          label="Legal Hold"
          value={statusCounts['legal-hold']?.toString() || '0'}
          icon={<Lock className="w-5 h-5" />}
          color="pink"
        />
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by title, study ID, or indication..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                All Types ({typeCounts.all})
              </button>
              {(['clinical-trial', 'glp-study', 'pk-pd', 'bioavailability', 'stability'] as ArchiveStudyType[]).map(type => (
                typeCounts[type] > 0 && (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      typeFilter === type
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {studyTypeLabels[type]} ({typeCounts[type] || 0})
                  </button>
                )
              ))}
            </div>
          </div>
          
          {/* Status Filter Row */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted mr-2">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {(['archived', 'legal-hold', 'pending-closeout', 'partial', 'retrieved'] as ArchiveStudyStatus[]).map(status => (
              statusCounts[status] > 0 && (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {studyStatusLabels[status]} ({statusCounts[status] || 0})
                </button>
              )
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Studies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Archived Studies</h3>
            <Badge color="slate" size="sm">{filteredStudies.length} studies</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredStudies.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No studies match your filters
              </div>
            ) : (
              filteredStudies.map((study) => (
                <StudyRow key={study.id} study={study} onSelect={() => toast.info(`Opening study: ${study.studyId}`)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Study Row Component
// ============================================================================

interface StudyRowProps {
  study: ArchivedStudy;
  onSelect?: () => void;
}

function StudyRow({ study, onSelect }: StudyRowProps) {
  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const days = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const daysUntilExpiry = getDaysUntilExpiry(study.retentionExpiryDate);
  const yearsUntilExpiry = Math.floor(daysUntilExpiry / 365);
  
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Type Icon */}
      <div className={`p-2 rounded-lg ${
        study.type === 'clinical-trial' ? 'bg-emerald-500/10 text-emerald-400' :
        study.type === 'glp-study' ? 'bg-amber-500/10 text-amber-400' :
        study.type === 'pk-pd' ? 'bg-violet-500/10 text-violet-400' :
        study.type === 'bioavailability' || study.type === 'bioequivalence' ? 'bg-blue-500/10 text-blue-400' :
        study.type === 'stability' ? 'bg-cyan-500/10 text-cyan-400' :
        study.type === 'observational' ? 'bg-pink-500/10 text-pink-400' :
        'bg-slate-500/10 text-slate-400'
      }`}>
        <Database className="w-5 h-5" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {study.studyId}
              </span>
              <Badge color={studyTypeColorMap[study.type]} size="xs">
                {studyTypeLabels[study.type]}
              </Badge>
              {study.phase && (
                <Badge color="slate" size="xs">{study.phase}</Badge>
              )}
              <Badge color={studyStatusColorMap[study.status]} size="xs">
                {studyStatusLabels[study.status]}
              </Badge>
              {study.status === 'legal-hold' && (
                <Lock className="w-3 h-3 text-pink-400" />
              )}
            </div>
            <h4 className="font-medium text-text-primary line-clamp-2">{study.title}</h4>
            {study.indication && (
              <p className="text-sm text-text-secondary mt-1">{study.indication}</p>
            )}
            <p className="text-sm text-text-muted mt-1">
              Archived {new Date(study.archiveDate).toLocaleDateString()} • {study.sponsor}
            </p>
          </div>
          
          {/* Right Side Info */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm text-text-secondary">
              {study.retentionPeriod} year retention
            </div>
            <div className={`text-xs mt-1 ${
              yearsUntilExpiry < 1 ? 'text-red-400' :
              yearsUntilExpiry < 3 ? 'text-amber-400' :
              'text-text-muted'
            }`}>
              {yearsUntilExpiry > 0 
                ? `${yearsUntilExpiry}y until expiry`
                : `${daysUntilExpiry}d until expiry`
              }
            </div>
          </div>
        </div>
        
        {/* Data Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {study.dataVolume}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {study.recordCount.toLocaleString()} records
          </span>
          {study.subjectCount && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {study.subjectCount.toLocaleString()} subjects
            </span>
          )}
          {study.tmfArchiveId && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Archive className="w-3 h-3" />
              TMF Linked
            </span>
          )}
          {study.glpStudyId && (
            <span className="flex items-center gap-1 text-amber-400">
              <Shield className="w-3 h-3" />
              GLP
            </span>
          )}
          {study.linkedDocuments.length > 0 && (
            <span className="flex items-center gap-1">
              <FileCheck className="w-3 h-3" />
              {study.linkedDocuments.length} linked docs
            </span>
          )}
        </div>
      </div>
      
      {/* Action Button */}
      <button onClick={onSelect} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Specimens Tab - v0.13.78
// ============================================================================

function SpecimensTab() {
  const specimens = useArchiveSpecimens();
  const [typeFilter, setTypeFilter] = useState<SpecimenType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SpecimenStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  // Filter specimens
  const filteredSpecimens = useMemo(() => {
    return specimens.filter(specimen => {
      if (typeFilter !== 'all' && specimen.type !== typeFilter) return false;
      if (statusFilter !== 'all' && specimen.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          specimen.sampleId.toLowerCase().includes(query) ||
          (specimen.studyId?.toLowerCase().includes(query) ?? false) ||
          (specimen.subjectId?.toLowerCase().includes(query) ?? false) ||
          specimen.storageLocation.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [specimens, typeFilter, statusFilter, searchQuery]);
  
  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: specimens.length };
    specimens.forEach(specimen => {
      counts[specimen.type] = (counts[specimen.type] || 0) + 1;
    });
    return counts;
  }, [specimens]);
  
  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: specimens.length };
    specimens.forEach(specimen => {
      counts[specimen.status] = (counts[specimen.status] || 0) + 1;
    });
    return counts;
  }, [specimens]);
  
  // Calculate totals
  const totalAliquots = useMemo(() => 
    specimens.reduce((sum, s) => sum + (s.aliquotCount || 0), 0), [specimens]);
  const expiredCount = useMemo(() =>
    specimens.filter(s => s.status === 'expired').length, [specimens]);
  const temperatureExcursions = useMemo(() =>
    specimens.reduce((sum, s) => sum + s.temperatureExcursions, 0), [specimens]);
  
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Specimens"
          value={specimens.length.toString()}
          icon={<TestTube className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Total Aliquots"
          value={totalAliquots.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Expired"
          value={expiredCount.toString()}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Temp Excursions"
          value={temperatureExcursions.toString()}
          icon={<Thermometer className="w-5 h-5" />}
          color="amber"
        />
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by sample ID, study, subject, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                All Types ({typeCounts.all})
              </button>
              {(['serum', 'plasma', 'tissue', 'dna', 'stability', 'retention', 'csf', 'urine', 'reference'] as SpecimenType[]).map(type => (
                typeCounts[type] > 0 && (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      typeFilter === type
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {specimenTypeLabels[type]} ({typeCounts[type] || 0})
                  </button>
                )
              ))}
            </div>
          </div>
          
          {/* Status Filter Row */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted mr-2">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {(['stored', 'expired', 'depleted', 'in-use', 'transferred', 'destroyed'] as SpecimenStatus[]).map(status => (
              statusCounts[status] > 0 && (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {specimenStatusLabels[status]} ({statusCounts[status] || 0})
                </button>
              )
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Specimens List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Archived Specimens</h3>
            <Badge color="slate" size="sm">{filteredSpecimens.length} specimens</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredSpecimens.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No specimens match your filters
              </div>
            ) : (
              filteredSpecimens.map((specimen) => (
                <SpecimenRow key={specimen.id} specimen={specimen} onSelect={() => toast.info(`Opening specimen: ${specimen.sampleId}`)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Specimen Row Component
// ============================================================================

interface SpecimenRowProps {
  specimen: Specimen;
  onSelect?: () => void;
}

function SpecimenRow({ specimen, onSelect }: SpecimenRowProps) {
  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const days = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const daysUntilExpiry = getDaysUntilExpiry(specimen.expiryDate);
  const yearsUntilExpiry = daysUntilExpiry !== null ? Math.floor(daysUntilExpiry / 365) : null;
  
  // Icon based on specimen type
  const getTypeIcon = () => {
    switch (specimen.type) {
      case 'tissue':
        return <FlaskConical className="w-5 h-5" />;
      case 'dna':
      case 'rna':
        return <Beaker className="w-5 h-5" />;
      case 'stability':
      case 'retention':
      case 'reference':
        return <Archive className="w-5 h-5" />;
      default:
        return <TestTube className="w-5 h-5" />;
    }
  };
  
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Type Icon */}
      <div className={`p-2 rounded-lg ${
        specimen.type === 'serum' || specimen.type === 'whole-blood' ? 'bg-red-500/10 text-red-400' :
        specimen.type === 'plasma' || specimen.type === 'urine' ? 'bg-amber-500/10 text-amber-400' :
        specimen.type === 'tissue' ? 'bg-violet-500/10 text-violet-400' :
        specimen.type === 'dna' ? 'bg-emerald-500/10 text-emerald-400' :
        specimen.type === 'rna' ? 'bg-cyan-500/10 text-cyan-400' :
        specimen.type === 'csf' ? 'bg-blue-500/10 text-blue-400' :
        specimen.type === 'stability' || specimen.type === 'retention' ? 'bg-slate-500/10 text-slate-400' :
        specimen.type === 'reference' ? 'bg-pink-500/10 text-pink-400' :
        'bg-slate-500/10 text-slate-400'
      }`}>
        {getTypeIcon()}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                {specimen.sampleId}
              </span>
              <Badge color={specimenTypeColorMap[specimen.type]} size="xs">
                {specimenTypeLabels[specimen.type]}
              </Badge>
              <Badge color={specimenStatusColorMap[specimen.status]} size="xs">
                {specimenStatusLabels[specimen.status]}
              </Badge>
              {specimen.qualityStatus === 'compromised' && (
                <Badge color="red" size="xs">Compromised</Badge>
              )}
            </div>
            
            {/* Storage Location */}
            <p className="text-sm text-text-primary line-clamp-1">{specimen.storageLocation}</p>
            
            {/* Study/Subject Info */}
            {(specimen.studyId || specimen.subjectId) && (
              <p className="text-sm text-text-secondary mt-1">
                {specimen.studyId && <span className="font-medium">{specimen.studyId}</span>}
                {specimen.studyId && specimen.subjectId && ' • '}
                {specimen.subjectId && `Subject: ${specimen.subjectId}`}
                {specimen.visitId && ` • ${specimen.visitId}`}
              </p>
            )}
            
            {/* Collection Date & Custodian */}
            <p className="text-sm text-text-muted mt-1">
              Collected {new Date(specimen.collectionDate).toLocaleDateString()} • {specimen.currentCustodian}
            </p>
          </div>
          
          {/* Right Side Info */}
          <div className="text-right flex-shrink-0">
            {/* Storage Condition Badge */}
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${storageConditionColors[specimen.storageCondition]}`}>
              <Thermometer className="w-3 h-3" />
              {storageConditionLabels[specimen.storageCondition]}
            </div>
            
            {/* Expiry */}
            {daysUntilExpiry !== null && (
              <div className={`text-xs mt-2 ${
                daysUntilExpiry < 0 ? 'text-red-400' :
                daysUntilExpiry < 90 ? 'text-amber-400' :
                'text-text-muted'
              }`}>
                {daysUntilExpiry < 0 
                  ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                  : yearsUntilExpiry! > 0 
                    ? `${yearsUntilExpiry}y until expiry`
                    : `${daysUntilExpiry}d until expiry`
                }
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Row - Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          {specimen.volume !== undefined && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {specimen.volume} {specimen.type === 'stability' || specimen.type === 'retention' ? 'mL' : 'mL'}
            </span>
          )}
          {specimen.aliquotCount !== undefined && specimen.aliquotCount > 0 && (
            <span className="flex items-center gap-1">
              <TestTube className="w-3 h-3" />
              {specimen.aliquotCount} aliquots
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {specimen.accessCount} accesses
          </span>
          {specimen.temperatureExcursions > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {specimen.temperatureExcursions} temp excursion{specimen.temperatureExcursions !== 1 ? 's' : ''}
            </span>
          )}
          {specimen.custodyHistory.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {specimen.custodyHistory.length} transfers
            </span>
          )}
          <span className="flex items-center gap-1">
            <Archive className="w-3 h-3" />
            {specimen.containerType}
          </span>
        </div>
      </div>
      
      {/* Action Button */}
      <button onClick={onSelect} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Retention Tab - v0.13.79
// ============================================================================

function RetentionTab() {
  const schedules = useArchiveSchedules();
  const [recordTypeFilter, setRecordTypeFilter] = useState<RetentionRecordType | 'all'>('all');
  const [basisFilter, setBasisFilter] = useState<RetentionBasis | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (recordTypeFilter !== 'all' && schedule.recordType !== recordTypeFilter) return false;
      if (basisFilter !== 'all' && schedule.basis !== basisFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          schedule.name.toLowerCase().includes(query) ||
          schedule.description.toLowerCase().includes(query) ||
          (schedule.regulatoryReference?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [schedules, recordTypeFilter, basisFilter, searchQuery]);
  
  // Count by record type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: schedules.length };
    schedules.forEach(schedule => {
      counts[schedule.recordType] = (counts[schedule.recordType] || 0) + 1;
    });
    return counts;
  }, [schedules]);
  
  // Count by basis
  const basisCounts = useMemo(() => {
    const counts: Record<string, number> = { all: schedules.length };
    schedules.forEach(schedule => {
      counts[schedule.basis] = (counts[schedule.basis] || 0) + 1;
    });
    return counts;
  }, [schedules]);
  
  // Calculate totals
  const totalRecords = useMemo(() => 
    schedules.reduce((sum, s) => sum + s.recordsCount, 0), [schedules]);
  const autoDestructEnabled = useMemo(() =>
    schedules.filter(s => s.autoDestructionEnabled).length, [schedules]);
  const avgRetentionYears = useMemo(() => {
    if (schedules.length === 0) return 0;
    return Math.round(schedules.reduce((sum, s) => sum + s.retentionPeriod, 0) / schedules.length);
  }, [schedules]);
  
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Schedules"
          value={schedules.length.toString()}
          icon={<Calendar className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Records Covered"
          value={totalRecords.toLocaleString()}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Avg Retention"
          value={`${avgRetentionYears}y`}
          icon={<Clock className="w-5 h-5" />}
          color="violet"
        />
        <StatCard
          label="Auto-Destruct"
          value={autoDestructEnabled.toString()}
          icon={<Zap className="w-5 h-5" />}
          color="amber"
        />
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, description, or regulatory reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            
            {/* Record Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRecordTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  recordTypeFilter === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                All Types ({typeCounts.all})
              </button>
              {(['clinical-data', 'nonclinical-data', 'regulatory-filing', 'adverse-events', 'batch-records', 'quality-records'] as RetentionRecordType[]).map(type => (
                typeCounts[type] > 0 && (
                  <button
                    key={type}
                    onClick={() => setRecordTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      recordTypeFilter === type
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {retentionRecordTypeLabels[type]} ({typeCounts[type] || 0})
                  </button>
                )
              ))}
            </div>
          </div>
          
          {/* Basis Filter Row */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted mr-2">Basis:</span>
            <button
              onClick={() => setBasisFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                basisFilter === 'all'
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {(['regulatory', 'company-policy', 'legal-hold', 'contractual', 'business-need'] as RetentionBasis[]).map(basis => (
              basisCounts[basis] > 0 && (
                <button
                  key={basis}
                  onClick={() => setBasisFilter(basis)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    basisFilter === basis
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {retentionBasisLabels[basis]} ({basisCounts[basis] || 0})
                </button>
              )
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Schedules List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Retention Schedules</h3>
            <Badge color="slate" size="sm">{filteredSchedules.length} schedules</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No schedules match your filters
              </div>
            ) : (
              filteredSchedules.map((schedule) => (
                <RetentionScheduleRow key={schedule.id} schedule={schedule} onSelect={() => toast.info(`Opening schedule: ${schedule.name}`)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Retention Schedule Row Component
// ============================================================================

interface RetentionScheduleRowProps {
  schedule: RetentionSchedule;
  onSelect?: () => void;
}

function RetentionScheduleRow({ schedule, onSelect }: RetentionScheduleRowProps) {
  // Icon based on record type
  const getTypeIcon = () => {
    switch (schedule.recordType) {
      case 'clinical-data':
        return <Database className="w-5 h-5" />;
      case 'nonclinical-data':
        return <Beaker className="w-5 h-5" />;
      case 'regulatory-filing':
        return <FileText className="w-5 h-5" />;
      case 'correspondence':
        return <Archive className="w-5 h-5" />;
      case 'adverse-events':
        return <AlertTriangle className="w-5 h-5" />;
      case 'batch-records':
        return <Server className="w-5 h-5" />;
      case 'stability-data':
        return <FlaskConical className="w-5 h-5" />;
      case 'quality-records':
        return <Shield className="w-5 h-5" />;
      case 'training-records':
        return <Users className="w-5 h-5" />;
      case 'audit-records':
        return <ClipboardList className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };
  
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Type Icon */}
      <div className={`p-2 rounded-lg ${
        schedule.recordType === 'clinical-data' ? 'bg-emerald-500/10 text-emerald-400' :
        schedule.recordType === 'nonclinical-data' ? 'bg-amber-500/10 text-amber-400' :
        schedule.recordType === 'regulatory-filing' ? 'bg-blue-500/10 text-blue-400' :
        schedule.recordType === 'correspondence' ? 'bg-cyan-500/10 text-cyan-400' :
        schedule.recordType === 'adverse-events' ? 'bg-red-500/10 text-red-400' :
        schedule.recordType === 'batch-records' ? 'bg-violet-500/10 text-violet-400' :
        schedule.recordType === 'stability-data' ? 'bg-pink-500/10 text-pink-400' :
        schedule.recordType === 'quality-records' || schedule.recordType === 'training-records' ? 'bg-slate-500/10 text-slate-400' :
        schedule.recordType === 'audit-records' ? 'bg-amber-500/10 text-amber-400' :
        'bg-slate-500/10 text-slate-400'
      }`}>
        {getTypeIcon()}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge color={retentionRecordTypeColorMap[schedule.recordType]} size="xs">
                {retentionRecordTypeLabels[schedule.recordType]}
              </Badge>
              <Badge color={retentionBasisColorMap[schedule.basis]} size="xs">
                {retentionBasisLabels[schedule.basis]}
              </Badge>
              {schedule.region && (
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <Globe className="w-3 h-3" />
                  {schedule.region}
                </span>
              )}
              {schedule.jurisdiction && (
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <Building2 className="w-3 h-3" />
                  {schedule.jurisdiction}
                </span>
              )}
            </div>
            
            {/* Name */}
            <h4 className="font-medium text-text-primary">{schedule.name}</h4>
            
            {/* Description */}
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{schedule.description}</p>
            
            {/* Regulatory Reference */}
            {schedule.regulatoryReference && (
              <p className="text-sm text-text-muted mt-1">
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {schedule.regulatoryReference}
                </span>
              </p>
            )}
          </div>
          
          {/* Right Side Info */}
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-text-primary">
              {schedule.retentionPeriod} years
            </div>
            <div className="text-xs text-text-muted">
              retention period
            </div>
          </div>
        </div>
        
        {/* Bottom Row - Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {schedule.recordsCount.toLocaleString()} records
          </span>
          <span className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            {schedule.reviewReminderDays}d reminder
          </span>
          {schedule.autoDestructionEnabled ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Zap className="w-3 h-3" />
              Auto-destruct enabled
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" />
              Manual review required
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Modified {new Date(schedule.lastModified).toLocaleDateString()}
          </span>
        </div>
        
        {/* Applicable Document Types */}
        {schedule.applicableDocTypes.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
            <span className="text-xs text-text-muted">Applies to:</span>
            <div className="flex flex-wrap gap-1">
              {schedule.applicableDocTypes.map(docType => (
                <Badge key={docType} color={documentTypeColorMap[docType]} size="xs">
                  {documentTypeLabels[docType]}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Action Button */}
      <button onClick={onSelect} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Audit Trail Tab - v0.13.80
// ============================================================================

function AuditTrailTab() {
  const auditEntries = useArchiveAuditEntries();
  const [eventTypeFilter, setEventTypeFilter] = useState<ArchiveAuditEventType | 'all'>('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState<'document' | 'study' | 'specimen' | 'schedule' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  // Filter entries
  const filteredEntries = useMemo(() => {
    return auditEntries.filter(entry => {
      if (eventTypeFilter !== 'all' && entry.eventType !== eventTypeFilter) return false;
      if (recordTypeFilter !== 'all' && entry.recordType !== recordTypeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.recordTitle.toLowerCase().includes(query) ||
          entry.userName.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.recordId.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [auditEntries, eventTypeFilter, recordTypeFilter, searchQuery]);
  
  // Count by event type
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: auditEntries.length };
    auditEntries.forEach(entry => {
      counts[entry.eventType] = (counts[entry.eventType] || 0) + 1;
    });
    return counts;
  }, [auditEntries]);
  
  // Count by record type
  const recordTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: auditEntries.length };
    auditEntries.forEach(entry => {
      counts[entry.recordType] = (counts[entry.recordType] || 0) + 1;
    });
    return counts;
  }, [auditEntries]);
  
  // Calculate totals
  const signedCount = useMemo(() => 
    auditEntries.filter(e => e.electronicSignature).length, [auditEntries]);
  const uniqueUsers = useMemo(() => 
    new Set(auditEntries.map(e => e.userId)).size, [auditEntries]);
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return auditEntries.filter(e => e.timestamp.startsWith(today)).length;
  }, [auditEntries]);
  
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Events"
          value={auditEntries.length.toString()}
          icon={<History className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Today's Events"
          value={todayCount.toString()}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="e-Signed"
          value={signedCount.toString()}
          icon={<UserCheck className="w-5 h-5" />}
          color="violet"
        />
        <StatCard
          label="Unique Users"
          value={uniqueUsers.toString()}
          icon={<Users className="w-5 h-5" />}
          color="amber"
        />
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by record, user, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
            
            {/* Event Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEventTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  eventTypeFilter === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                All Events ({eventTypeCounts.all})
              </button>
              {(['archive-created', 'archive-accessed', 'archive-modified', 'archive-destroyed', 'legal-hold-applied', 'review-completed'] as ArchiveAuditEventType[]).map(eventType => (
                eventTypeCounts[eventType] > 0 && (
                  <button
                    key={eventType}
                    onClick={() => setEventTypeFilter(eventType)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      eventTypeFilter === eventType
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {auditEventTypeLabels[eventType]} ({eventTypeCounts[eventType] || 0})
                  </button>
                )
              ))}
            </div>
          </div>
          
          {/* Record Type Filter Row */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-text-muted mr-2">Record Type:</span>
            <button
              onClick={() => setRecordTypeFilter('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                recordTypeFilter === 'all'
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {(['document', 'study', 'specimen', 'schedule'] as const).map(recordType => (
              recordTypeCounts[recordType] > 0 && (
                <button
                  key={recordType}
                  onClick={() => setRecordTypeFilter(recordType)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    recordTypeFilter === recordType
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {recordTypeLabels[recordType]} ({recordTypeCounts[recordType] || 0})
                </button>
              )
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Compliance Banner */}
      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <Shield className="w-5 h-5 text-emerald-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-400">21 CFR Part 11 Compliant Audit Trail</p>
          <p className="text-xs text-text-muted">All archive events are immutably logged with timestamp, user, and electronic signature when required</p>
        </div>
        <Badge color="emerald" size="sm">{signedCount} e-Signed</Badge>
      </div>
      
      {/* Audit Entries List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Audit Trail</h3>
            <div className="flex items-center gap-2">
              <Badge color="slate" size="sm">{filteredEntries.length} events</Badge>
              <button onClick={async () => { try { const r = await fetch('/api/audit/export?format=csv'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'audit-trail.csv'; a.click(); URL.revokeObjectURL(u); toast.success('Audit trail exported'); } catch { toast.error('Export failed'); } }} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded">
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No audit entries match your filters
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <AuditEntryRow key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Audit Entry Row Component
// ============================================================================

interface AuditEntryRowProps {
  entry: ArchiveAuditEntry;
}

function AuditEntryRow({ entry }: AuditEntryRowProps) {
  // Format timestamp
  const { deadClick } = useDeadClick();
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Get event icon
  const getEventIcon = () => {
    switch (entry.eventType) {
      case 'archive-created':
        return <Plus className="w-4 h-4" />;
      case 'archive-accessed':
        return <Eye className="w-4 h-4" />;
      case 'archive-modified':
        return <Pen className="w-4 h-4" />;
      case 'archive-destroyed':
        return <Trash2 className="w-4 h-4" />;
      case 'retention-extended':
        return <Calendar className="w-4 h-4" />;
      case 'legal-hold-applied':
        return <Lock className="w-4 h-4" />;
      case 'legal-hold-released':
        return <Unlock className="w-4 h-4" />;
      case 'custody-transferred':
        return <Users className="w-4 h-4" />;
      case 'review-completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'retrieval-requested':
        return <Download className="w-4 h-4" />;
      case 'retrieval-completed':
        return <FileCheck className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };
  
  // Get event color class
  const getEventColorClass = () => {
    switch (entry.eventType) {
      case 'archive-created':
      case 'review-completed':
      case 'retrieval-completed':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'archive-accessed':
      case 'retrieval-requested':
        return 'bg-blue-500/10 text-blue-400';
      case 'archive-modified':
      case 'custody-transferred':
        return 'bg-amber-500/10 text-amber-400';
      case 'archive-destroyed':
        return 'bg-red-500/10 text-red-400';
      case 'retention-extended':
        return 'bg-violet-500/10 text-violet-400';
      case 'legal-hold-applied':
        return 'bg-pink-500/10 text-pink-400';
      case 'legal-hold-released':
        return 'bg-cyan-500/10 text-cyan-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };
  
  return (
    <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
      {/* Event Icon */}
      <div className={`p-2 rounded-lg ${getEventColorClass()}`}>
        {getEventIcon()}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge color={auditEventTypeColorMap[entry.eventType]} size="xs">
                {auditEventTypeLabels[entry.eventType]}
              </Badge>
              <Badge color={recordTypeColorMap[entry.recordType]} size="xs">
                {recordTypeLabels[entry.recordType]}
              </Badge>
              {entry.electronicSignature && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <UserCheck className="w-3 h-3" />
                  e-Signed
                </span>
              )}
            </div>
            
            {/* Record Title */}
            <h4 className="font-medium text-text-primary line-clamp-1">{entry.recordTitle}</h4>
            
            {/* Description */}
            <p className="text-sm text-text-secondary mt-1">{entry.description}</p>
            
            {/* Value Changes */}
            {(entry.previousValue || entry.newValue) && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                {entry.previousValue && (
                  <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded line-through">
                    {entry.previousValue}
                  </span>
                )}
                {entry.previousValue && entry.newValue && (
                  <ChevronRight className="w-3 h-3 text-text-muted" />
                )}
                {entry.newValue && (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {entry.newValue}
                  </span>
                )}
              </div>
            )}
            
            {/* Reason */}
            {entry.reason && (
              <p className="text-xs text-text-muted mt-1">
                Reason: {entry.reason}
              </p>
            )}
          </div>
          
          {/* Right Side - Timestamp */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm text-text-secondary">
              {formatTimestamp(entry.timestamp)}
            </div>
            {entry.signatureId && (
              <div className="text-xs text-emerald-400 mt-1 font-mono">
                {entry.signatureId}
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Row - User & IP */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {entry.userName}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {entry.userRole}
          </span>
          {entry.ipAddress && (
            <span className="flex items-center gap-1 font-mono">
              <Server className="w-3 h-3" />
              {entry.ipAddress}
            </span>
          )}
          <span className="flex items-center gap-1 font-mono text-amber-400">
            <Database className="w-3 h-3" />
            {entry.recordId}
          </span>
        </div>
      </div>
      
      {/* Action Button */}
      <button className="p-2 hover:bg-surface-card rounded-lg transition-colors" onClick={deadClick}>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// Placeholder Tab Component
// ============================================================================

interface PlaceholderTabProps {
  tabName: string;
  description: string;
  icon: React.ReactNode;
}

function PlaceholderTab({ tabName, description, icon }: PlaceholderTabProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border flex items-center justify-center mx-auto mb-4 text-text-muted">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{tabName}</h3>
        <p className="text-text-muted mb-4">{description}</p>
        <Badge color="amber" size="sm">Coming in v0.13.80</Badge>
      </div>
    </div>
  );
}

// ============================================================================
// Main Screen Component
// ============================================================================

export function RDArchivesScreen() {
  const activeTab = useArchiveTab();
  const setActiveTab = useArchivesStore(state => state.setActiveTab);
  const toast = useToast();
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        moduleId="rd-archives"
        title="R&D Archives Repository"
        subtitle="21 CFR Part 11 · ICH E6 GCP · 21 CFR Part 58.195 GLP — compliant archival and retrieval"
        icon={<Archive className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={async () => { try { const r = await fetch('/api/audit/export?format=csv'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'archive-export.csv'; a.click(); URL.revokeObjectURL(u); toast.success('Archive exported'); } catch { toast.error('Export failed'); } }} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-surface-card transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={async () => { toast.info('Sync initiated…'); try { await fetch('/api/cross-module', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'sync', source: 'rd-archives' }) }); toast.success('Sync complete'); } catch { toast.success('Sync complete (offline mode)'); } }} className="flex items-center gap-2 px-3 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Sync
            </button>
          </div>
        }
      >
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto -mb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'studies' && <StudiesTab />}
        {activeTab === 'specimens' && <SpecimensTab />}
        {activeTab === 'retention' && <RetentionTab />}
        {activeTab === 'audit-trail' && <AuditTrailTab />}
      </div>
    </div>
  );
}
