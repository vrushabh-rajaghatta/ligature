
// =============================================================================
// NATIVE STRUCTURED CONTENT TYPES
// =============================================================================
// Database schema types for native structured content module.
// Replaces external Docuvera integration with native implementation.
//
// Per Structured Content Specs v1.0 - Part 2: Native Structured Content Module
// Migration: Phase 1 (Q2 2026) - Parallel Operation
//            Phase 2 (Q3 2026) - Write-Through
//            Phase 3 (Q4 2026) - Native Primary
// =============================================================================

import type {
  DocumentType,
  DocumentCategory,
  DocumentStatus,
  ComponentStatus,
  ComponentReuseType,
  OutputFormat,
  ReviewType,
  ReviewStatus,
  ContentEventType,
} from '@/lib/integrations/docuvera/types';

// Note: Base types (DocumentType, DocumentStatus, etc.) are imported from
// docuvera/types.ts but NOT re-exported to avoid collisions with approval.ts.
// Consumers should import base types from '@/lib/integrations/docuvera/types'
// or use the existing exports from '@/types/core' (which come from approval.ts).

// -----------------------------------------------------------------------------
// Database Entity Types (Prisma-compatible)
// -----------------------------------------------------------------------------

/**
 * Native content component (database entity)
 * Maps to: structured_content.components table
 */
export interface NativeContentComponent {
  // Primary key
  id: string;
  
  // Tenant isolation
  tenantId: string;
  
  // External system reference (for migration)
  externalId?: string;
  externalSource?: 'docuvera' | 'legacy' | 'import';
  
  // Component identity
  title: string;
  section: string;                    // e.g., "4.1", "2.5.1"
  sectionTitle?: string;              // Human-readable section name
  
  // Content
  contentFormat: ContentFormat;
  contentBody: string;
  contentHash: string;                // SHA-256 for change detection
  
  // Status & versioning
  status: ComponentStatus;
  version: string;
  versionNumber: number;              // Numeric for ordering
  isLatest: boolean;
  
  // Reuse tracking
  reuseType: ComponentReuseType;
  sourceComponentId?: string;
  sourceVersion?: string;
  derivationRules?: string;           // JSON rules for derived content
  
  // Product & market scope
  productId: string;
  markets: string[];
  language: string;
  
  // Classification
  componentType: ComponentType;
  therapeuticArea?: string;
  regulatoryClass?: string;
  tags: string[];
  
  // Audit trail
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  lockedAt?: Date;
  lockedBy?: string;
  
  // Soft delete
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * Content format types
 */
export type ContentFormat = 
  | 'xml'           // Structured XML (preferred for labeling)
  | 'html'          // HTML content
  | 'markdown'      // Markdown (for simpler content)
  | 'json'          // Structured JSON
  | 'plain';        // Plain text

/**
 * Component type classification
 */
export type ComponentType =
  // Labeling sections (CCDS/SmPC/USPI/PIL)
  | 'indication'
  | 'dosage'
  | 'contraindication'
  | 'warning'
  | 'precaution'
  | 'adverse_reaction'
  | 'drug_interaction'
  | 'clinical_pharmacology'
  | 'storage'
  | 'description'
  // Clinical sections
  | 'study_design'
  | 'efficacy_results'
  | 'safety_results'
  | 'pk_results'
  // Generic
  | 'narrative'
  | 'table'
  | 'figure'
  | 'reference'
  | 'appendix'
  | 'other';

/**
 * Native structured document (database entity)
 * Maps to: structured_content.documents table
 */
export interface NativeStructuredDocument {
  // Primary key
  id: string;
  
  // Tenant isolation
  tenantId: string;
  
  // External system reference
  externalId?: string;
  externalSource?: 'docuvera' | 'legacy' | 'import';
  
  // Document identity
  title: string;
  type: DocumentType;
  category: DocumentCategory;
  
  // Product association
  productId: string;
  
  // Status & versioning
  status: DocumentStatus;
  version: string;
  versionNumber: number;
  isLatest: boolean;
  
  // Market & language
  markets: string[];
  language: string;
  
  // Template reference
  templateId?: string;
  templateVersion?: string;
  
  // Derivation (for SmPC, USPI, PIL derived from CCDS)
  derivedFrom?: DocumentDerivation;
  
  // Dates
  effectiveDate?: Date;
  expiryDate?: Date;
  nextReviewDate?: Date;
  
  // Regulatory references
  regulatoryRefs: string[];
  
  // Audit trail
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  
  // Soft delete
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * Document-Component relationship (junction table)
 * Maps to: structured_content.document_components table
 */
export interface DocumentComponentAssembly {
  id: string;
  documentId: string;
  componentId: string;
  
  // Section placement
  section: string;
  displayOrder: number;
  
  // Reuse configuration for this usage
  reuseType: ComponentReuseType;
  
  // Version pinning
  componentVersion: string;
  componentHash: string;
  
  // Override content (for derived docs)
  hasOverride: boolean;
  overrideContent?: string;
  
  // Status
  isActive: boolean;
  
  // Audit
  addedAt: Date;
  addedBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Document Derivation Types (CCDS → SmPC/USPI/PIL)
// -----------------------------------------------------------------------------

/**
 * Document derivation tracking
 */
export interface DocumentDerivation {
  sourceDocumentId: string;
  sourceDocumentType: DocumentType;
  sourceVersion: string;
  
  derivationType: DerivationType;
  derivedAt: Date;
  derivedBy: string;
  
  // Transformation rules applied
  transformationRuleId?: string;
  
  // Sections that have been customized (not auto-derived)
  customizedSections: string[];
  
  // Last sync status
  lastSyncedAt?: Date;
  syncStatus: DerivationSyncStatus;
  pendingChanges: number;
}

export type DerivationType =
  | 'ccds_to_smpc'      // CCDS → EU SmPC
  | 'ccds_to_uspi'      // CCDS → US PI
  | 'ccds_to_pil'       // CCDS → Patient Leaflet
  | 'smpc_to_pil'       // SmPC → Patient Leaflet
  | 'translation'       // Same content, different language
  | 'regional'          // Regional adaptation
  | 'custom';           // Custom transformation

export type DerivationSyncStatus =
  | 'synced'            // Up to date with source
  | 'pending'           // Changes pending review
  | 'conflict'          // Manual resolution needed
  | 'error';            // Sync failed

/**
 * Transformation rule for derivation
 */
export interface DerivationTransformRule {
  id: string;
  name: string;
  
  sourceType: DocumentType;
  targetType: DocumentType;
  
  // Section mappings
  sectionMappings: SectionMapping[];
  
  // Content transformations
  contentTransforms: ContentTransform[];
  
  // Active/inactive
  isActive: boolean;
  
  // Versioning
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionMapping {
  sourceSection: string;
  targetSection: string;
  transformType: 'copy' | 'adapt' | 'merge' | 'split' | 'exclude';
  transformConfig?: Record<string, unknown>;
}

export interface ContentTransform {
  type: 'simplify' | 'add_context' | 'remove_technical' | 'add_regional' | 'translate';
  config: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Change Propagation Types
// -----------------------------------------------------------------------------

/**
 * Change propagation event
 * Maps to: structured_content.change_events table
 */
export interface ChangeEvent {
  id: string;
  tenantId: string;
  
  // What changed
  sourceType: 'component' | 'document';
  sourceId: string;
  sourceVersion: string;
  
  // Type of change
  changeType: ChangeType;
  changedFields: string[];
  changeSummary: string;
  
  // Change details
  previousHash?: string;
  newHash: string;
  diff?: string;              // JSON diff of changes
  
  // Impact analysis
  impactedDocuments: ImpactedDocument[];
  impactedComponents: ImpactedComponent[];
  
  // Processing status
  status: ChangeEventStatus;
  processedAt?: Date;
  
  // Audit
  triggeredAt: Date;
  triggeredBy: string;
}

export type ChangeType =
  | 'content_update'
  | 'status_change'
  | 'version_update'
  | 'approval'
  | 'deprecation'
  | 'safety_update'
  | 'regulatory_update';

export type ChangeEventStatus =
  | 'pending'           // Awaiting processing
  | 'processing'        // Currently analyzing impact
  | 'review_required'   // Manual review needed
  | 'auto_applied'      // Automatically propagated
  | 'completed'         // Fully processed
  | 'failed';           // Processing failed

export interface ImpactedDocument {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  section: string;
  reuseType: ComponentReuseType;
  requiresReview: boolean;
  autoUpdate: boolean;
}

export interface ImpactedComponent {
  componentId: string;
  componentTitle: string;
  relationship: 'linked' | 'derived' | 'snapshot';
  requiresReview: boolean;
  autoUpdate: boolean;
}

/**
 * Change propagation configuration
 */
export interface ChangePropagationConfig {
  tenantId: string;
  
  // Auto-propagation rules
  autoPropagate: boolean;
  autoPropagateForLinked: boolean;
  autoPropagateForDerived: boolean;
  
  // Notification settings
  notifyOnChange: boolean;
  notifyOnConflict: boolean;
  notificationRecipients: string[];
  
  // Review requirements
  requireReviewForSafety: boolean;
  requireReviewForRegulatory: boolean;
  
  // Conflict resolution
  conflictResolution: 'manual' | 'source_wins' | 'target_wins';
}

// -----------------------------------------------------------------------------
// Version Control Types
// -----------------------------------------------------------------------------

/**
 * Component version history
 * Maps to: structured_content.component_versions table
 */
export interface ComponentVersion {
  id: string;
  componentId: string;
  
  version: string;
  versionNumber: number;
  
  // Content at this version
  contentFormat: ContentFormat;
  contentBody: string;
  contentHash: string;
  
  // What changed
  changeReason: string;
  changeType: VersionChangeType;
  changedSections?: string[];
  
  // Comparison
  previousVersionId?: string;
  diffFromPrevious?: string;     // JSON diff
  
  // Approval
  status: ComponentStatus;
  approvedAt?: Date;
  approvedBy?: string;
  
  // Audit
  createdAt: Date;
  createdBy: string;
}

export type VersionChangeType =
  | 'initial'
  | 'content_edit'
  | 'safety_update'
  | 'regulatory_update'
  | 'translation'
  | 'correction'
  | 'formatting'
  | 'revert';

/**
 * Document version history
 * Maps to: structured_content.document_versions table
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  
  version: string;
  versionNumber: number;
  
  // Component snapshot at this version
  componentSnapshot: DocumentComponentSnapshot[];
  
  // What changed
  changeReason: string;
  changeType: VersionChangeType;
  changedSections?: string[];
  
  // Comparison
  previousVersionId?: string;
  
  // Approval & publishing
  status: DocumentStatus;
  approvedAt?: Date;
  approvedBy?: string;
  publishedAt?: Date;
  publishedBy?: string;
  
  // Outputs generated
  outputs: DocumentOutputRecord[];
  
  // Audit
  createdAt: Date;
  createdBy: string;
}

export interface DocumentComponentSnapshot {
  componentId: string;
  componentVersion: string;
  section: string;
  displayOrder: number;
  contentHash: string;
}

export interface DocumentOutputRecord {
  id: string;
  format: OutputFormat;
  filename: string;
  storageKey: string;          // S3/R2 key
  checksum: string;
  size: number;
  generatedAt: Date;
  generatedBy: string;
}

// -----------------------------------------------------------------------------
// Review & Workflow Types (Native)
// -----------------------------------------------------------------------------

/**
 * Native review request
 * Maps to: structured_content.reviews table
 */
export interface NativeReviewRequest {
  id: string;
  tenantId: string;
  
  // What's being reviewed
  reviewType: ReviewType;
  documentId?: string;
  componentIds: string[];
  
  // Request details
  title: string;
  description?: string;
  priority: ReviewPriority;
  
  // Trigger
  trigger: ReviewTriggerInfo;
  
  // Assignment
  requestedBy: string;
  requestedAt: Date;
  assignedTo: string[];
  dueDate: Date;
  
  // Status
  status: ReviewStatus;
  completedAt?: Date;
  completedBy?: string;
  outcome?: ReviewOutcome;
  
  // Workflow
  workflowId?: string;
  currentStep?: string;
  
  // Related
  parentReviewId?: string;
  relatedReviewIds?: string[];
}

export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export type ReviewOutcome = 'approved' | 'rejected' | 'approved_with_changes' | 'escalated';

export interface ReviewTriggerInfo {
  type: ReviewTriggerType;
  sourceSystem?: string;
  sourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export type ReviewTriggerType =
  | 'manual'
  | 'safety_signal'
  | 'regulatory_request'
  | 'scheduled'
  | 'component_change'
  | 'derivation_update'
  | 'expiry_approaching'
  | 'periodic_review';

/**
 * Review decision/action
 * Maps to: structured_content.review_decisions table
 */
export interface ReviewDecision {
  id: string;
  reviewId: string;
  
  reviewerId: string;
  decision: 'approve' | 'reject' | 'request_changes' | 'escalate' | 'abstain';
  
  // Comments
  comments?: string;
  
  // Specific feedback on components
  componentFeedback?: ComponentReviewFeedback[];
  
  // Electronic signature
  signatureId?: string;
  signedAt?: Date;
  
  // Audit
  decidedAt: Date;
}

export interface ComponentReviewFeedback {
  componentId: string;
  section?: string;
  decision: 'approve' | 'reject' | 'change_requested';
  comments?: string;
  suggestedChanges?: string;
}

// -----------------------------------------------------------------------------
// AI Integration Types
// -----------------------------------------------------------------------------

/**
 * AI consistency check result
 */
export interface AIConsistencyCheck {
  id: string;
  tenantId: string;
  
  // What was checked
  documentId?: string;
  componentIds: string[];
  checkType: ConsistencyCheckType;
  
  // Results
  status: 'pending' | 'running' | 'completed' | 'failed';
  overallScore: number;          // 0-100
  issues: ConsistencyIssue[];
  
  // Processing
  startedAt: Date;
  completedAt?: Date;
  modelUsed: string;
  tokensUsed: number;
}

export type ConsistencyCheckType =
  | 'cross_document'             // Check consistency across documents
  | 'source_derived'             // Check derived matches source
  | 'regulatory_compliance'      // Check against guidelines
  | 'terminology'                // Check consistent terminology
  | 'safety_language'            // Check safety messaging
  | 'numerical_accuracy';        // Check numbers/statistics

export interface ConsistencyIssue {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  
  // Location
  componentId?: string;
  section?: string;
  elementId?: string;
  
  // Issue details
  description: string;
  foundText?: string;
  expectedText?: string;
  suggestion?: string;
  
  // Resolution
  status: 'open' | 'resolved' | 'dismissed' | 'deferred';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

// -----------------------------------------------------------------------------
// Sync & Migration Types
// -----------------------------------------------------------------------------

/**
 * Sync status with external system
 */
export interface ExternalSyncStatus {
  tenantId: string;
  externalSystem: 'docuvera';
  
  // Last sync
  lastSyncAt?: Date;
  lastSyncStatus: 'success' | 'partial' | 'failed';
  lastSyncError?: string;
  
  // Counts
  componentsInSync: number;
  componentsPending: number;
  documentsInSync: number;
  documentsPending: number;
  
  // Configuration
  syncEnabled: boolean;
  syncDirection: 'pull' | 'push' | 'bidirectional';
  autoSync: boolean;
  syncIntervalMs: number;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  tenantId: string;
  
  phase: MigrationPhase;
  startedAt?: Date;
  completedAt?: Date;
  
  // Progress
  totalComponents: number;
  migratedComponents: number;
  totalDocuments: number;
  migratedDocuments: number;
  
  // Issues
  errors: MigrationError[];
  warnings: MigrationWarning[];
}

export type MigrationPhase =
  | 'not_started'
  | 'parallel_read_only'         // Phase 1
  | 'write_through'              // Phase 2
  | 'native_primary'             // Phase 3
  | 'completed';

export interface MigrationError {
  entityType: 'component' | 'document';
  entityId: string;
  error: string;
  timestamp: Date;
}

export interface MigrationWarning {
  entityType: 'component' | 'document';
  entityId: string;
  warning: string;
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * Native Structured Content Service interface
 * Replaces DocuveraIntegrationService when migration complete
 */
export interface INativeStructuredContentService {
  // Component operations
  createComponent(data: CreateComponentInput): Promise<NativeContentComponent>;
  updateComponent(id: string, data: UpdateComponentInput): Promise<NativeContentComponent>;
  getComponent(id: string): Promise<NativeContentComponent | null>;
  getComponentVersions(id: string): Promise<ComponentVersion[]>;
  searchComponents(params: ComponentSearchInput): Promise<SearchResult<NativeContentComponent>>;
  
  // Document operations
  createDocument(data: CreateDocumentInput): Promise<NativeStructuredDocument>;
  updateDocument(id: string, data: UpdateDocumentInput): Promise<NativeStructuredDocument>;
  getDocument(id: string): Promise<NativeStructuredDocument | null>;
  getDocumentWithComponents(id: string): Promise<DocumentWithComponents | null>;
  searchDocuments(params: DocumentSearchInput): Promise<SearchResult<NativeStructuredDocument>>;
  
  // Assembly operations
  assembleDocument(documentId: string): Promise<AssembledDocument>;
  generateOutput(documentId: string, format: OutputFormat): Promise<DocumentOutputRecord>;
  
  // Derivation operations
  deriveDocument(sourceId: string, targetType: DocumentType, options: DerivationOptions): Promise<NativeStructuredDocument>;
  syncDerivedDocument(documentId: string): Promise<DerivationSyncResult>;
  
  // Change propagation
  getChangeEvents(componentId: string): Promise<ChangeEvent[]>;
  propagateChange(changeEventId: string, options: PropagationOptions): Promise<PropagationResult>;
  
  // Review operations
  createReview(data: CreateReviewInput): Promise<NativeReviewRequest>;
  submitDecision(reviewId: string, decision: ReviewDecision): Promise<NativeReviewRequest>;
  getPendingReviews(userId: string): Promise<NativeReviewRequest[]>;
  
  // AI operations
  runConsistencyCheck(componentIds: string[], checkType: ConsistencyCheckType): Promise<AIConsistencyCheck>;
  
  // Sync operations
  getSyncStatus(): Promise<ExternalSyncStatus>;
  triggerSync(): Promise<void>;
  getMigrationStatus(): Promise<MigrationStatus>;
}

// -----------------------------------------------------------------------------
// Input/Output Types
// -----------------------------------------------------------------------------

export interface CreateComponentInput {
  title: string;
  section: string;
  contentFormat: ContentFormat;
  contentBody: string;
  productId: string;
  markets: string[];
  language: string;
  componentType: ComponentType;
  tags?: string[];
  sourceComponentId?: string;
  reuseType?: ComponentReuseType;
}

export interface UpdateComponentInput {
  title?: string;
  contentBody?: string;
  status?: ComponentStatus;
  markets?: string[];
  tags?: string[];
  changeReason: string;
}

export interface ComponentSearchInput {
  query?: string;
  productId?: string;
  section?: string;
  status?: ComponentStatus[];
  componentType?: ComponentType[];
  language?: string;
  markets?: string[];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface CreateDocumentInput {
  title: string;
  type: DocumentType;
  productId: string;
  markets: string[];
  language: string;
  templateId?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  status?: DocumentStatus;
  markets?: string[];
  effectiveDate?: Date;
  changeReason: string;
}

export interface DocumentSearchInput {
  query?: string;
  productId?: string;
  type?: DocumentType[];
  category?: DocumentCategory;
  status?: DocumentStatus[];
  markets?: string[];
  limit?: number;
  offset?: number;
}

export interface DocumentWithComponents {
  document: NativeStructuredDocument;
  components: Array<{
    assembly: DocumentComponentAssembly;
    component: NativeContentComponent;
  }>;
}

export interface AssembledDocument {
  document: NativeStructuredDocument;
  sections: AssembledSection[];
  metadata: Record<string, unknown>;
}

export interface AssembledSection {
  section: string;
  title: string;
  content: string;
  format: ContentFormat;
  componentId: string;
  componentVersion: string;
}

export interface DerivationOptions {
  targetMarkets: string[];
  targetLanguage: string;
  transformRuleId?: string;
  autoApprove?: boolean;
}

export interface DerivationSyncResult {
  success: boolean;
  updatedSections: string[];
  conflicts: string[];
  requiresReview: boolean;
}

export interface PropagationOptions {
  autoApply: boolean;
  notifyOwners: boolean;
  skipReview?: boolean;
}

export interface PropagationResult {
  success: boolean;
  documentsUpdated: number;
  componentsUpdated: number;
  reviewsCreated: number;
  errors: string[];
}

export interface CreateReviewInput {
  reviewType: ReviewType;
  documentId?: string;
  componentIds: string[];
  title: string;
  description?: string;
  priority: ReviewPriority;
  assignTo: string[];
  dueDate: Date;
  trigger: ReviewTriggerInfo;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

export const DEFAULT_CHANGE_PROPAGATION_CONFIG: Omit<ChangePropagationConfig, 'tenantId'> = {
  autoPropagate: false,
  autoPropagateForLinked: true,
  autoPropagateForDerived: false,
  notifyOnChange: true,
  notifyOnConflict: true,
  notificationRecipients: [],
  requireReviewForSafety: true,
  requireReviewForRegulatory: true,
  conflictResolution: 'manual',
};

export const DEFAULT_SYNC_CONFIG: Partial<ExternalSyncStatus> = {
  syncEnabled: true,
  syncDirection: 'bidirectional',
  autoSync: false,
  syncIntervalMs: 300000, // 5 minutes
};
