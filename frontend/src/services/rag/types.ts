
// =============================================================================
// Production RAG Types
// =============================================================================
// Extended types for production RAG service implementation.
// Builds on base types from src/types/rag.ts
// =============================================================================

import type {
  VectorDBProvider,
  EmbeddingModel,
  ChunkingConfig,
  RAGSearchOptions,
} from '@/types/rag';

// -----------------------------------------------------------------------------
// Embedding Provider Types
// -----------------------------------------------------------------------------

/**
 * Supported embedding providers
 */
export type EmbeddingProvider = 
  | 'anthropic'   // Anthropic (voyage-3 via Messages API)
  | 'openai'      // OpenAI embeddings API
  | 'voyage'      // Voyage AI direct
  | 'cohere'      // Cohere embeddings
  | 'local';      // Local model (e.g., sentence-transformers)

/**
 * Anthropic-specific embedding models available through their API
 */
export type AnthropicEmbeddingModel =
  | 'voyage-3'              // Latest Voyage model (1024 dims)
  | 'voyage-3-lite'         // Lighter/faster variant (512 dims)
  | 'voyage-code-3'         // Code-optimized (1024 dims)
  | 'voyage-finance-2'      // Finance domain (1024 dims)
  | 'voyage-law-2'          // Legal domain (1024 dims)
  | 'voyage-large-2'        // Legacy large model (1536 dims)
  | 'voyage-2';             // Legacy base model (1024 dims)

/**
 * Model dimension mapping
 */
export const EMBEDDING_DIMENSIONS: Record<AnthropicEmbeddingModel, number> = {
  'voyage-3': 1024,
  'voyage-3-lite': 512,
  'voyage-code-3': 1024,
  'voyage-finance-2': 1024,
  'voyage-law-2': 1024,
  'voyage-large-2': 1536,
  'voyage-2': 1024,
};

/**
 * Model token limits
 */
export const EMBEDDING_MAX_TOKENS: Record<AnthropicEmbeddingModel, number> = {
  'voyage-3': 32000,
  'voyage-3-lite': 32000,
  'voyage-code-3': 16000,
  'voyage-finance-2': 32000,
  'voyage-law-2': 32000,
  'voyage-large-2': 16000,
  'voyage-2': 4000,
};

// -----------------------------------------------------------------------------
// Production Configuration Types
// -----------------------------------------------------------------------------

/**
 * Complete production RAG configuration
 */
export interface RAGProductionConfig {
  // Embedding configuration
  embedding: EmbeddingServiceConfig;
  
  // Vector database configuration
  vectorDb: VectorDbServiceConfig;
  
  // Chunking configuration
  chunking: ChunkingConfig;
  
  // Search defaults
  search: RAGSearchOptions;
  
  // Performance settings
  performance: RAGPerformanceConfig;
  
  // Feature flags
  features: RAGFeatureFlags;
}

/**
 * Embedding service configuration
 */
export interface EmbeddingServiceConfig {
  provider: EmbeddingProvider;
  model: AnthropicEmbeddingModel | EmbeddingModel;
  apiKey?: string;               // Loaded from env if not provided
  baseUrl?: string;              // Override API endpoint
  
  // Batching
  batchSize: number;             // Max texts per batch request
  maxConcurrentBatches: number;  // Parallel batch requests
  
  // Rate limiting
  requestsPerMinute: number;
  tokensPerMinute: number;
  
  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  
  // Timeout
  timeoutMs: number;
}

/**
 * Vector database service configuration
 */
export interface VectorDbServiceConfig {
  provider: VectorDBProvider;
  
  // Connection
  connectionString?: string;     // Loaded from env if not provided
  apiKey?: string;               // For cloud providers
  
  // Index settings
  indexName: string;
  namespace?: string;            // For multi-tenant isolation
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  
  // HNSW index parameters (for pgvector, qdrant)
  hnsw?: {
    m: number;                   // Max connections per node
    efConstruction: number;      // Build-time search width
    efSearch: number;            // Query-time search width
  };
  
  // Connection pool
  poolSize?: number;
  poolIdleTimeoutMs?: number;
}

/**
 * Performance tuning configuration
 */
export interface RAGPerformanceConfig {
  // Caching
  enableQueryCache: boolean;
  queryCacheTtlMs: number;
  maxCacheEntries: number;
  
  // Timeouts
  searchTimeoutMs: number;
  ingestTimeoutMs: number;
  
  // Concurrency
  maxConcurrentSearches: number;
  maxConcurrentIngests: number;
  
  // Memory limits
  maxContextTokens: number;
  maxResultsPerQuery: number;
}

/**
 * Feature flags for gradual rollout
 */
export interface RAGFeatureFlags {
  enableReranking: boolean;
  enableHybridSearch: boolean;    // Combine vector + keyword search
  enableQueryExpansion: boolean;  // Expand queries with synonyms
  enableCaching: boolean;
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
}

// -----------------------------------------------------------------------------
// Embedding Request/Response Types
// -----------------------------------------------------------------------------

/**
 * Request to generate embeddings
 */
export interface EmbeddingRequest {
  texts: string[];
  model?: AnthropicEmbeddingModel;
  inputType?: 'query' | 'document';  // Some models optimize differently
  truncate?: boolean;                // Truncate to max tokens if too long
}

/**
 * Response from embedding generation
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  usage: {
    totalTokens: number;
    promptTokens: number;
  };
  processingTimeMs: number;
}

/**
 * Single embedding result with metadata
 */
export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokenCount: number;
  truncated: boolean;
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

/**
 * RAG-specific error codes
 */
export type RAGErrorCode =
  | 'EMBEDDING_API_ERROR'
  | 'EMBEDDING_RATE_LIMITED'
  | 'EMBEDDING_TIMEOUT'
  | 'EMBEDDING_INVALID_INPUT'
  | 'VECTOR_DB_CONNECTION_ERROR'
  | 'VECTOR_DB_QUERY_ERROR'
  | 'VECTOR_DB_WRITE_ERROR'
  | 'DOCUMENT_NOT_FOUND'
  | 'CHUNK_NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'QUOTA_EXCEEDED';

/**
 * RAG error with structured details
 */
export interface RAGError {
  code: RAGErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryAfterMs?: number;
}

// -----------------------------------------------------------------------------
// Health Check Types
// -----------------------------------------------------------------------------

/**
 * Detailed health check result
 */
export interface RAGHealthCheckResult {
  healthy: boolean;
  timestamp: string;
  
  // Component status
  components: {
    embeddingService: ComponentHealth;
    vectorDatabase: ComponentHealth;
    cache?: ComponentHealth;
  };
  
  // Performance metrics
  metrics?: {
    avgEmbeddingLatencyMs: number;
    avgSearchLatencyMs: number;
    cacheHitRate?: number;
    documentsIndexed: number;
    chunksIndexed: number;
  };
}

/**
 * Individual component health
 */
export interface ComponentHealth {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  lastChecked: string;
}

// -----------------------------------------------------------------------------
// Environment Variable Names
// -----------------------------------------------------------------------------

/**
 * Environment variables for RAG configuration
 */
export const RAG_ENV_VARS = {
  // Anthropic
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  
  // Vector DB
  VECTOR_DB_PROVIDER: 'VECTOR_DB_PROVIDER',
  VECTOR_DB_CONNECTION_STRING: 'VECTOR_DB_CONNECTION_STRING',
  VECTOR_DB_API_KEY: 'VECTOR_DB_API_KEY',
  VECTOR_DB_INDEX_NAME: 'VECTOR_DB_INDEX_NAME',
  
  // Feature flags
  RAG_ENABLE_CACHE: 'RAG_ENABLE_CACHE',
  RAG_ENABLE_RERANK: 'RAG_ENABLE_RERANK',
} as const;
