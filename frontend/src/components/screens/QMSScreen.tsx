

import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart3, AlertTriangle, FileCheck, Shield, ClipboardCheck, ChevronRight, Plus, RefreshCw, CheckCircle2, XCircle, Clock, Calendar, Zap, Target, Activity, BookOpen, ChevronDown, ChevronUp, ArrowRight, GitBranch, FileText, History, Download, Lock, Unlock, Eye, Upload, Trash2, Copy, RotateCcw, Workflow, Link2, Package, Search, Building2, Truck, FolderOpen, Sparkles, Check } from 'lucide-react';
import { useQMSStore } from '@/store/useQMSStore';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import type { CAPA, CAPAStatus, CAPAType, Deviation, DeviationStatus, ChangeControl, ChangeControlStatus, QMSAudit, AuditStatus, AuditType, AuditFinding, FindingSeverity, TrainingAssignment, TrainingStatus, QMSSeverity, QMSPriority, ControlledDocument, DocumentVersion, ApprovalStatus, QMSDocumentType } from '@/store/qmsTypes';
// v177: Added ReturnBreadcrumb for cross-module navigation
// v180: Added UnifiedDocumentBrowser for Document Control
import { EmptyState as UIEmptyState } from '@/components/ui/EmptyState';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { UnifiedDocumentBrowser } from '@/components/ui/UnifiedDocumentBrowser';
import { useToast } from '@/components/ui/Toast';
// v0.43.8: ScrollableTabs for responsive tab bars
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import type { DocumentItem, DocumentFolder, DocumentStatus, DocumentCategory } from '@/components/ui/UnifiedDocumentBrowser';
import { StatCardGridSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { NewDeviationModal, NewCAPAModal, NewAuditModal, NewChangeControlModal, AssignTrainingModal, type NewDeviationInput, type NewCAPAInput, type NewAuditInput, type NewChangeControlInput, type AssignTrainingInput } from './QMSCreateModals';
// v186: Approval Workflow Visualization Dashboard
import { ApprovalWorkflowVisualizationDashboard } from './ApprovalWorkflowVisualization';
// v187: Risk Assessment Dashboard
import { RiskAssessmentDashboard } from './RiskAssessmentDashboard';
// v190: Risk-CAPA Integration Dashboard
import { RiskCAPAIntegrationDashboard } from './RiskCAPAIntegrationDashboard';
// v188: Audit Trail Dashboard (21 CFR Part 11)
import { AuditTrailDashboard } from './AuditTrailDashboard';
// v0.6.2: Quality Event Cascade Center
import { criticalDeviationCascade, qualityEventCategoryMeta, getQualityEventCascadeProgress, getQualityEventCriticalActions, getQualityEventRecentActivity, type QualityEventAction, type QualityEventStageSummary } from '@/data/quality-event-cascade-data';
import type { BadgeColor } from '@/components/ui/Badge';
// v0.15.2: Document Number Links to Document Control
import { DocumentNumberLink } from '@/components/documents/DocumentNumberLink';
// v0.32.1: AI Document Generation
import { CAPAInvestigationGenerator } from '@/components/qms/CAPAInvestigationGenerator';
import { DeviationReportGenerator } from '@/components/qms/DeviationReportGenerator';
import { bumpMinor, bumpMajor } from '@/utils/versionUtils';
import { QMSCascadeStrip } from '@/components/qms/QMSCascadeStrip';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppStore } from '@/store/useAppStore';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';
import { ElectronicSignatureModal } from '@/components/ui/ElectronicSignatureModal';
import type { SignatureContext } from '@/services/electronic-signature-service';
import { useDeadClick } from '@/hooks/useDeadClick';

type QMSTab = 'dashboard' | 'documents' | 'workflows' | 'risks' | 'risk-capa' | 'audit-trail' | 'quality-cascade' | 'deviations' | 'capas' | 'audits' | 'training' | 'change-control';
interface FilterState { product?: string; therapeuticArea?: string; modality?: string; region?: string; stage?: string; }

// v0.42.24: QMS Statistics interface
interface QMSStats {
  openDeviations: number;
  criticalDeviations: number;
  openCAPAs: number;
  overdueCAPAs: number;
  upcomingAudits: number;
  openFindings: number;
  overdueTraining: number;
  pendingCC: number;
  trainingCompliance: number;
}

// ============================================================================
// COLOR MAPS - Semantic color mapping for all QMS statuses
// ============================================================================

const severityColorMap: Record<QMSSeverity, BadgeColor> = {
  'critical': 'red', 'major': 'orange', 'minor': 'amber',
};

const priorityColorMap: Record<QMSPriority, BadgeColor> = {
  'critical': 'red', 'high': 'orange', 'medium': 'amber', 'low': 'slate',
};

const deviationStatusColorMap: Record<DeviationStatus, BadgeColor> = {
  'draft': 'slate', 'pending-classification': 'blue', 'classified': 'purple', 'investigation': 'violet',
  'pending-approval': 'amber', 'approved': 'cyan', 'implemented': 'teal', 'closed': 'emerald', 'cancelled': 'gray',
};

const capaStatusColorMap: Record<CAPAStatus, BadgeColor> = {
  'draft': 'slate', 'pending-approval': 'blue', 'approved': 'purple', 'investigation': 'violet',
  'action-planning': 'cyan', 'implementation': 'amber', 'effectiveness-check': 'teal',
  'closed': 'emerald', 'closed-ineffective': 'red', 'cancelled': 'gray',
};

const capaTypeColorMap: Record<CAPAType, BadgeColor> = { 'corrective': 'orange', 'preventive': 'blue', 'both': 'purple' };

const auditStatusColorMap: Record<AuditStatus, BadgeColor> = {
  'planned': 'slate', 'scheduled': 'blue', 'preparation': 'purple', 'in-progress': 'violet',
  'report-draft': 'amber', 'report-review': 'cyan', 'closed': 'emerald', 'cancelled': 'gray',
};

const auditTypeColorMap: Record<AuditType, BadgeColor> = {
  'internal': 'blue', 'external': 'purple', 'regulatory': 'red', 'customer': 'amber',
  'supplier': 'cyan', 'certification': 'emerald', 'self-inspection': 'slate',
};

const findingSeverityColorMap: Record<FindingSeverity, BadgeColor> = {
  'critical': 'red', 'major': 'orange', 'minor': 'amber', 'observation': 'blue', 'opportunity': 'emerald',
};

const trainingStatusColorMap: Record<TrainingStatus, BadgeColor> = {
  'not-started': 'slate', 'in-progress': 'blue', 'completed': 'emerald', 'failed': 'red', 'expired': 'orange', 'exempted': 'purple',
};

const changeControlStatusColorMap: Record<ChangeControlStatus, BadgeColor> = {
  'draft': 'slate', 'pending-review': 'blue', 'impact-assessment': 'purple', 'pending-approval': 'amber',
  'approved': 'cyan', 'implementation': 'violet', 'verification': 'teal', 'closed': 'emerald', 'rejected': 'red', 'cancelled': 'gray',
};

// v180: Document Control color maps
const documentStatusColorMap: Record<ApprovalStatus, BadgeColor> = {
  'draft': 'slate', 'pending-review': 'amber', 'approved': 'blue', 'rejected': 'red', 
  'effective': 'emerald', 'superseded': 'purple', 'retired': 'gray',
};

const documentTypeColorMap: Record<QMSDocumentType, BadgeColor> = {
  'sop': 'blue', 'work-instruction': 'cyan', 'form': 'teal', 'template': 'purple',
  'policy': 'amber', 'specification': 'orange', 'protocol': 'emerald', 'report': 'slate',
  'record': 'gray', 'manual': 'violet',
};

// ============================================================================
// BADGE HELPER FUNCTIONS - Exported for use in views
// ============================================================================

export const getSeverityBadge = (severity: QMSSeverity) => <Badge color={severityColorMap[severity]} size="xs">{severity.toUpperCase()}</Badge>;
export const getPriorityBadge = (priority: QMSPriority) => <Badge color={priorityColorMap[priority]} size="xs">{priority.toUpperCase()}</Badge>;
export const getDeviationStatusBadge = (status: DeviationStatus) => <Badge color={deviationStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
export const getCAPAStatusBadge = (status: CAPAStatus) => <Badge color={capaStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
export const getCAPATypeBadge = (type: CAPAType) => <Badge color={capaTypeColorMap[type]} size="xs">{type}</Badge>;
export const getAuditStatusBadge = (status: AuditStatus) => <Badge color={auditStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
export const getAuditTypeBadge = (type: AuditType) => <Badge color={auditTypeColorMap[type]} size="xs">{type.replace(/-/g, ' ')}</Badge>;
export const getFindingSeverityBadge = (severity: FindingSeverity) => <Badge color={findingSeverityColorMap[severity]} size="xs">{severity}</Badge>;
export const getTrainingStatusBadge = (status: TrainingStatus) => <Badge color={trainingStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
export const getChangeControlStatusBadge = (status: ChangeControlStatus) => <Badge color={changeControlStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;

// v180: Document Control badge helpers
export const getDocumentStatusBadge = (status: ApprovalStatus) => <Badge color={documentStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
export const getDocumentTypeBadge = (type: QMSDocumentType) => <Badge color={documentTypeColorMap[type]} size="xs">{type.replace(/-/g, ' ')}</Badge>;

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatItem = ({ label, value, subValue, color = 'slate' }: { label: string; value: string; subValue?: string; color?: string }) => {
  const colors: Record<string, string> = { emerald: 'text-emerald-400', cyan: 'text-cyan-400', blue: 'text-blue-400', amber: 'text-amber-400', red: 'text-red-400', orange: 'text-orange-400', slate: 'text-slate-400', violet: 'text-violet-400', purple: 'text-purple-400' };
  return (<div className="flex flex-col min-w-0"><div className="text-xs text-text-muted whitespace-nowrap">{label}</div><span className={`text-lg font-semibold ${colors[color]}`}>{value}</span>{subValue && <div className="text-xs text-text-muted">{subValue}</div>}</div>);
};

const Divider = () => <div className="w-px h-10 bg-border" />;

const StatsBar = ({ stats }: { stats: { openDeviations: number; criticalDeviations: number; openCAPAs: number; overdueCAPAs: number; openFindings: number; upcomingAudits: number; trainingCompliance: number; overdueTraining: number; pendingCC: number } }) => (
  <div className="bg-surface-elevated border-b border-border px-6 py-3">
    <div className="flex items-center gap-6 overflow-x-auto">
      <StatItem label="Open Deviations" value={String(stats.openDeviations)} subValue={stats.criticalDeviations > 0 ? `${stats.criticalDeviations} critical` : undefined} color={stats.criticalDeviations > 0 ? 'red' : 'amber'} />
      <Divider /><StatItem label="Open CAPAs" value={String(stats.openCAPAs)} subValue={stats.overdueCAPAs > 0 ? `${stats.overdueCAPAs} overdue` : undefined} color={stats.overdueCAPAs > 0 ? 'red' : 'blue'} />
      <Divider /><StatItem label="Open Findings" value={String(stats.openFindings)} color={stats.openFindings > 5 ? 'orange' : 'cyan'} />
      <Divider /><StatItem label="Upcoming Audits" value={String(stats.upcomingAudits)} color="purple" />
      <Divider /><StatItem label="Training Compliance" value={`${stats.trainingCompliance}%`} subValue={stats.overdueTraining > 0 ? `${stats.overdueTraining} overdue` : undefined} color={stats.trainingCompliance >= 95 ? 'emerald' : stats.trainingCompliance >= 80 ? 'amber' : 'red'} />
      <Divider /><StatItem label="Pending Changes" value={String(stats.pendingCC)} color="violet" />
    </div>
  </div>
);

const QMSEmptyState = ({ onLoad }: { onLoad: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6"><Shield className="w-10 h-10 text-amber-500" /></div>
    <h2 className="text-2xl font-semibold text-text-primary mb-2">Quality Management System</h2>
    <p className="text-text-secondary max-w-md mb-8">Manage deviations, CAPAs, audits, training, and change control.</p>
    <Button onClick={onLoad} variant="primary" icon={<Zap className="w-5 h-5" />}>Load Sample QMS Data</Button>
  </div>
);

// v162: Clickable KPI Card - stat cards now navigate and filter
export const KPICard = ({ icon, label, value, subValue, color = 'slate', onClick, active }: { icon: React.ReactNode; label: string; value: number | string; subValue?: string; color?: string; onClick?: () => void; active?: boolean }) => {
  const bg: Record<string, string> = { red: 'bg-red-500/10', orange: 'bg-orange-500/10', amber: 'bg-amber-500/10', emerald: 'bg-emerald-500/10', cyan: 'bg-cyan-500/10', blue: 'bg-blue-500/10', purple: 'bg-purple-500/10', slate: 'bg-slate-500/10', violet: 'bg-violet-500/10' };
  const text: Record<string, string> = { red: 'text-red-400', orange: 'text-orange-400', amber: 'text-amber-400', emerald: 'text-emerald-400', cyan: 'text-cyan-400', blue: 'text-blue-400', purple: 'text-purple-400', slate: 'text-slate-400', violet: 'text-violet-400' };
  const ringColor: Record<string, string> = { red: 'ring-red-500/50', orange: 'ring-orange-500/50', amber: 'ring-amber-500/50', emerald: 'ring-emerald-500/50', cyan: 'ring-cyan-500/50', blue: 'ring-blue-500/50', purple: 'ring-purple-500/50', slate: 'ring-slate-500/50', violet: 'ring-violet-500/50' };
  const isClickable = !!onClick;
  return (
    <Card className={`${isClickable ? 'cursor-pointer hover:bg-surface-card/50 transition-all' : ''} ${active ? `ring-2 ${ringColor[color]}` : ''}`}>
      <CardContent className="p-4" onClick={onClick}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${bg[color]} ${text[color]}`}>{icon}</div>
          <span className="text-sm text-text-secondary">{label}</span>
          {isClickable && <ChevronRight className="w-4 h-4 text-text-muted ml-auto" />}
        </div>
        <div className={`text-2xl font-bold ${text[color]}`}>{value}</div>
        {subValue && <div className="text-xs text-text-muted mt-1">{subValue}</div>}
      </CardContent>
    </Card>
  );
};

export const CollapsibleSection = ({ title, icon, count, expanded, onToggle, children }: { title: string; icon: React.ReactNode; count: number; expanded: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <Card><button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors rounded-t-lg">{icon}<span className="font-medium text-text-primary">{title}</span><Badge color="slate" size="xs">{count}</Badge><div className="flex-1" />{expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}</button>{expanded && <CardContent className="pt-0">{children}</CardContent>}</Card>
);

export const InfoItem = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (<div><div className="text-xs text-text-muted mb-0.5">{label}</div><div className={`text-sm ${highlight ? 'text-red-400' : 'text-text-primary'}`}>{value}</div></div>);

// ============================================================================
// v0.6.2: QUALITY CASCADE CENTER - Quality Event Propagation Dashboard
// "A critical deviation is identified. Within 60 seconds, 42 downstream actions are activated."
// ============================================================================

// Local metric card for cascade visualization
function CascadeMetricCard({ label, value, subtext, icon: Icon, color = 'blue' }: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };
  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs opacity-60 mt-1">{subtext}</div>}
    </div>
  );
}

function QualityCascadeCenter() {
  const cascade = criticalDeviationCascade;
  const progress = getQualityEventCascadeProgress(cascade);
  const criticalActions = getQualityEventCriticalActions(cascade);
  const recentActivity = getQualityEventRecentActivity(cascade, 8);

  // Calculate time since event
  const eventTime = new Date(cascade.triggeredAt);
  const now = new Date();
  const minutesSinceEvent = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
  const timeSinceEvent = minutesSinceEvent < 60 ? `${minutesSinceEvent} min ago` : `${Math.floor(minutesSinceEvent / 60)}h ${minutesSinceEvent % 60}m ago`;

  // Days until resolution
  const resolutionDate = new Date(cascade.estimatedResolutionDate);
  const daysUntilResolution = Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-amber-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500/20 text-red-400 border-red-500/30',
      'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'standard': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'low': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[priority]}`}>{priority.toUpperCase()}</span>;
  };

  const getActionStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'triggered': 'bg-purple-500/20 text-purple-400',
      'in-progress': 'bg-blue-500/20 text-blue-400',
      'pending-review': 'bg-amber-500/20 text-amber-400',
      'completed': 'bg-emerald-500/20 text-emerald-400',
      'verified': 'bg-cyan-500/20 text-cyan-400',
      'escalated': 'bg-red-500/20 text-red-400',
      'blocked': 'bg-red-500/20 text-red-400',
    };
    return <span className={`px-2 py-0.5 text-xs rounded ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>{status.replace(/-/g, ' ')}</span>;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'event-classification': <AlertTriangle className="w-4 h-4" />,
      'root-cause': <Search className="w-4 h-4" />,
      'batch-impact': <Package className="w-4 h-4" />,
      'clinical-notification': <Building2 className="w-4 h-4" />,
      'capa-initiation': <Shield className="w-4 h-4" />,
      'regulatory-assessment': <FileText className="w-4 h-4" />,
      'supply-impact': <Truck className="w-4 h-4" />,
      'tmf-documentation': <FolderOpen className="w-4 h-4" />,
      'audit-readiness': <ClipboardCheck className="w-4 h-4" />,
      'resolution-tracking': <CheckCircle2 className="w-4 h-4" />,
    };
    return icons[category] || <Activity className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-900/40 via-orange-900/30 to-amber-900/20 rounded-xl p-6 border border-red-500/30">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <span className="text-red-400 font-mono text-sm">{cascade.eventCode}</span>
                <span className="text-text-secondary mx-2">•</span>
                <span className="text-amber-400 text-sm">{cascade.eventTitle}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Quality Event Cascade Center</h2>
            <p className="text-text-secondary">
              {cascade.productName} • {cascade.siteName} • Batch {cascade.batchNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-400">{cascade.totalActions}</div>
            <div className="text-sm text-text-secondary">Actions Triggered</div>
            <div className="text-xs text-amber-400 mt-1">{timeSinceEvent}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        <CascadeMetricCard 
          label="Time to Response" 
          value="60 sec" 
          subtext="vs 3 weeks legacy" 
          icon={Clock} 
          color="green" 
        />
        <CascadeMetricCard 
          label="Modules Impacted" 
          value="9" 
          subtext="Cross-R&D cascade" 
          icon={Link2} 
          color="purple" 
        />
        <CascadeMetricCard 
          label="Automation Rate" 
          value={`${progress.automationRate}%`} 
          subtext={`${cascade.automatedActions}/${cascade.totalActions} auto`} 
          icon={Zap} 
          color="cyan" 
        />
        <CascadeMetricCard 
          label="Critical Items" 
          value={progress.criticalPending} 
          subtext="Require attention" 
          icon={AlertTriangle} 
          color="red" 
        />
        <CascadeMetricCard 
          label="Completion" 
          value={`${progress.percentage}%`} 
          subtext={`${cascade.completedActions}/${cascade.totalActions}`} 
          icon={CheckCircle2} 
          color="blue" 
        />
        <CascadeMetricCard 
          label="Target Resolution" 
          value={`${daysUntilResolution}d`} 
          subtext="Jan 15, 2026" 
          icon={Calendar} 
          color="amber" 
        />
      </div>

      {/* Cascade Pipeline */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-amber-400" />
            Quality Event Cascade Pipeline
          </h3>
          <div className="relative">
            {/* Pipeline visualization */}
            <div className="flex items-start gap-2 overflow-x-auto pb-4">
              {cascade.stages.map((stage, idx) => (
                <div key={stage.category} className="flex items-center">
                  <div className={`min-w-[140px] p-3 rounded-lg border ${
                    stage.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    stage.status === 'in-progress' ? 'bg-blue-500/10 border-blue-500/30' :
                    stage.status === 'pending' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-gray-500/10 border-gray-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${
                        stage.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        stage.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        stage.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {getCategoryIcon(stage.category)}
                      </div>
                      <span className="text-xs font-medium text-text-primary truncate">{stage.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${
                        stage.status === 'completed' ? 'text-emerald-400' :
                        stage.status === 'in-progress' ? 'text-blue-400' :
                        'text-text-secondary'
                      }`}>
                        {stage.completedActions}/{stage.totalActions}
                      </span>
                      {stage.criticalCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
                          {stage.criticalCount} critical
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          stage.status === 'completed' ? 'bg-emerald-500' :
                          stage.status === 'in-progress' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`}
                        style={{ width: `${(stage.completedActions / stage.totalActions) * 100}%` }}
                      />
                    </div>
                  </div>
                  {idx < cascade.stages.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-text-secondary mx-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout: Critical Actions & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Critical Actions */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Critical Actions Pending
              <span className="ml-auto text-sm font-normal text-red-400">{criticalActions.length} items</span>
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {criticalActions.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p>All critical actions resolved</p>
                </div>
              ) : (
                criticalActions.map(action => (
                  <div key={action.id} className="p-3 bg-surface-elevated rounded-lg border border-red-500/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(action.category)}
                        <span className="text-sm font-medium text-text-primary">{action.title}</span>
                      </div>
                      {getPriorityBadge(action.priority)}
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{action.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {getActionStatusBadge(action.status)}
                        <span className="text-text-secondary">{qualityEventCategoryMeta[action.category]?.label ?? action.category}</span>
                      </div>
                      {action.assignedTo && (
                        <span className="text-cyan-400">{action.assignedTo}</span>
                      )}
                    </div>
                    {action.dueDate && (
                      <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {new Date(action.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Recent Activity
              <span className="ml-auto text-sm font-normal text-emerald-400">{recentActivity.length} completed</span>
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.map(action => (
                <div key={action.id} className="p-3 bg-surface-elevated rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-500/20 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-text-primary">{action.title}</span>
                    </div>
                    {action.automatedAction && (
                      <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded">AUTO</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mb-2 pl-6">{action.description}</p>
                  <div className="flex items-center justify-between text-xs pl-6">
                    <span className="text-text-secondary">{qualityEventCategoryMeta[action.category]?.label ?? action.category}</span>
                    <span className="text-emerald-400">
                      {action.completedAt && new Date(action.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {action.outputArtifacts && action.outputArtifacts.length > 0 && (
                    <div className="mt-2 pl-6 flex flex-wrap gap-1">
                      {action.outputArtifacts.map((artifact, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">
                          {artifact}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* R&D Connected Callout */}
      <div className="bg-gradient-to-r from-amber-900/30 via-orange-900/20 to-red-900/30 rounded-xl p-6 border border-amber-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">R&D Connected in Action</h3>
            <p className="text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">A critical deviation is identified at Site 042.</span> In legacy systems, 
              this triggers 3 weeks of email chains and spreadsheet tracking. In Ligature, <span className="text-amber-400 font-medium">DEV-2026-0147</span> was 
              classified: <span className="text-emerald-400">Affected batches quarantined.</span>{' '}
              <span className="text-blue-400">Clinical sites notified.</span>{' '}
              <span className="text-purple-400">CAPA initiated.</span>{' '}
              <span className="text-cyan-400">Regulatory impact assessed.</span>{' '}
              <span className="text-orange-400">Supply chain alerted.</span>{' '}
              <span className="text-pink-400">TMF updated. Audit trail sealed.</span>{' '}
              That's not just quality management — <span className="text-amber-400 font-bold">that's R&D Connected.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW - v162: Clickable stat cards for drill-down navigation
// ============================================================================

type QMSFilter = 'all' | 'critical-deviations' | 'overdue-capas' | 'open-findings' | 'overdue-training';

function DashboardView({ stats, deviations, capas, audits, assignments, expandedSections, toggleSection, onSelectDeviation, onSelectCAPA, onSelectAudit, onNavigateTab, activeFilter, setActiveFilter }: { stats: QMSStats; deviations: Deviation[]; capas: CAPA[]; audits: QMSAudit[]; assignments: TrainingAssignment[]; expandedSections: Set<string>; toggleSection: (s: string) => void; onSelectDeviation: (id: string) => void; onSelectCAPA: (id: string) => void; onSelectAudit: (id: string) => void; onNavigateTab: (tab: QMSTab) => void; activeFilter: QMSFilter; setActiveFilter: (f: QMSFilter) => void }) {
    const { deadClick } = useDeadClick();
  const recentDeviations = useMemo(() => [...deviations].filter(d => d.status !== 'closed' && d.status !== 'cancelled').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [deviations]);
  const recentCAPAs = useMemo(() => [...capas].filter(c => c.status !== 'closed' && c.status !== 'cancelled').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [capas]);
  const upcomingAudits = useMemo(() => [...audits].filter(a => ['planned', 'scheduled'].includes(a.status)).sort((a, b) => new Date(a.scheduledStartDate).getTime() - new Date(b.scheduledStartDate).getTime()).slice(0, 5), [audits]);
  const overdueAssignments = useMemo(() => assignments.filter(a => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()).slice(0, 5), [assignments]);
  const alerts = useMemo(() => { const list: { id: string; severity: 'critical' | 'warning'; message: string; action: () => void }[] = []; if (stats.criticalDeviations > 0) list.push({ id: 'cd', severity: 'critical', message: `${stats.criticalDeviations} critical deviation(s) require immediate attention`, action: () => { setActiveFilter('critical-deviations'); onNavigateTab('deviations'); } }); if (stats.overdueCAPAs > 0) list.push({ id: 'oc', severity: 'critical', message: `${stats.overdueCAPAs} CAPA(s) are past target completion date`, action: () => { setActiveFilter('overdue-capas'); onNavigateTab('capas'); } }); if (stats.overdueTraining > 0) list.push({ id: 'ot', severity: 'warning', message: `${stats.overdueTraining} training assignment(s) are overdue`, action: () => { setActiveFilter('overdue-training'); onNavigateTab('training'); } }); if (stats.openFindings > 5) list.push({ id: 'of', severity: 'warning', message: `${stats.openFindings} audit finding(s) remain open`, action: () => { setActiveFilter('open-findings'); onNavigateTab('audits'); } }); return list; }, [stats, onNavigateTab, setActiveFilter]);
  // Hero CAPA: most urgent open CAPA
  const heroCapa = useMemo(() => {
    const open = capas.filter(c => c.status !== 'closed' && c.status !== 'cancelled' && c.status !== 'closed-ineffective');
    return (
      open.find(c => c.severity === 'critical') ??
      open.find(c => c.priority === 'critical') ??
      open.find(c => new Date(c.targetCompletionDate) < new Date()) ??
      open[0] ?? null
    );
  }, [capas]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* v0.44.47: Cascade strip — tasks targeting QMS from other modules */}
      <QMSCascadeStrip
        onStepClick={(step, chain) => {
          // Navigate to CAPAs tab to open an investigation
          onNavigateTab('capas');
        }}
      />

      {/* Alerts FIRST — before KPI cards (urgency order) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <Card key={a.id} className={`${a.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'} cursor-pointer hover:opacity-80 transition-opacity`}>
              <CardContent className="p-4 flex items-center gap-4" onClick={a.action}>
                {a.severity === 'critical' ? <XCircle className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                <span className="flex-1 text-sm text-text-primary">{a.message}</span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* v0.44.47: Hero CAPA card — most urgent open CAPA */}
      {heroCapa && (
        <div
          onClick={() => onSelectCAPA(heroCapa.id)}
          className={`
            flex items-start justify-between gap-3 p-4 rounded-xl border-l-4 border cursor-pointer
            transition-all duration-150 hover:-translate-y-px hover:shadow-lg
            ${heroCapa.severity === 'critical'
              ? 'border-l-red-500 border-red-500/25 bg-red-500/5 hover:shadow-red-500/10'
              : 'border-l-blue-500 border-blue-500/20 bg-blue-500/5 hover:shadow-blue-500/10'
            }
          `}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${heroCapa.severity === 'critical' ? 'text-red-400' : 'text-blue-400'}`}>
                Most Urgent CAPA
              </span>
              {getSeverityBadge(heroCapa.severity)}
              {getCAPAStatusBadge(heroCapa.status)}
            </div>
            <h3 className="text-sm font-semibold text-text-primary leading-snug mb-1 truncate">
              {heroCapa.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-mono text-xs text-text-muted">{heroCapa.capaNumber}</span>
              {new Date(heroCapa.targetCompletionDate) < new Date() && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelectCAPA(heroCapa.id); }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${heroCapa.severity === 'critical'
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
          >
            <Shield className="w-4 h-4" />
            Investigate
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          icon={<AlertTriangle className="w-5 h-5" />} 
          label="Open Deviations" 
          value={stats.openDeviations} 
          subValue={stats.criticalDeviations > 0 ? `${stats.criticalDeviations} critical` : undefined} 
          color={stats.criticalDeviations > 0 ? 'red' : 'amber'} 
          onClick={() => onNavigateTab('deviations')}
        />
        <KPICard 
          icon={<Shield className="w-5 h-5" />} 
          label="Open CAPAs" 
          value={stats.openCAPAs} 
          subValue={stats.overdueCAPAs > 0 ? `${stats.overdueCAPAs} overdue` : undefined} 
          color={stats.overdueCAPAs > 0 ? 'red' : 'blue'} 
          onClick={() => onNavigateTab('capas')}
        />
        <KPICard 
          icon={<ClipboardCheck className="w-5 h-5" />} 
          label="Open Findings" 
          value={stats.openFindings} 
          color={stats.openFindings > 5 ? 'orange' : 'cyan'} 
          onClick={() => onNavigateTab('audits')}
        />
        <KPICard 
          icon={<BookOpen className="w-5 h-5" />} 
          label="Training Compliance" 
          value={`${stats.trainingCompliance}%`} 
          color={stats.trainingCompliance >= 95 ? 'emerald' : stats.trainingCompliance >= 80 ? 'amber' : 'red'} 
          onClick={() => onNavigateTab('training')}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleSection title="Recent Deviations" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} count={recentDeviations.length} expanded={expandedSections.has('deviations')} onToggle={() => toggleSection('deviations')}><div className="space-y-2">{recentDeviations.length === 0 ? <div className="text-sm text-text-muted py-4 text-center">No open deviations</div> : recentDeviations.map(d => (<button key={d.id} onClick={() => onSelectDeviation(d.id)} className="w-full flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-card transition-colors text-left"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-text-muted">{d.deviationNumber}</span>{getSeverityBadge(d.severity)}</div><div className="text-sm text-text-primary truncate">{d.title}</div></div>{getDeviationStatusBadge(d.status)}<ChevronRight className="w-4 h-4 text-text-muted" /></button>))}</div></CollapsibleSection>
        <CollapsibleSection title="Recent CAPAs" icon={<Shield className="w-4 h-4 text-blue-400" />} count={recentCAPAs.length} expanded={expandedSections.has('capas')} onToggle={() => toggleSection('capas')}><div className="space-y-2">{recentCAPAs.length === 0 ? <div className="text-sm text-text-muted py-4 text-center">No open CAPAs</div> : recentCAPAs.map(c => (<button key={c.id} onClick={() => onSelectCAPA(c.id)} className="w-full flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-card transition-colors text-left"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-text-muted">{c.capaNumber}</span>{getSeverityBadge(c.severity)}</div><div className="text-sm text-text-primary truncate">{c.title}</div></div>{getCAPAStatusBadge(c.status)}<ChevronRight className="w-4 h-4 text-text-muted" /></button>))}</div></CollapsibleSection>
        <CollapsibleSection title="Upcoming Audits" icon={<ClipboardCheck className="w-4 h-4 text-purple-400" />} count={upcomingAudits.length} expanded={expandedSections.has('audits')} onToggle={() => toggleSection('audits')}><div className="space-y-2">{upcomingAudits.length === 0 ? <div className="text-sm text-text-muted py-4 text-center">No upcoming audits</div> : upcomingAudits.map(a => (<button key={a.id} onClick={() => onSelectAudit(a.id)} className="w-full flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-card transition-colors text-left"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-text-muted">{a.auditNumber}</span><Calendar className="w-3 h-3 text-text-muted" /><span className="text-xs text-text-muted">{a.scheduledStartDate}</span></div><div className="text-sm text-text-primary truncate">{a.title}</div></div>{getAuditStatusBadge(a.status)}<ChevronRight className="w-4 h-4 text-text-muted" /></button>))}</div></CollapsibleSection>
        <CollapsibleSection title="Overdue Training" icon={<BookOpen className="w-4 h-4 text-red-400" />} count={overdueAssignments.length} expanded={expandedSections.has('training')} onToggle={() => toggleSection('training')}><div className="space-y-2">{overdueAssignments.length === 0 ? <div className="text-sm text-text-muted py-4 text-center">No overdue training</div> : overdueAssignments.map(a => (<div key={a.id} className="flex items-center gap-3 p-3 bg-surface rounded-lg"><div className="flex-1 min-w-0"><div className="text-sm text-text-primary truncate">{a.courseTitle}</div><div className="flex items-center gap-2 mt-1 text-xs text-text-muted"><span>{a.userName}</span><span className="text-red-400">Due: {a.dueDate}</span></div></div>{getTrainingStatusBadge(a.status)}</div>))}</div></CollapsibleSection>
      </div>
    </div>
  );
}

// ============================================================================
// DEVIATIONS VIEW
// ============================================================================

// ============================================================================
// v0.34.3: BATCH CAPA CREATION MODAL
// ============================================================================

function BatchCAPAModal({ 
  isOpen, 
  onClose, 
  selectedDeviations, 
  deviations,
  onCreate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  selectedDeviations: Set<string>;
  deviations: Deviation[];
  onCreate: (capaType: 'corrective' | 'preventive' | 'both', linkedDeviationIds: string[]) => void;
}) {
  const [capaType, setCAPAType] = useState<'corrective' | 'preventive' | 'both'>('corrective');
  const [commonTitle, setCommonTitle] = useState('');
  
  const selectedDeviationsList = deviations.filter(d => selectedDeviations.has(d.id));
  const highestSeverity = selectedDeviationsList.reduce((acc, d) => {
    if (d.severity === 'critical') return 'critical';
    if (d.severity === 'major' && acc !== 'critical') return 'major';
    return acc;
  }, 'minor' as 'critical' | 'major' | 'minor');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-surface-elevated border border-border rounded-xl shadow-xl w-[700px] max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Create Batch CAPAs</h2>
              <p className="text-sm text-text-muted">{selectedDeviations.size} deviations selected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-card rounded">
            <AlertTriangle className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 overflow-auto max-h-[calc(85vh-200px)]">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-surface-card p-3 rounded-lg border border-border">
              <div className="text-xs text-text-muted mb-1">Deviations</div>
              <div className="text-xl font-bold text-accent-amber">{selectedDeviations.size}</div>
            </div>
            <div className="bg-surface-card p-3 rounded-lg border border-border">
              <div className="text-xs text-text-muted mb-1">Highest Severity</div>
              <Badge color={highestSeverity === 'critical' ? 'red' : highestSeverity === 'major' ? 'orange' : 'amber'} size="sm">
                {highestSeverity.toUpperCase()}
              </Badge>
            </div>
            <div className="bg-surface-card p-3 rounded-lg border border-border">
              <div className="text-xs text-text-muted mb-1">CAPAs to Create</div>
              <div className="text-xl font-bold text-accent-blue">{selectedDeviations.size}</div>
            </div>
          </div>
          
          {/* CAPA Type Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-text-primary mb-2 block">CAPA Type for All</label>
            <div className="flex gap-2">
              {(['corrective', 'preventive', 'both'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCAPAType(type)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize flex-1 transition-colors ${
                    capaType === type 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-card border border-border text-text-secondary hover:border-accent-blue/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          {/* Common Title (optional) */}
          <div className="mb-6">
            <label className="text-sm font-medium text-text-primary mb-2 block">Common Title Prefix (optional)</label>
            <input
              type="text"
              value={commonTitle}
              onChange={(e) => setCommonTitle(e.target.value)}
              placeholder="e.g., Q1 2026 Batch Remediation"
              className="w-full px-3 py-2 rounded-lg bg-surface-card border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>
          
          {/* Selected Deviations List */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">Linked Deviations</label>
            <div className="space-y-2 max-h-[200px] overflow-auto">
              {selectedDeviationsList.map(deviation => (
                <div key={deviation.id} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg border border-border">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">{deviation.deviationNumber}</span>
                      {getSeverityBadge(deviation.severity)}
                    </div>
                    <div className="text-sm text-text-primary truncate">{deviation.title}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div className="text-xs text-accent-blue">→ CAPA</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
          <div className="text-sm text-text-muted">
            This will create {selectedDeviations.size} new CAPA{selectedDeviations.size > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              variant="primary" 
              icon={<Shield className="w-4 h-4" />}
              onClick={() => {
                onCreate(capaType, Array.from(selectedDeviations));
                onClose();
              }}
            >
              Create {selectedDeviations.size} CAPA{selectedDeviations.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEVIATIONS VIEW (v0.34.3: Updated with batch selection)
// ============================================================================

function DeviationsView({ deviations, selected, searchQuery, setSearchQuery, onSelect, onNew, selectedForBatch, onToggleBatchSelect, onOpenBatchModal }: { deviations: Deviation[]; selected: Deviation | null; searchQuery: string; setSearchQuery: (q: string) => void; onSelect: (id: string | null) => void; onNew: () => void; selectedForBatch: Set<string>; onToggleBatchSelect: (id: string) => void; onOpenBatchModal: () => void }) {
  return (
    <div className="flex gap-6 h-full">
      <div className="w-[420px] flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search deviations..." className="flex-1" />
          <CapabilityGate moduleId="qms" capability="author" inline>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>New</Button>
          </CapabilityGate>
        </div>
        
        {/* Batch CAPA Action Bar */}
        {selectedForBatch.size > 0 && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">{selectedForBatch.size} selected</span>
            </div>
            <Button variant="primary" size="sm" icon={<Shield className="w-4 h-4" />} onClick={onOpenBatchModal}>
              Create CAPAs
            </Button>
          </div>
        )}
        
        <div className="flex-1 overflow-auto space-y-2">
          {deviations.length === 0 ? (
            <UIEmptyState icon={AlertTriangle} title="No deviations found" description="Try adjusting your search" size="sm" />
          ) : (
            deviations.map(d => (
              <div key={d.id} className="flex items-start gap-2">
                {/* Checkbox for batch selection */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleBatchSelect(d.id); }}
                  className={`mt-4 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    selectedForBatch.has(d.id) 
                      ? 'bg-amber-500 border-amber-500' 
                      : 'border-border hover:border-amber-500/50'
                  }`}
                >
                  {selectedForBatch.has(d.id) && <Check className="w-3 h-3 text-white" />}
                </button>
                
                <button 
                  onClick={() => onSelect(d.id)} 
                  className={`flex-1 flex flex-col p-4 rounded-lg border transition-colors text-left ${
                    selected?.id === d.id 
                      ? 'bg-amber-500/10 border-amber-500/50' 
                      : 'bg-surface-card border-border hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-text-muted font-mono">{d.deviationNumber}</span>
                    {getSeverityBadge(d.severity)}
                    {getDeviationStatusBadge(d.status)}
                  </div>
                  <div className="text-sm text-text-primary font-medium mb-2">{d.title}</div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{d.category}</span>
                    <span>•</span>
                    <span>{d.department}</span>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <Card className="flex-1 overflow-auto">{selected ? <CardContent className="p-4 md:p-6"><div className="flex items-center gap-2 mb-2"><span className="text-sm text-text-muted font-mono">{selected.deviationNumber}</span>{getSeverityBadge(selected.severity)}{getDeviationStatusBadge(selected.status)}</div><h2 className="text-xl font-semibold text-text-primary mb-6">{selected.title}</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6"><InfoItem label="Type" value={selected.deviationType} /><InfoItem label="Category" value={selected.category} /><InfoItem label="Department" value={selected.department.replace(/-/g, ' ')} /><InfoItem label="Owner" value={selected.ownerName} /></div><div className="mb-6"><h3 className="text-sm font-medium text-text-primary mb-2">Description</h3><p className="text-sm text-text-secondary bg-surface p-4 rounded-lg">{selected.description}</p></div><div className="mb-6"><DeviationReportGenerator deviation={selected} /></div>{selected.immediateActions.length > 0 && <div><h3 className="text-sm font-medium text-text-primary mb-2">Immediate Actions ({selected.immediateActions.length})</h3><div className="space-y-2">{selected.immediateActions.map(a => (<div key={a.id} className="flex items-start gap-3 p-3 bg-surface rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /><div><p className="text-sm text-text-primary">{a.description}</p><p className="text-xs text-text-muted mt-1">{a.takenBy} • {a.takenAt}</p></div></div>))}</div></div>}</CardContent> : <div className="h-full flex items-center justify-center"><UIEmptyState icon={AlertTriangle} title="Select a deviation" description="Choose a deviation from the list to view details" /></div>}</Card>
    </div>
  );
}

// ============================================================================
// CAPAs VIEW
// ============================================================================

function CAPAsView({ capas, selected, searchQuery, setSearchQuery, onSelect, onNew, onApproveCAPA, capaSignedIds }: { capas: CAPA[]; selected: CAPA | null; searchQuery: string; setSearchQuery: (q: string) => void; onSelect: (id: string | null) => void; onNew: () => void; onApproveCAPA?: (capaId: string, capaNumber: string) => void; capaSignedIds?: Set<string> }) {
  return (
    <div className="flex gap-6 h-full">
      <div className="w-[420px] flex flex-col">
        <div className="flex items-center gap-3 mb-4"><SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search CAPAs..." className="flex-1" /><CapabilityGate moduleId="qms" capability="author" inline><Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>New</Button></CapabilityGate></div>
        <div className="flex-1 overflow-auto space-y-2">{capas.length === 0 ? <UIEmptyState icon={Shield} title="No CAPAs found" description="Try adjusting your search" size="sm" /> : capas.map(c => (<button key={c.id} onClick={() => onSelect(c.id)} className={`w-full flex flex-col p-4 rounded-lg border transition-colors text-left ${selected?.id === c.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-surface-card border-border hover:border-amber-500/30'}`}><div className="flex items-center gap-2 mb-2 flex-wrap"><span className="text-xs text-text-muted font-mono">{c.capaNumber}</span>{getCAPATypeBadge(c.capaType)}{getSeverityBadge(c.severity)}{getCAPAStatusBadge(c.status)}</div><div className="text-sm text-text-primary font-medium mb-2">{c.title}</div><div className="flex items-center gap-4 text-xs text-text-muted"><span>{c.source.replace(/-/g, ' ')}</span><span>•</span><span>Due: {c.targetCompletionDate}</span></div>{c.actionPlan && c.actionPlan.totalActions > 0 && <div className="mt-3"><ProgressBar value={(c.actionPlan.completedActions / c.actionPlan.totalActions) * 100} color="amber" size="xs" /><div className="text-xs text-text-muted mt-1">{c.actionPlan.completedActions}/{c.actionPlan.totalActions} actions</div></div>}</button>))}</div>
      </div>
      <Card className="flex-1 overflow-auto">{selected ? <CardContent className="p-4 md:p-6"><div className="flex items-center justify-between gap-2 mb-2 flex-wrap"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm text-text-muted font-mono">{selected.capaNumber}</span>{getCAPATypeBadge(selected.capaType)}{getSeverityBadge(selected.severity)}{getPriorityBadge(selected.priority)}{getCAPAStatusBadge(selected.status)}</div>{onApproveCAPA && !capaSignedIds?.has(selected.id) && (selected.status === 'pending-approval' || selected.status === 'investigation' || selected.status === ('implemented' as string)) && (<CapabilityGate moduleId="qms" capability="approve" inline><button onClick={() => onApproveCAPA(selected.id, selected.capaNumber)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-teal text-white rounded-lg text-xs font-semibold hover:bg-accent-teal/90 transition-colors"><span className="text-sm leading-none">✍</span>Close with Signature</button></CapabilityGate>)}{capaSignedIds?.has(selected.id) && (<span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-green/10 border border-accent-green/30 text-xs font-medium text-accent-green">✓ QA Signed &amp; Closed</span>)}</div><h2 className="text-xl font-semibold text-text-primary mb-6">{selected.title}</h2>{new Date(selected.targetCompletionDate) < new Date() && selected.status !== 'closed' && <Card className="mb-6 border-red-500/30 bg-red-500/5"><CardContent className="p-3 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-sm text-red-400">This CAPA is past its target completion date</span></CardContent></Card>}<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6"><InfoItem label="Source" value={selected.source.replace(/-/g, ' ')} /><InfoItem label="Department" value={selected.department.replace(/-/g, ' ')} /><InfoItem label="Owner" value={selected.ownerName} /><InfoItem label="Assignee" value={selected.assigneeName} /><InfoItem label="Target Date" value={selected.targetCompletionDate} highlight={new Date(selected.targetCompletionDate) < new Date() && selected.status !== 'closed'} /><InfoItem label="Created" value={selected.createdAt.split('T')[0]} /><InfoItem label="Regulatory Impact" value={selected.regulatoryImpact ? 'Yes' : 'No'} /><InfoItem label="Effectiveness" value={selected.effectivenessCheckCompleted ? 'Completed' : 'Pending'} /></div><div className="mb-6"><h3 className="text-sm font-medium text-text-primary mb-2">Description</h3><p className="text-sm text-text-secondary bg-surface p-4 rounded-lg">{selected.description}</p></div><div className="mb-6"><CAPAInvestigationGenerator capa={selected} /></div>{selected.actionPlan && selected.actionPlan.totalActions > 0 && <div className="mb-6"><h3 className="text-sm font-medium text-text-primary mb-2">Action Plan</h3><div className="bg-surface p-4 rounded-lg"><div className="flex items-center justify-between mb-3"><Badge color={selected.actionPlan.status === 'completed' ? 'emerald' : 'blue'} size="xs">{selected.actionPlan.status}</Badge><span className="text-sm text-text-secondary">{selected.actionPlan.completedActions}/{selected.actionPlan.totalActions}</span></div><ProgressBar value={(selected.actionPlan.completedActions / selected.actionPlan.totalActions) * 100} color="amber" size="sm" /></div></div>}</CardContent> : <div className="h-full flex items-center justify-center"><UIEmptyState icon={Shield} title="Select a CAPA" description="Choose a CAPA from the list to view details" /></div>}</Card>
    </div>
  );
}

// ============================================================================
// AUDITS VIEW
// ============================================================================

function AuditsView({ audits, findings, selected, searchQuery, setSearchQuery, onSelect, onNew }: { audits: QMSAudit[]; findings: AuditFinding[]; selected: QMSAudit | null; searchQuery: string; setSearchQuery: (q: string) => void; onSelect: (id: string | null) => void; onNew: () => void }) {
  return (
    <div className="flex gap-6 h-full">
      <div className="w-[420px] flex flex-col">
        <div className="flex items-center gap-3 mb-4"><SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search audits..." className="flex-1" /><CapabilityGate moduleId="qms" capability="author" inline><Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>New</Button></CapabilityGate></div>
        <div className="flex-1 overflow-auto space-y-2">{audits.length === 0 ? <UIEmptyState icon={ClipboardCheck} title="No audits found" description="Try adjusting your search" size="sm" /> : audits.map(a => (<button key={a.id} onClick={() => onSelect(a.id)} className={`w-full flex flex-col p-4 rounded-lg border transition-colors text-left ${selected?.id === a.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-surface-card border-border hover:border-amber-500/30'}`}><div className="flex items-center gap-2 mb-2 flex-wrap"><span className="text-xs text-text-muted font-mono">{a.auditNumber}</span>{getAuditTypeBadge(a.auditType)}{getAuditStatusBadge(a.status)}</div><div className="text-sm text-text-primary font-medium mb-2">{a.title}</div><div className="flex items-center gap-4 text-xs text-text-muted"><Calendar className="w-3 h-3" /><span>{a.scheduledStartDate}</span><span>•</span><span>{a.department.replace(/-/g, ' ')}</span></div>{a.findings.length > 0 && <div className="flex gap-2 mt-2 text-xs"><span className="text-red-400">{a.findings.filter(f => f.severity === 'critical').length} critical</span><span className="text-orange-400">{a.findings.filter(f => f.severity === 'major').length} major</span></div>}</button>))}</div>
      </div>
      <Card className="flex-1 overflow-auto">{selected ? <CardContent className="p-4 md:p-6"><div className="flex items-center gap-2 mb-2"><span className="text-sm text-text-muted font-mono">{selected.auditNumber}</span>{getAuditTypeBadge(selected.auditType)}{getAuditStatusBadge(selected.status)}</div><h2 className="text-xl font-semibold text-text-primary mb-6">{selected.title}</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6"><InfoItem label="Scope" value={selected.scope} /><InfoItem label="Department" value={selected.department.replace(/-/g, ' ')} /><InfoItem label="Lead Auditor" value={selected.leadAuditorName} /><InfoItem label="Team Size" value={String(selected.auditTeam.length)} /><InfoItem label="Scheduled Start" value={selected.scheduledStartDate} /><InfoItem label="Scheduled End" value={selected.scheduledEndDate} /><InfoItem label="Actual Start" value={selected.actualStartDate || 'Not started'} /><InfoItem label="Actual End" value={selected.actualEndDate || 'Ongoing'} /></div>{selected.findings.length > 0 && <div className="mb-6"><h3 className="text-sm font-medium text-text-primary mb-2">Findings ({selected.findings.length})</h3><div className="grid grid-cols-5 gap-2 mb-4"><Card className="bg-red-500/10"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-red-400">{selected.findings.filter(f => f.severity === 'critical').length}</div><div className="text-xs text-text-muted">Critical</div></CardContent></Card><Card className="bg-orange-500/10"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-orange-400">{selected.findings.filter(f => f.severity === 'major').length}</div><div className="text-xs text-text-muted">Major</div></CardContent></Card><Card className="bg-amber-500/10"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-amber-400">{selected.findings.filter(f => f.severity === 'minor').length}</div><div className="text-xs text-text-muted">Minor</div></CardContent></Card><Card className="bg-blue-500/10"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-blue-400">{selected.findings.filter(f => f.severity === 'observation').length}</div><div className="text-xs text-text-muted">Obs</div></CardContent></Card><Card className="bg-emerald-500/10"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-emerald-400">{selected.findings.filter(f => f.severity === 'opportunity').length}</div><div className="text-xs text-text-muted">OFI</div></CardContent></Card></div><div className="space-y-2">{selected.findings.slice(0, 5).map(f => (<div key={f.id} className="flex items-center gap-3 p-3 bg-surface rounded-lg"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-text-muted">{f.findingNumber}</span>{getFindingSeverityBadge(f.severity)}</div><div className="text-sm text-text-primary truncate">{f.title}</div></div><Badge color={f.status === 'closed' ? 'emerald' : 'slate'} size="xs">{f.status}</Badge></div>))}</div></div>}</CardContent> : <div className="h-full flex items-center justify-center"><UIEmptyState icon={ClipboardCheck} title="Select an audit" description="Choose an audit from the list to view details" /></div>}</Card>
    </div>
  );
}

// ============================================================================
// TRAINING VIEW - v183: Training Management Dashboard
// Comprehensive training management with curriculum catalog, user matrix,
// department compliance, and GxP requirements tracking
// ============================================================================

// v183: Training Dashboard Sub-Views
type TrainingSubView = 'dashboard' | 'curricula' | 'matrix' | 'assignments' | 'gxp';

// v183: Mock comprehensive training data
const mockCurricula = [
  { id: 'cur-1', code: 'CUR-GMP-001', title: 'GMP Fundamentals', description: 'Core GMP training for all manufacturing personnel', department: 'manufacturing' as const, targetRoles: ['Operator', 'Technician', 'Supervisor'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GMP' as const, courses: ['crs-1', 'crs-2', 'crs-3'], validityPeriod: 24, status: 'active' as const, enrolledCount: 45, completedCount: 38 },
  { id: 'cur-2', code: 'CUR-GCP-001', title: 'GCP Clinical Trials', description: 'Good Clinical Practice for clinical operations staff', department: 'clinical-operations' as const, targetRoles: ['CRA', 'Clinical Monitor', 'Study Coordinator'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GCP' as const, courses: ['crs-4', 'crs-5'], validityPeriod: 12, status: 'active' as const, enrolledCount: 28, completedCount: 25 },
  { id: 'cur-3', code: 'CUR-GLP-001', title: 'GLP Laboratory Practices', description: 'Good Laboratory Practice for research personnel', department: 'r-and-d' as const, targetRoles: ['Scientist', 'Lab Technician', 'QC Analyst'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GLP' as const, courses: ['crs-6', 'crs-7'], validityPeriod: 24, status: 'active' as const, enrolledCount: 32, completedCount: 30 },
  { id: 'cur-4', code: 'CUR-PV-001', title: 'Pharmacovigilance Essentials', description: 'Safety reporting and signal detection training', department: 'pharmacovigilance' as const, targetRoles: ['PV Specialist', 'Safety Officer', 'Medical Reviewer'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GVP' as const, courses: ['crs-8', 'crs-9'], validityPeriod: 12, status: 'active' as const, enrolledCount: 18, completedCount: 16 },
  { id: 'cur-5', code: 'CUR-DOC-001', title: 'Document Control & Records', description: '21 CFR Part 11 and document management', department: 'quality-assurance' as const, targetRoles: ['QA Specialist', 'Document Controller', 'Regulatory Affairs'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GDocP' as const, courses: ['crs-10', 'crs-11'], validityPeriod: 24, status: 'active' as const, enrolledCount: 52, completedCount: 48 },
  { id: 'cur-6', code: 'CUR-QMS-001', title: 'Quality Management System', description: 'CAPA, Deviations, and Change Control processes', department: 'quality-assurance' as const, targetRoles: ['All Personnel'], trainingType: 'initial' as const, isMandatory: true, isGxP: false, gxpCategory: undefined, courses: ['crs-12', 'crs-13', 'crs-14'], validityPeriod: 24, status: 'active' as const, enrolledCount: 120, completedCount: 105 },
  { id: 'cur-7', code: 'CUR-SAFE-001', title: 'Laboratory Safety', description: 'Chemical handling and safety procedures', department: 'r-and-d' as const, targetRoles: ['Scientist', 'Lab Technician'], trainingType: 'initial' as const, isMandatory: true, isGxP: false, gxpCategory: undefined, courses: ['crs-15'], validityPeriod: 12, status: 'active' as const, enrolledCount: 35, completedCount: 33 },
  { id: 'cur-8', code: 'CUR-DATA-001', title: 'Data Integrity', description: 'ALCOA+ principles and data governance', department: 'quality-assurance' as const, targetRoles: ['All Personnel'], trainingType: 'initial' as const, isMandatory: true, isGxP: true, gxpCategory: 'GDocP' as const, courses: ['crs-16'], validityPeriod: 24, status: 'active' as const, enrolledCount: 120, completedCount: 115 },
];

const mockCourses = [
  { id: 'crs-1', code: 'CRS-GMP-101', title: 'Introduction to GMP', duration: 120, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-2', code: 'CRS-GMP-102', title: 'GMP Documentation', duration: 90, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-3', code: 'CRS-GMP-103', title: 'GMP in Manufacturing', duration: 180, deliveryMethod: 'classroom' as const, passingScore: 80, isActive: true },
  { id: 'crs-4', code: 'CRS-GCP-101', title: 'GCP Fundamentals', duration: 240, deliveryMethod: 'online' as const, passingScore: 85, isActive: true },
  { id: 'crs-5', code: 'CRS-GCP-102', title: 'Informed Consent & Subject Safety', duration: 90, deliveryMethod: 'online' as const, passingScore: 85, isActive: true },
  { id: 'crs-6', code: 'CRS-GLP-101', title: 'GLP Overview', duration: 120, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-7', code: 'CRS-GLP-102', title: 'Study Director Responsibilities', duration: 90, deliveryMethod: 'classroom' as const, passingScore: 80, isActive: true },
  { id: 'crs-8', code: 'CRS-PV-101', title: 'Adverse Event Reporting', duration: 180, deliveryMethod: 'online' as const, passingScore: 90, isActive: true },
  { id: 'crs-9', code: 'CRS-PV-102', title: 'Signal Detection Methods', duration: 120, deliveryMethod: 'online' as const, passingScore: 85, isActive: true },
  { id: 'crs-10', code: 'CRS-DOC-101', title: '21 CFR Part 11 Compliance', duration: 90, deliveryMethod: 'online' as const, passingScore: 85, isActive: true },
  { id: 'crs-11', code: 'CRS-DOC-102', title: 'Electronic Records Management', duration: 60, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-12', code: 'CRS-QMS-101', title: 'CAPA Process', duration: 60, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-13', code: 'CRS-QMS-102', title: 'Deviation Handling', duration: 60, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-14', code: 'CRS-QMS-103', title: 'Change Control', duration: 60, deliveryMethod: 'online' as const, passingScore: 80, isActive: true },
  { id: 'crs-15', code: 'CRS-SAFE-101', title: 'Lab Safety Fundamentals', duration: 90, deliveryMethod: 'classroom' as const, passingScore: 100, isActive: true },
  { id: 'crs-16', code: 'CRS-DATA-101', title: 'Data Integrity & ALCOA+', duration: 120, deliveryMethod: 'online' as const, passingScore: 85, isActive: true },
];

const mockUsers = [
  { id: 'user-1', name: 'Sarah Chen', department: 'quality-assurance' as const, role: 'QA Manager', hireDate: '2020-03-15' },
  { id: 'user-2', name: 'Michael Roberts', department: 'manufacturing' as const, role: 'Production Supervisor', hireDate: '2019-08-01' },
  { id: 'user-3', name: 'Jennifer Adams', department: 'clinical-operations' as const, role: 'Clinical Research Associate', hireDate: '2021-06-20' },
  { id: 'user-4', name: 'David Kim', department: 'r-and-d' as const, role: 'Senior Scientist', hireDate: '2018-11-10' },
  { id: 'user-5', name: 'Emily Park', department: 'pharmacovigilance' as const, role: 'PV Specialist', hireDate: '2022-01-15' },
  { id: 'user-6', name: 'James Wilson', department: 'regulatory-affairs' as const, role: 'Regulatory Affairs Manager', hireDate: '2019-04-22' },
  { id: 'user-7', name: 'Maria Garcia', department: 'manufacturing' as const, role: 'Manufacturing Technician', hireDate: '2023-02-28' },
  { id: 'user-8', name: 'Robert Lee', department: 'quality-control' as const, role: 'QC Analyst', hireDate: '2021-09-05' },
  { id: 'user-9', name: 'Lisa Thompson', department: 'clinical-operations' as const, role: 'Study Coordinator', hireDate: '2022-07-11' },
  { id: 'user-10', name: 'Kevin Martinez', department: 'r-and-d' as const, role: 'Lab Technician', hireDate: '2023-04-03' },
];

// v183: Department compliance data
const mockDepartmentCompliance = [
  { department: 'quality-assurance', name: 'Quality Assurance', totalUsers: 15, compliantUsers: 14, overdueUsers: 1, atRiskUsers: 2, compliancePercent: 93 },
  { department: 'manufacturing', name: 'Manufacturing', totalUsers: 45, compliantUsers: 38, overdueUsers: 4, atRiskUsers: 3, compliancePercent: 84 },
  { department: 'clinical-operations', name: 'Clinical Operations', totalUsers: 28, compliantUsers: 25, overdueUsers: 2, atRiskUsers: 1, compliancePercent: 89 },
  { department: 'r-and-d', name: 'R&D', totalUsers: 32, compliantUsers: 30, overdueUsers: 1, atRiskUsers: 2, compliancePercent: 94 },
  { department: 'pharmacovigilance', name: 'Pharmacovigilance', totalUsers: 18, compliantUsers: 16, overdueUsers: 2, atRiskUsers: 0, compliancePercent: 89 },
  { department: 'regulatory-affairs', name: 'Regulatory Affairs', totalUsers: 12, compliantUsers: 12, overdueUsers: 0, atRiskUsers: 1, compliancePercent: 100 },
  { department: 'quality-control', name: 'Quality Control', totalUsers: 22, compliantUsers: 20, overdueUsers: 1, atRiskUsers: 2, compliancePercent: 91 },
];

// v183: GxP Training Categories
const gxpCategories = [
  { id: 'gmp', name: 'GMP', fullName: 'Good Manufacturing Practice', color: 'blue' as const, icon: '🏭', curricula: 1, courses: 3, compliance: 92 },
  { id: 'gcp', name: 'GCP', fullName: 'Good Clinical Practice', color: 'purple' as const, icon: '🩺', curricula: 1, courses: 2, compliance: 89 },
  { id: 'glp', name: 'GLP', fullName: 'Good Laboratory Practice', color: 'teal' as const, icon: '🔬', curricula: 1, courses: 2, compliance: 94 },
  { id: 'gvp', name: 'GVP', fullName: 'Good Pharmacovigilance Practice', color: 'amber' as const, icon: '⚕️', curricula: 1, courses: 2, compliance: 88 },
  { id: 'gdocp', name: 'GDocP', fullName: 'Good Documentation Practice', color: 'emerald' as const, icon: '📋', curricula: 2, courses: 3, compliance: 96 },
];

// v183: Curriculum Card Component
const CurriculumCard = ({ curriculum, onSelect }: { curriculum: typeof mockCurricula[0]; onSelect: () => void }) => {
  const completionRate = curriculum.enrolledCount > 0 ? Math.round((curriculum.completedCount / curriculum.enrolledCount) * 100) : 0;
  const deptColorMap: Record<string, string> = {
    'manufacturing': 'blue', 'clinical-operations': 'purple', 'r-and-d': 'teal',
    'pharmacovigilance': 'amber', 'quality-assurance': 'emerald', 'quality-control': 'cyan',
    'regulatory-affairs': 'violet',
  };
  return (
    <Card className="hover:bg-surface-card/50 transition-all cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge color={deptColorMap[curriculum.department] as BadgeColor || 'slate'} size="xs">{curriculum.department.replace(/-/g, ' ')}</Badge>
            {curriculum.isGxP && <Badge color="red" size="xs">{curriculum.gxpCategory}</Badge>}
            {curriculum.isMandatory && <Badge color="orange" size="xs">Mandatory</Badge>}
          </div>
          <span className="text-xs text-text-muted font-mono">{curriculum.code}</span>
        </div>
        <h4 className="text-sm font-medium text-text-primary mb-1">{curriculum.title}</h4>
        <p className="text-xs text-text-muted mb-3 line-clamp-2">{curriculum.description}</p>
        <div className="flex items-center gap-4 text-xs text-text-muted mb-2">
          <span>{curriculum.courses.length} courses</span>
          <span>•</span>
          <span>{curriculum.validityPeriod} mo validity</span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar progress={completionRate} color={completionRate >= 90 ? 'emerald' : completionRate >= 70 ? 'amber' : 'red'} size="sm" className="flex-1" />
          <span className={`text-xs font-medium ${completionRate >= 90 ? 'text-emerald-400' : completionRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{completionRate}%</span>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
          <span>{curriculum.completedCount}/{curriculum.enrolledCount} completed</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  );
};

// v183: Training Matrix Row Component
const TrainingMatrixRow = ({ user, curricula }: { user: typeof mockUsers[0]; curricula: typeof mockCurricula }) => {
  // Simulated completion status per curriculum
  const getStatus = (curId: string) => {
    const hash = (user.id + curId).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const statusVal = Math.abs(hash % 100);
    if (statusVal < 70) return 'completed';
    if (statusVal < 85) return 'in-progress';
    if (statusVal < 92) return 'not-started';
    return 'overdue';
  };
  const statusIcons: Record<string, React.ReactNode> = {
    'completed': <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    'in-progress': <Clock className="w-4 h-4 text-blue-400" />,
    'not-started': <div className="w-4 h-4 rounded-full border border-text-muted" />,
    'overdue': <XCircle className="w-4 h-4 text-red-400" />,
  };
  return (
    <tr className="border-b border-border hover:bg-surface transition-colors">
      <td className="px-4 py-3 sticky left-0 bg-surface-elevated">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-amber-400">{user.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div>
            <div className="text-sm text-text-primary">{user.name}</div>
            <div className="text-xs text-text-muted">{user.role}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-text-muted">{user.department.replace(/-/g, ' ')}</td>
      {curricula.map(cur => (
        <td key={cur.id} className="px-3 py-3 text-center">
          <div className="flex items-center justify-center" title={getStatus(cur.id)}>
            {statusIcons[getStatus(cur.id)]}
          </div>
        </td>
      ))}
    </tr>
  );
};

// v183: GxP Category Card
const GxPCard = ({ category }: { category: typeof gxpCategories[0] }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
  return (
    <Card className={`border ${colorMap[category.color]?.split(' ')[2]} hover:bg-surface-card/50 transition-all`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <div className="text-sm font-semibold text-text-primary">{category.name}</div>
            <div className="text-xs text-text-muted">{category.fullName}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-surface rounded p-2">
            <div className="text-text-muted">Curricula</div>
            <div className="text-text-primary font-medium">{category.curricula}</div>
          </div>
          <div className="bg-surface rounded p-2">
            <div className="text-text-muted">Courses</div>
            <div className="text-text-primary font-medium">{category.courses}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar progress={category.compliance} color={category.compliance >= 90 ? 'emerald' : category.compliance >= 80 ? 'amber' : 'red'} size="sm" className="flex-1" />
          <span className={`text-xs font-medium ${category.compliance >= 90 ? 'text-emerald-400' : category.compliance >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{category.compliance}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

function TrainingView({ assignments, searchQuery, setSearchQuery, onNew }: { assignments: TrainingAssignment[]; searchQuery: string; setSearchQuery: (q: string) => void; onNew: () => void }) {
  const { deadClick } = useDeadClick();
  const [subView, setSubView] = useState<TrainingSubView>('dashboard');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['compliance', 'curricula', 'gxp']));
  
  const toggleSection = (s: string) => { const n = new Set(expandedSections); n.has(s) ? n.delete(s) : n.add(s); setExpandedSections(n); };
  
  const filtered = useMemo(() => assignments.filter(a => a.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) || a.userName.toLowerCase().includes(searchQuery.toLowerCase())), [assignments, searchQuery]);
  const stats = useMemo(() => ({ 
    total: assignments.length, 
    completed: assignments.filter(a => a.status === 'completed').length, 
    overdue: assignments.filter(a => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()).length, 
    inProgress: assignments.filter(a => a.status === 'in-progress').length, 
    compliance: assignments.length > 0 ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100) : 100,
    totalCurricula: mockCurricula.length,
    activeCurricula: mockCurricula.filter(c => c.status === 'active').length,
    gxpCurricula: mockCurricula.filter(c => c.isGxP).length,
    totalCourses: mockCourses.length,
    totalUsers: mockUsers.length,
    orgCompliance: Math.round(mockDepartmentCompliance.reduce((sum, d) => sum + d.compliancePercent, 0) / mockDepartmentCompliance.length),
  }), [assignments]);

  const subViewTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'curricula' as const, label: 'Curricula', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'matrix' as const, label: 'User Matrix', icon: <Target className="w-4 h-4" /> },
    { id: 'assignments' as const, label: 'Assignments', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'gxp' as const, label: 'GxP Training', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* v183: Sub-view navigation */}
      <div className="flex items-center gap-2 bg-surface-elevated rounded-lg p-1">
        {subViewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              subView === tab.id 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>Assign Training</Button>
      </div>

      {/* Dashboard View */}
      {subView === 'dashboard' && (
        <div className="space-y-4 md:space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <KPICard icon={<Target className="w-5 h-5" />} label="Org Compliance" value={`${stats.orgCompliance}%`} color={stats.orgCompliance >= 90 ? 'emerald' : stats.orgCompliance >= 80 ? 'amber' : 'red'} />
            <KPICard icon={<BookOpen className="w-5 h-5" />} label="Curricula" value={stats.totalCurricula} subValue={`${stats.gxpCurricula} GxP`} color="blue" onClick={() => setSubView('curricula')} />
            <KPICard icon={<FileText className="w-5 h-5" />} label="Courses" value={stats.totalCourses} color="purple" />
            <KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed} color="emerald" />
            <KPICard icon={<Activity className="w-5 h-5" />} label="In Progress" value={stats.inProgress} color="cyan" />
            <KPICard icon={<Clock className="w-5 h-5" />} label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? 'red' : 'slate'} onClick={() => setSubView('assignments')} />
          </div>

          {/* Department Compliance */}
          <CollapsibleSection 
            title="Department Compliance" 
            icon={<BarChart3 className="w-5 h-5 text-blue-400" />} 
            count={mockDepartmentCompliance.length}
            expanded={expandedSections.has('compliance')} 
            onToggle={() => toggleSection('compliance')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
              {mockDepartmentCompliance.map(dept => (
                <div key={dept.department} className="bg-surface rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{dept.name}</span>
                    <span className={`text-sm font-semibold ${dept.compliancePercent >= 90 ? 'text-emerald-400' : dept.compliancePercent >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                      {dept.compliancePercent}%
                    </span>
                  </div>
                  <ProgressBar 
                    progress={dept.compliancePercent} 
                    color={dept.compliancePercent >= 90 ? 'emerald' : dept.compliancePercent >= 80 ? 'amber' : 'red'} 
                    size="sm" 
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                    <span>{dept.compliantUsers}/{dept.totalUsers} compliant</span>
                    {dept.overdueUsers > 0 && <span className="text-red-400">{dept.overdueUsers} overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* GxP Summary */}
          <CollapsibleSection 
            title="GxP Training Requirements" 
            icon={<Shield className="w-5 h-5 text-red-400" />} 
            count={gxpCategories.length}
            expanded={expandedSections.has('gxp')} 
            onToggle={() => toggleSection('gxp')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
              {gxpCategories.map(cat => <GxPCard key={cat.id} category={cat} />)}
            </div>
          </CollapsibleSection>

          {/* Recent Curricula */}
          <CollapsibleSection 
            title="Active Curricula" 
            icon={<BookOpen className="w-5 h-5 text-purple-400" />} 
            count={mockCurricula.filter(c => c.status === 'active').length}
            expanded={expandedSections.has('curricula')} 
            onToggle={() => toggleSection('curricula')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
              {mockCurricula.filter(c => c.status === 'active').slice(0, 4).map(cur => (
                <CurriculumCard key={cur.id} curriculum={cur} onSelect={() => { setSelectedCurriculum(cur.id); setSubView('curricula'); }} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSubView('curricula')}>
              View All Curricula <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CollapsibleSection>
        </div>
      )}

      {/* Curricula Catalog View */}
      {subView === 'curricula' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <SearchInput 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search curricula..." 
              className="flex-1 max-w-md" 
            />
            <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" onClick={deadClick} />}>New Curriculum</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mockCurricula.filter(c => 
              c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
              c.code.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(cur => (
              <CurriculumCard 
                key={cur.id} 
                curriculum={cur} 
                onSelect={() => setSelectedCurriculum(cur.id)} 
              />
            ))}
          </div>
        </div>
      )}

      {/* User Training Matrix View */}
      {subView === 'matrix' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <SearchInput 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search users..." 
              className="flex-1 max-w-md" 
            />
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> In Progress</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-text-muted" /> Not Started</span>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Overdue</span>
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted sticky left-0 bg-surface min-w-[200px]">User</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-text-muted min-w-[120px]">Department</th>
                    {mockCurricula.slice(0, 6).map(cur => (
                      <th key={cur.id} className="px-3 py-3 text-xs font-medium text-text-muted text-center min-w-[80px]" title={cur.title}>
                        <div className="truncate max-w-[80px]">{cur.code.split('-').slice(1).join('-')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.filter(u => 
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.department.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(user => (
                    <TrainingMatrixRow key={user.id} user={user} curricula={mockCurricula.slice(0, 6)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Assignments View */}
      {subView === 'assignments' && (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard icon={<BookOpen className="w-5 h-5" />} label="Total" value={stats.total} color="slate" />
            <KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed} color="emerald" />
            <KPICard icon={<Activity className="w-5 h-5" />} label="In Progress" value={stats.inProgress} color="blue" />
            <KPICard icon={<Clock className="w-5 h-5" />} label="Overdue" value={stats.overdue} color="red" />
            <KPICard icon={<Target className="w-5 h-5" />} label="Compliance" value={`${stats.compliance}%`} color={stats.compliance >= 95 ? 'emerald' : stats.compliance >= 80 ? 'amber' : 'red'} />
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by course or user..." className="flex-1 max-w-md" />
          </div>
          <Card>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Course</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No training assignments found</td></tr>
                  ) : filtered.map(a => {
                    const isOverdue = a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date();
                    return (
                      <tr key={a.id} className="border-b border-border hover:bg-surface transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-amber-400">{a.userName.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span className="text-sm text-text-primary">{a.userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{a.courseTitle}</td>
                        <td className="px-4 py-3">{getTrainingStatusBadge(a.status)}</td>
                        <td className="px-4 py-3"><span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-text-secondary'}`}>{a.dueDate}</span></td>
                        <td className="px-4 py-3">{a.score !== undefined ? <span className={`text-sm ${a.passed ? 'text-emerald-400' : 'text-red-400'}`}>{a.score}%</span> : <span className="text-sm text-text-muted">-</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* GxP Training View */}
      {subView === 'gxp' && (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {gxpCategories.map(cat => <GxPCard key={cat.id} category={cat} />)}
          </div>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">GxP Curricula by Category</h3>
              <div className="space-y-3">
                {mockCurricula.filter(c => c.isGxP).map(cur => {
                  const completionRate = cur.enrolledCount > 0 ? Math.round((cur.completedCount / cur.enrolledCount) * 100) : 0;
                  return (
                    <div key={cur.id} className="flex items-center gap-4 p-3 bg-surface rounded-lg hover:bg-surface-card transition-colors cursor-pointer"
                      onClick={() => { setSelectedCurriculum(cur.id); setSubView('curricula'); }}
                    >
                      <Badge color="red" size="xs">{cur.gxpCategory}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted font-mono">{cur.code}</span>
                          <span className="text-sm font-medium text-text-primary">{cur.title}</span>
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">{cur.department.replace(/-/g, ' ')} • {cur.courses.length} courses • {cur.validityPeriod} mo validity</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <ProgressBar progress={completionRate} color={completionRate >= 90 ? 'emerald' : completionRate >= 80 ? 'amber' : 'red'} size="sm" />
                        </div>
                        <span className={`text-sm font-medium w-12 text-right ${completionRate >= 90 ? 'text-emerald-400' : completionRate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                          {completionRate}%
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Regulatory Framework Coverage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {['21 CFR Part 11', 'ICH E6 (GCP)', 'ICH Q10', 'EU GMP Annex 11', 'ISO 13485', 'MHRA GxP'].map(framework => (
                  <div key={framework} className="bg-surface rounded-lg p-3 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-xs font-medium text-text-primary">{framework}</div>
                    <div className="text-xs text-text-muted">Covered</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHANGE CONTROL VIEW - v162: Added approve action with event emission
// ============================================================================

function ChangeControlView({ ccs, searchQuery, setSearchQuery, onNew, onApprove }: { ccs: ChangeControl[]; searchQuery: string; setSearchQuery: (q: string) => void; onNew: () => void; onApprove?: (id: string) => void }) {
  const stats = useMemo(() => ({ total: ccs.length, pending: ccs.filter(cc => ['pending-review', 'pending-approval', 'impact-assessment'].includes(cc.status)).length, implementation: ccs.filter(cc => cc.status === 'implementation').length, closed: ccs.filter(cc => cc.status === 'closed').length }), [ccs]);
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"><KPICard icon={<FileCheck className="w-5 h-5" />} label="Total Changes" value={stats.total} color="violet" /><KPICard icon={<Clock className="w-5 h-5" />} label="Pending Review" value={stats.pending} color={stats.pending > 0 ? 'amber' : 'slate'} /><KPICard icon={<Activity className="w-5 h-5" />} label="In Implementation" value={stats.implementation} color="blue" /><KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Closed" value={stats.closed} color="emerald" /></div>
      <Card><CardContent className="p-4 border-b border-border"><div className="flex items-center gap-4"><SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search change controls..." className="flex-1 max-w-md" /><Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>New Change</Button></div></CardContent><div className="divide-y divide-border">{ccs.length === 0 ? <div className="p-8 text-center text-text-muted">No change controls found</div> : ccs.map(cc => (<div key={cc.id} className="flex items-center gap-4 p-4 hover:bg-surface transition-colors cursor-pointer"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-text-muted font-mono">{cc.changeNumber}</span>{getPriorityBadge(cc.priority)}</div><div className="text-sm font-medium text-text-primary">{cc.title}</div><div className="flex items-center gap-4 mt-1 text-xs text-text-muted"><span>{cc.changeType}</span><span>•</span><span>{cc.department.replace(/-/g, ' ')}</span></div></div><div className="flex items-center gap-2">{cc.status === 'pending-approval' && onApprove && (<Button variant="primary" size="xs" icon={<CheckCircle2 className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onApprove(cc.id); }}>Approve</Button>)}{getChangeControlStatusBadge(cc.status)}</div><ChevronRight className="w-4 h-4 text-text-muted" /></div>))}</div></Card>
    </div>
  );
}

// ============================================================================
// DOCUMENTS VIEW - v180: Document Control with UnifiedDocumentBrowser
// ============================================================================

// v180: Mock controlled document data
const mockControlledDocuments: ControlledDocument[] = [
  { id: 'doc-1', documentNumber: 'SOP-QMS-001', title: 'Document Control Procedure', documentType: 'sop', department: 'quality-assurance', version: '3.2', majorVersion: 3, minorVersion: 2, status: 'effective', effectiveDate: '2024-06-15', periodicReviewDate: '2025-06-15', periodicReviewCycle: 24, author: 'Sarah Chen', authorId: 'user-1', owner: 'Michael Roberts', ownerId: 'user-2', description: 'Defines the process for creating, reviewing, approving, and managing controlled documents within the QMS.', keywords: ['document control', 'SOP', 'quality'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', '21-cfr-part-11'], relatedDocumentIds: ['doc-2', 'doc-5'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-1'], changeControlRequired: true, fileLocation: '/docs/sop-qms-001.pdf', fileSize: 245000, fileChecksum: 'abc123', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2022-01-10T08:00:00Z', updatedAt: '2024-06-15T10:30:00Z', createdBy: 'system', lastModifiedBy: 'user-1' },
  { id: 'doc-2', documentNumber: 'SOP-QMS-002', title: 'CAPA Management Procedure', documentType: 'sop', department: 'quality-assurance', version: '2.1', majorVersion: 2, minorVersion: 1, status: 'effective', effectiveDate: '2024-08-01', periodicReviewDate: '2026-08-01', periodicReviewCycle: 24, author: 'James Wilson', authorId: 'user-3', owner: 'Sarah Chen', ownerId: 'user-1', description: 'Establishes the process for initiating, investigating, and closing corrective and preventive actions.', keywords: ['CAPA', 'corrective action', 'preventive action'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'gmp'], relatedDocumentIds: ['doc-1', 'doc-3'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-2'], changeControlRequired: true, fileLocation: '/docs/sop-qms-002.pdf', fileSize: 189000, fileChecksum: 'def456', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2022-03-15T09:00:00Z', updatedAt: '2024-08-01T14:00:00Z', createdBy: 'system', lastModifiedBy: 'user-3' },
  { id: 'doc-3', documentNumber: 'SOP-QMS-003', title: 'Deviation Management Procedure', documentType: 'sop', department: 'quality-assurance', version: '4.0', majorVersion: 4, minorVersion: 0, status: 'effective', effectiveDate: '2024-11-01', periodicReviewDate: '2026-11-01', periodicReviewCycle: 24, author: 'Emily Park', authorId: 'user-4', owner: 'Michael Roberts', ownerId: 'user-2', description: 'Defines the process for identifying, documenting, investigating, and resolving deviations.', keywords: ['deviation', 'non-conformance', 'investigation'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'gmp', '21-cfr-part-820'], relatedDocumentIds: ['doc-2'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-3'], changeControlRequired: true, fileLocation: '/docs/sop-qms-003.pdf', fileSize: 312000, fileChecksum: 'ghi789', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2021-06-20T10:00:00Z', updatedAt: '2024-11-01T09:00:00Z', createdBy: 'system', lastModifiedBy: 'user-4' },
  { id: 'doc-4', documentNumber: 'SOP-QMS-004', title: 'Change Control Procedure', documentType: 'sop', department: 'quality-assurance', version: '2.0', majorVersion: 2, minorVersion: 0, status: 'pending-review', periodicReviewCycle: 24, author: 'Sarah Chen', authorId: 'user-1', owner: 'James Wilson', ownerId: 'user-3', description: 'Establishes the process for managing changes to documents, processes, systems, and equipment.', keywords: ['change control', 'change management'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'gmp'], relatedDocumentIds: ['doc-1'], attachments: [], trainingRequired: true, trainingCurriculumIds: [], changeControlRequired: true, fileLocation: '/docs/sop-qms-004.pdf', fileSize: 198000, fileChecksum: 'jkl012', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2022-09-01T08:00:00Z', updatedAt: '2024-12-15T11:00:00Z', createdBy: 'system', lastModifiedBy: 'user-1' },
  { id: 'doc-5', documentNumber: 'SOP-QMS-005', title: 'Training Management Procedure', documentType: 'sop', department: 'quality-assurance', version: '1.5', majorVersion: 1, minorVersion: 5, status: 'effective', effectiveDate: '2024-03-01', periodicReviewDate: '2026-03-01', periodicReviewCycle: 24, author: 'Michael Roberts', authorId: 'user-2', owner: 'Emily Park', ownerId: 'user-4', description: 'Defines the process for identifying training needs, developing curricula, and tracking completion.', keywords: ['training', 'qualification', 'competency'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'gcp'], relatedDocumentIds: ['doc-1'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-4'], changeControlRequired: false, fileLocation: '/docs/sop-qms-005.pdf', fileSize: 156000, fileChecksum: 'mno345', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2023-01-15T09:00:00Z', updatedAt: '2024-03-01T10:00:00Z', createdBy: 'system', lastModifiedBy: 'user-2' },
  { id: 'doc-6', documentNumber: 'SOP-REG-001', title: 'Regulatory Submission Procedure', documentType: 'sop', department: 'regulatory-affairs', version: '5.0', majorVersion: 5, minorVersion: 0, status: 'effective', effectiveDate: '2024-09-15', periodicReviewDate: '2026-09-15', periodicReviewCycle: 24, author: 'Lisa Thompson', authorId: 'user-5', owner: 'David Kim', ownerId: 'user-6', description: 'Establishes the process for preparing, reviewing, and submitting regulatory applications.', keywords: ['regulatory', 'submission', 'NDA', 'BLA', 'IND'], category: 'Regulatory Affairs', regulatoryFrameworks: ['gcp'], relatedDocumentIds: [], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-5'], changeControlRequired: true, fileLocation: '/docs/sop-reg-001.pdf', fileSize: 428000, fileChecksum: 'pqr678', retentionYears: 15, confidentialityLevel: 'confidential', createdAt: '2020-05-10T08:00:00Z', updatedAt: '2024-09-15T14:00:00Z', createdBy: 'system', lastModifiedBy: 'user-5' },
  { id: 'doc-7', documentNumber: 'SOP-CLN-001', title: 'Clinical Trial Conduct Procedure', documentType: 'sop', department: 'clinical-operations', version: '3.0', majorVersion: 3, minorVersion: 0, status: 'effective', effectiveDate: '2024-07-01', periodicReviewDate: '2026-07-01', periodicReviewCycle: 24, author: 'Jennifer Adams', authorId: 'user-7', owner: 'Robert Lee', ownerId: 'user-8', description: 'Defines the process for conducting clinical trials in compliance with GCP and regulatory requirements.', keywords: ['clinical trial', 'GCP', 'protocol', 'subject safety'], category: 'Clinical Operations', regulatoryFrameworks: ['gcp'], relatedDocumentIds: ['doc-8'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-6'], changeControlRequired: true, fileLocation: '/docs/sop-cln-001.pdf', fileSize: 567000, fileChecksum: 'stu901', retentionYears: 15, confidentialityLevel: 'confidential', createdAt: '2019-08-20T10:00:00Z', updatedAt: '2024-07-01T09:00:00Z', createdBy: 'system', lastModifiedBy: 'user-7' },
  { id: 'doc-8', documentNumber: 'SOP-CLN-002', title: 'Site Monitoring Procedure', documentType: 'sop', department: 'clinical-operations', version: '2.3', majorVersion: 2, minorVersion: 3, status: 'effective', effectiveDate: '2024-10-01', periodicReviewDate: '2026-10-01', periodicReviewCycle: 24, author: 'Robert Lee', authorId: 'user-8', owner: 'Jennifer Adams', ownerId: 'user-7', description: 'Establishes the process for conducting monitoring visits and ensuring data quality at clinical sites.', keywords: ['monitoring', 'site visit', 'source data verification'], category: 'Clinical Operations', regulatoryFrameworks: ['gcp'], relatedDocumentIds: ['doc-7'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-7'], changeControlRequired: true, fileLocation: '/docs/sop-cln-002.pdf', fileSize: 345000, fileChecksum: 'vwx234', retentionYears: 15, confidentialityLevel: 'confidential', createdAt: '2021-02-15T11:00:00Z', updatedAt: '2024-10-01T08:00:00Z', createdBy: 'system', lastModifiedBy: 'user-8' },
  { id: 'doc-9', documentNumber: 'SOP-SAF-001', title: 'Adverse Event Reporting Procedure', documentType: 'sop', department: 'pharmacovigilance', version: '4.1', majorVersion: 4, minorVersion: 1, status: 'effective', effectiveDate: '2024-05-01', periodicReviewDate: '2025-05-01', periodicReviewCycle: 12, author: 'Maria Garcia', authorId: 'user-9', owner: 'Thomas Brown', ownerId: 'user-10', description: 'Defines the process for collecting, processing, and reporting adverse events in compliance with regulatory requirements.', keywords: ['adverse event', 'safety', 'ICSR', 'expedited reporting'], category: 'Safety/Pharmacovigilance', regulatoryFrameworks: ['gcp', 'glp'], relatedDocumentIds: ['doc-10'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-8'], changeControlRequired: true, fileLocation: '/docs/sop-saf-001.pdf', fileSize: 489000, fileChecksum: 'yza567', retentionYears: 15, confidentialityLevel: 'confidential', createdAt: '2018-11-01T09:00:00Z', updatedAt: '2024-05-01T10:00:00Z', createdBy: 'system', lastModifiedBy: 'user-9' },
  { id: 'doc-10', documentNumber: 'SOP-SAF-002', title: 'Signal Detection Procedure', documentType: 'sop', department: 'pharmacovigilance', version: '2.0', majorVersion: 2, minorVersion: 0, status: 'effective', effectiveDate: '2024-04-15', periodicReviewDate: '2025-04-15', periodicReviewCycle: 12, author: 'Thomas Brown', authorId: 'user-10', owner: 'Maria Garcia', ownerId: 'user-9', description: 'Establishes the process for detecting, evaluating, and managing safety signals.', keywords: ['signal detection', 'safety signal', 'PRR', 'ROR'], category: 'Safety/Pharmacovigilance', regulatoryFrameworks: ['gcp'], relatedDocumentIds: ['doc-9'], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-9'], changeControlRequired: true, fileLocation: '/docs/sop-saf-002.pdf', fileSize: 278000, fileChecksum: 'bcd890', retentionYears: 15, confidentialityLevel: 'confidential', createdAt: '2022-04-01T08:00:00Z', updatedAt: '2024-04-15T11:00:00Z', createdBy: 'system', lastModifiedBy: 'user-10' },
  { id: 'doc-11', documentNumber: 'WI-QMS-001', title: 'Document Numbering Work Instruction', documentType: 'work-instruction', department: 'quality-assurance', version: '1.2', majorVersion: 1, minorVersion: 2, status: 'effective', effectiveDate: '2024-02-01', periodicReviewDate: '2026-02-01', periodicReviewCycle: 24, author: 'Sarah Chen', authorId: 'user-1', owner: 'Sarah Chen', ownerId: 'user-1', description: 'Provides detailed instructions for assigning document numbers to controlled documents.', keywords: ['document numbering', 'work instruction'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10'], relatedDocumentIds: ['doc-1'], attachments: [], trainingRequired: false, trainingCurriculumIds: [], changeControlRequired: false, fileLocation: '/docs/wi-qms-001.pdf', fileSize: 89000, fileChecksum: 'efg123', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2023-06-15T10:00:00Z', updatedAt: '2024-02-01T09:00:00Z', createdBy: 'system', lastModifiedBy: 'user-1' },
  { id: 'doc-12', documentNumber: 'FORM-QMS-001', title: 'Document Change Request Form', documentType: 'form', department: 'quality-assurance', version: '2.0', majorVersion: 2, minorVersion: 0, status: 'effective', effectiveDate: '2024-06-01', periodicReviewDate: '2026-06-01', periodicReviewCycle: 24, author: 'Emily Park', authorId: 'user-4', owner: 'Michael Roberts', ownerId: 'user-2', description: 'Form used to request changes to controlled documents.', keywords: ['form', 'change request', 'document change'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10'], relatedDocumentIds: ['doc-1', 'doc-4'], attachments: [], trainingRequired: false, trainingCurriculumIds: [], changeControlRequired: false, fileLocation: '/docs/form-qms-001.pdf', fileSize: 45000, fileChecksum: 'hij456', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2022-08-01T08:00:00Z', updatedAt: '2024-06-01T10:00:00Z', createdBy: 'system', lastModifiedBy: 'user-4' },
  { id: 'doc-13', documentNumber: 'POL-QMS-001', title: 'Quality Policy', documentType: 'policy', department: 'quality-assurance', version: '1.0', majorVersion: 1, minorVersion: 0, status: 'effective', effectiveDate: '2023-01-01', periodicReviewDate: '2025-01-01', periodicReviewCycle: 24, author: 'Michael Roberts', authorId: 'user-2', owner: 'CEO', ownerId: 'user-ceo', description: 'Defines the organization\'s commitment to quality and regulatory compliance.', keywords: ['policy', 'quality', 'commitment'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'iso-9001'], relatedDocumentIds: [], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-10'], changeControlRequired: true, fileLocation: '/docs/pol-qms-001.pdf', fileSize: 67000, fileChecksum: 'klm789', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z', createdBy: 'user-ceo', lastModifiedBy: 'user-ceo' },
  { id: 'doc-14', documentNumber: 'SOP-MFG-001', title: 'Batch Record Review Procedure', documentType: 'sop', department: 'manufacturing', version: '3.1', majorVersion: 3, minorVersion: 1, status: 'effective', effectiveDate: '2024-08-15', periodicReviewDate: '2026-08-15', periodicReviewCycle: 24, author: 'Kevin Martinez', authorId: 'user-11', owner: 'Angela White', ownerId: 'user-12', description: 'Defines the process for reviewing and releasing batch production records.', keywords: ['batch record', 'review', 'release', 'manufacturing'], category: 'Manufacturing', regulatoryFrameworks: ['gmp', '21-cfr-part-820'], relatedDocumentIds: [], attachments: [], trainingRequired: true, trainingCurriculumIds: ['cur-11'], changeControlRequired: true, fileLocation: '/docs/sop-mfg-001.pdf', fileSize: 356000, fileChecksum: 'nop012', retentionYears: 10, confidentialityLevel: 'confidential', createdAt: '2020-03-01T09:00:00Z', updatedAt: '2024-08-15T14:00:00Z', createdBy: 'system', lastModifiedBy: 'user-11' },
  { id: 'doc-15', documentNumber: 'SOP-QMS-006', title: 'Internal Audit Procedure', documentType: 'sop', department: 'quality-assurance', version: '2.0', majorVersion: 2, minorVersion: 0, status: 'draft', periodicReviewCycle: 24, author: 'James Wilson', authorId: 'user-3', owner: 'Sarah Chen', ownerId: 'user-1', description: 'Establishes the process for planning, conducting, and reporting internal audits.', keywords: ['audit', 'internal audit', 'self-inspection'], category: 'Quality Systems', regulatoryFrameworks: ['ich-q10', 'gmp'], relatedDocumentIds: [], attachments: [], trainingRequired: true, trainingCurriculumIds: [], changeControlRequired: true, fileLocation: '/docs/sop-qms-006-draft.pdf', fileSize: 234000, fileChecksum: 'qrs345', retentionYears: 10, confidentialityLevel: 'internal', createdAt: '2024-11-01T08:00:00Z', updatedAt: '2024-12-20T16:00:00Z', createdBy: 'user-3', lastModifiedBy: 'user-3' },
];

// v180: Document folders for tree view
const mockDocumentFolders: DocumentFolder[] = [
  { id: 'folder-qms', name: 'Quality Systems', description: 'Quality management SOPs and policies', parentId: null, documentCount: 7 },
  { id: 'folder-reg', name: 'Regulatory Affairs', description: 'Regulatory submission procedures', parentId: null, documentCount: 1 },
  { id: 'folder-cln', name: 'Clinical Operations', description: 'Clinical trial procedures', parentId: null, documentCount: 2 },
  { id: 'folder-saf', name: 'Safety/Pharmacovigilance', description: 'Safety reporting procedures', parentId: null, documentCount: 2 },
  { id: 'folder-mfg', name: 'Manufacturing', description: 'Manufacturing procedures', parentId: null, documentCount: 1 },
  { id: 'folder-sop', name: 'SOPs', description: 'Standard Operating Procedures', parentId: 'folder-qms', documentCount: 6 },
  { id: 'folder-wi', name: 'Work Instructions', description: 'Detailed work instructions', parentId: 'folder-qms', documentCount: 1 },
  { id: 'folder-forms', name: 'Forms', description: 'Controlled forms and templates', parentId: 'folder-qms', documentCount: 1 },
  { id: 'folder-policies', name: 'Policies', description: 'Quality policies', parentId: 'folder-qms', documentCount: 1 },
];

// v180: Convert QMS documents to UnifiedDocumentBrowser format
const convertToDocumentItem = (doc: ControlledDocument): DocumentItem => {
  const statusMap: Record<ApprovalStatus, DocumentStatus> = {
    'draft': 'draft',
    'pending-review': 'pending-review',
    'approved': 'approved',
    'rejected': 'archived',
    'effective': 'effective',
    'superseded': 'superseded',
    'retired': 'archived',
  };
  
  const categoryMap: Record<string, DocumentCategory> = {
    'Quality Systems': 'quality',
    'Regulatory Affairs': 'regulatory',
    'Clinical Operations': 'clinical',
    'Safety/Pharmacovigilance': 'safety',
    'Manufacturing': 'manufacturing',
  };
  
  return {
    id: doc.id,
    title: doc.title,
    documentNumber: doc.documentNumber,
    version: doc.version,
    status: statusMap[doc.status] || 'draft',
    category: categoryMap[doc.category] || 'quality',
    effectiveDate: doc.effectiveDate,
    expirationDate: doc.periodicReviewDate,
    author: doc.author,
    owner: doc.owner,
    lastModified: doc.updatedAt,
    fileType: 'pdf',
    fileSize: `${Math.round(doc.fileSize / 1000)} KB`,
    tags: doc.keywords,
    metadata: {
      documentType: doc.documentType,
      department: doc.department,
      trainingRequired: doc.trainingRequired,
      changeControlRequired: doc.changeControlRequired,
      confidentialityLevel: doc.confidentialityLevel,
    },
  };
};

function DocumentsView({ onNewDocument }: { onNewDocument?: () => void }) {
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  // v0.21.9: Add document viewer and version viewer state
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<{ version: string; changes: string; date: string; author: string; status: string } | null>(null);
  const toast = useToast();
  const updateDocument = useQMSStore(s => s.updateDocument);
  
  // Convert controlled documents to browser format
  const documents = useMemo(() => mockControlledDocuments.map(convertToDocumentItem), []);
  
  // Filter documents by folder
  const filteredDocuments = useMemo(() => {
    if (!selectedFolder) return documents;
    
    // Map folder to category/department filter
    const folderFilters: Record<string, (doc: DocumentItem) => boolean> = {
      'folder-qms': (doc) => doc.category === 'quality',
      'folder-reg': (doc) => doc.category === 'regulatory',
      'folder-cln': (doc) => doc.category === 'clinical',
      'folder-saf': (doc) => doc.category === 'safety',
      'folder-mfg': (doc) => doc.category === 'manufacturing',
      'folder-sop': (doc) => doc.metadata?.documentType === 'sop' && doc.category === 'quality',
      'folder-wi': (doc) => doc.metadata?.documentType === 'work-instruction',
      'folder-forms': (doc) => doc.metadata?.documentType === 'form',
      'folder-policies': (doc) => doc.metadata?.documentType === 'policy',
    };
    
    const filter = folderFilters[selectedFolder.id];
    return filter ? documents.filter(filter) : documents;
  }, [documents, selectedFolder]);
  
  // Stats for document control
  const stats = useMemo(() => ({
    total: documents.length,
    effective: documents.filter(d => d.status === 'effective').length,
    pendingReview: documents.filter(d => d.status === 'pending-review').length,
    draft: documents.filter(d => d.status === 'draft').length,
    dueForReview: documents.filter(d => d.expirationDate && new Date(d.expirationDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length,
  }), [documents]);
  
  // Get original controlled document for detail panel
  const selectedControlledDoc = useMemo(() => {
    if (!selectedDocument) return null;
    return mockControlledDocuments.find(d => d.id === selectedDocument.id);
  }, [selectedDocument]);
  
  // Mock version history
  const versionHistory = useMemo(() => {
    if (!selectedControlledDoc) return [];
    return [
      { version: selectedControlledDoc.version, date: selectedControlledDoc.updatedAt, author: selectedControlledDoc.lastModifiedBy, status: selectedControlledDoc.status, changes: 'Current version' },
      { version: `${selectedControlledDoc.majorVersion - 1}.0`, date: '2023-06-15T10:00:00Z', author: selectedControlledDoc.author, status: 'superseded', changes: 'Previous major revision' },
      { version: `${selectedControlledDoc.majorVersion - 2}.0`, date: '2022-01-10T08:00:00Z', author: 'System', status: 'superseded', changes: 'Initial release' },
    ].filter(v => parseFloat(v.version) > 0);
  }, [selectedControlledDoc]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <KPICard icon={<FileText className="w-5 h-5" />} label="Total Documents" value={stats.total} color="slate" />
        <KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Effective" value={stats.effective} color="emerald" />
        <KPICard icon={<Clock className="w-5 h-5" />} label="Pending Review" value={stats.pendingReview} color={stats.pendingReview > 0 ? 'amber' : 'slate'} />
        <KPICard icon={<FileCheck className="w-5 h-5" />} label="Draft" value={stats.draft} color="blue" />
        <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="Due for Review" value={stats.dueForReview} color={stats.dueForReview > 0 ? 'red' : 'emerald'} />
      </div>
      
      {/* Document Browser */}
      <div className="flex gap-6 h-[calc(100vh-380px)] min-h-[500px]">
        <UnifiedDocumentBrowser
          documents={filteredDocuments}
          folders={mockDocumentFolders}
          title="Document Control"
          description="Controlled documents and SOPs"
          onDocumentSelect={setSelectedDocument}
          onDocumentView={(doc) => { setSelectedDocument(doc); }}
          onFolderSelect={setSelectedFolder}
          selectedDocumentId={selectedDocument?.id}
          selectedFolderId={selectedFolder?.id}
          showFolderTree={true}
          showFilters={true}
          showSearch={true}
          viewMode="list"
          customActions={(doc) => (
            <div className="flex items-center gap-1">
              <IconButton 
                icon={<History className="w-4 h-4" />} 
                size="sm" 
                variant="ghost" 
                title="Version History"
                onClick={(e) => { e.stopPropagation(); setSelectedDocument(doc); setShowVersionHistory(true); }}
              />
              <IconButton 
                icon={<Download className="w-4 h-4" />} 
                size="sm" 
                variant="ghost" 
                title="Download"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  // v0.15.25: Download document
                  const blob = new Blob([`Document: ${doc.title}\nID: ${doc.id}`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = `${doc.id}.txt`;
                  window.document.body.appendChild(a);
                  a.click();
                  window.document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              />
            </div>
          )}
          className="flex-1"
        />
        
        {/* Detail Panel */}
        {selectedDocument && selectedControlledDoc && (
          <Card className="w-[400px] flex flex-col overflow-hidden">
            <CardContent className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                {/* v0.15.2: Document Number links to Document Control */}
                <DocumentNumberLink
                  documentNumber={selectedControlledDoc.documentNumber}
                  sourceDocumentId={selectedControlledDoc.id}
                  version={selectedControlledDoc.version}
                />
                {getDocumentStatusBadge(selectedControlledDoc.status)}
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">{selectedControlledDoc.title}</h3>
              <div className="flex items-center gap-2">
                {getDocumentTypeBadge(selectedControlledDoc.documentType)}
                <span className="text-xs text-text-muted">v{selectedControlledDoc.version}</span>
              </div>
            </CardContent>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-xs font-medium text-text-muted mb-1">Description</h4>
                <p className="text-sm text-text-secondary">{selectedControlledDoc.description}</p>
              </div>
              
              {/* Key Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <InfoItem label="Effective Date" value={selectedControlledDoc.effectiveDate?.split('T')[0] || 'Not effective'} />
                <InfoItem label="Next Review" value={selectedControlledDoc.periodicReviewDate?.split('T')[0] || 'Not scheduled'} highlight={!!(selectedControlledDoc.periodicReviewDate && new Date(selectedControlledDoc.periodicReviewDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))} />
              </div>
              
              {/* Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <InfoItem label="Author" value={selectedControlledDoc.author} />
                <InfoItem label="Owner" value={selectedControlledDoc.owner} />
              </div>
              
              {/* Department & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <InfoItem label="Department" value={selectedControlledDoc.department.replace(/-/g, ' ')} />
                <InfoItem label="Category" value={selectedControlledDoc.category} />
              </div>
              
              {/* Compliance Flags */}
              <div>
                <h4 className="text-xs font-medium text-text-muted mb-2">Compliance Requirements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedControlledDoc.trainingRequired && (
                    <Badge color="blue" size="xs">Training Required</Badge>
                  )}
                  {selectedControlledDoc.changeControlRequired && (
                    <Badge color="purple" size="xs">Change Control Required</Badge>
                  )}
                  <Badge color="slate" size="xs">{selectedControlledDoc.confidentialityLevel}</Badge>
                </div>
              </div>
              
              {/* Regulatory Frameworks */}
              {selectedControlledDoc.regulatoryFrameworks.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2">Regulatory Frameworks</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedControlledDoc.regulatoryFrameworks.map(fw => (
                      <Badge key={fw} color="amber" size="xs">{fw.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Keywords */}
              {selectedControlledDoc.keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedControlledDoc.keywords.map(kw => (
                      <span key={kw} className="text-xs px-2 py-0.5 bg-surface rounded text-text-secondary">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Button variant="primary" size="sm" className="w-full" icon={<Eye className="w-4 h-4" />} onClick={() => {
                // v0.21.9: Open document viewer modal
                setShowDocumentViewer(true);
              }}>
                View Document
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" icon={<History className="w-4 h-4" />} onClick={() => setShowVersionHistory(true)}>
                  History
                </Button>
                <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => {
                  // v0.15.25: Download document
                  if (selectedControlledDoc) {
                    const blob = new Blob([`Document: ${selectedControlledDoc.title}\nID: ${selectedControlledDoc.documentNumber}\nVersion: ${selectedControlledDoc.version}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = `${selectedControlledDoc.documentNumber}-v${selectedControlledDoc.version}.txt`;
                    window.document.body.appendChild(a);
                    a.click();
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}>
                  Download
                </Button>
              </div>
              {selectedControlledDoc.status === 'draft' && (
                <CapabilityGate moduleId="qms" capability="submit">
                <Button variant="primary" size="sm" className="w-full" icon={<Upload className="w-4 h-4" />} onClick={() => {
                  // v0.44.12: Submit for review — bump minor version
                  const newVer = bumpMinor(selectedControlledDoc.version || '1.0');
                  updateDocument(selectedControlledDoc.id, { status: 'pending-review', version: newVer, minorVersion: parseInt(newVer.split('.')[1] || '0') });
                  toast.success(`${selectedControlledDoc.documentNumber} v${newVer} submitted for review`, {
                    action: { label: 'View in QMS →', onClick: () => useAppStore.getState().setActiveModule('qms') },
                  });
                }}>
                  Submit for Review
                </Button>
                </CapabilityGate>
              )}
              {selectedControlledDoc.status === 'pending-review' && (
                <CapabilityGate moduleId="qms" capability="approve">
                <Button variant="success" size="sm" className="w-full" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => {
                  // v0.44.12: Approve — bump minor version again
                  const newVer = bumpMinor(selectedControlledDoc.version || '1.0');
                  updateDocument(selectedControlledDoc.id, { status: 'approved', version: newVer, minorVersion: parseInt(newVer.split('.')[1] || '0') });
                  toast.success(`${selectedControlledDoc.documentNumber} v${newVer} approved`, {
                    action: { label: 'View in Document Control →', onClick: () => useAppStore.getState().setActiveModule('document-control') },
                  });
                }}>
                  Approve
                </Button>
                </CapabilityGate>
              )}
              {selectedControlledDoc.status === 'approved' && (
                <Button variant="primary" size="sm" className="w-full" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => {
                  // v0.44.12: Make effective — bump to next major version
                  const newVer = bumpMajor(selectedControlledDoc.version || '1.0');
                  const majorInt = parseInt(newVer.split('.')[0] || '1');
                  updateDocument(selectedControlledDoc.id, {
                    status: 'effective',
                    version: newVer,
                    majorVersion: majorInt,
                    minorVersion: 0,
                    effectiveDate: new Date().toISOString(),
                  });
                  toast.success(`${selectedControlledDoc.documentNumber} v${newVer} is now effective`);
                }}>
                  Make Effective
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
      
      {/* Version History Modal */}
      <Modal 
        isOpen={showVersionHistory} 
        onClose={() => setShowVersionHistory(false)} 
        title={`Version History - ${selectedControlledDoc?.documentNumber || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {versionHistory.map((v, i) => (
            <div key={v.version} className={`flex items-start gap-4 p-4 rounded-lg ${i === 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-surface'}`}>
              <div className="flex-shrink-0 w-16">
                <Badge color={i === 0 ? 'emerald' : 'gray'} size="sm">v{v.version}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-text-primary">{v.changes}</span>
                  {i === 0 && <Badge color="emerald" size="xs">Current</Badge>}
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(v.date).toLocaleDateString()} by {v.author}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {v.status === 'superseded' ? (
                  <Badge color="gray" size="xs">Superseded</Badge>
                ) : (
                  getDocumentStatusBadge(v.status as ApprovalStatus)
                )}
                <Button variant="ghost" size="xs" icon={<Eye className="w-3 h-3" />} onClick={() => {
                  // v0.21.9: View specific version - open version detail modal
                  setViewingVersion(v);
                }}>View</Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* v0.21.9: Document Viewer Modal */}
      <Modal 
        isOpen={showDocumentViewer} 
        onClose={() => setShowDocumentViewer(false)} 
        title={`Document Viewer - ${selectedControlledDoc?.documentNumber || ''}`}
        size="xl"
      >
        <div className="space-y-4 md:space-y-6">
          {selectedControlledDoc && (
            <>
              <div className="bg-surface p-4 rounded-lg">
                <h3 className="font-semibold text-text-primary mb-2">{selectedControlledDoc.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Document Number:</span>{' '}
                    <span className="text-text-primary">{selectedControlledDoc.documentNumber}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Version:</span>{' '}
                    <span className="text-text-primary">{selectedControlledDoc.version}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Status:</span>{' '}
                    {getDocumentStatusBadge(selectedControlledDoc.status)}
                  </div>
                  <div>
                    <span className="text-text-muted">Type:</span>{' '}
                    {getDocumentTypeBadge(selectedControlledDoc.documentType)}
                  </div>
                </div>
              </div>
              
              <div className="bg-surface p-4 rounded-lg">
                <h4 className="text-sm font-medium text-text-muted mb-2">Description</h4>
                <p className="text-text-primary">{selectedControlledDoc.description}</p>
              </div>
              
              <div className="bg-surface p-4 rounded-lg min-h-[200px] border border-border">
                <div className="flex items-center justify-center h-full text-text-muted">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Document content preview</p>
                    <p className="text-xs mt-1">Full document rendering available in Document Control module</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDocumentViewer(false)}>Close</Button>
                <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={() => {
                  const blob = new Blob([`Document: ${selectedControlledDoc.title}\nID: ${selectedControlledDoc.documentNumber}\nVersion: ${selectedControlledDoc.version}\n\n${selectedControlledDoc.description}`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = `${selectedControlledDoc.documentNumber}-v${selectedControlledDoc.version}.txt`;
                  window.document.body.appendChild(a);
                  a.click();
                  window.document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Document downloaded');
                }}>Download</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* v0.21.9: Version Detail Modal */}
      <Modal 
        isOpen={!!viewingVersion} 
        onClose={() => setViewingVersion(null)} 
        title={`Version ${viewingVersion?.version || ''} Details`}
        size="md"
      >
        {viewingVersion && (
          <div className="space-y-4">
            <div className="bg-surface p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Badge color="blue" size="md">v{viewingVersion.version}</Badge>
                {viewingVersion.status === 'superseded' ? (
                  <Badge color="gray" size="sm">Superseded</Badge>
                ) : (
                  getDocumentStatusBadge(viewingVersion.status as ApprovalStatus)
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-text-muted">Created:</span>{' '}
                  <span className="text-text-primary">{new Date(viewingVersion.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-text-muted">Author:</span>{' '}
                  <span className="text-text-primary">{viewingVersion.author}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-surface p-4 rounded-lg">
              <h4 className="text-sm font-medium text-text-muted mb-2">Change Summary</h4>
              <p className="text-text-primary">{viewingVersion.changes}</p>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingVersion(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// v180: IconButton component reference (should be imported from ui)
const IconButton = ({ icon, size = 'md', variant = 'ghost', title, onClick, className }: { icon: React.ReactNode; size?: 'sm' | 'md' | 'lg'; variant?: 'ghost' | 'outline'; title?: string; onClick?: (e: React.MouseEvent) => void; className?: string }) => {
  const sizeClasses = { sm: 'p-1', md: 'p-2', lg: 'p-3' };
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`${sizeClasses[size]} rounded-lg hover:bg-surface-card transition-colors text-text-muted hover:text-text-primary ${className || ''}`}
    >
      {icon}
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT - v162: Added event emission and clickable stat card navigation
// ============================================================================

export function QMSScreen({ filters }: { filters: FilterState }) {
  const [activeTab, setActiveTab] = useState<QMSTab>('dashboard');

  const lix = useLixAgent('QMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['deviations', 'capas', 'audits', 'training']));
  
  // v162: Filter state for drill-down navigation
  const [activeFilter, setActiveFilter] = useState<QMSFilter>('all');

  // v154: Modal states for create workflows
  const [showNewDeviationModal, setShowNewDeviationModal] = useState(false);
  const [showNewCAPAModal, setShowNewCAPAModal] = useState(false);
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [showNewChangeControlModal, setShowNewChangeControlModal] = useState(false);
  const [showAssignTrainingModal, setShowAssignTrainingModal] = useState(false);
  const [showCAPASignatureModal, setShowCAPASignatureModal] = useState(false);
  const [pendingCAPASignature, setPendingCAPASignature] = useState<{ id: string; capaNumber: string } | null>(null);
  const [capaSignedIds, setCAPASignedIds] = useState<Set<string>>(new Set());
  
  // v0.34.3: Batch CAPA creation state
  const [selectedDeviationsForBatchCAPA, setSelectedDeviationsForBatchCAPA] = useState<Set<string>>(new Set());
  const [showBatchCAPAModal, setShowBatchCAPAModal] = useState(false);

  // v128: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  // v162: Cross-module event emission
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);

  const deviationsRecord = useQMSStore(s => s.deviations);
  const capasRecord = useQMSStore(s => s.capas);
  const auditsRecord = useQMSStore(s => s.audits);
  const findingsRecord = useQMSStore(s => s.findings);
  const assignmentsRecord = useQMSStore(s => s.assignments);
  const changeControlsRecord = useQMSStore(s => s.changeControls);
  const selectedDeviationId = useQMSStore(s => s.selectedDeviationId);
  const selectedCAPAId = useQMSStore(s => s.selectedCAPAId);
  const selectedAuditId = useQMSStore(s => s.selectedAuditId);
  const loadMockData = useQMSStore(s => s.loadMockData);
  const setSelectedDeviationId = useQMSStore(s => s.setSelectedDeviationId);
  const setSelectedCAPAId = useQMSStore(s => s.setSelectedCAPAId);
  const setSelectedAuditId = useQMSStore(s => s.setSelectedAuditId);

  // v154: Create actions
  const createDeviation = useQMSStore(s => s.createDeviation);
  const createCAPA = useQMSStore(s => s.createCAPA);
  const createAudit = useQMSStore(s => s.createAudit);
  const createChangeControl = useQMSStore(s => s.createChangeControl);
  const assignTraining = useQMSStore(s => s.assignTraining);
  
  // v162: Approve change control action
  const approveChangeControl = useQMSStore(s => s.approveChangeControl);

  const deviations = useMemo(() => Object.values(deviationsRecord), [deviationsRecord]);
  const capas = useMemo(() => Object.values(capasRecord), [capasRecord]);
  const audits = useMemo(() => Object.values(auditsRecord), [auditsRecord]);
  const findings = useMemo(() => Object.values(findingsRecord), [findingsRecord]);
  const assignments = useMemo(() => Object.values(assignmentsRecord), [assignmentsRecord]);
  const changeControls = useMemo(() => Object.values(changeControlsRecord), [changeControlsRecord]);

  const selectedDeviation = selectedDeviationId ? deviationsRecord[selectedDeviationId] : null;
  const selectedCAPA = selectedCAPAId ? capasRecord[selectedCAPAId] : null;
  const selectedAudit = selectedAuditId ? auditsRecord[selectedAuditId] : null;

  // v162: Create handlers with event emission
  const handleCreateDeviation = (data: NewDeviationInput) => {
    const deviation = createDeviation(data as any);
    setSelectedDeviationId(deviation.id);
    setActiveTab('deviations');
    
    // Emit cross-module event
    emitEvent(
      'deviation-reported',
      'qms',
      {
        deviationId: deviation.id,
        deviationNumber: deviation.deviationNumber,
        title: deviation.title,
        severity: deviation.severity,
        category: deviation.category,
        department: deviation.department,
        affectedProducts: deviation.affectedProducts || [],
        patientSafetyImpact: data.patientSafetyImpact || 'none',
        regulatoryImpact: data.regulatoryImpact || 'none',
      },
      { 
        priority: deviation.severity === 'critical' ? 'critical' : deviation.severity === 'major' ? 'high' : 'medium', 
        automated: true, 
        requiresReview: deviation.severity === 'critical' || data.regulatoryImpact === 'reportable'
      }
    );
  };

  const handleCreateCAPA = (data: NewCAPAInput) => {
    const capa = createCAPA(data as any);
    setSelectedCAPAId(capa.id);
    setActiveTab('capas');
    
    // Emit cross-module event
    emitEvent(
      'capa-initiated',
      'qms',
      {
        capaId: capa.id,
        capaNumber: capa.capaNumber,
        title: capa.title,
        capaType: capa.capaType,
        severity: capa.severity,
        source: capa.source,
        department: capa.department,
        affectedProducts: capa.affectedProducts || [],
        targetCompletionDate: capa.targetCompletionDate,
      },
      { 
        priority: capa.severity === 'critical' ? 'critical' : capa.severity === 'major' ? 'high' : 'medium', 
        automated: true, 
        requiresReview: capa.severity === 'critical'
      }
    );
  };

  // v0.34.3: Handle batch CAPA creation from multiple deviations
  const handleBatchCreateCAPAs = (capaType: 'corrective' | 'preventive' | 'both', deviationIds: string[]) => {
    const createdCAPAs: string[] = [];
    
    deviationIds.forEach((devId) => {
      const deviation = deviationsRecord[devId];
      if (!deviation) return;
      
      const capa = createCAPA({
        title: `CAPA for ${deviation.deviationNumber}: ${deviation.title}`,
        description: `Corrective/Preventive Action initiated from deviation ${deviation.deviationNumber}.\n\nOriginal Deviation:\n${deviation.description}`,
        capaType,
        source: 'deviation',
        sourceRecordId: deviation.id,
        sourceRecordNumber: deviation.deviationNumber,
        severity: deviation.severity,
        priority: deviation.severity === 'critical' ? 'critical' : deviation.severity === 'major' ? 'high' : 'medium',
        department: deviation.department,
        ownerId: deviation.ownerId || 'user-1',
        ownerName: deviation.ownerName || 'System',
        assigneeId: deviation.ownerId || 'user-1',
        assigneeName: deviation.ownerName || 'System',
        targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        regulatoryImpact: deviation.severity === 'critical',
        linkedDeviations: [deviation.id],
      });
      
      createdCAPAs.push(capa.id);
      
      // Emit cross-module event for each CAPA
      emitEvent(
        'capa-initiated',
        'qms',
        {
          capaId: capa.id,
          capaNumber: capa.capaNumber,
          title: capa.title,
          capaType: capa.capaType,
          severity: capa.severity,
          source: 'deviation',
          linkedDeviationId: deviation.id,
          department: capa.department,
        },
        { priority: capa.severity === 'critical' ? 'critical' : 'high', automated: true, requiresReview: false }
      );
    });
    
    // Clear batch selection and navigate to CAPAs
    setSelectedDeviationsForBatchCAPA(new Set());
    if (createdCAPAs.length > 0) {
      setSelectedCAPAId(createdCAPAs[0]);
      setActiveTab('capas');
    }
  };

  const handleCreateAudit = (data: NewAuditInput) => {
    const audit = createAudit(data as any);
    setSelectedAuditId(audit.id);
    setActiveTab('audits');
  };

  const handleCreateChangeControl = (data: NewChangeControlInput) => {
    createChangeControl(data as any);
    setActiveTab('change-control');
  };
  
  // v162: Handle change control approval with event emission
  const handleApproveChangeControl = (ccId: string) => {
    const cc = changeControlsRecord[ccId];
    if (!cc) return;
    
    approveChangeControl(ccId, 'Current User', 'Approved via QMS Dashboard');
    
    // Emit cross-module event
    emitEvent(
      'change-control-approved',
      'qms',
      {
        changeControlId: cc.id,
        changeNumber: cc.changeNumber,
        title: cc.title,
        changeType: cc.changeType,
        changeCategory: cc.category,
        department: cc.department,
        affectedSystems: cc.affectedSystems || [],
        regulatoryImpact: cc.regulatoryAssessment?.regulatoryImpact || 'none',
        effectiveDate: cc.targetImplementationDate,
      },
      { 
        priority: cc.priority === 'critical' ? 'critical' : cc.priority === 'high' ? 'high' : 'medium', 
        automated: false, 
        requiresReview: cc.regulatoryAssessment?.regulatoryImpact !== 'none'
      }
    );
  };

  // 21 CFR Part 11 — CAPA closure signature
  const handleCAPASignatureRequest = (capaId: string, capaNumber: string) => {
    setPendingCAPASignature({ id: capaId, capaNumber });
    setShowCAPASignatureModal(true);
  };

  const handleCAPASignatureConfirm = async (reason: string) => {
    if (!pendingCAPASignature) return;
    const { id, capaNumber } = pendingCAPASignature;
    const capa = capasRecord[id];
    const docContent = JSON.stringify({ capaNumber, title: capa?.title, status: capa?.status, department: capa?.department });
    await fetch('/api/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'capa',
        entityId: id,
        entityLabel: capaNumber,
        action: 'Close CAPA — QA Approved',
        meaning: 'capa-approved',
        signedByUserId: 'current-user',
        signedByName: 'Sarah Thompson',
        signedByTitle: 'QA Manager',
        reason,
        documentContent: docContent,
      }),
    });
    setCAPASignedIds(prev => new Set(Array.from(prev).concat([id])));
    setPendingCAPASignature(null);
  };

    const handleAssignTraining = (data: AssignTrainingInput) => {
    assignTraining(data.userId, 'curriculum-1', data.courseId, data.dueDate);
    setActiveTab('training');
  };

  const toggleSection = (s: string) => { const n = new Set(expandedSections); n.has(s) ? n.delete(s) : n.add(s); setExpandedSections(n); };

  const stats = useMemo(() => ({
    openDeviations: deviations.filter(d => d.status !== 'closed' && d.status !== 'cancelled').length,
    criticalDeviations: deviations.filter(d => d.severity === 'critical' && d.status !== 'closed').length,
    openCAPAs: capas.filter(c => !['closed', 'closed-ineffective', 'cancelled'].includes(c.status)).length,
    overdueCAPAs: capas.filter(c => c.status !== 'closed' && c.status !== 'cancelled' && new Date(c.targetCompletionDate) < new Date()).length,
    upcomingAudits: audits.filter(a =>
      ['planned', 'scheduled'].includes(a.status) && new Date(a.scheduledStartDate) > new Date()).length,
    openFindings: findings.filter(f => f.status === 'open' || f.status === 'response-pending').length,
    overdueTraining: assignments.filter(a => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()).length,
    pendingCC: changeControls.filter(cc => ['pending-review', 'pending-approval', 'impact-assessment'].includes(cc.status)).length,
    trainingCompliance: assignments.length > 0 ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100) : 100,
  }), [deviations, capas, audits, findings, assignments, changeControls]);

  const tabs: { id: QMSTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'quality-cascade', label: 'Quality Cascade', icon: <Sparkles className="w-4 h-4" />, count: 42 }, // v0.6.2: Quality Event Propagation
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, count: 15 }, // v180: Document Control
    { id: 'workflows', label: 'Workflows', icon: <Workflow className="w-4 h-4" />, count: 3 }, // v186: Approval Workflow Visualization
    { id: 'risks', label: 'Risks', icon: <Target className="w-4 h-4" />, count: 6 }, // v187: Risk Assessment Dashboard
    { id: 'risk-capa', label: 'Risk↔CAPA', icon: <Link2 className="w-4 h-4" />, count: 3 }, // v190: Risk-CAPA Integration
    { id: 'audit-trail', label: 'Audit Trail', icon: <History className="w-4 h-4" /> }, // v188: 21 CFR Part 11 Audit Trail
    { id: 'deviations', label: 'Deviations', icon: <AlertTriangle className="w-4 h-4" />, count: stats.openDeviations },
    { id: 'capas', label: 'CAPAs', icon: <Shield className="w-4 h-4" />, count: stats.openCAPAs },
    { id: 'audits', label: 'Audits', icon: <ClipboardCheck className="w-4 h-4" />, count: stats.upcomingAudits },
    { id: 'training', label: 'Training', icon: <BookOpen className="w-4 h-4" />, count: stats.overdueTraining || undefined },
    { id: 'change-control', label: 'Change Control', icon: <FileCheck className="w-4 h-4" />, count: stats.pendingCC || undefined },
  ];

  const filteredDeviations = useMemo(() => deviations.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.deviationNumber.toLowerCase().includes(searchQuery.toLowerCase())), [deviations, searchQuery]);
  const filteredCAPAs = useMemo(() => capas.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.capaNumber.toLowerCase().includes(searchQuery.toLowerCase())), [capas, searchQuery]);
  const filteredAudits = useMemo(() => audits.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.auditNumber.toLowerCase().includes(searchQuery.toLowerCase())), [audits, searchQuery]);
  const filteredCC = useMemo(() => changeControls.filter(cc => cc.title.toLowerCase().includes(searchQuery.toLowerCase()) || cc.changeNumber.toLowerCase().includes(searchQuery.toLowerCase())), [changeControls, searchQuery]);

  const hasData = deviations.length > 0 || capas.length > 0 || audits.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner (fixes bug: was embedded in useMemo) */}
      <ScreenHeader
        moduleId="qms"
          showAssetContext
        title="Quality Management System"
        subtitle="Deviations, CAPAs, change controls, audit management, and compliance"
        icon={<Shield className="w-5 h-5" />}
      />
      {/* v116: Breadcrumb navigation */}
      <div className="px-6 pt-4">
        <Breadcrumb 
          moduleId="qms"
          viewLabel={activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'quality-cascade' ? 'Quality Cascade' : activeTab === 'documents' ? 'Documents' : activeTab === 'workflows' ? 'Workflows' : activeTab === 'risks' ? 'Risk Assessment' : activeTab === 'risk-capa' ? 'Risk↔CAPA Integration' : activeTab === 'audit-trail' ? 'Audit Trail' : activeTab === 'deviations' ? 'Deviations' : activeTab === 'capas' ? 'CAPAs' : activeTab === 'audits' ? 'Audits' : activeTab === 'training' ? 'Training' : 'Change Control'}
        />
        {/* v177: Cross-module return navigation */}
        <ReturnBreadcrumb variant="inline" className="mt-3" />
      </div>
      {hasData && <StatsBar stats={stats} />}
      {lix.status !== 'monitoring' && (
        <LixInlineAlert
          moduleScope="QMS"
          message={lix.message}
          severity={lix.severity}
          actionLabel={lix.actionLabel ?? undefined}
          onAction={lix.actionLabel ? () => useAppStore.getState().setActiveModule('agent-hub') : undefined}
          className="mx-6 mt-3"
        />
      )}
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 py-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <ScrollableTabs
            tabs={tabs.map(tab => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              count: tab.count && tab.count > 0 ? tab.count : undefined,
            }))}
            activeTab={activeTab}
            onTabChange={(id) => { setActiveTab(id as QMSTab); setActiveFilter('all'); }}
            variant="pill"
            activeColor="#F59E0B"
            className="flex-1 min-w-0"
          />
          <div className="flex-shrink-0">
          {!hasData ? <Button onClick={loadMockData} variant="primary" size="sm" icon={<Zap className="w-4 h-4" />}>Load Sample Data</Button> : <Button onClick={loadMockData} variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {!hasData && activeTab !== 'documents' && activeTab !== 'workflows' && activeTab !== 'risks' && activeTab !== 'risk-capa' && activeTab !== 'audit-trail' && activeTab !== 'quality-cascade' ? <QMSEmptyState onLoad={loadMockData} /> : activeTab === 'dashboard' ? <DashboardView stats={stats} deviations={deviations} capas={capas} audits={audits} assignments={assignments} expandedSections={expandedSections} toggleSection={toggleSection} onSelectDeviation={(id) => { setSelectedDeviationId(id); setActiveTab('deviations'); }} onSelectCAPA={(id) => { setSelectedCAPAId(id); setActiveTab('capas'); }} onSelectAudit={(id) => { setSelectedAuditId(id); setActiveTab('audits'); }} onNavigateTab={setActiveTab} activeFilter={activeFilter} setActiveFilter={setActiveFilter} /> : activeTab === 'quality-cascade' ? <QualityCascadeCenter /> : activeTab === 'documents' ? <DocumentsView /> : activeTab === 'workflows' ? <ApprovalWorkflowVisualizationDashboard /> : activeTab === 'risks' ? <RiskAssessmentDashboard /> : activeTab === 'risk-capa' ? <RiskCAPAIntegrationDashboard /> : activeTab === 'audit-trail' ? <AuditTrailDashboard /> : activeTab === 'deviations' ? <DeviationsView deviations={filteredDeviations} selected={selectedDeviation} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelect={setSelectedDeviationId} onNew={() => setShowNewDeviationModal(true)} selectedForBatch={selectedDeviationsForBatchCAPA} onToggleBatchSelect={(id) => { const next = new Set(selectedDeviationsForBatchCAPA); if (next.has(id)) next.delete(id); else next.add(id); setSelectedDeviationsForBatchCAPA(next); }} onOpenBatchModal={() => setShowBatchCAPAModal(true)} /> : activeTab === 'capas' ? <CAPAsView capas={filteredCAPAs} selected={selectedCAPA} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelect={setSelectedCAPAId} onNew={() => setShowNewCAPAModal(true)} onApproveCAPA={handleCAPASignatureRequest} capaSignedIds={capaSignedIds} /> : activeTab === 'audits' ? <AuditsView audits={filteredAudits} findings={findings} selected={selectedAudit} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelect={setSelectedAuditId} onNew={() => setShowNewAuditModal(true)} /> : activeTab === 'training' ? <TrainingView assignments={assignments} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNew={() => setShowAssignTrainingModal(true)} /> : activeTab === 'change-control' ? <ChangeControlView ccs={filteredCC} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNew={() => setShowNewChangeControlModal(true)} onApprove={handleApproveChangeControl} /> : null}
      </div>

      {/* v154: QMS Create Modals */}
      <NewDeviationModal isOpen={showNewDeviationModal} onClose={() => setShowNewDeviationModal(false)} onCreate={handleCreateDeviation} />
      <NewCAPAModal isOpen={showNewCAPAModal} onClose={() => setShowNewCAPAModal(false)} onCreate={handleCreateCAPA} />
      <NewAuditModal isOpen={showNewAuditModal} onClose={() => setShowNewAuditModal(false)} onCreate={handleCreateAudit} />
      <NewChangeControlModal isOpen={showNewChangeControlModal} onClose={() => setShowNewChangeControlModal(false)} onCreate={handleCreateChangeControl} />
      <AssignTrainingModal isOpen={showAssignTrainingModal} onClose={() => setShowAssignTrainingModal(false)} onAssign={handleAssignTraining} />
      
      {/* v0.34.3: Batch CAPA Creation Modal */}
      <BatchCAPAModal 
        isOpen={showBatchCAPAModal} 
        onClose={() => setShowBatchCAPAModal(false)} 
        selectedDeviations={selectedDeviationsForBatchCAPA}
        deviations={deviations}
        onCreate={handleBatchCreateCAPAs}
      />

      {/* 21 CFR Part 11 — CAPA Closure Signature */}
      {pendingCAPASignature && (
        <ElectronicSignatureModal
          isOpen={showCAPASignatureModal}
          onClose={() => { setShowCAPASignatureModal(false); setPendingCAPASignature(null); }}
          onConfirm={handleCAPASignatureConfirm}
          context={{
            entityType: 'capa',
            entityId: pendingCAPASignature.id,
            entityLabel: pendingCAPASignature.capaNumber,
            action: 'Close CAPA — QA Approved',
            meaning: 'capa-approved',
          }}
          currentUser={{ name: 'Sarah Thompson', title: 'QA Manager', email: 's.thompson@ligaturerd.io' }}
        />
      )}
    </div>
  );
}
