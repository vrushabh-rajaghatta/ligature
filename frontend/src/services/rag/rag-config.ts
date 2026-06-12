
// =============================================================================
// RAG Production Configuration
// =============================================================================
// Configuration management for production RAG service.
// Supports environment variable overrides and validation.
// =============================================================================

import {
  DEFAULT_CHUNKING_CONFIG,
  DEFAULT_SEARCH_OPTIONS,
} from '@/types/rag';

import type {
  RAGProductionConfig,
  EmbeddingServiceConfig,
  VectorDbServiceConfig,
  RAGPerformanceConfig,
  RAGFeatureFlags,
  RAGError,
  RAG_ENV_VARS,
} from './types';

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

/**
 * Default embedding service configuration
 * Uses Anthropic's voyage-3 model (1024 dimensions)
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingServiceConfig = {
  provider: 'anthropic',
  model: 'voyage-3',
  // apiKey loaded from ANTHROPIC_API_KEY env var
  
  // Batching - voyage-3 supports up to 128 texts per batch
  batchSize: 96,
  maxConcurrentBatches: 3,
  
  // Rate limits (conservative defaults, adjust based on tier)
  requestsPerMinute: 100,
  tokensPerMinute: 1_000_000,
  
  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  
  // Timeout
  timeoutMs: 30_000,
};

/**
 * Default vector database configuration
 * Uses pgvector for PostgreSQL-based deployments
 */
export const DEFAULT_VECTOR_DB_CONFIG: VectorDbServiceConfig = {
  provider: 'pgvector',
  // connectionString loaded from DATABASE_URL env var
  
  indexName: 'ligature_embeddings',
  dimensions: 1024,  // voyage-3 dimensions
  metric: 'cosine',
  
  // HNSW parameters optimized for recall/speed balance
  hnsw: {
    m: 16,              // Connections per node
    efConstruction: 64, // Build quality
    efSearch: 40,       // Search quality
  },
  
  // Connection pool
  poolSize: 10,
  poolIdleTimeoutMs: 30_000,
};

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: RAGPerformanceConfig = {
  // Caching
  enableQueryCache: true,
  queryCacheTtlMs: 5 * 60 * 1000,  // 5 minutes
  maxCacheEntries: 1000,
  
  // Timeouts
  searchTimeoutMs: 10_000,
  ingestTimeoutMs: 120_000,  // 2 minutes for large documents
  
  // Concurrency
  maxConcurrentSearches: 10,
  maxConcurrentIngests: 3,
  
  // Memory limits
  maxContextTokens: 100_000,  // ~400KB of context
  maxResultsPerQuery: 50,
};

/**
 * Default feature flags (conservative for initial rollout)
 */
export const DEFAULT_FEATURE_FLAGS: RAGFeatureFlags = {
  enableReranking: false,       // Enable once reranker is configured
  enableHybridSearch: false,    // Enable with full-text search setup
  enableQueryExpansion: false,  // Enable with synonym dictionary
  enableCaching: true,
  enableMetrics: true,
  enableDetailedLogging: false, // Enable for debugging
};

/**
 * Complete default configuration
 */
export const DEFAULT_RAG_CONFIG: RAGProductionConfig = {
  embedding: DEFAULT_EMBEDDING_CONFIG,
  vectorDb: DEFAULT_VECTOR_DB_CONFIG,
  chunking: DEFAULT_CHUNKING_CONFIG,
  search: DEFAULT_SEARCH_OPTIONS,
  performance: DEFAULT_PERFORMANCE_CONFIG,
  features: DEFAULT_FEATURE_FLAGS,
};

// -----------------------------------------------------------------------------
// Configuration Builder
// -----------------------------------------------------------------------------

/**
 * Builder for creating RAG configuration with overrides
 */
export class RAGConfigBuilder {
  private config: RAGProductionConfig;

  constructor(base: Partial<RAGProductionConfig> = {}) {
    this.config = {
      ...DEFAULT_RAG_CONFIG,
      ...base,
      embedding: { ...DEFAULT_EMBEDDING_CONFIG, ...base.embedding },
      vectorDb: { ...DEFAULT_VECTOR_DB_CONFIG, ...base.vectorDb },
      chunking: { ...DEFAULT_CHUNKING_CONFIG, ...base.chunking },
      search: { ...DEFAULT_SEARCH_OPTIONS, ...base.search },
      performance: { ...DEFAULT_PERFORMANCE_CONFIG, ...base.performance },
      features: { ...DEFAULT_FEATURE_FLAGS, ...base.features },
    };
  }

  /**
   * Set embedding provider and model
   */
  withEmbedding(config: Partial<EmbeddingServiceConfig>): this {
    this.config.embedding = { ...this.config.embedding, ...config };
    return this;
  }

  /**
   * Set vector database configuration
   */
  withVectorDb(config: Partial<VectorDbServiceConfig>): this {
    this.config.vectorDb = { ...this.config.vectorDb, ...config };
    return this;
  }

  /**
   * Set performance tuning
   */
  withPerformance(config: Partial<RAGPerformanceConfig>): this {
    this.config.performance = { ...this.config.performance, ...config };
    return this;
  }

  /**
   * Set feature flags
   */
  withFeatures(flags: Partial<RAGFeatureFlags>): this {
    this.config.features = { ...this.config.features, ...flags };
    return this;
  }

  /**
   * Apply environment variable overrides
   */
  withEnvOverrides(): this {
    const env = typeof process !== 'undefined' ? process.env as Record<string, string | undefined> : {};

    // Embedding API key
    if (env['ANTHROPIC_API_KEY'] && !this.config.embedding.apiKey) {
      this.config.embedding.apiKey = env['ANTHROPIC_API_KEY'];
    }

    // Vector DB connection
    if (env['VECTOR_DB_CONNECTION_STRING']) {
      this.config.vectorDb.connectionString = env['VECTOR_DB_CONNECTION_STRING'];
    } else if (env['DATABASE_URL'] && !this.config.vectorDb.connectionString) {
      // Fall back to standard DATABASE_URL for pgvector
      this.config.vectorDb.connectionString = env['DATABASE_URL'];
    }

    // Vector DB provider
    if (env['VECTOR_DB_PROVIDER']) {
      const provider = env['VECTOR_DB_PROVIDER'] as VectorDbServiceConfig['provider'];
      if (['pgvector', 'pinecone', 'qdrant', 'weaviate', 'chroma', 'memory'].includes(provider)) {
        this.config.vectorDb.provider = provider;
      }
    }

    // Vector DB API key (for cloud providers)
    if (env['VECTOR_DB_API_KEY']) {
      this.config.vectorDb.apiKey = env['VECTOR_DB_API_KEY'];
    }

    // Index name
    if (env['VECTOR_DB_INDEX_NAME']) {
      this.config.vectorDb.indexName = env['VECTOR_DB_INDEX_NAME'];
    }

    // Feature flags
    if (env['RAG_ENABLE_CACHE'] !== undefined) {
      this.config.features.enableCaching = env['RAG_ENABLE_CACHE'] === 'true';
    }
    if (env['RAG_ENABLE_RERANK'] !== undefined) {
      this.config.features.enableReranking = env['RAG_ENABLE_RERANK'] === 'true';
    }

    return this;
  }

  /**
   * Build and validate the configuration
   */
  build(): RAGProductionConfig {
    return this.config;
  }

  /**
   * Build with validation, throws on invalid config
   */
  buildValidated(): RAGProductionConfig {
    const errors = validateRAGConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid RAG configuration: ${errors.map(e => e.message).join('; ')}`);
    }
    return this.config;
  }
}

// -----------------------------------------------------------------------------
// Configuration Validation
// -----------------------------------------------------------------------------

/**
 * Validation error
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validate RAG configuration
 * Returns array of validation errors (empty if valid)
 */
export function validateRAGConfig(config: RAGProductionConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Embedding validation
  if (!config.embedding.provider) {
    errors.push({ field: 'embedding.provider', message: 'Embedding provider is required' });
  }
  if (!config.embedding.model) {
    errors.push({ field: 'embedding.model', message: 'Embedding model is required' });
  }
  if (config.embedding.batchSize < 1 || config.embedding.batchSize > 256) {
    errors.push({ 
      field: 'embedding.batchSize', 
      message: 'Batch size must be between 1 and 256',
      value: config.embedding.batchSize,
    });
  }
  if (config.embedding.maxRetries < 0) {
    errors.push({ 
      field: 'embedding.maxRetries', 
      message: 'Max retries cannot be negative',
      value: config.embedding.maxRetries,
    });
  }
  if (config.embedding.timeoutMs < 1000) {
    errors.push({ 
      field: 'embedding.timeoutMs', 
      message: 'Timeout must be at least 1000ms',
      value: config.embedding.timeoutMs,
    });
  }

  // Vector DB validation
  if (!config.vectorDb.provider) {
    errors.push({ field: 'vectorDb.provider', message: 'Vector DB provider is required' });
  }
  if (!config.vectorDb.indexName) {
    errors.push({ field: 'vectorDb.indexName', message: 'Index name is required' });
  }
  if (config.vectorDb.dimensions < 1) {
    errors.push({ 
      field: 'vectorDb.dimensions', 
      message: 'Dimensions must be positive',
      value: config.vectorDb.dimensions,
    });
  }
  if (!['cosine', 'euclidean', 'dotproduct'].includes(config.vectorDb.metric)) {
    errors.push({ 
      field: 'vectorDb.metric', 
      message: 'Invalid distance metric',
      value: config.vectorDb.metric,
    });
  }

  // Performance validation
  if (config.performance.searchTimeoutMs < 100) {
    errors.push({ 
      field: 'performance.searchTimeoutMs', 
      message: 'Search timeout too low (min 100ms)',
      value: config.performance.searchTimeoutMs,
    });
  }
  if (config.performance.maxContextTokens < 1000) {
    errors.push({ 
      field: 'performance.maxContextTokens', 
      message: 'Max context tokens too low (min 1000)',
      value: config.performance.maxContextTokens,
    });
  }

  // Chunking validation
  if (config.chunking.maxTokens < config.chunking.overlapTokens) {
    errors.push({ 
      field: 'chunking', 
      message: 'Overlap tokens cannot exceed max tokens',
    });
  }

  return errors;
}

/**
 * Check if configuration has required secrets for production
 */
export function validateProductionSecrets(config: RAGProductionConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Check API key based on provider
  if (config.embedding.provider === 'anthropic' && !config.embedding.apiKey) {
    errors.push({ 
      field: 'embedding.apiKey', 
      message: 'Anthropic API key required (set ANTHROPIC_API_KEY env var)',
    });
  }

  // Check vector DB connection based on provider
  if (config.vectorDb.provider !== 'memory') {
    if (config.vectorDb.provider === 'pgvector' && !config.vectorDb.connectionString) {
      errors.push({ 
        field: 'vectorDb.connectionString', 
        message: 'Database connection string required for pgvector',
      });
    }
    if (['pinecone', 'qdrant', 'weaviate'].includes(config.vectorDb.provider) && !config.vectorDb.apiKey) {
      errors.push({ 
        field: 'vectorDb.apiKey', 
        message: `API key required for ${config.vectorDb.provider}`,
      });
    }
  }

  return errors;
}

// -----------------------------------------------------------------------------
// Configuration Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create configuration for development/testing
 */
export function createDevConfig(): RAGProductionConfig {
  return new RAGConfigBuilder()
    .withVectorDb({ provider: 'memory' })
    .withFeatures({ 
      enableDetailedLogging: true,
      enableCaching: false,  // Easier debugging without cache
    })
    .withPerformance({
      searchTimeoutMs: 30_000,  // Longer timeouts for debugging
    })
    .build();
}

/**
 * Create configuration for production with env overrides
 */
export function createProductionConfig(): RAGProductionConfig {
  return new RAGConfigBuilder()
    .withEnvOverrides()
    .withFeatures({
      enableMetrics: true,
      enableCaching: true,
    })
    .buildValidated();
}

/**
 * Create configuration for testing (in-memory, fast timeouts)
 */
export function createTestConfig(): RAGProductionConfig {
  return new RAGConfigBuilder()
    .withVectorDb({ provider: 'memory', dimensions: 1024 })
    .withEmbedding({ 
      provider: 'local',  // Mock embeddings in tests
      batchSize: 10,
      maxRetries: 1,
      timeoutMs: 5000,
    })
    .withPerformance({
      enableQueryCache: false,
      searchTimeoutMs: 1000,
      ingestTimeoutMs: 5000,
    })
    .withFeatures({
      enableReranking: false,
      enableCaching: false,
      enableMetrics: false,
      enableDetailedLogging: false,
    })
    .build();
}

// -----------------------------------------------------------------------------
// Dimension Helpers
// -----------------------------------------------------------------------------

import { EMBEDDING_DIMENSIONS, type AnthropicEmbeddingModel } from './types';

/**
 * Get embedding dimensions for a model
 */
export function getEmbeddingDimensions(model: string): number {
  // Check Anthropic/Voyage models
  if (model in EMBEDDING_DIMENSIONS) {
    return EMBEDDING_DIMENSIONS[model as AnthropicEmbeddingModel];
  }
  
  // OpenAI models
  if (model === 'text-embedding-ada-002' || model === 'text-embedding-3-small') {
    return 1536;
  }
  if (model === 'text-embedding-3-large') {
    return 3072;
  }
  
  // Default
  return 1024;
}

/**
 * Ensure vector DB dimensions match embedding model
 */
export function ensureDimensionMatch(config: RAGProductionConfig): RAGProductionConfig {
  const expectedDimensions = getEmbeddingDimensions(config.embedding.model as string);
  
  if (config.vectorDb.dimensions !== expectedDimensions) {
    return {
      ...config,
      vectorDb: {
        ...config.vectorDb,
        dimensions: expectedDimensions,
      },
    };
  }
  
  return config;
}
