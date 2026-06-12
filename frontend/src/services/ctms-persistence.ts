
/**
 * CTMS Persistence Service
 * 
 * Provides methods to persist CTMS store data to Supabase via API routes.
 * Used by useCTMSStore for data synchronization.
 * 
 * v0.40.0 - CTMS persistence layer
 */

import type { 
  CTMSStudy, 
  ClinicalSite, 
  SubjectVisit 
} from '@/store/ctmsTypes';
import type { ClinicalSubject as StudySubject } from '@/types/clinical-subject';

// =============================================================================
// TYPES
// =============================================================================

interface APIResponse<T> {
  data: T;
  total?: number;
  stats?: Record<string, unknown>;
  error?: string;
}

interface CTMSServiceOptions {
  baseUrl?: string;
}

// =============================================================================
// CTMS SERVICE
// =============================================================================

class CTMSService {
  private baseUrl: string;
  
  constructor(options?: CTMSServiceOptions) {
    this.baseUrl = options?.baseUrl || '/api/ctms';
  }
  
  // ===========================================================================
  // STUDY OPERATIONS
  // ===========================================================================
  
  async fetchStudies(filters?: {
    phase?: string;
    status?: string;
    productId?: string;
    search?: string;
  }): Promise<APIResponse<CTMSStudy[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.phase) params.set('phase', filters.phase);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.productId) params.set('productId', filters.productId);
      if (filters?.search) params.set('search', filters.search);
      
      const url = `${this.baseUrl}/studies${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch studies');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchStudies error:', error);
      throw error;
    }
  }
  
  async fetchStudy(studyId: string): Promise<APIResponse<CTMSStudy>> {
    try {
      const response = await fetch(`${this.baseUrl}/studies/${studyId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch study');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchStudy error:', error);
      throw error;
    }
  }
  
  async createStudy(study: Partial<CTMSStudy>): Promise<APIResponse<CTMSStudy>> {
    try {
      const response = await fetch(`${this.baseUrl}/studies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(study),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create study');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.createStudy error:', error);
      throw error;
    }
  }
  
  async updateStudy(studyId: string, updates: Partial<CTMSStudy>): Promise<APIResponse<CTMSStudy>> {
    try {
      const response = await fetch(`${this.baseUrl}/studies/${studyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update study');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.updateStudy error:', error);
      throw error;
    }
  }
  
  async deleteStudy(studyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/studies/${studyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete study');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.deleteStudy error:', error);
      throw error;
    }
  }
  
  // ===========================================================================
  // SITE OPERATIONS
  // ===========================================================================
  
  async fetchSites(filters?: {
    studyId?: string;
    status?: string;
    country?: string;
    region?: string;
    search?: string;
  }): Promise<APIResponse<ClinicalSite[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.studyId) params.set('studyId', filters.studyId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.country) params.set('country', filters.country);
      if (filters?.region) params.set('region', filters.region);
      if (filters?.search) params.set('search', filters.search);
      
      const url = `${this.baseUrl}/sites${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch sites');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchSites error:', error);
      throw error;
    }
  }
  
  async fetchSite(siteId: string): Promise<APIResponse<ClinicalSite & { subjects: unknown[] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch site');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchSite error:', error);
      throw error;
    }
  }
  
  async createSite(site: Partial<ClinicalSite> & { studyId: string }): Promise<APIResponse<ClinicalSite>> {
    try {
      const response = await fetch(`${this.baseUrl}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create site');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.createSite error:', error);
      throw error;
    }
  }
  
  async updateSite(siteId: string, updates: Partial<ClinicalSite>): Promise<APIResponse<ClinicalSite>> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update site');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.updateSite error:', error);
      throw error;
    }
  }
  
  async updateSiteStatus(
    siteId: string, 
    newStatus: string, 
    reason?: string
  ): Promise<APIResponse<ClinicalSite>> {
    return this.updateSite(siteId, { 
      status: newStatus as ClinicalSite['status'],
      // Add to status history via metadata update
    });
  }
  
  async deleteSite(siteId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete site');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.deleteSite error:', error);
      throw error;
    }
  }
  
  // ===========================================================================
  // SUBJECT OPERATIONS (ENROLLMENT)
  // ===========================================================================
  
  async fetchSubjects(filters?: {
    studyId?: string;
    siteId?: string;
    status?: string;
    arm?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse<StudySubject[]> & { page: number; limit: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.studyId) params.set('studyId', filters.studyId);
      if (filters?.siteId) params.set('siteId', filters.siteId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.arm) params.set('arm', filters.arm);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      
      const url = `${this.baseUrl}/subjects${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch subjects');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchSubjects error:', error);
      throw error;
    }
  }
  
  async fetchSubject(subjectId: string): Promise<APIResponse<StudySubject & { visits: unknown[]; adverseEvents: unknown[] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/subjects/${subjectId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch subject');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.fetchSubject error:', error);
      throw error;
    }
  }
  
  async enrollSubject(subject: Partial<StudySubject> & { siteId: string }): Promise<APIResponse<StudySubject>> {
    try {
      const response = await fetch(`${this.baseUrl}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subject),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll subject');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.enrollSubject error:', error);
      throw error;
    }
  }
  
  async updateSubject(subjectId: string, updates: Partial<StudySubject>): Promise<APIResponse<StudySubject>> {
    try {
      const response = await fetch(`${this.baseUrl}/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update subject');
      }
      
      return response.json();
    } catch (error) {
      console.error('CTMSService.updateSubject error:', error);
      throw error;
    }
  }
  
  async recordScreenFailure(subjectId: string, reason: string): Promise<APIResponse<StudySubject>> {
    return this.updateSubject(subjectId, {
      status: 'screen-failure' as StudySubject['status'],
      statusReason: reason,
    } as any);
  }
  
  async recordDiscontinuation(
    subjectId: string, 
    reason: string, 
    details?: string
  ): Promise<APIResponse<StudySubject>> {
    return this.updateSubject(subjectId, {
      status: 'discontinued' as StudySubject['status'],
      statusReason: reason,
      withdrawalReason: details,
    } as any);
  }
  
  async completeSubject(subjectId: string): Promise<APIResponse<StudySubject>> {
    return this.updateSubject(subjectId, {
      status: 'completed' as StudySubject['status'],
      completionDate: new Date(),
    } as any);
  }
  
  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================
  
  async syncStudyFromStore(study: CTMSStudy): Promise<CTMSStudy> {
    try {
      // Check if study exists in DB by protocol number
      const existing = await this.fetchStudies({ search: study.protocolNumber });
      
      if (existing.data.length > 0) {
        // Update existing
        const result = await this.updateStudy(existing.data[0].id, study);
        return result.data;
      } else {
        // Create new
        const result = await this.createStudy(study);
        return result.data;
      }
    } catch (error) {
      console.error('CTMSService.syncStudyFromStore error:', error);
      throw error;
    }
  }
  
  async syncSiteFromStore(site: ClinicalSite): Promise<ClinicalSite> {
    try {
      // Check if site exists
      const existing = await this.fetchSites({ search: site.siteNumber });
      
      if (existing.data.length > 0) {
        const result = await this.updateSite(existing.data[0].id, site);
        return result.data;
      } else {
        const result = await this.createSite({ ...site, studyId: site.studyId });
        return result.data;
      }
    } catch (error) {
      console.error('CTMSService.syncSiteFromStore error:', error);
      throw error;
    }
  }
  
  // ===========================================================================
  // ENROLLMENT METRICS
  // ===========================================================================
  
  async getEnrollmentMetrics(studyId: string): Promise<{
    totalEnrolled: number;
    totalTarget: number;
    enrollmentRate: number;
    screenFailureRate: number;
    bySite: Array<{ siteId: string; siteName: string; enrolled: number; target: number }>;
    byMonth: Array<{ month: string; enrolled: number; cumulative: number }>;
  }> {
    try {
      const [studyResponse, sitesResponse] = await Promise.all([
        this.fetchStudy(studyId),
        this.fetchSites({ studyId }),
      ]);
      
      const study = studyResponse.data;
      const sites = sitesResponse.data;
      
      const bySite = sites.map(site => ({
        siteId: site.id,
        siteName: site.name,
        enrolled: site.enrolledSubjects || 0,
        target: site.targetEnrollment || 0,
      }));
      
      const totalEnrolled = bySite.reduce((sum, s) => sum + s.enrolled, 0);
      const totalTarget = study.targetEnrollment || 0;
      const totalScreenFailures = sites.reduce((sum, s) => sum + (s.screenFailures || 0), 0);
      
      return {
        totalEnrolled,
        totalTarget,
        enrollmentRate: totalTarget > 0 ? Math.round((totalEnrolled / totalTarget) * 100) : 0,
        screenFailureRate: totalEnrolled + totalScreenFailures > 0 
          ? Math.round((totalScreenFailures / (totalEnrolled + totalScreenFailures)) * 100) 
          : 0,
        bySite,
        byMonth: [], // Would require additional query with date grouping
      };
    } catch (error) {
      console.error('CTMSService.getEnrollmentMetrics error:', error);
      throw error;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const ctmsService = new CTMSService();

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const {
  fetchStudies,
  fetchStudy,
  createStudy,
  updateStudy,
  deleteStudy,
  fetchSites,
  fetchSite,
  createSite,
  updateSite,
  updateSiteStatus,
  deleteSite,
  fetchSubjects,
  fetchSubject,
  enrollSubject,
  updateSubject,
  recordScreenFailure,
  recordDiscontinuation,
  completeSubject,
  syncStudyFromStore,
  syncSiteFromStore,
  getEnrollmentMetrics,
} = ctmsService;

export default ctmsService;
