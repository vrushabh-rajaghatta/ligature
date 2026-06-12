
/**
 * ICSR Workflow State Machine
 * Phase 2.1b: Defines workflow states, transitions, and validation rules
 * 
 * Workflow: Draft → Data Entry → Medical Review → QC → Ready → Submitted → Closed
 * 
 * @version 0.13.27
 */

// =============================================================================
// WORKFLOW STATES
// =============================================================================

export type ICSRWorkflowStatus = 
  | 'DRAFT'           // Initial data entry started
  | 'DATA_ENTRY'      // Full E2B data being collected
  | 'MEDICAL_REVIEW'  // Physician/medical review
  | 'QC_REVIEW'       // Quality control review
  | 'READY'           // Approved, ready for submission
  | 'SUBMITTED'       // Sent to regulatory gateway
  | 'CLOSED';         // Completed/archived

// Display names for UI
export const WORKFLOW_STATUS_LABELS: Record<ICSRWorkflowStatus, string> = {
  DRAFT: 'Draft',
  DATA_ENTRY: 'Data Entry',
  MEDICAL_REVIEW: 'Medical Review',
  QC_REVIEW: 'QC Review',
  READY: 'Ready for Submission',
  SUBMITTED: 'Submitted',
  CLOSED: 'Closed',
};

// Colors for status badges
export const WORKFLOW_STATUS_COLORS: Record<ICSRWorkflowStatus, 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red'> = {
  DRAFT: 'gray',
  DATA_ENTRY: 'blue',
  MEDICAL_REVIEW: 'purple',
  QC_REVIEW: 'amber',
  READY: 'green',
  SUBMITTED: 'green',
  CLOSED: 'gray',
};

// Icons for each status (lucide-react icon names)
export const WORKFLOW_STATUS_ICONS: Record<ICSRWorkflowStatus, string> = {
  DRAFT: 'FileEdit',
  DATA_ENTRY: 'ClipboardList',
  MEDICAL_REVIEW: 'Stethoscope',
  QC_REVIEW: 'CheckSquare',
  READY: 'CheckCircle2',
  SUBMITTED: 'Send',
  CLOSED: 'Archive',
};

// Workflow order for progress display
export const WORKFLOW_ORDER: ICSRWorkflowStatus[] = [
  'DRAFT',
  'DATA_ENTRY',
  'MEDICAL_REVIEW',
  'QC_REVIEW',
  'READY',
  'SUBMITTED',
  'CLOSED',
];

// =============================================================================
// USER ROLES
// =============================================================================

export type WorkflowRole = 
  | 'SAFETY'          // Safety scientist / data entry
  | 'MEDICAL'         // Physician / medical reviewer
  | 'QA'              // Quality assurance
  | 'SAFETY_LEAD'     // Safety lead (can override)
  | 'ADMIN';          // System admin

// =============================================================================
// WORKFLOW TRANSITIONS
// =============================================================================

export interface WorkflowTransition {
  from: ICSRWorkflowStatus;
  to: ICSRWorkflowStatus;
  action: string;           // Action name for button
  description: string;      // Description for audit log
  allowedRoles: WorkflowRole[];
  requiresComment: boolean;
  validationRequired: boolean;  // Must pass E2B validation before transition
}

// Define all allowed transitions
export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // Forward progression
  {
    from: 'DRAFT',
    to: 'DATA_ENTRY',
    action: 'Start Data Entry',
    description: 'Case moved to active data entry',
    allowedRoles: ['SAFETY', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: false,
  },
  {
    from: 'DATA_ENTRY',
    to: 'MEDICAL_REVIEW',
    action: 'Submit for Medical Review',
    description: 'Case submitted for physician review',
    allowedRoles: ['SAFETY', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: true, // Basic E2B required fields must be complete
  },
  {
    from: 'MEDICAL_REVIEW',
    to: 'QC_REVIEW',
    action: 'Approve & Send to QC',
    description: 'Medical review approved, sent to QC',
    allowedRoles: ['MEDICAL', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: false,
  },
  {
    from: 'QC_REVIEW',
    to: 'READY',
    action: 'QC Approved',
    description: 'QC review passed, case ready for submission',
    allowedRoles: ['QA', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: true, // Full E2B validation required
  },
  {
    from: 'READY',
    to: 'SUBMITTED',
    action: 'Submit to Gateway',
    description: 'Case submitted to regulatory gateway',
    allowedRoles: ['SAFETY', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: true,
  },
  {
    from: 'SUBMITTED',
    to: 'CLOSED',
    action: 'Close Case',
    description: 'Case closed after successful submission',
    allowedRoles: ['SAFETY', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: false,
    validationRequired: false,
  },
  
  // Rejection/return transitions
  {
    from: 'MEDICAL_REVIEW',
    to: 'DATA_ENTRY',
    action: 'Return for Corrections',
    description: 'Medical reviewer requested corrections',
    allowedRoles: ['MEDICAL', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: true,
    validationRequired: false,
  },
  {
    from: 'QC_REVIEW',
    to: 'DATA_ENTRY',
    action: 'Return for Corrections',
    description: 'QC reviewer requested corrections',
    allowedRoles: ['QA', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: true,
    validationRequired: false,
  },
  {
    from: 'QC_REVIEW',
    to: 'MEDICAL_REVIEW',
    action: 'Return to Medical Review',
    description: 'QC returned case for additional medical review',
    allowedRoles: ['QA', 'SAFETY_LEAD', 'ADMIN'],
    requiresComment: true,
    validationRequired: false,
  },
  
  // Admin overrides
  {
    from: 'READY',
    to: 'DATA_ENTRY',
    action: 'Reopen for Editing',
    description: 'Case reopened for additional edits',
    allowedRoles: ['SAFETY_LEAD', 'ADMIN'],
    requiresComment: true,
    validationRequired: false,
  },
];

// =============================================================================
// WORKFLOW HELPERS
// =============================================================================

/**
 * Get available transitions for a given status and user role
 */
export function getAvailableTransitions(
  currentStatus: ICSRWorkflowStatus,
  userRole: WorkflowRole
): WorkflowTransition[] {
  return WORKFLOW_TRANSITIONS.filter(
    t => t.from === currentStatus && t.allowedRoles.includes(userRole)
  );
}

/**
 * Check if a specific transition is allowed
 */
export function canTransition(
  from: ICSRWorkflowStatus,
  to: ICSRWorkflowStatus,
  userRole: WorkflowRole
): boolean {
  return WORKFLOW_TRANSITIONS.some(
    t => t.from === from && t.to === to && t.allowedRoles.includes(userRole)
  );
}

/**
 * Get the transition definition
 */
export function getTransition(
  from: ICSRWorkflowStatus,
  to: ICSRWorkflowStatus
): WorkflowTransition | undefined {
  return WORKFLOW_TRANSITIONS.find(t => t.from === from && t.to === to);
}

/**
 * Get workflow progress (0-100)
 */
export function getWorkflowProgress(status: ICSRWorkflowStatus): number {
  const index = WORKFLOW_ORDER.indexOf(status);
  if (index === -1) return 0;
  return Math.round((index / (WORKFLOW_ORDER.length - 1)) * 100);
}

/**
 * Check if status is terminal (no forward transitions)
 */
export function isTerminalStatus(status: ICSRWorkflowStatus): boolean {
  return status === 'CLOSED';
}

/**
 * Check if case can be edited (not submitted/closed)
 */
export function isEditable(status: ICSRWorkflowStatus): boolean {
  return !['SUBMITTED', 'CLOSED'].includes(status);
}

/**
 * Get next logical status in workflow
 */
export function getNextStatus(current: ICSRWorkflowStatus): ICSRWorkflowStatus | null {
  const index = WORKFLOW_ORDER.indexOf(current);
  if (index === -1 || index >= WORKFLOW_ORDER.length - 1) return null;
  return WORKFLOW_ORDER[index + 1];
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

export interface ValidationRule {
  field: string;
  label: string;
  required: boolean;
  requiredForStatus: ICSRWorkflowStatus[];  // Status where this field is required
}

// Fields required at each workflow stage
export const WORKFLOW_VALIDATION_RULES: ValidationRule[] = [
  // Required for DATA_ENTRY → MEDICAL_REVIEW
  { field: 'patientInitials', label: 'Patient Initials', required: true, requiredForStatus: ['MEDICAL_REVIEW'] },
  { field: 'patientSex', label: 'Patient Sex', required: true, requiredForStatus: ['MEDICAL_REVIEW'] },
  { field: 'eventDescription', label: 'Event Description', required: true, requiredForStatus: ['MEDICAL_REVIEW'] },
  { field: 'onsetDate', label: 'Onset Date', required: true, requiredForStatus: ['MEDICAL_REVIEW'] },
  { field: 'reporterType', label: 'Reporter Type', required: true, requiredForStatus: ['MEDICAL_REVIEW'] },
  
  // Additional required for QC_REVIEW → READY
  { field: 'seriousness', label: 'Seriousness Assessment', required: true, requiredForStatus: ['READY'] },
  { field: 'productId', label: 'Suspect Product', required: true, requiredForStatus: ['READY'] },
  { field: 'narrativeSummary', label: 'Case Narrative', required: true, requiredForStatus: ['READY'] },
  { field: 'reporterCountry', label: 'Reporter Country', required: true, requiredForStatus: ['READY'] },
];

/**
 * Validate case data for a given target status
 * Returns list of missing required fields
 */
export function validateForStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  caseData: Record<string, any>,
  targetStatus: ICSRWorkflowStatus
): string[] {
  const missingFields: string[] = [];
  
  for (const rule of WORKFLOW_VALIDATION_RULES) {
    if (rule.requiredForStatus.includes(targetStatus)) {
      const value = caseData[rule.field];
      if (value === null || value === undefined || value === '') {
        missingFields.push(rule.label);
      }
    }
  }
  
  return missingFields;
}

// =============================================================================
// WORKFLOW HISTORY
// =============================================================================

export interface WorkflowHistoryEntry {
  id: string;
  caseId: string;
  fromStatus: ICSRWorkflowStatus;
  toStatus: ICSRWorkflowStatus;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: WorkflowRole;
  comment?: string;
  timestamp: string;
}

/**
 * Create a workflow history entry
 */
export function createHistoryEntry(
  caseId: string,
  fromStatus: ICSRWorkflowStatus,
  toStatus: ICSRWorkflowStatus,
  userId: string,
  userName: string,
  userRole: WorkflowRole,
  comment?: string
): WorkflowHistoryEntry {
  const transition = getTransition(fromStatus, toStatus);
  
  return {
    id: `wfh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    caseId,
    fromStatus,
    toStatus,
    action: transition?.action || `${fromStatus} → ${toStatus}`,
    performedBy: userId,
    performedByName: userName,
    performedByRole: userRole,
    comment,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// MAP LEGACY STATUSES
// =============================================================================

/**
 * Map old status values to new workflow statuses
 */
export function mapLegacyStatus(status: string): ICSRWorkflowStatus {
  const mapping: Record<string, ICSRWorkflowStatus> = {
    'INITIAL': 'DRAFT',
    'IN_PROGRESS': 'DATA_ENTRY',
    'initial': 'DRAFT',
    'in-progress': 'DATA_ENTRY',
    'submitted': 'SUBMITTED',
    'closed': 'CLOSED',
  };
  
  return mapping[status] || (status as ICSRWorkflowStatus);
}

/**
 * Map workflow status to API status string
 */
export function toApiStatus(status: ICSRWorkflowStatus): string {
  return status.toLowerCase().replace('_', '-');
}

/**
 * Map API status string to workflow status
 */
export function fromApiStatus(apiStatus: string): ICSRWorkflowStatus {
  const mapping: Record<string, ICSRWorkflowStatus> = {
    'draft': 'DRAFT',
    'data-entry': 'DATA_ENTRY',
    'medical-review': 'MEDICAL_REVIEW',
    'qc-review': 'QC_REVIEW',
    'ready': 'READY',
    'submitted': 'SUBMITTED',
    'closed': 'CLOSED',
    // Legacy
    'initial': 'DRAFT',
    'in-progress': 'DATA_ENTRY',
  };
  
  return mapping[apiStatus] || 'DRAFT';
}
