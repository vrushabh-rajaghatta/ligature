
// =============================================================================
// eCTD PUBLISHING TYPES - v0.9.11
// =============================================================================
// Comprehensive type definitions for eCTD (Electronic Common Technical Document)
// publishing system. Covers sequences, lifecycle operations, validation,
// and document management per ICH M8 eCTD specification.
// =============================================================================

// -----------------------------------------------------------------------------
// ENUMS & CONSTANTS
// -----------------------------------------------------------------------------

/** eCTD specification versions */
export type ECTDSpecVersion = '3.2.2' | '4.0';

/** CTD Module identifiers */
export type CTDModule = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

/** Regional submission types */
export type RegionalSubmissionType = 
  // US FDA
  | 'nda' | 'anda' | 'bla' | 'ind' | 'nda-supplement' | 'bla-supplement'
  | 'ind-amendment' | 'ind-safety-report' | 'annual-report'
  // EU EMA
  | 'maa' | 'maa-variation' | 'maa-renewal' | 'maa-psur' | 'type-ia' | 'type-ib' | 'type-ii'
  // Japan PMDA
  | 'j-nda' | 'j-nda-partial' | 'j-nda-amendment'
  // Canada Health Canada
  | 'nds' | 'ands' | 'snds' | 'din-change'
  // Australia TGA
  | 'prescription' | 'otc' | 'biological'
  // Switzerland Swissmedic
  | 'swiss-new' | 'swiss-variation' | 'swiss-extension';

/** Document lifecycle operations per eCTD spec */
export type LifecycleOperation = 
  | 'new'           // New document submission
  | 'append'        // Add to existing document
  | 'replace'       // Replace existing document
  | 'delete';       // Remove document from submission

/** Sequence status in submission lifecycle */
export type SequenceStatus =
  | 'planning'      // Being assembled
  | 'draft'         // Initial draft state
  | 'in-review'     // Internal review
  | 'validated'     // Passed validation
  | 'ready'         // Ready for submission
  | 'submitted'     // Sent to agency
  | 'acknowledged'  // Agency acknowledged receipt
  | 'under-review'  // Agency reviewing
  | 'questions'     // Agency has questions (HAQ)
  | 'approved'      // Approved by agency
  | 'rejected'      // Rejected by agency
  | 'withdrawn';    // Withdrawn by sponsor

/** Validation severity levels */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** Validation rule categories */
export type ValidationCategory =
  | 'structure'     // XML/folder structure
  | 'pdf'           // PDF specification compliance
  | 'reference'     // Cross-reference integrity
  | 'checksum'      // File checksum validation
  | 'metadata'      // Metadata completeness
  | 'regional'      // Region-specific rules
  | 'business';     // Business logic rules

/** Document file types */
export type ECTDFileType = 'pdf' | 'xml' | 'xpt' | 'sas' | 'jpg' | 'svg' | 'stf';

/** Checksum algorithms */
export type ChecksumAlgorithm = 'md5' | 'sha256';

// -----------------------------------------------------------------------------
// CORE ENTITIES
// -----------------------------------------------------------------------------

/**
 * eCTD Application - Top-level container for regulatory submissions
 */
export interface ECTDApplication {
  id: string;
  
  // Identifiers
  applicationNumber: string;        // e.g., NDA 123456, BLA 765432
  sponsorApplicationId?: string;    // Internal sponsor reference
  
  // Classification
  submissionType: RegionalSubmissionType;
  region: string;                   // ISO country code or 'EU'
  ectdVersion: ECTDSpecVersion;
  
  // Product information
  productId: string;
  productName: string;
  substanceNames: string[];
  dosageForms: string[];
  
  // Sponsor information
  sponsorName: string;
  sponsorDUNS?: string;             // D-U-N-S Number
  contactName?: string;
  contactEmail?: string;
  
  // Agency information
  receivingAgency: string;
  agencyApplicationNumber?: string; // Assigned by agency
  
  // Status & lifecycle
  status: SequenceStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  
  // Sequences
  sequences: ECTDSequence[];
  currentSequenceId?: string;
  
  // Archive path for files
  archivePath: string;
  
  // Metadata
  tags?: string[];
  notes?: string;
}

/**
 * eCTD Sequence - A versioned submission within an application
 */
export interface ECTDSequence {
  id: string;
  applicationId: string;
  
  // Sequence identification
  sequenceNumber: string;           // e.g., '0000', '0001'
  sequenceType: SequenceType;
  sequenceDescription: string;
  
  // Submission details
  submissionType: string;           // More specific type within app
  submissionSubType?: string;
  relatedSequences?: string[];      // References to other sequences
  
  // Status & dates
  status: SequenceStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  submittedAt?: string;
  acknowledgementDate?: string;
  
  // Structure
  modules: ECTDModuleContent[];
  regionalInfo?: ECTDRegionalInfo;
  
  // Validation
  validationStatus: ValidationStatus;
  lastValidatedAt?: string;
  
  // Metadata
  preparedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
}

/** Types of sequences */
export type SequenceType =
  | 'original'              // Initial submission
  | 'amendment'             // Amendment/supplement
  | 'response'              // Response to agency questions
  | 'report'                // Periodic report
  | 'variation'             // EU variation
  | 'renewal'               // License renewal
  | 'notification'          // Agency notification
  | 'withdrawal';           // Withdrawal request

/**
 * Module content within a sequence
 */
export interface ECTDModuleContent {
  id: string;
  sequenceId: string;
  moduleId: CTDModule;
  title: string;
  
  // Sections within module
  sections: ECTDSection[];
  
  // Module-level metadata
  documentCount: number;
  totalSizeBytes: number;
  lastModified: string;
}

/**
 * Section within a module (hierarchical)
 */
export interface ECTDSection {
  id: string;
  moduleContentId: string;
  
  // Section identification
  sectionNumber: string;            // e.g., '2.3', '3.2.P.1'
  sectionTitle: string;
  parentSectionId?: string;
  
  // Content
  documents: ECTDLeafDocument[];
  subsections?: ECTDSection[];
  
  // Metadata
  displayOrder: number;
  isRequired: boolean;
  isRegionallyRequired?: boolean;
}

/**
 * Leaf document - actual file in submission
 */
export interface ECTDLeafDocument {
  id: string;
  sectionId: string;
  
  // File information
  title: string;
  fileName: string;
  filePath: string;                 // Relative path within sequence
  fileType: ECTDFileType;
  fileSizeBytes: number;
  
  // Checksum
  checksum: string;
  checksumAlgorithm: ChecksumAlgorithm;
  checksumVerified: boolean;
  
  // Lifecycle
  operation: LifecycleOperation;
  modifiedFile?: string;            // Path to file being replaced/appended
  xref?: ECTDCrossReference[];      // Cross-references
  
  // PDF-specific attributes
  pdfAttributes?: PDFAttributes;
  
  // Metadata
  languageCode: string;             // ISO 639-1
  createdAt: string;
  modifiedAt: string;
  
  // Source tracking
  sourceDocumentId?: string;        // Link to authoring system document
  sourceVersion?: string;
  
  // Status
  validationStatus: DocumentValidationStatus;
  validationIssues?: ValidationIssue[];
}

/** PDF-specific attributes per eCTD spec */
export interface PDFAttributes {
  version: string;                  // e.g., '1.4', '1.7'
  pageCount: number;
  hasBookmarks: boolean;
  hasHyperlinks: boolean;
  hasFontsEmbedded: boolean;
  hasAnnotations: boolean;
  isTagged: boolean;                // PDF/A compliance
  isSearchable: boolean;
  colorSpace?: 'RGB' | 'CMYK' | 'Grayscale';
  pageSize?: {
    width: number;
    height: number;
    unit: 'pt' | 'mm' | 'in';
  };
  securitySettings?: {
    isEncrypted: boolean;
    printingAllowed: boolean;
    copyingAllowed: boolean;
  };
}

/** Cross-reference within eCTD */
export interface ECTDCrossReference {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  targetPath: string;               // Relative path to target
  referenceType: CrossReferenceType;
  pageNumber?: number;
  anchorName?: string;
  isValid: boolean;
  validationMessage?: string;
}

export type CrossReferenceType =
  | 'internal'      // Within same sequence
  | 'lifecycle'     // To previous sequence version
  | 'external';     // External document/URL

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

/** Overall validation status */
export interface ValidationStatus {
  isValid: boolean;
  lastRun: string;
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  completeness: number;             // Percentage 0-100
  issues: ValidationIssue[];
  rulesPassed: number;
  rulesFailed: number;
  rulesSkipped: number;
}

/** Individual document validation status */
export interface DocumentValidationStatus {
  isValid: boolean;
  lastChecked: string;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
}

/** Validation issue details */
export interface ValidationIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  details?: string;
  
  // Location
  documentId?: string;
  documentPath?: string;
  lineNumber?: number;
  xpath?: string;
  
  // Resolution
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  
  // Waiver
  isWaived: boolean;
  waivedAt?: string;
  waivedBy?: string;
  waiverJustification?: string;
}

/** Validation rule definition */
export interface ValidationRule {
  id: string;
  ruleId: string;                   // Standard rule identifier (e.g., P21-001)
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  
  // Applicability
  regions?: string[];               // Empty = all regions
  ectdVersions?: ECTDSpecVersion[];
  modules?: CTDModule[];
  fileTypes?: ECTDFileType[];
  
  // Rule specification
  ruleType: ValidationRuleType;
  expression?: string;              // Rule expression/XPath
  parameters?: Record<string, unknown>;
  
  // Metadata
  source: string;                   // e.g., 'ICH', 'FDA', 'Pinnacle 21'
  isActive: boolean;
  isRequired: boolean;
  canWaive: boolean;
}

export type ValidationRuleType =
  | 'structural'    // XML/file structure
  | 'content'       // Content validation
  | 'reference'     // Cross-reference check
  | 'checksum'      // File integrity
  | 'custom';       // Custom expression

// -----------------------------------------------------------------------------
// REGIONAL INFORMATION
// -----------------------------------------------------------------------------

/** Regional-specific information in sequence */
export interface ECTDRegionalInfo {
  region: string;
  module1Structure: Module1Structure;
  submitterInfo: SubmitterInfo;
  applicationInfo: ApplicationInfo;
  productInfo: ProductInfo[];
}

/** Module 1 structure (region-specific) */
export interface Module1Structure {
  sections: Module1Section[];
  forms: RegionalForm[];
}

export interface Module1Section {
  sectionNumber: string;
  sectionTitle: string;
  isRequired: boolean;
  documents: ECTDLeafDocument[];
}

/** Regional form (e.g., FDA 356h, Form A EU) */
export interface RegionalForm {
  id: string;
  formType: string;
  formName: string;
  version: string;
  filePath?: string;
  status: 'pending' | 'complete' | 'submitted';
  submittedAt?: string;
  confirmationNumber?: string;
}

/** Submitter information */
export interface SubmitterInfo {
  organizationName: string;
  organizationType: string;
  dunsNumber?: string;
  address: Address;
  contacts: Contact[];
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

/** Application information */
export interface ApplicationInfo {
  applicationType: string;
  applicationSubType?: string;
  applicationNumber?: string;
  previousApplicationNumbers?: string[];
  relatedINDs?: string[];
  relatedDMFs?: string[];
}

/** Product information */
export interface ProductInfo {
  proprietaryName: string;
  nonproprietaryName: string;
  dosageForm: string;
  routeOfAdministration: string[];
  strength: string;
  substanceName: string;
  pharmacologicalClass?: string;
  indications?: string[];
  manufacturingSites?: ManufacturingSite[];
}

export interface ManufacturingSite {
  name: string;
  role: 'api-manufacturer' | 'drug-product-manufacturer' | 'packager' | 'labeler' | 'testing';
  address: Address;
  feiNumber?: string;              // FDA Establishment Identifier
  dunsNumber?: string;
}

// -----------------------------------------------------------------------------
// PUBLISHING OPERATIONS
// -----------------------------------------------------------------------------

/** Publishing job for generating eCTD output */
export interface PublishingJob {
  id: string;
  sequenceId: string;
  
  // Job configuration
  outputFormat: 'ectd' | 'nees' | 'paper';
  targetGateway?: string;
  validationLevel: 'none' | 'basic' | 'full';
  includeViewerFiles: boolean;
  
  // Status
  status: PublishingJobStatus;
  progress: number;                 // 0-100
  currentStep: string;
  
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Results
  outputPath?: string;
  outputSizeBytes?: number;
  validationResults?: ValidationStatus;
  gatewayResponse?: GatewayResponse;
  
  // Errors
  errors?: PublishingError[];
}

export type PublishingJobStatus =
  | 'queued'
  | 'validating'
  | 'generating'
  | 'packaging'
  | 'transmitting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PublishingError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  isRecoverable: boolean;
}

export interface GatewayResponse {
  gateway: string;
  transactionId: string;
  status: 'accepted' | 'rejected' | 'pending';
  receivedAt: string;
  acknowledgementNumber?: string;
  messages?: GatewayMessage[];
}

export interface GatewayMessage {
  type: 'info' | 'warning' | 'error';
  code: string;
  message: string;
}

// -----------------------------------------------------------------------------
// XML BACKBONE TYPES
// -----------------------------------------------------------------------------

/** eCTD index.xml structure */
export interface ECTDIndexXML {
  ectdVersion: ECTDSpecVersion;
  applicationInfo: {
    applicationNumber: string;
    applicationType: string;
    applicant: string;
  };
  sequenceInfo: {
    sequenceNumber: string;
    sequenceType: string;
    relatedSequence?: string;
  };
  submissionInfo: {
    submissionType: string;
    submissionSubType?: string;
  };
  modules: ECTDModuleXML[];
}

export interface ECTDModuleXML {
  moduleNumber: CTDModule;
  sections: ECTDSectionXML[];
}

export interface ECTDSectionXML {
  sectionNumber: string;
  sectionTitle: string;
  leaves?: ECTDLeafXML[];
  subsections?: ECTDSectionXML[];
}

export interface ECTDLeafXML {
  id: string;
  operation: LifecycleOperation;
  checksumType: ChecksumAlgorithm;
  checksum: string;
  title: string;
  xlink: {
    href: string;
    type: string;
  };
  modifiedFile?: string;
}

// -----------------------------------------------------------------------------
// STORE STATE
// -----------------------------------------------------------------------------

/** eCTD Publishing Store State */
export interface ECTDPublishingState {
  // Applications
  applications: Record<string, ECTDApplication>;
  applicationIndex: string[];
  selectedApplicationId: string | null;
  
  // Sequences
  sequences: Record<string, ECTDSequence>;
  sequencesByApplication: Record<string, string[]>;
  selectedSequenceId: string | null;
  
  // Documents
  documents: Record<string, ECTDLeafDocument>;
  documentsBySequence: Record<string, string[]>;
  selectedDocumentId: string | null;
  
  // Validation
  validationRules: Record<string, ValidationRule>;
  validationResults: Record<string, ValidationStatus>;
  
  // Publishing
  publishingJobs: Record<string, PublishingJob>;
  activeJobId: string | null;
  
  // UI State
  activeView: ECTDPublishingView;
  filters: ECTDPublishingFilters;
  isLoading: boolean;
  error: string | null;
}

export type ECTDPublishingView =
  | 'applications'
  | 'sequence-builder'
  | 'document-tree'
  | 'validation'
  | 'publishing'
  | 'history';

export interface ECTDPublishingFilters {
  region?: string;
  submissionType?: string;
  status?: SequenceStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

// -----------------------------------------------------------------------------
// HELPER TYPES
// -----------------------------------------------------------------------------

/** Module display configuration */
export interface CTDModuleConfig {
  id: CTDModule;
  number: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  isRegional: boolean;
}

/** Standard CTD module configuration */
export const CTD_MODULE_CONFIG: Record<CTDModule, CTDModuleConfig> = {
  m1: {
    id: 'm1',
    number: '1',
    title: 'Administrative Information and Prescribing Information',
    description: 'Regional administrative information',
    color: '#EF4444', // Red
    icon: 'FileText',
    isRegional: true,
  },
  m2: {
    id: 'm2',
    number: '2',
    title: 'Common Technical Document Summaries',
    description: 'Quality, nonclinical, and clinical summaries',
    color: '#F59E0B', // Amber
    icon: 'BookOpen',
    isRegional: false,
  },
  m3: {
    id: 'm3',
    number: '3',
    title: 'Quality',
    description: 'Drug substance and drug product information',
    color: '#10B981', // Emerald
    icon: 'Beaker',
    isRegional: false,
  },
  m4: {
    id: 'm4',
    number: '4',
    title: 'Nonclinical Study Reports',
    description: 'Pharmacology and toxicology studies',
    color: '#6366F1', // Indigo
    icon: 'TestTube',
    isRegional: false,
  },
  m5: {
    id: 'm5',
    number: '5',
    title: 'Clinical Study Reports',
    description: 'Clinical study reports and related information',
    color: '#8B5CF6', // Purple
    icon: 'Activity',
    isRegional: false,
  },
};

// -----------------------------------------------------------------------------
// UTILITY TYPES
// -----------------------------------------------------------------------------

/** Result of validation check */
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    passed: number;
    failed: number;
  };
}

/** Publishing options */
export interface PublishingOptions {
  outputFormat: 'ectd' | 'nees';
  targetGateway?: string;
  validationLevel: 'none' | 'basic' | 'full';
  includeViewerFiles: boolean;
  generateChecksumsOnly?: boolean;
  dryRun?: boolean;
}

/** Sequence comparison result */
export interface SequenceComparison {
  baseSequenceId: string;
  compareSequenceId: string;
  differences: SequenceDifference[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

export interface SequenceDifference {
  type: 'added' | 'removed' | 'modified';
  documentPath: string;
  baseDocument?: ECTDLeafDocument;
  compareDocument?: ECTDLeafDocument;
  changeDetails?: string;
}

// -----------------------------------------------------------------------------
// ID GENERATORS
// -----------------------------------------------------------------------------

/** Generate unique IDs for eCTD entities */
export const generateECTDId = {
  application: () => `app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  sequence: () => `seq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  module: () => `mod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  section: () => `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  document: () => `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  validation: () => `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  job: () => `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  xref: () => `xref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

/** Format sequence number with padding */
export const formatSequenceNumber = (num: number, ectdVersion: ECTDSpecVersion): string => {
  const padding = ectdVersion === '4.0' ? 4 : 4; // Both use 4-digit padding
  return num.toString().padStart(padding, '0');
};

/** Parse section number to parts */
export const parseSectionNumber = (sectionNumber: string): { module: CTDModule; parts: string[] } => {
  const normalized = sectionNumber.toLowerCase().replace(/^m/, '');
  const module = `m${normalized.charAt(0)}` as CTDModule;
  const parts = normalized.split('.');
  return { module, parts };
};
