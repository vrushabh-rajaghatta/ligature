
/**
 * Authoring Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for document authoring types in Ligature.
 * Covers document lifecycle, sections, review workflow, templates,
 * and component library.
 * 
 * @module domains/authoring/contracts
 * @version 0.27.22
 */

// =============================================================================
// CTD SECTION TYPES
// =============================================================================

export type CTDModule = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

export type CTDSectionCode = 
  | '1.1' | '1.2' | '1.3'                              // Module 1: Regional
  | '2.2' | '2.3' | '2.4' | '2.5' | '2.6' | '2.7'     // Module 2: Summaries
  | '3.2.S' | '3.2.P' | '3.2.A' | '3.3'              // Module 3: Quality
  | '4.2.1' | '4.2.2' | '4.2.3'                      // Module 4: Nonclinical
  | '5.2' | '5.3.1' | '5.3.3' | '5.3.5' | '5.3.6';  // Module 5: Clinical

// =============================================================================
// DOCUMENT TYPE ENUMS
// =============================================================================

export type DocumentType = 
  // Clinical
  | 'protocol' | 'ib' | 'csr' | 'ise' | 'iss' | 'sap' | 'icf'
  // Module 2 Summaries
  | 'module-2-summary' | 'module-24' | 'module-25' | 'module-26' | 'module-27'
  // Module 3 Quality
  | 'module-3-quality' | 'module-32s' | 'module-32p' | 'module-32a' | 'module-33'
  // Labeling
  | 'uspi' | 'ccds' | 'smpc' | 'pil'
  // Safety
  | 'dsur' | 'pbrer'
  // Other
  | 'briefing-book' | 'other';

export type DocumentStatus = 
  | 'not-started'
  | 'prerequisites-pending'
  | 'ready-to-start'
  | 'drafting'
  | 'internal-review'
  | 'cross-functional-review'
  | 'qc-review'
  | 'final-review'
  | 'approved'
  | 'submission-ready'
  | 'superseded';

export type SectionStatus = 
  | 'not-started'
  | 'in-progress'
  | 'ready-for-review'
  | 'in-review'
  | 'revisions-needed'
  | 'approved';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

// =============================================================================
// REVIEW WORKFLOW ENUMS
// =============================================================================

export type ReviewerRole = 
  | 'author' | 'medical-writer' | 'reviewer'
  | 'medical-monitor' | 'statistician' | 'regulatory'
  | 'qc' | 'approver' | 'publishing';

export type CommentType = 'query' | 'suggestion' | 'correction' | 'clarification' | 'approval';

export type CommentPriority = 'high' | 'medium' | 'low';

export type CommentStatus = 'open' | 'in-progress' | 'resolved' | 'rejected';

// =============================================================================
// CONTENT & COMPONENT ENUMS
// =============================================================================

export type ContentBlockType = 'text' | 'table' | 'figure' | 'list' | 'component' | 'tfl-reference';

export type ContentBlockStatus = 'draft' | 'reviewed' | 'approved';

export type TFLType = 'table' | 'figure' | 'listing';

export type ComponentCategory = 
  | 'safety-statement' | 'efficacy-claim' | 'mechanism-of-action'
  | 'pharmacokinetics' | 'manufacturing' | 'regulatory-boilerplate'
  | 'study-design' | 'statistical-methods' | 'background' | 'conclusions';

export type ComponentStatus = 'draft' | 'in-review' | 'approved' | 'retired';

// =============================================================================
// PREREQUISITE & SOURCE ENUMS
// =============================================================================

export type PrerequisiteType = 'document' | 'data' | 'approval' | 'milestone';

export type PrerequisiteStatus = 'pending' | 'available' | 'not-required';

export type SourceLinkType = 'reference' | 'auto-populated' | 'derived';

export type SourceStatus = 'current' | 'updated' | 'superseded';

// =============================================================================
// HISTORY & AUDIT ENUMS
// =============================================================================

export type HistoryAction = 
  | 'created' | 'section-edited' | 'section-completed'
  | 'comment-added' | 'comment-resolved'
  | 'sent-for-review' | 'review-completed' | 'revision-requested'
  | 'approved' | 'version-created' | 'status-changed'
  | 'assigned' | 'due-date-changed';

export type NarrativeType = 'death' | 'sae' | 'discontinuation' | 'other';

export type NarrativeSource = 'authored' | 'imported-safety';

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface CTDSectionInfo {
  section: CTDSectionCode;
  module: CTDModule;
  title: string;
  description: string;
}

export interface AuthoringDocumentSummary {
  id: string;
  documentType: DocumentType;
  title: string;
  shortTitle: string;
  version: string;
  status: DocumentStatus;
  progress: number;
  authorName: string;
  dueDate?: string;
  priority: Priority;
}

export interface DocumentSectionSummary {
  id: string;
  number: string;
  title: string;
  level: number;
  status: SectionStatus;
  progress: number;
  wordCount: number;
  hasUnresolvedComments: boolean;
}

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  componentId?: string;
  componentVersion?: string;
  tflId?: string;
  tflType?: TFLType;
  sourceDocumentId?: string;
  sourceSection?: string;
  status: ContentBlockStatus;
  lastEditedAt: string;
  lastEditedBy: string;
}

export interface SectionComment {
  id: string;
  sectionId: string;
  type: CommentType;
  text: string;
  highlightedText?: string;
  priority: CommentPriority;
  authorId: string;
  authorName: string;
  authorRole: ReviewerRole;
  status: CommentStatus;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDocumentLink {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  version: string;
  sectionNumber?: string;
  sectionTitle?: string;
  linkType: SourceLinkType;
  sourceStatus: SourceStatus;
  lastChecked: string;
}

export interface TFLLink {
  id: string;
  tflId: string;
  tflNumber: string;
  tflTitle: string;
  tflType: TFLType;
  studyId: string;
  studyName: string;
  status: ContentBlockStatus;
  version: string;
  lastUpdated: string;
  referencedInSections: string[];
  insertedInSections: string[];
}

export interface Prerequisite {
  id: string;
  name: string;
  description: string;
  type: PrerequisiteType;
  status: PrerequisiteStatus;
  sourceId?: string;
  expectedDate?: string;
  availableDate?: string;
}

export interface DocumentHistoryEntry {
  id: string;
  documentId: string;
  action: HistoryAction;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  sectionId?: string;
  sectionNumber?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewStage {
  id: string;
  name: string;
  order: number;
  reviewerRoles: ReviewerRole[];
  requiredApprovals: number;
  currentApprovals: number;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

export interface ComponentLibraryItem {
  id: string;
  title: string;
  category: ComponentCategory;
  subcategory?: string;
  content: string;
  contentType: ContentBlockType;
  version: string;
  status: ComponentStatus;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  usedInDocuments: string[];
  applicableDocumentTypes: DocumentType[];
  applicableTherapeuticAreas?: string[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingReview {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  stageName: string;
  requestedBy: string;
  requestedAt: string;
  dueDate: string;
  sectionsToReview: string[];
  commentCount: number;
  priority: Priority;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  'not-started': 'Not Started',
  'prerequisites-pending': 'Prerequisites Pending',
  'ready-to-start': 'Ready to Start',
  'drafting': 'Drafting',
  'internal-review': 'Internal Review',
  'cross-functional-review': 'Cross-Functional Review',
  'qc-review': 'QC Review',
  'final-review': 'Final Review',
  'approved': 'Approved',
  'submission-ready': 'Submission Ready',
  'superseded': 'Superseded',
};

export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'ready-for-review': 'Ready for Review',
  'in-review': 'In Review',
  'revisions-needed': 'Revisions Needed',
  'approved': 'Approved',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

export const REVIEWER_ROLE_LABELS: Record<ReviewerRole, string> = {
  'author': 'Author',
  'medical-writer': 'Medical Writer',
  'reviewer': 'Reviewer',
  'medical-monitor': 'Medical Monitor',
  'statistician': 'Statistician',
  'regulatory': 'Regulatory',
  'qc': 'QC',
  'approver': 'Approver',
  'publishing': 'Publishing',
};

export const COMPONENT_CATEGORY_LABELS: Record<ComponentCategory, string> = {
  'safety-statement': 'Safety Statement',
  'efficacy-claim': 'Efficacy Claim',
  'mechanism-of-action': 'Mechanism of Action',
  'pharmacokinetics': 'Pharmacokinetics',
  'manufacturing': 'Manufacturing',
  'regulatory-boilerplate': 'Regulatory Boilerplate',
  'study-design': 'Study Design',
  'statistical-methods': 'Statistical Methods',
  'background': 'Background',
  'conclusions': 'Conclusions',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-800',
  'prerequisites-pending': 'bg-yellow-100 text-yellow-800',
  'ready-to-start': 'bg-blue-100 text-blue-800',
  'drafting': 'bg-indigo-100 text-indigo-800',
  'internal-review': 'bg-purple-100 text-purple-800',
  'cross-functional-review': 'bg-violet-100 text-violet-800',
  'qc-review': 'bg-orange-100 text-orange-800',
  'final-review': 'bg-amber-100 text-amber-800',
  'approved': 'bg-green-100 text-green-800',
  'submission-ready': 'bg-teal-100 text-teal-800',
  'superseded': 'bg-gray-200 text-gray-600',
};

export const SECTION_STATUS_COLORS: Record<SectionStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'ready-for-review': 'bg-purple-100 text-purple-800',
  'in-review': 'bg-orange-100 text-orange-800',
  'revisions-needed': 'bg-red-100 text-red-800',
  'approved': 'bg-green-100 text-green-800',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  'critical': 'bg-red-100 text-red-800',
  'high': 'bg-orange-100 text-orange-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-gray-100 text-gray-800',
};

export const COMMENT_STATUS_COLORS: Record<CommentStatus, string> = {
  'open': 'bg-red-100 text-red-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'rejected': 'bg-gray-100 text-gray-800',
};

// CTD Section metadata
export const CTD_SECTION_INFO: Record<CTDSectionCode, CTDSectionInfo> = {
  '1.1': { section: '1.1', module: 'm1', title: 'Forms', description: 'Application forms' },
  '1.2': { section: '1.2', module: 'm1', title: 'Cover Letters', description: 'Cover letters and correspondence' },
  '1.3': { section: '1.3', module: 'm1', title: 'Administrative Information', description: 'Labels, patents, certifications' },
  '2.2': { section: '2.2', module: 'm2', title: 'CTD Introduction', description: 'Introduction to CTD' },
  '2.3': { section: '2.3', module: 'm2', title: 'Quality Overall Summary', description: 'Quality summary document' },
  '2.4': { section: '2.4', module: 'm2', title: 'Nonclinical Overview', description: 'Overview of nonclinical studies' },
  '2.5': { section: '2.5', module: 'm2', title: 'Clinical Overview', description: 'Overview of clinical development' },
  '2.6': { section: '2.6', module: 'm2', title: 'Nonclinical Summary', description: 'Written and tabulated summaries' },
  '2.7': { section: '2.7', module: 'm2', title: 'Clinical Summary', description: 'Summary of clinical studies' },
  '3.2.S': { section: '3.2.S', module: 'm3', title: 'Drug Substance', description: 'Drug substance CMC information' },
  '3.2.P': { section: '3.2.P', module: 'm3', title: 'Drug Product', description: 'Drug product CMC information' },
  '3.2.A': { section: '3.2.A', module: 'm3', title: 'Appendices', description: 'CMC appendices' },
  '3.3': { section: '3.3', module: 'm3', title: 'Literature References', description: 'Quality literature references' },
  '4.2.1': { section: '4.2.1', module: 'm4', title: 'Pharmacology', description: 'Pharmacology study reports' },
  '4.2.2': { section: '4.2.2', module: 'm4', title: 'Pharmacokinetics', description: 'Nonclinical PK reports' },
  '4.2.3': { section: '4.2.3', module: 'm4', title: 'Toxicology', description: 'Toxicology study reports' },
  '5.2': { section: '5.2', module: 'm5', title: 'Clinical Studies Listing', description: 'Tabular listing of studies' },
  '5.3.1': { section: '5.3.1', module: 'm5', title: 'Biopharmaceutics', description: 'BA/BE study reports' },
  '5.3.3': { section: '5.3.3', module: 'm5', title: 'Human PK Reports', description: 'Clinical PK reports' },
  '5.3.5': { section: '5.3.5', module: 'm5', title: 'Clinical Study Reports', description: 'Efficacy and safety studies' },
  '5.3.6': { section: '5.3.6', module: 'm5', title: 'Post-Marketing', description: 'Post-marketing experience reports' },
};

// Document type to default CTD section mapping
export const DOCUMENT_TYPE_TO_CTD: Partial<Record<DocumentType, CTDSectionCode>> = {
  'csr': '5.3.5',
  'protocol': '5.3.5',
  'module-25': '2.5',
  'module-27': '2.7',
  'module-24': '2.4',
  'module-26': '2.6',
  'module-32s': '3.2.S',
  'module-32p': '3.2.P',
  'module-32a': '3.2.A',
  'module-33': '3.3',
  'ib': '5.3.5',
  'ise': '5.3.5',
  'iss': '5.3.5',
  'sap': '5.3.5',
  'dsur': '5.3.5',
  'pbrer': '5.3.5',
  'uspi': '1.3',
  'ccds': '1.3',
  'smpc': '1.3',
  'pil': '1.3',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

const DOCUMENT_STATUSES: DocumentStatus[] = [
  'not-started', 'prerequisites-pending', 'ready-to-start', 'drafting',
  'internal-review', 'cross-functional-review', 'qc-review', 'final-review',
  'approved', 'submission-ready', 'superseded'
];

const SECTION_STATUSES: SectionStatus[] = [
  'not-started', 'in-progress', 'ready-for-review', 'in-review', 'revisions-needed', 'approved'
];

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];

const COMMENT_STATUSES: CommentStatus[] = ['open', 'in-progress', 'resolved', 'rejected'];

export function isDocumentStatus(value: string): value is DocumentStatus {
  return DOCUMENT_STATUSES.includes(value as DocumentStatus);
}

export function isSectionStatus(value: string): value is SectionStatus {
  return SECTION_STATUSES.includes(value as SectionStatus);
}

export function isPriority(value: string): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

export function isCommentStatus(value: string): value is CommentStatus {
  return COMMENT_STATUSES.includes(value as CommentStatus);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if document is in a reviewable state
 */
export function isDocumentReviewable(status: DocumentStatus): boolean {
  return ['internal-review', 'cross-functional-review', 'qc-review', 'final-review'].includes(status);
}

/**
 * Check if document is editable
 */
export function isDocumentEditable(status: DocumentStatus): boolean {
  return ['not-started', 'prerequisites-pending', 'ready-to-start', 'drafting'].includes(status);
}

/**
 * Check if document is finalized
 */
export function isDocumentFinalized(status: DocumentStatus): boolean {
  return ['approved', 'submission-ready', 'superseded'].includes(status);
}

/**
 * Calculate overall document progress from sections
 */
export function calculateDocumentProgress(sections: DocumentSectionSummary[]): number {
  if (sections.length === 0) return 0;
  const totalProgress = sections.reduce((sum, s) => sum + s.progress, 0);
  return Math.round(totalProgress / sections.length);
}

/**
 * Count unresolved comments across sections
 */
export function countUnresolvedComments(comments: SectionComment[]): number {
  return comments.filter(c => c.status === 'open' || c.status === 'in-progress').length;
}

/**
 * Check if all prerequisites are met
 */
export function arePrerequisitesMet(prerequisites: Prerequisite[]): boolean {
  return prerequisites.every(p => p.status === 'available' || p.status === 'not-required');
}

/**
 * Get CTD module from section code
 */
export function getModuleFromSection(section: CTDSectionCode): CTDModule {
  return CTD_SECTION_INFO[section].module;
}

/**
 * Get default CTD section for a document type
 */
export function getDefaultCTDSection(docType: DocumentType): CTDSectionCode | undefined {
  return DOCUMENT_TYPE_TO_CTD[docType];
}

/**
 * Check if document is overdue
 */
export function isDocumentOverdue(dueDate: string | undefined, status: DocumentStatus): boolean {
  if (!dueDate) return false;
  if (isDocumentFinalized(status)) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Get next workflow status
 */
export function getNextDocumentStatus(current: DocumentStatus): DocumentStatus | null {
  const workflow: DocumentStatus[] = [
    'not-started', 'prerequisites-pending', 'ready-to-start', 'drafting',
    'internal-review', 'cross-functional-review', 'qc-review', 'final-review',
    'approved', 'submission-ready'
  ];
  const idx = workflow.indexOf(current);
  return idx >= 0 && idx < workflow.length - 1 ? workflow[idx + 1] : null;
}
