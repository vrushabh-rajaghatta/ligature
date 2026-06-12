
/**
 * EDC Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Electronic Data Capture integration types in Ligature.
 * 
 * Covers: EDC connectors (Medidata Rave, Veeva, Oracle, etc.), data mapping,
 * data feeds, query management, data review workflows, enrollment/visit/AE sync,
 * and cross-system integration.
 * 
 * @module domains/edc/contracts
 * @version 0.27.23
 */

// =============================================================================
// EDC VENDOR & CONNECTION ENUMS
// =============================================================================

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

export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'connecting' 
  | 'error' 
  | 'maintenance';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'paused';

export type DataFlowDirection = 'inbound' | 'outbound' | 'bidirectional';

export type EDCEnvironment = 'production' | 'validation' | 'development';

export type AuthMethod = 'oauth2' | 'api-key' | 'certificate' | 'basic';

// =============================================================================
// DATA MAPPING ENUMS
// =============================================================================

export type FieldDataType = 
  | 'text' | 'number' | 'date' | 'datetime' 
  | 'coded' | 'boolean' | 'file';

export type MappingStatus = 
  | 'mapped' | 'unmapped' | 'partial' 
  | 'deprecated' | 'review-needed';

export type TransformationType = 
  | 'direct' | 'lookup' | 'calculation' 
  | 'concatenation' | 'split' | 'custom';

export type TargetModule = 
  | 'enrollment' | 'visits' | 'safety' | 'efficacy' 
  | 'lab' | 'pk' | 'consent' | 'demographics';

export type ValidationRuleType = 
  | 'range' | 'pattern' | 'codelist' | 'crossfield' | 'custom';

export type MappingErrorType = 
  | 'missing-mapping' | 'type-mismatch' | 'codelist-mismatch' 
  | 'deprecated' | 'invalid-transform';

// =============================================================================
// DATA FEED ENUMS
// =============================================================================

export type FeedType = 
  | 'enrollment' | 'visit' | 'query' | 'deviation' 
  | 'ae' | 'lab' | 'disposition' | 'full-extract';

export type FeedStatus = 'active' | 'paused' | 'error' | 'disabled';

export type ScheduleType = 
  | 'continuous' | 'interval' | 'daily' | 'weekly' | 'on-demand';

export type FeedExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type FilterOperator = 
  | 'equals' | 'not-equals' | 'contains' 
  | 'greater-than' | 'less-than' | 'in' | 'between';

// =============================================================================
// QUERY MANAGEMENT ENUMS
// =============================================================================

export type QueryStatus = 
  | 'open' | 'answered' | 'closed' | 'cancelled' | 'requeried';

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

// =============================================================================
// DATA REVIEW ENUMS
// =============================================================================

export type ReviewStatus = 
  | 'not-started' | 'in-progress' | 'completed' 
  | 'on-hold' | 'cancelled';

export type ReviewOutcome = 'approved' | 'rejected' | 'needs-clarification';

export type ReviewerRole = 'primary' | 'secondary' | 'medical' | 'qc';

// =============================================================================
// SYNC ENUMS
// =============================================================================

export type EDCSyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export type DataEntryStatus = 
  | 'not-started' | 'in-progress' | 'complete' | 'frozen' | 'locked';

export type VisitSyncStatus = 
  | 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'unscheduled';

export type AESeriousness = 'non-serious' | 'serious';

export type AEExpectedness = 'expected' | 'unexpected';

// =============================================================================
// VIEW TYPES
// =============================================================================

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

// =============================================================================
// CONNECTOR INTERFACES
// =============================================================================

export interface EDCConnector {
  id: string;
  studyId: string;
  vendor: EDCVendor;
  vendorStudyId: string;
  vendorStudyName: string;
  environment: EDCEnvironment;
  baseUrl: string;
  apiVersion: string;
  authMethod: AuthMethod;
  connectionStatus: ConnectionStatus;
  lastConnectionTest: string;
  syncEnabled: boolean;
  syncDirection: DataFlowDirection;
  syncFrequencyMinutes: number;
  lastSyncAt: string;
  nextSyncAt: string;
  syncStatus: SyncStatus;
  lastSyncError?: string;
  mappingVersion: string;
  mappedForms: number;
  mappedFields: number;
  unmappedFields: number;
  averageSyncDuration: number;
  recordsProcessedLastSync: number;
  errorRatePercent: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface ConnectorHealthSummary {
  connectorId: string;
  vendor: EDCVendor;
  status: ConnectionStatus;
  syncStatus: SyncStatus;
  lastSync: string;
  errorCount24h: number;
  healthScore: number;
}

// =============================================================================
// MAPPING INTERFACES
// =============================================================================

export interface EDCFormMapping {
  id: string;
  connectorId: string;
  sourceFormOID: string;
  sourceFormName: string;
  sourceFormVersion: string;
  targetModule: TargetModule;
  targetEntity: string;
  status: MappingStatus;
  fieldMappings: EDCFieldMapping[];
  totalSourceFields: number;
  mappedFieldsCount: number;
  lastValidated: string;
  validationErrors: MappingValidationError[];
  isRepeating: boolean;
  repeatKey?: string;
  effectiveDate: string;
  retiredDate?: string;
}

export interface EDCFieldMapping {
  id: string;
  formMappingId: string;
  sourceFieldOID: string;
  sourceFieldName: string;
  sourceDataType: FieldDataType;
  sourceCodeList?: string;
  targetFieldPath: string;
  targetFieldName: string;
  targetDataType: FieldDataType;
  targetCodeList?: string;
  transformationType: TransformationType;
  transformationRule?: string;
  lookupTableId?: string;
  status: MappingStatus;
  validationRules: FieldValidationRule[];
  isRequired: boolean;
  defaultValue?: string;
}

export interface FieldValidationRule {
  id: string;
  ruleType: ValidationRuleType;
  expression: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface MappingValidationError {
  id: string;
  fieldMappingId?: string;
  errorType: MappingErrorType;
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

// =============================================================================
// DATA FEED INTERFACES
// =============================================================================

export interface DataFeed {
  id: string;
  connectorId: string;
  studyId: string;
  feedType: FeedType;
  feedName: string;
  description: string;
  isRealTime: boolean;
  scheduleType: ScheduleType;
  scheduleValue?: string;
  status: FeedStatus;
  lastExecutedAt: string;
  nextExecutedAt?: string;
  lastSuccessAt: string;
  lastErrorAt?: string;
  lastError?: string;
  totalRecordsProcessed: number;
  recordsInLastSync: number;
  averageProcessingTime: number;
  errorCount24h: number;
  filters: FeedFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedFilter {
  id: string;
  fieldPath: string;
  operator: FilterOperator;
  value: string | string[];
  isActive: boolean;
}

export interface FeedExecution {
  id: string;
  feedId: string;
  startedAt: string;
  completedAt?: string;
  status: FeedExecutionStatus;
  recordsRetrieved: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: FeedExecutionError[];
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

// =============================================================================
// QUERY INTERFACES
// =============================================================================

export interface EDCQuery {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  queryNumber: string;
  externalQueryId: string;
  formOID: string;
  formName: string;
  fieldOID?: string;
  fieldName?: string;
  recordId?: string;
  visitId?: string;
  visitName?: string;
  queryType: QueryType;
  category: QueryCategory;
  priority: QueryPriority;
  status: QueryStatus;
  queryText: string;
  responseText?: string;
  resolutionText?: string;
  openedAt: string;
  openedBy: string;
  answeredAt?: string;
  answeredBy?: string;
  closedAt?: string;
  closedBy?: string;
  daysOpen: number;
  isOverdue: boolean;
  dueDate?: string;
  assignedTo?: string;
  responses: QueryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface QueryResponse {
  id: string;
  responseText: string;
  respondedAt: string;
  respondedBy: string;
  responseType: 'site-response' | 'sponsor-comment' | 'requery';
}

export interface QueryMetrics {
  studyId: string;
  calculatedAt: string;
  totalQueries: number;
  openQueries: number;
  answeredQueries: number;
  closedQueries: number;
  overdueQueries: number;
  avgResolutionDays: number;
  queryRate: number;
  queriesByCategory: Record<QueryCategory, number>;
  queriesByPriority: Record<QueryPriority, number>;
  topQueryFields: { fieldName: string; count: number }[];
}

// =============================================================================
// DATA REVIEW INTERFACES
// =============================================================================

export interface DataReviewWorkflow {
  id: string;
  studyId: string;
  workflowName: string;
  description: string;
  reviewTypes: string[];
  requiredReviewers: number;
  autoAssign: boolean;
  escalationDays: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DataReviewItem {
  id: string;
  workflowId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  reviewType: string;
  dataScope: DataScope;
  status: ReviewStatus;
  priority: QueryPriority;
  assignedTo?: string;
  dueDate?: string;
  reviews: DataReview[];
  createdAt: string;
  updatedAt: string;
}

export interface DataScope {
  formIds: string[];
  visitIds?: string[];
  dateRange?: { start: string; end: string };
  description: string;
}

export interface DataReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  outcome: ReviewOutcome;
  comments: string;
  findings: ReviewFinding[];
  reviewedAt: string;
}

export interface ReviewFinding {
  id: string;
  fieldPath: string;
  findingType: 'error' | 'warning' | 'note';
  description: string;
  suggestedAction?: string;
}

// =============================================================================
// SYNC RECORD INTERFACES
// =============================================================================

export interface EnrollmentSyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  edcSubjectId: string;
  edcScreeningId: string;
  ctmsSubjectId?: string;
  syncStatus: EDCSyncStatus;
  lastSyncAt: string;
  enrollmentDate?: string;
  randomizationDate?: string;
  randomizationNumber?: string;
  armAssignment?: string;
  enrollmentStatus: string;
  screeningStatus: string;
  consentDate?: string;
  withdrawalDate?: string;
  withdrawalReason?: string;
  conflicts: SyncConflict[];
  createdAt: string;
  updatedAt: string;
}

export interface VisitSyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  edcVisitId: string;
  edcVisitName: string;
  edcVisitDate?: string;
  ctmsVisitId?: string;
  ctmsVisitDefId?: string;
  syncStatus: EDCSyncStatus;
  lastSyncAt: string;
  visitStatus: VisitSyncStatus;
  visitDate?: string;
  windowStart?: string;
  windowEnd?: string;
  isWithinWindow: boolean;
  dataEntryStatus: DataEntryStatus;
  formsCompleted: number;
  totalForms: number;
  queriesOpen: number;
  createdAt: string;
  updatedAt: string;
}

export interface AESyncRecord {
  id: string;
  connectorId: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  edcAEId: string;
  edcAENumber: string;
  safetyAEId?: string;
  icsrId?: string;
  syncStatus: EDCSyncStatus;
  lastSyncAt: string;
  aeterm: string;
  aePT?: string;
  aeSOC?: string;
  onsetDate: string;
  resolvedDate?: string;
  outcome: string;
  severity: string;
  seriousness: AESeriousness;
  causality: string;
  expectedness?: AEExpectedness;
  seriousCriteria?: string[];
  requiresExpedited: boolean;
  expeditedDueDate?: string;
  expeditedSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncConflict {
  id: string;
  fieldPath: string;
  edcValue: string;
  ctmsValue: string;
  conflictType: 'value-mismatch' | 'missing-edc' | 'missing-ctms';
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: 'edc-wins' | 'ctms-wins' | 'manual';
  resolvedValue?: string;
}

// =============================================================================
// DASHBOARD INTERFACES
// =============================================================================

export interface EDCDashboardData {
  studyId: string;
  asOfDate: string;
  connectors: ConnectorHealthSummary[];
  lastDataSync: string;
  dataLagMinutes: number;
  totalSubjects: number;
  totalForms: number;
  totalDataPoints: number;
  queryRate: number;
  openQueries: number;
  overdueQueries: number;
  dataCompleteness: number;
  syncErrorsLast24h: number;
  recordsProcessedLast24h: number;
  pendingReviews: number;
  reviewBacklog: number;
  siteDataStatus: SiteDataStatus[];
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
  dataEntryLag: number;
  lastDataEntry: string;
  status: 'good' | 'attention' | 'critical';
}

// =============================================================================
// FILTER INTERFACES
// =============================================================================

export interface EDCFilters {
  studyId?: string;
  siteId?: string;
  connectorId?: string;
  vendor?: EDCVendor[];
  connectionStatus?: ConnectionStatus[];
  queryStatus?: QueryStatus[];
  queryPriority?: QueryPriority[];
  reviewStatus?: ReviewStatus[];
  syncStatus?: EDCSyncStatus[];
  dateRange?: { start: string; end: string };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const EDC_VENDOR_LABELS: Record<EDCVendor, string> = {
  'medidata-rave': 'Medidata Rave',
  'veeva-edc': 'Veeva Vault EDC',
  'oracle-inform': 'Oracle InForm',
  'oracle-clinical-one': 'Oracle Clinical One',
  'medrio': 'Medrio',
  'castor': 'Castor EDC',
  'openclinica': 'OpenClinica',
  'redcap': 'REDCap',
  'custom': 'Custom/Other',
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  error: 'Error',
  maintenance: 'Maintenance',
};

export const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-green-100 text-green-800',
  disconnected: 'bg-gray-100 text-gray-800',
  connecting: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  idle: 'Idle',
  syncing: 'Syncing...',
  error: 'Error',
  paused: 'Paused',
};

export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  idle: 'bg-gray-100 text-gray-800',
  syncing: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  closed: 'Closed',
  cancelled: 'Cancelled',
  requeried: 'Requeried',
};

export const QUERY_STATUS_COLORS: Record<QueryStatus, string> = {
  open: 'bg-red-100 text-red-800',
  answered: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  requeried: 'bg-orange-100 text-orange-800',
};

export const QUERY_PRIORITY_LABELS: Record<QueryPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const QUERY_PRIORITY_COLORS: Record<QueryPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const QUERY_CATEGORY_LABELS: Record<QueryCategory, string> = {
  'missing-data': 'Missing Data',
  'data-inconsistency': 'Data Inconsistency',
  'protocol-deviation': 'Protocol Deviation',
  'range-check': 'Range Check',
  'edit-check': 'Edit Check',
  'clarification': 'Clarification',
  'ae-follow-up': 'AE Follow-Up',
  'consent': 'Consent',
  'other': 'Other',
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  mapped: 'Mapped',
  unmapped: 'Unmapped',
  partial: 'Partial',
  deprecated: 'Deprecated',
  'review-needed': 'Review Needed',
};

export const MAPPING_STATUS_COLORS: Record<MappingStatus, string> = {
  mapped: 'bg-green-100 text-green-800',
  unmapped: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  deprecated: 'bg-gray-100 text-gray-800',
  'review-needed': 'bg-orange-100 text-orange-800',
};

export const FEED_STATUS_LABELS: Record<FeedStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
  disabled: 'Disabled',
};

export const FEED_STATUS_COLORS: Record<FeedStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  disabled: 'bg-gray-100 text-gray-800',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  'on-hold': 'On Hold',
  cancelled: 'Cancelled',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-200 text-gray-600',
};

export const DATA_ENTRY_STATUS_LABELS: Record<DataEntryStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  complete: 'Complete',
  frozen: 'Frozen',
  locked: 'Locked',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isEDCVendor(value: string): value is EDCVendor {
  return ['medidata-rave', 'veeva-edc', 'oracle-inform', 'oracle-clinical-one', 
          'medrio', 'castor', 'openclinica', 'redcap', 'custom'].includes(value);
}

export function isConnectionStatus(value: string): value is ConnectionStatus {
  return ['connected', 'disconnected', 'connecting', 'error', 'maintenance'].includes(value);
}

export function isQueryStatus(value: string): value is QueryStatus {
  return ['open', 'answered', 'closed', 'cancelled', 'requeried'].includes(value);
}

export function isQueryPriority(value: string): value is QueryPriority {
  return ['low', 'medium', 'high', 'critical'].includes(value);
}

export function isMappingStatus(value: string): value is MappingStatus {
  return ['mapped', 'unmapped', 'partial', 'deprecated', 'review-needed'].includes(value);
}

export function isFeedStatus(value: string): value is FeedStatus {
  return ['active', 'paused', 'error', 'disabled'].includes(value);
}

export function isEDCSyncStatus(value: string): value is EDCSyncStatus {
  return ['synced', 'pending', 'conflict', 'error'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isConnectorHealthy(connector: EDCConnector): boolean {
  return connector.connectionStatus === 'connected' && 
         connector.syncStatus !== 'error' &&
         connector.errorRatePercent < 5;
}

export function calculateMappingCompleteness(mapping: EDCFormMapping): number {
  if (mapping.totalSourceFields === 0) return 0;
  return Math.round((mapping.mappedFieldsCount / mapping.totalSourceFields) * 100);
}

export function isQueryOverdue(query: EDCQuery): boolean {
  if (!query.dueDate) return false;
  if (query.status === 'closed' || query.status === 'cancelled') return false;
  return new Date(query.dueDate) < new Date();
}

export function calculateQueryMetrics(queries: EDCQuery[]): {
  total: number;
  open: number;
  overdue: number;
  avgDaysOpen: number;
} {
  const total = queries.length;
  const open = queries.filter(q => q.status === 'open' || q.status === 'requeried').length;
  const overdue = queries.filter(q => isQueryOverdue(q)).length;
  const openQueries = queries.filter(q => q.status !== 'closed' && q.status !== 'cancelled');
  const avgDaysOpen = openQueries.length > 0 
    ? openQueries.reduce((sum, q) => sum + q.daysOpen, 0) / openQueries.length 
    : 0;
  
  return { total, open, overdue, avgDaysOpen: Math.round(avgDaysOpen * 10) / 10 };
}

export function getSiteDataHealthStatus(site: SiteDataStatus): 'good' | 'attention' | 'critical' {
  if (site.completionPercent < 50 || site.queryRate > 15 || site.dataEntryLag > 7) {
    return 'critical';
  }
  if (site.completionPercent < 75 || site.queryRate > 10 || site.dataEntryLag > 3) {
    return 'attention';
  }
  return 'good';
}

export function calculateConnectorHealth(connector: EDCConnector): number {
  let score = 100;
  
  if (connector.connectionStatus !== 'connected') score -= 40;
  if (connector.syncStatus === 'error') score -= 30;
  if (connector.syncStatus === 'paused') score -= 10;
  if (connector.errorRatePercent > 10) score -= 20;
  else if (connector.errorRatePercent > 5) score -= 10;
  if (connector.unmappedFields > 10) score -= 10;
  
  return Math.max(0, score);
}

export function hasSyncConflicts(record: EnrollmentSyncRecord | VisitSyncRecord): boolean {
  if ('conflicts' in record) {
    return record.conflicts.some(c => !c.resolvedAt);
  }
  return record.syncStatus === 'conflict';
}

export function formatSyncTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getDataLagStatus(lagMinutes: number): 'current' | 'delayed' | 'stale' {
  if (lagMinutes < 15) return 'current';
  if (lagMinutes < 60) return 'delayed';
  return 'stale';
}

export function calculateOverallDataCompleteness(
  sites: SiteDataStatus[]
): number {
  if (sites.length === 0) return 0;
  const totalComplete = sites.reduce((sum, s) => sum + s.formsComplete, 0);
  const totalForms = sites.reduce((sum, s) => sum + s.formsTotal, 0);
  return totalForms > 0 ? Math.round((totalComplete / totalForms) * 100) : 0;
}
