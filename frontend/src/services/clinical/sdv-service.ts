
/**
 * Source Data Verification (SDV) Service
 * Field-level SDV tracking, plans, and monitoring workflows
 * @version 0.20.7.1
 * 
 * Provides:
 * - SDV plan configuration (100%, risk-based, targeted)
 * - Field-level SDV status tracking
 * - SDV assignment to monitors
 * - Completion metrics and reports
 * - Remote vs on-site SDV tracking
 * - Audit trail for all verifications
 */

import {
  FormInstance,
  FieldValue,
  AuditEntry,
  AuditAction,
} from '@/types/clinical-form';

// ============================================================================
// Service Configuration
// ============================================================================

export interface SDVServiceConfig {
  tenantId: string;
  defaultSDVStrategy?: SDVStrategy;
  enableRemoteSDV?: boolean;
  requireSignature?: boolean;
}

// ============================================================================
// SDV Types
// ============================================================================

export type SDVStrategy = 
  | 'FULL'              // 100% SDV all fields
  | 'RISK_BASED'        // SDV based on risk assessment
  | 'TARGETED'          // SDV specific fields only
  | 'REDUCED'           // Reduced SDV percentage
  | 'CENTRALIZED';      // Central monitoring with minimal on-site

export type SDVStatus =
  | 'NOT_REQUIRED'      // Field doesn't require SDV
  | 'PENDING'           // Awaiting verification
  | 'IN_PROGRESS'       // Monitor reviewing
  | 'VERIFIED'          // SDV complete, matches source
  | 'DISCREPANCY'       // SDV found issue
  | 'RESOLVED'          // Discrepancy resolved
  | 'WAIVED';           // SDV waived with reason

export type SDVType =
  | 'ON_SITE'           // Traditional on-site SDV
  | 'REMOTE'            // Remote/virtual SDV
  | 'HYBRID';           // Combination

export type DiscrepancyType =
  | 'VALUE_MISMATCH'        // EDC value doesn't match source
  | 'MISSING_SOURCE'        // No source document available
  | 'ILLEGIBLE_SOURCE'      // Source document unreadable
  | 'DATE_DISCREPANCY'      // Dates don't match
  | 'UNIT_DISCREPANCY'      // Units don't match
  | 'TRANSCRIPTION_ERROR'   // Data entry error
  | 'OTHER';

// ============================================================================
// SDV Plan
// ============================================================================

export interface SDVPlan {
  id: string;
  studyId: string;
  name: string;
  description?: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';
  
  // Strategy
  strategy: SDVStrategy;
  defaultPercentage: number;        // 0-100
  
  // Form-level rules
  formRules: SDVFormRule[];
  
  // Field-level rules
  fieldRules: SDVFieldRule[];
  
  // Risk-based criteria
  riskCriteria?: SDVRiskCriteria[];
  
  // Metadata
  effectiveDate: Date;
  createdAt: Date;
  createdBy: string;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface SDVFormRule {
  formOID: string;
  formName: string;
  sdvRequired: boolean;
  sdvPercentage: number;            // 0-100
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface SDVFieldRule {
  formOID: string;
  fieldOID: string;
  fieldName: string;
  sdvRequired: boolean;
  sdvPercentage: number;
  isCritical: boolean;              // Primary endpoint, safety data
  isPrimaryEndpoint: boolean;
  notes?: string;
}

export interface SDVRiskCriteria {
  id: string;
  name: string;
  description?: string;
  condition: string;                // e.g., "site.enrollmentRate > 2x average"
  action: 'INCREASE_SDV' | 'DECREASE_SDV' | 'FULL_SDV';
  percentageChange?: number;        // For INCREASE/DECREASE
  isActive: boolean;
}

// ============================================================================
// SDV Record
// ============================================================================

export interface SDVRecord {
  id: string;
  
  // Location
  studyId: string;
  siteId: string;
  subjectId: string;
  visitId?: string;
  formInstanceId: string;
  formOID: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  
  // Status
  status: SDVStatus;
  sdvType: SDVType;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Verification
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationMethod?: 'DIRECT' | 'CERTIFIED_COPY' | 'ELECTRONIC';
  
  // Source document reference
  sourceDocumentId?: string;
  sourceDocumentType?: string;
  sourceDocumentDate?: Date;
  
  // Discrepancy (if any)
  discrepancy?: SDVDiscrepancy;
  
  // EDC value at time of SDV
  edcValue?: unknown;
  edcValueTimestamp?: Date;
  
  // Waiver (if waived)
  waivedBy?: string;
  waivedAt?: Date;
  waiverReason?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface SDVDiscrepancy {
  type: DiscrepancyType;
  description: string;
  sourceValue?: unknown;
  edcValue?: unknown;
  reportedBy: string;
  reportedAt: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  queryId?: string;                 // Link to data query if created
}

// ============================================================================
// SDV Assignment
// ============================================================================

export interface SDVAssignment {
  id: string;
  monitorId: string;
  monitorName: string;
  studyId: string;
  siteId: string;
  
  // Scope
  formOIDs?: string[];              // Specific forms, or all if empty
  visitIds?: string[];              // Specific visits, or all if empty
  
  // Status
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  
  // Dates
  startDate: Date;
  endDate?: Date;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
}

// ============================================================================
// SDV Visit (Monitoring Visit)
// ============================================================================

export interface SDVVisit {
  id: string;
  studyId: string;
  siteId: string;
  monitorId: string;
  
  // Type
  visitType: SDVType;
  
  // Dates
  scheduledDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Status
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  
  // Scope
  subjectsToReview: string[];
  formsToReview: string[];
  
  // Results
  fieldsVerified: number;
  discrepanciesFound: number;
  discrepanciesResolved: number;
  
  // Notes
  notes?: string;
  findings?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Metrics
// ============================================================================

export interface SDVMetrics {
  studyId: string;
  siteId?: string;
  
  // Counts
  totalFieldsRequiringSDV: number;
  fieldsVerified: number;
  fieldsPending: number;
  fieldsWithDiscrepancy: number;
  fieldsWaived: number;
  
  // Percentages
  completionPercentage: number;
  discrepancyRate: number;
  
  // By form
  byForm: {
    formOID: string;
    formName: string;
    total: number;
    verified: number;
    pending: number;
    percentage: number;
  }[];
  
  // By subject
  bySubject: {
    subjectId: string;
    total: number;
    verified: number;
    percentage: number;
  }[];
  
  // Trends
  averageTimeToVerify: number;      // Days
  verificationsThisWeek: number;
  verificationsThisMonth: number;
  
  // Timestamp
  calculatedAt: Date;
}

export interface SiteSDVSummary {
  siteId: string;
  siteName?: string;
  totalFields: number;
  verified: number;
  pending: number;
  discrepancies: number;
  completionRate: number;
  lastSDVDate?: Date;
  assignedMonitor?: string;
}

// ============================================================================
// Audit Entry
// ============================================================================

export interface SDVAuditEntry {
  id: string;
  sdvRecordId: string;
  action: SDVAuditAction;
  performedBy: string;
  performedAt: Date;
  previousStatus?: SDVStatus;
  newStatus?: SDVStatus;
  details?: string;
  ipAddress?: string;
  signature?: string;
}

export type SDVAuditAction =
  | 'CREATED'
  | 'ASSIGNED'
  | 'STARTED'
  | 'VERIFIED'
  | 'DISCREPANCY_REPORTED'
  | 'DISCREPANCY_RESOLVED'
  | 'WAIVED'
  | 'REOPENED';

// ============================================================================
// Service Implementation
// ============================================================================

export class SDVService {
  private config: SDVServiceConfig;
  
  // Storage
  private plans: Map<string, SDVPlan> = new Map();
  private records: Map<string, SDVRecord> = new Map();
  private assignments: Map<string, SDVAssignment> = new Map();
  private sdvVisits: Map<string, SDVVisit> = new Map();
  private auditLog: SDVAuditEntry[] = [];
  
  constructor(config: SDVServiceConfig) {
    this.config = {
      defaultSDVStrategy: 'RISK_BASED',
      enableRemoteSDV: true,
      requireSignature: true,
      ...config,
    };
  }
  
  // --------------------------------------------------------------------------
  // SDV Plan Management
  // --------------------------------------------------------------------------
  
  createPlan(params: {
    studyId: string;
    name: string;
    description?: string;
    strategy: SDVStrategy;
    defaultPercentage: number;
    effectiveDate: Date;
    createdBy: string;
  }): SDVPlan {
    if (params.defaultPercentage < 0 || params.defaultPercentage > 100) {
      throw new Error('SDV percentage must be between 0 and 100');
    }
    
    const plan: SDVPlan = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      name: params.name,
      description: params.description,
      version: '1.0',
      status: 'DRAFT',
      strategy: params.strategy,
      defaultPercentage: params.defaultPercentage,
      formRules: [],
      fieldRules: [],
      effectiveDate: params.effectiveDate,
      createdAt: new Date(),
      createdBy: params.createdBy,
    };
    
    this.plans.set(plan.id, plan);
    return plan;
  }
  
  getPlan(planId: string): SDVPlan | null {
    return this.plans.get(planId) || null;
  }
  
  getActivePlan(studyId: string): SDVPlan | null {
    for (const plan of Array.from(Array.from(this.plans.values()))) {
      if (plan.studyId === studyId && plan.status === 'ACTIVE') {
        return plan;
      }
    }
    return null;
  }
  
  updatePlan(planId: string, updates: Partial<SDVPlan>): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    if (plan.status === 'ACTIVE' && updates.status !== 'SUPERSEDED') {
      throw new Error('Cannot modify active plan. Create a new version instead.');
    }
    
    const updated = { ...plan, ...updates, id: plan.id, createdAt: plan.createdAt };
    this.plans.set(planId, updated);
    return updated;
  }
  
  activatePlan(planId: string, approvedBy: string): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    // Supersede any existing active plan
    const existingActive = this.getActivePlan(plan.studyId);
    if (existingActive && existingActive.id !== planId) {
      existingActive.status = 'SUPERSEDED';
    }
    
    plan.status = 'ACTIVE';
    plan.approvedAt = new Date();
    plan.approvedBy = approvedBy;
    
    return plan;
  }
  
  addFormRule(planId: string, rule: SDVFormRule): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    // Check for duplicate
    const existing = plan.formRules.find(r => r.formOID === rule.formOID);
    if (existing) {
      throw new Error(`Form rule already exists for ${rule.formOID}`);
    }
    
    plan.formRules.push(rule);
    return plan;
  }
  
  updateFormRule(planId: string, formOID: string, updates: Partial<SDVFormRule>): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    const ruleIndex = plan.formRules.findIndex(r => r.formOID === formOID);
    if (ruleIndex === -1) {
      throw new Error(`Form rule not found: ${formOID}`);
    }
    
    plan.formRules[ruleIndex] = { ...plan.formRules[ruleIndex], ...updates };
    return plan;
  }
  
  addFieldRule(planId: string, rule: SDVFieldRule): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    // Check for duplicate
    const existing = plan.fieldRules.find(
      r => r.formOID === rule.formOID && r.fieldOID === rule.fieldOID
    );
    if (existing) {
      throw new Error(`Field rule already exists for ${rule.formOID}.${rule.fieldOID}`);
    }
    
    plan.fieldRules.push(rule);
    return plan;
  }
  
  addRiskCriteria(planId: string, criteria: Omit<SDVRiskCriteria, 'id'>): SDVPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`SDV plan not found: ${planId}`);
    }
    
    if (!plan.riskCriteria) {
      plan.riskCriteria = [];
    }
    
    plan.riskCriteria.push({
      ...criteria,
      id: crypto.randomUUID(),
    });
    
    return plan;
  }
  
  // --------------------------------------------------------------------------
  // SDV Record Management
  // --------------------------------------------------------------------------
  
  createSDVRecord(params: {
    studyId: string;
    siteId: string;
    subjectId: string;
    visitId?: string;
    formInstanceId: string;
    formOID: string;
    fieldOID: string;
    sectionId: string;
    repeatKey?: string;
    edcValue?: unknown;
  }): SDVRecord {
    // Check if record already exists
    const existing = this.findRecord(
      params.formInstanceId,
      params.fieldOID,
      params.sectionId,
      params.repeatKey
    );
    if (existing) {
      return existing;
    }
    
    // Determine if SDV is required based on plan
    const plan = this.getActivePlan(params.studyId);
    const sdvRequired = this.isSDVRequired(plan, params.formOID, params.fieldOID);
    
    const record: SDVRecord = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      siteId: params.siteId,
      subjectId: params.subjectId,
      visitId: params.visitId,
      formInstanceId: params.formInstanceId,
      formOID: params.formOID,
      fieldOID: params.fieldOID,
      sectionId: params.sectionId,
      repeatKey: params.repeatKey,
      status: sdvRequired ? 'PENDING' : 'NOT_REQUIRED',
      sdvType: this.config.enableRemoteSDV ? 'HYBRID' : 'ON_SITE',
      edcValue: params.edcValue,
      edcValueTimestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.records.set(record.id, record);
    
    this.addAuditEntry(record.id, 'CREATED', 'system', undefined, record.status);
    
    return record;
  }
  
  private findRecord(
    formInstanceId: string,
    fieldOID: string,
    sectionId: string,
    repeatKey?: string
  ): SDVRecord | null {
    for (const record of Array.from(Array.from(this.records.values()))) {
      if (
        record.formInstanceId === formInstanceId &&
        record.fieldOID === fieldOID &&
        record.sectionId === sectionId &&
        record.repeatKey === repeatKey
      ) {
        return record;
      }
    }
    return null;
  }
  
  private isSDVRequired(
    plan: SDVPlan | null,
    formOID: string,
    fieldOID: string
  ): boolean {
    if (!plan) {
      // Default to full SDV if no plan
      return this.config.defaultSDVStrategy === 'FULL';
    }
    
    // Check field-level rule first
    const fieldRule = plan.fieldRules.find(
      r => r.formOID === formOID && r.fieldOID === fieldOID
    );
    if (fieldRule) {
      return fieldRule.sdvRequired;
    }
    
    // Check form-level rule
    const formRule = plan.formRules.find(r => r.formOID === formOID);
    if (formRule) {
      return formRule.sdvRequired;
    }
    
    // Use plan default
    return plan.defaultPercentage > 0;
  }
  
  getSDVRecord(recordId: string): SDVRecord | null {
    return this.records.get(recordId) || null;
  }
  
  listSDVRecords(filter?: {
    studyId?: string;
    siteId?: string;
    subjectId?: string;
    formInstanceId?: string;
    status?: SDVStatus[];
    assignedTo?: string;
  }): SDVRecord[] {
    let records = Array.from(this.records.values());
    
    if (filter?.studyId) {
      records = records.filter(r => r.studyId === filter.studyId);
    }
    if (filter?.siteId) {
      records = records.filter(r => r.siteId === filter.siteId);
    }
    if (filter?.subjectId) {
      records = records.filter(r => r.subjectId === filter.subjectId);
    }
    if (filter?.formInstanceId) {
      records = records.filter(r => r.formInstanceId === filter.formInstanceId);
    }
    if (filter?.status?.length) {
      records = records.filter(r => filter.status!.includes(r.status));
    }
    if (filter?.assignedTo) {
      records = records.filter(r => r.assignedTo === filter.assignedTo);
    }
    
    return records;
  }
  
  // --------------------------------------------------------------------------
  // SDV Assignment
  // --------------------------------------------------------------------------
  
  assignSDVRecord(recordId: string, assignedTo: string, assignedBy: string): SDVRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${recordId}`);
    }
    
    if (record.status === 'NOT_REQUIRED') {
      throw new Error('Cannot assign SDV for field that does not require SDV');
    }
    
    record.assignedTo = assignedTo;
    record.assignedAt = new Date();
    record.updatedAt = new Date();
    
    this.addAuditEntry(recordId, 'ASSIGNED', assignedBy, undefined, undefined, 
      `Assigned to ${assignedTo}`);
    
    return record;
  }
  
  bulkAssign(recordIds: string[], assignedTo: string, assignedBy: string): {
    succeeded: number;
    failed: number;
    errors: string[];
  } {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const recordId of recordIds) {
      try {
        this.assignSDVRecord(recordId, assignedTo, assignedBy);
        succeeded++;
      } catch (error) {
        failed++;
        errors.push(`${recordId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return { succeeded, failed, errors };
  }
  
  createAssignment(params: {
    monitorId: string;
    monitorName: string;
    studyId: string;
    siteId: string;
    formOIDs?: string[];
    visitIds?: string[];
    startDate: Date;
    endDate?: Date;
    createdBy: string;
  }): SDVAssignment {
    const assignment: SDVAssignment = {
      id: crypto.randomUUID(),
      monitorId: params.monitorId,
      monitorName: params.monitorName,
      studyId: params.studyId,
      siteId: params.siteId,
      formOIDs: params.formOIDs,
      visitIds: params.visitIds,
      status: 'ACTIVE',
      startDate: params.startDate,
      endDate: params.endDate,
      createdAt: new Date(),
      createdBy: params.createdBy,
    };
    
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }
  
  getAssignment(assignmentId: string): SDVAssignment | null {
    return this.assignments.get(assignmentId) || null;
  }
  
  listAssignments(filter?: {
    studyId?: string;
    siteId?: string;
    monitorId?: string;
    status?: SDVAssignment['status'];
  }): SDVAssignment[] {
    let assignments = Array.from(this.assignments.values());
    
    if (filter?.studyId) {
      assignments = assignments.filter(a => a.studyId === filter.studyId);
    }
    if (filter?.siteId) {
      assignments = assignments.filter(a => a.siteId === filter.siteId);
    }
    if (filter?.monitorId) {
      assignments = assignments.filter(a => a.monitorId === filter.monitorId);
    }
    if (filter?.status) {
      assignments = assignments.filter(a => a.status === filter.status);
    }
    
    return assignments;
  }
  
  // --------------------------------------------------------------------------
  // SDV Verification
  // --------------------------------------------------------------------------
  
  startVerification(recordId: string, monitorId: string): SDVRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${recordId}`);
    }
    
    if (record.status !== 'PENDING') {
      throw new Error(`Cannot start verification for record in status: ${record.status}`);
    }
    
    const previousStatus = record.status;
    record.status = 'IN_PROGRESS';
    record.assignedTo = monitorId;
    record.assignedAt = new Date();
    record.updatedAt = new Date();
    
    this.addAuditEntry(recordId, 'STARTED', monitorId, previousStatus, record.status);
    
    return record;
  }
  
  verifyField(params: {
    recordId: string;
    verifiedBy: string;
    verificationMethod: 'DIRECT' | 'CERTIFIED_COPY' | 'ELECTRONIC';
    sourceDocumentId?: string;
    sourceDocumentType?: string;
    sourceDocumentDate?: Date;
    signature?: string;
  }): SDVRecord {
    const record = this.records.get(params.recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${params.recordId}`);
    }
    
    if (record.status !== 'PENDING' && record.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot verify record in status: ${record.status}`);
    }
    
    if (this.config.requireSignature && !params.signature) {
      throw new Error('Electronic signature required for SDV verification');
    }
    
    const previousStatus = record.status;
    record.status = 'VERIFIED';
    record.verifiedBy = params.verifiedBy;
    record.verifiedAt = new Date();
    record.verificationMethod = params.verificationMethod;
    record.sourceDocumentId = params.sourceDocumentId;
    record.sourceDocumentType = params.sourceDocumentType;
    record.sourceDocumentDate = params.sourceDocumentDate;
    record.updatedAt = new Date();
    
    this.addAuditEntry(
      params.recordId, 
      'VERIFIED', 
      params.verifiedBy, 
      previousStatus, 
      record.status,
      `Method: ${params.verificationMethod}`,
      undefined,
      params.signature
    );
    
    return record;
  }
  
  reportDiscrepancy(params: {
    recordId: string;
    type: DiscrepancyType;
    description: string;
    sourceValue?: unknown;
    reportedBy: string;
    createQuery?: boolean;
  }): SDVRecord {
    const record = this.records.get(params.recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${params.recordId}`);
    }
    
    const previousStatus = record.status;
    record.status = 'DISCREPANCY';
    record.discrepancy = {
      type: params.type,
      description: params.description,
      sourceValue: params.sourceValue,
      edcValue: record.edcValue,
      reportedBy: params.reportedBy,
      reportedAt: new Date(),
    };
    record.updatedAt = new Date();
    
    this.addAuditEntry(
      params.recordId,
      'DISCREPANCY_REPORTED',
      params.reportedBy,
      previousStatus,
      record.status,
      `Type: ${params.type}. ${params.description}`
    );
    
    return record;
  }
  
  resolveDiscrepancy(params: {
    recordId: string;
    resolution: string;
    resolvedBy: string;
    queryId?: string;
  }): SDVRecord {
    const record = this.records.get(params.recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${params.recordId}`);
    }
    
    if (record.status !== 'DISCREPANCY') {
      throw new Error('No discrepancy to resolve');
    }
    
    if (!record.discrepancy) {
      throw new Error('Discrepancy details missing');
    }
    
    const previousStatus = record.status;
    record.status = 'RESOLVED';
    record.discrepancy.resolvedBy = params.resolvedBy;
    record.discrepancy.resolvedAt = new Date();
    record.discrepancy.resolution = params.resolution;
    record.discrepancy.queryId = params.queryId;
    record.updatedAt = new Date();
    
    this.addAuditEntry(
      params.recordId,
      'DISCREPANCY_RESOLVED',
      params.resolvedBy,
      previousStatus,
      record.status,
      params.resolution
    );
    
    return record;
  }
  
  waiveSDV(params: {
    recordId: string;
    reason: string;
    waivedBy: string;
  }): SDVRecord {
    const record = this.records.get(params.recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${params.recordId}`);
    }
    
    if (record.status === 'VERIFIED') {
      throw new Error('Cannot waive already verified record');
    }
    
    const previousStatus = record.status;
    record.status = 'WAIVED';
    record.waivedBy = params.waivedBy;
    record.waivedAt = new Date();
    record.waiverReason = params.reason;
    record.updatedAt = new Date();
    
    this.addAuditEntry(
      params.recordId,
      'WAIVED',
      params.waivedBy,
      previousStatus,
      record.status,
      params.reason
    );
    
    return record;
  }
  
  reopenVerification(recordId: string, reason: string, reopenedBy: string): SDVRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`SDV record not found: ${recordId}`);
    }
    
    if (record.status !== 'VERIFIED' && record.status !== 'RESOLVED') {
      throw new Error(`Cannot reopen record in status: ${record.status}`);
    }
    
    const previousStatus = record.status;
    record.status = 'PENDING';
    record.verifiedBy = undefined;
    record.verifiedAt = undefined;
    record.updatedAt = new Date();
    
    this.addAuditEntry(
      recordId,
      'REOPENED',
      reopenedBy,
      previousStatus,
      record.status,
      reason
    );
    
    return record;
  }
  
  // --------------------------------------------------------------------------
  // SDV Visits
  // --------------------------------------------------------------------------
  
  scheduleSDVVisit(params: {
    studyId: string;
    siteId: string;
    monitorId: string;
    visitType: SDVType;
    scheduledDate: Date;
    subjectsToReview: string[];
    formsToReview: string[];
    notes?: string;
  }): SDVVisit {
    const visit: SDVVisit = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      siteId: params.siteId,
      monitorId: params.monitorId,
      visitType: params.visitType,
      scheduledDate: params.scheduledDate,
      status: 'SCHEDULED',
      subjectsToReview: params.subjectsToReview,
      formsToReview: params.formsToReview,
      fieldsVerified: 0,
      discrepanciesFound: 0,
      discrepanciesResolved: 0,
      notes: params.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.sdvVisits.set(visit.id, visit);
    return visit;
  }
  
  getSDVVisit(visitId: string): SDVVisit | null {
    return this.sdvVisits.get(visitId) || null;
  }
  
  listSDVVisits(filter?: {
    studyId?: string;
    siteId?: string;
    monitorId?: string;
    status?: SDVVisit['status'];
  }): SDVVisit[] {
    let visits = Array.from(this.sdvVisits.values());
    
    if (filter?.studyId) {
      visits = visits.filter(v => v.studyId === filter.studyId);
    }
    if (filter?.siteId) {
      visits = visits.filter(v => v.siteId === filter.siteId);
    }
    if (filter?.monitorId) {
      visits = visits.filter(v => v.monitorId === filter.monitorId);
    }
    if (filter?.status) {
      visits = visits.filter(v => v.status === filter.status);
    }
    
    return visits.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }
  
  startSDVVisit(visitId: string): SDVVisit {
    const visit = this.sdvVisits.get(visitId);
    if (!visit) {
      throw new Error(`SDV visit not found: ${visitId}`);
    }
    
    visit.status = 'IN_PROGRESS';
    visit.actualStartDate = new Date();
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  completeSDVVisit(visitId: string, findings?: string): SDVVisit {
    const visit = this.sdvVisits.get(visitId);
    if (!visit) {
      throw new Error(`SDV visit not found: ${visitId}`);
    }
    
    // Calculate results
    const records = this.listSDVRecords({
      studyId: visit.studyId,
      siteId: visit.siteId,
    });
    
    const relevantRecords = records.filter(r => 
      visit.subjectsToReview.includes(r.subjectId) &&
      visit.formsToReview.includes(r.formOID)
    );
    
    visit.status = 'COMPLETED';
    visit.actualEndDate = new Date();
    visit.fieldsVerified = relevantRecords.filter(r => r.status === 'VERIFIED').length;
    visit.discrepanciesFound = relevantRecords.filter(r => 
      r.status === 'DISCREPANCY' || r.discrepancy
    ).length;
    visit.discrepanciesResolved = relevantRecords.filter(r => 
      r.status === 'RESOLVED'
    ).length;
    visit.findings = findings;
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  cancelSDVVisit(visitId: string, reason: string): SDVVisit {
    const visit = this.sdvVisits.get(visitId);
    if (!visit) {
      throw new Error(`SDV visit not found: ${visitId}`);
    }
    
    visit.status = 'CANCELLED';
    visit.notes = visit.notes ? `${visit.notes}\n\nCancellation: ${reason}` : `Cancellation: ${reason}`;
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------
  
  getMetrics(studyId: string, siteId?: string): SDVMetrics {
    const records = this.listSDVRecords({ studyId, siteId });
    
    // Filter to only those requiring SDV
    const sdvRequired = records.filter(r => r.status !== 'NOT_REQUIRED');
    
    const verified = sdvRequired.filter(r => r.status === 'VERIFIED' || r.status === 'RESOLVED');
    const pending = sdvRequired.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS');
    const withDiscrepancy = sdvRequired.filter(r => r.status === 'DISCREPANCY');
    const waived = sdvRequired.filter(r => r.status === 'WAIVED');
    
    // By form
    const formMap = new Map<string, { total: number; verified: number; pending: number; name: string }>();
    for (const record of sdvRequired) {
      const existing = formMap.get(record.formOID) || { total: 0, verified: 0, pending: 0, name: record.formOID };
      existing.total++;
      if (record.status === 'VERIFIED' || record.status === 'RESOLVED') {
        existing.verified++;
      }
      if (record.status === 'PENDING' || record.status === 'IN_PROGRESS') {
        existing.pending++;
      }
      formMap.set(record.formOID, existing);
    }
    
    // By subject
    const subjectMap = new Map<string, { total: number; verified: number }>();
    for (const record of sdvRequired) {
      const existing = subjectMap.get(record.subjectId) || { total: 0, verified: 0 };
      existing.total++;
      if (record.status === 'VERIFIED' || record.status === 'RESOLVED') {
        existing.verified++;
      }
      subjectMap.set(record.subjectId, existing);
    }
    
    // Average time to verify
    const verifiedRecords = sdvRequired.filter(r => r.verifiedAt && r.createdAt);
    const avgTime = verifiedRecords.length > 0
      ? verifiedRecords.reduce((sum, r) => {
          const days = (r.verifiedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / verifiedRecords.length
      : 0;
    
    // This week/month
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const thisWeek = verified.filter(r => r.verifiedAt && r.verifiedAt > oneWeekAgo).length;
    const thisMonth = verified.filter(r => r.verifiedAt && r.verifiedAt > oneMonthAgo).length;
    
    return {
      studyId,
      siteId,
      totalFieldsRequiringSDV: sdvRequired.length,
      fieldsVerified: verified.length,
      fieldsPending: pending.length,
      fieldsWithDiscrepancy: withDiscrepancy.length,
      fieldsWaived: waived.length,
      completionPercentage: sdvRequired.length > 0 
        ? (verified.length / sdvRequired.length) * 100 
        : 0,
      discrepancyRate: sdvRequired.length > 0
        ? (withDiscrepancy.length / sdvRequired.length) * 100
        : 0,
      byForm: Array.from(formMap.entries()).map(([formOID, data]) => ({
        formOID,
        formName: data.name,
        total: data.total,
        verified: data.verified,
        pending: data.pending,
        percentage: data.total > 0 ? (data.verified / data.total) * 100 : 0,
      })),
      bySubject: Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
        subjectId,
        total: data.total,
        verified: data.verified,
        percentage: data.total > 0 ? (data.verified / data.total) * 100 : 0,
      })),
      averageTimeToVerify: avgTime,
      verificationsThisWeek: thisWeek,
      verificationsThisMonth: thisMonth,
      calculatedAt: new Date(),
    };
  }
  
  getSiteSummaries(studyId: string): SiteSDVSummary[] {
    const records = this.listSDVRecords({ studyId });
    const sdvRequired = records.filter(r => r.status !== 'NOT_REQUIRED');
    
    const siteMap = new Map<string, {
      total: number;
      verified: number;
      pending: number;
      discrepancies: number;
      lastDate?: Date;
      monitor?: string;
    }>();
    
    for (const record of sdvRequired) {
      const existing = siteMap.get(record.siteId) || {
        total: 0,
        verified: 0,
        pending: 0,
        discrepancies: 0,
      };
      
      existing.total++;
      
      if (record.status === 'VERIFIED' || record.status === 'RESOLVED') {
        existing.verified++;
        if (record.verifiedAt && (!existing.lastDate || record.verifiedAt > existing.lastDate)) {
          existing.lastDate = record.verifiedAt;
        }
      }
      
      if (record.status === 'PENDING' || record.status === 'IN_PROGRESS') {
        existing.pending++;
      }
      
      if (record.status === 'DISCREPANCY') {
        existing.discrepancies++;
      }
      
      if (record.assignedTo) {
        existing.monitor = record.assignedTo;
      }
      
      siteMap.set(record.siteId, existing);
    }
    
    return Array.from(siteMap.entries()).map(([siteId, data]) => ({
      siteId,
      totalFields: data.total,
      verified: data.verified,
      pending: data.pending,
      discrepancies: data.discrepancies,
      completionRate: data.total > 0 ? (data.verified / data.total) * 100 : 0,
      lastSDVDate: data.lastDate,
      assignedMonitor: data.monitor,
    }));
  }
  
  // --------------------------------------------------------------------------
  // Audit
  // --------------------------------------------------------------------------
  
  private addAuditEntry(
    sdvRecordId: string,
    action: SDVAuditAction,
    performedBy: string,
    previousStatus?: SDVStatus,
    newStatus?: SDVStatus,
    details?: string,
    ipAddress?: string,
    signature?: string
  ): void {
    this.auditLog.push({
      id: crypto.randomUUID(),
      sdvRecordId,
      action,
      performedBy,
      performedAt: new Date(),
      previousStatus,
      newStatus,
      details,
      ipAddress,
      signature,
    });
  }
  
  getAuditLog(sdvRecordId?: string): SDVAuditEntry[] {
    if (sdvRecordId) {
      return this.auditLog.filter(e => e.sdvRecordId === sdvRecordId);
    }
    return [...this.auditLog];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSDVService(config: SDVServiceConfig): SDVService {
  return new SDVService(config);
}
