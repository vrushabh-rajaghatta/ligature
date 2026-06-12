

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'
import type { HAQuestion } from '@/types/haq'
import type { ResponseElement } from './useHAQAnalytics'
import type { ResponseTemplate, TemplateVariable } from './useResponseTemplates'
import type { CompletenessScore, GapAnalysis, ReviewerPersona, ElementAssessment } from './useReviewerSimulation'
import { useHAQStore } from './useHAQStore'
import { useResponseTemplates } from './useResponseTemplates'
import { useReviewerSimulation } from './useReviewerSimulation'
import type {
  DraftGenerationConfig, GeneratedDraft, DraftSection, DraftSource,
  TemplateCandidate, MatchReason, CoverageAnalysis, ComponentCandidate,
  RefinementCycle, RefinementChange, RefinementSuggestion,
  QualityCheckpoint, CoachingSession, CoachingGuidance,
  OrchestrationJob, OrchestrationStep
} from './responseIntelligenceTypes'

// Re-export types
export type {
  DraftGenerationConfig, GeneratedDraft, DraftSection, DraftSource,
  TemplateCandidate, MatchReason, CoverageAnalysis, ComponentCandidate,
  RefinementCycle, RefinementChange, RefinementSuggestion,
  QualityCheckpoint, CoachingSession, CoachingGuidance,
  OrchestrationJob, OrchestrationStep
} from './responseIntelligenceTypes'

// ============================================================================
// STORE STATE
// ============================================================================

interface ResponseIntelligenceState {
  drafts: Record<string, GeneratedDraft>
  draftsByQuestion: Record<string, string[]>
  templateCandidates: Record<string, TemplateCandidate[]>
  componentCandidates: Record<string, ComponentCandidate[]>
  refinementCycles: Record<string, RefinementCycle[]>
  pendingSuggestions: Record<string, RefinementSuggestion[]>
  checkpoints: Record<string, QualityCheckpoint[]>
  coachingSessions: Record<string, CoachingSession>
  activeCoachingSessionId: string | null
  jobs: OrchestrationJob[]
  activeJobId: string | null
  selectedDraftId: string | null
  isGenerating: boolean
  generationProgress: number
  lastError: string | null
}

interface ResponseIntelligenceActions {
  generateDraft: (config: DraftGenerationConfig) => Promise<GeneratedDraft>
  quickGenerate: (questionId: string) => Promise<GeneratedDraft>
  getDraftsForQuestion: (questionId: string) => GeneratedDraft[]
  deleteDraft: (draftId: string) => void
  applyDraft: (draftId: string) => void
  getTemplateCandidates: (questionId: string) => TemplateCandidate[]
  getComponentCandidates: (questionId: string, gaps: ResponseElement[]) => ComponentCandidate[]
  refreshTemplateAnalysis: (questionId: string) => void
  startRefinement: (draftId: string) => Promise<RefinementCycle>
  applyChange: (draftId: string, change: RefinementChange) => void
  applyAllSuggestions: (draftId: string) => Promise<void>
  getRefinementSuggestions: (draftId: string) => RefinementSuggestion[]
  dismissSuggestion: (draftId: string, suggestionId: string) => void
  getRefinementHistory: (draftId: string) => RefinementCycle[]
  createCheckpoint: (draftId: string) => QualityCheckpoint
  getCheckpoints: (draftId: string) => QualityCheckpoint[]
  compareCheckpoints: (id1: string, id2: string) => { contentDiff: string; scoreDiff: number; improvements: string[]; regressions: string[] }
  startCoachingSession: (questionId: string, initialContent?: string) => CoachingSession
  updateCoachingContent: (sessionId: string, content: string) => void
  getCoachingGuidance: (sessionId: string) => CoachingGuidance[]
  endCoachingSession: (sessionId: string) => void
  getActiveCoachingSession: () => CoachingSession | null
  queueJob: (job: Omit<OrchestrationJob, 'id' | 'status' | 'progress' | 'steps' | 'queuedAt'>) => string
  cancelJob: (jobId: string) => void
  getJobStatus: (jobId: string) => OrchestrationJob | null
  clearCaches: () => void
  selectDraft: (draftId: string | null) => void
  getGenerationProgress: () => { isGenerating: boolean; progress: number; step: string }
}

type ResponseIntelligenceStore = ResponseIntelligenceState & ResponseIntelligenceActions

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function calculateTemplateMatchScore(
  template: ResponseTemplate,
  question: HAQuestion,
  gaps: GapAnalysis
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  let totalScore = 0
  
  const disciplineMatch = template.disciplines.includes(question.discipline)
  const disciplineScore = disciplineMatch ? 100 : 30
  reasons.push({ factor: 'Discipline Match', weight: 0.25, score: disciplineScore, details: disciplineMatch ? `Template designed for ${question.discipline}` : 'Template for different discipline' })
  totalScore += disciplineScore * 0.25
  
  const sectionMatch = template.ctdSections.some(s => question.ctdSection?.startsWith(s) || s.startsWith(question.ctdSection || ''))
  const sectionScore = sectionMatch ? 100 : 40
  reasons.push({ factor: 'CTD Section', weight: 0.20, score: sectionScore, details: sectionMatch ? `Covers CTD section ${question.ctdSection}` : 'Different CTD section' })
  totalScore += sectionScore * 0.20
  
  const agencyMatch = template.agencies.includes(question.source)
  const agencyScore = agencyMatch ? 100 : 60
  reasons.push({ factor: 'Agency', weight: 0.15, score: agencyScore, details: agencyMatch ? `Optimized for ${question.source}` : 'Different agency origin' })
  totalScore += agencyScore * 0.15
  
  const requiredGaps = gaps.requiredElements.filter(e => e.status !== 'present')
  const coveredGaps = requiredGaps.filter(g => template.responseElements.includes(g.element))
  const gapCoverage = requiredGaps.length > 0 ? (coveredGaps.length / requiredGaps.length) * 100 : 80
  reasons.push({ factor: 'Gap Coverage', weight: 0.25, score: gapCoverage, details: `Addresses ${coveredGaps.length}/${requiredGaps.length} required elements` })
  totalScore += gapCoverage * 0.25
  
  const successScore = template.successRate
  reasons.push({ factor: 'Historical Success', weight: 0.15, score: successScore, details: `${successScore}% success rate from ${template.usageCount} uses` })
  totalScore += successScore * 0.15
  
  return { score: Math.round(totalScore), reasons }
}

function analyzeTemplateCoverage(template: ResponseTemplate, gaps: GapAnalysis): CoverageAnalysis {
  const allGapElements = [...gaps.requiredElements, ...gaps.expectedElements, ...gaps.recommendedElements].filter(e => e.status !== 'present')
  const elementsAddressed = template.responseElements.filter(elem => allGapElements.some(g => g.element === elem))
  const elementsMissing = allGapElements.filter(g => !template.responseElements.includes(g.element)).map(g => g.element)
  
  return {
    elementsAddressed,
    elementsMissing,
    gapsCovered: elementsAddressed.length,
    gapsRemaining: elementsMissing.length,
    coveragePercent: allGapElements.length > 0 ? Math.round((elementsAddressed.length / allGapElements.length) * 100) : 100
  }
}

function getVariableValue(variable: TemplateVariable, question: HAQuestion): string {
  const name = variable.name.toLowerCase()
  if (name.includes('product') || name.includes('drug')) return question.productName || variable.defaultValue || '[Product Name]'
  if (name.includes('application') || name.includes('nda') || name.includes('bla')) return question.applicationNumber || variable.defaultValue || '[Application Number]'
  if (name.includes('section') || name.includes('ctd')) return question.ctdSection || variable.defaultValue || '[CTD Section]'
  if (name.includes('date')) return new Date().toISOString().split('T')[0]
  return variable.defaultValue || `[${variable.displayName}]`
}

function generateGapFillerSection(gap: ElementAssessment, question: HAQuestion): { name: string; content: string } {
  const elementName = gap.element.replace(/-/g, ' ')
  const capitalizedName = elementName.charAt(0).toUpperCase() + elementName.slice(1)
  
  const templates: Record<ResponseElement, { name: string; content: string }> = {
    'data-tables': { name: 'Supporting Data', content: `The following data tables summarize the relevant findings:\n\n[Table 1: ${capitalizedName} Summary]\n| Parameter | Value | Reference |\n|-----------|-------|----------|\n| [Parameter 1] | [Value] | [Reference] |\n\nThese data demonstrate [key conclusion].` },
    'statistical-analysis': { name: 'Statistical Analysis', content: `A statistical analysis was conducted to evaluate [objective].\n\n**Methods:** [Statistical method] was applied with [parameters].\n\n**Results:** The analysis demonstrated [key finding] (p < 0.05, 95% CI: [range]).\n\n**Conclusion:** These results support [conclusion].` },
    'literature-references': { name: 'Literature Support', content: `The following literature supports the approach taken:\n\n1. [Author et al., Year] demonstrated that [finding].\n2. [Author et al., Year] reported [finding].\n\nThese references collectively support [conclusion].` },
    'mechanism-explanation': { name: 'Mechanism of Action', content: `The mechanism underlying [observation] can be explained as follows:\n\n${question.productName || '[Product]'} acts by [primary mechanism]. This results in [downstream effect], which accounts for [observed outcome].` },
    'risk-assessment': { name: 'Risk Assessment', content: `A comprehensive risk assessment has been conducted:\n\n**Identified Risks:**\n- [Risk 1]: [Description and likelihood]\n- [Risk 2]: [Description and likelihood]\n\n**Mitigation Strategies:**\n- [Strategy 1]\n- [Strategy 2]\n\n**Residual Risk:** The overall residual risk is considered [acceptable/low] based on [rationale].` },
    'regulatory-precedent': { name: 'Regulatory Precedent', content: `The approach is supported by regulatory precedent:\n\n- [Product A] (NDA XXXXXX) received approval with similar [approach/data].\n- FDA guidance [Title] recommends [relevant guidance].\n\nThis precedent supports the acceptability of the current approach.` },
    'clinical-justification': { name: 'Clinical Justification', content: `The clinical justification for [decision/approach] is based on:\n\n**Efficacy Considerations:**\n[Efficacy rationale with supporting data]\n\n**Safety Considerations:**\n[Safety rationale with supporting data]\n\n**Benefit-Risk Assessment:**\nThe benefit-risk profile supports [conclusion] based on [key factors].` },
    'process-description': { name: 'Process Description', content: `The manufacturing process consists of the following steps:\n\n**Step 1: [Step Name]**\n- Input materials: [Materials]\n- Process parameters: [Parameters with ranges]\n- In-process controls: [Controls]\n\nCritical process parameters and quality attributes are monitored to ensure consistent product quality.` },
    'comparability-data': { name: 'Comparability Assessment', content: `A comparability study was conducted to demonstrate equivalence:\n\n**Study Design:**\n[Description of comparability approach]\n\n**Results:**\n| Attribute | Pre-Change | Post-Change | Acceptance Criteria |\n|-----------|------------|-------------|--------------------|\n| [Attr 1]  | [Value]    | [Value]     | [Criteria]         |\n\n**Conclusion:** The data demonstrate comparability based on [criteria].` },
    'stability-data': { name: 'Stability Data', content: `Stability studies support the proposed [shelf life/storage conditions]:\n\n**Study Conditions:** [ICH conditions]\n**Duration:** [X months]\n\n**Results Summary:**\n| Time Point | [Parameter 1] | [Parameter 2] |\n|------------|---------------|---------------|\n| Initial    | [Value]       | [Value]       |\n| [X] months | [Value]       | [Value]       |\n\nAll results remained within specification throughout the study period.` },
    'validation-data': { name: 'Validation Summary', content: `Method validation was performed according to ICH Q2(R1):\n\n**Validated Parameters:**\n- Specificity: [Result]\n- Linearity: R² = [Value] over range [X-Y]\n- Accuracy: [Recovery %] at [levels]\n- Precision: RSD = [Value]%\n\nAll validation criteria were met, demonstrating the method is suitable for its intended purpose.` },
    'expert-opinion': { name: 'Expert Assessment', content: `Based on expert evaluation of the available data:\n\n[Expert assessment and rationale]\n\nThis opinion is supported by [relevant experience/data/precedent] and is consistent with current scientific understanding of [relevant topic].` }
  }
  
  return templates[gap.element] || { name: capitalizedName, content: `[Please provide ${elementName} to address this requirement.]\n\n${gap.guidance?.description || ''}` }
}

function generateDraftFromTemplate(
  template: ResponseTemplate,
  question: HAQuestion,
  gaps: GapAnalysis,
  config: DraftGenerationConfig
): { content: string; sections: DraftSection[]; variablesFilled: Record<string, string> } {
  const sections: DraftSection[] = []
  const variablesFilled: Record<string, string> = {}
  let content = ''
  
  template.sections.forEach((section, idx) => {
    let sectionContent = section.content
    section.variables.forEach(variable => {
      const value = getVariableValue(variable, question)
      variablesFilled[variable.name] = value
      sectionContent = sectionContent.replace(new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'), value)
    })
    
    sections.push({
      id: generateId('section'),
      name: section.name,
      order: idx,
      content: sectionContent,
      sourceType: 'template',
      sourceId: template.id,
      elements: template.responseElements.filter(e => sectionContent.toLowerCase().includes(e.replace(/-/g, ' '))),
      isEditable: true,
      isRequired: section.required
    })
    
    if (sectionContent.trim()) content += `## ${section.name}\n\n${sectionContent}\n\n`
  })
  
  if (config.contentPreferences.targetLength === 'comprehensive') {
    const uncoveredGaps = gaps.requiredElements.filter(g => g.status !== 'present' && !template.responseElements.includes(g.element))
    uncoveredGaps.forEach((gap, idx) => {
      const gapSection = generateGapFillerSection(gap, question)
      sections.push({ id: generateId('section'), name: gapSection.name, order: template.sections.length + idx, content: gapSection.content, sourceType: 'generated', elements: [gap.element], isEditable: true, isRequired: true })
      content += `## ${gapSection.name}\n\n${gapSection.content}\n\n`
    })
  }
  
  return { content: content.trim(), sections, variablesFilled }
}

function generatePatternBasedDraft(question: HAQuestion, gaps: GapAnalysis, config: DraftGenerationConfig): string {
  const sections: string[] = []
  sections.push(`In response to the Agency's question regarding ${question.ctdSection || 'the submission'}, the Sponsor provides the following information.`)
  
  gaps.requiredElements.filter(e => e.status !== 'present').forEach(gap => {
    const gapContent = generateGapFillerSection(gap, question)
    sections.push(`\n## ${gapContent.name}\n\n${gapContent.content}`)
  })
  
  sections.push('\n## Conclusion\n\nBased on the information provided above, the Sponsor believes this response adequately addresses the Agency\'s question. Please contact us if additional clarification is needed.')
  return sections.join('\n')
}

function generateRefinementSuggestions(draft: GeneratedDraft, score: CompletenessScore, gaps: GapAnalysis, persona: ReviewerPersona | null): RefinementSuggestion[] {
  const suggestions: RefinementSuggestion[] = []
  
  Object.entries(score.dimensions).forEach(([dimKey, dim]) => {
    if (dim.score < 70) {
      dim.suggestions.forEach(s => {
        suggestions.push({ id: generateId('sug'), priority: s.priority === 'critical' ? 'critical' : s.priority === 'recommended' ? 'high' : 'medium', type: 'expand-section', suggestion: s.action, rationale: s.rationale, basedOn: 'gap-analysis', expectedScoreImprovement: Math.min(15, 70 - dim.score), affectedDimensions: [dimKey], canAutoApply: false })
      })
    }
  })
  
  gaps.requiredElements.filter(e => e.status !== 'present').forEach(gap => {
    suggestions.push({ id: generateId('sug'), priority: 'critical', type: 'add-content', targetElement: gap.element, suggestion: `Add ${gap.element.replace(/-/g, ' ')} to address required element`, rationale: gap.guidance?.description || 'Required for regulatory acceptance', basedOn: 'gap-analysis', expectedScoreImprovement: 10, affectedDimensions: ['completeness', 'contentCoverage'], canAutoApply: true, autoApplyContent: generateGapFillerSection(gap, {} as HAQuestion).content })
  })
  
  if (persona) {
    persona.responseExpectations.petPeeves.forEach(peeve => {
      if (draft.content.length < 500 && peeve.toLowerCase().includes('vague')) {
        suggestions.push({ id: generateId('sug'), priority: 'high', type: 'expand-section', suggestion: 'Add more specific details and data to avoid vagueness', rationale: `${persona.name} notes: "${peeve}"`, basedOn: 'reviewer-feedback', expectedScoreImprovement: 8, affectedDimensions: ['clarity', 'evidenceQuality'], canAutoApply: false })
      }
    })
  }
  
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  return suggestions
}

function generateCoachingGuidance(content: string, score: CompletenessScore, gaps: GapAnalysis, targetScore: number): CoachingGuidance[] {
  const guidance: CoachingGuidance[] = []
  
  if (content.length < 200) {
    guidance.push({ id: generateId('guide'), type: 'warning', message: 'Response is too brief', details: 'Most successful responses are at least 500-1000 words. Consider expanding with supporting data and rationale.', actionable: true, action: 'Add more detail', dismissible: true })
  }
  
  const missingRequired = gaps.requiredElements.filter(e => e.status === 'missing')
  if (missingRequired.length > 0) {
    guidance.push({ id: generateId('guide'), type: 'requirement', message: `Missing ${missingRequired.length} required element(s)`, details: `Add: ${missingRequired.map(e => e.element.replace(/-/g, ' ')).join(', ')}`, actionable: true, action: 'Add required elements', dismissible: false })
  }
  
  if (score.overall < targetScore) {
    guidance.push({ id: generateId('guide'), type: 'tip', message: `${targetScore - score.overall} points below target score`, details: 'Focus on the lowest-scoring dimensions to improve overall score.', actionable: true, action: 'View suggestions', dismissible: true })
  }
  
  const lowestDimension = Object.entries(score.dimensions).sort(([, a], [, b]) => a.score - b.score)[0]
  if (lowestDimension && lowestDimension[1].score < 60) {
    guidance.push({ id: generateId('guide'), type: 'suggestion', message: `Improve ${lowestDimension[0].replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`, details: `This dimension scores ${lowestDimension[1].score}/100. ${lowestDimension[1].suggestions[0]?.action || 'Consider strengthening this area.'}`, actionable: true, action: 'Apply suggestion', dismissible: true })
  }
  
  return guidance
}

function createDefaultScore(): CompletenessScore {
  return {
    overall: 0,
    confidence: 'low',
    dimensions: {
      contentCoverage: { score: 0, weight: 0.2, findings: [], suggestions: [] },
      evidenceQuality: { score: 0, weight: 0.2, findings: [], suggestions: [] },
      regulatoryAlignment: { score: 0, weight: 0.2, findings: [], suggestions: [] },
      clarity: { score: 0, weight: 0.2, findings: [], suggestions: [] },
      completeness: { score: 0, weight: 0.2, findings: [], suggestions: [] }
    },
    predictedOutcome: { mostLikely: 'rejected', probability: 0, alternativeOutcomes: [] },
    benchmarkComparison: { percentile: 0, avgSuccessfulScore: 75, gap: 75 }
  }
}

function createDefaultGaps(questionId: string): GapAnalysis {
  return {
    questionId,
    analysisDate: new Date().toISOString(),
    requiredElements: [],
    expectedElements: [],
    recommendedElements: [],
    summary: { requiredMet: 0, requiredTotal: 0, expectedMet: 0, expectedTotal: 0, overallReadiness: 'not-ready' }
  }
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useResponseIntelligence = create<ResponseIntelligenceStore>()(
  devtools(
    (set, get) => ({
      drafts: {},
      draftsByQuestion: {},
      templateCandidates: {},
      componentCandidates: {},
      refinementCycles: {},
      pendingSuggestions: {},
      checkpoints: {},
      coachingSessions: {},
      activeCoachingSessionId: null,
      jobs: [],
      activeJobId: null,
      selectedDraftId: null,
      isGenerating: false,
      generationProgress: 0,
      lastError: null,
      
      generateDraft: async (config) => {
        const startTime = Date.now()
        const draftId = generateId('draft')
        
        set({ isGenerating: true, generationProgress: 0, lastError: null }, false, 'generateDraft:start')
        
        try {
          set({ generationProgress: 10 }, false, 'generateDraft:getQuestion')
          const haqStore = useHAQStore.getState()
          const question = haqStore.haqs.find(q => q.id === config.questionId)
          if (!question) throw new Error(`Question ${config.questionId} not found`)
          
          set({ generationProgress: 30 }, false, 'generateDraft:analyzeGaps')
          const simStore = useReviewerSimulation.getState()
          const gaps = simStore.detectGaps(config.questionId, question.responseText || '')
          
          set({ generationProgress: 50 }, false, 'generateDraft:getTemplates')
          const candidates = get().getTemplateCandidates(config.questionId)
          
          set({ generationProgress: 60 }, false, 'generateDraft:selectTemplate')
          const selectedTemplate = candidates.find(c => c.recommended)?.template || candidates[0]?.template
          
          set({ generationProgress: 80 }, false, 'generateDraft:generateContent')
          let content: string, sections: DraftSection[], variablesFilled: Record<string, string> = {}
          const sources: DraftSource[] = []
          
          if (selectedTemplate && config.strategy !== 'pattern-based') {
            const generated = generateDraftFromTemplate(selectedTemplate, question, gaps, config)
            content = generated.content
            sections = generated.sections
            variablesFilled = generated.variablesFilled
            sources.push({ type: 'template', id: selectedTemplate.id, name: selectedTemplate.name, contribution: 'Primary structure and content', confidence: candidates[0]?.matchScore || 70 })
          } else {
            content = generatePatternBasedDraft(question, gaps, config)
            sections = [{ id: generateId('section'), name: 'Response', order: 0, content, sourceType: 'pattern', elements: config.contentPreferences.includeElements, isEditable: true, isRequired: true }]
            sources.push({ type: 'pattern', id: 'pattern-analysis', name: 'Historical Patterns', contribution: 'Content structure derived from successful responses', confidence: 60 })
          }
          
          set({ generationProgress: 90 }, false, 'generateDraft:assess')
          const initialScore = simStore.analyzeResponseCompleteness(config.questionId, content)
          const initialGaps = simStore.detectGaps(config.questionId, content)
          
          const draft: GeneratedDraft = {
            id: draftId, questionId: config.questionId, configId: generateId('config'), content, sections, generatedAt: new Date().toISOString(),
            strategy: config.strategy, generationTimeMs: Date.now() - startTime, sources,
            templateAttribution: { primaryTemplateId: selectedTemplate?.id, primaryTemplateName: selectedTemplate?.name, componentIds: [], variablesFilled },
            initialScore, initialGaps, status: 'generated'
          }
          
          set(state => ({
            drafts: { ...state.drafts, [draftId]: draft },
            draftsByQuestion: { ...state.draftsByQuestion, [config.questionId]: [...(state.draftsByQuestion[config.questionId] || []), draftId] },
            isGenerating: false, generationProgress: 100
          }), false, 'generateDraft:complete')
          
          const persona = config.targetPersonaId ? simStore.personas.find(p => p.id === config.targetPersonaId) : simStore.getPersonaForQuestion(question)
          const suggestions = generateRefinementSuggestions(draft, initialScore, initialGaps, persona || null)
          set(state => ({ pendingSuggestions: { ...state.pendingSuggestions, [draftId]: suggestions } }), false, 'generateDraft:suggestions')
          
          return draft
        } catch (error) {
          set({ isGenerating: false, lastError: error instanceof Error ? error.message : 'Unknown error' }, false, 'generateDraft:error')
          throw error
        }
      },
      
      quickGenerate: async (questionId) => {
        const config: DraftGenerationConfig = {
          questionId, strategy: 'hybrid',
          templatePreferences: { minMatchScore: 50, maxTemplates: 5 },
          contentPreferences: { targetLength: 'moderate', tone: 'formal', includeElements: ['data-tables', 'clinical-justification', 'risk-assessment'] },
          qualityTargets: { minCompletenessScore: 70, minAcceptanceProbability: 60, maxIterations: 3 }
        }
        return get().generateDraft(config)
      },
      
      getDraftsForQuestion: (questionId) => {
        const { drafts, draftsByQuestion } = get()
        return (draftsByQuestion[questionId] || []).map(id => drafts[id]).filter(Boolean)
      },
      
      deleteDraft: (draftId) => {
        const draft = get().drafts[draftId]
        if (!draft) return
        set(state => {
          const newDrafts = { ...state.drafts }; delete newDrafts[draftId]
          const newDraftsByQuestion = { ...state.draftsByQuestion }
          if (newDraftsByQuestion[draft.questionId]) newDraftsByQuestion[draft.questionId] = newDraftsByQuestion[draft.questionId].filter(id => id !== draftId)
          const newSuggestions = { ...state.pendingSuggestions }; delete newSuggestions[draftId]
          const newCycles = { ...state.refinementCycles }; delete newCycles[draftId]
          const newCheckpoints = { ...state.checkpoints }; delete newCheckpoints[draftId]
          return { drafts: newDrafts, draftsByQuestion: newDraftsByQuestion, pendingSuggestions: newSuggestions, refinementCycles: newCycles, checkpoints: newCheckpoints, selectedDraftId: state.selectedDraftId === draftId ? null : state.selectedDraftId }
        }, false, 'deleteDraft')
      },
      
      applyDraft: (draftId) => {
        const draft = get().drafts[draftId]
        if (!draft) return
        const haqStore = useHAQStore.getState()
        if (typeof (haqStore as any).updateHAQ === 'function') {
          (haqStore as any).updateHAQ(draft.questionId, { responseText: draft.content })
        }
        set(state => ({ drafts: { ...state.drafts, [draftId]: { ...draft, status: 'applied', appliedAt: new Date().toISOString() } } }), false, 'applyDraft')
      },
      
      getTemplateCandidates: (questionId) => {
        const cached = get().templateCandidates[questionId]
        if (cached) return cached
        
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(q => q.id === questionId)
        if (!question) return []
        
        const simStore = useReviewerSimulation.getState()
        let gaps: GapAnalysis
        try { gaps = simStore.detectGaps(questionId, question.responseText || '') } 
        catch { gaps = createDefaultGaps(questionId) }
        
        const templateStore = useResponseTemplates.getState()
        const templates = templateStore.templates.filter(t => t.status === 'active')
        
        const candidates: TemplateCandidate[] = templates.map(template => {
          const { score, reasons } = calculateTemplateMatchScore(template, question, gaps)
          const coverage = analyzeTemplateCoverage(template, gaps)
          return { template, matchScore: score, matchReasons: reasons, coverageAnalysis: coverage, estimatedCompleteness: Math.min(100, score * 0.7 + coverage.coveragePercent * 0.3), rank: 0, recommended: false }
        })
        
        candidates.sort((a, b) => b.matchScore - a.matchScore)
        candidates.forEach((c, idx) => { c.rank = idx + 1; c.recommended = idx === 0 && c.matchScore >= 60 })
        
        set(state => ({ templateCandidates: { ...state.templateCandidates, [questionId]: candidates } }), false, 'getTemplateCandidates:cache')
        return candidates
      },
      
      getComponentCandidates: (questionId, gapsToFill) => {
        const cached = get().componentCandidates[questionId]
        if (cached) return cached
        
        const templateStore = useResponseTemplates.getState()
        const candidates: ComponentCandidate[] = templateStore.components
          .filter(comp => comp.responseElements.some(elem => gapsToFill.includes(elem)))
          .map(component => ({ component, matchScore: (component.responseElements.filter(elem => gapsToFill.includes(elem)).length / gapsToFill.length) * 100, fillsGap: component.responseElements.filter(elem => gapsToFill.includes(elem)), recommended: false }))
          .sort((a, b) => b.matchScore - a.matchScore)
        
        candidates.forEach(c => { c.recommended = c.matchScore >= 50 })
        set(state => ({ componentCandidates: { ...state.componentCandidates, [questionId]: candidates } }), false, 'getComponentCandidates:cache')
        return candidates
      },
      
      refreshTemplateAnalysis: (questionId) => {
        set(state => {
          const newCandidates = { ...state.templateCandidates }; delete newCandidates[questionId]
          const newComponentCandidates = { ...state.componentCandidates }; delete newComponentCandidates[questionId]
          return { templateCandidates: newCandidates, componentCandidates: newComponentCandidates }
        }, false, 'refreshTemplateAnalysis')
        get().getTemplateCandidates(questionId)
      },
      
      startRefinement: async (draftId) => {
        const draft = get().drafts[draftId]
        if (!draft) throw new Error('Draft not found')
        
        const cycleNumber = (get().refinementCycles[draftId]?.length || 0) + 1
        const simStore = useReviewerSimulation.getState()
        const inputScore = simStore.analyzeResponseCompleteness(draft.questionId, draft.content)
        
        const cycle: RefinementCycle = {
          id: generateId('cycle'), draftId, cycleNumber, inputContent: draft.content, inputScore, changes: [], outputContent: draft.content, outputScore: inputScore,
          improvement: { scoreChange: 0, dimensionChanges: {}, gapsAddressed: [] }, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 0, status: 'in-progress'
        }
        
        set(state => ({ refinementCycles: { ...state.refinementCycles, [draftId]: [...(state.refinementCycles[draftId] || []), cycle] } }), false, 'startRefinement')
        return cycle
      },
      
      applyChange: (draftId, change) => {
        const draft = get().drafts[draftId]
        if (!draft) return
        
        let newContent = draft.content
        if (change.type === 'addition' && change.newContent) newContent = draft.content + '\n\n' + change.newContent
        else if (change.type === 'modification' && change.originalContent && change.newContent) newContent = draft.content.replace(change.originalContent, change.newContent)
        else if (change.type === 'deletion' && change.originalContent) newContent = draft.content.replace(change.originalContent, '')
        
        set(state => ({ drafts: { ...state.drafts, [draftId]: { ...draft, content: newContent, status: 'refined' } } }), false, 'applyChange')
        
        const cycles = get().refinementCycles[draftId]
        if (cycles && cycles.length > 0) {
          const currentCycle = cycles[cycles.length - 1]
          set(state => ({ refinementCycles: { ...state.refinementCycles, [draftId]: [...cycles.slice(0, -1), { ...currentCycle, changes: [...currentCycle.changes, { ...change, applied: true }], outputContent: newContent }] } }), false, 'applyChange:cycle')
        }
      },
      
      applyAllSuggestions: async (draftId) => {
        const suggestions = get().pendingSuggestions[draftId] || []
        const autoApplicable = suggestions.filter(s => s.canAutoApply && s.autoApplyContent)
        
        for (const suggestion of autoApplicable) {
          get().applyChange(draftId, {
            id: generateId('change'), type: 'addition', target: 'section', newContent: suggestion.autoApplyContent, reason: suggestion.suggestion,
            addressesGap: suggestion.targetElement, expectedImpact: suggestion.affectedDimensions.map(d => ({ dimension: d, change: suggestion.expectedScoreImprovement / suggestion.affectedDimensions.length })), applied: true
          })
        }
        
        set(state => ({ pendingSuggestions: { ...state.pendingSuggestions, [draftId]: suggestions.filter(s => !s.canAutoApply) } }), false, 'applyAllSuggestions')
      },
      
      getRefinementSuggestions: (draftId) => get().pendingSuggestions[draftId] || [],
      
      dismissSuggestion: (draftId, suggestionId) => {
        set(state => ({ pendingSuggestions: { ...state.pendingSuggestions, [draftId]: (state.pendingSuggestions[draftId] || []).filter(s => s.id !== suggestionId) } }), false, 'dismissSuggestion')
      },
      
      getRefinementHistory: (draftId) => get().refinementCycles[draftId] || [],
      
      createCheckpoint: (draftId) => {
        const draft = get().drafts[draftId]
        if (!draft) throw new Error('Draft not found')
        
        const simStore = useReviewerSimulation.getState()
        const completenessScore = simStore.analyzeResponseCompleteness(draft.questionId, draft.content)
        const gapAnalysis = simStore.detectGaps(draft.questionId, draft.content)
        const simulatedFeedback = simStore.simulateReviewerResponse(draft.questionId, draft.content)
        
        const existingCheckpoints = get().checkpoints[draftId] || []
        const previousCheckpoint = existingCheckpoints[existingCheckpoints.length - 1]
        
        const checkpoint: QualityCheckpoint = {
          id: generateId('checkpoint'), draftId, checkpointNumber: existingCheckpoints.length + 1, createdAt: new Date().toISOString(), content: draft.content,
          completenessScore, gapAnalysis, simulatedFeedback, previousCheckpointId: previousCheckpoint?.id,
          improvement: {
            overallScoreChange: previousCheckpoint ? completenessScore.overall - previousCheckpoint.completenessScore.overall : 0,
            acceptanceProbabilityChange: previousCheckpoint ? completenessScore.predictedOutcome.probability - previousCheckpoint.completenessScore.predictedOutcome.probability : 0,
            gapsResolved: previousCheckpoint ? (previousCheckpoint.gapAnalysis.summary.requiredTotal - previousCheckpoint.gapAnalysis.summary.requiredMet) - (gapAnalysis.summary.requiredTotal - gapAnalysis.summary.requiredMet) : 0,
            newGaps: 0
          },
          meetsTargets: completenessScore.overall >= 70, targetsMet: completenessScore.overall >= 70 ? ['Minimum score'] : [], targetsMissed: completenessScore.overall < 70 ? ['Minimum score'] : []
        }
        
        set(state => ({ checkpoints: { ...state.checkpoints, [draftId]: [...existingCheckpoints, checkpoint] } }), false, 'createCheckpoint')
        return checkpoint
      },
      
      getCheckpoints: (draftId) => get().checkpoints[draftId] || [],
      
      compareCheckpoints: (checkpointId1, checkpointId2) => {
        let cp1: QualityCheckpoint | undefined, cp2: QualityCheckpoint | undefined
        Object.values(get().checkpoints).forEach(checkpoints => { checkpoints.forEach(cp => { if (cp.id === checkpointId1) cp1 = cp; if (cp.id === checkpointId2) cp2 = cp }) })
        if (!cp1 || !cp2) throw new Error('Checkpoint not found')
        
        const improvements: string[] = [], regressions: string[] = []
        Object.entries(cp2.completenessScore.dimensions).forEach(([key, dim]) => {
          const cp1NonNull = cp1!
          const oldDim = cp1NonNull.completenessScore.dimensions[key as keyof typeof cp1NonNull.completenessScore.dimensions]
          const diff = dim.score - oldDim.score
          if (diff > 5) improvements.push(`${key}: +${diff} points`)
          else if (diff < -5) regressions.push(`${key}: ${diff} points`)
        })
        
        return { contentDiff: `${cp2.content.length - cp1.content.length} characters`, scoreDiff: cp2.completenessScore.overall - cp1.completenessScore.overall, improvements, regressions }
      },
      
      startCoachingSession: (questionId, initialContent = '') => {
        const sessionId = generateId('coach')
        const simStore = useReviewerSimulation.getState()
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(q => q.id === questionId)
        
        let currentScore: CompletenessScore, gaps: GapAnalysis
        try { currentScore = simStore.analyzeResponseCompleteness(questionId, initialContent); gaps = simStore.detectGaps(questionId, initialContent) }
        catch { currentScore = createDefaultScore(); gaps = createDefaultGaps(questionId) }
        
        const targetScore = 70
        const guidance = generateCoachingGuidance(initialContent, currentScore, gaps, targetScore)
        const persona = question ? simStore.getPersonaForQuestion(question) : null
        const suggestions = persona ? generateRefinementSuggestions({ content: initialContent } as GeneratedDraft, currentScore, gaps, persona) : []
        
        const session: CoachingSession = {
          id: sessionId, questionId, startedAt: new Date().toISOString(), currentContent: initialContent, currentScore, activeSuggestions: suggestions, currentGuidance: guidance,
          initialScore: currentScore.overall, currentScoreValue: currentScore.overall, targetScore, progressPercent: Math.round((currentScore.overall / targetScore) * 100),
          interactionCount: 0, suggestionsApplied: 0, suggestionsSkipped: 0
        }
        
        set(state => ({ coachingSessions: { ...state.coachingSessions, [questionId]: session }, activeCoachingSessionId: sessionId }), false, 'startCoachingSession')
        return session
      },
      
      updateCoachingContent: (sessionId, content) => {
        const session = Object.values(get().coachingSessions).find(s => s.id === sessionId)
        if (!session) return
        
        const simStore = useReviewerSimulation.getState()
        let currentScore: CompletenessScore, gaps: GapAnalysis
        try { currentScore = simStore.analyzeResponseCompleteness(session.questionId, content); gaps = simStore.detectGaps(session.questionId, content) } catch { return }
        
        const guidance = generateCoachingGuidance(content, currentScore, gaps, session.targetScore)
        set(state => ({
          coachingSessions: {
            ...state.coachingSessions,
            [session.questionId]: { ...session, currentContent: content, currentScore, currentGuidance: guidance, currentScoreValue: currentScore.overall, progressPercent: Math.round((currentScore.overall / session.targetScore) * 100), interactionCount: session.interactionCount + 1 }
          }
        }), false, 'updateCoachingContent')
      },
      
      getCoachingGuidance: (sessionId) => Object.values(get().coachingSessions).find(s => s.id === sessionId)?.currentGuidance || [],
      
      endCoachingSession: (sessionId) => {
        const session = Object.values(get().coachingSessions).find(s => s.id === sessionId)
        if (!session) return
        set(state => {
          const newSessions = { ...state.coachingSessions }; delete newSessions[session.questionId]
          return { coachingSessions: newSessions, activeCoachingSessionId: state.activeCoachingSessionId === sessionId ? null : state.activeCoachingSessionId }
        }, false, 'endCoachingSession')
      },
      
      getActiveCoachingSession: () => {
        const { coachingSessions, activeCoachingSessionId } = get()
        if (!activeCoachingSessionId) return null
        return Object.values(coachingSessions).find(s => s.id === activeCoachingSessionId) || null
      },
      
      queueJob: (jobConfig) => {
        const jobId = generateId('job')
        const job: OrchestrationJob = {
          id: jobId, ...jobConfig, status: 'queued', progress: 0, currentStep: 'Queued',
          steps: [{ id: '1', name: 'Initialize', status: 'pending', progress: 0 }, { id: '2', name: 'Analyze', status: 'pending', progress: 0 }, { id: '3', name: 'Generate', status: 'pending', progress: 0 }, { id: '4', name: 'Validate', status: 'pending', progress: 0 }],
          queuedAt: new Date().toISOString()
        }
        set(state => ({ jobs: [...state.jobs, job] }), false, 'queueJob')
        return jobId
      },
      
      cancelJob: (jobId) => {
        set(state => ({ jobs: state.jobs.map(j => j.id === jobId ? { ...j, status: 'cancelled' as const } : j), activeJobId: state.activeJobId === jobId ? null : state.activeJobId }), false, 'cancelJob')
      },
      
      getJobStatus: (jobId) => get().jobs.find(j => j.id === jobId) || null,
      
      clearCaches: () => set({ templateCandidates: {}, componentCandidates: {} }, false, 'clearCaches'),
      
      selectDraft: (draftId) => set({ selectedDraftId: draftId }, false, 'selectDraft'),
      
      getGenerationProgress: () => {
        const { isGenerating, generationProgress, jobs, activeJobId } = get()
        const activeJob = activeJobId ? jobs.find(j => j.id === activeJobId) : null
        return { isGenerating, progress: generationProgress, step: activeJob?.currentStep || (isGenerating ? 'Generating...' : 'Idle') }
      }
    }),
    { name: 'ResponseIntelligence' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useSelectedDraft = () => {
  const drafts = useResponseIntelligence(state => state.drafts)
  const selectedId = useResponseIntelligence(state => state.selectedDraftId)
  return useMemo(() => selectedId ? drafts[selectedId] : null, [drafts, selectedId])
}

export const useDraftsForQuestion = (questionId: string) => {
  const drafts = useResponseIntelligence(state => state.drafts)
  const draftIds = useResponseIntelligence(state => state.draftsByQuestion[questionId])
  return useMemo(() => (draftIds || []).map(id => drafts[id]).filter(Boolean), [drafts, draftIds])
}

export const useTemplateCandidates = (questionId: string) => useResponseIntelligence(state => state.templateCandidates[questionId]) || []

export const usePendingSuggestions = (draftId: string) => useResponseIntelligence(state => state.pendingSuggestions[draftId]) || []

export const useCoachingSession = (questionId: string) => useResponseIntelligence(state => state.coachingSessions[questionId]) || null

export const useGenerationStatus = () => useResponseIntelligence(useShallow(state => ({ isGenerating: state.isGenerating, progress: state.generationProgress, error: state.lastError })))

export const useActiveJob = () => {
  const jobs = useResponseIntelligence(state => state.jobs)
  const activeId = useResponseIntelligence(state => state.activeJobId)
  return useMemo(() => activeId ? jobs.find(j => j.id === activeId) : null, [jobs, activeId])
}
