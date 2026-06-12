
/**
 * Mock Prisma Client
 * Provides database-like interface for frontend demo
 * Real implementation would connect to PostgreSQL
 * 
 * @version 0.27.13
 */

// In-memory storage for audit entries
const auditLogStore: AuditLogEntry[] = [];
const signatureStore: SignatureEntry[] = [];

// Mock user lookup
const mockUsers: Record<string, { id: string; name: string }> = {
  'user-1': { id: 'user-1', name: 'Dr. Sarah Chen' },
  'user-2': { id: 'user-2', name: 'John Smith' },
  'system': { id: 'system', name: 'System' },
};

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  userName: string | null;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: Date;
  checksum: string | null;
  // Virtual relation
  user?: { name: string } | null;
}

interface SignatureEntry {
  id: string;
  documentId: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  signatureType: string;
  meaning: string;
  timestamp: Date;
  signedAt: Date;
  checksum: string;
  // Virtual relation
  user?: { name: string } | null;
}

interface WhereClause {
  entityType?: string;
  entityId?: string;
  documentId?: string;
  action?: string;
  userId?: string;
  timestamp?: { gte?: Date; lte?: Date };
}

interface OrderByClause {
  timestamp?: 'asc' | 'desc';
  signedAt?: 'asc' | 'desc';
}

interface FindManyOptions {
  where?: WhereClause;
  orderBy?: OrderByClause;
  take?: number;
  skip?: number;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
}

// Mock Prisma client
const prisma = {
  auditLog: {
    create: async ({ data, include }: { data: Record<string, unknown>; include?: { user?: { select?: { name?: boolean } } } }) => {
      const entry: AuditLogEntry = {
        id: (data.id as string) || crypto.randomUUID(),
        entityType: data.entityType as string,
        entityId: data.entityId as string,
        action: data.action as string,
        userId: (data.userId as string) ?? null,
        userName: (data.userName as string) ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        reason: (data.reason as string) ?? null,
        ipAddress: (data.ipAddress as string) ?? null,
        userAgent: (data.userAgent as string) ?? null,
        sessionId: (data.sessionId as string) ?? null,
        timestamp: data.timestamp as Date,
        checksum: (data.checksum as string) ?? null,
      };
      
      // Add user relation if requested
      if (include?.user && entry.userId) {
        entry.user = mockUsers[entry.userId] || { name: entry.userName || 'Unknown' };
      }
      
      auditLogStore.push(entry);
      return entry;
    },
    
    findMany: async (options: FindManyOptions = {}) => {
      let results = [...auditLogStore];
      
      if (options.where) {
        const w = options.where;
        results = results.filter(e => {
          if (w.entityType && e.entityType !== w.entityType) return false;
          if (w.entityId && e.entityId !== w.entityId) return false;
          if (w.action && e.action !== w.action) return false;
          if (w.userId && e.userId !== w.userId) return false;
          if (w.timestamp?.gte && e.timestamp < w.timestamp.gte) return false;
          if (w.timestamp?.lte && e.timestamp > w.timestamp.lte) return false;
          return true;
        });
      }
      
      if (options.orderBy?.timestamp) {
        results.sort((a, b) => {
          const diff = a.timestamp.getTime() - b.timestamp.getTime();
          return options.orderBy?.timestamp === 'desc' ? -diff : diff;
        });
      }
      
      if (options.skip) results = results.slice(options.skip);
      if (options.take) results = results.slice(0, options.take);
      
      // Add user relations if requested
      if (options.include?.user) {
        results = results.map(e => ({
          ...e,
          user: e.userId ? (mockUsers[e.userId] || { name: e.userName || 'Unknown' }) : null,
        }));
      }
      
      return results;
    },
    
    count: async ({ where }: { where?: WhereClause } = {}) => {
      if (!where) return auditLogStore.length;
      
      return auditLogStore.filter(e => {
        if (where.entityType && e.entityType !== where.entityType) return false;
        if (where.entityId && e.entityId !== where.entityId) return false;
        return true;
      }).length;
    },
  },
  
  signature: {
    create: async ({ data, include }: { data: Record<string, unknown>; include?: { user?: { select?: { name?: boolean } } } }) => {
      const entry: SignatureEntry = {
        id: (data.id as string) || crypto.randomUUID(),
        documentId: (data.documentId as string) || (data.entityId as string),
        entityType: data.entityType as string,
        entityId: data.entityId as string,
        userId: data.userId as string,
        userName: data.userName as string,
        signatureType: data.signatureType as string,
        meaning: data.meaning as string,
        timestamp: data.timestamp as Date,
        signedAt: (data.signedAt as Date) || (data.timestamp as Date),
        checksum: (data.checksum as string) || crypto.randomUUID(),
      };
      
      if (include?.user) {
        entry.user = mockUsers[entry.userId] || { name: entry.userName };
      }
      
      signatureStore.push(entry);
      return entry;
    },
    
    findMany: async (options: FindManyOptions = {}) => {
      let results = [...signatureStore];
      
      if (options.where) {
        const w = options.where;
        results = results.filter(e => {
          if (w.entityType && e.entityType !== w.entityType) return false;
          if (w.entityId && e.entityId !== w.entityId) return false;
          if (w.documentId && e.documentId !== w.documentId) return false;
          return true;
        });
      }
      
      const orderBy = options.orderBy;
      if (orderBy?.timestamp || orderBy?.signedAt) {
        results.sort((a, b) => {
          const aTime = orderBy.signedAt ? a.signedAt : a.timestamp;
          const bTime = orderBy.signedAt ? b.signedAt : b.timestamp;
          const diff = aTime.getTime() - bTime.getTime();
          const dir = orderBy.signedAt || orderBy.timestamp;
          return dir === 'desc' ? -diff : diff;
        });
      }
      
      // Add user relations if requested
      if (options.include?.user) {
        results = results.map(e => ({
          ...e,
          user: mockUsers[e.userId] || { name: e.userName },
        }));
      }
      
      return results;
    },
  },
};

export default prisma;
