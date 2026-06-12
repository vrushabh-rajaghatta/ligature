
// =============================================================================
// Mock Structured Content Service
// =============================================================================
// Mock implementation for demo/testing purposes
// =============================================================================

import type { OutputFormat, DocumentType } from '@/lib/integrations/docuvera/types';
import type { 
  INativeStructuredContentService,
  CreateComponentInput,
  UpdateComponentInput,
  NativeContentComponent,
  ComponentVersion,
  ComponentSearchInput,
  SearchResult,
  CreateDocumentInput,
  UpdateDocumentInput,
  NativeStructuredDocument,
  DocumentWithComponents,
  DocumentSearchInput,
  AssembledDocument,
  DocumentOutputRecord,
  DerivationOptions,
  DerivationSyncResult,
  ChangeEvent,
  PropagationOptions,
  PropagationResult,
  CreateReviewInput,
  NativeReviewRequest,
  ReviewDecision,
  ConsistencyCheckType,
  AIConsistencyCheck,
  ExternalSyncStatus,
  MigrationStatus,
} from '@/types/structured-content';

// Simple mock that implements the interface with minimal returns
export class MockStructuredContentService implements INativeStructuredContentService {
  async createComponent(data: CreateComponentInput): Promise<NativeContentComponent> {
    return { id: `comp-${Date.now()}`, ...data } as unknown as NativeContentComponent;
  }

  async updateComponent(id: string, data: UpdateComponentInput): Promise<NativeContentComponent> {
    return { id, ...data } as unknown as NativeContentComponent;
  }

  async getComponent(id: string): Promise<NativeContentComponent | null> {
    return null;
  }

  async getComponentVersions(id: string): Promise<ComponentVersion[]> {
    return [];
  }

  async searchComponents(params: ComponentSearchInput): Promise<SearchResult<NativeContentComponent>> {
    return { items: [], total: 0, limit: 10, offset: 0, hasMore: false };
  }

  async createDocument(data: CreateDocumentInput): Promise<NativeStructuredDocument> {
    return { id: `doc-${Date.now()}`, ...data } as unknown as NativeStructuredDocument;
  }

  async updateDocument(id: string, data: UpdateDocumentInput): Promise<NativeStructuredDocument> {
    return { id, ...data } as unknown as NativeStructuredDocument;
  }

  async getDocument(id: string): Promise<NativeStructuredDocument | null> {
    return null;
  }

  async getDocumentWithComponents(id: string): Promise<DocumentWithComponents | null> {
    return null;
  }

  async searchDocuments(params: DocumentSearchInput): Promise<SearchResult<NativeStructuredDocument>> {
    return { items: [], total: 0, limit: 10, offset: 0, hasMore: false };
  }

  async assembleDocument(documentId: string): Promise<AssembledDocument> {
    return { documentId, content: '', sections: [], assembledAt: new Date().toISOString() } as unknown as AssembledDocument;
  }

  async generateOutput(documentId: string, format: OutputFormat): Promise<DocumentOutputRecord> {
    return { id: `output-${Date.now()}`, documentId, format, generatedAt: new Date().toISOString(), fileSize: 0, status: 'completed' } as unknown as DocumentOutputRecord;
  }

  async deriveDocument(sourceId: string, targetType: DocumentType, options: DerivationOptions): Promise<NativeStructuredDocument> {
    return { id: `doc-${Date.now()}`, type: targetType, metadata: { derivedFrom: sourceId } } as unknown as NativeStructuredDocument;
  }

  async syncDerivedDocument(documentId: string): Promise<DerivationSyncResult> {
    return { success: true, changes: [] } as unknown as DerivationSyncResult;
  }

  async getChangeEvents(componentId: string): Promise<ChangeEvent[]> {
    return [];
  }

  async propagateChange(changeEventId: string, options: PropagationOptions): Promise<PropagationResult> {
    return { success: true, affectedDocuments: [] } as unknown as PropagationResult;
  }

  async createReview(data: CreateReviewInput): Promise<NativeReviewRequest> {
    return { id: `review-${Date.now()}`, ...data, status: 'pending', createdAt: new Date().toISOString() } as unknown as NativeReviewRequest;
  }

  async submitDecision(reviewId: string, decision: ReviewDecision): Promise<NativeReviewRequest> {
    return { id: reviewId, status: (decision as unknown as string) === 'approve' ? 'approved' : 'rejected' } as unknown as NativeReviewRequest;
  }

  async getPendingReviews(userId: string): Promise<NativeReviewRequest[]> {
    return [];
  }

  async runConsistencyCheck(componentIds: string[], checkType: ConsistencyCheckType): Promise<AIConsistencyCheck> {
    return { id: `check-${Date.now()}`, componentIds, checkType, status: 'completed', issues: [], runAt: new Date().toISOString() } as unknown as AIConsistencyCheck;
  }

  async getSyncStatus(): Promise<ExternalSyncStatus> {
    return { connected: true, lastSync: new Date().toISOString(), pendingChanges: 0 } as unknown as ExternalSyncStatus;
  }

  async triggerSync(): Promise<void> {
    // No-op
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    return { status: 'completed', progress: 100, migratedDocuments: 0, totalDocuments: 0 } as unknown as MigrationStatus;
  }
}
