
/**
 * Monitoring Visit Service
 * Comprehensive site monitoring visit management
 * @version 0.20.7.2
 * 
 * Provides:
 * - Visit planning and scheduling
 * - Pre-visit preparation checklists
 * - On-site/remote visit execution
 * - Finding documentation and categorization
 * - Follow-up letter generation
 * - Action item tracking
 * - CAPA integration hooks
 */

// ============================================================================
// Service Configuration
// ============================================================================

export interface MonitoringVisitServiceConfig {
  tenantId: string;
  requirePreVisitChecklist?: boolean;
  requireFollowUpLetter?: boolean;
  defaultActionItemDueDays?: number;
}

// ============================================================================
// Visit Types
// ============================================================================

export type VisitType =
  | 'SITE_INITIATION'       // SIV - First visit to activate site
  | 'INTERIM_MONITORING'    // IMV - Routine monitoring
  | 'CLOSE_OUT'             // COV - Final visit to close site
  | 'FOR_CAUSE'             // Triggered by issue
  | 'PRE_STUDY'             // Site selection/qualification
  | 'REMOTE';               // Remote/virtual monitoring

export type VisitStatus =
  | 'PLANNED'               // Initial state
  | 'SCHEDULED'             // Date confirmed with site
  | 'PREP_IN_PROGRESS'      // Pre-visit prep started
  | 'READY'                 // All prep complete
  | 'IN_PROGRESS'           // Visit ongoing
  | 'COMPLETED'             // Visit finished, awaiting report
  | 'REPORT_DRAFT'          // Report being written
  | 'REPORT_FINAL'          // Report finalized
  | 'FOLLOW_UP_SENT'        // Follow-up letter sent
  | 'CLOSED';               // All actions resolved

export type VisitMode = 'ON_SITE' | 'REMOTE' | 'HYBRID';

// ============================================================================
// Monitoring Visit
// ============================================================================

export interface MonitoringVisit {
  id: string;
  studyId: string;
  siteId: string;
  siteName?: string;
  
  // Visit details
  visitType: VisitType;
  visitMode: VisitMode;
  visitNumber: number;          // Sequential for site
  status: VisitStatus;
  
  // Personnel
  monitorId: string;
  monitorName: string;
  backupMonitorId?: string;
  
  // Scheduling
  plannedDate?: Date;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Scope
  objectives: string[];
  subjectsToReview: string[];
  documentsToReview: string[];
  
  // Pre-visit
  preVisitChecklist?: PreVisitChecklist;
  
  // Execution
  attendees?: VisitAttendee[];
  activitiesCompleted?: VisitActivity[];
  
  // Findings
  findings: MonitoringFinding[];
  
  // Report
  reportId?: string;
  
  // Follow-up
  followUpLetterId?: string;
  followUpSentDate?: Date;
  
  // Action items
  actionItems: ActionItem[];
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

// ============================================================================
// Pre-Visit Checklist
// ============================================================================

export interface PreVisitChecklist {
  id: string;
  visitId: string;
  
  // Status
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  completedAt?: Date;
  completedBy?: string;
  
  // Items
  items: ChecklistItem[];
  
  // Notes
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export type ChecklistCategory =
  | 'DOCUMENT_REVIEW'       // Review site documents
  | 'DATA_REVIEW'           // Review EDC data
  | 'SAFETY_REVIEW'         // Review safety data
  | 'QUERY_REVIEW'          // Review open queries
  | 'PREVIOUS_FINDINGS'     // Review prior findings
  | 'LOGISTICS'             // Travel, access arrangements
  | 'COMMUNICATION';        // Site contact

// ============================================================================
// Visit Attendees & Activities
// ============================================================================

export interface VisitAttendee {
  name: string;
  role: string;
  organization?: string;
  email?: string;
  attendedStart?: boolean;
  attendedEnd?: boolean;
}

export interface VisitActivity {
  id: string;
  category: ActivityCategory;
  description: string;
  startTime?: Date;
  endTime?: Date;
  status: 'PLANNED' | 'COMPLETED' | 'SKIPPED';
  notes?: string;
}

export type ActivityCategory =
  | 'SITE_TOUR'
  | 'STAFF_MEETING'
  | 'DOCUMENT_REVIEW'
  | 'SOURCE_VERIFICATION'
  | 'INVENTORY_CHECK'
  | 'TRAINING'
  | 'REGULATORY_REVIEW'
  | 'SAFETY_REVIEW'
  | 'SUBJECT_REVIEW'
  | 'CLOSEOUT_DISCUSSION'
  | 'OTHER';

// ============================================================================
// Findings
// ============================================================================

export interface MonitoringFinding {
  id: string;
  visitId: string;
  
  // Classification
  category: FindingCategory;
  severity: FindingSeverity;
  
  // Details
  title: string;
  description: string;
  
  // Context
  subjectId?: string;
  documentId?: string;
  formOID?: string;
  fieldOID?: string;
  
  // GCP Reference
  gcpReference?: string;         // e.g., "ICH E6(R2) 4.9.0"
  protocolReference?: string;    // Protocol section
  sopReference?: string;         // SOP reference
  
  // Root cause
  rootCause?: string;
  contributingFactors?: string[];
  
  // Corrective action
  requiresCapa: boolean;
  capaId?: string;
  
  // Status
  status: FindingStatus;
  
  // Resolution
  siteResponse?: string;
  siteResponseDate?: Date;
  resolution?: string;
  resolvedDate?: Date;
  resolvedBy?: string;
  
  // Recurrence
  isRecurrent: boolean;
  previousFindingIds?: string[];
  
  // Metadata
  identifiedBy: string;
  identifiedAt: Date;
}

export type FindingCategory =
  | 'PROTOCOL_DEVIATION'
  | 'INFORMED_CONSENT'
  | 'SOURCE_DOCUMENTATION'
  | 'DATA_INTEGRITY'
  | 'SAFETY_REPORTING'
  | 'IP_MANAGEMENT'            // Investigational Product
  | 'REGULATORY_COMPLIANCE'
  | 'ESSENTIAL_DOCUMENTS'
  | 'TRAINING'
  | 'FACILITIES_EQUIPMENT'
  | 'OTHER';

export type FindingSeverity =
  | 'CRITICAL'        // Requires immediate action
  | 'MAJOR'           // Significant impact
  | 'MINOR'           // Limited impact
  | 'OBSERVATION';    // Best practice suggestion

export type FindingStatus =
  | 'IDENTIFIED'
  | 'PENDING_RESPONSE'
  | 'RESPONSE_RECEIVED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'ESCALATED';

// ============================================================================
// Action Items
// ============================================================================

export interface ActionItem {
  id: string;
  visitId: string;
  findingId?: string;
  
  // Details
  title: string;
  description: string;
  
  // Assignment
  assignedTo: string;
  assignedToRole?: string;
  assignedBy: string;
  
  // Timeline
  dueDate: Date;
  completedDate?: Date;
  
  // Status
  status: ActionItemStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Resolution
  resolution?: string;
  verifiedBy?: string;
  verifiedDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type ActionItemStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'CLOSED'
  | 'OVERDUE';

// ============================================================================
// Visit Report
// ============================================================================

export interface VisitReport {
  id: string;
  visitId: string;
  
  // Status
  status: 'DRAFT' | 'REVIEW' | 'FINAL';
  
  // Content
  executiveSummary: string;
  visitObjectives: string;
  activitiesConducted: string;
  subjectsReviewed: string;
  findingsSummary: string;
  actionItemsSummary: string;
  conclusions: string;
  nextSteps?: string;
  
  // Metrics
  subjectsEnrolled: number;
  subjectsCompleted: number;
  subjectsWithdrawn: number;
  queriesOpen: number;
  queriesClosed: number;
  sdvCompletionRate: number;
  
  // Sign-off
  preparedBy: string;
  preparedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Follow-Up Letter
// ============================================================================

export interface FollowUpLetter {
  id: string;
  visitId: string;
  reportId: string;
  
  // Status
  status: 'DRAFT' | 'REVIEW' | 'SENT' | 'ACKNOWLEDGED';
  
  // Recipients
  toRecipients: Recipient[];
  ccRecipients?: Recipient[];
  
  // Content
  subject: string;
  greeting: string;
  body: string;
  findings: FollowUpFinding[];
  actionItems: FollowUpActionItem[];
  closing: string;
  
  // Tracking
  sentDate?: Date;
  sentBy?: string;
  acknowledgedDate?: Date;
  acknowledgedBy?: string;
  
  // Response tracking
  responseDueDate?: Date;
  responseReceivedDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipient {
  name: string;
  email: string;
  role?: string;
}

export interface FollowUpFinding {
  findingId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  description: string;
  requiredAction: string;
}

export interface FollowUpActionItem {
  actionItemId: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
}

// ============================================================================
// Metrics
// ============================================================================

export interface MonitoringMetrics {
  studyId: string;
  
  // Visit counts
  totalVisitsPlanned: number;
  totalVisitsCompleted: number;
  visitsInProgress: number;
  
  // By type
  byType: Record<VisitType, number>;
  
  // Findings
  totalFindings: number;
  findingsBySeverity: Record<FindingSeverity, number>;
  findingsByCategory: Record<FindingCategory, number>;
  openFindings: number;
  
  // Action items
  totalActionItems: number;
  openActionItems: number;
  overdueActionItems: number;
  
  // Site metrics
  siteMetrics: SiteMonitoringMetrics[];
  
  // Timing
  averageVisitDuration: number;      // Hours
  averageTimeToReport: number;       // Days
  averageTimeToFollowUp: number;     // Days
  
  calculatedAt: Date;
}

export interface SiteMonitoringMetrics {
  siteId: string;
  siteName?: string;
  visitsCompleted: number;
  lastVisitDate?: Date;
  nextVisitDate?: Date;
  openFindings: number;
  openActionItems: number;
  overdueItems: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class MonitoringVisitService {
  private config: MonitoringVisitServiceConfig;
  
  // Storage
  private visits: Map<string, MonitoringVisit> = new Map();
  private reports: Map<string, VisitReport> = new Map();
  private letters: Map<string, FollowUpLetter> = new Map();
  private visitCounters: Map<string, number> = new Map(); // siteId -> count
  
  constructor(config: MonitoringVisitServiceConfig) {
    this.config = {
      requirePreVisitChecklist: true,
      requireFollowUpLetter: true,
      defaultActionItemDueDays: 14,
      ...config,
    };
  }
  
  // --------------------------------------------------------------------------
  // Visit Planning
  // --------------------------------------------------------------------------
  
  planVisit(params: {
    studyId: string;
    siteId: string;
    siteName?: string;
    visitType: VisitType;
    visitMode: VisitMode;
    monitorId: string;
    monitorName: string;
    plannedDate?: Date;
    objectives: string[];
    createdBy: string;
  }): MonitoringVisit {
    // Get next visit number for site
    const siteKey = `${params.studyId}:${params.siteId}`;
    const visitNumber = (this.visitCounters.get(siteKey) || 0) + 1;
    this.visitCounters.set(siteKey, visitNumber);
    
    const visit: MonitoringVisit = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      siteId: params.siteId,
      siteName: params.siteName,
      visitType: params.visitType,
      visitMode: params.visitMode,
      visitNumber,
      status: 'PLANNED',
      monitorId: params.monitorId,
      monitorName: params.monitorName,
      plannedDate: params.plannedDate,
      objectives: params.objectives,
      subjectsToReview: [],
      documentsToReview: [],
      findings: [],
      actionItems: [],
      createdAt: new Date(),
      createdBy: params.createdBy,
      updatedAt: new Date(),
    };
    
    // Create pre-visit checklist if required
    if (this.config.requirePreVisitChecklist) {
      visit.preVisitChecklist = this.createDefaultChecklist(visit.id, params.visitType);
    }
    
    this.visits.set(visit.id, visit);
    return visit;
  }
  
  private createDefaultChecklist(visitId: string, visitType: VisitType): PreVisitChecklist {
    const items: ChecklistItem[] = [
      // Document review
      {
        id: crypto.randomUUID(),
        category: 'DOCUMENT_REVIEW',
        description: 'Review previous visit report and outstanding items',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: crypto.randomUUID(),
        category: 'DOCUMENT_REVIEW',
        description: 'Review regulatory documents for updates',
        isRequired: true,
        isCompleted: false,
      },
      // Data review
      {
        id: crypto.randomUUID(),
        category: 'DATA_REVIEW',
        description: 'Review EDC data for completeness',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: crypto.randomUUID(),
        category: 'QUERY_REVIEW',
        description: 'Review open queries and aging',
        isRequired: true,
        isCompleted: false,
      },
      // Safety
      {
        id: crypto.randomUUID(),
        category: 'SAFETY_REVIEW',
        description: 'Review SAEs and safety reporting',
        isRequired: true,
        isCompleted: false,
      },
      // Previous findings
      {
        id: crypto.randomUUID(),
        category: 'PREVIOUS_FINDINGS',
        description: 'Review status of previous findings',
        isRequired: true,
        isCompleted: false,
      },
      // Logistics
      {
        id: crypto.randomUUID(),
        category: 'LOGISTICS',
        description: 'Confirm visit date and logistics with site',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: crypto.randomUUID(),
        category: 'COMMUNICATION',
        description: 'Send visit confirmation to site',
        isRequired: true,
        isCompleted: false,
      },
    ];
    
    // Add type-specific items
    if (visitType === 'SITE_INITIATION') {
      items.push({
        id: crypto.randomUUID(),
        category: 'DOCUMENT_REVIEW',
        description: 'Prepare site initiation training materials',
        isRequired: true,
        isCompleted: false,
      });
    }
    
    if (visitType === 'CLOSE_OUT') {
      items.push({
        id: crypto.randomUUID(),
        category: 'DOCUMENT_REVIEW',
        description: 'Prepare close-out documentation checklist',
        isRequired: true,
        isCompleted: false,
      });
    }
    
    return {
      id: crypto.randomUUID(),
      visitId,
      status: 'NOT_STARTED',
      items,
    };
  }
  
  getVisit(visitId: string): MonitoringVisit | null {
    return this.visits.get(visitId) || null;
  }
  
  listVisits(filter?: {
    studyId?: string;
    siteId?: string;
    monitorId?: string;
    status?: VisitStatus[];
    visitType?: VisitType[];
    fromDate?: Date;
    toDate?: Date;
  }): MonitoringVisit[] {
    let visits = Array.from(this.visits.values());
    
    if (filter?.studyId) {
      visits = visits.filter(v => v.studyId === filter.studyId);
    }
    if (filter?.siteId) {
      visits = visits.filter(v => v.siteId === filter.siteId);
    }
    if (filter?.monitorId) {
      visits = visits.filter(v => v.monitorId === filter.monitorId);
    }
    if (filter?.status?.length) {
      visits = visits.filter(v => filter.status!.includes(v.status));
    }
    if (filter?.visitType?.length) {
      visits = visits.filter(v => filter.visitType!.includes(v.visitType));
    }
    if (filter?.fromDate) {
      visits = visits.filter(v => 
        (v.scheduledStartDate && v.scheduledStartDate >= filter.fromDate!) ||
        (v.plannedDate && v.plannedDate >= filter.fromDate!)
      );
    }
    if (filter?.toDate) {
      visits = visits.filter(v => 
        (v.scheduledStartDate && v.scheduledStartDate <= filter.toDate!) ||
        (v.plannedDate && v.plannedDate <= filter.toDate!)
      );
    }
    
    return visits.sort((a, b) => {
      const dateA = a.scheduledStartDate || a.plannedDate || a.createdAt;
      const dateB = b.scheduledStartDate || b.plannedDate || b.createdAt;
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  updateVisit(visitId: string, updates: Partial<MonitoringVisit>): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const updated = {
      ...visit,
      ...updates,
      id: visit.id,
      createdAt: visit.createdAt,
      updatedAt: new Date(),
    };
    
    this.visits.set(visitId, updated);
    return updated;
  }
  
  // --------------------------------------------------------------------------
  // Scheduling
  // --------------------------------------------------------------------------
  
  scheduleVisit(visitId: string, params: {
    scheduledStartDate: Date;
    scheduledEndDate: Date;
    scheduledBy: string;
  }): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (params.scheduledEndDate < params.scheduledStartDate) {
      throw new Error('End date must be after start date');
    }
    
    visit.scheduledStartDate = params.scheduledStartDate;
    visit.scheduledEndDate = params.scheduledEndDate;
    visit.status = 'SCHEDULED';
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  rescheduleVisit(visitId: string, params: {
    newStartDate: Date;
    newEndDate: Date;
    reason: string;
    rescheduledBy: string;
  }): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    visit.scheduledStartDate = params.newStartDate;
    visit.scheduledEndDate = params.newEndDate;
    visit.notes = visit.notes 
      ? `${visit.notes}\n\nRescheduled: ${params.reason}`
      : `Rescheduled: ${params.reason}`;
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  cancelVisit(visitId: string, reason: string, cancelledBy: string): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (visit.status === 'IN_PROGRESS' || visit.status === 'COMPLETED') {
      throw new Error('Cannot cancel visit that is in progress or completed');
    }
    
    visit.status = 'CLOSED';
    visit.notes = visit.notes
      ? `${visit.notes}\n\nCancelled: ${reason}`
      : `Cancelled: ${reason}`;
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  // --------------------------------------------------------------------------
  // Pre-Visit Checklist
  // --------------------------------------------------------------------------
  
  completeChecklistItem(visitId: string, itemId: string, completedBy: string, notes?: string): PreVisitChecklist {
    const visit = this.visits.get(visitId);
    if (!visit || !visit.preVisitChecklist) {
      throw new Error(`Visit or checklist not found: ${visitId}`);
    }
    
    const item = visit.preVisitChecklist.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }
    
    item.isCompleted = true;
    item.completedAt = new Date();
    item.completedBy = completedBy;
    item.notes = notes;
    
    // Update checklist status
    const allRequired = visit.preVisitChecklist.items.filter(i => i.isRequired);
    const allRequiredComplete = allRequired.every(i => i.isCompleted);
    
    if (allRequiredComplete) {
      visit.preVisitChecklist.status = 'COMPLETE';
      visit.preVisitChecklist.completedAt = new Date();
      visit.preVisitChecklist.completedBy = completedBy;
      visit.status = 'READY';
    } else {
      visit.preVisitChecklist.status = 'IN_PROGRESS';
    }
    
    visit.updatedAt = new Date();
    
    return visit.preVisitChecklist;
  }
  
  addChecklistItem(visitId: string, item: Omit<ChecklistItem, 'id' | 'isCompleted'>): PreVisitChecklist {
    const visit = this.visits.get(visitId);
    if (!visit || !visit.preVisitChecklist) {
      throw new Error(`Visit or checklist not found: ${visitId}`);
    }
    
    visit.preVisitChecklist.items.push({
      ...item,
      id: crypto.randomUUID(),
      isCompleted: false,
    });
    
    visit.updatedAt = new Date();
    
    return visit.preVisitChecklist;
  }
  
  getChecklistStatus(visitId: string): {
    total: number;
    completed: number;
    required: number;
    requiredCompleted: number;
    percentage: number;
  } {
    const visit = this.visits.get(visitId);
    if (!visit || !visit.preVisitChecklist) {
      throw new Error(`Visit or checklist not found: ${visitId}`);
    }
    
    const items = visit.preVisitChecklist.items;
    const completed = items.filter(i => i.isCompleted);
    const required = items.filter(i => i.isRequired);
    const requiredCompleted = required.filter(i => i.isCompleted);
    
    return {
      total: items.length,
      completed: completed.length,
      required: required.length,
      requiredCompleted: requiredCompleted.length,
      percentage: items.length > 0 ? (completed.length / items.length) * 100 : 0,
    };
  }
  
  // --------------------------------------------------------------------------
  // Visit Execution
  // --------------------------------------------------------------------------
  
  startVisit(visitId: string, params: {
    attendees: VisitAttendee[];
    startedBy: string;
  }): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    // Check checklist if required
    if (this.config.requirePreVisitChecklist && visit.preVisitChecklist) {
      const status = this.getChecklistStatus(visitId);
      if (status.requiredCompleted < status.required) {
        throw new Error('Pre-visit checklist not complete');
      }
    }
    
    visit.status = 'IN_PROGRESS';
    visit.actualStartDate = new Date();
    visit.attendees = params.attendees;
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  addActivity(visitId: string, activity: Omit<VisitActivity, 'id' | 'status'>): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (!visit.activitiesCompleted) {
      visit.activitiesCompleted = [];
    }
    
    visit.activitiesCompleted.push({
      ...activity,
      id: crypto.randomUUID(),
      status: 'COMPLETED',
    });
    
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  completeVisit(visitId: string, completedBy: string): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (visit.status !== 'IN_PROGRESS') {
      throw new Error('Visit must be in progress to complete');
    }
    
    visit.status = 'COMPLETED';
    visit.actualEndDate = new Date();
    visit.updatedAt = new Date();
    
    return visit;
  }
  
  // --------------------------------------------------------------------------
  // Findings
  // --------------------------------------------------------------------------
  
  addFinding(visitId: string, finding: Omit<MonitoringFinding, 'id' | 'visitId' | 'status' | 'identifiedAt'>): MonitoringFinding {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const newFinding: MonitoringFinding = {
      ...finding,
      id: crypto.randomUUID(),
      visitId,
      status: 'IDENTIFIED',
      identifiedAt: new Date(),
    };
    
    visit.findings.push(newFinding);
    visit.updatedAt = new Date();
    
    return newFinding;
  }
  
  updateFinding(visitId: string, findingId: string, updates: Partial<MonitoringFinding>): MonitoringFinding {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const findingIndex = visit.findings.findIndex(f => f.id === findingId);
    if (findingIndex === -1) {
      throw new Error(`Finding not found: ${findingId}`);
    }
    
    visit.findings[findingIndex] = {
      ...visit.findings[findingIndex],
      ...updates,
      id: findingId,
      visitId,
    };
    
    visit.updatedAt = new Date();
    
    return visit.findings[findingIndex];
  }
  
  respondToFinding(visitId: string, findingId: string, response: string, respondedBy: string): MonitoringFinding {
    return this.updateFinding(visitId, findingId, {
      siteResponse: response,
      siteResponseDate: new Date(),
      status: 'RESPONSE_RECEIVED',
    });
  }
  
  resolveFinding(visitId: string, findingId: string, resolution: string, resolvedBy: string): MonitoringFinding {
    return this.updateFinding(visitId, findingId, {
      resolution,
      resolvedDate: new Date(),
      resolvedBy,
      status: 'CLOSED',
    });
  }
  
  escalateFinding(visitId: string, findingId: string, reason: string): MonitoringFinding {
    const finding = this.updateFinding(visitId, findingId, {
      status: 'ESCALATED',
    });
    
    // Could trigger CAPA creation here
    if (finding.requiresCapa && !finding.capaId) {
      // Hook for CAPA integration
    }
    
    return finding;
  }
  
  listFindings(filter?: {
    studyId?: string;
    siteId?: string;
    visitId?: string;
    severity?: FindingSeverity[];
    category?: FindingCategory[];
    status?: FindingStatus[];
  }): MonitoringFinding[] {
    let findings: MonitoringFinding[] = [];
    
    for (const visit of Array.from(Array.from(this.visits.values()))) {
      if (filter?.studyId && visit.studyId !== filter.studyId) continue;
      if (filter?.siteId && visit.siteId !== filter.siteId) continue;
      if (filter?.visitId && visit.id !== filter.visitId) continue;
      
      findings.push(...visit.findings);
    }
    
    if (filter?.severity?.length) {
      findings = findings.filter(f => filter.severity!.includes(f.severity));
    }
    if (filter?.category?.length) {
      findings = findings.filter(f => filter.category!.includes(f.category));
    }
    if (filter?.status?.length) {
      findings = findings.filter(f => filter.status!.includes(f.status));
    }
    
    return findings;
  }
  
  // --------------------------------------------------------------------------
  // Action Items
  // --------------------------------------------------------------------------
  
  addActionItem(visitId: string, item: Omit<ActionItem, 'id' | 'visitId' | 'status' | 'createdAt' | 'updatedAt'>): ActionItem {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const newItem: ActionItem = {
      ...item,
      id: crypto.randomUUID(),
      visitId,
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    visit.actionItems.push(newItem);
    visit.updatedAt = new Date();
    
    return newItem;
  }
  
  updateActionItem(visitId: string, itemId: string, updates: Partial<ActionItem>): ActionItem {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const itemIndex = visit.actionItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Action item not found: ${itemId}`);
    }
    
    visit.actionItems[itemIndex] = {
      ...visit.actionItems[itemIndex],
      ...updates,
      id: itemId,
      visitId,
      updatedAt: new Date(),
    };
    
    visit.updatedAt = new Date();
    
    return visit.actionItems[itemIndex];
  }
  
  completeActionItem(visitId: string, itemId: string, resolution: string, completedBy: string): ActionItem {
    return this.updateActionItem(visitId, itemId, {
      resolution,
      completedDate: new Date(),
      status: 'PENDING_VERIFICATION',
    });
  }
  
  verifyActionItem(visitId: string, itemId: string, verifiedBy: string): ActionItem {
    return this.updateActionItem(visitId, itemId, {
      verifiedBy,
      verifiedDate: new Date(),
      status: 'CLOSED',
    });
  }
  
  listActionItems(filter?: {
    studyId?: string;
    siteId?: string;
    visitId?: string;
    status?: ActionItemStatus[];
    assignedTo?: string;
    overdue?: boolean;
  }): ActionItem[] {
    let items: ActionItem[] = [];
    
    for (const visit of Array.from(Array.from(this.visits.values()))) {
      if (filter?.studyId && visit.studyId !== filter.studyId) continue;
      if (filter?.siteId && visit.siteId !== filter.siteId) continue;
      if (filter?.visitId && visit.id !== filter.visitId) continue;
      
      items.push(...visit.actionItems);
    }
    
    if (filter?.status?.length) {
      items = items.filter(i => filter.status!.includes(i.status));
    }
    if (filter?.assignedTo) {
      items = items.filter(i => i.assignedTo === filter.assignedTo);
    }
    if (filter?.overdue) {
      const now = new Date();
      items = items.filter(i => 
        i.status !== 'CLOSED' && 
        i.status !== 'VERIFIED' && 
        i.dueDate < now
      );
    }
    
    return items;
  }
  
  // --------------------------------------------------------------------------
  // Visit Report
  // --------------------------------------------------------------------------
  
  createReport(visitId: string, params: {
    executiveSummary: string;
    visitObjectives: string;
    activitiesConducted: string;
    subjectsReviewed: string;
    findingsSummary: string;
    actionItemsSummary: string;
    conclusions: string;
    nextSteps?: string;
    subjectsEnrolled: number;
    subjectsCompleted: number;
    subjectsWithdrawn: number;
    queriesOpen: number;
    queriesClosed: number;
    sdvCompletionRate: number;
    preparedBy: string;
  }): VisitReport {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    const report: VisitReport = {
      id: crypto.randomUUID(),
      visitId,
      status: 'DRAFT',
      ...params,
      preparedDate: new Date(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.reports.set(report.id, report);
    visit.reportId = report.id;
    visit.status = 'REPORT_DRAFT';
    visit.updatedAt = new Date();
    
    return report;
  }
  
  getReport(reportId: string): VisitReport | null {
    return this.reports.get(reportId) || null;
  }
  
  updateReport(reportId: string, updates: Partial<VisitReport>): VisitReport {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    const updated = {
      ...report,
      ...updates,
      id: report.id,
      visitId: report.visitId,
      version: report.version + 1,
      updatedAt: new Date(),
    };
    
    this.reports.set(reportId, updated);
    return updated;
  }
  
  finalizeReport(reportId: string, approvedBy: string): VisitReport {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    report.status = 'FINAL';
    report.approvedBy = approvedBy;
    report.approvedDate = new Date();
    report.updatedAt = new Date();
    
    const visit = this.visits.get(report.visitId);
    if (visit) {
      visit.status = 'REPORT_FINAL';
      visit.updatedAt = new Date();
    }
    
    return report;
  }
  
  // --------------------------------------------------------------------------
  // Follow-Up Letter
  // --------------------------------------------------------------------------
  
  createFollowUpLetter(visitId: string, params: {
    toRecipients: Recipient[];
    ccRecipients?: Recipient[];
    subject: string;
    greeting: string;
    body: string;
    closing: string;
    responseDueDate?: Date;
    createdBy: string;
  }): FollowUpLetter {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    if (!visit.reportId) {
      throw new Error('Visit report must be created before follow-up letter');
    }
    
    // Extract findings and action items for letter
    const findings: FollowUpFinding[] = visit.findings
      .filter(f => f.status !== 'CLOSED')
      .map(f => ({
        findingId: f.id,
        category: f.category,
        severity: f.severity,
        description: f.description,
        requiredAction: f.requiresCapa ? 'CAPA required' : 'Response required',
      }));
    
    const actionItems: FollowUpActionItem[] = visit.actionItems
      .filter(i => i.status !== 'CLOSED')
      .map(i => ({
        actionItemId: i.id,
        description: i.description,
        assignedTo: i.assignedTo,
        dueDate: i.dueDate,
      }));
    
    const letter: FollowUpLetter = {
      id: crypto.randomUUID(),
      visitId,
      reportId: visit.reportId,
      status: 'DRAFT',
      toRecipients: params.toRecipients,
      ccRecipients: params.ccRecipients,
      subject: params.subject,
      greeting: params.greeting,
      body: params.body,
      findings,
      actionItems,
      closing: params.closing,
      responseDueDate: params.responseDueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.letters.set(letter.id, letter);
    visit.followUpLetterId = letter.id;
    visit.updatedAt = new Date();
    
    return letter;
  }
  
  getFollowUpLetter(letterId: string): FollowUpLetter | null {
    return this.letters.get(letterId) || null;
  }
  
  sendFollowUpLetter(letterId: string, sentBy: string): FollowUpLetter {
    const letter = this.letters.get(letterId);
    if (!letter) {
      throw new Error(`Follow-up letter not found: ${letterId}`);
    }
    
    letter.status = 'SENT';
    letter.sentDate = new Date();
    letter.sentBy = sentBy;
    letter.updatedAt = new Date();
    
    const visit = this.visits.get(letter.visitId);
    if (visit) {
      visit.status = 'FOLLOW_UP_SENT';
      visit.followUpSentDate = new Date();
      visit.updatedAt = new Date();
    }
    
    return letter;
  }
  
  acknowledgeFollowUpLetter(letterId: string, acknowledgedBy: string): FollowUpLetter {
    const letter = this.letters.get(letterId);
    if (!letter) {
      throw new Error(`Follow-up letter not found: ${letterId}`);
    }
    
    letter.status = 'ACKNOWLEDGED';
    letter.acknowledgedDate = new Date();
    letter.acknowledgedBy = acknowledgedBy;
    letter.updatedAt = new Date();
    
    return letter;
  }
  
  recordLetterResponse(letterId: string): FollowUpLetter {
    const letter = this.letters.get(letterId);
    if (!letter) {
      throw new Error(`Follow-up letter not found: ${letterId}`);
    }
    
    letter.responseReceivedDate = new Date();
    letter.updatedAt = new Date();
    
    return letter;
  }
  
  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------
  
  getMetrics(studyId: string): MonitoringMetrics {
    const visits = this.listVisits({ studyId });
    const now = new Date();
    
    // Visit counts
    const completed = visits.filter(v => 
      ['COMPLETED', 'REPORT_DRAFT', 'REPORT_FINAL', 'FOLLOW_UP_SENT', 'CLOSED'].includes(v.status)
    );
    const inProgress = visits.filter(v => v.status === 'IN_PROGRESS');
    
    // By type
    const byType: Record<VisitType, number> = {
      SITE_INITIATION: 0,
      INTERIM_MONITORING: 0,
      CLOSE_OUT: 0,
      FOR_CAUSE: 0,
      PRE_STUDY: 0,
      REMOTE: 0,
    };
    for (const visit of visits) {
      byType[visit.visitType]++;
    }
    
    // Findings
    const allFindings = this.listFindings({ studyId });
    const findingsBySeverity: Record<FindingSeverity, number> = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      OBSERVATION: 0,
    };
    const findingsByCategory: Record<FindingCategory, number> = {
      PROTOCOL_DEVIATION: 0,
      INFORMED_CONSENT: 0,
      SOURCE_DOCUMENTATION: 0,
      DATA_INTEGRITY: 0,
      SAFETY_REPORTING: 0,
      IP_MANAGEMENT: 0,
      REGULATORY_COMPLIANCE: 0,
      ESSENTIAL_DOCUMENTS: 0,
      TRAINING: 0,
      FACILITIES_EQUIPMENT: 0,
      OTHER: 0,
    };
    
    for (const finding of allFindings) {
      findingsBySeverity[finding.severity]++;
      findingsByCategory[finding.category]++;
    }
    
    const openFindings = allFindings.filter(f => f.status !== 'CLOSED');
    
    // Action items
    const allActionItems = this.listActionItems({ studyId });
    const openActionItems = allActionItems.filter(i => 
      i.status !== 'CLOSED' && i.status !== 'VERIFIED'
    );
    const overdueActionItems = openActionItems.filter(i => i.dueDate < now);
    
    // Site metrics
    const siteMap = new Map<string, SiteMonitoringMetrics>();
    for (const visit of visits) {
      let site = siteMap.get(visit.siteId);
      if (!site) {
        site = {
          siteId: visit.siteId,
          siteName: visit.siteName,
          visitsCompleted: 0,
          openFindings: 0,
          openActionItems: 0,
          overdueItems: 0,
        };
        siteMap.set(visit.siteId, site);
      }
      
      if (['COMPLETED', 'REPORT_DRAFT', 'REPORT_FINAL', 'FOLLOW_UP_SENT', 'CLOSED'].includes(visit.status)) {
        site.visitsCompleted++;
        if (!site.lastVisitDate || (visit.actualEndDate && visit.actualEndDate > site.lastVisitDate)) {
          site.lastVisitDate = visit.actualEndDate;
        }
      }
      
      if (['PLANNED', 'SCHEDULED', 'PREP_IN_PROGRESS', 'READY'].includes(visit.status)) {
        const nextDate = visit.scheduledStartDate || visit.plannedDate;
        if (nextDate && (!site.nextVisitDate || nextDate < site.nextVisitDate)) {
          site.nextVisitDate = nextDate;
        }
      }
      
      site.openFindings += visit.findings.filter(f => f.status !== 'CLOSED').length;
      site.openActionItems += visit.actionItems.filter(i => 
        i.status !== 'CLOSED' && i.status !== 'VERIFIED'
      ).length;
      site.overdueItems += visit.actionItems.filter(i => 
        i.status !== 'CLOSED' && i.status !== 'VERIFIED' && i.dueDate < now
      ).length;
    }
    
    // Timing calculations
    let totalDuration = 0;
    let durationCount = 0;
    let totalReportTime = 0;
    let reportCount = 0;
    
    for (const visit of completed) {
      if (visit.actualStartDate && visit.actualEndDate) {
        totalDuration += (visit.actualEndDate.getTime() - visit.actualStartDate.getTime()) / (1000 * 60 * 60);
        durationCount++;
      }
      
      if (visit.reportId) {
        const report = this.reports.get(visit.reportId);
        if (report && visit.actualEndDate) {
          totalReportTime += (report.createdAt.getTime() - visit.actualEndDate.getTime()) / (1000 * 60 * 60 * 24);
          reportCount++;
        }
      }
    }
    
    return {
      studyId,
      totalVisitsPlanned: visits.length,
      totalVisitsCompleted: completed.length,
      visitsInProgress: inProgress.length,
      byType,
      totalFindings: allFindings.length,
      findingsBySeverity,
      findingsByCategory,
      openFindings: openFindings.length,
      totalActionItems: allActionItems.length,
      openActionItems: openActionItems.length,
      overdueActionItems: overdueActionItems.length,
      siteMetrics: Array.from(siteMap.values()),
      averageVisitDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      averageTimeToReport: reportCount > 0 ? totalReportTime / reportCount : 0,
      averageTimeToFollowUp: 0, // Would need letter data
      calculatedAt: new Date(),
    };
  }
  
  // --------------------------------------------------------------------------
  // Close Visit Workflow
  // --------------------------------------------------------------------------
  
  closeVisit(visitId: string, closedBy: string): MonitoringVisit {
    const visit = this.visits.get(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    
    // Check all requirements
    const openFindings = visit.findings.filter(f => f.status !== 'CLOSED');
    if (openFindings.length > 0) {
      throw new Error(`Cannot close visit with ${openFindings.length} open findings`);
    }
    
    const openItems = visit.actionItems.filter(i => 
      i.status !== 'CLOSED' && i.status !== 'VERIFIED'
    );
    if (openItems.length > 0) {
      throw new Error(`Cannot close visit with ${openItems.length} open action items`);
    }
    
    if (this.config.requireFollowUpLetter && !visit.followUpLetterId) {
      throw new Error('Follow-up letter required before closing visit');
    }
    
    visit.status = 'CLOSED';
    visit.updatedAt = new Date();
    
    return visit;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMonitoringVisitService(config: MonitoringVisitServiceConfig): MonitoringVisitService {
  return new MonitoringVisitService(config);
}
