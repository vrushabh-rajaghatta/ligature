


import { create } from 'zustand';
import { useMemo } from 'react';
import { usePortfolioStore, Application, Program, Sequence } from '@/stores/portfolio-store';
import { useHAQStore } from './useHAQStore';
import { useHAQCorrespondenceBridge, CorrespondencePackage, CorrespondenceStatus } from './useHAQCorrespondenceBridge';
import { HAQuestion, HAQStatus, HAQPriority, HAQDiscipline } from '@/types/haq';

// ============================================================================
// TYPES
// ============================================================================

export type SubmissionReadiness = 
  | 'ready'           // All HAQs resolved, no blockers
  | 'in-progress'     // Active work on responses
  | 'blocked'         // Critical HAQs overdue or unassigned
  | 'pending-review'  // Responses ready but awaiting approval
  | 'not-applicable'; // No open HAQs

export interface HAQSummary {
  total: number;
  byStatus: Record<HAQStatus, number>;
  byPriority: Record<HAQPriority, number>;
  byDiscipline: Partial<Record<HAQDiscipline, number>>;
  overdue: number;
  dueSoon: number;     // Within 7 days
  criticalOpen: number;
  avgDaysToResponse: number | null;
}

export interface CorrespondenceSummary {
  total: number;
  byStatus: Partial<Record<CorrespondenceStatus, number>>;
  pendingConversion: number;
  readyForSubmission: number;
  inProgress: number;
}

export interface ApplicationHAQStatus {
  applicationId: string;
  applicationNumber: string;
  applicationStatus: string;
  haqSummary: HAQSummary;
  correspondenceSummary: CorrespondenceSummary;
  submissionReadiness: SubmissionReadiness;
  nextDueDate: string | null;
  lastActivity: string | null;
}

export interface ProgramHAQStatus {
  programId: string;
  programCode: string;
  programName: string;
  applications: ApplicationHAQStatus[];
  aggregateHAQSummary: HAQSummary;
  aggregateCorrespondenceSummary: CorrespondenceSummary;
  overallReadiness: SubmissionReadiness;
  urgentItems: number;  // Items needing immediate attention
}

export interface PortfolioHAQOverview {
  programs: ProgramHAQStatus[];
  totals: {
    totalHAQs: number;
    openHAQs: number;
    overdueHAQs: number;
    criticalHAQs: number;
    pendingCorrespondence: number;
    readyToSubmit: number;
  };
  alerts: PortfolioAlert[];
}

export interface PortfolioAlert {
  id: string;
  type: 'overdue' | 'due-soon' | 'unassigned' | 'blocked' | 'ready';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  programCode: string;
  applicationNumber: string;
  itemCount: number;
  dueDate?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const emptyHAQSummary = (): HAQSummary => ({
  total: 0,
  byStatus: {
    'new': 0,
    'open': 0,
    'in-progress': 0,
    'draft-ready': 0,
    'under-review': 0,
    'partially-responded': 0,
    'submitted': 0,
    'closed': 0,
  },
  byPriority: {
    'critical': 0,
    'major': 0,
    'minor': 0,
  },
  byDiscipline: {},
  overdue: 0,
  dueSoon: 0,
  criticalOpen: 0,
  avgDaysToResponse: null,
});

const emptyCorrespondenceSummary = (): CorrespondenceSummary => ({
  total: 0,
  byStatus: {},
  pendingConversion: 0,
  readyForSubmission: 0,
  inProgress: 0,
});

const calculateDaysUntil = (dateStr: string): number => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isOverdue = (dateStr: string): boolean => calculateDaysUntil(dateStr) < 0;
const isDueSoon = (dateStr: string): boolean => {
  const days = calculateDaysUntil(dateStr);
  return days >= 0 && days <= 7;
};

const determineSubmissionReadiness = (
  haqSummary: HAQSummary,
  corrSummary: CorrespondenceSummary
): SubmissionReadiness => {
  // No open HAQs = not applicable
  const openStatuses: HAQStatus[] = ['new', 'open', 'in-progress', 'draft-ready', 'under-review', 'partially-responded'];
  const totalOpen = openStatuses.reduce((sum, s) => sum + haqSummary.byStatus[s], 0);
  
  if (totalOpen === 0 && corrSummary.total === 0) {
    return 'not-applicable';
  }
  
  // Blocked if critical items are overdue or unassigned
  if (haqSummary.overdue > 0 && haqSummary.criticalOpen > 0) {
    return 'blocked';
  }
  
  // Ready if all are in submitted/closed and correspondence ready
  if (corrSummary.readyForSubmission > 0 && haqSummary.byStatus['submitted'] + haqSummary.byStatus['closed'] === haqSummary.total) {
    return 'ready';
  }
  
  // Pending review if we have draft-ready or under-review items
  if (haqSummary.byStatus['draft-ready'] > 0 || haqSummary.byStatus['under-review'] > 0) {
    return 'pending-review';
  }
  
  // Otherwise in progress
  return 'in-progress';
};

const aggregateSummaries = (summaries: HAQSummary[]): HAQSummary => {
  const result = emptyHAQSummary();
  
  let responseDaysTotal = 0;
  let responseDaysCount = 0;
  
  summaries.forEach(s => {
    result.total += s.total;
    result.overdue += s.overdue;
    result.dueSoon += s.dueSoon;
    result.criticalOpen += s.criticalOpen;
    
    Object.keys(s.byStatus).forEach(status => {
      result.byStatus[status as HAQStatus] += s.byStatus[status as HAQStatus];
    });
    
    Object.keys(s.byPriority).forEach(priority => {
      result.byPriority[priority as HAQPriority] += s.byPriority[priority as HAQPriority];
    });
    
    Object.keys(s.byDiscipline).forEach(disc => {
      const d = disc as HAQDiscipline;
      result.byDiscipline[d] = (result.byDiscipline[d] || 0) + (s.byDiscipline[d] || 0);
    });
    
    if (s.avgDaysToResponse !== null) {
      responseDaysTotal += s.avgDaysToResponse * s.total;
      responseDaysCount += s.total;
    }
  });
  
  if (responseDaysCount > 0) {
    result.avgDaysToResponse = Math.round(responseDaysTotal / responseDaysCount);
  }
  
  return result;
};

const aggregateCorrespondenceSummaries = (summaries: CorrespondenceSummary[]): CorrespondenceSummary => {
  const result = emptyCorrespondenceSummary();
  
  summaries.forEach(s => {
    result.total += s.total;
    result.pendingConversion += s.pendingConversion;
    result.readyForSubmission += s.readyForSubmission;
    result.inProgress += s.inProgress;
    
    Object.keys(s.byStatus).forEach(status => {
      const st = status as CorrespondenceStatus;
      result.byStatus[st] = (result.byStatus[st] || 0) + (s.byStatus[st] || 0);
    });
  });
  
  return result;
};

// ============================================================================
// STORE
// ============================================================================

interface PortfolioHAQIntegrationState {
  // Computed data
  getApplicationHAQStatus: (applicationId: string) => ApplicationHAQStatus | null;
  getProgramHAQStatus: (programId: string) => ProgramHAQStatus | null;
  getPortfolioOverview: () => PortfolioHAQOverview;
  
  // Specific queries
  getOverdueHAQsByApplication: (applicationId: string) => HAQuestion[];
  getCriticalHAQsByProgram: (programId: string) => HAQuestion[];
  getPendingCorrespondenceByApplication: (applicationId: string) => CorrespondencePackage[];
  
  // Alerts
  getPortfolioAlerts: () => PortfolioAlert[];
  getProgramAlerts: (programId: string) => PortfolioAlert[];
}

export const usePortfolioHAQIntegration = create<PortfolioHAQIntegrationState>()((set, get) => ({
  
  getApplicationHAQStatus: (applicationId: string): ApplicationHAQStatus | null => {
    const portfolioStore = usePortfolioStore.getState();
    const haqStore = useHAQStore.getState();
    const corrBridge = useHAQCorrespondenceBridge.getState();
    
    const application = portfolioStore.applications.find(a => a.id === applicationId);
    if (!application) return null;
    
    // Get HAQs for this application
    const appHAQs = haqStore.haqs.filter(h => h.applicationId === applicationId);
    
    // Build HAQ summary
    const haqSummary = emptyHAQSummary();
    haqSummary.total = appHAQs.length;
    
    let responseDaysTotal = 0;
    let responseDaysCount = 0;
    
    appHAQs.forEach(haq => {
      haqSummary.byStatus[haq.status]++;
      haqSummary.byPriority[haq.priority]++;
      haqSummary.byDiscipline[haq.discipline] = (haqSummary.byDiscipline[haq.discipline] || 0) + 1;
      
      if (isOverdue(haq.dueDate) && !['submitted', 'closed'].includes(haq.status)) {
        haqSummary.overdue++;
      }
      
      if (isDueSoon(haq.dueDate) && !['submitted', 'closed'].includes(haq.status)) {
        haqSummary.dueSoon++;
      }
      
      if (haq.priority === 'critical' && !['submitted', 'closed'].includes(haq.status)) {
        haqSummary.criticalOpen++;
      }
      
      if (haq.submittedDate && haq.receivedDate) {
        const received = new Date(haq.receivedDate);
        const submitted = new Date(haq.submittedDate);
        const days = Math.ceil((submitted.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
        responseDaysTotal += days;
        responseDaysCount++;
      }
    });
    
    if (responseDaysCount > 0) {
      haqSummary.avgDaysToResponse = Math.round(responseDaysTotal / responseDaysCount);
    }
    
    // Get correspondence for this application
    const appCorr = corrBridge.correspondencePackages.filter(p => p.applicationId === applicationId);
    
    const corrSummary = emptyCorrespondenceSummary();
    corrSummary.total = appCorr.length;
    
    appCorr.forEach(pkg => {
      corrSummary.byStatus[pkg.status] = (corrSummary.byStatus[pkg.status] || 0) + 1;
      
      if (pkg.status === 'draft' || pkg.status === 'in-preparation') {
        corrSummary.inProgress++;
      }
      if (pkg.status === 'ready-for-submission') {
        corrSummary.readyForSubmission++;
      }
    });
    
    // Count pending conversions (HAQs that could become correspondence)
    const pendingHandoffs = appHAQs.filter(h => 
      h.status === 'draft-ready' && !corrBridge.haqToPackageMap[h.id]
    ).length;
    corrSummary.pendingConversion = pendingHandoffs;
    
    // Find next due date
    const openHAQs = appHAQs.filter(h => !['submitted', 'closed'].includes(h.status));
    const nextDueDate = openHAQs.length > 0 
      ? openHAQs.reduce((min, h) => h.dueDate < min ? h.dueDate : min, openHAQs[0].dueDate)
      : null;
    
    // Find last activity
    const lastActivity = appHAQs.length > 0
      ? appHAQs.reduce((max, h) => h.updatedAt > max ? h.updatedAt : max, appHAQs[0].updatedAt)
      : null;
    
    return {
      applicationId,
      applicationNumber: application.applicationNumber,
      applicationStatus: application.status,
      haqSummary,
      correspondenceSummary: corrSummary,
      submissionReadiness: determineSubmissionReadiness(haqSummary, corrSummary),
      nextDueDate,
      lastActivity,
    };
  },
  
  getProgramHAQStatus: (programId: string): ProgramHAQStatus | null => {
    const portfolioStore = usePortfolioStore.getState();
    const program = portfolioStore.programs.find(p => p.id === programId);
    if (!program) return null;
    
    const programApps = portfolioStore.applications.filter(a => a.programId === programId);
    
    const applicationStatuses = programApps
      .map(app => get().getApplicationHAQStatus(app.id))
      .filter((s): s is ApplicationHAQStatus => s !== null);
    
    const aggregateHAQ = aggregateSummaries(applicationStatuses.map(s => s.haqSummary));
    const aggregateCorr = aggregateCorrespondenceSummaries(applicationStatuses.map(s => s.correspondenceSummary));
    
    // Determine overall readiness - worst of all applications
    let overallReadiness: SubmissionReadiness = 'not-applicable';
    const readinessOrder: SubmissionReadiness[] = ['blocked', 'in-progress', 'pending-review', 'ready', 'not-applicable'];
    
    applicationStatuses.forEach(appStatus => {
      const currentIdx = readinessOrder.indexOf(overallReadiness);
      const appIdx = readinessOrder.indexOf(appStatus.submissionReadiness);
      if (appIdx < currentIdx) {
        overallReadiness = appStatus.submissionReadiness;
      }
    });
    
    // Count urgent items (overdue + critical open + due soon)
    const urgentItems = aggregateHAQ.overdue + aggregateHAQ.criticalOpen + aggregateHAQ.dueSoon;
    
    return {
      programId,
      programCode: program.code,
      programName: program.name,
      applications: applicationStatuses,
      aggregateHAQSummary: aggregateHAQ,
      aggregateCorrespondenceSummary: aggregateCorr,
      overallReadiness,
      urgentItems,
    };
  },
  
  getPortfolioOverview: (): PortfolioHAQOverview => {
    const portfolioStore = usePortfolioStore.getState();
    
    const programStatuses = portfolioStore.programs
      .map(p => get().getProgramHAQStatus(p.id))
      .filter((s): s is ProgramHAQStatus => s !== null);
    
    const allHAQSummaries = programStatuses.map(p => p.aggregateHAQSummary);
    const allCorrSummaries = programStatuses.map(p => p.aggregateCorrespondenceSummary);
    
    const totalHAQ = aggregateSummaries(allHAQSummaries);
    const totalCorr = aggregateCorrespondenceSummaries(allCorrSummaries);
    
    const openStatuses: HAQStatus[] = ['new', 'open', 'in-progress', 'draft-ready', 'under-review', 'partially-responded'];
    const openHAQs = openStatuses.reduce((sum, s) => sum + totalHAQ.byStatus[s], 0);
    
    return {
      programs: programStatuses,
      totals: {
        totalHAQs: totalHAQ.total,
        openHAQs,
        overdueHAQs: totalHAQ.overdue,
        criticalHAQs: totalHAQ.criticalOpen,
        pendingCorrespondence: totalCorr.pendingConversion + totalCorr.inProgress,
        readyToSubmit: totalCorr.readyForSubmission,
      },
      alerts: get().getPortfolioAlerts(),
    };
  },
  
  getOverdueHAQsByApplication: (applicationId: string): HAQuestion[] => {
    const haqStore = useHAQStore.getState();
    return haqStore.haqs.filter(h => 
      h.applicationId === applicationId &&
      !['submitted', 'closed'].includes(h.status) &&
      isOverdue(h.dueDate)
    );
  },
  
  getCriticalHAQsByProgram: (programId: string): HAQuestion[] => {
    const portfolioStore = usePortfolioStore.getState();
    const haqStore = useHAQStore.getState();
    
    const programApps = portfolioStore.applications
      .filter(a => a.programId === programId)
      .map(a => a.id);
    
    return haqStore.haqs.filter(h =>
      programApps.includes(h.applicationId) &&
      h.priority === 'critical' &&
      !['submitted', 'closed'].includes(h.status)
    );
  },
  
  getPendingCorrespondenceByApplication: (applicationId: string): CorrespondencePackage[] => {
    const corrBridge = useHAQCorrespondenceBridge.getState();
    return corrBridge.correspondencePackages.filter(p => 
      p.applicationId === applicationId &&
      !['submitted'].includes(p.status)
    );
  },
  
  getPortfolioAlerts: (): PortfolioAlert[] => {
    const portfolioStore = usePortfolioStore.getState();
    const haqStore = useHAQStore.getState();
    const corrBridge = useHAQCorrespondenceBridge.getState();
    
    const alerts: PortfolioAlert[] = [];
    let alertId = 0;
    
    // Group HAQs by application
    const haqsByApp = new Map<string, HAQuestion[]>();
    haqStore.haqs.forEach(haq => {
      const existing = haqsByApp.get(haq.applicationId) || [];
      existing.push(haq);
      haqsByApp.set(haq.applicationId, existing);
    });
    
    // Process each application
    portfolioStore.applications.forEach(app => {
      const program = portfolioStore.programs.find(p => p.id === app.programId);
      if (!program) return;
      
      const appHAQs = haqsByApp.get(app.id) || [];
      
      // Overdue alerts
      const overdueHAQs = appHAQs.filter(h => 
        !['submitted', 'closed'].includes(h.status) && isOverdue(h.dueDate)
      );
      if (overdueHAQs.length > 0) {
        const hasCritical = overdueHAQs.some(h => h.priority === 'critical');
        alerts.push({
          id: `alert-${++alertId}`,
          type: 'overdue',
          severity: hasCritical ? 'critical' : 'warning',
          message: `${overdueHAQs.length} overdue HAQ${overdueHAQs.length > 1 ? 's' : ''} requiring immediate attention`,
          programCode: program.code,
          applicationNumber: app.applicationNumber,
          itemCount: overdueHAQs.length,
        });
      }
      
      // Due soon alerts
      const dueSoonHAQs = appHAQs.filter(h =>
        !['submitted', 'closed'].includes(h.status) && isDueSoon(h.dueDate)
      );
      if (dueSoonHAQs.length > 0) {
        const nearestDue = dueSoonHAQs.reduce((min, h) => h.dueDate < min ? h.dueDate : min, dueSoonHAQs[0].dueDate);
        alerts.push({
          id: `alert-${++alertId}`,
          type: 'due-soon',
          severity: 'warning',
          message: `${dueSoonHAQs.length} HAQ${dueSoonHAQs.length > 1 ? 's' : ''} due within 7 days`,
          programCode: program.code,
          applicationNumber: app.applicationNumber,
          itemCount: dueSoonHAQs.length,
          dueDate: nearestDue,
        });
      }
      
      // Unassigned critical HAQs
      const unassignedCritical = appHAQs.filter(h =>
        h.priority === 'critical' &&
        !['submitted', 'closed'].includes(h.status) &&
        !h.assignedTo
      );
      if (unassignedCritical.length > 0) {
        alerts.push({
          id: `alert-${++alertId}`,
          type: 'unassigned',
          severity: 'critical',
          message: `${unassignedCritical.length} critical HAQ${unassignedCritical.length > 1 ? 's' : ''} not yet assigned`,
          programCode: program.code,
          applicationNumber: app.applicationNumber,
          itemCount: unassignedCritical.length,
        });
      }
      
      // Ready for submission alerts (positive)
      const appCorr = corrBridge.correspondencePackages.filter(p => p.applicationId === app.id);
      const readyPackages = appCorr.filter(p => p.status === 'ready-for-submission');
      if (readyPackages.length > 0) {
        alerts.push({
          id: `alert-${++alertId}`,
          type: 'ready',
          severity: 'info',
          message: `${readyPackages.length} correspondence package${readyPackages.length > 1 ? 's' : ''} ready for submission`,
          programCode: program.code,
          applicationNumber: app.applicationNumber,
          itemCount: readyPackages.length,
        });
      }
    });
    
    // Sort by severity (critical first) then by type
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return alerts;
  },
  
  getProgramAlerts: (programId: string): PortfolioAlert[] => {
    const portfolioStore = usePortfolioStore.getState();
    const program = portfolioStore.programs.find(p => p.id === programId);
    if (!program) return [];
    
    return get().getPortfolioAlerts().filter(a => a.programCode === program.code);
  },
}));

// ============================================================================
// HOOKS
// ============================================================================

export const useApplicationHAQStatus = (applicationId: string) => {
  const getApplicationHAQStatus = usePortfolioHAQIntegration(state => state.getApplicationHAQStatus);
  return useMemo(() => getApplicationHAQStatus(applicationId), [getApplicationHAQStatus, applicationId]);
};

export const useProgramHAQStatus = (programId: string) => {
  const getProgramHAQStatus = usePortfolioHAQIntegration(state => state.getProgramHAQStatus);
  return useMemo(() => getProgramHAQStatus(programId), [getProgramHAQStatus, programId]);
};

export const usePortfolioOverview = () => {
  const getPortfolioOverview = usePortfolioHAQIntegration(state => state.getPortfolioOverview);
  return useMemo(() => getPortfolioOverview(), [getPortfolioOverview]);
};

export const usePortfolioAlerts = () => {
  const getPortfolioAlerts = usePortfolioHAQIntegration(state => state.getPortfolioAlerts);
  return useMemo(() => getPortfolioAlerts(), [getPortfolioAlerts]);
};

export const useProgramAlerts = (programId: string) => {
  const getProgramAlerts = usePortfolioHAQIntegration(state => state.getProgramAlerts);
  return useMemo(() => getProgramAlerts(programId), [getProgramAlerts, programId]);
};
