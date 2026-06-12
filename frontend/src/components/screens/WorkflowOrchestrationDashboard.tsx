

import { useState, useMemo } from 'react';
import {
  GitBranch,
  Workflow,
  Zap,
  Bell,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Settings,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Link2,
  Layers,
  Activity,
  BarChart3,
  TrendingUp,
  Target,
  Shield,
  FileText,
  AlertCircle,
  Timer,
  Users,
  Building2,
  Calendar,
  History,
  Boxes,
  Network,
  Sparkles,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  BellRing,
  BellOff,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';
import {
  useCrossModuleEventStore,
  CrossModuleEvent,
  CascadeAction,
  CrossModuleEventType,
  ModuleId,
  EVENT_CASCADE_TEMPLATES,
} from '@/store/useCrossModuleEventStore';
// v0.44.1: Removed CrossModuleLineageStatus (demo component stripped)

// =============================================================================
// WORKFLOW ORCHESTRATION TYPES
// =============================================================================

export type WorkflowTriggerType =
  | 'event-based'
  | 'schedule-based'
  | 'threshold-based'
  | 'manual'
  | 'conditional';

export type WorkflowStatus =
  | 'active'
  | 'paused'
  | 'disabled'
  | 'error'
  | 'pending-approval';

export type NotificationType =
  | 'in-app'
  | 'email'
  | 'sms'
  | 'webhook'
  | 'slack'
  | 'teams';

export type ApprovalChainStatus =
  | 'pending'
  | 'in-progress'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'timed-out';

export type EscalationLevel = 'normal' | 'high' | 'critical' | 'emergency';

// Workflow Rule Definition
export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  triggerEventType?: CrossModuleEventType;
  sourceModule: ModuleId;
  targetModules: ModuleId[];
  status: WorkflowStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  notifications: NotificationConfig[];
  approvalChain?: ApprovalChain;
  schedule?: ScheduleConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  executionCount: number;
  lastExecutedAt?: string;
  averageExecutionTime?: number;
  successRate: number;
  enabled: boolean;
  tags: string[];
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in';
  value: string | number | string[];
  logicalOperator?: 'and' | 'or';
}

export interface WorkflowAction {
  id: string;
  type: 'create-record' | 'update-record' | 'send-notification' | 'trigger-workflow' | 'call-api' | 'assign-task';
  targetModule: ModuleId;
  config: Record<string, any>;
  order: number;
  timeout?: number;
  retryCount?: number;
  onFailure?: 'continue' | 'stop' | 'rollback';
}

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  recipients: string[];
  template: string;
  conditions?: WorkflowCondition[];
  enabled: boolean;
}

export interface ApprovalChain {
  id: string;
  name: string;
  steps: ApprovalStep[];
  escalationPolicy: EscalationPolicy;
  timeout: number;
  status: ApprovalChainStatus;
}

export interface ApprovalStep {
  id: string;
  order: number;
  approverType: 'user' | 'role' | 'department' | 'manager';
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comments?: string;
  deadline?: string;
  delegatedTo?: string;
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationRule[];
}

export interface EscalationRule {
  level: EscalationLevel;
  triggerAfterHours: number;
  notifyRoles: string[];
  action: 'notify' | 'reassign' | 'auto-approve' | 'reject';
}

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'once';
  expression?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone: string;
  nextRun?: string;
}

// Active Workflow Instance
export interface WorkflowInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'waiting-approval';
  triggerEventId?: string;
  sourceModule: ModuleId;
  targetModules: ModuleId[];
  startedAt: string;
  completedAt?: string;
  currentStep: number;
  totalSteps: number;
  completedActions: string[];
  pendingActions: string[];
  failedActions: string[];
  approvalStatus?: ApprovalChainStatus;
  error?: string;
  metadata: Record<string, any>;
}

// Notification Instance
export interface NotificationInstance {
  id: string;
  workflowInstanceId: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  readAt?: string;
  error?: string;
}

// =============================================================================
// COLOR MAPS
// =============================================================================

const triggerTypeColorMap: Record<WorkflowTriggerType, string> = {
  'event-based': 'bg-blue-100 text-blue-700',
  'schedule-based': 'bg-purple-100 text-purple-700',
  'threshold-based': 'bg-amber-100 text-amber-700',
  'manual': 'bg-slate-100 text-slate-700',
  'conditional': 'bg-green-100 text-green-700',
};

const workflowStatusColorMap: Record<WorkflowStatus, string> = {
  'active': 'bg-green-100 text-green-700',
  'paused': 'bg-amber-100 text-amber-700',
  'disabled': 'bg-slate-100 text-slate-700',
  'error': 'bg-red-100 text-red-700',
  'pending-approval': 'bg-blue-100 text-blue-700',
};

const instanceStatusColorMap: Record<string, string> = {
  'running': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
  'failed': 'bg-red-100 text-red-700',
  'paused': 'bg-amber-100 text-amber-700',
  'waiting-approval': 'bg-purple-100 text-purple-700',
};

const approvalStatusColorMap: Record<ApprovalChainStatus, string> = {
  'pending': 'bg-slate-100 text-slate-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'approved': 'bg-green-100 text-green-700',
  'rejected': 'bg-red-100 text-red-700',
  'escalated': 'bg-amber-100 text-amber-700',
  'timed-out': 'bg-orange-100 text-orange-700',
};

const notificationTypeColorMap: Record<NotificationType, string> = {
  'in-app': 'bg-blue-100 text-blue-700',
  'email': 'bg-green-100 text-green-700',
  'sms': 'bg-purple-100 text-purple-700',
  'webhook': 'bg-amber-100 text-amber-700',
  'slack': 'bg-pink-100 text-pink-700',
  'teams': 'bg-indigo-100 text-indigo-700',
};

const priorityColorMap: Record<string, string> = {
  'low': 'bg-slate-100 text-slate-700',
  'medium': 'bg-blue-100 text-blue-700',
  'high': 'bg-amber-100 text-amber-700',
  'critical': 'bg-red-100 text-red-700',
};

const moduleColorMap: Partial<Record<ModuleId, string>> & Record<string, string> = {
  'research': 'bg-purple-100 text-purple-700',
  'clinical': 'bg-blue-100 text-blue-700',
  'safety': 'bg-red-100 text-red-700',
  'glp': 'bg-emerald-100 text-emerald-700',
  'psmf': 'bg-rose-100 text-rose-700',
  'regulatory': 'bg-green-100 text-green-700',
  'submissions': 'bg-amber-100 text-amber-700',
  'labeling': 'bg-pink-100 text-pink-700',
  'authoring': 'bg-indigo-100 text-indigo-700',
  'qms': 'bg-teal-100 text-teal-700',
  'cmc': 'bg-orange-100 text-orange-700',
  'haq': 'bg-amber-100 text-amber-700',  // v0.15.33
  'tmf': 'bg-blue-100 text-blue-700',  // v0.15.33
  'supply-chain': 'bg-cyan-100 text-cyan-700',
};

const escalationLevelColorMap: Record<EscalationLevel, string> = {
  'normal': 'bg-slate-100 text-slate-700',
  'high': 'bg-amber-100 text-amber-700',
  'critical': 'bg-orange-100 text-orange-700',
  'emergency': 'bg-red-100 text-red-700',
};

// =============================================================================
// ICON MAPS
// =============================================================================

const triggerTypeIconMap: Record<WorkflowTriggerType, any> = {
  'event-based': Zap,
  'schedule-based': Calendar,
  'threshold-based': Target,
  'manual': Users,
  'conditional': GitBranch,
};

const workflowStatusIconMap: Record<WorkflowStatus, any> = {
  'active': Play,
  'paused': Pause,
  'disabled': BellOff,
  'error': AlertCircle,
  'pending-approval': Clock,
};

const notificationTypeIconMap: Record<NotificationType, any> = {
  'in-app': Bell,
  'email': Send,
  'sms': Send,
  'webhook': Link2,
  'slack': Send,
  'teams': Send,
};

// =============================================================================
// DEMO DATA
// =============================================================================

const demoWorkflowRules: WorkflowRule[] = [
  {
    id: 'wf-001',
    name: 'Safety Signal → CAPA Creation',
    description: 'Automatically create CAPA when confirmed safety signal detected',
    triggerType: 'event-based',
    triggerEventType: 'safety-signal-confirmed',
    sourceModule: 'safety',
    targetModules: ['qms', 'regulatory', 'labeling'],
    status: 'active',
    priority: 'critical',
    conditions: [
      { id: 'c1', field: 'signalSeverity', operator: 'in', value: ['high', 'critical'] },
    ],
    actions: [
      { id: 'a1', type: 'create-record', targetModule: 'qms', config: { recordType: 'CAPA', template: 'safety-capa' }, order: 1 },
      { id: 'a2', type: 'send-notification', targetModule: 'regulatory', config: { template: 'safety-alert' }, order: 2 },
      { id: 'a3', type: 'trigger-workflow', targetModule: 'labeling', config: { workflowId: 'label-review' }, order: 3 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['pv-head@ligature.com', 'qms-head@ligature.com'], template: 'safety-signal-alert', enabled: true },
      { id: 'n2', type: 'in-app', recipients: ['all-safety-team'], template: 'safety-signal-notification', enabled: true },
    ],
    approvalChain: {
      id: 'ac-001',
      name: 'Safety Signal CAPA Approval',
      steps: [
        { id: 's1', order: 1, approverType: 'role', approverId: 'pv-manager', approverName: 'PV Manager', status: 'approved', approvedAt: '2025-12-28T14:30:00Z' },
        { id: 's2', order: 2, approverType: 'role', approverId: 'qms-director', approverName: 'QMS Director', status: 'pending' },
        { id: 's3', order: 3, approverType: 'role', approverId: 'cmo', approverName: 'Chief Medical Officer', status: 'pending' },
      ],
      escalationPolicy: { enabled: true, levels: [
        { level: 'high', triggerAfterHours: 24, notifyRoles: ['vp-quality'], action: 'notify' },
        { level: 'critical', triggerAfterHours: 48, notifyRoles: ['ceo'], action: 'reassign' },
      ]},
      timeout: 72,
      status: 'in-progress',
    },
    createdAt: '2025-10-15T09:00:00Z',
    updatedAt: '2025-12-28T14:30:00Z',
    createdBy: 'Dr. Sarah Chen',
    executionCount: 23,
    lastExecutedAt: '2025-12-28T14:25:00Z',
    averageExecutionTime: 4500,
    successRate: 95.6,
    enabled: true,
    tags: ['safety', 'capa', 'critical-path'],
  },
  {
    id: 'wf-002',
    name: 'Clinical SAE → Expedited Report',
    description: 'Generate expedited safety report for serious adverse events',
    triggerType: 'event-based',
    triggerEventType: 'clinical-sae-escalated',
    sourceModule: 'clinical',
    targetModules: ['safety', 'regulatory'],
    status: 'active',
    priority: 'critical',
    conditions: [
      { id: 'c1', field: 'seriousnessCriteria', operator: 'contains', value: 'life-threatening' },
    ],
    actions: [
      { id: 'a1', type: 'create-record', targetModule: 'safety', config: { recordType: 'ExpediteReport', template: '15-day-report' }, order: 1 },
      { id: 'a2', type: 'assign-task', targetModule: 'safety', config: { assignTo: 'pv-expedited-team' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['pv-expedited@ligature.com'], template: 'sae-alert', enabled: true },
      { id: 'n2', type: 'sms', recipients: ['pv-on-call'], template: 'urgent-sae', enabled: true },
    ],
    createdAt: '2025-09-01T10:00:00Z',
    updatedAt: '2025-12-29T08:15:00Z',
    createdBy: 'Dr. Michael Torres',
    executionCount: 8,
    lastExecutedAt: '2025-12-29T08:10:00Z',
    averageExecutionTime: 2200,
    successRate: 100,
    enabled: true,
    tags: ['clinical', 'expedited', 'sae'],
  },
  {
    id: 'wf-003',
    name: 'Document Finalized → eCTD Update',
    description: 'Update eCTD submission package when documents are finalized',
    triggerType: 'event-based',
    triggerEventType: 'document-finalized',
    sourceModule: 'authoring',
    targetModules: ['submissions'],
    status: 'active',
    priority: 'medium',
    conditions: [
      { id: 'c1', field: 'documentType', operator: 'in', value: ['CSR', 'Protocol', 'IB'] },
    ],
    actions: [
      { id: 'a1', type: 'update-record', targetModule: 'submissions', config: { action: 'link-document' }, order: 1 },
      { id: 'a2', type: 'send-notification', targetModule: 'submissions', config: { template: 'doc-ready' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'in-app', recipients: ['submission-team'], template: 'document-finalized', enabled: true },
    ],
    createdAt: '2025-08-20T14:00:00Z',
    updatedAt: '2025-12-27T16:45:00Z',
    createdBy: 'Jennifer Williams',
    executionCount: 156,
    lastExecutedAt: '2025-12-27T16:40:00Z',
    averageExecutionTime: 850,
    successRate: 99.4,
    enabled: true,
    tags: ['authoring', 'ectd', 'document-control'],
  },
  {
    id: 'wf-004',
    name: 'Change Control → Supplement Planning',
    description: 'Evaluate supplement requirements for approved change controls',
    triggerType: 'event-based',
    triggerEventType: 'change-control-approved',
    sourceModule: 'qms',
    targetModules: ['submissions', 'regulatory'],
    status: 'active',
    priority: 'high',
    conditions: [
      { id: 'c1', field: 'changeCategory', operator: 'in', value: ['manufacturing', 'formulation', 'facility'] },
    ],
    actions: [
      { id: 'a1', type: 'create-record', targetModule: 'regulatory', config: { recordType: 'SupplementAssessment' }, order: 1 },
      { id: 'a2', type: 'assign-task', targetModule: 'submissions', config: { taskType: 'supplement-planning' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['regulatory-strategy@ligature.com'], template: 'change-control-supplement', enabled: true },
    ],
    approvalChain: {
      id: 'ac-002',
      name: 'Supplement Assessment Review',
      steps: [
        { id: 's1', order: 1, approverType: 'role', approverId: 'reg-manager', approverName: 'Regulatory Manager', status: 'pending' },
        { id: 's2', order: 2, approverType: 'role', approverId: 'reg-director', approverName: 'VP Regulatory Affairs', status: 'pending' },
      ],
      escalationPolicy: { enabled: true, levels: [
        { level: 'high', triggerAfterHours: 48, notifyRoles: ['reg-director'], action: 'notify' },
      ]},
      timeout: 120,
      status: 'pending',
    },
    createdAt: '2025-07-10T11:00:00Z',
    updatedAt: '2025-12-26T09:30:00Z',
    createdBy: 'Robert Kim',
    executionCount: 34,
    lastExecutedAt: '2025-12-26T09:25:00Z',
    averageExecutionTime: 1800,
    successRate: 97.1,
    enabled: true,
    tags: ['qms', 'regulatory', 'supplements'],
  },
  {
    id: 'wf-005',
    name: 'Deviation → Batch Hold Assessment',
    description: 'Assess batch hold requirements when critical deviations reported',
    triggerType: 'event-based',
    triggerEventType: 'deviation-reported',
    sourceModule: 'qms',
    targetModules: ['cmc', 'regulatory'],
    status: 'active',
    priority: 'high',
    conditions: [
      { id: 'c1', field: 'deviationClass', operator: 'equals', value: 'critical' },
    ],
    actions: [
      { id: 'a1', type: 'create-record', targetModule: 'cmc', config: { recordType: 'BatchHoldAssessment' }, order: 1 },
      { id: 'a2', type: 'send-notification', targetModule: 'regulatory', config: { template: 'field-alert-assessment' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['quality-ops@ligature.com', 'batch-disposition@ligature.com'], template: 'critical-deviation', enabled: true },
      { id: 'n2', type: 'slack', recipients: ['#quality-alerts'], template: 'deviation-slack', enabled: true },
    ],
    createdAt: '2025-06-05T08:30:00Z',
    updatedAt: '2025-12-29T11:00:00Z',
    createdBy: 'Lisa Anderson',
    executionCount: 12,
    lastExecutedAt: '2025-12-29T10:55:00Z',
    averageExecutionTime: 1500,
    successRate: 100,
    enabled: true,
    tags: ['qms', 'cmc', 'deviation', 'batch-hold'],
  },
  {
    id: 'wf-006',
    name: 'Weekly Submission Readiness Check',
    description: 'Scheduled workflow to assess submission readiness across programs',
    triggerType: 'schedule-based',
    sourceModule: 'submissions',
    targetModules: ['authoring', 'clinical', 'safety'],
    status: 'active',
    priority: 'medium',
    conditions: [],
    actions: [
      { id: 'a1', type: 'call-api', targetModule: 'submissions', config: { endpoint: '/api/readiness-check' }, order: 1 },
      { id: 'a2', type: 'send-notification', targetModule: 'regulatory', config: { template: 'readiness-report' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['program-leads@ligature.com'], template: 'weekly-readiness', enabled: true },
    ],
    schedule: {
      type: 'cron',
      expression: '0 9 * * MON',
      timezone: 'America/New_York',
      nextRun: '2026-01-06T09:00:00-05:00',
    },
    createdAt: '2025-05-01T12:00:00Z',
    updatedAt: '2025-12-23T09:00:00Z',
    createdBy: 'Amanda Foster',
    executionCount: 34,
    lastExecutedAt: '2025-12-23T09:00:00Z',
    averageExecutionTime: 12000,
    successRate: 100,
    enabled: true,
    tags: ['submissions', 'scheduled', 'readiness'],
  },
  {
    id: 'wf-007',
    name: 'Labeling Approved → Packaging Notification',
    description: 'Notify packaging operations when labeling is approved',
    triggerType: 'event-based',
    triggerEventType: 'labeling-approved',
    sourceModule: 'labeling',
    targetModules: ['cmc', 'submissions'],
    status: 'paused',
    priority: 'medium',
    conditions: [],
    actions: [
      { id: 'a1', type: 'send-notification', targetModule: 'cmc', config: { template: 'packaging-ready' }, order: 1 },
      { id: 'a2', type: 'update-record', targetModule: 'submissions', config: { action: 'update-module-1' }, order: 2 },
    ],
    notifications: [
      { id: 'n1', type: 'email', recipients: ['packaging@ligature.com'], template: 'labeling-approved', enabled: true },
    ],
    createdAt: '2025-04-15T15:00:00Z',
    updatedAt: '2025-12-20T10:30:00Z',
    createdBy: 'David Martinez',
    executionCount: 28,
    lastExecutedAt: '2025-12-15T14:20:00Z',
    averageExecutionTime: 950,
    successRate: 96.4,
    enabled: false,
    tags: ['labeling', 'packaging', 'cmc'],
  },
];

const demoWorkflowInstances: WorkflowInstance[] = [
  {
    id: 'inst-001',
    ruleId: 'wf-001',
    ruleName: 'Safety Signal → CAPA Creation',
    status: 'waiting-approval',
    triggerEventId: 'evt-2025-001',
    sourceModule: 'safety',
    targetModules: ['qms', 'regulatory', 'labeling'],
    startedAt: '2025-12-30T09:15:00Z',
    currentStep: 2,
    totalSteps: 3,
    completedActions: ['a1'],
    pendingActions: ['a2', 'a3'],
    failedActions: [],
    approvalStatus: 'in-progress',
    metadata: { signalId: 'SIG-2025-042', severity: 'high', product: 'LIG-2847' },
  },
  {
    id: 'inst-002',
    ruleId: 'wf-002',
    ruleName: 'Clinical SAE → Expedited Report',
    status: 'running',
    triggerEventId: 'evt-2025-002',
    sourceModule: 'clinical',
    targetModules: ['safety', 'regulatory'],
    startedAt: '2025-12-30T10:30:00Z',
    currentStep: 1,
    totalSteps: 2,
    completedActions: [],
    pendingActions: ['a1', 'a2'],
    failedActions: [],
    metadata: { saeId: 'SAE-2025-089', study: 'LIG-2847-301', site: 'US-023' },
  },
  {
    id: 'inst-003',
    ruleId: 'wf-003',
    ruleName: 'Document Finalized → eCTD Update',
    status: 'completed',
    triggerEventId: 'evt-2025-003',
    sourceModule: 'authoring',
    targetModules: ['submissions'],
    startedAt: '2025-12-30T08:00:00Z',
    completedAt: '2025-12-30T08:02:15Z',
    currentStep: 2,
    totalSteps: 2,
    completedActions: ['a1', 'a2'],
    pendingActions: [],
    failedActions: [],
    metadata: { documentId: 'DOC-CSR-2847-001', version: '2.0' },
  },
  {
    id: 'inst-004',
    ruleId: 'wf-005',
    ruleName: 'Deviation → Batch Hold Assessment',
    status: 'failed',
    triggerEventId: 'evt-2025-004',
    sourceModule: 'qms',
    targetModules: ['cmc', 'regulatory'],
    startedAt: '2025-12-29T16:45:00Z',
    completedAt: '2025-12-29T16:46:30Z',
    currentStep: 1,
    totalSteps: 2,
    completedActions: [],
    pendingActions: [],
    failedActions: ['a1'],
    error: 'CMC module unavailable - timeout after 60s',
    metadata: { deviationId: 'DEV-2025-156', batchNumber: 'B2025-042' },
  },
];

const demoNotifications: NotificationInstance[] = [
  {
    id: 'notif-001',
    workflowInstanceId: 'inst-001',
    type: 'email',
    recipient: 'pv-head@ligature.com',
    subject: 'Safety Signal Alert: SIG-2025-042 Requires CAPA',
    message: 'A confirmed safety signal requires immediate CAPA creation...',
    status: 'delivered',
    sentAt: '2025-12-30T09:16:00Z',
  },
  {
    id: 'notif-002',
    workflowInstanceId: 'inst-001',
    type: 'in-app',
    recipient: 'all-safety-team',
    subject: 'New Safety Signal CAPA',
    message: 'CAPA-2025-089 created from safety signal SIG-2025-042',
    status: 'sent',
    sentAt: '2025-12-30T09:16:05Z',
  },
  {
    id: 'notif-003',
    workflowInstanceId: 'inst-002',
    type: 'sms',
    recipient: 'pv-on-call',
    subject: 'URGENT: SAE Escalation',
    message: 'SAE-2025-089 requires expedited reporting',
    status: 'delivered',
    sentAt: '2025-12-30T10:31:00Z',
  },
  {
    id: 'notif-004',
    workflowInstanceId: 'inst-004',
    type: 'email',
    recipient: 'quality-ops@ligature.com',
    subject: 'Workflow Failed: Deviation Batch Hold',
    message: 'Workflow instance inst-004 failed due to CMC module timeout',
    status: 'delivered',
    sentAt: '2025-12-29T16:47:00Z',
  },
];

// =============================================================================
// SUB-VIEWS
// =============================================================================

type SubView = 'rules' | 'instances' | 'approvals' | 'notifications' | 'analytics';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
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
};

const getModuleLabel = (moduleId: ModuleId): string => {
  const labels: Partial<Record<ModuleId, string>> & Record<string, string> = {
    'research': 'Research',
    'clinical': 'Clinical',
    'safety': 'Safety',
    'glp': 'GLP',
    'psmf': 'PSMF',
    'regulatory': 'Regulatory',
    'submissions': 'Submissions',
    'labeling': 'Labeling',
    'authoring': 'Authoring',
    'qms': 'QMS',
    'cmc': 'CMC',
    'haq': 'HAQ',  // v0.15.33
    'tmf': 'TMF',  // v0.15.33
    'supply-chain': 'Supply Chain',
  };
  return labels[moduleId] || moduleId;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface WorkflowOrchestrationDashboardProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function WorkflowOrchestrationDashboard({ filters: _filters }: WorkflowOrchestrationDashboardProps) {
  const { filterByProductName, selectedProduct } = useProductFilter();
    const { deadClick } = useDeadClick();
  const [activeSubView, setActiveSubView] = useState<SubView>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRule, setSelectedRule] = useState<WorkflowRule | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Get cross-module events from store (use individual selectors to prevent infinite loops)
  const events = useCrossModuleEventStore(s => s.events);
  const eventFeed = useCrossModuleEventStore(s => s.eventFeed);

  // Computed statistics
  const stats = useMemo(() => {
    const activeRules = demoWorkflowRules.filter(r => r.status === 'active').length;
    const runningInstances = demoWorkflowInstances.filter(i => i.status === 'running' || i.status === 'waiting-approval').length;
    const pendingApprovals = demoWorkflowRules.filter(r => r.approvalChain?.status === 'in-progress').length;
    const failedToday = demoWorkflowInstances.filter(i => {
      if (i.status !== 'failed') return false;
      const start = new Date(i.startedAt);
      const today = new Date();
      return start.toDateString() === today.toDateString();
    }).length;
    const avgSuccessRate = demoWorkflowRules.reduce((acc, r) => acc + r.successRate, 0) / demoWorkflowRules.length;
    const totalExecutions = demoWorkflowRules.reduce((acc, r) => acc + r.executionCount, 0);
    
    return {
      activeRules,
      runningInstances,
      pendingApprovals,
      failedToday,
      avgSuccessRate,
      totalExecutions,
    };
  }, []);

  // Filter rules
  const filteredRules = useMemo(() => {
    return demoWorkflowRules.filter(rule => {
      if (searchQuery && !rule.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !rule.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && rule.status !== statusFilter) return false;
      if (moduleFilter !== 'all' && rule.sourceModule !== moduleFilter && !rule.targetModules.includes(moduleFilter as ModuleId)) return false;
      if (priorityFilter !== 'all' && rule.priority !== priorityFilter) return false;
      return true;
    });
  }, [searchQuery, statusFilter, moduleFilter, priorityFilter]);

  // Filter instances
  const filteredInstances = useMemo(() => {
    return demoWorkflowInstances.filter(inst => {
      if (searchQuery && !inst.ruleName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && inst.status !== statusFilter) return false;
      if (moduleFilter !== 'all' && inst.sourceModule !== moduleFilter && !inst.targetModules.includes(moduleFilter as ModuleId)) return false;
      return true;
    });
  }, [searchQuery, statusFilter, moduleFilter]);

  // Rules with pending approvals
  const rulesWithApprovals = useMemo(() => {
    return demoWorkflowRules.filter(r => r.approvalChain && r.approvalChain.status !== 'approved' && r.approvalChain.status !== 'rejected');
  }, []);

  // Sub-view tabs
  const subViewTabs: { id: SubView; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'rules', label: 'Workflow Rules', icon: GitBranch, count: demoWorkflowRules.length },
    { id: 'instances', label: 'Active Instances', icon: Activity, count: stats.runningInstances },
    { id: 'approvals', label: 'Approval Chains', icon: Users, count: stats.pendingApprovals },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: demoNotifications.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Network className="h-7 w-7 text-blue-600" />
            Workflow Orchestration
          </h1>
          <p className="text-slate-600 mt-1">Cross-module workflow triggers, cascade approvals, and integrated notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={deadClick}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={deadClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Active Rules</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeRules}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Running</p>
              <p className="text-2xl font-bold text-slate-900">{stats.runningInstances}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingApprovals}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Failed Today</p>
              <p className="text-2xl font-bold text-slate-900">{stats.failedToday}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Success Rate</p>
              <p className="text-2xl font-bold text-slate-900">{stats.avgSuccessRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Executions</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalExecutions}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Cross-Module Events Widget */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Recent Cross-Module Events</h3>
            <span className="text-xs text-slate-500">{events.length} events tracked</span>
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">
              No cross-module events yet. Events will appear here as modules sync.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.slice(0, 5).map(event => {
                // Derive overall status from cascade actions
                const hasCompleted = event.cascadeActions.some(a => a.status === 'completed');
                const hasFailed = event.cascadeActions.some(a => a.status === 'failed');
                const hasPending = event.cascadeActions.some(a => a.status === 'pending');
                const statusColor = hasFailed ? 'bg-red-500' : 
                  hasCompleted && !hasPending ? 'bg-green-500' : 
                  hasPending ? 'bg-amber-500' : 'bg-blue-500';
                
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-sm">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <div className="flex-1">
                      <span className="font-medium">{event.type.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 ml-2">{event.sourceModule} → {event.targetModules.join(', ')}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Sub-view Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {subViewTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubView(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeSubView === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeSubView === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      {(activeSubView === 'rules' || activeSubView === 'instances') && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder={activeSubView === 'rules' ? 'Search workflow rules...' : 'Search instances...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            {activeSubView === 'rules' ? (
              <>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="disabled">Disabled</option>
                <option value="error">Error</option>
              </>
            ) : (
              <>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="waiting-approval">Waiting Approval</option>
              </>
            )}
          </select>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Modules</option>
            <option value="research">Research</option>
            <option value="clinical">Clinical</option>
            <option value="safety">Safety</option>
            <option value="regulatory">Regulatory</option>
            <option value="submissions">Submissions</option>
            <option value="labeling">Labeling</option>
            <option value="authoring">Authoring</option>
            <option value="qms">QMS</option>
            <option value="cmc">CMC</option>
          </select>
          {activeSubView === 'rules' && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Main List */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          {activeSubView === 'rules' && (
            <>
              {filteredRules.map(rule => {
                const TriggerIcon = triggerTypeIconMap[rule.triggerType];
                const StatusIcon = workflowStatusIconMap[rule.status];
                return (
                  <Card 
                    key={rule.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedRule?.id === rule.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedRule(rule)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${triggerTypeColorMap[rule.triggerType]}`}>
                          <TriggerIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColorMap[rule.priority]}`}>
                              {rule.priority}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-1 text-xs rounded ${moduleColorMap[rule.sourceModule]}`}>
                                {getModuleLabel(rule.sourceModule)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              {rule.targetModules.map(m => (
                                <span key={m} className={`px-2 py-1 text-xs rounded ${moduleColorMap[m]}`}>
                                  {getModuleLabel(m)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${workflowStatusColorMap[rule.status]}`}>
                            <StatusIcon className="h-3 w-3" />
                            {rule.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {rule.executionCount} executions • {rule.successRate}% success
                        </div>
                        {rule.lastExecutedAt && (
                          <div className="text-xs text-slate-400">
                            Last: {formatRelativeTime(rule.lastExecutedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}

          {activeSubView === 'instances' && (
            <>
              {filteredInstances.map(inst => (
                <Card 
                  key={inst.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedInstance?.id === inst.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedInstance(inst)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{inst.ruleName}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${instanceStatusColorMap[inst.status]}`}>
                          {inst.status.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Instance: {inst.id}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 text-xs rounded ${moduleColorMap[inst.sourceModule]}`}>
                            {getModuleLabel(inst.sourceModule)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          {inst.targetModules.map(m => (
                            <span key={m} className={`px-2 py-1 text-xs rounded ${moduleColorMap[m]}`}>
                              {getModuleLabel(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-medium text-slate-900">
                        Step {inst.currentStep} of {inst.totalSteps}
                      </div>
                      <ProgressBar 
                        value={(inst.completedActions.length / inst.totalSteps) * 100} 
                        className="w-32"
                        color={inst.status === 'failed' ? 'red' : inst.status === 'completed' ? 'green' : 'blue'}
                      />
                      <div className="text-xs text-slate-500">
                        Started {formatRelativeTime(inst.startedAt)}
                      </div>
                    </div>
                  </div>
                  {inst.error && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {inst.error}
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}

          {activeSubView === 'approvals' && (
            <>
              {rulesWithApprovals.map(rule => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{rule.approvalChain?.name}</h3>
                      <p className="text-sm text-slate-600">For: {rule.name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${approvalStatusColorMap[rule.approvalChain?.status || 'pending']}`}>
                      {rule.approvalChain?.status}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {rule.approvalChain?.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step.status === 'approved' ? 'bg-green-100 text-green-700' :
                          step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          step.status === 'pending' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {step.status === 'approved' ? <CheckCircle2 className="h-4 w-4" /> :
                           step.status === 'rejected' ? <XCircle className="h-4 w-4" /> :
                           idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{step.approverName}</p>
                              <p className="text-xs text-slate-500">{step.approverType}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs ${
                                step.status === 'approved' ? 'text-green-600' :
                                step.status === 'rejected' ? 'text-red-600' :
                                'text-slate-500'
                              }`}>
                                {step.status}
                              </span>
                              {step.approvedAt && (
                                <p className="text-xs text-slate-400">{formatRelativeTime(step.approvedAt)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {idx < (rule.approvalChain?.steps.length || 0) - 1 && (
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    ))}
                  </div>
                  {rule.approvalChain?.escalationPolicy.enabled && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">Escalation Policy</p>
                      <div className="flex items-center gap-2">
                        {rule.approvalChain.escalationPolicy.levels.map(level => (
                          <span key={level.level} className={`px-2 py-1 text-xs rounded ${escalationLevelColorMap[level.level]}`}>
                            {level.level}: {level.triggerAfterHours}h → {level.action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}

          {activeSubView === 'notifications' && (
            <>
              {demoNotifications.map(notif => {
                const TypeIcon = notificationTypeIconMap[notif.type];
                return (
                  <Card key={notif.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${notificationTypeColorMap[notif.type]}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900">{notif.subject}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded ${notificationTypeColorMap[notif.type]}`}>
                              {notif.type}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>To: {notif.recipient}</span>
                            <span>Instance: {notif.workflowInstanceId}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          notif.status === 'delivered' || notif.status === 'read' ? 'bg-green-100 text-green-700' :
                          notif.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          notif.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {notif.status}
                        </span>
                        {notif.sentAt && (
                          <span className="text-xs text-slate-400">{formatRelativeTime(notif.sentAt)}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}

          {activeSubView === 'analytics' && (
            <div className="space-y-4 md:space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <Card className="p-4">
                  <p className="text-sm text-slate-500">Avg Execution Time</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatDuration(demoWorkflowRules.reduce((acc, r) => acc + (r.averageExecutionTime || 0), 0) / demoWorkflowRules.length)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    12% faster than last month
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-slate-500">Cross-Module Events (30d)</p>
                  <p className="text-2xl font-bold text-slate-900">1,847</p>
                  <div className="flex items-center gap-1 mt-1 text-blue-600 text-xs">
                    <ArrowUpRight className="h-3 w-3" />
                    23% increase
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-slate-500">Automation Coverage</p>
                  <p className="text-2xl font-bold text-slate-900">78%</p>
                  <ProgressBar value={78} className="mt-2" color="blue" />
                </Card>
              </div>

              {/* Workflow Distribution */}
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Workflow Triggers by Type</h3>
                <div className="space-y-3">
                  {(['event-based', 'schedule-based', 'threshold-based', 'manual', 'conditional'] as WorkflowTriggerType[]).map(type => {
                    const count = demoWorkflowRules.filter(r => r.triggerType === type).length;
                    const percentage = (count / demoWorkflowRules.length) * 100;
                    const Icon = triggerTypeIconMap[type];
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${triggerTypeColorMap[type]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-700 capitalize">{type.replace('-', ' ')}</span>
                            <span className="text-sm text-slate-500">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <ProgressBar value={percentage} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Module Connectivity */}
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Cross-Module Connections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['safety', 'clinical', 'qms', 'regulatory', 'submissions', 'authoring'] as ModuleId[]).map(module => {
                    const outgoing = demoWorkflowRules.filter(r => r.sourceModule === module).length;
                    const incoming = demoWorkflowRules.filter(r => r.targetModules.includes(module)).length;
                    return (
                      <div key={module} className={`p-3 rounded-lg ${(moduleColorMap[module] ?? 'bg-slate-100 text-slate-700').replace('text-', 'border-').replace('700', '300')} border`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{getModuleLabel(module)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" /> {outgoing} out
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowDownRight className="h-3 w-3" /> {incoming} in
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {activeSubView === 'rules' && selectedRule && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Rule Details</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={deadClick}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deadClick}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trigger Configuration</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm"><span className="font-medium">Type:</span> {selectedRule.triggerType}</p>
                    {selectedRule.triggerEventType && (
                      <p className="text-sm"><span className="font-medium">Event:</span> {selectedRule.triggerEventType}</p>
                    )}
                    {selectedRule.schedule && (
                      <p className="text-sm"><span className="font-medium">Schedule:</span> {selectedRule.schedule.expression || `Every ${selectedRule.schedule.intervalMinutes}m`}</p>
                    )}
                  </div>
                </div>

                {selectedRule.conditions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Conditions</p>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      {selectedRule.conditions.map(cond => (
                        <div key={cond.id} className="text-sm">
                          <code className="bg-slate-200 px-1 rounded">{cond.field}</code>
                          <span className="mx-1">{cond.operator}</span>
                          <code className="bg-slate-200 px-1 rounded">{JSON.stringify(cond.value)}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Actions ({selectedRule.actions.length})</p>
                  <div className="space-y-2">
                    {selectedRule.actions.map(action => (
                      <div key={action.id} className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                          {action.order}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{action.type.replace('-', ' ')}</p>
                          <p className="text-xs text-slate-500">Target: {getModuleLabel(action.targetModule)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notifications ({selectedRule.notifications.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRule.notifications.map(notif => (
                      <span key={notif.id} className={`px-2 py-1 text-xs rounded ${notificationTypeColorMap[notif.type]} flex items-center gap-1`}>
                        {notif.enabled ? <BellRing className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                        {notif.type}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Performance</p>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Executions</span>
                      <span className="font-medium">{selectedRule.executionCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-medium">{selectedRule.successRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Time</span>
                      <span className="font-medium">{formatDuration(selectedRule.averageExecutionTime || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRule.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Created by {selectedRule.createdBy} on {new Date(selectedRule.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    Last updated {formatRelativeTime(selectedRule.updatedAt)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeSubView === 'instances' && selectedInstance && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Instance Details</h3>
                <div className="flex items-center gap-2">
                  {selectedInstance.status === 'running' && (
                    <Button variant="outline" size="sm" onClick={deadClick}>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  {selectedInstance.status === 'failed' && (
                    <Button variant="outline" size="sm" onClick={deadClick}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Progress</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Step {selectedInstance.currentStep} of {selectedInstance.totalSteps}</span>
                      <span className="text-sm font-medium">
                        {Math.round((selectedInstance.completedActions.length / selectedInstance.totalSteps) * 100)}%
                      </span>
                    </div>
                    <ProgressBar 
                      value={(selectedInstance.completedActions.length / selectedInstance.totalSteps) * 100}
                      color={selectedInstance.status === 'failed' ? 'red' : selectedInstance.status === 'completed' ? 'green' : 'blue'}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Actions</p>
                  <div className="space-y-2">
                    {selectedInstance.completedActions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-slate-600">Completed: {selectedInstance.completedActions.join(', ')}</span>
                      </div>
                    )}
                    {selectedInstance.pendingActions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-600">Pending: {selectedInstance.pendingActions.join(', ')}</span>
                      </div>
                    )}
                    {selectedInstance.failedActions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-slate-600">Failed: {selectedInstance.failedActions.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedInstance.metadata && Object.keys(selectedInstance.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Context Data</p>
                    <div className="bg-slate-50 rounded-lg p-3">
                      {Object.entries(selectedInstance.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm py-1">
                          <span className="text-slate-600">{key}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Timeline</p>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Started</span>
                      <span>{new Date(selectedInstance.startedAt).toLocaleString()}</span>
                    </div>
                    {selectedInstance.completedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span>{new Date(selectedInstance.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Event Template Reference */}
          {(activeSubView === 'rules' || activeSubView === 'analytics') && !selectedRule && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Event Templates</h3>
              <p className="text-sm text-slate-600 mb-3">
                Available cross-module event types that can trigger workflows:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.keys(EVENT_CASCADE_TEMPLATES).map(eventType => {
                  const template = EVENT_CASCADE_TEMPLATES[eventType as CrossModuleEventType];
                  return (
                    <div key={eventType} className="text-xs bg-slate-50 rounded p-2">
                      <div className="font-medium text-slate-800">{eventType}</div>
                      <div className="text-slate-500 mt-1">
                        → {template.targetModules.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default WorkflowOrchestrationDashboard;
