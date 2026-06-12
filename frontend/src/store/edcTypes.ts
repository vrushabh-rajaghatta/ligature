
// ============================================================================
// EDC Types - Electronic Data Capture Integration Layer (v52)
// Comprehensive types for EDC connectors, real-time data feeds,
// query management, data review workflows, and cross-system integration
// ============================================================================

// ============================================================================
// EDC SYSTEM TYPES
// ============================================================================

export type EDCVendor = 
  | 'medidata-rave'
  | 'veeva-edc'
  | 'oracle-inform'
  | 'oracle-clinical-one'
  | 'medrio'
  | 'castor'
  | 'openclinica'
  | 'redcap'
  | 'custom';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'maintenance';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'paused';
export type DataFlowDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface EDCConnector {
  id: string;
  studyId: string;
  
  // Vendor configuration
  vendor: EDCVendor;
  vendorStudyId: string; // Study ID in the external EDC system
  vendorStudyName: string;
  environment: 'production' | 'validation' | 'development';
  
  // Connection details
  baseUrl: string;
  apiVersion: string;
  authMethod: 'oauth2' | 'api-key' | 'certificate' | 'basic';
  connectionStatus: ConnectionStatus;
  lastConnectionTest: string;
  
  // Sync configuration
  syncEnabled: boolean;
  syncDirection: DataFlowDirection;
  syncFrequencyMinutes: number;
  lastSyncAt: string;
  nextSyncAt: string;
  syncStatus: SyncStatus;
  lastSyncError?: string;
  
  // Data mapping
  mappingVersion: string;
  mappedForms: number;
  mappedFields: number;
  unmappedFields: number;
  
  // Performance metrics
  averageSyncDuration: number; // seconds
  recordsProcessedLastSync: number;
  errorRatePercent: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

// ============================================================================
// DATA MAPPING TYPES
// ============================================================================

export type FieldDataType = 'text' | 'number' | 'date' | 'datetime' | 'coded' | 'boolean' | 'file';
export type MappingStatus = 'mapped' | 'unmapped' | 'partial' | 'deprecated' | 'review-needed';

export interface EDCFormMapping {
  id: string;
  connectorId: string;
  
  // Source (EDC)
  sourceFormOID: string;
  sourceFormName: string;
  sourceFormVersion: string;
  
  // Target (CTMS/Internal)
  targetModule: 'enrollment' | 'visits' | 'safety' | 'efficacy' | 'lab' | 'pk' | 'consent' | 'demographics';
  targetEntity: string;
  
  // Mapping details
  status: MappingStatus;
  fieldMappings: EDCFieldMapping[];
  totalSourceFields: number;
  mappedFieldsCount: number;
  
  // Validation
  lastValidated: string;
  validationErrors: MappingValidationError[];
  
  // Metadata
  isRepeating: boolean;
  repeatKey?: string;
  effectiveDate: string;
  retiredDate?: string;
}

export interface EDCFieldMapping {
  id: string;
  formMappingId: string;
  
  // Source field
  sourceFieldOID: string;
  sourceFieldName: string;
  sourceDataType: FieldDataType;
  sourceCodeList?: string;
  
  // Target field
  targetFieldPath: string;
  targetFieldName: string;
  targetDataType: FieldDataType;
  targetCodeList?: string;
  
  // Transformation
  transformationType: 'direct' | 'lookup' | 'calculation' | 'concatenation' | 'split' | 'custom';
  transformationRule?: string;
  lookupTableId?: string;
  
  // Validation
  status: MappingStatus;
  validationRules: FieldValidationRule[];
  
  // Required/Optional
  isRequired: boolean;
  defaultValue?: string;
}

export interface FieldValidationRule {
  id: string;
  ruleType: 'range' | 'pattern' | 'codelist' | 'crossfield' | 'custom';
  expression: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface MappingValidationError {
  id: string;
  fieldMappingId?: string;
  errorType: 'missing-mapping' | 'type-mismatch' | 'codelist-mismatch' | 'deprecated' | 'invalid-transform';
  message: string;
  severity: 'error' | 'warning';
  suggestedFix?: string;
}

export interface CodeListMapping {
  id: string;
  connectorId: string;
  
  sourceCodeListId: string;
  sourceCodeListName: string;
  targetCodeListId: string;
  targetCodeListName: string;
  
  items: CodeListItemMapping[];
  unmappedSourceItems: string[];
  unmappedTargetItems: string[];
  
  status: MappingStatus;
  lastUpdated: string;
}

export interface CodeListItemMapping {
  sourceCode: string;
  sourceDecoded: string;
  targetCode: string;
  targetDecoded: string;
  isExactMatch: boolean;
}

// ============================================================================
// DATA FEED TYPES
// ============================================================================

export type FeedType = 'enrollment' | 'visit' | 'query' | 'deviation' | 'ae' | 'lab' | 'disposition' | 'full-extract';
export type FeedStatus = 'active' | 'paused' | 'error' | 'disabled';

export interface DataFeed {
  id: string;
  connectorId: string;
  studyId: string;
  
  // Feed configuration
  feedType: FeedType;
  feedName: string;
  description: string;
  
  // Schedule
  isRealTime: boolean;
  scheduleType: 'continuous' | 'interval' | 'daily' | 'weekly' | 'on-demand';
  scheduleValue?: string; // cron expression or interval
  
  // Status
  status: FeedStatus;
  lastExecutedAt: string;
  nextExecutedAt?: string;
  lastSuccessAt: string;
  lastErrorAt?: string;
  lastError?: string;
  
  // Metrics
  totalRecordsProcessed: number;
  recordsInLastSync: number;
  averageProcessingTime: number; // seconds
  errorCount24h: number;
  
  // Filters
  filters: FeedFilter[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface FeedFilter {
  id: string;
  fieldPath: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'between';
  value: string | string[];
  isActive: boolean;
}

export interface FeedExecution {
  id: string;
  feedId: string;
  
  // Execution details
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Results
  recordsRetrieved: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  
  // Errors
  errors: FeedExecutionError[];
  
  // Performance
  durationMs: number;
  apiCallCount: number;
}

export interface FeedExecutionError {
  id: string;
  recordId?: string;
  errorCode: string;
  message: string;
  stackTrace?: string;
  timestamp: string;
}

// ============================================================================
// QUERY MANAGEMENT TYPES
// ============================================================================

export type QueryStatus = 'open' | 'answered' | 'closed' | 'cancelled' | 'requeried';
export type QueryType = 'manual' | 'auto' | 'system' | 'edit-check';
export type QueryPriority = 'low' | 'medium' | 'high' | 'critical';
export type QueryCategory = 
  | 'missing-data'
  | 'data-inconsistency' 
  | 'protocol-deviation'
  | 'range-check'
  | 'edit-check'
  | 'clarification'
  | 'ae-follow-up'
  | 'consent'
  | 'other';

export interface EDCQuery {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Query identification
  queryNumber: string;
  externalQueryId: string; // ID in EDC system
  
  // Location
  formOID: string;
  formName: string;
  fieldOID: string;
  fieldName: string;
  visitName?: string;
  repeatKey?: string;
  
  // Query details
  type: QueryType;
  category: QueryCategory;
  priority: QueryPriority;
  status: QueryStatus;
  
  // Content
  queryText: string;
  currentValue?: string;
  expectedValue?: string;
  
  // Response
  responseText?: string;
  responseValue?: string;
  respondedBy?: string;
  respondedAt?: string;
  
  // Resolution
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  
  // Workflow
  assignedTo?: string;
  dueDate?: string;
  isOverdue: boolean;
  requiresFollowUp: boolean;
  followUpCount: number;
  
  // History
  history: QueryHistoryEntry[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface QueryHistoryEntry {
  id: string;
  timestamp: string;
  action: 'created' | 'answered' | 'closed' | 'reopened' | 'reassigned' | 'updated' | 'escalated';
  performedBy: string;
  previousStatus?: QueryStatus;
  newStatus?: QueryStatus;
  comment?: string;
}

export interface QueryMetrics {
  studyId: string;
  asOfDate: string;
  
  // Volume
  totalQueries: number;
  openQueries: number;
  answeredQueries: number;
  closedQueries: number;
  
  // Performance
  queryRate: number; // queries per 100 subjects
  averageResolutionDays: number;
  overdueCount: number;
  overduePercent: number;
  
  // By category
  byCategory: { category: QueryCategory; count: number; openCount: number }[];
  
  // By site
  bySite: { siteId: string; siteName: string; total: number; open: number; rate: number }[];
  
  // By priority
  byPriority: { priority: QueryPriority; count: number; openCount: number; avgResolutionDays: number }[];
  
  // Trend
  weeklyTrend: { week: string; opened: number; closed: number; netChange: number }[];
  
  // Aging
  aging: {
    lessThan7Days: number;
    between7And14Days: number;
    between14And30Days: number;
    moreThan30Days: number;
  };
}

// ============================================================================
// DATA REVIEW TYPES
// ============================================================================

export type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'escalated';
export type ReviewType = 'sdv' | 'medical' | 'data-management' | 'biostatistics' | 'safety';

export interface DataReviewWorkflow {
  id: string;
  studyId: string;
  connectorId: string;
  
  // Workflow configuration
  name: string;
  reviewType: ReviewType;
  description: string;
  
  // Scope
  scope: ReviewScope;
  
  // Steps
  steps: ReviewWorkflowStep[];
  
  // Status
  isActive: boolean;
  
  // Metrics
  pendingReviews: number;
  completedToday: number;
  averageReviewTime: number; // minutes
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface ReviewScope {
  forms: string[]; // Form OIDs, empty = all forms
  visits: string[]; // Visit names, empty = all visits
  sites: string[]; // Site IDs, empty = all sites
  subjectCriteria?: string; // Filter expression
}

export interface ReviewWorkflowStep {
  id: string;
  order: number;
  name: string;
  role: string;
  isRequired: boolean;
  autoApproveAfterDays?: number;
  escalateAfterDays?: number;
}

export interface DataReviewItem {
  id: string;
  workflowId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Data location
  formOID: string;
  formName: string;
  visitName: string;
  repeatKey?: string;
  
  // Review details
  status: ReviewStatus;
  currentStep: number;
  assignedTo?: string;
  
  // Data snapshot
  dataSnapshot: Record<string, unknown>;
  previousSnapshot?: Record<string, unknown>;
  changedFields: string[];
  
  // SDV specific
  isSDV: boolean;
  sdvStatus?: 'not-started' | 'partial' | 'complete';
  sdvPercent?: number;
  
  // Review history
  reviews: DataReview[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  isOverdue: boolean;
}

export interface DataReview {
  id: string;
  reviewItemId: string;
  step: number;
  
  // Reviewer
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  
  // Decision
  decision: 'approved' | 'rejected' | 'escalated';
  comments?: string;
  
  // Findings
  findings: ReviewFinding[];
  
  // Timing
  assignedAt: string;
  completedAt: string;
  durationMinutes: number;
}

export interface ReviewFinding {
  id: string;
  fieldOID: string;
  fieldName: string;
  findingType: 'discrepancy' | 'missing' | 'query-needed' | 'protocol-deviation' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  action?: 'query-raised' | 'deviation-logged' | 'corrected' | 'accepted';
}

// ============================================================================
// ENROLLMENT SYNC TYPES
// ============================================================================

export interface EnrollmentSyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  
  // EDC subject info
  edcSubjectId: string;
  edcSubjectNumber: string;
  edcSiteNumber: string;
  
  // CTMS mapping
  ctmsSubjectId?: string;
  ctmsSiteId?: string;
  
  // Status
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncAt: string;
  
  // Enrollment data
  screeningDate?: string;
  enrollmentDate?: string;
  randomizationDate?: string;
  treatmentArm?: string;
  
  // Current status
  subjectStatus: 'screening' | 'screen-failed' | 'enrolled' | 'randomized' | 'on-treatment' | 'completed' | 'discontinued' | 'withdrawn';
  statusDate: string;
  
  // Conflicts
  conflicts?: EnrollmentConflict[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentConflict {
  id: string;
  field: string;
  edcValue: string;
  ctmsValue: string;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'edc-wins' | 'ctms-wins' | 'manual' | 'ignored';
  resolvedBy?: string;
}

// ============================================================================
// VISIT SYNC TYPES
// ============================================================================

export interface VisitSyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // EDC visit info
  edcVisitOID: string;
  edcVisitName: string;
  edcVisitDate?: string;
  
  // CTMS mapping
  ctmsVisitId?: string;
  ctmsVisitDefId?: string;
  
  // Status
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncAt: string;
  
  // Visit data
  visitStatus: 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'unscheduled';
  visitDate?: string;
  windowStart?: string;
  windowEnd?: string;
  isWithinWindow: boolean;
  
  // Data entry
  dataEntryStatus: 'not-started' | 'in-progress' | 'complete' | 'frozen' | 'locked';
  formsCompleted: number;
  totalForms: number;
  queriesOpen: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AE SYNC TYPES
// ============================================================================

export interface AESyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // EDC AE info
  edcAEId: string;
  edcAENumber: string;
  
  // CTMS/Safety mapping
  safetyAEId?: string;
  icsrId?: string;
  
  // Status
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncAt: string;
  
  // AE data
  aeterm: string;
  aePT?: string; // MedDRA preferred term
  aeSOC?: string; // System organ class
  onsetDate: string;
  resolvedDate?: string;
  outcome: string;
  severity: string;
  seriousness: 'non-serious' | 'serious';
  causality: string;
  expectedness?: 'expected' | 'unexpected';
  
  // Serious criteria (if SAE)
  seriousCriteria?: string[];
  
  // Expedited reporting
  requiresExpedited: boolean;
  expeditedDueDate?: string;
  expeditedSubmittedAt?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface EDCDashboardData {
  studyId: string;
  asOfDate: string;
  
  // Connection health
  connectors: ConnectorHealthSummary[];
  
  // Data freshness
  lastDataSync: string;
  dataLagMinutes: number;
  
  // Volume metrics
  totalSubjects: number;
  totalForms: number;
  totalDataPoints: number;
  
  // Quality metrics
  queryRate: number;
  openQueries: number;
  overdueQueries: number;
  dataCompleteness: number;
  
  // Sync metrics
  syncErrorsLast24h: number;
  recordsProcessedLast24h: number;
  
  // Review status
  pendingReviews: number;
  reviewBacklog: number;
  
  // By site
  siteDataStatus: SiteDataStatus[];
}

export interface ConnectorHealthSummary {
  connectorId: string;
  vendor: EDCVendor;
  status: ConnectionStatus;
  syncStatus: SyncStatus;
  lastSync: string;
  errorCount24h: number;
  healthScore: number; // 0-100
}

export interface SiteDataStatus {
  siteId: string;
  siteName: string;
  siteNumber: string;
  
  subjects: number;
  formsComplete: number;
  formsTotal: number;
  completionPercent: number;
  
  openQueries: number;
  queryRate: number;
  
  dataEntryLag: number; // days
  lastDataEntry: string;
  
  status: 'good' | 'attention' | 'critical';
}

// ============================================================================
// EDC STATE TYPES
// ============================================================================

export interface EDCState {
  // Connectors
  connectors: Record<string, EDCConnector>;
  connectorsByStudy: Record<string, string[]>;
  
  // Mappings
  formMappings: Record<string, EDCFormMapping>;
  formMappingsByConnector: Record<string, string[]>;
  codeListMappings: Record<string, CodeListMapping>;
  
  // Data feeds
  dataFeeds: Record<string, DataFeed>;
  feedsByConnector: Record<string, string[]>;
  feedExecutions: Record<string, FeedExecution[]>;
  
  // Queries
  queries: Record<string, EDCQuery>;
  queriesByStudy: Record<string, string[]>;
  queriesBySite: Record<string, string[]>;
  queryMetrics: Record<string, QueryMetrics>;
  
  // Data review
  reviewWorkflows: Record<string, DataReviewWorkflow>;
  reviewItems: Record<string, DataReviewItem>;
  reviewItemsByWorkflow: Record<string, string[]>;
  
  // Enrollment sync
  enrollmentSync: Record<string, EnrollmentSyncRecord>;
  enrollmentSyncByStudy: Record<string, string[]>;
  
  // Visit sync
  visitSync: Record<string, VisitSyncRecord>;
  visitSyncByStudy: Record<string, string[]>;
  
  // AE sync
  aeSync: Record<string, AESyncRecord>;
  aeSyncByStudy: Record<string, string[]>;
  
  // Dashboard
  dashboardData: Record<string, EDCDashboardData>;
  
  // UI State
  selectedConnectorId: string | null;
  selectedFeedId: string | null;
  selectedQueryId: string | null;
  activeView: EDCView;
  filters: EDCFilters;
  isLoading: boolean;
  lastError: string | null;
}

export type EDCView = 
  | 'connectors'
  | 'connector-detail'
  | 'mappings'
  | 'mapping-detail'
  | 'feeds'
  | 'feed-detail'
  | 'queries'
  | 'query-detail'
  | 'reviews'
  | 'review-detail'
  | 'enrollment-sync'
  | 'visit-sync'
  | 'ae-sync'
  | 'dashboard';

export interface EDCFilters {
  studyId?: string;
  siteId?: string;
  connectorId?: string;
  vendor?: EDCVendor[];
  connectionStatus?: ConnectionStatus[];
  queryStatus?: QueryStatus[];
  queryPriority?: QueryPriority[];
  reviewStatus?: ReviewStatus[];
  syncStatus?: ('synced' | 'pending' | 'conflict' | 'error')[];
  dateRange?: { start: string; end: string };
}

// ============================================================================
// EDC ACTIONS
// ============================================================================

export interface EDCActions {
  // Connector management
  addConnector(connector: Partial<EDCConnector>): EDCConnector;
  updateConnector(connectorId: string, updates: Partial<EDCConnector>): void;
  removeConnector(connectorId: string): void;
  testConnection(connectorId: string): Promise<{ success: boolean; message: string }>;
  syncConnector(connectorId: string): Promise<void>;
  
  // Mapping management
  addFormMapping(mapping: Partial<EDCFormMapping>): EDCFormMapping;
  updateFormMapping(mappingId: string, updates: Partial<EDCFormMapping>): void;
  addFieldMapping(formMappingId: string, fieldMapping: Partial<EDCFieldMapping>): EDCFieldMapping;
  updateFieldMapping(formMappingId: string, fieldMappingId: string, updates: Partial<EDCFieldMapping>): void;
  validateMapping(mappingId: string): MappingValidationError[];
  
  // Data feed management
  addDataFeed(feed: Partial<DataFeed>): DataFeed;
  updateDataFeed(feedId: string, updates: Partial<DataFeed>): void;
  removeDataFeed(feedId: string): void;
  executeFeed(feedId: string): Promise<FeedExecution>;
  pauseFeed(feedId: string): void;
  resumeFeed(feedId: string): void;
  
  // Query management
  createQuery(query: Partial<EDCQuery>): EDCQuery;
  updateQuery(queryId: string, updates: Partial<EDCQuery>): void;
  answerQuery(queryId: string, response: string, respondedBy: string): void;
  closeQuery(queryId: string, resolvedBy: string, notes?: string): void;
  reopenQuery(queryId: string, reason: string): void;
  assignQuery(queryId: string, assignee: string): void;
  bulkCloseQueries(queryIds: string[], resolvedBy: string): void;
  calculateQueryMetrics(studyId: string): QueryMetrics;
  
  // Data review
  createReviewWorkflow(workflow: Partial<DataReviewWorkflow>): DataReviewWorkflow;
  updateReviewWorkflow(workflowId: string, updates: Partial<DataReviewWorkflow>): void;
  createReviewItem(item: Partial<DataReviewItem>): DataReviewItem;
  submitReview(reviewItemId: string, review: Partial<DataReview>): void;
  assignReviewItem(reviewItemId: string, assignee: string): void;
  
  // Enrollment sync
  syncEnrollment(connectorId: string): Promise<EnrollmentSyncRecord[]>;
  resolveEnrollmentConflict(syncRecordId: string, conflictId: string, resolution: 'edc-wins' | 'ctms-wins' | 'manual', resolvedBy: string): void;
  
  // Visit sync
  syncVisits(connectorId: string): Promise<VisitSyncRecord[]>;
  
  // AE sync
  syncAEs(connectorId: string): Promise<AESyncRecord[]>;
  
  // Dashboard
  refreshDashboard(studyId: string): EDCDashboardData;
  
  // UI actions
  setSelectedConnector(connectorId: string | null): void;
  setSelectedFeed(feedId: string | null): void;
  setSelectedQuery(queryId: string | null): void;
  setActiveView(view: EDCView): void;
  setFilters(filters: Partial<EDCFilters>): void;
  clearFilters(): void;
}
