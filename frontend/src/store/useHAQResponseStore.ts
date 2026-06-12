

// ============================================================================
// HAQ Response Store - v71: Deep HAQ Response Capabilities
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import { haqQuestions } from '@/data/haq-data'
import { GOLDEN_PATH_PRODUCT, GOLDEN_PATH_TEAM, GOLDEN_PATH_TIMELINE } from '@/data/golden-path-data'
import type {
  HAQResponseState,
  HAQResponseActions,
  HAQResponseView,
  HAQResponseFilters,
  ResponseWorkspace,
  ResponseDraft,
  ResponseSection,
  ApprovalWorkflow,
  ApprovalWorkflowTemplate,
  ApprovalStep,
  ApprovalDecision,
  RequestedChange,
  AIGenerationConfig,
  AIResponseSession,
  AISuggestion,
  GeneratedSection,
  QualityAssessment,
  QualityIssue,
  QualityDimension,
  SubmissionLink,
  SubmissionLinkConfig,
  BatchResponseOperation,
  ResponseCollaborator,
  ResponseComment,
  WorkspaceActivity,
  WorkspaceConfig,
  DraftConfig,
  QualityStats,
  SubmissionReadinessReport,
  ResponseDraftStatus,
} from './haqResponseTypes'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

const DEFAULT_DIMENSION_SCORES: Record<QualityDimension, number> = {
  completeness: 0,
  accuracy: 0,
  clarity: 0,
  'regulatory-tone': 0,
  'evidence-support': 0,
  conciseness: 0,
  'cross-reference': 0,
  formatting: 0,
}

// ============================================================================
// GOLDEN PATH DATA GENERATORS
// ============================================================================

function generateMockContent(discipline: string, questionNumber: string): string {
  const templates: Record<string, string> = {
    CMC: `Response to ${questionNumber}\n\nThe Sponsor provides the following response to the Agency's request regarding the control strategy for the drug substance manufacturing process.\n\n## Critical Process Parameters\n\nThe crystallization step has been identified as the critical operation for controlling the impurity profile. The following CPPs have been established:\n\n1. Temperature: 45-55°C\n2. Cooling Rate: 0.5-1.0°C/min\n3. Agitation Speed: 150-200 rpm\n\n## Conclusion\n\nThe proposed control strategy ensures consistent quality.`,
    Clinical: `Response to ${questionNumber}\n\nThe Sponsor provides the following analysis of dose modification patterns observed in Study LIG-301.\n\n## Summary\n\nOf 412 patients enrolled, 127 (30.8%) required dose modifications. Median time to first reduction: 8.2 weeks.\n\n## Efficacy Impact\n\nPatients requiring modifications maintained clinical benefit (ORR 48.0% vs 52.3%, p=0.42).`,
    Nonclinical: `Response to ${questionNumber}\n\nThe Sponsor addresses concerns regarding hepatocellular adenomas in the 6-month rat study.\n\n## Human Relevance Assessment\n\nFindings are consistent with rodent-specific CAR/PXR receptor activation mechanism not relevant to humans.`,
  }
  return templates[discipline] || templates.CMC
}

function createGoldenPathWorkflow(workspaceId: string, draftId: string): ApprovalWorkflow {
  return {
    id: `wf-${workspaceId}`,
    workspaceId,
    draftId,
    workflowType: 'standard',
    requiredApprovals: [
      {
        id: 'step-1', order: 1, role: 'sme-reviewer',
        assigneeId: GOLDEN_PATH_TEAM.cmcLead.id, assigneeName: GOLDEN_PATH_TEAM.cmcLead.name,
        required: true, parallelWith: [], status: 'approved',
        decidedAt: '2024-12-08T10:00:00Z', comments: 'Technical content accurate.',
        requestedChanges: [], delegatedTo: null, delegatedBy: null, delegatedAt: null,
        dueDate: '2024-12-10', reminderSent: false,
      },
      {
        id: 'step-2', order: 2, role: 'regulatory-lead',
        assigneeId: GOLDEN_PATH_TEAM.regulatoryLead.id, assigneeName: GOLDEN_PATH_TEAM.regulatoryLead.name,
        required: true, parallelWith: [], status: 'approved',
        decidedAt: '2024-12-09T14:00:00Z', comments: 'Approved for IR response.',
        requestedChanges: [], delegatedTo: null, delegatedBy: null, delegatedAt: null,
        dueDate: '2024-12-12', reminderSent: false,
      },
    ],
    optionalApprovals: [],
    status: 'approved',
    currentStepIndex: 2,
    executionMode: 'sequential',
    startedAt: '2024-12-06T08:00:00Z',
    targetCompletionDate: '2024-12-12',
    completedAt: '2024-12-09T14:00:00Z',
    escalationRules: [],
    escalations: [],
  }
}

function createGoldenPathAISession(workspaceId: string): AIResponseSession {
  return {
    id: `ai-session-${workspaceId}`,
    workspaceId,
    mode: 'full-draft',
    config: {
      mode: 'full-draft', model: 'claude-3-opus', temperature: 0.3, maxTokens: 4000,
      includeQuestionContext: true, includeSimilarResponses: true,
      includeGuidanceDocuments: true, includeProductContext: true,
      responseStyle: 'formal', targetLength: 'moderate',
      mustIncludeTopics: ['CPP ranges'], mustCiteSources: ['ICH Q8(R2)'],
      avoidTopics: [], regulatoryFramework: ['ICH Q8(R2)', 'ICH Q11'],
    },
    prompt: 'Generate response...',
    generatedContent: 'The Sponsor provides the following response...',
    sections: [{
      id: 'gen-sec-1', title: 'Critical Process Parameters',
      content: 'The crystallization step has been identified...',
      confidence: 92, sources: ['ICH Q8(R2)'], needsReview: false, reviewNotes: null,
    }],
    qualityScore: 87,
    suggestions: [{
      id: 'sug-1', type: 'improvement', target: 'section-body',
      currentContent: null, suggestedContent: 'Add process validation reference.',
      rationale: 'Strengthens evidence.', confidence: 85, applied: true, dismissed: false,
    }],
    status: 'completed',
    startedAt: '2024-11-20T09:15:00Z',
    completedAt: '2024-11-20T09:17:32Z',
    error: null, tokensUsed: 3847, generationTimeMs: 152000,
    userRating: 4, userFeedback: 'Good starting point.', accepted: true,
  }
}

function createGoldenPathAssessment(workspaceId: string, draftId: string, score: number): QualityAssessment {
  return {
    id: `qa-${draftId}`, workspaceId, draftId,
    assessmentType: 'automated', overallScore: score,
    dimensionScores: {
      completeness: score + 2, accuracy: score + 5, clarity: score - 2,
      'regulatory-tone': score + 3, 'evidence-support': score,
      conciseness: score - 3, 'cross-reference': score + 1, formatting: score + 4,
    },
    issues: score < 90 ? [{
      id: 'issue-1', dimension: 'clarity', severity: 'info',
      title: 'Consider simplifying complex sentence',
      description: 'Paragraph 2 contains a 45-word sentence.',
      location: { sectionId: 'section-body', sectionTitle: 'Response', startOffset: 234, endOffset: 312, excerpt: 'The crystallization step...' },
      suggestedFix: 'Split into two sentences.', autoFixable: false, resolved: false, resolvedAt: null,
    }] : [],
    assessedAt: '2024-12-10T14:00:00Z', assessedBy: null,
  }
}

const createGoldenPathWorkspaces = (): Record<string, ResponseWorkspace> => {
  const workspaces: Record<string, ResponseWorkspace> = {}
  const day74Questions = haqQuestions.filter(q => q.applicationNumber === 'NDA 215847' && q.type === 'Day-74')
  
  day74Questions.slice(0, 3).forEach((haq, index) => {
    const workspaceId = `gp-resp-ws-${haq.id}`
    const draftId = `gp-draft-${haq.id}`
    const statuses: ResponseDraftStatus[] = ['approved', 'in-review', 'drafting']
    const status = statuses[index] || 'drafting'
    
    const draft: ResponseDraft = {
      id: draftId, workspaceId, version: index === 0 ? 3 : index === 1 ? 2 : 1,
      content: generateMockContent(haq.discipline, haq.questionNumber),
      sections: [
        { id: 'section-intro', title: 'Introduction', content: 'The Sponsor provides...', order: 1, type: 'introduction', aiGenerated: false, qualityScore: 88, issues: [] },
        { id: 'section-body', title: 'Response', content: 'Detailed response...', order: 2, type: 'response-body', aiGenerated: true, qualityScore: 85, issues: [] },
        { id: 'section-conclusion', title: 'Conclusion', content: 'In conclusion...', order: 3, type: 'conclusion', aiGenerated: false, qualityScore: 90, issues: [] },
      ],
      generationMethod: index === 0 ? 'ai-assisted' : 'manual',
      wordCount: 450 + index * 100, qualityScore: 85 + index * 3, qualityIssues: [],
      attachments: [],
      citations: [
        { id: 'cite-1', referenceType: 'ctd-section', reference: 'Module 3.2.S.2.4', title: 'Control of Drug Substance', verified: true },
        { id: 'cite-2', referenceType: 'guidance', reference: 'ICH Q8(R2)', title: 'Pharmaceutical Development', verified: true },
      ],
      crossReferences: [],
      status,
      authorId: GOLDEN_PATH_TEAM.medicalWriter.id,
      authorName: GOLDEN_PATH_TEAM.medicalWriter.name,
      createdAt: '2024-11-20T09:00:00Z', updatedAt: '2024-12-10T14:30:00Z',
      baseVersionId: null, changesSummary: null,
    }
    
    workspaces[workspaceId] = {
      id: workspaceId, haqId: haq.id, questionNumber: haq.questionNumber,
      applicationId: 'app-002', applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id, productName: GOLDEN_PATH_PRODUCT.name,
      discipline: haq.discipline,
      currentDraftId: draftId, drafts: [draft],
      approvalWorkflow: index === 0 ? createGoldenPathWorkflow(workspaceId, draftId) : null,
      aiSessions: index === 0 ? [createGoldenPathAISession(workspaceId)] : [],
      qualityAssessments: [createGoldenPathAssessment(workspaceId, draftId, 85 + index * 3)],
      currentQualityScore: 85 + index * 3,
      targetSequenceId: 'gp-build-nda-0001', targetSectionId: 'm1-12-1',
      submissionStatus: index === 0 ? 'linked-ready' : 'linked-pending',
      status,
      assignedTo: haq.assignedTo || null, assignedToName: haq.assignedToName || null,
      createdAt: '2024-11-15T08:00:00Z', updatedAt: '2024-12-10T14:30:00Z',
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      collaborators: [
        { id: 'collab-1', userId: GOLDEN_PATH_TEAM.medicalWriter.id, userName: GOLDEN_PATH_TEAM.medicalWriter.name, role: 'author', permissions: ['edit', 'comment', 'suggest'], addedAt: '2024-11-15T08:00:00Z', addedBy: GOLDEN_PATH_TEAM.regulatoryLead.id, lastActiveAt: '2024-12-10T14:30:00Z' },
        { id: 'collab-2', userId: GOLDEN_PATH_TEAM.regulatoryLead.id, userName: GOLDEN_PATH_TEAM.regulatoryLead.name, role: 'reviewer', permissions: ['comment', 'approve'], addedAt: '2024-11-15T08:00:00Z', addedBy: GOLDEN_PATH_TEAM.regulatoryLead.id, lastActiveAt: '2024-12-09T10:00:00Z' },
      ],
      comments: [],
      activityLog: [
        { id: 'act-1', workspaceId, activityType: 'draft-created', actorId: GOLDEN_PATH_TEAM.medicalWriter.id, actorName: GOLDEN_PATH_TEAM.medicalWriter.name, description: 'Created initial draft', details: {}, timestamp: '2024-11-20T09:00:00Z' },
      ],
    }
  })
  
  return workspaces
}

const createDefaultWorkflowTemplates = (): Record<string, ApprovalWorkflowTemplate> => ({
  'template-standard': {
    id: 'template-standard', name: 'Standard HAQ Response', description: 'Default workflow with SME and Regulatory review',
    discipline: 'all', priority: 'all',
    steps: [
      { order: 1, role: 'sme-reviewer', required: true, parallelWith: [], defaultDeadlineDays: 3 },
      { order: 2, role: 'regulatory-lead', required: true, parallelWith: [], defaultDeadlineDays: 2 },
    ],
    executionMode: 'sequential', defaultDeadlineDays: 5, escalationRules: [],
    isDefault: true, usageCount: 15, lastUsedAt: '2024-12-09T14:00:00Z',
    createdBy: 'system', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z',
  },
  'template-critical': {
    id: 'template-critical', name: 'Critical Question Response', description: 'Enhanced workflow for critical questions',
    discipline: 'all', priority: 'critical',
    steps: [
      { order: 1, role: 'sme-reviewer', required: true, parallelWith: [], defaultDeadlineDays: 2 },
      { order: 2, role: 'discipline-lead', required: true, parallelWith: [], defaultDeadlineDays: 2 },
      { order: 3, role: 'medical-director', required: true, parallelWith: [], defaultDeadlineDays: 2 },
      { order: 4, role: 'regulatory-lead', required: true, parallelWith: [], defaultDeadlineDays: 1 },
    ],
    executionMode: 'sequential', defaultDeadlineDays: 7,
    escalationRules: [{ id: 'esc-1', triggerType: 'overdue', triggerDays: 1, escalateTo: GOLDEN_PATH_TEAM.projectManager.id, notifyOriginal: true }],
    isDefault: false, usageCount: 3, lastUsedAt: '2024-11-15T10:00:00Z',
    createdBy: GOLDEN_PATH_TEAM.regulatoryLead.id, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-11-01T00:00:00Z',
  },
  'template-expedited': {
    id: 'template-expedited', name: 'Expedited Review', description: 'Fast-track workflow with parallel reviews',
    discipline: 'all', priority: 'all',
    steps: [
      { order: 1, role: 'sme-reviewer', required: true, parallelWith: [2], defaultDeadlineDays: 1 },
      { order: 2, role: 'regulatory-lead', required: true, parallelWith: [1], defaultDeadlineDays: 1 },
    ],
    executionMode: 'parallel', defaultDeadlineDays: 2, escalationRules: [],
    isDefault: false, usageCount: 5, lastUsedAt: '2024-12-05T09:00:00Z',
    createdBy: GOLDEN_PATH_TEAM.regulatoryLead.id, createdAt: '2024-08-01T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z',
  },
})

// ============================================================================
// STORE
// ============================================================================

type HAQResponseStore = HAQResponseState & HAQResponseActions

const initialWorkspaces = createGoldenPathWorkspaces()
const initialDrafts: Record<string, ResponseDraft> = {}
const initialWorkflows: Record<string, ApprovalWorkflow> = {}
const initialAssessments: Record<string, QualityAssessment> = {}
const initialAISessions: Record<string, AIResponseSession> = {}

Object.values(initialWorkspaces).forEach(ws => {
  ws.drafts.forEach(draft => { initialDrafts[draft.id] = draft })
  if (ws.approvalWorkflow) { initialWorkflows[ws.approvalWorkflow.id] = ws.approvalWorkflow }
  ws.qualityAssessments.forEach(qa => { initialAssessments[qa.id] = qa })
  ws.aiSessions.forEach(session => { initialAISessions[session.id] = session })
})

export const useHAQResponseStore = create<HAQResponseStore>()(
  devtools(
    (set, get) => ({
      // STATE
      workspaces: initialWorkspaces,
      selectedWorkspaceId: null,
      drafts: initialDrafts,
      workflows: initialWorkflows,
      workflowTemplates: createDefaultWorkflowTemplates(),
      aiSessions: initialAISessions,
      activeAISessionId: null,
      assessments: initialAssessments,
      submissionLinks: {},
      batchOperations: {},
      view: 'list',
      filters: { status: 'all', discipline: 'all', assignee: 'all', dueWithin: null, applicationId: 'all', hasAIAssist: null, qualityScoreMin: null, searchQuery: '' },
      isLoading: false,
      isGenerating: false,
      isAssessing: false,
      error: null,

      // WORKSPACE MANAGEMENT
      createWorkspace: (haqId, config) => {
        const haq = haqQuestions.find(q => q.id === haqId)
        if (!haq) throw new Error(`HAQ not found: ${haqId}`)
        
        const workspaceId = generateId('resp-ws')
        const workspace: ResponseWorkspace = {
          id: workspaceId, haqId, questionNumber: haq.questionNumber,
          applicationId: haq.applicationId, applicationNumber: haq.applicationNumber,
          productId: haq.productId, productName: haq.productName, discipline: haq.discipline,
          currentDraftId: null, drafts: [], approvalWorkflow: null, aiSessions: [],
          qualityAssessments: [], currentQualityScore: null,
          targetSequenceId: config.targetSequenceId || null, targetSectionId: null,
          submissionStatus: 'not-linked', status: 'initial',
          assignedTo: config.assignTo || null, assignedToName: config.assignToName || null,
          createdAt: now(), updatedAt: now(), dueDate: config.dueDate || haq.dueDate,
          collaborators: [], comments: [], activityLog: [],
        }
        
        set(state => ({ workspaces: { ...state.workspaces, [workspaceId]: workspace } }), false, 'createWorkspace')
        return workspace
      },

      selectWorkspace: (id) => set({ selectedWorkspaceId: id }, false, 'selectWorkspace'),

      updateWorkspace: (id, updates) => {
        set(state => ({
          workspaces: { ...state.workspaces, [id]: { ...state.workspaces[id], ...updates, updatedAt: now() } }
        }), false, 'updateWorkspace')
      },

      deleteWorkspace: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.workspaces
          return { workspaces: rest }
        }, false, 'deleteWorkspace')
      },

      // DRAFT MANAGEMENT
      createDraft: (workspaceId, config) => {
        const workspace = get().workspaces[workspaceId]
        if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)
        
        const draftId = generateId('draft')
        const draft: ResponseDraft = {
          id: draftId, workspaceId, version: workspace.drafts.length + 1,
          content: config.initialContent || '', sections: [],
          generationMethod: config.generationMethod, aiGenerationConfig: config.aiConfig, templateId: config.templateId,
          wordCount: 0, qualityScore: null, qualityIssues: [], attachments: [], citations: [], crossReferences: [],
          status: 'initial', authorId: workspace.assignedTo || 'unknown', authorName: workspace.assignedToName || 'Unknown',
          createdAt: now(), updatedAt: now(), baseVersionId: workspace.currentDraftId, changesSummary: null,
        }
        
        set(state => ({
          drafts: { ...state.drafts, [draftId]: draft },
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], currentDraftId: draftId, drafts: [...state.workspaces[workspaceId].drafts, draft], status: 'drafting', updatedAt: now() } },
        }), false, 'createDraft')
        
        return draft
      },

      updateDraft: (id, updates) => {
        set(state => {
          const draft = state.drafts[id]
          if (!draft) return state
          const updatedDraft = { ...draft, ...updates, wordCount: updates.content ? updates.content.split(/\s+/).filter(Boolean).length : draft.wordCount, updatedAt: now() }
          return { drafts: { ...state.drafts, [id]: updatedDraft } }
        }, false, 'updateDraft')
      },

      selectDraft: (workspaceId, draftId) => {
        set(state => ({
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], currentDraftId: draftId, updatedAt: now() } }
        }), false, 'selectDraft')
      },

      createDraftVersion: (draftId, changesSummary) => {
        const baseDraft = get().drafts[draftId]
        if (!baseDraft) throw new Error(`Draft not found: ${draftId}`)
        
        const newDraftId = generateId('draft')
        const workspace = get().workspaces[baseDraft.workspaceId]
        const newDraft: ResponseDraft = { ...baseDraft, id: newDraftId, version: baseDraft.version + 1, baseVersionId: draftId, changesSummary, createdAt: now(), updatedAt: now(), status: 'initial' }
        
        set(state => ({
          drafts: { ...state.drafts, [newDraftId]: newDraft },
          workspaces: { ...state.workspaces, [baseDraft.workspaceId]: { ...workspace, currentDraftId: newDraftId, drafts: [...workspace.drafts, newDraft], updatedAt: now() } },
        }), false, 'createDraftVersion')
        
        return newDraft
      },

      deleteDraft: (id) => {
        set(state => {
          const { [id]: _, ...rest } = state.drafts
          return { drafts: rest }
        }, false, 'deleteDraft')
      },

      // AI GENERATION
      startAIGeneration: async (workspaceId, config) => {
        const workspace = get().workspaces[workspaceId]
        if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)
        
        const sessionId = generateId('ai-session')
        const session: AIResponseSession = {
          id: sessionId, workspaceId, mode: config.mode, config,
          prompt: `Generate response for ${workspace.questionNumber}...`,
          generatedContent: null, sections: [], qualityScore: null, suggestions: [],
          status: 'generating', startedAt: now(), completedAt: null, error: null,
          tokensUsed: 0, generationTimeMs: 0, userRating: null, userFeedback: null, accepted: false,
        }
        
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: session },
          activeAISessionId: sessionId, isGenerating: true,
        }), false, 'startAIGeneration')
        
        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const generatedSections: GeneratedSection[] = [
          { id: generateId('gen-sec'), title: 'Introduction', content: 'The Sponsor provides the following response...', confidence: 88, sources: ['ICH Guidelines'], needsReview: false, reviewNotes: null },
          { id: generateId('gen-sec'), title: 'Response', content: 'Based on comprehensive analysis...', confidence: 85, sources: ['Clinical Study Reports'], needsReview: true, reviewNotes: 'Review data references' },
        ]
        
        const completedSession: AIResponseSession = {
          ...session, status: 'completed', completedAt: now(),
          generatedContent: generatedSections.map(s => s.content).join('\n\n'),
          sections: generatedSections, qualityScore: 86,
          suggestions: [{ id: generateId('sug'), type: 'improvement', target: 'overall', currentContent: null, suggestedContent: 'Add cross-reference to CMC documentation.', rationale: 'Strengthens response.', confidence: 82, applied: false, dismissed: false }],
          tokensUsed: 2847, generationTimeMs: 2000,
        }
        
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: completedSession },
          isGenerating: false,
        }), false, 'completeAIGeneration')
        
        return completedSession
      },

      cancelAIGeneration: (sessionId) => {
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: { ...state.aiSessions[sessionId], status: 'cancelled', completedAt: now() } },
          isGenerating: false, activeAISessionId: null,
        }), false, 'cancelAIGeneration')
      },

      applyAISuggestion: (sessionId, suggestionId) => {
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: { ...state.aiSessions[sessionId], suggestions: state.aiSessions[sessionId].suggestions.map(s => s.id === suggestionId ? { ...s, applied: true } : s) } }
        }), false, 'applyAISuggestion')
      },

      dismissAISuggestion: (sessionId, suggestionId) => {
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: { ...state.aiSessions[sessionId], suggestions: state.aiSessions[sessionId].suggestions.map(s => s.id === suggestionId ? { ...s, dismissed: true } : s) } }
        }), false, 'dismissAISuggestion')
      },

      rateAISession: (sessionId, rating, feedback) => {
        set(state => ({
          aiSessions: { ...state.aiSessions, [sessionId]: { ...state.aiSessions[sessionId], userRating: rating, userFeedback: feedback || null } }
        }), false, 'rateAISession')
      },

      // QUALITY ASSESSMENT
      runQualityAssessment: async (workspaceId, draftId) => {
        set({ isAssessing: true }, false, 'startQualityAssessment')
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        const draft = get().drafts[draftId]
        if (!draft) throw new Error(`Draft not found: ${draftId}`)
        
        const assessmentId = generateId('qa')
        const overallScore = 75 + Math.floor(Math.random() * 20)
        
        const assessment: QualityAssessment = {
          id: assessmentId, workspaceId, draftId, assessmentType: 'automated', overallScore,
          dimensionScores: {
            completeness: overallScore + Math.floor(Math.random() * 10) - 5,
            accuracy: overallScore + Math.floor(Math.random() * 10) - 5,
            clarity: overallScore + Math.floor(Math.random() * 10) - 5,
            'regulatory-tone': overallScore + Math.floor(Math.random() * 10) - 5,
            'evidence-support': overallScore + Math.floor(Math.random() * 10) - 5,
            conciseness: overallScore + Math.floor(Math.random() * 10) - 5,
            'cross-reference': overallScore + Math.floor(Math.random() * 10) - 5,
            formatting: overallScore + Math.floor(Math.random() * 10) - 5,
          },
          issues: overallScore < 85 ? [{ id: generateId('issue'), dimension: 'completeness', severity: 'warning', title: 'Missing data reference', description: 'Consider adding batch data.', location: null, suggestedFix: 'Add validation batch reference.', autoFixable: false, resolved: false, resolvedAt: null }] : [],
          assessedAt: now(), assessedBy: null,
        }
        
        set(state => ({
          assessments: { ...state.assessments, [assessmentId]: assessment },
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], currentQualityScore: overallScore, qualityAssessments: [...state.workspaces[workspaceId].qualityAssessments, assessment], updatedAt: now() } },
          drafts: { ...state.drafts, [draftId]: { ...state.drafts[draftId], qualityScore: overallScore, qualityIssues: assessment.issues } },
          isAssessing: false,
        }), false, 'completeQualityAssessment')
        
        return assessment
      },

      resolveQualityIssue: (assessmentId, issueId) => {
        set(state => ({
          assessments: { ...state.assessments, [assessmentId]: { ...state.assessments[assessmentId], issues: state.assessments[assessmentId].issues.map(i => i.id === issueId ? { ...i, resolved: true, resolvedAt: now() } : i) } }
        }), false, 'resolveQualityIssue')
      },

      autoFixIssues: (assessmentId, issueIds) => {
        set(state => ({
          assessments: { ...state.assessments, [assessmentId]: { ...state.assessments[assessmentId], issues: state.assessments[assessmentId].issues.map(i => issueIds.includes(i.id) && i.autoFixable ? { ...i, resolved: true, resolvedAt: now() } : i) } }
        }), false, 'autoFixIssues')
      },

      // APPROVAL WORKFLOW
      initializeWorkflow: (workspaceId, templateId) => {
        const workspace = get().workspaces[workspaceId]
        if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)
        if (!workspace.currentDraftId) throw new Error('No current draft to approve')
        
        const template = templateId ? get().workflowTemplates[templateId] : Object.values(get().workflowTemplates).find(t => t.isDefault)
        if (!template) throw new Error('No workflow template found')
        
        const workflowId = generateId('wf')
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + template.defaultDeadlineDays)
        
        const workflow: ApprovalWorkflow = {
          id: workflowId, workspaceId, draftId: workspace.currentDraftId,
          workflowType: template.id.includes('critical') ? 'critical' : 'standard',
          requiredApprovals: template.steps.filter(s => s.required).map(step => ({
            id: generateId('step'), order: step.order, role: step.role,
            assigneeId: null, assigneeName: null, required: step.required,
            parallelWith: step.parallelWith.map(o => `step-${o}`),
            status: 'pending', decidedAt: null, comments: null, requestedChanges: [],
            delegatedTo: null, delegatedBy: null, delegatedAt: null, dueDate: null, reminderSent: false,
          })),
          optionalApprovals: [],
          status: 'pending', currentStepIndex: 0, executionMode: template.executionMode,
          startedAt: null, targetCompletionDate: targetDate.toISOString().split('T')[0],
          completedAt: null, escalationRules: template.escalationRules, escalations: [],
        }
        
        set(state => ({
          workflows: { ...state.workflows, [workflowId]: workflow },
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], approvalWorkflow: workflow, updatedAt: now() } },
        }), false, 'initializeWorkflow')
        
        return workflow
      },

      submitForReview: (workspaceId) => {
        const workspace = get().workspaces[workspaceId]
        if (!workspace?.approvalWorkflow) { get().initializeWorkflow(workspaceId) }
        
        const workflowId = get().workspaces[workspaceId].approvalWorkflow?.id
        if (!workflowId) throw new Error('Failed to initialize workflow')
        
        set(state => ({
          workflows: { ...state.workflows, [workflowId]: { ...state.workflows[workflowId], status: 'in-progress', startedAt: now() } },
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], status: 'ready-for-review', updatedAt: now() } },
        }), false, 'submitForReview')
      },

      recordApprovalDecision: (workflowId, stepId, decision, comments, requestedChanges) => {
        const workflow = get().workflows[workflowId]
        if (!workflow) throw new Error(`Workflow not found: ${workflowId}`)
        
        const allSteps = [...workflow.requiredApprovals, ...workflow.optionalApprovals]
        const stepIndex = allSteps.findIndex(s => s.id === stepId)
        const updatedSteps = allSteps.map(s => s.id === stepId ? { ...s, status: decision, decidedAt: now(), comments: comments || null, requestedChanges: requestedChanges || [] } : s)
        
        const allApproved = workflow.requiredApprovals.every((_, i) => updatedSteps[i]?.status === 'approved' || updatedSteps[i]?.status === 'approved-with-comments')
        const anyRejected = updatedSteps.some(s => s.status === 'rejected')
        const anyRevision = updatedSteps.some(s => s.status === 'revision-requested')
        
        let workflowStatus = workflow.status
        let wsStatus: ResponseDraftStatus = get().workspaces[workflow.workspaceId].status
        
        if (allApproved) { workflowStatus = 'approved'; wsStatus = 'approved' }
        else if (anyRejected) { workflowStatus = 'rejected'; wsStatus = 'rejected' }
        else if (anyRevision) { wsStatus = 'revision-requested' }
        
        set(state => ({
          workflows: { ...state.workflows, [workflowId]: { ...workflow, requiredApprovals: updatedSteps.slice(0, workflow.requiredApprovals.length) as ApprovalStep[], optionalApprovals: updatedSteps.slice(workflow.requiredApprovals.length) as ApprovalStep[], status: workflowStatus, currentStepIndex: stepIndex + 1, completedAt: allApproved || anyRejected ? now() : null } },
          workspaces: { ...state.workspaces, [workflow.workspaceId]: { ...state.workspaces[workflow.workspaceId], status: wsStatus, updatedAt: now() } },
        }), false, 'recordApprovalDecision')
      },

      delegateApproval: (workflowId, stepId, delegateTo) => {
        set(state => ({
          workflows: { ...state.workflows, [workflowId]: { ...state.workflows[workflowId], requiredApprovals: state.workflows[workflowId].requiredApprovals.map(s => s.id === stepId ? { ...s, delegatedTo: delegateTo, delegatedBy: s.assigneeId, delegatedAt: now(), status: 'delegated' } : s) } }
        }), false, 'delegateApproval')
      },

      escalateApproval: (workflowId, stepId, reason) => {
        const workflow = get().workflows[workflowId]
        if (!workflow) return
        set(state => ({
          workflows: { ...state.workflows, [workflowId]: { ...workflow, escalations: [...workflow.escalations, { id: generateId('esc'), ruleId: 'manual', triggeredAt: now(), escalatedTo: GOLDEN_PATH_TEAM.projectManager.id, reason, resolved: false }] } }
        }), false, 'escalateApproval')
      },

      // SUBMISSION LINKING
      linkToSubmission: (workspaceId, config) => {
        const workspace = get().workspaces[workspaceId]
        if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)
        if (!workspace.currentDraftId) throw new Error('No current draft to link')
        
        const linkId = generateId('sub-link')
        const link: SubmissionLink = {
          id: linkId, workspaceId, draftId: workspace.currentDraftId,
          sequenceBuildId: config.sequenceBuildId, sequenceNumber: '0001',
          applicationNumber: workspace.applicationNumber, ctdSection: config.ctdSection,
          ctdSectionTitle: 'Correspondence', documentTitle: config.documentTitle,
          fileName: `${workspace.questionNumber.replace(/\s+/g, '-').toLowerCase()}-response.pdf`,
          status: 'pending', generatedDocumentId: null, pdfPath: null, checksum: null,
          linkedAt: now(), linkedBy: workspace.assignedTo || 'system', lastUpdatedAt: now(),
        }
        
        set(state => ({
          submissionLinks: { ...state.submissionLinks, [linkId]: link },
          workspaces: { ...state.workspaces, [workspaceId]: { ...workspace, targetSequenceId: config.sequenceBuildId, targetSectionId: config.ctdSection, submissionStatus: 'linked-pending', updatedAt: now() } },
        }), false, 'linkToSubmission')
        
        return link
      },

      updateSubmissionLink: (linkId, updates) => {
        set(state => ({
          submissionLinks: { ...state.submissionLinks, [linkId]: { ...state.submissionLinks[linkId], ...updates, lastUpdatedAt: now() } }
        }), false, 'updateSubmissionLink')
      },

      unlinkFromSubmission: (linkId) => {
        const link = get().submissionLinks[linkId]
        if (!link) return
        set(state => {
          const { [linkId]: _, ...rest } = state.submissionLinks
          return {
            submissionLinks: rest,
            workspaces: { ...state.workspaces, [link.workspaceId]: { ...state.workspaces[link.workspaceId], submissionStatus: 'not-linked', targetSequenceId: null, targetSectionId: null, updatedAt: now() } },
          }
        }, false, 'unlinkFromSubmission')
      },

      generateSubmissionDocument: async (linkId) => {
        const link = get().submissionLinks[linkId]
        if (!link) throw new Error(`Link not found: ${linkId}`)
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const docId = generateId('doc')
        const pdfPath = `/submissions/${link.sequenceNumber}/${link.ctdSection}/${link.fileName}`
        const checksum = `sha256-${Math.random().toString(36).substring(2, 18)}`
        
        set(state => ({
          submissionLinks: { ...state.submissionLinks, [linkId]: { ...link, status: 'document-ready', generatedDocumentId: docId, pdfPath, checksum, lastUpdatedAt: now() } },
          workspaces: { ...state.workspaces, [link.workspaceId]: { ...state.workspaces[link.workspaceId], submissionStatus: 'linked-ready', updatedAt: now() } },
        }), false, 'generateSubmissionDocument')
        
        return pdfPath
      },

      // COLLABORATION
      addCollaborator: (workspaceId, userId, role) => {
        const collab: ResponseCollaborator = {
          id: generateId('collab'), userId, userName: 'User', role,
          permissions: role === 'author' ? ['edit', 'comment', 'suggest'] : role === 'reviewer' ? ['comment', 'approve'] : ['view-only'],
          addedAt: now(), addedBy: 'current-user', lastActiveAt: null,
        }
        set(state => ({
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], collaborators: [...state.workspaces[workspaceId].collaborators, collab], updatedAt: now() } }
        }), false, 'addCollaborator')
      },

      removeCollaborator: (workspaceId, collaboratorId) => {
        set(state => ({
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], collaborators: state.workspaces[workspaceId].collaborators.filter(c => c.id !== collaboratorId), updatedAt: now() } }
        }), false, 'removeCollaborator')
      },

      addComment: (workspaceId, draftId, comment) => {
        const newComment: ResponseComment = { id: generateId('comment'), ...comment, workspaceId, draftId, replies: [], createdAt: now(), updatedAt: now(), edited: false }
        set(state => ({
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], comments: [...state.workspaces[workspaceId].comments, newComment], updatedAt: now() } }
        }), false, 'addComment')
        return newComment
      },

      resolveComment: (commentId) => {
        const workspaceId = Object.keys(get().workspaces).find(wsId => get().workspaces[wsId].comments.some(c => c.id === commentId))
        if (!workspaceId) return
        set(state => ({
          workspaces: { ...state.workspaces, [workspaceId]: { ...state.workspaces[workspaceId], comments: state.workspaces[workspaceId].comments.map(c => c.id === commentId ? { ...c, status: 'resolved', resolvedAt: now(), resolvedBy: 'current-user' } : c), updatedAt: now() } }
        }), false, 'resolveComment')
      },

      // BATCH OPERATIONS
      startBatchOperation: (operation) => {
        const batchId = generateId('batch')
        const batchOp: BatchResponseOperation = { id: batchId, ...operation, status: 'pending', progress: 0, results: [], startedAt: now(), completedAt: null, error: null }
        set(state => ({ batchOperations: { ...state.batchOperations, [batchId]: batchOp } }), false, 'startBatchOperation')
        return batchOp
      },

      cancelBatchOperation: (operationId) => {
        set(state => ({
          batchOperations: { ...state.batchOperations, [operationId]: { ...state.batchOperations[operationId], status: 'cancelled', completedAt: now() } }
        }), false, 'cancelBatchOperation')
      },

      // FILTERS & VIEW
      setView: (view) => set({ view }, false, 'setView'),
      setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } }), false, 'setFilters'),
      clearFilters: () => set({ filters: { status: 'all', discipline: 'all', assignee: 'all', dueWithin: null, applicationId: 'all', hasAIAssist: null, qualityScoreMin: null, searchQuery: '' } }, false, 'clearFilters'),

      // COMPUTED
      getWorkspacesByHAQ: (haqId) => Object.values(get().workspaces).filter(ws => ws.haqId === haqId),
      getWorkspacesByApplication: (applicationId) => Object.values(get().workspaces).filter(ws => ws.applicationId === applicationId),
      
      getPendingApprovals: (userId) => {
        const pending: ApprovalStep[] = []
        Object.values(get().workflows).forEach(wf => {
          if (wf.status !== 'in-progress') return
          [...wf.requiredApprovals, ...wf.optionalApprovals].forEach(step => {
            if (step.status === 'pending' && (step.assigneeId === userId || step.delegatedTo === userId)) pending.push(step)
          })
        })
        return pending
      },

      getOverdueWorkspaces: () => {
        const today = new Date()
        return Object.values(get().workspaces).filter(ws => {
          if (['submitted', 'approved', 'finalized'].includes(ws.status)) return false
          return new Date(ws.dueDate) < today
        })
      },

      getQualityStats: (): QualityStats => {
        const workspaces = Object.values(get().workspaces)
        const withScores = workspaces.filter(ws => ws.currentQualityScore !== null)
        const avgScore = withScores.length > 0 ? withScores.reduce((sum, ws) => sum + (ws.currentQualityScore || 0), 0) / withScores.length : 0
        
        const distribution = {
          excellent: withScores.filter(ws => (ws.currentQualityScore || 0) >= 90).length,
          good: withScores.filter(ws => (ws.currentQualityScore || 0) >= 80 && (ws.currentQualityScore || 0) < 90).length,
          acceptable: withScores.filter(ws => (ws.currentQualityScore || 0) >= 70 && (ws.currentQualityScore || 0) < 80).length,
          needsWork: withScores.filter(ws => (ws.currentQualityScore || 0) >= 60 && (ws.currentQualityScore || 0) < 70).length,
          poor: withScores.filter(ws => (ws.currentQualityScore || 0) < 60).length,
        }
        
        const issueCounts: Record<QualityDimension, number> = { ...DEFAULT_DIMENSION_SCORES }
        Object.values(get().assessments).forEach(qa => qa.issues.forEach(issue => { issueCounts[issue.dimension] = (issueCounts[issue.dimension] || 0) + 1 }))
        const totalIssues = Object.values(issueCounts).reduce((sum, c) => sum + c, 0)
        const commonIssues = Object.entries(issueCounts).map(([dimension, count]) => ({ dimension: dimension as QualityDimension, count, percentage: totalIssues > 0 ? (count / totalIssues) * 100 : 0 })).sort((a, b) => b.count - a.count).slice(0, 5)
        
        const aiSessions = Object.values(get().aiSessions)
        const completed = aiSessions.filter(s => s.status === 'completed')
        const accepted = completed.filter(s => s.accepted)
        const rated = completed.filter(s => s.userRating !== null)
        
        return {
          totalWorkspaces: workspaces.length, averageQualityScore: Math.round(avgScore * 10) / 10,
          scoreDistribution: distribution, commonIssues,
          aiAssistUsage: { total: completed.length, averageRating: rated.length > 0 ? rated.reduce((sum, s) => sum + (s.userRating || 0), 0) / rated.length : 0, acceptanceRate: completed.length > 0 ? (accepted.length / completed.length) * 100 : 0 },
        }
      },

      getSubmissionReadiness: (sequenceBuildId): SubmissionReadinessReport => {
        const linked = Object.values(get().workspaces).filter(ws => ws.targetSequenceId === sequenceBuildId)
        const ready = linked.filter(ws => ws.status === 'approved' || ws.status === 'finalized').length
        const pendingApprovals = Object.values(get().workflows).filter(wf => { const ws = get().workspaces[wf.workspaceId]; return ws?.targetSequenceId === sequenceBuildId && wf.status === 'in-progress' }).flatMap(wf => [...wf.requiredApprovals, ...wf.optionalApprovals]).filter(step => step.status === 'pending').length
        const qualityIssues = linked.reduce((sum, ws) => { const qa = ws.qualityAssessments[ws.qualityAssessments.length - 1]; return sum + (qa?.issues.filter(i => !i.resolved).length || 0) }, 0)
        
        const blockers: string[] = []
        linked.forEach(ws => {
          if (ws.status === 'drafting' || ws.status === 'initial') blockers.push(`${ws.questionNumber}: Draft not complete`)
          if (ws.status === 'revision-requested') blockers.push(`${ws.questionNumber}: Revisions requested`)
          if (ws.status === 'rejected') blockers.push(`${ws.questionNumber}: Response rejected`)
        })
        
        return {
          sequenceBuildId, linkedResponses: linked.length, readyResponses: ready,
          pendingResponses: linked.length - ready, approvalsPending: pendingApprovals,
          qualityIssues, isReady: linked.length > 0 && blockers.length === 0 && ready === linked.length,
          blockers, estimatedCompletionDate: ready === linked.length ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },
    }),
    { name: 'HAQResponseStore' }
  )
)

// CONVENIENCE HOOKS
export const useSelectedWorkspace = () => {
  const selectedId = useHAQResponseStore(state => state.selectedWorkspaceId)
  const workspaces = useHAQResponseStore(state => state.workspaces)
  return selectedId ? workspaces[selectedId] : null
}

export const useWorkspaceList = () => {
  const workspaces = useHAQResponseStore(state => state.workspaces)
  return useMemo(() => Object.values(workspaces), [workspaces])
}

export const useFilteredWorkspaces = () => {
  const workspaces = useHAQResponseStore(state => state.workspaces)
  const filters = useHAQResponseStore(state => state.filters)
  
  return useMemo(() => Object.values(workspaces).filter(ws => {
    if (filters.status !== 'all' && ws.status !== filters.status) return false
    if (filters.discipline !== 'all' && ws.discipline !== filters.discipline) return false
    if (filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned' && ws.assignedTo) return false
      if (filters.assignee !== 'unassigned' && ws.assignedTo !== filters.assignee) return false
    }
    if (filters.applicationId !== 'all' && ws.applicationId !== filters.applicationId) return false
    if (filters.qualityScoreMin !== null && (ws.currentQualityScore || 0) < filters.qualityScoreMin) return false
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      if (!ws.questionNumber.toLowerCase().includes(query) && !ws.productName.toLowerCase().includes(query)) return false
    }
    if (filters.dueWithin !== null) {
      const dueDate = new Date(ws.dueDate)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + filters.dueWithin)
      if (dueDate > cutoff) return false
    }
    if (filters.hasAIAssist !== null) {
      if (filters.hasAIAssist !== (ws.aiSessions.length > 0)) return false
    }
    return true
  }), [workspaces, filters])
}

export const useCurrentDraft = () => {
  const selectedId = useHAQResponseStore(state => state.selectedWorkspaceId)
  const workspaces = useHAQResponseStore(state => state.workspaces)
  const drafts = useHAQResponseStore(state => state.drafts)
  if (!selectedId) return null
  const workspace = workspaces[selectedId]
  if (!workspace?.currentDraftId) return null
  return drafts[workspace.currentDraftId] || null
}

export const useActiveWorkflow = () => {
  const selectedId = useHAQResponseStore(state => state.selectedWorkspaceId)
  const workspaces = useHAQResponseStore(state => state.workspaces)
  const workflows = useHAQResponseStore(state => state.workflows)
  if (!selectedId) return null
  const workspace = workspaces[selectedId]
  if (!workspace?.approvalWorkflow) return null
  return workflows[workspace.approvalWorkflow.id] || null
}

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const usePendingApprovalsForUser = (userId: string) => {
  const workflows = useHAQResponseStore(state => state.workflows)
  return useMemo(() => {
    const pending: ApprovalStep[] = []
    Object.values(workflows).forEach(wf => {
      if (wf.status !== 'in-progress') return
      ;[...wf.requiredApprovals, ...wf.optionalApprovals].forEach(step => {
        if (step.status === 'pending' && (step.assigneeId === userId || step.delegatedTo === userId)) {
          pending.push(step)
        }
      })
    })
    return pending
  }, [workflows, userId])
}

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const useResponseQualityStats = (): QualityStats => {
  const workspaces = useHAQResponseStore(state => state.workspaces)
  const assessments = useHAQResponseStore(state => state.assessments)
  const aiSessions = useHAQResponseStore(state => state.aiSessions)
  
  return useMemo(() => {
    const workspaceList = Object.values(workspaces)
    const withScores = workspaceList.filter(ws => ws.currentQualityScore !== null)
    const avgScore = withScores.length > 0 
      ? withScores.reduce((sum, ws) => sum + (ws.currentQualityScore || 0), 0) / withScores.length 
      : 0
    
    const distribution = {
      excellent: withScores.filter(ws => (ws.currentQualityScore || 0) >= 90).length,
      good: withScores.filter(ws => (ws.currentQualityScore || 0) >= 80 && (ws.currentQualityScore || 0) < 90).length,
      acceptable: withScores.filter(ws => (ws.currentQualityScore || 0) >= 70 && (ws.currentQualityScore || 0) < 80).length,
      needsWork: withScores.filter(ws => (ws.currentQualityScore || 0) >= 60 && (ws.currentQualityScore || 0) < 70).length,
      poor: withScores.filter(ws => (ws.currentQualityScore || 0) < 60).length,
    }
    
    const issueCounts: Record<QualityDimension, number> = { ...DEFAULT_DIMENSION_SCORES }
    Object.values(assessments).forEach(qa => 
      qa.issues.forEach(issue => { 
        issueCounts[issue.dimension] = (issueCounts[issue.dimension] || 0) + 1 
      })
    )
    const totalIssues = Object.values(issueCounts).reduce((sum, c) => sum + c, 0)
    const commonIssues = Object.entries(issueCounts)
      .map(([dimension, count]) => ({ 
        dimension: dimension as QualityDimension, 
        count, 
        percentage: totalIssues > 0 ? (count / totalIssues) * 100 : 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    const sessionList = Object.values(aiSessions)
    const completed = sessionList.filter(s => s.status === 'completed')
    const accepted = completed.filter(s => s.accepted)
    const rated = completed.filter(s => s.userRating !== null)
    
    return {
      totalWorkspaces: workspaceList.length,
      averageQualityScore: Math.round(avgScore * 10) / 10,
      scoreDistribution: distribution,
      commonIssues,
      aiAssistUsage: {
        total: completed.length,
        averageRating: rated.length > 0 ? rated.reduce((sum, s) => sum + (s.userRating || 0), 0) / rated.length : 0,
        acceptanceRate: completed.length > 0 ? (accepted.length / completed.length) * 100 : 0,
      },
    }
  }, [workspaces, assessments, aiSessions])
}

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const useSubmissionReadiness = (sequenceBuildId: string): SubmissionReadinessReport => {
  const workspaces = useHAQResponseStore(state => state.workspaces)
  const workflows = useHAQResponseStore(state => state.workflows)
  
  return useMemo(() => {
    const linked = Object.values(workspaces).filter(ws => ws.targetSequenceId === sequenceBuildId)
    const ready = linked.filter(ws => ws.status === 'approved' || ws.status === 'finalized').length
    
    const pendingApprovals = Object.values(workflows)
      .filter(wf => {
        const ws = workspaces[wf.workspaceId]
        return ws?.targetSequenceId === sequenceBuildId && wf.status === 'in-progress'
      })
      .flatMap(wf => [...wf.requiredApprovals, ...wf.optionalApprovals])
      .filter(step => step.status === 'pending').length
    
    const qualityIssues = linked.reduce((sum, ws) => {
      const qa = ws.qualityAssessments[ws.qualityAssessments.length - 1]
      return sum + (qa?.issues.filter(i => !i.resolved).length || 0)
    }, 0)
    
    const blockers: string[] = []
    linked.forEach(ws => {
      if (ws.status === 'drafting' || ws.status === 'initial') blockers.push(`${ws.questionNumber}: Draft not complete`)
      if (ws.status === 'revision-requested') blockers.push(`${ws.questionNumber}: Revisions requested`)
      if (ws.status === 'rejected') blockers.push(`${ws.questionNumber}: Response rejected`)
    })
    
    return {
      sequenceBuildId,
      linkedResponses: linked.length,
      readyResponses: ready,
      pendingResponses: linked.length - ready,
      approvalsPending: pendingApprovals,
      qualityIssues,
      isReady: linked.length > 0 && blockers.length === 0 && ready === linked.length,
      blockers,
      estimatedCompletionDate: ready === linked.length 
        ? null 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  }, [workspaces, workflows, sequenceBuildId])
}
