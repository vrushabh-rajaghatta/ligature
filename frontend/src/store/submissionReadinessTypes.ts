
/**
 * Submission Readiness Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/submission-readiness/contracts
 * "4 Weeks LSLV to Submission" Dashboard types.
 * 
 * @version 0.27.43
 */

// Re-export all types from Submission Readiness domain contracts
export {
  // Core milestone types
  type MilestoneStatus,
  type WorkstreamCategory,
  type SubmissionMilestone,
  
  // Workstream types
  type WorkstreamReadiness,
  type WorkstreamItem,
  type WorkstreamBlocker,
  
  // Submission countdown types
  type SubmissionType,
  type SubmissionRegion,
  type SubmissionCountdown,
  type WorkstreamSummary,
  
  // Data flow types
  type DataFlowMetrics,
  
  // CSR types
  type CSRSectionStatus,
  type CSRSection,
  type CSRAuthoringProgress,
  
  // TMF readiness types
  type TMFSubmissionReadiness,
  type TMFZoneReadiness,
  
  // Regulatory doc types
  type RegulatoryDocReadiness,
  type Module2SectionStatus,
  type StudyType,
  type DatasetStatus,
  type Module5StudyStatus,
  
  // UI types
  type SubmissionReadinessView,
  
  // Constants
  WORKSTREAM_CATEGORY_LABELS,
  MILESTONE_STATUS_LABELS,
  CSR_SECTION_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  
  // Utilities
  isMilestoneComplete,
  isMilestoneAtRisk,
  isWorkstreamOnTrack,
  calculateTimelineSavings,
  getOverallReadinessStatus,
  getDaysToMilestone,
  getCSRCompletionPercentage,
  getAIAssistedPercentage,
} from '@/domains/submission-readiness/contracts';

// Re-import types needed for store-specific types
import type {
  SubmissionCountdown,
  WorkstreamReadiness,
  SubmissionMilestone,
  DataFlowMetrics,
  CSRAuthoringProgress,
  TMFSubmissionReadiness,
  RegulatoryDocReadiness,
} from '@/domains/submission-readiness/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (not in domain contracts)
// =============================================================================

export interface SubmissionReadinessState {
  // Active study tracking
  selectedStudyId: string | null;
  
  // Countdown data
  countdowns: Record<string, SubmissionCountdown>;
  
  // Workstream data
  workstreams: Record<string, WorkstreamReadiness[]>;
  
  // Milestone data
  milestones: Record<string, SubmissionMilestone[]>;
  
  // Data flow metrics
  dataFlowMetrics: Record<string, DataFlowMetrics>;
  
  // CSR progress
  csrProgress: Record<string, CSRAuthoringProgress>;
  
  // TMF readiness
  tmfReadiness: Record<string, TMFSubmissionReadiness>;
  
  // Regulatory docs
  regulatoryDocs: Record<string, RegulatoryDocReadiness>;
  
  // UI State
  activeView: 'overview' | 'timeline' | 'workstreams' | 'data-flow' | 'csr' | 'tmf';
  isLoading: boolean;
  lastUpdated: string;
}

export interface SubmissionReadinessActions {
  // Selection
  setSelectedStudy: (studyId: string) => void;
  setActiveView: (view: SubmissionReadinessState['activeView']) => void;
  
  // Data loading
  loadSubmissionReadiness: (studyId: string) => void;
  loadMockData: () => void;
  refreshData: () => void;
  
  // Getters
  getCountdown: (studyId: string) => SubmissionCountdown | undefined;
  getWorkstreams: (studyId: string) => WorkstreamReadiness[];
  getMilestones: (studyId: string) => SubmissionMilestone[];
  getDataFlowMetrics: (studyId: string) => DataFlowMetrics | undefined;
  getCSRProgress: (studyId: string) => CSRAuthoringProgress | undefined;
  getTMFReadiness: (studyId: string) => TMFSubmissionReadiness | undefined;
}
