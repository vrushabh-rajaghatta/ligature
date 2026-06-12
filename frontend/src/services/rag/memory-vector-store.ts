
// =============================================================================
// Memory Vector Store
// =============================================================================
// In-memory vector store implementation for testing and development.
// Uses brute-force cosine similarity search.
// =============================================================================

import type { VectorDBProvider } from '@/types/rag';

import {
  BaseVectorStore,
  type VectorRecord,
  type VectorUpsertInput,
  type VectorFilter,
  type VectorSearchOptions,
  type VectorSearchResponse,
  type VectorStoreStats,
  type VectorStoreHealth,
} from './vector-store';

// -----------------------------------------------------------------------------
// Memory Vector Store
// -----------------------------------------------------------------------------

/**
 * In-memory vector store for testing and development
 */
export class MemoryVectorStore extends BaseVectorStore {
  readonly provider: VectorDBProvider = 'memory';
  readonly dimensions: number;
  
  private store: Map<string, Map<string, VectorRecord>>;
  private initialized: boolean = false;

  constructor(dimensions: number = 1024) {
    super();
    this.dimensions = dimensions;
    this.store = new Map();
    this.store.set('default', new Map());
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async close(): Promise<void> {
    this.store.clear();
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async upsert(input: VectorUpsertInput, namespace: string = 'default'): Promise<void> {
    this.validateDimensions(input.embedding);
    
    const ns = this.getNamespace(namespace);
    const now = new Date();
    
    const existing = ns.get(input.id);
    const record: VectorRecord = {
      id: input.id,
      embedding: [...input.embedding],
      metadata: { ...input.metadata },
      content: input.content,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    
    ns.set(input.id, record);
  }

  async upsertBatch(inputs: VectorUpsertInput[], namespace: string = 'default'): Promise<void> {
    for (const input of Array.from(inputs)) {
      await this.upsert(input, namespace);
    }
  }

  async get(id: string, namespace: string = 'default'): Promise<VectorRecord | null> {
    const ns = this.getNamespace(namespace);
    return ns.get(id) ?? null;
  }

  async getBatch(ids: string[], namespace: string = 'default'): Promise<(VectorRecord | null)[]> {
    const ns = this.getNamespace(namespace);
    return ids.map(id => ns.get(id) ?? null);
  }

  async delete(id: string, namespace: string = 'default'): Promise<boolean> {
    const ns = this.getNamespace(namespace);
    return ns.delete(id);
  }

  async deleteBatch(ids: string[], namespace: string = 'default'): Promise<number> {
    const ns = this.getNamespace(namespace);
    let deleted = 0;
    for (const id of Array.from(ids)) {
      if (ns.delete(id)) deleted++;
    }
    return deleted;
  }

  async deleteByFilter(filter: VectorFilter, namespace: string = 'default'): Promise<number> {
    const ns = this.getNamespace(namespace);
    const toDelete: string[] = [];
    
    for (const [id, record] of Array.from(ns)) {
      if (this.matchesFilter(record.metadata, filter)) {
        toDelete.push(id);
      }
    }
    
    for (const id of Array.from(toDelete)) {
      ns.delete(id);
    }
    
    return toDelete.length;
  }

  async deleteByDocument(documentId: string, namespace: string = 'default'): Promise<number> {
    return this.deleteByFilter({ documentId }, namespace);
  }

  // ---------------------------------------------------------------------------
  // Search Operations
  // ---------------------------------------------------------------------------

  async search(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResponse> {
    const startTime = Date.now();
    
    this.validateDimensions(queryEmbedding);
    
    const {
      topK = 10,
      minScore = 0,
      filter,
      includeContent = false,
      includeMetadata = true,
      namespace = 'default',
    } = options;
    
    const ns = this.getNamespace(namespace);
    const results: Array<{ record: VectorRecord; score: number }> = [];
    
    // Calculate similarity for all vectors
    for (const record of Array.from(Array.from(ns.values()))) {
      // Apply filter
      if (filter && !this.matchesFilter(record.metadata, filter)) {
        continue;
      }
      
      const score = this.cosineSimilarity(queryEmbedding, record.embedding);
      
      if (score >= minScore) {
        results.push({ record, score });
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Take top K
    const topResults = results.slice(0, topK);
    
    return {
      results: topResults.map(({ record, score }) => ({
        id: record.id,
        score,
        metadata: includeMetadata ? { ...record.metadata } : record.metadata,
        content: includeContent ? record.content : undefined,
      })),
      totalFound: topResults.length,
      searchTimeMs: Date.now() - startTime,
      namespace,
    };
  }

  // ---------------------------------------------------------------------------
  // Stats and Health
  // ---------------------------------------------------------------------------

  async getStats(namespace?: string): Promise<VectorStoreStats> {
    if (namespace) {
      const ns = this.getNamespace(namespace);
      const documentIds = new Set<string>();
      for (const record of Array.from(Array.from(ns.values()))) {
        documentIds.add(record.metadata.documentId);
      }
      
      return {
        totalVectors: ns.size,
        dimensions: this.dimensions,
        documentsIndexed: documentIds.size,
      };
    }
    
    // All namespaces
    let totalVectors = 0;
    const documentIds = new Set<string>();
    const namespaces: string[] = [];
    
    for (const [nsName, ns] of Array.from(this.store)) {
      namespaces.push(nsName);
      totalVectors += ns.size;
      for (const record of Array.from(Array.from(ns.values()))) {
        documentIds.add(record.metadata.documentId);
      }
    }
    
    return {
      totalVectors,
      dimensions: this.dimensions,
      documentsIndexed: documentIds.size,
      namespaces,
    };
  }

  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    
    try {
      const stats = await this.getStats();
      
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        provider: this.provider,
        stats,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Namespace Management
  // ---------------------------------------------------------------------------

  private getNamespace(namespace: string): Map<string, VectorRecord> {
    let ns = this.store.get(namespace);
    if (!ns) {
      ns = new Map();
      this.store.set(namespace, ns);
    }
    return ns;
  }

  /**
   * Clear all data (for testing)
   */
  clear(namespace?: string): void {
    if (namespace) {
      const ns = this.store.get(namespace);
      if (ns) ns.clear();
    } else {
      for (const ns of Array.from(Array.from(this.store.values()))) {
        ns.clear();
      }
    }
  }

  /**
   * Get all records (for testing)
   */
  getAll(namespace: string = 'default'): VectorRecord[] {
    const ns = this.getNamespace(namespace);
    return Array.from(ns.values());
  }
}
