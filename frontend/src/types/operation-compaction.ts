
// =============================================================================
// OPERATION COMPACTION TYPES
// =============================================================================
// TypeScript types for operation compaction and history optimization.
// Enables efficient storage by merging consecutive operations.
// Part of v0.19.0 - Operation Compaction
// =============================================================================

import {
  EditOperationRecord,
  OperationType,
  OperationStatus,
} from './collaboration-persistence';

// -----------------------------------------------------------------------------
// Compaction Configuration
// -----------------------------------------------------------------------------

/**
 * Configuration for operation compaction behavior
 */
export interface CompactionConfig {
  /**
   * Minimum number of operations before compaction triggers
   * @default 100
   */
  minOperationsThreshold: number;

  /**
   * Maximum time window (ms) for merging operations
   * Operations further apart than this won't be merged
   * @default 5000
   */
  maxTimeDeltaMs: number;

  /**
   * Maximum position gap for merging operations
   * @default 0 (must be adjacent)
   */
  maxPositionGap: number;

  /**
   * Whether to compact formatting operations
   * @default true
   */
  compactFormatting: boolean;

  /**
   * Whether to compact across paragraph boundaries
   * @default false
   */
  compactAcrossParagraphs: boolean;

  /**
   * Maximum content length for a single compacted operation
   * @default 10000
   */
  maxCompactedContentLength: number;

  /**
   * Preserve individual operations for undo history
   * When true, original operations are stored separately
   * @default false
   */
  preserveUndoHistory: boolean;

  /**
   * Types of operations that can be compacted
   */
  compactableTypes: OperationType[];
}

/**
 * Result of a compaction operation
 */
export interface CompactionResult {
  /**
   * Whether compaction was performed
   */
  compacted: boolean;

  /**
   * Original number of operations
   */
  originalCount: number;

  /**
   * Number of operations after compaction
   */
  compactedCount: number;

  /**
   * Number of operations merged
   */
  mergedCount: number;

  /**
   * Compression ratio (compactedCount / originalCount)
   */
  compressionRatio: number;

  /**
   * Time taken to compact (ms)
   */
  durationMs: number;

  /**
   * Errors encountered during compaction
   */
  errors: CompactionError[];

  /**
   * Compacted operations
   */
  operations: EditOperationRecord[];
}

/**
 * Error during compaction
 */
export interface CompactionError {
  /**
   * Operation IDs involved
   */
  operationIds: string[];

  /**
   * Error code
   */
  code: CompactionErrorCode;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Original error if any
   */
  cause?: Error;
}

/**
 * Compaction error codes
 */
export type CompactionErrorCode =
  | 'MERGE_FAILED'
  | 'INVALID_OPERATION'
  | 'SEQUENCE_GAP'
  | 'VERSION_MISMATCH'
  | 'CONTENT_TOO_LARGE'
  | 'TYPE_INCOMPATIBLE';

// -----------------------------------------------------------------------------
// Compaction Statistics
// -----------------------------------------------------------------------------

/**
 * Statistics from compaction operations
 */
export interface CompactionStats {
  /**
   * Total compaction runs
   */
  totalRuns: number;

  /**
   * Total operations processed
   */
  totalProcessed: number;

  /**
   * Total operations after compaction
   */
  totalCompacted: number;

  /**
   * Total space savings (estimated bytes)
   */
  totalBytesSaved: number;

  /**
   * Average compression ratio
   */
  avgCompressionRatio: number;

  /**
   * Breakdown by operation type
   */
  byType: Record<OperationType, TypeCompactionStats>;

  /**
   * Breakdown by user
   */
  byUser: Record<string, number>;

  /**
   * Last compaction timestamp
   */
  lastCompactionAt?: Date;

  /**
   * Error count
   */
  errorCount: number;
}

/**
 * Stats for a specific operation type
 */
export interface TypeCompactionStats {
  /**
   * Operations of this type processed
   */
  processed: number;

  /**
   * Operations of this type after compaction
   */
  compacted: number;

  /**
   * Number of merge operations performed
   */
  merges: number;
}

// -----------------------------------------------------------------------------
// Merge Decision Types
// -----------------------------------------------------------------------------

/**
 * Result of checking if two operations can merge
 */
export interface MergeCheck {
  /**
   * Whether operations can be merged
   */
  canMerge: boolean;

  /**
   * Reason if cannot merge
   */
  reason?: MergeBlockReason;

  /**
   * Type of merge that would be performed
   */
  mergeType?: MergeType;

  /**
   * Estimated space savings from merge
   */
  estimatedSavings?: number;
}

/**
 * Reasons why operations cannot be merged
 */
export type MergeBlockReason =
  | 'DIFFERENT_USERS'
  | 'DIFFERENT_TYPES'
  | 'NON_ADJACENT'
  | 'TIME_GAP_TOO_LARGE'
  | 'DIFFERENT_SESSIONS'
  | 'CONFLICTING_STATUS'
  | 'CONTENT_TOO_LARGE'
  | 'FORMATTING_DIFFERS'
  | 'PARAGRAPH_BOUNDARY'
  | 'NON_COMPACTABLE_TYPE'
  | 'SEQUENCE_GAP';

/**
 * Type of merge operation
 */
export type MergeType =
  | 'APPEND_INSERT'      // Consecutive inserts, append content
  | 'PREPEND_INSERT'     // Insert before previous insert
  | 'EXTEND_DELETE'      // Extend delete range forward
  | 'BACKSPACE_DELETE'   // Extend delete range backward
  | 'COMBINE_REPLACE'    // Combine replace operations
  | 'MERGE_FORMAT'       // Merge formatting operations
  | 'ABSORB_COMPOUND';   // Merge into compound operation

// -----------------------------------------------------------------------------
// Merged Operation
// -----------------------------------------------------------------------------

/**
 * A merged operation with tracking of source operations
 */
export interface MergedOperation extends EditOperationRecord {
  /**
   * IDs of operations that were merged
   */
  sourceOperationIds: string[];

  /**
   * Number of operations merged
   */
  mergeCount: number;

  /**
   * Type of merge performed
   */
  mergeType: MergeType;

  /**
   * Time span of merged operations
   */
  timeSpanMs: number;

  /**
   * Whether this is a compacted operation
   */
  isCompacted: true;
}

/**
 * Type guard for merged operation
 */
export function isMergedOperation(op: EditOperationRecord): op is MergedOperation {
  return 'isCompacted' in op && (op as MergedOperation).isCompacted === true;
}

// -----------------------------------------------------------------------------
// Compaction Events
// -----------------------------------------------------------------------------

/**
 * Events emitted during compaction
 */
export type CompactionEventType =
  | 'compaction:started'
  | 'compaction:progress'
  | 'compaction:completed'
  | 'compaction:failed'
  | 'merge:performed'
  | 'merge:skipped';

/**
 * Event data for compaction events
 */
export interface CompactionEventData {
  'compaction:started': {
    sessionId: string;
    operationCount: number;
    config: CompactionConfig;
  };
  'compaction:progress': {
    sessionId: string;
    processed: number;
    total: number;
    mergesSoFar: number;
  };
  'compaction:completed': {
    sessionId: string;
    result: CompactionResult;
  };
  'compaction:failed': {
    sessionId: string;
    error: Error;
    processedSoFar: number;
  };
  'merge:performed': {
    sessionId: string;
    sourceIds: string[];
    mergeType: MergeType;
    resultId: string;
  };
  'merge:skipped': {
    sessionId: string;
    operationIds: [string, string];
    reason: MergeBlockReason;
  };
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * Interface for operation compaction service
 */
export interface IOperationCompactor {
  /**
   * Compact a list of operations
   */
  compact(operations: EditOperationRecord[]): CompactionResult;

  /**
   * Check if two operations can be merged
   */
  canMerge(op1: EditOperationRecord, op2: EditOperationRecord): MergeCheck;

  /**
   * Merge two operations into one
   */
  mergeOperations(op1: EditOperationRecord, op2: EditOperationRecord): MergedOperation;

  /**
   * Get compaction statistics
   */
  getStats(): CompactionStats;

  /**
   * Reset compaction statistics
   */
  resetStats(): void;

  /**
   * Set compaction threshold
   */
  setThreshold(threshold: number): void;

  /**
   * Get current configuration
   */
  getConfig(): CompactionConfig;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CompactionConfig>): void;

  /**
   * Estimate compaction savings without performing compaction
   */
  estimateSavings(operations: EditOperationRecord[]): CompactionEstimate;

  /**
   * Subscribe to compaction events
   */
  on<E extends CompactionEventType>(
    event: E,
    handler: (data: CompactionEventData[E]) => void
  ): void;

  /**
   * Unsubscribe from compaction events
   */
  off<E extends CompactionEventType>(
    event: E,
    handler: (data: CompactionEventData[E]) => void
  ): void;
}

/**
 * Estimate of compaction savings
 */
export interface CompactionEstimate {
  /**
   * Current operation count
   */
  currentCount: number;

  /**
   * Estimated count after compaction
   */
  estimatedCount: number;

  /**
   * Number of potential merges identified
   */
  potentialMerges: number;

  /**
   * Estimated compression ratio
   */
  estimatedRatio: number;

  /**
   * Breakdown of merge opportunities by type
   */
  mergeOpportunities: Record<MergeType, number>;
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create default compaction configuration
 */
export function createDefaultCompactionConfig(): CompactionConfig {
  return {
    minOperationsThreshold: 100,
    maxTimeDeltaMs: 5000,
    maxPositionGap: 0,
    compactFormatting: true,
    compactAcrossParagraphs: false,
    maxCompactedContentLength: 10000,
    preserveUndoHistory: false,
    compactableTypes: ['INSERT', 'DELETE', 'REPLACE', 'FORMAT'],
  };
}

/**
 * Create initial compaction stats
 */
export function createInitialCompactionStats(): CompactionStats {
  return {
    totalRuns: 0,
    totalProcessed: 0,
    totalCompacted: 0,
    totalBytesSaved: 0,
    avgCompressionRatio: 1,
    byType: {
      INSERT: { processed: 0, compacted: 0, merges: 0 },
      DELETE: { processed: 0, compacted: 0, merges: 0 },
      REPLACE: { processed: 0, compacted: 0, merges: 0 },
      FORMAT: { processed: 0, compacted: 0, merges: 0 },
      MOVE: { processed: 0, compacted: 0, merges: 0 },
      COMPOUND: { processed: 0, compacted: 0, merges: 0 },
    },
    byUser: {},
    errorCount: 0,
  };
}

/**
 * Create compaction result for no-op (no compaction performed)
 */
export function createNoOpCompactionResult(operations: EditOperationRecord[]): CompactionResult {
  return {
    compacted: false,
    originalCount: operations.length,
    compactedCount: operations.length,
    mergedCount: 0,
    compressionRatio: 1,
    durationMs: 0,
    errors: [],
    operations,
  };
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Check if an operation type can be compacted
 */
export function isCompactableType(
  type: OperationType,
  config: CompactionConfig
): boolean {
  return config.compactableTypes.includes(type);
}

/**
 * Check if operations are from the same user
 */
export function isSameUser(op1: EditOperationRecord, op2: EditOperationRecord): boolean {
  return op1.userId === op2.userId;
}

/**
 * Check if operations are from the same session
 */
export function isSameSession(op1: EditOperationRecord, op2: EditOperationRecord): boolean {
  return op1.sessionId === op2.sessionId;
}

/**
 * Check if operations are adjacent in position
 */
export function arePositionsAdjacent(
  op1: EditOperationRecord,
  op2: EditOperationRecord,
  maxGap: number = 0
): boolean {
  // For inserts: next position should be at end of previous insert
  if (op1.operationType === 'INSERT' && op2.operationType === 'INSERT') {
    const op1End = op1.position + (op1.content?.length || 0);
    return Math.abs(op2.position - op1End) <= maxGap;
  }
  
  // For deletes: positions should be adjacent or same (backspace vs forward delete)
  if (op1.operationType === 'DELETE' && op2.operationType === 'DELETE') {
    // Forward delete at same position
    if (op2.position === op1.position) return true;
    // Backspace delete (position decrements)
    if (op2.position === op1.position - (op2.length || 1)) return true;
    // Adjacent delete
    const op1End = op1.position + (op1.length || 0);
    return Math.abs(op2.position - op1End) <= maxGap;
  }
  
  return false;
}

/**
 * Check if operations are within time window
 */
export function areWithinTimeWindow(
  op1: EditOperationRecord,
  op2: EditOperationRecord,
  maxDeltaMs: number
): boolean {
  const t1 = op1.serverTimestamp.getTime();
  const t2 = op2.serverTimestamp.getTime();
  return Math.abs(t2 - t1) <= maxDeltaMs;
}

/**
 * Check if content contains paragraph boundary
 */
export function containsParagraphBoundary(content: string | undefined): boolean {
  if (!content) return false;
  return content.includes('\n\n') || content.includes('\r\n\r\n');
}

/**
 * Estimate content size in bytes
 */
export function estimateContentSize(op: EditOperationRecord): number {
  let size = 0;
  if (op.content) size += op.content.length * 2; // UTF-16
  if (op.previousContent) size += op.previousContent.length * 2;
  return size;
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalCount: number,
  compactedCount: number
): number {
  if (originalCount === 0) return 1;
  return compactedCount / originalCount;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Default minimum operations threshold for compaction
 */
export const DEFAULT_MIN_OPERATIONS_THRESHOLD = 100;

/**
 * Default maximum time delta for merging (5 seconds)
 */
export const DEFAULT_MAX_TIME_DELTA_MS = 5000;

/**
 * Default maximum compacted content length
 */
export const DEFAULT_MAX_COMPACTED_CONTENT_LENGTH = 10000;

/**
 * Maximum number of operations to compact in a single run
 */
export const MAX_OPERATIONS_PER_COMPACTION = 10000;

/**
 * Minimum compression ratio to consider compaction worthwhile
 */
export const MIN_WORTHWHILE_COMPRESSION_RATIO = 0.9;
