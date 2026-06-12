// Planning Module Data
// Centralized data for submission planning, team management, RACI, and timelines

export type PlanningRegion = 'global' | 'fda' | 'ema' | 'pmda' | 'nmpa';
export type ApplicationType = 'NDA' | 'BLA' | 'MAA' | 'JNDA' | 'CNDA';
export type RACIRole = 'R' | 'A' | 'C' | 'I'; // Responsible, Accountable, Consulted, Informed
export type ApprovalStatus = 'pending' | 'in-review' | 'approved' | 'rejected';
export type MilestoneStatus = 'completed' | 'in-progress' | 'upcoming' | 'at-risk' | 'blocked';
export type AuthoringStatus = 'draft' | 'review' | 'approved' | 'locked';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  email: string;
  workload: number;
  tasksAssigned: number;
  tasksDue: number;
}

export interface RACIAssignment {
  document: string;
  section: string;
  assignments: { memberId: string; role: RACIRole }[];
}

export interface ApprovalStep {
  step: number;
  role: string;
  assigneeId: string;
  status: ApprovalStatus;
  date?: string;
  comments?: string;
}

export interface ApprovalWorkflow {
  documentId: string;
  documentName: string;
  currentStep: number;
  steps: ApprovalStep[];
}

export interface PlanningApplication {
  id: string;
  type: ApplicationType;
  number: string;
  region: PlanningRegion;
  product: string;
  productId: string;
  indication: string;
  pdufaDate?: string;
  status: 'planning' | 'active' | 'submitted' | 'approved';
}

export interface RegionalVariant {
  region: PlanningRegion;
  status: string;
  notes?: string;
}

export interface PlanningMilestone {
  id: string;
  name: string;
  type: 'document' | 'submission' | 'review' | 'approval' | 'meeting';
  startDate: string;
  endDate: string;
  status: MilestoneStatus;
  owner: string;
  assigneeId?: string;
  dependencies?: string[];
  progress?: number;
  children?: PlanningMilestone[];
  sourceDocId?: string;
  sourceDocName?: string;
  authoringStatus?: AuthoringStatus;
  regions?: PlanningRegion[];
  hasVariants?: boolean;
  variants?: RegionalVariant[];
}

export interface RegionInfo {
  name: string;
  color: string;
  flag: string;
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export const teamMembers: TeamMember[] = [
  { id: 'tm-1', name: 'Sarah Chen', role: 'Regulatory Director', department: 'Regulatory Affairs', email: 'schen@ligature.com', workload: 85, tasksAssigned: 12, tasksDue: 3 },
  { id: 'tm-2', name: 'Michael Roberts', role: 'CMC Lead', department: 'CMC', email: 'mroberts@ligature.com', workload: 72, tasksAssigned: 8, tasksDue: 2 },
  { id: 'tm-3', name: 'Jennifer Walsh', role: 'Medical Writer', department: 'Medical Writing', email: 'jwalsh@ligature.com', workload: 95, tasksAssigned: 15, tasksDue: 5 },
  { id: 'tm-4', name: 'David Kim', role: 'Clinical Lead', department: 'Clinical Operations', email: 'dkim@ligature.com', workload: 60, tasksAssigned: 6, tasksDue: 1 },
  { id: 'tm-5', name: 'Emily Thompson', role: 'Publishing Specialist', department: 'Regulatory Publishing', email: 'ethompson@ligature.com', workload: 45, tasksAssigned: 4, tasksDue: 0 },
  { id: 'tm-6', name: 'James Martinez', role: 'QA Manager', department: 'Quality Assurance', email: 'jmartinez@ligature.com', workload: 55, tasksAssigned: 5, tasksDue: 1 },
  { id: 'tm-7', name: 'Lisa Park', role: 'Nonclinical Lead', department: 'Nonclinical', email: 'lpark@ligature.com', workload: 40, tasksAssigned: 4, tasksDue: 0 },
  { id: 'tm-8', name: 'Robert Johnson', role: 'VP Regulatory', department: 'Regulatory Affairs', email: 'rjohnson@ligature.com', workload: 30, tasksAssigned: 2, tasksDue: 0 },
];

// Helper to get team member by ID
export const getTeamMember = (id: string): TeamMember | undefined => 
  teamMembers.find(tm => tm.id === id);

// ============================================================================
// RACI MATRIX
// ============================================================================

export const raciMatrix: RACIAssignment[] = [
  { 
    document: '2.5 Clinical Overview', 
    section: 'Module 2',
    assignments: [
      { memberId: 'tm-3', role: 'R' },
      { memberId: 'tm-4', role: 'A' },
      { memberId: 'tm-1', role: 'C' },
      { memberId: 'tm-8', role: 'I' },
    ]
  },
  { 
    document: '2.7 Clinical Summary', 
    section: 'Module 2',
    assignments: [
      { memberId: 'tm-3', role: 'R' },
      { memberId: 'tm-4', role: 'A' },
      { memberId: 'tm-1', role: 'C' },
      { memberId: 'tm-8', role: 'I' },
    ]
  },
  { 
    document: '2.3 Quality Overall Summary', 
    section: 'Module 2',
    assignments: [
      { memberId: 'tm-2', role: 'R' },
      { memberId: 'tm-2', role: 'A' },
      { memberId: 'tm-6', role: 'C' },
      { memberId: 'tm-1', role: 'I' },
    ]
  },
  { 
    document: '3.2.S Drug Substance', 
    section: 'Module 3',
    assignments: [
      { memberId: 'tm-2', role: 'R' },
      { memberId: 'tm-2', role: 'A' },
      { memberId: 'tm-6', role: 'C' },
      { memberId: 'tm-8', role: 'I' },
    ]
  },
  { 
    document: '3.2.P Drug Product', 
    section: 'Module 3',
    assignments: [
      { memberId: 'tm-2', role: 'R' },
      { memberId: 'tm-2', role: 'A' },
      { memberId: 'tm-6', role: 'C' },
      { memberId: 'tm-8', role: 'I' },
    ]
  },
  { 
    document: 'CSR LIG-301', 
    section: 'Module 5',
    assignments: [
      { memberId: 'tm-4', role: 'R' },
      { memberId: 'tm-4', role: 'A' },
      { memberId: 'tm-3', role: 'C' },
      { memberId: 'tm-1', role: 'I' },
    ]
  },
  { 
    document: 'eCTD Sequence 0000', 
    section: 'Publishing',
    assignments: [
      { memberId: 'tm-5', role: 'R' },
      { memberId: 'tm-1', role: 'A' },
      { memberId: 'tm-6', role: 'C' },
      { memberId: 'tm-8', role: 'I' },
    ]
  },
];

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

export const approvalWorkflows: ApprovalWorkflow[] = [
  {
    documentId: 'm2-5',
    documentName: '2.5 Clinical Overview v2.3',
    currentStep: 3,
    steps: [
      { step: 1, role: 'Author', assigneeId: 'tm-3', status: 'approved', date: '2024-03-15', comments: 'Initial draft complete' },
      { step: 2, role: 'Medical Review', assigneeId: 'tm-4', status: 'approved', date: '2024-03-22', comments: 'Minor edits incorporated' },
      { step: 3, role: 'Regulatory Review', assigneeId: 'tm-1', status: 'in-review' },
      { step: 4, role: 'QA Review', assigneeId: 'tm-6', status: 'pending' },
      { step: 5, role: 'Final Approval', assigneeId: 'tm-8', status: 'pending' },
    ]
  },
  {
    documentId: 'm3-2-p',
    documentName: '3.2.P Drug Product v2.8',
    currentStep: 4,
    steps: [
      { step: 1, role: 'Author', assigneeId: 'tm-2', status: 'approved', date: '2024-04-01' },
      { step: 2, role: 'CMC Review', assigneeId: 'tm-2', status: 'approved', date: '2024-04-10' },
      { step: 3, role: 'QA Review', assigneeId: 'tm-6', status: 'approved', date: '2024-04-15' },
      { step: 4, role: 'Regulatory Review', assigneeId: 'tm-1', status: 'in-review' },
      { step: 5, role: 'Final Approval', assigneeId: 'tm-8', status: 'pending' },
    ]
  },
  {
    documentId: 'label-nego',
    documentName: 'USPI Label Draft v1.2',
    currentStep: 2,
    steps: [
      { step: 1, role: 'Author', assigneeId: 'tm-3', status: 'approved', date: '2024-12-20' },
      { step: 2, role: 'Medical/Legal Review', assigneeId: 'tm-4', status: 'in-review' },
      { step: 3, role: 'Regulatory Review', assigneeId: 'tm-1', status: 'pending' },
      { step: 4, role: 'Final Approval', assigneeId: 'tm-8', status: 'pending' },
    ]
  },
];

// ============================================================================
// APPLICATIONS
// ============================================================================

export const planningApplications: PlanningApplication[] = [
  { id: 'nda-123456', type: 'NDA', number: '123456', region: 'fda', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C+ NSCLC', pdufaDate: '2025-02-15', status: 'active' },
  { id: 'maa-emea', type: 'MAA', number: 'EMEA/H/C/006123', region: 'ema', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C+ NSCLC', pdufaDate: '2025-04-30', status: 'active' },
  { id: 'jnda-pmda', type: 'JNDA', number: 'PMDA-2024-0847', region: 'pmda', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C+ NSCLC', pdufaDate: '2025-06-15', status: 'planning' },
  { id: 'cnda-nmpa', type: 'CNDA', number: 'NMPA-2024-2847', region: 'nmpa', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C+ NSCLC', pdufaDate: '2025-09-01', status: 'planning' },
];

// ============================================================================
// REGION INFO
// ============================================================================

export const regionInfo: Record<PlanningRegion, RegionInfo> = {
  global: { name: 'Global', color: '#7C3AED', flag: '🌐' },
  fda: { name: 'FDA (US)', color: '#1E90FF', flag: '🇺🇸' },
  ema: { name: 'EMA (EU)', color: '#F59E0B', flag: '🇪🇺' },
  pmda: { name: 'PMDA (Japan)', color: '#EF4444', flag: '🇯🇵' },
  nmpa: { name: 'NMPA (China)', color: '#10B981', flag: '🇨🇳' },
};

// ============================================================================
// GLOBAL TIMELINE
// ============================================================================

export const globalTimeline: PlanningMilestone[] = [
  {
    id: 'module-2',
    name: 'Module 2 — CTD Summaries',
    type: 'document',
    startDate: '2024-02-01',
    endDate: '2024-05-15',
    status: 'completed',
    owner: 'Med Writing',
    progress: 100,
    regions: ['fda', 'ema', 'pmda', 'nmpa'],
    children: [
      { 
        id: 'm2-5', 
        name: '2.5 Clinical Overview', 
        type: 'document', 
        startDate: '2024-02-01', 
        endDate: '2024-04-01', 
        status: 'completed', 
        owner: 'Med Writing', 
        progress: 100,
        sourceDocId: 'doc-m25-001',
        sourceDocName: 'Clinical Overview v2.3',
        authoringStatus: 'locked',
        hasVariants: true,
        variants: [
          { region: 'fda', status: 'Locked', notes: 'Includes REMS discussion' },
          { region: 'ema', status: 'Locked', notes: 'Includes PSUR commitments' },
          { region: 'pmda', status: 'In Review', notes: 'Ethnic sensitivity analysis added' },
          { region: 'nmpa', status: 'Draft', notes: 'Bridging study section pending' },
        ]
      },
      { 
        id: 'm2-7', 
        name: '2.7 Clinical Summary', 
        type: 'document', 
        startDate: '2024-03-01', 
        endDate: '2024-05-01', 
        status: 'completed', 
        owner: 'Med Writing', 
        progress: 100,
        sourceDocId: 'doc-m27-001',
        sourceDocName: 'Clinical Summary v1.8',
        authoringStatus: 'locked',
        hasVariants: false,
      },
      { 
        id: 'm2-4', 
        name: '2.4 Nonclinical Overview', 
        type: 'document', 
        startDate: '2024-02-15', 
        endDate: '2024-04-15', 
        status: 'completed', 
        owner: 'Nonclinical', 
        progress: 100,
        sourceDocId: 'doc-m24-001',
        sourceDocName: 'Nonclinical Overview v1.5',
        authoringStatus: 'locked',
        hasVariants: false,
      },
      { 
        id: 'm2-3', 
        name: '2.3 Quality Overall Summary', 
        type: 'document', 
        startDate: '2024-03-01', 
        endDate: '2024-05-15', 
        status: 'completed', 
        owner: 'CMC', 
        progress: 100,
        sourceDocId: 'doc-m23-001',
        sourceDocName: 'QOS v2.1',
        authoringStatus: 'locked',
        hasVariants: true,
        variants: [
          { region: 'fda', status: 'Locked' },
          { region: 'ema', status: 'Locked', notes: 'CEP references updated' },
          { region: 'pmda', status: 'Locked', notes: 'MF cross-references added' },
          { region: 'nmpa', status: 'Draft', notes: 'Local manufacturer info pending' },
        ]
      },
    ]
  },
  {
    id: 'module-3',
    name: 'Module 3 — Quality (CMC)',
    type: 'document',
    startDate: '2024-01-01',
    endDate: '2024-05-30',
    status: 'completed',
    owner: 'CMC',
    progress: 100,
    regions: ['fda', 'ema', 'pmda', 'nmpa'],
    children: [
      { 
        id: 'm3-2-s', 
        name: '3.2.S Drug Substance', 
        type: 'document', 
        startDate: '2024-01-01', 
        endDate: '2024-04-01', 
        status: 'completed', 
        owner: 'CMC', 
        progress: 100,
        sourceDocId: 'doc-m32s-001',
        sourceDocName: 'Drug Substance v3.0',
        authoringStatus: 'locked',
      },
      { 
        id: 'm3-2-p', 
        name: '3.2.P Drug Product', 
        type: 'document', 
        startDate: '2024-02-01', 
        endDate: '2024-05-01', 
        status: 'completed', 
        owner: 'CMC', 
        progress: 100,
        sourceDocId: 'doc-m32p-001',
        sourceDocName: 'Drug Product v2.8',
        authoringStatus: 'locked',
        hasVariants: true,
        variants: [
          { region: 'fda', status: 'Locked' },
          { region: 'ema', status: 'Locked' },
          { region: 'pmda', status: 'Locked' },
          { region: 'nmpa', status: 'Draft', notes: 'Local stability data pending' },
        ]
      },
    ]
  },
  {
    id: 'module-5',
    name: 'Module 5 — Clinical Study Reports',
    type: 'document',
    startDate: '2024-01-15',
    endDate: '2024-05-20',
    status: 'completed',
    owner: 'Clinical',
    progress: 100,
    regions: ['fda', 'ema', 'pmda', 'nmpa'],
    children: [
      { 
        id: 'csr-301', 
        name: 'CSR Study LIG-301 (Pivotal)', 
        type: 'document', 
        startDate: '2024-01-15', 
        endDate: '2024-04-15', 
        status: 'completed', 
        owner: 'Clinical', 
        progress: 100,
        sourceDocId: 'doc-csr-301',
        sourceDocName: 'CSR LIG-301 v1.0',
        authoringStatus: 'locked',
      },
      { 
        id: 'csr-302', 
        name: 'CSR Study LIG-302 (Supportive)', 
        type: 'document', 
        startDate: '2024-02-01', 
        endDate: '2024-05-20', 
        status: 'completed', 
        owner: 'Clinical', 
        progress: 100,
        sourceDocId: 'doc-csr-302',
        sourceDocName: 'CSR LIG-302 v1.0',
        authoringStatus: 'locked',
      },
    ]
  },
];

// ============================================================================
// REGIONAL TIMELINES
// ============================================================================

export const regionalTimelines: Record<PlanningRegion, PlanningMilestone[]> = {
  global: [],
  fda: [
    {
      id: 'fda-review',
      name: 'FDA Review Process',
      type: 'review',
      startDate: '2024-06-15',
      endDate: '2025-02-15',
      status: 'in-progress',
      owner: 'Regulatory',
      progress: 65,
      children: [
        { id: 'fda-sub', name: 'NDA Submission', type: 'submission', startDate: '2024-06-15', endDate: '2024-06-15', status: 'completed', owner: 'Publishing', progress: 100 },
        { id: 'fda-filing', name: 'Filing Review (Day 60)', type: 'review', startDate: '2024-06-15', endDate: '2024-08-14', status: 'completed', owner: 'FDA', progress: 100 },
        { id: 'fda-review-1', name: 'Primary Review', type: 'review', startDate: '2024-08-15', endDate: '2024-11-15', status: 'completed', owner: 'FDA', progress: 100 },
        { id: 'fda-ir', name: 'Information Request Response', type: 'document', startDate: '2024-11-01', endDate: '2024-12-20', status: 'in-progress', owner: 'Cross-functional', progress: 75 },
        { id: 'fda-adcom', name: 'Advisory Committee', type: 'meeting', startDate: '2025-01-15', endDate: '2025-01-15', status: 'upcoming', owner: 'Leadership' },
        { id: 'fda-label', name: 'Label Negotiations', type: 'document', startDate: '2024-12-01', endDate: '2025-01-31', status: 'in-progress', owner: 'Med Writing', progress: 40 },
        { id: 'fda-pdufa', name: 'PDUFA Date', type: 'approval', startDate: '2025-02-15', endDate: '2025-02-15', status: 'upcoming', owner: 'FDA' },
      ]
    },
  ],
  ema: [
    {
      id: 'ema-review',
      name: 'EMA Review Process',
      type: 'review',
      startDate: '2024-07-01',
      endDate: '2025-04-30',
      status: 'in-progress',
      owner: 'Regulatory',
      progress: 45,
      children: [
        { id: 'ema-sub', name: 'MAA Submission', type: 'submission', startDate: '2024-07-01', endDate: '2024-07-01', status: 'completed', owner: 'Publishing', progress: 100 },
        { id: 'ema-validation', name: 'Validation (Day 10)', type: 'review', startDate: '2024-07-01', endDate: '2024-07-11', status: 'completed', owner: 'EMA', progress: 100 },
        { id: 'ema-day80', name: 'Day 80 Assessment', type: 'review', startDate: '2024-07-11', endDate: '2024-09-29', status: 'completed', owner: 'CHMP', progress: 100 },
        { id: 'ema-loe', name: 'List of Questions Response', type: 'document', startDate: '2024-09-30', endDate: '2024-12-28', status: 'in-progress', owner: 'Cross-functional', progress: 60 },
        { id: 'ema-day180', name: 'Day 180 Assessment', type: 'review', startDate: '2025-01-01', endDate: '2025-03-01', status: 'upcoming', owner: 'CHMP' },
        { id: 'ema-opinion', name: 'CHMP Opinion', type: 'approval', startDate: '2025-04-01', endDate: '2025-04-30', status: 'upcoming', owner: 'CHMP' },
      ]
    },
  ],
  pmda: [
    {
      id: 'pmda-review',
      name: 'PMDA Review Process',
      type: 'review',
      startDate: '2025-01-15',
      endDate: '2025-06-15',
      status: 'upcoming',
      owner: 'Regulatory',
      children: [
        { id: 'pmda-sub', name: 'JNDA Submission', type: 'submission', startDate: '2025-01-15', endDate: '2025-01-15', status: 'upcoming', owner: 'Publishing' },
        { id: 'pmda-consult', name: 'Pre-submission Consultation', type: 'meeting', startDate: '2024-12-01', endDate: '2024-12-15', status: 'in-progress', owner: 'Regulatory', progress: 80 },
        { id: 'pmda-review-1', name: 'PMDA Review', type: 'review', startDate: '2025-01-15', endDate: '2025-05-15', status: 'upcoming', owner: 'PMDA' },
        { id: 'pmda-approval', name: 'Approval Decision', type: 'approval', startDate: '2025-06-15', endDate: '2025-06-15', status: 'upcoming', owner: 'PMDA' },
      ]
    },
  ],
  nmpa: [
    {
      id: 'nmpa-review',
      name: 'NMPA Review Process',
      type: 'review',
      startDate: '2025-04-01',
      endDate: '2025-09-01',
      status: 'upcoming',
      owner: 'Regulatory',
      children: [
        { id: 'nmpa-sub', name: 'CNDA Submission', type: 'submission', startDate: '2025-04-01', endDate: '2025-04-01', status: 'upcoming', owner: 'Publishing' },
        { id: 'nmpa-cde', name: 'CDE Technical Review', type: 'review', startDate: '2025-04-01', endDate: '2025-08-01', status: 'upcoming', owner: 'CDE' },
        { id: 'nmpa-approval', name: 'Approval Decision', type: 'approval', startDate: '2025-09-01', endDate: '2025-09-01', status: 'upcoming', owner: 'NMPA' },
      ]
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Timeline calculations
export const TIMELINE_START = new Date('2024-01-01');
export const TIMELINE_END = new Date('2025-10-01');
export const TOTAL_DAYS = Math.ceil((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24));

export const getTimelinePosition = (date: string): number => {
  const d = new Date(date);
  const days = Math.ceil((d.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24));
  return (days / TOTAL_DAYS) * 100;
};

export const getTimelineWidth = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max((days / TOTAL_DAYS) * 100, 0.3);
};

// Status color helpers
export const getStatusColor = (status: MilestoneStatus): string => {
  const colors: Record<MilestoneStatus, string> = {
    completed: 'bg-accent-green/80',
    'in-progress': 'bg-accent-blue/80',
    upcoming: 'bg-slate-600/80',
    'at-risk': 'bg-accent-amber/80',
    blocked: 'bg-accent-red/80',
  };
  return colors[status] || 'bg-slate-600/80';
};

export const getStatusBadgeColor = (status: MilestoneStatus): string => {
  const colors: Record<MilestoneStatus, string> = {
    completed: 'bg-accent-green/20 text-accent-green',
    'in-progress': 'bg-accent-blue/20 text-accent-blue',
    upcoming: 'bg-slate-500/20 text-slate-400',
    'at-risk': 'bg-accent-amber/20 text-accent-amber',
    blocked: 'bg-accent-red/20 text-accent-red',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400';
};

export const getAuthoringStatusBadge = (status: AuthoringStatus): string => {
  const colors: Record<AuthoringStatus, string> = {
    draft: 'bg-slate-500/30 text-slate-300',
    review: 'bg-accent-amber/30 text-accent-amber',
    approved: 'bg-accent-green/30 text-accent-green',
    locked: 'bg-accent-purple/30 text-accent-purple',
  };
  return colors[status] || 'bg-slate-500/30 text-slate-300';
};

export const getApprovalStatusColor = (status: ApprovalStatus): string => {
  const colors: Record<ApprovalStatus, string> = {
    pending: 'bg-slate-500/20 text-slate-400',
    'in-review': 'bg-accent-blue/20 text-accent-blue',
    approved: 'bg-accent-green/20 text-accent-green',
    rejected: 'bg-accent-red/20 text-accent-red',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400';
};
