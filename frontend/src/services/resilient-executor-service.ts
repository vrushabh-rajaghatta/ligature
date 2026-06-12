
/**
 * Resilient Executor Service
 * Integrates retry policies with circuit breaker for comprehensive fault tolerance
 * 
 * v0.42.5 - Retry + Circuit Breaker Integration
 * 
 * Combines:
 * - Circuit breaker: Fail fast when service is unhealthy
 * - Retry policies: Automatically retry transient failures
 * - Bulkhead: Resource isolation (optional)
 * - Rate limiting: Request throttling (optional)
 */

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type RetryStrategy = 
  | 'exponential'
  | 'linear'
  | 'fibonacci'
  | 'constant'
  | 'immediate'
  | 'custom';

export type RetryCondition =
  | 'always'
  | 'network-error'
  | 'timeout'
  | '5xx'
  | '4xx'
  | 'idempotent'
  | 'custom';

export interface RetryPolicy {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterPercent: number;        // 0-100, randomization to prevent thundering herd
  conditions: RetryCondition[];
  customCondition?: (error: Error) => boolean;
  customDelay?: (attempt: number, baseDelay: number) => number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

export interface CircuitConfig {
  failureThreshold: number;     // Failures before opening
  successThreshold: number;     // Successes in half-open to close
  timeout: number;              // Time in open state before half-open
  errorPercentThreshold: number; // Error % threshold (0-100)
  volumeThreshold: number;      // Min requests before % calculation
}

export interface ExecutorConfig {
  name: string;
  retry: Partial<RetryPolicy>;
  circuit: Partial<CircuitConfig>;
  timeout?: number;             // Request timeout in ms
  bulkhead?: string;            // Bulkhead name to use
  rateLimit?: string;           // Rate limiter name to use
}

export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  circuitState: CircuitState;
  retriedErrors: Error[];
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ExecutorStats {
  name: string;
  circuitState: CircuitState;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRetries: number;
  avgRetries: number;
  avgDuration: number;
  lastExecution?: number;
  lastFailure?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  errorRate: number;
}

export interface ExecutorEvent {
  timestamp: number;
  executor: string;
  event: 'execute' | 'success' | 'failure' | 'retry' | 'circuit-open' | 'circuit-close' | 'circuit-half-open' | 'timeout';
  attempt?: number;
  duration?: number;
  error?: string;
  nextRetryMs?: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  strategy: 'exponential',
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterPercent: 20,
  conditions: ['network-error', '5xx', 'timeout'],
};

const DEFAULT_CIRCUIT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  errorPercentThreshold: 50,
  volumeThreshold: 10,
};

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const EXECUTOR_PRESETS = {
  // Standard API calls - moderate retry, standard circuit
  apiDefault: {
    retry: {
      strategy: 'exponential' as RetryStrategy,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitterPercent: 20,
      conditions: ['network-error', '5xx', 'timeout'] as RetryCondition[],
    },
    circuit: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
    },
  },

  // Critical operations - aggressive retry, sensitive circuit
  critical: {
    retry: {
      strategy: 'exponential' as RetryStrategy,
      maxAttempts: 5,
      baseDelayMs: 500,
      maxDelayMs: 30000,
      jitterPercent: 10,
      conditions: ['always'] as RetryCondition[],
    },
    circuit: {
      failureThreshold: 3,
      successThreshold: 5,
      timeout: 60000,
      errorPercentThreshold: 30,
    },
  },

  // Background tasks - patient retry, relaxed circuit
  background: {
    retry: {
      strategy: 'linear' as RetryStrategy,
      maxAttempts: 10,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      jitterPercent: 30,
      conditions: ['network-error', '5xx'] as RetryCondition[],
    },
    circuit: {
      failureThreshold: 10,
      successThreshold: 2,
      timeout: 120000,
      errorPercentThreshold: 70,
    },
  },

  // Real-time operations - minimal retry, fast circuit
  realtime: {
    retry: {
      strategy: 'immediate' as RetryStrategy,
      maxAttempts: 2,
      baseDelayMs: 100,
      maxDelayMs: 500,
      jitterPercent: 0,
      conditions: ['network-error'] as RetryCondition[],
    },
    circuit: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 10000,
      errorPercentThreshold: 40,
    },
  },

  // Idempotent writes - safe to retry aggressively
  idempotentWrite: {
    retry: {
      strategy: 'fibonacci' as RetryStrategy,
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 20000,
      jitterPercent: 25,
      conditions: ['idempotent', 'network-error', '5xx'] as RetryCondition[],
    },
    circuit: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 45000,
    },
  },
} as const;

// =============================================================================
// RESILIENT EXECUTOR CLASS
// =============================================================================

export class ResilientExecutor {
  private name: string;
  private retryPolicy: RetryPolicy;
  private circuitConfig: CircuitConfig;
  private timeout: number;
  private bulkheadName?: string;
  private rateLimitName?: string;

  // Circuit breaker state
  private circuitState: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private requestWindow: { timestamp: number; success: boolean }[] = [];

  // Stats
  private totalExecutions: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private totalRetries: number = 0;
  private totalDuration: number = 0;
  private lastExecution: number = 0;

  // Event history
  private events: ExecutorEvent[] = [];
  private maxEvents: number = 100;

  constructor(config: ExecutorConfig) {
    this.name = config.name;
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...config.retry };
    this.circuitConfig = { ...DEFAULT_CIRCUIT_CONFIG, ...config.circuit };
    this.timeout = config.timeout || 30000;
    this.bulkheadName = config.bulkhead;
    this.rateLimitName = config.rateLimit;
  }

  // ---------------------------------------------------------------------------
  // MAIN EXECUTION
  // ---------------------------------------------------------------------------

  async execute<T>(operation: () => Promise<T>): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const retriedErrors: Error[] = [];
    let attempts = 0;

    this.recordEvent('execute');

    // Check circuit state
    if (this.circuitState === 'open') {
      if (Date.now() - this.lastFailureTime >= this.circuitConfig.timeout) {
        this.transitionTo('half-open');
      } else {
        const error = new CircuitOpenError(
          `Circuit ${this.name} is open`,
          this.circuitConfig.timeout - (Date.now() - this.lastFailureTime)
        );
        return {
          success: false,
          error,
          attempts: 0,
          totalDuration: Date.now() - startTime,
          circuitState: this.circuitState,
          retriedErrors: [],
        };
      }
    }

    // Execute with retries
    while (attempts < this.retryPolicy.maxAttempts) {
      attempts++;

      try {
        const result = await this.executeWithTimeout(operation);
        this.recordSuccess();
        this.recordEvent('success', { attempt: attempts, duration: Date.now() - startTime });

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
          circuitState: this.circuitState,
          retriedErrors,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        retriedErrors.push(err);

        // Check if we should retry
        if (attempts < this.retryPolicy.maxAttempts && this.shouldRetry(err)) {
          const delay = this.calculateDelay(attempts);
          this.totalRetries++;
          
          this.recordEvent('retry', {
            attempt: attempts,
            error: err.message,
            nextRetryMs: delay,
          });

          if (this.retryPolicy.onRetry) {
            this.retryPolicy.onRetry(attempts, err, delay);
          }

          await this.sleep(delay);
          continue;
        }

        // No more retries - record failure
        this.recordFailure();
        this.recordEvent('failure', {
          attempt: attempts,
          duration: Date.now() - startTime,
          error: err.message,
        });

        return {
          success: false,
          error: err,
          attempts,
          totalDuration: Date.now() - startTime,
          circuitState: this.circuitState,
          retriedErrors,
        };
      }
    }

    // Should not reach here, but handle edge case
    const finalError = new Error('Max attempts exceeded');
    return {
      success: false,
      error: finalError,
      attempts,
      totalDuration: Date.now() - startTime,
      circuitState: this.circuitState,
      retriedErrors,
    };
  }

  // ---------------------------------------------------------------------------
  // TIMEOUT HANDLING
  // ---------------------------------------------------------------------------

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.recordEvent('timeout');
        reject(new TimeoutError(`Operation timed out after ${this.timeout}ms`));
      }, this.timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // ---------------------------------------------------------------------------
  // RETRY LOGIC
  // ---------------------------------------------------------------------------

  private shouldRetry(error: Error): boolean {
    // Circuit is open - don't retry
    if (this.circuitState === 'open') {
      return false;
    }

    for (const condition of this.retryPolicy.conditions) {
      switch (condition) {
        case 'always':
          return true;

        case 'network-error':
          if (this.isNetworkError(error)) return true;
          break;

        case 'timeout':
          if (error instanceof TimeoutError) return true;
          break;

        case '5xx':
          if (this.isServerError(error)) return true;
          break;

        case '4xx':
          if (this.isClientError(error)) return true;
          break;

        case 'idempotent':
          // Assume idempotent - always safe to retry
          return true;

        case 'custom':
          if (this.retryPolicy.customCondition?.(error)) return true;
          break;
      }
    }

    return false;
  }

  private isNetworkError(error: Error): boolean {
    const networkPatterns = [
      'network',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'fetch failed',
      'Failed to fetch',
    ];
    const message = error.message.toLowerCase();
    return networkPatterns.some(p => message.includes(p.toLowerCase()));
  }

  private isServerError(error: Error): boolean {
    if (error instanceof HttpError) {
      return error.status >= 500 && error.status < 600;
    }
    return /5\d{2}/.test(error.message);
  }

  private isClientError(error: Error): boolean {
    if (error instanceof HttpError) {
      return error.status >= 400 && error.status < 500;
    }
    return /4\d{2}/.test(error.message);
  }

  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.retryPolicy.strategy) {
      case 'exponential':
        delay = this.retryPolicy.baseDelayMs * Math.pow(2, attempt - 1);
        break;

      case 'linear':
        delay = this.retryPolicy.baseDelayMs * attempt;
        break;

      case 'fibonacci':
        delay = this.retryPolicy.baseDelayMs * this.fibonacci(attempt);
        break;

      case 'constant':
        delay = this.retryPolicy.baseDelayMs;
        break;

      case 'immediate':
        delay = 0;
        break;

      case 'custom':
        delay = this.retryPolicy.customDelay?.(attempt, this.retryPolicy.baseDelayMs) 
          ?? this.retryPolicy.baseDelayMs;
        break;

      default:
        delay = this.retryPolicy.baseDelayMs;
    }

    // Apply max delay cap
    delay = Math.min(delay, this.retryPolicy.maxDelayMs);

    // Apply jitter
    if (this.retryPolicy.jitterPercent > 0) {
      const jitterRange = delay * (this.retryPolicy.jitterPercent / 100);
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }

    return Math.max(0, Math.round(delay));
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i < n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // CIRCUIT BREAKER LOGIC
  // ---------------------------------------------------------------------------

  private recordSuccess(): void {
    this.totalExecutions++;
    this.successfulExecutions++;
    this.lastExecution = Date.now();
    this.failures = 0;
    this.successes++;

    this.requestWindow.push({ timestamp: Date.now(), success: true });
    this.pruneRequestWindow();

    if (this.circuitState === 'half-open') {
      if (this.successes >= this.circuitConfig.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  private recordFailure(): void {
    this.totalExecutions++;
    this.failedExecutions++;
    this.lastExecution = Date.now();
    this.lastFailureTime = Date.now();
    this.failures++;
    this.successes = 0;

    this.requestWindow.push({ timestamp: Date.now(), success: false });
    this.pruneRequestWindow();

    if (this.circuitState === 'half-open') {
      this.transitionTo('open');
    } else if (this.circuitState === 'closed') {
      // Check failure threshold
      if (this.failures >= this.circuitConfig.failureThreshold) {
        this.transitionTo('open');
      }

      // Check error percentage
      if (this.requestWindow.length >= this.circuitConfig.volumeThreshold) {
        const errorRate = this.calculateErrorRate();
        if (errorRate >= this.circuitConfig.errorPercentThreshold) {
          this.transitionTo('open');
        }
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.circuitState;
    this.circuitState = newState;

    if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === 'half-open') {
      this.successes = 0;
    }

    this.recordEvent(`circuit-${newState}` as ExecutorEvent['event']);
  }

  private pruneRequestWindow(): void {
    const cutoff = Date.now() - 60000; // 1 minute window
    this.requestWindow = this.requestWindow.filter(r => r.timestamp > cutoff);
  }

  private calculateErrorRate(): number {
    if (this.requestWindow.length === 0) return 0;
    const failures = this.requestWindow.filter(r => !r.success).length;
    return (failures / this.requestWindow.length) * 100;
  }

  // ---------------------------------------------------------------------------
  // EVENT TRACKING
  // ---------------------------------------------------------------------------

  private recordEvent(
    event: ExecutorEvent['event'],
    details: Partial<ExecutorEvent> = {}
  ): void {
    this.events.push({
      timestamp: Date.now(),
      executor: this.name,
      event,
      ...details,
    });

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC METHODS
  // ---------------------------------------------------------------------------

  getStats(): ExecutorStats {
    const avgRetries = this.totalExecutions > 0
      ? this.totalRetries / this.totalExecutions
      : 0;

    const avgDuration = this.totalExecutions > 0
      ? this.totalDuration / this.totalExecutions
      : 0;

    return {
      name: this.name,
      circuitState: this.circuitState,
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      totalRetries: this.totalRetries,
      avgRetries,
      avgDuration,
      lastExecution: this.lastExecution || undefined,
      lastFailure: this.lastFailureTime || undefined,
      consecutiveFailures: this.failures,
      consecutiveSuccesses: this.successes,
      errorRate: this.calculateErrorRate(),
    };
  }

  getEvents(): ExecutorEvent[] {
    return [...this.events];
  }

  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  reset(): void {
    this.circuitState = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.requestWindow = [];
  }

  forceOpen(): void {
    this.transitionTo('open');
    this.lastFailureTime = Date.now();
  }

  forceClose(): void {
    this.transitionTo('closed');
  }

  updateRetryPolicy(policy: Partial<RetryPolicy>): void {
    this.retryPolicy = { ...this.retryPolicy, ...policy };
  }

  updateCircuitConfig(config: Partial<CircuitConfig>): void {
    this.circuitConfig = { ...this.circuitConfig, ...config };
  }
}

// =============================================================================
// EXECUTOR REGISTRY
// =============================================================================

class ExecutorRegistry {
  private executors: Map<string, ResilientExecutor> = new Map();
  private listeners: Set<(executors: Map<string, ResilientExecutor>) => void> = new Set();

  register(config: ExecutorConfig): ResilientExecutor {
    const executor = new ResilientExecutor(config);
    this.executors.set(config.name, executor);
    this.notifyListeners();
    return executor;
  }

  get(name: string): ResilientExecutor | undefined {
    return this.executors.get(name);
  }

  getOrCreate(config: ExecutorConfig): ResilientExecutor {
    const existing = this.executors.get(config.name);
    if (existing) return existing;
    return this.register(config);
  }

  remove(name: string): boolean {
    const result = this.executors.delete(name);
    if (result) this.notifyListeners();
    return result;
  }

  getAll(): Map<string, ResilientExecutor> {
    return new Map(this.executors);
  }

  getAllStats(): ExecutorStats[] {
    const stats: ExecutorStats[] = [];
    for (const executor of Array.from(Array.from(Array.from(Array.from(Array.from(this.executors.values())))))) {
      stats.push(executor.getStats());
    }
    return stats;
  }

  subscribe(listener: (executors: Map<string, ResilientExecutor>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getAll();
    for (const listener of Array.from(this.listeners)) {
      listener(snapshot);
    }
  }
}

export const executorRegistry = new ExecutorRegistry();

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

export class CircuitOpenError extends Error {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class HttpError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useResilientExecutor(
  name: string,
  config?: Partial<Omit<ExecutorConfig, 'name'>>
) {
  const [stats, setStats] = useState<ExecutorStats | null>(null);
  const [executor] = useState(() => {
    return executorRegistry.getOrCreate({
      name,
      retry: config?.retry || {},
      circuit: config?.circuit || {},
      timeout: config?.timeout,
      bulkhead: config?.bulkhead,
      rateLimit: config?.rateLimit,
    });
  });

  useEffect(() => {
    const updateStats = () => setStats(executor.getStats());
    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [executor]);

  const execute = useCallback(
    async <T>(operation: () => Promise<T>): Promise<ExecutionResult<T>> => {
      const result = await executor.execute(operation);
      setStats(executor.getStats());
      return result;
    },
    [executor]
  );

  const reset = useCallback(() => {
    executor.reset();
    setStats(executor.getStats());
  }, [executor]);

  const forceOpen = useCallback(() => {
    executor.forceOpen();
    setStats(executor.getStats());
  }, [executor]);

  const forceClose = useCallback(() => {
    executor.forceClose();
    setStats(executor.getStats());
  }, [executor]);

  return {
    execute,
    stats,
    events: executor.getEvents(),
    reset,
    forceOpen,
    forceClose,
    updateRetryPolicy: executor.updateRetryPolicy.bind(executor),
    updateCircuitConfig: executor.updateCircuitConfig.bind(executor),
  };
}

export function useAllExecutors() {
  const [executors, setExecutors] = useState<Map<string, ResilientExecutor>>(
    () => executorRegistry.getAll()
  );
  const [stats, setStats] = useState<ExecutorStats[]>([]);

  useEffect(() => {
    const unsubscribe = executorRegistry.subscribe(setExecutors);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const updateStats = () => setStats(executorRegistry.getAllStats());
    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [executors]);

  return { executors, stats };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export async function withResilience<T>(
  name: string,
  operation: () => Promise<T>,
  config?: Partial<Omit<ExecutorConfig, 'name'>>
): Promise<T> {
  const executor = executorRegistry.getOrCreate({
    name,
    retry: config?.retry || {},
    circuit: config?.circuit || {},
    timeout: config?.timeout,
  });

  const result = await executor.execute(operation);

  if (!result.success) {
    throw result.error;
  }

  return result.data as T;
}

export function createExecutor(config: ExecutorConfig): ResilientExecutor {
  return executorRegistry.register(config);
}

// =============================================================================
// FETCH WRAPPER
// =============================================================================

export interface ResilientFetchOptions extends RequestInit {
  executor?: string;
  executorConfig?: Partial<Omit<ExecutorConfig, 'name'>>;
}

export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const { executor: executorName, executorConfig, ...fetchOptions } = options;
  const name = executorName || `fetch:${new URL(url, 'http://localhost').pathname}`;

  const executor = executorRegistry.getOrCreate({
    name,
    retry: executorConfig?.retry || EXECUTOR_PRESETS.apiDefault.retry,
    circuit: executorConfig?.circuit || EXECUTOR_PRESETS.apiDefault.circuit,
    timeout: executorConfig?.timeout || 30000,
  });

  const result = await executor.execute(async () => {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    return response;
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data as Response;
}
