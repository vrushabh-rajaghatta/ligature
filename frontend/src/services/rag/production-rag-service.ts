
import { getAnthropicApiKey } from '@/config/api-keys';
import { logger } from '@/lib/logger';
/**
 * Production RAG Service
 * =============================================================================
 * Lightweight RAG implementation for semantic search.
 * 
 * Components:
 * - AnthropicEmbeddingsClient: Generates embeddings via Voyage API
 * - PgVectorStore: PostgreSQL with pgvector extension for similarity search
 * - MemoryVectorStore: In-memory fallback when pgvector is not available
 * 
 * Version: 0.27.10
 */

import { AnthropicEmbeddingsClient } from './anthropic-embeddings';
import { MemoryVectorStore } from './memory-vector-store';
import { getPgVectorStore } from './prisma-pgvector';
import { DEFAULT_EMBEDDING_CONFIG } from './rag-config';
import type { IVectorStore, VectorFilter } from './vector-store';

// -----------------------------------------------------------------------------
// Production RAG Types (simplified from IRAGService)
// -----------------------------------------------------------------------------

export interface ProductionRAGResult {
  documentId: string;
  chunkId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  highlights?: string[];
}

export interface ProductionIngestResult {
  documentId: string;
  chunksCreated: number;
  status: 'completed' | 'failed';
  error?: string;
  processingTimeMs: number;
}

export interface ProductionDocumentStatus {
  documentId: string;
  status: 'processing' | 'indexed' | 'error';
  chunksIndexed?: number;
  totalChunks?: number;
  error?: string;
  lastUpdated: Date;
}

export interface ProductionSourceDocument {
  id: string;
  title: string;
  type: string;
  version: string;
  status: 'ready' | 'processing';
  uploadedAt: Date;
  metadata: Record<string, unknown>;
}

export interface ProductionContextWindow {
  context: string;
  citations: Array<{
    documentId: string;
    chunkId: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  sources: Array<{
    documentId: string;
    title: string;
    chunksUsed: number;
  }>;
  totalTokens: number;
  truncated: boolean;
}

export interface ProductionChunkingConfig {
  strategy: 'semantic' | 'fixed' | 'hybrid';
  maxChunkTokens: number;
  overlapTokens: number;
  minChunkTokens?: number;
  respectBoundaries?: boolean;
}

export interface ProductionRAGHealthStatus {
  healthy: boolean;
  embedding: { latencyMs: number; model: string };
  vectorDb: { connected: boolean; documentCount: number };
}

export interface ProductionSearchOptions {
  topK?: number;
  minScore?: number;
  filter?: {
    documentIds?: string[];
    contentTypes?: string[];
  };
}

export interface IProductionRAGService {
  ingestDocument(
    documentId: string,
    content: string,
    metadata: Record<string, unknown>,
    options?: { chunkingConfig?: ProductionChunkingConfig }
  ): Promise<ProductionIngestResult>;
  
  reindexDocument(documentId: string): Promise<ProductionIngestResult>;
  deleteDocument(documentId: string): Promise<boolean>;
  getDocumentStatus(documentId: string): Promise<ProductionDocumentStatus | null>;
  listDocuments(): Promise<ProductionSourceDocument[]>;
  
  search(query: string, options?: ProductionSearchOptions): Promise<ProductionRAGResult[]>;
  searchMultiple(queries: string[], options?: ProductionSearchOptions): Promise<ProductionRAGResult[]>;
  
  assembleContext(
    query: string,
    options?: { maxTokens?: number; sources?: string[]; sectionWeights?: Record<string, number> }
  ): Promise<ProductionContextWindow>;
  
  findSimilar(
    documentId: string,
    options?: { topK?: number; excludeSameDocument?: boolean }
  ): Promise<ProductionRAGResult[]>;
  
  healthCheck(): Promise<ProductionRAGHealthStatus>;
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Creates a production RAG service instance
 * Automatically configures based on environment variables
 */
export async function createProductionRAGService(): Promise<IProductionRAGService> {
  // Get API key (prefer Voyage, fall back to Anthropic)
  const apiKey = process.env.VOYAGE_API_KEY || getAnthropicApiKey();
  
  if (!apiKey) {
    throw new Error(
      'RAG service requires VOYAGE_API_KEY or ANTHROPIC_API_KEY environment variable'
    );
  }

  // Initialize embeddings client
  const embeddingsClient = new AnthropicEmbeddingsClient({
    ...DEFAULT_EMBEDDING_CONFIG,
    apiKey,
  });

  // Initialize vector store
  let vectorStore: IVectorStore;
  const vectorDimensions = DEFAULT_EMBEDDING_CONFIG.model === 'voyage-3' ? 1024 : 1536;
  
  if (process.env.PGVECTOR_ENABLED === 'true' && process.env.DATABASE_URL) {
    try {
      // Use Prisma-based pgvector store
      vectorStore = await getPgVectorStore({ dimensions: vectorDimensions });
      logger.debug('ProductionRAG', 'Using pgvector store with Prisma');
    } catch (error) {
      logger.warn('ProductionRAG', 'pgvector initialization failed, using memory store', error);
      vectorStore = new MemoryVectorStore(vectorDimensions);
    }
  } else {
    logger.debug('ProductionRAG', 'PGVECTOR_ENABLED not set, using memory store');
    vectorStore = new MemoryVectorStore(vectorDimensions);
  }

  return new ProductionRAGService(embeddingsClient, vectorStore);
}

// -----------------------------------------------------------------------------
// Production RAG Service Implementation
// -----------------------------------------------------------------------------

class ProductionRAGService implements IProductionRAGService {
  private documentStatuses: Map<string, ProductionDocumentStatus> = new Map();

  constructor(
    private embeddings: AnthropicEmbeddingsClient,
    private vectorStore: IVectorStore
  ) {}

  // ---------------------------------------------------------------------------
  // Document Ingestion
  // ---------------------------------------------------------------------------

  async ingestDocument(
    documentId: string,
    content: string,
    metadata: Record<string, unknown>,
    options?: { chunkingConfig?: ProductionChunkingConfig }
  ): Promise<ProductionIngestResult> {
    const startTime = Date.now();
    
    try {
      // Update status
      this.documentStatuses.set(documentId, {
        documentId,
        status: 'processing',
        chunksIndexed: 0,
        lastUpdated: new Date(),
      });

      // Chunk the content
      const chunkingConfig = options?.chunkingConfig || this.getDefaultChunkingConfig();
      const chunks = this.chunkContent(content, chunkingConfig);
      
      // Generate embeddings in batches
      const batchSize = 32;
      let chunksIndexed = 0;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map(c => c.text);
        
        const embeddingResponse = await this.embeddings.generateEmbeddings(texts);
        
        // Store in vector database
        await this.vectorStore.upsertBatch(
          batch.map((chunk, j) => ({
            id: `${documentId}-chunk-${i + j}`,
            embedding: embeddingResponse.embeddings[j],
            metadata: {
              documentId,
              chunkId: `${documentId}-chunk-${i + j}`,
              chunkIndex: i + j,
              text: chunk.text,
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              contentType: this.detectContentType(chunk.text),
              ...Object.fromEntries(
                Object.entries(metadata).filter(([, v]) => 
                  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
                )
              ),
            },
          }))
        );
        
        chunksIndexed += batch.length;
        
        // Update progress
        this.documentStatuses.set(documentId, {
          documentId,
          status: 'processing',
          chunksIndexed,
          totalChunks: chunks.length,
          lastUpdated: new Date(),
        });
      }

      // Mark as completed
      this.documentStatuses.set(documentId, {
        documentId,
        status: 'indexed',
        chunksIndexed,
        totalChunks: chunks.length,
        lastUpdated: new Date(),
      });

      return {
        documentId,
        chunksCreated: chunksIndexed,
        status: 'completed',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Mark as failed
      this.documentStatuses.set(documentId, {
        documentId,
        status: 'error',
        error: (error as Error).message,
        lastUpdated: new Date(),
      });

      return {
        documentId,
        chunksCreated: 0,
        status: 'failed',
        error: (error as Error).message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async reindexDocument(documentId: string): Promise<ProductionIngestResult> {
    const startTime = Date.now();
    
    // First delete existing chunks
    await this.deleteDocument(documentId);
    
    // Would need to retrieve original content to reindex
    // For now, return error indicating manual reingestion needed
    return {
      documentId,
      chunksCreated: 0,
      status: 'failed',
      error: 'Reindexing requires original content. Please reingest the document.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await this.vectorStore.deleteByFilter({ documentId: [documentId] });
      this.documentStatuses.delete(documentId);
      return true;
    } catch (error) {
      logger.error('ProductionRAG', `Failed to delete document ${documentId}:`, error);
      return false;
    }
  }

  async getDocumentStatus(documentId: string): Promise<ProductionDocumentStatus | null> {
    return this.documentStatuses.get(documentId) || null;
  }

  async listDocuments(): Promise<ProductionSourceDocument[]> {
    // This would require querying the vector store for unique documentIds
    // For now, return statuses we've tracked
    const documents: ProductionSourceDocument[] = [];
    
    for (const [documentId, status] of Array.from(this.documentStatuses)) {
      documents.push({
        id: documentId,
        title: documentId, // Would need metadata lookup for real title
        type: 'other',
        version: '1.0',
        status: status.status === 'indexed' ? 'ready' : 'processing',
        uploadedAt: status.lastUpdated,
        metadata: {},
      });
    }
    
    return documents;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search(query: string, options?: ProductionSearchOptions): Promise<ProductionRAGResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.generateEmbedding(query);
      
      // Build filter from options
      const filter: Record<string, unknown> = {};
      if (options?.filter?.documentIds) {
        filter.documentId = options.filter.documentIds;
      }
      if (options?.filter?.contentTypes) {
        filter.contentType = options.filter.contentTypes;
      }

      // Search vector store
      const searchResponse = await this.vectorStore.search(queryEmbedding, {
        topK: options?.topK || 10,
        minScore: options?.minScore || 0.5,
        filter: Object.keys(filter).length > 0 ? filter as VectorFilter : undefined,
      });

      // Transform to ProductionRAGResult format
      return searchResponse.results.map(r => ({
        documentId: r.metadata.documentId as string,
        chunkId: r.id,
        content: r.metadata.text as string,
        score: r.score,
        metadata: {
          chunkIndex: r.metadata.chunkIndex as number,
          contentType: r.metadata.contentType as string,
          startOffset: r.metadata.startOffset as number,
          endOffset: r.metadata.endOffset as number,
        },
        highlights: this.findHighlights(r.metadata.text as string, query),
      }));
    } catch (error) {
      logger.error('ProductionRAG', 'Search failed', error);
      throw error;
    }
  }

  async searchMultiple(
    queries: string[],
    options?: ProductionSearchOptions
  ): Promise<ProductionRAGResult[]> {
    // Generate embeddings for all queries
    const embeddingResponse = await this.embeddings.generateEmbeddings(queries);
    
    // Search for each and merge results
    const allResults: ProductionRAGResult[] = [];
    const seenChunks = new Set<string>();

    for (const embedding of Array.from(embeddingResponse.embeddings)) {
      const searchResponse = await this.vectorStore.search(embedding, {
        topK: options?.topK || 10,
        minScore: options?.minScore || 0.5,
      });

      for (const r of Array.from(searchResponse.results)) {
        if (!seenChunks.has(r.id)) {
          seenChunks.add(r.id);
          allResults.push({
            documentId: r.metadata.documentId as string,
            chunkId: r.id,
            content: r.metadata.text as string,
            score: r.score,
            metadata: r.metadata as Record<string, unknown>,
          });
        }
      }
    }

    // Sort by score descending
    allResults.sort((a, b) => b.score - a.score);
    
    return allResults.slice(0, options?.topK || 10);
  }

  // ---------------------------------------------------------------------------
  // Context Assembly
  // ---------------------------------------------------------------------------

  async assembleContext(
    query: string,
    options?: {
      maxTokens?: number;
      sources?: string[];
      sectionWeights?: Record<string, number>;
    }
  ): Promise<ProductionContextWindow> {
    const maxTokens = options?.maxTokens || 8000;
    
    // Search with source filter if provided
    const searchOptions: ProductionSearchOptions = {
      topK: 50, // Get more results to have selection
      minScore: 0.4,
    };
    
    if (options?.sources && options.sources.length > 0) {
      searchOptions.filter = { documentIds: options.sources };
    }

    const results = await this.search(query, searchOptions);

    // Apply section weights if provided
    if (options?.sectionWeights) {
      for (const result of Array.from(results)) {
        const contentType = result.metadata?.contentType as string;
        if (contentType && options.sectionWeights[contentType]) {
          result.score *= options.sectionWeights[contentType];
        }
      }
      results.sort((a, b) => b.score - a.score);
    }

    // Assemble context within token budget
    let context = '';
    const citations: ProductionContextWindow['citations'] = [];
    const sources: ProductionContextWindow['sources'] = [];
    let tokenCount = 0;
    const sourceSet = new Set<string>();

    for (const result of Array.from(results)) {
      const chunkTokens = this.estimateTokens(result.content);
      
      if (tokenCount + chunkTokens > maxTokens) {
        break;
      }

      // Add to context with source reference
      const sourceRef = `[Source: ${result.documentId}]`;
      context += `\n\n${sourceRef}\n${result.content}`;
      
      // Track citation
      citations.push({
        documentId: result.documentId,
        chunkId: result.chunkId,
        excerpt: result.content.slice(0, 200) + (result.content.length > 200 ? '...' : ''),
        relevanceScore: result.score,
      });

      // Track unique sources
      if (!sourceSet.has(result.documentId)) {
        sourceSet.add(result.documentId);
        sources.push({
          documentId: result.documentId,
          title: result.documentId, // Would need metadata lookup
          chunksUsed: 1,
        });
      } else {
        const source = sources.find(s => s.documentId === result.documentId);
        if (source) source.chunksUsed++;
      }

      tokenCount += chunkTokens;
    }

    return {
      context: context.trim(),
      citations,
      sources,
      totalTokens: tokenCount,
      truncated: results.length > citations.length,
    };
  }

  async findSimilar(
    documentId: string,
    options?: { topK?: number; excludeSameDocument?: boolean }
  ): Promise<ProductionRAGResult[]> {
    // Get chunks from this document
    const docResponse = await this.vectorStore.search(
      new Array(1024).fill(0), // Dummy vector - need to get actual doc vectors
      {
        topK: 5,
        filter: { documentId: [documentId] },
      }
    );

    if (docResponse.results.length === 0) {
      return [];
    }

    // Use first chunk's embedding to find similar documents
    // In production, would compute document-level embedding
    const firstChunkEmbedding = docResponse.results[0].embedding;
    
    if (!firstChunkEmbedding) {
      return [];
    }

    const searchResponse = await this.vectorStore.search(firstChunkEmbedding, {
      topK: (options?.topK || 10) + (options?.excludeSameDocument ? 10 : 0), // Get extra if excluding
    });

    // Filter and map results
    let results = searchResponse.results;
    
    // Post-filter to exclude same document if requested
    if (options?.excludeSameDocument) {
      results = results.filter(r => r.metadata.documentId !== documentId);
    }

    return results.slice(0, options?.topK || 10).map(r => ({
      documentId: r.metadata.documentId as string,
      chunkId: r.id,
      content: r.metadata.text as string,
      score: r.score,
      metadata: r.metadata as Record<string, unknown>,
    }));
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<ProductionRAGHealthStatus> {
    // Test embedding
    const embeddingStart = Date.now();
    try {
      await this.embeddings.generateEmbedding('health check');
    } catch (error) {
      return {
        healthy: false,
        embedding: { latencyMs: -1, model: DEFAULT_EMBEDDING_CONFIG.model },
        vectorDb: { connected: false, documentCount: 0 },
      };
    }
    const embeddingLatency = Date.now() - embeddingStart;

    // Test vector store
    let vectorDbConnected = false;
    let documentCount = 0;
    try {
      const stats = await this.vectorStore.getStats();
      vectorDbConnected = true;
      documentCount = stats.totalVectors;
    } catch {
      vectorDbConnected = false;
    }

    return {
      healthy: vectorDbConnected,
      embedding: { latencyMs: embeddingLatency, model: DEFAULT_EMBEDDING_CONFIG.model },
      vectorDb: { connected: vectorDbConnected, documentCount },
    };
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private getDefaultChunkingConfig(): ProductionChunkingConfig {
    return {
      strategy: 'hybrid',
      maxChunkTokens: 512,
      overlapTokens: 50,
      minChunkTokens: 100,
      respectBoundaries: true,
    };
  }

  private chunkContent(
    content: string,
    config: ProductionChunkingConfig
  ): Array<{ text: string; startOffset: number; endOffset: number }> {
    const chunks: Array<{ text: string; startOffset: number; endOffset: number }> = [];
    
    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let startOffset = 0;
    let chunkStartOffset = 0;

    for (const para of Array.from(paragraphs)) {
      const paraTokens = this.estimateTokens(para);
      const currentTokens = this.estimateTokens(currentChunk);

      if (currentTokens + paraTokens > config.maxChunkTokens && currentChunk) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          startOffset: chunkStartOffset,
          endOffset: startOffset,
        });
        
        // Start new chunk with overlap
        if (config.overlapTokens > 0) {
          const overlapText = this.getLastNTokens(currentChunk, config.overlapTokens);
          currentChunk = overlapText + '\n\n' + para;
          chunkStartOffset = startOffset - overlapText.length;
        } else {
          currentChunk = para;
          chunkStartOffset = startOffset;
        }
      } else {
        if (currentChunk) {
          currentChunk += '\n\n' + para;
        } else {
          currentChunk = para;
          chunkStartOffset = startOffset;
        }
      }

      startOffset += para.length + 2; // +2 for \n\n
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        startOffset: chunkStartOffset,
        endOffset: content.length,
      });
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  private getLastNTokens(text: string, n: number): string {
    const approxChars = n * 4;
    if (text.length <= approxChars) return text;
    return text.slice(-approxChars);
  }

  private detectContentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (/\bp\s*[<>=]\s*0?\.\d+/.test(lowerText)) {
      return 'statistical';
    }
    if (/adverse\s*event|safety|tolerability/i.test(lowerText)) {
      return 'safety';
    }
    if (/efficacy|primary\s*endpoint|secondary\s*endpoint/i.test(lowerText)) {
      return 'efficacy';
    }
    if (/method|procedure|protocol/i.test(lowerText)) {
      return 'methods';
    }
    if (/background|introduction|rationale/i.test(lowerText)) {
      return 'background';
    }
    if (/conclusion|summary|discussion/i.test(lowerText)) {
      return 'conclusions';
    }
    
    return 'general';
  }

  private findHighlights(text: string, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const sentences = text.split(/[.!?]+/);

    for (const sentence of Array.from(sentences)) {
      const lowerSentence = sentence.toLowerCase();
      if (queryTerms.some(term => lowerSentence.includes(term))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }

    return highlights;
  }
}

export { ProductionRAGService };
