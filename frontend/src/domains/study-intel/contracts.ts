
/**
 * Study Intelligence Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Study Intelligence types.
 * 
 * Advanced analytics and forecasting for clinical trial operations:
 * - Enrollment forecasting (multiple models: S-curve, Gompertz, ML)
 * - Site performance analytics and ranking
 * - Milestone tracking and critical path analysis
 * - Risk scoring and early warning systems
 * - Cross-study benchmarking
 * 
 * @module domains/study-intel/contracts
 * @version 0.27.42
 */

// =============================================================================
// ENROLLMENT FORECASTING
// =============================================================================

export type ForecastModel = 
  | 'linear'
  | 's-curve'
  | 'gompertz'
  | 'exponential'
  | 'poisson'
  | 'adaptive-ml'
  | 'site-based'
  | 'custom';

export type ForecastConfidence = 'low' | 'medium' | 'high' | 'very-high';

export interface EnrollmentForecastConfig {
  id: string;
  studyId: string;
  
  // Model selection
  primaryModel: ForecastModel;
  fallbackModel?: ForecastModel;
  
  // Time horizon
  forecastHorizonDays: number;
  granularity: 'daily' | 'weekly' | 'monthly';
  
  // Model parameters
  parameters: ForecastModelParameters;
  
  // Data inputs
  useSiteSpecificRates: boolean;
  useSeasonalAdjustment: boolean;
  useRegionalFactors: boolean;
  historicalWeightDecay: number;
  
  // Scenarios
  optimisticMultiplier: number;
  pessimisticMultiplier: number;
  
  // Last update
  lastUpdated: string;
  updatedBy: string;
}

export interface ForecastModelParameters {
  // S-curve / Gompertz
  inflectionPoint?: number;
  growthRate?: number;
  saturationLevel?: number;
  
  // Linear
  slope?: number;
  intercept?: number;
  
  // Site-based
  activationLag?: number;
  rampUpPeriod?: number;
  
  // Adaptive ML
  learningRate?: number;
  confidenceThreshold?: number;
  retrainingFrequency?: 'daily' | 'weekly' | 'on-deviation';
}

export interface EnrollmentForecastResult {
  id: string;
  studyId: string;
  configId: string;
  generatedAt: string;
  generatedBy: string;
  
  // Current state
  currentEnrollment: number;
  targetEnrollment: number;
  percentComplete: number;
  
  // Projections
  projectedCompletionDate: string;
  projectedCompletionDateOptimistic: string;
  projectedCompletionDatePessimistic: string;
  confidence: ForecastConfidence;
  confidenceScore: number;
  
  // Time series forecast
  forecastPoints: ForecastDataPoint[];
  
  // Model metrics
  modelAccuracy: number;
  modelFit: number;
  residualAnalysis: ResidualAnalysis;
  
  // Variance from plan
  daysAheadBehind: number;
  enrollmentVariancePercent: number;
  
  // Scenario analysis
  scenarios: ForecastScenario[];
  
  // Risk factors affecting forecast
  forecastRisks: ForecastRisk[];
}

export interface ForecastDataPoint {
  date: string;
  actual?: number;
  projected: number;
  projectedOptimistic: number;
  projectedPessimistic: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;
}

export interface ResidualAnalysis {
  meanAbsoluteError: number;
  meanSquaredError: number;
  meanAbsolutePercentageError: number;
  maxResidual: number;
  autocorrelation: number;
  heteroscedasticity: boolean;
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  assumptions: string[];
  projectedCompletionDate: string;
  probability: number;
  impactAssessment: string;
}

export interface ForecastRisk {
  id: string;
  category: 'site-performance' | 'regulatory' | 'competition' | 'operational' | 'seasonal';
  description: string;
  potentialDelayDays: number;
  probability: number;
  mitigationActions: string[];
}

// =============================================================================
// SITE PERFORMANCE ANALYTICS
// =============================================================================

export type PerformanceTier = 'top' | 'above-average' | 'average' | 'below-average' | 'underperforming';
export type PerformanceTrend = 'improving' | 'stable' | 'declining';

export interface SitePerformanceAnalytics {
  id: string;
  studyId: string;
  siteId: string;
  siteNumber: string;
  siteName: string;
  country: string;
  region: string;
  
  // Overall score
  performanceScore: number;
  performanceTier: PerformanceTier;
  performanceTrend: PerformanceTrend;
  trendChangePercent: number;
  
  // Ranking
  overallRank: number;
  rankOutOf: number;
  regionRank: number;
  regionRankOutOf: number;
  
  // Metrics
  enrollmentMetrics: SiteEnrollmentMetrics;
  dataQualityMetrics: SiteDataQualityMetrics;
  complianceMetrics: SiteComplianceMetrics;
  operationalMetrics: SiteOperationalMetrics;
  
  // Composite dimension scores
  dimensionScores: {
    enrollment: number;
    dataQuality: number;
    compliance: number;
    operations: number;
  };
  
  // Historical performance
  performanceHistory: PerformanceHistoryPoint[];
  
  // Comparison to study average
  comparisonToAverage: MetricComparison[];
  
  // Improvement recommendations
  recommendations: SiteRecommendation[];
  
  // Analysis metadata
  analysisDate: string;
  dataAsOf: string;
}

export interface SiteEnrollmentMetrics {
  targetEnrollment: number;
  currentEnrollment: number;
  percentOfTarget: number;
  
  // Rates
  enrollmentRate: number;
  enrollmentRateVsTarget: number;
  screeningRate: number;
  screenFailureRate: number;
  randomizationRate: number;
  
  // Time metrics
  timeToFirstScreening: number;
  timeToFirstRandomization: number;
  avgTimeToConsent: number;
  
  // Projections
  projectedCompletion: string;
  willMeetTarget: boolean;
  
  // Trends
  enrollmentTrend: PerformanceTrend;
  lastMonthEnrollment: number;
  last3MonthAvg: number;
}

export interface SiteDataQualityMetrics {
  // Query metrics
  queryRate: number;
  queryRateVsAverage: number;
  queryResolutionTime: number;
  overdueQueries: number;
  
  // Data entry
  dataEntryLag: number;
  dataEntryLagVsAverage: number;
  formsCompletionRate: number;
  missingDataRate: number;
  
  // Error rates
  editCheckFailureRate: number;
  saeReportingTimeliness: number;
  
  // Trends
  queryTrend: PerformanceTrend;
  dataEntryTrend: PerformanceTrend;
}

export interface SiteComplianceMetrics {
  // Protocol deviations
  deviationRate: number;
  majorDeviations: number;
  minorDeviations: number;
  deviationTrend: PerformanceTrend;
  
  // Visit compliance
  visitWindowCompliance: number;
  missedVisits: number;
  unscheduledVisits: number;
  
  // Consent compliance
  reconsentCompleteness: number;
  icfVersionCompliance: number;
  
  // Training compliance
  trainingCompleteness: number;
  gcpTrainingCurrent: number;
  
  // Document compliance
  regulatoryDocCompleteness: number;
  essentialDocsOnFile: number;
}

export interface SiteOperationalMetrics {
  // Activation metrics
  activationDuration: number;
  startupEfficiency: number;
  
  // Monitoring
  lastMonitoringVisit: string;
  monitoringFindingsOpen: number;
  criticalFindingsOpen: number;
  followUpItemsOverdue: number;
  
  // Staff stability
  staffTurnover: number;
  keyStaffChanges: number;
  
  // Communication
  responseTime: number;
  escalationsRequested: number;
  
  // Financial
  budgetUtilization: number;
  invoiceAccuracy: number;
}

export interface PerformanceHistoryPoint {
  date: string;
  performanceScore: number;
  enrollmentScore: number;
  dataQualityScore: number;
  complianceScore: number;
  operationsScore: number;
  rank: number;
}

export interface MetricComparison {
  metricName: string;
  siteValue: number;
  studyAverage: number;
  percentDifference: number;
  status: 'above' | 'at' | 'below';
}

export interface SiteRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'enrollment' | 'data-quality' | 'compliance' | 'operations';
  title: string;
  description: string;
  expectedImpact: string;
  suggestedActions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

// =============================================================================
// MILESTONE TRACKING
// =============================================================================

export type MilestoneStatus = 'not-started' | 'in-progress' | 'at-risk' | 'delayed' | 'completed' | 'cancelled';
export type MilestoneCategory = 'regulatory' | 'enrollment' | 'clinical' | 'data' | 'submission' | 'operational';

export interface StudyMilestoneTracker {
  id: string;
  studyId: string;
  
  // Milestone list
  milestones: TrackedMilestone[];
  
  // Critical path
  criticalPath: CriticalPathAnalysis;
  
  // Overall timeline health
  timelineHealth: 'on-track' | 'at-risk' | 'delayed';
  overallVarianceDays: number;
  
  // Summary metrics
  totalMilestones: number;
  completedMilestones: number;
  atRiskMilestones: number;
  delayedMilestones: number;
  
  // Last updated
  lastUpdated: string;
  updatedBy: string;
}

export interface TrackedMilestone {
  id: string;
  studyId: string;
  
  // Milestone definition
  name: string;
  description: string;
  category: MilestoneCategory;
  isCriticalPath: boolean;
  
  // Dates
  plannedDate: string;
  forecastDate: string;
  actualDate?: string;
  baselineDate: string;
  
  // Status
  status: MilestoneStatus;
  percentComplete: number;
  
  // Variance
  varianceDays: number;
  varianceStatus: 'ahead' | 'on-target' | 'behind';
  
  // Dependencies
  predecessors: string[];
  successors: string[];
  dependencies: MilestoneDependency[];
  
  // Completion criteria
  completionCriteria: CompletionCriterion[];
  
  // History
  dateHistory: MilestoneDateChange[];
  
  // Owner
  owner: string;
  ownerEmail: string;
  
  // Notes
  notes: string[];
  risks: string[];
}

export interface MilestoneDependency {
  milestoneId: string;
  milestoneName: string;
  dependencyType: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lagDays: number;
  isCritical: boolean;
}

export interface CompletionCriterion {
  id: string;
  description: string;
  isComplete: boolean;
  completedDate?: string;
  evidenceRef?: string;
}

export interface MilestoneDateChange {
  id: string;
  changeDate: string;
  changedBy: string;
  previousDate: string;
  newDate: string;
  reason: string;
  changeType: 'baseline-change' | 'forecast-update' | 'actual-completion';
}

export interface CriticalPathAnalysis {
  totalDuration: number;
  criticalMilestones: string[];
  slack: Record<string, number>;
  bottlenecks: CriticalPathBottleneck[];
  projectedEndDate: string;
  varianceFromPlan: number;
}

export interface CriticalPathBottleneck {
  milestoneId: string;
  milestoneName: string;
  delayDays: number;
  cascadeImpact: number;
  mitigationOptions: string[];
}

// =============================================================================
// RISK SCORING
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 
  | 'enrollment'
  | 'site-performance'
  | 'data-quality'
  | 'regulatory'
  | 'operational'
  | 'safety'
  | 'resource'
  | 'strategic';

export interface StudyRiskProfile {
  id: string;
  studyId: string;
  assessmentDate: string;
  assessedBy: string;
  
  // Overall risk
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  overallRiskTrend: PerformanceTrend;
  
  // Category scores
  categoryScores: RiskCategoryScore[];
  
  // Individual risk indicators
  riskIndicators: RiskIndicator[];
  
  // Early warning signals
  earlyWarnings: EarlyWarningSignal[];
  
  // Risk heatmap data
  heatmapData: RiskHeatmapCell[];
  
  // Historical tracking
  riskHistory: RiskHistoryPoint[];
  
  // Mitigation status
  mitigationStatus: MitigationStatus;
}

export interface RiskCategoryScore {
  category: RiskCategory;
  score: number;
  level: RiskLevel;
  trend: PerformanceTrend;
  weight: number;
  keyDrivers: string[];
  topRisks: string[];
}

export interface RiskIndicator {
  id: string;
  name: string;
  category: RiskCategory;
  
  // Current state
  currentValue: number | string;
  threshold: RiskThreshold;
  status: 'green' | 'yellow' | 'red';
  
  // Scoring
  riskScore: number;
  riskLevel: RiskLevel;
  
  // Trend
  trend: PerformanceTrend;
  trendValue: number;
  
  // Context
  description: string;
  measurementUnit: string;
  dataSource: string;
  lastUpdated: string;
  
  // Impact
  potentialImpact: string;
  affectedAreas: string[];
}

export interface RiskThreshold {
  greenMax: number;
  yellowMax: number;
  redMax: number;
  direction: 'lower-better' | 'higher-better';
}

export interface EarlyWarningSignal {
  id: string;
  signalType: 'leading' | 'lagging';
  category: RiskCategory;
  
  // Signal details
  name: string;
  description: string;
  detectedDate: string;
  
  // Severity
  severity: 'watch' | 'concern' | 'alert' | 'critical';
  confidence: number;
  
  // Pattern recognition
  patternMatch?: string;
  historicalOccurrences?: number;
  
  // Recommendations
  suggestedActions: string[];
  escalationRequired: boolean;
  
  // Status
  status: 'active' | 'monitoring' | 'resolved' | 'escalated';
  assignedTo?: string;
}

export interface RiskHeatmapCell {
  category: RiskCategory;
  subcategory: string;
  score: number;
  level: RiskLevel;
  label: string;
}

export interface RiskHistoryPoint {
  date: string;
  overallScore: number;
  categoryScores: Record<RiskCategory, number>;
  activeWarnings: number;
  mitigationEffectiveness: number;
}

export interface MitigationStatus {
  totalMitigations: number;
  completedMitigations: number;
  inProgressMitigations: number;
  overdueMitigations: number;
  mitigationEffectiveness: number;
  activeMitigationPlans: MitigationPlan[];
}

export interface MitigationPlan {
  id: string;
  riskIndicatorId: string;
  riskName: string;
  
  // Plan details
  title: string;
  description: string;
  strategy: string;
  
  // Ownership
  owner: string;
  stakeholders: string[];
  
  // Timeline
  startDate: string;
  targetDate: string;
  completedDate?: string;
  
  // Status
  status: 'planned' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
  percentComplete: number;
  
  // Actions
  actions: MitigationAction[];
  
  // Effectiveness
  expectedImpact: number;
  actualImpact?: number;
}

export interface MitigationAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  completedDate?: string;
}

// =============================================================================
// CROSS-STUDY BENCHMARKING
// =============================================================================

export type BenchmarkSource = 'internal' | 'industry' | 'therapeutic-area' | 'historical';
export type ComparisonDimension = 
  | 'enrollment-rate'
  | 'site-activation'
  | 'data-quality'
  | 'cycle-time'
  | 'cost-per-patient'
  | 'retention-rate'
  | 'protocol-amendments'
  | 'screen-failure';

export interface CrossStudyBenchmark {
  id: string;
  studyId: string;
  generatedAt: string;
  generatedBy: string;
  
  // Comparison cohort
  comparatorStudies: ComparatorStudy[];
  benchmarkSource: BenchmarkSource;
  
  // Dimension comparisons
  dimensionComparisons: DimensionBenchmark[];
  
  // Overall positioning
  overallPercentile: number;
  strengthAreas: string[];
  improvementAreas: string[];
  
  // Insights
  keyInsights: BenchmarkInsight[];
  recommendations: BenchmarkRecommendation[];
  
  // Best practices
  bestPractices: BestPracticeIdentification[];
}

export interface ComparatorStudy {
  id: string;
  name: string;
  phase: string;
  therapeuticArea: string;
  indication: string;
  sampleSize: number;
  startDate: string;
  completionDate?: string;
  sponsor?: string;
  region?: string[];
  similarity: number;
}

export interface DimensionBenchmark {
  dimension: ComparisonDimension;
  
  // Study value
  studyValue: number;
  studyValueUnit: string;
  
  // Benchmark values
  benchmarkMean: number;
  benchmarkMedian: number;
  benchmarkP25: number;
  benchmarkP75: number;
  benchmarkMin: number;
  benchmarkMax: number;
  
  // Positioning
  percentile: number;
  percentileCategory: 'top-quartile' | 'second-quartile' | 'third-quartile' | 'bottom-quartile';
  
  // Trend
  trend: PerformanceTrend;
  previousPercentile?: number;
  
  // Context
  sampleSize: number;
  dataQuality: 'high' | 'medium' | 'low';
}

export interface BenchmarkInsight {
  id: string;
  type: 'strength' | 'opportunity' | 'risk' | 'trend';
  dimension: ComparisonDimension;
  title: string;
  description: string;
  impactLevel: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface BenchmarkRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  dimension: ComparisonDimension;
  title: string;
  description: string;
  expectedImprovement: string;
  implementationEffort: 'low' | 'medium' | 'high';
  referenceSources: string[];
}

export interface BestPracticeIdentification {
  id: string;
  dimension: ComparisonDimension;
  practice: string;
  description: string;
  sourceStudies: string[];
  applicability: 'directly-applicable' | 'requires-adaptation' | 'contextual';
  expectedBenefit: string;
}

// =============================================================================
// DASHBOARD & VISUALIZATION
// =============================================================================

export interface StudyIntelDashboard {
  studyId: string;
  refreshedAt: string;
  
  // KPI summary
  kpiSummary: KPISummary;
  
  // Enrollment visualization
  enrollmentChart: EnrollmentChartData;
  
  // Site performance
  sitePerformanceMap: SitePerformanceMapData;
  siteRankings: SiteRankingData;
  
  // Risk summary
  riskSummary: RiskSummaryData;
  
  // Milestone timeline
  milestoneTimeline: MilestoneTimelineData;
  
  // Alerts
  activeAlerts: StudyIntelAlert[];
  
  // Quick actions
  suggestedActions: QuickAction[];
}

export interface KPISummary {
  enrollment: {
    current: number;
    target: number;
    percentComplete: number;
    trend: PerformanceTrend;
    projectedCompletion: string;
  };
  sites: {
    active: number;
    enrolling: number;
    atRisk: number;
    trend: PerformanceTrend;
  };
  dataQuality: {
    queryRate: number;
    queryRateTrend: PerformanceTrend;
    dataLag: number;
  };
  timeline: {
    status: 'on-track' | 'at-risk' | 'delayed';
    nextMilestone: string;
    nextMilestoneDate: string;
    daysToNextMilestone: number;
  };
  risk: {
    overallLevel: RiskLevel;
    activeWarnings: number;
    trend: PerformanceTrend;
  };
}

export interface EnrollmentChartData {
  timeSeriesData: {
    date: string;
    actual: number;
    target: number;
    forecast: number;
    forecastLow: number;
    forecastHigh: number;
  }[];
  bySite: {
    siteId: string;
    siteName: string;
    enrolled: number;
    target: number;
  }[];
  byRegion: {
    region: string;
    enrolled: number;
    target: number;
  }[];
  byArm: {
    armId: string;
    armName: string;
    enrolled: number;
    target: number;
  }[];
}

export interface SitePerformanceMapData {
  sites: {
    siteId: string;
    siteName: string;
    country: string;
    latitude: number;
    longitude: number;
    performanceScore: number;
    performanceTier: PerformanceTier;
    enrolled: number;
    target: number;
    status: 'active' | 'inactive' | 'at-risk';
  }[];
  regionSummary: {
    region: string;
    siteCount: number;
    avgPerformance: number;
    totalEnrolled: number;
  }[];
}

export interface SiteRankingData {
  topPerformers: SiteRankingEntry[];
  bottomPerformers: SiteRankingEntry[];
  mostImproved: SiteRankingEntry[];
  trending: SiteRankingEntry[];
}

export interface SiteRankingEntry {
  rank: number;
  siteId: string;
  siteName: string;
  siteNumber: string;
  country: string;
  performanceScore: number;
  enrollmentRate: number;
  queryRate: number;
  trend: PerformanceTrend;
  changeFromLast: number;
}

export interface RiskSummaryData {
  overallScore: number;
  overallLevel: RiskLevel;
  categoryBreakdown: {
    category: RiskCategory;
    score: number;
    level: RiskLevel;
    count: number;
  }[];
  topRisks: {
    id: string;
    name: string;
    category: RiskCategory;
    level: RiskLevel;
    trend: PerformanceTrend;
  }[];
  recentWarnings: {
    id: string;
    name: string;
    severity: string;
    detectedDate: string;
  }[];
}

export interface MilestoneTimelineData {
  milestones: {
    id: string;
    name: string;
    category: MilestoneCategory;
    plannedDate: string;
    forecastDate: string;
    actualDate?: string;
    status: MilestoneStatus;
    isCriticalPath: boolean;
    varianceDays: number;
  }[];
  criticalPathStatus: {
    totalMilestones: number;
    completed: number;
    atRisk: number;
    delayed: number;
    projectedEndDate: string;
    varianceFromPlan: number;
  };
}

export interface StudyIntelAlert {
  id: string;
  type: 'enrollment' | 'site' | 'risk' | 'milestone' | 'data-quality';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  actionRequired: boolean;
  suggestedAction?: string;
}

export interface QuickAction {
  id: string;
  type: 'investigate' | 'intervene' | 'monitor' | 'report';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  targetEntity?: string;
  targetEntityId?: string;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type StudyIntelView =
  | 'dashboard'
  | 'enrollment-forecast'
  | 'site-performance'
  | 'site-detail'
  | 'milestones'
  | 'risk-profile'
  | 'early-warnings'
  | 'benchmarking'
  | 'analytics';

export interface StudyIntelFilters {
  regions?: string[];
  countries?: string[];
  performanceTier?: PerformanceTier[];
  riskLevel?: RiskLevel[];
  milestoneStatus?: MilestoneStatus[];
  dateRange?: { start: string; end: string };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PERFORMANCE_TIER_LABELS: Record<PerformanceTier, string> = {
  'top': 'Top Performer',
  'above-average': 'Above Average',
  'average': 'Average',
  'below-average': 'Below Average',
  'underperforming': 'Underperforming',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'critical': 'Critical',
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'at-risk': 'At Risk',
  'delayed': 'Delayed',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isHighRisk(level: RiskLevel): boolean {
  return level === 'high' || level === 'critical';
}

export function isMilestoneOnTrack(status: MilestoneStatus): boolean {
  return status === 'completed' || status === 'in-progress' || status === 'not-started';
}

export function calculatePercentile(value: number, distribution: number[]): number {
  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}

export function getPerformanceTier(score: number): PerformanceTier {
  if (score >= 90) return 'top';
  if (score >= 75) return 'above-average';
  if (score >= 50) return 'average';
  if (score >= 25) return 'below-average';
  return 'underperforming';
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
