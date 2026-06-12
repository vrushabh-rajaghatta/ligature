
/**
 * Conflict Detection Service
 * Detects conflicts during operational transform processing
 * 
 * v0.41.9 - Conflict Auto-Detection
 */

import { Operation, OperationType } from './operational-transform';

// =============================================================================
// TYPES
// =============================================================================

export type ConflictType = 
  | 'concurrent-edit'      // Same position, both editing
  | 'overlapping-delete'   // Delete ranges overlap
  | 'edit-in-deleted'      // Editing in deleted region
  | 'semantic'             // Content-level conflict (e.g., contradictory edits)
  | 'structural';          // Structure change conflict

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  position: number;
  length: number;
  localOperation: Operation;
  remoteOperation: Operation;
  description: string;
  suggestedResolution: 'keep-local' | 'keep-remote' | 'merge' | 'manual';
  context: {
    before: string;
    after: string;
    baseContent: string;
    localContent: string;
    remoteContent: string;
  };
  detectedAt: number;
  sectionId?: string;
}

export interface ConflictDetectionConfig {
  overlapThreshold: number;       // Chars proximity to consider conflict (default: 5)
  timeWindowMs: number;           // Time window for concurrent edits (default: 5000)
  enableSemanticDetection: boolean;
  ignoreWhitespaceConflicts: boolean;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DetectedConflict[];
  canAutoResolve: boolean;
  transformedOperation: Operation | null;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: ConflictDetectionConfig = {
  overlapThreshold: 5,
  timeWindowMs: 5000,
  enableSemanticDetection: true,
  ignoreWhitespaceConflicts: true,
};

// =============================================================================
// CONFLICT DETECTION SERVICE
// =============================================================================

export class ConflictDetectionService {
  private config: ConflictDetectionConfig;
  private conflictIdCounter = 0;

  constructor(config: Partial<ConflictDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Main Detection Method
  // ---------------------------------------------------------------------------

  /**
   * Detect conflicts between local and remote operations
   */
  detectConflicts(
    localOp: Operation,
    remoteOps: Operation[],
    content: string,
    sectionId?: string
  ): ConflictDetectionResult {
    const conflicts: DetectedConflict[] = [];
    let canAutoResolve = true;

    for (const remoteOp of Array.from(remoteOps)) {
      // Skip operations from same user
      if (remoteOp.userId === localOp.userId) continue;

      // Check time window
      const timeDiff = Math.abs(localOp.timestamp - remoteOp.timestamp);
      if (timeDiff > this.config.timeWindowMs) continue;

      // Detect different conflict types
      const conflict = this.checkForConflict(localOp, remoteOp, content, sectionId);
      
      if (conflict) {
        conflicts.push(conflict);
        if (conflict.severity === 'high' || conflict.severity === 'critical') {
          canAutoResolve = false;
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      canAutoResolve,
      transformedOperation: canAutoResolve ? localOp : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Conflict Check Methods
  // ---------------------------------------------------------------------------

  private checkForConflict(
    localOp: Operation,
    remoteOp: Operation,
    content: string,
    sectionId?: string
  ): DetectedConflict | null {
    // Check concurrent edit at same position
    const concurrentEdit = this.checkConcurrentEdit(localOp, remoteOp, content, sectionId);
    if (concurrentEdit) return concurrentEdit;

    // Check overlapping deletes
    const overlappingDelete = this.checkOverlappingDelete(localOp, remoteOp, content, sectionId);
    if (overlappingDelete) return overlappingDelete;

    // Check edit in deleted region
    const editInDeleted = this.checkEditInDeleted(localOp, remoteOp, content, sectionId);
    if (editInDeleted) return editInDeleted;

    // Check semantic conflicts
    if (this.config.enableSemanticDetection) {
      const semantic = this.checkSemanticConflict(localOp, remoteOp, content, sectionId);
      if (semantic) return semantic;
    }

    return null;
  }

  /**
   * Check for concurrent edits at same/nearby position
   */
  private checkConcurrentEdit(
    localOp: Operation,
    remoteOp: Operation,
    content: string,
    sectionId?: string
  ): DetectedConflict | null {
    // Both must be insert or replace operations
    if (localOp.type !== 'insert' && localOp.type !== 'delete') return null;
    if (remoteOp.type !== 'insert' && remoteOp.type !== 'delete') return null;

    // Check position overlap
    const localEnd = localOp.position + (localOp.content?.length || localOp.length || 0);
    const remoteEnd = remoteOp.position + (remoteOp.content?.length || remoteOp.length || 0);

    const overlap = this.rangesOverlap(
      localOp.position, localEnd,
      remoteOp.position, remoteEnd,
      this.config.overlapThreshold
    );

    if (!overlap) return null;

    // Determine severity
    let severity: ConflictSeverity = 'medium';
    if (localOp.type === 'insert' && remoteOp.type === 'insert' && 
        localOp.position === remoteOp.position) {
      severity = 'high'; // Exact same position insert
    }

    // Extract context
    const contextStart = Math.max(0, Math.min(localOp.position, remoteOp.position) - 30);
    const contextEnd = Math.min(content.length, Math.max(localEnd, remoteEnd) + 30);

    return {
      id: this.generateConflictId(),
      type: 'concurrent-edit',
      severity,
      position: Math.min(localOp.position, remoteOp.position),
      length: Math.max(localEnd, remoteEnd) - Math.min(localOp.position, remoteOp.position),
      localOperation: localOp,
      remoteOperation: remoteOp,
      description: `Concurrent edits at position ${localOp.position}`,
      suggestedResolution: severity === 'high' ? 'manual' : 'merge',
      context: {
        before: content.slice(contextStart, Math.min(localOp.position, remoteOp.position)),
        after: content.slice(Math.max(localEnd, remoteEnd), contextEnd),
        baseContent: content.slice(Math.min(localOp.position, remoteOp.position), Math.max(localEnd, remoteEnd)),
        localContent: localOp.content || '',
        remoteContent: remoteOp.content || '',
      },
      detectedAt: Date.now(),
      sectionId,
    };
  }

  /**
   * Check for overlapping delete operations
   */
  private checkOverlappingDelete(
    localOp: Operation,
    remoteOp: Operation,
    content: string,
    sectionId?: string
  ): DetectedConflict | null {
    if (localOp.type !== 'delete' || remoteOp.type !== 'delete') return null;

    const localEnd = localOp.position + (localOp.length || 0);
    const remoteEnd = remoteOp.position + (remoteOp.length || 0);

    const overlap = this.rangesOverlap(
      localOp.position, localEnd,
      remoteOp.position, remoteEnd,
      0 // Exact overlap only
    );

    if (!overlap) return null;

    // Calculate overlap amount
    const overlapStart = Math.max(localOp.position, remoteOp.position);
    const overlapEnd = Math.min(localEnd, remoteEnd);
    const overlapLength = overlapEnd - overlapStart;

    return {
      id: this.generateConflictId(),
      type: 'overlapping-delete',
      severity: 'low', // Usually auto-resolvable
      position: overlapStart,
      length: overlapLength,
      localOperation: localOp,
      remoteOperation: remoteOp,
      description: `Overlapping delete operations (${overlapLength} chars)`,
      suggestedResolution: 'merge', // Combined delete
      context: {
        before: content.slice(Math.max(0, Math.min(localOp.position, remoteOp.position) - 30), Math.min(localOp.position, remoteOp.position)),
        after: content.slice(Math.max(localEnd, remoteEnd), Math.min(content.length, Math.max(localEnd, remoteEnd) + 30)),
        baseContent: content.slice(Math.min(localOp.position, remoteOp.position), Math.max(localEnd, remoteEnd)),
        localContent: '',
        remoteContent: '',
      },
      detectedAt: Date.now(),
      sectionId,
    };
  }

  /**
   * Check if local edit is in a region deleted by remote
   */
  private checkEditInDeleted(
    localOp: Operation,
    remoteOp: Operation,
    content: string,
    sectionId?: string
  ): DetectedConflict | null {
    // Local is insert, remote is delete
    if (localOp.type !== 'insert' || remoteOp.type !== 'delete') return null;

    const deleteEnd = remoteOp.position + (remoteOp.length || 0);

    // Check if insert position is within deleted range
    if (localOp.position > remoteOp.position && localOp.position < deleteEnd) {
      return {
        id: this.generateConflictId(),
        type: 'edit-in-deleted',
        severity: 'high',
        position: localOp.position,
        length: localOp.content?.length || 0,
        localOperation: localOp,
        remoteOperation: remoteOp,
        description: 'Inserted text in region deleted by another user',
        suggestedResolution: 'manual',
        context: {
          before: content.slice(Math.max(0, remoteOp.position - 30), remoteOp.position),
          after: content.slice(deleteEnd, Math.min(content.length, deleteEnd + 30)),
          baseContent: content.slice(remoteOp.position, deleteEnd),
          localContent: localOp.content || '',
          remoteContent: '',
        },
        detectedAt: Date.now(),
        sectionId,
      };
    }

    return null;
  }

  /**
   * Check for semantic conflicts (content-level)
   */
  private checkSemanticConflict(
    localOp: Operation,
    remoteOp: Operation,
    content: string,
    sectionId?: string
  ): DetectedConflict | null {
    // Only check inserts
    if (localOp.type !== 'insert' || remoteOp.type !== 'insert') return null;
    if (!localOp.content || !remoteOp.content) return null;

    // Check if both inserting similar content at different positions
    // This could indicate duplicate work
    const similarity = this.calculateSimilarity(localOp.content, remoteOp.content);
    
    if (similarity > 0.7 && Math.abs(localOp.position - remoteOp.position) > 50) {
      return {
        id: this.generateConflictId(),
        type: 'semantic',
        severity: 'medium',
        position: Math.min(localOp.position, remoteOp.position),
        length: Math.max(localOp.content.length, remoteOp.content.length),
        localOperation: localOp,
        remoteOperation: remoteOp,
        description: 'Similar content being added in different locations',
        suggestedResolution: 'manual',
        context: {
          before: '',
          after: '',
          baseContent: '',
          localContent: localOp.content,
          remoteContent: remoteOp.content,
        },
        detectedAt: Date.now(),
        sectionId,
      };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private rangesOverlap(
    start1: number, end1: number,
    start2: number, end2: number,
    threshold: number
  ): boolean {
    return (start1 - threshold) < end2 && (start2 - threshold) < end1;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple Jaccard similarity on words
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return intersection.size / union.size;
  }

  private generateConflictId(): string {
    return `conflict-${Date.now()}-${++this.conflictIdCounter}`;
  }

  // ---------------------------------------------------------------------------
  // Resolution Helpers
  // ---------------------------------------------------------------------------

  /**
   * Suggest automatic resolution for a conflict
   */
  suggestResolution(conflict: DetectedConflict): {
    canAutoResolve: boolean;
    resolution: 'keep-local' | 'keep-remote' | 'merge' | 'manual';
    mergedContent?: string;
  } {
    switch (conflict.type) {
      case 'overlapping-delete':
        // Merge deletes - take union of deleted ranges
        return {
          canAutoResolve: true,
          resolution: 'merge',
        };

      case 'concurrent-edit':
        // If both inserting different content at same position
        if (conflict.severity === 'high') {
          return {
            canAutoResolve: false,
            resolution: 'manual',
          };
        }
        // Lower severity - can merge
        return {
          canAutoResolve: true,
          resolution: 'merge',
          mergedContent: conflict.context.localContent + conflict.context.remoteContent,
        };

      case 'edit-in-deleted':
        // Requires user decision
        return {
          canAutoResolve: false,
          resolution: 'manual',
        };

      case 'semantic':
        return {
          canAutoResolve: false,
          resolution: 'manual',
        };

      default:
        return {
          canAutoResolve: false,
          resolution: 'manual',
        };
    }
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useRef, useCallback } from 'react';

export function useConflictDetection(config?: Partial<ConflictDetectionConfig>) {
  const serviceRef = useRef<ConflictDetectionService | null>(null);
  
  if (!serviceRef.current) {
    serviceRef.current = new ConflictDetectionService(config);
  }

  const detectConflicts = useCallback((
    localOp: Operation,
    remoteOps: Operation[],
    content: string,
    sectionId?: string
  ) => {
    return serviceRef.current!.detectConflicts(localOp, remoteOps, content, sectionId);
  }, []);

  const suggestResolution = useCallback((conflict: DetectedConflict) => {
    return serviceRef.current!.suggestResolution(conflict);
  }, []);

  return {
    detectConflicts,
    suggestResolution,
  };
}

export default ConflictDetectionService;
