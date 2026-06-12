
import type { HAQDiscipline, HAQSource } from '@/types/haq'
import type { 
  CampaignConfig, CampaignQualityTargets, ConsistencyRule, 
  SharedElementConfig, SubmissionPackagingConfig, ResponseCampaign,
  CampaignPhase, GeneratedDraft
} from './responseCampaignTypes'

// ============================================================================
// TYPES: Agency-Specific Submission Formats
// ============================================================================

export type RegulatoryAgency = 'FDA' | 'EMA' | 'PMDA' | 'HC' | 'TGA' | 'MHRA' | 'ANVISA' | 'NMPA'

export interface AgencyFormatProfile {
  id: string
  agency: RegulatoryAgency
  name: string
  description: string
  region: string
  language: string
  dateFormat: string
  numberFormat: string
  documentNaming: AgencyDocumentNaming
  coverLetterTemplate: string
  responseMatrixFormat: ResponseMatrixFormat
  ctdMapping: Record<string, string>
  requiredSections: string[]
  optionalSections: string[]
  prohibitedContent: string[]
  formattingRules: AgencyFormattingRule[]
  submissionGuidelines: string[]
  validationRules: AgencyValidationRule[]
  lastUpdated: string
}

export interface AgencyDocumentNaming {
  pattern: string
  maxLength: number
  allowedCharacters: string
  caseFormat: 'uppercase' | 'lowercase' | 'mixed'
  datePosition: 'prefix' | 'suffix' | 'none'
  separators: string[]
  examples: string[]
}

export type ResponseMatrixFormat = 
  | 'table-horizontal'    // Question across top, response details below
  | 'table-vertical'      // Question in row, response in adjacent column
  | 'list-numbered'       // Numbered list with nested responses
  | 'cross-reference'     // References to CTD sections only

export interface AgencyFormattingRule {
  id: string
  element: 'header' | 'table' | 'figure' | 'citation' | 'reference' | 'appendix'
  rule: string
  example?: string
  required: boolean
}

export interface AgencyValidationRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  checkType: 'content' | 'format' | 'structure' | 'reference'
  pattern?: string
  autoFix: boolean
}

export interface AgencyFormattedPackage {
  id: string
  campaignId: string
  agency: RegulatoryAgency
  profileId: string
  createdAt: string
  status: 'generating' | 'validating' | 'ready' | 'exported'
  
  // Formatted content
  coverLetter: {
    content: string
    format: string
    validated: boolean
  }
  responseMatrix: {
    format: ResponseMatrixFormat
    content: string
    entries: AgencyResponseMatrixEntry[]
  }
  formattedResponses: AgencyFormattedResponse[]
  
  // Validation results
  validationResults: AgencyValidationResult[]
  validationPassed: boolean
  
  // Export info
  exportedAt?: string
  downloadUrls?: string[]
}

export interface AgencyResponseMatrixEntry {
  questionNumber: string
  questionSummary: string
  ctdReference: string
  responsePageNumber?: number
  attachments?: string[]
  notes?: string
}

export interface AgencyFormattedResponse {
  questionId: string
  questionNumber: string
  formattedContent: string
  originalContent: string
  transformations: ContentTransformation[]
  warnings: string[]
}

export interface ContentTransformation {
  type: 'terminology' | 'date-format' | 'number-format' | 'structure' | 'reference'
  original: string
  transformed: string
  reason: string
}

export interface AgencyValidationResult {
  ruleId: string
  ruleName: string
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: string
  suggestion?: string
}

// ============================================================================
// TYPES: Campaign Templates
// ============================================================================

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: CampaignTemplateCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  
  // Template configuration
  config: CampaignTemplateConfig
  
  // Usage tracking
  usageCount: number
  lastUsedAt?: string
  rating: number
  ratingCount: number
  
  // Versioning
  version: string
  previousVersionId?: string
  isLatest: boolean
  
  // Sharing
  isShared: boolean
  sharedWith?: string[]
  isGlobal: boolean
}

export type CampaignTemplateCategory = 
  | 'ir-response'           // Information Request responses
  | 'crl-response'          // Complete Response Letter
  | 'annual-report'         // Annual report preparation
  | 'safety-update'         // Safety update submissions
  | 'amendment'             // Application amendments
  | 'pre-submission'        // Pre-submission meeting prep
  | 'custom'

export interface CampaignTemplateConfig {
  // Base campaign settings
  strategy: CampaignConfig['strategy']
  consistencyRules: ConsistencyRule[]
  qualityTargets: CampaignQualityTargets
  sharedElements: SharedElementConfig[]
  submissionPackaging: SubmissionPackagingConfig
  
  // Workflow settings
  defaultWorkflow: WorkflowTemplate
  requiredApprovals: ApprovalRequirement[]
  
  // Scheduling defaults
  defaultDeadlineDays: number
  milestones: MilestoneTemplate[]
  
  // Team assignments
  defaultAssignments: TeamAssignmentTemplate[]
  
  // Quality settings
  autoRefineThreshold: number
  consistencyCheckFrequency: 'per-draft' | 'per-phase' | 'final-only'
  
  // Agency-specific
  targetAgencies?: RegulatoryAgency[]
  agencyProfileOverrides?: Record<RegulatoryAgency, Partial<AgencyFormatProfile>>
}

export interface WorkflowTemplate {
  phases: CampaignPhase[]
  skipConditions: PhaseSkipCondition[]
  parallelPhases: CampaignPhase[][]
}

export interface PhaseSkipCondition {
  phase: CampaignPhase
  condition: 'all-high-quality' | 'no-consistency-issues' | 'under-deadline-pressure'
  threshold?: number
}

export interface MilestoneTemplate {
  id: string
  name: string
  phase: CampaignPhase
  daysFromStart: number
  daysFromDeadline?: number
  isRequired: boolean
  notifyRoles: string[]
}

export interface ApprovalRequirement {
  phase: CampaignPhase
  role: string
  minApprovals: number
  canDelegateFrom?: string[]
}

export interface TeamAssignmentTemplate {
  role: string
  discipline?: HAQDiscipline
  responsibilities: string[]
  defaultCapacity: number
}

export interface TemplateInstantiation {
  id: string
  templateId: string
  campaignId: string
  instantiatedAt: string
  instantiatedBy?: string
  modifications: TemplateModification[]
}

export interface TemplateModification {
  field: string
  originalValue: unknown
  newValue: unknown
  reason?: string
}

// ============================================================================
// TYPES: Collaborative Review
// ============================================================================

export interface CampaignCollaborator {
  id: string
  userId: string
  userName: string
  email: string
  role: CollaboratorRole
  permissions: CollaboratorPermission[]
  assignedDisciplines: HAQDiscipline[]
  assignedQuestions: string[]
  joinedAt: string
  lastActiveAt: string
  status: 'active' | 'inactive' | 'removed'
}

export type CollaboratorRole = 
  | 'owner'           // Full control
  | 'lead'            // Can assign, approve, package
  | 'reviewer'        // Can review and approve assigned
  | 'author'          // Can generate and edit drafts
  | 'viewer'          // Read-only access

export type CollaboratorPermission = 
  | 'manage-collaborators'
  | 'assign-questions'
  | 'generate-drafts'
  | 'edit-drafts'
  | 'approve-responses'
  | 'run-consistency-check'
  | 'package-submission'
  | 'export-package'
  | 'view-analytics'
  | 'manage-settings'

export interface QuestionAssignment {
  id: string
  questionId: string
  campaignId: string
  assignedTo: string
  assignedBy: string
  assignedAt: string
  dueDate?: string
  priority: 'high' | 'medium' | 'low'
  status: AssignmentStatus
  notes?: string
  completedAt?: string
  completedBy?: string
}

export type AssignmentStatus = 
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'under-review'
  | 'approved'
  | 'returned'
  | 'reassigned'

export interface ReviewRequest {
  id: string
  campaignId: string
  questionId: string
  draftId: string
  requestedBy: string
  requestedAt: string
  reviewers: ReviewerAssignment[]
  dueDate?: string
  priority: 'urgent' | 'high' | 'normal'
  status: ReviewRequestStatus
  roundNumber: number
  context?: string
  resolvedAt?: string
}

export type ReviewRequestStatus = 
  | 'pending'
  | 'in-review'
  | 'approved'
  | 'changes-requested'
  | 'rejected'
  | 'cancelled'

export interface ReviewerAssignment {
  userId: string
  userName: string
  assignedAt: string
  status: 'pending' | 'reviewing' | 'completed'
  completedAt?: string
  decision?: 'approve' | 'request-changes' | 'reject'
  feedback?: ReviewFeedback
}

export interface ReviewFeedback {
  id: string
  reviewerId: string
  reviewerName: string
  draftId: string
  createdAt: string
  overallAssessment: 'excellent' | 'good' | 'acceptable' | 'needs-work' | 'unacceptable'
  comments: ReviewComment[]
  suggestions: ReviewSuggestion[]
  blockingIssues: string[]
  approved: boolean
}

export interface ReviewComment {
  id: string
  type: 'general' | 'section' | 'inline'
  sectionId?: string
  startOffset?: number
  endOffset?: number
  content: string
  severity: 'critical' | 'major' | 'minor' | 'suggestion'
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  responses?: CommentResponse[]
}

export interface CommentResponse {
  id: string
  responderId: string
  responderName: string
  content: string
  createdAt: string
}

export interface ReviewSuggestion {
  id: string
  type: 'content' | 'structure' | 'formatting' | 'reference'
  description: string
  originalText?: string
  suggestedText?: string
  applied: boolean
  appliedAt?: string
}

export interface CollaborationActivity {
  id: string
  campaignId: string
  userId: string
  userName: string
  type: CollaborationActivityType
  timestamp: string
  questionId?: string
  draftId?: string
  details: Record<string, unknown>
}

export type CollaborationActivityType = 
  | 'joined'
  | 'left'
  | 'assigned'
  | 'unassigned'
  | 'started-draft'
  | 'submitted-draft'
  | 'requested-review'
  | 'completed-review'
  | 'approved'
  | 'rejected'
  | 'commented'
  | 'resolved-comment'
  | 'mentioned'

// ============================================================================
// TYPES: Response Versioning
// ============================================================================

export interface ResponseVersion {
  id: string
  questionId: string
  campaignId: string
  versionNumber: number
  label: string
  createdAt: string
  createdBy?: string
  
  // Content
  content: string
  draftId: string
  
  // Metadata
  irCycle: number
  submissionContext?: string
  
  // Quality at time of version
  qualityScore: number
  consistencyPassed: boolean
  
  // Diff from previous
  changesSummary?: VersionChangesSummary
  diffFromPrevious?: VersionDiff
  
  // Status
  status: VersionStatus
  submittedAt?: string
  agencyFeedback?: AgencyFeedbackRecord[]
}

export type VersionStatus = 
  | 'draft'
  | 'under-review'
  | 'approved'
  | 'submitted'
  | 'superseded'
  | 'withdrawn'

export interface VersionChangesSummary {
  totalChanges: number
  additions: number
  deletions: number
  modifications: number
  significantChanges: string[]
  changeCategories: Record<string, number>
}

export interface VersionDiff {
  previousVersionId: string
  hunks: DiffHunk[]
  wordCount: {
    before: number
    after: number
    delta: number
  }
  structuralChanges: StructuralChange[]
}

export interface DiffHunk {
  id: string
  type: 'addition' | 'deletion' | 'modification'
  beforeContent?: string
  afterContent?: string
  beforeLineRange?: [number, number]
  afterLineRange?: [number, number]
  changeReason?: string
}

export interface StructuralChange {
  type: 'section-added' | 'section-removed' | 'section-moved' | 'section-renamed'
  description: string
  sectionId?: string
}

export interface AgencyFeedbackRecord {
  id: string
  agency: RegulatoryAgency
  receivedAt: string
  feedbackType: 'accepted' | 'deficiency' | 'clarification' | 'refuse-to-file'
  summary: string
  details?: string
  responseRequired: boolean
  responseDueDate?: string
}

export interface VersionComparison {
  versionAId: string
  versionBId: string
  compared: string
  summary: VersionComparisonSummary
  diff: VersionDiff
  qualityDelta: number
  recommendation?: string
}

export interface VersionComparisonSummary {
  overallChange: 'major' | 'moderate' | 'minor' | 'trivial'
  keyChanges: string[]
  risksIntroduced: string[]
  risksResolved: string[]
  qualityImpact: 'improved' | 'unchanged' | 'degraded'
}

export interface ResponseEvolution {
  questionId: string
  versions: ResponseVersion[]
  currentVersionId: string
  totalIRCycles: number
  evolutionMetrics: EvolutionMetrics
  timeline: EvolutionTimelineEntry[]
}

export interface EvolutionMetrics {
  totalVersions: number
  averageIterationsPerCycle: number
  qualityTrend: 'improving' | 'stable' | 'declining'
  timeToApproval: number[]
  contentGrowth: number
  changesPerCycle: number[]
}

export interface EvolutionTimelineEntry {
  timestamp: string
  event: 'created' | 'modified' | 'submitted' | 'feedback' | 'approved'
  versionId: string
  versionNumber: number
  description: string
  actor?: string
}

// ============================================================================
// TYPES: Predictive Scheduling
// ============================================================================

export interface SchedulePrediction {
  id: string
  campaignId: string
  generatedAt: string
  
  // Overall campaign prediction
  campaignCompletion: CompletionPrediction
  
  // Per-question predictions
  questionPredictions: Record<string, QuestionPrediction>
  
  // Phase predictions
  phasePredictions: Record<CampaignPhase, PhasePrediction>
  
  // Risk factors
  risks: ScheduleRisk[]
  
  // Recommendations
  optimizations: ScheduleOptimization[]
  
  // Confidence
  overallConfidence: number
  methodology: string
}

export interface CompletionPrediction {
  estimatedCompletion: string
  confidenceRange: {
    optimistic: string
    pessimistic: string
    mostLikely: string
  }
  confidence: number
  factors: PredictionFactor[]
}

export interface QuestionPrediction {
  questionId: string
  estimatedDuration: number // minutes
  estimatedCompletion: string
  confidence: number
  complexityScore: number
  factors: PredictionFactor[]
  dependencies: string[]
  blockers: string[]
  risks: string[]
}

export interface PhasePrediction {
  phase: CampaignPhase
  estimatedStart: string
  estimatedEnd: string
  estimatedDuration: number // minutes
  confidence: number
  parallelCapacity: number
  bottlenecks: string[]
}

export interface PredictionFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
  value?: number | string
}

export interface ScheduleRisk {
  id: string
  type: 'deadline' | 'resource' | 'quality' | 'dependency' | 'external'
  severity: 'high' | 'medium' | 'low'
  probability: number
  impact: string
  mitigation?: string
  affectedQuestions: string[]
}

export interface ScheduleOptimization {
  id: string
  type: 'parallelization' | 'prioritization' | 'resource-reallocation' | 'scope-reduction'
  description: string
  estimatedSavings: number // minutes
  effort: 'low' | 'medium' | 'high'
  affectedQuestions: string[]
  tradeoffs: string[]
}

export interface WorkloadDistribution {
  collaboratorId: string
  collaboratorName: string
  assignedQuestions: number
  estimatedWorkload: number // minutes
  currentCapacity: number // percentage
  projectedCompletion: string
  overloaded: boolean
  recommendations: string[]
}

export interface HistoricalBenchmark {
  discipline: HAQDiscipline
  questionType: string
  averageDuration: number
  medianDuration: number
  standardDeviation: number
  sampleSize: number
  factors: BenchmarkFactor[]
}

export interface BenchmarkFactor {
  factor: string
  correlation: number
  adjustment: number
}

export interface PredictionAccuracy {
  predictionId: string
  questionId: string
  predictedDuration: number
  actualDuration: number
  accuracy: number
  factors: string[]
}

// ============================================================================
// TYPES: Enhanced Campaign State
// ============================================================================

export interface EnhancedCampaignState {
  // Agency formatting
  agencyProfiles: Record<RegulatoryAgency, AgencyFormatProfile>
  formattedPackages: Record<string, AgencyFormattedPackage>
  
  // Templates
  templates: Record<string, CampaignTemplate>
  templateInstantiations: Record<string, TemplateInstantiation>
  
  // Collaboration
  collaborators: Record<string, CampaignCollaborator[]>
  assignments: Record<string, QuestionAssignment[]>
  reviewRequests: Record<string, ReviewRequest[]>
  collaborationActivity: CollaborationActivity[]
  
  // Versioning
  responseVersions: Record<string, ResponseVersion[]>
  versionComparisons: Record<string, VersionComparison>
  
  // Scheduling
  predictions: Record<string, SchedulePrediction>
  benchmarks: Record<string, HistoricalBenchmark>
  workloadDistributions: Record<string, WorkloadDistribution[]>
}
