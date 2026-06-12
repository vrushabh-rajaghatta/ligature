
/**
 * Site Qualification Service
 * Automated qualification checklists, document verification, regulatory deadlines, audit readiness
 * @version 0.20.3.1
 */

// ============================================================================
// Qualification Types
// ============================================================================

export type QualificationStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'QUALIFIED'
  | 'CONDITIONALLY_QUALIFIED'
  | 'NOT_QUALIFIED'
  | 'SUSPENDED';

export type ChecklistItemStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'NOT_APPLICABLE'
  | 'BLOCKED'
  | 'WAIVED';

export type DocumentVerificationStatus = 
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXPIRING_SOON';

export type RegulatoryDeadlineStatus = 
  | 'UPCOMING'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'WAIVED';

export type DocumentType = 
  | 'FDA_1572'
  | 'CV_PI'
  | 'CV_SUB_INVESTIGATOR'
  | 'GCP_CERTIFICATE'
  | 'MEDICAL_LICENSE'
  | 'DEA_LICENSE'
  | 'FINANCIAL_DISCLOSURE'
  | 'IRB_APPROVAL'
  | 'SITE_ASSESSMENT'
  | 'INFORMED_CONSENT'
  | 'PROTOCOL_SIGNATURE'
  | 'DELEGATION_LOG'
  | 'TRAINING_LOG'
  | 'LAB_CERTIFICATION'
  | 'PHARMACY_LICENSE'
  | 'REGULATORY_BINDER'
  | 'OTHER';

// ============================================================================
// Checklist Types
// ============================================================================

export interface QualificationChecklist {
  id: string;
  studyId: string;
  name: string;
  description?: string;
  version: string;
  items: QualificationChecklistItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationChecklistItem {
  id: string;
  category: QualificationCategory;
  name: string;
  description: string;
  isRequired: boolean;
  requiresDocument: boolean;
  documentType?: DocumentType;
  requiresVerification: boolean;
  order: number;
}

export type QualificationCategory = 
  | 'REGULATORY'
  | 'PERSONNEL'
  | 'FACILITIES'
  | 'EQUIPMENT'
  | 'PROCEDURES'
  | 'TRAINING'
  | 'CONTRACTS';

// ============================================================================
// Site Qualification Types
// ============================================================================

export interface SiteQualification {
  id: string;
  siteId: string;
  studyId: string;
  tenantId: string;
  checklistId: string;
  
  // Status
  status: QualificationStatus;
  qualificationDate?: Date;
  expirationDate?: Date;
  
  // Progress
  itemStatuses: SiteChecklistItemStatus[];
  completedItems: number;
  totalItems: number;
  completionPercentage: number;
  
  // Documents
  documents: SiteQualificationDocument[];
  
  // Regulatory
  regulatoryDeadlines: RegulatoryDeadline[];
  
  // Audit
  auditReadinessScore: number;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  
  // Notes
  notes?: string;
  conditions?: string[];
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface SiteChecklistItemStatus {
  itemId: string;
  status: ChecklistItemStatus;
  completedDate?: Date;
  completedBy?: string;
  documentId?: string;
  verifiedBy?: string;
  verifiedDate?: Date;
  notes?: string;
  blockedReason?: string;
  waivedReason?: string;
  waivedBy?: string;
}

export interface SiteQualificationDocument {
  id: string;
  siteQualificationId: string;
  documentType: DocumentType;
  fileName: string;
  fileReference: string;
  
  // Verification
  status: DocumentVerificationStatus;
  submittedDate: Date;
  submittedBy: string;
  reviewedDate?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  
  // Expiration
  effectiveDate?: Date;
  expirationDate?: Date;
  
  // Version
  version: string;
  previousVersionId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryDeadline {
  id: string;
  siteQualificationId: string;
  name: string;
  description: string;
  deadlineType: RegulatoryDeadlineType;
  dueDate: Date;
  status: RegulatoryDeadlineStatus;
  
  // Completion
  completedDate?: Date;
  completedBy?: string;
  documentId?: string;
  
  // Recurrence
  isRecurring: boolean;
  recurrenceMonths?: number;
  nextDueDate?: Date;
  
  // Alerts
  alertDays: number[];
  lastAlertSent?: Date;
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type RegulatoryDeadlineType = 
  | 'IRB_RENEWAL'
  | 'IRB_CONTINUING_REVIEW'
  | 'ANNUAL_REPORT'
  | 'LICENSE_RENEWAL'
  | 'GCP_RECERTIFICATION'
  | 'PROTOCOL_AMENDMENT'
  | 'SAFETY_REPORT'
  | 'ENROLLMENT_UPDATE'
  | 'FINANCIAL_DISCLOSURE_UPDATE'
  | 'OTHER';

// ============================================================================
// Audit Readiness Types
// ============================================================================

export interface AuditReadinessAssessment {
  siteId: string;
  studyId: string;
  assessmentDate: Date;
  assessedBy: string;
  
  // Overall Score (0-100)
  overallScore: number;
  
  // Category Scores
  categoryScores: AuditCategoryScore[];
  
  // Issues
  criticalIssues: AuditIssue[];
  majorIssues: AuditIssue[];
  minorIssues: AuditIssue[];
  
  // Recommendations
  recommendations: string[];
  
  // Status
  isAuditReady: boolean;
  readinessLevel: 'GREEN' | 'YELLOW' | 'RED';
}

export interface AuditCategoryScore {
  category: AuditCategory;
  score: number;
  maxScore: number;
  percentage: number;
  issues: string[];
}

export type AuditCategory = 
  | 'REGULATORY_DOCUMENTS'
  | 'SOURCE_DOCUMENTATION'
  | 'INFORMED_CONSENT'
  | 'INVESTIGATIONAL_PRODUCT'
  | 'SAFETY_REPORTING'
  | 'DATA_QUALITY'
  | 'TRAINING_RECORDS'
  | 'DELEGATION_LOG';

export interface AuditIssue {
  id: string;
  category: AuditCategory;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  recommendation: string;
  reference?: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface SiteQualificationServiceConfig {
  tenantId: string;
  defaultAlertDays?: number[];
  auditReadinessThreshold?: number;
  expirationWarningDays?: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface ISiteQualificationService {
  // Checklist Management
  createChecklist(checklist: Omit<QualificationChecklist, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualificationChecklist>;
  updateChecklist(checklistId: string, updates: Partial<QualificationChecklist>): Promise<QualificationChecklist>;
  getChecklist(checklistId: string): Promise<QualificationChecklist | null>;
  getStudyChecklists(studyId: string): Promise<QualificationChecklist[]>;
  
  // Site Qualification
  initializeSiteQualification(siteId: string, studyId: string, checklistId: string, createdBy: string): Promise<SiteQualification>;
  getSiteQualification(siteId: string, studyId: string): Promise<SiteQualification | null>;
  updateItemStatus(siteId: string, studyId: string, itemId: string, status: ChecklistItemStatus, updatedBy: string, notes?: string): Promise<SiteQualification>;
  completeItem(siteId: string, studyId: string, itemId: string, completedBy: string, documentId?: string): Promise<SiteQualification>;
  waiveItem(siteId: string, studyId: string, itemId: string, reason: string, waivedBy: string): Promise<SiteQualification>;
  blockItem(siteId: string, studyId: string, itemId: string, reason: string, updatedBy: string): Promise<SiteQualification>;
  
  // Document Verification
  submitDocument(siteId: string, studyId: string, document: Omit<SiteQualificationDocument, 'id' | 'siteQualificationId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<SiteQualificationDocument>;
  reviewDocument(documentId: string, approved: boolean, reviewedBy: string, rejectionReason?: string): Promise<SiteQualificationDocument>;
  getExpiringDocuments(studyId: string, withinDays?: number): Promise<SiteQualificationDocument[]>;
  
  // Regulatory Deadlines
  addDeadline(siteId: string, studyId: string, deadline: Omit<RegulatoryDeadline, 'id' | 'siteQualificationId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<RegulatoryDeadline>;
  completeDeadline(deadlineId: string, completedBy: string, documentId?: string): Promise<RegulatoryDeadline>;
  getUpcomingDeadlines(studyId: string, withinDays?: number): Promise<RegulatoryDeadline[]>;
  getOverdueDeadlines(studyId: string): Promise<RegulatoryDeadline[]>;
  
  // Qualification Status
  evaluateQualificationStatus(siteId: string, studyId: string): Promise<QualificationStatus>;
  qualifySite(siteId: string, studyId: string, qualifiedBy: string, conditions?: string[]): Promise<SiteQualification>;
  suspendQualification(siteId: string, studyId: string, reason: string, suspendedBy: string): Promise<SiteQualification>;
  
  // Audit Readiness
  assessAuditReadiness(siteId: string, studyId: string, assessedBy: string): Promise<AuditReadinessAssessment>;
  getAuditReadinessScore(siteId: string, studyId: string): number;
  
  // Queries
  getQualifiedSites(studyId: string): Promise<SiteQualification[]>;
  getSitesNeedingAction(studyId: string): Promise<{
    incompleteQualification: SiteQualification[];
    expiringDocuments: SiteQualificationDocument[];
    upcomingDeadlines: RegulatoryDeadline[];
    overdueDeadlines: RegulatoryDeadline[];
    lowAuditReadiness: SiteQualification[];
  }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class SiteQualificationService implements ISiteQualificationService {
  private config: Required<SiteQualificationServiceConfig>;
  private checklists: Map<string, QualificationChecklist> = new Map();
  private qualifications: Map<string, SiteQualification> = new Map(); // key: siteId-studyId
  private documents: Map<string, SiteQualificationDocument> = new Map();
  private deadlines: Map<string, RegulatoryDeadline> = new Map();
  
  constructor(config: SiteQualificationServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      defaultAlertDays: config.defaultAlertDays ?? [30, 14, 7],
      auditReadinessThreshold: config.auditReadinessThreshold ?? 80,
      expirationWarningDays: config.expirationWarningDays ?? 30,
    };
  }
  
  private getQualificationKey(siteId: string, studyId: string): string {
    return `${siteId}-${studyId}`;
  }
  
  // ===========================================================================
  // Checklist Management
  // ===========================================================================
  
  async createChecklist(
    checklist: Omit<QualificationChecklist, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<QualificationChecklist> {
    if (!checklist.studyId?.trim()) {
      throw new Error('Study ID is required');
    }
    if (!checklist.name?.trim()) {
      throw new Error('Checklist name is required');
    }
    if (!checklist.items || checklist.items.length === 0) {
      throw new Error('Checklist must have at least one item');
    }
    
    const now = new Date();
    const newChecklist: QualificationChecklist = {
      id: crypto.randomUUID(),
      ...checklist,
      createdAt: now,
      updatedAt: now,
    };
    
    this.checklists.set(newChecklist.id, newChecklist);
    return newChecklist;
  }
  
  async updateChecklist(
    checklistId: string,
    updates: Partial<QualificationChecklist>
  ): Promise<QualificationChecklist> {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      throw new Error(`Checklist not found: ${checklistId}`);
    }
    
    const updatedChecklist: QualificationChecklist = {
      ...checklist,
      ...updates,
      id: checklist.id,
      createdAt: checklist.createdAt,
      updatedAt: new Date(),
    };
    
    this.checklists.set(checklistId, updatedChecklist);
    return updatedChecklist;
  }
  
  async getChecklist(checklistId: string): Promise<QualificationChecklist | null> {
    return this.checklists.get(checklistId) ?? null;
  }
  
  async getStudyChecklists(studyId: string): Promise<QualificationChecklist[]> {
    return Array.from(this.checklists.values())
      .filter(c => c.studyId === studyId);
  }
  
  // ===========================================================================
  // Site Qualification
  // ===========================================================================
  
  async initializeSiteQualification(
    siteId: string,
    studyId: string,
    checklistId: string,
    createdBy: string
  ): Promise<SiteQualification> {
    const key = this.getQualificationKey(siteId, studyId);
    
    if (this.qualifications.has(key)) {
      throw new Error('Site qualification already exists for this study');
    }
    
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      throw new Error(`Checklist not found: ${checklistId}`);
    }
    
    // Initialize item statuses
    const itemStatuses: SiteChecklistItemStatus[] = checklist.items.map(item => ({
      itemId: item.id,
      status: 'NOT_STARTED' as ChecklistItemStatus,
    }));
    
    const now = new Date();
    const qualification: SiteQualification = {
      id: crypto.randomUUID(),
      siteId,
      studyId,
      tenantId: this.config.tenantId,
      checklistId,
      status: 'NOT_STARTED',
      itemStatuses,
      completedItems: 0,
      totalItems: checklist.items.length,
      completionPercentage: 0,
      documents: [],
      regulatoryDeadlines: [],
      auditReadinessScore: 0,
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
    };
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  async getSiteQualification(siteId: string, studyId: string): Promise<SiteQualification | null> {
    const key = this.getQualificationKey(siteId, studyId);
    return this.qualifications.get(key) ?? null;
  }
  
  async updateItemStatus(
    siteId: string,
    studyId: string,
    itemId: string,
    status: ChecklistItemStatus,
    updatedBy: string,
    notes?: string
  ): Promise<SiteQualification> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const itemIndex = qualification.itemStatuses.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }
    
    qualification.itemStatuses[itemIndex] = {
      ...qualification.itemStatuses[itemIndex],
      status,
      notes,
    };
    
    // Update completion stats
    this.updateCompletionStats(qualification);
    
    // Update overall status if needed
    if (qualification.status === 'NOT_STARTED') {
      qualification.status = 'IN_PROGRESS';
    }
    
    qualification.updatedAt = new Date();
    qualification.updatedBy = updatedBy;
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  async completeItem(
    siteId: string,
    studyId: string,
    itemId: string,
    completedBy: string,
    documentId?: string
  ): Promise<SiteQualification> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const itemIndex = qualification.itemStatuses.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }
    
    // Check if document is required
    const checklist = this.checklists.get(qualification.checklistId);
    const checklistItem = checklist?.items.find(i => i.id === itemId);
    
    if (checklistItem?.requiresDocument && !documentId) {
      throw new Error('Document is required to complete this item');
    }
    
    qualification.itemStatuses[itemIndex] = {
      ...qualification.itemStatuses[itemIndex],
      status: 'COMPLETE',
      completedDate: new Date(),
      completedBy,
      documentId,
    };
    
    this.updateCompletionStats(qualification);
    
    qualification.updatedAt = new Date();
    qualification.updatedBy = completedBy;
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  async waiveItem(
    siteId: string,
    studyId: string,
    itemId: string,
    reason: string,
    waivedBy: string
  ): Promise<SiteQualification> {
    if (!reason?.trim()) {
      throw new Error('Waiver reason is required');
    }
    
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const itemIndex = qualification.itemStatuses.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }
    
    qualification.itemStatuses[itemIndex] = {
      ...qualification.itemStatuses[itemIndex],
      status: 'WAIVED',
      waivedReason: reason,
      waivedBy,
    };
    
    this.updateCompletionStats(qualification);
    
    qualification.updatedAt = new Date();
    qualification.updatedBy = waivedBy;
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  async blockItem(
    siteId: string,
    studyId: string,
    itemId: string,
    reason: string,
    updatedBy: string
  ): Promise<SiteQualification> {
    if (!reason?.trim()) {
      throw new Error('Block reason is required');
    }
    
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const itemIndex = qualification.itemStatuses.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }
    
    qualification.itemStatuses[itemIndex] = {
      ...qualification.itemStatuses[itemIndex],
      status: 'BLOCKED',
      blockedReason: reason,
    };
    
    qualification.updatedAt = new Date();
    qualification.updatedBy = updatedBy;
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  private updateCompletionStats(qualification: SiteQualification): void {
    const completedStatuses: ChecklistItemStatus[] = ['COMPLETE', 'WAIVED', 'NOT_APPLICABLE'];
    const completed = qualification.itemStatuses.filter(i => 
      completedStatuses.includes(i.status)
    ).length;
    
    qualification.completedItems = completed;
    qualification.completionPercentage = qualification.totalItems > 0
      ? Math.round((completed / qualification.totalItems) * 100)
      : 0;
  }
  
  // ===========================================================================
  // Document Verification
  // ===========================================================================
  
  async submitDocument(
    siteId: string,
    studyId: string,
    document: Omit<SiteQualificationDocument, 'id' | 'siteQualificationId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<SiteQualificationDocument> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    if (!document.fileName?.trim()) {
      throw new Error('File name is required');
    }
    if (!document.fileReference?.trim()) {
      throw new Error('File reference is required');
    }
    
    const now = new Date();
    const doc: SiteQualificationDocument = {
      id: crypto.randomUUID(),
      siteQualificationId: qualification.id,
      ...document,
      status: 'PENDING_REVIEW',
      createdAt: now,
      updatedAt: now,
    };
    
    this.documents.set(doc.id, doc);
    qualification.documents.push(doc);
    this.qualifications.set(key, qualification);
    
    return doc;
  }
  
  async reviewDocument(
    documentId: string,
    approved: boolean,
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<SiteQualificationDocument> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    if (doc.status !== 'PENDING_REVIEW') {
      throw new Error('Document is not pending review');
    }
    
    if (!approved && !rejectionReason?.trim()) {
      throw new Error('Rejection reason is required');
    }
    
    const updatedDoc: SiteQualificationDocument = {
      ...doc,
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewedDate: new Date(),
      reviewedBy,
      rejectionReason: approved ? undefined : rejectionReason,
      updatedAt: new Date(),
    };
    
    this.documents.set(documentId, updatedDoc);
    
    // Update in qualification
    for (const qual of Array.from(Array.from(this.qualifications.values()))) {
      const docIndex = qual.documents.findIndex(d => d.id === documentId);
      if (docIndex !== -1) {
        qual.documents[docIndex] = updatedDoc;
        this.qualifications.set(this.getQualificationKey(qual.siteId, qual.studyId), qual);
        break;
      }
    }
    
    return updatedDoc;
  }
  
  async getExpiringDocuments(studyId: string, withinDays?: number): Promise<SiteQualificationDocument[]> {
    const days = withinDays ?? this.config.expirationWarningDays;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const today = new Date();
    
    const results: SiteQualificationDocument[] = [];
    
    for (const qual of Array.from(Array.from(this.qualifications.values()))) {
      if (qual.studyId !== studyId) continue;
      
      for (const doc of qual.documents) {
        if (doc.status === 'APPROVED' && doc.expirationDate) {
          if (doc.expirationDate <= futureDate && doc.expirationDate >= today) {
            results.push({ ...doc, status: 'EXPIRING_SOON' });
          } else if (doc.expirationDate < today) {
            results.push({ ...doc, status: 'EXPIRED' });
          }
        }
      }
    }
    
    return results.sort((a, b) => 
      (a.expirationDate?.getTime() ?? 0) - (b.expirationDate?.getTime() ?? 0)
    );
  }
  
  // ===========================================================================
  // Regulatory Deadlines
  // ===========================================================================
  
  async addDeadline(
    siteId: string,
    studyId: string,
    deadline: Omit<RegulatoryDeadline, 'id' | 'siteQualificationId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<RegulatoryDeadline> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    if (!deadline.name?.trim()) {
      throw new Error('Deadline name is required');
    }
    if (!deadline.dueDate) {
      throw new Error('Due date is required');
    }
    
    const today = new Date();
    let status: RegulatoryDeadlineStatus = 'UPCOMING';
    
    const daysUntilDue = Math.ceil(
      (deadline.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilDue < 0) {
      status = 'OVERDUE';
    } else if (daysUntilDue <= 14) {
      status = 'DUE_SOON';
    }
    
    const now = new Date();
    const newDeadline: RegulatoryDeadline = {
      id: crypto.randomUUID(),
      siteQualificationId: qualification.id,
      ...deadline,
      status,
      alertDays: deadline.alertDays ?? this.config.defaultAlertDays,
      createdAt: now,
      updatedAt: now,
    };
    
    this.deadlines.set(newDeadline.id, newDeadline);
    qualification.regulatoryDeadlines.push(newDeadline);
    this.qualifications.set(key, qualification);
    
    return newDeadline;
  }
  
  async completeDeadline(
    deadlineId: string,
    completedBy: string,
    documentId?: string
  ): Promise<RegulatoryDeadline> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) {
      throw new Error(`Deadline not found: ${deadlineId}`);
    }
    
    if (deadline.status === 'COMPLETED') {
      throw new Error('Deadline is already completed');
    }
    
    const completedDeadline: RegulatoryDeadline = {
      ...deadline,
      status: 'COMPLETED',
      completedDate: new Date(),
      completedBy,
      documentId,
      updatedAt: new Date(),
    };
    
    // Handle recurrence
    if (deadline.isRecurring && deadline.recurrenceMonths) {
      const nextDueDate = new Date(deadline.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + deadline.recurrenceMonths);
      completedDeadline.nextDueDate = nextDueDate;
    }
    
    this.deadlines.set(deadlineId, completedDeadline);
    
    // Update in qualification
    for (const qual of Array.from(Array.from(this.qualifications.values()))) {
      const dlIndex = qual.regulatoryDeadlines.findIndex(d => d.id === deadlineId);
      if (dlIndex !== -1) {
        qual.regulatoryDeadlines[dlIndex] = completedDeadline;
        this.qualifications.set(this.getQualificationKey(qual.siteId, qual.studyId), qual);
        break;
      }
    }
    
    return completedDeadline;
  }
  
  async getUpcomingDeadlines(studyId: string, withinDays?: number): Promise<RegulatoryDeadline[]> {
    const days = withinDays ?? 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const today = new Date();
    
    return Array.from(this.deadlines.values())
      .filter(d => {
        const qual = Array.from(this.qualifications.values())
          .find(q => q.regulatoryDeadlines.some(dl => dl.id === d.id));
        return qual?.studyId === studyId &&
               d.status !== 'COMPLETED' &&
               d.status !== 'WAIVED' &&
               d.dueDate >= today &&
               d.dueDate <= futureDate;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
  
  async getOverdueDeadlines(studyId: string): Promise<RegulatoryDeadline[]> {
    const today = new Date();
    
    return Array.from(this.deadlines.values())
      .filter(d => {
        const qual = Array.from(this.qualifications.values())
          .find(q => q.regulatoryDeadlines.some(dl => dl.id === d.id));
        return qual?.studyId === studyId &&
               d.status !== 'COMPLETED' &&
               d.status !== 'WAIVED' &&
               d.dueDate < today;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
  
  // ===========================================================================
  // Qualification Status
  // ===========================================================================
  
  async evaluateQualificationStatus(siteId: string, studyId: string): Promise<QualificationStatus> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const checklist = this.checklists.get(qualification.checklistId);
    if (!checklist) {
      throw new Error('Checklist not found');
    }
    
    // Check if any items are blocked
    const hasBlockedItems = qualification.itemStatuses.some(i => i.status === 'BLOCKED');
    if (hasBlockedItems) {
      return 'NOT_QUALIFIED';
    }
    
    // Check required items
    const requiredItems = checklist.items.filter(i => i.isRequired);
    const completedStatuses: ChecklistItemStatus[] = ['COMPLETE', 'WAIVED', 'NOT_APPLICABLE'];
    
    const incompleteRequired = requiredItems.filter(item => {
      const status = qualification.itemStatuses.find(s => s.itemId === item.id);
      return !status || !completedStatuses.includes(status.status);
    });
    
    if (incompleteRequired.length > 0) {
      // If any required items are incomplete
      const hasStarted = qualification.itemStatuses.some(i => 
        i.status !== 'NOT_STARTED'
      );
      return hasStarted ? 'IN_PROGRESS' : 'NOT_STARTED';
    }
    
    // All required items complete - check for conditions
    if (qualification.conditions && qualification.conditions.length > 0) {
      return 'CONDITIONALLY_QUALIFIED';
    }
    
    return 'QUALIFIED';
  }
  
  async qualifySite(
    siteId: string,
    studyId: string,
    qualifiedBy: string,
    conditions?: string[]
  ): Promise<SiteQualification> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    // Evaluate if site can be qualified
    const evaluatedStatus = await this.evaluateQualificationStatus(siteId, studyId);
    
    if (evaluatedStatus === 'NOT_QUALIFIED' || evaluatedStatus === 'NOT_STARTED') {
      throw new Error('Site does not meet qualification requirements');
    }
    
    qualification.status = conditions && conditions.length > 0 
      ? 'CONDITIONALLY_QUALIFIED' 
      : 'QUALIFIED';
    qualification.qualificationDate = new Date();
    qualification.conditions = conditions;
    qualification.updatedAt = new Date();
    qualification.updatedBy = qualifiedBy;
    
    // Calculate audit readiness
    qualification.auditReadinessScore = await this.calculateAuditReadinessScore(qualification);
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  async suspendQualification(
    siteId: string,
    studyId: string,
    reason: string,
    suspendedBy: string
  ): Promise<SiteQualification> {
    if (!reason?.trim()) {
      throw new Error('Suspension reason is required');
    }
    
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    qualification.status = 'SUSPENDED';
    qualification.notes = qualification.notes 
      ? `${qualification.notes}\nSuspended: ${reason}` 
      : `Suspended: ${reason}`;
    qualification.updatedAt = new Date();
    qualification.updatedBy = suspendedBy;
    
    this.qualifications.set(key, qualification);
    return qualification;
  }
  
  // ===========================================================================
  // Audit Readiness
  // ===========================================================================
  
  async assessAuditReadiness(
    siteId: string,
    studyId: string,
    assessedBy: string
  ): Promise<AuditReadinessAssessment> {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    if (!qualification) {
      throw new Error('Site qualification not found');
    }
    
    const categoryScores: AuditCategoryScore[] = [];
    const criticalIssues: AuditIssue[] = [];
    const majorIssues: AuditIssue[] = [];
    const minorIssues: AuditIssue[] = [];
    const recommendations: string[] = [];
    
    // Evaluate Regulatory Documents
    const regDocScore = this.evaluateRegulatoryDocuments(qualification);
    categoryScores.push(regDocScore);
    this.addIssuesFromCategory(regDocScore, criticalIssues, majorIssues, minorIssues);
    
    // Evaluate Training Records
    const trainingScore = this.evaluateTrainingRecords(qualification);
    categoryScores.push(trainingScore);
    this.addIssuesFromCategory(trainingScore, criticalIssues, majorIssues, minorIssues);
    
    // Evaluate Informed Consent
    const consentScore = this.evaluateInformedConsent(qualification);
    categoryScores.push(consentScore);
    this.addIssuesFromCategory(consentScore, criticalIssues, majorIssues, minorIssues);
    
    // Evaluate Delegation Log
    const delegationScore = this.evaluateDelegationLog(qualification);
    categoryScores.push(delegationScore);
    this.addIssuesFromCategory(delegationScore, criticalIssues, majorIssues, minorIssues);
    
    // Calculate overall score
    const totalScore = categoryScores.reduce((sum, c) => sum + c.score, 0);
    const maxScore = categoryScores.reduce((sum, c) => sum + c.maxScore, 0);
    const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Generate recommendations
    if (criticalIssues.length > 0) {
      recommendations.push('Address all critical issues before any audit');
    }
    if (majorIssues.length > 0) {
      recommendations.push('Resolve major issues to improve audit readiness');
    }
    
    const isAuditReady = overallScore >= this.config.auditReadinessThreshold && criticalIssues.length === 0;
    
    let readinessLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (criticalIssues.length > 0 || overallScore < 60) {
      readinessLevel = 'RED';
    } else if (majorIssues.length > 0 || overallScore < 80) {
      readinessLevel = 'YELLOW';
    }
    
    // Update qualification with score
    qualification.auditReadinessScore = overallScore;
    qualification.updatedAt = new Date();
    this.qualifications.set(key, qualification);
    
    return {
      siteId,
      studyId,
      assessmentDate: new Date(),
      assessedBy,
      overallScore,
      categoryScores,
      criticalIssues,
      majorIssues,
      minorIssues,
      recommendations,
      isAuditReady,
      readinessLevel,
    };
  }
  
  private evaluateRegulatoryDocuments(qualification: SiteQualification): AuditCategoryScore {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 25;
    
    const requiredDocs: DocumentType[] = ['FDA_1572', 'CV_PI', 'IRB_APPROVAL', 'PROTOCOL_SIGNATURE'];
    const approvedDocs = qualification.documents.filter(d => d.status === 'APPROVED');
    
    for (const docType of requiredDocs) {
      const doc = approvedDocs.find(d => d.documentType === docType);
      if (doc) {
        score += 5;
        if (doc.expirationDate && doc.expirationDate < new Date()) {
          score -= 3;
          issues.push(`${docType} is expired`);
        }
      } else {
        issues.push(`Missing ${docType}`);
      }
    }
    
    // Bonus for additional docs
    if (approvedDocs.find(d => d.documentType === 'FINANCIAL_DISCLOSURE')) score += 2;
    if (approvedDocs.find(d => d.documentType === 'DEA_LICENSE')) score += 2;
    if (approvedDocs.find(d => d.documentType === 'LAB_CERTIFICATION')) score += 1;
    
    return {
      category: 'REGULATORY_DOCUMENTS',
      score: Math.min(score, maxScore),
      maxScore,
      percentage: Math.round((Math.min(score, maxScore) / maxScore) * 100),
      issues,
    };
  }
  
  private evaluateTrainingRecords(qualification: SiteQualification): AuditCategoryScore {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 25;
    
    const trainingDocs = qualification.documents.filter(d => 
      d.documentType === 'TRAINING_LOG' || d.documentType === 'GCP_CERTIFICATE'
    );
    
    if (trainingDocs.some(d => d.documentType === 'TRAINING_LOG' && d.status === 'APPROVED')) {
      score += 15;
    } else {
      issues.push('Training log not documented');
    }
    
    if (trainingDocs.some(d => d.documentType === 'GCP_CERTIFICATE' && d.status === 'APPROVED')) {
      score += 10;
    } else {
      issues.push('GCP certification not documented');
    }
    
    return {
      category: 'TRAINING_RECORDS',
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      issues,
    };
  }
  
  private evaluateInformedConsent(qualification: SiteQualification): AuditCategoryScore {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 25;
    
    const consentDoc = qualification.documents.find(d => 
      d.documentType === 'INFORMED_CONSENT' && d.status === 'APPROVED'
    );
    
    if (consentDoc) {
      score += 25;
    } else {
      issues.push('Approved informed consent form not documented');
    }
    
    return {
      category: 'INFORMED_CONSENT',
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      issues,
    };
  }
  
  private evaluateDelegationLog(qualification: SiteQualification): AuditCategoryScore {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 25;
    
    const delegationDoc = qualification.documents.find(d => 
      d.documentType === 'DELEGATION_LOG' && d.status === 'APPROVED'
    );
    
    if (delegationDoc) {
      score += 25;
    } else {
      issues.push('Delegation log not documented');
    }
    
    return {
      category: 'DELEGATION_LOG',
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      issues,
    };
  }
  
  private addIssuesFromCategory(
    categoryScore: AuditCategoryScore,
    critical: AuditIssue[],
    major: AuditIssue[],
    minor: AuditIssue[]
  ): void {
    for (const issue of categoryScore.issues) {
      const auditIssue: AuditIssue = {
        id: crypto.randomUUID(),
        category: categoryScore.category,
        severity: categoryScore.percentage < 50 ? 'CRITICAL' : categoryScore.percentage < 75 ? 'MAJOR' : 'MINOR',
        description: issue,
        recommendation: `Address: ${issue}`,
      };
      
      if (auditIssue.severity === 'CRITICAL') {
        critical.push(auditIssue);
      } else if (auditIssue.severity === 'MAJOR') {
        major.push(auditIssue);
      } else {
        minor.push(auditIssue);
      }
    }
  }
  
  private async calculateAuditReadinessScore(qualification: SiteQualification): Promise<number> {
    const regScore = this.evaluateRegulatoryDocuments(qualification);
    const trainingScore = this.evaluateTrainingRecords(qualification);
    const consentScore = this.evaluateInformedConsent(qualification);
    const delegationScore = this.evaluateDelegationLog(qualification);
    
    const totalScore = regScore.score + trainingScore.score + consentScore.score + delegationScore.score;
    const maxScore = regScore.maxScore + trainingScore.maxScore + consentScore.maxScore + delegationScore.maxScore;
    
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }
  
  getAuditReadinessScore(siteId: string, studyId: string): number {
    const key = this.getQualificationKey(siteId, studyId);
    const qualification = this.qualifications.get(key);
    return qualification?.auditReadinessScore ?? 0;
  }
  
  // ===========================================================================
  // Queries
  // ===========================================================================
  
  async getQualifiedSites(studyId: string): Promise<SiteQualification[]> {
    return Array.from(this.qualifications.values())
      .filter(q => 
        q.studyId === studyId && 
        (q.status === 'QUALIFIED' || q.status === 'CONDITIONALLY_QUALIFIED')
      );
  }
  
  async getSitesNeedingAction(studyId: string): Promise<{
    incompleteQualification: SiteQualification[];
    expiringDocuments: SiteQualificationDocument[];
    upcomingDeadlines: RegulatoryDeadline[];
    overdueDeadlines: RegulatoryDeadline[];
    lowAuditReadiness: SiteQualification[];
  }> {
    const incompleteQualification = Array.from(this.qualifications.values())
      .filter(q => 
        q.studyId === studyId && 
        ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(q.status)
      );
    
    const expiringDocuments = await this.getExpiringDocuments(studyId);
    const upcomingDeadlines = await this.getUpcomingDeadlines(studyId);
    const overdueDeadlines = await this.getOverdueDeadlines(studyId);
    
    const lowAuditReadiness = Array.from(this.qualifications.values())
      .filter(q => 
        q.studyId === studyId && 
        q.auditReadinessScore < this.config.auditReadinessThreshold
      );
    
    return {
      incompleteQualification,
      expiringDocuments,
      upcomingDeadlines,
      overdueDeadlines,
      lowAuditReadiness,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.checklists.clear();
    this.qualifications.clear();
    this.documents.clear();
    this.deadlines.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSiteQualificationService(
  config: SiteQualificationServiceConfig
): SiteQualificationService {
  return new SiteQualificationService(config);
}
