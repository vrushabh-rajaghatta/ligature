
// =============================================================================
// SUBMISSION LIFECYCLE TYPES
// =============================================================================
// Types for tracking submission state through the entire publishing workflow
// from draft creation through regulatory acknowledgment and final archival.
// =============================================================================

// ============================================================================
// Lifecycle States
// ============================================================================

/**
 * Primary submission lifecycle states
 * 
 * Flow: draft → compiled → submitted → acknowledged → archived
 * 
 * Each state has specific rules:
 * - draft: Editable, can add/remove documents
 * - compiled: Package generated, read-only documents, can recompile
 * - submitted: Sent to gateway, awaiting ACK
 * - acknowledged: Final ACK received (ACK3), can archive
 * - archived: Permanent read-only, certificate generated
 */
export type SubmissionLifecycleState = 
  | 'draft'
  | 'compiled'
  | 'submitted'
  | 'acknowledged'
  | 'archived';

/**
 * Sub-states for more granular tracking
 */
export type SubmissionSubState = 
  // Draft sub-states
  | 'draft_new'
  | 'draft_in_progress'
  | 'draft_ready_to_compile'
  // Compiled sub-states
  | 'compiled_pending_validation'
  | 'compiled_validated'
  | 'compiled_validation_failed'
  | 'compiled_ready_to_submit'
  // Submitted sub-states
  | 'submitted_awaiting_ta1'
  | 'submitted_ta1_received'
  | 'submitted_awaiting_ta2'
  | 'submitted_ta2_received'
  | 'submitted_awaiting_ack1'
  | 'submitted_ack1_received'
  | 'submitted_awaiting_ack2'
  | 'submitted_ack2_received'
  | 'submitted_awaiting_ack3'
  | 'submitted_failed'
  | 'submitted_rejected'
  // Acknowledged sub-states
  | 'acknowledged_pending_review'
  | 'acknowledged_reviewed'
  | 'acknowledged_ready_to_archive'
  // Archived sub-states
  | 'archived_certificate_generated'
  | 'archived_final';

// ============================================================================
// State Transitions
// ============================================================================

/**
 * Valid state transitions
 */
export interface StateTransition {
  from: SubmissionLifecycleState;
  to: SubmissionLifecycleState;
  action: TransitionAction;
  requiresConfirmation: boolean;
  requiresPermission?: string;
}

export type TransitionAction = 
  | 'compile'
  | 'recompile'
  | 'submit'
  | 'receive_ack'
  | 'archive'
  | 'revert_to_draft'
  | 'cancel_submission';

/**
 * Valid transitions matrix
 */
export const VALID_TRANSITIONS: StateTransition[] = [
  // From draft
  { from: 'draft', to: 'compiled', action: 'compile', requiresConfirmation: false },
  
  // From compiled
  { from: 'compiled', to: 'draft', action: 'revert_to_draft', requiresConfirmation: true },
  { from: 'compiled', to: 'compiled', action: 'recompile', requiresConfirmation: false },
  { from: 'compiled', to: 'submitted', action: 'submit', requiresConfirmation: true, requiresPermission: 'submissions:submit' },
  
  // From submitted
  { from: 'submitted', to: 'compiled', action: 'cancel_submission', requiresConfirmation: true, requiresPermission: 'submissions:cancel' },
  { from: 'submitted', to: 'acknowledged', action: 'receive_ack', requiresConfirmation: false },
  
  // From acknowledged
  { from: 'acknowledged', to: 'archived', action: 'archive', requiresConfirmation: true, requiresPermission: 'submissions:archive' },
];

// ============================================================================
// Lifecycle Events
// ============================================================================

/**
 * Event recorded for each state change
 */
export interface LifecycleEvent {
  id: string;
  submissionId: string;
  sequenceNumber: string;
  timestamp: Date;
  eventType: LifecycleEventType;
  fromState: SubmissionLifecycleState;
  toState: SubmissionLifecycleState;
  fromSubState?: SubmissionSubState;
  toSubState?: SubmissionSubState;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  details?: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export type LifecycleEventType = 
  | 'state_change'
  | 'compilation_started'
  | 'compilation_completed'
  | 'compilation_failed'
  | 'validation_started'
  | 'validation_completed'
  | 'validation_failed'
  | 'submission_initiated'
  | 'gateway_response'
  | 'ack_received'
  | 'archive_initiated'
  | 'archive_completed'
  | 'certificate_generated';

// ============================================================================
// Archive Certificate
// ============================================================================

/**
 * Certificate generated when submission is archived
 */
export interface ArchiveCertificate {
  id: string;
  certificateNumber: string;
  submissionId: string;
  sequenceNumber: string;
  
  // Submission details
  applicationNumber: string;
  applicationType: string;
  submissionType: string;
  region: string;
  
  // Timing
  compiledAt: Date;
  submittedAt: Date;
  acknowledgedAt: Date;
  archivedAt: Date;
  
  // Archive details
  archiveLocation: string;
  archiveChecksum: string;
  archiveSize: number;
  
  // Package details
  packageChecksum: string;
  documentCount: number;
  totalPages: number;
  
  // Acknowledgment chain
  acknowledgments: AcknowledgmentRecord[];
  
  // Filing record
  filingRecord?: FilingRecord;
  
  // Certificate metadata
  generatedBy: {
    id: string;
    name: string;
  };
  signedAt?: Date;
  signatureHash?: string;
  
  // Verification
  verificationUrl?: string;
  qrCode?: string;
}

/**
 * Record of each acknowledgment in the chain
 */
export interface AcknowledgmentRecord {
  type: 'TA1' | 'TA2' | 'ACK1' | 'ACK2' | 'ACK3';
  receivedAt: Date;
  status: 'success' | 'warning' | 'error';
  gatewayId: string;
  messageId?: string;
  details?: Record<string, unknown>;
}

/**
 * Link to official filing record
 */
export interface FilingRecord {
  recordNumber: string;
  recordDate: Date;
  agency: string;
  filingType: string;
  receiptNumber?: string;
  trackingUrl?: string;
  notes?: string;
}

// ============================================================================
// Archive Request/Response
// ============================================================================

export interface ArchiveRequest {
  submissionId: string;
  sequenceNumber: string;
  reason?: string;
  filingRecord?: FilingRecord;
  verifyChecksums?: boolean;
  generateCertificate?: boolean;
}

export interface ArchiveResult {
  success: boolean;
  submissionId: string;
  sequenceNumber: string;
  archivedAt?: Date;
  archiveLocation?: string;
  certificate?: ArchiveCertificate;
  errors?: ArchiveError[];
  warnings?: ArchiveWarning[];
}

export interface ArchiveError {
  code: string;
  message: string;
  field?: string;
}

export interface ArchiveWarning {
  code: string;
  message: string;
  field?: string;
}

// ============================================================================
// Submission Lifecycle Record
// ============================================================================

/**
 * Full lifecycle tracking for a submission sequence
 */
export interface SubmissionLifecycleRecord {
  submissionId: string;
  sequenceNumber: string;
  applicationNumber: string;
  
  // Current state
  currentState: SubmissionLifecycleState;
  currentSubState?: SubmissionSubState;
  
  // State timestamps
  createdAt: Date;
  lastModifiedAt: Date;
  compiledAt?: Date;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  archivedAt?: Date;
  
  // Package info
  packageId?: string;
  packageChecksum?: string;
  packageSize?: number;
  documentCount?: number;
  
  // Gateway info
  gatewayId?: string;
  transmissionId?: string;
  
  // Acknowledgments
  acknowledgments: AcknowledgmentRecord[];
  
  // Archive info
  isArchived: boolean;
  isReadOnly: boolean;
  archiveLocation?: string;
  certificate?: ArchiveCertificate;
  
  // Event history
  events: LifecycleEvent[];
}

// ============================================================================
// Permissions & Access Control
// ============================================================================

export interface LifecyclePermissions {
  canEdit: boolean;
  canCompile: boolean;
  canSubmit: boolean;
  canCancel: boolean;
  canArchive: boolean;
  canViewCertificate: boolean;
  canExportCertificate: boolean;
  reason?: string;
}

/**
 * Get permissions based on current state and user role
 */
export function getLifecyclePermissions(
  state: SubmissionLifecycleState,
  userRole: string,
): LifecyclePermissions {
  const isAdmin = userRole === 'admin' || userRole === 'regulatory_head';
  const isSubmitter = userRole === 'submitter' || userRole === 'regulatory_affairs' || isAdmin;
  const isArchiver = userRole === 'archiver' || userRole === 'compliance' || isAdmin;
  
  switch (state) {
    case 'draft':
      return {
        canEdit: true,
        canCompile: isSubmitter,
        canSubmit: false,
        canCancel: false,
        canArchive: false,
        canViewCertificate: false,
        canExportCertificate: false,
      };
      
    case 'compiled':
      return {
        canEdit: false,
        canCompile: isSubmitter, // Can recompile
        canSubmit: isSubmitter,
        canCancel: false,
        canArchive: false,
        canViewCertificate: false,
        canExportCertificate: false,
        reason: 'Package compiled - documents are read-only',
      };
      
    case 'submitted':
      return {
        canEdit: false,
        canCompile: false,
        canSubmit: false,
        canCancel: isAdmin,
        canArchive: false,
        canViewCertificate: false,
        canExportCertificate: false,
        reason: 'Submission in progress - awaiting acknowledgment',
      };
      
    case 'acknowledged':
      return {
        canEdit: false,
        canCompile: false,
        canSubmit: false,
        canCancel: false,
        canArchive: isArchiver,
        canViewCertificate: false,
        canExportCertificate: false,
        reason: 'Submission acknowledged - ready to archive',
      };
      
    case 'archived':
      return {
        canEdit: false,
        canCompile: false,
        canSubmit: false,
        canCancel: false,
        canArchive: false,
        canViewCertificate: true,
        canExportCertificate: true,
        reason: 'Submission archived - permanent read-only',
      };
      
    default:
      return {
        canEdit: false,
        canCompile: false,
        canSubmit: false,
        canCancel: false,
        canArchive: false,
        canViewCertificate: false,
        canExportCertificate: false,
      };
  }
}

// ============================================================================
// State Utilities
// ============================================================================

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: SubmissionLifecycleState,
  to: SubmissionLifecycleState,
): boolean {
  return VALID_TRANSITIONS.some(t => t.from === from && t.to === to);
}

/**
 * Get available transitions from current state
 */
export function getAvailableTransitions(
  from: SubmissionLifecycleState,
): StateTransition[] {
  return VALID_TRANSITIONS.filter(t => t.from === from);
}

/**
 * Check if submission is editable
 */
export function isEditable(state: SubmissionLifecycleState): boolean {
  return state === 'draft';
}

/**
 * Check if submission is read-only
 */
export function isReadOnly(state: SubmissionLifecycleState): boolean {
  return state !== 'draft';
}

/**
 * Check if submission can be archived
 */
export function canArchive(state: SubmissionLifecycleState): boolean {
  return state === 'acknowledged';
}

/**
 * Get state display info
 */
export function getStateInfo(state: SubmissionLifecycleState): {
  label: string;
  description: string;
  color: 'gray' | 'blue' | 'yellow' | 'green' | 'purple';
  icon: string;
} {
  switch (state) {
    case 'draft':
      return {
        label: 'Draft',
        description: 'In progress - documents can be added or modified',
        color: 'gray',
        icon: 'edit',
      };
    case 'compiled':
      return {
        label: 'Compiled',
        description: 'Package generated - ready for submission',
        color: 'blue',
        icon: 'package',
      };
    case 'submitted':
      return {
        label: 'Submitted',
        description: 'Sent to gateway - awaiting acknowledgment',
        color: 'yellow',
        icon: 'send',
      };
    case 'acknowledged':
      return {
        label: 'Acknowledged',
        description: 'Final ACK received - ready to archive',
        color: 'green',
        icon: 'check-circle',
      };
    case 'archived':
      return {
        label: 'Archived',
        description: 'Permanent record - certificate available',
        color: 'purple',
        icon: 'archive',
      };
    default:
      return {
        label: 'Unknown',
        description: 'Unknown state',
        color: 'gray',
        icon: 'help-circle',
      };
  }
}

// ============================================================================
// Certificate Utilities
// ============================================================================

/**
 * Generate certificate number
 */
export function generateCertificateNumber(
  applicationNumber: string,
  sequenceNumber: string,
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Format: CERT-{APP}-{SEQ}-{YYYYMMDD}-{RANDOM}
  const cleanApp = applicationNumber.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
  const cleanSeq = sequenceNumber.padStart(4, '0');
  
  return `CERT-${cleanApp}-${cleanSeq}-${year}${month}${day}-${random}`;
}

/**
 * Format certificate for display
 */
export function formatCertificateForDisplay(cert: ArchiveCertificate): string {
  return `
Archive Certificate
====================
Certificate #: ${cert.certificateNumber}
Application: ${cert.applicationNumber}
Sequence: ${cert.sequenceNumber}
Type: ${cert.applicationType} - ${cert.submissionType}
Region: ${cert.region}

Timeline
--------
Compiled: ${cert.compiledAt.toISOString()}
Submitted: ${cert.submittedAt.toISOString()}
Acknowledged: ${cert.acknowledgedAt.toISOString()}
Archived: ${cert.archivedAt.toISOString()}

Package Details
---------------
Checksum: ${cert.packageChecksum}
Documents: ${cert.documentCount}
Pages: ${cert.totalPages}
Size: ${(cert.archiveSize / 1024 / 1024).toFixed(2)} MB

Archive Location
----------------
${cert.archiveLocation}
Archive Checksum: ${cert.archiveChecksum}

Acknowledgment Chain
--------------------
${cert.acknowledgments.map(a => `${a.type}: ${a.status} at ${a.receivedAt.toISOString()}`).join('\n')}

${cert.filingRecord ? `
Filing Record
-------------
Record #: ${cert.filingRecord.recordNumber}
Date: ${cert.filingRecord.recordDate.toISOString()}
Agency: ${cert.filingRecord.agency}
${cert.filingRecord.receiptNumber ? `Receipt: ${cert.filingRecord.receiptNumber}` : ''}
${cert.filingRecord.trackingUrl ? `URL: ${cert.filingRecord.trackingUrl}` : ''}
` : ''}

Generated by: ${cert.generatedBy.name}
${cert.signedAt ? `Signed: ${cert.signedAt.toISOString()}` : ''}
${cert.verificationUrl ? `Verify: ${cert.verificationUrl}` : ''}
`.trim();
}

// ============================================================================
// Default Exports
// ============================================================================

export default {
  VALID_TRANSITIONS,
  getLifecyclePermissions,
  isValidTransition,
  getAvailableTransitions,
  isEditable,
  isReadOnly,
  canArchive,
  getStateInfo,
  generateCertificateNumber,
  formatCertificateForDisplay,
};
