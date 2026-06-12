
/**
 * Rate Limiter Service
 * Request rate control per endpoint
 * 
 * v0.42.4 - Rate Limiting
 * 
 * Implements multiple rate limiting strategies:
 * - Token bucket (smooths bursts)
 * - Sliding window (precise rate control)
 * - Fixed window (simple and efficient)
 * - Leaky bucket (constant outflow)
 */

// =============================================================================
// TYPES
// =============================================================================

export type RateLimitStrategy = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;         // Max requests in window
  windowMs: number;            // Window size in ms
  burstLimit?: number;         // For token bucket: max burst (default: maxRequests)
  refillRate?: number;         // For token bucket: tokens per second
  queueExcess?: boolean;       // Queue requests over limit (default: false)
  maxQueueSize?: number;       // Max queue size if queueExcess is true
  maxQueueWait?: number;       // Max wait time in queue (ms)
  keyGenerator?: (request: RateLimitRequest) => string; // Custom key generation
}

export interface RateLimitRequest {
  endpoint?: string;
  userId?: string;
  ip?: string;
  method?: string;
  headers?: Record<string, string>;
  cost?: number;               // Request cost (default: 1)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;         // Milliseconds until retry
  queuePosition?: number;      // Position in queue if queued
}

export interface RateLimitStats {
  key: string;
  strategy: RateLimitStrategy;
  currentTokens?: number;      // Token bucket
  requestCount: number;        // Requests in current window
  windowStart: number;
  windowEnd: number;
  totalAllowed: number;
  totalRejected: number;
  totalQueued: number;
  avgWaitTime: number;
}

export interface RateLimitEvent {
  timestamp: number;
  key: string;
  event: 'allowed' | 'rejected' | 'queued' | 'dequeued' | 'expired';
  remaining: number;
  cost: number;
  queuePosition?: number;
  waitTime?: number;
}

export interface RateLimiterOptions {
  name: string;
  config: RateLimitConfig;
  onAllow?: (key: string, remaining: number) => void;
  onReject?: (key: string, retryAfter: number) => void;
  onQueue?: (key: string, position: number) => void;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: Partial<RateLimitConfig> = {
  strategy: 'sliding-window',
  queueExcess: false,
  maxQueueSize: 100,
  maxQueueWait: 30000,
};

// =============================================================================
// ERRORS
// =============================================================================

export class RateLimitExceededError extends Error {
  constructor(
    public key: string,
    public retryAfter: number,
    public limit: number
  ) {
    super(`Rate limit exceeded for ${key}. Retry after ${retryAfter}ms.`);
    this.name = 'RateLimitExceededError';
  }
}

export class RateLimitQueueFullError extends Error {
  constructor(
    public key: string,
    public queueSize: number
  ) {
    super(`Rate limit queue full for ${key} (${queueSize} waiting)`);
    this.name = 'RateLimitQueueFullError';
  }
}

// =============================================================================
// BUCKET STATE
// =============================================================================

interface BucketState {
  // Token bucket
  tokens: number;
  lastRefill: number;
  
  // Sliding/fixed window
  requests: number[];
  windowStart: number;
  
  // Stats
  totalAllowed: number;
  totalRejected: number;
  totalQueued: number;
  waitTimes: number[];
}

interface QueuedItem {
  resolve: (result: RateLimitResult) => void;
  reject: (error: Error) => void;
  cost: number;
  enqueueTime: number;
  timeout: NodeJS.Timeout;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export class RateLimiter {
  private name: string;
  private config: RateLimitConfig;
  private buckets: Map<string, BucketState> = new Map();
  private queues: Map<string, QueuedItem[]> = new Map();
  private eventHistory: RateLimitEvent[] = [];
  private maxEventHistory = 100;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private onAllow?: (key: string, remaining: number) => void;
  private onReject?: (key: string, retryAfter: number) => void;
  private onQueue?: (key: string, position: number) => void;

  constructor(options: RateLimiterOptions) {
    this.name = options.name;
    this.config = { ...DEFAULT_CONFIG, ...options.config } as RateLimitConfig;
    this.onAllow = options.onAllow;
    this.onReject = options.onReject;
    this.onQueue = options.onQueue;

    // Set defaults based on strategy
    if (this.config.strategy === 'token-bucket') {
      this.config.burstLimit = this.config.burstLimit ?? this.config.maxRequests;
      this.config.refillRate = this.config.refillRate ?? (this.config.maxRequests / (this.config.windowMs / 1000));
    }

    // Start cleanup timer
    this.startCleanup();
  }

  // ---------------------------------------------------------------------------
  // Core Methods
  // ---------------------------------------------------------------------------

  async check(request: RateLimitRequest = {}): Promise<RateLimitResult> {
    const key = this.getKey(request);
    const cost = request.cost ?? 1;
    
    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = this.createBucket();
      this.buckets.set(key, bucket);
    }

    // Apply strategy
    const result = this.applyStrategy(key, bucket, cost);

    if (result.allowed) {
      bucket.totalAllowed++;
      this.recordEvent('allowed', key, result.remaining, cost);
      this.onAllow?.(key, result.remaining);
    } else if (this.config.queueExcess) {
      // Try to queue
      return this.queueRequest(key, cost);
    } else {
      bucket.totalRejected++;
      this.recordEvent('rejected', key, result.remaining, cost);
      this.onReject?.(key, result.retryAfter || 0);
    }

    return result;
  }

  async acquire(request: RateLimitRequest = {}): Promise<RateLimitResult> {
    const result = await this.check(request);
    
    if (!result.allowed && !result.queuePosition) {
      throw new RateLimitExceededError(
        this.getKey(request),
        result.retryAfter || 0,
        this.config.maxRequests
      );
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Strategy Implementations
  // ---------------------------------------------------------------------------

  private applyStrategy(key: string, bucket: BucketState, cost: number): RateLimitResult {
    switch (this.config.strategy) {
      case 'token-bucket':
        return this.applyTokenBucket(bucket, cost);
      case 'sliding-window':
        return this.applySlidingWindow(bucket, cost);
      case 'fixed-window':
        return this.applyFixedWindow(bucket, cost);
      case 'leaky-bucket':
        return this.applyLeakyBucket(bucket, cost);
      default:
        return this.applySlidingWindow(bucket, cost);
    }
  }

  private applyTokenBucket(bucket: BucketState, cost: number): RateLimitResult {
    const now = Date.now();
    const { burstLimit = this.config.maxRequests, refillRate = 1 } = this.config;

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    const newTokens = elapsed * refillRate;
    bucket.tokens = Math.min(burstLimit, bucket.tokens + newTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + ((burstLimit - bucket.tokens) / refillRate) * 1000,
      };
    }

    const tokensNeeded = cost - bucket.tokens;
    const retryAfter = Math.ceil((tokensNeeded / refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
    };
  }

  private applySlidingWindow(bucket: BucketState, cost: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests
    bucket.requests = bucket.requests.filter(t => t > windowStart);

    // Check if under limit
    if (bucket.requests.length + cost <= this.config.maxRequests) {
      // Add request timestamps
      for (let i = 0; i < cost; i++) {
        bucket.requests.push(now);
      }
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - bucket.requests.length,
        resetAt: bucket.requests.length > 0 ? bucket.requests[0] + this.config.windowMs : now + this.config.windowMs,
      };
    }

    // Calculate retry after (when oldest request expires)
    const oldestRequest = bucket.requests[0];
    const retryAfter = oldestRequest ? oldestRequest + this.config.windowMs - now : 0;

    return {
      allowed: false,
      remaining: Math.max(0, this.config.maxRequests - bucket.requests.length),
      resetAt: oldestRequest + this.config.windowMs,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  private applyFixedWindow(bucket: BucketState, cost: number): RateLimitResult {
    const now = Date.now();
    const windowEnd = bucket.windowStart + this.config.windowMs;

    // Reset window if expired
    if (now >= windowEnd) {
      bucket.windowStart = now;
      bucket.requests = [];
    }

    // Check if under limit
    if (bucket.requests.length + cost <= this.config.maxRequests) {
      for (let i = 0; i < cost; i++) {
        bucket.requests.push(now);
      }
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - bucket.requests.length,
        resetAt: bucket.windowStart + this.config.windowMs,
      };
    }

    const retryAfter = bucket.windowStart + this.config.windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.windowStart + this.config.windowMs,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  private applyLeakyBucket(bucket: BucketState, cost: number): RateLimitResult {
    const now = Date.now();
    const { refillRate = this.config.maxRequests / (this.config.windowMs / 1000) } = this.config;

    // Leak tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    const leaked = elapsed * refillRate;
    bucket.tokens = Math.max(0, bucket.tokens - leaked);
    bucket.lastRefill = now;

    // Check if bucket has room
    if (bucket.tokens + cost <= this.config.maxRequests) {
      bucket.tokens += cost;
      
      return {
        allowed: true,
        remaining: Math.floor(this.config.maxRequests - bucket.tokens),
        resetAt: now + (bucket.tokens / refillRate) * 1000,
      };
    }

    const overflow = bucket.tokens + cost - this.config.maxRequests;
    const retryAfter = Math.ceil((overflow / refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
    };
  }

  // ---------------------------------------------------------------------------
  // Queue Management
  // ---------------------------------------------------------------------------

  private async queueRequest(key: string, cost: number): Promise<RateLimitResult> {
    const queue = this.queues.get(key) || [];
    
    if (queue.length >= (this.config.maxQueueSize || 100)) {
      const bucket = this.buckets.get(key);
      if (bucket) bucket.totalRejected++;
      this.recordEvent('rejected', key, 0, cost);
      throw new RateLimitQueueFullError(key, queue.length);
    }

    return new Promise((resolve, reject) => {
      const enqueueTime = Date.now();
      const maxWait = this.config.maxQueueWait || 30000;

      const timeout = setTimeout(() => {
        this.removeFromQueue(key, item);
        reject(new RateLimitExceededError(key, 0, this.config.maxRequests));
      }, maxWait);

      const item: QueuedItem = {
        resolve,
        reject,
        cost,
        enqueueTime,
        timeout,
      };

      queue.push(item);
      this.queues.set(key, queue);

      const bucket = this.buckets.get(key);
      if (bucket) bucket.totalQueued++;
      
      const position = queue.length;
      this.recordEvent('queued', key, 0, cost, position);
      this.onQueue?.(key, position);

      // Try to process immediately
      this.processQueue(key);
    });
  }

  private processQueue(key: string): void {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    const bucket = this.buckets.get(key);
    if (!bucket) return;

    // Try to process first item
    const item = queue[0];
    const result = this.applyStrategy(key, bucket, item.cost);

    if (result.allowed) {
      queue.shift();
      this.queues.set(key, queue);
      clearTimeout(item.timeout);

      const waitTime = Date.now() - item.enqueueTime;
      bucket.waitTimes.push(waitTime);
      if (bucket.waitTimes.length > 100) {
        bucket.waitTimes = bucket.waitTimes.slice(-100);
      }

      bucket.totalAllowed++;
      this.recordEvent('dequeued', key, result.remaining, item.cost, undefined, waitTime);
      
      item.resolve({
        ...result,
        queuePosition: 0,
      });

      // Try to process more
      setTimeout(() => this.processQueue(key), 0);
    }
  }

  private removeFromQueue(key: string, item: QueuedItem): void {
    const queue = this.queues.get(key);
    if (queue) {
      const index = queue.indexOf(item);
      if (index !== -1) {
        queue.splice(index, 1);
        this.queues.set(key, queue);
      }
    }
    this.recordEvent('expired', key, 0, item.cost);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getKey(request: RateLimitRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }
    
    const parts = [this.name];
    if (request.endpoint) parts.push(request.endpoint);
    if (request.userId) parts.push(`user:${request.userId}`);
    if (request.ip) parts.push(`ip:${request.ip}`);
    if (request.method) parts.push(request.method);
    
    return parts.join(':');
  }

  private createBucket(): BucketState {
    return {
      tokens: this.config.burstLimit ?? this.config.maxRequests,
      lastRefill: Date.now(),
      requests: [],
      windowStart: Date.now(),
      totalAllowed: 0,
      totalRejected: 0,
      totalQueued: 0,
      waitTimes: [],
    };
  }

  private recordEvent(
    event: RateLimitEvent['event'],
    key: string,
    remaining: number,
    cost: number,
    queuePosition?: number,
    waitTime?: number
  ): void {
    this.eventHistory.push({
      timestamp: Date.now(),
      key,
      event,
      remaining,
      cost,
      queuePosition,
      waitTime,
    });

    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiry = this.config.windowMs * 2;

      for (const [key, bucket] of Array.from(Array.from(Array.from(Array.from(Array.from(this.buckets.entries())))))) {
        const lastActivity = bucket.requests.length > 0 
          ? bucket.requests[bucket.requests.length - 1] 
          : bucket.lastRefill;
        
        if (now - lastActivity > expiry) {
          this.buckets.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  // ---------------------------------------------------------------------------
  // Stats & Introspection
  // ---------------------------------------------------------------------------

  getStats(key?: string): RateLimitStats | RateLimitStats[] {
    if (key) {
      const bucket = this.buckets.get(key);
      if (!bucket) {
        return {
          key,
          strategy: this.config.strategy,
          requestCount: 0,
          windowStart: Date.now(),
          windowEnd: Date.now() + this.config.windowMs,
          totalAllowed: 0,
          totalRejected: 0,
          totalQueued: 0,
          avgWaitTime: 0,
        };
      }
      return this.bucketToStats(key, bucket);
    }

    return Array.from(this.buckets.entries()).map(([k, b]) => this.bucketToStats(k, b));
  }

  private bucketToStats(key: string, bucket: BucketState): RateLimitStats {
    const avgWaitTime = bucket.waitTimes.length > 0
      ? bucket.waitTimes.reduce((a, b) => a + b, 0) / bucket.waitTimes.length
      : 0;

    return {
      key,
      strategy: this.config.strategy,
      currentTokens: this.config.strategy === 'token-bucket' ? bucket.tokens : undefined,
      requestCount: bucket.requests.length,
      windowStart: bucket.windowStart,
      windowEnd: bucket.windowStart + this.config.windowMs,
      totalAllowed: bucket.totalAllowed,
      totalRejected: bucket.totalRejected,
      totalQueued: bucket.totalQueued,
      avgWaitTime,
    };
  }

  getEventHistory(): RateLimitEvent[] {
    return [...this.eventHistory];
  }

  // ---------------------------------------------------------------------------
  // Control Methods
  // ---------------------------------------------------------------------------

  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
      const queue = this.queues.get(key);
      if (queue) {
        queue.forEach(item => {
          clearTimeout(item.timeout);
          item.reject(new Error('Rate limiter reset'));
        });
        this.queues.delete(key);
      }
    } else {
      this.buckets.clear();
      for (const queue of Array.from(Array.from(Array.from(Array.from(this.queues.values()))))) {
        queue.forEach(item => {
          clearTimeout(item.timeout);
          item.reject(new Error('Rate limiter reset'));
        });
      }
      this.queues.clear();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.reset();
  }
}

// =============================================================================
// RATE LIMITER REGISTRY
// =============================================================================

export class RateLimiterRegistry {
  private limiters: Map<string, RateLimiter> = new Map();
  private listeners: Set<(event: RateLimitEvent & { limiter: string }) => void> = new Set();

  create(options: RateLimiterOptions): RateLimiter {
    const limiter = new RateLimiter({
      ...options,
      onAllow: (key, remaining) => {
        options.onAllow?.(key, remaining);
        this.notifyListeners({
          timestamp: Date.now(),
          key,
          event: 'allowed',
          remaining,
          cost: 1,
          limiter: options.name,
        });
      },
      onReject: (key, retryAfter) => {
        options.onReject?.(key, retryAfter);
        this.notifyListeners({
          timestamp: Date.now(),
          key,
          event: 'rejected',
          remaining: 0,
          cost: 1,
          limiter: options.name,
        });
      },
    });
    
    this.limiters.set(options.name, limiter);
    return limiter;
  }

  get(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }

  getOrCreate(options: RateLimiterOptions): RateLimiter {
    return this.limiters.get(options.name) || this.create(options);
  }

  remove(name: string): boolean {
    const limiter = this.limiters.get(name);
    if (limiter) {
      limiter.destroy();
      return this.limiters.delete(name);
    }
    return false;
  }

  getAll(): Map<string, RateLimiter> {
    return new Map(this.limiters);
  }

  resetAll(): void {
    for (const limiter of Array.from(Array.from(Array.from(Array.from(this.limiters.values()))))) {
      limiter.reset();
    }
  }

  onEvent(listener: (event: RateLimitEvent & { limiter: string }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: RateLimitEvent & { limiter: string }): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (e) {
        console.error('Rate limit event listener error:', e);
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let registryInstance: RateLimiterRegistry | null = null;

export function getRateLimiterRegistry(): RateLimiterRegistry {
  if (!registryInstance) {
    registryInstance = new RateLimiterRegistry();
  }
  return registryInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  return getRateLimiterRegistry().create(options);
}

export function getRateLimiter(name: string): RateLimiter | undefined {
  return getRateLimiterRegistry().get(name);
}

export async function withRateLimit<T>(
  name: string,
  operation: () => Promise<T>,
  request?: RateLimitRequest,
  config?: RateLimitConfig
): Promise<T> {
  const limiter = getRateLimiterRegistry().getOrCreate({ 
    name, 
    config: config || { strategy: 'sliding-window', maxRequests: 100, windowMs: 60000 }
  });
  
  await limiter.acquire(request);
  return operation();
}

// =============================================================================
// PREDEFINED CONFIGURATIONS
// =============================================================================

export const RATE_LIMIT_PRESETS = {
  // API rate limits
  apiDefault: {
    strategy: 'sliding-window' as const,
    maxRequests: 100,
    windowMs: 60000, // 100/minute
  },
  apiStrict: {
    strategy: 'sliding-window' as const,
    maxRequests: 30,
    windowMs: 60000, // 30/minute
  },
  apiGenerous: {
    strategy: 'token-bucket' as const,
    maxRequests: 1000,
    windowMs: 60000, // 1000/minute with burst
    burstLimit: 50,
  },

  // User action limits
  userAction: {
    strategy: 'fixed-window' as const,
    maxRequests: 10,
    windowMs: 60000, // 10/minute
  },
  userSubmission: {
    strategy: 'sliding-window' as const,
    maxRequests: 5,
    windowMs: 60000, // 5/minute
  },

  // Background task limits  
  backgroundTask: {
    strategy: 'leaky-bucket' as const,
    maxRequests: 50,
    windowMs: 60000,
    refillRate: 1, // 1/second steady
  },
};

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useRateLimiter(name: string, config: RateLimitConfig) {
  const [stats, setStats] = useState<RateLimitStats[]>([]);
  const registry = getRateLimiterRegistry();

  const limiter = useMemo(() => {
    return registry.getOrCreate({ name, config });
  }, [name, config, registry]);

  useEffect(() => {
    const updateStats = () => {
      const s = limiter.getStats();
      setStats(Array.isArray(s) ? s : [s]);
    };
    updateStats();
    
    const interval = setInterval(updateStats, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [limiter]);

  const check = useCallback(async (request?: RateLimitRequest) => {
    return limiter.check(request);
  }, [limiter]);

  const acquire = useCallback(async (request?: RateLimitRequest) => {
    return limiter.acquire(request);
  }, [limiter]);

  const reset = useCallback((key?: string) => {
    limiter.reset(key);
  }, [limiter]);

  return {
    stats,
    check,
    acquire,
    reset,
    getEventHistory: () => limiter.getEventHistory(),
  };
}

export default RateLimiter;
