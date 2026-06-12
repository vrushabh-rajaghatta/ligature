
/**
 * Submissions API Client
 * Provides typed fetch wrappers for Submissions endpoints
 * Version: 0.13.2
 */

// =============================================================================
// TYPES
// =============================================================================

export type SubmissionType = 'NDA' | 'BLA' | 'MAA' | 'J-NDA' | 'IND' | 'CTA' | 'sNDA' | 'sBLA' | 'Type II Variation';
export type SubmissionStatus = 'Draft' | 'In Progress' | 'QC Review' | 'Ready' | 'Submitted' | 'Under Review' | 'Approved' | 'CRL';
export type Region = 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'Australia' | 'Brazil' | 'UK' | 'APAC' | 'LATAM';
export type QCStatus = 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
export type ECTDStatus = 'Pending' | 'Valid' | 'Invalid';

// Wizard state for resumable sessions
export interface WizardState {
  currentStep: string;
  application: {
    type: string;
    number: string;
    region: string;
    sponsor: string;
    productName: string;
    substanceName: string;
  };
  sequenceInfo: {
    type: string;
    description: string;
    relatedCorrespondence?: string;
    relatedSequence?: string;
  };
  documentAssignments: Array<{
    sectionId: string;
    sectionName: string;
    sourceDocId?: string;
    sourceDocName?: string;
    operation: string;
    status: string;
  }>;
  expandedSections: string[];
  validationComplete: boolean;
  lastSavedAt: string;
}

// Document assignment for eCTD sections
export interface DocumentAssignment {
  id?: string;
  submissionId?: string;
  sectionId: string;
  sectionName: string;
  sourceDocId?: string | null;
  sourceDocName?: string | null;
  operation: 'new' | 'replace' | 'append' | 'delete';
  status: 'assigned' | 'pending' | 'validated' | 'published';
  validatedAt?: string | null;
  validationResult?: Record<string, unknown> | null;
  assignedBy?: string | null;
  assignedAt?: string;
  modifiedAt?: string;
}

export interface DocumentAssignmentsResponse {
  data: DocumentAssignment[];
  total: number;
}

export interface SaveDocumentAssignmentsResponse {
  data: DocumentAssignment[];
  created: number;
}

export interface Submission {
  id: string;
  productId: string;
  productName: string | null;
  applicationId: string | null;
  applicationNumber: string | null;
  sequenceNumber: string;
  type: SubmissionType;
  region: Region;
  agency: string;
  status: SubmissionStatus;
  targetDate: string;
  daysUntilTarget: number;
  modulesComplete: number;
  modulesTotal: number;
  moduleProgress: Record<string, number>;
  qcStatus: QCStatus;
  ectdStatus: ECTDStatus;
  description: string | null;
  wizardState: WizardState | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionListParams {
  status?: SubmissionStatus | 'all';
  type?: SubmissionType | 'all';
  applicationId?: string;
  productId?: string;
  region?: Region | 'all';
  search?: string;
  sortBy?: 'createdAt' | 'status' | 'type' | 'sequenceNumber' | 'targetDate';
  sortDir?: 'asc' | 'desc';
}

export interface SubmissionStats {
  total: number;
  byStatus: {
    draft: number;
    inProgress: number;
    qcReview: number;
    ready: number;
    submitted: number;
  };
  upcomingDeadlines: number;
  overdue: number;
}

export interface SubmissionListResponse {
  data: Submission[];
  total: number;
  stats: SubmissionStats;
}

export interface SubmissionResponse {
  data: Submission;
}

export interface CreateSubmissionParams {
  productId: string;
  applicationId?: string;
  type?: SubmissionType;
  region?: Region;
  agency?: string;
  targetDate?: string;
  description?: string;
  modulesTotal?: number;
}

export interface UpdateSubmissionParams {
  status?: SubmissionStatus;
  type?: SubmissionType;
  region?: Region;
  agency?: string;
  targetDate?: string;
  description?: string;
  qcStatus?: QCStatus;
  ectdStatus?: ECTDStatus;
  modulesComplete?: number;
  modulesTotal?: number;
  moduleProgress?: Record<string, number>;
  sequenceNumber?: string;
  wizardState?: WizardState;
}

// =============================================================================
// API CLIENT
// =============================================================================

class SubmissionsApiClient {
  private baseUrl = '/api/submissions';
  
  /**
   * Check if database is available by making a test request
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?limit=1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * List submissions with filters
   */
  async list(params?: SubmissionListParams): Promise<SubmissionListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.type && params.type !== 'all') {
      searchParams.set('type', params.type);
    }
    if (params?.applicationId) {
      searchParams.set('applicationId', params.applicationId);
    }
    if (params?.productId) {
      searchParams.set('productId', params.productId);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.sortBy) {
      searchParams.set('sortBy', params.sortBy);
    }
    if (params?.sortDir) {
      searchParams.set('sortDir', params.sortDir);
    }
    
    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single submission by ID
   */
  async get(id: string): Promise<SubmissionResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Submission not found');
      }
      throw new Error(`Failed to fetch submission: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new submission
   */
  async create(data: CreateSubmissionParams): Promise<SubmissionResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to create submission: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update submission
   */
  async update(id: string, data: UpdateSubmissionParams): Promise<SubmissionResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Submission not found');
      }
      throw new Error(`Failed to update submission: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete submission
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Submission not found');
      }
      throw new Error(`Failed to delete submission: ${response.status}`);
    }
  }
  
  /**
   * Get submissions by application
   */
  async getByApplication(applicationId: string): Promise<SubmissionListResponse> {
    return this.list({ applicationId });
  }
  
  /**
   * Get submissions by product (via metadata)
   */
  async getByProduct(productId: string): Promise<SubmissionListResponse> {
    return this.list({ productId });
  }
  
  /**
   * Get submissions by status
   */
  async getByStatus(status: SubmissionStatus): Promise<SubmissionListResponse> {
    return this.list({ status });
  }
  
  /**
   * Get submissions in draft status
   */
  async getDrafts(): Promise<SubmissionListResponse> {
    return this.list({ status: 'Draft' });
  }
  
  /**
   * Get submissions ready for submission
   */
  async getReady(): Promise<SubmissionListResponse> {
    return this.list({ status: 'Ready' });
  }
  
  /**
   * Get overdue submissions
   */
  async getOverdue(): Promise<SubmissionListResponse> {
    const response = await this.list();
    return {
      ...response,
      data: response.data.filter(s => 
        s.daysUntilTarget < 0 && 
        s.status !== 'Submitted' && 
        s.status !== 'Approved'
      ),
    };
  }
  
  /**
   * Get upcoming submissions (within 30 days)
   */
  async getUpcoming(): Promise<SubmissionListResponse> {
    const response = await this.list();
    return {
      ...response,
      data: response.data.filter(s => 
        s.daysUntilTarget <= 30 && 
        s.daysUntilTarget > 0 && 
        s.status !== 'Submitted' && 
        s.status !== 'Approved'
      ),
    };
  }
  
  /**
   * Update submission status
   */
  async updateStatus(id: string, status: SubmissionStatus): Promise<SubmissionResponse> {
    return this.update(id, { status });
  }
  
  /**
   * Update QC status
   */
  async updateQCStatus(id: string, qcStatus: QCStatus): Promise<SubmissionResponse> {
    return this.update(id, { qcStatus });
  }
  
  /**
   * Update eCTD status
   */
  async updateECTDStatus(id: string, ectdStatus: ECTDStatus): Promise<SubmissionResponse> {
    return this.update(id, { ectdStatus });
  }
  
  /**
   * Update module progress
   */
  async updateModuleProgress(id: string, moduleProgress: Record<string, number>): Promise<SubmissionResponse> {
    return this.update(id, { moduleProgress });
  }
  
  /**
   * Save wizard state for resumable sessions
   */
  async saveWizardState(id: string, wizardState: WizardState): Promise<SubmissionResponse> {
    return this.update(id, { wizardState });
  }
  
  /**
   * Get wizard state for a submission
   */
  async getWizardState(id: string): Promise<WizardState | null> {
    const response = await this.get(id);
    return response.data.wizardState;
  }
  
  // ===========================================================================
  // DOCUMENT ASSIGNMENTS
  // ===========================================================================
  
  /**
   * Get all document assignments for a submission
   */
  async getDocumentAssignments(submissionId: string): Promise<DocumentAssignmentsResponse> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/documents`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Submission not found');
      }
      throw new Error(`Failed to fetch document assignments: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Save document assignments for a submission (bulk upsert)
   */
  async saveDocumentAssignments(
    submissionId: string, 
    assignments: Omit<DocumentAssignment, 'id' | 'submissionId' | 'assignedAt' | 'modifiedAt'>[]
  ): Promise<SaveDocumentAssignmentsResponse> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to save document assignments: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Remove a specific document assignment
   */
  async removeDocumentAssignment(submissionId: string, sectionId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${submissionId}/documents?sectionId=${encodeURIComponent(sectionId)}`,
      { method: 'DELETE' }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to remove document assignment: ${response.status}`);
    }
  }
  
  /**
   * Clear all document assignments for a submission
   */
  async clearDocumentAssignments(submissionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/documents`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear document assignments: ${response.status}`);
    }
  }
  
  // ===========================================================================
  // eCTD XML GENERATION
  // ===========================================================================
  
  /**
   * Generate eCTD XML backbone for a submission
   */
  async generateECTD(
    submissionId: string, 
    options?: {
      ectdVersion?: '3.2.2' | '4.0';
      includeRegional?: boolean;
      validateOnly?: boolean;
    }
  ): Promise<ECTDGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/generate-ectd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to generate eCTD: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get previously generated eCTD XML for a submission
   */
  async getGeneratedECTD(submissionId: string): Promise<{
    hasXml: boolean;
    backbone?: string;
    metadata?: Record<string, unknown>;
    generatedAt?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/generate-ectd`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { hasXml: false };
      }
      throw new Error(`Failed to fetch eCTD: ${response.status}`);
    }
    
    return response.json();
  }
  
  // ===========================================================================
  // PDF VALIDATION
  // ===========================================================================
  
  /**
   * Validate PDF documents for a submission
   */
  async validatePDFs(
    submissionId: string,
    options?: PDFValidationRequest
  ): Promise<PDFValidationResponse> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/validate-pdfs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to validate PDFs: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get stored PDF validation results for a submission
   */
  async getStoredPDFValidation(submissionId: string): Promise<StoredPDFValidationResponse> {
    const response = await fetch(`${this.baseUrl}/${submissionId}/validate-pdfs`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { hasValidation: false };
      }
      throw new Error(`Failed to fetch PDF validation: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Validate specific documents by ID
   */
  async validateSpecificPDFs(
    submissionId: string,
    documentIds: string[]
  ): Promise<PDFValidationResponse> {
    return this.validatePDFs(submissionId, { documentIds });
  }
}

// ===========================================================================
// PDF VALIDATION TYPES
// ===========================================================================

export interface PDFValidationRequest {
  documentIds?: string[];
  validateAll?: boolean;
  includeAutoFixSimulation?: boolean;
  storeResults?: boolean;
}

export interface PDFValidationSummary {
  totalDocuments: number;
  passedDocuments: number;
  failedDocuments: number;
  warningDocuments: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
}

export interface PDFDocumentInfo {
  pdfVersion: string;
  isPdfA: boolean;
  pdfALevel?: string;
  hasBookmarks: boolean;
  bookmarkCount: number;
  hasHyperlinks: boolean;
  hyperlinkCount: number;
  brokenLinkCount: number;
  pageCount: number;
  hasEmbeddedFonts: boolean;
  hasEncryption: boolean;
  hasJavaScript: boolean;
}

export interface PDFDocumentValidationResult {
  documentId: string;
  sectionId: string;
  sectionName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  passed: boolean;
  status: 'valid' | 'invalid' | 'warning';
  pdfInfo: PDFDocumentInfo;
  issues: ECTDValidationIssue[];
  autoFixable: string[];
}

export interface PDFValidationResponse {
  success: boolean;
  summary: PDFValidationSummary;
  documents: PDFDocumentValidationResult[];
  commonIssues: Array<{
    code: string;
    count: number;
    message: string;
  }>;
  duration: number;
  validatedAt: string;
}

export interface StoredPDFValidationResponse {
  hasValidation: boolean;
  validatedAt?: string;
  summary?: {
    totalDocuments: number;
    passedDocuments: number;
    failedDocuments: number;
    warningDocuments: number;
    overallPassed: boolean;
  };
  documents?: Partial<PDFDocumentValidationResult>[];
  message?: string;
}

// ===========================================================================
// eCTD GENERATION TYPES
// ===========================================================================

export interface ECTDValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  code: string;
  message: string;
  details?: string;
  sectionNumber?: string;
  autoFixable: boolean;
  manualFixGuidance?: string;
}

export interface ECTDGenerationResponse {
  success: boolean;
  backbone?: string;
  regionalXml?: string;
  validation: {
    passed: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    issues: ECTDValidationIssue[];
  };
  metadata: {
    ectdVersion: '3.2.2' | '4.0';
    generatedAt: string;
    documentCount: number;
    modulesSummary: Record<string, number>;
  };
}

// ===========================================================================
// PUBLISHING QUEUE TYPES
// ===========================================================================

export type QueueItemStatus = 
  | 'pending'        // Waiting in queue
  | 'validating'     // Currently running validation
  | 'validated'      // Passed validation, ready to publish
  | 'validation_failed' // Failed validation
  | 'publishing'     // Currently publishing to gateway
  | 'completed'      // Successfully published
  | 'failed';        // Publishing failed

export interface QueueItem {
  id: string;
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productName: string;
  region: string;
  submissionType: string;
  status: QueueItemStatus;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  progress: number;
  currentStep?: string;
  
  // Validation results
  validationPassed?: boolean;
  ectdErrors?: number;
  ectdWarnings?: number;
  pdfErrors?: number;
  pdfWarnings?: number;
  
  // Publishing results  
  gatewayTarget?: string;
  acknowledgementNumber?: string;
  gatewayStatus?: string;
  
  // Timestamps
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  
  // User info
  addedBy?: string;
  assignedTo?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  validating: number;
  validated: number;
  validationFailed: number;
  publishing: number;
  completed: number;
  failed: number;
}

export interface QueueListResponse {
  data: QueueItem[];
  stats: QueueStats;
}

export interface AddToQueueRequest {
  submissionId: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  gatewayTarget?: string;
  assignedTo?: string;
}

export interface AddToQueueResponse {
  success: boolean;
  item: QueueItem;
}

export interface BatchValidationRequest {
  itemIds?: string[];
  validateAll?: boolean;
}

export interface BatchValidationResponse {
  success: boolean;
  started: number;
  failed: number;
  results: Array<{
    itemId: string;
    status: 'started' | 'skipped' | 'error';
    message?: string;
  }>;
}

export interface BatchPublishRequest {
  itemIds?: string[];
  publishAllValidated?: boolean;
  gatewayTarget?: string;
}

export interface BatchPublishResponse {
  success: boolean;
  started: number;
  failed: number;
  results: Array<{
    itemId: string;
    status: 'started' | 'skipped' | 'error';
    message?: string;
  }>;
}

// ===========================================================================
// GATEWAY TYPES
// ===========================================================================

export type GatewayType = 'fda-esg' | 'ema-cesp' | 'hc-ctr' | 'pmda-gateway';
export type GatewayConnectionStatus = 'online' | 'degraded' | 'offline' | 'maintenance';
export type GatewaySubmissionStatus = 'pending' | 'transmitting' | 'submitted' | 'acknowledged' | 'rejected' | 'failed';

export interface GatewayStatus {
  id: GatewayType;
  name: string;
  region: string;
  status: GatewayConnectionStatus;
  latency?: number;
  lastChecked: string;
  message?: string;
  supportedFormats: string[];
  validationRulesVersion: string;
}

export interface GatewayValidationRule {
  id: string;
  gatewayId: GatewayType;
  category: 'format' | 'structure' | 'content' | 'technical';
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  autoCheck: boolean;
  version: string;
}

export interface GatewaySubmission {
  id: string;
  projectId: string;
  sequenceNumber: string;
  applicationNumber: string;
  submissionType: string;
  gateway: GatewayType;
  environment: 'test' | 'production';
  status: GatewaySubmissionStatus;
  trackingNumber?: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  submittedAt: string;
  submittedBy: string;
  acknowledgments: GatewayAck[];
  errors: GatewayError[];
  retryCount: number;
  lastRetryAt?: string;
}

export interface GatewayAck {
  id: string;
  type: string;
  status: 'success' | 'warning' | 'error';
  receivedAt: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface GatewayError {
  code: string;
  message: string;
  severity: 'fatal' | 'error' | 'warning';
  location?: string;
  timestamp: string;
}

export interface GatewayListResponse {
  gateways: GatewayStatus[];
  totalRules: number;
  checkedAt: string;
}

export interface GatewaySubmitRequest {
  projectId: string;
  sequenceNumber: string;
  applicationNumber?: string;
  submissionType?: string;
  gateway: GatewayType;
  environment?: 'test' | 'production';
  fileName?: string;
  fileSize?: number;
  checksum?: string;
  submittedBy?: string;
}

export interface GatewaySubmitResponse {
  success: boolean;
  submission: {
    id: string;
    trackingNumber: string;
    status: GatewaySubmissionStatus;
    gateway: GatewayType;
    environment: 'test' | 'production';
    submittedAt: string;
  };
}

// Extend the API client with queue methods
class SubmissionsApiClientExtended extends SubmissionsApiClient {
  private queueUrl = '/api/submissions';
  
  // ===========================================================================
  // PUBLISHING QUEUE
  // ===========================================================================
  
  /**
   * Get all items in the publishing queue
   */
  async getQueue(options?: {
    status?: QueueItemStatus;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
  }): Promise<QueueListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.priority) params.set('priority', options.priority);
    
    const response = await fetch(`${this.queueUrl}/queue?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch queue: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Add a submission to the publishing queue
   */
  async addToQueue(request: AddToQueueRequest): Promise<AddToQueueResponse> {
    const response = await fetch(`${this.queueUrl}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to add to queue: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Remove an item from the queue
   */
  async removeFromQueue(itemId: string): Promise<void> {
    const response = await fetch(`${this.queueUrl}/queue/${itemId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove from queue: ${response.status}`);
    }
  }
  
  /**
   * Update queue item priority or assignment
   */
  async updateQueueItem(itemId: string, updates: {
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    assignedTo?: string;
    gatewayTarget?: string;
  }): Promise<QueueItem> {
    const response = await fetch(`${this.queueUrl}/queue/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update queue item: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Run batch validation on queue items
   */
  async batchValidate(request: BatchValidationRequest): Promise<BatchValidationResponse> {
    const response = await fetch(`${this.queueUrl}/queue/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to start batch validation: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Run batch publish on validated queue items
   */
  async batchPublish(request: BatchPublishRequest): Promise<BatchPublishResponse> {
    const response = await fetch(`${this.queueUrl}/queue/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to start batch publish: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Retry a failed queue item
   */
  async retryQueueItem(itemId: string): Promise<QueueItem> {
    const response = await fetch(`${this.queueUrl}/queue/${itemId}/retry`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to retry queue item: ${response.status}`);
    }
    
    return response.json();
  }
  
  // ===========================================================================
  // GATEWAY API
  // ===========================================================================
  
  private gatewayUrl = '/api/gateways';
  
  /**
   * Get list of all gateways with status
   */
  async getGateways(includeRules = false): Promise<GatewayListResponse> {
    const params = new URLSearchParams();
    if (includeRules) params.set('includeRules', 'true');
    
    const response = await fetch(`${this.gatewayUrl}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gateways: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get a specific gateway status
   */
  async getGatewayStatus(gatewayId: GatewayType, includeRules = false): Promise<GatewayStatus & { validationRules?: GatewayValidationRule[] }> {
    const params = new URLSearchParams();
    params.set('gateway', gatewayId);
    if (includeRules) params.set('includeRules', 'true');
    
    const response = await fetch(`${this.gatewayUrl}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gateway status: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Check gateway connection (ping)
   */
  async checkGatewayConnection(gatewayId: GatewayType): Promise<{
    id: GatewayType;
    status: GatewayConnectionStatus;
    latency: number;
    lastChecked: string;
    message?: string;
  }> {
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check gateway connection: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Submit to a regulatory gateway
   */
  async submitToGateway(request: GatewaySubmitRequest): Promise<GatewaySubmitResponse> {
    const response = await fetch(`${this.gatewayUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to submit to gateway: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get gateway submission status
   */
  async getGatewaySubmission(submissionId: string): Promise<{ submission: GatewaySubmission }> {
    const response = await fetch(`${this.gatewayUrl}/submit?id=${submissionId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Submission not found');
      }
      throw new Error(`Failed to fetch submission: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * List gateway submissions
   */
  async listGatewaySubmissions(options?: {
    projectId?: string;
    gateway?: GatewayType;
  }): Promise<{ submissions: GatewaySubmission[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.projectId) params.set('projectId', options.projectId);
    if (options?.gateway) params.set('gateway', options.gateway);
    
    const response = await fetch(`${this.gatewayUrl}/submit?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to list submissions: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Poll for new acknowledgments
   */
  async pollGatewayAcknowledgments(submissionId: string): Promise<{
    newAcknowledgments: GatewayAck[];
    currentStatus: GatewaySubmissionStatus;
    totalAcknowledgments: number;
    message?: string;
  }> {
    const response = await fetch(`${this.gatewayUrl}/submit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, action: 'poll' }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to poll acknowledgments: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Retry a failed gateway submission
   */
  async retryGatewaySubmission(submissionId: string): Promise<GatewaySubmitResponse> {
    const response = await fetch(`${this.gatewayUrl}/submit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, action: 'retry' }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to retry submission: ${response.status}`);
    }
    
    return response.json();
  }
  
  // ===========================================================================
  // SUBMISSION HISTORY API
  // ===========================================================================
  
  /**
   * Get submission history with filtering
   */
  async getSubmissionHistory(options?: {
    gateway?: GatewayType;
    status?: GatewaySubmissionStatus;
    environment?: 'test' | 'production';
    startDate?: string;
    endDate?: string;
    projectId?: string;
    search?: string;
  }): Promise<{
    submissions: GatewaySubmission[];
    stats: {
      total: number;
      byStatus: Record<string, number>;
      byGateway: Record<string, number>;
      byEnvironment: Record<string, number>;
      totalRetries: number;
      totalAcknowledgments: number;
      totalErrors: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.gateway) params.set('gateway', options.gateway);
    if (options?.status) params.set('status', options.status);
    if (options?.environment) params.set('environment', options.environment);
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);
    if (options?.projectId) params.set('projectId', options.projectId);
    if (options?.search) params.set('search', options.search);
    
    const response = await fetch(`${this.gatewayUrl}/history?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch submission history: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Download submission receipt XML
   */
  async downloadSubmissionReceipt(submissionId: string): Promise<Blob> {
    const response = await fetch(
      `${this.gatewayUrl}/history?download=xml&submissionId=${submissionId}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download receipt: ${response.status}`);
    }
    
    return response.blob();
  }
  
  /**
   * Download specific acknowledgment XML
   */
  async downloadAcknowledgmentXML(submissionId: string, ackId: string): Promise<Blob> {
    const response = await fetch(
      `${this.gatewayUrl}/history?download=xml&submissionId=${submissionId}&ackId=${ackId}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download acknowledgment: ${response.status}`);
    }
    
    return response.blob();
  }
  
  /**
   * Export submission history as CSV
   */
  async exportHistoryCSV(options?: {
    gateway?: GatewayType;
    status?: GatewaySubmissionStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (options?.gateway) params.set('gateway', options.gateway);
    if (options?.status) params.set('status', options.status);
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);
    
    const response = await fetch(`${this.gatewayUrl}/history?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to export history: ${response.status}`);
    }
    
    return response.blob();
  }
}

// Export singleton instance
export const submissionsApi = new SubmissionsApiClientExtended();
