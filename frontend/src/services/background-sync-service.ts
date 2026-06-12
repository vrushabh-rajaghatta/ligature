
/**
 * Background Sync Service
 * Queues operations for background sync when online
 * 
 * v0.42.1 - Background Sync
 */

import { getIndexedDB } from './indexeddb-service';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type SyncOperationType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'upload'
  | 'api-call';

export type SyncStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: string;       // e.g., 'document', 'comment', 'operation'
  entityId: string;
  payload: unknown;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  priority: SyncPriority;
  status: SyncStatus;
  createdAt: number;
  updatedAt: number;
  scheduledFor?: number;    // Delayed sync
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastAttempt?: number;
  completedAt?: number;
  result?: unknown;
  tags?: string[];
}

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;         // Base delay in ms
  maxRetryDelay: number;      // Max delay in ms
  batchSize: number;          // Operations per batch
  syncInterval: number;       // Auto-sync interval in ms
  priorityWeights: Record<SyncPriority, number>;
}

export interface SyncResult {
  operationId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

export interface SyncStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  totalOperations: number;
}

export interface SyncEventHandlers {
  onSyncStart?: () => void;
  onSyncComplete?: (results: SyncResult[]) => void;
  onOperationComplete?: (result: SyncResult) => void;
  onOperationFailed?: (operationId: string, error: string) => void;
  onOnline?: () => void;
  onOffline?: () => void;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 5,
  retryDelay: 1000,
  maxRetryDelay: 60000,
  batchSize: 10,
  syncInterval: 30000,
  priorityWeights: {
    critical: 1000,
    high: 100,
    normal: 10,
    low: 1,
  },
};

// =============================================================================
// BACKGROUND SYNC SERVICE
// =============================================================================

export class BackgroundSyncService {
  private config: SyncConfig;
  private handlers: SyncEventHandlers = {};
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private operationIdCounter = 0;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.setupNetworkListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    const db = getIndexedDB();
    await db.init();
    
    // Check for native Background Sync API
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      /* Native sync available */
    }
    
    // Start auto-sync timer
    this.startAutoSync();
    
    // Sync immediately if online
    if (this.isOnline) {
      this.sync();
    }
  }

  destroy(): void {
    this.stopAutoSync();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  // ---------------------------------------------------------------------------
  // Queue Operations
  // ---------------------------------------------------------------------------

  /**
   * Add an operation to the sync queue
   */
  async queue(params: {
    type: SyncOperationType;
    entityType: string;
    entityId: string;
    payload: unknown;
    endpoint?: string;
    method?: SyncOperation['method'];
    headers?: Record<string, string>;
    priority?: SyncPriority;
    scheduledFor?: number;
    maxRetries?: number;
    tags?: string[];
  }): Promise<SyncOperation> {
    const db = getIndexedDB();
    const now = Date.now();

    const operation: SyncOperation = {
      id: this.generateId(),
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
      endpoint: params.endpoint,
      method: params.method || 'POST',
      headers: params.headers,
      priority: params.priority || 'normal',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      scheduledFor: params.scheduledFor,
      retryCount: 0,
      maxRetries: params.maxRetries ?? this.config.maxRetries,
      tags: params.tags,
    };

    await db.put('sync-queue', operation);

    // Try to register for native background sync
    await this.registerBackgroundSync();

    // If online and not scheduled for later, try to sync immediately
    if (this.isOnline && !params.scheduledFor) {
      this.sync();
    }

    return operation;
  }

  /**
   * Queue multiple operations
   */
  async queueMany(operations: Parameters<typeof this.queue>[0][]): Promise<SyncOperation[]> {
    const results: SyncOperation[] = [];
    for (const op of operations) {
      results.push(await this.queue(op));
    }
    return results;
  }

  /**
   * Cancel a pending operation
   */
  async cancel(operationId: string): Promise<boolean> {
    const db = getIndexedDB();
    const operation = await db.get<SyncOperation>('sync-queue', operationId);
    
    if (!operation || operation.status !== 'pending') {
      return false;
    }

    operation.status = 'cancelled';
    operation.updatedAt = Date.now();
    await db.put('sync-queue', operation);
    return true;
  }

  /**
   * Retry a failed operation
   */
  async retry(operationId: string): Promise<boolean> {
    const db = getIndexedDB();
    const operation = await db.get<SyncOperation>('sync-queue', operationId);
    
    if (!operation || operation.status !== 'failed') {
      return false;
    }

    operation.status = 'pending';
    operation.retryCount = 0;
    operation.updatedAt = Date.now();
    operation.lastError = undefined;
    await db.put('sync-queue', operation);
    
    if (this.isOnline) {
      this.sync();
    }
    
    return true;
  }

  // ---------------------------------------------------------------------------
  // Sync Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute sync for pending operations
   */
  async sync(): Promise<SyncResult[]> {
    if (this.isSyncing || !this.isOnline) {
      return [];
    }

    this.isSyncing = true;
    this.handlers.onSyncStart?.();

    const results: SyncResult[] = [];

    try {
      const db = getIndexedDB();
      
      // Get pending operations
      const pending = await this.getPendingOperations();
      
      if (pending.length === 0) {
        return results;
      }

      // Sort by priority and creation time
      pending.sort((a, b) => {
        const priorityDiff = 
          this.config.priorityWeights[b.priority] - 
          this.config.priorityWeights[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt - b.createdAt;
      });

      // Process in batches
      const batch = pending.slice(0, this.config.batchSize);

      for (const operation of batch) {
        const result = await this.executeOperation(operation);
        results.push(result);
        
        if (result.success) {
          this.handlers.onOperationComplete?.(result);
        } else {
          this.handlers.onOperationFailed?.(operation.id, result.error || 'Unknown error');
        }
      }

    } finally {
      this.isSyncing = false;
      this.handlers.onSyncComplete?.(results);
    }

    return results;
  }

  private async executeOperation(operation: SyncOperation): Promise<SyncResult> {
    const db = getIndexedDB();
    const startTime = Date.now();

    // Mark as in-progress
    operation.status = 'in-progress';
    operation.lastAttempt = startTime;
    operation.updatedAt = startTime;
    await db.put('sync-queue', operation);

    try {
      let result: unknown;

      if (operation.endpoint) {
        // HTTP request
        const response = await fetch(operation.endpoint, {
          method: operation.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...operation.headers,
          },
          body: operation.method !== 'GET' ? JSON.stringify(operation.payload) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        result = await response.json().catch(() => ({}));
      } else {
        // Local operation - just mark as complete
        result = operation.payload;
      }

      // Mark as completed
      operation.status = 'completed';
      operation.completedAt = Date.now();
      operation.result = result;
      operation.updatedAt = Date.now();
      await db.put('sync-queue', operation);

      return {
        operationId: operation.id,
        success: true,
        result,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      operation.retryCount++;
      operation.lastError = errorMessage;
      operation.updatedAt = Date.now();

      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
      } else {
        operation.status = 'pending';
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, operation.retryCount),
          this.config.maxRetryDelay
        );
        operation.scheduledFor = Date.now() + delay;
      }

      await db.put('sync-queue', operation);

      return {
        operationId: operation.id,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  private async getPendingOperations(): Promise<SyncOperation[]> {
    const db = getIndexedDB();
    const now = Date.now();
    
    const pending = await db.query<SyncOperation>('sync-queue', 'by-status', 'pending');
    
    // Filter out scheduled operations that aren't due yet
    return pending.filter(op => !op.scheduledFor || op.scheduledFor <= now);
  }

  // ---------------------------------------------------------------------------
  // Auto Sync
  // ---------------------------------------------------------------------------

  private startAutoSync(): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Native Background Sync
  // ---------------------------------------------------------------------------

  private async registerBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-operations');
      }
    } catch (error) {
      /* Sync registration failed */
    }
  }

  // ---------------------------------------------------------------------------
  // Network Handling
  // ---------------------------------------------------------------------------

  private setupNetworkListeners(): void {
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.handlers.onOnline?.();
    this.sync();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.handlers.onOffline?.();
  }

  // ---------------------------------------------------------------------------
  // Query Operations
  // ---------------------------------------------------------------------------

  async getOperation(id: string): Promise<SyncOperation | undefined> {
    const db = getIndexedDB();
    return db.get('sync-queue', id);
  }

  async getOperationsByEntity(entityType: string, entityId: string): Promise<SyncOperation[]> {
    const db = getIndexedDB();
    const all = await db.getAll<SyncOperation>('sync-queue');
    return all.filter(op => op.entityType === entityType && op.entityId === entityId);
  }

  async getOperationsByStatus(status: SyncStatus): Promise<SyncOperation[]> {
    const db = getIndexedDB();
    return db.query('sync-queue', 'by-status', status);
  }

  async getOperationsByTag(tag: string): Promise<SyncOperation[]> {
    const db = getIndexedDB();
    const all = await db.getAll<SyncOperation>('sync-queue');
    return all.filter(op => op.tags?.includes(tag));
  }

  async getStats(): Promise<SyncStats> {
    const db = getIndexedDB();
    const all = await db.getAll<SyncOperation>('sync-queue');
    
    return {
      pending: all.filter(op => op.status === 'pending').length,
      inProgress: all.filter(op => op.status === 'in-progress').length,
      completed: all.filter(op => op.status === 'completed').length,
      failed: all.filter(op => op.status === 'failed').length,
      totalOperations: all.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async clearCompleted(olderThan?: number): Promise<number> {
    const db = getIndexedDB();
    const completed = await db.query<SyncOperation>('sync-queue', 'by-status', 'completed');
    
    const threshold = olderThan || Date.now() - 24 * 60 * 60 * 1000; // 24 hours default
    const toDelete = completed.filter(op => (op.completedAt || 0) < threshold);
    
    if (toDelete.length > 0) {
      await db.deleteMany('sync-queue', toDelete.map(op => op.id));
    }
    
    return toDelete.length;
  }

  async clearFailed(): Promise<number> {
    const db = getIndexedDB();
    const failed = await db.query<SyncOperation>('sync-queue', 'by-status', 'failed');
    
    if (failed.length > 0) {
      await db.deleteMany('sync-queue', failed.map(op => op.id));
    }
    
    return failed.length;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  setHandlers(handlers: SyncEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  private generateId(): string {
    return `sync-${Date.now()}-${++this.operationIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let syncServiceInstance: BackgroundSyncService | null = null;

export function getBackgroundSyncService(config?: Partial<SyncConfig>): BackgroundSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new BackgroundSyncService(config);
  }
  return syncServiceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useBackgroundSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const service = getBackgroundSyncService();
    
    service.setHandlers({
      onSyncStart: () => setIsSyncing(true),
      onSyncComplete: async () => {
        setIsSyncing(false);
        setStats(await service.getStats());
      },
      onOnline: () => setIsOnline(true),
      onOffline: () => setIsOnline(false),
    });

    service.init().then(async () => {
      setIsOnline(service.getIsOnline());
      setStats(await service.getStats());
    }).catch(e => setError(e.message));

    return () => service.destroy();
  }, []);

  const queue = useCallback(async (params: Parameters<BackgroundSyncService['queue']>[0]) => {
    const service = getBackgroundSyncService();
    const op = await service.queue(params);
    setStats(await service.getStats());
    return op;
  }, []);

  const sync = useCallback(async () => {
    const service = getBackgroundSyncService();
    return service.sync();
  }, []);

  const cancel = useCallback(async (id: string) => {
    const service = getBackgroundSyncService();
    const result = await service.cancel(id);
    setStats(await service.getStats());
    return result;
  }, []);

  const retry = useCallback(async (id: string) => {
    const service = getBackgroundSyncService();
    const result = await service.retry(id);
    setStats(await service.getStats());
    return result;
  }, []);

  const refreshStats = useCallback(async () => {
    const service = getBackgroundSyncService();
    const newStats = await service.getStats();
    setStats(newStats);
    return newStats;
  }, []);

  return {
    isOnline,
    isSyncing,
    stats,
    error,
    queue,
    sync,
    cancel,
    retry,
    refreshStats,
    getOperation: (id: string) => getBackgroundSyncService().getOperation(id),
    getOperationsByStatus: (status: SyncStatus) => getBackgroundSyncService().getOperationsByStatus(status),
  };
}

export default BackgroundSyncService;
