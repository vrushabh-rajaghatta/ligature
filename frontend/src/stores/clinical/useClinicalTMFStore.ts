

/**
 * Clinical TMF Integration Store
 * Zustand store for Clinical → TMF filing state
 * @version 0.20.10.6
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  getClinicalTMFIntegrationService,
  type ClinicalDocument,
  type ClinicalDocumentType,
  type TMFFilingEvent,
  type TMFFilingStatus,
  type TMFZoneMapping,
  type FilingResult,
  type FilingBatchResult,
  type FilingMetrics,
  TMF_ZONE_MAPPING,
} from '@/services/clinical/clinical-tmf-integration';

// ============================================================================
// Store State
// ============================================================================

export interface ClinicalTMFStoreState {
  // Filing events
  filingEvents: Map<string, TMFFilingEvent>;
  
  // Selection
  selectedFilingId: string | null;
  
  // Loading states
  isLoading: boolean;
  isFiling: boolean;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: ClinicalTMFFilters;
  
  // Metrics cache
  metricsCache: Map<string, FilingMetrics>;
  
  // Auto-filing settings
  autoFilingEnabled: boolean;
  autoFilingRules: AutoFilingRule[];
}

export interface ClinicalTMFFilters {
  studyId?: string;
  siteId?: string;
  status?: TMFFilingStatus[];
  documentType?: ClinicalDocumentType[];
  zone?: number[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AutoFilingRule {
  id: string;
  documentType: ClinicalDocumentType;
  enabled: boolean;
  autoApprove: boolean;
  notifyOnFiling: boolean;
}

// ============================================================================
// Store Actions
// ============================================================================

export interface ClinicalTMFStoreActions {
  // Filing operations
  fileDocument: (document: ClinicalDocument) => Promise<FilingResult>;
  fileDocumentBatch: (documents: ClinicalDocument[]) => Promise<FilingBatchResult>;
  retryFiling: (filingEventId: string) => Promise<FilingResult>;
  cancelFiling: (filingEventId: string, reason: string) => Promise<boolean>;
  supersedeFiling: (filingEventId: string, newDocument: ClinicalDocument) => Promise<FilingResult>;
  
  // Document classification
  classifyDocument: (fileName: string, metadata?: Record<string, unknown>) => ClinicalDocumentType | null;
  getZoneMapping: (documentType: ClinicalDocumentType) => TMFZoneMapping;
  
  // Query operations
  loadFilings: (filters?: ClinicalTMFFilters) => Promise<void>;
  loadFilingsByStudy: (studyId: string) => Promise<void>;
  loadFilingsBySite: (siteId: string) => Promise<void>;
  
  // Selection
  selectFiling: (filingId: string | null) => void;
  
  // Filters
  setFilters: (filters: Partial<ClinicalTMFFilters>) => void;
  clearFilters: () => void;
  
  // Metrics
  loadMetrics: (studyId: string) => Promise<FilingMetrics>;
  
  // Auto-filing configuration
  setAutoFilingEnabled: (enabled: boolean) => void;
  updateAutoFilingRule: (rule: AutoFilingRule) => void;
  
  // Error handling
  clearError: () => void;
  
  // Sync from service
  syncFromService: () => void;
}

export type ClinicalTMFStore = ClinicalTMFStoreState & ClinicalTMFStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_AUTO_FILING_RULES: AutoFilingRule[] = [
  { id: 'rule-1', documentType: 'SITE_1572', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-2', documentType: 'INVESTIGATOR_CV', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-3', documentType: 'MEDICAL_LICENSE', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-4', documentType: 'MONITORING_REPORT', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-5', documentType: 'PROTOCOL_DEVIATION', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-6', documentType: 'IRB_APPROVAL', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-7', documentType: 'INFORMED_CONSENT', enabled: true, autoApprove: false, notifyOnFiling: true },
  { id: 'rule-8', documentType: 'SITE_INITIATION_REPORT', enabled: true, autoApprove: false, notifyOnFiling: true },
];

const initialState: ClinicalTMFStoreState = {
  filingEvents: new Map(),
  selectedFilingId: null,
  isLoading: false,
  isFiling: false,
  error: null,
  filters: {},
  metricsCache: new Map(),
  autoFilingEnabled: true,
  autoFilingRules: DEFAULT_AUTO_FILING_RULES,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useClinicalTMFStore = create<ClinicalTMFStore>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Filing Operations
  // -------------------------------------------------------------------------

  fileDocument: async (document) => {
    set({ isFiling: true, error: null });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const result = await service.fileDocument(document);
      
      // Update store with new filing event
      set(state => {
        const newEvents = new Map(state.filingEvents);
        newEvents.set(result.filingEvent.id, result.filingEvent);
        return { filingEvents: newEvents, isFiling: false };
      });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to file document';
      set({ isFiling: false, error: message });
      throw error;
    }
  },

  fileDocumentBatch: async (documents) => {
    set({ isFiling: true, error: null });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const result = await service.fileDocumentBatch(documents);
      
      // Update store with all new filing events
      set(state => {
        const newEvents = new Map(state.filingEvents);
        result.results.forEach(r => {
          newEvents.set(r.filingEvent.id, r.filingEvent);
        });
        return { filingEvents: newEvents, isFiling: false };
      });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to file documents';
      set({ isFiling: false, error: message });
      throw error;
    }
  },

  retryFiling: async (filingEventId) => {
    set({ isFiling: true, error: null });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const result = await service.retryFiling(filingEventId);
      
      set(state => {
        const newEvents = new Map(state.filingEvents);
        newEvents.set(result.filingEvent.id, result.filingEvent);
        return { filingEvents: newEvents, isFiling: false };
      });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry filing';
      set({ isFiling: false, error: message });
      throw error;
    }
  },

  cancelFiling: async (filingEventId, reason) => {
    try {
      const service = getClinicalTMFIntegrationService();
      const success = service.cancelFiling(filingEventId, reason);
      
      if (success) {
        get().syncFromService();
      }
      
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel filing';
      set({ error: message });
      return false;
    }
  },

  supersedeFiling: async (filingEventId, newDocument) => {
    set({ isFiling: true, error: null });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const result = await service.supersedeFiling(filingEventId, newDocument);
      
      // Sync all events from service
      get().syncFromService();
      set({ isFiling: false });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to supersede filing';
      set({ isFiling: false, error: message });
      throw error;
    }
  },

  // -------------------------------------------------------------------------
  // Document Classification
  // -------------------------------------------------------------------------

  classifyDocument: (fileName, metadata) => {
    const service = getClinicalTMFIntegrationService();
    return service.classifyDocument(fileName, metadata);
  },

  getZoneMapping: (documentType) => {
    return TMF_ZONE_MAPPING[documentType];
  },

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  loadFilings: async (filters) => {
    set({ isLoading: true, error: null });
    
    if (filters) {
      set({ filters });
    }
    
    try {
      get().syncFromService();
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load filings';
      set({ isLoading: false, error: message });
    }
  },

  loadFilingsByStudy: async (studyId) => {
    set({ isLoading: true, error: null, filters: { studyId } });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const filings = service.getFilingsByStudy(studyId);
      
      const eventsMap = new Map<string, TMFFilingEvent>();
      filings.forEach(f => eventsMap.set(f.id, f));
      
      set({ filingEvents: eventsMap, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load filings';
      set({ isLoading: false, error: message });
    }
  },

  loadFilingsBySite: async (siteId) => {
    set({ isLoading: true, error: null, filters: { siteId } });
    
    try {
      const service = getClinicalTMFIntegrationService();
      const filings = service.getFilingsBySite(siteId);
      
      const eventsMap = new Map<string, TMFFilingEvent>();
      filings.forEach(f => eventsMap.set(f.id, f));
      
      set({ filingEvents: eventsMap, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load filings';
      set({ isLoading: false, error: message });
    }
  },

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  selectFiling: (filingId) => {
    set({ selectedFilingId: filingId });
  },

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  loadMetrics: async (studyId) => {
    const state = get();
    
    // Check cache
    const cached = state.metricsCache.get(studyId);
    if (cached) return cached;
    
    const service = getClinicalTMFIntegrationService();
    const metrics = service.getFilingMetrics(studyId);
    
    // Cache result
    set(state => {
      const newCache = new Map(state.metricsCache);
      newCache.set(studyId, metrics);
      return { metricsCache: newCache };
    });
    
    return metrics;
  },

  // -------------------------------------------------------------------------
  // Auto-filing Configuration
  // -------------------------------------------------------------------------

  setAutoFilingEnabled: (enabled) => {
    set({ autoFilingEnabled: enabled });
  },

  updateAutoFilingRule: (rule) => {
    set(state => ({
      autoFilingRules: state.autoFilingRules.map(r =>
        r.id === rule.id ? rule : r
      ),
    }));
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
    const service = getClinicalTMFIntegrationService();
    const allFilings = service.getAllFilings();
    
    const eventsMap = new Map<string, TMFFilingEvent>();
    allFilings.forEach(f => eventsMap.set(f.id, f));
    
    set({ filingEvents: eventsMap });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectFilingById = (state: ClinicalTMFStoreState, filingId: string): TMFFilingEvent | null => {
  return state.filingEvents.get(filingId) ?? null;
};

export const selectAllFilings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return Array.from(state.filingEvents.values());
};

export const selectFilingsByStudy = (state: ClinicalTMFStoreState, studyId: string): TMFFilingEvent[] => {
  return Array.from(state.filingEvents.values())
    .filter(fe => fe.studyId === studyId);
};

export const selectFilingsBySite = (state: ClinicalTMFStoreState, siteId: string): TMFFilingEvent[] => {
  return Array.from(state.filingEvents.values())
    .filter(fe => fe.siteId === siteId);
};

export const selectFilingsByStatus = (state: ClinicalTMFStoreState, status: TMFFilingStatus): TMFFilingEvent[] => {
  return Array.from(state.filingEvents.values())
    .filter(fe => fe.status === status);
};

export const selectFilingsByZone = (state: ClinicalTMFStoreState, zone: number): TMFFilingEvent[] => {
  return Array.from(state.filingEvents.values())
    .filter(fe => fe.tmfZone === zone);
};

export const selectPendingFilings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return selectFilingsByStatus(state, 'PENDING');
};

export const selectFailedFilings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return selectFilingsByStatus(state, 'FAILED');
};

export const selectSelectedFiling = (state: ClinicalTMFStoreState): TMFFilingEvent | null => {
  if (!state.selectedFilingId) return null;
  return state.filingEvents.get(state.selectedFilingId) ?? null;
};

export const selectFilteredFilings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  const { filters } = state;
  
  return Array.from(state.filingEvents.values())
    .filter(fe => {
      if (filters.studyId && fe.studyId !== filters.studyId) return false;
      if (filters.siteId && fe.siteId !== filters.siteId) return false;
      if (filters.status?.length && !filters.status.includes(fe.status)) return false;
      if (filters.documentType?.length && !filters.documentType.includes(fe.documentType)) return false;
      if (filters.zone?.length && !filters.zone.includes(fe.tmfZone)) return false;
      if (filters.dateFrom && fe.filedAt < filters.dateFrom) return false;
      if (filters.dateTo && fe.filedAt > filters.dateTo) return false;
      return true;
    });
};

export const selectFilingCounts = (state: ClinicalTMFStoreState): Record<TMFFilingStatus, number> => {
  const counts: Record<TMFFilingStatus, number> = {
    PENDING: 0,
    FILED: 0,
    FAILED: 0,
    SUPERSEDED: 0,
    CANCELLED: 0,
  };
  
  state.filingEvents.forEach(fe => {
    counts[fe.status]++;
  });
  
  return counts;
};

export const selectZone3Filings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return selectFilingsByZone(state, 3);
};

export const selectZone5Filings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return selectFilingsByZone(state, 5);
};

export const selectZone8Filings = (state: ClinicalTMFStoreState): TMFFilingEvent[] => {
  return selectFilingsByZone(state, 8);
};

// ============================================================================
// Hooks
// ============================================================================

export const useFilingById = (filingId: string) => {
  return useClinicalTMFStore(useShallow(state => selectFilingById(state, filingId)));
};

export const useAllFilings = () => {
  return useClinicalTMFStore(useShallow(selectAllFilings));
};

export const useFilingsByStudy = (studyId: string) => {
  return useClinicalTMFStore(useShallow(state => selectFilingsByStudy(state, studyId)));
};

export const useFilingsBySite = (siteId: string) => {
  return useClinicalTMFStore(useShallow(state => selectFilingsBySite(state, siteId)));
};

export const usePendingFilings = () => {
  return useClinicalTMFStore(useShallow(selectPendingFilings));
};

export const useFailedFilings = () => {
  return useClinicalTMFStore(useShallow(selectFailedFilings));
};

export const useSelectedFiling = () => {
  return useClinicalTMFStore(useShallow(selectSelectedFiling));
};

export const useFilteredFilings = () => {
  return useClinicalTMFStore(useShallow(selectFilteredFilings));
};

export const useFilingCounts = () => {
  return useClinicalTMFStore(useShallow(selectFilingCounts));
};

export const useZone3Filings = () => {
  return useClinicalTMFStore(useShallow(selectZone3Filings));
};

export const useZone5Filings = () => {
  return useClinicalTMFStore(useShallow(selectZone5Filings));
};

export const useZone8Filings = () => {
  return useClinicalTMFStore(useShallow(selectZone8Filings));
};

export const useClinicalTMFLoading = () => {
  return useClinicalTMFStore(useShallow(state => ({
    isLoading: state.isLoading,
    isFiling: state.isFiling,
  })));
};

export const useClinicalTMFError = () => {
  return useClinicalTMFStore(state => state.error);
};

export const useClinicalTMFFilters = () => {
  return useClinicalTMFStore(state => state.filters);
};

export const useAutoFilingConfig = () => {
  return useClinicalTMFStore(useShallow(state => ({
    enabled: state.autoFilingEnabled,
    rules: state.autoFilingRules,
    setEnabled: state.setAutoFilingEnabled,
    updateRule: state.updateAutoFilingRule,
  })));
};
