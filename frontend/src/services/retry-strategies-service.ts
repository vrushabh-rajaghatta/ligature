
/**
 * Connection Retry Strategies Service
 * Custom retry strategies per endpoint
 * 
 * v0.42.2 - Connection Retry Strategies
 */

// =============================================================================
// TYPES
// =============================================================================

export type RetryStrategyType = 
  | 'exponential'    // Exponential backoff
  | 'linear'         // Linear backoff
  | 'fibonacci'      // Fibonacci sequence delays
  | 'constant'       // Constant delay
  | 'immediate'      // Retry immediately
  | 'custom';        // Custom function

export type RetryCondition = 
  | 'always'         // Always retry
  | 'network-error'  // Only on network errors
  | 'timeout'        // Only on timeouts
  | '5xx'            // Only on server errors
  | '4xx'            // Only on client errors (except 401/403)
  | 'idempotent'     // Only for idempotent methods
  | 'custom';        // Custom condition function

export interface RetryStrategy {
  id: string;
  name: string;
  type: RetryStrategyType;
  maxRetries: number;
  initialDelay: number;        // ms
  maxDelay: number;            // ms
  multiplier?: number;         // For exponential
  jitter?: boolean;            // Add randomness
  jitterFactor?: number;       // 0-1
  conditions: RetryCondition[];
  customDelayFn?: (attempt: number) => number;
  customConditionFn?: (error: unknown, response?: Response) => boolean;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
  onMaxRetries?: (error: unknown) => void;
}

export interface EndpointRetryConfig {
  pattern: string | RegExp;    // URL pattern to match
  methods?: string[];          // HTTP methods (default: all)
  strategy: string;            // Strategy ID
  overrides?: Partial<RetryStrategy>;
}

export interface RetryContext {
  url: string;
  method: string;
  attempt: number;
  startTime: number;
  lastError?: unknown;
  lastResponse?: Response;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  attempts: number;
  totalTime: number;
  errors: unknown[];
}

// =============================================================================
// BUILT-IN STRATEGIES
// =============================================================================

const BUILT_IN_STRATEGIES: Record<string, RetryStrategy> = {
  'default': {
    id: 'default',
    name: 'Default Exponential',
    type: 'exponential',
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
    jitterFactor: 0.3,
    conditions: ['network-error', '5xx', 'timeout'],
  },
  'aggressive': {
    id: 'aggressive',
    name: 'Aggressive Retry',
    type: 'exponential',
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 60000,
    multiplier: 2,
    jitter: true,
    jitterFactor: 0.2,
    conditions: ['always'],
  },
  'conservative': {
    id: 'conservative',
    name: 'Conservative',
    type: 'linear',
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 10000,
    conditions: ['network-error', '5xx'],
  },
  'immediate': {
    id: 'immediate',
    name: 'Immediate Retry',
    type: 'immediate',
    maxRetries: 3,
    initialDelay: 0,
    maxDelay: 0,
    conditions: ['network-error'],
  },
  'no-retry': {
    id: 'no-retry',
    name: 'No Retry',
    type: 'constant',
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    conditions: [],
  },
  'critical': {
    id: 'critical',
    name: 'Critical Operations',
    type: 'fibonacci',
    maxRetries: 7,
    initialDelay: 1000,
    maxDelay: 120000,
    jitter: true,
    jitterFactor: 0.1,
    conditions: ['always'],
  },
};

// =============================================================================
// RETRY STRATEGIES SERVICE
// =============================================================================

export class RetryStrategiesService {
  private strategies: Map<string, RetryStrategy> = new Map();
  private endpointConfigs: EndpointRetryConfig[] = [];
  private fibonacciCache: number[] = [1, 1];

  constructor() {
    // Load built-in strategies
    for (const [id, strategy] of Object.entries(BUILT_IN_STRATEGIES)) {
      this.strategies.set(id, strategy);
    }
  }

  // ---------------------------------------------------------------------------
  // Strategy Management
  // ---------------------------------------------------------------------------

  /**
   * Register a custom strategy
   */
  registerStrategy(strategy: RetryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Get a strategy by ID
   */
  getStrategy(id: string): RetryStrategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): RetryStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Remove a strategy
   */
  removeStrategy(id: string): boolean {
    // Don't allow removing built-in strategies
    if (BUILT_IN_STRATEGIES[id]) {
      return false;
    }
    return this.strategies.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Endpoint Configuration
  // ---------------------------------------------------------------------------

  /**
   * Configure retry strategy for endpoint pattern
   */
  configureEndpoint(config: EndpointRetryConfig): void {
    // Remove existing config for same pattern
    this.endpointConfigs = this.endpointConfigs.filter(c => 
      c.pattern.toString() !== config.pattern.toString()
    );
    this.endpointConfigs.push(config);
  }

  /**
   * Get strategy for a specific endpoint
   */
  getStrategyForEndpoint(url: string, method: string): RetryStrategy {
    for (const config of this.endpointConfigs) {
      const matches = typeof config.pattern === 'string'
        ? url.includes(config.pattern)
        : config.pattern.test(url);

      if (matches) {
        if (config.methods && !config.methods.includes(method.toUpperCase())) {
          continue;
        }

        const baseStrategy = this.strategies.get(config.strategy);
        if (baseStrategy) {
          return config.overrides
            ? { ...baseStrategy, ...config.overrides }
            : baseStrategy;
        }
      }
    }

    return this.strategies.get('default')!;
  }

  // ---------------------------------------------------------------------------
  // Retry Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a request with retry logic
   */
  async executeWithRetry<T>(
    request: () => Promise<Response>,
    url: string,
    method: string,
    parseResponse?: (response: Response) => Promise<T>
  ): Promise<RetryResult<T>> {
    const strategy = this.getStrategyForEndpoint(url, method);
    const context: RetryContext = {
      url,
      method,
      attempt: 0,
      startTime: Date.now(),
    };

    const errors: unknown[] = [];
    let lastResponse: Response | undefined;

    while (context.attempt <= strategy.maxRetries) {
      try {
        const response = await request();
        context.lastResponse = response;
        lastResponse = response;

        if (response.ok) {
          const data = parseResponse ? await parseResponse(response) : undefined;
          return {
            success: true,
            data,
            attempts: context.attempt + 1,
            totalTime: Date.now() - context.startTime,
            errors,
          };
        }

        // Check if should retry for this response
        if (!this.shouldRetry(strategy, null, response, context)) {
          break;
        }

        errors.push({ status: response.status, statusText: response.statusText });
      } catch (error) {
        context.lastError = error;
        errors.push(error);

        // Check if should retry for this error
        if (!this.shouldRetry(strategy, error, undefined, context)) {
          break;
        }
      }

      context.attempt++;

      if (context.attempt <= strategy.maxRetries) {
        const delay = this.calculateDelay(strategy, context.attempt);
        strategy.onRetry?.(context.attempt, delay, context.lastError || context.lastResponse);
        await this.sleep(delay);
      }
    }

    strategy.onMaxRetries?.(context.lastError || lastResponse);

    return {
      success: false,
      attempts: context.attempt,
      totalTime: Date.now() - context.startTime,
      errors,
    };
  }

  /**
   * Wrap fetch with retry logic
   */
  async fetchWithRetry<T = unknown>(
    url: string,
    options: RequestInit = {},
    parseResponse?: (response: Response) => Promise<T>
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      () => fetch(url, options),
      url,
      options.method || 'GET',
      parseResponse
    );
  }

  // ---------------------------------------------------------------------------
  // Retry Logic
  // ---------------------------------------------------------------------------

  private shouldRetry(
    strategy: RetryStrategy,
    error: unknown,
    response: Response | undefined,
    context: RetryContext
  ): boolean {
    if (context.attempt >= strategy.maxRetries) {
      return false;
    }

    // Check custom condition first
    if (strategy.customConditionFn) {
      return strategy.customConditionFn(error, response);
    }

    for (const condition of strategy.conditions) {
      if (this.checkCondition(condition, error, response, context)) {
        return true;
      }
    }

    return false;
  }

  private checkCondition(
    condition: RetryCondition,
    error: unknown,
    response: Response | undefined,
    context: RetryContext
  ): boolean {
    switch (condition) {
      case 'always':
        return true;

      case 'network-error':
        return error instanceof TypeError || 
               (error !== null && typeof error === 'object' && (error as { name?: string }).name === 'TypeError') ||
               (error !== null && typeof error === 'object' && (error as { message?: string }).message?.includes('network'));

      case 'timeout':
        return error !== null && typeof error === 'object' && (
          (error as { name?: string }).name === 'AbortError' ||
          (error as { message?: string }).message?.includes('timeout')
        );

      case '5xx':
        return response ? response.status >= 500 && response.status < 600 : false;

      case '4xx':
        if (!response) return false;
        const status = response.status;
        return status >= 400 && status < 500 && status !== 401 && status !== 403;

      case 'idempotent':
        const idempotentMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
        return idempotentMethods.includes(context.method.toUpperCase());

      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Delay Calculation
  // ---------------------------------------------------------------------------

  private calculateDelay(strategy: RetryStrategy, attempt: number): number {
    let delay: number;

    switch (strategy.type) {
      case 'exponential':
        delay = strategy.initialDelay * Math.pow(strategy.multiplier || 2, attempt - 1);
        break;

      case 'linear':
        delay = strategy.initialDelay * attempt;
        break;

      case 'fibonacci':
        delay = strategy.initialDelay * this.fibonacci(attempt);
        break;

      case 'constant':
        delay = strategy.initialDelay;
        break;

      case 'immediate':
        delay = 0;
        break;

      case 'custom':
        delay = strategy.customDelayFn?.(attempt) ?? strategy.initialDelay;
        break;

      default:
        delay = strategy.initialDelay;
    }

    // Apply max delay cap
    delay = Math.min(delay, strategy.maxDelay);

    // Apply jitter
    if (strategy.jitter && strategy.jitterFactor) {
      const jitter = delay * strategy.jitterFactor;
      delay = delay + (Math.random() * 2 - 1) * jitter;
      delay = Math.max(0, delay);
    }

    return Math.round(delay);
  }

  private fibonacci(n: number): number {
    while (this.fibonacciCache.length <= n) {
      const len = this.fibonacciCache.length;
      this.fibonacciCache.push(
        this.fibonacciCache[len - 1] + this.fibonacciCache[len - 2]
      );
    }
    return this.fibonacciCache[n];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let serviceInstance: RetryStrategiesService | null = null;

export function getRetryService(): RetryStrategiesService {
  if (!serviceInstance) {
    serviceInstance = new RetryStrategiesService();
  }
  return serviceInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Fetch with automatic retry
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  parseResponse?: (response: Response) => Promise<T>
): Promise<RetryResult<T>> {
  return getRetryService().fetchWithRetry(url, options, parseResponse);
}

/**
 * Configure endpoint retry strategy
 */
export function configureEndpointRetry(config: EndpointRetryConfig): void {
  getRetryService().configureEndpoint(config);
}

/**
 * Register custom retry strategy
 */
export function registerRetryStrategy(strategy: RetryStrategy): void {
  getRetryService().registerStrategy(strategy);
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useCallback, useRef } from 'react';

export function useRetry<T>(
  url: string,
  options?: RequestInit,
  strategyId?: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<T | null>(null);
  const [attempts, setAttempts] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const service = getRetryService();

  const execute = useCallback(async (overrideOptions?: RequestInit): Promise<RetryResult<T>> => {
    setIsLoading(true);
    setError(null);
    
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const mergedOptions = {
      ...options,
      ...overrideOptions,
      signal: abortControllerRef.current.signal,
    };

    try {
      const result = await service.fetchWithRetry<T>(
        url,
        mergedOptions,
        async (res) => res.json()
      );

      setAttempts(result.attempts);
      
      if (result.success) {
        setData(result.data || null);
      } else {
        setError(result.errors[result.errors.length - 1]);
      }

      return result;
    } catch (e) {
      setError(e);
      return {
        success: false,
        attempts: 0,
        totalTime: 0,
        errors: [e],
      };
    } finally {
      setIsLoading(false);
    }
  }, [url, options, service]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    execute,
    cancel,
    isLoading,
    error,
    data,
    attempts,
  };
}

export default RetryStrategiesService;
