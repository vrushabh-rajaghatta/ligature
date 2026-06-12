

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type { HAQDiscipline } from '@/types/haq'
import { useHAQStore } from './useHAQStore'
import { useResponseCampaign } from './useResponseCampaign'
import type { CampaignPhase, CampaignConfig, ResponseCampaign, GeneratedDraft } from './responseCampaignTypes'
import type {
  RegulatoryAgency, AgencyFormatProfile, AgencyFormattedPackage,
  AgencyResponseMatrixEntry, AgencyFormattedResponse, ContentTransformation,
  AgencyValidationResult, ResponseMatrixFormat,
  CampaignTemplate, CampaignTemplateCategory, CampaignTemplateConfig,
  TemplateInstantiation, TemplateModification, WorkflowTemplate,
  MilestoneTemplate, ApprovalRequirement, TeamAssignmentTemplate,
  CampaignCollaborator, CollaboratorRole, CollaboratorPermission,
  QuestionAssignment, AssignmentStatus, ReviewRequest, ReviewRequestStatus,
  ReviewerAssignment, ReviewFeedback, ReviewComment, ReviewSuggestion,
  CollaborationActivity, CollaborationActivityType,
  ResponseVersion, VersionStatus, VersionChangesSummary, VersionDiff,
  DiffHunk, StructuralChange, AgencyFeedbackRecord, VersionComparison,
  VersionComparisonSummary, ResponseEvolution, EvolutionMetrics, EvolutionTimelineEntry,
  SchedulePrediction, CompletionPrediction, QuestionPrediction, PhasePrediction,
  PredictionFactor, ScheduleRisk, ScheduleOptimization, WorkloadDistribution,
  HistoricalBenchmark, BenchmarkFactor, PredictionAccuracy, EnhancedCampaignState
} from './campaignEnhancementTypes'

// Re-export types
export type * from './campaignEnhancementTypes'

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// DEFAULT DATA: Agency Profiles
// ============================================================================

const defaultAgencyProfiles: Record<RegulatoryAgency, AgencyFormatProfile> = {
  FDA: {
    id: 'profile-fda',
    agency: 'FDA',
    name: 'FDA Standard Format',
    description: 'United States Food and Drug Administration format requirements',
    region: 'United States',
    language: 'English',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    documentNaming: {
      pattern: '{sequence}-{type}-{date}',
      maxLength: 64,
      allowedCharacters: 'a-zA-Z0-9-_',
      caseFormat: 'lowercase',
      datePosition: 'suffix',
      separators: ['-', '_'],
      examples: ['0001-ir-response-20240115', 'm2-25-clinical-summary']
    },
    coverLetterTemplate: 'Dear FDA Review Team,\n\nWe respectfully submit the following responses to your Information Request dated {ir_date}. This submission addresses {question_count} questions across {discipline_count} discipline(s).\n\n{response_summary}\n\nPlease do not hesitate to contact us if you require additional information.\n\nSincerely,\n{sponsor_name}',
    responseMatrixFormat: 'table-horizontal',
    ctdMapping: { '2.7.1': 'Summary of Biopharmaceutic Studies', '2.7.2': 'Summary of Clinical Pharmacology Studies', '2.7.3': 'Summary of Clinical Efficacy', '2.7.4': 'Summary of Clinical Safety', '2.7.6': 'Synopses of Individual Studies', '3.2.S': 'Drug Substance', '3.2.P': 'Drug Product' },
    requiredSections: ['cover-letter', 'response-matrix', 'individual-responses'],
    optionalSections: ['supporting-documents', 'cross-references'],
    prohibitedContent: ['promotional-language', 'unsubstantiated-claims'],
    formattingRules: [
      { id: 'fda-header-1', element: 'header', rule: 'Use Arial 12pt bold for section headers', required: true },
      { id: 'fda-table-1', element: 'table', rule: 'Tables should have borders and alternating row colors', required: false },
      { id: 'fda-ref-1', element: 'reference', rule: 'Use Vancouver citation style', example: '1. Smith J. Drug Safety. 2024;47(1):12-18.', required: true }
    ],
    submissionGuidelines: ['Submit via FDA ESG', 'Include signed Form FDA 356h', 'Reference original submission number'],
    validationRules: [
      { id: 'fda-val-1', name: 'CTD Reference Check', description: 'All CTD references must be valid', severity: 'error', checkType: 'reference', autoFix: false },
      { id: 'fda-val-2', name: 'Question Number Match', description: 'Response question numbers must match IR', severity: 'error', checkType: 'content', autoFix: true }
    ],
    lastUpdated: '2024-01-01'
  },
  EMA: {
    id: 'profile-ema',
    agency: 'EMA',
    name: 'EMA Standard Format',
    description: 'European Medicines Agency format requirements',
    region: 'European Union',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'de-DE',
    documentNaming: {
      pattern: '{type}_{sequence}_{date}',
      maxLength: 128,
      allowedCharacters: 'a-zA-Z0-9-_',
      caseFormat: 'lowercase',
      datePosition: 'suffix',
      separators: ['_', '-'],
      examples: ['rsp_0001_20240115', 'd120_responses_v1']
    },
    coverLetterTemplate: 'Dear CHMP/CAT Rapporteur,\n\nPlease find enclosed the responses to the Day {day_number} questions. This document addresses {question_count} questions from the consolidated list.\n\n{response_summary}\n\nWe remain at your disposal for any clarification.\n\nBest regards,\n{sponsor_name}',
    responseMatrixFormat: 'table-vertical',
    ctdMapping: { '2.7.1': 'Summary of Biopharmaceutic Studies', '2.7.2': 'Summary of Clinical Pharmacology Studies', '2.7.3': 'Summary of Clinical Efficacy', '2.7.4': 'Summary of Clinical Safety' },
    requiredSections: ['cover-letter', 'response-matrix', 'consolidated-responses'],
    optionalSections: ['risk-management-update', 'pil-update'],
    prohibitedContent: ['non-eu-specific-data', 'outdated-references'],
    formattingRules: [
      { id: 'ema-header-1', element: 'header', rule: 'Use Times New Roman 11pt for body text', required: true },
      { id: 'ema-table-1', element: 'table', rule: 'Tables must include source references', required: true }
    ],
    submissionGuidelines: ['Submit via CESP or eAF', 'Include response document sequence number', 'Follow eCTD EU Module 1 requirements'],
    validationRules: [
      { id: 'ema-val-1', name: 'D120 Question Match', description: 'All D120 questions must be addressed', severity: 'error', checkType: 'content', autoFix: false },
      { id: 'ema-val-2', name: 'EU Date Format', description: 'Dates must be in DD/MM/YYYY format', severity: 'warning', checkType: 'format', autoFix: true }
    ],
    lastUpdated: '2024-01-01'
  },
  PMDA: {
    id: 'profile-pmda',
    agency: 'PMDA',
    name: 'PMDA Standard Format',
    description: 'Pharmaceuticals and Medical Devices Agency (Japan) format requirements',
    region: 'Japan',
    language: 'Japanese',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'ja-JP',
    documentNaming: {
      pattern: '{date}_{type}_{sequence}',
      maxLength: 100,
      allowedCharacters: 'a-zA-Z0-9-_',
      caseFormat: 'lowercase',
      datePosition: 'prefix',
      separators: ['_'],
      examples: ['20240115_response_001', '20240115_additional_data']
    },
    coverLetterTemplate: '独立行政法人医薬品医療機器総合機構\n{reviewer_name}様\n\n照会事項に対する回答を別紙の通り提出いたします。\n\n{sponsor_name}',
    responseMatrixFormat: 'list-numbered',
    ctdMapping: { '2.7.1': '生物薬剤学試験及び関連する分析法', '2.7.2': '臨床薬理試験', '2.7.3': '臨床的有効性', '2.7.4': '臨床的安全性' },
    requiredSections: ['cover-letter', 'question-list', 'responses'],
    optionalSections: ['jp-specific-data', 'bridging-analysis'],
    prohibitedContent: ['non-jp-approved-comparators'],
    formattingRules: [
      { id: 'pmda-header-1', element: 'header', rule: 'Use MS Gothic font for Japanese text', required: true },
      { id: 'pmda-table-1', element: 'table', rule: 'Include both English and Japanese headers where applicable', required: false }
    ],
    submissionGuidelines: ['Submit via Gateway system', 'Include CTD-J format compliance', 'Provide English translation for key sections'],
    validationRules: [
      { id: 'pmda-val-1', name: 'Japanese Date Format', description: 'Dates must be in YYYY/MM/DD format', severity: 'warning', checkType: 'format', autoFix: true }
    ],
    lastUpdated: '2024-01-01'
  },
  HC: {
    id: 'profile-hc',
    agency: 'HC',
    name: 'Health Canada Format',
    description: 'Health Canada format requirements',
    region: 'Canada',
    language: 'English/French',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-CA',
    documentNaming: { pattern: '{type}-{sequence}-{date}', maxLength: 64, allowedCharacters: 'a-zA-Z0-9-_', caseFormat: 'lowercase', datePosition: 'suffix', separators: ['-'], examples: ['noc-response-001-2024-01-15'] },
    coverLetterTemplate: 'Dear Health Canada Reviewer,\n\nWe respectfully submit responses to your Notice of Deficiency...',
    responseMatrixFormat: 'table-horizontal',
    ctdMapping: {},
    requiredSections: ['cover-letter', 'responses'],
    optionalSections: [],
    prohibitedContent: [],
    formattingRules: [],
    submissionGuidelines: ['Submit via Common Electronic Submission Gateway'],
    validationRules: [],
    lastUpdated: '2024-01-01'
  },
  TGA: {
    id: 'profile-tga',
    agency: 'TGA',
    name: 'TGA Standard Format',
    description: 'Therapeutic Goods Administration (Australia) format requirements',
    region: 'Australia',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'en-AU',
    documentNaming: { pattern: '{sequence}_{type}_{date}', maxLength: 64, allowedCharacters: 'a-zA-Z0-9-_', caseFormat: 'lowercase', datePosition: 'suffix', separators: ['_'], examples: ['001_response_15012024'] },
    coverLetterTemplate: 'Dear TGA Evaluator,\n\nPlease find our responses to the Request for Information...',
    responseMatrixFormat: 'table-vertical',
    ctdMapping: {},
    requiredSections: ['cover-letter', 'responses'],
    optionalSections: [],
    prohibitedContent: [],
    formattingRules: [],
    submissionGuidelines: ['Submit via TGA Business Services'],
    validationRules: [],
    lastUpdated: '2024-01-01'
  },
  MHRA: {
    id: 'profile-mhra',
    agency: 'MHRA',
    name: 'MHRA Standard Format',
    description: 'Medicines and Healthcare products Regulatory Agency (UK) format requirements',
    region: 'United Kingdom',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'en-GB',
    documentNaming: { pattern: '{type}-{sequence}-{date}', maxLength: 64, allowedCharacters: 'a-zA-Z0-9-_', caseFormat: 'lowercase', datePosition: 'suffix', separators: ['-'], examples: ['response-001-15-01-2024'] },
    coverLetterTemplate: 'Dear MHRA Assessor,\n\nWe submit our responses to the preliminary assessment report...',
    responseMatrixFormat: 'table-horizontal',
    ctdMapping: {},
    requiredSections: ['cover-letter', 'responses'],
    optionalSections: [],
    prohibitedContent: [],
    formattingRules: [],
    submissionGuidelines: ['Submit via MHRA Submissions portal'],
    validationRules: [],
    lastUpdated: '2024-01-01'
  },
  ANVISA: {
    id: 'profile-anvisa',
    agency: 'ANVISA',
    name: 'ANVISA Standard Format',
    description: 'Brazilian Health Regulatory Agency format requirements',
    region: 'Brazil',
    language: 'Portuguese',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'pt-BR',
    documentNaming: { pattern: '{sequence}_{type}_{date}', maxLength: 64, allowedCharacters: 'a-zA-Z0-9-_', caseFormat: 'lowercase', datePosition: 'suffix', separators: ['_'], examples: ['001_resposta_15012024'] },
    coverLetterTemplate: 'Prezados Senhores da ANVISA,\n\nApresentamos as respostas às exigências...',
    responseMatrixFormat: 'list-numbered',
    ctdMapping: {},
    requiredSections: ['cover-letter', 'responses'],
    optionalSections: [],
    prohibitedContent: [],
    formattingRules: [],
    submissionGuidelines: ['Submit via ANVISA portal'],
    validationRules: [],
    lastUpdated: '2024-01-01'
  },
  NMPA: {
    id: 'profile-nmpa',
    agency: 'NMPA',
    name: 'NMPA Standard Format',
    description: 'National Medical Products Administration (China) format requirements',
    region: 'China',
    language: 'Chinese',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'zh-CN',
    documentNaming: { pattern: '{date}_{type}_{sequence}', maxLength: 64, allowedCharacters: 'a-zA-Z0-9-_', caseFormat: 'lowercase', datePosition: 'prefix', separators: ['_'], examples: ['20240115_response_001'] },
    coverLetterTemplate: '国家药品监督管理局：\n\n现提交审评意见答复...',
    responseMatrixFormat: 'table-vertical',
    ctdMapping: {},
    requiredSections: ['cover-letter', 'responses'],
    optionalSections: [],
    prohibitedContent: [],
    formattingRules: [],
    submissionGuidelines: ['Submit via CDE electronic submission system'],
    validationRules: [],
    lastUpdated: '2024-01-01'
  }
}

// ============================================================================
// DEFAULT DATA: Campaign Templates
// ============================================================================

function createDefaultTemplates(): Record<string, CampaignTemplate> {
  const now = new Date().toISOString()
  return {
    'template-ir-standard': {
      id: 'template-ir-standard',
      name: 'Standard IR Response',
      description: 'Standard workflow for Information Request responses with parallel generation and multi-reviewer approval',
      category: 'ir-response',
      tags: ['IR', 'standard', 'multi-reviewer'],
      createdAt: now,
      updatedAt: now,
      config: {
        strategy: 'parallel',
        consistencyRules: [],
        qualityTargets: { minAverageScore: 70, minIndividualScore: 60, maxScoreVariance: 20, requiredConsistencyPass: true, acceptanceThreshold: 65 },
        sharedElements: [],
        submissionPackaging: { generateCoverLetter: true, includeResponseMatrix: true, organizationMethod: 'by-question', outputFormat: 'both', includeAuditTrail: true, ctdPlacement: false },
        defaultWorkflow: { phases: ['initialization', 'draft-generation', 'quality-assessment', 'consistency-validation', 'refinement', 'final-review', 'packaging', 'complete'], skipConditions: [], parallelPhases: [['draft-generation'], ['quality-assessment', 'consistency-validation']] },
        requiredApprovals: [{ phase: 'final-review', role: 'lead', minApprovals: 1 }],
        defaultDeadlineDays: 30,
        milestones: [{ id: 'ms-draft', name: 'Draft Complete', phase: 'draft-generation', daysFromStart: 10, isRequired: true, notifyRoles: ['lead'] }, { id: 'ms-review', name: 'Review Complete', phase: 'final-review', daysFromStart: 25, daysFromDeadline: 5, isRequired: true, notifyRoles: ['owner', 'lead'] }],
        defaultAssignments: [{ role: 'lead', responsibilities: ['Coordinate responses', 'Final approval'], defaultCapacity: 10 }, { role: 'author', responsibilities: ['Draft responses', 'Address feedback'], defaultCapacity: 5 }],
        autoRefineThreshold: 65,
        consistencyCheckFrequency: 'per-phase'
      },
      usageCount: 0,
      rating: 4.5,
      ratingCount: 0,
      version: '1.0.0',
      isLatest: true,
      isShared: true,
      isGlobal: true
    },
    'template-ir-expedited': {
      id: 'template-ir-expedited',
      name: 'Expedited IR Response',
      description: 'Fast-track workflow for urgent IR responses with minimal review cycles',
      category: 'ir-response',
      tags: ['IR', 'urgent', 'expedited'],
      createdAt: now,
      updatedAt: now,
      config: {
        strategy: 'prioritized',
        consistencyRules: [],
        qualityTargets: { minAverageScore: 65, minIndividualScore: 55, maxScoreVariance: 25, requiredConsistencyPass: true, acceptanceThreshold: 60 },
        sharedElements: [],
        submissionPackaging: { generateCoverLetter: true, includeResponseMatrix: true, organizationMethod: 'by-discipline', outputFormat: 'pdf', includeAuditTrail: false, ctdPlacement: false },
        defaultWorkflow: { phases: ['initialization', 'draft-generation', 'quality-assessment', 'final-review', 'packaging', 'complete'], skipConditions: [{ phase: 'refinement', condition: 'all-high-quality', threshold: 70 }], parallelPhases: [['draft-generation', 'quality-assessment']] },
        requiredApprovals: [{ phase: 'final-review', role: 'lead', minApprovals: 1 }],
        defaultDeadlineDays: 14,
        milestones: [{ id: 'ms-draft', name: 'Draft Complete', phase: 'draft-generation', daysFromStart: 5, isRequired: true, notifyRoles: ['lead', 'owner'] }],
        defaultAssignments: [{ role: 'lead', responsibilities: ['Rapid review', 'Immediate approval'], defaultCapacity: 15 }],
        autoRefineThreshold: 60,
        consistencyCheckFrequency: 'final-only'
      },
      usageCount: 0,
      rating: 4.2,
      ratingCount: 0,
      version: '1.0.0',
      isLatest: true,
      isShared: true,
      isGlobal: true
    },
    'template-crl-response': {
      id: 'template-crl-response',
      name: 'Complete Response Letter',
      description: 'Comprehensive workflow for CRL responses with rigorous quality controls',
      category: 'crl-response',
      tags: ['CRL', 'comprehensive', 'high-quality'],
      createdAt: now,
      updatedAt: now,
      config: {
        strategy: 'grouped',
        consistencyRules: [],
        qualityTargets: { minAverageScore: 80, minIndividualScore: 75, maxScoreVariance: 10, requiredConsistencyPass: true, acceptanceThreshold: 75 },
        sharedElements: [],
        submissionPackaging: { generateCoverLetter: true, includeResponseMatrix: true, organizationMethod: 'by-discipline', outputFormat: 'both', includeAuditTrail: true, ctdPlacement: true },
        defaultWorkflow: { phases: ['initialization', 'element-collection', 'draft-generation', 'quality-assessment', 'consistency-validation', 'refinement', 'final-review', 'packaging', 'complete'], skipConditions: [], parallelPhases: [] },
        requiredApprovals: [{ phase: 'quality-assessment', role: 'reviewer', minApprovals: 2 }, { phase: 'final-review', role: 'lead', minApprovals: 1 }, { phase: 'packaging', role: 'owner', minApprovals: 1 }],
        defaultDeadlineDays: 90,
        milestones: [{ id: 'ms-elements', name: 'Elements Collected', phase: 'element-collection', daysFromStart: 14, isRequired: true, notifyRoles: ['lead'] }, { id: 'ms-draft', name: 'Drafts Complete', phase: 'draft-generation', daysFromStart: 45, isRequired: true, notifyRoles: ['lead', 'owner'] }, { id: 'ms-review', name: 'Review Complete', phase: 'final-review', daysFromStart: 76, daysFromDeadline: 14, isRequired: true, notifyRoles: ['owner'] }],
        defaultAssignments: [{ role: 'lead', discipline: 'Clinical', responsibilities: ['Clinical coordination', 'Cross-discipline alignment'], defaultCapacity: 8 }, { role: 'reviewer', responsibilities: ['Quality review', 'Regulatory assessment'], defaultCapacity: 5 }],
        autoRefineThreshold: 75,
        consistencyCheckFrequency: 'per-draft'
      },
      usageCount: 0,
      rating: 4.8,
      ratingCount: 0,
      version: '1.0.0',
      isLatest: true,
      isShared: true,
      isGlobal: true
    }
  }
}

// ============================================================================
// DEFAULT DATA: Historical Benchmarks
// ============================================================================

function createDefaultBenchmarks(): Record<string, HistoricalBenchmark> {
  return {
    'Clinical-IR': { discipline: 'Clinical', questionType: 'IR', averageDuration: 180, medianDuration: 150, standardDeviation: 60, sampleSize: 500, factors: [{ factor: 'complexity', correlation: 0.72, adjustment: 45 }, { factor: 'data-availability', correlation: -0.45, adjustment: -30 }] },
    'CMC-IR': { discipline: 'CMC', questionType: 'IR', averageDuration: 120, medianDuration: 100, standardDeviation: 40, sampleSize: 450, factors: [{ factor: 'batch-data', correlation: 0.65, adjustment: 30 }, { factor: 'specification-changes', correlation: 0.55, adjustment: 25 }] },
    'Safety-IR': { discipline: 'Safety', questionType: 'IR', averageDuration: 150, medianDuration: 130, standardDeviation: 50, sampleSize: 400, factors: [{ factor: 'signal-complexity', correlation: 0.68, adjustment: 40 }, { factor: 'case-volume', correlation: 0.52, adjustment: 20 }] },
    'Nonclinical-IR': { discipline: 'Nonclinical', questionType: 'IR', averageDuration: 140, medianDuration: 120, standardDeviation: 45, sampleSize: 350, factors: [{ factor: 'study-count', correlation: 0.58, adjustment: 25 }] },
    'Statistics-IR': { discipline: 'Biometrics', questionType: 'IR', averageDuration: 200, medianDuration: 180, standardDeviation: 70, sampleSize: 300, factors: [{ factor: 'analysis-complexity', correlation: 0.75, adjustment: 50 }, { factor: 'dataset-size', correlation: 0.48, adjustment: 20 }] },
    'Regulatory-IR': { discipline: 'Administrative', questionType: 'IR', averageDuration: 90, medianDuration: 75, standardDeviation: 30, sampleSize: 600, factors: [{ factor: 'precedent-availability', correlation: -0.55, adjustment: -20 }] }
  }
}

// ============================================================================
// STORE STATE
// ============================================================================

interface CampaignEnhancementState extends EnhancedCampaignState {
  // Processing state
  isProcessing: boolean
  processingProgress: number
  currentTask: string
  lastError: string | null
}

interface CampaignEnhancementActions {
  // Agency Formatting
  getAgencyProfile: (agency: RegulatoryAgency) => AgencyFormatProfile
  formatPackageForAgency: (campaignId: string, agency: RegulatoryAgency) => Promise<AgencyFormattedPackage>
  validateAgencyPackage: (packageId: string) => AgencyValidationResult[]
  exportAgencyPackage: (packageId: string, format: 'word' | 'pdf' | 'both') => Promise<string[]>
  
  // Campaign Templates
  getTemplates: (category?: CampaignTemplateCategory) => CampaignTemplate[]
  getTemplate: (templateId: string) => CampaignTemplate | null
  createTemplate: (config: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>) => CampaignTemplate
  updateTemplate: (templateId: string, updates: Partial<CampaignTemplate>) => void
  deleteTemplate: (templateId: string) => void
  instantiateTemplate: (templateId: string, modifications?: TemplateModification[]) => CampaignConfig
  rateTemplate: (templateId: string, rating: number) => void
  
  // Collaborative Review
  addCollaborator: (campaignId: string, collaborator: Omit<CampaignCollaborator, 'id' | 'joinedAt' | 'lastActiveAt' | 'status'>) => CampaignCollaborator
  updateCollaborator: (campaignId: string, collaboratorId: string, updates: Partial<CampaignCollaborator>) => void
  removeCollaborator: (campaignId: string, collaboratorId: string) => void
  getCollaborators: (campaignId: string) => CampaignCollaborator[]
  assignQuestion: (campaignId: string, assignment: Omit<QuestionAssignment, 'id' | 'assignedAt' | 'status'>) => QuestionAssignment
  updateAssignment: (campaignId: string, assignmentId: string, updates: Partial<QuestionAssignment>) => void
  getAssignments: (campaignId: string, userId?: string) => QuestionAssignment[]
  requestReview: (campaignId: string, request: Omit<ReviewRequest, 'id' | 'requestedAt' | 'status' | 'roundNumber'>) => ReviewRequest
  submitReview: (campaignId: string, requestId: string, userId: string, feedback: ReviewFeedback) => void
  getReviewRequests: (campaignId: string, userId?: string) => ReviewRequest[]
  logCollaborationActivity: (activity: Omit<CollaborationActivity, 'id' | 'timestamp'>) => void
  
  // Response Versioning
  createVersion: (questionId: string, campaignId: string, draftId: string, label: string) => ResponseVersion
  getVersions: (questionId: string) => ResponseVersion[]
  getVersion: (versionId: string) => ResponseVersion | null
  compareVersions: (versionAId: string, versionBId: string) => VersionComparison
  getResponseEvolution: (questionId: string) => ResponseEvolution
  recordAgencyFeedback: (versionId: string, feedback: Omit<AgencyFeedbackRecord, 'id'>) => void
  
  // Predictive Scheduling
  generatePrediction: (campaignId: string) => SchedulePrediction
  getQuestionPrediction: (campaignId: string, questionId: string) => QuestionPrediction | null
  getWorkloadDistribution: (campaignId: string) => WorkloadDistribution[]
  recordActualDuration: (questionId: string, duration: number) => void
  getOptimizations: (campaignId: string) => ScheduleOptimization[]
  getBenchmark: (discipline: HAQDiscipline, questionType: string) => HistoricalBenchmark | null
}

type CampaignEnhancementStore = CampaignEnhancementState & CampaignEnhancementActions

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCampaignEnhancements = create<CampaignEnhancementStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      agencyProfiles: defaultAgencyProfiles,
      formattedPackages: {},
      templates: createDefaultTemplates(),
      templateInstantiations: {},
      collaborators: {},
      assignments: {},
      reviewRequests: {},
      collaborationActivity: [],
      responseVersions: {},
      versionComparisons: {},
      predictions: {},
      benchmarks: createDefaultBenchmarks(),
      workloadDistributions: {},
      isProcessing: false,
      processingProgress: 0,
      currentTask: '',
      lastError: null,
      
      // ======================================================================
      // Agency Formatting Actions
      // ======================================================================
      
      getAgencyProfile: (agency) => get().agencyProfiles[agency],
      
      formatPackageForAgency: async (campaignId, agency) => {
        const profile = get().agencyProfiles[agency]
        const campaignStore = useResponseCampaign.getState()
        const campaign = campaignStore.getCampaign(campaignId)
        if (!campaign) throw new Error('Campaign not found')
        
        set({ isProcessing: true, currentTask: `Formatting package for ${agency}...` }, false, 'formatPackageForAgency:start')
        
        const packageId = generateId('pkg')
        const now = new Date().toISOString()
        
        // Format cover letter
        const coverLetter = profile.coverLetterTemplate
          .replace('{ir_date}', campaign.createdAt.split('T')[0])
          .replace('{question_count}', String(campaign.config.questionIds.length))
          .replace('{discipline_count}', String(new Set(Object.values(campaign.questionProgress).map(p => p.questionId)).size))
          .replace('{sponsor_name}', '[Sponsor Name]')
          .replace('{response_summary}', 'Please see the attached response matrix for details.')
        
        // Format response matrix
        const haqStore = useHAQStore.getState()
        const matrixEntries: AgencyResponseMatrixEntry[] = campaign.config.questionIds.map((qId, idx) => {
          const question = haqStore.haqs.find(q => q.id === qId)
          return {
            questionNumber: question?.questionNumber || `Q${idx + 1}`,
            questionSummary: question?.questionText?.substring(0, 100) || 'Question text',
            ctdReference: question?.ctdSection || 'N/A',
            responsePageNumber: idx + 2
          }
        })
        
        // Format individual responses
        const formattedResponses: AgencyFormattedResponse[] = campaign.config.questionIds.map(qId => {
          const draft = campaign.drafts[campaign.activeDraftIds[qId]]
          const originalContent = draft?.content || ''
          const transformations: ContentTransformation[] = []
          
          // Apply date format transformation
          let formattedContent = originalContent
          if (agency === 'EMA' || agency === 'TGA' || agency === 'MHRA') {
            const usDatePattern = /(\d{2})\/(\d{2})\/(\d{4})/g
            formattedContent = formattedContent.replace(usDatePattern, (_, m, d, y) => {
              transformations.push({ type: 'date-format', original: `${m}/${d}/${y}`, transformed: `${d}/${m}/${y}`, reason: `${agency} requires DD/MM/YYYY format` })
              return `${d}/${m}/${y}`
            })
          }
          
          return {
            questionId: qId,
            questionNumber: haqStore.haqs.find(q => q.id === qId)?.questionNumber || qId,
            formattedContent,
            originalContent,
            transformations,
            warnings: []
          }
        })
        
        const pkg: AgencyFormattedPackage = {
          id: packageId,
          campaignId,
          agency,
          profileId: profile.id,
          createdAt: now,
          status: 'validating',
          coverLetter: { content: coverLetter, format: 'text', validated: false },
          responseMatrix: { format: profile.responseMatrixFormat, content: '', entries: matrixEntries },
          formattedResponses,
          validationResults: [],
          validationPassed: false
        }
        
        // Run validation
        const validationResults = get().validateAgencyPackage(packageId)
        pkg.validationResults = validationResults
        pkg.validationPassed = !validationResults.some(r => r.severity === 'error' && !r.passed)
        pkg.status = pkg.validationPassed ? 'ready' : 'validating'
        pkg.coverLetter.validated = true
        
        set(state => ({
          formattedPackages: { ...state.formattedPackages, [packageId]: pkg },
          isProcessing: false,
          processingProgress: 100,
          currentTask: ''
        }), false, 'formatPackageForAgency:complete')
        
        return pkg
      },
      
      validateAgencyPackage: (packageId) => {
        const pkg = get().formattedPackages[packageId]
        if (!pkg) return []
        
        const profile = get().agencyProfiles[pkg.agency]
        const results: AgencyValidationResult[] = []
        
        // Run each validation rule
        profile.validationRules.forEach(rule => {
          let passed = true
          let message = 'Validation passed'
          
          switch (rule.checkType) {
            case 'content':
              passed = pkg.formattedResponses.length === pkg.responseMatrix.entries.length
              message = passed ? 'All questions have responses' : 'Missing responses for some questions'
              break
            case 'format':
              passed = pkg.coverLetter.validated
              message = passed ? 'Format validated' : 'Format validation pending'
              break
            case 'reference':
              passed = pkg.responseMatrix.entries.every(e => e.ctdReference !== 'N/A')
              message = passed ? 'All CTD references valid' : 'Some CTD references missing'
              break
          }
          
          results.push({ ruleId: rule.id, ruleName: rule.name, passed, severity: rule.severity, message })
        })
        
        // Default validation if no rules
        if (results.length === 0) {
          results.push({ ruleId: 'default', ruleName: 'Basic Validation', passed: true, severity: 'info', message: 'Basic validation passed' })
        }
        
        return results
      },
      
      exportAgencyPackage: async (packageId, format) => {
        const pkg = get().formattedPackages[packageId]
        if (!pkg) throw new Error('Package not found')
        
        const urls: string[] = []
        if (format === 'word' || format === 'both') urls.push(`/exports/${packageId}/${pkg.agency}-response-package.docx`)
        if (format === 'pdf' || format === 'both') urls.push(`/exports/${packageId}/${pkg.agency}-response-package.pdf`)
        
        set(state => ({
          formattedPackages: {
            ...state.formattedPackages,
            [packageId]: { ...pkg, status: 'exported', exportedAt: new Date().toISOString(), downloadUrls: urls }
          }
        }), false, 'exportAgencyPackage')
        
        return urls
      },
      
      // ======================================================================
      // Campaign Templates Actions
      // ======================================================================
      
      getTemplates: (category) => {
        const templates = Object.values(get().templates)
        return category ? templates.filter(t => t.category === category) : templates
      },
      
      getTemplate: (templateId) => get().templates[templateId] || null,
      
      createTemplate: (config) => {
        const id = generateId('template')
        const now = new Date().toISOString()
        const template: CampaignTemplate = { ...config, id, createdAt: now, updatedAt: now, usageCount: 0 }
        set(state => ({ templates: { ...state.templates, [id]: template } }), false, 'createTemplate')
        return template
      },
      
      updateTemplate: (templateId, updates) => {
        set(state => {
          const template = state.templates[templateId]
          if (!template) return state
          return { templates: { ...state.templates, [templateId]: { ...template, ...updates, updatedAt: new Date().toISOString() } } }
        }, false, 'updateTemplate')
      },
      
      deleteTemplate: (templateId) => {
        set(state => {
          const { [templateId]: _, ...remaining } = state.templates
          return { templates: remaining }
        }, false, 'deleteTemplate')
      },
      
      instantiateTemplate: (templateId, modifications = []) => {
        const template = get().templates[templateId]
        if (!template) throw new Error('Template not found')
        
        // Increment usage count
        get().updateTemplate(templateId, { usageCount: template.usageCount + 1, lastUsedAt: new Date().toISOString() })
        
        // Create campaign config from template
        const config: CampaignConfig = {
          name: `New Campaign from ${template.name}`,
          questionIds: [],
          strategy: template.config.strategy,
          consistencyRules: template.config.consistencyRules,
          qualityTargets: template.config.qualityTargets,
          sharedElements: template.config.sharedElements,
          submissionPackaging: template.config.submissionPackaging
        }
        
        // Apply modifications
        modifications.forEach(mod => {
          const keys = mod.field.split('.')
          let target: unknown = config
          for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]]
          }
          target[keys[keys.length - 1]] = mod.newValue
        })
        
        // Record instantiation
        const instantiation: TemplateInstantiation = {
          id: generateId('inst'),
          templateId,
          campaignId: '', // Will be set when campaign is created
          instantiatedAt: new Date().toISOString(),
          modifications
        }
        set(state => ({ templateInstantiations: { ...state.templateInstantiations, [instantiation.id]: instantiation } }), false, 'instantiateTemplate')
        
        return config
      },
      
      rateTemplate: (templateId, rating) => {
        const template = get().templates[templateId]
        if (!template) return
        const newRatingCount = template.ratingCount + 1
        const newRating = ((template.rating * template.ratingCount) + rating) / newRatingCount
        get().updateTemplate(templateId, { rating: Math.round(newRating * 10) / 10, ratingCount: newRatingCount })
      },
      
      // ======================================================================
      // Collaborative Review Actions
      // ======================================================================
      
      addCollaborator: (campaignId, collaborator) => {
        const id = generateId('collab')
        const now = new Date().toISOString()
        const newCollab: CampaignCollaborator = { ...collaborator, id, joinedAt: now, lastActiveAt: now, status: 'active' }
        set(state => ({
          collaborators: { ...state.collaborators, [campaignId]: [...(state.collaborators[campaignId] || []), newCollab] }
        }), false, 'addCollaborator')
        get().logCollaborationActivity({ campaignId, userId: collaborator.userId, userName: collaborator.userName, type: 'joined', details: { role: collaborator.role } })
        return newCollab
      },
      
      updateCollaborator: (campaignId, collaboratorId, updates) => {
        set(state => ({
          collaborators: {
            ...state.collaborators,
            [campaignId]: (state.collaborators[campaignId] || []).map(c => c.id === collaboratorId ? { ...c, ...updates } : c)
          }
        }), false, 'updateCollaborator')
      },
      
      removeCollaborator: (campaignId, collaboratorId) => {
        const collab = (get().collaborators[campaignId] || []).find(c => c.id === collaboratorId)
        if (collab) {
          get().updateCollaborator(campaignId, collaboratorId, { status: 'removed' })
          get().logCollaborationActivity({ campaignId, userId: collab.userId, userName: collab.userName, type: 'left', details: {} })
        }
      },
      
      getCollaborators: (campaignId) => (get().collaborators[campaignId] || []).filter(c => c.status === 'active'),
      
      assignQuestion: (campaignId, assignment) => {
        const id = generateId('assign')
        const newAssignment: QuestionAssignment = { ...assignment, id, assignedAt: new Date().toISOString(), status: 'pending' }
        set(state => ({
          assignments: { ...state.assignments, [campaignId]: [...(state.assignments[campaignId] || []), newAssignment] }
        }), false, 'assignQuestion')
        const assignee = (get().collaborators[campaignId] || []).find(c => c.userId === assignment.assignedTo)
        if (assignee) {
          get().logCollaborationActivity({ campaignId, userId: assignment.assignedTo, userName: assignee.userName, type: 'assigned', questionId: assignment.questionId, details: { assignedBy: assignment.assignedBy } })
        }
        return newAssignment
      },
      
      updateAssignment: (campaignId, assignmentId, updates) => {
        set(state => ({
          assignments: {
            ...state.assignments,
            [campaignId]: (state.assignments[campaignId] || []).map(a => a.id === assignmentId ? { ...a, ...updates } : a)
          }
        }), false, 'updateAssignment')
      },
      
      getAssignments: (campaignId, userId) => {
        const assignments = get().assignments[campaignId] || []
        return userId ? assignments.filter(a => a.assignedTo === userId) : assignments
      },
      
      requestReview: (campaignId, request) => {
        const existing = (get().reviewRequests[campaignId] || []).filter(r => r.questionId === request.questionId && r.draftId === request.draftId)
        const roundNumber = existing.length + 1
        const id = generateId('review')
        const newRequest: ReviewRequest = { ...request, id, requestedAt: new Date().toISOString(), status: 'pending', roundNumber }
        set(state => ({
          reviewRequests: { ...state.reviewRequests, [campaignId]: [...(state.reviewRequests[campaignId] || []), newRequest] }
        }), false, 'requestReview')
        const requester = (get().collaborators[campaignId] || []).find(c => c.userId === request.requestedBy)
        if (requester) {
          get().logCollaborationActivity({ campaignId, userId: request.requestedBy, userName: requester.userName, type: 'requested-review', questionId: request.questionId, draftId: request.draftId, details: { reviewers: request.reviewers.map(r => r.userName) } })
        }
        return newRequest
      },
      
      submitReview: (campaignId, requestId, userId, feedback) => {
        set(state => {
          const requests = state.reviewRequests[campaignId] || []
          return {
            reviewRequests: {
              ...state.reviewRequests,
              [campaignId]: requests.map(r => {
                if (r.id !== requestId) return r
                const updatedReviewers = r.reviewers.map(rev => {
                  if (rev.userId !== userId) return rev
                  return { ...rev, status: 'completed' as const, completedAt: new Date().toISOString(), decision: feedback.approved ? 'approve' as const : 'request-changes' as const, feedback }
                })
                const allComplete = updatedReviewers.every(rev => rev.status === 'completed')
                const allApproved = updatedReviewers.every(rev => rev.decision === 'approve')
                return { ...r, reviewers: updatedReviewers, status: allComplete ? (allApproved ? 'approved' : 'changes-requested') : 'in-review' as ReviewRequestStatus, resolvedAt: allComplete ? new Date().toISOString() : undefined }
              })
            }
          }
        }, false, 'submitReview')
        const reviewer = (get().collaborators[campaignId] || []).find(c => c.userId === userId)
        const request = (get().reviewRequests[campaignId] || []).find(r => r.id === requestId)
        if (reviewer && request) {
          get().logCollaborationActivity({ campaignId, userId, userName: reviewer.userName, type: 'completed-review', questionId: request.questionId, draftId: request.draftId, details: { approved: feedback.approved, assessment: feedback.overallAssessment } })
        }
      },
      
      getReviewRequests: (campaignId, userId) => {
        const requests = get().reviewRequests[campaignId] || []
        return userId ? requests.filter(r => r.reviewers.some(rev => rev.userId === userId)) : requests
      },
      
      logCollaborationActivity: (activity) => {
        const entry: CollaborationActivity = { ...activity, id: generateId('activity'), timestamp: new Date().toISOString() }
        set(state => ({ collaborationActivity: [...state.collaborationActivity.slice(-499), entry] }), false, 'logCollaborationActivity')
      },
      
      // ======================================================================
      // Response Versioning Actions
      // ======================================================================
      
      createVersion: (questionId, campaignId, draftId, label) => {
        const campaignStore = useResponseCampaign.getState()
        const campaign = campaignStore.getCampaign(campaignId)
        const draft = campaign?.drafts[draftId]
        
        const existingVersions = get().responseVersions[questionId] || []
        const versionNumber = existingVersions.length + 1
        
        // Calculate diff from previous version
        let diffFromPrevious: VersionDiff | undefined
        let changesSummary: VersionChangesSummary | undefined
        
        if (existingVersions.length > 0) {
          const previousVersion = existingVersions[existingVersions.length - 1]
          const prevWords = previousVersion.content.split(/\s+/).length
          const currWords = (draft?.content || '').split(/\s+/).length
          
          changesSummary = {
            totalChanges: Math.abs(currWords - prevWords),
            additions: currWords > prevWords ? currWords - prevWords : 0,
            deletions: currWords < prevWords ? prevWords - currWords : 0,
            modifications: 0,
            significantChanges: [],
            changeCategories: { content: Math.abs(currWords - prevWords) }
          }
          
          diffFromPrevious = {
            previousVersionId: previousVersion.id,
            hunks: [],
            wordCount: { before: prevWords, after: currWords, delta: currWords - prevWords },
            structuralChanges: []
          }
        }
        
        const version: ResponseVersion = {
          id: generateId('version'),
          questionId,
          campaignId,
          versionNumber,
          label,
          createdAt: new Date().toISOString(),
          content: draft?.content || '',
          draftId,
          irCycle: 1,
          qualityScore: draft?.initialScore?.overall || 0,
          consistencyPassed: true,
          changesSummary,
          diffFromPrevious,
          status: 'draft'
        }
        
        set(state => ({
          responseVersions: { ...state.responseVersions, [questionId]: [...(state.responseVersions[questionId] || []), version] }
        }), false, 'createVersion')
        
        return version
      },
      
      getVersions: (questionId) => get().responseVersions[questionId] || [],
      
      getVersion: (versionId) => {
        for (const versions of Object.values(get().responseVersions)) {
          const found = versions.find(v => v.id === versionId)
          if (found) return found
        }
        return null
      },
      
      compareVersions: (versionAId, versionBId) => {
        const versionA = get().getVersion(versionAId)
        const versionB = get().getVersion(versionBId)
        
        if (!versionA || !versionB) throw new Error('Version not found')
        
        const wordsA = versionA.content.split(/\s+/).length
        const wordsB = versionB.content.split(/\s+/).length
        const qualityDelta = versionB.qualityScore - versionA.qualityScore
        
        const comparison: VersionComparison = {
          versionAId,
          versionBId,
          compared: new Date().toISOString(),
          summary: {
            overallChange: Math.abs(wordsB - wordsA) > 100 ? 'major' : Math.abs(wordsB - wordsA) > 50 ? 'moderate' : Math.abs(wordsB - wordsA) > 20 ? 'minor' : 'trivial',
            keyChanges: [],
            risksIntroduced: [],
            risksResolved: [],
            qualityImpact: qualityDelta > 5 ? 'improved' : qualityDelta < -5 ? 'degraded' : 'unchanged'
          },
          diff: {
            previousVersionId: versionAId,
            hunks: [],
            wordCount: { before: wordsA, after: wordsB, delta: wordsB - wordsA },
            structuralChanges: []
          },
          qualityDelta,
          recommendation: qualityDelta > 0 ? 'Newer version recommended' : qualityDelta < 0 ? 'Consider reverting changes' : 'Versions are comparable'
        }
        
        set(state => ({
          versionComparisons: { ...state.versionComparisons, [`${versionAId}-${versionBId}`]: comparison }
        }), false, 'compareVersions')
        
        return comparison
      },
      
      getResponseEvolution: (questionId) => {
        const versions = get().responseVersions[questionId] || []
        
        const timeline: EvolutionTimelineEntry[] = versions.map(v => ({
          timestamp: v.createdAt,
          event: v.status === 'submitted' ? 'submitted' : v.status === 'approved' ? 'approved' : 'created',
          versionId: v.id,
          versionNumber: v.versionNumber,
          description: `Version ${v.versionNumber}: ${v?.label ?? ''}`
        }))
        
        const metrics: EvolutionMetrics = {
          totalVersions: versions.length,
          averageIterationsPerCycle: versions.length,
          qualityTrend: versions.length >= 2 && versions[versions.length - 1].qualityScore > versions[0].qualityScore ? 'improving' : 'stable',
          timeToApproval: versions.filter(v => v.status === 'approved').map(() => 0),
          contentGrowth: versions.length >= 2 ? versions[versions.length - 1].content.length - versions[0].content.length : 0,
          changesPerCycle: versions.map(v => v.changesSummary?.totalChanges || 0)
        }
        
        return {
          questionId,
          versions,
          currentVersionId: versions.length > 0 ? versions[versions.length - 1].id : '',
          totalIRCycles: 1,
          evolutionMetrics: metrics,
          timeline
        }
      },
      
      recordAgencyFeedback: (versionId, feedback) => {
        const version = get().getVersion(versionId)
        if (!version) return
        
        const feedbackRecord: AgencyFeedbackRecord = { ...feedback, id: generateId('feedback') }
        
        set(state => ({
          responseVersions: {
            ...state.responseVersions,
            [version.questionId]: (state.responseVersions[version.questionId] || []).map(v =>
              v.id === versionId
                ? { ...v, agencyFeedback: [...(v.agencyFeedback || []), feedbackRecord], status: feedback.feedbackType === 'accepted' ? 'approved' as VersionStatus : v.status }
                : v
            )
          }
        }), false, 'recordAgencyFeedback')
      },
      
      // ======================================================================
      // Predictive Scheduling Actions
      // ======================================================================
      
      generatePrediction: (campaignId) => {
        const campaignStore = useResponseCampaign.getState()
        const campaign = campaignStore.getCampaign(campaignId)
        if (!campaign) throw new Error('Campaign not found')
        
        const haqStore = useHAQStore.getState()
        const now = new Date()
        
        // Generate question predictions
        const questionPredictions: Record<string, QuestionPrediction> = {}
        let totalEstimatedDuration = 0
        
        campaign.config.questionIds.forEach(qId => {
          const question = haqStore.haqs.find(q => q.id === qId)
          const benchmark = get().benchmarks[`${question?.discipline || 'Clinical'}-IR`]
          const baseDuration = benchmark?.averageDuration || 150
          
          // Apply complexity factors
          const complexityScore = Math.random() * 30 + 50 // Simulated 50-80
          const adjustedDuration = Math.round(baseDuration * (1 + (complexityScore - 65) / 100))
          
          const estimatedCompletion = new Date(now.getTime() + adjustedDuration * 60000)
          
          questionPredictions[qId] = {
            questionId: qId,
            estimatedDuration: adjustedDuration,
            estimatedCompletion: estimatedCompletion.toISOString(),
            confidence: 0.75,
            complexityScore,
            factors: [
              { name: 'Historical average', impact: 'neutral', weight: 0.5, description: 'Based on similar questions', value: baseDuration },
              { name: 'Complexity adjustment', impact: complexityScore > 65 ? 'negative' : 'positive', weight: 0.3, description: 'Question complexity factor', value: complexityScore }
            ],
            dependencies: [],
            blockers: [],
            risks: []
          }
          
          totalEstimatedDuration += adjustedDuration
        })
        
        // Generate phase predictions
        const phases: CampaignPhase[] = ['initialization', 'draft-generation', 'quality-assessment', 'consistency-validation', 'refinement', 'final-review', 'packaging', 'complete']
        const phasePredictions: Record<CampaignPhase, PhasePrediction> = {} as any
        let phaseStart = now
        
        phases.forEach(phase => {
          const phaseDuration = phase === 'draft-generation' ? totalEstimatedDuration * 0.4 :
                               phase === 'refinement' ? totalEstimatedDuration * 0.25 :
                               phase === 'final-review' ? totalEstimatedDuration * 0.15 :
                               totalEstimatedDuration * 0.05
          
          const phaseEnd = new Date(phaseStart.getTime() + phaseDuration * 60000)
          
          phasePredictions[phase] = {
            phase,
            estimatedStart: phaseStart.toISOString(),
            estimatedEnd: phaseEnd.toISOString(),
            estimatedDuration: Math.round(phaseDuration),
            confidence: 0.7,
            parallelCapacity: phase === 'draft-generation' ? 5 : 1,
            bottlenecks: []
          }
          
          phaseStart = phaseEnd
        })
        
        // Calculate campaign completion
        const campaignCompletion: CompletionPrediction = {
          estimatedCompletion: phaseStart.toISOString(),
          confidenceRange: {
            optimistic: new Date(phaseStart.getTime() - totalEstimatedDuration * 60000 * 0.2).toISOString(),
            pessimistic: new Date(phaseStart.getTime() + totalEstimatedDuration * 60000 * 0.3).toISOString(),
            mostLikely: phaseStart.toISOString()
          },
          confidence: 0.72,
          factors: [
            { name: 'Team capacity', impact: 'neutral', weight: 0.3, description: 'Current team workload' },
            { name: 'Question complexity', impact: 'neutral', weight: 0.4, description: 'Average complexity of questions' }
          ]
        }
        
        // Generate risks
        const risks: ScheduleRisk[] = []
        if (campaign.config.deadline) {
          const deadline = new Date(campaign.config.deadline)
          const estimatedEnd = new Date(campaignCompletion.estimatedCompletion)
          if (estimatedEnd > deadline) {
            risks.push({
              id: generateId('risk'),
              type: 'deadline',
              severity: 'high',
              probability: 0.8,
              impact: 'Campaign may miss deadline',
              mitigation: 'Consider parallelizing more work or reducing scope',
              affectedQuestions: campaign.config.questionIds
            })
          }
        }
        
        // Generate optimizations
        const optimizations: ScheduleOptimization[] = [
          {
            id: generateId('opt'),
            type: 'parallelization',
            description: 'Generate drafts for multiple questions simultaneously',
            estimatedSavings: Math.round(totalEstimatedDuration * 0.2),
            effort: 'low',
            affectedQuestions: campaign.config.questionIds.slice(0, 3),
            tradeoffs: ['May reduce consistency across responses']
          }
        ]
        
        const prediction: SchedulePrediction = {
          id: generateId('prediction'),
          campaignId,
          generatedAt: now.toISOString(),
          campaignCompletion,
          questionPredictions,
          phasePredictions,
          risks,
          optimizations,
          overallConfidence: 0.72,
          methodology: 'Historical benchmarks + complexity analysis'
        }
        
        set(state => ({ predictions: { ...state.predictions, [campaignId]: prediction } }), false, 'generatePrediction')
        
        return prediction
      },
      
      getQuestionPrediction: (campaignId, questionId) => {
        const prediction = get().predictions[campaignId]
        return prediction?.questionPredictions[questionId] || null
      },
      
      getWorkloadDistribution: (campaignId) => {
        const collaborators = get().collaborators[campaignId] || []
        const assignments = get().assignments[campaignId] || []
        const prediction = get().predictions[campaignId]
        
        return collaborators.map(collab => {
          const collabAssignments = assignments.filter(a => a.assignedTo === collab.userId && a.status !== 'approved')
          const estimatedWorkload = collabAssignments.reduce((sum, a) => {
            const qPrediction = prediction?.questionPredictions[a.questionId]
            return sum + (qPrediction?.estimatedDuration || 120)
          }, 0)
          
          return {
            collaboratorId: collab.id,
            collaboratorName: collab.userName,
            assignedQuestions: collabAssignments.length,
            estimatedWorkload,
            currentCapacity: Math.min(100, Math.round((estimatedWorkload / 480) * 100)), // 8-hour day
            projectedCompletion: new Date(Date.now() + estimatedWorkload * 60000).toISOString(),
            overloaded: estimatedWorkload > 480,
            recommendations: estimatedWorkload > 480 ? ['Consider reassigning some questions'] : []
          }
        })
      },
      
      recordActualDuration: (questionId, duration) => {
        // In production, this would update benchmarks based on actual performance
        /* Duration recorded */
      },
      
      getOptimizations: (campaignId) => {
        const prediction = get().predictions[campaignId]
        return prediction?.optimizations || []
      },
      
      getBenchmark: (discipline, questionType) => {
        return get().benchmarks[`${discipline}-${questionType}`] || null
      }
    }),
    { name: 'CampaignEnhancements' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useAgencyProfiles = () => useCampaignEnhancements(state => state.agencyProfiles)

export const useFormattedPackage = (packageId: string) => useCampaignEnhancements(state => state.formattedPackages[packageId])

export const useCampaignTemplates = (category?: CampaignTemplateCategory) => {
  const templates = useCampaignEnhancements(state => state.templates)
  return useMemo(() => {
    const all = Object.values(templates)
    return category ? all.filter(t => t.category === category) : all
  }, [templates, category])
}

export const useCampaignCollaborators = (campaignId: string) => useCampaignEnhancements(state => state.collaborators[campaignId] || [])

export const useQuestionAssignments = (campaignId: string, userId?: string) => {
  const assignments = useCampaignEnhancements(state => state.assignments[campaignId] || [])
  return useMemo(() => userId ? assignments.filter(a => a.assignedTo === userId) : assignments, [assignments, userId])
}

export const usePendingReviews = (campaignId: string, userId: string) => {
  const requests = useCampaignEnhancements(state => state.reviewRequests[campaignId] || [])
  return useMemo(() => requests.filter(r => r.status === 'pending' && r.reviewers.some(rev => rev.userId === userId && rev.status === 'pending')), [requests, userId])
}

export const useResponseVersions = (questionId: string) => useCampaignEnhancements(state => state.responseVersions[questionId] || [])

export const useSchedulePrediction = (campaignId: string) => useCampaignEnhancements(state => state.predictions[campaignId])

export const useCollaborationActivity = (campaignId: string, limit = 50) => {
  const activity = useCampaignEnhancements(state => state.collaborationActivity)
  return useMemo(() => activity.filter(a => a.campaignId === campaignId).slice(-limit), [activity, campaignId, limit])
}
