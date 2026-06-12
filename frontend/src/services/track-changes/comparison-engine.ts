
// =============================================================================
// Comparison Engine
// =============================================================================
// Word-level diff algorithm for comparing documents and generating change lists.
// Uses a modified longest common subsequence (LCS) approach optimized for
// document comparison.
// =============================================================================

import type {
  DiffSegment,
  DetectedChange,
  DocumentComparison,
  RevisionGranularity,
} from '@/types/track-changes';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Token representing a unit of comparison
 */
export interface ComparisonToken {
  value: string;
  type: 'word' | 'punctuation' | 'whitespace' | 'newline';
  index: number;
  originalPosition: number;
}

/**
 * Diff operation type
 */
export type DiffOperation = 'equal' | 'insert' | 'delete';

/**
 * Raw diff result
 */
export interface DiffResult {
  operations: DiffOperation[];
  originalTokens: ComparisonToken[];
  modifiedTokens: ComparisonToken[];
}

/**
 * Comparison options
 */
export interface ComparisonOptions {
  granularity: RevisionGranularity;
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  ignoreFormatting?: boolean;
  contextLines?: number;
}

/**
 * Section for comparison
 */
export interface ComparisonSection {
  sectionNumber: string;
  sectionTitle: string;
  content: string;
}

// -----------------------------------------------------------------------------
// Default Options
// -----------------------------------------------------------------------------

export const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  granularity: 'word',
  ignoreCase: false,
  ignoreWhitespace: false,
  ignoreFormatting: false,
  contextLines: 3,
};

// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------

/**
 * Tokenize text into comparison units
 */
export function tokenize(
  text: string,
  granularity: RevisionGranularity = 'word'
): ComparisonToken[] {
  const tokens: ComparisonToken[] = [];
  let position = 0;
  let index = 0;

  if (granularity === 'character') {
    // Character-level tokenization
    for (const char of Array.from(text)) {
      let type: ComparisonToken['type'] = 'word';
      if (/\s/.test(char)) {
        type = char === '\n' ? 'newline' : 'whitespace';
      } else if (/[.,;:!?'"()[\]{}]/.test(char)) {
        type = 'punctuation';
      }
      tokens.push({ value: char, type, index: index++, originalPosition: position });
      position += char.length;
    }
  } else if (granularity === 'sentence') {
    // Sentence-level tokenization
    const sentencePattern = /([^.!?]+[.!?]+\s*)/g;
    let match: RegExpExecArray | null;
    while ((match = sentencePattern.exec(text)) !== null) {
      tokens.push({
        value: match[1],
        type: 'word',
        index: index++,
        originalPosition: match.index,
      });
    }
    // Handle remaining text without sentence-ending punctuation
    const lastIndex = sentencePattern.lastIndex;
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining.trim()) {
        tokens.push({
          value: remaining,
          type: 'word',
          index: index++,
          originalPosition: lastIndex,
        });
      }
    }
  } else if (granularity === 'paragraph') {
    // Paragraph-level tokenization
    const paragraphs = text.split(/\n\s*\n/);
    let currentPosition = 0;
    for (const para of Array.from(paragraphs)) {
      if (para.trim()) {
        tokens.push({
          value: para.trim(),
          type: 'word',
          index: index++,
          originalPosition: currentPosition,
        });
      }
      currentPosition += para.length + 2; // Account for paragraph break
    }
  } else {
    // Word-level tokenization (default)
    const wordPattern = /(\S+|\s+)/g;
    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(text)) !== null) {
      const value = match[1];
      let type: ComparisonToken['type'];
      if (/^\s+$/.test(value)) {
        type = value.includes('\n') ? 'newline' : 'whitespace';
      } else if (/^[.,;:!?'"()[\]{}]+$/.test(value)) {
        type = 'punctuation';
      } else {
        type = 'word';
      }
      tokens.push({
        value,
        type,
        index: index++,
        originalPosition: match.index,
      });
    }
  }

  return tokens;
}

// -----------------------------------------------------------------------------
// Diff Algorithm
// -----------------------------------------------------------------------------

/**
 * Compute the longest common subsequence length matrix
 */
function computeLCSMatrix(
  original: ComparisonToken[],
  modified: ComparisonToken[],
  ignoreCase: boolean
): number[][] {
  const m = original.length;
  const n = modified.length;
  
  // Initialize matrix
  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const origValue = ignoreCase 
        ? original[i - 1].value.toLowerCase() 
        : original[i - 1].value;
      const modValue = ignoreCase 
        ? modified[j - 1].value.toLowerCase() 
        : modified[j - 1].value;
      
      if (origValue === modValue) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }
  
  return matrix;
}

/**
 * Backtrack through LCS matrix to generate diff operations
 */
function backtrackDiff(
  matrix: number[][],
  original: ComparisonToken[],
  modified: ComparisonToken[],
  ignoreCase: boolean
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let i = original.length;
  let j = modified.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const origValue = ignoreCase 
        ? original[i - 1].value.toLowerCase() 
        : original[i - 1].value;
      const modValue = ignoreCase 
        ? modified[j - 1].value.toLowerCase() 
        : modified[j - 1].value;
      
      if (origValue === modValue) {
        operations.unshift('equal');
        i--;
        j--;
      } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
        operations.unshift('delete');
        i--;
      } else {
        operations.unshift('insert');
        j--;
      }
    } else if (i > 0) {
      operations.unshift('delete');
      i--;
    } else {
      operations.unshift('insert');
      j--;
    }
  }
  
  return operations;
}

/**
 * Compute diff between two texts
 */
export function computeDiff(
  originalText: string,
  modifiedText: string,
  options: Partial<ComparisonOptions> = {}
): DiffResult {
  const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };
  
  const originalTokens = tokenize(originalText, opts.granularity);
  const modifiedTokens = tokenize(modifiedText, opts.granularity);
  
  const matrix = computeLCSMatrix(
    originalTokens,
    modifiedTokens,
    opts.ignoreCase ?? false
  );
  
  const operations = backtrackDiff(
    matrix,
    originalTokens,
    modifiedTokens,
    opts.ignoreCase ?? false
  );
  
  return {
    operations,
    originalTokens,
    modifiedTokens,
  };
}

/**
 * Convert diff result to segments
 */
export function diffToSegments(diff: DiffResult): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let origIndex = 0;
  let modIndex = 0;
  
  let currentSegment: DiffSegment | null = null;
  
  for (const op of Array.from(diff.operations)) {
    if (op === 'equal') {
      const token = diff.modifiedTokens[modIndex];
      if (!token) {
        origIndex++;
        modIndex++;
        continue;
      }
      
      if (currentSegment && currentSegment.type === 'equal') {
        currentSegment.text += token.value;
      } else {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = { type: 'equal', text: token.value };
      }
      
      origIndex++;
      modIndex++;
    } else if (op === 'delete') {
      const token = diff.originalTokens[origIndex];
      if (!token) {
        origIndex++;
        continue;
      }
      
      if (currentSegment && currentSegment.type === 'delete') {
        currentSegment.text += token.value;
      } else {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = { type: 'delete', text: token.value };
      }
      
      origIndex++;
    } else if (op === 'insert') {
      const token = diff.modifiedTokens[modIndex];
      if (!token) {
        modIndex++;
        continue;
      }
      
      if (currentSegment && currentSegment.type === 'insert') {
        currentSegment.text += token.value;
      } else {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = { type: 'insert', text: token.value };
      }
      
      modIndex++;
    }
  }
  
  // Flush final segment
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
}

// -----------------------------------------------------------------------------
// High-Level Comparison Functions
// -----------------------------------------------------------------------------

/**
 * Compare two sections and detect changes
 */
export function compareSections(
  original: ComparisonSection,
  modified: ComparisonSection,
  options: Partial<ComparisonOptions> = {}
): DetectedChange | null {
  const diff = computeDiff(original.content, modified.content, options);
  const segments = diffToSegments(diff);
  
  // Check if there are any actual changes
  const hasChanges = segments.some(s => s.type !== 'equal');
  if (!hasChanges) {
    return null;
  }
  
  // Determine change type
  const hasInsertions = segments.some(s => s.type === 'insert');
  const hasDeletions = segments.some(s => s.type === 'delete');
  
  let type: DetectedChange['type'];
  if (hasInsertions && hasDeletions) {
    type = 'modified';
  } else if (hasInsertions) {
    type = 'added';
  } else {
    type = 'removed';
  }
  
  // Calculate significance
  const totalOriginal = original.content.length;
  const changedChars = segments
    .filter(s => s.type !== 'equal')
    .reduce((sum, s) => sum + s.text.length, 0);
  
  const changeRatio = totalOriginal > 0 ? changedChars / totalOriginal : 1;
  
  let significance: DetectedChange['significance'];
  if (changeRatio < 0.1) {
    significance = 'minor';
  } else if (changeRatio < 0.5) {
    significance = 'moderate';
  } else {
    significance = 'major';
  }
  
  return {
    type,
    section: original.sectionNumber || modified.sectionNumber,
    originalContent: original.content,
    newContent: modified.content,
    diff: segments,
    significance,
  };
}

/**
 * Compare full documents and generate comparison result
 */
export function compareDocuments(
  originalSections: ComparisonSection[],
  modifiedSections: ComparisonSection[],
  options: Partial<ComparisonOptions> = {}
): DocumentComparison {
  const changes: DetectedChange[] = [];
  const changedSections: string[] = [];
  const unchangedSections: string[] = [];
  
  // Build section maps
  const originalMap = new Map<string, ComparisonSection>();
  const modifiedMap = new Map<string, ComparisonSection>();
  
  for (const section of Array.from(originalSections)) {
    originalMap.set(section.sectionNumber, section);
  }
  for (const section of Array.from(modifiedSections)) {
    modifiedMap.set(section.sectionNumber, section);
  }
  
  // Find all unique section numbers
  const allSections = new Set([
    ...Array.from(originalMap.keys()),
    ...Array.from(modifiedMap.keys()),
  ]);
  
  // Compare each section
  for (const sectionNum of Array.from(allSections)) {
    const original = originalMap.get(sectionNum);
    const modified = modifiedMap.get(sectionNum);
    
    if (!original && modified) {
      // New section
      changes.push({
        type: 'added',
        section: sectionNum,
        newContent: modified.content,
        significance: 'major',
      });
      changedSections.push(sectionNum);
    } else if (original && !modified) {
      // Removed section
      changes.push({
        type: 'removed',
        section: sectionNum,
        originalContent: original.content,
        significance: 'major',
      });
      changedSections.push(sectionNum);
    } else if (original && modified) {
      // Compare existing sections
      const change = compareSections(original, modified, options);
      if (change) {
        changes.push(change);
        changedSections.push(sectionNum);
      } else {
        unchangedSections.push(sectionNum);
      }
    }
  }
  
  // Calculate similarity score
  const totalSections = allSections.size;
  const unchangedCount = unchangedSections.length;
  const similarityScore = totalSections > 0 ? unchangedCount / totalSections : 1;
  
  return {
    originalDocumentId: 'original',
    modifiedDocumentId: 'modified',
    comparedAt: new Date(),
    changes,
    similarityScore,
    changedSections,
    unchangedSections,
  };
}

/**
 * Quick similarity check (faster than full comparison)
 */
export function calculateSimilarity(
  text1: string,
  text2: string,
  options: Partial<ComparisonOptions> = {}
): number {
  if (text1 === text2) return 1;
  if (!text1 || !text2) return 0;
  
  const diff = computeDiff(text1, text2, options);
  const equalCount = diff.operations.filter(op => op === 'equal').length;
  const totalOps = diff.operations.length;
  
  return totalOps > 0 ? equalCount / totalOps : 0;
}

/**
 * Extract text content from diff segments
 */
export function getInsertedText(segments: DiffSegment[]): string {
  return segments
    .filter(s => s.type === 'insert')
    .map(s => s.text)
    .join('');
}

/**
 * Extract deleted text from diff segments
 */
export function getDeletedText(segments: DiffSegment[]): string {
  return segments
    .filter(s => s.type === 'delete')
    .map(s => s.text)
    .join('');
}

/**
 * Get unchanged text from diff segments
 */
export function getUnchangedText(segments: DiffSegment[]): string {
  return segments
    .filter(s => s.type === 'equal')
    .map(s => s.text)
    .join('');
}

// -----------------------------------------------------------------------------
// Merge Functions
// -----------------------------------------------------------------------------

/**
 * Merge diff segments (combine adjacent segments of same type)
 */
export function mergeAdjacentSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return [];
  
  const merged: DiffSegment[] = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.type === current.type) {
      current.text += segment.text;
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Split long segments for better readability
 */
export function splitLongSegments(
  segments: DiffSegment[],
  maxLength: number = 100
): DiffSegment[] {
  const result: DiffSegment[] = [];
  
  for (const segment of Array.from(segments)) {
    if (segment.text.length <= maxLength || segment.type === 'equal') {
      result.push(segment);
    } else {
      // Split at word boundaries
      const words = segment.text.split(/(\s+)/);
      let current = '';
      
      for (const word of Array.from(words)) {
        if (current.length + word.length > maxLength) {
          if (current) {
            result.push({ type: segment.type, text: current });
          }
          current = word;
        } else {
          current += word;
        }
      }
      
      if (current) {
        result.push({ type: segment.type, text: current });
      }
    }
  }
  
  return result;
}
