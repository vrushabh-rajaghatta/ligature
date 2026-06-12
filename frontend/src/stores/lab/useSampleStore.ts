

/**
 * Sample Store
 * Zustand store for sample tracking and chain of custody
 * @version 0.21.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Sample,
  SampleStatus,
  SampleType,
  SampleFilter,
  CustodyEvent,
  CustodyEventType,
  StorageCondition,
  HazardClass,
} from '@/types/lab-discovery';
import type {
  SampleStoreState,
  SampleStoreActions,
  SampleState,
  SampleRegistrationConfig,
  AliquotConfig,
  CustodyEventInput,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: SampleStoreState = {
  samples: new Map(),
  samplesByLocation: new Map(),
  samplesByCompound: new Map(),
  samplesByBatch: new Map(),
  isLoading: false,
  isLoadingSample: null,
  error: null,
  filters: {},
  selectedSampleIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSampleStore = create<SampleStoreState & SampleStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // CRUD Operations
      // ========================================================================

      loadSamples: async (filters?: SampleFilter) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadSamples/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadSamples/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load samples',
          }, false, 'loadSamples/error');
        }
      },

      loadSample: async (sampleId: string) => {
        set({ isLoadingSample: sampleId, error: null }, false, 'loadSample/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const existingState = get().samples.get(sampleId);
          if (existingState) {
            const updatedState: SampleState = {
              ...existingState,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newSamples = new Map(state.samples);
              newSamples.set(sampleId, updatedState);
              return { samples: newSamples, isLoadingSample: null };
            }, false, 'loadSample/success');
          } else {
            set({ isLoadingSample: null }, false, 'loadSample/notFound');
          }
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to load sample',
          }, false, 'loadSample/error');
        }
      },

      registerSample: async (config: SampleRegistrationConfig) => {
        set({ isLoading: true, error: null }, false, 'registerSample/start');
        
        try {
          const id = crypto.randomUUID();
          const sampleId = generateSampleId();
          const now = new Date();
          
          // Create initial custody event
          const initialCustodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId: id,
            eventType: 'CREATED',
            timestamp: now,
            performedBy: config.registeredBy,
            toLocationId: config.storageLocationId,
            toLocationPath: config.locationPath,
            quantityAfter: config.initialQuantity,
            quantityUnit: config.quantityUnit,
            notes: `Sample registered via ${config.sourceType}`,
            attachmentIds: [],
          };
          
          const sample: Sample = {
            id,
            sampleId,
            barcode: sampleId,
            status: 'REGISTERED',
            type: config.type,
            compoundId: config.compoundId,
            batchId: config.batchId,
            parentSampleId: config.parentSampleId,
            sourceType: config.sourceType,
            initialQuantity: config.initialQuantity,
            currentQuantity: config.initialQuantity,
            quantityUnit: config.quantityUnit,
            concentration: config.concentration,
            concentrationUnit: config.concentrationUnit,
            physicalForm: config.physicalForm,
            containerType: config.containerType,
            storageCondition: config.storageCondition,
            storageLocationId: config.storageLocationId,
            locationPath: config.locationPath,
            qualityGrade: config.qualityGrade,
            registrationDate: now,
            expiryDate: config.expiryDate,
            hazardClasses: config.hazardClasses || [],
            projectId: config.projectId,
            experimentIds: [],
            requestIds: [],
            custodyHistory: [initialCustodyEvent],
            currentCustodian: config.registeredBy,
            attributes: {},
            createdAt: now,
            updatedAt: now,
            createdBy: config.registeredBy,
          };
          
          const sampleState: SampleState = {
            sample,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(id, sampleState);
            
            // Update location index
            const newByLocation = new Map(state.samplesByLocation);
            if (config.storageLocationId) {
              const locationSamples = new Set(newByLocation.get(config.storageLocationId) || []);
              locationSamples.add(id);
              newByLocation.set(config.storageLocationId, locationSamples);
            }
            
            // Update compound index
            const newByCompound = new Map(state.samplesByCompound);
            if (config.compoundId) {
              const compoundSamples = new Set(newByCompound.get(config.compoundId) || []);
              compoundSamples.add(id);
              newByCompound.set(config.compoundId, compoundSamples);
            }
            
            // Update batch index
            const newByBatch = new Map(state.samplesByBatch);
            if (config.batchId) {
              const batchSamples = new Set(newByBatch.get(config.batchId) || []);
              batchSamples.add(id);
              newByBatch.set(config.batchId, batchSamples);
            }
            
            return {
              samples: newSamples,
              samplesByLocation: newByLocation,
              samplesByCompound: newByCompound,
              samplesByBatch: newByBatch,
              isLoading: false,
            };
          }, false, 'registerSample/success');
          
          return id;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to register sample',
          }, false, 'registerSample/error');
          throw error;
        }
      },

      updateSample: async (sampleId: string, updates: Partial<Sample>) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'updateSample/notFound');
          return;
        }
        
        set({ isLoadingSample: sampleId, error: null }, false, 'updateSample/start');
        
        try {
          const updatedSample: Sample = {
            ...existingState.sample,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples, isLoadingSample: null };
          }, false, 'updateSample/success');
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to update sample',
          }, false, 'updateSample/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateSampleStatus: async (sampleId: string, status: SampleStatus, reason?: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'updateSampleStatus/notFound');
          return;
        }
        
        if (!isValidSampleStatusTransition(existingState.sample.status, status)) {
          set({
            error: `Invalid status transition from ${existingState.sample.status} to ${status}`,
          }, false, 'updateSampleStatus/invalidTransition');
          return;
        }
        
        set({ isLoadingSample: sampleId, error: null }, false, 'updateSampleStatus/start');
        
        try {
          const now = new Date();
          const updatedSample: Sample = {
            ...existingState.sample,
            status,
            updatedAt: now,
          };
          
          // Set disposal date if disposed
          if (status === 'DISPOSED') {
            updatedSample.disposedAt = now;
          }
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples, isLoadingSample: null };
          }, false, 'updateSampleStatus/success');
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to update sample status',
          }, false, 'updateSampleStatus/error');
        }
      },

      // ========================================================================
      // Location & Transfer
      // ========================================================================

      transferSample: async (sampleId: string, toLocationId: string, performedBy: string, notes?: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'transferSample/notFound');
          return;
        }
        
        set({ isLoadingSample: sampleId, error: null }, false, 'transferSample/start');
        
        try {
          const now = new Date();
          const fromLocationId = existingState.sample.storageLocationId;
          
          // Create custody event
          const custodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: 'TRANSFERRED',
            timestamp: now,
            performedBy,
            fromLocationId,
            toLocationId,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: existingState.sample.currentQuantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes,
            attachmentIds: [],
          };
          
          const updatedSample: Sample = {
            ...existingState.sample,
            storageLocationId: toLocationId,
            custodyHistory: [...existingState.sample.custodyHistory, custodyEvent],
            lastAccessedAt: now,
            updatedAt: now,
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            
            // Update location indices
            const newByLocation = new Map(state.samplesByLocation);
            
            // Remove from old location
            if (fromLocationId) {
              const oldLocationSamples = new Set(newByLocation.get(fromLocationId) || []);
              oldLocationSamples.delete(sampleId);
              if (oldLocationSamples.size === 0) {
                newByLocation.delete(fromLocationId);
              } else {
                newByLocation.set(fromLocationId, oldLocationSamples);
              }
            }
            
            // Add to new location
            const newLocationSamples = new Set(newByLocation.get(toLocationId) || []);
            newLocationSamples.add(sampleId);
            newByLocation.set(toLocationId, newLocationSamples);
            
            return { samples: newSamples, samplesByLocation: newByLocation, isLoadingSample: null };
          }, false, 'transferSample/success');
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to transfer sample',
          }, false, 'transferSample/error');
        }
      },

      updateLocation: async (sampleId: string, locationId: string, locationPath?: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'updateLocation/notFound');
          return;
        }
        
        try {
          const updatedSample: Sample = {
            ...existingState.sample,
            storageLocationId: locationId,
            locationPath,
            updatedAt: new Date(),
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples };
          }, false, 'updateLocation/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update location',
          }, false, 'updateLocation/error');
        }
      },

      // ========================================================================
      // Quantity Management
      // ========================================================================

      aliquotSample: async (sampleId: string, config: AliquotConfig) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'aliquotSample/notFound');
          throw new Error(`Sample ${sampleId} not found`);
        }
        
        if (existingState.sample.currentQuantity < config.quantity) {
          set({ error: 'Insufficient quantity for aliquot' }, false, 'aliquotSample/insufficientQuantity');
          throw new Error('Insufficient quantity for aliquot');
        }
        
        set({ isLoadingSample: sampleId, error: null }, false, 'aliquotSample/start');
        
        try {
          const now = new Date();
          const aliquotId = crypto.randomUUID();
          const aliquotSampleId = generateSampleId();
          
          // Create aliquot custody event for parent
          const parentCustodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: 'ALIQUOTED',
            timestamp: now,
            performedBy: config.performedBy,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: existingState.sample.currentQuantity - config.quantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes: `Aliquot created: ${aliquotSampleId}. ${config.notes || ''}`.trim(),
            attachmentIds: [],
          };
          
          // Update parent sample
          const updatedParentSample: Sample = {
            ...existingState.sample,
            currentQuantity: existingState.sample.currentQuantity - config.quantity,
            custodyHistory: [...existingState.sample.custodyHistory, parentCustodyEvent],
            lastAccessedAt: now,
            updatedAt: now,
          };
          
          // Create aliquot custody event
          const aliquotCustodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId: aliquotId,
            eventType: 'CREATED',
            timestamp: now,
            performedBy: config.performedBy,
            toLocationId: config.storageLocationId,
            toLocationPath: config.locationPath,
            quantityAfter: config.quantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes: `Aliquot from parent sample: ${existingState.sample.sampleId}`,
            attachmentIds: [],
          };
          
          // Create aliquot sample
          const aliquotSample: Sample = {
            id: aliquotId,
            sampleId: aliquotSampleId,
            barcode: aliquotSampleId,
            status: 'REGISTERED',
            type: existingState.sample.type,
            compoundId: existingState.sample.compoundId,
            batchId: existingState.sample.batchId,
            parentSampleId: sampleId,
            sourceType: 'ALIQUOT',
            initialQuantity: config.quantity,
            currentQuantity: config.quantity,
            quantityUnit: existingState.sample.quantityUnit,
            concentration: existingState.sample.concentration,
            concentrationUnit: existingState.sample.concentrationUnit,
            physicalForm: existingState.sample.physicalForm,
            containerType: config.containerType,
            storageCondition: existingState.sample.storageCondition,
            storageLocationId: config.storageLocationId,
            locationPath: config.locationPath,
            qualityGrade: existingState.sample.qualityGrade,
            registrationDate: now,
            expiryDate: existingState.sample.expiryDate,
            hazardClasses: existingState.sample.hazardClasses,
            projectId: existingState.sample.projectId,
            experimentIds: [],
            requestIds: [],
            custodyHistory: [aliquotCustodyEvent],
            currentCustodian: config.performedBy,
            attributes: {},
            createdAt: now,
            updatedAt: now,
            createdBy: config.performedBy,
          };
          
          const updatedParentState: SampleState = {
            ...existingState,
            sample: updatedParentSample,
            lastSyncedAt: now,
          };
          
          const aliquotState: SampleState = {
            sample: aliquotSample,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedParentState);
            newSamples.set(aliquotId, aliquotState);
            
            // Update indices
            const newByLocation = new Map(state.samplesByLocation);
            if (config.storageLocationId) {
              const locationSamples = new Set(newByLocation.get(config.storageLocationId) || []);
              locationSamples.add(aliquotId);
              newByLocation.set(config.storageLocationId, locationSamples);
            }
            
            const newByCompound = new Map(state.samplesByCompound);
            if (aliquotSample.compoundId) {
              const compoundSamples = new Set(newByCompound.get(aliquotSample.compoundId) || []);
              compoundSamples.add(aliquotId);
              newByCompound.set(aliquotSample.compoundId, compoundSamples);
            }
            
            const newByBatch = new Map(state.samplesByBatch);
            if (aliquotSample.batchId) {
              const batchSamples = new Set(newByBatch.get(aliquotSample.batchId) || []);
              batchSamples.add(aliquotId);
              newByBatch.set(aliquotSample.batchId, batchSamples);
            }
            
            return {
              samples: newSamples,
              samplesByLocation: newByLocation,
              samplesByCompound: newByCompound,
              samplesByBatch: newByBatch,
              isLoadingSample: null,
            };
          }, false, 'aliquotSample/success');
          
          return aliquotId;
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to create aliquot',
          }, false, 'aliquotSample/error');
          throw error;
        }
      },

      consumeSample: async (sampleId: string, quantity: number, reason: string, performedBy: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'consumeSample/notFound');
          return;
        }
        
        if (existingState.sample.currentQuantity < quantity) {
          set({ error: 'Insufficient quantity' }, false, 'consumeSample/insufficientQuantity');
          return;
        }
        
        try {
          const now = new Date();
          const newQuantity = existingState.sample.currentQuantity - quantity;
          
          const custodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: 'TESTED',
            timestamp: now,
            performedBy,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: newQuantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes: reason,
            attachmentIds: [],
          };
          
          const updatedSample: Sample = {
            ...existingState.sample,
            currentQuantity: newQuantity,
            status: newQuantity === 0 ? 'CONSUMED' : existingState.sample.status,
            custodyHistory: [...existingState.sample.custodyHistory, custodyEvent],
            lastAccessedAt: now,
            updatedAt: now,
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples };
          }, false, 'consumeSample/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to consume sample',
          }, false, 'consumeSample/error');
        }
      },

      adjustQuantity: async (sampleId: string, newQuantity: number, reason: string, performedBy: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'adjustQuantity/notFound');
          return;
        }
        
        try {
          const now = new Date();
          const quantityChange = newQuantity - existingState.sample.currentQuantity;
          
          const custodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: quantityChange > 0 ? 'RECEIVED' : 'TESTED',
            timestamp: now,
            performedBy,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: newQuantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes: `Quantity adjustment: ${reason}`,
            attachmentIds: [],
          };
          
          const updatedSample: Sample = {
            ...existingState.sample,
            currentQuantity: newQuantity,
            custodyHistory: [...existingState.sample.custodyHistory, custodyEvent],
            updatedAt: now,
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples };
          }, false, 'adjustQuantity/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to adjust quantity',
          }, false, 'adjustQuantity/error');
        }
      },

      // ========================================================================
      // Chain of Custody
      // ========================================================================

      recordCustodyEvent: async (sampleId: string, event: CustodyEventInput) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'recordCustodyEvent/notFound');
          return;
        }
        
        try {
          const now = new Date();
          const custodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: event.eventType,
            timestamp: now,
            performedBy: event.performedBy,
            witnessedBy: event.witnessedBy,
            fromLocationId: event.fromLocation,
            toLocationId: event.toLocation,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: event.quantity ?? existingState.sample.currentQuantity,
            quantityUnit: existingState.sample.quantityUnit,
            notes: event.notes,
            attachmentIds: [],
          };
          
          const updatedSample: Sample = {
            ...existingState.sample,
            custodyHistory: [...existingState.sample.custodyHistory, custodyEvent],
            currentCustodian: event.performedBy,
            lastAccessedAt: new Date(),
            updatedAt: new Date(),
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            return { samples: newSamples };
          }, false, 'recordCustodyEvent/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to record custody event',
          }, false, 'recordCustodyEvent/error');
        }
      },

      getCustodyHistory: (sampleId: string) => {
        const sampleState = get().samples.get(sampleId);
        return sampleState?.sample.custodyHistory || [];
      },

      // ========================================================================
      // Disposal
      // ========================================================================

      disposeSample: async (sampleId: string, reason: string, performedBy: string, witnessedBy?: string) => {
        const existingState = get().samples.get(sampleId);
        if (!existingState) {
          set({ error: `Sample ${sampleId} not found` }, false, 'disposeSample/notFound');
          return;
        }
        
        set({ isLoadingSample: sampleId, error: null }, false, 'disposeSample/start');
        
        try {
          const now = new Date();
          
          const custodyEvent: CustodyEvent = {
            id: crypto.randomUUID(),
            sampleId,
            eventType: 'DISPOSED',
            timestamp: now,
            performedBy,
            witnessedBy,
            quantityBefore: existingState.sample.currentQuantity,
            quantityAfter: 0,
            quantityUnit: existingState.sample.quantityUnit,
            notes: reason,
            attachmentIds: [],
          };
          
          const updatedSample: Sample = {
            ...existingState.sample,
            status: 'DISPOSED',
            currentQuantity: 0,
            disposedAt: now,
            custodyHistory: [...existingState.sample.custodyHistory, custodyEvent],
            updatedAt: now,
          };
          
          const updatedState: SampleState = {
            ...existingState,
            sample: updatedSample,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newSamples = new Map(state.samples);
            newSamples.set(sampleId, updatedState);
            
            // Remove from location index
            const newByLocation = new Map(state.samplesByLocation);
            if (existingState.sample.storageLocationId) {
              const locationSamples = new Set(newByLocation.get(existingState.sample.storageLocationId) || []);
              locationSamples.delete(sampleId);
              if (locationSamples.size === 0) {
                newByLocation.delete(existingState.sample.storageLocationId);
              } else {
                newByLocation.set(existingState.sample.storageLocationId, locationSamples);
              }
            }
            
            return { samples: newSamples, samplesByLocation: newByLocation, isLoadingSample: null };
          }, false, 'disposeSample/success');
        } catch (error) {
          set({
            isLoadingSample: null,
            error: error instanceof Error ? error.message : 'Failed to dispose sample',
          }, false, 'disposeSample/error');
        }
      },

      // ========================================================================
      // Selection
      // ========================================================================

      selectSample: (sampleId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSampleIds);
          newSelected.add(sampleId);
          return { selectedSampleIds: newSelected };
        }, false, 'selectSample');
      },

      deselectSample: (sampleId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedSampleIds);
          newSelected.delete(sampleId);
          return { selectedSampleIds: newSelected };
        }, false, 'deselectSample');
      },

      selectAllSamples: () => {
        set(state => {
          const allIds = new Set(state.samples.keys());
          return { selectedSampleIds: allIds };
        }, false, 'selectAllSamples');
      },

      clearSelection: () => {
        set({ selectedSampleIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filtering
      // ========================================================================

      setFilters: (filters: SampleFilter) => {
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
    { name: 'sample-store' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function generateSampleId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAM-${timestamp}-${random}`;
}

function isValidSampleStatusTransition(from: SampleStatus, to: SampleStatus): boolean {
  const validTransitions: Record<SampleStatus, SampleStatus[]> = {
    REGISTERED: ['IN_STORAGE', 'IN_USE', 'QUARANTINED', 'DISPOSED'],
    IN_STORAGE: ['IN_USE', 'EXPIRED', 'DISPOSED', 'QUARANTINED', 'LOST'],
    IN_USE: ['IN_STORAGE', 'CONSUMED', 'DISPOSED', 'QUARANTINED'],
    CONSUMED: [], // Terminal
    EXPIRED: ['DISPOSED'],
    DISPOSED: [], // Terminal
    QUARANTINED: ['IN_STORAGE', 'DISPOSED'],
    LOST: [], // Terminal
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectAllSamples = (state: SampleStoreState): SampleState[] => {
  return Array.from(state.samples.values());
};

export const selectSampleById = (state: SampleStoreState, sampleId: string): SampleState | null => {
  return state.samples.get(sampleId) || null;
};

export const selectSamplesByLocation = (state: SampleStoreState, locationId: string): SampleState[] => {
  const sampleIds = state.samplesByLocation.get(locationId);
  if (!sampleIds) return [];
  return Array.from(sampleIds).map(id => state.samples.get(id)).filter(Boolean) as SampleState[];
};

export const selectSamplesByCompound = (state: SampleStoreState, compoundId: string): SampleState[] => {
  const sampleIds = state.samplesByCompound.get(compoundId);
  if (!sampleIds) return [];
  return Array.from(sampleIds).map(id => state.samples.get(id)).filter(Boolean) as SampleState[];
};

export const selectSamplesByBatch = (state: SampleStoreState, batchId: string): SampleState[] => {
  const sampleIds = state.samplesByBatch.get(batchId);
  if (!sampleIds) return [];
  return Array.from(sampleIds).map(id => state.samples.get(id)).filter(Boolean) as SampleState[];
};

export const selectSamplesByStatus = (state: SampleStoreState, status: SampleStatus): SampleState[] => {
  return Array.from(state.samples.values()).filter(ss => ss.sample.status === status);
};

export const selectExpiringSamples = (state: SampleStoreState, daysAhead: number = 30): SampleState[] => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  
  return Array.from(state.samples.values()).filter(ss => 
    ss.sample.expiryDate && 
    ss.sample.expiryDate <= cutoff &&
    !['CONSUMED', 'DISPOSED', 'EXPIRED'].includes(ss.sample.status)
  );
};

export const selectFilteredSamples = (state: SampleStoreState): SampleState[] => {
  const samples = Array.from(state.samples.values());
  const { filters } = state;
  
  return samples.filter(ss => {
    const sample = ss.sample;
    
    if (filters.status?.length && !filters.status.includes(sample.status)) return false;
    if (filters.type?.length && !filters.type.includes(sample.type)) return false;
    if (filters.compoundId && sample.compoundId !== filters.compoundId) return false;
    if (filters.batchId && sample.batchId !== filters.batchId) return false;
    if (filters.laboratoryId && sample.storageLocationId !== filters.laboratoryId) return false;
    if (filters.storageLocationId && sample.storageLocationId !== filters.storageLocationId) return false;
    if (filters.storageCondition?.length && !filters.storageCondition.includes(sample.storageCondition)) return false;
    if (filters.hazardClasses?.length && !sample.hazardClasses.some(h => filters.hazardClasses!.includes(h))) return false;
    if (filters.expiringBefore && sample.expiryDate && sample.expiryDate > filters.expiringBefore) return false;
    if (filters.projectId && sample.projectId !== filters.projectId) return false;
    if (filters.qualityGrade?.length && sample.qualityGrade && !filters.qualityGrade.includes(sample.qualityGrade)) return false;
    
    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      const searchable = [sample.sampleId, sample.barcode].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(term)) return false;
    }
    
    return true;
  });
};

export const selectSampleMetrics = (state: SampleStoreState) => {
  const samples = Array.from(state.samples.values());
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return {
    total: samples.length,
    byStatus: samples.reduce((acc, ss) => {
      acc[ss.sample.status] = (acc[ss.sample.status] || 0) + 1;
      return acc;
    }, {} as Record<SampleStatus, number>),
    byType: samples.reduce((acc, ss) => {
      acc[ss.sample.type] = (acc[ss.sample.type] || 0) + 1;
      return acc;
    }, {} as Record<SampleType, number>),
    expiringSoon: samples.filter(ss => 
      ss.sample.expiryDate && 
      ss.sample.expiryDate <= thirtyDaysFromNow &&
      !['CONSUMED', 'DISPOSED', 'EXPIRED'].includes(ss.sample.status)
    ).length,
    inStorage: samples.filter(ss => ss.sample.status === 'IN_STORAGE').length,
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useAllSamples = () => useSampleStore(state => selectAllSamples(state));
export const useSampleById = (sampleId: string) => useSampleStore(state => selectSampleById(state, sampleId));
export const useSamplesByLocation = (locationId: string) => useSampleStore(state => selectSamplesByLocation(state, locationId));
export const useSamplesByCompound = (compoundId: string) => useSampleStore(state => selectSamplesByCompound(state, compoundId));
export const useSamplesByBatch = (batchId: string) => useSampleStore(state => selectSamplesByBatch(state, batchId));
export const useSamplesByStatus = (status: SampleStatus) => useSampleStore(state => selectSamplesByStatus(state, status));
export const useExpiringSamples = (daysAhead?: number) => useSampleStore(state => selectExpiringSamples(state, daysAhead));
export const useFilteredSamples = () => useSampleStore(state => selectFilteredSamples(state));
export const useSampleMetrics = () => useSampleStore(state => selectSampleMetrics(state));
export const useSampleLoading = () => useSampleStore(state => ({ isLoading: state.isLoading, isLoadingSample: state.isLoadingSample }));
export const useSampleError = () => useSampleStore(state => state.error);
export const useSampleFilters = () => useSampleStore(state => state.filters);
