
/**
 * Archives Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for R&D Archives Repository types.
 * 
 * Long-term document and data archive management:
 * - 21 CFR Part 11 (Electronic Records)
 * - ICH E6 (GCP Archives)
 * - 21 CFR Part 58.195 (GLP Archives)
 * 
 * Covers documents, studies, specimens, retention schedules, and audit trails.
 * 
 * @module domains/archives/contracts
 * @version 0.27.42
 */

// =============================================================================
// ARCHIVE DOCUMENT TYPES
// =============================================================================

export type ArchiveDocumentType = 
  | 'submission'
  | 'clinical'
  | 'nonclinical'
  | 'cmc'
  | 'quality'
  | 'correspondence'
  | 'labeling'
  | 'safety'
  | 'regulatory'
  | 'other';

export type ArchiveDocumentStatus = 
  | 'active'
  | 'pending-review'
  | 'pending-destruction'
  | 'destroyed'
  | 'legal-hold'
  | 'retrieved';

// =============================================================================
// STUDY ARCHIVE TYPES
// =============================================================================

export type ArchiveStudyType = 
  | 'clinical-trial'
  | 'glp-study'
  | 'bioavailability'
  | 'pk-pd'
  | 'stability'
  | 'bioequivalence'
  | 'observational';

export type ArchiveStudyStatus = 
  | 'archived'
  | 'partial'
  | 'pending-closeout'
  | 'retrieved'
  | 'legal-hold';

// =============================================================================
// SPECIMEN TYPES
// =============================================================================

export type SpecimenType = 
  | 'tissue'
  | 'serum'
  | 'plasma'
  | 'whole-blood'
  | 'dna'
  | 'rna'
  | 'urine'
  | 'csf'
  | 'stability'
  | 'retention'
  | 'reference'
  | 'other';

export type SpecimenStatus = 
  | 'stored'
  | 'expired'
  | 'depleted'
  | 'destroyed'
  | 'transferred'
  | 'in-use';

export type StorageCondition = 
  | 'ambient'
  | 'refrigerated'
  | 'frozen-20'
  | 'frozen-80'
  | 'liquid-nitrogen'
  | 'controlled-humidity';

// =============================================================================
// RETENTION TYPES
// =============================================================================

export type RetentionBasis = 
  | 'regulatory'
  | 'company-policy'
  | 'legal-hold'
  | 'contractual'
  | 'business-need';

export type RetentionRecordType = 
  | 'clinical-data'
  | 'nonclinical-data'
  | 'regulatory-filing'
  | 'correspondence'
  | 'batch-records'
  | 'stability-data'
  | 'adverse-events'
  | 'quality-records'
  | 'training-records'
  | 'audit-records';

// =============================================================================
// AUDIT TRAIL TYPES
// =============================================================================

export type ArchiveAuditEventType = 
  | 'archive-created'
  | 'archive-accessed'
  | 'archive-modified'
  | 'archive-destroyed'
  | 'retention-extended'
  | 'legal-hold-applied'
  | 'legal-hold-released'
  | 'custody-transferred'
  | 'review-completed'
  | 'retrieval-requested'
  | 'retrieval-completed';

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface ArchivedDocument {
  id: string;
  documentId: string;
  title: string;
  type: ArchiveDocumentType;
  status: ArchiveDocumentStatus;
  
  // Source information
  sourceModule: string;
  sourceId: string;
  version: string;
  
  // Archive metadata
  archiveDate: string;
  archivedBy: string;
  archiveReason: string;
  
  // Retention
  retentionPeriod: number;
  retentionBasis: RetentionBasis;
  retentionExpiryDate: string;
  
  // Storage
  storageLocation: string;
  mediaType: 'electronic' | 'physical' | 'hybrid';
  fileSize?: number;
  
  // Review
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewedBy?: string;
  
  // Associations
  programId?: string;
  applicationId?: string;
  studyId?: string;
  
  // Compliance
  isElectronicallySigned: boolean;
  signatureDate?: string;
  signedBy?: string;
}

export interface ArchivedStudy {
  id: string;
  studyId: string;
  title: string;
  type: ArchiveStudyType;
  status: ArchiveStudyStatus;
  
  // Study details
  phase?: string;
  indication?: string;
  sponsor: string;
  
  // Archive metadata
  archiveDate: string;
  closeoutDate: string;
  archivedBy: string;
  
  // Data summary
  dataVolume: string;
  recordCount: number;
  subjectCount?: number;
  
  // Retention
  retentionPeriod: number;
  retentionBasis: RetentionBasis;
  retentionExpiryDate: string;
  
  // Storage
  storageLocation: string;
  mediaType: 'electronic' | 'physical' | 'hybrid';
  
  // Associations
  programId?: string;
  applicationId?: string;
  linkedDocuments: string[];
  
  // Cross-module links
  tmfArchiveId?: string;
  ctmsStudyId?: string;
  glpStudyId?: string;
}

export interface Specimen {
  id: string;
  sampleId: string;
  type: SpecimenType;
  status: SpecimenStatus;
  
  // Source
  studyId?: string;
  subjectId?: string;
  visitId?: string;
  collectionDate: string;
  
  // Storage
  storageLocation: string;
  storageCondition: StorageCondition;
  containerType: string;
  volume?: number;
  aliquotCount?: number;
  
  // Tracking
  expiryDate?: string;
  lastAccessDate?: string;
  accessCount: number;
  
  // Chain of custody
  custodyHistory: CustodyEvent[];
  currentCustodian: string;
  
  // Retention
  retentionPeriod: number;
  retentionBasis: RetentionBasis;
  
  // Quality
  qualityStatus: 'acceptable' | 'compromised' | 'unknown';
  temperatureExcursions: number;
}

export interface CustodyEvent {
  id: string;
  timestamp: string;
  fromCustodian: string;
  toCustodian: string;
  reason: string;
  location?: string;
  witnessedBy?: string;
}

export interface RetentionSchedule {
  id: string;
  recordType: RetentionRecordType;
  name: string;
  description: string;
  
  // Retention requirements
  retentionPeriod: number;
  basis: RetentionBasis;
  regulatoryReference?: string;
  
  // Regional variations
  region?: string;
  jurisdiction?: string;
  
  // Scope
  applicableDocTypes: ArchiveDocumentType[];
  recordsCount: number;
  
  // Automation
  autoDestructionEnabled: boolean;
  reviewReminderDays: number;
  
  // Audit
  createdDate: string;
  lastModified: string;
  modifiedBy: string;
}

export interface ArchiveAuditEntry {
  id: string;
  timestamp: string;
  eventType: ArchiveAuditEventType;
  
  // Subject
  recordType: 'document' | 'study' | 'specimen' | 'schedule';
  recordId: string;
  recordTitle: string;
  
  // Actor
  userId: string;
  userName: string;
  userRole: string;
  
  // Details
  description: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  
  // Compliance
  ipAddress?: string;
  electronicSignature?: boolean;
  signatureId?: string;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface ArchiveDashboardMetrics {
  totalDocuments: number;
  totalStudies: number;
  totalSpecimens: number;
  totalSchedules: number;
  
  pendingReviews: number;
  pendingDestructions: number;
  legalHolds: number;
  retrievalRequests: number;
  
  storageUsedTB: number;
  storageCapacityTB: number;
  
  complianceScore: number;
  overdueReviews: number;
  expiringRetention30Days: number;
}

export interface ArchiveTypeBreakdown {
  type: ArchiveDocumentType | ArchiveStudyType | SpecimenType;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentArchiveActivity {
  id: string;
  timestamp: string;
  eventType: ArchiveAuditEventType;
  recordType: 'document' | 'study' | 'specimen';
  recordId: string;
  recordTitle: string;
  userName: string;
  description: string;
}

export interface ArchiveHealthMetrics {
  documentsByType: ArchiveTypeBreakdown[];
  studiesByType: ArchiveTypeBreakdown[];
  specimensByType: ArchiveTypeBreakdown[];
  recentActivity: RecentArchiveActivity[];
  complianceTrend: { month: string; score: number }[];
  storageGrowth: { month: string; usedTB: number }[];
}

export interface ArchiveActionItem {
  id: string;
  type: 'review' | 'destruction' | 'retrieval' | 'expiring' | 'legal-hold';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dueDate?: string;
  assignedTo?: string;
  recordType: 'document' | 'study' | 'specimen';
  recordId: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface ArchiveFilters {
  documentType?: ArchiveDocumentType[];
  documentStatus?: ArchiveDocumentStatus[];
  studyType?: ArchiveStudyType[];
  studyStatus?: ArchiveStudyStatus[];
  specimenType?: SpecimenType[];
  specimenStatus?: SpecimenStatus[];
  retentionBasis?: RetentionBasis[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}

// =============================================================================
// UI TYPES
// =============================================================================

export type ArchiveTab = 
  | 'dashboard'
  | 'documents'
  | 'studies'
  | 'specimens'
  | 'retention'
  | 'audit-trail';

// =============================================================================
// CONSTANTS
// =============================================================================

export const ARCHIVE_DOCUMENT_TYPE_LABELS: Record<ArchiveDocumentType, string> = {
  'submission': 'Regulatory Submission',
  'clinical': 'Clinical',
  'nonclinical': 'Nonclinical',
  'cmc': 'CMC',
  'quality': 'Quality',
  'correspondence': 'Correspondence',
  'labeling': 'Labeling',
  'safety': 'Safety',
  'regulatory': 'Regulatory',
  'other': 'Other',
};

export const ARCHIVE_DOCUMENT_STATUS_LABELS: Record<ArchiveDocumentStatus, string> = {
  'active': 'Active',
  'pending-review': 'Pending Review',
  'pending-destruction': 'Pending Destruction',
  'destroyed': 'Destroyed',
  'legal-hold': 'Legal Hold',
  'retrieved': 'Retrieved',
};

export const ARCHIVE_STUDY_TYPE_LABELS: Record<ArchiveStudyType, string> = {
  'clinical-trial': 'Clinical Trial',
  'glp-study': 'GLP Study',
  'bioavailability': 'Bioavailability',
  'pk-pd': 'PK/PD',
  'stability': 'Stability',
  'bioequivalence': 'Bioequivalence',
  'observational': 'Observational',
};

export const SPECIMEN_TYPE_LABELS: Record<SpecimenType, string> = {
  'tissue': 'Tissue',
  'serum': 'Serum',
  'plasma': 'Plasma',
  'whole-blood': 'Whole Blood',
  'dna': 'DNA',
  'rna': 'RNA',
  'urine': 'Urine',
  'csf': 'CSF',
  'stability': 'Stability',
  'retention': 'Retention',
  'reference': 'Reference',
  'other': 'Other',
};

export const STORAGE_CONDITION_LABELS: Record<StorageCondition, string> = {
  'ambient': 'Ambient',
  'refrigerated': '2-8°C',
  'frozen-20': '-20°C',
  'frozen-80': '-80°C',
  'liquid-nitrogen': 'Liquid Nitrogen',
  'controlled-humidity': 'Controlled Humidity',
};

export const RETENTION_BASIS_LABELS: Record<RetentionBasis, string> = {
  'regulatory': 'Regulatory Requirement',
  'company-policy': 'Company Policy',
  'legal-hold': 'Legal Hold',
  'contractual': 'Contractual',
  'business-need': 'Business Need',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isDocumentAccessible(status: ArchiveDocumentStatus): boolean {
  return status === 'active' || status === 'retrieved';
}

export function isDocumentOnHold(status: ArchiveDocumentStatus): boolean {
  return status === 'legal-hold';
}

export function isRetentionExpiring(expiryDate: string, daysThreshold: number = 30): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
}

export function isRetentionExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

export function isSpecimenUsable(specimen: Specimen): boolean {
  return specimen.status === 'stored' && 
         specimen.qualityStatus === 'acceptable' &&
         (!specimen.expiryDate || !isRetentionExpired(specimen.expiryDate));
}

export function calculateStorageUtilization(used: number, capacity: number): number {
  if (capacity === 0) return 0;
  return Math.round((used / capacity) * 100);
}

export function formatRetentionPeriod(years: number): string {
  if (years === 1) return '1 year';
  return `${years} years`;
}

export function getRetentionExpiryDate(archiveDate: string, retentionYears: number): string {
  const date = new Date(archiveDate);
  date.setFullYear(date.getFullYear() + retentionYears);
  return date.toISOString().split('T')[0];
}
