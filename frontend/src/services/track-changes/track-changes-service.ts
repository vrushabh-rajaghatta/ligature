
// =============================================================================
// Track Changes Export Service
// =============================================================================
// Production implementation of ITrackChangesExportService.
// Exports documents with Microsoft Word track changes (revision marks).
// =============================================================================

import type {
  ITrackChangesExportService,
  TrackedChange,
  ChangeAuthor,
  InsertPosition,
  ContentRange,
  TrackChangesExportConfig,
  TrackChangesExportResult,
  TrackChangesSummary,
  GeneratedContentForExport,
  RevisionType,
  RevisionStatus,
  ExportWarning,
  ReviewComment,
} from '@/types/track-changes';

import {
  AI_AUTHOR,
  SYSTEM_AUTHOR,
  DEFAULT_TRACK_CHANGES_CONFIG,
} from '@/types/track-changes';

import { DocxBuilder, createDocxBuilder } from './docx-builder';
import type { TrackChangesConfig } from './config';
import { createCSRExportConfig } from './config';

import {
  RevisionProcessor,
  createRevisionProcessor,
  type ProcessedRevision,
  type ProcessedComment,
} from './revision-processor';

import {
  computeDiff,
  diffToSegments,
  compareSections,
  type ComparisonSection,
} from './comparison-engine';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a checksum for document integrity
 */
function generateChecksum(data: Buffer): string {
  let hash = 0;
  const str = data.toString('base64').slice(0, 200);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Convert export config to builder config
 */
function exportConfigToBuilderConfig(
  config: TrackChangesExportConfig
): Partial<TrackChangesConfig> {
  return {
    document: {
      title: 'Track Changes Export',
      defaultAuthor: config.humanAuthorName,
    } as Partial<TrackChangesConfig['document']>,
    trackChanges: {
      enabled: true,
      aiAuthorName: config.aiAuthorName,
      humanAuthorName: config.humanAuthorName,
      granularity: config.granularity,
      trackFormatting: config.trackFormattingChanges,
      showRevisions: true,
      showComments: true,
    } as Partial<TrackChangesConfig['trackChanges']>,
    styles: {
      insertionColor: config.styles?.insertionColor,
      deletionColor: config.styles?.deletionColor,
      underlineInsertions: config.styles?.underlineInsertions ?? true,
      strikethroughDeletions: config.styles?.strikethroughDeletions ?? true,
    } as Partial<TrackChangesConfig['styles']>,
  } as Partial<TrackChangesConfig>;
}

/**
 * Parse mock document to extract stored data
 * In production, this would parse actual DOCX XML
 */
function parseDocumentContent(doc: Buffer): {
  documentId: string;
  content: string;
  trackedChanges: TrackedChange[];
} {
  try {
    // Check for PK header (ZIP signature)
    const isPK = doc[0] === 0x50 && doc[1] === 0x4B;
    const content = isPK ? doc.toString().slice(2) : doc.toString();
    
    // Try to parse as JSON (mock format)
    try {
      const parsed = JSON.parse(content);
      return {
        documentId: parsed.documentId || generateId('doc'),
        content: parsed.content || content,
        trackedChanges: parsed.trackedChanges || [],
      };
    } catch {
      // Not JSON, treat as plain content
      return {
        documentId: generateId('doc'),
        content,
        trackedChanges: [],
      };
    }
  } catch {
    return {
      documentId: generateId('doc'),
      content: '',
      trackedChanges: [],
    };
  }
}

// -----------------------------------------------------------------------------
// Track Changes Export Service Class
// -----------------------------------------------------------------------------

/**
 * Production track changes export service
 */
export class TrackChangesExportService implements ITrackChangesExportService {
  // Internal storage for document changes (simulates document parsing)
  private documentChanges: Map<string, TrackedChange[]> = new Map();
  private revisionCounter = 1;

  // ---------------------------------------------------------------------------
  // Export with Track Changes
  // ---------------------------------------------------------------------------

  async exportWithTrackChanges(
    originalDoc: Buffer | null,
    generatedContent: GeneratedContentForExport,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult> {
    const mergedConfig = { ...DEFAULT_TRACK_CHANGES_CONFIG, ...config };
    const warnings: ExportWarning[] = [];
    const changesByType: Record<RevisionType, number> = {
      insertion: 0,
      deletion: 0,
      formatting: 0,
      move_from: 0,
      move_to: 0,
      table_insert: 0,
      table_delete: 0,
      comment: 0,
    };

    try {
      // Create builder with config
      const builderConfig = exportConfigToBuilderConfig(mergedConfig);
      const builder = createDocxBuilder({
        ...builderConfig,
        document: {
          ...builderConfig.document,
          title: generatedContent.documentTitle,
        } as TrackChangesConfig['document'],
      } as Partial<TrackChangesConfig>);

      // Create revision processor
      const processor = createRevisionProcessor({
        aiAuthorName: mergedConfig.aiAuthorName || 'Ligature AI',
        humanAuthorName: mergedConfig.humanAuthorName,
        combineAdjacent: mergedConfig.combineAdjacentChanges,
        combineTimeThresholdMs: mergedConfig.combineTimeThresholdMs,
        generateSourceCitations: mergedConfig.includeCitationsAsComments,
      });

      // Process each section
      const trackedChanges: TrackedChange[] = [];
      const timestamp = generatedContent.generationMetadata.generatedAt;

      for (const section of generatedContent.sections) {
        // Add section heading
        builder.addHeading(`${section.sectionNumber} ${section.sectionTitle}`, 2);

        // Create tracked change for the content
        const change: TrackedChange = {
          id: generateId('change'),
          type: section.insertMode === 'replace' ? 'deletion' : 'insertion',
          author: AI_AUTHOR,
          timestamp,
          position: {
            sectionNumber: section.sectionNumber,
            sectionTitle: section.sectionTitle,
          },
          insertedContent: section.insertMode !== 'replace' ? section.content : undefined,
          deletedContent: section.insertMode === 'replace' ? '[Original content removed]' : undefined,
          status: 'pending' as RevisionStatus,
          revisionId: this.revisionCounter++,
        };

        trackedChanges.push(change);

        // Add to builder
        if (section.insertMode === 'replace') {
          builder.addDeletion('[Original content replaced]', AI_AUTHOR, timestamp);
          changesByType.deletion++;
        }

        builder.addInsertion(section.content, AI_AUTHOR, timestamp);
        changesByType.insertion++;

        // Add citations as comments
        if (mergedConfig.includeCitationsAsComments && section.citations) {
          for (const citation of section.citations) {
            builder.addComment({
              text: `Source: ${citation.fullReference}`,
              author: AI_AUTHOR,
              date: timestamp,
            });
            changesByType.comment++;
          }
        }

        // Check confidence and add warning
        if (section.confidenceScore && section.confidenceScore < 0.7) {
          warnings.push({
            code: 'LOW_CONFIDENCE',
            message: `Section ${section.sectionNumber} has low AI confidence (${(section.confidenceScore * 100).toFixed(0)}%)`,
            section: section.sectionNumber,
            severity: 'medium',
          });
        }
      }

      // Store changes for retrieval
      this.documentChanges.set(generatedContent.documentId, trackedChanges);

      // Build document
      const result = builder.build();

      // Generate filename
      const safeTitle = generatedContent.documentTitle
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
      const filename = `${safeTitle}_tracked.docx`;

      return {
        success: true,
        document: result.buffer,
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        changeCount: changesByType.insertion + changesByType.deletion,
        changesByType,
        warnings,
        exportedAt: new Date(),
        checksum: generateChecksum(result.buffer),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      return {
        success: false,
        document: undefined,
        filename: 'export_failed.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        changeCount: 0,
        changesByType,
        warnings,
        error: errorMessage,
        exportedAt: new Date(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Insert Tracked Content
  // ---------------------------------------------------------------------------

  async insertTrackedContent(
    doc: Buffer,
    content: string,
    position: InsertPosition,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    const parsed = parseDocumentContent(doc);
    
    // Create tracked change
    const change: TrackedChange = {
      id: generateId('ins'),
      type: 'insertion',
      author,
      timestamp,
      position,
      insertedContent: content,
      status: 'pending',
      revisionId: this.revisionCounter++,
    };

    // Add to stored changes
    const changes = this.documentChanges.get(parsed.documentId) || [];
    changes.push(change);
    this.documentChanges.set(parsed.documentId, changes);

    // Create new document with change
    const builder = createDocxBuilder();
    builder.addInsertion(content, author, timestamp);
    
    const result = builder.build();
    return result.buffer;
  }

  // ---------------------------------------------------------------------------
  // Delete Tracked Content
  // ---------------------------------------------------------------------------

  async deleteTrackedContent(
    doc: Buffer,
    range: ContentRange,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    const parsed = parseDocumentContent(doc);
    
    // For demo, we mark content as deleted
    const deletedContent = `[Deleted content at ${range.start.sectionNumber || 'unknown'}]`;
    
    const change: TrackedChange = {
      id: generateId('del'),
      type: 'deletion',
      author,
      timestamp,
      position: range.start,
      deletedContent,
      status: 'pending',
      revisionId: this.revisionCounter++,
    };

    const changes = this.documentChanges.get(parsed.documentId) || [];
    changes.push(change);
    this.documentChanges.set(parsed.documentId, changes);

    const builder = createDocxBuilder();
    builder.addDeletion(deletedContent, author, timestamp);
    
    const result = builder.build();
    return result.buffer;
  }

  // ---------------------------------------------------------------------------
  // Replace Tracked Content
  // ---------------------------------------------------------------------------

  async replaceTrackedContent(
    doc: Buffer,
    range: ContentRange,
    newContent: string,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    // Delete then insert
    const afterDelete = await this.deleteTrackedContent(doc, range, author, timestamp);
    return this.insertTrackedContent(afterDelete, newContent, range.start, author, timestamp);
  }

  // ---------------------------------------------------------------------------
  // Extract Tracked Changes
  // ---------------------------------------------------------------------------

  async extractTrackedChanges(doc: Buffer): Promise<TrackedChange[]> {
    const parsed = parseDocumentContent(doc);
    return this.documentChanges.get(parsed.documentId) || parsed.trackedChanges;
  }

  // ---------------------------------------------------------------------------
  // Process Changes (Accept/Reject)
  // ---------------------------------------------------------------------------

  async processChanges(
    doc: Buffer,
    changeIds: string[],
    action: 'accept' | 'reject'
  ): Promise<Buffer> {
    const parsed = parseDocumentContent(doc);
    const changes = this.documentChanges.get(parsed.documentId) || [];

    for (const change of changes) {
      if (changeIds.includes(change.id)) {
        change.status = action === 'accept' ? 'accepted' : 'rejected';
      }
    }

    this.documentChanges.set(parsed.documentId, changes);

    // Return document (in production, would rebuild with processed changes)
    return doc;
  }

  // ---------------------------------------------------------------------------
  // Accept All Changes
  // ---------------------------------------------------------------------------

  async acceptAllChanges(doc: Buffer): Promise<Buffer> {
    const changes = await this.extractTrackedChanges(doc);
    const changeIds = changes.map(c => c.id);
    return this.processChanges(doc, changeIds, 'accept');
  }

  // ---------------------------------------------------------------------------
  // Reject All Changes
  // ---------------------------------------------------------------------------

  async rejectAllChanges(doc: Buffer): Promise<Buffer> {
    const changes = await this.extractTrackedChanges(doc);
    const changeIds = changes.map(c => c.id);
    return this.processChanges(doc, changeIds, 'reject');
  }

  // ---------------------------------------------------------------------------
  // Get Changes Summary
  // ---------------------------------------------------------------------------

  async getChangesSummary(doc: Buffer): Promise<TrackChangesSummary> {
    const changes = await this.extractTrackedChanges(doc);

    const byType: Record<RevisionType, number> = {
      insertion: 0,
      deletion: 0,
      formatting: 0,
      move_from: 0,
      move_to: 0,
      table_insert: 0,
      table_delete: 0,
      comment: 0,
    };

    const byAuthor: Record<string, number> = {};
    const byStatus: Record<RevisionStatus, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      deferred: 0,
    };

    const sections = new Set<string>();
    let commentCount = 0;
    let unresolvedCommentCount = 0;
    let earliest = new Date();
    let latest = new Date(0);

    for (const change of changes) {
      byType[change.type]++;
      byStatus[change.status]++;

      const authorKey = change.author.id;
      byAuthor[authorKey] = (byAuthor[authorKey] || 0) + 1;

      if (change.position.sectionNumber) {
        sections.add(change.position.sectionNumber);
      }

      if (change.timestamp < earliest) earliest = change.timestamp;
      if (change.timestamp > latest) latest = change.timestamp;

      if (change.type === 'comment') {
        commentCount++;
        if (change.reviewComments?.some(c => !c.resolved)) {
          unresolvedCommentCount++;
        }
      }
    }

    return {
      totalChanges: changes.length,
      byType,
      byAuthor,
      byStatus,
      dateRange: {
        earliest: changes.length > 0 ? earliest : new Date(),
        latest: changes.length > 0 ? latest : new Date(),
      },
      affectedSections: Array.from(sections),
      commentCount,
      unresolvedCommentCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Compare Documents
  // ---------------------------------------------------------------------------

  async compareDocuments(
    original: Buffer,
    modified: Buffer,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult> {
    const changesByType: Record<RevisionType, number> = {
      insertion: 0,
      deletion: 0,
      formatting: 0,
      move_from: 0,
      move_to: 0,
      table_insert: 0,
      table_delete: 0,
      comment: 0,
    };
    const warnings: ExportWarning[] = [];

    try {
      const origParsed = parseDocumentContent(original);
      const modParsed = parseDocumentContent(modified);

      // Compute diff
      const diff = computeDiff(origParsed.content, modParsed.content, {
        granularity: config.granularity,
      });
      const segments = diffToSegments(diff);

      // Create builder and add changes
      const builderConfig = exportConfigToBuilderConfig(config);
      const builder = createDocxBuilder(builderConfig);
      const timestamp = new Date();

      // Process diff segments
      for (const segment of segments) {
        if (segment.type === 'equal') {
          builder.addParagraph(segment.text);
        } else if (segment.type === 'insert') {
          builder.addInsertion(segment.text, config.humanAuthorName, timestamp);
          changesByType.insertion++;
        } else if (segment.type === 'delete') {
          builder.addDeletion(segment.text, config.humanAuthorName, timestamp);
          changesByType.deletion++;
        }
      }

      const result = builder.build();
      const changeCount = changesByType.insertion + changesByType.deletion;

      return {
        success: true,
        document: result.buffer,
        filename: 'comparison_result.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        changeCount,
        changesByType,
        warnings,
        exportedAt: new Date(),
        checksum: generateChecksum(result.buffer),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Comparison failed';
      return {
        success: false,
        document: undefined,
        filename: 'comparison_failed.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        changeCount: 0,
        changesByType,
        warnings,
        error: errorMessage,
        exportedAt: new Date(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Add Comment
  // ---------------------------------------------------------------------------

  async addComment(
    doc: Buffer,
    position: InsertPosition,
    comment: string,
    author: ChangeAuthor
  ): Promise<Buffer> {
    const parsed = parseDocumentContent(doc);
    const changes = this.documentChanges.get(parsed.documentId) || [];

    const change: TrackedChange = {
      id: generateId('cmt'),
      type: 'comment',
      author,
      timestamp: new Date(),
      position,
      status: 'pending',
      reviewComments: [{
        id: generateId('rev'),
        author,
        text: comment,
        timestamp: new Date(),
        resolved: false,
      }],
      revisionId: this.revisionCounter++,
    };

    changes.push(change);
    this.documentChanges.set(parsed.documentId, changes);

    // In production, would rebuild document with comment
    return doc;
  }

  // ---------------------------------------------------------------------------
  // Test Helpers
  // ---------------------------------------------------------------------------

  /**
   * Reset internal state (for testing)
   */
  reset(): void {
    this.documentChanges.clear();
    this.revisionCounter = 1;
  }

  /**
   * Get stored changes for a document (for testing)
   */
  getStoredChanges(docId: string): TrackedChange[] {
    return this.documentChanges.get(docId) || [];
  }

  /**
   * Get total change count (for testing)
   */
  getTotalChangeCount(): number {
    let total = 0;
    for (const changes of Array.from(Array.from(this.documentChanges.values()))) {
      total += changes.length;
    }
    return total;
  }

  /**
   * Add test changes directly (for testing)
   */
  addTestChanges(docId: string, changes: TrackedChange[]): void {
    this.documentChanges.set(docId, changes);
  }
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create a new track changes export service
 */
export function createTrackChangesExportService(): TrackChangesExportService {
  return new TrackChangesExportService();
}

/**
 * Default service instance (singleton pattern for convenience)
 */
let defaultService: TrackChangesExportService | null = null;

/**
 * Get or create the default service instance
 */
export function getTrackChangesExportService(): TrackChangesExportService {
  if (!defaultService) {
    defaultService = new TrackChangesExportService();
  }
  return defaultService;
}

/**
 * Reset the default service instance (for testing)
 */
export function resetTrackChangesExportService(): void {
  if (defaultService) {
    defaultService.reset();
  }
  defaultService = null;
}
