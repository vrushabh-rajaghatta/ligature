
// =============================================================================
// COLLABORATION REPOSITORY
// =============================================================================
// Database access layer for collaborative editing persistence.
// Provides CRUD operations for sessions, participants, locks, and operations.
// Part of v0.18.10 - Collaboration Schema
// =============================================================================

import { EventEmitter } from 'events';

// -----------------------------------------------------------------------------
// Types (matching Prisma schema)
// -----------------------------------------------------------------------------

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'TERMINATED';
export type ConflictMode = 'AUTO' | 'MANUAL' | 'LAST_WRITE';
export type ParticipantRole = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';
export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING';
export type PresenceStatus = 'ACTIVE' | 'IDLE' | 'AWAY' | 'OFFLINE';
export type LockType = 'EDITING' | 'REVIEWING' | 'COMMENTING' | 'EXPORTING';
export type LockStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'BROKEN';
export type OperationType = 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT' | 'MOVE' | 'COMPOUND';
export type OperationStatus = 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED';
export type ActivityType = 
  | 'SESSION_CREATED' | 'SESSION_STARTED' | 'SESSION_PAUSED' 
  | 'SESSION_RESUMED' | 'SESSION_CLOSED' | 'PARTICIPANT_JOINED' 
  | 'PARTICIPANT_LEFT' | 'PARTICIPANT_DISCONNECTED' | 'PARTICIPANT_RECONNECTED'
  | 'CONTENT_EDITED' | 'CONFLICT_DETECTED' | 'CONFLICT_RESOLVED'
  | 'LOCK_ACQUIRED' | 'LOCK_RELEASED' | 'DOCUMENT_SAVED' | 'VERSION_CREATED';

// -----------------------------------------------------------------------------
// Entity Interfaces
// -----------------------------------------------------------------------------

export interface CollaborativeSessionEntity {
  id: string;
  tenantId: string;
  documentId: string;
  documentType?: string;
  sessionCode: string;
  title?: string;
  status: SessionStatus;
  createdAt: Date;
  createdBy: string;
  startedAt: Date;
  closedAt?: Date;
  closedBy?: string;
  lastActivityAt: Date;
  maxParticipants: number;
  allowAnonymous: boolean;
  autoSaveInterval: number;
  lockTimeout: number;
  conflictMode: ConflictMode;
  initialContent?: string;
  initialVersion: number;
  initialHash?: string;
  currentContent?: string;
  currentVersion: number;
  currentHash?: string;
  totalEdits: number;
  conflictsResolved: number;
}

export interface SessionParticipantEntity {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userColor: string;
  role: ParticipantRole;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  connectionId?: string;
  connectionStatus: ConnectionStatus;
  presenceStatus: PresenceStatus;
  lastSeenAt: Date;
  cursorPosition?: number;
  cursorLine?: number;
  cursorColumn?: number;
  selectionStart?: number;
  selectionEnd?: number;
  joinedAt: Date;
  leftAt?: Date;
  totalEdits: number;
  isActive: boolean;
}

export interface DocumentLockEntity {
  id: string;
  sessionId: string;
  documentId: string;
  sectionId?: string;
  lockType: LockType;
  heldBy: string;
  heldByName?: string;
  acquiredAt: Date;
  expiresAt: Date;
  releasedAt?: Date;
  status: LockStatus;
  releaseReason?: string;
}

export interface EditOperationEntity {
  id: string;
  sessionId: string;
  operationId: string;
  sequenceNumber: number;
  userId: string;
  userName?: string;
  operationType: OperationType;
  position: number;
  length?: number;
  content?: string;
  previousContent?: string;
  baseVersion: number;
  resultVersion: number;
  wasTransformed: boolean;
  originalPosition?: number;
  originalLength?: number;
  transformedBy: string[];
  hadConflict: boolean;
  conflictResolution?: string;
  clientTimestamp?: Date;
  serverTimestamp: Date;
  appliedAt: Date;
  status: OperationStatus;
}

export interface CollaborationConfigEntity {
  id: string;
  tenantId: string;
  documentId?: string;
  documentType?: string;
  isTemplate: boolean;
  defaultMaxParticipants: number;
  defaultAllowAnonymous: boolean;
  defaultAutoSaveInterval: number;
  defaultLockTimeout: number;
  defaultConflictMode: ConflictMode;
  enableRealTimeSync: boolean;
  enableCursorSync: boolean;
  enablePresence: boolean;
  enableComments: boolean;
  enableSuggestions: boolean;
  defaultRole: ParticipantRole;
  requireAuth: boolean;
  allowedDomains: string[];
  notifyOnJoin: boolean;
  notifyOnLeave: boolean;
  notifyOnEdit: boolean;
  notifyOnComment: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface SessionActivityEntity {
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

export interface CreateSessionInput {
  tenantId: string;
  documentId: string;
  documentType?: string;
  title?: string;
  createdBy: string;
  initialContent?: string;
  initialVersion?: number;
  settings?: Partial<SessionSettings>;
}

export interface SessionSettings {
  maxParticipants: number;
  allowAnonymous: boolean;
  autoSaveInterval: number;
  lockTimeout: number;
  conflictMode: ConflictMode;
}

export interface AddParticipantInput {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userColor?: string;
  role?: ParticipantRole;
  connectionId?: string;
}

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

export interface AcquireLockInput {
  sessionId: string;
  documentId: string;
  sectionId?: string;
  lockType?: LockType;
  heldBy: string;
  heldByName?: string;
  durationMs?: number;
}

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

export interface LogActivityInput {
  tenantId: string;
  sessionId: string;
  documentId: string;
  userId?: string;
  activityType: ActivityType;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// -----------------------------------------------------------------------------
// Repository Configuration
// -----------------------------------------------------------------------------

export interface CollaborationRepositoryConfig {
  tenantId: string;
  defaultLockDuration?: number;   // ms, default 60000
  maxOperationsPerSession?: number;  // For cleanup, default 10000
}

// -----------------------------------------------------------------------------
// Collaboration Repository
// -----------------------------------------------------------------------------

export class CollaborationRepository extends EventEmitter {
  private config: CollaborationRepositoryConfig;
  
  // In-memory storage (would be Prisma in production)
  private sessions: Map<string, CollaborativeSessionEntity> = new Map();
  private sessionsByCode: Map<string, string> = new Map();  // code -> id
  private participants: Map<string, SessionParticipantEntity> = new Map();
  private locks: Map<string, DocumentLockEntity> = new Map();
  private operations: Map<string, EditOperationEntity> = new Map();
  private configs: Map<string, CollaborationConfigEntity> = new Map();
  private activities: SessionActivityEntity[] = [];
  
  private idCounter = 0;
  private sequenceCounters: Map<string, number> = new Map();  // sessionId -> seq

  constructor(config: CollaborationRepositoryConfig) {
    super();
    this.config = {
      defaultLockDuration: 60000,
      maxOperationsPerSession: 10000,
      ...config,
    };
  }

  // ---------------------------------------------------------------------------
  // Session Operations
  // ---------------------------------------------------------------------------

  async createSession(input: CreateSessionInput): Promise<CollaborativeSessionEntity> {
    const id = this.generateId('sess');
    const sessionCode = this.generateSessionCode();
    const now = new Date();

    const session: CollaborativeSessionEntity = {
      id,
      tenantId: input.tenantId,
      documentId: input.documentId,
      documentType: input.documentType,
      sessionCode,
      title: input.title,
      status: 'ACTIVE',
      createdAt: now,
      createdBy: input.createdBy,
      startedAt: now,
      lastActivityAt: now,
      maxParticipants: input.settings?.maxParticipants ?? 20,
      allowAnonymous: input.settings?.allowAnonymous ?? false,
      autoSaveInterval: input.settings?.autoSaveInterval ?? 30000,
      lockTimeout: input.settings?.lockTimeout ?? 60000,
      conflictMode: input.settings?.conflictMode ?? 'AUTO',
      initialContent: input.initialContent,
      initialVersion: input.initialVersion ?? 1,
      currentContent: input.initialContent,
      currentVersion: input.initialVersion ?? 1,
      totalEdits: 0,
      conflictsResolved: 0,
    };

    // Compute hash if content provided
    if (input.initialContent) {
      session.initialHash = computeSimpleHash(input.initialContent);
      session.currentHash = session.initialHash;
    }

    this.sessions.set(id, session);
    this.sessionsByCode.set(sessionCode, id);
    this.sequenceCounters.set(id, 0);
    
    this.emit('session:created', session);
    return session;
  }

  async getSessionById(id: string): Promise<CollaborativeSessionEntity | null> {
    return this.sessions.get(id) ?? null;
  }

  async getSessionByCode(code: string): Promise<CollaborativeSessionEntity | null> {
    const id = this.sessionsByCode.get(code);
    return id ? this.sessions.get(id) ?? null : null;
  }

  async getSessionByDocument(documentId: string): Promise<CollaborativeSessionEntity | null> {
    for (const session of Array.from(Array.from(this.sessions.values()))) {
      if (session.documentId === documentId && session.status === 'ACTIVE') {
        return session;
      }
    }
    return null;
  }

  async getActiveSessions(tenantId: string): Promise<CollaborativeSessionEntity[]> {
    return Array.from(this.sessions.values())
      .filter(s => s.tenantId === tenantId && s.status === 'ACTIVE');
  }

  async updateSessionContent(
    sessionId: string,
    content: string,
    version: number
  ): Promise<CollaborativeSessionEntity | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.currentContent = content;
    session.currentVersion = version;
    session.currentHash = computeSimpleHash(content);
    session.lastActivityAt = new Date();

    this.emit('session:content-updated', { sessionId, version });
    return session;
  }

  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    closedBy?: string
  ): Promise<CollaborativeSessionEntity | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = status;
    session.lastActivityAt = new Date();
    
    if (status === 'CLOSED' || status === 'TERMINATED') {
      session.closedAt = new Date();
      session.closedBy = closedBy;
    }

    this.emit('session:status-changed', { sessionId, status });
    return session;
  }

  async incrementSessionStats(
    sessionId: string,
    edits: number = 0,
    conflicts: number = 0
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.totalEdits += edits;
      session.conflictsResolved += conflicts;
      session.lastActivityAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Participant Operations
  // ---------------------------------------------------------------------------

  async addParticipant(input: AddParticipantInput): Promise<SessionParticipantEntity> {
    const id = this.generateId('part');
    const now = new Date();

    // Check if participant already exists
    const existing = await this.getParticipant(input.sessionId, input.userId);
    if (existing) {
      // Reactivate existing participant
      existing.isActive = true;
      existing.leftAt = undefined;
      existing.connectionId = input.connectionId;
      existing.connectionStatus = input.connectionId ? 'CONNECTED' : 'DISCONNECTED';
      existing.presenceStatus = 'ACTIVE';
      existing.lastSeenAt = now;
      
      this.emit('participant:rejoined', existing);
      return existing;
    }

    const participant: SessionParticipantEntity = {
      id,
      sessionId: input.sessionId,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      userColor: input.userColor ?? generateUserColor(input.userId),
      role: input.role ?? 'EDITOR',
      canEdit: input.role !== 'VIEWER' && input.role !== 'COMMENTER',
      canComment: input.role !== 'VIEWER',
      canShare: input.role === 'OWNER',
      connectionId: input.connectionId,
      connectionStatus: input.connectionId ? 'CONNECTED' : 'DISCONNECTED',
      presenceStatus: 'ACTIVE',
      lastSeenAt: now,
      joinedAt: now,
      totalEdits: 0,
      isActive: true,
    };

    this.participants.set(id, participant);
    this.emit('participant:added', participant);
    return participant;
  }

  async getParticipant(sessionId: string, userId: string): Promise<SessionParticipantEntity | null> {
    for (const p of Array.from(Array.from(this.participants.values()))) {
      if (p.sessionId === sessionId && p.userId === userId) {
        return p;
      }
    }
    return null;
  }

  async getParticipantById(id: string): Promise<SessionParticipantEntity | null> {
    return this.participants.get(id) ?? null;
  }

  async getSessionParticipants(sessionId: string, activeOnly = true): Promise<SessionParticipantEntity[]> {
    return Array.from(this.participants.values())
      .filter(p => p.sessionId === sessionId && (!activeOnly || p.isActive));
  }

  async updateParticipant(
    participantId: string,
    updates: UpdateParticipantInput
  ): Promise<SessionParticipantEntity | null> {
    const participant = this.participants.get(participantId);
    if (!participant) return null;

    Object.assign(participant, updates);
    participant.lastSeenAt = new Date();

    this.emit('participant:updated', participant);
    return participant;
  }

  async removeParticipant(sessionId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(sessionId, userId);
    if (!participant) return false;

    participant.isActive = false;
    participant.leftAt = new Date();
    participant.connectionStatus = 'DISCONNECTED';
    participant.presenceStatus = 'OFFLINE';

    this.emit('participant:removed', participant);
    return true;
  }

  async updateParticipantCursor(
    sessionId: string,
    userId: string,
    position: number,
    line?: number,
    column?: number,
    selectionStart?: number,
    selectionEnd?: number
  ): Promise<void> {
    const participant = await this.getParticipant(sessionId, userId);
    if (participant) {
      participant.cursorPosition = position;
      participant.cursorLine = line;
      participant.cursorColumn = column;
      participant.selectionStart = selectionStart;
      participant.selectionEnd = selectionEnd;
      participant.lastSeenAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Lock Operations
  // ---------------------------------------------------------------------------

  async acquireLock(input: AcquireLockInput): Promise<DocumentLockEntity | null> {
    // Check for existing active lock
    const existingLock = await this.getActiveLock(input.sessionId, input.documentId, input.sectionId);
    if (existingLock && existingLock.heldBy !== input.heldBy) {
      return null;  // Lock held by someone else
    }
    if (existingLock && existingLock.heldBy === input.heldBy) {
      // Extend existing lock
      existingLock.expiresAt = new Date(
        Date.now() + (input.durationMs ?? this.config.defaultLockDuration!)
      );
      return existingLock;
    }

    const id = this.generateId('lock');
    const now = new Date();
    const durationMs = input.durationMs ?? this.config.defaultLockDuration!;

    const lock: DocumentLockEntity = {
      id,
      sessionId: input.sessionId,
      documentId: input.documentId,
      sectionId: input.sectionId,
      lockType: input.lockType ?? 'EDITING',
      heldBy: input.heldBy,
      heldByName: input.heldByName,
      acquiredAt: now,
      expiresAt: new Date(now.getTime() + durationMs),
      status: 'ACTIVE',
    };

    this.locks.set(id, lock);
    this.emit('lock:acquired', lock);
    return lock;
  }

  async getActiveLock(
    sessionId: string,
    documentId: string,
    sectionId?: string
  ): Promise<DocumentLockEntity | null> {
    const now = new Date();
    for (const lock of Array.from(Array.from(this.locks.values()))) {
      if (
        lock.sessionId === sessionId &&
        lock.documentId === documentId &&
        lock.sectionId === sectionId &&
        lock.status === 'ACTIVE'
      ) {
        // Check if expired
        if (lock.expiresAt < now) {
          lock.status = 'EXPIRED';
          this.emit('lock:expired', lock);
          continue;
        }
        return lock;
      }
    }
    return null;
  }

  async releaseLock(lockId: string, reason?: string): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock || lock.status !== 'ACTIVE') return false;

    lock.status = 'RELEASED';
    lock.releasedAt = new Date();
    lock.releaseReason = reason ?? 'manual';

    this.emit('lock:released', lock);
    return true;
  }

  async releaseUserLocks(sessionId: string, userId: string): Promise<number> {
    let count = 0;
    for (const lock of Array.from(Array.from(this.locks.values()))) {
      if (lock.sessionId === sessionId && lock.heldBy === userId && lock.status === 'ACTIVE') {
        lock.status = 'RELEASED';
        lock.releasedAt = new Date();
        lock.releaseReason = 'user_left';
        count++;
        this.emit('lock:released', lock);
      }
    }
    return count;
  }

  async cleanupExpiredLocks(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const lock of Array.from(Array.from(this.locks.values()))) {
      if (lock.status === 'ACTIVE' && lock.expiresAt < now) {
        lock.status = 'EXPIRED';
        count++;
        this.emit('lock:expired', lock);
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Operation Recording
  // ---------------------------------------------------------------------------

  async recordOperation(input: RecordOperationInput): Promise<EditOperationEntity> {
    const id = this.generateId('op');
    const sequenceNumber = this.getNextSequence(input.sessionId);
    const now = new Date();

    const operation: EditOperationEntity = {
      id,
      sessionId: input.sessionId,
      operationId: input.operationId,
      sequenceNumber,
      userId: input.userId,
      userName: input.userName,
      operationType: input.operationType,
      position: input.position,
      length: input.length,
      content: input.content,
      previousContent: input.previousContent,
      baseVersion: input.baseVersion,
      resultVersion: input.resultVersion,
      wasTransformed: input.wasTransformed ?? false,
      originalPosition: input.originalPosition,
      originalLength: input.originalLength,
      transformedBy: input.transformedBy ?? [],
      hadConflict: input.hadConflict ?? false,
      conflictResolution: input.conflictResolution,
      clientTimestamp: input.clientTimestamp,
      serverTimestamp: now,
      appliedAt: now,
      status: 'APPLIED',
    };

    this.operations.set(id, operation);
    
    // Update session stats
    await this.incrementSessionStats(
      input.sessionId,
      1,
      input.hadConflict ? 1 : 0
    );

    // Update participant stats
    const participant = await this.getParticipant(input.sessionId, input.userId);
    if (participant) {
      participant.totalEdits++;
    }

    this.emit('operation:recorded', operation);
    return operation;
  }

  async getOperations(
    sessionId: string,
    options?: QueryOptions & { sinceVersion?: number; userId?: string }
  ): Promise<EditOperationEntity[]> {
    let ops = Array.from(this.operations.values())
      .filter(op => op.sessionId === sessionId);

    if (options?.sinceVersion !== undefined) {
      ops = ops.filter(op => op.resultVersion > options.sinceVersion!);
    }
    if (options?.userId) {
      ops = ops.filter(op => op.userId === options.userId);
    }

    // Sort by sequence number
    ops.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    // Apply pagination
    if (options?.offset) {
      ops = ops.slice(options.offset);
    }
    if (options?.limit) {
      ops = ops.slice(0, options.limit);
    }

    return ops;
  }

  async getOperationById(id: string): Promise<EditOperationEntity | null> {
    return this.operations.get(id) ?? null;
  }

  async revertOperation(operationId: string): Promise<boolean> {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'APPLIED') return false;

    operation.status = 'REVERTED';
    this.emit('operation:reverted', operation);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  async getConfig(
    tenantId: string,
    documentId?: string,
    documentType?: string
  ): Promise<CollaborationConfigEntity | null> {
    // First try document-specific config
    if (documentId) {
      for (const config of Array.from(Array.from(this.configs.values()))) {
        if (config.tenantId === tenantId && config.documentId === documentId) {
          return config;
        }
      }
    }

    // Then try document type template
    if (documentType) {
      for (const config of Array.from(Array.from(this.configs.values()))) {
        if (
          config.tenantId === tenantId &&
          config.isTemplate &&
          config.documentType === documentType
        ) {
          return config;
        }
      }
    }

    // Return tenant default if exists
    for (const config of Array.from(Array.from(this.configs.values()))) {
      if (config.tenantId === tenantId && !config.documentId && config.isTemplate) {
        return config;
      }
    }

    return null;
  }

  async saveConfig(config: Omit<CollaborationConfigEntity, 'id'>): Promise<CollaborationConfigEntity> {
    const id = this.generateId('cfg');
    const entity: CollaborationConfigEntity = { id, ...config };
    this.configs.set(id, entity);
    return entity;
  }

  // ---------------------------------------------------------------------------
  // Activity Logging
  // ---------------------------------------------------------------------------

  async logActivity(input: LogActivityInput): Promise<SessionActivityEntity> {
    const id = this.generateId('act');
    const activity: SessionActivityEntity = {
      id,
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      documentId: input.documentId,
      userId: input.userId,
      activityType: input.activityType,
      description: input.description,
      metadata: input.metadata,
      occurredAt: new Date(),
    };

    this.activities.push(activity);
    this.emit('activity:logged', activity);
    return activity;
  }

  async getActivities(
    sessionId: string,
    options?: QueryOptions & { activityType?: ActivityType; userId?: string }
  ): Promise<SessionActivityEntity[]> {
    let activities = this.activities.filter(a => a.sessionId === sessionId);

    if (options?.activityType) {
      activities = activities.filter(a => a.activityType === options.activityType);
    }
    if (options?.userId) {
      activities = activities.filter(a => a.userId === options.userId);
    }

    // Sort by time descending
    activities.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (options?.offset) {
      activities = activities.slice(options.offset);
    }
    if (options?.limit) {
      activities = activities.slice(0, options.limit);
    }

    return activities;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private generateId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Date.now().toString(36)}`;
  }

  private generateSessionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // Removed ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.sessionsByCode.has(code)) {
      return this.generateSessionCode();
    }
    return code;
  }

  private getNextSequence(sessionId: string): number {
    const current = this.sequenceCounters.get(sessionId) ?? 0;
    const next = current + 1;
    this.sequenceCounters.set(sessionId, next);
    return next;
  }

  // ---------------------------------------------------------------------------
  // Cleanup & Maintenance
  // ---------------------------------------------------------------------------

  async cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const [id, session] of Array.from(this.sessions)) {
      if (session.status !== 'ACTIVE' && session.closedAt && session.closedAt < cutoff) {
        // Remove session and related data
        this.sessions.delete(id);
        this.sessionsByCode.delete(session.sessionCode);
        this.sequenceCounters.delete(id);
        
        // Remove participants
        for (const [pId, p] of Array.from(this.participants)) {
          if (p.sessionId === id) this.participants.delete(pId);
        }
        
        // Remove locks
        for (const [lId, l] of Array.from(this.locks)) {
          if (l.sessionId === id) this.locks.delete(lId);
        }
        
        // Remove operations
        for (const [oId, o] of Array.from(this.operations)) {
          if (o.sessionId === id) this.operations.delete(oId);
        }
        
        count++;
      }
    }

    return count;
  }

  getStats(): {
    sessions: number;
    activeSessions: number;
    participants: number;
    activeParticipants: number;
    locks: number;
    activeLocks: number;
    operations: number;
  } {
    return {
      sessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.status === 'ACTIVE').length,
      participants: this.participants.size,
      activeParticipants: Array.from(this.participants.values()).filter(p => p.isActive).length,
      locks: this.locks.size,
      activeLocks: Array.from(this.locks.values()).filter(l => l.status === 'ACTIVE').length,
      operations: this.operations.size,
    };
  }
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function computeSimpleHash(content: string): string {
  // Simple hash for demonstration (use crypto in production)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateUserColor(userId: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  computeSimpleHash,
  generateUserColor,
};

// Export factory function
export function createCollaborationRepository(
  config: CollaborationRepositoryConfig
): CollaborationRepository {
  return new CollaborationRepository(config);
}
