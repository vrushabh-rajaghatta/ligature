
/**
 * Clinical → Safety Integration Service
 * AE detection and handoff to Safety module
 * @version 0.20.10.7
 */

import type {
  CaseSeriousness,
  CasePriority,
  CasualityAssessment,
  CaseStatus,
} from '@/domains/safety/contracts';

// ============================================================================
// Types
// ============================================================================

export type AESeverity = 'MILD' | 'MODERATE' | 'SEVERE';

export type SeriousnessCriteria =
  | 'DEATH'
  | 'LIFE_THREATENING'
  | 'HOSPITALIZATION'
  | 'PROLONGED_HOSPITALIZATION'
  | 'DISABILITY'
  | 'CONGENITAL_ANOMALY'
  | 'MEDICALLY_IMPORTANT';

export type HandoffStatus =
  | 'DETECTED'
  | 'PENDING_REVIEW'
  | 'TRANSFERRED'
  | 'CASE_CREATED'
  | 'REJECTED'
  | 'FAILED';

export type ReportingTimeline = '24_HOUR' | '7_DAY' | '15_DAY' | 'ROUTINE';

export interface AEFormData {
  formInstanceId: string;
  subjectId: string;
  siteId: string;
  studyId: string;
  visitId: string;
  
  // AE Details
  aeDescription: string;
  aeTerm: string;
  onsetDate: Date;
  resolutionDate?: Date;
  ongoing: boolean;
  
  // Severity/Seriousness
  severity: AESeverity;
  serious: boolean;
  seriousnessCriteria?: SeriousnessCriteria[];
  
  // Outcome
  outcome: 'RECOVERED' | 'RECOVERING' | 'NOT_RECOVERED' | 'RECOVERED_WITH_SEQUELAE' | 'FATAL' | 'UNKNOWN';
  
  // Causality (Investigator Assessment)
  relatedToStudyDrug: boolean;
  causalityAssessment?: CasualityAssessment;
  
  // Treatment
  actionTaken: 'NONE' | 'DOSE_REDUCED' | 'DRUG_INTERRUPTED' | 'DRUG_WITHDRAWN' | 'NOT_APPLICABLE';
  treatmentRequired: boolean;
  treatmentDescription?: string;
  
  // Reporter
  reportedBy: string;
  reportedAt: Date;
  
  // Additional
  comments?: string;
}

export interface AEToSafetyHandoff {
  id: string;
  
  // Source information
  sourceFormId: string;
  sourceVisitId: string;
  subjectId: string;
  siteId: string;
  siteName?: string;
  studyId: string;
  studyName?: string;
  
  // AE Data from form
  aeData: AEFormData;
  
  // MedDRA coding (to be completed)
  meddraLLT?: string;
  meddraLLTCode?: string;
  meddraPT?: string;
  meddraPTCode?: string;
  meddraSOC?: string;
  meddraSOCCode?: string;
  codingStatus: 'PENDING' | 'CODED' | 'VERIFIED';
  
  // Seriousness assessment
  assessedSerious: boolean;
  assessedSeriousnessCriteria: SeriousnessCriteria[];
  
  // Expedited reporting
  expeditedReporting: boolean;
  reportingTimeline: ReportingTimeline;
  reportingDeadline?: Date;
  
  // Safety case reference
  safetyCaseId?: string;
  safetyCaseNumber?: string;
  
  // Status
  status: HandoffStatus;
  statusReason?: string;
  
  // Workflow
  detectedAt: Date;
  detectedBy: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  transferredAt?: Date;
  caseCreatedAt?: Date;
  
  // Audit trail
  auditTrail: HandoffAuditEntry[];
}

export interface HandoffAuditEntry {
  id: string;
  action: 'DETECTED' | 'REVIEWED' | 'TRANSFERRED' | 'CASE_CREATED' | 'REJECTED' | 'FAILED' | 'UPDATED';
  timestamp: Date;
  performedBy: string;
  details: string;
  previousStatus?: HandoffStatus;
  newStatus?: HandoffStatus;
}

export interface SafetyCaseCreateParams {
  handoffId: string;
  caseType: 'clinical-trial';
  priority: CasePriority;
  assignTo?: string;
}

export interface SafetyCaseCreatedResult {
  success: boolean;
  caseId?: string;
  caseNumber?: string;
  errorMessage?: string;
}

export interface HandoffResult {
  success: boolean;
  handoff: AEToSafetyHandoff;
  errorMessage?: string;
}

export interface HandoffMetrics {
  totalHandoffs: number;
  byStatus: Record<HandoffStatus, number>;
  byReportingTimeline: Record<ReportingTimeline, number>;
  pendingReview: number;
  casesCreated: number;
  expeditedCount: number;
  averageProcessingHours: number;
}

// ============================================================================
// Reporting Timeline Rules (ICH E2A / FDA)
// ============================================================================

export const REPORTING_RULES = {
  // Fatal or life-threatening unexpected ADR → 7 days (IND Safety Report)
  FATAL_UNEXPECTED: {
    timeline: '7_DAY' as ReportingTimeline,
    daysFromAwareness: 7,
    criteria: ['DEATH', 'LIFE_THREATENING'] as SeriousnessCriteria[],
    requiresUnexpected: true,
  },
  // Other serious unexpected ADR → 15 days (IND Safety Report)
  SERIOUS_UNEXPECTED: {
    timeline: '15_DAY' as ReportingTimeline,
    daysFromAwareness: 15,
    criteria: ['HOSPITALIZATION', 'PROLONGED_HOSPITALIZATION', 'DISABILITY', 'CONGENITAL_ANOMALY', 'MEDICALLY_IMPORTANT'] as SeriousnessCriteria[],
    requiresUnexpected: true,
  },
  // EMA: SUSAR → 7 days fatal/life-threatening, 15 days other serious
  // Same as FDA essentially
};

// ============================================================================
// Service Class
// ============================================================================

export class ClinicalSafetyIntegrationService {
  private handoffs: Map<string, AEToSafetyHandoff> = new Map();
  private safetyCases: Map<string, { caseId: string; caseNumber: string; handoffId: string }> = new Map();

  // -------------------------------------------------------------------------
  // AE Detection
  // -------------------------------------------------------------------------

  /**
   * Detect if form data contains AE information
   */
  detectAEInForm(
    formData: Record<string, unknown>,
    formDefinitionId: string
  ): boolean {
    // Check for AE-related field patterns
    const aeIndicators = [
      'adverse_event',
      'ae_description',
      'ae_term',
      'ae_onset',
      'seriousness',
      'severity',
    ];
    
    const fieldNames = Object.keys(formData).map(k => k.toLowerCase());
    return aeIndicators.some(indicator => 
      fieldNames.some(field => field.includes(indicator))
    );
  }

  /**
   * Extract AE data from form fields
   */
  extractAEFromForm(
    formInstanceId: string,
    formData: Record<string, unknown>,
    context: {
      subjectId: string;
      siteId: string;
      studyId: string;
      visitId: string;
    }
  ): AEFormData | null {
    // Extract AE-specific fields (simplified mapping)
    const aeDescription = this.extractFieldValue(formData, ['ae_description', 'adverse_event_description', 'ae_term']);
    
    if (!aeDescription) {
      return null;
    }

    const now = new Date();
    
    return {
      formInstanceId,
      subjectId: context.subjectId,
      siteId: context.siteId,
      studyId: context.studyId,
      visitId: context.visitId,
      
      aeDescription: String(aeDescription),
      aeTerm: String(this.extractFieldValue(formData, ['ae_term', 'ae_preferred_term']) || aeDescription),
      onsetDate: this.parseDate(formData, ['ae_onset_date', 'onset_date']) || now,
      resolutionDate: this.parseDate(formData, ['ae_resolution_date', 'resolution_date']),
      ongoing: Boolean(this.extractFieldValue(formData, ['ae_ongoing', 'ongoing'])),
      
      severity: this.mapSeverity(formData),
      serious: Boolean(this.extractFieldValue(formData, ['serious', 'is_serious', 'sae'])),
      seriousnessCriteria: this.extractSeriousnessCriteria(formData),
      
      outcome: this.mapOutcome(formData),
      
      relatedToStudyDrug: Boolean(this.extractFieldValue(formData, ['related_to_study_drug', 'drug_related', 'causality_related'])),
      causalityAssessment: this.mapCausality(formData),
      
      actionTaken: this.mapActionTaken(formData),
      treatmentRequired: Boolean(this.extractFieldValue(formData, ['treatment_required', 'treatment_given'])),
      treatmentDescription: String(this.extractFieldValue(formData, ['treatment_description', 'treatment']) || ''),
      
      reportedBy: String(this.extractFieldValue(formData, ['reported_by', 'reporter']) || 'system'),
      reportedAt: now,
      
      comments: String(this.extractFieldValue(formData, ['comments', 'ae_comments', 'notes']) || ''),
    };
  }

  // -------------------------------------------------------------------------
  // Seriousness Assessment
  // -------------------------------------------------------------------------

  /**
   * Assess seriousness based on criteria
   */
  assessSeriousness(aeData: AEFormData): {
    isSerious: boolean;
    criteria: SeriousnessCriteria[];
  } {
    const criteria: SeriousnessCriteria[] = [];
    
    // Use provided criteria if available
    if (aeData.seriousnessCriteria && aeData.seriousnessCriteria.length > 0) {
      return {
        isSerious: true,
        criteria: aeData.seriousnessCriteria,
      };
    }
    
    // Assess based on outcome
    if (aeData.outcome === 'FATAL') {
      criteria.push('DEATH');
    }
    
    // Assess based on severity and other indicators
    if (aeData.severity === 'SEVERE') {
      // Severe events often meet "medically important" criterion
      if (!criteria.includes('DEATH')) {
        criteria.push('MEDICALLY_IMPORTANT');
      }
    }
    
    // If explicitly marked as serious
    if (aeData.serious) {
      if (criteria.length === 0) {
        criteria.push('MEDICALLY_IMPORTANT');
      }
    }
    
    return {
      isSerious: criteria.length > 0 || aeData.serious,
      criteria,
    };
  }

  /**
   * Determine expedited reporting requirements
   */
  determineReportingTimeline(
    seriousnessCriteria: SeriousnessCriteria[],
    isUnexpected: boolean = true // Default to unexpected for safety
  ): { expedited: boolean; timeline: ReportingTimeline; deadline: Date } {
    const now = new Date();
    
    // Check for fatal/life-threatening (7-day)
    if (seriousnessCriteria.includes('DEATH') || seriousnessCriteria.includes('LIFE_THREATENING')) {
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 7);
      return {
        expedited: true,
        timeline: '7_DAY',
        deadline,
      };
    }
    
    // Check for other serious criteria (15-day)
    const seriousCriteria: SeriousnessCriteria[] = [
      'HOSPITALIZATION',
      'PROLONGED_HOSPITALIZATION',
      'DISABILITY',
      'CONGENITAL_ANOMALY',
      'MEDICALLY_IMPORTANT',
    ];
    
    if (seriousnessCriteria.some(c => seriousCriteria.includes(c))) {
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 15);
      return {
        expedited: true,
        timeline: '15_DAY',
        deadline,
      };
    }
    
    // Non-expedited routine reporting
    return {
      expedited: false,
      timeline: 'ROUTINE',
      deadline: new Date(now.setMonth(now.getMonth() + 3)), // 90 days for routine
    };
  }

  // -------------------------------------------------------------------------
  // Handoff Operations
  // -------------------------------------------------------------------------

  /**
   * Create AE to Safety handoff
   */
  createHandoff(
    aeData: AEFormData,
    context?: { siteName?: string; studyName?: string }
  ): HandoffResult {
    const now = new Date();
    
    // Assess seriousness
    const seriousnessAssessment = this.assessSeriousness(aeData);
    
    // Determine reporting timeline
    const reportingInfo = this.determineReportingTimeline(
      seriousnessAssessment.criteria,
      true // Assume unexpected for safety
    );
    
    const handoff: AEToSafetyHandoff = {
      id: `handoff-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      
      sourceFormId: aeData.formInstanceId,
      sourceVisitId: aeData.visitId,
      subjectId: aeData.subjectId,
      siteId: aeData.siteId,
      siteName: context?.siteName,
      studyId: aeData.studyId,
      studyName: context?.studyName,
      
      aeData,
      
      codingStatus: 'PENDING',
      
      assessedSerious: seriousnessAssessment.isSerious,
      assessedSeriousnessCriteria: seriousnessAssessment.criteria,
      
      expeditedReporting: reportingInfo.expedited,
      reportingTimeline: reportingInfo.timeline,
      reportingDeadline: reportingInfo.deadline,
      
      status: 'DETECTED',
      
      detectedAt: now,
      detectedBy: 'system',
      
      auditTrail: [{
        id: `audit-${Date.now()}`,
        action: 'DETECTED',
        timestamp: now,
        performedBy: 'system',
        details: `AE detected from form ${aeData.formInstanceId}. ${seriousnessAssessment.isSerious ? `Serious (${seriousnessAssessment.criteria.join(', ')}). ${reportingInfo.timeline} reporting.` : 'Non-serious.'}`,
        newStatus: 'DETECTED',
      }],
    };
    
    this.handoffs.set(handoff.id, handoff);
    
    return {
      success: true,
      handoff,
    };
  }

  /**
   * Review and approve handoff for transfer
   */
  reviewHandoff(
    handoffId: string,
    approved: boolean,
    reviewedBy: string,
    reviewNotes?: string
  ): HandoffResult {
    const handoff = this.handoffs.get(handoffId);
    
    if (!handoff) {
      return {
        success: false,
        handoff: null as any,
        errorMessage: `Handoff ${handoffId} not found`,
      };
    }
    
    const now = new Date();
    const previousStatus = handoff.status;
    
    handoff.reviewedAt = now;
    handoff.reviewedBy = reviewedBy;
    handoff.status = approved ? 'TRANSFERRED' : 'REJECTED';
    handoff.statusReason = reviewNotes;
    
    handoff.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: approved ? 'REVIEWED' : 'REJECTED',
      timestamp: now,
      performedBy: reviewedBy,
      details: approved 
        ? `Handoff approved for transfer to Safety. ${reviewNotes || ''}`
        : `Handoff rejected. Reason: ${reviewNotes || 'Not specified'}`,
      previousStatus,
      newStatus: handoff.status,
    });
    
    if (approved) {
      handoff.transferredAt = now;
      handoff.auditTrail.push({
        id: `audit-${Date.now()}-transfer`,
        action: 'TRANSFERRED',
        timestamp: now,
        performedBy: 'system',
        details: 'AE data transferred to Safety module',
        previousStatus: 'TRANSFERRED',
        newStatus: 'TRANSFERRED',
      });
    }
    
    return {
      success: true,
      handoff,
    };
  }

  /**
   * Create safety case from handoff
   */
  async createSafetyCase(params: SafetyCaseCreateParams): Promise<SafetyCaseCreatedResult> {
    const handoff = this.handoffs.get(params.handoffId);
    
    if (!handoff) {
      return {
        success: false,
        errorMessage: `Handoff ${params.handoffId} not found`,
      };
    }
    
    if (handoff.status !== 'TRANSFERRED') {
      return {
        success: false,
        errorMessage: `Handoff must be in TRANSFERRED status to create case. Current: ${handoff.status}`,
      };
    }
    
    // Simulate case creation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const caseId = `case-${Date.now()}`;
    const caseNumber = `CASE-${new Date().getFullYear()}-${String(this.safetyCases.size + 1).padStart(5, '0')}`;
    
    // Update handoff
    const now = new Date();
    handoff.safetyCaseId = caseId;
    handoff.safetyCaseNumber = caseNumber;
    handoff.status = 'CASE_CREATED';
    handoff.caseCreatedAt = now;
    
    handoff.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: 'CASE_CREATED',
      timestamp: now,
      performedBy: params.assignTo || 'system',
      details: `Safety case ${caseNumber} created with ${params.priority} priority`,
      previousStatus: 'TRANSFERRED',
      newStatus: 'CASE_CREATED',
    });
    
    // Store case reference
    this.safetyCases.set(caseId, {
      caseId,
      caseNumber,
      handoffId: params.handoffId,
    });
    
    return {
      success: true,
      caseId,
      caseNumber,
    };
  }

  /**
   * Update MedDRA coding
   */
  updateMedDRACoding(
    handoffId: string,
    coding: {
      llt?: string;
      lltCode?: string;
      pt?: string;
      ptCode?: string;
      soc?: string;
      socCode?: string;
    },
    updatedBy: string
  ): HandoffResult {
    const handoff = this.handoffs.get(handoffId);
    
    if (!handoff) {
      return {
        success: false,
        handoff: null as any,
        errorMessage: `Handoff ${handoffId} not found`,
      };
    }
    
    handoff.meddraLLT = coding.llt;
    handoff.meddraLLTCode = coding.lltCode;
    handoff.meddraPT = coding.pt;
    handoff.meddraPTCode = coding.ptCode;
    handoff.meddraSOC = coding.soc;
    handoff.meddraSOCCode = coding.socCode;
    handoff.codingStatus = coding.pt ? 'CODED' : 'PENDING';
    
    handoff.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: 'UPDATED',
      timestamp: new Date(),
      performedBy: updatedBy,
      details: `MedDRA coding updated: PT=${coding.pt} (${coding.ptCode}), SOC=${coding.soc}`,
    });
    
    return {
      success: true,
      handoff,
    };
  }

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  getHandoffById(handoffId: string): AEToSafetyHandoff | undefined {
    return this.handoffs.get(handoffId);
  }

  getHandoffsByStudy(studyId: string): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.studyId === studyId);
  }

  getHandoffsBySite(siteId: string): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.siteId === siteId);
  }

  getHandoffsBySubject(subjectId: string): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.subjectId === subjectId);
  }

  getHandoffsByStatus(status: HandoffStatus): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.status === status);
  }

  getExpeditedHandoffs(): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.expeditedReporting);
  }

  getPendingReviewHandoffs(): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values())
      .filter(h => h.status === 'DETECTED' || h.status === 'PENDING_REVIEW');
  }

  getAllHandoffs(): AEToSafetyHandoff[] {
    return Array.from(this.handoffs.values());
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  getHandoffMetrics(studyId?: string): HandoffMetrics {
    let handoffs = Array.from(this.handoffs.values());
    
    if (studyId) {
      handoffs = handoffs.filter(h => h.studyId === studyId);
    }
    
    const byStatus: Record<HandoffStatus, number> = {
      DETECTED: 0,
      PENDING_REVIEW: 0,
      TRANSFERRED: 0,
      CASE_CREATED: 0,
      REJECTED: 0,
      FAILED: 0,
    };
    
    const byReportingTimeline: Record<ReportingTimeline, number> = {
      '24_HOUR': 0,
      '7_DAY': 0,
      '15_DAY': 0,
      'ROUTINE': 0,
    };
    
    let totalProcessingHours = 0;
    let processedCount = 0;
    
    handoffs.forEach(h => {
      byStatus[h.status]++;
      byReportingTimeline[h.reportingTimeline]++;
      
      if (h.caseCreatedAt && h.detectedAt) {
        const hours = (h.caseCreatedAt.getTime() - h.detectedAt.getTime()) / (1000 * 60 * 60);
        totalProcessingHours += hours;
        processedCount++;
      }
    });
    
    return {
      totalHandoffs: handoffs.length,
      byStatus,
      byReportingTimeline,
      pendingReview: byStatus.DETECTED + byStatus.PENDING_REVIEW,
      casesCreated: byStatus.CASE_CREATED,
      expeditedCount: handoffs.filter(h => h.expeditedReporting).length,
      averageProcessingHours: processedCount > 0 ? totalProcessingHours / processedCount : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private extractFieldValue(data: Record<string, unknown>, fieldNames: string[]): unknown {
    for (const name of fieldNames) {
      const lowerData: Record<string, unknown> = {};
      Object.keys(data).forEach(k => {
        lowerData[k.toLowerCase()] = data[k];
      });
      
      if (lowerData[name.toLowerCase()] !== undefined) {
        return lowerData[name.toLowerCase()];
      }
    }
    return undefined;
  }

  private parseDate(data: Record<string, unknown>, fieldNames: string[]): Date | undefined {
    const value = this.extractFieldValue(data, fieldNames);
    if (!value) return undefined;
    
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? undefined : date;
  }

  private mapSeverity(data: Record<string, unknown>): AESeverity {
    const value = String(this.extractFieldValue(data, ['severity', 'ae_severity']) || '').toUpperCase();
    if (value.includes('SEVERE') || value === '3') return 'SEVERE';
    if (value.includes('MODERATE') || value === '2') return 'MODERATE';
    return 'MILD';
  }

  private mapOutcome(data: Record<string, unknown>): AEFormData['outcome'] {
    const value = String(this.extractFieldValue(data, ['outcome', 'ae_outcome']) || '').toUpperCase();
    if (value.includes('FATAL') || value.includes('DEATH')) return 'FATAL';
    if (value.includes('SEQUELAE')) return 'RECOVERED_WITH_SEQUELAE';
    if (value.includes('RECOVERING')) return 'RECOVERING';
    if (value.includes('NOT_RECOVERED') || value.includes('NOT RECOVERED')) return 'NOT_RECOVERED';
    if (value.includes('RECOVERED')) return 'RECOVERED';
    return 'UNKNOWN';
  }

  private mapCausality(data: Record<string, unknown>): CasualityAssessment | undefined {
    const value = String(this.extractFieldValue(data, ['causality', 'causality_assessment']) || '').toLowerCase();
    if (value.includes('related') && !value.includes('not') && !value.includes('un')) return 'related';
    if (value.includes('probably')) return 'probably-related';
    if (value.includes('possibly')) return 'possibly-related';
    if (value.includes('unlikely')) return 'unlikely-related';
    if (value.includes('not related') || value.includes('unrelated')) return 'not-related';
    return undefined;
  }

  private mapActionTaken(data: Record<string, unknown>): AEFormData['actionTaken'] {
    const value = String(this.extractFieldValue(data, ['action_taken', 'action']) || '').toUpperCase();
    if (value.includes('WITHDRAWN')) return 'DRUG_WITHDRAWN';
    if (value.includes('INTERRUPTED')) return 'DRUG_INTERRUPTED';
    if (value.includes('REDUCED')) return 'DOSE_REDUCED';
    if (value.includes('NONE') || value === '') return 'NONE';
    return 'NOT_APPLICABLE';
  }

  private extractSeriousnessCriteria(data: Record<string, unknown>): SeriousnessCriteria[] {
    const criteria: SeriousnessCriteria[] = [];
    
    const checkField = (fieldNames: string[], criterion: SeriousnessCriteria) => {
      if (Boolean(this.extractFieldValue(data, fieldNames))) {
        criteria.push(criterion);
      }
    };
    
    checkField(['death', 'fatal', 'resulted_in_death'], 'DEATH');
    checkField(['life_threatening', 'lifethreatening'], 'LIFE_THREATENING');
    checkField(['hospitalization', 'inpatient_hospitalization'], 'HOSPITALIZATION');
    checkField(['prolonged_hospitalization'], 'PROLONGED_HOSPITALIZATION');
    checkField(['disability', 'incapacity', 'persistent_disability'], 'DISABILITY');
    checkField(['congenital', 'birth_defect', 'congenital_anomaly'], 'CONGENITAL_ANOMALY');
    checkField(['medically_important', 'other_serious', 'medically_significant'], 'MEDICALLY_IMPORTANT');
    
    return criteria;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: ClinicalSafetyIntegrationService | null = null;

export function getClinicalSafetyIntegrationService(): ClinicalSafetyIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new ClinicalSafetyIntegrationService();
  }
  return serviceInstance;
}

export function resetClinicalSafetyIntegrationService(): void {
  serviceInstance = null;
}
