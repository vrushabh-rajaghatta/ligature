
/**
 * TMF Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Trial Master File types in Ligature.
 * Based on DIA Reference Model with zones, artifacts, auto-linking,
 * completeness scoring, and inspection readiness assessment.
 * 
 * @module domains/tmf/contracts
 * @version 0.27.22
 */

// =============================================================================
// DIA REFERENCE MODEL ENUMS
// =============================================================================

export type TMFZone = 
  | 'zone-01' | 'zone-02' | 'zone-03' | 'zone-04' | 'zone-05'
  | 'zone-06' | 'zone-07' | 'zone-08' | 'zone-09' | 'zone-10';

export type ArtifactLevel = 'trial' | 'country' | 'site';

export type StudyMilestone = 
  | 'study-start-up' | 'first-site-initiated' | 'first-subject-enrolled'
  | 'enrollment-complete' | 'last-subject-last-visit' | 'database-lock'
  | 'study-close-out' | 'any';

export type SourceModule = 
  | 'ctms' | 'edc' | 'safety' | 'submissions' 
  | 'authoring' | 'publishing' | 'cmc' | 'manual';

// =============================================================================
// ARTIFACT STATUS ENUMS
// =============================================================================

export type ArtifactStatus = 'draft' | 'pending-review' | 'approved' | 'filed' | 'superseded' | 'archived';

export type QualityStatus = 'not-reviewed' | 'qc-pending' | 'qc-passed' | 'qc-failed';

export type ValidationStatus = 'not-validated' | 'valid' | 'invalid';

export type SignatureStatus = 'pending' | 'signed' | 'rejected';

// =============================================================================
// AUTO-LINK ENUMS
// =============================================================================

export type LinkOperator = 'equals' | 'contains' | 'exists';

export type AutoLinkEventStatus = 'pending' | 'processed' | 'failed' | 'skipped';

// =============================================================================
// COMPLETENESS & INSPECTION ENUMS
// =============================================================================

export type ReadinessLevel = 'inspection-ready' | 'minor-gaps' | 'significant-gaps' | 'not-ready';

export type TrendDirection = 'improving' | 'stable' | 'declining';

export type FindingCategory = 
  | 'essential-documents' | 'regulatory-approvals' | 'site-documentation'
  | 'subject-records' | 'safety-reporting' | 'data-integrity';

export type FindingSeverity = 'critical' | 'major' | 'minor';

export type FindingStatus = 'open' | 'in-progress' | 'resolved';

export type ImpactLevel = 'high' | 'medium' | 'low';

export type EffortLevel = 'high' | 'medium' | 'low';

// =============================================================================
// AUDIT ENUMS
// =============================================================================

export type AuditAction = 
  | 'created' | 'updated' | 'filed' | 'signed'
  | 'linked' | 'qc-reviewed' | 'superseded';

// =============================================================================
// ALERT ENUMS
// =============================================================================

export type AlertType = 'overdue' | 'missing-critical' | 'quality-issue' | 'inspection-risk';

export type AlertSeverity = 'critical' | 'warning' | 'info';

// =============================================================================
// CORE INTERFACES
// =============================================================================

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

export interface TMFArtifactDefinition {
  id: string;
  sectionId: string;
  artifactNumber: string;
  name: string;
  description: string;
  level: ArtifactLevel;
  isRequired: boolean;
  isCritical: boolean;
  sourceModules: SourceModule[];
  retentionYears: number;
}

export interface TMFStudySummary {
  id: string;
  studyId: string;
  protocolNumber: string;
  studyTitle: string;
  sponsorName: string;
  status: 'active' | 'closed' | 'archived';
  currentMilestone: StudyMilestone;
  overallCompletenessScore: number;
  criticalCompletenessScore: number;
  inspectionReadinessScore: number;
  totalArtifactsExpected: number;
  totalArtifactsFiled: number;
  totalArtifactsMissing: number;
}

export interface TMFArtifactSummary {
  id: string;
  studyId: string;
  zoneId: TMFZone;
  sectionId: string;
  artifactDefinitionId: string;
  level: ArtifactLevel;
  countryCode?: string;
  siteId?: string;
  siteName?: string;
  fileName: string;
  fileType: string;
  title: string;
  version: string;
  documentDate: string;
  filedDate: string;
  status: ArtifactStatus;
  qualityStatus: QualityStatus;
  sourceModule?: SourceModule;
  autoLinked: boolean;
  validationStatus: ValidationStatus;
  requiresSignature: boolean;
  signatureComplete: boolean;
}

// ----------------------------------------------------------------------------
// Full Entity Types (extends Summary with operational fields)
// ----------------------------------------------------------------------------

/**
 * Full TMF Study entity with all operational fields
 * Use TMFStudySummary for display/list contexts
 */
export interface TMFStudy extends TMFStudySummary {
  referenceModelVersion: string;
  countryList: string[];
  siteList: string[];
  lastMilestoneDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Full TMF Artifact entity with all operational fields
 * Use TMFArtifactSummary for display/list contexts
 */
export interface TMFArtifact extends TMFArtifactSummary {
  fileSize: number;
  description?: string;
  sourceRecordId?: string;
  validationErrors: ValidationError[];
  lastValidated: string;
  signatures: ArtifactSignature[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  auditTrail: AuditEntry[];
}

export interface ValidationError {
  id: string;
  message: string;
  severity: FindingSeverity;
  detectedAt: string;
}

export interface ArtifactSignature {
  id: string;
  role: string;
  signerName: string;
  signerId: string;
  signedAt?: string;
  status: SignatureStatus;
  comments?: string;
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  performedBy: string;
  performedAt: string;
  details: string;
}

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
  targetLevel: ArtifactLevel;
  isActive: boolean;
  autoFile: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkCondition {
  field: string;
  operator: LinkOperator;
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
  status: AutoLinkEventStatus;
  artifactId?: string;
  errorMessage?: string;
  eventTime: string;
  processedAt?: string;
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
  level: ArtifactLevel;
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
  severity: FindingSeverity;
  description: string;
  detectedAt: string;
}

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

export interface InspectionFinding {
  id: string;
  category: FindingCategory;
  findingType: string;
  severity: FindingSeverity;
  description: string;
  affectedArtifacts: string[];
  suggestedRemediation: string;
  estimatedRemediationHours: number;
  assignedTo?: string;
  dueDate?: string;
  status: FindingStatus;
}

export interface PrioritizedAction {
  id: string;
  priority: number;
  action: string;
  category: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  estimatedHours: number;
  assignedTo?: string;
  dueDate?: string;
}

export interface InspectionReadinessAssessment {
  id: string;
  studyId: string;
  assessmentDate: string;
  assessedBy: string;
  readinessLevel: ReadinessLevel;
  overallScore: number;
  estimatedPrepTime: number;
  criticalFindings: InspectionFinding[];
  majorFindings: InspectionFinding[];
  minorFindings: InspectionFinding[];
  prioritizedActions: PrioritizedAction[];
  trendDirection: TrendDirection;
}

export interface ZoneSummary {
  zone: TMFZone;
  zoneName: string;
  completeness: number;
  filed: number;
  expected: number;
  trend: TrendDirection;
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
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  createdAt: string;
}

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

// =============================================================================
// CONSTANTS
// =============================================================================

export const TMF_ZONE_DEFINITIONS: Record<TMFZone, TMFZoneDefinition> = {
  'zone-01': { zone: 'zone-01', name: 'Trial Management', description: 'Trial oversight and management documentation', isCritical: true },
  'zone-02': { zone: 'zone-02', name: 'Central Trial Documents', description: 'Core trial-level documents', isCritical: true },
  'zone-03': { zone: 'zone-03', name: 'Regulatory', description: 'Regulatory submissions and approvals', isCritical: true },
  'zone-04': { zone: 'zone-04', name: 'IRB/IEC', description: 'Ethics committee documentation', isCritical: true },
  'zone-05': { zone: 'zone-05', name: 'Site Management', description: 'Site-level management documents', isCritical: false },
  'zone-06': { zone: 'zone-06', name: 'IP and Trial Supplies', description: 'Investigational product management', isCritical: true },
  'zone-07': { zone: 'zone-07', name: 'Safety Reporting', description: 'Safety reports and notifications', isCritical: true },
  'zone-08': { zone: 'zone-08', name: 'Central and Local Testing', description: 'Laboratory documentation', isCritical: false },
  'zone-09': { zone: 'zone-09', name: 'Third Parties', description: 'Vendor and CRO documentation', isCritical: false },
  'zone-10': { zone: 'zone-10', name: 'Data Management', description: 'Data management and statistics', isCritical: true },
};

export const ZONE_LABELS: Record<TMFZone, string> = {
  'zone-01': 'Zone 01 - Trial Management',
  'zone-02': 'Zone 02 - Central Trial Documents',
  'zone-03': 'Zone 03 - Regulatory',
  'zone-04': 'Zone 04 - IRB/IEC',
  'zone-05': 'Zone 05 - Site Management',
  'zone-06': 'Zone 06 - IP and Trial Supplies',
  'zone-07': 'Zone 07 - Safety Reporting',
  'zone-08': 'Zone 08 - Central and Local Testing',
  'zone-09': 'Zone 09 - Third Parties',
  'zone-10': 'Zone 10 - Data Management',
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  'draft': 'Draft',
  'pending-review': 'Pending Review',
  'approved': 'Approved',
  'filed': 'Filed',
  'superseded': 'Superseded',
  'archived': 'Archived',
};

export const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  'not-reviewed': 'Not Reviewed',
  'qc-pending': 'QC Pending',
  'qc-passed': 'QC Passed',
  'qc-failed': 'QC Failed',
};

export const READINESS_LEVEL_LABELS: Record<ReadinessLevel, string> = {
  'inspection-ready': 'Inspection Ready',
  'minor-gaps': 'Minor Gaps',
  'significant-gaps': 'Significant Gaps',
  'not-ready': 'Not Ready',
};

export const MILESTONE_LABELS: Record<StudyMilestone, string> = {
  'study-start-up': 'Study Start-up',
  'first-site-initiated': 'First Site Initiated',
  'first-subject-enrolled': 'First Subject Enrolled',
  'enrollment-complete': 'Enrollment Complete',
  'last-subject-last-visit': 'Last Subject Last Visit',
  'database-lock': 'Database Lock',
  'study-close-out': 'Study Close-out',
  'any': 'Any Milestone',
};

export const SOURCE_MODULE_LABELS: Record<SourceModule, string> = {
  'ctms': 'CTMS',
  'edc': 'EDC',
  'safety': 'Safety',
  'submissions': 'Submissions',
  'authoring': 'Authoring',
  'publishing': 'Publishing',
  'cmc': 'CMC',
  'manual': 'Manual',
};

export const ARTIFACT_STATUS_COLORS: Record<ArtifactStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'pending-review': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-blue-100 text-blue-800',
  'filed': 'bg-green-100 text-green-800',
  'superseded': 'bg-orange-100 text-orange-800',
  'archived': 'bg-gray-200 text-gray-600',
};

export const QUALITY_STATUS_COLORS: Record<QualityStatus, string> = {
  'not-reviewed': 'bg-gray-100 text-gray-800',
  'qc-pending': 'bg-yellow-100 text-yellow-800',
  'qc-passed': 'bg-green-100 text-green-800',
  'qc-failed': 'bg-red-100 text-red-800',
};

export const READINESS_LEVEL_COLORS: Record<ReadinessLevel, string> = {
  'inspection-ready': 'bg-green-100 text-green-800',
  'minor-gaps': 'bg-yellow-100 text-yellow-800',
  'significant-gaps': 'bg-orange-100 text-orange-800',
  'not-ready': 'bg-red-100 text-red-800',
};

export const FINDING_SEVERITY_COLORS: Record<FindingSeverity, string> = {
  'critical': 'bg-red-100 text-red-800',
  'major': 'bg-orange-100 text-orange-800',
  'minor': 'bg-yellow-100 text-yellow-800',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  'critical': 'bg-red-100 text-red-800',
  'warning': 'bg-yellow-100 text-yellow-800',
  'info': 'bg-blue-100 text-blue-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

const ZONES: TMFZone[] = [
  'zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05',
  'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'
];

const ARTIFACT_STATUSES: ArtifactStatus[] = [
  'draft', 'pending-review', 'approved', 'filed', 'superseded', 'archived'
];

const QUALITY_STATUSES: QualityStatus[] = [
  'not-reviewed', 'qc-pending', 'qc-passed', 'qc-failed'
];

const READINESS_LEVELS: ReadinessLevel[] = [
  'inspection-ready', 'minor-gaps', 'significant-gaps', 'not-ready'
];

const FINDING_SEVERITIES: FindingSeverity[] = ['critical', 'major', 'minor'];

export function isTMFZone(value: string): value is TMFZone {
  return ZONES.includes(value as TMFZone);
}

export function isArtifactStatus(value: string): value is ArtifactStatus {
  return ARTIFACT_STATUSES.includes(value as ArtifactStatus);
}

export function isQualityStatus(value: string): value is QualityStatus {
  return QUALITY_STATUSES.includes(value as QualityStatus);
}

export function isReadinessLevel(value: string): value is ReadinessLevel {
  return READINESS_LEVELS.includes(value as ReadinessLevel);
}

export function isFindingSeverity(value: string): value is FindingSeverity {
  return FINDING_SEVERITIES.includes(value as FindingSeverity);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if zone is critical for inspection
 */
export function isZoneCritical(zone: TMFZone): boolean {
  return TMF_ZONE_DEFINITIONS[zone].isCritical;
}

/**
 * Get zone name from zone ID
 */
export function getZoneName(zone: TMFZone): string {
  return TMF_ZONE_DEFINITIONS[zone].name;
}

/**
 * Check if artifact is filed and complete
 */
export function isArtifactComplete(status: ArtifactStatus, qualityStatus: QualityStatus): boolean {
  return status === 'filed' && qualityStatus === 'qc-passed';
}

/**
 * Check if artifact requires attention
 */
export function artifactRequiresAttention(
  status: ArtifactStatus, 
  qualityStatus: QualityStatus,
  validationStatus: ValidationStatus
): boolean {
  if (status === 'draft' || status === 'pending-review') return true;
  if (qualityStatus === 'qc-failed') return true;
  if (validationStatus === 'invalid') return true;
  return false;
}

/**
 * Calculate completeness percentage
 */
export function calculateCompleteness(filed: number, expected: number): number {
  if (expected <= 0) return 100;
  return Math.round((filed / expected) * 100);
}

/**
 * Calculate weighted completeness score
 */
export function calculateWeightedCompleteness(
  zoneScores: ZoneCompletenessScore[]
): number {
  const criticalZones = zoneScores.filter(z => isZoneCritical(z.zone));
  const nonCriticalZones = zoneScores.filter(z => !isZoneCritical(z.zone));
  
  const criticalTotal = criticalZones.reduce((sum, z) => sum + z.score, 0);
  const criticalWeight = criticalZones.length > 0 ? criticalTotal / criticalZones.length : 100;
  
  const nonCriticalTotal = nonCriticalZones.reduce((sum, z) => sum + z.score, 0);
  const nonCriticalWeight = nonCriticalZones.length > 0 ? nonCriticalTotal / nonCriticalZones.length : 100;
  
  // Critical zones weighted 70%, non-critical 30%
  return Math.round(criticalWeight * 0.7 + nonCriticalWeight * 0.3);
}

/**
 * Determine inspection readiness level from score
 */
export function getReadinessLevelFromScore(score: number): ReadinessLevel {
  if (score >= 95) return 'inspection-ready';
  if (score >= 85) return 'minor-gaps';
  if (score >= 70) return 'significant-gaps';
  return 'not-ready';
}

/**
 * Count findings by severity
 */
export function countFindingsBySeverity(
  findings: InspectionFinding[]
): { critical: number; major: number; minor: number } {
  return {
    critical: findings.filter(f => f.severity === 'critical').length,
    major: findings.filter(f => f.severity === 'major').length,
    minor: findings.filter(f => f.severity === 'minor').length,
  };
}

/**
 * Calculate estimated prep time from findings
 */
export function calculateEstimatedPrepTime(findings: InspectionFinding[]): number {
  return findings.reduce((total, f) => total + f.estimatedRemediationHours, 0);
}

/**
 * Get milestone order for comparison
 */
export function getMilestoneOrder(milestone: StudyMilestone): number {
  const order: Record<StudyMilestone, number> = {
    'study-start-up': 1,
    'first-site-initiated': 2,
    'first-subject-enrolled': 3,
    'enrollment-complete': 4,
    'last-subject-last-visit': 5,
    'database-lock': 6,
    'study-close-out': 7,
    'any': 0,
  };
  return order[milestone];
}

/**
 * Check if artifact is expected by current milestone
 */
export function isArtifactExpected(
  artifactMilestone: StudyMilestone,
  currentMilestone: StudyMilestone
): boolean {
  if (artifactMilestone === 'any') return true;
  return getMilestoneOrder(artifactMilestone) <= getMilestoneOrder(currentMilestone);
}

/**
 * Format zone score for display
 */
export function formatZoneScore(score: ZoneCompletenessScore): string {
  return `${score.filed}/${score.expected} (${score.score}%)`;
}
