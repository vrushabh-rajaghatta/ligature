
/**
 * GLP Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Good Laboratory Practice types.
 * 
 * Implements 21 CFR Part 58 compliance for nonclinical studies:
 * - Subpart B: Organization and Personnel
 * - Subpart C: Facilities
 * - Subpart D: Equipment
 * - Subpart E: Testing Facilities Operation
 * - Subpart G: Protocol for and Conduct of a Study
 * - Subpart J: Records and Reports (Archives)
 * 
 * @module domains/glp/contracts
 * @version 0.27.42
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

export type GLPStudyStatus = 
  | 'planned'
  | 'protocol-draft'
  | 'protocol-approved'
  | 'in-progress'
  | 'in-life-complete'
  | 'analysis'
  | 'report-draft'
  | 'report-qc'
  | 'report-signed'
  | 'archived'
  | 'terminated';

export type GLPStudyType =
  | 'acute-toxicity'
  | 'subacute-toxicity'
  | 'subchronic-toxicity'
  | 'chronic-toxicity'
  | 'carcinogenicity'
  | 'reproductive-toxicity'
  | 'developmental-toxicity'
  | 'genotoxicity'
  | 'safety-pharmacology'
  | 'pharmacokinetics'
  | 'toxicokinetics'
  | 'local-tolerance'
  | 'immunotoxicity'
  | 'phototoxicity'
  | 'other';

export type DeviationSeverity = 'critical' | 'major' | 'minor';
export type DeviationStatus = 'open' | 'under-investigation' | 'corrected' | 'closed';
export type DeviationType = 
  | 'protocol'
  | 'sop'
  | 'equipment'
  | 'documentation'
  | 'environmental'
  | 'specimen-handling'
  | 'data-integrity'
  | 'personnel'
  | 'other';

export type AuditType = 'study' | 'facility' | 'process' | 'computer-system' | 'regulatory';
export type AuditStatus = 'scheduled' | 'in-progress' | 'pending-response' | 'closed';
export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';

export type PersonnelRole = 
  | 'study-director'
  | 'principal-investigator'
  | 'qa-unit'
  | 'archivist'
  | 'test-facility-management'
  | 'study-personnel'
  | 'sponsor-representative';

export type TrainingStatus = 'current' | 'expiring-soon' | 'expired' | 'not-required';
export type ArchiveStatus = 'pending' | 'archived' | 'retrieved' | 'destroyed';
export type SpeciesType = 'rat' | 'mouse' | 'rabbit' | 'dog' | 'primate' | 'guinea-pig' | 'minipig' | 'other';

// =============================================================================
// STUDY MANAGEMENT (Subpart G)
// =============================================================================

export interface GLPStudy {
  id: string;
  studyNumber: string;
  title: string;
  status: GLPStudyStatus;
  studyType: GLPStudyType;
  
  // Regulatory context
  regulatorySubmissionType: 'IND' | 'NDA' | 'BLA' | 'ANDA' | 'other';
  sponsorProtocolNumber: string | null;
  testArticleName: string;
  testArticleId: string | null;
  
  // Key personnel
  studyDirectorId: string;
  studyDirectorName: string;
  principalInvestigatorIds: string[];
  sponsorContactId: string | null;
  
  // Test system
  species: SpeciesType;
  strain: string | null;
  animalCount: number | null;
  testSystem: string;
  
  // Facility
  testFacilityId: string;
  testFacilityName: string;
  
  // Dates
  protocolApprovalDate: string | null;
  inLifeStartDate: string | null;
  inLifeEndDate: string | null;
  necropsy: string | null;
  draftReportDate: string | null;
  finalReportDate: string | null;
  archiveDate: string | null;
  
  // Compliance
  glpCompliant: boolean;
  glpDeviations: string[];
  qaAudits: string[];
  amendments: GLPProtocolAmendment[];
  
  // Documents
  protocolDocumentId: string | null;
  finalReportDocumentId: string | null;
  rawDataArchiveId: string | null;
  
  // Linkage
  linkedNonclinicalStudyId: string | null;
  linkedProductId: string | null;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface GLPProtocolAmendment {
  id: string;
  studyId: string;
  amendmentNumber: number;
  title: string;
  description: string;
  reason: string;
  
  effectiveDate: string;
  approvedBy: string;
  approvedDate: string;
  
  documentId: string | null;
  impactsStudyConduct: boolean;
  impactDescription: string | null;
  
  createdAt: string;
}

// =============================================================================
// PROTOCOL DEVIATIONS
// =============================================================================

export interface GLPDeviation {
  id: string;
  deviationNumber: string;
  studyId: string;
  studyNumber: string;
  
  type: DeviationType;
  severity: DeviationSeverity;
  status: DeviationStatus;
  
  // Description
  title: string;
  description: string;
  dateOccurred: string;
  dateDiscovered: string;
  discoveredBy: string;
  
  // Impact assessment
  impactOnStudy: string;
  impactOnDataIntegrity: boolean;
  affectedAnimals: string | null;
  affectedTimepoints: string | null;
  
  // Root cause
  rootCauseAnalysis: string | null;
  rootCauseCategory: string | null;
  
  // Corrective action
  immediateAction: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  capaId: string | null;
  
  // Review & approval
  studyDirectorReview: string | null;
  studyDirectorReviewDate: string | null;
  qaReview: string | null;
  qaReviewDate: string | null;
  sponsorNotified: boolean;
  sponsorNotificationDate: string | null;
  
  // Closure
  closureDate: string | null;
  closedBy: string | null;
  closureNotes: string | null;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// =============================================================================
// QA AUDITS (Subpart B)
// =============================================================================

export interface GLPAudit {
  id: string;
  auditNumber: string;
  auditType: AuditType;
  status: AuditStatus;
  
  // Scope
  title: string;
  scope: string;
  studyIds: string[];
  facilityId: string | null;
  processArea: string | null;
  
  // Schedule
  scheduledDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  
  // Auditor(s)
  leadAuditorId: string;
  leadAuditorName: string;
  auditTeam: string[];
  
  // Findings
  findings: GLPAuditFinding[];
  totalFindings: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  observations: number;
  
  // Report
  reportDate: string | null;
  reportDocumentId: string | null;
  
  // Response & closure
  responseDeadline: string | null;
  responseDateReceived: string | null;
  closureDate: string | null;
  closedBy: string | null;
  
  // For regulatory audits
  regulatoryAgency: string | null;
  inspectionType: string | null;
  form483Issued: boolean;
  warningLetterIssued: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface GLPAuditFinding {
  id: string;
  auditId: string;
  findingNumber: string;
  severity: FindingSeverity;
  status: 'open' | 'responded' | 'verified' | 'closed';
  
  // Finding details
  title: string;
  description: string;
  regulatoryReference: string | null;
  sopReference: string | null;
  
  // Location/context
  studyId: string | null;
  facilityArea: string | null;
  
  // Response
  responseRequired: boolean;
  responseDeadline: string | null;
  response: string | null;
  responseDate: string | null;
  respondedBy: string | null;
  
  // CAPA
  capaRequired: boolean;
  capaId: string | null;
  capaStatus: string | null;
  
  // Verification
  verificationRequired: boolean;
  verificationDate: string | null;
  verifiedBy: string | null;
  verificationNotes: string | null;
  
  closureDate: string | null;
}

// =============================================================================
// PERSONNEL & TRAINING (Subpart B)
// =============================================================================

export interface GLPPersonnel {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  
  // Role
  primaryRole: PersonnelRole;
  additionalRoles: PersonnelRole[];
  
  // Qualifications
  education: string;
  degrees: string[];
  certifications: string[];
  yearsExperience: number;
  
  // CV
  cvDocumentId: string | null;
  cvLastUpdated: string | null;
  
  // Job description
  jobDescriptionId: string | null;
  jobDescriptionVersion: string | null;
  
  // Training status
  trainingStatus: TrainingStatus;
  requiredTrainings: GLPTrainingRequirement[];
  completedTrainings: GLPTrainingRecord[];
  
  // Study assignments
  currentStudyAssignments: string[];
  historicalStudyAssignments: string[];
  
  // Status
  active: boolean;
  startDate: string;
  endDate: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface GLPTrainingRequirement {
  id: string;
  trainingName: string;
  trainingType: 'initial' | 'refresher' | 'job-specific' | 'sop';
  sopId: string | null;
  requiredForRoles: PersonnelRole[];
  frequencyMonths: number | null;
  description: string;
  active: boolean;
}

export interface GLPTrainingRecord {
  id: string;
  personnelId: string;
  trainingRequirementId: string;
  trainingName: string;
  
  completionDate: string;
  expirationDate: string | null;
  trainerId: string | null;
  trainerName: string | null;
  trainingMethod: 'classroom' | 'online' | 'on-the-job' | 'self-study' | 'external';
  
  assessmentScore: number | null;
  assessmentPassed: boolean;
  
  certificateId: string | null;
  documentId: string | null;
  
  verifiedBy: string;
  verifiedDate: string;
}

// =============================================================================
// ARCHIVES (Subpart J)
// =============================================================================

export interface GLPArchive {
  id: string;
  archiveNumber: string;
  archiveType: 'raw-data' | 'specimens' | 'protocol' | 'final-report' | 'correspondence' | 'other';
  status: ArchiveStatus;
  
  // Content
  title: string;
  description: string;
  studyId: string | null;
  studyNumber: string | null;
  
  // Physical location
  facilityId: string;
  roomNumber: string;
  shelfLocation: string;
  boxNumber: string | null;
  
  // Environmental requirements
  temperatureControlled: boolean;
  requiredTemperature: string | null;
  humidityControlled: boolean;
  requiredHumidity: string | null;
  lightSensitive: boolean;
  
  // Retention
  archiveDate: string;
  archivedBy: string;
  retentionPeriodYears: number;
  destructionEligibleDate: string;
  
  // Chain of custody
  custodyChain: GLPArchiveCustodyEvent[];
  currentCustodian: string;
  
  // Specimen specific
  specimenType: string | null;
  specimenCount: number | null;
  specimenCondition: string | null;
  
  // Destruction
  destructionDate: string | null;
  destructionApprovedBy: string | null;
  destructionWitnessedBy: string | null;
  destructionMethod: string | null;
  destructionCertificateId: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface GLPArchiveCustodyEvent {
  id: string;
  archiveId: string;
  eventType: 'archived' | 'retrieved' | 'returned' | 'transferred' | 'inspected' | 'destroyed';
  eventDate: string;
  performedBy: string;
  performedByName: string;
  reason: string;
  destination: string | null;
  returnDate: string | null;
  notes: string | null;
}

// =============================================================================
// TEST FACILITY (Subparts C, D, E)
// =============================================================================

export interface GLPTestFacility {
  id: string;
  name: string;
  code: string;
  type: 'internal' | 'cro' | 'contractor';
  
  // Contact
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  
  // Management
  testFacilityManagementId: string;
  testFacilityManagementName: string;
  qaUnitHeadId: string;
  qaUnitHeadName: string;
  archivistId: string;
  archivistName: string;
  
  // Capabilities
  capabilities: GLPStudyType[];
  speciesCapabilities: SpeciesType[];
  animalCapacity: number | null;
  
  // Compliance
  glpCertified: boolean;
  certificationAgency: string | null;
  certificationDate: string | null;
  certificationExpiryDate: string | null;
  lastInspectionDate: string | null;
  lastInspectionResult: 'passed' | 'passed-with-observations' | 'failed' | null;
  
  // Equipment
  equipmentCount: number;
  calibrationCompliance: number;
  
  // Active studies
  activeStudyCount: number;
  
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GLPEquipment {
  id: string;
  equipmentId: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  
  facilityId: string;
  location: string;
  
  // Calibration
  calibrationRequired: boolean;
  calibrationFrequencyDays: number | null;
  lastCalibrationDate: string | null;
  nextCalibrationDue: string | null;
  calibrationStatus: 'current' | 'due-soon' | 'overdue' | 'not-applicable';
  
  // Maintenance
  maintenanceRequired: boolean;
  lastMaintenanceDate: string | null;
  nextMaintenanceDue: string | null;
  
  // Qualification
  iqDate: string | null;
  oqDate: string | null;
  pqDate: string | null;
  qualificationDocumentId: string | null;
  
  // SOP
  operatingSopId: string | null;
  
  // Status
  status: 'operational' | 'under-maintenance' | 'out-of-service' | 'retired';
  
  // History
  calibrationHistory: GLPCalibrationRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface GLPCalibrationRecord {
  id: string;
  equipmentId: string;
  calibrationDate: string;
  calibratedBy: string;
  calibrationType: 'internal' | 'external';
  vendorName: string | null;
  certificateNumber: string | null;
  result: 'passed' | 'failed' | 'adjusted';
  notes: string | null;
  documentId: string | null;
  nextDueDate: string;
}

// =============================================================================
// COMPLIANCE DASHBOARD
// =============================================================================

export interface GLPComplianceMetrics {
  // Study metrics
  totalActiveStudies: number;
  studiesInLife: number;
  studiesInAnalysis: number;
  studiesPendingArchive: number;
  
  // Deviation metrics
  openDeviations: number;
  criticalDeviations: number;
  majorDeviations: number;
  deviationsTrend: 'improving' | 'stable' | 'worsening';
  avgDeviationClosureTime: number;
  
  // Audit metrics
  scheduledAudits: number;
  openAuditFindings: number;
  overdueResponses: number;
  upcomingAudits: GLPAudit[];
  
  // Personnel metrics
  personnelWithExpiredTraining: number;
  personnelWithExpiringTraining: number;
  trainingComplianceRate: number;
  
  // Equipment metrics
  equipmentOutOfCalibration: number;
  equipmentDueSoon: number;
  calibrationComplianceRate: number;
  
  // Archive metrics
  pendingArchives: number;
  retrievedArchives: number;
  upcomingDestructions: number;
  
  // Facility metrics
  facilitiesWithIssues: number;
  overallComplianceScore: number;
  
  lastUpdated: string;
}

export interface GLPActionItem {
  id: string;
  type: 'deviation' | 'audit-finding' | 'training' | 'calibration' | 'archive' | 'study-milestone';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  assignedToName: string;
  relatedStudyId: string | null;
  relatedStudyNumber: string | null;
  sourceId: string;
  status: 'pending' | 'in-progress' | 'overdue' | 'completed';
  createdAt: string;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type GLPTab = 
  | 'dashboard'
  | 'studies'
  | 'deviations'
  | 'audits'
  | 'personnel'
  | 'archives'
  | 'facilities';

// =============================================================================
// CONSTANTS
// =============================================================================

export const GLP_STUDY_STATUS_LABELS: Record<GLPStudyStatus, string> = {
  'planned': 'Planned',
  'protocol-draft': 'Protocol Draft',
  'protocol-approved': 'Protocol Approved',
  'in-progress': 'In Progress',
  'in-life-complete': 'In-Life Complete',
  'analysis': 'Analysis',
  'report-draft': 'Report Draft',
  'report-qc': 'Report QC',
  'report-signed': 'Report Signed',
  'archived': 'Archived',
  'terminated': 'Terminated',
};

export const GLP_STUDY_TYPE_LABELS: Record<GLPStudyType, string> = {
  'acute-toxicity': 'Acute Toxicity',
  'subacute-toxicity': 'Subacute Toxicity',
  'subchronic-toxicity': 'Subchronic Toxicity',
  'chronic-toxicity': 'Chronic Toxicity',
  'carcinogenicity': 'Carcinogenicity',
  'reproductive-toxicity': 'Reproductive Toxicity',
  'developmental-toxicity': 'Developmental Toxicity',
  'genotoxicity': 'Genotoxicity',
  'safety-pharmacology': 'Safety Pharmacology',
  'pharmacokinetics': 'Pharmacokinetics',
  'toxicokinetics': 'Toxicokinetics',
  'local-tolerance': 'Local Tolerance',
  'immunotoxicity': 'Immunotoxicity',
  'phototoxicity': 'Phototoxicity',
  'other': 'Other',
};

export const DEVIATION_SEVERITY_LABELS: Record<DeviationSeverity, string> = {
  'critical': 'Critical',
  'major': 'Major',
  'minor': 'Minor',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isStudyActive(status: GLPStudyStatus): boolean {
  return ['protocol-approved', 'in-progress', 'in-life-complete', 'analysis'].includes(status);
}

export function isStudyComplete(status: GLPStudyStatus): boolean {
  return ['report-signed', 'archived'].includes(status);
}

export function isDeviationOpen(status: DeviationStatus): boolean {
  return status === 'open' || status === 'under-investigation';
}

export function isAuditOpen(status: AuditStatus): boolean {
  return status !== 'closed';
}

export function isTrainingCurrent(status: TrainingStatus): boolean {
  return status === 'current';
}

export function isEquipmentCompliant(equipment: GLPEquipment): boolean {
  return equipment.calibrationStatus === 'current' || equipment.calibrationStatus === 'not-applicable';
}

export function calculateComplianceScore(metrics: GLPComplianceMetrics): number {
  let score = 100;
  
  // Deviations impact
  score -= metrics.criticalDeviations * 10;
  score -= metrics.majorDeviations * 5;
  
  // Training compliance
  score -= metrics.personnelWithExpiredTraining * 3;
  
  // Equipment compliance
  score -= metrics.equipmentOutOfCalibration * 5;
  
  // Audit findings
  score -= metrics.overdueResponses * 5;
  
  return Math.max(0, Math.min(100, score));
}
