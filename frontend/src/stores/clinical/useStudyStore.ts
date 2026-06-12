

/**
 * Study Store
 * Zustand store for clinical study configuration and management
 * @version 0.20.10.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ClinicalStudy, StudyStatus, StudyFilters } from '@/types/clinical-trial';
import type { StudyStoreState, StudyStoreActions, StudyState } from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: StudyStoreState = {
  activeStudyId: null,
  studies: new Map(),
  isLoading: false,
  isLoadingStudy: null,
  error: null,
  filters: {},
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useStudyStore = create<StudyStoreState & StudyStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // Study Lifecycle Actions
      // ========================================================================

      setActiveStudy: (studyId: string | null) => {
        set({ activeStudyId: studyId }, false, 'setActiveStudy');
      },

      loadStudy: async (studyId: string) => {
        set({ isLoadingStudy: studyId, error: null }, false, 'loadStudy/start');
        
        try {
          // Simulate API call - in production, this would fetch from backend
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const existingStudy = get().studies.get(studyId);
          if (existingStudy) {
            // Update sync timestamp
            const updatedStudy: StudyState = {
              ...existingStudy,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newStudies = new Map(state.studies);
              newStudies.set(studyId, updatedStudy);
              return { studies: newStudies, isLoadingStudy: null };
            }, false, 'loadStudy/success');
          } else {
            set({ isLoadingStudy: null }, false, 'loadStudy/notFound');
          }
        } catch (error) {
          set({ 
            isLoadingStudy: null, 
            error: error instanceof Error ? error.message : 'Failed to load study' 
          }, false, 'loadStudy/error');
        }
      },

      loadStudies: async (filters?: StudyFilters) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadStudies/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In production, this would fetch from backend with filters applied
          set({ isLoading: false }, false, 'loadStudies/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load studies' 
          }, false, 'loadStudies/error');
        }
      },

      createStudy: async (config) => {
        set({ isLoading: true, error: null }, false, 'createStudy/start');
        
        try {
          // Generate ID
          const studyId = crypto.randomUUID();
          const now = new Date();
          
          const study: ClinicalStudy = {
            ...config,
            id: studyId,
            createdAt: now,
            updatedAt: now,
          };
          
          const studyState: StudyState = {
            study,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newStudies = new Map(state.studies);
            newStudies.set(studyId, studyState);
            return { studies: newStudies, isLoading: false };
          }, false, 'createStudy/success');
          
          return studyId;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create study' 
          }, false, 'createStudy/error');
          throw error;
        }
      },

      updateStudy: async (studyId: string, updates: Partial<ClinicalStudy>) => {
        const existingStudyState = get().studies.get(studyId);
        if (!existingStudyState) {
          set({ error: `Study ${studyId} not found` }, false, 'updateStudy/notFound');
          return;
        }
        
        set({ isLoadingStudy: studyId, error: null }, false, 'updateStudy/start');
        
        try {
          const updatedStudy: ClinicalStudy = {
            ...existingStudyState.study,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedStudyState: StudyState = {
            study: updatedStudy,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newStudies = new Map(state.studies);
            newStudies.set(studyId, updatedStudyState);
            return { studies: newStudies, isLoadingStudy: null };
          }, false, 'updateStudy/success');
        } catch (error) {
          set({ 
            isLoadingStudy: null, 
            error: error instanceof Error ? error.message : 'Failed to update study' 
          }, false, 'updateStudy/error');
        }
      },

      deleteStudy: async (studyId: string) => {
        set({ isLoadingStudy: studyId, error: null }, false, 'deleteStudy/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          set(state => {
            const newStudies = new Map(state.studies);
            newStudies.delete(studyId);
            
            // Clear active study if it was deleted
            const newActiveStudyId = state.activeStudyId === studyId ? null : state.activeStudyId;
            
            return { 
              studies: newStudies, 
              activeStudyId: newActiveStudyId,
              isLoadingStudy: null 
            };
          }, false, 'deleteStudy/success');
        } catch (error) {
          set({ 
            isLoadingStudy: null, 
            error: error instanceof Error ? error.message : 'Failed to delete study' 
          }, false, 'deleteStudy/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateStudyStatus: async (studyId: string, status: StudyStatus, reason?: string) => {
        const existingStudyState = get().studies.get(studyId);
        if (!existingStudyState) {
          set({ error: `Study ${studyId} not found` }, false, 'updateStudyStatus/notFound');
          return;
        }
        
        set({ isLoadingStudy: studyId, error: null }, false, 'updateStudyStatus/start');
        
        try {
          const updatedStudy: ClinicalStudy = {
            ...existingStudyState.study,
            status,
            updatedAt: new Date(),
          };
          
          const updatedStudyState: StudyState = {
            study: updatedStudy,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newStudies = new Map(state.studies);
            newStudies.set(studyId, updatedStudyState);
            return { studies: newStudies, isLoadingStudy: null };
          }, false, 'updateStudyStatus/success');
        } catch (error) {
          set({ 
            isLoadingStudy: null, 
            error: error instanceof Error ? error.message : 'Failed to update study status' 
          }, false, 'updateStudyStatus/error');
        }
      },

      // ========================================================================
      // Filter Management
      // ========================================================================

      setFilters: (filters: StudyFilters) => {
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
    { name: 'StudyStore' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveStudy = (state: StudyStoreState): StudyState | null => {
  if (!state.activeStudyId) return null;
  return state.studies.get(state.activeStudyId) || null;
};

export const selectStudyById = (state: StudyStoreState, studyId: string): StudyState | null => {
  return state.studies.get(studyId) || null;
};

export const selectAllStudies = (state: StudyStoreState): StudyState[] => {
  return Array.from(state.studies.values());
};

export const selectFilteredStudies = (state: StudyStoreState): StudyState[] => {
  const studies = Array.from(state.studies.values());
  const { filters } = state;
  
  return studies.filter(studyState => {
    const study = studyState.study;
    
    // Phase filter
    if (filters.phase?.length && !filters.phase.includes(study.phase)) {
      return false;
    }
    
    // Status filter
    if (filters.status?.length && !filters.status.includes(study.status)) {
      return false;
    }
    
    // Therapeutic area filter
    if (filters.therapeuticArea && study.therapeuticArea !== filters.therapeuticArea) {
      return false;
    }
    
    // Sponsor filter
    if (filters.sponsor && study.sponsor !== filters.sponsor) {
      return false;
    }
    
    // Country filter
    if (filters.country && !study.countries.includes(filters.country)) {
      return false;
    }
    
    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const searchable = [
        study.protocolNumber,
        study.protocolTitle,
        study.indication,
        study.sponsor,
      ].join(' ').toLowerCase();
      
      if (!searchable.includes(term)) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectStudiesByStatus = (state: StudyStoreState, status: StudyStatus): StudyState[] => {
  return Array.from(state.studies.values()).filter(s => s.study.status === status);
};

export const selectActiveStudies = (state: StudyStoreState): StudyState[] => {
  const activeStatuses: StudyStatus[] = ['IN_STARTUP', 'ENROLLING', 'CLOSED_TO_ENROLLMENT'];
  return Array.from(state.studies.values()).filter(s => activeStatuses.includes(s.study.status));
};

// ============================================================================
// Hooks
// ============================================================================

export const useActiveStudy = () => useStudyStore(selectActiveStudy);
export const useAllStudies = () => useStudyStore(selectAllStudies);
export const useFilteredStudies = () => useStudyStore(selectFilteredStudies);
export const useActiveStudies = () => useStudyStore(selectActiveStudies);

export const useStudyById = (studyId: string) => 
  useStudyStore(state => selectStudyById(state, studyId));

export const useStudyLoading = () => 
  useStudyStore(state => ({ isLoading: state.isLoading, isLoadingStudy: state.isLoadingStudy }));

export const useStudyError = () => 
  useStudyStore(state => state.error);

export const useStudyFilters = () => 
  useStudyStore(state => state.filters);
