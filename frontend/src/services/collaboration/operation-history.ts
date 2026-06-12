
// =============================================================================
// OPERATION HISTORY SERVICE
// =============================================================================
// Manages operation history for undo/redo functionality and audit trails.
// Provides stack-based undo/redo with branching support and history queries.
// Part of v0.19.1 - Operation History & Replay
// =============================================================================

import { EventEmitter } from 'events';
import { EditOperationRecord, OperationType } from '@/types/collaboration-persistence';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * State of the undo/redo stacks
 */
export interface HistoryState {
  /** Number of operations that can be undone */
  undoCount: number;
  /** Number of operations that can be redone */
  redoCount: number;
  /** Total operations in history */
  totalCount: number;
  /** Current position in history (0 = beginning) */
  currentPosition: number;
  /** Whether history has been modified since last save */
  isDirty: boolean;
}

/**
 * Options for history operations
 */
export interface HistoryOptions {
  /** Maximum number of operations to keep in history */
  maxHistorySize: number;
  /** Whether to merge consecutive similar operations */
  mergeConsecutive: boolean;
  /** Time window for merging consecutive operations (ms) */
  mergeWindowMs: number;
  /** Whether to preserve redo stack when new operations are pushed */
  preserveRedoOnPush: boolean;
  /** Whether to track branches when history diverges */
  trackBranches: boolean;
}

/**
 * A branch in history (when user undoes then makes new changes)
 */
export interface HistoryBranch {
  id: string;
  parentBranchId: string | null;
  branchPoint: number;
  operations: EditOperationRecord[];
  createdAt: Date;
  label?: string;
}

/**
 * Query options for retrieving history
 */
export interface HistoryQuery {
  /** Start date for filtering */
  since?: Date;
  /** End date for filtering */
  until?: Date;
  /** Filter by user ID */
  userId?: string;
  /** Filter by operation type */
  operationType?: OperationType;
  /** Maximum number of operations to return */
  limit?: number;
  /** Skip first N operations */
  offset?: number;
  /** Include undone operations */
  includeUndone?: boolean;
}

/**
 * Result of a history query
 */
export interface HistoryQueryResult {
  operations: EditOperationRecord[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Checkpoint in history for named save points
 */
export interface HistoryCheckpoint {
  id: string;
  position: number;
  label: string;
  createdAt: Date;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Statistics about history usage
 */
export interface HistoryStats {
  totalOperations: number;
  undoOperations: number;
  redoOperations: number;
  branchCount: number;
  checkpointCount: number;
  oldestOperation?: Date;
  newestOperation?: Date;
  operationsByType: Record<OperationType, number>;
  operationsByUser: Record<string, number>;
}

/**
 * Events emitted by the history service
 */
export type HistoryEventType =
  | 'operation:pushed'
  | 'operation:undone'
  | 'operation:redone'
  | 'history:cleared'
  | 'history:trimmed'
  | 'branch:created'
  | 'branch:switched'
  | 'checkpoint:created'
  | 'checkpoint:restored';

export interface HistoryEventData {
  'operation:pushed': { operation: EditOperationRecord; position: number };
  'operation:undone': { operation: EditOperationRecord; position: number };
  'operation:redone': { operation: EditOperationRecord; position: number };
  'history:cleared': { operationCount: number };
  'history:trimmed': { removedCount: number; remainingCount: number };
  'branch:created': { branch: HistoryBranch };
  'branch:switched': { fromBranchId: string; toBranchId: string };
  'checkpoint:created': { checkpoint: HistoryCheckpoint };
  'checkpoint:restored': { checkpoint: HistoryCheckpoint; operationsUndone: number };
}

/**
 * Interface for operation history service
 */
export interface IOperationHistory {
  // Core undo/redo
  push(operation: EditOperationRecord): void;
  undo(): EditOperationRecord | null;
  redo(): EditOperationRecord | null;
  canUndo(): boolean;
  canRedo(): boolean;

  // History access
  getHistory(query?: HistoryQuery): HistoryQueryResult;
  getState(): HistoryState;
  getStats(): HistoryStats;
  clear(): void;

  // Checkpoints
  createCheckpoint(label: string, createdBy?: string): HistoryCheckpoint;
  getCheckpoints(): HistoryCheckpoint[];
  restoreCheckpoint(checkpointId: string): number;
  deleteCheckpoint(checkpointId: string): boolean;

  // Branches (optional)
  getBranches(): HistoryBranch[];
  switchBranch(branchId: string): boolean;
  getCurrentBranchId(): string;

  // Configuration
  getOptions(): HistoryOptions;
  updateOptions(options: Partial<HistoryOptions>): void;

  // Events
  on<E extends HistoryEventType>(event: E, handler: (data: HistoryEventData[E]) => void): void;
  off<E extends HistoryEventType>(event: E, handler: (data: HistoryEventData[E]) => void): void;
}

// -----------------------------------------------------------------------------
// Default Options
// -----------------------------------------------------------------------------

export function createDefaultHistoryOptions(): HistoryOptions {
  return {
    maxHistorySize: 1000,
    mergeConsecutive: true,
    mergeWindowMs: 1000,
    preserveRedoOnPush: false,
    trackBranches: false,
  };
}

// -----------------------------------------------------------------------------
// Operation History Service
// -----------------------------------------------------------------------------

export class OperationHistoryService implements IOperationHistory {
  private undoStack: EditOperationRecord[] = [];
  private redoStack: EditOperationRecord[] = [];
  private options: HistoryOptions;
  private emitter: EventEmitter;
  private isDirty: boolean = false;
  private checkpoints: Map<string, HistoryCheckpoint> = new Map();
  private branches: Map<string, HistoryBranch> = new Map();
  private currentBranchId: string = 'main';
  private lastPushTime: number = 0;

  constructor(options?: Partial<HistoryOptions>) {
    this.options = {
      ...createDefaultHistoryOptions(),
      ...options,
    };
    this.emitter = new EventEmitter();

    // Initialize main branch
    this.branches.set('main', {
      id: 'main',
      parentBranchId: null,
      branchPoint: 0,
      operations: [],
      createdAt: new Date(),
      label: 'Main',
    });
  }

  // ---------------------------------------------------------------------------
  // Core Undo/Redo
  // ---------------------------------------------------------------------------

  push(operation: EditOperationRecord): void {
    const now = Date.now();

    // Check if we should merge with previous operation
    if (
      this.options.mergeConsecutive &&
      this.undoStack.length > 0 &&
      now - this.lastPushTime < this.options.mergeWindowMs
    ) {
      const lastOp = this.undoStack[this.undoStack.length - 1];
      if (this.shouldMerge(lastOp, operation)) {
        // Replace last operation with merged version
        this.undoStack[this.undoStack.length - 1] = this.mergeOperations(lastOp, operation);
        this.lastPushTime = now;
        return;
      }
    }

    // Handle redo stack
    if (!this.options.preserveRedoOnPush && this.redoStack.length > 0) {
      // Create branch if configured
      if (this.options.trackBranches) {
        this.createBranchFromRedo();
      }
      this.redoStack = [];
    }

    // Add to undo stack
    this.undoStack.push(operation);
    this.isDirty = true;
    this.lastPushTime = now;

    // Trim history if needed
    this.trimHistory();

    // Update current branch
    const branch = this.branches.get(this.currentBranchId);
    if (branch) {
      branch.operations.push(operation);
    }

    this.emit('operation:pushed', {
      operation,
      position: this.undoStack.length - 1,
    });
  }

  undo(): EditOperationRecord | null {
    if (!this.canUndo()) {
      return null;
    }

    const operation = this.undoStack.pop()!;
    this.redoStack.push(operation);
    this.isDirty = true;

    this.emit('operation:undone', {
      operation,
      position: this.undoStack.length,
    });

    return operation;
  }

  redo(): EditOperationRecord | null {
    if (!this.canRedo()) {
      return null;
    }

    const operation = this.redoStack.pop()!;
    this.undoStack.push(operation);
    this.isDirty = true;

    this.emit('operation:redone', {
      operation,
      position: this.undoStack.length - 1,
    });

    return operation;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ---------------------------------------------------------------------------
  // History Access
  // ---------------------------------------------------------------------------

  getHistory(query?: HistoryQuery): HistoryQueryResult {
    let operations = [...this.undoStack];

    // Include undone operations if requested
    if (query?.includeUndone) {
      operations = [...operations, ...this.redoStack];
    }

    // Apply filters
    if (query?.since) {
      operations = operations.filter(
        (op) => op.serverTimestamp >= query.since!
      );
    }

    if (query?.until) {
      operations = operations.filter(
        (op) => op.serverTimestamp <= query.until!
      );
    }

    if (query?.userId) {
      operations = operations.filter((op) => op.userId === query.userId);
    }

    if (query?.operationType) {
      operations = operations.filter(
        (op) => op.operationType === query.operationType
      );
    }

    const totalCount = operations.length;

    // Apply pagination
    if (query?.offset) {
      operations = operations.slice(query.offset);
    }

    if (query?.limit) {
      operations = operations.slice(0, query.limit);
    }

    return {
      operations,
      totalCount,
      hasMore: query?.limit ? totalCount > (query.offset || 0) + query.limit : false,
    };
  }

  getState(): HistoryState {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      totalCount: this.undoStack.length + this.redoStack.length,
      currentPosition: this.undoStack.length,
      isDirty: this.isDirty,
    };
  }

  getStats(): HistoryStats {
    const allOps = [...this.undoStack, ...this.redoStack];
    const operationsByType: Record<OperationType, number> = {
      INSERT: 0,
      DELETE: 0,
      REPLACE: 0,
      FORMAT: 0,
      MOVE: 0,
      COMPOUND: 0,
    };
    const operationsByUser: Record<string, number> = {};

    for (const op of Array.from(allOps)) {
      operationsByType[op.operationType]++;
      operationsByUser[op.userId] = (operationsByUser[op.userId] || 0) + 1;
    }

    const timestamps = allOps.map((op) => op.serverTimestamp.getTime());

    return {
      totalOperations: allOps.length,
      undoOperations: this.undoStack.length,
      redoOperations: this.redoStack.length,
      branchCount: this.branches.size,
      checkpointCount: this.checkpoints.size,
      oldestOperation: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestOperation: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
      operationsByType,
      operationsByUser,
    };
  }

  clear(): void {
    const count = this.undoStack.length + this.redoStack.length;
    this.undoStack = [];
    this.redoStack = [];
    this.isDirty = false;
    this.checkpoints.clear();

    // Reset to main branch
    this.branches.clear();
    this.branches.set('main', {
      id: 'main',
      parentBranchId: null,
      branchPoint: 0,
      operations: [],
      createdAt: new Date(),
      label: 'Main',
    });
    this.currentBranchId = 'main';

    this.emit('history:cleared', { operationCount: count });
  }

  // ---------------------------------------------------------------------------
  // Checkpoints
  // ---------------------------------------------------------------------------

  createCheckpoint(label: string, createdBy?: string): HistoryCheckpoint {
    const checkpoint: HistoryCheckpoint = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      position: this.undoStack.length,
      label,
      createdAt: new Date(),
      createdBy,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);

    this.emit('checkpoint:created', { checkpoint });

    return checkpoint;
  }

  getCheckpoints(): HistoryCheckpoint[] {
    return Array.from(this.checkpoints.values()).sort(
      (a, b) => a.position - b.position
    );
  }

  restoreCheckpoint(checkpointId: string): number {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return 0;
    }

    let undoneCount = 0;

    // Undo operations until we reach the checkpoint position
    while (this.undoStack.length > checkpoint.position && this.canUndo()) {
      this.undo();
      undoneCount++;
    }

    this.emit('checkpoint:restored', {
      checkpoint,
      operationsUndone: undoneCount,
    });

    return undoneCount;
  }

  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId);
  }

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------

  getBranches(): HistoryBranch[] {
    return Array.from(this.branches.values());
  }

  switchBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return false;
    }

    const fromBranchId = this.currentBranchId;
    this.currentBranchId = branchId;

    // Restore branch operations
    this.undoStack = [...branch.operations];
    this.redoStack = [];

    this.emit('branch:switched', {
      fromBranchId,
      toBranchId: branchId,
    });

    return true;
  }

  getCurrentBranchId(): string {
    return this.currentBranchId;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  getOptions(): HistoryOptions {
    return { ...this.options };
  }

  updateOptions(options: Partial<HistoryOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };

    // Trim if max size reduced
    this.trimHistory();
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on<E extends HistoryEventType>(
    event: E,
    handler: (data: HistoryEventData[E]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  off<E extends HistoryEventType>(
    event: E,
    handler: (data: HistoryEventData[E]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  private emit<E extends HistoryEventType>(
    event: E,
    data: HistoryEventData[E]
  ): void {
    this.emitter.emit(event, data);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private shouldMerge(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): boolean {
    // Must be same user
    if (op1.userId !== op2.userId) return false;

    // Must be same type
    if (op1.operationType !== op2.operationType) return false;

    // Only merge inserts and deletes
    if (op1.operationType !== 'INSERT' && op1.operationType !== 'DELETE') {
      return false;
    }

    // For inserts, check adjacency
    if (op1.operationType === 'INSERT') {
      const op1End = op1.position + (op1.content?.length || 0);
      return op2.position === op1End;
    }

    // For deletes, check adjacency
    if (op1.operationType === 'DELETE') {
      return op2.position === op1.position || op2.position === op1.position - 1;
    }

    return false;
  }

  private mergeOperations(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    if (op1.operationType === 'INSERT') {
      return {
        ...op1,
        content: (op1.content || '') + (op2.content || ''),
        length: (op1.length || 0) + (op2.length || 0),
        resultVersion: op2.resultVersion,
        serverTimestamp: op2.serverTimestamp,
        appliedAt: op2.appliedAt,
      };
    }

    if (op1.operationType === 'DELETE') {
      // Backspace
      if (op2.position < op1.position) {
        return {
          ...op1,
          position: op2.position,
          length: (op1.length || 1) + (op2.length || 1),
          previousContent: (op2.previousContent || '') + (op1.previousContent || ''),
          resultVersion: op2.resultVersion,
          serverTimestamp: op2.serverTimestamp,
          appliedAt: op2.appliedAt,
        };
      }
      // Forward delete
      return {
        ...op1,
        length: (op1.length || 1) + (op2.length || 1),
        previousContent: (op1.previousContent || '') + (op2.previousContent || ''),
        resultVersion: op2.resultVersion,
        serverTimestamp: op2.serverTimestamp,
        appliedAt: op2.appliedAt,
      };
    }

    return op2;
  }

  private trimHistory(): void {
    if (this.undoStack.length <= this.options.maxHistorySize) {
      return;
    }

    const removeCount = this.undoStack.length - this.options.maxHistorySize;
    this.undoStack.splice(0, removeCount);

    // Update checkpoint positions
    for (const checkpoint of Array.from(Array.from(this.checkpoints.values()))) {
      checkpoint.position = Math.max(0, checkpoint.position - removeCount);
    }

    // Remove checkpoints that are now invalid
    for (const [id, checkpoint] of Array.from(this.checkpoints)) {
      if (checkpoint.position < 0) {
        this.checkpoints.delete(id);
      }
    }

    this.emit('history:trimmed', {
      removedCount: removeCount,
      remainingCount: this.undoStack.length,
    });
  }

  private createBranchFromRedo(): void {
    if (this.redoStack.length === 0) return;

    const branchId = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const branch: HistoryBranch = {
      id: branchId,
      parentBranchId: this.currentBranchId,
      branchPoint: this.undoStack.length,
      operations: [...this.undoStack, ...this.redoStack],
      createdAt: new Date(),
    };

    this.branches.set(branchId, branch);

    this.emit('branch:created', { branch });
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createOperationHistory(
  options?: Partial<HistoryOptions>
): OperationHistoryService {
  return new OperationHistoryService(options);
}
