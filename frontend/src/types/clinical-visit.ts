
/**
 * Clinical Visit Types
 * Visit scheduling and tracking types
 * @version 0.20.0
 */

// ============================================================================
// Visit Type Enums
// ============================================================================

export type VisitType = 
  | 'SCREENING'
  | 'BASELINE'
  | 'TREATMENT'
  | 'FOLLOWUP'
  | 'EARLY_TERMINATION'
  | 'UNSCHEDULED';

export const VISIT_TYPES: VisitType[] = [
  'SCREENING',
  'BASELINE',
  'TREATMENT',
  'FOLLOWUP',
  'EARLY_TERMINATION',
  'UNSCHEDULED',
];

export type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'PARTIALLY_COMPLETE';

export const VISIT_STATUSES: VisitStatus[] = [
  'SCHEDULED',
  'COMPLETED',
  'MISSED',
  'PARTIALLY_COMPLETE',
];

// ============================================================================
// Protocol Visit (Template/Definition)
// ============================================================================

export interface ProtocolVisit {
  id: string;
  studyId: string;
  
  // Visit identification
  visitNumber: number;
  visitName: string;
  visitCode?: string; // Short code like 'V1', 'SCR', 'BL'
  visitType: VisitType;
  
  // Scheduling (relative to baseline/Day 1)
  scheduledDay: number; // Study day (Day 1 = baseline)
  windowBefore: number; // Days before allowed
  windowAfter: number; // Days after allowed
  
  // Visit requirements
  requiredForms: string[]; // CRF definition IDs
  optionalForms: string[];
  requiredProcedures: string[];
  optionalProcedures: string[];
  
  // Flags
  isUnscheduled: boolean;
  isRepeatable: boolean; // Can occur multiple times
  isCritical: boolean; // Affects study integrity if missed
  
  // Instructions
  instructions?: string;
  reminders?: string[];
  
  // Duration
  estimatedDuration: number; // Minutes
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Subject Visit (Instance)
// ============================================================================

export interface SubjectVisit {
  id: string;
  subjectId: string;
  protocolVisitId: string;
  studyId: string;
  siteId: string;
  
  // Visit identification
  visitName: string;
  visitNumber: number;
  instanceNumber: number; // For repeatable visits
  
  // Scheduling
  scheduledDate: Date;
  windowStart: Date;
  windowEnd: Date;
  actualDate?: Date;
  
  // Status
  status: VisitStatus;
  statusReason?: string;
  
  // Completion
  completedForms: string[]; // Form instance IDs
  completedProcedures: string[];
  
  // Deviations
  deviations: VisitDeviation[];
  
  // Notes
  notes?: string;
  
  // Personnel
  conductedBy?: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Visit Deviation
// ============================================================================

export type DeviationType = 
  | 'WINDOW_VIOLATION'
  | 'MISSED_PROCEDURE'
  | 'WRONG_SEQUENCE'
  | 'MISSED_FORM'
  | 'PROHIBITED_MEDICATION'
  | 'OTHER';

export type DeviationSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface VisitDeviation {
  id: string;
  subjectVisitId: string;
  subjectId: string;
  studyId: string;
  
  // Deviation details
  type: DeviationType;
  severity: DeviationSeverity;
  description: string;
  
  // Timeline
  deviationDate: Date;
  reportedDate: Date;
  reportedBy: string;
  
  // Resolution
  resolution?: string;
  resolvedDate?: Date;
  resolvedBy?: string;
  
  // Impact assessment
  impactOnData: boolean;
  impactOnSubjectSafety: boolean;
  impactDescription?: string;
  
  // CAPA reference
  capaRequired: boolean;
  capaId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Visit Window
// ============================================================================

export interface VisitWindow {
  visitId: string;
  visitName: string;
  targetDate: Date;
  windowStart: Date;
  windowEnd: Date;
  
  // Status
  isOverdue: boolean;
  daysUntilTarget: number;
  daysUntilClose: number;
  daysOverdue: number;
  
  // Window info
  windowDaysBefore: number;
  windowDaysAfter: number;
  totalWindowDays: number;
}

// ============================================================================
// Schedule Types
// ============================================================================

export interface SubjectSchedule {
  subjectId: string;
  studyId: string;
  baselineDate: Date;
  visits: SubjectVisitScheduleItem[];
  nextVisit?: SubjectVisitScheduleItem;
  overdueVisits: SubjectVisitScheduleItem[];
}

export interface SubjectVisitScheduleItem {
  visitId: string;
  protocolVisitId: string;
  visitName: string;
  visitNumber: number;
  visitType: VisitType;
  
  // Scheduling
  scheduledDate: Date;
  windowStart: Date;
  windowEnd: Date;
  actualDate?: Date;
  
  // Status
  status: VisitStatus;
  isOverdue: boolean;
  isCurrent: boolean;
  isUpcoming: boolean;
  
  // Completion
  formsCompleted: number;
  formsRequired: number;
  proceduresCompleted: number;
  proceduresRequired: number;
}

// ============================================================================
// Unscheduled Visit Config
// ============================================================================

export interface UnscheduledVisitConfig {
  subjectId: string;
  visitDate: Date;
  reason: string;
  conductedBy: string;
  forms?: string[];
  procedures?: string[];
  notes?: string;
}

// ============================================================================
// Form Instance Reference (minimal, full in clinical-form.ts)
// ============================================================================

export interface FormInstanceRef {
  id: string;
  definitionId: string;
  formName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FROZEN' | 'LOCKED';
}

// ============================================================================
// Type Guards
// ============================================================================

export function isVisitType(value: unknown): value is VisitType {
  return typeof value === 'string' && VISIT_TYPES.includes(value as VisitType);
}

export function isVisitStatus(value: unknown): value is VisitStatus {
  return typeof value === 'string' && VISIT_STATUSES.includes(value as VisitStatus);
}

export function isDeviationType(value: unknown): value is DeviationType {
  const validTypes: DeviationType[] = [
    'WINDOW_VIOLATION', 'MISSED_PROCEDURE', 'WRONG_SEQUENCE',
    'MISSED_FORM', 'PROHIBITED_MEDICATION', 'OTHER',
  ];
  return typeof value === 'string' && validTypes.includes(value as DeviationType);
}

export function isDeviationSeverity(value: unknown): value is DeviationSeverity {
  const validValues: DeviationSeverity[] = ['MINOR', 'MAJOR', 'CRITICAL'];
  return typeof value === 'string' && validValues.includes(value as DeviationSeverity);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createProtocolVisit(params: {
  id?: string;
  studyId: string;
  visitNumber: number;
  visitName: string;
  visitCode?: string;
  visitType: VisitType;
  scheduledDay: number;
  windowBefore?: number;
  windowAfter?: number;
  requiredForms?: string[];
  requiredProcedures?: string[];
  isUnscheduled?: boolean;
  isCritical?: boolean;
  estimatedDuration?: number;
}): ProtocolVisit {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    studyId: params.studyId,
    visitNumber: params.visitNumber,
    visitName: params.visitName,
    visitCode: params.visitCode,
    visitType: params.visitType,
    scheduledDay: params.scheduledDay,
    windowBefore: params.windowBefore ?? 0,
    windowAfter: params.windowAfter ?? 0,
    requiredForms: params.requiredForms ?? [],
    optionalForms: [],
    requiredProcedures: params.requiredProcedures ?? [],
    optionalProcedures: [],
    isUnscheduled: params.isUnscheduled ?? false,
    isRepeatable: false,
    isCritical: params.isCritical ?? false,
    estimatedDuration: params.estimatedDuration ?? 60,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSubjectVisit(params: {
  id?: string;
  subjectId: string;
  protocolVisitId: string;
  studyId: string;
  siteId: string;
  visitName: string;
  visitNumber: number;
  instanceNumber?: number;
  scheduledDate: Date;
  windowStart: Date;
  windowEnd: Date;
  createdBy: string;
}): SubjectVisit {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    subjectId: params.subjectId,
    protocolVisitId: params.protocolVisitId,
    studyId: params.studyId,
    siteId: params.siteId,
    visitName: params.visitName,
    visitNumber: params.visitNumber,
    instanceNumber: params.instanceNumber ?? 1,
    scheduledDate: params.scheduledDate,
    windowStart: params.windowStart,
    windowEnd: params.windowEnd,
    status: 'SCHEDULED',
    completedForms: [],
    completedProcedures: [],
    deviations: [],
    createdAt: now,
    createdBy: params.createdBy,
    updatedAt: now,
    updatedBy: params.createdBy,
  };
}

export function createVisitDeviation(params: {
  id?: string;
  subjectVisitId: string;
  subjectId: string;
  studyId: string;
  type: DeviationType;
  severity: DeviationSeverity;
  description: string;
  deviationDate: Date;
  reportedBy: string;
  impactOnData?: boolean;
  impactOnSubjectSafety?: boolean;
  capaRequired?: boolean;
}): VisitDeviation {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    subjectVisitId: params.subjectVisitId,
    subjectId: params.subjectId,
    studyId: params.studyId,
    type: params.type,
    severity: params.severity,
    description: params.description,
    deviationDate: params.deviationDate,
    reportedDate: now,
    reportedBy: params.reportedBy,
    impactOnData: params.impactOnData ?? false,
    impactOnSubjectSafety: params.impactOnSubjectSafety ?? false,
    capaRequired: params.capaRequired ?? params.severity === 'CRITICAL',
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getVisitTypeDisplayName(type: VisitType): string {
  const displayNames: Record<VisitType, string> = {
    SCREENING: 'Screening',
    BASELINE: 'Baseline',
    TREATMENT: 'Treatment',
    FOLLOWUP: 'Follow-up',
    EARLY_TERMINATION: 'Early Termination',
    UNSCHEDULED: 'Unscheduled',
  };
  return displayNames[type];
}

export function getVisitStatusDisplayName(status: VisitStatus): string {
  const displayNames: Record<VisitStatus, string> = {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    MISSED: 'Missed',
    PARTIALLY_COMPLETE: 'Partially Complete',
  };
  return displayNames[status];
}

export function getDeviationTypeDisplayName(type: DeviationType): string {
  const displayNames: Record<DeviationType, string> = {
    WINDOW_VIOLATION: 'Visit Window Violation',
    MISSED_PROCEDURE: 'Missed Procedure',
    WRONG_SEQUENCE: 'Wrong Visit Sequence',
    MISSED_FORM: 'Missed Form',
    PROHIBITED_MEDICATION: 'Prohibited Medication',
    OTHER: 'Other',
  };
  return displayNames[type];
}

export function getDeviationSeverityDisplayName(severity: DeviationSeverity): string {
  const displayNames: Record<DeviationSeverity, string> = {
    MINOR: 'Minor',
    MAJOR: 'Major',
    CRITICAL: 'Critical',
  };
  return displayNames[severity];
}

/**
 * Calculate visit window dates based on baseline date and protocol visit
 */
export function calculateVisitWindow(
  baselineDate: Date,
  protocolVisit: ProtocolVisit
): VisitWindow {
  const targetDate = new Date(baselineDate);
  targetDate.setDate(targetDate.getDate() + protocolVisit.scheduledDay - 1); // Day 1 = baseline
  
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - protocolVisit.windowBefore);
  
  const windowEnd = new Date(targetDate);
  windowEnd.setDate(windowEnd.getDate() + protocolVisit.windowAfter);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilClose = Math.ceil((windowEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = today > windowEnd;
  const daysOverdue = isOverdue ? Math.ceil((today.getTime() - windowEnd.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  return {
    visitId: protocolVisit.id,
    visitName: protocolVisit.visitName,
    targetDate,
    windowStart,
    windowEnd,
    isOverdue,
    daysUntilTarget,
    daysUntilClose,
    daysOverdue,
    windowDaysBefore: protocolVisit.windowBefore,
    windowDaysAfter: protocolVisit.windowAfter,
    totalWindowDays: protocolVisit.windowBefore + protocolVisit.windowAfter + 1,
  };
}

/**
 * Check if a date falls within the visit window
 */
export function isWithinVisitWindow(date: Date, window: VisitWindow): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const start = new Date(window.windowStart);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(window.windowEnd);
  end.setHours(23, 59, 59, 999);
  
  return checkDate >= start && checkDate <= end;
}

/**
 * Get days from target for a visit date
 */
export function getDaysFromTarget(visitDate: Date, targetDate: Date): number {
  const visit = new Date(visitDate);
  visit.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  return Math.round((visit.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

export function isVisitOverdue(visit: SubjectVisit): boolean {
  if (visit.status === 'COMPLETED' || visit.status === 'MISSED') {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return today > visit.windowEnd;
}

export function isVisitUpcoming(visit: SubjectVisit, withinDays: number = 7): boolean {
  if (visit.status !== 'SCHEDULED') {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + withinDays);
  
  return visit.scheduledDate >= today && visit.scheduledDate <= futureDate;
}

export function getVisitCompletionPercentage(visit: SubjectVisit, requiredForms: number, requiredProcedures: number): number {
  const totalRequired = requiredForms + requiredProcedures;
  if (totalRequired === 0) return 100;
  
  const completed = visit.completedForms.length + visit.completedProcedures.length;
  return Math.round((completed / totalRequired) * 100);
}

export function hasVisitDeviations(visit: SubjectVisit): boolean {
  return visit.deviations.length > 0;
}

export function getCriticalDeviations(visit: SubjectVisit): VisitDeviation[] {
  return visit.deviations.filter(d => d.severity === 'CRITICAL');
}

export function getUnresolvedDeviations(visit: SubjectVisit): VisitDeviation[] {
  return visit.deviations.filter(d => !d.resolvedDate);
}
