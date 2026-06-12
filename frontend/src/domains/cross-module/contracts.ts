
/**
 * Cross-Module Contracts
 * 
 * SINGLE SOURCE OF TRUTH for all types shared across Ligature modules.
 * 
 * This file defines the contracts that enable communication between
 * modules (HAQ, Safety, Authoring, Submissions, etc.) without tight coupling.
 * 
 * RULES:
 * 1. All cross-module types MUST be defined here
 * 2. Stores and components import FROM here, never define these types locally
 * 3. Changes here should be deliberate - they affect the entire system
 * 4. Add JSDoc comments for all exported types
 * 
 * @module domains/cross-module/contracts
 * @version 0.27.45
 */

// =============================================================================
// DOMAIN TYPE IMPORTS (for typed handoff payloads)
// =============================================================================

import type { 
  CasePriority, 
  SignalStatus, 
  SignalPriority,
  MedDRATerm 
} from '@/domains/safety/contracts';

import type { 
  ExperimentStatus, 
  ExperimentType 
} from '@/domains/eln/contracts';

import type { 
  GLPStudyType, 
  GLPStudyStatus 
} from '@/domains/glp/contracts';

import type { 
  SampleStatus, 
  SampleType 
} from '@/domains/sample-management/contracts';

import type { 
  MarketingStatus 
} from '@/domains/idmp/contracts';

import type { 
  PSMFSection 
} from '@/domains/psmf/contracts';

import type { 
  MilestoneStatus, 
  WorkstreamCategory 
} from '@/domains/submission-readiness/contracts';

import type { 
  StudyPhase, 
  CTMSStudyStatus 
} from '@/domains/ctms/contracts';

// =============================================================================
// MODULE TYPES (Extended with all 18 modules)
// =============================================================================

/**
 * Identifies a Ligature module that can participate in cross-module workflows.
 * Expanded to include all consolidated domain modules.
 */
export type ModuleType = 
  // Core Regulatory
  | 'authoring'           // Document authoring (CSR, protocols, etc.)
  | 'haq'                 // Health Authority Questions
  | 'submissions'         // eCTD submissions
  | 'regulatory'          // Regulatory Intelligence
  | 'labeling'            // Product labeling
  // Clinical
  | 'ctms'                // Clinical Trial Management
  | 'tmf'                 // Trial Master File
  | 'edc'                 // Electronic Data Capture
  // Safety & Quality
  | 'safety'              // Pharmacovigilance / Safety
  | 'quality'             // QMS / CMC
  | 'psmf'                // Pharmacovigilance System Master File
  // Research & Lab
  | 'eln'                 // Electronic Lab Notebook
  | 'glp'                 // Good Laboratory Practice
  | 'sample-management'   // Sample/Biospecimen Management
  // Data & Intelligence
  | 'idmp'                // ISO IDMP Product Identification
  | 'master-data'         // Master Data Management
  | 'study-intel'         // Study Intelligence & Analytics
  | 'archives'           // Records & Archives
  // Management & Compliance
  | 'document-control'   // Document Control
  | 'qms'                // Quality Management System
  | 'audit'              // Audit Trail
  | 'executive';         // Executive Dashboard

/**
 * Module categories for grouping in UI
 */
export type ModuleCategory = 
  | 'regulatory' 
  | 'clinical' 
  | 'safety-quality' 
  | 'research-lab' 
  | 'data-intelligence';

/**
 * Module metadata including category and capabilities
 */
export interface ModuleInfo {
  type: ModuleType;
  label: string;
  shortLabel: string;
  category: ModuleCategory;
  description: string;
  canInitiateHandoffs: boolean;
  canReceiveHandoffs: boolean;
  supportsEvents: boolean;
}

/**
 * Human-readable labels for modules (for UI display)
 */
export const MODULE_LABELS: Record<ModuleType, string> = {
  authoring: 'Document Authoring',
  haq: 'HAQ Intelligence',
  safety: 'Safety & PV',
  quality: 'Quality Management',
  submissions: 'Submissions Hub',
  labeling: 'Labeling',
  ctms: 'Clinical Trials',
  tmf: 'Trial Master File',
  regulatory: 'Regulatory Intelligence',
  edc: 'Electronic Data Capture',
  psmf: 'PV System Master File',
  eln: 'Electronic Lab Notebook',
  glp: 'GLP Studies',
  'sample-management': 'Sample Management',
  idmp: 'Product Identification (IDMP)',
  'master-data': 'Master Data',
  'study-intel': 'Study Intelligence',
  archives: 'Records & Archives',
  'document-control': 'Document Control',
  qms: 'Quality Management System',
  audit: 'Audit Trail',
  executive: 'Executive Dashboard',
};

/**
 * Short labels for compact displays
 */
export const MODULE_SHORT_LABELS: Record<ModuleType, string> = {
  authoring: 'Authoring',
  haq: 'HAQ',
  safety: 'Safety',
  quality: 'QMS',
  submissions: 'eCTD',
  labeling: 'Labels',
  ctms: 'CTMS',
  tmf: 'TMF',
  regulatory: 'Reg Intel',
  edc: 'EDC',
  psmf: 'PSMF',
  eln: 'ELN',
  glp: 'GLP',
  'sample-management': 'Samples',
  idmp: 'IDMP',
  'master-data': 'MDM',
  'study-intel': 'Intel',
  archives: 'Archives',
  'document-control': 'Doc Control',
  qms: 'QMS',
  audit: 'Audit',
  executive: 'Executive',
};

/**
 * Module category mappings
 */
export const MODULE_CATEGORIES: Record<ModuleType, ModuleCategory> = {
  authoring: 'regulatory',
  haq: 'regulatory',
  submissions: 'regulatory',
  regulatory: 'regulatory',
  labeling: 'regulatory',
  ctms: 'clinical',
  tmf: 'clinical',
  edc: 'clinical',
  safety: 'safety-quality',
  quality: 'safety-quality',
  psmf: 'safety-quality',
  eln: 'research-lab',
  glp: 'research-lab',
  'sample-management': 'research-lab',
  idmp: 'data-intelligence',
  'master-data': 'data-intelligence',
  'study-intel': 'data-intelligence',
  archives: 'data-intelligence',
  'document-control': 'safety-quality',
  qms: 'safety-quality',
  audit: 'safety-quality',
  executive: 'data-intelligence',
};

/**
 * Category labels for UI grouping
 */
export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  'regulatory': 'Regulatory & Submissions',
  'clinical': 'Clinical Operations',
  'safety-quality': 'Safety & Quality',
  'research-lab': 'Research & Lab',
  'data-intelligence': 'Data & Intelligence',
};

// =============================================================================
// HANDOFF TYPES (Extended)
// =============================================================================

/**
 * Types of handoffs between modules.
 * Each handoff type represents a specific workflow transition.
 * Extended with new module integrations.
 */
export type HandoffType = 
  // Core Regulatory Handoffs
  | 'document-to-ectd'        // Authoring → Submissions Builder
  | 'haq-response-to-m1'      // HAQ → Module 1 correspondence
  | 'label-update-to-m1'      // Labeling → Module 1 regional
  // Safety → Regulatory Handoffs
  | 'safety-signal-to-m2'     // Safety → Module 2.7 clinical summary
  | 'safety-case-to-psmf'     // Safety → PSMF case metrics
  | 'safety-signal-to-label'  // Safety → Labeling update
  // Quality → Regulatory Handoffs
  | 'cmc-change-to-m3'        // Quality/CMC → Module 3
  | 'deviation-to-qms'        // Any module → QMS CAPA
  // Clinical → Regulatory Handoffs
  | 'ctms-data-to-csr'        // CTMS → CSR authoring
  | 'tmf-doc-to-ectd'         // TMF → eCTD inclusion
  | 'edc-data-to-datasets'    // EDC → Submission datasets
  // Research → Clinical Handoffs
  | 'eln-to-ctms'             // ELN experiment → CTMS study data
  | 'eln-to-tmf'              // ELN experiment → TMF artifact
  | 'glp-to-m4'               // GLP study → Module 4 nonclinical
  | 'sample-to-eln'           // Sample → ELN experiment link
  | 'sample-to-ctms'          // Sample → CTMS biospecimen tracking
  // Master Data Handoffs
  | 'idmp-to-submissions'     // IDMP → Submission product info
  | 'idmp-to-labeling'        // IDMP → Labeling product data
  | 'master-site-to-ctms'     // Master Data → CTMS site
  | 'master-product-to-safety'// Master Data → Safety product
  // Intelligence Handoffs
  | 'study-intel-to-ctms'     // Study Intel → CTMS forecasts
  | 'readiness-to-submissions'// Submission Readiness → Submissions
  // Archive Handoffs
  | 'archive-retrieval'       // Archives → Any module (retrieval)
  | 'archive-document';       // Any module → Archives (retention)

/**
 * Status of a pending handoff
 */
export type HandoffStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'in-progress' | 'completed';

/**
 * Priority levels for handoffs
 */
export type HandoffPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

// =============================================================================
// TYPED HANDOFF PAYLOADS
// =============================================================================

/**
 * Type-safe payload for safety signal to clinical summary handoffs
 */
export interface SafetySignalPayload {
  signalId: string;
  signalTitle: string;
  signalStatus: SignalStatus;
  signalPriority: SignalPriority;
  primaryEvent: MedDRATerm;
  caseCount: number;
  prr?: number;
  ror?: number;
  recommendedActions: string[];
  affectedProducts: string[];
}

/**
 * Type-safe payload for CTMS to CSR handoffs
 */
export interface CTMSToCSRPayload {
  studyId: string;
  studyPhase: StudyPhase;
  studyStatus: CTMSStudyStatus;
  enrollmentTotal: number;
  sitesActivated: number;
  primaryEndpointMet?: boolean;
  dataLockDate?: string;
  lastSubjectLastVisit?: string;
  demographicsSummary: {
    totalSubjects: number;
    meanAge?: number;
    malePercent?: number;
    femalePercent?: number;
  };
}

/**
 * Type-safe payload for ELN to CTMS handoffs
 */
export interface ELNToCTMSPayload {
  experimentId: string;
  experimentTitle: string;
  experimentType: ExperimentType;
  experimentStatus: ExperimentStatus;
  linkedSamples: string[];
  completionDate?: string;
  keyFindings?: string;
  attachmentCount: number;
}

/**
 * Type-safe payload for GLP to Module 4 handoffs
 */
export interface GLPToM4Payload {
  studyId: string;
  studyType: GLPStudyType;
  studyStatus: GLPStudyStatus;
  glpCompliant: boolean;
  testArticle: string;
  species: string;
  duration: string;
  findings: string[];
  finalReportId?: string;
}

/**
 * Type-safe payload for sample to experiment handoffs
 */
export interface SampleToELNPayload {
  sampleId: string;
  sampleType: SampleType;
  sampleStatus: SampleStatus;
  containerBarcode: string;
  quantity: number;
  unit: string;
  storageConditions: string;
  collectionDate: string;
  expirationDate?: string;
}

/**
 * Type-safe payload for IDMP product handoffs
 */
export interface IDMPProductPayload {
  mpid: string;
  mpidStatus: MarketingStatus;
  productName: string;
  pharmaceuticalForm: string;
  administrationRoute: string;
  activeIngredients: Array<{
    substanceName: string;
    strength: string;
    unit: string;
  }>;
  authorizedRegions: string[];
}

/**
 * Type-safe payload for submission readiness handoffs
 */
export interface ReadinessPayload {
  studyId: string;
  submissionType: string;
  region: string;
  overallReadiness: number;
  milestoneStatus: MilestoneStatus;
  workstreams: Array<{
    category: WorkstreamCategory;
    percentComplete: number;
    status: MilestoneStatus;
  }>;
  blockers: string[];
  projectedSubmissionDate?: string;
}

/**
 * Type-safe payload for PSMF updates
 */
export interface PSMFUpdatePayload {
  partSection: PSMFSection;
  updateType: 'new-entry' | 'modification' | 'deletion';
  affectedSections: string[];
  reason: string;
  effectiveDate: string;
  complianceImpact: 'none' | 'minor' | 'major' | 'critical';
}

/**
 * Type-safe payload for archive operations
 */
export interface ArchivePayload {
  documentIds: string[];
  archiveReason: string;
  retentionCategory: string;
  retentionYears: number;
  legalHold: boolean;
  accessRestrictions?: string[];
}

/**
 * Union type of all typed payloads for discriminated unions
 */
export type HandoffPayload = 
  | { type: 'safety-signal-to-m2'; data: SafetySignalPayload }
  | { type: 'safety-signal-to-label'; data: SafetySignalPayload }
  | { type: 'ctms-data-to-csr'; data: CTMSToCSRPayload }
  | { type: 'eln-to-ctms'; data: ELNToCTMSPayload }
  | { type: 'eln-to-tmf'; data: ELNToCTMSPayload }
  | { type: 'glp-to-m4'; data: GLPToM4Payload }
  | { type: 'sample-to-eln'; data: SampleToELNPayload }
  | { type: 'sample-to-ctms'; data: SampleToELNPayload }
  | { type: 'idmp-to-submissions'; data: IDMPProductPayload }
  | { type: 'idmp-to-labeling'; data: IDMPProductPayload }
  | { type: 'readiness-to-submissions'; data: ReadinessPayload }
  | { type: 'safety-case-to-psmf'; data: PSMFUpdatePayload }
  | { type: 'archive-document'; data: ArchivePayload }
  | { type: 'archive-retrieval'; data: ArchivePayload }
  // Generic fallback for other handoff types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: HandoffType; data: Record<string, any> };

/**
 * A handoff represents work being passed from one module to another.
 * Enhanced with priority levels and typed payload support.
 * 
 * @example
 * // HAQ response ready for submission
 * {
 *   id: 'handoff-123',
 *   type: 'haq-response-to-m1',
 *   sourceModule: 'haq',
 *   targetModule: 'submissions',
 *   sourceId: 'haq-456',
 *   sourceTitle: 'FDA IR Response - Clinical Questions',
 *   targetSection: '1.12.1',
 *   priority: 'high',
 *   payload: { type: 'haq-response-to-m1', data: { questionCount: 5, disciplines: ['clinical', 'cmc'] } },
 *   createdAt: '2026-01-15T10:00:00Z',
 *   createdBy: 'user-789',
 *   status: 'pending'
 * }
 */
export interface PendingHandoff {
  /** Unique identifier for this handoff */
  id: string;
  
  /** Type of handoff - determines workflow behavior */
  type: HandoffType;
  
  /** Module initiating the handoff */
  sourceModule: ModuleType;
  
  /** Module receiving the handoff */
  targetModule: ModuleType;
  
  /** ID of the source item (document, HAQ, signal, etc.) */
  sourceId: string;
  
  /** Human-readable title for display */
  sourceTitle: string;
  
  /** Suggested CTD section for submissions */
  targetSection?: string;
  
  /** Priority level for this handoff (defaults to 'normal') */
  priority?: HandoffPriority;
  
  /** Type-safe payload - use HandoffPayload discriminated union */
  payload?: HandoffPayload;
  
  /** Additional context - schema varies by handoff type (legacy support) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  
  /** ISO timestamp of creation */
  createdAt: string;
  
  /** User who created the handoff */
  createdBy: string;
  
  /** Current status */
  status: HandoffStatus;
  
  /** ISO timestamp when handoff expires (optional) */
  expiresAt?: string;
  
  /** User who accepted/completed the handoff */
  completedBy?: string;
  
  /** ISO timestamp of completion */
  completedAt?: string;
  
  /** Reason for rejection (if rejected) */
  rejectionReason?: string;
}

/**
 * Input for creating a new handoff.
 * Omits auto-generated fields (id, createdAt, status).
 */
export type CreateHandoffInput = Omit<PendingHandoff, 'id' | 'createdAt' | 'status' | 'completedBy' | 'completedAt'>;

/**
 * Typed handoff creation helper - use for type-safe handoff creation
 */
export interface TypedHandoffInput<T extends HandoffType> {
  type: T;
  sourceModule: ModuleType;
  targetModule: ModuleType;
  sourceId: string;
  sourceTitle: string;
  targetSection?: string;
  priority: HandoffPriority;
  payload: Extract<HandoffPayload, { type: T }>;
  createdBy: string;
  expiresAt?: string;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * Type of module notification
 */
export type NotificationType = 'handoff' | 'update' | 'alert' | 'reminder';

/**
 * A notification for a specific module.
 */
export interface ModuleNotification {
  /** Unique identifier */
  id: string;
  
  /** Module this notification belongs to */
  module: ModuleType;
  
  /** Type of notification */
  type: NotificationType;
  
  /** Notification title */
  title: string;
  
  /** Notification message */
  message: string;
  
  /** Source module (if cross-module) */
  sourceModule?: ModuleType;
  
  /** URL to navigate to when clicked */
  actionUrl?: string;
  
  /** Whether notification has been read */
  read: boolean;
  
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Input for creating a new notification.
 * Omits auto-generated fields (id, createdAt, read).
 */
export type CreateNotificationInput = Omit<ModuleNotification, 'id' | 'createdAt' | 'read'>;

// =============================================================================
// NAVIGATION CONTEXT
// =============================================================================

/**
 * Context for cross-module navigation.
 * Tracks where the user came from to enable "back" functionality
 * and contextual behavior in the target module.
 */
export interface NavigationContext {
  /** Module the user came from */
  sourceModule?: ModuleType;
  
  /** Target CTD section (if navigating to submissions) */
  targetSection?: string;
  
  /** Associated handoff ID (if following a handoff) */
  handoffId?: string;
  
  /** Additional context data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

// =============================================================================
// CTD SECTION MAPPING
// =============================================================================

/**
 * Information about a CTD section
 */
export interface CTDSectionInfo {
  /** Section number (e.g., '2.5', '3.2.P') */
  section: string;
  
  /** CTD module number */
  module: string;
  
  /** Human-readable title */
  title: string;
}

/**
 * Mapping from content types to suggested CTD sections.
 * Used to auto-suggest where documents should be placed in submissions.
 */
export const CTD_SECTION_MAPPING: Record<string, CTDSectionInfo> = {
  // Authoring document types
  'clinical-overview': { section: '2.5', module: '2', title: 'Clinical Overview' },
  'clinical-summary': { section: '2.7', module: '2', title: 'Clinical Summary' },
  'nonclinical-overview': { section: '2.4', module: '2', title: 'Nonclinical Overview' },
  'nonclinical-summary': { section: '2.6', module: '2', title: 'Nonclinical Written/Tabulated Summaries' },
  'quality-overall-summary': { section: '2.3', module: '2', title: 'Quality Overall Summary' },
  'csr': { section: '5.3.5.1', module: '5', title: 'Reports of Controlled Clinical Studies' },
  'protocol': { section: '5.3.5.1', module: '5', title: 'Study Reports' },
  'ib': { section: '5.3.5.1', module: '5', title: 'Investigator Brochure' },
  'dsur': { section: '5.3.6', module: '5', title: 'Postmarketing Experience' },
  'pbrer': { section: '5.3.6', module: '5', title: 'PBRER' },
  
  // HAQ response types
  'haq-response': { section: '1.12.1', module: '1', title: 'Response to Questions' },
  'haq-clinical': { section: '1.12.1', module: '1', title: 'Clinical Response' },
  'haq-cmc': { section: '1.12.1', module: '1', title: 'CMC Response' },
  'haq-nonclinical': { section: '1.12.1', module: '1', title: 'Nonclinical Response' },
  
  // Safety signal types
  'safety-signal': { section: '2.7.4', module: '2', title: 'Summary of Clinical Safety' },
  'safety-update': { section: '5.3.6', module: '5', title: 'Postmarketing Experience' },
  'adverse-event': { section: '2.7.4', module: '2', title: 'Summary of Clinical Safety' },
  
  // CMC/Quality types
  'drug-substance': { section: '3.2.S', module: '3', title: 'Drug Substance' },
  'drug-product': { section: '3.2.P', module: '3', title: 'Drug Product' },
  'specification-change': { section: '3.2.P.5', module: '3', title: 'Control of Drug Product' },
  'stability-data': { section: '3.2.P.8', module: '3', title: 'Stability' },
  
  // Labeling types
  'uspi': { section: '1.14.1', module: '1', title: 'US Prescribing Information' },
  'patient-labeling': { section: '1.14.2', module: '1', title: 'Patient Labeling' },
  'smpc': { section: '1.3.1', module: '1', title: 'SmPC (EU)' },
};

/**
 * Get CTD section info for a content type
 */
export function getCTDSection(contentType: string): CTDSectionInfo | null {
  return CTD_SECTION_MAPPING[contentType] || null;
}

// =============================================================================
// CROSS-MODULE EVENTS (Real-time data flow)
// =============================================================================

/**
 * Event types for cross-module pub/sub
 */
export type CrossModuleEventType =
  // Entity lifecycle events
  | 'entity-created'
  | 'entity-updated'
  | 'entity-deleted'
  | 'entity-status-changed'
  // Workflow events
  | 'workflow-started'
  | 'workflow-step-completed'
  | 'workflow-completed'
  | 'workflow-failed'
  // Data events
  | 'data-available'
  | 'data-locked'
  | 'data-released'
  // Compliance events
  | 'signature-applied'
  | 'approval-granted'
  | 'deviation-detected'
  // Alert events
  | 'deadline-approaching'
  | 'deadline-missed'
  | 'threshold-exceeded'
  | 'document-archived'
  | 'review-cycle-initiated'
  | 'capa-closed'
  | 'deviation-requires-capa'
  | 'critical-deviation'
  | 'signal-validated'
  | 'tmf-artifact-approved'
  | 'tmf-qc-failed'
  | 'tmf-artifact-auto-linked'
  | 'tmf-gap-status-changed'
  | 'tmf-gap-resolved'
  | 'tmf-gap-identified'
  | 'inspection-report-generated'
  // Safety events (from store)
  | 'safety-signal-confirmed'
  | 'safety-signal-detected'
  | 'icsr-submitted'
  | 'aggregate-report-due'
  // CAPA events
  | 'capa-created'
  // Demo events
  | 'demo-ai-generate-section'
  | 'demo-glp-cascade';

/**
 * Cross-module event for real-time data propagation
 */
export interface CrossModuleEvent {
  /** Unique event ID */
  id: string;
  
  /** Type of event */
  eventType: CrossModuleEventType;
  
  /** Module that emitted the event */
  sourceModule: ModuleType;
  
  /** Modules that should receive the event (empty = broadcast) */
  targetModules: ModuleType[];
  
  /** Entity type that triggered the event */
  entityType: string;
  
  /** ID of the entity */
  entityId: string;
  
  /** Human-readable description */
  description: string;
  
  /** Event payload - varies by event type */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  
  /** ISO timestamp */
  timestamp: string;
  
  /** User who triggered the event (if applicable) */
  triggeredBy?: string;
  
  /** Correlation ID for tracing related events */
  correlationId?: string;
}

/**
 * Event subscription for modules
 */
export interface EventSubscription {
  id: string;
  subscriberModule: ModuleType;
  eventTypes: CrossModuleEventType[];
  sourceModules?: ModuleType[]; // Filter to specific source modules
  entityTypes?: string[]; // Filter to specific entity types
  active: boolean;
  createdAt: string;
}

// =============================================================================
// SHARED ENTITY REFERENCES (Type-safe cross-module linking)
// =============================================================================

/**
 * Entity types that can be referenced across modules
 */
export type SharedEntityType =
  // Clinical entities
  | 'study'
  | 'site'
  | 'subject'
  | 'visit'
  // Document entities  
  | 'document'
  | 'submission'
  | 'sequence'
  // Safety entities
  | 'case'
  | 'signal'
  // Product entities
  | 'product'
  | 'substance'
  // Lab entities
  | 'experiment'
  | 'sample'
  | 'glp-study'
  // Quality entities
  | 'capa'
  | 'deviation'
  | 'audit';

/**
 * Type-safe reference to an entity in another module
 */
export interface EntityReference {
  /** Type of the referenced entity */
  entityType: SharedEntityType;
  
  /** ID of the entity in its source module */
  entityId: string;
  
  /** Module where the entity lives */
  sourceModule: ModuleType;
  
  /** Human-readable display name */
  displayName: string;
  
  /** URL to navigate to the entity */
  url?: string;
  
  /** When this reference was created */
  linkedAt: string;
  
  /** User who created the link */
  linkedBy: string;
  
  /** Optional context about the relationship */
  relationshipType?: string;
  
  /** Whether the reference is still valid (entity exists) */
  valid: boolean;
}

/**
 * Bidirectional link between two entities
 */
export interface EntityLink {
  id: string;
  sourceRef: EntityReference;
  targetRef: EntityReference;
  linkType: string; // e.g., 'derived-from', 'supports', 'related-to'
  bidirectional: boolean;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// MODULE RELATIONSHIPS (Allowed communication paths)
// =============================================================================

/**
 * Defines allowed handoff paths between modules
 */
export const MODULE_HANDOFF_PATHS: Record<ModuleType, ModuleType[]> = {
  // Authoring can hand off to submissions and regulatory
  authoring: ['submissions', 'tmf', 'regulatory'],
  
  // HAQ can hand off to submissions and authoring
  haq: ['submissions', 'authoring'],
  
  // Safety can hand off to many modules
  safety: ['submissions', 'labeling', 'psmf', 'authoring', 'regulatory'],
  
  // Quality can hand off to submissions and safety
  quality: ['submissions', 'authoring', 'safety', 'regulatory'],
  
  // Submissions receives from many, sends to archives
  submissions: ['archives', 'regulatory'],
  
  // Labeling receives from safety/IDMP, sends to submissions
  labeling: ['submissions'],
  
  // CTMS can hand off to authoring, TMF, safety
  ctms: ['authoring', 'tmf', 'safety', 'edc'],
  
  // TMF can hand off to submissions
  tmf: ['submissions', 'archives'],
  
  // EDC can hand off to CTMS, authoring
  edc: ['ctms', 'authoring', 'safety'],
  
  // Regulatory Intelligence informs many modules
  regulatory: ['authoring', 'submissions', 'labeling', 'safety'],
  
  // PSMF receives safety data
  psmf: ['regulatory', 'archives'],
  
  // ELN can link to clinical and TMF
  eln: ['ctms', 'tmf', 'glp', 'sample-management'],
  
  // GLP can hand off to nonclinical submissions
  glp: ['submissions', 'authoring', 'eln'],
  
  // Sample Management supports lab work
  'sample-management': ['eln', 'ctms', 'glp'],
  
  // IDMP provides product data
  idmp: ['submissions', 'labeling', 'safety', 'regulatory'],
  
  // Master Data provides reference data
  'master-data': ['ctms', 'safety', 'quality', 'idmp'],
  
  // Study Intel provides analytics
  'study-intel': ['ctms', 'authoring', 'submissions'],
  
  // Archives receives from all, provides retrieval
  archives: [],
  "document-control": [],
  qms: [],
  audit: [],
  executive: [],
};

/**
 * Check if a handoff path is allowed
 */
export function isHandoffAllowed(source: ModuleType, target: ModuleType): boolean {
  return MODULE_HANDOFF_PATHS[source]?.includes(target) ?? false;
}

// =============================================================================
// DATA FLOW PIPELINES (Multi-step workflows)
// =============================================================================

/**
 * A data flow pipeline defines a multi-step data transformation path
 */
export interface DataFlowPipeline {
  id: string;
  name: string;
  description: string;
  steps: DataFlowStep[];
  trigger: DataFlowTrigger;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single step in a data flow pipeline
 */
export interface DataFlowStep {
  id: string;
  order: number;
  name: string;
  sourceModule: ModuleType;
  targetModule: ModuleType;
  handoffType: HandoffType;
  transformations?: DataTransformation[];
  conditions?: DataFlowCondition[];
  onError: 'stop' | 'skip' | 'retry';
}

/**
 * Data transformation applied during a flow step
 */
export interface DataTransformation {
  type: 'map' | 'filter' | 'aggregate' | 'enrich' | 'validate';
  config: Record<string, unknown>;
}

/**
 * Condition for executing a flow step
 */
export interface DataFlowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: unknown;
}

/**
 * Trigger for starting a data flow
 */
export interface DataFlowTrigger {
  type: 'event' | 'schedule' | 'manual';
  eventType?: CrossModuleEventType;
  schedule?: string; // cron expression
  sourceModule?: ModuleType;
}

/**
 * Pre-defined data flow pipelines for common workflows
 */
export const PREDEFINED_PIPELINES: Record<string, Partial<DataFlowPipeline>> = {
  // LSLV to Submission pipeline
  'lslv-to-submission': {
    name: 'LSLV to Submission',
    description: 'Automated flow from last subject last visit to submission-ready package',
    steps: [
      { id: 'step-1', order: 1, name: 'Lock EDC Data', sourceModule: 'edc', targetModule: 'ctms', handoffType: 'edc-data-to-datasets', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'Generate CSR', sourceModule: 'ctms', targetModule: 'authoring', handoffType: 'ctms-data-to-csr', onError: 'stop' },
      { id: 'step-3', order: 3, name: 'Close TMF', sourceModule: 'tmf', targetModule: 'submissions', handoffType: 'tmf-doc-to-ectd', onError: 'skip' },
      { id: 'step-4', order: 4, name: 'Compile Submission', sourceModule: 'authoring', targetModule: 'submissions', handoffType: 'document-to-ectd', onError: 'stop' },
    ],
  },
  
  // Safety Signal to Label Update pipeline
  'signal-to-label': {
    name: 'Safety Signal to Label',
    description: 'Flow from validated safety signal to label update submission',
    steps: [
      { id: 'step-1', order: 1, name: 'Assess Signal', sourceModule: 'safety', targetModule: 'labeling', handoffType: 'safety-signal-to-label', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'Update PSMF', sourceModule: 'safety', targetModule: 'psmf', handoffType: 'safety-case-to-psmf', onError: 'skip' },
      { id: 'step-3', order: 3, name: 'Submit Label Change', sourceModule: 'labeling', targetModule: 'submissions', handoffType: 'label-update-to-m1', onError: 'stop' },
    ],
  },
  
  // Lab to Nonclinical Submission pipeline
  'lab-to-m4': {
    name: 'Lab to Module 4',
    description: 'Flow from GLP study completion to nonclinical submission package',
    steps: [
      { id: 'step-1', order: 1, name: 'Link Experiments', sourceModule: 'eln', targetModule: 'glp', handoffType: 'eln-to-ctms', onError: 'skip' },
      { id: 'step-2', order: 2, name: 'Finalize GLP Report', sourceModule: 'glp', targetModule: 'authoring', handoffType: 'glp-to-m4', onError: 'stop' },
      { id: 'step-3', order: 3, name: 'Submit Module 4', sourceModule: 'authoring', targetModule: 'submissions', handoffType: 'document-to-ectd', onError: 'stop' },
    ],
  },
  
  // v0.27.48: HAQ Response to Submission pipeline
  'haq-to-submission': {
    name: 'HAQ Response to Submission',
    description: 'Flow from finalized HAQ response to regulatory submission',
    steps: [
      { id: 'step-1', order: 1, name: 'Finalize Response', sourceModule: 'haq', targetModule: 'authoring', handoffType: 'haq-response-to-m1', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'QC Review', sourceModule: 'authoring', targetModule: 'quality', handoffType: 'deviation-to-qms', onError: 'skip' },
      { id: 'step-3', order: 3, name: 'Archive to TMF', sourceModule: 'authoring', targetModule: 'tmf', handoffType: 'tmf-doc-to-ectd', onError: 'skip' },
      { id: 'step-4', order: 4, name: 'Submit Response', sourceModule: 'authoring', targetModule: 'submissions', handoffType: 'haq-response-to-m1', onError: 'stop' },
    ],
  },
  
  // Quality Event Response pipeline
  'deviation-to-capa': {
    name: 'Deviation to CAPA',
    description: 'Flow from quality deviation to corrective action and regulatory notification',
    steps: [
      { id: 'step-1', order: 1, name: 'Log Deviation', sourceModule: 'quality', targetModule: 'safety', handoffType: 'deviation-to-qms', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'Assess Impact', sourceModule: 'quality', targetModule: 'regulatory', handoffType: 'deviation-to-qms', onError: 'skip' },
      { id: 'step-3', order: 3, name: 'Update TMF', sourceModule: 'quality', targetModule: 'tmf', handoffType: 'tmf-doc-to-ectd', onError: 'skip' },
    ],
  },
  
  // CMC Change pipeline
  'cmc-change-flow': {
    name: 'CMC Change Control',
    description: 'Flow from manufacturing change through regulatory submission',
    steps: [
      { id: 'step-1', order: 1, name: 'Document Change', sourceModule: 'quality', targetModule: 'authoring', handoffType: 'cmc-change-to-m3', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'Update IDMP', sourceModule: 'authoring', targetModule: 'idmp', handoffType: 'idmp-to-submissions', onError: 'skip' },
      { id: 'step-3', order: 3, name: 'Submit Variation', sourceModule: 'authoring', targetModule: 'submissions', handoffType: 'document-to-ectd', onError: 'stop' },
    ],
  },
  
  // New Study Setup pipeline
  'study-setup': {
    name: 'New Study Setup',
    description: 'Flow from study intelligence through site activation',
    steps: [
      { id: 'step-1', order: 1, name: 'Import Sites', sourceModule: 'study-intel', targetModule: 'ctms', handoffType: 'study-intel-to-ctms', onError: 'stop' },
      { id: 'step-2', order: 2, name: 'Create TMF Structure', sourceModule: 'ctms', targetModule: 'tmf', handoffType: 'tmf-doc-to-ectd', onError: 'skip' },
      { id: 'step-3', order: 3, name: 'Configure Safety', sourceModule: 'ctms', targetModule: 'safety', handoffType: 'master-product-to-safety', onError: 'skip' },
      { id: 'step-4', order: 4, name: 'Setup EDC', sourceModule: 'ctms', targetModule: 'edc', handoffType: 'edc-data-to-datasets', onError: 'stop' },
    ],
  },
};

// =============================================================================
// UTILITY TYPES & FUNCTIONS
// =============================================================================

/**
 * All valid module types for type guard
 */
const ALL_MODULE_TYPES: ModuleType[] = [
  'authoring', 'haq', 'safety', 'quality', 'submissions', 'labeling',
  'ctms', 'tmf', 'regulatory', 'edc', 'psmf', 'eln', 'glp',
  'sample-management', 'idmp', 'master-data', 'study-intel', 'archives'
];

/**
 * All valid handoff types for type guard
 */
const ALL_HANDOFF_TYPES: HandoffType[] = [
  'document-to-ectd', 'haq-response-to-m1', 'safety-signal-to-m2', 'safety-case-to-psmf',
  'safety-signal-to-label', 'cmc-change-to-m3', 'deviation-to-qms', 'label-update-to-m1',
  'ctms-data-to-csr', 'tmf-doc-to-ectd', 'edc-data-to-datasets', 'eln-to-ctms',
  'eln-to-tmf', 'glp-to-m4', 'sample-to-eln', 'sample-to-ctms', 'idmp-to-submissions',
  'idmp-to-labeling', 'master-site-to-ctms', 'master-product-to-safety',
  'study-intel-to-ctms', 'readiness-to-submissions', 'archive-retrieval', 'archive-document'
];

/**
 * Type guard to check if a string is a valid ModuleType
 */
export function isModuleType(value: string): value is ModuleType {
  return ALL_MODULE_TYPES.includes(value as ModuleType);
}

/**
 * Type guard to check if a string is a valid HandoffType
 */
export function isHandoffType(value: string): value is HandoffType {
  return ALL_HANDOFF_TYPES.includes(value as HandoffType);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleType[] {
  return ALL_MODULE_TYPES.filter(m => MODULE_CATEGORIES[m] === category);
}

/**
 * Get all modules that can send handoffs to a target module
 */
export function getInboundModules(target: ModuleType): ModuleType[] {
  return ALL_MODULE_TYPES.filter(m => MODULE_HANDOFF_PATHS[m]?.includes(target));
}

/**
 * Get all modules that can receive handoffs from a source module
 */
export function getOutboundModules(source: ModuleType): ModuleType[] {
  return MODULE_HANDOFF_PATHS[source] || [];
}

/**
 * Validate an entity reference
 */
export function isValidEntityReference(ref: EntityReference): boolean {
  return (
    !!ref.entityId &&
    !!ref.entityType &&
    isModuleType(ref.sourceModule) &&
    ref.valid
  );
}

/**
 * Create an entity reference
 */
export function createEntityReference(
  entityType: SharedEntityType,
  entityId: string,
  sourceModule: ModuleType,
  displayName: string,
  linkedBy: string
): EntityReference {
  return {
    entityType,
    entityId,
    sourceModule,
    displayName,
    linkedAt: new Date().toISOString(),
    linkedBy,
    valid: true,
  };
}
