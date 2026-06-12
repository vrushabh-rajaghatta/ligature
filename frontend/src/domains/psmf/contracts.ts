
/**
 * PSMF Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Pharmacovigilance System Master File types.
 * 
 * Implements EU GVP Module II requirements for PSMF documentation:
 * - Part A: QPPV and organizational structure
 * - Part B: Computerized systems and databases
 * - Part C: Pharmacovigilance processes and SOPs
 * - Part D: Audits and inspections
 * - Part E: Contractual arrangements (service providers)
 * - Part F: Authorized products list
 * - Part G: PSMF document management
 * - Part H: Compliance metrics
 * 
 * @module domains/psmf/contracts
 * @version 0.27.41
 */

// =============================================================================
// PART A: QPPV & ORGANIZATIONAL STRUCTURE
// =============================================================================

export type QPPVStatus = 'active' | 'temporary' | 'pending-appointment' | 'departed';
export type QPPVType = 'primary' | 'deputy' | 'backup';

/**
 * Qualified Person Responsible for Pharmacovigilance
 * Required per EU GVP Module I
 */
export interface QPPV {
  id: string;
  type: QPPVType;
  status: QPPVStatus;
  
  // Personal details
  firstName: string;
  lastName: string;
  title: string; // Dr., Prof., etc.
  qualifications: string[]; // MD, PharmD, PhD, etc.
  
  // Contact information
  email: string;
  phone: string;
  mobilePhone: string | null;
  availabilityHours: string; // e.g., "24/7" or "Mon-Fri 08:00-18:00 CET"
  
  // Location
  address: string;
  city: string;
  country: string;
  postalCode: string;
  euResident: boolean;
  
  // Employment
  organization: string;
  department: string;
  employmentType: 'employee' | 'contractor' | 'consultant';
  contractReference: string | null;
  
  // Appointment
  appointmentDate: string;
  lastTrainingDate: string | null;
  cvDocumentId: string | null;
  trainingRecordIds: string[];
  
  // Responsibilities
  responsibleRegions: string[];
  responsibleProducts: string[];
  delegatedActivities: DelegatedActivity[];
  
  createdAt: string;
  updatedAt: string;
}

export interface DelegatedActivity {
  id: string;
  activity: string;
  delegatedTo: string;
  delegatedToOrg: string;
  effectiveDate: string;
  documentReference: string | null;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
  type: 'division' | 'department' | 'team' | 'external';
  parentId: string | null;
  
  // Leadership
  headName: string;
  headTitle: string;
  headEmail: string;
  
  // PV responsibilities
  pvResponsibilities: string[];
  headcount: number;
  ftePV: number; // Full-time equivalent dedicated to PV
  
  // Location
  location: string;
  country: string;
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART B: COMPUTERIZED SYSTEMS
// =============================================================================

export type SystemCategory = 
  | 'safety-database'
  | 'signal-detection'
  | 'aggregate-reporting'
  | 'literature-monitoring'
  | 'medical-information'
  | 'document-management'
  | 'training-management'
  | 'quality-management'
  | 'regulatory-intelligence'
  | 'other';

export type SystemStatus = 'operational' | 'validation-in-progress' | 'decommissioned' | 'planned';
export type ValidationStatus = 'validated' | 'pending-validation' | 'revalidation-required' | 'not-applicable';
export type HostingType = 'on-premise' | 'cloud-hosted' | 'hybrid' | 'saas';

export interface ComputerizedSystem {
  id: string;
  name: string;
  vendor: string;
  version: string;
  category: SystemCategory;
  description: string;
  
  // Status
  status: SystemStatus;
  goLiveDate: string | null;
  decommissionDate: string | null;
  
  // Validation
  validationStatus: ValidationStatus;
  validationDate: string | null;
  validationDocumentId: string | null;
  nextRevalidationDate: string | null;
  gxpRelevant: boolean;
  part11Compliant: boolean;
  annex11Compliant: boolean;
  
  // Technical details
  hostingType: HostingType;
  hostingLocation: string | null;
  dataCenter: string | null;
  backupFrequency: string | null;
  disasterRecoveryRTO: string | null; // Recovery Time Objective
  disasterRecoveryRPO: string | null; // Recovery Point Objective
  
  // Integration
  integratedSystems: string[]; // IDs of other systems
  dataFlowDescription: string | null;
  
  // Access & security
  accessControlMethod: string;
  auditTrailEnabled: boolean;
  electronicSignatureEnabled: boolean;
  
  // Support
  supportProvider: string;
  supportContractId: string | null;
  supportLevel: 'business-hours' | '24x7' | 'best-effort';
  
  // Related procedures
  sopIds: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface SystemInterface {
  id: string;
  sourceSystemId: string;
  targetSystemId: string;
  interfaceName: string;
  description: string;
  
  // Technical
  interfaceType: 'api' | 'file-transfer' | 'database' | 'manual';
  protocol: string | null;
  frequency: 'real-time' | 'batch-daily' | 'batch-weekly' | 'on-demand' | 'manual';
  
  // Validation
  validationStatus: ValidationStatus;
  validationDocumentId: string | null;
  
  // Data
  dataTypes: string[];
  direction: 'unidirectional' | 'bidirectional';
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART C: PHARMACOVIGILANCE PROCESSES & SOPs
// =============================================================================

export type SOPCategory = 
  | 'icsr-processing'
  | 'signal-detection'
  | 'risk-management'
  | 'periodic-reporting'
  | 'literature-monitoring'
  | 'regulatory-reporting'
  | 'qppv-procedures'
  | 'training'
  | 'audit'
  | 'vendor-management'
  | 'document-control'
  | 'other';

export type SOPStatus = 'draft' | 'review' | 'approved' | 'effective' | 'superseded' | 'retired';

export interface PVProcess {
  id: string;
  name: string;
  category: SOPCategory;
  description: string;
  
  // Process owner
  processOwnerId: string;
  processOwnerName: string;
  
  // Documentation
  sopIds: string[];
  workInstructionIds: string[];
  templateIds: string[];
  
  // Performance
  kpis: ProcessKPI[];
  targetCompletionTime: string | null;
  
  // Compliance
  regulatoryReferences: string[];
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProcessKPI {
  id: string;
  name: string;
  description: string;
  targetValue: string;
  currentValue: string | null;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastMeasuredDate: string | null;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
}

export interface SOP {
  id: string;
  documentNumber: string;
  title: string;
  version: string;
  category: SOPCategory;
  
  // Status
  status: SOPStatus;
  effectiveDate: string | null;
  expirationDate: string | null;
  
  // Ownership
  authorId: string;
  authorName: string;
  approverId: string | null;
  approverName: string | null;
  approvalDate: string | null;
  
  // Review
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  reviewFrequencyMonths: number;
  
  // Content
  scope: string;
  applicability: string[];
  relatedDocuments: string[];
  
  // Training
  trainingRequired: boolean;
  trainingRecordIds: string[];
  
  // Document
  documentId: string | null;
  fileSize: number | null;
  pageCount: number | null;
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART D: AUDITS & INSPECTIONS
// =============================================================================

export type AuditType = 'internal' | 'external' | 'regulatory-inspection' | 'vendor-audit';
export type AuditStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';
export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';
export type FindingStatus = 'open' | 'in-progress' | 'closed' | 'verified';

export interface PVAudit {
  id: string;
  auditNumber: string;
  type: AuditType;
  title: string;
  
  // Scope
  scope: string;
  areasAudited: string[];
  systemsAudited: string[];
  productsAudited: string[];
  
  // Schedule
  status: AuditStatus;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  
  // Participants
  leadAuditor: string;
  auditors: string[];
  auditees: string[];
  
  // Results
  findings: AuditFinding[];
  overallConclusion: string | null;
  reportDocumentId: string | null;
  
  // Follow-up
  nextAuditDate: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  findingNumber: string;
  
  // Classification
  severity: FindingSeverity;
  category: string;
  
  // Description
  title: string;
  description: string;
  evidenceReference: string | null;
  regulatoryReference: string | null;
  
  // Status & CAPA
  status: FindingStatus;
  capaId: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  
  // Timeline
  identifiedDate: string;
  targetClosureDate: string | null;
  actualClosureDate: string | null;
  verificationDate: string | null;
  
  // Responsibility
  responsiblePerson: string;
  responsiblePersonId: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART E: CONTRACTUAL ARRANGEMENTS
// =============================================================================

export type ServiceProviderType = 
  | 'cro'
  | 'case-processing'
  | 'signal-detection'
  | 'medical-writing'
  | 'it-services'
  | 'archiving'
  | 'call-center'
  | 'translation'
  | 'other';

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

export interface ServiceProvider {
  id: string;
  name: string;
  type: ServiceProviderType;
  
  // Contact
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  country: string;
  
  // Services
  servicesProvided: string[];
  productsSupported: string[];
  
  // Contract
  contractStatus: ContractStatus;
  contractReference: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  
  // Qualification
  qualificationStatus: 'qualified' | 'pending' | 'requires-requalification';
  qualificationDate: string | null;
  lastAuditDate: string | null;
  nextAuditDate: string | null;
  
  // SDEA (Safety Data Exchange Agreement)
  sdeaRequired: boolean;
  sdeaReference: string | null;
  sdeaEffectiveDate: string | null;
  
  // Documents
  documentIds: string[];
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART F: AUTHORIZED PRODUCTS
// =============================================================================

export interface AuthorizedProduct {
  id: string;
  productId: string; // Link to main product
  productName: string;
  activeSubstance: string;
  
  // Authorization
  maaNumber: string;
  authorizationType: 'centralized' | 'decentralized' | 'mutual-recognition' | 'national';
  authorizationDate: string;
  authorizationCountries: string[];
  
  // PSMF coverage
  includedInPSMF: boolean;
  psmfCoverageDate: string | null;
  
  // RMP
  rmpRequired: boolean;
  rmpVersion: string | null;
  rmpLastUpdateDate: string | null;
  
  // Periodic reporting
  psurDueDate: string | null;
  psurFrequencyMonths: number | null;
  dbirRequired: boolean;
  
  // Status
  marketingStatus: 'marketed' | 'not-yet-marketed' | 'withdrawn' | 'suspended';
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PART G: PSMF DOCUMENT MANAGEMENT
// =============================================================================

export type PSMFSection = 
  | 'cover-page'
  | 'qppv-details'
  | 'organizational-structure'
  | 'sources-of-data'
  | 'computerized-systems'
  | 'processes'
  | 'performance-indicators'
  | 'quality-system'
  | 'audits-inspections'
  | 'contractual-arrangements'
  | 'authorized-products'
  | 'annexes';

export type PSMFDocumentStatus = 'draft' | 'review' | 'approved' | 'effective' | 'archived';

export interface PSMFDocument {
  id: string;
  version: string;
  status: PSMFDocumentStatus;
  
  // Content
  sections: PSMFSectionContent[];
  
  // Lifecycle
  createdDate: string;
  lastModifiedDate: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  
  // Approval
  authorId: string;
  authorName: string;
  approverId: string | null;
  approverName: string | null;
  approvalDate: string | null;
  qppvSignoffDate: string | null;
  
  // Regulatory
  lastInspectionDate: string | null;
  inspectionFindings: string[];
  
  // Review
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface PSMFSectionContent {
  section: PSMFSection;
  title: string;
  lastUpdated: string;
  updatedBy: string;
  status: 'current' | 'needs-update' | 'under-review';
  documentIds: string[];
  notes: string | null;
}

// =============================================================================
// PART H: COMPLIANCE METRICS
// =============================================================================

export interface PSMFComplianceMetrics {
  // QPPV
  qppvInPlace: boolean;
  qppvTrainingCurrent: boolean;
  deputyQPPVAvailable: boolean;
  
  // Systems
  totalSystems: number;
  validatedSystems: number;
  systemsRequiringRevalidation: number;
  
  // SOPs
  totalSOPs: number;
  effectiveSOPs: number;
  sopsRequiringReview: number;
  overdueSOPs: number;
  
  // Audits
  totalAudits: number;
  completedAudits: number;
  openFindings: number;
  criticalFindings: number;
  overdueFindings: number;
  
  // Service providers
  totalProviders: number;
  qualifiedProviders: number;
  providersRequiringRequalification: number;
  activeSdeas: number;
  
  // Products
  totalProducts: number;
  productsCovered: number;
  
  // Overall
  overallComplianceScore: number; // 0-100
  lastCalculated: string;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type PSMFView = 
  | 'dashboard'
  | 'qppv'
  | 'organization'
  | 'systems'
  | 'processes'
  | 'audits'
  | 'providers'
  | 'products'
  | 'document';

export interface PSMFFilters {
  searchQuery: string;
  sopStatus: SOPStatus | 'all';
  sopCategory: SOPCategory | 'all';
  systemStatus: SystemStatus | 'all';
  systemCategory: SystemCategory | 'all';
  auditStatus: AuditStatus | 'all';
  findingStatus: FindingStatus | 'all';
  findingSeverity: FindingSeverity | 'all';
  providerType: ServiceProviderType | 'all';
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PSMF_VIEW_LABELS: Record<PSMFView, string> = {
  'dashboard': 'Dashboard',
  'qppv': 'QPPV',
  'organization': 'Organization',
  'systems': 'Systems',
  'processes': 'Processes & SOPs',
  'audits': 'Audits',
  'providers': 'Service Providers',
  'products': 'Products',
  'document': 'PSMF Document',
};

export const PSMF_SECTION_LABELS: Record<PSMFSection, string> = {
  'cover-page': 'Cover Page',
  'qppv-details': 'QPPV Details',
  'organizational-structure': 'Organizational Structure',
  'sources-of-data': 'Sources of Safety Data',
  'computerized-systems': 'Computerized Systems',
  'processes': 'PV Processes',
  'performance-indicators': 'Performance Indicators',
  'quality-system': 'Quality System',
  'audits-inspections': 'Audits & Inspections',
  'contractual-arrangements': 'Contractual Arrangements',
  'authorized-products': 'Authorized Products',
  'annexes': 'Annexes',
};

export const QPPV_STATUS_LABELS: Record<QPPVStatus, string> = {
  'active': 'Active',
  'temporary': 'Temporary',
  'pending-appointment': 'Pending Appointment',
  'departed': 'Departed',
};

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategory, string> = {
  'safety-database': 'Safety Database',
  'signal-detection': 'Signal Detection',
  'aggregate-reporting': 'Aggregate Reporting',
  'literature-monitoring': 'Literature Monitoring',
  'medical-information': 'Medical Information',
  'document-management': 'Document Management',
  'training-management': 'Training Management',
  'quality-management': 'Quality Management',
  'regulatory-intelligence': 'Regulatory Intelligence',
  'other': 'Other',
};

export const SOP_CATEGORY_LABELS: Record<SOPCategory, string> = {
  'icsr-processing': 'ICSR Processing',
  'signal-detection': 'Signal Detection',
  'risk-management': 'Risk Management',
  'periodic-reporting': 'Periodic Reporting',
  'literature-monitoring': 'Literature Monitoring',
  'regulatory-reporting': 'Regulatory Reporting',
  'qppv-procedures': 'QPPV Procedures',
  'training': 'Training',
  'audit': 'Audit',
  'vendor-management': 'Vendor Management',
  'document-control': 'Document Control',
  'other': 'Other',
};

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  'critical': 'Critical',
  'major': 'Major',
  'minor': 'Minor',
  'observation': 'Observation',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isQPPVActive(qppv: QPPV): boolean {
  return qppv.status === 'active' || qppv.status === 'temporary';
}

export function isPrimaryQPPV(qppv: QPPV): boolean {
  return qppv.type === 'primary' && isQPPVActive(qppv);
}

export function isSystemValidated(system: ComputerizedSystem): boolean {
  return system.validationStatus === 'validated';
}

export function isSystemOperational(system: ComputerizedSystem): boolean {
  return system.status === 'operational';
}

export function isSOPEffective(sop: SOP): boolean {
  return sop.status === 'effective';
}

export function isSOPOverdueForReview(sop: SOP): boolean {
  if (!sop.nextReviewDate) return false;
  return new Date(sop.nextReviewDate) < new Date();
}

export function isFindingOpen(finding: AuditFinding): boolean {
  return finding.status === 'open' || finding.status === 'in-progress';
}

export function isFindingCritical(finding: AuditFinding): boolean {
  return finding.severity === 'critical';
}

export function isFindingOverdue(finding: AuditFinding): boolean {
  if (!finding.targetClosureDate || finding.status === 'closed' || finding.status === 'verified') {
    return false;
  }
  return new Date(finding.targetClosureDate) < new Date();
}

export function isProviderQualified(provider: ServiceProvider): boolean {
  return provider.qualificationStatus === 'qualified';
}

export function isProviderContractActive(provider: ServiceProvider): boolean {
  return provider.contractStatus === 'active';
}

export function calculateComplianceScore(metrics: PSMFComplianceMetrics): number {
  let score = 0;
  let weight = 0;
  
  // QPPV (25 points)
  if (metrics.qppvInPlace) { score += 15; }
  if (metrics.qppvTrainingCurrent) { score += 5; }
  if (metrics.deputyQPPVAvailable) { score += 5; }
  weight += 25;
  
  // Systems (20 points)
  if (metrics.totalSystems > 0) {
    score += (metrics.validatedSystems / metrics.totalSystems) * 20;
  }
  weight += 20;
  
  // SOPs (20 points)
  if (metrics.totalSOPs > 0) {
    const effectiveRatio = metrics.effectiveSOPs / metrics.totalSOPs;
    score += effectiveRatio * 15;
    if (metrics.overdueSOPs === 0) { score += 5; }
  }
  weight += 20;
  
  // Audits (15 points)
  if (metrics.criticalFindings === 0) { score += 10; }
  if (metrics.overdueFindings === 0) { score += 5; }
  weight += 15;
  
  // Providers (10 points)
  if (metrics.totalProviders > 0) {
    score += (metrics.qualifiedProviders / metrics.totalProviders) * 10;
  }
  weight += 10;
  
  // Products (10 points)
  if (metrics.totalProducts > 0) {
    score += (metrics.productsCovered / metrics.totalProducts) * 10;
  }
  weight += 10;
  
  return Math.round((score / weight) * 100);
}
