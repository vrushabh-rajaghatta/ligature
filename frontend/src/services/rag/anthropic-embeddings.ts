
import { getAnthropicApiKey } from '@/config/api-keys';
// =============================================================================
// Anthropic Embeddings Client
// =============================================================================
// Client for generating embeddings via Anthropic's API (Voyage models).
// Includes batching, retry logic, rate limiting, and error handling.
// =============================================================================

import type {
  EmbeddingServiceConfig,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResult,
  RAGError,
  RAGErrorCode,
  AnthropicEmbeddingModel,
} from './types';

import { EMBEDDING_DIMENSIONS, EMBEDDING_MAX_TOKENS } from './types';
import { DEFAULT_EMBEDDING_CONFIG } from './rag-config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Anthropic API embedding request format
 */
interface AnthropicEmbeddingRequest {
  model: string;
  input: string[];
  input_type?: 'query' | 'document';
}

/**
 * Anthropic API embedding response format
 */
interface AnthropicEmbeddingResponse {
  model: string;
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    total_tokens: number;
  };
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requestsThisMinute: number;
  tokensThisMinute: number;
  windowStart: number;
}

// -----------------------------------------------------------------------------
// Anthropic Embeddings Client
// -----------------------------------------------------------------------------

/**
 * Client for generating embeddings via Anthropic API
 */
export class AnthropicEmbeddingsClient {
  private readonly config: EmbeddingServiceConfig;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private rateLimiter: RateLimiterState;

  constructor(config?: Partial<EmbeddingServiceConfig>) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    
    // Resolve API key
    this.apiKey = this.config.apiKey || getAnthropicApiKey() || '';
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY env var or pass apiKey in config.');
    }
    
    // Base URL for embeddings endpoint
    this.baseUrl = this.config.baseUrl || 'https://api.voyageai.com/v1';
    
    // Initialize rate limiter
    this.rateLimiter = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      windowStart: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string, inputType: 'query' | 'document' = 'document'): Promise<number[]> {
    const response = await this.generateEmbeddings([text], inputType);
    return response.embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts
   * Automatically batches large requests
   */
  async generateEmbeddings(
    texts: string[],
    inputType: 'query' | 'document' = 'document'
  ): Promise<EmbeddingResponse> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: this.config.model as string,
        dimensions: this.getDimensions(),
        usage: { totalTokens: 0, promptTokens: 0 },
        processingTimeMs: 0,
      };
    }

    const startTime = Date.now();
    const batches = this.createBatches(texts);
    const allEmbeddings: number[][] = new Array(texts.length);
    let totalTokens = 0;

    // Process batches with concurrency control
    const batchPromises: Promise<void>[] = [];
    let batchIndex = 0;

    const processBatch = async (batch: string[], startIndex: number): Promise<void> => {
      const response = await this.executeBatchWithRetry(batch, inputType);
      
      // Place embeddings in correct positions
      for (let i = 0; i < response.data.length; i++) {
        allEmbeddings[startIndex + i] = response.data[i].embedding;
      }
      
      totalTokens += response.usage.total_tokens;
    };

    // Process batches respecting max concurrent
    let currentIndex = 0;
    for (const batch of batches) {
      const promise = processBatch(batch, currentIndex);
      batchPromises.push(promise);
      currentIndex += batch.length;
      
      // Wait if we've hit max concurrent batches
      if (batchPromises.length >= this.config.maxConcurrentBatches) {
        await Promise.all(batchPromises);
        batchPromises.length = 0;
      }
    }

    // Wait for remaining batches
    if (batchPromises.length > 0) {
      await Promise.all(batchPromises);
    }

    return {
      embeddings: allEmbeddings,
      model: this.config.model as string,
      dimensions: this.getDimensions(),
      usage: { totalTokens, promptTokens: totalTokens },
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate embeddings with detailed per-text results
   */
  async generateEmbeddingsDetailed(
    texts: string[],
    inputType: 'query' | 'document' = 'document'
  ): Promise<EmbeddingResult[]> {
    const response = await this.generateEmbeddings(texts, inputType);
    
    return texts.map((text, index) => ({
      text,
      embedding: response.embeddings[index],
      tokenCount: this.estimateTokens(text),
      truncated: this.estimateTokens(text) > this.getMaxTokens(),
    }));
  }

  /**
   * Get model dimensions
   */
  getDimensions(): number {
    const model = this.config.model as AnthropicEmbeddingModel;
    return EMBEDDING_DIMENSIONS[model] || 1024;
  }

  /**
   * Get model max tokens
   */
  getMaxTokens(): number {
    const model = this.config.model as AnthropicEmbeddingModel;
    return EMBEDDING_MAX_TOKENS[model] || 32000;
  }

  /**
   * Estimate token count for text
   * Rough estimate: ~4 chars per token for English
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if client is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.generateEmbedding('health check', 'query');
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Create batches from texts respecting batch size limit
   */
  private createBatches(texts: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      batches.push(texts.slice(i, i + this.config.batchSize));
    }
    return batches;
  }

  /**
   * Execute a single batch request with retry logic
   */
  private async executeBatchWithRetry(
    texts: string[],
    inputType: 'query' | 'document'
  ): Promise<AnthropicEmbeddingResponse> {
    let lastError: Error | null = null;
    let delay = this.config.retryDelayMs;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Check rate limits before request
        await this.waitForRateLimit(texts);
        
        const response = await this.executeRequest(texts, inputType);
        
        // Update rate limiter
        this.updateRateLimiter(1, response.usage.total_tokens);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        const ragError = this.parseError(error);
        if (!ragError.retryable) {
          throw this.createError(ragError);
        }
        
        // Check if we should use retry-after header
        if (ragError.retryAfterMs) {
          delay = ragError.retryAfterMs;
        }
        
        // Don't delay on last attempt
        if (attempt < this.config.maxRetries) {
          await this.sleep(delay);
          delay *= this.config.retryBackoffMultiplier;
        }
      }
    }

    throw this.createError({
      code: 'EMBEDDING_API_ERROR',
      message: `Failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`,
      retryable: false,
    });
  }

  /**
   * Execute HTTP request to embeddings API
   */
  private async executeRequest(
    texts: string[],
    inputType: 'query' | 'document'
  ): Promise<AnthropicEmbeddingResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          input_type: inputType,
        } satisfies AnthropicEmbeddingRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw this.handleHttpError(response.status, errorBody, response.headers);
      }

      return await response.json() as AnthropicEmbeddingResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError({
          code: 'EMBEDDING_TIMEOUT',
          message: `Request timed out after ${this.config.timeoutMs}ms`,
          retryable: true,
        });
      }
      
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private handleHttpError(status: number, body: string, headers: Headers): Error {
    let message = `HTTP ${status}`;
    let retryable = false;
    let retryAfterMs: number | undefined;

    try {
      const parsed = JSON.parse(body);
      message = parsed.error?.message || parsed.message || body;
    } catch {
      message = body || `HTTP ${status}`;
    }

    // Determine error code and retryability
    let code: RAGErrorCode = 'EMBEDDING_API_ERROR';
    
    if (status === 429) {
      code = 'EMBEDDING_RATE_LIMITED';
      retryable = true;
      const retryAfter = headers.get('Retry-After');
      if (retryAfter) {
        retryAfterMs = parseInt(retryAfter, 10) * 1000;
      }
    } else if (status === 400) {
      code = 'EMBEDDING_INVALID_INPUT';
      retryable = false;
    } else if (status >= 500) {
      retryable = true;
    } else if (status === 401 || status === 403) {
      retryable = false;
    }

    return this.createError({ code, message, retryable, retryAfterMs });
  }

  /**
   * Parse error into RAGError structure
   */
  private parseError(error: unknown): RAGError {
    if (error instanceof RAGApiError) {
      return error.ragError;
    }
    
    if (error instanceof Error) {
      return {
        code: 'EMBEDDING_API_ERROR',
        message: error.message,
        retryable: false,
      };
    }
    
    return {
      code: 'EMBEDDING_API_ERROR',
      message: 'Unknown error',
      retryable: false,
    };
  }

  /**
   * Create typed error
   */
  private createError(ragError: RAGError): RAGApiError {
    return new RAGApiError(ragError);
  }

  /**
   * Wait for rate limit window if needed
   */
  private async waitForRateLimit(texts: string[]): Promise<void> {
    const now = Date.now();
    const windowDuration = 60_000; // 1 minute
    
    // Reset window if expired
    if (now - this.rateLimiter.windowStart >= windowDuration) {
      this.rateLimiter = {
        requestsThisMinute: 0,
        tokensThisMinute: 0,
        windowStart: now,
      };
      return;
    }
    
    // Estimate tokens for this request
    const estimatedTokens = texts.reduce((sum, t) => sum + this.estimateTokens(t), 0);
    
    // Check if we would exceed limits
    const wouldExceedRequests = this.rateLimiter.requestsThisMinute + 1 > this.config.requestsPerMinute;
    const wouldExceedTokens = this.rateLimiter.tokensThisMinute + estimatedTokens > this.config.tokensPerMinute;
    
    if (wouldExceedRequests || wouldExceedTokens) {
      // Wait until window resets
      const waitTime = windowDuration - (now - this.rateLimiter.windowStart);
      await this.sleep(waitTime + 100); // Add small buffer
      
      // Reset after waiting
      this.rateLimiter = {
        requestsThisMinute: 0,
        tokensThisMinute: 0,
        windowStart: Date.now(),
      };
    }
  }

  /**
   * Update rate limiter after successful request
   */
  private updateRateLimiter(requests: number, tokens: number): void {
    this.rateLimiter.requestsThisMinute += requests;
    this.rateLimiter.tokensThisMinute += tokens;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// -----------------------------------------------------------------------------
// Error Class
// -----------------------------------------------------------------------------

/**
 * RAG API Error with structured details
 */
export class RAGApiError extends Error {
  readonly ragError: RAGError;

  constructor(ragError: RAGError) {
    super(ragError.message);
    this.name = 'RAGApiError';
    this.ragError = ragError;
  }

  get code(): RAGErrorCode {
    return this.ragError.code;
  }

  get retryable(): boolean {
    return this.ragError.retryable;
  }

  get retryAfterMs(): number | undefined {
    return this.ragError.retryAfterMs;
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create embeddings client with config
 */
export function createEmbeddingsClient(config?: Partial<EmbeddingServiceConfig>): AnthropicEmbeddingsClient {
  return new AnthropicEmbeddingsClient(config);
}

// -----------------------------------------------------------------------------
// Mock Client for Testing
// -----------------------------------------------------------------------------

/**
 * Mock embeddings client for testing
 * Generates deterministic fake embeddings
 */
export class MockEmbeddingsClient {
  private readonly dimensions: number;
  private callCount = 0;

  constructor(dimensions: number = 1024) {
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.generateMockEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResponse> {
    const embeddings = texts.map(text => this.generateMockEmbedding(text));
    this.callCount++;
    
    return {
      embeddings,
      model: 'mock',
      dimensions: this.dimensions,
      usage: { 
        totalTokens: texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
        promptTokens: texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
      },
      processingTimeMs: 10,
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  /**
   * Generate deterministic mock embedding from text
   */
  private generateMockEmbedding(text: string): number[] {
    const embedding: number[] = new Array(this.dimensions);
    
    // Use text hash as seed for deterministic output
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Generate normalized embedding
    let sumSquares = 0;
    for (let i = 0; i < this.dimensions; i++) {
      // Pseudo-random based on hash and position
      const seed = hash + i * 31;
      embedding[i] = Math.sin(seed) * Math.cos(seed * 1.5);
      sumSquares += embedding[i] * embedding[i];
    }
    
    // Normalize to unit length
    const norm = Math.sqrt(sumSquares);
    for (let i = 0; i < this.dimensions; i++) {
      embedding[i] /= norm;
    }
    
    return embedding;
  }
}
