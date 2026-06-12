
/**
 * Cross-Module Event Helpers
 * 
 * Provides simple event emission functions for domain stores to use.
 * This file abstracts the cross-module store interaction so stores
 * don't need to import the full cross-module store directly.
 * 
 * @module lib/cross-module-events
 * @version 0.27.46
 */

import type {
  ModuleType,
  CrossModuleEventType,
  CrossModuleEvent,
  SharedEntityType,
} from '@/domains/cross-module/contracts';

// Lazy import to avoid circular dependencies
let crossModuleStoreGetter: (() => { emitEvent: (event: Omit<CrossModuleEvent, 'id' | 'timestamp'>) => void }) | null = null;

/**
 * Initialize the event emitter with the cross-module store getter.
 * Call this once at app initialization.
 */
export function initializeEventEmitter(
  storeGetter: () => { emitEvent: (event: Omit<CrossModuleEvent, 'id' | 'timestamp'>) => void }
) {
  crossModuleStoreGetter = storeGetter;
}

// =============================================================================
// EVENT EMISSION HELPERS
// =============================================================================

/**
 * Base event emission function
 */
export function emitCrossModuleEvent(
  eventType: CrossModuleEventType,
  sourceModule: ModuleType,
  entityType: string,
  entityId: string,
  description: string,
  payload: Record<string, unknown> = {},
  targetModules: ModuleType[] = [],
  triggeredBy?: string,
  correlationId?: string
): void {
  if (!crossModuleStoreGetter) {
    console.warn('[cross-module-events] Event emitter not initialized. Call initializeEventEmitter() first.');
    return;
  }

  const store = crossModuleStoreGetter();
  store.emitEvent({
    eventType,
    sourceModule,
    targetModules,
    entityType,
    entityId,
    description,
    payload,
    triggeredBy,
    correlationId,
  });
}

// =============================================================================
// SAFETY MODULE EVENTS
// =============================================================================

export const SafetyEvents = {
  caseCreated: (caseId: string, caseNumber: string, product: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'safety',
      'case',
      caseId,
      `Safety case ${caseNumber} created for ${product}`,
      { caseNumber, product },
      ['quality', 'regulatory'],
      triggeredBy
    );
  },

  caseStatusChanged: (
    caseId: string, 
    caseNumber: string, 
    fromStatus: string, 
    toStatus: string,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'entity-status-changed',
      'safety',
      'case',
      caseId,
      `Case ${caseNumber}: ${fromStatus} → ${toStatus}`,
      { caseNumber, fromStatus, toStatus },
      ['quality'],
      triggeredBy
    );
  },

  caseSubmitted: (
    caseId: string,
    caseNumber: string,
    region: string,
    authority: string,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'safety',
      'case',
      caseId,
      `Case ${caseNumber} submitted to ${authority} (${region})`,
      { caseNumber, region, authority },
      ['submissions', 'regulatory'],
      triggeredBy
    );
  },

  signalCreated: (signalId: string, signalTitle: string, product: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'safety',
      'signal',
      signalId,
      `Safety signal created: ${signalTitle}`,
      { signalTitle, product },
      ['regulatory', 'labeling'],
      triggeredBy
    );
  },

  signalValidated: (signalId: string, signalTitle: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-status-changed',
      'safety',
      'signal',
      signalId,
      `Signal validated: ${signalTitle}`,
      { signalTitle, status: 'validated' },
      ['labeling', 'regulatory', 'submissions'],
      triggeredBy
    );
  },

  signalClosed: (signalId: string, signalTitle: string, reason: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'safety',
      'signal',
      signalId,
      `Signal closed: ${signalTitle}`,
      { signalTitle, reason },
      [],
      triggeredBy
    );
  },

  signalDetected: (count: number, product: string, method: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'threshold-exceeded',
      'safety',
      'signal',
      `detection-${Date.now()}`,
      `${count} potential signals detected for ${product} using ${method}`,
      { count, product, method },
      ['regulatory'],
      triggeredBy
    );
  },

  expediteDeadlineApproaching: (caseId: string, caseNumber: string, dueDate: string, daysRemaining: number) => {
    emitCrossModuleEvent(
      'deadline-approaching',
      'safety',
      'case',
      caseId,
      `Expedite deadline approaching: ${caseNumber} due in ${daysRemaining} days`,
      { caseNumber, dueDate, daysRemaining },
      ['quality', 'regulatory']
    );
  },
};

// =============================================================================
// CTMS MODULE EVENTS
// =============================================================================

export const CTMSEvents = {
  studyCreated: (studyId: string, protocolNumber: string, title: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'ctms',
      'study',
      studyId,
      `Study created: ${protocolNumber} - ${title}`,
      { protocolNumber, title },
      ['tmf', 'regulatory', 'authoring'],
      triggeredBy
    );
  },

  studyStatusChanged: (
    studyId: string,
    protocolNumber: string,
    fromStatus: string,
    toStatus: string,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'entity-status-changed',
      'ctms',
      'study',
      studyId,
      `Study ${protocolNumber}: ${fromStatus} → ${toStatus}`,
      { protocolNumber, fromStatus, toStatus },
      ['tmf', 'regulatory', 'authoring'],
      triggeredBy
    );
  },

  siteActivated: (siteId: string, siteName: string, studyId: string, protocolNumber: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-status-changed',
      'ctms',
      'site',
      siteId,
      `Site activated: ${siteName} for ${protocolNumber}`,
      { siteName, studyId, protocolNumber },
      ['tmf'],
      triggeredBy
    );
  },

  enrollmentMilestone: (
    studyId: string,
    protocolNumber: string,
    enrolled: number,
    target: number,
    triggeredBy?: string
  ) => {
    const percentage = Math.round((enrolled / target) * 100);
    emitCrossModuleEvent(
      'threshold-exceeded',
      'ctms',
      'study',
      studyId,
      `Enrollment milestone: ${protocolNumber} at ${percentage}% (${enrolled}/${target})`,
      { protocolNumber, enrolled, target, percentage },
      ['regulatory', 'authoring'],
      triggeredBy
    );
  },

  dataLocked: (studyId: string, protocolNumber: string, lockDate: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'data-locked',
      'ctms',
      'study',
      studyId,
      `Database locked: ${protocolNumber} on ${lockDate}`,
      { protocolNumber, lockDate },
      ['authoring', 'submissions', 'edc'],
      triggeredBy
    );
  },

  lastSubjectLastVisit: (studyId: string, protocolNumber: string, lslvDate: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'ctms',
      'study',
      studyId,
      `LSLV reached: ${protocolNumber} on ${lslvDate}`,
      { protocolNumber, lslvDate },
      ['authoring', 'submissions', 'tmf'],
      triggeredBy
    );
  },

  protocolDeviationReported: (
    deviationId: string,
    studyId: string,
    category: string,
    severity: string,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'deviation-detected',
      'ctms',
      'deviation',
      deviationId,
      `Protocol deviation: ${category} (${severity})`,
      { studyId, category, severity },
      ['quality', 'tmf'],
      triggeredBy
    );
  },

  monitoringVisitCompleted: (
    visitId: string,
    siteId: string,
    siteName: string,
    findingsCount: number,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'ctms',
      'visit',
      visitId,
      `Monitoring visit completed at ${siteName}: ${findingsCount} findings`,
      { siteId, siteName, findingsCount },
      ['tmf', 'quality'],
      triggeredBy
    );
  },
};

// =============================================================================
// QMS MODULE EVENTS
// =============================================================================

export const QMSEvents = {
  capaCreated: (capaId: string, capaNumber: string, category: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'quality',
      'capa',
      capaId,
      `CAPA created: ${capaNumber} (${category})`,
      { capaNumber, category },
      ['safety', 'regulatory'],
      triggeredBy
    );
  },

  capaStatusChanged: (
    capaId: string,
    capaNumber: string,
    fromStatus: string,
    toStatus: string,
    triggeredBy?: string
  ) => {
    emitCrossModuleEvent(
      'entity-status-changed',
      'quality',
      'capa',
      capaId,
      `CAPA ${capaNumber}: ${fromStatus} → ${toStatus}`,
      { capaNumber, fromStatus, toStatus },
      [],
      triggeredBy
    );
  },

  deviationReported: (deviationId: string, description: string, severity: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'deviation-detected',
      'quality',
      'deviation',
      deviationId,
      `Deviation reported: ${description}`,
      { severity },
      ['safety', 'ctms'],
      triggeredBy
    );
  },

  auditCompleted: (auditId: string, auditName: string, findingsCount: number, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'quality',
      'audit',
      auditId,
      `Audit completed: ${auditName} with ${findingsCount} findings`,
      { auditName, findingsCount },
      ['regulatory'],
      triggeredBy
    );
  },
};

// =============================================================================
// TMF MODULE EVENTS
// =============================================================================

export const TMFEvents = {
  documentFiled: (documentId: string, fileName: string, zone: string, section: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'tmf',
      'document',
      documentId,
      `Document filed: ${fileName} to ${zone}-${section}`,
      { fileName, zone, section },
      ['submissions', 'authoring'],
      triggeredBy
    );
  },

  documentApproved: (documentId: string, fileName: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'approval-granted',
      'tmf',
      'document',
      documentId,
      `Document approved: ${fileName}`,
      { fileName },
      ['submissions'],
      triggeredBy
    );
  },

  qualityCheckFailed: (documentId: string, fileName: string, issues: string[], triggeredBy?: string) => {
    emitCrossModuleEvent(
      'deviation-detected',
      'tmf',
      'document',
      documentId,
      `QC failed: ${fileName} - ${issues.length} issues`,
      { fileName, issues, issueCount: issues.length },
      ['quality'],
      triggeredBy
    );
  },

  tmfClosureStarted: (studyId: string, protocolNumber: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-started',
      'tmf',
      'study',
      studyId,
      `TMF closure started for ${protocolNumber}`,
      { protocolNumber },
      ['submissions', 'archives'],
      triggeredBy
    );
  },
};

// =============================================================================
// AUTHORING MODULE EVENTS
// =============================================================================

export const AuthoringEvents = {
  documentCreated: (documentId: string, title: string, type: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'authoring',
      'document',
      documentId,
      `Document created: ${title} (${type})`,
      { title, type },
      ['tmf', 'submissions'],
      triggeredBy
    );
  },

  documentApproved: (documentId: string, title: string, version: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'approval-granted',
      'authoring',
      'document',
      documentId,
      `Document approved: ${title} v${version}`,
      { title, version },
      ['submissions', 'tmf'],
      triggeredBy
    );
  },

  documentReadyForSubmission: (documentId: string, title: string, targetModule: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'data-available',
      'authoring',
      'document',
      documentId,
      `Ready for submission: ${title} → Module ${targetModule}`,
      { title, targetModule },
      ['submissions'],
      triggeredBy
    );
  },
};

// =============================================================================
// SUBMISSIONS MODULE EVENTS
// =============================================================================

export const SubmissionsEvents = {
  sequenceCreated: (sequenceId: string, sequenceNumber: string, submissionType: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'submissions',
      'sequence',
      sequenceId,
      `eCTD sequence created: ${sequenceNumber} (${submissionType})`,
      { sequenceNumber, submissionType },
      ['regulatory'],
      triggeredBy
    );
  },

  sequencePublished: (sequenceId: string, sequenceNumber: string, region: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'submissions',
      'sequence',
      sequenceId,
      `eCTD sequence published: ${sequenceNumber} to ${region}`,
      { sequenceNumber, region },
      ['regulatory', 'archives'],
      triggeredBy
    );
  },

  validationCompleted: (sequenceId: string, sequenceNumber: string, status: 'pass' | 'fail', errorCount: number, triggeredBy?: string) => {
    emitCrossModuleEvent(
      status === 'pass' ? 'workflow-completed' : 'deviation-detected',
      'submissions',
      'sequence',
      sequenceId,
      `Validation ${status}: ${sequenceNumber} - ${errorCount} errors`,
      { sequenceNumber, status, errorCount },
      ['quality'],
      triggeredBy
    );
  },
};

// =============================================================================
// ELN MODULE EVENTS
// =============================================================================

export const ELNEvents = {
  experimentCreated: (experimentId: string, title: string, type: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'eln',
      'experiment',
      experimentId,
      `Experiment created: ${title} (${type})`,
      { title, type },
      ['glp', 'sample-management'],
      triggeredBy
    );
  },

  experimentCompleted: (experimentId: string, title: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'eln',
      'experiment',
      experimentId,
      `Experiment completed: ${title}`,
      { title },
      ['ctms', 'tmf', 'glp'],
      triggeredBy
    );
  },

  experimentSigned: (experimentId: string, title: string, signatory: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'signature-applied',
      'eln',
      'experiment',
      experimentId,
      `Experiment signed: ${title} by ${signatory}`,
      { title, signatory },
      ['glp', 'quality'],
      triggeredBy
    );
  },
};

// =============================================================================
// GLP MODULE EVENTS
// =============================================================================

export const GLPEvents = {
  studyCreated: (studyId: string, studyNumber: string, type: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'entity-created',
      'glp',
      'glp-study',
      studyId,
      `GLP study created: ${studyNumber} (${type})`,
      { studyNumber, type },
      ['eln', 'regulatory'],
      triggeredBy
    );
  },

  studyCompleted: (studyId: string, studyNumber: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'workflow-completed',
      'glp',
      'glp-study',
      studyId,
      `GLP study completed: ${studyNumber}`,
      { studyNumber },
      ['submissions', 'authoring'],
      triggeredBy
    );
  },

  finalReportSigned: (studyId: string, studyNumber: string, studyDirector: string, triggeredBy?: string) => {
    emitCrossModuleEvent(
      'signature-applied',
      'glp',
      'glp-study',
      studyId,
      `Final report signed: ${studyNumber} by ${studyDirector}`,
      { studyNumber, studyDirector },
      ['submissions', 'authoring', 'regulatory'],
      triggeredBy
    );
  },
};
