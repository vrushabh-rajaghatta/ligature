
// =============================================================================
// Revision Processor
// =============================================================================
// Converts tracked changes and diff results into OOXML revision marks.
// Handles author attribution, timestamp management, and revision ID assignment.
// =============================================================================

import type {
  TrackedChange,
  ChangeAuthor,
  RevisionType,
  RevisionStatus,
  InsertPosition,
  DiffSegment,
  ExportSection,
  GeneratedContentForExport,
  ReviewComment,
  ChangeSource,
} from '@/types/track-changes';

import {
  AI_AUTHOR,
  SYSTEM_AUTHOR,
} from '@/types/track-changes';

import type {
  OOXMLInsertion,
  OOXMLDeletion,
  OOXMLRun,
  OOXMLComment,
  RevisionMetadata,
} from './ooxml-types';

import {
  generateRsid,
  getAuthorInitials,
  createRevisionMetadata,
} from './ooxml-types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Revision with OOXML metadata
 */
export interface ProcessedRevision {
  id: number;
  type: RevisionType;
  author: ChangeAuthor;
  authorName: string;
  timestamp: Date;
  content: string;
  ooxmlElement: OOXMLInsertion | OOXMLDeletion;
  position?: InsertPosition;
  source?: ChangeSource;
}

/**
 * Processed comment
 */
export interface ProcessedComment {
  id: number;
  author: ChangeAuthor;
  authorName: string;
  initials: string;
  timestamp: Date;
  text: string;
  paragraphId?: string;
  parentId?: number;
  ooxmlComment: OOXMLComment;
}

/**
 * Revision processing options
 */
export interface RevisionProcessingOptions {
  aiAuthorName?: string;
  humanAuthorName?: string;
  combineAdjacent?: boolean;
  combineTimeThresholdMs?: number;
  generateSourceCitations?: boolean;
}

/**
 * Revision batch result
 */
export interface RevisionBatchResult {
  revisions: ProcessedRevision[];
  comments: ProcessedComment[];
  summary: RevisionSummary;
}

/**
 * Revision summary statistics
 */
export interface RevisionSummary {
  totalRevisions: number;
  insertions: number;
  deletions: number;
  comments: number;
  byAuthor: Record<string, number>;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}

// -----------------------------------------------------------------------------
// Default Options
// -----------------------------------------------------------------------------

export const DEFAULT_REVISION_OPTIONS: RevisionProcessingOptions = {
  aiAuthorName: 'Ligature AI',
  humanAuthorName: 'Medical Writer',
  combineAdjacent: true,
  combineTimeThresholdMs: 60000, // 1 minute
  generateSourceCitations: true,
};

// -----------------------------------------------------------------------------
// Revision Processor Class
// -----------------------------------------------------------------------------

/**
 * Processes changes into OOXML revisions
 */
export class RevisionProcessor {
  private options: RevisionProcessingOptions;
  private revisionIdCounter = 0;
  private commentIdCounter = 0;
  private processedRevisions: ProcessedRevision[] = [];
  private processedComments: ProcessedComment[] = [];

  constructor(options: Partial<RevisionProcessingOptions> = {}) {
    this.options = { ...DEFAULT_REVISION_OPTIONS, ...options };
  }

  // ---------------------------------------------------------------------------
  // Core Processing Methods
  // ---------------------------------------------------------------------------

  /**
   * Process a single tracked change
   */
  processChange(change: TrackedChange): ProcessedRevision | null {
    const authorName = this.resolveAuthorName(change.author);
    const revisionId = this.nextRevisionId();

    if (change.type === 'insertion' && change.insertedContent) {
      const ooxmlElement = this.createInsertion(
        change.insertedContent,
        authorName,
        change.timestamp,
        revisionId
      );

      const revision: ProcessedRevision = {
        id: revisionId,
        type: 'insertion',
        author: change.author,
        authorName,
        timestamp: change.timestamp,
        content: change.insertedContent,
        ooxmlElement,
        position: change.position,
        source: change.source,
      };

      this.processedRevisions.push(revision);
      return revision;
    }

    if (change.type === 'deletion' && change.deletedContent) {
      const ooxmlElement = this.createDeletion(
        change.deletedContent,
        authorName,
        change.timestamp,
        revisionId
      );

      const revision: ProcessedRevision = {
        id: revisionId,
        type: 'deletion',
        author: change.author,
        authorName,
        timestamp: change.timestamp,
        content: change.deletedContent,
        ooxmlElement,
        position: change.position,
        source: change.source,
      };

      this.processedRevisions.push(revision);
      return revision;
    }

    // Comment type doesn't create a revision
    if (change.type === 'comment' && change.reviewComments) {
      for (const comment of change.reviewComments) {
        this.processComment(comment, change.position);
      }
    }

    return null;
  }

  /**
   * Process multiple tracked changes
   */
  processChanges(changes: TrackedChange[]): RevisionBatchResult {
    for (const change of changes) {
      this.processChange(change);
    }

    // Optionally combine adjacent revisions
    if (this.options.combineAdjacent) {
      this.combineAdjacentRevisions();
    }

    return {
      revisions: this.processedRevisions,
      comments: this.processedComments,
      summary: this.generateSummary(),
    };
  }

  /**
   * Process diff segments into revisions
   */
  processDiffSegments(
    segments: DiffSegment[],
    author: ChangeAuthor,
    timestamp: Date = new Date()
  ): ProcessedRevision[] {
    const revisions: ProcessedRevision[] = [];
    const authorName = this.resolveAuthorName(author);

    for (const segment of segments) {
      if (segment.type === 'insert') {
        const revisionId = this.nextRevisionId();
        const ooxmlElement = this.createInsertion(
          segment.text,
          authorName,
          timestamp,
          revisionId
        );

        const revision: ProcessedRevision = {
          id: revisionId,
          type: 'insertion',
          author,
          authorName,
          timestamp,
          content: segment.text,
          ooxmlElement,
        };

        this.processedRevisions.push(revision);
        revisions.push(revision);
      } else if (segment.type === 'delete') {
        const revisionId = this.nextRevisionId();
        const ooxmlElement = this.createDeletion(
          segment.text,
          authorName,
          timestamp,
          revisionId
        );

        const revision: ProcessedRevision = {
          id: revisionId,
          type: 'deletion',
          author,
          authorName,
          timestamp,
          content: segment.text,
          ooxmlElement,
        };

        this.processedRevisions.push(revision);
        revisions.push(revision);
      }
      // 'equal' segments don't create revisions
    }

    return revisions;
  }

  /**
   * Process export sections into revisions
   */
  processExportSections(
    sections: ExportSection[],
    metadata: GeneratedContentForExport['generationMetadata']
  ): RevisionBatchResult {
    const author = AI_AUTHOR;
    const timestamp = metadata.generatedAt;

    for (const section of sections) {
      // Create insertion for the generated content
      const revisionId = this.nextRevisionId();
      const authorName = this.options.aiAuthorName || 'Ligature AI';
      
      const ooxmlElement = this.createInsertion(
        section.content,
        authorName,
        timestamp,
        revisionId
      );

      const revision: ProcessedRevision = {
        id: revisionId,
        type: 'insertion',
        author,
        authorName,
        timestamp,
        content: section.content,
        ooxmlElement,
        position: {
          sectionNumber: section.sectionNumber,
          sectionTitle: section.sectionTitle,
        },
        source: {
          type: 'ai_generation',
          sourceDocumentId: metadata.sourceDocuments[0],
        },
      };

      this.processedRevisions.push(revision);

      // Process citations as comments if enabled
      if (this.options.generateSourceCitations && section.citations) {
        for (const citation of section.citations) {
          this.processComment(
            {
              id: `citation-${citation.id}`,
              author: AI_AUTHOR,
              timestamp,
              text: `Source: ${citation.fullReference}`,
              resolved: false,
            },
            { sectionNumber: section.sectionNumber }
          );
        }
      }
    }

    return {
      revisions: this.processedRevisions,
      comments: this.processedComments,
      summary: this.generateSummary(),
    };
  }

  // ---------------------------------------------------------------------------
  // Comment Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a review comment
   */
  processComment(
    comment: ReviewComment,
    position?: InsertPosition
  ): ProcessedComment {
    const commentId = this.nextCommentId();
    const authorName = this.resolveAuthorName(comment.author);
    const initials = getAuthorInitials(authorName);

    const ooxmlComment: OOXMLComment = {
      id: commentId,
      author: authorName,
      initials,
      date: comment.timestamp,
      content: [{
        type: 'paragraph',
        id: generateRsid(),
        rsidR: generateRsid(),
        content: [{
          type: 'run',
          content: [{ type: 'text', value: comment.text, preserveSpace: true }],
        }],
      }],
    };

    // Handle threading
    if (comment.replyToId) {
      const parentComment = this.processedComments.find(
        c => c.ooxmlComment.id.toString() === comment.replyToId
      );
      if (parentComment) {
        ooxmlComment.parentId = parentComment.id;
      }
    }

    const processed: ProcessedComment = {
      id: commentId,
      author: comment.author,
      authorName,
      initials,
      timestamp: comment.timestamp,
      text: comment.text,
      parentId: ooxmlComment.parentId,
      ooxmlComment,
    };

    this.processedComments.push(processed);
    return processed;
  }

  // ---------------------------------------------------------------------------
  // OOXML Element Creation
  // ---------------------------------------------------------------------------

  /**
   * Create an OOXML insertion element
   */
  private createInsertion(
    text: string,
    author: string,
    date: Date,
    id: number
  ): OOXMLInsertion {
    return {
      type: 'insertion',
      id,
      author,
      date,
      content: [{
        type: 'run',
        rsidR: generateRsid(),
        content: [{ type: 'text', value: text, preserveSpace: text.includes(' ') }],
      }],
    };
  }

  /**
   * Create an OOXML deletion element
   */
  private createDeletion(
    text: string,
    author: string,
    date: Date,
    id: number
  ): OOXMLDeletion {
    return {
      type: 'deletion',
      id,
      author,
      date,
      content: [{ type: 'deletedText', text }],
    };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Resolve author name from author object or string
   */
  private resolveAuthorName(author: ChangeAuthor | string | undefined): string {
    if (!author) {
      return this.options.aiAuthorName || 'Ligature AI';
    }
    if (typeof author === 'string') {
      return author;
    }
    return author.name;
  }

  /**
   * Get next revision ID
   */
  private nextRevisionId(): number {
    return ++this.revisionIdCounter;
  }

  /**
   * Get next comment ID
   */
  private nextCommentId(): number {
    return ++this.commentIdCounter;
  }

  /**
   * Combine adjacent revisions of the same type by same author
   */
  private combineAdjacentRevisions(): void {
    if (this.processedRevisions.length < 2) return;

    const combined: ProcessedRevision[] = [];
    let current = this.processedRevisions[0];

    for (let i = 1; i < this.processedRevisions.length; i++) {
      const next = this.processedRevisions[i];
      const canCombine = this.canCombineRevisions(current, next);

      if (canCombine) {
        // Merge content
        current = {
          ...current,
          content: current.content + next.content,
          ooxmlElement: this.mergeOoxmlElements(
            current.ooxmlElement,
            next.ooxmlElement
          ),
        };
      } else {
        combined.push(current);
        current = next;
      }
    }

    combined.push(current);
    this.processedRevisions = combined;

    // Re-assign IDs after combining
    for (let i = 0; i < this.processedRevisions.length; i++) {
      this.processedRevisions[i].id = i + 1;
      this.processedRevisions[i].ooxmlElement.id = i + 1;
    }
  }

  /**
   * Check if two revisions can be combined
   */
  private canCombineRevisions(
    rev1: ProcessedRevision,
    rev2: ProcessedRevision
  ): boolean {
    // Must be same type
    if (rev1.type !== rev2.type) return false;

    // Must be same author
    if (rev1.authorName !== rev2.authorName) return false;

    // Must be within time threshold
    const timeDiff = Math.abs(
      rev2.timestamp.getTime() - rev1.timestamp.getTime()
    );
    const threshold = this.options.combineTimeThresholdMs || 60000;
    if (timeDiff > threshold) return false;

    return true;
  }

  /**
   * Merge two OOXML elements
   */
  private mergeOoxmlElements(
    elem1: OOXMLInsertion | OOXMLDeletion,
    elem2: OOXMLInsertion | OOXMLDeletion
  ): OOXMLInsertion | OOXMLDeletion {
    if (elem1.type === 'insertion' && elem2.type === 'insertion') {
      return {
        ...elem1,
        content: [...elem1.content, ...elem2.content],
      };
    }

    if (elem1.type === 'deletion' && elem2.type === 'deletion') {
      const text1 = elem1.content
        .filter((c): c is { type: 'deletedText'; text: string } => c.type === 'deletedText')
        .map(c => c.text)
        .join('');
      const text2 = elem2.content
        .filter((c): c is { type: 'deletedText'; text: string } => c.type === 'deletedText')
        .map(c => c.text)
        .join('');

      return {
        ...elem1,
        content: [{ type: 'deletedText', text: text1 + text2 }],
      };
    }

    return elem1;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(): RevisionSummary {
    const byAuthor: Record<string, number> = {};
    let earliest = new Date();
    let latest = new Date(0);
    let insertions = 0;
    let deletions = 0;

    for (const rev of this.processedRevisions) {
      byAuthor[rev.authorName] = (byAuthor[rev.authorName] || 0) + 1;

      if (rev.timestamp < earliest) earliest = rev.timestamp;
      if (rev.timestamp > latest) latest = rev.timestamp;

      if (rev.type === 'insertion') insertions++;
      if (rev.type === 'deletion') deletions++;
    }

    return {
      totalRevisions: this.processedRevisions.length,
      insertions,
      deletions,
      comments: this.processedComments.length,
      byAuthor,
      dateRange: { earliest, latest },
    };
  }

  // ---------------------------------------------------------------------------
  // Public Accessors
  // ---------------------------------------------------------------------------

  /**
   * Get all processed revisions
   */
  getRevisions(): ProcessedRevision[] {
    return this.processedRevisions;
  }

  /**
   * Get all processed comments
   */
  getComments(): ProcessedComment[] {
    return this.processedComments;
  }

  /**
   * Get current revision count
   */
  getRevisionCount(): number {
    return this.processedRevisions.length;
  }

  /**
   * Get current comment count
   */
  getCommentCount(): number {
    return this.processedComments.length;
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.revisionIdCounter = 0;
    this.commentIdCounter = 0;
    this.processedRevisions = [];
    this.processedComments = [];
  }

  /**
   * Set starting revision ID (for continuing from existing document)
   */
  setStartingRevisionId(id: number): void {
    this.revisionIdCounter = id;
  }

  /**
   * Set starting comment ID
   */
  setStartingCommentId(id: number): void {
    this.commentIdCounter = id;
  }
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create a revision processor with default options
 */
export function createRevisionProcessor(
  options?: Partial<RevisionProcessingOptions>
): RevisionProcessor {
  return new RevisionProcessor(options);
}

/**
 * Create a revision processor configured for AI authoring
 */
export function createAIRevisionProcessor(
  aiAuthorName: string = 'Ligature AI'
): RevisionProcessor {
  return new RevisionProcessor({
    aiAuthorName,
    combineAdjacent: true,
    generateSourceCitations: true,
  });
}

/**
 * Create a revision processor configured for human edits
 */
export function createHumanRevisionProcessor(
  humanAuthorName: string
): RevisionProcessor {
  return new RevisionProcessor({
    humanAuthorName,
    combineAdjacent: true,
    generateSourceCitations: false,
  });
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Count revisions by type
 */
export function countRevisionsByType(
  revisions: ProcessedRevision[]
): Record<RevisionType, number> {
  const counts: Record<RevisionType, number> = {
    insertion: 0,
    deletion: 0,
    formatting: 0,
    move_from: 0,
    move_to: 0,
    table_insert: 0,
    table_delete: 0,
    comment: 0,
  };

  for (const rev of revisions) {
    counts[rev.type]++;
  }

  return counts;
}

/**
 * Filter revisions by author
 */
export function filterRevisionsByAuthor(
  revisions: ProcessedRevision[],
  authorName: string
): ProcessedRevision[] {
  return revisions.filter(r => r.authorName === authorName);
}

/**
 * Filter revisions by type
 */
export function filterRevisionsByType(
  revisions: ProcessedRevision[],
  type: RevisionType
): ProcessedRevision[] {
  return revisions.filter(r => r.type === type);
}

/**
 * Sort revisions by timestamp
 */
export function sortRevisionsByTimestamp(
  revisions: ProcessedRevision[],
  ascending: boolean = true
): ProcessedRevision[] {
  return [...revisions].sort((a, b) => {
    const diff = a.timestamp.getTime() - b.timestamp.getTime();
    return ascending ? diff : -diff;
  });
}
