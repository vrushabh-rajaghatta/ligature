
// =============================================================================
// CURSOR SYNC SERVICE
// =============================================================================
// Real-time cursor and selection synchronization for collaborative editing
// Part of v0.18.8 - Real-Time Collaboration
// =============================================================================

import { EventEmitter } from 'events';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CursorPosition {
  userId: string;
  documentId: string;
  componentId?: string;
  position: number;               // Character offset
  line?: number;
  column?: number;
  timestamp: Date;
}

export interface SelectionState {
  userId: string;
  documentId: string;
  componentId?: string;
  anchor: number;                 // Selection start
  head: number;                   // Selection end (cursor position)
  isBackward: boolean;            // Selection direction
  timestamp: Date;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  position: CursorPosition;
  selection?: SelectionState;
  isActive: boolean;
}

export interface CursorUpdate {
  userId: string;
  documentId: string;
  componentId?: string;
  position: number;
  line?: number;
  column?: number;
}

export interface SelectionUpdate {
  userId: string;
  documentId: string;
  componentId?: string;
  anchor: number;
  head: number;
}

export interface CursorSyncConfig {
  tenantId: string;
  throttleInterval: number;       // ms between cursor broadcasts
  staleTimeout: number;           // ms before cursor considered stale
  maxCursorsPerDocument: number;
}

export interface CursorSyncStats {
  totalCursors: number;
  activeCursors: number;
  documentsWithCursors: number;
  updatesSent: number;
  updatesReceived: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Omit<CursorSyncConfig, 'tenantId'> = {
  throttleInterval: 50,           // 50ms throttle (20 updates/sec max)
  staleTimeout: 5000,             // 5 seconds
  maxCursorsPerDocument: 50,
};

// -----------------------------------------------------------------------------
// Cursor Sync Service
// -----------------------------------------------------------------------------

export class CursorSyncService extends EventEmitter {
  private config: CursorSyncConfig;
  private cursors: Map<string, CursorPosition> = new Map();         // `${userId}:${documentId}` -> position
  private selections: Map<string, SelectionState> = new Map();      // `${userId}:${documentId}` -> selection
  private userMetadata: Map<string, { userName: string; userColor: string }> = new Map();
  private documentCursors: Map<string, Set<string>> = new Map();    // documentId -> userIds
  private lastUpdates: Map<string, number> = new Map();             // userId -> lastUpdateTime (for throttling)
  private stats: CursorSyncStats;

  constructor(config: Partial<CursorSyncConfig> & { tenantId: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalCursors: 0,
      activeCursors: 0,
      documentsWithCursors: 0,
      updatesSent: 0,
      updatesReceived: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // User Registration
  // ---------------------------------------------------------------------------

  registerUser(userId: string, userName: string, userColor: string): void {
    this.userMetadata.set(userId, { userName, userColor });
  }

  unregisterUser(userId: string): void {
    this.userMetadata.delete(userId);
    
    // Remove all cursors for this user
    for (const [key, cursor] of Array.from(Array.from(this.cursors.entries()))) {
      if (cursor.userId === userId) {
        this.removeCursor(userId, cursor.documentId);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cursor Management
  // ---------------------------------------------------------------------------

  updateCursor(update: CursorUpdate): CursorPosition | null {
    const key = this.getCursorKey(update.userId, update.documentId);
    const now = Date.now();

    // Throttle updates
    const lastUpdate = this.lastUpdates.get(update.userId) || 0;
    if (now - lastUpdate < this.config.throttleInterval) {
      return null; // Throttled
    }
    this.lastUpdates.set(update.userId, now);

    // Check document capacity
    const docCursors = this.documentCursors.get(update.documentId);
    if (docCursors && docCursors.size >= this.config.maxCursorsPerDocument) {
      if (!docCursors.has(update.userId)) {
        return null; // Document at capacity
      }
    }

    const cursor: CursorPosition = {
      userId: update.userId,
      documentId: update.documentId,
      componentId: update.componentId,
      position: update.position,
      line: update.line,
      column: update.column,
      timestamp: new Date(),
    };

    // Store cursor
    const isNew = !this.cursors.has(key);
    this.cursors.set(key, cursor);

    // Track document cursors
    if (!this.documentCursors.has(update.documentId)) {
      this.documentCursors.set(update.documentId, new Set());
    }
    this.documentCursors.get(update.documentId)!.add(update.userId);

    // Update stats
    if (isNew) {
      this.stats.totalCursors++;
    }
    this.stats.updatesReceived++;

    this.emit('cursor_updated', cursor);
    return cursor;
  }

  updateSelection(update: SelectionUpdate): SelectionState | null {
    const key = this.getCursorKey(update.userId, update.documentId);
    const now = Date.now();

    // Throttle updates
    const lastUpdate = this.lastUpdates.get(update.userId) || 0;
    if (now - lastUpdate < this.config.throttleInterval) {
      return null; // Throttled
    }
    this.lastUpdates.set(update.userId, now);

    const selection: SelectionState = {
      userId: update.userId,
      documentId: update.documentId,
      componentId: update.componentId,
      anchor: update.anchor,
      head: update.head,
      isBackward: update.anchor > update.head,
      timestamp: new Date(),
    };

    this.selections.set(key, selection);

    this.emit('selection_updated', selection);
    return selection;
  }

  clearSelection(userId: string, documentId: string): void {
    const key = this.getCursorKey(userId, documentId);
    this.selections.delete(key);
    this.emit('selection_cleared', { userId, documentId });
  }

  removeCursor(userId: string, documentId: string): void {
    const key = this.getCursorKey(userId, documentId);
    
    const cursor = this.cursors.get(key);
    if (!cursor) return;

    this.cursors.delete(key);
    this.selections.delete(key);

    // Update document tracking
    const docCursors = this.documentCursors.get(documentId);
    if (docCursors) {
      docCursors.delete(userId);
      if (docCursors.size === 0) {
        this.documentCursors.delete(documentId);
      }
    }

    this.stats.totalCursors--;

    this.emit('cursor_removed', cursor);
  }

  // ---------------------------------------------------------------------------
  // Cursor Queries
  // ---------------------------------------------------------------------------

  getCursor(userId: string, documentId: string): CursorPosition | undefined {
    const key = this.getCursorKey(userId, documentId);
    return this.cursors.get(key);
  }

  getSelection(userId: string, documentId: string): SelectionState | undefined {
    const key = this.getCursorKey(userId, documentId);
    return this.selections.get(key);
  }

  getRemoteCursor(userId: string, documentId: string): RemoteCursor | null {
    const cursor = this.getCursor(userId, documentId);
    if (!cursor) return null;

    const metadata = this.userMetadata.get(userId);
    if (!metadata) return null;

    const selection = this.getSelection(userId, documentId);
    const isActive = Date.now() - cursor.timestamp.getTime() < this.config.staleTimeout;

    return {
      userId,
      userName: metadata.userName,
      userColor: metadata.userColor,
      position: cursor,
      selection,
      isActive,
    };
  }

  getDocumentCursors(documentId: string): RemoteCursor[] {
    const userIds = this.documentCursors.get(documentId) || new Set();
    const cursors: RemoteCursor[] = [];

    for (const userId of Array.from(userIds)) {
      const remoteCursor = this.getRemoteCursor(userId, documentId);
      if (remoteCursor) {
        cursors.push(remoteCursor);
      }
    }

    return cursors;
  }

  getActiveCursors(documentId: string): RemoteCursor[] {
    return this.getDocumentCursors(documentId)
      .filter(c => c.isActive);
  }

  getComponentCursors(documentId: string, componentId: string): RemoteCursor[] {
    return this.getDocumentCursors(documentId)
      .filter(c => c.position.componentId === componentId);
  }

  // ---------------------------------------------------------------------------
  // Position Transformation
  // ---------------------------------------------------------------------------

  /**
   * Transform cursor positions when content changes.
   * This is critical for maintaining correct cursor positions during concurrent edits.
   */
  transformCursors(
    documentId: string,
    changePosition: number,
    changeLength: number,       // Positive for insert, negative for delete
    excludeUserId?: string
  ): void {
    const userIds = this.documentCursors.get(documentId) || new Set();

    for (const userId of Array.from(userIds)) {
      if (userId === excludeUserId) continue;

      const key = this.getCursorKey(userId, documentId);
      const cursor = this.cursors.get(key);
      const selection = this.selections.get(key);

      if (cursor && cursor.position >= changePosition) {
        cursor.position = Math.max(changePosition, cursor.position + changeLength);
        cursor.timestamp = new Date();
        this.emit('cursor_transformed', cursor);
      }

      if (selection) {
        if (selection.anchor >= changePosition) {
          selection.anchor = Math.max(changePosition, selection.anchor + changeLength);
        }
        if (selection.head >= changePosition) {
          selection.head = Math.max(changePosition, selection.head + changeLength);
        }
        selection.isBackward = selection.anchor > selection.head;
        selection.timestamp = new Date();
        this.emit('selection_transformed', selection);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private getCursorKey(userId: string, documentId: string): string {
    return `${userId}:${documentId}`;
  }

  getStats(): CursorSyncStats {
    const allCursors = Array.from(this.cursors.values());
    const now = Date.now();

    return {
      totalCursors: this.stats.totalCursors,
      activeCursors: allCursors.filter(c => 
        now - c.timestamp.getTime() < this.config.staleTimeout
      ).length,
      documentsWithCursors: this.documentCursors.size,
      updatesSent: this.stats.updatesSent,
      updatesReceived: this.stats.updatesReceived,
    };
  }

  getConfig(): CursorSyncConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Omit<CursorSyncConfig, 'tenantId'>>): void {
    this.config = { ...this.config, ...updates };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanupStaleCursors(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, cursor] of Array.from(Array.from(this.cursors.entries()))) {
      if (now - cursor.timestamp.getTime() > this.config.staleTimeout * 2) {
        this.removeCursor(cursor.userId, cursor.documentId);
        removed++;
      }
    }

    return removed;
  }

  async shutdown(): Promise<void> {
    this.cursors.clear();
    this.selections.clear();
    this.userMetadata.clear();
    this.documentCursors.clear();
    this.lastUpdates.clear();

    this.emit('shutdown');
  }
}
