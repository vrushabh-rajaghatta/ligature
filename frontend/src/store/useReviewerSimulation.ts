

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type { HAQuestion, HAQDiscipline, HAQSource, QuestionType } from '@/types/haq'
import type { ResponseElement } from './useHAQAnalytics'
import { useHAQStore } from './useHAQStore'
import { useHAQAnalytics } from './useHAQAnalytics'

// ============================================================================
// TYPES: Response Completeness Analysis
// ============================================================================

export interface CompletenessScore {
  overall: number                    // 0-100
  confidence: 'low' | 'medium' | 'high'
  
  // Dimension scores
  dimensions: {
    contentCoverage: DimensionScore
    evidenceQuality: DimensionScore
    regulatoryAlignment: DimensionScore
    clarity: DimensionScore
    completeness: DimensionScore
  }
  
  // Predicted outcome
  predictedOutcome: {
    mostLikely: 'accepted' | 'follow-up' | 'rejected'
    probability: number              // 0-100
    alternativeOutcomes: {
      outcome: 'accepted' | 'follow-up' | 'rejected'
      probability: number
    }[]
  }
  
  // Comparison to successful responses
  benchmarkComparison: {
    percentile: number               // Where this ranks vs successful responses
    avgSuccessfulScore: number
    gap: number
  }
}

export interface DimensionScore {
  score: number                      // 0-100
  weight: number                     // How much this matters for this question type
  findings: Finding[]
  suggestions: Suggestion[]
}

export interface Finding {
  type: 'strength' | 'gap' | 'risk'
  element: string                    // What was found or missing
  severity: 'low' | 'medium' | 'high'
  evidence: string                   // Why we flagged this
  location?: string                  // Where in the response
}

export interface Suggestion {
  priority: 'critical' | 'recommended' | 'optional'
  action: string                     // What to do
  rationale: string                  // Why it matters
  exampleText?: string               // Sample language
  sourceReference?: string           // Where to find supporting content
}

// ============================================================================
// TYPES: Gap Detection
// ============================================================================

export interface GapAnalysis {
  questionId: string
  analysisDate: string
  
  // Required elements (must have)
  requiredElements: ElementAssessment[]
  
  // Expected elements (should have based on patterns)
  expectedElements: ElementAssessment[]
  
  // Recommended elements (nice to have for high scores)
  recommendedElements: ElementAssessment[]
  
  // Summary
  summary: {
    requiredMet: number              // Count met
    requiredTotal: number
    expectedMet: number
    expectedTotal: number
    overallReadiness: 'not-ready' | 'needs-work' | 'nearly-ready' | 'ready'
  }
}

export interface ElementAssessment {
  element: ResponseElement
  status: 'present' | 'partial' | 'missing'
  
  // Evidence of presence/absence
  evidence: {
    found: boolean
    location?: string                // Where found in response
    quality?: 'weak' | 'adequate' | 'strong'
    excerpt?: string                 // Relevant text snippet
  }
  
  // Why this element matters
  importance: {
    basedOn: 'regulatory-requirement' | 'historical-pattern' | 'question-type' | 'agency-preference'
    historicalData?: {
      presentInSuccessful: number    // % of successful responses with this
      presentInFollowUp: number      // % of follow-up responses with this
    }
  }
  
  // Guidance if missing
  guidance?: {
    description: string
    exampleApproach: string
    sourceDocuments: string[]        // Where to find data
  }
}

// Extended ResponseElement types for gap detection
export type ExtendedResponseElement = ResponseElement
  | 'dose-response-data'
  | 'pk-pd-analysis'
  | 'safety-database-summary'
  | 'benefit-risk-analysis'
  | 'manufacturing-controls'
  | 'specification-justification'
  | 'method-validation'
  | 'impurity-qualification'

// ============================================================================
// TYPES: Analytics Data (for audit functions)
// ============================================================================

interface AnalyticsCluster {
  name: string;
  ctdSections: string[];
  totalQuestions: number;
}

interface AnalyticsData {
  clusters: AnalyticsCluster[];
  portfolioAnalytics?: {
    estimatedUpcomingQuestions: number;
  };
}

// ============================================================================
// TYPES: Reviewer Personas
// ============================================================================

export interface ReviewerPersona {
  id: string
  name: string                       // e.g., "FDA CDER Oncology Reviewer"
  
  // Agency characteristics
  agency: HAQSource
  division?: string                  // e.g., "CDER", "CBER", "OND"
  subdiscipline?: string             // e.g., "Oncology", "Neurology"
  
  // Question patterns
  questionPatterns: {
    focusAreas: string[]             // What they typically ask about
    questionStyle: 'direct' | 'exploratory' | 'detailed'
    avgQuestionsPerReview: number
    commonQuestionTypes: QuestionType[]
  }
  
  // Response expectations
  responseExpectations: {
    preferredLength: 'concise' | 'moderate' | 'comprehensive'
    valueElements: ResponseElement[] // What they weight heavily
    petPeeves: string[]              // What triggers follow-ups
    appreciates: string[]            // What leads to acceptance
  }
  
  // Communication style
  communicationStyle: {
    formality: 'formal' | 'moderate' | 'direct'
    specificity: 'broad' | 'targeted' | 'granular'
    evidenceThreshold: 'flexible' | 'moderate' | 'rigorous'
  }
  
  // Scoring weights for this persona
  scoringWeights: {
    contentCoverage: number          // 0-1, sum to 1
    evidenceQuality: number
    regulatoryAlignment: number
    clarity: number
    completeness: number
  }
  
  // Based on historical data
  basedOnQuestionCount: number
  lastUpdated: string
}

// Pre-built persona IDs
export type AgencyPersonaId = 
  | 'fda-cder-oncology'
  | 'fda-cder-neurology'
  | 'fda-cder-cardiology'
  | 'fda-cder-infectious'
  | 'fda-cder-metabolic'
  | 'fda-cber-biologics'
  | 'fda-cber-gene-therapy'
  | 'ema-chmp-general'
  | 'ema-chmp-oncology'
  | 'ema-chmp-atmp'
  | 'pmda-general'
  | 'health-canada-general'

// ============================================================================
// TYPES: Pre-submission Audit
// ============================================================================

export interface PreSubmissionAudit {
  id: string
  applicationId: string
  auditDate: string
  
  // Overall readiness
  overallReadiness: {
    score: number                    // 0-100
    status: 'not-ready' | 'needs-work' | 'nearly-ready' | 'ready'
    estimatedQuestionCount: {
      min: number
      expected: number
      max: number
    }
  }
  
  // Section-by-section analysis
  sectionAudits: CTDSectionAudit[]
  
  // Cross-cutting concerns
  crossCuttingIssues: CrossCuttingIssue[]
  
  // Priority action items
  priorityActions: AuditAction[]
  
  // Comparison to similar submissions
  benchmarkData: {
    similarSubmissions: number
    avgQuestionsReceived: number
    topQuestionCategories: string[]
  }
}

export interface CTDSectionAudit {
  ctdSection: string                 // e.g., "3.2.S.2.2"
  sectionName: string                // e.g., "Description of Manufacturing Process"
  
  // Readiness assessment
  readiness: {
    score: number                    // 0-100
    status: 'red' | 'yellow' | 'green'
    confidence: 'low' | 'medium' | 'high'
  }
  
  // Anticipated questions
  anticipatedQuestions: AnticipatedQuestion[]
  
  // Document quality issues
  documentIssues: DocumentIssue[]
  
  // Historical context
  historicalData: {
    questionFrequency: number        // % of similar subs that got questions here
    avgQuestionsInSection: number
    topQuestionThemes: string[]
  }
}

export interface AnticipatedQuestion {
  id: string
  questionText: string               // Predicted question language
  discipline: HAQDiscipline
  probability: number                // 0-100
  severity: 'minor' | 'major' | 'critical'
  
  // Basis
  rationale: string
  basedOn: ('historical-pattern' | 'document-gap' | 'regulatory-requirement' | 'agency-focus')[]
  
  // Preparation
  recommendedPreparation: string
  estimatedEffort: string            // e.g., "2-4 hours"
  suggestedOwner: HAQDiscipline
  
  // Mitigation
  canPreventWithDocUpdate: boolean
  suggestedDocChanges?: string[]
}

export interface DocumentIssue {
  type: 'missing-content' | 'unclear-content' | 'inconsistency' | 'formatting' | 'reference-error'
  severity: 'low' | 'medium' | 'high'
  description: string
  location: string                   // Where in document
  suggestedFix: string
  relatedQuestionRisk: string[]      // Question IDs this might trigger
}

export interface CrossCuttingIssue {
  issue: string
  affectedSections: string[]
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation: string
}

export interface AuditAction {
  priority: 1 | 2 | 3                // 1 = highest
  action: string
  owner: HAQDiscipline
  effort: string
  impact: string                     // What this prevents/improves
  relatedSections: string[]
  relatedQuestions: string[]
}

// ============================================================================
// TYPES: Risk Scoring
// ============================================================================

export interface SubmissionRiskProfile {
  applicationId: string
  calculatedAt: string
  
  // Overall risk
  overallRisk: {
    score: number                    // 0-100 (higher = more risk)
    level: 'low' | 'moderate' | 'elevated' | 'high'
    trend: 'improving' | 'stable' | 'worsening'
  }
  
  // Risk by dimension
  riskDimensions: {
    questionVolume: RiskDimension    // How many questions expected
    questionSeverity: RiskDimension  // How serious expected questions are
    responseCapacity: RiskDimension  // Team's ability to respond
    timelineRisk: RiskDimension      // Impact on approval timeline
    precedentRisk: RiskDimension     // Unusual issues without precedent
  }
  
  // Risk by discipline
  disciplineRisks: DisciplineRisk[]
  
  // Risk by CTD module
  moduleRisks: ModuleRisk[]
  
  // Top risk factors
  topRiskFactors: RiskFactor[]
  
  // Mitigation recommendations
  mitigationPlan: MitigationRecommendation[]
}

export interface RiskDimension {
  score: number                      // 0-100
  level: 'low' | 'moderate' | 'elevated' | 'high'
  factors: string[]
  trend: 'improving' | 'stable' | 'worsening'
}

export interface DisciplineRisk {
  discipline: HAQDiscipline
  riskScore: number
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high'
  anticipatedQuestions: number
  topConcerns: string[]
  readinessScore: number
}

export interface ModuleRisk {
  module: 'Module1' | 'Module2' | 'Module3' | 'Module4' | 'Module5'
  riskScore: number
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high'
  hotSpots: string[]                 // Specific sections of concern
}

export interface RiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high'
  mitigation?: string
}

export interface MitigationRecommendation {
  priority: 1 | 2 | 3
  action: string
  expectedImpact: string             // How much risk reduction
  effort: string
  owner: string
  deadline?: string
}

// ============================================================================
// TYPES: Simulation
// ============================================================================

export interface SimulatedReviewerFeedback {
  persona: string
  overallAssessment: 'accepted' | 'follow-up' | 'rejected'
  feedback: string[]
  likelyFollowUps: string[]
  strengthsNoted: string[]
  suggestedImprovements: string[]
}

export interface RiskTrendPoint {
  date: string
  score: number
  level: 'low' | 'moderate' | 'elevated' | 'high'
}

export interface AuditReport {
  audit: PreSubmissionAudit
  generatedAt: string
  format: string
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

interface ReviewerSimulationState {
  // Personas
  personas: ReviewerPersona[]
  activePersonaId: string | null
  
  // Analyses (cached)
  completenessScores: Record<string, CompletenessScore>  // questionId -> score
  gapAnalyses: Record<string, GapAnalysis>               // questionId -> analysis
  
  // Pre-submission audits
  audits: PreSubmissionAudit[]
  activeAuditId: string | null
  
  // Risk profiles
  riskProfiles: Record<string, SubmissionRiskProfile>    // applicationId -> profile
  
  // UI state
  isAnalyzing: boolean
  analysisProgress: number           // 0-100
  lastError: string | null
}

interface ReviewerSimulationActions {
  // Persona management
  setActivePersona: (personaId: string | null) => void
  getPersonaForQuestion: (question: HAQuestion) => ReviewerPersona
  createCustomPersona: (persona: Omit<ReviewerPersona, 'id'>) => ReviewerPersona
  updatePersona: (id: string, updates: Partial<ReviewerPersona>) => void
  deletePersona: (id: string) => void
  
  // Completeness analysis
  analyzeResponseCompleteness: (questionId: string, responseText: string) => CompletenessScore
  batchAnalyzeResponses: (questionIds: string[]) => Promise<void>
  
  // Gap detection
  detectGaps: (questionId: string, responseText: string) => GapAnalysis
  getRequiredElements: (question: HAQuestion) => ResponseElement[]
  getExpectedElements: (question: HAQuestion) => ResponseElement[]
  
  // Pre-submission audit
  runPreSubmissionAudit: (applicationId: string) => Promise<PreSubmissionAudit>
  getAuditForApplication: (applicationId: string) => PreSubmissionAudit | null
  refreshAudit: (auditId: string) => Promise<void>
  deleteAudit: (auditId: string) => void
  
  // Risk scoring
  calculateRiskProfile: (applicationId: string) => SubmissionRiskProfile
  getRiskTrend: (applicationId: string, days: number) => RiskTrendPoint[]
  
  // Anticipated questions
  generateAnticipatedQuestions: (
    applicationId: string, 
    ctdSection?: string
  ) => AnticipatedQuestion[]
  
  // Simulation
  simulateReviewerResponse: (
    questionId: string, 
    draftResponse: string,
    personaId?: string
  ) => SimulatedReviewerFeedback
  
  // Utilities
  clearAnalysisCache: () => void
  exportAuditReport: (auditId: string) => AuditReport
}

// Combined store type
type ReviewerSimulationStore = ReviewerSimulationState & ReviewerSimulationActions

// ============================================================================
// INITIAL PERSONAS
// ============================================================================

const initialPersonas: ReviewerPersona[] = [
  {
    id: 'fda-cder-oncology',
    name: 'FDA CDER Oncology Reviewer',
    agency: 'FDA',
    division: 'CDER',
    subdiscipline: 'Oncology',
    questionPatterns: {
      focusAreas: [
        'Overall survival data',
        'Progression-free survival methodology',
        'Safety in special populations',
        'Dose selection rationale',
        'Biomarker strategy'
      ],
      questionStyle: 'detailed',
      avgQuestionsPerReview: 45,
      commonQuestionTypes: ['IR', 'CRL', 'RTF']
    },
    responseExpectations: {
      preferredLength: 'comprehensive',
      valueElements: [
        'statistical-analysis',
        'clinical-justification',
        'risk-assessment',
        'data-tables'
      ],
      petPeeves: [
        'Vague efficacy claims without data',
        'Missing subgroup analyses',
        'Incomplete safety narratives'
      ],
      appreciates: [
        'Clear data tables',
        'Transparent limitations',
        'Proactive safety monitoring plans'
      ]
    },
    communicationStyle: {
      formality: 'formal',
      specificity: 'granular',
      evidenceThreshold: 'rigorous'
    },
    scoringWeights: {
      contentCoverage: 0.25,
      evidenceQuality: 0.30,
      regulatoryAlignment: 0.20,
      clarity: 0.10,
      completeness: 0.15
    },
    basedOnQuestionCount: 1247,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'fda-cder-cmc',
    name: 'FDA CDER CMC Reviewer',
    agency: 'FDA',
    division: 'CDER',
    subdiscipline: 'CMC',
    questionPatterns: {
      focusAreas: [
        'Manufacturing process controls',
        'Specification justification',
        'Stability data',
        'Analytical method validation',
        'Impurity qualification'
      ],
      questionStyle: 'detailed',
      avgQuestionsPerReview: 38,
      commonQuestionTypes: ['IR', 'RTF', 'GMP']
    },
    responseExpectations: {
      preferredLength: 'comprehensive',
      valueElements: [
        'process-description',
        'validation-data',
        'stability-data',
        'data-tables'
      ],
      petPeeves: [
        'Missing batch data',
        'Unclear process parameters',
        'Incomplete validation studies'
      ],
      appreciates: [
        'Complete batch records',
        'Clear control strategy',
        'Comprehensive stability profiles'
      ]
    },
    communicationStyle: {
      formality: 'formal',
      specificity: 'granular',
      evidenceThreshold: 'rigorous'
    },
    scoringWeights: {
      contentCoverage: 0.30,
      evidenceQuality: 0.25,
      regulatoryAlignment: 0.20,
      clarity: 0.10,
      completeness: 0.15
    },
    basedOnQuestionCount: 982,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'ema-chmp-general',
    name: 'EMA CHMP General Reviewer',
    agency: 'EMA',
    division: 'CHMP',
    questionPatterns: {
      focusAreas: [
        'Benefit-risk assessment',
        'Comparative efficacy',
        'Post-marketing commitments',
        'Pharmacovigilance plans',
        'Pediatric development'
      ],
      questionStyle: 'exploratory',
      avgQuestionsPerReview: 52,
      commonQuestionTypes: ['Day-74', 'Day-120', 'RSI']
    },
    responseExpectations: {
      preferredLength: 'moderate',
      valueElements: [
        'clinical-justification',
        'risk-assessment',
        'literature-references',
        'regulatory-precedent'
      ],
      petPeeves: [
        'Lack of EU-specific considerations',
        'Missing indirect comparisons',
        'Insufficient RMP detail'
      ],
      appreciates: [
        'Balanced benefit-risk narratives',
        'Clear positioning vs comparators',
        'Proactive pediatric plans'
      ]
    },
    communicationStyle: {
      formality: 'moderate',
      specificity: 'targeted',
      evidenceThreshold: 'moderate'
    },
    scoringWeights: {
      contentCoverage: 0.25,
      evidenceQuality: 0.25,
      regulatoryAlignment: 0.25,
      clarity: 0.10,
      completeness: 0.15
    },
    basedOnQuestionCount: 856,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'pmda-general',
    name: 'PMDA General Reviewer',
    agency: 'PMDA',
    questionPatterns: {
      focusAreas: [
        'Japanese patient population data',
        'Dosing in Asian populations',
        'Local manufacturing considerations',
        'Bridging study requirements',
        'Post-marketing surveillance plans'
      ],
      questionStyle: 'detailed',
      avgQuestionsPerReview: 65,
      commonQuestionTypes: ['IR', 'Pre-submission']
    },
    responseExpectations: {
      preferredLength: 'comprehensive',
      valueElements: [
        'clinical-justification',
        'data-tables',
        'statistical-analysis',
        'comparability-data'
      ],
      petPeeves: [
        'Insufficient Japanese data',
        'Unclear ethnic sensitivity analysis',
        'Missing local comparisons'
      ],
      appreciates: [
        'Japanese population-specific data',
        'Clear ethnic bridging rationale',
        'Detailed surveillance plans'
      ]
    },
    communicationStyle: {
      formality: 'formal',
      specificity: 'granular',
      evidenceThreshold: 'rigorous'
    },
    scoringWeights: {
      contentCoverage: 0.25,
      evidenceQuality: 0.30,
      regulatoryAlignment: 0.20,
      clarity: 0.10,
      completeness: 0.15
    },
    basedOnQuestionCount: 423,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'health-canada-general',
    name: 'Health Canada General Reviewer',
    agency: 'Health Canada',
    questionPatterns: {
      focusAreas: [
        'Canadian-specific labeling',
        'Comparative clinical data',
        'Risk management plans',
        'Natural health product interactions',
        'Provincial access considerations'
      ],
      questionStyle: 'direct',
      avgQuestionsPerReview: 28,
      commonQuestionTypes: ['IR', 'CRL']
    },
    responseExpectations: {
      preferredLength: 'moderate',
      valueElements: [
        'clinical-justification',
        'risk-assessment',
        'regulatory-precedent',
        'literature-references'
      ],
      petPeeves: [
        'Generic responses without Canadian context',
        'Missing bilingual considerations',
        'Incomplete DIN requirements'
      ],
      appreciates: [
        'Clear Canadian-specific data',
        'Practical risk management',
        'Aligned labeling proposals'
      ]
    },
    communicationStyle: {
      formality: 'moderate',
      specificity: 'targeted',
      evidenceThreshold: 'moderate'
    },
    scoringWeights: {
      contentCoverage: 0.25,
      evidenceQuality: 0.25,
      regulatoryAlignment: 0.25,
      clarity: 0.10,
      completeness: 0.15
    },
    basedOnQuestionCount: 312,
    lastUpdated: new Date().toISOString()
  }
]

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useReviewerSimulation = create<ReviewerSimulationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      personas: initialPersonas,
      activePersonaId: null,
      completenessScores: {},
      gapAnalyses: {},
      audits: [],
      activeAuditId: null,
      riskProfiles: {},
      isAnalyzing: false,
      analysisProgress: 0,
      lastError: null,

      // === PERSONA MANAGEMENT ===
      
      setActivePersona: (personaId) => set({ activePersonaId: personaId }, false, 'setActivePersona'),
      
      getPersonaForQuestion: (question) => {
        const { personas, activePersonaId } = get()
        
        // If user has selected a persona, use it
        if (activePersonaId) {
          const activePersona = personas.find(p => p.id === activePersonaId)
          if (activePersona) return activePersona
        }
        
        // Auto-select based on question characteristics
        // First try to match agency + discipline
        const matchedByAgencyDiscipline = personas.find(p => 
          p.agency === question.source &&
          p.subdiscipline?.toLowerCase() === question.discipline?.toLowerCase()
        )
        if (matchedByAgencyDiscipline) return matchedByAgencyDiscipline
        
        // Then try agency match only
        const matchedByAgency = personas.find(p => p.agency === question.source)
        if (matchedByAgency) return matchedByAgency
        
        // Default to first persona
        return personas[0]
      },
      
      createCustomPersona: (persona) => {
        const newPersona: ReviewerPersona = {
          ...persona,
          id: `custom-${Date.now()}`
        }
        set(state => ({ 
          personas: [...state.personas, newPersona] 
        }), false, 'createCustomPersona')
        return newPersona
      },
      
      updatePersona: (id, updates) => {
        set(state => ({
          personas: state.personas.map(p => 
            p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
          )
        }), false, 'updatePersona')
      },
      
      deletePersona: (id) => {
        // Don't allow deleting built-in personas
        if (!id.startsWith('custom-')) return
        set(state => ({
          personas: state.personas.filter(p => p.id !== id),
          activePersonaId: state.activePersonaId === id ? null : state.activePersonaId
        }), false, 'deletePersona')
      },

      // === COMPLETENESS ANALYSIS ===
      
      analyzeResponseCompleteness: (questionId, responseText) => {
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(q => q.id === questionId) || 
                        haqStore.haqs.find(q => q.id === questionId)
        if (!question) throw new Error(`Question ${questionId} not found`)
        
        const persona = get().getPersonaForQuestion(question)
        const gapAnalysis = get().detectGaps(questionId, responseText)
        const analytics = useHAQAnalytics.getState()
        
        // Get cluster data for this question type
        const relevantClusters = analytics.clusters.filter(c => 
          c.discipline === question.discipline
        )
        
        // Calculate dimension scores
        const contentCoverage = calculateContentCoverage(responseText, question, gapAnalysis)
        const evidenceQuality = calculateEvidenceQuality(responseText, question)
        const regulatoryAlignment = calculateRegulatoryAlignment(responseText, question)
        const clarity = calculateClarity(responseText)
        const completeness = calculateCompleteness(gapAnalysis)
        
        // Weighted overall score
        const overallScore = 
          contentCoverage.score * persona.scoringWeights.contentCoverage +
          evidenceQuality.score * persona.scoringWeights.evidenceQuality +
          regulatoryAlignment.score * persona.scoringWeights.regulatoryAlignment +
          clarity.score * persona.scoringWeights.clarity +
          completeness.score * persona.scoringWeights.completeness
        
        // Predict outcome based on score and patterns
        const predictedOutcome = predictOutcome(overallScore, relevantClusters)
        
        // Get benchmark data
        const successfulPatterns = analytics.responsePatterns.filter(p => 
          p.outcome === 'accepted' &&
          relevantClusters.some(c => c.id === p.clusterId)
        )
        const avgSuccessfulScore = successfulPatterns.length > 0
          ? successfulPatterns.reduce((sum, p) => sum + (p.responseLength === 'comprehensive' ? 85 : 70), 0) / successfulPatterns.length
          : 75
        
        const score: CompletenessScore = {
          overall: Math.round(overallScore),
          confidence: overallScore > 50 ? 'high' : overallScore > 30 ? 'medium' : 'low',
          dimensions: {
            contentCoverage,
            evidenceQuality,
            regulatoryAlignment,
            clarity,
            completeness
          },
          predictedOutcome,
          benchmarkComparison: {
            percentile: calculatePercentile(overallScore, successfulPatterns),
            avgSuccessfulScore,
            gap: avgSuccessfulScore - overallScore
          }
        }
        
        // Cache the result
        set(state => ({
          completenessScores: {
            ...state.completenessScores,
            [questionId]: score
          }
        }), false, 'analyzeResponseCompleteness')
        
        return score
      },
      
      batchAnalyzeResponses: async (questionIds) => {
        set({ isAnalyzing: true, analysisProgress: 0 }, false, 'batchAnalyzeResponses:start')
        
        const haqStore = useHAQStore.getState()
        const questions = [...haqStore.haqs, ...haqStore.haqs]
        const total = questionIds.length
        
        for (let i = 0; i < total; i++) {
          const questionId = questionIds[i]
          const question = questions.find(q => q.id === questionId)
          
          if (question?.responseText) {
            get().analyzeResponseCompleteness(questionId, question.responseText)
          }
          
          set({ analysisProgress: Math.round(((i + 1) / total) * 100) }, false, 'batchAnalyzeResponses:progress')
        }
        
        set({ isAnalyzing: false, analysisProgress: 100 }, false, 'batchAnalyzeResponses:complete')
      },

      // === GAP DETECTION ===
      
      detectGaps: (questionId, responseText) => {
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(q => q.id === questionId) ||
                        haqStore.haqs.find(q => q.id === questionId)
        if (!question) throw new Error(`Question ${questionId} not found`)
        
        const requiredElements = get().getRequiredElements(question)
        const expectedElements = get().getExpectedElements(question)
        const recommendedElements = getRecommendedElements(question)
        
        const assessElement = (element: ResponseElement): ElementAssessment => {
          const presence = detectElementPresence(responseText, element)
          return {
            element,
            status: presence.status,
            evidence: {
              found: presence.found,
              quality: presence.quality
            },
            importance: getElementImportance(element, question),
            guidance: presence.status !== 'present' 
              ? getElementGuidance(element, question) 
              : undefined
          }
        }
        
        const requiredAssessments = requiredElements.map(assessElement)
        const expectedAssessments = expectedElements.map(assessElement)
        const recommendedAssessments = recommendedElements.map(assessElement)
        
        const analysis: GapAnalysis = {
          questionId,
          analysisDate: new Date().toISOString(),
          requiredElements: requiredAssessments,
          expectedElements: expectedAssessments,
          recommendedElements: recommendedAssessments,
          summary: {
            requiredMet: requiredAssessments.filter(a => a.status === 'present').length,
            requiredTotal: requiredAssessments.length,
            expectedMet: expectedAssessments.filter(a => a.status === 'present').length,
            expectedTotal: expectedAssessments.length,
            overallReadiness: calculateOverallReadiness(requiredAssessments, expectedAssessments)
          }
        }
        
        set(state => ({
          gapAnalyses: {
            ...state.gapAnalyses,
            [questionId]: analysis
          }
        }), false, 'detectGaps')
        
        return analysis
      },
      
      getRequiredElements: (question) => {
        // Elements required by regulation/guidance for this question type
        const baseRequired: ResponseElement[] = []
        
        // By discipline
        switch (question.discipline) {
          case 'CMC':
            baseRequired.push('process-description')
            if (question.ctdSection?.startsWith('3.2.S')) {
              baseRequired.push('validation-data')
            }
            if (question.ctdSection?.startsWith('3.2.P.5')) {
              baseRequired.push('stability-data')
            }
            break
          case 'Clinical':
            baseRequired.push('clinical-justification', 'statistical-analysis')
            if (question.questionText.toLowerCase().includes('safety')) {
              baseRequired.push('risk-assessment')
            }
            break
          case 'Nonclinical':
            baseRequired.push('data-tables', 'mechanism-explanation')
            break
          case 'Biometrics':
            baseRequired.push('statistical-analysis', 'data-tables')
            break
          case 'Safety':
            baseRequired.push('risk-assessment', 'data-tables')
            break
        }
        
        // Ensure at least one required element
        if (baseRequired.length === 0) {
          baseRequired.push('data-tables')
        }
        
        return baseRequired
      },
      
      getExpectedElements: (question) => {
        // Elements commonly present in successful responses
        const analytics = useHAQAnalytics.getState()
        const cluster = analytics.clusters.find(c => 
          c.discipline === question.discipline &&
          c.ctdSections.some(s => question.ctdSection?.startsWith(s))
        )
        
        if (!cluster) {
          return ['data-tables', 'regulatory-precedent']
        }
        
        // Get elements from successful patterns in this cluster
        const successfulPatterns = analytics.responsePatterns.filter(p => 
          p.clusterId === cluster.id && p.outcome === 'accepted'
        )
        
        const elementCounts = new Map<ResponseElement, number>()
        successfulPatterns.forEach(p => {
          p.includedElements.forEach(e => {
            elementCounts.set(e, (elementCounts.get(e) || 0) + 1)
          })
        })
        
        // Return elements present in >50% of successful responses
        const threshold = Math.max(1, successfulPatterns.length * 0.5)
        const expected = Array.from(elementCounts.entries())
          .filter(([_, count]) => count >= threshold)
          .map(([element]) => element)
        
        return expected.length > 0 ? expected : ['data-tables', 'regulatory-precedent']
      },

      // === PRE-SUBMISSION AUDIT ===
      
      runPreSubmissionAudit: async (applicationId) => {
        set({ isAnalyzing: true, analysisProgress: 0, lastError: null }, false, 'runPreSubmissionAudit:start')
        
        try {
          const analytics = useHAQAnalytics.getState()
          const haqStore = useHAQStore.getState()
          const questions = [...haqStore.haqs, ...haqStore.haqs].filter(
            q => q.applicationId === applicationId
          )
          
          // Get CTD sections with documents
          const ctdSections = getApplicationCTDSections(applicationId)
          
          // Analyze each section
          const sectionAudits: CTDSectionAudit[] = []
          for (let i = 0; i < ctdSections.length; i++) {
            const section = ctdSections[i]
            
            const sectionAudit = auditCTDSection(section, applicationId, analytics, questions)
            sectionAudits.push(sectionAudit)
            
            set({ analysisProgress: Math.round(((i + 1) / ctdSections.length) * 80) }, false, 'runPreSubmissionAudit:progress')
          }
          
          // Identify cross-cutting issues
          const crossCuttingIssues = identifyCrossCuttingIssues(sectionAudits)
          
          // Generate priority actions
          const priorityActions = generatePriorityActions(sectionAudits, crossCuttingIssues)
          
          // Calculate overall readiness
          const avgSectionScore = sectionAudits.length > 0 
            ? sectionAudits.reduce((sum, s) => sum + s.readiness.score, 0) / sectionAudits.length
            : 50
          const totalAnticipated = sectionAudits.reduce((sum, s) => sum + s.anticipatedQuestions.length, 0)
          
          const audit: PreSubmissionAudit = {
            id: `audit-${applicationId}-${Date.now()}`,
            applicationId,
            auditDate: new Date().toISOString(),
            overallReadiness: {
              score: Math.round(avgSectionScore),
              status: avgSectionScore >= 80 ? 'ready' : avgSectionScore >= 60 ? 'nearly-ready' : avgSectionScore >= 40 ? 'needs-work' : 'not-ready',
              estimatedQuestionCount: {
                min: Math.floor(totalAnticipated * 0.5),
                expected: totalAnticipated,
                max: Math.ceil(totalAnticipated * 1.5)
              }
            },
            sectionAudits,
            crossCuttingIssues,
            priorityActions,
            benchmarkData: {
              similarSubmissions: Math.max(10, analytics.clusters.length * 10),
              avgQuestionsReceived: 35,
              topQuestionCategories: ['CMC Process', 'Clinical Efficacy', 'Safety Signals']
            }
          }
          
          set(state => ({
            audits: [...state.audits, audit],
            activeAuditId: audit.id,
            isAnalyzing: false,
            analysisProgress: 100
          }), false, 'runPreSubmissionAudit:complete')
          
          return audit
        } catch (error) {
          set({ 
            isAnalyzing: false, 
            lastError: error instanceof Error ? error.message : 'Unknown error' 
          }, false, 'runPreSubmissionAudit:error')
          throw error
        }
      },
      
      getAuditForApplication: (applicationId) => {
        return get().audits
          .filter(a => a.applicationId === applicationId)
          .sort((a, b) => b.auditDate.localeCompare(a.auditDate))[0] || null
      },
      
      refreshAudit: async (auditId) => {
        const audit = get().audits.find(a => a.id === auditId)
        if (audit) {
          await get().runPreSubmissionAudit(audit.applicationId)
        }
      },
      
      deleteAudit: (auditId) => {
        set(state => ({
          audits: state.audits.filter(a => a.id !== auditId),
          activeAuditId: state.activeAuditId === auditId ? null : state.activeAuditId
        }), false, 'deleteAudit')
      },

      // === RISK SCORING ===
      
      calculateRiskProfile: (applicationId) => {
        const analytics = useHAQAnalytics.getState()
        const haqStore = useHAQStore.getState()
        const questions = [...haqStore.haqs, ...haqStore.haqs].filter(
          q => q.applicationId === applicationId
        )
        const audit = get().getAuditForApplication(applicationId)
        
        // Calculate dimension risks
        const questionVolumeRisk = calculateQuestionVolumeRisk(audit, analytics)
        const questionSeverityRisk = calculateQuestionSeverityRisk(audit)
        const responseCapacityRisk = calculateResponseCapacityRisk(questions)
        const timelineRisk = calculateTimelineRisk(questions)
        const precedentRisk = calculatePrecedentRisk(applicationId, analytics)
        
        // Aggregate to overall risk
        const dimensionScores = [
          questionVolumeRisk.score,
          questionSeverityRisk.score,
          responseCapacityRisk.score,
          timelineRisk.score,
          precedentRisk.score
        ]
        const overallScore = dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length
        
        // Calculate by discipline
        const disciplines: HAQDiscipline[] = ['CMC', 'Clinical', 'Nonclinical', 'Biometrics', 'Safety', 'Labeling']
        const disciplineRisks = disciplines.map(d => calculateDisciplineRisk(d, audit, questions))
        
        // Calculate by module
        const moduleRisks = calculateModuleRisks(audit)
        
        // Top risk factors
        const topRiskFactors = identifyTopRiskFactors(audit, disciplineRisks)
        
        // Mitigation recommendations
        const mitigationPlan = generateMitigationPlan(topRiskFactors, audit)
        
        const profile: SubmissionRiskProfile = {
          applicationId,
          calculatedAt: new Date().toISOString(),
          overallRisk: {
            score: Math.round(overallScore),
            level: overallScore >= 75 ? 'high' : overallScore >= 50 ? 'elevated' : overallScore >= 25 ? 'moderate' : 'low',
            trend: 'stable' // Would compare to historical profiles
          },
          riskDimensions: {
            questionVolume: questionVolumeRisk,
            questionSeverity: questionSeverityRisk,
            responseCapacity: responseCapacityRisk,
            timelineRisk: timelineRisk,
            precedentRisk: precedentRisk
          },
          disciplineRisks,
          moduleRisks,
          topRiskFactors,
          mitigationPlan
        }
        
        set(state => ({
          riskProfiles: {
            ...state.riskProfiles,
            [applicationId]: profile
          }
        }), false, 'calculateRiskProfile')
        
        return profile
      },
      
      getRiskTrend: (applicationId, days) => {
        // Would retrieve historical risk calculations
        // For now, return simulated trend data
        const points: RiskTrendPoint[] = []
        const baseScore = Math.random() * 30 + 35 // 35-65 range
        
        for (let i = days; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const variation = (Math.random() - 0.5) * 10
          const score = Math.max(0, Math.min(100, baseScore + variation))
          
          points.push({
            date: date.toISOString().split('T')[0],
            score: Math.round(score),
            level: score >= 75 ? 'high' : score >= 50 ? 'elevated' : score >= 25 ? 'moderate' : 'low'
          })
        }
        
        return points
      },

      // === ANTICIPATED QUESTIONS ===
      
      generateAnticipatedQuestions: (applicationId, ctdSection) => {
        const audit = get().getAuditForApplication(applicationId)
        
        if (!audit) {
          return []
        }
        
        let questions = audit.sectionAudits.flatMap(s => s.anticipatedQuestions)
        
        if (ctdSection) {
          questions = questions.filter(q => 
            audit.sectionAudits.find(s => 
              s.ctdSection.startsWith(ctdSection) && 
              s.anticipatedQuestions.some(aq => aq.id === q.id)
            )
          )
        }
        
        return questions.sort((a, b) => b.probability - a.probability)
      },

      // === SIMULATION ===
      
      simulateReviewerResponse: (questionId, draftResponse, personaId) => {
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(q => q.id === questionId) ||
                        haqStore.haqs.find(q => q.id === questionId)
        if (!question) throw new Error(`Question ${questionId} not found`)
        
        const persona = personaId 
          ? get().personas.find(p => p.id === personaId)!
          : get().getPersonaForQuestion(question)
        
        const completeness = get().analyzeResponseCompleteness(questionId, draftResponse)
        const gaps = get().detectGaps(questionId, draftResponse)
        
        // Simulate what a reviewer with this persona would say
        return {
          persona: persona.name,
          overallAssessment: completeness.predictedOutcome.mostLikely,
          feedback: generateSimulatedFeedback(completeness, gaps, persona),
          likelyFollowUps: generateLikelyFollowUps(gaps, persona),
          strengthsNoted: identifyStrengths(completeness, persona),
          suggestedImprovements: prioritizeImprovements(completeness, gaps)
        }
      },

      // === UTILITIES ===
      
      clearAnalysisCache: () => {
        set({
          completenessScores: {},
          gapAnalyses: {}
        }, false, 'clearAnalysisCache')
      },
      
      exportAuditReport: (auditId) => {
        const audit = get().audits.find(a => a.id === auditId)
        if (!audit) throw new Error(`Audit ${auditId} not found`)
        
        // Generate exportable report
        return {
          audit,
          generatedAt: new Date().toISOString(),
          format: 'pdf'
        }
      }
    }),
    { name: 'ReviewerSimulation' }
  )
)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateContentCoverage(response: string, question: HAQuestion, gaps: GapAnalysis): DimensionScore {
  const requiredMet = gaps.summary.requiredTotal > 0 
    ? gaps.summary.requiredMet / gaps.summary.requiredTotal 
    : 0.5
  const expectedMet = gaps.summary.expectedTotal > 0 
    ? gaps.summary.expectedMet / gaps.summary.expectedTotal 
    : 0.5
  const score = (requiredMet * 0.7 + expectedMet * 0.3) * 100
  
  return {
    score: Math.round(score),
    weight: 0.25,
    findings: gaps.requiredElements
      .filter(e => e.status !== 'present')
      .map(e => ({
        type: 'gap' as const,
        element: e.element,
        severity: 'high' as const,
        evidence: `Required element not found`
      })),
    suggestions: gaps.requiredElements
      .filter(e => e.status !== 'present')
      .map(e => ({
        priority: 'critical' as const,
        action: `Add ${e.element.replace(/-/g, ' ')}`,
        rationale: 'Required for complete response'
      }))
  }
}

function calculateEvidenceQuality(response: string, question: HAQuestion): DimensionScore {
  // Analyze data tables, statistics, references
  const hasDataTables = /table|figure|data/i.test(response)
  const hasStatistics = /p\s*[<>=]\s*0\.|statistic|confidence interval|CI/i.test(response)
  const hasReferences = /reference|guideline|ICH|FDA/i.test(response)
  
  const score = (hasDataTables ? 40 : 0) + (hasStatistics ? 35 : 0) + (hasReferences ? 25 : 0)
  
  const findings: Finding[] = []
  const suggestions: Suggestion[] = []
  
  if (hasDataTables) {
    findings.push({ type: 'strength', element: 'data-tables', severity: 'low', evidence: 'Data tables present' })
  } else {
    suggestions.push({ priority: 'recommended', action: 'Add supporting data tables', rationale: 'Strengthens evidence quality' })
  }
  
  if (hasStatistics) {
    findings.push({ type: 'strength', element: 'statistical-analysis', severity: 'low', evidence: 'Statistical analysis included' })
  }
  
  if (hasReferences) {
    findings.push({ type: 'strength', element: 'literature-references', severity: 'low', evidence: 'References included' })
  }
  
  return {
    score,
    weight: 0.30,
    findings,
    suggestions
  }
}

function calculateRegulatoryAlignment(response: string, question: HAQuestion): DimensionScore {
  // Check alignment with relevant guidelines
  const hasGuidelineRef = /ICH|FDA guidance|EMA guideline|regulatory|guidance/i.test(response)
  const hasPrecedent = /precedent|previous approval|similar product|approved/i.test(response)
  
  const score = (hasGuidelineRef ? 50 : 25) + (hasPrecedent ? 50 : 25)
  
  return {
    score: Math.min(100, score),
    weight: 0.20,
    findings: [],
    suggestions: !hasGuidelineRef ? [{
      priority: 'recommended',
      action: 'Reference applicable regulatory guidance',
      rationale: 'Demonstrates regulatory awareness'
    }] : []
  }
}

function calculateClarity(response: string): DimensionScore {
  // Analyze readability, structure
  const hasStructure = response.includes('\n\n') || response.includes('•') || /^\d\./m.test(response)
  const sentences = response.split(/[.!?]/).filter(Boolean)
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
    : 20
  
  const structureScore = hasStructure ? 50 : 30
  const lengthScore = avgSentenceLength < 25 ? 50 : avgSentenceLength < 35 ? 30 : 10
  const score = structureScore + lengthScore
  
  return {
    score: Math.min(100, score),
    weight: 0.10,
    findings: [],
    suggestions: !hasStructure ? [{
      priority: 'optional',
      action: 'Consider adding structure (headers, bullets)',
      rationale: 'Improves readability'
    }] : []
  }
}

function calculateCompleteness(gaps: GapAnalysis): DimensionScore {
  const requiredRatio = gaps.summary.requiredTotal > 0 
    ? gaps.summary.requiredMet / gaps.summary.requiredTotal 
    : 0.5
  const expectedRatio = gaps.summary.expectedTotal > 0 
    ? gaps.summary.expectedMet / gaps.summary.expectedTotal 
    : 0.5
  const score = (requiredRatio * 60 + expectedRatio * 40) * 100
  
  return {
    score: Math.round(Math.min(100, score)),
    weight: 0.15,
    findings: [],
    suggestions: []
  }
}

function predictOutcome(score: number, _clusters: AnalyticsCluster[]): CompletenessScore['predictedOutcome'] {
  // Based on historical patterns and current score
  if (score >= 80) {
    return {
      mostLikely: 'accepted',
      probability: 75,
      alternativeOutcomes: [
        { outcome: 'follow-up', probability: 20 },
        { outcome: 'rejected', probability: 5 }
      ]
    }
  } else if (score >= 60) {
    return {
      mostLikely: 'follow-up',
      probability: 55,
      alternativeOutcomes: [
        { outcome: 'accepted', probability: 35 },
        { outcome: 'rejected', probability: 10 }
      ]
    }
  } else {
    return {
      mostLikely: 'follow-up',
      probability: 65,
      alternativeOutcomes: [
        { outcome: 'rejected', probability: 25 },
        { outcome: 'accepted', probability: 10 }
      ]
    }
  }
}

function calculatePercentile(score: number, _patterns: unknown[]): number {
  // Simplified percentile calculation
  return Math.min(99, Math.round(score * 0.9))
}

function detectElementPresence(response: string, element: ResponseElement): { found: boolean; status: 'present' | 'partial' | 'missing'; quality?: 'weak' | 'adequate' | 'strong' } {
  const patterns: Record<string, RegExp> = {
    'data-tables': /table|figure|data\s+summary/i,
    'statistical-analysis': /p\s*[<>=]|confidence interval|statistical|ANOVA|t-test|chi-square/i,
    'literature-references': /reference|citation|published|journal|et al/i,
    'mechanism-explanation': /mechanism|pathway|mode of action|pharmacology/i,
    'risk-assessment': /risk|safety|adverse|benefit-risk/i,
    'regulatory-precedent': /precedent|previous approval|similar product|approved/i,
    'clinical-justification': /clinical|patient|efficacy|endpoint|trial/i,
    'process-description': /process|manufacturing|procedure|method|step/i,
    'comparability-data': /comparability|comparison|equivalent|similar/i,
    'stability-data': /stability|shelf life|degradation|storage/i,
    'validation-data': /validation|qualified|verified|validated/i,
    'expert-opinion': /expert|opinion|assessment|judgment/i
  }
  
  const pattern = patterns[element]
  const match = pattern?.test(response)
  
  return {
    found: match || false,
    status: match ? 'present' : 'missing',
    quality: match ? 'adequate' : undefined
  }
}

function getElementImportance(element: ResponseElement, question: HAQuestion): ElementAssessment['importance'] {
  return {
    basedOn: 'historical-pattern',
    historicalData: {
      presentInSuccessful: 85,
      presentInFollowUp: 45
    }
  }
}

function getElementGuidance(element: ResponseElement, question: HAQuestion): ElementAssessment['guidance'] {
  const guidance: Record<string, string> = {
    'data-tables': 'Include relevant data tables summarizing key findings',
    'statistical-analysis': 'Provide statistical analysis supporting your conclusions',
    'literature-references': 'Reference relevant published literature',
    'mechanism-explanation': 'Explain the mechanism of action',
    'risk-assessment': 'Include risk assessment and mitigation strategies',
    'regulatory-precedent': 'Cite regulatory precedents for similar products',
    'clinical-justification': 'Provide clinical justification for your approach',
    'process-description': 'Describe the manufacturing process',
    'comparability-data': 'Include comparability data',
    'stability-data': 'Reference stability data',
    'validation-data': 'Include validation data',
    'expert-opinion': 'Consider including expert opinion'
  }
  
  return {
    description: guidance[element] || 'Include this element',
    exampleApproach: '',
    sourceDocuments: []
  }
}

function getRecommendedElements(question: HAQuestion): ResponseElement[] {
  return ['literature-references', 'regulatory-precedent']
}

function calculateOverallReadiness(required: ElementAssessment[], expected: ElementAssessment[]): GapAnalysis['summary']['overallReadiness'] {
  const requiredMet = required.length > 0 
    ? required.filter(e => e.status === 'present').length / required.length 
    : 1
  const expectedMet = expected.length > 0 
    ? expected.filter(e => e.status === 'present').length / expected.length 
    : 1
  
  if (requiredMet === 1 && expectedMet >= 0.8) return 'ready'
  if (requiredMet >= 0.8 && expectedMet >= 0.6) return 'nearly-ready'
  if (requiredMet >= 0.5) return 'needs-work'
  return 'not-ready'
}

function getApplicationCTDSections(applicationId: string): string[] {
  // Return common CTD sections that would have documents
  return [
    '3.2.S.2.2',  // Drug Substance Manufacturing Process
    '3.2.S.2.3',  // Control of Materials
    '3.2.S.4.1',  // Specification
    '3.2.P.3.3',  // Drug Product Manufacturing Process
    '3.2.P.5.1',  // Stability Summary
    '2.7.1',      // Clinical Pharmacology Summary
    '2.7.2',      // Clinical Efficacy Summary
    '2.7.4',      // Clinical Safety Summary
    '2.5.1',      // Pharmacology Overview
  ]
}

function auditCTDSection(section: string, applicationId: string, analytics: AnalyticsData, questions: HAQuestion[]): CTDSectionAudit {
  const sectionName = getCTDSectionName(section)
  const discipline = getCTDSectionDiscipline(section)
  
  // Get historical data for this section
  const sectionClusters = analytics.clusters.filter((c: AnalyticsCluster) => 
    c.ctdSections.some((s: string) => s.startsWith(section.split('.').slice(0, 3).join('.')))
  )
  
  // Generate anticipated questions based on patterns
  const anticipatedQuestions: AnticipatedQuestion[] = sectionClusters
    .slice(0, 3)
    .map((cluster: AnalyticsCluster, idx: number) => ({
      id: `anticipated-${section}-${idx}`,
      questionText: `Please provide additional detail on ${cluster.name.toLowerCase()}`,
      discipline: discipline,
      probability: Math.max(30, 90 - idx * 20),
      severity: (idx === 0 ? 'major' : 'minor') as 'major' | 'minor',
      rationale: `Based on ${cluster.totalQuestions} historical questions in similar submissions`,
      basedOn: ['historical-pattern'] as ('historical-pattern' | 'document-gap' | 'regulatory-requirement' | 'agency-focus')[],
      recommendedPreparation: 'Review similar successful responses and prepare supporting data',
      estimatedEffort: idx === 0 ? '4-8 hours' : '2-4 hours',
      suggestedOwner: discipline,
      canPreventWithDocUpdate: true,
      suggestedDocChanges: ['Add more detail to this section']
    }))
  
  // Calculate readiness score based on patterns
  const questionsInSection = questions.filter(q => q.ctdSection?.startsWith(section))
  const answeredQuestions = questionsInSection.filter(q => q.status === 'submitted' || q.status === 'closed')
  const readinessScore = questionsInSection.length > 0 
    ? Math.round((answeredQuestions.length / questionsInSection.length) * 100)
    : 70 + Math.random() * 20 // Default score if no questions
  
  return {
    ctdSection: section,
    sectionName,
    readiness: {
      score: readinessScore,
      status: readinessScore >= 80 ? 'green' : readinessScore >= 50 ? 'yellow' : 'red',
      confidence: 'medium'
    },
    anticipatedQuestions,
    documentIssues: [],
    historicalData: {
      questionFrequency: 50 + Math.round(Math.random() * 30),
      avgQuestionsInSection: 2 + Math.random() * 3,
      topQuestionThemes: sectionClusters.slice(0, 3).map((c: AnalyticsCluster) => c.name)
    }
  }
}

function getCTDSectionName(section: string): string {
  const names: Record<string, string> = {
    '3.2.S.2.2': 'Description of Manufacturing Process (DS)',
    '3.2.S.2.3': 'Control of Materials',
    '3.2.S.4.1': 'Specification (DS)',
    '3.2.P.3.3': 'Description of Manufacturing Process (DP)',
    '3.2.P.5.1': 'Stability Summary (DP)',
    '2.7.1': 'Summary of Biopharmaceutic Studies',
    '2.7.2': 'Summary of Clinical Pharmacology Studies',
    '2.7.4': 'Summary of Clinical Safety',
    '2.5.1': 'Pharmacology Overview'
  }
  return names[section] || section
}

function getCTDSectionDiscipline(section: string): HAQDiscipline {
  if (section.startsWith('3.2.S') || section.startsWith('3.2.P')) return 'CMC'
  if (section.startsWith('2.7')) return 'Clinical'
  if (section.startsWith('2.4') || section.startsWith('2.6')) return 'Nonclinical'
  return 'Clinical'
}

function identifyCrossCuttingIssues(audits: CTDSectionAudit[]): CrossCuttingIssue[] {
  const issues: CrossCuttingIssue[] = []
  
  // Check for sections with low scores
  const lowScoreSections = audits.filter(a => a.readiness.status === 'red')
  if (lowScoreSections.length > 1) {
    issues.push({
      issue: 'Multiple sections have low readiness scores',
      affectedSections: lowScoreSections.map(a => a.ctdSection),
      severity: 'high',
      description: `${lowScoreSections.length} sections are below the readiness threshold`,
      recommendation: 'Prioritize addressing gaps in these sections before submission'
    })
  }
  
  // Check for high question probability across sections
  const highProbQuestions = audits.flatMap(a => 
    a.anticipatedQuestions.filter(q => q.probability > 70)
  )
  if (highProbQuestions.length > 5) {
    issues.push({
      issue: 'High probability of receiving multiple questions',
      affectedSections: Array.from(new Set(audits.filter(a => 
        a.anticipatedQuestions.some(q => q.probability > 70)
      ).map(a => a.ctdSection))),
      severity: 'medium',
      description: `${highProbQuestions.length} questions have >70% probability`,
      recommendation: 'Consider proactively addressing these areas before submission'
    })
  }
  
  return issues
}

function generatePriorityActions(audits: CTDSectionAudit[], issues: CrossCuttingIssue[]): AuditAction[] {
  const actions: AuditAction[] = []
  
  // Generate actions from high-probability questions
  audits.forEach(audit => {
    audit.anticipatedQuestions
      .filter(q => q.probability > 60)
      .forEach(q => {
        actions.push({
          priority: q.probability > 80 ? 1 : q.probability > 60 ? 2 : 3,
          action: q.recommendedPreparation,
          owner: q.suggestedOwner,
          effort: q.estimatedEffort,
          impact: `Reduce probability of question: ${q.questionText.substring(0, 50)}...`,
          relatedSections: [audit.ctdSection],
          relatedQuestions: [q.id]
        })
      })
  })
  
  // Generate actions from cross-cutting issues
  issues.forEach(issue => {
    actions.push({
      priority: issue.severity === 'high' ? 1 : issue.severity === 'medium' ? 2 : 3,
      action: issue.recommendation,
      owner: 'Regulatory' as HAQDiscipline,
      effort: '8-16 hours',
      impact: issue.description,
      relatedSections: issue.affectedSections,
      relatedQuestions: []
    })
  })
  
  return actions.sort((a, b) => a.priority - b.priority).slice(0, 10)
}

function calculateQuestionVolumeRisk(audit: PreSubmissionAudit | null, analytics: AnalyticsData): RiskDimension {
  const expectedQuestions = audit?.overallReadiness.estimatedQuestionCount.expected || 0
  const avgQuestions = analytics.portfolioAnalytics?.estimatedUpcomingQuestions || 30
  
  const ratio = avgQuestions > 0 ? expectedQuestions / avgQuestions : 1
  const score = Math.min(100, ratio * 50)
  
  return {
    score: Math.round(score),
    level: score >= 75 ? 'high' : score >= 50 ? 'elevated' : score >= 25 ? 'moderate' : 'low',
    factors: [`Expected ${expectedQuestions} questions`],
    trend: 'stable'
  }
}

function calculateQuestionSeverityRisk(audit: PreSubmissionAudit | null): RiskDimension {
  if (!audit) return { score: 50, level: 'moderate', factors: [], trend: 'stable' }
  
  const criticalQuestions = audit.sectionAudits.flatMap(s => 
    s.anticipatedQuestions.filter(q => q.severity === 'critical')
  ).length
  const majorQuestions = audit.sectionAudits.flatMap(s => 
    s.anticipatedQuestions.filter(q => q.severity === 'major')
  ).length
  
  const score = Math.min(100, criticalQuestions * 25 + majorQuestions * 10)
  
  return {
    score,
    level: score >= 75 ? 'high' : score >= 50 ? 'elevated' : score >= 25 ? 'moderate' : 'low',
    factors: [
      `${criticalQuestions} critical questions anticipated`,
      `${majorQuestions} major questions anticipated`
    ],
    trend: 'stable'
  }
}

function calculateResponseCapacityRisk(questions: HAQuestion[]): RiskDimension {
  const openQuestions = questions.filter(q => 
    ['new', 'open', 'in-progress'].includes(q.status)
  ).length
  
  // More open questions = higher risk
  const score = Math.min(100, openQuestions * 10)
  
  return {
    score,
    level: score >= 75 ? 'high' : score >= 50 ? 'elevated' : score >= 25 ? 'moderate' : 'low',
    factors: [`${openQuestions} questions currently open`],
    trend: 'stable'
  }
}

function calculateTimelineRisk(questions: HAQuestion[]): RiskDimension {
  const today = new Date()
  const overdueQuestions = questions.filter(q => {
    const dueDate = new Date(q.dueDate)
    return dueDate < today && !['submitted', 'closed'].includes(q.status)
  }).length
  
  const score = Math.min(100, overdueQuestions * 20)
  
  return {
    score,
    level: score >= 75 ? 'high' : score >= 50 ? 'elevated' : score >= 25 ? 'moderate' : 'low',
    factors: [`${overdueQuestions} questions overdue`],
    trend: overdueQuestions > 0 ? 'worsening' : 'stable'
  }
}

function calculatePrecedentRisk(_applicationId: string, _analytics: AnalyticsData): RiskDimension {
  // Would check for novel question patterns
  return {
    score: 25,
    level: 'low',
    factors: ['Similar submissions have established precedents'],
    trend: 'stable'
  }
}

function calculateDisciplineRisk(discipline: HAQDiscipline, audit: PreSubmissionAudit | null, questions: HAQuestion[]): DisciplineRisk {
  const disciplineQuestions = questions.filter(q => q.discipline === discipline)
  const openQuestions = disciplineQuestions.filter(q => 
    !['submitted', 'closed'].includes(q.status)
  ).length
  
  const anticipatedInAudit = audit?.sectionAudits.flatMap(s => 
    s.anticipatedQuestions.filter(q => q.suggestedOwner === discipline)
  ).length || 0
  
  const riskScore = Math.min(100, openQuestions * 15 + anticipatedInAudit * 5)
  
  return {
    discipline,
    riskScore,
    riskLevel: riskScore >= 75 ? 'high' : riskScore >= 50 ? 'elevated' : riskScore >= 25 ? 'moderate' : 'low',
    anticipatedQuestions: anticipatedInAudit,
    topConcerns: [],
    readinessScore: 100 - riskScore
  }
}

function calculateModuleRisks(audit: PreSubmissionAudit | null): ModuleRisk[] {
  const modules: ModuleRisk['module'][] = ['Module1', 'Module2', 'Module3', 'Module4', 'Module5']
  
  return modules.map(module => {
    // Map CTD sections to modules
    const modulePrefix = module === 'Module1' ? '1.' 
      : module === 'Module2' ? '2.' 
      : module === 'Module3' ? '3.' 
      : module === 'Module4' ? '4.' 
      : '5.'
    
    const moduleSections = audit?.sectionAudits.filter(s => 
      s.ctdSection.startsWith(modulePrefix)
    ) || []
    
    const avgScore = moduleSections.length > 0
      ? moduleSections.reduce((sum, s) => sum + (100 - s.readiness.score), 0) / moduleSections.length
      : 30
    
    return {
      module,
      riskScore: Math.round(avgScore),
      riskLevel: avgScore >= 75 ? 'high' : avgScore >= 50 ? 'elevated' : avgScore >= 25 ? 'moderate' : 'low',
      hotSpots: moduleSections
        .filter(s => s.readiness.status === 'red')
        .map(s => s.ctdSection)
    }
  })
}

function identifyTopRiskFactors(audit: PreSubmissionAudit | null, disciplineRisks: DisciplineRisk[]): RiskFactor[] {
  const factors: RiskFactor[] = []
  
  // Add discipline-based risk factors
  disciplineRisks
    .filter(d => d.riskLevel === 'high' || d.riskLevel === 'elevated')
    .forEach(d => {
      factors.push({
        factor: `${d.discipline} discipline has elevated risk`,
        severity: d.riskLevel === 'high' ? 'high' : 'medium',
        mitigation: `Address ${d.anticipatedQuestions} anticipated questions`
      })
    })
  
  // Add cross-cutting issues
  audit?.crossCuttingIssues.forEach(issue => {
    factors.push({
      factor: issue.issue,
      severity: issue.severity,
      mitigation: issue.recommendation
    })
  })
  
  return factors.slice(0, 5)
}

function generateMitigationPlan(factors: RiskFactor[], audit: PreSubmissionAudit | null): MitigationRecommendation[] {
  return factors.map((factor, idx) => ({
    priority: (idx + 1) as 1 | 2 | 3,
    action: factor.mitigation || 'Review and address this risk factor',
    expectedImpact: `Reduce ${factor.factor.toLowerCase()}`,
    effort: factor.severity === 'high' ? '16-24 hours' : '8-16 hours',
    owner: 'Regulatory Affairs'
  })).slice(0, 5)
}

function generateSimulatedFeedback(completeness: CompletenessScore, gaps: GapAnalysis, persona: ReviewerPersona): string[] {
  const feedback: string[] = []
  
  if (completeness.overall < 60) {
    feedback.push(`Response lacks sufficient detail for ${persona.subdiscipline || 'this discipline'}`)
  }
  
  if (gaps.summary.requiredMet < gaps.summary.requiredTotal) {
    const missing = gaps.requiredElements.filter(e => e.status !== 'present')
    feedback.push(`Missing required elements: ${missing.map(m => m.element.replace(/-/g, ' ')).join(', ')}`)
  }
  
  persona.responseExpectations.petPeeves.forEach(peeve => {
    if (Math.random() > 0.7) { // Randomly include some pet peeves
      feedback.push(`Reviewer concern: ${peeve}`)
    }
  })
  
  return feedback.length > 0 ? feedback : ['Response appears adequate pending detailed review']
}

function generateLikelyFollowUps(gaps: GapAnalysis, persona: ReviewerPersona): string[] {
  const followUps: string[] = []
  
  gaps.requiredElements
    .filter(e => e.status !== 'present')
    .forEach(e => {
      followUps.push(`Please provide ${e.element.replace(/-/g, ' ')} for this response`)
    })
  
  return followUps.slice(0, 3)
}

function identifyStrengths(completeness: CompletenessScore, persona: ReviewerPersona): string[] {
  const strengths: string[] = []
  
  Object.entries(completeness.dimensions).forEach(([key, dim]) => {
    if (dim.score >= 70) {
      strengths.push(`Strong ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`)
    }
  })
  
  return strengths.length > 0 ? strengths : ['Response shows professional structure']
}

function prioritizeImprovements(completeness: CompletenessScore, gaps: GapAnalysis): string[] {
  const improvements: string[] = []
  
  // Add suggestions from dimension scores
  Object.values(completeness.dimensions).forEach(dim => {
    dim.suggestions.forEach(s => {
      if (s.priority === 'critical' || s.priority === 'recommended') {
        improvements.push(s.action)
      }
    })
  })
  
  // Add suggestions from gaps
  gaps.requiredElements
    .filter(e => e.status !== 'present' && e.guidance)
    .forEach(e => {
      improvements.push(e.guidance!.description)
    })
  
  return Array.from(new Set(improvements)).slice(0, 5)
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useActivePersona = () => {
  const personas = useReviewerSimulation(state => state.personas)
  const activeId = useReviewerSimulation(state => state.activePersonaId)
  return useMemo(() => personas.find(p => p.id === activeId), [personas, activeId])
}

export const useCompletenessScore = (questionId: string) => {
  const scores = useReviewerSimulation(state => state.completenessScores)
  return useMemo(() => scores[questionId], [scores, questionId])
}

export const useGapAnalysis = (questionId: string) => {
  const analyses = useReviewerSimulation(state => state.gapAnalyses)
  return useMemo(() => analyses[questionId], [analyses, questionId])
}

export const useApplicationRisk = (applicationId: string) => {
  const profiles = useReviewerSimulation(state => state.riskProfiles)
  return useMemo(() => profiles[applicationId], [profiles, applicationId])
}

export const useLatestAudit = (applicationId: string) => {
  const audits = useReviewerSimulation(state => state.audits)
  return useMemo(() => 
    audits
      .filter(a => a.applicationId === applicationId)
      .sort((a, b) => b.auditDate.localeCompare(a.auditDate))[0],
    [audits, applicationId]
  )
}

export const useAnalysisProgress = () => {
  return useReviewerSimulation(state => ({
    isAnalyzing: state.isAnalyzing,
    progress: state.analysisProgress
  }))
}

export const usePersonas = () => useReviewerSimulation(state => state.personas)

export const useAudits = () => useReviewerSimulation(state => state.audits)
