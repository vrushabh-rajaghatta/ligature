
// =============================================================================
// SESSION MANAGER
// =============================================================================
// Orchestrates collaborative editing sessions across all collaboration services
// Part of v0.18.8 - Real-Time Collaboration
// =============================================================================

import { EventEmitter } from 'events';
import { WebSocketServer, ClientConnection, WebSocketMessage, ContentChangePayload } from './websocket-server';
import { PresenceService, UserPresence, PresenceUpdate } from './presence-service';
import { CursorSyncService, CursorUpdate, SelectionUpdate, RemoteCursor } from './cursor-sync';
import { ConflictResolver, Operation } from './conflict-resolver';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CollaborativeSession {
  id: string;
  documentId: string;
  tenantId: string;
  createdAt: Date;
  createdBy: string;
  participants: SessionParticipant[];
  status: SessionStatus;
  settings: SessionSettings;
  lastActivity: Date;
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  userColor: string;
  role: ParticipantRole;
  joinedAt: Date;
  connectionId: string;
  presence: UserPresence;
  cursor?: RemoteCursor;
}

export type SessionStatus = 'active' | 'paused' | 'closed';
export type ParticipantRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface SessionSettings {
  allowAnonymous: boolean;
  maxParticipants: number;
  autoSaveInterval: number;       // ms
  lockTimeout: number;            // ms before releasing locks
  conflictResolution: 'auto' | 'manual';
}

export interface SessionManagerConfig {
  tenantId: string;
  defaultSettings: SessionSettings;
  sessionTimeout: number;         // ms before inactive session closes
  cleanupInterval: number;        // ms between cleanup runs
}

export interface JoinSessionResult {
  session: CollaborativeSession;
  participant: SessionParticipant;
  currentContent: string;
  currentVersion: number;
  otherParticipants: SessionParticipant[];
}

export interface ContentEdit {
  userId: string;
  sessionId: string;
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
}

export interface SessionManagerStats {
  activeSessions: number;
  totalParticipants: number;
  editsProcessed: number;
  conflictsResolved: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_SETTINGS: SessionSettings = {
  allowAnonymous: false,
  maxParticipants: 20,
  autoSaveInterval: 30000,        // 30 seconds
  lockTimeout: 60000,             // 1 minute
  conflictResolution: 'auto',
};

const DEFAULT_CONFIG: Omit<SessionManagerConfig, 'tenantId'> = {
  defaultSettings: DEFAULT_SETTINGS,
  sessionTimeout: 3600000,        // 1 hour
  cleanupInterval: 60000,         // 1 minute
};

// -----------------------------------------------------------------------------
// Session Manager
// -----------------------------------------------------------------------------

export class SessionManager extends EventEmitter {
  private config: SessionManagerConfig;
  private sessions: Map<string, CollaborativeSession> = new Map();
  private documentSessions: Map<string, string> = new Map();     // documentId -> sessionId
  private userSessions: Map<string, Set<string>> = new Map();    // userId -> sessionIds
  
  // Sub-services
  private wsServer: WebSocketServer;
  private presenceService: PresenceService;
  private cursorSync: CursorSyncService;
  private conflictResolver: ConflictResolver;
  
  private cleanupTimer?: NodeJS.Timeout;
  private sessionCounter = 0;
  private stats: SessionManagerStats;

  constructor(config: Partial<SessionManagerConfig> & { tenantId: string }) {
    super();
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      defaultSettings: { ...DEFAULT_SETTINGS, ...config.defaultSettings },
    };
    
    // Initialize sub-services
    this.wsServer = new WebSocketServer({ tenantId: config.tenantId });
    this.presenceService = new PresenceService({ tenantId: config.tenantId });
    this.cursorSync = new CursorSyncService({ tenantId: config.tenantId });
    this.conflictResolver = new ConflictResolver({ tenantId: config.tenantId });
    
    this.stats = {
      activeSessions: 0,
      totalParticipants: 0,
      editsProcessed: 0,
      conflictsResolved: 0,
    };
    
    this.setupEventHandlers();
    this.startCleanup();
  }

  // ---------------------------------------------------------------------------
  // Session Lifecycle
  // ---------------------------------------------------------------------------

  async createSession(
    documentId: string,
    userId: string,
    content: string,
    settings: Partial<SessionSettings> = {}
  ): Promise<CollaborativeSession> {
    // Check if session already exists for this document
    const existingSessionId = this.documentSessions.get(documentId);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing && existing.status === 'active') {
        return existing;
      }
    }

    this.sessionCounter++;
    const now = new Date();
    
    const session: CollaborativeSession = {
      id: `session-${this.config.tenantId}-${now.getTime()}-${this.sessionCounter}`,
      documentId,
      tenantId: this.config.tenantId,
      createdAt: now,
      createdBy: userId,
      participants: [],
      status: 'active',
      settings: { ...this.config.defaultSettings, ...settings },
      lastActivity: now,
    };

    // Initialize conflict resolver for this document
    this.conflictResolver.initializeDocument(documentId, content);

    this.sessions.set(session.id, session);
    this.documentSessions.set(documentId, session.id);
    this.stats.activeSessions++;

    this.emit('session_created', session);
    return session;
  }

  async joinSession(
    sessionId: string,
    userId: string,
    userName: string,
    role: ParticipantRole = 'editor'
  ): Promise<JoinSessionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${sessionId}`);
    }

    if (session.participants.length >= session.settings.maxParticipants) {
      throw new Error(`Session is full: ${sessionId}`);
    }

    // Check if user already in session
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      const state = this.conflictResolver.getDocumentState(session.documentId);
      return {
        session,
        participant: existingParticipant,
        currentContent: state?.content || '',
        currentVersion: state?.version || 0,
        otherParticipants: session.participants.filter(p => p.userId !== userId),
      };
    }

    // Create WebSocket connection
    const connection = await this.wsServer.connect(userId, sessionId);

    // Create presence
    const presence = await this.presenceService.join(userId, userName, session.documentId);

    // Register cursor
    this.cursorSync.registerUser(userId, userName, presence.userColor);

    const participant: SessionParticipant = {
      userId,
      userName,
      userColor: presence.userColor,
      role,
      joinedAt: new Date(),
      connectionId: connection.id,
      presence,
    };

    session.participants.push(participant);
    session.lastActivity = new Date();

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    this.stats.totalParticipants++;

    // Broadcast join to other participants
    await this.wsServer.broadcast(sessionId, {
      type: 'presence_update',
      payload: { action: 'joined', participant },
      senderId: userId,
    }, connection.id);

    const state = this.conflictResolver.getDocumentState(session.documentId);

    this.emit('participant_joined', { session, participant });

    return {
      session,
      participant,
      currentContent: state?.content || '',
      currentVersion: state?.version || 0,
      otherParticipants: session.participants.filter(p => p.userId !== userId),
    };
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participantIndex = session.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) return;

    const participant = session.participants[participantIndex];

    // Remove from session
    session.participants.splice(participantIndex, 1);
    session.lastActivity = new Date();

    // Disconnect WebSocket
    await this.wsServer.disconnect(participant.connectionId);

    // Leave presence
    await this.presenceService.leave(userId);

    // Unregister cursor
    this.cursorSync.unregisterUser(userId);

    // Update user sessions tracking
    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    this.stats.totalParticipants--;

    // Broadcast leave to other participants
    await this.wsServer.broadcast(sessionId, {
      type: 'presence_update',
      payload: { action: 'left', userId },
      senderId: userId,
    });

    // Close session if empty
    if (session.participants.length === 0) {
      await this.closeSession(sessionId);
    }

    this.emit('participant_left', { session, userId });
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'closed';

    // Disconnect all participants
    for (const participant of Array.from(session.participants)) {
      await this.wsServer.disconnect(participant.connectionId);
      await this.presenceService.leave(participant.userId);
      this.cursorSync.unregisterUser(participant.userId);
    }

    // Cleanup
    this.documentSessions.delete(session.documentId);
    this.conflictResolver.removeDocument(session.documentId);
    this.sessions.delete(sessionId);

    this.stats.activeSessions--;

    this.emit('session_closed', session);
  }

  // ---------------------------------------------------------------------------
  // Content Editing
  // ---------------------------------------------------------------------------

  async processEdit(edit: ContentEdit): Promise<string> {
    const session = this.sessions.get(edit.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${edit.sessionId}`);
    }

    const participant = session.participants.find(p => p.userId === edit.userId);
    if (!participant || (participant.role !== 'editor' && participant.role !== 'owner')) {
      throw new Error('User does not have edit permissions');
    }

    // Create operation
    let operation: Operation;
    if (edit.operation === 'insert' && edit.content) {
      operation = this.conflictResolver.createInsertOperation(
        edit.userId,
        session.documentId,
        edit.position,
        edit.content
      );
    } else if (edit.operation === 'delete' && edit.length) {
      operation = this.conflictResolver.createDeleteOperation(
        edit.userId,
        session.documentId,
        edit.position,
        edit.length
      );
    } else if (edit.operation === 'replace' && edit.content && edit.length) {
      // Replace = delete + insert
      const deleteOp = this.conflictResolver.createDeleteOperation(
        edit.userId,
        session.documentId,
        edit.position,
        edit.length
      );
      this.conflictResolver.applyOperation(deleteOp);
      
      operation = this.conflictResolver.createInsertOperation(
        edit.userId,
        session.documentId,
        edit.position,
        edit.content
      );
    } else {
      throw new Error('Invalid edit operation');
    }

    // Apply operation
    const newContent = this.conflictResolver.applyOperation(operation);
    const state = this.conflictResolver.getDocumentState(session.documentId);

    // Transform other users' cursors
    const changeLength = edit.operation === 'insert' 
      ? (edit.content?.length || 0)
      : -(edit.length || 0);
    this.cursorSync.transformCursors(session.documentId, edit.position, changeLength, edit.userId);

    // Broadcast to other participants
    const changePayload: ContentChangePayload = {
      documentId: session.documentId,
      operation: edit.operation,
      position: edit.position,
      content: edit.content,
      length: edit.length,
      version: state?.version || 0,
    };

    await this.wsServer.broadcast(edit.sessionId, {
      type: 'content_change',
      payload: changePayload,
      senderId: edit.userId,
    }, participant.connectionId);

    session.lastActivity = new Date();
    this.stats.editsProcessed++;

    this.emit('content_changed', { sessionId: edit.sessionId, edit, newContent });
    return newContent;
  }

  // ---------------------------------------------------------------------------
  // Cursor & Selection
  // ---------------------------------------------------------------------------

  async updateCursor(sessionId: string, update: CursorUpdate): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const cursor = this.cursorSync.updateCursor(update);
    if (!cursor) return; // Throttled

    const participant = session.participants.find(p => p.userId === update.userId);
    if (!participant) return;

    // Update participant cursor
    participant.cursor = this.cursorSync.getRemoteCursor(update.userId, session.documentId) || undefined;

    // Broadcast to other participants
    await this.wsServer.broadcast(sessionId, {
      type: 'cursor_update',
      payload: cursor,
      senderId: update.userId,
    }, participant.connectionId);
  }

  async updateSelection(sessionId: string, update: SelectionUpdate): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const selection = this.cursorSync.updateSelection(update);
    if (!selection) return; // Throttled

    const participant = session.participants.find(p => p.userId === update.userId);
    if (!participant) return;

    // Broadcast to other participants
    await this.wsServer.broadcast(sessionId, {
      type: 'selection_update',
      payload: selection,
      senderId: update.userId,
    }, participant.connectionId);
  }

  // ---------------------------------------------------------------------------
  // Presence
  // ---------------------------------------------------------------------------

  async updatePresence(sessionId: string, update: PresenceUpdate): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const presence = await this.presenceService.updatePresence(update);
    if (!presence) return;

    const participant = session.participants.find(p => p.userId === update.userId);
    if (participant) {
      participant.presence = presence;
    }

    // Broadcast to other participants
    await this.wsServer.broadcast(sessionId, {
      type: 'presence_update',
      payload: { action: 'updated', presence },
      senderId: update.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getSession(sessionId: string): CollaborativeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByDocument(documentId: string): CollaborativeSession | undefined {
    const sessionId = this.documentSessions.get(documentId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  getUserSessions(userId: string): CollaborativeSession[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: CollaborativeSession[] = [];
    
    for (const sessionId of Array.from(sessionIds)) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  getSessionParticipants(sessionId: string): SessionParticipant[] {
    const session = this.sessions.get(sessionId);
    return session?.participants || [];
  }

  getDocumentContent(sessionId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const state = this.conflictResolver.getDocumentState(session.documentId);
    return state?.content;
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private setupEventHandlers(): void {
    // WebSocket events
    this.wsServer.on('disconnection', (connection: ClientConnection) => {
      this.handleDisconnection(connection);
    });

    this.wsServer.on('message:content_change', ({ connectionId, message }) => {
      this.handleRemoteChange(connectionId, message);
    });

    // Presence events
    this.presenceService.on('presence_updated', (presence: UserPresence) => {
      this.handlePresenceUpdate(presence);
    });
  }

  private async handleDisconnection(connection: ClientConnection): Promise<void> {
    // Find and remove from session
    await this.leaveSession(connection.sessionId, connection.userId);
  }

  private async handleRemoteChange(connectionId: string, message: WebSocketMessage): Promise<void> {
    // Handle incoming changes from other clients
    const connection = this.wsServer.getConnection(connectionId);
    if (!connection) return;

    // This would be used in a real WebSocket implementation
    // to process incoming changes from clients
  }

  private handlePresenceUpdate(presence: UserPresence): void {
    if (!presence.documentId) return;
    
    const session = this.getSessionByDocument(presence.documentId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === presence.userId);
    if (participant) {
      participant.presence = presence;
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleSessions();
    }, this.config.cleanupInterval);
  }

  private async cleanupStaleSessions(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of Array.from(Array.from(this.sessions.entries()))) {
      const timeSinceActivity = now - session.lastActivity.getTime();
      
      if (timeSinceActivity > this.config.sessionTimeout) {
        await this.closeSession(sessionId);
      }
    }

    // Also cleanup cursor sync
    this.cursorSync.cleanupStaleCursors();
  }

  // ---------------------------------------------------------------------------
  // Stats & Config
  // ---------------------------------------------------------------------------

  getStats(): SessionManagerStats {
    return { ...this.stats };
  }

  getConfig(): SessionManagerConfig {
    return { ...this.config };
  }

  // Sub-service access (for advanced use cases)
  getWebSocketServer(): WebSocketServer { return this.wsServer; }
  getPresenceService(): PresenceService { return this.presenceService; }
  getCursorSyncService(): CursorSyncService { return this.cursorSync; }
  getConflictResolver(): ConflictResolver { return this.conflictResolver; }

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Close all sessions
    for (const sessionId of Array.from(Array.from(this.sessions.keys()))) {
      await this.closeSession(sessionId);
    }

    // Shutdown sub-services
    await this.wsServer.shutdown();
    await this.presenceService.shutdown();
    await this.cursorSync.shutdown();
    await this.conflictResolver.shutdown();

    this.emit('shutdown');
  }
}
