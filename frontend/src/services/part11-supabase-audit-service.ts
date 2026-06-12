

/**
 * Part 11 Supabase Audit Service
 * 
 * 21 CFR Part 11 compliant audit trail service that persists to Supabase.
 * Features tamper-evident checksums, electronic signatures, and immutable records.
 * 
 * Compliance Features:
 * - Tamper-evident checksums with chain validation
 * - Electronic signatures with cryptographic hashing
 * - Immutable audit records (enforced by database triggers)
 * - Complete before/after state capture
 * - Comprehensive reason codes
 * - Exportable audit reports
 * 
 * @module services/part11-supabase-audit-service
 * @version 0.27.79
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { currentUser } from '@/data/users-data';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Audit categories matching database enum
 */
export type Part11AuditCategory =
  | 'authoring'
  | 'submissions'
  | 'publishing'
  | 'safety'
  | 'cmc'
  | 'clinical'
  | 'ctms'
  | 'tmf'
  | 'quality'
  | 'haq'
  | 'portfolio'
  | 'edc'
  | 'eln'
  | 'glp'
  | 'system'
  | 'workflow'
  | 'authentication';

/**
 * Audit severity levels
 */
export type Part11AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * 21 CFR Part 11 compliant change reason codes
 */
export type Part11ChangeReasonCode =
  | 'correction'
  | 'amendment'
  | 'update'
  | 'regulatory'
  | 'safety'
  | 'quality'
  | 'process'
  | 'user-request'
  | 'system'
  | 'migration'
  | 'other';

/**
 * Electronic signature meaning types
 */
export type SignatureMeaning =
  | 'approval'
  | 'rejection'
  | 'review'
  | 'authorship'
  | 'witness'
  | 'verification';

/**
 * Actor information for audit entries
 */
export interface AuditActor {
  userId: string;
  userName: string;
  email: string;
  role: string;
  ipAddress?: string;
  sessionId?: string;
  userAgent?: string;
}

/**
 * Target entity information
 */
export interface AuditTarget {
  type: string;
  id: string;
  name: string;
  module?: string;
  parentId?: string;
  parentName?: string;
}

/**
 * Field-level change tracking
 */
export interface FieldChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

/**
 * Part 11 audit entry
 */
export interface Part11AuditEntry {
  id: string;
  sequenceNumber: number;
  organizationId: string;
  correlationId?: string;
  
  // Timestamps
  clientTimestamp: Date;
  serverTimestamp: Date;
  timezone: string;
  
  // Classification
  category: Part11AuditCategory;
  action: string;
  severity: Part11AuditSeverity;
  
  // Description
  summary: string;
  details?: string;
  
  // Actor
  actor: AuditActor;
  
  // Target
  target: AuditTarget;
  
  // State capture
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changes?: FieldChange[];
  
  // Compliance fields
  reasonCode?: Part11ChangeReasonCode;
  reasonJustification?: string;
  
  // Tamper detection
  entryChecksum: string;
  previousChecksum?: string;
  chainValid: boolean;
  
  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
  
  // Signatures (populated via join)
  signatures?: ElectronicSignature[];
}

/**
 * Electronic signature
 */
export interface ElectronicSignature {
  id: string;
  auditEntryId: string;
  signer: {
    userId: string;
    userName: string;
    email: string;
    role: string;
    title?: string;
  };
  meaning: SignatureMeaning;
  reason?: string;
  authenticationMethod: string;
  signatureHash: string;
  signedContentHash: string;
  signedAt: Date;
  isValid: boolean;
  invalidatedAt?: Date;
  invalidationReason?: string;
}

/**
 * Create audit entry input
 */
export interface CreateAuditEntryInput {
  category: Part11AuditCategory;
  action: string;
  summary: string;
  details?: string;
  severity?: Part11AuditSeverity;
  
  target: AuditTarget;
  
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changes?: FieldChange[];
  
  reasonCode?: Part11ChangeReasonCode;
  reasonJustification?: string;
  
  correlationId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Sign audit entry input
 */
export interface SignAuditEntryInput {
  auditEntryId: string;
  meaning: SignatureMeaning;
  reason?: string;
  authenticationMethod?: string;
}

/**
 * Audit filter
 */
export interface Part11AuditFilter {
  categories?: Part11AuditCategory[];
  actions?: string[];
  severities?: Part11AuditSeverity[];
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
 * Chain validation result
 */
export interface ChainValidationResult {
  isValid: boolean;
  totalEntries: number;
  brokenLinks: {
    entryId: string;
    sequenceNumber: number;
    expectedChecksum: string;
    actualChecksum: string;
  }[];
}

/**
 * Audit statistics
 */
export interface Part11AuditStatistics {
  totalEntries: number;
  entries24h: number;
  entries7d: number;
  criticalCount: number;
  uniqueActors: number;
  earliestEntry: Date | null;
  latestEntry: Date | null;
  byCategory: Record<Part11AuditCategory, number>;
  bySeverity: Record<Part11AuditSeverity, number>;
  signatureCount: number;
}

// =============================================================================
// DATABASE RESPONSE TYPES
// =============================================================================

interface DbAuditEntry {
  id: string;
  sequence_number: number;
  organization_id: string;
  correlation_id: string | null;
  client_timestamp: string;
  server_timestamp: string;
  timezone: string;
  category: string;
  action: string;
  severity: string;
  summary: string;
  details: string | null;
  actor_user_id: string;
  actor_user_name: string;
  actor_email: string;
  actor_role: string;
  actor_ip_address: string | null;
  actor_session_id: string | null;
  actor_user_agent: string | null;
  target_type: string;
  target_id: string;
  target_name: string;
  target_module: string | null;
  target_parent_id: string | null;
  target_parent_name: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  changes: FieldChange[] | null;
  reason_code: string | null;
  reason_justification: string | null;
  entry_checksum: string;
  previous_checksum: string | null;
  chain_valid: boolean;
  metadata: Record<string, unknown>;
  tags: string[];
}

// Supabase realtime payload type
interface RealtimePostgresPayload<T> {
  new: T;
  old: T | Record<string, never>;
}

interface DbSignature {
  id: string;
  audit_entry_id: string;
  signer_user_id: string;
  signer_user_name: string;
  signer_email: string;
  signer_role: string;
  signer_title: string | null;
  meaning: string;
  reason: string | null;
  authentication_method: string;
  signature_hash: string;
  signed_content_hash: string;
  signed_at: string;
  is_valid: boolean;
  invalidated_at: string | null;
  invalidation_reason: string | null;
}

// =============================================================================
// PART 11 AUDIT SERVICE
// =============================================================================

class Part11SupabaseAuditService {
  private supabase = getSupabaseBrowserClient();
  private organizationId: string | null = null;
  private isInitialized = false;
  private offlineQueue: CreateAuditEntryInput[] = [];
  private listeners: Set<(entry: Part11AuditEntry) => void> = new Set();

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the audit service with organization context
   */
  async initialize(organizationId: string): Promise<boolean> {
    this.organizationId = organizationId;

    if (!isSupabaseConfigured() || !this.supabase) {
      logger.warn('Part11Audit', 'Supabase not configured - running in offline mode');
      this.isInitialized = true;
      return false;
    }

    // Subscribe to real-time audit notifications
    await this.setupRealtimeSubscription();

    this.isInitialized = true;
    logger.debug('Part11Audit', `Initialized for org: ${organizationId}`);

    // Sync any offline entries
    await this.syncOfflineEntries();

    return true;
  }

  /**
   * Setup real-time subscription for audit entries
   */
  private async setupRealtimeSubscription(): Promise<void> {
    if (!this.supabase || !this.organizationId) return;

    this.supabase
      .channel('part11-audit')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'part11_audit_trail',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload: RealtimePostgresPayload<DbAuditEntry>) => {
          const entry = this.dbEntryToLocal(payload.new as DbAuditEntry);
          this.notifyListeners(entry);
        }
      )
      .subscribe();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.supabase) {
      await this.supabase.removeAllChannels();
    }
    this.listeners.clear();
    this.isInitialized = false;
    this.organizationId = null;
  }

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  /**
   * Log an audit entry
   */
  async log(input: CreateAuditEntryInput): Promise<string | null> {
    if (!this.isInitialized) {
      logger.warn('Part11Audit', 'Service not initialized');
      return null;
    }

    // Build actor from current user
    const actor: AuditActor = {
      userId: currentUser.id,
      userName: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    };

    if (!this.supabase || !this.organizationId) {
      // Queue for offline sync
      this.offlineQueue.push(input);
      logger.debug('Part11Audit', 'Queued entry for offline sync');
      return `offline-${Date.now()}`;
    }

    try {
      const { data, error } = await this.supabase.rpc('log_audit_entry', {
        p_org_id: this.organizationId,
        p_category: input.category,
        p_action: input.action,
        p_summary: input.summary,
        p_actor_user_id: actor.userId,
        p_actor_user_name: actor.userName,
        p_actor_email: actor.email,
        p_actor_role: actor.role,
        p_target_type: input.target.type,
        p_target_id: input.target.id,
        p_target_name: input.target.name,
        p_client_timestamp: new Date().toISOString(),
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        p_severity: input.severity || 'info',
        p_details: input.details || null,
        p_target_module: input.target.module || null,
        p_previous_state: input.previousState || null,
        p_new_state: input.newState || null,
        p_changes: input.changes || null,
        p_reason_code: input.reasonCode || null,
        p_reason_justification: input.reasonJustification || null,
        p_correlation_id: input.correlationId || null,
        p_actor_ip: actor.ipAddress || null,
        p_actor_session: actor.sessionId || null,
        p_metadata: input.metadata || {},
        p_tags: input.tags || [],
      });

      if (error) {
        logger.error('Part11Audit', 'Failed to log entry', error);
        this.offlineQueue.push(input);
        return null;
      }

      return data as string;
    } catch (err) {
      logger.error('Part11Audit', 'Log error', err);
      this.offlineQueue.push(input);
      return null;
    }
  }

  /**
   * Quick log helper for common actions
   */
  async quickLog(
    category: Part11AuditCategory,
    action: string,
    summary: string,
    targetType: string,
    targetId: string,
    targetName: string,
    options?: {
      severity?: Part11AuditSeverity;
      details?: string;
      previousState?: Record<string, unknown>;
      newState?: Record<string, unknown>;
      reasonCode?: Part11ChangeReasonCode;
      correlationId?: string;
    }
  ): Promise<string | null> {
    return this.log({
      category,
      action,
      summary,
      target: { type: targetType, id: targetId, name: targetName },
      ...options,
    });
  }

  // ===========================================================================
  // ELECTRONIC SIGNATURES
  // ===========================================================================

  /**
   * Apply electronic signature to an audit entry
   */
  async sign(input: SignAuditEntryInput): Promise<string | null> {
    if (!this.supabase || !this.organizationId) {
      logger.warn('Part11Audit', 'Cannot sign - not connected');
      return null;
    }

    try {
      const { data, error } = await this.supabase.rpc('sign_audit_entry', {
        p_audit_entry_id: input.auditEntryId,
        p_signer_user_id: currentUser.id,
        p_signer_user_name: currentUser.name,
        p_signer_email: currentUser.email,
        p_signer_role: currentUser.role,
        p_meaning: input.meaning,
        p_reason: input.reason || null,
        p_authentication_method: input.authenticationMethod || 'password',
        p_signer_title: (currentUser as { title?: string }).title || null,
      });

      if (error) {
        logger.error('Part11Audit', 'Failed to sign entry', error);
        return null;
      }

      return data as string;
    } catch (err) {
      logger.error('Part11Audit', 'Sign error', err);
      return null;
    }
  }

  /**
   * Get signatures for an audit entry
   */
  async getSignatures(auditEntryId: string): Promise<ElectronicSignature[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('electronic_signatures')
      .select('*')
      .eq('audit_entry_id', auditEntryId)
      .order('signed_at', { ascending: true });

    if (error || !data) return [];

    return data.map((sig: DbSignature) => this.dbSignatureToLocal(sig));
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get audit entry by ID
   */
  async getById(id: string): Promise<Part11AuditEntry | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('part11_audit_trail')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const entry = this.dbEntryToLocal(data);

    // Fetch signatures
    entry.signatures = await this.getSignatures(id);

    return entry;
  }

  /**
   * Get recent audit entries
   */
  async getRecent(limit = 100): Promise<Part11AuditEntry[]> {
    if (!this.supabase || !this.organizationId) return [];

    const { data, error } = await this.supabase
      .from('part11_audit_trail')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('server_timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((entry: DbAuditEntry) => this.dbEntryToLocal(entry));
  }

  /**
   * Get entries for a specific target
   */
  async getForTarget(targetType: string, targetId: string): Promise<Part11AuditEntry[]> {
    if (!this.supabase || !this.organizationId) return [];

    const { data, error } = await this.supabase
      .from('part11_audit_trail')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('server_timestamp', { ascending: false });

    if (error || !data) return [];

    return data.map((entry: DbAuditEntry) => this.dbEntryToLocal(entry));
  }

  /**
   * Get entries by correlation ID
   */
  async getByCorrelation(correlationId: string): Promise<Part11AuditEntry[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('part11_audit_trail')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('server_timestamp', { ascending: true });

    if (error || !data) return [];

    return data.map((entry: DbAuditEntry) => this.dbEntryToLocal(entry));
  }

  /**
   * Filter audit entries
   */
  async filter(filter: Part11AuditFilter): Promise<Part11AuditEntry[]> {
    if (!this.supabase || !this.organizationId) return [];

    let query = this.supabase
      .from('part11_audit_trail')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (filter.categories?.length) {
      query = query.in('category', filter.categories);
    }

    if (filter.actions?.length) {
      query = query.in('action', filter.actions);
    }

    if (filter.severities?.length) {
      query = query.in('severity', filter.severities);
    }

    if (filter.userIds?.length) {
      query = query.in('actor_user_id', filter.userIds);
    }

    if (filter.targetTypes?.length) {
      query = query.in('target_type', filter.targetTypes);
    }

    if (filter.targetIds?.length) {
      query = query.in('target_id', filter.targetIds);
    }

    if (filter.correlationId) {
      query = query.eq('correlation_id', filter.correlationId);
    }

    if (filter.dateFrom) {
      query = query.gte('server_timestamp', filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query = query.lte('server_timestamp', filter.dateTo.toISOString());
    }

    if (filter.tags?.length) {
      query = query.contains('tags', filter.tags);
    }

    if (filter.searchText) {
      query = query.or(
        `summary.ilike.%${filter.searchText}%,details.ilike.%${filter.searchText}%`
      );
    }

    const { data, error } = await query.order('server_timestamp', { ascending: false });

    if (error || !data) return [];

    return data.map((entry: DbAuditEntry) => this.dbEntryToLocal(entry));
  }

  // ===========================================================================
  // CHAIN VALIDATION
  // ===========================================================================

  /**
   * Validate the audit trail chain integrity
   */
  async validateChain(): Promise<ChainValidationResult> {
    if (!this.supabase || !this.organizationId) {
      return { isValid: true, totalEntries: 0, brokenLinks: [] };
    }

    try {
      const { data, error } = await this.supabase.rpc('validate_audit_chain', {
        p_org_id: this.organizationId,
      });

      if (error) {
        logger.error('Part11Audit', 'Chain validation error', error);
        return { isValid: false, totalEntries: 0, brokenLinks: [] };
      }

      const brokenLinks = (data || []) as {
        entry_id: string;
        sequence_number: number;
        expected_checksum: string;
        actual_checksum: string;
      }[];

      // Get total count
      const { count } = await this.supabase
        .from('part11_audit_trail')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', this.organizationId);

      return {
        isValid: brokenLinks.length === 0,
        totalEntries: count || 0,
        brokenLinks: brokenLinks.map((link) => ({
          entryId: link.entry_id,
          sequenceNumber: link.sequence_number,
          expectedChecksum: link.expected_checksum,
          actualChecksum: link.actual_checksum,
        })),
      };
    } catch (err) {
      logger.error('Part11Audit', 'Chain validation exception', err);
      return { isValid: false, totalEntries: 0, brokenLinks: [] };
    }
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<Part11AuditStatistics | null> {
    if (!this.supabase || !this.organizationId) return null;

    const { data, error } = await this.supabase
      .from('v_audit_statistics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) return null;

    // Get category breakdown
    const categoryStats = await this.getCategoryBreakdown();
    const severityStats = await this.getSeverityBreakdown();
    const signatureCount = await this.getSignatureCount();

    return {
      totalEntries: data.total_entries,
      entries24h: data.entries_24h,
      entries7d: data.entries_7d,
      criticalCount: data.critical_count,
      uniqueActors: data.unique_actors,
      earliestEntry: data.earliest_entry ? new Date(data.earliest_entry) : null,
      latestEntry: data.latest_entry ? new Date(data.latest_entry) : null,
      byCategory: categoryStats,
      bySeverity: severityStats,
      signatureCount,
    };
  }

  private async getCategoryBreakdown(): Promise<Record<Part11AuditCategory, number>> {
    const result: Record<Part11AuditCategory, number> = {
      authoring: 0, submissions: 0, publishing: 0, safety: 0, cmc: 0,
      clinical: 0, ctms: 0, tmf: 0, quality: 0, haq: 0, portfolio: 0,
      edc: 0, eln: 0, glp: 0, system: 0, workflow: 0, authentication: 0,
    };

    if (!this.supabase || !this.organizationId) return result;

    const { data } = await this.supabase
      .from('part11_audit_trail')
      .select('category')
      .eq('organization_id', this.organizationId);

    if (data) {
      data.forEach((row: { category: string }) => {
        const cat = row.category as Part11AuditCategory;
        if (cat in result) result[cat]++;
      });
    }

    return result;
  }

  private async getSeverityBreakdown(): Promise<Record<Part11AuditSeverity, number>> {
    const result: Record<Part11AuditSeverity, number> = {
      info: 0, warning: 0, critical: 0,
    };

    if (!this.supabase || !this.organizationId) return result;

    const { data } = await this.supabase
      .from('part11_audit_trail')
      .select('severity')
      .eq('organization_id', this.organizationId);

    if (data) {
      data.forEach((row: { severity: string }) => {
        const sev = row.severity as Part11AuditSeverity;
        if (sev in result) result[sev]++;
      });
    }

    return result;
  }

  private async getSignatureCount(): Promise<number> {
    if (!this.supabase || !this.organizationId) return 0;

    const { count } = await this.supabase
      .from('electronic_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', this.organizationId)
      .eq('is_valid', true);

    return count || 0;
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Export audit trail as JSON
   */
  async exportJSON(filter?: Part11AuditFilter): Promise<string> {
    const entries = filter ? await this.filter(filter) : await this.getRecent(10000);

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      organizationId: this.organizationId,
      filter: filter || null,
      entryCount: entries.length,
      entries: entries,
    }, null, 2);
  }

  /**
   * Export audit trail as CSV
   */
  async exportCSV(filter?: Part11AuditFilter): Promise<string> {
    const entries = filter ? await this.filter(filter) : await this.getRecent(10000);

    const headers = [
      'ID', 'Sequence', 'Server Timestamp', 'Category', 'Action', 'Severity',
      'Summary', 'Actor', 'Actor Email', 'Target Type', 'Target ID', 'Target Name',
      'Reason Code', 'Checksum', 'Chain Valid',
    ].join(',');

    const rows = entries.map((e) => [
      e.id,
      e.sequenceNumber,
      e.serverTimestamp.toISOString(),
      e.category,
      e.action,
      e.severity,
      `"${e.summary.replace(/"/g, '""')}"`,
      e.actor.userName,
      e.actor.email,
      e.target.type,
      e.target.id,
      `"${e.target.name.replace(/"/g, '""')}"`,
      e.reasonCode || '',
      e.entryChecksum,
      e.chainValid,
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  // ===========================================================================
  // SUBSCRIPTIONS
  // ===========================================================================

  /**
   * Subscribe to new audit entries
   */
  subscribe(listener: (entry: Part11AuditEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(entry: Part11AuditEntry): void {
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        logger.error('Part11Audit', 'Listener error', err);
      }
    });
  }

  // ===========================================================================
  // OFFLINE SYNC
  // ===========================================================================

  private async syncOfflineEntries(): Promise<void> {
    if (!this.supabase || this.offlineQueue.length === 0) return;

    logger.debug('Part11Audit', `Syncing ${this.offlineQueue.length} offline entries`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const entry of queue) {
      await this.log(entry);
    }
  }

  // ===========================================================================
  // CONVERSION UTILITIES
  // ===========================================================================

  private dbEntryToLocal(db: DbAuditEntry): Part11AuditEntry {
    return {
      id: db.id,
      sequenceNumber: db.sequence_number,
      organizationId: db.organization_id,
      correlationId: db.correlation_id || undefined,
      clientTimestamp: new Date(db.client_timestamp),
      serverTimestamp: new Date(db.server_timestamp),
      timezone: db.timezone,
      category: db.category as Part11AuditCategory,
      action: db.action,
      severity: db.severity as Part11AuditSeverity,
      summary: db.summary,
      details: db.details || undefined,
      actor: {
        userId: db.actor_user_id,
        userName: db.actor_user_name,
        email: db.actor_email,
        role: db.actor_role,
        ipAddress: db.actor_ip_address || undefined,
        sessionId: db.actor_session_id || undefined,
        userAgent: db.actor_user_agent || undefined,
      },
      target: {
        type: db.target_type,
        id: db.target_id,
        name: db.target_name,
        module: db.target_module || undefined,
        parentId: db.target_parent_id || undefined,
        parentName: db.target_parent_name || undefined,
      },
      previousState: db.previous_state || undefined,
      newState: db.new_state || undefined,
      changes: db.changes || undefined,
      reasonCode: db.reason_code as Part11ChangeReasonCode | undefined,
      reasonJustification: db.reason_justification || undefined,
      entryChecksum: db.entry_checksum,
      previousChecksum: db.previous_checksum || undefined,
      chainValid: db.chain_valid,
      metadata: db.metadata,
      tags: db.tags,
    };
  }

  private dbSignatureToLocal(db: DbSignature): ElectronicSignature {
    return {
      id: db.id,
      auditEntryId: db.audit_entry_id,
      signer: {
        userId: db.signer_user_id,
        userName: db.signer_user_name,
        email: db.signer_email,
        role: db.signer_role,
        title: db.signer_title || undefined,
      },
      meaning: db.meaning as SignatureMeaning,
      reason: db.reason || undefined,
      authenticationMethod: db.authentication_method,
      signatureHash: db.signature_hash,
      signedContentHash: db.signed_content_hash,
      signedAt: new Date(db.signed_at),
      isValid: db.is_valid,
      invalidatedAt: db.invalidated_at ? new Date(db.invalidated_at) : undefined,
      invalidationReason: db.invalidation_reason || undefined,
    };
  }

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * Check if service is connected to Supabase
   */
  isConnected(): boolean {
    return !!this.supabase && this.isInitialized;
  }

  /**
   * Get offline queue size
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const part11AuditService = new Part11SupabaseAuditService();
export { Part11SupabaseAuditService };
