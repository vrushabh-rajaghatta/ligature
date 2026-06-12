
/**
 * Clinical Site Types
 * Site and investigator management types
 * @version 0.20.0
 */

// ============================================================================
// Site Status
// ============================================================================

export type SiteStatus = 
  | 'IDENTIFIED' 
  | 'SELECTED' 
  | 'IN_STARTUP' 
  | 'ACTIVE' 
  | 'ENROLLING' 
  | 'CLOSED' 
  | 'TERMINATED';

export const SITE_STATUSES: SiteStatus[] = [
  'IDENTIFIED',
  'SELECTED',
  'IN_STARTUP',
  'ACTIVE',
  'ENROLLING',
  'CLOSED',
  'TERMINATED',
];

export const SITE_STATUS_TRANSITIONS: Record<SiteStatus, SiteStatus[]> = {
  IDENTIFIED: ['SELECTED', 'TERMINATED'],
  SELECTED: ['IN_STARTUP', 'TERMINATED'],
  IN_STARTUP: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['ENROLLING', 'CLOSED', 'TERMINATED'],
  ENROLLING: ['CLOSED', 'TERMINATED'],
  CLOSED: [],
  TERMINATED: [],
};

// ============================================================================
// Contract Status
// ============================================================================

export type ContractStatus = 
  | 'NOT_STARTED' 
  | 'IN_NEGOTIATION' 
  | 'LEGAL_REVIEW' 
  | 'EXECUTED' 
  | 'AMENDED';

export const CONTRACT_STATUSES: ContractStatus[] = [
  'NOT_STARTED',
  'IN_NEGOTIATION',
  'LEGAL_REVIEW',
  'EXECUTED',
  'AMENDED',
];

// ============================================================================
// IRB/Ethics Types
// ============================================================================

export type IRBStatus = 'PENDING' | 'APPROVED' | 'CONDITIONAL' | 'EXPIRED' | 'WITHDRAWN';

export interface IRBInfo {
  name: string;
  type: 'CENTRAL' | 'LOCAL' | 'INSTITUTIONAL';
  approvalDate?: Date;
  expirationDate?: Date;
  approvalNumber?: string;
  status: IRBStatus;
  conditions?: string[];
  documentIds: string[];
}

// ============================================================================
// Site Role Types
// ============================================================================

export type SiteRole = 
  | 'PI' 
  | 'SUB_INVESTIGATOR' 
  | 'STUDY_COORDINATOR' 
  | 'RESEARCH_NURSE' 
  | 'DATA_ENTRY' 
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'REGULATORY_COORDINATOR';

export const SITE_ROLES: SiteRole[] = [
  'PI',
  'SUB_INVESTIGATOR',
  'STUDY_COORDINATOR',
  'RESEARCH_NURSE',
  'DATA_ENTRY',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'REGULATORY_COORDINATOR',
];

// ============================================================================
// Address Types
// ============================================================================

export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// Investigator Types
// ============================================================================

export interface Investigator {
  id: string;
  name: string;
  credentials: string[]; // e.g., ['MD', 'PhD']
  specialization?: string;
  email: string;
  phone: string;
  
  // Document references
  cvDocumentId?: string;
  medicalLicenseId?: string;
  gcpCertificationDate?: Date;
  gcpCertificationDocumentId?: string;
  
  // 1572 Form (FDA)
  form1572Id?: string;
  form1572Date?: Date;
  
  // Financial disclosure
  financialDisclosureId?: string;
  financialDisclosureDate?: Date;
  
  // Status
  isActive: boolean;
  deactivationReason?: string;
}

// ============================================================================
// Site Staff Types
// ============================================================================

export interface SiteStaffMember {
  id: string;
  name: string;
  role: SiteRole;
  email: string;
  phone?: string;
  
  // Delegation
  delegationLogId?: string;
  delegatedTasks: string[];
  delegationStartDate?: Date;
  delegationEndDate?: Date;
  
  // Training
  trainingCompleted: boolean;
  trainingCompletionDate?: Date;
  trainingDocumentIds: string[];
  
  // Status
  isActive: boolean;
}

// ============================================================================
// Clinical Site
// ============================================================================

export interface ClinicalSite {
  id: string;
  studyId: string;
  tenantId: string;
  
  // Site identification
  siteNumber: string;
  facilityName: string;
  facilityType: 'HOSPITAL' | 'CLINIC' | 'ACADEMIC' | 'PRIVATE_PRACTICE' | 'OTHER';
  
  // Location
  address: SiteAddress;
  country: string;
  region: string;
  timezone: string;
  
  // Status
  status: SiteStatus;
  statusReason?: string;
  
  // Personnel
  principalInvestigator: Investigator;
  siteStaff: SiteStaffMember[];
  
  // Regulatory
  irb: IRBInfo;
  contractStatus: ContractStatus;
  contractExecutionDate?: Date;
  
  // Enrollment
  targetEnrollment: number;
  actualEnrollment: number;
  screenFailures: number;
  
  // Timeline
  identificationDate: Date;
  selectionDate?: Date;
  activationDate?: Date;
  firstPatientDate?: Date;
  lastPatientDate?: Date;
  closeoutDate?: Date;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Site Creation/Update Config
// ============================================================================

export interface CreateSiteConfig {
  studyId: string;
  tenantId: string;
  siteNumber: string;
  facilityName: string;
  facilityType?: ClinicalSite['facilityType'];
  address: SiteAddress;
  country: string;
  region?: string;
  timezone?: string;
  principalInvestigator: Omit<Investigator, 'id' | 'isActive'>;
  targetEnrollment?: number;
  createdBy: string;
}

export interface SiteFilters {
  studyId?: string;
  tenantId?: string;
  status?: SiteStatus[];
  country?: string;
  region?: string;
  hasIRBApproval?: boolean;
  hasExecutedContract?: boolean;
  isEnrolling?: boolean;
  searchTerm?: string;
}

// ============================================================================
// Site Metrics
// ============================================================================

export interface SiteMetrics {
  siteId: string;
  studyId: string;
  
  // Enrollment
  enrollmentTarget: number;
  enrollmentActual: number;
  enrollmentRate: number; // Per month
  enrollmentProgress: number; // Percentage
  
  // Screening
  screenedCount: number;
  screenFailureCount: number;
  screenFailureRate: number; // Percentage
  
  // Data quality
  queryRate: number; // Per 100 forms
  queryResolutionTime: number; // Average days
  
  // Compliance
  protocolDeviationCount: number;
  protocolDeviationRate: number;
  
  // Timeliness
  dataEntryLag: number; // Average days from visit to entry
  
  // Calculated
  lastUpdated: Date;
}

export interface EnrollmentBySite {
  siteId: string;
  siteNumber: string;
  facilityName: string;
  target: number;
  actual: number;
  progress: number;
  rate: number;
  projectedCompletion?: Date;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSiteStatus(value: unknown): value is SiteStatus {
  return typeof value === 'string' && SITE_STATUSES.includes(value as SiteStatus);
}

export function isContractStatus(value: unknown): value is ContractStatus {
  return typeof value === 'string' && CONTRACT_STATUSES.includes(value as ContractStatus);
}

export function isSiteRole(value: unknown): value is SiteRole {
  return typeof value === 'string' && SITE_ROLES.includes(value as SiteRole);
}

export function isValidSiteStatusTransition(from: SiteStatus, to: SiteStatus): boolean {
  return SITE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isIRBApproved(irb: IRBInfo): boolean {
  if (irb.status !== 'APPROVED' && irb.status !== 'CONDITIONAL') {
    return false;
  }
  if (irb.expirationDate && irb.expirationDate < new Date()) {
    return false;
  }
  return true;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createInvestigator(params: {
  id?: string;
  name: string;
  credentials?: string[];
  email: string;
  phone: string;
  specialization?: string;
}): Investigator {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    credentials: params.credentials ?? [],
    specialization: params.specialization,
    email: params.email,
    phone: params.phone,
    isActive: true,
  };
}

export function createSiteStaffMember(params: {
  id?: string;
  name: string;
  role: SiteRole;
  email: string;
  phone?: string;
  delegatedTasks?: string[];
}): SiteStaffMember {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    role: params.role,
    email: params.email,
    phone: params.phone,
    delegatedTasks: params.delegatedTasks ?? [],
    trainingCompleted: false,
    trainingDocumentIds: [],
    isActive: true,
  };
}

export function createIRBInfo(params: {
  name: string;
  type?: IRBInfo['type'];
}): IRBInfo {
  return {
    name: params.name,
    type: params.type ?? 'LOCAL',
    status: 'PENDING',
    documentIds: [],
  };
}

export function createClinicalSite(config: CreateSiteConfig): ClinicalSite {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    studyId: config.studyId,
    tenantId: config.tenantId,
    siteNumber: config.siteNumber,
    facilityName: config.facilityName,
    facilityType: config.facilityType ?? 'CLINIC',
    address: config.address,
    country: config.country,
    region: config.region ?? '',
    timezone: config.timezone ?? 'UTC',
    status: 'IDENTIFIED',
    principalInvestigator: {
      ...config.principalInvestigator,
      id: crypto.randomUUID(),
      isActive: true,
    },
    siteStaff: [],
    irb: createIRBInfo({ name: 'Pending IRB Assignment' }),
    contractStatus: 'NOT_STARTED',
    targetEnrollment: config.targetEnrollment ?? 0,
    actualEnrollment: 0,
    screenFailures: 0,
    identificationDate: now,
    createdAt: now,
    createdBy: config.createdBy,
    updatedAt: now,
    updatedBy: config.createdBy,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getSiteStatusDisplayName(status: SiteStatus): string {
  const displayNames: Record<SiteStatus, string> = {
    IDENTIFIED: 'Identified',
    SELECTED: 'Selected',
    IN_STARTUP: 'In Startup',
    ACTIVE: 'Active',
    ENROLLING: 'Enrolling',
    CLOSED: 'Closed',
    TERMINATED: 'Terminated',
  };
  return displayNames[status];
}

export function getContractStatusDisplayName(status: ContractStatus): string {
  const displayNames: Record<ContractStatus, string> = {
    NOT_STARTED: 'Not Started',
    IN_NEGOTIATION: 'In Negotiation',
    LEGAL_REVIEW: 'Legal Review',
    EXECUTED: 'Executed',
    AMENDED: 'Amended',
  };
  return displayNames[status];
}

export function getSiteRoleDisplayName(role: SiteRole): string {
  const displayNames: Record<SiteRole, string> = {
    PI: 'Principal Investigator',
    SUB_INVESTIGATOR: 'Sub-Investigator',
    STUDY_COORDINATOR: 'Study Coordinator',
    RESEARCH_NURSE: 'Research Nurse',
    DATA_ENTRY: 'Data Entry',
    PHARMACIST: 'Pharmacist',
    LAB_TECHNICIAN: 'Lab Technician',
    REGULATORY_COORDINATOR: 'Regulatory Coordinator',
  };
  return displayNames[role];
}

export function calculateSiteEnrollmentProgress(site: ClinicalSite): number {
  if (site.targetEnrollment === 0) return 0;
  return Math.min(100, Math.round((site.actualEnrollment / site.targetEnrollment) * 100));
}

export function isSiteReady(site: ClinicalSite): boolean {
  return (
    isIRBApproved(site.irb) &&
    site.contractStatus === 'EXECUTED' &&
    site.principalInvestigator.isActive &&
    site.siteStaff.some(s => s.role === 'STUDY_COORDINATOR' && s.trainingCompleted)
  );
}

export function canSiteEnroll(site: ClinicalSite): boolean {
  return site.status === 'ENROLLING' && site.actualEnrollment < site.targetEnrollment;
}

export function getActiveSiteStaff(site: ClinicalSite): SiteStaffMember[] {
  return site.siteStaff.filter(s => s.isActive);
}

export function getSiteStaffByRole(site: ClinicalSite, role: SiteRole): SiteStaffMember[] {
  return site.siteStaff.filter(s => s.role === role && s.isActive);
}
