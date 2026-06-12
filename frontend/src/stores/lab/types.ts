
/**
 * Lab Store Types
 * State and action interfaces for Lab & Discovery stores
 * @version 0.21.1
 */

import type {
  Compound,
  CompoundStatus,
  CompoundFilter,
  Sample,
  SampleStatus,
  SampleType,
  SampleFilter,
  CustodyEvent,
  CustodyEventType,
  StorageCondition,
  Batch,
  BatchStatus,
  BatchFilter,
  BatchSpecification,
  Experiment,
  ExperimentStatus,
  ExperimentType,
  ExperimentFilter,
  ExperimentTeamMember,
  ExperimentParameter,
  ExperimentResult,
  SampleRequest,
  SampleRequestStatus,
  InventoryTransaction,
  InventoryAlert,
  LabMetrics,
  SolubilityData,
  HazardClass,
} from '@/types/lab-discovery';

// ============================================================================
// Compound Store Types
// ============================================================================

export interface CompoundState {
  compound: Compound;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface CompoundStoreState {
  compounds: Map<string, CompoundState>;
  isLoading: boolean;
  isLoadingCompound: string | null;
  error: string | null;
  filters: CompoundFilter;
  selectedCompoundIds: Set<string>;
}

export interface CompoundStoreActions {
  // CRUD
  loadCompounds: (filters?: CompoundFilter) => Promise<void>;
  loadCompound: (compoundId: string) => Promise<void>;
  registerCompound: (config: CompoundRegistrationConfig) => Promise<string>;
  updateCompound: (compoundId: string, updates: Partial<Compound>) => Promise<void>;
  deleteCompound: (compoundId: string) => Promise<void>;
  
  // Status Management
  updateCompoundStatus: (compoundId: string, status: CompoundStatus, reason?: string) => Promise<void>;
  
  // Structure & Properties
  updateStructure: (compoundId: string, structure: CompoundStructureUpdate) => Promise<void>;
  addSolubilityData: (compoundId: string, data: SolubilityData) => Promise<void>;
  updateHazards: (compoundId: string, hazards: HazardClass[]) => Promise<void>;
  
  // Project Linkage
  linkToProject: (compoundId: string, projectId: string) => Promise<void>;
  unlinkFromProject: (compoundId: string, projectId: string) => Promise<void>;
  
  // Selection
  selectCompound: (compoundId: string) => void;
  deselectCompound: (compoundId: string) => void;
  selectAllCompounds: () => void;
  clearSelection: () => void;
  
  // Filtering
  setFilters: (filters: CompoundFilter) => void;
  clearFilters: () => void;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface CompoundRegistrationConfig {
  compoundId: string;
  name: string;
  synonyms?: string[];
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  therapeuticArea?: string;
  targetClass?: string;
  hazardClasses?: HazardClass[];
  projectIds?: string[];
  tags?: string[];
}

export interface CompoundStructureUpdate {
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  inchi?: string;
  inchiKey?: string;
  logP?: number;
  pKa?: number[];
}

// ============================================================================
// Sample Store Types
// ============================================================================

export interface SampleState {
  sample: Sample;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface SampleStoreState {
  samples: Map<string, SampleState>;
  samplesByLocation: Map<string, Set<string>>; // locationId -> sampleIds
  samplesByCompound: Map<string, Set<string>>; // compoundId -> sampleIds
  samplesByBatch: Map<string, Set<string>>;    // batchId -> sampleIds
  isLoading: boolean;
  isLoadingSample: string | null;
  error: string | null;
  filters: SampleFilter;
  selectedSampleIds: Set<string>;
}

export interface SampleStoreActions {
  // CRUD
  loadSamples: (filters?: SampleFilter) => Promise<void>;
  loadSample: (sampleId: string) => Promise<void>;
  registerSample: (config: SampleRegistrationConfig) => Promise<string>;
  updateSample: (sampleId: string, updates: Partial<Sample>) => Promise<void>;
  
  // Status Management
  updateSampleStatus: (sampleId: string, status: SampleStatus, reason?: string) => Promise<void>;
  
  // Location & Transfer
  transferSample: (sampleId: string, toLocationId: string, performedBy: string, notes?: string) => Promise<void>;
  updateLocation: (sampleId: string, locationId: string, locationPath?: string) => Promise<void>;
  
  // Quantity Management
  aliquotSample: (sampleId: string, config: AliquotConfig) => Promise<string>;
  consumeSample: (sampleId: string, quantity: number, reason: string, performedBy: string) => Promise<void>;
  adjustQuantity: (sampleId: string, newQuantity: number, reason: string, performedBy: string) => Promise<void>;
  
  // Chain of Custody
  recordCustodyEvent: (sampleId: string, event: CustodyEventInput) => Promise<void>;
  getCustodyHistory: (sampleId: string) => CustodyEvent[];
  
  // Disposal
  disposeSample: (sampleId: string, reason: string, performedBy: string, witnessedBy?: string) => Promise<void>;
  
  // Selection
  selectSample: (sampleId: string) => void;
  deselectSample: (sampleId: string) => void;
  selectAllSamples: () => void;
  clearSelection: () => void;
  
  // Filtering
  setFilters: (filters: SampleFilter) => void;
  clearFilters: () => void;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface SampleRegistrationConfig {
  type: SampleType;
  compoundId?: string;
  batchId?: string;
  parentSampleId?: string;
  sourceType: 'SYNTHESIS' | 'PURCHASE' | 'ALIQUOT' | 'DERIVED' | 'RECEIVED';
  initialQuantity: number;
  quantityUnit: 'MG' | 'G' | 'KG' | 'ML' | 'L' | 'UL';
  concentration?: number;
  concentrationUnit?: 'MG_ML' | 'MM' | 'UM' | 'PERCENT';
  physicalForm: 'SOLID' | 'LIQUID' | 'SOLUTION' | 'SUSPENSION' | 'POWDER' | 'CRYSTAL';
  containerType: string;
  storageCondition: StorageCondition;
  storageLocationId?: string;
  locationPath?: string;
  qualityGrade?: 'RESEARCH' | 'GLP' | 'GMP' | 'REFERENCE';
  expiryDate?: Date;
  hazardClasses?: HazardClass[];
  projectId?: string;
  registeredBy: string;
}

export interface AliquotConfig {
  quantity: number;
  quantityUnit: string;
  containerType: string;
  storageLocationId?: string;
  locationPath?: string;
  performedBy: string;
  notes?: string;
}

export interface CustodyEventInput {
  eventType: CustodyEventType;
  fromLocation?: string;
  toLocation?: string;
  quantity?: number;
  performedBy: string;
  witnessedBy?: string;
  notes?: string;
}

// ============================================================================
// Batch Store Types
// ============================================================================

export interface BatchState {
  batch: Batch;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface BatchStoreState {
  batches: Map<string, BatchState>;
  batchesByCompound: Map<string, Set<string>>; // compoundId -> batchIds
  isLoading: boolean;
  isLoadingBatch: string | null;
  error: string | null;
  filters: BatchFilter;
  selectedBatchIds: Set<string>;
}

export interface BatchStoreActions {
  // CRUD
  loadBatches: (filters?: BatchFilter) => Promise<void>;
  loadBatch: (batchId: string) => Promise<void>;
  createBatch: (config: BatchCreationConfig) => Promise<string>;
  updateBatch: (batchId: string, updates: Partial<Batch>) => Promise<void>;
  
  // Status Management
  updateBatchStatus: (batchId: string, status: BatchStatus, reason?: string) => Promise<void>;
  
  // QC Workflow
  addSpecification: (batchId: string, spec: Omit<BatchSpecification, 'id'>) => Promise<void>;
  recordQCResult: (batchId: string, specId: string, result: QCResultInput) => Promise<void>;
  startQC: (batchId: string, performedBy: string) => Promise<void>;
  
  // Release Workflow
  releaseBatch: (batchId: string, releasedBy: string, notes?: string) => Promise<void>;
  rejectBatch: (batchId: string, rejectedBy: string, reason: string) => Promise<void>;
  quarantineBatch: (batchId: string, reason: string, performedBy: string) => Promise<void>;
  
  // Sample Linkage
  linkSample: (batchId: string, sampleId: string) => Promise<void>;
  unlinkSample: (batchId: string, sampleId: string) => Promise<void>;
  
  // Selection
  selectBatch: (batchId: string) => void;
  deselectBatch: (batchId: string) => void;
  clearSelection: () => void;
  
  // Filtering
  setFilters: (filters: BatchFilter) => void;
  clearFilters: () => void;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface BatchCreationConfig {
  batchNumber: string;
  compoundId: string;
  manufacturingDate: Date;
  manufacturingSiteId?: string;
  manufacturingMethod?: string;
  scaleType: 'LAB' | 'PILOT' | 'COMMERCIAL';
  initialQuantity: number;
  quantityUnit: 'MG' | 'G' | 'KG' | 'ML' | 'L';
  storageCondition: StorageCondition;
  storageLocationId?: string;
  expiryDate?: Date;
  createdBy: string;
}

export interface QCResultInput {
  result: string;
  resultValue?: number;
  resultUnit?: string;
  status: 'PASS' | 'FAIL';
  testedBy: string;
  notes?: string;
}

// ============================================================================
// Experiment Store Types
// ============================================================================

export interface ExperimentState {
  experiment: Experiment;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface ExperimentStoreState {
  experiments: Map<string, ExperimentState>;
  experimentsByLab: Map<string, Set<string>>;     // labId -> experimentIds
  experimentsByProject: Map<string, Set<string>>; // projectId -> experimentIds
  isLoading: boolean;
  isLoadingExperiment: string | null;
  error: string | null;
  filters: ExperimentFilter;
  selectedExperimentIds: Set<string>;
}

export interface ExperimentStoreActions {
  // CRUD
  loadExperiments: (filters?: ExperimentFilter) => Promise<void>;
  loadExperiment: (experimentId: string) => Promise<void>;
  createExperiment: (config: ExperimentCreationConfig) => Promise<string>;
  updateExperiment: (experimentId: string, updates: Partial<Experiment>) => Promise<void>;
  deleteExperiment: (experimentId: string) => Promise<void>;
  
  // Lifecycle
  startExperiment: (experimentId: string, startedBy: string) => Promise<void>;
  pauseExperiment: (experimentId: string, reason: string, pausedBy: string) => Promise<void>;
  resumeExperiment: (experimentId: string, resumedBy: string) => Promise<void>;
  completeExperiment: (experimentId: string, completedBy: string) => Promise<void>;
  failExperiment: (experimentId: string, reason: string, failedBy: string) => Promise<void>;
  cancelExperiment: (experimentId: string, reason: string, cancelledBy: string) => Promise<void>;
  
  // Team Management
  addTeamMember: (experimentId: string, member: Omit<ExperimentTeamMember, 'joinedAt'>) => Promise<void>;
  removeTeamMember: (experimentId: string, userId: string) => Promise<void>;
  
  // Parameters & Results
  addParameter: (experimentId: string, param: Omit<ExperimentParameter, 'id'>) => Promise<void>;
  updateParameter: (experimentId: string, paramId: string, value: string | number | boolean) => Promise<void>;
  addResult: (experimentId: string, result: Omit<ExperimentResult, 'id'>) => Promise<void>;
  updateResult: (experimentId: string, resultId: string, updates: Partial<ExperimentResult>) => Promise<void>;
  
  // Sample & Compound Linkage
  linkSample: (experimentId: string, sampleId: string) => Promise<void>;
  unlinkSample: (experimentId: string, sampleId: string) => Promise<void>;
  linkCompound: (experimentId: string, compoundId: string) => Promise<void>;
  unlinkCompound: (experimentId: string, compoundId: string) => Promise<void>;
  
  // Selection
  selectExperiment: (experimentId: string) => void;
  deselectExperiment: (experimentId: string) => void;
  clearSelection: () => void;
  
  // Filtering
  setFilters: (filters: ExperimentFilter) => void;
  clearFilters: () => void;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface ExperimentCreationConfig {
  title: string;
  type: ExperimentType;
  laboratoryId: string;
  projectId?: string;
  protocolId?: string;
  principalInvestigatorId: string;
  principalInvestigatorName: string;
  description?: string;
  objective?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  glpCompliant?: boolean;
  tags?: string[];
  createdBy: string;
}

// ============================================================================
// Lab Inventory Store Types
// ============================================================================

export interface LabInventoryStoreState {
  transactions: Map<string, InventoryTransaction>;
  transactionsBySample: Map<string, string[]>; // sampleId -> transactionIds (ordered)
  alerts: Map<string, InventoryAlert>;
  alertsBySeverity: Map<string, Set<string>>; // severity -> alertIds
  isLoading: boolean;
  error: string | null;
}

export interface LabInventoryStoreActions {
  // Transactions
  loadTransactions: (sampleId?: string, limit?: number) => Promise<void>;
  recordTransaction: (transaction: InventoryTransactionInput) => Promise<string>;
  
  // Alerts
  loadAlerts: (includeResolved?: boolean) => Promise<void>;
  createAlert: (alert: InventoryAlertInput) => Promise<string>;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<void>;
  resolveAlert: (alertId: string, resolvedBy: string, resolution?: string) => Promise<void>;
  dismissAlert: (alertId: string, dismissedBy: string, reason?: string) => Promise<void>;
  
  // Inventory Checks
  checkLowStock: (thresholds: Map<string, number>) => Promise<void>;
  checkExpiring: (daysAhead: number) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface InventoryTransactionInput {
  transactionType: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER' | 'DISPOSAL' | 'RETURN';
  sampleId: string;
  quantityBefore: number;
  quantityChange: number;
  quantityUnit: string;
  referenceType?: 'EXPERIMENT' | 'REQUEST' | 'SHIPMENT' | 'DISPOSAL' | 'MANUAL';
  referenceId?: string;
  reason: string;
  notes?: string;
  performedBy: string;
  approvedBy?: string;
}

export interface InventoryAlertInput {
  type: 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'OUT_OF_SPEC' | 'REORDER';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  sampleId?: string;
  batchId?: string;
  compoundId?: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  expiresAt?: Date;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface LabStoreMetrics {
  compounds: {
    total: number;
    byStatus: Record<CompoundStatus, number>;
    recentlyRegistered: number; // Last 30 days
  };
  samples: {
    total: number;
    byStatus: Record<SampleStatus, number>;
    byType: Record<SampleType, number>;
    expiringSoon: number; // Within 30 days
    lowStock: number;
  };
  batches: {
    total: number;
    byStatus: Record<BatchStatus, number>;
    pendingQC: number;
    pendingRelease: number;
  };
  experiments: {
    total: number;
    byStatus: Record<ExperimentStatus, number>;
    active: number;
    completedThisMonth: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    unacknowledged: number;
  };
}
