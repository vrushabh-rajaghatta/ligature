
/**
 * Sample Management Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/sample-management/contracts
 * This file re-exports all types from the Sample Management domain for store compatibility,
 * plus store-specific state and action types.
 * 
 * @version 0.27.43
 */

// Re-export all types from Sample Management domain contracts
export {
  // Enums
  type StorageLocationType,
  type FreezerType,
  type FreezerStatus,
  type SampleType,
  type SampleStatus,
  type SampleQuality,
  type CustodyEventType,
  type RequestStatus,
  
  // Storage hierarchy
  type StorageSite,
  type Freezer,
  type StorageRack,
  type StorageBox,
  
  // Samples
  type Sample,
  
  // Chain of custody
  type ChainOfCustodyEvent,
  
  // Requests
  type SampleRequest,
  
  // Metrics
  type SampleInventorySummary,
  type StorageUtilization,
  
  // UI types
  type SampleManagementView,
  type SampleFilters,
  
  // Constants
  SAMPLE_TYPE_LABELS,
  SAMPLE_STATUS_LABELS,
  FREEZER_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  
  // Utilities
  isSampleAvailable,
  isSampleUsable,
  hasVolume,
  isFreezerOperational,
  calculateUtilization,
  generateSampleId,
  generateBarcode,
} from '@/domains/sample-management/contracts';

// Re-import types needed for store-specific types
import type {
  StorageSite,
  Freezer,
  StorageRack,
  StorageBox,
  Sample,
  ChainOfCustodyEvent,
  SampleRequest,
  SampleInventorySummary,
  StorageUtilization,
  SampleManagementView,
  SampleFilters,
  SampleStatus,
} from '@/domains/sample-management/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (not in domain contracts)
// =============================================================================

export interface SampleManagementState {
  // Storage hierarchy
  sites: Record<string, StorageSite>;
  freezers: Record<string, Freezer>;
  racks: Record<string, StorageRack>;
  boxes: Record<string, StorageBox>;
  
  // Samples
  samples: Record<string, Sample>;
  selectedSampleId: string | null;
  
  // Chain of custody
  custodyEvents: Record<string, ChainOfCustodyEvent[]>; // keyed by sampleId
  
  // Requests
  requests: Record<string, SampleRequest>;
  selectedRequestId: string | null;
  
  // UI State
  view: SampleManagementView;
  filters: SampleFilters;
  selectedSiteId: string | null;
  selectedFreezerId: string | null;
  
  // Loading
  isLoading: boolean;
  error: string | null;
}

export interface SampleManagementActions {
  // Storage management
  addSite: (site: Omit<StorageSite, 'id' | 'createdAt' | 'updatedAt'>) => StorageSite;
  updateSite: (id: string, updates: Partial<StorageSite>) => void;
  addFreezer: (freezer: Omit<Freezer, 'id' | 'createdAt' | 'updatedAt'>) => Freezer;
  updateFreezer: (id: string, updates: Partial<Freezer>) => void;
  addRack: (rack: Omit<StorageRack, 'id' | 'createdAt' | 'updatedAt'>) => StorageRack;
  addBox: (box: Omit<StorageBox, 'id' | 'createdAt' | 'updatedAt'>) => StorageBox;
  
  // Sample management
  receiveSample: (sample: Omit<Sample, 'id' | 'sampleId' | 'barcode' | 'status' | 'childSampleIds' | 'createdAt' | 'updatedAt'>) => Sample;
  updateSample: (id: string, updates: Partial<Sample>) => void;
  aliquotSample: (parentId: string, numberOfAliquots: number, volumePerAliquot: number) => Sample[];
  updateSampleStatus: (id: string, newStatus: SampleStatus, reason?: string) => void;
  transferSample: (id: string, toBoxId: string, toPosition: string) => void;
  disposeSample: (id: string, reason: string, disposedBy: string) => void;
  selectSample: (id: string | null) => void;
  
  // Chain of custody
  recordCustodyEvent: (sampleId: string, event: Omit<ChainOfCustodyEvent, 'id' | 'sampleId' | 'createdAt'>) => void;
  getCustodyHistory: (sampleId: string) => ChainOfCustodyEvent[];
  
  // Requests
  createRequest: (request: Omit<SampleRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>) => SampleRequest;
  approveRequest: (id: string, approverId: string, approverName: string) => void;
  rejectRequest: (id: string, approverId: string, approverName: string, reason: string) => void;
  fulfillRequest: (id: string, fulfilledBy: string) => void;
  selectRequest: (id: string | null) => void;
  
  // Queries
  getSamplesByStudy: (studyId: string) => Sample[];
  getSamplesBySubject: (subjectId: string) => Sample[];
  getSamplesByBox: (boxId: string) => Sample[];
  getSamplesByStatus: (status: SampleStatus) => Sample[];
  getInventorySummary: () => SampleInventorySummary;
  getStorageUtilization: () => StorageUtilization[];
  
  // UI
  setView: (view: SampleManagementView) => void;
  setFilters: (filters: Partial<SampleFilters>) => void;
  clearFilters: () => void;
  setSelectedSite: (id: string | null) => void;
  setSelectedFreezer: (id: string | null) => void;
  
  // Data loading
  loadMockData: () => void;
  resetStore: () => void;
}
