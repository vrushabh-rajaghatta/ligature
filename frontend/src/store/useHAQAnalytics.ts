

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'
import type { 
  HAQuestion, 
  HAQDiscipline, 
  HAQSource, 
  HAQPriority, 
  HAQStatus,
  QuestionType,
  SimilarQuestion 
} from '@/types/haq'
import { useHAQStore } from './useHAQStore'
import { usePortfolioStore, type Program, type Application, type TherapeuticArea, type Modality } from '@/stores/portfolio-store'

// ============================================================================
// TYPES
// ============================================================================

/** Question cluster based on semantic similarity */
export interface QuestionCluster {
  id: string
  name: string
  description: string
  discipline: HAQDiscipline
  ctdSections: string[]
  keywords: string[]
  questionIds: string[]
  totalQuestions: number
  
  // Cluster statistics
  avgResponseTimeDays: number
  successRate: number // % accepted without follow-up
  agencies: HAQSource[]
  
  // Top themes in this cluster
  topThemes: ClusterTheme[]
  
  // Example questions
  exemplarQuestions: string[]
  
  createdAt: string
  updatedAt: string
}

export interface ClusterTheme {
  theme: string
  frequency: number // 0-100
  exampleQuestionId?: string
}

/** Response pattern tracking */
export interface ResponsePattern {
  id: string
  clusterId: string
  applicationId: string
  questionId: string
  
  // Response details
  responseApproach: string // Brief description of approach
  responseLength: 'brief' | 'moderate' | 'comprehensive'
  includedElements: ResponseElement[]
  
  // Outcome
  outcome: 'accepted' | 'follow-up' | 'rejected'
  followUpQuestionIds?: string[]
  reviewerFeedback?: string
  
  // Timing
  responseTimeDays: number
  submittedDate: string
  outcomeDate?: string
}

export type ResponseElement = 
  | 'data-tables'
  | 'statistical-analysis'
  | 'literature-references'
  | 'mechanism-explanation'
  | 'risk-assessment'
  | 'regulatory-precedent'
  | 'clinical-justification'
  | 'process-description'
  | 'comparability-data'
  | 'stability-data'
  | 'validation-data'
  | 'expert-opinion'

/** Predictive insight for anticipated questions */
export interface PredictiveInsight {
  id: string
  applicationId: string
  applicationNumber: string
  programCode: string
  
  // Prediction details
  predictedQuestion: string
  discipline: HAQDiscipline
  ctdSection: string
  probability: number // 0-100
  confidence: 'low' | 'medium' | 'high'
  
  // Basis for prediction
  rationale: string
  basedOnPatterns: string[] // Cluster IDs
  basedOnSimilarApps: string[] // Application IDs
  historicalFrequency: string // e.g., "Asked in 73% of similar submissions"
  
  // Preparation guidance
  preparationGuidance: string
  suggestedResponseElements: ResponseElement[]
  estimatedEffort: string
  
  // Risk factors
  riskFactors: RiskFactor[]
  
  createdAt: string
}

export interface RiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high'
  mitigation?: string
}

/** Discipline-level analytics */
export interface DisciplineAnalytics {
  discipline: HAQDiscipline
  
  // Volume metrics
  totalQuestions: number
  questionsLast30Days: number
  questionsLast90Days: number
  
  // Performance metrics
  avgResponseTimeDays: number
  onTimeRate: number // %
  successRate: number // % accepted first time
  
  // Agency breakdown
  byAgency: Record<HAQSource, number>
  
  // Priority breakdown
  byPriority: Record<HAQPriority, number>
  
  // Top question clusters
  topClusters: { clusterId: string; count: number }[]
  
  // Trending topics (increasing frequency)
  trendingTopics: TrendingTopic[]
  
  // Resource allocation insights
  avgEffortHours: number
  peakMonths: string[]
}

export interface TrendingTopic {
  topic: string
  trend: 'increasing' | 'stable' | 'decreasing'
  changePercent: number // e.g., +25% means 25% increase
  recentExampleIds: string[]
}

/** Agency comparison analytics */
export interface AgencyComparison {
  // FDA specifics
  fda: AgencyProfile
  // EMA specifics
  ema: AgencyProfile
  // PMDA specifics
  pmda: AgencyProfile
  // Health Canada specifics
  healthCanada: AgencyProfile
  
  // Cross-agency patterns
  commonQuestionTypes: string[]
  uniqueToFDA: string[]
  uniqueToEMA: string[]
  uniqueToPMDA: string[]
  
  // Timeline differences
  avgReviewTimeDifference: string // e.g., "FDA averages 15 days faster than EMA"
}

export interface AgencyProfile {
  agency: HAQSource
  totalQuestions: number
  avgResponseTimeDays: number
  
  // Question type distribution
  byType: Record<QuestionType, number>
  
  // Discipline focus
  topDisciplines: { discipline: HAQDiscipline; percentage: number }[]
  
  // Communication style
  avgQuestionLength: number // words
  formality: 'formal' | 'moderate' | 'direct'
  
  // Focus areas
  keyFocusAreas: string[]
}

/** Application-level HAQ profile */
export interface ApplicationHAQProfile {
  applicationId: string
  applicationNumber: string
  programId: string
  programCode: string
  therapeuticArea: TherapeuticArea
  modality: Modality
  
  // Question summary
  totalQuestions: number
  byDiscipline: Record<HAQDiscipline, number>
  byStatus: Record<HAQStatus, number>
  
  // Performance
  avgResponseTimeDays: number
  onTimeRate: number
  
  // Clusters this application belongs to
  relatedClusters: string[]
  
  // Similar applications for comparison
  similarApplications: SimilarApplication[]
  
  // Predicted upcoming questions
  predictedQuestionCount: number
}

export interface SimilarApplication {
  applicationId: string
  applicationNumber: string
  programCode: string
  similarity: number // 0-100
  matchFactors: string[] // What makes them similar
  questionOverlap: number // % of question types that overlap
}

/** Portfolio-wide analytics summary */
export interface PortfolioHAQAnalytics {
  // Overall metrics
  totalApplications: number
  totalQuestions: number
  activeQuestions: number
  overdueQuestions: number
  
  // Performance
  portfolioOnTimeRate: number
  portfolioSuccessRate: number
  avgResponseTimeDays: number
  
  // Discipline distribution
  byDiscipline: Record<HAQDiscipline, number>
  
  // Agency distribution
  byAgency: Record<HAQSource, number>
  
  // Trend data
  monthlyTrend: MonthlyTrendPoint[]
  
  // Top clusters across portfolio
  topClusters: { cluster: QuestionCluster; count: number }[]
  
  // Applications at risk (high predicted question load)
  atRiskApplications: { applicationId: string; predictedQuestions: number; riskScore: number }[]
  
  // Resource planning
  estimatedUpcomingQuestions: number
  estimatedEffortHours: number
  
  lastCalculated: string
}

export interface MonthlyTrendPoint {
  month: string // YYYY-MM
  received: number
  submitted: number
  avgResponseDays: number
  successRate: number
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/** Compute semantic similarity between two questions (simplified) */
function computeQuestionSimilarity(q1: HAQuestion, q2: HAQuestion): number {
  let score = 0
  
  // Same discipline = +30
  if (q1.discipline === q2.discipline) score += 30
  
  // Same CTD section = +25
  if (q1.ctdSection === q2.ctdSection) score += 25
  
  // Same source = +10
  if (q1.source === q2.source) score += 10
  
  // Same type = +10
  if (q1.type === q2.type) score += 10
  
  // Tag overlap
  const q1Tags = new Set(q1.tags || [])
  const q2Tags = new Set(q2.tags || [])
  const commonTags = Array.from(q1Tags).filter(t => q2Tags.has(t))
  const allTags = new Set([...(q1.tags || []), ...(q2.tags || [])])
  const totalTags = allTags.size
  if (totalTags > 0) {
    score += Math.round((commonTags.length / totalTags) * 25)
  }
  
  return Math.min(score, 100)
}

/** Extract key themes from question text */
function extractThemes(questionText: string): string[] {
  const themes: string[] = []
  const text = questionText.toLowerCase()
  
  // CMC themes
  if (text.includes('stability')) themes.push('stability')
  if (text.includes('dissolution')) themes.push('dissolution')
  if (text.includes('specification')) themes.push('specifications')
  if (text.includes('impurity') || text.includes('impurities')) themes.push('impurities')
  if (text.includes('process') && text.includes('valid')) themes.push('process-validation')
  if (text.includes('control strategy')) themes.push('control-strategy')
  if (text.includes('comparability')) themes.push('comparability')
  if (text.includes('crystallization')) themes.push('crystallization')
  if (text.includes('cpp') || text.includes('critical process')) themes.push('critical-process-parameters')
  
  // Clinical themes
  if (text.includes('efficacy')) themes.push('efficacy')
  if (text.includes('safety')) themes.push('safety')
  if (text.includes('dose') && (text.includes('modification') || text.includes('adjustment'))) themes.push('dose-modification')
  if (text.includes('missing data')) themes.push('missing-data')
  if (text.includes('imputation')) themes.push('statistical-imputation')
  if (text.includes('subgroup')) themes.push('subgroup-analysis')
  if (text.includes('endpoint')) themes.push('endpoints')
  
  // Nonclinical themes
  if (text.includes('carcinogen')) themes.push('carcinogenicity')
  if (text.includes('genotox')) themes.push('genotoxicity')
  if (text.includes('hepato')) themes.push('hepatotoxicity')
  if (text.includes('reproductive') || text.includes('fertility')) themes.push('reproductive-toxicity')
  if (text.includes('human relevance')) themes.push('human-relevance')
  
  // Labeling themes
  if (text.includes('label') || text.includes('labeling')) themes.push('labeling')
  if (text.includes('warning') || text.includes('precaution')) themes.push('warnings-precautions')
  if (text.includes('contraindication')) themes.push('contraindications')
  
  return themes
}

/** Determine response elements from response text */
function identifyResponseElements(responseText: string): ResponseElement[] {
  const elements: ResponseElement[] = []
  const text = responseText.toLowerCase()
  
  if (text.includes('table') || text.includes('summarized below')) elements.push('data-tables')
  if (text.includes('statistical') || text.includes('p-value') || text.includes('confidence interval')) elements.push('statistical-analysis')
  if (text.includes('literature') || text.includes('published') || text.includes('reference')) elements.push('literature-references')
  if (text.includes('mechanism') || text.includes('mode of action')) elements.push('mechanism-explanation')
  if (text.includes('risk assessment') || text.includes('risk evaluation')) elements.push('risk-assessment')
  if (text.includes('guidance') || text.includes('ich q') || text.includes('regulatory')) elements.push('regulatory-precedent')
  if (text.includes('clinical') && (text.includes('justify') || text.includes('justification'))) elements.push('clinical-justification')
  if (text.includes('process') && text.includes('descri')) elements.push('process-description')
  if (text.includes('comparab')) elements.push('comparability-data')
  if (text.includes('stability') && text.includes('data')) elements.push('stability-data')
  if (text.includes('validation')) elements.push('validation-data')
  
  return elements
}

/** Calculate success rate from historical outcomes */
function calculateSuccessRate(questions: HAQuestion[]): number {
  const completed = questions.filter(q => q.status === 'closed' || q.status === 'submitted')
  if (completed.length === 0) return 0
  
  // For now, assume submitted = success (in real implementation, track follow-ups)
  const successful = completed.filter(q => {
    // Check if there are no follow-up questions linked
    return !q.similarQuestions?.some(sq => sq.outcome === 'follow-up')
  })
  
  return Math.round((successful.length / completed.length) * 100)
}

/** Calculate average response time in days */
function calculateAvgResponseTime(questions: HAQuestion[]): number {
  const withDates = questions.filter(q => q.submittedDate && q.receivedDate)
  if (withDates.length === 0) return 0
  
  const totalDays = withDates.reduce((sum, q) => {
    const received = new Date(q.receivedDate)
    const submitted = new Date(q.submittedDate!)
    return sum + Math.ceil((submitted.getTime() - received.getTime()) / (1000 * 60 * 60 * 24))
  }, 0)
  
  return Math.round(totalDays / withDates.length)
}

// ============================================================================
// STORE STATE
// ============================================================================

interface HAQAnalyticsState {
  // Computed analytics
  clusters: QuestionCluster[]
  responsePatterns: ResponsePattern[]
  predictiveInsights: PredictiveInsight[]
  disciplineAnalytics: Record<HAQDiscipline, DisciplineAnalytics>
  agencyComparison: AgencyComparison | null
  applicationProfiles: Record<string, ApplicationHAQProfile>
  portfolioAnalytics: PortfolioHAQAnalytics | null
  
  // UI state
  selectedClusterId: string | null
  selectedApplicationId: string | null
  isAnalyzing: boolean
  lastAnalyzed: string | null
  
  // Analysis actions
  runFullAnalysis: () => void
  generateClusters: () => QuestionCluster[]
  analyzeResponsePatterns: () => ResponsePattern[]
  generatePredictiveInsights: (applicationId: string) => PredictiveInsight[]
  computeDisciplineAnalytics: () => Record<HAQDiscipline, DisciplineAnalytics>
  computeAgencyComparison: () => AgencyComparison
  buildApplicationProfile: (applicationId: string) => ApplicationHAQProfile | null
  computePortfolioAnalytics: () => PortfolioHAQAnalytics
  
  // Query functions
  getClusterById: (id: string) => QuestionCluster | undefined
  getClustersForDiscipline: (discipline: HAQDiscipline) => QuestionCluster[]
  getQuestionsInCluster: (clusterId: string) => HAQuestion[]
  getSimilarApplications: (applicationId: string) => SimilarApplication[]
  getPredictionsForApplication: (applicationId: string) => PredictiveInsight[]
  getTopPatternsBySuccess: (discipline: HAQDiscipline, limit?: number) => ResponsePattern[]
  
  // Selection
  selectCluster: (id: string | null) => void
  selectApplication: (id: string | null) => void
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useHAQAnalytics = create<HAQAnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      clusters: [],
      responsePatterns: [],
      predictiveInsights: [],
      disciplineAnalytics: {} as Record<HAQDiscipline, DisciplineAnalytics>,
      agencyComparison: null,
      applicationProfiles: {},
      portfolioAnalytics: null,
      selectedClusterId: null,
      selectedApplicationId: null,
      isAnalyzing: false,
      lastAnalyzed: null,
      
      // ================================================================
      // ANALYSIS ACTIONS
      // ================================================================
      
      runFullAnalysis: () => {
        set({ isAnalyzing: true }, false, 'startAnalysis')
        
        try {
          const clusters = get().generateClusters()
          const responsePatterns = get().analyzeResponsePatterns()
          const disciplineAnalytics = get().computeDisciplineAnalytics()
          const agencyComparison = get().computeAgencyComparison()
          const portfolioAnalytics = get().computePortfolioAnalytics()
          
          // Build profiles for all applications with HAQs
          const haqs = useHAQStore.getState().haqs
          const applicationIds = Array.from(new Set(haqs.map(h => h.applicationId)))
          const applicationProfiles: Record<string, ApplicationHAQProfile> = {}
          
          applicationIds.forEach(appId => {
            const profile = get().buildApplicationProfile(appId)
            if (profile) {
              applicationProfiles[appId] = profile
            }
          })
          
          // Generate predictions for active applications
          const predictiveInsights: PredictiveInsight[] = []
          const applications = usePortfolioStore.getState().applications
          const activeApps = applications.filter(a => 
            a.status === 'Under Review' || a.status === 'Submitted'
          )
          
          activeApps.forEach(app => {
            const insights = get().generatePredictiveInsights(app.id)
            predictiveInsights.push(...insights)
          })
          
          set({
            clusters,
            responsePatterns,
            predictiveInsights,
            disciplineAnalytics,
            agencyComparison,
            applicationProfiles,
            portfolioAnalytics,
            isAnalyzing: false,
            lastAnalyzed: new Date().toISOString(),
          }, false, 'analysisComplete')
          
        } catch (error) {
          console.error('Analysis failed:', error)
          set({ isAnalyzing: false }, false, 'analysisFailed')
        }
      },
      
      generateClusters: () => {
        const haqs = useHAQStore.getState().haqs
        const clusters: QuestionCluster[] = []
        const disciplines: HAQDiscipline[] = ['CMC', 'Clinical', 'Nonclinical', 'Biometrics', 'Pharmacology', 'Labeling', 'Administrative', 'Safety']
        
        disciplines.forEach(discipline => {
          const disciplineQuestions = haqs.filter(h => h.discipline === discipline)
          if (disciplineQuestions.length === 0) return
          
          // Group by CTD section first
          const byCTD: Record<string, HAQuestion[]> = {}
          disciplineQuestions.forEach(q => {
            const section = q.ctdSection || 'unspecified'
            if (!byCTD[section]) byCTD[section] = []
            byCTD[section].push(q)
          })
          
          // Create clusters for each CTD section group
          Object.entries(byCTD).forEach(([ctdSection, questions]) => {
            if (questions.length < 1) return
            
            // Extract common themes
            const allThemes = questions.flatMap(q => extractThemes(q.questionText))
            const themeCounts: Record<string, number> = {}
            allThemes.forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1 })
            
            const sortedThemes = Object.entries(themeCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
            
            // Extract common keywords from tags
            const allTags = questions.flatMap(q => q.tags || [])
            const tagCounts: Record<string, number> = {}
            allTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
            const topTags = Object.entries(tagCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([tag]) => tag)
            
            // Collect unique agencies
            const agencies = Array.from(new Set(questions.map(q => q.source)))
            
            const cluster: QuestionCluster = {
              id: `cluster-${discipline.toLowerCase()}-${ctdSection.replace(/\./g, '-')}`,
              name: `${discipline} - ${ctdSection}`,
              description: `Questions related to ${discipline} in CTD section ${ctdSection}`,
              discipline,
              ctdSections: [ctdSection],
              keywords: topTags,
              questionIds: questions.map(q => q.id),
              totalQuestions: questions.length,
              avgResponseTimeDays: calculateAvgResponseTime(questions),
              successRate: calculateSuccessRate(questions),
              agencies,
              topThemes: sortedThemes.map(([theme, count]) => ({
                theme,
                frequency: Math.round((count / questions.length) * 100),
                exampleQuestionId: questions.find(q => 
                  extractThemes(q.questionText).includes(theme)
                )?.id
              })),
              exemplarQuestions: questions.slice(0, 3).map(q => q.id),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            
            clusters.push(cluster)
          })
        })
        
        return clusters
      },
      
      analyzeResponsePatterns: () => {
        const haqs = useHAQStore.getState().haqs
        const clusters = get().clusters
        const patterns: ResponsePattern[] = []
        
        // Only analyze questions with responses
        const answeredQuestions = haqs.filter(h => 
          h.responseText && (h.status === 'submitted' || h.status === 'closed')
        )
        
        answeredQuestions.forEach(q => {
          // Find which cluster this question belongs to
          const cluster = clusters.find(c => c.questionIds.includes(q.id))
          if (!cluster) return
          
          const responseLength = q.responseText!.length
          let responseLengthCategory: ResponsePattern['responseLength'] = 'brief'
          if (responseLength > 500) responseLengthCategory = 'moderate'
          if (responseLength > 1500) responseLengthCategory = 'comprehensive'
          
          // Determine outcome (simplified - assume submitted = success for now)
          let outcome: ResponsePattern['outcome'] = 'accepted'
          if (q.similarQuestions?.some(sq => sq.outcome === 'follow-up')) {
            outcome = 'follow-up'
          }
          
          const pattern: ResponsePattern = {
            id: `pattern-${q.id}`,
            clusterId: cluster.id,
            applicationId: q.applicationId,
            questionId: q.id,
            responseApproach: q.aiAnalysis?.recommendedApproach || 'Standard response approach',
            responseLength: responseLengthCategory,
            includedElements: identifyResponseElements(q.responseText!),
            outcome,
            responseTimeDays: q.submittedDate 
              ? Math.ceil((new Date(q.submittedDate).getTime() - new Date(q.receivedDate).getTime()) / (1000 * 60 * 60 * 24))
              : 0,
            submittedDate: q.submittedDate || q.updatedAt,
          }
          
          patterns.push(pattern)
        })
        
        return patterns
      },
      
      generatePredictiveInsights: (applicationId: string) => {
        const insights: PredictiveInsight[] = []
        const clusters = get().clusters
        const haqs = useHAQStore.getState().haqs
        const portfolioStore = usePortfolioStore.getState()
        
        const application = portfolioStore.getApplication(applicationId)
        if (!application) return insights
        
        const program = portfolioStore.getProgram(application.programId)
        if (!program) return insights
        
        // Get existing questions for this application
        const existingQuestions = haqs.filter(h => h.applicationId === applicationId)
        const existingDisciplines = new Set(existingQuestions.map(q => q.discipline))
        const existingCTDSections = new Set(existingQuestions.map(q => q.ctdSection))
        
        // Find similar applications based on therapeutic area and modality
        const similarApps = portfolioStore.applications.filter(a => {
          if (a.id === applicationId) return false
          const appProgram = portfolioStore.getProgram(a.programId)
          if (!appProgram) return false
          return appProgram.therapeuticArea === program.therapeuticArea || 
                 appProgram.modality === program.modality
        })
        
        // Analyze question patterns from similar applications
        const similarAppQuestions = haqs.filter(h => 
          similarApps.some(a => a.id === h.applicationId)
        )
        
        // Find clusters that appear frequently in similar apps but not yet in current app
        const similarAppClusters = new Map<string, number>()
        similarAppQuestions.forEach(q => {
          const cluster = clusters.find(c => c.questionIds.includes(q.id))
          if (cluster && !existingCTDSections.has(q.ctdSection)) {
            similarAppClusters.set(cluster.id, (similarAppClusters.get(cluster.id) || 0) + 1)
          }
        })
        
        // Generate predictions based on high-frequency clusters
        const topClusterEntries = Array.from(similarAppClusters.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
        
        topClusterEntries.forEach(([clusterId, frequency], index) => {
          const cluster = clusters.find(c => c.id === clusterId)
          if (!cluster) return
          
          // Find an exemplar question from this cluster
          const exemplarQ = haqs.find(h => h.id === cluster.exemplarQuestions[0])
          if (!exemplarQ) return
          
          const probability = Math.min(95, 60 + (frequency * 5) - (index * 8))
          
          const insight: PredictiveInsight = {
            id: `pred-${applicationId}-${clusterId}`,
            applicationId,
            applicationNumber: application.applicationNumber,
            programCode: program.code,
            predictedQuestion: exemplarQ.questionText.substring(0, 200) + '...',
            discipline: cluster.discipline,
            ctdSection: cluster.ctdSections[0],
            probability,
            confidence: probability > 80 ? 'high' : probability > 60 ? 'medium' : 'low',
            rationale: `${frequency} similar questions asked in ${similarApps.length} comparable ${program.therapeuticArea} submissions`,
            basedOnPatterns: [clusterId],
            basedOnSimilarApps: similarApps.slice(0, 3).map(a => a.id),
            historicalFrequency: `Asked in ${Math.round((frequency / similarApps.length) * 100)}% of similar submissions`,
            preparationGuidance: exemplarQ.aiAnalysis?.recommendedApproach || 'Review similar responses and prepare data package',
            suggestedResponseElements: cluster.topThemes.length > 0 
              ? ['data-tables', 'regulatory-precedent'] 
              : ['data-tables'],
            estimatedEffort: exemplarQ.aiAnalysis?.estimatedEffort || '4-8 hours',
            riskFactors: [
              {
                factor: `High frequency in ${program.therapeuticArea} submissions`,
                severity: probability > 80 ? 'high' : 'medium',
                mitigation: 'Proactively prepare response materials'
              }
            ],
            createdAt: new Date().toISOString(),
          }
          
          insights.push(insight)
        })
        
        return insights
      },
      
      computeDisciplineAnalytics: () => {
        const haqs = useHAQStore.getState().haqs
        const clusters = get().clusters
        const disciplines: HAQDiscipline[] = ['CMC', 'Clinical', 'Nonclinical', 'Biometrics', 'Pharmacology', 'Labeling', 'Administrative', 'Safety']
        const analytics: Record<HAQDiscipline, DisciplineAnalytics> = {} as Record<HAQDiscipline, DisciplineAnalytics>
        
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        
        disciplines.forEach(discipline => {
          const disciplineQs = haqs.filter(h => h.discipline === discipline)
          
          // Recent questions
          const last30 = disciplineQs.filter(q => new Date(q.receivedDate) >= thirtyDaysAgo)
          const last90 = disciplineQs.filter(q => new Date(q.receivedDate) >= ninetyDaysAgo)
          
          // By agency
          const byAgency: Record<HAQSource, number> = {
            'FDA': 0, 'EMA': 0, 'PMDA': 0, 'Health Canada': 0, 'TGA': 0, 'NMPA': 0
          }
          disciplineQs.forEach(q => { byAgency[q.source] = (byAgency[q.source] || 0) + 1 })
          
          // By priority
          const byPriority: Record<HAQPriority, number> = { critical: 0, major: 0, minor: 0 }
          disciplineQs.forEach(q => { byPriority[q.priority] = (byPriority[q.priority] || 0) + 1 })
          
          // Top clusters
          const disciplineClusters = clusters.filter(c => c.discipline === discipline)
          const topClusters = disciplineClusters
            .map(c => ({ clusterId: c.id, count: c.totalQuestions }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
          
          // Trending topics (simplified)
          const allThemes = disciplineQs.flatMap(q => extractThemes(q.questionText))
          const themeCounts: Record<string, number> = {}
          allThemes.forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1 })
          
          const trendingTopics: TrendingTopic[] = Object.entries(themeCounts)
            .slice(0, 5)
            .map(([topic, count]) => ({
              topic,
              trend: 'stable' as const,
              changePercent: 0,
              recentExampleIds: disciplineQs.filter(q => 
                extractThemes(q.questionText).includes(topic)
              ).slice(0, 2).map(q => q.id)
            }))
          
          // On-time rate
          const completed = disciplineQs.filter(q => q.status === 'submitted' || q.status === 'closed')
          const onTime = completed.filter(q => {
            if (!q.submittedDate) return false
            return new Date(q.submittedDate) <= new Date(q.dueDate)
          })
          
          analytics[discipline] = {
            discipline,
            totalQuestions: disciplineQs.length,
            questionsLast30Days: last30.length,
            questionsLast90Days: last90.length,
            avgResponseTimeDays: calculateAvgResponseTime(disciplineQs),
            onTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
            successRate: calculateSuccessRate(disciplineQs),
            byAgency,
            byPriority,
            topClusters,
            trendingTopics,
            avgEffortHours: disciplineQs.reduce((sum, q) => {
              const effort = q.aiAnalysis?.estimatedEffort || '4-8 hours'
              const match = effort.match(/(\d+)-(\d+)/)
              return sum + (match ? (parseInt(match[1]) + parseInt(match[2])) / 2 : 6)
            }, 0) / (disciplineQs.length || 1),
            peakMonths: ['September', 'October'], // Simplified
          }
        })
        
        return analytics
      },
      
      computeAgencyComparison: () => {
        const haqs = useHAQStore.getState().haqs
        
        const buildProfile = (agency: HAQSource): AgencyProfile => {
          const agencyQs = haqs.filter(h => h.source === agency)
          
          const byType: Record<QuestionType, number> = {
            'IR': 0, 'RTF': 0, 'CRL': 0, 'Day-74': 0, 'Day-120': 0, 'RSI': 0, 'GMP': 0, 'Pre-submission': 0
          }
          agencyQs.forEach(q => { byType[q.type] = (byType[q.type] || 0) + 1 })
          
          const disciplineCounts: Record<HAQDiscipline, number> = {} as Record<HAQDiscipline, number>
          agencyQs.forEach(q => { 
            disciplineCounts[q.discipline] = (disciplineCounts[q.discipline] || 0) + 1 
          })
          
          const topDisciplines = Object.entries(disciplineCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([discipline, count]) => ({
              discipline: discipline as HAQDiscipline,
              percentage: Math.round((count / agencyQs.length) * 100)
            }))
          
          return {
            agency,
            totalQuestions: agencyQs.length,
            avgResponseTimeDays: calculateAvgResponseTime(agencyQs),
            byType,
            topDisciplines,
            avgQuestionLength: agencyQs.reduce((sum, q) => sum + q.questionText.split(' ').length, 0) / (agencyQs.length || 1),
            formality: agency === 'PMDA' ? 'formal' : agency === 'FDA' ? 'direct' : 'moderate',
            keyFocusAreas: topDisciplines.slice(0, 2).map(d => d.discipline)
          }
        }
        
        return {
          fda: buildProfile('FDA'),
          ema: buildProfile('EMA'),
          pmda: buildProfile('PMDA'),
          healthCanada: buildProfile('Health Canada'),
          commonQuestionTypes: ['CMC specifications', 'Clinical efficacy', 'Safety signals'],
          uniqueToFDA: ['Fast track considerations', 'REMS requirements'],
          uniqueToEMA: ['RMP requirements', 'Pediatric investigation plan'],
          uniqueToPMDA: ['Japanese bridging studies', 'Ethnic sensitivity'],
          avgReviewTimeDifference: 'FDA averages 5 days faster response than EMA'
        }
      },
      
      buildApplicationProfile: (applicationId: string) => {
        const haqs = useHAQStore.getState().haqs
        const portfolioStore = usePortfolioStore.getState()
        const clusters = get().clusters
        
        const application = portfolioStore.getApplication(applicationId)
        if (!application) return null
        
        const program = portfolioStore.getProgram(application.programId)
        if (!program) return null
        
        const appQuestions = haqs.filter(h => h.applicationId === applicationId)
        
        // By discipline
        const byDiscipline: Record<HAQDiscipline, number> = {} as Record<HAQDiscipline, number>
        appQuestions.forEach(q => {
          byDiscipline[q.discipline] = (byDiscipline[q.discipline] || 0) + 1
        })
        
        // By status
        const byStatus: Record<HAQStatus, number> = {} as Record<HAQStatus, number>
        appQuestions.forEach(q => {
          byStatus[q.status] = (byStatus[q.status] || 0) + 1
        })
        
        // Related clusters
        const relatedClusters = clusters
          .filter(c => c.questionIds.some(qId => appQuestions.some(q => q.id === qId)))
          .map(c => c.id)
        
        // Find similar applications
        const similarApplications = get().getSimilarApplications(applicationId)
        
        // Count predictions
        const predictions = get().predictiveInsights.filter(p => p.applicationId === applicationId)
        
        return {
          applicationId,
          applicationNumber: application.applicationNumber,
          programId: program.id,
          programCode: program.code,
          therapeuticArea: program.therapeuticArea,
          modality: program.modality,
          totalQuestions: appQuestions.length,
          byDiscipline,
          byStatus,
          avgResponseTimeDays: calculateAvgResponseTime(appQuestions),
          onTimeRate: calculateSuccessRate(appQuestions),
          relatedClusters,
          similarApplications,
          predictedQuestionCount: predictions.length,
        }
      },
      
      computePortfolioAnalytics: () => {
        const haqs = useHAQStore.getState().haqs
        const clusters = get().clusters
        const portfolioStore = usePortfolioStore.getState()
        
        const now = new Date()
        const activeStatuses: HAQStatus[] = ['new', 'open', 'in-progress', 'draft-ready', 'under-review']
        const activeQuestions = haqs.filter(h => activeStatuses.includes(h.status))
        
        // Overdue
        const overdueQuestions = haqs.filter(h => {
          if (h.status === 'closed' || h.status === 'submitted') return false
          return new Date(h.dueDate) < now
        })
        
        // By discipline
        const byDiscipline: Record<HAQDiscipline, number> = {} as Record<HAQDiscipline, number>
        haqs.forEach(q => {
          byDiscipline[q.discipline] = (byDiscipline[q.discipline] || 0) + 1
        })
        
        // By agency
        const byAgency: Record<HAQSource, number> = {} as Record<HAQSource, number>
        haqs.forEach(q => {
          byAgency[q.source] = (byAgency[q.source] || 0) + 1
        })
        
        // Monthly trend (last 6 months)
        const monthlyTrend: MonthlyTrendPoint[] = []
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
          const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
          
          const received = haqs.filter(h => {
            const d = new Date(h.receivedDate)
            return d >= monthDate && d <= monthEnd
          })
          
          const submitted = haqs.filter(h => {
            if (!h.submittedDate) return false
            const d = new Date(h.submittedDate)
            return d >= monthDate && d <= monthEnd
          })
          
          monthlyTrend.push({
            month: monthStr,
            received: received.length,
            submitted: submitted.length,
            avgResponseDays: calculateAvgResponseTime(submitted),
            successRate: calculateSuccessRate(submitted),
          })
        }
        
        // Top clusters
        const topClusters = clusters
          .sort((a, b) => b.totalQuestions - a.totalQuestions)
          .slice(0, 5)
          .map(cluster => ({ cluster, count: cluster.totalQuestions }))
        
        // At-risk applications (high predicted load or low success rate)
        const predictions = get().predictiveInsights
        const appPredictions = new Map<string, number>()
        predictions.forEach(p => {
          appPredictions.set(p.applicationId, (appPredictions.get(p.applicationId) || 0) + 1)
        })
        
        const atRiskApplications = Array.from(appPredictions.entries())
          .map(([applicationId, predictedQuestions]) => ({
            applicationId,
            predictedQuestions,
            riskScore: Math.min(100, predictedQuestions * 20)
          }))
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 5)
        
        // Completed questions for success rate
        const completed = haqs.filter(h => h.status === 'submitted' || h.status === 'closed')
        const onTime = completed.filter(h => {
          if (!h.submittedDate) return false
          return new Date(h.submittedDate) <= new Date(h.dueDate)
        })
        
        return {
          totalApplications: portfolioStore.applications.length,
          totalQuestions: haqs.length,
          activeQuestions: activeQuestions.length,
          overdueQuestions: overdueQuestions.length,
          portfolioOnTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
          portfolioSuccessRate: calculateSuccessRate(haqs),
          avgResponseTimeDays: calculateAvgResponseTime(haqs),
          byDiscipline,
          byAgency,
          monthlyTrend,
          topClusters,
          atRiskApplications,
          estimatedUpcomingQuestions: predictions.filter(p => p.probability > 70).length,
          estimatedEffortHours: predictions.reduce((sum, p) => {
            const match = p.estimatedEffort.match(/(\d+)-(\d+)/)
            return sum + (match ? (parseInt(match[1]) + parseInt(match[2])) / 2 : 6)
          }, 0),
          lastCalculated: new Date().toISOString(),
        }
      },
      
      // ================================================================
      // QUERY FUNCTIONS
      // ================================================================
      
      getClusterById: (id) => get().clusters.find(c => c.id === id),
      
      getClustersForDiscipline: (discipline) => 
        get().clusters.filter(c => c.discipline === discipline),
      
      getQuestionsInCluster: (clusterId) => {
        const cluster = get().clusters.find(c => c.id === clusterId)
        if (!cluster) return []
        const haqs = useHAQStore.getState().haqs
        return haqs.filter(h => cluster.questionIds.includes(h.id))
      },
      
      getSimilarApplications: (applicationId) => {
        const portfolioStore = usePortfolioStore.getState()
        const haqs = useHAQStore.getState().haqs
        
        const application = portfolioStore.getApplication(applicationId)
        if (!application) return []
        
        const program = portfolioStore.getProgram(application.programId)
        if (!program) return []
        
        const appQuestions = haqs.filter(h => h.applicationId === applicationId)
        const appDisciplines = new Set(appQuestions.map(q => q.discipline))
        const appCTDSections = new Set(appQuestions.map(q => q.ctdSection))
        
        const similar: SimilarApplication[] = []
        
        portfolioStore.applications.forEach(otherApp => {
          if (otherApp.id === applicationId) return
          
          const otherProgram = portfolioStore.getProgram(otherApp.programId)
          if (!otherProgram) return
          
          const otherQuestions = haqs.filter(h => h.applicationId === otherApp.id)
          if (otherQuestions.length === 0) return
          
          const otherDisciplines = new Set(otherQuestions.map(q => q.discipline))
          const otherCTDSections = new Set(otherQuestions.map(q => q.ctdSection))
          
          // Calculate similarity
          let similarity = 0
          const matchFactors: string[] = []
          
          if (otherProgram.therapeuticArea === program.therapeuticArea) {
            similarity += 30
            matchFactors.push('Same therapeutic area')
          }
          if (otherProgram.modality === program.modality) {
            similarity += 25
            matchFactors.push('Same modality')
          }
          if (otherApp.region === application.region) {
            similarity += 15
            matchFactors.push('Same region')
          }
          if (otherApp.type === application.type) {
            similarity += 10
            matchFactors.push('Same application type')
          }
          
          // Discipline overlap
          const commonDisciplines = Array.from(appDisciplines).filter(d => otherDisciplines.has(d))
          const disciplineOverlap = commonDisciplines.length / Math.max(appDisciplines.size, otherDisciplines.size)
          similarity += Math.round(disciplineOverlap * 20)
          
          // CTD section overlap
          const commonSections = Array.from(appCTDSections).filter(s => otherCTDSections.has(s))
          const combinedSections = new Set(Array.from(appCTDSections).concat(Array.from(otherCTDSections)))
          const totalSections = combinedSections.size
          const questionOverlap = totalSections > 0 ? Math.round((commonSections.length / totalSections) * 100) : 0
          
          if (similarity >= 40) {
            similar.push({
              applicationId: otherApp.id,
              applicationNumber: otherApp.applicationNumber,
              programCode: otherProgram.code,
              similarity: Math.min(similarity, 100),
              matchFactors,
              questionOverlap,
            })
          }
        })
        
        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
      },
      
      getPredictionsForApplication: (applicationId) =>
        get().predictiveInsights.filter(p => p.applicationId === applicationId),
      
      getTopPatternsBySuccess: (discipline, limit = 10) => {
        const patterns = get().responsePatterns
        const clusters = get().clusters
        
        return patterns
          .filter(p => {
            const cluster = clusters.find(c => c.id === p.clusterId)
            return cluster?.discipline === discipline && p.outcome === 'accepted'
          })
          .sort((a, b) => {
            // Prioritize faster responses
            return a.responseTimeDays - b.responseTimeDays
          })
          .slice(0, limit)
      },
      
      // ================================================================
      // SELECTION
      // ================================================================
      
      selectCluster: (id) => set({ selectedClusterId: id }, false, 'selectCluster'),
      selectApplication: (id) => set({ selectedApplicationId: id }, false, 'selectApplication'),
    }),
    { name: 'HAQAnalytics' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useClusters = () => useHAQAnalytics(state => state.clusters)
export const useSelectedCluster = () => {
  const clusters = useHAQAnalytics(state => state.clusters)
  const selectedId = useHAQAnalytics(state => state.selectedClusterId)
  return useMemo(() => clusters.find(c => c.id === selectedId), [clusters, selectedId])
}

export const useDisciplineStats = (discipline: HAQDiscipline) =>
  useHAQAnalytics(state => state.disciplineAnalytics[discipline])

export const usePortfolioStats = () =>
  useHAQAnalytics(state => state.portfolioAnalytics)

export const usePredictionsForApp = (applicationId: string) => {
  const predictiveInsights = useHAQAnalytics(state => state.predictiveInsights)
  return useMemo(() => 
    predictiveInsights.filter(p => p.applicationId === applicationId),
    [predictiveInsights, applicationId]
  )
}

export const useAnalysisStatus = () => {
  return useHAQAnalytics(useShallow(state => ({ 
    isAnalyzing: state.isAnalyzing, 
    lastAnalyzed: state.lastAnalyzed 
  })))
}
