
// =============================================================================
// Vector Store Factory
// =============================================================================
// Factory for creating vector store instances based on configuration.
// =============================================================================

import type { VectorDBProvider } from '@/types/rag';
import type { VectorDbServiceConfig } from './types';
import type { IVectorStore } from './vector-store';
import { MemoryVectorStore } from './memory-vector-store';
import { PgVectorStore, type PgVectorStoreConfig } from './pgvector-store';

// -----------------------------------------------------------------------------
// Factory Options
// -----------------------------------------------------------------------------

/**
 * Options for creating a vector store
 */
export interface VectorStoreFactoryOptions {
  provider: VectorDBProvider;
  dimensions: number;
  
  // Connection
  connectionString?: string;
  apiKey?: string;
  
  // Index settings
  indexName?: string;
  tableName?: string;
  namespace?: string;
  
  // HNSW parameters
  hnsw?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
  };
  
  // Auto-initialize
  autoInitialize?: boolean;
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

/**
 * Create a vector store instance based on provider
 */
export async function createVectorStore(
  options: VectorStoreFactoryOptions
): Promise<IVectorStore> {
  const { provider, autoInitialize = true } = options;
  
  let store: IVectorStore;
  
  switch (provider) {
    case 'memory':
      store = new MemoryVectorStore(options.dimensions);
      break;
      
    case 'pgvector':
      store = createPgVectorStore(options);
      break;
      
    case 'pinecone':
      // Pinecone support can be added in future versions
      throw new Error('Pinecone provider not yet implemented. Use memory or pgvector.');
      
    case 'qdrant':
      // Qdrant support can be added in future versions
      throw new Error('Qdrant provider not yet implemented. Use memory or pgvector.');
      
    case 'weaviate':
      // Weaviate support can be added in future versions
      throw new Error('Weaviate provider not yet implemented. Use memory or pgvector.');
      
    case 'chroma':
      // Chroma support can be added in future versions
      throw new Error('Chroma provider not yet implemented. Use memory or pgvector.');
      
    default:
      throw new Error(`Unknown vector store provider: ${provider}`);
  }
  
  if (autoInitialize) {
    await store.initialize();
  }
  
  return store;
}

/**
 * Create vector store from VectorDbServiceConfig
 */
export async function createVectorStoreFromConfig(
  config: VectorDbServiceConfig
): Promise<IVectorStore> {
  return createVectorStore({
    provider: config.provider,
    dimensions: config.dimensions,
    connectionString: config.connectionString,
    apiKey: config.apiKey,
    indexName: config.indexName,
    namespace: config.namespace,
    hnsw: config.hnsw,
    autoInitialize: true,
  });
}

// -----------------------------------------------------------------------------
// Provider-Specific Factories
// -----------------------------------------------------------------------------

/**
 * Create PgVectorStore instance
 */
function createPgVectorStore(options: VectorStoreFactoryOptions): PgVectorStore {
  const config: PgVectorStoreConfig = {
    connectionString: options.connectionString,
    dimensions: options.dimensions,
    tableName: options.tableName ?? 'embeddings',
    indexName: options.indexName ?? 'embeddings_embedding_idx',
    hnsw: options.hnsw,
  };
  
  return new PgVectorStore(config);
}

/**
 * Create a memory store for testing
 */
export function createMemoryStore(dimensions: number = 1024): MemoryVectorStore {
  const store = new MemoryVectorStore(dimensions);
  return store;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if a provider is supported
 */
export function isSupportedProvider(provider: string): provider is VectorDBProvider {
  return ['memory', 'pgvector', 'pinecone', 'qdrant', 'weaviate', 'chroma'].includes(provider);
}

/**
 * Get recommended HNSW parameters based on use case
 */
export function getHnswParams(useCase: 'balanced' | 'speed' | 'recall'): {
  m: number;
  efConstruction: number;
  efSearch: number;
} {
  switch (useCase) {
    case 'speed':
      return { m: 8, efConstruction: 32, efSearch: 20 };
    case 'recall':
      return { m: 32, efConstruction: 128, efSearch: 100 };
    case 'balanced':
    default:
      return { m: 16, efConstruction: 64, efSearch: 40 };
  }
}
