
/**
 * Studies API Client
 * Provides typed fetch wrappers for Study endpoints
 */

import type { Study } from '@/types/core';

// =============================================================================
// TYPES
// =============================================================================

export type StudyPhase = 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 3' | 'Phase 4';
export type StudyStatus = 'Planning' | 'Enrolling' | 'Active' | 'Completed' | 'On Hold';

export interface StudyWithProgress extends Study {
  productName?: string;
  daysRemaining?: number;
  enrollmentPercentage?: number;
  isOverdue?: boolean;
}

export interface StudyListParams {
  phase?: StudyPhase | 'all';
  status?: StudyStatus | 'all';
  productId?: string;
  search?: string;
  sortBy?: 'protocolNumber' | 'name' | 'phase' | 'status' | 'startDate' | 'estimatedCompletion';
  sortDir?: 'asc' | 'desc';
}

export interface StudyListResponse {
  data: StudyWithProgress[];
  total: number;
  stats: {
    total: number;
    byPhase: Record<StudyPhase, number>;
    byStatus: Record<StudyStatus, number>;
    totalEnrolled: number;
    totalTarget: number;
    averageTMFCompleteness: number;
  };
}

export interface StudyResponse {
  data: StudyWithProgress;
}

export interface CreateStudyParams {
  name: string;
  productId: string;
  phase?: StudyPhase;
  indication?: string;
  targetEnrollment?: number;
  startDate?: string;
  estimatedCompletion?: string;
  status?: StudyStatus;
}

export interface UpdateStudyParams {
  name?: string;
  productId?: string;
  phase?: StudyPhase;
  indication?: string;
  status?: StudyStatus;
  enrolledSubjects?: number;
  targetEnrollment?: number;
  tmfCompleteness?: number;
  startDate?: string;
  estimatedCompletion?: string;
}

// =============================================================================
// API CLIENT
// =============================================================================

class StudiesApiClient {
  private baseUrl = '/api/studies';
  
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
   * List studies with filters
   */
  async list(params?: StudyListParams): Promise<StudyListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.phase && params.phase !== 'all') {
      searchParams.set('phase', params.phase);
    }
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.productId && params.productId !== 'all') {
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
      throw new Error(`Failed to fetch studies: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single study by ID
   */
  async get(id: string): Promise<StudyResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Study not found');
      }
      throw new Error(`Failed to fetch study: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new study
   */
  async create(data: CreateStudyParams): Promise<StudyResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create study: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update study
   */
  async update(id: string, data: UpdateStudyParams): Promise<StudyResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Study not found');
      }
      throw new Error(`Failed to update study: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete study
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Study not found');
      }
      throw new Error(`Failed to delete study: ${response.status}`);
    }
  }
  
  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================
  
  /**
   * Get studies by product ID
   */
  async getByProduct(productId: string): Promise<StudyListResponse> {
    return this.list({ productId });
  }
  
  /**
   * Get studies by phase
   */
  async getByPhase(phase: StudyPhase): Promise<StudyListResponse> {
    return this.list({ phase });
  }
  
  /**
   * Get studies by status
   */
  async getByStatus(status: StudyStatus): Promise<StudyListResponse> {
    return this.list({ status });
  }
  
  /**
   * Get active studies
   */
  async getActive(): Promise<StudyListResponse> {
    return this.list({ status: 'Active' });
  }
  
  /**
   * Get enrolling studies
   */
  async getEnrolling(): Promise<StudyListResponse> {
    return this.list({ status: 'Enrolling' });
  }
  
  /**
   * Update study status
   */
  async updateStatus(id: string, status: StudyStatus): Promise<StudyResponse> {
    return this.update(id, { status });
  }
  
  /**
   * Update enrollment count
   */
  async updateEnrollment(id: string, enrolledSubjects: number): Promise<StudyResponse> {
    return this.update(id, { enrolledSubjects });
  }
  
  /**
   * Update TMF completeness
   */
  async updateTMFCompleteness(id: string, tmfCompleteness: number): Promise<StudyResponse> {
    return this.update(id, { tmfCompleteness });
  }
  
  /**
   * Search studies
   */
  async search(query: string): Promise<StudyListResponse> {
    return this.list({ search: query });
  }
}

// Export singleton instance
export const studiesApi = new StudiesApiClient();
