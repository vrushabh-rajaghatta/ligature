

/**
 * Batch Store
 * Zustand store for batch records and QC workflow
 * @version 0.21.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Batch,
  BatchStatus,
  BatchFilter,
  BatchSpecification,
  StorageCondition,
} from '@/types/lab-discovery';
import type {
  BatchStoreState,
  BatchStoreActions,
  BatchState,
  BatchCreationConfig,
  QCResultInput,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: BatchStoreState = {
  batches: new Map(),
  batchesByCompound: new Map(),
  isLoading: false,
  isLoadingBatch: null,
  error: null,
  filters: {},
  selectedBatchIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useBatchStore = create<BatchStoreState & BatchStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // CRUD Operations
      // ========================================================================

      loadBatches: async (filters?: BatchFilter) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadBatches/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadBatches/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load batches',
          }, false, 'loadBatches/error');
        }
      },

      loadBatch: async (batchId: string) => {
        set({ isLoadingBatch: batchId, error: null }, false, 'loadBatch/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const existingState = get().batches.get(batchId);
          if (existingState) {
            const updatedState: BatchState = {
              ...existingState,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newBatches = new Map(state.batches);
              newBatches.set(batchId, updatedState);
              return { batches: newBatches, isLoadingBatch: null };
            }, false, 'loadBatch/success');
          } else {
            set({ isLoadingBatch: null }, false, 'loadBatch/notFound');
          }
        } catch (error) {
          set({
            isLoadingBatch: null,
            error: error instanceof Error ? error.message : 'Failed to load batch',
          }, false, 'loadBatch/error');
        }
      },

      createBatch: async (config: BatchCreationConfig) => {
        set({ isLoading: true, error: null }, false, 'createBatch/start');
        
        try {
          const id = crypto.randomUUID();
          const now = new Date();
          
          const batch: Batch = {
            id,
            batchNumber: config.batchNumber,
            compoundId: config.compoundId,
            status: 'PLANNED',
            manufacturingDate: config.manufacturingDate,
            manufacturingSiteId: config.manufacturingSiteId,
            manufacturingMethod: config.manufacturingMethod,
            scaleType: config.scaleType,
            initialQuantity: config.initialQuantity,
            currentQuantity: config.initialQuantity,
            quantityUnit: config.quantityUnit,
            specifications: [],
            storageCondition: config.storageCondition,
            storageLocationId: config.storageLocationId,
            expiryDate: config.expiryDate,
            childBatchIds: [],
            sampleIds: [],
            createdAt: now,
            updatedAt: now,
            createdBy: config.createdBy,
          };
          
          const batchState: BatchState = {
            batch,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(id, batchState);
            
            // Update compound index
            const newByCompound = new Map(state.batchesByCompound);
            const compoundBatches = new Set(newByCompound.get(config.compoundId) || []);
            compoundBatches.add(id);
            newByCompound.set(config.compoundId, compoundBatches);
            
            return { batches: newBatches, batchesByCompound: newByCompound, isLoading: false };
          }, false, 'createBatch/success');
          
          return id;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create batch',
          }, false, 'createBatch/error');
          throw error;
        }
      },

      updateBatch: async (batchId: string, updates: Partial<Batch>) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'updateBatch/notFound');
          return;
        }
        
        set({ isLoadingBatch: batchId, error: null }, false, 'updateBatch/start');
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches, isLoadingBatch: null };
          }, false, 'updateBatch/success');
        } catch (error) {
          set({
            isLoadingBatch: null,
            error: error instanceof Error ? error.message : 'Failed to update batch',
          }, false, 'updateBatch/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateBatchStatus: async (batchId: string, status: BatchStatus, reason?: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'updateBatchStatus/notFound');
          return;
        }
        
        if (!isValidBatchStatusTransition(existingState.batch.status, status)) {
          set({
            error: `Invalid status transition from ${existingState.batch.status} to ${status}`,
          }, false, 'updateBatchStatus/invalidTransition');
          return;
        }
        
        set({ isLoadingBatch: batchId, error: null }, false, 'updateBatchStatus/start');
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            status,
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches, isLoadingBatch: null };
          }, false, 'updateBatchStatus/success');
        } catch (error) {
          set({
            isLoadingBatch: null,
            error: error instanceof Error ? error.message : 'Failed to update batch status',
          }, false, 'updateBatchStatus/error');
        }
      },

      // ========================================================================
      // QC Workflow
      // ========================================================================

      addSpecification: async (batchId: string, spec: Omit<BatchSpecification, 'id'>) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'addSpecification/notFound');
          return;
        }
        
        try {
          const newSpec: BatchSpecification = {
            ...spec,
            id: crypto.randomUUID(),
          };
          
          const updatedBatch: Batch = {
            ...existingState.batch,
            specifications: [...existingState.batch.specifications, newSpec],
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'addSpecification/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add specification',
          }, false, 'addSpecification/error');
        }
      },

      recordQCResult: async (batchId: string, specId: string, result: QCResultInput) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'recordQCResult/notFound');
          return;
        }
        
        const specIndex = existingState.batch.specifications.findIndex(s => s.id === specId);
        if (specIndex === -1) {
          set({ error: `Specification ${specId} not found` }, false, 'recordQCResult/specNotFound');
          return;
        }
        
        try {
          const now = new Date();
          const updatedSpecs = [...existingState.batch.specifications];
          updatedSpecs[specIndex] = {
            ...updatedSpecs[specIndex],
            result: result.result,
            resultValue: result.resultValue,
            resultUnit: result.resultUnit,
            status: result.status,
            testedAt: now,
            testedBy: result.testedBy,
          };
          
          const updatedBatch: Batch = {
            ...existingState.batch,
            specifications: updatedSpecs,
            updatedAt: now,
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'recordQCResult/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to record QC result',
          }, false, 'recordQCResult/error');
        }
      },

      startQC: async (batchId: string, performedBy: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'startQC/notFound');
          return;
        }
        
        if (existingState.batch.status !== 'QC_PENDING') {
          set({ error: 'Batch must be in QC_PENDING status to start QC' }, false, 'startQC/invalidStatus');
          return;
        }
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            status: 'QC_IN_PROGRESS',
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'startQC/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start QC',
          }, false, 'startQC/error');
        }
      },

      // ========================================================================
      // Release Workflow
      // ========================================================================

      releaseBatch: async (batchId: string, releasedBy: string, notes?: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'releaseBatch/notFound');
          return;
        }
        
        // Check all specs passed
        const allSpecsPassed = existingState.batch.specifications.every(
          spec => spec.status === 'PASS' || spec.status === 'NOT_TESTED'
        );
        const hasFailedSpecs = existingState.batch.specifications.some(spec => spec.status === 'FAIL');
        
        if (hasFailedSpecs) {
          set({ error: 'Cannot release batch with failed specifications' }, false, 'releaseBatch/hasFailures');
          return;
        }
        
        set({ isLoadingBatch: batchId, error: null }, false, 'releaseBatch/start');
        
        try {
          const now = new Date();
          const updatedBatch: Batch = {
            ...existingState.batch,
            status: 'RELEASED',
            releaseDate: now,
            releasedBy,
            notes: notes || existingState.batch.notes,
            updatedAt: now,
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches, isLoadingBatch: null };
          }, false, 'releaseBatch/success');
        } catch (error) {
          set({
            isLoadingBatch: null,
            error: error instanceof Error ? error.message : 'Failed to release batch',
          }, false, 'releaseBatch/error');
        }
      },

      rejectBatch: async (batchId: string, rejectedBy: string, reason: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'rejectBatch/notFound');
          return;
        }
        
        set({ isLoadingBatch: batchId, error: null }, false, 'rejectBatch/start');
        
        try {
          const now = new Date();
          const updatedBatch: Batch = {
            ...existingState.batch,
            status: 'REJECTED',
            notes: `Rejected by ${rejectedBy}: ${reason}`,
            updatedAt: now,
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches, isLoadingBatch: null };
          }, false, 'rejectBatch/success');
        } catch (error) {
          set({
            isLoadingBatch: null,
            error: error instanceof Error ? error.message : 'Failed to reject batch',
          }, false, 'rejectBatch/error');
        }
      },

      quarantineBatch: async (batchId: string, reason: string, performedBy: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'quarantineBatch/notFound');
          return;
        }
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            status: 'QUARANTINED',
            notes: `Quarantined by ${performedBy}: ${reason}`,
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'quarantineBatch/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to quarantine batch',
          }, false, 'quarantineBatch/error');
        }
      },

      // ========================================================================
      // Sample Linkage
      // ========================================================================

      linkSample: async (batchId: string, sampleId: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'linkSample/notFound');
          return;
        }
        
        if (existingState.batch.sampleIds.includes(sampleId)) {
          return; // Already linked
        }
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            sampleIds: [...existingState.batch.sampleIds, sampleId],
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'linkSample/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to link sample',
          }, false, 'linkSample/error');
        }
      },

      unlinkSample: async (batchId: string, sampleId: string) => {
        const existingState = get().batches.get(batchId);
        if (!existingState) {
          set({ error: `Batch ${batchId} not found` }, false, 'unlinkSample/notFound');
          return;
        }
        
        try {
          const updatedBatch: Batch = {
            ...existingState.batch,
            sampleIds: existingState.batch.sampleIds.filter(id => id !== sampleId),
            updatedAt: new Date(),
          };
          
          const updatedState: BatchState = {
            ...existingState,
            batch: updatedBatch,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, updatedState);
            return { batches: newBatches };
          }, false, 'unlinkSample/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to unlink sample',
          }, false, 'unlinkSample/error');
        }
      },

      // ========================================================================
      // Selection
      // ========================================================================

      selectBatch: (batchId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedBatchIds);
          newSelected.add(batchId);
          return { selectedBatchIds: newSelected };
        }, false, 'selectBatch');
      },

      deselectBatch: (batchId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedBatchIds);
          newSelected.delete(batchId);
          return { selectedBatchIds: newSelected };
        }, false, 'deselectBatch');
      },

      clearSelection: () => {
        set({ selectedBatchIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filtering
      // ========================================================================

      setFilters: (filters: BatchFilter) => {
        set({ filters }, false, 'setFilters');
      },

      clearFilters: () => {
        set({ filters: {} }, false, 'clearFilters');
      },

      // ========================================================================
      // Utilities
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'batch-store' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function isValidBatchStatusTransition(from: BatchStatus, to: BatchStatus): boolean {
  const validTransitions: Record<BatchStatus, BatchStatus[]> = {
    PLANNED: ['IN_PRODUCTION', 'QUARANTINED'],
    IN_PRODUCTION: ['QC_PENDING', 'QUARANTINED'],
    QC_PENDING: ['QC_IN_PROGRESS', 'QUARANTINED'],
    QC_IN_PROGRESS: ['RELEASED', 'REJECTED', 'QUARANTINED'],
    RELEASED: ['EXPIRED', 'QUARANTINED'],
    REJECTED: ['QUARANTINED'],
    QUARANTINED: ['QC_PENDING', 'REJECTED'],
    EXPIRED: [], // Terminal
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectAllBatches = (state: BatchStoreState): BatchState[] => {
  return Array.from(state.batches.values());
};

export const selectBatchById = (state: BatchStoreState, batchId: string): BatchState | null => {
  return state.batches.get(batchId) || null;
};

export const selectBatchesByCompound = (state: BatchStoreState, compoundId: string): BatchState[] => {
  const batchIds = state.batchesByCompound.get(compoundId);
  if (!batchIds) return [];
  return Array.from(batchIds).map(id => state.batches.get(id)).filter(Boolean) as BatchState[];
};

export const selectBatchesByStatus = (state: BatchStoreState, status: BatchStatus): BatchState[] => {
  return Array.from(state.batches.values()).filter(bs => bs.batch.status === status);
};

export const selectPendingQCBatches = (state: BatchStoreState): BatchState[] => {
  return Array.from(state.batches.values()).filter(
    bs => bs.batch.status === 'QC_PENDING' || bs.batch.status === 'QC_IN_PROGRESS'
  );
};

export const selectReleasedBatches = (state: BatchStoreState): BatchState[] => {
  return Array.from(state.batches.values()).filter(bs => bs.batch.status === 'RELEASED');
};

export const selectExpiringBatches = (state: BatchStoreState, daysAhead: number = 90): BatchState[] => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  
  return Array.from(state.batches.values()).filter(bs =>
    bs.batch.expiryDate &&
    bs.batch.expiryDate <= cutoff &&
    bs.batch.status === 'RELEASED'
  );
};

export const selectFilteredBatches = (state: BatchStoreState): BatchState[] => {
  const batches = Array.from(state.batches.values());
  const { filters } = state;
  
  return batches.filter(bs => {
    const batch = bs.batch;
    
    if (filters.status?.length && !filters.status.includes(batch.status)) return false;
    if (filters.compoundId && batch.compoundId !== filters.compoundId) return false;
    if (filters.manufacturingSiteId && batch.manufacturingSiteId !== filters.manufacturingSiteId) return false;
    if (filters.scaleType?.length && !filters.scaleType.includes(batch.scaleType)) return false;
    if (filters.releasedAfter && batch.releaseDate && batch.releaseDate < filters.releasedAfter) return false;
    if (filters.releasedBefore && batch.releaseDate && batch.releaseDate > filters.releasedBefore) return false;
    if (filters.expiringBefore && batch.expiryDate && batch.expiryDate > filters.expiringBefore) return false;
    
    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      if (!batch.batchNumber.toLowerCase().includes(term)) return false;
    }
    
    return true;
  });
};

export const selectBatchMetrics = (state: BatchStoreState) => {
  const batches = Array.from(state.batches.values());
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  
  return {
    total: batches.length,
    byStatus: batches.reduce((acc, bs) => {
      acc[bs.batch.status] = (acc[bs.batch.status] || 0) + 1;
      return acc;
    }, {} as Record<BatchStatus, number>),
    pendingQC: batches.filter(bs => bs.batch.status === 'QC_PENDING').length,
    inQC: batches.filter(bs => bs.batch.status === 'QC_IN_PROGRESS').length,
    released: batches.filter(bs => bs.batch.status === 'RELEASED').length,
    expiringSoon: batches.filter(bs =>
      bs.batch.expiryDate &&
      bs.batch.expiryDate <= ninetyDaysFromNow &&
      bs.batch.status === 'RELEASED'
    ).length,
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useAllBatches = () => useBatchStore(state => selectAllBatches(state));
export const useBatchById = (batchId: string) => useBatchStore(state => selectBatchById(state, batchId));
export const useBatchesByCompound = (compoundId: string) => useBatchStore(state => selectBatchesByCompound(state, compoundId));
export const useBatchesByStatus = (status: BatchStatus) => useBatchStore(state => selectBatchesByStatus(state, status));
export const usePendingQCBatches = () => useBatchStore(state => selectPendingQCBatches(state));
export const useReleasedBatches = () => useBatchStore(state => selectReleasedBatches(state));
export const useExpiringBatches = (daysAhead?: number) => useBatchStore(state => selectExpiringBatches(state, daysAhead));
export const useFilteredBatches = () => useBatchStore(state => selectFilteredBatches(state));
export const useBatchMetrics = () => useBatchStore(state => selectBatchMetrics(state));
export const useBatchLoading = () => useBatchStore(state => ({ isLoading: state.isLoading, isLoadingBatch: state.isLoadingBatch }));
export const useBatchError = () => useBatchStore(state => state.error);
export const useBatchFilters = () => useBatchStore(state => state.filters);
