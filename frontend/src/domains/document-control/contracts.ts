
/**
 * Document Control Domain Contracts
 * Enterprise document management types for lifecycle, versioning, and collaboration
 * 
 * @module domains/document-control
 * @version 0.27.30
 */

// =============================================================================
// COMMON ENUMS
// =============================================================================

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

export type DocumentPermission = 
  | 'view' | 'download' | 'edit' | 'comment' | 'approve' | 'delete' | 'share' | 'manage';

export type DocumentControlView = 
  | 'documents' | 'templates' | 'components' | 'assemblies'
  | 'reviews' | 'workflows' | 'archive' | 'search' | 'analytics' | 'settings'
  | 'versioning';

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

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

// =============================================================================
// CONTENT INTERFACES (for DocumentVersion)
// =============================================================================

export interface ContentSection {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  content: string;
  parentSectionId?: string;
  childSectionIds: string[];
  isRequired: boolean;
  hasContent: boolean;
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
  position: 'first' | 'odd' | 'even' | 'all';
  content: string;
  includeDocumentNumber: boolean;
  includeVersion: boolean;
  includeDate: boolean;
}

export interface DocumentFooter {
  id: string;
  position: 'first' | 'odd' | 'even' | 'all';
  content: string;
  includePageNumber: boolean;
  includeConfidentiality: boolean;
}

export interface ContentCitation {
  id: string;
  citationKey: string;
  fullReference: string;
  documentId?: string;
  externalUrl?: string;
  pageReferences: string[];
}

export interface CrossReference {
  id: string;
  referenceType: 'section' | 'table' | 'figure' | 'document' | 'external';
  targetId: string;
  targetLabel: string;
  displayText: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  firstOccurrencePage?: number;
}

export interface Abbreviation {
  id: string;
  abbreviation: string;
  expansion: string;
  firstOccurrencePage?: number;
}

export interface ExtractedTable {
  id: string;
  tableNumber: string;
  title: string;
  pageNumber: number;
  rows: number;
  columns: number;
  hasHeader: boolean;
}

export interface ExtractedFigure {
  id: string;
  figureNumber: string;
  title: string;
  pageNumber: number;
  caption?: string;
}

export interface ExtractedEquation {
  id: string;
  equationNumber: string;
  latex?: string;
  description?: string;
  pageNumber: number;
}

export interface DocumentContent {
  id: string;
  versionId: string;
  sections: ContentSection[];
  toc: TableOfContentsEntry[];
  headers: DocumentHeader[];
  footers: DocumentFooter[];
  watermark?: string;
  citations: ContentCitation[];
  crossReferences: CrossReference[];
  glossaryTerms: GlossaryTerm[];
  abbreviations: Abbreviation[];
  tables: ExtractedTable[];
  figures: ExtractedFigure[];
  equations: ExtractedEquation[];
}

export interface DiffChange {
  id: string;
  type: 'added' | 'removed' | 'modified' | 'moved';
  sectionId?: string;
  beforeText?: string;
  afterText?: string;
  position: { start: number; end: number };
}

export interface ContentDiff {
  id: string;
  fromVersionId: string;
  toVersionId: string;
  generatedAt: string;
  addedSections: number;
  removedSections: number;
  modifiedSections: number;
  addedWords: number;
  removedWords: number;
  changes: DiffChange[];
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

// =============================================================================
// CORE DOCUMENT INTERFACES
// =============================================================================

export interface EnterpriseDocument {
  id: string;
  documentId: string;
  title: string;
  description: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  contentType: ContentType;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  versionHistory: DocumentVersionRef[];
  baselineId?: string;
  status: DocumentStatus;
  effectiveDate?: string;
  expirationDate?: string;
  retiredDate?: string;
  ownerId: string;
  ownerName: string;
  ownerDepartment: string;
  authorId: string;
  authorName: string;
  collaborators: DocumentCollaborator[];
  fileFormat: FileFormat;
  filePath: string;
  fileSize: number;
  fileChecksum: string;
  pageCount?: number;
  wordCount?: number;
  contentHash: string;
  folders: string[];
  tags: string[];
  keywords: string[];
  language: string;
  locale?: string;
  parentDocumentId?: string;
  childDocumentIds: string[];
  relatedDocumentIds: string[];
  linkedModules: ModuleLink[];
  attachments: DocumentAttachment[];
  customMetadata: Record<string, string | number | boolean>;
  securityClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top-secret';
  accessControlList: AccessControlEntry[];
  archiveStatus: ArchiveStatus;
  retentionCategory: RetentionCategory;
  retentionPeriodYears: number;
  retentionExpiryDate?: string;
  legalHoldIds: string[];
  dispositionDate?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  content: DocumentContent;
  contentHash: string;
  filePath: string;
  fileSize: number;
  changeDescription: string;
  changeType: 'major' | 'minor' | 'patch' | 'editorial';
  changedSections: string[];
  diffFromPrevious?: ContentDiff;
  status: DocumentStatus;
  effectiveDate?: string;
  retiredDate?: string;
  workflowInstanceId?: string;
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  createdBy: string;
  lockedAt?: string;
  lockedBy?: string;
  isBaseline: boolean;
  baselineLabel?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'regulatory': 'Regulatory',
  'clinical': 'Clinical',
  'safety': 'Safety',
  'quality': 'Quality',
  'manufacturing': 'Manufacturing',
  'nonclinical': 'Nonclinical',
  'cmc': 'CMC',
  'labeling': 'Labeling',
  'correspondence': 'Correspondence',
  'administrative': 'Administrative',
  'training': 'Training',
  'reference': 'Reference',
  'template': 'Template',
  'archive': 'Archive',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  'draft': 'Draft',
  'in-review': 'In Review',
  'pending-approval': 'Pending Approval',
  'approved': 'Approved',
  'effective': 'Effective',
  'superseded': 'Superseded',
  'retired': 'Retired',
  'archived': 'Archived',
  'on-hold': 'On Hold',
  'rejected': 'Rejected',
};

export const FILE_FORMAT_LABELS: Record<FileFormat, string> = {
  'docx': 'Word Document',
  'pdf': 'PDF',
  'xlsx': 'Excel Spreadsheet',
  'pptx': 'PowerPoint',
  'xml': 'XML',
  'json': 'JSON',
  'txt': 'Plain Text',
  'rtf': 'Rich Text',
  'html': 'HTML',
  'md': 'Markdown',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format document version string
 */
export function formatVersionString(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

/**
 * Check if document is in a final state
 */
export function isDocumentFinal(status: DocumentStatus): boolean {
  return ['effective', 'superseded', 'retired', 'archived'].includes(status);
}

/**
 * Check if document is editable
 */
export function isDocumentEditable(status: DocumentStatus): boolean {
  return ['draft', 'on-hold', 'rejected'].includes(status);
}

/**
 * Check if document requires approval
 */
export function requiresApproval(status: DocumentStatus): boolean {
  return status === 'pending-approval';
}
