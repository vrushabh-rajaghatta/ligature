
// =============================================================================
// Study Startup Orchestrator Types (v0.37.0)
// Based on GSK Flight Deck "Coordinating Agents" architecture
// =============================================================================

// =============================================================================
// WORKSTREAM TYPES
// =============================================================================

export type WorkstreamType =
  | 'translation'
  | 'budget-contracting'
  | 'regulatory-ethics'
  | 'qp-release'
  | 'site-qualification'
  | 'supply-comparator';

export interface WorkstreamMeta {
  type: WorkstreamType;
  name: string;
  shortName: string;
  description: string;
  icon: string; // Lucide icon name
  color: 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'red' | 'emerald' | 'cyan';
}

export const WORKSTREAM_META: Record<WorkstreamType, WorkstreamMeta> = {
  'translation': {
    type: 'translation',
    name: 'Translation',
    shortName: 'Translation',
    description: 'Translates required study documents and gets them locally reviewed and certified for regulatory use.',
    icon: 'Languages',
    color: 'blue',
  },
  'budget-contracting': {
    type: 'budget-contracting',
    name: 'Budget & Contracting',
    shortName: 'Contracts',
    description: 'Finalizes site budgets and contracts by auto-approving common terms and routing exceptions.',
    icon: 'Banknote',
    color: 'green',
  },
  'regulatory-ethics': {
    type: 'regulatory-ethics',
    name: 'Regulatory & Ethics',
    shortName: 'Ethics',
    description: 'Prepares, submits, and quality-checks regulatory and ethics documents to secure approvals quickly and compliantly.',
    icon: 'Scale',
    color: 'purple',
  },
  'qp-release': {
    type: 'qp-release',
    name: 'QP Release',
    shortName: 'QP Release',
    description: 'Predicts when batches will be QP-released so supply and activation can be timed correctly.',
    icon: 'PackageCheck',
    color: 'amber',
  },
  'site-qualification': {
    type: 'site-qualification',
    name: 'Site Qualification',
    shortName: 'Site Qual',
    description: 'Qualifies sites and ensures they have system access and operational readiness to activate.',
    icon: 'Building2',
    color: 'teal',
  },
  'supply-comparator': {
    type: 'supply-comparator',
    name: 'Supply & Comparator',
    shortName: 'Supply',
    description: 'Ensures investigational product and comparators arrive on site before activation.',
    icon: 'Truck',
    color: 'cyan',
  },
};

// =============================================================================
// WORKSTREAM STATUS
// =============================================================================

export interface WorkstreamStatus {
  type: WorkstreamType;
  progressPercent: number;
  isBottleneck: boolean;
  
  // Counts
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  total: number;
  
  // Key dates
  lastUpdate: string;
  projectedCompletion: string;
  
  // Workstream-specific labels
  completedLabel: string;
  inProgressLabel: string;
  pendingLabel: string;
}

// =============================================================================
// BLOCKED SITE
// =============================================================================

export interface BlockedSite {
  siteId: string;
  siteNumber: string;
  siteName: string;
  country: string;
  blockingWorkstream: WorkstreamType;
  blockingReason: string;
  daysBlocked: number;
  isOverdue: boolean;
  plannedSubjects: number;
  principalInvestigator: string;
}

// =============================================================================
// CRITICAL BLOCKER
// =============================================================================

export interface CriticalBlocker {
  type: WorkstreamType;
  title: string;
  description: string;
  affectedSiteIds: string[];
  affectedSiteCount: number;
  affectedSubjects: number;
  daysOverdue: number;
  recommendedAction: string;
  impactIfResolved: {
    newPredictedDate: string;
    daysSaved: number;
    additionalSitesActivated: number;
  };
}

// =============================================================================
// SITE ACTIVATION PROJECTION
// =============================================================================

export interface ActivationProjection {
  date: string;
  sitesActivated: number;
  cumulativeSites: number;
  isActual: boolean; // true = historical, false = projected
  cumulativeActivated?: number;
  isProjected?: boolean;
}

// =============================================================================
// STUDY STARTUP STATE
// =============================================================================

export interface StudyStartupState {
  studyId: string;
  studyTitle: string;
  protocolNumber: string;
  
  // Overall progress
  sitesActive: number;
  sitesPending: number;
  sitesBlocked: number;
  sitesTotal: number;
  
  // Predictions
  predictedActivationDate: string;
  targetFPFVDate: string;
  daysToFPFV: number;
  isOnTrack: boolean;
  
  // Critical blocker (AI-identified)
  criticalBlocker: CriticalBlocker | null;
  
  // Workstream status
  workstreams: Record<WorkstreamType, WorkstreamStatus>;
  
  // Site-level detail
  blockedSites: BlockedSite[];
  
  // Activation projections for timeline
  activationProjections: ActivationProjection[];
  
  // Last updated
  lastUpdated: string;
}

// =============================================================================
// TIMELINE SLIDER TYPES
// =============================================================================

export type MilestoneCode = 'CSI' | 'CPA' | 'FPA' | 'FSA' | 'FSFV' | 'LSFV';

export interface StudyMilestone {
  code: MilestoneCode;
  name: string;
  fullName: string;
  baselineDate: string;
  actualDate: string | null;
  status: 'completed' | 'pending' | 'overdue' | 'projected';
  position: number; // 0-100 for timeline positioning
}

export const MILESTONE_META: Record<MilestoneCode, { name: string; fullName: string }> = {
  'CSI': { name: 'CSI', fullName: 'Clinical Study Initiation' },
  'CPA': { name: 'CPA', fullName: 'Clinical Protocol Approval' },
  'FPA': { name: 'FPA', fullName: 'First Patient Approval' },
  'FSA': { name: 'FSA', fullName: 'First Site Activated' },
  'FSFV': { name: 'FSFV', fullName: 'First Subject First Visit' },
  'LSFV': { name: 'LSFV', fullName: 'Last Subject First Visit' },
};

export interface TimelineSnapshot {
  date: string;
  label: string;
  
  // Enrollment at this point
  enrollment: {
    participants: { actual: number; target: number; planned: number };
    sites: { activated: number; target: number; planned: number };
    countries: { activated: number; target: number; planned: number };
  };
  
  // KPIs with variance
  kpis: {
    participantsVariance: number; // percentage vs plan
    sitesVariance: number;
    budgetSpent: number;
    budgetTotal: number;
    budgetVariance: number;
  };
  
  // Arms at this point (for future arm-level timeline)
  arms?: Record<string, {
    enrolled: number;
    target: number;
    enrollmentPercent: number;
  }>;
}

export interface TimelineState {
  studyId: string;
  
  // Timeline range
  startDate: string;
  endDate: string;
  currentDate: string; // The scrubber position
  todayDate: string;
  
  // Mode
  mode: 'historical' | 'projected';
  
  // Milestones
  milestones: StudyMilestone[];
  
  // Snapshots at various dates
  snapshots: Record<string, TimelineSnapshot>;
  
  // Currently selected snapshot
  currentSnapshot: TimelineSnapshot | null;
}

// =============================================================================
// STORE ACTIONS
// =============================================================================

export interface StudyStartupActions {
  // Data loading
  loadStudyStartup: (studyId: string) => void;
  refreshWorkstreams: () => void;
  
  // Blocker management
  identifyCriticalBlocker: () => CriticalBlocker | null;
  dismissBlocker: (blockerId: string) => void;
  
  // Site actions
  selectBlockedSite: (siteId: string) => void;
  navigateToSite: (siteId: string) => void;
}

export interface TimelineActions {
  // Scrubber
  setCurrentDate: (date: string) => void;
  resetToToday: () => void;
  
  // Mode
  setMode: (mode: 'historical' | 'projected') => void;
  
  // Snapshot
  getSnapshotForDate: (date: string) => TimelineSnapshot | null;
}
