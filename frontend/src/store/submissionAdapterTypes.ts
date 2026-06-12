
// ============================================================================
// Accumulus Submission Adapter Types (v197)
// API-first architecture for continuous regulatory data exchange
// Supports Accumulus Synergy platform and future cloud-based submission paradigms
// ============================================================================

// ============================================================================
// CORE ADAPTER INFRASTRUCTURE
// ============================================================================

/**
 * Submission Adapter - The bridge between Ligature and external regulatory systems
 * Supports both traditional eCTD and emerging API-based submission platforms
 */
export interface SubmissionAdapter {
  id: string;
  name: string;
  description: string;
  adapterType: SubmissionAdapterType;
  
  // Connection
  endpoint: string;
  authType: AdapterAuthType;
  status: AdapterStatus;
  
  // Capabilities
  capabilities: AdapterCapability[];
  supportedFormats: DataExchangeFormat[];
  supportedRegions: AdapterRegion[];
  
  // Configuration
  configuration: AdapterConfiguration;
  
  // Rate limits
  rateLimits: AdapterRateLimits;
  
  // Health
  healthCheck: AdapterHealthCheck;
  lastSuccessfulConnection: string | null;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type SubmissionAdapterType = 
  | 'accumulus-synergy' // Accumulus Synergy cloud platform
  | 'fda-gateway' // FDA ESG
  | 'ema-gateway' // EMA CESP
  | 'pmda-gateway' // PMDA Gateway
  | 'hc-gateway' // Health Canada Common Submission Portal
  | 'custom-api' // Custom REST/GraphQL API
  | 'ectd-local'; // Traditional eCTD (file-based)

export type AdapterAuthType = 
  | 'oauth2' | 'api-key' | 'certificate' | 'saml' | 'basic' | 'none';

export type AdapterStatus = 
  | 'active' | 'inactive' | 'pending-approval' | 'error' | 'maintenance';

export type AdapterCapability = 
  | 'submit' | 'query' | 'retrieve' | 'update' | 'delete'
  | 'validate' | 'acknowledge' | 'status-check' | 'bulk-operations'
  | 'real-time-updates' | 'webhooks' | 'streaming';

export type DataExchangeFormat = 
  | 'ectd-xml' | 'ectd-json' | 'fhir' | 'idmp-xml' | 'spl-xml'
  | 'pdf' | 'xpt' | 'define-xml' | 'custom';

export type AdapterRegion = 
  | 'us' | 'eu' | 'japan' | 'china' | 'canada' | 'uk' | 'australia'
  | 'brazil' | 'korea' | 'singapore' | 'global';

export interface AdapterConfiguration {
  // Connection settings
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number;
  
  // Authentication
  credentials?: AdapterCredentials;
  
  // Proxy settings
  proxy?: ProxyConfiguration;
  
  // Custom headers
  headers?: Record<string, string>;
  
  // Feature flags
  enableCompression: boolean;
  enableEncryption: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
}

export interface AdapterCredentials {
  type: AdapterAuthType;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  certificate?: string;
  privateKey?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
}

export interface ProxyConfiguration {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
}

export interface AdapterRateLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  maxPayloadSize: number; // bytes
  maxConcurrentRequests: number;
}

export interface AdapterHealthCheck {
  lastCheck: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  errorRate: number;
  uptime: number;
  lastError?: string;
}

// ============================================================================
// CONTINUOUS SUBMISSION PIPELINE
// ============================================================================

/**
 * Continuous Submission Pipeline - Real-time data flow from source to authority
 * Eliminates batch processing delays inherent in traditional eCTD
 */
export interface ContinuousSubmissionPipeline {
  id: string;
  name: string;
  description: string;
  
  // Target
  adapterId: string;
  targetRegion: AdapterRegion;
  targetAuthority: string;
  
  // Source configuration
  sources: PipelineDataSource[];
  
  // Processing stages
  stages: PipelineStage[];
  
  // Scheduling
  schedule: PipelineSchedule;
  
  // Status
  status: PipelineStatus;
  lastRunAt: string | null;
  nextRunAt: string | null;
  
  // Metrics
  metrics: PipelineMetrics;
  
  // Error handling
  errorHandling: PipelineErrorHandling;
  
  // Notifications
  notifications: PipelineNotification[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PipelineDataSource {
  id: string;
  sourceType: PipelineSourceType;
  sourceId: string; // Reference to Ligature entity
  sourceName: string;
  
  // What data to extract
  dataSelectors: DataSelector[];
  
  // Transform rules
  transformations: DataTransformation[];
  
  // Validation
  validationRules: ValidationRule[];
  
  // Status
  lastExtractedAt: string | null;
  lastExtractedVersion: string | null;
}

export type PipelineSourceType = 
  | 'medicinal-product' | 'substance' | 'organization'
  | 'clinical-study' | 'safety-report' | 'labeling'
  | 'document' | 'regulatory-submission' | 'master-data';

export interface DataSelector {
  path: string; // JSONPath or XPath expression
  alias: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface DataTransformation {
  id: string;
  type: TransformationType;
  configuration: Record<string, unknown>;
  order: number;
}

export type TransformationType = 
  | 'map' | 'filter' | 'aggregate' | 'join' | 'split'
  | 'format' | 'validate' | 'enrich' | 'normalize' | 'custom';

export interface ValidationRule {
  id: string;
  field: string;
  ruleType: ValidationRuleType;
  configuration: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
}

export type ValidationRuleType = 
  | 'required' | 'format' | 'range' | 'enum' | 'regex'
  | 'cross-field' | 'business-rule' | 'external' | 'custom';

export interface PipelineStage {
  id: string;
  name: string;
  stageType: PipelineStageType;
  order: number;
  
  // Configuration
  configuration: Record<string, unknown>;
  
  // Dependencies
  dependsOn: string[]; // Stage IDs
  
  // Timeout
  timeoutMs: number;
  
  // Retry
  retryPolicy: RetryPolicy;
  
  // Status
  status: StageStatus;
  lastExecutedAt: string | null;
  lastDuration: number | null;
  lastError: string | null;
}

export type PipelineStageType = 
  | 'extract' | 'transform' | 'validate' | 'enrich'
  | 'format' | 'sign' | 'encrypt' | 'submit' | 'verify'
  | 'acknowledge' | 'archive' | 'notify' | 'custom';

export type StageStatus = 
  | 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export interface PipelineSchedule {
  type: 'manual' | 'cron' | 'event-driven' | 'continuous';
  cronExpression?: string;
  triggerEvents?: string[];
  minIntervalMs?: number;
  enabled: boolean;
}

export type PipelineStatus = 
  | 'active' | 'paused' | 'disabled' | 'error' | 'maintenance';

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  dataPointsProcessed: number;
  bytesTransferred: number;
}

export interface PipelineErrorHandling {
  onError: 'stop' | 'continue' | 'retry' | 'skip';
  maxConsecutiveErrors: number;
  notifyOnError: boolean;
  escalationPolicy?: EscalationPolicy;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  thresholdErrors: number;
  notifyRoles: string[];
  actions: ('pause-pipeline' | 'alert' | 'escalate')[];
}

export interface PipelineNotification {
  id: string;
  event: PipelineNotificationEvent;
  channels: NotificationChannel[];
  recipients: string[];
  template: string;
  enabled: boolean;
}

export type PipelineNotificationEvent = 
  | 'run-started' | 'run-completed' | 'run-failed'
  | 'validation-error' | 'submission-accepted' | 'submission-rejected'
  | 'acknowledgment-received' | 'status-changed';

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sms';

// ============================================================================
// API SUBMISSION REQUESTS & RESPONSES
// ============================================================================

export interface APISubmissionRequest {
  id: string;
  requestId: string; // External tracking ID
  
  // Target
  adapterId: string;
  pipelineId?: string;
  
  // Payload
  format: DataExchangeFormat;
  payload: unknown;
  payloadHash: string;
  payloadSize: number;
  
  // Metadata
  submissionType: string;
  applicationNumber?: string;
  sequenceNumber?: number;
  
  // Status
  status: APIRequestStatus;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  
  // Response
  response?: APISubmissionResponse;
  
  // Retries
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  
  // Cross-references
  linkedSubmissionId?: string;
  linkedDocumentIds: string[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type APIRequestStatus = 
  | 'draft' | 'pending' | 'submitted' | 'acknowledged'
  | 'processing' | 'accepted' | 'rejected' | 'error' | 'cancelled';

export interface APISubmissionResponse {
  id: string;
  requestId: string;
  
  // Status
  status: 'success' | 'partial' | 'error';
  statusCode: number;
  statusMessage: string;
  
  // Tracking
  externalId?: string; // ID from receiving system
  trackingNumber?: string;
  
  // Details
  responsePayload?: unknown;
  validationResults?: ResponseValidation[];
  
  // Timing
  receivedAt: string;
  processedAt?: string;
  
  // Errors
  errors?: APIResponseError[];
  warnings?: APIResponseWarning[];
}

export interface ResponseValidation {
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  location?: string;
}

export interface APIResponseError {
  code: string;
  message: string;
  field?: string;
  details?: string;
}

export interface APIResponseWarning {
  code: string;
  message: string;
  field?: string;
}

// ============================================================================
// DATA READINESS TRACKING
// ============================================================================

/**
 * Continuous Data Readiness - Real-time tracking of submission data completeness
 * Shows what's ready vs. traditional "wait for database lock" approach
 */
export interface ContinuousDataReadiness {
  pipelineId: string;
  asOfTimestamp: string;
  
  // Overall readiness
  overallReadiness: number; // 0-100
  overallStatus: ReadinessStatus;
  
  // By data domain
  domainReadiness: DomainReadiness[];
  
  // Blocking issues
  blockers: ReadinessBlocker[];
  
  // Timeline comparison
  traditionalApproach: TimelineEstimate;
  continuousApproach: TimelineEstimate;
  timeSaved: number; // days
  
  // Data flow metrics
  dataFlowMetrics: DataFlowMetric[];
  
  // Last updated
  updatedAt: string;
}

export type ReadinessStatus = 
  | 'ready' | 'near-ready' | 'in-progress' | 'blocked' | 'not-started';

export interface DomainReadiness {
  domain: string;
  domainLabel: string;
  readinessPercent: number;
  status: ReadinessStatus;
  itemsReady: number;
  itemsTotal: number;
  blockerCount: number;
  lastUpdated: string;
}

export interface ReadinessBlocker {
  id: string;
  domain: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  impact: string;
  owner?: string;
  dueDate?: string;
  status: 'open' | 'in-progress' | 'resolved';
}

export interface TimelineEstimate {
  approachType: 'traditional' | 'continuous';
  startDate: string;
  endDate: string;
  durationDays: number;
  milestones: TimelineMilestone[];
}

export interface TimelineMilestone {
  name: string;
  date: string;
  status: 'completed' | 'in-progress' | 'pending';
  daysFromStart: number;
}

export interface DataFlowMetric {
  sourceName: string;
  sourceType: PipelineSourceType;
  lastSyncAt: string;
  recordsTotal: number;
  recordsReady: number;
  recordsPending: number;
  recordsError: number;
  syncFrequency: string;
  latencyMs: number;
}

// ============================================================================
// ACCUMULUS-SPECIFIC TYPES
// ============================================================================

/**
 * Accumulus Synergy-specific configuration and data structures
 * Based on the Accumulus Synergy API specifications
 */
export interface AccumulusConfiguration extends AdapterConfiguration {
  // Accumulus-specific settings
  workspaceId: string;
  applicationId: string;
  sponsorId: string;
  
  // Environment
  environment: 'sandbox' | 'staging' | 'production';
  
  // Features
  enableRealtimeUpdates: boolean;
  enableCollaboration: boolean;
  enableAuditStream: boolean;
}

export interface AccumulusSubmissionPackage {
  packageId: string;
  
  // Identity
  applicationNumber: string;
  submissionType: string;
  sequenceNumber?: number;
  
  // Content
  regulatoryActivity: AccumulusRegulatoryActivity;
  documents: AccumulusDocument[];
  structuredData: AccumulusStructuredData[];
  
  // Status
  status: AccumulusPackageStatus;
  workflowState: string;
  
  // Collaboration
  sharedWith: string[]; // Organization IDs
  comments: AccumulusComment[];
  
  // Audit
  createdAt: string;
  submittedAt?: string;
  acknowledgedAt?: string;
}

export interface AccumulusRegulatoryActivity {
  activityType: string;
  targetRegion: string;
  targetAuthority: string;
  targetDate?: string;
  description: string;
}

export interface AccumulusDocument {
  documentId: string;
  documentType: string;
  title: string;
  version: string;
  lifecycle: string;
  checksum: string;
  mimeType: string;
  size: number;
  uri: string;
}

export interface AccumulusStructuredData {
  dataType: 'idmp' | 'safety' | 'clinical' | 'quality';
  format: 'fhir' | 'xml' | 'json';
  version: string;
  content: unknown;
  validationStatus: 'valid' | 'invalid' | 'pending';
}

export type AccumulusPackageStatus = 
  | 'draft' | 'ready-for-review' | 'submitted' | 'received'
  | 'under-review' | 'query' | 'approved' | 'rejected';

export interface AccumulusComment {
  id: string;
  author: string;
  authorOrg: string;
  timestamp: string;
  content: string;
  targetElement?: string;
  status: 'open' | 'resolved';
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

export interface SubmissionAdapterState {
  // Adapters
  adapters: Record<string, SubmissionAdapter>;
  
  // Pipelines
  pipelines: Record<string, ContinuousSubmissionPipeline>;
  pipelinesByAdapter: Record<string, string[]>;
  
  // API Requests
  requests: Record<string, APISubmissionRequest>;
  requestsByPipeline: Record<string, string[]>;
  requestsBySubmission: Record<string, string[]>;
  
  // Data Readiness
  readiness: Record<string, ContinuousDataReadiness>;
  
  // Accumulus packages
  accumulusPackages: Record<string, AccumulusSubmissionPackage>;
  
  // UI State
  selectedAdapterId: string | null;
  selectedPipelineId: string | null;
  selectedRequestId: string | null;
  activeView: AdapterView;
  isLoading: boolean;
  error: string | null;
  
  // Real-time status
  connectionStatus: Record<string, AdapterHealthCheck>;
  lastRefreshed: string;
}

export type AdapterView = 
  | 'dashboard'
  | 'adapters'
  | 'pipelines'
  | 'requests'
  | 'readiness'
  | 'accumulus'
  | 'configuration'
  | 'logs';

export interface SubmissionAdapterActions {
  // Adapter CRUD
  createAdapter: (data: Partial<SubmissionAdapter>) => SubmissionAdapter;
  updateAdapter: (id: string, updates: Partial<SubmissionAdapter>) => void;
  deleteAdapter: (id: string) => void;
  testConnection: (id: string) => Promise<AdapterHealthCheck>;
  
  // Pipeline CRUD
  createPipeline: (data: Partial<ContinuousSubmissionPipeline>) => ContinuousSubmissionPipeline;
  updatePipeline: (id: string, updates: Partial<ContinuousSubmissionPipeline>) => void;
  deletePipeline: (id: string) => void;
  
  // Pipeline execution
  runPipeline: (id: string) => Promise<PipelineRunResult>;
  pausePipeline: (id: string) => void;
  resumePipeline: (id: string) => void;
  cancelRun: (pipelineId: string, runId: string) => void;
  
  // API requests
  createRequest: (data: Partial<APISubmissionRequest>) => APISubmissionRequest;
  submitRequest: (id: string) => Promise<APISubmissionResponse>;
  cancelRequest: (id: string) => void;
  retryRequest: (id: string) => Promise<APISubmissionResponse>;
  
  // Data readiness
  calculateReadiness: (pipelineId: string) => ContinuousDataReadiness;
  refreshReadiness: (pipelineId: string) => void;
  
  // Accumulus-specific
  createAccumulusPackage: (data: Partial<AccumulusSubmissionPackage>) => AccumulusSubmissionPackage;
  updateAccumulusPackage: (id: string, updates: Partial<AccumulusSubmissionPackage>) => void;
  submitToAccumulus: (packageId: string) => Promise<APISubmissionResponse>;
  syncFromAccumulus: (packageId: string) => Promise<AccumulusSubmissionPackage>;
  
  // Health monitoring
  checkAllConnections: () => Promise<Record<string, AdapterHealthCheck>>;
  refreshStatus: () => void;
  
  // UI Actions
  setSelectedAdapter: (id: string | null) => void;
  setSelectedPipeline: (id: string | null) => void;
  setSelectedRequest: (id: string | null) => void;
  setActiveView: (view: AdapterView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}

export interface PipelineRunResult {
  runId: string;
  pipelineId: string;
  status: 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stageResults: StageRunResult[];
  summary: {
    recordsProcessed: number;
    recordsSuccess: number;
    recordsFailed: number;
    bytesTransferred: number;
  };
  errors?: APIResponseError[];
}

export interface StageRunResult {
  stageId: string;
  stageName: string;
  status: StageStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  recordsIn: number;
  recordsOut: number;
  error?: string;
}
