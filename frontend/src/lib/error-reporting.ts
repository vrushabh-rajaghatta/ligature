
/**
 * External Error Reporting Service
 * Provider-agnostic error reporting that integrates with the existing ErrorTracker.
 * 
 * Supports multiple backends:
 * - Sentry (via SENTRY_DSN env var)
 * - Webhook (via ERROR_WEBHOOK_URL env var) 
 * - Console (always active in development)
 * 
 * Usage:
 *   import { initErrorReporting } from '@/lib/error-reporting';
 *   initErrorReporting(); // Call once at app startup
 * 
 * Configuration (env vars):
 *   SENTRY_DSN=https://xxx@sentry.io/yyy         # Enable Sentry
 *   ERROR_WEBHOOK_URL=https://hooks.slack.com/... # Enable webhook alerts
 *   ERROR_REPORTING_ENABLED=true                   # Master switch (default: true)
 *   ERROR_MIN_SEVERITY=high                        # Min severity for external reporting
 * 
 * @version 0.42.35
 */

import { errorTracker, type TrackedError } from '@/lib/monitoring';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorReportingConfig {
  /** Enable/disable all external reporting */
  enabled: boolean;
  /** Minimum severity to report externally */
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  /** Sentry DSN */
  sentryDsn?: string;
  /** Webhook URL for alerts (Slack, Teams, PagerDuty, etc.) */
  webhookUrl?: string;
  /** Environment label */
  environment: string;
  /** App version */
  release?: string;
  /** Rate limit: max reports per minute */
  rateLimitPerMinute: number;
}

interface ErrorReportPayload {
  id: string;
  message: string;
  severity: string;
  category: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  environment: string;
  release?: string;
  context: Record<string, unknown>;
  url?: string;
  userId?: string;
  stack?: string;
}

type ReportingBackend = {
  name: string;
  report: (payload: ErrorReportPayload) => Promise<void>;
};

// =============================================================================
// SEVERITY LEVELS (for filtering)
// =============================================================================

const SEVERITY_LEVELS: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private timestamps: number[] = [];
  private maxPerMinute: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  canProceed(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.timestamps = this.timestamps.filter(t => t > oneMinuteAgo);

    if (this.timestamps.length >= this.maxPerMinute) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}

// =============================================================================
// BACKENDS
// =============================================================================

function createWebhookBackend(webhookUrl: string): ReportingBackend {
  return {
    name: 'webhook',
    report: async (payload: ErrorReportPayload) => {
      try {
        const severityEmoji: Record<string, string> = {
          low: 'ℹ️',
          medium: '⚠️',
          high: '🔴',
          critical: '🚨',
        };

        const body = {
          // Slack-compatible format
          text: `${severityEmoji[payload.severity] || '❓'} *Ligature Error* [${payload.environment}]`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${severityEmoji[payload.severity] || '❓'} ${payload.severity.toUpperCase()} Error`,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Message:*\n${payload.message.slice(0, 200)}` },
                { type: 'mrkdwn', text: `*Category:*\n${payload.category}` },
                { type: 'mrkdwn', text: `*Environment:*\n${payload.environment}` },
                { type: 'mrkdwn', text: `*Occurrences:*\n${payload.count}` },
              ],
            },
            ...(payload.url ? [{
              type: 'section' as const,
              fields: [
                { type: 'mrkdwn' as const, text: `*URL:*\n${payload.url}` },
              ],
            }] : []),
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `ID: ${payload.id} | First seen: ${payload.firstSeen} | Release: ${payload.release || 'unknown'}` },
              ],
            },
          ],
        };

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        logger.error('ErrorReporting', 'Webhook delivery failed', error);
      }
    },
  };
}

function createSentryBackend(dsn: string): ReportingBackend {
  // Sentry Envelope API - lightweight integration without the full SDK
  // This sends events directly to Sentry's envelope endpoint

  const parseDsn = (dsnStr: string) => {
    try {
      const url = new URL(dsnStr);
      const projectId = url.pathname.replace('/', '');
      const publicKey = url.username;
      const host = url.hostname;
      const protocol = url.protocol;
      return {
        endpoint: `${protocol}//${host}/api/${projectId}/envelope/`,
        publicKey,
        projectId,
      };
    } catch {
      return null;
    }
  };

  const parsed = parseDsn(dsn);

  return {
    name: 'sentry',
    report: async (payload: ErrorReportPayload) => {
      if (!parsed) {
        logger.warn('ErrorReporting', 'Invalid Sentry DSN, skipping report');
        return;
      }

      try {
        const eventId = payload.id.replace(/[^a-f0-9]/gi, '').slice(0, 32).padEnd(32, '0');
        const timestamp = Math.floor(new Date(payload.lastSeen).getTime() / 1000);

        const sentryLevel = payload.severity === 'critical' ? 'fatal'
          : payload.severity === 'high' ? 'error'
          : payload.severity === 'medium' ? 'warning'
          : 'info';

        // Sentry envelope format: header\nitem_header\npayload
        const envelopeHeader = JSON.stringify({
          event_id: eventId,
          dsn: dsn,
          sent_at: new Date().toISOString(),
        });

        const itemHeader = JSON.stringify({
          type: 'event',
          content_type: 'application/json',
        });

        const event = JSON.stringify({
          event_id: eventId,
          timestamp,
          platform: 'node',
          level: sentryLevel,
          logger: 'ligature',
          server_name: 'ligature-app',
          release: payload.release,
          environment: payload.environment,
          message: {
            formatted: payload.message,
          },
          tags: {
            category: payload.category,
            severity: payload.severity,
          },
          extra: {
            ...payload.context,
            occurrences: payload.count,
            firstSeen: payload.firstSeen,
          },
          user: payload.userId ? { id: payload.userId } : undefined,
          request: payload.url ? { url: payload.url } : undefined,
          exception: payload.stack ? {
            values: [{
              type: payload.category,
              value: payload.message,
              stacktrace: {
                frames: payload.stack.split('\n').slice(1, 10).map(line => ({
                  function: line.trim(),
                })),
              },
            }],
          } : undefined,
        });

        const envelope = `${envelopeHeader}\n${itemHeader}\n${event}`;

        await fetch(parsed.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-sentry-envelope',
            'X-Sentry-Auth': `Sentry sentry_key=${parsed.publicKey}, sentry_version=7`,
          },
          body: envelope,
        });
      } catch (error) {
        logger.error('ErrorReporting', 'Sentry delivery failed', error);
      }
    },
  };
}

function createConsoleBackend(): ReportingBackend {
  return {
    name: 'console',
    report: async (payload: ErrorReportPayload) => {
      const prefix = `[ErrorReport:${payload.severity.toUpperCase()}]`;
      logger.error('ErrorReporting', `${prefix} ${payload.category}: ${payload.message}`, {
        id: payload.id,
        count: payload.count,
        url: payload.url,
        environment: payload.environment,
      });
    },
  };
}

// =============================================================================
// ERROR REPORTING SERVICE
// =============================================================================

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private backends: ReportingBackend[] = [];
  private rateLimiter: RateLimiter;
  private unsubscribe?: () => void;
  private initialized = false;
  /** Track which error IDs we've already reported to avoid re-reporting on count updates */
  private reportedErrors = new Set<string>();

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? (process.env.ERROR_REPORTING_ENABLED !== 'false'),
      minSeverity: config.minSeverity ?? (process.env.ERROR_MIN_SEVERITY as ErrorReportingConfig['minSeverity']) ?? 'high',
      sentryDsn: config.sentryDsn ?? process.env.SENTRY_DSN,
      webhookUrl: config.webhookUrl ?? process.env.ERROR_WEBHOOK_URL,
      environment: config.environment ?? process.env.NODE_ENV ?? 'development',
      release: config.release ?? process.env.APP_VERSION,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 30,
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
  }

  /**
   * Initialize error reporting - connects to the existing ErrorTracker
   */
  init(): void {
    if (this.initialized) return;
    if (!this.config.enabled) {
      logger.info('ErrorReporting', 'Error reporting disabled');
      return;
    }

    // Register backends based on configuration
    if (this.config.sentryDsn) {
      this.backends.push(createSentryBackend(this.config.sentryDsn));
      logger.info('ErrorReporting', 'Sentry backend enabled');
    }

    if (this.config.webhookUrl) {
      this.backends.push(createWebhookBackend(this.config.webhookUrl));
      logger.info('ErrorReporting', 'Webhook backend enabled');
    }

    // Console backend always active in development
    if (this.config.environment === 'development') {
      this.backends.push(createConsoleBackend());
    }

    if (this.backends.length === 0) {
      logger.info('ErrorReporting', 'No backends configured. Set SENTRY_DSN or ERROR_WEBHOOK_URL to enable.');
      return;
    }

    // Subscribe to the existing ErrorTracker
    this.unsubscribe = errorTracker.onError((error: TrackedError) => {
      this.handleError(error);
    });

    this.initialized = true;
    logger.info('ErrorReporting', `Initialized with ${this.backends.length} backend(s): ${this.backends.map(b => b.name).join(', ')}`);
  }

  /**
   * Handle an error from the ErrorTracker
   */
  private handleError(error: TrackedError): void {
    // Check severity threshold
    const errorLevel = SEVERITY_LEVELS[error.severity] ?? 0;
    const minLevel = SEVERITY_LEVELS[this.config.minSeverity] ?? 2;

    if (errorLevel < minLevel) return;

    // Only report new errors, not updates to existing ones
    if (this.reportedErrors.has(error.id)) return;

    // Rate limit
    if (!this.rateLimiter.canProceed()) {
      logger.warn('ErrorReporting', 'Rate limit exceeded, dropping error report');
      return;
    }

    this.reportedErrors.add(error.id);

    // Keep set from growing unbounded
    if (this.reportedErrors.size > 5000) {
      const entries = Array.from(this.reportedErrors);
      this.reportedErrors = new Set(entries.slice(-2500));
    }

    const payload: ErrorReportPayload = {
      id: error.id,
      message: error.message,
      severity: error.severity,
      category: error.category,
      count: error.count,
      firstSeen: error.firstSeen,
      lastSeen: error.lastSeen,
      environment: this.config.environment,
      release: this.config.release,
      context: error.context,
      url: error.url,
      userId: error.userId,
      stack: error.stack,
    };

    // Send to all backends (fire-and-forget)
    for (const backend of this.backends) {
      backend.report(payload).catch(err => {
        logger.error('ErrorReporting', `Backend ${backend.name} failed`, err);
      });
    }
  }

  /**
   * Manually report an error (bypasses the ErrorTracker)
   */
  report(error: Error | string, context: Record<string, unknown> = {}): void {
    if (!this.config.enabled || this.backends.length === 0) return;

    const payload: ErrorReportPayload = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: typeof error === 'string' ? error : error.message,
      severity: 'high',
      category: 'unknown',
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      environment: this.config.environment,
      release: this.config.release,
      context,
      stack: typeof error === 'string' ? undefined : error.stack,
    };

    for (const backend of this.backends) {
      backend.report(payload).catch(() => {});
    }
  }

  /**
   * Shutdown - unsubscribe from ErrorTracker
   */
  shutdown(): void {
    this.unsubscribe?.();
    this.initialized = false;
    this.backends = [];
    this.reportedErrors.clear();
  }

  /**
   * Get reporting status
   */
  getStatus(): {
    enabled: boolean;
    initialized: boolean;
    backends: string[];
    reportedCount: number;
    config: Pick<ErrorReportingConfig, 'environment' | 'minSeverity' | 'rateLimitPerMinute'>;
  } {
    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      backends: this.backends.map(b => b.name),
      reportedCount: this.reportedErrors.size,
      config: {
        environment: this.config.environment,
        minSeverity: this.config.minSeverity,
        rateLimitPerMinute: this.config.rateLimitPerMinute,
      },
    };
  }
}

// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================

let instance: ErrorReportingService | null = null;

/**
 * Initialize error reporting (call once at app startup)
 * Safe to call multiple times - will only initialize once.
 */
export function initErrorReporting(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
  if (!instance) {
    instance = new ErrorReportingService(config);
    instance.init();
  }
  return instance;
}

/**
 * Get the error reporting instance
 */
export function getErrorReporting(): ErrorReportingService | null {
  return instance;
}

/**
 * Manually report an error to external services
 */
export function reportError(error: Error | string, context?: Record<string, unknown>): void {
  instance?.report(error, context);
}

export { ErrorReportingService };
export type { ErrorReportingConfig, ErrorReportPayload, ReportingBackend };
