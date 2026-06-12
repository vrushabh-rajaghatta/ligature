
// =============================================================================
// TRACK CHANGES EXPORT TYPES
// =============================================================================
// Types for exporting AI-generated content with Microsoft Word track changes
// (revision marks). Enables medical reviewers to see AI additions/deletions
// in familiar Word review mode.
//
// Based on OOXML revision tracking:
// - <w:ins> for insertions
// - <w:del> for deletions
// - <w:rPrChange> for formatting changes
// - Author and timestamp attribution
// =============================================================================

// ============================================================================
// REVISION TYPES
// ============================================================================

/**
 * Types of tracked changes supported in DOCX export
 */
export type RevisionType =
  | 'insertion'      // New content added (w:ins)
  | 'deletion'       // Content removed (w:del)
  | 'formatting'     // Style/format change (w:rPrChange)
  | 'move_from'      // Content moved from here (w:moveFrom)
  | 'move_to'        // Content moved to here (w:moveTo)
  | 'table_insert'   // Table row/cell inserted
  | 'table_delete'   // Table row/cell deleted
  | 'comment';       // Reviewer comment (not a change, but tracked)

/**
 * Granularity of revision tracking
 */
export type RevisionGranularity =
  | 'character'      // Track at character level (most precise)
  | 'word'           // Track at word level (typical)
  | 'sentence'       // Track at sentence level
  | 'paragraph'      // Track at paragraph level
  | 'section';       // Track at section level (least precise)

/**
 * Status of a revision in review workflow
 */
export type RevisionStatus =
  | 'pending'        // Not yet reviewed
  | 'accepted'       // Reviewer accepted the change
  | 'rejected'       // Reviewer rejected the change
  | 'deferred';      // Review deferred to later

// ============================================================================
// AUTHOR & ATTRIBUTION
// ============================================================================

/**
 * Author of a tracked change
 */
export interface ChangeAuthor {
  /** Unique identifier */
  id: string;
  
  /** Display name (appears in Word's track changes) */
  name: string;
  
  /** Email for identification */
  email?: string;
  
  /** Author type for filtering/display */
  type: 'human' | 'ai' | 'system';
  
  /** For AI authors, the model used */
  aiModel?: string;
  
  /** Organization/department */
  organization?: string;
  
  /** Role in document workflow */
  role?: string;
}

/**
 * Predefined AI author for Ligature-generated content
 */
export const AI_AUTHOR: ChangeAuthor = {
  id: 'ligature-ai',
  name: 'Ligature AI (Claude)',
  email: 'ai@ligaturerd.io',
  type: 'ai',
  aiModel: 'claude-sonnet-4',
  organization: 'Ligature',
  role: 'AI Assistant'
};

/**
 * System author for automated changes
 */
export const SYSTEM_AUTHOR: ChangeAuthor = {
  id: 'ligature-system',
  name: 'Ligature System',
  email: 'system@ligaturerd.io',
  type: 'system',
  organization: 'Ligature',
  role: 'Automated Process'
};

// ============================================================================
// POSITION & LOCATION
// ============================================================================

/**
 * Position within a document for inserting tracked content
 */
export interface InsertPosition {
  /** Target section number (e.g., "11.1.2") */
  sectionNumber?: string;
  
  /** Target section title (alternative to number) */
  sectionTitle?: string;
  
  /** Paragraph index within section (0-based) */
  paragraphIndex?: number;
  
  /** Character offset within paragraph */
  characterOffset?: number;
  
  /** Insert relative to existing content */
  relativeTo?: 'start' | 'end' | 'before' | 'after';
  
  /** Reference element ID for relative positioning */
  referenceElementId?: string;
  
  /** For table insertions */
  tablePosition?: TablePosition;
}

/**
 * Position within a table
 */
export interface TablePosition {
  /** Table index in document (0-based) */
  tableIndex: number;
  
  /** Row index (0-based, -1 for new row at end) */
  rowIndex: number;
  
  /** Cell index (0-based, -1 for new cell at end) */
  cellIndex?: number;
}

/**
 * Range of content affected by a revision
 */
export interface ContentRange {
  /** Start position */
  start: InsertPosition;
  
  /** End position (for deletions/replacements) */
  end?: InsertPosition;
  
  /** Length in characters (alternative to end position) */
  length?: number;
}

// ============================================================================
// TRACKED CHANGE RECORDS
// ============================================================================

/**
 * A single tracked change in the document
 */
export interface TrackedChange {
  /** Unique identifier for this change */
  id: string;
  
  /** Type of revision */
  type: RevisionType;
  
  /** Who made the change */
  author: ChangeAuthor;
  
  /** When the change was made */
  timestamp: Date;
  
  /** Where in the document */
  position: InsertPosition;
  
  /** The actual content (for insertions) */
  insertedContent?: string;
  
  /** The removed content (for deletions) */
  deletedContent?: string;
  
  /** For formatting changes, what changed */
  formattingChange?: FormattingChange;
  
  /** For moves, the paired move ID */
  pairedMoveId?: string;
  
  /** Current review status */
  status: RevisionStatus;
  
  /** Reviewer comments on this change */
  reviewComments?: ReviewComment[];
  
  /** Source of the content (for traceability) */
  source?: ChangeSource;
  
  /** Word revision ID (for DOCX serialization) */
  revisionId?: number;
}

/**
 * Formatting change details
 */
export interface FormattingChange {
  /** Property that changed */
  property: FormattingProperty;
  
  /** Previous value */
  previousValue?: string | number | boolean;
  
  /** New value */
  newValue?: string | number | boolean;
}

/**
 * Formatting properties that can be tracked
 */
export type FormattingProperty =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'fontSize'
  | 'fontFamily'
  | 'fontColor'
  | 'highlight'
  | 'superscript'
  | 'subscript'
  | 'alignment'
  | 'lineSpacing'
  | 'indentation';

/**
 * Review comment on a tracked change
 */
export interface ReviewComment {
  /** Comment ID */
  id: string;
  
  /** Comment author */
  author: ChangeAuthor;
  
  /** Comment timestamp */
  timestamp: Date;
  
  /** Comment text */
  text: string;
  
  /** Is this a reply to another comment? */
  replyToId?: string;
  
  /** Has comment been resolved? */
  resolved: boolean;
}

/**
 * Source/provenance of a change
 */
export interface ChangeSource {
  /** Source type */
  type: 'ai_generation' | 'ai_refinement' | 'manual_edit' | 'copy_paste' | 'import' | 'template';
  
  /** For AI sources, the generation request ID */
  generationRequestId?: string;
  
  /** Source document ID (if copied from another doc) */
  sourceDocumentId?: string;
  
  /** Source section in original document */
  sourceSection?: string;
  
  /** Citation to source material */
  citation?: string;
}

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

/**
 * Configuration for track changes export
 */
export interface TrackChangesExportConfig {
  /** Author name to use for AI-generated content */
  aiAuthorName?: string;
  
  /** Author name for human edits (current user) */
  humanAuthorName: string;
  
  /** Human author email */
  humanAuthorEmail?: string;
  
  /** Granularity of change tracking */
  granularity: RevisionGranularity;
  
  /** Include AI source citations as comments */
  includeCitationsAsComments: boolean;
  
  /** Include generation metadata as document properties */
  includeGenerationMetadata: boolean;
  
  /** Date format for revision timestamps */
  dateFormat?: string;
  
  /** Track formatting changes (can be noisy) */
  trackFormattingChanges: boolean;
  
  /** Combine adjacent changes by same author */
  combineAdjacentChanges: boolean;
  
  /** Maximum time gap (ms) for combining changes */
  combineTimeThresholdMs?: number;
  
  /** Word styles to apply to tracked content */
  styles?: TrackChangesStyles;
  
  /** Protection settings */
  protection?: DocumentProtection;
}

/**
 * Word styles for tracked changes display
 */
export interface TrackChangesStyles {
  /** Color for insertions (default: blue) */
  insertionColor?: string;
  
  /** Color for deletions (default: red) */
  deletionColor?: string;
  
  /** Show insertions with underline */
  underlineInsertions: boolean;
  
  /** Show deletions with strikethrough */
  strikethroughDeletions: boolean;
  
  /** Show revision bars in margin */
  showRevisionBars: boolean;
  
  /** Balloon display mode */
  balloonMode: 'all' | 'comments_only' | 'none';
}

/**
 * Document protection settings
 */
export interface DocumentProtection {
  /** Require track changes to be on */
  enforceTrackChanges: boolean;
  
  /** Allow only specific edit types */
  allowedEditTypes?: ('comments' | 'tracked_changes' | 'filling_forms')[];
  
  /** Password protect the document */
  password?: string;
}

/**
 * Default export configuration
 */
export const DEFAULT_TRACK_CHANGES_CONFIG: TrackChangesExportConfig = {
  humanAuthorName: 'Medical Writer',
  granularity: 'word',
  includeCitationsAsComments: true,
  includeGenerationMetadata: true,
  trackFormattingChanges: false,
  combineAdjacentChanges: true,
  combineTimeThresholdMs: 60000, // 1 minute
  styles: {
    insertionColor: '#0000FF',
    deletionColor: '#FF0000',
    underlineInsertions: true,
    strikethroughDeletions: true,
    showRevisionBars: true,
    balloonMode: 'all'
  }
};

// ============================================================================
// EXPORT INPUT/OUTPUT
// ============================================================================

/**
 * Content to be exported with track changes
 */
export interface GeneratedContentForExport {
  /** Document ID */
  documentId: string;
  
  /** Document title */
  documentTitle: string;
  
  /** Document type */
  documentType: string;
  
  /** Sections with generated content */
  sections: ExportSection[];
  
  /** Generation metadata */
  generationMetadata: GenerationMetadata;
}

/**
 * Section for export
 */
export interface ExportSection {
  /** Section number (e.g., "11.1.2") */
  sectionNumber: string;
  
  /** Section title */
  sectionTitle: string;
  
  /** The generated content */
  content: string;
  
  /** Content type */
  contentType: 'text' | 'table' | 'figure' | 'mixed';
  
  /** How to insert: new section or replace existing */
  insertMode: 'new' | 'replace' | 'append' | 'prepend';
  
  /** Citations referenced in this section */
  citations?: ExportCitation[];
  
  /** AI confidence score (0-1) */
  confidenceScore?: number;
}

/**
 * Citation for export
 */
export interface ExportCitation {
  /** Citation ID */
  id: string;
  
  /** Citation text (as it appears in content) */
  citationText: string;
  
  /** Full reference */
  fullReference: string;
  
  /** Source document */
  sourceDocument?: string;
  
  /** Page/section in source */
  sourceLocation?: string;
}

/**
 * Generation metadata for audit trail
 */
export interface GenerationMetadata {
  /** When content was generated */
  generatedAt: Date;
  
  /** AI model used */
  model: string;
  
  /** Model version */
  modelVersion?: string;
  
  /** Prompt template used */
  promptTemplate?: string;
  
  /** Source documents provided to AI */
  sourceDocuments: string[];
  
  /** Total tokens used */
  tokensUsed?: number;
  
  /** Generation duration (ms) */
  durationMs?: number;
  
  /** Quality check results */
  qualityCheckResults?: Record<string, boolean>;
}

/**
 * Result of track changes export
 */
export interface TrackChangesExportResult {
  /** Success flag */
  success: boolean;
  
  /** Exported document as Buffer */
  document?: Buffer;
  
  /** Filename for download */
  filename: string;
  
  /** MIME type */
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  /** Number of tracked changes inserted */
  changeCount: number;
  
  /** Changes by type */
  changesByType: Record<RevisionType, number>;
  
  /** Export warnings (non-fatal issues) */
  warnings: ExportWarning[];
  
  /** Error message if failed */
  error?: string;
  
  /** Export timestamp */
  exportedAt: Date;
  
  /** Document checksum for integrity */
  checksum?: string;
}

/**
 * Export warning
 */
export interface ExportWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Affected section */
  section?: string;
  
  /** Severity */
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Service interface for track changes export
 */
export interface ITrackChangesExportService {
  /**
   * Export document with track changes showing AI-generated content
   * @param originalDoc - Original document (null for new documents)
   * @param generatedContent - AI-generated content to insert
   * @param config - Export configuration
   */
  exportWithTrackChanges(
    originalDoc: Buffer | null,
    generatedContent: GeneratedContentForExport,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult>;
  
  /**
   * Insert content at position with track changes
   * @param doc - Document buffer to modify
   * @param content - Content to insert
   * @param position - Where to insert
   * @param author - Change author
   * @param timestamp - Change timestamp
   */
  insertTrackedContent(
    doc: Buffer,
    content: string,
    position: InsertPosition,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer>;
  
  /**
   * Delete content with track changes (mark as deleted, don't remove)
   * @param doc - Document buffer to modify
   * @param range - Range of content to delete
   * @param author - Change author
   * @param timestamp - Change timestamp
   */
  deleteTrackedContent(
    doc: Buffer,
    range: ContentRange,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer>;
  
  /**
   * Replace content with track changes (delete old + insert new)
   * @param doc - Document buffer to modify
   * @param range - Range of content to replace
   * @param newContent - New content to insert
   * @param author - Change author
   * @param timestamp - Change timestamp
   */
  replaceTrackedContent(
    doc: Buffer,
    range: ContentRange,
    newContent: string,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer>;
  
  /**
   * Extract all tracked changes from a document
   * @param doc - Document buffer to analyze
   */
  extractTrackedChanges(doc: Buffer): Promise<TrackedChange[]>;
  
  /**
   * Accept or reject specific changes
   * @param doc - Document buffer to modify
   * @param changeIds - IDs of changes to process
   * @param action - Accept or reject
   */
  processChanges(
    doc: Buffer,
    changeIds: string[],
    action: 'accept' | 'reject'
  ): Promise<Buffer>;
  
  /**
   * Accept all changes in document
   * @param doc - Document buffer to modify
   */
  acceptAllChanges(doc: Buffer): Promise<Buffer>;
  
  /**
   * Reject all changes in document
   * @param doc - Document buffer to modify
   */
  rejectAllChanges(doc: Buffer): Promise<Buffer>;
  
  /**
   * Get summary of tracked changes in document
   * @param doc - Document buffer to analyze
   */
  getChangesSummary(doc: Buffer): Promise<TrackChangesSummary>;
  
  /**
   * Compare two documents and generate track changes
   * @param original - Original document
   * @param modified - Modified document
   * @param config - Export configuration
   */
  compareDocuments(
    original: Buffer,
    modified: Buffer,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult>;
  
  /**
   * Add a review comment
   * @param doc - Document buffer to modify
   * @param position - Where to add comment
   * @param comment - Comment text
   * @param author - Comment author
   */
  addComment(
    doc: Buffer,
    position: InsertPosition,
    comment: string,
    author: ChangeAuthor
  ): Promise<Buffer>;
}

/**
 * Summary of tracked changes in a document
 */
export interface TrackChangesSummary {
  /** Total number of changes */
  totalChanges: number;
  
  /** Changes by type */
  byType: Record<RevisionType, number>;
  
  /** Changes by author */
  byAuthor: Record<string, number>;
  
  /** Changes by status */
  byStatus: Record<RevisionStatus, number>;
  
  /** Date range of changes */
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  
  /** Sections with changes */
  affectedSections: string[];
  
  /** Number of comments */
  commentCount: number;
  
  /** Unresolved comment count */
  unresolvedCommentCount: number;
}

// ============================================================================
// COMPARISON TYPES
// ============================================================================

/**
 * Result of comparing two document versions
 */
export interface DocumentComparison {
  /** Original document ID */
  originalDocumentId: string;
  
  /** Modified document ID */
  modifiedDocumentId: string;
  
  /** Comparison timestamp */
  comparedAt: Date;
  
  /** Detected changes */
  changes: DetectedChange[];
  
  /** Similarity score (0-1) */
  similarityScore: number;
  
  /** Sections that changed */
  changedSections: string[];
  
  /** Sections that are identical */
  unchangedSections: string[];
}

/**
 * A change detected during document comparison
 */
export interface DetectedChange {
  /** Change type */
  type: 'added' | 'removed' | 'modified';
  
  /** Section where change occurred */
  section: string;
  
  /** Original content (for removed/modified) */
  originalContent?: string;
  
  /** New content (for added/modified) */
  newContent?: string;
  
  /** Character-level diff (for modified) */
  diff?: DiffSegment[];
  
  /** Change significance (heuristic) */
  significance: 'minor' | 'moderate' | 'major';
}

/**
 * Segment of a diff
 */
export interface DiffSegment {
  /** Segment type */
  type: 'equal' | 'insert' | 'delete';
  
  /** Segment text */
  text: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Options for creating a tracked change
 */
export interface CreateTrackedChangeOptions {
  /** Change type */
  type: RevisionType;
  
  /** Content to insert/delete */
  content: string;
  
  /** Position in document */
  position: InsertPosition;
  
  /** Author (defaults to AI_AUTHOR) */
  author?: ChangeAuthor;
  
  /** Timestamp (defaults to now) */
  timestamp?: Date;
  
  /** Source information */
  source?: ChangeSource;
}

/**
 * Helper to create a tracked change with defaults
 */
export function createTrackedChange(options: CreateTrackedChangeOptions): TrackedChange {
  const now = new Date();
  return {
    id: `tc-${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    type: options.type,
    author: options.author || AI_AUTHOR,
    timestamp: options.timestamp || now,
    position: options.position,
    insertedContent: options.type === 'insertion' ? options.content : undefined,
    deletedContent: options.type === 'deletion' ? options.content : undefined,
    status: 'pending',
    source: options.source
  };
}

/**
 * Helper to create an InsertPosition
 */
export function createInsertPosition(
  sectionNumber: string,
  relativeTo: 'start' | 'end' = 'end'
): InsertPosition {
  return {
    sectionNumber,
    relativeTo
  };
}

/**
 * Helper to check if a change is from AI
 */
export function isAIChange(change: TrackedChange): boolean {
  return change.author.type === 'ai';
}

/**
 * Helper to check if a change is pending review
 */
export function isPendingChange(change: TrackedChange): boolean {
  return change.status === 'pending';
}
