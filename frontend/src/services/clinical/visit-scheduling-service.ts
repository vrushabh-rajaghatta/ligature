
/**
 * Visit Scheduling Service
 * Protocol-driven visit scheduling, window calculations, and deviation tracking
 * @version 0.20.3.1
 */

import type {
  ProtocolVisit,
  SubjectVisit,
  VisitDeviation,
  VisitWindow,
  SubjectSchedule,
  SubjectVisitScheduleItem,
  UnscheduledVisitConfig,
  VisitType,
  VisitStatus,
  DeviationType,
  DeviationSeverity,
} from '@/types/clinical-visit';
import {
  createProtocolVisit,
  createSubjectVisit,
  createVisitDeviation,
  calculateVisitWindow,
  isWithinVisitWindow,
  getDaysFromTarget,
  isVisitOverdue,
} from '@/types/clinical-visit';

// ============================================================================
// Service Configuration
// ============================================================================

export interface VisitSchedulingServiceConfig {
  tenantId: string;
  autoDetectWindowViolations?: boolean;
  autoCreateDeviations?: boolean;
  defaultWindowBefore?: number;
  defaultWindowAfter?: number;
  overdueAlertDays?: number;
  upcomingAlertDays?: number;
}

// ============================================================================
// Schedule Creation Types
// ============================================================================

export interface CreateScheduleConfig {
  subjectId: string;
  studyId: string;
  siteId: string;
  baselineDate: Date;
  createdBy: string;
}

export interface RescheduleConfig {
  visitId: string;
  newScheduledDate: Date;
  reason: string;
  rescheduledBy: string;
}

// ============================================================================
// Visit Completion Types
// ============================================================================

export interface CompleteVisitConfig {
  visitId: string;
  actualDate: Date;
  completedForms?: string[];
  completedProcedures?: string[];
  conductedBy: string;
  notes?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface VisitSchedulingStats {
  totalVisits: number;
  byStatus: Record<VisitStatus, number>;
  completedOnTime: number;
  completedLate: number;
  missedVisits: number;
  overdueVisits: number;
  upcomingVisits: number;
  deviationCount: number;
  onTimeRate: number;
  completionRate: number;
}

export interface SubjectVisitCompliance {
  subjectId: string;
  totalVisits: number;
  completedVisits: number;
  missedVisits: number;
  onTimeVisits: number;
  lateVisits: number;
  complianceRate: number;
  onTimeRate: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IVisitSchedulingService {
  // Protocol Visit Management
  addProtocolVisit(visit: Omit<ProtocolVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProtocolVisit>;
  updateProtocolVisit(visitId: string, updates: Partial<ProtocolVisit>): Promise<ProtocolVisit>;
  removeProtocolVisit(visitId: string): Promise<void>;
  getProtocolVisits(studyId: string): Promise<ProtocolVisit[]>;
  getProtocolVisit(visitId: string): Promise<ProtocolVisit | null>;
  
  // Subject Schedule Management
  createSubjectSchedule(config: CreateScheduleConfig): Promise<SubjectSchedule>;
  getSubjectSchedule(subjectId: string): Promise<SubjectSchedule | null>;
  getSubjectVisit(visitId: string): Promise<SubjectVisit | null>;
  listSubjectVisits(subjectId: string): Promise<SubjectVisit[]>;
  
  // Visit Operations
  rescheduleVisit(config: RescheduleConfig): Promise<SubjectVisit>;
  completeVisit(config: CompleteVisitConfig): Promise<SubjectVisit>;
  markVisitMissed(visitId: string, reason: string, updatedBy: string): Promise<SubjectVisit>;
  addUnscheduledVisit(config: UnscheduledVisitConfig): Promise<SubjectVisit>;
  
  // Window Calculations
  calculateVisitWindows(subjectId: string): Promise<VisitWindow[]>;
  checkWindowViolation(visitId: string, actualDate: Date): Promise<{ isViolation: boolean; daysOutOfWindow: number }>;
  
  // Deviation Management
  recordDeviation(deviation: Omit<VisitDeviation, 'id' | 'reportedDate' | 'createdAt' | 'updatedAt'>): Promise<VisitDeviation>;
  resolveDeviation(deviationId: string, resolution: string, resolvedBy: string): Promise<VisitDeviation>;
  getVisitDeviations(visitId: string): Promise<VisitDeviation[]>;
  getSubjectDeviations(subjectId: string): Promise<VisitDeviation[]>;
  getStudyDeviations(studyId: string): Promise<VisitDeviation[]>;
  
  // Queries
  getOverdueVisits(studyId: string): Promise<SubjectVisit[]>;
  getUpcomingVisits(studyId: string, withinDays?: number): Promise<SubjectVisit[]>;
  getVisitsByStatus(studyId: string, status: VisitStatus): Promise<SubjectVisit[]>;
  
  // Statistics
  getVisitStatistics(studyId: string): VisitSchedulingStats;
  getSubjectCompliance(subjectId: string): SubjectVisitCompliance;
  getSiteVisitStats(studyId: string, siteId: string): VisitSchedulingStats;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class VisitSchedulingService implements IVisitSchedulingService {
  private config: Required<VisitSchedulingServiceConfig>;
  private protocolVisits: Map<string, ProtocolVisit> = new Map();
  private subjectVisits: Map<string, SubjectVisit> = new Map();
  private deviations: Map<string, VisitDeviation> = new Map();
  private subjectBaselineDates: Map<string, Date> = new Map();
  
  constructor(config: VisitSchedulingServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      autoDetectWindowViolations: config.autoDetectWindowViolations ?? true,
      autoCreateDeviations: config.autoCreateDeviations ?? true,
      defaultWindowBefore: config.defaultWindowBefore ?? 3,
      defaultWindowAfter: config.defaultWindowAfter ?? 3,
      overdueAlertDays: config.overdueAlertDays ?? 0,
      upcomingAlertDays: config.upcomingAlertDays ?? 7,
    };
  }
  
  // ===========================================================================
  // Protocol Visit Management
  // ===========================================================================
  
  async addProtocolVisit(
    visit: Omit<ProtocolVisit, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProtocolVisit> {
    // Validate required fields
    if (!visit.studyId?.trim()) {
      throw new Error('Study ID is required');
    }
    if (!visit.visitName?.trim()) {
      throw new Error('Visit name is required');
    }
    if (visit.visitNumber === undefined || visit.visitNumber < 0) {
      throw new Error('Valid visit number is required');
    }
    
    // Check for duplicate visit number in study
    for (const pv of Array.from(Array.from(this.protocolVisits.values()))) {
      if (pv.studyId === visit.studyId && pv.visitNumber === visit.visitNumber) {
        throw new Error(`Visit number ${visit.visitNumber} already exists in this study`);
      }
    }
    
    const protocolVisit = createProtocolVisit({
      ...visit,
      windowBefore: visit.windowBefore ?? this.config.defaultWindowBefore,
      windowAfter: visit.windowAfter ?? this.config.defaultWindowAfter,
    });
    
    this.protocolVisits.set(protocolVisit.id, protocolVisit);
    return protocolVisit;
  }
  
  async updateProtocolVisit(
    visitId: string,
    updates: Partial<ProtocolVisit>
  ): Promise<ProtocolVisit> {
    const visit = this.protocolVisits.get(visitId);
    if (!visit) {
      throw new Error(`Protocol visit not found: ${visitId}`);
    }
    
    // Prevent updating immutable fields
    const immutableFields = ['id', 'studyId', 'createdAt'];
    for (const field of immutableFields) {
      if (field in updates) {
        throw new Error(`Cannot update immutable field: ${field}`);
      }
    }
    
    const updatedVisit: ProtocolVisit = {
      ...visit,
      ...updates,
      id: visit.id,
      studyId: visit.studyId,
      createdAt: visit.createdAt,
      updatedAt: new Date(),
    };
    
    this.protocolVisits.set(visitId, updatedVisit);
    return updatedVisit;
  }
  
  async removeProtocolVisit(visitId: string): Promise<void> {
    const visit = this.protocolVisits.get(visitId);
    if (!visit) {
      throw new Error(`Protocol visit not found: ${visitId}`);
    }
    
    // Check if any subject visits exist for this protocol visit
    for (const sv of Array.from(Array.from(this.subjectVisits.values()))) {
      if (sv.protocolVisitId === visitId) {
        throw new Error('Cannot remove protocol visit with existing subject visits');
      }
    }
    
    this.protocolVisits.delete(visitId);
  }
  
  async getProtocolVisits(studyId: string): Promise<ProtocolVisit[]> {
    return Array.from(this.protocolVisits.values())
      .filter(v => v.studyId === studyId)
      .sort((a, b) => a.visitNumber - b.visitNumber);
  }
  
  async getProtocolVisit(visitId: string): Promise<ProtocolVisit | null> {
    return this.protocolVisits.get(visitId) ?? null;
  }
  
  // ===========================================================================
  // Subject Schedule Management
  // ===========================================================================
  
  async createSubjectSchedule(config: CreateScheduleConfig): Promise<SubjectSchedule> {
    // Validate inputs
    if (!config.subjectId?.trim()) {
      throw new Error('Subject ID is required');
    }
    if (!config.studyId?.trim()) {
      throw new Error('Study ID is required');
    }
    if (!config.baselineDate) {
      throw new Error('Baseline date is required');
    }
    
    // Get protocol visits for study
    const protocolVisits = await this.getProtocolVisits(config.studyId);
    if (protocolVisits.length === 0) {
      throw new Error('No protocol visits defined for this study');
    }
    
    // Store baseline date
    this.subjectBaselineDates.set(config.subjectId, config.baselineDate);
    
    // Create subject visits based on protocol
    const visits: SubjectVisitScheduleItem[] = [];
    
    for (const pv of protocolVisits) {
      if (pv.isUnscheduled) continue; // Skip unscheduled visit templates
      
      const window = calculateVisitWindow(config.baselineDate, pv);
      
      const subjectVisit = createSubjectVisit({
        subjectId: config.subjectId,
        protocolVisitId: pv.id,
        studyId: config.studyId,
        siteId: config.siteId,
        visitName: pv.visitName,
        visitNumber: pv.visitNumber,
        scheduledDate: window.targetDate,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        createdBy: config.createdBy,
      });
      
      this.subjectVisits.set(subjectVisit.id, subjectVisit);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      visits.push({
        visitId: subjectVisit.id,
        protocolVisitId: pv.id,
        visitName: pv.visitName,
        visitNumber: pv.visitNumber,
        visitType: pv.visitType,
        scheduledDate: window.targetDate,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        status: 'SCHEDULED',
        isOverdue: today > window.windowEnd,
        isCurrent: today >= window.windowStart && today <= window.windowEnd,
        isUpcoming: today < window.windowStart,
        formsCompleted: 0,
        formsRequired: pv.requiredForms.length,
        proceduresCompleted: 0,
        proceduresRequired: pv.requiredProcedures.length,
      });
    }
    
    // Sort by visit number
    visits.sort((a, b) => a.visitNumber - b.visitNumber);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      subjectId: config.subjectId,
      studyId: config.studyId,
      baselineDate: config.baselineDate,
      visits,
      nextVisit: visits.find(v => v.status === 'SCHEDULED' && v.scheduledDate >= today),
      overdueVisits: visits.filter(v => v.isOverdue && v.status === 'SCHEDULED'),
    };
  }
  
  async getSubjectSchedule(subjectId: string): Promise<SubjectSchedule | null> {
    const baselineDate = this.subjectBaselineDates.get(subjectId);
    if (!baselineDate) {
      return null;
    }
    
    const subjectVisits = Array.from(this.subjectVisits.values())
      .filter(v => v.subjectId === subjectId)
      .sort((a, b) => a.visitNumber - b.visitNumber);
    
    if (subjectVisits.length === 0) {
      return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const visits: SubjectVisitScheduleItem[] = subjectVisits.map(sv => {
      const pv = this.protocolVisits.get(sv.protocolVisitId);
      return {
        visitId: sv.id,
        protocolVisitId: sv.protocolVisitId,
        visitName: sv.visitName,
        visitNumber: sv.visitNumber,
        visitType: pv?.visitType ?? 'TREATMENT',
        scheduledDate: sv.scheduledDate,
        windowStart: sv.windowStart,
        windowEnd: sv.windowEnd,
        actualDate: sv.actualDate,
        status: sv.status,
        isOverdue: isVisitOverdue(sv),
        isCurrent: today >= sv.windowStart && today <= sv.windowEnd && sv.status === 'SCHEDULED',
        isUpcoming: today < sv.windowStart && sv.status === 'SCHEDULED',
        formsCompleted: sv.completedForms.length,
        formsRequired: pv?.requiredForms.length ?? 0,
        proceduresCompleted: sv.completedProcedures.length,
        proceduresRequired: pv?.requiredProcedures.length ?? 0,
      };
    });
    
    return {
      subjectId,
      studyId: subjectVisits[0].studyId,
      baselineDate,
      visits,
      nextVisit: visits.find(v => v.status === 'SCHEDULED' && !v.isOverdue),
      overdueVisits: visits.filter(v => v.isOverdue && v.status === 'SCHEDULED'),
    };
  }
  
  async getSubjectVisit(visitId: string): Promise<SubjectVisit | null> {
    return this.subjectVisits.get(visitId) ?? null;
  }
  
  async listSubjectVisits(subjectId: string): Promise<SubjectVisit[]> {
    return Array.from(this.subjectVisits.values())
      .filter(v => v.subjectId === subjectId)
      .sort((a, b) => a.visitNumber - b.visitNumber);
  }
  
  // ===========================================================================
  // Visit Operations
  // ===========================================================================
  
  async rescheduleVisit(config: RescheduleConfig): Promise<SubjectVisit> {
    const visit = this.subjectVisits.get(config.visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${config.visitId}`);
    }
    
    if (visit.status !== 'SCHEDULED') {
      throw new Error('Can only reschedule SCHEDULED visits');
    }
    
    if (!config.reason?.trim()) {
      throw new Error('Reschedule reason is required');
    }
    
    // Get protocol visit for window info
    const pv = this.protocolVisits.get(visit.protocolVisitId);
    if (!pv) {
      throw new Error('Protocol visit not found');
    }
    
    // Calculate new window (keeping same window size)
    const newWindowStart = new Date(config.newScheduledDate);
    newWindowStart.setDate(newWindowStart.getDate() - pv.windowBefore);
    
    const newWindowEnd = new Date(config.newScheduledDate);
    newWindowEnd.setDate(newWindowEnd.getDate() + pv.windowAfter);
    
    const updatedVisit: SubjectVisit = {
      ...visit,
      scheduledDate: config.newScheduledDate,
      windowStart: newWindowStart,
      windowEnd: newWindowEnd,
      notes: visit.notes 
        ? `${visit.notes}\nRescheduled: ${config.reason}` 
        : `Rescheduled: ${config.reason}`,
      updatedAt: new Date(),
      updatedBy: config.rescheduledBy,
    };
    
    this.subjectVisits.set(config.visitId, updatedVisit);
    return updatedVisit;
  }
  
  async completeVisit(config: CompleteVisitConfig): Promise<SubjectVisit> {
    const visit = this.subjectVisits.get(config.visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${config.visitId}`);
    }
    
    if (visit.status === 'COMPLETED') {
      throw new Error('Visit is already completed');
    }
    
    if (visit.status === 'MISSED') {
      throw new Error('Cannot complete a missed visit');
    }
    
    // Check for window violation
    if (this.config.autoDetectWindowViolations) {
      const violation = await this.checkWindowViolation(config.visitId, config.actualDate);
      if (violation.isViolation && this.config.autoCreateDeviations) {
        await this.recordDeviation({
          subjectVisitId: visit.id,
          subjectId: visit.subjectId,
          studyId: visit.studyId,
          type: 'WINDOW_VIOLATION',
          severity: Math.abs(violation.daysOutOfWindow) > 7 ? 'MAJOR' : 'MINOR',
          description: `Visit completed ${Math.abs(violation.daysOutOfWindow)} days ${violation.daysOutOfWindow > 0 ? 'after' : 'before'} window`,
          deviationDate: config.actualDate,
          reportedBy: config.conductedBy,
          impactOnData: false,
          impactOnSubjectSafety: false,
          capaRequired: false,
        });
      }
    }
    
    // Get protocol visit to check for required forms/procedures
    const pv = this.protocolVisits.get(visit.protocolVisitId);
    const requiredForms = pv?.requiredForms ?? [];
    const requiredProcedures = pv?.requiredProcedures ?? [];
    
    // Determine completion status
    const formsComplete = config.completedForms?.length ?? 0;
    const proceduresComplete = config.completedProcedures?.length ?? 0;
    const allFormsComplete = formsComplete >= requiredForms.length;
    const allProceduresComplete = proceduresComplete >= requiredProcedures.length;
    
    const status: VisitStatus = (allFormsComplete && allProceduresComplete) 
      ? 'COMPLETED' 
      : 'PARTIALLY_COMPLETE';
    
    const updatedVisit: SubjectVisit = {
      ...visit,
      actualDate: config.actualDate,
      status,
      completedForms: config.completedForms ?? [],
      completedProcedures: config.completedProcedures ?? [],
      conductedBy: config.conductedBy,
      notes: config.notes ?? visit.notes,
      updatedAt: new Date(),
      updatedBy: config.conductedBy,
    };
    
    this.subjectVisits.set(config.visitId, updatedVisit);
    return updatedVisit;
  }
  
  async markVisitMissed(
    visitId: string,
    reason: string,
    updatedBy: string
  ): Promise<SubjectVisit> {
    const visit = this.subjectVisits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (visit.status === 'COMPLETED') {
      throw new Error('Cannot mark completed visit as missed');
    }
    
    if (!reason?.trim()) {
      throw new Error('Reason for missed visit is required');
    }
    
    // Auto-create deviation for missed visit
    if (this.config.autoCreateDeviations) {
      const pv = this.protocolVisits.get(visit.protocolVisitId);
      await this.recordDeviation({
        subjectVisitId: visit.id,
        subjectId: visit.subjectId,
        studyId: visit.studyId,
        type: 'WINDOW_VIOLATION',
        severity: pv?.isCritical ? 'CRITICAL' : 'MAJOR',
        description: `Visit missed: ${reason}`,
        deviationDate: new Date(),
        reportedBy: updatedBy,
        impactOnData: true,
        impactOnSubjectSafety: pv?.isCritical ?? false,
        capaRequired: pv?.isCritical ?? false,
      });
    }
    
    const updatedVisit: SubjectVisit = {
      ...visit,
      status: 'MISSED',
      statusReason: reason,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.subjectVisits.set(visitId, updatedVisit);
    return updatedVisit;
  }
  
  async addUnscheduledVisit(config: UnscheduledVisitConfig): Promise<SubjectVisit> {
    // Get any existing visit for this subject to get study/site info
    const existingVisits = Array.from(this.subjectVisits.values())
      .filter(v => v.subjectId === config.subjectId);
    
    if (existingVisits.length === 0) {
      throw new Error('No existing visits found for subject - create schedule first');
    }
    
    const reference = existingVisits[0];
    
    // Find next unscheduled visit number
    const maxUnscheduledNum = existingVisits
      .filter(v => v.visitName.startsWith('Unscheduled'))
      .reduce((max, v) => Math.max(max, v.instanceNumber), 0);
    
    const visit = createSubjectVisit({
      subjectId: config.subjectId,
      protocolVisitId: 'UNSCHEDULED',
      studyId: reference.studyId,
      siteId: reference.siteId,
      visitName: `Unscheduled Visit`,
      visitNumber: 9999, // High number for sorting
      instanceNumber: maxUnscheduledNum + 1,
      scheduledDate: config.visitDate,
      windowStart: config.visitDate,
      windowEnd: config.visitDate,
      createdBy: config.conductedBy,
    });
    
    // Mark as completed immediately
    visit.actualDate = config.visitDate;
    visit.status = 'COMPLETED';
    visit.conductedBy = config.conductedBy;
    visit.notes = `Reason: ${config.reason}${config.notes ? `\n${config.notes}` : ''}`;
    visit.completedForms = config.forms ?? [];
    visit.completedProcedures = config.procedures ?? [];
    
    this.subjectVisits.set(visit.id, visit);
    return visit;
  }
  
  // ===========================================================================
  // Window Calculations
  // ===========================================================================
  
  async calculateVisitWindows(subjectId: string): Promise<VisitWindow[]> {
    const baselineDate = this.subjectBaselineDates.get(subjectId);
    if (!baselineDate) {
      throw new Error('No baseline date found for subject');
    }
    
    const subjectVisits = await this.listSubjectVisits(subjectId);
    const windows: VisitWindow[] = [];
    
    for (const sv of subjectVisits) {
      const pv = this.protocolVisits.get(sv.protocolVisitId);
      if (!pv) continue;
      
      const window = calculateVisitWindow(baselineDate, pv);
      windows.push(window);
    }
    
    return windows;
  }
  
  async checkWindowViolation(
    visitId: string,
    actualDate: Date
  ): Promise<{ isViolation: boolean; daysOutOfWindow: number }> {
    const visit = this.subjectVisits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const windowStart = new Date(visit.windowStart);
    windowStart.setHours(0, 0, 0, 0);
    
    const windowEnd = new Date(visit.windowEnd);
    windowEnd.setHours(23, 59, 59, 999);
    
    const checkDate = new Date(actualDate);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < windowStart) {
      const daysEarly = Math.ceil((windowStart.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      return { isViolation: true, daysOutOfWindow: -daysEarly };
    }
    
    if (checkDate > windowEnd) {
      const daysLate = Math.ceil((checkDate.getTime() - windowEnd.getTime()) / (1000 * 60 * 60 * 24));
      return { isViolation: true, daysOutOfWindow: daysLate };
    }
    
    return { isViolation: false, daysOutOfWindow: 0 };
  }
  
  // ===========================================================================
  // Deviation Management
  // ===========================================================================
  
  async recordDeviation(
    deviation: Omit<VisitDeviation, 'id' | 'reportedDate' | 'createdAt' | 'updatedAt'>
  ): Promise<VisitDeviation> {
    // Validate inputs
    if (!deviation.subjectVisitId?.trim()) {
      throw new Error('Subject visit ID is required');
    }
    if (!deviation.description?.trim()) {
      throw new Error('Deviation description is required');
    }
    
    const deviationRecord = createVisitDeviation({
      ...deviation,
    });
    
    this.deviations.set(deviationRecord.id, deviationRecord);
    
    // Add to subject visit's deviation list
    const visit = this.subjectVisits.get(deviation.subjectVisitId);
    if (visit) {
      visit.deviations.push(deviationRecord);
      this.subjectVisits.set(visit.id, visit);
    }
    
    return deviationRecord;
  }
  
  async resolveDeviation(
    deviationId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<VisitDeviation> {
    const deviation = this.deviations.get(deviationId);
    if (!deviation) {
      throw new Error(`Deviation not found: ${deviationId}`);
    }
    
    if (deviation.resolvedDate) {
      throw new Error('Deviation is already resolved');
    }
    
    if (!resolution?.trim()) {
      throw new Error('Resolution description is required');
    }
    
    const resolved: VisitDeviation = {
      ...deviation,
      resolution,
      resolvedDate: new Date(),
      resolvedBy,
      updatedAt: new Date(),
    };
    
    this.deviations.set(deviationId, resolved);
    
    // Update in subject visit's deviation list
    const visit = this.subjectVisits.get(deviation.subjectVisitId);
    if (visit) {
      const idx = visit.deviations.findIndex(d => d.id === deviationId);
      if (idx !== -1) {
        visit.deviations[idx] = resolved;
        this.subjectVisits.set(visit.id, visit);
      }
    }
    
    return resolved;
  }
  
  async getVisitDeviations(visitId: string): Promise<VisitDeviation[]> {
    return Array.from(this.deviations.values())
      .filter(d => d.subjectVisitId === visitId);
  }
  
  async getSubjectDeviations(subjectId: string): Promise<VisitDeviation[]> {
    return Array.from(this.deviations.values())
      .filter(d => d.subjectId === subjectId);
  }
  
  async getStudyDeviations(studyId: string): Promise<VisitDeviation[]> {
    return Array.from(this.deviations.values())
      .filter(d => d.studyId === studyId);
  }
  
  // ===========================================================================
  // Queries
  // ===========================================================================
  
  async getOverdueVisits(studyId: string): Promise<SubjectVisit[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return Array.from(this.subjectVisits.values())
      .filter(v => 
        v.studyId === studyId &&
        v.status === 'SCHEDULED' &&
        v.windowEnd < today
      )
      .sort((a, b) => a.windowEnd.getTime() - b.windowEnd.getTime());
  }
  
  async getUpcomingVisits(studyId: string, withinDays?: number): Promise<SubjectVisit[]> {
    const days = withinDays ?? this.config.upcomingAlertDays;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    
    return Array.from(this.subjectVisits.values())
      .filter(v =>
        v.studyId === studyId &&
        v.status === 'SCHEDULED' &&
        v.scheduledDate >= today &&
        v.scheduledDate <= futureDate
      )
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }
  
  async getVisitsByStatus(studyId: string, status: VisitStatus): Promise<SubjectVisit[]> {
    return Array.from(this.subjectVisits.values())
      .filter(v => v.studyId === studyId && v.status === status);
  }
  
  // ===========================================================================
  // Statistics
  // ===========================================================================
  
  getVisitStatistics(studyId: string): VisitSchedulingStats {
    const visits = Array.from(this.subjectVisits.values())
      .filter(v => v.studyId === studyId);
    
    const byStatus: Record<VisitStatus, number> = {
      SCHEDULED: 0,
      COMPLETED: 0,
      MISSED: 0,
      PARTIALLY_COMPLETE: 0,
    };
    
    let completedOnTime = 0;
    let completedLate = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const visit of visits) {
      byStatus[visit.status]++;
      
      if (visit.status === 'COMPLETED' && visit.actualDate) {
        if (visit.actualDate <= visit.windowEnd) {
          completedOnTime++;
        } else {
          completedLate++;
        }
      }
    }
    
    const overdueVisits = visits.filter(v => 
      v.status === 'SCHEDULED' && v.windowEnd < today
    ).length;
    
    const upcomingVisits = visits.filter(v => {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + this.config.upcomingAlertDays);
      return v.status === 'SCHEDULED' && 
             v.scheduledDate >= today && 
             v.scheduledDate <= futureDate;
    }).length;
    
    const deviationCount = Array.from(this.deviations.values())
      .filter(d => d.studyId === studyId).length;
    
    const totalCompleted = byStatus.COMPLETED + byStatus.PARTIALLY_COMPLETE;
    const totalNonScheduled = totalCompleted + byStatus.MISSED;
    
    return {
      totalVisits: visits.length,
      byStatus,
      completedOnTime,
      completedLate,
      missedVisits: byStatus.MISSED,
      overdueVisits,
      upcomingVisits,
      deviationCount,
      onTimeRate: totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 1000) / 10 : 0,
      completionRate: totalNonScheduled > 0 ? Math.round((totalCompleted / totalNonScheduled) * 1000) / 10 : 0,
    };
  }
  
  getSubjectCompliance(subjectId: string): SubjectVisitCompliance {
    const visits = Array.from(this.subjectVisits.values())
      .filter(v => v.subjectId === subjectId);
    
    let completedVisits = 0;
    let missedVisits = 0;
    let onTimeVisits = 0;
    let lateVisits = 0;
    
    for (const visit of visits) {
      if (visit.status === 'COMPLETED' || visit.status === 'PARTIALLY_COMPLETE') {
        completedVisits++;
        if (visit.actualDate && visit.actualDate <= visit.windowEnd) {
          onTimeVisits++;
        } else {
          lateVisits++;
        }
      } else if (visit.status === 'MISSED') {
        missedVisits++;
      }
    }
    
    const totalEvaluable = completedVisits + missedVisits;
    
    return {
      subjectId,
      totalVisits: visits.length,
      completedVisits,
      missedVisits,
      onTimeVisits,
      lateVisits,
      complianceRate: totalEvaluable > 0 ? Math.round((completedVisits / totalEvaluable) * 1000) / 10 : 100,
      onTimeRate: completedVisits > 0 ? Math.round((onTimeVisits / completedVisits) * 1000) / 10 : 100,
    };
  }
  
  getSiteVisitStats(studyId: string, siteId: string): VisitSchedulingStats {
    const visits = Array.from(this.subjectVisits.values())
      .filter(v => v.studyId === studyId && v.siteId === siteId);
    
    // Reuse main stats logic with filtered visits
    const byStatus: Record<VisitStatus, number> = {
      SCHEDULED: 0,
      COMPLETED: 0,
      MISSED: 0,
      PARTIALLY_COMPLETE: 0,
    };
    
    let completedOnTime = 0;
    let completedLate = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const visit of visits) {
      byStatus[visit.status]++;
      
      if (visit.status === 'COMPLETED' && visit.actualDate) {
        if (visit.actualDate <= visit.windowEnd) {
          completedOnTime++;
        } else {
          completedLate++;
        }
      }
    }
    
    const overdueVisits = visits.filter(v => 
      v.status === 'SCHEDULED' && v.windowEnd < today
    ).length;
    
    const upcomingVisits = visits.filter(v => {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + this.config.upcomingAlertDays);
      return v.status === 'SCHEDULED' && 
             v.scheduledDate >= today && 
             v.scheduledDate <= futureDate;
    }).length;
    
    const deviationCount = Array.from(this.deviations.values())
      .filter(d => {
        const visit = this.subjectVisits.get(d.subjectVisitId);
        return visit && visit.siteId === siteId;
      }).length;
    
    const totalCompleted = byStatus.COMPLETED + byStatus.PARTIALLY_COMPLETE;
    const totalNonScheduled = totalCompleted + byStatus.MISSED;
    
    return {
      totalVisits: visits.length,
      byStatus,
      completedOnTime,
      completedLate,
      missedVisits: byStatus.MISSED,
      overdueVisits,
      upcomingVisits,
      deviationCount,
      onTimeRate: totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 1000) / 10 : 0,
      completionRate: totalNonScheduled > 0 ? Math.round((totalCompleted / totalNonScheduled) * 1000) / 10 : 0,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.protocolVisits.clear();
    this.subjectVisits.clear();
    this.deviations.clear();
    this.subjectBaselineDates.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createVisitSchedulingService(
  config: VisitSchedulingServiceConfig
): VisitSchedulingService {
  return new VisitSchedulingService(config);
}
