
/**
 * Applications API Client
 * Provides typed fetch wrappers for Application endpoints
 */

// =============================================================================
// TYPES
// =============================================================================

export type ApplicationType = 'IND' | 'NDA' | 'BLA' | 'sNDA' | 'sBLA' | 'ANDA' | 'MAA' | 'CTA' | 'JNDA' | 'NDS';
export type ApplicationStatus = 'Active' | 'Submitted' | 'Under Review' | 'Approved' | 'CRL' | 'Withdrawn';

export interface Application {
  id: string;
  productId: string;
  productName?: string;
  applicationNumber: string;
  type: ApplicationType;
  region: string;
  agency: string;
  status: ApplicationStatus;
  submissionDate?: string;
  approvalDate?: string;
  pdfuaDate?: string;
  currentSequence: number;
  totalSequences: number;
}

export interface ApplicationWithMetrics extends Application {
  openHAQCount?: number;
  pendingCorrespondence?: number;
  daysUnderReview?: number;
  daysToPDUFA?: number | null;
  recentHAQs?: Array<{
    id: string;
    haqNumber: string;
    subject: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
  recentSubmissions?: Array<{
    id: string;
    sequenceNumber: string;
    status: string;
    targetDate: string;
  }>;
  correspondence?: Array<{
    id: string;
    type: string;
    subject: string;
    date: string;
    dueDate?: string;
    status: string;
    direction: string;
  }>;
}

export interface ApplicationListParams {
  type?: ApplicationType | 'all';
  status?: ApplicationStatus | 'all';
  productId?: string;
  region?: string | 'all';
  search?: string;
  sortBy?: 'applicationNumber' | 'type' | 'status' | 'region' | 'submissionDate' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  includeMetrics?: boolean;
}

export interface ApplicationListResponse {
  data: ApplicationWithMetrics[];
  total: number;
  stats: {
    total: number;
    byType: Record<ApplicationType, number>;
    byStatus: Record<ApplicationStatus, number>;
    byRegion: Record<string, number>;
    underReview: number;
    upcomingPDUFADates: number;
  };
}

export interface ApplicationResponse {
  data: ApplicationWithMetrics;
}

export interface CreateApplicationParams {
  applicationNumber: string;
  productId: string;
  type?: ApplicationType;
  region?: string;
  agency?: string;
  status?: ApplicationStatus;
  submissionDate?: string;
  approvalDate?: string;
  pdfuaDate?: string;
  currentSequence?: number;
  totalSequences?: number;
}

export interface UpdateApplicationParams {
  type?: ApplicationType;
  region?: string;
  agency?: string;
  status?: ApplicationStatus;
  submissionDate?: string;
  approvalDate?: string;
  pdfuaDate?: string;
  currentSequence?: number;
  totalSequences?: number;
  productId?: string;
}

// =============================================================================
// SEQUENCE TYPES
// =============================================================================

export interface SequenceInfo {
  applicationId: string;
  applicationNumber: string;
  currentSequence: number;
  nextSequence: number;
  nextSequenceFormatted: string;
  totalSequences: number;
  recentSequences: {
    sequenceNumber: string;
    status: string;
    type: string;
    createdAt: string;
  }[];
}

export interface SequenceInfoResponse {
  data: SequenceInfo;
}

export interface ReservedSequence {
  submissionId: string;
  applicationId: string;
  sequenceNumber: string;
  sequenceInt: number;
  type: string;
  status: string;
}

export interface ReserveSequenceParams {
  type?: 'original' | 'amendment' | 'supplement' | 'annual-report' | 'safety-report' | 'response' | 'ir-response' | 'haq-response';
  description?: string;
  plannedDate?: string;
}

export interface ReserveSequenceResponse {
  data: ReservedSequence;
  message: string;
}

// =============================================================================
// API CLIENT
// =============================================================================

class ApplicationsApiClient {
  private baseUrl = '/api/applications';
  
  /**
   * Check if database is available
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
   * List applications with filters
   */
  async list(params?: ApplicationListParams): Promise<ApplicationListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.type && params.type !== 'all') {
      searchParams.set('type', params.type);
    }
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.productId && params.productId !== 'all') {
      searchParams.set('productId', params.productId);
    }
    if (params?.region && params.region !== 'all') {
      searchParams.set('region', params.region);
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
    if (params?.includeMetrics) {
      searchParams.set('includeMetrics', 'true');
    }
    
    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single application by ID
   */
  async get(id: string): Promise<ApplicationResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      throw new Error(`Failed to fetch application: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new application
   */
  async create(data: CreateApplicationParams): Promise<ApplicationResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create application: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update application
   */
  async update(id: string, data: UpdateApplicationParams): Promise<ApplicationResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      throw new Error(`Failed to update application: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete application
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      throw new Error(`Failed to delete application: ${response.status}`);
    }
  }
  
  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================
  
  /**
   * Get applications by product ID
   */
  async getByProduct(productId: string): Promise<ApplicationListResponse> {
    return this.list({ productId });
  }
  
  /**
   * Get applications by type
   */
  async getByType(type: ApplicationType): Promise<ApplicationListResponse> {
    return this.list({ type });
  }
  
  /**
   * Get applications by status
   */
  async getByStatus(status: ApplicationStatus): Promise<ApplicationListResponse> {
    return this.list({ status });
  }
  
  /**
   * Get applications by region
   */
  async getByRegion(region: string): Promise<ApplicationListResponse> {
    return this.list({ region });
  }
  
  /**
   * Get applications under review
   */
  async getUnderReview(): Promise<ApplicationListResponse> {
    return this.list({ status: 'Under Review' });
  }
  
  /**
   * Get applications with metrics
   */
  async listWithMetrics(params?: Omit<ApplicationListParams, 'includeMetrics'>): Promise<ApplicationListResponse> {
    return this.list({ ...params, includeMetrics: true });
  }
  
  /**
   * Update application status
   */
  async updateStatus(id: string, status: ApplicationStatus): Promise<ApplicationResponse> {
    return this.update(id, { status });
  }
  
  /**
   * Increment sequence number
   */
  async incrementSequence(id: string): Promise<ApplicationResponse> {
    const { data } = await this.get(id);
    return this.update(id, { 
      currentSequence: data.currentSequence + 1,
      totalSequences: Math.max(data.totalSequences, data.currentSequence + 1),
    });
  }
  
  /**
   * Search applications
   */
  async search(query: string): Promise<ApplicationListResponse> {
    return this.list({ search: query });
  }
  
  // ===========================================================================
  // SEQUENCE MANAGEMENT
  // ===========================================================================
  
  /**
   * Get sequence info for an application (next available sequence number)
   */
  async getSequenceInfo(applicationId: string): Promise<SequenceInfoResponse> {
    const response = await fetch(`${this.baseUrl}/${applicationId}/sequence`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      throw new Error(`Failed to get sequence info: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Reserve (claim) the next sequence number for an application
   * This atomically increments the sequence counter and creates a submission record
   */
  async reserveSequence(
    applicationId: string, 
    params?: ReserveSequenceParams
  ): Promise<ReserveSequenceResponse> {
    const response = await fetch(`${this.baseUrl}/${applicationId}/sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      if (response.status === 409) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Sequence number conflict');
      }
      throw new Error(`Failed to reserve sequence: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get next sequence number formatted as 4-digit string (e.g., "0004")
   * Convenience method that just returns the formatted string
   */
  async getNextSequenceNumber(applicationId: string): Promise<string> {
    const { data } = await this.getSequenceInfo(applicationId);
    return data.nextSequenceFormatted;
  }
}

// Export singleton instance
export const applicationsApi = new ApplicationsApiClient();
