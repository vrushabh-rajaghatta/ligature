
// ============================================================================
// TMF Types - Trial Master File (v53)
// Comprehensive types for eTMF structure based on DIA Reference Model,
// auto-linking, completeness scoring, and inspection readiness
// ============================================================================

// ============================================================================
// DIA REFERENCE MODEL ZONES
// ============================================================================

export type TMFZone = 'zone-01' | 'zone-02' | 'zone-03' | 'zone-04' | 'zone-05' | 'zone-06' | 'zone-07' | 'zone-08' | 'zone-09' | 'zone-10';

export interface TMFZoneDefinition {
  zone: TMFZone;
  name: string;
  description: string;
  isCritical: boolean;
}

export interface TMFSectionDefinition {
  id: string;
  zone: TMFZone;
  sectionNumber: string;
  name: string;
  description: string;
  isRequired: boolean;
  milestone?: StudyMilestone;
}

export type StudyMilestone = 'study-start-up' | 'first-site-initiated' | 'first-subject-enrolled' | 'enrollment-complete' | 'last-subject-last-visit' | 'database-lock' | 'study-close-out' | 'any';

export interface TMFArtifactDefinition {
  id: string;
  sectionId: string;
  artifactNumber: string;
  name: string;
  description: string;
  level: 'trial' | 'country' | 'site';
  isRequired: boolean;
  isCritical: boolean;
  sourceModules: SourceModule[];
  retentionYears: number;
}

export type SourceModule = 'ctms' | 'edc' | 'safety' | 'submissions' | 'authoring' | 'publishing' | 'cmc' | 'manual';

// ============================================================================
// TMF STUDY
// ============================================================================

export interface TMFStudy {
  id: string;
  studyId: string;
  protocolNumber: string;
  studyTitle: string;
  sponsorName: string;
  referenceModelVersion: string;
  countryList: string[];
  siteList: string[];
  status: 'active' | 'closed' | 'archived';
  currentMilestone: StudyMilestone;
  lastMilestoneDate: string;
  overallCompletenessScore: number;
  criticalCompletenessScore: number;
  inspectionReadinessScore: number;
  totalArtifactsExpected: number;
  totalArtifactsFiled: number;
  totalArtifactsMissing: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// TMF ARTIFACTS
// ============================================================================

export interface TMFArtifact {
  id: string;
  studyId: string;
  zoneId: TMFZone;
  sectionId: string;
  artifactDefinitionId: string;
  level: 'trial' | 'country' | 'site';
  countryCode?: string;
  siteId?: string;
  siteName?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  version: string;
  title: string;
  description?: string;
  documentDate: string;
  filedDate: string;
  status: ArtifactStatus;
  qualityStatus: QualityStatus;
  sourceModule?: SourceModule;
  sourceRecordId?: string;
  autoLinked: boolean;
  validationStatus: 'not-validated' | 'valid' | 'invalid';
  validationErrors: ValidationError[];
  lastValidated: string;
  signatures: ArtifactSignature[];
  requiresSignature: boolean;
  signatureComplete: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  auditTrail: AuditEntry[];
}

export type ArtifactStatus = 'draft' | 'pending-review' | 'approved' | 'filed' | 'superseded' | 'archived';
export type QualityStatus = 'not-reviewed' | 'qc-pending' | 'qc-passed' | 'qc-failed';

export interface ValidationError {
  id: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  detectedAt: string;
}

export interface ArtifactSignature {
  id: string;
  role: string;
  signerName: string;
  signerId: string;
  signedAt?: string;
  status: 'pending' | 'signed' | 'rejected';
  comments?: string;
}

export interface AuditEntry {
  id: string;
  action: 'created' | 'updated' | 'filed' | 'signed' | 'linked' | 'qc-reviewed' | 'superseded';
  performedBy: string;
  performedAt: string;
  details: string;
}

// ============================================================================
// AUTO-LINKING
// ============================================================================

export interface AutoLinkRule {
  id: string;
  name: string;
  description: string;
  sourceModule: SourceModule;
  sourceEventType: string;
  sourceConditions: LinkCondition[];
  targetZone: TMFZone;
  targetSectionId: string;
  targetArtifactId: string;
  targetLevel: 'trial' | 'country' | 'site';
  isActive: boolean;
  autoFile: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkCondition {
  field: string;
  operator: 'equals' | 'contains' | 'exists';
  value?: string | number | boolean;
}

export interface AutoLinkEvent {
  id: string;
  studyId: string;
  ruleId: string;
  ruleName: string;
  sourceModule: SourceModule;
  sourceEventType: string;
  sourceRecordId: string;
  sourceData: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed' | 'skipped';
  artifactId?: string;
  errorMessage?: string;
  eventTime: string;
  processedAt?: string;
}

// ============================================================================
// COMPLETENESS SCORING
// ============================================================================

export interface CompletenessReport {
  id: string;
  studyId: string;
  generatedAt: string;
  generatedBy: string;
  overallScore: number;
  criticalScore: number;
  inspectionReadinessScore: number;
  zoneScores: ZoneCompletenessScore[];
  missingArtifacts: MissingArtifact[];
  qualityIssues: QualityIssue[];
}

export interface ZoneCompletenessScore {
  zone: TMFZone;
  zoneName: string;
  score: number;
  expected: number;
  filed: number;
  missing: number;
  criticalMissing: number;
}

export interface MissingArtifact {
  artifactDefinitionId: string;
  artifactName: string;
  zone: TMFZone;
  sectionId: string;
  level: 'trial' | 'country' | 'site';
  isCritical: boolean;
  expectedByMilestone: StudyMilestone;
  sourceModule?: SourceModule;
  suggestedAction: string;
}

export interface QualityIssue {
  id: string;
  artifactId: string;
  artifactName: string;
  issueType: 'validation-error' | 'signature-missing' | 'qc-failed';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  detectedAt: string;
}

// ============================================================================
// INSPECTION READINESS
// ============================================================================

export interface InspectionReadinessAssessment {
  id: string;
  studyId: string;
  assessmentDate: string;
  assessedBy: string;
  readinessLevel: 'inspection-ready' | 'minor-gaps' | 'significant-gaps' | 'not-ready';
  overallScore: number;
  estimatedPrepTime: number;
  criticalFindings: InspectionFinding[];
  majorFindings: InspectionFinding[];
  minorFindings: InspectionFinding[];
  prioritizedActions: PrioritizedAction[];
  trendDirection: 'improving' | 'stable' | 'declining';
}

export interface InspectionFinding {
  id: string;
  category: 'essential-documents' | 'regulatory-approvals' | 'site-documentation' | 'subject-records' | 'safety-reporting' | 'data-integrity';
  findingType: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  affectedArtifacts: string[];
  suggestedRemediation: string;
  estimatedRemediationHours: number;
  assignedTo?: string;
  dueDate?: string;
  status: 'open' | 'in-progress' | 'resolved';
}

export interface PrioritizedAction {
  id: string;
  priority: number;
  action: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimatedHours: number;
  assignedTo?: string;
  dueDate?: string;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface TMFDashboardData {
  studyId: string;
  lastUpdated: string;
  overallCompleteness: number;
  criticalCompleteness: number;
  inspectionReadiness: number;
  totalExpected: number;
  totalFiled: number;
  totalPending: number;
  zoneSummary: ZoneSummary[];
  recentArtifacts: RecentArtifact[];
  recentAutoLinks: RecentAutoLink[];
  alerts: TMFAlert[];
}

export interface ZoneSummary {
  zone: TMFZone;
  zoneName: string;
  completeness: number;
  filed: number;
  expected: number;
  trend: 'up' | 'stable' | 'down';
}

export interface RecentArtifact {
  artifactId: string;
  artifactName: string;
  zone: TMFZone;
  action: 'filed' | 'updated' | 'signed';
  timestamp: string;
  performedBy: string;
}

export interface RecentAutoLink {
  eventId: string;
  sourceModule: SourceModule;
  artifactName: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
}

export interface TMFAlert {
  id: string;
  type: 'overdue' | 'missing-critical' | 'quality-issue' | 'inspection-risk';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  createdAt: string;
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

export type TMFView = 'dashboard' | 'zone-browser' | 'artifact-list' | 'artifact-detail' | 'completeness' | 'inspection-readiness' | 'auto-link-config';

export interface TMFFilters {
  zones?: TMFZone[];
  statuses?: ArtifactStatus[];
  isCritical?: boolean;
  siteId?: string;
  searchText?: string;
}

export interface TMFState {
  studies: Record<string, TMFStudy>;
  zoneDefinitions: Record<TMFZone, TMFZoneDefinition>;
  sectionDefinitions: Record<string, TMFSectionDefinition>;
  artifactDefinitions: Record<string, TMFArtifactDefinition>;
  artifacts: Record<string, TMFArtifact>;
  artifactsByStudy: Record<string, string[]>;
  artifactsByZone: Record<string, Record<TMFZone, string[]>>;
  autoLinkRules: Record<string, AutoLinkRule>;
  autoLinkEvents: Record<string, AutoLinkEvent>;
  completenessReports: Record<string, CompletenessReport>;
  latestReportByStudy: Record<string, string>;
  inspectionAssessments: Record<string, InspectionReadinessAssessment>;
  latestAssessmentByStudy: Record<string, string>;
  dashboardData: Record<string, TMFDashboardData>;
  selectedStudyId: string | null;
  selectedZone: TMFZone | null;
  selectedArtifactId: string | null;
  activeView: TMFView;
  filters: TMFFilters;
  isLoading: boolean;
  lastError: string | null;
}

export interface TMFActions {
  createTMFStudy: (data: Partial<TMFStudy>) => TMFStudy;
  updateTMFStudy: (studyId: string, updates: Partial<TMFStudy>) => void;
  updateStudyMilestone: (studyId: string, milestone: StudyMilestone) => void;
  addArtifact: (data: Partial<TMFArtifact>) => TMFArtifact;
  updateArtifact: (artifactId: string, updates: Partial<TMFArtifact>) => void;
  fileArtifact: (artifactId: string, filedBy: string) => void;
  supersedeArtifact: (artifactId: string, newArtifactId: string) => void;
  validateArtifact: (artifactId: string) => ValidationError[];
  addSignatureRequirement: (artifactId: string, role: string, signerName: string, signerId: string) => void;
  signArtifact: (artifactId: string, signatureId: string, comments?: string) => void;
  submitForQC: (artifactId: string) => void;
  passQC: (artifactId: string, reviewer: string) => void;
  failQC: (artifactId: string, reviewer: string, reason: string) => void;
  addAutoLinkRule: (data: Partial<AutoLinkRule>) => AutoLinkRule;
  updateAutoLinkRule: (ruleId: string, updates: Partial<AutoLinkRule>) => void;
  toggleAutoLinkRule: (ruleId: string) => void;
  processAutoLinkEvent: (event: Partial<AutoLinkEvent>) => TMFArtifact | null;
  linkFromCTMS: (studyId: string, ctmsEvent: string, ctmsData: Record<string, unknown>) => void;
  linkFromEDC: (studyId: string, edcEvent: string, edcData: Record<string, unknown>) => void;
  linkFromSafety: (studyId: string, safetyEvent: string, safetyData: Record<string, unknown>) => void;
  linkFromSubmissions: (studyId: string, submissionEvent: string, submissionData: Record<string, unknown>) => void;
  generateCompletenessReport: (studyId: string, generatedBy: string) => CompletenessReport;
  calculateZoneCompleteness: (studyId: string, zone: TMFZone) => ZoneCompletenessScore;
  identifyMissingArtifacts: (studyId: string) => MissingArtifact[];
  runInspectionReadinessAssessment: (studyId: string, assessedBy: string) => InspectionReadinessAssessment;
  updateFindingStatus: (assessmentId: string, findingId: string, status: InspectionFinding['status']) => void;
  refreshDashboard: (studyId: string) => TMFDashboardData;
  setSelectedStudyId: (studyId: string | null) => void;
  setSelectedZone: (zone: TMFZone | null) => void;
  setSelectedArtifactId: (artifactId: string | null) => void;
  setActiveView: (view: TMFView) => void;
  setFilters: (filters: Partial<TMFFilters>) => void;
  clearFilters: () => void;
  initializeDIAModel: () => void;
  loadMockData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
