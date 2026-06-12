
/**
 * Study Intelligence - Store Types
 * 
 * RE-EXPORTS from @/domains/study-intel (single source of truth)
 * Store-specific types (State, Actions) defined locally.
 * 
 * @module store/studyIntelTypes
 * @version 0.27.44
 */

// =============================================================================
// RE-EXPORTS FROM DOMAIN (Single Source of Truth)
// =============================================================================

export {
  // Forecast types
  type ForecastModel,
  type ForecastConfidence,
  type EnrollmentForecastConfig,
  type ForecastModelParameters,
  type EnrollmentForecastResult,
  type ForecastDataPoint,
  type ResidualAnalysis,
  type ForecastScenario,
  type ForecastRisk,
  
  // Site performance types
  type PerformanceTier,
  type PerformanceTrend,
  type SitePerformanceAnalytics,
  type SiteEnrollmentMetrics,
  type SiteDataQualityMetrics,
  type SiteComplianceMetrics,
  type SiteOperationalMetrics,
  type PerformanceHistoryPoint,
  type MetricComparison,
  type SiteRecommendation,
  
  // Milestone types
  type MilestoneStatus,
  type MilestoneCategory,
  type StudyMilestoneTracker,
  type TrackedMilestone,
  type MilestoneDependency,
  type CompletionCriterion,
  type MilestoneDateChange,
  type CriticalPathAnalysis,
  type CriticalPathBottleneck,
  
  // Risk types
  type RiskLevel,
  type RiskCategory,
  type StudyRiskProfile,
  type RiskCategoryScore,
  type RiskIndicator,
  type RiskThreshold,
  type EarlyWarningSignal,
  type RiskHeatmapCell,
  type RiskHistoryPoint,
  type MitigationStatus,
  type MitigationPlan,
  type MitigationAction,
  
  // Benchmark types
  type BenchmarkSource,
  type ComparisonDimension,
  type CrossStudyBenchmark,
  type ComparatorStudy,
  type DimensionBenchmark,
  type BenchmarkInsight,
  type BenchmarkRecommendation,
  type BestPracticeIdentification,
  
  // Dashboard types
  type StudyIntelDashboard,
  type KPISummary,
  type EnrollmentChartData,
  type SitePerformanceMapData,
  type SiteRankingData,
  type SiteRankingEntry,
  type RiskSummaryData,
  type MilestoneTimelineData,
  type StudyIntelAlert,
  type QuickAction,
  
  // UI types
  type StudyIntelView,
  type StudyIntelFilters,
  
  // Constants
  PERFORMANCE_TIER_LABELS,
  RISK_LEVEL_LABELS,
  MILESTONE_STATUS_LABELS,
  
  // Utility functions
  isHighRisk,
  isMilestoneOnTrack,
  calculatePercentile,
  getPerformanceTier,
  getRiskLevel,
} from '@/domains/study-intel/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (Local Definitions)
// =============================================================================

import type {
  EnrollmentForecastConfig,
  EnrollmentForecastResult,
  SitePerformanceAnalytics,
  StudyMilestoneTracker,
  TrackedMilestone,
  StudyRiskProfile,
  RiskIndicator,
  EarlyWarningSignal,
  MitigationPlan,
  CrossStudyBenchmark,
  ComparatorStudy,
  ForecastScenario,
  SiteRecommendation,
  StudyIntelDashboard,
  StudyIntelView,
  StudyIntelFilters,
  SiteRankingData,
  BenchmarkSource,
} from '@/domains/study-intel/contracts';

export interface StudyIntelState {
  // Forecast configurations
  forecastConfigs: Record<string, EnrollmentForecastConfig>;
  forecastConfigsByStudy: Record<string, string>;
  
  // Forecast results
  forecastResults: Record<string, EnrollmentForecastResult>;
  latestForecastByStudy: Record<string, string>;
  
  // Site performance
  siteAnalytics: Record<string, SitePerformanceAnalytics>;
  siteAnalyticsByStudy: Record<string, string[]>;
  
  // Milestone tracking
  milestoneTrackers: Record<string, StudyMilestoneTracker>;
  trackersByStudy: Record<string, string>;
  
  // Risk profiles
  riskProfiles: Record<string, StudyRiskProfile>;
  latestRiskByStudy: Record<string, string>;
  
  // Benchmarks
  benchmarks: Record<string, CrossStudyBenchmark>;
  latestBenchmarkByStudy: Record<string, string>;
  
  // Dashboards
  dashboardData: Record<string, StudyIntelDashboard>;
  
  // UI state
  selectedStudyId: string | null;
  selectedSiteId: string | null;
  activeView: StudyIntelView;
  filters: StudyIntelFilters;
  isLoading: boolean;
  lastError: string | null;
}

export interface StudyIntelActions {
  // Forecast management
  createForecastConfig(config: Partial<EnrollmentForecastConfig>): EnrollmentForecastConfig;
  updateForecastConfig(configId: string, updates: Partial<EnrollmentForecastConfig>): void;
  runEnrollmentForecast(studyId: string, userId: string): EnrollmentForecastResult;
  runScenarioAnalysis(studyId: string, scenarios: Partial<ForecastScenario>[]): ForecastScenario[];
  
  // Site analytics
  calculateSitePerformance(studyId: string, siteId: string): SitePerformanceAnalytics;
  calculateAllSitePerformance(studyId: string): SitePerformanceAnalytics[];
  rankSites(studyId: string): SiteRankingData;
  generateSiteRecommendations(studyId: string, siteId: string): SiteRecommendation[];
  
  // Milestone tracking
  createMilestoneTracker(studyId: string): StudyMilestoneTracker;
  addMilestone(trackerId: string, milestone: Partial<TrackedMilestone>): TrackedMilestone;
  updateMilestone(trackerId: string, milestoneId: string, updates: Partial<TrackedMilestone>): void;
  completeMilestone(trackerId: string, milestoneId: string, actualDate: string, evidence?: string): void;
  updateMilestoneDate(trackerId: string, milestoneId: string, newDate: string, reason: string, userId: string): void;
  runCriticalPathAnalysis(trackerId: string): import('@/domains/study-intel/contracts').CriticalPathAnalysis;
  
  // Risk management
  assessStudyRisk(studyId: string, userId: string): StudyRiskProfile;
  updateRiskIndicator(profileId: string, indicatorId: string, updates: Partial<RiskIndicator>): void;
  acknowledgeWarning(profileId: string, warningId: string, userId: string): void;
  resolveWarning(profileId: string, warningId: string, resolution: string, userId: string): void;
  createMitigationPlan(profileId: string, plan: Partial<MitigationPlan>): MitigationPlan;
  updateMitigationPlan(profileId: string, planId: string, updates: Partial<MitigationPlan>): void;
  
  // Benchmarking
  runBenchmarkAnalysis(studyId: string, source: BenchmarkSource, userId: string): CrossStudyBenchmark;
  addComparatorStudy(benchmarkId: string, study: Partial<ComparatorStudy>): void;
  removeComparatorStudy(benchmarkId: string, studyId: string): void;
  
  // Dashboard
  refreshDashboard(studyId: string): StudyIntelDashboard;
  dismissAlert(studyId: string, alertId: string): void;
  acknowledgeAlert(studyId: string, alertId: string, userId: string): void;
  
  // UI actions
  setSelectedStudy(studyId: string | null): void;
  setSelectedSite(siteId: string | null): void;
  setActiveView(view: StudyIntelView): void;
  setFilters(filters: Partial<StudyIntelFilters>): void;
  clearFilters(): void;
  
  // Data loading
  loadMockData(): void;
  syncFromCTMS(studyId: string): Promise<void>;
  syncFromEDC(studyId: string): Promise<void>;
}
