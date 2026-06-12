
/**
 * CTMS Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for clinical trial management types in Ligature.
 * Covers study design, sites, enrollment, visits, protocol deviations,
 * and monitoring activities.
 * 
 * @module domains/ctms/contracts
 * @version 0.27.22
 */

// =============================================================================
// STUDY DESIGN ENUMS
// =============================================================================

export type StudyPhase = 
  | 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 2/3' 
  | 'Phase 3' | 'Phase 4' | 'Observational';

export type StudyType = 'interventional' | 'observational' | 'expanded-access' | 'registry';

export type BlindingType = 'open-label' | 'single-blind' | 'double-blind' | 'triple-blind';

export type RandomizationType = 'simple' | 'block' | 'stratified' | 'adaptive' | 'none';

export type AllocationRatio = '1:1' | '2:1' | '3:1' | '1:1:1' | '2:1:1' | 'adaptive';

export type ArmType = 'experimental' | 'active-comparator' | 'placebo' | 'sham' | 'no-intervention';

export type CohortStatus = 'open' | 'closed' | 'paused' | 'completed';

// =============================================================================
// STUDY STATUS ENUMS
// =============================================================================

export type CTMSStudyStatus = 
  | 'planning' | 'startup' | 'enrolling' | 'enrollment-complete'
  | 'active-follow-up' | 'completing' | 'completed' | 'on-hold' | 'terminated';

export type InterimAnalysisStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export type InterimOutcome = 'continue' | 'stop-efficacy' | 'stop-futility' | 'modify';

// =============================================================================
// ENDPOINT ENUMS
// =============================================================================

export type EndpointType = 'primary' | 'secondary' | 'exploratory' | 'safety';

export type EndpointCategory = 
  | 'efficacy' | 'safety' | 'pharmacokinetic' 
  | 'biomarker' | 'patient-reported' | 'quality-of-life';

export type HypothesisType = 'superiority' | 'non-inferiority' | 'equivalence';

export type EndpointStatus = 'pending' | 'achieved' | 'not-achieved' | 'not-evaluable';

// =============================================================================
// SITE ENUMS
// =============================================================================

export type SiteStatus = 
  | 'identified' | 'qualified' | 'selected' | 'in-startup' | 'activated'
  | 'enrolling' | 'active-not-enrolling' | 'in-closeout' | 'closed' | 'terminated';

export type InstitutionType = 
  | 'academic-medical-center' | 'community-hospital' | 'private-practice'
  | 'government' | 'research-institute' | 'cancer-center';

export type ContractStatus = 'draft' | 'negotiating' | 'executed' | 'amended';

export type BudgetStatus = 'draft' | 'approved' | 'amended';

export type SiteRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// ENROLLMENT ENUMS
// =============================================================================

export type EnrollmentStatus = 
  | 'not-started' | 'below-target' | 'on-track' | 'above-target'
  | 'paused' | 'completed' | 'closed';

export type ForecastConfidence = 'high' | 'medium' | 'low';

export type DiscontinuationCategory = 
  | 'adverse-event' | 'lack-of-efficacy' | 'protocol-deviation'
  | 'lost-to-follow-up' | 'withdrawal-of-consent' | 'death'
  | 'investigator-decision' | 'sponsor-decision' | 'other';

// =============================================================================
// VISIT ENUMS
// =============================================================================

export type VisitType = 
  | 'screening' | 'baseline' | 'treatment' | 'follow-up'
  | 'end-of-treatment' | 'end-of-study' | 'early-termination' | 'unscheduled';

export type VisitStatus = 
  | 'scheduled' | 'confirmed' | 'in-progress' | 'completed'
  | 'missed' | 'rescheduled' | 'cancelled';

export type WindowType = 'before' | 'after' | 'symmetric';

// =============================================================================
// PROTOCOL DEVIATION ENUMS
// =============================================================================

export type DeviationCategory = 
  | 'eligibility' 
  | 'informed-consent' 
  | 'study-procedures' 
  | 'safety-reporting'
  | 'ip-management'
  | 'visit-schedule'
  | 'prohibited-medication'
  | 'data-collection'
  | 'other';

export type DeviationSeverity = 'minor' | 'major' | 'critical';

export type DeviationStatus = 'identified' | 'under-review' | 'confirmed' | 'resolved' | 'closed';

export type DeviationImpact = 
  | 'none' | 'data-quality' | 'subject-safety' 
  | 'regulatory-compliance' | 'efficacy-assessment';

// =============================================================================
// MONITORING ENUMS
// =============================================================================

export type MonitoringVisitType = 
  | 'site-selection' | 'site-initiation' | 'routine' | 'interim' | 'for-cause' | 'closeout' | 'remote';

export type MonitoringVisitStatus = 
  | 'planned' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'report-pending';

export type MonitoringStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export type FindingCategory = 
  | 'icf' | 'eligibility' | 'safety' | 'data-quality'
  | 'ip-management' | 'regulatory' | 'source-verification' | 'other';

export type FindingSeverity = 'observation' | 'minor' | 'major' | 'critical';

export type FindingStatus = 'open' | 'in-remediation' | 'resolved' | 'escalated';

// =============================================================================
// SYNC ENUMS (USDM Integration)
// =============================================================================

export type SyncDirection = 'usdm-to-ctms' | 'ctms-to-usdm' | 'bidirectional';

export type SourceOfTruth = 'usdm' | 'ctms' | 'manual';

export type ConflictResolutionStrategy = 'source-wins' | 'target-wins' | 'manual' | 'newest-wins';

export type USDMSyncStatus = 'current' | 'outdated' | 'conflict';

export type ConflictField = 
  | 'description' | 'level' | 'category' 
  | 'assessmentMethod' | 'assessmentTimepoint';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Full CTMS Study entity with all operational fields
 * Use CTMSStudySummary for display/list contexts
 */
export interface CTMSStudy {
  id: string;
  protocolNumber: string;
  title: string;
  shortTitle: string;
  productId: string;
  productName: string;
  indication: string;
  phase: StudyPhase;
  type: StudyType;
  status: CTMSStudyStatus;
  sponsor: string;
  sponsorProtocolId?: string;
  cro?: string;
  indNumber?: string;
  ctaNumbers?: string[];
  nctNumber?: string;
  eudractNumber?: string;
  medicalMonitor: string;
  projectManager: string;
  dataManager?: string;
  statistician?: string;
  plannedStartDate: string;
  actualStartDate?: string;
  firstSubjectIn?: string;
  lastSubjectIn?: string;
  lastSubjectLastVisit?: string;
  primaryCompletionDate?: string;
  studyCompletionDate?: string;
  databaseLockDate?: string;
  targetEnrollment: number;
  enrolledSubjects: number;
  targetSites: number;
  totalSites: number;
  activeSites: number;
  countries: string[];
  regions: string[];
  riskScore: SiteRiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CTMSStudySummary {
  id: string;
  protocolNumber: string;
  title: string;
  shortTitle: string;
  phase: StudyPhase;
  type: StudyType;
  status: CTMSStudyStatus;
  productName: string;
  indication: string;
  targetEnrollment: number;
  enrolledSubjects: number;
  totalSites: number;
  activeSites: number;
  riskScore: SiteRiskLevel;
}

export interface StudyDesign {
  id: string;
  studyId: string;
  type: StudyType;
  phase: StudyPhase;
  blinding: BlindingType;
  randomization: RandomizationType;
  allocationRatio: AllocationRatio;
  hasPlacebo: boolean;
  hasActiveComparator: boolean;
  comparatorDetails?: string;
  isAdaptive: boolean;
  adaptiveFeatures?: string[];
  interimAnalyses: InterimAnalysis[];
  stratificationFactors: StratificationFactor[];
  treatmentDurationWeeks: number;
  followUpDurationWeeks: number;
  totalDurationWeeks: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudyArm {
  id: string;
  studyId: string;
  name: string;
  shortName: string;
  type: ArmType;
  description: string;
  intervention: string;
  dose?: string;
  route?: string;
  frequency?: string;
  targetEnrollment: number;
  enrolledSubjects: number;
  activeSubjects: number;
  completedSubjects: number;
  discontinuedSubjects: number;
  status: CohortStatus;
  allocationWeight: number;
}

export interface StudyEndpoint {
  id: string;
  studyId: string;
  type: EndpointType;
  category: EndpointCategory;
  name: string;
  fullDefinition: string;
  assessmentMethod: string;
  assessmentTimepoint: string;
  statisticalMethod?: string;
  analysisPopulation?: string;
  hypothesisType?: HypothesisType;
  margin?: string;
  targetValue?: string;
  status: EndpointStatus;
  result?: string;
  pValue?: string;
  confidenceInterval?: string;
  // USDM sync tracking
  usdmSourceId?: string;
  usdmSyncStatus?: USDMSyncStatus;
  usdmSyncedAt?: string;
  usdmVersionHash?: string;
  hasLocalEdits?: boolean;
  ctmsLastEditedAt?: string;
}

export interface StratificationFactor {
  id: string;
  name: string;
  levels: string[];
  isRequired: boolean;
}

export interface InterimAnalysis {
  id: string;
  name: string;
  triggerType: 'event-driven' | 'time-driven' | 'enrollment-driven';
  triggerValue: number;
  plannedDate?: string;
  actualDate?: string;
  status: InterimAnalysisStatus;
  outcome?: InterimOutcome;
  dmcRecommendation?: string;
}

export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  region: string;
}

export interface SiteContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
}

export interface Investigator {
  id: string;
  name: string;
  credentials: string;
  email: string;
  phone?: string;
  specialty?: string;
  cv1572Status: 'current' | 'pending' | 'expired';
  cv1572ExpiryDate?: string;
  gcpTrainingDate?: string;
  financialDisclosureStatus: 'submitted' | 'pending' | 'not-required';
}

/**
 * Full Clinical Site entity with all operational fields
 * Use ClinicalSiteSummary for display/list contexts
 */
export interface ClinicalSite {
  id: string;
  studyId: string;
  siteNumber: string;
  name: string;
  institutionType: InstitutionType;
  address: SiteAddress;
  status: SiteStatus;
  statusDate: string;
  statusHistory: SiteStatusChange[];
  principalInvestigator: Investigator;
  subInvestigators: Investigator[];
  studyCoordinator: SiteContact;
  regulatoryContact?: SiteContact;
  pharmacyContact?: SiteContact;
  targetEnrollment: number;
  enrolledSubjects: number;
  activeSubjects: number;
  completedSubjects: number;
  screenFailures: number;
  discontinuedSubjects: number;
  screeningRate: number;
  screenFailureRate: number;
  enrollmentRate: number;
  queryRate: number;
  protocolDeviationRate: number;
  dataEntryLag: number;
  siteIdentifiedDate?: string;
  siteSelectedDate?: string;
  regulatorySubmissionDate?: string;
  regulatoryApprovalDate?: string;
  siteInitiationDate?: string;
  firstSubjectScreenedDate?: string;
  firstSubjectEnrolledDate?: string;
  lastSubjectEnrolledDate?: string;
  lastSubjectLastVisitDate?: string;
  siteCloseoutDate?: string;
  documentsRequired: number;
  documentsReceived: number;
  documentsApproved: number;
  lastMonitoringVisit?: string;
  nextMonitoringVisit?: string;
  monitoringVisitFrequency: string;
  riskScore: SiteRiskLevel;
  riskFactors: SiteRiskFactor[];
  contractStatus: ContractStatus;
  budgetStatus: BudgetStatus;
  paymentsToDate: number;
  budgetedAmount: number;
}

export interface ClinicalSiteSummary {
  id: string;
  studyId: string;
  siteNumber: string;
  name: string;
  institutionType: InstitutionType;
  country: string;
  status: SiteStatus;
  principalInvestigator: string;
  targetEnrollment: number;
  enrolledSubjects: number;
  activeSubjects: number;
  screenFailureRate: number;
  riskScore: SiteRiskLevel;
}

export interface SiteRiskFactor {
  id: string;
  category: 'enrollment' | 'quality' | 'compliance' | 'operational' | 'regulatory';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'closed';
  mitigation?: string;
  identifiedDate: string;
  resolvedDate?: string;
}

export interface SiteStatusChange {
  id: string;
  fromStatus: SiteStatus | null;
  toStatus: SiteStatus;
  date: string;
  reason?: string;
  performedBy: string;
}

export interface ArmEnrollment {
  armId: string;
  armName: string;
  target: number;
  enrolled: number;
  percentComplete: number;
}

export interface RegionEnrollment {
  region: string;
  country?: string;
  siteCount: number;
  activeSites: number;
  target: number;
  enrolled: number;
  percentComplete: number;
  enrollmentRate: number;
}

export interface EnrollmentTrendPoint {
  date: string;
  target: number;
  actual: number;
  screened?: number;
  cumulative: number;
}

export interface EnrollmentTracking {
  studyId: string;
  asOfDate: string;
  
  // Overall numbers
  targetEnrollment: number;
  screened: number;
  screenFailed: number;
  enrolled: number;
  randomized: number;
  onTreatment: number;
  completed: number;
  discontinued: number;
  
  // Rates
  screenFailureRate: number;
  discontinuationRate: number;
  enrollmentRate: number; // per week
  
  // Projections
  projectedCompletionDate: string;
  projectedLastPatientIn: string;
  enrollmentVsTarget: number; // percentage
  
  // By arm (if applicable)
  byArm: ArmEnrollment[];
  
  // By region/country
  byRegion: RegionEnrollment[];
  
  // Historical
  weeklyTrend: EnrollmentTrendPoint[];
  monthlyTrend: EnrollmentTrendPoint[];
}

export interface EnrollmentForecast {
  studyId: string;
  generatedAt: string;
  targetEnrollment: number;
  currentEnrollment: number;
  projectedCompletionDate: string;
  originalTargetDate: string;
  variance: number;
  confidence: ForecastConfidence;
  weeklyRate: number;
  projectedWeeklyRate: number;
}

export interface VisitDefinition {
  id: string;
  scheduleId: string;
  visitNumber: number;
  visitName: string;
  visitType: VisitType;
  dayTarget: number;
  windowBefore: number;
  windowAfter: number;
  windowType: WindowType;
  isRequired: boolean;
  procedures: string[];
  estimatedDuration: number;
}

export interface SubjectVisitSummary {
  id: string;
  subjectId: string;
  visitDefinitionId: string;
  visitName: string;
  scheduledDate: string;
  actualDate?: string;
  status: VisitStatus;
  dayDeviation?: number;
  withinWindow: boolean;
}

/**
 * Full Protocol Deviation entity with all operational fields
 * Use ProtocolDeviationSummary for display/list contexts
 */
export interface ProtocolDeviation {
  id: string;
  studyId: string;
  siteId: string;
  subjectId?: string;
  category: DeviationCategory;
  subcategory?: string;
  severity: DeviationSeverity;
  isImportant: boolean;
  title: string;
  description: string;
  rootCause?: string;
  impactAssessment?: string;
  occurredDate: string;
  identifiedDate: string;
  reportedDate: string;
  closedDate?: string;
  status: DeviationStatus;
  requiresCapa: boolean;
  capaId?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  reportedToIrb: boolean;
  irbReportDate?: string;
  reportedToSponsor: boolean;
  sponsorReportDate?: string;
  reportedToAuthority: boolean;
  authorityReportDate?: string;
  identifiedBy: string;
  reviewedBy?: string;
  closedBy?: string;
  isRecurrent: boolean;
  relatedDeviationIds?: string[];
}

export interface ProtocolDeviationSummary {
  id: string;
  studyId: string;
  siteId: string;
  subjectId?: string;
  deviationNumber: string;
  category: DeviationCategory;
  severity: DeviationSeverity;
  status: DeviationStatus;
  description: string;
  reportedDate: string;
  impact: DeviationImpact;
}

export interface MonitoringVisitSummary {
  id: string;
  studyId: string;
  siteId: string;
  visitType: MonitoringVisitType;
  status: MonitoringStatus;
  scheduledDate: string;
  actualDate?: string;
  monitorName: string;
  findingsCount: number;
  criticalFindings: number;
}

/**
 * Full Monitoring Visit entity with all operational fields
 * Use MonitoringVisitSummary for display/list contexts
 */
export interface MonitoringVisit {
  id: string;
  studyId: string;
  siteId: string;
  visitType: MonitoringVisitType;
  plannedDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: MonitoringVisitStatus;
  monitorId: string;
  monitorName: string;
  subjectsReviewed: number;
  totalActiveSubjects: number;
  sdvPercentage: number;
  findingsCount: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  findings: MonitoringFinding[];
  followUpRequired: boolean;
  followUpItems: FollowUpItem[];
  reportStatus: 'draft' | 'finalized' | 'distributed';
  reportDate?: string;
  reportPath?: string;
  nextVisitRecommendedDate?: string;
}

export interface MonitoringFinding {
  id: string;
  category: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  description: string;
  subjectId?: string;
  affectedRecords?: string[];
  status: 'open' | 'resolved' | 'closed';
  responseRequired: boolean;
  responseDate?: string;
  resolution?: string;
}

export interface FollowUpItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'completed' | 'overdue';
  completedDate?: string;
}

export interface SyncConflict {
  id: string;
  usdmEndpointId: string;
  ctmsEndpointId: string;
  field: ConflictField;
  usdmValue: string;
  ctmsValue: string;
  usdmUpdatedAt: string;
  ctmsUpdatedAt: string;
  detectedAt: string;
  resolution: ConflictResolutionStrategy | null;
  resolvedValue?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface BidirectionalSyncConfig {
  sourceOfTruth: SourceOfTruth;
  defaultResolution: ConflictResolutionStrategy;
  autoResolveMinorChanges: boolean;
  trackLocalEdits: boolean;
}

export interface BidirectionalSyncResult {
  direction: SyncDirection;
  success: boolean;
  usdmToCTMS: { created: number; updated: number; unchanged: number };
  ctmsToUSDM: { created: number; updated: number; unchanged: number };
  conflicts: SyncConflict[];
  autoResolved: number;
  pendingResolution: number;
  syncedAt: string;
  errors: { endpointId: string; source: 'usdm' | 'ctms'; message: string; code: string }[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const STUDY_PHASE_LABELS: Record<StudyPhase, string> = {
  'Phase 1': 'Phase 1',
  'Phase 1/2': 'Phase 1/2',
  'Phase 2': 'Phase 2',
  'Phase 2/3': 'Phase 2/3',
  'Phase 3': 'Phase 3',
  'Phase 4': 'Phase 4',
  'Observational': 'Observational',
};

export const STUDY_STATUS_LABELS: Record<CTMSStudyStatus, string> = {
  'planning': 'Planning',
  'startup': 'Startup',
  'enrolling': 'Enrolling',
  'enrollment-complete': 'Enrollment Complete',
  'active-follow-up': 'Active Follow-up',
  'completing': 'Completing',
  'completed': 'Completed',
  'on-hold': 'On Hold',
  'terminated': 'Terminated',
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  'identified': 'Identified',
  'qualified': 'Qualified',
  'selected': 'Selected',
  'in-startup': 'In Startup',
  'activated': 'Activated',
  'enrolling': 'Enrolling',
  'active-not-enrolling': 'Active (Not Enrolling)',
  'in-closeout': 'In Closeout',
  'closed': 'Closed',
  'terminated': 'Terminated',
};

export const ENDPOINT_TYPE_LABELS: Record<EndpointType, string> = {
  'primary': 'Primary',
  'secondary': 'Secondary',
  'exploratory': 'Exploratory',
  'safety': 'Safety',
};

export const DEVIATION_SEVERITY_LABELS: Record<DeviationSeverity, string> = {
  'minor': 'Minor',
  'major': 'Major',
  'critical': 'Critical',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  'scheduled': 'Scheduled',
  'confirmed': 'Confirmed',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'missed': 'Missed',
  'rescheduled': 'Rescheduled',
  'cancelled': 'Cancelled',
};

export const STUDY_STATUS_COLORS: Record<CTMSStudyStatus, string> = {
  'planning': 'bg-gray-100 text-gray-800',
  'startup': 'bg-blue-100 text-blue-800',
  'enrolling': 'bg-green-100 text-green-800',
  'enrollment-complete': 'bg-teal-100 text-teal-800',
  'active-follow-up': 'bg-indigo-100 text-indigo-800',
  'completing': 'bg-purple-100 text-purple-800',
  'completed': 'bg-gray-200 text-gray-600',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  'terminated': 'bg-red-100 text-red-800',
};

export const SITE_STATUS_COLORS: Record<SiteStatus, string> = {
  'identified': 'bg-gray-100 text-gray-800',
  'qualified': 'bg-blue-100 text-blue-800',
  'selected': 'bg-indigo-100 text-indigo-800',
  'in-startup': 'bg-purple-100 text-purple-800',
  'activated': 'bg-cyan-100 text-cyan-800',
  'enrolling': 'bg-green-100 text-green-800',
  'active-not-enrolling': 'bg-teal-100 text-teal-800',
  'in-closeout': 'bg-orange-100 text-orange-800',
  'closed': 'bg-gray-200 text-gray-600',
  'terminated': 'bg-red-100 text-red-800',
};

export const DEVIATION_SEVERITY_COLORS: Record<DeviationSeverity, string> = {
  'minor': 'bg-yellow-100 text-yellow-800',
  'major': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800',
};

export const RISK_LEVEL_COLORS: Record<SiteRiskLevel, string> = {
  'low': 'bg-green-100 text-green-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800',
};

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  'scheduled': 'bg-blue-100 text-blue-800',
  'confirmed': 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-purple-100 text-purple-800',
  'completed': 'bg-green-100 text-green-800',
  'missed': 'bg-red-100 text-red-800',
  'rescheduled': 'bg-yellow-100 text-yellow-800',
  'cancelled': 'bg-gray-100 text-gray-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

const STUDY_STATUSES: CTMSStudyStatus[] = [
  'planning', 'startup', 'enrolling', 'enrollment-complete',
  'active-follow-up', 'completing', 'completed', 'on-hold', 'terminated'
];

const SITE_STATUSES: SiteStatus[] = [
  'identified', 'qualified', 'selected', 'in-startup', 'activated',
  'enrolling', 'active-not-enrolling', 'in-closeout', 'closed', 'terminated'
];

const DEVIATION_SEVERITIES: DeviationSeverity[] = ['minor', 'major', 'critical'];

const VISIT_STATUSES: VisitStatus[] = [
  'scheduled', 'confirmed', 'in-progress', 'completed', 'missed', 'rescheduled', 'cancelled'
];

export function isStudyStatus(value: string): value is CTMSStudyStatus {
  return STUDY_STATUSES.includes(value as CTMSStudyStatus);
}

export function isSiteStatus(value: string): value is SiteStatus {
  return SITE_STATUSES.includes(value as SiteStatus);
}

export function isDeviationSeverity(value: string): value is DeviationSeverity {
  return DEVIATION_SEVERITIES.includes(value as DeviationSeverity);
}

export function isVisitStatus(value: string): value is VisitStatus {
  return VISIT_STATUSES.includes(value as VisitStatus);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if study is actively enrolling
 */
export function isStudyEnrolling(status: CTMSStudyStatus): boolean {
  return status === 'enrolling';
}

/**
 * Check if study is active (not completed/terminated)
 */
export function isStudyActive(status: CTMSStudyStatus): boolean {
  return !['completed', 'terminated'].includes(status);
}

/**
 * Check if site can enroll subjects
 */
export function canSiteEnroll(status: SiteStatus): boolean {
  return status === 'enrolling';
}

/**
 * Check if site is operationally active
 */
export function isSiteActive(status: SiteStatus): boolean {
  return ['activated', 'enrolling', 'active-not-enrolling'].includes(status);
}

/**
 * Calculate enrollment percentage
 */
export function calculateEnrollmentPercent(enrolled: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((enrolled / target) * 100));
}

/**
 * Determine enrollment status from progress
 */
export function getEnrollmentStatus(
  enrolled: number, 
  target: number, 
  weeklyRate: number,
  expectedRate: number
): EnrollmentStatus {
  if (enrolled >= target) return 'completed';
  if (weeklyRate === 0) return 'not-started';
  if (weeklyRate >= expectedRate * 1.1) return 'above-target';
  if (weeklyRate >= expectedRate * 0.9) return 'on-track';
  return 'below-target';
}

/**
 * Check if visit is within protocol window
 */
export function isVisitWithinWindow(
  actualDay: number,
  targetDay: number,
  windowBefore: number,
  windowAfter: number
): boolean {
  return actualDay >= (targetDay - windowBefore) && actualDay <= (targetDay + windowAfter);
}

/**
 * Calculate visit day deviation
 */
export function calculateDayDeviation(actualDay: number, targetDay: number): number {
  return actualDay - targetDay;
}

/**
 * Check if deviation requires escalation
 */
export function requiresEscalation(severity: DeviationSeverity, impact: DeviationImpact): boolean {
  if (severity === 'critical') return true;
  if (severity === 'major' && impact === 'subject-safety') return true;
  if (severity === 'major' && impact === 'regulatory-compliance') return true;
  return false;
}

/**
 * Calculate site risk score from factors
 */
export function calculateSiteRiskScore(factors: SiteRiskFactor[]): SiteRiskLevel {
  const openFactors = factors.filter(f => f.status === 'open');
  if (openFactors.some(f => f.severity === 'critical')) return 'critical';
  if (openFactors.filter(f => f.severity === 'high').length >= 2) return 'critical';
  if (openFactors.some(f => f.severity === 'high')) return 'high';
  if (openFactors.filter(f => f.severity === 'medium').length >= 2) return 'high';
  if (openFactors.some(f => f.severity === 'medium')) return 'medium';
  return 'low';
}

/**
 * Format subject count with target
 */
export function formatEnrollmentCount(enrolled: number, target: number): string {
  return `${enrolled}/${target} (${calculateEnrollmentPercent(enrolled, target)}%)`;
}
