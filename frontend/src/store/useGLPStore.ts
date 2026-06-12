

// ============================================================================
// GLP Compliance Store - v0.13.66
// ============================================================================
// Zustand store for Good Laboratory Practice compliance management
// 21 CFR Part 58 compliant tracking for nonclinical studies
// ============================================================================

import { create } from 'zustand';
import {
  GLPState,
  GLPActions,
  GLPStudy,
  GLPDeviation,
  GLPAudit,
  GLPAuditFinding,
  GLPPersonnel,
  GLPTrainingRecord,
  GLPArchive,
  GLPArchiveCustodyEvent,
  GLPTestFacility,
  GLPEquipment,
  GLPCalibrationRecord,
  GLPComplianceMetrics,
  GLPActionItem,
  GLPTab,
  GLPStudyStatus,
  GLPStudyType,
  DeviationSeverity,
  DeviationStatus,
  AuditStatus,
  PersonnelRole,
} from './glpTypes';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: GLPState = {
  // Data
  studies: {},
  deviations: {},
  audits: {},
  personnel: {},
  trainingRequirements: {},
  archives: {},
  facilities: {},
  equipment: {},
  
  // Metrics
  complianceMetrics: null,
  actionItems: [],
  
  // UI State
  activeTab: 'dashboard',
  selectedStudyId: null,
  selectedDeviationId: null,
  selectedAuditId: null,
  selectedPersonnelId: null,
  selectedArchiveId: null,
  
  // Filters
  studyStatusFilter: 'all',
  studyTypeFilter: 'all',
  deviationSeverityFilter: 'all',
  deviationStatusFilter: 'all',
  auditStatusFilter: 'all',
  personnelRoleFilter: 'all',
  
  // Loading states
  isLoading: false,
  error: null,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateComplianceMetrics(state: GLPState): GLPComplianceMetrics {
  const studies = Object.values(state.studies);
  const deviations = Object.values(state.deviations);
  const audits = Object.values(state.audits);
  const personnel = Object.values(state.personnel);
  const equipment = Object.values(state.equipment);
  const archives = Object.values(state.archives);
  const facilities = Object.values(state.facilities);
  
  // Study metrics
  const activeStatuses: GLPStudyStatus[] = [
    'protocol-draft', 'protocol-approved', 'in-progress', 
    'in-life-complete', 'analysis', 'report-draft', 'report-qc'
  ];
  const activeStudies = studies.filter(s => activeStatuses.includes(s.status));
  
  // Deviation metrics
  const openDeviations = deviations.filter(d => d.status !== 'closed');
  const criticalDeviations = openDeviations.filter(d => d.severity === 'critical');
  const majorDeviations = openDeviations.filter(d => d.severity === 'major');
  
  // Calculate average closure time
  const closedDeviations = deviations.filter(d => d.status === 'closed' && d.closureDate);
  const avgClosureTime = closedDeviations.length > 0
    ? closedDeviations.reduce((sum, d) => {
        const discovered = new Date(d.dateDiscovered);
        const closed = new Date(d.closureDate!);
        return sum + (closed.getTime() - discovered.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / closedDeviations.length
    : 0;
  
  // Audit metrics
  const scheduledAudits = audits.filter(a => a.status === 'scheduled');
  const openFindings = audits.flatMap(a => a.findings.filter(f => f.status !== 'closed'));
  const overdueResponses = openFindings.filter(f => {
    if (!f.responseDeadline) return false;
    return new Date(f.responseDeadline) < new Date() && f.status === 'open';
  });
  
  // Personnel training metrics
  const activePersonnel = personnel.filter(p => p.active);
  const expiredTraining = activePersonnel.filter(p => p.trainingStatus === 'expired');
  const expiringTraining = activePersonnel.filter(p => p.trainingStatus === 'expiring-soon');
  const trainingComplianceRate = activePersonnel.length > 0
    ? ((activePersonnel.length - expiredTraining.length) / activePersonnel.length) * 100
    : 100;
  
  // Equipment calibration metrics
  const calibratedEquipment = equipment.filter(e => e.calibrationRequired);
  const outOfCalibration = calibratedEquipment.filter(e => e.calibrationStatus === 'overdue');
  const dueSoon = calibratedEquipment.filter(e => e.calibrationStatus === 'due-soon');
  const calibrationComplianceRate = calibratedEquipment.length > 0
    ? ((calibratedEquipment.length - outOfCalibration.length) / calibratedEquipment.length) * 100
    : 100;
  
  // Archive metrics
  const pendingArchives = archives.filter(a => a.status === 'pending');
  const retrievedArchives = archives.filter(a => a.status === 'retrieved');
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const upcomingDestructions = archives.filter(a => {
    const destructionDate = new Date(a.destructionEligibleDate);
    return destructionDate <= thirtyDaysFromNow && a.status === 'archived';
  });
  
  // Facility issues
  const facilitiesWithIssues = facilities.filter(f => 
    f.lastInspectionResult === 'failed' || 
    f.calibrationCompliance < 90
  );
  
  // Overall compliance score (weighted average)
  const weights = {
    training: 0.25,
    calibration: 0.25,
    deviations: 0.25,
    audits: 0.25,
  };
  
  const deviationScore = 100 - (criticalDeviations.length * 20) - (majorDeviations.length * 5);
  const auditScore = 100 - (openFindings.length * 3) - (overdueResponses.length * 10);
  
  const overallScore = Math.max(0, Math.min(100,
    (trainingComplianceRate * weights.training) +
    (calibrationComplianceRate * weights.calibration) +
    (Math.max(0, deviationScore) * weights.deviations) +
    (Math.max(0, auditScore) * weights.audits)
  ));
  
  return {
    totalActiveStudies: activeStudies.length,
    studiesInLife: studies.filter(s => s.status === 'in-progress').length,
    studiesInAnalysis: studies.filter(s => s.status === 'analysis').length,
    studiesPendingArchive: studies.filter(s => s.status === 'report-signed' && !s.archiveDate).length,
    
    openDeviations: openDeviations.length,
    criticalDeviations: criticalDeviations.length,
    majorDeviations: majorDeviations.length,
    deviationsTrend: criticalDeviations.length > 0 ? 'worsening' : 
                     openDeviations.length > 5 ? 'stable' : 'improving',
    avgDeviationClosureTime: Math.round(avgClosureTime),
    
    scheduledAudits: scheduledAudits.length,
    openAuditFindings: openFindings.length,
    overdueResponses: overdueResponses.length,
    upcomingAudits: audits
      .filter(a => a.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5),
    
    personnelWithExpiredTraining: expiredTraining.length,
    personnelWithExpiringTraining: expiringTraining.length,
    trainingComplianceRate: Math.round(trainingComplianceRate),
    
    equipmentOutOfCalibration: outOfCalibration.length,
    equipmentDueSoon: dueSoon.length,
    calibrationComplianceRate: Math.round(calibrationComplianceRate),
    
    pendingArchives: pendingArchives.length,
    retrievedArchives: retrievedArchives.length,
    upcomingDestructions: upcomingDestructions.length,
    
    facilitiesWithIssues: facilitiesWithIssues.length,
    overallComplianceScore: Math.round(overallScore),
    
    lastUpdated: new Date().toISOString(),
  };
}

function generateActionItems(state: GLPState): GLPActionItem[] {
  const items: GLPActionItem[] = [];
  const now = new Date();
  
  // Critical/Major deviations
  Object.values(state.deviations)
    .filter(d => d.status !== 'closed' && (d.severity === 'critical' || d.severity === 'major'))
    .forEach(d => {
      items.push({
        id: `dev-${d.id}`,
        type: 'deviation',
        priority: d.severity === 'critical' ? 'critical' : 'high',
        title: `${d.severity.toUpperCase()} Deviation: ${d.title}`,
        description: d.description,
        dueDate: d.dateDiscovered, // Should be addressed ASAP
        assignedTo: d.createdBy,
        assignedToName: d.createdBy,
        relatedStudyId: d.studyId,
        relatedStudyNumber: d.studyNumber,
        sourceId: d.id,
        status: d.status === 'open' ? 'pending' : 'in-progress',
        createdAt: d.createdAt,
      });
    });
  
  // Overdue audit responses
  Object.values(state.audits).forEach(audit => {
    audit.findings
      .filter(f => f.responseRequired && f.responseDeadline && f.status === 'open')
      .filter(f => new Date(f.responseDeadline!) < now)
      .forEach(f => {
        items.push({
          id: `audit-${f.id}`,
          type: 'audit-finding',
          priority: f.severity === 'critical' ? 'critical' : f.severity === 'major' ? 'high' : 'medium',
          title: `Overdue Audit Response: ${f.title}`,
          description: f.description,
          dueDate: f.responseDeadline!,
          assignedTo: f.respondedBy || '',
          assignedToName: f.respondedBy || 'Unassigned',
          relatedStudyId: f.studyId,
          relatedStudyNumber: null,
          sourceId: f.id,
          status: 'overdue',
          createdAt: audit.createdAt,
        });
      });
  });
  
  // Expired/expiring training
  Object.values(state.personnel)
    .filter(p => p.active && (p.trainingStatus === 'expired' || p.trainingStatus === 'expiring-soon'))
    .forEach(p => {
      items.push({
        id: `training-${p.id}`,
        type: 'training',
        priority: p.trainingStatus === 'expired' ? 'high' : 'medium',
        title: `Training ${p.trainingStatus === 'expired' ? 'Expired' : 'Expiring'}: ${p.firstName} ${p.lastName}`,
        description: `${p.title} - ${p.department}`,
        dueDate: now.toISOString(),
        assignedTo: p.id,
        assignedToName: `${p.firstName} ${p.lastName}`,
        relatedStudyId: null,
        relatedStudyNumber: null,
        sourceId: p.id,
        status: p.trainingStatus === 'expired' ? 'overdue' : 'pending',
        createdAt: p.createdAt,
      });
    });
  
  // Equipment out of calibration
  Object.values(state.equipment)
    .filter(e => e.calibrationStatus === 'overdue')
    .forEach(e => {
      items.push({
        id: `cal-${e.id}`,
        type: 'calibration',
        priority: 'high',
        title: `Calibration Overdue: ${e.name}`,
        description: `${e.manufacturer} ${e.model} - ${e.location}`,
        dueDate: e.nextCalibrationDue || now.toISOString(),
        assignedTo: '',
        assignedToName: 'QA/Metrology',
        relatedStudyId: null,
        relatedStudyNumber: null,
        sourceId: e.id,
        status: 'overdue',
        createdAt: e.createdAt,
      });
    });
  
  // Pending archives
  Object.values(state.studies)
    .filter(s => s.status === 'report-signed' && !s.archiveDate)
    .forEach(s => {
      items.push({
        id: `archive-${s.id}`,
        type: 'archive',
        priority: 'medium',
        title: `Pending Archive: Study ${s.studyNumber}`,
        description: s.title,
        dueDate: s.finalReportDate || now.toISOString(),
        assignedTo: '',
        assignedToName: 'Archivist',
        relatedStudyId: s.id,
        relatedStudyNumber: s.studyNumber,
        sourceId: s.id,
        status: 'pending',
        createdAt: s.createdAt,
      });
    });
  
  // Sort by priority and due date
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

// ============================================================================
// STORE
// ============================================================================

export const useGLPStore = create<GLPState & GLPActions>((set, get) => ({
  ...initialState,

  // ============================================================================
  // STUDY ACTIONS
  // ============================================================================
  
  addStudy: (study) => set((state) => ({
    studies: { ...state.studies, [study.id]: study },
  })),
  
  updateStudy: (id, updates) => set((state) => {
    const existing = state.studies[id];
    if (!existing) return state;
    return {
      studies: {
        ...state.studies,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  deleteStudy: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.studies;
    return { studies: rest };
  }),

  // ============================================================================
  // DEVIATION ACTIONS
  // ============================================================================
  
  addDeviation: (deviation) => set((state) => ({
    deviations: { ...state.deviations, [deviation.id]: deviation },
  })),
  
  updateDeviation: (id, updates) => set((state) => {
    const existing = state.deviations[id];
    if (!existing) return state;
    return {
      deviations: {
        ...state.deviations,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  closeDeviation: (id, closureNotes, closedBy) => set((state) => {
    const existing = state.deviations[id];
    if (!existing) return state;
    return {
      deviations: {
        ...state.deviations,
        [id]: {
          ...existing,
          status: 'closed',
          closureDate: new Date().toISOString(),
          closureNotes,
          closedBy,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }),

  // ============================================================================
  // AUDIT ACTIONS
  // ============================================================================
  
  addAudit: (audit) => set((state) => ({
    audits: { ...state.audits, [audit.id]: audit },
  })),
  
  updateAudit: (id, updates) => set((state) => {
    const existing = state.audits[id];
    if (!existing) return state;
    return {
      audits: {
        ...state.audits,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  addAuditFinding: (auditId, finding) => set((state) => {
    const audit = state.audits[auditId];
    if (!audit) return state;
    
    const findings = [...audit.findings, finding];
    const severityCounts = {
      critical: findings.filter(f => f.severity === 'critical').length,
      major: findings.filter(f => f.severity === 'major').length,
      minor: findings.filter(f => f.severity === 'minor').length,
      observation: findings.filter(f => f.severity === 'observation').length,
    };
    
    return {
      audits: {
        ...state.audits,
        [auditId]: {
          ...audit,
          findings,
          totalFindings: findings.length,
          criticalFindings: severityCounts.critical,
          majorFindings: severityCounts.major,
          minorFindings: severityCounts.minor,
          observations: severityCounts.observation,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }),
  
  updateAuditFinding: (auditId, findingId, updates) => set((state) => {
    const audit = state.audits[auditId];
    if (!audit) return state;
    
    const findings = audit.findings.map(f => 
      f.id === findingId ? { ...f, ...updates } : f
    );
    
    return {
      audits: {
        ...state.audits,
        [auditId]: { ...audit, findings, updatedAt: new Date().toISOString() },
      },
    };
  }),

  // ============================================================================
  // PERSONNEL ACTIONS
  // ============================================================================
  
  addPersonnel: (personnel) => set((state) => ({
    personnel: { ...state.personnel, [personnel.id]: personnel },
  })),
  
  updatePersonnel: (id, updates) => set((state) => {
    const existing = state.personnel[id];
    if (!existing) return state;
    return {
      personnel: {
        ...state.personnel,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  addTrainingRecord: (personnelId, record) => set((state) => {
    const person = state.personnel[personnelId];
    if (!person) return state;
    
    const completedTrainings = [...person.completedTrainings, record];
    
    // Recalculate training status
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    let trainingStatus: 'current' | 'expiring-soon' | 'expired' | 'not-required' = 'current';
    
    for (const training of completedTrainings) {
      if (training.expirationDate) {
        const expiry = new Date(training.expirationDate);
        if (expiry < now) {
          trainingStatus = 'expired';
          break;
        } else if (expiry < thirtyDaysFromNow) {
          trainingStatus = 'expiring-soon';
        }
      }
    }
    
    return {
      personnel: {
        ...state.personnel,
        [personnelId]: {
          ...person,
          completedTrainings,
          trainingStatus,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }),

  // ============================================================================
  // ARCHIVE ACTIONS
  // ============================================================================
  
  addArchive: (archive) => set((state) => ({
    archives: { ...state.archives, [archive.id]: archive },
  })),
  
  updateArchive: (id, updates) => set((state) => {
    const existing = state.archives[id];
    if (!existing) return state;
    return {
      archives: {
        ...state.archives,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  recordCustodyEvent: (archiveId, event) => set((state) => {
    const archive = state.archives[archiveId];
    if (!archive) return state;
    
    const custodyChain = [...archive.custodyChain, event];
    let status = archive.status;
    
    // Update status based on event type
    if (event.eventType === 'retrieved') status = 'retrieved';
    if (event.eventType === 'returned' || event.eventType === 'archived') status = 'archived';
    if (event.eventType === 'destroyed') status = 'destroyed';
    
    return {
      archives: {
        ...state.archives,
        [archiveId]: {
          ...archive,
          custodyChain,
          status,
          currentCustodian: event.performedByName,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }),

  // ============================================================================
  // FACILITY & EQUIPMENT ACTIONS
  // ============================================================================
  
  addFacility: (facility) => set((state) => ({
    facilities: { ...state.facilities, [facility.id]: facility },
  })),
  
  updateFacility: (id, updates) => set((state) => {
    const existing = state.facilities[id];
    if (!existing) return state;
    return {
      facilities: {
        ...state.facilities,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  addEquipment: (equipment) => set((state) => ({
    equipment: { ...state.equipment, [equipment.id]: equipment },
  })),
  
  updateEquipment: (id, updates) => set((state) => {
    const existing = state.equipment[id];
    if (!existing) return state;
    return {
      equipment: {
        ...state.equipment,
        [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      },
    };
  }),
  
  recordCalibration: (equipmentId, record) => set((state) => {
    const equip = state.equipment[equipmentId];
    if (!equip) return state;
    
    const calibrationHistory = [...equip.calibrationHistory, record];
    
    // Update calibration status
    const nextDue = new Date(record.nextDueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    let calibrationStatus: 'current' | 'due-soon' | 'overdue' | 'not-applicable' = 'current';
    if (nextDue < now) calibrationStatus = 'overdue';
    else if (nextDue < sevenDaysFromNow) calibrationStatus = 'due-soon';
    
    return {
      equipment: {
        ...state.equipment,
        [equipmentId]: {
          ...equip,
          calibrationHistory,
          lastCalibrationDate: record.calibrationDate,
          nextCalibrationDue: record.nextDueDate,
          calibrationStatus,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }),

  // ============================================================================
  // METRICS
  // ============================================================================
  
  refreshComplianceMetrics: () => set((state) => ({
    complianceMetrics: calculateComplianceMetrics(state),
    actionItems: generateActionItems(state),
  })),

  // ============================================================================
  // UI ACTIONS
  // ============================================================================
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedStudyId: (id) => set({ selectedStudyId: id }),
  setSelectedDeviationId: (id) => set({ selectedDeviationId: id }),
  setSelectedAuditId: (id) => set({ selectedAuditId: id }),
  setSelectedPersonnelId: (id) => set({ selectedPersonnelId: id }),
  setSelectedArchiveId: (id) => set({ selectedArchiveId: id }),

  // ============================================================================
  // FILTER ACTIONS
  // ============================================================================
  
  setStudyStatusFilter: (filter) => set({ studyStatusFilter: filter }),
  setStudyTypeFilter: (filter) => set({ studyTypeFilter: filter }),
  setDeviationSeverityFilter: (filter) => set({ deviationSeverityFilter: filter }),
  setDeviationStatusFilter: (filter) => set({ deviationStatusFilter: filter }),
  setAuditStatusFilter: (filter) => set({ auditStatusFilter: filter }),
  setPersonnelRoleFilter: (filter) => set({ personnelRoleFilter: filter }),

  // ============================================================================
  // UTILITY GETTERS
  // ============================================================================
  
  getStudyById: (id) => get().studies[id],
  
  getDeviationsByStudy: (studyId) => 
    Object.values(get().deviations).filter(d => d.studyId === studyId),
  
  getAuditsByStudy: (studyId) => 
    Object.values(get().audits).filter(a => a.studyIds.includes(studyId)),
  
  getPersonnelByRole: (role) => 
    Object.values(get().personnel).filter(p => 
      p.primaryRole === role || p.additionalRoles.includes(role)
    ),
  
  getArchivesByStudy: (studyId) => 
    Object.values(get().archives).filter(a => a.studyId === studyId),
  
  getEquipmentByFacility: (facilityId) => 
    Object.values(get().equipment).filter(e => e.facilityId === facilityId),
}));

// ============================================================================
// SELECTORS
// ============================================================================

export const selectActiveStudies = (state: GLPState & GLPActions) => {
  const activeStatuses: GLPStudyStatus[] = [
    'protocol-draft', 'protocol-approved', 'in-progress', 
    'in-life-complete', 'analysis', 'report-draft', 'report-qc'
  ];
  return Object.values(state.studies).filter(s => activeStatuses.includes(s.status));
};

export const selectOpenDeviations = (state: GLPState & GLPActions) =>
  Object.values(state.deviations).filter(d => d.status !== 'closed');

export const selectCriticalDeviations = (state: GLPState & GLPActions) =>
  Object.values(state.deviations).filter(d => d.severity === 'critical' && d.status !== 'closed');

export const selectUpcomingAudits = (state: GLPState & GLPActions) =>
  Object.values(state.audits)
    .filter(a => a.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

export const selectActivePersonnel = (state: GLPState & GLPActions) =>
  Object.values(state.personnel).filter(p => p.active);

export const selectEquipmentNeedingCalibration = (state: GLPState & GLPActions) =>
  Object.values(state.equipment).filter(e => 
    e.calibrationStatus === 'overdue' || e.calibrationStatus === 'due-soon'
  );
