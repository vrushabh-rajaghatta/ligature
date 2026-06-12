
/**
 * GLP Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/glp/contracts
 * This file re-exports all types from the GLP domain for store compatibility,
 * plus store-specific state and action types.
 * 
 * @version 0.27.43
 */

// Re-export all types from GLP domain contracts
export {
  // Enums
  type GLPStudyStatus,
  type GLPStudyType,
  type DeviationSeverity,
  type DeviationStatus,
  type DeviationType,
  type AuditType,
  type AuditStatus,
  type FindingSeverity,
  type PersonnelRole,
  type TrainingStatus,
  type ArchiveStatus,
  type SpeciesType,
  
  // Study Management (Subpart G)
  type GLPStudy,
  type GLPProtocolAmendment,
  
  // Deviations
  type GLPDeviation,
  
  // QA Audits (Subpart B)
  type GLPAudit,
  type GLPAuditFinding,
  
  // Personnel (Subpart B)
  type GLPPersonnel,
  type GLPTrainingRequirement,
  type GLPTrainingRecord,
  
  // Archives (Subpart J)
  type GLPArchive,
  type GLPArchiveCustodyEvent,
  
  // Test Facility (Subparts C/D/E)
  type GLPTestFacility,
  type GLPEquipment,
  type GLPCalibrationRecord,
  
  // Dashboard
  type GLPComplianceMetrics,
  type GLPActionItem,
  
  // Constants
  GLP_STUDY_STATUS_LABELS,
  GLP_STUDY_TYPE_LABELS,
  DEVIATION_SEVERITY_LABELS,
  
  // Utilities
  isStudyActive,
  isStudyComplete,
  isDeviationOpen,
  isAuditOpen,
  isTrainingCurrent,
  isEquipmentCompliant,
  calculateComplianceScore,
} from '@/domains/glp/contracts';

// Re-import types needed for store-specific types
import type {
  GLPStudy,
  GLPDeviation,
  GLPAudit,
  GLPPersonnel,
  GLPTrainingRequirement,
  GLPArchive,
  GLPTestFacility,
  GLPEquipment,
  GLPComplianceMetrics,
  GLPActionItem,
  GLPAuditFinding,
  GLPCalibrationRecord,
  GLPArchiveCustodyEvent,
  GLPTrainingRecord,
  GLPStudyStatus,
  GLPStudyType,
  DeviationSeverity,
  DeviationStatus,
  AuditStatus,
  PersonnelRole,
} from '@/domains/glp/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (not in domain contracts)
// =============================================================================

export type GLPTab = 
  | 'dashboard'
  | 'studies'
  | 'deviations'
  | 'audits'
  | 'personnel'
  | 'archives'
  | 'facilities'
  | 'edc-integration';

export interface GLPState {
  // Data
  studies: Record<string, GLPStudy>;
  deviations: Record<string, GLPDeviation>;
  audits: Record<string, GLPAudit>;
  personnel: Record<string, GLPPersonnel>;
  trainingRequirements: Record<string, GLPTrainingRequirement>;
  archives: Record<string, GLPArchive>;
  facilities: Record<string, GLPTestFacility>;
  equipment: Record<string, GLPEquipment>;
  
  // Metrics
  complianceMetrics: GLPComplianceMetrics | null;
  actionItems: GLPActionItem[];
  
  // UI State
  activeTab: GLPTab;
  selectedStudyId: string | null;
  selectedDeviationId: string | null;
  selectedAuditId: string | null;
  selectedPersonnelId: string | null;
  selectedArchiveId: string | null;
  
  // Filters
  studyStatusFilter: GLPStudyStatus | 'all';
  studyTypeFilter: GLPStudyType | 'all';
  deviationSeverityFilter: DeviationSeverity | 'all';
  deviationStatusFilter: DeviationStatus | 'all';
  auditStatusFilter: AuditStatus | 'all';
  personnelRoleFilter: PersonnelRole | 'all';
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export interface GLPActions {
  // Studies
  addStudy: (study: GLPStudy) => void;
  updateStudy: (id: string, updates: Partial<GLPStudy>) => void;
  deleteStudy: (id: string) => void;
  
  // Deviations
  addDeviation: (deviation: GLPDeviation) => void;
  updateDeviation: (id: string, updates: Partial<GLPDeviation>) => void;
  closeDeviation: (id: string, closureNotes: string, closedBy: string) => void;
  
  // Audits
  addAudit: (audit: GLPAudit) => void;
  updateAudit: (id: string, updates: Partial<GLPAudit>) => void;
  addAuditFinding: (auditId: string, finding: GLPAuditFinding) => void;
  updateAuditFinding: (auditId: string, findingId: string, updates: Partial<GLPAuditFinding>) => void;
  
  // Personnel
  addPersonnel: (personnel: GLPPersonnel) => void;
  updatePersonnel: (id: string, updates: Partial<GLPPersonnel>) => void;
  addTrainingRecord: (personnelId: string, record: GLPTrainingRecord) => void;
  
  // Archives
  addArchive: (archive: GLPArchive) => void;
  updateArchive: (id: string, updates: Partial<GLPArchive>) => void;
  recordCustodyEvent: (archiveId: string, event: GLPArchiveCustodyEvent) => void;
  
  // Facilities & Equipment
  addFacility: (facility: GLPTestFacility) => void;
  updateFacility: (id: string, updates: Partial<GLPTestFacility>) => void;
  addEquipment: (equipment: GLPEquipment) => void;
  updateEquipment: (id: string, updates: Partial<GLPEquipment>) => void;
  recordCalibration: (equipmentId: string, record: GLPCalibrationRecord) => void;
  
  // Metrics
  refreshComplianceMetrics: () => void;
  
  // UI
  setActiveTab: (tab: GLPTab) => void;
  setSelectedStudyId: (id: string | null) => void;
  setSelectedDeviationId: (id: string | null) => void;
  setSelectedAuditId: (id: string | null) => void;
  setSelectedPersonnelId: (id: string | null) => void;
  setSelectedArchiveId: (id: string | null) => void;
  
  // Filters
  setStudyStatusFilter: (filter: GLPStudyStatus | 'all') => void;
  setStudyTypeFilter: (filter: GLPStudyType | 'all') => void;
  setDeviationSeverityFilter: (filter: DeviationSeverity | 'all') => void;
  setDeviationStatusFilter: (filter: DeviationStatus | 'all') => void;
  setAuditStatusFilter: (filter: AuditStatus | 'all') => void;
  setPersonnelRoleFilter: (filter: PersonnelRole | 'all') => void;
  
  // Utilities
  getStudyById: (id: string) => GLPStudy | undefined;
  getDeviationsByStudy: (studyId: string) => GLPDeviation[];
  getAuditsByStudy: (studyId: string) => GLPAudit[];
  getPersonnelByRole: (role: PersonnelRole) => GLPPersonnel[];
  getArchivesByStudy: (studyId: string) => GLPArchive[];
  getEquipmentByFacility: (facilityId: string) => GLPEquipment[];
}
