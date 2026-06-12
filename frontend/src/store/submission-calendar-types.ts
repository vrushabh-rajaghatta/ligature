
// =============================================================================
// SUBMISSION CALENDAR TYPES - v0.9.17b
// =============================================================================
// Type definitions for eCTD submission deadlines, milestones, and calendar
// events. Integrates with sequence templates for deadline estimation.
// =============================================================================

import type { RegulatoryRegion } from './ectd-regional-types';
import type { RegionalSubmissionType, SequenceType } from './ectd-publishing-types';

// -----------------------------------------------------------------------------
// DEADLINE TYPES
// -----------------------------------------------------------------------------

/** Priority levels for submission deadlines */
export type SubmissionDeadlinePriority = 'critical' | 'high' | 'medium' | 'low';

/** Status of a submission deadline */
export type SubmissionDeadlineStatus =
  | 'pending'           // Future deadline
  | 'approaching'       // Within warning threshold
  | 'due-today'         // Due today
  | 'overdue'           // Past due date
  | 'completed'         // Completed on time
  | 'completed-late'    // Completed after due date
  | 'extended'          // Extension granted
  | 'waived'            // Deadline waived
  | 'cancelled';        // Cancelled

/** Type of submission deadline */
export type SubmissionDeadlineType =
  | 'submission-due'        // Primary submission due date
  | 'response-due'          // Response to agency questions
  | 'amendment-due'         // Amendment deadline
  | 'annual-report'         // Annual report deadline
  | 'safety-report'         // Safety report deadline
  | 'pdufa-goal'            // PDUFA goal date
  | 'clock-restoration'     // Clock restoration deadline
  | 'commitment-due'        // Post-marketing commitment
  | 'renewal'               // Marketing authorization renewal
  | 'variation'             // EU variation deadline
  | 'internal-milestone'    // Internal preparation deadline
  | 'review-complete'       // Internal review completion
  | 'qc-complete'           // QC review completion
  | 'custom';               // Custom deadline type

/** A submission deadline */
export interface SubmissionDeadline {
  id: string;
  
  // Core identification
  title: string;
  description?: string;
  deadlineType: SubmissionDeadlineType;
  
  // Timing
  dueDate: string;           // ISO date string
  dueTime?: string;          // Optional time (HH:MM format)
  timezone?: string;         // Timezone (default: UTC)
  warningDays: number;       // Days before due date to warn (default: 7)
  
  // Status tracking
  status: SubmissionDeadlineStatus;
  priority: SubmissionDeadlinePriority;
  completedDate?: string;
  completedBy?: string;
  
  // Regulatory context
  applicationId?: string;
  sequenceId?: string;
  region: RegulatoryRegion;
  submissionType?: RegionalSubmissionType;
  
  // Agency tracking
  agencyReferenceNumber?: string;  // IND/NDA/BLA number
  agencyDeadlineType?: string;     // PDUFA, RTF, etc.
  
  // Extension tracking
  originalDueDate?: string;
  extensionReason?: string;
  extensionApprovedBy?: string;
  extensionApprovedDate?: string;
  
  // Dependencies
  dependsOn?: string[];      // IDs of prerequisite deadlines
  blocks?: string[];         // IDs of deadlines this blocks
  
  // Reminders
  remindersSent: number;
  nextReminderDate?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
  
  // Tags and notes
  tags: string[];
  notes?: string;
}

// -----------------------------------------------------------------------------
// MILESTONE TYPES
// -----------------------------------------------------------------------------

/** Status of a submission milestone */
export type MilestoneStatus =
  | 'not-started'
  | 'in-progress'
  | 'on-track'
  | 'at-risk'
  | 'delayed'
  | 'blocked'
  | 'completed'
  | 'skipped';

/** Category of submission milestone */
export type MilestoneCategory =
  | 'authoring'         // Document authoring milestones
  | 'review'            // Review cycle milestones
  | 'qc'                // Quality control milestones
  | 'publishing'        // Publishing/technical milestones
  | 'submission'        // Submission to agency
  | 'agency-action'     // Agency action dates
  | 'approval'          // Approval milestones
  | 'post-approval'     // Post-approval commitments
  | 'internal';         // Internal planning milestones

/** A submission milestone */
export interface SubmissionMilestone {
  id: string;
  
  // Core identification
  title: string;
  description?: string;
  category: MilestoneCategory;
  
  // Timing
  targetDate: string;
  actualDate?: string;
  
  // Status
  status: MilestoneStatus;
  percentComplete: number;   // 0-100
  
  // Context
  applicationId?: string;
  sequenceId?: string;
  region: RegulatoryRegion;
  phase?: string;            // e.g., "Phase 1", "Phase 2"
  
  // Dependencies
  predecessors: string[];    // Milestone IDs
  successors: string[];      // Milestone IDs
  
  // Tracking
  owner?: string;
  assignees: string[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
  
  // Notes
  notes?: string;
  tags: string[];
}

// -----------------------------------------------------------------------------
// CALENDAR EVENT TYPES
// -----------------------------------------------------------------------------

/** Type of calendar event */
export type SubmissionCalendarEventType =
  | 'deadline'
  | 'milestone'
  | 'meeting'
  | 'submission'
  | 'agency-action'
  | 'reminder'
  | 'custom';

/** A calendar event (unified view) */
export interface SubmissionCalendarEvent {
  id: string;
  
  // Core
  title: string;
  description?: string;
  eventType: SubmissionCalendarEventType;
  
  // Timing
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  
  // Reference
  referenceId?: string;      // ID of related deadline/milestone
  referenceType?: 'deadline' | 'milestone';
  
  // Context
  applicationId?: string;
  region?: RegulatoryRegion;
  
  // Display
  color?: string;
  icon?: string;
  
  // Audit
  createdAt: string;
}

// -----------------------------------------------------------------------------
// DEADLINE ESTIMATION (TEMPLATE INTEGRATION)
// -----------------------------------------------------------------------------

/** Configuration for estimating deadlines from templates */
export interface DeadlineEstimationConfig {
  region: RegulatoryRegion;
  submissionType: RegionalSubmissionType;
  sequenceType: SequenceType;
  startDate: string;         // Base date for estimation
}

/** Standard lead times for different regions/submission types */
export interface LeadTimeConfig {
  region: RegulatoryRegion;
  submissionType: RegionalSubmissionType;
  phases: LeadTimePhase[];
  totalDays: number;
}

/** A phase in the lead time calculation */
export interface LeadTimePhase {
  id: string;
  name: string;
  category: MilestoneCategory;
  daysFromStart: number;     // Days from start date
  duration: number;          // Duration in days
  isParallel: boolean;       // Can run in parallel with other phases
  dependsOn?: string[];      // Phase IDs this depends on
}

/** Result of deadline estimation */
export interface EstimatedTimeline {
  deadlines: Omit<SubmissionDeadline, 'id' | 'createdAt' | 'updatedAt' | 'remindersSent'>[];
  milestones: Omit<SubmissionMilestone, 'id' | 'createdAt' | 'updatedAt'>[];
  estimatedSubmissionDate: string;
  totalDuration: number;     // Total days
  criticalPath: string[];    // IDs of critical path items
}

// -----------------------------------------------------------------------------
// CALENDAR VIEW TYPES
// -----------------------------------------------------------------------------

/** Calendar view modes */
export type CalendarViewMode = 'month' | 'week' | 'day' | 'list' | 'timeline';

/** Calendar filter options */
export interface SubmissionCalendarFilters {
  regions: RegulatoryRegion[];
  applicationIds: string[];
  deadlineTypes: SubmissionDeadlineType[];
  milestoneCategories: MilestoneCategory[];
  statuses: (SubmissionDeadlineStatus | MilestoneStatus)[];
  priorities: SubmissionDeadlinePriority[];
  dateRange: {
    from: string;
    to: string;
  };
  showCompleted: boolean;
  showCancelled: boolean;
}

/** Calendar statistics */
export interface SubmissionCalendarStatistics {
  totalDeadlines: number;
  pendingDeadlines: number;
  overdueDeadlines: number;
  completedDeadlines: number;
  
  totalMilestones: number;
  completedMilestones: number;
  atRiskMilestones: number;
  delayedMilestones: number;
  
  upcomingNext7Days: number;
  upcomingNext30Days: number;
  upcomingNext90Days: number;
  
  byRegion: Record<RegulatoryRegion, number>;
  byPriority: Record<SubmissionDeadlinePriority, number>;
}

// -----------------------------------------------------------------------------
// STORE TYPES
// -----------------------------------------------------------------------------

/** Submission Calendar tab views */
export type SubmissionCalendarView =
  | 'calendar'        // Calendar grid view
  | 'deadlines'       // Deadline list/management
  | 'milestones'      // Milestone tracking
  | 'timeline'        // Gantt-style timeline
  | 'estimation';     // Deadline estimation tool

/** Store state */
export interface SubmissionCalendarState {
  // Data
  deadlines: Record<string, SubmissionDeadline>;
  deadlineIndex: string[];
  milestones: Record<string, SubmissionMilestone>;
  milestoneIndex: string[];
  
  // Calendar events (computed from deadlines/milestones)
  calendarEvents: SubmissionCalendarEvent[];
  
  // Selection
  selectedDeadlineId: string | null;
  selectedMilestoneId: string | null;
  selectedDate: string | null;
  
  // UI State
  activeView: SubmissionCalendarView;
  viewMode: CalendarViewMode;
  currentMonth: string;        // YYYY-MM format
  filters: SubmissionCalendarFilters;
  
  // Statistics
  statistics: SubmissionCalendarStatistics | null;
  
  // Loading
  isLoading: boolean;
  error: string | null;
}

/** Store actions */
export interface SubmissionCalendarActions {
  // Deadline CRUD
  createDeadline: (deadline: Omit<SubmissionDeadline, 'id' | 'createdAt' | 'updatedAt' | 'remindersSent'>) => string;
  updateDeadline: (id: string, updates: Partial<SubmissionDeadline>) => void;
  deleteDeadline: (id: string) => void;
  completeDeadline: (id: string, completedBy: string) => void;
  extendDeadline: (id: string, newDueDate: string, reason: string, approvedBy: string) => void;
  
  // Milestone CRUD
  createMilestone: (milestone: Omit<SubmissionMilestone, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMilestone: (id: string, updates: Partial<SubmissionMilestone>) => void;
  deleteMilestone: (id: string) => void;
  updateMilestoneProgress: (id: string, percentComplete: number) => void;
  completeMilestone: (id: string) => void;
  
  // Query methods
  getDeadline: (id: string) => SubmissionDeadline | null;
  getMilestone: (id: string) => SubmissionMilestone | null;
  getDeadlinesForApplication: (applicationId: string) => SubmissionDeadline[];
  getMilestonesForApplication: (applicationId: string) => SubmissionMilestone[];
  getDeadlinesByStatus: (status: SubmissionDeadlineStatus) => SubmissionDeadline[];
  getUpcomingDeadlines: (days: number) => SubmissionDeadline[];
  getOverdueDeadlines: () => SubmissionDeadline[];
  
  // Timeline estimation
  estimateTimeline: (config: DeadlineEstimationConfig, templateId?: string) => EstimatedTimeline;
  applyEstimatedTimeline: (timeline: EstimatedTimeline, applicationId: string) => void;
  
  // Calendar event sync
  syncCalendarEvents: () => void;
  getEventsForDateRange: (from: string, to: string) => SubmissionCalendarEvent[];
  getEventsForDate: (date: string) => SubmissionCalendarEvent[];
  
  // Statistics
  refreshStatistics: () => SubmissionCalendarStatistics;
  
  // UI actions
  setActiveView: (view: SubmissionCalendarView) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setCurrentMonth: (month: string) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  selectDate: (date: string | null) => void;
  selectDeadline: (id: string | null) => void;
  selectMilestone: (id: string | null) => void;
  setFilters: (filters: Partial<SubmissionCalendarFilters>) => void;
  resetFilters: () => void;
  
  // Reset
  reset: () => void;
}

// -----------------------------------------------------------------------------
// ID GENERATORS
// -----------------------------------------------------------------------------

export const generateSubmissionCalendarId = {
  deadline: () => `subdl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  milestone: () => `subms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  event: () => `subev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

// -----------------------------------------------------------------------------
// BUILT-IN LEAD TIME CONFIGURATIONS
// -----------------------------------------------------------------------------

/** Standard lead times for US NDA submission */
export const US_NDA_LEAD_TIME: LeadTimeConfig = {
  region: 'US',
  submissionType: 'nda',
  totalDays: 120,
  phases: [
    { id: 'authoring', name: 'Document Authoring', category: 'authoring', daysFromStart: 0, duration: 60, isParallel: false },
    { id: 'internal-review', name: 'Internal Review', category: 'review', daysFromStart: 60, duration: 14, isParallel: false, dependsOn: ['authoring'] },
    { id: 'qc-review', name: 'QC Review', category: 'qc', daysFromStart: 74, duration: 7, isParallel: false, dependsOn: ['internal-review'] },
    { id: 'revisions', name: 'Final Revisions', category: 'authoring', daysFromStart: 81, duration: 7, isParallel: false, dependsOn: ['qc-review'] },
    { id: 'publishing', name: 'eCTD Publishing', category: 'publishing', daysFromStart: 88, duration: 14, isParallel: false, dependsOn: ['revisions'] },
    { id: 'validation', name: 'Technical Validation', category: 'publishing', daysFromStart: 102, duration: 7, isParallel: false, dependsOn: ['publishing'] },
    { id: 'submission', name: 'Gateway Submission', category: 'submission', daysFromStart: 109, duration: 1, isParallel: false, dependsOn: ['validation'] },
    { id: 'acknowledgment', name: 'Await Acknowledgment', category: 'agency-action', daysFromStart: 110, duration: 10, isParallel: false, dependsOn: ['submission'] },
  ],
};

/** Standard lead times for EU MAA submission */
export const EU_MAA_LEAD_TIME: LeadTimeConfig = {
  region: 'EU',
  submissionType: 'maa',
  totalDays: 150,
  phases: [
    { id: 'authoring', name: 'Document Authoring', category: 'authoring', daysFromStart: 0, duration: 75, isParallel: false },
    { id: 'internal-review', name: 'Internal Review', category: 'review', daysFromStart: 75, duration: 21, isParallel: false, dependsOn: ['authoring'] },
    { id: 'qc-review', name: 'QC Review', category: 'qc', daysFromStart: 96, duration: 14, isParallel: false, dependsOn: ['internal-review'] },
    { id: 'revisions', name: 'Final Revisions', category: 'authoring', daysFromStart: 110, duration: 10, isParallel: false, dependsOn: ['qc-review'] },
    { id: 'publishing', name: 'eCTD Publishing', category: 'publishing', daysFromStart: 120, duration: 14, isParallel: false, dependsOn: ['revisions'] },
    { id: 'validation', name: 'Technical Validation', category: 'publishing', daysFromStart: 134, duration: 7, isParallel: false, dependsOn: ['publishing'] },
    { id: 'submission', name: 'CESP Submission', category: 'submission', daysFromStart: 141, duration: 1, isParallel: false, dependsOn: ['validation'] },
    { id: 'validation-ema', name: 'EMA Validation', category: 'agency-action', daysFromStart: 142, duration: 8, isParallel: false, dependsOn: ['submission'] },
  ],
};

/** Standard lead times for HAQ Response */
export const HAQ_RESPONSE_LEAD_TIME: LeadTimeConfig = {
  region: 'US',
  submissionType: 'nda',  // Applicable to multiple types
  totalDays: 30,
  phases: [
    { id: 'triage', name: 'Question Triage', category: 'review', daysFromStart: 0, duration: 2, isParallel: false },
    { id: 'authoring', name: 'Response Authoring', category: 'authoring', daysFromStart: 2, duration: 14, isParallel: false, dependsOn: ['triage'] },
    { id: 'review', name: 'Internal Review', category: 'review', daysFromStart: 16, duration: 5, isParallel: false, dependsOn: ['authoring'] },
    { id: 'qc', name: 'QC Review', category: 'qc', daysFromStart: 21, duration: 3, isParallel: false, dependsOn: ['review'] },
    { id: 'publishing', name: 'eCTD Publishing', category: 'publishing', daysFromStart: 24, duration: 4, isParallel: false, dependsOn: ['qc'] },
    { id: 'submission', name: 'Response Submission', category: 'submission', daysFromStart: 28, duration: 1, isParallel: false, dependsOn: ['publishing'] },
  ],
};

/** All built-in lead time configurations */
export const BUILT_IN_LEAD_TIMES: LeadTimeConfig[] = [
  US_NDA_LEAD_TIME,
  EU_MAA_LEAD_TIME,
  HAQ_RESPONSE_LEAD_TIME,
];

/** Get lead time config for region and submission type */
export function getLeadTimeConfig(
  region: RegulatoryRegion,
  submissionType: RegionalSubmissionType
): LeadTimeConfig | undefined {
  return BUILT_IN_LEAD_TIMES.find(
    lt => lt.region === region && lt.submissionType === submissionType
  );
}

// -----------------------------------------------------------------------------
// DEFAULT FILTERS
// -----------------------------------------------------------------------------

export const DEFAULT_CALENDAR_FILTERS: SubmissionCalendarFilters = {
  regions: [],
  applicationIds: [],
  deadlineTypes: [],
  milestoneCategories: [],
  statuses: [],
  priorities: [],
  dateRange: {
    from: '',
    to: '',
  },
  showCompleted: true,
  showCancelled: false,
};

// -----------------------------------------------------------------------------
// COLOR MAPS
// -----------------------------------------------------------------------------

export const DEADLINE_STATUS_COLORS: Record<SubmissionDeadlineStatus, string> = {
  'pending': 'slate',
  'approaching': 'amber',
  'due-today': 'orange',
  'overdue': 'red',
  'completed': 'green',
  'completed-late': 'yellow',
  'extended': 'purple',
  'waived': 'slate',
  'cancelled': 'slate',
};

export const DEADLINE_PRIORITY_COLORS: Record<SubmissionDeadlinePriority, string> = {
  'critical': 'red',
  'high': 'orange',
  'medium': 'yellow',
  'low': 'slate',
};

export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  'not-started': 'slate',
  'in-progress': 'blue',
  'on-track': 'green',
  'at-risk': 'amber',
  'delayed': 'red',
  'blocked': 'red',
  'completed': 'emerald',
  'skipped': 'slate',
};

export const MILESTONE_CATEGORY_COLORS: Record<MilestoneCategory, string> = {
  'authoring': 'blue',
  'review': 'purple',
  'qc': 'cyan',
  'publishing': 'indigo',
  'submission': 'green',
  'agency-action': 'orange',
  'approval': 'emerald',
  'post-approval': 'teal',
  'internal': 'slate',
};

// -----------------------------------------------------------------------------
// LABEL MAPS
// -----------------------------------------------------------------------------

export const DEADLINE_TYPE_LABELS: Record<SubmissionDeadlineType, string> = {
  'submission-due': 'Submission Due',
  'response-due': 'Response Due',
  'amendment-due': 'Amendment Due',
  'annual-report': 'Annual Report',
  'safety-report': 'Safety Report',
  'pdufa-goal': 'PDUFA Goal Date',
  'clock-restoration': 'Clock Restoration',
  'commitment-due': 'Commitment Due',
  'renewal': 'Renewal',
  'variation': 'Variation',
  'internal-milestone': 'Internal Milestone',
  'review-complete': 'Review Complete',
  'qc-complete': 'QC Complete',
  'custom': 'Custom',
};

export const MILESTONE_CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  'authoring': 'Document Authoring',
  'review': 'Review',
  'qc': 'Quality Control',
  'publishing': 'Publishing',
  'submission': 'Submission',
  'agency-action': 'Agency Action',
  'approval': 'Approval',
  'post-approval': 'Post-Approval',
  'internal': 'Internal',
};
