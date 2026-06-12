
// =============================================================================
// Vector Store Interface
// =============================================================================
// Abstract interface for vector database operations.
// Implementations: PgVectorStore, MemoryVectorStore
// =============================================================================

import type { VectorDBProvider } from '@/types/rag';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

/**
 * Metadata that can be stored with vectors
 */
export interface VectorMetadata {
  documentId: string;
  chunkId: string;
  documentType?: string;
  sectionNumber?: string;
  sectionTitle?: string;
  pageStart?: number;
  pageEnd?: number;
  contentType?: string;
  productId?: string;
  studyId?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * A vector record with embedding and metadata
 */
export interface VectorRecord {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
  content?: string;  // Optional: store original text
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Input for upserting vectors
 */
export interface VectorUpsertInput {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
  content?: string;
}

/**
 * Filter conditions for vector queries
 */
export interface VectorFilter {
  documentId?: string | string[];
  documentType?: string | string[];
  productId?: string | string[];
  studyId?: string | string[];
  sectionNumber?: string | string[];
  contentType?: string | string[];
  
  // Custom metadata filters
  metadata?: Record<string, string | number | boolean | string[] | number[]>;
}

/**
 * Options for vector search
 */
export interface VectorSearchOptions {
  topK?: number;              // Number of results (default: 10)
  minScore?: number;          // Minimum similarity score (0-1)
  filter?: VectorFilter;      // Metadata filters
  includeContent?: boolean;   // Include original text in results
  includeMetadata?: boolean;  // Include metadata in results (default: true)
  namespace?: string;         // Multi-tenant namespace
}

/**
 * A single search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;              // Similarity score (0-1, higher is better)
  embedding?: number[];       // Only if requested
  metadata: VectorMetadata;
  content?: string;
}

/**
 * Aggregated search results
 */
export interface VectorSearchResponse {
  results: VectorSearchResult[];
  totalFound: number;
  searchTimeMs: number;
  namespace?: string;
}

/**
 * Stats about the vector store
 */
export interface VectorStoreStats {
  totalVectors: number;
  dimensions: number;
  indexSizeBytes?: number;
  namespaces?: string[];
  documentsIndexed?: number;
}

/**
 * Health check result
 */
export interface VectorStoreHealth {
  healthy: boolean;
  latencyMs: number;
  provider: VectorDBProvider;
  error?: string;
  stats?: VectorStoreStats;
}

// -----------------------------------------------------------------------------
// Vector Store Interface
// -----------------------------------------------------------------------------

/**
 * Abstract interface for vector database operations
 */
export interface IVectorStore {
  /**
   * Get the provider type
   */
  readonly provider: VectorDBProvider;
  
  /**
   * Get the embedding dimensions
   */
  readonly dimensions: number;
  
  /**
   * Upsert a single vector
   */
  upsert(input: VectorUpsertInput, namespace?: string): Promise<void>;
  
  /**
   * Upsert multiple vectors in batch
   */
  upsertBatch(inputs: VectorUpsertInput[], namespace?: string): Promise<void>;
  
  /**
   * Get a vector by ID
   */
  get(id: string, namespace?: string): Promise<VectorRecord | null>;
  
  /**
   * Get multiple vectors by IDs
   */
  getBatch(ids: string[], namespace?: string): Promise<(VectorRecord | null)[]>;
  
  /**
   * Delete a vector by ID
   */
  delete(id: string, namespace?: string): Promise<boolean>;
  
  /**
   * Delete multiple vectors by IDs
   */
  deleteBatch(ids: string[], namespace?: string): Promise<number>;
  
  /**
   * Delete all vectors matching a filter
   */
  deleteByFilter(filter: VectorFilter, namespace?: string): Promise<number>;
  
  /**
   * Delete all vectors for a document
   */
  deleteByDocument(documentId: string, namespace?: string): Promise<number>;
  
  /**
   * Search for similar vectors
   */
  search(
    queryEmbedding: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResponse>;
  
  /**
   * Search with multiple query vectors (returns merged results)
   */
  searchMultiple(
    queryEmbeddings: number[][],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResponse>;
  
  /**
   * Get store statistics
   */
  getStats(namespace?: string): Promise<VectorStoreStats>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<VectorStoreHealth>;
  
  /**
   * Initialize the store (create tables, indexes, etc.)
   */
  initialize(): Promise<void>;
  
  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
}

// -----------------------------------------------------------------------------
// Base Implementation
// -----------------------------------------------------------------------------

/**
 * Base class with shared utilities for vector store implementations
 */
export abstract class BaseVectorStore implements IVectorStore {
  abstract readonly provider: VectorDBProvider;
  abstract readonly dimensions: number;
  
  abstract upsert(input: VectorUpsertInput, namespace?: string): Promise<void>;
  abstract upsertBatch(inputs: VectorUpsertInput[], namespace?: string): Promise<void>;
  abstract get(id: string, namespace?: string): Promise<VectorRecord | null>;
  abstract getBatch(ids: string[], namespace?: string): Promise<(VectorRecord | null)[]>;
  abstract delete(id: string, namespace?: string): Promise<boolean>;
  abstract deleteBatch(ids: string[], namespace?: string): Promise<number>;
  abstract deleteByFilter(filter: VectorFilter, namespace?: string): Promise<number>;
  abstract deleteByDocument(documentId: string, namespace?: string): Promise<number>;
  abstract search(queryEmbedding: number[], options?: VectorSearchOptions): Promise<VectorSearchResponse>;
  abstract getStats(namespace?: string): Promise<VectorStoreStats>;
  abstract healthCheck(): Promise<VectorStoreHealth>;
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  
  /**
   * Search with multiple queries and merge results
   */
  async searchMultiple(
    queryEmbeddings: number[][],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResponse> {
    const startTime = Date.now();
    const topK = options?.topK ?? 10;
    
    // Search for each query
    const allResults = await Promise.all(
      queryEmbeddings.map(embedding => 
        this.search(embedding, { ...options, topK: topK * 2 })
      )
    );
    
    // Merge and deduplicate results
    const resultMap = new Map<string, VectorSearchResult>();
    
    for (const response of allResults) {
      for (const result of response.results) {
        const existing = resultMap.get(result.id);
        if (!existing || result.score > existing.score) {
          resultMap.set(result.id, result);
        }
      }
    }
    
    // Sort by score and take topK
    const mergedResults = Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    return {
      results: mergedResults,
      totalFound: mergedResults.length,
      searchTimeMs: Date.now() - startTime,
      namespace: options?.namespace,
    };
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }
  
  /**
   * Validate embedding dimensions
   */
  protected validateDimensions(embedding: number[]): void {
    if (embedding.length !== this.dimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`
      );
    }
  }
  
  /**
   * Apply filter to metadata
   */
  protected matchesFilter(metadata: VectorMetadata, filter: VectorFilter): boolean {
    // Document ID filter
    if (filter.documentId) {
      const ids = Array.isArray(filter.documentId) ? filter.documentId : [filter.documentId];
      if (!ids.includes(metadata.documentId)) return false;
    }
    
    // Document type filter
    if (filter.documentType) {
      const types = Array.isArray(filter.documentType) ? filter.documentType : [filter.documentType];
      if (!metadata.documentType || !types.includes(metadata.documentType)) return false;
    }
    
    // Product ID filter
    if (filter.productId) {
      const ids = Array.isArray(filter.productId) ? filter.productId : [filter.productId];
      if (!metadata.productId || !ids.includes(metadata.productId)) return false;
    }
    
    // Study ID filter
    if (filter.studyId) {
      const ids = Array.isArray(filter.studyId) ? filter.studyId : [filter.studyId];
      if (!metadata.studyId || !ids.includes(metadata.studyId)) return false;
    }
    
    // Section number filter
    if (filter.sectionNumber) {
      const sections = Array.isArray(filter.sectionNumber) ? filter.sectionNumber : [filter.sectionNumber];
      if (!metadata.sectionNumber || !sections.includes(metadata.sectionNumber)) return false;
    }
    
    // Content type filter
    if (filter.contentType) {
      const types = Array.isArray(filter.contentType) ? filter.contentType : [filter.contentType];
      if (!metadata.contentType || !types.includes(metadata.contentType)) return false;
    }
    
    // Custom metadata filters
    if (filter.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        const metaValue = metadata[key];
        if (Array.isArray(value)) {
          if (!value.includes(metaValue as never)) return false;
        } else {
          if (metaValue !== value) return false;
        }
      }
    }
    
    return true;
  }
}
