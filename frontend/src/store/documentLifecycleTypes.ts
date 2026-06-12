
// ============================================================================
// DOCUMENT LIFECYCLE TYPES - v69
// Complete Document Authoring Lifecycle Management
// ============================================================================

import { DocumentType, DocumentStatus, Priority, ReviewerRole } from '@/types/authoring';

// ============================================================================
// LIFECYCLE STAGES
// ============================================================================

export type LifecycleStage = 
  | 'planning'           // Requirements gathering, scope definition
  | 'prerequisites'      // Waiting for source data/documents
  | 'authoring'          // Active writing/drafting
  | 'review'             // Multi-stage review process
  | 'qc'                 // Quality control checks
  | 'approval'           // Final approval workflow
  | 'finalization'       // Document lock and archival
  | 'submission'         // Ready for/submitted to eCTD
  | 'amendment'          // Post-submission amendments
  | 'retired';           // Superseded/archived

export interface LifecycleStageDefinition {
  id: LifecycleStage;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  allowedTransitions: LifecycleStage[];
  requiredActions: LifecycleAction[];
  optionalActions: LifecycleAction[];
}

export type LifecycleAction = 
  | 'assign_author'
  | 'assign_reviewer'
  | 'start_drafting'
  | 'complete_section'
  | 'submit_for_review'
  | 'add_comment'
  | 'resolve_comment'
  | 'approve_section'
  | 'reject_section'
  | 'run_qc_checks'
  | 'sign_document'
  | 'finalize'
  | 'export_pdf'
  | 'send_to_ectd'
  | 'create_amendment'
  | 'archive';

// ============================================================================
// DOCUMENT VERSION CONTROL
// ============================================================================

export type VersionType = 'major' | 'minor' | 'patch' | 'amendment';

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  versionType: VersionType;
  
  // Content snapshot
  contentHash: string;
  wordCount: number;
  pageCount: number;
  sectionCount: number;
  
  // Lifecycle state at version
  status: DocumentStatus;
  stage: LifecycleStage;
  
  // Change tracking
  changeDescription: string;
  changeSummary: string;
  sectionsChanged: string[];
  
  // Author info
  createdBy: string;
  createdByName: string;
  createdAt: string;
  
  // Review info
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  
  // Metadata
  isBaseline: boolean;
  isSubmitted: boolean;
  submittedTo?: string;
  submittedAt?: string;
  
  // Links
  previousVersionId?: string;
  nextVersionId?: string;
}

export interface VersionComparison {
  fromVersion: string;
  toVersion: string;
  
  // Summary stats
  sectionsAdded: number;
  sectionsRemoved: number;
  sectionsModified: number;
  wordsAdded: number;
  wordsRemoved: number;
  
  // Detailed changes
  changes: VersionChange[];
}

export interface VersionChange {
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  changeType: 'added' | 'removed' | 'modified';
  beforeContent?: string;
  afterContent?: string;
  wordsDiff: number;
}

// ============================================================================
// COLLABORATION & ASSIGNMENTS
// ============================================================================

export interface DocumentAssignment {
  id: string;
  documentId: string;
  
  // Assignment details
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  role: ReviewerRole | 'author' | 'owner';
  
  // Scope
  scope: 'full-document' | 'sections';
  assignedSections?: string[];
  
  // Status
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'declined';
  dueDate?: string;
  completedAt?: string;
  
  // Metrics
  sectionsAssigned: number;
  sectionsCompleted: number;
  commentsProvided: number;
  
  // Metadata
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  notes?: string;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  
  // Session info
  startedAt: string;
  endedAt?: string;
  
  // Participants
  participants: SessionParticipant[];
  
  // Activity
  editsCount: number;
  commentsCount: number;
  chatMessages: number;
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
  leftAt?: string;
  currentSection?: string;
  isActive: boolean;
}

// ============================================================================
// REVIEW CYCLES
// ============================================================================

export interface ReviewCycle {
  id: string;
  documentId: string;
  versionId: string;
  cycleNumber: number;
  
  // Cycle info
  stage: string;
  stageName: string;
  startedAt: string;
  completedAt?: string;
  dueDate: string;
  
  // Participants
  reviewers: ReviewerAssignment[];
  
  // Results
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  outcome?: 'approved' | 'approved-with-comments' | 'revision-required' | 'rejected';
  
  // Metrics
  totalComments: number;
  resolvedComments: number;
  openComments: number;
  
  // Consolidation
  consolidatedFeedback?: string;
  consolidatedBy?: string;
  consolidatedAt?: string;
}

export interface ReviewerAssignment {
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  
  // Assignment
  sectionsToReview: string[] | 'all';
  assignedAt: string;
  dueDate: string;
  
  // Status
  status: 'pending' | 'in-progress' | 'completed' | 'declined';
  decision?: 'approve' | 'approve-with-comments' | 'request-revision' | 'reject';
  decisionAt?: string;
  
  // Feedback
  commentsProvided: number;
  generalComments?: string;
}

// ============================================================================
// QC CHECKS
// ============================================================================

export type QCCheckCategory = 
  | 'formatting'
  | 'terminology'
  | 'cross-references'
  | 'tables-figures'
  | 'citations'
  | 'compliance'
  | 'ama-style'
  | 'regulatory';

export interface QCCheckResult {
  id: string;
  documentId: string;
  versionId: string;
  
  // Check info
  checkId: string;
  checkName: string;
  category: QCCheckCategory;
  description: string;
  
  // Result
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  severity: 'critical' | 'major' | 'minor' | 'info';
  
  // Location
  sectionId?: string;
  sectionNumber?: string;
  lineNumber?: number;
  
  // Details
  finding: string;
  suggestion?: string;
  autoFixable: boolean;
  
  // Resolution
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface QCRun {
  id: string;
  documentId: string;
  versionId: string;
  
  // Run info
  runAt: string;
  runBy: string;
  runByName: string;
  
  // Configuration
  checksRun: string[];
  sectionsChecked: string[] | 'all';
  
  // Results
  status: 'running' | 'completed' | 'failed';
  completedAt?: string;
  
  // Summary
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  
  // Results
  results: QCCheckResult[];
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

export interface ApprovalWorkflow {
  id: string;
  documentId: string;
  versionId: string;
  
  // Workflow info
  workflowName: string;
  startedAt: string;
  completedAt?: string;
  
  // Current state
  currentStepIndex: number;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected' | 'cancelled';
  
  // Steps
  steps: ApprovalStep[];
  
  // Final outcome
  outcome?: 'approved' | 'rejected';
  finalApprover?: string;
  finalApproverName?: string;
  finalDecisionAt?: string;
}

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string;
  
  // Required approvers
  requiredApprovers: ApproverInfo[];
  
  // Status
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  
  // Results
  approvals: ApprovalDecision[];
  allApproved: boolean;
}

export interface ApproverInfo {
  userId: string;
  userName: string;
  role: string;
  isRequired: boolean;
}

export interface ApprovalDecision {
  approverId: string;
  approverName: string;
  decision: 'approve' | 'reject' | 'abstain';
  comments?: string;
  signature?: DigitalSignatureInfo;
  decidedAt: string;
}

export interface DigitalSignatureInfo {
  signatureId: string;
  signatureType: '21cfr11' | 'electronic' | 'biometric';
  signedAt: string;
  reason: string;
  meaning: string;
  certificateId?: string;
}

// ============================================================================
// DOCUMENT LIFECYCLE STATE
// ============================================================================

export interface DocumentLifecycleState {
  documentId: string;
  
  // Current position in lifecycle
  currentStage: LifecycleStage;
  currentStatus: DocumentStatus;
  
  // Version info
  currentVersion: string;
  versions: DocumentVersion[];
  
  // Assignments
  assignments: DocumentAssignment[];
  activeCollaboration?: CollaborationSession;
  
  // Review state
  currentReviewCycle?: ReviewCycle;
  reviewHistory: ReviewCycle[];
  
  // QC state
  lastQCRun?: QCRun;
  qcHistory: QCRun[];
  
  // Approval state
  currentApproval?: ApprovalWorkflow;
  approvalHistory: ApprovalWorkflow[];
  
  // Metrics
  totalDaysInLifecycle: number;
  daysInCurrentStage: number;
  cycleTime: Record<LifecycleStage, number>;
  
  // History
  stageHistory: StageTransition[];
}

export interface StageTransition {
  id: string;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  reason: string;
  triggeredBy: string;
  triggeredByName: string;
  triggeredAt: string;
  automaticTransition: boolean;
}

// ============================================================================
// STAGE DEFINITIONS
// ============================================================================

export const LIFECYCLE_STAGES: Record<LifecycleStage, LifecycleStageDefinition> = {
  planning: {
    id: 'planning',
    name: 'Planning',
    description: 'Requirements gathering and scope definition',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    icon: 'Clipboard',
    allowedTransitions: ['prerequisites', 'authoring'],
    requiredActions: ['assign_author'],
    optionalActions: ['assign_reviewer'],
  },
  prerequisites: {
    id: 'prerequisites',
    name: 'Prerequisites',
    description: 'Waiting for required source documents and data',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: 'Clock',
    allowedTransitions: ['authoring', 'planning'],
    requiredActions: [],
    optionalActions: ['assign_reviewer'],
  },
  authoring: {
    id: 'authoring',
    name: 'Authoring',
    description: 'Active drafting and content creation',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: 'Edit3',
    allowedTransitions: ['review', 'prerequisites'],
    requiredActions: ['start_drafting', 'complete_section'],
    optionalActions: ['add_comment'],
  },
  review: {
    id: 'review',
    name: 'Review',
    description: 'Multi-stage review and feedback cycle',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    icon: 'Eye',
    allowedTransitions: ['authoring', 'qc'],
    requiredActions: ['submit_for_review', 'add_comment'],
    optionalActions: ['approve_section', 'reject_section'],
  },
  qc: {
    id: 'qc',
    name: 'QC',
    description: 'Quality control checks and validation',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    icon: 'CheckSquare',
    allowedTransitions: ['review', 'approval'],
    requiredActions: ['run_qc_checks'],
    optionalActions: ['add_comment'],
  },
  approval: {
    id: 'approval',
    name: 'Approval',
    description: 'Final approval and signatures',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    icon: 'CheckCircle',
    allowedTransitions: ['qc', 'finalization', 'authoring'],
    requiredActions: ['sign_document'],
    optionalActions: [],
  },
  finalization: {
    id: 'finalization',
    name: 'Finalization',
    description: 'Document lock and archive',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: 'Lock',
    allowedTransitions: ['submission', 'amendment'],
    requiredActions: ['finalize', 'export_pdf'],
    optionalActions: [],
  },
  submission: {
    id: 'submission',
    name: 'Submission',
    description: 'Ready for or submitted to eCTD',
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/20',
    icon: 'Send',
    allowedTransitions: ['amendment', 'retired'],
    requiredActions: ['send_to_ectd'],
    optionalActions: [],
  },
  amendment: {
    id: 'amendment',
    name: 'Amendment',
    description: 'Post-submission changes',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    icon: 'RefreshCw',
    allowedTransitions: ['authoring', 'review'],
    requiredActions: ['create_amendment'],
    optionalActions: [],
  },
  retired: {
    id: 'retired',
    name: 'Retired',
    description: 'Document superseded or archived',
    color: 'text-slate-500',
    bgColor: 'bg-slate-600/20',
    icon: 'Archive',
    allowedTransitions: [],
    requiredActions: ['archive'],
    optionalActions: [],
  },
};

// ============================================================================
// QC CHECK DEFINITIONS
// ============================================================================

export interface QCCheckDefinition {
  id: string;
  name: string;
  category: QCCheckCategory;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  autoFixable: boolean;
  applicableDocTypes: DocumentType[];
}

export const QC_CHECKS: QCCheckDefinition[] = [
  // Formatting checks
  { id: 'qc-fmt-001', name: 'Header Level Consistency', category: 'formatting', description: 'Verify header hierarchy is consistent', severity: 'minor', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-fmt-002', name: 'Table Numbering', category: 'formatting', description: 'Tables numbered sequentially', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-fmt-003', name: 'Figure Numbering', category: 'formatting', description: 'Figures numbered sequentially', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-fmt-004', name: 'Page Breaks', category: 'formatting', description: 'Appropriate page breaks before major sections', severity: 'info', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  
  // AMA Style checks
  { id: 'qc-ama-001', name: 'Number Formatting', category: 'ama-style', description: 'Numbers 0-9 spelled out except with units', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-ama-002', name: 'Unit Spacing', category: 'ama-style', description: 'Space between number and unit (5 mg not 5mg)', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-ama-003', name: 'Abbreviation Definition', category: 'ama-style', description: 'Abbreviations defined at first use', severity: 'major', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-ama-004', name: 'Drug Name Capitalization', category: 'ama-style', description: 'Generic drug names lowercase', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-ama-005', name: 'P Value Formatting', category: 'ama-style', description: 'P values italicized with proper format', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'module-25', 'module-27'] },
  { id: 'qc-ama-006', name: 'CI Formatting', category: 'ama-style', description: 'Confidence intervals in standard format', severity: 'minor', autoFixable: true, applicableDocTypes: ['csr', 'module-25', 'module-27'] },
  
  // Cross-reference checks
  { id: 'qc-xref-001', name: 'Table Cross-References', category: 'cross-references', description: 'All table references point to existing tables', severity: 'critical', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-xref-002', name: 'Figure Cross-References', category: 'cross-references', description: 'All figure references point to existing figures', severity: 'critical', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-xref-003', name: 'Section Cross-References', category: 'cross-references', description: 'All section references point to existing sections', severity: 'major', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-xref-004', name: 'Citation Completeness', category: 'cross-references', description: 'All citations have corresponding references', severity: 'major', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  
  // Regulatory compliance
  { id: 'qc-reg-001', name: 'ICH E3 Structure', category: 'regulatory', description: 'CSR follows ICH E3 structure', severity: 'critical', autoFixable: false, applicableDocTypes: ['csr'] },
  { id: 'qc-reg-002', name: 'Required Sections Present', category: 'regulatory', description: 'All required sections are present', severity: 'critical', autoFixable: false, applicableDocTypes: ['csr', 'protocol', 'ib'] },
  { id: 'qc-reg-003', name: 'Adverse Event Table Format', category: 'regulatory', description: 'AE tables in regulatory format', severity: 'major', autoFixable: false, applicableDocTypes: ['csr', 'module-27'] },
  
  // Terminology
  { id: 'qc-term-001', name: 'Consistent Terminology', category: 'terminology', description: 'Product names used consistently', severity: 'major', autoFixable: true, applicableDocTypes: ['csr', 'protocol', 'ib', 'module-25', 'module-27'] },
  { id: 'qc-term-002', name: 'MedDRA Terms', category: 'terminology', description: 'Adverse events use MedDRA preferred terms', severity: 'major', autoFixable: false, applicableDocTypes: ['csr'] },
];
