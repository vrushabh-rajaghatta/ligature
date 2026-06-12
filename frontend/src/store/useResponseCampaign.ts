

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'
import type { HAQuestion, HAQDiscipline } from '@/types/haq'
import { useHAQStore } from './useHAQStore'
import { useResponseIntelligence } from './useResponseIntelligence'
import type { DraftGenerationConfig, GeneratedDraft } from './responseIntelligenceTypes'
import type {
  CampaignConfig, ConsistencyRule, CampaignQualityTargets,
  SharedElementConfig, ResponseCampaign, CampaignStatus,
  CampaignPhase, QuestionCampaignProgress,
  ConsistencyCheckResult, ConsistencyIssue, TerminologyInconsistency,
  SharedElementInstance, ElementReuseOpportunity,
  CampaignQualityMetrics, ScoreDistribution, DisciplineMetrics,
  QualityTargetStatus, CampaignSubmissionPackage, ResponseMatrixEntry, 
  PackagedResponse, CampaignAuditEntry,
  BulkGenerationConfig, BulkGenerationResult, BulkGenerationQuestionResult,
  BulkRefinementConfig, BulkRefinementResult, CampaignDashboardData,
  CampaignProgressSummary, ConsistencySummary, CampaignActivity, CampaignRecommendation
} from './responseCampaignTypes'

// Re-export types
export type * from './responseCampaignTypes'

// ============================================================================
// STORE STATE
// ============================================================================

interface ResponseCampaignState {
  campaigns: Record<string, ResponseCampaign>
  activeCampaignId: string | null
  reusableElements: SharedElementInstance[]
  reuseOpportunities: ElementReuseOpportunity[]
  isProcessing: boolean
  processingProgress: number
  currentTask: string
  lastError: string | null
  activityLog: CampaignActivity[]
}

interface ResponseCampaignActions {
  createCampaign: (config: CampaignConfig) => ResponseCampaign
  updateCampaign: (campaignId: string, updates: Partial<CampaignConfig>) => void
  deleteCampaign: (campaignId: string) => void
  selectCampaign: (campaignId: string | null) => void
  getCampaign: (campaignId: string) => ResponseCampaign | null
  listCampaigns: () => ResponseCampaign[]
  addQuestionsToCampaign: (campaignId: string, questionIds: string[]) => void
  removeQuestionsFromCampaign: (campaignId: string, questionIds: string[]) => void
  updateQuestionProgress: (campaignId: string, questionId: string, updates: Partial<QuestionCampaignProgress>) => void
  approveQuestion: (campaignId: string, questionId: string, approvedBy?: string) => void
  generateAllDrafts: (campaignId: string, config?: Partial<BulkGenerationConfig>) => Promise<BulkGenerationResult>
  generateDraftsForQuestions: (campaignId: string, questionIds: string[], config?: Partial<DraftGenerationConfig>) => Promise<BulkGenerationResult>
  regenerateDraft: (campaignId: string, questionId: string) => Promise<GeneratedDraft | null>
  runConsistencyCheck: (campaignId: string) => Promise<ConsistencyCheckResult[]>
  resolveConsistencyIssue: (campaignId: string, issueId: string, resolution?: string) => void
  applyAutoFixes: (campaignId: string) => Promise<number>
  createSharedElement: (campaignId: string, config: SharedElementConfig) => SharedElementInstance
  applySharedElement: (campaignId: string, elementId: string, questionIds: string[]) => void
  detectReuseOpportunities: (campaignId: string) => ElementReuseOpportunity[]
  applyReuseOpportunity: (opportunityId: string) => void
  calculateQualityMetrics: (campaignId: string) => CampaignQualityMetrics
  getDashboardData: (campaignId: string) => CampaignDashboardData
  refineAllDrafts: (campaignId: string, config?: Partial<BulkRefinementConfig>) => Promise<BulkRefinementResult>
  refineDraftsForQuestions: (campaignId: string, questionIds: string[]) => Promise<BulkRefinementResult>
  generateSubmissionPackage: (campaignId: string) => Promise<CampaignSubmissionPackage>
  exportPackage: (campaignId: string, format: 'word' | 'pdf' | 'both') => Promise<string[]>
  advancePhase: (campaignId: string) => void
  rollbackPhase: (campaignId: string) => void
  setCampaignStatus: (campaignId: string, status: CampaignStatus) => void
  getProgressSummary: (campaignId: string) => CampaignProgressSummary
  getRecommendations: (campaignId: string) => CampaignRecommendation[]
  logActivity: (campaignId: string, activity: Omit<CampaignActivity, 'id' | 'timestamp'>) => void
}

type ResponseCampaignStore = ResponseCampaignState & ResponseCampaignActions

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createDefaultQualityTargets(): CampaignQualityTargets {
  return {
    minAverageScore: 70,
    minIndividualScore: 60,
    maxScoreVariance: 20,
    requiredConsistencyPass: true,
    acceptanceThreshold: 65
  }
}

function createDefaultConsistencyRules(): ConsistencyRule[] {
  return [
    { id: 'rule-terminology', name: 'Terminology Consistency', type: 'terminology', description: 'Ensure consistent use of key terms', scope: 'all', checkFunction: 'checkTerminologyConsistency', autoFix: true, severity: 'warning' },
    { id: 'rule-data-refs', name: 'Data Reference Alignment', type: 'data-reference', description: 'Verify data references are consistent', scope: 'all', checkFunction: 'checkDataReferences', autoFix: false, severity: 'error' },
    { id: 'rule-conclusions', name: 'Conclusion Consistency', type: 'conclusion', description: 'Check conclusions do not contradict', scope: 'discipline', checkFunction: 'checkConclusionConsistency', autoFix: false, severity: 'error' },
    { id: 'rule-formatting', name: 'Formatting Standardization', type: 'formatting', description: 'Ensure consistent formatting', scope: 'all', checkFunction: 'checkFormattingConsistency', autoFix: true, severity: 'info' },
    { id: 'rule-cross-refs', name: 'Cross-Reference Validation', type: 'cross-reference', description: 'Validate cross-references between responses', scope: 'all', checkFunction: 'checkCrossReferences', autoFix: false, severity: 'warning' }
  ]
}

function createInitialProgress(questionId: string): QuestionCampaignProgress {
  return { questionId, status: 'pending', draftIds: [], generationAttempts: 0, consistencyIssues: [], refinementCount: 0, sharedElementsApplied: [] }
}

function calculateScoreDistribution(scores: number[]): ScoreDistribution {
  return {
    excellent: scores.filter(s => s >= 90).length,
    good: scores.filter(s => s >= 80 && s < 90).length,
    acceptable: scores.filter(s => s >= 70 && s < 80).length,
    needsWork: scores.filter(s => s >= 60 && s < 70).length,
    poor: scores.filter(s => s < 60).length
  }
}

function extractTerms(text: string): Map<string, number> {
  const terms = new Map<string, number>()
  const keyTermPatterns = [
    /\b(efficacy|effectiveness)\b/gi,
    /\b(adverse\s+event|adverse\s+reaction|ae|adr)\b/gi,
    /\b(patient|subject|participant)\b/gi,
    /\b(significant|meaningful|clinically\s+relevant)\b/gi,
    /\b(batch|lot)\b/gi
  ]
  keyTermPatterns.forEach(pattern => {
    const matches: string[] = text.match(pattern) || []
    matches.forEach(match => {
      const normalized = match.toLowerCase().trim()
      terms.set(normalized, (terms.get(normalized) || 0) + 1)
    })
  })
  return terms
}

function detectTerminologyInconsistencies(drafts: Record<string, GeneratedDraft>, questions: HAQuestion[]): TerminologyInconsistency[] {
  const issues: TerminologyInconsistency[] = []
  const termUsageByQuestion = new Map<string, Map<string, number>>()
  
  Object.values(drafts).forEach(draft => {
    const terms = extractTerms(draft.content)
    termUsageByQuestion.set(draft.questionId, terms)
  })
  
  const termGroups: Record<string, Array<{ questionId: string; term: string; count: number }>> = { 'patient-subject': [] }
  
  termUsageByQuestion.forEach((terms, questionId) => {
    ['patient', 'subject', 'participant'].forEach(term => {
      if (terms.has(term)) {
        termGroups['patient-subject'].push({ questionId, term, count: terms.get(term)! })
      }
    })
  })
  
  Object.entries(termGroups).forEach(([group, usages]) => {
    if (usages.length < 2) return
    const uniqueTerms = Array.from(new Set(usages.map(u => u.term)))
    if (uniqueTerms.length > 1) {
      const termCounts = new Map<string, number>()
      usages.forEach(u => termCounts.set(u.term, (termCounts.get(u.term) || 0) + u.count))
      const recommendedTerm = Array.from(termCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      
      issues.push({
        id: generateId('term-issue'), ruleId: 'rule-terminology', severity: 'warning', type: 'terminology',
        questionIds: Array.from(new Set(usages.map(u => u.questionId))),
        description: `Inconsistent terminology: "${uniqueTerms.join('", "')}" used interchangeably`,
        term: group, variants: usages.map(u => ({ questionId: u.questionId, usedTerm: u.term, count: u.count })),
        recommendedTerm, suggestedFix: `Standardize to "${recommendedTerm}" across all responses`,
        canAutoFix: true, resolved: false
      })
    }
  })
  return issues
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useResponseCampaign = create<ResponseCampaignStore>()(
  devtools(
    (set, get) => ({
      campaigns: {},
      activeCampaignId: null,
      reusableElements: [],
      reuseOpportunities: [],
      isProcessing: false,
      processingProgress: 0,
      currentTask: '',
      lastError: null,
      activityLog: [],
      
      createCampaign: (config) => {
        const campaignId = generateId('campaign')
        const now = new Date().toISOString()
        const questionProgress: Record<string, QuestionCampaignProgress> = {}
        config.questionIds.forEach(qId => { questionProgress[qId] = createInitialProgress(qId) })
        
        const fullConfig: CampaignConfig = {
          ...config,
          consistencyRules: config.consistencyRules.length > 0 ? config.consistencyRules : createDefaultConsistencyRules(),
          qualityTargets: config.qualityTargets || createDefaultQualityTargets()
        }
        
        const campaign: ResponseCampaign = {
          id: campaignId, config: fullConfig, status: 'draft', createdAt: now, updatedAt: now,
          questionProgress, drafts: {}, activeDraftIds: {},
          qualityMetrics: {
            timestamp: now, overallScore: 0, averageScore: 0, minScore: 0, maxScore: 0, scoreVariance: 0,
            scoreDistribution: { excellent: 0, good: 0, acceptable: 0, needsWork: 0, poor: 0 },
            byQuestion: {}, byDiscipline: {} as Record<HAQDiscipline, DisciplineMetrics>,
            consistencyScore: 100, completenessScore: 0, trendsOverTime: [], targetsMet: false, targetsDetail: []
          },
          consistencyResults: [], sharedElementInstances: [], currentPhase: 'initialization', completedPhases: []
        }
        
        set(state => ({ campaigns: { ...state.campaigns, [campaignId]: campaign }, activeCampaignId: campaignId }), false, 'createCampaign')
        get().logActivity(campaignId, { type: 'status-change', description: `Campaign "${config.name}" created with ${config.questionIds.length} questions` })
        return campaign
      },
      
      updateCampaign: (campaignId, updates) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, config: { ...campaign.config, ...updates }, updatedAt: new Date().toISOString() } } }
        }, false, 'updateCampaign')
      },
      
      deleteCampaign: (campaignId) => {
        set(state => {
          const { [campaignId]: _, ...remaining } = state.campaigns
          return { campaigns: remaining, activeCampaignId: state.activeCampaignId === campaignId ? null : state.activeCampaignId }
        }, false, 'deleteCampaign')
      },
      
      selectCampaign: (campaignId) => set({ activeCampaignId: campaignId }, false, 'selectCampaign'),
      
      getCampaign: (campaignId) => get().campaigns[campaignId] || null,
      
      listCampaigns: () => Object.values(get().campaigns),
      
      addQuestionsToCampaign: (campaignId, questionIds) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          const newProgress = { ...campaign.questionProgress }
          const newIds = [...campaign.config.questionIds]
          questionIds.forEach(qId => { if (!newProgress[qId]) { newProgress[qId] = createInitialProgress(qId); newIds.push(qId) } })
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, config: { ...campaign.config, questionIds: newIds }, questionProgress: newProgress, updatedAt: new Date().toISOString() } } }
        }, false, 'addQuestionsToCampaign')
        get().logActivity(campaignId, { type: 'status-change', description: `Added ${questionIds.length} question(s)` })
      },
      
      removeQuestionsFromCampaign: (campaignId, questionIds) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          const newProgress = { ...campaign.questionProgress }
          questionIds.forEach(qId => delete newProgress[qId])
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, config: { ...campaign.config, questionIds: campaign.config.questionIds.filter(id => !questionIds.includes(id)) }, questionProgress: newProgress, updatedAt: new Date().toISOString() } } }
        }, false, 'removeQuestionsFromCampaign')
      },
      
      updateQuestionProgress: (campaignId, questionId, updates) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign || !campaign.questionProgress[questionId]) return state
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, questionProgress: { ...campaign.questionProgress, [questionId]: { ...campaign.questionProgress[questionId], ...updates } }, updatedAt: new Date().toISOString() } } }
        }, false, 'updateQuestionProgress')
      },
      
      approveQuestion: (campaignId, questionId, approvedBy) => {
        get().updateQuestionProgress(campaignId, questionId, { status: 'approved', approvedAt: new Date().toISOString(), approvedBy })
        get().logActivity(campaignId, { type: 'approval', description: 'Question approved', questionId, actor: approvedBy })
      },
      
      generateAllDrafts: async (campaignId, config) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        const questionIds = campaign.config.questionIds.filter(qId => campaign.questionProgress[qId]?.status === 'pending' || campaign.questionProgress[qId]?.status === 'failed')
        return get().generateDraftsForQuestions(campaignId, questionIds, config?.generationConfig)
      },
      
      generateDraftsForQuestions: async (campaignId, questionIds, generationConfig) => {
        const startTime = Date.now()
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        
        set({ isProcessing: true, processingProgress: 0, currentTask: 'Initializing bulk generation', lastError: null }, false, 'generateDraftsForQuestions:start')
        set(state => ({ campaigns: { ...state.campaigns, [campaignId]: { ...state.campaigns[campaignId], status: 'generating' } } }), false, 'generateDraftsForQuestions:setStatus')
        
        const results: BulkGenerationQuestionResult[] = []
        const haqStore = useHAQStore.getState()
        const intelligenceStore = useResponseIntelligence.getState()
        
        for (let i = 0; i < questionIds.length; i++) {
          const questionId = questionIds[i]
          const question = haqStore.haqs.find(q => q.id === questionId)
          const progress = Math.round(((i + 1) / questionIds.length) * 100)
          set({ processingProgress: progress, currentTask: `Generating draft ${i + 1}/${questionIds.length}: ${question?.questionNumber || questionId}` }, false, 'generateDraftsForQuestions:progress')
          get().updateQuestionProgress(campaignId, questionId, { status: 'generating' })
          
          const genStart = Date.now()
          try {
            const config: DraftGenerationConfig = {
              questionId, strategy: generationConfig?.strategy || 'hybrid',
              templatePreferences: generationConfig?.templatePreferences || { minMatchScore: 50, maxTemplates: 5 },
              contentPreferences: generationConfig?.contentPreferences || { targetLength: 'moderate', tone: 'formal', includeElements: ['data-tables', 'clinical-justification', 'risk-assessment'] },
              qualityTargets: { minCompletenessScore: campaign.config.qualityTargets.minIndividualScore, minAcceptanceProbability: campaign.config.qualityTargets.acceptanceThreshold, maxIterations: 3 }
            }
            
            const draft = await intelligenceStore.generateDraft(config)
            
            set(state => {
              const curr = state.campaigns[campaignId]
              if (!curr) return state
              return {
                campaigns: { ...state.campaigns, [campaignId]: {
                  ...curr, drafts: { ...curr.drafts, [draft.id]: draft }, activeDraftIds: { ...curr.activeDraftIds, [questionId]: draft.id },
                  questionProgress: { ...curr.questionProgress, [questionId]: { ...curr.questionProgress[questionId], status: 'generated', draftIds: [...curr.questionProgress[questionId].draftIds, draft.id], selectedDraftId: draft.id, generationAttempts: curr.questionProgress[questionId].generationAttempts + 1, lastGeneratedAt: new Date().toISOString(), qualityScore: draft.initialScore.overall } }
                }}
              }
            }, false, 'generateDraftsForQuestions:storeDraft')
            
            results.push({ questionId, success: true, draftId: draft.id, qualityScore: draft.initialScore.overall, generationTimeMs: Date.now() - genStart })
          } catch (error) {
            get().updateQuestionProgress(campaignId, questionId, { status: 'failed', generationAttempts: (campaign.questionProgress[questionId]?.generationAttempts || 0) + 1 })
            results.push({ questionId, success: false, error: error instanceof Error ? error.message : 'Unknown error', generationTimeMs: Date.now() - genStart })
          }
        }
        
        const allSucceeded = results.every(r => r.success)
        set(state => ({
          campaigns: { ...state.campaigns, [campaignId]: { ...state.campaigns[campaignId], status: allSucceeded ? 'reviewing' : 'configuring', currentPhase: allSucceeded ? 'quality-assessment' : 'draft-generation', updatedAt: new Date().toISOString() } },
          isProcessing: false, processingProgress: 100, currentTask: 'Bulk generation complete'
        }), false, 'generateDraftsForQuestions:complete')
        
        get().calculateQualityMetrics(campaignId)
        get().logActivity(campaignId, { type: 'generation', description: `Bulk generation: ${results.filter(r => r.success).length}/${results.length} successful` })
        
        return { campaignId, startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), totalQuestions: questionIds.length, successCount: results.filter(r => r.success).length, failureCount: results.filter(r => !r.success).length, results }
      },
      
      regenerateDraft: async (campaignId, questionId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) return null
        get().updateQuestionProgress(campaignId, questionId, { status: 'generating' })
        try {
          const draft = await useResponseIntelligence.getState().quickGenerate(questionId)
          set(state => {
            const curr = state.campaigns[campaignId]
            if (!curr) return state
            return { campaigns: { ...state.campaigns, [campaignId]: { ...curr, drafts: { ...curr.drafts, [draft.id]: draft }, activeDraftIds: { ...curr.activeDraftIds, [questionId]: draft.id }, questionProgress: { ...curr.questionProgress, [questionId]: { ...curr.questionProgress[questionId], status: 'generated', draftIds: [...curr.questionProgress[questionId].draftIds, draft.id], selectedDraftId: draft.id, generationAttempts: curr.questionProgress[questionId].generationAttempts + 1, lastGeneratedAt: new Date().toISOString(), qualityScore: draft.initialScore.overall } } } } }
          }, false, 'regenerateDraft')
          return draft
        } catch { get().updateQuestionProgress(campaignId, questionId, { status: 'failed' }); return null }
      },
      
      runConsistencyCheck: async (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        set({ isProcessing: true, currentTask: 'Running consistency checks', processingProgress: 0 }, false, 'runConsistencyCheck:start')
        
        const haqStore = useHAQStore.getState()
        const questions = campaign.config.questionIds.map(id => haqStore.haqs.find(q => q.id === id)).filter(Boolean) as HAQuestion[]
        const results: ConsistencyCheckResult[] = []
        const rules = campaign.config.consistencyRules
        
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i]
          set({ processingProgress: Math.round(((i + 1) / rules.length) * 100), currentTask: `Checking: ${rule.name}` }, false, 'runConsistencyCheck:progress')
          const issues: ConsistencyIssue[] = rule.type === 'terminology' ? detectTerminologyInconsistencies(campaign.drafts, questions) : []
          results.push({ id: generateId('check'), ruleId: rule.id, ruleName: rule.name, timestamp: new Date().toISOString(), passed: issues.length === 0, issues, affectedQuestions: Array.from(new Set(issues.flatMap(i => i.questionIds))), autoFixApplied: false })
        }
        
        set(state => {
          const curr = state.campaigns[campaignId]
          if (!curr) return state
          const updatedProgress = { ...curr.questionProgress }
          results.forEach(result => result.issues.forEach(issue => issue.questionIds.forEach(qId => {
            if (updatedProgress[qId]) updatedProgress[qId] = { ...updatedProgress[qId], consistencyIssues: [...updatedProgress[qId].consistencyIssues.filter(i => i.ruleId !== issue.ruleId), issue] }
          })))
          const passedCount = results.filter(r => r.passed).length
          return { campaigns: { ...state.campaigns, [campaignId]: { ...curr, consistencyResults: results, questionProgress: updatedProgress, qualityMetrics: { ...curr.qualityMetrics, consistencyScore: Math.round((passedCount / results.length) * 100) }, updatedAt: new Date().toISOString() } }, isProcessing: false, processingProgress: 100, currentTask: 'Consistency check complete' }
        }, false, 'runConsistencyCheck:complete')
        
        get().logActivity(campaignId, { type: 'consistency', description: `Consistency check: ${results.filter(r => r.passed).length}/${results.length} passed` })
        return results
      },
      
      resolveConsistencyIssue: (campaignId, issueId) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          const updatedResults = campaign.consistencyResults.map(result => ({ ...result, issues: result.issues.map(issue => issue.id === issueId ? { ...issue, resolved: true, resolvedAt: new Date().toISOString() } : issue) }))
          const updatedProgress = { ...campaign.questionProgress }
          Object.keys(updatedProgress).forEach(qId => { updatedProgress[qId] = { ...updatedProgress[qId], consistencyIssues: updatedProgress[qId].consistencyIssues.map(issue => issue.id === issueId ? { ...issue, resolved: true, resolvedAt: new Date().toISOString() } : issue) } })
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, consistencyResults: updatedResults, questionProgress: updatedProgress, updatedAt: new Date().toISOString() } } }
        }, false, 'resolveConsistencyIssue')
      },
      
      applyAutoFixes: async (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) return 0
        let fixedCount = 0
        const autoFixable = campaign.consistencyResults.flatMap(r => r.issues).filter(i => i.canAutoFix && !i.resolved)
        autoFixable.forEach(issue => { get().resolveConsistencyIssue(campaignId, issue.id); fixedCount++ })
        get().logActivity(campaignId, { type: 'consistency', description: `Applied ${fixedCount} auto-fix(es)` })
        return fixedCount
      },
      
      createSharedElement: (campaignId, config) => {
        const elementId = generateId('shared')
        const now = new Date().toISOString()
        const instance: SharedElementInstance = { id: elementId, configId: config.elementType, elementType: config.elementType, content: config.content || '', renderedContent: config.content || '', sourceQuestionId: config.sourceQuestionId, appliedToQuestions: [], createdAt: now, lastUsedAt: now, usageCount: 0, variables: config.variableMapping || {} }
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, sharedElementInstances: [...campaign.sharedElementInstances, instance], updatedAt: now } }, reusableElements: [...state.reusableElements, instance] }
        }, false, 'createSharedElement')
        return instance
      },
      
      applySharedElement: (campaignId, elementId, questionIds) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          const element = campaign.sharedElementInstances.find(e => e.id === elementId)
          if (!element) return state
          const updatedElements = campaign.sharedElementInstances.map(e => e.id === elementId ? { ...e, appliedToQuestions: Array.from(new Set([...e.appliedToQuestions, ...questionIds])), lastUsedAt: new Date().toISOString(), usageCount: e.usageCount + questionIds.length } : e)
          const updatedProgress = { ...campaign.questionProgress }
          questionIds.forEach(qId => { if (updatedProgress[qId]) updatedProgress[qId] = { ...updatedProgress[qId], sharedElementsApplied: Array.from(new Set([...updatedProgress[qId].sharedElementsApplied, elementId])) } })
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, sharedElementInstances: updatedElements, questionProgress: updatedProgress, updatedAt: new Date().toISOString() } } }
        }, false, 'applySharedElement')
      },
      
      detectReuseOpportunities: (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) return []
        const opportunities: ElementReuseOpportunity[] = []
        const drafts = Object.values(campaign.drafts)
        drafts.forEach((sourceDraft, i) => {
          drafts.slice(i + 1).forEach(targetDraft => {
            const sourceContent = sourceDraft.content.toLowerCase()
            const targetContent = targetDraft.content.toLowerCase()
            const patterns = ['supporting data', 'statistical analysis', 'stability data', 'risk assessment']
            patterns.forEach(pattern => {
              if (sourceContent.includes(pattern) && !targetContent.includes(pattern)) {
                opportunities.push({ id: generateId('reuse'), elementType: pattern.replace(/\s+/g, '-') as any, sourceQuestionId: sourceDraft.questionId, sourceContent: `Content from ${pattern} section`, targetQuestionIds: [targetDraft.questionId], similarity: 75, confidence: 60, suggestedAdaptations: ['Adjust product-specific references', 'Update data values'], estimatedTimeSavings: 15 })
              }
            })
          })
        })
        set({ reuseOpportunities: opportunities }, false, 'detectReuseOpportunities')
        return opportunities
      },
      
      applyReuseOpportunity: (opportunityId) => {
        set(state => ({ reuseOpportunities: state.reuseOpportunities.filter(o => o.id !== opportunityId) }), false, 'applyReuseOpportunity')
      },
      
      calculateQualityMetrics: (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) return null as unknown as CampaignQualityMetrics
        
        const haqStore = useHAQStore.getState()
        const questions = campaign.config.questionIds.map(id => haqStore.haqs.find(q => q.id === id)).filter(Boolean) as HAQuestion[]
        const scores = Object.values(campaign.questionProgress).map(p => p.qualityScore).filter((s): s is number => s !== undefined)
        
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        const minScore = scores.length > 0 ? Math.min(...scores) : 0
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0
        const variance = scores.length > 0 ? scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length : 0
        
        const byDiscipline: Record<HAQDiscipline, DisciplineMetrics> = {} as any
        questions.forEach(q => {
          if (!byDiscipline[q.discipline]) byDiscipline[q.discipline] = { questionCount: 0, averageScore: 0, completedCount: 0, pendingCount: 0, consistencyIssueCount: 0 }
          byDiscipline[q.discipline].questionCount++
          const progress = campaign.questionProgress[q.id]
          if (progress?.status === 'approved') byDiscipline[q.discipline].completedCount++
          else byDiscipline[q.discipline].pendingCount++
          byDiscipline[q.discipline].consistencyIssueCount += progress?.consistencyIssues?.length || 0
        })
        
        Object.keys(byDiscipline).forEach(disc => {
          const disciplineQuestionIds = questions.filter(q => q.discipline === disc).map(q => q.id)
          const disciplineScores = disciplineQuestionIds.map(id => campaign.questionProgress[id]?.qualityScore).filter((s): s is number => s !== undefined)
          byDiscipline[disc as HAQDiscipline].averageScore = disciplineScores.length > 0 ? disciplineScores.reduce((a, b) => a + b, 0) / disciplineScores.length : 0
        })
        
        const targets = campaign.config.qualityTargets
        const targetsDetail: QualityTargetStatus[] = [
          { target: 'Minimum Average Score', targetValue: targets.minAverageScore, currentValue: Math.round(avgScore), met: avgScore >= targets.minAverageScore, gap: Math.max(0, targets.minAverageScore - avgScore) },
          { target: 'Minimum Individual Score', targetValue: targets.minIndividualScore, currentValue: minScore, met: minScore >= targets.minIndividualScore, gap: Math.max(0, targets.minIndividualScore - minScore) },
          { target: 'Maximum Score Variance', targetValue: targets.maxScoreVariance, currentValue: Math.round(variance), met: variance <= targets.maxScoreVariance, gap: Math.max(0, variance - targets.maxScoreVariance) }
        ]
        
        const passedChecks = campaign.consistencyResults.filter(r => r.passed).length
        const totalChecks = campaign.consistencyResults.length
        const consistencyScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100
        const completedCount = Object.values(campaign.questionProgress).filter(p => p.status === 'approved').length
        const completenessScore = Math.round((completedCount / campaign.config.questionIds.length) * 100)
        
        const metrics: CampaignQualityMetrics = {
          timestamp: new Date().toISOString(), overallScore: Math.round((avgScore * 0.6) + (consistencyScore * 0.2) + (completenessScore * 0.2)),
          averageScore: Math.round(avgScore), minScore, maxScore, scoreVariance: Math.round(variance),
          scoreDistribution: calculateScoreDistribution(scores),
          byQuestion: Object.fromEntries(Object.entries(campaign.questionProgress).map(([qId, p]) => [qId, p.qualityScore || 0])),
          byDiscipline, consistencyScore, completenessScore,
          trendsOverTime: [...campaign.qualityMetrics.trendsOverTime, { timestamp: new Date().toISOString(), phase: campaign.currentPhase, averageScore: Math.round(avgScore), questionsCompleted: completedCount, consistencyIssueCount: campaign.consistencyResults.reduce((sum, r) => sum + r.issues.length, 0) }].slice(-20),
          targetsMet: targetsDetail.every(t => t.met), targetsDetail
        }
        
        set(state => ({ campaigns: { ...state.campaigns, [campaignId]: { ...state.campaigns[campaignId], qualityMetrics: metrics } } }), false, 'calculateQualityMetrics')
        return metrics
      },
      
      getDashboardData: (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        const qualityMetrics = get().calculateQualityMetrics(campaignId)
        const progressSummary = get().getProgressSummary(campaignId)
        const recommendations = get().getRecommendations(campaignId)
        const totalIssues = campaign.consistencyResults.reduce((sum, r) => sum + r.issues.length, 0)
        const resolvedIssues = campaign.consistencyResults.reduce((sum, r) => sum + r.issues.filter(i => i.resolved).length, 0)
        
        const consistencySummary: ConsistencySummary = {
          totalChecks: campaign.consistencyResults.length,
          passedCount: campaign.consistencyResults.filter(r => r.passed).length,
          failedCount: campaign.consistencyResults.filter(r => !r.passed).length,
          warningCount: campaign.consistencyResults.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0),
          autoFixedCount: campaign.consistencyResults.filter(r => r.autoFixApplied).length,
          pendingResolutionCount: totalIssues - resolvedIssues,
          byRule: Object.fromEntries(campaign.consistencyResults.map(r => [r.ruleId, { passed: r.passed ? 1 : 0, failed: r.passed ? 0 : 1, autoFixed: r.autoFixApplied ? 1 : 0 }]))
        }
        
        return { campaign, qualityMetrics, progressSummary, consistencySummary, recentActivity: get().activityLog.slice(-10), recommendations }
      },
      
      refineAllDrafts: async (campaignId, config) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        const questionIds = campaign.config.questionIds.filter(qId => campaign.questionProgress[qId]?.status === 'generated' || campaign.questionProgress[qId]?.status === 'reviewing')
        return get().refineDraftsForQuestions(campaignId, questionIds)
      },
      
      refineDraftsForQuestions: async (campaignId, questionIds) => {
        const startTime = Date.now()
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        set({ isProcessing: true, currentTask: 'Refining drafts', processingProgress: 0 }, false, 'refineDraftsForQuestions:start')
        
        const intelligenceStore = useResponseIntelligence.getState()
        const results: Array<{ questionId: string; initialScore: number; finalScore: number; iterations: number; suggestionsApplied: number }> = []
        
        for (let i = 0; i < questionIds.length; i++) {
          const questionId = questionIds[i]
          const draftId = campaign.activeDraftIds[questionId]
          if (!draftId) continue
          set({ processingProgress: Math.round(((i + 1) / questionIds.length) * 100), currentTask: `Refining ${i + 1}/${questionIds.length}` }, false, 'refineDraftsForQuestions:progress')
          get().updateQuestionProgress(campaignId, questionId, { status: 'refining' })
          
          try {
            const draft = campaign.drafts[draftId]
            const initialScore = draft?.initialScore?.overall || 0
            const cycle = await intelligenceStore.startRefinement(draftId)
            await intelligenceStore.applyAllSuggestions(draftId)
            const updatedDraft = intelligenceStore.getDraftsForQuestion(questionId).find(d => d.id === draftId)
            const finalScore = updatedDraft?.initialScore?.overall || initialScore
            results.push({ questionId, initialScore, finalScore, iterations: 1, suggestionsApplied: cycle?.changes?.length || 0 })
            get().updateQuestionProgress(campaignId, questionId, { status: 'reviewing', qualityScore: finalScore, refinementCount: (campaign.questionProgress[questionId]?.refinementCount || 0) + 1 })
          } catch { results.push({ questionId, initialScore: 0, finalScore: 0, iterations: 0, suggestionsApplied: 0 }) }
        }
        
        set({ isProcessing: false, processingProgress: 100, currentTask: 'Refinement complete' }, false, 'refineDraftsForQuestions:complete')
        const avgImprovement = results.length > 0 ? results.reduce((sum, r) => sum + (r.finalScore - r.initialScore), 0) / results.length : 0
        get().logActivity(campaignId, { type: 'refinement', description: `Refined ${results.length} draft(s), avg improvement: ${avgImprovement.toFixed(1)} pts` })
        return { campaignId, startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), questionsRefined: results.length, averageImprovement: avgImprovement, results }
      },
      
      generateSubmissionPackage: async (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        set({ isProcessing: true, currentTask: 'Generating submission package', processingProgress: 0 }, false, 'generateSubmissionPackage:start')
        
        const haqStore = useHAQStore.getState()
        const questions = campaign.config.questionIds.map(id => haqStore.haqs.find(q => q.id === id)).filter(Boolean) as HAQuestion[]
        
        set({ processingProgress: 25, currentTask: 'Creating response matrix' }, false, 'generateSubmissionPackage:matrix')
        const responseMatrix: ResponseMatrixEntry[] = questions.map((q, idx) => ({ questionId: q.id, questionNumber: q.questionNumber, discipline: q.discipline, ctdSection: q.ctdSection, questionSummary: q.questionText.substring(0, 100) + (q.questionText.length > 100 ? '...' : ''), responseLocation: `Section ${idx + 1}`, status: campaign.questionProgress[q.id]?.status === 'approved' ? 'included' : 'pending' }))
        
        set({ processingProgress: 50, currentTask: 'Packaging responses' }, false, 'generateSubmissionPackage:responses')
        const responses: PackagedResponse[] = questions.map((q, idx) => {
          const draftId = campaign.activeDraftIds[q.id]
          const draft = draftId ? campaign.drafts[draftId] : null
          return { questionId: q.id, questionNumber: q.questionNumber, discipline: q.discipline, ctdSection: q.ctdSection, questionText: q.questionText, responseText: draft?.content || q.responseText || '', qualityScore: campaign.questionProgress[q.id]?.qualityScore || 0, order: idx + 1 }
        })
        
        set({ processingProgress: 75, currentTask: 'Generating cover letter' }, false, 'generateSubmissionPackage:cover')
        let coverLetter: CampaignSubmissionPackage['coverLetter'] = undefined
        if (campaign.config.submissionPackaging.generateCoverLetter) {
          const approvedCount = Object.values(campaign.questionProgress).filter(p => p.status === 'approved').length
          coverLetter = { content: `Dear Regulatory Authority,\n\nWe submit our responses to ${campaign.config.questionIds.length} question(s). This package contains ${approvedCount} approved response(s).\n\n${campaign.config.name}\n\n[Organization Name]`, generatedAt: new Date().toISOString(), approved: false }
        }
        
        const auditTrail: CampaignAuditEntry[] = get().activityLog.filter(a => campaign.config.questionIds.includes(a.questionId || '')).map(a => ({ id: a.id, timestamp: a.timestamp, action: a.type, actor: a.actor, details: a.description, questionId: a.questionId }))
        
        const submissionPackage: CampaignSubmissionPackage = { id: generateId('package'), campaignId, createdAt: new Date().toISOString(), status: 'ready', coverLetter, responseMatrix: campaign.config.submissionPackaging.includeResponseMatrix ? responseMatrix : undefined, responses, auditTrail: campaign.config.submissionPackaging.includeAuditTrail ? auditTrail : undefined }
        
        set(state => ({ campaigns: { ...state.campaigns, [campaignId]: { ...state.campaigns[campaignId], submissionPackage, status: 'ready', currentPhase: 'complete', completedPhases: [...state.campaigns[campaignId].completedPhases, 'packaging'], updatedAt: new Date().toISOString() } }, isProcessing: false, processingProgress: 100, currentTask: 'Package ready' }), false, 'generateSubmissionPackage:complete')
        get().logActivity(campaignId, { type: 'packaging', description: `Submission package generated with ${responses.length} response(s)` })
        return submissionPackage
      },
      
      exportPackage: async (campaignId, format) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign?.submissionPackage) throw new Error('No package to export')
        const downloadUrls: string[] = []
        if (format === 'word' || format === 'both') downloadUrls.push(`/exports/${campaignId}/response-package.docx`)
        if (format === 'pdf' || format === 'both') downloadUrls.push(`/exports/${campaignId}/response-package.pdf`)
        set(state => ({ campaigns: { ...state.campaigns, [campaignId]: { ...state.campaigns[campaignId], submissionPackage: { ...state.campaigns[campaignId].submissionPackage!, status: 'exported', exportedAt: new Date().toISOString(), exportFormat: format, downloadUrls } } } }), false, 'exportPackage')
        return downloadUrls
      },
      
      advancePhase: (campaignId) => {
        const phaseOrder: CampaignPhase[] = ['initialization', 'element-collection', 'draft-generation', 'quality-assessment', 'consistency-validation', 'refinement', 'final-review', 'packaging', 'complete']
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          const currentIndex = phaseOrder.indexOf(campaign.currentPhase)
          if (currentIndex < phaseOrder.length - 1) return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, completedPhases: [...campaign.completedPhases, campaign.currentPhase], currentPhase: phaseOrder[currentIndex + 1], updatedAt: new Date().toISOString() } } }
          return state
        }, false, 'advancePhase')
      },
      
      rollbackPhase: (campaignId) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign || campaign.completedPhases.length === 0) return state
          const previousPhase = campaign.completedPhases[campaign.completedPhases.length - 1]
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, currentPhase: previousPhase, completedPhases: campaign.completedPhases.slice(0, -1), updatedAt: new Date().toISOString() } } }
        }, false, 'rollbackPhase')
      },
      
      setCampaignStatus: (campaignId, status) => {
        set(state => {
          const campaign = state.campaigns[campaignId]
          if (!campaign) return state
          return { campaigns: { ...state.campaigns, [campaignId]: { ...campaign, status, updatedAt: new Date().toISOString() } } }
        }, false, 'setCampaignStatus')
        get().logActivity(campaignId, { type: 'status-change', description: `Status changed to "${status}"` })
      },
      
      getProgressSummary: (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) throw new Error('Campaign not found')
        const haqStore = useHAQStore.getState()
        const questions = campaign.config.questionIds.map(id => haqStore.haqs.find(q => q.id === id)).filter(Boolean) as HAQuestion[]
        const progress = Object.values(campaign.questionProgress)
        const byDiscipline: Record<HAQDiscipline, { total: number; completed: number; progress: number }> = {} as any
        questions.forEach(q => {
          if (!byDiscipline[q.discipline]) byDiscipline[q.discipline] = { total: 0, completed: 0, progress: 0 }
          byDiscipline[q.discipline].total++
          if (campaign.questionProgress[q.id]?.status === 'approved') byDiscipline[q.discipline].completed++
        })
        Object.keys(byDiscipline).forEach(disc => { byDiscipline[disc as HAQDiscipline].progress = Math.round((byDiscipline[disc as HAQDiscipline].completed / byDiscipline[disc as HAQDiscipline].total) * 100) })
        const approvedCount = progress.filter(p => p.status === 'approved').length
        return { totalQuestions: campaign.config.questionIds.length, pendingCount: progress.filter(p => p.status === 'pending').length, generatingCount: progress.filter(p => p.status === 'generating').length, reviewingCount: progress.filter(p => ['generated', 'reviewing', 'refining'].includes(p.status)).length, approvedCount, failedCount: progress.filter(p => p.status === 'failed').length, overallProgress: Math.round((approvedCount / campaign.config.questionIds.length) * 100), byDiscipline }
      },
      
      getRecommendations: (campaignId) => {
        const campaign = get().campaigns[campaignId]
        if (!campaign) return []
        const recommendations: CampaignRecommendation[] = []
        const metrics = campaign.qualityMetrics
        
        if (metrics.averageScore < campaign.config.qualityTargets.minAverageScore) {
          recommendations.push({ id: generateId('rec'), type: 'quality', priority: 'high', title: 'Average score below target', description: `Current average (${metrics.averageScore}) is below target (${campaign.config.qualityTargets.minAverageScore})`, action: 'Run bulk refinement', estimatedImpact: '+5-10 points average' })
        }
        if (metrics.minScore < campaign.config.qualityTargets.minIndividualScore) {
          const lowScoreQuestions = Object.entries(metrics.byQuestion).filter(([_, score]) => score < campaign.config.qualityTargets.minIndividualScore).map(([qId]) => qId)
          recommendations.push({ id: generateId('rec'), type: 'quality', priority: 'high', title: 'Questions below minimum score', description: `${lowScoreQuestions.length} question(s) below threshold`, affectedQuestions: lowScoreQuestions, action: 'Focus refinement on low-scoring questions' })
        }
        const unresolvedIssues = campaign.consistencyResults.flatMap(r => r.issues).filter(i => !i.resolved)
        if (unresolvedIssues.length > 0) {
          recommendations.push({ id: generateId('rec'), type: 'consistency', priority: unresolvedIssues.some(i => i.severity === 'error') ? 'high' : 'medium', title: 'Unresolved consistency issues', description: `${unresolvedIssues.length} issue(s) need resolution`, action: 'Review and resolve issues', affectedQuestions: Array.from(new Set(unresolvedIssues.flatMap(i => i.questionIds))) })
        }
        const reuseOpportunities = get().reuseOpportunities.filter(o => campaign.config.questionIds.includes(o.sourceQuestionId))
        if (reuseOpportunities.length > 0) {
          const totalTimeSavings = reuseOpportunities.reduce((sum, o) => sum + o.estimatedTimeSavings, 0)
          recommendations.push({ id: generateId('rec'), type: 'efficiency', priority: 'low', title: 'Content reuse opportunities', description: `${reuseOpportunities.length} opportunity(ies) to reuse content`, action: 'Apply shared elements', estimatedImpact: `Save ~${totalTimeSavings} minutes` })
        }
        if (campaign.config.deadline) {
          const deadline = new Date(campaign.config.deadline)
          const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          const progressSummary = get().getProgressSummary(campaignId)
          if (daysRemaining <= 3 && progressSummary.overallProgress < 80) {
            recommendations.push({ id: generateId('rec'), type: 'deadline', priority: 'high', title: 'Deadline approaching', description: `${daysRemaining} day(s) remaining, ${100 - progressSummary.overallProgress}% incomplete`, action: 'Prioritize remaining questions' })
          }
        }
        return recommendations
      },
      
      logActivity: (campaignId, activity) => {
        const entry: CampaignActivity = { id: `${campaignId}-${generateId('activity')}`, timestamp: new Date().toISOString(), ...activity, details: { ...activity.details, campaignId } }
        set(state => ({ activityLog: [...state.activityLog.slice(-99), entry] }), false, 'logActivity')
      }
    }),
    { name: 'ResponseCampaign' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useActiveCampaign = () => {
  const campaigns = useResponseCampaign(state => state.campaigns)
  const activeId = useResponseCampaign(state => state.activeCampaignId)
  return useMemo(() => activeId ? campaigns[activeId] : null, [campaigns, activeId])
}

export const useCampaignList = () => useResponseCampaign(state => Object.values(state.campaigns))

export const useCampaignProgress = (campaignId: string) => {
  const campaign = useResponseCampaign(state => state.campaigns[campaignId])
  return useMemo(() => campaign?.questionProgress || {}, [campaign])
}

export const useCampaignQuality = (campaignId: string) => {
  const campaign = useResponseCampaign(state => state.campaigns[campaignId])
  return useMemo(() => campaign?.qualityMetrics || null, [campaign])
}

export const useCampaignConsistency = (campaignId: string) => {
  const campaign = useResponseCampaign(state => state.campaigns[campaignId])
  return useMemo(() => campaign?.consistencyResults || [], [campaign])
}

export const useProcessingStatus = () => useResponseCampaign(useShallow(state => ({
  isProcessing: state.isProcessing,
  progress: state.processingProgress,
  task: state.currentTask,
  error: state.lastError
})))

export const useReuseOpportunities = () => useResponseCampaign(state => state.reuseOpportunities)
