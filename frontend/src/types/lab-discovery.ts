
/**
 * Lab & Discovery Types
 * TypeScript interfaces for laboratory operations and drug discovery
 * @version 0.21.0
 */

// ============================================================================
// Core Enums
// ============================================================================

export type LabModuleType = 
  | 'DISCOVERY'
  | 'PRECLINICAL'
  | 'ANALYTICAL'
  | 'BIOANALYTICAL'
  | 'CMC'
  | 'STABILITY';

export type ExperimentStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type SampleStatus =
  | 'REGISTERED'
  | 'IN_STORAGE'
  | 'IN_USE'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'DISPOSED'
  | 'QUARANTINED'
  | 'LOST';

export type SampleType =
  | 'COMPOUND'
  | 'REFERENCE_STANDARD'
  | 'BIOLOGICAL'
  | 'INTERMEDIATE'
  | 'FORMULATION'
  | 'PLACEBO'
  | 'REAGENT'
  | 'CONTROL';

export type CompoundStatus =
  | 'VIRTUAL'
  | 'SYNTHESIZED'
  | 'CHARACTERIZED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DISCONTINUED';

export type BatchStatus =
  | 'PLANNED'
  | 'IN_PRODUCTION'
  | 'QC_PENDING'
  | 'QC_IN_PROGRESS'
  | 'RELEASED'
  | 'REJECTED'
  | 'QUARANTINED'
  | 'EXPIRED';

export type StorageCondition =
  | 'AMBIENT'
  | 'REFRIGERATED'     // 2-8°C
  | 'FROZEN'           // -20°C
  | 'ULTRA_FROZEN'     // -80°C
  | 'CRYOGENIC'        // -196°C (liquid nitrogen)
  | 'CONTROLLED_ROOM'  // 15-25°C
  | 'LIGHT_PROTECTED'
  | 'DESICCATED';

export type HazardClass =
  | 'NONE'
  | 'FLAMMABLE'
  | 'CORROSIVE'
  | 'TOXIC'
  | 'OXIDIZER'
  | 'BIOHAZARD'
  | 'RADIOACTIVE'
  | 'CYTOTOXIC'
  | 'CONTROLLED_SUBSTANCE';

export type CustodyEventType =
  | 'CREATED'
  | 'RECEIVED'
  | 'STORED'
  | 'RETRIEVED'
  | 'TRANSFERRED'
  | 'ALIQUOTED'
  | 'TESTED'
  | 'RETURNED'
  | 'DISPOSED'
  | 'SHIPPED'
  | 'LOST';

// ============================================================================
// Organization & Structure
// ============================================================================

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  type: LabModuleType;
  location: string;
  address?: LabAddress;
  certifications: LabCertification[];
  contactEmail: string;
  contactPhone?: string;
  parentLabId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_AUDIT';
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LabAddress {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface LabCertification {
  id: string;
  type: 'GLP' | 'GMP' | 'ISO17025' | 'CAP' | 'CLIA' | 'FDA_REGISTERED';
  certificationNumber: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate: Date;
  scope: string;
  status: 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
}

export interface StorageLocation {
  id: string;
  laboratoryId: string;
  name: string;
  code: string;
  type: 'FREEZER' | 'REFRIGERATOR' | 'CABINET' | 'SHELF' | 'RACK' | 'BOX' | 'ROOM';
  parentLocationId?: string;
  storageCondition: StorageCondition;
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureUnit: 'CELSIUS' | 'FAHRENHEIT';
  humidityMin?: number;
  humidityMax?: number;
  capacity: number;
  currentOccupancy: number;
  isMonitored: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OUT_OF_SPEC';
}

// ============================================================================
// Compounds
// ============================================================================

export interface Compound {
  id: string;
  compoundId: string;           // Internal ID (e.g., ABC-12345)
  name: string;
  synonyms: string[];
  status: CompoundStatus;
  
  // Structure
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  inchi?: string;
  inchiKey?: string;
  
  // Classification
  therapeuticArea?: string;
  targetClass?: string;
  mechanismOfAction?: string;
  
  // Properties
  physicalForm?: 'SOLID' | 'LIQUID' | 'GAS' | 'SOLUTION' | 'SUSPENSION';
  appearance?: string;
  solubility?: SolubilityData[];
  logP?: number;
  pKa?: number[];
  
  // Safety
  hazardClasses: HazardClass[];
  safetyDataSheetId?: string;
  handlingPrecautions?: string;
  
  // Regulatory
  casNumber?: string;
  innName?: string;                // International Nonproprietary Name
  usanName?: string;               // United States Adopted Name
  controlledSubstanceSchedule?: 'I' | 'II' | 'III' | 'IV' | 'V';
  
  // Tracking
  projectIds: string[];
  programId?: string;
  discoveryDate?: Date;
  leadOptimizationDate?: Date;
  candidateSelectionDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface SolubilityData {
  solvent: string;
  value: number;
  unit: 'MG_ML' | 'MM' | 'UM';
  temperature?: number;
  pH?: number;
  method?: string;
}

// ============================================================================
// Batches
// ============================================================================

export interface Batch {
  id: string;
  batchNumber: string;
  compoundId: string;
  status: BatchStatus;
  
  // Production
  manufacturingDate: Date;
  manufacturingSiteId?: string;
  manufacturingMethod?: string;
  scaleType: 'LAB' | 'PILOT' | 'COMMERCIAL';
  
  // Quantity
  initialQuantity: number;
  currentQuantity: number;
  quantityUnit: 'MG' | 'G' | 'KG' | 'ML' | 'L';
  
  // Quality
  purity?: number;
  purityMethod?: string;
  potency?: number;
  potencyMethod?: string;
  appearance?: string;
  
  // Specifications
  specifications: BatchSpecification[];
  certificateOfAnalysisId?: string;
  
  // Storage
  storageCondition: StorageCondition;
  storageLocationId?: string;
  
  // Dates
  expiryDate?: Date;
  retestDate?: Date;
  releaseDate?: Date;
  releasedBy?: string;
  
  // Tracking
  parentBatchId?: string;       // For derived batches
  childBatchIds: string[];
  sampleIds: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

export interface BatchSpecification {
  id: string;
  parameter: string;
  method: string;
  acceptanceCriteria: string;
  result?: string;
  resultValue?: number;
  resultUnit?: string;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'NOT_TESTED';
  testedAt?: Date;
  testedBy?: string;
}

// ============================================================================
// Samples
// ============================================================================

export interface Sample {
  id: string;
  sampleId: string;             // Barcode/unique identifier
  barcode?: string;
  status: SampleStatus;
  type: SampleType;
  
  // Source
  compoundId?: string;
  batchId?: string;
  parentSampleId?: string;      // For aliquots
  sourceType: 'SYNTHESIS' | 'PURCHASE' | 'ALIQUOT' | 'DERIVED' | 'RECEIVED';
  
  // Quantity
  initialQuantity: number;
  currentQuantity: number;
  quantityUnit: 'MG' | 'G' | 'KG' | 'ML' | 'L' | 'UL';
  concentration?: number;
  concentrationUnit?: 'MG_ML' | 'MM' | 'UM' | 'PERCENT';
  
  // Physical
  physicalForm: 'SOLID' | 'LIQUID' | 'SOLUTION' | 'SUSPENSION' | 'POWDER' | 'CRYSTAL';
  containerType: string;
  containerSize?: string;
  
  // Storage
  storageCondition: StorageCondition;
  storageLocationId?: string;
  locationPath?: string;        // e.g., "Freezer-1/Rack-A/Box-3/Position-B5"
  
  // Quality
  purity?: number;
  appearance?: string;
  qualityGrade?: 'RESEARCH' | 'GLP' | 'GMP' | 'REFERENCE';
  
  // Dates
  registrationDate: Date;
  expiryDate?: Date;
  lastAccessedAt?: Date;
  disposedAt?: Date;
  
  // Safety
  hazardClasses: HazardClass[];
  
  // Tracking
  projectId?: string;
  experimentIds: string[];
  requestIds: string[];
  
  // Chain of custody
  custodyHistory: CustodyEvent[];
  currentCustodian?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
  attributes: Record<string, unknown>;
}

// ============================================================================
// Chain of Custody
// ============================================================================

export interface CustodyEvent {
  id: string;
  sampleId: string;
  eventType: CustodyEventType;
  timestamp: Date;
  
  // Who
  performedBy: string;
  performedByName?: string;
  witnessedBy?: string;
  
  // What
  quantityBefore?: number;
  quantityAfter?: number;
  quantityUnit?: string;
  
  // Where
  fromLocationId?: string;
  fromLocationPath?: string;
  toLocationId?: string;
  toLocationPath?: string;
  
  // Why
  reason?: string;
  experimentId?: string;
  requestId?: string;
  shipmentId?: string;
  
  // Conditions
  storageConditionMaintained?: boolean;
  temperatureReading?: number;
  
  // Documentation
  notes?: string;
  attachmentIds: string[];
  signatureId?: string;
  
  // Audit
  ipAddress?: string;
  deviceId?: string;
}

export interface CustodyTransfer {
  id: string;
  sampleIds: string[];
  transferType: 'INTERNAL' | 'EXTERNAL' | 'SHIPMENT';
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  
  // Parties
  fromLaboratoryId: string;
  fromUserId: string;
  toLaboratoryId: string;
  toUserId?: string;
  
  // Timeline
  requestedAt: Date;
  requestedBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  shippedAt?: Date;
  receivedAt?: Date;
  receivedBy?: string;
  
  // Shipping
  carrierName?: string;
  trackingNumber?: string;
  shippingCondition: StorageCondition;
  temperatureMonitorId?: string;
  
  // Documentation
  transferDocumentId?: string;
  notes?: string;
}

// ============================================================================
// Experiments
// ============================================================================

export interface Experiment {
  id: string;
  experimentId: string;         // Human-readable ID (e.g., EXP-2024-00123)
  title: string;
  description?: string;
  status: ExperimentStatus;
  type: ExperimentType;
  
  // Classification
  laboratoryId: string;
  projectId?: string;
  programId?: string;
  studyId?: string;
  
  // Protocol
  protocolId?: string;
  protocolVersion?: string;
  sop?: string;
  
  // Objectives
  objectives: string[];
  hypothesis?: string;
  
  // Timeline
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Team
  principalInvestigatorId: string;
  principalInvestigatorName?: string;
  teamMembers: ExperimentTeamMember[];
  
  // Materials
  compoundIds: string[];
  sampleIds: string[];
  batchIds: string[];
  reagentIds: string[];
  equipmentIds: string[];
  
  // Data
  parameters: ExperimentParameter[];
  results: ExperimentResult[];
  dataFileIds: string[];
  notebookEntryIds: string[];
  
  // Quality
  glpCompliant: boolean;
  qualityCheckStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  qualityCheckDate?: Date;
  qualityCheckBy?: string;
  
  // Outputs
  conclusions?: string;
  nextSteps?: string;
  linkedExperimentIds: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export type ExperimentType =
  | 'SYNTHESIS'
  | 'SCREENING'
  | 'ASSAY'
  | 'ADME'
  | 'TOXICOLOGY'
  | 'FORMULATION'
  | 'STABILITY'
  | 'ANALYTICAL'
  | 'BIOANALYTICAL'
  | 'IN_VIVO'
  | 'IN_VITRO'
  | 'COMPUTATIONAL';

export interface ExperimentTeamMember {
  userId: string;
  name: string;
  role: 'PI' | 'CO_PI' | 'SCIENTIST' | 'TECHNICIAN' | 'ANALYST' | 'REVIEWER';
  joinedAt: Date;
  leftAt?: Date;
}

export interface ExperimentParameter {
  id: string;
  name: string;
  value: string | number | boolean;
  unit?: string;
  type: 'INPUT' | 'SETTING' | 'CONDITION';
  category?: string;
}

export interface ExperimentResult {
  id: string;
  name: string;
  value: string | number | boolean | null;
  unit?: string;
  type: 'PRIMARY' | 'SECONDARY' | 'DERIVED' | 'QC';
  method?: string;
  
  // Statistics
  standardDeviation?: number;
  coefficientOfVariation?: number;
  replicates?: number;
  
  // Quality
  acceptanceCriteria?: string;
  passed?: boolean;
  
  // Timing
  measuredAt?: Date;
  measuredBy?: string;
  
  // Reference
  sampleId?: string;
  compoundId?: string;
}

// ============================================================================
// Sample Requests
// ============================================================================

export interface SampleRequest {
  id: string;
  requestNumber: string;
  status: SampleRequestStatus;
  type: 'WITHDRAWAL' | 'ALIQUOT' | 'TRANSFER' | 'DISPOSAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  
  // What
  sampleId: string;
  requestedQuantity: number;
  quantityUnit: string;
  
  // Who
  requestedBy: string;
  requestedByName?: string;
  requestedFor?: string;        // If on behalf of someone
  
  // Why
  purpose: string;
  experimentId?: string;
  projectId?: string;
  
  // When
  requestedAt: Date;
  neededByDate?: Date;
  
  // Approval
  requiresApproval: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Fulfillment
  fulfilledAt?: Date;
  fulfilledBy?: string;
  actualQuantity?: number;
  newSampleId?: string;         // For aliquots
  
  // Metadata
  notes?: string;
  attachmentIds: string[];
}

export type SampleRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'FULFILLED'
  | 'CANCELLED';

// ============================================================================
// Instruments & Equipment
// ============================================================================

export interface LabInstrument {
  id: string;
  name: string;
  code: string;
  type: InstrumentType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  
  // Location
  laboratoryId: string;
  locationDescription?: string;
  
  // Status
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED';
  
  // Qualification
  iqDate?: Date;                // Installation Qualification
  oqDate?: Date;                // Operational Qualification
  pqDate?: Date;                // Performance Qualification
  qualificationStatus: 'NOT_QUALIFIED' | 'QUALIFIED' | 'EXPIRED' | 'PENDING';
  
  // Calibration
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
  calibrationFrequencyDays?: number;
  
  // Maintenance
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceFrequencyDays?: number;
  
  // Usage
  usageLogRequired: boolean;
  reservationRequired: boolean;
  
  // Documentation
  sopIds: string[];
  manualDocumentId?: string;
  
  // Metadata
  purchaseDate?: Date;
  warrantyExpiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InstrumentType =
  | 'HPLC'
  | 'UHPLC'
  | 'GC'
  | 'GCMS'
  | 'LCMS'
  | 'NMR'
  | 'MS'
  | 'IR'
  | 'UV_VIS'
  | 'BALANCE'
  | 'PH_METER'
  | 'DISSOLUTION'
  | 'PARTICLE_SIZER'
  | 'MICROSCOPE'
  | 'CENTRIFUGE'
  | 'INCUBATOR'
  | 'PLATE_READER'
  | 'PCR'
  | 'SEQUENCER'
  | 'OTHER';

// ============================================================================
// Inventory Management
// ============================================================================

export interface InventoryTransaction {
  id: string;
  transactionType: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER' | 'DISPOSAL' | 'RETURN';
  sampleId: string;
  
  // Quantity
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  quantityUnit: string;
  
  // Reference
  referenceType?: 'EXPERIMENT' | 'REQUEST' | 'SHIPMENT' | 'DISPOSAL' | 'MANUAL';
  referenceId?: string;
  
  // Details
  reason: string;
  notes?: string;
  
  // Audit
  performedBy: string;
  performedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface InventoryAlert {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'OUT_OF_SPEC' | 'REORDER';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  
  // Target
  sampleId?: string;
  batchId?: string;
  compoundId?: string;
  
  // Details
  message: string;
  threshold?: number;
  currentValue?: number;
  
  // Status
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  
  // Timing
  createdAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface CompoundFilter {
  status?: CompoundStatus[];
  therapeuticArea?: string[];
  targetClass?: string[];
  projectIds?: string[];
  programId?: string;
  hasStructure?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
  searchText?: string;
}

export interface SampleFilter {
  status?: SampleStatus[];
  type?: SampleType[];
  compoundId?: string;
  batchId?: string;
  laboratoryId?: string;
  storageLocationId?: string;
  storageCondition?: StorageCondition[];
  hazardClasses?: HazardClass[];
  expiringBefore?: Date;
  projectId?: string;
  qualityGrade?: string[];
  searchText?: string;
}

export interface ExperimentFilter {
  status?: ExperimentStatus[];
  type?: ExperimentType[];
  laboratoryId?: string;
  projectId?: string;
  principalInvestigatorId?: string;
  compoundIds?: string[];
  startDateAfter?: Date;
  startDateBefore?: Date;
  glpCompliant?: boolean;
  tags?: string[];
  searchText?: string;
}

export interface BatchFilter {
  status?: BatchStatus[];
  compoundId?: string;
  manufacturingSiteId?: string;
  scaleType?: ('LAB' | 'PILOT' | 'COMMERCIAL')[];
  releasedAfter?: Date;
  releasedBefore?: Date;
  expiringBefore?: Date;
  searchText?: string;
}

// ============================================================================
// Metrics & Statistics
// ============================================================================

export interface LabMetrics {
  // Inventory
  totalSamples: number;
  samplesByStatus: Record<SampleStatus, number>;
  samplesByType: Record<SampleType, number>;
  expiringSoon: number;          // Within 30 days
  
  // Compounds
  totalCompounds: number;
  compoundsByStatus: Record<CompoundStatus, number>;
  
  // Batches
  totalBatches: number;
  batchesByStatus: Record<BatchStatus, number>;
  
  // Experiments
  activeExperiments: number;
  experimentsByStatus: Record<ExperimentStatus, number>;
  experimentsByType: Record<ExperimentType, number>;
  
  // Storage
  storageUtilization: number;    // Percentage
  locationsOutOfSpec: number;
  
  // Requests
  pendingRequests: number;
  averageRequestFulfillmentHours: number;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface LabAuditEntry {
  id: string;
  entityType: 'COMPOUND' | 'BATCH' | 'SAMPLE' | 'EXPERIMENT' | 'INSTRUMENT' | 'LOCATION';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'TRANSFER' | 'ACCESS';
  
  // Changes
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeDescription?: string;
  
  // Context
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  
  // Audit
  performedBy: string;
  performedByName?: string;
  performedAt: Date;
  ipAddress?: string;
  
  // Electronic signature (21 CFR Part 11)
  signatureId?: string;
  signatureMeaning?: string;
}
