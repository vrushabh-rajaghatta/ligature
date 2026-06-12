// =============================================================================
// DOCUVERA INTEGRATION TYPES
// =============================================================================
// Type definitions for Docuvera structured content integration.
// These types define the interface contract that can be fulfilled by:
//   1. External Docuvera API (current integration)
//   2. Native Ligature Structured Content module (future replacement)
// =============================================================================

// -----------------------------------------------------------------------------
// Document Types
// -----------------------------------------------------------------------------

/** Document type categories */
export type DocumentCategory = 'labeling' | 'clinical' | 'quality' | 'regulatory';

/** Specific document types */
export type DocumentType =
  // Labeling
  | 'ccds'      // Company Core Data Sheet
  | 'smpc'      // Summary of Product Characteristics
  | 'uspi'      // US Prescribing Information
  | 'pil'       // Patient Information Leaflet
  | 'epi'       // Electronic Product Information
  // Clinical
  | 'protocol'
  | 'csr'       // Clinical Study Report
  | 'ib'        // Investigator's Brochure
  | 'dsur'      // Development Safety Update Report
  | 'psur'      // Periodic Safety Update Report
  // Quality
  | 'sop'       // Standard Operating Procedure
  | 'wi'        // Work Instruction
  | 'form'
  | 'specification'
  // Regulatory
  | 'ctd_module'
  | 'cover_letter'
  | 'response_document';

/** Document status */
export type DocumentStatus = 
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'superseded'
  | 'withdrawn';

/** Output format types */
export type OutputFormat = 'pdf' | 'xml' | 'html' | 'docx' | 'rtf';

// -----------------------------------------------------------------------------
// Component Types
// -----------------------------------------------------------------------------

/** Component status */
export type ComponentStatus = 
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'locked'
  | 'deprecated';

/** Component reuse type */
export type ComponentReuseType = 
  | 'source'      // Original/master component
  | 'linked'      // Linked to source, auto-updates
  | 'snapshot'    // Point-in-time copy, manual updates
  | 'derived';    // Modified from source

/** Structured content component */
export interface ContentComponent {
  /** Unique component ID */
  id: string;
  /** External system ID (e.g., Docuvera ID) */
  externalId?: string;
  /** Component title */
  title: string;
  /** Section identifier (e.g., "4.1", "2.5.1") */
  section: string;
  /** Component content (structured) */
  content: ComponentContent;
  /** Current status */
  status: ComponentStatus;
  /** Version string */
  version: string;
  /** Content hash for integrity */
  hash: string;
  /** Reuse type */
  reuseType: ComponentReuseType;
  /** Source component ID if linked/derived */
  sourceComponentId?: string;
  /** Metadata tags */
  metadata: ComponentMetadata;
  /** Audit trail */
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

/** Component content structure */
export interface ComponentContent {
  /** Content format */
  format: 'xml' | 'html' | 'markdown' | 'plain';
  /** Raw content */
  body: string;
  /** Structured elements within content */
  elements?: ContentElement[];
}

/** Structured content element */
export interface ContentElement {
  type: 'paragraph' | 'table' | 'list' | 'figure' | 'heading' | 'reference';
  id: string;
  content: string;
  attributes?: Record<string, string>;
}

/** Component metadata */
export interface ComponentMetadata {
  /** Product associations */
  productIds: string[];
  /** Market/region applicability */
  markets: string[];
  /** Language */
  language: string;
  /** Therapeutic area */
  therapeuticArea?: string;
  /** Regulatory classification */
  regulatoryClass?: string;
  /** Custom tags */
  tags: string[];
}

// -----------------------------------------------------------------------------
// Document Types
// -----------------------------------------------------------------------------

/** Structured document */
export interface StructuredDocument {
  /** Unique document ID */
  id: string;
  /** External system ID */
  externalId?: string;
  /** Document type */
  type: DocumentType;
  /** Document category */
  category: DocumentCategory;
  /** Document title */
  title: string;
  /** Current status */
  status: DocumentStatus;
  /** Version string */
  version: string;
  /** Product ID */
  productId: string;
  /** Components that make up this document */
  components: DocumentComponentRef[];
  /** Available output formats */
  outputs: DocumentOutput[];
  /** Document-level metadata */
  metadata: DocumentMetadata;
  /** Audit trail */
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

/** Reference to component within document */
export interface DocumentComponentRef {
  componentId: string;
  section: string;
  order: number;
  reuseType: ComponentReuseType;
  version: string;
  hash: string;
}

/** Document output */
export interface DocumentOutput {
  format: OutputFormat;
  url: string;
  generatedAt: string;
  checksum: string;
  size: number;
}

/** Document metadata */
export interface DocumentMetadata {
  /** Markets/regions */
  markets: string[];
  /** Language */
  language: string;
  /** Effective date */
  effectiveDate?: string;
  /** Expiry date */
  expiryDate?: string;
  /** Regulatory reference numbers */
  regulatoryRefs: string[];
  /** Related documents */
  relatedDocuments: string[];
  /** Custom attributes */
  attributes: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Template Types
// -----------------------------------------------------------------------------

/** Document template */
export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  category: DocumentCategory;
  /** Template structure */
  structure: TemplateSection[];
  /** Default metadata */
  defaultMetadata: Partial<DocumentMetadata>;
  /** Applicable markets */
  markets: string[];
  /** Version */
  version: string;
  status: 'active' | 'draft' | 'deprecated';
}

/** Template section */
export interface TemplateSection {
  id: string;
  section: string;
  title: string;
  required: boolean;
  repeatable: boolean;
  /** Component type restrictions */
  allowedComponentTypes?: string[];
  /** Subsections */
  children?: TemplateSection[];
  /** Guidance text */
  guidance?: string;
}

// -----------------------------------------------------------------------------
// Review & Workflow Types
// -----------------------------------------------------------------------------

/** Review request */
export interface ReviewRequest {
  id: string;
  documentId?: string;
  componentIds: string[];
  type: ReviewType;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedBy: string;
  requestedAt: string;
  dueDate: string;
  status: ReviewStatus;
  reviewers: Reviewer[];
  comments: ReviewComment[];
  trigger?: ReviewTrigger;
}

/** Review type */
export type ReviewType = 
  | 'initial_review'
  | 'content_update'
  | 'safety_update'
  | 'regulatory_update'
  | 'periodic_review'
  | 'translation_review';

/** Review status */
export type ReviewStatus = 
  | 'pending'
  | 'in_progress'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled';

/** Reviewer */
export interface Reviewer {
  userId: string;
  role: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  reviewedAt?: string;
  comments?: string;
}

/** Review comment */
export interface ReviewComment {
  id: string;
  userId: string;
  componentId?: string;
  elementId?: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

/** What triggered the review */
export interface ReviewTrigger {
  type: 'manual' | 'safety_signal' | 'regulatory_request' | 'scheduled' | 'component_change';
  sourceSystem?: string;
  sourceId?: string;
  description?: string;
  data?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Search & Query Types
// -----------------------------------------------------------------------------

/** Component search parameters */
export interface ComponentSearchParams {
  query?: string;
  productId?: string;
  section?: string;
  status?: ComponentStatus | ComponentStatus[];
  language?: string;
  markets?: string[];
  tags?: string[];
  updatedAfter?: string;
  updatedBefore?: string;
  limit?: number;
  offset?: number;
}

/** Document search parameters */
export interface DocumentSearchParams {
  query?: string;
  productId?: string;
  type?: DocumentType | DocumentType[];
  category?: DocumentCategory;
  status?: DocumentStatus | DocumentStatus[];
  markets?: string[];
  updatedAfter?: string;
  updatedBefore?: string;
  limit?: number;
  offset?: number;
}

/** Search result */
export interface SearchResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// Event Types (Webhooks)
// -----------------------------------------------------------------------------

/** Event types from content system */
export type ContentEventType =
  | 'component.created'
  | 'component.updated'
  | 'component.approved'
  | 'component.deprecated'
  | 'document.created'
  | 'document.updated'
  | 'document.approved'
  | 'document.published'
  | 'document.superseded'
  | 'review.requested'
  | 'review.completed'
  | 'review.rejected';

/** Base event structure */
export interface ContentEvent<T = unknown> {
  id: string;
  type: ContentEventType;
  timestamp: string;
  source: 'docuvera' | 'ligature';
  tenantId: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

/** Component event payload */
export interface ComponentEventPayload {
  componentId: string;
  component: ContentComponent;
  previousVersion?: string;
  changedFields?: string[];
  affectedDocuments?: string[];
}

/** Document event payload */
export interface DocumentEventPayload {
  documentId: string;
  document: StructuredDocument;
  previousVersion?: string;
  changedComponents?: string[];
  outputs?: DocumentOutput[];
}

/** Review event payload */
export interface ReviewEventPayload {
  reviewId: string;
  review: ReviewRequest;
  outcome?: 'approved' | 'rejected' | 'changes_requested';
}

// -----------------------------------------------------------------------------
// Integration Configuration
// -----------------------------------------------------------------------------

/** Docuvera connection configuration */
export interface DocuveraConfig {
  /** Base URL for Docuvera API */
  baseUrl: string;
  /** API version */
  apiVersion: string;
  /** Authentication method */
  authMethod: 'api_key' | 'oauth2' | 'saml';
  /** API key (if using api_key auth) */
  apiKey?: string;
  /** OAuth2 config */
  oauth2?: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scopes: string[];
  };
  /** Webhook secret for signature verification */
  webhookSecret: string;
  /** Request timeout in ms */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxRetries: number;
    backoffMs: number;
  };
}

/** Sync configuration */
export interface SyncConfig {
  /** Enable auto-sync of approved documents */
  autoSyncApproved: boolean;
  /** Enable auto-sync of components */
  autoSyncComponents: boolean;
  /** Sync interval in ms (for polling fallback) */
  syncInterval: number;
  /** Document types to sync */
  documentTypes: DocumentType[];
  /** Markets to sync */
  markets: string[];
}

// -----------------------------------------------------------------------------
// Mapping Types (for eCTD integration)
// -----------------------------------------------------------------------------

/** Component to eCTD leaf mapping */
export interface EctdMapping {
  componentId: string;
  section: string;
  ectdModule: string;
  ectdSection: string;
  leafTitle: string;
  outputFormat: OutputFormat;
}

/** Submission content requirements */
export interface SubmissionContentRequirements {
  submissionType: string;
  healthAuthority: string;
  requiredSections: RequiredSection[];
  optionalSections: RequiredSection[];
}

/** Required section */
export interface RequiredSection {
  ectdSection: string;
  title: string;
  documentTypes: DocumentType[];
  componentTypes?: string[];
  mandatory: boolean;
  guidance?: string;
}
