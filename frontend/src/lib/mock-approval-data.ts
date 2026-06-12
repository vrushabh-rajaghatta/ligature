
// Mock Approval Request Data - Phase 2.3e.5
// Demo data for ApprovalStatusDashboard testing
// v0.13.57: Added documentType field for filtering

import type { ApprovalRequest, ApprovalComment, ApprovalStep, EscalationEvent, EscalationConfig, DocumentType } from '@/types/approval';
import { DEFAULT_ESCALATION_TIERS } from '@/types/approval';

// ============================================================================
// DEMO MODE CONFIGURATION - v0.13.52
// ============================================================================

/**
 * When true, timestamps are frozen relative to DEMO_FROZEN_DATE
 * for consistent investor demo presentations
 */
export const DEMO_MODE = false;

/**
 * The "current" date for demo mode
 * All relative timestamps calculated from this date
 */
export const DEMO_FROZEN_DATE = new Date('2026-01-07T14:00:00Z');

/**
 * Get the reference date for timestamp calculations
 */
function getReferenceDate(): Date {
  return DEMO_MODE ? DEMO_FROZEN_DATE : new Date();
}

// ============================================================================
// HELPER: Generate timestamps relative to reference date
// ============================================================================

function hoursAgo(hours: number): string {
  const date = new Date(getReferenceDate());
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function hoursFromNow(hours: number): string {
  const date = new Date(getReferenceDate());
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function daysAgo(days: number): string {
  const date = new Date(getReferenceDate());
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date(getReferenceDate());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ============================================================================
// ESCALATION CONFIGURATION
// ============================================================================

export const mockEscalationConfig: EscalationConfig = {
  enabled: true,
  tiers: DEFAULT_ESCALATION_TIERS,
  workingHoursOnly: true,
  timezone: 'America/New_York',
  excludeWeekends: true,
};

// ============================================================================
// MOCK ESCALATION EVENTS
// ============================================================================

export const mockEscalationEventsOverdue: EscalationEvent[] = [
  {
    id: 'esc-001',
    approvalRequestId: 'apr-002',
    stepId: 'step-2-od',
    tier: 1,
    triggeredAt: daysAgo(2),
    triggerReason: 'Step overdue by 24 hours',
    action: 'reminder',
    notifiedUsers: [
      {
        userId: 'user-4',
        userName: 'Dr. Robert Kim',
        role: 'Medical Director',
        notifiedAt: daysAgo(2),
      },
    ],
  },
  {
    id: 'esc-002',
    approvalRequestId: 'apr-002',
    stepId: 'step-2-od',
    tier: 2,
    triggeredAt: daysAgo(1),
    triggerReason: 'Step overdue by 48 hours - Manager notification triggered',
    action: 'notify-manager',
    notifiedUsers: [
      {
        userId: 'user-4',
        userName: 'Dr. Robert Kim',
        role: 'Medical Director',
        notifiedAt: daysAgo(1),
      },
      {
        userId: 'user-mgr-1',
        userName: 'Dr. Patricia Hayes',
        role: 'VP Clinical Development',
        notifiedAt: daysAgo(1),
        acknowledgedAt: hoursAgo(20),
      },
    ],
  },
  {
    id: 'esc-003',
    approvalRequestId: 'apr-002',
    stepId: 'step-2-od',
    tier: 3,
    triggeredAt: hoursAgo(4),
    triggerReason: 'Step overdue by 72 hours - VP escalation triggered',
    action: 'notify-vp',
    notifiedUsers: [
      {
        userId: 'user-4',
        userName: 'Dr. Robert Kim',
        role: 'Medical Director',
        notifiedAt: hoursAgo(4),
      },
      {
        userId: 'user-vp-1',
        userName: 'Dr. Michael Chang',
        role: 'SVP R&D',
        notifiedAt: hoursAgo(4),
      },
    ],
  },
];

// ============================================================================
// MOCK APPROVAL STEPS
// ============================================================================

const mockStepsInProgress: ApprovalStep[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    name: 'Technical Review',
    description: 'Review for technical accuracy',
    assignmentType: 'user',
    assignedUserId: 'user-1',
    assignedUserName: 'Dr. James Wilson',
    status: 'completed',
    startedAt: daysAgo(3),
    completedAt: daysAgo(2),
    decision: 'approved',
    decisionBy: 'user-1',
    decisionByName: 'Dr. James Wilson',
    decisionComments: 'Technical content is accurate and well-documented. Minor formatting suggestions provided via comments.',
    signatureRequired: false,
    slaHours: 48,
    isOverdue: false,
  },
  {
    id: 'step-2',
    stepNumber: 2,
    name: 'Medical Review',
    description: 'Medical director sign-off',
    assignmentType: 'role',
    assignedRole: 'medical-director',
    assignedUserId: 'user-2',
    assignedUserName: 'Dr. Sarah Chen',
    status: 'in-progress',
    startedAt: daysAgo(2),
    signatureRequired: true,
    dueDate: hoursFromNow(24),
    slaHours: 72,
    isOverdue: false,
  },
  {
    id: 'step-3',
    stepNumber: 3,
    name: 'Regulatory Review',
    description: 'Regulatory compliance check',
    assignmentType: 'role',
    assignedRole: 'regulatory-lead',
    assignedUserName: 'Michael Torres',
    status: 'pending',
    signatureRequired: true,
    slaHours: 48,
    isOverdue: false,
  },
  {
    id: 'step-4',
    stepNumber: 4,
    name: 'QA Sign-off',
    description: 'Quality assurance final review',
    assignmentType: 'role',
    assignedRole: 'qa-manager',
    assignedUserName: 'Jennifer Park',
    status: 'pending',
    signatureRequired: true,
    slaHours: 24,
    isOverdue: false,
  },
];

const mockStepsOverdue: ApprovalStep[] = [
  {
    id: 'step-1-od',
    stepNumber: 1,
    name: 'Editorial Review',
    description: 'Grammar and formatting check',
    assignmentType: 'user',
    assignedUserId: 'user-3',
    assignedUserName: 'Lisa Martinez',
    status: 'completed',
    startedAt: daysAgo(5),
    completedAt: daysAgo(4),
    decision: 'approved',
    decisionBy: 'user-3',
    decisionByName: 'Lisa Martinez',
    decisionComments: 'All edits complete.',
    signatureRequired: false,
    slaHours: 24,
    isOverdue: false,
  },
  {
    id: 'step-2-od',
    stepNumber: 2,
    name: 'Medical Review',
    description: 'Medical director sign-off',
    assignmentType: 'role',
    assignedRole: 'medical-director',
    assignedUserId: 'user-4',
    assignedUserName: 'Dr. Robert Kim',
    status: 'in-progress',
    startedAt: daysAgo(4),
    dueDate: daysAgo(1), // OVERDUE
    signatureRequired: true,
    slaHours: 72,
    isOverdue: true,
  },
  {
    id: 'step-3-od',
    stepNumber: 3,
    name: 'Executive Sign-off',
    status: 'pending',
    assignmentType: 'role',
    assignedRole: 'executive-sponsor',
    signatureRequired: true,
    slaHours: 48,
    isOverdue: false,
  },
];

const mockStepsCompleted: ApprovalStep[] = [
  {
    id: 'step-1-c',
    stepNumber: 1,
    name: 'Technical Review',
    assignmentType: 'user',
    assignedUserName: 'Dr. James Wilson',
    status: 'completed',
    startedAt: daysAgo(7),
    completedAt: daysAgo(6),
    decision: 'approved',
    decisionByName: 'Dr. James Wilson',
    decisionComments: 'Approved with minor revisions.',
    signatureRequired: false,
    slaHours: 48,
    isOverdue: false,
  },
  {
    id: 'step-2-c',
    stepNumber: 2,
    name: 'Medical Review',
    assignmentType: 'role',
    assignedRole: 'medical-director',
    assignedUserName: 'Dr. Sarah Chen',
    status: 'completed',
    startedAt: daysAgo(6),
    completedAt: daysAgo(4),
    decision: 'approved',
    decisionByName: 'Dr. Sarah Chen',
    decisionComments: 'Medical content verified and accurate.',
    signatureRequired: true,
    signatureId: 'sig-001',
    signatureTimestamp: daysAgo(4),
    slaHours: 72,
    isOverdue: false,
  },
  {
    id: 'step-3-c',
    stepNumber: 3,
    name: 'Regulatory Review',
    assignmentType: 'role',
    assignedRole: 'regulatory-lead',
    assignedUserName: 'Michael Torres',
    status: 'completed',
    startedAt: daysAgo(4),
    completedAt: daysAgo(2),
    decision: 'approved',
    decisionByName: 'Michael Torres',
    decisionComments: 'Compliant with all regulatory requirements. Ready for submission.',
    signatureRequired: true,
    signatureId: 'sig-002',
    signatureTimestamp: daysAgo(2),
    slaHours: 48,
    isOverdue: false,
  },
];

// ============================================================================
// MOCK COMMENTS
// ============================================================================

const mockComments: ApprovalComment[] = [
  {
    id: 'comment-1',
    approvalRequestId: 'apr-001',
    stepId: 'step-1',
    authorId: 'user-1',
    authorName: 'Dr. James Wilson',
    authorRole: 'Technical Reviewer',
    content: 'Please clarify the dosing calculations in Section 3.2. The current formula appears to use the wrong conversion factor.',
    commentType: 'question',
    status: 'addressed',
    addressedBy: 'user-5',
    addressedAt: daysAgo(2),
    createdAt: daysAgo(3),
  },
  {
    id: 'comment-2',
    approvalRequestId: 'apr-001',
    authorId: 'user-5',
    authorName: 'Emily Rodriguez',
    authorRole: 'Document Author',
    content: 'Updated Section 3.2 with corrected conversion factor (mg/kg instead of mg/lb). Please review.',
    commentType: 'response',
    status: 'closed',
    parentCommentId: 'comment-1',
    createdAt: daysAgo(2),
  },
  {
    id: 'comment-3',
    approvalRequestId: 'apr-001',
    stepId: 'step-2',
    authorId: 'user-2',
    authorName: 'Dr. Sarah Chen',
    authorRole: 'Medical Director',
    content: 'Currently reviewing. Will complete sign-off by EOD tomorrow.',
    commentType: 'note',
    status: 'open',
    createdAt: hoursAgo(8),
  },
];

// ============================================================================
// MOCK APPROVAL REQUESTS
// ============================================================================

export const mockApprovalRequestInProgress: ApprovalRequest = {
  id: 'apr-001',
  requestId: 'APR-2025-00142',
  documentId: 'doc-csr-001',
  documentTitle: 'Clinical Study Report - Phase III Trial ABC-123',
  documentVersionId: 'ver-3',
  documentVersion: '3.0',
  documentType: 'csr',
  approvalType: 'regulatory-review',
  urgency: 'expedited',
  routingMode: 'sequential',
  requesterId: 'user-5',
  requesterName: 'Emily Rodriguez',
  requesterDepartment: 'Clinical Operations',
  title: 'CSR Final Review Before Submission',
  description: 'Final review cycle for Clinical Study Report before regulatory submission to FDA. All sections complete and QC\'d. Requesting expedited review due to submission deadline.',
  justification: 'PDUFA date approaching - submission required by Jan 31, 2025',
  approvalSteps: mockStepsInProgress,
  currentStepIndex: 1,
  requestedAt: daysAgo(3),
  dueDate: hoursFromNow(48),
  status: 'in-progress',
  comments: mockComments,
  createdAt: daysAgo(3),
  updatedAt: hoursAgo(8),
};

export const mockApprovalRequestOverdue: ApprovalRequest = {
  id: 'apr-002',
  requestId: 'APR-2025-00128',
  documentId: 'doc-ib-001',
  documentTitle: 'Investigator\'s Brochure v4.0',
  documentVersionId: 'ver-4',
  documentVersion: '4.0',
  documentType: 'ib',
  approvalType: 'medical-review',
  urgency: 'urgent',
  routingMode: 'sequential',
  requesterId: 'user-6',
  requesterName: 'David Park',
  requesterDepartment: 'Regulatory Affairs',
  title: 'IB Annual Update - Urgent Medical Review Required',
  description: 'Annual update to Investigator\'s Brochure with new safety data from ongoing trials. Requires urgent medical review due to IRB submission deadline.',
  approvalSteps: mockStepsOverdue,
  currentStepIndex: 1,
  requestedAt: daysAgo(5),
  dueDate: daysAgo(1),
  status: 'in-progress',
  comments: [],
  createdAt: daysAgo(5),
  updatedAt: daysAgo(1),
  // v0.13.52: Escalation data
  escalationEvents: mockEscalationEventsOverdue,
  escalationConfig: mockEscalationConfig,
};

export const mockApprovalRequestApproved: ApprovalRequest = {
  id: 'apr-003',
  requestId: 'APR-2025-00099',
  documentId: 'doc-proto-001',
  documentTitle: 'Protocol Amendment 2 - Study XYZ-456',
  documentVersionId: 'ver-2',
  documentVersion: '2.0',
  documentType: 'protocol',
  approvalType: 'regulatory-review',
  urgency: 'standard',
  routingMode: 'sequential',
  requesterId: 'user-7',
  requesterName: 'Amanda Chen',
  requesterDepartment: 'Clinical Development',
  title: 'Protocol Amendment for Dosing Modification',
  description: 'Amendment to modify dosing schedule based on interim analysis results. All departments have reviewed and provided feedback.',
  approvalSteps: mockStepsCompleted,
  currentStepIndex: 3,
  requestedAt: daysAgo(7),
  dueDate: daysAgo(1),
  completedAt: daysAgo(2),
  status: 'approved',
  comments: [],
  createdAt: daysAgo(7),
  updatedAt: daysAgo(2),
};

export const mockApprovalRequestPending: ApprovalRequest = {
  id: 'apr-004',
  requestId: 'APR-2025-00156',
  documentId: 'doc-sop-001',
  documentTitle: 'SOP-CL-001 Sample Collection Procedures',
  documentVersionId: 'ver-1',
  documentVersion: '1.2',
  documentType: 'sop',
  approvalType: 'qa-review',
  urgency: 'standard',
  routingMode: 'sequential',
  requesterId: 'user-8',
  requesterName: 'Mark Thompson',
  requesterDepartment: 'Quality Assurance',
  title: 'SOP Revision - Sample Collection Update',
  description: 'Minor revision to sample collection procedures to align with updated laboratory standards.',
  approvalSteps: [
    {
      id: 'step-1-p',
      stepNumber: 1,
      name: 'QA Review',
      assignmentType: 'role',
      assignedRole: 'qa-manager',
      assignedUserName: 'Jennifer Park',
      status: 'pending',
      signatureRequired: true,
      slaHours: 48,
      isOverdue: false,
    },
    {
      id: 'step-2-p',
      stepNumber: 2,
      name: 'Department Head Approval',
      assignmentType: 'role',
      assignedRole: 'department-head',
      status: 'pending',
      signatureRequired: true,
      slaHours: 24,
      isOverdue: false,
    },
  ],
  currentStepIndex: 0,
  requestedAt: hoursAgo(2),
  dueDate: hoursFromNow(72),
  status: 'pending',
  comments: [],
  createdAt: hoursAgo(2),
  updatedAt: hoursAgo(2),
};

// ============================================================================
// v0.13.55: APPROVAL QUEUE MOCK DATA - Assigned to Current User (Sarah Chen)
// ============================================================================

// Approval request assigned to Sarah Chen (current user) - Pending her action
export const mockApprovalRequestAssignedToSarah1: ApprovalRequest = {
  id: 'apr-005',
  requestId: 'APR-2025-00162',
  documentId: 'doc-cmc-stability-001',
  documentTitle: 'CMC Stability Study Report - 24 Month Data',
  documentVersionId: 'ver-2',
  documentVersion: '2.1',
  documentType: 'cmc',
  approvalType: 'regulatory-review',
  urgency: 'urgent',
  routingMode: 'sequential',
  requesterId: 'user-2',
  requesterName: 'Michael Roberts',
  requesterDepartment: 'CMC',
  title: 'CMC Stability Report - Regulatory Signoff Required',
  description: 'Annual stability report with 24-month data ready for regulatory review and signoff before NDA filing.',
  approvalSteps: [
    {
      id: 'step-1-s1',
      stepNumber: 1,
      name: 'CMC Review',
      assignmentType: 'user',
      assignedUserId: 'user-2',
      assignedUserName: 'Michael Roberts',
      status: 'completed',
      startedAt: daysAgo(3),
      completedAt: daysAgo(2),
      decision: 'approved',
      decisionBy: 'user-2',
      decisionByName: 'Michael Roberts',
      decisionComments: 'Data package complete, ready for regulatory.',
      signatureRequired: false,
      slaHours: 48,
      isOverdue: false,
    },
    {
      id: 'step-2-s1',
      stepNumber: 2,
      name: 'Regulatory Review',
      assignmentType: 'user',
      assignedUserId: 'u-1',
      assignedUserName: 'Sarah Chen',
      status: 'in-progress',
      startedAt: daysAgo(1),
      dueDate: hoursFromNow(8), // Due soon!
      signatureRequired: true,
      slaHours: 48,
      isOverdue: false,
    },
    {
      id: 'step-3-s1',
      stepNumber: 3,
      name: 'QA Sign-off',
      assignmentType: 'role',
      assignedRole: 'qa-manager',
      assignedUserName: 'Jennifer Park',
      status: 'pending',
      signatureRequired: true,
      slaHours: 24,
      isOverdue: false,
    },
  ],
  currentStepIndex: 1,
  requestedAt: daysAgo(3),
  dueDate: hoursFromNow(8),
  status: 'in-progress',
  comments: [],
  createdAt: daysAgo(3),
  updatedAt: daysAgo(1),
};

// Another approval assigned to Sarah - Overdue
export const mockApprovalRequestAssignedToSarah2: ApprovalRequest = {
  id: 'apr-006',
  requestId: 'APR-2025-00145',
  documentId: 'doc-proto-amendment-003',
  documentTitle: 'Protocol Amendment 3 - Dosing Adjustment',
  documentVersionId: 'ver-1',
  documentVersion: '1.0',
  documentType: 'protocol',
  approvalType: 'medical-review',
  urgency: 'critical',
  routingMode: 'sequential',
  requesterId: 'user-4',
  requesterName: 'David Kim',
  requesterDepartment: 'Clinical Operations',
  title: 'Critical Protocol Amendment - IRB Submission Deadline',
  description: 'Protocol amendment for dosing adjustment based on DSMB recommendation. IRB submission deadline approaching.',
  approvalSteps: [
    {
      id: 'step-1-s2',
      stepNumber: 1,
      name: 'Clinical Review',
      assignmentType: 'user',
      assignedUserId: 'user-4',
      assignedUserName: 'David Kim',
      status: 'completed',
      startedAt: daysAgo(4),
      completedAt: daysAgo(3),
      decision: 'approved',
      decisionByName: 'David Kim',
      signatureRequired: false,
      slaHours: 24,
      isOverdue: false,
    },
    {
      id: 'step-2-s2',
      stepNumber: 2,
      name: 'Regulatory Approval',
      assignmentType: 'user',
      assignedUserId: 'u-1',
      assignedUserName: 'Sarah Chen',
      status: 'in-progress',
      startedAt: daysAgo(3),
      dueDate: daysAgo(1), // OVERDUE
      signatureRequired: true,
      slaHours: 48,
      isOverdue: true,
    },
  ],
  currentStepIndex: 1,
  requestedAt: daysAgo(4),
  dueDate: daysAgo(1),
  status: 'in-progress',
  comments: [],
  createdAt: daysAgo(4),
  updatedAt: daysAgo(1),
  escalationEvents: [
    {
      id: 'esc-s2-001',
      approvalRequestId: 'apr-006',
      stepId: 'step-2-s2',
      tier: 1,
      triggeredAt: hoursAgo(12),
      triggerReason: 'Approval step overdue by 24 hours',
      action: 'reminder',
      notifiedUsers: [
        { userId: 'u-1', userName: 'Sarah Chen', role: 'VP Regulatory Operations', notifiedAt: hoursAgo(12) }
      ],
    },
  ],
};

// Approval that Sarah requested (awaiting others)
export const mockApprovalRequestRequestedBySarah: ApprovalRequest = {
  id: 'apr-007',
  requestId: 'APR-2025-00168',
  documentId: 'doc-ind-cover-letter',
  documentTitle: 'IND Cover Letter - Initial Submission',
  documentVersionId: 'ver-1',
  documentVersion: '1.0',
  documentType: 'regulatory',
  approvalType: 'executive-sign-off',
  urgency: 'expedited',
  routingMode: 'sequential',
  requesterId: 'u-1',
  requesterName: 'Sarah Chen',
  requesterDepartment: 'Regulatory Affairs',
  title: 'IND Cover Letter - Executive Signature Required',
  description: 'Cover letter for initial IND submission requires SVP signature before filing.',
  approvalSteps: [
    {
      id: 'step-1-s3',
      stepNumber: 1,
      name: 'Regulatory Review',
      assignmentType: 'user',
      assignedUserId: 'u-1',
      assignedUserName: 'Sarah Chen',
      status: 'completed',
      startedAt: daysAgo(2),
      completedAt: daysAgo(1),
      decision: 'approved',
      decisionByName: 'Sarah Chen',
      signatureRequired: false,
      slaHours: 24,
      isOverdue: false,
    },
    {
      id: 'step-2-s3',
      stepNumber: 2,
      name: 'Executive Sign-off',
      assignmentType: 'user',
      assignedUserId: 'u-8',
      assignedUserName: 'Robert Johnson',
      status: 'in-progress',
      startedAt: daysAgo(1),
      dueDate: hoursFromNow(24),
      signatureRequired: true,
      slaHours: 48,
      isOverdue: false,
    },
  ],
  currentStepIndex: 1,
  requestedAt: daysAgo(2),
  dueDate: hoursFromNow(24),
  status: 'in-progress',
  comments: [],
  createdAt: daysAgo(2),
  updatedAt: daysAgo(1),
};

// Sarah completed this one recently
export const mockApprovalRequestCompletedBySarah: ApprovalRequest = {
  id: 'apr-008',
  requestId: 'APR-2025-00130',
  documentId: 'doc-dsur-001',
  documentTitle: 'Development Safety Update Report (DSUR)',
  documentVersionId: 'ver-3',
  documentVersion: '3.0',
  documentType: 'safety',
  approvalType: 'regulatory-review',
  urgency: 'standard',
  routingMode: 'sequential',
  requesterId: 'user-7',
  requesterName: 'Lisa Park',
  requesterDepartment: 'Pharmacovigilance',
  title: 'Annual DSUR - Regulatory Filing',
  description: 'Annual DSUR for active INDs, completed review cycle.',
  approvalSteps: [
    {
      id: 'step-1-s4',
      stepNumber: 1,
      name: 'Safety Review',
      assignmentType: 'user',
      assignedUserName: 'Lisa Park',
      status: 'completed',
      startedAt: daysAgo(10),
      completedAt: daysAgo(8),
      decision: 'approved',
      decisionByName: 'Lisa Park',
      signatureRequired: false,
      slaHours: 48,
      isOverdue: false,
    },
    {
      id: 'step-2-s4',
      stepNumber: 2,
      name: 'Regulatory Review',
      assignmentType: 'user',
      assignedUserId: 'u-1',
      assignedUserName: 'Sarah Chen',
      status: 'completed',
      startedAt: daysAgo(8),
      completedAt: daysAgo(5),
      decision: 'approved',
      decisionBy: 'u-1',
      decisionByName: 'Sarah Chen',
      decisionComments: 'DSUR meets all regulatory requirements. Approved for submission.',
      signatureRequired: true,
      signatureId: 'sig-sarah-001',
      signatureTimestamp: daysAgo(5),
      slaHours: 72,
      isOverdue: false,
    },
    {
      id: 'step-3-s4',
      stepNumber: 3,
      name: 'QA Final',
      assignmentType: 'role',
      assignedRole: 'qa-manager',
      assignedUserName: 'James Martinez',
      status: 'completed',
      startedAt: daysAgo(5),
      completedAt: daysAgo(3),
      decision: 'approved',
      decisionByName: 'James Martinez',
      signatureRequired: true,
      signatureId: 'sig-qa-002',
      signatureTimestamp: daysAgo(3),
      slaHours: 24,
      isOverdue: false,
    },
  ],
  currentStepIndex: 2,
  requestedAt: daysAgo(10),
  dueDate: daysAgo(2),
  completedAt: daysAgo(3),
  status: 'approved',
  comments: [],
  createdAt: daysAgo(10),
  updatedAt: daysAgo(3),
};

// Due today - urgent
export const mockApprovalRequestDueToday: ApprovalRequest = {
  id: 'apr-009',
  requestId: 'APR-2025-00171',
  documentId: 'doc-label-update-001',
  documentTitle: 'Prescribing Information Update - Safety Revision',
  documentVersionId: 'ver-5',
  documentVersion: '5.2',
  documentType: 'labeling',
  approvalType: 'medical-review',
  urgency: 'urgent',
  routingMode: 'sequential',
  requesterId: 'user-11',
  requesterName: 'Rachel Green',
  requesterDepartment: 'Regulatory Affairs',
  title: 'PI Safety Update - Urgent Medical Review',
  description: 'Safety-related labeling update per FDA feedback, requires expedited medical review.',
  approvalSteps: [
    {
      id: 'step-1-s5',
      stepNumber: 1,
      name: 'Medical Review',
      assignmentType: 'user',
      assignedUserId: 'u-1',
      assignedUserName: 'Sarah Chen',
      status: 'in-progress',
      startedAt: hoursAgo(20),
      dueDate: hoursFromNow(4), // Due in 4 hours!
      signatureRequired: true,
      slaHours: 24,
      isOverdue: false,
    },
    {
      id: 'step-2-s5',
      stepNumber: 2,
      name: 'Legal Review',
      assignmentType: 'role',
      assignedRole: 'legal-counsel',
      status: 'pending',
      signatureRequired: true,
      slaHours: 48,
      isOverdue: false,
    },
  ],
  currentStepIndex: 0,
  requestedAt: hoursAgo(20),
  dueDate: hoursFromNow(4),
  status: 'in-progress',
  comments: [],
  createdAt: hoursAgo(20),
  updatedAt: hoursAgo(20),
};

// ============================================================================
// ALL MOCK REQUESTS (for lists/dashboards)
// ============================================================================

export const mockApprovalRequests: ApprovalRequest[] = [
  mockApprovalRequestInProgress,
  mockApprovalRequestOverdue,
  mockApprovalRequestApproved,
  mockApprovalRequestPending,
];

// v0.13.55: Extended list including user-specific approvals
export const mockApprovalRequestsExtended: ApprovalRequest[] = [
  mockApprovalRequestInProgress,
  mockApprovalRequestOverdue,
  mockApprovalRequestApproved,
  mockApprovalRequestPending,
  mockApprovalRequestAssignedToSarah1,
  mockApprovalRequestAssignedToSarah2,
  mockApprovalRequestRequestedBySarah,
  mockApprovalRequestCompletedBySarah,
  mockApprovalRequestDueToday,
];

// v0.13.55: Get approval requests for a specific user
export function getMockApprovalRequestsForUser(userId: string, userName: string): ApprovalRequest[] {
  // For demo, return all extended requests as they're designed to show various states
  return mockApprovalRequestsExtended;
}

// ============================================================================
// HELPER: Get mock request by status
// ============================================================================

export function getMockApprovalRequest(status: 'in-progress' | 'overdue' | 'approved' | 'pending'): ApprovalRequest {
  switch (status) {
    case 'in-progress': return mockApprovalRequestInProgress;
    case 'overdue': return mockApprovalRequestOverdue;
    case 'approved': return mockApprovalRequestApproved;
    case 'pending': return mockApprovalRequestPending;
    default: return mockApprovalRequestInProgress;
  }
}
