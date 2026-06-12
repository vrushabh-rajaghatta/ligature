
// ============================================================================
// Safety-Regulatory Bridge Types - v74
// Connects Safety Core (v73) to Aggregate Reports (v55) and CTD Submissions
// ============================================================================

import type { CaseSeriousness, CaseOutcome, CasualityAssessment, ICSRType, ReportSource, SignalStatus, DetectionMethod } from './safetyTypes'
import type { AggregateReportType, SubmissionRegion } from './aggregateReportTypes'

// ============================================================================
// REPORTING PERIOD MANAGEMENT
// ============================================================================

export type ReportingFrequency = 
  | '6-month'      // First 2 years post-approval (EU)
  | '12-month'     // Years 2-5
  | '36-month'     // After year 5
  | 'annual'       // Standard annual (DSUR)
  | 'ad-hoc'       // Triggered reports

export type PeriodStatus = 
  | 'future'
  | 'upcoming'     // Within 60 days
  | 'active'       // Data collection open
  | 'data-lock'    // Past DLP, drafting
  | 'drafting'
  | 'review'
  | 'submitted'
  | 'closed'

export interface ReportingPeriodConfig {
  id: string
  productId: string
  productName: string
  activeSubstance: string
  
  // International Birth Date - anchor for all periods
  internationalBirthDate: string  // IBD
  
  // Report type
  reportType: AggregateReportType
  
  // Frequency configuration
  frequency: ReportingFrequency
  
  // Regional requirements
  regionalConfigs: RegionalPeriodConfig[]
  
  // Auto-scheduling
  autoSchedule: boolean
  advanceNotificationDays: number  // Days before DLP to notify
  
  createdAt: string
  updatedAt: string
}

export interface RegionalPeriodConfig {
  region: SubmissionRegion
  authority: string
  required: boolean
  daysAfterDLPForSubmission: number  // e.g., 70 days for EU PSUR
  submissionFormat: 'ectd' | 'nees' | 'paper' | 'portal'
  additionalRequirements: string[]
}

export interface ReportingPeriod {
  id: string
  configId: string
  productId: string
  productName: string
  reportType: AggregateReportType
  
  // Period identification
  periodNumber: number
  periodLabel: string  // e.g., "PSUR #3" or "DSUR 2024"
  
  // Dates
  periodStartDate: string
  periodEndDate: string
  dataLockPoint: string
  
  // Due dates by region
  regionalDueDates: RegionalDueDate[]
  earliestDueDate: string
  
  // Status
  status: PeriodStatus
  
  // Linked reports
  linkedReportIds: string[]  // Links to v55 aggregate reports
  
  // Case snapshot
  snapshotId: string | null
  snapshotCreatedAt: string | null
  
  createdAt: string
  updatedAt: string
}

export interface RegionalDueDate {
  region: SubmissionRegion
  authority: string
  dueDate: string
  submittedDate: string | null
  status: 'pending' | 'submitted' | 'acknowledged' | 'accepted'
  referenceNumber: string | null
}

// ============================================================================
// LINE LISTING GENERATION
// ============================================================================

export type LineListingType = 
  | 'all-cases'
  | 'serious-cases'
  | 'fatal-cases'
  | 'susar'
  | 'expedited'
  | 'clinical-trial'
  | 'spontaneous'
  | 'signal-cases'
  | 'custom'

export interface LineListingConfig {
  id: string
  name: string
  description: string
  
  // Scope
  listingType: LineListingType
  
  // Filters
  filters: LineListingFilters
  
  // Columns
  columns: LineListingColumnConfig[]
  
  // Sorting
  sortBy: string
  sortOrder: 'asc' | 'desc'
  
  // Options
  includeNarrativeSnippet: boolean
  maxNarrativeLength: number
  preserveBlinding: boolean
  anonymizePatientId: boolean
  
  // Regional formatting
  regionalFormat: SubmissionRegion | 'ich-standard'
  
  createdAt: string
  updatedAt: string
}

export interface LineListingFilters {
  periodId: string | null          // Filter by reporting period
  productIds: string[]             // Filter by product(s)
  seriousness: CaseSeriousness[]   // Empty = all
  outcomes: CaseOutcome[]          // Empty = all
  causality: CasualityAssessment[] // Empty = all
  reportTypes: ICSRType[]          // Empty = all
  sources: ReportSource[]          // Empty = all
  signalIds: string[]              // Cases linked to specific signals
  dateRange: { start: string; end: string } | null
  countries: string[]              // Empty = all
  studyIds: string[]               // For clinical trial cases
}

export interface LineListingColumnConfig {
  id: string
  fieldPath: string       // Path to data field (e.g., 'patient.age', 'reactions[0].meddraPT')
  header: string          // Column header text
  width: number           // Percentage or px
  order: number
  required: boolean
  visible: boolean
  format: 'text' | 'date' | 'number' | 'list' | 'boolean'
  dateFormat?: string     // For date fields
  listSeparator?: string  // For list fields
}

export interface GeneratedLineListing {
  id: string
  configId: string
  periodId: string | null
  productId: string
  
  // Generation metadata
  generatedAt: string
  generatedBy: string
  dataLockPoint: string
  
  // Results
  totalCases: number
  rows: LineListingRow[]
  
  // Column definitions (snapshot of config at generation time)
  columns: LineListingColumnConfig[]
  
  // Summary stats
  summary: LineListingSummary
  
  // Export
  exportedFormats: ExportRecord[]
}

export interface LineListingRow {
  caseId: string
  caseNumber: string
  values: Record<string, string | number | boolean | null>
  narrativeSnippet: string | null
  flagged: boolean
  flagReason: string | null
}

export interface LineListingSummary {
  totalCases: number
  seriousCases: number
  fatalCases: number
  bySOC: { soc: string; count: number }[]
  byOutcome: { outcome: string; count: number }[]
  byCausality: { causality: string; count: number }[]
  bySource: { source: string; count: number }[]
}

export interface ExportRecord {
  format: 'pdf' | 'xlsx' | 'csv' | 'rtf'
  exportedAt: string
  exportedBy: string
  filePath: string | null
}

// ============================================================================
// SUMMARY TABLE GENERATION
// ============================================================================

export type SummaryTableType = 
  | 'soc-pt-summary'           // SOC/PT breakdown
  | 'seriousness-summary'      // By seriousness criteria
  | 'causality-summary'        // By causality assessment
  | 'demographics-summary'     // Age/sex/country
  | 'outcome-summary'          // By outcome
  | 'source-summary'           // By report source
  | 'cumulative-vs-interval'   // Cumulative vs. this period
  | 'treatment-emergent'       // TEAEs (clinical trial)
  | 'comparative'              // Treatment vs. comparator

export interface SummaryTableConfig {
  id: string
  name: string
  tableType: SummaryTableType
  
  // Scope
  periodId: string | null
  productIds: string[]
  
  // Options
  includeNonSerious: boolean
  includeCumulative: boolean
  showPercentages: boolean
  showRates: boolean  // Per patient-year
  exposureData: ExposureDataSource | null
  
  // Thresholds for display
  minimumCaseCount: number  // Hide rows below this
  
  createdAt: string
}

export interface ExposureDataSource {
  type: 'clinical-trial' | 'post-marketing' | 'combined'
  totalPatients: number
  totalPatientYears: number
  sourceDescription: string
}

export interface GeneratedSummaryTable {
  id: string
  configId: string
  periodId: string | null
  tableType: SummaryTableType
  
  // Generation
  generatedAt: string
  generatedBy: string
  dataLockPoint: string
  
  // Table structure
  title: string
  headers: string[]
  rows: SummaryTableRow[]
  footnotes: string[]
  
  // Totals
  totals: SummaryTableTotals
}

export interface SummaryTableRow {
  rowId: string
  rowLabel: string
  indent: number  // For hierarchical display (SOC > PT)
  isHeader: boolean
  isTotal: boolean
  values: (string | number | null)[]
  highlighted: boolean
}

export interface SummaryTableTotals {
  totalCases: number
  totalSerious: number
  totalFatal: number
  totalPatients?: number
  incidenceRate?: number
}

// ============================================================================
// CTD SECTION MAPPING
// ============================================================================

export type CTDSafetySection = 
  // Module 2.7 Clinical Summary
  | 'm2-7-4'        // Summary of Clinical Safety
  | 'm2-7-4-1'      // Exposure to the Drug
  | 'm2-7-4-2'      // Adverse Events
  | 'm2-7-4-3'      // Clinical Laboratory Evaluations
  | 'm2-7-4-4'      // Vital Signs
  | 'm2-7-4-5'      // Special Safety Studies
  | 'm2-7-4-6'      // Post-Marketing Data
  | 'm2-7-4-7'      // Safety in Special Groups
  // Module 5 Clinical Study Reports
  | 'm5-3-5-3'      // Reports of Uncontrolled Clinical Studies
  | 'm5-3-6'        // Post-Marketing Experience
  // Regional sections
  | 'fda-safety-update'
  | 'ema-psur-section'

export interface CTDSafetyMapping {
  id: string
  
  // Source
  sourceType: 'line-listing' | 'summary-table' | 'signal' | 'aggregate-report' | 'case-narrative'
  sourceId: string
  sourceTitle: string
  
  // Target CTD section
  ctdSection: CTDSafetySection
  ctdSectionTitle: string
  
  // Submission context
  submissionId: string | null
  sequenceBuildId: string | null
  
  // Document placement
  documentTitle: string
  documentFileName: string
  leafNumber: string | null
  
  // Status
  status: 'draft' | 'mapped' | 'linked' | 'finalized'
  
  // Cross-references
  crossReferences: CTDCrossReference[]
  
  // Metadata
  mappedAt: string
  mappedBy: string
  updatedAt: string
}

export interface CTDCrossReference {
  id: string
  targetSection: CTDSafetySection
  targetTitle: string
  referenceType: 'see-also' | 'detailed-in' | 'summary-of' | 'supersedes'
  referenceText: string
}

// ============================================================================
// SIGNAL-TO-AGGREGATE INTEGRATION
// ============================================================================

export interface SignalAggregateLink {
  id: string
  signalId: string
  signalTitle: string
  signalStatus: SignalStatus
  
  // Linked aggregate report
  aggregateReportId: string
  aggregateReportType: AggregateReportType
  periodId: string
  
  // Section placement
  reportSection: string  // e.g., 'signals-new-identified' for DSUR
  sectionNumber: string
  
  // Content
  signalNarrative: string
  evaluationSummary: string
  conclusion: 'confirmed' | 'refuted' | 'ongoing' | 'closed-no-action'
  recommendedActions: string[]
  
  // Statistics snapshot
  statisticsSnapshot: SignalStatisticsSnapshot | null
  
  // Regulatory
  notificationRequired: boolean
  notificationSent: boolean
  notificationDate: string | null
  notificationRegions: SubmissionRegion[]
  
  linkedAt: string
  linkedBy: string
}

export interface SignalStatisticsSnapshot {
  capturedAt: string
  caseCount: number
  seriousCaseCount: number
  fatalCaseCount: number
  prr: number | null
  prrLower95: number | null
  ror: number | null
  rorLower95: number | null
  ebgm: number | null
  ebgmLower95: number | null
  detectionMethod: DetectionMethod
}

// ============================================================================
// BENEFIT-RISK FRAMEWORK (Lightweight for v74)
// ============================================================================

export type BenefitRiskConclusion = 
  | 'favorable'
  | 'favorable-with-conditions'
  | 'uncertain'
  | 'unfavorable'

export interface BenefitRiskAssessment {
  id: string
  periodId: string
  productId: string
  productName: string
  
  // Assessment date
  assessmentDate: string
  assessedBy: string
  
  // Indication-level assessment
  indicationAssessments: IndicationBRAssessment[]
  
  // Overall conclusion
  overallConclusion: BenefitRiskConclusion
  conclusionNarrative: string
  
  // Key factors
  benefitFactors: BRFactor[]
  riskFactors: BRFactor[]
  
  // Changes from previous
  changeFromPrevious: 'unchanged' | 'improved' | 'worsened' | 'first-assessment'
  changeNarrative: string | null
  
  // Recommendations
  recommendations: BRRecommendation[]
  
  // Linked to aggregate report
  aggregateReportId: string | null
  
  createdAt: string
  updatedAt: string
}

export interface IndicationBRAssessment {
  indication: string
  approvalStatus: 'approved' | 'under-review' | 'investigational'
  
  benefitStrength: 'well-established' | 'established' | 'emerging' | 'uncertain'
  riskLevel: 'low' | 'moderate' | 'high' | 'uncertain'
  
  conclusion: BenefitRiskConclusion
  keyConsiderations: string[]
}

export interface BRFactor {
  id: string
  factorType: 'benefit' | 'risk'
  category: string  // e.g., 'efficacy', 'safety', 'tolerability'
  description: string
  weight: 'high' | 'medium' | 'low'
  evidenceStrength: 'strong' | 'moderate' | 'limited'
  trend: 'improving' | 'stable' | 'worsening' | 'new'
  supportingData: string
}

export interface BRRecommendation {
  id: string
  recommendationType: 'labeling' | 'risk-minimization' | 'further-study' | 'communication' | 'restriction' | 'no-action'
  description: string
  rationale: string
  targetRegions: SubmissionRegion[]
  timeline: string
  status: 'proposed' | 'approved' | 'implemented' | 'rejected'
}

// ============================================================================
// CASE SNAPSHOT (for Data Lock)
// ============================================================================

export interface CaseSnapshot {
  id: string
  periodId: string
  productId: string
  
  // Snapshot metadata
  snapshotDate: string
  dataLockPoint: string
  createdBy: string
  
  // Case IDs included
  caseIds: string[]
  totalCases: number
  
  // Summary at snapshot time
  summary: SnapshotSummary
  
  // Prevents modification
  locked: boolean
  
  createdAt: string
}

export interface SnapshotSummary {
  totalCases: number
  newCasesThisPeriod: number
  seriousCases: number
  fatalCases: number
  
  bySource: Record<string, number>
  bySOC: Record<string, number>
  bySeriousness: Record<string, number>
  byCausality: Record<string, number>
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

export type SafetyRegBridgeView = 
  | 'period-calendar'
  | 'period-detail'
  | 'line-listing-config'
  | 'line-listing-view'
  | 'summary-tables'
  | 'ctd-mapping'
  | 'signal-integration'
  | 'benefit-risk'
  | 'dashboard'

export interface SafetyRegBridgeFilters {
  productId: string | 'all'
  reportType: AggregateReportType | 'all'
  periodStatus: PeriodStatus | 'all'
  region: SubmissionRegion | 'all'
  dateRange: { start: string; end: string } | null
  searchQuery: string
}

export interface SafetyRegBridgeState {
  // Reporting periods
  periodConfigs: Record<string, ReportingPeriodConfig>
  periods: Record<string, ReportingPeriod>
  selectedPeriodId: string | null
  
  // Line listings
  lineListingConfigs: Record<string, LineListingConfig>
  generatedListings: Record<string, GeneratedLineListing>
  selectedListingId: string | null
  
  // Summary tables
  summaryTableConfigs: Record<string, SummaryTableConfig>
  generatedTables: Record<string, GeneratedSummaryTable>
  
  // CTD mappings
  ctdMappings: Record<string, CTDSafetyMapping>
  
  // Signal integration
  signalAggregateLinks: Record<string, SignalAggregateLink>
  
  // Benefit-risk
  benefitRiskAssessments: Record<string, BenefitRiskAssessment>
  
  // Case snapshots
  caseSnapshots: Record<string, CaseSnapshot>
  
  // UI state
  view: SafetyRegBridgeView
  filters: SafetyRegBridgeFilters
  
  // Loading
  isLoading: boolean
  isGenerating: boolean
  error: string | null
}

export interface SafetyRegBridgeActions {
  // Period management
  createPeriodConfig: (config: Omit<ReportingPeriodConfig, 'id' | 'createdAt' | 'updatedAt'>) => ReportingPeriodConfig
  updatePeriodConfig: (id: string, updates: Partial<ReportingPeriodConfig>) => void
  deletePeriodConfig: (id: string) => void
  generatePeriodsFromConfig: (configId: string, count: number) => ReportingPeriod[]
  selectPeriod: (id: string | null) => void
  updatePeriodStatus: (id: string, status: PeriodStatus) => void
  
  // Line listing
  createLineListingConfig: (config: Omit<LineListingConfig, 'id' | 'createdAt' | 'updatedAt'>) => LineListingConfig
  updateLineListingConfig: (id: string, updates: Partial<LineListingConfig>) => void
  deleteLineListingConfig: (id: string) => void
  generateLineListing: (configId: string, periodId: string | null, dataLockPoint: string) => GeneratedLineListing
  selectListing: (id: string | null) => void
  exportLineListing: (listingId: string, format: 'pdf' | 'xlsx' | 'csv') => ExportRecord
  
  // Summary tables
  createSummaryTableConfig: (config: Omit<SummaryTableConfig, 'id' | 'createdAt'>) => SummaryTableConfig
  generateSummaryTable: (configId: string, periodId: string | null) => GeneratedSummaryTable
  
  // CTD mapping
  createCTDMapping: (mapping: Omit<CTDSafetyMapping, 'id' | 'mappedAt' | 'updatedAt'>) => CTDSafetyMapping
  updateCTDMapping: (id: string, updates: Partial<CTDSafetyMapping>) => void
  linkMappingToSequence: (mappingId: string, sequenceBuildId: string, leafNumber: string) => void
  
  // Signal integration
  linkSignalToReport: (signalId: string, reportId: string, section: string) => SignalAggregateLink
  updateSignalLink: (linkId: string, updates: Partial<SignalAggregateLink>) => void
  captureSignalStatistics: (linkId: string) => void
  
  // Benefit-risk
  createBenefitRiskAssessment: (assessment: Omit<BenefitRiskAssessment, 'id' | 'createdAt' | 'updatedAt'>) => BenefitRiskAssessment
  updateBenefitRiskAssessment: (id: string, updates: Partial<BenefitRiskAssessment>) => void
  
  // Case snapshots
  createCaseSnapshot: (periodId: string, dataLockPoint: string) => CaseSnapshot
  
  // View & filters
  setView: (view: SafetyRegBridgeView) => void
  setFilters: (filters: Partial<SafetyRegBridgeFilters>) => void
  clearFilters: () => void
  
  // Queries
  getPeriodsForProduct: (productId: string) => ReportingPeriod[]
  getUpcomingPeriods: (days: number) => ReportingPeriod[]
  getOverduePeriods: () => ReportingPeriod[]
  getListingsForPeriod: (periodId: string) => GeneratedLineListing[]
  getMappingsForSubmission: (submissionId: string) => CTDSafetyMapping[]
  getSignalLinksForReport: (reportId: string) => SignalAggregateLink[]
  
  // Initialization
  initializeGoldenPath: () => void
  resetStore: () => void
}
