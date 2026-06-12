
/**
 * Operational Transform Engine
 * Handles concurrent edit conflict resolution for real-time collaboration
 * 
 * v0.41.6 - Operational Transforms
 */

// =============================================================================
// TYPES
// =============================================================================

export type OperationType = 'insert' | 'delete' | 'retain';

export interface Operation {
  id: string;
  type: OperationType;
  position: number;
  content?: string;    // For insert
  length?: number;     // For delete/retain
  attributes?: Record<string, any>; // For formatting
  userId: string;
  clientVersion: number;
  serverVersion: number;
  timestamp: number;
}

export interface TransformResult {
  operation: Operation;
  transformed: boolean;
  originalPosition?: number;
  originalLength?: number;
}

export interface DocumentState {
  content: string;
  version: number;
  operations: Operation[];
}

// =============================================================================
// OPERATION TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Transform operation A against operation B
 * Returns A' (A prime) - the transformed version of A
 * 
 * Key insight: if A and B were applied concurrently,
 * applying A then B' should give same result as B then A'
 */
export function transformOperation(opA: Operation, opB: Operation): Operation {
  const transformed = { ...opA };
  
  // Same position - need to decide priority
  // Use userId for deterministic ordering when positions match
  
  if (opA.type === 'insert' && opB.type === 'insert') {
    // Both inserts
    if (opB.position < opA.position) {
      // B inserted before A, shift A right
      transformed.position = opA.position + (opB.content?.length || 0);
    } else if (opB.position === opA.position) {
      // Same position - use userId for deterministic ordering
      if (opB.userId < opA.userId) {
        transformed.position = opA.position + (opB.content?.length || 0);
      }
    }
    // B inserted after A - no change needed
  }
  
  else if (opA.type === 'insert' && opB.type === 'delete') {
    // A inserts, B deletes
    const deleteEnd = opB.position + (opB.length || 0);
    
    if (opB.position >= opA.position) {
      // B deletes at or after A's insert position - no change
    } else if (deleteEnd <= opA.position) {
      // B's delete is entirely before A - shift A left
      transformed.position = opA.position - (opB.length || 0);
    } else {
      // B's delete spans A's position
      // A's insert point moves to start of delete
      transformed.position = opB.position;
    }
  }
  
  else if (opA.type === 'delete' && opB.type === 'insert') {
    // A deletes, B inserts
    if (opB.position <= opA.position) {
      // B inserted before or at A's delete position - shift A right
      transformed.position = opA.position + (opB.content?.length || 0);
    }
    // B inserted after A's delete position - no change
  }
  
  else if (opA.type === 'delete' && opB.type === 'delete') {
    // Both delete - need to handle overlaps
    const aEnd = opA.position + (opA.length || 0);
    const bEnd = opB.position + (opB.length || 0);
    
    if (bEnd <= opA.position) {
      // B's delete is entirely before A - shift A left
      transformed.position = opA.position - (opB.length || 0);
    } else if (opB.position >= aEnd) {
      // B's delete is entirely after A - no change
    } else if (opB.position <= opA.position && bEnd >= aEnd) {
      // B's delete entirely contains A's delete - A becomes no-op
      transformed.length = 0;
    } else if (opB.position <= opA.position && bEnd < aEnd) {
      // B overlaps start of A
      const overlap = bEnd - opA.position;
      transformed.position = opB.position;
      transformed.length = (opA.length || 0) - overlap;
    } else if (opB.position > opA.position && bEnd >= aEnd) {
      // B overlaps end of A
      const overlap = aEnd - opB.position;
      transformed.length = (opA.length || 0) - overlap;
    } else if (opB.position > opA.position && bEnd < aEnd) {
      // B's delete is inside A's delete
      transformed.length = (opA.length || 0) - (opB.length || 0);
    }
  }
  
  return transformed;
}

/**
 * Transform an operation against a sequence of operations
 */
export function transformAgainstOperations(op: Operation, operations: Operation[]): TransformResult {
  let current = { ...op };
  const originalPosition = op.position;
  const originalLength = op.length;
  let transformed = false;
  
  for (const existingOp of operations) {
    // Skip self
    if (existingOp.id === op.id) continue;
    
    // Only transform against operations with higher server version
    if (existingOp.serverVersion <= op.clientVersion) continue;
    
    const before = JSON.stringify(current);
    current = transformOperation(current, existingOp);
    
    if (JSON.stringify(current) !== before) {
      transformed = true;
    }
  }
  
  return {
    operation: current,
    transformed,
    originalPosition,
    originalLength,
  };
}

// =============================================================================
// DOCUMENT OPERATIONS
// =============================================================================

/**
 * Apply an operation to document content
 */
export function applyOperation(content: string, op: Operation): string {
  switch (op.type) {
    case 'insert':
      if (op.position < 0 || op.position > content.length) {
        throw new Error(`Invalid insert position: ${op.position}`);
      }
      return (
        content.slice(0, op.position) +
        (op.content || '') +
        content.slice(op.position)
      );
      
    case 'delete':
      const deleteEnd = op.position + (op.length || 0);
      if (op.position < 0 || deleteEnd > content.length) {
        throw new Error(`Invalid delete range: ${op.position}-${deleteEnd}`);
      }
      return content.slice(0, op.position) + content.slice(deleteEnd);
      
    case 'retain':
      // No content change, used for cursor/attribute operations
      return content;
      
    default:
      return content;
  }
}

/**
 * Apply a sequence of operations to content
 */
export function applyOperations(content: string, operations: Operation[]): string {
  let result = content;
  for (const op of operations) {
    result = applyOperation(result, op);
  }
  return result;
}

// =============================================================================
// OPERATION COMPOSITION
// =============================================================================

/**
 * Compose two operations into a single operation where possible
 */
export function composeOperations(opA: Operation, opB: Operation): Operation | null {
  // Can only compose consecutive operations from same user
  if (opA.userId !== opB.userId) return null;
  
  // Insert + Insert (adjacent)
  if (opA.type === 'insert' && opB.type === 'insert') {
    const aEnd = opA.position + (opA.content?.length || 0);
    if (opB.position === aEnd) {
      return {
        ...opA,
        content: (opA.content || '') + (opB.content || ''),
        serverVersion: opB.serverVersion,
      };
    }
  }
  
  // Delete + Delete (adjacent)
  if (opA.type === 'delete' && opB.type === 'delete') {
    if (opB.position === opA.position) {
      // Forward delete
      return {
        ...opA,
        length: (opA.length || 0) + (opB.length || 0),
        serverVersion: opB.serverVersion,
      };
    }
    if (opB.position + (opB.length || 0) === opA.position) {
      // Backward delete
      return {
        ...opB,
        length: (opA.length || 0) + (opB.length || 0),
        serverVersion: opB.serverVersion,
      };
    }
  }
  
  // Insert + Delete (undo)
  if (opA.type === 'insert' && opB.type === 'delete') {
    if (opB.position === opA.position && opB.length === opA.content?.length) {
      // Complete undo - return no-op
      return {
        ...opA,
        type: 'retain',
        content: undefined,
        length: 0,
        serverVersion: opB.serverVersion,
      };
    }
  }
  
  return null; // Cannot compose
}

// =============================================================================
// OPERATION INVERSION
// =============================================================================

/**
 * Create the inverse of an operation (for undo)
 */
export function invertOperation(op: Operation, content: string): Operation {
  switch (op.type) {
    case 'insert':
      return {
        ...op,
        type: 'delete',
        content: undefined,
        length: op.content?.length || 0,
      };
      
    case 'delete':
      const deletedContent = content.slice(op.position, op.position + (op.length || 0));
      return {
        ...op,
        type: 'insert',
        content: deletedContent,
        length: undefined,
      };
      
    case 'retain':
      return op; // Retain is its own inverse
      
    default:
      return op;
  }
}

// =============================================================================
// OPERATION VALIDATION
// =============================================================================

/**
 * Validate an operation against current document state
 */
export function validateOperation(op: Operation, contentLength: number): { valid: boolean; error?: string } {
  if (op.position < 0) {
    return { valid: false, error: 'Position cannot be negative' };
  }
  
  switch (op.type) {
    case 'insert':
      if (op.position > contentLength) {
        return { valid: false, error: `Insert position ${op.position} exceeds content length ${contentLength}` };
      }
      if (!op.content) {
        return { valid: false, error: 'Insert operation requires content' };
      }
      break;
      
    case 'delete':
      if (!op.length || op.length <= 0) {
        return { valid: false, error: 'Delete operation requires positive length' };
      }
      if (op.position + op.length > contentLength) {
        return { valid: false, error: `Delete range exceeds content length` };
      }
      break;
  }
  
  return { valid: true };
}

// =============================================================================
// OPERATION FACTORY
// =============================================================================

let operationCounter = 0;

export function createOperation(params: {
  type: OperationType;
  position: number;
  content?: string;
  length?: number;
  userId: string;
  clientVersion: number;
  serverVersion?: number;
  attributes?: Record<string, any>;
}): Operation {
  return {
    id: `op-${Date.now()}-${++operationCounter}`,
    type: params.type,
    position: params.position,
    content: params.content,
    length: params.length,
    userId: params.userId,
    clientVersion: params.clientVersion,
    serverVersion: params.serverVersion || params.clientVersion,
    attributes: params.attributes,
    timestamp: Date.now(),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const OT = {
  transform: transformOperation,
  transformAgainst: transformAgainstOperations,
  apply: applyOperation,
  applyAll: applyOperations,
  compose: composeOperations,
  invert: invertOperation,
  validate: validateOperation,
  create: createOperation,
};

export default OT;
