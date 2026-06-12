
// =============================================================================
// Security Audit Module
// =============================================================================
// Provides audit logging and correlation ID generation for traceability
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'data_export'
  | 'system_event'
  | 'system'
  | 'integration'
  | 'security';

export type AuditOutcome = 'success' | 'failure' | 'error';

export interface AuditActor {
  userId: string | null;
  serviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

export interface AuditResource {
  type: string;
  id: string;
  name?: string;
}

export interface AuditEntry {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  actor: AuditActor;
  resource?: AuditResource;
  details?: Record<string, unknown>;
  correlationId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'error' | 'critical' | 'high';
  requestId?: string;
}

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

/**
 * Generate a unique correlation ID for tracing operations across services
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an audit entry
 * In production, this would write to a persistent audit log
 */
export async function audit(entry: AuditEntry): Promise<void> {
  const fullEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
    correlationId: entry.correlationId || generateCorrelationId(),
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    /* Audit logged */
  }

  // In production, this would write to:
  // - Database audit table
  // - External SIEM system
  // - Compliance logging service
  
  // For now, we just ensure the function doesn't throw
  return Promise.resolve();
}

/**
 * Create an audit context for a series of related operations
 */
export function createAuditContext(
  category: AuditCategory,
  actor: AuditActor
): {
  correlationId: string;
  logSuccess: (action: string, resource?: AuditResource, details?: Record<string, unknown>) => Promise<void>;
  logFailure: (action: string, resource?: AuditResource, details?: Record<string, unknown>) => Promise<void>;
  logError: (action: string, error: Error, resource?: AuditResource) => Promise<void>;
} {
  const correlationId = generateCorrelationId();

  return {
    correlationId,
    logSuccess: (action, resource, details) =>
      audit({ category, action, outcome: 'success', actor, resource, details, correlationId }),
    logFailure: (action, resource, details) =>
      audit({ category, action, outcome: 'failure', actor, resource, details, correlationId }),
    logError: (action, error, resource) =>
      audit({
        category,
        action,
        outcome: 'error',
        actor,
        resource,
        details: { error: error.message, stack: error.stack },
        correlationId,
      }),
  };
}
