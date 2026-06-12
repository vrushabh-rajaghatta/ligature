
// ============================================================================
// Approval Workflow Types - Phase 2.3e
// UI-focused types for approval workflow management
// Complements existing workflow types in documentControlTypes.ts
// ============================================================================

// ============================================================================
// APPROVAL REQUEST TYPES
// ============================================================================

/**
 * Type of approval being requested
 * Determines the workflow template and approver roles
 */
export type ApprovalType = 
  | 'editorial-review'      // Minor changes, formatting
  | 'technical-review'      // Content accuracy
  | 'medical-review'        // Medical/scientific accuracy
  | 'regulatory-review'     // Regulatory compliance
  | 'qa-review'             // Quality assurance
  | 'legal-review'          // Legal compliance
  | 'executive-sign-off'    // Final executive approval
  | 'release-approval';     // Approval for release/publishing

/**
 * Document type categories for filtering - v0.13.57
 */
export type DocumentType =
  | 'protocol'              // Clinical protocols & amendments
  | 'csr'                   // Clinical Study Reports
  | 'ib'                    // Investigator's Brochure
  | 'cmc'                   // CMC/Manufacturing documents
  | 'safety'                // Safety reports (DSUR, SUSAR, etc.)
  | 'regulatory'            // Regulatory submissions (IND, NDA, BLA)
  | 'sop'                   // Standard Operating Procedures
  | 'labeling'              // Labels and prescribing information
  | 'other';                // Other document types

/**
 * Urgency level for the approval request
 * Affects SLA and escalation behavior
 */
export type ApprovalUrgency = 
  | 'standard'    // Normal processing (default SLA)
  | 'expedited'   // Faster processing (reduced SLA)
  | 'urgent'      // Priority processing (shortest SLA)
  | 'critical';   // Immediate attention required

/**
 * Current status of an approval request
 */
export type ApprovalRequestStatus = 
  | 'draft'           // Not yet submitted
  | 'pending'         // Awaiting first approver
  | 'in-progress'     // At least one approver engaged
  | 'revision-needed' // Returned for revision
  | 'approved'        // All approvals complete
  | 'rejected'        // Rejected by approver
  | 'cancelled'       // Cancelled by requester
  | 'expired';        // Past due date without completion

/**
 * Routing mode for multi-approver workflows
 */
export type ApprovalRoutingMode = 
  | 'sequential'  // A → B → C (one at a time)
  | 'parallel'    // A + B + C (all simultaneously)
  | 'any-of'      // First approver completes it
  | 'quorum';     // N of M approvers required

/**
 * Role-based approver definition
 * Maps to organizational roles for dynamic assignment
 */
export type ApproverRole = 
  | 'document-owner'
  | 'department-head'
  | 'medical-director'
  | 'regulatory-lead'
  | 'qa-manager'
  | 'legal-counsel'
  | 'executive-sponsor'
  | 'subject-matter-expert'
  | 'quality-reviewer'
  | 'compliance-officer';

// ============================================================================
// APPROVAL REQUEST INTERFACE
// ============================================================================

/**
 * Approval request initiated by a user
 * Links a document version to an approval workflow
 */
export interface ApprovalRequest {
  id: string;
  requestId: string; // Business identifier (e.g., APR-2024-00123)
  
  // Document Context
  documentId: string;
  documentTitle: string;
  documentVersionId: string;
  documentVersion: string;
  documentType?: DocumentType; // v0.13.57 - Document type for filtering
  
  // Request Details
  approvalType: ApprovalType;
  urgency: ApprovalUrgency;
  routingMode: ApprovalRoutingMode;
  
  // Requester
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  
  // Reason / Justification
  title: string;
  description: string;
  justification?: string;
  
  // Approvers
  approvalSteps: ApprovalStep[];
  currentStepIndex: number;
  
  // Timeline
  requestedAt: string;
  dueDate: string;
  completedAt?: string;
  
  // Status
  status: ApprovalRequestStatus;
  
  // Comments Thread
  comments: ApprovalComment[];
  
  // Escalation - v0.13.52
  escalationEvents?: EscalationEvent[];
  escalationConfig?: EscalationConfig;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  
  // Linked Workflow (connects to existing workflow system)
  workflowInstanceId?: string;
}

/**
 * Individual step in an approval workflow
 */
export interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string;
  description?: string;
  
  // Assignment
  assignmentType: 'role' | 'user' | 'group';
  assignedRole?: ApproverRole;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedGroupId?: string;
  assignedGroupName?: string;
  
  // Step Status
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'rejected';
  
  // Execution
  startedAt?: string;
  completedAt?: string;
  
  // Decision
  decision?: 'approved' | 'rejected' | 'revision-requested';
  decisionBy?: string;
  decisionByName?: string;
  decisionComments?: string;
  
  // Signature (21 CFR Part 11)
  signatureRequired: boolean;
  signatureId?: string;
  signatureTimestamp?: string;
  
  // SLA
  dueDate?: string;
  slaHours: number;
  isOverdue: boolean;
  
  // Delegation
  delegatedTo?: string;
  delegatedToName?: string;
  delegatedAt?: string;
  delegatedReason?: string;
}

/**
 * Comment in approval thread
 */
export interface ApprovalComment {
  id: string;
  approvalRequestId: string;
  stepId?: string; // If tied to specific step
  
  // Author
  authorId: string;
  authorName: string;
  authorRole: string;
  
  // Content
  content: string;
  attachmentIds?: string[];
  
  // Type
  commentType: 'question' | 'response' | 'note' | 'revision-request' | 'resolution';
  
  // Status
  status: 'open' | 'addressed' | 'closed';
  addressedBy?: string;
  addressedAt?: string;
  
  // Threading
  parentCommentId?: string;
  replies?: ApprovalComment[];
  
  // Audit
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// APPROVER SELECTION TYPES
// ============================================================================

/**
 * Potential approver for selection UI
 */
export interface ApproverCandidate {
  id: string;
  userId: string;
  userName: string;
  email: string;
  
  // Role & Department
  role: ApproverRole;
  title: string;
  department: string;
  
  // Availability
  isAvailable: boolean;
  outOfOfficeUntil?: string;
  delegateTo?: string;
  
  // Workload
  pendingApprovals: number;
  avgApprovalTimeHours: number;
  
  // Qualifications
  qualifications: string[];
  certifications: string[];
  documentTypesApproved: string[];
  
  // History
  totalApprovalsCompleted: number;
  approvalAccuracy: number; // % of approvals not returned for revision
}

/**
 * Group of approvers (e.g., QA Team, Regulatory Affairs)
 */
export interface ApproverGroup {
  id: string;
  name: string;
  description: string;
  
  // Members
  memberIds: string[];
  memberCount: number;
  
  // Routing
  defaultRoutingMode: ApprovalRoutingMode;
  quorumSize?: number; // For quorum routing
  
  // Workload
  activePendingApprovals: number;
  
  // Department
  departmentId: string;
  departmentName: string;
}

// ============================================================================
// APPROVAL TEMPLATE TYPES
// ============================================================================

/**
 * Pre-configured approval workflow template
 */
export interface ApprovalTemplate {
  id: string;
  templateId: string; // Business identifier
  name: string;
  description: string;
  
  // Applicability
  approvalType: ApprovalType;
  applicableDocumentTypes: string[];
  applicableCategories: string[];
  
  // Steps Configuration
  steps: ApprovalTemplateStep[];
  routingMode: ApprovalRoutingMode;
  
  // SLA
  defaultSlaHours: number;
  escalationEnabled: boolean;
  escalationAfterHours: number;
  
  // Signature Requirements
  requiresElectronicSignature: boolean;
  signatureMeaning?: string; // 21 CFR Part 11
  
  // Settings
  allowDelegation: boolean;
  allowSkip: boolean;
  notifyOnCompletion: string[]; // User IDs to notify
  
  // Audit
  isActive: boolean;
  version: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Step definition within a template
 */
export interface ApprovalTemplateStep {
  id: string;
  stepNumber: number;
  name: string;
  description?: string;
  
  // Default Assignment
  defaultAssignmentType: 'role' | 'user' | 'group';
  defaultRole?: ApproverRole;
  defaultUserId?: string;
  defaultGroupId?: string;
  
  // Override Options
  allowAssignmentOverride: boolean;
  allowedRoles?: ApproverRole[];
  
  // Requirements
  isRequired: boolean;
  signatureRequired: boolean;
  
  // SLA
  slaHours: number;
}

// ============================================================================
// APPROVAL ANALYTICS
// ============================================================================

/**
 * Analytics for approval workflows
 */
export interface ApprovalAnalytics {
  // Volume
  totalRequestsThisMonth: number;
  totalRequestsThisQuarter: number;
  
  // Status Breakdown
  pending: number;
  inProgress: number;
  approved: number;
  rejected: number;
  revisionNeeded: number;
  
  // Performance
  avgApprovalTimeHours: number;
  avgTimeToFirstResponseHours: number;
  onTimeCompletionRate: number;
  
  // By Type
  byApprovalType: Record<ApprovalType, number>;
  
  // Bottlenecks
  longestPendingRequests: ApprovalRequest[];
  mostCommonDelayReasons: { reason: string; count: number }[];
  
  // Trends
  weeklyVolume: { week: string; count: number }[];
  monthlyCompletionRate: { month: string; rate: number }[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * State for approval request panel
 */
export interface ApprovalRequestPanelState {
  // Form State
  approvalType: ApprovalType | null;
  urgency: ApprovalUrgency;
  routingMode: ApprovalRoutingMode;
  title: string;
  description: string;
  justification: string;
  dueDate: string;
  
  // Approver Selection
  selectedApprovers: SelectedApprover[];
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  
  // Submission
  isSubmitting: boolean;
  submitError: string | null;
}

/**
 * Selected approver for the request
 */
export interface SelectedApprover {
  stepNumber: number;
  assignmentType: 'role' | 'user' | 'group';
  role?: ApproverRole;
  userId?: string;
  userName?: string;
  groupId?: string;
  groupName?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Approval type metadata for UI
 */
export interface ApprovalTypeInfo {
  type: ApprovalType;
  label: string;
  description: string;
  icon: string;
  defaultSlaHours: number;
  requiresSignature: boolean;
  suggestedApproverRoles: ApproverRole[];
}

/**
 * Mapping of approval types to metadata
 */
export const APPROVAL_TYPE_INFO: Record<ApprovalType, ApprovalTypeInfo> = {
  'editorial-review': {
    type: 'editorial-review',
    label: 'Editorial Review',
    description: 'Review for formatting, grammar, and style consistency',
    icon: 'Edit',
    defaultSlaHours: 24,
    requiresSignature: false,
    suggestedApproverRoles: ['document-owner', 'quality-reviewer'],
  },
  'technical-review': {
    type: 'technical-review',
    label: 'Technical Review',
    description: 'Review for technical accuracy and completeness',
    icon: 'Settings',
    defaultSlaHours: 48,
    requiresSignature: false,
    suggestedApproverRoles: ['subject-matter-expert', 'department-head'],
  },
  'medical-review': {
    type: 'medical-review',
    label: 'Medical Review',
    description: 'Review by medical/scientific staff for accuracy',
    icon: 'Stethoscope',
    defaultSlaHours: 72,
    requiresSignature: true,
    suggestedApproverRoles: ['medical-director', 'subject-matter-expert'],
  },
  'regulatory-review': {
    type: 'regulatory-review',
    label: 'Regulatory Review',
    description: 'Review for regulatory compliance and submission readiness',
    icon: 'Shield',
    defaultSlaHours: 48,
    requiresSignature: true,
    suggestedApproverRoles: ['regulatory-lead', 'compliance-officer'],
  },
  'qa-review': {
    type: 'qa-review',
    label: 'QA Review',
    description: 'Quality assurance review per SOPs',
    icon: 'CheckSquare',
    defaultSlaHours: 48,
    requiresSignature: true,
    suggestedApproverRoles: ['qa-manager', 'quality-reviewer'],
  },
  'legal-review': {
    type: 'legal-review',
    label: 'Legal Review',
    description: 'Review for legal compliance and risk',
    icon: 'Scale',
    defaultSlaHours: 72,
    requiresSignature: true,
    suggestedApproverRoles: ['legal-counsel'],
  },
  'executive-sign-off': {
    type: 'executive-sign-off',
    label: 'Executive Sign-off',
    description: 'Final approval from executive leadership',
    icon: 'Award',
    defaultSlaHours: 48,
    requiresSignature: true,
    suggestedApproverRoles: ['executive-sponsor', 'department-head'],
  },
  'release-approval': {
    type: 'release-approval',
    label: 'Release Approval',
    description: 'Final approval for document release or publishing',
    icon: 'Send',
    defaultSlaHours: 24,
    requiresSignature: true,
    suggestedApproverRoles: ['document-owner', 'regulatory-lead', 'qa-manager'],
  },
};

/**
 * Document type metadata for UI - v0.13.57
 */
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  description: string;
  icon: string;
}

export const DOCUMENT_TYPE_INFO: Record<DocumentType, DocumentTypeInfo> = {
  'protocol': {
    type: 'protocol',
    label: 'Protocol',
    description: 'Clinical protocols and amendments',
    icon: 'FileText',
  },
  'csr': {
    type: 'csr',
    label: 'Clinical Study Report',
    description: 'Clinical study reports and summaries',
    icon: 'ClipboardList',
  },
  'ib': {
    type: 'ib',
    label: "Investigator's Brochure",
    description: "Investigator's Brochure documents",
    icon: 'BookOpen',
  },
  'cmc': {
    type: 'cmc',
    label: 'CMC',
    description: 'Chemistry, Manufacturing, and Controls documents',
    icon: 'Beaker',
  },
  'safety': {
    type: 'safety',
    label: 'Safety',
    description: 'Safety reports (DSUR, SUSAR, etc.)',
    icon: 'ShieldAlert',
  },
  'regulatory': {
    type: 'regulatory',
    label: 'Regulatory',
    description: 'Regulatory submissions (IND, NDA, BLA)',
    icon: 'Building',
  },
  'sop': {
    type: 'sop',
    label: 'SOP',
    description: 'Standard Operating Procedures',
    icon: 'ListChecks',
  },
  'labeling': {
    type: 'labeling',
    label: 'Labeling',
    description: 'Labels and prescribing information',
    icon: 'Tag',
  },
  'other': {
    type: 'other',
    label: 'Other',
    description: 'Other document types',
    icon: 'File',
  },
};

/**
 * Approver role metadata for UI
 */
export interface ApproverRoleInfo {
  role: ApproverRole;
  label: string;
  description: string;
}

export const APPROVER_ROLE_INFO: Record<ApproverRole, ApproverRoleInfo> = {
  'document-owner': {
    role: 'document-owner',
    label: 'Document Owner',
    description: 'Primary owner responsible for the document',
  },
  'department-head': {
    role: 'department-head',
    label: 'Department Head',
    description: 'Head of the relevant department',
  },
  'medical-director': {
    role: 'medical-director',
    label: 'Medical Director',
    description: 'Medical/scientific leadership',
  },
  'regulatory-lead': {
    role: 'regulatory-lead',
    label: 'Regulatory Lead',
    description: 'Regulatory affairs leadership',
  },
  'qa-manager': {
    role: 'qa-manager',
    label: 'QA Manager',
    description: 'Quality assurance management',
  },
  'legal-counsel': {
    role: 'legal-counsel',
    label: 'Legal Counsel',
    description: 'Legal department representative',
  },
  'executive-sponsor': {
    role: 'executive-sponsor',
    label: 'Executive Sponsor',
    description: 'Executive leadership sponsor',
  },
  'subject-matter-expert': {
    role: 'subject-matter-expert',
    label: 'Subject Matter Expert',
    description: 'Expert in the relevant domain',
  },
  'quality-reviewer': {
    role: 'quality-reviewer',
    label: 'Quality Reviewer',
    description: 'Quality review specialist',
  },
  'compliance-officer': {
    role: 'compliance-officer',
    label: 'Compliance Officer',
    description: 'Compliance and regulatory specialist',
  },
};

/**
 * Get default SLA hours based on urgency
 */
export function getSlaMultiplier(urgency: ApprovalUrgency): number {
  switch (urgency) {
    case 'critical': return 0.25;
    case 'urgent': return 0.5;
    case 'expedited': return 0.75;
    case 'standard': return 1;
    default: return 1;
  }
}

/**
 * Calculate due date based on approval type and urgency
 */
export function calculateDueDate(
  approvalType: ApprovalType,
  urgency: ApprovalUrgency,
  startDate: Date = new Date()
): Date {
  const typeInfo = APPROVAL_TYPE_INFO[approvalType];
  const slaHours = typeInfo.defaultSlaHours * getSlaMultiplier(urgency);
  const dueDate = new Date(startDate);
  dueDate.setHours(dueDate.getHours() + slaHours);
  return dueDate;
}

// ============================================================================
// ESCALATION TYPES - v0.13.52
// ============================================================================

/**
 * Escalation tier configuration
 * Defines who gets notified and when based on overdue hours
 */
export interface EscalationTier {
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  triggerAfterHours: number;
  action: EscalationAction;
  notifyRoles: ApproverRole[];
  notifyUserIds?: string[];
  autoReassign?: boolean;
  requiresAcknowledgment?: boolean;
}

/**
 * Type of escalation action
 */
export type EscalationAction = 
  | 'reminder'           // Tier 1: Gentle reminder to assignee
  | 'notify-manager'     // Tier 2: CC direct manager
  | 'notify-vp'          // Tier 3: CC VP/department head
  | 'auto-reassign'      // Automatic reassignment
  | 'flag-critical';     // Mark as critical priority

/**
 * Escalation event in the audit trail
 */
export interface EscalationEvent {
  id: string;
  approvalRequestId: string;
  stepId: string;
  tier: 1 | 2 | 3;
  triggeredAt: string;
  triggerReason: string;
  action: EscalationAction;
  notifiedUsers: {
    userId: string;
    userName: string;
    role: string;
    notifiedAt: string;
    acknowledgedAt?: string;
  }[];
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

/**
 * Escalation configuration for an approval workflow
 */
export interface EscalationConfig {
  enabled: boolean;
  tiers: EscalationTier[];
  workingHoursOnly: boolean;
  timezone: string;
  excludeWeekends: boolean;
  excludeHolidays?: string[]; // ISO date strings
}

/**
 * Default escalation tiers
 */
export const DEFAULT_ESCALATION_TIERS: EscalationTier[] = [
  {
    tier: 1,
    name: 'Initial Reminder',
    description: 'Reminder sent to assignee',
    triggerAfterHours: 24,
    action: 'reminder',
    notifyRoles: [],
    requiresAcknowledgment: false,
  },
  {
    tier: 2,
    name: 'Manager Notification',
    description: 'Direct manager notified',
    triggerAfterHours: 48,
    action: 'notify-manager',
    notifyRoles: ['department-head'],
    requiresAcknowledgment: true,
  },
  {
    tier: 3,
    name: 'VP Escalation',
    description: 'VP/Executive notified',
    triggerAfterHours: 72,
    action: 'notify-vp',
    notifyRoles: ['executive-sponsor'],
    requiresAcknowledgment: true,
    autoReassign: false,
  },
];

/**
 * Get escalation tier based on hours overdue
 */
export function getEscalationTier(
  hoursOverdue: number, 
  config: EscalationConfig = { enabled: true, tiers: DEFAULT_ESCALATION_TIERS, workingHoursOnly: false, timezone: 'UTC', excludeWeekends: false }
): EscalationTier | null {
  if (!config.enabled || hoursOverdue <= 0) return null;
  
  // Find the highest tier that has been triggered
  const triggeredTiers = config.tiers.filter(t => hoursOverdue >= t.triggerAfterHours);
  if (triggeredTiers.length === 0) return null;
  
  return triggeredTiers.reduce((highest, current) => 
    current.tier > highest.tier ? current : highest
  );
}

/**
 * Escalation status for display in UI
 */
export interface EscalationStatus {
  isEscalated: boolean;
  currentTier: EscalationTier | null;
  hoursOverdue: number;
  nextEscalation?: {
    tier: EscalationTier;
    hoursUntil: number;
  };
  events: EscalationEvent[];
}
