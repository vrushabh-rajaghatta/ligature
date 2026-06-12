
/**
 * Bulkhead Service
 * Isolate resources to prevent cascading failures
 * 
 * v0.42.4 - Bulkhead Pattern
 * 
 * The bulkhead pattern partitions resources into isolated compartments,
 * preventing a failure in one from affecting others - like watertight
 * compartments in a ship's hull.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface BulkheadConfig {
  maxConcurrent: number;       // Max concurrent executions (default: 10)
  maxQueued: number;           // Max queued requests (default: 100)
  timeout: number;             // Execution timeout in ms (default: 30000)
  fairQueue: boolean;          // Use FIFO queue (default: true)
  priorityLevels: number;      // Number of priority levels (default: 3)
}

export type BulkheadState = 'healthy' | 'saturated' | 'overloaded';

export interface BulkheadStats {
  name: string;
  state: BulkheadState;
  activeCount: number;
  queuedCount: number;
  maxConcurrent: number;
  maxQueued: number;
  totalExecuted: number;
  totalRejected: number;
  totalTimedOut: number;
  avgExecutionTime: number;
  utilizationPercent: number;
  queueUtilizationPercent: number;
}

export interface QueuedRequest<T> {
  id: string;
  priority: number;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  enqueueTime: number;
  timeout: NodeJS.Timeout;
}

export interface BulkheadEvent {
  timestamp: number;
  bulkhead: string;
  event: 'execute' | 'complete' | 'queue' | 'dequeue' | 'reject' | 'timeout' | 'state-change';
  duration?: number;
  error?: string;
  previousState?: BulkheadState;
  newState?: BulkheadState;
  queuePosition?: number;
}

export interface BulkheadOptions {
  name: string;
  config?: Partial<BulkheadConfig>;
  onStateChange?: (state: BulkheadState, previousState: BulkheadState) => void;
  onReject?: (reason: 'full' | 'timeout') => void;
  onExecute?: (duration: number) => void;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: BulkheadConfig = {
  maxConcurrent: 10,
  maxQueued: 100,
  timeout: 30000,
  fairQueue: true,
  priorityLevels: 3, // 0 = highest, 2 = lowest
};

// =============================================================================
// ERRORS
// =============================================================================

export class BulkheadFullError extends Error {
  constructor(
    public bulkheadName: string,
    public queuedCount: number,
    public maxQueued: number
  ) {
    super(`Bulkhead ${bulkheadName} is full (${queuedCount}/${maxQueued} queued)`);
    this.name = 'BulkheadFullError';
  }
}

export class BulkheadTimeoutError extends Error {
  constructor(
    public bulkheadName: string,
    public timeout: number,
    public wasQueued: boolean
  ) {
    super(`Bulkhead ${bulkheadName} timeout after ${timeout}ms (${wasQueued ? 'while queued' : 'during execution'})`);
    this.name = 'BulkheadTimeoutError';
  }
}

// =============================================================================
// BULKHEAD
// =============================================================================

export class Bulkhead {
  private name: string;
  private config: BulkheadConfig;
  private activeCount = 0;
  private queues: Map<number, QueuedRequest<any>[]> = new Map();
  private totalExecuted = 0;
  private totalRejected = 0;
  private totalTimedOut = 0;
  private executionTimes: number[] = [];
  private maxExecutionHistory = 100;
  private state: BulkheadState = 'healthy';
  private eventHistory: BulkheadEvent[] = [];
  private maxEventHistory = 100;
  private requestIdCounter = 0;
  
  private onStateChange?: (state: BulkheadState, previousState: BulkheadState) => void;
  private onReject?: (reason: 'full' | 'timeout') => void;
  private onExecute?: (duration: number) => void;

  constructor(options: BulkheadOptions) {
    this.name = options.name;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.onStateChange = options.onStateChange;
    this.onReject = options.onReject;
    this.onExecute = options.onExecute;

    // Initialize priority queues
    for (let i = 0; i < this.config.priorityLevels; i++) {
      this.queues.set(i, []);
    }
  }

  // ---------------------------------------------------------------------------
  // Core Methods
  // ---------------------------------------------------------------------------

  async execute<T>(operation: () => Promise<T>, priority: number = 1): Promise<T> {
    // Normalize priority
    priority = Math.max(0, Math.min(priority, this.config.priorityLevels - 1));

    // Check if we can execute immediately
    if (this.activeCount < this.config.maxConcurrent) {
      return this.runOperation(operation);
    }

    // Check if queue has space
    const totalQueued = this.getTotalQueued();
    if (totalQueued >= this.config.maxQueued) {
      this.totalRejected++;
      this.recordEvent('reject');
      this.onReject?.('full');
      throw new BulkheadFullError(this.name, totalQueued, this.config.maxQueued);
    }

    // Queue the request
    return this.queueOperation(operation, priority);
  }

  executeSync<T>(operation: () => T): T {
    // Sync execution - can't truly queue, so just limit concurrency
    if (this.activeCount >= this.config.maxConcurrent) {
      this.totalRejected++;
      this.recordEvent('reject');
      this.onReject?.('full');
      throw new BulkheadFullError(this.name, this.getTotalQueued(), this.config.maxQueued);
    }

    const startTime = Date.now();
    this.activeCount++;
    this.updateState();
    this.recordEvent('execute');

    try {
      const result = operation();
      this.recordExecution(Date.now() - startTime);
      return result;
    } finally {
      this.activeCount--;
      this.updateState();
      this.recordEvent('complete', Date.now() - startTime);
    }
  }

  private async runOperation<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.activeCount++;
    this.updateState();
    this.recordEvent('execute');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        this.totalTimedOut++;
        this.onReject?.('timeout');
        reject(new BulkheadTimeoutError(this.name, this.config.timeout, false));
      }, this.config.timeout);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      this.recordExecution(Date.now() - startTime);
      this.recordEvent('complete', Date.now() - startTime);
      return result;
    } catch (error) {
      if (error instanceof BulkheadTimeoutError) {
        this.recordEvent('timeout');
      }
      throw error;
    } finally {
      this.activeCount--;
      this.updateState();
      this.processQueue();
    }
  }

  private queueOperation<T>(operation: () => Promise<T>, priority: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const requestId = `req-${++this.requestIdCounter}`;
      
      const timeout = setTimeout(() => {
        this.removeFromQueue(requestId);
        this.totalTimedOut++;
        this.recordEvent('timeout');
        this.onReject?.('timeout');
        reject(new BulkheadTimeoutError(this.name, this.config.timeout, true));
      }, this.config.timeout);

      const request: QueuedRequest<T> = {
        id: requestId,
        priority,
        operation,
        resolve,
        reject,
        enqueueTime: Date.now(),
        timeout,
      };

      const queue = this.queues.get(priority) || [];
      queue.push(request);
      this.queues.set(priority, queue);
      
      this.recordEvent('queue', undefined, undefined, undefined, undefined, queue.length);
      this.updateState();
    });
  }

  private processQueue(): void {
    if (this.activeCount >= this.config.maxConcurrent) return;

    // Get next request from highest priority non-empty queue
    for (let priority = 0; priority < this.config.priorityLevels; priority++) {
      const queue = this.queues.get(priority) || [];
      if (queue.length > 0) {
        const request = this.config.fairQueue ? queue.shift()! : queue.pop()!;
        this.queues.set(priority, queue);
        
        clearTimeout(request.timeout);
        this.recordEvent('dequeue');

        this.runOperation(request.operation)
          .then(request.resolve)
          .catch(request.reject);
        
        return;
      }
    }
  }

  private removeFromQueue(requestId: string): void {
    for (const [priority, queue] of Array.from(Array.from(Array.from(Array.from(Array.from(this.queues.entries())))))) {
      const index = queue.findIndex(r => r.id === requestId);
      if (index !== -1) {
        clearTimeout(queue[index].timeout);
        queue.splice(index, 1);
        this.queues.set(priority, queue);
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  private updateState(): void {
    const previousState = this.state;
    const utilizationPercent = (this.activeCount / this.config.maxConcurrent) * 100;
    const queuePercent = (this.getTotalQueued() / this.config.maxQueued) * 100;

    if (utilizationPercent >= 100 && queuePercent >= 80) {
      this.state = 'overloaded';
    } else if (utilizationPercent >= 80 || queuePercent >= 50) {
      this.state = 'saturated';
    } else {
      this.state = 'healthy';
    }

    if (this.state !== previousState) {
      this.recordEvent('state-change', undefined, undefined, previousState, this.state);
      this.onStateChange?.(this.state, previousState);
    }
  }

  private recordExecution(duration: number): void {
    this.totalExecuted++;
    this.executionTimes.push(duration);
    
    if (this.executionTimes.length > this.maxExecutionHistory) {
      this.executionTimes = this.executionTimes.slice(-this.maxExecutionHistory);
    }
    
    this.onExecute?.(duration);
  }

  private recordEvent(
    event: BulkheadEvent['event'],
    duration?: number,
    error?: string,
    previousState?: BulkheadState,
    newState?: BulkheadState,
    queuePosition?: number
  ): void {
    this.eventHistory.push({
      timestamp: Date.now(),
      bulkhead: this.name,
      event,
      duration,
      error,
      previousState,
      newState,
      queuePosition,
    });

    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats & Introspection
  // ---------------------------------------------------------------------------

  private getTotalQueued(): number {
    let total = 0;
    for (const queue of Array.from(Array.from(Array.from(Array.from(Array.from(this.queues.values())))))) {
      total += queue.length;
    }
    return total;
  }

  getStats(): BulkheadStats {
    const avgExecutionTime = this.executionTimes.length > 0
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      : 0;

    return {
      name: this.name,
      state: this.state,
      activeCount: this.activeCount,
      queuedCount: this.getTotalQueued(),
      maxConcurrent: this.config.maxConcurrent,
      maxQueued: this.config.maxQueued,
      totalExecuted: this.totalExecuted,
      totalRejected: this.totalRejected,
      totalTimedOut: this.totalTimedOut,
      avgExecutionTime,
      utilizationPercent: (this.activeCount / this.config.maxConcurrent) * 100,
      queueUtilizationPercent: (this.getTotalQueued() / this.config.maxQueued) * 100,
    };
  }

  getEventHistory(): BulkheadEvent[] {
    return [...this.eventHistory];
  }

  getQueueDepth(priority?: number): number {
    if (priority !== undefined) {
      return this.queues.get(priority)?.length || 0;
    }
    return this.getTotalQueued();
  }

  isHealthy(): boolean {
    return this.state === 'healthy';
  }

  isSaturated(): boolean {
    return this.state === 'saturated';
  }

  isOverloaded(): boolean {
    return this.state === 'overloaded';
  }

  // ---------------------------------------------------------------------------
  // Control Methods
  // ---------------------------------------------------------------------------

  drain(): Promise<void> {
    // Wait for all active operations to complete and clear queues
    return new Promise((resolve) => {
      // Clear all queued requests
      for (const [priority, queue] of Array.from(Array.from(Array.from(Array.from(Array.from(this.queues.entries())))))) {
        for (const request of queue) {
          clearTimeout(request.timeout);
          request.reject(new Error('Bulkhead drained'));
        }
        this.queues.set(priority, []);
      }

      // Wait for active to complete
      const checkComplete = () => {
        if (this.activeCount === 0) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }

  resize(maxConcurrent: number, maxQueued?: number): void {
    this.config.maxConcurrent = maxConcurrent;
    if (maxQueued !== undefined) {
      this.config.maxQueued = maxQueued;
    }
    this.updateState();
    // Process any newly available slots
    this.processQueue();
  }
}

// =============================================================================
// BULKHEAD REGISTRY
// =============================================================================

export class BulkheadRegistry {
  private bulkheads: Map<string, Bulkhead> = new Map();
  private listeners: Set<(event: BulkheadEvent) => void> = new Set();

  create(options: BulkheadOptions): Bulkhead {
    const bulkhead = new Bulkhead({
      ...options,
      onStateChange: (state, previousState) => {
        options.onStateChange?.(state, previousState);
        this.notifyListeners({
          timestamp: Date.now(),
          bulkhead: options.name,
          event: 'state-change',
          previousState,
          newState: state,
        });
      },
    });
    
    this.bulkheads.set(options.name, bulkhead);
    return bulkhead;
  }

  get(name: string): Bulkhead | undefined {
    return this.bulkheads.get(name);
  }

  getOrCreate(options: BulkheadOptions): Bulkhead {
    return this.bulkheads.get(options.name) || this.create(options);
  }

  remove(name: string): boolean {
    const bulkhead = this.bulkheads.get(name);
    if (bulkhead) {
      bulkhead.drain();
      return this.bulkheads.delete(name);
    }
    return false;
  }

  getAll(): Map<string, Bulkhead> {
    return new Map(this.bulkheads);
  }

  getAllStats(): Map<string, BulkheadStats> {
    const stats = new Map<string, BulkheadStats>();
    for (const [name, bulkhead] of Array.from(Array.from(Array.from(Array.from(Array.from(this.bulkheads.entries())))))) {
      stats.set(name, bulkhead.getStats());
    }
    return stats;
  }

  async drainAll(): Promise<void> {
    const drainPromises = Array.from(this.bulkheads.values()).map(b => b.drain());
    await Promise.all(drainPromises);
  }

  onEvent(listener: (event: BulkheadEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: BulkheadEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (e) {
        console.error('Bulkhead event listener error:', e);
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let registryInstance: BulkheadRegistry | null = null;

export function getBulkheadRegistry(): BulkheadRegistry {
  if (!registryInstance) {
    registryInstance = new BulkheadRegistry();
  }
  return registryInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createBulkhead(options: BulkheadOptions): Bulkhead {
  return getBulkheadRegistry().create(options);
}

export function getBulkhead(name: string): Bulkhead | undefined {
  return getBulkheadRegistry().get(name);
}

export async function withBulkhead<T>(
  name: string,
  operation: () => Promise<T>,
  options?: Partial<BulkheadConfig> & { priority?: number }
): Promise<T> {
  const bulkhead = getBulkheadRegistry().getOrCreate({ name, config: options });
  return bulkhead.execute(operation, options?.priority);
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useBulkhead(name: string, config?: Partial<BulkheadConfig>) {
  const [stats, setStats] = useState<BulkheadStats | null>(null);
  const registry = getBulkheadRegistry();

  const bulkhead = useMemo(() => {
    return registry.getOrCreate({ name, config });
  }, [name, config, registry]);

  useEffect(() => {
    const updateStats = () => setStats(bulkhead.getStats());
    updateStats();
    
    const interval = setInterval(updateStats, 1000);
    
    const unsubscribe = registry.onEvent((event) => {
      if (event.bulkhead === name) {
        updateStats();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [bulkhead, name, registry]);

  const execute = useCallback(async <T>(operation: () => Promise<T>, priority?: number): Promise<T> => {
    return bulkhead.execute(operation, priority);
  }, [bulkhead]);

  const drain = useCallback(async () => {
    await bulkhead.drain();
    setStats(bulkhead.getStats());
  }, [bulkhead]);

  const resize = useCallback((maxConcurrent: number, maxQueued?: number) => {
    bulkhead.resize(maxConcurrent, maxQueued);
    setStats(bulkhead.getStats());
  }, [bulkhead]);

  return {
    stats,
    state: stats?.state || 'healthy',
    isHealthy: stats?.state === 'healthy',
    isSaturated: stats?.state === 'saturated',
    isOverloaded: stats?.state === 'overloaded',
    activeCount: stats?.activeCount || 0,
    queuedCount: stats?.queuedCount || 0,
    execute,
    drain,
    resize,
    getEventHistory: () => bulkhead.getEventHistory(),
  };
}

export function useAllBulkheads() {
  const [allStats, setAllStats] = useState<Map<string, BulkheadStats>>(new Map());
  const registry = getBulkheadRegistry();

  useEffect(() => {
    const updateStats = () => setAllStats(registry.getAllStats());
    updateStats();
    
    const interval = setInterval(updateStats, 1000);
    const unsubscribe = registry.onEvent(updateStats);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [registry]);

  return {
    bulkheads: allStats,
    drainAll: async () => {
      await registry.drainAll();
      setAllStats(registry.getAllStats());
    },
  };
}

export default Bulkhead;
