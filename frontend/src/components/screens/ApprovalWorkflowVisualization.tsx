

import { useState, useMemo } from 'react';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  User,
  Users,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Timer,
  Bell,
  Shield,
  FileText,
  Edit3,
  Eye,
  RotateCcw,
  Send,
  Plus,
  Settings,
  Workflow,
  GitMerge,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CirclePause,
  Hourglass,
  UserCheck,
  AlertOctagon,
  Target,
  Gauge,
  TrendingUp,
  History,
  PenLine,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { ScrollFadeContainer } from '@/components/ui/ScrollFadeContainer';
import { useDeadClick } from '@/hooks/useDeadClick';

// =============================================================================
// TYPES
// =============================================================================

export type ApprovalStepType = 
  | 'author-submit'
  | 'review'
  | 'qc-check'
  | 'approval'
  | 'signature'
  | 'release';

export type ApprovalStepStatus = 
  | 'pending'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'escalated';

export type ApprovalRouteType =
  | 'sequential'
  | 'parallel'
  | 'conditional';

export type DocumentApprovalType = 
  | 'sop' 
  | 'protocol' 
  | 'csr' 
  | 'regulatory'
  | 'change-control'
  | 'capa'
  | 'deviation';

export type SLAStatus = 'on-track' | 'at-risk' | 'breached' | 'completed';

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string;
  type: ApprovalStepType;
  status: ApprovalStepStatus;
  routeType: ApprovalRouteType;
  approverRole: string;
  approvers: ApprovalParticipant[];
  isRequired: boolean;
  slaDays: number;
  actualDays?: number;
  startedAt?: string;
  completedAt?: string;
  escalationDays: number;
  escalatedTo?: string;
  escalatedAt?: string;
  comments?: string;
  signatureId?: string;
  conditions?: ApprovalCondition[];
}

export interface ApprovalParticipant {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  actionDate?: string;
  comments?: string;
  delegatedTo?: string;
}

export interface ApprovalCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains';
  value: string;
  nextStepOnTrue: string;
  nextStepOnFalse: string;
}

export interface ApprovalWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: DocumentApprovalType[];
  steps: ApprovalStep[];
  totalSLADays: number;
  isActive: boolean;
  version: string;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
}

export interface ApprovalWorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  documentId: string;
  documentName: string;
  documentType: DocumentApprovalType;
  documentVersion: string;
  currentStepNumber: number;
  status: 'in-progress' | 'completed' | 'rejected' | 'cancelled' | 'on-hold';
  steps: ApprovalStep[];
  initiatedAt: string;
  initiatedBy: string;
  completedAt?: string;
  slaStatus: SLAStatus;
  slaDeadline: string;
  daysElapsed: number;
  daysRemaining: number;
  overdueBy?: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkflowTemplates: ApprovalWorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard SOP Approval',
    description: 'Three-stage approval workflow for Standard Operating Procedures',
    documentTypes: ['sop'],
    totalSLADays: 14,
    isActive: true,
    version: '2.0',
    createdAt: '2024-06-15',
    createdBy: 'Sarah Chen',
    lastModifiedAt: '2025-01-10',
    lastModifiedBy: 'Michael Rodriguez',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Author Submission', type: 'author-submit', status: 'pending', routeType: 'sequential', approverRole: 'Document Author', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Quality Manager' },
      { id: 'step-2', stepNumber: 2, name: 'Technical Review', type: 'review', status: 'pending', routeType: 'parallel', approverRole: 'Subject Matter Expert', approvers: [], isRequired: true, slaDays: 3, escalationDays: 5, escalatedTo: 'Department Head' },
      { id: 'step-3', stepNumber: 3, name: 'QA Review', type: 'qc-check', status: 'pending', routeType: 'sequential', approverRole: 'QA Specialist', approvers: [], isRequired: true, slaDays: 2, escalationDays: 3, escalatedTo: 'QA Manager' },
      { id: 'step-4', stepNumber: 4, name: 'Quality Manager Approval', type: 'approval', status: 'pending', routeType: 'sequential', approverRole: 'Quality Manager', approvers: [], isRequired: true, slaDays: 3, escalationDays: 4, escalatedTo: 'Quality Director' },
      { id: 'step-5', stepNumber: 5, name: 'Document Control Release', type: 'release', status: 'pending', routeType: 'sequential', approverRole: 'Document Controller', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Document Control Manager' },
    ],
  },
  {
    id: 'template-2',
    name: 'Protocol Approval',
    description: 'Multi-stage approval for clinical protocols with regulatory sign-off',
    documentTypes: ['protocol'],
    totalSLADays: 21,
    isActive: true,
    version: '3.1',
    createdAt: '2024-03-01',
    createdBy: 'Jennifer Walsh',
    lastModifiedAt: '2025-02-05',
    lastModifiedBy: 'Sarah Chen',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Author Submission', type: 'author-submit', status: 'pending', routeType: 'sequential', approverRole: 'Clinical Lead', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Clinical Director' },
      { id: 'step-2', stepNumber: 2, name: 'Medical Review', type: 'review', status: 'pending', routeType: 'sequential', approverRole: 'Medical Monitor', approvers: [], isRequired: true, slaDays: 5, escalationDays: 7, escalatedTo: 'Chief Medical Officer' },
      { id: 'step-3', stepNumber: 3, name: 'Biostatistics Review', type: 'review', status: 'pending', routeType: 'parallel', approverRole: 'Biostatistician', approvers: [], isRequired: true, slaDays: 4, escalationDays: 6, escalatedTo: 'Biostatistics Director' },
      { id: 'step-4', stepNumber: 4, name: 'Regulatory Affairs Review', type: 'review', status: 'pending', routeType: 'parallel', approverRole: 'Regulatory Manager', approvers: [], isRequired: true, slaDays: 4, escalationDays: 6, escalatedTo: 'Regulatory VP' },
      { id: 'step-5', stepNumber: 5, name: 'Ethics/IRB Alignment Check', type: 'qc-check', status: 'pending', routeType: 'sequential', approverRole: 'Ethics Coordinator', approvers: [], isRequired: true, slaDays: 3, escalationDays: 4, escalatedTo: 'Compliance Director' },
      { id: 'step-6', stepNumber: 6, name: 'Executive Approval', type: 'signature', status: 'pending', routeType: 'sequential', approverRole: 'Clinical VP', approvers: [], isRequired: true, slaDays: 2, escalationDays: 3, escalatedTo: 'CEO' },
      { id: 'step-7', stepNumber: 7, name: 'Document Control Release', type: 'release', status: 'pending', routeType: 'sequential', approverRole: 'Document Controller', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Document Control Manager' },
    ],
  },
  {
    id: 'template-3',
    name: 'Change Control Approval',
    description: 'Risk-based approval workflow for manufacturing and process changes',
    documentTypes: ['change-control'],
    totalSLADays: 10,
    isActive: true,
    version: '1.5',
    createdAt: '2024-09-20',
    createdBy: 'David Kim',
    lastModifiedAt: '2025-03-01',
    lastModifiedBy: 'Lisa Johnson',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Initiator Submission', type: 'author-submit', status: 'pending', routeType: 'sequential', approverRole: 'Change Initiator', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Department Manager' },
      { id: 'step-2', stepNumber: 2, name: 'Impact Assessment', type: 'review', status: 'pending', routeType: 'parallel', approverRole: 'Subject Matter Experts', approvers: [], isRequired: true, slaDays: 3, escalationDays: 4, escalatedTo: 'Change Control Manager' },
      { id: 'step-3', stepNumber: 3, name: 'Risk Classification', type: 'qc-check', status: 'pending', routeType: 'conditional', approverRole: 'Quality Assurance', approvers: [], isRequired: true, slaDays: 2, escalationDays: 3, escalatedTo: 'Quality Director', conditions: [{ id: 'cond-1', field: 'riskLevel', operator: 'equals', value: 'high', nextStepOnTrue: 'step-4a', nextStepOnFalse: 'step-4b' }] },
      { id: 'step-4', stepNumber: 4, name: 'Executive Approval (High Risk)', type: 'approval', status: 'pending', routeType: 'sequential', approverRole: 'Site Director', approvers: [], isRequired: false, slaDays: 2, escalationDays: 3, escalatedTo: 'VP Operations' },
      { id: 'step-5', stepNumber: 5, name: 'Implementation Sign-off', type: 'signature', status: 'pending', routeType: 'sequential', approverRole: 'Change Owner', approvers: [], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Department Manager' },
    ],
  },
];

const mockWorkflowInstances: ApprovalWorkflowInstance[] = [
  {
    id: 'instance-1',
    templateId: 'template-1',
    templateName: 'Standard SOP Approval',
    documentId: 'doc-sop-001',
    documentName: 'SOP-QA-001: Laboratory Sample Handling',
    documentType: 'sop',
    documentVersion: '3.2',
    currentStepNumber: 3,
    status: 'in-progress',
    slaStatus: 'on-track',
    slaDeadline: '2025-01-15',
    daysElapsed: 6,
    daysRemaining: 8,
    initiatedAt: '2025-01-02',
    initiatedBy: 'Jennifer Walsh',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Author Submission', type: 'author-submit', status: 'approved', routeType: 'sequential', approverRole: 'Document Author', approvers: [{ id: 'p1', name: 'Jennifer Walsh', role: 'Document Author', email: 'jwalsh@pharma.com', status: 'approved', actionDate: '2025-01-02' }], isRequired: true, slaDays: 1, actualDays: 0, startedAt: '2025-01-02', completedAt: '2025-01-02', escalationDays: 2, escalatedTo: 'Quality Manager' },
      { id: 'step-2', stepNumber: 2, name: 'Technical Review', type: 'review', status: 'approved', routeType: 'parallel', approverRole: 'Subject Matter Expert', approvers: [
        { id: 'p2', name: 'Michael Rodriguez', role: 'Lab Director', email: 'mrodriguez@pharma.com', status: 'approved', actionDate: '2025-01-04', comments: 'Approved with minor clarifications noted' },
        { id: 'p3', name: 'Emily Chen', role: 'Senior Scientist', email: 'echen@pharma.com', status: 'approved', actionDate: '2025-01-05' },
      ], isRequired: true, slaDays: 3, actualDays: 3, startedAt: '2025-01-02', completedAt: '2025-01-05', escalationDays: 5, escalatedTo: 'Department Head' },
      { id: 'step-3', stepNumber: 3, name: 'QA Review', type: 'qc-check', status: 'active', routeType: 'sequential', approverRole: 'QA Specialist', approvers: [{ id: 'p4', name: 'Sarah Chen', role: 'QA Specialist', email: 'schen@pharma.com', status: 'pending' }], isRequired: true, slaDays: 2, startedAt: '2025-01-06', escalationDays: 3, escalatedTo: 'QA Manager' },
      { id: 'step-4', stepNumber: 4, name: 'Quality Manager Approval', type: 'approval', status: 'pending', routeType: 'sequential', approverRole: 'Quality Manager', approvers: [{ id: 'p5', name: 'Lisa Johnson', role: 'Quality Manager', email: 'ljohnson@pharma.com', status: 'pending' }], isRequired: true, slaDays: 3, escalationDays: 4, escalatedTo: 'Quality Director' },
      { id: 'step-5', stepNumber: 5, name: 'Document Control Release', type: 'release', status: 'pending', routeType: 'sequential', approverRole: 'Document Controller', approvers: [{ id: 'p6', name: 'David Kim', role: 'Document Controller', email: 'dkim@pharma.com', status: 'pending' }], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Document Control Manager' },
    ],
  },
  {
    id: 'instance-2',
    templateId: 'template-2',
    templateName: 'Protocol Approval',
    documentId: 'doc-protocol-001',
    documentName: 'Protocol NXV-301: Phase 3 Pivotal Study',
    documentType: 'protocol',
    documentVersion: '2.1',
    currentStepNumber: 4,
    status: 'in-progress',
    slaStatus: 'at-risk',
    slaDeadline: '2025-01-18',
    daysElapsed: 15,
    daysRemaining: 6,
    overdueBy: undefined,
    initiatedAt: '2024-12-20',
    initiatedBy: 'Dr. Amanda Foster',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Author Submission', type: 'author-submit', status: 'approved', routeType: 'sequential', approverRole: 'Clinical Lead', approvers: [{ id: 'p1', name: 'Dr. Amanda Foster', role: 'Principal Investigator', email: 'afoster@pharma.com', status: 'approved', actionDate: '2024-12-20' }], isRequired: true, slaDays: 1, actualDays: 0, startedAt: '2024-12-20', completedAt: '2024-12-20', escalationDays: 2, escalatedTo: 'Clinical Director' },
      { id: 'step-2', stepNumber: 2, name: 'Medical Review', type: 'review', status: 'approved', routeType: 'sequential', approverRole: 'Medical Monitor', approvers: [{ id: 'p2', name: 'Dr. James Wilson', role: 'Medical Monitor', email: 'jwilson@pharma.com', status: 'approved', actionDate: '2024-12-27', comments: 'Approved with dosing clarification in Section 6.2' }], isRequired: true, slaDays: 5, actualDays: 7, startedAt: '2024-12-20', completedAt: '2024-12-27', escalationDays: 7, escalatedTo: 'Chief Medical Officer' },
      { id: 'step-3', stepNumber: 3, name: 'Biostatistics Review', type: 'review', status: 'approved', routeType: 'parallel', approverRole: 'Biostatistician', approvers: [{ id: 'p3', name: 'Maria Santos', role: 'Senior Biostatistician', email: 'msantos@pharma.com', status: 'approved', actionDate: '2024-12-30' }], isRequired: true, slaDays: 4, actualDays: 3, startedAt: '2024-12-27', completedAt: '2024-12-30', escalationDays: 6, escalatedTo: 'Biostatistics Director' },
      { id: 'step-4', stepNumber: 4, name: 'Regulatory Affairs Review', type: 'review', status: 'active', routeType: 'parallel', approverRole: 'Regulatory Manager', approvers: [{ id: 'p4', name: 'Rachel Kim', role: 'Regulatory Affairs Manager', email: 'rkim@pharma.com', status: 'pending' }], isRequired: true, slaDays: 4, startedAt: '2025-01-02', escalationDays: 6, escalatedTo: 'Regulatory VP' },
      { id: 'step-5', stepNumber: 5, name: 'Ethics/IRB Alignment Check', type: 'qc-check', status: 'pending', routeType: 'sequential', approverRole: 'Ethics Coordinator', approvers: [{ id: 'p5', name: 'Thomas Brown', role: 'Ethics Coordinator', email: 'tbrown@pharma.com', status: 'pending' }], isRequired: true, slaDays: 3, escalationDays: 4, escalatedTo: 'Compliance Director' },
      { id: 'step-6', stepNumber: 6, name: 'Executive Approval', type: 'signature', status: 'pending', routeType: 'sequential', approverRole: 'Clinical VP', approvers: [{ id: 'p6', name: 'Dr. Patricia Hayes', role: 'VP Clinical Development', email: 'phayes@pharma.com', status: 'pending' }], isRequired: true, slaDays: 2, escalationDays: 3, escalatedTo: 'CEO' },
      { id: 'step-7', stepNumber: 7, name: 'Document Control Release', type: 'release', status: 'pending', routeType: 'sequential', approverRole: 'Document Controller', approvers: [{ id: 'p7', name: 'David Kim', role: 'Document Controller', email: 'dkim@pharma.com', status: 'pending' }], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Document Control Manager' },
    ],
  },
  {
    id: 'instance-3',
    templateId: 'template-3',
    templateName: 'Change Control Approval',
    documentId: 'doc-cc-001',
    documentName: 'CC-2025-0042: Manufacturing Process Update',
    documentType: 'change-control',
    documentVersion: '1.0',
    currentStepNumber: 2,
    status: 'in-progress',
    slaStatus: 'breached',
    slaDeadline: '2025-01-05',
    daysElapsed: 12,
    daysRemaining: -2,
    overdueBy: 2,
    initiatedAt: '2024-12-28',
    initiatedBy: 'Robert Chen',
    steps: [
      { id: 'step-1', stepNumber: 1, name: 'Initiator Submission', type: 'author-submit', status: 'approved', routeType: 'sequential', approverRole: 'Change Initiator', approvers: [{ id: 'p1', name: 'Robert Chen', role: 'Manufacturing Engineer', email: 'rchen@pharma.com', status: 'approved', actionDate: '2024-12-28' }], isRequired: true, slaDays: 1, actualDays: 0, startedAt: '2024-12-28', completedAt: '2024-12-28', escalationDays: 2, escalatedTo: 'Department Manager' },
      { id: 'step-2', stepNumber: 2, name: 'Impact Assessment', type: 'review', status: 'escalated', routeType: 'parallel', approverRole: 'Subject Matter Experts', approvers: [
        { id: 'p2', name: 'Kevin Park', role: 'Process Engineer', email: 'kpark@pharma.com', status: 'approved', actionDate: '2025-01-02' },
        { id: 'p3', name: 'Nancy Liu', role: 'Quality Engineer', email: 'nliu@pharma.com', status: 'pending' },
      ], isRequired: true, slaDays: 3, startedAt: '2024-12-28', escalationDays: 4, escalatedTo: 'Change Control Manager', escalatedAt: '2025-01-04' },
      { id: 'step-3', stepNumber: 3, name: 'Risk Classification', type: 'qc-check', status: 'pending', routeType: 'conditional', approverRole: 'Quality Assurance', approvers: [{ id: 'p4', name: 'Sarah Chen', role: 'QA Specialist', email: 'schen@pharma.com', status: 'pending' }], isRequired: true, slaDays: 2, escalationDays: 3, escalatedTo: 'Quality Director', conditions: [{ id: 'cond-1', field: 'riskLevel', operator: 'equals', value: 'high', nextStepOnTrue: 'step-4a', nextStepOnFalse: 'step-4b' }] },
      { id: 'step-4', stepNumber: 4, name: 'Executive Approval (High Risk)', type: 'approval', status: 'pending', routeType: 'sequential', approverRole: 'Site Director', approvers: [{ id: 'p5', name: 'Mark Johnson', role: 'Site Director', email: 'mjohnson@pharma.com', status: 'pending' }], isRequired: false, slaDays: 2, escalationDays: 3, escalatedTo: 'VP Operations' },
      { id: 'step-5', stepNumber: 5, name: 'Implementation Sign-off', type: 'signature', status: 'pending', routeType: 'sequential', approverRole: 'Change Owner', approvers: [{ id: 'p6', name: 'Robert Chen', role: 'Change Owner', email: 'rchen@pharma.com', status: 'pending' }], isRequired: true, slaDays: 1, escalationDays: 2, escalatedTo: 'Department Manager' },
    ],
  },
];

// =============================================================================
// COLOR MAPS
// =============================================================================

const stepTypeColorMap: Record<ApprovalStepType, 'blue' | 'purple' | 'teal' | 'amber' | 'emerald' | 'cyan'> = {
  'author-submit': 'blue',
  'review': 'purple',
  'qc-check': 'teal',
  'approval': 'amber',
  'signature': 'emerald',
  'release': 'cyan',
};

const stepStatusColorMap: Record<ApprovalStepStatus, 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'> = {
  'pending': 'gray',
  'active': 'blue',
  'approved': 'green',
  'rejected': 'red',
  'skipped': 'amber',
  'escalated': 'purple',
};

const slaStatusColorMap: Record<SLAStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  'on-track': 'green',
  'at-risk': 'amber',
  'breached': 'red',
  'completed': 'slate',
};

const routeTypeColorMap: Record<ApprovalRouteType, 'blue' | 'purple' | 'amber'> = {
  'sequential': 'blue',
  'parallel': 'purple',
  'conditional': 'amber',
};

const docTypeColorMap: Record<DocumentApprovalType, 'blue' | 'teal' | 'amber' | 'purple' | 'red' | 'green' | 'gray'> = {
  'sop': 'blue',
  'protocol': 'teal',
  'csr': 'amber',
  'regulatory': 'purple',
  'change-control': 'red',
  'capa': 'green',
  'deviation': 'gray',
};

// =============================================================================
// STEP ICONS
// =============================================================================

const getStepIcon = (type: ApprovalStepType, status: ApprovalStepStatus) => {
  if (status === 'approved') return <CircleCheck className="w-5 h-5 text-green-400" />;
  if (status === 'rejected') return <XCircle className="w-5 h-5 text-red-400" />;
  if (status === 'escalated') return <AlertOctagon className="w-5 h-5 text-purple-400" />;
  if (status === 'active') return <CircleDot className="w-5 h-5 text-blue-400 animate-pulse" />;
  if (status === 'skipped') return <CirclePause className="w-5 h-5 text-amber-400" />;
  
  // Pending - show type-specific icon
  switch (type) {
    case 'author-submit': return <Edit3 className="w-5 h-5 text-text-muted" />;
    case 'review': return <Eye className="w-5 h-5 text-text-muted" />;
    case 'qc-check': return <Shield className="w-5 h-5 text-text-muted" />;
    case 'approval': return <CheckCircle2 className="w-5 h-5 text-text-muted" />;
    case 'signature': return <PenLine className="w-5 h-5 text-text-muted" />;
    case 'release': return <Send className="w-5 h-5 text-text-muted" />;
    default: return <CircleDot className="w-5 h-5 text-text-muted" />;
  }
};

// =============================================================================
// WORKFLOW VISUALIZATION DASHBOARD PROPS
// =============================================================================

interface ApprovalWorkflowVisualizationProps {
  // Optional: pass in data from parent, otherwise uses mock data
  templates?: ApprovalWorkflowTemplate[];
  instances?: ApprovalWorkflowInstance[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ApprovalWorkflowVisualizationDashboard({
  templates = mockWorkflowTemplates,
  instances = mockWorkflowInstances,
}: ApprovalWorkflowVisualizationProps) {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<'active' | 'templates' | 'analytics'>('active');
  const [selectedInstance, setSelectedInstance] = useState<ApprovalWorkflowInstance | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ApprovalWorkflowTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SLAStatus | 'all'>('all');
  const [filterDocType, setFilterDocType] = useState<DocumentApprovalType | 'all'>('all');

  // Statistics
  const stats = useMemo(() => {
    const activeCount = instances.filter(i => i.status === 'in-progress').length;
    const onTrackCount = instances.filter(i => i.slaStatus === 'on-track').length;
    const atRiskCount = instances.filter(i => i.slaStatus === 'at-risk').length;
    const breachedCount = instances.filter(i => i.slaStatus === 'breached').length;
    const completedCount = instances.filter(i => i.status === 'completed').length;
    const avgCycleTime = instances.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.daysElapsed, 0) / Math.max(completedCount, 1);
    const escalatedSteps = instances.flatMap(i => i.steps).filter(s => s.status === 'escalated').length;
    const pendingApprovals = instances.flatMap(i => i.steps).filter(s => s.status === 'active').length;
    
    return { activeCount, onTrackCount, atRiskCount, breachedCount, completedCount, avgCycleTime, escalatedSteps, pendingApprovals };
  }, [instances]);

  // Filtered instances
  const filteredInstances = useMemo(() => {
    let filtered = instances;
    if (filterStatus !== 'all') filtered = filtered.filter(i => i.slaStatus === filterStatus);
    if (filterDocType !== 'all') filtered = filtered.filter(i => i.documentType === filterDocType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.documentName.toLowerCase().includes(q) || i.templateName.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => {
      // Sort breached first, then at-risk, then on-track
      const priority: Record<SLAStatus, number> = { 'breached': 0, 'at-risk': 1, 'on-track': 2, 'completed': 3 };
      return priority[a.slaStatus] - priority[b.slaStatus];
    });
  }, [instances, filterStatus, filterDocType, searchQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header Stats Bar */}
      <div className="bg-surface-elevated border-b border-border px-6 py-3">
        <div className="flex items-center gap-6 overflow-x-auto">
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">Active Workflows</div>
            <span className="text-lg font-semibold text-blue-400">{stats.activeCount}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">On Track</div>
            <span className="text-lg font-semibold text-green-400">{stats.onTrackCount}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">At Risk</div>
            <span className="text-lg font-semibold text-amber-400">{stats.atRiskCount}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">SLA Breached</div>
            <span className="text-lg font-semibold text-red-400">{stats.breachedCount}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">Pending Approvals</div>
            <span className="text-lg font-semibold text-purple-400">{stats.pendingApprovals}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">Escalated</div>
            <span className="text-lg font-semibold text-amber-400">{stats.escalatedSteps}</span>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-text-muted whitespace-nowrap">Avg Cycle Time</div>
            <span className="text-lg font-semibold text-teal-400">{stats.avgCycleTime.toFixed(1)}d</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-surface border-b border-border px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveView('active')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'active' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:bg-surface-card'}`}
            >
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Active Workflows
              </div>
            </button>
            <button
              onClick={() => setActiveView('templates')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'templates' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:bg-surface-card'}`}
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Templates
              </div>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === 'analytics' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:bg-surface-card'}`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </div>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => toast.info('Workflow configuration — set approval thresholds, escalation rules, and notification targets in Settings')}>
              <Settings className="w-4 h-4" />
              Configure
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success('New approval workflow created — assign document type, approver chain, and deadline')}>
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Active Workflows View */}
        {activeView === 'active' && (
          <>
            {/* Filters and Search */}
            <div className="hidden lg:flex w-[400px] border-r border-border flex flex-col">
              <div className="p-4 border-b border-border space-y-3">
                <SearchInput
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as SLAStatus | 'all')}
                    className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
                  >
                    <option value="all">All SLA Status</option>
                    <option value="on-track">On Track</option>
                    <option value="at-risk">At Risk</option>
                    <option value="breached">Breached</option>
                  </select>
                  <select
                    value={filterDocType}
                    onChange={(e) => setFilterDocType(e.target.value as DocumentApprovalType | 'all')}
                    className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="sop">SOP</option>
                    <option value="protocol">Protocol</option>
                    <option value="change-control">Change Control</option>
                    <option value="capa">CAPA</option>
                  </select>
                </div>
              </div>
              <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredInstances.map(instance => (
                  <WorkflowInstanceCard
                    key={instance.id}
                    instance={instance}
                    isSelected={selectedInstance?.id === instance.id}
                    onClick={() => setSelectedInstance(instance)}
                  />
                ))}
                {filteredInstances.length === 0 && (
                  <div className="text-center py-12 text-text-muted">
                    <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No workflows match your filters</p>
                  </div>
                )}
              </ScrollFadeContainer>
            </div>

            {/* Workflow Detail Panel */}
            <div className="flex-1 overflow-y-auto bg-surface p-6">
              {selectedInstance ? (
                <WorkflowDetailView instance={selectedInstance} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <Workflow className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Select a Workflow</p>
                    <p className="text-sm">Choose from the list to view approval routing details</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Templates View */}
        {activeView === 'templates' && (
          <>
            <div className="hidden lg:flex w-[400px] border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <SearchInput
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto p-4 space-y-3">
                {templates.map(template => (
                  <WorkflowTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplate(template)}
                  />
                ))}
              </ScrollFadeContainer>
            </div>
            <div className="flex-1 overflow-y-auto bg-surface p-6">
              {selectedTemplate ? (
                <WorkflowTemplateDetailView template={selectedTemplate} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Select a Template</p>
                    <p className="text-sm">Choose from the list to view workflow design</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="flex-1 overflow-y-auto bg-surface p-6">
            <WorkflowAnalyticsView instances={instances} templates={templates} />
          </div>
        )}
      </div>

      {/* Instance Detail Modal */}
      {/* For now using inline panel - could be modal in future */}
    </div>
  );
}

// =============================================================================
// WORKFLOW INSTANCE CARD
// =============================================================================

interface WorkflowInstanceCardProps {
  instance: ApprovalWorkflowInstance;
  isSelected: boolean;
  onClick: () => void;
}

function WorkflowInstanceCard({ instance, isSelected, onClick }: WorkflowInstanceCardProps) {
  const currentStep = instance.steps.find(s => s.status === 'active');
  const progressPercent = Math.round((instance.currentStepNumber / instance.steps.length) * 100);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:bg-surface-card/50 ${isSelected ? 'ring-2 ring-accent-blue/50' : ''}`}
    >
      <CardContent className="p-4" onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge color={docTypeColorMap[instance.documentType]} size="xs">
                {instance.documentType.replace(/-/g, ' ')}
              </Badge>
              <Badge 
                color={slaStatusColorMap[instance.slaStatus]} 
                size="xs"
              >
                {instance.slaStatus === 'breached' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {instance.slaStatus.replace(/-/g, ' ')}
              </Badge>
            </div>
            <h4 className="text-sm font-medium text-text-primary truncate">{instance.documentName}</h4>
            <p className="text-xs text-text-muted truncate">{instance.templateName}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <ProgressBar value={progressPercent} max={100} color={slaStatusColorMap[instance.slaStatus]} size="sm" className="flex-1" />
          <span className="text-xs text-text-muted">{instance.currentStepNumber}/{instance.steps.length}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-text-muted">
            <Clock className="w-3 h-3" />
            {instance.overdueBy ? (
              <span className="text-red-400">Overdue by {instance.overdueBy}d</span>
            ) : (
              <span>{instance.daysRemaining}d remaining</span>
            )}
          </div>
          {currentStep && (
            <div className="flex items-center gap-1">
              {getStepIcon(currentStep.type, currentStep.status)}
              <span className="text-text-secondary">{currentStep.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// WORKFLOW DETAIL VIEW
// =============================================================================

interface WorkflowDetailViewProps {
  instance: ApprovalWorkflowInstance;
}

function WorkflowDetailView({ instance }: WorkflowDetailViewProps) {
  const { deadClick } = useDeadClick();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            instance.slaStatus === 'breached' ? 'bg-red-500/20' : 
            instance.slaStatus === 'at-risk' ? 'bg-amber-500/20' : 'bg-green-500/20'
          }`}>
            <Workflow className={`w-6 h-6 ${
              instance.slaStatus === 'breached' ? 'text-red-400' : 
              instance.slaStatus === 'at-risk' ? 'text-amber-400' : 'text-green-400'
            }`} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">{instance.documentName}</h2>
            <p className="text-sm text-text-muted">{instance.templateName} • Version {instance.documentVersion}</p>
          </div>
          <Badge color={slaStatusColorMap[instance.slaStatus]} size="sm">
            {instance.slaStatus === 'breached' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {instance.slaStatus.replace(/-/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* SLA Progress Bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">SLA Timeline</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-muted">Started: <span className="text-text-secondary">{instance.initiatedAt}</span></span>
              <span className="text-text-muted">Deadline: <span className={instance.slaStatus === 'breached' ? 'text-red-400' : 'text-text-secondary'}>{instance.slaDeadline}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar 
              value={Math.min(instance.daysElapsed, instance.daysElapsed + instance.daysRemaining)} 
              max={instance.daysElapsed + Math.max(instance.daysRemaining, 0)} 
              color={slaStatusColorMap[instance.slaStatus]} 
              size="md" 
              className="flex-1" 
            />
            <span className={`text-sm font-medium ${
              instance.overdueBy ? 'text-red-400' : 
              instance.slaStatus === 'at-risk' ? 'text-amber-400' : 'text-green-400'
            }`}>
              {instance.overdueBy ? `${instance.overdueBy}d overdue` : `${instance.daysRemaining}d left`}
            </span>
          </div>
        </Card>
      </div>

      {/* Visual Workflow Flow */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">Approval Flow</h3>
        <div className="relative">
          {instance.steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connection line */}
              {index < instance.steps.length - 1 && (
                <div className={`absolute left-6 top-12 w-0.5 h-8 ${
                  step.status === 'approved' ? 'bg-green-500' : 'bg-border'
                }`} />
              )}
              
              <Card 
                className={`mb-3 cursor-pointer transition-all hover:bg-surface-card/50 ${
                  step.status === 'active' ? 'ring-2 ring-blue-500/50' : 
                  step.status === 'escalated' ? 'ring-2 ring-purple-500/50' : ''
                }`}
              >
                <CardContent className="p-4" onClick={() => toggleStep(step.id)}>
                  <div className="flex items-center gap-4">
                    {/* Step icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'approved' ? 'bg-green-500/20' :
                      step.status === 'rejected' ? 'bg-red-500/20' :
                      step.status === 'active' ? 'bg-blue-500/20' :
                      step.status === 'escalated' ? 'bg-purple-500/20' :
                      'bg-surface-card'
                    }`}>
                      {getStepIcon(step.type, step.status)}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">{step.stepNumber}. {step.name}</span>
                        <Badge color={stepStatusColorMap[step.status]} size="xs">{step.status}</Badge>
                        <Badge color={stepTypeColorMap[step.type]} size="xs">{step.type.replace(/-/g, ' ')}</Badge>
                        {step.routeType !== 'sequential' && (
                          <Badge color={routeTypeColorMap[step.routeType]} size="xs">
                            {step.routeType === 'parallel' ? <Users className="w-3 h-3 mr-1" /> : <GitMerge className="w-3 h-3 mr-1" />}
                            {step.routeType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {step.approverRole}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          SLA: {step.slaDays}d
                          {step.actualDays !== undefined && (
                            <span className={step.actualDays > step.slaDays ? 'text-red-400' : 'text-green-400'}>
                              (actual: {step.actualDays}d)
                            </span>
                          )}
                        </span>
                        {step.escalatedAt && (
                          <span className="flex items-center gap-1 text-purple-400">
                            <Bell className="w-3 h-3" />
                            Escalated to {step.escalatedTo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand toggle */}
                    {expandedSteps.has(step.id) ? (
                      <ChevronUp className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    )}
                  </div>

                  {/* Expanded details */}
                  {expandedSteps.has(step.id) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-xs font-medium text-text-muted uppercase mb-3">Approvers</h4>
                      <div className="space-y-2">
                        {step.approvers.map(approver => (
                          <div key={approver.id} className="flex items-center justify-between bg-surface rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                approver.status === 'approved' ? 'bg-green-500/20' :
                                approver.status === 'rejected' ? 'bg-red-500/20' :
                                'bg-surface-card'
                              }`}>
                                {approver.status === 'approved' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : approver.status === 'rejected' ? (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                ) : (
                                  <User className="w-4 h-4 text-text-muted" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-text-primary">{approver.name}</div>
                                <div className="text-xs text-text-muted">{approver.role}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge color={
                                approver.status === 'approved' ? 'green' :
                                approver.status === 'rejected' ? 'red' :
                                approver.status === 'delegated' ? 'purple' : 'gray'
                              } size="xs">{approver.status}</Badge>
                              {approver.actionDate && (
                                <div className="text-xs text-text-muted mt-1">{approver.actionDate}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {step.comments && (
                        <div className="mt-3 p-3 bg-surface-card rounded-lg">
                          <div className="text-xs text-text-muted mb-1">Comments:</div>
                          <div className="text-sm text-text-secondary">{step.comments}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => toast.info('Approval history — all decisions, timestamps, and digital signatures visible in the Audit Trail module')}>
          <History className="w-4 h-4" />
          View History
        </Button>
        <Button variant="outline" size="sm" onClick={() => toast.success('Reminder sent to pending approvers — escalation logged')}>
          <Bell className="w-4 h-4" />
          Send Reminder
        </Button>
        <Button variant="primary" size="sm" onClick={() => toast.info('Select an approval step in the workflow diagram above to take action on it')}>
          <Play className="w-4 h-4" />
          Take Action
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// WORKFLOW TEMPLATE CARD
// =============================================================================

interface WorkflowTemplateCardProps {
  template: ApprovalWorkflowTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function WorkflowTemplateCard({ template, isSelected, onClick }: WorkflowTemplateCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:bg-surface-card/50 ${isSelected ? 'ring-2 ring-accent-blue/50' : ''}`}
    >
      <CardContent className="p-4" onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {template.isActive ? (
                <Badge color="green" size="xs">Active</Badge>
              ) : (
                <Badge color="gray" size="xs">Inactive</Badge>
              )}
              <span className="text-xs text-text-muted">v{template.version}</span>
            </div>
            <h4 className="text-sm font-medium text-text-primary">{template.name}</h4>
            <p className="text-xs text-text-muted line-clamp-2">{template.description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">{template.steps.length} steps</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{template.totalSLADays}d SLA</span>
          </div>
          <div className="flex gap-1">
            {template.documentTypes.slice(0, 2).map(dt => (
              <Badge key={dt} color={docTypeColorMap[dt]} size="xs">{dt}</Badge>
            ))}
            {template.documentTypes.length > 2 && (
              <Badge color="gray" size="xs">+{template.documentTypes.length - 2}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// WORKFLOW TEMPLATE DETAIL VIEW
// =============================================================================

interface WorkflowTemplateDetailViewProps {
  template: ApprovalWorkflowTemplate;
}

function WorkflowTemplateDetailView({ template }: WorkflowTemplateDetailViewProps) {
  const { deadClick } = useDeadClick();
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">{template.name}</h2>
            <p className="text-sm text-text-muted">{template.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {template.isActive ? (
              <Badge color="green" size="sm">Active</Badge>
            ) : (
              <Badge color="gray" size="sm">Inactive</Badge>
            )}
            <Badge color="purple" size="sm">v{template.version}</Badge>
          </div>
        </div>

        {/* Template metadata */}
        <Card className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-sm">
            <div>
              <div className="text-xs text-text-muted mb-1">Document Types</div>
              <div className="flex flex-wrap gap-1">
                {template.documentTypes.map(dt => (
                  <Badge key={dt} color={docTypeColorMap[dt]} size="xs">{dt}</Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Total SLA</div>
              <div className="text-text-primary font-medium">{template.totalSLADays} days</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Created</div>
              <div className="text-text-secondary">{template.createdAt}</div>
              <div className="text-xs text-text-muted">by {template.createdBy}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Last Modified</div>
              <div className="text-text-secondary">{template.lastModifiedAt}</div>
              <div className="text-xs text-text-muted">by {template.lastModifiedBy}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Workflow Design */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">Workflow Steps</h3>
        <div className="space-y-3">
          {template.steps.map((step, index) => (
            <Card key={step.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${stepTypeColorMap[step.type]}-500/20`}>
                    <span className={`text-sm font-bold text-${stepTypeColorMap[step.type]}-400`}>{step.stepNumber}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary">{step.name}</span>
                      <Badge color={stepTypeColorMap[step.type]} size="xs">{step.type.replace(/-/g, ' ')}</Badge>
                      {step.routeType !== 'sequential' && (
                        <Badge color={routeTypeColorMap[step.routeType]} size="xs">
                          {step.routeType === 'parallel' ? <Users className="w-3 h-3 mr-1" /> : <GitMerge className="w-3 h-3 mr-1" />}
                          {step.routeType}
                        </Badge>
                      )}
                      {!step.isRequired && (
                        <Badge color="gray" size="xs">Optional</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {step.approverRole}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        SLA: {step.slaDays}d
                      </span>
                      <span className="flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Escalate after {step.escalationDays}d to {step.escalatedTo}
                      </span>
                    </div>
                  </div>
                  {index < template.steps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-text-muted" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => toast.info('Workflow version history — all configuration changes visible in Audit Trail')}>
          <History className="w-4 h-4" />
          Version History
        </Button>
        <Button variant="outline" size="sm" onClick={() => toast.success('Workflow template duplicated — edit the copy to create a variant approval chain')}>
          <Copy className="w-4 h-4" />
          Duplicate
        </Button>
        <Button variant="primary" size="sm" onClick={() => toast.info('Workflow template editor — configure steps, conditions, and escalation rules')}>
          <Edit3 className="w-4 h-4" />
          Edit Template
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// WORKFLOW ANALYTICS VIEW
// =============================================================================

interface WorkflowAnalyticsViewProps {
  instances: ApprovalWorkflowInstance[];
  templates: ApprovalWorkflowTemplate[];
}

function WorkflowAnalyticsView({ instances, templates }: WorkflowAnalyticsViewProps) {
  // Calculate analytics
  const analytics = useMemo(() => {
    const completedInstances = instances.filter(i => i.status === 'completed');
    const avgCycleTime = completedInstances.length > 0 
      ? completedInstances.reduce((sum, i) => sum + i.daysElapsed, 0) / completedInstances.length 
      : 0;
    
    // By template
    const byTemplate: Record<string, { total: number; completed: number; avgDays: number }> = {};
    templates.forEach(t => {
      const templateInstances = instances.filter(i => i.templateId === t.id);
      const templateCompleted = templateInstances.filter(i => i.status === 'completed');
      byTemplate[t.name] = {
        total: templateInstances.length,
        completed: templateCompleted.length,
        avgDays: templateCompleted.length > 0 
          ? templateCompleted.reduce((sum, i) => sum + i.daysElapsed, 0) / templateCompleted.length 
          : 0,
      };
    });

    // Bottleneck analysis
    const stepDelays: Record<string, { count: number; totalDelay: number }> = {};
    instances.forEach(i => {
      i.steps.forEach(s => {
        if (s.actualDays !== undefined && s.actualDays > s.slaDays) {
          if (!stepDelays[s.name]) stepDelays[s.name] = { count: 0, totalDelay: 0 };
          stepDelays[s.name].count++;
          stepDelays[s.name].totalDelay += s.actualDays - s.slaDays;
        }
      });
    });
    const bottlenecks = Object.entries(stepDelays)
      .map(([name, data]) => ({ name, ...data, avgDelay: data.totalDelay / data.count }))
      .sort((a, b) => b.avgDelay - a.avgDelay);

    // SLA compliance rate
    const totalCompleted = completedInstances.length;
    const onTimeCompleted = completedInstances.filter(i => i.daysElapsed <= (templates.find(t => t.id === i.templateId)?.totalSLADays || 0)).length;
    const slaComplianceRate = totalCompleted > 0 ? (onTimeCompleted / totalCompleted) * 100 : 0;

    return { avgCycleTime, byTemplate, bottlenecks, slaComplianceRate, totalCompleted, onTimeCompleted };
  }, [instances, templates]);

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Workflow Analytics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-muted">Avg Cycle Time</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{analytics.avgCycleTime.toFixed(1)} days</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-muted">SLA Compliance</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{analytics.slaComplianceRate.toFixed(0)}%</div>
          <div className="text-xs text-text-muted">{analytics.onTimeCompleted}/{analytics.totalCompleted} on time</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-muted">Active Templates</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{templates.filter(t => t.isActive).length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-muted">Bottleneck Steps</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{analytics.bottlenecks.length}</div>
        </Card>
      </div>

      {/* Performance by Template */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-sm font-medium text-text-primary">Performance by Template</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.byTemplate).map(([name, data]) => (
              <div key={name} className="flex items-center gap-4">
                <div className="w-48 truncate text-sm text-text-secondary">{name}</div>
                <div className="flex-1">
                  <ProgressBar 
                    value={data.completed} 
                    max={Math.max(data.total, 1)} 
                    color="blue" 
                    size="sm" 
                  />
                </div>
                <div className="w-24 text-right text-xs text-text-muted">
                  {data.completed}/{data.total} completed
                </div>
                <div className="w-20 text-right text-xs text-teal-400">
                  {data.avgDays.toFixed(1)}d avg
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck Analysis */}
      {analytics.bottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary">Bottleneck Analysis</h3>
            <p className="text-xs text-text-muted">Steps that frequently exceed SLA</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.bottlenecks.slice(0, 5).map(bottleneck => (
                <div key={bottleneck.name} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-text-primary">{bottleneck.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-muted">{bottleneck.count} occurrences</span>
                    <Badge color="amber" size="xs">+{bottleneck.avgDelay.toFixed(1)}d avg delay</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Copy shorthand for other screens to import
export { WorkflowInstanceCard, WorkflowDetailView, WorkflowTemplateCard };
