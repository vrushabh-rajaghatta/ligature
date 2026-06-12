

// ============================================================================
// Sample Management Store - v0.13.63
// ============================================================================
// Zustand store for sample library management with:
// - Full CRUD for storage hierarchy and samples
// - Chain of custody tracking (Part 11 compliant)
// - Aliquoting with parent/child relationships
// - CTMS linkage for study/subject/visit
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  StorageSite, Freezer, StorageRack, StorageBox,
  Sample, SampleType, SampleStatus, SampleQuality,
  ChainOfCustodyEvent, CustodyEventType,
  SampleRequest, RequestStatus,
  SampleManagementState, SampleManagementView, SampleFilters,
  SampleInventorySummary, StorageUtilization,
} from './sampleManagementTypes';

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string) => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateSampleId = () => {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `LIG-${year}-${seq}`;
};

const generateBarcode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let barcode = '';
  for (let i = 0; i < 12; i++) {
    barcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return barcode;
};

const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `REQ-${year}-${seq}`;
};

const now = () => new Date().toISOString();

const createInitialFilters = (): SampleFilters => ({
  status: 'all',
  type: 'all',
  studyId: 'all',
  siteId: 'all',
  quality: 'all',
  dateRange: null,
  searchQuery: '',
});

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SampleManagementState = {
  sites: {},
  freezers: {},
  racks: {},
  boxes: {},
  samples: {},
  selectedSampleId: null,
  custodyEvents: {},
  requests: {},
  selectedRequestId: null,
  view: 'inventory',
  filters: createInitialFilters(),
  selectedSiteId: null,
  selectedFreezerId: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// STORE TYPE
// ============================================================================

interface SampleManagementStore extends SampleManagementState {
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

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useSampleManagementStore = create<SampleManagementStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // STORAGE MANAGEMENT
      // ========================================================================

      addSite: (siteData) => {
        const id = generateId('site');
        const timestamp = now();
        const site: StorageSite = {
          ...siteData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          sites: { ...state.sites, [id]: site },
        }));
        return site;
      },

      updateSite: (id, updates) => {
        set((state) => ({
          sites: {
            ...state.sites,
            [id]: { ...state.sites[id], ...updates, updatedAt: now() },
          },
        }));
      },

      addFreezer: (freezerData) => {
        const id = generateId('fzr');
        const timestamp = now();
        const freezer: Freezer = {
          ...freezerData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          freezers: { ...state.freezers, [id]: freezer },
        }));
        return freezer;
      },

      updateFreezer: (id, updates) => {
        set((state) => ({
          freezers: {
            ...state.freezers,
            [id]: { ...state.freezers[id], ...updates, updatedAt: now() },
          },
        }));
      },

      addRack: (rackData) => {
        const id = generateId('rack');
        const timestamp = now();
        const rack: StorageRack = {
          ...rackData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          racks: { ...state.racks, [id]: rack },
        }));
        return rack;
      },

      addBox: (boxData) => {
        const id = generateId('box');
        const timestamp = now();
        const box: StorageBox = {
          ...boxData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          boxes: { ...state.boxes, [id]: box },
        }));
        return box;
      },

      // ========================================================================
      // SAMPLE MANAGEMENT
      // ========================================================================

      receiveSample: (sampleData) => {
        const id = generateId('smp');
        const timestamp = now();
        const sample: Sample = {
          ...sampleData,
          id,
          sampleId: generateSampleId(),
          barcode: generateBarcode(),
          status: 'received',
          childSampleIds: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        // Record chain of custody event
        const custodyEvent: ChainOfCustodyEvent = {
          id: generateId('coc'),
          sampleId: id,
          eventType: 'received',
          performedBy: sampleData.collectedBy,
          performedByName: sampleData.collectedBy,
          performedAt: timestamp,
          toStatus: 'received',
          notes: `Sample received from ${sampleData.siteName}`,
          createdAt: timestamp,
        };

        set((state) => ({
          samples: { ...state.samples, [id]: sample },
          custodyEvents: {
            ...state.custodyEvents,
            [id]: [...(state.custodyEvents[id] || []), custodyEvent],
          },
        }));

        return sample;
      },

      updateSample: (id, updates) => {
        set((state) => ({
          samples: {
            ...state.samples,
            [id]: { ...state.samples[id], ...updates, updatedAt: now() },
          },
        }));
      },

      aliquotSample: (parentId, numberOfAliquots, volumePerAliquot) => {
        const state = get();
        const parent = state.samples[parentId];
        if (!parent) return [];

        const totalVolumeNeeded = numberOfAliquots * volumePerAliquot;
        if (totalVolumeNeeded > parent.currentVolume) {
          console.warn('Insufficient volume for aliquoting');
          return [];
        }

        const timestamp = now();
        const aliquots: Sample[] = [];
        const childIds: string[] = [];

        for (let i = 0; i < numberOfAliquots; i++) {
          const id = generateId('smp');
          const aliquot: Sample = {
            ...parent,
            id,
            sampleId: generateSampleId(),
            barcode: generateBarcode(),
            status: 'in-storage',
            parentSampleId: parentId,
            childSampleIds: [],
            aliquotNumber: i + 1,
            initialVolume: volumePerAliquot,
            currentVolume: volumePerAliquot,
            storagePosition: '', // Will need to be assigned
            storedAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          aliquots.push(aliquot);
          childIds.push(id);
        }

        // Update parent with reduced volume and child references
        const updatedParent: Sample = {
          ...parent,
          currentVolume: parent.currentVolume - totalVolumeNeeded,
          status: parent.currentVolume - totalVolumeNeeded <= 0 ? 'depleted' : 'aliquoted',
          childSampleIds: [...parent.childSampleIds, ...childIds],
          updatedAt: timestamp,
        };

        // Record custody events
        const parentEvent: ChainOfCustodyEvent = {
          id: generateId('coc'),
          sampleId: parentId,
          eventType: 'aliquoted',
          performedBy: 'system',
          performedByName: 'System',
          performedAt: timestamp,
          notes: `Created ${numberOfAliquots} aliquots of ${volumePerAliquot}${parent.volumeUnit} each`,
          createdAt: timestamp,
        };

        set((state) => {
          const newSamples = { ...state.samples, [parentId]: updatedParent };
          const newCustodyEvents = { ...state.custodyEvents };
          
          aliquots.forEach((aliquot) => {
            newSamples[aliquot.id] = aliquot;
            newCustodyEvents[aliquot.id] = [{
              id: generateId('coc'),
              sampleId: aliquot.id,
              eventType: 'received',
              performedBy: 'system',
              performedByName: 'System',
              performedAt: timestamp,
              toStatus: 'in-storage',
              notes: `Aliquot ${aliquot.aliquotNumber} created from parent ${parent.sampleId}`,
              createdAt: timestamp,
            }];
          });

          newCustodyEvents[parentId] = [...(newCustodyEvents[parentId] || []), parentEvent];

          return { samples: newSamples, custodyEvents: newCustodyEvents };
        });

        return aliquots;
      },

      updateSampleStatus: (id, newStatus, reason) => {
        const state = get();
        const sample = state.samples[id];
        if (!sample) return;

        const timestamp = now();
        const event: ChainOfCustodyEvent = {
          id: generateId('coc'),
          sampleId: id,
          eventType: 'status-change',
          performedBy: 'system',
          performedByName: 'System',
          performedAt: timestamp,
          fromStatus: sample.status,
          toStatus: newStatus,
          reason,
          createdAt: timestamp,
        };

        set((state) => ({
          samples: {
            ...state.samples,
            [id]: { ...state.samples[id], status: newStatus, updatedAt: timestamp },
          },
          custodyEvents: {
            ...state.custodyEvents,
            [id]: [...(state.custodyEvents[id] || []), event],
          },
        }));
      },

      transferSample: (id, toBoxId, toPosition) => {
        const state = get();
        const sample = state.samples[id];
        if (!sample) return;

        const fromBox = state.boxes[sample.storageLocationId];
        const toBox = state.boxes[toBoxId];
        const timestamp = now();

        const event: ChainOfCustodyEvent = {
          id: generateId('coc'),
          sampleId: id,
          eventType: 'location-change',
          performedBy: 'system',
          performedByName: 'System',
          performedAt: timestamp,
          fromLocation: fromBox ? `${fromBox.code}/${sample.storagePosition}` : sample.storagePosition,
          toLocation: toBox ? `${toBox.code}/${toPosition}` : toPosition,
          notes: `Sample transferred to new location`,
          createdAt: timestamp,
        };

        set((state) => ({
          samples: {
            ...state.samples,
            [id]: {
              ...state.samples[id],
              storageLocationId: toBoxId,
              storagePosition: toPosition,
              updatedAt: timestamp,
            },
          },
          custodyEvents: {
            ...state.custodyEvents,
            [id]: [...(state.custodyEvents[id] || []), event],
          },
        }));
      },

      disposeSample: (id, reason, disposedBy) => {
        const timestamp = now();

        const event: ChainOfCustodyEvent = {
          id: generateId('coc'),
          sampleId: id,
          eventType: 'disposed',
          performedBy: disposedBy,
          performedByName: disposedBy,
          performedAt: timestamp,
          fromStatus: get().samples[id]?.status,
          toStatus: 'disposed',
          reason,
          createdAt: timestamp,
        };

        set((state) => ({
          samples: {
            ...state.samples,
            [id]: {
              ...state.samples[id],
              status: 'disposed',
              disposedAt: timestamp,
              disposalReason: reason,
              disposedBy,
              updatedAt: timestamp,
            },
          },
          custodyEvents: {
            ...state.custodyEvents,
            [id]: [...(state.custodyEvents[id] || []), event],
          },
        }));
      },

      selectSample: (id) => {
        set({ selectedSampleId: id });
      },

      // ========================================================================
      // CHAIN OF CUSTODY
      // ========================================================================

      recordCustodyEvent: (sampleId, eventData) => {
        const event: ChainOfCustodyEvent = {
          ...eventData,
          id: generateId('coc'),
          sampleId,
          createdAt: now(),
        };

        set((state) => ({
          custodyEvents: {
            ...state.custodyEvents,
            [sampleId]: [...(state.custodyEvents[sampleId] || []), event],
          },
        }));
      },

      getCustodyHistory: (sampleId) => {
        return get().custodyEvents[sampleId] || [];
      },

      // ========================================================================
      // REQUESTS
      // ========================================================================

      createRequest: (requestData) => {
        const id = generateId('req');
        const timestamp = now();
        const request: SampleRequest = {
          ...requestData,
          id,
          requestNumber: generateRequestNumber(),
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          requests: { ...state.requests, [id]: request },
        }));

        return request;
      },

      approveRequest: (id, approverId, approverName) => {
        const timestamp = now();
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: {
              ...state.requests[id],
              status: 'approved',
              approvedBy: approverId,
              approvedByName: approverName,
              approvedAt: timestamp,
              updatedAt: timestamp,
            },
          },
        }));
      },

      rejectRequest: (id, approverId, approverName, reason) => {
        const timestamp = now();
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: {
              ...state.requests[id],
              status: 'rejected',
              approvedBy: approverId,
              approvedByName: approverName,
              approvedAt: timestamp,
              rejectionReason: reason,
              updatedAt: timestamp,
            },
          },
        }));
      },

      fulfillRequest: (id, fulfilledBy) => {
        const timestamp = now();
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: {
              ...state.requests[id],
              status: 'fulfilled',
              fulfilledAt: timestamp,
              fulfilledBy,
              updatedAt: timestamp,
            },
          },
        }));
      },

      selectRequest: (id) => {
        set({ selectedRequestId: id });
      },

      // ========================================================================
      // QUERIES
      // ========================================================================

      getSamplesByStudy: (studyId) => {
        return Object.values(get().samples).filter((s) => s.studyId === studyId);
      },

      getSamplesBySubject: (subjectId) => {
        return Object.values(get().samples).filter((s) => s.subjectId === subjectId);
      },

      getSamplesByBox: (boxId) => {
        return Object.values(get().samples).filter((s) => s.storageLocationId === boxId);
      },

      getSamplesByStatus: (status) => {
        return Object.values(get().samples).filter((s) => s.status === status);
      },

      getInventorySummary: () => {
        const state = get();
        const samples = Object.values(state.samples);
        const boxes = Object.values(state.boxes);
        const requests = Object.values(state.requests);

        const byStatus: Record<SampleStatus, number> = {
          received: 0, 'in-storage': 0, aliquoted: 0, 'in-use': 0,
          reserved: 0, shipped: 0, depleted: 0, disposed: 0,
          quarantine: 0, 'qc-failed': 0,
        };
        const byType: Record<SampleType, number> = {
          'whole-blood': 0, serum: 0, plasma: 0, urine: 0, csf: 0,
          tissue: 0, dna: 0, rna: 0, pbmc: 0, saliva: 0, stool: 0,
          'bone-marrow': 0, other: 0,
        };
        const byStudy: Record<string, number> = {};
        const bySite: Record<string, number> = {};

        samples.forEach((s) => {
          byStatus[s.status] = (byStatus[s.status] || 0) + 1;
          byType[s.type] = (byType[s.type] || 0) + 1;
          byStudy[s.studyId] = (byStudy[s.studyId] || 0) + 1;
          bySite[s.siteId] = (bySite[s.siteId] || 0) + 1;
        });

        const totalPositions = boxes.reduce((sum, b) => sum + b.totalPositions, 0);
        const usedPositions = boxes.reduce((sum, b) => sum + b.usedPositions, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();

        return {
          totalSamples: samples.length,
          byStatus,
          byType,
          byStudy,
          bySite,
          totalStoragePositions: totalPositions,
          usedStoragePositions: usedPositions,
          utilizationPercentage: totalPositions > 0 ? (usedPositions / totalPositions) * 100 : 0,
          receivedLast7Days: samples.filter((s) => s.createdAt >= sevenDaysAgoStr).length,
          disposedLast7Days: samples.filter((s) => s.disposedAt && s.disposedAt >= sevenDaysAgoStr).length,
          requestsPending: requests.filter((r) => r.status === 'pending').length,
        };
      },

      getStorageUtilization: () => {
        const state = get();
        const siteUtilizations: StorageUtilization[] = [];

        Object.values(state.sites).forEach((site) => {
          const siteFreezerIds = Object.values(state.freezers)
            .filter((f) => f.siteId === site.id)
            .map((f) => f.id);

          const freezerStats = siteFreezerIds.map((fId) => {
            const freezer = state.freezers[fId];
            const rackIds = Object.values(state.racks)
              .filter((r) => r.freezerId === fId)
              .map((r) => r.id);
            
            const totalBoxes = rackIds.reduce((sum, rId) => {
              const rack = state.racks[rId];
              return sum + rack.totalBoxes;
            }, 0);
            
            const usedBoxes = rackIds.reduce((sum, rId) => {
              const rack = state.racks[rId];
              return sum + rack.usedBoxes;
            }, 0);

            return {
              freezerId: fId,
              freezerName: freezer.name,
              type: freezer.type,
              totalCapacity: totalBoxes,
              usedCapacity: usedBoxes,
              utilizationPct: totalBoxes > 0 ? (usedBoxes / totalBoxes) * 100 : 0,
              status: freezer.status,
            };
          });

          const totalCap = freezerStats.reduce((s, f) => s + f.totalCapacity, 0);
          const usedCap = freezerStats.reduce((s, f) => s + f.usedCapacity, 0);

          siteUtilizations.push({
            siteId: site.id,
            siteName: site.name,
            freezers: freezerStats,
            totalCapacity: totalCap,
            usedCapacity: usedCap,
            utilizationPct: totalCap > 0 ? (usedCap / totalCap) * 100 : 0,
          });
        });

        return siteUtilizations;
      },

      // ========================================================================
      // UI
      // ========================================================================

      setView: (view) => {
        set({ view });
      },

      setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },

      clearFilters: () => {
        set({ filters: createInitialFilters() });
      },

      setSelectedSite: (id) => {
        set({ selectedSiteId: id });
      },

      setSelectedFreezer: (id) => {
        set({ selectedFreezerId: id });
      },

      // ========================================================================
      // DATA LOADING
      // ========================================================================

      loadMockData: () => {
        // Import mock data directly
        import('@/data/sample-management-data').then(({ mockSampleManagementData }) => {
          if (mockSampleManagementData) {
            set({
              sites: mockSampleManagementData.sites || {},
              freezers: mockSampleManagementData.freezers || {},
              racks: mockSampleManagementData.racks || {},
              boxes: mockSampleManagementData.boxes || {},
              samples: mockSampleManagementData.samples || {},
              custodyEvents: mockSampleManagementData.custodyEvents || {},
              requests: mockSampleManagementData.requests || {},
            });
          }
        }).catch((err) => {
          console.warn('Could not load mock sample management data:', err);
        });
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    { name: 'sample-management-store' }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useFilteredSamples = () => {
  const { samples, filters } = useSampleManagementStore();
  
  return Object.values(samples).filter((sample) => {
    if (filters.status !== 'all' && sample.status !== filters.status) return false;
    if (filters.type !== 'all' && sample.type !== filters.type) return false;
    if (filters.studyId !== 'all' && sample.studyId !== filters.studyId) return false;
    if (filters.siteId !== 'all' && sample.siteId !== filters.siteId) return false;
    if (filters.quality !== 'all' && sample.quality !== filters.quality) return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesId = sample.sampleId.toLowerCase().includes(query);
      const matchesBarcode = sample.barcode.toLowerCase().includes(query);
      const matchesSubject = sample.subjectId.toLowerCase().includes(query);
      if (!matchesId && !matchesBarcode && !matchesSubject) return false;
    }
    if (filters.dateRange) {
      const sampleDate = new Date(sample.createdAt);
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      if (sampleDate < start || sampleDate > end) return false;
    }
    return true;
  });
};
