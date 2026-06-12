
/**
 * useCTMSPersistence Hook
 * 
 * Provides persistence-aware CTMS operations that sync with Supabase.
 * Wraps useCTMSStore actions with API calls for data persistence.
 * 
 * v0.40.0 - CTMS persistence layer
 */

import { useCallback, useState } from 'react';
import { useCTMSStore } from '@/store/useCTMSStore';
import { ctmsService } from '@/services/ctms-persistence';
import type { CTMSStudy, ClinicalSite } from '@/store/ctmsTypes';

// =============================================================================
// TYPES
// =============================================================================

interface PersistenceState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

interface UseCTMSPersistenceReturn {
  // State
  state: PersistenceState;
  
  // Study operations (persistent)
  loadStudiesFromDB: () => Promise<void>;
  saveStudyToDB: (study: CTMSStudy) => Promise<CTMSStudy>;
  updateStudyInDB: (studyId: string, updates: Partial<CTMSStudy>) => Promise<void>;
  deleteStudyFromDB: (studyId: string) => Promise<void>;
  
  // Site operations (persistent)
  loadSitesFromDB: (studyId: string) => Promise<void>;
  saveSiteToDB: (site: ClinicalSite) => Promise<ClinicalSite>;
  updateSiteInDB: (siteId: string, updates: Partial<ClinicalSite>) => Promise<void>;
  deleteSiteFromDB: (siteId: string) => Promise<void>;
  
  // Enrollment operations (persistent)
  recordEnrollmentToDB: (siteId: string, subjectData: Record<string, unknown>) => Promise<void>;
  recordScreenFailureToDB: (siteId: string, reason: string) => Promise<void>;
  recordDiscontinuationToDB: (siteId: string, subjectId: string, reason: string) => Promise<void>;
  
  // Sync operations
  syncAllToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  
  // Utility
  clearSyncError: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useCTMSPersistence(): UseCTMSPersistenceReturn {
  const store = useCTMSStore();
  
  const [state, setState] = useState<PersistenceState>({
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
  });
  
  // ===========================================================================
  // STUDY OPERATIONS
  // ===========================================================================
  
  const loadStudiesFromDB = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, syncError: null }));
    
    try {
      const response = await ctmsService.fetchStudies();
      
      // Update store with fetched studies
      for (const study of response.data) {
        store.updateStudy(study.id, study);
      }
      
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const saveStudyToDB = useCallback(async (study: CTMSStudy): Promise<CTMSStudy> => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      const response = await ctmsService.createStudy(study);
      
      // Update local store with DB-assigned ID if different
      if (response.data.id !== study.id) {
        store.updateStudy(study.id, { ...study, id: response.data.id });
      }
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
      
      return response.data;
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const updateStudyInDB = useCallback(async (studyId: string, updates: Partial<CTMSStudy>) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.updateStudy(studyId, updates);
      
      // Also update local store
      store.updateStudy(studyId, updates);
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const deleteStudyFromDB = useCallback(async (studyId: string) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.deleteStudy(studyId);
      
      // Also delete from local store
      store.deleteStudy(studyId);
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  // ===========================================================================
  // SITE OPERATIONS
  // ===========================================================================
  
  const loadSitesFromDB = useCallback(async (studyId: string) => {
    setState(s => ({ ...s, isLoading: true, syncError: null }));
    
    try {
      const response = await ctmsService.fetchSites({ studyId });
      
      // Update store with fetched sites
      for (const site of response.data) {
        store.updateSite(site.id, site);
      }
      
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const saveSiteToDB = useCallback(async (site: ClinicalSite): Promise<ClinicalSite> => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      const response = await ctmsService.createSite({ ...site, studyId: site.studyId });
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
      
      return response.data;
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, []);
  
  const updateSiteInDB = useCallback(async (siteId: string, updates: Partial<ClinicalSite>) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.updateSite(siteId, updates);
      
      // Also update local store
      store.updateSite(siteId, updates);
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const deleteSiteFromDB = useCallback(async (siteId: string) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.deleteSite(siteId);
      
      // Also delete from local store
      store.removeSite(siteId);
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  // ===========================================================================
  // ENROLLMENT OPERATIONS
  // ===========================================================================
  
  const recordEnrollmentToDB = useCallback(async (
    siteId: string, 
    subjectData: Record<string, unknown>
  ) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.enrollSubject({
        siteId,
        ...subjectData,
      } as unknown as Parameters<typeof ctmsService.enrollSubject>[0]);
      
      // Update local store enrollment count
      const site = store.sites[siteId];
      if (site) {
        store.recordEnrollment(site.studyId, siteId, 1);
      }
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const recordScreenFailureToDB = useCallback(async (siteId: string, reason: string) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      // Create subject in screening state, then update to screen failure
      const subject = await ctmsService.enrollSubject({
        siteId,
        status: 'screening',
      } as unknown as Parameters<typeof ctmsService.enrollSubject>[0]);
      
      await ctmsService.recordScreenFailure(subject.data.id, reason);
      
      // Update local store
      const site = store.sites[siteId];
      if (site) {
        store.recordScreening(site.studyId, siteId, 1);
      }
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const recordDiscontinuationToDB = useCallback(async (
    siteId: string, 
    subjectId: string, 
    reason: string
  ) => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      await ctmsService.recordDiscontinuation(subjectId, reason);
      
      // Update local store
      const site = store.sites[siteId];
      if (site) {
        store.recordDiscontinuation(site.studyId, siteId, 1, reason);
      }
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  // ===========================================================================
  // SYNC OPERATIONS
  // ===========================================================================
  
  const syncAllToCloud = useCallback(async () => {
    setState(s => ({ ...s, isSyncing: true, syncError: null }));
    
    try {
      const studies = Object.values(store.studies);
      const sites = Object.values(store.sites);
      
      // Sync studies
      for (const study of studies) {
        await ctmsService.syncStudyFromStore(study);
      }
      
      // Sync sites
      for (const site of sites) {
        await ctmsService.syncSiteFromStore(site);
      }
      
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isSyncing: false, 
        syncError: String(error) 
      }));
      throw error;
    }
  }, [store]);
  
  const loadFromCloud = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, syncError: null }));
    
    try {
      // Load studies
      const studiesResponse = await ctmsService.fetchStudies();
      
      for (const study of studiesResponse.data) {
        store.updateStudy(study.id, study);
        
        // Load sites for each study
        const sitesResponse = await ctmsService.fetchSites({ studyId: study.id });
        for (const site of sitesResponse.data) {
          store.updateSite(site.id, site);
        }
      }
      
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        lastSyncedAt: new Date().toISOString() 
      }));
    } catch (error) {
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        syncError: String(error) 
      }));
      // Don't throw - just log, as this might fail if no DB connection
      console.error('Failed to load from cloud:', error);
    }
  }, [store]);
  
  // ===========================================================================
  // UTILITY
  // ===========================================================================
  
  const clearSyncError = useCallback(() => {
    setState(s => ({ ...s, syncError: null }));
  }, []);
  
  // ===========================================================================
  // RETURN
  // ===========================================================================
  
  return {
    state,
    loadStudiesFromDB,
    saveStudyToDB,
    updateStudyInDB,
    deleteStudyFromDB,
    loadSitesFromDB,
    saveSiteToDB,
    updateSiteInDB,
    deleteSiteFromDB,
    recordEnrollmentToDB,
    recordScreenFailureToDB,
    recordDiscontinuationToDB,
    syncAllToCloud,
    loadFromCloud,
    clearSyncError,
  };
}

export default useCTMSPersistence;
