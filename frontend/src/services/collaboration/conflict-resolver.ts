
// =============================================================================
// CONFLICT RESOLVER
// =============================================================================
// Operational Transformation (OT) based conflict resolution for concurrent edits
// Part of v0.18.8 - Real-Time Collaboration
// =============================================================================

import { EventEmitter } from 'events';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type OperationType = 'insert' | 'delete' | 'retain';

export interface Operation {
  id: string;
  type: OperationType;
  position: number;
  content?: string;               // For insert
  length?: number;                // For delete/retain
  userId: string;
  documentId: string;
  componentId?: string;
  version: number;                // Document version this op was created against
  timestamp: Date;
}

export interface TransformedOperation {
  original: Operation;
  transformed: Operation;
  conflictsWith: string[];        // IDs of conflicting operations
}

export interface ConflictResult {
  hasConflict: boolean;
  resolution: 'auto' | 'manual' | 'merge';
  operations: TransformedOperation[];
  mergedContent?: string;
  warnings: string[];
}

export interface DocumentState {
  documentId: string;
  componentId?: string;
  content: string;
  version: number;
  lastModified: Date;
  pendingOperations: Operation[];
  history: Operation[];
}

export interface ConflictResolverConfig {
  tenantId: string;
  maxHistoryLength: number;
  autoResolveInsertInsert: boolean;
  autoResolveDeleteDelete: boolean;
  priorityMode: 'first_wins' | 'last_wins' | 'merge';
}

export interface ConflictStats {
  totalOperations: number;
  conflictsResolved: number;
  autoResolved: number;
  manualResolved: number;
  mergeResolved: number;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Omit<ConflictResolverConfig, 'tenantId'> = {
  maxHistoryLength: 1000,
  autoResolveInsertInsert: true,
  autoResolveDeleteDelete: true,
  priorityMode: 'first_wins',
};

// -----------------------------------------------------------------------------
// Conflict Resolver
// -----------------------------------------------------------------------------

export class ConflictResolver extends EventEmitter {
  private config: ConflictResolverConfig;
  private documentStates: Map<string, DocumentState> = new Map();
  private operationCounter = 0;
  private stats: ConflictStats;

  constructor(config: Partial<ConflictResolverConfig> & { tenantId: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalOperations: 0,
      conflictsResolved: 0,
      autoResolved: 0,
      manualResolved: 0,
      mergeResolved: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Document State Management
  // ---------------------------------------------------------------------------

  initializeDocument(documentId: string, content: string, componentId?: string): DocumentState {
    const key = this.getStateKey(documentId, componentId);
    
    const state: DocumentState = {
      documentId,
      componentId,
      content,
      version: 0,
      lastModified: new Date(),
      pendingOperations: [],
      history: [],
    };

    this.documentStates.set(key, state);
    return state;
  }

  getDocumentState(documentId: string, componentId?: string): DocumentState | undefined {
    const key = this.getStateKey(documentId, componentId);
    return this.documentStates.get(key);
  }

  // ---------------------------------------------------------------------------
  // Operation Creation
  // ---------------------------------------------------------------------------

  createInsertOperation(
    userId: string,
    documentId: string,
    position: number,
    content: string,
    componentId?: string
  ): Operation {
    const state = this.getDocumentState(documentId, componentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    this.operationCounter++;
    return {
      id: `op-${this.config.tenantId}-${Date.now()}-${this.operationCounter}`,
      type: 'insert',
      position,
      content,
      userId,
      documentId,
      componentId,
      version: state.version,
      timestamp: new Date(),
    };
  }

  createDeleteOperation(
    userId: string,
    documentId: string,
    position: number,
    length: number,
    componentId?: string
  ): Operation {
    const state = this.getDocumentState(documentId, componentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    this.operationCounter++;
    return {
      id: `op-${this.config.tenantId}-${Date.now()}-${this.operationCounter}`,
      type: 'delete',
      position,
      length,
      userId,
      documentId,
      componentId,
      version: state.version,
      timestamp: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Operation Transformation (OT)
  // ---------------------------------------------------------------------------

  /**
   * Transform operation A against operation B.
   * Returns the transformed operation A that can be applied after B.
   */
  transform(opA: Operation, opB: Operation): TransformedOperation {
    const conflicts: string[] = [];
    let transformed: Operation = { ...opA };

    // Same position operations may conflict
    if (this.operationsOverlap(opA, opB)) {
      conflicts.push(opB.id);
    }

    // Transform based on operation types
    if (opA.type === 'insert' && opB.type === 'insert') {
      transformed = this.transformInsertInsert(opA, opB);
    } else if (opA.type === 'insert' && opB.type === 'delete') {
      transformed = this.transformInsertDelete(opA, opB);
    } else if (opA.type === 'delete' && opB.type === 'insert') {
      transformed = this.transformDeleteInsert(opA, opB);
    } else if (opA.type === 'delete' && opB.type === 'delete') {
      transformed = this.transformDeleteDelete(opA, opB);
    }

    return {
      original: opA,
      transformed,
      conflictsWith: conflicts,
    };
  }

  private transformInsertInsert(opA: Operation, opB: Operation): Operation {
    const transformed = { ...opA };

    if (opA.position < opB.position) {
      // A is before B, no change needed
    } else if (opA.position > opB.position) {
      // A is after B, shift by B's content length
      transformed.position += (opB.content?.length || 0);
    } else {
      // Same position - use priority mode
      if (this.config.priorityMode === 'first_wins') {
        if (opA.timestamp > opB.timestamp) {
          transformed.position += (opB.content?.length || 0);
        }
      } else if (this.config.priorityMode === 'last_wins') {
        if (opA.timestamp < opB.timestamp) {
          transformed.position += (opB.content?.length || 0);
        }
      } else {
        // Merge mode - interleave by user ID
        if (opA.userId > opB.userId) {
          transformed.position += (opB.content?.length || 0);
        }
      }
    }

    return transformed;
  }

  private transformInsertDelete(opA: Operation, opB: Operation): Operation {
    const transformed = { ...opA };
    const deleteEnd = opB.position + (opB.length || 0);

    if (opA.position <= opB.position) {
      // Insert is before delete, no change needed
    } else if (opA.position >= deleteEnd) {
      // Insert is after delete, shift back by delete length
      transformed.position -= (opB.length || 0);
    } else {
      // Insert is within deleted region - move to delete position
      transformed.position = opB.position;
    }

    return transformed;
  }

  private transformDeleteInsert(opA: Operation, opB: Operation): Operation {
    const transformed = { ...opA };
    
    if (opB.position <= opA.position) {
      // Insert is before delete, shift forward
      transformed.position += (opB.content?.length || 0);
    }
    // If insert is after delete start, delete position unchanged

    return transformed;
  }

  private transformDeleteDelete(opA: Operation, opB: Operation): Operation {
    const transformed = { ...opA };
    const aEnd = opA.position + (opA.length || 0);
    const bEnd = opB.position + (opB.length || 0);

    if (aEnd <= opB.position) {
      // A is completely before B, no change
    } else if (opA.position >= bEnd) {
      // A is completely after B, shift back
      transformed.position -= (opB.length || 0);
    } else if (opA.position >= opB.position && aEnd <= bEnd) {
      // A is completely within B, operation becomes no-op
      transformed.length = 0;
    } else if (opA.position < opB.position && aEnd > bEnd) {
      // A contains B, reduce length
      transformed.length = (opA.length || 0) - (opB.length || 0);
    } else if (opA.position < opB.position) {
      // A starts before B and overlaps
      transformed.length = opB.position - opA.position;
    } else {
      // A starts within B
      transformed.position = opB.position;
      transformed.length = aEnd - bEnd;
    }

    return transformed;
  }

  private operationsOverlap(opA: Operation, opB: Operation): boolean {
    if (opA.documentId !== opB.documentId) return false;
    if (opA.componentId !== opB.componentId) return false;

    const aStart = opA.position;
    const aEnd = opA.position + (opA.type === 'delete' ? (opA.length || 0) : (opA.content?.length || 0));
    const bStart = opB.position;
    const bEnd = opB.position + (opB.type === 'delete' ? (opB.length || 0) : (opB.content?.length || 0));

    return !(aEnd <= bStart || bEnd <= aStart);
  }

  // ---------------------------------------------------------------------------
  // Conflict Resolution
  // ---------------------------------------------------------------------------

  resolveConflicts(operations: Operation[]): ConflictResult {
    if (operations.length === 0) {
      return {
        hasConflict: false,
        resolution: 'auto',
        operations: [],
        warnings: [],
      };
    }

    // Sort by version, then timestamp
    const sorted = [...operations].sort((a, b) => {
      if (a.version !== b.version) return a.version - b.version;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    const transformed: TransformedOperation[] = [];
    const warnings: string[] = [];
    let hasConflict = false;

    for (let i = 0; i < sorted.length; i++) {
      let current = sorted[i];
      const conflicts: string[] = [];

      // Transform against all previous operations
      for (let j = 0; j < i; j++) {
        const result = this.transform(current, transformed[j].transformed);
        current = result.transformed;
        conflicts.push(...result.conflictsWith);
      }

      if (conflicts.length > 0) {
        hasConflict = true;
      }

      transformed.push({
        original: sorted[i],
        transformed: current,
        conflictsWith: conflicts,
      });
    }

    // Determine resolution type
    let resolution: 'auto' | 'manual' | 'merge' = 'auto';
    if (hasConflict) {
      if (this.config.priorityMode === 'merge') {
        resolution = 'merge';
        this.stats.mergeResolved++;
      } else {
        this.stats.autoResolved++;
      }
      this.stats.conflictsResolved++;
    }

    this.stats.totalOperations += operations.length;

    return {
      hasConflict,
      resolution,
      operations: transformed,
      warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // Apply Operations
  // ---------------------------------------------------------------------------

  applyOperation(operation: Operation): string {
    const state = this.getDocumentState(operation.documentId, operation.componentId);
    if (!state) {
      throw new Error(`Document state not found: ${operation.documentId}`);
    }

    let content = state.content;

    switch (operation.type) {
      case 'insert':
        content = this.applyInsert(content, operation);
        break;
      case 'delete':
        content = this.applyDelete(content, operation);
        break;
      case 'retain':
        // No content change
        break;
    }

    // Update state
    state.content = content;
    state.version++;
    state.lastModified = new Date();
    state.history.push(operation);

    // Trim history if needed
    if (state.history.length > this.config.maxHistoryLength) {
      state.history = state.history.slice(-this.config.maxHistoryLength);
    }

    this.emit('operation_applied', { operation, newContent: content, newVersion: state.version });
    return content;
  }

  private applyInsert(content: string, operation: Operation): string {
    const pos = Math.min(operation.position, content.length);
    return content.slice(0, pos) + (operation.content || '') + content.slice(pos);
  }

  private applyDelete(content: string, operation: Operation): string {
    const start = Math.min(operation.position, content.length);
    const end = Math.min(start + (operation.length || 0), content.length);
    return content.slice(0, start) + content.slice(end);
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  applyOperationBatch(operations: Operation[]): string {
    const result = this.resolveConflicts(operations);
    let finalContent = '';

    for (const { transformed } of result.operations) {
      finalContent = this.applyOperation(transformed);
    }

    return finalContent;
  }

  // ---------------------------------------------------------------------------
  // Undo/Redo Support
  // ---------------------------------------------------------------------------

  createInverseOperation(operation: Operation, currentContent: string): Operation {
    this.operationCounter++;

    if (operation.type === 'insert') {
      return {
        ...operation,
        id: `op-${this.config.tenantId}-${Date.now()}-${this.operationCounter}`,
        type: 'delete',
        length: operation.content?.length || 0,
        content: undefined,
        timestamp: new Date(),
      };
    } else if (operation.type === 'delete') {
      const deletedContent = currentContent.slice(
        operation.position,
        operation.position + (operation.length || 0)
      );
      return {
        ...operation,
        id: `op-${this.config.tenantId}-${Date.now()}-${this.operationCounter}`,
        type: 'insert',
        content: deletedContent,
        length: undefined,
        timestamp: new Date(),
      };
    }

    return operation;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private getStateKey(documentId: string, componentId?: string): string {
    return componentId ? `${documentId}:${componentId}` : documentId;
  }

  getStats(): ConflictStats {
    return { ...this.stats };
  }

  getConfig(): ConflictResolverConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Omit<ConflictResolverConfig, 'tenantId'>>): void {
    this.config = { ...this.config, ...updates };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  clearDocumentHistory(documentId: string, componentId?: string): void {
    const state = this.getDocumentState(documentId, componentId);
    if (state) {
      state.history = [];
      state.pendingOperations = [];
    }
  }

  removeDocument(documentId: string, componentId?: string): void {
    const key = this.getStateKey(documentId, componentId);
    this.documentStates.delete(key);
  }

  async shutdown(): Promise<void> {
    this.documentStates.clear();
    this.emit('shutdown');
  }
}
