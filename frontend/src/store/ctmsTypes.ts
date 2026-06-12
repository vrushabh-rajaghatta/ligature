
// ============================================================================
// CTMS Types - Clinical Trial Management System Core (v51)
// Comprehensive types for study design, site management, enrollment,
// protocol deviations, visit scheduling, and operational metrics
// ============================================================================

// ============================================================================
// STUDY DESIGN TYPES
// ============================================================================

export type StudyPhase = 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 2/3' | 'Phase 3' | 'Phase 4' | 'Observational';
export type StudyType = 'interventional' | 'observational' | 'expanded-access' | 'registry';
export type BlindingType = 'open-label' | 'single-blind' | 'double-blind' | 'triple-blind';
export type RandomizationType = 'simple' | 'block' | 'stratified' | 'adaptive' | 'none';
export type AllocationRatio = '1:1' | '2:1' | '3:1' | '1:1:1' | '2:1:1' | 'adaptive';

export interface StudyDesign {
  id: string;
  studyId: string;
  type: StudyType;
  phase: StudyPhase;
  blinding: BlindingType;
  randomization: RandomizationType;
  allocationRatio: AllocationRatio;
  
  // Control design
  hasPlacebo: boolean;
  hasActiveComparator: boolean;
  comparatorDetails?: string;
  
  // Adaptive features
  isAdaptive: boolean;
  adaptiveFeatures?: string[];
  interimAnalyses: InterimAnalysis[];
  
  // Stratification
  stratificationFactors: StratificationFactor[];
  
  // Duration
  treatmentDurationWeeks: number;
  followUpDurationWeeks: number;
  totalDurationWeeks: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface InterimAnalysis {
  id: string;
  name: string;
  triggerType: 'event-driven' | 'time-driven' | 'enrollment-driven';
  triggerValue: number; // events, months, or subjects
  plannedDate?: string;
  actualDate?: string;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  outcome?: 'continue' | 'stop-efficacy' | 'stop-futility' | 'modify';
  dmcRecommendation?: string;
}

export interface StratificationFactor {
  id: string;
  name: string;
  levels: string[];
  isRequired: boolean;
}

// ============================================================================
// STUDY ARM / COHORT TYPES
// ============================================================================

export type ArmType = 'experimental' | 'active-comparator' | 'placebo' | 'sham' | 'no-intervention';
export type CohortStatus = 'open' | 'closed' | 'paused' | 'completed';

export interface StudyArm {
  id: string;
  studyId: string;
  name: string;
  shortName: string;
  type: ArmType;
  description: string;
  
  // Treatment
  intervention: string;
  dose?: string;
  route?: string;
  frequency?: string;
  
  // Enrollment
  targetEnrollment: number;
  enrolledSubjects: number;
  activeSubjects: number;
  completedSubjects: number;
  discontinuedSubjects: number;
  
  // Status
  status: CohortStatus;
  openedDate?: string;
  closedDate?: string;
  
  // Allocation
  allocationWeight: number; // for randomization ratio
}

export interface DoseEscalationCohort {
  id: string;
  studyId: string;
  armId: string;
  cohortNumber: number;
  doseLevel: string;
  targetSubjects: number;
  enrolledSubjects: number;
  evaluableSubjects: number;
  
  // Safety
  dltsObserved: number;
  dltWindow: string;
  
  // Status
  status: 'enrolling' | 'evaluating' | 'cleared' | 'mtd-exceeded' | 'closed';
  clearanceDate?: string;
  clearanceDecision?: string;
  
  // SRC (Safety Review Committee)
  srcMeetingDate?: string;
  srcRecommendation?: string;
}

// ============================================================================
// ENDPOINT TYPES
// ============================================================================

export type EndpointType = 'primary' | 'secondary' | 'exploratory' | 'safety';
export type EndpointCategory = 'efficacy' | 'safety' | 'pharmacokinetic' | 'biomarker' | 'patient-reported' | 'quality-of-life';

export interface StudyEndpoint {
  id: string;
  studyId: string;
  type: EndpointType;
  category: EndpointCategory;
  
  // Definition
  name: string;
  fullDefinition: string;
  assessmentMethod: string;
  assessmentTimepoint: string;
  
  // Statistical
  statisticalMethod?: string;
  analysisPopulation?: string;
  hypothesisType?: 'superiority' | 'non-inferiority' | 'equivalence';
  margin?: string;
  
  // Target
  targetValue?: string;
  minimumClinicallyImportantDifference?: string;
  
  // Results (when available)
  status: 'pending' | 'achieved' | 'not-achieved' | 'not-evaluable';
  result?: string;
  pValue?: string;
  confidenceInterval?: string;
  resultDate?: string;
  
  // v204: USDM Source Tracking (Protocol-to-CTMS Lineage)
  usdmSourceId?: string;        // Reference to source USDMEndpoint.id
  usdmVersionHash?: string;     // Hash of source content for change detection
  usdmSyncedAt?: string;        // Last sync timestamp
  usdmSyncStatus?: 'current' | 'outdated' | 'conflict';
  
  // v204b: Local Edit Tracking for Bidirectional Sync
  ctmsLocalHash?: string;       // Hash of CTMS content for local change detection
  ctmsLastEditedAt?: string;    // When CTMS endpoint was last edited locally
  ctmsLastEditedBy?: string;    // Who edited it
  hasLocalEdits?: boolean;      // Quick flag for UI
}

// ============================================================================
// SITE TYPES
// ============================================================================

export type SiteStatus = 'identified' | 'qualified' | 'selected' | 'in-startup' | 'activated' | 'enrolling' | 'active-not-enrolling' | 'in-closeout' | 'closed' | 'terminated';
export type InstitutionType = 'academic-medical-center' | 'community-hospital' | 'private-practice' | 'government' | 'research-institute' | 'cancer-center';

export interface ClinicalSite {
  id: string;
  studyId: string;
  siteNumber: string;
  
  // Institution
  name: string;
  institutionType: InstitutionType;
  address: SiteAddress;
  
  // Status
  status: SiteStatus;
  statusDate: string;
  statusHistory: SiteStatusChange[];
  
  // Personnel
  principalInvestigator: Investigator;
  subInvestigators: Investigator[];
  studyCoordinator: SiteContact;
  regulatoryContact?: SiteContact;
  pharmacyContact?: SiteContact;
  
  // Enrollment
  targetEnrollment: number;
  enrolledSubjects: number;
  activeSubjects: number;
  completedSubjects: number;
  screenFailures: number;
  discontinuedSubjects: number;
  
  // Performance metrics
  screeningRate: number; // per month
  screenFailureRate: number;
  enrollmentRate: number; // per month
  queryRate: number; // per 100 subjects
  protocolDeviationRate: number;
  dataEntryLag: number; // days
  
  // Timeline
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
  
  // Documents
  documentsRequired: number;
  documentsReceived: number;
  documentsApproved: number;
  
  // Monitoring
  lastMonitoringVisit?: string;
  nextMonitoringVisit?: string;
  monitoringVisitFrequency: string;
  
  // Risk
  riskScore: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: SiteRiskFactor[];
  
  // Financials
  contractStatus: 'draft' | 'negotiating' | 'executed' | 'amended';
  budgetStatus: 'draft' | 'approved' | 'amended';
  paymentsToDate: number;
  budgetedAmount: number;
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

export interface SiteContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
}

export interface SiteStatusChange {
  id: string;
  fromStatus: SiteStatus | null;
  toStatus: SiteStatus;
  date: string;
  reason?: string;
  performedBy: string;
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

// ============================================================================
// ENROLLMENT TYPES
// ============================================================================

export type SubjectStatus = 'screened' | 'screen-failed' | 'enrolled' | 'randomized' | 'on-treatment' | 'completed' | 'discontinued' | 'withdrawn' | 'lost-to-followup';

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

export interface EnrollmentForecast {
  id: string;
  studyId: string;
  createdAt: string;
  model: 'linear' | 'poisson' | 'site-based' | 'historical';
  
  // Predictions
  predictedCompletionDate: string;
  confidenceInterval: { lower: string; upper: string };
  predictedFinalEnrollment: number;
  
  // Scenarios
  optimisticCompletion: string;
  pessimisticCompletion: string;
  
  // Recommendations
  sitesNeeded?: number;
  enrollmentGap?: number;
  recommendations: string[];
}

// ============================================================================
// VISIT SCHEDULE TYPES
// ============================================================================

export type VisitType = 'screening' | 'baseline' | 'treatment' | 'follow-up' | 'end-of-study' | 'unscheduled' | 'early-termination';
export type WindowUnit = 'days' | 'weeks' | 'months';

export interface VisitSchedule {
  id: string;
  studyId: string;
  visits: VisitDefinition[];
  createdAt: string;
  updatedAt: string;
  version: string;
  effectiveDate: string;
}

export interface VisitDefinition {
  id: string;
  visitNumber: string;
  visitName: string;
  visitType: VisitType;
  
  // Timing
  targetDay: number; // relative to baseline (Day 1)
  targetWeek?: number;
  windowBefore: number;
  windowAfter: number;
  windowUnit: WindowUnit;
  
  // Requirements
  isMandatory: boolean;
  allowsRemote: boolean;
  requiresFasting: boolean;
  estimatedDuration: number; // minutes
  
  // Procedures
  procedures: VisitProcedure[];
  
  // Associated forms
  requiredForms: string[];
}

export interface VisitProcedure {
  id: string;
  name: string;
  category: 'assessment' | 'sample-collection' | 'imaging' | 'questionnaire' | 'intervention' | 'other';
  isRequired: boolean;
  conditionalOn?: string;
  specialInstructions?: string;
}

export interface SubjectVisit {
  id: string;
  subjectId: string;
  studyId: string;
  siteId: string;
  visitDefinitionId: string;
  visitNumber: string;
  visitName: string;
  
  // Scheduling
  scheduledDate: string;
  windowStart: string;
  windowEnd: string;
  actualDate?: string;
  
  // Status
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'cancelled';
  completionPercentage: number;
  
  // Procedures performed
  proceduresCompleted: string[];
  proceduresMissed: string[];
  
  // Data entry
  dataEntryStatus: 'pending' | 'in-progress' | 'complete' | 'verified';
  queriesOpen: number;
  
  // Notes
  notes?: string;
  deviations?: string[];
}

// ============================================================================
// PROTOCOL DEVIATION TYPES
// ============================================================================

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

export interface ProtocolDeviation {
  id: string;
  studyId: string;
  siteId: string;
  subjectId?: string;
  
  // Classification
  category: DeviationCategory;
  subcategory?: string;
  severity: DeviationSeverity;
  isImportant: boolean; // GCP important deviation
  
  // Details
  title: string;
  description: string;
  rootCause?: string;
  impactAssessment?: string;
  
  // Timeline
  occurredDate: string;
  identifiedDate: string;
  reportedDate: string;
  closedDate?: string;
  
  // Status
  status: DeviationStatus;
  
  // CAPA
  requiresCapa: boolean;
  capaId?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  
  // Reporting
  reportedToIrb: boolean;
  irbReportDate?: string;
  reportedToSponsor: boolean;
  sponsorReportDate?: string;
  reportedToAuthority: boolean;
  authorityReportDate?: string;
  
  // Responsibility
  identifiedBy: string;
  reviewedBy?: string;
  closedBy?: string;
  
  // Recurrence
  isRecurrent: boolean;
  relatedDeviationIds?: string[];
}

export interface DeviationSummary {
  studyId: string;
  totalDeviations: number;
  byCategory: Record<DeviationCategory, number>;
  bySeverity: Record<DeviationSeverity, number>;
  byStatus: Record<DeviationStatus, number>;
  bySite: { siteId: string; siteName: string; count: number; rate: number }[];
  importantDeviations: number;
  openDeviations: number;
  recurrentPatterns: { pattern: string; count: number }[];
  trendsOverTime: { month: string; count: number; rate: number }[];
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

export type MonitoringVisitType = 'site-selection' | 'site-initiation' | 'routine' | 'interim' | 'for-cause' | 'closeout' | 'remote';
export type MonitoringVisitStatus = 'planned' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'report-pending';

export interface MonitoringVisit {
  id: string;
  studyId: string;
  siteId: string;
  
  // Type and timing
  visitType: MonitoringVisitType;
  plannedDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Status
  status: MonitoringVisitStatus;
  
  // Personnel
  monitorId: string;
  monitorName: string;
  
  // Coverage
  subjectsReviewed: number;
  totalActiveSubjects: number;
  sdvPercentage: number;
  
  // Findings
  findingsCount: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  findings: MonitoringFinding[];
  
  // Follow-up
  followUpRequired: boolean;
  followUpItems: FollowUpItem[];
  
  // Report
  reportStatus: 'draft' | 'finalized' | 'distributed';
  reportDate?: string;
  reportPath?: string;
  
  // Next visit
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

// ============================================================================
// STUDY METRICS TYPES
// ============================================================================

export interface CTMSStudyMetrics {
  studyId: string;
  asOfDate: string;
  
  // Enrollment
  enrollmentMetrics: {
    target: number;
    enrolled: number;
    percentComplete: number;
    enrollmentRate: number;
    projectedCompletion: string;
    daysToTarget: number;
  };
  
  // Sites
  siteMetrics: {
    totalSites: number;
    activeSites: number;
    enrollingSites: number;
    topPerformer: { siteId: string; siteName: string; enrolled: number };
    bottomPerformer: { siteId: string; siteName: string; enrolled: number };
    avgEnrollmentPerSite: number;
  };
  
  // Data quality
  dataQualityMetrics: {
    queryRate: number;
    queryResolutionTime: number; // days
    dataEntryLag: number; // days
    missingDataRate: number;
  };
  
  // Protocol compliance
  complianceMetrics: {
    deviationRate: number;
    importantDeviations: number;
    screenFailureRate: number;
    discontinuationRate: number;
  };
  
  // Timeline
  timelineMetrics: {
    studyStartDate: string;
    firstSubjectIn: string;
    lastSubjectIn?: string;
    primaryCompletionDate?: string;
    studyCompletionDate?: string;
    isOnSchedule: boolean;
    daysAheadBehind: number;
  };
  
  // Risk
  riskScore: 'low' | 'medium' | 'high' | 'critical';
  riskIndicators: {
    category: string;
    indicator: string;
    status: 'green' | 'yellow' | 'red';
    value: string;
    threshold: string;
  }[];
}

// ============================================================================
// CTMS STORE STATE
// ============================================================================

export interface CTMSState {
  // Studies
  studies: Record<string, CTMSStudy>;
  studyDesigns: Record<string, StudyDesign>;
  studyArms: Record<string, StudyArm[]>;
  doseEscalationCohorts: Record<string, DoseEscalationCohort[]>;
  studyEndpoints: Record<string, StudyEndpoint[]>;
  
  // Sites
  sites: Record<string, ClinicalSite>;
  sitesByStudy: Record<string, string[]>;
  
  // Enrollment
  enrollmentTracking: Record<string, EnrollmentTracking>;
  enrollmentForecasts: Record<string, EnrollmentForecast>;
  
  // Visits
  visitSchedules: Record<string, VisitSchedule>;
  subjectVisits: Record<string, SubjectVisit[]>;
  
  // Deviations
  protocolDeviations: Record<string, ProtocolDeviation>;
  deviationsByStudy: Record<string, string[]>;
  deviationSummaries: Record<string, DeviationSummary>;
  
  // Monitoring
  monitoringVisits: Record<string, MonitoringVisit>;
  monitoringBySite: Record<string, string[]>;
  
  // Metrics
  studyMetrics: Record<string, CTMSStudyMetrics>;
  
  // v204b: Bidirectional Sync State
  syncConfigs: Record<string, BidirectionalSyncConfig>;
  pendingConflicts: Record<string, SyncConflict[]>;
  localEdits: Record<string, CTMSLocalEdit[]>;
  lastSyncResults: Record<string, BidirectionalSyncResult>;
  
  // UI State
  selectedStudyId: string | null;
  selectedSiteId: string | null;
  activeView: CTMSView;
  filters: CTMSFilters;
  isLoading: boolean;
  lastError: string | null;
}

export type CTMSView = 
  | 'study-overview'
  | 'study-design'
  | 'sites'
  | 'site-detail'
  | 'enrollment'
  | 'enrollment-forecast'
  | 'visits'
  | 'deviations'
  | 'monitoring'
  | 'metrics'
  | 'milestones';

export interface CTMSFilters {
  studyPhase?: StudyPhase[];
  studyStatus?: string[];
  siteStatus?: SiteStatus[];
  region?: string[];
  country?: string[];
  dateRange?: { start: string; end: string };
}

// ============================================================================
// CTMS STUDY (AGGREGATE ROOT)
// ============================================================================

export interface CTMSStudy {
  id: string;
  protocolNumber: string;
  title: string;
  shortTitle: string;
  
  // Product linkage
  productId: string;
  productName: string;
  indication: string;
  
  // Study info
  phase: StudyPhase;
  type: StudyType;
  status: CTMSStudyStatus;
  
  // Sponsor
  sponsor: string;
  sponsorProtocolId?: string;
  cro?: string;
  
  // Regulatory IDs
  indNumber?: string;
  ctaNumbers?: string[];
  nctNumber?: string;
  eudractNumber?: string;
  
  // Team
  medicalMonitor: string;
  projectManager: string;
  dataManager?: string;
  statistician?: string;
  
  // Timeline
  plannedStartDate: string;
  actualStartDate?: string;
  firstSubjectIn?: string;
  lastSubjectIn?: string;
  lastSubjectLastVisit?: string;
  primaryCompletionDate?: string;
  studyCompletionDate?: string;
  databaseLockDate?: string;
  
  // Enrollment targets
  targetEnrollment: number;
  enrolledSubjects: number;
  
  // Site targets
  targetSites: number;
  totalSites: number;
  activeSites: number;
  
  // Countries/Regions
  countries: string[];
  regions: string[];
  
  // Risk
  riskScore: 'low' | 'medium' | 'high' | 'critical';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type CTMSStudyStatus = 
  | 'planning'
  | 'startup'
  | 'enrolling'
  | 'enrollment-complete'
  | 'active-follow-up'
  | 'completing'
  | 'completed'
  | 'on-hold'
  | 'terminated';

// ============================================================================
// CTMS ACTIONS
// ============================================================================

export interface CTMSActions {
  // Study management
  createStudy(study: Partial<CTMSStudy>): CTMSStudy;
  updateStudy(studyId: string, updates: Partial<CTMSStudy>): void;
  deleteStudy(studyId: string): void;
  
  // Study design
  setStudyDesign(studyId: string, design: Partial<StudyDesign>): StudyDesign;
  addStudyArm(studyId: string, arm: Partial<StudyArm>): StudyArm;
  updateStudyArm(studyId: string, armId: string, updates: Partial<StudyArm>): void;
  removeStudyArm(studyId: string, armId: string): void;
  addEndpoint(studyId: string, endpoint: Partial<StudyEndpoint>): StudyEndpoint;
  updateEndpoint(studyId: string, endpointId: string, updates: Partial<StudyEndpoint>): void;
  removeEndpoint(studyId: string, endpointId: string): void;
  
  // v204a: USDM Sync
  syncEndpointsFromUSDM(studyId: string, usdmEndpoints: USDMEndpointInput[]): USDMSyncResult;
  
  // v204b: Bidirectional Sync with Conflict Resolution
  executeBidirectionalSync(studyId: string, config: BidirectionalSyncConfig): BidirectionalSyncResult;
  setSyncConfig(studyId: string, config: Partial<BidirectionalSyncConfig>): void;
  getSyncConfig(studyId: string): BidirectionalSyncConfig;
  recordLocalEdit(endpointId: string, field: ConflictField, previousValue: string, newValue: string): void;
  resolveConflict(conflictId: string, resolution: ConflictResolutionStrategy, manualValue?: string): void;
  getPendingConflicts(studyId: string): SyncConflict[];
  clearLocalEdits(studyId: string): void;
  
  // Site management
  addSite(studyId: string, site: Partial<ClinicalSite>): ClinicalSite;
  updateSite(siteId: string, updates: Partial<ClinicalSite>): void;
  updateSiteStatus(siteId: string, newStatus: SiteStatus, reason?: string): void;
  removeSite(siteId: string): void;
  
  // Enrollment
  updateEnrollment(studyId: string, tracking: Partial<EnrollmentTracking>): void;
  recordScreening(studyId: string, siteId: string, count: number): void;
  recordEnrollment(studyId: string, siteId: string, count: number): void;
  recordDiscontinuation(studyId: string, siteId: string, count: number, reason: string): void;
  generateEnrollmentForecast(studyId: string): EnrollmentForecast;
  
  // Visit scheduling
  createVisitSchedule(studyId: string, schedule: Partial<VisitSchedule>): VisitSchedule;
  addVisitDefinition(scheduleId: string, visit: Partial<VisitDefinition>): VisitDefinition;
  updateVisitDefinition(scheduleId: string, visitId: string, updates: Partial<VisitDefinition>): void;
  scheduleSubjectVisit(subjectId: string, visitDefId: string, scheduledDate: string): SubjectVisit;
  completeSubjectVisit(visitId: string, completedDate: string, procedures: string[]): void;
  
  // Protocol deviations
  reportDeviation(deviation: Partial<ProtocolDeviation>): ProtocolDeviation;
  updateDeviation(deviationId: string, updates: Partial<ProtocolDeviation>): void;
  closeDeviation(deviationId: string, resolution: string): void;
  generateDeviationSummary(studyId: string): DeviationSummary;
  
  // Monitoring
  scheduleMonitoringVisit(visit: Partial<MonitoringVisit>): MonitoringVisit;
  updateMonitoringVisit(visitId: string, updates: Partial<MonitoringVisit>): void;
  completeMonitoringVisit(visitId: string, findings: MonitoringFinding[]): void;
  addFollowUpItem(visitId: string, item: Partial<FollowUpItem>): void;
  
  // Metrics
  calculateStudyMetrics(studyId: string): CTMSStudyMetrics;
  refreshAllMetrics(): void;
  
  // UI
  setSelectedStudy(studyId: string | null): void;
  setSelectedSite(siteId: string | null): void;
  setActiveView(view: CTMSView): void;
  setFilters(filters: Partial<CTMSFilters>): void;
  clearFilters(): void;
  
  // Mock data
  loadMockData(): void;
}

// v204a: USDM Sync Types
export interface USDMEndpointInput {
  id: string;
  endpointDescription: string;
  endpointLevel: { decode: string };
}

export interface USDMSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
  syncedAt: string;
}

// v204b: Bidirectional Sync Types
export type SyncDirection = 'usdm-to-ctms' | 'ctms-to-usdm' | 'bidirectional';
export type SourceOfTruth = 'usdm' | 'ctms' | 'manual';
export type ConflictResolutionStrategy = 'source-wins' | 'target-wins' | 'manual' | 'newest-wins';

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

export type ConflictField = 
  | 'description'
  | 'level'
  | 'category'
  | 'assessmentMethod'
  | 'assessmentTimepoint';

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

export interface CTMSLocalEdit {
  ctmsEndpointId: string;
  field: ConflictField;
  previousValue: string;
  newValue: string;
  editedAt: string;
  editedBy?: string;
}
