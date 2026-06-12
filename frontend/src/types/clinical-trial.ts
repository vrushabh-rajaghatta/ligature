
/**
 * Clinical Trial Types
 * Core types for clinical study management
 * @version 0.20.0
 */

// ============================================================================
// Study Phase and Status
// ============================================================================

export type StudyPhase = 
  | 'PHASE_1' 
  | 'PHASE_1_2' 
  | 'PHASE_2' 
  | 'PHASE_2_3' 
  | 'PHASE_3' 
  | 'PHASE_4';

export type StudyStatus = 
  | 'DRAFT' 
  | 'IN_STARTUP' 
  | 'ENROLLING' 
  | 'CLOSED_TO_ENROLLMENT' 
  | 'COMPLETED' 
  | 'TERMINATED';

export const STUDY_PHASES: StudyPhase[] = [
  'PHASE_1',
  'PHASE_1_2',
  'PHASE_2',
  'PHASE_2_3',
  'PHASE_3',
  'PHASE_4',
];

export const STUDY_STATUSES: StudyStatus[] = [
  'DRAFT',
  'IN_STARTUP',
  'ENROLLING',
  'CLOSED_TO_ENROLLMENT',
  'COMPLETED',
  'TERMINATED',
];

// Valid status transitions
export const STUDY_STATUS_TRANSITIONS: Record<StudyStatus, StudyStatus[]> = {
  DRAFT: ['IN_STARTUP', 'TERMINATED'],
  IN_STARTUP: ['ENROLLING', 'TERMINATED'],
  ENROLLING: ['CLOSED_TO_ENROLLMENT', 'TERMINATED'],
  CLOSED_TO_ENROLLMENT: ['COMPLETED', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
};

// ============================================================================
// Study Arm Types
// ============================================================================

export type TreatmentType = 
  | 'EXPERIMENTAL' 
  | 'ACTIVE_COMPARATOR' 
  | 'PLACEBO' 
  | 'NO_INTERVENTION';

export interface StudyArm {
  id: string;
  name: string;
  description: string;
  treatmentType: TreatmentType;
  plannedSubjects: number;
  order: number;
}

// ============================================================================
// Study Endpoint Types
// ============================================================================

export type EndpointType = 'PRIMARY' | 'SECONDARY' | 'EXPLORATORY' | 'SAFETY';

export interface StudyEndpoint {
  id: string;
  name: string;
  type: EndpointType;
  description: string;
  assessmentSchedule: string[]; // Visit IDs when assessed
  statisticalMethod?: string;
  targetValue?: string;
}

// ============================================================================
// Protocol Visit Reference (minimal, full definition in clinical-visit.ts)
// ============================================================================

export interface ProtocolVisitRef {
  id: string;
  visitNumber: number;
  visitName: string;
}

// ============================================================================
// Clinical Study
// ============================================================================

export interface ClinicalStudy {
  id: string;
  tenantId: string;
  
  // Protocol identification
  protocolNumber: string;
  protocolTitle: string;
  protocolVersion: string;
  protocolDate: Date;
  
  // Study classification
  phase: StudyPhase;
  status: StudyStatus;
  therapeuticArea: string;
  indication: string;
  
  // Sponsorship
  sponsor: string;
  sponsorProtocolId?: string;
  
  // Enrollment
  plannedEnrollment: number;
  actualEnrollment: number;
  
  // Timeline
  startDate: Date;
  estimatedEndDate?: Date;
  actualEndDate?: Date;
  
  // Geography
  countries: string[];
  regions: string[];
  
  // Study design
  arms: StudyArm[];
  endpoints: StudyEndpoint[];
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Study Creation/Update Config
// ============================================================================

export interface CreateStudyConfig {
  tenantId: string;
  protocolNumber: string;
  protocolTitle: string;
  protocolVersion?: string;
  phase: StudyPhase;
  therapeuticArea: string;
  indication: string;
  sponsor: string;
  plannedEnrollment: number;
  startDate: Date;
  estimatedEndDate?: Date;
  countries?: string[];
  createdBy: string;
}

export interface StudyFilters {
  tenantId?: string;
  phase?: StudyPhase[];
  status?: StudyStatus[];
  therapeuticArea?: string;
  sponsor?: string;
  country?: string;
  searchTerm?: string;
}

// ============================================================================
// Visit Schedule (aggregate view)
// ============================================================================

export interface VisitSchedule {
  studyId: string;
  visits: ProtocolVisitRef[];
  totalDuration: number; // Days from first to last visit
  treatmentDuration: number; // Days of active treatment
  followUpDuration: number; // Days of follow-up
}

// ============================================================================
// Validation Result
// ============================================================================

export interface StudyValidationResult {
  isValid: boolean;
  errors: StudyValidationError[];
  warnings: StudyValidationWarning[];
}

export interface StudyValidationError {
  code: string;
  field: string;
  message: string;
}

export interface StudyValidationWarning {
  code: string;
  field: string;
  message: string;
  recommendation?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStudyPhase(value: unknown): value is StudyPhase {
  return typeof value === 'string' && STUDY_PHASES.includes(value as StudyPhase);
}

export function isStudyStatus(value: unknown): value is StudyStatus {
  return typeof value === 'string' && STUDY_STATUSES.includes(value as StudyStatus);
}

export function isValidStatusTransition(from: StudyStatus, to: StudyStatus): boolean {
  return STUDY_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTreatmentType(value: unknown): value is TreatmentType {
  const validTypes: TreatmentType[] = ['EXPERIMENTAL', 'ACTIVE_COMPARATOR', 'PLACEBO', 'NO_INTERVENTION'];
  return typeof value === 'string' && validTypes.includes(value as TreatmentType);
}

export function isEndpointType(value: unknown): value is EndpointType {
  const validTypes: EndpointType[] = ['PRIMARY', 'SECONDARY', 'EXPLORATORY', 'SAFETY'];
  return typeof value === 'string' && validTypes.includes(value as EndpointType);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createStudyArm(params: {
  id?: string;
  name: string;
  description?: string;
  treatmentType: TreatmentType;
  plannedSubjects?: number;
  order?: number;
}): StudyArm {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    description: params.description ?? '',
    treatmentType: params.treatmentType,
    plannedSubjects: params.plannedSubjects ?? 0,
    order: params.order ?? 0,
  };
}

export function createStudyEndpoint(params: {
  id?: string;
  name: string;
  type: EndpointType;
  description?: string;
  assessmentSchedule?: string[];
  statisticalMethod?: string;
}): StudyEndpoint {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    type: params.type,
    description: params.description ?? '',
    assessmentSchedule: params.assessmentSchedule ?? [],
    statisticalMethod: params.statisticalMethod,
  };
}

export function createClinicalStudy(config: CreateStudyConfig): ClinicalStudy {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: config.tenantId,
    protocolNumber: config.protocolNumber,
    protocolTitle: config.protocolTitle,
    protocolVersion: config.protocolVersion ?? '1.0',
    protocolDate: now,
    phase: config.phase,
    status: 'DRAFT',
    therapeuticArea: config.therapeuticArea,
    indication: config.indication,
    sponsor: config.sponsor,
    plannedEnrollment: config.plannedEnrollment,
    actualEnrollment: 0,
    startDate: config.startDate,
    estimatedEndDate: config.estimatedEndDate,
    countries: config.countries ?? [],
    regions: [],
    arms: [],
    endpoints: [],
    createdAt: now,
    createdBy: config.createdBy,
    updatedAt: now,
    updatedBy: config.createdBy,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getPhaseDisplayName(phase: StudyPhase): string {
  const displayNames: Record<StudyPhase, string> = {
    PHASE_1: 'Phase 1',
    PHASE_1_2: 'Phase 1/2',
    PHASE_2: 'Phase 2',
    PHASE_2_3: 'Phase 2/3',
    PHASE_3: 'Phase 3',
    PHASE_4: 'Phase 4',
  };
  return displayNames[phase];
}

export function getStatusDisplayName(status: StudyStatus): string {
  const displayNames: Record<StudyStatus, string> = {
    DRAFT: 'Draft',
    IN_STARTUP: 'In Startup',
    ENROLLING: 'Enrolling',
    CLOSED_TO_ENROLLMENT: 'Closed to Enrollment',
    COMPLETED: 'Completed',
    TERMINATED: 'Terminated',
  };
  return displayNames[status];
}

export function calculateEnrollmentProgress(study: ClinicalStudy): number {
  if (study.plannedEnrollment === 0) return 0;
  return Math.min(100, Math.round((study.actualEnrollment / study.plannedEnrollment) * 100));
}

export function isStudyActive(study: ClinicalStudy): boolean {
  return ['IN_STARTUP', 'ENROLLING', 'CLOSED_TO_ENROLLMENT'].includes(study.status);
}

export function canEnroll(study: ClinicalStudy): boolean {
  return study.status === 'ENROLLING' && study.actualEnrollment < study.plannedEnrollment;
}
