
// ============================================================================
// Safety Types - v72: Comprehensive Safety Integration
// ============================================================================
// v72a: Safety Core - ICSR E2B(R3) structure, case intake workflow
// v72b: Signal Detection - Signal identification and review
// v72c: Aggregate Reports - PSUR/PADER/DSUR generation (extends v55)
// v72d: Safety-Regulatory Bridge - Connect safety to submissions
// ============================================================================

// ============================================================================
// PART A: SAFETY CORE - ICSR E2B(R3) STRUCTURE
// ============================================================================

// E2B(R3) Message Types
export type E2BMessageType = 
  | 'ichicsr'           // Individual Case Safety Report
  | 'ichicsrack'        // Acknowledgment
  | 'nullificationicsrack' // Nullification acknowledgment

export type ICSRType = 
  | 'spontaneous'       // Post-marketing spontaneous
  | 'clinical-trial'    // From clinical study
  | 'literature'        // Published literature
  | 'solicited'         // Patient support program, registry
  | 'other'

export type CaseSeriousness = 
  | 'non-serious'
  | 'serious'
  | 'serious-death'
  | 'serious-life-threatening'
  | 'serious-hospitalization'
  | 'serious-disability'
  | 'serious-congenital'
  | 'serious-intervention'
  | 'serious-other'

export type CaseOutcome = 
  | 'recovered'
  | 'recovered-with-sequelae'
  | 'recovering'
  | 'not-recovered'
  | 'fatal'
  | 'unknown'

export type CasualityAssessment = 
  | 'related'
  | 'probably-related'
  | 'possibly-related'
  | 'unlikely-related'
  | 'not-related'
  | 'not-assessable'

export type CaseStatus = 
  | 'draft'
  | 'data-entry'
  | 'medical-review'
  | 'quality-review'
  | 'ready-to-submit'
  | 'submitted'
  | 'follow-up-pending'
  | 'closed'
  | 'nullified'

export type CasePriority = 
  | 'routine'
  | 'high'
  | 'expedited-15-day'
  | 'expedited-7-day'
  | 'emergency'

export type ReportSource = 
  | 'healthcare-professional'
  | 'consumer'
  | 'literature'
  | 'clinical-trial'
  | 'regulatory-authority'
  | 'other'

// ============================================================================
// ICSR CASE STRUCTURE (E2B R3 Compliant)
// ============================================================================

export interface ICSRCase {
  id: string
  caseNumber: string
  globalCaseId: string // Worldwide unique ID
  
  // Message header (A.1)
  messageHeader: ICSRMessageHeader
  
  // Safety report (A.2)
  safetyReport: ISCSRSafetyReport
  
  // Patient information (B.1)
  patient: ICSRPatient
  
  // Reaction/Events (B.2)
  reactions: ICSRReaction[]
  
  // Test/Procedure Results (B.3)
  testResults: ICSRTestResult[]
  
  // Drug Information (B.4)
  drugs: ICSRDrug[]
  
  // Narrative Summary (B.5)
  narrative: ICSRNarrative
  
  // Case processing
  status: CaseStatus
  priority: CasePriority
  assignedTo: string | null
  assignedToName: string | null
  
  // Medical review
  medicalReviewerId: string | null
  medicalReviewerName: string | null
  medicalReviewDate: string | null
  medicalReviewNotes: string | null
  
  // Workflow tracking
  workflowHistory: CaseWorkflowEntry[]
  comments: CaseComment[]
  
  // Regulatory submission tracking
  submissions: CaseSubmission[]
  
  // Timestamps
  receiptDate: string
  mostRecentInfoDate: string
  dataLockDate: string | null
  createdAt: string
  updatedAt: string
}

export interface ICSRMessageHeader {
  messageFormatVersion: string // e.g., '3.0'
  messageFormatRelease: string // e.g., '3.0.1'
  messageType: E2BMessageType
  messageId: string
  messageDate: string
  senderId: string
  senderType: 'manufacturer' | 'regulatory-authority' | 'cro'
  receiverId: string
}

export interface ISCSRSafetyReport {
  reportType: ICSRType
  primarySource: ReportSource
  primarySourceCountry: string
  reporterQualification: 'physician' | 'pharmacist' | 'nurse' | 'consumer' | 'lawyer' | 'other'
  
  // Case identification
  firstReceiptDate: string
  mostRecentInfoDate: string
  additionalDocumentsAvailable: boolean
  
  // Seriousness assessment
  seriousness: CaseSeriousness
  seriousnessCriteria: string[]
  
  // Regulatory requirements
  fulfilsLocalCriteria: boolean
  localCriteriaDescription: string | null
  reportCountry: string
  
  // Literature reference (if applicable)
  literatureReference: string | null
  
  // Study reference (if clinical trial)
  studyId: string | null
  studyName: string | null
  sponsorStudyNumber: string | null
}

export interface ICSRPatient {
  patientId: string // Anonymized
  
  // Demographics (B.1.1)
  age: number | null
  ageUnit: 'year' | 'month' | 'week' | 'day' | 'decade' | null
  ageGroup: 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly' | null
  sex: 'male' | 'female' | 'unknown'
  weight: number | null
  weightUnit: 'kg' | 'lb' | null
  height: number | null
  heightUnit: 'cm' | 'in' | null
  
  // Relevant history (B.1.7)
  medicalHistory: PatientMedicalHistoryItem[]
  
  // Death information (B.1.9)
  deathDate: string | null
  autopsy: 'yes' | 'no' | 'unknown' | null
  causeOfDeath: string[] | null
}

export interface PatientMedicalHistoryItem {
  id: string
  condition: string
  meddraCode: string | null
  startDate: string | null
  endDate: string | null
  continuing: boolean
  comment: string | null
}

export interface ICSRReaction {
  id: string
  
  // Event coding (B.2.i)
  reactionTerm: string
  meddraVersion: string
  meddraLLT: string // Lowest Level Term
  meddraPT: string  // Preferred Term
  meddraHLT: string // High Level Term
  meddraHLGT: string // High Level Group Term
  meddraSOC: string // System Organ Class
  
  // Timing (B.2.i.4)
  onsetDate: string | null
  onsetLatency: number | null
  onsetLatencyUnit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | null
  duration: number | null
  durationUnit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | null
  resolutionDate: string | null
  
  // Outcome
  outcome: CaseOutcome
  
  // Seriousness at event level
  seriousnessAtEvent: boolean
  seriousnessCriteria: string[]
  
  // Notes
  reactionDescription: string | null
}

export interface ICSRTestResult {
  id: string
  
  // Test identification
  testName: string
  testDate: string | null
  
  // Results
  resultValue: string | null
  resultUnit: string | null
  normalRangeLow: string | null
  normalRangeHigh: string | null
  
  // Assessment
  clinicalSignificance: 'normal' | 'abnormal' | 'borderline' | 'unknown'
  moreInfoAvailable: boolean
  
  // Comments
  comment: string | null
}

export interface ICSRDrug {
  id: string
  
  // Drug identification (B.4.k.1)
  drugCharacterization: 'suspect' | 'concomitant' | 'interacting' | 'not-administered'
  medicinalProductName: string
  activeSubstance: string
  
  // Codes
  mpidVersion: string | null
  mpid: string | null
  phpidVersion: string | null
  phpid: string | null
  
  // Dosage (B.4.k.5)
  dose: number | null
  doseUnit: string | null
  dosageForm: string | null
  routeOfAdministration: string | null
  frequency: string | null
  cumulativeDose: number | null
  
  // Therapy dates
  startDate: string | null
  endDate: string | null
  treatmentDuration: number | null
  treatmentDurationUnit: string | null
  
  // Indication
  indication: string | null
  indicationMeddra: string | null
  
  // Action taken
  actionTaken: 'withdrawn' | 'reduced' | 'increased' | 'unchanged' | 'unknown' | 'not-applicable'
  
  // Rechallenge/Dechallenge
  reactionRecurOnRechallenge: 'yes' | 'no' | 'not-done' | 'unknown' | null
  reactionAbatedOnDechallenge: 'yes' | 'no' | 'not-done' | 'unknown' | null
  
  // Causality assessment
  causalityAssessment: CasualityAssessment
  causalityMethod: string | null
  causalityAssessor: string | null
}

export interface ICSRNarrative {
  // Case narrative (B.5.1)
  caseSummary: string
  
  // Reporter's comments (B.5.2)
  reporterComments: string | null
  
  // Sender's comments (B.5.3)
  senderDiagnosis: string | null
  senderComments: string | null
}

// ============================================================================
// CASE WORKFLOW & TRACKING
// ============================================================================

export interface CaseWorkflowEntry {
  id: string
  caseId: string
  action: CaseWorkflowAction
  fromStatus: CaseStatus
  toStatus: CaseStatus
  performedBy: string
  performedByName: string
  performedAt: string
  comment: string | null
}

export type CaseWorkflowAction = 
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'data-completed'
  | 'submitted-for-medical-review'
  | 'medical-review-completed'
  | 'returned-for-revision'
  | 'submitted-for-qc'
  | 'qc-completed'
  | 'marked-ready'
  | 'submitted-to-authority'
  | 'follow-up-received'
  | 'nullified'
  | 'closed'

export interface CaseComment {
  id: string
  caseId: string
  authorId: string
  authorName: string
  content: string
  replyToId: string | null
  createdAt: string
  updatedAt: string
}

export interface CaseSubmission {
  id: string
  caseId: string
  
  // Target
  regulatoryAuthority: string
  region: string
  submissionType: 'initial' | 'follow-up' | 'nullification'
  
  // Reference numbers
  manufacturerCaseNumber: string
  authorityCaseNumber: string | null
  
  // Status
  status: 'pending' | 'submitted' | 'acknowledged' | 'rejected' | 'accepted'
  dueDate: string
  submittedAt: string | null
  acknowledgedAt: string | null
  
  // E2B transmission
  e2bMessageId: string | null
  e2bAckStatus: 'pending' | 'accepted' | 'rejected' | 'warning' | null
  e2bAckMessage: string | null
  
  // File references
  xmlFilePath: string | null
  pdfFilePath: string | null
}

// ============================================================================
// PART B: SIGNAL DETECTION
// ============================================================================

export type SignalStatus = 
  | 'new'
  | 'under-evaluation'
  | 'validated'
  | 'refuted'
  | 'closed-no-action'
  | 'closed-action-taken'

export type SignalPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type SignalSource = 
  | 'spontaneous-reporting'
  | 'clinical-trial'
  | 'literature'
  | 'epidemiological-study'
  | 'post-marketing-study'
  | 'social-media'
  | 'other'

export type DetectionMethod = 
  | 'prr'          // Proportional Reporting Ratio
  | 'ror'          // Reporting Odds Ratio
  | 'bcpnn'        // Bayesian Confidence Propagation Neural Network
  | 'gps'          // Gamma Poisson Shrinker
  | 'ebgm'         // Empirical Bayes Geometric Mean
  | 'manual'       // Manual detection by medical reviewer
  | 'literature'   // Literature review
  | 'cluster'      // Case clustering

export interface SafetySignal {
  id: string
  signalNumber: string
  
  // Signal identification
  title: string
  description: string
  productId: string
  productName: string
  activeSubstance: string
  
  // Event(s)
  primaryEvent: string
  primaryEventMeddra: string
  secondaryEvents: SignalEvent[]
  socAffected: string[]
  
  // Detection
  detectionMethod: DetectionMethod
  detectionDate: string
  detectedBy: string
  detectedByName: string
  source: SignalSource
  
  // Statistical measures
  statistics: SignalStatistics | null
  
  // Case linkage
  linkedCaseIds: string[]
  caseCount: number
  fatalCaseCount: number
  seriousCaseCount: number
  
  // Background rates
  backgroundRate: number | null
  backgroundRateSource: string | null
  observedRate: number | null
  expectedCases: number | null
  
  // Status & workflow
  status: SignalStatus
  priority: SignalPriority
  
  // Medical review
  medicalReviewerId: string | null
  medicalReviewerName: string | null
  medicalAssessment: string | null
  medicalReviewDate: string | null
  
  // Actions
  recommendedActions: SignalAction[]
  actionsImplemented: SignalActionImplementation[]
  
  // Tracking
  regulatoryNotified: boolean
  regulatoryNotificationDate: string | null
  regulatoryReference: string | null
  
  // Timeline
  validatedDate: string | null
  closedDate: string | null
  closureReason: string | null
  
  createdAt: string
  updatedAt: string
}

export interface SignalEvent {
  term: string
  meddraCode: string
  caseCount: number
}

export interface SignalStatistics {
  calculatedAt: string
  
  // Disproportionality metrics
  prr: number | null           // Proportional Reporting Ratio
  prrLower95: number | null
  prrUpper95: number | null
  
  ror: number | null           // Reporting Odds Ratio
  rorLower95: number | null
  rorUpper95: number | null
  
  ic: number | null            // Information Component (BCPNN)
  icLower95: number | null
  icUpper95: number | null
  
  ebgm: number | null          // Empirical Bayes Geometric Mean
  ebgmLower95: number | null
  ebgmUpper95: number | null
  
  // Case metrics
  observed: number
  expected: number
  chiSquare: number | null
  pValue: number | null
  
  // Signal threshold
  meetsThreshold: boolean
  thresholdMethod: string
  thresholdValue: number
}

export interface SignalAction {
  id: string
  actionType: SignalActionType
  description: string
  priority: 'low' | 'medium' | 'high' | 'immediate'
  deadline: string | null
  assignedTo: string | null
  assignedToName: string | null
}

export type SignalActionType = 
  | 'label-update'
  | 'dear-doctor-letter'
  | 'rems-update'
  | 'risk-communication'
  | 'additional-data-collection'
  | 'targeted-follow-up'
  | 'epidemiological-study'
  | 'product-withdrawal'
  | 'restriction-of-use'
  | 'regulatory-notification'
  | 'other'

export interface SignalActionImplementation {
  actionId: string
  implementedBy: string
  implementedByName: string
  implementedAt: string
  notes: string | null
  evidenceDocuments: string[]
}

// ============================================================================
// SIGNAL REVIEW WORKFLOW
// ============================================================================

export interface SignalReviewCycle {
  id: string
  signalId: string
  cycleNumber: number
  
  // Status
  status: 'open' | 'in-review' | 'completed' | 'escalated'
  
  // Review team
  reviewers: SignalReviewer[]
  leadReviewerId: string
  
  // Meeting
  meetingScheduled: string | null
  meetingHeld: string | null
  meetingMinutes: string | null
  
  // Outcome
  decision: 'continue-monitoring' | 'escalate' | 'validate' | 'refute' | 'close' | null
  decisionRationale: string | null
  decisionDate: string | null
  
  // Next review
  nextReviewDate: string | null
  
  createdAt: string
  completedAt: string | null
}

export interface SignalReviewer {
  id: string
  userId: string
  userName: string
  role: 'medical-assessor' | 'epidemiologist' | 'statistician' | 'regulatory' | 'pv-scientist'
  assignedAt: string
  reviewCompletedAt: string | null
  assessment: string | null
}

// ============================================================================
// PART C: AGGREGATE SAFETY REPORTS (EXTENDS v55)
// ============================================================================

export interface SafetyReportingPeriod {
  id: string
  productId: string
  productName: string
  
  // Period definition
  periodType: 'psur' | 'pader' | 'dsur' | 'ibd'
  periodNumber: number
  startDate: string
  endDate: string
  dataLockPoint: string
  
  // Status
  status: 'upcoming' | 'active' | 'data-lock' | 'drafting' | 'review' | 'submitted'
  dueDate: string
  submissionDate: string | null
  
  // Case summary
  totalCases: number
  newCases: number
  seriousCases: number
  fatalCases: number
  
  // Signals
  signalsEvaluated: number
  newSignals: number
  
  createdAt: string
  updatedAt: string
}

export interface PSURConfiguration {
  id: string
  productId: string
  productName: string
  
  // International Birth Date
  internationalBirthDate: string
  
  // Reporting frequency
  currentPeriodNumber: number
  frequencyMonths: 6 | 12 | 36 // Semi-annual, annual, or 3-year
  
  // Regional submissions
  regions: PSURRegionalConfig[]
  
  // Template
  templateVersion: string
  customSections: string[]
  
  // Auto-generation settings
  autoGenerateLineListing: boolean
  autoGenerateSummaryTables: boolean
  autoPopulateExposure: boolean
  
  createdAt: string
  updatedAt: string
}

export interface PSURRegionalConfig {
  region: string
  authority: string
  required: boolean
  submissionFormat: 'e2b' | 'pdf' | 'both'
  localDueOffset: number // Days from data lock
}

// ============================================================================
// PART D: SAFETY-REGULATORY BRIDGE
// ============================================================================

export type SafetySubmissionType = 
  | 'expedited-15-day'
  | 'expedited-7-day'
  | 'psur'
  | 'dsur'
  | 'pader'
  | 'rmp-update'
  | 'safety-update'
  | 'label-change'
  | 'signal-notification'

export interface SafetyRegulatoryLink {
  id: string
  
  // Source
  sourceType: 'case' | 'signal' | 'aggregate-report' | 'rmp'
  sourceId: string
  
  // Target submission
  submissionType: SafetySubmissionType
  sequenceBuildId: string | null
  ctdSection: string // e.g., 'm2-7-4', 'm5-3-6'
  
  // Document generation
  documentTitle: string
  documentType: 'narrative' | 'summary-table' | 'line-listing' | 'analysis' | 'cover-letter'
  documentPath: string | null
  
  // Status
  status: 'pending' | 'generating' | 'generated' | 'linked' | 'submitted'
  
  // Timestamps
  linkedAt: string
  linkedBy: string
  generatedAt: string | null
  submittedAt: string | null
}

export interface SafetyNarrativeTemplate {
  id: string
  name: string
  description: string
  
  // Applicability
  narrativeType: 'icsr' | 'signal' | 'aggregate'
  seriousnessLevel: CaseSeriousness[]
  
  // Template structure
  sections: NarrativeSection[]
  
  // Auto-population rules
  autoPopulateRules: NarrativeAutoPopulateRule[]
  
  // Formatting
  targetWordCount: number
  includeTimeline: boolean
  includeCausalityAssessment: boolean
  
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface NarrativeSection {
  id: string
  title: string
  order: number
  required: boolean
  placeholder: string
  maxLength: number | null
}

export interface NarrativeAutoPopulateRule {
  sectionId: string
  sourceField: string
  transformation: 'direct' | 'formatted-date' | 'list' | 'template'
  template: string | null
}

export interface ExpediteReportTracker {
  id: string
  caseId: string
  caseNumber: string
  
  // Reporting requirements
  reportType: 'susar-7-day' | 'susar-15-day' | 'ae-15-day' | 'pmr'
  regions: ExpediteRegionRequirement[]
  
  // Status
  overallStatus: 'pending' | 'in-progress' | 'submitted' | 'completed' | 'overdue'
  
  // Timelines
  awareDate: string
  clockStartDate: string
  dueDate: string
  
  // Tracking
  submissionLog: ExpediteSubmissionLog[]
  
  createdAt: string
  updatedAt: string
}

export interface ExpediteRegionRequirement {
  region: string
  authority: string
  required: boolean
  daysAllowed: 7 | 15
  submissionMethod: 'gateway' | 'email' | 'portal'
  status: 'pending' | 'submitted' | 'acknowledged' | 'rejected'
  submittedAt: string | null
  acknowledgedAt: string | null
}

export interface ExpediteSubmissionLog {
  id: string
  region: string
  submittedAt: string
  submittedBy: string
  method: string
  referenceNumber: string | null
  status: 'submitted' | 'acknowledged' | 'rejected'
  responseDate: string | null
  responseNotes: string | null
}

// ============================================================================
// RISK MANAGEMENT INTEGRATION
// ============================================================================

export interface RMPIntegration {
  id: string
  productId: string
  productName: string
  
  // Current RMP version
  rmpVersion: string
  rmpEffectiveDate: string
  
  // Safety concerns from RMP
  importantIdentifiedRisks: RMPSafetyConcern[]
  importantPotentialRisks: RMPSafetyConcern[]
  missingInformation: RMPMissingInfo[]
  
  // Linkage to signals
  signalToRiskMapping: SignalRiskMapping[]
  
  // Update tracking
  pendingUpdates: RMPPendingUpdate[]
  
  createdAt: string
  updatedAt: string
}

export interface RMPSafetyConcern {
  id: string
  term: string
  meddraCode: string | null
  description: string
  dateIdentified: string
  currentStatus: 'active' | 'resolved' | 'removed'
  pharmacovigilanceActivities: string[]
  riskMinimizationMeasures: string[]
}

export interface RMPMissingInfo {
  id: string
  category: string
  description: string
  dataGatheringPlan: string
  status: 'active' | 'resolved'
}

export interface SignalRiskMapping {
  signalId: string
  concernId: string
  mappingType: 'existing-risk' | 'new-potential' | 'new-identified'
  mappedAt: string
  mappedBy: string
}

export interface RMPPendingUpdate {
  id: string
  updateType: 'new-risk' | 'status-change' | 'measure-update' | 'removal'
  concernId: string | null
  signalId: string | null
  description: string
  justification: string
  status: 'pending' | 'approved' | 'implemented'
  createdAt: string
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

export interface SafetyState {
  // Cases
  cases: Record<string, ICSRCase>
  selectedCaseId: string | null
  
  // Signals
  signals: Record<string, SafetySignal>
  selectedSignalId: string | null
  signalReviewCycles: Record<string, SignalReviewCycle[]>
  
  // Reporting periods
  reportingPeriods: Record<string, SafetyReportingPeriod>
  psurConfigurations: Record<string, PSURConfiguration>
  
  // Regulatory links
  regulatoryLinks: Record<string, SafetyRegulatoryLink>
  expediteTrackers: Record<string, ExpediteReportTracker>
  
  // Narrative templates
  narrativeTemplates: Record<string, SafetyNarrativeTemplate>
  
  // RMP integration
  rmpIntegrations: Record<string, RMPIntegration>
  
  // UI State
  view: SafetyView
  filters: SafetyFilters
  
  // Loading states
  isLoading: boolean
  isCalculatingSignals: boolean
  isGeneratingReport: boolean
  error: string | null
}

export type SafetyView = 
  | 'case-list'
  | 'case-detail'
  | 'case-intake'
  | 'signal-list'
  | 'signal-detail'
  | 'signal-detection'
  | 'reporting-calendar'
  | 'psur-editor'
  | 'expedite-tracker'
  | 'regulatory-bridge'
  | 'rmp-dashboard'

export interface SafetyFilters {
  caseStatus: CaseStatus | 'all'
  casePriority: CasePriority | 'all'
  caseSeriousness: CaseSeriousness | 'all'
  signalStatus: SignalStatus | 'all'
  signalPriority: SignalPriority | 'all'
  productId: string | 'all'
  dateRange: { start: string; end: string } | null
  assignedTo: string | 'all' | 'unassigned'
  searchQuery: string
}

export interface SafetyActions {
  // Case management
  createCase: (config: CaseCreateConfig) => ICSRCase
  updateCase: (id: string, updates: Partial<ICSRCase>) => void
  deleteCase: (id: string) => void
  selectCase: (id: string | null) => void
  
  // Case workflow
  assignCase: (caseId: string, userId: string, userName: string) => void
  submitForMedicalReview: (caseId: string) => void
  completeMedicalReview: (caseId: string, notes: string) => void
  submitForQC: (caseId: string) => void
  markReadyToSubmit: (caseId: string) => void
  submitToAuthority: (caseId: string, region: string) => Promise<CaseSubmission>
  
  // Case data entry
  addReaction: (caseId: string, reaction: Omit<ICSRReaction, 'id'>) => ICSRReaction
  updateReaction: (caseId: string, reactionId: string, updates: Partial<ICSRReaction>) => void
  removeReaction: (caseId: string, reactionId: string) => void
  addDrug: (caseId: string, drug: Omit<ICSRDrug, 'id'>) => ICSRDrug
  updateDrug: (caseId: string, drugId: string, updates: Partial<ICSRDrug>) => void
  removeDrug: (caseId: string, drugId: string) => void
  
  // Signal management
  createSignal: (config: SignalCreateConfig) => SafetySignal
  updateSignal: (id: string, updates: Partial<SafetySignal>) => void
  deleteSignal: (id: string) => void
  selectSignal: (id: string | null) => void
  
  // Signal detection
  runSignalDetection: (productId: string, method: DetectionMethod) => Promise<SafetySignal[]>
  calculateSignalStatistics: (signalId: string) => Promise<SignalStatistics>
  linkCasesToSignal: (signalId: string, caseIds: string[]) => void
  
  // Signal workflow
  assignSignalReviewer: (signalId: string, userId: string, userName: string, role: SignalReviewer['role']) => void
  startSignalReviewCycle: (signalId: string) => SignalReviewCycle
  completeSignalReview: (signalId: string, cycleId: string, decision: SignalReviewCycle['decision'], rationale: string) => void
  
  // Aggregate reports
  createReportingPeriod: (config: Omit<SafetyReportingPeriod, 'id' | 'createdAt' | 'updatedAt'>) => SafetyReportingPeriod
  updateReportingPeriod: (id: string, updates: Partial<SafetyReportingPeriod>) => void
  lockDataForPeriod: (periodId: string) => void
  
  // Regulatory bridge
  createRegulatoryLink: (config: Omit<SafetyRegulatoryLink, 'id' | 'linkedAt' | 'linkedBy'>) => SafetyRegulatoryLink
  generateSafetyNarrative: (caseId: string, templateId: string) => Promise<string>
  linkToSubmission: (linkId: string, sequenceBuildId: string, ctdSection: string) => void
  
  // Expedite tracking
  createExpediteTracker: (caseId: string, reportType: ExpediteReportTracker['reportType']) => ExpediteReportTracker
  recordExpediteSubmission: (trackerId: string, region: string, referenceNumber: string) => void
  
  // RMP integration
  mapSignalToRMP: (signalId: string, concernId: string, mappingType: SignalRiskMapping['mappingType']) => void
  createRMPUpdate: (rmpId: string, update: Omit<RMPPendingUpdate, 'id' | 'createdAt'>) => void
  
  // View & filters
  setView: (view: SafetyView) => void
  setFilters: (filters: Partial<SafetyFilters>) => void
  clearFilters: () => void
  
  // Computed
  getCasesByProduct: (productId: string) => ICSRCase[]
  getSignalsByProduct: (productId: string) => SafetySignal[]
  getOverdueCases: () => ICSRCase[]
  getActiveSignals: () => SafetySignal[]
  getUpcomingReportingDeadlines: () => SafetyReportingPeriod[]
  getExpeditesDue: () => ExpediteReportTracker[]
}

// ============================================================================
// CONFIG TYPES
// ============================================================================

export interface CaseCreateConfig {
  reportType: ICSRType
  primarySource: ReportSource
  productId: string
  productName: string
  seriousness: CaseSeriousness
  receiptDate?: string
}

export interface SignalCreateConfig {
  title: string
  description: string
  productId: string
  productName: string
  activeSubstance: string
  primaryEvent: string
  primaryEventMeddra: string
  detectionMethod: DetectionMethod
  source: SignalSource
}
