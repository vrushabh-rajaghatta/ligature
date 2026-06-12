
// ============================================================================
// Regulatory Intelligence Types - v56
// Real-time regulatory guidance monitoring, agency document tracking,
// compliance deadline management, and impact assessment
// ============================================================================

// ============================================================================
// REGULATORY AGENCIES & REGIONS
// ============================================================================

export type RegulatoryAgencyId = 
  | 'FDA'           // US Food and Drug Administration
  | 'EMA'           // European Medicines Agency
  | 'PMDA'          // Japan Pharmaceuticals and Medical Devices Agency
  | 'NMPA'          // China National Medical Products Administration
  | 'Health-Canada' // Health Canada
  | 'TGA'           // Australia Therapeutic Goods Administration
  | 'MHRA'          // UK Medicines and Healthcare products Regulatory Agency
  | 'Swissmedic'    // Swiss Agency for Therapeutic Products
  | 'ANVISA'        // Brazil National Health Surveillance Agency
  | 'COFEPRIS'      // Mexico Federal Commission for Protection against Sanitary Risks
  | 'CDSCO'         // India Central Drugs Standard Control Organization
  | 'KFDA'          // Korea Food and Drug Administration
  | 'HSA'           // Singapore Health Sciences Authority
  | 'Medsafe'       // New Zealand Medicines and Medical Devices Safety Authority
  | 'ICH'           // International Council for Harmonisation
  | 'WHO'           // World Health Organization
  | 'Other';

export type RegulatedRegion = 
  | 'North-America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Latin-America'
  | 'Middle-East-Africa'
  | 'Global';

export interface RegulatoryAgency {
  id: RegulatoryAgencyId;
  fullName: string;
  country: string;
  region: RegulatedRegion;
  website: string;
  guidancePortalUrl?: string;
  submissionPortalUrl?: string;
  timezone: string;
  primaryLanguage: string;
  acceptsEnglish: boolean;
  ectdVersion: string;
  contactEmail?: string;
}

// ============================================================================
// GUIDANCE DOCUMENT TYPES
// ============================================================================

export type GuidanceDocumentType = 
  | 'guidance'              // Final guidance document
  | 'draft-guidance'        // Draft guidance for comment
  | 'regulation'            // Binding regulation/law
  | 'policy'                // Policy statement
  | 'q-and-a'               // Q&A document
  | 'template'              // Template/form
  | 'manual'                // Procedural manual
  | 'technical-standard'    // Technical specification
  | 'ich-guideline'         // ICH harmonized guideline
  | 'safety-communication'  // Safety alert/communication
  | 'fee-schedule'          // Fee/pricing document
  | 'workshop-summary'      // Workshop/meeting summary
  | 'concept-paper'         // Concept paper
  | 'reflection-paper';     // Reflection/position paper

export type GuidanceStatus = 
  | 'draft'
  | 'final'
  | 'superseded'
  | 'withdrawn'
  | 'under-revision';

export type TherapeuticArea = 
  | 'oncology'
  | 'cardiovascular'
  | 'neurology'
  | 'immunology'
  | 'infectious-disease'
  | 'rare-disease'
  | 'pediatrics'
  | 'geriatrics'
  | 'womens-health'
  | 'gene-therapy'
  | 'cell-therapy'
  | 'biologics'
  | 'small-molecule'
  | 'vaccines'
  | 'diagnostics'
  | 'combination-products'
  | 'general';

export type RegulatoryTopic = 
  | 'clinical-trials'
  | 'nonclinical'
  | 'cmc-quality'
  | 'labeling'
  | 'safety-pharmacovigilance'
  | 'post-marketing'
  | 'submissions-format'
  | 'biostatistics'
  | 'clinical-pharmacology'
  | 'manufacturing'
  | 'packaging'
  | 'stability'
  | 'impurities'
  | 'biomarkers'
  | 'digital-health'
  | 'real-world-evidence'
  | 'patient-reported-outcomes'
  | 'expedited-programs'
  | 'pediatric-requirements'
  | 'biosimilars'
  | 'generics'
  | 'combination-products'
  | 'ctd-format'
  | 'ectd-technical'
  | 'advertising-promotion'
  | 'pricing-reimbursement'
  | 'environmental'
  | 'general';

// ============================================================================
// GUIDANCE DOCUMENTS
// ============================================================================

export interface GuidanceDocument {
  id: string;
  
  // Identification
  documentNumber: string;
  title: string;
  shortTitle?: string;
  
  // Source
  issuingAgency: RegulatoryAgencyId;
  issuingDepartment?: string;
  
  // Classification
  documentType: GuidanceDocumentType;
  status: GuidanceStatus;
  therapeuticAreas: TherapeuticArea[];
  topics: RegulatoryTopic[];
  
  // Dates
  issuedDate: string;
  effectiveDate?: string;
  commentDeadline?: string;
  supersededDate?: string;
  lastReviewedDate?: string;
  
  // Versioning
  version: string;
  previousVersionId?: string;
  supersededById?: string;
  
  // Content
  summary: string;
  keyChanges?: string[];
  applicabilityStatement?: string;
  
  // References
  sourceUrl: string;
  pdfUrl?: string;
  relatedDocumentIds: string[];
  ichGuidelineRef?: string;
  federalRegisterCitation?: string;
  
  // Metadata
  pageCount?: number;
  language: string;
  keywords: string[];
  
  // Tracking
  addedToSystemDate: string;
  lastUpdatedInSystem: string;
  reviewedBy?: string;
}

export interface GuidanceDocumentChange {
  id: string;
  documentId: string;
  changeType: 'new' | 'revision' | 'status-change' | 'superseded' | 'withdrawn';
  changeDate: string;
  previousVersion?: string;
  newVersion?: string;
  changeSummary: string;
  keyDifferences?: string[];
  detectedBy: 'automated' | 'manual';
  reviewedBy?: string;
  reviewedDate?: string;
}

// ============================================================================
// REGULATORY ALERTS & MONITORING
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type AlertCategory = 
  | 'new-guidance'
  | 'guidance-revision'
  | 'draft-for-comment'
  | 'regulatory-change'
  | 'deadline-approaching'
  | 'deadline-missed'
  | 'safety-alert'
  | 'fee-change'
  | 'submission-requirement-change'
  | 'expedited-pathway-update'
  | 'inspection-guidance'
  | 'enforcement-action'
  | 'system-notification';

export interface RegulatoryAlert {
  id: string;
  
  // Classification
  category: AlertCategory;
  severity: AlertSeverity;
  
  // Content
  title: string;
  summary: string;
  fullDescription?: string;
  
  // Source
  sourceAgency: RegulatoryAgencyId;
  sourceDocumentId?: string;
  sourceUrl?: string;
  
  // Scope
  affectedRegions: RegulatedRegion[];
  affectedTherapeuticAreas: TherapeuticArea[];
  affectedTopics: RegulatoryTopic[];
  affectedProgramIds?: string[];
  affectedSubmissionIds?: string[];
  
  // Timeline
  publishedDate: string;
  effectiveDate?: string;
  actionDeadline?: string;
  
  // Workflow
  status: 'new' | 'acknowledged' | 'under-review' | 'action-required' | 'resolved' | 'dismissed';
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedDate?: string;
  resolvedBy?: string;
  resolvedDate?: string;
  resolutionNotes?: string;
  
  // Impact assessment link
  impactAssessmentId?: string;
  
  // Tracking
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringSubscription {
  id: string;
  userId: string;
  
  // What to monitor
  agencies: RegulatoryAgencyId[];
  documentTypes: GuidanceDocumentType[];
  therapeuticAreas: TherapeuticArea[];
  topics: RegulatoryTopic[];
  keywords: string[];
  
  // Notification preferences
  emailNotification: boolean;
  inAppNotification: boolean;
  digestFrequency: 'immediate' | 'daily' | 'weekly';
  
  // Filters
  minSeverity: AlertSeverity;
  includeInformational: boolean;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMPLIANCE DEADLINES & COMMITMENTS
// ============================================================================

export type DeadlineType = 
  | 'submission-deadline'
  | 'comment-period'
  | 'implementation-date'
  | 'annual-report'
  | 'periodic-report'
  | 'post-approval-commitment'
  | 'inspection-response'
  | 'labeling-update'
  | 'safety-report'
  | 'fee-payment'
  | 'license-renewal'
  | 'pediatric-requirement'
  | 'rems-assessment'
  | 'other';

export type DeadlineStatus = 
  | 'upcoming'
  | 'due-soon'   // Within 30 days
  | 'overdue'
  | 'completed'
  | 'extension-requested'
  | 'waived'
  | 'cancelled';

export type DeadlinePriority = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceDeadline {
  id: string;
  
  // Identification
  title: string;
  description: string;
  
  // Classification
  deadlineType: DeadlineType;
  priority: DeadlinePriority;
  status: DeadlineStatus;
  
  // Regulatory context
  agency: RegulatoryAgencyId;
  region: RegulatedRegion;
  regulatoryBasis?: string; // e.g., "21 CFR 312.32", "ICH E2B"
  sourceGuidanceId?: string;
  
  // Scope
  programId?: string;
  submissionId?: string;
  productName?: string;
  
  // Dates
  dueDate: string;
  originalDueDate?: string;
  extensionDate?: string;
  completedDate?: string;
  
  // Reminders
  reminderDays: number[]; // e.g., [90, 60, 30, 14, 7]
  lastReminderSent?: string;
  
  // Owner
  assignedTo: string;
  backupAssignee?: string;
  department?: string;
  
  // Dependencies
  dependentDeadlineIds: string[];
  blockedByDeadlineIds: string[];
  
  // Evidence
  completionDocuments?: string[];
  notes?: string;
  
  // Tracking
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface DeadlineExtensionRequest {
  id: string;
  deadlineId: string;
  
  requestedDate: string;
  requestedBy: string;
  justification: string;
  newProposedDate: string;
  
  status: 'pending' | 'approved' | 'denied' | 'withdrawn';
  reviewedBy?: string;
  reviewedDate?: string;
  agencyResponse?: string;
  
  createdAt: string;
}

// ============================================================================
// REGULATORY IMPACT ASSESSMENT
// ============================================================================

export type ImpactLevel = 'critical' | 'major' | 'moderate' | 'minor' | 'none';

export type ImpactCategory = 
  | 'submission-timeline'
  | 'study-design'
  | 'labeling-content'
  | 'manufacturing'
  | 'post-marketing'
  | 'safety-reporting'
  | 'documentation'
  | 'resource-planning'
  | 'cost'
  | 'competitive-position';

export interface ImpactAssessment {
  id: string;
  
  // What triggered this assessment
  triggerId: string;
  triggerType: 'guidance' | 'regulation' | 'alert' | 'manual';
  triggerTitle: string;
  
  // Scope
  affectedPrograms: ProgramImpact[];
  affectedSubmissions: SubmissionImpact[];
  
  // Overall assessment
  overallImpactLevel: ImpactLevel;
  overallSummary: string;
  
  // Detailed impacts
  categoryImpacts: CategoryImpact[];
  
  // Gaps identified
  complianceGaps: ComplianceGap[];
  
  // Recommended actions
  recommendedActions: RecommendedAction[];
  
  // Timeline
  assessmentDate: string;
  assessedBy: string;
  reviewedBy?: string;
  reviewedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  
  // Status
  status: 'draft' | 'under-review' | 'approved' | 'action-in-progress' | 'completed';
  
  createdAt: string;
  updatedAt: string;
}

export interface ProgramImpact {
  programId: string;
  programName: string;
  impactLevel: ImpactLevel;
  impactSummary: string;
  affectedAreas: RegulatoryTopic[];
  mitigationRequired: boolean;
  mitigationStrategy?: string;
}

export interface SubmissionImpact {
  submissionId: string;
  submissionType: string;
  targetAgency: RegulatoryAgencyId;
  impactLevel: ImpactLevel;
  impactSummary: string;
  timelineImpactDays?: number;
  documentChangesRequired: string[];
}

export interface CategoryImpact {
  category: ImpactCategory;
  level: ImpactLevel;
  description: string;
  currentState: string;
  requiredState: string;
  gapAnalysis: string;
  effortEstimate?: string;
  costEstimate?: string;
}

export interface ComplianceGap {
  id: string;
  assessmentId: string;
  
  // Gap details
  title: string;
  description: string;
  regulatoryRequirement: string;
  currentStatus: string;
  gapSeverity: ImpactLevel;
  
  // Remediation
  remediationPlan?: string;
  targetResolutionDate?: string;
  assignedTo?: string;
  status: 'identified' | 'remediation-planned' | 'in-progress' | 'resolved' | 'accepted-risk';
  
  // Evidence
  evidenceRequired: string[];
  evidenceProvided: string[];
}

export interface RecommendedAction {
  id: string;
  assessmentId: string;
  
  // Action details
  title: string;
  description: string;
  rationale: string;
  
  // Classification
  priority: DeadlinePriority;
  category: ImpactCategory;
  
  // Ownership
  suggestedOwner: string;
  suggestedDepartment?: string;
  
  // Timeline
  suggestedDeadline?: string;
  effortEstimateDays?: number;
  
  // Dependencies
  prerequisiteActionIds: string[];
  blockedByGapIds: string[];
  
  // Status
  status: 'proposed' | 'accepted' | 'in-progress' | 'completed' | 'rejected' | 'deferred';
  acceptedBy?: string;
  acceptedDate?: string;
  completedDate?: string;
  rejectionReason?: string;
}

// ============================================================================
// REGULATORY INTELLIGENCE FEEDS
// ============================================================================

export interface RegulatoryFeed {
  id: string;
  name: string;
  agency: RegulatoryAgencyId;
  feedType: 'rss' | 'api' | 'web-scrape' | 'email-parse' | 'manual';
  feedUrl?: string;
  
  // Parsing config
  parserConfig?: {
    titleSelector?: string;
    dateSelector?: string;
    linkSelector?: string;
    summarySelector?: string;
  };
  
  // Status
  isActive: boolean;
  lastFetchDate?: string;
  lastSuccessDate?: string;
  lastErrorDate?: string;
  lastErrorMessage?: string;
  itemsProcessed: number;
  
  // Schedule
  fetchIntervalMinutes: number;
  nextScheduledFetch?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  id: string;
  feedId: string;
  
  // Content
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedDate: string;
  
  // Processing
  processedDate: string;
  convertedToDocumentId?: string;
  convertedToAlertId?: string;
  dismissed: boolean;
  dismissedBy?: string;
  dismissedReason?: string;
}

// ============================================================================
// CROSS-REGIONAL COMPARISON
// ============================================================================

export interface RegionalComparison {
  id: string;
  
  // What we're comparing
  topic: RegulatoryTopic;
  therapeuticArea?: TherapeuticArea;
  comparisonTitle: string;
  
  // Regions compared
  regionsCompared: RegulatoryAgencyId[];
  
  // Comparison data
  comparisonMatrix: RegionalComparisonRow[];
  
  // Analysis
  keyDifferences: string[];
  harmonizedAreas: string[];
  convergenceTrends: string[];
  divergenceAreas: string[];
  
  // Recommendations
  harmonizationStrategy?: string;
  regionSpecificConsiderations: RegionConsideration[];
  
  // Metadata
  comparisonDate: string;
  createdBy: string;
  validUntil?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface RegionalComparisonRow {
  aspect: string;
  description: string;
  values: { [agencyId: string]: string };
  harmonized: boolean;
  notes?: string;
}

export interface RegionConsideration {
  agency: RegulatoryAgencyId;
  consideration: string;
  priority: DeadlinePriority;
  actionRequired: boolean;
  suggestedAction?: string;
}

// ============================================================================
// REGULATORY CALENDAR
// ============================================================================

export interface RegulatoryCalendarEvent {
  id: string;
  
  // Event details
  title: string;
  description?: string;
  eventType: 'deadline' | 'meeting' | 'conference' | 'comment-period' | 'implementation' | 'publication' | 'reminder';
  
  // Timing
  startDate: string;
  endDate?: string;
  allDay: boolean;
  timezone?: string;
  
  // Source
  agency?: RegulatoryAgencyId;
  sourceDeadlineId?: string;
  sourceAlertId?: string;
  sourceGuidanceId?: string;
  
  // Scope
  programIds?: string[];
  
  // Attendees/Owners
  assignedTo?: string[];
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;
  
  // Reminders
  reminders: CalendarReminder[];
  
  // Status
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  
  createdAt: string;
  updatedAt: string;
}

export interface CalendarReminder {
  id: string;
  eventId: string;
  reminderType: 'email' | 'in-app' | 'both';
  triggerMinutesBefore: number;
  sent: boolean;
  sentDate?: string;
}

// ============================================================================
// REGULATORY INTELLIGENCE DASHBOARD
// ============================================================================

export interface RegIntelDashboard {
  // Summary counts
  totalGuidanceDocuments: number;
  documentsAddedThisMonth: number;
  documentsUpdatedThisMonth: number;
  
  // Alerts
  activeAlerts: number;
  criticalAlerts: number;
  alertsByCategory: { category: AlertCategory; count: number }[];
  alertsBySeverity: { severity: AlertSeverity; count: number }[];
  
  // Deadlines
  upcomingDeadlines: number;
  overdueDeadlines: number;
  deadlinesNext30Days: ComplianceDeadline[];
  deadlinesByPriority: { priority: DeadlinePriority; count: number }[];
  
  // Impact assessments
  pendingAssessments: number;
  assessmentsInProgress: number;
  openComplianceGaps: number;
  
  // By agency
  documentsByAgency: { agency: RegulatoryAgencyId; count: number }[];
  alertsByAgency: { agency: RegulatoryAgencyId; count: number }[];
  
  // Recent activity
  recentDocuments: GuidanceDocument[];
  recentAlerts: RegulatoryAlert[];
  recentChanges: GuidanceDocumentChange[];
  
  // Feed health
  activeFeedsCount: number;
  feedsWithErrors: number;
  lastFeedUpdate?: string;
  
  // Quick actions
  quickActions: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  actionType: 'view' | 'assess' | 'acknowledge' | 'create' | 'export';
  targetType: 'document' | 'alert' | 'deadline' | 'assessment';
  targetId?: string;
  priority: DeadlinePriority;
}

// ============================================================================
// SEARCH & FILTERING
// ============================================================================

export interface GuidanceSearchQuery {
  searchText?: string;
  agencies?: RegulatoryAgencyId[];
  documentTypes?: GuidanceDocumentType[];
  statuses?: GuidanceStatus[];
  therapeuticAreas?: TherapeuticArea[];
  topics?: RegulatoryTopic[];
  dateFrom?: string;
  dateTo?: string;
  keywords?: string[];
}

export interface GuidanceSearchResult {
  documents: GuidanceDocument[];
  totalCount: number;
  facets: {
    agencies: { value: RegulatoryAgencyId; count: number }[];
    types: { value: GuidanceDocumentType; count: number }[];
    statuses: { value: GuidanceStatus; count: number }[];
    topics: { value: RegulatoryTopic; count: number }[];
  };
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

export type RegIntelView = 
  | 'dashboard'
  | 'guidance-library'
  | 'alerts'
  | 'deadlines'
  | 'impact-assessments'
  | 'comparisons'
  | 'calendar'
  | 'feeds'
  | 'subscriptions'
  | 'settings';

export interface RegIntelFilters {
  agencies: RegulatoryAgencyId[];
  documentTypes: GuidanceDocumentType[];
  topics: RegulatoryTopic[];
  therapeuticAreas: TherapeuticArea[];
  alertSeverities: AlertSeverity[];
  deadlinePriorities: DeadlinePriority[];
  dateRange?: { from: string; to: string };
  searchText: string;
  showResolved: boolean;
  showDismissed: boolean;
}

export interface RegIntelState {
  // Data
  guidanceDocuments: GuidanceDocument[];
  documentChanges: GuidanceDocumentChange[];
  alerts: RegulatoryAlert[];
  deadlines: ComplianceDeadline[];
  extensionRequests: DeadlineExtensionRequest[];
  impactAssessments: ImpactAssessment[];
  complianceGaps: ComplianceGap[];
  recommendedActions: RecommendedAction[];
  subscriptions: MonitoringSubscription[];
  feeds: RegulatoryFeed[];
  feedItems: FeedItem[];
  regionalComparisons: RegionalComparison[];
  calendarEvents: RegulatoryCalendarEvent[];
  
  // Selections
  selectedDocumentId: string | null;
  selectedAlertId: string | null;
  selectedDeadlineId: string | null;
  selectedAssessmentId: string | null;
  selectedComparisonId: string | null;
  
  // UI state
  activeView: RegIntelView;
  filters: RegIntelFilters;
  isLoading: boolean;
  error: string | null;
  
  // Dashboard cache
  dashboardData: RegIntelDashboard | null;
  dashboardLastUpdated: string | null;
}

export interface RegIntelActions {
  // Guidance Documents
  addGuidanceDocument: (doc: Omit<GuidanceDocument, 'id' | 'addedToSystemDate' | 'lastUpdatedInSystem'>) => string;
  updateGuidanceDocument: (id: string, updates: Partial<GuidanceDocument>) => void;
  deleteGuidanceDocument: (id: string) => void;
  recordDocumentChange: (change: Omit<GuidanceDocumentChange, 'id'>) => string;
  searchGuidance: (query: GuidanceSearchQuery) => GuidanceSearchResult;
  
  // Alerts
  createAlert: (alert: Omit<RegulatoryAlert, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  updateAlert: (id: string, updates: Partial<RegulatoryAlert>) => void;
  acknowledgeAlert: (id: string, userId: string) => void;
  resolveAlert: (id: string, userId: string, notes?: string) => void;
  dismissAlert: (id: string, userId: string, reason?: string) => void;
  
  // Deadlines
  createDeadline: (deadline: Omit<ComplianceDeadline, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  updateDeadline: (id: string, updates: Partial<ComplianceDeadline>) => void;
  completeDeadline: (id: string, completedBy: string, documents?: string[]) => void;
  requestExtension: (request: Omit<DeadlineExtensionRequest, 'id' | 'status' | 'createdAt'>) => string;
  processExtensionRequest: (requestId: string, approved: boolean, reviewerId: string, response?: string) => void;
  
  // Impact Assessments
  createImpactAssessment: (triggerId: string, triggerType: ImpactAssessment['triggerType'], triggerTitle: string, assessedBy: string) => string;
  updateImpactAssessment: (id: string, updates: Partial<ImpactAssessment>) => void;
  addProgramImpact: (assessmentId: string, impact: ProgramImpact) => void;
  addSubmissionImpact: (assessmentId: string, impact: SubmissionImpact) => void;
  addCategoryImpact: (assessmentId: string, impact: CategoryImpact) => void;
  addComplianceGap: (gap: Omit<ComplianceGap, 'id' | 'status'>) => string;
  updateComplianceGap: (id: string, updates: Partial<ComplianceGap>) => void;
  addRecommendedAction: (action: Omit<RecommendedAction, 'id' | 'status'>) => string;
  updateRecommendedAction: (id: string, updates: Partial<RecommendedAction>) => void;
  submitAssessmentForReview: (id: string, reviewerId: string) => void;
  approveAssessment: (id: string, approverId: string) => void;
  
  // Subscriptions
  createSubscription: (sub: Omit<MonitoringSubscription, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSubscription: (id: string, updates: Partial<MonitoringSubscription>) => void;
  deleteSubscription: (id: string) => void;
  
  // Feeds
  addFeed: (feed: Omit<RegulatoryFeed, 'id' | 'itemsProcessed' | 'createdAt' | 'updatedAt'>) => string;
  updateFeed: (id: string, updates: Partial<RegulatoryFeed>) => void;
  processFeedItem: (item: Omit<FeedItem, 'id' | 'processedDate' | 'dismissed'>) => string;
  dismissFeedItem: (id: string, userId: string, reason?: string) => void;
  convertFeedItemToDocument: (itemId: string, doc: Omit<GuidanceDocument, 'id' | 'addedToSystemDate' | 'lastUpdatedInSystem'>) => string;
  convertFeedItemToAlert: (itemId: string, alert: Omit<RegulatoryAlert, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  
  // Regional Comparisons
  createComparison: (comparison: Omit<RegionalComparison, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateComparison: (id: string, updates: Partial<RegionalComparison>) => void;
  deleteComparison: (id: string) => void;
  
  // Calendar
  createCalendarEvent: (event: Omit<RegulatoryCalendarEvent, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  updateCalendarEvent: (id: string, updates: Partial<RegulatoryCalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  syncDeadlineToCalendar: (deadlineId: string) => string;
  
  // Dashboard
  refreshDashboard: () => RegIntelDashboard;
  
  // UI Actions
  setActiveView: (view: RegIntelView) => void;
  setFilters: (filters: Partial<RegIntelFilters>) => void;
  resetFilters: () => void;
  selectDocument: (id: string | null) => void;
  selectAlert: (id: string | null) => void;
  selectDeadline: (id: string | null) => void;
  selectAssessment: (id: string | null) => void;
  selectComparison: (id: string | null) => void;
  
  // Data loading
  loadRegIntelData: () => Promise<void>;
  
  // Clear
  clearAll: () => void;
}
