
/**
 * Document Lineage Types
 * ======================
 * Foundation for cross-module document tracking in Ligature.
 * 
 * These types enable the "R&D Connected" vision where documents are
 * tracked across TMF, Submissions, PSMF, CTMS, Safety, and other modules
 * with full provenance and version awareness.
 * 
 * @version 0.14.1
 * @since 2026-01-08
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

/**
 * How a document reference relates to its source
 */
export type DocumentReferenceType = 
  | 'live'        // Always points to current version (e.g., TMF reference to active protocol)
  | 'frozen'      // Locked to specific version (e.g., submission archive)
  | 'superseded'; // Reference is outdated, newer version exists

/**
 * Modules that can reference documents
 */
export type LineageModule = 
  | 'document-control'  // Source of truth for all documents
  | 'tmf'               // Trial Master File
  | 'submissions'       // Regulatory submissions archive
  | 'psmf'              // Pharmacovigilance System Master File
  | 'ctms'              // Clinical Trial Management System
  | 'safety'            // Safety/Pharmacovigilance
  | 'qms'               // Quality Management System
  | 'eln'               // Electronic Lab Notebook
  | 'authoring'         // Document authoring workspace
  | 'publishing';       // eCTD publishing pipeline

/**
 * Document types that can be tracked across modules
 */
export type LineageDocumentType =
  | 'protocol'
  | 'investigator-brochure'
  | 'informed-consent'
  | 'clinical-study-report'
  | 'sop'
  | 'work-instruction'
  | 'specification'
  | 'batch-record'
  | 'validation-report'
  | 'stability-report'
  | 'nonclinical-report'
  | 'cmc-document'
  | 'labeling'
  | 'safety-narrative'
  | 'aggregate-report'    // PSUR, DSUR, PBRER
  | 'correspondence'      // HAQ responses, cover letters
  | 'regulatory-document' // Generic regulatory document
  | 'other';

/**
 * Why a document is referenced in a particular module
 */
export type ReferencePurpose =
  | 'source-of-truth'     // This is the canonical version
  | 'study-reference'     // Referenced by a clinical study
  | 'submission-artifact' // Included in a regulatory submission
  | 'compliance-index'    // Listed in compliance index (e.g., PSMF SOP index)
  | 'supporting-evidence' // Referenced as supporting documentation
  | 'audit-trail'         // Historical reference for audit purposes
  | 'cross-reference'     // Cross-referenced from another document
  | 'template-source';    // Used as template for new documents

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Context describing where and why a document is referenced
 */
export interface ReferenceContext {
  /** Module where the reference exists */
  module: LineageModule;
  
  /** ID of the record holding this reference (e.g., studyId, submissionId) */
  recordId: string;
  
  /** Human-readable record identifier (e.g., "Study XYZ-001", "IND-2024-001") */
  recordName: string;
  
  /** Why this document is referenced here */
  purpose: ReferencePurpose;
  
  /** Optional: Specific location within the record (e.g., "Module 2.5", "Zone 01.01") */
  location?: string;
}

/**
 * Version information for a document
 */
export interface DocumentVersionInfo {
  /** Version string (e.g., "2.3", "1.0.1") */
  version: string;
  
  /** When this version was created */
  createdAt: string;
  
  /** Who created this version */
  createdBy: string;
  
  /** Version status */
  status: 'draft' | 'in-review' | 'approved' | 'effective' | 'retired' | 'superseded';
  
  /** Effective date (for controlled documents) */
  effectiveDate?: string;
  
  /** Expiry/review date */
  expiryDate?: string;
}

/**
 * Core document reference - tracks a document's presence in a module
 */
export interface DocumentReference {
  /** Unique ID for this reference instance */
  id: string;
  
  /** Canonical document ID in Document Control (source of truth) */
  sourceDocumentId: string;
  
  /** Document title */
  documentTitle: string;
  
  /** Document type */
  documentType: LineageDocumentType;
  
  /** Document number (e.g., "SOP-001", "PROT-XYZ-001") */
  documentNumber: string;
  
  /** Version at the time this reference was created */
  sourceVersion: string;
  
  /** Current version in Document Control (may differ from sourceVersion) */
  currentVersion: string;
  
  /** How this reference relates to the source */
  referenceType: DocumentReferenceType;
  
  /** Where and why this document is referenced */
  context: ReferenceContext;
  
  /** When this reference was created */
  referencedAt: string;
  
  /** Who created this reference */
  referencedBy: string;
  
  /** Optional: Reason for freezing (if frozen) */
  freezeReason?: string;
  
  /** Optional: Regulatory hold preventing updates */
  regulatoryHold?: boolean;
}

/**
 * Extended provenance metadata for audit and compliance
 */
export interface ProvenanceMetadata {
  /** The document reference this metadata belongs to */
  referenceId: string;
  
  /** Full version history of this reference */
  versionHistory: DocumentVersionInfo[];
  
  /** All modules where this document is referenced */
  crossModulePresence: ReferenceContext[];
  
  /** Chain of custody for regulatory documents */
  custodyChain?: CustodyEvent[];
  
  /** Compliance indicators */
  compliance: {
    /** Is this the effective version for compliance purposes? */
    isEffective: boolean;
    
    /** Days until expiry/review (negative if overdue) */
    daysToExpiry?: number;
    
    /** Training required for this document version? */
    trainingRequired: boolean;
    
    /** Training completion percentage (if applicable) */
    trainingCompletion?: number;
  };
}

/**
 * Chain of custody event for regulatory documents
 */
export interface CustodyEvent {
  /** Event ID */
  id: string;
  
  /** Event type */
  type: 'created' | 'transferred' | 'archived' | 'retrieved' | 'certified' | 'submitted';
  
  /** When the event occurred */
  timestamp: string;
  
  /** Who performed the action */
  actor: string;
  
  /** From location/system */
  from?: string;
  
  /** To location/system */
  to?: string;
  
  /** Additional notes */
  notes?: string;
  
  /** Electronic signature ID (if signed) */
  signatureId?: string;
}

// =============================================================================
// VERSION COMPARISON TYPES
// =============================================================================

/**
 * Result of comparing referenced version to current version
 */
export interface VersionComparisonResult {
  /** Are the versions the same? */
  isCurrent: boolean;
  
  /** How many versions behind (0 if current) */
  versionsBehind: number;
  
  /** Source version */
  referencedVersion: string;
  
  /** Current version */
  currentVersion: string;
  
  /** Staleness indicator */
  staleness: 'current' | 'minor-update' | 'major-update' | 'critical-update';
  
  /** Human-readable status message */
  statusMessage: string;
  
  /** Changes between versions (summary) */
  changeSummary?: string[];
}

/**
 * Staleness thresholds for version comparison
 */
export interface StalenessConfig {
  /** Days after which a minor update becomes concerning */
  minorUpdateThresholdDays: number;
  
  /** Days after which any staleness becomes critical */
  criticalThresholdDays: number;
  
  /** Document types that should always show staleness warnings */
  alwaysWarnTypes: LineageDocumentType[];
}

// =============================================================================
// QUERY & FILTER TYPES
// =============================================================================

/**
 * Filter options for querying document references
 */
export interface DocumentReferenceFilter {
  /** Filter by source document ID */
  sourceDocumentId?: string;
  
  /** Filter by document type */
  documentType?: LineageDocumentType | LineageDocumentType[];
  
  /** Filter by module */
  module?: LineageModule | LineageModule[];
  
  /** Filter by reference type */
  referenceType?: DocumentReferenceType | DocumentReferenceType[];
  
  /** Filter by purpose */
  purpose?: ReferencePurpose | ReferencePurpose[];
  
  /** Only show stale references */
  staleOnly?: boolean;
  
  /** Only show references with regulatory hold */
  regulatoryHoldOnly?: boolean;
  
  /** Filter by record ID */
  recordId?: string;
  
  /** Search by document title/number */
  searchText?: string;
}

/**
 * Sort options for document references
 */
export interface DocumentReferenceSortOptions {
  field: 'documentTitle' | 'documentNumber' | 'referencedAt' | 'sourceVersion' | 'staleness';
  direction: 'asc' | 'desc';
}

// =============================================================================
// EVENT TYPES (for store actions)
// =============================================================================

/**
 * Events that can occur in the document lineage system
 */
export type LineageEventType =
  | 'reference-created'
  | 'reference-updated'
  | 'reference-removed'
  | 'version-changed'
  | 'freeze-applied'
  | 'freeze-released'
  | 'regulatory-hold-applied'
  | 'regulatory-hold-released'
  | 'staleness-detected'
  | 'custody-transferred';

/**
 * Lineage event for audit trail
 */
export interface LineageEvent {
  id: string;
  type: LineageEventType;
  referenceId: string;
  sourceDocumentId: string;
  timestamp: string;
  actor: string;
  module: LineageModule;
  details: Record<string, unknown>;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

/**
 * Props for the Document Provenance Badge component (v0.14.3)
 */
export interface ProvenanceBadgeProps {
  /** The document reference to display */
  reference: DocumentReference;
  
  /** Version comparison result */
  comparison: VersionComparisonResult;
  
  /** Show cross-module presence count */
  showCrossModuleCount?: boolean;
  
  /** Compact mode (icon only) */
  compact?: boolean;
  
  /** Click handler to navigate to source */
  onNavigateToSource?: () => void;
  
  /** Click handler to view all references */
  onViewAllReferences?: () => void;
  
  /** Click handler to view version diff */
  onViewVersionDiff?: () => void;
}

/**
 * State for the lineage visualization panel (v0.14.8)
 */
export interface LineageVisualizationState {
  /** Currently selected document */
  selectedDocumentId: string | null;
  
  /** All references for the selected document */
  references: DocumentReference[];
  
  /** Provenance metadata */
  provenance: ProvenanceMetadata | null;
  
  /** Active filters */
  filters: DocumentReferenceFilter;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Expanded modules in the visualization */
  expandedModules: LineageModule[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Create a new document reference (for store actions)
 */
export type CreateDocumentReference = Omit<DocumentReference, 'id' | 'referencedAt' | 'currentVersion'> & {
  /** Optional: Override the reference timestamp */
  referencedAt?: string;
};

/**
 * Update an existing document reference
 */
export type UpdateDocumentReference = Partial<Omit<DocumentReference, 'id' | 'sourceDocumentId'>> & {
  id: string;
};

/**
 * Summary of document references for a module
 */
export interface ModuleReferenceSummary {
  module: LineageModule;
  totalReferences: number;
  liveReferences: number;
  frozenReferences: number;
  staleReferences: number;
  documentsWithHold: number;
}

/**
 * Summary of all references for a single document
 */
export interface DocumentReferenceSummary {
  sourceDocumentId: string;
  documentTitle: string;
  documentNumber: string;
  currentVersion: string;
  totalReferences: number;
  byModule: ModuleReferenceSummary[];
  oldestReference: string;
  newestReference: string;
  hasStaleReferences: boolean;
  hasRegulatoryHolds: boolean;
}
