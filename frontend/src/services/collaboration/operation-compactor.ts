
// =============================================================================
// OPERATION COMPACTOR SERVICE
// =============================================================================
// Service for compacting edit operation history by merging consecutive
// operations from the same user. Reduces storage requirements and improves
// replay performance for collaborative editing sessions.
// Part of v0.19.0 - Operation Compaction
// =============================================================================

import { EventEmitter } from 'events';
import {
  EditOperationRecord,
  OperationType,
} from '@/types/collaboration-persistence';
import {
  IOperationCompactor,
  CompactionConfig,
  CompactionResult,
  CompactionStats,
  CompactionError,
  CompactionErrorCode,
  CompactionEstimate,
  CompactionEventType,
  CompactionEventData,
  MergeCheck,
  MergeBlockReason,
  MergeType,
  MergedOperation,
  TypeCompactionStats,
  createDefaultCompactionConfig,
  createInitialCompactionStats,
  createNoOpCompactionResult,
  isCompactableType,
  isSameUser,
  isSameSession,
  arePositionsAdjacent,
  areWithinTimeWindow,
  containsParagraphBoundary,
  estimateContentSize,
  calculateCompressionRatio,
  MAX_OPERATIONS_PER_COMPACTION,
  MIN_WORTHWHILE_COMPRESSION_RATIO,
} from '@/types/operation-compaction';

// -----------------------------------------------------------------------------
// Operation Compactor Service
// -----------------------------------------------------------------------------

/**
 * Service for compacting edit operation history
 */
export class OperationCompactorService implements IOperationCompactor {
  private config: CompactionConfig;
  private stats: CompactionStats;
  private emitter: EventEmitter;

  constructor(config?: Partial<CompactionConfig>) {
    this.config = {
      ...createDefaultCompactionConfig(),
      ...config,
    };
    this.stats = createInitialCompactionStats();
    this.emitter = new EventEmitter();
  }

  // ---------------------------------------------------------------------------
  // Core Compaction
  // ---------------------------------------------------------------------------

  /**
   * Compact a list of operations by merging consecutive operations
   */
  compact(operations: EditOperationRecord[]): CompactionResult {
    const startTime = performance.now();

    // Handle edge cases
    if (operations.length === 0) {
      return createNoOpCompactionResult([]);
    }

    if (operations.length < this.config.minOperationsThreshold) {
      return createNoOpCompactionResult(operations);
    }

    // Limit operations per run
    const opsToProcess = operations.slice(0, MAX_OPERATIONS_PER_COMPACTION);
    const sessionId = opsToProcess[0]?.sessionId || 'unknown';

    this.emit('compaction:started', {
      sessionId,
      operationCount: opsToProcess.length,
      config: this.config,
    });

    const errors: CompactionError[] = [];
    const compactedOps: EditOperationRecord[] = [];
    let mergeCount = 0;
    let processed = 0;

    // Sort operations by sequence number to ensure proper order
    const sortedOps = [...opsToProcess].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );

    let currentOp: EditOperationRecord | null = null;

    for (const nextOp of sortedOps) {
      processed++;

      // Emit progress periodically
      if (processed % 100 === 0) {
        this.emit('compaction:progress', {
          sessionId,
          processed,
          total: sortedOps.length,
          mergesSoFar: mergeCount,
        });
      }

      if (currentOp === null) {
        currentOp = nextOp;
        continue;
      }

      const mergeCheck = this.canMerge(currentOp, nextOp);

      if (mergeCheck.canMerge) {
        try {
          const merged = this.mergeOperations(currentOp, nextOp);
          currentOp = merged;
          mergeCount++;

          this.emit('merge:performed', {
            sessionId,
            sourceIds: merged.sourceOperationIds,
            mergeType: merged.mergeType,
            resultId: merged.operationId,
          });
        } catch (error) {
          // If merge fails, keep operations separate
          errors.push({
            operationIds: [currentOp.operationId, nextOp.operationId],
            code: 'MERGE_FAILED',
            message: error instanceof Error ? error.message : 'Unknown merge error',
            cause: error instanceof Error ? error : undefined,
          });

          this.emit('merge:skipped', {
            sessionId,
            operationIds: [currentOp.operationId, nextOp.operationId],
            reason: 'DIFFERENT_TYPES', // Generic fallback
          });

          compactedOps.push(currentOp);
          currentOp = nextOp;
        }
      } else {
        // Cannot merge, add current and move to next
        if (mergeCheck.reason) {
          this.emit('merge:skipped', {
            sessionId,
            operationIds: [currentOp.operationId, nextOp.operationId],
            reason: mergeCheck.reason,
          });
        }

        compactedOps.push(currentOp);
        currentOp = nextOp;
      }
    }

    // Add the last operation
    if (currentOp !== null) {
      compactedOps.push(currentOp);
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const result: CompactionResult = {
      compacted: mergeCount > 0,
      originalCount: sortedOps.length,
      compactedCount: compactedOps.length,
      mergedCount: mergeCount,
      compressionRatio: calculateCompressionRatio(sortedOps.length, compactedOps.length),
      durationMs,
      errors,
      operations: compactedOps,
    };

    // Update statistics
    this.updateStats(result, sortedOps);

    this.emit('compaction:completed', {
      sessionId,
      result,
    });

    return result;
  }

  // ---------------------------------------------------------------------------
  // Merge Checking
  // ---------------------------------------------------------------------------

  /**
   * Check if two operations can be merged
   */
  canMerge(op1: EditOperationRecord, op2: EditOperationRecord): MergeCheck {
    // Must be same session
    if (!isSameSession(op1, op2)) {
      return { canMerge: false, reason: 'DIFFERENT_SESSIONS' };
    }

    // Must be same user
    if (!isSameUser(op1, op2)) {
      return { canMerge: false, reason: 'DIFFERENT_USERS' };
    }

    // Must be compactable types
    if (!isCompactableType(op1.operationType, this.config)) {
      return { canMerge: false, reason: 'NON_COMPACTABLE_TYPE' };
    }

    if (!isCompactableType(op2.operationType, this.config)) {
      return { canMerge: false, reason: 'NON_COMPACTABLE_TYPE' };
    }

    // Must be same type (or compatible for compound)
    if (op1.operationType !== op2.operationType) {
      // Special case: can merge different types into COMPOUND
      if (op1.operationType === 'COMPOUND' || op2.operationType === 'COMPOUND') {
        return {
          canMerge: true,
          mergeType: 'ABSORB_COMPOUND',
          estimatedSavings: estimateContentSize(op1) + estimateContentSize(op2),
        };
      }
      return { canMerge: false, reason: 'DIFFERENT_TYPES' };
    }

    // Check time window
    if (!areWithinTimeWindow(op1, op2, this.config.maxTimeDeltaMs)) {
      return { canMerge: false, reason: 'TIME_GAP_TOO_LARGE' };
    }

    // Check sequence gap
    if (op2.sequenceNumber !== op1.sequenceNumber + 1) {
      return { canMerge: false, reason: 'SEQUENCE_GAP' };
    }

    // Check position adjacency for relevant types
    if (op1.operationType === 'INSERT' || op1.operationType === 'DELETE') {
      if (!arePositionsAdjacent(op1, op2, this.config.maxPositionGap)) {
        return { canMerge: false, reason: 'NON_ADJACENT' };
      }
    }

    // Check paragraph boundary if configured
    if (!this.config.compactAcrossParagraphs) {
      if (containsParagraphBoundary(op1.content) || containsParagraphBoundary(op2.content)) {
        return { canMerge: false, reason: 'PARAGRAPH_BOUNDARY' };
      }
    }

    // Check resulting content size
    const combinedSize = (op1.content?.length || 0) + (op2.content?.length || 0);
    if (combinedSize > this.config.maxCompactedContentLength) {
      return { canMerge: false, reason: 'CONTENT_TOO_LARGE' };
    }

    // Check status compatibility
    if (op1.status !== op2.status) {
      return { canMerge: false, reason: 'CONFLICTING_STATUS' };
    }

    // Determine merge type based on operation type
    const mergeType = this.determineMergeType(op1, op2);

    return {
      canMerge: true,
      mergeType,
      estimatedSavings: estimateContentSize(op2), // Savings from eliminating op2
    };
  }

  /**
   * Determine the type of merge to perform
   */
  private determineMergeType(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): MergeType {
    switch (op1.operationType) {
      case 'INSERT':
        // Check if inserting at end (append) or elsewhere
        const op1End = op1.position + (op1.content?.length || 0);
        if (op2.position === op1End) {
          return 'APPEND_INSERT';
        }
        return 'PREPEND_INSERT';

      case 'DELETE':
        // Check if forward delete or backspace
        if (op2.position === op1.position) {
          return 'EXTEND_DELETE';
        }
        return 'BACKSPACE_DELETE';

      case 'REPLACE':
        return 'COMBINE_REPLACE';

      case 'FORMAT':
        return 'MERGE_FORMAT';

      case 'COMPOUND':
        return 'ABSORB_COMPOUND';

      default:
        return 'APPEND_INSERT';
    }
  }

  // ---------------------------------------------------------------------------
  // Merge Operations
  // ---------------------------------------------------------------------------

  /**
   * Merge two operations into one
   */
  mergeOperations(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): MergedOperation {
    const mergeCheck = this.canMerge(op1, op2);
    
    if (!mergeCheck.canMerge) {
      throw new Error(`Cannot merge operations: ${mergeCheck.reason}`);
    }

    const mergeType = mergeCheck.mergeType!;

    // Calculate time span
    const t1 = op1.serverTimestamp.getTime();
    const t2 = op2.serverTimestamp.getTime();
    const timeSpanMs = Math.abs(t2 - t1);

    // Collect source operation IDs
    const sourceOperationIds: string[] = [];
    if (this.isMergedOperation(op1)) {
      sourceOperationIds.push(...op1.sourceOperationIds);
    } else {
      sourceOperationIds.push(op1.operationId);
    }
    if (this.isMergedOperation(op2)) {
      sourceOperationIds.push(...op2.sourceOperationIds);
    } else {
      sourceOperationIds.push(op2.operationId);
    }

    // Merge based on operation type
    let merged: EditOperationRecord;

    switch (mergeType) {
      case 'APPEND_INSERT':
        merged = this.mergeAppendInsert(op1, op2);
        break;
      case 'PREPEND_INSERT':
        merged = this.mergePrependInsert(op1, op2);
        break;
      case 'EXTEND_DELETE':
        merged = this.mergeExtendDelete(op1, op2);
        break;
      case 'BACKSPACE_DELETE':
        merged = this.mergeBackspaceDelete(op1, op2);
        break;
      case 'COMBINE_REPLACE':
        merged = this.mergeCombineReplace(op1, op2);
        break;
      case 'MERGE_FORMAT':
        merged = this.mergeFormat(op1, op2);
        break;
      case 'ABSORB_COMPOUND':
        merged = this.mergeCompound(op1, op2);
        break;
      default:
        throw new Error(`Unknown merge type: ${mergeType}`);
    }

    // Create merged operation with tracking info
    const result: MergedOperation = {
      ...merged,
      sourceOperationIds,
      mergeCount: sourceOperationIds.length,
      mergeType,
      timeSpanMs,
      isCompacted: true,
    };

    return result;
  }

  /**
   * Type guard for merged operations
   */
  private isMergedOperation(op: EditOperationRecord): op is MergedOperation {
    return 'isCompacted' in op && (op as MergedOperation).isCompacted === true;
  }

  /**
   * Merge two insert operations (append)
   */
  private mergeAppendInsert(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    return {
      ...op1,
      content: (op1.content || '') + (op2.content || ''),
      length: (op1.length || 0) + (op2.length || op2.content?.length || 0),
      sequenceNumber: op2.sequenceNumber, // Use latest sequence for chaining
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge two insert operations (prepend)
   */
  private mergePrependInsert(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    return {
      ...op1,
      position: op2.position,
      content: (op2.content || '') + (op1.content || ''),
      length: (op1.length || 0) + (op2.length || op2.content?.length || 0),
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge two delete operations (forward delete)
   */
  private mergeExtendDelete(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    return {
      ...op1,
      length: (op1.length || 1) + (op2.length || 1),
      previousContent: (op1.previousContent || '') + (op2.previousContent || ''),
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge two delete operations (backspace)
   */
  private mergeBackspaceDelete(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    return {
      ...op1,
      position: op2.position,
      length: (op1.length || 1) + (op2.length || 1),
      previousContent: (op2.previousContent || '') + (op1.previousContent || ''),
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge two replace operations
   */
  private mergeCombineReplace(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    // Keep original position and previousContent from op1,
    // use final content from op2
    return {
      ...op1,
      content: op2.content,
      length: op2.length,
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge two formatting operations
   */
  private mergeFormat(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    // For format operations, extend the range
    const start = Math.min(op1.position, op2.position);
    const end1 = op1.position + (op1.length || 0);
    const end2 = op2.position + (op2.length || 0);
    const end = Math.max(end1, end2);

    return {
      ...op1,
      position: start,
      length: end - start,
      content: op2.content, // Use latest formatting
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  /**
   * Merge into compound operation
   */
  private mergeCompound(
    op1: EditOperationRecord,
    op2: EditOperationRecord
  ): EditOperationRecord {
    // Create or extend compound operation
    const position = Math.min(op1.position, op2.position);
    const end1 = op1.position + (op1.length || 0);
    const end2 = op2.position + (op2.length || 0);
    const length = Math.max(end1, end2) - position;

    return {
      ...op1,
      operationType: 'COMPOUND',
      position,
      length,
      content: op2.content || op1.content,
      sequenceNumber: op2.sequenceNumber,
      resultVersion: op2.resultVersion,
      serverTimestamp: op2.serverTimestamp,
      appliedAt: op2.appliedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get compaction statistics
   */
  getStats(): CompactionStats {
    return { ...this.stats };
  }

  /**
   * Reset compaction statistics
   */
  resetStats(): void {
    this.stats = createInitialCompactionStats();
  }

  /**
   * Update statistics after a compaction run
   */
  private updateStats(
    result: CompactionResult,
    originalOps: EditOperationRecord[]
  ): void {
    this.stats.totalRuns++;
    this.stats.totalProcessed += result.originalCount;
    this.stats.totalCompacted += result.compactedCount;
    this.stats.errorCount += result.errors.length;

    // Calculate average compression ratio
    const totalRatio =
      this.stats.avgCompressionRatio * (this.stats.totalRuns - 1) +
      result.compressionRatio;
    this.stats.avgCompressionRatio = totalRatio / this.stats.totalRuns;

    // Estimate bytes saved
    const savedOps = result.originalCount - result.compactedCount;
    this.stats.totalBytesSaved += savedOps * 200; // Rough estimate per op

    // Update by-type stats
    for (const op of originalOps) {
      const typeStats = this.stats.byType[op.operationType];
      typeStats.processed++;
    }

    for (const op of result.operations) {
      const typeStats = this.stats.byType[op.operationType];
      typeStats.compacted++;
      if (this.isMergedOperation(op)) {
        typeStats.merges += op.mergeCount - 1;
      }
    }

    // Update by-user stats
    for (const op of originalOps) {
      this.stats.byUser[op.userId] = (this.stats.byUser[op.userId] || 0) + 1;
    }

    this.stats.lastCompactionAt = new Date();
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Set compaction threshold
   */
  setThreshold(threshold: number): void {
    if (threshold < 1) {
      throw new Error('Threshold must be at least 1');
    }
    this.config.minOperationsThreshold = threshold;
  }

  /**
   * Get current configuration
   */
  getConfig(): CompactionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CompactionConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  // ---------------------------------------------------------------------------
  // Estimation
  // ---------------------------------------------------------------------------

  /**
   * Estimate compaction savings without performing compaction
   */
  estimateSavings(operations: EditOperationRecord[]): CompactionEstimate {
    const mergeOpportunities: Record<MergeType, number> = {
      APPEND_INSERT: 0,
      PREPEND_INSERT: 0,
      EXTEND_DELETE: 0,
      BACKSPACE_DELETE: 0,
      COMBINE_REPLACE: 0,
      MERGE_FORMAT: 0,
      ABSORB_COMPOUND: 0,
    };

    let potentialMerges = 0;

    // Sort by sequence number
    const sortedOps = [...operations].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );

    for (let i = 0; i < sortedOps.length - 1; i++) {
      const check = this.canMerge(sortedOps[i], sortedOps[i + 1]);
      if (check.canMerge && check.mergeType) {
        potentialMerges++;
        mergeOpportunities[check.mergeType]++;
      }
    }

    const estimatedCount = operations.length - potentialMerges;
    const estimatedRatio = calculateCompressionRatio(
      operations.length,
      estimatedCount
    );

    return {
      currentCount: operations.length,
      estimatedCount,
      potentialMerges,
      estimatedRatio,
      mergeOpportunities,
    };
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to compaction events
   */
  on<E extends CompactionEventType>(
    event: E,
    handler: (data: CompactionEventData[E]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from compaction events
   */
  off<E extends CompactionEventType>(
    event: E,
    handler: (data: CompactionEventData[E]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  /**
   * Emit an event
   */
  private emit<E extends CompactionEventType>(
    event: E,
    data: CompactionEventData[E]
  ): void {
    this.emitter.emit(event, data);
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create an operation compactor service
 */
export function createOperationCompactor(
  config?: Partial<CompactionConfig>
): OperationCompactorService {
  return new OperationCompactorService(config);
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Check if compaction would be worthwhile for a set of operations
 */
export function isCompactionWorthwhile(
  operations: EditOperationRecord[],
  compactor: IOperationCompactor
): boolean {
  const estimate = compactor.estimateSavings(operations);
  return estimate.estimatedRatio <= MIN_WORTHWHILE_COMPRESSION_RATIO;
}

/**
 * Group operations by session for batch compaction
 */
export function groupOperationsBySession(
  operations: EditOperationRecord[]
): Map<string, EditOperationRecord[]> {
  const groups = new Map<string, EditOperationRecord[]>();

  for (const op of operations) {
    const existing = groups.get(op.sessionId);
    if (existing) {
      existing.push(op);
    } else {
      groups.set(op.sessionId, [op]);
    }
  }

  return groups;
}

/**
 * Group operations by user within a session
 */
export function groupOperationsByUser(
  operations: EditOperationRecord[]
): Map<string, EditOperationRecord[]> {
  const groups = new Map<string, EditOperationRecord[]>();

  for (const op of operations) {
    const existing = groups.get(op.userId);
    if (existing) {
      existing.push(op);
    } else {
      groups.set(op.userId, [op]);
    }
  }

  return groups;
}

/**
 * Flatten merged operations back to individual operations
 * Useful for undo history reconstruction
 */
export function expandMergedOperation(
  merged: MergedOperation,
  originalOps: EditOperationRecord[]
): EditOperationRecord[] {
  // Look up source operations by ID
  const sourceOps: EditOperationRecord[] = [];

  for (const id of merged.sourceOperationIds) {
    const op = originalOps.find((o) => o.operationId === id);
    if (op) {
      sourceOps.push(op);
    }
  }

  return sourceOps.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}
