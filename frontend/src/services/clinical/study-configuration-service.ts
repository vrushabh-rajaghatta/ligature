
/**
 * Study Configuration Service
 * Core CRUD operations for clinical study management
 * @version 0.20.1.1
 */

import {
  ClinicalStudy,
  CreateStudyConfig,
  StudyFilters,
  StudyArm,
  StudyStatus,
  StudyValidationResult,
  StudyValidationError,
  StudyValidationWarning,
  VisitSchedule,
  createClinicalStudy,
  createStudyArm,
  isValidStatusTransition,
  STUDY_STATUS_TRANSITIONS,
} from '@/types/clinical-trial';
import {
  ProtocolVisit,
  createProtocolVisit,
} from '@/types/clinical-visit';

// ============================================================================
// Types
// ============================================================================

export interface StudyConfigurationServiceConfig {
  tenantId: string;
  maxArmsPerStudy?: number;
  maxVisitsPerStudy?: number;
  requireApprovalForStatusChange?: boolean;
}

export interface IStudyConfigurationService {
  // Study CRUD
  createStudy(config: CreateStudyConfig): Promise<ClinicalStudy>;
  updateStudy(studyId: string, updates: Partial<ClinicalStudy>, updatedBy: string): Promise<ClinicalStudy>;
  getStudy(studyId: string): Promise<ClinicalStudy | null>;
  listStudies(filters?: StudyFilters): Promise<ClinicalStudy[]>;
  deleteStudy(studyId: string): Promise<void>;
  
  // Arm management
  addArm(studyId: string, arm: Omit<StudyArm, 'id'>): Promise<StudyArm>;
  updateArm(studyId: string, armId: string, updates: Partial<StudyArm>): Promise<StudyArm>;
  removeArm(studyId: string, armId: string): Promise<void>;
  reorderArms(studyId: string, armIds: string[]): Promise<StudyArm[]>;
  
  // Visit schedule
  addVisit(studyId: string, visit: Omit<ProtocolVisit, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>): Promise<ProtocolVisit>;
  updateVisit(studyId: string, visitId: string, updates: Partial<ProtocolVisit>): Promise<ProtocolVisit>;
  removeVisit(studyId: string, visitId: string): Promise<void>;
  getVisitSchedule(studyId: string): Promise<VisitSchedule>;
  
  // Study status transitions
  activateStudy(studyId: string, activatedBy: string): Promise<ClinicalStudy>;
  closeEnrollment(studyId: string, closedBy: string): Promise<ClinicalStudy>;
  completeStudy(studyId: string, completedBy: string): Promise<ClinicalStudy>;
  terminateStudy(studyId: string, reason: string, terminatedBy: string): Promise<ClinicalStudy>;
  
  // Validation
  validateStudyConfig(studyId: string): Promise<StudyValidationResult>;
}

export interface StudyConfigurationStats {
  totalStudies: number;
  byStatus: Record<StudyStatus, number>;
  averageArmsPerStudy: number;
  averageVisitsPerStudy: number;
}

// ============================================================================
// In-Memory Storage (for now - will be replaced with DB repository)
// ============================================================================

interface StudyStore {
  studies: Map<string, ClinicalStudy>;
  visits: Map<string, ProtocolVisit[]>; // studyId -> visits
}

// ============================================================================
// Service Implementation
// ============================================================================

export class StudyConfigurationService implements IStudyConfigurationService {
  private store: StudyStore;
  private config: Required<StudyConfigurationServiceConfig>;
  
  constructor(config: StudyConfigurationServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      maxArmsPerStudy: config.maxArmsPerStudy ?? 10,
      maxVisitsPerStudy: config.maxVisitsPerStudy ?? 50,
      requireApprovalForStatusChange: config.requireApprovalForStatusChange ?? false,
    };
    
    this.store = {
      studies: new Map(),
      visits: new Map(),
    };
  }
  
  // ===========================================================================
  // Study CRUD
  // ===========================================================================
  
  async createStudy(config: CreateStudyConfig): Promise<ClinicalStudy> {
    // Validate tenant
    if (config.tenantId !== this.config.tenantId) {
      throw new Error(`Invalid tenant ID: ${config.tenantId}`);
    }
    
    // Validate required fields
    if (!config.protocolNumber?.trim()) {
      throw new Error('Protocol number is required');
    }
    if (!config.protocolTitle?.trim()) {
      throw new Error('Protocol title is required');
    }
    if (config.plannedEnrollment < 0) {
      throw new Error('Planned enrollment must be non-negative');
    }
    
    // Check for duplicate protocol number
    const existing = Array.from(this.store.studies.values())
      .find(s => s.protocolNumber === config.protocolNumber && s.tenantId === config.tenantId);
    if (existing) {
      throw new Error(`Study with protocol number ${config.protocolNumber} already exists`);
    }
    
    const study = createClinicalStudy(config);
    this.store.studies.set(study.id, study);
    this.store.visits.set(study.id, []);
    
    return study;
  }
  
  async updateStudy(
    studyId: string, 
    updates: Partial<ClinicalStudy>,
    updatedBy: string
  ): Promise<ClinicalStudy> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Prevent updating immutable fields
    const immutableFields = ['id', 'tenantId', 'createdAt', 'createdBy'];
    for (const field of immutableFields) {
      if (field in updates) {
        throw new Error(`Cannot update immutable field: ${field}`);
      }
    }
    
    // Validate status change if included
    if (updates.status && updates.status !== study.status) {
      if (!isValidStatusTransition(study.status, updates.status)) {
        throw new Error(
          `Invalid status transition: ${study.status} -> ${updates.status}. ` +
          `Valid transitions: ${STUDY_STATUS_TRANSITIONS[study.status].join(', ') || 'none'}`
        );
      }
    }
    
    // Validate enrollment numbers
    if (updates.plannedEnrollment !== undefined && updates.plannedEnrollment < 0) {
      throw new Error('Planned enrollment must be non-negative');
    }
    if (updates.actualEnrollment !== undefined && updates.actualEnrollment < 0) {
      throw new Error('Actual enrollment must be non-negative');
    }
    
    const updatedStudy: ClinicalStudy = {
      ...study,
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.store.studies.set(studyId, updatedStudy);
    return updatedStudy;
  }
  
  async getStudy(studyId: string): Promise<ClinicalStudy | null> {
    return this.store.studies.get(studyId) ?? null;
  }
  
  async listStudies(filters?: StudyFilters): Promise<ClinicalStudy[]> {
    let studies = Array.from(this.store.studies.values());
    
    // Apply tenant filter (always)
    studies = studies.filter(s => s.tenantId === this.config.tenantId);
    
    if (!filters) return studies;
    
    // Apply filters
    if (filters.phase?.length) {
      studies = studies.filter(s => filters.phase!.includes(s.phase));
    }
    if (filters.status?.length) {
      studies = studies.filter(s => filters.status!.includes(s.status));
    }
    if (filters.therapeuticArea) {
      studies = studies.filter(s => 
        s.therapeuticArea.toLowerCase().includes(filters.therapeuticArea!.toLowerCase())
      );
    }
    if (filters.sponsor) {
      studies = studies.filter(s => 
        s.sponsor.toLowerCase().includes(filters.sponsor!.toLowerCase())
      );
    }
    if (filters.country) {
      studies = studies.filter(s => s.countries.includes(filters.country!));
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      studies = studies.filter(s => 
        s.protocolNumber.toLowerCase().includes(term) ||
        s.protocolTitle.toLowerCase().includes(term) ||
        s.indication.toLowerCase().includes(term)
      );
    }
    
    return studies;
  }
  
  async deleteStudy(studyId: string): Promise<void> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Only allow deletion of draft studies
    if (study.status !== 'DRAFT') {
      throw new Error(`Cannot delete study in status: ${study.status}. Only DRAFT studies can be deleted.`);
    }
    
    this.store.studies.delete(studyId);
    this.store.visits.delete(studyId);
  }
  
  // ===========================================================================
  // Arm Management
  // ===========================================================================
  
  async addArm(studyId: string, armConfig: Omit<StudyArm, 'id'>): Promise<StudyArm> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Check arm limit
    if (study.arms.length >= this.config.maxArmsPerStudy) {
      throw new Error(`Maximum arms per study (${this.config.maxArmsPerStudy}) reached`);
    }
    
    // Check for duplicate arm name
    if (study.arms.some(a => a.name.toLowerCase() === armConfig.name.toLowerCase())) {
      throw new Error(`Arm with name "${armConfig.name}" already exists`);
    }
    
    // Create arm with auto-generated ID
    const arm = createStudyArm({
      ...armConfig,
      order: armConfig.order ?? study.arms.length,
    });
    
    // Add arm to study
    const updatedStudy: ClinicalStudy = {
      ...study,
      arms: [...study.arms, arm],
      updatedAt: new Date(),
    };
    
    this.store.studies.set(studyId, updatedStudy);
    return arm;
  }
  
  async updateArm(studyId: string, armId: string, updates: Partial<StudyArm>): Promise<StudyArm> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const armIndex = study.arms.findIndex(a => a.id === armId);
    if (armIndex === -1) {
      throw new Error(`Arm not found: ${armId}`);
    }
    
    // Check for duplicate name (if name is being updated)
    if (updates.name) {
      const duplicateName = study.arms.some(
        (a, i) => i !== armIndex && a.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (duplicateName) {
        throw new Error(`Arm with name "${updates.name}" already exists`);
      }
    }
    
    // Update arm
    const updatedArm: StudyArm = {
      ...study.arms[armIndex],
      ...updates,
      id: armId, // Prevent ID change
    };
    
    const updatedArms = [...study.arms];
    updatedArms[armIndex] = updatedArm;
    
    const updatedStudy: ClinicalStudy = {
      ...study,
      arms: updatedArms,
      updatedAt: new Date(),
    };
    
    this.store.studies.set(studyId, updatedStudy);
    return updatedArm;
  }
  
  async removeArm(studyId: string, armId: string): Promise<void> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const armIndex = study.arms.findIndex(a => a.id === armId);
    if (armIndex === -1) {
      throw new Error(`Arm not found: ${armId}`);
    }
    
    // Don't allow removal if study is actively enrolling
    if (study.status === 'ENROLLING') {
      throw new Error('Cannot remove arm from enrolling study');
    }
    
    const updatedArms = study.arms.filter(a => a.id !== armId);
    
    // Reorder remaining arms
    updatedArms.forEach((arm, index) => {
      arm.order = index;
    });
    
    const updatedStudy: ClinicalStudy = {
      ...study,
      arms: updatedArms,
      updatedAt: new Date(),
    };
    
    this.store.studies.set(studyId, updatedStudy);
  }
  
  async reorderArms(studyId: string, armIds: string[]): Promise<StudyArm[]> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Validate all arm IDs exist
    const existingIds = new Set(study.arms.map(a => a.id));
    for (const id of armIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Arm not found: ${id}`);
      }
    }
    
    // Validate all existing arms are included
    if (armIds.length !== study.arms.length) {
      throw new Error('All existing arm IDs must be included in reorder');
    }
    
    // Create reordered arms
    const armMap = new Map(study.arms.map(a => [a.id, a]));
    const reorderedArms = armIds.map((id, index) => ({
      ...armMap.get(id)!,
      order: index,
    }));
    
    const updatedStudy: ClinicalStudy = {
      ...study,
      arms: reorderedArms,
      updatedAt: new Date(),
    };
    
    this.store.studies.set(studyId, updatedStudy);
    return reorderedArms;
  }
  
  // ===========================================================================
  // Visit Schedule
  // ===========================================================================
  
  async addVisit(
    studyId: string,
    visitConfig: Omit<ProtocolVisit, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProtocolVisit> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const visits = this.store.visits.get(studyId) ?? [];
    
    // Check visit limit
    if (visits.length >= this.config.maxVisitsPerStudy) {
      throw new Error(`Maximum visits per study (${this.config.maxVisitsPerStudy}) reached`);
    }
    
    // Check for duplicate visit number
    if (visits.some(v => v.visitNumber === visitConfig.visitNumber)) {
      throw new Error(`Visit with number ${visitConfig.visitNumber} already exists`);
    }
    
    // Check for duplicate visit name
    if (visits.some(v => v.visitName.toLowerCase() === visitConfig.visitName.toLowerCase())) {
      throw new Error(`Visit with name "${visitConfig.visitName}" already exists`);
    }
    
    const visit = createProtocolVisit({
      ...visitConfig,
      studyId,
    });
    
    // Add visit and sort by scheduled day
    const updatedVisits = [...visits, visit].sort((a, b) => a.scheduledDay - b.scheduledDay);
    this.store.visits.set(studyId, updatedVisits);
    
    return visit;
  }
  
  async updateVisit(
    studyId: string,
    visitId: string,
    updates: Partial<ProtocolVisit>
  ): Promise<ProtocolVisit> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const visits = this.store.visits.get(studyId) ?? [];
    const visitIndex = visits.findIndex(v => v.id === visitId);
    
    if (visitIndex === -1) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    // Check for duplicate visit number
    if (updates.visitNumber !== undefined) {
      const duplicate = visits.some(
        (v, i) => i !== visitIndex && v.visitNumber === updates.visitNumber
      );
      if (duplicate) {
        throw new Error(`Visit with number ${updates.visitNumber} already exists`);
      }
    }
    
    // Check for duplicate visit name
    if (updates.visitName !== undefined) {
      const duplicate = visits.some(
        (v, i) => i !== visitIndex && v.visitName.toLowerCase() === updates.visitName!.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Visit with name "${updates.visitName}" already exists`);
      }
    }
    
    const updatedVisit: ProtocolVisit = {
      ...visits[visitIndex],
      ...updates,
      id: visitId, // Prevent ID change
      studyId, // Prevent study change
      updatedAt: new Date(),
    };
    
    const updatedVisits = [...visits];
    updatedVisits[visitIndex] = updatedVisit;
    
    // Re-sort by scheduled day
    updatedVisits.sort((a, b) => a.scheduledDay - b.scheduledDay);
    this.store.visits.set(studyId, updatedVisits);
    
    return updatedVisit;
  }
  
  async removeVisit(studyId: string, visitId: string): Promise<void> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const visits = this.store.visits.get(studyId) ?? [];
    const visitIndex = visits.findIndex(v => v.id === visitId);
    
    if (visitIndex === -1) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    // Don't allow removal of critical visits from active studies
    const visit = visits[visitIndex];
    if (visit.isCritical && study.status !== 'DRAFT') {
      throw new Error('Cannot remove critical visit from non-draft study');
    }
    
    const updatedVisits = visits.filter(v => v.id !== visitId);
    this.store.visits.set(studyId, updatedVisits);
  }
  
  async getVisitSchedule(studyId: string): Promise<VisitSchedule> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    const visits = this.store.visits.get(studyId) ?? [];
    
    // Calculate durations
    const sortedVisits = [...visits].sort((a, b) => a.scheduledDay - b.scheduledDay);
    
    let totalDuration = 0;
    let treatmentDuration = 0;
    let followUpDuration = 0;
    
    if (sortedVisits.length > 0) {
      const firstDay = sortedVisits[0].scheduledDay;
      const lastDay = sortedVisits[sortedVisits.length - 1].scheduledDay;
      totalDuration = lastDay - firstDay + 1;
      
      // Find last treatment visit
      const treatmentVisits = sortedVisits.filter(v => v.visitType === 'TREATMENT');
      if (treatmentVisits.length > 0) {
        treatmentDuration = treatmentVisits[treatmentVisits.length - 1].scheduledDay - firstDay + 1;
      }
      
      // Find follow-up duration
      const followUpVisits = sortedVisits.filter(v => v.visitType === 'FOLLOWUP');
      if (followUpVisits.length > 0 && treatmentVisits.length > 0) {
        const lastTreatmentDay = treatmentVisits[treatmentVisits.length - 1].scheduledDay;
        const lastFollowUpDay = followUpVisits[followUpVisits.length - 1].scheduledDay;
        followUpDuration = lastFollowUpDay - lastTreatmentDay;
      }
    }
    
    return {
      studyId,
      visits: sortedVisits.map(v => ({
        id: v.id,
        visitNumber: v.visitNumber,
        visitName: v.visitName,
      })),
      totalDuration,
      treatmentDuration,
      followUpDuration,
    };
  }
  
  // ===========================================================================
  // Study Status Transitions
  // ===========================================================================
  
  async activateStudy(studyId: string, activatedBy: string): Promise<ClinicalStudy> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Validate transition from DRAFT -> IN_STARTUP
    if (study.status !== 'DRAFT') {
      throw new Error(`Cannot activate study in status: ${study.status}. Study must be in DRAFT status.`);
    }
    
    // Run validation before activation
    const validation = await this.validateStudyConfig(studyId);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ');
      throw new Error(`Cannot activate study with validation errors: ${errorMessages}`);
    }
    
    return this.updateStudy(studyId, { status: 'IN_STARTUP' }, activatedBy);
  }
  
  async closeEnrollment(studyId: string, closedBy: string): Promise<ClinicalStudy> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    if (study.status !== 'ENROLLING') {
      throw new Error(`Cannot close enrollment for study in status: ${study.status}. Study must be ENROLLING.`);
    }
    
    return this.updateStudy(studyId, { status: 'CLOSED_TO_ENROLLMENT' }, closedBy);
  }
  
  async completeStudy(studyId: string, completedBy: string): Promise<ClinicalStudy> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    if (study.status !== 'CLOSED_TO_ENROLLMENT') {
      throw new Error(
        `Cannot complete study in status: ${study.status}. Study must be CLOSED_TO_ENROLLMENT.`
      );
    }
    
    return this.updateStudy(
      studyId,
      { 
        status: 'COMPLETED',
        actualEndDate: new Date(),
      },
      completedBy
    );
  }
  
  async terminateStudy(
    studyId: string,
    reason: string,
    terminatedBy: string
  ): Promise<ClinicalStudy> {
    const study = await this.getStudy(studyId);
    if (!study) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Can terminate from any non-terminal state
    const terminalStates: StudyStatus[] = ['COMPLETED', 'TERMINATED'];
    if (terminalStates.includes(study.status)) {
      throw new Error(`Cannot terminate study in status: ${study.status}. Study is already in a terminal state.`);
    }
    
    if (!reason?.trim()) {
      throw new Error('Termination reason is required');
    }
    
    return this.updateStudy(
      studyId,
      { 
        status: 'TERMINATED',
        actualEndDate: new Date(),
      },
      terminatedBy
    );
  }
  
  // ===========================================================================
  // Validation
  // ===========================================================================
  
  async validateStudyConfig(studyId: string): Promise<StudyValidationResult> {
    const study = await this.getStudy(studyId);
    if (!study) {
      return {
        isValid: false,
        errors: [{ code: 'STUDY_NOT_FOUND', field: 'id', message: `Study not found: ${studyId}` }],
        warnings: [],
      };
    }
    
    const errors: StudyValidationError[] = [];
    const warnings: StudyValidationWarning[] = [];
    
    // Required fields validation
    if (!study.protocolNumber?.trim()) {
      errors.push({ code: 'REQUIRED_FIELD', field: 'protocolNumber', message: 'Protocol number is required' });
    }
    if (!study.protocolTitle?.trim()) {
      errors.push({ code: 'REQUIRED_FIELD', field: 'protocolTitle', message: 'Protocol title is required' });
    }
    if (!study.therapeuticArea?.trim()) {
      errors.push({ code: 'REQUIRED_FIELD', field: 'therapeuticArea', message: 'Therapeutic area is required' });
    }
    if (!study.indication?.trim()) {
      errors.push({ code: 'REQUIRED_FIELD', field: 'indication', message: 'Indication is required' });
    }
    if (!study.sponsor?.trim()) {
      errors.push({ code: 'REQUIRED_FIELD', field: 'sponsor', message: 'Sponsor is required' });
    }
    
    // Enrollment validation
    if (study.plannedEnrollment <= 0) {
      errors.push({ 
        code: 'INVALID_ENROLLMENT', 
        field: 'plannedEnrollment', 
        message: 'Planned enrollment must be greater than 0' 
      });
    }
    
    // Arms validation
    if (study.arms.length === 0) {
      errors.push({ code: 'NO_ARMS', field: 'arms', message: 'At least one study arm is required' });
    } else {
      // Check total planned subjects
      const totalArmSubjects = study.arms.reduce((sum, arm) => sum + arm.plannedSubjects, 0);
      if (totalArmSubjects > study.plannedEnrollment) {
        warnings.push({
          code: 'ARM_ENROLLMENT_MISMATCH',
          field: 'arms',
          message: `Total arm subjects (${totalArmSubjects}) exceeds planned enrollment (${study.plannedEnrollment})`,
          recommendation: 'Adjust arm planned subjects or increase overall planned enrollment',
        });
      }
      
      // Check for experimental arm
      const hasExperimental = study.arms.some(a => a.treatmentType === 'EXPERIMENTAL');
      if (!hasExperimental) {
        warnings.push({
          code: 'NO_EXPERIMENTAL_ARM',
          field: 'arms',
          message: 'No experimental arm defined',
          recommendation: 'Consider adding an experimental treatment arm',
        });
      }
    }
    
    // Visit schedule validation
    const visits = this.store.visits.get(studyId) ?? [];
    if (visits.length === 0) {
      errors.push({ code: 'NO_VISITS', field: 'visits', message: 'At least one protocol visit is required' });
    } else {
      // Check for screening visit
      const hasScreening = visits.some(v => v.visitType === 'SCREENING');
      if (!hasScreening) {
        warnings.push({
          code: 'NO_SCREENING_VISIT',
          field: 'visits',
          message: 'No screening visit defined',
          recommendation: 'Consider adding a screening visit',
        });
      }
      
      // Check for baseline visit
      const hasBaseline = visits.some(v => v.visitType === 'BASELINE');
      if (!hasBaseline) {
        errors.push({
          code: 'NO_BASELINE_VISIT',
          field: 'visits',
          message: 'Baseline visit is required',
        });
      }
      
      // Check for visit window overlaps
      const sortedVisits = [...visits].sort((a, b) => a.scheduledDay - b.scheduledDay);
      for (let i = 0; i < sortedVisits.length - 1; i++) {
        const current = sortedVisits[i];
        const next = sortedVisits[i + 1];
        const currentEnd = current.scheduledDay + current.windowAfter;
        const nextStart = next.scheduledDay - next.windowBefore;
        
        if (currentEnd >= nextStart && !current.isUnscheduled && !next.isUnscheduled) {
          warnings.push({
            code: 'VISIT_WINDOW_OVERLAP',
            field: 'visits',
            message: `Visit windows overlap: ${current.visitName} (day ${current.scheduledDay}±${current.windowBefore}/${current.windowAfter}) and ${next.visitName} (day ${next.scheduledDay}±${next.windowBefore}/${next.windowAfter})`,
            recommendation: 'Adjust visit windows to avoid scheduling conflicts',
          });
        }
      }
    }
    
    // Dates validation
    if (study.estimatedEndDate && study.startDate > study.estimatedEndDate) {
      errors.push({
        code: 'INVALID_DATES',
        field: 'estimatedEndDate',
        message: 'Estimated end date must be after start date',
      });
    }
    
    // Countries validation
    if (study.countries.length === 0) {
      warnings.push({
        code: 'NO_COUNTRIES',
        field: 'countries',
        message: 'No countries specified for the study',
        recommendation: 'Add at least one country where the study will be conducted',
      });
    }
    
    // Endpoints validation
    if (study.endpoints.length === 0) {
      warnings.push({
        code: 'NO_ENDPOINTS',
        field: 'endpoints',
        message: 'No study endpoints defined',
        recommendation: 'Define primary and secondary endpoints',
      });
      // No endpoints means no primary endpoint
      errors.push({
        code: 'NO_PRIMARY_ENDPOINT',
        field: 'endpoints',
        message: 'At least one primary endpoint is required',
      });
    } else {
      const hasPrimary = study.endpoints.some(e => e.type === 'PRIMARY');
      if (!hasPrimary) {
        errors.push({
          code: 'NO_PRIMARY_ENDPOINT',
          field: 'endpoints',
          message: 'At least one primary endpoint is required',
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  // ===========================================================================
  // Statistics
  // ===========================================================================
  
  async getStatistics(): Promise<StudyConfigurationStats> {
    const studies = await this.listStudies();
    
    const byStatus: Record<StudyStatus, number> = {
      DRAFT: 0,
      IN_STARTUP: 0,
      ENROLLING: 0,
      CLOSED_TO_ENROLLMENT: 0,
      COMPLETED: 0,
      TERMINATED: 0,
    };
    
    let totalArms = 0;
    let totalVisits = 0;
    
    for (const study of studies) {
      byStatus[study.status]++;
      totalArms += study.arms.length;
      totalVisits += (this.store.visits.get(study.id) ?? []).length;
    }
    
    return {
      totalStudies: studies.length,
      byStatus,
      averageArmsPerStudy: studies.length > 0 ? totalArms / studies.length : 0,
      averageVisitsPerStudy: studies.length > 0 ? totalVisits / studies.length : 0,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clone a study (for creating similar studies)
   */
  async cloneStudy(
    studyId: string,
    newProtocolNumber: string,
    createdBy: string
  ): Promise<ClinicalStudy> {
    const source = await this.getStudy(studyId);
    if (!source) {
      throw new Error(`Study not found: ${studyId}`);
    }
    
    // Create new study from source
    const newStudy = await this.createStudy({
      tenantId: source.tenantId,
      protocolNumber: newProtocolNumber,
      protocolTitle: `${source.protocolTitle} (Clone)`,
      protocolVersion: '1.0',
      phase: source.phase,
      therapeuticArea: source.therapeuticArea,
      indication: source.indication,
      sponsor: source.sponsor,
      plannedEnrollment: source.plannedEnrollment,
      startDate: new Date(),
      countries: [...source.countries],
      createdBy,
    });
    
    // Copy arms
    for (const arm of source.arms) {
      await this.addArm(newStudy.id, {
        name: arm.name,
        description: arm.description,
        treatmentType: arm.treatmentType,
        plannedSubjects: arm.plannedSubjects,
        order: arm.order,
      });
    }
    
    // Copy visits
    const sourceVisits = this.store.visits.get(studyId) ?? [];
    for (const visit of sourceVisits) {
      await this.addVisit(newStudy.id, {
        visitNumber: visit.visitNumber,
        visitName: visit.visitName,
        visitCode: visit.visitCode,
        visitType: visit.visitType,
        scheduledDay: visit.scheduledDay,
        windowBefore: visit.windowBefore,
        windowAfter: visit.windowAfter,
        requiredForms: [...visit.requiredForms],
        optionalForms: [...visit.optionalForms],
        requiredProcedures: [...visit.requiredProcedures],
        optionalProcedures: [...visit.optionalProcedures],
        isUnscheduled: visit.isUnscheduled,
        isRepeatable: visit.isRepeatable,
        isCritical: visit.isCritical,
        instructions: visit.instructions,
        reminders: visit.reminders ? [...visit.reminders] : undefined,
        estimatedDuration: visit.estimatedDuration,
      });
    }
    
    // Get the updated study with arms
    return (await this.getStudy(newStudy.id))!;
  }
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.store.studies.clear();
    this.store.visits.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStudyConfigurationService(
  config: StudyConfigurationServiceConfig
): StudyConfigurationService {
  return new StudyConfigurationService(config);
}
