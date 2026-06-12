
// ============================================================================
// HAQ Response Workflow Types - v71: Deep HAQ Response Capabilities
// ============================================================================
// Comprehensive response drafting, AI-assisted generation, multi-reviewer
// approval workflows, and submission sequence linking.
// ============================================================================

import type { HAQDiscipline, HAQSource, HAQPriority, HAQStatus } from '@/types/haq'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type ResponseDraftStatus = 
  | 'initial'           // Just created
  | 'drafting'          // Author working on it
  | 'ai-generating'     // AI generation in progress
  | 'ready-for-review'  // Submitted for review
  | 'in-review'         // Under reviewer review
  | 'revision-requested'// Returned for revisions
  | 'approved'          // All approvals obtained
  | 'finalized'         // Locked for submission
  | 'submitted'         // Included in submission
  | 'rejected'          // Rejected, needs restart
  | 'closed';           // HA accepted, archived

export type ApprovalRole = 
  | 'author'            // Primary drafter
  | 'sme-reviewer'      // Subject matter expert
  | 'discipline-lead'   // Discipline lead (CMC, Clinical, etc.)
  | 'regulatory-lead'   // Regulatory affairs lead
  | 'medical-director'  // Medical director (for clinical)
  | 'qa-reviewer'       // Quality assurance
  | 'legal-reviewer'    // Legal/compliance
  | 'executive'         // Executive sign-off

export type ApprovalDecision = 
  | 'pending'
  | 'approved'
  | 'approved-with-comments'
  | 'revision-requested'
  | 'rejected'
  | 'delegated'
  | 'abstained'

export type QualityDimension = 
  | 'completeness'      // All question aspects addressed
  | 'accuracy'          // Data and facts correct
  | 'clarity'           // Easy to understand
  | 'regulatory-tone'   // Appropriate regulatory language
  | 'evidence-support'  // Properly cited/supported
  | 'conciseness'       // Not overly verbose
  | 'cross-reference'   // Proper internal references
  | 'formatting'        // Proper formatting

export type AIGenerationMode = 
  | 'full-draft'        // Generate complete response
  | 'section-assist'    // Help with specific sections
  | 'enhancement'       // Improve existing content
  | 'regulatory-review' // Check regulatory compliance
  | 'citation-assist'   // Help find and format citations

// ============================================================================
// RESPONSE WORKSPACE
// ============================================================================

export interface ResponseWorkspace {
  id: string
  haqId: string
  questionNumber: string
  applicationId: string
  applicationNumber: string
  productId: string
  productName: string
  discipline: HAQDiscipline
  
  // Current draft
  currentDraftId: string | null
  drafts: ResponseDraft[]
  
  // Approval workflow
  approvalWorkflow: ApprovalWorkflow | null
  
  // AI assistance
  aiSessions: AIResponseSession[]
  
  // Quality tracking
  qualityAssessments: QualityAssessment[]
  currentQualityScore: number | null
  
  // Submission linking
  targetSequenceId: string | null
  targetSectionId: string | null // e.g., 'm1-12-1'
  submissionStatus: SubmissionLinkStatus
  
  // Metadata
  status: ResponseDraftStatus
  assignedTo: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
  dueDate: string
  
  // Collaboration
  collaborators: ResponseCollaborator[]
  comments: ResponseComment[]
  activityLog: WorkspaceActivity[]
}

export type SubmissionLinkStatus = 
  | 'not-linked'
  | 'linked-pending'
  | 'linked-ready'
  | 'linked-submitted'

// ============================================================================
// RESPONSE DRAFT
// ============================================================================

export interface ResponseDraft {
  id: string
  workspaceId: string
  version: number
  
  // Content
  content: string
  sections: ResponseSection[]
  
  // Generation info
  generationMethod: 'manual' | 'ai-assisted' | 'template-based' | 'imported'
  aiGenerationConfig?: AIGenerationConfig
  templateId?: string
  
  // Quality
  wordCount: number
  qualityScore: number | null
  qualityIssues: QualityIssue[]
  
  // Attachments and references
  attachments: ResponseAttachment[]
  citations: ResponseCitation[]
  crossReferences: CrossReference[]
  
  // Status
  status: ResponseDraftStatus
  
  // Authorship
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  
  // Versioning
  baseVersionId: string | null // If created from another draft
  changesSummary: string | null
}

export interface ResponseSection {
  id: string
  title: string
  content: string
  order: number
  type: 'introduction' | 'response-body' | 'data-summary' | 'conclusion' | 'references' | 'custom'
  aiGenerated: boolean
  qualityScore: number | null
  issues: QualityIssue[]
}

export interface ResponseAttachment {
  id: string
  name: string
  fileName: string
  fileType: string
  fileSize: number
  description: string
  ctdReference?: string // e.g., "See Module 3.2.S.4.1"
  uploadedBy: string
  uploadedAt: string
}

export interface ResponseCitation {
  id: string
  referenceType: 'ctd-section' | 'study' | 'guidance' | 'publication' | 'internal-doc'
  reference: string
  title: string
  section?: string
  pageRange?: string
  inlinePosition?: number // Character position in content
  verified: boolean
}

export interface CrossReference {
  id: string
  targetHAQId: string
  targetQuestionNumber: string
  referenceType: 'supports' | 'related-to' | 'supersedes' | 'references'
  description: string
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

export interface ApprovalWorkflow {
  id: string
  workspaceId: string
  draftId: string
  
  // Workflow configuration
  workflowType: 'standard' | 'expedited' | 'critical' | 'custom'
  requiredApprovals: ApprovalStep[]
  optionalApprovals: ApprovalStep[]
  
  // Status
  status: 'pending' | 'in-progress' | 'approved' | 'rejected' | 'cancelled'
  currentStepIndex: number
  
  // Parallel vs Sequential
  executionMode: 'sequential' | 'parallel' | 'hybrid'
  
  // Deadlines
  startedAt: string | null
  targetCompletionDate: string
  completedAt: string | null
  
  // Escalation
  escalationRules: EscalationRule[]
  escalations: Escalation[]
}

export interface ApprovalStep {
  id: string
  order: number
  role: ApprovalRole
  assigneeId: string | null
  assigneeName: string | null
  required: boolean
  parallelWith: string[] // IDs of steps that can run in parallel
  
  // Status
  status: ApprovalDecision
  decidedAt: string | null
  
  // Feedback
  comments: string | null
  requestedChanges: RequestedChange[]
  
  // Delegation
  delegatedTo: string | null
  delegatedBy: string | null
  delegatedAt: string | null
  
  // Deadlines
  dueDate: string | null
  reminderSent: boolean
}

export interface RequestedChange {
  id: string
  description: string
  section: string | null
  priority: 'must-fix' | 'should-fix' | 'consider'
  resolved: boolean
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface EscalationRule {
  id: string
  triggerType: 'overdue' | 'no-response' | 'repeated-rejection'
  triggerDays: number
  escalateTo: string
  notifyOriginal: boolean
}

export interface Escalation {
  id: string
  ruleId: string
  triggeredAt: string
  escalatedTo: string
  reason: string
  resolved: boolean
}

// ============================================================================
// AI ASSISTANCE
// ============================================================================

export interface AIGenerationConfig {
  mode: AIGenerationMode
  model: string
  temperature: number
  maxTokens: number
  
  // Context
  includeQuestionContext: boolean
  includeSimilarResponses: boolean
  includeGuidanceDocuments: boolean
  includeProductContext: boolean
  
  // Style
  responseStyle: 'formal' | 'technical' | 'balanced'
  targetLength: 'concise' | 'moderate' | 'comprehensive'
  
  // Constraints
  mustIncludeTopics: string[]
  mustCiteSources: string[]
  avoidTopics: string[]
  
  // Regulatory focus
  regulatoryFramework: string[] // e.g., ['ICH E9', 'FDA Guidance 2021']
}

export interface AIResponseSession {
  id: string
  workspaceId: string
  mode: AIGenerationMode
  config: AIGenerationConfig
  
  // Input/Output
  prompt: string
  generatedContent: string | null
  sections: GeneratedSection[]
  
  // Quality
  qualityScore: number | null
  suggestions: AISuggestion[]
  
  // Status
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt: string | null
  error: string | null
  
  // Usage
  tokensUsed: number
  generationTimeMs: number
  
  // Feedback
  userRating: number | null // 1-5
  userFeedback: string | null
  accepted: boolean
}

export interface GeneratedSection {
  id: string
  title: string
  content: string
  confidence: number // 0-100
  sources: string[]
  needsReview: boolean
  reviewNotes: string | null
}

export interface AISuggestion {
  id: string
  type: 'improvement' | 'addition' | 'deletion' | 'restructure' | 'citation'
  target: string // Section ID or "overall"
  currentContent: string | null
  suggestedContent: string
  rationale: string
  confidence: number
  applied: boolean
  dismissed: boolean
}

// ============================================================================
// QUALITY ASSESSMENT
// ============================================================================

export interface QualityAssessment {
  id: string
  workspaceId: string
  draftId: string
  assessmentType: 'automated' | 'ai-review' | 'manual-review'
  
  // Scores
  overallScore: number // 0-100
  dimensionScores: Record<QualityDimension, number>
  
  // Issues
  issues: QualityIssue[]
  
  // Metadata
  assessedAt: string
  assessedBy: string | null
}

export interface QualityIssue {
  id: string
  dimension: QualityDimension
  severity: 'error' | 'warning' | 'info' | 'suggestion'
  title: string
  description: string
  location: IssueLocation | null
  suggestedFix: string | null
  autoFixable: boolean
  resolved: boolean
  resolvedAt: string | null
}

export interface IssueLocation {
  sectionId: string | null
  sectionTitle: string | null
  startOffset: number
  endOffset: number
  excerpt: string
}

// ============================================================================
// COLLABORATION
// ============================================================================

export interface ResponseCollaborator {
  id: string
  userId: string
  userName: string
  role: 'author' | 'reviewer' | 'contributor' | 'observer'
  permissions: CollaboratorPermission[]
  addedAt: string
  addedBy: string
  lastActiveAt: string | null
}

export type CollaboratorPermission = 
  | 'edit'
  | 'comment'
  | 'suggest'
  | 'approve'
  | 'manage-workflow'
  | 'view-only'

export interface ResponseComment {
  id: string
  workspaceId: string
  draftId: string | null
  authorId: string
  authorName: string
  
  // Content
  content: string
  
  // Location
  targetType: 'overall' | 'section' | 'inline'
  sectionId: string | null
  selectionStart: number | null
  selectionEnd: number | null
  
  // Threading
  parentCommentId: string | null
  replies: ResponseComment[]
  
  // Status
  status: 'open' | 'resolved' | 'wont-fix'
  resolvedBy: string | null
  resolvedAt: string | null
  
  // Metadata
  createdAt: string
  updatedAt: string
  edited: boolean
}

export interface WorkspaceActivity {
  id: string
  workspaceId: string
  activityType: WorkspaceActivityType
  actorId: string
  actorName: string
  description: string
  details: Record<string, unknown>
  timestamp: string
}

export type WorkspaceActivityType = 
  | 'draft-created'
  | 'draft-updated'
  | 'ai-generation-started'
  | 'ai-generation-completed'
  | 'quality-assessed'
  | 'submitted-for-review'
  | 'approval-requested'
  | 'approval-granted'
  | 'revision-requested'
  | 'comment-added'
  | 'collaborator-added'
  | 'linked-to-submission'
  | 'status-changed'

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchResponseOperation {
  id: string
  operationType: 'generate' | 'assess' | 'submit-for-review' | 'link-to-submission'
  workspaceIds: string[]
  config: BatchOperationConfig
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  results: BatchOperationResult[]
  startedAt: string
  completedAt: string | null
  error: string | null
}

export interface BatchOperationConfig {
  parallelism: number
  retryOnFailure: boolean
  maxRetries: number
  stopOnError: boolean
  notifyOnComplete: boolean
}

export interface BatchOperationResult {
  workspaceId: string
  success: boolean
  resultId: string | null
  error: string | null
  duration: number
}

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

export interface ApprovalWorkflowTemplate {
  id: string
  name: string
  description: string
  discipline: HAQDiscipline | 'all'
  priority: HAQPriority | 'all'
  
  // Steps
  steps: ApprovalStepTemplate[]
  
  // Configuration
  executionMode: 'sequential' | 'parallel' | 'hybrid'
  defaultDeadlineDays: number
  escalationRules: EscalationRule[]
  
  // Usage
  isDefault: boolean
  usageCount: number
  lastUsedAt: string | null
  
  // Metadata
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalStepTemplate {
  order: number
  role: ApprovalRole
  required: boolean
  parallelWith: number[] // Orders of parallel steps
  defaultDeadlineDays: number
}

// ============================================================================
// SUBMISSION LINKING
// ============================================================================

export interface SubmissionLink {
  id: string
  workspaceId: string
  draftId: string
  
  // Target
  sequenceBuildId: string
  sequenceNumber: string
  applicationNumber: string
  
  // CTD placement
  ctdSection: string // e.g., 'm1-12-1'
  ctdSectionTitle: string
  documentTitle: string
  fileName: string
  
  // Status
  status: 'pending' | 'document-generating' | 'document-ready' | 'assigned' | 'validated' | 'submitted'
  
  // Document generation
  generatedDocumentId: string | null
  pdfPath: string | null
  checksum: string | null
  
  // Timestamps
  linkedAt: string
  linkedBy: string
  lastUpdatedAt: string
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

export interface HAQResponseState {
  // Workspaces
  workspaces: Record<string, ResponseWorkspace>
  selectedWorkspaceId: string | null
  
  // Drafts (indexed separately for performance)
  drafts: Record<string, ResponseDraft>
  
  // Workflows
  workflows: Record<string, ApprovalWorkflow>
  workflowTemplates: Record<string, ApprovalWorkflowTemplate>
  
  // AI Sessions
  aiSessions: Record<string, AIResponseSession>
  activeAISessionId: string | null
  
  // Quality
  assessments: Record<string, QualityAssessment>
  
  // Submission Links
  submissionLinks: Record<string, SubmissionLink>
  
  // Batch operations
  batchOperations: Record<string, BatchResponseOperation>
  
  // UI State
  view: HAQResponseView
  filters: HAQResponseFilters
  
  // Loading states
  isLoading: boolean
  isGenerating: boolean
  isAssessing: boolean
  error: string | null
}

export type HAQResponseView = 
  | 'list'
  | 'workspace'
  | 'approval'
  | 'quality'
  | 'submission'
  | 'batch'

export interface HAQResponseFilters {
  status: ResponseDraftStatus | 'all'
  discipline: HAQDiscipline | 'all'
  assignee: string | 'all' | 'unassigned'
  dueWithin: number | null // days
  applicationId: string | 'all'
  hasAIAssist: boolean | null
  qualityScoreMin: number | null
  searchQuery: string
}

export interface HAQResponseActions {
  // Workspace management
  createWorkspace: (haqId: string, config: WorkspaceConfig) => ResponseWorkspace
  selectWorkspace: (id: string | null) => void
  updateWorkspace: (id: string, updates: Partial<ResponseWorkspace>) => void
  deleteWorkspace: (id: string) => void
  
  // Draft management
  createDraft: (workspaceId: string, config: DraftConfig) => ResponseDraft
  updateDraft: (id: string, updates: Partial<ResponseDraft>) => void
  selectDraft: (workspaceId: string, draftId: string) => void
  createDraftVersion: (draftId: string, changesSummary: string) => ResponseDraft
  deleteDraft: (id: string) => void
  
  // AI Generation
  startAIGeneration: (workspaceId: string, config: AIGenerationConfig) => Promise<AIResponseSession>
  cancelAIGeneration: (sessionId: string) => void
  applyAISuggestion: (sessionId: string, suggestionId: string) => void
  dismissAISuggestion: (sessionId: string, suggestionId: string) => void
  rateAISession: (sessionId: string, rating: number, feedback?: string) => void
  
  // Quality Assessment
  runQualityAssessment: (workspaceId: string, draftId: string) => Promise<QualityAssessment>
  resolveQualityIssue: (assessmentId: string, issueId: string) => void
  autoFixIssues: (assessmentId: string, issueIds: string[]) => void
  
  // Approval Workflow
  initializeWorkflow: (workspaceId: string, templateId?: string) => ApprovalWorkflow
  submitForReview: (workspaceId: string) => void
  recordApprovalDecision: (
    workflowId: string, 
    stepId: string, 
    decision: ApprovalDecision, 
    comments?: string,
    requestedChanges?: RequestedChange[]
  ) => void
  delegateApproval: (workflowId: string, stepId: string, delegateTo: string) => void
  escalateApproval: (workflowId: string, stepId: string, reason: string) => void
  
  // Submission Linking
  linkToSubmission: (workspaceId: string, config: SubmissionLinkConfig) => SubmissionLink
  updateSubmissionLink: (linkId: string, updates: Partial<SubmissionLink>) => void
  unlinkFromSubmission: (linkId: string) => void
  generateSubmissionDocument: (linkId: string) => Promise<string> // Returns document path
  
  // Collaboration
  addCollaborator: (workspaceId: string, userId: string, role: ResponseCollaborator['role']) => void
  removeCollaborator: (workspaceId: string, collaboratorId: string) => void
  addComment: (workspaceId: string, draftId: string | null, comment: Omit<ResponseComment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>) => ResponseComment
  resolveComment: (commentId: string) => void
  
  // Batch operations
  startBatchOperation: (operation: Omit<BatchResponseOperation, 'id' | 'status' | 'progress' | 'results' | 'startedAt' | 'completedAt' | 'error'>) => BatchResponseOperation
  cancelBatchOperation: (operationId: string) => void
  
  // Filters & View
  setView: (view: HAQResponseView) => void
  setFilters: (filters: Partial<HAQResponseFilters>) => void
  clearFilters: () => void
  
  // Computed
  getWorkspacesByHAQ: (haqId: string) => ResponseWorkspace[]
  getWorkspacesByApplication: (applicationId: string) => ResponseWorkspace[]
  getPendingApprovals: (userId: string) => ApprovalStep[]
  getOverdueWorkspaces: () => ResponseWorkspace[]
  getQualityStats: () => QualityStats
  getSubmissionReadiness: (sequenceBuildId: string) => SubmissionReadinessReport
}

// ============================================================================
// CONFIG TYPES
// ============================================================================

export interface WorkspaceConfig {
  haqId: string
  assignTo?: string
  assignToName?: string
  targetSequenceId?: string
  dueDate?: string
  workflowTemplateId?: string
}

export interface DraftConfig {
  generationMethod: ResponseDraft['generationMethod']
  templateId?: string
  aiConfig?: AIGenerationConfig
  initialContent?: string
}

export interface SubmissionLinkConfig {
  sequenceBuildId: string
  ctdSection: string
  documentTitle: string
}

// ============================================================================
// COMPUTED TYPES
// ============================================================================

export interface QualityStats {
  totalWorkspaces: number
  averageQualityScore: number
  scoreDistribution: {
    excellent: number  // 90+
    good: number       // 80-89
    acceptable: number // 70-79
    needsWork: number  // 60-69
    poor: number       // <60
  }
  commonIssues: Array<{
    dimension: QualityDimension
    count: number
    percentage: number
  }>
  aiAssistUsage: {
    total: number
    averageRating: number
    acceptanceRate: number
  }
}

export interface SubmissionReadinessReport {
  sequenceBuildId: string
  linkedResponses: number
  readyResponses: number
  pendingResponses: number
  approvalsPending: number
  qualityIssues: number
  isReady: boolean
  blockers: string[]
  estimatedCompletionDate: string | null
}
