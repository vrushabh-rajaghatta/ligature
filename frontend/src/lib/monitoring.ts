
/**
 * Monitoring & Observability Library
 * Centralized error tracking, metrics collection, and health monitoring
 * 
 * @version 0.15.32
 */

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'api' | 'database' | 'auth' | 'validation' | 'integration' | 'unknown';
export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface TrackedError {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: Record<string, unknown>;
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  resolved: boolean;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
  description?: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  lastChecked: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: HealthCheck[];
}

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

export interface AggregatedMetrics {
  totalRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  byStatusCode: Record<number, number>;
  byPath: Record<string, { count: number; avgLatencyMs: number; errorRate: number }>;
  byMethod: Record<string, number>;
}

// =============================================================================
// ERROR TRACKER
// =============================================================================

class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private maxErrors = 1000;
  private errorHandlers: Array<(error: TrackedError) => void> = [];

  /**
   * Generate fingerprint for error deduplication
   */
  private generateFingerprint(error: Error | string, category: ErrorCategory): string {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? '' : (error.stack?.split('\n')[1] || '');
    return `${category}:${message}:${stack}`.slice(0, 200);
  }

  /**
   * Determine error severity based on context
   */
  private determineSeverity(
    error: Error | string,
    statusCode?: number,
    category?: ErrorCategory
  ): ErrorSeverity {
    // Critical: authentication failures, database down
    if (category === 'database' || category === 'auth') {
      return 'critical';
    }
    
    // High: 5xx errors
    if (statusCode && statusCode >= 500) {
      return 'high';
    }
    
    // Medium: 4xx errors (except 404)
    if (statusCode && statusCode >= 400 && statusCode !== 404) {
      return 'medium';
    }
    
    // Low: validation errors, 404s
    return 'low';
  }

  /**
   * Categorize error based on message and context
   */
  private categorizeError(error: Error | string, context: Record<string, unknown>): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('prisma') || lowerMessage.includes('database') || lowerMessage.includes('sql')) {
      return 'database';
    }
    if (lowerMessage.includes('auth') || lowerMessage.includes('token') || lowerMessage.includes('session')) {
      return 'auth';
    }
    if (lowerMessage.includes('valid') || lowerMessage.includes('required') || lowerMessage.includes('format')) {
      return 'validation';
    }
    if (lowerMessage.includes('fetch') || lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
      return 'integration';
    }
    if (context.url || context.method) {
      return 'api';
    }

    return 'unknown';
  }

  /**
   * Track an error
   */
  track(
    error: Error | string,
    context: Record<string, unknown> = {}
  ): TrackedError {
    const category = this.categorizeError(error, context);
    const fingerprint = this.generateFingerprint(error, category);
    const now = new Date().toISOString();

    // Check for existing error with same fingerprint
    const existing = this.errors.get(fingerprint);
    
    if (existing) {
      // Update existing error
      existing.count++;
      existing.lastSeen = now;
      existing.context = { ...existing.context, ...context };
      
      // Notify handlers
      this.notifyHandlers(existing);
      
      return existing;
    }

    // Create new tracked error
    const trackedError: TrackedError = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      severity: this.determineSeverity(
        error,
        context.statusCode as number | undefined,
        category
      ),
      category,
      context,
      userId: context.userId as string | undefined,
      requestId: context.requestId as string | undefined,
      url: context.url as string | undefined,
      method: context.method as string | undefined,
      statusCode: context.statusCode as number | undefined,
      resolved: false,
      count: 1,
      firstSeen: now,
      lastSeen: now,
    };

    // Enforce max errors limit
    if (this.errors.size >= this.maxErrors) {
      // Remove oldest error
      const oldest = Array.from(this.errors.entries())
        .sort((a, b) => a[1].lastSeen.localeCompare(b[1].lastSeen))[0];
      if (oldest) {
        this.errors.delete(oldest[0]);
      }
    }

    this.errors.set(fingerprint, trackedError);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorTracker] ${trackedError.severity.toUpperCase()}: ${trackedError.message}`, context);
    }

    // Notify handlers
    this.notifyHandlers(trackedError);

    return trackedError;
  }

  /**
   * Register error handler
   */
  onError(handler: (error: TrackedError) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  private notifyHandlers(error: TrackedError): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        console.error('[ErrorTracker] Handler error:', e);
      }
    }
  }

  /**
   * Get all tracked errors
   */
  getErrors(options?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    resolved?: boolean;
    limit?: number;
  }): TrackedError[] {
    let errors = Array.from(this.errors.values());

    if (options?.severity) {
      errors = errors.filter(e => e.severity === options.severity);
    }
    if (options?.category) {
      errors = errors.filter(e => e.category === options.category);
    }
    if (options?.resolved !== undefined) {
      errors = errors.filter(e => e.resolved === options.resolved);
    }

    // Sort by lastSeen descending
    errors.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

    if (options?.limit) {
      errors = errors.slice(0, options.limit);
    }

    return errors;
  }

  /**
   * Mark error as resolved
   */
  resolve(errorId: string): boolean {
    for (const error of Array.from(this.errors.values())) {
      if (error.id === errorId) {
        error.resolved = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    unresolvedCount: number;
    last24Hours: number;
  } {
    const errors = Array.from(this.errors.values());
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    return {
      total: errors.length,
      bySeverity: {
        low: errors.filter(e => e.severity === 'low').length,
        medium: errors.filter(e => e.severity === 'medium').length,
        high: errors.filter(e => e.severity === 'high').length,
        critical: errors.filter(e => e.severity === 'critical').length,
      },
      byCategory: {
        api: errors.filter(e => e.category === 'api').length,
        database: errors.filter(e => e.category === 'database').length,
        auth: errors.filter(e => e.category === 'auth').length,
        validation: errors.filter(e => e.category === 'validation').length,
        integration: errors.filter(e => e.category === 'integration').length,
        unknown: errors.filter(e => e.category === 'unknown').length,
      },
      unresolvedCount: errors.filter(e => !e.resolved).length,
      last24Hours: errors.filter(e => e.lastSeen >= oneDayAgo).length,
    };
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors.clear();
  }
}

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

class MetricsCollector {
  private counters: Map<string, { value: number; labels: Record<string, string> }> = new Map();
  private gauges: Map<string, { value: number; labels: Record<string, string> }> = new Map();
  private histograms: Map<string, { values: number[]; labels: Record<string, string> }> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private maxRequestMetrics = 10000;
  private startTime = Date.now();

  /**
   * Generate metric key from name and labels
   */
  private getKey(name: string, labels: Record<string, string> = {}): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { value, labels });
    }
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { value, labels });
  }

  /**
   * Observe a histogram value
   */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key);
    
    if (existing) {
      existing.values.push(value);
      // Keep only last 1000 values
      if (existing.values.length > 1000) {
        existing.values.shift();
      }
    } else {
      this.histograms.set(key, { values: [value], labels });
    }
  }

  /**
   * Record a request
   */
  recordRequest(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);
    
    // Enforce limit
    if (this.requestMetrics.length > this.maxRequestMetrics) {
      this.requestMetrics.shift();
    }

    // Update counters
    this.increment('http_requests_total', {
      method: metrics.method,
      path: this.normalizePath(metrics.path),
      status: String(metrics.statusCode),
    });

    // Update latency histogram
    this.observe('http_request_duration_ms', metrics.durationMs, {
      method: metrics.method,
      path: this.normalizePath(metrics.path),
    });

    // Update error counter
    if (metrics.statusCode >= 400) {
      this.increment('http_errors_total', {
        method: metrics.method,
        path: this.normalizePath(metrics.path),
        status: String(metrics.statusCode),
      });
    }
  }

  /**
   * Normalize path by replacing IDs with placeholders
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get aggregated request metrics
   */
  getAggregatedMetrics(windowMs = 3600000): AggregatedMetrics {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const recent = this.requestMetrics.filter(m => m.timestamp >= cutoff);

    if (recent.length === 0) {
      return {
        totalRequests: 0,
        errorRate: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        requestsPerSecond: 0,
        byStatusCode: {},
        byPath: {},
        byMethod: {},
      };
    }

    const latencies = recent.map(m => m.durationMs).sort((a, b) => a - b);
    const errors = recent.filter(m => m.statusCode >= 400).length;

    // Group by status code
    const byStatusCode: Record<number, number> = {};
    for (const m of recent) {
      byStatusCode[m.statusCode] = (byStatusCode[m.statusCode] || 0) + 1;
    }

    // Group by path
    const byPath: Record<string, { count: number; totalLatency: number; errors: number }> = {};
    for (const m of recent) {
      const normalizedPath = this.normalizePath(m.path);
      if (!byPath[normalizedPath]) {
        byPath[normalizedPath] = { count: 0, totalLatency: 0, errors: 0 };
      }
      byPath[normalizedPath].count++;
      byPath[normalizedPath].totalLatency += m.durationMs;
      if (m.statusCode >= 400) {
        byPath[normalizedPath].errors++;
      }
    }

    const byPathFormatted: Record<string, { count: number; avgLatencyMs: number; errorRate: number }> = {};
    for (const [path, data] of Object.entries(byPath)) {
      byPathFormatted[path] = {
        count: data.count,
        avgLatencyMs: Math.round(data.totalLatency / data.count),
        errorRate: data.errors / data.count,
      };
    }

    // Group by method
    const byMethod: Record<string, number> = {};
    for (const m of recent) {
      byMethod[m.method] = (byMethod[m.method] || 0) + 1;
    }

    const totalLatency = latencies.reduce((sum, l) => sum + l, 0);

    return {
      totalRequests: recent.length,
      errorRate: errors / recent.length,
      avgLatencyMs: Math.round(totalLatency / recent.length),
      p50LatencyMs: this.percentile(latencies, 50),
      p95LatencyMs: this.percentile(latencies, 95),
      p99LatencyMs: this.percentile(latencies, 99),
      requestsPerSecond: recent.length / (windowMs / 1000),
      byStatusCode,
      byPath: byPathFormatted,
      byMethod,
    };
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Add uptime gauge
    lines.push('# HELP ligature_uptime_seconds Application uptime in seconds');
    lines.push('# TYPE ligature_uptime_seconds gauge');
    lines.push(`ligature_uptime_seconds ${this.getUptime()}`);

    // Add counters
    for (const [key, data] of Array.from(this.counters)) {
      const match = key.match(/^([^{]+)({.*})?$/);
      if (match) {
        const name = match[1];
        const labels = match[2] || '';
        lines.push(`${name}${labels} ${data.value}`);
      }
    }

    // Add gauges
    for (const [key, data] of Array.from(this.gauges)) {
      const match = key.match(/^([^{]+)({.*})?$/);
      if (match) {
        const name = match[1];
        const labels = match[2] || '';
        lines.push(`${name}${labels} ${data.value}`);
      }
    }

    // Add histogram summaries
    for (const [key, data] of Array.from(this.histograms)) {
      const match = key.match(/^([^{]+)({.*})?$/);
      if (match && data.values.length > 0) {
        const name = match[1];
        const labels = match[2] || '';
        const sorted = [...data.values].sort((a, b) => a - b);
        const sum = data.values.reduce((a, b) => a + b, 0);
        
        lines.push(`${name}_sum${labels} ${sum}`);
        lines.push(`${name}_count${labels} ${data.values.length}`);
        lines.push(`${name}{quantile="0.5"${labels.slice(1) || '}'} ${this.percentile(sorted, 50)}`);
        lines.push(`${name}{quantile="0.95"${labels.slice(1) || '}'} ${this.percentile(sorted, 95)}`);
        lines.push(`${name}{quantile="0.99"${labels.slice(1) || '}'} ${this.percentile(sorted, 99)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get all metrics as JSON
   */
  toJSON(): {
    counters: Array<{ name: string; value: number; labels: Record<string, string> }>;
    gauges: Array<{ name: string; value: number; labels: Record<string, string> }>;
    histograms: Array<{ name: string; count: number; sum: number; p50: number; p95: number; p99: number; labels: Record<string, string> }>;
  } {
    const counters = Array.from(this.counters.entries()).map(([key, data]) => {
      const match = key.match(/^([^{]+)/);
      return {
        name: match ? match[1] : key,
        value: data.value,
        labels: data.labels,
      };
    });

    const gauges = Array.from(this.gauges.entries()).map(([key, data]) => {
      const match = key.match(/^([^{]+)/);
      return {
        name: match ? match[1] : key,
        value: data.value,
        labels: data.labels,
      };
    });

    const histograms = Array.from(this.histograms.entries()).map(([key, data]) => {
      const match = key.match(/^([^{]+)/);
      const sorted = [...data.values].sort((a, b) => a - b);
      return {
        name: match ? match[1] : key,
        count: data.values.length,
        sum: data.values.reduce((a, b) => a + b, 0),
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
        labels: data.labels,
      };
    });

    return { counters, gauges, histograms };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.requestMetrics = [];
  }
}

// =============================================================================
// HEALTH CHECKER
// =============================================================================

export type HealthCheckFn = () => Promise<{ healthy: boolean; message?: string }>;

class HealthChecker {
  private checks: Map<string, HealthCheckFn> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();

  /**
   * Register a health check
   */
  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
    this.lastResults.delete(name);
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<HealthStatus> {
    const results: HealthCheck[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of Array.from(this.checks)) {
      const start = Date.now();
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message: string | undefined;

      try {
        const result = await Promise.race([
          check(),
          new Promise<{ healthy: boolean; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          ),
        ]);

        status = result.healthy ? 'healthy' : 'unhealthy';
        message = result.message;
      } catch (error) {
        status = 'unhealthy';
        message = error instanceof Error ? error.message : 'Unknown error';
      }

      const latencyMs = Date.now() - start;
      const healthCheck: HealthCheck = {
        name,
        status,
        latencyMs,
        message,
        lastChecked: new Date().toISOString(),
      };

      results.push(healthCheck);
      this.lastResults.set(name, healthCheck);

      // Update overall status based on healthCheck.status
      const checkStatus = healthCheck.status;
      if (checkStatus === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (checkStatus === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded';
      }
    }

    // Import version dynamically to avoid circular dependency
    let version = '0.15.32';
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const versionModule = require('@/config/version');
      version = versionModule.APP_VERSION;
    } catch {
      // Use default
    }

    return {
      status: overallStatus,
      version,
      uptime: metricsCollector.getUptime(),
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }

  /**
   * Get last health check results
   */
  getLastResults(): HealthCheck[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * Quick liveness check (is app running?)
   */
  async isLive(): Promise<boolean> {
    return true;
  }

  /**
   * Readiness check (is app ready to serve traffic?)
   */
  async isReady(): Promise<boolean> {
    const status = await this.runAll();
    return status.status !== 'unhealthy';
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

export const errorTracker = new ErrorTracker();
export const metricsCollector = new MetricsCollector();
export const healthChecker = new HealthChecker();

// =============================================================================
// DEFAULT HEALTH CHECKS
// =============================================================================

// Database health check
healthChecker.register('database', async () => {
  try {
    // Try to import and use prisma
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: prisma } = require('@/lib/db/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
});

// Memory health check
healthChecker.register('memory', async () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    if (usagePercent > 90) {
      return { healthy: false, message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
    }
    if (usagePercent > 75) {
      return { healthy: true, message: `Memory usage elevated: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
    }
    return { healthy: true, message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
  }
  return { healthy: true };
});

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Wrap an API handler with monitoring
 */
export function withMonitoring<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  options?: { name?: string }
): T {
  return (async (...args: unknown[]) => {
    const start = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    try {
      const response = await handler(...args);
      
      // Record metrics
      const request = args[0] as Request;
      if (request?.url) {
        const url = new URL(request.url);
        metricsCollector.recordRequest({
          path: url.pathname,
          method: request.method || 'GET',
          statusCode: response.status,
          durationMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      // Track error
      const request = args[0] as Request;
      const url = request?.url ? new URL(request.url) : null;
      
      errorTracker.track(error instanceof Error ? error : String(error), {
        requestId,
        url: url?.pathname,
        method: request?.method,
        handlerName: options?.name,
      });

      // Record error metrics
      if (url) {
        metricsCollector.recordRequest({
          path: url.pathname,
          method: request?.method || 'GET',
          statusCode: 500,
          durationMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      }

      throw error;
    }
  }) as T;
}

/**
 * Track an error from anywhere in the app
 */
export function trackError(
  error: Error | string,
  context?: Record<string, unknown>
): TrackedError {
  return errorTracker.track(error, context);
}

/**
 * Record custom metric
 */
export function recordMetric(
  type: 'counter' | 'gauge' | 'histogram',
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  switch (type) {
    case 'counter':
      metricsCollector.increment(name, labels, value);
      break;
    case 'gauge':
      metricsCollector.gauge(name, value, labels);
      break;
    case 'histogram':
      metricsCollector.observe(name, value, labels);
      break;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ErrorTracker,
  MetricsCollector,
  HealthChecker,
};

export default {
  errorTracker,
  metricsCollector,
  healthChecker,
  trackError,
  recordMetric,
  withMonitoring,
};
