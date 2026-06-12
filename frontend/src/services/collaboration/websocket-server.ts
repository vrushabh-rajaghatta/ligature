
// =============================================================================
// WEBSOCKET SERVER
// =============================================================================
// Real-time collaboration WebSocket connection handler
// Part of v0.18.8 - Real-Time Collaboration
// =============================================================================

import { EventEmitter } from 'events';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketConfig {
  tenantId: string;
  maxConnections: number;
  heartbeatInterval: number;      // ms
  reconnectAttempts: number;
  reconnectDelay: number;         // ms
  messageTimeout: number;         // ms
}

export interface ClientConnection {
  id: string;
  userId: string;
  tenantId: string;
  sessionId: string;
  documentId?: string;
  status: ConnectionStatus;
  connectedAt: Date;
  lastHeartbeat: Date;
  metadata: Record<string, unknown>;
}

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  senderId: string;
  targetIds?: string[];           // Specific recipients, or broadcast if empty
}

export type MessageType =
  | 'join_session'
  | 'leave_session'
  | 'cursor_update'
  | 'selection_update'
  | 'content_change'
  | 'presence_update'
  | 'heartbeat'
  | 'ack'
  | 'error'
  | 'sync_request'
  | 'sync_response';

export interface JoinSessionPayload {
  sessionId: string;
  documentId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface ContentChangePayload {
  documentId: string;
  componentId?: string;
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  version: number;
}

export interface WebSocketServerStats {
  totalConnections: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  uptime: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Omit<WebSocketConfig, 'tenantId'> = {
  maxConnections: 1000,
  heartbeatInterval: 30000,       // 30 seconds
  reconnectAttempts: 5,
  reconnectDelay: 1000,           // 1 second
  messageTimeout: 5000,           // 5 seconds
};

// -----------------------------------------------------------------------------
// WebSocket Server
// -----------------------------------------------------------------------------

export class WebSocketServer extends EventEmitter {
  private config: WebSocketConfig;
  private connections: Map<string, ClientConnection> = new Map();
  private messageQueue: Map<string, WebSocketMessage[]> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private stats: WebSocketServerStats;
  private startTime: Date;
  private messageCounter = 0;

  constructor(config: Partial<WebSocketConfig> & { tenantId: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      uptime: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(userId: string, sessionId: string, metadata: Record<string, unknown> = {}): Promise<ClientConnection> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connectionId = this.generateConnectionId();
    const now = new Date();

    const connection: ClientConnection = {
      id: connectionId,
      userId,
      tenantId: this.config.tenantId,
      sessionId,
      status: 'connected',
      connectedAt: now,
      lastHeartbeat: now,
      metadata,
    };

    this.connections.set(connectionId, connection);
    this.messageQueue.set(connectionId, []);
    this.startHeartbeat(connectionId);

    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.emit('connection', connection);
    return connection;
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Stop heartbeat
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }

    // Update status
    connection.status = 'disconnected';
    this.connections.delete(connectionId);
    this.messageQueue.delete(connectionId);

    this.stats.activeConnections--;

    this.emit('disconnection', connection);
  }

  getConnection(connectionId: string): ClientConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionsByUser(userId: string): ClientConnection[] {
    return Array.from(this.connections.values())
      .filter(c => c.userId === userId);
  }

  getConnectionsBySession(sessionId: string): ClientConnection[] {
    return Array.from(this.connections.values())
      .filter(c => c.sessionId === sessionId);
  }

  getConnectionsByDocument(documentId: string): ClientConnection[] {
    return Array.from(this.connections.values())
      .filter(c => c.documentId === documentId);
  }

  // ---------------------------------------------------------------------------
  // Message Handling
  // ---------------------------------------------------------------------------

  async send(connectionId: string, message: Omit<WebSocketMessage, 'id' | 'timestamp'>): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Connection not found or not connected: ${connectionId}`);
    }

    const fullMessage: WebSocketMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    // Queue message
    const queue = this.messageQueue.get(connectionId) || [];
    queue.push(fullMessage);
    this.messageQueue.set(connectionId, queue);

    // Update stats
    this.stats.messagesSent++;
    this.stats.bytesSent += JSON.stringify(fullMessage).length;

    this.emit('message_sent', { connectionId, message: fullMessage });
  }

  async broadcast(sessionId: string, message: Omit<WebSocketMessage, 'id' | 'timestamp'>, excludeConnectionId?: string): Promise<void> {
    const connections = this.getConnectionsBySession(sessionId)
      .filter(c => c.id !== excludeConnectionId);

    for (const connection of connections) {
      await this.send(connection.id, message);
    }
  }

  async broadcastToDocument(documentId: string, message: Omit<WebSocketMessage, 'id' | 'timestamp'>, excludeConnectionId?: string): Promise<void> {
    const connections = this.getConnectionsByDocument(documentId)
      .filter(c => c.id !== excludeConnectionId);

    for (const connection of connections) {
      await this.send(connection.id, message);
    }
  }

  receiveMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Update heartbeat
    connection.lastHeartbeat = new Date();

    // Update stats
    this.stats.messagesReceived++;
    this.stats.bytesReceived += JSON.stringify(message).length;

    this.emit('message_received', { connectionId, message });

    // Handle specific message types
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(connectionId);
        break;
      case 'join_session':
        this.handleJoinSession(connectionId, message.payload as JoinSessionPayload);
        break;
      case 'leave_session':
        this.handleLeaveSession(connectionId);
        break;
      default:
        // Emit for external handling
        this.emit(`message:${message.type}`, { connectionId, message });
    }
  }

  getQueuedMessages(connectionId: string): WebSocketMessage[] {
    return this.messageQueue.get(connectionId) || [];
  }

  clearQueue(connectionId: string): void {
    this.messageQueue.set(connectionId, []);
  }

  // ---------------------------------------------------------------------------
  // Heartbeat Management
  // ---------------------------------------------------------------------------

  private startHeartbeat(connectionId: string): void {
    const timer = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        clearInterval(timer);
        return;
      }

      const now = new Date();
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
        // Connection is stale, disconnect
        this.disconnect(connectionId);
      } else {
        // Send heartbeat
        this.send(connectionId, {
          type: 'heartbeat',
          payload: { serverTime: now.toISOString() },
          senderId: 'server',
        }).catch(() => {
          // Ignore send errors for heartbeat
        });
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Session Handlers
  // ---------------------------------------------------------------------------

  private handleJoinSession(connectionId: string, payload: JoinSessionPayload): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.documentId = payload.documentId;
    connection.sessionId = payload.sessionId;
    connection.metadata = {
      ...connection.metadata,
      userName: payload.userName,
      userColor: payload.userColor,
    };

    this.emit('session_joined', { connectionId, payload });
  }

  private handleLeaveSession(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const documentId = connection.documentId;
    connection.documentId = undefined;

    this.emit('session_left', { connectionId, documentId });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private generateConnectionId(): string {
    return `conn-${this.config.tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    this.messageCounter++;
    return `msg-${Date.now()}-${this.messageCounter}`;
  }

  getStats(): WebSocketServerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Omit<WebSocketConfig, 'tenantId'>>): void {
    this.config = { ...this.config, ...updates };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    // Stop all heartbeats
    for (const timer of Array.from(Array.from(this.heartbeatTimers.values()))) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();

    // Disconnect all connections
    for (const connectionId of Array.from(Array.from(this.connections.keys()))) {
      await this.disconnect(connectionId);
    }

    this.emit('shutdown');
  }
}
