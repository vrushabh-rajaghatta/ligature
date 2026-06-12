
// =============================================================================
// Mock Track Changes Export Service
// =============================================================================
// Mock implementation for demo/testing purposes
// =============================================================================

import type {
  ITrackChangesExportService,
  GeneratedContentForExport,
  TrackChangesExportConfig,
  TrackChangesExportResult,
  InsertPosition,
  ChangeAuthor,
  ContentRange,
  TrackedChange,
  TrackChangesSummary,
} from '@/types/track-changes';

export class MockTrackChangesExportService implements ITrackChangesExportService {
  async exportWithTrackChanges(
    originalDoc: Buffer | null,
    generatedContent: GeneratedContentForExport,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult> {
    return {
      success: true,
      filename: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      changeCount: 0,
      changesByType: { insertion: 0, deletion: 0, formatting: 0, move_from: 0, move_to: 0, table_insert: 0, table_delete: 0, comment: 0 },
      exportedAt: new Date(),
      warnings: [],
    };
  }

  async insertTrackedContent(
    doc: Buffer,
    content: string,
    position: InsertPosition,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    return doc;
  }

  async deleteTrackedContent(
    doc: Buffer,
    range: ContentRange,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    return doc;
  }

  async replaceTrackedContent(
    doc: Buffer,
    range: ContentRange,
    newContent: string,
    author: ChangeAuthor,
    timestamp: Date
  ): Promise<Buffer> {
    return doc;
  }

  async acceptChange(doc: Buffer, changeId: string): Promise<Buffer> {
    return doc;
  }

  async rejectChange(doc: Buffer, changeId: string): Promise<Buffer> {
    return doc;
  }

  async acceptAllChanges(doc: Buffer): Promise<Buffer> {
    return doc;
  }

  async rejectAllChanges(doc: Buffer): Promise<Buffer> {
    return doc;
  }

  async createNewDocumentWithContent(
    content: GeneratedContentForExport,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult> {
    return {
      success: true,
      filename: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      changeCount: 0,
      changesByType: { insertion: 0, deletion: 0, formatting: 0, move_from: 0, move_to: 0, table_insert: 0, table_delete: 0, comment: 0 },
      exportedAt: new Date(),
      warnings: [],
    };
  }

  async extractTrackedChanges(doc: Buffer): Promise<TrackedChange[]> {
    return [];
  }

  async processChanges(doc: Buffer, changeIds: string[], action: 'accept' | 'reject'): Promise<Buffer> {
    return doc;
  }

  async getChangesSummary(doc: Buffer): Promise<TrackChangesSummary> {
    return {
      totalChanges: 0,
      byType: { insertion: 0, deletion: 0, formatting: 0, move_from: 0, move_to: 0, table_insert: 0, table_delete: 0, comment: 0 },
      byAuthor: {},
      byStatus: { pending: 0, accepted: 0, rejected: 0, deferred: 0 },
      dateRange: { earliest: new Date(), latest: new Date() },
      affectedSections: [],
      commentCount: 0,
      unresolvedCommentCount: 0,
    };
  }

  async compareDocuments(
    original: Buffer,
    modified: Buffer,
    config: TrackChangesExportConfig
  ): Promise<TrackChangesExportResult> {
    return {
      success: true,
      filename: 'comparison.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      changeCount: 0,
      changesByType: { insertion: 0, deletion: 0, formatting: 0, move_from: 0, move_to: 0, table_insert: 0, table_delete: 0, comment: 0 },
      exportedAt: new Date(),
      warnings: [],
    };
  }

  async addComment(doc: Buffer, position: InsertPosition, comment: string, author: ChangeAuthor): Promise<Buffer> {
    return doc;
  }
}
