// Submission Thread Data - v0.6.7
// "Database locked. Document generated. Submission assembled. One thread, zero handoffs."
// Full Thread View - Complete data-to-submission provenance chain

// ============================================================================
// SUBMISSION THREAD TYPES
// ============================================================================

export type ThreadStageType = 
  | 'data-source'       // Clinical database / source dataset
  | 'generation'        // AI document generation
  | 'authoring'         // Document authoring & review
  | 'integration'       // eCTD slot integration
  | 'validation'        // Submission validation
  | 'submission';       // Final submission

export type ThreadStatus = 
  | 'completed'         // Stage completed successfully
  | 'in-progress'       // Currently active
  | 'pending'           // Waiting for previous stage
  | 'blocked'           // Cannot proceed
  | 'skipped';          // Bypassed (e.g., manual document)

export interface ThreadDataSource {
  id: string;
  datasetName: string;
  datasetType: 'SDTM' | 'ADaM' | 'TLF' | 'Raw' | 'External';
  recordCount: number;
  lockDate?: string;
  lockStatus: 'locked' | 'unlocked' | 'pending';
  validationStatus: 'passed' | 'warnings' | 'failed';
  studyId: string;
  studyName: string;
  lastUpdated: string;
}

export interface ThreadGenerationStage {
  id: string;
  jobId: string;
  triggerType: 'database-lock' | 'interim-analysis' | 'safety-update' | 'protocol-amendment' | 'manual';
  triggerEvent: string;
  startedAt: string;
  completedAt?: string;
  status: ThreadStatus;
  sectionsGenerated: number;
  tablesGenerated: number;
  figuresGenerated: number;
  confidenceScore: number;
  automationRate: number;
  generatedBy: 'ai' | 'template' | 'hybrid';
  highlightedAreas: string[];
  reviewNotes?: string;
}

export interface ThreadAuthoringStage {
  id: string;
  documentId: string;
  documentVersion: string;
  authoringStarted: string;
  lastEdited: string;
  status: ThreadStatus;
  currentOwner: string;
  reviewCycle: number;
  reviewers: { name: string; role: string; status: 'pending' | 'approved' | 'changes-requested'; completedAt?: string }[];
  approvedBy?: string;
  approvedAt?: string;
  wordCount: number;
  pageCount: number;
  manualEdits: number;
  aiSuggestionsAccepted: number;
  aiSuggestionsRejected: number;
}

export interface ThreadIntegrationStage {
  id: string;
  slotId: string;
  ctdModule: string;
  ctdSection: string;
  sectionTitle: string;
  targetSequence: string;
  applicationNumber: string;
  status: ThreadStatus;
  integrationAction: 'auto-placed' | 'manual-placed' | 'pending';
  integratedAt?: string;
  integratedBy?: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  validationStatus: 'passed' | 'warnings' | 'failed' | 'pending';
  validationMessages: string[];
}

export interface ThreadValidationStage {
  id: string;
  validationType: 'structure' | 'content' | 'technical' | 'regional' | 'full';
  status: ThreadStatus;
  startedAt?: string;
  completedAt?: string;
  checksRun: number;
  checksPassed: number;
  checksWarning: number;
  checksFailed: number;
  criticalIssues: string[];
  warnings: string[];
}

export interface SubmissionThread {
  id: string;
  threadName: string;
  documentTitle: string;
  documentType: string;
  productId: string;
  productName: string;
  studyId: string;
  studyName: string;
  
  // Timeline
  threadStarted: string;
  threadCompleted?: string;
  estimatedCompletion?: string;
  currentStage: ThreadStageType;
  overallStatus: 'active' | 'completed' | 'blocked' | 'paused';
  
  // Stages
  dataSources: ThreadDataSource[];
  generation?: ThreadGenerationStage;
  authoring: ThreadAuthoringStage;
  integration: ThreadIntegrationStage;
  validation?: ThreadValidationStage;
  
  // Metrics
  totalDuration?: string;
  automationScore: number;         // 0-100, how much was automated
  touchPoints: number;             // Number of human interventions
  handoffs: number;                // Cross-system handoffs (should be 0 in Ligature!)
  
  // Audit trail
  milestones: ThreadMilestone[];
}

export interface ThreadMilestone {
  id: string;
  timestamp: string;
  stage: ThreadStageType;
  event: string;
  description: string;
  actor: 'system' | 'user';
  actorName?: string;
  automated: boolean;
  duration?: string;              // Time since previous milestone
}

export interface ThreadSummary {
  totalActiveThreads: number;
  threadsCompletedThisWeek: number;
  averageAutomationScore: number;
  averageHandoffs: number;
  documentsInPipeline: number;
  blockedThreads: number;
  upcomingCompletions: { threadId: string; documentTitle: string; expectedDate: string }[];
}

// ============================================================================
// GOLDEN PATH DATA - NEXAVANT CSR EFFICACY THREAD
// ============================================================================

// The "hero" thread: CSR Section 11 (Efficacy) - complete journey
const csrEfficacyMilestones: ThreadMilestone[] = [
  {
    id: 'ms-001',
    timestamp: '2025-12-28T09:00:00Z',
    stage: 'data-source',
    event: 'Database Lock Initiated',
    description: 'LIG-301 study database lock process started. Final QC checks underway.',
    actor: 'user',
    actorName: 'Dr. James Wilson',
    automated: false,
  },
  {
    id: 'ms-002',
    timestamp: '2025-12-28T14:30:00Z',
    stage: 'data-source',
    event: 'Database Lock Completed',
    description: 'LIG-301 database locked. 847 subjects, 127,650 data points verified.',
    actor: 'system',
    automated: true,
    duration: '5h 30m',
  },
  {
    id: 'ms-003',
    timestamp: '2025-12-28T14:31:00Z',
    stage: 'generation',
    event: 'Document Generation Triggered',
    description: 'Database lock event triggered automatic CSR Section 11 generation.',
    actor: 'system',
    automated: true,
    duration: '1m',
  },
  {
    id: 'ms-004',
    timestamp: '2025-12-28T15:45:00Z',
    stage: 'generation',
    event: 'AI Generation Completed',
    description: 'CSR efficacy sections generated. 4 sections, 8 tables, 3 figures. 87% confidence.',
    actor: 'system',
    automated: true,
    duration: '1h 14m',
  },
  {
    id: 'ms-005',
    timestamp: '2025-12-28T16:00:00Z',
    stage: 'authoring',
    event: 'SME Review Started',
    description: 'Document queued for SME review by Dr. Sarah Chen.',
    actor: 'system',
    automated: true,
    duration: '15m',
  },
  {
    id: 'ms-006',
    timestamp: '2025-12-29T11:30:00Z',
    stage: 'authoring',
    event: 'Statistical Review Complete',
    description: 'Dr. Michael Torres approved statistical sections. Minor notation updates applied.',
    actor: 'user',
    actorName: 'Dr. Michael Torres',
    automated: false,
    duration: '19h 30m',
  },
  {
    id: 'ms-007',
    timestamp: '2025-12-30T15:00:00Z',
    stage: 'authoring',
    event: 'Medical Review Complete',
    description: 'Dr. Sarah Chen approved clinical interpretation. Ready for QC.',
    actor: 'user',
    actorName: 'Dr. Sarah Chen',
    automated: false,
    duration: '1d 3h 30m',
  },
  {
    id: 'ms-008',
    timestamp: '2025-12-31T09:45:00Z',
    stage: 'authoring',
    event: 'QC Review Complete',
    description: 'Quality check passed. Document finalized version 2.1.',
    actor: 'user',
    actorName: 'Jennifer Martinez',
    automated: false,
    duration: '18h 45m',
  },
  {
    id: 'ms-009',
    timestamp: '2026-01-02T14:30:00Z',
    stage: 'authoring',
    event: 'Document Approved',
    description: 'Final approval granted. Document ready for eCTD integration.',
    actor: 'user',
    actorName: 'Dr. Sarah Chen',
    automated: false,
    duration: '2d 4h 45m',
  },
  {
    id: 'ms-010',
    timestamp: '2026-01-02T14:31:00Z',
    stage: 'integration',
    event: 'Integration Queued',
    description: 'Document queued for eCTD slot 5.3.5.1. Auto-integration eligible.',
    actor: 'system',
    automated: true,
    duration: '1m',
  },
  {
    id: 'ms-011',
    timestamp: '2026-01-02T14:35:00Z',
    stage: 'integration',
    event: 'Auto-Integrated to eCTD',
    description: 'Document placed in Module 5.3.5.1 of Sequence 0004. Submission readiness: 81%.',
    actor: 'system',
    automated: true,
    duration: '4m',
  },
  {
    id: 'ms-012',
    timestamp: '2026-01-02T14:36:00Z',
    stage: 'validation',
    event: 'Validation Started',
    description: 'Technical validation initiated for integrated document.',
    actor: 'system',
    automated: true,
    duration: '1m',
  },
  {
    id: 'ms-013',
    timestamp: '2026-01-02T14:40:00Z',
    stage: 'validation',
    event: 'Validation Passed',
    description: 'All 42 technical checks passed. Document ready for submission.',
    actor: 'system',
    automated: true,
    duration: '4m',
  },
];

const csrEfficacyDataSources: ThreadDataSource[] = [
  {
    id: 'ds-adtte-301',
    datasetName: 'ADTTE',
    datasetType: 'ADaM',
    recordCount: 847,
    lockDate: '2025-12-28T14:30:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
    studyId: 'LIG-301',
    studyName: 'CLARITY-1 Phase 3',
    lastUpdated: '2025-12-28T14:30:00Z',
  },
  {
    id: 'ds-adeff-301',
    datasetName: 'ADEFF',
    datasetType: 'ADaM',
    recordCount: 3388,
    lockDate: '2025-12-28T14:30:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
    studyId: 'LIG-301',
    studyName: 'CLARITY-1 Phase 3',
    lastUpdated: '2025-12-28T14:30:00Z',
  },
  {
    id: 'ds-adsl-301',
    datasetName: 'ADSL',
    datasetType: 'ADaM',
    recordCount: 847,
    lockDate: '2025-12-28T14:30:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
    studyId: 'LIG-301',
    studyName: 'CLARITY-1 Phase 3',
    lastUpdated: '2025-12-28T14:30:00Z',
  },
];

const csrEfficacyGeneration: ThreadGenerationStage = {
  id: 'gen-csr-eff-001',
  jobId: 'gen-job-001',
  triggerType: 'database-lock',
  triggerEvent: 'LIG-301 Database Lock',
  startedAt: '2025-12-28T14:31:00Z',
  completedAt: '2025-12-28T15:45:00Z',
  status: 'completed',
  sectionsGenerated: 4,
  tablesGenerated: 8,
  figuresGenerated: 3,
  confidenceScore: 87,
  automationRate: 78,
  generatedBy: 'ai',
  highlightedAreas: [
    'Primary endpoint conclusion requires medical interpretation',
    'Subgroup analysis narrative flagged for statistical review',
  ],
  reviewNotes: 'High quality generation. Minor updates to Kaplan-Meier description.',
};

const csrEfficacyAuthoring: ThreadAuthoringStage = {
  id: 'auth-csr-eff-001',
  documentId: 'doc-csr-11-efficacy',
  documentVersion: '2.1',
  authoringStarted: '2025-12-28T16:00:00Z',
  lastEdited: '2026-01-02T14:30:00Z',
  status: 'completed',
  currentOwner: 'Dr. Sarah Chen',
  reviewCycle: 2,
  reviewers: [
    { name: 'Dr. Michael Torres', role: 'Statistical Reviewer', status: 'approved', completedAt: '2025-12-29T11:30:00Z' },
    { name: 'Dr. Sarah Chen', role: 'Medical Reviewer', status: 'approved', completedAt: '2025-12-30T15:00:00Z' },
    { name: 'Jennifer Martinez', role: 'QC Reviewer', status: 'approved', completedAt: '2025-12-31T09:45:00Z' },
  ],
  approvedBy: 'Dr. Sarah Chen',
  approvedAt: '2026-01-02T14:30:00Z',
  wordCount: 12450,
  pageCount: 28,
  manualEdits: 23,
  aiSuggestionsAccepted: 156,
  aiSuggestionsRejected: 12,
};

const csrEfficacyIntegration: ThreadIntegrationStage = {
  id: 'int-csr-eff-001',
  slotId: 'slot-5351-001',
  ctdModule: 'm5',
  ctdSection: '5.3.5.1',
  sectionTitle: 'Reports of Controlled Clinical Studies',
  targetSequence: '0004',
  applicationNumber: 'NDA-214987',
  status: 'completed',
  integrationAction: 'auto-placed',
  integratedAt: '2026-01-02T14:35:00Z',
  integratedBy: 'System (Auto-Integration)',
  operation: 'new',
  validationStatus: 'passed',
  validationMessages: [],
};

const csrEfficacyValidation: ThreadValidationStage = {
  id: 'val-csr-eff-001',
  validationType: 'full',
  status: 'completed',
  startedAt: '2026-01-02T14:36:00Z',
  completedAt: '2026-01-02T14:40:00Z',
  checksRun: 42,
  checksPassed: 42,
  checksWarning: 0,
  checksFailed: 0,
  criticalIssues: [],
  warnings: [],
};

// The hero thread - CSR Efficacy complete journey
export const csrEfficacyThread: SubmissionThread = {
  id: 'thread-csr-eff-001',
  threadName: 'CSR Efficacy → Module 5.3.5.1',
  documentTitle: 'CSR Section 11 - Efficacy Results',
  documentType: 'csr-efficacy',
  productId: 'prod-lig-2847',
  productName: 'Nexavant (LIG-2847)',
  studyId: 'LIG-301',
  studyName: 'CLARITY-1 Phase 3',
  
  threadStarted: '2025-12-28T09:00:00Z',
  threadCompleted: '2026-01-02T14:40:00Z',
  currentStage: 'validation',
  overallStatus: 'completed',
  
  dataSources: csrEfficacyDataSources,
  generation: csrEfficacyGeneration,
  authoring: csrEfficacyAuthoring,
  integration: csrEfficacyIntegration,
  validation: csrEfficacyValidation,
  
  totalDuration: '5d 5h 40m',
  automationScore: 82,
  touchPoints: 4,
  handoffs: 0,
  
  milestones: csrEfficacyMilestones,
};

// ============================================================================
// ADDITIONAL THREADS - Different stages for variety
// ============================================================================

// Module 2.7.3 - Ready for integration (just approved)
const m273Milestones: ThreadMilestone[] = [
  {
    id: 'ms-273-001',
    timestamp: '2025-12-30T10:00:00Z',
    stage: 'data-source',
    event: 'Source Data Ready',
    description: 'CSR efficacy data available for summary generation.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-273-002',
    timestamp: '2025-12-30T10:05:00Z',
    stage: 'generation',
    event: 'Summary Generation Started',
    description: 'AI generating Module 2.7.3 clinical efficacy summary.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-273-003',
    timestamp: '2025-12-30T11:30:00Z',
    stage: 'generation',
    event: 'Generation Complete',
    description: '22-page summary generated. 91% confidence score.',
    actor: 'system',
    automated: true,
    duration: '1h 25m',
  },
  {
    id: 'ms-273-004',
    timestamp: '2026-01-01T09:00:00Z',
    stage: 'authoring',
    event: 'Review Started',
    description: 'Medical writing review initiated.',
    actor: 'user',
    actorName: 'Dr. Sarah Chen',
    automated: false,
  },
  {
    id: 'ms-273-005',
    timestamp: '2026-01-02T16:00:00Z',
    stage: 'authoring',
    event: 'Document Approved',
    description: 'Module 2.7.3 approved. Ready for eCTD integration.',
    actor: 'user',
    actorName: 'Dr. Michael Torres',
    automated: false,
    duration: '1d 7h',
  },
  {
    id: 'ms-273-006',
    timestamp: '2026-01-02T16:01:00Z',
    stage: 'integration',
    event: 'Queued for Integration',
    description: 'Document queued for slot 2.7.3. Awaiting user action.',
    actor: 'system',
    automated: true,
    duration: '1m',
  },
];

export const module273Thread: SubmissionThread = {
  id: 'thread-m273-001',
  threadName: 'Clinical Efficacy Summary → Module 2.7.3',
  documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
  documentType: 'module-27-3',
  productId: 'prod-lig-2847',
  productName: 'Nexavant (LIG-2847)',
  studyId: 'LIG-301',
  studyName: 'CLARITY-1 Phase 3',
  
  threadStarted: '2025-12-30T10:00:00Z',
  currentStage: 'integration',
  overallStatus: 'active',
  
  dataSources: [csrEfficacyDataSources[0], csrEfficacyDataSources[1]],
  generation: {
    id: 'gen-m273-001',
    jobId: 'gen-job-003',
    triggerType: 'manual',
    triggerEvent: 'CSR Efficacy Completion',
    startedAt: '2025-12-30T10:05:00Z',
    completedAt: '2025-12-30T11:30:00Z',
    status: 'completed',
    sectionsGenerated: 6,
    tablesGenerated: 6,
    figuresGenerated: 2,
    confidenceScore: 91,
    automationRate: 85,
    generatedBy: 'ai',
    highlightedAreas: ['Cross-study comparison requires SME verification'],
  },
  authoring: {
    id: 'auth-m273-001',
    documentId: 'doc-m273',
    documentVersion: '1.0',
    authoringStarted: '2025-12-30T11:30:00Z',
    lastEdited: '2026-01-02T16:00:00Z',
    status: 'completed',
    currentOwner: 'Dr. Michael Torres',
    reviewCycle: 1,
    reviewers: [
      { name: 'Dr. Michael Torres', role: 'Medical Reviewer', status: 'approved', completedAt: '2026-01-02T16:00:00Z' },
    ],
    approvedBy: 'Dr. Michael Torres',
    approvedAt: '2026-01-02T16:00:00Z',
    wordCount: 8500,
    pageCount: 22,
    manualEdits: 8,
    aiSuggestionsAccepted: 92,
    aiSuggestionsRejected: 3,
  },
  integration: {
    id: 'int-m273-001',
    slotId: 'slot-273-001',
    ctdModule: 'm2',
    ctdSection: '2.7.3',
    sectionTitle: 'Summary of Clinical Efficacy',
    targetSequence: '0004',
    applicationNumber: 'NDA-214987',
    status: 'in-progress',
    integrationAction: 'pending',
    operation: 'new',
    validationStatus: 'pending',
    validationMessages: [],
  },
  
  automationScore: 88,
  touchPoints: 2,
  handoffs: 0,
  
  milestones: m273Milestones,
};

// Module 2.7.4 - In authoring (blocked waiting for CSR safety)
const m274Milestones: ThreadMilestone[] = [
  {
    id: 'ms-274-001',
    timestamp: '2025-12-30T14:00:00Z',
    stage: 'data-source',
    event: 'Safety Data Ready',
    description: 'ADAE and ADLB datasets locked and available.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-274-002',
    timestamp: '2025-12-30T14:15:00Z',
    stage: 'generation',
    event: 'Generation Started',
    description: 'AI generating Module 2.7.4 safety summary.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-274-003',
    timestamp: '2025-12-30T16:00:00Z',
    stage: 'generation',
    event: 'Generation Partially Complete',
    description: '70% generated. Awaiting CSR Section 12 completion for final sections.',
    actor: 'system',
    automated: true,
    duration: '1h 45m',
  },
  {
    id: 'ms-274-004',
    timestamp: '2026-01-02T10:00:00Z',
    stage: 'authoring',
    event: 'Authoring In Progress',
    description: 'Document 65% complete. Blocked on CSR safety section.',
    actor: 'user',
    actorName: 'Dr. Emily Watson',
    automated: false,
  },
];

export const module274Thread: SubmissionThread = {
  id: 'thread-m274-001',
  threadName: 'Clinical Safety Summary → Module 2.7.4',
  documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
  documentType: 'module-27-4',
  productId: 'prod-lig-2847',
  productName: 'Nexavant (LIG-2847)',
  studyId: 'LIG-301',
  studyName: 'CLARITY-1 Phase 3',
  
  threadStarted: '2025-12-30T14:00:00Z',
  currentStage: 'authoring',
  overallStatus: 'blocked',
  
  dataSources: [
    {
      id: 'ds-adae-301',
      datasetName: 'ADAE',
      datasetType: 'ADaM',
      recordCount: 2847,
      lockDate: '2025-12-28T14:30:00Z',
      lockStatus: 'locked',
      validationStatus: 'passed',
      studyId: 'LIG-301',
      studyName: 'CLARITY-1 Phase 3',
      lastUpdated: '2025-12-28T14:30:00Z',
    },
    {
      id: 'ds-adlb-301',
      datasetName: 'ADLB',
      datasetType: 'ADaM',
      recordCount: 127650,
      lockDate: '2025-12-28T14:30:00Z',
      lockStatus: 'locked',
      validationStatus: 'passed',
      studyId: 'LIG-301',
      studyName: 'CLARITY-1 Phase 3',
      lastUpdated: '2025-12-28T14:30:00Z',
    },
  ],
  generation: {
    id: 'gen-m274-001',
    jobId: 'gen-job-004',
    triggerType: 'database-lock',
    triggerEvent: 'LIG-301 Database Lock',
    startedAt: '2025-12-30T14:15:00Z',
    status: 'in-progress',
    sectionsGenerated: 4,
    tablesGenerated: 8,
    figuresGenerated: 0,
    confidenceScore: 70,
    automationRate: 65,
    generatedBy: 'ai',
    highlightedAreas: [
      'Awaiting CSR Section 12 for SAE narrative cross-references',
      'Post-marketing section marked N/A',
    ],
  },
  authoring: {
    id: 'auth-m274-001',
    documentId: 'doc-m274',
    documentVersion: '0.8',
    authoringStarted: '2025-12-30T16:00:00Z',
    lastEdited: '2026-01-02T12:30:00Z',
    status: 'in-progress',
    currentOwner: 'Dr. Emily Watson',
    reviewCycle: 0,
    reviewers: [],
    wordCount: 6200,
    pageCount: 16,
    manualEdits: 45,
    aiSuggestionsAccepted: 78,
    aiSuggestionsRejected: 8,
  },
  integration: {
    id: 'int-m274-001',
    slotId: 'slot-274-001',
    ctdModule: 'm2',
    ctdSection: '2.7.4',
    sectionTitle: 'Summary of Clinical Safety',
    targetSequence: '0004',
    applicationNumber: 'NDA-214987',
    status: 'pending',
    integrationAction: 'pending',
    operation: 'new',
    validationStatus: 'pending',
    validationMessages: [],
  },
  
  automationScore: 65,
  touchPoints: 2,
  handoffs: 0,
  
  milestones: m274Milestones,
};

// Full CSR - Pending approval
const csrFullMilestones: ThreadMilestone[] = [
  {
    id: 'ms-csr-001',
    timestamp: '2025-12-28T09:00:00Z',
    stage: 'data-source',
    event: 'All Study Data Locked',
    description: 'Complete LIG-301 database locked for CSR generation.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-csr-002',
    timestamp: '2025-12-28T14:35:00Z',
    stage: 'generation',
    event: 'Full CSR Generation Started',
    description: 'Generating complete 210-page Clinical Study Report.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-csr-003',
    timestamp: '2025-12-29T08:00:00Z',
    stage: 'generation',
    event: 'Generation Complete',
    description: 'Full CSR generated. 45 tables, 18 figures. 85% confidence.',
    actor: 'system',
    automated: true,
    duration: '17h 25m',
  },
  {
    id: 'ms-csr-004',
    timestamp: '2025-12-29T09:00:00Z',
    stage: 'authoring',
    event: 'Review Process Started',
    description: 'Multi-reviewer workflow initiated.',
    actor: 'system',
    automated: true,
  },
  {
    id: 'ms-csr-005',
    timestamp: '2026-01-02T15:00:00Z',
    stage: 'authoring',
    event: 'Final Review In Progress',
    description: 'CSR in final medical director review before approval.',
    actor: 'user',
    actorName: 'Dr. Sarah Chen',
    automated: false,
  },
];

export const csrFullThread: SubmissionThread = {
  id: 'thread-csr-full-001',
  threadName: 'Full CSR → Module 5.3.5.1',
  documentTitle: 'Full CSR LIG-301 (CLARITY-1)',
  documentType: 'csr-full',
  productId: 'prod-lig-2847',
  productName: 'Nexavant (LIG-2847)',
  studyId: 'LIG-301',
  studyName: 'CLARITY-1 Phase 3',
  
  threadStarted: '2025-12-28T09:00:00Z',
  currentStage: 'authoring',
  overallStatus: 'active',
  estimatedCompletion: '2026-01-03T17:00:00Z',
  
  dataSources: [
    ...csrEfficacyDataSources,
    {
      id: 'ds-adae-301',
      datasetName: 'ADAE',
      datasetType: 'ADaM',
      recordCount: 2847,
      lockDate: '2025-12-28T14:30:00Z',
      lockStatus: 'locked',
      validationStatus: 'passed',
      studyId: 'LIG-301',
      studyName: 'CLARITY-1 Phase 3',
      lastUpdated: '2025-12-28T14:30:00Z',
    },
    {
      id: 'ds-adcm-301',
      datasetName: 'ADCM',
      datasetType: 'ADaM',
      recordCount: 5640,
      lockDate: '2025-12-28T14:30:00Z',
      lockStatus: 'locked',
      validationStatus: 'passed',
      studyId: 'LIG-301',
      studyName: 'CLARITY-1 Phase 3',
      lastUpdated: '2025-12-28T14:30:00Z',
    },
  ],
  generation: {
    id: 'gen-csr-full-001',
    jobId: 'gen-job-005',
    triggerType: 'database-lock',
    triggerEvent: 'LIG-301 Database Lock',
    startedAt: '2025-12-28T14:35:00Z',
    completedAt: '2025-12-29T08:00:00Z',
    status: 'completed',
    sectionsGenerated: 16,
    tablesGenerated: 45,
    figuresGenerated: 18,
    confidenceScore: 85,
    automationRate: 72,
    generatedBy: 'ai',
    highlightedAreas: [
      'Executive summary requires senior medical review',
      'SAE narratives flagged for individual case review',
      'Subgroup analyses require biostatistics sign-off',
    ],
  },
  authoring: {
    id: 'auth-csr-full-001',
    documentId: 'doc-csr-full',
    documentVersion: '1.3',
    authoringStarted: '2025-12-29T09:00:00Z',
    lastEdited: '2026-01-02T15:45:00Z',
    status: 'in-progress',
    currentOwner: 'Dr. Sarah Chen',
    reviewCycle: 2,
    reviewers: [
      { name: 'Dr. Michael Torres', role: 'Statistical Reviewer', status: 'approved', completedAt: '2025-12-31T16:00:00Z' },
      { name: 'Dr. Emily Watson', role: 'Safety Reviewer', status: 'approved', completedAt: '2026-01-01T14:00:00Z' },
      { name: 'Dr. Sarah Chen', role: 'Medical Director', status: 'pending' },
    ],
    wordCount: 48500,
    pageCount: 210,
    manualEdits: 156,
    aiSuggestionsAccepted: 420,
    aiSuggestionsRejected: 45,
  },
  integration: {
    id: 'int-csr-full-001',
    slotId: 'slot-5351-002',
    ctdModule: 'm5',
    ctdSection: '5.3.5.1',
    sectionTitle: 'Reports of Controlled Clinical Studies',
    targetSequence: '0004',
    applicationNumber: 'NDA-214987',
    status: 'pending',
    integrationAction: 'pending',
    operation: 'new',
    validationStatus: 'pending',
    validationMessages: [],
  },
  
  automationScore: 72,
  touchPoints: 6,
  handoffs: 0,
  
  milestones: csrFullMilestones,
};

// ============================================================================
// COLLECTION EXPORTS
// ============================================================================

export const allSubmissionThreads: SubmissionThread[] = [
  csrEfficacyThread,
  module273Thread,
  module274Thread,
  csrFullThread,
];

export const threadSummary: ThreadSummary = {
  totalActiveThreads: 4,
  threadsCompletedThisWeek: 1,
  averageAutomationScore: 77,
  averageHandoffs: 0,
  documentsInPipeline: 4,
  blockedThreads: 1,
  upcomingCompletions: [
    { threadId: 'thread-m273-001', documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy', expectedDate: '2026-01-02' },
    { threadId: 'thread-csr-full-001', documentTitle: 'Full CSR LIG-301', expectedDate: '2026-01-03' },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getThreadById(threadId: string): SubmissionThread | undefined {
  return allSubmissionThreads.find(t => t.id === threadId);
}

export function getThreadsByStatus(status: SubmissionThread['overallStatus']): SubmissionThread[] {
  return allSubmissionThreads.filter(t => t.overallStatus === status);
}

export function getThreadsByStage(stage: ThreadStageType): SubmissionThread[] {
  return allSubmissionThreads.filter(t => t.currentStage === stage);
}

export function getThreadsByProduct(productId: string): SubmissionThread[] {
  return allSubmissionThreads.filter(t => t.productId === productId);
}

export function getActiveThreads(): SubmissionThread[] {
  return allSubmissionThreads.filter(t => t.overallStatus === 'active' || t.overallStatus === 'blocked');
}

export function getCompletedThreads(): SubmissionThread[] {
  return allSubmissionThreads.filter(t => t.overallStatus === 'completed');
}

export function getThreadMilestonesByStage(thread: SubmissionThread, stage: ThreadStageType): ThreadMilestone[] {
  return thread.milestones.filter(m => m.stage === stage);
}

export function calculateAverageAutomation(threads: SubmissionThread[]): number {
  if (threads.length === 0) return 0;
  const total = threads.reduce((sum, t) => sum + t.automationScore, 0);
  return Math.round(total / threads.length);
}

export function getBlockedReasons(thread: SubmissionThread): string[] {
  const reasons: string[] = [];
  if (thread.generation?.status === 'in-progress') {
    reasons.push('Document generation in progress');
  }
  if (thread.authoring.status === 'in-progress') {
    const pendingReviewers = thread.authoring.reviewers.filter(r => r.status === 'pending');
    if (pendingReviewers.length > 0) {
      reasons.push(`Awaiting review from: ${pendingReviewers.map(r => r.name).join(', ')}`);
    }
  }
  if (thread.generation?.highlightedAreas && thread.generation.highlightedAreas.length > 0) {
    reasons.push(...thread.generation.highlightedAreas);
  }
  return reasons;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

export const threadStageConfig: Record<ThreadStageType, { label: string; icon: string; color: string; bgColor: string }> = {
  'data-source': { label: 'Data Source', icon: 'Database', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'generation': { label: 'Generation', icon: 'Sparkles', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  'authoring': { label: 'Authoring', icon: 'FileText', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'integration': { label: 'Integration', icon: 'LayoutGrid', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  'validation': { label: 'Validation', icon: 'Shield', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  'submission': { label: 'Submission', icon: 'Send', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
};

export const threadStatusConfig: Record<ThreadStatus, { label: string; color: string; bgColor: string }> = {
  'completed': { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'in-progress': { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'pending': { label: 'Pending', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  'blocked': { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  'skipped': { label: 'Skipped', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
};

export const overallStatusConfig: Record<SubmissionThread['overallStatus'], { label: string; color: string; bgColor: string; icon: string }> = {
  'active': { label: 'Active', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: 'PlayCircle' },
  'completed': { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: 'CheckCircle' },
  'blocked': { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: 'AlertCircle' },
  'paused': { label: 'Paused', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: 'PauseCircle' },
};
