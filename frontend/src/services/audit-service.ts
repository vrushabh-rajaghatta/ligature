
/**
 * Audit Service - 21 CFR Part 11 Compliant Audit Trail
 * 
 * Central audit logging service for all platform operations.
 * Designed for pharmaceutical regulatory compliance requirements.
 * 
 * Key Features:
 * - Tamper-evident timestamps
 * - Electronic signature capture
 * - Reason codes for changes
 * - Complete change history (before/after)
 * - Exportable audit reports
 * - Retention management
 */

import { currentUser } from '@/data/users-data';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Audit categories map to major platform modules
 */
export type AuditCategory = 
  | 'authoring'
  | 'submissions'
  | 'publishing'
  | 'safety'
  | 'cmc'
  | 'clinical'
  | 'portfolio'
  | 'system'
  | 'workflow';

/**
 * Comprehensive action types across all modules
 */
export type AuditActionType =
  // Authoring
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.approved'
  | 'document.rejected'
  | 'document.versioned'
  | 'section.created'
  | 'section.updated'
  | 'section.deleted'
  | 'ai.generated'
  | 'ai.regenerated'
  | 'ai.draft.accepted'
  | 'ai.draft.discarded'
  // Submissions
  | 'submission.created'
  | 'submission.updated'
  | 'submission.validated'
  | 'submission.submitted'
  | 'submission.acknowledged'
  | 'submission.withdrawn'
  | 'sequence.created'
  | 'sequence.updated'
  | 'sequence.finalized'
  | 'document.assigned'
  | 'document.unassigned'
  // Publishing Workflow
  | 'workflow.created'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.cancelled'
  | 'workflow.step.started'
  | 'workflow.step.completed'
  | 'workflow.step.failed'
  | 'workflow.step.retried'
  | 'pdf.validated'
  | 'hyperlink.detected'
  | 'hyperlink.created'
  | 'hyperlink.validated'
  | 'backbone.generated'
  | 'backbone.validated'
  | 'package.created'
  | 'gateway.submitted'
  | 'gateway.acknowledged'
  // Safety
  | 'icsr.created'
  | 'icsr.updated'
  | 'icsr.submitted'
  | 'icsr.voided'
  | 'signal.detected'
  | 'signal.evaluated'
  | 'signal.closed'
  | 'aggregate.created'
  | 'aggregate.submitted'
  | 'rmp.updated'
  // CMC
  | 'batch.created'
  | 'batch.released'
  | 'batch.rejected'
  | 'stability.created'
  | 'stability.updated'
  | 'deviation.opened'
  | 'deviation.closed'
  | 'specification.updated'
  // Clinical
  | 'study.created'
  | 'study.updated'
  | 'study.activated'
  | 'study.completed'
  | 'protocol.amended'
  | 'site.activated'
  | 'site.closed'
  | 'subject.enrolled'
  | 'subject.completed'
  // Portfolio
  | 'program.created'
  | 'program.updated'
  | 'application.created'
  | 'application.updated'
  | 'milestone.completed'
  // System
  | 'user.login'
  | 'user.logout'
  | 'user.permission.changed'
  | 'settings.changed'
  | 'export.created';

/**
 * 21 CFR Part 11 compliant reason codes
 */
export type ChangeReasonCode =
  | 'correction'        // Correcting an error
  | 'amendment'         // Formal amendment
  | 'update'            // Routine update
  | 'regulatory'        // Regulatory requirement
  | 'safety'            // Safety-related change
  | 'quality'           // Quality improvement
  | 'process'           // Process improvement
  | 'user-request'      // User-initiated change
  | 'system'            // System-initiated change
  | 'migration'         // Data migration
  | 'other';            // Other (requires justification)

/**
 * Severity levels for audit entries
 */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * Electronic signature for Part 11 compliance
 */
export interface ElectronicSignature {
  signedBy: {
    userId: string;
    userName: string;
    email: string;
    role: string;
  };
  signedAt: Date;
  signatureMeaning: 'approval' | 'review' | 'authorship' | 'witness';
  signatureReason?: string;
  // In production, this would be a cryptographic hash
  signatureHash: string;
}

/**
 * Core audit entry structure
 */
export interface AuditEntry {
  // Identity
  id: string;
  correlationId?: string;  // Link related entries (e.g., workflow steps)
  
  // Timing - tamper-evident
  timestamp: Date;
  serverTimestamp?: Date;
  timezone: string;
  
  // Classification
  category: AuditCategory;
  action: AuditActionType;
  severity: AuditSeverity;
  
  // Description
  summary: string;
  details?: string;
  
  // Actor
  actor: {
    userId: string;
    userName: string;
    email: string;
    role: string;
    ipAddress?: string;
    sessionId?: string;
  };
  
  // Target (what was affected)
  target: {
    type: string;           // e.g., 'document', 'submission', 'workflow'
    id: string;
    name: string;
    module?: string;        // Module context
    parentId?: string;      // Parent entity ID
    parentName?: string;
  };
  
  // Change tracking
  changes?: {
    field: string;
    previousValue: unknown;
    newValue: unknown;
    dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  }[];
  
  // 21 CFR Part 11 compliance
  reasonCode?: ChangeReasonCode;
  reasonJustification?: string;
  electronicSignature?: ElectronicSignature;
  
  // Additional context
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Audit query filter
 */
export interface AuditFilter {
  categories?: AuditCategory[];
  actions?: AuditActionType[];
  severities?: AuditSeverity[];
  userIds?: string[];
  targetTypes?: string[];
  targetIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  correlationId?: string;
  searchText?: string;
  hasSignature?: boolean;
  tags?: string[];
}

/**
 * Audit export format
 */
export type AuditExportFormat = 'json' | 'csv' | 'pdf' | 'xml';

/**
 * Audit statistics
 */
export interface AuditStatistics {
  totalEntries: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  byUser: { userId: string; userName: string; count: number }[];
  byDay: { date: string; count: number }[];
  signedEntries: number;
}

// ============================================================================
// AUDIT SERVICE
// ============================================================================

class AuditService {
  private entries: AuditEntry[] = [];
  private listeners: Set<(entry: AuditEntry) => void> = new Set();
  private maxEntries: number = 50000;

  /**
   * Generate tamper-evident entry ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const sequence = this.entries.length.toString(36).padStart(6, '0');
    return `AUD-${timestamp}-${sequence}-${random}`;
  }

  /**
   * Generate correlation ID for related entries
   */
  generateCorrelationId(): string {
    return `COR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate electronic signature hash
   */
  private generateSignatureHash(signature: Omit<ElectronicSignature, 'signatureHash'>): string {
    // In production, this would use proper cryptographic signing
    const data = JSON.stringify({
      userId: signature.signedBy.userId,
      timestamp: signature.signedAt.toISOString(),
      meaning: signature.signatureMeaning,
    });
    // Simple hash for demo - production would use SHA-256 or better
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `SIG-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }

  /**
   * Log an audit entry
   */
  log(params: {
    category: AuditCategory;
    action: AuditActionType;
    severity?: AuditSeverity;
    summary: string;
    details?: string;
    target: AuditEntry['target'];
    changes?: AuditEntry['changes'];
    reasonCode?: ChangeReasonCode;
    reasonJustification?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    correlationId?: string;
    actor?: Partial<AuditEntry['actor']>;
  }): AuditEntry {
    const entry: AuditEntry = {
      id: this.generateId(),
      correlationId: params.correlationId,
      timestamp: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      category: params.category,
      action: params.action,
      severity: params.severity || 'info',
      summary: params.summary,
      details: params.details,
      actor: {
        userId: params.actor?.userId || currentUser.id,
        userName: params.actor?.userName || currentUser.name,
        email: params.actor?.email || currentUser.email,
        role: params.actor?.role || currentUser.role,
        ipAddress: params.actor?.ipAddress,
        sessionId: params.actor?.sessionId,
      },
      target: params.target,
      changes: params.changes,
      reasonCode: params.reasonCode,
      reasonJustification: params.reasonJustification,
      metadata: params.metadata,
      tags: params.tags,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Log with electronic signature (21 CFR Part 11)
   */
  logWithSignature(params: {
    category: AuditCategory;
    action: AuditActionType;
    severity?: AuditSeverity;
    summary: string;
    details?: string;
    target: AuditEntry['target'];
    changes?: AuditEntry['changes'];
    reasonCode?: ChangeReasonCode;
    reasonJustification?: string;
    signatureMeaning: ElectronicSignature['signatureMeaning'];
    signatureReason?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }): AuditEntry {
    const signature: ElectronicSignature = {
      signedBy: {
        userId: currentUser.id,
        userName: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      signedAt: new Date(),
      signatureMeaning: params.signatureMeaning,
      signatureReason: params.signatureReason,
      signatureHash: '', // Will be set below
    };

    signature.signatureHash = this.generateSignatureHash(signature);

    const entry = this.log({
      ...params,
      severity: params.severity || 'critical',
    });

    entry.electronicSignature = signature;
    return entry;
  }

  /**
   * Add entry to store
   */
  private addEntry(entry: AuditEntry): void {
    this.entries.unshift(entry);

    // Enforce max entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Audit listener error:', error);
      }
    });
  }

  // ============================================================================
  // MODULE-SPECIFIC LOGGING HELPERS
  // ============================================================================

  /**
   * Log publishing workflow events
   */
  logWorkflowEvent(params: {
    workflowId: string;
    workflowName: string;
    action: Extract<AuditActionType, `workflow.${string}`>;
    stepId?: string;
    stepName?: string;
    summary: string;
    details?: string;
    correlationId: string;
    metadata?: Record<string, unknown>;
  }): AuditEntry {
    return this.log({
      category: 'workflow',
      action: params.action,
      severity: params.action.includes('failed') ? 'warning' : 'info',
      summary: params.summary,
      details: params.details,
      target: {
        type: 'workflow',
        id: params.workflowId,
        name: params.workflowName,
        parentId: params.stepId,
        parentName: params.stepName,
      },
      correlationId: params.correlationId,
      metadata: params.metadata,
      tags: ['publishing', 'workflow'],
    });
  }

  /**
   * Log submission events
   */
  logSubmissionEvent(params: {
    submissionId: string;
    submissionName: string;
    applicationId: string;
    action: Extract<AuditActionType, `submission.${string}` | `sequence.${string}` | `document.assigned` | `document.unassigned`>;
    summary: string;
    details?: string;
    changes?: AuditEntry['changes'];
    reasonCode?: ChangeReasonCode;
    requiresSignature?: boolean;
    metadata?: Record<string, unknown>;
  }): AuditEntry {
    if (params.requiresSignature) {
      return this.logWithSignature({
        category: 'submissions',
        action: params.action,
        summary: params.summary,
        details: params.details,
        target: {
          type: 'submission',
          id: params.submissionId,
          name: params.submissionName,
          parentId: params.applicationId,
        },
        changes: params.changes,
        reasonCode: params.reasonCode,
        signatureMeaning: 'approval',
        metadata: params.metadata,
      });
    }

    return this.log({
      category: 'submissions',
      action: params.action,
      summary: params.summary,
      details: params.details,
      target: {
        type: 'submission',
        id: params.submissionId,
        name: params.submissionName,
        parentId: params.applicationId,
      },
      changes: params.changes,
      reasonCode: params.reasonCode,
      metadata: params.metadata,
      tags: ['submissions'],
    });
  }

  /**
   * Log safety/pharmacovigilance events
   */
  logSafetyEvent(params: {
    caseId?: string;
    caseName?: string;
    signalId?: string;
    signalName?: string;
    action: Extract<AuditActionType, `icsr.${string}` | `signal.${string}` | `aggregate.${string}` | `rmp.${string}`>;
    summary: string;
    details?: string;
    changes?: AuditEntry['changes'];
    requiresSignature?: boolean;
    metadata?: Record<string, unknown>;
  }): AuditEntry {
    const target = params.caseId 
      ? { type: 'icsr', id: params.caseId, name: params.caseName || 'ICSR' }
      : { type: 'signal', id: params.signalId || '', name: params.signalName || 'Signal' };

    if (params.requiresSignature) {
      return this.logWithSignature({
        category: 'safety',
        action: params.action,
        severity: 'critical',
        summary: params.summary,
        details: params.details,
        target,
        changes: params.changes,
        signatureMeaning: 'review',
        metadata: params.metadata,
      });
    }

    return this.log({
      category: 'safety',
      action: params.action,
      severity: params.action.includes('voided') || params.action.includes('submitted') ? 'critical' : 'info',
      summary: params.summary,
      details: params.details,
      target,
      changes: params.changes,
      metadata: params.metadata,
      tags: ['safety', 'pharmacovigilance'],
    });
  }

  /**
   * Log CMC events
   */
  logCMCEvent(params: {
    entityType: 'batch' | 'stability' | 'deviation' | 'specification';
    entityId: string;
    entityName: string;
    action: Extract<AuditActionType, `batch.${string}` | `stability.${string}` | `deviation.${string}` | `specification.${string}`>;
    summary: string;
    details?: string;
    changes?: AuditEntry['changes'];
    requiresSignature?: boolean;
    metadata?: Record<string, unknown>;
  }): AuditEntry {
    if (params.requiresSignature) {
      return this.logWithSignature({
        category: 'cmc',
        action: params.action,
        summary: params.summary,
        details: params.details,
        target: {
          type: params.entityType,
          id: params.entityId,
          name: params.entityName,
        },
        changes: params.changes,
        signatureMeaning: 'approval',
        metadata: params.metadata,
      });
    }

    return this.log({
      category: 'cmc',
      action: params.action,
      summary: params.summary,
      details: params.details,
      target: {
        type: params.entityType,
        id: params.entityId,
        name: params.entityName,
      },
      changes: params.changes,
      metadata: params.metadata,
      tags: ['cmc', 'manufacturing'],
    });
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get all entries
   */
  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  /**
   * Get entry by ID
   */
  getById(id: string): AuditEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Get entries by correlation ID
   */
  getByCorrelationId(correlationId: string): AuditEntry[] {
    return this.entries.filter(e => e.correlationId === correlationId);
  }

  /**
   * Filter entries
   */
  filter(filter: AuditFilter): AuditEntry[] {
    return this.entries.filter(entry => {
      if (filter.categories?.length && !filter.categories.includes(entry.category)) return false;
      if (filter.actions?.length && !filter.actions.includes(entry.action)) return false;
      if (filter.severities?.length && !filter.severities.includes(entry.severity)) return false;
      if (filter.userIds?.length && !filter.userIds.includes(entry.actor.userId)) return false;
      if (filter.targetTypes?.length && !filter.targetTypes.includes(entry.target.type)) return false;
      if (filter.targetIds?.length && !filter.targetIds.includes(entry.target.id)) return false;
      if (filter.correlationId && entry.correlationId !== filter.correlationId) return false;
      if (filter.dateFrom && entry.timestamp < filter.dateFrom) return false;
      if (filter.dateTo && entry.timestamp > filter.dateTo) return false;
      if (filter.hasSignature !== undefined && !!entry.electronicSignature !== filter.hasSignature) return false;
      if (filter.tags?.length && !filter.tags.some(tag => entry.tags?.includes(tag))) return false;
      if (filter.searchText) {
        const search = filter.searchText.toLowerCase();
        const searchable = [
          entry.summary,
          entry.details,
          entry.target.name,
          entry.actor.userName,
        ].join(' ').toLowerCase();
        if (!searchable.includes(search)) return false;
      }
      return true;
    });
  }

  /**
   * Get entries for a specific target
   */
  getForTarget(targetType: string, targetId: string): AuditEntry[] {
    return this.entries.filter(
      e => e.target.type === targetType && e.target.id === targetId
    );
  }

  /**
   * Get entries for a user
   */
  getForUser(userId: string): AuditEntry[] {
    return this.entries.filter(e => e.actor.userId === userId);
  }

  /**
   * Get recent entries
   */
  getRecent(limit: number = 100): AuditEntry[] {
    return this.entries.slice(0, limit);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get audit statistics
   */
  getStatistics(filter?: AuditFilter): AuditStatistics {
    const entries = filter ? this.filter(filter) : this.entries;

    const byCategory: Record<AuditCategory, number> = {
      authoring: 0,
      submissions: 0,
      publishing: 0,
      safety: 0,
      cmc: 0,
      clinical: 0,
      portfolio: 0,
      system: 0,
      workflow: 0,
    };

    const bySeverity: Record<AuditSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    const userCounts = new Map<string, { userName: string; count: number }>();
    const dayCounts = new Map<string, number>();
    let signedEntries = 0;

    entries.forEach(entry => {
      byCategory[entry.category]++;
      bySeverity[entry.severity]++;

      if (entry.electronicSignature) signedEntries++;

      const userKey = entry.actor.userId;
      if (!userCounts.has(userKey)) {
        userCounts.set(userKey, { userName: entry.actor.userName, count: 0 });
      }
      userCounts.get(userKey)!.count++;

      const dayKey = entry.timestamp.toISOString().split('T')[0];
      dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
    });

    const byUser = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count);

    const byDay = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEntries: entries.length,
      byCategory,
      bySeverity,
      byUser,
      byDay,
      signedEntries,
    };
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  /**
   * Export audit trail
   */
  export(filter?: AuditFilter, format: AuditExportFormat = 'json'): string {
    const entries = filter ? this.filter(filter) : this.entries;
    const exportedAt = new Date().toISOString();

    switch (format) {
      case 'json':
        return JSON.stringify({
          exportedAt,
          exportedBy: currentUser.name,
          filter: filter || null,
          entryCount: entries.length,
          entries: entries.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString(),
          })),
        }, null, 2);

      case 'csv':
        const headers = [
          'ID', 'Timestamp', 'Category', 'Action', 'Severity', 'Summary',
          'User', 'Target Type', 'Target Name', 'Has Signature'
        ].join(',');
        const rows = entries.map(e => [
          e.id,
          e.timestamp.toISOString(),
          e.category,
          e.action,
          e.severity,
          `"${e.summary.replace(/"/g, '""')}"`,
          `"${e.actor.userName}"`,
          e.target.type,
          `"${e.target.name.replace(/"/g, '""')}"`,
          e.electronicSignature ? 'Yes' : 'No',
        ].join(','));
        return [headers, ...rows].join('\n');

      case 'xml':
        const xmlEntries = entries.map(e => `
  <entry>
    <id>${e.id}</id>
    <timestamp>${e.timestamp.toISOString()}</timestamp>
    <category>${e.category}</category>
    <action>${e.action}</action>
    <severity>${e.severity}</severity>
    <summary><![CDATA[${e.summary}]]></summary>
    <actor>
      <userId>${e.actor.userId}</userId>
      <userName>${e.actor.userName}</userName>
    </actor>
    <target>
      <type>${e.target.type}</type>
      <id>${e.target.id}</id>
      <name><![CDATA[${e.target.name}]]></name>
    </target>
    ${e.electronicSignature ? `<signature>
      <signedBy>${e.electronicSignature.signedBy.userName}</signedBy>
      <signedAt>${e.electronicSignature.signedAt.toISOString()}</signedAt>
      <meaning>${e.electronicSignature.signatureMeaning}</meaning>
      <hash>${e.electronicSignature.signatureHash}</hash>
    </signature>` : ''}
  </entry>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<auditTrail>
  <exportedAt>${exportedAt}</exportedAt>
  <exportedBy>${currentUser.name}</exportedBy>
  <entryCount>${entries.length}</entryCount>
  <entries>${xmlEntries}
  </entries>
</auditTrail>`;

      default:
        return this.export(filter, 'json');
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to new audit entries
   */
  subscribe(listener: (entry: AuditEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ============================================================================
  // MANAGEMENT
  // ============================================================================

  /**
   * Clear all entries (for testing only)
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Set max entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    if (this.entries.length > max) {
      this.entries = this.entries.slice(0, max);
    }
  }

  /**
   * Get entry count
   */
  getCount(): number {
    return this.entries.length;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const auditService = new AuditService();
export { AuditService };
