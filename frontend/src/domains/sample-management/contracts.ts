
/**
 * Sample Management Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Sample Management types.
 * 
 * Covers biobank and sample library management:
 * - Storage hierarchy (sites → freezers → racks → boxes → positions)
 * - Sample lifecycle (received → stored → aliquoted → shipped → disposed)
 * - Chain of custody with 21 CFR Part 11 compliance
 * - CTMS integration for clinical trial samples
 * 
 * @module domains/sample-management/contracts
 * @version 0.27.42
 */

// =============================================================================
// STORAGE HIERARCHY TYPES
// =============================================================================

export type StorageLocationType = 'site' | 'freezer' | 'rack' | 'box' | 'position';

export type FreezerType = 
  | 'ultra-low-80' 
  | 'low-temp-20' 
  | 'refrigerator-4' 
  | 'ambient' 
  | 'liquid-nitrogen' 
  | 'cryogenic';

export type FreezerStatus = 'operational' | 'maintenance' | 'alarm' | 'offline';

export interface StorageSite {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  certifications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Freezer {
  id: string;
  siteId: string;
  name: string;
  code: string;
  type: FreezerType;
  targetTemp: number;
  tempTolerance: number;
  status: FreezerStatus;
  
  // Capacity
  totalRacks: number;
  usedRacks: number;
  
  // Location
  room: string;
  building?: string;
  
  // Monitoring
  lastTempCheck: string;
  lastTempValue: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface StorageRack {
  id: string;
  freezerId: string;
  name: string;
  code: string;
  position: number;
  
  // Capacity
  rows: number;
  columns: number;
  totalBoxes: number;
  usedBoxes: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface StorageBox {
  id: string;
  rackId: string;
  name: string;
  code: string;
  position: string;
  
  // Box spec
  boxType: '81-well' | '100-well' | '25-well' | 'custom';
  rows: number;
  columns: number;
  totalPositions: number;
  usedPositions: number;
  
  // Contents
  sampleType?: SampleType;
  studyId?: string;
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SAMPLE TYPES
// =============================================================================

export type SampleType = 
  | 'whole-blood'
  | 'serum'
  | 'plasma'
  | 'urine'
  | 'csf'
  | 'tissue'
  | 'dna'
  | 'rna'
  | 'pbmc'
  | 'saliva'
  | 'stool'
  | 'bone-marrow'
  | 'other';

export type SampleStatus = 
  | 'received'
  | 'in-storage'
  | 'aliquoted'
  | 'in-use'
  | 'reserved'
  | 'shipped'
  | 'depleted'
  | 'disposed'
  | 'quarantine'
  | 'qc-failed';

export type SampleQuality = 'acceptable' | 'marginal' | 'compromised' | 'failed' | 'pending';

export interface Sample {
  id: string;
  sampleId: string;
  barcode: string;
  
  // Sample details
  type: SampleType;
  status: SampleStatus;
  quality: SampleQuality;
  
  // Volume tracking
  initialVolume: number;
  currentVolume: number;
  volumeUnit: 'mL' | 'uL' | 'g' | 'mg';
  
  // Parent/child for aliquots
  parentSampleId: string | null;
  childSampleIds: string[];
  aliquotNumber?: number;
  
  // Collection info
  collectionDate: string;
  collectionTime?: string;
  collectedBy: string;
  collectionNotes?: string;
  
  // Processing
  processingDate?: string;
  processingProtocol?: string;
  processedBy?: string;
  
  // Storage location
  storageLocationId: string;
  storagePosition: string;
  storedAt: string;
  
  // CTMS Linkage
  studyId: string;
  studyName: string;
  siteId: string;
  siteName: string;
  subjectId: string;
  visitId?: string;
  visitName?: string;
  timepointCode?: string;
  
  // Safety linkage
  safetyEventId?: string;
  
  // Metadata
  specimenCondition?: string;
  hemolysisIndex?: string;
  lipemiaIndex?: string;
  ictericIndex?: string;
  comments?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  disposedAt?: string;
  disposalReason?: string;
  disposedBy?: string;
}

// =============================================================================
// CHAIN OF CUSTODY
// =============================================================================

export type CustodyEventType = 
  | 'received'
  | 'stored'
  | 'retrieved'
  | 'aliquoted'
  | 'transferred'
  | 'shipped'
  | 'returned'
  | 'disposed'
  | 'qc-performed'
  | 'temp-excursion'
  | 'status-change'
  | 'location-change'
  | 'annotation';

export interface ChainOfCustodyEvent {
  id: string;
  sampleId: string;
  eventType: CustodyEventType;
  
  // Who/When
  performedBy: string;
  performedByName: string;
  performedAt: string;
  
  // What changed
  fromLocation?: string;
  toLocation?: string;
  fromStatus?: SampleStatus;
  toStatus?: SampleStatus;
  
  // Details
  reason?: string;
  notes?: string;
  
  // Part 11 compliance
  electronicSignatureId?: string;
  signatureMeaning?: string;
  
  // Shipping details
  shippingTrackingNumber?: string;
  shippingCarrier?: string;
  destinationLab?: string;
  
  // Temperature
  recordedTemp?: number;
  expectedTemp?: number;
  
  createdAt: string;
}

// =============================================================================
// SAMPLE REQUEST / RESERVATION
// =============================================================================

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';

export interface SampleRequest {
  id: string;
  requestNumber: string;
  
  // Requestor
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  
  // Purpose
  purpose: string;
  studyId?: string;
  protocol?: string;
  analysisType: string;
  
  // What's requested
  sampleIds: string[];
  sampleType?: SampleType;
  quantityRequested?: number;
  
  // Status & Workflow
  status: RequestStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Fulfillment
  fulfilledAt?: string;
  fulfilledBy?: string;
  
  // Priority
  priority: 'routine' | 'urgent' | 'stat';
  dueDate?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SUMMARY / METRICS
// =============================================================================

export interface SampleInventorySummary {
  totalSamples: number;
  byStatus: Record<SampleStatus, number>;
  byType: Record<SampleType, number>;
  byStudy: Record<string, number>;
  bySite: Record<string, number>;
  
  // Capacity
  totalStoragePositions: number;
  usedStoragePositions: number;
  utilizationPercentage: number;
  
  // Recent activity
  receivedLast7Days: number;
  disposedLast7Days: number;
  requestsPending: number;
}

export interface StorageUtilization {
  siteId: string;
  siteName: string;
  freezers: {
    freezerId: string;
    freezerName: string;
    type: FreezerType;
    totalCapacity: number;
    usedCapacity: number;
    utilizationPct: number;
    status: FreezerStatus;
  }[];
  totalCapacity: number;
  usedCapacity: number;
  utilizationPct: number;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type SampleManagementView = 
  | 'inventory'
  | 'sample-detail'
  | 'storage'
  | 'storage-site-detail'
  | 'freezer-detail'
  | 'chain-of-custody'
  | 'requests'
  | 'request-detail'
  | 'receive-samples'
  | 'aliquot'
  | 'dispose';

export interface SampleFilters {
  status: SampleStatus | 'all';
  type: SampleType | 'all';
  studyId: string | 'all';
  siteId: string | 'all';
  quality: SampleQuality | 'all';
  dateRange: { start: string; end: string } | null;
  searchQuery: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SAMPLE_TYPE_LABELS: Record<SampleType, string> = {
  'whole-blood': 'Whole Blood',
  'serum': 'Serum',
  'plasma': 'Plasma',
  'urine': 'Urine',
  'csf': 'CSF',
  'tissue': 'Tissue',
  'dna': 'DNA',
  'rna': 'RNA',
  'pbmc': 'PBMC',
  'saliva': 'Saliva',
  'stool': 'Stool',
  'bone-marrow': 'Bone Marrow',
  'other': 'Other',
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  'received': 'Received',
  'in-storage': 'In Storage',
  'aliquoted': 'Aliquoted',
  'in-use': 'In Use',
  'reserved': 'Reserved',
  'shipped': 'Shipped',
  'depleted': 'Depleted',
  'disposed': 'Disposed',
  'quarantine': 'Quarantine',
  'qc-failed': 'QC Failed',
};

export const FREEZER_TYPE_LABELS: Record<FreezerType, string> = {
  'ultra-low-80': 'Ultra-Low (-80°C)',
  'low-temp-20': 'Low Temp (-20°C)',
  'refrigerator-4': 'Refrigerator (4°C)',
  'ambient': 'Ambient',
  'liquid-nitrogen': 'Liquid Nitrogen',
  'cryogenic': 'Cryogenic',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  'pending': 'Pending',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'fulfilled': 'Fulfilled',
  'cancelled': 'Cancelled',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isSampleAvailable(status: SampleStatus): boolean {
  return status === 'in-storage' || status === 'received';
}

export function isSampleUsable(sample: Sample): boolean {
  return isSampleAvailable(sample.status) && 
         sample.quality !== 'failed' && 
         sample.quality !== 'compromised';
}

export function hasVolume(sample: Sample): boolean {
  return sample.currentVolume > 0;
}

export function isFreezerOperational(status: FreezerStatus): boolean {
  return status === 'operational';
}

export function calculateUtilization(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

export function generateSampleId(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

export function generateBarcode(sampleId: string): string {
  return sampleId.replace(/-/g, '');
}
