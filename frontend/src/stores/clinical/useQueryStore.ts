

/**
 * Query Management Store
 * Zustand store for data query lifecycle management
 * @version 0.20.10.3
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  DataQuery,
  QueryStatus,
  QueryType,
} from '@/types/clinical-form';

// ============================================================================
// Types
// ============================================================================

export type QueryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface QueryResponse {
  id: string;
  queryId: string;
  responseText: string;
  respondedBy: string;
  respondedAt: Date;
  attachments?: string[];
}

export interface QueryState {
  query: DataQuery;
  responses: QueryResponse[];
  ageInDays: number;
  isOverdue: boolean;
  lastActivityAt: Date;
}

export interface QueryFilters {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  formInstanceId?: string;
  status?: QueryStatus[];
  queryType?: QueryType[];
  priority?: QueryPriority[];
  openedBy?: string;
  answeredBy?: string;
  minAge?: number;
  maxAge?: number;
  isOverdue?: boolean;
  fieldOID?: string;
}

export interface QueryMetrics {
  totalQueries: number;
  openQueries: number;
  answeredQueries: number;
  closedQueries: number;
  cancelledQueries: number;
  averageResolutionDays: number;
  overdueCount: number;
  byPriority: Record<QueryPriority, number>;
  byType: Record<QueryType, number>;
  agingBuckets: {
    lessThan7Days: number;
    between7And14Days: number;
    between14And30Days: number;
    moreThan30Days: number;
  };
}

export interface QueryCreateParams {
  formInstanceId: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  queryText: string;
  queryType: QueryType;
  queryCategory?: string;
  priority?: QueryPriority;
}

// ============================================================================
// Store State
// ============================================================================

export interface QueryStoreState {
  // Query collection
  queries: Map<string, QueryState>;
  
  // Selection
  selectedQueryIds: Set<string>;
  
  // Loading states
  isLoading: boolean;
  isLoadingQuery: string | null;
  isSaving: boolean;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: QueryFilters;
  
  // Metrics cache
  metricsCache: Map<string, QueryMetrics>; // Key by formInstanceId or 'global'
}

// ============================================================================
// Store Actions
// ============================================================================

export interface QueryStoreActions {
  // Query lifecycle
  loadQueries: (filters: QueryFilters) => Promise<void>;
  loadQuery: (queryId: string) => Promise<void>;
  createQuery: (params: QueryCreateParams) => Promise<string>;
  
  // Query responses
  answerQuery: (queryId: string, responseText: string, attachments?: string[]) => Promise<void>;
  addResponse: (queryId: string, responseText: string, attachments?: string[]) => Promise<void>;
  
  // Status transitions
  closeQuery: (queryId: string, resolution?: string) => Promise<void>;
  cancelQuery: (queryId: string, reason: string) => Promise<void>;
  reopenQuery: (queryId: string, reason: string) => Promise<void>;
  
  // Bulk operations
  bulkCloseQueries: (queryIds: string[], resolution?: string) => Promise<void>;
  bulkCancelQueries: (queryIds: string[], reason: string) => Promise<void>;
  
  // Selection
  selectQuery: (queryId: string) => void;
  deselectQuery: (queryId: string) => void;
  selectAllQueries: (queryIds: string[]) => void;
  clearSelection: () => void;
  
  // Filters
  setFilters: (filters: Partial<QueryFilters>) => void;
  clearFilters: () => void;
  
  // Metrics
  loadMetrics: (formInstanceId?: string) => Promise<QueryMetrics>;
  calculateAgingMetrics: () => QueryMetrics;
  
  // Error handling
  clearError: () => void;
  
  // Auto-close on data change
  checkAutoClose: (formInstanceId: string, fieldOID: string) => Promise<string[]>;
}

export type QueryStore = QueryStoreState & QueryStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: QueryStoreState = {
  queries: new Map(),
  selectedQueryIds: new Set(),
  isLoading: false,
  isLoadingQuery: null,
  isSaving: false,
  error: null,
  filters: {},
  metricsCache: new Map(),
};

// ============================================================================
// Utility Functions
// ============================================================================

function calculateQueryAge(openedDate: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - openedDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isQueryOverdue(query: DataQuery, ageInDays: number): boolean {
  // Queries open > 14 days without answer are considered overdue
  if (query.status === 'OPEN' && ageInDays > 14) return true;
  // Answered queries pending close > 7 days are overdue
  if (query.status === 'ANSWERED' && ageInDays > 7) return true;
  return false;
}

function getAgingBucket(ageInDays: number): keyof QueryMetrics['agingBuckets'] {
  if (ageInDays < 7) return 'lessThan7Days';
  if (ageInDays < 14) return 'between7And14Days';
  if (ageInDays < 30) return 'between14And30Days';
  return 'moreThan30Days';
}

// ============================================================================
// Mock API Functions
// ============================================================================

async function mockLoadQueries(filters: QueryFilters): Promise<DataQuery[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [];
}

async function mockLoadQuery(queryId: string): Promise<DataQuery | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return null;
}

async function mockCreateQuery(params: QueryCreateParams): Promise<DataQuery> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const now = new Date();
  return {
    id: `query-${Date.now()}`,
    formInstanceId: params.formInstanceId,
    fieldOID: params.fieldOID,
    sectionId: params.sectionId,
    repeatKey: params.repeatKey,
    queryType: params.queryType,
    status: 'OPEN',
    queryText: params.queryText,
    queryCategory: params.queryCategory,
    openedBy: 'current-user',
    openedDate: now,
    autoClosedOnChange: params.queryType === 'AUTO_QUERY',
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useQueryStore = create<QueryStore>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Query Lifecycle
  // -------------------------------------------------------------------------

  loadQueries: async (filters: QueryFilters) => {
    set({ isLoading: true, error: null, filters });
    
    try {
      const queries = await mockLoadQueries(filters);
      const queriesMap = new Map<string, QueryState>();
      
      queries.forEach(query => {
        const ageInDays = calculateQueryAge(query.openedDate);
        queriesMap.set(query.id, {
          query,
          responses: [],
          ageInDays,
          isOverdue: isQueryOverdue(query, ageInDays),
          lastActivityAt: query.answeredDate || query.openedDate,
        });
      });
      
      set({ queries: queriesMap, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load queries',
      });
    }
  },

  loadQuery: async (queryId: string) => {
    set({ isLoadingQuery: queryId, error: null });
    
    try {
      const query = await mockLoadQuery(queryId);
      
      if (query) {
        const ageInDays = calculateQueryAge(query.openedDate);
        
        set(state => {
          const newQueries = new Map(state.queries);
          newQueries.set(queryId, {
            query,
            responses: [],
            ageInDays,
            isOverdue: isQueryOverdue(query, ageInDays),
            lastActivityAt: query.answeredDate || query.openedDate,
          });
          return { queries: newQueries, isLoadingQuery: null };
        });
      } else {
        set({
          isLoadingQuery: null,
          error: `Query ${queryId} not found`,
        });
      }
    } catch (error) {
      set({
        isLoadingQuery: null,
        error: error instanceof Error ? error.message : 'Failed to load query',
      });
    }
  },

  createQuery: async (params) => {
    set({ isSaving: true, error: null });
    
    try {
      const query = await mockCreateQuery(params);
      const ageInDays = 0;
      
      set(state => {
        const newQueries = new Map(state.queries);
        newQueries.set(query.id, {
          query,
          responses: [],
          ageInDays,
          isOverdue: false,
          lastActivityAt: query.openedDate,
        });
        return { queries: newQueries, isSaving: false };
      });
      
      return query.id;
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to create query',
      });
      throw error;
    }
  },

  // -------------------------------------------------------------------------
  // Query Responses
  // -------------------------------------------------------------------------

  answerQuery: async (queryId, responseText, attachments) => {
    set({ isSaving: true, error: null });
    
    try {
      const now = new Date();
      
      set(state => {
        const newQueries = new Map(state.queries);
        const queryState = newQueries.get(queryId);
        
        if (queryState) {
          const response: QueryResponse = {
            id: `response-${Date.now()}`,
            queryId,
            responseText,
            respondedBy: 'current-user',
            respondedAt: now,
            attachments,
          };
          
          newQueries.set(queryId, {
            ...queryState,
            query: {
              ...queryState.query,
              status: 'ANSWERED',
              response: responseText,
              answeredBy: 'current-user',
              answeredDate: now,
              updatedAt: now,
            },
            responses: [...queryState.responses, response],
            lastActivityAt: now,
          });
        }
        
        return { queries: newQueries, isSaving: false };
      });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to answer query',
      });
    }
  },

  addResponse: async (queryId, responseText, attachments) => {
    const now = new Date();
    
    set(state => {
      const newQueries = new Map(state.queries);
      const queryState = newQueries.get(queryId);
      
      if (queryState) {
        const response: QueryResponse = {
          id: `response-${Date.now()}`,
          queryId,
          responseText,
          respondedBy: 'current-user',
          respondedAt: now,
          attachments,
        };
        
        newQueries.set(queryId, {
          ...queryState,
          responses: [...queryState.responses, response],
          lastActivityAt: now,
        });
      }
      
      return { queries: newQueries };
    });
  },

  // -------------------------------------------------------------------------
  // Status Transitions
  // -------------------------------------------------------------------------

  closeQuery: async (queryId, resolution) => {
    const now = new Date();
    
    set(state => {
      const newQueries = new Map(state.queries);
      const queryState = newQueries.get(queryId);
      
      if (queryState) {
        newQueries.set(queryId, {
          ...queryState,
          query: {
            ...queryState.query,
            status: 'CLOSED',
            closedBy: 'current-user',
            closedDate: now,
            updatedAt: now,
          },
          isOverdue: false,
          lastActivityAt: now,
        });
      }
      
      return { queries: newQueries };
    });
  },

  cancelQuery: async (queryId, reason) => {
    const now = new Date();
    
    set(state => {
      const newQueries = new Map(state.queries);
      const queryState = newQueries.get(queryId);
      
      if (queryState) {
        newQueries.set(queryId, {
          ...queryState,
          query: {
            ...queryState.query,
            status: 'CANCELLED',
            closedBy: 'current-user',
            closedDate: now,
            updatedAt: now,
          },
          isOverdue: false,
          lastActivityAt: now,
        });
      }
      
      return { queries: newQueries };
    });
  },

  reopenQuery: async (queryId, reason) => {
    const now = new Date();
    
    set(state => {
      const newQueries = new Map(state.queries);
      const queryState = newQueries.get(queryId);
      
      if (queryState) {
        const ageInDays = calculateQueryAge(queryState.query.openedDate);
        
        newQueries.set(queryId, {
          ...queryState,
          query: {
            ...queryState.query,
            status: 'OPEN',
            closedBy: undefined,
            closedDate: undefined,
            answeredBy: undefined,
            answeredDate: undefined,
            response: undefined,
            updatedAt: now,
          },
          isOverdue: isQueryOverdue({ ...queryState.query, status: 'OPEN' }, ageInDays),
          lastActivityAt: now,
        });
      }
      
      return { queries: newQueries };
    });
  },

  // -------------------------------------------------------------------------
  // Bulk Operations
  // -------------------------------------------------------------------------

  bulkCloseQueries: async (queryIds, resolution) => {
    for (const queryId of queryIds) {
      await get().closeQuery(queryId, resolution);
    }
  },

  bulkCancelQueries: async (queryIds, reason) => {
    for (const queryId of queryIds) {
      await get().cancelQuery(queryId, reason);
    }
  },

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  selectQuery: (queryId) => {
    set(state => {
      const newSelection = new Set(state.selectedQueryIds);
      newSelection.add(queryId);
      return { selectedQueryIds: newSelection };
    });
  },

  deselectQuery: (queryId) => {
    set(state => {
      const newSelection = new Set(state.selectedQueryIds);
      newSelection.delete(queryId);
      return { selectedQueryIds: newSelection };
    });
  },

  selectAllQueries: (queryIds) => {
    set({ selectedQueryIds: new Set(queryIds) });
  },

  clearSelection: () => {
    set({ selectedQueryIds: new Set() });
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

  loadMetrics: async (formInstanceId) => {
    const cacheKey = formInstanceId || 'global';
    const state = get();
    
    // Check cache
    const cached = state.metricsCache.get(cacheKey);
    if (cached) return cached;
    
    const metrics = get().calculateAgingMetrics();
    
    // Cache result
    set(state => {
      const newCache = new Map(state.metricsCache);
      newCache.set(cacheKey, metrics);
      return { metricsCache: newCache };
    });
    
    return metrics;
  },

  calculateAgingMetrics: () => {
    const state = get();
    const queryStates = Array.from(state.queries.values());
    
    const byPriority: Record<QueryPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    
    const byType: Record<QueryType, number> = {
      MANUAL: 0,
      SYSTEM: 0,
      AUTO_QUERY: 0,
    };
    
    const agingBuckets = {
      lessThan7Days: 0,
      between7And14Days: 0,
      between14And30Days: 0,
      moreThan30Days: 0,
    };
    
    let openQueries = 0;
    let answeredQueries = 0;
    let closedQueries = 0;
    let cancelledQueries = 0;
    let overdueCount = 0;
    let totalResolutionDays = 0;
    let resolvedCount = 0;
    
    queryStates.forEach(qs => {
      const { query, ageInDays, isOverdue } = qs;
      
      // Count by status
      switch (query.status) {
        case 'OPEN':
          openQueries++;
          break;
        case 'ANSWERED':
          answeredQueries++;
          break;
        case 'CLOSED':
          closedQueries++;
          if (query.closedDate && query.openedDate) {
            totalResolutionDays += calculateQueryAge(query.openedDate);
            resolvedCount++;
          }
          break;
        case 'CANCELLED':
          cancelledQueries++;
          break;
      }
      
      // Count by type
      byType[query.queryType]++;
      
      // Aging buckets for open/answered queries
      if (query.status === 'OPEN' || query.status === 'ANSWERED') {
        const bucket = getAgingBucket(ageInDays);
        agingBuckets[bucket]++;
      }
      
      // Overdue count
      if (isOverdue) overdueCount++;
    });
    
    return {
      totalQueries: queryStates.length,
      openQueries,
      answeredQueries,
      closedQueries,
      cancelledQueries,
      averageResolutionDays: resolvedCount > 0 ? totalResolutionDays / resolvedCount : 0,
      overdueCount,
      byPriority,
      byType,
      agingBuckets,
    };
  },

  // -------------------------------------------------------------------------
  // Auto-close
  // -------------------------------------------------------------------------

  checkAutoClose: async (formInstanceId, fieldOID) => {
    const state = get();
    const closedIds: string[] = [];
    
    // Find queries for this field that are set to auto-close
    const queriesToCheck = Array.from(state.queries.values())
      .filter(qs => 
        qs.query.formInstanceId === formInstanceId &&
        qs.query.fieldOID === fieldOID &&
        qs.query.autoClosedOnChange &&
        qs.query.status === 'OPEN'
      );
    
    for (const qs of queriesToCheck) {
      await get().closeQuery(qs.query.id, 'Auto-closed on data change');
      closedIds.push(qs.query.id);
    }
    
    return closedIds;
  },

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  clearError: () => {
    set({ error: null });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectQueryById = (state: QueryStoreState, queryId: string): DataQuery | null => {
  return state.queries.get(queryId)?.query ?? null;
};

export const selectQueryState = (state: QueryStoreState, queryId: string): QueryState | null => {
  return state.queries.get(queryId) ?? null;
};

export const selectAllQueries = (state: QueryStoreState): DataQuery[] => {
  return Array.from(state.queries.values()).map(qs => qs.query);
};

export const selectQueriesByForm = (state: QueryStoreState, formInstanceId: string): DataQuery[] => {
  return Array.from(state.queries.values())
    .filter(qs => qs.query.formInstanceId === formInstanceId)
    .map(qs => qs.query);
};

export const selectQueriesByField = (state: QueryStoreState, formInstanceId: string, fieldOID: string): DataQuery[] => {
  return Array.from(state.queries.values())
    .filter(qs => qs.query.formInstanceId === formInstanceId && qs.query.fieldOID === fieldOID)
    .map(qs => qs.query);
};

export const selectOpenQueries = (state: QueryStoreState): DataQuery[] => {
  return Array.from(state.queries.values())
    .filter(qs => qs.query.status === 'OPEN')
    .map(qs => qs.query);
};

export const selectAnsweredQueries = (state: QueryStoreState): DataQuery[] => {
  return Array.from(state.queries.values())
    .filter(qs => qs.query.status === 'ANSWERED')
    .map(qs => qs.query);
};

export const selectOverdueQueries = (state: QueryStoreState): QueryState[] => {
  return Array.from(state.queries.values())
    .filter(qs => qs.isOverdue);
};

export const selectSelectedQueries = (state: QueryStoreState): DataQuery[] => {
  return Array.from(state.selectedQueryIds)
    .map(id => state.queries.get(id)?.query)
    .filter((q): q is DataQuery => q !== undefined);
};

export const selectFilteredQueries = (state: QueryStoreState): QueryState[] => {
  const { filters } = state;
  
  return Array.from(state.queries.values())
    .filter(qs => {
      const query = qs.query;
      
      if (filters.studyId) {
        // Would need form data to filter by study
      }
      if (filters.formInstanceId && query.formInstanceId !== filters.formInstanceId) return false;
      if (filters.status?.length && !filters.status.includes(query.status)) return false;
      if (filters.queryType?.length && !filters.queryType.includes(query.queryType)) return false;
      if (filters.openedBy && query.openedBy !== filters.openedBy) return false;
      if (filters.answeredBy && query.answeredBy !== filters.answeredBy) return false;
      if (filters.minAge !== undefined && qs.ageInDays < filters.minAge) return false;
      if (filters.maxAge !== undefined && qs.ageInDays > filters.maxAge) return false;
      if (filters.isOverdue !== undefined && qs.isOverdue !== filters.isOverdue) return false;
      if (filters.fieldOID && query.fieldOID !== filters.fieldOID) return false;
      
      return true;
    });
};

export const selectQueryResponses = (state: QueryStoreState, queryId: string): QueryResponse[] => {
  return state.queries.get(queryId)?.responses ?? [];
};

// ============================================================================
// Hooks
// ============================================================================

export const useQueryById = (queryId: string) => {
  return useQueryStore(useShallow(state => selectQueryById(state, queryId)));
};

export const useQueryState = (queryId: string) => {
  return useQueryStore(useShallow(state => selectQueryState(state, queryId)));
};

export const useAllQueries = () => {
  return useQueryStore(useShallow(selectAllQueries));
};

export const useQueriesByForm = (formInstanceId: string) => {
  return useQueryStore(useShallow(state => selectQueriesByForm(state, formInstanceId)));
};

export const useOpenQueries = () => {
  return useQueryStore(useShallow(selectOpenQueries));
};

export const useAnsweredQueries = () => {
  return useQueryStore(useShallow(selectAnsweredQueries));
};

export const useOverdueQueries = () => {
  return useQueryStore(useShallow(selectOverdueQueries));
};

export const useSelectedQueries = () => {
  return useQueryStore(useShallow(selectSelectedQueries));
};

export const useFilteredQueries = () => {
  return useQueryStore(useShallow(selectFilteredQueries));
};

export const useQueryResponses = (queryId: string) => {
  return useQueryStore(useShallow(state => selectQueryResponses(state, queryId)));
};

export const useQueryLoading = () => {
  return useQueryStore(useShallow(state => ({
    isLoading: state.isLoading,
    isLoadingQuery: state.isLoadingQuery,
    isSaving: state.isSaving,
  })));
};

export const useQueryError = () => {
  return useQueryStore(state => state.error);
};

export const useQueryFilters = () => {
  return useQueryStore(state => state.filters);
};

export const useQuerySelection = () => {
  return useQueryStore(useShallow(state => ({
    selectedIds: Array.from(state.selectedQueryIds),
    count: state.selectedQueryIds.size,
    selectQuery: state.selectQuery,
    deselectQuery: state.deselectQuery,
    selectAllQueries: state.selectAllQueries,
    clearSelection: state.clearSelection,
  })));
};
