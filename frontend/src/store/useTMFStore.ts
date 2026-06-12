

// ============================================================================
// TMF Store - Trial Master File (v54)
// State management for eTMF, auto-linking, completeness, inspection readiness
// v54: Added cross-module event emissions
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import { TMFState, TMFActions, TMFZone, TMFStudy, TMFArtifact, AutoLinkRule, AutoLinkEvent, CompletenessReport, ZoneCompletenessScore, MissingArtifact, InspectionReadinessAssessment, InspectionFinding, TMFDashboardData, ValidationError, TMFZoneDefinition, TMFSectionDefinition, TMFArtifactDefinition, StudyMilestone, SourceModule, ZoneSummary } from './tmfTypes';
import { useCrossModuleStore } from './useCrossModuleStore';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const ZONE_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management', 'zone-02': 'Central Trial Documents', 'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC and Other Approvals', 'zone-05': 'Site Management', 'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting', 'zone-08': 'Central and Local Testing', 'zone-09': 'Third Parties', 'zone-10': 'Data Management',
};

const defaultZoneDefinitions: Record<TMFZone, TMFZoneDefinition> = {
  'zone-01': { zone: 'zone-01', name: 'Trial Management', description: 'Trial oversight and planning', isCritical: true },
  'zone-02': { zone: 'zone-02', name: 'Central Trial Documents', description: 'Protocol, IB, amendments', isCritical: true },
  'zone-03': { zone: 'zone-03', name: 'Regulatory', description: 'RA correspondence and approvals', isCritical: true },
  'zone-04': { zone: 'zone-04', name: 'IRB/IEC', description: 'Ethics approvals', isCritical: true },
  'zone-05': { zone: 'zone-05', name: 'Site Management', description: 'Site documentation', isCritical: true },
  'zone-06': { zone: 'zone-06', name: 'IP and Trial Supplies', description: 'IP accountability', isCritical: true },
  'zone-07': { zone: 'zone-07', name: 'Safety Reporting', description: 'SAE and safety reports', isCritical: true },
  'zone-08': { zone: 'zone-08', name: 'Central and Local Testing', description: 'Lab certifications', isCritical: false },
  'zone-09': { zone: 'zone-09', name: 'Third Parties', description: 'Vendor agreements', isCritical: false },
  'zone-10': { zone: 'zone-10', name: 'Data Management', description: 'DMP and database docs', isCritical: true },
};

const defaultSections: Record<string, TMFSectionDefinition> = {
  'sec-02.01': { id: 'sec-02.01', zone: 'zone-02', sectionNumber: '02.01', name: 'Protocol', description: 'Protocol and amendments', isRequired: true, milestone: 'study-start-up' },
  'sec-02.02': { id: 'sec-02.02', zone: 'zone-02', sectionNumber: '02.02', name: 'Investigator Brochure', description: 'IB and updates', isRequired: true, milestone: 'study-start-up' },
  'sec-03.01': { id: 'sec-03.01', zone: 'zone-03', sectionNumber: '03.01', name: 'Regulatory Applications', description: 'IND/CTA applications', isRequired: true, milestone: 'study-start-up' },
  'sec-04.02': { id: 'sec-04.02', zone: 'zone-04', sectionNumber: '04.02', name: 'IRB/IEC Approvals', description: 'Ethics approvals', isRequired: true, milestone: 'first-site-initiated' },
  'sec-05.03': { id: 'sec-05.03', zone: 'zone-05', sectionNumber: '05.03', name: 'Site Initiation', description: 'SIV documentation', isRequired: true, milestone: 'first-site-initiated' },
  'sec-05.04': { id: 'sec-05.04', zone: 'zone-05', sectionNumber: '05.04', name: 'Site Monitoring', description: 'Monitoring visit reports', isRequired: true, milestone: 'first-subject-enrolled' },
  'sec-05.05': { id: 'sec-05.05', zone: 'zone-05', sectionNumber: '05.05', name: 'Investigator Documentation', description: 'CVs, licenses, 1572', isRequired: true, milestone: 'first-site-initiated' },
  'sec-07.01': { id: 'sec-07.01', zone: 'zone-07', sectionNumber: '07.01', name: 'Safety Management Plan', description: 'Safety and PV plans', isRequired: true, milestone: 'study-start-up' },
  'sec-07.02': { id: 'sec-07.02', zone: 'zone-07', sectionNumber: '07.02', name: 'SAE Reports', description: 'SAE reports and follow-ups', isRequired: true, milestone: 'first-subject-enrolled' },
  'sec-10.01': { id: 'sec-10.01', zone: 'zone-10', sectionNumber: '10.01', name: 'Data Management Plan', description: 'DMP and procedures', isRequired: true, milestone: 'study-start-up' },
  'sec-10.04': { id: 'sec-10.04', zone: 'zone-10', sectionNumber: '10.04', name: 'Database Lock', description: 'Database lock docs', isRequired: true, milestone: 'database-lock' },
};

const defaultArtifacts: Record<string, TMFArtifactDefinition> = {
  'art-02.01.01': { id: 'art-02.01.01', sectionId: 'sec-02.01', artifactNumber: '02.01.01', name: 'Protocol', description: 'Current protocol', level: 'trial', isRequired: true, isCritical: true, sourceModules: ['authoring', 'submissions'], retentionYears: 15 },
  'art-02.02.01': { id: 'art-02.02.01', sectionId: 'sec-02.02', artifactNumber: '02.02.01', name: 'Investigator Brochure', description: 'Current IB', level: 'trial', isRequired: true, isCritical: true, sourceModules: ['authoring'], retentionYears: 15 },
  'art-03.01.01': { id: 'art-03.01.01', sectionId: 'sec-03.01', artifactNumber: '03.01.01', name: 'IND Application', description: 'IND submission', level: 'country', isRequired: true, isCritical: true, sourceModules: ['submissions', 'publishing'], retentionYears: 15 },
  'art-04.02.01': { id: 'art-04.02.01', sectionId: 'sec-04.02', artifactNumber: '04.02.01', name: 'IRB Initial Approval', description: 'Initial ethics approval', level: 'site', isRequired: true, isCritical: true, sourceModules: ['manual'], retentionYears: 15 },
  'art-05.03.01': { id: 'art-05.03.01', sectionId: 'sec-05.03', artifactNumber: '05.03.01', name: 'Site Initiation Visit Report', description: 'SIV report', level: 'site', isRequired: true, isCritical: true, sourceModules: ['ctms'], retentionYears: 15 },
  'art-05.04.01': { id: 'art-05.04.01', sectionId: 'sec-05.04', artifactNumber: '05.04.01', name: 'Monitoring Visit Report', description: 'Monitoring reports', level: 'site', isRequired: true, isCritical: true, sourceModules: ['ctms'], retentionYears: 15 },
  'art-05.05.01': { id: 'art-05.05.01', sectionId: 'sec-05.05', artifactNumber: '05.05.01', name: 'Investigator CV', description: 'PI CV', level: 'site', isRequired: true, isCritical: true, sourceModules: ['ctms', 'manual'], retentionYears: 15 },
  'art-05.05.02': { id: 'art-05.05.02', sectionId: 'sec-05.05', artifactNumber: '05.05.02', name: 'Form FDA 1572', description: 'Statement of Investigator', level: 'site', isRequired: true, isCritical: true, sourceModules: ['ctms', 'manual'], retentionYears: 15 },
  'art-07.01.01': { id: 'art-07.01.01', sectionId: 'sec-07.01', artifactNumber: '07.01.01', name: 'Safety Management Plan', description: 'Safety plan', level: 'trial', isRequired: true, isCritical: true, sourceModules: ['safety', 'authoring'], retentionYears: 15 },
  'art-07.02.01': { id: 'art-07.02.01', sectionId: 'sec-07.02', artifactNumber: '07.02.01', name: 'SAE Report', description: 'SAE report', level: 'site', isRequired: true, isCritical: true, sourceModules: ['safety', 'edc'], retentionYears: 15 },
  'art-10.01.01': { id: 'art-10.01.01', sectionId: 'sec-10.01', artifactNumber: '10.01.01', name: 'Data Management Plan', description: 'DMP', level: 'trial', isRequired: true, isCritical: true, sourceModules: ['edc', 'manual'], retentionYears: 15 },
  'art-10.04.01': { id: 'art-10.04.01', sectionId: 'sec-10.04', artifactNumber: '10.04.01', name: 'Database Lock Certificate', description: 'DB lock docs', level: 'trial', isRequired: true, isCritical: true, sourceModules: ['edc'], retentionYears: 15 },
};

const emptyZoneMap = (): Record<TMFZone, string[]> => ({ 'zone-01': [], 'zone-02': [], 'zone-03': [], 'zone-04': [], 'zone-05': [], 'zone-06': [], 'zone-07': [], 'zone-08': [], 'zone-09': [], 'zone-10': [] });

const initialState: TMFState = {
  studies: {}, zoneDefinitions: defaultZoneDefinitions, sectionDefinitions: defaultSections, artifactDefinitions: defaultArtifacts,
  artifacts: {}, artifactsByStudy: {}, artifactsByZone: {}, autoLinkRules: {}, autoLinkEvents: {},
  completenessReports: {}, latestReportByStudy: {}, inspectionAssessments: {}, latestAssessmentByStudy: {}, dashboardData: {},
  selectedStudyId: null, selectedZone: null, selectedArtifactId: null, activeView: 'dashboard', filters: {}, isLoading: false, lastError: null,
};

export const useTMFStore = create<TMFState & TMFActions>((set, get) => ({
  ...initialState,

  createTMFStudy: (data) => {
    const id = generateId('tmf-study');
    const now = new Date().toISOString();
    const study: TMFStudy = {
      id, studyId: data.studyId || '', protocolNumber: data.protocolNumber || '', studyTitle: data.studyTitle || 'New TMF Study',
      sponsorName: data.sponsorName || '', referenceModelVersion: 'DIA 3.2', countryList: data.countryList || [], siteList: data.siteList || [],
      status: 'active', currentMilestone: data.currentMilestone || 'study-start-up', lastMilestoneDate: now,
      overallCompletenessScore: 0, criticalCompletenessScore: 0, inspectionReadinessScore: 0,
      totalArtifactsExpected: 0, totalArtifactsFiled: 0, totalArtifactsMissing: 0, createdAt: now, updatedAt: now, createdBy: data.createdBy || 'system',
    };
    set((s) => ({ studies: { ...s.studies, [id]: study }, artifactsByStudy: { ...s.artifactsByStudy, [id]: [] }, artifactsByZone: { ...s.artifactsByZone, [id]: emptyZoneMap() } }));
    return study;
  },

  updateTMFStudy: (studyId, updates) => set((s) => {
    const study = s.studies[studyId];
    return study ? { studies: { ...s.studies, [studyId]: { ...study, ...updates, updatedAt: new Date().toISOString() } } } : s;
  }),

  updateStudyMilestone: (studyId, milestone) => {
    const now = new Date().toISOString();
    set((s) => {
      const study = s.studies[studyId];
      return study ? { studies: { ...s.studies, [studyId]: { ...study, currentMilestone: milestone, lastMilestoneDate: now, updatedAt: now } } } : s;
    });
  },

  addArtifact: (data) => {
    const id = generateId('artifact');
    const now = new Date().toISOString();
    const artifact: TMFArtifact = {
      id, studyId: data.studyId || '', zoneId: data.zoneId || 'zone-01', sectionId: data.sectionId || '', artifactDefinitionId: data.artifactDefinitionId || '',
      level: data.level || 'trial', countryCode: data.countryCode, siteId: data.siteId, siteName: data.siteName,
      fileName: data.fileName || 'document.pdf', fileType: data.fileType || 'application/pdf', fileSize: data.fileSize || 0, version: data.version || '1.0',
      title: data.title || 'Untitled', description: data.description, documentDate: data.documentDate || now, filedDate: now,
      status: data.status || 'draft', qualityStatus: 'not-reviewed', sourceModule: data.sourceModule, sourceRecordId: data.sourceRecordId, autoLinked: data.autoLinked || false,
      validationStatus: 'not-validated', validationErrors: [], lastValidated: now, signatures: data.signatures || [], requiresSignature: data.requiresSignature || false,
      signatureComplete: !data.requiresSignature, createdAt: now, updatedAt: now, createdBy: data.createdBy || 'system', lastModifiedBy: data.lastModifiedBy || 'system',
      auditTrail: [{ id: generateId('audit'), action: 'created', performedBy: data.createdBy || 'system', performedAt: now, details: 'Artifact created' }],
    };
    set((s) => {
      const studyArtifacts = s.artifactsByStudy[artifact.studyId] || [];
      const zoneArtifacts = s.artifactsByZone[artifact.studyId] || emptyZoneMap();
      const zoneList = zoneArtifacts[artifact.zoneId] || [];
      return {
        artifacts: { ...s.artifacts, [id]: artifact },
        artifactsByStudy: { ...s.artifactsByStudy, [artifact.studyId]: [...studyArtifacts, id] },
        artifactsByZone: { ...s.artifactsByZone, [artifact.studyId]: { ...zoneArtifacts, [artifact.zoneId]: [...zoneList, id] } },
      };
    });
    
    // Emit cross-module event
    useCrossModuleStore.getState().emitEvent({
      eventType: 'entity-created',
      sourceModule: 'tmf',
      targetModules: ['regulatory', 'quality', 'authoring'],
      entityType: 'artifact',
      entityId: id,
      description: `TMF artifact "${artifact.title}" added to ${ZONE_NAMES[artifact.zoneId]}`,
      payload: { title: artifact.title, zone: artifact.zoneId, zoneName: ZONE_NAMES[artifact.zoneId], studyId: artifact.studyId },
    });
    
    return artifact;
  },

  updateArtifact: (artifactId, updates) => {
    const now = new Date().toISOString();
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, ...updates, updatedAt: now, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'updated', performedBy: 'system', performedAt: now, details: 'Updated' }] } } };
    });
  },

  fileArtifact: (artifactId, filedBy) => {
    const now = new Date().toISOString();
    const artifact = get().artifacts[artifactId];
    set((s) => {
      if (!artifact) return s;
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, status: 'filed', filedDate: now, updatedAt: now, lastModifiedBy: filedBy, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'filed', performedBy: filedBy, performedAt: now, details: 'Filed to TMF' }] } } };
    });
    
    // Emit cross-module event
    if (artifact) {
      useCrossModuleStore.getState().emitEvent({
        eventType: 'entity-status-changed',
        sourceModule: 'tmf',
        targetModules: ['regulatory', 'quality'],
        entityType: 'artifact',
        entityId: artifactId,
        description: `TMF artifact "${artifact.title}" filed`,
        payload: { title: artifact.title, zone: artifact.zoneId, status: 'filed', filedBy },
      });
    }
  },

  supersedeArtifact: (artifactId, newArtifactId) => {
    const now = new Date().toISOString();
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, status: 'superseded', updatedAt: now, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'superseded', performedBy: 'system', performedAt: now, details: `Superseded by ${newArtifactId}` }] } } };
    });
  },

  validateArtifact: (artifactId) => {
    const s = get();
    const artifact = s.artifacts[artifactId];
    if (!artifact) return [];
    const errors: ValidationError[] = [];
    const now = new Date().toISOString();
    if (artifact.requiresSignature && !artifact.signatureComplete) {
      errors.push({ id: generateId('err'), message: 'Required signature missing', severity: 'critical', detectedAt: now });
    }
    set((st) => ({ artifacts: { ...st.artifacts, [artifactId]: { ...artifact, validationStatus: errors.length > 0 ? 'invalid' : 'valid', validationErrors: errors, lastValidated: now } } }));
    return errors;
  },

  addSignatureRequirement: (artifactId, role, signerName, signerId) => {
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      const sig = { id: generateId('sig'), role, signerName, signerId, status: 'pending' as const };
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, signatures: [...artifact.signatures, sig], requiresSignature: true, signatureComplete: false } } };
    });
  },

  signArtifact: (artifactId, signatureId, comments) => {
    const now = new Date().toISOString();
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      const updatedSigs = artifact.signatures.map((sig) => sig.id === signatureId ? { ...sig, status: 'signed' as const, signedAt: now, comments } : sig);
      const allSigned = updatedSigs.every((sig) => sig.status === 'signed');
      const signer = artifact.signatures.find((sig) => sig.id === signatureId)?.signerName || 'unknown';
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, signatures: updatedSigs, signatureComplete: allSigned, updatedAt: now, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'signed', performedBy: signer, performedAt: now, details: `Signed` }] } } };
    });
  },

  submitForQC: (artifactId) => set((s) => {
    const artifact = s.artifacts[artifactId];
    return artifact ? { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, qualityStatus: 'qc-pending', updatedAt: new Date().toISOString() } } } : s;
  }),

  passQC: (artifactId, reviewer) => {
    const now = new Date().toISOString();
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, qualityStatus: 'qc-passed', updatedAt: now, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'qc-reviewed', performedBy: reviewer, performedAt: now, details: 'QC passed' }] } } };
    });
  },

  failQC: (artifactId, reviewer, reason) => {
    const now = new Date().toISOString();
    set((s) => {
      const artifact = s.artifacts[artifactId];
      if (!artifact) return s;
      return { artifacts: { ...s.artifacts, [artifactId]: { ...artifact, qualityStatus: 'qc-failed', updatedAt: now, auditTrail: [...artifact.auditTrail, { id: generateId('audit'), action: 'qc-reviewed', performedBy: reviewer, performedAt: now, details: `QC failed: ${reason}` }] } } };
    });
  },

  addAutoLinkRule: (data) => {
    const id = generateId('rule');
    const now = new Date().toISOString();
    const rule: AutoLinkRule = {
      id, name: data.name || 'New Rule', description: data.description || '', sourceModule: data.sourceModule || 'manual',
      sourceEventType: data.sourceEventType || '', sourceConditions: data.sourceConditions || [],
      targetZone: data.targetZone || 'zone-01', targetSectionId: data.targetSectionId || '', targetArtifactId: data.targetArtifactId || '',
      targetLevel: data.targetLevel || 'trial', isActive: data.isActive ?? true, autoFile: data.autoFile ?? false, priority: data.priority || 10, createdAt: now, updatedAt: now,
    };
    set((s) => ({ autoLinkRules: { ...s.autoLinkRules, [id]: rule } }));
    return rule;
  },

  updateAutoLinkRule: (ruleId, updates) => set((s) => {
    const rule = s.autoLinkRules[ruleId];
    return rule ? { autoLinkRules: { ...s.autoLinkRules, [ruleId]: { ...rule, ...updates, updatedAt: new Date().toISOString() } } } : s;
  }),

  toggleAutoLinkRule: (ruleId) => set((s) => {
    const rule = s.autoLinkRules[ruleId];
    return rule ? { autoLinkRules: { ...s.autoLinkRules, [ruleId]: { ...rule, isActive: !rule.isActive, updatedAt: new Date().toISOString() } } } : s;
  }),

  processAutoLinkEvent: (eventData) => {
    const s = get();
    const id = generateId('event');
    const now = new Date().toISOString();
    const rules = Object.values(s.autoLinkRules).filter((r) => r.isActive && r.sourceModule === eventData.sourceModule && r.sourceEventType === eventData.sourceEventType);
    if (rules.length === 0) {
      const event: AutoLinkEvent = { id, studyId: eventData.studyId || '', ruleId: '', ruleName: 'No rule', sourceModule: eventData.sourceModule || 'manual', sourceEventType: eventData.sourceEventType || '', sourceRecordId: eventData.sourceRecordId || '', sourceData: eventData.sourceData || {}, status: 'skipped', eventTime: now };
      set((st) => ({ autoLinkEvents: { ...st.autoLinkEvents, [id]: event } }));
      return null;
    }
    const rule = rules.sort((a, b) => a.priority - b.priority)[0];
    const artifact = get().addArtifact({ studyId: eventData.studyId, zoneId: rule.targetZone, sectionId: rule.targetSectionId, artifactDefinitionId: rule.targetArtifactId, level: rule.targetLevel, siteId: (eventData.sourceData as Record<string, unknown>)?.siteId as string, sourceModule: rule.sourceModule, sourceRecordId: eventData.sourceRecordId, autoLinked: true, status: rule.autoFile ? 'filed' : 'pending-review', title: `Auto-linked from ${rule.sourceModule}`, fileName: `${rule.sourceModule}_${eventData.sourceRecordId}.pdf` });
    const event: AutoLinkEvent = { id, studyId: eventData.studyId || '', ruleId: rule.id, ruleName: rule.name, sourceModule: eventData.sourceModule || 'manual', sourceEventType: eventData.sourceEventType || '', sourceRecordId: eventData.sourceRecordId || '', sourceData: eventData.sourceData || {}, status: 'processed', artifactId: artifact.id, eventTime: now, processedAt: now };
    set((st) => ({ autoLinkEvents: { ...st.autoLinkEvents, [id]: event } }));
    return artifact;
  },

  linkFromCTMS: (studyId, ctmsEvent, ctmsData) => { get().processAutoLinkEvent({ studyId, sourceModule: 'ctms', sourceEventType: ctmsEvent, sourceRecordId: (ctmsData.id as string) || generateId('ctms'), sourceData: ctmsData }); },
  linkFromEDC: (studyId, edcEvent, edcData) => { get().processAutoLinkEvent({ studyId, sourceModule: 'edc', sourceEventType: edcEvent, sourceRecordId: (edcData.id as string) || generateId('edc'), sourceData: edcData }); },
  linkFromSafety: (studyId, safetyEvent, safetyData) => { get().processAutoLinkEvent({ studyId, sourceModule: 'safety', sourceEventType: safetyEvent, sourceRecordId: (safetyData.id as string) || generateId('safety'), sourceData: safetyData }); },
  linkFromSubmissions: (studyId, submissionEvent, submissionData) => { get().processAutoLinkEvent({ studyId, sourceModule: 'submissions', sourceEventType: submissionEvent, sourceRecordId: (submissionData.id as string) || generateId('sub'), sourceData: submissionData }); },

  generateCompletenessReport: (studyId, generatedBy) => {
    const s = get();
    const study = s.studies[studyId];
    if (!study) throw new Error('Study not found');
    const id = generateId('report');
    const now = new Date().toISOString();
    const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];
    const zoneScores = zones.map((zone) => get().calculateZoneCompleteness(studyId, zone));
    const missingArtifacts = get().identifyMissingArtifacts(studyId);
    const totalExpected = zoneScores.reduce((sum, z) => sum + z.expected, 0);
    const totalFiled = zoneScores.reduce((sum, z) => sum + z.filed, 0);
    const overallScore = totalExpected > 0 ? Math.round((totalFiled / totalExpected) * 100) : 0;
    const criticalExpected = zoneScores.filter((z) => s.zoneDefinitions[z.zone].isCritical).reduce((sum, z) => sum + z.expected, 0);
    const criticalFiled = zoneScores.filter((z) => s.zoneDefinitions[z.zone].isCritical).reduce((sum, z) => sum + z.filed, 0);
    const criticalScore = criticalExpected > 0 ? Math.round((criticalFiled / criticalExpected) * 100) : 0;
    const report: CompletenessReport = { id, studyId, generatedAt: now, generatedBy, overallScore, criticalScore, inspectionReadinessScore: Math.round((overallScore * 0.4 + criticalScore * 0.6)), zoneScores, missingArtifacts, qualityIssues: [] };
    set((st) => ({ completenessReports: { ...st.completenessReports, [id]: report }, latestReportByStudy: { ...st.latestReportByStudy, [studyId]: id }, studies: { ...st.studies, [studyId]: { ...study, overallCompletenessScore: overallScore, criticalCompletenessScore: criticalScore, inspectionReadinessScore: report.inspectionReadinessScore, totalArtifactsExpected: totalExpected, totalArtifactsFiled: totalFiled, totalArtifactsMissing: missingArtifacts.length, updatedAt: now } } }));
    return report;
  },

  calculateZoneCompleteness: (studyId, zone) => {
    const s = get();
    const study = s.studies[studyId];
    const zoneArtifactIds = s.artifactsByZone[studyId]?.[zone] || [];
    const filedArtifacts = zoneArtifactIds.filter((id) => s.artifacts[id]?.status === 'filed');
    const expectedArtifactDefs = Object.values(s.artifactDefinitions).filter((def) => { const sec = s.sectionDefinitions[def.sectionId]; return sec?.zone === zone; });
    let expected = 0;
    for (const def of expectedArtifactDefs) {
      if (def.level === 'trial') expected += 1;
      else if (def.level === 'site' && study) expected += study.siteList.length || 1;
      else if (def.level === 'country' && study) expected += study.countryList.length || 1;
    }
    const filed = filedArtifacts.length;
    const missing = Math.max(0, expected - filed);
    const score = expected > 0 ? Math.round((filed / expected) * 100) : 100;
    return { zone, zoneName: ZONE_NAMES[zone], score, expected, filed, missing, criticalMissing: 0 };
  },

  identifyMissingArtifacts: (studyId) => {
    const s = get();
    const study = s.studies[studyId];
    if (!study) return [];
    const filedArtifacts = (s.artifactsByStudy[studyId] || []).map((id) => s.artifacts[id]).filter((a) => a?.status === 'filed');
    const missing: MissingArtifact[] = [];
    for (const def of Object.values(s.artifactDefinitions)) {
      const section = s.sectionDefinitions[def.sectionId];
      if (!section) continue;
      const exists = filedArtifacts.some((a) => a.artifactDefinitionId === def.id);
      if (!exists && def.isRequired) {
        missing.push({ artifactDefinitionId: def.id, artifactName: def.name, zone: section.zone, sectionId: section.id, level: def.level, isCritical: def.isCritical, expectedByMilestone: section.milestone || 'any', sourceModule: def.sourceModules[0], suggestedAction: def.sourceModules.includes('manual') ? 'Upload manually' : `Auto-link from ${def.sourceModules[0]}` });
      }
    }
    return missing;
  },

  runInspectionReadinessAssessment: (studyId, assessedBy) => {
    const s = get();
    const study = s.studies[studyId];
    if (!study) throw new Error('Study not found');
    const id = generateId('assessment');
    const now = new Date().toISOString();
    const report = get().generateCompletenessReport(studyId, assessedBy);
    let readinessLevel: InspectionReadinessAssessment['readinessLevel'];
    if (report.inspectionReadinessScore >= 95) readinessLevel = 'inspection-ready';
    else if (report.inspectionReadinessScore >= 80) readinessLevel = 'minor-gaps';
    else if (report.inspectionReadinessScore >= 60) readinessLevel = 'significant-gaps';
    else readinessLevel = 'not-ready';
    const criticalFindings: InspectionFinding[] = report.missingArtifacts.filter((m) => m.isCritical).slice(0, 5).map((m) => ({ id: generateId('finding'), category: 'essential-documents' as const, findingType: 'Missing Document', severity: 'critical' as const, description: `Missing: ${m.artifactName}`, affectedArtifacts: [m.artifactDefinitionId], suggestedRemediation: m.suggestedAction, estimatedRemediationHours: 4, status: 'open' as const }));
    const assessment: InspectionReadinessAssessment = { id, studyId, assessmentDate: now, assessedBy, readinessLevel, overallScore: report.inspectionReadinessScore, estimatedPrepTime: criticalFindings.length * 4, criticalFindings, majorFindings: [], minorFindings: [], prioritizedActions: criticalFindings.map((f, i) => ({ id: generateId('action'), priority: i + 1, action: f.suggestedRemediation, category: f.category, impact: 'high' as const, effort: 'medium' as const, estimatedHours: f.estimatedRemediationHours })), trendDirection: 'stable' };
    set((st) => ({ inspectionAssessments: { ...st.inspectionAssessments, [id]: assessment }, latestAssessmentByStudy: { ...st.latestAssessmentByStudy, [studyId]: id }, studies: { ...st.studies, [studyId]: { ...study, updatedAt: now } } }));
    return assessment;
  },

  updateFindingStatus: (assessmentId, findingId, status) => set((s) => {
    const assessment = s.inspectionAssessments[assessmentId];
    if (!assessment) return s;
    const updateFindings = (findings: InspectionFinding[]) => findings.map((f) => f.id === findingId ? { ...f, status } : f);
    return { inspectionAssessments: { ...s.inspectionAssessments, [assessmentId]: { ...assessment, criticalFindings: updateFindings(assessment.criticalFindings), majorFindings: updateFindings(assessment.majorFindings), minorFindings: updateFindings(assessment.minorFindings) } } };
  }),

  refreshDashboard: (studyId) => {
    const s = get();
    const study = s.studies[studyId];
    if (!study) throw new Error('Study not found');
    const now = new Date().toISOString();
    const artifactIds = s.artifactsByStudy[studyId] || [];
    const artifacts = artifactIds.map((id) => s.artifacts[id]).filter(Boolean);
    const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];
    const zoneSummary: ZoneSummary[] = zones.map((zone) => {
      const zoneArtifacts = artifacts.filter((a) => a.zoneId === zone);
      const filed = zoneArtifacts.filter((a) => a.status === 'filed').length;
      return { zone, zoneName: ZONE_NAMES[zone], completeness: zoneArtifacts.length > 0 ? Math.round((filed / zoneArtifacts.length) * 100) : 0, filed, expected: zoneArtifacts.length, trend: 'stable' as const };
    });
    const dashboard: TMFDashboardData = { studyId, lastUpdated: now, overallCompleteness: study.overallCompletenessScore, criticalCompleteness: study.criticalCompletenessScore, inspectionReadiness: study.inspectionReadinessScore, totalExpected: study.totalArtifactsExpected, totalFiled: study.totalArtifactsFiled, totalPending: artifacts.filter((a) => a.status === 'pending-review').length, zoneSummary, recentArtifacts: artifacts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map((a) => ({ artifactId: a.id, artifactName: a.title, zone: a.zoneId, action: 'filed' as const, timestamp: a.updatedAt, performedBy: a.lastModifiedBy })), recentAutoLinks: Object.values(s.autoLinkEvents).filter((e) => e.studyId === studyId).sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()).slice(0, 5).map((e) => ({ eventId: e.id, sourceModule: e.sourceModule, artifactName: e.ruleName, status: e.status === 'processed' ? 'success' as const : e.status === 'failed' ? 'failed' as const : 'pending' as const, timestamp: e.eventTime })), alerts: [] };
    set((st) => ({ dashboardData: { ...st.dashboardData, [studyId]: dashboard } }));
    return dashboard;
  },

  setSelectedStudyId: (studyId) => set({ selectedStudyId: studyId }),
  setSelectedZone: (zone) => set({ selectedZone: zone }),
  setSelectedArtifactId: (artifactId) => set({ selectedArtifactId: artifactId }),
  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
  initializeDIAModel: () => set({ zoneDefinitions: defaultZoneDefinitions, sectionDefinitions: defaultSections, artifactDefinitions: defaultArtifacts }),
  loadMockData: () => {
    const now = new Date().toISOString();
    const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Create multiple studies
    const studies: TMFStudy[] = [
      { id: 'tmf-study-001', studyId: 'ctms-study-001', protocolNumber: 'BEACON-3', studyTitle: 'Phase 3 Study of BNC-101 in Advanced NSCLC', sponsorName: 'Ligature Therapeutics', referenceModelVersion: 'DIA 3.2', countryList: ['US', 'CA', 'UK', 'DE', 'FR', 'ES', 'IT', 'AU'], siteList: ['site-001', 'site-002', 'site-003', 'site-004', 'site-005'], status: 'active', currentMilestone: 'first-subject-enrolled', lastMilestoneDate: pastMonth, overallCompletenessScore: 78, criticalCompletenessScore: 92, inspectionReadinessScore: 85, totalArtifactsExpected: 156, totalArtifactsFiled: 122, totalArtifactsMissing: 34, createdAt: pastMonth, updatedAt: now, createdBy: 'admin' },
      { id: 'tmf-study-002', studyId: 'ctms-study-002', protocolNumber: 'MINDFUL-2', studyTitle: 'Phase 2 Study of MND-205 in Major Depression', sponsorName: 'Ligature Therapeutics', referenceModelVersion: 'DIA 3.2', countryList: ['US', 'CA', 'UK'], siteList: ['site-006', 'site-007', 'site-008'], status: 'active', currentMilestone: 'enrollment-complete', lastMilestoneDate: pastWeek, overallCompletenessScore: 65, criticalCompletenessScore: 78, inspectionReadinessScore: 71, totalArtifactsExpected: 98, totalArtifactsFiled: 64, totalArtifactsMissing: 34, createdAt: pastMonth, updatedAt: now, createdBy: 'admin' },
      { id: 'tmf-study-003', studyId: 'ctms-study-003', protocolNumber: 'SUMMIT-1', studyTitle: 'Phase 1/2 First-in-Human Study of SMT-301', sponsorName: 'Ligature Therapeutics', referenceModelVersion: 'DIA 3.2', countryList: ['US', 'AU'], siteList: ['site-009', 'site-010'], status: 'active', currentMilestone: 'first-site-initiated', lastMilestoneDate: pastWeek, overallCompletenessScore: 45, criticalCompletenessScore: 58, inspectionReadinessScore: 42, totalArtifactsExpected: 72, totalArtifactsFiled: 32, totalArtifactsMissing: 40, createdAt: pastMonth, updatedAt: now, createdBy: 'admin' },
    ];
    
    // Create sample artifacts for each study
    const artifacts: TMFArtifact[] = [
      // BEACON-3 Study Artifacts
      { id: 'art-001', studyId: 'tmf-study-001', zoneId: 'zone-02', sectionId: 'sec-02.01', artifactDefinitionId: 'art-02.01.01', level: 'trial', fileName: 'BEACON-3_Protocol_v3.0.pdf', fileType: 'pdf', fileSize: 2457600, version: '3.0', title: 'Protocol v3.0', description: 'Final Protocol with Amendment 2', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'authoring', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [{ id: 'sig-001', role: 'Medical Monitor', signerName: 'Dr. Sarah Chen', signerId: 'user-001', signedAt: pastMonth, status: 'signed' }], requiresSignature: true, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
      { id: 'art-002', studyId: 'tmf-study-001', zoneId: 'zone-02', sectionId: 'sec-02.02', artifactDefinitionId: 'art-02.02.01', level: 'trial', fileName: 'BNC-101_IB_Edition4.pdf', fileType: 'pdf', fileSize: 3145728, version: '4.0', title: 'Investigator Brochure Edition 4', description: 'Current Investigator Brochure', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'authoring', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
      { id: 'art-003', studyId: 'tmf-study-001', zoneId: 'zone-03', sectionId: 'sec-03.01', artifactDefinitionId: 'art-03.01.01', level: 'country', countryCode: 'US', fileName: 'BEACON-3_IND_139875.pdf', fileType: 'pdf', fileSize: 52428800, version: '1.0', title: 'IND 139875 Original Submission', description: 'Original IND Application - US FDA', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'submissions', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
      { id: 'art-004', studyId: 'tmf-study-001', zoneId: 'zone-04', sectionId: 'sec-04.02', artifactDefinitionId: 'art-04.02.01', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'MGH_IRB_Approval_2024.pdf', fileType: 'pdf', fileSize: 524288, version: '1.0', title: 'IRB Initial Approval - MGH', description: 'Partners IRB Initial Approval', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'manual', autoLinked: false, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'cra-001', lastModifiedBy: 'cra-001', auditTrail: [] },
      { id: 'art-005', studyId: 'tmf-study-001', zoneId: 'zone-05', sectionId: 'sec-05.03', artifactDefinitionId: 'art-05.03.01', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'MGH_SIV_Report_2024-03.pdf', fileType: 'pdf', fileSize: 1048576, version: '1.0', title: 'Site Initiation Visit Report - MGH', description: 'SIV completed March 2024', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'ctms', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [{ id: 'sig-002', role: 'CRA', signerName: 'Jessica Martinez', signerId: 'user-002', signedAt: pastMonth, status: 'signed' }], requiresSignature: true, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'cra-001', lastModifiedBy: 'cra-001', auditTrail: [] },
      { id: 'art-006', studyId: 'tmf-study-001', zoneId: 'zone-05', sectionId: 'sec-05.04', artifactDefinitionId: 'art-05.04.01', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'MGH_MVR_2024-05.pdf', fileType: 'pdf', fileSize: 2097152, version: '1.0', title: 'Monitoring Visit Report - May 2024', description: 'Routine monitoring visit', documentDate: pastWeek, filedDate: pastWeek, status: 'filed', qualityStatus: 'qc-pending', sourceModule: 'ctms', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: now, signatures: [{ id: 'sig-003', role: 'CRA', signerName: 'Jessica Martinez', signerId: 'user-002', status: 'pending' }], requiresSignature: true, signatureComplete: false, createdAt: pastWeek, updatedAt: now, createdBy: 'cra-001', lastModifiedBy: 'cra-001', auditTrail: [] },
      { id: 'art-007', studyId: 'tmf-study-001', zoneId: 'zone-05', sectionId: 'sec-05.05', artifactDefinitionId: 'art-05.05.01', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'Dr_Thompson_CV_2024.pdf', fileType: 'pdf', fileSize: 262144, version: '1.0', title: 'Investigator CV - Dr. Robert Thompson', description: 'Principal Investigator CV', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'manual', autoLinked: false, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'cra-001', lastModifiedBy: 'cra-001', auditTrail: [] },
      { id: 'art-008', studyId: 'tmf-study-001', zoneId: 'zone-05', sectionId: 'sec-05.05', artifactDefinitionId: 'art-05.05.02', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'MGH_FDA1572_signed.pdf', fileType: 'pdf', fileSize: 524288, version: '1.0', title: 'Form FDA 1572 - MGH', description: 'Statement of Investigator', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'manual', autoLinked: false, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'cra-001', lastModifiedBy: 'cra-001', auditTrail: [] },
      { id: 'art-009', studyId: 'tmf-study-001', zoneId: 'zone-07', sectionId: 'sec-07.01', artifactDefinitionId: 'art-07.01.01', level: 'trial', fileName: 'BEACON-3_Safety_Management_Plan.pdf', fileType: 'pdf', fileSize: 786432, version: '2.0', title: 'Safety Management Plan v2.0', description: 'Safety and PV procedures', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'safety', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
      { id: 'art-010', studyId: 'tmf-study-001', zoneId: 'zone-07', sectionId: 'sec-07.02', artifactDefinitionId: 'art-07.02.01', level: 'site', siteId: 'site-001', siteName: 'Mass General Hospital', fileName: 'SAE_001_Report.pdf', fileType: 'pdf', fileSize: 1572864, version: '1.0', title: 'SAE Report #001 - Pneumonitis', description: 'Serious adverse event report', documentDate: pastWeek, filedDate: pastWeek, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'safety', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: now, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastWeek, updatedAt: now, createdBy: 'pv-001', lastModifiedBy: 'pv-001', auditTrail: [] },
      { id: 'art-011', studyId: 'tmf-study-001', zoneId: 'zone-10', sectionId: 'sec-10.01', artifactDefinitionId: 'art-10.01.01', level: 'trial', fileName: 'BEACON-3_DMP_v1.2.pdf', fileType: 'pdf', fileSize: 1048576, version: '1.2', title: 'Data Management Plan v1.2', description: 'Data management procedures', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'edc', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'dm-001', lastModifiedBy: 'dm-001', auditTrail: [] },
      // Pending artifacts
      { id: 'art-012', studyId: 'tmf-study-001', zoneId: 'zone-04', sectionId: 'sec-04.02', artifactDefinitionId: 'art-04.02.01', level: 'site', siteId: 'site-002', siteName: 'Mayo Clinic', fileName: 'Mayo_IRB_Approval.pdf', fileType: 'pdf', fileSize: 524288, version: '1.0', title: 'IRB Initial Approval - Mayo Clinic', description: 'Pending IRB Approval', documentDate: now, filedDate: now, status: 'pending-review', qualityStatus: 'qc-pending', sourceModule: 'manual', autoLinked: false, validationStatus: 'not-validated', validationErrors: [], lastValidated: now, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: now, updatedAt: now, createdBy: 'cra-002', lastModifiedBy: 'cra-002', auditTrail: [] },
      { id: 'art-013', studyId: 'tmf-study-001', zoneId: 'zone-05', sectionId: 'sec-05.03', artifactDefinitionId: 'art-05.03.01', level: 'site', siteId: 'site-003', siteName: 'Cleveland Clinic', fileName: 'Cleveland_SIV_Report.pdf', fileType: 'pdf', fileSize: 1048576, version: '1.0', title: 'Site Initiation Visit Report - Cleveland', description: 'SIV pending completion', documentDate: now, filedDate: now, status: 'draft', qualityStatus: 'not-reviewed', sourceModule: 'ctms', autoLinked: true, validationStatus: 'not-validated', validationErrors: [{ id: 'err-001', message: 'Missing required signature', severity: 'major', detectedAt: now }], lastValidated: now, signatures: [{ id: 'sig-004', role: 'CRA', signerName: 'Michael Wong', signerId: 'user-003', status: 'pending' }], requiresSignature: true, signatureComplete: false, createdAt: now, updatedAt: now, createdBy: 'cra-002', lastModifiedBy: 'cra-002', auditTrail: [] },
      // MINDFUL-2 Artifacts
      { id: 'art-020', studyId: 'tmf-study-002', zoneId: 'zone-02', sectionId: 'sec-02.01', artifactDefinitionId: 'art-02.01.01', level: 'trial', fileName: 'MINDFUL-2_Protocol_v2.0.pdf', fileType: 'pdf', fileSize: 1843200, version: '2.0', title: 'Protocol v2.0', description: 'Final Protocol with Amendment 1', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'authoring', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
      { id: 'art-021', studyId: 'tmf-study-002', zoneId: 'zone-03', sectionId: 'sec-03.01', artifactDefinitionId: 'art-03.01.01', level: 'country', countryCode: 'US', fileName: 'MINDFUL-2_IND_141002.pdf', fileType: 'pdf', fileSize: 41943040, version: '1.0', title: 'IND 141002 Original Submission', description: 'Original IND Application - US FDA', documentDate: pastMonth, filedDate: pastMonth, status: 'filed', qualityStatus: 'qc-passed', sourceModule: 'submissions', autoLinked: true, validationStatus: 'valid', validationErrors: [], lastValidated: pastWeek, signatures: [], requiresSignature: false, signatureComplete: true, createdAt: pastMonth, updatedAt: pastWeek, createdBy: 'admin', lastModifiedBy: 'admin', auditTrail: [] },
    ];
    
    const rules: AutoLinkRule[] = [
      { id: 'rule-ctms-siv', name: 'CTMS SIV Reports', description: 'Auto-link SIV reports from CTMS', sourceModule: 'ctms', sourceEventType: 'monitoring-visit-completed', sourceConditions: [{ field: 'visitType', operator: 'equals', value: 'siv' }], targetZone: 'zone-05', targetSectionId: 'sec-05.03', targetArtifactId: 'art-05.03.01', targetLevel: 'site', isActive: true, autoFile: true, priority: 1, createdAt: pastMonth, updatedAt: pastMonth },
      { id: 'rule-ctms-mvr', name: 'CTMS Monitoring Reports', description: 'Auto-link monitoring visit reports', sourceModule: 'ctms', sourceEventType: 'monitoring-visit-completed', sourceConditions: [{ field: 'visitType', operator: 'equals', value: 'routine' }], targetZone: 'zone-05', targetSectionId: 'sec-05.04', targetArtifactId: 'art-05.04.01', targetLevel: 'site', isActive: true, autoFile: true, priority: 2, createdAt: pastMonth, updatedAt: pastMonth },
      { id: 'rule-safety-sae', name: 'Safety SAE Reports', description: 'Auto-link SAE reports from Safety module', sourceModule: 'safety', sourceEventType: 'sae-reported', sourceConditions: [{ field: 'serious', operator: 'equals', value: true }], targetZone: 'zone-07', targetSectionId: 'sec-07.02', targetArtifactId: 'art-07.02.01', targetLevel: 'site', isActive: true, autoFile: false, priority: 1, createdAt: pastMonth, updatedAt: pastMonth },
      { id: 'rule-submissions-ind', name: 'Submissions IND/CTA', description: 'Auto-link regulatory submissions', sourceModule: 'submissions', sourceEventType: 'submission-published', sourceConditions: [{ field: 'type', operator: 'contains', value: 'IND' }], targetZone: 'zone-03', targetSectionId: 'sec-03.01', targetArtifactId: 'art-03.01.01', targetLevel: 'country', isActive: true, autoFile: true, priority: 1, createdAt: pastMonth, updatedAt: pastMonth },
      { id: 'rule-authoring-protocol', name: 'Authoring Protocols', description: 'Auto-link approved protocols', sourceModule: 'authoring', sourceEventType: 'document-approved', sourceConditions: [{ field: 'docType', operator: 'equals', value: 'protocol' }], targetZone: 'zone-02', targetSectionId: 'sec-02.01', targetArtifactId: 'art-02.01.01', targetLevel: 'trial', isActive: true, autoFile: true, priority: 1, createdAt: pastMonth, updatedAt: pastMonth },
      { id: 'rule-edc-dmp', name: 'EDC Data Management Plan', description: 'Auto-link DMP from EDC', sourceModule: 'edc', sourceEventType: 'dmp-approved', sourceConditions: [{ field: 'status', operator: 'equals', value: 'approved' }], targetZone: 'zone-10', targetSectionId: 'sec-10.01', targetArtifactId: 'art-10.01.01', targetLevel: 'trial', isActive: true, autoFile: true, priority: 1, createdAt: pastMonth, updatedAt: pastMonth },
    ];
    
    const autoLinkEvents: AutoLinkEvent[] = [
      { id: 'event-001', studyId: 'tmf-study-001', ruleId: 'rule-authoring-protocol', ruleName: 'Protocol v3.0 auto-linked', sourceModule: 'authoring', sourceEventType: 'document-approved', sourceRecordId: 'doc-123', sourceData: {}, status: 'processed', artifactId: 'art-001', eventTime: pastMonth, processedAt: pastMonth },
      { id: 'event-002', studyId: 'tmf-study-001', ruleId: 'rule-ctms-siv', ruleName: 'SIV Report auto-linked', sourceModule: 'ctms', sourceEventType: 'monitoring-visit-completed', sourceRecordId: 'visit-456', sourceData: {}, status: 'processed', artifactId: 'art-005', eventTime: pastMonth, processedAt: pastMonth },
      { id: 'event-003', studyId: 'tmf-study-001', ruleId: 'rule-safety-sae', ruleName: 'SAE Report auto-linked', sourceModule: 'safety', sourceEventType: 'sae-reported', sourceRecordId: 'sae-789', sourceData: {}, status: 'processed', artifactId: 'art-010', eventTime: pastWeek, processedAt: pastWeek },
      { id: 'event-004', studyId: 'tmf-study-001', ruleId: 'rule-ctms-mvr', ruleName: 'MVR pending auto-file', sourceModule: 'ctms', sourceEventType: 'monitoring-visit-completed', sourceRecordId: 'visit-101', sourceData: {}, status: 'pending', eventTime: now },
    ];
    
    // Build artifact indices
    const artifactsByStudy: Record<string, string[]> = {};
    const artifactsByZone: Record<string, Record<TMFZone, string[]>> = {};
    const artifactsRecord: Record<string, TMFArtifact> = {};
    
    artifacts.forEach(art => {
      artifactsRecord[art.id] = art;
      if (!artifactsByStudy[art.studyId]) artifactsByStudy[art.studyId] = [];
      artifactsByStudy[art.studyId].push(art.id);
      if (!artifactsByZone[art.studyId]) artifactsByZone[art.studyId] = emptyZoneMap();
      artifactsByZone[art.studyId][art.zoneId].push(art.id);
    });
    
    // Ensure all studies have zone maps
    studies.forEach(s => {
      if (!artifactsByStudy[s.id]) artifactsByStudy[s.id] = [];
      if (!artifactsByZone[s.id]) artifactsByZone[s.id] = emptyZoneMap();
    });
    
    set((s) => ({
      studies: studies.reduce((acc, study) => ({ ...acc, [study.id]: study }), s.studies),
      artifacts: { ...s.artifacts, ...artifactsRecord },
      artifactsByStudy: { ...s.artifactsByStudy, ...artifactsByStudy },
      artifactsByZone: { ...s.artifactsByZone, ...artifactsByZone },
      autoLinkRules: rules.reduce((acc, r) => ({ ...acc, [r.id]: r }), s.autoLinkRules),
      autoLinkEvents: autoLinkEvents.reduce((acc, e) => ({ ...acc, [e.id]: e }), s.autoLinkEvents),
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ lastError: error }),
}));

// Selector hooks (v0.2.5 - Fixed infinite loop with useMemo)
export const useSelectedTMFStudy = () => {
  const id = useTMFStore((s) => s.selectedStudyId);
  const studies = useTMFStore((s) => s.studies);
  return useMemo(() => id ? studies[id] : null, [id, studies]);
};

export const useStudyArtifacts = (studyId: string) => {
  const ids = useTMFStore((s) => s.artifactsByStudy[studyId] || []);
  const artifacts = useTMFStore((s) => s.artifacts);
  return useMemo(() => ids.map((id) => artifacts[id]).filter(Boolean), [ids, artifacts]);
};

export const useZoneArtifacts = (studyId: string, zone: TMFZone) => {
  const zoneMap = useTMFStore((s) => s.artifactsByZone[studyId]);
  const artifacts = useTMFStore((s) => s.artifacts);
  return useMemo(() => {
    const ids = zoneMap?.[zone] || [];
    return ids.map((id) => artifacts[id]).filter(Boolean);
  }, [zoneMap, zone, artifacts]);
};

export const useAutoLinkRules = () => {
  const autoLinkRules = useTMFStore((s) => s.autoLinkRules);
  return useMemo(() => Object.values(autoLinkRules), [autoLinkRules]);
};

export const usePendingAutoLinks = (studyId: string) => {
  const autoLinkEvents = useTMFStore((s) => s.autoLinkEvents);
  return useMemo(() => 
    Object.values(autoLinkEvents).filter((e) => e.studyId === studyId && e.status === 'pending'),
    [autoLinkEvents, studyId]
  );
};

export const useLatestCompletenessReport = (studyId: string) => {
  const reportId = useTMFStore((s) => s.latestReportByStudy[studyId]);
  const reports = useTMFStore((s) => s.completenessReports);
  return useMemo(() => reportId ? reports[reportId] : null, [reportId, reports]);
};

export const useLatestInspectionAssessment = (studyId: string) => {
  const assessmentId = useTMFStore((s) => s.latestAssessmentByStudy[studyId]);
  const assessments = useTMFStore((s) => s.inspectionAssessments);
  return useMemo(() => assessmentId ? assessments[assessmentId] : null, [assessmentId, assessments]);
};

export const useTMFDashboard = (studyId: string) => useTMFStore((s) => s.dashboardData[studyId]);

export const useAllTMFStudies = () => {
  const studies = useTMFStore((s) => s.studies);
  return useMemo(() => Object.values(studies), [studies]);
};

export const useTMFFilters = () => useTMFStore((s) => s.filters);
export const useTMFActiveView = () => useTMFStore((s) => s.activeView);
