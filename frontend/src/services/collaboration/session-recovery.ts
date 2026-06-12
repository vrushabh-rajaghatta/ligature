
// =============================================================================
// SESSION RECOVERY SERVICE
// =============================================================================
// Handles session reconnection with state restoration after disconnection.
// Integrates with CollaborationRepository for persistence layer access.
// Part of v0.18.11 - Session Recovery Service
// =============================================================================

import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';

import {
  CollaborationRepository,
  type CollaborativeSessionEntity,
  type SessionParticipantEntity,
  type EditOperationEntity,
} from './collaboration-repository';

import {
  type ReconnectionToken,
  type CursorSnapshot,
  type SelectionSnapshot,
  type RecoverySessionState,
  type ConflictDetail,
  type RecoveryRequest,
  type RecoveryResponse,
  type PendingOperation,
  type HeartbeatMessage,
  type HeartbeatResponse,
  type ConnectionHealth,
  type BackoffConfig,
  type BackoffState,
  type SessionRecoveryConfig,
  type SessionRecoveryStats,
  type DisconnectionReason,
  type RecoveryResult,
  type ReconnectionState,
  type ISessionRecoveryService,
  isTokenValid,
  canAttemptReconnection,
  calculateBackoffDelay,
  determineConnectionQuality,
  isSessionRecoverable,
  createDefaultRecoveryConfig,
  createInitialBackoffState,
  TOKEN_ID_LENGTH,
  TOKEN_SECRET_LENGTH,
} from '@/types/session-recovery';

import type { PresenceStatus, ParticipantRole } from '@/types/collaboration-persistence';

// -----------------------------------------------------------------------------
// Session Recovery Service
// -----------------------------------------------------------------------------

export class SessionRecoveryService extends EventEmitter implements ISessionRecoveryService {
  private config: SessionRecoveryConfig;
  private repository: CollaborationRepository;
  
  // Token storage
  private tokens: Map<string, ReconnectionToken> = new Map();
  private tokensByUser: Map<string, Set<string>> = new Map();  // userId -> tokenIds
  private tokensBySession: Map<string, Set<string>> = new Map(); // sessionId -> tokenIds
  
  // Backoff state
  private backoffStates: Map<string, BackoffState> = new Map();
  
  // Connection health tracking
  private heartbeats: Map<string, HeartbeatRecord> = new Map(); // `${sessionId}:${userId}`
  private healthCache: Map<string, ConnectionHealth> = new Map();
  
  // Statistics
  private stats: SessionRecoveryStats;
  private recoveryTimes: number[] = [];  // For average calculation
  private downtimes: number[] = [];

  constructor(
    config: Partial<SessionRecoveryConfig> & { tenantId: string },
    repository: CollaborationRepository
  ) {
    super();
    this.config = { ...createDefaultRecoveryConfig(config.tenantId), ...config };
    this.repository = repository;
    
    this.stats = {
      activeTokens: 0,
      expiredTokens: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      partialRecoveries: 0,
      averageRecoveryTime: 0,
      averageDowntime: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Token Management
  // ---------------------------------------------------------------------------

  async createReconnectionToken(
    sessionId: string,
    userId: string,
    reason: DisconnectionReason
  ): Promise<ReconnectionToken> {
    // Get session and participant info
    const session = await this.repository.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const participant = await this.repository.getParticipant(sessionId, userId);
    if (!participant) {
      throw new Error(`Participant not found: ${userId} in session ${sessionId}`);
    }

    // Invalidate existing tokens for this user/session
    const existingToken = await this.getTokenByUser(userId, sessionId);
    if (existingToken) {
      await this.invalidateToken(existingToken.tokenId);
    }

    const now = new Date();
    const token: ReconnectionToken = {
      tokenId: this.generateTokenId(),
      tokenSecret: this.generateTokenSecret(),
      sessionId,
      sessionCode: session.sessionCode,
      documentId: session.documentId,
      tenantId: session.tenantId,
      userId,
      userName: participant.userName,
      userColor: participant.userColor,
      role: participant.role as ParticipantRole,
      lastVersion: session.currentVersion,
      lastPosition: participant.cursorPosition !== undefined ? {
        position: participant.cursorPosition,
        line: participant.cursorLine ?? 0,
        column: participant.cursorColumn ?? 0,
      } : undefined,
      lastSelection: participant.selectionStart !== undefined && participant.selectionEnd !== undefined ? {
        start: participant.selectionStart,
        end: participant.selectionEnd,
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      } : undefined,
      lastPresenceStatus: participant.presenceStatus as PresenceStatus,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + this.config.tokenTTL),
      disconnectedAt: now,
      disconnectionReason: reason,
      reconnectAttempts: 0,
    };

    // Store token
    this.tokens.set(token.tokenId, token);
    
    // Track by user
    if (!this.tokensByUser.has(userId)) {
      this.tokensByUser.set(userId, new Set());
    }
    this.tokensByUser.get(userId)!.add(token.tokenId);
    
    // Track by session
    if (!this.tokensBySession.has(sessionId)) {
      this.tokensBySession.set(sessionId, new Set());
    }
    this.tokensBySession.get(sessionId)!.add(token.tokenId);

    // Initialize backoff state
    this.backoffStates.set(token.tokenId, createInitialBackoffState());

    this.stats.activeTokens++;
    this.emit('token:created', { token });

    return token;
  }

  async validateToken(tokenId: string, tokenSecret: string): Promise<boolean> {
    const token = this.tokens.get(tokenId);
    if (!token) return false;
    
    // Check secret matches
    if (token.tokenSecret !== tokenSecret) return false;
    
    // Check not expired
    if (!isTokenValid(token)) {
      this.emit('token:expired', { tokenId, userId: token.userId });
      return false;
    }
    
    // Check can still attempt
    if (!canAttemptReconnection(token, this.config.maxReconnectAttempts)) {
      return false;
    }

    this.emit('token:validated', { tokenId, userId: token.userId });
    return true;
  }

  async invalidateToken(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (!token) return;

    // Remove from all tracking maps
    this.tokens.delete(tokenId);
    this.tokensByUser.get(token.userId)?.delete(tokenId);
    this.tokensBySession.get(token.sessionId)?.delete(tokenId);
    this.backoffStates.delete(tokenId);

    this.stats.activeTokens--;
    this.emit('token:invalidated', { tokenId, reason: 'manual' });
  }

  async invalidateUserTokens(userId: string): Promise<number> {
    const tokenIds = this.tokensByUser.get(userId);
    if (!tokenIds) return 0;

    let count = 0;
    for (const tokenId of Array.from(tokenIds)) {
      await this.invalidateToken(tokenId);
      count++;
    }

    return count;
  }

  async getTokenByUser(userId: string, sessionId: string): Promise<ReconnectionToken | null> {
    const tokenIds = this.tokensByUser.get(userId);
    if (!tokenIds) return null;

    for (const tokenId of Array.from(tokenIds)) {
      const token = this.tokens.get(tokenId);
      if (token && token.sessionId === sessionId && isTokenValid(token)) {
        return token;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Recovery Operations
  // ---------------------------------------------------------------------------

  async initiateRecovery(request: RecoveryRequest): Promise<RecoveryResponse> {
    const startTime = Date.now();
    
    // Validate token
    const isValid = await this.validateToken(request.tokenId, request.tokenSecret);
    if (!isValid) {
      this.stats.failedRecoveries++;
      return {
        result: 'INVALID_TOKEN',
        errorCode: 'TOKEN_INVALID',
        errorMessage: 'Reconnection token is invalid or expired',
      };
    }

    const token = this.tokens.get(request.tokenId)!;
    token.reconnectAttempts++;
    token.lastAttemptAt = new Date();

    this.emit('recovery:started', {
      tokenId: token.tokenId,
      userId: token.userId,
      sessionId: token.sessionId,
    });

    // Check session still exists and is active
    const session = await this.repository.getSessionById(token.sessionId);
    if (!session) {
      this.recordAttempt(token.tokenId, false);
      this.stats.failedRecoveries++;
      return {
        result: 'SESSION_CLOSED',
        errorCode: 'SESSION_NOT_FOUND',
        errorMessage: 'Session no longer exists',
      };
    }

    if (session.status !== 'ACTIVE') {
      this.recordAttempt(token.tokenId, false);
      this.stats.failedRecoveries++;
      return {
        result: 'SESSION_CLOSED',
        errorCode: 'SESSION_INACTIVE',
        errorMessage: `Session is ${session.status}`,
      };
    }

    // Check session is within recovery window
    if (!isSessionRecoverable(session, token.disconnectedAt, this.config.sessionRecoveryWindow)) {
      this.recordAttempt(token.tokenId, false);
      this.stats.failedRecoveries++;
      return {
        result: 'EXPIRED',
        errorCode: 'RECOVERY_WINDOW_EXPIRED',
        errorMessage: 'Session recovery window has expired',
      };
    }

    // Get missed operations
    const missedOps = await this.getMissedOperations(
      token.sessionId,
      request.localVersion ?? token.lastVersion,
      this.config.maxOperationsToSync
    );

    this.emit('recovery:syncing', {
      tokenId: token.tokenId,
      operationCount: missedOps.length,
    });

    // Detect conflicts if client has pending operations
    let conflicts: ConflictDetail[] = [];
    if (request.pendingOperations && request.pendingOperations.length > 0) {
      conflicts = await this.detectConflicts(
        token.sessionId,
        request.localVersion ?? token.lastVersion,
        request.pendingOperations
      );
      
      if (conflicts.length > 0) {
        this.stats.conflictsDetected += conflicts.length;
        this.emit('conflict:detected', { tokenId: token.tokenId, conflicts });
      }
    }

    // Rejoin session - reactivate participant
    const participant = await this.repository.addParticipant({
      sessionId: token.sessionId,
      userId: token.userId,
      userName: token.userName,
      userColor: token.userColor,
      role: token.role,
    });

    // Restore cursor position if available
    if (token.lastPosition) {
      await this.restoreCursorPosition(token.sessionId, token.userId, token.lastPosition);
    }

    // Restore presence
    await this.restorePresence(token.sessionId, token.userId, 'ACTIVE');

    // Get active participants
    const activeParticipants = await this.repository.getSessionParticipants(token.sessionId, true);
    const otherParticipants = activeParticipants.filter(p => p.userId !== token.userId);

    // Log activity
    await this.repository.logActivity({
      tenantId: token.tenantId,
      sessionId: token.sessionId,
      documentId: token.documentId,
      userId: token.userId,
      activityType: 'PARTICIPANT_RECONNECTED',
      description: `User reconnected after ${Date.now() - token.disconnectedAt.getTime()}ms`,
      metadata: {
        disconnectionReason: token.disconnectionReason,
        missedOperations: missedOps.length,
        conflicts: conflicts.length,
      },
    });

    // Calculate metrics
    const recoveryTime = Date.now() - startTime;
    const downtime = Date.now() - token.disconnectedAt.getTime();
    
    this.recoveryTimes.push(recoveryTime);
    this.downtimes.push(downtime);
    this.updateAverages();

    // Determine result
    let result: RecoveryResult = 'SUCCESS';
    if (conflicts.length > 0) {
      result = 'CONFLICT';
      this.stats.partialRecoveries++;
    } else {
      this.stats.successfulRecoveries++;
    }

    this.recordAttempt(token.tokenId, true);

    // Create new token for future disconnections
    const newToken = await this.createReconnectionToken(
      token.sessionId,
      token.userId,
      'UNKNOWN'  // Fresh token
    );

    this.emit('recovery:complete', {
      tokenId: token.tokenId,
      result,
      downtime,
    });

    return {
      result,
      session,
      participant,
      currentContent: session.currentContent,
      currentVersion: session.currentVersion,
      missedOperations: missedOps,
      activeParticipants: otherParticipants,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      newToken,
      reconnectedAt: new Date(),
      downtime,
    };
  }

  async getRecoveryState(tokenId: string): Promise<RecoverySessionState | null> {
    const token = this.tokens.get(tokenId);
    if (!token) return null;

    const session = await this.repository.getSessionById(token.sessionId);
    if (!session) return null;

    const participant = await this.repository.getParticipant(token.sessionId, token.userId);
    if (!participant) return null;

    const missedOps = await this.getMissedOperations(token.sessionId, token.lastVersion);
    const activeParticipants = await this.repository.getSessionParticipants(token.sessionId, true);

    return {
      session,
      participant,
      missedOperations: missedOps,
      missedOperationCount: missedOps.length,
      currentContent: session.currentContent ?? '',
      currentVersion: session.currentVersion,
      currentHash: session.currentHash ?? '',
      activeParticipants: activeParticipants.filter(p => p.userId !== token.userId),
      lastSyncedVersion: token.lastVersion,
      operationsToApply: missedOps.length,
      hasConflicts: false,  // Would need pending ops to check
    };
  }

  async getMissedOperations(
    sessionId: string,
    sinceVersion: number,
    limit?: number
  ): Promise<EditOperationEntity[]> {
    return this.repository.getOperations(sessionId, {
      sinceVersion,
      limit: limit ?? this.config.maxOperationsToSync,
    });
  }

  // ---------------------------------------------------------------------------
  // State Restoration
  // ---------------------------------------------------------------------------

  async restoreCursorPosition(
    sessionId: string,
    userId: string,
    snapshot: CursorSnapshot
  ): Promise<boolean> {
    const participant = await this.repository.getParticipant(sessionId, userId);
    if (!participant) return false;

    await this.repository.updateParticipant(participant.id, {
      cursorPosition: snapshot.position,
      cursorLine: snapshot.line,
      cursorColumn: snapshot.column,
    });

    return true;
  }

  async restoreSelection(
    sessionId: string,
    userId: string,
    snapshot: SelectionSnapshot
  ): Promise<boolean> {
    const participant = await this.repository.getParticipant(sessionId, userId);
    if (!participant) return false;

    await this.repository.updateParticipant(participant.id, {
      selectionStart: snapshot.start,
      selectionEnd: snapshot.end,
    });

    return true;
  }

  async restorePresence(
    sessionId: string,
    userId: string,
    status: PresenceStatus
  ): Promise<boolean> {
    const participant = await this.repository.getParticipant(sessionId, userId);
    if (!participant) return false;

    await this.repository.updateParticipant(participant.id, {
      presenceStatus: status,
      connectionStatus: 'CONNECTED',
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  async detectConflicts(
    sessionId: string,
    localVersion: number,
    pendingOps: PendingOperation[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];
    
    // Get operations since local version
    const remoteOps = await this.getMissedOperations(sessionId, localVersion);
    
    for (const pending of Array.from(pendingOps)) {
      for (const remote of Array.from(remoteOps)) {
        const conflict = this.checkOperationConflict(pending, remote);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private checkOperationConflict(
    local: PendingOperation,
    remote: EditOperationEntity
  ): ConflictDetail | null {
    // Check for position overlap
    const localEnd = local.position + (local.length ?? local.content?.length ?? 0);
    const remoteEnd = remote.position + (remote.length ?? remote.content?.length ?? 0);

    // No overlap - no conflict
    if (localEnd <= remote.position || remoteEnd <= local.position) {
      return null;
    }

    // Determine conflict type
    let conflictType: ConflictDetail['conflictType'] = 'CONCURRENT';
    
    if (local.operationType === 'DELETE' || remote.operationType === 'DELETE') {
      conflictType = 'DELETE';
    } else if (local.position === remote.position) {
      conflictType = 'POSITION';
    } else {
      conflictType = 'CONTENT';
    }

    return {
      operationId: `conflict-${local.operationId}-${remote.operationId}`,
      conflictType,
      description: `${conflictType} conflict at position ${local.position}`,
      remoteOperation: remote,
      suggestedResolution: conflictType === 'DELETE' 
        ? 'ACCEPT_REMOTE' 
        : 'MERGE',
    };
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'ACCEPT_LOCAL' | 'ACCEPT_REMOTE' | 'MERGE'
  ): Promise<boolean> {
    // In a full implementation, this would:
    // 1. Find the conflict in a tracking store
    // 2. Apply the resolution
    // 3. Update document state
    // 4. Notify other participants
    
    this.stats.conflictsResolved++;
    this.emit('conflict:resolved', { conflictId, resolution });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Connection Health
  // ---------------------------------------------------------------------------

  async recordHeartbeat(message: HeartbeatMessage): Promise<HeartbeatResponse> {
    const key = `${message.sessionId}:${message.userId}`;
    const now = new Date();
    const serverTime = now;
    
    const previous = this.heartbeats.get(key);
    const latency = previous 
      ? now.getTime() - message.timestamp.getTime()
      : 0;

    const record: HeartbeatRecord = {
      sessionId: message.sessionId,
      userId: message.userId,
      lastHeartbeat: now,
      sequence: message.sequence,
      latencies: previous ? [...previous.latencies.slice(-9), latency] : [latency],
      missedCount: 0,
    };

    this.heartbeats.set(key, record);

    // Update health cache
    await this.updateConnectionHealth(message.sessionId, message.userId);

    // Get current participant count
    const participants = await this.repository.getSessionParticipants(message.sessionId, true);
    
    // Get session for version
    const session = await this.repository.getSessionById(message.sessionId);

    this.emit('heartbeat:received', {
      sessionId: message.sessionId,
      userId: message.userId,
      latency,
    });

    return {
      acknowledged: true,
      serverTime,
      latency,
      serverVersion: session?.currentVersion ?? 0,
      participantCount: participants.length,
    };
  }

  async getConnectionHealth(sessionId: string, userId: string): Promise<ConnectionHealth> {
    const key = `${sessionId}:${userId}`;
    
    // Return cached if available
    const cached = this.healthCache.get(key);
    if (cached) return cached;

    // Calculate fresh
    return this.calculateConnectionHealth(sessionId, userId);
  }

  private async updateConnectionHealth(sessionId: string, userId: string): Promise<void> {
    const health = await this.calculateConnectionHealth(sessionId, userId);
    const key = `${sessionId}:${userId}`;
    
    const previous = this.healthCache.get(key);
    this.healthCache.set(key, health);

    // Emit events on quality changes
    if (previous) {
      if (previous.connectionQuality !== health.connectionQuality) {
        if (health.connectionQuality === 'EXCELLENT' || health.connectionQuality === 'GOOD') {
          this.emit('connection:restored', { sessionId, userId });
        } else if (health.connectionQuality === 'POOR' || health.connectionQuality === 'CRITICAL') {
          this.emit('connection:degraded', { sessionId, userId, quality: health.connectionQuality });
        }
      }
    }
  }

  private async calculateConnectionHealth(sessionId: string, userId: string): Promise<ConnectionHealth> {
    const key = `${sessionId}:${userId}`;
    const record = this.heartbeats.get(key);

    if (!record) {
      return {
        isConnected: false,
        lastHeartbeat: new Date(0),
        latency: 0,
        packetLoss: 100,
        connectionQuality: 'CRITICAL',
        reconnectionEligible: true,
      };
    }

    const timeSinceHeartbeat = Date.now() - record.lastHeartbeat.getTime();
    const isConnected = timeSinceHeartbeat < this.config.heartbeatTimeout;
    
    // Calculate average latency
    const avgLatency = record.latencies.length > 0
      ? record.latencies.reduce((a, b) => a + b, 0) / record.latencies.length
      : 0;

    // Estimate packet loss from missed heartbeats
    const expectedHeartbeats = Math.floor(timeSinceHeartbeat / this.config.heartbeatInterval);
    const packetLoss = expectedHeartbeats > 0
      ? Math.min(100, (record.missedCount / expectedHeartbeats) * 100)
      : 0;

    const connectionQuality = determineConnectionQuality(avgLatency, packetLoss);

    // Check if token exists for reconnection
    const token = await this.getTokenByUser(userId, sessionId);
    const reconnectionEligible = token !== null && isTokenValid(token);

    return {
      isConnected,
      lastHeartbeat: record.lastHeartbeat,
      latency: avgLatency,
      packetLoss,
      connectionQuality,
      reconnectionEligible,
    };
  }

  // ---------------------------------------------------------------------------
  // Backoff Management
  // ---------------------------------------------------------------------------

  getBackoffState(tokenId: string): BackoffState {
    return this.backoffStates.get(tokenId) ?? createInitialBackoffState();
  }

  recordAttempt(tokenId: string, success: boolean): void {
    const state = this.backoffStates.get(tokenId);
    if (!state) return;

    if (success) {
      // Reset on success
      this.resetBackoff(tokenId);
    } else {
      // Increment backoff
      state.attempt++;
      state.lastAttemptAt = new Date();
      state.nextDelay = calculateBackoffDelay(state, this.config.backoff);
      state.totalWaitTime += state.nextDelay;
      
      if (state.attempt >= this.config.backoff.maxAttempts) {
        state.exhausted = true;
      }
    }
  }

  resetBackoff(tokenId: string): void {
    this.backoffStates.set(tokenId, createInitialBackoffState());
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async cleanupExpiredTokens(): Promise<number> {
    let count = 0;
    const now = new Date();

    for (const [tokenId, token] of Array.from(this.tokens)) {
      if (token.expiresAt < now) {
        await this.invalidateToken(tokenId);
        this.stats.expiredTokens++;
        count++;
      }
    }

    return count;
  }

  getStats(): SessionRecoveryStats {
    return { ...this.stats };
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private generateTokenId(): string {
    return randomBytes(TOKEN_ID_LENGTH / 2).toString('hex');
  }

  private generateTokenSecret(): string {
    return randomBytes(TOKEN_SECRET_LENGTH / 2).toString('hex');
  }

  private updateAverages(): void {
    if (this.recoveryTimes.length > 0) {
      this.stats.averageRecoveryTime = 
        this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length;
    }
    if (this.downtimes.length > 0) {
      this.stats.averageDowntime = 
        this.downtimes.reduce((a, b) => a + b, 0) / this.downtimes.length;
    }

    // Keep arrays bounded
    if (this.recoveryTimes.length > 100) {
      this.recoveryTimes = this.recoveryTimes.slice(-100);
    }
    if (this.downtimes.length > 100) {
      this.downtimes = this.downtimes.slice(-100);
    }
  }
}

// -----------------------------------------------------------------------------
// Internal Types
// -----------------------------------------------------------------------------

interface HeartbeatRecord {
  sessionId: string;
  userId: string;
  lastHeartbeat: Date;
  sequence: number;
  latencies: number[];
  missedCount: number;
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createSessionRecoveryService(
  config: Partial<SessionRecoveryConfig> & { tenantId: string },
  repository: CollaborationRepository
): SessionRecoveryService {
  return new SessionRecoveryService(config, repository);
}

// -----------------------------------------------------------------------------
// Re-exports
// -----------------------------------------------------------------------------

export type {
  ReconnectionToken,
  CursorSnapshot,
  SelectionSnapshot,
  RecoverySessionState,
  ConflictDetail,
  RecoveryRequest,
  RecoveryResponse,
  PendingOperation,
  HeartbeatMessage,
  HeartbeatResponse,
  ConnectionHealth,
  BackoffConfig,
  BackoffState,
  SessionRecoveryConfig,
  SessionRecoveryStats,
  DisconnectionReason,
  RecoveryResult,
  ReconnectionState,
  ISessionRecoveryService,
} from '@/types/session-recovery';

export {
  isTokenValid,
  canAttemptReconnection,
  calculateBackoffDelay,
  determineConnectionQuality,
  isSessionRecoverable,
  createDefaultRecoveryConfig,
  createDefaultBackoffConfig,
  createInitialBackoffState,
  TOKEN_ID_LENGTH,
  TOKEN_SECRET_LENGTH,
  DEFAULT_TOKEN_TTL,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_HEARTBEAT_TIMEOUT,
  MAX_OPERATIONS_PER_SYNC,
  SYNC_BATCH_SIZE,
  QUALITY_THRESHOLDS,
} from '@/types/session-recovery';
