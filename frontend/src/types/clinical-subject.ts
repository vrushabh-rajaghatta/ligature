
/**
 * Clinical Subject Types
 * Subject/participant management types
 * @version 0.20.0
 */

// ============================================================================
// Subject Status
// ============================================================================

export type SubjectStatus = 
  | 'PRE_SCREENING'
  | 'SCREENING'
  | 'SCREEN_FAILURE'
  | 'ENROLLED'
  | 'RANDOMIZED'
  | 'ON_TREATMENT'
  | 'COMPLETED'
  | 'WITHDRAWN'
  | 'LOST_TO_FOLLOWUP';

export const SUBJECT_STATUSES: SubjectStatus[] = [
  'PRE_SCREENING',
  'SCREENING',
  'SCREEN_FAILURE',
  'ENROLLED',
  'RANDOMIZED',
  'ON_TREATMENT',
  'COMPLETED',
  'WITHDRAWN',
  'LOST_TO_FOLLOWUP',
];

export const SUBJECT_STATUS_TRANSITIONS: Record<SubjectStatus, SubjectStatus[]> = {
  PRE_SCREENING: ['SCREENING', 'WITHDRAWN'],
  SCREENING: ['SCREEN_FAILURE', 'ENROLLED', 'WITHDRAWN'],
  SCREEN_FAILURE: [],
  ENROLLED: ['RANDOMIZED', 'ON_TREATMENT', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  RANDOMIZED: ['ON_TREATMENT', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  ON_TREATMENT: ['COMPLETED', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'],
  COMPLETED: [],
  WITHDRAWN: [],
  LOST_TO_FOLLOWUP: ['WITHDRAWN'], // Can be reclassified as withdrawn
};

// Terminal statuses that cannot transition further
export const TERMINAL_SUBJECT_STATUSES: SubjectStatus[] = [
  'SCREEN_FAILURE',
  'COMPLETED',
  'WITHDRAWN',
];

// ============================================================================
// Demographics Types
// ============================================================================

export type Sex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export type Ethnicity = 'HISPANIC_LATINO' | 'NOT_HISPANIC_LATINO' | 'UNKNOWN' | 'NOT_REPORTED';

export type Race = 
  | 'AMERICAN_INDIAN_ALASKA_NATIVE'
  | 'ASIAN'
  | 'BLACK_AFRICAN_AMERICAN'
  | 'NATIVE_HAWAIIAN_PACIFIC_ISLANDER'
  | 'WHITE'
  | 'MULTIPLE'
  | 'OTHER'
  | 'UNKNOWN'
  | 'NOT_REPORTED';

export interface SubjectDemographics {
  dateOfBirth?: Date;
  sex?: Sex;
  race?: Race[];
  ethnicity?: Ethnicity;
  country: string;
  language?: string;
}

// ============================================================================
// Consent Types
// ============================================================================

export type ConsentType = 
  | 'MAIN'
  | 'OPTIONAL_PROCEDURE'
  | 'BIOBANK'
  | 'GENETIC'
  | 'RECONSENT'
  | 'ASSENT' // For minors
  | 'LAR'; // Legally Authorized Representative

export type ConsentStatus = 'ACTIVE' | 'WITHDRAWN' | 'SUPERSEDED' | 'EXPIRED';

export interface ConsentRecord {
  id: string;
  subjectId: string;
  consentFormId: string;
  consentFormVersion: string;
  consentType: ConsentType;
  consentDate: Date;
  status: ConsentStatus;
  
  // Signatures
  subjectSignatureDate?: Date;
  witnessName?: string;
  witnessSignatureDate?: Date;
  obtainedBy: string;
  
  // Document
  documentReference?: string;
  
  // Withdrawal
  withdrawalDate?: Date;
  withdrawalReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Eligibility Types
// ============================================================================

export type CriterionType = 'INCLUSION' | 'EXCLUSION';

export interface EligibilityCriterion {
  id: string;
  type: CriterionType;
  criterionNumber: number;
  description: string;
  category?: string; // e.g., 'Demographics', 'Medical History', 'Laboratory'
  isRequired: boolean;
}

export interface EligibilityAssessment {
  criterionId: string;
  met: boolean | null; // null = not yet assessed
  value?: string;
  assessedAt?: Date;
  assessedBy?: string;
  notes?: string;
}

export interface EligibilityResult {
  subjectId: string;
  assessments: EligibilityAssessment[];
  isEligible: boolean;
  failedCriteria: string[]; // Criterion IDs
  assessedAt: Date;
  assessedBy: string;
}

// ============================================================================
// Withdrawal Types
// ============================================================================

export type WithdrawalReason = 
  | 'SUBJECT_DECISION'
  | 'ADVERSE_EVENT'
  | 'LACK_OF_EFFICACY'
  | 'PROTOCOL_VIOLATION'
  | 'PHYSICIAN_DECISION'
  | 'LOST_TO_FOLLOWUP'
  | 'DEATH'
  | 'SPONSOR_DECISION'
  | 'OTHER';

export interface WithdrawalInfo {
  date: Date;
  reason: WithdrawalReason;
  reasonDetail?: string;
  reportedBy: string;
  
  // Follow-up
  continueFollowUp: boolean;
  lastContactDate?: Date;
  
  // For AE-related withdrawals
  relatedAdverseEventId?: string;
}

// ============================================================================
// Subject Visit Reference (minimal, full in clinical-visit.ts)
// ============================================================================

export interface SubjectVisitRef {
  id: string;
  protocolVisitId: string;
  visitName: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'PARTIALLY_COMPLETE';
}

// ============================================================================
// Clinical Subject
// ============================================================================

export interface ClinicalSubject {
  id: string;
  studyId: string;
  siteId: string;
  tenantId: string;
  
  // Identifiers
  subjectNumber: string; // Site-assigned
  screeningNumber?: string;
  randomizationNumber?: string;
  
  // Assignment
  armId?: string;
  cohortId?: string;
  stratumId?: string;
  
  // Status
  status: SubjectStatus;
  statusReason?: string;
  
  // Key dates
  consentDate?: Date;
  screeningDate?: Date;
  enrollmentDate?: Date;
  randomizationDate?: Date;
  treatmentStartDate?: Date;
  treatmentEndDate?: Date;
  completionDate?: Date;
  
  // Withdrawal
  withdrawal?: WithdrawalInfo;
  
  // Demographics
  demographics: SubjectDemographics;
  
  // Consent
  consents: ConsentRecord[];
  
  // Eligibility
  eligibilityResult?: EligibilityResult;
  
  // Visits (references only, full data in visit records)
  visits: SubjectVisitRef[];
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Subject Creation/Update Config
// ============================================================================

export interface CreateSubjectConfig {
  studyId: string;
  siteId: string;
  tenantId: string;
  subjectNumber?: string; // Auto-generated if not provided
  demographics: SubjectDemographics;
  createdBy: string;
}

export interface SubjectFilters {
  studyId?: string;
  siteId?: string;
  tenantId?: string;
  status?: SubjectStatus[];
  armId?: string;
  hasConsent?: boolean;
  isRandomized?: boolean;
  enrolledAfter?: Date;
  enrolledBefore?: Date;
  searchTerm?: string;
}

// ============================================================================
// Screening Types
// ============================================================================

export interface ScreeningData {
  subjectId: string;
  screeningNumber: string;
  screeningDate: Date;
  eligibilityAssessments: EligibilityAssessment[];
  screenedBy: string;
}

export interface ScreeningResult {
  subjectId: string;
  isEligible: boolean;
  screeningNumber: string;
  failureReasons?: string[];
  notes?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSubjectStatus(value: unknown): value is SubjectStatus {
  return typeof value === 'string' && SUBJECT_STATUSES.includes(value as SubjectStatus);
}

export function isValidSubjectStatusTransition(from: SubjectStatus, to: SubjectStatus): boolean {
  return SUBJECT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalStatus(status: SubjectStatus): boolean {
  return TERMINAL_SUBJECT_STATUSES.includes(status);
}

export function isSex(value: unknown): value is Sex {
  const validValues: Sex[] = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
  return typeof value === 'string' && validValues.includes(value as Sex);
}

export function isEthnicity(value: unknown): value is Ethnicity {
  const validValues: Ethnicity[] = ['HISPANIC_LATINO', 'NOT_HISPANIC_LATINO', 'UNKNOWN', 'NOT_REPORTED'];
  return typeof value === 'string' && validValues.includes(value as Ethnicity);
}

export function isConsentType(value: unknown): value is ConsentType {
  const validValues: ConsentType[] = ['MAIN', 'OPTIONAL_PROCEDURE', 'BIOBANK', 'GENETIC', 'RECONSENT', 'ASSENT', 'LAR'];
  return typeof value === 'string' && validValues.includes(value as ConsentType);
}

export function isWithdrawalReason(value: unknown): value is WithdrawalReason {
  const validValues: WithdrawalReason[] = [
    'SUBJECT_DECISION', 'ADVERSE_EVENT', 'LACK_OF_EFFICACY', 'PROTOCOL_VIOLATION',
    'PHYSICIAN_DECISION', 'LOST_TO_FOLLOWUP', 'DEATH', 'SPONSOR_DECISION', 'OTHER',
  ];
  return typeof value === 'string' && validValues.includes(value as WithdrawalReason);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createSubjectDemographics(params: {
  country: string;
  dateOfBirth?: Date;
  sex?: Sex;
  race?: Race[];
  ethnicity?: Ethnicity;
  language?: string;
}): SubjectDemographics {
  return {
    country: params.country,
    dateOfBirth: params.dateOfBirth,
    sex: params.sex,
    race: params.race,
    ethnicity: params.ethnicity,
    language: params.language,
  };
}

export function createConsentRecord(params: {
  id?: string;
  subjectId: string;
  consentFormId: string;
  consentFormVersion: string;
  consentType: ConsentType;
  consentDate: Date;
  obtainedBy: string;
  witnessName?: string;
}): ConsentRecord {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    subjectId: params.subjectId,
    consentFormId: params.consentFormId,
    consentFormVersion: params.consentFormVersion,
    consentType: params.consentType,
    consentDate: params.consentDate,
    status: 'ACTIVE',
    subjectSignatureDate: params.consentDate,
    witnessName: params.witnessName,
    witnessSignatureDate: params.witnessName ? params.consentDate : undefined,
    obtainedBy: params.obtainedBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function createClinicalSubject(config: CreateSubjectConfig): ClinicalSubject {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    studyId: config.studyId,
    siteId: config.siteId,
    tenantId: config.tenantId,
    subjectNumber: config.subjectNumber ?? generateSubjectNumber(),
    status: 'PRE_SCREENING',
    demographics: config.demographics,
    consents: [],
    visits: [],
    createdAt: now,
    createdBy: config.createdBy,
    updatedAt: now,
    updatedBy: config.createdBy,
  };
}

function generateSubjectNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `S-${timestamp}-${random}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getSubjectStatusDisplayName(status: SubjectStatus): string {
  const displayNames: Record<SubjectStatus, string> = {
    PRE_SCREENING: 'Pre-Screening',
    SCREENING: 'Screening',
    SCREEN_FAILURE: 'Screen Failure',
    ENROLLED: 'Enrolled',
    RANDOMIZED: 'Randomized',
    ON_TREATMENT: 'On Treatment',
    COMPLETED: 'Completed',
    WITHDRAWN: 'Withdrawn',
    LOST_TO_FOLLOWUP: 'Lost to Follow-up',
  };
  return displayNames[status];
}

export function getWithdrawalReasonDisplayName(reason: WithdrawalReason): string {
  const displayNames: Record<WithdrawalReason, string> = {
    SUBJECT_DECISION: 'Subject Decision',
    ADVERSE_EVENT: 'Adverse Event',
    LACK_OF_EFFICACY: 'Lack of Efficacy',
    PROTOCOL_VIOLATION: 'Protocol Violation',
    PHYSICIAN_DECISION: 'Physician Decision',
    LOST_TO_FOLLOWUP: 'Lost to Follow-up',
    DEATH: 'Death',
    SPONSOR_DECISION: 'Sponsor Decision',
    OTHER: 'Other',
  };
  return displayNames[reason];
}

export function hasActiveConsent(subject: ClinicalSubject): boolean {
  return subject.consents.some(c => c.consentType === 'MAIN' && c.status === 'ACTIVE');
}

export function getActiveConsents(subject: ClinicalSubject): ConsentRecord[] {
  return subject.consents.filter(c => c.status === 'ACTIVE');
}

export function isSubjectRandomized(subject: ClinicalSubject): boolean {
  return subject.randomizationNumber !== undefined && subject.randomizationDate !== undefined;
}

export function isSubjectOnStudy(subject: ClinicalSubject): boolean {
  return ['ENROLLED', 'RANDOMIZED', 'ON_TREATMENT'].includes(subject.status);
}

export function isSubjectCompleted(subject: ClinicalSubject): boolean {
  return subject.status === 'COMPLETED';
}

export function isSubjectDiscontinued(subject: ClinicalSubject): boolean {
  return ['WITHDRAWN', 'LOST_TO_FOLLOWUP', 'SCREEN_FAILURE'].includes(subject.status);
}

export function calculateSubjectAge(subject: ClinicalSubject, asOfDate?: Date): number | null {
  if (!subject.demographics.dateOfBirth) return null;
  
  const referenceDate = asOfDate ?? new Date();
  const birthDate = new Date(subject.demographics.dateOfBirth);
  
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function getSubjectStudyDuration(subject: ClinicalSubject): number | null {
  const startDate = subject.enrollmentDate ?? subject.consentDate;
  if (!startDate) return null;
  
  const endDate = subject.completionDate ?? subject.withdrawal?.date ?? new Date();
  
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
