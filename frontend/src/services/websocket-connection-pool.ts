
/**
 * WebSocket Connection Pool Service
 * Manages efficient real-time connections with pooling and reconnection
 * 
 * v0.42.0 - WebSocket Connection Pooling
 */

// =============================================================================
// TYPES
// =============================================================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface PooledConnection {
  id: string;
  socket: WebSocket | null;
  state: ConnectionState;
  url: string;
  channels: Set<string>;
  lastActivity: number;
  lastPing: number;
  lastPong: number;
  reconnectAttempts: number;
  messageQueue: QueuedMessage[];
  listeners: Map<string, Set<MessageListener>>;
  metadata: Record<string, unknown>;
}

export interface QueuedMessage {
  id: string;
  channel: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

export interface PoolConfig {
  maxConnections: number;          // Max concurrent connections (default: 5)
  maxChannelsPerConnection: number; // Max channels per socket (default: 50)
  connectionTimeout: number;        // Connection timeout ms (default: 10000)
  pingInterval: number;            // Ping interval ms (default: 30000)
  pongTimeout: number;             // Pong timeout ms (default: 5000)
  reconnectDelay: number;          // Initial reconnect delay ms (default: 1000)
  maxReconnectDelay: number;       // Max reconnect delay ms (default: 30000)
  maxReconnectAttempts: number;    // Max reconnect attempts (default: 10)
  messageQueueSize: number;        // Max queued messages (default: 100)
  idleTimeout: number;             // Close idle connections ms (default: 300000)
}

export type MessageListener = (data: unknown, channel: string, connectionId: string) => void;
export type StateListener = (state: ConnectionState, connectionId: string) => void;

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: PoolConfig = {
  maxConnections: 5,
  maxChannelsPerConnection: 50,
  connectionTimeout: 10000,
  pingInterval: 30000,
  pongTimeout: 5000,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: 10,
  messageQueueSize: 100,
  idleTimeout: 300000,
};

// =============================================================================
// WEBSOCKET CONNECTION POOL
// =============================================================================

export class WebSocketConnectionPool {
  private config: PoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private channelToConnection: Map<string, string> = new Map();
  private stateListeners: Set<StateListener> = new Set();
  private globalListeners: Set<MessageListener> = new Set();
  private pingTimers: Map<string, NodeJS.Timeout> = new Map();
  private pongTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private idleCheckTimer: NodeJS.Timeout | null = null;
  private connectionIdCounter = 0;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startIdleCheck();
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * Get or create a connection for a channel
   */
  async subscribe(channel: string, url: string, listener?: MessageListener): Promise<string> {
    // Check if channel already subscribed
    const existingConnId = this.channelToConnection.get(channel);
    if (existingConnId) {
      const conn = this.connections.get(existingConnId);
      if (conn && listener) {
        if (!conn.listeners.has(channel)) {
          conn.listeners.set(channel, new Set());
        }
        conn.listeners.get(channel)!.add(listener);
      }
      return existingConnId;
    }

    // Find connection with capacity or create new
    let connection = this.findConnectionWithCapacity(url);
    
    if (!connection) {
      if (this.connections.size >= this.config.maxConnections) {
        // Try to consolidate or wait
        connection = this.findLeastUsedConnection(url);
        if (!connection) {
          throw new Error('Connection pool exhausted');
        }
      } else {
        connection = await this.createConnection(url);
      }
    }

    // Add channel to connection
    connection.channels.add(channel);
    this.channelToConnection.set(channel, connection.id);
    
    if (listener) {
      if (!connection.listeners.has(channel)) {
        connection.listeners.set(channel, new Set());
      }
      connection.listeners.get(channel)!.add(listener);
    }

    // Send subscribe message
    this.sendToConnection(connection, {
      type: 'subscribe',
      channel,
    });

    return connection.id;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, listener?: MessageListener): void {
    const connId = this.channelToConnection.get(channel);
    if (!connId) return;

    const conn = this.connections.get(connId);
    if (!conn) return;

    // Remove specific listener or all listeners
    if (listener) {
      conn.listeners.get(channel)?.delete(listener);
    } else {
      conn.listeners.delete(channel);
    }

    // If no listeners left, unsubscribe from channel
    if (!conn.listeners.has(channel) || conn.listeners.get(channel)!.size === 0) {
      conn.channels.delete(channel);
      this.channelToConnection.delete(channel);
      
      this.sendToConnection(conn, {
        type: 'unsubscribe',
        channel,
      });
    }
  }

  /**
   * Send message to a channel
   */
  send(channel: string, data: unknown): boolean {
    const connId = this.channelToConnection.get(channel);
    if (!connId) {
      console.warn(`No connection for channel: ${channel}`);
      return false;
    }

    const conn = this.connections.get(connId);
    if (!conn) return false;

    return this.sendToConnection(conn, {
      type: 'message',
      channel,
      data,
    });
  }

  /**
   * Broadcast to all connections
   */
  broadcast(data: unknown): void {
    for (const conn of Array.from(Array.from(Array.from(Array.from(this.connections.values()))))) {
      this.sendToConnection(conn, {
        type: 'broadcast',
        data,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Connection Lifecycle
  // ---------------------------------------------------------------------------

  private async createConnection(url: string): Promise<PooledConnection> {
    const id = `conn-${++this.connectionIdCounter}-${Date.now()}`;
    
    const connection: PooledConnection = {
      id,
      socket: null,
      state: 'connecting',
      url,
      channels: new Set(),
      lastActivity: Date.now(),
      lastPing: 0,
      lastPong: 0,
      reconnectAttempts: 0,
      messageQueue: [],
      listeners: new Map(),
      metadata: {},
    };

    this.connections.set(id, connection);
    this.notifyStateChange(connection);

    try {
      await this.connectSocket(connection);
      return connection;
    } catch (error) {
      connection.state = 'error';
      this.notifyStateChange(connection);
      throw error;
    }
  }

  private connectSocket(connection: PooledConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      try {
        const socket = new WebSocket(connection.url);

        socket.onopen = () => {
          clearTimeout(timeout);
          connection.socket = socket;
          connection.state = 'connected';
          connection.reconnectAttempts = 0;
          connection.lastActivity = Date.now();
          this.notifyStateChange(connection);
          this.startPing(connection);
          this.flushMessageQueue(connection);
          resolve();
        };

        socket.onmessage = (event) => {
          this.handleMessage(connection, event);
        };

        socket.onclose = (event) => {
          clearTimeout(timeout);
          this.handleClose(connection, event);
        };

        socket.onerror = (event) => {
          clearTimeout(timeout);
          this.handleError(connection, event);
        };

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private handleMessage(connection: PooledConnection, event: MessageEvent): void {
    connection.lastActivity = Date.now();

    try {
      const message = JSON.parse(event.data);

      // Handle pong
      if (message.type === 'pong') {
        connection.lastPong = Date.now();
        this.clearPongTimer(connection.id);
        return;
      }

      // Handle channel message
      if (message.channel) {
        const listeners = connection.listeners.get(message.channel);
        if (listeners) {
          for (const listener of Array.from(listeners)) {
            try {
              listener(message.data, message.channel, connection.id);
            } catch (e) {
              console.error('Message listener error:', e);
            }
          }
        }
      }

      // Notify global listeners
      for (const listener of Array.from(this.globalListeners)) {
        try {
          listener(message.data, message.channel || '', connection.id);
        } catch (e) {
          console.error('Global listener error:', e);
        }
      }

    } catch (e) {
      console.warn('Failed to parse message:', e);
    }
  }

  private handleClose(connection: PooledConnection, event: CloseEvent): void {
    connection.socket = null;
    this.stopPing(connection.id);

    if (event.code === 1000) {
      // Normal close
      connection.state = 'disconnected';
      this.notifyStateChange(connection);
      this.cleanupConnection(connection.id);
    } else {
      // Abnormal close - try to reconnect
      this.scheduleReconnect(connection);
    }
  }

  private handleError(connection: PooledConnection, event: Event): void {
    console.error(`WebSocket error on ${connection.id}:`, event);
    connection.state = 'error';
    this.notifyStateChange(connection);
  }

  // ---------------------------------------------------------------------------
  // Reconnection Logic
  // ---------------------------------------------------------------------------

  private scheduleReconnect(connection: PooledConnection): void {
    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      connection.state = 'error';
      this.notifyStateChange(connection);
      return;
    }

    connection.state = 'reconnecting';
    connection.reconnectAttempts++;
    this.notifyStateChange(connection);

    // Exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(connection.id);
      
      try {
        await this.connectSocket(connection);
        
        // Resubscribe to channels
        for (const channel of Array.from(connection.channels)) {
          this.sendToConnection(connection, {
            type: 'subscribe',
            channel,
          });
        }
      } catch (error) {
        this.scheduleReconnect(connection);
      }
    }, delay);

    this.reconnectTimers.set(connection.id, timer);
  }

  // ---------------------------------------------------------------------------
  // Ping/Pong
  // ---------------------------------------------------------------------------

  private startPing(connection: PooledConnection): void {
    this.stopPing(connection.id);

    const timer = setInterval(() => {
      if (connection.state !== 'connected') return;

      connection.lastPing = Date.now();
      this.sendToConnection(connection, { type: 'ping' });

      // Set pong timeout
      const pongTimer = setTimeout(() => {
        console.warn(`Pong timeout on ${connection.id}`);
        connection.socket?.close();
      }, this.config.pongTimeout);

      this.pongTimers.set(connection.id, pongTimer);
    }, this.config.pingInterval);

    this.pingTimers.set(connection.id, timer);
  }

  private stopPing(connectionId: string): void {
    const timer = this.pingTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.pingTimers.delete(connectionId);
    }
    this.clearPongTimer(connectionId);
  }

  private clearPongTimer(connectionId: string): void {
    const timer = this.pongTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.pongTimers.delete(connectionId);
    }
  }

  // ---------------------------------------------------------------------------
  // Message Queue
  // ---------------------------------------------------------------------------

  private sendToConnection(connection: PooledConnection, message: { type: string; channel?: string; data?: unknown }): boolean {
    if (connection.state === 'connected' && connection.socket?.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
        connection.lastActivity = Date.now();
        return true;
      } catch (e) {
        console.error('Send error:', e);
      }
    }

    // Queue message for later
    if (message.type === 'message' && message.channel && connection.messageQueue.length < this.config.messageQueueSize) {
      connection.messageQueue.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        channel: message.channel,
        data: message.data,
        timestamp: Date.now(),
        retries: 0,
      });
    }

    return false;
  }

  private flushMessageQueue(connection: PooledConnection): void {
    while (connection.messageQueue.length > 0) {
      const msg = connection.messageQueue.shift()!;
      this.sendToConnection(connection, {
        type: 'message',
        channel: msg.channel,
        data: msg.data,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Pool Management
  // ---------------------------------------------------------------------------

  private findConnectionWithCapacity(url: string): PooledConnection | null {
    for (const conn of Array.from(Array.from(Array.from(Array.from(this.connections.values()))))) {
      if (conn.url === url && 
          conn.channels.size < this.config.maxChannelsPerConnection &&
          (conn.state === 'connected' || conn.state === 'connecting')) {
        return conn;
      }
    }
    return null;
  }

  private findLeastUsedConnection(url: string): PooledConnection | null {
    let least: PooledConnection | null = null;
    for (const conn of Array.from(Array.from(Array.from(Array.from(this.connections.values()))))) {
      if (conn.url === url && (!least || conn.channels.size < least.channels.size)) {
        least = conn;
      }
    }
    return least;
  }

  private startIdleCheck(): void {
    this.idleCheckTimer = setInterval(() => {
      const now = Date.now();
      for (const conn of Array.from(Array.from(Array.from(Array.from(this.connections.values()))))) {
        if (conn.channels.size === 0 && now - conn.lastActivity > this.config.idleTimeout) {
          this.closeConnection(conn.id);
        }
      }
    }, 60000);
  }

  private cleanupConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    // Remove channel mappings
    for (const channel of Array.from(conn.channels)) {
      this.channelToConnection.delete(channel);
    }

    // Clear timers
    this.stopPing(connectionId);
    const reconnectTimer = this.reconnectTimers.get(connectionId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(connectionId);
    }

    this.connections.delete(connectionId);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  closeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn?.socket) {
      conn.socket.close(1000, 'Client close');
    }
    this.cleanupConnection(connectionId);
  }

  closeAll(): void {
    for (const connectionId of Array.from(Array.from(Array.from(Array.from(this.connections.keys()))))) {
      this.closeConnection(connectionId);
    }
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
    }
  }

  getConnection(connectionId: string): PooledConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionForChannel(channel: string): PooledConnection | undefined {
    const connId = this.channelToConnection.get(channel);
    return connId ? this.connections.get(connId) : undefined;
  }

  getStats(): {
    totalConnections: number;
    connectedCount: number;
    totalChannels: number;
    queuedMessages: number;
  } {
    let connectedCount = 0;
    let totalChannels = 0;
    let queuedMessages = 0;

    for (const conn of Array.from(Array.from(Array.from(Array.from(this.connections.values()))))) {
      if (conn.state === 'connected') connectedCount++;
      totalChannels += conn.channels.size;
      queuedMessages += conn.messageQueue.length;
    }

    return {
      totalConnections: this.connections.size,
      connectedCount,
      totalChannels,
      queuedMessages,
    };
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onMessage(listener: MessageListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  private notifyStateChange(connection: PooledConnection): void {
    for (const listener of Array.from(this.stateListeners)) {
      try {
        listener(connection.state, connection.id);
      } catch (e) {
        console.error('State listener error:', e);
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let poolInstance: WebSocketConnectionPool | null = null;

export function getWebSocketPool(config?: Partial<PoolConfig>): WebSocketConnectionPool {
  if (!poolInstance) {
    poolInstance = new WebSocketConnectionPool(config);
  }
  return poolInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export function useWebSocketChannel(
  channel: string,
  url: string,
  onMessage?: (data: unknown) => void
) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const pool = getWebSocketPool();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let mounted = true;
    let connId: string | null = null;

    const listener: MessageListener = (data) => {
      if (mounted && onMessageRef.current) {
        onMessageRef.current(data);
      }
    };

    pool.subscribe(channel, url, listener)
      .then(id => {
        if (mounted) {
          connId = id;
          setConnectionId(id);
          const conn = pool.getConnection(id);
          if (conn) setState(conn.state);
        }
      })
      .catch(err => {
        console.error('Subscribe error:', err);
        if (mounted) setState('error');
      });

    const unsubState = pool.onStateChange((newState, id) => {
      if (mounted && id === connId) {
        setState(newState);
      }
    });

    return () => {
      mounted = false;
      unsubState();
      pool.unsubscribe(channel, listener);
    };
  }, [channel, url, pool]);

  const send = useCallback((data: unknown) => {
    return pool.send(channel, data);
  }, [channel, pool]);

  return {
    state,
    connectionId,
    send,
    isConnected: state === 'connected',
  };
}

export default WebSocketConnectionPool;
