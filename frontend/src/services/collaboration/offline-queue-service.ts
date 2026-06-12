
/**
 * Offline Queue Service
 * Queues operations when offline and syncs when reconnected
 * 
 * v0.41.8 - Offline Support
 */

import { Operation } from './operational-transform';

// =============================================================================
// TYPES
// =============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export interface QueuedOperation {
  id: string;
  operation: Operation;
  sessionId: string;
  queuedAt: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ operationId: string; error: string }>;
  serverVersion: number;
}

export interface OfflineQueueConfig {
  maxQueueSize: number;           // Max operations to queue (default: 1000)
  maxRetries: number;             // Max retry attempts per operation (default: 5)
  retryDelay: number;             // Initial retry delay in ms (default: 1000)
  retryBackoffMultiplier: number; // Backoff multiplier (default: 2)
  syncBatchSize: number;          // Operations per sync batch (default: 50)
  persistKey: string;             // localStorage key (default: 'ligature-offline-queue')
}

export interface OfflineQueueCallbacks {
  onStatusChange?: (status: ConnectionStatus) => void;
  onQueueChange?: (queueSize: number) => void;
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
  onOperationQueued?: (operation: QueuedOperation) => void;
  onOperationSynced?: (operationId: string) => void;
  onOperationFailed?: (operationId: string, error: string) => void;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: OfflineQueueConfig = {
  maxQueueSize: 1000,
  maxRetries: 5,
  retryDelay: 1000,
  retryBackoffMultiplier: 2,
  syncBatchSize: 50,
  persistKey: 'ligature-offline-queue',
};

// =============================================================================
// OFFLINE QUEUE SERVICE
// =============================================================================

export class OfflineQueueService {
  private config: OfflineQueueConfig;
  private callbacks: OfflineQueueCallbacks;
  private queue: Map<string, QueuedOperation> = new Map();
  private status: ConnectionStatus = 'online';
  private sessionId: string | null = null;
  private isSyncing: boolean = false;
  private syncPromise: Promise<SyncResult> | null = null;
  
  // Network monitoring
  private networkCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    config: Partial<OfflineQueueConfig> = {},
    callbacks: OfflineQueueCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    
    // Load persisted queue
    this.loadFromStorage();
    
    // Setup network monitoring
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Initial status check
      this.status = navigator.onLine ? 'online' : 'offline';
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
    
    // Persist queue before destroy
    this.saveToStorage();
  }

  // ---------------------------------------------------------------------------
  // Network Event Handlers
  // ---------------------------------------------------------------------------

  private handleOnline(): void {
    if (this.status !== 'online') {
      this.setStatus('reconnecting');
      this.syncQueue().then(() => {
        this.setStatus('online');
      }).catch(() => {
        // Will retry automatically
      });
    }
  }

  private handleOffline(): void {
    this.setStatus('offline');
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  // ---------------------------------------------------------------------------
  // Queue Management
  // ---------------------------------------------------------------------------

  /**
   * Add operation to queue (when offline or for reliable delivery)
   */
  enqueue(operation: Operation): QueuedOperation | null {
    if (!this.sessionId) {
      console.warn('Cannot enqueue: no session set');
      return null;
    }
    
    // Check queue size limit
    if (this.queue.size >= this.config.maxQueueSize) {
      console.warn('Queue full, dropping oldest operation');
      const oldest = this.getOldestOperation();
      if (oldest) {
        this.queue.delete(oldest.id);
      }
    }
    
    const queuedOp: QueuedOperation = {
      id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      sessionId: this.sessionId,
      queuedAt: Date.now(),
      retryCount: 0,
    };
    
    this.queue.set(queuedOp.id, queuedOp);
    this.saveToStorage();
    
    this.callbacks.onQueueChange?.(this.queue.size);
    this.callbacks.onOperationQueued?.(queuedOp);
    
    // If online, try to sync immediately
    if (this.status === 'online' && !this.isSyncing) {
      this.syncQueue();
    }
    
    return queuedOp;
  }

  /**
   * Remove operation from queue
   */
  dequeue(operationId: string): boolean {
    const existed = this.queue.delete(operationId);
    if (existed) {
      this.saveToStorage();
      this.callbacks.onQueueChange?.(this.queue.size);
    }
    return existed;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return Array.from(this.queue.values())
      .sort((a, b) => a.queuedAt - b.queuedAt);
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue.clear();
    this.saveToStorage();
    this.callbacks.onQueueChange?.(0);
  }

  /**
   * Check if queue has pending operations
   */
  hasPendingOperations(): boolean {
    return this.queue.size > 0;
  }

  private getOldestOperation(): QueuedOperation | null {
    let oldest: QueuedOperation | null = null;
    for (const op of Array.from(Array.from(this.queue.values()))) {
      if (!oldest || op.queuedAt < oldest.queuedAt) {
        oldest = op;
      }
    }
    return oldest;
  }

  // ---------------------------------------------------------------------------
  // Sync Logic
  // ---------------------------------------------------------------------------

  /**
   * Sync queued operations to server
   */
  async syncQueue(): Promise<SyncResult> {
    // Return existing sync promise if already syncing
    if (this.syncPromise) {
      return this.syncPromise;
    }
    
    if (this.queue.size === 0) {
      return { success: true, synced: 0, failed: 0, errors: [], serverVersion: 0 };
    }
    
    this.isSyncing = true;
    this.callbacks.onSyncStart?.();
    
    this.syncPromise = this.performSync();
    
    try {
      const result = await this.syncPromise;
      this.callbacks.onSyncComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onSyncError?.(err);
      throw err;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  private async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      serverVersion: 0,
    };
    
    // Get operations in order
    const operations = this.getQueue();
    
    // Process in batches
    for (let i = 0; i < operations.length; i += this.config.syncBatchSize) {
      const batch = operations.slice(i, i + this.config.syncBatchSize);
      
      for (const queuedOp of batch) {
        try {
          const response = await this.sendOperation(queuedOp);
          
          if (response.success) {
            this.dequeue(queuedOp.id);
            this.callbacks.onOperationSynced?.(queuedOp.id);
            result.synced++;
            result.serverVersion = response.serverVersion || result.serverVersion;
          } else {
            throw new Error(response.error || 'Sync failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Update retry count
          queuedOp.retryCount++;
          queuedOp.lastError = errorMessage;
          
          if (queuedOp.retryCount >= this.config.maxRetries) {
            // Max retries exceeded, mark as failed
            this.callbacks.onOperationFailed?.(queuedOp.id, errorMessage);
            this.dequeue(queuedOp.id);
            result.failed++;
            result.errors.push({ operationId: queuedOp.id, error: errorMessage });
            result.success = false;
          } else {
            // Will retry later
            this.queue.set(queuedOp.id, queuedOp);
          }
        }
      }
      
      // Save progress
      this.saveToStorage();
    }
    
    return result;
  }

  private async sendOperation(queuedOp: QueuedOperation): Promise<{
    success: boolean;
    serverVersion?: number;
    error?: string;
  }> {
    const response = await fetch('/api/collaboration/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: queuedOp.sessionId,
        operation: queuedOp.operation,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Request failed' };
    }
    
    return {
      success: true,
      serverVersion: data.data?.version,
    };
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        queue: Array.from(this.queue.entries()),
        savedAt: Date.now(),
      };
      localStorage.setItem(this.config.persistKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.config.persistKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Only load if not too old (24 hours)
        if (Date.now() - data.savedAt < 24 * 60 * 60 * 1000) {
          this.queue = new Map(data.queue);
          this.callbacks.onQueueChange?.(this.queue.size);
        } else {
          localStorage.removeItem(this.config.persistKey);
        }
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  isOffline(): boolean {
    return this.status === 'offline';
  }

  isSyncingNow(): boolean {
    return this.isSyncing;
  }

  /**
   * Force connection check
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { method: 'HEAD' });
      const isOnline = response.ok;
      
      if (isOnline && this.status === 'offline') {
        this.handleOnline();
      } else if (!isOnline && this.status === 'online') {
        this.handleOffline();
      }
      
      return isOnline;
    } catch {
      if (this.status === 'online') {
        this.handleOffline();
      }
      return false;
    }
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export function useOfflineQueue(
  sessionId: string | null,
  config?: Partial<OfflineQueueConfig>
) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const serviceRef = useRef<OfflineQueueService | null>(null);

  useEffect(() => {
    const service = new OfflineQueueService(config, {
      onStatusChange: setStatus,
      onQueueChange: setQueueSize,
      onSyncStart: () => setIsSyncing(true),
      onSyncComplete: () => setIsSyncing(false),
      onSyncError: () => setIsSyncing(false),
    });
    
    serviceRef.current = service;
    
    return () => {
      service.destroy();
      serviceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sessionId) {
      serviceRef.current?.setSession(sessionId);
    }
  }, [sessionId]);

  const enqueue = useCallback((operation: Operation) => {
    return serviceRef.current?.enqueue(operation) || null;
  }, []);

  const syncQueue = useCallback(async () => {
    return serviceRef.current?.syncQueue();
  }, []);

  const clearQueue = useCallback(() => {
    serviceRef.current?.clearQueue();
  }, []);

  const checkConnection = useCallback(async () => {
    return serviceRef.current?.checkConnection() || false;
  }, []);

  return {
    status,
    queueSize,
    isSyncing,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    hasPendingOperations: queueSize > 0,
    enqueue,
    syncQueue,
    clearQueue,
    checkConnection,
    getQueue: () => serviceRef.current?.getQueue() || [],
  };
}

export default OfflineQueueService;
