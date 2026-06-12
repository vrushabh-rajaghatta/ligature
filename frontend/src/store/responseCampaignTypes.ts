
import type { HAQuestion, HAQDiscipline, HAQSource } from '@/types/haq'
import type { ResponseElement } from './useHAQAnalytics'
import type { 
  GeneratedDraft, 
  DraftGenerationConfig,
  QualityCheckpoint,
  RefinementSuggestion 
} from './responseIntelligenceTypes'
import type { CompletenessScore, GapAnalysis } from './useReviewerSimulation'

// Re-export imported types for convenience
export type { GeneratedDraft, DraftGenerationConfig, QualityCheckpoint, RefinementSuggestion }

// ============================================================================
// TYPES: Campaign Configuration
// ============================================================================

export interface CampaignConfig {
  name: string
  description?: string
  questionIds: string[]
  strategy: CampaignStrategy
  consistencyRules: ConsistencyRule[]
  qualityTargets: CampaignQualityTargets
  sharedElements: SharedElementConfig[]
  submissionPackaging: SubmissionPackagingConfig
  deadline?: string
  assignedTo?: string[]
}

export type CampaignStrategy = 
  | 'sequential'      // Generate one at a time, learning from each
  | 'parallel'        // Generate all at once
  | 'prioritized'     // Generate critical questions first
  | 'grouped'         // Group by discipline/section, generate together

export interface ConsistencyRule {
  id: string
  name: string
  type: 'terminology' | 'data-reference' | 'conclusion' | 'formatting' | 'cross-reference'
  description: string
  scope: 'all' | 'discipline' | 'section' | 'custom'
  scopeFilter?: {
    disciplines?: HAQDiscipline[]
    sections?: string[]
    questionIds?: string[]
  }
  checkFunction: string // Name of validation function
  autoFix: boolean
  severity: 'error' | 'warning' | 'info'
}

export interface CampaignQualityTargets {
  minAverageScore: number
  minIndividualScore: number
  maxScoreVariance: number
  requiredConsistencyPass: boolean
  acceptanceThreshold: number
}

export interface SharedElementConfig {
  elementType: ResponseElement
  sourceQuestionId?: string
  content?: string
  description: string
  appliesTo: 'all' | 'discipline' | 'custom'
  filter?: {
    disciplines?: HAQDiscipline[]
    questionIds?: string[]
  }
  variableMapping?: Record<string, string>
}

export interface SubmissionPackagingConfig {
  generateCoverLetter: boolean
  includeResponseMatrix: boolean
  organizationMethod: 'by-question' | 'by-discipline' | 'by-section'
  outputFormat: 'word' | 'pdf' | 'both'
  includeAuditTrail: boolean
  ctdPlacement: boolean
}

// ============================================================================
// TYPES: Campaign
// ============================================================================

export interface ResponseCampaign {
  id: string
  config: CampaignConfig
  status: CampaignStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  
  // Question tracking
  questionProgress: Record<string, QuestionCampaignProgress>
  
  // Drafts
  drafts: Record<string, GeneratedDraft>
  activeDraftIds: Record<string, string> // questionId -> draftId
  
  // Quality
  qualityMetrics: CampaignQualityMetrics
  consistencyResults: ConsistencyCheckResult[]
  
  // Shared elements
  sharedElementInstances: SharedElementInstance[]
  
  // Submission
  submissionPackage?: CampaignSubmissionPackage
  
  // Execution
  executionPlan?: CampaignExecutionPlan
  currentPhase: CampaignPhase
  completedPhases: CampaignPhase[]
}

export type CampaignStatus = 
  | 'draft'           // Initial creation
  | 'configuring'     // Setting up rules and elements
  | 'generating'      // Bulk generation in progress
  | 'reviewing'       // Drafts ready for review
  | 'refining'        // Iterative refinement phase
  | 'consistency-check' // Running consistency validation
  | 'packaging'       // Creating submission package
  | 'ready'           // Ready for submission
  | 'submitted'       // Submitted to agency
  | 'cancelled'

export type CampaignPhase = 
  | 'initialization'
  | 'element-collection'
  | 'draft-generation'
  | 'quality-assessment'
  | 'consistency-validation'
  | 'refinement'
  | 'final-review'
  | 'packaging'
  | 'complete'

// ============================================================================
// TYPES: Question Progress
// ============================================================================

export interface QuestionCampaignProgress {
  questionId: string
  status: QuestionCampaignStatus
  draftIds: string[]
  selectedDraftId?: string
  generationAttempts: number
  lastGeneratedAt?: string
  qualityScore?: number
  gapAnalysis?: GapAnalysis
  consistencyIssues: ConsistencyIssue[]
  refinementCount: number
  sharedElementsApplied: string[]
  approvedAt?: string
  approvedBy?: string
  notes?: string
}

export type QuestionCampaignStatus = 
  | 'pending'
  | 'generating'
  | 'generated'
  | 'reviewing'
  | 'refining'
  | 'approved'
  | 'failed'

// ============================================================================
// TYPES: Consistency Checking
// ============================================================================

export interface ConsistencyCheckResult {
  id: string
  ruleId: string
  ruleName: string
  timestamp: string
  passed: boolean
  issues: ConsistencyIssue[]
  affectedQuestions: string[]
  autoFixApplied: boolean
}

export interface ConsistencyIssue {
  id: string
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  questionIds: string[]
  description: string
  location?: {
    questionId: string
    sectionName?: string
    lineNumber?: number
    excerpt?: string
  }
  suggestedFix?: string
  canAutoFix: boolean
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

export interface TerminologyInconsistency extends ConsistencyIssue {
  type: 'terminology'
  term: string
  variants: Array<{
    questionId: string
    usedTerm: string
    count: number
  }>
  recommendedTerm: string
}

export interface DataReferenceInconsistency extends ConsistencyIssue {
  type: 'data-reference'
  dataPoint: string
  references: Array<{
    questionId: string
    value: string
    source?: string
  }>
}

export interface CrossReferenceIssue extends ConsistencyIssue {
  type: 'cross-reference'
  sourceQuestionId: string
  targetQuestionId: string
  referenceType: 'cites' | 'supports' | 'conflicts'
  details: string
}

// ============================================================================
// TYPES: Shared Elements
// ============================================================================

export interface SharedElementInstance {
  id: string
  configId: string
  elementType: ResponseElement
  content: string
  renderedContent: string // With variables filled
  sourceQuestionId?: string
  appliedToQuestions: string[]
  createdAt: string
  lastUsedAt: string
  usageCount: number
  variables: Record<string, string>
}

export interface ElementReuseOpportunity {
  id: string
  elementType: ResponseElement
  sourceQuestionId: string
  sourceContent: string
  targetQuestionIds: string[]
  similarity: number
  confidence: number
  suggestedAdaptations: string[]
  estimatedTimeSavings: number // minutes
}

// ============================================================================
// TYPES: Quality Metrics
// ============================================================================

export interface CampaignQualityMetrics {
  timestamp: string
  overallScore: number
  averageScore: number
  minScore: number
  maxScore: number
  scoreVariance: number
  scoreDistribution: ScoreDistribution
  byQuestion: Record<string, number>
  byDiscipline: Record<HAQDiscipline, DisciplineMetrics>
  consistencyScore: number
  completenessScore: number
  trendsOverTime: QualityTrend[]
  targetsMet: boolean
  targetsDetail: QualityTargetStatus[]
}

export interface ScoreDistribution {
  excellent: number  // 90+
  good: number       // 80-89
  acceptable: number // 70-79
  needsWork: number  // 60-69
  poor: number       // <60
}

export interface DisciplineMetrics {
  questionCount: number
  averageScore: number
  completedCount: number
  pendingCount: number
  consistencyIssueCount: number
}

export interface QualityTrend {
  timestamp: string
  phase: CampaignPhase
  averageScore: number
  questionsCompleted: number
  consistencyIssueCount: number
}

export interface QualityTargetStatus {
  target: string
  targetValue: number
  currentValue: number
  met: boolean
  gap: number
  recommendation?: string
}

// ============================================================================
// TYPES: Execution Plan
// ============================================================================

export interface CampaignExecutionPlan {
  id: string
  campaignId: string
  createdAt: string
  estimatedDuration: number // minutes
  phases: ExecutionPhase[]
  currentPhaseIndex: number
  dependencies: PhaseDependency[]
}

export interface ExecutionPhase {
  id: string
  name: string
  type: CampaignPhase
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  questionIds: string[]
  startedAt?: string
  completedAt?: string
  estimatedDuration: number
  actualDuration?: number
  progress: number
  tasks: ExecutionTask[]
}

export interface ExecutionTask {
  id: string
  name: string
  type: 'generate' | 'analyze' | 'validate' | 'refine' | 'package'
  questionId?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  output?: unknown
  error?: string
}

export interface PhaseDependency {
  phaseId: string
  dependsOn: string[]
  type: 'all-complete' | 'any-complete' | 'threshold'
  threshold?: number
}

// ============================================================================
// TYPES: Submission Package
// ============================================================================

export interface CampaignSubmissionPackage {
  id: string
  campaignId: string
  createdAt: string
  status: 'generating' | 'ready' | 'exported'
  
  // Cover letter
  coverLetter?: {
    content: string
    generatedAt: string
    approved: boolean
  }
  
  // Response matrix
  responseMatrix?: ResponseMatrixEntry[]
  
  // Individual responses
  responses: PackagedResponse[]
  
  // Audit trail
  auditTrail?: CampaignAuditEntry[]
  
  // Export info
  exportedAt?: string
  exportFormat?: 'word' | 'pdf' | 'both'
  downloadUrls?: string[]
}

export interface ResponseMatrixEntry {
  questionId: string
  questionNumber: string
  discipline: HAQDiscipline
  ctdSection?: string
  questionSummary: string
  responseLocation: string
  status: 'included' | 'pending' | 'excluded'
  notes?: string
}

export interface PackagedResponse {
  questionId: string
  questionNumber: string
  discipline: HAQDiscipline
  ctdSection?: string
  questionText: string
  responseText: string
  qualityScore: number
  attachments?: string[]
  order: number
}

export interface CampaignAuditEntry {
  id: string
  timestamp: string
  action: string
  actor?: string
  details: string
  questionId?: string
  previousValue?: string
  newValue?: string
}

// ============================================================================
// TYPES: Bulk Operations
// ============================================================================

export interface BulkGenerationConfig {
  campaignId: string
  questionIds: string[]
  generationConfig: Partial<DraftGenerationConfig>
  parallelism: number // Max concurrent generations
  retryOnFailure: boolean
  maxRetries: number
  applySharedElements: boolean
  runConsistencyCheck: boolean
}

export interface BulkGenerationResult {
  campaignId: string
  startedAt: string
  completedAt: string
  totalQuestions: number
  successCount: number
  failureCount: number
  results: BulkGenerationQuestionResult[]
  consistencyResults?: ConsistencyCheckResult[]
}

export interface BulkGenerationQuestionResult {
  questionId: string
  success: boolean
  draftId?: string
  qualityScore?: number
  error?: string
  generationTimeMs: number
}

export interface BulkRefinementConfig {
  campaignId: string
  questionIds: string[]
  refinementStrategy: 'auto-apply' | 'suggestions-only' | 'critical-only'
  maxIterations: number
  targetScore: number
  stopOnTarget: boolean
}

export interface BulkRefinementResult {
  campaignId: string
  startedAt: string
  completedAt: string
  questionsRefined: number
  averageImprovement: number
  results: Array<{
    questionId: string
    initialScore: number
    finalScore: number
    iterations: number
    suggestionsApplied: number
  }>
}

// ============================================================================
// TYPES: Dashboard
// ============================================================================

export interface CampaignDashboardData {
  campaign: ResponseCampaign
  qualityMetrics: CampaignQualityMetrics
  progressSummary: CampaignProgressSummary
  consistencySummary: ConsistencySummary
  recentActivity: CampaignActivity[]
  recommendations: CampaignRecommendation[]
}

export interface CampaignProgressSummary {
  totalQuestions: number
  pendingCount: number
  generatingCount: number
  reviewingCount: number
  approvedCount: number
  failedCount: number
  overallProgress: number
  estimatedCompletion?: string
  byDiscipline: Record<HAQDiscipline, {
    total: number
    completed: number
    progress: number
  }>
}

export interface ConsistencySummary {
  totalChecks: number
  passedCount: number
  failedCount: number
  warningCount: number
  autoFixedCount: number
  pendingResolutionCount: number
  byRule: Record<string, {
    passed: number
    failed: number
    autoFixed: number
  }>
}

export interface CampaignActivity {
  id: string
  timestamp: string
  type: 'generation' | 'refinement' | 'approval' | 'consistency' | 'packaging' | 'status-change'
  description: string
  questionId?: string
  actor?: string
  details?: Record<string, unknown>
}

export interface CampaignRecommendation {
  id: string
  type: 'quality' | 'consistency' | 'efficiency' | 'deadline'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
  affectedQuestions?: string[]
  estimatedImpact?: string
}
