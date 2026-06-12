
// =============================================================================
// PgVector Store
// =============================================================================
// PostgreSQL vector store implementation using pgvector extension.
// Uses Prisma for database connection management.
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
  type VectorMetadata,
} from './vector-store';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Configuration for PgVectorStore
 */
export interface PgVectorStoreConfig {
  connectionString?: string;
  dimensions: number;
  tableName?: string;
  indexName?: string;
  
  // HNSW index parameters
  hnsw?: {
    m?: number;              // Max connections per node (default: 16)
    efConstruction?: number; // Build-time search width (default: 64)
  };
  
  // Pool settings
  poolSize?: number;
}

/**
 * Row from the embeddings table
 */
interface EmbeddingRow {
  id: string;
  embedding: string;  // pgvector returns as string
  metadata: VectorMetadata;
  content: string | null;
  namespace: string;
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// PgVector Store
// -----------------------------------------------------------------------------

/**
 * PostgreSQL vector store using pgvector extension
 */
export class PgVectorStore extends BaseVectorStore {
  readonly provider: VectorDBProvider = 'pgvector';
  readonly dimensions: number;
  
  private readonly tableName: string;
  private readonly indexName: string;
  private readonly config: PgVectorStoreConfig;
  private initialized: boolean = false;
  
  // Note: In production, this would use Prisma client
  // For now, we'll use a mock that demonstrates the SQL patterns
  private queryFn: QueryFunction | null = null;

  constructor(config: PgVectorStoreConfig) {
    super();
    this.dimensions = config.dimensions;
    this.tableName = config.tableName ?? 'embeddings';
    this.indexName = config.indexName ?? 'embeddings_embedding_idx';
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * Set the query function (dependency injection for testing)
   */
  setQueryFunction(fn: QueryFunction): void {
    this.queryFn = fn;
  }

  private async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.queryFn) {
      throw new Error('Query function not set. Call setQueryFunction() or use PgVectorStoreFactory.');
    }
    return this.queryFn(sql, params);
  }

  private async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.query(sql, params);
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    // Enable pgvector extension
    await this.execute('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Create embeddings table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        embedding vector(${this.dimensions}),
        metadata JSONB NOT NULL DEFAULT '{}',
        content TEXT,
        namespace TEXT NOT NULL DEFAULT 'default',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await this.execute(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_namespace_idx 
      ON ${this.tableName} (namespace)
    `);
    
    await this.execute(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_document_idx 
      ON ${this.tableName} ((metadata->>'documentId'))
    `);
    
    // Create HNSW index for vector similarity search
    const m = this.config.hnsw?.m ?? 16;
    const efConstruction = this.config.hnsw?.efConstruction ?? 64;
    
    await this.execute(`
      CREATE INDEX IF NOT EXISTS ${this.indexName}
      ON ${this.tableName} 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = ${m}, ef_construction = ${efConstruction})
    `);
    
    this.initialized = true;
  }

  async close(): Promise<void> {
    this.queryFn = null;
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async upsert(input: VectorUpsertInput, namespace: string = 'default'): Promise<void> {
    this.validateDimensions(input.embedding);
    
    const embeddingStr = `[${input.embedding.join(',')}]`;
    
    await this.execute(`
      INSERT INTO ${this.tableName} (id, embedding, metadata, content, namespace, updated_at)
      VALUES ($1, $2::vector, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        embedding = $2::vector,
        metadata = $3,
        content = $4,
        namespace = $5,
        updated_at = NOW()
    `, [input.id, embeddingStr, JSON.stringify(input.metadata), input.content ?? null, namespace]);
  }

  async upsertBatch(inputs: VectorUpsertInput[], namespace: string = 'default'): Promise<void> {
    if (inputs.length === 0) return;
    
    // Build batch insert with ON CONFLICT
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    
    for (const input of inputs) {
      this.validateDimensions(input.embedding);
      const embeddingStr = `[${input.embedding.join(',')}]`;
      
      values.push(`($${paramIndex}, $${paramIndex + 1}::vector, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, NOW())`);
      params.push(
        input.id,
        embeddingStr,
        JSON.stringify(input.metadata),
        input.content ?? null,
        namespace
      );
      paramIndex += 5;
    }
    
    await this.execute(`
      INSERT INTO ${this.tableName} (id, embedding, metadata, content, namespace, updated_at)
      VALUES ${values.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        content = EXCLUDED.content,
        namespace = EXCLUDED.namespace,
        updated_at = NOW()
    `, params);
  }

  async get(id: string, namespace: string = 'default'): Promise<VectorRecord | null> {
    const rows = await this.query<EmbeddingRow>(`
      SELECT id, embedding::text, metadata, content, namespace, created_at, updated_at
      FROM ${this.tableName}
      WHERE id = $1 AND namespace = $2
    `, [id, namespace]);
    
    if (rows.length === 0) return null;
    
    return this.rowToRecord(rows[0]);
  }

  async getBatch(ids: string[], namespace: string = 'default'): Promise<(VectorRecord | null)[]> {
    if (ids.length === 0) return [];
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.query<EmbeddingRow>(`
      SELECT id, embedding::text, metadata, content, namespace, created_at, updated_at
      FROM ${this.tableName}
      WHERE id IN (${placeholders}) AND namespace = $${ids.length + 1}
    `, [...ids, namespace]);
    
    // Map results back to input order
    const rowMap = new Map(rows.map(r => [r.id, r]));
    return ids.map(id => {
      const row = rowMap.get(id);
      return row ? this.rowToRecord(row) : null;
    });
  }

  async delete(id: string, namespace: string = 'default'): Promise<boolean> {
    const result = await this.query<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM ${this.tableName}
        WHERE id = $1 AND namespace = $2
        RETURNING 1
      )
      SELECT COUNT(*) as count FROM deleted
    `, [id, namespace]);
    
    return (result[0]?.count ?? 0) > 0;
  }

  async deleteBatch(ids: string[], namespace: string = 'default'): Promise<number> {
    if (ids.length === 0) return 0;
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.query<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM ${this.tableName}
        WHERE id IN (${placeholders}) AND namespace = $${ids.length + 1}
        RETURNING 1
      )
      SELECT COUNT(*) as count FROM deleted
    `, [...ids, namespace]);
    
    return result[0]?.count ?? 0;
  }

  async deleteByFilter(filter: VectorFilter, namespace: string = 'default'): Promise<number> {
    const { whereClause, params } = this.buildFilterClause(filter, namespace);
    
    const result = await this.query<{ count: number }>(`
      WITH deleted AS (
        DELETE FROM ${this.tableName}
        ${whereClause}
        RETURNING 1
      )
      SELECT COUNT(*) as count FROM deleted
    `, params);
    
    return result[0]?.count ?? 0;
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
      namespace = 'default',
    } = options;
    
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE clause
    const conditions: string[] = ['namespace = $1'];
    const params: unknown[] = [namespace];
    let paramIndex = 2;
    
    if (filter) {
      const filterResult = this.buildFilterConditions(filter, paramIndex);
      conditions.push(...filterResult.conditions);
      params.push(...filterResult.params);
      paramIndex = filterResult.nextParamIndex;
    }
    
    // Add min score filter
    if (minScore > 0) {
      conditions.push(`1 - (embedding <=> $${paramIndex}::vector) >= ${minScore}`);
    }
    
    params.push(embeddingStr);
    const embeddingParam = `$${paramIndex}`;
    
    const selectContent = includeContent ? ', content' : '';
    
    const rows = await this.query<EmbeddingRow & { score: number }>(`
      SELECT 
        id,
        embedding::text,
        metadata,
        1 - (embedding <=> ${embeddingParam}::vector) as score
        ${selectContent}
      FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY embedding <=> ${embeddingParam}::vector
      LIMIT ${topK}
    `, params);
    
    return {
      results: rows.map(row => ({
        id: row.id,
        score: row.score,
        metadata: row.metadata,
        content: includeContent ? row.content ?? undefined : undefined,
      })),
      totalFound: rows.length,
      searchTimeMs: Date.now() - startTime,
      namespace,
    };
  }

  // ---------------------------------------------------------------------------
  // Stats and Health
  // ---------------------------------------------------------------------------

  async getStats(namespace?: string): Promise<VectorStoreStats> {
    const countQuery = namespace
      ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE namespace = $1`
      : `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    const countResult = await this.query<{ count: number }>(
      countQuery,
      namespace ? [namespace] : []
    );
    
    const docQuery = namespace
      ? `SELECT COUNT(DISTINCT metadata->>'documentId') as count FROM ${this.tableName} WHERE namespace = $1`
      : `SELECT COUNT(DISTINCT metadata->>'documentId') as count FROM ${this.tableName}`;
    
    const docResult = await this.query<{ count: number }>(
      docQuery,
      namespace ? [namespace] : []
    );
    
    const stats: VectorStoreStats = {
      totalVectors: Number(countResult[0]?.count ?? 0),
      dimensions: this.dimensions,
      documentsIndexed: Number(docResult[0]?.count ?? 0),
    };
    
    if (!namespace) {
      const nsResult = await this.query<{ namespace: string }>(
        `SELECT DISTINCT namespace FROM ${this.tableName}`
      );
      stats.namespaces = nsResult.map(r => r.namespace);
    }
    
    // Get index size
    try {
      const sizeResult = await this.query<{ size: number }>(`
        SELECT pg_relation_size($1) as size
      `, [this.indexName]);
      stats.indexSizeBytes = Number(sizeResult[0]?.size ?? 0);
    } catch {
      // Index size not available
    }
    
    return stats;
  }

  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity check
      await this.query('SELECT 1');
      
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
  // Helpers
  // ---------------------------------------------------------------------------

  private rowToRecord(row: EmbeddingRow): VectorRecord {
    return {
      id: row.id,
      embedding: this.parseEmbedding(row.embedding),
      metadata: row.metadata,
      content: row.content ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseEmbedding(embeddingStr: string): number[] {
    // pgvector returns embeddings as "[1.0,2.0,3.0]"
    const clean = embeddingStr.replace(/^\[|\]$/g, '');
    return clean.split(',').map(Number);
  }

  private buildFilterClause(filter: VectorFilter, namespace: string): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = ['namespace = $1'];
    const params: unknown[] = [namespace];
    let paramIndex = 2;
    
    const result = this.buildFilterConditions(filter, paramIndex);
    conditions.push(...result.conditions);
    params.push(...result.params);
    
    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  private buildFilterConditions(filter: VectorFilter, startIndex: number): {
    conditions: string[];
    params: unknown[];
    nextParamIndex: number;
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = startIndex;
    
    if (filter.documentId) {
      const ids = Array.isArray(filter.documentId) ? filter.documentId : [filter.documentId];
      conditions.push(`metadata->>'documentId' = ANY($${paramIndex})`);
      params.push(ids);
      paramIndex++;
    }
    
    if (filter.documentType) {
      const types = Array.isArray(filter.documentType) ? filter.documentType : [filter.documentType];
      conditions.push(`metadata->>'documentType' = ANY($${paramIndex})`);
      params.push(types);
      paramIndex++;
    }
    
    if (filter.productId) {
      const ids = Array.isArray(filter.productId) ? filter.productId : [filter.productId];
      conditions.push(`metadata->>'productId' = ANY($${paramIndex})`);
      params.push(ids);
      paramIndex++;
    }
    
    if (filter.studyId) {
      const ids = Array.isArray(filter.studyId) ? filter.studyId : [filter.studyId];
      conditions.push(`metadata->>'studyId' = ANY($${paramIndex})`);
      params.push(ids);
      paramIndex++;
    }
    
    if (filter.sectionNumber) {
      const sections = Array.isArray(filter.sectionNumber) ? filter.sectionNumber : [filter.sectionNumber];
      conditions.push(`metadata->>'sectionNumber' = ANY($${paramIndex})`);
      params.push(sections);
      paramIndex++;
    }
    
    if (filter.contentType) {
      const types = Array.isArray(filter.contentType) ? filter.contentType : [filter.contentType];
      conditions.push(`metadata->>'contentType' = ANY($${paramIndex})`);
      params.push(types);
      paramIndex++;
    }
    
    return { conditions, params, nextParamIndex: paramIndex };
  }
}

// -----------------------------------------------------------------------------
// Types for Query Function
// -----------------------------------------------------------------------------

/**
 * Generic query function type for database operations
 */
export type QueryFunction = <T>(sql: string, params?: unknown[]) => Promise<T[]>;
