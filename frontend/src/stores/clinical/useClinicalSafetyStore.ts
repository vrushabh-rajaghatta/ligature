

/**
 * Clinical Safety Integration Store
 * Zustand store for Clinical → Safety handoff state
 * @version 0.20.10.7
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  getClinicalSafetyIntegrationService,
  type AEFormData,
  type AEToSafetyHandoff,
  type HandoffStatus,
  type ReportingTimeline,
  type SeriousnessCriteria,
  type HandoffResult,
  type SafetyCaseCreateParams,
  type SafetyCaseCreatedResult,
  type HandoffMetrics,
} from '@/services/clinical/clinical-safety-integration';

// ============================================================================
// Store State
// ============================================================================

export interface ClinicalSafetyStoreState {
  // Handoffs
  handoffs: Map<string, AEToSafetyHandoff>;
  
  // Selection
  selectedHandoffId: string | null;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: ClinicalSafetyFilters;
  
  // Metrics cache
  metricsCache: Map<string, HandoffMetrics>;
}

export interface ClinicalSafetyFilters {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  status?: HandoffStatus[];
  reportingTimeline?: ReportingTimeline[];
  expeditedOnly?: boolean;
  seriousnessOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================================================
// Store Actions
// ============================================================================

export interface ClinicalSafetyStoreActions {
  // Handoff operations
  createHandoff: (aeData: AEFormData, context?: { siteName?: string; studyName?: string }) => HandoffResult;
  reviewHandoff: (handoffId: string, approved: boolean, reviewedBy: string, notes?: string) => HandoffResult;
  createSafetyCase: (params: SafetyCaseCreateParams) => Promise<SafetyCaseCreatedResult>;
  
  // MedDRA coding
  updateMedDRACoding: (handoffId: string, coding: {
    llt?: string;
    lltCode?: string;
    pt?: string;
    ptCode?: string;
    soc?: string;
    socCode?: string;
  }, updatedBy: string) => HandoffResult;
  
  // Query operations
  loadHandoffs: (filters?: ClinicalSafetyFilters) => Promise<void>;
  loadHandoffsByStudy: (studyId: string) => Promise<void>;
  loadHandoffsBySite: (siteId: string) => Promise<void>;
  loadHandoffsBySubject: (subjectId: string) => Promise<void>;
  
  // Selection
  selectHandoff: (handoffId: string | null) => void;
  
  // Filters
  setFilters: (filters: Partial<ClinicalSafetyFilters>) => void;
  clearFilters: () => void;
  
  // Metrics
  loadMetrics: (studyId?: string) => Promise<HandoffMetrics>;
  
  // Error handling
  clearError: () => void;
  
  // Sync from service
  syncFromService: () => void;
}

export type ClinicalSafetyStore = ClinicalSafetyStoreState & ClinicalSafetyStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ClinicalSafetyStoreState = {
  handoffs: new Map(),
  selectedHandoffId: null,
  isLoading: false,
  isProcessing: false,
  error: null,
  filters: {},
  metricsCache: new Map(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useClinicalSafetyStore = create<ClinicalSafetyStore>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Handoff Operations
  // -------------------------------------------------------------------------

  createHandoff: (aeData: AEFormData, context?: { siteName?: string; studyName?: string }) => {
    const service = getClinicalSafetyIntegrationService();
    const result = service.createHandoff(aeData, context);
    
    if (result.success) {
      set((state) => {
        const newHandoffs = new Map(state.handoffs);
        newHandoffs.set(result.handoff.id, result.handoff);
        return { handoffs: newHandoffs };
      });
    }
    
    return result;
  },

  reviewHandoff: (handoffId: string, approved: boolean, reviewedBy: string, notes?: string) => {
    const service = getClinicalSafetyIntegrationService();
    const result = service.reviewHandoff(handoffId, approved, reviewedBy, notes);
    
    if (result.success) {
      set((state) => {
        const newHandoffs = new Map(state.handoffs);
        newHandoffs.set(result.handoff.id, result.handoff);
        return { handoffs: newHandoffs };
      });
    }
    
    return result;
  },

  createSafetyCase: async (params: SafetyCaseCreateParams) => {
    set({ isProcessing: true, error: null });
    
    try {
      const service = getClinicalSafetyIntegrationService();
      const result = await service.createSafetyCase(params);
      
      if (result.success) {
        get().syncFromService();
      }
      
      set({ isProcessing: false });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create safety case';
      set({ isProcessing: false, error: message });
      return { success: false, errorMessage: message };
    }
  },

  updateMedDRACoding: (handoffId: string, coding: {
    llt?: string;
    lltCode?: string;
    pt?: string;
    ptCode?: string;
    soc?: string;
    socCode?: string;
  }, updatedBy: string) => {
    const service = getClinicalSafetyIntegrationService();
    const result = service.updateMedDRACoding(handoffId, coding, updatedBy);
    
    if (result.success) {
      set((state) => {
        const newHandoffs = new Map(state.handoffs);
        newHandoffs.set(result.handoff.id, result.handoff);
        return { handoffs: newHandoffs };
      });
    }
    
    return result;
  },

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  loadHandoffs: async (filters?: ClinicalSafetyFilters) => {
    set({ isLoading: true, error: null });
    
    if (filters) {
      set({ filters });
    }
    
    try {
      get().syncFromService();
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load handoffs';
      set({ isLoading: false, error: message });
    }
  },

  loadHandoffsByStudy: async (studyId: string) => {
    set({ isLoading: true, error: null, filters: { studyId } });
    
    try {
      const service = getClinicalSafetyIntegrationService();
      const handoffs = service.getHandoffsByStudy(studyId);
      
      const handoffsMap = new Map<string, AEToSafetyHandoff>();
      handoffs.forEach(h => handoffsMap.set(h.id, h));
      
      set({ handoffs: handoffsMap, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load handoffs';
      set({ isLoading: false, error: message });
    }
  },

  loadHandoffsBySite: async (siteId: string) => {
    set({ isLoading: true, error: null, filters: { siteId } });
    
    try {
      const service = getClinicalSafetyIntegrationService();
      const handoffs = service.getHandoffsBySite(siteId);
      
      const handoffsMap = new Map<string, AEToSafetyHandoff>();
      handoffs.forEach(h => handoffsMap.set(h.id, h));
      
      set({ handoffs: handoffsMap, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load handoffs';
      set({ isLoading: false, error: message });
    }
  },

  loadHandoffsBySubject: async (subjectId: string) => {
    set({ isLoading: true, error: null, filters: { subjectId } });
    
    try {
      const service = getClinicalSafetyIntegrationService();
      const handoffs = service.getHandoffsBySubject(subjectId);
      
      const handoffsMap = new Map<string, AEToSafetyHandoff>();
      handoffs.forEach(h => handoffsMap.set(h.id, h));
      
      set({ handoffs: handoffsMap, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load handoffs';
      set({ isLoading: false, error: message });
    }
  },

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  selectHandoff: (handoffId: string | null) => {
    set({ selectedHandoffId: handoffId });
  },

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  setFilters: (filters: Partial<ClinicalSafetyFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  loadMetrics: async (studyId?: string) => {
    const cacheKey = studyId || 'global';
    const state = get();
    
    // Check cache
    const cached = state.metricsCache.get(cacheKey);
    if (cached) return cached;
    
    const service = getClinicalSafetyIntegrationService();
    const metrics = service.getHandoffMetrics(studyId);
    
    // Cache result
    set((state) => {
      const newCache = new Map(state.metricsCache);
      newCache.set(cacheKey, metrics);
      return { metricsCache: newCache };
    });
    
    return metrics;
  },

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  clearError: () => {
    set({ error: null });
  },

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------

  syncFromService: () => {
    const service = getClinicalSafetyIntegrationService();
    const allHandoffs = service.getAllHandoffs();
    
    const handoffsMap = new Map<string, AEToSafetyHandoff>();
    allHandoffs.forEach(h => handoffsMap.set(h.id, h));
    
    set({ handoffs: handoffsMap });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectHandoffById = (state: ClinicalSafetyStoreState, handoffId: string): AEToSafetyHandoff | null => {
  return state.handoffs.get(handoffId) ?? null;
};

export const selectAllHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values());
};

export const selectHandoffsByStudy = (state: ClinicalSafetyStoreState, studyId: string): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.studyId === studyId);
};

export const selectHandoffsBySite = (state: ClinicalSafetyStoreState, siteId: string): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.siteId === siteId);
};

export const selectHandoffsBySubject = (state: ClinicalSafetyStoreState, subjectId: string): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.subjectId === subjectId);
};

export const selectHandoffsByStatus = (state: ClinicalSafetyStoreState, status: HandoffStatus): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.status === status);
};

export const selectPendingReviewHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.status === 'DETECTED' || h.status === 'PENDING_REVIEW');
};

export const selectExpeditedHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.expeditedReporting);
};

export const selectSeriousHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.assessedSerious);
};

export const selectHandoffsByTimeline = (state: ClinicalSafetyStoreState, timeline: ReportingTimeline): AEToSafetyHandoff[] => {
  return Array.from(state.handoffs.values())
    .filter(h => h.reportingTimeline === timeline);
};

export const select7DayHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return selectHandoffsByTimeline(state, '7_DAY');
};

export const select15DayHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  return selectHandoffsByTimeline(state, '15_DAY');
};

export const selectSelectedHandoff = (state: ClinicalSafetyStoreState): AEToSafetyHandoff | null => {
  if (!state.selectedHandoffId) return null;
  return state.handoffs.get(state.selectedHandoffId) ?? null;
};

export const selectFilteredHandoffs = (state: ClinicalSafetyStoreState): AEToSafetyHandoff[] => {
  const { filters } = state;
  
  return Array.from(state.handoffs.values())
    .filter(h => {
      if (filters.studyId && h.studyId !== filters.studyId) return false;
      if (filters.siteId && h.siteId !== filters.siteId) return false;
      if (filters.subjectId && h.subjectId !== filters.subjectId) return false;
      if (filters.status?.length && !filters.status.includes(h.status)) return false;
      if (filters.reportingTimeline?.length && !filters.reportingTimeline.includes(h.reportingTimeline)) return false;
      if (filters.expeditedOnly && !h.expeditedReporting) return false;
      if (filters.seriousnessOnly && !h.assessedSerious) return false;
      if (filters.dateFrom && h.detectedAt < filters.dateFrom) return false;
      if (filters.dateTo && h.detectedAt > filters.dateTo) return false;
      return true;
    });
};

export const selectHandoffCounts = (state: ClinicalSafetyStoreState): {
  total: number;
  byStatus: Record<HandoffStatus, number>;
  expedited: number;
  serious: number;
} => {
  const handoffs = Array.from(state.handoffs.values());
  
  const byStatus: Record<HandoffStatus, number> = {
    DETECTED: 0,
    PENDING_REVIEW: 0,
    TRANSFERRED: 0,
    CASE_CREATED: 0,
    REJECTED: 0,
    FAILED: 0,
  };
  
  handoffs.forEach(h => {
    byStatus[h.status]++;
  });
  
  return {
    total: handoffs.length,
    byStatus,
    expedited: handoffs.filter(h => h.expeditedReporting).length,
    serious: handoffs.filter(h => h.assessedSerious).length,
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useHandoffById = (handoffId: string) => {
  return useClinicalSafetyStore(useShallow(state => selectHandoffById(state, handoffId)));
};

export const useAllHandoffs = () => {
  return useClinicalSafetyStore(useShallow(selectAllHandoffs));
};

export const useHandoffsByStudy = (studyId: string) => {
  return useClinicalSafetyStore(useShallow(state => selectHandoffsByStudy(state, studyId)));
};

export const useHandoffsBySite = (siteId: string) => {
  return useClinicalSafetyStore(useShallow(state => selectHandoffsBySite(state, siteId)));
};

export const useHandoffsBySubject = (subjectId: string) => {
  return useClinicalSafetyStore(useShallow(state => selectHandoffsBySubject(state, subjectId)));
};

export const usePendingReviewHandoffs = () => {
  return useClinicalSafetyStore(useShallow(selectPendingReviewHandoffs));
};

export const useExpeditedHandoffs = () => {
  return useClinicalSafetyStore(useShallow(selectExpeditedHandoffs));
};

export const useSeriousHandoffs = () => {
  return useClinicalSafetyStore(useShallow(selectSeriousHandoffs));
};

export const use7DayHandoffs = () => {
  return useClinicalSafetyStore(useShallow(select7DayHandoffs));
};

export const use15DayHandoffs = () => {
  return useClinicalSafetyStore(useShallow(select15DayHandoffs));
};

export const useSelectedHandoff = () => {
  return useClinicalSafetyStore(useShallow(selectSelectedHandoff));
};

export const useFilteredHandoffs = () => {
  return useClinicalSafetyStore(useShallow(selectFilteredHandoffs));
};

export const useHandoffCounts = () => {
  return useClinicalSafetyStore(useShallow(selectHandoffCounts));
};

export const useClinicalSafetyLoading = () => {
  return useClinicalSafetyStore(useShallow(state => ({
    isLoading: state.isLoading,
    isProcessing: state.isProcessing,
  })));
};

export const useClinicalSafetyError = () => {
  return useClinicalSafetyStore(state => state.error);
};

export const useClinicalSafetyFilters = () => {
  return useClinicalSafetyStore(state => state.filters);
};
