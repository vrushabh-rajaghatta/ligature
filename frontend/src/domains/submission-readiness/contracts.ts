
/**
 * Submission Readiness Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Submission Readiness Dashboard types.
 * 
 * Demonstrates the "4 Weeks LSLV to Submission" paradigm:
 * - Continuous data flow replacing batch processing
 * - Parallel workstream execution
 * - AI-assisted CSR authoring
 * - Real-time TMF close tracking
 * 
 * This domain powers the key investor demo showing:
 * - Traditional 120-day timeline compressed to 28 days
 * - Live data connections from EDC → CSR
 * - Automated regulatory document generation
 * 
 * @module domains/submission-readiness/contracts
 * @version 0.27.41
 */

// =============================================================================
// CORE MILESTONE TYPES
// =============================================================================

export type MilestoneStatus = 
  | 'completed' 
  | 'in-progress' 
  | 'on-track' 
  | 'at-risk' 
  | 'blocked' 
  | 'not-started';

export type WorkstreamCategory = 
  | 'clinical-data' 
  | 'csr-authoring' 
  | 'datasets' 
  | 'tmf' 
  | 'regulatory-docs' 
  | 'publishing';

export interface SubmissionMilestone {
  id: string;
  name: string;
  shortName: string;
  category: WorkstreamCategory;
  description: string;
  targetDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  daysFromLSLV: number; // Negative = before LSLV, positive = after
  percentComplete: number;
  blockers?: string[];
  dependencies?: string[];
  owner: string;
  ownerRole: string;
}

// =============================================================================
// WORKSTREAM READINESS
// =============================================================================

export interface WorkstreamReadiness {
  id: string;
  studyId: string;
  category: WorkstreamCategory;
  name: string;
  description: string;
  percentComplete: number;
  status: MilestoneStatus;
  startedAt?: string;
  projectedComplete?: string;
  actualComplete?: string;
  items: WorkstreamItem[];
  blockers: WorkstreamBlocker[];
  trend: 'improving' | 'stable' | 'declining';
  velocity: number; // Items completed per week
}

export interface WorkstreamItem {
  id: string;
  workstreamId: string;
  name: string;
  type: string;
  status: 'complete' | 'in-progress' | 'not-started' | 'blocked';
  percentComplete: number;
  assignee?: string;
  dueDate?: string;
  actualDate?: string;
  aiAssisted?: boolean;
}

export interface WorkstreamBlocker {
  id: string;
  workstreamId: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  createdAt: string;
  resolvedAt?: string;
  owner?: string;
  resolution?: string;
}

// =============================================================================
// SUBMISSION COUNTDOWN
// =============================================================================

export type SubmissionType = 'NDA' | 'MAA' | 'JNDA' | 'sNDA' | 'Type II Variation';
export type SubmissionRegion = 'US' | 'EU' | 'JP' | 'CN' | 'Global';

export interface SubmissionCountdown {
  studyId: string;
  studyName: string;
  submissionType: SubmissionType;
  region: SubmissionRegion;
  
  // Key milestone dates
  lslvDate: string; // Last Subject Last Visit
  dblDate: string; // Database Lock (traditional - but we show it happens earlier!)
  csrTargetDate: string;
  submissionTargetDate: string;
  
  // Countdown metrics
  daysToLSLV: number;
  daysToSubmission: number;
  weeksToSubmission: number;
  
  // Overall readiness
  overallReadiness: number; // 0-100
  overallStatus: MilestoneStatus;
  
  // Workstream summaries
  workstreamSummaries: WorkstreamSummary[];
  
  // The "wow" metrics - key investor demo data
  traditionalTimeline: number; // Days in traditional approach (e.g., 120)
  ligatureTimeline: number; // Days with Ligature (e.g., 28)
  timelineReduction: number; // Percentage saved
}

export interface WorkstreamSummary {
  category: WorkstreamCategory;
  name: string;
  percentComplete: number;
  status: MilestoneStatus;
  itemsComplete: number;
  itemsTotal: number;
  blockerCount: number;
  icon: string;
}

// =============================================================================
// CONTINUOUS DATA FLOW METRICS
// =============================================================================

export interface DataFlowMetrics {
  studyId: string;
  asOfDate: string;
  
  // EDC → CTMS flow
  subjectsWithCompleteData: number;
  subjectsTotal: number;
  dataCompletenessPercent: number;
  
  // Query status
  openQueries: number;
  resolvedQueries: number;
  queryResolutionRate: number;
  
  // Data cleaning
  cleanedCRFs: number;
  totalCRFs: number;
  dataCleaningPercent: number;
  
  // Dataset readiness
  sdtmDomainsReady: number;
  sdtmDomainsTotal: number;
  adamDatasetsReady: number;
  adamDatasetsTotal: number;
  
  // Real-time authoring metrics
  csrSectionsWithLiveData: number;
  csrSectionsTotal: number;
  tablesWithAutoUpdate: number;
  figuresWithAutoUpdate: number;
}

// =============================================================================
// CSR AUTHORING PROGRESS
// =============================================================================

export type CSRSectionStatus = 
  | 'not-started' 
  | 'data-pending' 
  | 'drafting' 
  | 'ai-drafting'
  | 'medical-review' 
  | 'qc-review' 
  | 'approved' 
  | 'final';

export interface CSRSection {
  id: string;
  studyId: string;
  sectionNumber: string;
  sectionTitle: string;
  icHModule: string; // e.g., "11.1", "12.2"
  status: CSRSectionStatus;
  percentComplete: number;
  wordCount: number;
  targetWordCount: number;
  author: string;
  reviewer?: string;
  dueDate: string;
  lastUpdated: string;
  hasLiveDataConnection: boolean;
  tablesGenerated: number;
  figuresGenerated: number;
  aiAssistedPercent: number;
  blockers?: string[];
}

export interface CSRAuthoringProgress {
  studyId: string;
  csrTitle: string;
  csrVersion: string;
  overallProgress: number;
  sections: CSRSection[];
  
  // Summary metrics
  sectionsComplete: number;
  sectionsInProgress: number;
  sectionsNotStarted: number;
  sectionsTotal: number;
  
  // AI assistance metrics
  aiDraftedSections: number;
  aiGeneratedTables: number;
  aiGeneratedFigures: number;
  aiAssistedWordCount: number;
  totalWordCount: number;
  
  // Timeline
  startedDate: string;
  targetCompletionDate: string;
  projectedCompletionDate: string;
  daysAheadOfSchedule: number;
}

// =============================================================================
// TMF READINESS FOR SUBMISSION
// =============================================================================

export interface TMFSubmissionReadiness {
  studyId: string;
  overallCompleteness: number;
  criticalArtifactsComplete: number;
  criticalArtifactsTotal: number;
  
  zoneReadiness: TMFZoneReadiness[];
  
  // Auto-close tracking
  sitesReadyForClose: number;
  sitesTotalActive: number;
  essentialDocsComplete: number;
  essentialDocsExpected: number;
  
  // Projected close
  projectedCloseDate: string;
  daysToClose: number;
}

export interface TMFZoneReadiness {
  zone: string;
  zoneName: string;
  artifactsComplete: number;
  artifactsExpected: number;
  percentComplete: number;
  criticalMissing: string[];
  status: MilestoneStatus;
}

// =============================================================================
// REGULATORY DOCUMENT READINESS
// =============================================================================

export interface RegulatoryDocReadiness {
  studyId: string;
  applicationId: string;
  
  // Module 2 summaries
  module2Sections: Module2SectionStatus[];
  module2OverallProgress: number;
  
  // Module 5 study reports
  module5Studies: Module5StudyStatus[];
  module5OverallProgress: number;
  
  // Cross-references validated
  crossRefsValidated: number;
  crossRefsTotal: number;
  
  // Publishing readiness
  publishingValidationPassed: boolean;
  publishingErrors: number;
  publishingWarnings: number;
}

export interface Module2SectionStatus {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  status: CSRSectionStatus;
  percentComplete: number;
  linkedCSRSections: string[];
  author: string;
  dueDate: string;
}

export type StudyType = 'pivotal' | 'supportive' | 'pk' | 'safety';
export type DatasetStatus = 'not-started' | 'in-progress' | 'validated' | 'submitted';

export interface Module5StudyStatus {
  id: string;
  studyNumber: string;
  studyTitle: string;
  studyType: StudyType;
  csrStatus: CSRSectionStatus;
  datasetStatus: DatasetStatus;
  tmfStatus: MilestoneStatus;
  overallReady: boolean;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type SubmissionReadinessView = 
  | 'overview' 
  | 'timeline' 
  | 'workstreams' 
  | 'data-flow' 
  | 'csr' 
  | 'tmf';

// =============================================================================
// CONSTANTS
// =============================================================================

export const WORKSTREAM_CATEGORY_LABELS: Record<WorkstreamCategory, string> = {
  'clinical-data': 'Clinical Data',
  'csr-authoring': 'CSR Authoring',
  'datasets': 'Datasets',
  'tmf': 'TMF',
  'regulatory-docs': 'Regulatory Documents',
  'publishing': 'Publishing',
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  'completed': 'Completed',
  'in-progress': 'In Progress',
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'blocked': 'Blocked',
  'not-started': 'Not Started',
};

export const CSR_SECTION_STATUS_LABELS: Record<CSRSectionStatus, string> = {
  'not-started': 'Not Started',
  'data-pending': 'Data Pending',
  'drafting': 'Drafting',
  'ai-drafting': 'AI Drafting',
  'medical-review': 'Medical Review',
  'qc-review': 'QC Review',
  'approved': 'Approved',
  'final': 'Final',
};

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  'NDA': 'New Drug Application (FDA)',
  'MAA': 'Marketing Authorization Application (EMA)',
  'JNDA': 'J-NDA (PMDA)',
  'sNDA': 'Supplemental NDA',
  'Type II Variation': 'Type II Variation (EMA)',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isMilestoneComplete(milestone: SubmissionMilestone): boolean {
  return milestone.status === 'completed';
}

export function isMilestoneAtRisk(milestone: SubmissionMilestone): boolean {
  return milestone.status === 'at-risk' || milestone.status === 'blocked';
}

export function isWorkstreamOnTrack(workstream: WorkstreamReadiness): boolean {
  return workstream.status === 'completed' || 
         workstream.status === 'on-track' || 
         workstream.status === 'in-progress';
}

export function calculateTimelineSavings(traditional: number, ligature: number): number {
  if (traditional <= 0) return 0;
  return Math.round(((traditional - ligature) / traditional) * 100);
}

export function getOverallReadinessStatus(readiness: number): MilestoneStatus {
  if (readiness >= 100) return 'completed';
  if (readiness >= 90) return 'on-track';
  if (readiness >= 70) return 'in-progress';
  if (readiness >= 50) return 'at-risk';
  return 'blocked';
}

export function getDaysToMilestone(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCSRCompletionPercentage(progress: CSRAuthoringProgress): number {
  if (progress.sectionsTotal === 0) return 0;
  return Math.round((progress.sectionsComplete / progress.sectionsTotal) * 100);
}

export function getAIAssistedPercentage(progress: CSRAuthoringProgress): number {
  if (progress.totalWordCount === 0) return 0;
  return Math.round((progress.aiAssistedWordCount / progress.totalWordCount) * 100);
}
