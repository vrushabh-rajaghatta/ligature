
// ============================================================================
// eCTD Building Types - v70: Submission Building Depth
// ============================================================================
// Real eCTD sequence building with proper validation, backbone generation,
// document linking, and compliance checking per ICH M2/M4/M8 specifications.
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type ECTDFormatVersion = '3.2.2' | '4.0';
export type RegionalVariant = 'us' | 'eu' | 'jp' | 'ca' | 'cn' | 'kr' | 'au' | 'br' | 'ich';

export type SubmissionType = 
  | 'original' | 'amendment' | 'supplement' | 'annual-report' 
  | 'correspondence' | 'ir-response' | 'crl-response' | 'rems'
  | 'labeling-change' | 'cbala' | 'original-pma' | 'premarket-notification'
  | 'type-ia' | 'type-ib' | 'type-ii' | 'renewal' | 'psur' | 'rmp-update';

export type SubmissionSubType = 
  | 'efficacy' | 'safety' | 'manufacturing' | 'labeling' 
  | 'cmc-supplement' | 'ind-safety-report' | 'ind-amendment'
  | 'nonclinical' | 'clinical' | 'general' | 'orphan';

export type DocumentOperation = 'new' | 'replace' | 'append' | 'delete';
export type LeafStatus = 'pending' | 'assigned' | 'validated' | 'approved' | 'error';
export type ValidationLevel = 'error' | 'warning' | 'info';
export type ChecksumAlgorithm = 'md5' | 'sha256' | 'sha1';
export type PublishingChannel = 'esg' | 'etd' | 'portal' | 'email' | 'physical';
export type GatewayRegion = 'us-fda' | 'eu-ema' | 'jp-pmda' | 'ca-hc' | 'cn-nmpa' | 'kr-mfds';

// ============================================================================
// BACKBONE XML STRUCTURES
// ============================================================================

export interface BackboneDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'xml' | 'xpt' | 'sas' | 'r' | 'other';
  operation: DocumentOperation;
  checksum: string;
  checksumType: ChecksumAlgorithm;
  modifiedFile: string | null; // Reference to previous version if replace
  xlink?: string; // For hyperlinks
  attributes?: Record<string, string>;
}

export interface CTDLeaf {
  id: string;
  sectionId: string; // e.g., "m1-2-cover-letters" or "3.2.S.4.1"
  sectionPath: string[]; // Breadcrumb ["3", "3.2", "3.2.S", "3.2.S.4", "3.2.S.4.1"]
  sectionTitle: string;
  document: BackboneDocument | null;
  status: LeafStatus;
  sequence: number; // Order within section
  required: boolean;
  repeatNumber?: number; // For repeating sections like multiple studies
  manufacturerName?: string; // For CMC sections organized by manufacturer
  studyId?: string; // For clinical sections organized by study
  validationResults: LeafValidationResult[];
}

export interface LeafValidationResult {
  ruleId: string;
  ruleName: string;
  level: ValidationLevel;
  message: string;
  field?: string;
  suggestion?: string;
  autoFixable: boolean;
}

// ============================================================================
// CTD SECTION DEFINITIONS
// ============================================================================

export interface CTDSectionDefinition {
  id: string;
  number: string; // e.g., "2.7.4"
  title: string;
  path: string; // Full path like "m2/27-clin-sum/274-summ-clin-safety"
  required: boolean;
  repeatable: boolean;
  acceptedFileTypes: string[];
  maxFiles: number;
  description: string;
  guidance: string;
  regionalRequirements: RegionalRequirement[];
  children?: CTDSectionDefinition[];
}

export interface RegionalRequirement {
  region: RegionalVariant;
  required: boolean;
  specificGuidance?: string;
  additionalAttributes?: Record<string, string>;
}

// ============================================================================
// SEQUENCE BUILDING
// ============================================================================

export interface SequenceBuild {
  id: string;
  applicationId: string;
  applicationNumber: string; // NDA-123456
  sequenceNumber: string; // "0001", "0002", etc.
  
  // Submission details
  submissionType: SubmissionType;
  submissionSubType?: SubmissionSubType;
  submissionDescription: string;
  targetAgency: GatewayRegion;
  ectdVersion: ECTDFormatVersion;
  regionalVariant: RegionalVariant;
  
  // Timeline
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  targetSubmissionDate: string;
  
  // Content
  modules: ModuleBuild[];
  totalLeaves: number;
  assignedLeaves: number;
  validatedLeaves: number;
  
  // Metadata
  applicationMetadata: ApplicationMetadata;
  submissionMetadata: SubmissionMetadata;
  
  // Status
  status: SequenceBuildStatus;
  buildProgress: BuildProgress;
  validationSummary: ValidationSummary;
}

export type SequenceBuildStatus = 
  | 'draft' | 'building' | 'validating' | 'ready-for-review'
  | 'in-review' | 'approved' | 'publishing' | 'submitted' | 'error';

export interface BuildProgress {
  phase: BuildPhase;
  percentComplete: number;
  currentStep: string;
  estimatedTimeRemaining?: number; // Minutes
  steps: BuildStep[];
}

export type BuildPhase = 
  | 'planning' | 'document-assignment' | 'validation' 
  | 'backbone-generation' | 'packaging' | 'review' | 'complete';

export interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  message?: string;
}

export interface ModuleBuild {
  moduleNumber: string; // "1", "2", "3", "4", "5"
  moduleName: string;
  sections: SectionBuild[];
  leafCount: number;
  assignedCount: number;
  validatedCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export interface SectionBuild {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  path: string;
  leaves: CTDLeaf[];
  children: SectionBuild[];
  required: boolean;
  status: 'empty' | 'partial' | 'complete' | 'error';
}

// ============================================================================
// APPLICATION METADATA
// ============================================================================

export interface ApplicationMetadata {
  // Identifiers
  applicationNumber: string;
  applicationType: string; // NDA, BLA, ANDA, MAA, etc.
  
  // Product information
  productName: string;
  proprietaryName?: string;
  establishedName: string;
  dosageForm: string;
  routeOfAdministration: string;
  strength: string;
  
  // Sponsor information
  sponsorName: string;
  sponsorAddress: Address;
  sponsorContact: ContactInfo;
  
  // Application references
  relatedApplications?: RelatedApplication[];
  crossReferences?: CrossReference[];
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  fax?: string;
}

export interface RelatedApplication {
  type: 'reference' | 'cross-reference' | 'parent' | 'amendment-to';
  applicationNumber: string;
  sequenceNumber?: string;
  description: string;
}

export interface CrossReference {
  section: string; // CTD section being referenced
  applicationNumber: string;
  sequenceNumber: string;
  documentTitle: string;
}

// ============================================================================
// SUBMISSION METADATA (XML index.xml content)
// ============================================================================

export interface SubmissionMetadata {
  // Core identification
  submissionId: string;
  submissionType: SubmissionType;
  submissionSubType?: SubmissionSubType;
  submissionUnit: string;
  
  // Timing
  submissionDate: string;
  effectiveDate?: string;
  
  // Cover letter info
  coverLetterTitle?: string;
  coverLetterDate?: string;
  
  // Categorization
  reviewPriority?: 'standard' | 'priority' | 'accelerated' | 'breakthrough';
  orphanDesignation?: boolean;
  pediatricUse?: 'approved' | 'pending' | 'not-applicable';
  
  // Regional
  regionalSubmissionInfo?: RegionalSubmissionInfo;
}

export interface RegionalSubmissionInfo {
  // US-specific
  fdaCenter?: 'CDER' | 'CBER' | 'CDRH';
  fdaDivision?: string;
  userFeeStatus?: 'paid' | 'exempt' | 'pending';
  
  // EU-specific
  procedureType?: 'centralised' | 'decentralised' | 'mutual-recognition' | 'national';
  rapporteur?: string;
  coRapporteur?: string;
  
  // JP-specific
  pmdarDivision?: string;
  
  // General
  additionalInfo?: Record<string, string>;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationSummary {
  lastValidated: string;
  validatedBy: string;
  
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  
  errors: number;
  warnings: number;
  info: number;
  
  categories: ValidationCategoryResult[];
  criticalIssues: ValidationIssue[];
  
  canSubmit: boolean;
  blockers: string[];
}

export interface ValidationCategoryResult {
  category: ValidationCategory;
  name: string;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  warnings: number;
}

export type ValidationCategory = 
  | 'structure' | 'naming' | 'content' | 'pdf-compliance' 
  | 'xml-schema' | 'checksum' | 'hyperlinks' | 'regional' 
  | 'business-rules' | 'metadata';

export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  level: ValidationLevel;
  code: string;
  title: string;
  message: string;
  location: IssueLocation;
  rule: ValidationRuleRef;
  fixSuggestion?: string;
  autoFixable: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  justification?: string;
}

export interface IssueLocation {
  module: string;
  section?: string;
  sectionTitle?: string;
  leafId?: string;
  documentName?: string;
  elementPath?: string; // XPath for XML issues
  pageNumber?: number; // For PDF issues
}

export interface ValidationRuleRef {
  ruleId: string;
  ruleName: string;
  specification: string; // e.g., "ICH M2 v3.2.2", "FDA eCTD Technical Conformance Guide"
  section: string;
}

// ============================================================================
// VALIDATION RULES (Built-in rule definitions)
// ============================================================================

export interface ValidationRule {
  id: string;
  name: string;
  category: ValidationCategory;
  level: ValidationLevel;
  description: string;
  specification: string;
  specificationSection: string;
  applies: RuleApplicability;
  check: RuleCheck;
}

export interface RuleApplicability {
  ectdVersions: ECTDFormatVersion[];
  regions: RegionalVariant[];
  submissionTypes?: SubmissionType[];
  modules?: string[];
  fileTypes?: string[];
}

export interface RuleCheck {
  type: 'regex' | 'xpath' | 'schema' | 'custom' | 'structural';
  pattern?: string;
  xpath?: string;
  schemaRef?: string;
  customCheckId?: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// BACKBONE GENERATION
// ============================================================================

export interface BackboneConfig {
  outputFormat: 'xml' | 'json';
  includeOptionalElements: boolean;
  includeEmptySections: boolean;
  validateOnGenerate: boolean;
  generateChecksums: boolean;
  checksumAlgorithm: ChecksumAlgorithm;
  prettyPrint: boolean;
  indentation: number;
}

export interface BackboneGenerationResult {
  success: boolean;
  backbone: GeneratedBackbone | null;
  errors: BackboneError[];
  warnings: string[];
  generationTime: number; // ms
}

export interface GeneratedBackbone {
  xml: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  checksumType: ChecksumAlgorithm;
  generatedAt: string;
  leafCount: number;
  structure: BackboneStructure;
}

export interface BackboneStructure {
  totalModules: number;
  totalSections: number;
  totalLeaves: number;
  documentsByType: Record<string, number>;
  operationsByType: Record<DocumentOperation, number>;
}

export interface BackboneError {
  code: string;
  message: string;
  location: string;
  fatal: boolean;
}

// ============================================================================
// DOCUMENT LINKING & HYPERLINKS
// ============================================================================

export interface DocumentLink {
  id: string;
  sourceLeafId: string;
  sourceDocumentName: string;
  sourcePage?: number;
  sourceAnchor?: string;
  
  targetLeafId: string;
  targetDocumentName: string;
  targetPage?: number;
  targetAnchor?: string;
  
  linkType: LinkType;
  xlink: string;
  status: 'valid' | 'broken' | 'pending-validation';
  validatedAt?: string;
}

export type LinkType = 
  | 'internal-ctd' | 'cross-reference' | 'external-url' 
  | 'bookmark' | 'toc-entry' | 'appendix';

export interface HyperlinkValidationResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  unresolvedLinks: number;
  issues: HyperlinkIssue[];
}

export interface HyperlinkIssue {
  linkId: string;
  sourceDocument: string;
  targetDocument: string;
  issueType: 'broken' | 'missing-target' | 'invalid-format' | 'cross-sequence';
  message: string;
  fixSuggestion?: string;
}

// ============================================================================
// PACKAGING & PUBLISHING
// ============================================================================

export interface PublishingPackage {
  id: string;
  sequenceBuildId: string;
  packageName: string;
  
  // Package contents
  files: PackagedFile[];
  totalSize: number; // bytes
  fileCount: number;
  
  // Package info
  format: 'zip' | 'tar' | 'folder';
  compressed: boolean;
  encrypted: boolean;
  
  // Status
  status: 'building' | 'ready' | 'submitted' | 'acknowledged' | 'error';
  createdAt: string;
  createdBy: string;
  
  // Submission details
  submissionChannel: PublishingChannel;
  gatewayRegion: GatewayRegion;
  acknowledgmentId?: string;
  acknowledgmentDate?: string;
}

export interface PackagedFile {
  id: string;
  path: string; // Path within package
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  checksumType: ChecksumAlgorithm;
  source: 'leaf' | 'backbone' | 'envelope' | 'utility';
  leafId?: string;
}

// ============================================================================
// TEMPLATES & PRESETS
// ============================================================================

export interface SequenceTemplate {
  id: string;
  name: string;
  description: string;
  submissionType: SubmissionType;
  submissionSubType?: SubmissionSubType;
  ectdVersion: ECTDFormatVersion;
  targetRegion: RegionalVariant;
  
  // Predefined structure
  requiredSections: string[];
  suggestedSections: string[];
  excludedSections?: string[];
  
  // Document type mappings
  documentMappings: TemplateDocumentMapping[];
  
  // Metadata defaults
  defaultMetadata: Partial<SubmissionMetadata>;
  
  // Usage tracking
  usageCount: number;
  lastUsed?: string;
  createdBy: string;
  createdAt: string;
}

export interface TemplateDocumentMapping {
  sectionId: string;
  documentTypes: string[]; // Types of documents typically placed here
  required: boolean;
  guidance: string;
}

// ============================================================================
// COMPARISON & DIFF
// ============================================================================

export interface SequenceComparison {
  baseSequence: string;
  compareSequence: string;
  
  addedLeaves: string[];
  removedLeaves: string[];
  modifiedLeaves: string[];
  unchangedLeaves: string[];
  
  addedSections: string[];
  removedSections: string[];
  modifiedSections: string[];
  
  documentDiffs: DocumentDiff[];
}

export interface DocumentDiff {
  leafId: string;
  sectionId: string;
  documentName: string;
  changeType: 'added' | 'removed' | 'replaced' | 'appended' | 'modified';
  previousVersion?: string;
  currentVersion?: string;
  changeDescription: string;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface SequenceBuildAuditEntry {
  id: string;
  sequenceBuildId: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: SequenceBuildAction;
  details: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

export type SequenceBuildAction = 
  | 'created' | 'document-assigned' | 'document-removed' 
  | 'validation-run' | 'validation-acknowledged' | 'backbone-generated'
  | 'status-changed' | 'metadata-updated' | 'submitted' | 'exported'
  | 'leaf-added' | 'leaf-removed' | 'section-added' | 'review-approved'
  | 'review-rejected' | 'comment-added' | 'template-applied';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export interface ECTDBuildingState {
  // Sequence builds
  builds: Record<string, SequenceBuild>;
  selectedBuildId: string | null;
  
  // Templates
  templates: Record<string, SequenceTemplate>;
  
  // Validation rules
  validationRules: Record<string, ValidationRule>;
  
  // Comparison
  activeComparison: SequenceComparison | null;
  
  // UI state
  view: ECTDBuildingView;
  filters: ECTDBuildingFilters;
  expandedSections: Set<string>;
  selectedLeafId: string | null;
  
  // Operations
  isValidating: boolean;
  isGeneratingBackbone: boolean;
  isPublishing: boolean;
  
  // Errors
  error: string | null;
}

export type ECTDBuildingView = 
  | 'builder' | 'tree-view' | 'document-list' 
  | 'validation' | 'backbone' | 'compare' | 'publish';

export interface ECTDBuildingFilters {
  status: LeafStatus | 'all';
  module: string | 'all';
  hasDocument: boolean | null;
  hasErrors: boolean | null;
  searchQuery: string;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export interface ECTDBuildingActions {
  // Build management
  createBuild: (config: CreateBuildConfig) => SequenceBuild;
  deleteBuild: (buildId: string) => void;
  duplicateBuild: (buildId: string, newSequenceNumber: string) => SequenceBuild;
  selectBuild: (buildId: string | null) => void;
  
  // Document assignment
  assignDocument: (buildId: string, leafId: string, document: BackboneDocument) => void;
  removeDocument: (buildId: string, leafId: string) => void;
  updateLeafOperation: (buildId: string, leafId: string, operation: DocumentOperation) => void;
  
  // Section management
  addSection: (buildId: string, sectionDef: CTDSectionDefinition, parentSectionId?: string) => void;
  removeSection: (buildId: string, sectionId: string) => void;
  addLeaf: (buildId: string, sectionId: string, document?: BackboneDocument) => CTDLeaf;
  removeLeaf: (buildId: string, leafId: string) => void;
  
  // Validation
  runValidation: (buildId: string) => Promise<ValidationSummary>;
  acknowledgeIssue: (buildId: string, issueId: string, justification: string) => void;
  autoFixIssues: (buildId: string) => Promise<number>;
  
  // Backbone generation
  generateBackbone: (buildId: string, config?: BackboneConfig) => Promise<BackboneGenerationResult>;
  previewBackbone: (buildId: string) => string;
  
  // Publishing
  createPackage: (buildId: string, channel: PublishingChannel) => Promise<PublishingPackage>;
  exportPackage: (packageId: string) => Promise<Blob>;
  
  // Templates
  saveAsTemplate: (buildId: string, name: string, description: string) => SequenceTemplate;
  applyTemplate: (buildId: string, templateId: string) => void;
  
  // Comparison
  compareSequences: (baseBuildId: string, compareBuildId: string) => SequenceComparison;
  clearComparison: () => void;
  
  // Metadata
  updateApplicationMetadata: (buildId: string, metadata: Partial<ApplicationMetadata>) => void;
  updateSubmissionMetadata: (buildId: string, metadata: Partial<SubmissionMetadata>) => void;
  
  // Status
  updateBuildStatus: (buildId: string, status: SequenceBuildStatus) => void;
  
  // UI
  setView: (view: ECTDBuildingView) => void;
  setFilters: (filters: Partial<ECTDBuildingFilters>) => void;
  toggleSection: (sectionId: string) => void;
  selectLeaf: (leafId: string | null) => void;
}

// ============================================================================
// CONFIG TYPES
// ============================================================================

export interface CreateBuildConfig {
  applicationId: string;
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: SubmissionType;
  submissionSubType?: SubmissionSubType;
  submissionDescription: string;
  targetAgency: GatewayRegion;
  ectdVersion: ECTDFormatVersion;
  targetSubmissionDate: string;
  applicationMetadata: ApplicationMetadata;
  templateId?: string;
}

// ============================================================================
// PREDEFINED CTD STRUCTURE (Complete ICH M4 structure)
// ============================================================================

export const CTD_SECTION_STRUCTURE: CTDSectionDefinition[] = [
  {
    id: 'm1',
    number: '1',
    title: 'Regional Administrative Information',
    path: 'm1',
    required: true,
    repeatable: false,
    acceptedFileTypes: ['pdf'],
    maxFiles: -1,
    description: 'Module 1 contains region-specific administrative documents',
    guidance: 'Content varies by region. US: FDA forms and certifications. EU: Application forms and declarations.',
    regionalRequirements: [
      { region: 'us', required: true },
      { region: 'eu', required: true },
      { region: 'jp', required: true }
    ]
  },
  {
    id: 'm2',
    number: '2',
    title: 'Common Technical Document Summaries',
    path: 'm2',
    required: true,
    repeatable: false,
    acceptedFileTypes: ['pdf'],
    maxFiles: -1,
    description: 'High-level summaries of quality, nonclinical, and clinical data',
    guidance: 'Summaries should be self-contained and provide overview of data in Modules 3-5',
    regionalRequirements: [
      { region: 'ich', required: true }
    ]
  },
  {
    id: 'm3',
    number: '3',
    title: 'Quality',
    path: 'm3',
    required: true,
    repeatable: false,
    acceptedFileTypes: ['pdf', 'xml'],
    maxFiles: -1,
    description: 'CMC information including drug substance and drug product',
    guidance: 'Follows ICH Q guidelines structure',
    regionalRequirements: [
      { region: 'ich', required: true }
    ]
  },
  {
    id: 'm4',
    number: '4',
    title: 'Nonclinical Study Reports',
    path: 'm4',
    required: true,
    repeatable: false,
    acceptedFileTypes: ['pdf', 'xml', 'xpt'],
    maxFiles: -1,
    description: 'Pharmacology, pharmacokinetics, and toxicology study reports',
    guidance: 'Individual study reports with tabulated summaries',
    regionalRequirements: [
      { region: 'ich', required: true }
    ]
  },
  {
    id: 'm5',
    number: '5',
    title: 'Clinical Study Reports',
    path: 'm5',
    required: true,
    repeatable: false,
    acceptedFileTypes: ['pdf', 'xml', 'xpt', 'sas'],
    maxFiles: -1,
    description: 'Clinical study reports and supporting data',
    guidance: 'ICH E3 format for CSRs. Include datasets per regional requirements.',
    regionalRequirements: [
      { region: 'ich', required: true }
    ]
  }
];
