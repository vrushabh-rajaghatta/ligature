
// ============================================================================
// Clinical-Regulatory Bridge Types - v73
// CTMS/TMF Integration for eCTD Submissions
// ============================================================================
// Provides comprehensive types for linking clinical trial data (CTMS/TMF)
// to regulatory submissions (eCTD), including study-to-dossier mappings,
// TMF completeness tracking, and automated document flow.
// ============================================================================

// ============================================================================
// STUDY-TO-SUBMISSION MAPPING TYPES
// ============================================================================

export type SubmissionModuleTarget = 
  | 'm1-1' | 'm1-2' | 'm1-3' | 'm1-12' | 'm1-14'
  | 'm2-2' | 'm2-3' | 'm2-4' | 'm2-5' | 'm2-6' | 'm2-7'
  | 'm3-2-s' | 'm3-2-p' | 'm3-2-a' | 'm3-2-r'
  | 'm4-2-1' | 'm4-2-2' | 'm4-2-3'
  | 'm5-2' | 'm5-3-1' | 'm5-3-2' | 'm5-3-3' | 'm5-3-4' | 'm5-3-5' | 'm5-3-6' | 'm5-3-7' | 'm5-4';

export type DocumentMappingStatus = 'pending' | 'mapped' | 'validated' | 'linked' | 'outdated' | 'error';
export type MappingPriority = 'critical' | 'high' | 'medium' | 'low';
export type StudyPhaseForMapping = 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'all-phases';

export interface StudyToSubmissionMapping {
  id: string;
  studyId: string;
  studyProtocolNumber: string;
  studyTitle: string;
  studyPhase: StudyPhaseForMapping;
  applicationId: string;
  applicationNumber: string;
  
  // Target CTD location
  targetModule: SubmissionModuleTarget;
  targetSection: string;
  targetSectionTitle: string;
  
  // Document specifications
  documentType: ClinicalDocumentType;
  documentTitle: string;
  documentVersion?: string;
  
  // Status tracking
  status: DocumentMappingStatus;
  priority: MappingPriority;
  
  // Source references
  sourceModule: 'ctms' | 'tmf' | 'edc' | 'safety';
  sourceRecordId?: string;
  sourceRecordType?: string;
  
  // Auto-linking configuration
  autoLinkEnabled: boolean;
  autoLinkTrigger?: AutoLinkTriggerType;
  lastAutoLinkAttempt?: string;
  
  // Validation
  validationStatus: 'not-validated' | 'valid' | 'invalid' | 'warnings';
  validationErrors: MappingValidationError[];
  validationWarnings: MappingValidationWarning[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  
  // TMF cross-reference
  tmfArtifactId?: string;
  tmfZone?: string;
  tmfSection?: string;
}

export type ClinicalDocumentType = 
  | 'clinical-study-report'
  | 'study-protocol'
  | 'protocol-amendment'
  | 'investigator-brochure'
  | 'informed-consent'
  | 'case-report-form'
  | 'statistical-analysis-plan'
  | 'data-management-plan'
  | 'monitoring-plan'
  | 'safety-management-plan'
  | 'pk-analysis-report'
  | 'pk-population-report'
  | 'efficacy-tables'
  | 'safety-tables'
  | 'patient-narratives'
  | 'integrated-summary-efficacy'
  | 'integrated-summary-safety'
  | 'list-of-studies'
  | 'tabular-listing'
  | 'dataset-documentation'
  | 'define-xml';

export type AutoLinkTriggerType = 
  | 'document-finalized'
  | 'study-milestone'
  | 'database-lock'
  | 'csr-approved'
  | 'manual';

export interface MappingValidationError {
  id: string;
  code: string;
  message: string;
  field?: string;
  severity: 'error';
  suggestedFix?: string;
}

export interface MappingValidationWarning {
  id: string;
  code: string;
  message: string;
  field?: string;
  severity: 'warning';
  canIgnore: boolean;
}

// ============================================================================
// CSR (Clinical Study Report) LINKING
// ============================================================================

export interface CSRLinkage {
  id: string;
  studyId: string;
  studyProtocolNumber: string;
  csrDocumentId: string;
  csrTitle: string;
  csrVersion: string;
  csrStatus: CSRStatus;
  
  // Study information
  studyPhase: string;
  indication: string;
  enrollmentCount: number;
  primaryCompletionDate?: string;
  databaseLockDate?: string;
  
  // Target submission
  applicationId: string;
  applicationNumber: string;
  targetSequenceId?: string;
  targetCTDSection: string; // e.g., 'm5-3-5-1'
  
  // Component documents
  components: CSRComponent[];
  totalComponents: number;
  completedComponents: number;
  
  // Validation state
  readinessScore: number;
  blockers: CSRBlocker[];
  warnings: string[];
  
  // Dates
  expectedCompletionDate?: string;
  linkedToSubmissionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CSRStatus = 'not-started' | 'in-progress' | 'draft' | 'review' | 'approved' | 'finalized' | 'linked';

export interface CSRComponent {
  id: string;
  csrLinkageId: string;
  componentType: CSRComponentType;
  componentName: string;
  status: 'pending' | 'draft' | 'review' | 'approved' | 'finalized';
  documentId?: string;
  documentPath?: string;
  
  // Source tracking
  sourceModule?: 'edc' | 'safety' | 'authoring' | 'manual';
  sourceDataset?: string;
  lastDataExtract?: string;
  
  // QC
  qcStatus: 'not-reviewed' | 'qc-passed' | 'qc-failed';
  qcReviewer?: string;
  qcDate?: string;
  
  priority: MappingPriority;
  dueDate?: string;
  assignee?: string;
}

export type CSRComponentType = 
  | 'synopsis'
  | 'list-of-abbreviations'
  | 'ethics'
  | 'investigators-sites'
  | 'study-objectives'
  | 'investigational-plan'
  | 'study-population'
  | 'efficacy-evaluation'
  | 'safety-evaluation'
  | 'discussion-conclusions'
  | 'tables'
  | 'figures'
  | 'listings'
  | 'patient-data-listings'
  | 'adverse-event-listings'
  | 'individual-patient-data'
  | 'protocol'
  | 'sample-crf'
  | 'list-of-irbs'
  | 'list-of-patients'
  | 'randomization-scheme'
  | 'audit-certificates'
  | 'statistical-methods'
  | 'patient-narratives';

export interface CSRBlocker {
  id: string;
  type: 'missing-component' | 'validation-error' | 'pending-review' | 'data-issue' | 'dependency';
  description: string;
  affectedComponent?: string;
  suggestedResolution: string;
  priority: MappingPriority;
  assignee?: string;
}

// ============================================================================
// TMF COMPLETENESS FOR SUBMISSIONS
// ============================================================================

export interface TMFSubmissionReadiness {
  id: string;
  studyId: string;
  studyProtocolNumber: string;
  applicationId: string;
  applicationNumber: string;
  targetSequenceId: string;
  assessmentDate: string;
  assessedBy: string;
  
  // Overall scores
  overallReadinessScore: number;
  criticalDocumentsScore: number;
  regulatoryDocumentsScore: number;
  
  // Zone-by-zone assessment
  zoneReadiness: TMFZoneReadiness[];
  
  // Submission-specific requirements
  requiredArtifacts: TMFRequiredArtifact[];
  missingArtifacts: TMFMissingArtifact[];
  expiredArtifacts: TMFExpiredArtifact[];
  
  // Regulatory mapping
  ctdMappingStatus: CTDMappingStatus[];
  
  // Summary
  readinessLevel: 'ready' | 'minor-gaps' | 'significant-gaps' | 'not-ready';
  blockerCount: number;
  warningCount: number;
  estimatedRemediationDays: number;
  
  // Action items
  prioritizedActions: TMFAction[];
}

export interface TMFZoneReadiness {
  zone: string;
  zoneName: string;
  expectedArtifacts: number;
  presentArtifacts: number;
  missingCritical: number;
  missingNonCritical: number;
  completenessScore: number;
  status: 'complete' | 'minor-gaps' | 'major-gaps' | 'incomplete';
}

export interface TMFRequiredArtifact {
  artifactId: string;
  artifactName: string;
  zone: string;
  section: string;
  isCritical: boolean;
  isPresent: boolean;
  isPresentAndCurrent: boolean;
  documentDate?: string;
  expiryDate?: string;
  ctdMapping?: string;
}

export interface TMFMissingArtifact {
  artifactName: string;
  zone: string;
  section: string;
  isCritical: boolean;
  requiredBy: string;
  suggestedSource: string;
  canAutoGenerate: boolean;
  priority: MappingPriority;
}

export interface TMFExpiredArtifact {
  artifactId: string;
  artifactName: string;
  zone: string;
  documentDate: string;
  expiryDate: string;
  daysPastExpiry: number;
  replacementRequired: boolean;
  suggestedAction: string;
}

export interface CTDMappingStatus {
  ctdSection: string;
  ctdSectionTitle: string;
  tmfArtifactId?: string;
  tmfArtifactName?: string;
  mappingStatus: 'mapped' | 'unmapped' | 'multiple-sources' | 'outdated';
  lastUpdated?: string;
}

export interface TMFAction {
  id: string;
  priority: number;
  actionType: 'upload' | 'update' | 'review' | 'map' | 'qc';
  description: string;
  affectedArtifact: string;
  zone: string;
  estimatedEffortHours: number;
  assignee?: string;
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

// ============================================================================
// PROTOCOL TO MODULE 5 MAPPING
// ============================================================================

export interface ProtocolCTDMapping {
  id: string;
  protocolId: string;
  protocolNumber: string;
  protocolVersion: string;
  protocolTitle: string;
  
  // Module 5 placement
  module5Section: string;
  module5Subsection: string;
  sequenceInSection: number;
  
  // Study characteristics determining placement
  studyPhase: string;
  studyType: string;
  isPivotal: boolean;
  isControlled: boolean;
  
  // Related documents
  relatedCSRId?: string;
  relatedAmendments: ProtocolAmendmentRef[];
  relatedDatasets: DatasetRef[];
  
  // Cross-reference to other CTD sections
  crossReferences: CTDCrossReference[];
  
  // Status
  mappingStatus: DocumentMappingStatus;
  lastValidated?: string;
  validationIssues: string[];
}

export interface ProtocolAmendmentRef {
  amendmentId: string;
  amendmentNumber: string;
  effectiveDate: string;
  description: string;
  ctdPlacement?: string;
}

export interface DatasetRef {
  datasetId: string;
  datasetName: string;
  datasetType: 'sdtm' | 'adam' | 'analysis' | 'other';
  defineXmlId?: string;
  ctdPlacement: string;
}

export interface CTDCrossReference {
  fromSection: string;
  toSection: string;
  referenceType: 'supports' | 'summarizes' | 'details' | 'supersedes';
  description?: string;
}

// ============================================================================
// SITE DATA TO REGIONAL REQUIREMENTS
// ============================================================================

export interface SiteRegionalMapping {
  id: string;
  siteId: string;
  siteNumber: string;
  siteName: string;
  studyId: string;
  
  // Geographic information
  country: string;
  countryCode: string;
  region: string;
  regulatoryAuthority: string;
  
  // Regional submission requirements
  regionalRequirements: RegionalSubmissionRequirement[];
  
  // Site-specific documents for submission
  siteDocuments: SiteSubmissionDocument[];
  
  // Completeness
  documentsRequired: number;
  documentsAvailable: number;
  completenessScore: number;
  
  // Principal investigator information for Module 1
  piName: string;
  piCredentials: string;
  piCV1572Status: '1572-current' | '1572-pending' | '1572-expired';
  piCV1572ExpiryDate?: string;
  
  // IRB/Ethics information
  irbName: string;
  irbApprovalNumber?: string;
  irbApprovalDate?: string;
  irbApprovalExpiryDate?: string;
  
  // Status
  readyForSubmission: boolean;
  blockers: string[];
}

export interface RegionalSubmissionRequirement {
  id: string;
  requirementType: string;
  description: string;
  ctdSection: string;
  isRequired: boolean;
  isMet: boolean;
  documentId?: string;
  notes?: string;
}

export interface SiteSubmissionDocument {
  id: string;
  documentType: SiteDocumentType;
  documentTitle: string;
  documentId?: string;
  tmfArtifactId?: string;
  status: 'available' | 'pending' | 'missing' | 'expired';
  documentDate?: string;
  expiryDate?: string;
  ctdPlacement?: string;
}

export type SiteDocumentType = 
  | 'investigator-cv'
  | 'form-1572'
  | 'financial-disclosure'
  | 'irb-approval'
  | 'irb-membership'
  | 'informed-consent-template'
  | 'site-delegation-log'
  | 'training-documentation'
  | 'facility-certification'
  | 'import-license'
  | 'local-labeling';

// ============================================================================
// ENROLLMENT DATA TO MODULE 5 TABLES
// ============================================================================

export interface EnrollmentDataMapping {
  id: string;
  studyId: string;
  studyProtocolNumber: string;
  applicationId: string;
  
  // Enrollment summary
  targetEnrollment: number;
  actualEnrollment: number;
  screenedCount: number;
  screenFailureCount: number;
  discontinuedCount: number;
  completedCount: number;
  
  // Demographics (for Module 5 tables)
  demographicsSummary: DemographicsSummary;
  
  // Disposition (for CONSORT diagram)
  dispositionData: SubjectDisposition;
  
  // Geographic distribution
  enrollmentByCountry: CountryEnrollment[];
  enrollmentByRegion: RegionEnrollment[];
  
  // Module 5 table mappings
  tableMappings: Module5TableMapping[];
  
  // Data source
  dataSource: 'edc' | 'ctms' | 'manual';
  lastDataExtract: string;
  dataAsOfDate: string;
  
  // Validation
  validationStatus: 'not-validated' | 'valid' | 'warnings' | 'errors';
  validationIssues: DataValidationIssue[];
}

export interface DemographicsSummary {
  ageRange: { min: number; max: number; mean: number; median: number };
  sexDistribution: { male: number; female: number; other?: number };
  raceDistribution: Record<string, number>;
  ethnicityDistribution: Record<string, number>;
  baselineDiseaseCharacteristics?: Record<string, string | number>;
}

export interface SubjectDisposition {
  screened: number;
  screenFailures: number;
  randomized: number;
  notRandomized: number;
  completedTreatment: number;
  discontinuedTreatment: number;
  discontinuationReasons: Record<string, number>;
  completedStudy: number;
  ongoingStudy: number;
  lostToFollowUp: number;
  withdrawnConsent: number;
  deaths: number;
}

export interface CountryEnrollment {
  country: string;
  countryCode: string;
  targetEnrollment: number;
  actualEnrollment: number;
  siteCount: number;
  percentOfTotal: number;
}

export interface RegionEnrollment {
  region: string;
  countries: string[];
  targetEnrollment: number;
  actualEnrollment: number;
  siteCount: number;
  percentOfTotal: number;
}

export interface Module5TableMapping {
  tableId: string;
  tableNumber: string;
  tableTitle: string;
  ctdSection: string;
  dataSource: string;
  generationStatus: 'not-generated' | 'generated' | 'approved';
  lastGenerated?: string;
  outputPath?: string;
}

export interface DataValidationIssue {
  id: string;
  issueType: 'missing-data' | 'inconsistency' | 'out-of-range' | 'format-error';
  severity: 'error' | 'warning';
  field: string;
  description: string;
  affectedRecords?: number;
  suggestedFix?: string;
}

// ============================================================================
// AUTO-LINKING CONFIGURATION
// ============================================================================

export interface ClinicalRegAutoLinkRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  
  // Source configuration
  sourceModule: 'ctms' | 'tmf' | 'edc' | 'safety' | 'authoring';
  sourceTrigger: AutoLinkTriggerConfig;
  sourceConditions: AutoLinkCondition[];
  
  // Target configuration
  targetModule: 'ectd';
  targetSection: string;
  targetDocumentType: ClinicalDocumentType;
  
  // Mapping rules
  fieldMappings: FieldMappingRule[];
  
  // Behavior
  autoValidate: boolean;
  requiresApproval: boolean;
  notifyOnLink: boolean;
  notifyRecipients: string[];
  
  // Execution history
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AutoLinkTriggerConfig {
  triggerType: 'event' | 'schedule' | 'milestone' | 'manual';
  eventType?: string;
  scheduleConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  milestoneType?: string;
}

export interface AutoLinkCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'starts-with' | 'ends-with' | 'exists' | 'not-exists' | 'greater-than' | 'less-than';
  value?: string | number | boolean;
}

export interface FieldMappingRule {
  sourceField: string;
  targetField: string;
  transformationType?: 'direct' | 'format' | 'lookup' | 'concatenate' | 'calculate';
  transformationConfig?: Record<string, unknown>;
  isRequired: boolean;
  defaultValue?: string;
}

// ============================================================================
// BRIDGE EVENTS AND AUDIT
// ============================================================================

export interface ClinicalRegBridgeEvent {
  id: string;
  eventType: BridgeEventType;
  sourceModule: string;
  targetModule: string;
  sourceRecordId: string;
  targetRecordId?: string;
  
  // Event details
  eventDescription: string;
  eventData: Record<string, unknown>;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  
  // Tracking
  triggeredBy: string;
  triggeredAt: string;
  processedAt?: string;
  duration?: number;
  
  // Related records
  relatedEvents: string[];
}

export type BridgeEventType = 
  | 'study-created'
  | 'study-updated'
  | 'milestone-reached'
  | 'document-linked'
  | 'csr-finalized'
  | 'tmf-artifact-filed'
  | 'enrollment-updated'
  | 'site-activated'
  | 'database-locked'
  | 'validation-completed'
  | 'manual-mapping';

export interface BridgeAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DASHBOARD AND METRICS
// ============================================================================

export interface ClinicalRegBridgeDashboard {
  applicationId: string;
  applicationNumber: string;
  asOfDate: string;
  
  // Study summary
  linkedStudies: number;
  totalStudies: number;
  
  // Document mapping status
  totalMappings: number;
  pendingMappings: number;
  completedMappings: number;
  errorMappings: number;
  
  // CSR status
  csrSummary: {
    total: number;
    notStarted: number;
    inProgress: number;
    finalized: number;
    linked: number;
  };
  
  // TMF readiness
  tmfReadinessSummary: {
    overallScore: number;
    criticalDocumentsScore: number;
    missingCritical: number;
    missingNonCritical: number;
  };
  
  // Enrollment summary
  enrollmentSummary: {
    totalEnrolled: number;
    totalTarget: number;
    percentComplete: number;
    countriesEnrolled: number;
    sitesEnrolled: number;
  };
  
  // Recent activity
  recentEvents: ClinicalRegBridgeEvent[];
  
  // Action items
  pendingActions: TMFAction[];
  blockers: string[];
  
  // Metrics
  metrics: BridgeMetrics;
}

export interface BridgeMetrics {
  autoLinkSuccessRate: number;
  averageLinkTime: number; // seconds
  documentsLinkedThisMonth: number;
  validationErrorRate: number;
  tmfCompletenessImprovement: number; // percentage change
}

// ============================================================================
// STORE STATE
// ============================================================================

export type ClinicalRegBridgeView = 
  | 'dashboard'
  | 'study-mappings'
  | 'csr-linkages'
  | 'tmf-readiness'
  | 'protocol-mappings'
  | 'site-mappings'
  | 'enrollment-data'
  | 'auto-link-config'
  | 'events';

export interface ClinicalRegBridgeFilters {
  applicationId?: string;
  studyId?: string;
  studyPhase?: StudyPhaseForMapping[];
  mappingStatus?: DocumentMappingStatus[];
  priority?: MappingPriority[];
  sourceModule?: string[];
  dateRange?: { start: string; end: string };
  searchText?: string;
}

export interface ClinicalRegBridgeState {
  // Study-to-Submission Mappings
  studyMappings: Record<string, StudyToSubmissionMapping>;
  mappingsByStudy: Record<string, string[]>;
  mappingsByApplication: Record<string, string[]>;
  
  // CSR Linkages
  csrLinkages: Record<string, CSRLinkage>;
  csrsByStudy: Record<string, string[]>;
  csrComponents: Record<string, CSRComponent[]>;
  
  // TMF Readiness
  tmfReadinessReports: Record<string, TMFSubmissionReadiness>;
  latestTMFReadiness: Record<string, string>; // applicationId -> reportId
  
  // Protocol Mappings
  protocolMappings: Record<string, ProtocolCTDMapping>;
  protocolsByStudy: Record<string, string[]>;
  
  // Site Mappings
  siteRegionalMappings: Record<string, SiteRegionalMapping>;
  sitesByStudy: Record<string, string[]>;
  
  // Enrollment Data
  enrollmentDataMappings: Record<string, EnrollmentDataMapping>;
  enrollmentByStudy: Record<string, string>;
  
  // Auto-Link Rules
  autoLinkRules: Record<string, ClinicalRegAutoLinkRule>;
  activeRules: string[];
  
  // Events
  bridgeEvents: Record<string, ClinicalRegBridgeEvent>;
  eventsByApplication: Record<string, string[]>;
  
  // Audit Trail
  auditEntries: Record<string, BridgeAuditEntry>;
  
  // Dashboard Data
  dashboardData: Record<string, ClinicalRegBridgeDashboard>;
  
  // UI State
  selectedApplicationId: string | null;
  selectedStudyId: string | null;
  selectedMappingId: string | null;
  activeView: ClinicalRegBridgeView;
  filters: ClinicalRegBridgeFilters;
  isLoading: boolean;
  lastError: string | null;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export interface ClinicalRegBridgeActions {
  // Study-to-Submission Mappings
  createStudyMapping: (mapping: Partial<StudyToSubmissionMapping>) => StudyToSubmissionMapping;
  updateStudyMapping: (mappingId: string, updates: Partial<StudyToSubmissionMapping>) => void;
  deleteStudyMapping: (mappingId: string) => void;
  validateStudyMapping: (mappingId: string) => MappingValidationError[];
  bulkCreateMappings: (studyId: string, applicationId: string) => StudyToSubmissionMapping[];
  
  // CSR Linkages
  createCSRLinkage: (linkage: Partial<CSRLinkage>) => CSRLinkage;
  updateCSRLinkage: (linkageId: string, updates: Partial<CSRLinkage>) => void;
  addCSRComponent: (linkageId: string, component: Partial<CSRComponent>) => CSRComponent;
  updateCSRComponent: (linkageId: string, componentId: string, updates: Partial<CSRComponent>) => void;
  calculateCSRReadiness: (linkageId: string) => number;
  linkCSRToSubmission: (linkageId: string, sequenceId: string) => void;
  
  // TMF Readiness
  assessTMFReadiness: (studyId: string, applicationId: string, targetSequenceId: string, assessedBy: string) => TMFSubmissionReadiness;
  updateTMFAction: (reportId: string, actionId: string, status: TMFAction['status']) => void;
  getMissingArtifacts: (studyId: string) => TMFMissingArtifact[];
  mapTMFToCtd: (tmfArtifactId: string, ctdSection: string) => void;
  
  // Protocol Mappings
  createProtocolMapping: (mapping: Partial<ProtocolCTDMapping>) => ProtocolCTDMapping;
  updateProtocolMapping: (mappingId: string, updates: Partial<ProtocolCTDMapping>) => void;
  addProtocolAmendment: (mappingId: string, amendment: ProtocolAmendmentRef) => void;
  addDatasetReference: (mappingId: string, dataset: DatasetRef) => void;
  
  // Site Mappings
  createSiteMapping: (mapping: Partial<SiteRegionalMapping>) => SiteRegionalMapping;
  updateSiteMapping: (mappingId: string, updates: Partial<SiteRegionalMapping>) => void;
  checkSiteReadiness: (mappingId: string) => boolean;
  bulkCreateSiteMappings: (studyId: string) => SiteRegionalMapping[];
  
  // Enrollment Data
  createEnrollmentMapping: (mapping: Partial<EnrollmentDataMapping>) => EnrollmentDataMapping;
  updateEnrollmentData: (mappingId: string, updates: Partial<EnrollmentDataMapping>) => void;
  refreshEnrollmentFromSource: (mappingId: string) => Promise<void>;
  generateModule5Tables: (mappingId: string) => Module5TableMapping[];
  
  // Auto-Link Rules
  createAutoLinkRule: (rule: Partial<ClinicalRegAutoLinkRule>) => ClinicalRegAutoLinkRule;
  updateAutoLinkRule: (ruleId: string, updates: Partial<ClinicalRegAutoLinkRule>) => void;
  toggleAutoLinkRule: (ruleId: string) => void;
  executeAutoLinkRule: (ruleId: string, sourceData: Record<string, unknown>) => ClinicalRegBridgeEvent;
  
  // Events
  recordBridgeEvent: (event: Partial<ClinicalRegBridgeEvent>) => ClinicalRegBridgeEvent;
  processEvent: (eventId: string) => Promise<void>;
  getEventsForApplication: (applicationId: string) => ClinicalRegBridgeEvent[];
  
  // Dashboard
  refreshDashboard: (applicationId: string) => ClinicalRegBridgeDashboard;
  getApplicationReadiness: (applicationId: string) => { ready: boolean; blockers: string[]; score: number };
  
  // UI
  setSelectedApplication: (applicationId: string | null) => void;
  setSelectedStudy: (studyId: string | null) => void;
  setSelectedMapping: (mappingId: string | null) => void;
  setActiveView: (view: ClinicalRegBridgeView) => void;
  setFilters: (filters: Partial<ClinicalRegBridgeFilters>) => void;
  clearFilters: () => void;
  
  // Data Management
  loadGoldenPathData: () => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
