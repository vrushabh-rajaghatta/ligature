
// ============================================================================
// Document Control Types - Enterprise Document Management (v58)
// Comprehensive types for document lifecycle management, content assembly,
// collaboration, version control, archives, and cross-module integration
// ============================================================================

// ============================================================================
// COMMON ENUMS & BASE TYPES
// ============================================================================

export type DocumentCategory = 
  | 'regulatory' | 'clinical' | 'safety' | 'quality' | 'manufacturing'
  | 'nonclinical' | 'cmc' | 'labeling' | 'correspondence' | 'administrative'
  | 'training' | 'reference' | 'template' | 'archive';

export type DocumentClassification = 
  | 'controlled' | 'uncontrolled' | 'reference' | 'working' | 'archive' | 'template';

export type ContentType = 
  | 'document' | 'template' | 'component' | 'fragment' | 'boilerplate' | 'attachment';

export type FileFormat = 
  | 'docx' | 'pdf' | 'xlsx' | 'pptx' | 'xml' | 'json' | 'txt' | 'rtf' | 'html' | 'md';

export type DocumentStatus = 
  | 'draft' | 'in-review' | 'pending-approval' | 'approved' | 'effective'
  | 'superseded' | 'retired' | 'archived' | 'on-hold' | 'rejected';

export type ReviewStatus = 
  | 'not-started' | 'in-progress' | 'completed' | 'awaiting-revision' | 'cancelled';

export type CollaborationRole = 
  | 'author' | 'co-author' | 'reviewer' | 'approver' | 'editor' | 'contributor' | 'viewer';

export type AnnotationType = 
  | 'comment' | 'suggestion' | 'question' | 'resolution' | 'highlight' | 'strikethrough';

export type ArchiveStatus = 
  | 'active' | 'archived' | 'legal-hold' | 'pending-destruction' | 'destroyed';

export type RetentionCategory = 
  | 'regulatory-submission' | 'clinical-trial' | 'safety-report' | 'manufacturing'
  | 'quality-record' | 'business-record' | 'temporary' | 'permanent';

// ============================================================================
// DOCUMENT MANAGEMENT - CORE ENTITIES
// ============================================================================

export interface EnterpriseDocument {
  id: string;
  documentId: string; // Unique business identifier (e.g., DOC-2024-00001)
  title: string;
  description: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  contentType: ContentType;
  
  // Versioning
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  versionHistory: DocumentVersionRef[];
  baselineId?: string; // For variants/derivatives
  
  // Status & Lifecycle
  status: DocumentStatus;
  effectiveDate?: string;
  expirationDate?: string;
  retiredDate?: string;
  
  // Ownership
  ownerId: string;
  ownerName: string;
  ownerDepartment: string;
  authorId: string;
  authorName: string;
  collaborators: DocumentCollaborator[];
  
  // Content
  fileFormat: FileFormat;
  filePath: string;
  fileSize: number;
  fileChecksum: string;
  pageCount?: number;
  wordCount?: number;
  contentHash: string; // For change detection
  
  // Organization
  folders: string[];
  tags: string[];
  keywords: string[];
  language: string;
  locale?: string;
  
  // Relationships
  parentDocumentId?: string;
  childDocumentIds: string[];
  relatedDocumentIds: string[];
  linkedModules: ModuleLink[];
  attachments: DocumentAttachment[];
  
  // Metadata
  customMetadata: Record<string, string | number | boolean>;
  securityClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top-secret';
  accessControlList: AccessControlEntry[];
  
  // Archive & Retention
  archiveStatus: ArchiveStatus;
  retentionCategory: RetentionCategory;
  retentionPeriodYears: number;
  retentionExpiryDate?: string;
  legalHoldIds: string[];
  dispositionDate?: string;
  
  // Audit Trail
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
}

export interface DocumentVersionRef {
  versionId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  createdAt: string;
  createdBy: string;
  changeDescription: string;
  status: DocumentStatus;
}

export interface DocumentCollaborator {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: CollaborationRole;
  permissions: DocumentPermission[];
  addedAt: string;
  addedBy: string;
  isActive: boolean;
}

export type DocumentPermission = 
  | 'view' | 'download' | 'edit' | 'comment' | 'approve' | 'delete' | 'share' | 'manage';

export interface ModuleLink {
  id: string;
  moduleType: 'portfolio' | 'authoring' | 'submissions' | 'haq' | 'safety' | 'clinical' | 'ctms' | 'tmf' | 'qms' | 'regulatory-intel';
  moduleEntityId: string;
  moduleEntityName: string;
  linkType: 'source' | 'reference' | 'attachment' | 'output' | 'derivative';
  createdAt: string;
  createdBy: string;
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  isInline: boolean;
}

export interface AccessControlEntry {
  id: string;
  principalType: 'user' | 'group' | 'role' | 'department';
  principalId: string;
  principalName: string;
  permissions: DocumentPermission[];
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

// ============================================================================
// VERSION CONTROL
// ============================================================================

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  
  // Content Snapshot
  content: DocumentContent;
  contentHash: string;
  filePath: string;
  fileSize: number;
  
  // Change Tracking
  changeDescription: string;
  changeType: 'major' | 'minor' | 'patch' | 'editorial';
  changedSections: string[];
  diffFromPrevious?: ContentDiff;
  
  // Status
  status: DocumentStatus;
  effectiveDate?: string;
  retiredDate?: string;
  
  // Workflow
  workflowInstanceId?: string;
  approvalRecords: ApprovalRecord[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  lockedAt?: string;
  lockedBy?: string;
  isBaseline: boolean;
  baselineLabel?: string;
}

export interface DocumentContent {
  id: string;
  versionId: string;
  
  // Structured Content
  sections: ContentSection[];
  toc: TableOfContentsEntry[];
  
  // Metadata within content
  headers: DocumentHeader[];
  footers: DocumentFooter[];
  watermark?: string;
  
  // References
  citations: ContentCitation[];
  crossReferences: CrossReference[];
  glossaryTerms: GlossaryTerm[];
  abbreviations: Abbreviation[];
  
  // Extracted Data
  tables: ExtractedTable[];
  figures: ExtractedFigure[];
  equations: ExtractedEquation[];
}

export interface ContentSection {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  content: string;
  contentType: 'text' | 'table' | 'figure' | 'list' | 'mixed';
  subsections: ContentSection[];
  sourceComponentId?: string;
  isBoilerplate: boolean;
  lastModified: string;
  modifiedBy: string;
}

export interface TableOfContentsEntry {
  id: string;
  sectionId: string;
  sectionNumber: string;
  title: string;
  level: number;
  pageNumber?: number;
}

export interface DocumentHeader {
  id: string;
  position: 'all' | 'first' | 'odd' | 'even';
  content: string;
  includesDocumentId: boolean;
  includesVersion: boolean;
  includesPageNumber: boolean;
}

export interface DocumentFooter {
  id: string;
  position: 'all' | 'first' | 'odd' | 'even';
  content: string;
  includesPageNumber: boolean;
  includesConfidentiality: boolean;
}

export interface ContentCitation {
  id: string;
  citationNumber: number;
  citationText: string;
  sourceDocumentId?: string;
  sourceType: 'internal' | 'external' | 'literature';
  bibliographicInfo?: string;
  url?: string;
  accessDate?: string;
}

export interface CrossReference {
  id: string;
  sourceSection: string;
  targetSection: string;
  targetDocumentId?: string;
  referenceText: string;
  referenceType: 'section' | 'table' | 'figure' | 'equation' | 'page';
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  firstOccurrence: string;
  occurrenceCount: number;
}

export interface Abbreviation {
  id: string;
  abbreviation: string;
  expansion: string;
  firstOccurrence: string;
  occurrenceCount: number;
}

export interface ExtractedTable {
  id: string;
  tableNumber: string;
  title: string;
  sectionId: string;
  pageNumber?: number;
  rowCount: number;
  columnCount: number;
  hasHeader: boolean;
  footnotes: string[];
}

export interface ExtractedFigure {
  id: string;
  figureNumber: string;
  title: string;
  sectionId: string;
  pageNumber?: number;
  figureType: 'chart' | 'diagram' | 'image' | 'graph' | 'flowchart';
  caption?: string;
}

export interface ExtractedEquation {
  id: string;
  equationNumber: string;
  latex?: string;
  description?: string;
  sectionId: string;
}

export interface ContentDiff {
  id: string;
  fromVersionId: string;
  toVersionId: string;
  generatedAt: string;
  
  // Summary
  addedSections: number;
  removedSections: number;
  modifiedSections: number;
  addedWords: number;
  removedWords: number;
  
  // Details
  changes: DiffChange[];
}

export interface DiffChange {
  id: string;
  changeType: 'added' | 'removed' | 'modified';
  sectionId: string;
  sectionTitle: string;
  previousContent?: string;
  newContent?: string;
  changeDescription: string;
}

export interface ApprovalRecord {
  id: string;
  versionId: string;
  approverRole: string;
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected' | 'pending' | 'escalated';
  comments?: string;
  signatureId?: string;
  decisionDate?: string;
  dueDate: string;
}

// ============================================================================
// CONTENT ASSEMBLY & TEMPLATES
// ============================================================================

export interface DocumentTemplate {
  id: string;
  templateId: string; // Business identifier (e.g., TPL-001)
  name: string;
  description: string;
  category: DocumentCategory;
  documentType: string; // e.g., 'Clinical Study Report', 'PSUR', 'Module 2.5'
  
  // Template Structure
  structure: TemplateSection[];
  requiredComponents: string[];
  optionalComponents: string[];
  
  // Default Settings
  defaultFormat: FileFormat;
  defaultClassification: DocumentClassification;
  defaultSecurityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Placeholders
  variables: TemplateVariable[];
  conditionalSections: ConditionalSection[];
  
  // Style
  styleGuide?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  coverPageTemplate?: string;
  
  // Metadata
  version: string;
  isActive: boolean;
  regulatoryFramework?: string;
  applicableRegions: string[];
  
  // Usage Stats
  usageCount: number;
  lastUsedAt?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export interface TemplateSection {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  contentType: 'fixed' | 'variable' | 'component' | 'optional';
  defaultContent?: string;
  componentId?: string;
  instructions?: string;
  maxLength?: number;
  minLength?: number;
  isRequired: boolean;
  subsections: TemplateSection[];
}

export interface TemplateVariable {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'lookup';
  defaultValue?: string;
  validationRules?: string[];
  lookupSource?: string;
  isRequired: boolean;
}

export interface ConditionalSection {
  id: string;
  sectionId: string;
  condition: string; // Expression to evaluate
  conditionDescription: string;
  showWhenTrue: boolean;
}

export interface ContentComponent {
  id: string;
  componentId: string; // Business identifier (e.g., CMP-001)
  name: string;
  description: string;
  category: DocumentCategory;
  componentType: 'boilerplate' | 'standard-text' | 'regulatory-text' | 'disclaimer' | 'appendix';
  
  // Content
  content: string;
  contentFormat: 'text' | 'html' | 'markdown' | 'rtf';
  
  // Variables
  variables: TemplateVariable[];
  
  // Applicability
  applicableDocTypes: string[];
  applicableRegions: string[];
  regulatoryFramework?: string;
  
  // Versioning
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  
  // Status
  status: 'draft' | 'approved' | 'effective' | 'retired';
  
  // Usage Stats
  usageCount: number;
  usedInDocuments: string[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export interface DocumentAssembly {
  id: string;
  assemblyId: string; // Business identifier
  name: string;
  description: string;
  templateId: string;
  outputDocumentId?: string;
  
  // Assembly Status
  status: 'draft' | 'in-progress' | 'assembled' | 'finalized' | 'cancelled';
  
  // Configuration
  variableValues: Record<string, string>;
  selectedComponents: SelectedComponent[];
  sectionOverrides: SectionOverride[];
  
  // Output Settings
  outputFormat: FileFormat;
  outputFileName: string;
  
  // Assembly Log
  assemblySteps: AssemblyStep[];
  validationResults: AssemblyValidation[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  assembledAt?: string;
  assembledBy?: string;
}

export interface SelectedComponent {
  id: string;
  componentId: string;
  targetSectionId: string;
  variableValues: Record<string, string>;
  customizations?: string;
}

export interface SectionOverride {
  id: string;
  sectionId: string;
  overrideType: 'content' | 'include' | 'exclude';
  customContent?: string;
  reason: string;
}

export interface AssemblyStep {
  id: string;
  stepNumber: number;
  action: string;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  details?: string;
  timestamp?: string;
}

export interface AssemblyValidation {
  id: string;
  validationType: 'structure' | 'content' | 'reference' | 'format';
  status: 'passed' | 'failed' | 'warning';
  message: string;
  location?: string;
}

// ============================================================================
// COLLABORATION & REVIEW
// ============================================================================

export interface ReviewCycle {
  id: string;
  reviewCycleId: string; // Business identifier
  documentId: string;
  documentVersionId: string;
  
  // Configuration
  reviewType: 'internal' | 'external' | 'regulatory' | 'cross-functional';
  reviewPurpose: string;
  
  // Schedule
  startDate: string;
  dueDate: string;
  completedDate?: string;
  
  // Status
  status: ReviewStatus;
  currentRound: number;
  maxRounds: number;
  
  // Participants
  reviewCoordinator: string;
  reviewCoordinatorId: string;
  reviewers: ReviewerAssignment[];
  
  // Review Items
  annotations: Annotation[];
  reviewComments: ReviewComment[];
  
  // Resolution
  resolutionSummary?: string;
  unresolvedCount: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface ReviewerAssignment {
  id: string;
  reviewCycleId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  role: 'primary' | 'secondary' | 'subject-matter-expert' | 'qc';
  department?: string;
  
  // Assignment
  assignedSections: string[];
  assignedAt: string;
  dueDate: string;
  
  // Progress
  status: 'assigned' | 'in-progress' | 'completed' | 'declined';
  startedAt?: string;
  completedAt?: string;
  
  // Feedback
  overallComments?: string;
  recommendation?: 'approve' | 'revise' | 'reject';
  annotationCount: number;
}

export interface Annotation {
  id: string;
  reviewCycleId: string;
  documentVersionId: string;
  
  // Location
  sectionId?: string;
  pageNumber?: number;
  startPosition?: number;
  endPosition?: number;
  selectedText?: string;
  
  // Annotation
  annotationType: AnnotationType;
  content: string;
  suggestedText?: string;
  
  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  
  // Author
  authorId: string;
  authorName: string;
  createdAt: string;
  
  // Resolution
  status: 'open' | 'accepted' | 'rejected' | 'modified' | 'deferred';
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  
  // Replies
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  annotationId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  reviewCycleId: string;
  reviewerAssignmentId: string;
  
  // Comment
  commentType: 'general' | 'section-specific' | 'summary';
  sectionId?: string;
  content: string;
  
  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Status
  status: 'open' | 'addressed' | 'closed' | 'deferred';
  addressedAt?: string;
  addressedBy?: string;
  response?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
}

export interface CollaborativeSession {
  id: string;
  documentId: string;
  documentVersionId: string;
  
  // Session Info
  sessionType: 'editing' | 'review' | 'presentation';
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  
  // Participants
  hostId: string;
  hostName: string;
  participants: SessionParticipant[];
  maxParticipants: number;
  
  // Activity
  activityLog: SessionActivity[];
  
  // Cursor Tracking (for real-time)
  cursorPositions: Record<string, CursorPosition>;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  joinedAt: string;
  leftAt?: string;
  role: 'host' | 'editor' | 'viewer';
  isActive: boolean;
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  activityType: 'join' | 'leave' | 'edit' | 'comment' | 'cursor-move';
  details?: string;
  timestamp: string;
}

export interface CursorPosition {
  userId: string;
  sectionId?: string;
  position: number;
  lastUpdated: string;
}

// ============================================================================
// WORKFLOW & APPROVALS
// ============================================================================

export interface DocumentWorkflow {
  id: string;
  workflowId: string; // Business identifier
  name: string;
  description: string;
  
  // Applicability
  documentCategories: DocumentCategory[];
  documentTypes: string[];
  classifications: DocumentClassification[];
  
  // Workflow Definition
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  
  // Settings
  isActive: boolean;
  requiresElectronicSignature: boolean;
  allowParallelApprovals: boolean;
  escalationEnabled: boolean;
  escalationDays: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  
  // Type
  stepType: 'review' | 'approval' | 'qc-check' | 'notification' | 'task' | 'decision';
  
  // Assignment
  assignmentType: 'role' | 'user' | 'group' | 'dynamic';
  assignedRoles?: string[];
  assignedUserIds?: string[];
  assignedGroupIds?: string[];
  dynamicAssignmentRule?: string;
  
  // Requirements
  isRequired: boolean;
  requiresAllApprovers: boolean;
  minApprovers: number;
  
  // Actions
  allowedActions: WorkflowAction[];
  
  // SLA
  slaHours?: number;
  reminderBeforeHours?: number;
}

export type WorkflowAction = 
  | 'approve' | 'reject' | 'request-revision' | 'escalate' | 'delegate' | 'skip' | 'comment';

export interface WorkflowTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  condition?: string;
  action: WorkflowAction;
  isDefault: boolean;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  documentId: string;
  documentVersionId: string;
  
  // Progress
  status: 'active' | 'completed' | 'cancelled' | 'on-hold' | 'escalated';
  currentStepId: string;
  currentStepNumber: number;
  
  // Timeline
  startedAt: string;
  startedBy: string;
  completedAt?: string;
  dueDate?: string;
  
  // Step History
  stepHistory: WorkflowStepExecution[];
  
  // Data
  workflowData: Record<string, unknown>;
}

export interface WorkflowStepExecution {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  stepNumber: number;
  stepName: string;
  
  // Execution
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'escalated';
  startedAt?: string;
  completedAt?: string;
  
  // Assignment
  assignedTo: string[];
  assignedToNames: string[];
  
  // Actions
  executedBy?: string;
  executedByName?: string;
  action?: WorkflowAction;
  comments?: string;
  signatureId?: string;
  
  // SLA
  dueDate?: string;
  isOverdue: boolean;
}

export interface ElectronicSignature {
  id: string;
  documentVersionId: string;
  workflowStepExecutionId?: string;
  
  // Signer
  signerId: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  
  // Signature
  signatureType: 'approval' | 'acknowledgment' | 'authorship' | 'witness';
  meaning: string;
  
  // Authentication
  authenticationMethod: 'password' | 'mfa' | 'biometric' | 'certificate';
  authenticationTimestamp: string;
  
  // Verification
  signatureHash: string;
  certificateId?: string;
  ipAddress?: string;
  
  // 21 CFR Part 11 Compliance
  manifestation: string; // What the signature represents
  signedAt: string;
  isValid: boolean;
}

// ============================================================================
// ARCHIVE & RETENTION
// ============================================================================

export interface ArchivePolicy {
  id: string;
  policyId: string;
  name: string;
  description: string;
  
  // Scope
  applicableCategories: DocumentCategory[];
  applicableClassifications: DocumentClassification[];
  
  // Retention Rules
  retentionPeriodYears: number;
  retentionBasis: string;
  regulatoryRequirement?: string;
  
  // Triggers
  retentionStartEvent: 'creation' | 'effective-date' | 'retirement' | 'project-close' | 'custom';
  customStartEventDescription?: string;
  
  // Actions
  archiveAction: 'retain' | 'destroy' | 'review';
  destructionApprovalRequired: boolean;
  destructionApprovers: string[];
  
  // Audit
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface LegalHold {
  id: string;
  holdId: string; // Business identifier
  name: string;
  description: string;
  
  // Scope
  matterName: string;
  matterNumber: string;
  caseType: 'litigation' | 'investigation' | 'regulatory' | 'audit' | 'other';
  
  // Custodians
  custodians: LegalHoldCustodian[];
  
  // Documents
  documentIds: string[];
  searchCriteria?: LegalHoldSearchCriteria;
  
  // Timeline
  effectiveDate: string;
  releasedDate?: string;
  expirationDate?: string;
  
  // Status
  status: 'active' | 'released' | 'expired';
  
  // Audit
  issuedBy: string;
  issuedByName: string;
  issuedAt: string;
  releasedBy?: string;
  releasedByName?: string;
  updatedAt: string;
}

export interface LegalHoldCustodian {
  id: string;
  userId: string;
  userName: string;
  email: string;
  department: string;
  acknowledgedAt?: string;
  remindersSent: number;
  lastReminderAt?: string;
}

export interface LegalHoldSearchCriteria {
  categories?: DocumentCategory[];
  classifications?: DocumentClassification[];
  dateRange?: { start: string; end: string };
  keywords?: string[];
  authors?: string[];
  departments?: string[];
}

export interface ArchiveRecord {
  id: string;
  documentId: string;
  documentVersionId?: string;
  
  // Archive Info
  archiveDate: string;
  archivedBy: string;
  archiveLocation: string;
  archiveFormat: 'original' | 'pdf-a' | 'both';
  
  // Retention
  retentionPolicyId: string;
  retentionExpiryDate: string;
  
  // Status
  status: ArchiveStatus;
  
  // Disposition
  dispositionDate?: string;
  dispositionMethod?: 'secure-delete' | 'physical-destruction' | 'transfer';
  dispositionApprovedBy?: string;
  dispositionEvidence?: string;
  
  // Legal Hold
  isOnLegalHold: boolean;
  legalHoldIds: string[];
  
  // Access Log
  accessLog: ArchiveAccessEntry[];
}

export interface ArchiveAccessEntry {
  id: string;
  archiveRecordId: string;
  userId: string;
  userName: string;
  accessType: 'view' | 'download' | 'restore';
  accessedAt: string;
  ipAddress?: string;
  reason?: string;
}

// ============================================================================
// SEARCH & ANALYTICS
// ============================================================================

export interface DocumentSearchQuery {
  id: string;
  queryText?: string;
  
  // Filters
  categories?: DocumentCategory[];
  classifications?: DocumentClassification[];
  statuses?: DocumentStatus[];
  fileFormats?: FileFormat[];
  
  // Date Ranges
  createdDateRange?: { start: string; end: string };
  modifiedDateRange?: { start: string; end: string };
  effectiveDateRange?: { start: string; end: string };
  
  // People
  authorIds?: string[];
  ownerIds?: string[];
  collaboratorIds?: string[];
  
  // Content
  contentContains?: string[];
  sectionTitles?: string[];
  tags?: string[];
  keywords?: string[];
  
  // Module Links
  linkedModules?: string[];
  linkedEntityIds?: string[];
  
  // Sort
  sortBy: 'relevance' | 'date-created' | 'date-modified' | 'title' | 'version';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  offset: number;
  limit: number;
}

export interface DocumentSearchResult {
  id: string;
  queryId: string;
  
  // Results
  totalCount: number;
  documents: SearchResultDocument[];
  
  // Facets
  categoryFacets: SearchFacet[];
  statusFacets: SearchFacet[];
  authorFacets: SearchFacet[];
  formatFacets: SearchFacet[];
  
  // Timing
  executedAt: string;
  executionTimeMs: number;
}

export interface SearchResultDocument {
  documentId: string;
  title: string;
  description: string;
  category: DocumentCategory;
  status: DocumentStatus;
  version: string;
  
  // Match Info
  relevanceScore: number;
  matchedFields: string[];
  highlightedSnippets: HighlightedSnippet[];
  
  // Quick Info
  authorName: string;
  createdAt: string;
  updatedAt: string;
  fileFormat: FileFormat;
  pageCount?: number;
}

export interface HighlightedSnippet {
  field: string;
  snippet: string;
  matchPositions: { start: number; end: number }[];
}

export interface SearchFacet {
  value: string;
  count: number;
  selected: boolean;
}

export interface ContentReuseAnalysis {
  id: string;
  documentId: string;
  analyzedAt: string;
  
  // Similar Content
  similarDocuments: SimilarDocument[];
  
  // Reuse Opportunities
  reuseOpportunities: ReuseOpportunity[];
  
  // Component Candidates
  componentCandidates: ComponentCandidate[];
}

export interface SimilarDocument {
  documentId: string;
  documentTitle: string;
  similarityScore: number;
  matchedSections: string[];
  matchType: 'exact' | 'near-duplicate' | 'similar' | 'derivative';
}

export interface ReuseOpportunity {
  id: string;
  sourceDocumentId: string;
  sourceSectionId: string;
  targetDocumentId: string;
  targetSectionId: string;
  similarity: number;
  recommendation: string;
}

export interface ComponentCandidate {
  id: string;
  sectionId: string;
  content: string;
  occurrenceCount: number;
  documents: string[];
  suggestedComponentType: string;
  automationPotential: 'high' | 'medium' | 'low';
}

export interface DocumentAnalytics {
  // Overview
  totalDocuments: number;
  totalVersions: number;
  totalStorageBytes: number;
  
  // By Category
  documentsByCategory: Record<DocumentCategory, number>;
  documentsByStatus: Record<DocumentStatus, number>;
  documentsByClassification: Record<DocumentClassification, number>;
  
  // Activity
  documentsCreatedLast30Days: number;
  documentsModifiedLast30Days: number;
  averageVersionsPerDocument: number;
  
  // Collaboration
  activeReviewCycles: number;
  pendingApprovals: number;
  averageReviewDays: number;
  
  // Archive
  documentsInArchive: number;
  documentsOnLegalHold: number;
  documentsNearingRetention: number;
  
  // Trends
  creationTrend: TrendDataPoint[];
  modificationTrend: TrendDataPoint[];
  reviewCompletionTrend: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// CROSS-MODULE INTEGRATION
// ============================================================================

export interface ModuleDocumentMapping {
  id: string;
  documentId: string;
  
  // Module Info
  moduleType: 'portfolio' | 'authoring' | 'submissions' | 'haq' | 'safety' | 'clinical' | 'ctms' | 'tmf' | 'qms' | 'regulatory-intel' | 'aggregate-reports';
  moduleEntityId: string;
  moduleEntityType: string;
  moduleEntityName: string;
  
  // Link Type
  linkType: 'source' | 'output' | 'reference' | 'attachment' | 'supporting' | 'derivative';
  
  // Sync
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncStatus: 'synced' | 'pending' | 'error' | 'disabled';
  
  // Audit
  createdAt: string;
  createdBy: string;
}

export interface DocumentSyncEvent {
  id: string;
  mappingId: string;
  
  // Event
  eventType: 'created' | 'updated' | 'deleted' | 'status-changed' | 'version-created';
  sourceModule: string;
  targetModule: string;
  
  // Data
  eventData: Record<string, unknown>;
  
  // Status
  status: 'pending' | 'processed' | 'failed';
  processedAt?: string;
  errorMessage?: string;
  
  // Audit
  createdAt: string;
}

// ============================================================================
// UI & STATE
// ============================================================================

export type DocumentControlView = 
  | 'documents' | 'templates' | 'components' | 'assemblies'
  | 'reviews' | 'workflows' | 'archive' | 'search' | 'analytics' | 'settings'
  | 'versioning';

export interface DocumentControlFilters {
  categories: DocumentCategory[];
  classifications: DocumentClassification[];
  statuses: DocumentStatus[];
  formats: FileFormat[];
  owners: string[];
  authors: string[];
  departments: string[];
  tags: string[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}

export interface DocumentControlState {
  // Documents
  documents: Record<string, EnterpriseDocument>;
  documentsByDocId: Record<string, string>; // documentId -> id mapping
  versions: Record<string, DocumentVersion>;
  versionsByDocument: Record<string, string[]>;
  
  // Templates & Components
  templates: Record<string, DocumentTemplate>;
  components: Record<string, ContentComponent>;
  assemblies: Record<string, DocumentAssembly>;
  
  // Collaboration
  reviewCycles: Record<string, ReviewCycle>;
  reviewCyclesByDocument: Record<string, string[]>;
  annotations: Record<string, Annotation>;
  sessions: Record<string, CollaborativeSession>;
  
  // Workflow
  workflows: Record<string, DocumentWorkflow>;
  workflowInstances: Record<string, WorkflowInstance>;
  instancesByDocument: Record<string, string[]>;
  signatures: Record<string, ElectronicSignature>;
  
  // Archive
  archivePolicies: Record<string, ArchivePolicy>;
  legalHolds: Record<string, LegalHold>;
  archiveRecords: Record<string, ArchiveRecord>;
  archiveByDocument: Record<string, string>;
  
  // Search
  savedSearches: Record<string, DocumentSearchQuery>;
  recentSearches: DocumentSearchQuery[];
  searchResults?: DocumentSearchResult;
  
  // Analytics
  analytics: DocumentAnalytics | null;
  contentReuseAnalyses: Record<string, ContentReuseAnalysis>;
  
  // Module Integration
  moduleMappings: Record<string, ModuleDocumentMapping>;
  mappingsByDocument: Record<string, string[]>;
  syncEvents: Record<string, DocumentSyncEvent>;
  
  // UI State
  selectedDocumentId: string | null;
  selectedTemplateId: string | null;
  selectedReviewCycleId: string | null;
  selectedWorkflowId: string | null;
  activeView: DocumentControlView;
  filters: DocumentControlFilters;
  isLoading: boolean;
  error: string | null;
}

export interface DocumentControlActions {
  // Document CRUD
  createDocument: (data: Partial<EnterpriseDocument>) => EnterpriseDocument;
  updateDocument: (id: string, updates: Partial<EnterpriseDocument>) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string, newTitle: string) => EnterpriseDocument;
  
  // Version Management
  createVersion: (documentId: string, changeDescription: string, changeType: DocumentVersion['changeType']) => DocumentVersion;
  lockVersion: (versionId: string, lockedBy: string) => void;
  unlockVersion: (versionId: string) => void;
  compareVersions: (fromVersionId: string, toVersionId: string) => ContentDiff;
  createBaseline: (versionId: string, label: string) => void;
  
  // Status Management
  submitForReview: (documentId: string) => void;
  submitForApproval: (documentId: string) => void;
  approveDocument: (versionId: string, approverId: string, comments?: string) => void;
  rejectDocument: (versionId: string, approverId: string, reason: string) => void;
  makeEffective: (versionId: string, effectiveDate: string) => void;
  retireDocument: (documentId: string, reason: string) => void;
  supersede: (oldDocumentId: string, newDocumentId: string) => void;
  
  // Upload Integration (v0.13.42)
  createDocumentFromUpload: (documentData: Partial<EnterpriseDocument>, versionInfo?: { isNewVersion: boolean; previousDocumentId?: string }) => EnterpriseDocument;
  
  // Templates
  createTemplate: (data: Partial<DocumentTemplate>) => DocumentTemplate;
  updateTemplate: (id: string, updates: Partial<DocumentTemplate>) => void;
  deleteTemplate: (id: string) => void;
  createDocumentFromTemplate: (templateId: string, variables: Record<string, string>) => EnterpriseDocument;
  
  // Components
  createComponent: (data: Partial<ContentComponent>) => ContentComponent;
  updateComponent: (id: string, updates: Partial<ContentComponent>) => void;
  deleteComponent: (id: string) => void;
  insertComponent: (documentId: string, sectionId: string, componentId: string, variables: Record<string, string>) => void;
  
  // Assemblies
  createAssembly: (data: Partial<DocumentAssembly>) => DocumentAssembly;
  updateAssembly: (id: string, updates: Partial<DocumentAssembly>) => void;
  executeAssembly: (assemblyId: string) => EnterpriseDocument | null;
  validateAssembly: (assemblyId: string) => AssemblyValidation[];
  
  // Collaboration
  addCollaborator: (documentId: string, userId: string, role: CollaborationRole, permissions: DocumentPermission[]) => DocumentCollaborator;
  removeCollaborator: (documentId: string, collaboratorId: string) => void;
  updateCollaboratorPermissions: (documentId: string, collaboratorId: string, permissions: DocumentPermission[]) => void;
  
  // Review Cycles
  createReviewCycle: (data: Partial<ReviewCycle>) => ReviewCycle;
  assignReviewer: (reviewCycleId: string, reviewer: Partial<ReviewerAssignment>) => ReviewerAssignment;
  removeReviewer: (reviewCycleId: string, assignmentId: string) => void;
  startReviewCycle: (reviewCycleId: string) => void;
  completeReviewerAssignment: (assignmentId: string, recommendation: ReviewerAssignment['recommendation'], comments?: string) => void;
  completeReviewCycle: (reviewCycleId: string, summary: string) => void;
  
  // Annotations
  addAnnotation: (data: Partial<Annotation>) => Annotation;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  resolveAnnotation: (id: string, resolution: Annotation['status'], notes?: string) => void;
  replyToAnnotation: (annotationId: string, content: string) => AnnotationReply;
  
  // Workflows
  createWorkflow: (data: Partial<DocumentWorkflow>) => DocumentWorkflow;
  updateWorkflow: (id: string, updates: Partial<DocumentWorkflow>) => void;
  startWorkflow: (documentVersionId: string, workflowId: string) => WorkflowInstance;
  executeWorkflowAction: (instanceId: string, action: WorkflowAction, comments?: string) => void;
  cancelWorkflow: (instanceId: string, reason: string) => void;
  
  // Signatures
  signDocument: (data: Partial<ElectronicSignature>) => ElectronicSignature;
  verifySignature: (signatureId: string) => boolean;
  
  // Archive
  createArchivePolicy: (data: Partial<ArchivePolicy>) => ArchivePolicy;
  updateArchivePolicy: (id: string, updates: Partial<ArchivePolicy>) => void;
  archiveDocument: (documentId: string, policyId: string) => ArchiveRecord;
  restoreFromArchive: (archiveRecordId: string) => void;
  
  // Legal Hold
  createLegalHold: (data: Partial<LegalHold>) => LegalHold;
  addDocumentToLegalHold: (holdId: string, documentId: string) => void;
  removeDocumentFromLegalHold: (holdId: string, documentId: string) => void;
  releaseLegalHold: (holdId: string, releasedBy: string) => void;
  
  // Search
  searchDocuments: (query: DocumentSearchQuery) => DocumentSearchResult;
  saveSearch: (query: DocumentSearchQuery, name: string) => void;
  deleteSavedSearch: (queryId: string) => void;
  
  // Analytics
  analyzeContentReuse: (documentId: string) => ContentReuseAnalysis;
  calculateAnalytics: () => DocumentAnalytics;
  
  // Module Integration
  linkToModule: (documentId: string, moduleType: ModuleDocumentMapping['moduleType'], moduleEntityId: string, linkType: ModuleDocumentMapping['linkType']) => ModuleDocumentMapping;
  unlinkFromModule: (mappingId: string) => void;
  syncWithModule: (mappingId: string) => void;
  
  // UI Actions
  setSelectedDocumentId: (id: string | null) => void;
  setSelectedTemplateId: (id: string | null) => void;
  setSelectedReviewCycleId: (id: string | null) => void;
  setSelectedWorkflowId: (id: string | null) => void;
  setActiveView: (view: DocumentControlView) => void;
  setFilters: (filters: Partial<DocumentControlFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}
