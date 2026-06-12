
/**
 * ELN Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Electronic Lab Notebook types.
 * 
 * Covers R&D lab data capture and management:
 * - Experiments with signatures and witnessing (21 CFR Part 11)
 * - Notebooks and templates
 * - Materials and procedures
 * - Instrument integration and data capture
 * - Cross-module linking (CTMS, TMF, Safety, Sample Management)
 * 
 * @module domains/eln/contracts
 * @version 0.27.42
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

export type ExperimentStatus = 
  | 'draft'
  | 'in-progress'
  | 'completed'
  | 'reviewed'
  | 'approved'
  | 'archived';

export type ExperimentType =
  | 'synthesis'
  | 'assay'
  | 'formulation'
  | 'stability'
  | 'analytical'
  | 'bioanalytical'
  | 'cell-culture'
  | 'animal-study'
  | 'process-development'
  | 'other';

export type DataEntryType = 'manual' | 'instrument' | 'calculated' | 'imported';

export type InstrumentStatus = 'available' | 'in-use' | 'maintenance' | 'calibration-due' | 'out-of-service';
export type InstrumentProtocol = 'manual' | 'REST' | 'OPC-UA' | 'HL7' | 'LIMS' | 'file-import';

// =============================================================================
// EXPERIMENT & NOTEBOOK
// =============================================================================

export interface ELNExperiment {
  id: string;
  notebookId: string;
  title: string;
  type: ExperimentType;
  status: ExperimentStatus;
  projectId: string;
  projectName: string;
  studyId?: string;
  studyName?: string;
  
  // Authorship
  author: string;
  authorId: string;
  collaborators: string[];
  
  // Dates
  createdAt: string;
  modifiedAt: string;
  startDate?: string;
  completionDate?: string;
  
  // Content
  objective: string;
  hypothesis?: string;
  materials: ELNMaterial[];
  procedures: ELNProcedureStep[];
  observations: string;
  results: string;
  conclusions: string;
  
  // Attachments
  attachments: ELNAttachment[];
  dataFiles: ELNDataFile[];
  
  // Compliance (21 CFR Part 11)
  signatureStatus: 'unsigned' | 'signed' | 'countersigned';
  signedBy?: string;
  signedAt?: string;
  witnessedBy?: string;
  witnessedAt?: string;
  
  // Cross-module links
  linkedSamples: string[];
  linkedDocuments: string[];
  linkedCTMSRecords: string[];
  linkedSafetyReports: string[];
  linkedTMFArtifacts: string[];
  
  // Metadata
  tags: string[];
  keywords: string[];
}

export interface ELNNotebook {
  id: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  experimentCount: number;
  status: 'active' | 'archived';
}

// =============================================================================
// MATERIALS & PROCEDURES
// =============================================================================

export interface ELNMaterial {
  id: string;
  name: string;
  catalogNumber?: string;
  lotNumber?: string;
  vendor?: string;
  quantity: string;
  unit: string;
  sampleId?: string; // Link to Sample Management
  expiryDate?: string;
}

export interface ELNProcedureStep {
  id: string;
  stepNumber: number;
  description: string;
  parameters?: Record<string, string>;
  duration?: string;
  equipment?: string[];
  notes?: string;
  completedAt?: string;
  completedBy?: string;
}

// =============================================================================
// ATTACHMENTS & DATA FILES
// =============================================================================

export interface ELNAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url: string;
}

export interface ELNDataFile {
  id: string;
  name: string;
  instrument?: string;
  format: string;
  size: number;
  uploadedAt: string;
  processedAt?: string;
  dataPoints?: number;
}

// =============================================================================
// DATA ENTRY & CAPTURE
// =============================================================================

export interface ELNDataEntry {
  id: string;
  experimentId: string;
  stepId?: string;
  timestamp: string;
  entryType: DataEntryType;
  
  // Field definition
  fieldName: string;
  fieldLabel: string;
  value: string | number | boolean;
  unit?: string;
  
  // Validation
  expectedMin?: number;
  expectedMax?: number;
  isOutOfSpec?: boolean;
  
  // Instrument data
  instrumentId?: string;
  instrumentName?: string;
  rawReading?: string;
  
  // Calculations
  formula?: string;
  referencedEntries?: string[];
  
  // Metadata
  enteredBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  parameter?: string;
}

export interface ELNDataCaptureField {
  id: string;
  fieldName: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'datetime' | 'textarea';
  unit?: string;
  options?: string[];
  required: boolean;
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  instrumentId?: string;
}

export interface ELNDataCaptureForm {
  id: string;
  name: string;
  description: string;
  experimentType: ExperimentType;
  fields: ELNDataCaptureField[];
  createdBy: string;
  createdAt: string;
  isTemplate: boolean;
}

// =============================================================================
// INSTRUMENTS
// =============================================================================

export interface ELNInstrument {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: InstrumentStatus;
  
  // Calibration
  lastCalibration?: string;
  nextCalibration?: string;
  calibrationInterval: number;
  
  // Integration
  integrationEnabled: boolean;
  integrationProtocol: InstrumentProtocol;
  connectionString?: string;
  dataFormat?: string;
  
  // Ownership
  custodian: string;
  department: string;
}

// =============================================================================
// TEMPLATES
// =============================================================================

export interface ELNTemplate {
  id: string;
  name: string;
  type: ExperimentType;
  description: string;
  procedureSteps: Omit<ELNProcedureStep, 'id' | 'completedAt' | 'completedBy'>[];
  requiredMaterials: Omit<ELNMaterial, 'id' | 'lotNumber' | 'sampleId'>[];
  isGlobal: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// =============================================================================
// DASHBOARD & ACTIVITY
// =============================================================================

export interface ELNDashboardMetrics {
  totalExperiments: number;
  activeExperiments: number;
  completedThisMonth: number;
  pendingReview: number;
  pendingSignature: number;
  overdueExperiments: number;
  experimentsByType: Record<ExperimentType, number>;
  experimentsByStatus: Record<ExperimentStatus, number>;
  recentActivity: ELNActivityEntry[];
}

export interface ELNActivityEntry {
  id: string;
  experimentId: string;
  experimentTitle: string;
  action: 'created' | 'updated' | 'signed' | 'witnessed' | 'reviewed' | 'approved';
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
}

// =============================================================================
// CROSS-MODULE LINKS
// =============================================================================

export interface ELNToCTMSLink {
  id: string;
  experimentId: string;
  ctmsRecordId: string;
  ctmsRecordType: 'visit' | 'sample-collection' | 'adverse-event' | 'subject' | 'site';
  ctmsRecordName: string;
  studyId?: string;
  studyName?: string;
  linkedAt: string;
  linkedBy: string;
}

export interface ELNToTMFLink {
  id: string;
  experimentId: string;
  tmfArtifactId: string;
  tmfArtifactName: string;
  tmfZone: string;
  tmfSection: string;
  tmfDocumentType: string;
  linkedAt: string;
  linkedBy: string;
}

export interface ELNToSafetyLink {
  id: string;
  experimentId: string;
  safetyReportId: string;
  safetyReportName: string;
  reportType: 'ICSR' | 'PSUR' | 'Signal' | 'DSUR';
  caseNumber?: string;
  linkedAt: string;
  linkedBy: string;
}

// =============================================================================
// LINKABLE RECORDS (for selection UI)
// =============================================================================

export interface LinkableCTMSRecord {
  id: string;
  type: 'visit' | 'sample-collection' | 'adverse-event' | 'subject' | 'site';
  name: string;
  studyId: string;
  studyName: string;
  status: string;
}

export interface LinkableTMFArtifact {
  id: string;
  name: string;
  zone: string;
  section: string;
  documentType: string;
  status: string;
}

export interface LinkableSafetyReport {
  id: string;
  type: 'ICSR' | 'PSUR' | 'Signal' | 'DSUR';
  name: string;
  caseNumber?: string;
  status: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  'draft': 'Draft',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'reviewed': 'Reviewed',
  'approved': 'Approved',
  'archived': 'Archived',
};

export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  'synthesis': 'Synthesis',
  'assay': 'Assay',
  'formulation': 'Formulation',
  'stability': 'Stability',
  'analytical': 'Analytical',
  'bioanalytical': 'Bioanalytical',
  'cell-culture': 'Cell Culture',
  'animal-study': 'Animal Study',
  'process-development': 'Process Development',
  'other': 'Other',
};

export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  'available': 'Available',
  'in-use': 'In Use',
  'maintenance': 'Maintenance',
  'calibration-due': 'Calibration Due',
  'out-of-service': 'Out of Service',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isExperimentEditable(status: ExperimentStatus): boolean {
  return status === 'draft' || status === 'in-progress';
}

export function isExperimentSignable(status: ExperimentStatus): boolean {
  return status === 'completed' || status === 'reviewed';
}

export function isInstrumentAvailable(status: InstrumentStatus): boolean {
  return status === 'available';
}

export function isInstrumentOperational(status: InstrumentStatus): boolean {
  return status === 'available' || status === 'in-use';
}

export function needsCalibration(instrument: ELNInstrument): boolean {
  if (!instrument.nextCalibration) return false;
  return new Date(instrument.nextCalibration) <= new Date();
}
