

// QMS Store - Quality Management System (v58)
// v58: Added cross-module event emissions
import { useMemo } from 'react';
import { create } from 'zustand';
import type {
  QMSState, QMSActions, QMSDepartment, QMSSeverity, ControlledDocument, DocumentVersion, ControlledCopy,
  CAPA, CAPAAction, RootCauseAnalysis, EffectivenessCheck, CAPATimelineEntry, Deviation, ImmediateAction,
  DeviationRiskAssessment, DeviationDisposition, ChangeControl, TrainingCurriculum, TrainingCourse,
  TrainingSession, TrainingAssignment, TrainingAttempt, TrainingRecord, TrainingCertificate,
  QMSAudit, QMSAuditPlan, AuditFinding, AuditeeResponse, AuditReport, FindingsSummary,
  QualityMetric, MetricDataPoint, QualityDashboard, SummaryMetric, ManagementReview,
  ManagementReviewInput, ManagementReviewOutput, ReviewDecision, ReviewActionItem, TrendDirection,
} from './qmsTypes';
import { useCrossModuleStore } from './useCrossModuleStore';

const generateId = () => `qms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateNumber = (prefix: string, counter: number) => `${prefix}-${new Date().getFullYear()}-${String(counter).padStart(5, '0')}`;
const now = () => new Date().toISOString();
const calculateTrend = (current: number, previous: number | undefined): TrendDirection => {
  if (previous === undefined) return 'stable';
  const change = ((current - previous) / previous) * 100;
  return change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
};

const initialState: QMSState = {
  controlledDocuments: {}, documentVersions: {}, documentsByNumber: {}, controlledCopies: {},
  approvalWorkflows: {}, workflowInstances: {}, capas: {}, capasByNumber: {}, rootCauseAnalyses: {},
  deviations: {}, deviationsByNumber: {}, changeControls: {}, changeControlsByNumber: {},
  curricula: {}, courses: {}, assignments: {}, assignmentsByUser: {}, trainingRecords: {}, certificates: {},
  audits: {}, auditsByNumber: {}, checklists: {}, findings: {}, findingsByAudit: {},
  metrics: {}, metricData: {}, dashboardData: null, managementReviews: {},
  selectedDocumentId: null, selectedCAPAId: null, selectedDeviationId: null,
  selectedChangeControlId: null, selectedAuditId: null, selectedAssignmentId: null,
  activeView: 'dashboard', filters: {}, isLoading: false, lastError: null,
};

export const useQMSStore = create<QMSState & QMSActions>((set, get) => ({
  ...initialState,

  createDocument: (data) => {
    const id = generateId();
    const documentNumber = data.documentNumber || generateNumber('DOC', Object.keys(get().controlledDocuments).length + 1);
    const document: ControlledDocument = {
      id, documentNumber, title: data.title || 'Untitled Document', documentType: data.documentType || 'sop',
      department: data.department || 'quality-assurance', version: '1.0', majorVersion: 1, minorVersion: 0,
      status: 'draft', periodicReviewCycle: data.periodicReviewCycle || 24, author: data.author || 'System',
      authorId: data.authorId || 'system', owner: data.owner || 'System', ownerId: data.ownerId || 'system',
      description: data.description || '', keywords: data.keywords || [], category: data.category || 'General',
      regulatoryFrameworks: data.regulatoryFrameworks || [], relatedDocumentIds: data.relatedDocumentIds || [],
      attachments: data.attachments || [], trainingRequired: data.trainingRequired ?? false,
      trainingCurriculumIds: data.trainingCurriculumIds || [], changeControlRequired: data.changeControlRequired ?? false,
      fileLocation: data.fileLocation || '', fileSize: data.fileSize || 0, fileChecksum: data.fileChecksum || '',
      retentionYears: data.retentionYears || 7, confidentialityLevel: data.confidentialityLevel || 'internal',
      createdAt: now(), updatedAt: now(), createdBy: data.createdBy || 'system', lastModifiedBy: data.lastModifiedBy || 'system', ...data,
    };
    set((state) => ({ controlledDocuments: { ...state.controlledDocuments, [id]: document }, documentsByNumber: { ...state.documentsByNumber, [documentNumber]: id } }));
    return document;
  },
  updateDocument: (id, updates) => set((state) => ({ controlledDocuments: { ...state.controlledDocuments, [id]: { ...state.controlledDocuments[id], ...updates, updatedAt: now() } } })),
  createDocumentVersion: (documentId, changes) => {
    const doc = get().controlledDocuments[documentId]; if (!doc) throw new Error('Document not found');
    const id = generateId(); const newMajor = doc.majorVersion + 1;
    const version: DocumentVersion = { id, documentId, version: `${newMajor}.0`, majorVersion: newMajor, minorVersion: 0, status: 'draft', changeDescription: changes, changedSections: [],
      reviewCycle: { id: generateId(), documentVersionId: id, scheduledDate: new Date(Date.now() + doc.periodicReviewCycle * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'scheduled', reviewerId: doc.ownerId, reviewerName: doc.owner },
      approvalWorkflow: { id: generateId(), templateId: '', documentVersionId: id, currentStepNumber: 0, status: 'in-progress', initiatedAt: now(), initiatedBy: 'system', stepStatuses: [] }, createdAt: now(), createdBy: 'system' };
    set((state) => ({ documentVersions: { ...state.documentVersions, [id]: version }, controlledDocuments: { ...state.controlledDocuments, [documentId]: { ...doc, version: version.version, majorVersion: newMajor, minorVersion: 0, updatedAt: now() } } }));
    return version;
  },
  submitForApproval: (documentVersionId) => { const v = get().documentVersions[documentVersionId]; if (v) set((state) => ({ documentVersions: { ...state.documentVersions, [documentVersionId]: { ...v, status: 'pending-review', approvalWorkflow: { ...v.approvalWorkflow, currentStepNumber: 1 } } } })); },
  approveDocument: (workflowInstanceId, stepId, approverId, comments) => {
    const instance = get().workflowInstances[workflowInstanceId]; if (!instance) return;
    const updatedSteps = instance.stepStatuses.map((step) => step.stepId === stepId ? { ...step, status: 'approved' as const, actionDate: now(), comments, approverId } : step);
    const allApproved = updatedSteps.every((s) => s.status === 'approved' || s.status === 'skipped');
    set((state) => ({ workflowInstances: { ...state.workflowInstances, [workflowInstanceId]: { ...instance, stepStatuses: updatedSteps, status: allApproved ? 'completed' : 'in-progress', completedAt: allApproved ? now() : undefined, currentStepNumber: allApproved ? instance.currentStepNumber : instance.currentStepNumber + 1 } } }));
  },
  rejectDocument: (workflowInstanceId, stepId, approverId, comments) => { const i = get().workflowInstances[workflowInstanceId]; if (i) set((state) => ({ workflowInstances: { ...state.workflowInstances, [workflowInstanceId]: { ...i, status: 'rejected', stepStatuses: i.stepStatuses.map((s) => s.stepId === stepId ? { ...s, status: 'rejected' as const, actionDate: now(), comments, approverId } : s) } } })); },
  makeEffective: (documentVersionId) => { const v = get().documentVersions[documentVersionId]; if (v) set((state) => ({ documentVersions: { ...state.documentVersions, [documentVersionId]: { ...v, status: 'effective', effectiveDate: now() } }, controlledDocuments: { ...state.controlledDocuments, [v.documentId]: { ...state.controlledDocuments[v.documentId], status: 'effective', effectiveDate: now() } } })); },
  retireDocument: (documentId) => set((state) => ({ controlledDocuments: { ...state.controlledDocuments, [documentId]: { ...state.controlledDocuments[documentId], status: 'retired', updatedAt: now() } } })),
  issueControlledCopy: (documentId, issuedTo, copyType) => {
    const doc = get().controlledDocuments[documentId]; if (!doc) throw new Error('Document not found');
    const id = generateId(); const existingCopies = Object.values(get().controlledCopies).filter((c) => c.documentId === documentId);
    const copy: ControlledCopy = { id, documentId, documentVersion: doc.version, copyNumber: existingCopies.length + 1, issuedTo, issuedToId: issuedTo, issuedDate: now(), location: '', copyType, status: 'active', acknowledgmentRequired: true };
    set((state) => ({ controlledCopies: { ...state.controlledCopies, [id]: copy } })); return copy;
  },
  recallControlledCopy: (copyId) => set((state) => ({ controlledCopies: { ...state.controlledCopies, [copyId]: { ...state.controlledCopies[copyId], status: 'recalled', recalledDate: now() } } })),
  schedulePeriodicReview: (documentId) => { const doc = get().controlledDocuments[documentId]; if (!doc) return; const reviewDate = new Date(); reviewDate.setMonth(reviewDate.getMonth() + doc.periodicReviewCycle); set((state) => ({ controlledDocuments: { ...state.controlledDocuments, [documentId]: { ...doc, periodicReviewDate: reviewDate.toISOString().split('T')[0], updatedAt: now() } } })); },

  createCAPA: (data) => {
    const id = generateId(); const capaNumber = data.capaNumber || generateNumber('CAPA', Object.keys(get().capas).length + 1);
    const capa: CAPA = { id, capaNumber, title: data.title || 'Untitled CAPA', description: data.description || '', capaType: data.capaType || 'corrective', source: data.source || 'deviation', priority: data.priority || 'medium', severity: data.severity || 'minor', status: 'draft', department: data.department || 'quality-assurance', affectedDepartments: data.affectedDepartments || [], affectedProducts: data.affectedProducts || [], affectedProcesses: data.affectedProcesses || [], affectedSystems: data.affectedSystems || [], regulatoryImpact: data.regulatoryImpact ?? false, regulatoryNotificationRequired: data.regulatoryNotificationRequired ?? false, assigneeId: data.assigneeId || '', assigneeName: data.assigneeName || '', ownerId: data.ownerId || '', ownerName: data.ownerName || '', initiatorId: data.initiatorId || 'system', initiatorName: data.initiatorName || 'System', targetCompletionDate: data.targetCompletionDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], effectivenessCheckCompleted: false, investigation: { id: generateId(), capaId: id, status: 'not-started', investigatorId: '', investigatorName: '', scopeDescription: '', evidenceCollected: [], interviewsConducted: [] }, actionPlan: { id: generateId(), capaId: id, status: 'draft', actions: [], totalActions: 0, completedActions: 0, overdueActions: 0 }, effectivenessChecks: [], linkedCAPAs: data.linkedCAPAs || [], linkedDeviations: data.linkedDeviations || [], linkedAuditFindings: data.linkedAuditFindings || [], linkedChangeControls: data.linkedChangeControls || [], attachments: data.attachments || [], comments: [], timeline: [{ id: generateId(), timestamp: now(), action: 'CAPA Created', performedBy: data.initiatorName || 'System', details: `CAPA ${capaNumber} created`, newStatus: 'draft' }], extensionHistory: [], createdAt: now(), updatedAt: now(), ...data };
    set((state) => ({ capas: { ...state.capas, [id]: capa }, capasByNumber: { ...state.capasByNumber, [capaNumber]: id } }));
    
    // Emit cross-module event
    useCrossModuleStore.getState().emitEvent({
      eventType: 'entity-created',
      sourceModule: 'quality',
      targetModules: ['regulatory', 'safety', 'ctms'],
      entityType: 'capa',
      entityId: id,
      description: `CAPA ${capaNumber} created: ${capa.title}`,
      payload: { capaNumber, title: capa.title, capaType: capa.capaType, severity: capa.severity, priority: capa.priority },
    });
    
    return capa;
  },
  updateCAPA: (id, updates) => { const capa = get().capas[id]; if (!capa) return; set((state) => ({ capas: { ...state.capas, [id]: { ...capa, ...updates, timeline: [...capa.timeline, { id: generateId(), timestamp: now(), action: 'CAPA Updated', performedBy: 'System', details: `CAPA ${capa.capaNumber} updated`, previousStatus: capa.status, newStatus: updates.status || capa.status }], updatedAt: now() } } })); },
  assignCAPA: (capaId, assigneeId, assigneeName) => { const capa = get().capas[capaId]; if (capa) set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, assigneeId, assigneeName, status: capa.status === 'draft' ? 'pending-approval' : capa.status, timeline: [...capa.timeline, { id: generateId(), timestamp: now(), action: 'CAPA Assigned', performedBy: 'System', details: `Assigned to ${assigneeName}` }], updatedAt: now() } } })); },
  startInvestigation: (capaId) => { const capa = get().capas[capaId]; if (capa) set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, status: 'investigation', investigation: { ...capa.investigation, status: 'in-progress', startDate: now() }, timeline: [...capa.timeline, { id: generateId(), timestamp: now(), action: 'Investigation Started', performedBy: capa.assigneeName, details: 'Root cause investigation initiated', previousStatus: capa.status, newStatus: 'investigation' }], updatedAt: now() } } })); },
  completeInvestigation: (capaId, findings) => { const capa = get().capas[capaId]; if (capa) set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, status: 'action-planning', investigation: { ...capa.investigation, status: 'completed', completionDate: now(), findingsSummary: findings }, timeline: [...capa.timeline, { id: generateId(), timestamp: now(), action: 'Investigation Completed', performedBy: capa.assigneeName, details: findings, previousStatus: 'investigation', newStatus: 'action-planning' }], updatedAt: now() } } })); },
  addRootCauseAnalysis: (capaId, analysis) => { const capa = get().capas[capaId]; if (!capa) return null as unknown as RootCauseAnalysis; const id = generateId(); const rca: RootCauseAnalysis = { id, capaId, methodology: analysis.methodology || '5-why', analysisDate: analysis.analysisDate || now(), performedBy: analysis.performedBy || '', performedById: analysis.performedById || '', problemStatement: analysis.problemStatement || '', rootCauses: analysis.rootCauses || [], contributingFactors: analysis.contributingFactors || [], conclusion: analysis.conclusion || '', approved: false, ...analysis }; set((state) => ({ rootCauseAnalyses: { ...state.rootCauseAnalyses, [id]: rca }, capas: { ...state.capas, [capaId]: { ...capa, rootCauseAnalysis: rca, updatedAt: now() } } })); return rca; },
  addCAPAAction: (capaId, action) => { const capa = get().capas[capaId]; if (!capa) return null as unknown as CAPAAction; const id = generateId(); const capaAction: CAPAAction = { id, actionNumber: capa.actionPlan.actions.length + 1, actionType: action.actionType || 'corrective', description: action.description || '', assigneeId: action.assigneeId || '', assigneeName: action.assigneeName || '', targetDate: action.targetDate || '', status: 'not-started', priority: action.priority || 'medium', deliverables: action.deliverables || [], attachmentIds: action.attachmentIds || [], comments: action.comments || '', ...action }; set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, actionPlan: { ...capa.actionPlan, actions: [...capa.actionPlan.actions, capaAction], totalActions: capa.actionPlan.actions.length + 1 }, updatedAt: now() } } })); return capaAction; },
  completeCAPAAction: (capaId, actionId, evidence) => { const capa = get().capas[capaId]; if (!capa) return; const updatedActions = capa.actionPlan.actions.map((a) => a.id === actionId ? { ...a, status: 'completed' as const, completedDate: now(), evidence } : a); const completedCount = updatedActions.filter((a) => a.status === 'completed').length; set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, actionPlan: { ...capa.actionPlan, actions: updatedActions, completedActions: completedCount }, status: completedCount === updatedActions.length ? 'effectiveness-check' : capa.status, updatedAt: now() } } })); },
  scheduleEffectivenessCheck: (capaId, scheduledDate) => { const capa = get().capas[capaId]; if (!capa) return; const check: EffectivenessCheck = { id: generateId(), capaId, checkNumber: capa.effectivenessChecks.length + 1, scheduledDate, status: 'scheduled', checkType: capa.effectivenessChecks.length === 0 ? 'initial' : 'follow-up', criteria: [], requiresRecurrence: false }; set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, effectivenessChecks: [...capa.effectivenessChecks, check], effectivenessCheckDate: scheduledDate, updatedAt: now() } } })); },
  completeEffectivenessCheck: (capaId, checkId, result) => { const capa = get().capas[capaId]; if (!capa) return; set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, effectivenessChecks: capa.effectivenessChecks.map((c) => c.id === checkId ? { ...c, status: 'completed' as const, completedDate: now(), overallResult: result } : c), effectivenessCheckCompleted: true, effectivenessCheckResult: result, status: result === 'effective' ? 'closed' : 'closed-ineffective', updatedAt: now() } } })); },
  closeCAPA: (capaId, closedBy) => { const capa = get().capas[capaId]; if (capa) set((state) => ({ capas: { ...state.capas, [capaId]: { ...capa, status: 'closed', closedAt: now(), closedBy, actualCompletionDate: now(), timeline: [...capa.timeline, { id: generateId(), timestamp: now(), action: 'CAPA Closed', performedBy: closedBy, details: `CAPA ${capa.capaNumber} closed`, previousStatus: capa.status, newStatus: 'closed' }], updatedAt: now() } } })); },

  createDeviation: (data) => {
    const id = generateId(); const deviationNumber = data.deviationNumber || generateNumber('DEV', Object.keys(get().deviations).length + 1);
    const deviation: Deviation = { id, deviationNumber, title: data.title || 'Untitled Deviation', description: data.description || '', deviationType: data.deviationType || 'unplanned', category: data.category || 'process', severity: data.severity || 'minor', status: 'draft', department: data.department || 'quality-assurance', affectedArea: data.affectedArea || '', affectedProducts: data.affectedProducts || [], affectedBatches: data.affectedBatches || [], affectedProcesses: data.affectedProcesses || [], affectedDocuments: data.affectedDocuments || [], productImpact: data.productImpact || { id: generateId(), impactLevel: 'none', qualityAttributes: [], marketStatus: 'not-released', recallRequired: false, quarantineRequired: false, justification: '', assessedBy: '', assessedDate: now() }, patientSafetyImpact: data.patientSafetyImpact || 'none', regulatoryImpact: data.regulatoryImpact || 'none', discoveryDate: data.discoveryDate || now(), discoveredBy: data.discoveredBy || '', discoveredById: data.discoveredById || '', occurrenceDate: data.occurrenceDate || now(), reportedDate: data.reportedDate || now(), reportedBy: data.reportedBy || '', reportedById: data.reportedById || '', ownerId: data.ownerId || '', ownerName: data.ownerName || '', immediateActions: data.immediateActions || [], linkedCAPAs: data.linkedCAPAs || [], linkedChangeControls: data.linkedChangeControls || [], attachments: data.attachments || [], comments: [], timeline: [{ id: generateId(), timestamp: now(), action: 'Deviation Created', performedBy: data.reportedBy || 'System', details: `Deviation ${deviationNumber} reported`, newStatus: 'draft' }], createdAt: now(), updatedAt: now(), ...data };
    set((state) => ({ deviations: { ...state.deviations, [id]: deviation }, deviationsByNumber: { ...state.deviationsByNumber, [deviationNumber]: id } }));
    
    // Emit cross-module event
    useCrossModuleStore.getState().emitEvent({
      eventType: 'deviation-detected',
      sourceModule: 'quality',
      targetModules: ['safety', 'regulatory', 'ctms'],
      entityType: 'deviation',
      entityId: id,
      description: `Deviation ${deviationNumber}: ${deviation.title}`,
      payload: { deviationNumber, title: deviation.title, severity: deviation.severity, category: deviation.category },
    });
    
    return deviation;
  },
  updateDeviation: (id, updates) => { const d = get().deviations[id]; if (d) set((state) => ({ deviations: { ...state.deviations, [id]: { ...d, ...updates, updatedAt: now() } } })); },
  classifyDeviation: (deviationId, severity, classifiedBy) => { const d = get().deviations[deviationId]; if (d) set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, severity, status: 'classified', classificationDate: now(), classifiedBy, classifiedById: classifiedBy, timeline: [...d.timeline, { id: generateId(), timestamp: now(), action: 'Deviation Classified', performedBy: classifiedBy, details: `Classified as ${severity}`, previousStatus: d.status, newStatus: 'classified' }], updatedAt: now() } } })); },
  addImmediateAction: (deviationId, action) => { const d = get().deviations[deviationId]; if (d) { const immediateAction: ImmediateAction = { id: generateId(), description: action.description || '', takenBy: action.takenBy || '', takenById: action.takenById || '', takenAt: action.takenAt || now(), result: action.result || '', attachmentIds: action.attachmentIds || [], ...action }; set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, immediateActions: [...d.immediateActions, immediateAction], updatedAt: now() } } })); } },
  assessProductImpact: (deviationId, assessment) => { const d = get().deviations[deviationId]; if (d) set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, productImpact: { ...d.productImpact, ...assessment, id: d.productImpact.id }, updatedAt: now() } } })); },
  assessDeviationRisk: (deviationId, assessment) => { const d = get().deviations[deviationId]; if (!d) return; const riskAssessment: DeviationRiskAssessment = { id: generateId(), deviationId, riskLevel: assessment.riskLevel || 'low', severityScore: assessment.severityScore || 1, occurrenceScore: assessment.occurrenceScore || 1, detectabilityScore: assessment.detectabilityScore || 1, riskPriorityNumber: (assessment.severityScore || 1) * (assessment.occurrenceScore || 1) * (assessment.detectabilityScore || 1), justification: assessment.justification || '', mitigationMeasures: assessment.mitigationMeasures || [], residualRisk: assessment.residualRisk || 'acceptable', assessedBy: assessment.assessedBy || '', assessedById: assessment.assessedById || '', assessedDate: assessment.assessedDate || now(), ...assessment }; set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, riskAssessment, updatedAt: now() } } })); },
  setDisposition: (deviationId, disposition) => { const d = get().deviations[deviationId]; if (!d) return; const deviationDisposition: DeviationDisposition = { id: generateId(), deviationId, decision: disposition.decision || 'use-as-is', justification: disposition.justification || '', approvedBy: disposition.approvedBy || '', approvedById: disposition.approvedById || '', approvedDate: disposition.approvedDate || now(), ...disposition }; set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, disposition: deviationDisposition, status: 'approved', timeline: [...d.timeline, { id: generateId(), timestamp: now(), action: 'Disposition Set', performedBy: disposition.approvedBy || 'System', details: `Disposition: ${disposition.decision}`, previousStatus: d.status, newStatus: 'approved' }], updatedAt: now() } } })); },
  linkDeviationToCAPA: (deviationId, capaId) => { const d = get().deviations[deviationId]; const capa = get().capas[capaId]; if (d && capa) set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, linkedCAPAs: [...d.linkedCAPAs, capaId], updatedAt: now() } }, capas: { ...state.capas, [capaId]: { ...capa, linkedDeviations: [...capa.linkedDeviations, deviationId], updatedAt: now() } } })); },
  closeDeviation: (deviationId, closedBy) => { const d = get().deviations[deviationId]; if (d) set((state) => ({ deviations: { ...state.deviations, [deviationId]: { ...d, status: 'closed', closedAt: now(), closedBy, timeline: [...d.timeline, { id: generateId(), timestamp: now(), action: 'Deviation Closed', performedBy: closedBy, details: `Deviation ${d.deviationNumber} closed`, previousStatus: d.status, newStatus: 'closed' }], updatedAt: now() } } })); },

  createChangeControl: (data) => {
    const id = generateId(); const changeNumber = data.changeNumber || generateNumber('CC', Object.keys(get().changeControls).length + 1);
    const changeControl: ChangeControl = { id, changeNumber, title: data.title || 'Untitled Change', description: data.description || '', changeType: data.changeType || 'process', category: data.category || 'minor', status: 'draft', priority: data.priority || 'medium', department: data.department || 'quality-assurance', requestorId: data.requestorId || '', requestorName: data.requestorName || '', ownerId: data.ownerId || '', ownerName: data.ownerName || '', justification: data.justification || '', businessDrivers: data.businessDrivers || [], proposedChange: data.proposedChange || { id: generateId(), currentConfiguration: '', proposedConfiguration: '', technicalRationale: '', alternatives: [] }, currentState: data.currentState || '', futureState: data.futureState || '', impactAssessment: { id: generateId(), changeControlId: id, status: 'not-started', overallImpact: 'low', departmentImpacts: [], qualityImpact: { impactLevel: 'none', affectsProductQuality: false, affectsValidationStatus: false, revalidationRequired: false, requalificationRequired: false, stabilityImpact: false, specificationChangeRequired: false, description: '' }, operationalImpact: { impactLevel: 'none', productionDowntime: 0, implementationEffort: 0, trainingEffort: 0, description: '' }, financialImpact: { implementationCost: 0, recurringCost: 0, costSavings: 0, capitalRequired: false, budgetApprovalRequired: false, description: '' }, assessedBy: '', assessedById: '', assessedDate: now() }, riskAssessment: { id: generateId(), changeControlId: id, riskLevel: 'low', riskScore: 0, risks: [], mitigationPlan: '', residualRiskLevel: 'low', assessedBy: '', assessedById: '', assessedDate: now() }, implementationPlan: { id: generateId(), changeControlId: id, status: 'draft', phases: [], totalTasks: 0, completedTasks: 0, targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }, verification: { id: generateId(), changeControlId: id, status: 'not-started', verificationCriteria: [] }, affectedDepartments: data.affectedDepartments || [], affectedProducts: data.affectedProducts || [], affectedProcesses: data.affectedProcesses || [], affectedSystems: data.affectedSystems || [], affectedDocuments: data.affectedDocuments || [], regulatoryAssessment: { id: generateId(), changeControlId: id, regulatoryImpact: 'none', affectedMarkets: [], submissionRequirements: [], assessedBy: '', assessedById: '', assessedDate: now() }, approvalWorkflow: { id: generateId(), templateId: '', documentVersionId: id, currentStepNumber: 0, status: 'in-progress', initiatedAt: now(), initiatedBy: 'system', stepStatuses: [] }, linkedDeviations: data.linkedDeviations || [], linkedCAPAs: data.linkedCAPAs || [], linkedRegIntelAlerts: data.linkedRegIntelAlerts || [], attachments: data.attachments || [], comments: [], timeline: [{ id: generateId(), timestamp: now(), action: 'Change Control Created', performedBy: data.requestorName || 'System', details: `Change Control ${changeNumber} initiated`, newStatus: 'draft' }], targetImplementationDate: data.targetImplementationDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], targetClosureDate: data.targetClosureDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: now(), updatedAt: now(), ...data };
    set((state) => ({ changeControls: { ...state.changeControls, [id]: changeControl }, changeControlsByNumber: { ...state.changeControlsByNumber, [changeNumber]: id } })); return changeControl;
  },
  updateChangeControl: (id, updates) => { const cc = get().changeControls[id]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [id]: { ...cc, ...updates, updatedAt: now() } } })); },
  submitForImpactAssessment: (changeId) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'impact-assessment', impactAssessment: { ...cc.impactAssessment, status: 'in-progress' }, timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Submitted for Impact Assessment', performedBy: cc.requestorName, details: 'Change submitted for impact assessment', previousStatus: cc.status, newStatus: 'impact-assessment' }], updatedAt: now() } } })); },
  completeImpactAssessment: (changeId, assessment) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, impactAssessment: { ...cc.impactAssessment, ...assessment, status: 'completed' }, updatedAt: now() } } })); },
  completeRiskAssessment: (changeId, assessment) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, riskAssessment: { ...cc.riskAssessment, ...assessment }, updatedAt: now() } } })); },
  submitForApprovalCC: (changeId) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'pending-approval', timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Submitted for Approval', performedBy: cc.ownerName, details: 'Change control submitted for approval', previousStatus: cc.status, newStatus: 'pending-approval' }], updatedAt: now() } } })); },
  approveChangeControl: (changeId, approverId, comments) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'approved', timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Change Control Approved', performedBy: approverId, details: comments || 'Change control approved', previousStatus: cc.status, newStatus: 'approved' }], updatedAt: now() } } })); },
  rejectChangeControl: (changeId, approverId, reason) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'rejected', timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Change Control Rejected', performedBy: approverId, details: reason, previousStatus: cc.status, newStatus: 'rejected' }], updatedAt: now() } } })); },
  startImplementation: (changeId) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'implementation', implementationPlan: { ...cc.implementationPlan, status: 'in-progress', startDate: now() }, timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Implementation Started', performedBy: cc.ownerName, details: 'Change implementation initiated', previousStatus: cc.status, newStatus: 'implementation' }], updatedAt: now() } } })); },
  completeImplementationTask: (changeId, phaseId, taskId) => { const cc = get().changeControls[changeId]; if (!cc) return; const updatedPhases = cc.implementationPlan.phases.map((phase) => phase.id === phaseId ? { ...phase, tasks: phase.tasks.map((task) => task.id === taskId ? { ...task, status: 'completed' as const, completedDate: now() } : task) } : phase); const completedTasks = updatedPhases.flatMap((p) => p.tasks).filter((t) => t.status === 'completed').length; set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, implementationPlan: { ...cc.implementationPlan, phases: updatedPhases, completedTasks }, updatedAt: now() } } })); },
  completeVerification: (changeId, result) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'verification', verification: { ...cc.verification, status: 'completed', overallResult: result, verifiedDate: now() }, timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Verification Completed', performedBy: cc.ownerName, details: `Verification result: ${result}`, previousStatus: cc.status, newStatus: 'verification' }], updatedAt: now() } } })); },
  closeChangeControl: (changeId, closedBy) => { const cc = get().changeControls[changeId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeId]: { ...cc, status: 'closed', actualClosureDate: now(), timeline: [...cc.timeline, { id: generateId(), timestamp: now(), action: 'Change Control Closed', performedBy: closedBy, details: `Change Control ${cc.changeNumber} closed`, previousStatus: cc.status, newStatus: 'closed' }], updatedAt: now() } } })); },

  createCurriculum: (data) => { const id = generateId(); const curriculum: TrainingCurriculum = { id, curriculumCode: data.curriculumCode || `CUR-${Date.now()}`, title: data.title || 'Untitled Curriculum', description: data.description || '', department: data.department || 'quality-assurance', targetRoles: data.targetRoles || [], trainingType: data.trainingType || 'initial', courses: data.courses || [], prerequisites: data.prerequisites || [], validityPeriod: data.validityPeriod || 12, isActive: data.isActive ?? true, isMandatory: data.isMandatory ?? false, regulatoryRequirement: data.regulatoryRequirement ?? false, linkedDocumentIds: data.linkedDocumentIds || [], linkedSOPs: data.linkedSOPs || [], createdAt: now(), updatedAt: now(), createdBy: data.createdBy || 'system', effectiveDate: data.effectiveDate || now(), ...data }; set((state) => ({ curricula: { ...state.curricula, [id]: curriculum } })); return curriculum; },
  updateCurriculum: (id, updates) => { const curr = get().curricula[id]; if (curr) set((state) => ({ curricula: { ...state.curricula, [id]: { ...curr, ...updates, updatedAt: now() } } })); },
  createCourse: (data) => { const id = generateId(); const course: TrainingCourse = { id, courseCode: data.courseCode || `CRS-${Date.now()}`, title: data.title || 'Untitled Course', description: data.description || '', version: data.version || '1.0', deliveryMethod: data.deliveryMethod || 'online', duration: data.duration || 60, passingScore: data.passingScore, maxAttempts: data.maxAttempts, materials: data.materials || [], assessmentRequired: data.assessmentRequired ?? false, instructorRequired: data.instructorRequired ?? false, qualifiedInstructors: data.qualifiedInstructors || [], scheduledSessions: data.scheduledSessions || [], isActive: data.isActive ?? true, effectiveDate: data.effectiveDate || now(), createdAt: now(), updatedAt: now(), ...data }; set((state) => ({ courses: { ...state.courses, [id]: course } })); return course; },
  updateCourse: (id, updates) => { const course = get().courses[id]; if (course) set((state) => ({ courses: { ...state.courses, [id]: { ...course, ...updates, updatedAt: now() } } })); },
  assignTraining: (userId, curriculumId, courseId, dueDate) => { const id = generateId(); const curriculum = get().curricula[curriculumId]; const course = get().courses[courseId]; const assignment: TrainingAssignment = { id, userId, userName: userId, curriculumId, curriculumTitle: curriculum?.title || '', courseId, courseTitle: course?.title || '', assignedDate: now(), dueDate, status: 'not-started', assignedBy: 'system', assignedReason: 'new-hire', attempts: [], currentAttempt: 0, passed: null }; set((state) => ({ assignments: { ...state.assignments, [id]: assignment }, assignmentsByUser: { ...state.assignmentsByUser, [userId]: [...(state.assignmentsByUser[userId] || []), id] } })); return assignment; },
  startTraining: (assignmentId) => { const a = get().assignments[assignmentId]; if (!a) return; const attempt: TrainingAttempt = { id: generateId(), attemptNumber: a.currentAttempt + 1, startedAt: now(), status: 'in-progress', passed: null, timeSpent: 0 }; set((state) => ({ assignments: { ...state.assignments, [assignmentId]: { ...a, status: 'in-progress', attempts: [...a.attempts, attempt], currentAttempt: attempt.attemptNumber } } })); },
  completeTraining: (assignmentId, score) => { const a = get().assignments[assignmentId]; if (!a) return; const course = get().courses[a.courseId]; const passed = !course?.passingScore || (score !== undefined && score >= course.passingScore); const updatedAttempts = a.attempts.map((att, i) => i === a.attempts.length - 1 ? { ...att, status: 'completed' as const, completedAt: now(), score, passed } : att); set((state) => ({ assignments: { ...state.assignments, [assignmentId]: { ...a, status: 'completed', completedDate: now(), score, passed, attempts: updatedAttempts, expirationDate: get().curricula[a.curriculumId]?.validityPeriod ? new Date(Date.now() + get().curricula[a.curriculumId].validityPeriod * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined } } })); },
  failTraining: (assignmentId, score) => { const a = get().assignments[assignmentId]; if (a) set((state) => ({ assignments: { ...state.assignments, [assignmentId]: { ...a, status: 'failed', score, passed: false, attempts: a.attempts.map((att, i) => i === a.attempts.length - 1 ? { ...att, status: 'completed' as const, completedAt: now(), score, passed: false } : att) } } })); },
  exemptFromTraining: (assignmentId, reason, approvedBy) => { const a = get().assignments[assignmentId]; if (a) set((state) => ({ assignments: { ...state.assignments, [assignmentId]: { ...a, status: 'exempted', exemptionReason: reason, exemptionApprovedBy: approvedBy } } })); },
  scheduleTrainingSession: (courseId, session) => { const course = get().courses[courseId]; if (!course) return null as unknown as TrainingSession; const id = generateId(); const trainingSession: TrainingSession = { id, courseId, sessionDate: session.sessionDate || '', startTime: session.startTime || '', endTime: session.endTime || '', location: session.location || '', instructorId: session.instructorId || '', instructorName: session.instructorName || '', maxParticipants: session.maxParticipants || 20, enrolledParticipants: session.enrolledParticipants || [], status: 'scheduled', ...session }; set((state) => ({ courses: { ...state.courses, [courseId]: { ...course, scheduledSessions: [...course.scheduledSessions, trainingSession] } } })); return trainingSession; },
  issueCertificate: (assignmentId) => { const a = get().assignments[assignmentId]; if (!a || !a.passed) return null as unknown as TrainingCertificate; const id = generateId(); const certificate: TrainingCertificate = { id, certificateNumber: `CERT-${Date.now()}`, assignmentId, userId: a.userId, userName: a.userName, courseId: a.courseId, courseTitle: a.courseTitle, curriculumId: a.curriculumId, curriculumTitle: a.curriculumTitle, issuedDate: now(), expirationDate: a.expirationDate, score: a.score, status: 'active' }; set((state) => ({ certificates: { ...state.certificates, [id]: certificate }, assignments: { ...state.assignments, [assignmentId]: { ...a, certificateId: id } } })); return certificate; },
  calculateUserCompliance: (userId) => { const userAssignments = get().assignmentsByUser[userId] || []; const assignments = userAssignments.map((id) => get().assignments[id]).filter(Boolean); const completed = assignments.filter((a) => a.status === 'completed'); const overdue = assignments.filter((a) => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()); const upcoming = assignments.filter((a) => a.expirationDate && new Date(a.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); const record: TrainingRecord = { id: generateId(), userId, userName: userId, employeeId: userId, department: 'quality-assurance', role: '', completedTrainings: completed.map((a) => ({ assignmentId: a.id, curriculumId: a.curriculumId, curriculumTitle: a.curriculumTitle, courseId: a.courseId, courseTitle: a.courseTitle, completedDate: a.completedDate || '', expirationDate: a.expirationDate, score: a.score, certificateId: a.certificateId })), currentAssignments: assignments.filter((a) => a.status === 'in-progress').map((a) => a.id), overdueAssignments: overdue.map((a) => a.id), upcomingExpirations: upcoming.map((a) => ({ assignmentId: a.id, trainingTitle: a.courseTitle, expirationDate: a.expirationDate!, daysUntilExpiration: Math.ceil((new Date(a.expirationDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)), renewalRequired: true })), complianceStatus: overdue.length > 0 ? 'non-compliant' : upcoming.length > 0 ? 'at-risk' : 'compliant', compliancePercentage: assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 100 }; set((state) => ({ trainingRecords: { ...state.trainingRecords, [userId]: record } })); return record; },

  createAudit: (data) => { const id = generateId(); const auditNumber = data.auditNumber || generateNumber('AUD', Object.keys(get().audits).length + 1); const audit: QMSAudit = { id, auditNumber, title: data.title || 'Untitled Audit', auditType: data.auditType || 'internal', scope: data.scope || 'system', status: 'planned', department: data.department || 'quality-assurance', affectedDepartments: data.affectedDepartments || [], scheduledStartDate: data.scheduledStartDate || '', scheduledEndDate: data.scheduledEndDate || '', auditPlan: data.auditPlan || { id: generateId(), auditId: id, version: '1.0', status: 'draft', objectives: [], scope: '', criteria: [], methodology: '', schedule: [], resourceRequirements: '' }, auditTeam: data.auditTeam || [], leadAuditorId: data.leadAuditorId || '', leadAuditorName: data.leadAuditorName || '', auditees: data.auditees || [], regulatoryFrameworks: data.regulatoryFrameworks || [], findings: [], linkedCAPAs: data.linkedCAPAs || [], linkedDeviations: data.linkedDeviations || [], attachments: data.attachments || [], comments: [], timeline: [{ id: generateId(), timestamp: now(), action: 'Audit Created', performedBy: data.leadAuditorName || 'System', details: `Audit ${auditNumber} created`, newStatus: 'planned' }], createdAt: now(), updatedAt: now(), ...data }; set((state) => ({ audits: { ...state.audits, [id]: audit }, auditsByNumber: { ...state.auditsByNumber, [auditNumber]: id }, findingsByAudit: { ...state.findingsByAudit, [id]: [] } })); return audit; },
  updateAudit: (id, updates) => { const audit = get().audits[id]; if (audit) set((state) => ({ audits: { ...state.audits, [id]: { ...audit, ...updates, updatedAt: now() } } })); },
  createAuditPlan: (auditId, plan) => { const audit = get().audits[auditId]; if (!audit) return null as unknown as QMSAuditPlan; const auditPlan: QMSAuditPlan = { id: generateId(), auditId, version: plan.version || '1.0', status: 'draft', objectives: plan.objectives || [], scope: plan.scope || '', criteria: plan.criteria || [], methodology: plan.methodology || '', schedule: plan.schedule || [], resourceRequirements: plan.resourceRequirements || '', ...plan }; set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, auditPlan, status: 'preparation', updatedAt: now() } } })); return auditPlan; },
  approveAuditPlan: (auditId, approvedBy) => { const audit = get().audits[auditId]; if (audit) set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, auditPlan: { ...audit.auditPlan, status: 'approved', approvedBy, approvedDate: now() }, status: 'scheduled', timeline: [...audit.timeline, { id: generateId(), timestamp: now(), action: 'Audit Plan Approved', performedBy: approvedBy, details: 'Audit plan approved', previousStatus: audit.status, newStatus: 'scheduled' }], updatedAt: now() } } })); },
  startAudit: (auditId) => { const audit = get().audits[auditId]; if (audit) set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, status: 'in-progress', actualStartDate: now(), timeline: [...audit.timeline, { id: generateId(), timestamp: now(), action: 'Audit Started', performedBy: audit.leadAuditorName, details: 'Audit execution started', previousStatus: audit.status, newStatus: 'in-progress' }], updatedAt: now() } } })); },
  addAuditFinding: (auditId, finding) => { const audit = get().audits[auditId]; if (!audit) return null as unknown as AuditFinding; const id = generateId(); const findingNumber = `${audit.auditNumber}-F${(audit.findings.length + 1).toString().padStart(3, '0')}`; const auditFinding: AuditFinding = { id, auditId, findingNumber, title: finding.title || '', description: finding.description || '', severity: finding.severity || 'minor', category: finding.category || '', affectedProcess: finding.affectedProcess || '', affectedDepartment: finding.affectedDepartment || 'quality-assurance', evidence: finding.evidence || '', status: 'open', capaRequired: finding.capaRequired ?? false, ...finding }; set((state) => ({ findings: { ...state.findings, [id]: auditFinding }, findingsByAudit: { ...state.findingsByAudit, [auditId]: [...(state.findingsByAudit[auditId] || []), id] }, audits: { ...state.audits, [auditId]: { ...audit, findings: [...audit.findings, auditFinding], updatedAt: now() } } })); return auditFinding; },
  updateFindingResponse: (findingId, response) => { const finding = get().findings[findingId]; if (!finding) return; const auditeeResponse: AuditeeResponse = { id: generateId(), findingId, responseDate: response.responseDate || now(), respondedBy: response.respondedBy || '', respondedById: response.respondedById || '', correctiveActions: response.correctiveActions || '', targetCompletionDate: response.targetCompletionDate || '', attachmentIds: response.attachmentIds || [], status: 'submitted', ...response }; set((state) => ({ findings: { ...state.findings, [findingId]: { ...finding, auditeeResponse, status: 'response-received' } } })); },
  verifyFinding: (findingId, result, verifiedBy) => { const finding = get().findings[findingId]; if (finding) set((state) => ({ findings: { ...state.findings, [findingId]: { ...finding, status: 'verified', verificationDate: now(), verifiedBy, verificationResult: result } } })); },
  closeFinding: (findingId, closedBy) => { const finding = get().findings[findingId]; if (finding) set((state) => ({ findings: { ...state.findings, [findingId]: { ...finding, status: 'closed', closedDate: now(), closedBy } } })); },
  generateAuditReport: (auditId) => { const audit = get().audits[auditId]; if (!audit) return null as unknown as AuditReport; const findingsSummary: FindingsSummary = { totalFindings: audit.findings.length, critical: audit.findings.filter((f) => f.severity === 'critical').length, major: audit.findings.filter((f) => f.severity === 'major').length, minor: audit.findings.filter((f) => f.severity === 'minor').length, observations: audit.findings.filter((f) => f.severity === 'observation').length, opportunities: audit.findings.filter((f) => f.severity === 'opportunity').length, openFindings: audit.findings.filter((f) => f.status === 'open').length, closedFindings: audit.findings.filter((f) => f.status === 'closed').length }; const report: AuditReport = { id: generateId(), auditId, reportNumber: `${audit.auditNumber}-RPT`, version: '1.0', status: 'draft', executiveSummary: '', scope: audit.auditPlan.scope, methodology: audit.auditPlan.methodology, findingsSummary, conclusions: '', recommendations: [], distributionList: [], preparedBy: audit.leadAuditorName, preparedDate: now() }; set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, report, status: 'report-draft', updatedAt: now() } } })); return report; },
  issueAuditReport: (auditId, issuedBy) => { const audit = get().audits[auditId]; if (audit && audit.report) set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, report: { ...audit.report!, status: 'issued', issuedDate: now() }, status: 'closed', actualEndDate: now(), timeline: [...audit.timeline, { id: generateId(), timestamp: now(), action: 'Audit Report Issued', performedBy: issuedBy, details: 'Audit report issued and audit closed', previousStatus: audit.status, newStatus: 'closed' }], updatedAt: now() } } })); },
  closeAudit: (auditId, closedBy) => { const audit = get().audits[auditId]; if (audit) set((state) => ({ audits: { ...state.audits, [auditId]: { ...audit, status: 'closed', actualEndDate: now(), timeline: [...audit.timeline, { id: generateId(), timestamp: now(), action: 'Audit Closed', performedBy: closedBy, details: `Audit ${audit.auditNumber} closed`, previousStatus: audit.status, newStatus: 'closed' }], updatedAt: now() } } })); },

  defineMetric: (data) => { const id = generateId(); const metric: QualityMetric = { id, metricCode: data.metricCode || `MET-${Date.now()}`, name: data.name || 'Untitled Metric', description: data.description || '', category: data.category || 'capa', formula: data.formula || '', unit: data.unit || '%', target: data.target || 0, warningThreshold: data.warningThreshold || 0, criticalThreshold: data.criticalThreshold || 0, higherIsBetter: data.higherIsBetter ?? true, isActive: data.isActive ?? true, frequency: data.frequency || 'monthly', owner: data.owner || '', ownerId: data.ownerId || '', ...data }; set((state) => ({ metrics: { ...state.metrics, [id]: metric }, metricData: { ...state.metricData, [id]: [] } })); return metric; },
  updateMetric: (id, updates) => { const metric = get().metrics[id]; if (metric) set((state) => ({ metrics: { ...state.metrics, [id]: { ...metric, ...updates } } })); },
  recordMetricData: (metricId, data) => { const metric = get().metrics[metricId]; if (!metric) return; const existingData = get().metricData[metricId] || []; const previousPoint = existingData[existingData.length - 1]; const value = data.value || 0; const status = value >= metric.criticalThreshold ? (metric.higherIsBetter ? 'on-target' : 'critical') : value >= metric.warningThreshold ? 'warning' : (metric.higherIsBetter ? 'critical' : 'on-target'); const dataPoint: MetricDataPoint = { id: generateId(), metricId, period: data.period || now(), periodType: data.periodType || 'monthly', value, target: metric.target, status: status as 'on-target' | 'warning' | 'critical', trend: calculateTrend(value, previousPoint?.value), previousValue: previousPoint?.value, changePercent: previousPoint?.value ? ((value - previousPoint.value) / previousPoint.value) * 100 : undefined, dataSource: data.dataSource || 'manual', calculatedAt: now(), calculatedBy: data.calculatedBy || 'system', ...data }; set((state) => ({ metricData: { ...state.metricData, [metricId]: [...existingData, dataPoint] } })); },
  calculateMetrics: (period, periodType) => { const state = get(); Object.values(state.metrics).forEach((metric) => { let value = 0; const capas = Object.values(state.capas); const deviations = Object.values(state.deviations); const records = Object.values(state.trainingRecords); switch (metric.category) { case 'capa': if (metric.metricCode.includes('OPEN')) value = capas.filter((c) => c.status !== 'closed' && c.status !== 'cancelled').length; else if (metric.metricCode.includes('OVERDUE')) value = capas.filter((c) => c.status !== 'closed' && c.status !== 'cancelled' && new Date(c.targetCompletionDate) < new Date()).length; break; case 'deviation': if (metric.metricCode.includes('OPEN')) value = deviations.filter((d) => d.status !== 'closed' && d.status !== 'cancelled').length; break; case 'training': if (metric.metricCode.includes('COMPLIANCE')) value = records.length > 0 ? records.reduce((sum, r) => sum + r.compliancePercentage, 0) / records.length : 100; break; } get().recordMetricData(metric.id, { value, period, periodType }); }); },
  generateDashboard: (period, periodType) => { const state = get(); const summaryMetrics: SummaryMetric[] = [ { name: 'Open CAPAs', value: Object.values(state.capas).filter((c) => c.status !== 'closed' && c.status !== 'cancelled').length, unit: '', target: 10, status: 'on-target', trend: 'stable', changeFromPrevious: 0 }, { name: 'Open Deviations', value: Object.values(state.deviations).filter((d) => d.status !== 'closed' && d.status !== 'cancelled').length, unit: '', target: 15, status: 'on-target', trend: 'stable', changeFromPrevious: 0 }, { name: 'Training Compliance', value: Object.values(state.trainingRecords).length > 0 ? Object.values(state.trainingRecords).reduce((sum, r) => sum + r.compliancePercentage, 0) / Object.values(state.trainingRecords).length : 100, unit: '%', target: 95, status: 'on-target', trend: 'stable', changeFromPrevious: 0 }, { name: 'Open Audit Findings', value: Object.values(state.findings).filter((f) => f.status === 'open').length, unit: '', target: 5, status: 'on-target', trend: 'stable', changeFromPrevious: 0 } ]; const dashboard: QualityDashboard = { id: generateId(), generatedAt: now(), period, periodType, summaryMetrics, categoryMetrics: [], trendCharts: [], alerts: [], recommendations: [] }; set({ dashboardData: dashboard }); return dashboard; },
  acknowledgeAlert: (alertId, acknowledgedBy) => { const dashboard = get().dashboardData; if (dashboard) set({ dashboardData: { ...dashboard, alerts: dashboard.alerts.map((a) => a.id === alertId ? { ...a, acknowledgedAt: now(), acknowledgedBy } : a) } }); },

  createManagementReview: (data) => { const id = generateId(); const reviewNumber = data.reviewNumber || generateNumber('MR', Object.keys(get().managementReviews).length + 1); const review: ManagementReview = { id, reviewNumber, title: data.title || 'Management Review', reviewDate: data.reviewDate || now(), status: 'scheduled', chairpersonId: data.chairpersonId || '', chairpersonName: data.chairpersonName || '', attendees: data.attendees || [], agenda: data.agenda || [], inputs: data.inputs || [], outputs: data.outputs || [], decisions: data.decisions || [], actionItems: data.actionItems || [], attachments: data.attachments || [], createdAt: now(), updatedAt: now(), ...data }; set((state) => ({ managementReviews: { ...state.managementReviews, [id]: review } })); return review; },
  updateManagementReview: (id, updates) => { const review = get().managementReviews[id]; if (review) set((state) => ({ managementReviews: { ...state.managementReviews, [id]: { ...review, ...updates, updatedAt: now() } } })); },
  addReviewInput: (reviewId, input) => { const review = get().managementReviews[reviewId]; if (review) { const reviewInput: ManagementReviewInput = { id: generateId(), category: input.category || 'process-performance', title: input.title || '', summary: input.summary || '', presenter: input.presenter || '', ...input }; set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, inputs: [...review.inputs, reviewInput], updatedAt: now() } } })); } },
  addReviewOutput: (reviewId, output) => { const review = get().managementReviews[reviewId]; if (review) { const reviewOutput: ManagementReviewOutput = { id: generateId(), category: output.category || 'improvement-opportunities', title: output.title || '', description: output.description || '', priority: output.priority || 'medium', actionRequired: output.actionRequired ?? false, ...output }; set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, outputs: [...review.outputs, reviewOutput], updatedAt: now() } } })); } },
  addReviewDecision: (reviewId, decision) => { const review = get().managementReviews[reviewId]; if (review) { const reviewDecision: ReviewDecision = { id: generateId(), decisionNumber: review.decisions.length + 1, topic: decision.topic || '', decision: decision.decision || '', rationale: decision.rationale || '', ...decision }; set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, decisions: [...review.decisions, reviewDecision], updatedAt: now() } } })); } },
  addReviewActionItem: (reviewId, actionItem) => { const review = get().managementReviews[reviewId]; if (review) { const item: ReviewActionItem = { id: generateId(), actionNumber: review.actionItems.length + 1, description: actionItem.description || '', assigneeId: actionItem.assigneeId || '', assigneeName: actionItem.assigneeName || '', dueDate: actionItem.dueDate || '', status: 'open', ...actionItem }; set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, actionItems: [...review.actionItems, item], updatedAt: now() } } })); } },
  completeReviewAction: (reviewId, actionId) => { const review = get().managementReviews[reviewId]; if (review) set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, actionItems: review.actionItems.map((a) => a.id === actionId ? { ...a, status: 'completed' as const, completedDate: now() } : a), updatedAt: now() } } })); },
  closeManagementReview: (reviewId) => { const review = get().managementReviews[reviewId]; if (review) set((state) => ({ managementReviews: { ...state.managementReviews, [reviewId]: { ...review, status: 'completed', updatedAt: now() } } })); },

  linkRegIntelToChangeControl: (regIntelAlertId, changeControlId) => { const cc = get().changeControls[changeControlId]; if (cc) set((state) => ({ changeControls: { ...state.changeControls, [changeControlId]: { ...cc, linkedRegIntelAlerts: [...cc.linkedRegIntelAlerts, regIntelAlertId], updatedAt: now() } } })); },
  triggerTrainingFromDocumentUpdate: (documentId) => { const doc = get().controlledDocuments[documentId]; if (doc?.trainingRequired) { /* Training triggered */ } },
  createCAPAFromAuditFinding: (findingId) => { const finding = get().findings[findingId]; if (!finding) return null as unknown as CAPA; const capa = get().createCAPA({ title: `CAPA from Audit Finding: ${finding.title}`, description: finding.description, source: 'audit-finding', sourceRecordId: findingId, sourceRecordNumber: finding.findingNumber, severity: finding.severity === 'critical' ? 'critical' : finding.severity === 'major' ? 'major' : 'minor', department: finding.affectedDepartment, linkedAuditFindings: [findingId] }); set((state) => ({ findings: { ...state.findings, [findingId]: { ...finding, capaRequired: true, capaId: capa.id } } })); return capa; },
  createCAPAFromDeviation: (deviationId) => { const deviation = get().deviations[deviationId]; if (!deviation) return null as unknown as CAPA; const capa = get().createCAPA({ title: `CAPA from Deviation: ${deviation.title}`, description: deviation.description, source: 'deviation', sourceRecordId: deviationId, sourceRecordNumber: deviation.deviationNumber, severity: deviation.severity, department: deviation.department, linkedDeviations: [deviationId] }); get().linkDeviationToCAPA(deviationId, capa.id); return capa; },

  setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),
  setSelectedCAPAId: (id) => set({ selectedCAPAId: id }),
  setSelectedDeviationId: (id) => set({ selectedDeviationId: id }),
  setSelectedChangeControlId: (id) => set({ selectedChangeControlId: id }),
  setSelectedAuditId: (id) => set({ selectedAuditId: id }),
  setSelectedAssignmentId: (id) => set({ selectedAssignmentId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ lastError: error }),

  loadMockData: () => { const s = get(); s.createDocument({ documentNumber: 'SOP-QA-001', title: 'Quality Management System Overview', documentType: 'sop', department: 'quality-assurance', author: 'Jane Smith', owner: 'John Doe', trainingRequired: true }); s.createCAPA({ title: 'Equipment Calibration Process Improvement', capaType: 'both', source: 'trend-analysis', priority: 'high', severity: 'major', department: 'manufacturing', assigneeName: 'Mike Johnson', ownerName: 'Sarah Williams' }); s.createDeviation({ title: 'Temperature Excursion in Storage Area A', deviationType: 'unplanned', category: 'environmental', severity: 'minor', department: 'manufacturing', discoveredBy: 'Tom Brown', reportedBy: 'Tom Brown' }); s.createChangeControl({ title: 'Equipment Upgrade: Tablet Press Line 1', changeType: 'equipment', category: 'major', priority: 'high', department: 'manufacturing', requestorName: 'Engineering', ownerName: 'Production Manager' }); s.createCurriculum({ curriculumCode: 'CUR-GMP-001', title: 'GMP Fundamentals', department: 'manufacturing', isMandatory: true }); s.createCourse({ courseCode: 'CRS-GMP-101', title: 'Introduction to GMP', deliveryMethod: 'online', duration: 120, passingScore: 80, assessmentRequired: true }); s.createAudit({ title: 'Annual Internal Quality Audit 2024', auditType: 'internal', scope: 'system', department: 'quality-assurance', scheduledStartDate: '2024-03-01', scheduledEndDate: '2024-03-05', leadAuditorName: 'Quality Director' }); s.defineMetric({ metricCode: 'CAPA-OPEN', name: 'Open CAPAs', category: 'capa', target: 10, warningThreshold: 15, criticalThreshold: 20, higherIsBetter: false }); s.generateDashboard('2024-12', 'monthly'); },
  clearAll: () => set(initialState),
}));

// ============================================================================
// SELECTOR HOOKS - Wrapped with useMemo for stable references
// ============================================================================

// Controlled Documents
export const useControlledDocuments = () => {
  const docs = useQMSStore((state) => state.controlledDocuments);
  return useMemo(() => Object.values(docs), [docs]);
};

export const useSelectedDocument = () => {
  const docs = useQMSStore((state) => state.controlledDocuments);
  const selectedId = useQMSStore((state) => state.selectedDocumentId);
  return useMemo(() => selectedId ? docs[selectedId] : null, [docs, selectedId]);
};

export const useDocumentsByDepartment = (dept: QMSDepartment) => {
  const docs = useQMSStore((state) => state.controlledDocuments);
  return useMemo(() => Object.values(docs).filter((d) => d.department === dept), [docs, dept]);
};

export const useEffectiveDocuments = () => {
  const docs = useQMSStore((state) => state.controlledDocuments);
  return useMemo(() => Object.values(docs).filter((d) => d.status === 'effective'), [docs]);
};

// CAPAs
export const useCAPAs = () => {
  const capas = useQMSStore((state) => state.capas);
  return useMemo(() => Object.values(capas), [capas]);
};

export const useSelectedCAPA = () => {
  const capas = useQMSStore((state) => state.capas);
  const selectedId = useQMSStore((state) => state.selectedCAPAId);
  return useMemo(() => selectedId ? capas[selectedId] : null, [capas, selectedId]);
};

export const useOpenCAPAs = () => {
  const capas = useQMSStore((state) => state.capas);
  return useMemo(() => Object.values(capas).filter((c) => c.status !== 'closed' && c.status !== 'cancelled'), [capas]);
};

export const useOverdueCAPAs = () => {
  const capas = useQMSStore((state) => state.capas);
  return useMemo(() => Object.values(capas).filter((c) => c.status !== 'closed' && c.status !== 'cancelled' && new Date(c.targetCompletionDate) < new Date()), [capas]);
};

export const useCAPAsByDepartment = (dept: QMSDepartment) => {
  const capas = useQMSStore((state) => state.capas);
  return useMemo(() => Object.values(capas).filter((c) => c.department === dept), [capas, dept]);
};

// Deviations
export const useDeviations = () => {
  const deviations = useQMSStore((state) => state.deviations);
  return useMemo(() => Object.values(deviations), [deviations]);
};

export const useSelectedDeviation = () => {
  const deviations = useQMSStore((state) => state.deviations);
  const selectedId = useQMSStore((state) => state.selectedDeviationId);
  return useMemo(() => selectedId ? deviations[selectedId] : null, [deviations, selectedId]);
};

export const useOpenDeviations = () => {
  const deviations = useQMSStore((state) => state.deviations);
  return useMemo(() => Object.values(deviations).filter((d) => d.status !== 'closed' && d.status !== 'cancelled'), [deviations]);
};

export const useDeviationsBySeverity = (severity: QMSSeverity) => {
  const deviations = useQMSStore((state) => state.deviations);
  return useMemo(() => Object.values(deviations).filter((d) => d.severity === severity), [deviations, severity]);
};

// Change Controls
export const useChangeControls = () => {
  const changeControls = useQMSStore((state) => state.changeControls);
  return useMemo(() => Object.values(changeControls), [changeControls]);
};

export const useSelectedChangeControl = () => {
  const changeControls = useQMSStore((state) => state.changeControls);
  const selectedId = useQMSStore((state) => state.selectedChangeControlId);
  return useMemo(() => selectedId ? changeControls[selectedId] : null, [changeControls, selectedId]);
};

export const useOpenChangeControls = () => {
  const changeControls = useQMSStore((state) => state.changeControls);
  return useMemo(() => Object.values(changeControls).filter((cc) => cc.status !== 'closed' && cc.status !== 'cancelled' && cc.status !== 'rejected'), [changeControls]);
};

export const usePendingApprovalCCs = () => {
  const changeControls = useQMSStore((state) => state.changeControls);
  return useMemo(() => Object.values(changeControls).filter((cc) => cc.status === 'pending-approval'), [changeControls]);
};

// Training
export const useCurricula = () => {
  const curricula = useQMSStore((state) => state.curricula);
  return useMemo(() => Object.values(curricula), [curricula]);
};

export const useCourses = () => {
  const courses = useQMSStore((state) => state.courses);
  return useMemo(() => Object.values(courses), [courses]);
};

export const useTrainingAssignments = () => {
  const assignments = useQMSStore((state) => state.assignments);
  return useMemo(() => Object.values(assignments), [assignments]);
};

export const useUserAssignments = (userId: string) => {
  const assignments = useQMSStore((state) => state.assignments);
  const assignmentsByUser = useQMSStore((state) => state.assignmentsByUser);
  return useMemo(() => (assignmentsByUser[userId] || []).map((id) => assignments[id]).filter(Boolean), [assignments, assignmentsByUser, userId]);
};

export const useOverdueAssignments = () => {
  const assignments = useQMSStore((state) => state.assignments);
  return useMemo(() => Object.values(assignments).filter((a) => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()), [assignments]);
};

export const useTrainingRecords = () => {
  const records = useQMSStore((state) => state.trainingRecords);
  return useMemo(() => Object.values(records), [records]);
};

export const useCertificates = () => {
  const certificates = useQMSStore((state) => state.certificates);
  return useMemo(() => Object.values(certificates), [certificates]);
};

// Audits
export const useAudits = () => {
  const audits = useQMSStore((state) => state.audits);
  return useMemo(() => Object.values(audits), [audits]);
};

export const useSelectedAudit = () => {
  const audits = useQMSStore((state) => state.audits);
  const selectedId = useQMSStore((state) => state.selectedAuditId);
  return useMemo(() => selectedId ? audits[selectedId] : null, [audits, selectedId]);
};

export const useUpcomingAudits = () => {
  const audits = useQMSStore((state) => state.audits);
  return useMemo(() => Object.values(audits).filter((a) => (a.status === 'planned' || a.status === 'scheduled') && new Date(a.scheduledStartDate) > new Date()), [audits]);
};

export const useAuditFindings = () => {
  const findings = useQMSStore((state) => state.findings);
  return useMemo(() => Object.values(findings), [findings]);
};

export const useOpenFindings = () => {
  const findings = useQMSStore((state) => state.findings);
  return useMemo(() => Object.values(findings).filter((f) => f.status === 'open' || f.status === 'response-pending'), [findings]);
};

export const useFindingsByAudit = (auditId: string) => {
  const findings = useQMSStore((state) => state.findings);
  const findingsByAudit = useQMSStore((state) => state.findingsByAudit);
  return useMemo(() => (findingsByAudit[auditId] || []).map((id) => findings[id]).filter(Boolean), [findings, findingsByAudit, auditId]);
};

export const useChecklists = () => {
  const checklists = useQMSStore((state) => state.checklists);
  return useMemo(() => Object.values(checklists), [checklists]);
};

// Metrics & Dashboard
export const useQualityMetrics = () => {
  const metrics = useQMSStore((state) => state.metrics);
  return useMemo(() => Object.values(metrics), [metrics]);
};

export const useMetricData = (metricId: string) => {
  const metricData = useQMSStore((state) => state.metricData);
  return useMemo(() => metricData[metricId] || [], [metricData, metricId]);
};

export const useQualityDashboard = () => useQMSStore((state) => state.dashboardData);

export const useManagementReviews = () => {
  const reviews = useQMSStore((state) => state.managementReviews);
  return useMemo(() => Object.values(reviews), [reviews]);
};

// UI State - stable selectors
export const useQMSFilters = () => useQMSStore((state) => state.filters);
export const useQMSActiveView = () => useQMSStore((state) => state.activeView);
export const useQMSLoading = () => useQMSStore((state) => state.isLoading);
export const useQMSError = () => useQMSStore((state) => state.lastError);

// Summary - complex derived state
export const useQMSSummary = () => {
  const capas = useQMSStore((state) => state.capas);
  const deviations = useQMSStore((state) => state.deviations);
  const changeControls = useQMSStore((state) => state.changeControls);
  const assignments = useQMSStore((state) => state.assignments);
  const findings = useQMSStore((state) => state.findings);
  const audits = useQMSStore((state) => state.audits);
  
  return useMemo(() => ({
    openCAPAs: Object.values(capas).filter((c) => c.status !== 'closed' && c.status !== 'cancelled').length,
    overdueCAPAs: Object.values(capas).filter((c) => c.status !== 'closed' && c.status !== 'cancelled' && new Date(c.targetCompletionDate) < new Date()).length,
    openDeviations: Object.values(deviations).filter((d) => d.status !== 'closed' && d.status !== 'cancelled').length,
    openChangeControls: Object.values(changeControls).filter((cc) => cc.status !== 'closed' && cc.status !== 'cancelled' && cc.status !== 'rejected').length,
    overdueTraining: Object.values(assignments).filter((a) => a.status !== 'completed' && a.status !== 'exempted' && new Date(a.dueDate) < new Date()).length,
    openAuditFindings: Object.values(findings).filter((f) => f.status === 'open').length,
    upcomingAudits: Object.values(audits).filter((a) => (a.status === 'planned' || a.status === 'scheduled') && new Date(a.scheduledStartDate) > new Date()).length,
  }), [capas, deviations, changeControls, assignments, findings, audits]);
};
