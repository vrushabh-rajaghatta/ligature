
/**
 * Audit Trail Service
 * 21 CFR Part 11 compliant audit logging
 * 
 * @version 0.13.22
 * @bite 1.4a - Connect AuditTrailService to database
 */

import prisma from '../database/prisma';
import crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export type AuditAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'SIGN'
  | 'SUBMIT'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string | null;
  userName?: string | null;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  timestamp: Date;
  checksum?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export interface AuditStatistics {
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  byEntityType: Record<string, number>;
  uniqueUsers: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

// Prisma action type
type PrismaAuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SIGN' | 'APPROVE' | 'REJECT' | 'EXPORT';

// =============================================================================
// CHECKSUM GENERATION (Part 11 Compliance - Tamper Detection)
// =============================================================================

/**
 * Generate a tamper-evident checksum for an audit entry
 */
function generateAuditChecksum(data: {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  timestamp: Date;
  oldValue?: unknown;
  newValue?: unknown;
}): string {
  const content = JSON.stringify({
    entityType: data.entityType,
    entityId: data.entityId,
    action: data.action,
    userId: data.userId,
    timestamp: data.timestamp.toISOString(),
    oldValue: data.oldValue,
    newValue: data.newValue,
  });
  
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verify the integrity of an audit entry
 */
export function verifyAuditChecksum(entry: AuditEntry): boolean {
  if (!entry.checksum) return false;
  
  const expectedChecksum = generateAuditChecksum({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: entry.userId || '',
    timestamp: entry.timestamp,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
  });
  
  return entry.checksum === expectedChecksum;
}

// =============================================================================
// CORE AUDIT FUNCTIONS
// =============================================================================

/**
 * Create an audit log entry with tamper-evident checksum
 */
export async function createAuditEntry(
  entityType: string,
  entityId: string,
  action: AuditAction,
  context: AuditContext,
  options?: {
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AuditEntry> {
  const timestamp = new Date();
  
  // Generate tamper-evident checksum
  const checksum = generateAuditChecksum({
    entityType,
    entityId,
    action,
    userId: context.userId,
    timestamp,
    oldValue: options?.oldValue,
    newValue: options?.newValue,
  });
  
  // Map action to Prisma enum (some actions map to others)
  const prismaAction: PrismaAuditAction = action === 'SUBMIT' ? 'UPDATE' : action as PrismaAuditAction;
  
  const entry = await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action: prismaAction,
      userId: context.userId,
      oldValue: options?.oldValue ? JSON.parse(JSON.stringify(options.oldValue)) : null,
      newValue: options?.newValue ? JSON.parse(JSON.stringify(options.newValue)) : null,
      reason: options?.reason ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      sessionId: context.sessionId ?? null,
      timestamp,
      checksum,
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return {
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action as AuditAction,
    userId: entry.userId,
    userName: entry.user?.name,
    oldValue: entry.oldValue as Record<string, unknown> | undefined,
    newValue: entry.newValue as Record<string, unknown> | undefined,
    reason: entry.reason || undefined,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    sessionId: entry.sessionId,
    timestamp: entry.timestamp,
    checksum: entry.checksum,
  };
}

/**
 * Get audit entries with filters
 */
export async function getAuditEntries(
  filters?: AuditFilters,
  options?: { page?: number; pageSize?: number }
): Promise<{ entries: AuditEntry[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.entityId) where.entityId = filters.entityId;
  if (filters?.action) where.action = filters.action;
  if (filters?.userId) where.userId = filters.userId;
  
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) (where.timestamp as Record<string, unknown>).gte = filters.startDate;
    if (filters.endDate) (where.timestamp as Record<string, unknown>).lte = filters.endDate;
  }

  if (filters?.searchQuery) {
    where.OR = [
      { entityType: { contains: filters.searchQuery, mode: 'insensitive' } },
      { entityId: { contains: filters.searchQuery, mode: 'insensitive' } },
    ];
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: { name: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action as AuditAction,
      userId: e.userId,
      userName: e.user?.name,
      oldValue: e.oldValue as Record<string, unknown> | undefined,
      newValue: e.newValue as Record<string, unknown> | undefined,
      reason: e.reason || undefined,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      sessionId: e.sessionId,
      timestamp: e.timestamp,
      checksum: e.checksum,
    })),
    total,
  };
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string
): Promise<AuditEntry[]> {
  const { entries } = await getAuditEntries({ entityType, entityId });
  return entries;
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(filters?: AuditFilters): Promise<AuditStatistics> {
  const where: Record<string, unknown> = {};

  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters?.startDate) (where.timestamp as Record<string, unknown>).gte = filters.startDate;
    if (filters?.endDate) (where.timestamp as Record<string, unknown>).lte = filters.endDate;
  }

  const entries = await prisma.auditLog.findMany({
    where,
    select: {
      action: true,
      entityType: true,
      userId: true,
      timestamp: true,
    },
  });

  const byAction: Record<AuditAction, number> = {
    CREATE: 0, READ: 0, UPDATE: 0, DELETE: 0,
    APPROVE: 0, REJECT: 0, SIGN: 0, SUBMIT: 0,
    EXPORT: 0, LOGIN: 0, LOGOUT: 0,
  };

  const byEntityType: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const entry of Array.from(entries)) {
    const action = entry.action as AuditAction;
    if (byAction[action] !== undefined) byAction[action]++;
    
    byEntityType[entry.entityType] = (byEntityType[entry.entityType] || 0) + 1;
    if (entry.userId) uniqueUsers.add(entry.userId);
    
    if (!earliest || entry.timestamp < earliest) earliest = entry.timestamp;
    if (!latest || entry.timestamp > latest) latest = entry.timestamp;
  }

  return {
    totalEntries: entries.length,
    byAction,
    byEntityType,
    uniqueUsers: uniqueUsers.size,
    dateRange: { earliest, latest },
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC ENTITY TYPES
// =============================================================================

/**
 * Audit document access
 */
export async function auditDocumentAccess(
  documentId: string,
  context: AuditContext
): Promise<AuditEntry> {
  return createAuditEntry('Document', documentId, 'READ', context);
}

/**
 * Audit document update with diff
 */
export async function auditDocumentUpdate(
  documentId: string,
  oldDocument: Record<string, unknown>,
  newDocument: Record<string, unknown>,
  context: AuditContext
): Promise<AuditEntry> {
  // Calculate changes
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldDocument), ...Object.keys(newDocument)]);
  
  for (const key of Array.from(allKeys)) {
    if (JSON.stringify(oldDocument[key]) !== JSON.stringify(newDocument[key])) {
      changes[key] = { old: oldDocument[key], new: newDocument[key] };
    }
  }

  return createAuditEntry('Document', documentId, 'UPDATE', context, {
    oldValue: oldDocument,
    newValue: newDocument,
    metadata: { changes },
  });
}

/**
 * Audit submission status change
 */
export async function auditSubmissionStatusChange(
  submissionId: string,
  oldStatus: string,
  newStatus: string,
  context: AuditContext
): Promise<AuditEntry> {
  return createAuditEntry('Submission', submissionId, 'UPDATE', context, {
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    metadata: { statusTransition: `${oldStatus} → ${newStatus}` },
  });
}

/**
 * Audit login attempt
 */
export async function auditLogin(
  userId: string,
  success: boolean,
  context: Omit<AuditContext, 'userId'> & { email?: string }
): Promise<AuditEntry> {
  return createAuditEntry('User', userId, 'LOGIN', { userId, ...context }, {
    metadata: { success, email: context.email },
  });
}

/**
 * Audit logout
 */
export async function auditLogout(context: AuditContext): Promise<AuditEntry> {
  return createAuditEntry('User', context.userId, 'LOGOUT', context);
}

/**
 * Audit data export
 */
export async function auditDataExport(
  entityType: string,
  entityIds: string[],
  exportFormat: string,
  context: AuditContext
): Promise<AuditEntry> {
  return createAuditEntry(entityType, entityIds.join(','), 'EXPORT', context, {
    metadata: {
      format: exportFormat,
      count: entityIds.length,
      entityIds,
    },
  });
}

// =============================================================================
// COMPLIANCE REPORTING
// =============================================================================

/**
 * Generate Part 11 compliance report for an entity
 */
export async function generateComplianceReport(
  entityType: string,
  entityId: string
): Promise<{
  entity: { type: string; id: string };
  auditTrail: AuditEntry[];
  signatures: Array<{
    userId: string;
    userName: string | null;
    meaning: string;
    signedAt: Date;
    checksum: string;
  }>;
  summary: {
    createdAt: Date | null;
    createdBy: string | null;
    lastModifiedAt: Date | null;
    lastModifiedBy: string | null;
    totalChanges: number;
    hasValidSignatures: boolean;
  };
  integrityCheck: {
    totalEntries: number;
    validChecksums: number;
    integrityPassed: boolean;
  };
}> {
  const auditTrail = await getEntityAuditTrail(entityType, entityId);
  
  // Get signatures if entity is a document
  let signatures: Array<{
    userId: string;
    userName: string | null;
    meaning: string;
    signedAt: Date;
    checksum: string;
  }> = [];

  if (entityType === 'Document') {
    const sigs = await prisma.signature.findMany({
      where: { documentId: entityId },
      include: { user: { select: { name: true } } },
      orderBy: { signedAt: 'asc' },
    });
    signatures = sigs.map((s) => ({
      userId: s.userId,
      userName: s.user?.name || s.userName,
      meaning: s.meaning,
      signedAt: s.signedAt,
      checksum: s.checksum,
    }));
  }

  // Build summary
  const createEntry = auditTrail.find(e => e.action === 'CREATE');
  const updateEntries = auditTrail.filter(e => e.action === 'UPDATE');
  const lastUpdate = updateEntries[0]; // Already sorted desc by timestamp

  // Verify integrity of all audit entries
  let validChecksums = 0;
  for (const entry of Array.from(auditTrail)) {
    if (verifyAuditChecksum(entry)) {
      validChecksums++;
    }
  }

  return {
    entity: { type: entityType, id: entityId },
    auditTrail,
    signatures,
    summary: {
      createdAt: createEntry?.timestamp || null,
      createdBy: createEntry?.userName || null,
      lastModifiedAt: lastUpdate?.timestamp || null,
      lastModifiedBy: lastUpdate?.userName || null,
      totalChanges: updateEntries.length,
      hasValidSignatures: signatures.length > 0,
    },
    integrityCheck: {
      totalEntries: auditTrail.length,
      validChecksums,
      integrityPassed: validChecksums === auditTrail.length,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const AuditTrailService = {
  createAuditEntry,
  getAuditEntries,
  getEntityAuditTrail,
  getAuditStatistics,
  verifyAuditChecksum,
  auditDocumentAccess,
  auditDocumentUpdate,
  auditSubmissionStatusChange,
  auditLogin,
  auditLogout,
  auditDataExport,
  generateComplianceReport,
};
