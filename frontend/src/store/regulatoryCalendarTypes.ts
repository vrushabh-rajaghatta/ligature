
// ============================================================================
// Regulatory Calendar Types - v193
// Health authority deadlines, FDA meeting management, milestone tracking,
// and cross-module integration for pharmaceutical regulatory affairs
// ============================================================================

import { RegulatoryAgencyId, RegulatedRegion, DeadlinePriority } from './regIntelTypes';

// ============================================================================
// FDA MEETING TYPES
// ============================================================================

export type FDAMeetingType = 
  | 'type-a'              // 30-day response - safety issues, clinical hold
  | 'type-b'              // 60-day response - pre-IND, EOP, pre-NDA/BLA
  | 'type-c'              // 75-day response - other meetings
  | 'type-d'              // Breakthrough/RTOR meetings
  | 'pre-ind'             // Pre-IND meeting
  | 'end-of-phase-1'      // EOP1 meeting
  | 'end-of-phase-2'      // EOP2 meeting (critical pathway meeting)
  | 'pre-nda'             // Pre-NDA meeting
  | 'pre-bla'             // Pre-BLA meeting
  | 'pre-submission'      // General pre-submission
  | 'advisory-committee'  // AdCom meeting
  | 'pdufa'               // PDUFA goal date
  | 'breakthrough'        // Breakthrough therapy meeting
  | 'rtor'                // Real-Time Oncology Review
  | 'fast-track'          // Fast Track meeting
  | 'accelerated'         // Accelerated Approval meeting
  | 'priority-review'     // Priority Review meeting
  | 'rems'                // REMS meeting
  | 'pediatric'           // Pediatric study plan meeting
  | 'type-b-informal';    // Informal Type B

export type EMAMeetingType =
  | 'pre-submission'      // Pre-submission meeting
  | 'scientific-advice'   // Scientific advice
  | 'protocol-assistance' // Protocol assistance
  | 'chmp'                // CHMP meeting
  | 'prac'                // PRAC meeting
  | 'sawp'                // Scientific Advice Working Party
  | 'prime'               // PRIME scheme meeting
  | 'accelerated'         // Accelerated assessment
  | 'conditional'         // Conditional marketing authorization
  | 'pediatric-pip';      // Pediatric investigation plan

export type GenericMeetingType =
  | 'health-authority'    // Generic HA meeting
  | 'internal-milestone'  // Internal company milestone
  | 'submission-deadline' // Submission due date
  | 'response-deadline'   // Response due date
  | 'inspection'          // Regulatory inspection
  | 'audit'               // Internal/external audit
  | 'review-committee'    // Internal review committee
  | 'governance'          // Governance meeting
  | 'data-lock'           // Database lock
  | 'dsmb'                // Data Safety Monitoring Board
  | 'custom';             // Custom event type

export type MeetingCategory = 'fda' | 'ema' | 'pmda' | 'nmpa' | 'health-canada' | 'other-ha' | 'internal';

// ============================================================================
// MEETING REQUEST & STATUS
// ============================================================================

export type MeetingRequestStatus = 
  | 'draft'                // Initial draft
  | 'internal-review'      // Under internal review
  | 'approved-to-submit'   // Approved for submission
  | 'submitted'            // Submitted to agency
  | 'acknowledged'         // Agency acknowledged receipt
  | 'date-proposed'        // Agency proposed date
  | 'confirmed'            // Meeting confirmed
  | 'completed'            // Meeting held
  | 'cancelled'            // Cancelled
  | 'denied';              // Request denied

export type MeetingFormat =
  | 'in-person'
  | 'teleconference'
  | 'video-conference'
  | 'written-response-only'
  | 'hybrid';

export type MeetingOutcome =
  | 'agreement'            // Full agreement reached
  | 'partial-agreement'    // Partial agreement
  | 'no-agreement'         // No agreement
  | 'follow-up-required'   // Additional discussions needed
  | 'pending-minutes'      // Awaiting official minutes
  | 'not-applicable';      // Written response only

// ============================================================================
// REGULATORY MEETING INTERFACE
// ============================================================================

export interface RegulatoryMeeting {
  id: string;
  
  // Classification
  category: MeetingCategory;
  meetingType: FDAMeetingType | EMAMeetingType | GenericMeetingType;
  meetingTypeLabel: string; // Human-readable label
  
  // Identification
  title: string;
  description?: string;
  meetingNumber?: string;  // Agency-assigned meeting number
  internalReference?: string;
  
  // Agency & Scope
  agency: RegulatoryAgencyId;
  region: RegulatedRegion;
  division?: string;       // e.g., "CDER", "CBER", "OND"
  reviewDivision?: string; // e.g., "Division of Oncology Products 1"
  
  // Product & Program
  productId?: string;
  productName?: string;
  programId?: string;
  programName?: string;
  indication?: string;
  submissionId?: string;   // Related submission
  indNumber?: string;      // IND number
  ndaNumber?: string;      // NDA/BLA number
  
  // Status & Workflow
  status: MeetingRequestStatus;
  format: MeetingFormat;
  outcome?: MeetingOutcome;
  
  // Key Dates
  requestSubmittedDate?: string;
  agencyAcknowledgedDate?: string;
  briefingDocumentDueDate?: string;
  briefingDocumentSubmittedDate?: string;
  
  // Meeting Timing
  proposedDates?: string[];        // Dates we proposed
  agencyProposedDate?: string;     // Date agency proposed
  confirmedDate?: string;          // Final confirmed date
  confirmedTime?: string;          // Meeting time
  duration?: number;               // Duration in minutes
  timezone?: string;
  
  // Meeting Details
  location?: string;
  virtualPlatform?: string;
  dialInDetails?: string;
  
  // Participants
  sponsorAttendees: MeetingAttendee[];
  agencyAttendees?: MeetingAttendee[];
  maxSponsorAttendees?: number;
  
  // Questions & Topics
  meetingObjectives: string[];
  proposedQuestions: MeetingQuestion[];
  agencyResponses?: AgencyResponse[];
  
  // Documents
  briefingDocumentId?: string;
  preliminaryResponseId?: string;
  officialMinutesId?: string;
  attachmentIds: string[];
  
  // Follow-up
  actionItems: MeetingActionItem[];
  followUpMeetingId?: string;
  
  // Reminders
  reminders: MeetingReminder[];
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Tags & Cross-references
  tags: string[];
  linkedEventIds: string[];
}

export interface MeetingAttendee {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  role: 'lead' | 'presenter' | 'subject-expert' | 'observer' | 'backup';
  email?: string;
  confirmed: boolean;
}

export interface MeetingQuestion {
  id: string;
  questionNumber: number;
  category: string;        // e.g., "Clinical", "CMC", "Nonclinical"
  question: string;
  context?: string;
  sponsorPosition?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'finalized' | 'submitted' | 'answered';
}

export interface AgencyResponse {
  id: string;
  questionId: string;
  response: string;
  responseType: 'agreement' | 'partial-agreement' | 'disagreement' | 'defer' | 'clarification-needed';
  followUpRequired: boolean;
  officialMinutesReference?: string;
}

export interface MeetingActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'completed' | 'deferred';
  completedDate?: string;
  notes?: string;
}

export interface MeetingReminder {
  id: string;
  triggerDate: string;
  reminderType: 'email' | 'in-app' | 'both';
  message: string;
  sent: boolean;
  sentDate?: string;
}

// ============================================================================
// REGULATORY MILESTONE
// ============================================================================

export type MilestoneCategory =
  | 'regulatory-submission'
  | 'regulatory-approval'
  | 'clinical-trial'
  | 'manufacturing'
  | 'commercial'
  | 'safety'
  | 'labeling'
  | 'post-marketing'
  | 'internal';

export type MilestoneStatus =
  | 'planned'
  | 'on-track'
  | 'at-risk'
  | 'delayed'
  | 'completed'
  | 'cancelled';

export interface RegulatoryMilestone {
  id: string;
  
  // Identification
  title: string;
  description?: string;
  category: MilestoneCategory;
  
  // Target
  targetDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  
  // Dependencies
  predecessorIds: string[];
  successorIds: string[];
  criticalPath: boolean;
  
  // Scope
  productId?: string;
  productName?: string;
  programId?: string;
  submissionId?: string;
  agency?: RegulatoryAgencyId;
  region?: RegulatedRegion;
  
  // Ownership
  owner: string;
  stakeholders: string[];
  
  // Progress
  percentComplete: number;
  blockers?: string[];
  risks?: string[];
  
  // Documents
  deliverableIds: string[];
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DEADLINE TYPES
// ============================================================================

export type RegulatoryDeadlineType =
  | 'pdufa-goal-date'      // PDUFA action date
  | 'ema-opinion-date'     // CHMP opinion date
  | 'briefing-document'    // Meeting briefing doc due
  | 'response-due'         // HAQ/IR response due
  | 'commitment'           // Post-approval commitment
  | 'annual-report'        // Annual report due
  | 'periodic-report'      // PSUR/PBRER/DSUR due
  | 'inspection-response'  // GMP inspection response
  | 'fee-payment'          // User fee payment
  | 'renewal'              // License renewal
  | 'pediatric'            // Pediatric requirement
  | 'rems-assessment'      // REMS assessment
  | 'labeling-update'      // Labeling change deadline
  | 'variation'            // Variation submission
  | 'clock-date'           // Review clock milestone
  | 'internal';            // Internal deadline

export interface RegulatoryDeadline {
  id: string;
  
  // Identification
  title: string;
  description?: string;
  deadlineType: RegulatoryDeadlineType;
  priority: DeadlinePriority;
  
  // Timing
  dueDate: string;
  originalDueDate?: string;
  extensionGranted?: boolean;
  extensionDate?: string;
  completedDate?: string;
  
  // Status
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed' | 'extension-requested' | 'waived' | 'cancelled';
  daysUntilDue: number;
  
  // Source & Scope
  agency: RegulatoryAgencyId;
  region: RegulatedRegion;
  productId?: string;
  productName?: string;
  submissionId?: string;
  submissionNumber?: string;
  meetingId?: string;
  
  // Ownership
  owner: string;
  backupOwner?: string;
  notifyList: string[];
  
  // Regulatory basis
  regulatoryBasis?: string;  // e.g., "21 CFR 312.32"
  sourceDocumentId?: string;
  
  // Deliverables
  requiredDeliverables: string[];
  attachedDeliverables: string[];
  
  // Reminders
  reminders: DeadlineReminder[];
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineReminder {
  id: string;
  daysBeforeDue: number;
  reminderType: 'email' | 'in-app' | 'both' | 'escalation';
  recipients: string[];
  sent: boolean;
  sentDate?: string;
}

// ============================================================================
// CALENDAR EVENT (UNIFIED VIEW)
// ============================================================================

export type CalendarEventType =
  | 'meeting'
  | 'deadline'
  | 'milestone'
  | 'submission'
  | 'approval'
  | 'inspection'
  | 'conference'
  | 'internal'
  | 'reminder';

export interface CalendarEvent {
  id: string;
  
  // Display
  title: string;
  description?: string;
  eventType: CalendarEventType;
  color: string;            // For calendar display
  
  // Timing
  startDate: string;
  endDate?: string;
  allDay: boolean;
  timezone?: string;
  
  // Source reference
  sourceType: 'meeting' | 'deadline' | 'milestone' | 'manual';
  sourceId?: string;
  
  // Scope
  agency?: RegulatoryAgencyId;
  productId?: string;
  productName?: string;
  programId?: string;
  
  // Status
  status: 'scheduled' | 'tentative' | 'confirmed' | 'completed' | 'cancelled';
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string;
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CALENDAR VIEWS & FILTERS
// ============================================================================

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda' | 'timeline' | 'gantt';

export type CalendarFilterPreset = 
  | 'all'
  | 'my-items'
  | 'meetings-only'
  | 'deadlines-only'
  | 'milestones-only'
  | 'this-product'
  | 'critical-path'
  | 'overdue';

export interface CalendarFilters {
  eventTypes: CalendarEventType[];
  agencies: RegulatoryAgencyId[];
  products: string[];
  programs: string[];
  owners: string[];
  priorities: DeadlinePriority[];
  statuses: string[];
  dateRange: { from: string; to: string };
  searchText: string;
  showCompleted: boolean;
  showCancelled: boolean;
  preset?: CalendarFilterPreset;
}

// ============================================================================
// CALENDAR STATISTICS
// ============================================================================

export interface CalendarStatistics {
  // Counts
  totalMeetings: number;
  upcomingMeetings: number;
  meetingsThisMonth: number;
  
  totalDeadlines: number;
  upcomingDeadlines: number;
  overdueDeadlines: number;
  dueSoon: number;          // Next 7 days
  
  totalMilestones: number;
  milestonesOnTrack: number;
  milestonesAtRisk: number;
  milestonesDelayed: number;
  
  // By Agency
  meetingsByAgency: { agency: RegulatoryAgencyId; count: number }[];
  deadlinesByAgency: { agency: RegulatoryAgencyId; count: number }[];
  
  // By Type
  meetingsByType: { type: string; count: number }[];
  deadlinesByType: { type: RegulatoryDeadlineType; count: number }[];
  
  // By Status
  meetingsByStatus: { status: MeetingRequestStatus; count: number }[];
  deadlinesByStatus: { status: string; count: number }[];
  
  // Timeline
  eventsNext7Days: number;
  eventsNext30Days: number;
  eventsNext90Days: number;
  
  // Critical Items
  criticalDeadlines: RegulatoryDeadline[];
  criticalMilestones: RegulatoryMilestone[];
  upcomingPDUFADates: RegulatoryDeadline[];
}

// ============================================================================
// CALENDAR VIEWS (UI TAB MODES)
// ============================================================================

export type RegCalendarView =
  | 'calendar'      // Main calendar view
  | 'meetings'      // Meeting management
  | 'deadlines'     // Deadline management
  | 'milestones'    // Milestone tracking
  | 'timeline'      // Gantt/timeline view
  | 'analytics';    // Calendar analytics

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

export interface RegulatoryCalendarState {
  // Data
  meetings: RegulatoryMeeting[];
  deadlines: RegulatoryDeadline[];
  milestones: RegulatoryMilestone[];
  calendarEvents: CalendarEvent[];
  
  // Selections
  selectedMeetingId: string | null;
  selectedDeadlineId: string | null;
  selectedMilestoneId: string | null;
  selectedEventId: string | null;
  selectedDate: string | null;
  
  // UI State
  activeView: RegCalendarView;
  calendarViewMode: CalendarViewMode;
  filters: CalendarFilters;
  currentMonth: string;  // YYYY-MM format
  
  // Statistics cache
  statistics: CalendarStatistics | null;
  statisticsLastUpdated: string | null;
  
  // Loading
  isLoading: boolean;
  error: string | null;
}

export interface RegulatoryCalendarActions {
  // Meetings
  createMeeting: (meeting: Omit<RegulatoryMeeting, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMeeting: (id: string, updates: Partial<RegulatoryMeeting>) => void;
  deleteMeeting: (id: string) => void;
  updateMeetingStatus: (id: string, status: MeetingRequestStatus) => void;
  addMeetingAttendee: (meetingId: string, attendee: Omit<MeetingAttendee, 'id'>) => string;
  removeMeetingAttendee: (meetingId: string, attendeeId: string) => void;
  addMeetingQuestion: (meetingId: string, question: Omit<MeetingQuestion, 'id'>) => string;
  updateMeetingQuestion: (meetingId: string, questionId: string, updates: Partial<MeetingQuestion>) => void;
  recordAgencyResponse: (meetingId: string, response: Omit<AgencyResponse, 'id'>) => string;
  addMeetingActionItem: (meetingId: string, actionItem: Omit<MeetingActionItem, 'id'>) => string;
  updateMeetingActionItem: (meetingId: string, actionItemId: string, updates: Partial<MeetingActionItem>) => void;
  
  // Deadlines
  createDeadline: (deadline: Omit<RegulatoryDeadline, 'id' | 'createdAt' | 'updatedAt' | 'daysUntilDue'>) => string;
  updateDeadline: (id: string, updates: Partial<RegulatoryDeadline>) => void;
  deleteDeadline: (id: string) => void;
  completeDeadline: (id: string, completedBy: string) => void;
  requestExtension: (id: string, newDueDate: string, reason: string) => void;
  
  // Milestones
  createMilestone: (milestone: Omit<RegulatoryMilestone, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMilestone: (id: string, updates: Partial<RegulatoryMilestone>) => void;
  deleteMilestone: (id: string) => void;
  updateMilestoneProgress: (id: string, percentComplete: number) => void;
  completeMilestone: (id: string) => void;
  
  // Calendar Events
  createCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  syncMeetingToCalendar: (meetingId: string) => string;
  syncDeadlineToCalendar: (deadlineId: string) => string;
  syncMilestoneToCalendar: (milestoneId: string) => string;
  
  // Statistics
  refreshStatistics: () => CalendarStatistics;
  
  // UI Actions
  setActiveView: (view: RegCalendarView) => void;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
  setFilters: (filters: Partial<CalendarFilters>) => void;
  resetFilters: () => void;
  applyFilterPreset: (preset: CalendarFilterPreset) => void;
  setCurrentMonth: (month: string) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  selectDate: (date: string | null) => void;
  selectMeeting: (id: string | null) => void;
  selectDeadline: (id: string | null) => void;
  selectMilestone: (id: string | null) => void;
  selectEvent: (id: string | null) => void;
  
  // Data loading
  loadCalendarData: () => Promise<void>;
  
  // Export
  exportCalendar: (format: 'ics' | 'csv' | 'pdf', dateRange: { from: string; to: string }) => void;
  
  // Clear
  clearAll: () => void;
}

// ============================================================================
// COLOR MAPS
// ============================================================================

export const MEETING_TYPE_COLORS: Record<MeetingCategory, string> = {
  'fda': '#2563eb',        // Blue
  'ema': '#7c3aed',        // Purple
  'pmda': '#dc2626',       // Red
  'nmpa': '#ea580c',       // Orange
  'health-canada': '#16a34a', // Green
  'other-ha': '#6b7280',   // Gray
  'internal': '#0891b2',   // Cyan
};

export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  'meeting': '#2563eb',     // Blue
  'deadline': '#dc2626',    // Red
  'milestone': '#16a34a',   // Green
  'submission': '#7c3aed',  // Purple
  'approval': '#059669',    // Emerald
  'inspection': '#ea580c',  // Orange
  'conference': '#0891b2',  // Cyan
  'internal': '#6b7280',    // Gray
  'reminder': '#f59e0b',    // Amber
};

export const MEETING_STATUS_COLORS: Record<MeetingRequestStatus, string> = {
  'draft': 'slate',
  'internal-review': 'amber',
  'approved-to-submit': 'blue',
  'submitted': 'purple',
  'acknowledged': 'indigo',
  'date-proposed': 'cyan',
  'confirmed': 'green',
  'completed': 'emerald',
  'cancelled': 'slate',
  'denied': 'red',
};

export const DEADLINE_STATUS_COLORS: Record<string, string> = {
  'upcoming': 'blue',
  'due-soon': 'amber',
  'overdue': 'red',
  'completed': 'green',
  'extension-requested': 'purple',
  'waived': 'slate',
  'cancelled': 'slate',
};

export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  'planned': 'slate',
  'on-track': 'green',
  'at-risk': 'amber',
  'delayed': 'red',
  'completed': 'emerald',
  'cancelled': 'slate',
};

// ============================================================================
// FDA MEETING TYPE INFO
// ============================================================================

export const FDA_MEETING_INFO: Record<FDAMeetingType, { label: string; responseTime: number; description: string }> = {
  'type-a': { label: 'Type A', responseTime: 30, description: 'Meetings necessary to resolve disputes or address safety issues' },
  'type-b': { label: 'Type B', responseTime: 60, description: 'Pre-IND, EOP1, EOP2, pre-NDA/BLA meetings' },
  'type-c': { label: 'Type C', responseTime: 75, description: 'Other meetings not qualifying as Type A or B' },
  'type-d': { label: 'Type D', responseTime: 30, description: 'Breakthrough therapy or RTOR meetings' },
  'pre-ind': { label: 'Pre-IND', responseTime: 60, description: 'Meeting before IND submission' },
  'end-of-phase-1': { label: 'End of Phase 1', responseTime: 60, description: 'Meeting at end of Phase 1' },
  'end-of-phase-2': { label: 'End of Phase 2', responseTime: 60, description: 'Critical meeting at end of Phase 2' },
  'pre-nda': { label: 'Pre-NDA', responseTime: 60, description: 'Meeting before NDA submission' },
  'pre-bla': { label: 'Pre-BLA', responseTime: 60, description: 'Meeting before BLA submission' },
  'pre-submission': { label: 'Pre-Submission', responseTime: 60, description: 'General pre-submission meeting' },
  'advisory-committee': { label: 'Advisory Committee', responseTime: 90, description: 'FDA Advisory Committee meeting' },
  'pdufa': { label: 'PDUFA Goal Date', responseTime: 0, description: 'PDUFA action date' },
  'breakthrough': { label: 'Breakthrough Therapy', responseTime: 30, description: 'Breakthrough therapy designation meeting' },
  'rtor': { label: 'Real-Time Oncology Review', responseTime: 30, description: 'RTOR meeting' },
  'fast-track': { label: 'Fast Track', responseTime: 60, description: 'Fast Track designation meeting' },
  'accelerated': { label: 'Accelerated Approval', responseTime: 60, description: 'Accelerated approval pathway meeting' },
  'priority-review': { label: 'Priority Review', responseTime: 60, description: 'Priority Review discussion' },
  'rems': { label: 'REMS', responseTime: 75, description: 'Risk Evaluation and Mitigation Strategy meeting' },
  'pediatric': { label: 'Pediatric Study Plan', responseTime: 90, description: 'Pediatric study plan meeting' },
  'type-b-informal': { label: 'Type B Informal', responseTime: 60, description: 'Informal Type B meeting' },
};
