
// =============================================================================
// RAG (Retrieval-Augmented Generation) Types
// =============================================================================
// Foundation types for semantic search over source documents.
// Enables AI authoring to find and cite specific content from large documents.
//
// Per AI Authoring Specs v1.0 - GAP 1: RAG/Vector Search
// Implementation planned for v0.18.x (Q2 2026)
// =============================================================================

// -----------------------------------------------------------------------------
// Source Document Types
// -----------------------------------------------------------------------------

/**
 * Types of source documents that can be ingested into RAG
 */
export type SourceDocumentType =
  | 'csr'           // Clinical Study Report
  | 'protocol'      // Study Protocol
  | 'ib'            // Investigator's Brochure
  | 'sap'           // Statistical Analysis Plan
  | 'csr_synopsis'  // CSR Synopsis
  | 'iss'           // Integrated Summary of Safety
  | 'ise'           // Integrated Summary of Efficacy
  | 'scs'           // Summary of Clinical Safety
  | 'sce'           // Summary of Clinical Efficacy
  | 'pk_report'     // Pharmacokinetic Report
  | 'pd_report'     // Pharmacodynamic Report
  | 'nonclinical'   // Nonclinical Study Report
  | 'cmc'           // Chemistry, Manufacturing, Controls
  | 'label'         // Product Label (USPI, SmPC, PIL)
  | 'regulatory'    // Regulatory Correspondence
  | 'literature'    // Published Literature
  | 'other';

/**
 * Source document metadata for RAG ingestion
 */
export interface SourceDocument {
  id: string;
  title: string;
  type: SourceDocumentType;
  filename: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  
  // Document identifiers
  productId?: string;
  studyId?: string;
  applicationId?: string;
  
  // Versioning
  version?: string;
  effectiveDate?: string;
  
  // Processing status
  status: SourceDocumentStatus;
  indexedAt?: string;
  lastUpdated: string;
  
  // Metadata
  language?: string;
  author?: string;
  tags?: string[];
}

export type SourceDocumentStatus =
  | 'pending'     // Awaiting processing
  | 'processing'  // Currently being chunked/embedded
  | 'indexed'     // Successfully indexed in vector DB
  | 'failed'      // Processing failed
  | 'stale';      // Needs re-indexing (source updated)

// -----------------------------------------------------------------------------
// Chunking Types
// -----------------------------------------------------------------------------

/**
 * Strategy for splitting documents into chunks
 */
export type ChunkingStrategy =
  | 'semantic'    // Split on semantic boundaries (paragraphs, sections)
  | 'fixed'       // Fixed token/character count
  | 'hybrid'      // Semantic with max size constraints
  | 'table'       // Special handling for tables
  | 'heading';    // Split on heading hierarchy

/**
 * Configuration for document chunking
 */
export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  maxTokens: number;          // Maximum tokens per chunk
  overlapTokens: number;      // Overlap between consecutive chunks
  minTokens?: number;         // Minimum tokens (avoid tiny chunks)
  preserveTables?: boolean;   // Keep tables as single chunks
  preserveLists?: boolean;    // Keep lists together
  headingLevels?: number[];   // Which heading levels to split on
}

/**
 * A chunk of document content with metadata
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  tokenCount: number;
  
  // Location in source document
  pageStart: number;
  pageEnd: number;
  sectionNumber?: string;     // e.g., "11.1.2"
  sectionTitle?: string;      // e.g., "Primary Efficacy Analysis"
  
  // Chunk ordering
  chunkIndex: number;
  totalChunks: number;
  
  // Content type
  contentType: ChunkContentType;
  
  // Embedding (populated after processing)
  embedding?: number[];
  embeddingModel?: string;
}

export type ChunkContentType =
  | 'text'        // Regular prose
  | 'table'       // Tabular data
  | 'list'        // Bulleted/numbered list
  | 'figure'      // Figure caption/reference
  | 'heading'     // Section heading
  | 'footnote'    // Footnote content
  | 'reference';  // Bibliography/citation

// -----------------------------------------------------------------------------
// Search Types
// -----------------------------------------------------------------------------

/**
 * Options for semantic search
 */
export interface RAGSearchOptions {
  // Scope limiting
  documentIds?: string[];           // Limit to specific documents
  documentTypes?: SourceDocumentType[]; // Filter by document type
  productIds?: string[];            // Filter by product
  studyIds?: string[];              // Filter by study
  
  // Section filtering (ICH E3 section patterns)
  sectionPatterns?: string[];       // e.g., ["11.*", "12.*"] for efficacy/safety
  
  // Result control
  maxResults?: number;              // Top-k results (default: 10)
  minRelevance?: number;            // Score threshold 0-1 (default: 0.5)
  
  // Context options
  includeContext?: boolean;         // Include surrounding chunks
  contextChunks?: number;           // How many chunks before/after (default: 1)
  
  // Content type filtering
  contentTypes?: ChunkContentType[];
  excludeContentTypes?: ChunkContentType[];
  
  // Reranking
  rerank?: boolean;                 // Apply reranking model
  rerankModel?: string;             // Which reranker to use
}

/**
 * A single search result from RAG
 */
export interface RAGResult {
  // Source identification
  documentId: string;
  documentTitle: string;
  documentType: SourceDocumentType;
  chunkId: string;
  
  // Content
  content: string;
  tokenCount: number;
  
  // Location for citation
  pageNumber: number;
  pageEnd?: number;
  sectionNumber?: string;
  sectionTitle?: string;
  
  // Relevance scoring
  relevanceScore: number;           // 0-1, higher is better
  rerankScore?: number;             // Score from reranker if applied
  
  // Content metadata
  contentType: ChunkContentType;
  
  // Context (if requested)
  contextBefore?: string;
  contextAfter?: string;
  
  // Highlighting
  highlights?: TextHighlight[];
}

/**
 * Highlighted span within content
 */
export interface TextHighlight {
  start: number;
  end: number;
  text: string;
}

/**
 * Aggregated search results
 */
export interface RAGSearchResult {
  query: string;
  results: RAGResult[];
  totalFound: number;
  searchTimeMs: number;
  
  // Source summary
  sourcesSearched: number;
  sourcesWithResults: number;
  
  // Token budget tracking
  totalTokens: number;
  truncated: boolean;
}

// -----------------------------------------------------------------------------
// Context Assembly Types
// -----------------------------------------------------------------------------

/**
 * Configuration for a document section being authored
 */
export interface SectionConfig {
  sectionNumber: string;            // e.g., "11.1"
  sectionTitle: string;             // e.g., "Primary Efficacy Endpoint"
  documentType: string;             // e.g., "csr"
  
  // Suggested source sections to search
  relevantSourceSections?: string[];
  
  // Keywords/concepts for this section
  keywords?: string[];
  
  // Token budget for context
  maxContextTokens?: number;
}

/**
 * Assembled context window for Claude
 */
export interface ContextWindow {
  // Retrieved chunks
  chunks: RAGResult[];
  
  // Token accounting
  totalTokens: number;
  maxTokens: number;
  truncated: boolean;
  
  // Source mapping for citations
  sourceMap: ContextSourceMap[];
  
  // Assembly metadata
  assembledAt: string;
  searchQueries: string[];
}

/**
 * Maps sources to their retrieved content
 */
export interface ContextSourceMap {
  documentId: string;
  documentTitle: string;
  documentType: SourceDocumentType;
  pagesReferenced: number[];
  sectionsReferenced: string[];
  chunkCount: number;
  tokenCount: number;
}

// -----------------------------------------------------------------------------
// Ingestion Types
// -----------------------------------------------------------------------------

/**
 * Result of document ingestion
 */
export interface IngestResult {
  documentId: string;
  status: 'success' | 'partial' | 'failed';
  
  // Processing stats
  pageCount: number;
  chunkCount: number;
  totalTokens: number;
  processingTimeMs: number;
  
  // Errors/warnings
  errors?: IngestError[];
  warnings?: IngestWarning[];
}

export interface IngestError {
  page?: number;
  section?: string;
  message: string;
  code: string;
}

export interface IngestWarning {
  page?: number;
  section?: string;
  message: string;
  code: string;
}

/**
 * Options for document ingestion
 */
export interface IngestOptions {
  chunking?: Partial<ChunkingConfig>;
  
  // Processing options
  extractTables?: boolean;
  extractFigures?: boolean;
  detectSections?: boolean;
  
  // OCR options (for scanned PDFs)
  enableOcr?: boolean;
  ocrLanguage?: string;
  
  // Embedding options
  embeddingModel?: string;
  batchSize?: number;
  
  // Replace existing?
  replaceExisting?: boolean;
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * RAG Service interface
 * Implementation planned for v0.18.x
 */
export interface IRAGService {
  // Document ingestion
  ingestDocument(doc: SourceDocument, file: File | Buffer, options?: IngestOptions): Promise<IngestResult>;
  reindexDocument(documentId: string, options?: IngestOptions): Promise<IngestResult>;
  deleteDocument(documentId: string): Promise<void>;
  
  // Document status
  getDocumentStatus(documentId: string): Promise<SourceDocument | null>;
  listDocuments(filter?: Partial<SourceDocument>): Promise<SourceDocument[]>;
  
  // Semantic search
  search(query: string, options?: RAGSearchOptions): Promise<RAGSearchResult>;
  searchMultiple(queries: string[], options?: RAGSearchOptions): Promise<RAGSearchResult[]>;
  
  // Context assembly for Claude
  // Query-based signature (for API routes)
  assembleContext(
    query: string,
    options?: { maxTokens?: number; sources?: string[]; sectionWeights?: Record<string, number>; }
  ): Promise<ContextWindow>;
  // Config-based signature (for document authoring)
  assembleContext(config: SectionConfig, sources: SourceDocument[]): Promise<ContextWindow>;
  
  // Similar content finding
  findSimilar(chunkId: string, options?: RAGSearchOptions): Promise<RAGResult[]>;
  
  // Health check
  healthCheck(): Promise<RAGHealthStatus>;
}

/**
 * RAG system health status
 */
export interface RAGHealthStatus {
  healthy: boolean;
  vectorDbConnected: boolean;
  embeddingServiceAvailable: boolean;
  
  // Stats
  totalDocuments: number;
  totalChunks: number;
  indexSizeBytes: number;
  
  // Performance
  avgSearchLatencyMs: number;
  avgIngestLatencyMs: number;
}

// -----------------------------------------------------------------------------
// Vector Database Types
// -----------------------------------------------------------------------------

/**
 * Supported vector database backends
 */
export type VectorDBProvider =
  | 'pgvector'    // PostgreSQL extension
  | 'pinecone'    // Pinecone cloud
  | 'qdrant'      // Qdrant
  | 'weaviate'    // Weaviate
  | 'chroma'      // Chroma
  | 'memory';     // In-memory (testing)

/**
 * Vector database configuration
 */
export interface VectorDBConfig {
  provider: VectorDBProvider;
  
  // Connection
  connectionString?: string;
  apiKey?: string;
  
  // Index settings
  indexName: string;
  dimensions: number;           // Embedding dimensions (e.g., 1536 for ada-002)
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  
  // Performance
  efConstruction?: number;      // HNSW build parameter
  efSearch?: number;            // HNSW search parameter
  m?: number;                   // HNSW connections per node
}

// -----------------------------------------------------------------------------
// Embedding Types
// -----------------------------------------------------------------------------

/**
 * Supported embedding models
 */
export type EmbeddingModel =
  | 'text-embedding-ada-002'        // OpenAI ada-002 (1536 dims)
  | 'text-embedding-3-small'        // OpenAI v3 small (1536 dims)
  | 'text-embedding-3-large'        // OpenAI v3 large (3072 dims)
  | 'voyage-large-2'                // Voyage AI (1024 dims)
  | 'voyage-code-2'                 // Voyage AI for code
  | 'cohere-embed-english-v3.0'     // Cohere (1024 dims)
  | 'local';                        // Local model

/**
 * Embedding service configuration
 */
export interface EmbeddingConfig {
  model: EmbeddingModel;
  apiKey?: string;
  baseUrl?: string;
  
  // Batching
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  
  // Rate limiting
  requestsPerMinute?: number;
  tokensPerMinute?: number;
}

/**
 * Embedding request/response
 */
export interface EmbeddingRequest {
  texts: string[];
  model?: EmbeddingModel;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: EmbeddingModel;
  tokenCount: number;
  processingTimeMs: number;
}

// -----------------------------------------------------------------------------
// Citation Types (for AI output)
// -----------------------------------------------------------------------------

/**
 * Citation reference for AI-generated content
 */
export interface Citation {
  id: string;
  
  // Source reference
  documentId: string;
  documentTitle: string;
  documentType: SourceDocumentType;
  
  // Location
  pageNumber: number;
  pageEnd?: number;
  sectionNumber?: string;
  sectionTitle?: string;
  
  // Excerpt
  excerpt: string;
  excerptTokens: number;
  
  // Link back to RAG result
  chunkId: string;
  relevanceScore: number;
}

/**
 * AI-generated content with citations
 */
export interface CitedContent {
  content: string;
  citations: Citation[];
  
  // Inline citation markers (e.g., [1], [2])
  citationMarkers: CitationMarker[];
}

export interface CitationMarker {
  marker: string;           // e.g., "[1]"
  citationId: string;
  position: number;         // Character position in content
}

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  strategy: 'hybrid',
  maxTokens: 512,
  overlapTokens: 50,
  minTokens: 100,
  preserveTables: true,
  preserveLists: true,
  headingLevels: [1, 2, 3],
};

export const DEFAULT_SEARCH_OPTIONS: RAGSearchOptions = {
  maxResults: 10,
  minRelevance: 0.5,
  includeContext: true,
  contextChunks: 1,
  rerank: false,
};

export const DEFAULT_EMBEDDING_CONFIG: Partial<EmbeddingConfig> = {
  model: 'text-embedding-ada-002',
  batchSize: 100,
  maxRetries: 3,
  retryDelayMs: 1000,
};
