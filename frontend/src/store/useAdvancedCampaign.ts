

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type { HAQDiscipline } from '@/types/haq'
import { useHAQStore } from './useHAQStore'
import { useResponseCampaign } from './useResponseCampaign'
import type { RegulatoryAgency } from './campaignEnhancementTypes'
import type {
  ConnectionStatus, CollaborationSession, CollaborationSessionSettings,
  UserPresence, PresenceLocation, CursorPosition, EditLock, LiveEdit,
  ConflictResolution, LiveComment, CollaborationEvent,
  QuestionClusterAnalysis, ClusteringMethod, SmartCluster, ClusterBatchJob,
  ClusteringRecommendation,
  RegulatoryIntelligenceFeed, IntelligenceSource, RegulatoryUpdate,
  UpdateCategory, RegulatoryAlert, GuidanceDocument, GuidanceChange,
  RegulatoryTrend, FeedSubscription,
  QualityCoachSession, CoachingMode, CoachingProgress, CoachingInsight,
  CoachingSuggestion, ImprovementRecord, CoachingMetrics, CoachingTemplate,
  CrossCampaignAnalytics, AnalyticsTimeRange, CampaignSummary,
  PortfolioMetrics, AnalyticsTrend, TrendMetric, CampaignComparison,
  ComparisonDimension, AnalyticsInsight, PerformanceBenchmark,
  BenchmarkCategory, PerformanceForecast, ForecastPrediction,
  AdvancedCampaignState
} from './advancedCampaignTypes'

export type * from './advancedCampaignTypes'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateColor(): string {
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6']
  return colors[Math.floor(Math.random() * colors.length)]
}

const defaultCoachingTemplates: Record<string, CoachingTemplate> = {
  'template-general': {
    id: 'template-general', name: 'General Response Coaching', description: 'Step-by-step guidance for high-quality responses',
    steps: [
      { id: 'step-1', order: 1, title: 'Understand the Question', description: 'Analyze requirements', focusArea: 'completeness', prompts: ['What is being requested?'], requiredElements: ['question-analysis'], validationRules: [] },
      { id: 'step-2', order: 2, title: 'Structure Your Response', description: 'Organize logically', focusArea: 'structure', prompts: ['Start with direct answer'], requiredElements: ['introduction', 'body'], validationRules: [] },
      { id: 'step-3', order: 3, title: 'Add Evidence', description: 'Reference data', focusArea: 'evidence', prompts: ['Which studies support this?'], requiredElements: ['citations'], validationRules: [] },
      { id: 'step-4', order: 4, title: 'Review Compliance', description: 'Check requirements', focusArea: 'compliance', prompts: ['All points addressed?'], requiredElements: ['compliance-check'], validationRules: [] },
      { id: 'step-5', order: 5, title: 'Refine', description: 'Improve clarity', focusArea: 'clarity', prompts: ['Is language clear?'], requiredElements: ['final-review'], validationRules: [] }
    ],
    checkpoints: [{ id: 'cp-1', name: 'Completeness', description: 'All parts addressed', dimensions: ['completeness'], minScore: 70, blocking: true }],
    targetScore: 75
  },
  'template-cmc': {
    id: 'template-cmc', name: 'CMC Response Coaching', description: 'CMC/manufacturing guidance', discipline: 'CMC',
    steps: [
      { id: 'step-cmc-1', order: 1, title: 'Technical Analysis', description: 'Understand CMC requirements', focusArea: 'completeness', prompts: ['What aspect is questioned?'], requiredElements: ['technical-analysis'], validationRules: [] },
      { id: 'step-cmc-2', order: 2, title: 'Data Presentation', description: 'Present batch data', focusArea: 'evidence', prompts: ['Include batch records'], requiredElements: ['batch-data'], validationRules: [] }
    ],
    checkpoints: [{ id: 'cp-cmc-1', name: 'Technical Accuracy', description: 'Data accurate', dimensions: ['evidence'], minScore: 80, blocking: true }],
    targetScore: 80
  }
}

const defaultBenchmarks: PerformanceBenchmark[] = [
  { id: 'bench-quality', name: 'Quality Score', category: 'quality', metric: 'quality-score', value: 75, source: 'internal', percentile: 75, lastUpdated: new Date().toISOString(), applicableTo: {} },
  { id: 'bench-time', name: 'Completion Time', category: 'speed', metric: 'completion-time', value: 5, source: 'internal', percentile: 50, lastUpdated: new Date().toISOString(), applicableTo: {} },
  { id: 'bench-consistency', name: 'Consistency Rate', category: 'consistency', metric: 'consistency-rate', value: 85, source: 'internal', percentile: 70, lastUpdated: new Date().toISOString(), applicableTo: {} }
]

const defaultIntelligenceSources: IntelligenceSource[] = [
  { id: 'src-fda', name: 'FDA Guidance', agency: 'FDA', type: 'official', url: 'https://www.fda.gov/guidance', reliability: 1.0, lastPolled: new Date().toISOString(), pollFrequency: 'daily', status: 'active' },
  { id: 'src-ema', name: 'EMA Guidelines', agency: 'EMA', type: 'official', url: 'https://www.ema.europa.eu/guidelines', reliability: 1.0, lastPolled: new Date().toISOString(), pollFrequency: 'daily', status: 'active' }
]

interface AdvancedCampaignActions {
  isProcessing: boolean; processingProgress: number; currentTask: string; lastError: string | null
  
  createCollaborationSession: (campaignId: string, settings?: Partial<CollaborationSessionSettings>) => CollaborationSession
  joinSession: (sessionId: string, userId: string, userName: string) => void
  leaveSession: (sessionId: string, userId: string) => void
  endSession: (sessionId: string) => void
  getActiveSession: (campaignId: string) => CollaborationSession | null
  updatePresence: (sessionId: string, userId: string, updates: Partial<UserPresence>) => void
  getPresence: (sessionId: string) => UserPresence[]
  acquireLock: (campaignId: string, questionId: string, draftId: string, userId: string, userName: string) => EditLock | null
  releaseLock: (lockId: string) => void
  getLocks: (campaignId: string) => EditLock[]
  isLocked: (questionId: string, draftId: string) => boolean
  submitEdit: (sessionId: string, edit: Omit<LiveEdit, 'id' | 'timestamp' | 'applied'>) => LiveEdit
  addLiveComment: (sessionId: string, comment: Omit<LiveComment, 'id' | 'timestamp' | 'resolved' | 'reactions'>) => LiveComment
  resolveLiveComment: (commentId: string, userId: string) => void
  logCollaborationEvent: (event: Omit<CollaborationEvent, 'id' | 'timestamp'>) => void
  getRecentEvents: (sessionId: string, limit?: number) => CollaborationEvent[]
  
  analyzeQuestionClusters: (campaignId: string, method?: ClusteringMethod) => Promise<QuestionClusterAnalysis>
  getClusterAnalysis: (campaignId: string) => QuestionClusterAnalysis | null
  getClusters: (campaignId: string) => SmartCluster[]
  getCluster: (clusterId: string) => SmartCluster | null
  updateCluster: (clusterId: string, updates: Partial<SmartCluster>) => void
  startClusterBatch: (clusterId: string) => ClusterBatchJob
  getClusterBatchStatus: (jobId: string) => ClusterBatchJob | null
  getClusteringRecommendations: (campaignId: string) => ClusteringRecommendation[]
  
  initializeFeed: (agencies?: RegulatoryAgency[]) => RegulatoryIntelligenceFeed
  refreshFeed: () => Promise<void>
  getFeed: () => RegulatoryIntelligenceFeed | null
  getUpdates: (filters?: { agencies?: RegulatoryAgency[], categories?: UpdateCategory[], days?: number }) => RegulatoryUpdate[]
  acknowledgeUpdate: (updateId: string, userId: string) => void
  getAlerts: (unacknowledgedOnly?: boolean) => RegulatoryAlert[]
  dismissAlert: (alertId: string, userId: string) => void
  createAlertFromUpdate: (updateId: string, alertType: RegulatoryAlert['alertType']) => RegulatoryAlert
  getGuidanceDocuments: (agency?: RegulatoryAgency) => GuidanceDocument[]
  getRegulatoryTrends: () => RegulatoryTrend[]
  subscribe: (subscription: Omit<FeedSubscription, 'id' | 'createdAt'>) => FeedSubscription
  unsubscribe: (subscriptionId: string) => void
  
  startCoachingSession: (questionId: string, draftId: string, userId: string, mode?: CoachingMode) => QualityCoachSession
  getCoachingSession: (sessionId: string) => QualityCoachSession | null
  getActiveCoachingSession: (questionId: string) => QualityCoachSession | null
  pauseCoachingSession: (sessionId: string) => void
  resumeCoachingSession: (sessionId: string) => void
  endCoachingSession: (sessionId: string) => void
  generateInsights: (sessionId: string) => Promise<CoachingInsight[]>
  getInsights: (sessionId: string) => CoachingInsight[]
  dismissInsight: (insightId: string) => void
  generateSuggestions: (sessionId: string) => Promise<CoachingSuggestion[]>
  getSuggestions: (sessionId: string) => CoachingSuggestion[]
  applySuggestion: (suggestionId: string, modification?: string) => ImprovementRecord
  rejectSuggestion: (suggestionId: string) => void
  advanceCoachingStep: (sessionId: string) => void
  getCoachingProgress: (sessionId: string) => CoachingProgress
  getCoachingTemplates: (discipline?: HAQDiscipline) => CoachingTemplate[]
  getCoachingMetrics: (sessionId: string) => CoachingMetrics
  getCoachingHistory: (questionId: string) => CoachingMetrics[]
  
  generateCrossCampaignAnalytics: (timeRange?: AnalyticsTimeRange) => Promise<CrossCampaignAnalytics>
  getAnalytics: () => CrossCampaignAnalytics | null
  getPortfolioMetrics: () => PortfolioMetrics | null
  refreshPortfolioMetrics: () => void
  getCampaignSummaries: () => CampaignSummary[]
  getCampaignSummary: (campaignId: string) => CampaignSummary | null
  getAnalyticsTrends: (metric?: TrendMetric) => AnalyticsTrend[]
  compareCampaigns: (campaignAId: string, campaignBId: string) => CampaignComparison
  getAnalyticsInsights: () => AnalyticsInsight[]
  executeInsightAction: (actionId: string) => void
  getBenchmarks: (category?: BenchmarkCategory) => PerformanceBenchmark[]
  updateBenchmark: (benchmarkId: string, value: number) => void
  generateForecast: (metric: TrendMetric, horizon?: number) => PerformanceForecast
  getForecasts: () => PerformanceForecast[]
}

type AdvancedCampaignStore = AdvancedCampaignState & AdvancedCampaignActions

export const useAdvancedCampaign = create<AdvancedCampaignStore>()(
  devtools(
    (set, get) => ({
      collaborationSessions: {}, userPresence: {}, editLocks: {}, liveEdits: {}, liveComments: {},
      collaborationEvents: [], connectionStatus: 'disconnected',
      clusterAnalyses: {}, activeClusters: {}, clusterBatchJobs: {},
      intelligenceFeeds: {}, regulatoryUpdates: [], regulatoryAlerts: [], guidanceDocuments: [], feedSubscriptions: [],
      coachingSessions: {}, coachingTemplates: defaultCoachingTemplates, coachingHistory: {},
      crossCampaignAnalytics: null, campaignSummaries: {}, portfolioMetrics: null, analyticsTrends: [],
      performanceBenchmarks: defaultBenchmarks, performanceForecasts: [], analyticsInsights: [],
      isProcessing: false, processingProgress: 0, currentTask: '', lastError: null,

      createCollaborationSession: (campaignId, settings) => {
        const sessionId = generateId('session')
        const session: CollaborationSession = {
          id: sessionId, campaignId, startedAt: new Date().toISOString(), hostUserId: 'current-user',
          participantIds: ['current-user'], status: 'active',
          settings: { allowConcurrentEdits: true, lockOnEdit: false, autoSaveInterval: 30, presenceTimeout: 60, conflictResolution: 'last-write-wins', ...settings }
        }
        set(state => ({ collaborationSessions: { ...state.collaborationSessions, [sessionId]: session }, userPresence: { ...state.userPresence, [sessionId]: [] }, connectionStatus: 'connected' }), false, 'createCollaborationSession')
        return session
      },
      
      joinSession: (sessionId, userId, userName) => {
        const presence: UserPresence = { userId, userName, color: generateColor(), status: 'active', lastActiveAt: new Date().toISOString(), isTyping: false }
        set(state => {
          const session = state.collaborationSessions[sessionId]; if (!session) return state
          return {
            collaborationSessions: { ...state.collaborationSessions, [sessionId]: { ...session, participantIds: Array.from(new Set([...session.participantIds, userId])) } },
            userPresence: { ...state.userPresence, [sessionId]: [...(state.userPresence[sessionId] || []).filter(p => p.userId !== userId), presence] }
          }
        }, false, 'joinSession')
        get().logCollaborationEvent({ sessionId, type: 'user-joined', userId, userName, data: {} })
      },
      
      leaveSession: (sessionId, userId) => {
        set(state => {
          const session = state.collaborationSessions[sessionId]; if (!session) return state
          return {
            collaborationSessions: { ...state.collaborationSessions, [sessionId]: { ...session, participantIds: session.participantIds.filter(id => id !== userId) } },
            userPresence: { ...state.userPresence, [sessionId]: (state.userPresence[sessionId] || []).filter(p => p.userId !== userId) }
          }
        }, false, 'leaveSession')
      },
      
      endSession: (sessionId) => {
        set(state => {
          const session = state.collaborationSessions[sessionId]; if (!session) return state
          return { collaborationSessions: { ...state.collaborationSessions, [sessionId]: { ...session, status: 'ended', endedAt: new Date().toISOString() } } }
        }, false, 'endSession')
      },
      
      getActiveSession: (campaignId) => Object.values(get().collaborationSessions).find(s => s.campaignId === campaignId && s.status === 'active') || null,
      
      updatePresence: (sessionId, userId, updates) => {
        set(state => {
          const presence = state.userPresence[sessionId] || []; const idx = presence.findIndex(p => p.userId === userId); if (idx === -1) return state
          const updated = [...presence]; updated[idx] = { ...updated[idx], ...updates, lastActiveAt: new Date().toISOString() }
          return { userPresence: { ...state.userPresence, [sessionId]: updated } }
        }, false, 'updatePresence')
      },
      
      getPresence: (sessionId) => get().userPresence[sessionId] || [],
      
      acquireLock: (campaignId, questionId, draftId, userId, userName) => {
        const locks = get().editLocks[campaignId] || []
        const existing = locks.find(l => l.questionId === questionId && l.draftId === draftId)
        if (existing && existing.lockedBy !== userId) return null
        const lock: EditLock = { id: generateId('lock'), questionId, draftId, lockedBy: userId, lockedByName: userName, lockedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() }
        set(state => ({ editLocks: { ...state.editLocks, [campaignId]: [...(state.editLocks[campaignId] || []).filter(l => !(l.questionId === questionId && l.draftId === draftId)), lock] } }), false, 'acquireLock')
        return lock
      },
      
      releaseLock: (lockId) => {
        set(state => {
          const newLocks: Record<string, EditLock[]> = {}
          Object.entries(state.editLocks).forEach(([campId, locks]) => { newLocks[campId] = locks.filter(l => l.id !== lockId) })
          return { editLocks: newLocks }
        }, false, 'releaseLock')
      },
      
      getLocks: (campaignId) => get().editLocks[campaignId] || [],
      isLocked: (questionId, draftId) => Object.values(get().editLocks).flat().some(l => l.questionId === questionId && l.draftId === draftId && new Date(l.expiresAt) > new Date()),
      
      submitEdit: (sessionId, edit) => {
        const liveEdit: LiveEdit = { ...edit, id: generateId('edit'), timestamp: new Date().toISOString(), applied: true }
        set(state => ({ liveEdits: { ...state.liveEdits, [sessionId]: [...(state.liveEdits[sessionId] || []), liveEdit] } }), false, 'submitEdit')
        return liveEdit
      },
      
      addLiveComment: (sessionId, comment) => {
        const liveComment: LiveComment = { ...comment, id: generateId('comment'), timestamp: new Date().toISOString(), resolved: false, reactions: [] }
        set(state => ({ liveComments: { ...state.liveComments, [sessionId]: [...(state.liveComments[sessionId] || []), liveComment] } }), false, 'addLiveComment')
        return liveComment
      },
      
      resolveLiveComment: (commentId, userId) => {
        set(state => {
          const newComments: Record<string, LiveComment[]> = {}
          Object.entries(state.liveComments).forEach(([sessId, comments]) => {
            newComments[sessId] = comments.map(c => c.id === commentId ? { ...c, resolved: true, resolvedBy: userId, resolvedAt: new Date().toISOString() } : c)
          })
          return { liveComments: newComments }
        }, false, 'resolveLiveComment')
      },
      
      logCollaborationEvent: (event) => {
        const fullEvent: CollaborationEvent = { ...event, id: generateId('event'), timestamp: new Date().toISOString() }
        set(state => ({ collaborationEvents: [...state.collaborationEvents.slice(-999), fullEvent] }), false, 'logCollaborationEvent')
      },
      
      getRecentEvents: (sessionId, limit = 50) => get().collaborationEvents.filter(e => e.sessionId === sessionId).slice(-limit),

      analyzeQuestionClusters: async (campaignId, method = 'hybrid') => {
        set({ isProcessing: true, currentTask: 'Analyzing question clusters...' }, false, 'analyzeQuestionClusters:start')
        const campaignStore = useResponseCampaign.getState(); const haqStore = useHAQStore.getState()
        const campaign = campaignStore.getCampaign(campaignId)
        if (!campaign) { set({ isProcessing: false, lastError: 'Campaign not found' }); throw new Error('Campaign not found') }
        
        const questions = campaign.config.questionIds.map(id => haqStore.haqs.find(q => q.id === id)).filter(Boolean)
        const byDiscipline: Record<string, typeof questions> = {}
        questions.forEach(q => { if (!q) return; const disc = q.discipline || 'Other'; if (!byDiscipline[disc]) byDiscipline[disc] = []; byDiscipline[disc].push(q) })
        
        const clusters: SmartCluster[] = Object.entries(byDiscipline).map(([discipline, qs], idx) => {
          const keywords = new Set<string>(); qs.forEach(q => q?.tags?.forEach(t => keywords.add(t)))
          return {
            id: generateId('cluster'), name: `${discipline} Questions`, description: `Cluster of ${qs.length} ${discipline} questions`,
            questionIds: qs.map(q => q!.id), theme: { primary: discipline, secondary: [], concepts: [], regulatoryContext: [] },
            keywords: Array.from(keywords), discipline: discipline as HAQDiscipline, ctdSections: Array.from(new Set(qs.map(q => q?.ctdSection).filter(Boolean) as string[])),
            cohesionScore: 0.85, separationScore: 0.78, silhouetteScore: 0.81, relatedClusters: [], dependencies: [],
            batchPriority: idx + 1, estimatedBatchDuration: qs.length * 30,
            suggestedStrategy: { approach: 'parallel', rationale: 'Can be addressed concurrently', expectedBenefits: ['Consistent terminology'], risks: [], estimatedEfficiency: 25 },
            sharedElements: [{ elementType: 'background', description: `Shared background for ${discipline}`, applicableQuestions: qs.map(q => q!.id), confidence: 0.85 }],
            consistencyRequirements: [{ id: generateId('rule'), name: `${discipline} Terminology`, description: 'Use consistent terminology', scope: 'intra-cluster', checkType: 'terminology', severity: 'warning' }]
          }
        })
        
        const analysis: QuestionClusterAnalysis = {
          id: generateId('analysis'), campaignId, analyzedAt: new Date().toISOString(), totalQuestions: questions.length, clusters, unclusteredQuestions: [], clusteringMethod: method, confidence: 0.82,
          recommendations: clusters.length > 1 ? [{ id: generateId('rec'), type: 'parallelize', description: 'Process clusters in parallel', affectedClusters: clusters.map(c => c.id), expectedImpact: '20-30% time savings', effort: 'low', priority: 1 }] : []
        }
        
        set(state => ({ clusterAnalyses: { ...state.clusterAnalyses, [campaignId]: analysis }, activeClusters: { ...state.activeClusters, [campaignId]: clusters }, isProcessing: false, processingProgress: 100, currentTask: '' }), false, 'analyzeQuestionClusters:complete')
        return analysis
      },
      
      getClusterAnalysis: (campaignId) => get().clusterAnalyses[campaignId] || null,
      getClusters: (campaignId) => get().activeClusters[campaignId] || [],
      getCluster: (clusterId) => Object.values(get().activeClusters).flat().find(c => c.id === clusterId) || null,
      
      updateCluster: (clusterId, updates) => {
        set(state => {
          const newClusters: Record<string, SmartCluster[]> = {}
          Object.entries(state.activeClusters).forEach(([campId, clusters]) => { newClusters[campId] = clusters.map(c => c.id === clusterId ? { ...c, ...updates } : c) })
          return { activeClusters: newClusters }
        }, false, 'updateCluster')
      },
      
      startClusterBatch: (clusterId) => {
        const cluster = get().getCluster(clusterId); if (!cluster) throw new Error('Cluster not found')
        const job: ClusterBatchJob = { id: generateId('batch'), clusterId, clusterName: cluster.name, status: 'running', startedAt: new Date().toISOString(), questionIds: cluster.questionIds, progress: 0, results: [], errors: [] }
        set(state => ({ clusterBatchJobs: { ...state.clusterBatchJobs, [clusterId]: [...(state.clusterBatchJobs[clusterId] || []), job] } }), false, 'startClusterBatch')
        
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          if (progress >= 100) {
            clearInterval(interval)
            set(state => {
              const jobs = state.clusterBatchJobs[clusterId] || []
              return { clusterBatchJobs: { ...state.clusterBatchJobs, [clusterId]: jobs.map(j => j.id === job.id ? { ...j, status: 'completed', completedAt: new Date().toISOString(), progress: 100, results: cluster.questionIds.map(qId => ({ questionId: qId, success: true, draftId: generateId('draft'), qualityScore: 70 + Math.random() * 20, processingTime: 30000, sharedElementsApplied: ['background'] })) } : j) } }
            }, false, 'clusterBatch:complete')
          } else {
            set(state => {
              const jobs = state.clusterBatchJobs[clusterId] || []
              return { clusterBatchJobs: { ...state.clusterBatchJobs, [clusterId]: jobs.map(j => j.id === job.id ? { ...j, progress } : j) } }
            }, false, 'clusterBatch:progress')
          }
        }, 500)
        return job
      },
      
      getClusterBatchStatus: (jobId) => Object.values(get().clusterBatchJobs).flat().find(j => j.id === jobId) || null,
      getClusteringRecommendations: (campaignId) => get().clusterAnalyses[campaignId]?.recommendations || [],

      initializeFeed: (agencies = ['FDA', 'EMA', 'PMDA']) => {
        const feed: RegulatoryIntelligenceFeed = {
          id: generateId('feed'), lastUpdated: new Date().toISOString(),
          sources: defaultIntelligenceSources.filter(s => agencies.includes(s.agency)), updates: [], alerts: [], guidance: [],
          trends: [
            { id: generateId('trend'), name: 'Increased Focus on Patient-Reported Outcomes', description: 'Agencies increasingly require PRO data', agencies: ['FDA', 'EMA'], disciplines: ['Clinical'], direction: 'increasing', confidence: 0.85, timeframe: '2024-2025', indicators: [{ metric: 'PRO requirements', currentValue: 45, previousValue: 30, changePercent: 50, source: 'FDA analysis' }], implications: ['Include PRO endpoints'], recommendations: ['Review FDA PRO guidance'] },
            { id: generateId('trend'), name: 'Real-World Evidence Acceptance', description: 'Growing RWE acceptance', agencies: ['FDA', 'EMA', 'PMDA'], disciplines: ['Clinical', 'Safety'], direction: 'increasing', confidence: 0.78, timeframe: '2024-2026', indicators: [{ metric: 'RWE submissions', currentValue: 120, previousValue: 80, changePercent: 50, source: 'Analysis' }], implications: ['Develop RWE strategy'], recommendations: ['Build RWE capabilities'] }
          ],
          subscriptions: []
        }
        
        const sampleUpdates: RegulatoryUpdate[] = [
          { id: generateId('update'), sourceId: 'src-fda', agency: 'FDA', publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), title: 'Updated Guidance on Clinical Trial Diversity', summary: 'FDA releases updated diversity guidance', content: 'The FDA has issued updated guidance...', url: 'https://www.fda.gov/guidance/diversity', type: 'guidance-revised', category: 'clinical', tags: ['diversity'], relevanceScore: 0.9, impactAssessment: { severity: 'high', urgency: 'medium-term', affectedAreas: ['Clinical'], requiredActions: [{ id: generateId('action'), description: 'Review diversity plans', priority: 1, status: 'pending' }] }, affectedDisciplines: ['Clinical'], affectedCTDSections: ['2.7.3'], relatedCampaigns: [], acknowledged: false },
          { id: generateId('update'), sourceId: 'src-ema', agency: 'EMA', publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), title: 'New CMC Documentation Requirements', summary: 'EMA new CMC requirements for Module 3', content: 'Updated requirements...', type: 'guidance-new', category: 'cmc', tags: ['cmc'], relevanceScore: 0.85, impactAssessment: { severity: 'medium', urgency: 'short-term', affectedAreas: ['CMC'], requiredActions: [{ id: generateId('action'), description: 'Update templates', priority: 2, status: 'pending' }] }, affectedDisciplines: ['CMC'], affectedCTDSections: ['3.2.S'], relatedCampaigns: [], acknowledged: false }
        ]
        
        set(state => ({ intelligenceFeeds: { ...state.intelligenceFeeds, default: feed }, regulatoryUpdates: [...state.regulatoryUpdates, ...sampleUpdates] }), false, 'initializeFeed')
        return feed
      },
      
      refreshFeed: async () => {
        set({ isProcessing: true, currentTask: 'Refreshing regulatory feed...' }, false, 'refreshFeed:start')
        await new Promise(resolve => setTimeout(resolve, 1000))
        set(state => ({ intelligenceFeeds: { ...state.intelligenceFeeds, default: state.intelligenceFeeds.default ? { ...state.intelligenceFeeds.default, lastUpdated: new Date().toISOString() } : state.intelligenceFeeds.default }, isProcessing: false }), false, 'refreshFeed:complete')
      },
      
      getFeed: () => get().intelligenceFeeds.default || null,
      
      getUpdates: (filters) => {
        let updates = get().regulatoryUpdates
        if (filters?.agencies) updates = updates.filter(u => filters.agencies!.includes(u.agency))
        if (filters?.categories) updates = updates.filter(u => filters.categories!.includes(u.category))
        if (filters?.days) { const cutoff = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000); updates = updates.filter(u => new Date(u.publishedAt) >= cutoff) }
        return updates.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      },
      
      acknowledgeUpdate: (updateId, userId) => { set(state => ({ regulatoryUpdates: state.regulatoryUpdates.map(u => u.id === updateId ? { ...u, acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() } : u) }), false, 'acknowledgeUpdate') },
      
      getAlerts: (unacknowledgedOnly = false) => {
        let alerts = get().regulatoryAlerts
        if (unacknowledgedOnly) alerts = alerts.filter(a => !a.dismissed)
        return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },
      
      dismissAlert: (alertId, userId) => { set(state => ({ regulatoryAlerts: state.regulatoryAlerts.map(a => a.id === alertId ? { ...a, dismissed: true, dismissedBy: userId, dismissedAt: new Date().toISOString() } : a) }), false, 'dismissAlert') },
      
      createAlertFromUpdate: (updateId, alertType) => {
        const update = get().regulatoryUpdates.find(u => u.id === updateId); if (!update) throw new Error('Update not found')
        const alert: RegulatoryAlert = { id: generateId('alert'), updateId, createdAt: new Date().toISOString(), alertType, title: update.title, message: update.summary, actions: [{ id: generateId('action'), label: 'View', type: 'link', url: update.url }], dismissed: false, campaignIds: [] }
        set(state => ({ regulatoryAlerts: [...state.regulatoryAlerts, alert] }), false, 'createAlertFromUpdate')
        return alert
      },
      
      getGuidanceDocuments: (agency) => { let docs = get().guidanceDocuments; if (agency) docs = docs.filter(d => d.agency === agency); return docs },
      getRegulatoryTrends: () => get().intelligenceFeeds.default?.trends || [],
      
      subscribe: (subscription) => { const sub: FeedSubscription = { ...subscription, id: generateId('sub'), createdAt: new Date().toISOString() }; set(state => ({ feedSubscriptions: [...state.feedSubscriptions, sub] }), false, 'subscribe'); return sub },
      unsubscribe: (subscriptionId) => { set(state => ({ feedSubscriptions: state.feedSubscriptions.filter(s => s.id !== subscriptionId) }), false, 'unsubscribe') },

      startCoachingSession: (questionId, draftId, userId, mode = 'interactive') => {
        const template = Object.values(get().coachingTemplates).find(t => !t.discipline) || Object.values(get().coachingTemplates)[0]
        const session: QualityCoachSession = {
          id: generateId('coach'), questionId, draftId, userId, startedAt: new Date().toISOString(), status: 'active', mode,
          currentStep: 1, totalSteps: template.steps.length,
          progress: { structureComplete: false, contentComplete: false, evidenceComplete: false, complianceComplete: false, overallProgress: 0, estimatedTimeRemaining: 30 },
          insights: [], suggestions: [], improvements: [],
          metrics: { sessionDuration: 0, suggestionsGenerated: 0, suggestionsApplied: 0, suggestionsRejected: 0, qualityImprovement: 0, dimensionImprovements: {}, commonIssues: [] }
        }
        set(state => ({ coachingSessions: { ...state.coachingSessions, [session.id]: session } }), false, 'startCoachingSession')
        return session
      },
      
      getCoachingSession: (sessionId) => get().coachingSessions[sessionId] || null,
      getActiveCoachingSession: (questionId) => Object.values(get().coachingSessions).find(s => s.questionId === questionId && s.status === 'active') || null,
      pauseCoachingSession: (sessionId) => { set(state => ({ coachingSessions: { ...state.coachingSessions, [sessionId]: state.coachingSessions[sessionId] ? { ...state.coachingSessions[sessionId], status: 'paused' } : state.coachingSessions[sessionId] } }), false, 'pauseCoachingSession') },
      resumeCoachingSession: (sessionId) => { set(state => ({ coachingSessions: { ...state.coachingSessions, [sessionId]: state.coachingSessions[sessionId] ? { ...state.coachingSessions[sessionId], status: 'active' } : state.coachingSessions[sessionId] } }), false, 'resumeCoachingSession') },
      
      endCoachingSession: (sessionId) => {
        const session = get().coachingSessions[sessionId]; if (!session) return
        const duration = Math.round((new Date().getTime() - new Date(session.startedAt).getTime()) / 60000)
        set(state => ({
          coachingSessions: { ...state.coachingSessions, [sessionId]: { ...session, status: 'completed', endedAt: new Date().toISOString(), metrics: { ...session.metrics, sessionDuration: duration } } },
          coachingHistory: { ...state.coachingHistory, [session.questionId]: [...(state.coachingHistory[session.questionId] || []), { ...session.metrics, sessionDuration: duration }] }
        }), false, 'endCoachingSession')
      },
      
      generateInsights: async (sessionId) => {
        const session = get().coachingSessions[sessionId]; if (!session) return []
        set({ isProcessing: true, currentTask: 'Analyzing response quality...' }, false, 'generateInsights:start')
        await new Promise(resolve => setTimeout(resolve, 800))
        const insights: CoachingInsight[] = [
          { id: generateId('insight'), category: 'structure', severity: 'suggestion', title: 'Consider adding a summary', description: 'A brief summary helps reviewers', dismissed: false },
          { id: generateId('insight'), category: 'evidence', severity: 'important', title: 'Add data references', description: 'Supporting claims strengthens response', location: { startOffset: 150, endOffset: 200, excerpt: '...has been validated...' }, dismissed: false },
          { id: generateId('insight'), category: 'clarity', severity: 'suggestion', title: 'Simplify technical language', description: 'Consider explaining technical terms', dismissed: false }
        ]
        set(state => ({ coachingSessions: { ...state.coachingSessions, [sessionId]: { ...session, insights: [...session.insights, ...insights], metrics: { ...session.metrics, suggestionsGenerated: session.metrics.suggestionsGenerated + insights.length } } }, isProcessing: false }), false, 'generateInsights:complete')
        return insights
      },
      
      getInsights: (sessionId) => get().coachingSessions[sessionId]?.insights || [],
      
      dismissInsight: (insightId) => {
        set(state => {
          const newSessions: Record<string, QualityCoachSession> = {}
          Object.entries(state.coachingSessions).forEach(([id, session]) => { newSessions[id] = { ...session, insights: session.insights.map(i => i.id === insightId ? { ...i, dismissed: true } : i) } })
          return { coachingSessions: newSessions }
        }, false, 'dismissInsight')
      },
      
      generateSuggestions: async (sessionId) => {
        const session = get().coachingSessions[sessionId]; if (!session) return []
        set({ isProcessing: true, currentTask: 'Generating improvement suggestions...' }, false, 'generateSuggestions:start')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const suggestions: CoachingSuggestion[] = [
          { id: generateId('suggestion'), insightId: session.insights[0]?.id || '', type: 'add', priority: 1, title: 'Add executive summary', description: 'Add 2-3 sentence summary', suggestedText: 'In summary, this response addresses [key points].', rationale: 'Improves readability', impact: { qualityDelta: 5, affectedDimensions: ['structure'], confidence: 0.85, effort: 'minimal' }, status: 'pending' },
          { id: generateId('suggestion'), insightId: session.insights[1]?.id || '', type: 'reference', priority: 2, title: 'Add CTD cross-reference', description: 'Reference CTD section', originalText: 'validated', suggestedText: 'validated (see Section 3.2.S.2.4)', rationale: 'Provides evidence trail', impact: { qualityDelta: 8, affectedDimensions: ['evidence'], confidence: 0.9, effort: 'minimal' }, status: 'pending' }
        ]
        set(state => ({ coachingSessions: { ...state.coachingSessions, [sessionId]: { ...session, suggestions: [...session.suggestions, ...suggestions] } }, isProcessing: false }), false, 'generateSuggestions:complete')
        return suggestions
      },
      
      getSuggestions: (sessionId) => get().coachingSessions[sessionId]?.suggestions || [],
      
      applySuggestion: (suggestionId, modification) => {
        let record: ImprovementRecord = { id: '', suggestionId: '', timestamp: '', action: 'applied', beforeContent: '', afterContent: '', qualityBefore: 0, qualityAfter: 0 }
        set(state => {
          const newSessions: Record<string, QualityCoachSession> = {}
          Object.entries(state.coachingSessions).forEach(([id, session]) => {
            const suggestionIdx = session.suggestions.findIndex(s => s.id === suggestionId); if (suggestionIdx === -1) { newSessions[id] = session; return }
            const suggestion = session.suggestions[suggestionIdx]
            record = { id: generateId('improvement'), suggestionId, timestamp: new Date().toISOString(), action: modification ? 'modified' : 'applied', beforeContent: suggestion.originalText || '', afterContent: modification || suggestion.suggestedText || '', qualityBefore: 70, qualityAfter: 70 + (suggestion.impact?.qualityDelta || 5) }
            newSessions[id] = { ...session, suggestions: session.suggestions.map(s => s.id === suggestionId ? { ...s, status: 'applied', appliedAt: new Date().toISOString() } : s), improvements: [...session.improvements, record], metrics: { ...session.metrics, suggestionsApplied: session.metrics.suggestionsApplied + 1, qualityImprovement: session.metrics.qualityImprovement + (suggestion.impact?.qualityDelta || 5) } }
          })
          return { coachingSessions: newSessions }
        }, false, 'applySuggestion')
        return record
      },
      
      rejectSuggestion: (suggestionId) => {
        set(state => {
          const newSessions: Record<string, QualityCoachSession> = {}
          Object.entries(state.coachingSessions).forEach(([id, session]) => { newSessions[id] = { ...session, suggestions: session.suggestions.map(s => s.id === suggestionId ? { ...s, status: 'rejected' } : s), metrics: { ...session.metrics, suggestionsRejected: session.metrics.suggestionsRejected + 1 } } })
          return { coachingSessions: newSessions }
        }, false, 'rejectSuggestion')
      },
      
      advanceCoachingStep: (sessionId) => {
        set(state => {
          const session = state.coachingSessions[sessionId]; if (!session || session.currentStep >= session.totalSteps) return state
          const newStep = session.currentStep + 1
          return { coachingSessions: { ...state.coachingSessions, [sessionId]: { ...session, currentStep: newStep, progress: { ...session.progress, overallProgress: Math.round((newStep / session.totalSteps) * 100) } } } }
        }, false, 'advanceCoachingStep')
      },
      
      getCoachingProgress: (sessionId) => get().coachingSessions[sessionId]?.progress || { structureComplete: false, contentComplete: false, evidenceComplete: false, complianceComplete: false, overallProgress: 0, estimatedTimeRemaining: 0 },
      getCoachingTemplates: (discipline) => { let templates = Object.values(get().coachingTemplates); if (discipline) templates = templates.filter(t => !t.discipline || t.discipline === discipline); return templates },
      getCoachingMetrics: (sessionId) => get().coachingSessions[sessionId]?.metrics || { sessionDuration: 0, suggestionsGenerated: 0, suggestionsApplied: 0, suggestionsRejected: 0, qualityImprovement: 0, dimensionImprovements: {}, commonIssues: [] },
      getCoachingHistory: (questionId) => get().coachingHistory[questionId] || [],

      generateCrossCampaignAnalytics: async (timeRange) => {
        set({ isProcessing: true, currentTask: 'Generating analytics...' }, false, 'generateAnalytics:start')
        const campaignStore = useResponseCampaign.getState(); const campaigns = Object.values(campaignStore.campaigns)
        const range: AnalyticsTimeRange = timeRange || { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString(), granularity: 'week' }
        
        const summaries: CampaignSummary[] = campaigns.map(c => ({
          campaignId: c.id, campaignName: c.config.name, status: c.status, createdAt: c.createdAt, completedAt: c.status === 'submitted' ? c.updatedAt : undefined,
          questionCount: c.config.questionIds.length, completedCount: Object.values(c.questionProgress).filter(p => p.status === 'approved').length,
          avgQualityScore: c.qualityMetrics.averageScore, consistencyScore: c.qualityMetrics.consistencyScore, onTimeDelivery: true, teamSize: c.config.assignedTo?.length || 1,
          disciplines: ['Clinical' as HAQDiscipline], agencies: ['FDA' as RegulatoryAgency]
        }))
        
        const totalQuestions = summaries.reduce((sum, s) => sum + s.questionCount, 0)
        const avgQuality = summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.avgQualityScore, 0) / summaries.length : 75
        
        const portfolioMetrics: PortfolioMetrics = {
          totalCampaigns: campaigns.length, activeCampaigns: campaigns.filter(c => !['submitted', 'cancelled'].includes(c.status)).length, completedCampaigns: campaigns.filter(c => c.status === 'submitted').length,
          totalQuestions, questionsCompleted: summaries.reduce((sum, s) => sum + s.completedCount, 0), avgCompletionTime: 7, avgQualityScore: avgQuality, qualityTrend: 'improving', consistencyRate: 85, onTimeRate: 92,
          resourceUtilization: { totalCapacity: 1000, usedCapacity: 750, utilization: 75, overloadedResources: [], underutilizedResources: [] },
          disciplineBreakdown: [
            { discipline: 'Clinical', questionCount: Math.floor(totalQuestions * 0.4), avgQualityScore: 78, avgCompletionTime: 8, consistencyIssues: 2, trend: 'improving' },
            { discipline: 'CMC', questionCount: Math.floor(totalQuestions * 0.3), avgQualityScore: 76, avgCompletionTime: 6, consistencyIssues: 1, trend: 'stable' },
            { discipline: 'Safety', questionCount: Math.floor(totalQuestions * 0.2), avgQualityScore: 80, avgCompletionTime: 7, consistencyIssues: 0, trend: 'improving' }
          ],
          agencyBreakdown: [
            { agency: 'FDA', campaignCount: Math.ceil(campaigns.length * 0.6), questionCount: Math.floor(totalQuestions * 0.6), avgQualityScore: 77, formatComplianceRate: 95, submissionSuccessRate: 100 },
            { agency: 'EMA', campaignCount: Math.floor(campaigns.length * 0.3), questionCount: Math.floor(totalQuestions * 0.3), avgQualityScore: 76, formatComplianceRate: 93, submissionSuccessRate: 100 }
          ]
        }
        
        const trends: AnalyticsTrend[] = [
          { id: generateId('trend'), metric: 'quality-score', period: 'Last 90 days', dataPoints: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(), value: 72 + i * 0.5 + Math.random() * 3 })), trendLine: { slope: 0.5, intercept: 72, r2: 0.85, direction: 'improving', significance: 0.95 }, anomalies: [] },
          { id: generateId('trend'), metric: 'completion-time', period: 'Last 90 days', dataPoints: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(), value: 8 - i * 0.1 + Math.random() * 0.5 })), trendLine: { slope: -0.1, intercept: 8, r2: 0.78, direction: 'improving', significance: 0.88 }, anomalies: [] }
        ]
        
        const insights: AnalyticsInsight[] = [
          { id: generateId('insight'), type: 'performance', priority: 'high', title: 'Quality scores improving', description: 'Scores up 6% over 90 days', evidence: ['Upward trend'], recommendation: 'Continue coaching practices', expectedImpact: 'Reach 80+ by Q2', affectedCampaigns: summaries.map(s => s.campaignId), actionable: false },
          { id: generateId('insight'), type: 'efficiency', priority: 'medium', title: 'CMC responses slower', description: 'CMC 15% slower than others', evidence: ['CMC avg: 8 days vs 6.5'], recommendation: 'Add CMC templates', expectedImpact: 'Reduce by 20%', affectedCampaigns: [], actionable: true, actions: [{ id: generateId('action'), description: 'Review CMC templates', effort: 'medium', expectedOutcome: 'Optimization opportunities', status: 'pending' }] }
        ]
        
        const analytics: CrossCampaignAnalytics = { id: generateId('analytics'), generatedAt: new Date().toISOString(), timeRange: range, campaigns: summaries, portfolioMetrics, trends, comparisons: [], insights, benchmarks: get().performanceBenchmarks, forecasts: [] }
        const summaryRecord: Record<string, CampaignSummary> = {}; summaries.forEach(s => { summaryRecord[s.campaignId] = s })
        
        set({ crossCampaignAnalytics: analytics, campaignSummaries: summaryRecord, portfolioMetrics, analyticsTrends: trends, analyticsInsights: insights, isProcessing: false, processingProgress: 100, currentTask: '' }, false, 'generateAnalytics:complete')
        return analytics
      },
      
      getAnalytics: () => get().crossCampaignAnalytics,
      getPortfolioMetrics: () => get().portfolioMetrics,
      refreshPortfolioMetrics: () => { get().generateCrossCampaignAnalytics() },
      getCampaignSummaries: () => Object.values(get().campaignSummaries),
      getCampaignSummary: (campaignId) => get().campaignSummaries[campaignId] || null,
      getAnalyticsTrends: (metric) => { let trends = get().analyticsTrends; if (metric) trends = trends.filter(t => t.metric === metric); return trends },
      
      compareCampaigns: (campaignAId, campaignBId) => {
        const summaryA = get().campaignSummaries[campaignAId]; const summaryB = get().campaignSummaries[campaignBId]
        if (!summaryA || !summaryB) throw new Error('Campaign not found')
        
        const dimensions: ComparisonDimension[] = [
          { name: 'Quality Score', valueA: summaryA.avgQualityScore, valueB: summaryB.avgQualityScore, difference: summaryA.avgQualityScore - summaryB.avgQualityScore, percentDiff: ((summaryA.avgQualityScore - summaryB.avgQualityScore) / summaryB.avgQualityScore) * 100, winner: summaryA.avgQualityScore > summaryB.avgQualityScore ? 'a' : summaryA.avgQualityScore < summaryB.avgQualityScore ? 'b' : 'tie', significance: 'high' },
          { name: 'Consistency', valueA: summaryA.consistencyScore, valueB: summaryB.consistencyScore, difference: summaryA.consistencyScore - summaryB.consistencyScore, percentDiff: 0, winner: summaryA.consistencyScore > summaryB.consistencyScore ? 'a' : 'b', significance: 'medium' }
        ]
        
        return { id: generateId('comparison'), campaignAId, campaignBId, comparedAt: new Date().toISOString(), dimensions, winner: dimensions.filter(d => d.winner === 'a').length > dimensions.filter(d => d.winner === 'b').length ? 'a' : 'b', insights: ['Quality metrics compared'], learnings: [{ id: generateId('learning'), category: 'process', finding: 'More refinement = higher quality', recommendation: 'Plan 2+ refinement rounds', applicability: 'universal' }] }
      },
      
      getAnalyticsInsights: () => get().analyticsInsights,
      executeInsightAction: (actionId) => { set(state => ({ analyticsInsights: state.analyticsInsights.map(insight => ({ ...insight, actions: insight.actions?.map(a => a.id === actionId ? { ...a, status: 'in-progress' as const } : a) })) }), false, 'executeInsightAction') },
      getBenchmarks: (category) => { let b = get().performanceBenchmarks; if (category) b = b.filter(x => x.category === category); return b },
      updateBenchmark: (benchmarkId, value) => { set(state => ({ performanceBenchmarks: state.performanceBenchmarks.map(b => b.id === benchmarkId ? { ...b, value, lastUpdated: new Date().toISOString() } : b) }), false, 'updateBenchmark') },
      
      generateForecast: (metric, horizon = 30) => {
        const trend = get().analyticsTrends.find(t => t.metric === metric)
        const predictions: ForecastPrediction[] = Array.from({ length: horizon }, (_, i) => {
          const baseValue = trend?.trendLine ? trend.trendLine.intercept + trend.trendLine.slope * (trend.dataPoints.length + i) : 75
          return { date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(), value: baseValue + Math.random() * 2, lowerBound: baseValue - 5, upperBound: baseValue + 5 }
        })
        
        const forecast: PerformanceForecast = {
          id: generateId('forecast'), metric, generatedAt: new Date().toISOString(), horizon, predictions, confidence: 0.75,
          factors: [{ name: 'Historical trend', impact: 0.6, direction: 'positive', controllable: false }, { name: 'Team capacity', impact: 0.3, direction: 'positive', controllable: true }],
          scenarios: [
            { name: 'Optimistic', description: 'Best case', probability: 0.25, predictions: predictions.map(p => ({ ...p, value: p.value * 1.1 })), triggers: ['Full capacity'] },
            { name: 'Pessimistic', description: 'Challenges', probability: 0.25, predictions: predictions.map(p => ({ ...p, value: p.value * 0.9 })), triggers: ['Constraints'] }
          ]
        }
        
        set(state => ({ performanceForecasts: [...state.performanceForecasts.filter(f => f.metric !== metric), forecast] }), false, 'generateForecast')
        return forecast
      },
      
      getForecasts: () => get().performanceForecasts
    }),
    { name: 'ligature-advanced-campaign' }
  )
)

// Convenience Hooks
export function useCollaborationSession(campaignId: string) { return useAdvancedCampaign(state => state.getActiveSession(campaignId)) }
export function useUserPresence(sessionId: string) { return useAdvancedCampaign(state => state.userPresence[sessionId] || []) }
export function useEditLocks(campaignId: string) { return useAdvancedCampaign(state => state.editLocks[campaignId] || []) }
export function useLiveComments(sessionId: string) { return useAdvancedCampaign(state => state.liveComments[sessionId] || []) }
export function useQuestionClusters(campaignId: string) { return useAdvancedCampaign(state => state.activeClusters[campaignId] || []) }
export function useClusterAnalysis(campaignId: string) { return useAdvancedCampaign(state => state.clusterAnalyses[campaignId] || null) }
export function useClusterBatchJobs(clusterId: string) { return useAdvancedCampaign(state => state.clusterBatchJobs[clusterId] || []) }
export function useRegulatoryFeed() { return useAdvancedCampaign(state => state.intelligenceFeeds.default || null) }

export function useRegulatoryUpdates(filters?: { agencies?: RegulatoryAgency[], days?: number }) {
  const updates = useAdvancedCampaign(state => state.regulatoryUpdates)
  return useMemo(() => {
    let filtered = updates
    if (filters?.agencies) filtered = filtered.filter(u => filters.agencies!.includes(u.agency))
    if (filters?.days) { const cutoff = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000); filtered = filtered.filter(u => new Date(u.publishedAt) >= cutoff) }
    return filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  }, [updates, filters?.agencies, filters?.days])
}

export function useRegulatoryAlerts(unacknowledgedOnly = false) {
  const alerts = useAdvancedCampaign(state => state.regulatoryAlerts)
  return useMemo(() => { let filtered = alerts; if (unacknowledgedOnly) filtered = filtered.filter(a => !a.dismissed); return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }, [alerts, unacknowledgedOnly])
}

export function useActiveCoachingSession(questionId: string) {
  const sessions = useAdvancedCampaign(state => state.coachingSessions)
  return useMemo(() => Object.values(sessions).find(s => s.questionId === questionId && s.status === 'active') || null, [sessions, questionId])
}

export function useCoachingInsights(sessionId: string) { return useAdvancedCampaign(state => state.coachingSessions[sessionId]?.insights || []) }
export function useCoachingSuggestions(sessionId: string) { return useAdvancedCampaign(state => state.coachingSessions[sessionId]?.suggestions || []) }
export function useCrossCampaignAnalytics() { return useAdvancedCampaign(state => state.crossCampaignAnalytics) }
export function usePortfolioMetricsHook() { return useAdvancedCampaign(state => state.portfolioMetrics) }

export function useAnalyticsTrendsHook(metric?: TrendMetric) {
  const trends = useAdvancedCampaign(state => state.analyticsTrends)
  return useMemo(() => metric ? trends.filter(t => t.metric === metric) : trends, [trends, metric])
}

export function useAnalyticsInsightsHook() { return useAdvancedCampaign(state => state.analyticsInsights) }

export function usePerformanceBenchmarks(category?: BenchmarkCategory) {
  const benchmarks = useAdvancedCampaign(state => state.performanceBenchmarks)
  return useMemo(() => category ? benchmarks.filter(b => b.category === category) : benchmarks, [benchmarks, category])
}

export function usePerformanceForecasts() { return useAdvancedCampaign(state => state.performanceForecasts) }
