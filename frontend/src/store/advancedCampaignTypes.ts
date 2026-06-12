
import type { HAQDiscipline, HAQSource } from '@/types/haq'
import type { 
  CampaignPhase, ResponseCampaign, GeneratedDraft,
  ConsistencyIssue, CampaignQualityMetrics
} from './responseCampaignTypes'
import type { 
  RegulatoryAgency, CampaignCollaborator, ResponseVersion,
  SchedulePrediction, QuestionPrediction
} from './campaignEnhancementTypes'

// ============================================================================
// TYPES: 1. Real-Time Collaboration
// ============================================================================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

export interface CollaborationSession {
  id: string
  campaignId: string
  startedAt: string
  endedAt?: string
  hostUserId: string
  participantIds: string[]
  status: 'active' | 'paused' | 'ended'
  settings: CollaborationSessionSettings
}

export interface CollaborationSessionSettings {
  allowConcurrentEdits: boolean
  lockOnEdit: boolean
  autoSaveInterval: number // seconds
  presenceTimeout: number // seconds
  conflictResolution: 'last-write-wins' | 'merge' | 'prompt'
}

export interface UserPresence {
  userId: string
  userName: string
  avatar?: string
  color: string
  status: 'active' | 'idle' | 'away'
  lastActiveAt: string
  currentLocation?: PresenceLocation
  cursorPosition?: CursorPosition
  isTyping: boolean
  selectedText?: string
}

export interface PresenceLocation {
  type: 'question' | 'draft' | 'review' | 'settings' | 'analytics'
  questionId?: string
  draftId?: string
  sectionId?: string
  tabId?: string
}

export interface CursorPosition {
  questionId: string
  draftId: string
  offset: number
  line: number
  column: number
}

export interface EditLock {
  id: string
  questionId: string
  draftId: string
  lockedBy: string
  lockedByName: string
  lockedAt: string
  expiresAt: string
  reason?: string
}

export interface LiveEdit {
  id: string
  sessionId: string
  userId: string
  userName: string
  questionId: string
  draftId: string
  timestamp: string
  operation: EditOperation
  applied: boolean
  conflictWith?: string
}

export type EditOperationType = 'insert' | 'delete' | 'replace' | 'format' | 'move'

export interface EditOperation {
  type: EditOperationType
  offset: number
  length?: number
  content?: string
  format?: TextFormat
  metadata?: Record<string, unknown>
}

export interface TextFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  highlight?: string
  fontSize?: number
  fontFamily?: string
}

export interface ConflictResolution {
  id: string
  editAId: string
  editBId: string
  conflictType: 'overlap' | 'concurrent' | 'semantic'
  resolution: 'accepted-a' | 'accepted-b' | 'merged' | 'rejected-both'
  resolvedBy?: string
  resolvedAt?: string
  mergedContent?: string
}

export interface LiveComment {
  id: string
  sessionId: string
  userId: string
  userName: string
  questionId: string
  draftId: string
  timestamp: string
  content: string
  selection?: {
    start: number
    end: number
    text: string
  }
  parentCommentId?: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  reactions: CommentReaction[]
}

export interface CommentReaction {
  userId: string
  emoji: string
  timestamp: string
}

export interface CollaborationEvent {
  id: string
  sessionId: string
  type: CollaborationEventType
  userId: string
  userName: string
  timestamp: string
  data: Record<string, unknown>
}

export type CollaborationEventType =
  | 'user-joined'
  | 'user-left'
  | 'edit-started'
  | 'edit-completed'
  | 'lock-acquired'
  | 'lock-released'
  | 'comment-added'
  | 'comment-resolved'
  | 'cursor-moved'
  | 'selection-changed'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'sync-completed'

// ============================================================================
// TYPES: 2. Smart Question Clustering
// ============================================================================

export interface QuestionClusterAnalysis {
  id: string
  campaignId: string
  analyzedAt: string
  totalQuestions: number
  clusters: SmartCluster[]
  unclusteredQuestions: string[]
  clusteringMethod: ClusteringMethod
  confidence: number
  recommendations: ClusteringRecommendation[]
}

export type ClusteringMethod = 
  | 'semantic-similarity'
  | 'topic-modeling'
  | 'discipline-based'
  | 'ctd-section'
  | 'dependency-graph'
  | 'hybrid'

export interface SmartCluster {
  id: string
  name: string
  description: string
  questionIds: string[]
  theme: ClusterTheme
  keywords: string[]
  discipline?: HAQDiscipline
  ctdSections: string[]
  
  // Clustering metrics
  cohesionScore: number
  separationScore: number
  silhouetteScore: number
  
  // Relationships
  relatedClusters: ClusterRelationship[]
  dependencies: ClusterDependency[]
  
  // Batch handling
  batchPriority: number
  estimatedBatchDuration: number // minutes
  suggestedAssignee?: string
  
  // Response strategy
  suggestedStrategy: ClusterStrategy
  sharedElements: SharedElementSuggestion[]
  consistencyRequirements: ClusterConsistencyRule[]
}

export interface ClusterTheme {
  primary: string
  secondary: string[]
  concepts: ThemeConcept[]
  regulatoryContext: string[]
}

export interface ThemeConcept {
  term: string
  weight: number
  relatedTerms: string[]
  definition?: string
}

export interface ClusterRelationship {
  clusterId: string
  clusterName: string
  relationshipType: 'similar' | 'complementary' | 'prerequisite' | 'dependent'
  strength: number
  reason: string
}

export interface ClusterDependency {
  dependentClusterId: string
  dependencyType: 'data' | 'conclusion' | 'reference' | 'approval'
  description: string
  blocking: boolean
}

export interface ClusterStrategy {
  approach: 'unified' | 'parallel' | 'sequential' | 'iterative'
  rationale: string
  expectedBenefits: string[]
  risks: string[]
  estimatedEfficiency: number // percentage improvement
}

export interface SharedElementSuggestion {
  elementType: 'background' | 'methodology' | 'data-summary' | 'conclusion' | 'reference'
  description: string
  content?: string
  applicableQuestions: string[]
  confidence: number
}

export interface ClusterConsistencyRule {
  id: string
  name: string
  description: string
  scope: 'intra-cluster' | 'inter-cluster'
  checkType: 'terminology' | 'data' | 'conclusion' | 'format'
  severity: 'error' | 'warning'
}

export interface ClusteringRecommendation {
  id: string
  type: 'merge' | 'split' | 'reorder' | 'reassign' | 'parallelize'
  description: string
  affectedClusters: string[]
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
  priority: number
}

export interface ClusterBatchJob {
  id: string
  clusterId: string
  clusterName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  questionIds: string[]
  progress: number
  results: BatchQuestionResult[]
  errors: string[]
}

export interface BatchQuestionResult {
  questionId: string
  success: boolean
  draftId?: string
  qualityScore?: number
  processingTime: number
  sharedElementsApplied: string[]
}

// ============================================================================
// TYPES: 3. Regulatory Intelligence Feed
// ============================================================================

export interface RegulatoryIntelligenceFeed {
  id: string
  lastUpdated: string
  sources: IntelligenceSource[]
  updates: RegulatoryUpdate[]
  alerts: RegulatoryAlert[]
  guidance: GuidanceDocument[]
  trends: RegulatoryTrend[]
  subscriptions: FeedSubscription[]
}

export interface IntelligenceSource {
  id: string
  name: string
  agency: RegulatoryAgency
  type: 'official' | 'news' | 'publication' | 'conference'
  url: string
  reliability: number
  lastPolled: string
  pollFrequency: 'hourly' | 'daily' | 'weekly'
  status: 'active' | 'inactive' | 'error'
}

export interface RegulatoryUpdate {
  id: string
  sourceId: string
  agency: RegulatoryAgency
  publishedAt: string
  receivedAt: string
  title: string
  summary: string
  content: string
  url?: string
  type: UpdateType
  category: UpdateCategory
  tags: string[]
  relevanceScore: number
  impactAssessment: ImpactAssessment
  affectedDisciplines: HAQDiscipline[]
  affectedCTDSections: string[]
  relatedCampaigns: string[]
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export type UpdateType = 
  | 'guidance-new'
  | 'guidance-revised'
  | 'guidance-withdrawn'
  | 'policy-change'
  | 'form-update'
  | 'fee-change'
  | 'process-change'
  | 'personnel-change'
  | 'deadline-extension'
  | 'enforcement-action'

export type UpdateCategory =
  | 'clinical'
  | 'cmc'
  | 'nonclinical'
  | 'labeling'
  | 'post-market'
  | 'submission-process'
  | 'general'

export interface ImpactAssessment {
  severity: 'critical' | 'high' | 'medium' | 'low'
  urgency: 'immediate' | 'short-term' | 'medium-term' | 'long-term'
  affectedAreas: string[]
  requiredActions: RequiredAction[]
  effectiveDate?: string
  complianceDeadline?: string
}

export interface RequiredAction {
  id: string
  description: string
  priority: number
  deadline?: string
  assignedTo?: string
  status: 'pending' | 'in-progress' | 'completed' | 'not-applicable'
  completedAt?: string
  notes?: string
}

export interface RegulatoryAlert {
  id: string
  updateId: string
  createdAt: string
  alertType: 'urgent' | 'important' | 'informational'
  title: string
  message: string
  actions: AlertAction[]
  dismissed: boolean
  dismissedBy?: string
  dismissedAt?: string
  campaignIds: string[]
}

export interface AlertAction {
  id: string
  label: string
  type: 'link' | 'action' | 'dismiss'
  url?: string
  actionId?: string
}

export interface GuidanceDocument {
  id: string
  agency: RegulatoryAgency
  title: string
  documentNumber: string
  version: string
  publishedAt: string
  effectiveDate?: string
  status: 'draft' | 'final' | 'revised' | 'withdrawn'
  url: string
  summary: string
  keyPoints: string[]
  affectedAreas: string[]
  relatedDocuments: string[]
  changeLog: GuidanceChange[]
}

export interface GuidanceChange {
  id: string
  version: string
  date: string
  changeType: 'new' | 'revision' | 'clarification' | 'correction'
  summary: string
  details: string[]
  significance: 'major' | 'minor' | 'editorial'
}

export interface RegulatoryTrend {
  id: string
  name: string
  description: string
  agencies: RegulatoryAgency[]
  disciplines: HAQDiscipline[]
  direction: 'increasing' | 'decreasing' | 'stable' | 'emerging'
  confidence: number
  timeframe: string
  indicators: TrendIndicator[]
  implications: string[]
  recommendations: string[]
}

export interface TrendIndicator {
  metric: string
  currentValue: number
  previousValue: number
  changePercent: number
  source: string
}

export interface FeedSubscription {
  id: string
  userId: string
  agencies: RegulatoryAgency[]
  categories: UpdateCategory[]
  disciplines: HAQDiscipline[]
  keywords: string[]
  notificationSettings: NotificationSettings
  createdAt: string
  lastNotified?: string
}

export interface NotificationSettings {
  email: boolean
  inApp: boolean
  urgentOnly: boolean
  digestFrequency: 'immediate' | 'daily' | 'weekly'
  quietHoursStart?: string
  quietHoursEnd?: string
}

// ============================================================================
// TYPES: 4. Response Quality Coach
// ============================================================================

export interface QualityCoachSession {
  id: string
  questionId: string
  draftId: string
  userId: string
  startedAt: string
  endedAt?: string
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  mode: CoachingMode
  currentStep: number
  totalSteps: number
  progress: CoachingProgress
  insights: CoachingInsight[]
  suggestions: CoachingSuggestion[]
  improvements: ImprovementRecord[]
  metrics: CoachingMetrics
}

export type CoachingMode = 
  | 'guided'      // Step-by-step walkthrough
  | 'interactive' // Real-time suggestions
  | 'review'      // Post-draft analysis
  | 'focused'     // Target specific issues

export interface CoachingProgress {
  structureComplete: boolean
  contentComplete: boolean
  evidenceComplete: boolean
  complianceComplete: boolean
  overallProgress: number
  estimatedTimeRemaining: number // minutes
}

export interface CoachingInsight {
  id: string
  category: InsightCategory
  severity: 'critical' | 'important' | 'suggestion' | 'tip'
  title: string
  description: string
  location?: ContentLocation
  examples?: InsightExample[]
  learnMoreUrl?: string
  dismissed: boolean
  appliedAt?: string
}

export type InsightCategory =
  | 'structure'
  | 'clarity'
  | 'completeness'
  | 'evidence'
  | 'consistency'
  | 'compliance'
  | 'tone'
  | 'formatting'

export interface ContentLocation {
  sectionId?: string
  sectionName?: string
  startOffset: number
  endOffset: number
  lineNumber?: number
  excerpt: string
}

export interface InsightExample {
  type: 'good' | 'bad'
  content: string
  explanation: string
}

export interface CoachingSuggestion {
  id: string
  insightId: string
  type: SuggestionType
  priority: number
  title: string
  description: string
  originalText?: string
  suggestedText?: string
  rationale: string
  impact: ImpactEstimate
  status: 'pending' | 'applied' | 'rejected' | 'modified'
  appliedAt?: string
  appliedBy?: string
  modification?: string
}

export type SuggestionType =
  | 'rewrite'
  | 'add'
  | 'remove'
  | 'restructure'
  | 'clarify'
  | 'reference'
  | 'format'

export interface ImpactEstimate {
  qualityDelta: number
  affectedDimensions: string[]
  confidence: number
  effort: 'minimal' | 'moderate' | 'significant'
}

export interface ImprovementRecord {
  id: string
  suggestionId: string
  timestamp: string
  action: 'applied' | 'rejected' | 'modified'
  beforeContent: string
  afterContent: string
  qualityBefore: number
  qualityAfter: number
  notes?: string
}

export interface CoachingMetrics {
  sessionDuration: number // minutes
  suggestionsGenerated: number
  suggestionsApplied: number
  suggestionsRejected: number
  qualityImprovement: number
  dimensionImprovements: Record<string, number>
  commonIssues: IssueFrequency[]
}

export interface IssueFrequency {
  category: InsightCategory
  count: number
  resolved: number
  avgTimeToResolve: number // minutes
}

export interface CoachingTemplate {
  id: string
  name: string
  description: string
  discipline?: HAQDiscipline
  questionType?: string
  steps: CoachingStep[]
  checkpoints: QualityCheckpoint[]
  targetScore: number
}

export interface CoachingStep {
  id: string
  order: number
  title: string
  description: string
  focusArea: InsightCategory
  prompts: string[]
  requiredElements: string[]
  validationRules: StepValidation[]
}

export interface QualityCheckpoint {
  id: string
  name: string
  description: string
  dimensions: string[]
  minScore: number
  blocking: boolean
}

export interface StepValidation {
  id: string
  type: 'content' | 'structure' | 'reference' | 'format'
  rule: string
  errorMessage: string
  autoFix: boolean
}

// ============================================================================
// TYPES: 5. Cross-Campaign Analytics
// ============================================================================

export interface CrossCampaignAnalytics {
  id: string
  generatedAt: string
  timeRange: AnalyticsTimeRange
  campaigns: CampaignSummary[]
  portfolioMetrics: PortfolioMetrics
  trends: AnalyticsTrend[]
  comparisons: CampaignComparison[]
  insights: AnalyticsInsight[]
  benchmarks: PerformanceBenchmark[]
  forecasts: PerformanceForecast[]
}

export interface AnalyticsTimeRange {
  start: string
  end: string
  granularity: 'day' | 'week' | 'month' | 'quarter'
}

export interface CampaignSummary {
  campaignId: string
  campaignName: string
  status: string
  createdAt: string
  completedAt?: string
  questionCount: number
  completedCount: number
  avgQualityScore: number
  consistencyScore: number
  onTimeDelivery: boolean
  teamSize: number
  disciplines: HAQDiscipline[]
  agencies: RegulatoryAgency[]
}

export interface PortfolioMetrics {
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  totalQuestions: number
  questionsCompleted: number
  avgCompletionTime: number // days
  avgQualityScore: number
  qualityTrend: TrendDirection
  consistencyRate: number
  onTimeRate: number
  resourceUtilization: ResourceUtilization
  disciplineBreakdown: DisciplineBreakdown[]
  agencyBreakdown: AgencyBreakdown[]
}

export type TrendDirection = 'improving' | 'stable' | 'declining'

export interface ResourceUtilization {
  totalCapacity: number // person-hours
  usedCapacity: number
  utilization: number
  overloadedResources: string[]
  underutilizedResources: string[]
}

export interface DisciplineBreakdown {
  discipline: HAQDiscipline
  questionCount: number
  avgQualityScore: number
  avgCompletionTime: number
  consistencyIssues: number
  trend: TrendDirection
}

export interface AgencyBreakdown {
  agency: RegulatoryAgency
  campaignCount: number
  questionCount: number
  avgQualityScore: number
  formatComplianceRate: number
  submissionSuccessRate: number
}

export interface AnalyticsTrend {
  id: string
  metric: TrendMetric
  period: string
  dataPoints: TrendDataPoint[]
  trendLine: TrendLineData
  forecast?: ForecastData
  anomalies: AnomalyDetection[]
}

export type TrendMetric =
  | 'quality-score'
  | 'completion-time'
  | 'consistency-rate'
  | 'on-time-delivery'
  | 'questions-per-campaign'
  | 'refinement-cycles'
  | 'team-velocity'

export interface TrendDataPoint {
  timestamp: string
  value: number
  campaignId?: string
  notes?: string
}

export interface TrendLineData {
  slope: number
  intercept: number
  r2: number
  direction: TrendDirection
  significance: number
}

export interface ForecastData {
  predictedValues: PredictedValue[]
  confidenceInterval: {
    lower: number[]
    upper: number[]
  }
  method: string
}

export interface PredictedValue {
  timestamp: string
  value: number
  confidence: number
}

export interface AnomalyDetection {
  timestamp: string
  value: number
  expectedValue: number
  deviation: number
  severity: 'minor' | 'moderate' | 'severe'
  possibleCauses: string[]
}

export interface CampaignComparison {
  id: string
  campaignAId: string
  campaignBId: string
  comparedAt: string
  dimensions: ComparisonDimension[]
  winner: 'a' | 'b' | 'tie'
  insights: string[]
  learnings: ComparisonLearning[]
}

export interface ComparisonDimension {
  name: string
  valueA: number
  valueB: number
  difference: number
  percentDiff: number
  winner: 'a' | 'b' | 'tie'
  significance: 'high' | 'medium' | 'low'
}

export interface ComparisonLearning {
  id: string
  category: string
  finding: string
  recommendation: string
  applicability: 'universal' | 'conditional' | 'specific'
  conditions?: string[]
}

export interface AnalyticsInsight {
  id: string
  type: InsightType
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  evidence: string[]
  recommendation: string
  expectedImpact: string
  affectedCampaigns: string[]
  actionable: boolean
  actions?: InsightAction[]
}

export type InsightType =
  | 'performance'
  | 'efficiency'
  | 'quality'
  | 'resource'
  | 'risk'
  | 'opportunity'

export interface InsightAction {
  id: string
  description: string
  effort: 'low' | 'medium' | 'high'
  expectedOutcome: string
  assignedTo?: string
  dueDate?: string
  status: 'pending' | 'in-progress' | 'completed'
}

export interface PerformanceBenchmark {
  id: string
  name: string
  category: BenchmarkCategory
  metric: TrendMetric
  value: number
  source: 'internal' | 'industry' | 'best-practice'
  percentile?: number
  lastUpdated: string
  applicableTo: {
    disciplines?: HAQDiscipline[]
    agencies?: RegulatoryAgency[]
    campaignTypes?: string[]
  }
}

export type BenchmarkCategory =
  | 'speed'
  | 'quality'
  | 'consistency'
  | 'efficiency'
  | 'compliance'

export interface PerformanceForecast {
  id: string
  campaignId?: string // null for portfolio-wide
  metric: TrendMetric
  generatedAt: string
  horizon: number // days
  predictions: ForecastPrediction[]
  confidence: number
  factors: ForecastFactor[]
  scenarios: ForecastScenario[]
}

export interface ForecastPrediction {
  date: string
  value: number
  lowerBound: number
  upperBound: number
}

export interface ForecastFactor {
  name: string
  impact: number
  direction: 'positive' | 'negative'
  controllable: boolean
}

export interface ForecastScenario {
  name: string
  description: string
  probability: number
  predictions: ForecastPrediction[]
  triggers: string[]
}

// ============================================================================
// TYPES: Advanced Campaign State
// ============================================================================

export interface AdvancedCampaignState {
  // Real-Time Collaboration
  collaborationSessions: Record<string, CollaborationSession>
  userPresence: Record<string, UserPresence[]> // sessionId -> users
  editLocks: Record<string, EditLock[]> // campaignId -> locks
  liveEdits: Record<string, LiveEdit[]> // sessionId -> edits
  liveComments: Record<string, LiveComment[]> // sessionId -> comments
  collaborationEvents: CollaborationEvent[]
  connectionStatus: ConnectionStatus
  
  // Smart Question Clustering
  clusterAnalyses: Record<string, QuestionClusterAnalysis>
  activeClusters: Record<string, SmartCluster[]>
  clusterBatchJobs: Record<string, ClusterBatchJob[]>
  
  // Regulatory Intelligence Feed
  intelligenceFeeds: Record<string, RegulatoryIntelligenceFeed>
  regulatoryUpdates: RegulatoryUpdate[]
  regulatoryAlerts: RegulatoryAlert[]
  guidanceDocuments: GuidanceDocument[]
  feedSubscriptions: FeedSubscription[]
  
  // Response Quality Coach
  coachingSessions: Record<string, QualityCoachSession>
  coachingTemplates: Record<string, CoachingTemplate>
  coachingHistory: Record<string, CoachingMetrics[]> // questionId -> history
  
  // Cross-Campaign Analytics
  crossCampaignAnalytics: CrossCampaignAnalytics | null
  campaignSummaries: Record<string, CampaignSummary>
  portfolioMetrics: PortfolioMetrics | null
  analyticsTrends: AnalyticsTrend[]
  performanceBenchmarks: PerformanceBenchmark[]
  performanceForecasts: PerformanceForecast[]
  analyticsInsights: AnalyticsInsight[]
}
