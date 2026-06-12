
/**
 * ELN Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/eln/contracts
 * This file re-exports all types from the ELN domain for store compatibility.
 * 
 * @version 0.27.43
 */

// Re-export all types from ELN domain contracts
export {
  // Enums
  type ExperimentStatus,
  type ExperimentType,
  type DataEntryType,
  type InstrumentStatus,
  type InstrumentProtocol,
  
  // Core entities
  type ELNExperiment,
  type ELNNotebook,
  type ELNMaterial,
  type ELNProcedureStep,
  type ELNAttachment,
  type ELNDataFile,
  type ELNDataEntry,
  type ELNDataCaptureField,
  type ELNDataCaptureForm,
  type ELNInstrument,
  type ELNTemplate,
  
  // Dashboard
  type ELNDashboardMetrics,
  type ELNActivityEntry,
  
  // Cross-module links
  type ELNToCTMSLink,
  type ELNToTMFLink,
  type ELNToSafetyLink,
  type LinkableCTMSRecord,
  type LinkableTMFArtifact,
  type LinkableSafetyReport,
  
  // Constants
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_TYPE_LABELS,
  INSTRUMENT_STATUS_LABELS,
  
  // Utilities
  isExperimentEditable,
  isExperimentSignable,
  isInstrumentAvailable,
  isInstrumentOperational,
  needsCalibration,
} from '@/domains/eln/contracts';
