
/**
 * HAQ API Client
 * Provides typed fetch wrappers for HAQ endpoints
 */

import type { HAQuestion, HAQStatus, HAQPriority, ResponseDraft } from '@/types/haq';

// =============================================================================
// TYPES
// =============================================================================

export interface HAQListParams {
  status?: HAQStatus | 'all';
  priority?: HAQPriority | 'all';
  productId?: string;
  applicationId?: string;
  search?: string;
  sortBy?: 'dueDate' | 'priority' | 'status' | 'receivedDate';
  sortDir?: 'asc' | 'desc';
}

export interface HAQListResponse {
  data: HAQuestion[];
  total: number;
}

export interface HAQResponse {
  data: HAQuestion & { responseDraftHistory?: ResponseDraft[] };
}

export interface DraftListResponse {
  data: ResponseDraft[];
  total: number;
}

export interface DraftResponse {
  data: ResponseDraft;
}

export interface CreateDraftParams {
  content: string;
  author?: string;
  aiGenerated?: boolean;
  updateHAQ?: boolean;
  newStatus?: HAQStatus;
}

// =============================================================================
// API CLIENT
// =============================================================================

class HAQApiClient {
  private baseUrl = '/api/haqs';
  
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
   * List HAQs with filters
   */
  async list(params?: HAQListParams): Promise<HAQListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.priority && params.priority !== 'all') {
      searchParams.set('priority', params.priority);
    }
    if (params?.productId && params.productId !== 'all') {
      searchParams.set('productId', params.productId);
    }
    if (params?.applicationId) {
      searchParams.set('applicationId', params.applicationId);
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
      throw new Error(`Failed to fetch HAQs: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single HAQ by ID
   */
  async get(id: string): Promise<HAQResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('HAQ not found');
      }
      throw new Error(`Failed to fetch HAQ: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new HAQ
   */
  async create(data: Partial<HAQuestion>): Promise<HAQResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create HAQ: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update HAQ
   */
  async update(id: string, data: Partial<HAQuestion>): Promise<HAQResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('HAQ not found');
      }
      throw new Error(`Failed to update HAQ: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete HAQ
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('HAQ not found');
      }
      throw new Error(`Failed to delete HAQ: ${response.status}`);
    }
  }
  
  /**
   * List drafts for a HAQ
   */
  async listDrafts(haqId: string): Promise<DraftListResponse> {
    const response = await fetch(`${this.baseUrl}/${haqId}/drafts`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch drafts: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new draft
   */
  async createDraft(haqId: string, params: CreateDraftParams): Promise<DraftResponse> {
    const response = await fetch(`${this.baseUrl}/${haqId}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create draft: ${response.status}`);
    }
    
    return response.json();
  }
}

// Export singleton instance
export const haqApi = new HAQApiClient();
