
/**
 * Circuit Breaker Service
 * Prevent cascading failures with circuit breaker pattern
 * 
 * v0.42.3 - Circuit Breaker Pattern
 */

// =============================================================================
// TYPES
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Failures before opening (default: 5)
  successThreshold: number;     // Successes in half-open to close (default: 2)
  timeout: number;              // Time before half-open (ms, default: 30000)
  resetTimeout: number;         // Time before resetting failure count (ms, default: 60000)
  monitorInterval: number;      // Health check interval (ms, default: 5000)
  volumeThreshold: number;      // Min requests before evaluating (default: 10)
  errorPercentThreshold: number; // Error % to trip (default: 50)
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailure?: number;
  lastSuccess?: number;
  lastStateChange: number;
  errorRate: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface CircuitEvent {
  timestamp: number;
  circuit: string;
  event: 'success' | 'failure' | 'state-change' | 'rejected';
  previousState?: CircuitState;
  newState?: CircuitState;
  error?: string;
  duration?: number;
}

export interface CircuitBreakerOptions {
  name: string;
  config?: Partial<CircuitBreakerConfig>;
  fallback?: <T>() => T | Promise<T>;
  onStateChange?: (state: CircuitState, previousState: CircuitState) => void;
  onSuccess?: (duration: number) => void;
  onFailure?: (error: Error, duration: number) => void;
  isFailure?: (error: unknown) => boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000,
  monitorInterval: 5000,
  volumeThreshold: 10,
  errorPercentThreshold: 50,
};

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailure?: number;
  private lastSuccess?: number;
  private lastStateChange = Date.now();
  private stateChangeTimer?: NodeJS.Timeout;
  private fallback?: <T>() => T | Promise<T>;
  private onStateChange?: (state: CircuitState, previousState: CircuitState) => void;
  private onSuccess?: (duration: number) => void;
  private onFailure?: (error: Error, duration: number) => void;
  private isFailure: (error: unknown) => boolean;
  private eventHistory: CircuitEvent[] = [];
  private maxEventHistory = 100;
  private windowStart = Date.now();
  private windowRequests = 0;
  private windowFailures = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.fallback = options.fallback;
    this.onStateChange = options.onStateChange;
    this.onSuccess = options.onSuccess;
    this.onFailure = options.onFailure;
    this.isFailure = options.isFailure || ((e) => e instanceof Error);
  }

  // ---------------------------------------------------------------------------
  // Core Methods
  // ---------------------------------------------------------------------------

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        this.recordEvent('rejected');
        
        if (this.fallback) {
          return this.fallback();
        }
        throw new CircuitOpenError(this.name, this.getTimeUntilRetry());
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      if (this.isFailure(error)) {
        this.recordFailure(error as Error, Date.now() - startTime);
      }
      throw error;
    }
  }

  executeSync<T>(operation: () => T): T {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        this.recordEvent('rejected');
        
        if (this.fallback) {
          return this.fallback() as T;
        }
        throw new CircuitOpenError(this.name, this.getTimeUntilRetry());
      }
    }

    const startTime = Date.now();
    
    try {
      const result = operation();
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      if (this.isFailure(error)) {
        this.recordFailure(error as Error, Date.now() - startTime);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  private recordSuccess(duration: number): void {
    this.totalRequests++;
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccess = Date.now();
    this.windowRequests++;

    this.recordEvent('success', undefined, duration);
    this.onSuccess?.(duration);

    if (this.state === 'half-open') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }

    // Reset failure count after reset timeout
    this.scheduleReset();
  }

  private recordFailure(error: Error, duration: number): void {
    this.totalRequests++;
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailure = Date.now();
    this.windowRequests++;
    this.windowFailures++;

    this.recordEvent('failure', error.message, duration);
    this.onFailure?.(error, duration);

    // Check if we should open the circuit
    if (this.state === 'closed') {
      if (this.shouldTrip()) {
        this.transitionTo('open');
      }
    } else if (this.state === 'half-open') {
      // Any failure in half-open goes back to open
      this.transitionTo('open');
    }
  }

  private shouldTrip(): boolean {
    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check error percentage (only if we have enough requests)
    if (this.windowRequests >= this.config.volumeThreshold) {
      const errorRate = (this.windowFailures / this.windowRequests) * 100;
      if (errorRate >= this.config.errorPercentThreshold) {
        return true;
      }
    }

    return false;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.timeout;
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    // Reset counters based on state
    if (newState === 'closed') {
      this.consecutiveFailures = 0;
      this.resetWindow();
    } else if (newState === 'half-open') {
      this.consecutiveSuccesses = 0;
    }

    this.recordEvent('state-change', undefined, undefined, previousState, newState);
    this.onStateChange?.(newState, previousState);
  }

  private scheduleReset(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }

    this.stateChangeTimer = setTimeout(() => {
      if (this.state === 'closed') {
        this.resetWindow();
      }
    }, this.config.resetTimeout);
  }

  private resetWindow(): void {
    this.windowStart = Date.now();
    this.windowRequests = 0;
    this.windowFailures = 0;
  }

  // ---------------------------------------------------------------------------
  // Event Tracking
  // ---------------------------------------------------------------------------

  private recordEvent(
    event: CircuitEvent['event'],
    error?: string,
    duration?: number,
    previousState?: CircuitState,
    newState?: CircuitState
  ): void {
    this.eventHistory.push({
      timestamp: Date.now(),
      circuit: this.name,
      event,
      previousState,
      newState,
      error,
      duration,
    });

    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitStats {
    const errorRate = this.windowRequests > 0 
      ? (this.windowFailures / this.windowRequests) * 100 
      : 0;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      errorRate,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  getEventHistory(): CircuitEvent[] {
    return [...this.eventHistory];
  }

  getTimeUntilRetry(): number {
    if (this.state !== 'open') return 0;
    const elapsed = Date.now() - this.lastStateChange;
    return Math.max(0, this.config.timeout - elapsed);
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  isClosed(): boolean {
    return this.state === 'closed';
  }

  isHalfOpen(): boolean {
    return this.state === 'half-open';
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = Date.now();
    this.resetWindow();
    
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
  }

  forceOpen(): void {
    this.transitionTo('open');
  }

  forceClose(): void {
    this.transitionTo('closed');
  }
}

// =============================================================================
// CIRCUIT OPEN ERROR
// =============================================================================

export class CircuitOpenError extends Error {
  constructor(
    public circuitName: string,
    public retryAfter: number
  ) {
    super(`Circuit ${circuitName} is open. Retry after ${retryAfter}ms`);
    this.name = 'CircuitOpenError';
  }
}

// =============================================================================
// CIRCUIT BREAKER REGISTRY
// =============================================================================

export class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();
  private listeners: Set<(event: CircuitEvent) => void> = new Set();

  create(options: CircuitBreakerOptions): CircuitBreaker {
    const circuit = new CircuitBreaker({
      ...options,
      onStateChange: (state, previousState) => {
        options.onStateChange?.(state, previousState);
        this.notifyListeners({
          timestamp: Date.now(),
          circuit: options.name,
          event: 'state-change',
          previousState,
          newState: state,
        });
      },
    });
    
    this.circuits.set(options.name, circuit);
    return circuit;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    return this.circuits.get(options.name) || this.create(options);
  }

  remove(name: string): boolean {
    return this.circuits.delete(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.circuits);
  }

  getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>();
    for (const [name, circuit] of Array.from(this.circuits)) {
      stats.set(name, circuit.getStats());
    }
    return stats;
  }

  resetAll(): void {
    for (const circuit of Array.from(Array.from(Array.from(Array.from(this.circuits.values()))))) {
      circuit.reset();
    }
  }

  onEvent(listener: (event: CircuitEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: CircuitEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (e) {
        console.error('Circuit event listener error:', e);
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let registryInstance: CircuitBreakerRegistry | null = null;

export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  if (!registryInstance) {
    registryInstance = new CircuitBreakerRegistry();
  }
  return registryInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  return getCircuitBreakerRegistry().create(options);
}

export function getCircuitBreaker(name: string): CircuitBreaker | undefined {
  return getCircuitBreakerRegistry().get(name);
}

export async function withCircuitBreaker<T>(
  name: string,
  operation: () => Promise<T>,
  options?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const circuit = getCircuitBreakerRegistry().getOrCreate({ name, config: options });
  return circuit.execute(operation);
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>) {
  const [stats, setStats] = useState<CircuitStats | null>(null);
  const registry = getCircuitBreakerRegistry();

  const circuit = useMemo(() => {
    return registry.getOrCreate({ name, config });
  }, [name, config, registry]);

  useEffect(() => {
    // Update stats periodically
    const updateStats = () => setStats(circuit.getStats());
    updateStats();
    
    const interval = setInterval(updateStats, 1000);
    
    // Listen for state changes
    const unsubscribe = registry.onEvent((event) => {
      if (event.circuit === name) {
        updateStats();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [circuit, name, registry]);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    return circuit.execute(operation);
  }, [circuit]);

  const reset = useCallback(() => {
    circuit.reset();
    setStats(circuit.getStats());
  }, [circuit]);

  const forceOpen = useCallback(() => {
    circuit.forceOpen();
    setStats(circuit.getStats());
  }, [circuit]);

  const forceClose = useCallback(() => {
    circuit.forceClose();
    setStats(circuit.getStats());
  }, [circuit]);

  return {
    stats,
    state: stats?.state || 'closed',
    isOpen: stats?.state === 'open',
    isClosed: stats?.state === 'closed',
    isHalfOpen: stats?.state === 'half-open',
    execute,
    reset,
    forceOpen,
    forceClose,
    getEventHistory: () => circuit.getEventHistory(),
    timeUntilRetry: circuit.getTimeUntilRetry(),
  };
}

export function useAllCircuitBreakers() {
  const [allStats, setAllStats] = useState<Map<string, CircuitStats>>(new Map());
  const registry = getCircuitBreakerRegistry();

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
    circuits: allStats,
    resetAll: () => {
      registry.resetAll();
      setAllStats(registry.getAllStats());
    },
  };
}

export default CircuitBreaker;
