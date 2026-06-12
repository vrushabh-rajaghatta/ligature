
// =============================================================================
// PRESENCE SERVICE
// =============================================================================
// Real-time user presence tracking for collaborative editing
// Part of v0.18.8 - Real-Time Collaboration
// =============================================================================

import { EventEmitter } from 'events';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  status: PresenceStatus;
  documentId?: string;
  componentId?: string;
  lastActivity: Date;
  joinedAt: Date;
  metadata: Record<string, unknown>;
}

export interface PresenceUpdate {
  userId: string;
  documentId: string;
  status: PresenceStatus;
  componentId?: string;
  cursorPosition?: number;
  selection?: SelectionRange;
}

export interface SelectionRange {
  start: number;
  end: number;
  componentId?: string;
}

export interface DocumentPresence {
  documentId: string;
  users: UserPresence[];
  lastUpdated: Date;
}

export interface PresenceConfig {
  tenantId: string;
  idleTimeout: number;            // ms before user goes idle
  awayTimeout: number;            // ms before user goes away
  cleanupInterval: number;        // ms between cleanup runs
  maxUsersPerDocument: number;
}

export interface PresenceStats {
  totalUsers: number;
  activeUsers: number;
  idleUsers: number;
  awayUsers: number;
  documentsWithPresence: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Omit<PresenceConfig, 'tenantId'> = {
  idleTimeout: 60000,             // 1 minute
  awayTimeout: 300000,            // 5 minutes
  cleanupInterval: 30000,         // 30 seconds
  maxUsersPerDocument: 50,
};

// User colors for collaborative editing
const USER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

// -----------------------------------------------------------------------------
// Presence Service
// -----------------------------------------------------------------------------

export class PresenceService extends EventEmitter {
  private config: PresenceConfig;
  private presence: Map<string, UserPresence> = new Map();         // userId -> presence
  private documentUsers: Map<string, Set<string>> = new Map();     // documentId -> userIds
  private cleanupTimer?: NodeJS.Timeout;
  private colorAssignments: Map<string, number> = new Map();       // documentId -> nextColorIndex

  constructor(config: Partial<PresenceConfig> & { tenantId: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  // ---------------------------------------------------------------------------
  // User Presence Management
  // ---------------------------------------------------------------------------

  async join(userId: string, userName: string, documentId: string, metadata: Record<string, unknown> = {}): Promise<UserPresence> {
    // Check document capacity
    const currentUsers = this.documentUsers.get(documentId);
    if (currentUsers && currentUsers.size >= this.config.maxUsersPerDocument) {
      throw new Error(`Document ${documentId} has reached maximum users`);
    }

    const now = new Date();
    const userColor = this.assignColor(documentId);

    const userPresence: UserPresence = {
      userId,
      userName,
      userColor,
      status: 'active',
      documentId,
      lastActivity: now,
      joinedAt: now,
      metadata,
    };

    // Update presence
    this.presence.set(userId, userPresence);

    // Track document users
    if (!this.documentUsers.has(documentId)) {
      this.documentUsers.set(documentId, new Set());
    }
    this.documentUsers.get(documentId)!.add(userId);

    this.emit('user_joined', userPresence);
    return userPresence;
  }

  async leave(userId: string): Promise<void> {
    const userPresence = this.presence.get(userId);
    if (!userPresence) return;

    const documentId = userPresence.documentId;

    // Remove from document tracking
    if (documentId) {
      const docUsers = this.documentUsers.get(documentId);
      if (docUsers) {
        docUsers.delete(userId);
        if (docUsers.size === 0) {
          this.documentUsers.delete(documentId);
          this.colorAssignments.delete(documentId);
        }
      }
    }

    // Update status and remove
    userPresence.status = 'offline';
    this.presence.delete(userId);

    this.emit('user_left', userPresence);
  }

  async updatePresence(update: PresenceUpdate): Promise<UserPresence | null> {
    const userPresence = this.presence.get(update.userId);
    if (!userPresence) return null;

    const now = new Date();
    
    // Update fields
    userPresence.status = update.status;
    userPresence.lastActivity = now;
    
    if (update.componentId !== undefined) {
      userPresence.componentId = update.componentId;
    }

    // Handle document change
    if (update.documentId !== userPresence.documentId) {
      // Leave old document
      if (userPresence.documentId) {
        const oldDocUsers = this.documentUsers.get(userPresence.documentId);
        if (oldDocUsers) {
          oldDocUsers.delete(update.userId);
          if (oldDocUsers.size === 0) {
            this.documentUsers.delete(userPresence.documentId);
          }
        }
      }

      // Join new document
      userPresence.documentId = update.documentId;
      if (!this.documentUsers.has(update.documentId)) {
        this.documentUsers.set(update.documentId, new Set());
      }
      this.documentUsers.get(update.documentId)!.add(update.userId);
      
      // Assign new color for new document
      userPresence.userColor = this.assignColor(update.documentId);
    }

    this.emit('presence_updated', userPresence);
    return userPresence;
  }

  async setActivity(userId: string): Promise<void> {
    const userPresence = this.presence.get(userId);
    if (!userPresence) return;

    const wasIdle = userPresence.status !== 'active';
    userPresence.lastActivity = new Date();
    userPresence.status = 'active';

    if (wasIdle) {
      this.emit('presence_updated', userPresence);
    }
  }

  // ---------------------------------------------------------------------------
  // Presence Queries
  // ---------------------------------------------------------------------------

  getPresence(userId: string): UserPresence | undefined {
    return this.presence.get(userId);
  }

  getDocumentPresence(documentId: string): DocumentPresence {
    const userIds = this.documentUsers.get(documentId) || new Set();
    const users: UserPresence[] = [];

    for (const userId of Array.from(userIds)) {
      const presence = this.presence.get(userId);
      if (presence) {
        users.push(presence);
      }
    }

    return {
      documentId,
      users,
      lastUpdated: new Date(),
    };
  }

  getActiveUsers(documentId: string): UserPresence[] {
    return this.getDocumentPresence(documentId).users
      .filter(u => u.status === 'active');
  }

  getAllPresence(): UserPresence[] {
    return Array.from(this.presence.values());
  }

  getUsersInComponent(documentId: string, componentId: string): UserPresence[] {
    return this.getDocumentPresence(documentId).users
      .filter(u => u.componentId === componentId);
  }

  isUserOnline(userId: string): boolean {
    const presence = this.presence.get(userId);
    return presence !== undefined && presence.status !== 'offline';
  }

  // ---------------------------------------------------------------------------
  // Color Assignment
  // ---------------------------------------------------------------------------

  private assignColor(documentId: string): string {
    let index = this.colorAssignments.get(documentId) || 0;
    const color = USER_COLORS[index % USER_COLORS.length];
    this.colorAssignments.set(documentId, index + 1);
    return color;
  }

  // ---------------------------------------------------------------------------
  // Status Management
  // ---------------------------------------------------------------------------

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePresence();
    }, this.config.cleanupInterval);
  }

  private cleanupStalePresence(): void {
    const now = Date.now();
    const updates: UserPresence[] = [];

    for (const [userId, presence] of Array.from(Array.from(this.presence.entries()))) {
      const timeSinceActivity = now - presence.lastActivity.getTime();

      if (presence.status === 'active' && timeSinceActivity > this.config.idleTimeout) {
        presence.status = 'idle';
        updates.push(presence);
      } else if (presence.status === 'idle' && timeSinceActivity > this.config.awayTimeout) {
        presence.status = 'away';
        updates.push(presence);
      }
    }

    for (const presence of Array.from(updates)) {
      this.emit('presence_updated', presence);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getStats(): PresenceStats {
    const allPresence = Array.from(this.presence.values());
    
    return {
      totalUsers: allPresence.length,
      activeUsers: allPresence.filter(p => p.status === 'active').length,
      idleUsers: allPresence.filter(p => p.status === 'idle').length,
      awayUsers: allPresence.filter(p => p.status === 'away').length,
      documentsWithPresence: this.documentUsers.size,
    };
  }

  getConfig(): PresenceConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Omit<PresenceConfig, 'tenantId'>>): void {
    this.config = { ...this.config, ...updates };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Mark all users as offline
    for (const userId of Array.from(Array.from(this.presence.keys()))) {
      await this.leave(userId);
    }

    this.emit('shutdown');
  }
}
