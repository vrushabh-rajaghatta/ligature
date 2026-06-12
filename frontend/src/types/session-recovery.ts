
// =============================================================================
// SESSION RECOVERY TYPES
// =============================================================================
// TypeScript types for session recovery and reconnection functionality.
// Enables seamless reconnection with state restoration after disconnection.
// Part of v0.18.11 - Session Recovery Service
// =============================================================================

import {
  SessionStatus,
  ParticipantRole,
  ConnectionStatus,
  PresenceStatus,
  type CollaborativeSessionRecord,
  type SessionParticipantRecord,
  type EditOperationRecord,
} from './collaboration-persistence';

// -----------------------------------------------------------------------------
// Reconnection States
// -----------------------------------------------------------------------------

/**
 * State of a reconnection attempt
 */
export type ReconnectionState = 
  | 'IDLE'           // Not attempting to reconnect
  | 'CONNECTING'     // Initial connection attempt
  | 'AUTHENTICATING' // Validating reconnection token
  | 'SYNCING'        // Syncing missed operations
  | 'RESTORING'      // Restoring cursor/presence state
  | 'COMPLETE'       // Reconnection successful
  | 'FAILED';        // Reconnection failed

/**
 * Reason for disconnection
 */
export type DisconnectionReason =
  | 'NETWORK_ERROR'      // Network connectivity lost
  | 'SERVER_RESTART'     // Server restarted
  | 'SESSION_TIMEOUT'    // Session timed out
  | 'USER_IDLE'          // User was idle too long
  | 'USER_LOGOUT'        // User explicitly logged out
  | 'SESSION_CLOSED'     // Session was closed by owner
  | 'KICKED'             // User was removed from session
  | 'TOKEN_EXPIRED'      // Reconnection token expired
  | 'VERSION_MISMATCH'   // Client version incompatible
  | 'UNKNOWN';           // Unknown reason

/**
 * Result of a recovery attempt
 */
export type RecoveryResult =
  | 'SUCCESS'            // Full recovery successful
  | 'PARTIAL'            // Some state could not be restored
  | 'CONFLICT'           // Conflicts detected, manual resolution needed
  | 'EXPIRED'            // Token or session expired
  | 'SESSION_CLOSED'     // Session no longer active
  | 'NOT_AUTHORIZED'     // User not authorized to rejoin
  | 'NETWORK_FAILURE'    // Network error during recovery
  | 'INVALID_TOKEN'      // Reconnection token invalid
  | 'VERSION_CONFLICT';  // Content version conflict

// -----------------------------------------------------------------------------
// Reconnection Token
// -----------------------------------------------------------------------------

/**
 * Token for reconnecting to a session
 * Includes snapshot of user state at disconnection
 */
export interface ReconnectionToken {
  // Token identity
  tokenId: string;
  tokenSecret: string;       // For validation
  
  // Session reference
  sessionId: string;
  sessionCode: string;
  documentId: string;
  tenantId: string;
  
  // User reference
  userId: string;
  userName: string;
  userColor: string;
  role: ParticipantRole;
  
  // State snapshot at disconnection
  lastVersion: number;
  lastPosition?: CursorSnapshot;
  lastSelection?: SelectionSnapshot;
  lastPresenceStatus: PresenceStatus;
  
  // Timing
  issuedAt: Date;
  expiresAt: Date;
  disconnectedAt: Date;
  disconnectionReason: DisconnectionReason;
  
  // Attempt tracking
  reconnectAttempts: number;
  lastAttemptAt?: Date;
}

/**
 * Cursor position snapshot
 */
export interface CursorSnapshot {
  position: number;
  line: number;
  column: number;
}

/**
 * Selection range snapshot
 */
export interface SelectionSnapshot {
  start: number;
  end: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// -----------------------------------------------------------------------------
// Recovery Session State
// -----------------------------------------------------------------------------

/**
 * Complete state for recovery
 */
export interface RecoverySessionState {
  // Session info
  session: CollaborativeSessionRecord;
  
  // Participant info (pre-disconnect)
  participant: SessionParticipantRecord;
  
  // Operations missed during disconnection
  missedOperations: EditOperationRecord[];
  missedOperationCount: number;
  
  // Current document state
  currentContent: string;
  currentVersion: number;
  currentHash: string;
  
  // Other participants still in session
  activeParticipants: SessionParticipantRecord[];
  
  // Sync info
  lastSyncedVersion: number;
  operationsToApply: number;
  hasConflicts: boolean;
  conflictDetails?: ConflictDetail[];
}

/**
 * Details of a conflict detected during recovery
 */
export interface ConflictDetail {
  operationId: string;
  conflictType: 'POSITION' | 'CONTENT' | 'DELETE' | 'CONCURRENT';
  description: string;
  localOperation?: EditOperationRecord;
  remoteOperation: EditOperationRecord;
  suggestedResolution?: string;
}

// -----------------------------------------------------------------------------
// Recovery Request/Response
// -----------------------------------------------------------------------------

/**
 * Request to initiate recovery
 */
export interface RecoveryRequest {
  tokenId: string;
  tokenSecret: string;
  clientVersion: string;
  localVersion?: number;       // Client's last known version
  localContent?: string;       // Client's current content (for conflict detection)
  pendingOperations?: PendingOperation[];  // Operations not yet acknowledged
}

/**
 * Operation pending acknowledgment
 */
export interface PendingOperation {
  operationId: string;
  operationType: 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
  position: number;
  content?: string;
  length?: number;
  sentAt: Date;
}

/**
 * Response from recovery attempt
 */
export interface RecoveryResponse {
  result: RecoveryResult;
  
  // On success
  session?: CollaborativeSessionRecord;
  participant?: SessionParticipantRecord;
  currentContent?: string;
  currentVersion?: number;
  missedOperations?: EditOperationRecord[];
  activeParticipants?: SessionParticipantRecord[];
  
  // On conflict
  conflicts?: ConflictDetail[];
  
  // On failure
  errorCode?: string;
  errorMessage?: string;
  
  // New token (if recovery successful)
  newToken?: ReconnectionToken;
  
  // Reconnection info
  reconnectedAt?: Date;
  downtime?: number;  // ms since disconnection
}

// -----------------------------------------------------------------------------
// Heartbeat & Health
// -----------------------------------------------------------------------------

/**
 * Connection health status
 */
export interface ConnectionHealth {
  isConnected: boolean;
  lastHeartbeat: Date;
  latency: number;           // ms
  packetLoss: number;        // percentage (0-100)
  connectionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  reconnectionEligible: boolean;
}

/**
 * Heartbeat message
 */
export interface HeartbeatMessage {
  sessionId: string;
  userId: string;
  timestamp: Date;
  sequence: number;
  clientVersion: number;
}

/**
 * Heartbeat response
 */
export interface HeartbeatResponse {
  acknowledged: boolean;
  serverTime: Date;
  latency: number;
  serverVersion: number;
  participantCount: number;
}

// -----------------------------------------------------------------------------
// Backoff Configuration
// -----------------------------------------------------------------------------

/**
 * Exponential backoff configuration for reconnection
 */
export interface BackoffConfig {
  initialDelay: number;      // ms - first retry delay
  maxDelay: number;          // ms - maximum delay
  multiplier: number;        // factor to multiply delay each attempt
  jitter: boolean;           // add randomness to prevent thundering herd
  maxAttempts: number;       // maximum retry attempts
}

/**
 * Current backoff state
 */
export interface BackoffState {
  attempt: number;
  nextDelay: number;
  totalWaitTime: number;
  startedAt: Date;
  lastAttemptAt?: Date;
  exhausted: boolean;
}

// -----------------------------------------------------------------------------
// Service Configuration
// -----------------------------------------------------------------------------

/**
 * Session recovery service configuration
 */
export interface SessionRecoveryConfig {
  tenantId: string;
  
  // Token settings
  tokenTTL: number;                  // ms - how long tokens are valid
  maxReconnectAttempts: number;      // max attempts per token
  
  // Backoff settings
  backoff: BackoffConfig;
  
  // Heartbeat settings
  heartbeatInterval: number;         // ms
  heartbeatTimeout: number;          // ms - time without heartbeat before disconnect
  
  // Sync settings
  maxOperationsToSync: number;       // max ops to send in recovery
  syncBatchSize: number;             // ops per batch
  
  // Grace periods
  disconnectGracePeriod: number;     // ms - time before marking truly disconnected
  sessionRecoveryWindow: number;     // ms - time window for session recovery
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * Session recovery service interface
 */
export interface ISessionRecoveryService {
  // Token management
  createReconnectionToken(
    sessionId: string,
    userId: string,
    reason: DisconnectionReason
  ): Promise<ReconnectionToken>;
  
  validateToken(tokenId: string, tokenSecret: string): Promise<boolean>;
  invalidateToken(tokenId: string): Promise<void>;
  invalidateUserTokens(userId: string): Promise<number>;
  getTokenByUser(userId: string, sessionId: string): Promise<ReconnectionToken | null>;
  
  // Recovery operations
  initiateRecovery(request: RecoveryRequest): Promise<RecoveryResponse>;
  getRecoveryState(tokenId: string): Promise<RecoverySessionState | null>;
  getMissedOperations(
    sessionId: string,
    sinceVersion: number,
    limit?: number
  ): Promise<EditOperationRecord[]>;
  
  // State restoration
  restoreCursorPosition(
    sessionId: string,
    userId: string,
    snapshot: CursorSnapshot
  ): Promise<boolean>;
  
  restoreSelection(
    sessionId: string,
    userId: string,
    snapshot: SelectionSnapshot
  ): Promise<boolean>;
  
  restorePresence(
    sessionId: string,
    userId: string,
    status: PresenceStatus
  ): Promise<boolean>;
  
  // Conflict handling
  detectConflicts(
    sessionId: string,
    localVersion: number,
    pendingOps: PendingOperation[]
  ): Promise<ConflictDetail[]>;
  
  resolveConflict(
    conflictId: string,
    resolution: 'ACCEPT_LOCAL' | 'ACCEPT_REMOTE' | 'MERGE'
  ): Promise<boolean>;
  
  // Connection health
  recordHeartbeat(message: HeartbeatMessage): Promise<HeartbeatResponse>;
  getConnectionHealth(sessionId: string, userId: string): Promise<ConnectionHealth>;
  
  // Backoff management
  getBackoffState(tokenId: string): BackoffState;
  recordAttempt(tokenId: string, success: boolean): void;
  resetBackoff(tokenId: string): void;
  
  // Cleanup
  cleanupExpiredTokens(): Promise<number>;
  getStats(): SessionRecoveryStats;
}

/**
 * Service statistics
 */
export interface SessionRecoveryStats {
  activeTokens: number;
  expiredTokens: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  partialRecoveries: number;
  averageRecoveryTime: number;
  averageDowntime: number;
  conflictsDetected: number;
  conflictsResolved: number;
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

/**
 * Events emitted by recovery service
 */
export interface RecoveryEvents {
  'token:created': { token: ReconnectionToken };
  'token:validated': { tokenId: string; userId: string };
  'token:expired': { tokenId: string; userId: string };
  'token:invalidated': { tokenId: string; reason: string };
  
  'recovery:started': { tokenId: string; userId: string; sessionId: string };
  'recovery:syncing': { tokenId: string; operationCount: number };
  'recovery:complete': { tokenId: string; result: RecoveryResult; downtime: number };
  'recovery:failed': { tokenId: string; result: RecoveryResult; error: string };
  
  'conflict:detected': { tokenId: string; conflicts: ConflictDetail[] };
  'conflict:resolved': { conflictId: string; resolution: string };
  
  'heartbeat:received': { sessionId: string; userId: string; latency: number };
  'heartbeat:missed': { sessionId: string; userId: string; count: number };
  
  'connection:degraded': { sessionId: string; userId: string; quality: string };
  'connection:restored': { sessionId: string; userId: string };
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a token is still valid
 */
export function isTokenValid(token: ReconnectionToken): boolean {
  return token.expiresAt > new Date();
}

/**
 * Check if token can still attempt reconnection
 */
export function canAttemptReconnection(
  token: ReconnectionToken,
  maxAttempts: number
): boolean {
  return isTokenValid(token) && token.reconnectAttempts < maxAttempts;
}

/**
 * Calculate next backoff delay
 */
export function calculateBackoffDelay(state: BackoffState, config: BackoffConfig): number {
  if (state.exhausted) return -1;
  
  let delay = config.initialDelay * Math.pow(config.multiplier, state.attempt);
  delay = Math.min(delay, config.maxDelay);
  
  if (config.jitter) {
    // Add ±20% jitter
    const jitterFactor = 0.8 + Math.random() * 0.4;
    delay = Math.floor(delay * jitterFactor);
  }
  
  return delay;
}

/**
 * Determine connection quality from metrics
 */
export function determineConnectionQuality(
  latency: number,
  packetLoss: number
): ConnectionHealth['connectionQuality'] {
  if (packetLoss > 20 || latency > 2000) return 'CRITICAL';
  if (packetLoss > 10 || latency > 1000) return 'POOR';
  if (packetLoss > 5 || latency > 500) return 'FAIR';
  if (packetLoss > 2 || latency > 200) return 'GOOD';
  return 'EXCELLENT';
}

/**
 * Check if session is recoverable
 */
export function isSessionRecoverable(
  session: CollaborativeSessionRecord,
  disconnectedAt: Date,
  recoveryWindow: number
): boolean {
  if (session.status !== 'ACTIVE') return false;
  
  const elapsed = Date.now() - disconnectedAt.getTime();
  return elapsed < recoveryWindow;
}

/**
 * Determine recovery result from session state
 */
export function determineRecoveryResult(
  session: CollaborativeSessionRecord | null,
  token: ReconnectionToken,
  conflicts: ConflictDetail[]
): RecoveryResult {
  if (!session) return 'SESSION_CLOSED';
  if (session.status !== 'ACTIVE') return 'SESSION_CLOSED';
  if (!isTokenValid(token)) return 'EXPIRED';
  if (conflicts.length > 0) return 'CONFLICT';
  return 'SUCCESS';
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create default backoff configuration
 */
export function createDefaultBackoffConfig(): BackoffConfig {
  return {
    initialDelay: 1000,      // 1 second
    maxDelay: 30000,         // 30 seconds
    multiplier: 2,           // double each time
    jitter: true,
    maxAttempts: 10,
  };
}

/**
 * Create default recovery service configuration
 */
export function createDefaultRecoveryConfig(tenantId: string): SessionRecoveryConfig {
  return {
    tenantId,
    tokenTTL: 3600000,                  // 1 hour
    maxReconnectAttempts: 10,
    backoff: createDefaultBackoffConfig(),
    heartbeatInterval: 30000,           // 30 seconds
    heartbeatTimeout: 90000,            // 90 seconds (3 missed heartbeats)
    maxOperationsToSync: 1000,
    syncBatchSize: 100,
    disconnectGracePeriod: 5000,        // 5 seconds
    sessionRecoveryWindow: 3600000,     // 1 hour
  };
}

/**
 * Create initial backoff state
 */
export function createInitialBackoffState(): BackoffState {
  return {
    attempt: 0,
    nextDelay: 0,
    totalWaitTime: 0,
    startedAt: new Date(),
    exhausted: false,
  };
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const TOKEN_ID_LENGTH = 32;
export const TOKEN_SECRET_LENGTH = 64;
export const DEFAULT_TOKEN_TTL = 3600000;  // 1 hour
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
export const DEFAULT_HEARTBEAT_INTERVAL = 30000;  // 30 seconds
export const DEFAULT_HEARTBEAT_TIMEOUT = 90000;   // 90 seconds
export const MAX_OPERATIONS_PER_SYNC = 1000;
export const SYNC_BATCH_SIZE = 100;

/**
 * Quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  latency: {
    excellent: 100,
    good: 200,
    fair: 500,
    poor: 1000,
  },
  packetLoss: {
    excellent: 0,
    good: 2,
    fair: 5,
    poor: 10,
  },
} as const;
