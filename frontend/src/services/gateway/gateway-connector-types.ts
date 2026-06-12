
// =============================================================================
// GATEWAY CONNECTOR TYPES - v0.9.16
// =============================================================================
// Type definitions for the gateway connector abstraction layer. Provides
// standardized interfaces for connecting to regulatory submission gateways
// (FDA ESG, EMA CESP, PMDA, Health Canada, TGA, Swissmedic).
// =============================================================================

import type { RegulatoryRegion } from '../../store/ectd-regional-types';

// -----------------------------------------------------------------------------
// GATEWAY IDENTIFIERS
// -----------------------------------------------------------------------------

/** Supported gateway types */
export type GatewayId = 
  | 'fda-esg'      // FDA Electronic Submissions Gateway
  | 'ema-cesp'     // EMA Common European Submission Portal
  | 'pmda-gateway' // PMDA Gateway System (Japan)
  | 'hc-cta'       // Health Canada Common Tool for Applications
  | 'tga-portal'   // TGA Business Services Portal (Australia)
  | 'sm-portal';   // Swissmedic Portal (Switzerland)

/** Gateway environment */
export type GatewayEnvironment = 'production' | 'test' | 'validation';

/** Connection status */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'error'
  | 'maintenance';

/** Transmission status */
export type TransmissionStatus =
  | 'queued'
  | 'preparing'
  | 'uploading'
  | 'transmitted'
  | 'acknowledged'
  | 'accepted'
  | 'rejected'
  | 'failed'
  | 'timeout'
  | 'cancelled';

// -----------------------------------------------------------------------------
// CREDENTIALS & AUTHENTICATION
// -----------------------------------------------------------------------------

/** Base credential structure */
export interface GatewayCredentials {
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  isConfigured: boolean;
  lastValidated?: string;
  expiresAt?: string;
}

/** FDA ESG specific credentials (AS2/certificate-based) */
export interface FDAESGCredentials extends GatewayCredentials {
  gatewayId: 'fda-esg';
  as2Id?: string;                    // AS2 identifier
  certificateThumbprint?: string;    // X.509 certificate thumbprint
  certificateExpiry?: string;
  webTraderAccountId?: string;       // For WebTrader fallback
  dunsNumber?: string;               // D-U-N-S Number
}

/** EMA CESP credentials (OAuth2/SPOR) */
export interface EMACESPCredentials extends GatewayCredentials {
  gatewayId: 'ema-cesp';
  sporOrganizationId?: string;       // SPOR Organization ID
  eutctId?: string;                  // EU CTR ID for clinical trials
  oauthClientId?: string;
  oauthTokenExpiry?: string;
}

/** PMDA Gateway credentials */
export interface PMDAGatewayCredentials extends GatewayCredentials {
  gatewayId: 'pmda-gateway';
  companyId?: string;
  digitalCertificateId?: string;
}

/** Health Canada CTA credentials */
export interface HCCTACredentials extends GatewayCredentials {
  gatewayId: 'hc-cta';
  companyId?: string;
  portalUserId?: string;
}

/** TGA Portal credentials */
export interface TGAPortalCredentials extends GatewayCredentials {
  gatewayId: 'tga-portal';
  ausGovId?: string;
  tgaClientId?: string;
}

/** Swissmedic Portal credentials */
export interface SMPortalCredentials extends GatewayCredentials {
  gatewayId: 'sm-portal';
  swissmedId?: string;
  businessPartnerId?: string;
}

/** Union type for all credentials */
export type AnyGatewayCredentials =
  | FDAESGCredentials
  | EMACESPCredentials
  | PMDAGatewayCredentials
  | HCCTACredentials
  | TGAPortalCredentials
  | SMPortalCredentials;

// -----------------------------------------------------------------------------
// CONNECTION & HEALTH CHECK
// -----------------------------------------------------------------------------

/** Gateway endpoint configuration */
export interface GatewayEndpoint {
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  baseUrl: string;
  submitPath: string;
  statusPath: string;
  healthPath: string;
  acknowledgementPath?: string;
}

/** Health check result */
export interface HealthCheckResult {
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  timestamp: string;
  isHealthy: boolean;
  latencyMs: number;
  status: ConnectionStatus;
  
  // Detailed checks
  checks: HealthCheckItem[];
  
  // Gateway status
  maintenanceWindow?: {
    start: string;
    end: string;
    message: string;
  };
  
  // Service availability
  serviceAvailability: {
    submission: boolean;
    acknowledgement: boolean;
    status: boolean;
  };
  
  // Error details
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/** Individual health check item */
export interface HealthCheckItem {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  durationMs: number;
  timestamp: string;
}

/** Connection state */
export interface ConnectionState {
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  status: ConnectionStatus;
  connectedAt?: string;
  lastActivityAt?: string;
  sessionId?: string;
  
  // Authentication state
  isAuthenticated: boolean;
  authMethod?: 'certificate' | 'oauth' | 'api-key' | 'session';
  tokenExpiry?: string;
  
  // Recent health check
  lastHealthCheck?: HealthCheckResult;
  nextHealthCheckAt?: string;
  
  // Errors
  lastError?: ConnectionError;
  consecutiveFailures: number;
}

/** Connection error */
export interface ConnectionError {
  code: string;
  message: string;
  timestamp: string;
  isRetryable: boolean;
  retryAfter?: string;
  details?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// TRANSMISSION
// -----------------------------------------------------------------------------

/** Submission package for transmission */
export interface TransmissionPackage {
  id: string;
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  
  // Submission identification
  applicationId: string;
  sequenceId: string;
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: string;
  
  // File information
  packagePath: string;
  fileName: string;
  fileSizeBytes: number;
  checksum: string;
  checksumAlgorithm: 'md5' | 'sha256';
  
  // Metadata
  preparedBy: string;
  preparedAt: string;
  
  // Optional metadata for gateway
  coverLetterPath?: string;
  priorityDesignation?: string;
  expeditedProgram?: string;
}

/** Transmission request */
export interface TransmissionRequest {
  id: string;
  package: TransmissionPackage;
  
  // Request configuration
  priority: 'normal' | 'high' | 'urgent';
  retryPolicy: RetryPolicy;
  
  // Scheduling
  scheduledAt?: string;           // For delayed transmission
  deadline?: string;              // Must transmit by this time
  
  // Callbacks (internal use)
  onProgress?: (progress: TransmissionProgress) => void;
  onComplete?: (result: TransmissionResult) => void;
}

/** Retry policy */
export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 5000,        // 5 seconds
  maxDelayMs: 300000,          // 5 minutes
  backoffMultiplier: 2,
  retryableErrors: [
    'TIMEOUT',
    'CONNECTION_RESET',
    'SERVICE_UNAVAILABLE',
    'GATEWAY_TIMEOUT',
    'RATE_LIMITED',
  ],
};

/** Transmission progress */
export interface TransmissionProgress {
  transmissionId: string;
  status: TransmissionStatus;
  phase: TransmissionPhase;
  progressPercent: number;
  bytesTransmitted: number;
  totalBytes: number;
  currentStep: string;
  startedAt: string;
  estimatedCompletionAt?: string;
}

/** Transmission phase */
export type TransmissionPhase =
  | 'initializing'
  | 'authenticating'
  | 'preparing-package'
  | 'uploading'
  | 'waiting-acknowledgement'
  | 'processing-response'
  | 'complete'
  | 'failed';

/** Transmission result */
export interface TransmissionResult {
  transmissionId: string;
  packageId: string;
  gatewayId: GatewayId;
  success: boolean;
  status: TransmissionStatus;
  
  // Timing
  startedAt: string;
  completedAt: string;
  durationMs: number;
  
  // Gateway response
  gatewayTransactionId?: string;
  gatewayTrackingNumber?: string;
  gatewayTimestamp?: string;
  
  // Acknowledgement
  acknowledgement?: GatewayAcknowledgement;
  
  // Error details (if failed)
  error?: TransmissionError;
  
  // Retry information
  attemptNumber: number;
  retriesRemaining: number;
  nextRetryAt?: string;
}

/** Transmission error */
export interface TransmissionError {
  code: string;
  message: string;
  category: ErrorCategory;
  isRetryable: boolean;
  gatewayErrorCode?: string;
  gatewayErrorMessage?: string;
  details?: Record<string, unknown>;
  suggestedAction?: string;
}

/** Error category */
export type ErrorCategory =
  | 'authentication'     // Auth/credential issues
  | 'network'           // Network connectivity
  | 'validation'        // Gateway validation errors
  | 'package'           // Package format issues
  | 'gateway'           // Gateway system errors
  | 'timeout'           // Timeout errors
  | 'rate-limit'        // Rate limiting
  | 'unknown';

// -----------------------------------------------------------------------------
// ACKNOWLEDGEMENT
// -----------------------------------------------------------------------------

/** Gateway acknowledgement (normalized across gateways) */
export interface GatewayAcknowledgement {
  id: string;
  transmissionId: string;
  gatewayId: GatewayId;
  
  // Acknowledgement type (normalized)
  type: NormalizedAckType;
  originalType: string;            // Gateway-specific type (TA1, CESP-RECEIPT, etc.)
  
  // Status
  status: 'success' | 'warning' | 'error' | 'pending';
  
  // Timing
  receivedAt: string;
  gatewayTimestamp: string;
  
  // Reference numbers
  trackingNumber?: string;
  acknowledgementNumber?: string;
  applicationNumber?: string;
  sequenceNumber?: string;
  
  // Validation results (if applicable)
  validationPassed?: boolean;
  technicalValidation?: AckValidationResult;
  businessValidation?: AckValidationResult;
  
  // Messages
  messages: AckMessage[];
  
  // Next expected acknowledgement
  nextExpectedAck?: {
    type: string;
    expectedWithin: string;
  };
  
  // Raw response (for debugging)
  rawResponse?: string;
}

/** Normalized acknowledgement type */
export type NormalizedAckType =
  | 'receipt'           // Initial receipt confirmation
  | 'technical'         // Technical validation complete
  | 'business'          // Business validation complete
  | 'accepted'          // Final acceptance
  | 'rejected'          // Rejection
  | 'pending';          // Still processing

/** Acknowledgement validation result */
export interface AckValidationResult {
  passed: boolean;
  completedAt: string;
  checksPerformed: number;
  checksPassed: number;
  checksFailed: number;
}

/** Acknowledgement message */
export interface AckMessage {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  location?: string;
  rule?: string;
  suggestedFix?: string;
}

// -----------------------------------------------------------------------------
// AUDIT TRAIL (21 CFR Part 11)
// -----------------------------------------------------------------------------

/** Gateway audit entry */
export interface GatewayAuditEntry {
  id: string;
  timestamp: string;
  
  // Action
  action: GatewayAuditAction;
  actionDescription: string;
  
  // Context
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  transmissionId?: string;
  packageId?: string;
  applicationNumber?: string;
  sequenceNumber?: string;
  
  // Actor
  userId: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Result
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  
  // Changes (for config changes)
  previousValue?: string;
  newValue?: string;
  
  // Integrity
  checksum: string;                // SHA-256 of entry content
  previousEntryChecksum?: string;  // Chain integrity
}

/** Gateway audit actions */
export type GatewayAuditAction =
  // Connection
  | 'GATEWAY_CONNECT'
  | 'GATEWAY_DISCONNECT'
  | 'GATEWAY_AUTHENTICATE'
  | 'GATEWAY_AUTH_FAILURE'
  | 'GATEWAY_HEALTH_CHECK'
  
  // Configuration
  | 'CREDENTIAL_CONFIGURE'
  | 'CREDENTIAL_UPDATE'
  | 'CREDENTIAL_VALIDATE'
  | 'CREDENTIAL_EXPIRE'
  | 'ENVIRONMENT_SWITCH'
  
  // Transmission
  | 'TRANSMISSION_INITIATE'
  | 'TRANSMISSION_UPLOAD_START'
  | 'TRANSMISSION_UPLOAD_COMPLETE'
  | 'TRANSMISSION_UPLOAD_FAIL'
  | 'TRANSMISSION_RETRY'
  | 'TRANSMISSION_CANCEL'
  | 'TRANSMISSION_TIMEOUT'
  
  // Acknowledgement
  | 'ACK_RECEIVED'
  | 'ACK_PROCESSED'
  | 'ACK_ERROR'
  
  // Administrative
  | 'AUDIT_EXPORT'
  | 'AUDIT_QUERY';

// -----------------------------------------------------------------------------
// GATEWAY CONNECTOR INTERFACE
// -----------------------------------------------------------------------------

/** Gateway connector interface - implement for each gateway */
export interface IGatewayConnector {
  // Identity
  readonly gatewayId: GatewayId;
  readonly displayName: string;
  readonly region: RegulatoryRegion;
  
  // Connection management
  connect(credentials: AnyGatewayCredentials): Promise<ConnectionState>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
  isConnected(): boolean;
  
  // Health & status
  checkHealth(): Promise<HealthCheckResult>;
  getServiceStatus(): Promise<ServiceStatus>;
  
  // Transmission
  transmit(request: TransmissionRequest): Promise<TransmissionResult>;
  cancelTransmission(transmissionId: string): Promise<boolean>;
  getTransmissionStatus(transmissionId: string): Promise<TransmissionProgress>;
  
  // Acknowledgements
  fetchAcknowledgements(trackingNumber: string): Promise<GatewayAcknowledgement[]>;
  pollForAcknowledgement(transmissionId: string, timeoutMs?: number): Promise<GatewayAcknowledgement>;
  
  // Validation (pre-submission)
  validatePackage(packagePath: string): Promise<PackageValidationResult>;
}

/** Service status */
export interface ServiceStatus {
  gatewayId: GatewayId;
  timestamp: string;
  overallStatus: 'operational' | 'degraded' | 'outage' | 'maintenance';
  services: {
    submission: ServiceHealth;
    acknowledgement: ServiceHealth;
    validation: ServiceHealth;
    statusQuery: ServiceHealth;
  };
  announcements?: ServiceAnnouncement[];
}

/** Individual service health */
export interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latencyMs?: number;
  lastChecked: string;
}

/** Service announcement */
export interface ServiceAnnouncement {
  id: string;
  type: 'info' | 'warning' | 'maintenance' | 'outage';
  title: string;
  message: string;
  startTime?: string;
  endTime?: string;
  affectedServices?: string[];
}

/** Package validation result */
export interface PackageValidationResult {
  isValid: boolean;
  packagePath: string;
  validatedAt: string;
  
  // Checks
  structureValid: boolean;
  checksumValid: boolean;
  xmlValid: boolean;
  pdfChecks?: {
    passed: number;
    failed: number;
    warnings: number;
  };
  
  // Issues
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  
  // Readiness
  readyForSubmission: boolean;
  blockers?: string[];
}

/** Validation issue */
export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  location?: string;
  rule?: string;
  suggestedFix?: string;
}

// -----------------------------------------------------------------------------
// GATEWAY REGISTRY
// -----------------------------------------------------------------------------

/** Gateway metadata for registry */
export interface GatewayMetadata {
  id: GatewayId;
  displayName: string;
  region: RegulatoryRegion;
  agencyName: string;
  protocol: 'AS2' | 'HTTPS' | 'SFTP' | 'SOAP';
  authMethod: 'certificate' | 'oauth' | 'api-key' | 'session';
  
  // Endpoints (placeholders until credentials configured)
  productionUrl: string;
  testUrl: string;
  validationUrl?: string;
  
  // Documentation
  documentationUrl: string;
  registrationUrl: string;
  supportUrl: string;
  
  // Capabilities
  capabilities: {
    bulkSubmission: boolean;
    partialSubmission: boolean;
    statusPolling: boolean;
    webhookNotifications: boolean;
    packageValidation: boolean;
  };
  
  // File limits
  limits: {
    maxFileSizeMB: number;
    maxPackageSizeMB: number;
    maxConcurrentSubmissions: number;
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
  };
}

/** Gateway registry - all supported gateways */
export const GATEWAY_REGISTRY: Record<GatewayId, GatewayMetadata> = {
  'fda-esg': {
    id: 'fda-esg',
    displayName: 'FDA Electronic Submissions Gateway',
    region: 'US',
    agencyName: 'Food and Drug Administration',
    protocol: 'AS2',
    authMethod: 'certificate',
    productionUrl: 'https://esg.fda.gov/as2',
    testUrl: 'https://esgtest.fda.gov/as2',
    validationUrl: 'https://esgval.fda.gov/as2',
    documentationUrl: 'https://www.fda.gov/industry/electronic-submissions-gateway',
    registrationUrl: 'https://www.fda.gov/industry/electronic-submissions-gateway/how-register-esg',
    supportUrl: 'https://www.fda.gov/industry/electronic-submissions-gateway/esg-contact-information',
    capabilities: {
      bulkSubmission: false,
      partialSubmission: false,
      statusPolling: true,
      webhookNotifications: false,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 100,
      maxPackageSizeMB: 5000,
      maxConcurrentSubmissions: 5,
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
      },
    },
  },
  'ema-cesp': {
    id: 'ema-cesp',
    displayName: 'EMA Common European Submission Portal',
    region: 'EU',
    agencyName: 'European Medicines Agency',
    protocol: 'HTTPS',
    authMethod: 'oauth',
    productionUrl: 'https://cesp.ema.europa.eu/api/v1',
    testUrl: 'https://cesp-test.ema.europa.eu/api/v1',
    documentationUrl: 'https://esubmission.ema.europa.eu/cesportal/',
    registrationUrl: 'https://register.ema.europa.eu/',
    supportUrl: 'https://servicedesk.ema.europa.eu/',
    capabilities: {
      bulkSubmission: true,
      partialSubmission: true,
      statusPolling: true,
      webhookNotifications: true,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 100,
      maxPackageSizeMB: 10000,
      maxConcurrentSubmissions: 10,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
      },
    },
  },
  'pmda-gateway': {
    id: 'pmda-gateway',
    displayName: 'PMDA Gateway System',
    region: 'JP',
    agencyName: 'Pharmaceuticals and Medical Devices Agency',
    protocol: 'HTTPS',
    authMethod: 'certificate',
    productionUrl: 'https://gateway.pmda.go.jp/api',
    testUrl: 'https://gateway-test.pmda.go.jp/api',
    documentationUrl: 'https://www.pmda.go.jp/english/review-services/electronic-submission/',
    registrationUrl: 'https://www.pmda.go.jp/review-services/electronic-submission/',
    supportUrl: 'https://www.pmda.go.jp/english/about-pmda/contact/',
    capabilities: {
      bulkSubmission: false,
      partialSubmission: false,
      statusPolling: true,
      webhookNotifications: false,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 50,
      maxPackageSizeMB: 3000,
      maxConcurrentSubmissions: 3,
    },
  },
  'hc-cta': {
    id: 'hc-cta',
    displayName: 'Health Canada Common Tool for Applications',
    region: 'CA',
    agencyName: 'Health Canada',
    protocol: 'HTTPS',
    authMethod: 'session',
    productionUrl: 'https://cta-locl.hc-sc.gc.ca/api',
    testUrl: 'https://cta-test.hc-sc.gc.ca/api',
    documentationUrl: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/applications-submissions/guidance-documents/common-tool-applications.html',
    registrationUrl: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/applications-submissions/guidance-documents/common-tool-applications.html#register',
    supportUrl: 'https://www.canada.ca/en/health-canada/corporate/contact-us.html',
    capabilities: {
      bulkSubmission: false,
      partialSubmission: true,
      statusPolling: true,
      webhookNotifications: false,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 50,
      maxPackageSizeMB: 4000,
      maxConcurrentSubmissions: 5,
    },
  },
  'tga-portal': {
    id: 'tga-portal',
    displayName: 'TGA Business Services Portal',
    region: 'AU',
    agencyName: 'Therapeutic Goods Administration',
    protocol: 'HTTPS',
    authMethod: 'oauth',
    productionUrl: 'https://portal.tga.gov.au/api',
    testUrl: 'https://portal-test.tga.gov.au/api',
    documentationUrl: 'https://www.tga.gov.au/electronic-lodgement-facility',
    registrationUrl: 'https://www.tga.gov.au/tga-business-services',
    supportUrl: 'https://www.tga.gov.au/contact-us',
    capabilities: {
      bulkSubmission: false,
      partialSubmission: true,
      statusPolling: true,
      webhookNotifications: false,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 100,
      maxPackageSizeMB: 5000,
      maxConcurrentSubmissions: 5,
    },
  },
  'sm-portal': {
    id: 'sm-portal',
    displayName: 'Swissmedic Portal',
    region: 'CH',
    agencyName: 'Swissmedic',
    protocol: 'HTTPS',
    authMethod: 'certificate',
    productionUrl: 'https://portal.swissmedic.ch/api',
    testUrl: 'https://portal-test.swissmedic.ch/api',
    documentationUrl: 'https://www.swissmedic.ch/swissmedic/en/home/services/einreichung-von-gesuchen/ectd.html',
    registrationUrl: 'https://www.swissmedic.ch/swissmedic/en/home/services/einreichung-von-gesuchen.html',
    supportUrl: 'https://www.swissmedic.ch/swissmedic/en/home/about-us/contact.html',
    capabilities: {
      bulkSubmission: false,
      partialSubmission: false,
      statusPolling: true,
      webhookNotifications: false,
      packageValidation: true,
    },
    limits: {
      maxFileSizeMB: 50,
      maxPackageSizeMB: 3000,
      maxConcurrentSubmissions: 3,
    },
  },
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/** Get gateway metadata */
export function getGatewayMetadata(gatewayId: GatewayId): GatewayMetadata {
  return GATEWAY_REGISTRY[gatewayId];
}

/** Get gateway for region */
export function getGatewayForRegion(region: RegulatoryRegion): GatewayId {
  const regionToGateway: Record<RegulatoryRegion, GatewayId> = {
    US: 'fda-esg',
    EU: 'ema-cesp',
    JP: 'pmda-gateway',
    CA: 'hc-cta',
    AU: 'tga-portal',
    CH: 'sm-portal',
  };
  return regionToGateway[region];
}

/** Check if gateway supports feature */
export function gatewaySupports(
  gatewayId: GatewayId,
  feature: keyof GatewayMetadata['capabilities']
): boolean {
  return GATEWAY_REGISTRY[gatewayId].capabilities[feature];
}

/** Generate unique IDs */
export const generateGatewayId = {
  transmission: () => `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  acknowledgement: () => `ack_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  audit: () => `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  healthCheck: () => `hc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

/** Calculate retry delay with exponential backoff */
export function calculateRetryDelay(
  attemptNumber: number,
  policy: RetryPolicy
): number {
  const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptNumber - 1);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, policy.maxDelayMs);
}

/** Check if error is retryable */
export function isRetryableError(errorCode: string, policy: RetryPolicy): boolean {
  return policy.retryableErrors.includes(errorCode);
}
