
// Authoring Module Types - Based on Requirements Document

// ============================================================================
// CTD SECTION MAPPING
// ============================================================================

export type CTDSection = 
  | '1.1'    // Forms
  | '1.2'    // Cover Letters
  | '1.3'    // Administrative Information
  | '2.2'    // CTD Introduction
  | '2.3'    // Quality Overall Summary
  | '2.4'    // Nonclinical Overview
  | '2.5'    // Clinical Overview
  | '2.6'    // Nonclinical Written/Tabulated Summaries
  | '2.7'    // Clinical Summary
  | '3.2.S'  // Drug Substance
  | '3.2.P'  // Drug Product
  | '3.2.A'  // Appendices
  | '3.3'    // Literature References
  | '4.2.1'  // Pharmacology
  | '4.2.2'  // Pharmacokinetics
  | '4.2.3'  // Toxicology
  | '5.2'    // Tabular Listing of Clinical Studies
  | '5.3.1'  // Biopharmaceutics Reports
  | '5.3.3'  // Human PK Reports
  | '5.3.5'  // Clinical Study Reports
  | '5.3.6'  // Post-Marketing Experience;

// CTD Section metadata for mapping
export interface CTDSectionInfo {
  section: CTDSection;
  module: 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
  title: string;
  description: string;
}

// Mapping from document type to default CTD section
export const DOCUMENT_TYPE_TO_CTD: Partial<Record<DocumentType, CTDSection>> = {
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

// CTD section metadata lookup
export const CTD_SECTION_INFO: Record<CTDSection, CTDSectionInfo> = {
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

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType = 
  | 'protocol'
  | 'ib'
  | 'csr'
  | 'module-25'
  | 'module-27'
  // Module 2 documents
  | 'module-2-summary'  // Overall Module 2 Summary
  | 'module-24'    // Nonclinical Overview
  | 'module-26'    // Nonclinical Written & Tabulated Summaries
  // Module 3 Quality
  | 'module-3-quality'  // Overall Module 3 Quality
  | 'module-32s'   // Drug Substance
  | 'module-32p'   // Drug Product
  | 'module-32a'   // Appendices (facilities, adventitious agents)
  | 'module-33'    // Literature References
  // Labeling
  | 'uspi'         // US Prescribing Information
  | 'ccds'         // Company Core Data Sheet
  | 'smpc'         // Summary of Product Characteristics (EU)
  | 'pil'          // Patient Information Leaflet
  // Other
  | 'ise'
  | 'iss'
  | 'sap'
  | 'icf'
  | 'briefing-book'
  | 'dsur'         // Development Safety Update Report
  | 'pbrer'        // Periodic Benefit-Risk Evaluation Report
  | 'other';

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

// ============================================================================
// DOCUMENT STRUCTURE
// ============================================================================

export interface AuthoringDocument {
  id: string;
  
  // Document identification
  documentType: DocumentType;
  title: string;
  shortTitle: string;
  version: string;
  versionDate: string;
  
  // CTD Section mapping (for submission integration)
  ctdSection?: CTDSection;
  ctdModule?: 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
  
  // Context
  programId: string;
  programName: string;
  productId: string;
  productName: string;
  studyId?: string;
  studyName?: string;
  indication?: string;
  
  // Application context (for linking to submissions)
  applicationId?: string;
  applicationNumber?: string;
  
  // Template and schema
  templateId: string;
  templateName: string;
  templateVersion: string;
  
  // Status and workflow
  status: DocumentStatus;
  currentReviewStage?: ReviewStage;
  workflowId: string;
  
  // Finalization tracking
  finalizedAt?: string;
  finalizedBy?: string;
  documentStoreId?: string;  // ID in document store after finalization
  
  // Dates
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  targetDate?: string;
  approvedDate?: string;
  
  // Assignment
  authorId: string;
  authorName: string;
  ownerId: string;
  ownerName: string;
  
  // Progress
  progress: number; // 0-100
  sectionsTotal: number;
  sectionsComplete: number;
  
  // Content
  sections: DocumentSection[];
  
  // Prerequisites
  prerequisites: Prerequisite[];
  prerequisitesMet: boolean;
  
  // Comments and history
  openComments: number;
  totalComments: number;
  history: DocumentHistoryEntry[];
  
  // Related documents
  sourceDocuments: SourceDocumentLink[];
  linkedDocuments: string[];

  // v0.125.32: Co-display artifact model
  artifactType?: 'master' | 'derived' | 'archive';
  // master — shared: which applications reference this document
  sharedAcrossApplications?: { applicationId: string; applicationNumber: string; regionFlag: string }[];
  // derived — local variant: which master it came from + what changed
  masterDocumentId?: string;
  masterDocumentTitle?: string;
  derivationDeltas?: { sectionNumber: string; sectionTitle: string; deltaType: 'language' | 'content' | 'local-requirement'; description: string }[];
  // archive — frozen at submission: immutable, timestamped
  archiveMetadata?: {
    submissionId: string;
    applicationNumber: string;
    sequenceNumber: number;
    archivedAt: string;       // ISO timestamp
    esigHash: string;          // SHA-256
    archivedBy: string;
    ectdPath: string;          // e.g. m5/53-clin-stud-rep/lrg-multisite/
  };
  
  // Metadata
  tags: string[];
  priority: Priority;
  estimatedHours?: number;
  actualHours?: number;
  
  // AI authoring mode
  aiAuthoringMode?: 'section' | 'reuse' | 'document';
  type?: string;
  completionPercentage?: number;
}

export interface DocumentSection {
  id: string;
  number: string;
  title: string;
  level: number; // 1, 2, 3 for heading depth
  
  // Status
  status: SectionStatus;
  progress: number;
  
  // Content
  content?: string;
  contentBlocks: ContentBlock[];
  wordCount: number;
  
  // Assignment
  primaryAuthorId?: string;
  primaryAuthorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  
  // Review
  comments: SectionComment[];
  hasUnresolvedComments: boolean;
  
  // Source data
  sourceLinks: SourceDocumentLink[];
  tflLinks: TFLLink[];
  
  // Subsections
  subsections?: DocumentSection[];
  
  // Metadata & Guidance
  required: boolean;
  guidance?: string;
  aiPrompt?: string;
  wordCountTarget?: { min: number; max: number };
  templateContent?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'table' | 'figure' | 'list' | 'component' | 'tfl-reference';
  content: string;
  
  // If from component library
  componentId?: string;
  componentVersion?: string;
  
  // If TFL reference
  tflId?: string;
  tflType?: 'table' | 'figure' | 'listing';
  
  // Tracking
  sourceDocumentId?: string;
  sourceSection?: string;
  
  // Status
  status: 'draft' | 'reviewed' | 'approved';
  lastEditedAt: string;
  lastEditedBy: string;
}

// ============================================================================
// PREREQUISITES
// ============================================================================

export interface Prerequisite {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'data' | 'approval' | 'milestone';
  
  // Status
  status: 'pending' | 'available' | 'not-required';
  availableDate?: string;
  eta?: string;
  
  // Source
  sourceModule?: string;
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  sourceLink?: string;
  
  // Which sections depend on this
  dependentSections: string[];
  
  // Is this blocking?
  blocking: boolean;
}

// ============================================================================
// REVIEW WORKFLOW
// ============================================================================

export interface ReviewWorkflow {
  id: string;
  name: string;
  description: string;
  documentTypes: DocumentType[];
  isDefault: boolean;
  
  stages: ReviewStageDefinition[];
}

export interface ReviewStageDefinition {
  id: string;
  name: string;
  order: number;
  
  // Reviewers
  requiredRoles: ReviewerRole[];
  optionalRoles: ReviewerRole[];
  
  // Configuration
  durationDays: number;
  requireAllApprovals: boolean;
  allowParallelReview: boolean;
  
  // Actions available
  actions: ReviewAction[];
}

export type ReviewerRole = 
  | 'medical-writer'
  | 'clinical-lead'
  | 'clinical-scientist'
  | 'biostatistician'
  | 'safety-physician'
  | 'clin-pharm-md'
  | 'cmc-lead'
  | 'nonclinical-lead'
  | 'regulatory-lead'
  | 'medical-director'
  | 'qc-specialist'
  | 'project-manager';

export type ReviewAction = 
  | 'approve'
  | 'approve-with-comments'
  | 'request-revision'
  | 'reject'
  | 'delegate'
  | 'skip';

export interface ReviewStage {
  stageId: string;
  stageName: string;
  stageOrder: number;
  
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  
  reviewers: Reviewer[];
  
  // Outcome
  outcome?: 'approved' | 'revisions-requested' | 'rejected';
  outcomeNotes?: string;
}

export interface Reviewer {
  userId: string;
  userName: string;
  role: ReviewerRole;
  
  // Assignment
  assignedSections: string[]; // Section IDs, or 'all'
  isRequired: boolean;
  
  // Status
  status: 'pending' | 'in-progress' | 'completed';
  assignedAt: string;
  dueDate: string;
  completedAt?: string;
  
  // Decision
  decision?: ReviewAction;
  comments?: string;
}

// ============================================================================
// COMMENTS
// ============================================================================

export interface SectionComment {
  id: string;
  sectionId: string;
  
  // Location
  blockId?: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectedText?: string;
  
  // Content
  content: string;
  type: 'comment' | 'suggestion' | 'question' | 'issue';
  priority: 'high' | 'medium' | 'low';
  
  // Author
  authorId: string;
  authorName: string;
  authorRole: ReviewerRole;
  
  // Status
  status: 'open' | 'in-progress' | 'resolved' | 'rejected';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Threading
  parentCommentId?: string;
  replies: SectionComment[];
  
  // Dates
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SOURCE DOCUMENTS & TFLs
// ============================================================================

export interface SourceDocumentLink {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  version: string;
  
  // Where in source
  sectionNumber?: string;
  sectionTitle?: string;
  
  // Link type
  linkType: 'reference' | 'auto-populated' | 'derived';
  
  // Status
  sourceStatus: 'current' | 'updated' | 'superseded';
  lastChecked: string;
}

export interface TFLLink {
  id: string;
  tflId: string;
  tflNumber: string; // e.g., "Table 14.2.1"
  tflTitle: string;
  tflType: 'table' | 'figure' | 'listing';
  
  // Source
  studyId: string;
  studyName: string;
  
  // Status
  status: 'draft' | 'qc-complete' | 'approved';
  version: string;
  lastUpdated: string;
  
  // Usage
  referencedInSections: string[];
  insertedInSections: string[];
}

// ============================================================================
// COMPONENT LIBRARY
// ============================================================================

export interface ComponentLibraryItem {
  id: string;
  
  // Identification
  title: string;
  category: ComponentCategory;
  subcategory?: string;
  
  // Content
  content: string;
  contentType: 'text' | 'table' | 'figure' | 'mixed';
  
  // Versioning
  version: string;
  versionHistory: ComponentVersion[];
  
  // Approval
  status: 'draft' | 'in-review' | 'approved' | 'retired';
  approvedBy?: string;
  approvedAt?: string;
  
  // Usage
  usageCount: number;
  usedInDocuments: string[];
  
  // Applicability
  applicableDocumentTypes: DocumentType[];
  applicableTherapeuticAreas?: string[];
  applicableIndications?: string[];
  
  // Metadata
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ComponentCategory = 
  | 'safety-statement'
  | 'efficacy-claim'
  | 'mechanism-of-action'
  | 'pharmacokinetics'
  | 'manufacturing'
  | 'regulatory-boilerplate'
  | 'study-design'
  | 'statistical-methods'
  | 'background'
  | 'conclusions';

export interface ComponentVersion {
  version: string;
  content: string;
  changedBy: string;
  changedAt: string;
  changeNotes: string;
}

// ============================================================================
// HISTORY & AUDIT
// ============================================================================

export interface DocumentHistoryEntry {
  id: string;
  documentId: string;
  
  action: HistoryAction;
  description: string;
  
  // Who and when
  userId: string;
  userName: string;
  timestamp: string;
  
  // Details
  sectionId?: string;
  sectionNumber?: string;
  previousValue?: string;
  newValue?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

export type HistoryAction = 
  | 'created'
  | 'section-edited'
  | 'section-completed'
  | 'comment-added'
  | 'comment-resolved'
  | 'sent-for-review'
  | 'review-completed'
  | 'revision-requested'
  | 'approved'
  | 'version-created'
  | 'status-changed'
  | 'assigned'
  | 'due-date-changed';

// ============================================================================
// TEMPLATES
// ============================================================================

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  
  documentType: DocumentType;
  version: string;
  
  // Structure
  sections: TemplateSectionDefinition[];
  
  // Configuration
  defaultWorkflowId: string;
  estimatedHours: number;
  
  // Applicability
  applicableRegions: string[];
  applicableStudyPhases?: string[];
  
  // Metadata
  isDefault?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
  complexity?: 'low' | 'medium' | 'high';
  ichGuideline?: string;
  ctdModule?: string;
  styleConfig?: Record<string, unknown>;
}

export interface TemplateSectionDefinition {
  id: string;
  number?: string;
  title: string;
  level?: number;
  
  // Content
  required: boolean;
  guidance?: string;
  defaultContent?: string;
  
  // AI Generation (v0.32.7)
  aiPrompt?: string;
  wordCountTarget?: { min: number; max: number };
  dataSource?: string[];
  
  // Auto-population
  autoPopulateFrom?: AutoPopulateSource[];
  
  // Review
  defaultReviewerRole?: ReviewerRole;
  
  // Subsections
  subsections?: TemplateSectionDefinition[];
}

export interface AutoPopulateSource {
  sourceType: 'document' | 'database' | 'component';
  sourceDocumentType?: DocumentType;
  sourceSection?: string;
  transformationType?: 'copy' | 'summarize' | 'reference';
}

// ============================================================================
// WRITER DASHBOARD
// ============================================================================

export interface WriterDashboardData {
  // My work
  myDocuments: AuthoringDocument[];
  
  // Counts
  activeCount: number;
  overdueCount: number;
  inReviewCount: number;
  dueThisWeekCount: number;
  
  // Reviews awaiting my input
  pendingReviews: PendingReview[];
  
  // Recent activity
  recentActivity: DocumentHistoryEntry[];
  
  // Quick stats
  completedThisMonth: number;
  averageCycleTime: number; // days
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

// ============================================================================
// SUBJECT NARRATIVES (Flexible - can be authored or imported)
// ============================================================================

export interface SubjectNarrative {
  id: string;
  
  // Subject info
  subjectId: string;
  siteId: string;
  siteName: string;
  
  // Study
  studyId: string;
  studyName: string;
  
  // Narrative
  content: string;
  
  // Classification
  narrativeType: 'death' | 'sae' | 'discontinuation' | 'other';
  
  // Status
  status: 'draft' | 'medical-review' | 'approved';
  
  // Source
  source: 'authored' | 'imported-safety';
  importedFrom?: string;
  
  // Review
  medicalReviewerId?: string;
  medicalReviewerName?: string;
  approvedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
