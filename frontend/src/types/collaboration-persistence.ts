
// =============================================================================
// COLLABORATION PERSISTENCE TYPES
// =============================================================================
// TypeScript types for collaboration database entities and operations.
// Aligns with Prisma schema models for collaborative editing persistence.
// Part of v0.18.10 - Collaboration Schema
// =============================================================================

// -----------------------------------------------------------------------------
// Session Status Enums
// -----------------------------------------------------------------------------

/**
 * Status of a collaborative editing session
 */
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'TERMINATED';

/**
 * Conflict resolution mode for concurrent edits
 */
export type ConflictMode = 'AUTO' | 'MANUAL' | 'LAST_WRITE';

/**
 * Role of a participant in a session
 */
export type ParticipantRole = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING';

/**
 * User presence/activity status
 */
export type PresenceStatus = 'ACTIVE' | 'IDLE' | 'AWAY' | 'OFFLINE';

/**
 * Type of document lock
 */
export type LockType = 'EDITING' | 'REVIEWING' | 'COMMENTING' | 'EXPORTING';

/**
 * Status of a document lock
 */
export type LockStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'BROKEN';

/**
 * Type of edit operation
 */
export type OperationType = 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT' | 'MOVE' | 'COMPOUND';

/**
 * Status of an operation
 */
export type OperationStatus = 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED';

/**
 * Types of session activities for audit logging
 */
export type ActivityType = 
  | 'SESSION_CREATED' 
  | 'SESSION_STARTED' 
  | 'SESSION_PAUSED' 
  | 'SESSION_RESUMED' 
  | 'SESSION_CLOSED'
  | 'PARTICIPANT_JOINED' 
  | 'PARTICIPANT_LEFT' 
  | 'PARTICIPANT_DISCONNECTED' 
  | 'PARTICIPANT_RECONNECTED'
  | 'CONTENT_EDITED'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_RESOLVED'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED'
  | 'DOCUMENT_SAVED'
  | 'VERSION_CREATED';

// -----------------------------------------------------------------------------
// Database Entities
// -----------------------------------------------------------------------------

/**
 * Persistent collaborative editing session
 * Maps to: collaborative_sessions table
 */
export interface CollaborativeSessionRecord {
  id: string;
  tenantId: string;
  
  // Document being edited
  documentId: string;
  documentType?: string;
  
  // Session identity
  sessionCode: string;
  title?: string;
  
  // Status & timing
  status: SessionStatus;
  createdAt: Date;
  createdBy: string;
  startedAt: Date;
  closedAt?: Date;
  closedBy?: string;
  lastActivityAt: Date;
  
  // Settings
  maxParticipants: number;
  allowAnonymous: boolean;
  autoSaveInterval: number;
  lockTimeout: number;
  conflictMode: ConflictMode;
  
  // Content state
  initialContent?: string;
  initialVersion: number;
  initialHash?: string;
  currentContent?: string;
  currentVersion: number;
  currentHash?: string;
  
  // Statistics
  totalEdits: number;
  conflictsResolved: number;
}

/**
 * Participant in a collaborative session
 * Maps to: session_participants table
 */
export interface SessionParticipantRecord {
  id: string;
  sessionId: string;
  
  // User identity
  userId: string;
  userName: string;
  userEmail?: string;
  userColor: string;
  
  // Role & permissions
  role: ParticipantRole;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  
  // Connection state
  connectionId?: string;
  connectionStatus: ConnectionStatus;
  
  // Presence
  presenceStatus: PresenceStatus;
  lastSeenAt: Date;
  
  // Cursor state
  cursorPosition?: number;
  cursorLine?: number;
  cursorColumn?: number;
  selectionStart?: number;
  selectionEnd?: number;
  
  // Activity tracking
  joinedAt: Date;
  leftAt?: Date;
  totalEdits: number;
  isActive: boolean;
}

/**
 * Document or section lock for editing
 * Maps to: document_locks table
 */
export interface DocumentLockRecord {
  id: string;
  sessionId: string;
  
  // Lock scope
  documentId: string;
  sectionId?: string;
  lockType: LockType;
  
  // Lock holder
  heldBy: string;
  heldByName?: string;
  
  // Timing
  acquiredAt: Date;
  expiresAt: Date;
  releasedAt?: Date;
  
  // Status
  status: LockStatus;
  releaseReason?: string;
}

/**
 * Record of an edit operation (for history/undo)
 * Maps to: edit_operations table
 */
export interface EditOperationRecord {
  id: string;
  sessionId: string;
  
  // Operation identity
  operationId: string;
  sequenceNumber: number;
  
  // Who made the edit
  userId: string;
  userName?: string;
  
  // Operation details
  operationType: OperationType;
  position: number;
  length?: number;
  content?: string;
  previousContent?: string;
  
  // Version tracking
  baseVersion: number;
  resultVersion: number;
  
  // Transformation data
  wasTransformed: boolean;
  originalPosition?: number;
  originalLength?: number;
  transformedBy: string[];
  
  // Conflict handling
  hadConflict: boolean;
  conflictResolution?: string;
  
  // Timing
  clientTimestamp?: Date;
  serverTimestamp: Date;
  appliedAt: Date;
  
  // Status
  status: OperationStatus;
}

/**
 * Collaboration configuration for a document or tenant
 * Maps to: collaboration_configs table
 */
export interface CollaborationConfigRecord {
  id: string;
  tenantId: string;
  
  // Scope
  documentId?: string;
  documentType?: string;
  isTemplate: boolean;
  
  // Session defaults
  defaultMaxParticipants: number;
  defaultAllowAnonymous: boolean;
  defaultAutoSaveInterval: number;
  defaultLockTimeout: number;
  defaultConflictMode: ConflictMode;
  
  // Feature toggles
  enableRealTimeSync: boolean;
  enableCursorSync: boolean;
  enablePresence: boolean;
  enableComments: boolean;
  enableSuggestions: boolean;
  
  // Permission defaults
  defaultRole: ParticipantRole;
  requireAuth: boolean;
  allowedDomains: string[];
  
  // Notification settings
  notifyOnJoin: boolean;
  notifyOnLeave: boolean;
  notifyOnEdit: boolean;
  notifyOnComment: boolean;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Activity log entry for audit
 * Maps to: session_activities table
 */
export interface SessionActivityRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  documentId: string;
  userId?: string;
  activityType: ActivityType;
  description?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

/**
 * Input for creating a new collaborative session
 */
export interface CreateSessionInput {
  tenantId: string;
  documentId: string;
  documentType?: string;
  title?: string;
  createdBy: string;
  initialContent?: string;
  initialVersion?: number;
  settings?: Partial<SessionSettingsInput>;
}

/**
 * Session settings configuration
 */
export interface SessionSettingsInput {
  maxParticipants: number;
  allowAnonymous: boolean;
  autoSaveInterval: number;
  lockTimeout: number;
  conflictMode: ConflictMode;
}

/**
 * Input for adding a participant to a session
 */
export interface AddParticipantInput {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userColor?: string;
  role?: ParticipantRole;
  connectionId?: string;
}

/**
 * Input for updating participant state
 */
export interface UpdateParticipantInput {
  connectionId?: string;
  connectionStatus?: ConnectionStatus;
  presenceStatus?: PresenceStatus;
  cursorPosition?: number;
  cursorLine?: number;
  cursorColumn?: number;
  selectionStart?: number;
  selectionEnd?: number;
}

/**
 * Input for acquiring a document lock
 */
export interface AcquireLockInput {
  sessionId: string;
  documentId: string;
  sectionId?: string;
  lockType?: LockType;
  heldBy: string;
  heldByName?: string;
  durationMs?: number;
}

/**
 * Input for recording an edit operation
 */
export interface RecordOperationInput {
  sessionId: string;
  operationId: string;
  userId: string;
  userName?: string;
  operationType: OperationType;
  position: number;
  length?: number;
  content?: string;
  previousContent?: string;
  baseVersion: number;
  resultVersion: number;
  clientTimestamp?: Date;
  wasTransformed?: boolean;
  originalPosition?: number;
  originalLength?: number;
  transformedBy?: string[];
  hadConflict?: boolean;
  conflictResolution?: string;
}

/**
 * Input for logging session activity
 */
export interface LogActivityInput {
  tenantId: string;
  sessionId: string;
  documentId: string;
  userId?: string;
  activityType: ActivityType;
  description?: string;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

/**
 * Common query options for pagination and sorting
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Filter options for session queries
 */
export interface SessionQueryFilter {
  tenantId?: string;
  documentId?: string;
  status?: SessionStatus | SessionStatus[];
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Filter options for operation queries
 */
export interface OperationQueryFilter {
  sessionId: string;
  userId?: string;
  operationType?: OperationType;
  sinceVersion?: number;
  sinceTimestamp?: Date;
  status?: OperationStatus;
}

/**
 * Filter options for activity queries
 */
export interface ActivityQueryFilter {
  sessionId?: string;
  documentId?: string;
  userId?: string;
  activityType?: ActivityType | ActivityType[];
  since?: Date;
  until?: Date;
}

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

/**
 * Session with participants included
 */
export interface SessionWithParticipants extends CollaborativeSessionRecord {
  participants: SessionParticipantRecord[];
}

/**
 * Session with full history
 */
export interface SessionWithHistory extends SessionWithParticipants {
  operations: EditOperationRecord[];
  activities: SessionActivityRecord[];
}

/**
 * Summary of a session for listing
 */
export interface SessionSummary {
  id: string;
  sessionCode: string;
  title?: string;
  documentId: string;
  status: SessionStatus;
  participantCount: number;
  activeParticipantCount: number;
  totalEdits: number;
  lastActivityAt: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Result of joining a session
 */
export interface JoinSessionResult {
  session: CollaborativeSessionRecord;
  participant: SessionParticipantRecord;
  currentContent?: string;
  currentVersion: number;
  otherParticipants: SessionParticipantRecord[];
  config?: CollaborationConfigRecord;
}

/**
 * Statistics for a session
 */
export interface SessionStatistics {
  sessionId: string;
  totalEdits: number;
  conflictsResolved: number;
  participantsJoined: number;
  uniqueEditors: number;
  avgEditsPerUser: number;
  durationMs: number;
  peakConcurrentUsers: number;
}

/**
 * Repository statistics
 */
export interface CollaborationRepositoryStats {
  sessions: number;
  activeSessions: number;
  participants: number;
  activeParticipants: number;
  locks: number;
  activeLocks: number;
  operations: number;
  activities: number;
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * Interface for collaboration persistence service
 */
export interface ICollaborationRepository {
  // Session operations
  createSession(input: CreateSessionInput): Promise<CollaborativeSessionRecord>;
  getSessionById(id: string): Promise<CollaborativeSessionRecord | null>;
  getSessionByCode(code: string): Promise<CollaborativeSessionRecord | null>;
  getSessionByDocument(documentId: string): Promise<CollaborativeSessionRecord | null>;
  getActiveSessions(tenantId: string): Promise<CollaborativeSessionRecord[]>;
  updateSessionContent(sessionId: string, content: string, version: number): Promise<CollaborativeSessionRecord | null>;
  updateSessionStatus(sessionId: string, status: SessionStatus, closedBy?: string): Promise<CollaborativeSessionRecord | null>;
  
  // Participant operations
  addParticipant(input: AddParticipantInput): Promise<SessionParticipantRecord>;
  getParticipant(sessionId: string, userId: string): Promise<SessionParticipantRecord | null>;
  getSessionParticipants(sessionId: string, activeOnly?: boolean): Promise<SessionParticipantRecord[]>;
  updateParticipant(participantId: string, updates: UpdateParticipantInput): Promise<SessionParticipantRecord | null>;
  removeParticipant(sessionId: string, userId: string): Promise<boolean>;
  
  // Lock operations
  acquireLock(input: AcquireLockInput): Promise<DocumentLockRecord | null>;
  getActiveLock(sessionId: string, documentId: string, sectionId?: string): Promise<DocumentLockRecord | null>;
  releaseLock(lockId: string, reason?: string): Promise<boolean>;
  releaseUserLocks(sessionId: string, userId: string): Promise<number>;
  
  // Operation recording
  recordOperation(input: RecordOperationInput): Promise<EditOperationRecord>;
  getOperations(sessionId: string, options?: QueryOptions & OperationQueryFilter): Promise<EditOperationRecord[]>;
  revertOperation(operationId: string): Promise<boolean>;
  
  // Configuration
  getConfig(tenantId: string, documentId?: string, documentType?: string): Promise<CollaborationConfigRecord | null>;
  saveConfig(config: Omit<CollaborationConfigRecord, 'id'>): Promise<CollaborationConfigRecord>;
  
  // Activity logging
  logActivity(input: LogActivityInput): Promise<SessionActivityRecord>;
  getActivities(sessionId: string, options?: QueryOptions & ActivityQueryFilter): Promise<SessionActivityRecord[]>;
  
  // Maintenance
  cleanupExpiredLocks(): Promise<number>;
  cleanupOldSessions(maxAgeDays?: number): Promise<number>;
  getStats(): CollaborationRepositoryStats;
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validate session code format (6 alphanumeric chars)
 */
export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Validate participant role has required permissions
 */
export function roleHasPermission(
  role: ParticipantRole,
  permission: 'edit' | 'comment' | 'share' | 'manage'
): boolean {
  switch (permission) {
    case 'edit':
      return role === 'OWNER' || role === 'EDITOR';
    case 'comment':
      return role === 'OWNER' || role === 'EDITOR' || role === 'COMMENTER';
    case 'share':
      return role === 'OWNER';
    case 'manage':
      return role === 'OWNER';
    default:
      return false;
  }
}

/**
 * Check if a session status allows editing
 */
export function isEditableSessionStatus(status: SessionStatus): boolean {
  return status === 'ACTIVE';
}

/**
 * Check if a lock is currently valid
 */
export function isLockValid(lock: DocumentLockRecord): boolean {
  return lock.status === 'ACTIVE' && lock.expiresAt > new Date();
}

/**
 * Get time remaining on a lock in milliseconds
 */
export function getLockTimeRemainingMs(lock: DocumentLockRecord): number {
  if (lock.status !== 'ACTIVE') return 0;
  const remaining = lock.expiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create default session settings
 */
export function createDefaultSessionSettings(): SessionSettingsInput {
  return {
    maxParticipants: 20,
    allowAnonymous: false,
    autoSaveInterval: 30000,
    lockTimeout: 60000,
    conflictMode: 'AUTO',
  };
}

/**
 * Create default collaboration config
 */
export function createDefaultCollaborationConfig(
  tenantId: string,
  createdBy: string
): Omit<CollaborationConfigRecord, 'id'> {
  const now = new Date();
  return {
    tenantId,
    isTemplate: true,
    defaultMaxParticipants: 20,
    defaultAllowAnonymous: false,
    defaultAutoSaveInterval: 30000,
    defaultLockTimeout: 60000,
    defaultConflictMode: 'AUTO',
    enableRealTimeSync: true,
    enableCursorSync: true,
    enablePresence: true,
    enableComments: true,
    enableSuggestions: false,
    defaultRole: 'EDITOR',
    requireAuth: true,
    allowedDomains: [],
    notifyOnJoin: true,
    notifyOnLeave: false,
    notifyOnEdit: false,
    notifyOnComment: true,
    createdAt: now,
    createdBy,
    updatedAt: now,
  };
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const SESSION_CODE_LENGTH = 6;
export const DEFAULT_LOCK_DURATION_MS = 60000;
export const DEFAULT_AUTO_SAVE_INTERVAL_MS = 30000;
export const DEFAULT_MAX_PARTICIPANTS = 20;
export const MAX_OPERATIONS_PER_SESSION = 10000;
export const SESSION_CLEANUP_AGE_DAYS = 30;

/**
 * Participant role hierarchy (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<ParticipantRole, number> = {
  VIEWER: 0,
  COMMENTER: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * User colors for collaboration
 */
export const USER_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
] as const;
