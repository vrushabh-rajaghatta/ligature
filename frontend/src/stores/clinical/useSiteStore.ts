

/**
 * Site Store
 * Zustand store for clinical site management
 * @version 0.20.10.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ClinicalSite, SiteStatus, SiteFilters, SiteMetrics } from '@/types/clinical-site';
import type { SiteStoreState, SiteStoreActions, SiteState } from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: SiteStoreState = {
  sitesByStudy: new Map(),
  isLoading: false,
  isLoadingSite: null,
  error: null,
  filters: {},
  selectedSiteIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSiteStore = create<SiteStoreState & SiteStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // Site Lifecycle Actions
      // ========================================================================

      loadSites: async (studyId: string, filters?: SiteFilters) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadSites/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In production, this would fetch from backend
          set({ isLoading: false }, false, 'loadSites/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load sites' 
          }, false, 'loadSites/error');
        }
      },

      loadSite: async (studyId: string, siteId: string) => {
        set({ isLoadingSite: siteId, error: null }, false, 'loadSite/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const studySites = get().sitesByStudy.get(studyId);
          const existingSite = studySites?.get(siteId);
          
          if (existingSite) {
            const updatedSite: SiteState = {
              ...existingSite,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newSitesByStudy = new Map(state.sitesByStudy);
              const studySitesMap = new Map(newSitesByStudy.get(studyId) || new Map());
              studySitesMap.set(siteId, updatedSite);
              newSitesByStudy.set(studyId, studySitesMap);
              return { sitesByStudy: newSitesByStudy, isLoadingSite: null };
            }, false, 'loadSite/success');
          } else {
            set({ isLoadingSite: null }, false, 'loadSite/notFound');
          }
        } catch (error) {
          set({ 
            isLoadingSite: null, 
            error: error instanceof Error ? error.message : 'Failed to load site' 
          }, false, 'loadSite/error');
        }
      },

      createSite: async (studyId: string, config) => {
        set({ isLoading: true, error: null }, false, 'createSite/start');
        
        try {
          const siteId = crypto.randomUUID();
          const now = new Date();
          
          const site: ClinicalSite = {
            ...config,
            id: siteId,
            studyId,
            createdAt: now,
            updatedAt: now,
          };
          
          const siteState: SiteState = {
            site,
            metrics: null,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newSitesByStudy = new Map(state.sitesByStudy);
            const studySites = new Map(newSitesByStudy.get(studyId) || new Map());
            studySites.set(siteId, siteState);
            newSitesByStudy.set(studyId, studySites);
            return { sitesByStudy: newSitesByStudy, isLoading: false };
          }, false, 'createSite/success');
          
          return siteId;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create site' 
          }, false, 'createSite/error');
          throw error;
        }
      },

      updateSite: async (studyId: string, siteId: string, updates: Partial<ClinicalSite>) => {
        const studySites = get().sitesByStudy.get(studyId);
        const existingSiteState = studySites?.get(siteId);
        
        if (!existingSiteState) {
          set({ error: `Site ${siteId} not found in study ${studyId}` }, false, 'updateSite/notFound');
          return;
        }
        
        set({ isLoadingSite: siteId, error: null }, false, 'updateSite/start');
        
        try {
          const updatedSite: ClinicalSite = {
            ...existingSiteState.site,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedSiteState: SiteState = {
            ...existingSiteState,
            site: updatedSite,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newSitesByStudy = new Map(state.sitesByStudy);
            const studySitesMap = new Map(newSitesByStudy.get(studyId) || new Map());
            studySitesMap.set(siteId, updatedSiteState);
            newSitesByStudy.set(studyId, studySitesMap);
            return { sitesByStudy: newSitesByStudy, isLoadingSite: null };
          }, false, 'updateSite/success');
        } catch (error) {
          set({ 
            isLoadingSite: null, 
            error: error instanceof Error ? error.message : 'Failed to update site' 
          }, false, 'updateSite/error');
        }
      },

      deleteSite: async (studyId: string, siteId: string) => {
        set({ isLoadingSite: siteId, error: null }, false, 'deleteSite/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          set(state => {
            const newSitesByStudy = new Map(state.sitesByStudy);
            const studySites = new Map(newSitesByStudy.get(studyId) || new Map());
            studySites.delete(siteId);
            newSitesByStudy.set(studyId, studySites);
            
            // Remove from selection
            const newSelectedSiteIds = new Set(state.selectedSiteIds);
            newSelectedSiteIds.delete(siteId);
            
            return { 
              sitesByStudy: newSitesByStudy, 
              selectedSiteIds: newSelectedSiteIds,
              isLoadingSite: null 
            };
          }, false, 'deleteSite/success');
        } catch (error) {
          set({ 
            isLoadingSite: null, 
            error: error instanceof Error ? error.message : 'Failed to delete site' 
          }, false, 'deleteSite/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateSiteStatus: async (studyId: string, siteId: string, status: SiteStatus, reason?: string) => {
        const studySites = get().sitesByStudy.get(studyId);
        const existingSiteState = studySites?.get(siteId);
        
        if (!existingSiteState) {
          set({ error: `Site ${siteId} not found` }, false, 'updateSiteStatus/notFound');
          return;
        }
        
        set({ isLoadingSite: siteId, error: null }, false, 'updateSiteStatus/start');
        
        try {
          const updatedSite: ClinicalSite = {
            ...existingSiteState.site,
            status,
            statusReason: reason,
            updatedAt: new Date(),
          };
          
          // Update timeline dates based on status
          if (status === 'SELECTED' && !updatedSite.selectionDate) {
            updatedSite.selectionDate = new Date();
          } else if (status === 'ACTIVE' && !updatedSite.activationDate) {
            updatedSite.activationDate = new Date();
          } else if (status === 'ENROLLING' && !updatedSite.firstPatientDate) {
            updatedSite.firstPatientDate = new Date();
          } else if (status === 'CLOSED' && !updatedSite.closeoutDate) {
            updatedSite.closeoutDate = new Date();
          }
          
          const updatedSiteState: SiteState = {
            ...existingSiteState,
            site: updatedSite,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newSitesByStudy = new Map(state.sitesByStudy);
            const studySitesMap = new Map(newSitesByStudy.get(studyId) || new Map());
            studySitesMap.set(siteId, updatedSiteState);
            newSitesByStudy.set(studyId, studySitesMap);
            return { sitesByStudy: newSitesByStudy, isLoadingSite: null };
          }, false, 'updateSiteStatus/success');
        } catch (error) {
          set({ 
            isLoadingSite: null, 
            error: error instanceof Error ? error.message : 'Failed to update site status' 
          }, false, 'updateSiteStatus/error');
        }
      },

      activateSite: async (studyId: string, siteId: string) => {
        await get().updateSiteStatus(studyId, siteId, 'ACTIVE');
      },

      deactivateSite: async (studyId: string, siteId: string, reason: string) => {
        await get().updateSiteStatus(studyId, siteId, 'TERMINATED', reason);
      },

      // ========================================================================
      // Metrics
      // ========================================================================

      loadSiteMetrics: async (studyId: string, siteId: string) => {
        const studySites = get().sitesByStudy.get(studyId);
        const existingSiteState = studySites?.get(siteId);
        
        if (!existingSiteState) {
          set({ error: `Site ${siteId} not found` }, false, 'loadSiteMetrics/notFound');
          return;
        }
        
        try {
          // Simulate API call - calculate metrics
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const site = existingSiteState.site;
          const metrics: SiteMetrics = {
            siteId,
            studyId,
            enrollmentTarget: site.targetEnrollment,
            enrollmentActual: site.actualEnrollment,
            enrollmentRate: calculateEnrollmentRate(site),
            enrollmentProgress: site.targetEnrollment > 0 
              ? Math.round((site.actualEnrollment / site.targetEnrollment) * 100)
              : 0,
            screenedCount: site.actualEnrollment + site.screenFailures,
            screenFailureCount: site.screenFailures,
            screenFailureRate: site.actualEnrollment + site.screenFailures > 0
              ? Math.round((site.screenFailures / (site.actualEnrollment + site.screenFailures)) * 100)
              : 0,
            queryRate: 0, // Would be calculated from EDC data
            queryResolutionTime: 0,
            protocolDeviationCount: 0,
            protocolDeviationRate: 0,
            dataEntryLag: 0,
            lastUpdated: new Date(),
          };
          
          const updatedSiteState: SiteState = {
            ...existingSiteState,
            metrics,
          };
          
          set(state => {
            const newSitesByStudy = new Map(state.sitesByStudy);
            const studySitesMap = new Map(newSitesByStudy.get(studyId) || new Map());
            studySitesMap.set(siteId, updatedSiteState);
            newSitesByStudy.set(studyId, studySitesMap);
            return { sitesByStudy: newSitesByStudy };
          }, false, 'loadSiteMetrics/success');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load site metrics' 
          }, false, 'loadSiteMetrics/error');
        }
      },

      refreshAllMetrics: async (studyId: string) => {
        const studySites = get().sitesByStudy.get(studyId);
        if (!studySites) return;
        
        const siteIds = Array.from(studySites.keys());
        await Promise.all(siteIds.map(siteId => get().loadSiteMetrics(studyId, siteId)));
      },

      // ========================================================================
      // Selection Management
      // ========================================================================

      selectSite: (siteId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSiteIds);
          newSelected.add(siteId);
          return { selectedSiteIds: newSelected };
        }, false, 'selectSite');
      },

      deselectSite: (siteId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSiteIds);
          newSelected.delete(siteId);
          return { selectedSiteIds: newSelected };
        }, false, 'deselectSite');
      },

      selectAllSites: (studyId: string) => {
        const studySites = get().sitesByStudy.get(studyId);
        if (!studySites) return;
        
        set({ selectedSiteIds: new Set(studySites.keys()) }, false, 'selectAllSites');
      },

      clearSelection: () => {
        set({ selectedSiteIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filter Management
      // ========================================================================

      setFilters: (filters: SiteFilters) => {
        set({ filters }, false, 'setFilters');
      },

      clearFilters: () => {
        set({ filters: {} }, false, 'clearFilters');
      },

      // ========================================================================
      // Error Handling
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },
    }),
    { name: 'SiteStore' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function calculateEnrollmentRate(site: ClinicalSite): number {
  if (!site.firstPatientDate) return 0;
  
  const monthsActive = Math.max(1, 
    (Date.now() - site.firstPatientDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  return Math.round((site.actualEnrollment / monthsActive) * 10) / 10;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectSitesByStudy = (state: SiteStoreState, studyId: string): SiteState[] => {
  const studySites = state.sitesByStudy.get(studyId);
  return studySites ? Array.from(studySites.values()) : [];
};

export const selectSiteById = (state: SiteStoreState, studyId: string, siteId: string): SiteState | null => {
  const studySites = state.sitesByStudy.get(studyId);
  return studySites?.get(siteId) || null;
};

export const selectFilteredSites = (state: SiteStoreState, studyId: string): SiteState[] => {
  const sites = selectSitesByStudy(state, studyId);
  const { filters } = state;
  
  return sites.filter(siteState => {
    const site = siteState.site;
    
    // Status filter
    if (filters.status?.length && !filters.status.includes(site.status)) {
      return false;
    }
    
    // Country filter
    if (filters.country && site.country !== filters.country) {
      return false;
    }
    
    // Region filter
    if (filters.region && site.region !== filters.region) {
      return false;
    }
    
    // IRB approval filter
    if (filters.hasIRBApproval !== undefined) {
      const hasApproval = site.irb.status === 'APPROVED' || site.irb.status === 'CONDITIONAL';
      if (filters.hasIRBApproval !== hasApproval) {
        return false;
      }
    }
    
    // Contract status filter
    if (filters.hasExecutedContract !== undefined) {
      const hasContract = site.contractStatus === 'EXECUTED';
      if (filters.hasExecutedContract !== hasContract) {
        return false;
      }
    }
    
    // Enrolling filter
    if (filters.isEnrolling !== undefined) {
      const isEnrolling = site.status === 'ENROLLING';
      if (filters.isEnrolling !== isEnrolling) {
        return false;
      }
    }
    
    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const searchable = [
        site.siteNumber,
        site.facilityName,
        site.principalInvestigator.name,
        site.address.city,
      ].join(' ').toLowerCase();
      
      if (!searchable.includes(term)) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectActiveSites = (state: SiteStoreState, studyId: string): SiteState[] => {
  const sites = selectSitesByStudy(state, studyId);
  return sites.filter(s => ['ACTIVE', 'ENROLLING'].includes(s.site.status));
};

export const selectEnrollingSites = (state: SiteStoreState, studyId: string): SiteState[] => {
  const sites = selectSitesByStudy(state, studyId);
  return sites.filter(s => s.site.status === 'ENROLLING');
};

export const selectSelectedSites = (state: SiteStoreState, studyId: string): SiteState[] => {
  const sites = selectSitesByStudy(state, studyId);
  return sites.filter(s => state.selectedSiteIds.has(s.site.id));
};

export const selectSiteMetrics = (state: SiteStoreState, studyId: string, siteId: string): SiteMetrics | null => {
  const siteState = selectSiteById(state, studyId, siteId);
  return siteState?.metrics || null;
};

export const selectStudyEnrollmentSummary = (state: SiteStoreState, studyId: string) => {
  const sites = selectSitesByStudy(state, studyId);
  
  return sites.reduce((acc, siteState) => {
    const site = siteState.site;
    acc.totalTarget += site.targetEnrollment;
    acc.totalActual += site.actualEnrollment;
    acc.totalScreenFailures += site.screenFailures;
    acc.siteCount += 1;
    
    if (site.status === 'ENROLLING') {
      acc.enrollingSiteCount += 1;
    }
    
    return acc;
  }, {
    totalTarget: 0,
    totalActual: 0,
    totalScreenFailures: 0,
    siteCount: 0,
    enrollingSiteCount: 0,
  });
};

// ============================================================================
// Hooks
// ============================================================================

export const useSitesByStudy = (studyId: string) => 
  useSiteStore(state => selectSitesByStudy(state, studyId));

export const useSiteById = (studyId: string, siteId: string) => 
  useSiteStore(state => selectSiteById(state, studyId, siteId));

export const useFilteredSites = (studyId: string) => 
  useSiteStore(state => selectFilteredSites(state, studyId));

export const useActiveSites = (studyId: string) => 
  useSiteStore(state => selectActiveSites(state, studyId));

export const useEnrollingSites = (studyId: string) => 
  useSiteStore(state => selectEnrollingSites(state, studyId));

export const useSelectedSites = (studyId: string) => 
  useSiteStore(state => selectSelectedSites(state, studyId));

export const useSiteSelection = () => 
  useSiteStore(state => state.selectedSiteIds);

export const useSiteLoading = () => 
  useSiteStore(state => ({ isLoading: state.isLoading, isLoadingSite: state.isLoadingSite }));

export const useSiteError = () => 
  useSiteStore(state => state.error);

export const useSiteFilters = () => 
  useSiteStore(state => state.filters);

export const useStudyEnrollmentSummary = (studyId: string) => 
  useSiteStore(state => selectStudyEnrollmentSummary(state, studyId));
