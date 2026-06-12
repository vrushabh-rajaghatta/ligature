
/**
 * Safety API Client
 * Provides typed fetch wrappers for Safety endpoints
 * Version: 0.13.1
 */

// =============================================================================
// TYPES
// =============================================================================

export type SafetyReportType = 'ICSR' | 'PSUR' | 'DSUR' | 'PBRER' | 'FOLLOW_UP';
export type SafetyReportStatus = 'initial' | 'in-progress' | 'submitted' | 'closed';
export type CaseSeriousness = 'serious' | 'non-serious';
export type CasePriority = 'routine' | 'high' | 'expedited-15-day' | 'expedited-7-day' | 'emergency';
export type ReporterType = 'HCP' | 'Consumer' | 'Study' | 'Literature' | 'Authority' | 'Other';

export interface SafetyReport {
  id: string;
  caseNumber: string;
  reportType: SafetyReportType;
  seriousness: CaseSeriousness | null;
  
  patientInitials: string | null;
  patientAge: number | null;
  patientSex: string | null;
  
  eventDescription: string | null;
  eventTermPreferred: string | null;
  eventSOC: string | null;
  onsetDate: string | null;
  resolvedDate?: string | null;
  
  reporterType: ReporterType | null;
  reporterCountry: string | null;
  
  reportDate: string;
  initialReceiptDate?: string | null;
  mostRecentDate?: string | null;
  regulatoryDeadline: string | null;
  
  status: SafetyReportStatus;
  priority: CasePriority;
  expeditedReport: boolean;
  e2bSubmitted: boolean;
  e2bSubmissionDate?: string | null;
  
  assigneeId?: string | null;
  assigneeName?: string | null;
  medicalReviewerId?: string | null;
  medicalReviewerName?: string | null;
  
  productId: string | null;
  productName: string | null;
  studyId: string | null;
  
  narrativeSummary: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface SafetyListParams {
  status?: SafetyReportStatus | 'all';
  reportType?: SafetyReportType | 'all';
  seriousness?: CaseSeriousness | 'all';
  productId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'reportDate' | 'caseNumber' | 'status' | 'reportType' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface SafetyStats {
  total: number;
  serious: number;
  expedited: number;
  pending: number;
}

export interface SafetyListResponse {
  data: SafetyReport[];
  total: number;
  stats: SafetyStats;
}

export interface SafetyResponse {
  data: SafetyReport;
}

export interface CreateSafetyParams {
  caseNumber?: string;
  reportType?: SafetyReportType;
  seriousness?: CaseSeriousness;
  patientInitials?: string;
  patientAge?: number;
  patientSex?: 'Male' | 'Female' | 'Unknown';
  eventDescription?: string;
  eventTermPreferred?: string;
  eventSOC?: string;
  onsetDate?: string;
  reportDate?: string;
  reporterType?: ReporterType;
  reporterCountry?: string;
  productId?: string;
  studyId?: string;
  priority?: CasePriority;
  expeditedReport?: boolean;
}

export interface UpdateSafetyParams {
  status?: SafetyReportStatus;
  seriousness?: CaseSeriousness;
  eventDescription?: string;
  eventTermPreferred?: string;
  eventSOC?: string;
  onsetDate?: string;
  resolvedDate?: string;
  patientInitials?: string;
  patientAge?: number;
  patientSex?: string;
  reporterType?: ReporterType;
  reporterCountry?: string;
  priority?: CasePriority;
  expeditedReport?: boolean;
  regulatoryDeadline?: string;
  e2bSubmitted?: boolean;
  e2bSubmissionDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  medicalReviewerId?: string;
  medicalReviewerName?: string;
  narrativeSummary?: string;
  studyId?: string;
}

// =============================================================================
// API CLIENT
// =============================================================================

class SafetyApiClient {
  private baseUrl = '/api/safety';
  
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
   * List safety reports with filters
   */
  async list(params?: SafetyListParams): Promise<SafetyListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.reportType && params.reportType !== 'all') {
      searchParams.set('reportType', params.reportType);
    }
    if (params?.seriousness && params.seriousness !== 'all') {
      searchParams.set('seriousness', params.seriousness);
    }
    if (params?.productId && params.productId !== 'all') {
      searchParams.set('productId', params.productId);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.dateFrom) {
      searchParams.set('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      searchParams.set('dateTo', params.dateTo);
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
      throw new Error(`Failed to fetch safety reports: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single safety report by ID
   */
  async get(id: string): Promise<SafetyResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Safety report not found');
      }
      throw new Error(`Failed to fetch safety report: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new safety report
   */
  async create(data: CreateSafetyParams): Promise<SafetyResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create safety report: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update safety report
   */
  async update(id: string, data: UpdateSafetyParams): Promise<SafetyResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Safety report not found');
      }
      throw new Error(`Failed to update safety report: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete safety report
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Safety report not found');
      }
      throw new Error(`Failed to delete safety report: ${response.status}`);
    }
  }
  
  /**
   * Get expedited reports pending submission
   */
  async getExpeditesPending(): Promise<SafetyListResponse> {
    return this.list({
      status: 'all',
    }).then(response => ({
      ...response,
      data: response.data.filter(r => 
        r.expeditedReport && 
        !r.e2bSubmitted && 
        r.status !== 'submitted' && 
        r.status !== 'closed'
      ),
    }));
  }
  
  /**
   * Get serious reports
   */
  async getSerious(): Promise<SafetyListResponse> {
    return this.list({
      seriousness: 'serious',
    });
  }
  
  /**
   * Get reports by product
   */
  async getByProduct(productId: string): Promise<SafetyListResponse> {
    return this.list({
      productId,
    });
  }
  
  /**
   * Save or update an ICSR draft (Phase 2.1a)
   */
  async saveDraft(params: SaveDraftParams): Promise<SaveDraftResponse> {
    const response = await fetch(`${this.baseUrl}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to save draft: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Load a draft by ID (restore wizard state)
   */
  async loadDraft(id: string): Promise<{ formState: E2BFormState; currentStep: number } | null> {
    const response = await this.get(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (response.data as any).metadata;
    
    if (metadata?.e2bFormState) {
      return {
        formState: metadata.e2bFormState,
        currentStep: metadata.currentStep || 1,
      };
    }
    return null;
  }
}

// =============================================================================
// DRAFT TYPES (Phase 2.1a)
// =============================================================================

export interface E2BFormState {
  senderReportId: string;
  reportType: 'initial' | 'followup';
  receiptDate: string;
  mostRecentDate: string;
  seriousness: 'serious' | 'non-serious' | '';
  reporters: unknown[];
  patientId: string;
  patientInitials: string;
  age: string;
  ageUnit: string;
  ageGroup: string;
  sex: string;
  weight: string;
  height: string;
  medicalHistory: string[];
  deathDate: string;
  autopsyDone: boolean;
  drugs: unknown[];
  reactions: unknown[];
  resultsInDeath: boolean;
  lifeThreatening: boolean;
  hospitalization: boolean;
  disability: boolean;
  congenitalAnomaly: boolean;
  otherMedicallyImportant: boolean;
  tests: unknown[];
  narrative: string;
  reporterComments: string;
  senderComments: string;
  senderDiagnosis: string;
  selectedGateways: string[];
}

export interface SaveDraftParams {
  id?: string;
  caseNumber?: string;
  formState: E2BFormState;
  productId?: string;
  currentStep?: number;
}

export interface SaveDraftResponse {
  id: string;
  caseNumber: string;
  status: string;
  savedAt: string;
  currentStep: number;
}

// Export singleton instance
export const safetyApi = new SafetyApiClient();

// =============================================================================
// WORKFLOW TYPES (Phase 2.1b)
// =============================================================================

export type ICSRWorkflowStatus = 
  | 'DRAFT'
  | 'DATA_ENTRY'
  | 'MEDICAL_REVIEW'
  | 'QC_REVIEW'
  | 'READY'
  | 'SUBMITTED'
  | 'CLOSED';

export type WorkflowRole = 'SAFETY' | 'MEDICAL' | 'QA' | 'SAFETY_LEAD' | 'ADMIN';

export interface WorkflowTransitionParams {
  caseId: string;
  targetStatus: ICSRWorkflowStatus;
  comment?: string;
  userId?: string;
  userName?: string;
  userRole?: WorkflowRole;
}

export interface WorkflowTransitionResponse {
  success: boolean;
  caseNumber: string;
  previousStatus: ICSRWorkflowStatus;
  newStatus: ICSRWorkflowStatus;
  transitionedAt: string;
  message: string;
}

export interface AvailableTransition {
  targetStatus: ICSRWorkflowStatus;
  targetStatusLabel: string;
  action: string;
  description: string;
  requiresComment: boolean;
  validationRequired: boolean;
}

export interface WorkflowHistoryEntry {
  id: string;
  fromStatus: ICSRWorkflowStatus;
  toStatus: ICSRWorkflowStatus;
  action: string;
  performedBy: string;
  performedByName: string;
  comment?: string;
  timestamp: string;
}

export interface WorkflowInfoResponse {
  caseId: string;
  caseNumber: string;
  currentStatus: ICSRWorkflowStatus;
  currentStatusLabel: string;
  progress: number;
  availableTransitions: AvailableTransition[];
  history: WorkflowHistoryEntry[];
}

// =============================================================================
// WORKFLOW API CLIENT
// =============================================================================

class WorkflowApiClient {
  private baseUrl = '/api/safety/workflow';

  /**
   * Execute a workflow transition
   */
  async transition(params: WorkflowTransitionParams): Promise<WorkflowTransitionResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `Transition failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get workflow info including available transitions
   */
  async getInfo(caseId: string, role?: WorkflowRole): Promise<WorkflowInfoResponse> {
    const params = new URLSearchParams({ caseId });
    if (role) params.set('role', role);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get workflow info: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get workflow history for a case
   */
  async getHistory(caseId: string): Promise<WorkflowHistoryEntry[]> {
    const info = await this.getInfo(caseId);
    return info.history;
  }
}

export const workflowApi = new WorkflowApiClient();
