
/**
 * Subject Management Service
 * Clinical subject/participant lifecycle management
 * @version 0.20.2.2
 */

import type {
  ClinicalSubject,
  CreateSubjectConfig,
  SubjectFilters,
  SubjectStatus,
  SubjectDemographics,
  ConsentRecord,
  ConsentType,
  ConsentStatus,
  EligibilityAssessment,
  EligibilityResult,
  EligibilityCriterion,
  WithdrawalInfo,
  WithdrawalReason,
  SubjectVisitRef,
  ScreeningData,
  ScreeningResult,
} from '@/types/clinical-subject';
import {
  createClinicalSubject,
  createConsentRecord,
  isValidSubjectStatusTransition,
  isTerminalStatus,
  hasActiveConsent,
  isSubjectRandomized,
  SUBJECT_STATUS_TRANSITIONS,
} from '@/types/clinical-subject';

// ============================================================================
// Service Configuration
// ============================================================================

export interface SubjectManagementServiceConfig {
  tenantId: string;
  requireConsentForScreening?: boolean;
  requireEligibilityForEnrollment?: boolean;
  autoGenerateSubjectNumber?: boolean;
  subjectNumberPrefix?: string;
  screeningNumberPrefix?: string;
  randomizationNumberPrefix?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface SubjectValidationResult {
  isValid: boolean;
  errors: SubjectValidationError[];
  warnings: SubjectValidationWarning[];
}

export interface SubjectValidationError {
  code: string;
  field: string;
  message: string;
}

export interface SubjectValidationWarning {
  code: string;
  field: string;
  message: string;
  recommendation?: string;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface SubjectMetrics {
  subjectId: string;
  studyId: string;
  siteId: string;
  daysOnStudy: number | null;
  daysInCurrentStatus: number;
  visitsCompleted: number;
  visitsMissed: number;
  visitComplianceRate: number;
  protocolDeviations: number;
  consentVersion: string | null;
}

export interface StudySubjectStats {
  totalSubjects: number;
  byStatus: Record<SubjectStatus, number>;
  bySite: Record<string, number>;
  screenedCount: number;
  enrolledCount: number;
  randomizedCount: number;
  completedCount: number;
  withdrawnCount: number;
  screenFailureRate: number;
  withdrawalRate: number;
  averageDaysOnStudy: number;
}

export interface EnrollmentSummary {
  siteId: string;
  siteName?: string;
  screened: number;
  screenFailures: number;
  enrolled: number;
  randomized: number;
  active: number;
  completed: number;
  withdrawn: number;
  screenFailureRate: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface ISubjectManagementService {
  // Subject CRUD
  createSubject(config: CreateSubjectConfig): Promise<ClinicalSubject>;
  getSubject(subjectId: string): Promise<ClinicalSubject | null>;
  updateSubject(subjectId: string, updates: Partial<ClinicalSubject>, updatedBy: string): Promise<ClinicalSubject>;
  listSubjects(filters?: SubjectFilters): Promise<ClinicalSubject[]>;
  deleteSubject(subjectId: string): Promise<void>;
  
  // Status Transitions
  startScreening(subjectId: string, screeningNumber: string, updatedBy: string): Promise<ClinicalSubject>;
  failScreening(subjectId: string, reasons: string[], updatedBy: string): Promise<ClinicalSubject>;
  enrollSubject(subjectId: string, updatedBy: string): Promise<ClinicalSubject>;
  randomizeSubject(subjectId: string, randomizationNumber: string, armId: string, updatedBy: string): Promise<ClinicalSubject>;
  startTreatment(subjectId: string, updatedBy: string): Promise<ClinicalSubject>;
  completeSubject(subjectId: string, updatedBy: string): Promise<ClinicalSubject>;
  withdrawSubject(subjectId: string, withdrawal: Omit<WithdrawalInfo, 'date'>, updatedBy: string): Promise<ClinicalSubject>;
  markLostToFollowup(subjectId: string, lastContactDate: Date, updatedBy: string): Promise<ClinicalSubject>;
  
  // Consent Management
  addConsent(subjectId: string, consent: Omit<ConsentRecord, 'id' | 'subjectId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ConsentRecord>;
  withdrawConsent(subjectId: string, consentId: string, reason: string, updatedBy: string): Promise<ConsentRecord>;
  reconsent(subjectId: string, originalConsentId: string, newConsent: Omit<ConsentRecord, 'id' | 'subjectId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ConsentRecord>;
  getActiveConsents(subjectId: string): Promise<ConsentRecord[]>;
  
  // Eligibility
  setEligibilityCriteria(studyId: string, criteria: EligibilityCriterion[]): void;
  assessEligibility(subjectId: string, assessments: EligibilityAssessment[], assessedBy: string): Promise<EligibilityResult>;
  getEligibilityResult(subjectId: string): Promise<EligibilityResult | null>;
  
  // Demographics
  updateDemographics(subjectId: string, demographics: Partial<SubjectDemographics>, updatedBy: string): Promise<ClinicalSubject>;
  
  // Visit Management (references)
  addVisitReference(subjectId: string, visit: SubjectVisitRef): Promise<ClinicalSubject>;
  updateVisitReference(subjectId: string, visitId: string, updates: Partial<SubjectVisitRef>): Promise<ClinicalSubject>;
  
  // Validation & Metrics
  validateSubject(subjectId: string): Promise<SubjectValidationResult>;
  getSubjectMetrics(subjectId: string): Promise<SubjectMetrics>;
  getStudyStatistics(studyId: string): StudySubjectStats;
  getEnrollmentSummary(studyId: string): EnrollmentSummary[];
  
  // Queries
  getSubjectsByStatus(studyId: string, statuses: SubjectStatus[]): Promise<ClinicalSubject[]>;
  getSubjectsNeedingAttention(studyId: string): {
    pendingConsent: ClinicalSubject[];
    pendingEligibility: ClinicalSubject[];
    missedVisits: ClinicalSubject[];
    expiringConsent: ClinicalSubject[];
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

export class SubjectManagementService implements ISubjectManagementService {
  private config: Required<SubjectManagementServiceConfig>;
  private subjects: Map<string, ClinicalSubject> = new Map();
  private eligibilityCriteria: Map<string, EligibilityCriterion[]> = new Map();
  private subjectCounters: Map<string, number> = new Map(); // siteId -> counter
  
  constructor(config: SubjectManagementServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      requireConsentForScreening: config.requireConsentForScreening ?? true,
      requireEligibilityForEnrollment: config.requireEligibilityForEnrollment ?? true,
      autoGenerateSubjectNumber: config.autoGenerateSubjectNumber ?? true,
      subjectNumberPrefix: config.subjectNumberPrefix ?? 'S',
      screeningNumberPrefix: config.screeningNumberPrefix ?? 'SCR',
      randomizationNumberPrefix: config.randomizationNumberPrefix ?? 'R',
    };
  }
  
  // ===========================================================================
  // Subject CRUD
  // ===========================================================================
  
  async createSubject(config: CreateSubjectConfig): Promise<ClinicalSubject> {
    // Validate tenant
    if (config.tenantId !== this.config.tenantId) {
      throw new Error('Tenant ID mismatch');
    }
    
    // Validate required fields
    if (!config.studyId?.trim()) {
      throw new Error('Study ID is required');
    }
    if (!config.siteId?.trim()) {
      throw new Error('Site ID is required');
    }
    if (!config.demographics?.country?.trim()) {
      throw new Error('Country is required in demographics');
    }
    
    // Generate subject number if not provided
    let subjectNumber = config.subjectNumber;
    if (!subjectNumber && this.config.autoGenerateSubjectNumber) {
      subjectNumber = this.generateSubjectNumber(config.siteId);
    }
    if (!subjectNumber?.trim()) {
      throw new Error('Subject number is required');
    }
    
    // Check for duplicate subject number within site
    for (const subject of Array.from(Array.from(this.subjects.values()))) {
      if (subject.siteId === config.siteId && subject.subjectNumber === subjectNumber) {
        throw new Error(`Subject number ${subjectNumber} already exists at this site`);
      }
    }
    
    // Create subject
    const subject = createClinicalSubject({
      ...config,
      subjectNumber,
    });
    this.subjects.set(subject.id, subject);
    
    return subject;
  }
  
  async getSubject(subjectId: string): Promise<ClinicalSubject | null> {
    return this.subjects.get(subjectId) ?? null;
  }
  
  async updateSubject(
    subjectId: string,
    updates: Partial<ClinicalSubject>,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Prevent updating immutable fields
    const immutableFields = ['id', 'studyId', 'siteId', 'tenantId', 'createdAt', 'createdBy'];
    for (const field of Array.from(immutableFields)) {
      if (field in updates) {
        throw new Error(`Cannot update immutable field: ${field}`);
      }
    }
    
    // Prevent direct status updates (use transition methods)
    if ('status' in updates && updates.status !== subject.status) {
      throw new Error('Use status transition methods to change subject status');
    }
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      ...updates,
      id: subject.id,
      studyId: subject.studyId,
      siteId: subject.siteId,
      tenantId: subject.tenantId,
      createdAt: subject.createdAt,
      createdBy: subject.createdBy,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return updatedSubject;
  }
  
  async listSubjects(filters?: SubjectFilters): Promise<ClinicalSubject[]> {
    let subjects = Array.from(this.subjects.values());
    
    // Always filter by tenant
    subjects = subjects.filter(s => s.tenantId === this.config.tenantId);
    
    if (!filters) return subjects;
    
    if (filters.studyId) {
      subjects = subjects.filter(s => s.studyId === filters.studyId);
    }
    
    if (filters.siteId) {
      subjects = subjects.filter(s => s.siteId === filters.siteId);
    }
    
    if (filters.status && filters.status.length > 0) {
      subjects = subjects.filter(s => filters.status!.includes(s.status));
    }
    
    if (filters.armId) {
      subjects = subjects.filter(s => s.armId === filters.armId);
    }
    
    if (filters.hasConsent !== undefined) {
      subjects = subjects.filter(s => hasActiveConsent(s) === filters.hasConsent);
    }
    
    if (filters.isRandomized !== undefined) {
      subjects = subjects.filter(s => isSubjectRandomized(s) === filters.isRandomized);
    }
    
    if (filters.enrolledAfter) {
      subjects = subjects.filter(s => 
        s.enrollmentDate && s.enrollmentDate >= filters.enrolledAfter!
      );
    }
    
    if (filters.enrolledBefore) {
      subjects = subjects.filter(s => 
        s.enrollmentDate && s.enrollmentDate <= filters.enrolledBefore!
      );
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      subjects = subjects.filter(s =>
        s.subjectNumber.toLowerCase().includes(term) ||
        s.screeningNumber?.toLowerCase().includes(term) ||
        s.randomizationNumber?.toLowerCase().includes(term)
      );
    }
    
    return subjects;
  }
  
  async deleteSubject(subjectId: string): Promise<void> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Only allow deletion of PRE_SCREENING subjects
    if (subject.status !== 'PRE_SCREENING') {
      throw new Error('Can only delete subjects in PRE_SCREENING status');
    }
    
    this.subjects.delete(subjectId);
  }
  
  // ===========================================================================
  // Status Transitions
  // ===========================================================================
  
  private transitionStatus(
    subject: ClinicalSubject,
    newStatus: SubjectStatus,
    updatedBy: string,
    additionalUpdates?: Partial<ClinicalSubject>
  ): ClinicalSubject {
    if (!isValidSubjectStatusTransition(subject.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${subject.status} → ${newStatus}. ` +
        `Allowed transitions: ${SUBJECT_STATUS_TRANSITIONS[subject.status].join(', ') || 'none'}`
      );
    }
    
    const updated: ClinicalSubject = {
      ...subject,
      ...additionalUpdates,
      status: newStatus,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.subjects.set(subject.id, updated);
    return updated;
  }
  
  async startScreening(
    subjectId: string,
    screeningNumber: string,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Validate screening number
    if (!screeningNumber?.trim()) {
      throw new Error('Screening number is required');
    }
    
    // Check for duplicate screening number in study
    for (const s of Array.from(Array.from(this.subjects.values()))) {
      if (s.studyId === subject.studyId && s.screeningNumber === screeningNumber && s.id !== subjectId) {
        throw new Error(`Screening number ${screeningNumber} already exists in this study`);
      }
    }
    
    // Check consent requirement
    if (this.config.requireConsentForScreening && !hasActiveConsent(subject)) {
      throw new Error('Active consent is required before screening');
    }
    
    return this.transitionStatus(subject, 'SCREENING', updatedBy, {
      screeningNumber,
      screeningDate: new Date(),
    });
  }
  
  async failScreening(
    subjectId: string,
    reasons: string[],
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    if (subject.status !== 'SCREENING') {
      throw new Error('Subject must be in SCREENING status to fail screening');
    }
    
    return this.transitionStatus(subject, 'SCREEN_FAILURE', updatedBy, {
      statusReason: reasons.join('; '),
    });
  }
  
  async enrollSubject(subjectId: string, updatedBy: string): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Check eligibility requirement
    if (this.config.requireEligibilityForEnrollment) {
      if (!subject.eligibilityResult?.isEligible) {
        throw new Error('Subject must pass eligibility assessment before enrollment');
      }
    }
    
    // Check consent
    if (!hasActiveConsent(subject)) {
      throw new Error('Active consent is required for enrollment');
    }
    
    return this.transitionStatus(subject, 'ENROLLED', updatedBy, {
      enrollmentDate: new Date(),
    });
  }
  
  async randomizeSubject(
    subjectId: string,
    randomizationNumber: string,
    armId: string,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Validate inputs
    if (!randomizationNumber?.trim()) {
      throw new Error('Randomization number is required');
    }
    if (!armId?.trim()) {
      throw new Error('Arm ID is required');
    }
    
    // Check for duplicate randomization number in study
    for (const s of Array.from(Array.from(this.subjects.values()))) {
      if (s.studyId === subject.studyId && s.randomizationNumber === randomizationNumber && s.id !== subjectId) {
        throw new Error(`Randomization number ${randomizationNumber} already exists in this study`);
      }
    }
    
    return this.transitionStatus(subject, 'RANDOMIZED', updatedBy, {
      randomizationNumber,
      randomizationDate: new Date(),
      armId,
    });
  }
  
  async startTreatment(subjectId: string, updatedBy: string): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    return this.transitionStatus(subject, 'ON_TREATMENT', updatedBy, {
      treatmentStartDate: new Date(),
    });
  }
  
  async completeSubject(subjectId: string, updatedBy: string): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    return this.transitionStatus(subject, 'COMPLETED', updatedBy, {
      completionDate: new Date(),
      treatmentEndDate: subject.treatmentStartDate ? new Date() : undefined,
    });
  }
  
  async withdrawSubject(
    subjectId: string,
    withdrawal: Omit<WithdrawalInfo, 'date'>,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    if (isTerminalStatus(subject.status)) {
      throw new Error(`Cannot withdraw subject in terminal status: ${subject.status}`);
    }
    
    const withdrawalInfo: WithdrawalInfo = {
      ...withdrawal,
      date: new Date(),
    };
    
    return this.transitionStatus(subject, 'WITHDRAWN', updatedBy, {
      withdrawal: withdrawalInfo,
      treatmentEndDate: subject.treatmentStartDate ? new Date() : undefined,
    });
  }
  
  async markLostToFollowup(
    subjectId: string,
    lastContactDate: Date,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Create withdrawal info for LTFU
    const withdrawal: WithdrawalInfo = {
      date: new Date(),
      reason: 'LOST_TO_FOLLOWUP',
      reportedBy: updatedBy,
      continueFollowUp: false,
      lastContactDate,
    };
    
    return this.transitionStatus(subject, 'LOST_TO_FOLLOWUP', updatedBy, {
      withdrawal,
    });
  }
  
  // ===========================================================================
  // Consent Management
  // ===========================================================================
  
  async addConsent(
    subjectId: string,
    consent: Omit<ConsentRecord, 'id' | 'subjectId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<ConsentRecord> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Validate consent form info
    if (!consent.consentFormId?.trim()) {
      throw new Error('Consent form ID is required');
    }
    if (!consent.consentFormVersion?.trim()) {
      throw new Error('Consent form version is required');
    }
    if (!consent.obtainedBy?.trim()) {
      throw new Error('Obtained by is required');
    }
    
    // Check if there's already an active consent of this type
    const existingActive = subject.consents.find(
      c => c.consentType === consent.consentType && c.status === 'ACTIVE'
    );
    if (existingActive && consent.consentType === 'MAIN') {
      throw new Error('Subject already has an active main consent. Use reconsent() instead.');
    }
    
    const consentRecord = createConsentRecord({
      subjectId,
      consentFormId: consent.consentFormId,
      consentFormVersion: consent.consentFormVersion,
      consentType: consent.consentType,
      consentDate: consent.consentDate,
      obtainedBy: consent.obtainedBy,
      witnessName: consent.witnessName,
    });
    
    // Add document reference if provided
    if (consent.documentReference) {
      consentRecord.documentReference = consent.documentReference;
    }
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      consents: [...subject.consents, consentRecord],
      consentDate: subject.consentDate ?? consent.consentDate,
      updatedAt: new Date(),
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return consentRecord;
  }
  
  async withdrawConsent(
    subjectId: string,
    consentId: string,
    reason: string,
    updatedBy: string
  ): Promise<ConsentRecord> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const consentIndex = subject.consents.findIndex(c => c.id === consentId);
    if (consentIndex === -1) {
      throw new Error(`Consent not found: ${consentId}`);
    }
    
    const consent = subject.consents[consentIndex];
    if (consent.status !== 'ACTIVE') {
      throw new Error('Can only withdraw active consents');
    }
    
    const updatedConsent: ConsentRecord = {
      ...consent,
      status: 'WITHDRAWN',
      withdrawalDate: new Date(),
      withdrawalReason: reason,
      updatedAt: new Date(),
    };
    
    const updatedConsents = [...subject.consents];
    updatedConsents[consentIndex] = updatedConsent;
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      consents: updatedConsents,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return updatedConsent;
  }
  
  async reconsent(
    subjectId: string,
    originalConsentId: string,
    newConsent: Omit<ConsentRecord, 'id' | 'subjectId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<ConsentRecord> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const originalIndex = subject.consents.findIndex(c => c.id === originalConsentId);
    if (originalIndex === -1) {
      throw new Error(`Original consent not found: ${originalConsentId}`);
    }
    
    const originalConsent = subject.consents[originalIndex];
    if (originalConsent.status !== 'ACTIVE') {
      throw new Error('Can only reconsent from an active consent');
    }
    
    // Mark original as superseded
    const supersededConsent: ConsentRecord = {
      ...originalConsent,
      status: 'SUPERSEDED',
      updatedAt: new Date(),
    };
    
    // Create new consent record
    const reconsentRecord = createConsentRecord({
      subjectId,
      consentFormId: newConsent.consentFormId,
      consentFormVersion: newConsent.consentFormVersion,
      consentType: 'RECONSENT',
      consentDate: newConsent.consentDate,
      obtainedBy: newConsent.obtainedBy,
      witnessName: newConsent.witnessName,
    });
    
    if (newConsent.documentReference) {
      reconsentRecord.documentReference = newConsent.documentReference;
    }
    
    const updatedConsents = [...subject.consents];
    updatedConsents[originalIndex] = supersededConsent;
    updatedConsents.push(reconsentRecord);
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      consents: updatedConsents,
      updatedAt: new Date(),
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return reconsentRecord;
  }
  
  async getActiveConsents(subjectId: string): Promise<ConsentRecord[]> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    return subject.consents.filter(c => c.status === 'ACTIVE');
  }
  
  // ===========================================================================
  // Eligibility
  // ===========================================================================
  
  setEligibilityCriteria(studyId: string, criteria: EligibilityCriterion[]): void {
    this.eligibilityCriteria.set(studyId, criteria);
  }
  
  async assessEligibility(
    subjectId: string,
    assessments: EligibilityAssessment[],
    assessedBy: string
  ): Promise<EligibilityResult> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const criteria = this.eligibilityCriteria.get(subject.studyId);
    if (!criteria || criteria.length === 0) {
      throw new Error('No eligibility criteria defined for this study');
    }
    
    // Validate all required criteria are assessed
    const requiredCriteriaIds = criteria.filter(c => c.isRequired).map(c => c.id);
    const assessedCriteriaIds = assessments.map(a => a.criterionId);
    
    for (const requiredId of Array.from(requiredCriteriaIds)) {
      if (!assessedCriteriaIds.includes(requiredId)) {
        throw new Error(`Required criterion not assessed: ${requiredId}`);
      }
    }
    
    // Determine eligibility
    const failedCriteria: string[] = [];
    
    for (const assessment of Array.from(assessments)) {
      const criterion = criteria.find(c => c.id === assessment.criterionId);
      if (!criterion) continue;
      
      if (criterion.type === 'INCLUSION' && assessment.met === false) {
        failedCriteria.push(assessment.criterionId);
      } else if (criterion.type === 'EXCLUSION' && assessment.met === true) {
        failedCriteria.push(assessment.criterionId);
      }
    }
    
    const result: EligibilityResult = {
      subjectId,
      assessments,
      isEligible: failedCriteria.length === 0,
      failedCriteria,
      assessedAt: new Date(),
      assessedBy,
    };
    
    // Update subject with eligibility result
    const updatedSubject: ClinicalSubject = {
      ...subject,
      eligibilityResult: result,
      updatedAt: new Date(),
      updatedBy: assessedBy,
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return result;
  }
  
  async getEligibilityResult(subjectId: string): Promise<EligibilityResult | null> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    return subject.eligibilityResult ?? null;
  }
  
  // ===========================================================================
  // Demographics
  // ===========================================================================
  
  async updateDemographics(
    subjectId: string,
    demographics: Partial<SubjectDemographics>,
    updatedBy: string
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const updatedDemographics: SubjectDemographics = {
      ...subject.demographics,
      ...demographics,
    };
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      demographics: updatedDemographics,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return updatedSubject;
  }
  
  // ===========================================================================
  // Visit Management
  // ===========================================================================
  
  async addVisitReference(subjectId: string, visit: SubjectVisitRef): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Check for duplicate visit ID
    if (subject.visits.some(v => v.id === visit.id)) {
      throw new Error(`Visit reference already exists: ${visit.id}`);
    }
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      visits: [...subject.visits, visit],
      updatedAt: new Date(),
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return updatedSubject;
  }
  
  async updateVisitReference(
    subjectId: string,
    visitId: string,
    updates: Partial<SubjectVisitRef>
  ): Promise<ClinicalSubject> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const visitIndex = subject.visits.findIndex(v => v.id === visitId);
    if (visitIndex === -1) {
      throw new Error(`Visit reference not found: ${visitId}`);
    }
    
    const updatedVisits = [...subject.visits];
    updatedVisits[visitIndex] = {
      ...updatedVisits[visitIndex],
      ...updates,
    };
    
    const updatedSubject: ClinicalSubject = {
      ...subject,
      visits: updatedVisits,
      updatedAt: new Date(),
    };
    
    this.subjects.set(subjectId, updatedSubject);
    return updatedSubject;
  }
  
  // ===========================================================================
  // Validation & Metrics
  // ===========================================================================
  
  async validateSubject(subjectId: string): Promise<SubjectValidationResult> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    const errors: SubjectValidationError[] = [];
    const warnings: SubjectValidationWarning[] = [];
    
    // Check consent
    if (!hasActiveConsent(subject)) {
      if (['SCREENING', 'ENROLLED', 'RANDOMIZED', 'ON_TREATMENT'].includes(subject.status)) {
        errors.push({
          code: 'NO_ACTIVE_CONSENT',
          field: 'consents',
          message: 'Subject must have an active consent',
        });
      } else {
        warnings.push({
          code: 'NO_CONSENT',
          field: 'consents',
          message: 'Subject has no consent recorded',
          recommendation: 'Obtain informed consent before proceeding',
        });
      }
    }
    
    // Check eligibility
    if (subject.status !== 'PRE_SCREENING' && subject.status !== 'SCREENING') {
      if (!subject.eligibilityResult) {
        warnings.push({
          code: 'NO_ELIGIBILITY_ASSESSMENT',
          field: 'eligibilityResult',
          message: 'No eligibility assessment recorded',
          recommendation: 'Complete eligibility assessment',
        });
      } else if (!subject.eligibilityResult.isEligible && subject.status !== 'SCREEN_FAILURE') {
        errors.push({
          code: 'INELIGIBLE_SUBJECT_ENROLLED',
          field: 'eligibilityResult',
          message: 'Subject enrolled despite failing eligibility',
        });
      }
    }
    
    // Check demographics completeness
    if (!subject.demographics.dateOfBirth) {
      warnings.push({
        code: 'MISSING_DOB',
        field: 'demographics.dateOfBirth',
        message: 'Date of birth not recorded',
        recommendation: 'Record date of birth for age calculations',
      });
    }
    
    if (!subject.demographics.sex) {
      warnings.push({
        code: 'MISSING_SEX',
        field: 'demographics.sex',
        message: 'Sex not recorded',
        recommendation: 'Record sex for demographic reporting',
      });
    }
    
    // Check randomization
    if (subject.status === 'RANDOMIZED' || subject.status === 'ON_TREATMENT') {
      if (!subject.randomizationNumber) {
        errors.push({
          code: 'MISSING_RANDOMIZATION_NUMBER',
          field: 'randomizationNumber',
          message: 'Randomized subject missing randomization number',
        });
      }
      if (!subject.armId) {
        errors.push({
          code: 'MISSING_ARM_ASSIGNMENT',
          field: 'armId',
          message: 'Randomized subject missing arm assignment',
        });
      }
    }
    
    // Check key dates
    if (subject.enrollmentDate && subject.screeningDate && subject.enrollmentDate < subject.screeningDate) {
      errors.push({
        code: 'INVALID_DATE_SEQUENCE',
        field: 'enrollmentDate',
        message: 'Enrollment date cannot be before screening date',
      });
    }
    
    if (subject.randomizationDate && subject.enrollmentDate && subject.randomizationDate < subject.enrollmentDate) {
      errors.push({
        code: 'INVALID_DATE_SEQUENCE',
        field: 'randomizationDate',
        message: 'Randomization date cannot be before enrollment date',
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  async getSubjectMetrics(subjectId: string): Promise<SubjectMetrics> {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject not found: ${subjectId}`);
    }
    
    // Calculate days on study
    let daysOnStudy: number | null = null;
    const startDate = subject.enrollmentDate ?? subject.consentDate;
    if (startDate) {
      const endDate = subject.completionDate ?? subject.withdrawal?.date ?? new Date();
      daysOnStudy = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Calculate days in current status
    const daysInCurrentStatus = Math.floor(
      (Date.now() - subject.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate visit compliance
    const completedVisits = subject.visits.filter(v => v.status === 'COMPLETED').length;
    const missedVisits = subject.visits.filter(v => v.status === 'MISSED').length;
    const totalScheduledVisits = subject.visits.filter(
      v => v.scheduledDate <= new Date()
    ).length;
    const visitComplianceRate = totalScheduledVisits > 0
      ? (completedVisits / totalScheduledVisits) * 100
      : 100;
    
    // Get current consent version
    const activeMainConsent = subject.consents.find(
      c => (c.consentType === 'MAIN' || c.consentType === 'RECONSENT') && c.status === 'ACTIVE'
    );
    
    return {
      subjectId,
      studyId: subject.studyId,
      siteId: subject.siteId,
      daysOnStudy,
      daysInCurrentStatus,
      visitsCompleted: completedVisits,
      visitsMissed: missedVisits,
      visitComplianceRate: Math.round(visitComplianceRate * 10) / 10,
      protocolDeviations: 0, // Would be populated from deviation tracking
      consentVersion: activeMainConsent?.consentFormVersion ?? null,
    };
  }
  
  getStudyStatistics(studyId: string): StudySubjectStats {
    const subjects = Array.from(this.subjects.values())
      .filter(s => s.tenantId === this.config.tenantId && s.studyId === studyId);
    
    const byStatus: Record<SubjectStatus, number> = {
      PRE_SCREENING: 0,
      SCREENING: 0,
      SCREEN_FAILURE: 0,
      ENROLLED: 0,
      RANDOMIZED: 0,
      ON_TREATMENT: 0,
      COMPLETED: 0,
      WITHDRAWN: 0,
      LOST_TO_FOLLOWUP: 0,
    };
    
    const bySite: Record<string, number> = {};
    let totalDaysOnStudy = 0;
    let subjectsWithDays = 0;
    
    for (const subject of Array.from(subjects)) {
      byStatus[subject.status]++;
      bySite[subject.siteId] = (bySite[subject.siteId] || 0) + 1;
      
      // Calculate days on study for average
      const startDate = subject.enrollmentDate ?? subject.consentDate;
      if (startDate) {
        const endDate = subject.completionDate ?? subject.withdrawal?.date ?? new Date();
        totalDaysOnStudy += Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        subjectsWithDays++;
      }
    }
    
    const screenedCount = subjects.filter(s => s.screeningDate).length;
    const enrolledCount = byStatus.ENROLLED + byStatus.RANDOMIZED + byStatus.ON_TREATMENT + 
                          byStatus.COMPLETED + byStatus.WITHDRAWN + byStatus.LOST_TO_FOLLOWUP -
                          subjects.filter(s => s.status === 'WITHDRAWN' && !s.enrollmentDate).length -
                          subjects.filter(s => s.status === 'LOST_TO_FOLLOWUP' && !s.enrollmentDate).length;
    const randomizedCount = subjects.filter(s => s.randomizationNumber).length;
    const completedCount = byStatus.COMPLETED;
    const withdrawnCount = byStatus.WITHDRAWN + byStatus.LOST_TO_FOLLOWUP;
    
    const screenFailureRate = screenedCount > 0
      ? (byStatus.SCREEN_FAILURE / screenedCount) * 100
      : 0;
    
    const withdrawalRate = enrolledCount > 0
      ? (withdrawnCount / enrolledCount) * 100
      : 0;
    
    const averageDaysOnStudy = subjectsWithDays > 0
      ? Math.round(totalDaysOnStudy / subjectsWithDays)
      : 0;
    
    return {
      totalSubjects: subjects.length,
      byStatus,
      bySite,
      screenedCount,
      enrolledCount,
      randomizedCount,
      completedCount,
      withdrawnCount,
      screenFailureRate: Math.round(screenFailureRate * 10) / 10,
      withdrawalRate: Math.round(withdrawalRate * 10) / 10,
      averageDaysOnStudy,
    };
  }
  
  getEnrollmentSummary(studyId: string): EnrollmentSummary[] {
    const subjects = Array.from(this.subjects.values())
      .filter(s => s.tenantId === this.config.tenantId && s.studyId === studyId);
    
    // Group by site
    const bySite = new Map<string, ClinicalSubject[]>();
    for (const subject of Array.from(subjects)) {
      const siteSubjects = bySite.get(subject.siteId) ?? [];
      siteSubjects.push(subject);
      bySite.set(subject.siteId, siteSubjects);
    }
    
    const summaries: EnrollmentSummary[] = [];
    
    for (const [siteId, siteSubjects] of Array.from(bySite)) {
      const screened = siteSubjects.filter(s => s.screeningDate).length;
      const screenFailures = siteSubjects.filter(s => s.status === 'SCREEN_FAILURE').length;
      const enrolled = siteSubjects.filter(s => s.enrollmentDate).length;
      const randomized = siteSubjects.filter(s => s.randomizationNumber).length;
      const active = siteSubjects.filter(s => 
        ['ENROLLED', 'RANDOMIZED', 'ON_TREATMENT'].includes(s.status)
      ).length;
      const completed = siteSubjects.filter(s => s.status === 'COMPLETED').length;
      const withdrawn = siteSubjects.filter(s => 
        ['WITHDRAWN', 'LOST_TO_FOLLOWUP'].includes(s.status) && s.enrollmentDate
      ).length;
      
      summaries.push({
        siteId,
        screened,
        screenFailures,
        enrolled,
        randomized,
        active,
        completed,
        withdrawn,
        screenFailureRate: screened > 0 ? Math.round((screenFailures / screened) * 1000) / 10 : 0,
      });
    }
    
    return summaries;
  }
  
  // ===========================================================================
  // Queries
  // ===========================================================================
  
  async getSubjectsByStatus(
    studyId: string,
    statuses: SubjectStatus[]
  ): Promise<ClinicalSubject[]> {
    return this.listSubjects({ studyId, status: statuses });
  }
  
  getSubjectsNeedingAttention(studyId: string): {
    pendingConsent: ClinicalSubject[];
    pendingEligibility: ClinicalSubject[];
    missedVisits: ClinicalSubject[];
    expiringConsent: ClinicalSubject[];
  } {
    const subjects = Array.from(this.subjects.values())
      .filter(s => s.tenantId === this.config.tenantId && s.studyId === studyId);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Subjects without consent in active screening statuses
    const pendingConsent = subjects.filter(s =>
      s.status === 'PRE_SCREENING' && !hasActiveConsent(s)
    );
    
    // Subjects in screening without eligibility result
    const pendingEligibility = subjects.filter(s =>
      s.status === 'SCREENING' && !s.eligibilityResult
    );
    
    // Subjects with missed visits
    const missedVisits = subjects.filter(s =>
      s.visits.some(v => v.status === 'MISSED')
    );
    
    // This would require consent expiration tracking - placeholder for now
    const expiringConsent: ClinicalSubject[] = [];
    
    return {
      pendingConsent,
      pendingEligibility,
      missedVisits,
      expiringConsent,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  private generateSubjectNumber(siteId: string): string {
    const counter = this.subjectCounters.get(siteId) ?? 0;
    this.subjectCounters.set(siteId, counter + 1);
    return `${this.config.subjectNumberPrefix}-${(counter + 1).toString().padStart(4, '0')}`;
  }
  
  generateScreeningNumber(studyId: string): string {
    const subjects = Array.from(this.subjects.values())
      .filter(s => s.studyId === studyId && s.screeningNumber);
    const maxNum = subjects.reduce((max, s) => {
      const num = parseInt(s.screeningNumber?.replace(/\D/g, '') ?? '0', 10);
      return num > max ? num : max;
    }, 0);
    return `${this.config.screeningNumberPrefix}-${(maxNum + 1).toString().padStart(4, '0')}`;
  }
  
  generateRandomizationNumber(studyId: string): string {
    const subjects = Array.from(this.subjects.values())
      .filter(s => s.studyId === studyId && s.randomizationNumber);
    const maxNum = subjects.reduce((max, s) => {
      const num = parseInt(s.randomizationNumber?.replace(/\D/g, '') ?? '0', 10);
      return num > max ? num : max;
    }, 0);
    return `${this.config.randomizationNumberPrefix}-${(maxNum + 1).toString().padStart(4, '0')}`;
  }
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.subjects.clear();
    this.eligibilityCriteria.clear();
    this.subjectCounters.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSubjectManagementService(
  config: SubjectManagementServiceConfig
): SubjectManagementService {
  return new SubjectManagementService(config);
}
