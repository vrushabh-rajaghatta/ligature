

/**
 * Subject Store
 * Zustand store for clinical subject/participant management
 * @version 0.20.10.2a
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  ClinicalSubject, 
  SubjectStatus, 
  SubjectFilters,
  WithdrawalInfo,
  WithdrawalReason,
} from '@/types/clinical-subject';
import type { 
  SubjectStoreState, 
  SubjectStoreActions, 
  SubjectState,
  EnrollmentMetrics,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: SubjectStoreState = {
  subjectsByStudy: new Map(),
  enrollmentMetrics: new Map(),
  isLoading: false,
  isLoadingSubject: null,
  error: null,
  filters: {},
  selectedSubjectIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSubjectStore = create<SubjectStoreState & SubjectStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // Subject Lifecycle Actions
      // ========================================================================

      loadSubjects: async (studyId: string, siteId?: string, filters?: SubjectFilters) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadSubjects/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In production, this would fetch from backend with filters applied
          set({ isLoading: false }, false, 'loadSubjects/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load subjects' 
          }, false, 'loadSubjects/error');
        }
      },

      loadSubject: async (studyId: string, siteId: string, subjectId: string) => {
        set({ isLoadingSubject: subjectId, error: null }, false, 'loadSubject/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const studySubjects = get().subjectsByStudy.get(studyId);
          const siteSubjects = studySubjects?.get(siteId);
          const existingSubject = siteSubjects?.get(subjectId);
          
          if (existingSubject) {
            const updatedSubject: SubjectState = {
              ...existingSubject,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newSubjectsByStudy = new Map(state.subjectsByStudy);
              const studyMap = new Map(newSubjectsByStudy.get(studyId) || new Map());
              const siteMap = new Map(studyMap.get(siteId) || new Map());
              siteMap.set(subjectId, updatedSubject);
              studyMap.set(siteId, siteMap);
              newSubjectsByStudy.set(studyId, studyMap);
              return { subjectsByStudy: newSubjectsByStudy, isLoadingSubject: null };
            }, false, 'loadSubject/success');
          } else {
            set({ isLoadingSubject: null }, false, 'loadSubject/notFound');
          }
        } catch (error) {
          set({ 
            isLoadingSubject: null, 
            error: error instanceof Error ? error.message : 'Failed to load subject' 
          }, false, 'loadSubject/error');
        }
      },

      createSubject: async (studyId: string, siteId: string, config) => {
        set({ isLoading: true, error: null }, false, 'createSubject/start');
        
        try {
          const subjectId = crypto.randomUUID();
          const now = new Date();
          
          // Generate subject number
          const subjectNumber = generateSubjectNumber(siteId);
          
          const subject: ClinicalSubject = {
            ...config,
            id: subjectId,
            studyId,
            siteId,
            subjectNumber,
            status: 'PRE_SCREENING',
            consents: [],
            visits: [],
            createdAt: now,
            updatedAt: now,
          };
          
          const subjectState: SubjectState = {
            subject,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newSubjectsByStudy = new Map(state.subjectsByStudy);
            const studyMap = new Map(newSubjectsByStudy.get(studyId) || new Map());
            const siteMap = new Map(studyMap.get(siteId) || new Map());
            siteMap.set(subjectId, subjectState);
            studyMap.set(siteId, siteMap);
            newSubjectsByStudy.set(studyId, studyMap);
            return { subjectsByStudy: newSubjectsByStudy, isLoading: false };
          }, false, 'createSubject/success');
          
          return subjectId;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create subject' 
          }, false, 'createSubject/error');
          throw error;
        }
      },

      updateSubject: async (studyId: string, siteId: string, subjectId: string, updates: Partial<ClinicalSubject>) => {
        const studySubjects = get().subjectsByStudy.get(studyId);
        const siteSubjects = studySubjects?.get(siteId);
        const existingSubjectState = siteSubjects?.get(subjectId);
        
        if (!existingSubjectState) {
          set({ error: `Subject ${subjectId} not found` }, false, 'updateSubject/notFound');
          return;
        }
        
        set({ isLoadingSubject: subjectId, error: null }, false, 'updateSubject/start');
        
        try {
          const updatedSubject: ClinicalSubject = {
            ...existingSubjectState.subject,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedSubjectState: SubjectState = {
            ...existingSubjectState,
            subject: updatedSubject,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newSubjectsByStudy = new Map(state.subjectsByStudy);
            const studyMap = new Map(newSubjectsByStudy.get(studyId) || new Map());
            const siteMap = new Map(studyMap.get(siteId) || new Map());
            siteMap.set(subjectId, updatedSubjectState);
            studyMap.set(siteId, siteMap);
            newSubjectsByStudy.set(studyId, studyMap);
            return { subjectsByStudy: newSubjectsByStudy, isLoadingSubject: null };
          }, false, 'updateSubject/success');
        } catch (error) {
          set({ 
            isLoadingSubject: null, 
            error: error instanceof Error ? error.message : 'Failed to update subject' 
          }, false, 'updateSubject/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateSubjectStatus: async (studyId: string, siteId: string, subjectId: string, status: SubjectStatus, reason?: string) => {
        const studySubjects = get().subjectsByStudy.get(studyId);
        const siteSubjects = studySubjects?.get(siteId);
        const existingSubjectState = siteSubjects?.get(subjectId);
        
        if (!existingSubjectState) {
          set({ error: `Subject ${subjectId} not found` }, false, 'updateSubjectStatus/notFound');
          return;
        }
        
        // Validate status transition
        if (!isValidStatusTransition(existingSubjectState.subject.status, status)) {
          set({ 
            error: `Invalid status transition from ${existingSubjectState.subject.status} to ${status}` 
          }, false, 'updateSubjectStatus/invalidTransition');
          return;
        }
        
        set({ isLoadingSubject: subjectId, error: null }, false, 'updateSubjectStatus/start');
        
        try {
          const updatedSubject: ClinicalSubject = {
            ...existingSubjectState.subject,
            status,
            statusReason: reason,
            updatedAt: new Date(),
          };
          
          // Update timeline dates based on status
          updateTimelineDates(updatedSubject, status);
          
          const updatedSubjectState: SubjectState = {
            subject: updatedSubject,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newSubjectsByStudy = new Map(state.subjectsByStudy);
            const studyMap = new Map(newSubjectsByStudy.get(studyId) || new Map());
            const siteMap = new Map(studyMap.get(siteId) || new Map());
            siteMap.set(subjectId, updatedSubjectState);
            studyMap.set(siteId, siteMap);
            newSubjectsByStudy.set(studyId, studyMap);
            return { subjectsByStudy: newSubjectsByStudy, isLoadingSubject: null };
          }, false, 'updateSubjectStatus/success');
        } catch (error) {
          set({ 
            isLoadingSubject: null, 
            error: error instanceof Error ? error.message : 'Failed to update subject status' 
          }, false, 'updateSubjectStatus/error');
        }
      },

      screenSubject: async (studyId: string, siteId: string, subjectId: string) => {
        const { updateSubjectStatus, subjectsByStudy } = get();
        const studySubjects = subjectsByStudy.get(studyId);
        const siteSubjects = studySubjects?.get(siteId);
        const subjectState = siteSubjects?.get(subjectId);
        
        if (!subjectState) {
          set({ error: `Subject ${subjectId} not found` }, false, 'screenSubject/notFound');
          return;
        }
        
        // Generate screening number if not present
        const screeningNumber = subjectState.subject.screeningNumber || generateScreeningNumber(siteId);
        
        await get().updateSubject(studyId, siteId, subjectId, {
          screeningNumber,
          screeningDate: new Date(),
        });
        
        await updateSubjectStatus(studyId, siteId, subjectId, 'SCREENING');
      },

      enrollSubject: async (studyId: string, siteId: string, subjectId: string) => {
        const { updateSubjectStatus } = get();
        
        await get().updateSubject(studyId, siteId, subjectId, {
          enrollmentDate: new Date(),
        });
        
        await updateSubjectStatus(studyId, siteId, subjectId, 'ENROLLED');
      },

      randomizeSubject: async (studyId: string, siteId: string, subjectId: string, armId: string) => {
        const { updateSubjectStatus, subjectsByStudy } = get();
        const studySubjects = subjectsByStudy.get(studyId);
        const siteSubjects = studySubjects?.get(siteId);
        const subjectState = siteSubjects?.get(subjectId);
        
        if (!subjectState) {
          set({ error: `Subject ${subjectId} not found` }, false, 'randomizeSubject/notFound');
          return;
        }
        
        // Generate randomization number
        const randomizationNumber = generateRandomizationNumber(studyId);
        
        await get().updateSubject(studyId, siteId, subjectId, {
          armId,
          randomizationNumber,
          randomizationDate: new Date(),
        });
        
        await updateSubjectStatus(studyId, siteId, subjectId, 'RANDOMIZED');
      },

      discontinueSubject: async (studyId: string, siteId: string, subjectId: string, reason: string) => {
        const withdrawal: WithdrawalInfo = {
          date: new Date(),
          reason: 'OTHER' as WithdrawalReason,
          reasonDetail: reason,
          reportedBy: 'system', // In production, would be current user
          continueFollowUp: false,
        };
        
        await get().updateSubject(studyId, siteId, subjectId, {
          withdrawal,
        });
        
        await get().updateSubjectStatus(studyId, siteId, subjectId, 'WITHDRAWN', reason);
      },

      completeSubject: async (studyId: string, siteId: string, subjectId: string) => {
        await get().updateSubject(studyId, siteId, subjectId, {
          completionDate: new Date(),
        });
        
        await get().updateSubjectStatus(studyId, siteId, subjectId, 'COMPLETED');
      },

      // ========================================================================
      // Enrollment Metrics
      // ========================================================================

      loadEnrollmentMetrics: async (studyId: string) => {
        set({ isLoading: true, error: null }, false, 'loadEnrollmentMetrics/start');
        
        try {
          // Calculate metrics from current state
          const metrics = calculateEnrollmentMetrics(get().subjectsByStudy, studyId);
          
          set(state => {
            const newMetrics = new Map(state.enrollmentMetrics);
            newMetrics.set(studyId, metrics);
            return { enrollmentMetrics: newMetrics, isLoading: false };
          }, false, 'loadEnrollmentMetrics/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load enrollment metrics' 
          }, false, 'loadEnrollmentMetrics/error');
        }
      },

      refreshEnrollmentMetrics: async (studyId: string) => {
        await get().loadEnrollmentMetrics(studyId);
      },

      // ========================================================================
      // Selection Management
      // ========================================================================

      selectSubject: (subjectId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSubjectIds);
          newSelected.add(subjectId);
          return { selectedSubjectIds: newSelected };
        }, false, 'selectSubject');
      },

      deselectSubject: (subjectId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSubjectIds);
          newSelected.delete(subjectId);
          return { selectedSubjectIds: newSelected };
        }, false, 'deselectSubject');
      },

      clearSelection: () => {
        set({ selectedSubjectIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filter Management
      // ========================================================================

      setFilters: (filters: SubjectFilters) => {
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
    { name: 'SubjectStore' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function generateSubjectNumber(siteId: string): string {
  const sitePrefix = siteId.substring(0, 4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${sitePrefix}-${timestamp}${random}`;
}

function generateScreeningNumber(siteId: string): string {
  const prefix = 'SCR';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${timestamp}`;
}

function generateRandomizationNumber(studyId: string): string {
  const prefix = 'RND';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${timestamp}`;
}

const STATUS_TRANSITIONS: Record<SubjectStatus, SubjectStatus[]> = {
  PRE_SCREENING: ['SCREENING', 'WITHDRAWN'],
  SCREENING: ['SCREEN_FAILURE', 'ENROLLED', 'WITHDRAWN'],
  SCREEN_FAILURE: [],
  ENROLLED: ['RANDOMIZED', 'ON_TREATMENT', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  RANDOMIZED: ['ON_TREATMENT', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  ON_TREATMENT: ['COMPLETED', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  COMPLETED: [],
  WITHDRAWN: [],
  LOST_TO_FOLLOWUP: ['WITHDRAWN'],
};

function isValidStatusTransition(from: SubjectStatus, to: SubjectStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function updateTimelineDates(subject: ClinicalSubject, status: SubjectStatus): void {
  const now = new Date();
  
  switch (status) {
    case 'SCREENING':
      if (!subject.screeningDate) subject.screeningDate = now;
      break;
    case 'ENROLLED':
      if (!subject.enrollmentDate) subject.enrollmentDate = now;
      break;
    case 'RANDOMIZED':
      if (!subject.randomizationDate) subject.randomizationDate = now;
      break;
    case 'ON_TREATMENT':
      if (!subject.treatmentStartDate) subject.treatmentStartDate = now;
      break;
    case 'COMPLETED':
      if (!subject.completionDate) subject.completionDate = now;
      if (!subject.treatmentEndDate) subject.treatmentEndDate = now;
      break;
    case 'WITHDRAWN':
    case 'LOST_TO_FOLLOWUP':
      if (!subject.treatmentEndDate) subject.treatmentEndDate = now;
      break;
  }
}

function calculateEnrollmentMetrics(
  subjectsByStudy: Map<string, Map<string, Map<string, SubjectState>>>,
  studyId: string
): EnrollmentMetrics {
  const studySubjects = subjectsByStudy.get(studyId);
  
  const metrics: EnrollmentMetrics = {
    studyId,
    totalEnrolled: 0,
    totalScreened: 0,
    totalScreenFailures: 0,
    totalRandomized: 0,
    totalCompleted: 0,
    totalDiscontinued: 0,
    enrollmentRate: 0,
    screenFailureRate: 0,
    byArm: new Map(),
    bySite: new Map(),
    byMonth: [],
    lastUpdated: new Date(),
  };
  
  if (!studySubjects) return metrics;
  
  const enrollmentByMonth = new Map<string, number>();
  
  studySubjects.forEach((siteSubjects, siteId) => {
    let siteEnrollment = 0;
    
    siteSubjects.forEach(subjectState => {
      const subject = subjectState.subject;
      
      // Count by status
      if (subject.screeningDate) metrics.totalScreened++;
      if (subject.status === 'SCREEN_FAILURE') metrics.totalScreenFailures++;
      if (subject.enrollmentDate) {
        metrics.totalEnrolled++;
        siteEnrollment++;
        
        // Track by month
        const monthKey = `${subject.enrollmentDate.getFullYear()}-${String(subject.enrollmentDate.getMonth() + 1).padStart(2, '0')}`;
        enrollmentByMonth.set(monthKey, (enrollmentByMonth.get(monthKey) || 0) + 1);
      }
      if (subject.randomizationDate) {
        metrics.totalRandomized++;
        
        // Track by arm
        if (subject.armId) {
          metrics.byArm.set(subject.armId, (metrics.byArm.get(subject.armId) || 0) + 1);
        }
      }
      if (subject.status === 'COMPLETED') metrics.totalCompleted++;
      if (subject.status === 'WITHDRAWN' || subject.status === 'LOST_TO_FOLLOWUP') {
        metrics.totalDiscontinued++;
      }
    });
    
    metrics.bySite.set(siteId, siteEnrollment);
  });
  
  // Calculate rates
  if (metrics.totalScreened > 0) {
    metrics.screenFailureRate = Math.round((metrics.totalScreenFailures / metrics.totalScreened) * 100);
  }
  
  // Calculate enrollment rate (per month)
  if (enrollmentByMonth.size > 0) {
    const totalMonths = enrollmentByMonth.size;
    metrics.enrollmentRate = Math.round((metrics.totalEnrolled / totalMonths) * 10) / 10;
  }
  
  // Convert month map to array
  metrics.byMonth = Array.from(enrollmentByMonth.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  return metrics;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectSubjectsByStudy = (state: SubjectStoreState, studyId: string): SubjectState[] => {
  const studySubjects = state.subjectsByStudy.get(studyId);
  if (!studySubjects) return [];
  
  const allSubjects: SubjectState[] = [];
  studySubjects.forEach(siteSubjects => {
    siteSubjects.forEach(subject => {
      allSubjects.push(subject);
    });
  });
  
  return allSubjects;
};

export const selectSubjectsBySite = (state: SubjectStoreState, studyId: string, siteId: string): SubjectState[] => {
  const studySubjects = state.subjectsByStudy.get(studyId);
  const siteSubjects = studySubjects?.get(siteId);
  return siteSubjects ? Array.from(siteSubjects.values()) : [];
};

export const selectSubjectById = (
  state: SubjectStoreState, 
  studyId: string, 
  siteId: string, 
  subjectId: string
): SubjectState | null => {
  const studySubjects = state.subjectsByStudy.get(studyId);
  const siteSubjects = studySubjects?.get(siteId);
  return siteSubjects?.get(subjectId) || null;
};

export const selectFilteredSubjects = (state: SubjectStoreState, studyId: string): SubjectState[] => {
  const subjects = selectSubjectsByStudy(state, studyId);
  const { filters } = state;
  
  return subjects.filter(subjectState => {
    const subject = subjectState.subject;
    
    // Site filter
    if (filters.siteId && subject.siteId !== filters.siteId) {
      return false;
    }
    
    // Status filter
    if (filters.status?.length && !filters.status.includes(subject.status)) {
      return false;
    }
    
    // Arm filter
    if (filters.armId && subject.armId !== filters.armId) {
      return false;
    }
    
    // Consent filter
    if (filters.hasConsent !== undefined) {
      const hasMainConsent = subject.consents.some(c => c.consentType === 'MAIN' && c.status === 'ACTIVE');
      if (filters.hasConsent !== hasMainConsent) {
        return false;
      }
    }
    
    // Randomized filter
    if (filters.isRandomized !== undefined) {
      const isRandomized = subject.randomizationNumber !== undefined;
      if (filters.isRandomized !== isRandomized) {
        return false;
      }
    }
    
    // Date range filters
    if (filters.enrolledAfter && subject.enrollmentDate) {
      if (subject.enrollmentDate < filters.enrolledAfter) {
        return false;
      }
    }
    
    if (filters.enrolledBefore && subject.enrollmentDate) {
      if (subject.enrollmentDate > filters.enrolledBefore) {
        return false;
      }
    }
    
    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const searchable = [
        subject.subjectNumber,
        subject.screeningNumber,
        subject.randomizationNumber,
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchable.includes(term)) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectSubjectsByStatus = (
  state: SubjectStoreState, 
  studyId: string, 
  status: SubjectStatus
): SubjectState[] => {
  const subjects = selectSubjectsByStudy(state, studyId);
  return subjects.filter(s => s.subject.status === status);
};

export const selectActiveSubjects = (state: SubjectStoreState, studyId: string): SubjectState[] => {
  const activeStatuses: SubjectStatus[] = ['ENROLLED', 'RANDOMIZED', 'ON_TREATMENT'];
  const subjects = selectSubjectsByStudy(state, studyId);
  return subjects.filter(s => activeStatuses.includes(s.subject.status));
};

export const selectRandomizedSubjects = (state: SubjectStoreState, studyId: string): SubjectState[] => {
  const subjects = selectSubjectsByStudy(state, studyId);
  return subjects.filter(s => s.subject.randomizationNumber !== undefined);
};

export const selectSelectedSubjects = (state: SubjectStoreState, studyId: string): SubjectState[] => {
  const subjects = selectSubjectsByStudy(state, studyId);
  return subjects.filter(s => state.selectedSubjectIds.has(s.subject.id));
};

export const selectEnrollmentMetrics = (state: SubjectStoreState, studyId: string): EnrollmentMetrics | null => {
  return state.enrollmentMetrics.get(studyId) || null;
};

export const selectStudySubjectSummary = (state: SubjectStoreState, studyId: string) => {
  const subjects = selectSubjectsByStudy(state, studyId);
  
  return subjects.reduce((acc, subjectState) => {
    const subject = subjectState.subject;
    acc.totalSubjects += 1;
    
    if (subject.screeningDate) acc.screened += 1;
    if (subject.status === 'SCREEN_FAILURE') acc.screenFailures += 1;
    if (subject.enrollmentDate) acc.enrolled += 1;
    if (subject.randomizationNumber) acc.randomized += 1;
    if (subject.status === 'ON_TREATMENT') acc.onTreatment += 1;
    if (subject.status === 'COMPLETED') acc.completed += 1;
    if (subject.status === 'WITHDRAWN' || subject.status === 'LOST_TO_FOLLOWUP') {
      acc.discontinued += 1;
    }
    
    return acc;
  }, {
    totalSubjects: 0,
    screened: 0,
    screenFailures: 0,
    enrolled: 0,
    randomized: 0,
    onTreatment: 0,
    completed: 0,
    discontinued: 0,
  });
};

// ============================================================================
// Hooks
// ============================================================================

export const useSubjectsByStudy = (studyId: string) => 
  useSubjectStore(state => selectSubjectsByStudy(state, studyId));

export const useSubjectsBySite = (studyId: string, siteId: string) => 
  useSubjectStore(state => selectSubjectsBySite(state, studyId, siteId));

export const useSubjectById = (studyId: string, siteId: string, subjectId: string) => 
  useSubjectStore(state => selectSubjectById(state, studyId, siteId, subjectId));

export const useFilteredSubjects = (studyId: string) => 
  useSubjectStore(state => selectFilteredSubjects(state, studyId));

export const useActiveSubjects = (studyId: string) => 
  useSubjectStore(state => selectActiveSubjects(state, studyId));

export const useRandomizedSubjects = (studyId: string) => 
  useSubjectStore(state => selectRandomizedSubjects(state, studyId));

export const useSelectedSubjects = (studyId: string) => 
  useSubjectStore(state => selectSelectedSubjects(state, studyId));

export const useSubjectSelection = () => 
  useSubjectStore(state => state.selectedSubjectIds);

export const useSubjectLoading = () => 
  useSubjectStore(state => ({ isLoading: state.isLoading, isLoadingSubject: state.isLoadingSubject }));

export const useSubjectError = () => 
  useSubjectStore(state => state.error);

export const useSubjectFilters = () => 
  useSubjectStore(state => state.filters);

export const useEnrollmentMetrics = (studyId: string) => 
  useSubjectStore(state => selectEnrollmentMetrics(state, studyId));

export const useStudySubjectSummary = (studyId: string) => 
  useSubjectStore(state => selectStudySubjectSummary(state, studyId));
