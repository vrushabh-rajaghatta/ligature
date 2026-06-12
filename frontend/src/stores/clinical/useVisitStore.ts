

/**
 * Visit Store
 * Zustand store for clinical visit scheduling and tracking
 * @version 0.20.10.2b
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  SubjectVisit, 
  VisitStatus,
  ProtocolVisit,
  VisitDeviation,
} from '@/types/clinical-visit';
import type { 
  VisitStoreState, 
  VisitStoreActions, 
  VisitState,
  VisitScheduleState,
  VisitComplianceMetrics,
  VisitComplianceStatus,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: VisitStoreState = {
  visitsBySubject: new Map(),
  visitSchedules: new Map(),
  complianceMetrics: new Map(),
  isLoading: false,
  isLoadingVisit: null,
  error: null,
  selectedVisitIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useVisitStore = create<VisitStoreState & VisitStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // Visit Lifecycle Actions
      // ========================================================================

      loadVisits: async (subjectId: string) => {
        set({ isLoading: true, error: null }, false, 'loadVisits/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In production, this would fetch from backend
          set({ isLoading: false }, false, 'loadVisits/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load visits' 
          }, false, 'loadVisits/error');
        }
      },

      loadVisit: async (subjectId: string, visitId: string) => {
        set({ isLoadingVisit: visitId, error: null }, false, 'loadVisit/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const subjectVisits = get().visitsBySubject.get(subjectId);
          const existingVisit = subjectVisits?.get(visitId);
          
          if (existingVisit) {
            const updatedVisit: VisitState = {
              ...existingVisit,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newVisitsBySubject = new Map(state.visitsBySubject);
              const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
              visitsMap.set(visitId, updatedVisit);
              newVisitsBySubject.set(subjectId, visitsMap);
              return { visitsBySubject: newVisitsBySubject, isLoadingVisit: null };
            }, false, 'loadVisit/success');
          } else {
            set({ isLoadingVisit: null }, false, 'loadVisit/notFound');
          }
        } catch (error) {
          set({ 
            isLoadingVisit: null, 
            error: error instanceof Error ? error.message : 'Failed to load visit' 
          }, false, 'loadVisit/error');
        }
      },

      scheduleVisit: async (subjectId: string, protocolVisitId: string, scheduledDate: Date) => {
        set({ isLoading: true, error: null }, false, 'scheduleVisit/start');
        
        try {
          const visitId = crypto.randomUUID();
          const now = new Date();
          
          // Calculate window based on scheduled date (default ±3 days)
          const windowStart = new Date(scheduledDate);
          windowStart.setDate(windowStart.getDate() - 3);
          
          const windowEnd = new Date(scheduledDate);
          windowEnd.setDate(windowEnd.getDate() + 3);
          
          const visit: SubjectVisit = {
            id: visitId,
            subjectId,
            protocolVisitId,
            studyId: '', // Will be set from context
            siteId: '', // Will be set from context
            visitName: `Visit ${protocolVisitId}`,
            visitNumber: 1,
            instanceNumber: 1,
            scheduledDate,
            windowStart,
            windowEnd,
            status: 'SCHEDULED',
            completedForms: [],
            completedProcedures: [],
            deviations: [],
            createdAt: now,
            createdBy: 'system',
            updatedAt: now,
            updatedBy: 'system',
          };
          
          const visitState: VisitState = {
            visit,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newVisitsBySubject = new Map(state.visitsBySubject);
            const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
            visitsMap.set(visitId, visitState);
            newVisitsBySubject.set(subjectId, visitsMap);
            return { visitsBySubject: newVisitsBySubject, isLoading: false };
          }, false, 'scheduleVisit/success');
          
          return visitId;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to schedule visit' 
          }, false, 'scheduleVisit/error');
          throw error;
        }
      },

      rescheduleVisit: async (visitId: string, newDate: Date, reason: string) => {
        // Find the visit across all subjects
        const { visitsBySubject } = get();
        let foundSubjectId: string | null = null;
        let foundVisitState: VisitState | null = null;
        
        visitsBySubject.forEach((visits, subjectId) => {
          const visit = visits.get(visitId);
          if (visit) {
            foundSubjectId = subjectId;
            foundVisitState = visit;
          }
        });
        
        if (!foundSubjectId || !foundVisitState) {
          set({ error: `Visit ${visitId} not found` }, false, 'rescheduleVisit/notFound');
          return;
        }
        
        // Copy to const for TypeScript narrowing
        const subjectId = foundSubjectId;
        const visitState = foundVisitState as VisitState;
        
        set({ isLoadingVisit: visitId, error: null }, false, 'rescheduleVisit/start');
        
        try {
          // Calculate new window
          const windowStart = new Date(newDate);
          windowStart.setDate(windowStart.getDate() - 3);
          
          const windowEnd = new Date(newDate);
          windowEnd.setDate(windowEnd.getDate() + 3);
          
          const updatedVisit: SubjectVisit = {
            ...visitState.visit,
            scheduledDate: newDate,
            windowStart,
            windowEnd,
            statusReason: reason,
            updatedAt: new Date(),
          };
          
          const updatedVisitState: VisitState = {
            visit: updatedVisit,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newVisitsBySubject = new Map(state.visitsBySubject);
            const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
            visitsMap.set(visitId, updatedVisitState);
            newVisitsBySubject.set(subjectId, visitsMap);
            return { visitsBySubject: newVisitsBySubject, isLoadingVisit: null };
          }, false, 'rescheduleVisit/success');
        } catch (error) {
          set({ 
            isLoadingVisit: null, 
            error: error instanceof Error ? error.message : 'Failed to reschedule visit' 
          }, false, 'rescheduleVisit/error');
        }
      },

      // ========================================================================
      // Visit Completion Actions
      // ========================================================================

      startVisit: async (visitId: string) => {
        const visitData = findVisitById(get().visitsBySubject, visitId);
        
        if (!visitData) {
          set({ error: `Visit ${visitId} not found` }, false, 'startVisit/notFound');
          return;
        }
        
        const { subjectId, visitState } = visitData;
        
        if (visitState.visit.status !== 'SCHEDULED') {
          set({ error: `Cannot start visit in status ${visitState.visit.status}` }, false, 'startVisit/invalidStatus');
          return;
        }
        
        set({ isLoadingVisit: visitId, error: null }, false, 'startVisit/start');
        
        try {
          const updatedVisit: SubjectVisit = {
            ...visitState.visit,
            actualDate: new Date(),
            status: 'PARTIALLY_COMPLETE',
            updatedAt: new Date(),
          };
          
          // Check if visit is out of window
          const compliance = calculateVisitCompliance(updatedVisit);
          if (compliance === 'EARLY' || compliance === 'LATE') {
            // Add window deviation
            const deviation: VisitDeviation = {
              id: crypto.randomUUID(),
              subjectVisitId: visitId,
              subjectId,
              studyId: updatedVisit.studyId,
              type: 'WINDOW_VIOLATION',
              severity: compliance === 'LATE' ? 'MAJOR' : 'MINOR',
              description: `Visit conducted ${compliance === 'EARLY' ? 'before' : 'after'} visit window`,
              deviationDate: new Date(),
              reportedDate: new Date(),
              reportedBy: 'system',
              impactOnData: false,
              impactOnSubjectSafety: false,
              capaRequired: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            updatedVisit.deviations = [...updatedVisit.deviations, deviation];
          }
          
          const updatedVisitState: VisitState = {
            visit: updatedVisit,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newVisitsBySubject = new Map(state.visitsBySubject);
            const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
            visitsMap.set(visitId, updatedVisitState);
            newVisitsBySubject.set(subjectId, visitsMap);
            return { visitsBySubject: newVisitsBySubject, isLoadingVisit: null };
          }, false, 'startVisit/success');
        } catch (error) {
          set({ 
            isLoadingVisit: null, 
            error: error instanceof Error ? error.message : 'Failed to start visit' 
          }, false, 'startVisit/error');
        }
      },

      completeVisit: async (visitId: string) => {
        const visitData = findVisitById(get().visitsBySubject, visitId);
        
        if (!visitData) {
          set({ error: `Visit ${visitId} not found` }, false, 'completeVisit/notFound');
          return;
        }
        
        const { subjectId, visitState } = visitData;
        
        set({ isLoadingVisit: visitId, error: null }, false, 'completeVisit/start');
        
        try {
          const updatedVisit: SubjectVisit = {
            ...visitState.visit,
            status: 'COMPLETED',
            actualDate: visitState.visit.actualDate || new Date(),
            updatedAt: new Date(),
          };
          
          const updatedVisitState: VisitState = {
            visit: updatedVisit,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newVisitsBySubject = new Map(state.visitsBySubject);
            const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
            visitsMap.set(visitId, updatedVisitState);
            newVisitsBySubject.set(subjectId, visitsMap);
            return { visitsBySubject: newVisitsBySubject, isLoadingVisit: null };
          }, false, 'completeVisit/success');
        } catch (error) {
          set({ 
            isLoadingVisit: null, 
            error: error instanceof Error ? error.message : 'Failed to complete visit' 
          }, false, 'completeVisit/error');
        }
      },

      missVisit: async (visitId: string, reason: string) => {
        const visitData = findVisitById(get().visitsBySubject, visitId);
        
        if (!visitData) {
          set({ error: `Visit ${visitId} not found` }, false, 'missVisit/notFound');
          return;
        }
        
        const { subjectId, visitState } = visitData;
        
        set({ isLoadingVisit: visitId, error: null }, false, 'missVisit/start');
        
        try {
          const updatedVisit: SubjectVisit = {
            ...visitState.visit,
            status: 'MISSED',
            statusReason: reason,
            updatedAt: new Date(),
          };
          
          const updatedVisitState: VisitState = {
            visit: updatedVisit,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newVisitsBySubject = new Map(state.visitsBySubject);
            const visitsMap = new Map(newVisitsBySubject.get(subjectId) || new Map());
            visitsMap.set(visitId, updatedVisitState);
            newVisitsBySubject.set(subjectId, visitsMap);
            return { visitsBySubject: newVisitsBySubject, isLoadingVisit: null };
          }, false, 'missVisit/success');
        } catch (error) {
          set({ 
            isLoadingVisit: null, 
            error: error instanceof Error ? error.message : 'Failed to mark visit as missed' 
          }, false, 'missVisit/error');
        }
      },

      // ========================================================================
      // Protocol Schedule
      // ========================================================================

      loadVisitSchedule: async (studyId: string) => {
        set({ isLoading: true, error: null }, false, 'loadVisitSchedule/start');
        
        try {
          // Simulate API call - in production this would load from backend
          await new Promise(resolve => setTimeout(resolve, 100));
          
          set({ isLoading: false }, false, 'loadVisitSchedule/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load visit schedule' 
          }, false, 'loadVisitSchedule/error');
        }
      },

      // ========================================================================
      // Compliance
      // ========================================================================

      loadComplianceMetrics: async (studyId: string) => {
        set({ isLoading: true, error: null }, false, 'loadComplianceMetrics/start');
        
        try {
          const metrics = calculateComplianceMetrics(get().visitsBySubject, studyId);
          
          set(state => {
            const newMetrics = new Map(state.complianceMetrics);
            newMetrics.set(studyId, metrics);
            return { complianceMetrics: newMetrics, isLoading: false };
          }, false, 'loadComplianceMetrics/success');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load compliance metrics' 
          }, false, 'loadComplianceMetrics/error');
        }
      },

      calculateWindowCompliance: (visitId: string): VisitComplianceStatus => {
        const visitData = findVisitById(get().visitsBySubject, visitId);
        
        if (!visitData) {
          return 'MISSED';
        }
        
        return calculateVisitCompliance(visitData.visitState.visit);
      },

      // ========================================================================
      // Selection Management
      // ========================================================================

      selectVisit: (visitId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedVisitIds);
          newSelected.add(visitId);
          return { selectedVisitIds: newSelected };
        }, false, 'selectVisit');
      },

      deselectVisit: (visitId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedVisitIds);
          newSelected.delete(visitId);
          return { selectedVisitIds: newSelected };
        }, false, 'deselectVisit');
      },

      clearSelection: () => {
        set({ selectedVisitIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Error Handling
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },
    }),
    { name: 'VisitStore' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function findVisitById(
  visitsBySubject: Map<string, Map<string, VisitState>>,
  visitId: string
): { subjectId: string; visitState: VisitState } | null {
  for (const [subjectId, visits] of Array.from(visitsBySubject)) {
    const visitState = visits.get(visitId);
    if (visitState) {
      return { subjectId, visitState };
    }
  }
  return null;
}

function calculateVisitCompliance(visit: SubjectVisit): VisitComplianceStatus {
  const visitDate = visit.actualDate || new Date();
  
  // Normalize dates to start of day for comparison
  const normalizedVisitDate = new Date(visitDate);
  normalizedVisitDate.setHours(0, 0, 0, 0);
  
  const windowStart = new Date(visit.windowStart);
  windowStart.setHours(0, 0, 0, 0);
  
  const windowEnd = new Date(visit.windowEnd);
  windowEnd.setHours(23, 59, 59, 999);
  
  if (visit.status === 'MISSED') {
    return 'MISSED';
  }
  
  if (normalizedVisitDate < windowStart) {
    return 'EARLY';
  }
  
  if (normalizedVisitDate > windowEnd) {
    return 'LATE';
  }
  
  return 'IN_WINDOW';
}

function calculateComplianceMetrics(
  visitsBySubject: Map<string, Map<string, VisitState>>,
  studyId: string
): VisitComplianceMetrics {
  const metrics: VisitComplianceMetrics = {
    studyId,
    totalVisits: 0,
    completedVisits: 0,
    missedVisits: 0,
    inWindowVisits: 0,
    outOfWindowVisits: 0,
    complianceRate: 0,
    averageDelay: 0,
    bySite: new Map(),
    lastUpdated: new Date(),
  };
  
  let totalDelayDays = 0;
  let visitsWithDelay = 0;
  
  visitsBySubject.forEach(visits => {
    visits.forEach(visitState => {
      const visit = visitState.visit;
      
      // Only count visits for the specified study
      if (visit.studyId && visit.studyId !== studyId) return;
      
      metrics.totalVisits++;
      
      if (visit.status === 'COMPLETED') {
        metrics.completedVisits++;
        
        const compliance = calculateVisitCompliance(visit);
        if (compliance === 'IN_WINDOW') {
          metrics.inWindowVisits++;
        } else {
          metrics.outOfWindowVisits++;
          
          // Calculate delay
          if (visit.actualDate) {
            const scheduledTime = visit.scheduledDate.getTime();
            const actualTime = visit.actualDate.getTime();
            const delayDays = Math.abs(actualTime - scheduledTime) / (1000 * 60 * 60 * 24);
            totalDelayDays += delayDays;
            visitsWithDelay++;
          }
        }
        
        // Track by site
        const siteId = visit.siteId;
        if (siteId) {
          const siteMetrics = metrics.bySite.get(siteId) || { completed: 0, missed: 0, complianceRate: 0 };
          siteMetrics.completed++;
          if (compliance === 'IN_WINDOW') {
            siteMetrics.complianceRate = Math.round(
              ((siteMetrics.complianceRate * (siteMetrics.completed - 1) + 100) / siteMetrics.completed)
            );
          } else {
            siteMetrics.complianceRate = Math.round(
              ((siteMetrics.complianceRate * (siteMetrics.completed - 1)) / siteMetrics.completed)
            );
          }
          metrics.bySite.set(siteId, siteMetrics);
        }
      } else if (visit.status === 'MISSED') {
        metrics.missedVisits++;
        
        // Track by site
        const siteId = visit.siteId;
        if (siteId) {
          const siteMetrics = metrics.bySite.get(siteId) || { completed: 0, missed: 0, complianceRate: 0 };
          siteMetrics.missed++;
          metrics.bySite.set(siteId, siteMetrics);
        }
      }
    });
  });
  
  // Calculate overall compliance rate
  if (metrics.completedVisits > 0) {
    metrics.complianceRate = Math.round((metrics.inWindowVisits / metrics.completedVisits) * 100);
  }
  
  // Calculate average delay
  if (visitsWithDelay > 0) {
    metrics.averageDelay = Math.round((totalDelayDays / visitsWithDelay) * 10) / 10;
  }
  
  return metrics;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectVisitsBySubject = (state: VisitStoreState, subjectId: string): VisitState[] => {
  const visits = state.visitsBySubject.get(subjectId);
  return visits ? Array.from(visits.values()) : [];
};

export const selectVisitById = (state: VisitStoreState, visitId: string): VisitState | null => {
  for (const visits of Array.from(state.visitsBySubject.values())) {
    const visit = visits.get(visitId);
    if (visit) return visit;
  }
  return null;
};

export const selectAllVisits = (state: VisitStoreState): VisitState[] => {
  const allVisits: VisitState[] = [];
  state.visitsBySubject.forEach(visits => {
    visits.forEach(visit => {
      allVisits.push(visit);
    });
  });
  return allVisits;
};

export const selectUpcomingVisits = (state: VisitStoreState, days: number = 7): VisitState[] => {
  const allVisits = selectAllVisits(state);
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return allVisits.filter(visitState => {
    const visit = visitState.visit;
    if (visit.status !== 'SCHEDULED') return false;
    return visit.scheduledDate >= now && visit.scheduledDate <= futureDate;
  }).sort((a, b) => a.visit.scheduledDate.getTime() - b.visit.scheduledDate.getTime());
};

export const selectOverdueVisits = (state: VisitStoreState): VisitState[] => {
  const allVisits = selectAllVisits(state);
  const now = new Date();
  
  return allVisits.filter(visitState => {
    const visit = visitState.visit;
    if (visit.status !== 'SCHEDULED') return false;
    return visit.windowEnd < now;
  }).sort((a, b) => a.visit.windowEnd.getTime() - b.visit.windowEnd.getTime());
};

export const selectVisitsByStatus = (state: VisitStoreState, status: VisitStatus): VisitState[] => {
  const allVisits = selectAllVisits(state);
  return allVisits.filter(v => v.visit.status === status);
};

export const selectCompletedVisits = (state: VisitStoreState): VisitState[] => {
  return selectVisitsByStatus(state, 'COMPLETED');
};

export const selectMissedVisits = (state: VisitStoreState): VisitState[] => {
  return selectVisitsByStatus(state, 'MISSED');
};

export const selectSelectedVisits = (state: VisitStoreState): VisitState[] => {
  const allVisits = selectAllVisits(state);
  return allVisits.filter(v => state.selectedVisitIds.has(v.visit.id));
};

export const selectVisitSchedule = (state: VisitStoreState, studyId: string): VisitScheduleState | null => {
  return state.visitSchedules.get(studyId) || null;
};

export const selectComplianceMetrics = (state: VisitStoreState, studyId: string): VisitComplianceMetrics | null => {
  return state.complianceMetrics.get(studyId) || null;
};

export const selectVisitSummary = (state: VisitStoreState) => {
  const allVisits = selectAllVisits(state);
  
  return allVisits.reduce((acc, visitState) => {
    const visit = visitState.visit;
    acc.total += 1;
    
    switch (visit.status) {
      case 'SCHEDULED':
        acc.scheduled += 1;
        break;
      case 'COMPLETED':
        acc.completed += 1;
        break;
      case 'MISSED':
        acc.missed += 1;
        break;
      case 'PARTIALLY_COMPLETE':
        acc.inProgress += 1;
        break;
    }
    
    // Check if overdue
    if (visit.status === 'SCHEDULED' && visit.windowEnd < new Date()) {
      acc.overdue += 1;
    }
    
    return acc;
  }, {
    total: 0,
    scheduled: 0,
    completed: 0,
    missed: 0,
    inProgress: 0,
    overdue: 0,
  });
};

// ============================================================================
// Hooks
// ============================================================================

export const useVisitsBySubject = (subjectId: string) => 
  useVisitStore(state => selectVisitsBySubject(state, subjectId));

export const useVisitById = (visitId: string) => 
  useVisitStore(state => selectVisitById(state, visitId));

export const useAllVisits = () => 
  useVisitStore(selectAllVisits);

export const useUpcomingVisits = (days: number = 7) => 
  useVisitStore(state => selectUpcomingVisits(state, days));

export const useOverdueVisits = () => 
  useVisitStore(selectOverdueVisits);

export const useCompletedVisits = () => 
  useVisitStore(selectCompletedVisits);

export const useMissedVisits = () => 
  useVisitStore(selectMissedVisits);

export const useSelectedVisits = () => 
  useVisitStore(selectSelectedVisits);

export const useVisitSelection = () => 
  useVisitStore(state => state.selectedVisitIds);

export const useVisitLoading = () => 
  useVisitStore(state => ({ isLoading: state.isLoading, isLoadingVisit: state.isLoadingVisit }));

export const useVisitError = () => 
  useVisitStore(state => state.error);

export const useVisitSchedule = (studyId: string) => 
  useVisitStore(state => selectVisitSchedule(state, studyId));

export const useComplianceMetrics = (studyId: string) => 
  useVisitStore(state => selectComplianceMetrics(state, studyId));

export const useVisitSummary = () => 
  useVisitStore(selectVisitSummary);
