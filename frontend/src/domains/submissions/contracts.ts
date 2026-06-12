
/**
 * Submissions Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for eCTD and regulatory submission types in Ligature.
 * 
 * This module handles:
 * - eCTD structure (applications, sequences, modules, sections, documents)
 * - Submission lifecycle (draft → compiled → submitted → acknowledged → archived)
 * - Sequence building and validation
 * - Gateway submission and acknowledgments
 * 
 * @module domains/submissions/contracts
 * @version 0.27.21
 */

// =============================================================================
// eCTD VERSION & REGIONAL
// =============================================================================

export type ECTDVersion = '3.2.2' | '4.0';

export type RegionalVariant = 'us' | 'eu' | 'jp' | 'ca' | 'cn' | 'kr' | 'au' | 'br' | 'ich';

export type GatewayRegion = 'us-fda' | 'eu-ema' | 'jp-pmda' | 'ca-hc' | 'cn-nmpa' | 'kr-mfds';

// =============================================================================
// APPLICATION TYPES
// =============================================================================

export type ApplicationType = 
  | 'NDA' | 'BLA' | 'ANDA' | 'IND' | 'sNDA' | 'sBLA' | 'MAA' | 'JNDA'
  | 'PMA' | '510k' | 'De-Novo';

export type SubmissionType = 
  | 'original' | 'amendment' | 'supplement' | 'annual-report'
  | 'correspondence' | 'ir-response' | 'crl-response' | 'rems'
  | 'labeling-change' | 'cbala' | 'premarket-notification'
  | 'type-ia' | 'type-ib' | 'type-ii' | 'renewal' | 'psur' | 'rmp-update';

export type SubmissionSubType = 
  | 'efficacy' | 'safety' | 'manufacturing' | 'labeling'
  | 'cmc-supplement' | 'ind-safety-report' | 'ind-amendment'
  | 'nonclinical' | 'clinical' | 'general' | 'orphan';

// =============================================================================
// SEQUENCE STATUS
// =============================================================================

export type SequenceStatus = 
  | 'draft' | 'validated' | 'submitted' | 'acknowledged' | 'under-review' | 'approved';

export type SequenceBuildStatus = 
  | 'draft' | 'building' | 'validating' | 'ready-for-review'
  | 'in-review' | 'approved' | 'publishing' | 'submitted' | 'error';

// =============================================================================
// LIFECYCLE STATES
// =============================================================================

/**
 * Primary submission lifecycle states
 * Flow: draft → compiled → submitted → acknowledged → archived
 */
export type SubmissionLifecycleState = 
  | 'draft'        // Editable, can add/remove documents
  | 'compiled'     // Package generated, read-only, can recompile
  | 'submitted'    // Sent to gateway, awaiting ACK
  | 'acknowledged' // Final ACK received (ACK3), can archive
  | 'archived';    // Permanent read-only, certificate generated

export type SubmissionSubState = 
  // Draft
  | 'draft_new' | 'draft_in_progress' | 'draft_ready_to_compile'
  // Compiled
  | 'compiled_pending_validation' | 'compiled_validated' 
  | 'compiled_validation_failed' | 'compiled_ready_to_submit'
  // Submitted
  | 'submitted_awaiting_ack1' | 'submitted_ack1_received'
  | 'submitted_awaiting_ack2' | 'submitted_ack2_received'
  | 'submitted_awaiting_ack3' | 'submitted_failed' | 'submitted_rejected'
  // Acknowledged
  | 'acknowledged_pending_review' | 'acknowledged_reviewed' | 'acknowledged_ready_to_archive'
  // Archived
  | 'archived_certificate_generated' | 'archived_final';

export type TransitionAction = 
  | 'compile' | 'recompile' | 'submit' | 'receive_ack' 
  | 'archive' | 'revert_to_draft' | 'cancel_submission';

// =============================================================================
// DOCUMENT OPERATIONS
// =============================================================================

export type DocumentOperation = 'new' | 'replace' | 'append' | 'delete';

export type LeafStatus = 'pending' | 'assigned' | 'validated' | 'approved' | 'error';

export type ValidationLevel = 'error' | 'warning' | 'info';

export type ChecksumAlgorithm = 'md5' | 'sha256' | 'sha1';

export type PublishingChannel = 'esg' | 'etd' | 'portal' | 'email' | 'physical';

// =============================================================================
// BUILD PHASES
// =============================================================================

export type BuildPhase = 
  | 'planning' | 'document-assignment' | 'validation'
  | 'backbone-generation' | 'packaging' | 'review' | 'complete';

export type LifecycleEventType = 
  | 'state_change' | 'compilation_started' | 'compilation_completed' | 'compilation_failed'
  | 'validation_started' | 'validation_completed' | 'validation_failed'
  | 'submission_initiated' | 'gateway_response' | 'ack_received'
  | 'archive_initiated' | 'archive_completed';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * eCTD Application
 */
export interface ECTDApplication {
  id: string;
  type: ApplicationType;
  number: string;
  sponsor: string;
  productName: string;
  substanceName: string;
  indication: string;
  ectdVersion: ECTDVersion;
  region?: RegionalVariant;
  agency?: string;
  status?: string;
}

/**
 * eCTD Sequence
 */
export interface ECTDSequence {
  sequenceNumber: string;
  submissionType: SubmissionType;
  submissionDate: string;
  description: string;
  status: SequenceStatus;
  documentCount: number;
}

/**
 * eCTD Document
 */
export interface ECTDDocument {
  id: string;
  title: string;
  filePath: string;
  operation: DocumentOperation;
  checksum: string;
  checksumType: ChecksumAlgorithm;
  module: string;
  section?: string;
  fileType: 'pdf' | 'xml' | 'xpt' | 'other';
  fileSize?: number;
}

/**
 * CTD Section
 */
export interface CTDSection {
  id: string;
  number: string;
  name: string;
  path: string;
  required: boolean;
  repeatable: boolean;
  acceptedFileTypes: string[];
}

/**
 * Sequence Build (in-progress submission)
 */
export interface SequenceBuildSummary {
  id: string;
  applicationId: string;
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: SubmissionType;
  targetAgency: GatewayRegion;
  ectdVersion: ECTDVersion;
  status: SequenceBuildStatus;
  totalLeaves: number;
  assignedLeaves: number;
  validatedLeaves: number;
  targetSubmissionDate: string;
  createdAt: string;
}

/**
 * Validation result for a leaf/document
 */
export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  level: ValidationLevel;
  message: string;
  field?: string;
  suggestion?: string;
  autoFixable: boolean;
}

/**
 * Build step tracking
 */
export interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  message?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CTD_MODULES: Record<string, { name: string; color: string }> = {
  '1': { name: 'Regional Administrative Information', color: '#EF4444' },
  '2': { name: 'Common Technical Document Summaries', color: '#F59E0B' },
  '3': { name: 'Quality', color: '#10B981' },
  '4': { name: 'Nonclinical Study Reports', color: '#7C3AED' },
  '5': { name: 'Clinical Study Reports', color: '#1E90FF' },
};

export const SEQUENCE_STATUS_LABELS: Record<SequenceStatus, string> = {
  'draft': 'Draft',
  'validated': 'Validated',
  'submitted': 'Submitted',
  'acknowledged': 'Acknowledged',
  'under-review': 'Under Review',
  'approved': 'Approved',
};

export const BUILD_STATUS_LABELS: Record<SequenceBuildStatus, string> = {
  'draft': 'Draft',
  'building': 'Building',
  'validating': 'Validating',
  'ready-for-review': 'Ready for Review',
  'in-review': 'In Review',
  'approved': 'Approved',
  'publishing': 'Publishing',
  'submitted': 'Submitted',
  'error': 'Error',
};

export const LIFECYCLE_STATE_LABELS: Record<SubmissionLifecycleState, string> = {
  'draft': 'Draft',
  'compiled': 'Compiled',
  'submitted': 'Submitted',
  'acknowledged': 'Acknowledged',
  'archived': 'Archived',
};

export const SEQUENCE_STATUS_COLORS: Record<SequenceStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'validated': 'bg-blue-100 text-blue-800',
  'submitted': 'bg-yellow-100 text-yellow-800',
  'acknowledged': 'bg-green-100 text-green-800',
  'under-review': 'bg-purple-100 text-purple-800',
  'approved': 'bg-teal-100 text-teal-800',
};

export const BUILD_STATUS_COLORS: Record<SequenceBuildStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'building': 'bg-blue-100 text-blue-800',
  'validating': 'bg-yellow-100 text-yellow-800',
  'ready-for-review': 'bg-orange-100 text-orange-800',
  'in-review': 'bg-purple-100 text-purple-800',
  'approved': 'bg-green-100 text-green-800',
  'publishing': 'bg-teal-100 text-teal-800',
  'submitted': 'bg-emerald-100 text-emerald-800',
  'error': 'bg-red-100 text-red-800',
};

export const VALIDATION_LEVEL_COLORS: Record<ValidationLevel, string> = {
  'error': 'bg-red-100 text-red-800',
  'warning': 'bg-yellow-100 text-yellow-800',
  'info': 'bg-blue-100 text-blue-800',
};

export const GATEWAY_LABELS: Record<GatewayRegion, string> = {
  'us-fda': 'US FDA',
  'eu-ema': 'EU EMA',
  'jp-pmda': 'Japan PMDA',
  'ca-hc': 'Health Canada',
  'cn-nmpa': 'China NMPA',
  'kr-mfds': 'Korea MFDS',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isSequenceStatus(value: string): value is SequenceStatus {
  return ['draft', 'validated', 'submitted', 'acknowledged', 'under-review', 'approved'].includes(value);
}

export function isBuildStatus(value: string): value is SequenceBuildStatus {
  return ['draft', 'building', 'validating', 'ready-for-review', 'in-review', 
          'approved', 'publishing', 'submitted', 'error'].includes(value);
}

export function isLifecycleState(value: string): value is SubmissionLifecycleState {
  return ['draft', 'compiled', 'submitted', 'acknowledged', 'archived'].includes(value);
}

export function isValidationLevel(value: string): value is ValidationLevel {
  return ['error', 'warning', 'info'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get CTD module number from section path
 */
export function getModuleFromSection(sectionPath: string): string {
  const match = sectionPath.match(/^m?(\d)/i);
  return match ? match[1] : '0';
}

/**
 * Check if a sequence is editable
 */
export function isSequenceEditable(status: SequenceStatus | SequenceBuildStatus): boolean {
  return status === 'draft' || status === 'building';
}

/**
 * Check if submission can be cancelled
 */
export function canCancelSubmission(state: SubmissionLifecycleState): boolean {
  return state === 'compiled' || state === 'submitted';
}

/**
 * Check if validation passed (no errors)
 */
export function validationPassed(results: ValidationResult[]): boolean {
  return !results.some(r => r.level === 'error');
}

/**
 * Count validation issues by level
 */
export function countValidationIssues(results: ValidationResult[]): Record<ValidationLevel, number> {
  return {
    error: results.filter(r => r.level === 'error').length,
    warning: results.filter(r => r.level === 'warning').length,
    info: results.filter(r => r.level === 'info').length,
  };
}

/**
 * Format sequence number with leading zeros
 */
export function formatSequenceNumber(num: number): string {
  return num.toString().padStart(4, '0');
}

/**
 * Parse sequence number string to number
 */
export function parseSequenceNumber(seq: string): number {
  return parseInt(seq, 10);
}
