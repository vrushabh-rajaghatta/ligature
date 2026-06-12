
/**
 * Randomization Service
 * Subject randomization, treatment assignment, and unblinding management
 * @version 0.20.8.1
 */

import type {
  RandomizationConfig,
  RandomizationList,
  RandomizationAssignment,
  StratificationFactor,
  StratificationLevel,
  AllocationRatio,
  RandomizationMethod,
  BlindingType,
} from './arm-randomization-config';

// ============================================================================
// Randomization Event Types
// ============================================================================

export type RandomizationEventType =
  | 'SUBJECT_RANDOMIZED'
  | 'RANDOMIZATION_FAILED'
  | 'TREATMENT_ASSIGNED'
  | 'TREATMENT_CHANGED'
  | 'UNBLINDING_REQUESTED'
  | 'UNBLINDING_APPROVED'
  | 'UNBLINDING_DENIED'
  | 'UNBLINDING_EXECUTED'
  | 'LIST_EXHAUSTED'
  | 'LIST_REFRESHED'
  | 'STRATUM_CREATED'
  | 'BALANCE_WARNING';

export interface RandomizationEvent {
  id: string;
  studyId: string;
  siteId?: string;
  subjectId?: string;
  eventType: RandomizationEventType;
  eventDate: Date;
  
  // Event details
  details: Record<string, unknown>;
  
  // Actor
  performedBy: string;
  performedByRole?: string;
  
  // Reason tracking
  reason?: string;
}

// ============================================================================
// Randomization Request/Result Types
// ============================================================================

export interface RandomizationRequest {
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Stratification values (if stratified)
  stratificationValues?: StratificationValue[];
  
  // Request metadata
  requestedBy: string;
  requestedAt?: Date;
  
  // Optional override (requires special permission)
  forceAssignment?: {
    armId: string;
    reason: string;
    approvedBy: string;
  };
}

export interface StratificationValue {
  factorId: string;
  levelId: string;
}

export interface RandomizationResult {
  id: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Assignment
  randomizationNumber: string;
  armId: string;
  armName: string;
  treatmentCode?: string;
  
  // Stratification
  stratumId?: string;
  stratificationValues?: StratificationValue[];
  
  // List tracking
  listId: string;
  sequenceNumber: number;
  
  // Result
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  
  // Timestamps
  randomizedAt: Date;
  randomizedBy: string;
}

export interface RandomizationFailure {
  subjectId: string;
  reason: RandomizationFailureReason;
  message: string;
  details?: Record<string, unknown>;
}

export type RandomizationFailureReason =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_NOT_ACTIVE'
  | 'LIST_NOT_FOUND'
  | 'LIST_EXHAUSTED'
  | 'SUBJECT_ALREADY_RANDOMIZED'
  | 'INVALID_STRATIFICATION'
  | 'MISSING_STRATIFICATION'
  | 'ELIGIBILITY_NOT_MET'
  | 'SITE_NOT_ACTIVATED'
  | 'SYSTEM_ERROR';

// ============================================================================
// Treatment Assignment Types
// ============================================================================

export interface TreatmentAssignment {
  id: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  randomizationResultId: string;
  
  // Assignment
  armId: string;
  armName: string;
  treatmentCode: string;
  
  // Kit/medication tracking
  kitNumber?: string;
  kitAssignedAt?: Date;
  kitAssignedBy?: string;
  
  // Status
  status: TreatmentAssignmentStatus;
  startDate?: Date;
  endDate?: Date;
  
  // Changes
  changes: TreatmentChange[];
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export type TreatmentAssignmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SUSPENDED'
  | 'DISCONTINUED';

export interface TreatmentChange {
  id: string;
  changeType: TreatmentChangeType;
  changeDate: Date;
  changedBy: string;
  
  // Previous/new values
  previousTreatmentCode?: string;
  newTreatmentCode?: string;
  previousArmId?: string;
  newArmId?: string;
  
  // Reason
  reason: string;
  approvedBy?: string;
}

export type TreatmentChangeType =
  | 'STARTED'
  | 'DOSE_MODIFICATION'
  | 'TEMPORARY_HOLD'
  | 'RESUMED'
  | 'ARM_CROSSOVER'
  | 'DISCONTINUED';

// ============================================================================
// Unblinding Types
// ============================================================================

export interface UnblindingRequest {
  id: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Request details
  requestType: UnblindingRequestType;
  reason: string;
  urgency: UnblindingUrgency;
  
  // Medical context
  medicalJustification?: string;
  safetyEventId?: string;
  
  // Requestor
  requestedBy: string;
  requestedByRole: string;
  requestedAt: Date;
  
  // Approval workflow
  status: UnblindingRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Execution
  executedBy?: string;
  executedAt?: Date;
  unblindedTreatment?: string;
  
  // Notifications
  notificationsSent: UnblindingNotification[];
}

export type UnblindingRequestType =
  | 'EMERGENCY'
  | 'SAFETY'
  | 'END_OF_STUDY'
  | 'REGULATORY'
  | 'OTHER';

export type UnblindingUrgency = 'IMMEDIATE' | 'URGENT' | 'ROUTINE';

export type UnblindingRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DENIED'
  | 'EXECUTED'
  | 'CANCELLED';

export interface UnblindingNotification {
  id: string;
  recipientId: string;
  recipientRole: string;
  recipientEmail?: string;
  notificationType: 'REQUEST' | 'APPROVAL' | 'DENIAL' | 'EXECUTION';
  sentAt: Date;
  acknowledged?: boolean;
  acknowledgedAt?: Date;
}

// ============================================================================
// Stratum Tracking Types
// ============================================================================

export interface Stratum {
  id: string;
  studyId: string;
  
  // Stratum definition
  values: StratificationValue[];
  displayName: string;
  
  // List association
  listId: string;
  
  // Balance tracking
  totalAssignments: number;
  assignmentsByArm: Record<string, number>;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
}

export interface StratumBalance {
  stratumId: string;
  stratumName: string;
  totalSubjects: number;
  armCounts: ArmCount[];
  isBalanced: boolean;
  imbalanceRatio?: number;
}

export interface ArmCount {
  armId: string;
  armName: string;
  count: number;
  expectedRatio: number;
  actualRatio: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RandomizationServiceConfig {
  tenantId: string;
  
  // Number generation
  numberPrefix?: string;
  numberPadding?: number;
  
  // Balance settings
  maxAllowedImbalance?: number; // e.g., 0.15 for 15%
  
  // Unblinding settings
  requireApprovalForUnblinding?: boolean;
  autoNotifyOnUnblinding?: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface RandomizationResultFilter {
  studyId?: string;
  siteId?: string;
  armId?: string;
  stratumId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UnblindingRequestFilter {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  status?: UnblindingRequestStatus;
  requestType?: UnblindingRequestType;
}

export interface TreatmentAssignmentFilter {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  armId?: string;
  status?: TreatmentAssignmentStatus;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface RandomizationMetrics {
  studyId: string;
  
  // Overall counts
  totalRandomized: number;
  totalPending: number;
  totalFailed: number;
  
  // By site
  siteMetrics: SiteRandomizationMetrics[];
  
  // By arm
  armCounts: ArmCount[];
  
  // By stratum
  stratumBalances: StratumBalance[];
  
  // List status
  listsStatus: ListStatusSummary[];
  
  // Unblinding
  totalUnblindingRequests: number;
  pendingUnblindingRequests: number;
  executedUnblindings: number;
  
  // Calculated
  overallBalance: number; // 0-1, 1 = perfect balance
  lastRandomizationDate?: Date;
}

export interface SiteRandomizationMetrics {
  siteId: string;
  siteName: string;
  totalRandomized: number;
  totalPending: number;
  armCounts: ArmCount[];
}

export interface ListStatusSummary {
  listId: string;
  siteId?: string;
  stratum?: string;
  totalSlots: number;
  usedSlots: number;
  remainingSlots: number;
  percentUsed: number;
  status: string;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IRandomizationService {
  // Subject randomization
  randomize(request: RandomizationRequest): RandomizationResult;
  getRandomizationResult(resultId: string): RandomizationResult | null;
  getSubjectRandomization(subjectId: string): RandomizationResult | null;
  listRandomizationResults(filter?: RandomizationResultFilter): RandomizationResult[];
  
  // Stratification
  getOrCreateStratum(studyId: string, values: StratificationValue[]): Stratum;
  getStratum(stratumId: string): Stratum | null;
  listStrata(studyId: string): Stratum[];
  getStratumBalance(stratumId: string): StratumBalance | null;
  
  // Treatment assignment
  assignTreatment(params: AssignTreatmentParams): TreatmentAssignment;
  updateTreatmentAssignment(assignmentId: string, updates: TreatmentAssignmentUpdate): TreatmentAssignment;
  getTreatmentAssignment(assignmentId: string): TreatmentAssignment | null;
  getSubjectTreatment(subjectId: string): TreatmentAssignment | null;
  listTreatmentAssignments(filter?: TreatmentAssignmentFilter): TreatmentAssignment[];
  
  // Unblinding
  requestUnblinding(params: RequestUnblindingParams): UnblindingRequest;
  approveUnblinding(requestId: string, approvedBy: string, notes?: string): UnblindingRequest;
  denyUnblinding(requestId: string, deniedBy: string, reason: string): UnblindingRequest;
  executeUnblinding(requestId: string, executedBy: string): UnblindingRequest;
  cancelUnblindingRequest(requestId: string, cancelledBy: string, reason: string): UnblindingRequest;
  getUnblindingRequest(requestId: string): UnblindingRequest | null;
  listUnblindingRequests(filter?: UnblindingRequestFilter): UnblindingRequest[];
  
  // Events & audit
  getEvents(studyId: string, limit?: number): RandomizationEvent[];
  getSubjectEvents(subjectId: string): RandomizationEvent[];
  
  // Metrics
  getMetrics(studyId: string): RandomizationMetrics;
  
  // List management
  registerList(list: RandomizationList): void;
  getAvailableList(studyId: string, siteId?: string, stratumId?: string): RandomizationList | null;
  refreshList(listId: string, newAssignments: RandomizationAssignment[], refreshedBy: string): RandomizationList;
}

export interface AssignTreatmentParams {
  randomizationResultId: string;
  treatmentCode: string;
  kitNumber?: string;
  assignedBy: string;
}

export interface TreatmentAssignmentUpdate {
  status?: TreatmentAssignmentStatus;
  startDate?: Date;
  endDate?: Date;
  kitNumber?: string;
  updatedBy: string;
  changeReason?: string;
}

export interface RequestUnblindingParams {
  studyId: string;
  siteId: string;
  subjectId: string;
  requestType: UnblindingRequestType;
  reason: string;
  urgency: UnblindingUrgency;
  medicalJustification?: string;
  safetyEventId?: string;
  requestedBy: string;
  requestedByRole: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class RandomizationService implements IRandomizationService {
  private config: Required<RandomizationServiceConfig>;
  
  // Storage
  private randomizationResults: Map<string, RandomizationResult> = new Map();
  private subjectRandomizations: Map<string, string> = new Map(); // subjectId -> resultId
  private strata: Map<string, Stratum> = new Map();
  private lists: Map<string, RandomizationList> = new Map();
  private treatmentAssignments: Map<string, TreatmentAssignment> = new Map();
  private subjectTreatments: Map<string, string> = new Map(); // subjectId -> assignmentId
  private unblindingRequests: Map<string, UnblindingRequest> = new Map();
  private events: RandomizationEvent[] = [];
  
  // Counters for number generation
  private randomizationCounters: Map<string, number> = new Map(); // studyId -> counter
  
  constructor(config: RandomizationServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      numberPrefix: config.numberPrefix ?? 'R',
      numberPadding: config.numberPadding ?? 4,
      maxAllowedImbalance: config.maxAllowedImbalance ?? 0.2,
      requireApprovalForUnblinding: config.requireApprovalForUnblinding ?? true,
      autoNotifyOnUnblinding: config.autoNotifyOnUnblinding ?? true,
    };
  }
  
  // ===========================================================================
  // Subject Randomization
  // ===========================================================================
  
  randomize(request: RandomizationRequest): RandomizationResult {
    const { studyId, siteId, subjectId, stratificationValues, requestedBy } = request;
    
    // Check if already randomized
    if (this.subjectRandomizations.has(subjectId)) {
      const existingResultId = this.subjectRandomizations.get(subjectId)!;
      const existingResult = this.randomizationResults.get(existingResultId);
      
      if (existingResult && existingResult.status === 'SUCCESS') {
        this.recordEvent({
          studyId,
          siteId,
          subjectId,
          eventType: 'RANDOMIZATION_FAILED',
          details: { reason: 'SUBJECT_ALREADY_RANDOMIZED', existingResultId },
          performedBy: requestedBy,
        });
        
        throw new Error(`Subject ${subjectId} is already randomized`);
      }
    }
    
    // Handle force assignment
    if (request.forceAssignment) {
      return this.handleForceAssignment(request);
    }
    
    // Get stratum if stratified
    let stratum: Stratum | null = null;
    let stratumId: string | undefined;
    
    if (stratificationValues && stratificationValues.length > 0) {
      stratum = this.getOrCreateStratum(studyId, stratificationValues);
      stratumId = stratum.id;
    }
    
    // Get available list
    const list = this.getAvailableList(studyId, siteId, stratumId);
    
    if (!list) {
      this.recordEvent({
        studyId,
        siteId,
        subjectId,
        eventType: 'RANDOMIZATION_FAILED',
        details: { reason: 'LIST_NOT_FOUND' },
        performedBy: requestedBy,
      });
      
      throw new Error('No randomization list available');
    }
    
    // Find next available slot
    const assignment = list.assignments.find(a => !a.isUsed);
    
    if (!assignment) {
      this.recordEvent({
        studyId,
        siteId,
        eventType: 'LIST_EXHAUSTED',
        details: { listId: list.id },
        performedBy: requestedBy,
      });
      
      // Update list status
      list.status = 'EXHAUSTED';
      
      throw new Error('Randomization list exhausted');
    }
    
    // Generate randomization number
    const randomizationNumber = this.generateRandomizationNumber(studyId);
    
    // Mark assignment as used
    assignment.isUsed = true;
    assignment.usedAt = new Date();
    assignment.usedFor = subjectId;
    list.usedSlots++;
    
    // Update list
    this.lists.set(list.id, list);
    
    // Create result
    const result: RandomizationResult = {
      id: crypto.randomUUID(),
      studyId,
      siteId,
      subjectId,
      randomizationNumber,
      armId: assignment.armId,
      armName: assignment.armName,
      treatmentCode: assignment.treatmentCode,
      stratumId,
      stratificationValues,
      listId: list.id,
      sequenceNumber: assignment.sequenceNumber,
      status: 'SUCCESS',
      randomizedAt: new Date(),
      randomizedBy: requestedBy,
    };
    
    // Store result
    this.randomizationResults.set(result.id, result);
    this.subjectRandomizations.set(subjectId, result.id);
    
    // Update stratum balance
    if (stratum) {
      stratum.totalAssignments++;
      stratum.assignmentsByArm[assignment.armId] = 
        (stratum.assignmentsByArm[assignment.armId] ?? 0) + 1;
      this.strata.set(stratum.id, stratum);
    }
    
    // Record event
    this.recordEvent({
      studyId,
      siteId,
      subjectId,
      eventType: 'SUBJECT_RANDOMIZED',
      details: {
        randomizationNumber,
        armId: assignment.armId,
        armName: assignment.armName,
        stratumId,
        sequenceNumber: assignment.sequenceNumber,
      },
      performedBy: requestedBy,
    });
    
    // Check balance
    this.checkAndWarnBalance(studyId, assignment.armId);
    
    return result;
  }
  
  private handleForceAssignment(request: RandomizationRequest): RandomizationResult {
    const { studyId, siteId, subjectId, stratificationValues, requestedBy } = request;
    const forceAssignment = request.forceAssignment!;
    
    // Generate randomization number
    const randomizationNumber = this.generateRandomizationNumber(studyId);
    
    // Get stratum if stratified
    let stratumId: string | undefined;
    if (stratificationValues && stratificationValues.length > 0) {
      const stratum = this.getOrCreateStratum(studyId, stratificationValues);
      stratumId = stratum.id;
      
      // Update stratum balance
      stratum.totalAssignments++;
      stratum.assignmentsByArm[forceAssignment.armId] = 
        (stratum.assignmentsByArm[forceAssignment.armId] ?? 0) + 1;
      this.strata.set(stratum.id, stratum);
    }
    
    // Create result
    const result: RandomizationResult = {
      id: crypto.randomUUID(),
      studyId,
      siteId,
      subjectId,
      randomizationNumber,
      armId: forceAssignment.armId,
      armName: `Arm (Forced)`,
      stratumId,
      stratificationValues,
      listId: 'FORCED',
      sequenceNumber: -1,
      status: 'SUCCESS',
      randomizedAt: new Date(),
      randomizedBy: requestedBy,
    };
    
    // Store result
    this.randomizationResults.set(result.id, result);
    this.subjectRandomizations.set(subjectId, result.id);
    
    // Record event
    this.recordEvent({
      studyId,
      siteId,
      subjectId,
      eventType: 'SUBJECT_RANDOMIZED',
      details: {
        randomizationNumber,
        armId: forceAssignment.armId,
        forced: true,
        reason: forceAssignment.reason,
        approvedBy: forceAssignment.approvedBy,
      },
      performedBy: requestedBy,
    });
    
    return result;
  }
  
  private generateRandomizationNumber(studyId: string): string {
    const counter = (this.randomizationCounters.get(studyId) ?? 0) + 1;
    this.randomizationCounters.set(studyId, counter);
    
    return `${this.config.numberPrefix}${counter.toString().padStart(this.config.numberPadding, '0')}`;
  }
  
  private checkAndWarnBalance(studyId: string, armId: string): void {
    // Get all results for this study
    const studyResults = Array.from(this.randomizationResults.values())
      .filter(r => r.studyId === studyId && r.status === 'SUCCESS');
    
    if (studyResults.length < 10) return; // Not enough data
    
    // Count by arm
    const armCounts = new Map<string, number>();
    for (const result of Array.from(studyResults)) {
      armCounts.set(result.armId, (armCounts.get(result.armId) ?? 0) + 1);
    }
    
    // Check balance
    const total = studyResults.length;
    const counts = Array.from(armCounts.values());
    const expectedPerArm = total / counts.length;
    
    for (const [arm, count] of Array.from(armCounts)) {
      const ratio = count / expectedPerArm;
      const imbalance = Math.abs(1 - ratio);
      
      if (imbalance > this.config.maxAllowedImbalance) {
        this.recordEvent({
          studyId,
          eventType: 'BALANCE_WARNING',
          details: {
            armId: arm,
            count,
            expected: expectedPerArm,
            imbalance: imbalance.toFixed(3),
          },
          performedBy: 'SYSTEM',
        });
      }
    }
  }
  
  getRandomizationResult(resultId: string): RandomizationResult | null {
    return this.randomizationResults.get(resultId) ?? null;
  }
  
  getSubjectRandomization(subjectId: string): RandomizationResult | null {
    const resultId = this.subjectRandomizations.get(subjectId);
    return resultId ? this.randomizationResults.get(resultId) ?? null : null;
  }
  
  listRandomizationResults(filter?: RandomizationResultFilter): RandomizationResult[] {
    let results = Array.from(this.randomizationResults.values());
    
    if (filter) {
      if (filter.studyId) {
        results = results.filter(r => r.studyId === filter.studyId);
      }
      if (filter.siteId) {
        results = results.filter(r => r.siteId === filter.siteId);
      }
      if (filter.armId) {
        results = results.filter(r => r.armId === filter.armId);
      }
      if (filter.stratumId) {
        results = results.filter(r => r.stratumId === filter.stratumId);
      }
      if (filter.startDate) {
        results = results.filter(r => r.randomizedAt >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter(r => r.randomizedAt <= filter.endDate!);
      }
    }
    
    return results.sort((a, b) => b.randomizedAt.getTime() - a.randomizedAt.getTime());
  }
  
  // ===========================================================================
  // Stratification
  // ===========================================================================
  
  getOrCreateStratum(studyId: string, values: StratificationValue[]): Stratum {
    // Create stratum ID from values
    const sortedValues = [...values].sort((a, b) => a.factorId.localeCompare(b.factorId));
    const stratumKey = sortedValues.map(v => `${v.factorId}:${v.levelId}`).join('|');
    const stratumId = `stratum-${studyId}-${this.hashString(stratumKey)}`;
    
    // Check if exists
    let stratum = this.strata.get(stratumId);
    
    if (!stratum) {
      // Create display name
      const displayName = sortedValues.map(v => `${v.factorId}=${v.levelId}`).join(', ');
      
      stratum = {
        id: stratumId,
        studyId,
        values: sortedValues,
        displayName,
        listId: '', // Will be assigned when list is registered
        totalAssignments: 0,
        assignmentsByArm: {},
        isActive: true,
        createdAt: new Date(),
      };
      
      this.strata.set(stratumId, stratum);
      
      this.recordEvent({
        studyId,
        eventType: 'STRATUM_CREATED',
        details: { stratumId, displayName, values: sortedValues },
        performedBy: 'SYSTEM',
      });
    }
    
    return stratum;
  }
  
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }
  
  getStratum(stratumId: string): Stratum | null {
    return this.strata.get(stratumId) ?? null;
  }
  
  listStrata(studyId: string): Stratum[] {
    return Array.from(this.strata.values())
      .filter(s => s.studyId === studyId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  
  getStratumBalance(stratumId: string): StratumBalance | null {
    const stratum = this.strata.get(stratumId);
    if (!stratum) return null;
    
    const totalSubjects = stratum.totalAssignments;
    const armIds = Object.keys(stratum.assignmentsByArm);
    const armCount = armIds.length || 1;
    const expectedPerArm = totalSubjects / armCount;
    
    const armCounts: ArmCount[] = armIds.map(armId => {
      const count = stratum.assignmentsByArm[armId] ?? 0;
      const expectedRatio = 1 / armCount;
      const actualRatio = totalSubjects > 0 ? count / totalSubjects : 0;
      
      return {
        armId,
        armName: `Arm ${armId}`,
        count,
        expectedRatio,
        actualRatio,
      };
    });
    
    // Check balance
    let maxImbalance = 0;
    for (const arm of Array.from(armCounts)) {
      const imbalance = Math.abs(arm.actualRatio - arm.expectedRatio);
      if (imbalance > maxImbalance) maxImbalance = imbalance;
    }
    
    return {
      stratumId,
      stratumName: stratum.displayName,
      totalSubjects,
      armCounts,
      isBalanced: maxImbalance <= this.config.maxAllowedImbalance,
      imbalanceRatio: maxImbalance,
    };
  }
  
  // ===========================================================================
  // Treatment Assignment
  // ===========================================================================
  
  assignTreatment(params: AssignTreatmentParams): TreatmentAssignment {
    const { randomizationResultId, treatmentCode, kitNumber, assignedBy } = params;
    
    // Get randomization result
    const result = this.randomizationResults.get(randomizationResultId);
    if (!result) {
      throw new Error(`Randomization result not found: ${randomizationResultId}`);
    }
    
    // Check if already has treatment
    if (this.subjectTreatments.has(result.subjectId)) {
      throw new Error(`Subject ${result.subjectId} already has treatment assigned`);
    }
    
    const now = new Date();
    
    const assignment: TreatmentAssignment = {
      id: crypto.randomUUID(),
      studyId: result.studyId,
      siteId: result.siteId,
      subjectId: result.subjectId,
      randomizationResultId,
      armId: result.armId,
      armName: result.armName,
      treatmentCode,
      kitNumber,
      kitAssignedAt: kitNumber ? now : undefined,
      kitAssignedBy: kitNumber ? assignedBy : undefined,
      status: 'PENDING',
      changes: [],
      createdAt: now,
      createdBy: assignedBy,
      updatedAt: now,
    };
    
    // Store
    this.treatmentAssignments.set(assignment.id, assignment);
    this.subjectTreatments.set(result.subjectId, assignment.id);
    
    // Record event
    this.recordEvent({
      studyId: result.studyId,
      siteId: result.siteId,
      subjectId: result.subjectId,
      eventType: 'TREATMENT_ASSIGNED',
      details: { treatmentCode, kitNumber, armId: result.armId },
      performedBy: assignedBy,
    });
    
    return assignment;
  }
  
  updateTreatmentAssignment(
    assignmentId: string,
    updates: TreatmentAssignmentUpdate
  ): TreatmentAssignment {
    const assignment = this.treatmentAssignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Treatment assignment not found: ${assignmentId}`);
    }
    
    const now = new Date();
    const previousStatus = assignment.status;
    
    // Track changes
    if (updates.status && updates.status !== assignment.status) {
      const changeType = this.determineChangeType(assignment.status, updates.status);
      
      assignment.changes.push({
        id: crypto.randomUUID(),
        changeType,
        changeDate: now,
        changedBy: updates.updatedBy,
        reason: updates.changeReason ?? `Status changed to ${updates.status}`,
      });
    }
    
    // Apply updates
    if (updates.status) assignment.status = updates.status;
    if (updates.startDate) assignment.startDate = updates.startDate;
    if (updates.endDate) assignment.endDate = updates.endDate;
    if (updates.kitNumber) {
      assignment.kitNumber = updates.kitNumber;
      assignment.kitAssignedAt = now;
      assignment.kitAssignedBy = updates.updatedBy;
    }
    assignment.updatedAt = now;
    
    // Store
    this.treatmentAssignments.set(assignmentId, assignment);
    
    // Record event
    this.recordEvent({
      studyId: assignment.studyId,
      siteId: assignment.siteId,
      subjectId: assignment.subjectId,
      eventType: 'TREATMENT_CHANGED',
      details: {
        previousStatus,
        newStatus: assignment.status,
        changeReason: updates.changeReason,
      },
      performedBy: updates.updatedBy,
    });
    
    return assignment;
  }
  
  private determineChangeType(
    previousStatus: TreatmentAssignmentStatus,
    newStatus: TreatmentAssignmentStatus
  ): TreatmentChangeType {
    if (previousStatus === 'PENDING' && newStatus === 'ACTIVE') return 'STARTED';
    if (newStatus === 'SUSPENDED') return 'TEMPORARY_HOLD';
    if (previousStatus === 'SUSPENDED' && newStatus === 'ACTIVE') return 'RESUMED';
    if (newStatus === 'DISCONTINUED') return 'DISCONTINUED';
    return 'STARTED';
  }
  
  getTreatmentAssignment(assignmentId: string): TreatmentAssignment | null {
    return this.treatmentAssignments.get(assignmentId) ?? null;
  }
  
  getSubjectTreatment(subjectId: string): TreatmentAssignment | null {
    const assignmentId = this.subjectTreatments.get(subjectId);
    return assignmentId ? this.treatmentAssignments.get(assignmentId) ?? null : null;
  }
  
  listTreatmentAssignments(filter?: TreatmentAssignmentFilter): TreatmentAssignment[] {
    let assignments = Array.from(this.treatmentAssignments.values());
    
    if (filter) {
      if (filter.studyId) {
        assignments = assignments.filter(a => a.studyId === filter.studyId);
      }
      if (filter.siteId) {
        assignments = assignments.filter(a => a.siteId === filter.siteId);
      }
      if (filter.subjectId) {
        assignments = assignments.filter(a => a.subjectId === filter.subjectId);
      }
      if (filter.armId) {
        assignments = assignments.filter(a => a.armId === filter.armId);
      }
      if (filter.status) {
        assignments = assignments.filter(a => a.status === filter.status);
      }
    }
    
    return assignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // ===========================================================================
  // Unblinding
  // ===========================================================================
  
  requestUnblinding(params: RequestUnblindingParams): UnblindingRequest {
    const now = new Date();
    
    const request: UnblindingRequest = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      siteId: params.siteId,
      subjectId: params.subjectId,
      requestType: params.requestType,
      reason: params.reason,
      urgency: params.urgency,
      medicalJustification: params.medicalJustification,
      safetyEventId: params.safetyEventId,
      requestedBy: params.requestedBy,
      requestedByRole: params.requestedByRole,
      requestedAt: now,
      status: params.urgency === 'IMMEDIATE' && !this.config.requireApprovalForUnblinding
        ? 'APPROVED'
        : 'PENDING',
      notificationsSent: [],
    };
    
    // Store
    this.unblindingRequests.set(request.id, request);
    
    // Record event
    this.recordEvent({
      studyId: params.studyId,
      siteId: params.siteId,
      subjectId: params.subjectId,
      eventType: 'UNBLINDING_REQUESTED',
      details: {
        requestId: request.id,
        requestType: params.requestType,
        urgency: params.urgency,
        reason: params.reason,
      },
      performedBy: params.requestedBy,
      performedByRole: params.requestedByRole,
    });
    
    // Auto-send notifications
    if (this.config.autoNotifyOnUnblinding) {
      this.addUnblindingNotification(request, 'REQUEST', params.requestedBy, params.requestedByRole);
    }
    
    return request;
  }
  
  private addUnblindingNotification(
    request: UnblindingRequest,
    type: 'REQUEST' | 'APPROVAL' | 'DENIAL' | 'EXECUTION',
    recipientId: string,
    recipientRole: string
  ): void {
    request.notificationsSent.push({
      id: crypto.randomUUID(),
      recipientId,
      recipientRole,
      notificationType: type,
      sentAt: new Date(),
    });
    this.unblindingRequests.set(request.id, request);
  }
  
  approveUnblinding(requestId: string, approvedBy: string, notes?: string): UnblindingRequest {
    const request = this.unblindingRequests.get(requestId);
    if (!request) {
      throw new Error(`Unblinding request not found: ${requestId}`);
    }
    
    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending: ${request.status}`);
    }
    
    request.status = 'APPROVED';
    request.reviewedBy = approvedBy;
    request.reviewedAt = new Date();
    request.reviewNotes = notes;
    
    this.unblindingRequests.set(requestId, request);
    
    // Record event
    this.recordEvent({
      studyId: request.studyId,
      siteId: request.siteId,
      subjectId: request.subjectId,
      eventType: 'UNBLINDING_APPROVED',
      details: { requestId, approvedBy, notes },
      performedBy: approvedBy,
    });
    
    if (this.config.autoNotifyOnUnblinding) {
      this.addUnblindingNotification(request, 'APPROVAL', request.requestedBy, request.requestedByRole);
    }
    
    return request;
  }
  
  denyUnblinding(requestId: string, deniedBy: string, reason: string): UnblindingRequest {
    const request = this.unblindingRequests.get(requestId);
    if (!request) {
      throw new Error(`Unblinding request not found: ${requestId}`);
    }
    
    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending: ${request.status}`);
    }
    
    request.status = 'DENIED';
    request.reviewedBy = deniedBy;
    request.reviewedAt = new Date();
    request.reviewNotes = reason;
    
    this.unblindingRequests.set(requestId, request);
    
    // Record event
    this.recordEvent({
      studyId: request.studyId,
      siteId: request.siteId,
      subjectId: request.subjectId,
      eventType: 'UNBLINDING_DENIED',
      details: { requestId, deniedBy, reason },
      performedBy: deniedBy,
    });
    
    if (this.config.autoNotifyOnUnblinding) {
      this.addUnblindingNotification(request, 'DENIAL', request.requestedBy, request.requestedByRole);
    }
    
    return request;
  }
  
  executeUnblinding(requestId: string, executedBy: string): UnblindingRequest {
    const request = this.unblindingRequests.get(requestId);
    if (!request) {
      throw new Error(`Unblinding request not found: ${requestId}`);
    }
    
    if (request.status !== 'APPROVED') {
      throw new Error(`Request must be approved before execution: ${request.status}`);
    }
    
    // Get subject's randomization to reveal treatment
    const randomization = this.getSubjectRandomization(request.subjectId);
    const treatment = randomization ? this.getSubjectTreatment(request.subjectId) : null;
    
    request.status = 'EXECUTED';
    request.executedBy = executedBy;
    request.executedAt = new Date();
    request.unblindedTreatment = treatment?.treatmentCode ?? randomization?.armName ?? 'Unknown';
    
    this.unblindingRequests.set(requestId, request);
    
    // Record event
    this.recordEvent({
      studyId: request.studyId,
      siteId: request.siteId,
      subjectId: request.subjectId,
      eventType: 'UNBLINDING_EXECUTED',
      details: {
        requestId,
        executedBy,
        unblindedTreatment: request.unblindedTreatment,
      },
      performedBy: executedBy,
    });
    
    if (this.config.autoNotifyOnUnblinding) {
      this.addUnblindingNotification(request, 'EXECUTION', request.requestedBy, request.requestedByRole);
    }
    
    return request;
  }
  
  cancelUnblindingRequest(requestId: string, cancelledBy: string, reason: string): UnblindingRequest {
    const request = this.unblindingRequests.get(requestId);
    if (!request) {
      throw new Error(`Unblinding request not found: ${requestId}`);
    }
    
    if (request.status === 'EXECUTED') {
      throw new Error('Cannot cancel an executed unblinding request');
    }
    
    request.status = 'CANCELLED';
    request.reviewedBy = cancelledBy;
    request.reviewedAt = new Date();
    request.reviewNotes = reason;
    
    this.unblindingRequests.set(requestId, request);
    
    return request;
  }
  
  getUnblindingRequest(requestId: string): UnblindingRequest | null {
    return this.unblindingRequests.get(requestId) ?? null;
  }
  
  listUnblindingRequests(filter?: UnblindingRequestFilter): UnblindingRequest[] {
    let requests = Array.from(this.unblindingRequests.values());
    
    if (filter) {
      if (filter.studyId) {
        requests = requests.filter(r => r.studyId === filter.studyId);
      }
      if (filter.siteId) {
        requests = requests.filter(r => r.siteId === filter.siteId);
      }
      if (filter.subjectId) {
        requests = requests.filter(r => r.subjectId === filter.subjectId);
      }
      if (filter.status) {
        requests = requests.filter(r => r.status === filter.status);
      }
      if (filter.requestType) {
        requests = requests.filter(r => r.requestType === filter.requestType);
      }
    }
    
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
  
  // ===========================================================================
  // Events & Audit
  // ===========================================================================
  
  private recordEvent(params: Omit<RandomizationEvent, 'id' | 'eventDate'>): void {
    const event: RandomizationEvent = {
      id: crypto.randomUUID(),
      eventDate: new Date(),
      ...params,
    };
    
    this.events.push(event);
  }
  
  getEvents(studyId: string, limit?: number): RandomizationEvent[] {
    const studyEvents = this.events
      .filter(e => e.studyId === studyId)
      .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
    
    return limit ? studyEvents.slice(0, limit) : studyEvents;
  }
  
  getSubjectEvents(subjectId: string): RandomizationEvent[] {
    return this.events
      .filter(e => e.subjectId === subjectId)
      .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
  }
  
  // ===========================================================================
  // List Management
  // ===========================================================================
  
  registerList(list: RandomizationList): void {
    this.lists.set(list.id, list);
    
    // Associate with stratum if stratified
    if (list.stratum) {
      const stratumId = `stratum-${list.studyId}-${this.hashString(list.stratum)}`;
      const stratum = this.strata.get(stratumId);
      if (stratum) {
        stratum.listId = list.id;
        this.strata.set(stratumId, stratum);
      }
    }
  }
  
  getAvailableList(studyId: string, siteId?: string, stratumId?: string): RandomizationList | null {
    // Try to find site-specific + stratum-specific list first
    if (siteId && stratumId) {
      const stratum = this.strata.get(stratumId);
      const stratumKey = stratum?.values.map(v => `${v.factorId}:${v.levelId}`).join('|');
      
      for (const list of Array.from(Array.from(this.lists.values()))) {
        if (list.studyId === studyId && 
            list.siteId === siteId && 
            list.stratum === stratumKey &&
            list.status !== 'EXHAUSTED' &&
            list.status !== 'ARCHIVED') {
          return list;
        }
      }
    }
    
    // Try site-specific list
    if (siteId) {
      for (const list of Array.from(Array.from(this.lists.values()))) {
        if (list.studyId === studyId && 
            list.siteId === siteId && 
            !list.stratum &&
            list.status !== 'EXHAUSTED' &&
            list.status !== 'ARCHIVED') {
          return list;
        }
      }
    }
    
    // Fall back to central list
    for (const list of Array.from(Array.from(this.lists.values()))) {
      if (list.studyId === studyId && 
          !list.siteId && 
          list.status !== 'EXHAUSTED' &&
          list.status !== 'ARCHIVED') {
        return list;
      }
    }
    
    return null;
  }
  
  refreshList(
    listId: string,
    newAssignments: RandomizationAssignment[],
    refreshedBy: string
  ): RandomizationList {
    const list = this.lists.get(listId);
    if (!list) {
      throw new Error(`List not found: ${listId}`);
    }
    
    // Add new assignments
    const startSequence = list.totalSlots + 1;
    const refreshedAssignments = newAssignments.map((a, i) => ({
      ...a,
      sequenceNumber: startSequence + i,
      isUsed: false,
    }));
    
    list.assignments.push(...refreshedAssignments);
    list.totalSlots += newAssignments.length;
    list.status = 'ACTIVE';
    
    this.lists.set(listId, list);
    
    // Record event
    this.recordEvent({
      studyId: list.studyId,
      eventType: 'LIST_REFRESHED',
      details: { listId, addedSlots: newAssignments.length, newTotal: list.totalSlots },
      performedBy: refreshedBy,
    });
    
    return list;
  }
  
  // ===========================================================================
  // Metrics
  // ===========================================================================
  
  getMetrics(studyId: string): RandomizationMetrics {
    const studyResults = Array.from(this.randomizationResults.values())
      .filter(r => r.studyId === studyId);
    
    const successResults = studyResults.filter(r => r.status === 'SUCCESS');
    const failedResults = studyResults.filter(r => r.status === 'FAILED');
    
    // Count by arm
    const armCountsMap = new Map<string, number>();
    for (const result of Array.from(successResults)) {
      armCountsMap.set(result.armId, (armCountsMap.get(result.armId) ?? 0) + 1);
    }
    
    const totalRandomized = successResults.length;
    const armIds = Array.from(armCountsMap.keys());
    const armCount = armIds.length || 1;
    
    const armCounts: ArmCount[] = armIds.map(armId => {
      const count = armCountsMap.get(armId) ?? 0;
      const expectedRatio = 1 / armCount;
      const actualRatio = totalRandomized > 0 ? count / totalRandomized : 0;
      
      return {
        armId,
        armName: `Arm ${armId}`,
        count,
        expectedRatio,
        actualRatio,
      };
    });
    
    // Site metrics
    const siteMap = new Map<string, SiteRandomizationMetrics>();
    for (const result of Array.from(successResults)) {
      if (!siteMap.has(result.siteId)) {
        siteMap.set(result.siteId, {
          siteId: result.siteId,
          siteName: `Site ${result.siteId}`,
          totalRandomized: 0,
          totalPending: 0,
          armCounts: [],
        });
      }
      const siteMetric = siteMap.get(result.siteId)!;
      siteMetric.totalRandomized++;
    }
    
    // Stratum balances
    const studyStrata = this.listStrata(studyId);
    const stratumBalances = studyStrata
      .map(s => this.getStratumBalance(s.id))
      .filter((b): b is StratumBalance => b !== null);
    
    // List status
    const studyLists = Array.from(this.lists.values())
      .filter(l => l.studyId === studyId);
    
    const listsStatus: ListStatusSummary[] = studyLists.map(list => ({
      listId: list.id,
      siteId: list.siteId,
      stratum: list.stratum,
      totalSlots: list.totalSlots,
      usedSlots: list.usedSlots,
      remainingSlots: list.totalSlots - list.usedSlots,
      percentUsed: list.totalSlots > 0 ? (list.usedSlots / list.totalSlots) * 100 : 0,
      status: list.status,
    }));
    
    // Unblinding
    const studyUnblindings = Array.from(this.unblindingRequests.values())
      .filter(r => r.studyId === studyId);
    
    // Calculate overall balance
    let overallBalance = 1;
    if (armCounts.length > 1 && totalRandomized > 0) {
      const expectedPerArm = totalRandomized / armCounts.length;
      let totalDeviation = 0;
      for (const arm of Array.from(armCounts)) {
        totalDeviation += Math.abs(arm.count - expectedPerArm);
      }
      const maxDeviation = totalRandomized * (1 - 1 / armCounts.length);
      overallBalance = maxDeviation > 0 ? 1 - (totalDeviation / maxDeviation) : 1;
    }
    
    // Last randomization date
    const lastResult = successResults.sort((a, b) => 
      b.randomizedAt.getTime() - a.randomizedAt.getTime()
    )[0];
    
    return {
      studyId,
      totalRandomized,
      totalPending: 0, // Would need pending state
      totalFailed: failedResults.length,
      siteMetrics: Array.from(siteMap.values()),
      armCounts,
      stratumBalances,
      listsStatus,
      totalUnblindingRequests: studyUnblindings.length,
      pendingUnblindingRequests: studyUnblindings.filter(r => r.status === 'PENDING').length,
      executedUnblindings: studyUnblindings.filter(r => r.status === 'EXECUTED').length,
      overallBalance,
      lastRandomizationDate: lastResult?.randomizedAt,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.randomizationResults.clear();
    this.subjectRandomizations.clear();
    this.strata.clear();
    this.lists.clear();
    this.treatmentAssignments.clear();
    this.subjectTreatments.clear();
    this.unblindingRequests.clear();
    this.events = [];
    this.randomizationCounters.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createRandomizationService(
  config: RandomizationServiceConfig
): RandomizationService {
  return new RandomizationService(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getEventTypeDisplayName(type: RandomizationEventType): string {
  const names: Record<RandomizationEventType, string> = {
    SUBJECT_RANDOMIZED: 'Subject Randomized',
    RANDOMIZATION_FAILED: 'Randomization Failed',
    TREATMENT_ASSIGNED: 'Treatment Assigned',
    TREATMENT_CHANGED: 'Treatment Changed',
    UNBLINDING_REQUESTED: 'Unblinding Requested',
    UNBLINDING_APPROVED: 'Unblinding Approved',
    UNBLINDING_DENIED: 'Unblinding Denied',
    UNBLINDING_EXECUTED: 'Unblinding Executed',
    LIST_EXHAUSTED: 'List Exhausted',
    LIST_REFRESHED: 'List Refreshed',
    STRATUM_CREATED: 'Stratum Created',
    BALANCE_WARNING: 'Balance Warning',
  };
  return names[type];
}

export function getTreatmentStatusDisplayName(status: TreatmentAssignmentStatus): string {
  const names: Record<TreatmentAssignmentStatus, string> = {
    PENDING: 'Pending',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    SUSPENDED: 'Suspended',
    DISCONTINUED: 'Discontinued',
  };
  return names[status];
}

export function getUnblindingRequestTypeDisplayName(type: UnblindingRequestType): string {
  const names: Record<UnblindingRequestType, string> = {
    EMERGENCY: 'Emergency',
    SAFETY: 'Safety',
    END_OF_STUDY: 'End of Study',
    REGULATORY: 'Regulatory',
    OTHER: 'Other',
  };
  return names[type];
}

export function getUnblindingUrgencyDisplayName(urgency: UnblindingUrgency): string {
  const names: Record<UnblindingUrgency, string> = {
    IMMEDIATE: 'Immediate',
    URGENT: 'Urgent',
    ROUTINE: 'Routine',
  };
  return names[urgency];
}

export function getUnblindingStatusDisplayName(status: UnblindingRequestStatus): string {
  const names: Record<UnblindingRequestStatus, string> = {
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    DENIED: 'Denied',
    EXECUTED: 'Executed',
    CANCELLED: 'Cancelled',
  };
  return names[status];
}

export function formatRandomizationNumber(number: string): string {
  // Format for display (e.g., R0001 -> R-0001)
  const match = number.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return number;
}
