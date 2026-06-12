// =============================================================================
// DOCUVERA API CLIENT
// =============================================================================
// HTTP client for Docuvera structured content API.
// Handles authentication, request/response, and error handling.
// =============================================================================

import { createHash, createHmac } from 'crypto';
import {
  DocuveraConfig,
  ContentComponent,
  StructuredDocument,
  DocumentTemplate,
  ReviewRequest,
  ComponentSearchParams,
  DocumentSearchParams,
  SearchResult,
  DocumentOutput,
  OutputFormat,
  ReviewTrigger,
} from './types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    requestId: string;
    timestamp: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

/** API error */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Request options */
export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<DocuveraConfig> = {
  apiVersion: 'v1',
  timeout: 30000,
  retry: {
    maxRetries: 3,
    backoffMs: 1000,
  },
};

// -----------------------------------------------------------------------------
// Docuvera Client Class
// -----------------------------------------------------------------------------

export class DocuveraClient {
  private config: DocuveraConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: Partial<DocuveraConfig> & Pick<DocuveraConfig, 'baseUrl' | 'webhookSecret'>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as DocuveraConfig;
  }

  // ---------------------------------------------------------------------------
  // Component Operations
  // ---------------------------------------------------------------------------

  /**
   * Search components
   */
  async searchComponents(
    params: ComponentSearchParams,
    options?: RequestOptions
  ): Promise<ApiResponse<SearchResult<ContentComponent>>> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    return this.request<SearchResult<ContentComponent>>(
      'GET',
      `/components?${queryParams}`,
      undefined,
      options
    );
  }

  /**
   * Get component by ID
   */
  async getComponent(
    componentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<ContentComponent>> {
    return this.request<ContentComponent>(
      'GET',
      `/components/${componentId}`,
      undefined,
      options
    );
  }

  /**
   * Get component by section and product
   */
  async getComponentBySection(
    productId: string,
    section: string,
    options?: RequestOptions
  ): Promise<ApiResponse<ContentComponent>> {
    return this.request<ContentComponent>(
      'GET',
      `/products/${productId}/components/${encodeURIComponent(section)}`,
      undefined,
      options
    );
  }

  /**
   * Get component versions
   */
  async getComponentVersions(
    componentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<ContentComponent[]>> {
    return this.request<ContentComponent[]>(
      'GET',
      `/components/${componentId}/versions`,
      undefined,
      options
    );
  }

  /**
   * Get component content in specific format
   */
  async getComponentContent(
    componentId: string,
    format: OutputFormat,
    options?: RequestOptions
  ): Promise<ApiResponse<{ content: string; format: OutputFormat; checksum: string }>> {
    return this.request(
      'GET',
      `/components/${componentId}/content?format=${format}`,
      undefined,
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Document Operations
  // ---------------------------------------------------------------------------

  /**
   * Search documents
   */
  async searchDocuments(
    params: DocumentSearchParams,
    options?: RequestOptions
  ): Promise<ApiResponse<SearchResult<StructuredDocument>>> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    return this.request<SearchResult<StructuredDocument>>(
      'GET',
      `/documents?${queryParams}`,
      undefined,
      options
    );
  }

  /**
   * Get document by ID
   */
  async getDocument(
    documentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<StructuredDocument>> {
    return this.request<StructuredDocument>(
      'GET',
      `/documents/${documentId}`,
      undefined,
      options
    );
  }

  /**
   * Get document with full component details
   */
  async getDocumentWithComponents(
    documentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<StructuredDocument & { componentDetails: ContentComponent[] }>> {
    return this.request(
      'GET',
      `/documents/${documentId}?expand=components`,
      undefined,
      options
    );
  }

  /**
   * Get document outputs (downloadable formats)
   */
  async getDocumentOutputs(
    documentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<DocumentOutput[]>> {
    return this.request<DocumentOutput[]>(
      'GET',
      `/documents/${documentId}/outputs`,
      undefined,
      options
    );
  }

  /**
   * Download document output
   */
  async downloadDocumentOutput(
    documentId: string,
    format: OutputFormat,
    options?: RequestOptions
  ): Promise<ApiResponse<{ url: string; expiresAt: string }>> {
    return this.request(
      'GET',
      `/documents/${documentId}/outputs/${format}/download`,
      undefined,
      options
    );
  }

  /**
   * Get documents for product
   */
  async getProductDocuments(
    productId: string,
    params?: Partial<DocumentSearchParams>,
    options?: RequestOptions
  ): Promise<ApiResponse<SearchResult<StructuredDocument>>> {
    const queryParams = this.buildQueryParams((params || {}) as Record<string, unknown>);
    return this.request<SearchResult<StructuredDocument>>(
      'GET',
      `/products/${productId}/documents?${queryParams}`,
      undefined,
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Template Operations
  // ---------------------------------------------------------------------------

  /**
   * Get available templates
   */
  async getTemplates(
    params?: { type?: string; market?: string },
    options?: RequestOptions
  ): Promise<ApiResponse<DocumentTemplate[]>> {
    const queryParams = this.buildQueryParams((params || {}) as Record<string, unknown>);
    return this.request<DocumentTemplate[]>(
      'GET',
      `/templates?${queryParams}`,
      undefined,
      options
    );
  }

  /**
   * Get template by ID
   */
  async getTemplate(
    templateId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<DocumentTemplate>> {
    return this.request<DocumentTemplate>(
      'GET',
      `/templates/${templateId}`,
      undefined,
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Review Operations
  // ---------------------------------------------------------------------------

  /**
   * Create review request
   */
  async createReview(
    request: {
      documentId?: string;
      componentIds: string[];
      type: string;
      priority: string;
      dueDate: string;
      reviewers: string[];
      trigger?: ReviewTrigger;
    },
    options?: RequestOptions
  ): Promise<ApiResponse<ReviewRequest>> {
    return this.request<ReviewRequest>(
      'POST',
      '/reviews',
      request,
      options
    );
  }

  /**
   * Get review status
   */
  async getReview(
    reviewId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<ReviewRequest>> {
    return this.request<ReviewRequest>(
      'GET',
      `/reviews/${reviewId}`,
      undefined,
      options
    );
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(
    params?: { userId?: string; productId?: string },
    options?: RequestOptions
  ): Promise<ApiResponse<ReviewRequest[]>> {
    const queryParams = this.buildQueryParams({ ...params, status: 'pending' });
    return this.request<ReviewRequest[]>(
      'GET',
      `/reviews?${queryParams}`,
      undefined,
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  /**
   * Get changes since timestamp (for sync)
   */
  async getChangesSince(
    since: string,
    params?: { types?: string[]; markets?: string[] },
    options?: RequestOptions
  ): Promise<ApiResponse<{
    components: ContentComponent[];
    documents: StructuredDocument[];
    nextCursor?: string;
  }>> {
    const queryParams = this.buildQueryParams({ since, ...params });
    return this.request(
      'GET',
      `/sync/changes?${queryParams}`,
      undefined,
      options
    );
  }

  /**
   * Get component dependencies
   */
  async getComponentDependencies(
    componentId: string,
    options?: RequestOptions
  ): Promise<ApiResponse<{
    usedIn: { documentId: string; documentTitle: string; section: string }[];
    linkedFrom: { componentId: string; title: string }[];
    linksTo: { componentId: string; title: string }[];
  }>> {
    return this.request(
      'GET',
      `/components/${componentId}/dependencies`,
      undefined,
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Webhook Signature Verification
  // ---------------------------------------------------------------------------

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    const signaturePayload = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(signaturePayload)
      .digest('hex');
    
    // Timing-safe comparison
    const sig = `sha256=${expectedSignature}`;
    if (signature.length !== sig.length) return false;
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Verify webhook timestamp is recent (within 5 minutes)
   */
  verifyWebhookTimestamp(timestamp: string): boolean {
    const ts = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return Math.abs(now - ts) < fiveMinutes;
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  /**
   * Check Docuvera API health
   */
  async healthCheck(options?: RequestOptions): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    timestamp: string;
  }>> {
    return this.request('GET', '/health', undefined, options);
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}/api/${this.config.apiVersion}${path}`;
    const headers = await this.buildHeaders(options?.headers);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          options?.timeout || this.config.timeout
        );

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: options?.signal || controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();
        
        if (!response.ok) {
          return {
            success: false,
            error: {
              code: data.code || `HTTP_${response.status}`,
              message: data.message || response.statusText,
              details: data.details,
            },
            metadata: this.extractMetadata(response),
          };
        }

        return {
          success: true,
          data: data as T,
          metadata: this.extractMetadata(response),
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort
        if ((error as Error).name === 'AbortError') {
          break;
        }
        
        // Wait before retry
        if (attempt < this.config.retry.maxRetries) {
          await this.delay(this.config.retry.backoffMs * Math.pow(2, attempt));
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || 'Request failed after retries',
      },
    };
  }

  private async buildHeaders(
    additional?: Record<string, string>
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client': 'ligature',
      'X-Client-Version': '0.16.8',
      ...additional,
    };

    // Add authentication
    if (this.config.authMethod === 'api_key' && this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    } else if (this.config.authMethod === 'oauth2') {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    if (!this.config.oauth2) return null;

    try {
      const response = await fetch(this.config.oauth2.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.oauth2.clientId,
          client_secret: this.config.oauth2.clientSecret,
          scope: this.config.oauth2.scopes.join(' '),
        }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      return this.accessToken;
    } catch {
      return null;
    }
  }

  private extractMetadata(response: Response) {
    return {
      requestId: response.headers.get('x-request-id') || '',
      timestamp: new Date().toISOString(),
      rateLimit: {
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0', 10),
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0', 10),
      },
    };
  }

  private buildQueryParams(params: Record<string, unknown>): string {
    const entries: string[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      
      if (Array.isArray(value)) {
        entries.push(`${key}=${value.map(v => encodeURIComponent(String(v))).join(',')}`);
      } else {
        entries.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    }
    
    return entries.join('&');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

let defaultClient: DocuveraClient | null = null;

/**
 * Get or create default Docuvera client
 */
export function getDocuveraClient(config?: Partial<DocuveraConfig>): DocuveraClient {
  if (!defaultClient && config) {
    defaultClient = new DocuveraClient(config as DocuveraConfig);
  }
  if (!defaultClient) {
    throw new Error('Docuvera client not initialized. Provide config on first call.');
  }
  return defaultClient;
}

/**
 * Create new Docuvera client (for testing or multiple instances)
 */
export function createDocuveraClient(config: Partial<DocuveraConfig>): DocuveraClient {
  return new DocuveraClient(config as DocuveraConfig);
}

/**
 * Reset default client (for testing)
 */
export function resetDocuveraClient(): void {
  defaultClient = null;
}
