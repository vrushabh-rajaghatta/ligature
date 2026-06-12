
// =============================================================================
// CROSS-REFERENCE VALIDATION TYPES - v0.9.17d
// =============================================================================
// eCTD cross-reference integrity checking, hyperlink validation, and auto-fix
// =============================================================================

import type { BadgeColor } from '@/components/ui/Badge';

// =============================================================================
// Core Entity Types
// =============================================================================

/** Unique identifier for cross-references */
export type CrossReferenceId = string;

/** Types of hyperlinks in eCTD documents */
export type HyperlinkType = 
  | 'internal'      // Within same document
  | 'intra-module'  // Within same CTD module
  | 'inter-module'  // Between CTD modules
  | 'external'      // External URL (not allowed in eCTD)
  | 'bookmark'      // PDF bookmark reference
  | 'toc'           // Table of contents link
  | 'xref';         // XML cross-reference

/** Validation status for a reference */
export type ReferenceStatus = 
  | 'valid'
  | 'broken'
  | 'warning'
  | 'external'      // External link (violation)
  | 'circular'      // Circular reference detected
  | 'orphan'        // Target exists but never linked to
  | 'pending';      // Not yet validated

/** Severity of validation issues */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** Categories of cross-reference issues */
export type IssueCategory = 
  | 'missing-target'      // Target document/section not found
  | 'broken-path'         // Invalid file path
  | 'external-link'       // External URL (not allowed)
  | 'circular-reference'  // A -> B -> A
  | 'orphan-document'     // Document not referenced anywhere
  | 'case-mismatch'       // Path case sensitivity issue
  | 'relative-path'       // Using relative instead of absolute
  | 'invalid-anchor'      // Bookmark/anchor doesn't exist
  | 'duplicate-id'        // Multiple elements with same ID
  | 'encoding-issue'      // URL encoding problems
  | 'deep-nesting'        // Too many levels of indirection
  | 'version-mismatch';   // Reference to wrong document version

/** Auto-fix action types */
export type AutoFixAction = 
  | 'update-path'         // Correct the file path
  | 'remove-link'         // Remove broken link
  | 'convert-relative'    // Convert relative to absolute
  | 'fix-case'            // Fix path case sensitivity
  | 'encode-url'          // Fix URL encoding
  | 'update-anchor'       // Update bookmark reference
  | 'add-target'          // Create missing target
  | 'merge-duplicates'    // Merge duplicate IDs
  | 'remove-external';    // Remove external link

// =============================================================================
// Cross-Reference Entity
// =============================================================================

/** A single cross-reference/hyperlink in an eCTD document */
export interface ECTDCrossReference {
  /** Unique identifier */
  id: CrossReferenceId;
  
  /** Document containing the reference */
  sourceDocumentId: string;
  sourceDocumentPath: string;
  sourceDocumentTitle: string;
  
  /** Location within source document */
  sourceLocation: {
    /** Page number (for PDFs) */
    pageNumber?: number;
    /** Section ID (for XML/HTML) */
    sectionId?: string;
    /** Element ID containing the link */
    elementId?: string;
    /** Character offset in document */
    offset?: number;
    /** Line number (for XML) */
    lineNumber?: number;
  };
  
  /** Link text displayed to user */
  linkText: string;
  
  /** Raw href/target value */
  rawTarget: string;
  
  /** Resolved/normalized target path */
  resolvedTarget?: string;
  
  /** Type of hyperlink */
  linkType: HyperlinkType;
  
  /** Target document (if resolved) */
  targetDocumentId?: string;
  targetDocumentPath?: string;
  targetDocumentTitle?: string;
  
  /** Target location within document */
  targetLocation?: {
    anchor?: string;
    sectionId?: string;
    pageNumber?: number;
  };
  
  /** Validation status */
  status: ReferenceStatus;
  
  /** Last validation timestamp */
  lastValidated?: string;
  
  /** Validation error message if broken */
  errorMessage?: string;
  
  /** Sequence ID this reference belongs to */
  sequenceId?: string;
  
  /** Application ID */
  applicationId?: string;
  
  /** CTD Module (m1, m2, m3, m4, m5) */
  ctdModule?: string;
  
  /** Created/discovered timestamp */
  createdAt: string;
}

// =============================================================================
// Validation Issue Types
// =============================================================================

/** A detected cross-reference issue */
export interface CrossReferenceIssue {
  /** Unique issue ID */
  id: string;
  
  /** The problematic reference */
  referenceId: CrossReferenceId;
  
  /** Issue category */
  category: IssueCategory;
  
  /** Severity level */
  severity: ValidationSeverity;
  
  /** Human-readable description */
  message: string;
  
  /** Technical details */
  details?: string;
  
  /** Affected file path */
  affectedPath: string;
  
  /** Source location info */
  location?: {
    pageNumber?: number;
    lineNumber?: number;
    elementId?: string;
  };
  
  /** eCTD rule that was violated */
  ruleId?: string;
  ruleName?: string;
  
  /** Regional specification affected */
  region?: string;
  
  /** Can this be auto-fixed? */
  canAutoFix: boolean;
  
  /** Suggested fix if available */
  suggestedFix?: AutoFixSuggestion;
  
  /** Timestamp */
  detectedAt: string;
  
  /** Has user acknowledged this issue? */
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

/** Auto-fix suggestion for an issue */
export interface AutoFixSuggestion {
  /** Fix action type */
  action: AutoFixAction;
  
  /** Description of what will be changed */
  description: string;
  
  /** Original value */
  originalValue: string;
  
  /** Proposed new value */
  proposedValue: string;
  
  /** Confidence level (0-100) */
  confidence: number;
  
  /** Risks/warnings about applying this fix */
  risks?: string[];
  
  /** Preview of the change */
  preview?: string;
}

// =============================================================================
// Validation Results
// =============================================================================

/** Summary of validation for a single document */
export interface DocumentValidationResult {
  /** Document ID */
  documentId: string;
  documentPath: string;
  documentTitle: string;
  
  /** Total references found */
  totalReferences: number;
  
  /** Valid references */
  validCount: number;
  
  /** Broken references */
  brokenCount: number;
  
  /** Warnings */
  warningCount: number;
  
  /** External links (errors) */
  externalCount: number;
  
  /** All issues found */
  issues: CrossReferenceIssue[];
  
  /** All references in document */
  references: ECTDCrossReference[];
  
  /** Validation timestamp */
  validatedAt: string;
  
  /** Validation duration (ms) */
  validationDuration?: number;
  
  /** Overall status */
  overallStatus: 'passed' | 'failed' | 'warning';
}

/** Summary of validation for a sequence */
export interface SequenceValidationResult {
  /** Sequence ID */
  sequenceId: string;
  sequenceNumber: string;
  
  /** Application info */
  applicationId: string;
  applicationNumber: string;
  
  /** Validation scope */
  documentsValidated: number;
  
  /** Totals */
  totalReferences: number;
  validCount: number;
  brokenCount: number;
  warningCount: number;
  externalCount: number;
  circularCount: number;
  orphanCount: number;
  
  /** Issues by category */
  issuesByCategory: Record<IssueCategory, number>;
  
  /** Issues by severity */
  issuesBySeverity: Record<ValidationSeverity, number>;
  
  /** Issues by module */
  issuesByModule: Record<string, number>;
  
  /** Document results */
  documentResults: DocumentValidationResult[];
  
  /** All unique issues */
  allIssues: CrossReferenceIssue[];
  
  /** Auto-fixable issues */
  autoFixableCount: number;
  
  /** Validation timestamp */
  validatedAt: string;
  
  /** Validation duration (ms) */
  validationDuration?: number;
  
  /** Overall compliance */
  complianceScore: number; // 0-100
  overallStatus: 'passed' | 'failed' | 'warning';
}

// =============================================================================
// Batch Operations
// =============================================================================

/** Batch validation job */
export interface CrossReferenceValidationJob {
  /** Job ID */
  id: string;
  
  /** Job status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** Progress (0-100) */
  progress: number;
  
  /** Scope */
  sequenceIds: string[];
  documentIds: string[];
  
  /** Results */
  completedDocuments: number;
  totalDocuments: number;
  
  /** Timestamps */
  startedAt?: string;
  completedAt?: string;
  
  /** Error if failed */
  error?: string;
  
  /** Results when complete */
  results?: SequenceValidationResult[];
}

/** Batch auto-fix job */
export interface AutoFixJob {
  /** Job ID */
  id: string;
  
  /** Job status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** Progress */
  progress: number;
  
  /** Issues to fix */
  issueIds: string[];
  
  /** Results */
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
  
  /** Individual fix results */
  fixResults: AutoFixResult[];
  
  /** Timestamps */
  startedAt?: string;
  completedAt?: string;
  
  /** Error if failed */
  error?: string;
}

/** Result of applying a single auto-fix */
export interface AutoFixResult {
  /** Issue that was fixed */
  issueId: string;
  
  /** Reference that was modified */
  referenceId: CrossReferenceId;
  
  /** Success/failure */
  success: boolean;
  
  /** Action taken */
  action: AutoFixAction;
  
  /** Original value */
  originalValue: string;
  
  /** New value (if success) */
  newValue?: string;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Timestamp */
  appliedAt: string;
  appliedBy: string;
}

// =============================================================================
// Filter & Query Types
// =============================================================================

/** Filters for cross-reference queries */
export interface CrossReferenceFilters {
  /** Filter by status */
  status?: ReferenceStatus[];
  
  /** Filter by link type */
  linkType?: HyperlinkType[];
  
  /** Filter by issue category */
  issueCategory?: IssueCategory[];
  
  /** Filter by severity */
  severity?: ValidationSeverity[];
  
  /** Filter by CTD module */
  ctdModule?: string[];
  
  /** Filter by document */
  documentId?: string;
  
  /** Filter by sequence */
  sequenceId?: string;
  
  /** Filter by application */
  applicationId?: string;
  
  /** Text search in link text/paths */
  searchQuery?: string;
  
  /** Only show auto-fixable */
  onlyAutoFixable?: boolean;
  
  /** Only show unacknowledged */
  onlyUnacknowledged?: boolean;
}

/** Default filters */
export const DEFAULT_CROSS_REFERENCE_FILTERS: CrossReferenceFilters = {
  status: undefined,
  linkType: undefined,
  issueCategory: undefined,
  severity: undefined,
  ctdModule: undefined,
  documentId: undefined,
  sequenceId: undefined,
  applicationId: undefined,
  searchQuery: '',
  onlyAutoFixable: false,
  onlyUnacknowledged: false,
};

// =============================================================================
// Statistics
// =============================================================================

/** Statistics for cross-reference validation */
export interface CrossReferenceStatistics {
  /** Total references tracked */
  totalReferences: number;
  
  /** By status */
  byStatus: Record<ReferenceStatus, number>;
  
  /** By link type */
  byLinkType: Record<HyperlinkType, number>;
  
  /** Issues by category */
  issuesByCategory: Record<IssueCategory, number>;
  
  /** Issues by severity */
  issuesBySeverity: Record<ValidationSeverity, number>;
  
  /** Auto-fix stats */
  autoFixableCount: number;
  fixedCount: number;
  
  /** Documents with issues */
  documentsWithIssues: number;
  totalDocuments: number;
  
  /** Overall health score (0-100) */
  healthScore: number;
  
  /** Last validation timestamp */
  lastValidated?: string;
}

// =============================================================================
// Validation Rules
// =============================================================================

/** Built-in validation rules for cross-references */
export interface CrossReferenceRule {
  /** Rule ID */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Description */
  description: string;
  
  /** Category of issues this rule detects */
  category: IssueCategory;
  
  /** Severity when violated */
  severity: ValidationSeverity;
  
  /** Applicable regions */
  regions: string[];
  
  /** Is rule enabled? */
  enabled: boolean;
  
  /** eCTD specification reference */
  specReference?: string;
}

/** Built-in cross-reference validation rules */
export const CROSS_REFERENCE_RULES: CrossReferenceRule[] = [
  {
    id: 'XREF-001',
    name: 'No External Links',
    description: 'eCTD documents must not contain external hyperlinks',
    category: 'external-link',
    severity: 'error',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §3.2.1',
  },
  {
    id: 'XREF-002',
    name: 'Valid Target Path',
    description: 'All hyperlinks must reference existing files within the eCTD structure',
    category: 'missing-target',
    severity: 'error',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §3.2.2',
  },
  {
    id: 'XREF-003',
    name: 'Forward Slash Paths',
    description: 'File paths must use forward slashes, not backslashes',
    category: 'broken-path',
    severity: 'error',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §2.3.1',
  },
  {
    id: 'XREF-004',
    name: 'Case Sensitivity',
    description: 'File path case must match actual file names exactly',
    category: 'case-mismatch',
    severity: 'warning',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §2.3.2',
  },
  {
    id: 'XREF-005',
    name: 'Valid Bookmark Anchors',
    description: 'PDF bookmark references must point to existing destinations',
    category: 'invalid-anchor',
    severity: 'error',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §3.3.1',
  },
  {
    id: 'XREF-006',
    name: 'No Circular References',
    description: 'Document reference chains must not form cycles',
    category: 'circular-reference',
    severity: 'warning',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'Best Practice',
  },
  {
    id: 'XREF-007',
    name: 'Relative Path Usage',
    description: 'References should use relative paths within eCTD structure',
    category: 'relative-path',
    severity: 'info',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §2.3.3',
  },
  {
    id: 'XREF-008',
    name: 'URL Encoding',
    description: 'Special characters in paths must be properly URL-encoded',
    category: 'encoding-issue',
    severity: 'warning',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'ICH eCTD v4.0 §2.3.4',
  },
  {
    id: 'XREF-009',
    name: 'Orphan Documents',
    description: 'All documents should be referenced by at least one other document or index',
    category: 'orphan-document',
    severity: 'info',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'Best Practice',
  },
  {
    id: 'XREF-010',
    name: 'Unique Element IDs',
    description: 'XML element IDs must be unique within a document',
    category: 'duplicate-id',
    severity: 'error',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'XML 1.0 Specification',
  },
  {
    id: 'XREF-011',
    name: 'Reference Nesting Depth',
    description: 'Reference chains should not exceed 5 levels of indirection',
    category: 'deep-nesting',
    severity: 'warning',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'Best Practice',
  },
  {
    id: 'XREF-012',
    name: 'Version Consistency',
    description: 'References should point to the current version of documents',
    category: 'version-mismatch',
    severity: 'warning',
    regions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
    enabled: true,
    specReference: 'Best Practice',
  },
];

// =============================================================================
// Color & Label Maps for UI
// =============================================================================

/** Colors for reference status badges */
export const REFERENCE_STATUS_COLORS: Record<ReferenceStatus, BadgeColor> = {
  valid: 'green',
  broken: 'red',
  warning: 'amber',
  external: 'red',
  circular: 'purple',
  orphan: 'slate',
  pending: 'blue',
};

/** Colors for validation severity */
export const VALIDATION_SEVERITY_COLORS: Record<ValidationSeverity, BadgeColor> = {
  error: 'red',
  warning: 'amber',
  info: 'blue',
};

/** Colors for issue categories */
export const ISSUE_CATEGORY_COLORS: Record<IssueCategory, BadgeColor> = {
  'missing-target': 'red',
  'broken-path': 'red',
  'external-link': 'red',
  'circular-reference': 'purple',
  'orphan-document': 'slate',
  'case-mismatch': 'amber',
  'relative-path': 'blue',
  'invalid-anchor': 'red',
  'duplicate-id': 'amber',
  'encoding-issue': 'amber',
  'deep-nesting': 'slate',
  'version-mismatch': 'amber',
};

/** Colors for link types */
export const LINK_TYPE_COLORS: Record<HyperlinkType, BadgeColor> = {
  internal: 'green',
  'intra-module': 'blue',
  'inter-module': 'purple',
  external: 'red',
  bookmark: 'teal',
  toc: 'slate',
  xref: 'purple',
};

/** Labels for reference status */
export const REFERENCE_STATUS_LABELS: Record<ReferenceStatus, string> = {
  valid: 'Valid',
  broken: 'Broken',
  warning: 'Warning',
  external: 'External',
  circular: 'Circular',
  orphan: 'Orphan',
  pending: 'Pending',
};

/** Labels for issue categories */
export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  'missing-target': 'Missing Target',
  'broken-path': 'Broken Path',
  'external-link': 'External Link',
  'circular-reference': 'Circular Reference',
  'orphan-document': 'Orphan Document',
  'case-mismatch': 'Case Mismatch',
  'relative-path': 'Relative Path',
  'invalid-anchor': 'Invalid Anchor',
  'duplicate-id': 'Duplicate ID',
  'encoding-issue': 'Encoding Issue',
  'deep-nesting': 'Deep Nesting',
  'version-mismatch': 'Version Mismatch',
};

/** Labels for link types */
export const LINK_TYPE_LABELS: Record<HyperlinkType, string> = {
  internal: 'Internal',
  'intra-module': 'Intra-Module',
  'inter-module': 'Inter-Module',
  external: 'External',
  bookmark: 'Bookmark',
  toc: 'TOC',
  xref: 'XML Reference',
};

/** Labels for auto-fix actions */
export const AUTO_FIX_ACTION_LABELS: Record<AutoFixAction, string> = {
  'update-path': 'Update Path',
  'remove-link': 'Remove Link',
  'convert-relative': 'Convert to Relative',
  'fix-case': 'Fix Case',
  'encode-url': 'Encode URL',
  'update-anchor': 'Update Anchor',
  'add-target': 'Add Target',
  'merge-duplicates': 'Merge Duplicates',
  'remove-external': 'Remove External',
};

// =============================================================================
// ID Generator
// =============================================================================

let crossRefIdCounter = 0;
let issueIdCounter = 0;
let jobIdCounter = 0;

/** Generate unique cross-reference ID */
export function generateCrossReferenceId(): CrossReferenceId {
  return `xref-${++crossRefIdCounter}-${Date.now().toString(36)}`;
}

/** Generate unique issue ID */
export function generateIssueId(): string {
  return `issue-${++issueIdCounter}-${Date.now().toString(36)}`;
}

/** Generate unique job ID */
export function generateJobId(): string {
  return `job-${++jobIdCounter}-${Date.now().toString(36)}`;
}

/** Reset counters (for testing) */
export function resetCrossReferenceIdCounters(): void {
  crossRefIdCounter = 0;
  issueIdCounter = 0;
  jobIdCounter = 0;
}

// =============================================================================
// State & Actions Interfaces
// =============================================================================

/** Store state interface */
export interface CrossReferenceValidationState {
  // Data
  references: Record<CrossReferenceId, ECTDCrossReference>;
  issues: Record<string, CrossReferenceIssue>;
  documentResults: Record<string, DocumentValidationResult>;
  sequenceResults: Record<string, SequenceValidationResult>;
  validationJobs: Record<string, CrossReferenceValidationJob>;
  autoFixJobs: Record<string, AutoFixJob>;
  
  // UI State
  selectedReferenceId: CrossReferenceId | null;
  selectedIssueId: string | null;
  filters: CrossReferenceFilters;
  expandedDocuments: Set<string>;
  
  // Statistics
  statistics: CrossReferenceStatistics | null;
  
  // Loading/Error
  isValidating: boolean;
  isApplyingFix: boolean;
  error: string | null;
}

/** Store actions interface */
export interface CrossReferenceValidationActions {
  // Validation
  validateDocument: (documentId: string, documentPath: string, content?: string) => Promise<DocumentValidationResult>;
  validateSequence: (sequenceId: string, documentIds: string[]) => Promise<SequenceValidationResult>;
  validateBatch: (sequenceIds: string[]) => Promise<string>; // Returns job ID
  cancelValidation: (jobId: string) => void;
  
  // Issue Management
  acknowledgeIssue: (issueId: string, userId: string) => void;
  unacknowledgeIssue: (issueId: string) => void;
  dismissIssue: (issueId: string) => void;
  
  // Auto-Fix
  applyFix: (issueId: string, userId: string) => Promise<AutoFixResult>;
  applyFixBatch: (issueIds: string[], userId: string) => Promise<string>; // Returns job ID
  previewFix: (issueId: string) => AutoFixSuggestion | null;
  
  // CRUD
  addReference: (reference: Omit<ECTDCrossReference, 'id' | 'createdAt'>) => CrossReferenceId;
  updateReference: (id: CrossReferenceId, updates: Partial<ECTDCrossReference>) => void;
  deleteReference: (id: CrossReferenceId) => void;
  clearAllReferences: () => void;
  
  // Queries
  getReferencesForDocument: (documentId: string) => ECTDCrossReference[];
  getIssuesForDocument: (documentId: string) => CrossReferenceIssue[];
  getBrokenReferences: () => ECTDCrossReference[];
  getAutoFixableIssues: () => CrossReferenceIssue[];
  getOrphanDocuments: () => string[];
  
  // UI State
  setSelectedReference: (id: CrossReferenceId | null) => void;
  setSelectedIssue: (id: string | null) => void;
  setFilters: (filters: Partial<CrossReferenceFilters>) => void;
  resetFilters: () => void;
  toggleDocumentExpanded: (documentId: string) => void;
  
  // Statistics
  refreshStatistics: () => void;
  
  // Reset
  reset: () => void;
}
