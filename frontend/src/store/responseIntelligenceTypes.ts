
import type { HAQuestion, HAQDiscipline, HAQSource } from '@/types/haq'
import type { ResponseElement } from './useHAQAnalytics'
import type { 
  ResponseTemplate, 
  TemplateComponent, 
  TemplateVariable 
} from './useResponseTemplates'
import type { 
  CompletenessScore, 
  GapAnalysis, 
  SimulatedReviewerFeedback,
} from './useReviewerSimulation'

// ============================================================================
// TYPES: Draft Generation
// ============================================================================

export interface DraftGenerationConfig {
  questionId: string
  strategy: 'template-based' | 'pattern-based' | 'hybrid' | 'ai-assisted'
  templatePreferences: {
    preferredTemplateIds?: string[]
    excludeTemplateIds?: string[]
    minMatchScore?: number
    maxTemplates?: number
  }
  contentPreferences: {
    targetLength: 'brief' | 'moderate' | 'comprehensive'
    tone: 'formal' | 'technical' | 'balanced'
    includeElements: ResponseElement[]
    excludeElements?: ResponseElement[]
    prioritizeElements?: ResponseElement[]
  }
  targetPersonaId?: string
  qualityTargets: {
    minCompletenessScore: number
    minAcceptanceProbability: number
    maxIterations: number
  }
  sourceDocuments?: string[]
  previousResponses?: string[]
}

export interface GeneratedDraft {
  id: string
  questionId: string
  configId: string
  content: string
  sections: DraftSection[]
  generatedAt: string
  strategy: DraftGenerationConfig['strategy']
  generationTimeMs: number
  sources: DraftSource[]
  templateAttribution: {
    primaryTemplateId?: string
    primaryTemplateName?: string
    componentIds: string[]
    variablesFilled: Record<string, string>
  }
  initialScore: CompletenessScore
  initialGaps: GapAnalysis
  status: 'generated' | 'refined' | 'approved' | 'applied'
  appliedAt?: string
}

export interface DraftSection {
  id: string
  name: string
  order: number
  content: string
  sourceType: 'template' | 'pattern' | 'generated' | 'user'
  sourceId?: string
  elements: ResponseElement[]
  isEditable: boolean
  isRequired: boolean
}

export interface DraftSource {
  type: 'template' | 'component' | 'pattern' | 'historical-response' | 'document'
  id: string
  name: string
  contribution: string
  confidence: number
}

// ============================================================================
// TYPES: Template Selection
// ============================================================================

export interface TemplateCandidate {
  template: ResponseTemplate
  matchScore: number
  matchReasons: MatchReason[]
  coverageAnalysis: CoverageAnalysis
  estimatedCompleteness: number
  rank: number
  recommended: boolean
}

export interface MatchReason {
  factor: string
  weight: number
  score: number
  details: string
}

export interface CoverageAnalysis {
  elementsAddressed: ResponseElement[]
  elementsMissing: ResponseElement[]
  gapsCovered: number
  gapsRemaining: number
  coveragePercent: number
}

export interface ComponentCandidate {
  component: TemplateComponent
  matchScore: number
  targetSection?: string
  fillsGap: ResponseElement[]
  recommended: boolean
}

// ============================================================================
// TYPES: Refinement Engine
// ============================================================================

export interface RefinementCycle {
  id: string
  draftId: string
  cycleNumber: number
  inputContent: string
  inputScore: CompletenessScore
  changes: RefinementChange[]
  outputContent: string
  outputScore: CompletenessScore
  improvement: {
    scoreChange: number
    dimensionChanges: Record<string, number>
    gapsAddressed: string[]
    newIssues?: string[]
  }
  startedAt: string
  completedAt: string
  durationMs: number
  status: 'in-progress' | 'completed' | 'failed'
  failureReason?: string
}

export interface RefinementChange {
  id: string
  type: 'addition' | 'modification' | 'deletion' | 'restructure'
  target: 'section' | 'paragraph' | 'sentence' | 'element'
  targetId?: string
  originalContent?: string
  newContent?: string
  reason: string
  addressesGap?: ResponseElement
  addressesSuggestion?: string
  expectedImpact: { dimension: string; change: number }[]
  applied: boolean
  userApproved?: boolean
}

export interface RefinementSuggestion {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  type: 'add-content' | 'expand-section' | 'add-evidence' | 'clarify' | 'restructure' | 'remove'
  targetSection?: string
  targetElement?: ResponseElement
  suggestion: string
  exampleContent?: string
  rationale: string
  basedOn: 'gap-analysis' | 'reviewer-feedback' | 'pattern-analysis' | 'best-practice'
  expectedScoreImprovement: number
  affectedDimensions: string[]
  canAutoApply: boolean
  autoApplyContent?: string
}

// ============================================================================
// TYPES: Quality Checkpoints
// ============================================================================

export interface QualityCheckpoint {
  id: string
  draftId: string
  checkpointNumber: number
  createdAt: string
  content: string
  completenessScore: CompletenessScore
  gapAnalysis: GapAnalysis
  simulatedFeedback: SimulatedReviewerFeedback
  previousCheckpointId?: string
  improvement: {
    overallScoreChange: number
    acceptanceProbabilityChange: number
    gapsResolved: number
    newGaps: number
  }
  meetsTargets: boolean
  targetsMet: string[]
  targetsMissed: string[]
}

// ============================================================================
// TYPES: Response Coach
// ============================================================================

export interface CoachingSession {
  id: string
  questionId: string
  startedAt: string
  currentContent: string
  currentScore: CompletenessScore
  activeSuggestions: RefinementSuggestion[]
  currentGuidance: CoachingGuidance[]
  initialScore: number
  currentScoreValue: number
  targetScore: number
  progressPercent: number
  interactionCount: number
  suggestionsApplied: number
  suggestionsSkipped: number
}

export interface CoachingGuidance {
  id: string
  type: 'tip' | 'warning' | 'suggestion' | 'requirement'
  message: string
  details?: string
  actionable: boolean
  action?: string
  dismissible: boolean
}

// ============================================================================
// TYPES: Orchestration
// ============================================================================

export interface OrchestrationJob {
  id: string
  questionId: string
  type: 'generate' | 'refine' | 'analyze' | 'coach'
  config: DraftGenerationConfig
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string
  steps: OrchestrationStep[]
  queuedAt: string
  startedAt?: string
  completedAt?: string
  estimatedTimeMs?: number
  resultDraftId?: string
  error?: string
}

export interface OrchestrationStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  startedAt?: string
  completedAt?: string
  output?: unknown
}
