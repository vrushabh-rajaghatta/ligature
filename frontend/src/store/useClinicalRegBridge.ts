

// ============================================================================
// Clinical-Regulatory Bridge Store - v72
// CTMS/TMF Integration for eCTD Submissions
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  StudyToSubmissionMapping,
  MappingValidationError,
  CSRLinkage,
  CSRComponent,
  CSRBlocker,
  TMFSubmissionReadiness,
  TMFZoneReadiness,
  TMFMissingArtifact,
  TMFAction,
  ProtocolCTDMapping,
  ProtocolAmendmentRef,
  DatasetRef,
  SiteRegionalMapping,
  EnrollmentDataMapping,
  Module5TableMapping,
  ClinicalRegAutoLinkRule,
  ClinicalRegBridgeEvent,
  ClinicalRegBridgeDashboard,
  ClinicalRegBridgeView,
  ClinicalRegBridgeFilters,
  ClinicalRegBridgeState,
  ClinicalRegBridgeActions,
} from './clinicalRegBridgeTypes';

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// ============================================================================
// GOLDEN PATH DATA GENERATORS
// ============================================================================

const createGoldenPathStudyMappings = (): Record<string, StudyToSubmissionMapping> => {
  const mappings: Record<string, StudyToSubmissionMapping> = {};
  
  // LIG-2847-301 CSR Mapping
  mappings['gp-mapping-001'] = {
    id: 'gp-mapping-001',
    studyId: 'gp-study-301',
    studyProtocolNumber: 'LIG2847-301',
    studyTitle: 'APEX-LUNG: Phase 3 Study of Ligrastinib in KRAS G12C+ NSCLC',
    studyPhase: 'phase-3',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetModule: 'm5-3-5',
    targetSection: 'm5-3-5-1',
    targetSectionTitle: 'Clinical Study Reports - Efficacy and Safety Studies',
    documentType: 'clinical-study-report',
    documentTitle: 'CSR LIG2847-301 (APEX-LUNG)',
    documentVersion: '1.0',
    status: 'linked',
    priority: 'critical',
    sourceModule: 'ctms',
    sourceRecordId: 'gp-study-301',
    autoLinkEnabled: true,
    autoLinkTrigger: 'csr-approved',
    validationStatus: 'valid',
    validationErrors: [],
    validationWarnings: [],
    createdAt: '2024-06-01T08:00:00Z',
    updatedAt: '2024-12-01T08:00:00Z',
    createdBy: 'user-reg-001',
    lastModifiedBy: 'user-reg-001',
    tmfArtifactId: 'gp-tmf-csr-301',
    tmfZone: 'zone-08',
    tmfSection: '08.01',
  };
  
  // Phase 1 Study Mapping
  mappings['gp-mapping-002'] = {
    id: 'gp-mapping-002',
    studyId: 'gp-study-101',
    studyProtocolNumber: 'LIG2847-101',
    studyTitle: 'Phase 1 Dose Escalation Study of Ligrastinib',
    studyPhase: 'phase-1',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetModule: 'm5-3-1',
    targetSection: 'm5-3-1-1',
    targetSectionTitle: 'Biopharmaceutic Studies',
    documentType: 'clinical-study-report',
    documentTitle: 'CSR LIG2847-101 Phase 1',
    documentVersion: '2.0',
    status: 'linked',
    priority: 'high',
    sourceModule: 'ctms',
    autoLinkEnabled: true,
    validationStatus: 'valid',
    validationErrors: [],
    validationWarnings: [],
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-06-15T08:00:00Z',
    createdBy: 'user-reg-001',
    lastModifiedBy: 'user-reg-001',
  };
  
  // Protocol Mapping
  mappings['gp-mapping-003'] = {
    id: 'gp-mapping-003',
    studyId: 'gp-study-301',
    studyProtocolNumber: 'LIG2847-301',
    studyTitle: 'APEX-LUNG Protocol',
    studyPhase: 'phase-3',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetModule: 'm5-3-5',
    targetSection: 'm5-3-5-1-protocol',
    targetSectionTitle: 'Study Protocol',
    documentType: 'study-protocol',
    documentTitle: 'Protocol LIG2847-301 v5.0',
    documentVersion: '5.0',
    status: 'linked',
    priority: 'critical',
    sourceModule: 'tmf',
    autoLinkEnabled: true,
    validationStatus: 'valid',
    validationErrors: [],
    validationWarnings: [],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-11-01T08:00:00Z',
    createdBy: 'user-reg-001',
    lastModifiedBy: 'user-reg-001',
  };
  
  return mappings;
};

const createGoldenPathCSRLinkages = (): Record<string, CSRLinkage> => {
  const linkages: Record<string, CSRLinkage> = {};
  
  linkages['gp-csr-301'] = {
    id: 'gp-csr-301',
    studyId: 'gp-study-301',
    studyProtocolNumber: 'LIG2847-301',
    csrDocumentId: 'gp-doc-csr-301',
    csrTitle: 'Clinical Study Report: APEX-LUNG (LIG2847-301)',
    csrVersion: '1.0',
    csrStatus: 'finalized',
    studyPhase: 'Phase 3',
    indication: 'KRAS G12C+ NSCLC',
    enrollmentCount: 450,
    primaryCompletionDate: '2024-11-20',
    databaseLockDate: '2025-01-20',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetSequenceId: 'gp-build-nda-0000',
    targetCTDSection: 'm5-3-5-1',
    components: [],
    totalComponents: 24,
    completedComponents: 24,
    readinessScore: 100,
    blockers: [],
    warnings: [],
    linkedToSubmissionAt: '2024-06-10T08:00:00Z',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-06-10T08:00:00Z',
  };
  
  linkages['gp-csr-101'] = {
    id: 'gp-csr-101',
    studyId: 'gp-study-101',
    studyProtocolNumber: 'LIG2847-101',
    csrDocumentId: 'gp-doc-csr-101',
    csrTitle: 'CSR: Phase 1 Dose Escalation (LIG2847-101)',
    csrVersion: '2.0',
    csrStatus: 'finalized',
    studyPhase: 'Phase 1',
    indication: 'Advanced Solid Tumors',
    enrollmentCount: 78,
    databaseLockDate: '2022-04-15',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetCTDSection: 'm5-3-1-1',
    components: [],
    totalComponents: 20,
    completedComponents: 20,
    readinessScore: 100,
    blockers: [],
    warnings: [],
    createdAt: '2022-05-01T08:00:00Z',
    updatedAt: '2024-05-20T08:00:00Z',
  };
  
  // Phase 2 CSR in progress
  linkages['gp-csr-201'] = {
    id: 'gp-csr-201',
    studyId: 'gp-study-201',
    studyProtocolNumber: 'LIG2847-201',
    csrDocumentId: 'gp-doc-csr-201',
    csrTitle: 'CSR: Phase 2 Expansion (LIG2847-201)',
    csrVersion: '1.0',
    csrStatus: 'review',
    studyPhase: 'Phase 2',
    indication: 'KRAS G12C+ Solid Tumors',
    enrollmentCount: 156,
    databaseLockDate: '2023-07-15',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetCTDSection: 'm5-3-5-2',
    components: [],
    totalComponents: 22,
    completedComponents: 19,
    readinessScore: 86,
    blockers: [{
      id: 'blocker-001',
      type: 'pending-review',
      description: 'Safety section pending medical review',
      affectedComponent: 'safety-evaluation',
      suggestedResolution: 'Complete medical reviewer sign-off',
      priority: 'high',
      assignee: 'user-safety-001',
    }],
    warnings: ['Minor formatting updates needed'],
    createdAt: '2023-08-01T08:00:00Z',
    updatedAt: '2024-12-10T08:00:00Z',
  };
  
  return linkages;
};

const createGoldenPathTMFReadiness = (): Record<string, TMFSubmissionReadiness> => {
  const reports: Record<string, TMFSubmissionReadiness> = {};
  
  reports['gp-tmf-ready-001'] = {
    id: 'gp-tmf-ready-001',
    studyId: 'gp-study-301',
    studyProtocolNumber: 'LIG2847-301',
    applicationId: 'NDA-215847',
    applicationNumber: 'NDA-215847',
    targetSequenceId: 'gp-build-nda-0001',
    assessmentDate: '2024-12-15T08:00:00Z',
    assessedBy: 'user-reg-001',
    overallReadinessScore: 94,
    criticalDocumentsScore: 98,
    regulatoryDocumentsScore: 96,
    zoneReadiness: [
      { zone: 'zone-01', zoneName: 'Trial Management', expectedArtifacts: 45, presentArtifacts: 45, missingCritical: 0, missingNonCritical: 0, completenessScore: 100, status: 'complete' },
      { zone: 'zone-02', zoneName: 'Central Trial Docs', expectedArtifacts: 32, presentArtifacts: 31, missingCritical: 0, missingNonCritical: 1, completenessScore: 97, status: 'minor-gaps' },
      { zone: 'zone-03', zoneName: 'Regulatory', expectedArtifacts: 28, presentArtifacts: 28, missingCritical: 0, missingNonCritical: 0, completenessScore: 100, status: 'complete' },
      { zone: 'zone-04', zoneName: 'IRB/IEC', expectedArtifacts: 85, presentArtifacts: 82, missingCritical: 0, missingNonCritical: 3, completenessScore: 96, status: 'minor-gaps' },
      { zone: 'zone-05', zoneName: 'Site Management', expectedArtifacts: 120, presentArtifacts: 118, missingCritical: 0, missingNonCritical: 2, completenessScore: 98, status: 'minor-gaps' },
      { zone: 'zone-06', zoneName: 'IP Management', expectedArtifacts: 18, presentArtifacts: 18, missingCritical: 0, missingNonCritical: 0, completenessScore: 100, status: 'complete' },
      { zone: 'zone-07', zoneName: 'Safety Reporting', expectedArtifacts: 25, presentArtifacts: 25, missingCritical: 0, missingNonCritical: 0, completenessScore: 100, status: 'complete' },
      { zone: 'zone-08', zoneName: 'Central Lab', expectedArtifacts: 15, presentArtifacts: 14, missingCritical: 1, missingNonCritical: 0, completenessScore: 93, status: 'minor-gaps' },
    ],
    requiredArtifacts: [],
    missingArtifacts: [{
      artifactName: 'Central Lab Normal Ranges',
      zone: 'zone-08',
      section: '08.03',
      isCritical: true,
      requiredBy: 'NDA submission',
      suggestedSource: 'Request from central lab',
      canAutoGenerate: false,
      priority: 'high',
    }],
    expiredArtifacts: [],
    ctdMappingStatus: [
      { ctdSection: 'm5-3-5-1', ctdSectionTitle: 'CSR APEX-LUNG', tmfArtifactId: 'tmf-csr-301', tmfArtifactName: 'CSR LIG2847-301', mappingStatus: 'mapped', lastUpdated: '2024-06-10' },
    ],
    readinessLevel: 'minor-gaps',
    blockerCount: 1,
    warningCount: 6,
    estimatedRemediationDays: 3,
    prioritizedActions: [{
      id: 'action-001',
      priority: 1,
      actionType: 'upload',
      description: 'Upload Central Lab Normal Ranges',
      affectedArtifact: 'Central Lab Normal Ranges',
      zone: 'zone-08',
      estimatedEffortHours: 2,
      assignee: 'user-study-001',
      dueDate: '2024-12-18',
      status: 'pending',
    }],
  };
  
  return reports;
};

const createGoldenPathProtocolMappings = (): Record<string, ProtocolCTDMapping> => {
  const mappings: Record<string, ProtocolCTDMapping> = {};
  
  mappings['gp-protocol-301'] = {
    id: 'gp-protocol-301',
    protocolId: 'gp-protocol-301',
    protocolNumber: 'LIG2847-301',
    protocolVersion: '5.0',
    protocolTitle: 'APEX-LUNG Phase 3 Study',
    module5Section: 'm5-3-5',
    module5Subsection: 'm5-3-5-1',
    sequenceInSection: 1,
    studyPhase: 'Phase 3',
    studyType: 'interventional',
    isPivotal: true,
    isControlled: true,
    relatedCSRId: 'gp-csr-301',
    relatedAmendments: [
      { amendmentId: 'amend-001', amendmentNumber: '1', effectiveDate: '2023-06-15', description: 'Updated endpoints' },
      { amendmentId: 'amend-002', amendmentNumber: '2', effectiveDate: '2023-10-01', description: 'Added biomarker cohort' },
      { amendmentId: 'amend-003', amendmentNumber: '3', effectiveDate: '2024-02-15', description: 'Hepatotoxicity monitoring' },
    ],
    relatedDatasets: [
      { datasetId: 'ds-sdtm-301', datasetName: 'SDTM Datasets', datasetType: 'sdtm', ctdPlacement: 'm5-datasets' },
      { datasetId: 'ds-adam-301', datasetName: 'ADaM Datasets', datasetType: 'adam', ctdPlacement: 'm5-datasets' },
    ],
    crossReferences: [
      { fromSection: 'm5-3-5-1', toSection: 'm2-7-3', referenceType: 'summarizes' },
      { fromSection: 'm5-3-5-1', toSection: 'm2-7-4', referenceType: 'summarizes' },
    ],
    mappingStatus: 'linked',
    lastValidated: '2024-12-01T08:00:00Z',
    validationIssues: [],
  };
  
  return mappings;
};

const createGoldenPathSiteMappings = (): Record<string, SiteRegionalMapping> => {
  const mappings: Record<string, SiteRegionalMapping> = {};
  
  mappings['gp-site-001'] = {
    id: 'gp-site-001',
    siteId: 'site-001',
    siteNumber: '001',
    siteName: 'Memorial Sloan Kettering Cancer Center',
    studyId: 'gp-study-301',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    regulatoryAuthority: 'FDA',
    regionalRequirements: [
      { id: 'req-001', requirementType: 'Form 1572', description: 'Statement of Investigator', ctdSection: 'm1-3-1-2', isRequired: true, isMet: true },
      { id: 'req-002', requirementType: 'Financial Disclosure', description: 'FDA Form 3455', ctdSection: 'm1-3-1-4', isRequired: true, isMet: true },
    ],
    siteDocuments: [
      { id: 'doc-001', documentType: 'investigator-cv', documentTitle: 'Dr. Wilson CV', status: 'available', documentDate: '2024-01-15' },
      { id: 'doc-002', documentType: 'form-1572', documentTitle: 'Form 1572', status: 'available', documentDate: '2024-02-01' },
    ],
    documentsRequired: 4,
    documentsAvailable: 4,
    completenessScore: 100,
    piName: 'Dr. James Wilson',
    piCredentials: 'MD, PhD',
    piCV1572Status: '1572-current',
    piCV1572ExpiryDate: '2025-12-31',
    irbName: 'MSKCC IRB',
    irbApprovalDate: '2023-02-28',
    irbApprovalExpiryDate: '2025-02-28',
    readyForSubmission: true,
    blockers: [],
  };
  
  mappings['gp-site-010'] = {
    id: 'gp-site-010',
    siteId: 'site-010',
    siteNumber: '010',
    siteName: 'Charité Berlin',
    studyId: 'gp-study-301',
    country: 'Germany',
    countryCode: 'DE',
    region: 'Europe',
    regulatoryAuthority: 'BfArM',
    regionalRequirements: [],
    siteDocuments: [],
    documentsRequired: 4,
    documentsAvailable: 4,
    completenessScore: 100,
    piName: 'Prof. Klaus Schmidt',
    piCredentials: 'MD',
    piCV1572Status: '1572-current',
    irbName: 'Charité Ethics Committee',
    irbApprovalDate: '2023-03-10',
    readyForSubmission: true,
    blockers: [],
  };
  
  return mappings;
};

const createGoldenPathEnrollment = (): Record<string, EnrollmentDataMapping> => {
  const mappings: Record<string, EnrollmentDataMapping> = {};
  
  mappings['gp-enroll-301'] = {
    id: 'gp-enroll-301',
    studyId: 'gp-study-301',
    studyProtocolNumber: 'LIG2847-301',
    applicationId: 'NDA-215847',
    targetEnrollment: 450,
    actualEnrollment: 450,
    screenedCount: 687,
    screenFailureCount: 237,
    discontinuedCount: 42,
    completedCount: 408,
    demographicsSummary: {
      ageRange: { min: 34, max: 82, mean: 62.4, median: 63 },
      sexDistribution: { male: 247, female: 203 },
      raceDistribution: { 'White': 298, 'Asian': 112, 'Black': 27, 'Other': 13 },
      ethnicityDistribution: { 'Not Hispanic': 412, 'Hispanic': 38 },
    },
    dispositionData: {
      screened: 687,
      screenFailures: 237,
      randomized: 450,
      notRandomized: 0,
      completedTreatment: 298,
      discontinuedTreatment: 152,
      discontinuationReasons: { 'Progressive Disease': 89, 'Adverse Event': 34, 'Withdrawal': 15, 'Other': 14 },
      completedStudy: 408,
      ongoingStudy: 0,
      lostToFollowUp: 3,
      withdrawnConsent: 15,
      deaths: 24,
    },
    enrollmentByCountry: [
      { country: 'United States', countryCode: 'US', targetEnrollment: 180, actualEnrollment: 182, siteCount: 25, percentOfTotal: 40.4 },
      { country: 'Germany', countryCode: 'DE', targetEnrollment: 60, actualEnrollment: 58, siteCount: 8, percentOfTotal: 12.9 },
      { country: 'Japan', countryCode: 'JP', targetEnrollment: 50, actualEnrollment: 52, siteCount: 7, percentOfTotal: 11.6 },
    ],
    enrollmentByRegion: [
      { region: 'North America', countries: ['US', 'CA'], targetEnrollment: 205, actualEnrollment: 207, siteCount: 29, percentOfTotal: 46.0 },
      { region: 'Europe', countries: ['DE', 'FR', 'GB'], targetEnrollment: 145, actualEnrollment: 140, siteCount: 19, percentOfTotal: 31.1 },
    ],
    tableMappings: [
      { tableId: 'tbl-14-1-1', tableNumber: '14.1.1', tableTitle: 'Subject Disposition', ctdSection: 'm5-3-5-1', dataSource: 'adsl', generationStatus: 'approved', lastGenerated: '2024-12-01' },
      { tableId: 'tbl-14-1-2', tableNumber: '14.1.2', tableTitle: 'Demographics', ctdSection: 'm5-3-5-1', dataSource: 'adsl', generationStatus: 'approved', lastGenerated: '2024-12-01' },
    ],
    dataSource: 'edc',
    lastDataExtract: '2024-12-15T06:00:00Z',
    dataAsOfDate: '2024-12-14',
    validationStatus: 'valid',
    validationIssues: [],
  };
  
  return mappings;
};

const createGoldenPathAutoLinkRules = (): Record<string, ClinicalRegAutoLinkRule> => {
  const rules: Record<string, ClinicalRegAutoLinkRule> = {};
  
  rules['gp-rule-001'] = {
    id: 'gp-rule-001',
    name: 'CSR to Module 5 Auto-Link',
    description: 'Automatically links finalized CSRs to Module 5',
    isActive: true,
    sourceModule: 'tmf',
    sourceTrigger: { triggerType: 'event', eventType: 'document-finalized' },
    sourceConditions: [{ field: 'documentType', operator: 'equals', value: 'clinical-study-report' }],
    targetModule: 'ectd',
    targetSection: 'm5-3-5',
    targetDocumentType: 'clinical-study-report',
    fieldMappings: [
      { sourceField: 'studyProtocolNumber', targetField: 'protocolNumber', isRequired: true },
      { sourceField: 'documentTitle', targetField: 'title', isRequired: true },
    ],
    autoValidate: true,
    requiresApproval: false,
    notifyOnLink: true,
    notifyRecipients: ['user-reg-001'],
    successCount: 3,
    failureCount: 0,
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-06-10T08:00:00Z',
    createdBy: 'user-reg-001',
  };
  
  rules['gp-rule-002'] = {
    id: 'gp-rule-002',
    name: 'Protocol to Module 5 Auto-Link',
    description: 'Links approved protocols to Module 5',
    isActive: true,
    sourceModule: 'tmf',
    sourceTrigger: { triggerType: 'event', eventType: 'document-finalized' },
    sourceConditions: [{ field: 'documentType', operator: 'equals', value: 'study-protocol' }],
    targetModule: 'ectd',
    targetSection: 'm5-3-5',
    targetDocumentType: 'study-protocol',
    fieldMappings: [{ sourceField: 'protocolNumber', targetField: 'protocolNumber', isRequired: true }],
    autoValidate: true,
    requiresApproval: true,
    notifyOnLink: true,
    notifyRecipients: ['user-reg-001'],
    successCount: 5,
    failureCount: 0,
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-11-01T08:00:00Z',
    createdBy: 'user-reg-001',
  };
  
  return rules;
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialState = (): ClinicalRegBridgeState => ({
  studyMappings: createGoldenPathStudyMappings(),
  mappingsByStudy: {
    'gp-study-301': ['gp-mapping-001', 'gp-mapping-003'],
    'gp-study-101': ['gp-mapping-002'],
  },
  mappingsByApplication: {
    'NDA-215847': ['gp-mapping-001', 'gp-mapping-002', 'gp-mapping-003'],
  },
  csrLinkages: createGoldenPathCSRLinkages(),
  csrsByStudy: {
    'gp-study-301': ['gp-csr-301'],
    'gp-study-101': ['gp-csr-101'],
    'gp-study-201': ['gp-csr-201'],
  },
  csrComponents: {},
  tmfReadinessReports: createGoldenPathTMFReadiness(),
  latestTMFReadiness: { 'NDA-215847': 'gp-tmf-ready-001' },
  protocolMappings: createGoldenPathProtocolMappings(),
  protocolsByStudy: { 'gp-study-301': ['gp-protocol-301'] },
  siteRegionalMappings: createGoldenPathSiteMappings(),
  sitesByStudy: { 'gp-study-301': ['gp-site-001', 'gp-site-010'] },
  enrollmentDataMappings: createGoldenPathEnrollment(),
  enrollmentByStudy: { 'gp-study-301': 'gp-enroll-301' },
  autoLinkRules: createGoldenPathAutoLinkRules(),
  activeRules: ['gp-rule-001', 'gp-rule-002'],
  bridgeEvents: {},
  eventsByApplication: {},
  auditEntries: {},
  dashboardData: {},
  selectedApplicationId: 'NDA-215847',
  selectedStudyId: null,
  selectedMappingId: null,
  activeView: 'dashboard',
  filters: {},
  isLoading: false,
  lastError: null,
});

// ============================================================================
// STORE
// ============================================================================

type ClinicalRegBridgeStore = ClinicalRegBridgeState & ClinicalRegBridgeActions;

export const useClinicalRegBridge = create<ClinicalRegBridgeStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      // Study Mapping Actions
      createStudyMapping: (data) => {
        const id = generateId('mapping');
        const now = timestamp();
        const mapping: StudyToSubmissionMapping = {
          id,
          studyId: data.studyId || '',
          studyProtocolNumber: data.studyProtocolNumber || '',
          studyTitle: data.studyTitle || '',
          studyPhase: data.studyPhase || 'all-phases',
          applicationId: data.applicationId || '',
          applicationNumber: data.applicationNumber || '',
          targetModule: data.targetModule || 'm5-3-5',
          targetSection: data.targetSection || '',
          targetSectionTitle: data.targetSectionTitle || '',
          documentType: data.documentType || 'clinical-study-report',
          documentTitle: data.documentTitle || '',
          documentVersion: data.documentVersion,
          status: 'pending',
          priority: data.priority || 'medium',
          sourceModule: data.sourceModule || 'ctms',
          autoLinkEnabled: data.autoLinkEnabled ?? true,
          validationStatus: 'not-validated',
          validationErrors: [],
          validationWarnings: [],
          createdAt: now,
          updatedAt: now,
          createdBy: data.createdBy || 'system',
          lastModifiedBy: data.createdBy || 'system',
        };
        set((s) => ({
          studyMappings: { ...s.studyMappings, [id]: mapping },
          mappingsByStudy: {
            ...s.mappingsByStudy,
            [mapping.studyId]: [...(s.mappingsByStudy[mapping.studyId] || []), id],
          },
          mappingsByApplication: {
            ...s.mappingsByApplication,
            [mapping.applicationId]: [...(s.mappingsByApplication[mapping.applicationId] || []), id],
          },
        }));
        return mapping;
      },

      updateStudyMapping: (mappingId, updates) => {
        set((s) => ({
          studyMappings: {
            ...s.studyMappings,
            [mappingId]: { ...s.studyMappings[mappingId], ...updates, updatedAt: timestamp() },
          },
        }));
      },

      deleteStudyMapping: (mappingId) => {
        const mapping = get().studyMappings[mappingId];
        if (!mapping) return;
        set((s) => {
          const { [mappingId]: _, ...rest } = s.studyMappings;
          return {
            studyMappings: rest,
            mappingsByStudy: {
              ...s.mappingsByStudy,
              [mapping.studyId]: (s.mappingsByStudy[mapping.studyId] || []).filter((id) => id !== mappingId),
            },
            mappingsByApplication: {
              ...s.mappingsByApplication,
              [mapping.applicationId]: (s.mappingsByApplication[mapping.applicationId] || []).filter((id) => id !== mappingId),
            },
          };
        });
      },

      validateStudyMapping: (mappingId) => {
        const mapping = get().studyMappings[mappingId];
        if (!mapping) return [];
        const errors: MappingValidationError[] = [];
        if (!mapping.studyProtocolNumber) {
          errors.push({ id: generateId('err'), code: 'MISSING_PROTOCOL', message: 'Protocol number is required', severity: 'error' });
        }
        if (!mapping.targetSection) {
          errors.push({ id: generateId('err'), code: 'MISSING_TARGET', message: 'Target CTD section is required', severity: 'error' });
        }
        set((s) => ({
          studyMappings: {
            ...s.studyMappings,
            [mappingId]: {
              ...s.studyMappings[mappingId],
              validationStatus: errors.length > 0 ? 'invalid' : 'valid',
              validationErrors: errors,
              updatedAt: timestamp(),
            },
          },
        }));
        return errors;
      },

      bulkCreateMappings: (studyId, applicationId) => {
        const state = get();
        const mappings: StudyToSubmissionMapping[] = [];
        // Create standard mappings for a study
        const csrMapping = state.createStudyMapping({
          studyId,
          applicationId,
          applicationNumber: applicationId,
          documentType: 'clinical-study-report',
          targetModule: 'm5-3-5',
          priority: 'critical',
        });
        mappings.push(csrMapping);
        const protocolMapping = state.createStudyMapping({
          studyId,
          applicationId,
          applicationNumber: applicationId,
          documentType: 'study-protocol',
          targetModule: 'm5-3-5',
          priority: 'high',
        });
        mappings.push(protocolMapping);
        return mappings;
      },

      // CSR Linkage Actions
      createCSRLinkage: (data) => {
        const id = generateId('csr');
        const now = timestamp();
        const linkage: CSRLinkage = {
          id,
          studyId: data.studyId || '',
          studyProtocolNumber: data.studyProtocolNumber || '',
          csrDocumentId: data.csrDocumentId || '',
          csrTitle: data.csrTitle || '',
          csrVersion: data.csrVersion || '1.0',
          csrStatus: 'not-started',
          studyPhase: data.studyPhase || '',
          indication: data.indication || '',
          enrollmentCount: data.enrollmentCount || 0,
          applicationId: data.applicationId || '',
          applicationNumber: data.applicationNumber || '',
          targetCTDSection: data.targetCTDSection || 'm5-3-5-1',
          components: [],
          totalComponents: 0,
          completedComponents: 0,
          readinessScore: 0,
          blockers: [],
          warnings: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          csrLinkages: { ...s.csrLinkages, [id]: linkage },
          csrsByStudy: {
            ...s.csrsByStudy,
            [linkage.studyId]: [...(s.csrsByStudy[linkage.studyId] || []), id],
          },
        }));
        return linkage;
      },

      updateCSRLinkage: (linkageId, updates) => {
        set((s) => ({
          csrLinkages: {
            ...s.csrLinkages,
            [linkageId]: { ...s.csrLinkages[linkageId], ...updates, updatedAt: timestamp() },
          },
        }));
      },

      addCSRComponent: (linkageId, data) => {
        const id = generateId('comp');
        const component: CSRComponent = {
          id,
          csrLinkageId: linkageId,
          componentType: data.componentType || 'synopsis',
          componentName: data.componentName || '',
          status: 'pending',
          qcStatus: 'not-reviewed',
          priority: data.priority || 'medium',
        };
        set((s) => ({
          csrComponents: {
            ...s.csrComponents,
            [linkageId]: [...(s.csrComponents[linkageId] || []), component],
          },
        }));
        return component;
      },

      updateCSRComponent: (linkageId, componentId, updates) => {
        set((s) => ({
          csrComponents: {
            ...s.csrComponents,
            [linkageId]: (s.csrComponents[linkageId] || []).map((c) =>
              c.id === componentId ? { ...c, ...updates } : c
            ),
          },
        }));
      },

      calculateCSRReadiness: (linkageId) => {
        const linkage = get().csrLinkages[linkageId];
        if (!linkage) return 0;
        if (linkage.totalComponents === 0) return 0;
        return Math.round((linkage.completedComponents / linkage.totalComponents) * 100);
      },

      linkCSRToSubmission: (linkageId, sequenceId) => {
        set((s) => ({
          csrLinkages: {
            ...s.csrLinkages,
            [linkageId]: {
              ...s.csrLinkages[linkageId],
              targetSequenceId: sequenceId,
              csrStatus: 'linked',
              linkedToSubmissionAt: timestamp(),
              updatedAt: timestamp(),
            },
          },
        }));
      },

      // TMF Readiness Actions
      assessTMFReadiness: (studyId, applicationId, targetSequenceId, assessedBy) => {
        const id = generateId('tmf-ready');
        const now = timestamp();
        const report: TMFSubmissionReadiness = {
          id,
          studyId,
          studyProtocolNumber: get().studyMappings[Object.keys(get().studyMappings).find(k => get().studyMappings[k].studyId === studyId) || '']?.studyProtocolNumber || '',
          applicationId,
          applicationNumber: applicationId,
          targetSequenceId,
          assessmentDate: now,
          assessedBy,
          overallReadinessScore: 85,
          criticalDocumentsScore: 95,
          regulatoryDocumentsScore: 90,
          zoneReadiness: [],
          requiredArtifacts: [],
          missingArtifacts: [],
          expiredArtifacts: [],
          ctdMappingStatus: [],
          readinessLevel: 'minor-gaps',
          blockerCount: 0,
          warningCount: 2,
          estimatedRemediationDays: 5,
          prioritizedActions: [],
        };
        set((s) => ({
          tmfReadinessReports: { ...s.tmfReadinessReports, [id]: report },
          latestTMFReadiness: { ...s.latestTMFReadiness, [applicationId]: id },
        }));
        return report;
      },

      updateTMFAction: (reportId, actionId, status) => {
        set((s) => ({
          tmfReadinessReports: {
            ...s.tmfReadinessReports,
            [reportId]: {
              ...s.tmfReadinessReports[reportId],
              prioritizedActions: s.tmfReadinessReports[reportId].prioritizedActions.map((a) =>
                a.id === actionId ? { ...a, status } : a
              ),
            },
          },
        }));
      },

      getMissingArtifacts: (studyId) => {
        const reportId = Object.keys(get().tmfReadinessReports).find(
          (id) => get().tmfReadinessReports[id].studyId === studyId
        );
        if (!reportId) return [];
        return get().tmfReadinessReports[reportId].missingArtifacts;
      },

      mapTMFToCtd: (tmfArtifactId, ctdSection) => {
        // Record TMF to CTD mapping - could extend to store these
        /* TMF to CTD mapped */
      },

      // Protocol Mapping Actions
      createProtocolMapping: (data) => {
        const id = generateId('protocol-map');
        const mapping: ProtocolCTDMapping = {
          id,
          protocolId: data.protocolId || '',
          protocolNumber: data.protocolNumber || '',
          protocolVersion: data.protocolVersion || '1.0',
          protocolTitle: data.protocolTitle || '',
          module5Section: data.module5Section || 'm5-3-5',
          module5Subsection: data.module5Subsection || '',
          sequenceInSection: data.sequenceInSection || 1,
          studyPhase: data.studyPhase || '',
          studyType: data.studyType || 'interventional',
          isPivotal: data.isPivotal ?? false,
          isControlled: data.isControlled ?? false,
          relatedAmendments: [],
          relatedDatasets: [],
          crossReferences: [],
          mappingStatus: 'pending',
          validationIssues: [],
        };
        set((s) => ({
          protocolMappings: { ...s.protocolMappings, [id]: mapping },
        }));
        return mapping;
      },

      updateProtocolMapping: (mappingId, updates) => {
        set((s) => ({
          protocolMappings: {
            ...s.protocolMappings,
            [mappingId]: { ...s.protocolMappings[mappingId], ...updates },
          },
        }));
      },

      addProtocolAmendment: (mappingId, amendment) => {
        set((s) => ({
          protocolMappings: {
            ...s.protocolMappings,
            [mappingId]: {
              ...s.protocolMappings[mappingId],
              relatedAmendments: [...s.protocolMappings[mappingId].relatedAmendments, amendment],
            },
          },
        }));
      },

      addDatasetReference: (mappingId, dataset) => {
        set((s) => ({
          protocolMappings: {
            ...s.protocolMappings,
            [mappingId]: {
              ...s.protocolMappings[mappingId],
              relatedDatasets: [...s.protocolMappings[mappingId].relatedDatasets, dataset],
            },
          },
        }));
      },

      // Site Mapping Actions
      createSiteMapping: (data) => {
        const id = generateId('site-map');
        const mapping: SiteRegionalMapping = {
          id,
          siteId: data.siteId || '',
          siteNumber: data.siteNumber || '',
          siteName: data.siteName || '',
          studyId: data.studyId || '',
          country: data.country || '',
          countryCode: data.countryCode || '',
          region: data.region || '',
          regulatoryAuthority: data.regulatoryAuthority || '',
          regionalRequirements: [],
          siteDocuments: [],
          documentsRequired: 0,
          documentsAvailable: 0,
          completenessScore: 0,
          piName: data.piName || '',
          piCredentials: data.piCredentials || '',
          piCV1572Status: '1572-pending',
          irbName: data.irbName || '',
          readyForSubmission: false,
          blockers: [],
        };
        set((s) => ({
          siteRegionalMappings: { ...s.siteRegionalMappings, [id]: mapping },
          sitesByStudy: {
            ...s.sitesByStudy,
            [mapping.studyId]: [...(s.sitesByStudy[mapping.studyId] || []), id],
          },
        }));
        return mapping;
      },

      updateSiteMapping: (mappingId, updates) => {
        set((s) => ({
          siteRegionalMappings: {
            ...s.siteRegionalMappings,
            [mappingId]: { ...s.siteRegionalMappings[mappingId], ...updates },
          },
        }));
      },

      checkSiteReadiness: (mappingId) => {
        const mapping = get().siteRegionalMappings[mappingId];
        if (!mapping) return false;
        return mapping.completenessScore >= 100 && mapping.blockers.length === 0;
      },

      bulkCreateSiteMappings: (studyId) => {
        // Would typically pull from CTMS site data
        return [];
      },

      // Enrollment Data Actions
      createEnrollmentMapping: (data) => {
        const id = generateId('enroll');
        const mapping: EnrollmentDataMapping = {
          id,
          studyId: data.studyId || '',
          studyProtocolNumber: data.studyProtocolNumber || '',
          applicationId: data.applicationId || '',
          targetEnrollment: data.targetEnrollment || 0,
          actualEnrollment: data.actualEnrollment || 0,
          screenedCount: data.screenedCount || 0,
          screenFailureCount: data.screenFailureCount || 0,
          discontinuedCount: data.discontinuedCount || 0,
          completedCount: data.completedCount || 0,
          demographicsSummary: data.demographicsSummary || {
            ageRange: { min: 0, max: 0, mean: 0, median: 0 },
            sexDistribution: { male: 0, female: 0 },
            raceDistribution: {},
            ethnicityDistribution: {},
          },
          dispositionData: data.dispositionData || {
            screened: 0, screenFailures: 0, randomized: 0, notRandomized: 0,
            completedTreatment: 0, discontinuedTreatment: 0, discontinuationReasons: {},
            completedStudy: 0, ongoingStudy: 0, lostToFollowUp: 0, withdrawnConsent: 0, deaths: 0,
          },
          enrollmentByCountry: [],
          enrollmentByRegion: [],
          tableMappings: [],
          dataSource: 'ctms',
          lastDataExtract: timestamp(),
          dataAsOfDate: new Date().toISOString().split('T')[0],
          validationStatus: 'not-validated',
          validationIssues: [],
        };
        set((s) => ({
          enrollmentDataMappings: { ...s.enrollmentDataMappings, [id]: mapping },
          enrollmentByStudy: { ...s.enrollmentByStudy, [mapping.studyId]: id },
        }));
        return mapping;
      },

      updateEnrollmentData: (mappingId, updates) => {
        set((s) => ({
          enrollmentDataMappings: {
            ...s.enrollmentDataMappings,
            [mappingId]: { ...s.enrollmentDataMappings[mappingId], ...updates },
          },
        }));
      },

      refreshEnrollmentFromSource: async (mappingId) => {
        // Simulate async data refresh
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((s) => ({
          enrollmentDataMappings: {
            ...s.enrollmentDataMappings,
            [mappingId]: {
              ...s.enrollmentDataMappings[mappingId],
              lastDataExtract: timestamp(),
            },
          },
        }));
      },

      generateModule5Tables: (mappingId) => {
        const mapping = get().enrollmentDataMappings[mappingId];
        if (!mapping) return [];
        const tables: Module5TableMapping[] = [
          { tableId: generateId('tbl'), tableNumber: '14.1.1', tableTitle: 'Subject Disposition', ctdSection: 'm5-3-5-1', dataSource: 'adsl', generationStatus: 'generated', lastGenerated: timestamp() },
          { tableId: generateId('tbl'), tableNumber: '14.1.2', tableTitle: 'Demographics', ctdSection: 'm5-3-5-1', dataSource: 'adsl', generationStatus: 'generated', lastGenerated: timestamp() },
        ];
        set((s) => ({
          enrollmentDataMappings: {
            ...s.enrollmentDataMappings,
            [mappingId]: { ...s.enrollmentDataMappings[mappingId], tableMappings: tables },
          },
        }));
        return tables;
      },

      // Auto-Link Rule Actions
      createAutoLinkRule: (data) => {
        const id = generateId('rule');
        const now = timestamp();
        const rule: ClinicalRegAutoLinkRule = {
          id,
          name: data.name || '',
          description: data.description || '',
          isActive: data.isActive ?? true,
          sourceModule: data.sourceModule || 'tmf',
          sourceTrigger: data.sourceTrigger || { triggerType: 'manual' },
          sourceConditions: data.sourceConditions || [],
          targetModule: 'ectd',
          targetSection: data.targetSection || '',
          targetDocumentType: data.targetDocumentType || 'clinical-study-report',
          fieldMappings: data.fieldMappings || [],
          autoValidate: data.autoValidate ?? true,
          requiresApproval: data.requiresApproval ?? false,
          notifyOnLink: data.notifyOnLink ?? true,
          notifyRecipients: data.notifyRecipients || [],
          successCount: 0,
          failureCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: data.createdBy || 'system',
        };
        set((s) => ({
          autoLinkRules: { ...s.autoLinkRules, [id]: rule },
          activeRules: rule.isActive ? [...s.activeRules, id] : s.activeRules,
        }));
        return rule;
      },

      updateAutoLinkRule: (ruleId, updates) => {
        set((s) => ({
          autoLinkRules: {
            ...s.autoLinkRules,
            [ruleId]: { ...s.autoLinkRules[ruleId], ...updates, updatedAt: timestamp() },
          },
        }));
      },

      toggleAutoLinkRule: (ruleId) => {
        const rule = get().autoLinkRules[ruleId];
        if (!rule) return;
        const newActive = !rule.isActive;
        set((s) => ({
          autoLinkRules: {
            ...s.autoLinkRules,
            [ruleId]: { ...rule, isActive: newActive, updatedAt: timestamp() },
          },
          activeRules: newActive
            ? [...s.activeRules, ruleId]
            : s.activeRules.filter((id) => id !== ruleId),
        }));
      },

      executeAutoLinkRule: (ruleId, sourceData) => {
        const rule = get().autoLinkRules[ruleId];
        const eventId = generateId('event');
        const event: ClinicalRegBridgeEvent = {
          id: eventId,
          eventType: 'document-linked',
          sourceModule: rule?.sourceModule || 'unknown',
          targetModule: 'ectd',
          sourceRecordId: String(sourceData.id || ''),
          eventDescription: `Auto-link executed for rule: ${rule?.name}`,
          eventData: sourceData,
          status: 'completed',
          triggeredBy: 'system',
          triggeredAt: timestamp(),
          processedAt: timestamp(),
          relatedEvents: [],
        };
        set((s) => ({
          bridgeEvents: { ...s.bridgeEvents, [eventId]: event },
          autoLinkRules: {
            ...s.autoLinkRules,
            [ruleId]: {
              ...s.autoLinkRules[ruleId],
              successCount: s.autoLinkRules[ruleId].successCount + 1,
              lastTriggered: timestamp(),
            },
          },
        }));
        return event;
      },

      // Event Actions
      recordBridgeEvent: (data) => {
        const id = generateId('event');
        const now = timestamp();
        const event: ClinicalRegBridgeEvent = {
          id,
          eventType: data.eventType || 'manual-mapping',
          sourceModule: data.sourceModule || '',
          targetModule: data.targetModule || '',
          sourceRecordId: data.sourceRecordId || '',
          eventDescription: data.eventDescription || '',
          eventData: data.eventData || {},
          status: 'pending',
          triggeredBy: data.triggeredBy || 'system',
          triggeredAt: now,
          relatedEvents: [],
        };
        set((s) => ({
          bridgeEvents: { ...s.bridgeEvents, [id]: event },
        }));
        return event;
      },

      processEvent: async (eventId) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        set((s) => ({
          bridgeEvents: {
            ...s.bridgeEvents,
            [eventId]: {
              ...s.bridgeEvents[eventId],
              status: 'completed',
              processedAt: timestamp(),
            },
          },
        }));
      },

      getEventsForApplication: (applicationId) => {
        return Object.values(get().bridgeEvents).filter(
          (e) => e.eventData?.applicationId === applicationId
        );
      },

      // Dashboard Actions
      refreshDashboard: (applicationId) => {
        const state = get();
        const mappings = Object.values(state.studyMappings).filter(
          (m) => m.applicationId === applicationId
        );
        const csrs = Object.values(state.csrLinkages).filter(
          (c) => c.applicationId === applicationId
        );
        const enrollment = Object.values(state.enrollmentDataMappings).filter(
          (e) => e.applicationId === applicationId
        );
        
        const dashboard: ClinicalRegBridgeDashboard = {
          applicationId,
          applicationNumber: applicationId,
          asOfDate: timestamp(),
          linkedStudies: new Set(mappings.map((m) => m.studyId)).size,
          totalStudies: new Set(mappings.map((m) => m.studyId)).size,
          totalMappings: mappings.length,
          pendingMappings: mappings.filter((m) => m.status === 'pending').length,
          completedMappings: mappings.filter((m) => m.status === 'linked').length,
          errorMappings: mappings.filter((m) => m.status === 'error').length,
          csrSummary: {
            total: csrs.length,
            notStarted: csrs.filter((c) => c.csrStatus === 'not-started').length,
            inProgress: csrs.filter((c) => ['in-progress', 'draft', 'review'].includes(c.csrStatus)).length,
            finalized: csrs.filter((c) => c.csrStatus === 'finalized').length,
            linked: csrs.filter((c) => c.csrStatus === 'linked').length,
          },
          tmfReadinessSummary: {
            overallScore: 94,
            criticalDocumentsScore: 98,
            missingCritical: 1,
            missingNonCritical: 6,
          },
          enrollmentSummary: {
            totalEnrolled: enrollment.reduce((sum, e) => sum + e.actualEnrollment, 0),
            totalTarget: enrollment.reduce((sum, e) => sum + e.targetEnrollment, 0),
            percentComplete: 100,
            countriesEnrolled: 8,
            sitesEnrolled: 62,
          },
          recentEvents: Object.values(state.bridgeEvents).slice(-5),
          pendingActions: [],
          blockers: [],
          metrics: {
            autoLinkSuccessRate: 100,
            averageLinkTime: 45,
            documentsLinkedThisMonth: 4,
            validationErrorRate: 2.5,
            tmfCompletenessImprovement: 3.2,
          },
        };
        
        set((s) => ({
          dashboardData: { ...s.dashboardData, [applicationId]: dashboard },
        }));
        return dashboard;
      },

      getApplicationReadiness: (applicationId) => {
        const state = get();
        const mappings = Object.values(state.studyMappings).filter(
          (m) => m.applicationId === applicationId
        );
        const errors = mappings.filter((m) => m.validationStatus === 'invalid');
        const blockers = errors.map((m) => `${m.documentTitle}: validation errors`);
        const score = mappings.length > 0
          ? Math.round((mappings.filter((m) => m.status === 'linked').length / mappings.length) * 100)
          : 0;
        return {
          ready: blockers.length === 0 && score >= 80,
          blockers,
          score,
        };
      },

      // UI Actions
      setSelectedApplication: (applicationId) => set({ selectedApplicationId: applicationId }),
      setSelectedStudy: (studyId) => set({ selectedStudyId: studyId }),
      setSelectedMapping: (mappingId) => set({ selectedMappingId: mappingId }),
      setActiveView: (view) => set({ activeView: view }),
      setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
      clearFilters: () => set({ filters: {} }),

      // Data Management
      loadGoldenPathData: () => {
        set(getInitialState());
      },
      
      clearAll: () => {
        set({
          studyMappings: {},
          mappingsByStudy: {},
          mappingsByApplication: {},
          csrLinkages: {},
          csrsByStudy: {},
          csrComponents: {},
          tmfReadinessReports: {},
          latestTMFReadiness: {},
          protocolMappings: {},
          protocolsByStudy: {},
          siteRegionalMappings: {},
          sitesByStudy: {},
          enrollmentDataMappings: {},
          enrollmentByStudy: {},
          autoLinkRules: {},
          activeRules: [],
          bridgeEvents: {},
          eventsByApplication: {},
          dashboardData: {},
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ lastError: error }),
    }),
    {
      name: 'ligature-clinical-reg-bridge',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useStudyMappings = () => useClinicalRegBridge((s) => s.studyMappings);
export const useStudyMappingsList = () => {
  const studyMappings = useClinicalRegBridge((s) => s.studyMappings);
  return useMemo(() => Object.values(studyMappings), [studyMappings]);
};
export const useCSRLinkages = () => useClinicalRegBridge((s) => s.csrLinkages);
export const useCSRLinkagesList = () => {
  const csrLinkages = useClinicalRegBridge((s) => s.csrLinkages);
  return useMemo(() => Object.values(csrLinkages), [csrLinkages]);
};
export const useTMFReadinessReports = () => useClinicalRegBridge((s) => s.tmfReadinessReports);
export const useProtocolMappings = () => useClinicalRegBridge((s) => s.protocolMappings);
export const useSiteRegionalMappings = () => useClinicalRegBridge((s) => s.siteRegionalMappings);
export const useEnrollmentDataMappings = () => useClinicalRegBridge((s) => s.enrollmentDataMappings);
export const useAutoLinkRules = () => useClinicalRegBridge((s) => s.autoLinkRules);
export const useActiveAutoLinkRules = () => {
  const activeRules = useClinicalRegBridge((s) => s.activeRules);
  const autoLinkRules = useClinicalRegBridge((s) => s.autoLinkRules);
  return useMemo(() => 
    activeRules.map((id) => autoLinkRules[id]).filter(Boolean),
    [activeRules, autoLinkRules]
  );
};
export const useBridgeEvents = () => useClinicalRegBridge((s) => s.bridgeEvents);
export const useBridgeDashboard = (appId: string) => useClinicalRegBridge((s) => s.dashboardData[appId]);
export const useSelectedApplication = () => useClinicalRegBridge((s) => s.selectedApplicationId);
export const useBridgeView = () => useClinicalRegBridge((s) => s.activeView);
export const useBridgeFilters = () => useClinicalRegBridge((s) => s.filters);
export const useBridgeLoading = () => useClinicalRegBridge((s) => s.isLoading);

// Get CSRs for a specific study
export const useCSRsForStudy = (studyId: string) => {
  const csrsByStudy = useClinicalRegBridge((s) => s.csrsByStudy);
  const csrLinkages = useClinicalRegBridge((s) => s.csrLinkages);
  return useMemo(() => 
    (csrsByStudy[studyId] || []).map((id) => csrLinkages[id]).filter(Boolean),
    [csrsByStudy, studyId, csrLinkages]
  );
};

// Get mappings for a specific application
export const useMappingsForApplication = (appId: string) => {
  const mappingsByApplication = useClinicalRegBridge((s) => s.mappingsByApplication);
  const studyMappings = useClinicalRegBridge((s) => s.studyMappings);
  return useMemo(() =>
    (mappingsByApplication[appId] || []).map((id) => studyMappings[id]).filter(Boolean),
    [mappingsByApplication, appId, studyMappings]
  );
};

// Get latest TMF readiness for an application
export const useLatestTMFReadiness = (appId: string) => useClinicalRegBridge((s) => {
  const reportId = s.latestTMFReadiness[appId];
  return reportId ? s.tmfReadinessReports[reportId] : null;
});

// Get enrollment data for a study
export const useEnrollmentForStudy = (studyId: string) => useClinicalRegBridge((s) => {
  const mappingId = s.enrollmentByStudy[studyId];
  return mappingId ? s.enrollmentDataMappings[mappingId] : null;
});

export default useClinicalRegBridge;
