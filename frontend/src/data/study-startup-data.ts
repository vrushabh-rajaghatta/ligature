// =============================================================================
// Study Startup Orchestrator Mock Data (v0.37.0)
// =============================================================================

import type {
  StudyStartupState,
  WorkstreamStatus,
  WorkstreamType,
  BlockedSite,
  CriticalBlocker,
  ActivationProjection,
  TimelineState,
  TimelineSnapshot,
  StudyMilestone,
} from '@/store/studyStartupTypes';

// =============================================================================
// WORKSTREAM STATUS DATA
// =============================================================================

export const mockWorkstreams: Record<WorkstreamType, WorkstreamStatus> = {
  'translation': {
    type: 'translation',
    progressPercent: 75,
    isBottleneck: false,
    completed: 12,
    inProgress: 4,
    pending: 2,
    blocked: 0,
    total: 18,
    lastUpdate: '2026-01-28',
    projectedCompletion: '2026-02-15',
    completedLabel: 'Docs Ready',
    inProgressLabel: 'In Review',
    pendingLabel: 'Pending',
  },
  'budget-contracting': {
    type: 'budget-contracting',
    progressPercent: 95,
    isBottleneck: false,
    completed: 32,
    inProgress: 2,
    pending: 1,
    blocked: 0,
    total: 35,
    lastUpdate: '2026-01-29',
    projectedCompletion: '2026-02-05',
    completedLabel: 'Signed',
    inProgressLabel: 'In Negotiation',
    pendingLabel: 'Pending',
  },
  'regulatory-ethics': {
    type: 'regulatory-ethics',
    progressPercent: 51,
    isBottleneck: true, // THIS IS THE BOTTLENECK
    completed: 18,
    inProgress: 7,
    pending: 10,
    blocked: 3,
    total: 35,
    lastUpdate: '2026-01-27',
    projectedCompletion: '2026-03-10',
    completedLabel: 'Approved',
    inProgressLabel: 'Submitted',
    pendingLabel: 'Pending',
  },
  'qp-release': {
    type: 'qp-release',
    progressPercent: 100,
    isBottleneck: false,
    completed: 1,
    inProgress: 0,
    pending: 0,
    blocked: 0,
    total: 1,
    lastUpdate: '2026-01-15',
    projectedCompletion: '2026-01-15',
    completedLabel: 'Released',
    inProgressLabel: 'In QC',
    pendingLabel: 'Pending',
  },
  'site-qualification': {
    type: 'site-qualification',
    progressPercent: 80,
    isBottleneck: false,
    completed: 28,
    inProgress: 5,
    pending: 2,
    blocked: 0,
    total: 35,
    lastUpdate: '2026-01-28',
    projectedCompletion: '2026-02-20',
    completedLabel: 'Qualified',
    inProgressLabel: 'In Progress',
    pendingLabel: 'Not Started',
  },
  'supply-comparator': {
    type: 'supply-comparator',
    progressPercent: 86,
    isBottleneck: false,
    completed: 30,
    inProgress: 5,
    pending: 0,
    blocked: 0,
    total: 35,
    lastUpdate: '2026-01-29',
    projectedCompletion: '2026-02-18',
    completedLabel: 'Supplied',
    inProgressLabel: 'In Transit',
    pendingLabel: 'Pending',
  },
};

// =============================================================================
// BLOCKED SITES DATA
// =============================================================================

export const mockBlockedSites: BlockedSite[] = [
  {
    siteId: 'site-042',
    siteNumber: '042',
    siteName: 'Munich University Hospital',
    country: 'Germany',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'Ethics Committee approval pending',
    daysBlocked: 12,
    isOverdue: true,
    plannedSubjects: 15,
    principalInvestigator: 'Dr. Hans Mueller',
  },
  {
    siteId: 'site-043',
    siteNumber: '043',
    siteName: 'Berlin Charité',
    country: 'Germany',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'Ethics Committee approval pending',
    daysBlocked: 12,
    isOverdue: true,
    plannedSubjects: 18,
    principalInvestigator: 'Dr. Anna Schmidt',
  },
  {
    siteId: 'site-044',
    siteNumber: '044',
    siteName: 'Hamburg Medical Center',
    country: 'Germany',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'Ethics Committee approval pending',
    daysBlocked: 12,
    isOverdue: true,
    plannedSubjects: 12,
    principalInvestigator: 'Dr. Klaus Weber',
  },
  {
    siteId: 'site-018',
    siteNumber: '018',
    siteName: 'Hospital General Madrid',
    country: 'Spain',
    blockingWorkstream: 'budget-contracting',
    blockingReason: 'Contract negotiation - fair market value dispute',
    daysBlocked: 5,
    isOverdue: false,
    plannedSubjects: 20,
    principalInvestigator: 'Dr. Maria Garcia',
  },
  {
    siteId: 'site-019',
    siteNumber: '019',
    siteName: 'Hospital Clínic Barcelona',
    country: 'Spain',
    blockingWorkstream: 'translation',
    blockingReason: 'ICF translation under local review',
    daysBlocked: 3,
    isOverdue: false,
    plannedSubjects: 22,
    principalInvestigator: 'Dr. Carlos Rodriguez',
  },
  {
    siteId: 'site-025',
    siteNumber: '025',
    siteName: 'CHU Lyon',
    country: 'France',
    blockingWorkstream: 'site-qualification',
    blockingReason: 'IVRS access pending IT setup',
    daysBlocked: 2,
    isOverdue: false,
    plannedSubjects: 16,
    principalInvestigator: 'Dr. Pierre Dubois',
  },
  {
    siteId: 'site-033',
    siteNumber: '033',
    siteName: 'Ospedale San Raffaele',
    country: 'Italy',
    blockingWorkstream: 'supply-comparator',
    blockingReason: 'IP shipment delayed - customs clearance',
    daysBlocked: 4,
    isOverdue: false,
    plannedSubjects: 14,
    principalInvestigator: 'Dr. Giuseppe Rossi',
  },
  {
    siteId: 'site-051',
    siteNumber: '051',
    siteName: 'Tokyo University Hospital',
    country: 'Japan',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'IRB submission pending PMDA clarification',
    daysBlocked: 8,
    isOverdue: false,
    plannedSubjects: 25,
    principalInvestigator: 'Dr. Yuki Tanaka',
  },
  {
    siteId: 'site-052',
    siteNumber: '052',
    siteName: 'Osaka Medical Center',
    country: 'Japan',
    blockingWorkstream: 'translation',
    blockingReason: 'Protocol translation QC review',
    daysBlocked: 6,
    isOverdue: false,
    plannedSubjects: 20,
    principalInvestigator: 'Dr. Kenji Yamamoto',
  },
  {
    siteId: 'site-061',
    siteNumber: '061',
    siteName: 'Seoul National University',
    country: 'South Korea',
    blockingWorkstream: 'site-qualification',
    blockingReason: 'Investigator GCP training not complete',
    daysBlocked: 1,
    isOverdue: false,
    plannedSubjects: 18,
    principalInvestigator: 'Dr. Min-Jun Kim',
  },
  {
    siteId: 'site-071',
    siteNumber: '071',
    siteName: 'Royal Melbourne Hospital',
    country: 'Australia',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'HREC amendment review',
    daysBlocked: 7,
    isOverdue: false,
    plannedSubjects: 12,
    principalInvestigator: 'Dr. Sarah Thompson',
  },
  {
    siteId: 'site-081',
    siteNumber: '081',
    siteName: 'University of Cape Town',
    country: 'South Africa',
    blockingWorkstream: 'supply-comparator',
    blockingReason: 'Cold chain logistics - awaiting temperature data',
    daysBlocked: 3,
    isOverdue: false,
    plannedSubjects: 15,
    principalInvestigator: 'Dr. James Ndlovu',
  },
  {
    siteId: 'site-091',
    siteNumber: '091',
    siteName: 'Hospital das Clínicas São Paulo',
    country: 'Brazil',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'ANVISA registration pending',
    daysBlocked: 15,
    isOverdue: true,
    plannedSubjects: 30,
    principalInvestigator: 'Dr. Ana Silva',
  },
  {
    siteId: 'site-092',
    siteNumber: '092',
    siteName: 'Instituto Nacional de Cardiologia',
    country: 'Brazil',
    blockingWorkstream: 'budget-contracting',
    blockingReason: 'Payment terms negotiation',
    daysBlocked: 4,
    isOverdue: false,
    plannedSubjects: 22,
    principalInvestigator: 'Dr. Roberto Santos',
  },
  {
    siteId: 'site-101',
    siteNumber: '101',
    siteName: 'AIIMS New Delhi',
    country: 'India',
    blockingWorkstream: 'regulatory-ethics',
    blockingReason: 'CDSCO approval pending',
    daysBlocked: 10,
    isOverdue: false,
    plannedSubjects: 35,
    principalInvestigator: 'Dr. Priya Sharma',
  },
];

// =============================================================================
// CRITICAL BLOCKER
// =============================================================================

export const mockCriticalBlocker: CriticalBlocker = {
  type: 'regulatory-ethics',
  title: 'German Ethics Committee Approval Overdue',
  description: 'Ethics Committee approval for Germany (Sites 042, 043, 044) is 12 days overdue. This is blocking activation of 3 sites representing 45 planned subjects across Bavaria and Northern Germany regions.',
  affectedSiteIds: ['site-042', 'site-043', 'site-044'],
  affectedSiteCount: 3,
  affectedSubjects: 45,
  daysOverdue: 12,
  recommendedAction: 'Escalate to Regional Ethics Lead (Dr. Friedrich Bauer). Consider parallel submission to alternative committees or expedited review request citing patient access impact.',
  impactIfResolved: {
    newPredictedDate: '2026-02-28',
    daysSaved: 15,
    additionalSitesActivated: 3,
  },
};

// =============================================================================
// ACTIVATION PROJECTIONS
// =============================================================================

export const mockActivationProjections: ActivationProjection[] = [
  { date: '2025-11-15', sitesActivated: 2, cumulativeSites: 2, isActual: true },
  { date: '2025-12-01', sitesActivated: 3, cumulativeSites: 5, isActual: true },
  { date: '2025-12-15', sitesActivated: 4, cumulativeSites: 9, isActual: true },
  { date: '2026-01-05', sitesActivated: 3, cumulativeSites: 12, isActual: true },
  { date: '2026-01-29', sitesActivated: 0, cumulativeSites: 12, isActual: true }, // Today
  { date: '2026-02-10', sitesActivated: 4, cumulativeSites: 16, isActual: false },
  { date: '2026-02-25', sitesActivated: 6, cumulativeSites: 22, isActual: false },
  { date: '2026-03-10', sitesActivated: 8, cumulativeSites: 30, isActual: false },
  { date: '2026-03-25', sitesActivated: 5, cumulativeSites: 35, isActual: false },
];

// =============================================================================
// COMPLETE STUDY STARTUP STATE
// =============================================================================

export const mockStudyStartupState: StudyStartupState = {
  studyId: 'study-endura-1',
  studyTitle: 'ENDURA-1 Phase IIIA - Pulmonary Disease, Chronic Obstructive',
  protocolNumber: '222714',
  
  sitesActive: 12,
  sitesPending: 8,
  sitesBlocked: 15,
  sitesTotal: 35,
  
  predictedActivationDate: '2026-03-15',
  targetFPFVDate: '2026-03-31',
  daysToFPFV: 61,
  isOnTrack: true,
  
  criticalBlocker: mockCriticalBlocker,
  workstreams: mockWorkstreams,
  blockedSites: mockBlockedSites,
  activationProjections: mockActivationProjections,
  
  lastUpdated: '2026-01-29T10:30:00Z',
};

// =============================================================================
// TIMELINE SNAPSHOTS
// =============================================================================

export const mockMilestones: StudyMilestone[] = [
  {
    code: 'CSI',
    name: 'CSI',
    fullName: 'Clinical Study Initiation',
    baselineDate: '2025-08-29',
    actualDate: '2025-08-29',
    status: 'completed',
    position: 5,
  },
  {
    code: 'CPA',
    name: 'CPA',
    fullName: 'Clinical Protocol Approval',
    baselineDate: '2025-10-15',
    actualDate: '2025-10-15',
    status: 'completed',
    position: 15,
  },
  {
    code: 'FPA',
    name: 'FPA',
    fullName: 'First Patient Approval',
    baselineDate: '2025-11-01',
    actualDate: '2025-11-01',
    status: 'completed',
    position: 22,
  },
  {
    code: 'FSA',
    name: 'FSA',
    fullName: 'First Site Activated',
    baselineDate: '2025-11-15',
    actualDate: '2025-11-15',
    status: 'completed',
    position: 28,
  },
  {
    code: 'FSFV',
    name: 'FSFV',
    fullName: 'First Subject First Visit',
    baselineDate: '2026-03-31',
    actualDate: null,
    status: 'pending',
    position: 65,
  },
  {
    code: 'LSFV',
    name: 'LSFV',
    fullName: 'Last Subject First Visit',
    baselineDate: '2027-06-30',
    actualDate: null,
    status: 'projected',
    position: 95,
  },
];

export const mockTimelineSnapshots: Record<string, TimelineSnapshot> = {
  '2025-09-01': {
    date: '2025-09-01',
    label: 'Study Initiation',
    enrollment: {
      participants: { actual: 0, target: 160, planned: 0 },
      sites: { activated: 0, target: 35, planned: 2 },
      countries: { activated: 0, target: 17, planned: 3 },
    },
    kpis: {
      participantsVariance: 0,
      sitesVariance: 0,
      budgetSpent: 150000,
      budgetTotal: 3000000,
      budgetVariance: -5,
    },
  },
  '2025-11-15': {
    date: '2025-11-15',
    label: 'First Site Activated',
    enrollment: {
      participants: { actual: 0, target: 160, planned: 8 },
      sites: { activated: 2, target: 35, planned: 5 },
      countries: { activated: 2, target: 17, planned: 5 },
    },
    kpis: {
      participantsVariance: -100,
      sitesVariance: -60,
      budgetSpent: 450000,
      budgetTotal: 3000000,
      budgetVariance: 2,
    },
  },
  '2025-12-15': {
    date: '2025-12-15',
    label: 'End of Year',
    enrollment: {
      participants: { actual: 12, target: 160, planned: 25 },
      sites: { activated: 9, target: 35, planned: 12 },
      countries: { activated: 5, target: 17, planned: 8 },
    },
    kpis: {
      participantsVariance: -52,
      sitesVariance: -25,
      budgetSpent: 850000,
      budgetTotal: 3000000,
      budgetVariance: 8,
    },
  },
  '2026-01-29': {
    date: '2026-01-29',
    label: 'Today',
    enrollment: {
      participants: { actual: 61, target: 160, planned: 80 },
      sites: { activated: 12, target: 35, planned: 20 },
      countries: { activated: 8, target: 17, planned: 12 },
    },
    kpis: {
      participantsVariance: -23.75,
      sitesVariance: -40,
      budgetSpent: 1200000,
      budgetTotal: 3000000,
      budgetVariance: 15,
    },
  },
  '2026-03-15': {
    date: '2026-03-15',
    label: 'Projected - FSFV',
    enrollment: {
      participants: { actual: 96, target: 160, planned: 96 },
      sites: { activated: 30, target: 35, planned: 30 },
      countries: { activated: 14, target: 17, planned: 14 },
    },
    kpis: {
      participantsVariance: 0,
      sitesVariance: 0,
      budgetSpent: 1800000,
      budgetTotal: 3000000,
      budgetVariance: 10,
    },
  },
  '2026-06-30': {
    date: '2026-06-30',
    label: 'Projected - Mid Year',
    enrollment: {
      participants: { actual: 140, target: 160, planned: 140 },
      sites: { activated: 35, target: 35, planned: 35 },
      countries: { activated: 17, target: 17, planned: 17 },
    },
    kpis: {
      participantsVariance: 0,
      sitesVariance: 0,
      budgetSpent: 2400000,
      budgetTotal: 3000000,
      budgetVariance: 5,
    },
  },
};

export const mockTimelineState: TimelineState = {
  studyId: 'study-endura-1',
  startDate: '2025-08-01',
  endDate: '2027-12-31',
  currentDate: '2026-01-29',
  todayDate: '2026-01-29',
  mode: 'historical',
  milestones: mockMilestones,
  snapshots: mockTimelineSnapshots,
  currentSnapshot: mockTimelineSnapshots['2026-01-29'],
};

// =============================================================================
// HELPER: Get study startup state for a given study
// =============================================================================

export function getStudyStartupState(studyId: string): StudyStartupState {
  // In production, this would fetch from API/store
  // For now, return mock data
  return mockStudyStartupState;
}

export function getTimelineState(studyId: string): TimelineState {
  return mockTimelineState;
}

// =============================================================================
// HELPER: Identify critical blocker from blocked sites
// =============================================================================

export function identifyCriticalBlocker(blockedSites: BlockedSite[]): CriticalBlocker | null {
  if (blockedSites.length === 0) return null;
  
  // Group by workstream
  const byWorkstream: Record<WorkstreamType, BlockedSite[]> = {} as Record<WorkstreamType, BlockedSite[]>;
  
  for (const site of blockedSites) {
    if (!byWorkstream[site.blockingWorkstream]) {
      byWorkstream[site.blockingWorkstream] = [];
    }
    byWorkstream[site.blockingWorkstream].push(site);
  }
  
  // Score each workstream by impact (subjects × days blocked)
  let maxScore = 0;
  let criticalWorkstream: WorkstreamType | null = null;
  let criticalSites: BlockedSite[] = [];
  
  for (const [ws, sites] of Object.entries(byWorkstream) as [WorkstreamType, BlockedSite[]][]) {
    const score = sites.reduce((sum, s) => sum + (s.plannedSubjects * Math.max(s.daysBlocked, 1)), 0);
    if (score > maxScore) {
      maxScore = score;
      criticalWorkstream = ws;
      criticalSites = sites;
    }
  }
  
  if (!criticalWorkstream || criticalSites.length === 0) return null;
  
  const totalSubjects = criticalSites.reduce((sum, s) => sum + s.plannedSubjects, 0);
  const maxDaysOverdue = Math.max(...criticalSites.map(s => s.daysBlocked));
  const overdueCount = criticalSites.filter(s => s.isOverdue).length;
  
  // Generate description based on workstream
  const workstreamNames: Record<WorkstreamType, string> = {
    'translation': 'Document translation',
    'budget-contracting': 'Budget & contracting',
    'regulatory-ethics': 'Ethics Committee approval',
    'qp-release': 'QP batch release',
    'site-qualification': 'Site qualification',
    'supply-comparator': 'IP/comparator supply',
  };
  
  const countries = Array.from(new Set(criticalSites.map(s => s.country)));
  
  return {
    type: criticalWorkstream,
    title: `${workstreamNames[criticalWorkstream]} ${overdueCount > 0 ? 'Overdue' : 'Pending'}`,
    description: `${workstreamNames[criticalWorkstream]} for ${countries.join(', ')} (${criticalSites.length} sites) is ${maxDaysOverdue} days ${overdueCount > 0 ? 'overdue' : 'in progress'}. This is blocking activation of ${criticalSites.length} sites representing ${totalSubjects} planned subjects.`,
    affectedSiteIds: criticalSites.map(s => s.siteId),
    affectedSiteCount: criticalSites.length,
    affectedSubjects: totalSubjects,
    daysOverdue: maxDaysOverdue,
    recommendedAction: generateRecommendation(criticalWorkstream, criticalSites),
    impactIfResolved: {
      newPredictedDate: '2026-02-28',
      daysSaved: Math.min(maxDaysOverdue, 15),
      additionalSitesActivated: criticalSites.length,
    },
  };
}

function generateRecommendation(workstream: WorkstreamType, sites: BlockedSite[]): string {
  const recommendations: Record<WorkstreamType, string> = {
    'translation': 'Expedite local review by engaging backup translators or requesting parallel QC.',
    'budget-contracting': 'Escalate to finance leadership. Consider standard terms with post-hoc adjustment for outlier negotiations.',
    'regulatory-ethics': 'Escalate to Regional Ethics Lead. Consider parallel submission to alternative committees or expedited review request.',
    'qp-release': 'Coordinate with QA to prioritize batch release. Review any outstanding deviations blocking release.',
    'site-qualification': 'Fast-track system access requests. Deploy on-site training if needed.',
    'supply-comparator': 'Coordinate with logistics to expedite shipment. Consider alternative depot if customs delayed.',
  };
  
  return recommendations[workstream] || 'Review blocking issues and escalate as needed.';
}

// =============================================================================
// PROTOCOL DESIGN DATA (v0.37.1)
// Visual protocol structure for design diagram
// =============================================================================

export interface ProtocolArm {
  id: string;
  name: string;
  shortName: string;
  type: 'experimental' | 'comparator' | 'placebo';
  dosing: string;
  schedule: string;
  targetEnrollment: number;
  actualEnrollment: number;
  status: 'active' | 'completed' | 'paused';
}

export interface ProtocolCohort {
  id: string;
  armId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'recruiting' | 'active' | 'follow-up' | 'completed';
  enrolled: number;
  target: number;
  interimAnalysis?: string;
}

export interface ProtocolAmendment {
  version: string;
  date: string;
  summary: string;
  status: 'approved' | 'pending' | 'superseded';
}

export const mockProtocolArms: ProtocolArm[] = [
  {
    id: 'arm-1',
    name: 'LIG-2847 Monotherapy Q3W',
    shortName: 'MONO-Q3W',
    type: 'experimental',
    dosing: '200mg IV Q3W',
    schedule: 'Every 3 weeks',
    targetEnrollment: 50,
    actualEnrollment: 22,
    status: 'active',
  },
  {
    id: 'arm-2',
    name: 'LIG-2847 Monotherapy Q2W',
    shortName: 'MONO-Q2W',
    type: 'experimental',
    dosing: '150mg IV Q2W',
    schedule: 'Every 2 weeks',
    targetEnrollment: 50,
    actualEnrollment: 19,
    status: 'active',
  },
  {
    id: 'arm-3',
    name: 'LIG-2847 + SOC Combination Q3W',
    shortName: 'COMB-Q3W',
    type: 'experimental',
    dosing: '200mg IV Q3W + Pembrolizumab',
    schedule: 'Every 3 weeks',
    targetEnrollment: 60,
    actualEnrollment: 20,
    status: 'active',
  },
];

export const mockProtocolCohorts: ProtocolCohort[] = [
  {
    id: 'cohort-1a',
    armId: 'arm-1',
    name: 'MONO-Q3W Dose Escalation',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    status: 'active',
    enrolled: 12,
    target: 20,
  },
  {
    id: 'cohort-1b',
    armId: 'arm-1',
    name: 'MONO-Q3W Expansion',
    startDate: '2026-01-15',
    endDate: '2027-03-31',
    status: 'recruiting',
    enrolled: 10,
    target: 30,
    interimAnalysis: '2026-06-15',
  },
  {
    id: 'cohort-2a',
    armId: 'arm-2',
    name: 'MONO-Q2W Dose Escalation',
    startDate: '2025-10-01',
    endDate: '2026-07-31',
    status: 'active',
    enrolled: 10,
    target: 18,
  },
  {
    id: 'cohort-2b',
    armId: 'arm-2',
    name: 'MONO-Q2W Expansion',
    startDate: '2026-02-01',
    endDate: '2027-04-30',
    status: 'recruiting',
    enrolled: 9,
    target: 32,
  },
  {
    id: 'cohort-3a',
    armId: 'arm-3',
    name: 'COMB-Q3W Safety Run-In',
    startDate: '2025-11-01',
    endDate: '2026-04-30',
    status: 'active',
    enrolled: 8,
    target: 12,
  },
  {
    id: 'cohort-3b',
    armId: 'arm-3',
    name: 'COMB-Q3W Expansion',
    startDate: '2026-03-01',
    endDate: '2027-06-30',
    status: 'recruiting',
    enrolled: 12,
    target: 48,
    interimAnalysis: '2026-09-15',
  },
];

export const mockProtocolAmendments: ProtocolAmendment[] = [
  {
    version: '1.0',
    date: '2025-06-15',
    summary: 'Original protocol',
    status: 'superseded',
  },
  {
    version: '2.0',
    date: '2025-09-01',
    summary: 'Added Q2W dosing arm, updated exclusion criteria',
    status: 'superseded',
  },
  {
    version: '3.0',
    date: '2025-12-10',
    summary: 'Added combination therapy arm with pembrolizumab, expanded age range',
    status: 'approved',
  },
  {
    version: '3.1',
    date: '2026-01-20',
    summary: 'ICF language clarification for German sites (in review)',
    status: 'pending',
  },
];
