
// =============================================================================
// SOP LIBRARY TYPES
// =============================================================================
// Types for Standard Operating Procedures management per GxP requirements.
// Supports document control, versioning, training tracking, and compliance.
// =============================================================================

// ============================================================================
// SOP CATEGORIES
// ============================================================================

/**
 * SOP category prefixes matching the Ligature SOP Suite
 */
export type SOPCategory = 
  | 'QS'    // Quality System
  | 'CS'    // Computerized Systems
  | 'GCP'   // Good Clinical Practice
  | 'GVP'   // Good Pharmacovigilance Practice
  | 'GLP'   // Good Laboratory Practice
  | 'GMP'   // Good Manufacturing Practice
  | 'GDP'   // Good Distribution Practice
  | 'REG';  // Regulatory Affairs

/**
 * Category metadata
 */
export interface SOPCategoryInfo {
  id: SOPCategory;
  name: string;
  description: string;
  color: string;
  icon: string;
  regulations: string[];
}

/**
 * All SOP categories with metadata
 */
export const SOP_CATEGORIES: Record<SOPCategory, SOPCategoryInfo> = {
  QS: {
    id: 'QS',
    name: 'Quality System',
    description: 'Core quality management system procedures',
    color: '#3B82F6', // Blue
    icon: 'Shield',
    regulations: ['ICH Q10', '21 CFR 820', 'ISO 13485'],
  },
  CS: {
    id: 'CS',
    name: 'Computerized Systems',
    description: 'Computer system validation and compliance',
    color: '#8B5CF6', // Purple
    icon: 'Monitor',
    regulations: ['21 CFR Part 11', 'EU Annex 11', 'GAMP 5'],
  },
  GCP: {
    id: 'GCP',
    name: 'Good Clinical Practice',
    description: 'Clinical trial operations and compliance',
    color: '#10B981', // Green
    icon: 'Users',
    regulations: ['ICH E6(R2)', '21 CFR Parts 50, 56, 312', 'EU CTR'],
  },
  GVP: {
    id: 'GVP',
    name: 'Good Pharmacovigilance Practice',
    description: 'Drug safety and pharmacovigilance',
    color: '#EF4444', // Red
    icon: 'AlertTriangle',
    regulations: ['EU GVP Modules', '21 CFR 314.80', 'ICH E2 Series'],
  },
  GLP: {
    id: 'GLP',
    name: 'Good Laboratory Practice',
    description: 'Nonclinical laboratory studies',
    color: '#F59E0B', // Amber
    icon: 'FlaskConical',
    regulations: ['21 CFR Part 58', 'OECD GLP', 'EU Directive 2004/10/EC'],
  },
  GMP: {
    id: 'GMP',
    name: 'Good Manufacturing Practice',
    description: 'Drug manufacturing and quality control',
    color: '#06B6D4', // Cyan
    icon: 'Factory',
    regulations: ['21 CFR Parts 210, 211', 'EU Annex 1-20', 'ICH Q7-Q12'],
  },
  GDP: {
    id: 'GDP',
    name: 'Good Distribution Practice',
    description: 'Drug distribution and supply chain',
    color: '#14B8A6', // Teal
    icon: 'Truck',
    regulations: ['EU GDP Guidelines', '21 CFR 211 Subpart H', 'WHO GDP'],
  },
  REG: {
    id: 'REG',
    name: 'Regulatory Affairs',
    description: 'Regulatory submissions and compliance',
    color: '#EC4899', // Pink
    icon: 'FileText',
    regulations: ['21 CFR 314', 'EU Variation Regulations', 'ICH M4/M8'],
  },
};

// ============================================================================
// SOP DOCUMENT
// ============================================================================

/**
 * SOP document status
 */
export type SOPStatus = 
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'effective'
  | 'superseded'
  | 'retired'
  | 'archived';

/**
 * SOP document record
 */
export interface SOPDocument {
  /** Unique ID */
  id: string;
  /** SOP number (e.g., QS-001) */
  sopNumber: string;
  /** Category */
  category: SOPCategory;
  /** Title */
  title: string;
  /** Description/abstract */
  description: string;
  /** Current version */
  version: string;
  /** Status */
  status: SOPStatus;
  /** Effective date */
  effectiveDate?: Date;
  /** Review due date */
  reviewDueDate?: Date;
  /** Next review date (periodic review) */
  nextReviewDate?: Date;
  /** Expiration date */
  expirationDate?: Date;
  /** Department owner */
  department: string;
  /** Document owner */
  owner: string;
  /** Author */
  author: string;
  /** Approvers */
  approvers: SOPApprover[];
  /** Keywords for search */
  keywords: string[];
  /** Related SOPs */
  relatedSOPs: string[];
  /** Supersedes SOP */
  supersedes?: string;
  /** Superseded by SOP */
  supersededBy?: string;
  /** File reference (path or URL) */
  fileRef?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Training required */
  trainingRequired: boolean;
  /** Training assignments */
  trainingAssignments?: TrainingAssignment[];
  /** Version history */
  versionHistory: SOPVersion[];
  /** Audit trail */
  auditTrail: SOPAuditEntry[];
  /** Metadata */
  metadata: SOPMetadata;
}

/**
 * SOP version record
 */
export interface SOPVersion {
  version: string;
  effectiveDate: Date;
  reason: string;
  changes: string;
  author: string;
  approvedBy: string;
  approvedAt: Date;
}

/**
 * SOP approver
 */
export interface SOPApprover {
  name: string;
  role: 'author' | 'reviewer' | 'approver' | 'qa_approver';
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  signature?: string;
  signedAt?: Date;
  comments?: string;
}

/**
 * SOP metadata
 */
export interface SOPMetadata {
  createdAt: Date;
  createdBy: string;
  modifiedAt: Date;
  modifiedBy: string;
  tags: string[];
  language: string;
  pageCount?: number;
}

/**
 * SOP audit trail entry
 */
export interface SOPAuditEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

// ============================================================================
// TRAINING
// ============================================================================

/**
 * Training assignment for an SOP
 */
export interface TrainingAssignment {
  id: string;
  userId: string;
  userName: string;
  assignedAt: Date;
  dueDate: Date;
  completedAt?: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  score?: number;
  attempts?: number;
  certificate?: string;
}

/**
 * Training summary for a user
 */
export interface TrainingSummary {
  userId: string;
  totalAssigned: number;
  completed: number;
  overdue: number;
  pending: number;
  complianceRate: number;
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

/**
 * SOP search/filter options
 */
export interface SOPFilter {
  category?: SOPCategory | SOPCategory[];
  status?: SOPStatus | SOPStatus[];
  department?: string;
  owner?: string;
  keyword?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  reviewDueBefore?: Date;
  trainingRequired?: boolean;
}

/**
 * SOP sort options
 */
export interface SOPSort {
  field: 'sopNumber' | 'title' | 'effectiveDate' | 'reviewDueDate' | 'status' | 'category';
  direction: 'asc' | 'desc';
}

// ============================================================================
// LIBRARY STATS
// ============================================================================

/**
 * SOP library statistics
 */
export interface SOPLibraryStats {
  total: number;
  byCategory: Record<SOPCategory, number>;
  byStatus: Record<SOPStatus, number>;
  pendingReview: number;
  overdueReview: number;
  trainingOverdue: number;
  recentlyUpdated: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate SOP number
 */
export function generateSOPNumber(category: SOPCategory, sequence: number): string {
  return `${category}-${sequence.toString().padStart(3, '0')}`;
}

/**
 * Parse SOP number into components
 */
export function parseSOPNumber(sopNumber: string): { category: SOPCategory; sequence: number } | null {
  const match = sopNumber.match(/^([A-Z]{2,3})-(\d{3})$/);
  if (!match) return null;
  return {
    category: match[1] as SOPCategory,
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Get status badge color
 */
export function getStatusColor(status: SOPStatus): string {
  const colors: Record<SOPStatus, string> = {
    draft: '#6B7280',
    in_review: '#F59E0B',
    pending_approval: '#8B5CF6',
    approved: '#3B82F6',
    effective: '#10B981',
    superseded: '#6B7280',
    retired: '#EF4444',
    archived: '#9CA3AF',
  };
  return colors[status];
}

/**
 * Get status display label
 */
export function getStatusLabel(status: SOPStatus): string {
  const labels: Record<SOPStatus, string> = {
    draft: 'Draft',
    in_review: 'In Review',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    effective: 'Effective',
    superseded: 'Superseded',
    retired: 'Retired',
    archived: 'Archived',
  };
  return labels[status];
}

/**
 * Check if SOP is overdue for review
 */
export function isReviewOverdue(sop: SOPDocument): boolean {
  if (!sop.reviewDueDate) return false;
  return new Date() > sop.reviewDueDate;
}

/**
 * Check if SOP requires action
 */
export function requiresAction(sop: SOPDocument): boolean {
  return (
    sop.status === 'in_review' ||
    sop.status === 'pending_approval' ||
    isReviewOverdue(sop)
  );
}

/**
 * Calculate training compliance
 */
export function calculateTrainingCompliance(assignments: TrainingAssignment[]): number {
  if (assignments.length === 0) return 100;
  const completed = assignments.filter(a => a.status === 'completed' || a.status === 'waived').length;
  return Math.round((completed / assignments.length) * 100);
}

/**
 * Get category info
 */
export function getCategoryInfo(category: SOPCategory): SOPCategoryInfo {
  return SOP_CATEGORIES[category];
}

/**
 * Sort SOPs by number
 */
export function sortBySOPNumber(a: SOPDocument, b: SOPDocument): number {
  const parsedA = parseSOPNumber(a.sopNumber);
  const parsedB = parseSOPNumber(b.sopNumber);
  
  if (!parsedA || !parsedB) return a.sopNumber.localeCompare(b.sopNumber);
  
  // Sort by category first, then by sequence
  const categoryCompare = a.category.localeCompare(b.category);
  if (categoryCompare !== 0) return categoryCompare;
  
  return parsedA.sequence - parsedB.sequence;
}
