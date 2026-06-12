
import { getAnthropicApiKey } from '@/config/api-keys';
// =============================================================================
// Claude Vision Client
// =============================================================================
// Client for extracting content from PDF pages using Claude Vision API.
// Handles image encoding, structured extraction, and response parsing.
// =============================================================================

import type {
  VisionServiceConfig,
  VisionExtractionRequest,
  VisionExtractionResponse,
  VisionExtractionType,
  VisionExtractionOptions,
  VisionImage,
  VisionExtractedTable,
  VisionExtractedFigure,
  VisionDetectedSection,
  PDFError,
  PDFErrorCode,
  PromptTemplate,
} from './types';

import { DEFAULT_VISION_CONFIG } from './pdf-config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Claude Messages API request format
 */
interface ClaudeMessagesRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  system?: string;
  messages: ClaudeMessage[];
}

/**
 * Claude message structure
 */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: ClaudeContent[];
}

/**
 * Claude content block
 */
type ClaudeContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ClaudeImageSource };

/**
 * Claude image source
 */
interface ClaudeImageSource {
  type: 'base64';
  media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  data: string;
}

/**
 * Claude Messages API response
 */
interface ClaudeMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requestsThisMinute: number;
  windowStart: number;
}

// -----------------------------------------------------------------------------
// Prompt Templates
// -----------------------------------------------------------------------------

const PROMPT_TEMPLATES: Record<PromptTemplate, {
  system: string;
  userPrefix: string;
  outputFormat: 'json' | 'markdown' | 'text';
}> = {
  text_extraction: {
    system: `You are a document text extraction specialist. Extract all readable text from the provided page image(s), preserving the reading order and structure. Maintain paragraph breaks and identify headings.`,
    userPrefix: `Extract all text from this document page. Preserve the structure and reading order.`,
    outputFormat: 'text',
  },
  
  table_extraction: {
    system: `You are a clinical document table extraction specialist. Extract tables from document images with high accuracy. Identify headers, data cells, merged cells, and footnotes. Pay special attention to statistical values (p-values, confidence intervals, percentages).

Output Format:
Return a JSON object with this structure:
{
  "tables": [
    {
      "tableNumber": "Table 14.1" or null,
      "title": "Demographics and Baseline Characteristics" or null,
      "headers": ["Column1", "Column2", ...],
      "rows": [["cell1", "cell2", ...], ...],
      "footnotes": ["a: p<0.05", ...] or null,
      "confidence": 0.95
    }
  ]
}`,
    userPrefix: `Extract all tables from this document page. Return as JSON.`,
    outputFormat: 'json',
  },
  
  table_statistical: {
    system: `You are a biostatistics table extraction specialist. Extract tables containing statistical results from clinical study documents. Identify and tag:
- P-values (p<0.05, p=0.023, etc.)
- Confidence intervals (95% CI: [1.2, 3.4])
- Percentages and proportions
- Hazard ratios, odds ratios
- Standard deviations and standard errors

Output Format:
Return a JSON object with structure:
{
  "tables": [
    {
      "tableNumber": "Table 14.1",
      "title": "Primary Efficacy Analysis",
      "headers": ["Endpoint", "Treatment", "Placebo", "Difference", "95% CI", "P-value"],
      "rows": [["ORR", "45.2%", "23.1%", "22.1%", "[15.3, 28.9]", "p<0.001"], ...],
      "statisticalValues": {
        "pValues": [{"location": [0,5], "value": "<0.001", "significant": true}],
        "confidenceIntervals": [{"location": [0,4], "value": "[15.3, 28.9]", "level": 95}]
      },
      "confidence": 0.95
    }
  ]
}`,
    userPrefix: `Extract statistical tables from this clinical document page. Identify all p-values, confidence intervals, and statistical measures. Return as JSON.`,
    outputFormat: 'json',
  },
  
  figure_extraction: {
    system: `You are a document figure analysis specialist. Identify and describe figures, charts, and diagrams in document images. Classify figure types and extract relevant details.

Output Format:
Return a JSON object:
{
  "figures": [
    {
      "figureNumber": "Figure 2.1" or null,
      "title": "Kaplan-Meier Survival Curve" or null,
      "figureType": "chart|diagram|photograph|illustration|chemical|unknown",
      "chartType": "kaplan_meier|bar|line|scatter|forest_plot|waterfall|other" or null,
      "description": "Detailed description of the figure content",
      "axisLabels": {"x": "Time (months)", "y": "Survival Probability"} or null,
      "confidence": 0.9
    }
  ]
}`,
    userPrefix: `Identify and describe all figures in this document page. Return as JSON.`,
    outputFormat: 'json',
  },
  
  section_detection: {
    system: `You are a document structure analysis specialist for clinical/regulatory documents. Identify section headers and their hierarchy. Map to ICH E3 sections where applicable.

ICH E3 Common Sections:
- 1: Title Page
- 2: Synopsis
- 3: Table of Contents
- 4: List of Abbreviations
- 5: Ethics
- 6: Investigators
- 7: Introduction
- 8: Study Objectives
- 9: Investigational Plan
- 10: Study Patients
- 11: Efficacy Evaluation
- 12: Safety Evaluation
- 13: Discussion and Conclusions
- 14: Tables, Figures, Graphs
- 15: Reference List
- 16: Appendices

Output Format:
Return a JSON object:
{
  "sections": [
    {
      "number": "11.1",
      "title": "Primary Efficacy Endpoint",
      "level": 2,
      "pageNumber": 45,
      "ichE3Mapping": "11"
    }
  ]
}`,
    userPrefix: `Identify all section headers on this page and their hierarchy. Map to ICH E3 sections. Return as JSON.`,
    outputFormat: 'json',
  },
  
  full_page_extraction: {
    system: `You are a comprehensive document extraction specialist for clinical/regulatory documents. Extract all content from document pages including:
1. Full text with structure preserved
2. All tables with headers and data
3. Figure descriptions
4. Section headers

Output Format:
Return a JSON object:
{
  "text": "Full extracted text with paragraphs...",
  "tables": [...],
  "figures": [...],
  "sections": [...]
}`,
    userPrefix: `Extract all content from this document page: text, tables, figures, and section headers. Return as JSON.`,
    outputFormat: 'json',
  },
};

// -----------------------------------------------------------------------------
// Claude Vision Client
// -----------------------------------------------------------------------------

/**
 * Client for PDF extraction using Claude Vision API
 */
export class ClaudeVisionClient {
  private readonly config: VisionServiceConfig;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private rateLimiter: RateLimiterState;

  constructor(config?: Partial<VisionServiceConfig>) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
    
    // Resolve API key
    this.apiKey = this.config.apiKey || getAnthropicApiKey() || '';
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY env var or pass apiKey in config.');
    }
    
    // Base URL
    this.baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    
    // Initialize rate limiter
    this.rateLimiter = {
      requestsThisMinute: 0,
      windowStart: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Extract content from a single page image
   */
  async extractPage(
    image: VisionImage,
    extractionType: VisionExtractionType = 'full',
    options?: VisionExtractionOptions
  ): Promise<VisionExtractionResponse> {
    return this.extract({ images: [image], extractionType, options });
  }

  /**
   * Extract content from multiple page images
   */
  async extractPages(
    images: VisionImage[],
    extractionType: VisionExtractionType = 'full',
    options?: VisionExtractionOptions
  ): Promise<VisionExtractionResponse> {
    // Batch if more than max images per request
    if (images.length <= this.config.imagesPerRequest) {
      return this.extract({ images, extractionType, options });
    }
    
    // Process in batches and merge
    const batches: VisionImage[][] = [];
    for (let i = 0; i < images.length; i += this.config.imagesPerRequest) {
      batches.push(images.slice(i, i + this.config.imagesPerRequest));
    }
    
    const results = await Promise.all(
      batches.map(batch => this.extract({ images: batch, extractionType, options }))
    );
    
    return this.mergeResponses(results);
  }

  /**
   * Extract tables from page image(s)
   */
  async extractTables(
    images: VisionImage[],
    options?: { statistical?: boolean }
  ): Promise<VisionExtractedTable[]> {
    const template = options?.statistical ? 'table_statistical' : 'table_extraction';
    const response = await this.extractWithTemplate(images, template);
    return response.tables || [];
  }

  /**
   * Extract text from page image(s)
   */
  async extractText(images: VisionImage[]): Promise<string> {
    const response = await this.extractWithTemplate(images, 'text_extraction');
    return response.text || '';
  }

  /**
   * Detect sections from page image(s)
   */
  async detectSections(images: VisionImage[]): Promise<VisionDetectedSection[]> {
    const response = await this.extractWithTemplate(images, 'section_detection');
    return response.sections || [];
  }

  /**
   * Extract figures from page image(s)
   */
  async extractFigures(images: VisionImage[]): Promise<VisionExtractedFigure[]> {
    const response = await this.extractWithTemplate(images, 'figure_extraction');
    return response.figures || [];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      // Simple test with minimal image
      const testImage: VisionImage = {
        data: createMinimalTestImage(),
        mediaType: 'image/png',
      };
      
      await this.extractText([testImage]);
      
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

  /**
   * Get current model
   */
  getModel(): string {
    return this.config.model;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Core extraction method
   */
  private async extract(request: VisionExtractionRequest): Promise<VisionExtractionResponse> {
    const template = this.getTemplateForType(request.extractionType);
    return this.extractWithTemplate(request.images, template, request.options);
  }

  /**
   * Extract using a specific prompt template
   */
  private async extractWithTemplate(
    images: VisionImage[],
    template: PromptTemplate,
    options?: VisionExtractionOptions
  ): Promise<VisionExtractionResponse> {
    const startTime = Date.now();
    const promptConfig = PROMPT_TEMPLATES[template];
    
    // Build message content
    const content: ClaudeContent[] = [];
    
    // Add images
    for (const image of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }
    
    // Add text prompt
    let userPrompt = promptConfig.userPrefix;
    if (options?.detailLevel === 'comprehensive') {
      userPrompt += ' Provide maximum detail.';
    }
    if (options?.mapToIchE3) {
      userPrompt += ' Map all sections to ICH E3 structure.';
    }
    content.push({ type: 'text', text: userPrompt });
    
    // Build request
    const apiRequest: ClaudeMessagesRequest = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: promptConfig.system,
      messages: [{
        role: 'user',
        content,
      }],
    };
    
    // Execute with retry
    const apiResponse = await this.executeWithRetry(apiRequest);
    
    // Parse response
    const responseText = apiResponse.content[0]?.text || '';
    const parsed = this.parseResponse(responseText, promptConfig.outputFormat);
    
    return {
      ...parsed,
      model: apiResponse.model,
      processingTimeMs: Date.now() - startTime,
      tokensUsed: {
        input: apiResponse.usage.input_tokens,
        output: apiResponse.usage.output_tokens,
      },
      confidence: parsed.confidence ?? 0.9,
    };
  }

  /**
   * Execute API request with retry logic
   */
  private async executeWithRetry(request: ClaudeMessagesRequest): Promise<ClaudeMessagesResponse> {
    let lastError: Error | null = null;
    let delay = this.config.retryDelayMs;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        const response = await this.executeRequest(request);
        this.updateRateLimiter();
        return response;
      } catch (error) {
        lastError = error as Error;
        
        const pdfError = this.parseError(error);
        if (!pdfError.retryable) {
          throw this.createError(pdfError);
        }
        
        if (pdfError.retryAfterMs) {
          delay = pdfError.retryAfterMs;
        }
        
        if (attempt < this.config.maxRetries) {
          await this.sleep(delay);
          delay *= this.config.retryBackoffMultiplier;
        }
      }
    }

    throw this.createError({
      code: 'VISION_API_ERROR',
      message: `Failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`,
      retryable: false,
    });
  }

  /**
   * Execute HTTP request to Claude API
   */
  private async executeRequest(request: ClaudeMessagesRequest): Promise<ClaudeMessagesResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw this.handleHttpError(response.status, errorBody, response.headers);
      }

      return await response.json() as ClaudeMessagesResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError({
          code: 'VISION_TIMEOUT',
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

    let code: PDFErrorCode = 'VISION_API_ERROR';
    
    if (status === 429) {
      code = 'VISION_RATE_LIMITED';
      retryable = true;
      const retryAfter = headers.get('Retry-After');
      if (retryAfter) {
        retryAfterMs = parseInt(retryAfter, 10) * 1000;
      }
    } else if (status >= 500) {
      retryable = true;
    } else if (status === 401 || status === 403) {
      retryable = false;
    }

    return this.createError({ code, message, retryable, retryAfterMs });
  }

  /**
   * Parse API response based on expected format
   */
  private parseResponse(
    text: string,
    format: 'json' | 'markdown' | 'text'
  ): Partial<VisionExtractionResponse> {
    if (format === 'text') {
      return { text, confidence: 0.9 };
    }
    
    if (format === 'json') {
      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                          text.match(/```\s*([\s\S]*?)\s*```/) ||
                          [null, text];
        const jsonStr = jsonMatch[1] || text;
        const parsed = JSON.parse(jsonStr.trim());
        
        return {
          text: parsed.text,
          tables: parsed.tables,
          figures: parsed.figures,
          sections: parsed.sections,
          confidence: parsed.confidence ?? 0.9,
        };
      } catch {
        // Fallback to text if JSON parsing fails
        return { text, confidence: 0.7, warnings: ['JSON parsing failed, returning raw text'] };
      }
    }
    
    return { text, confidence: 0.9 };
  }

  /**
   * Get prompt template for extraction type
   */
  private getTemplateForType(type: VisionExtractionType): PromptTemplate {
    switch (type) {
      case 'text': return 'text_extraction';
      case 'table': return 'table_extraction';
      case 'figure': return 'figure_extraction';
      case 'structure': return 'section_detection';
      case 'full':
      default: return 'full_page_extraction';
    }
  }

  /**
   * Merge multiple extraction responses
   */
  private mergeResponses(responses: VisionExtractionResponse[]): VisionExtractionResponse {
    const merged: VisionExtractionResponse = {
      text: '',
      tables: [],
      figures: [],
      sections: [],
      model: responses[0]?.model || this.config.model,
      processingTimeMs: 0,
      tokensUsed: { input: 0, output: 0 },
      confidence: 0,
      warnings: [],
    };
    
    for (const response of responses) {
      if (response.text) {
        merged.text = (merged.text ? merged.text + '\n\n' : '') + response.text;
      }
      if (response.tables) {
        merged.tables!.push(...response.tables);
      }
      if (response.figures) {
        merged.figures!.push(...response.figures);
      }
      if (response.sections) {
        merged.sections!.push(...response.sections);
      }
      merged.processingTimeMs += response.processingTimeMs;
      merged.tokensUsed.input += response.tokensUsed.input;
      merged.tokensUsed.output += response.tokensUsed.output;
      merged.confidence += response.confidence;
      if (response.warnings) {
        merged.warnings!.push(...response.warnings);
      }
    }
    
    merged.confidence /= responses.length;
    
    return merged;
  }

  /**
   * Parse error into PDFError structure
   */
  private parseError(error: unknown): PDFError {
    if (error instanceof PDFApiError) {
      return error.pdfError;
    }
    
    if (error instanceof Error) {
      return {
        code: 'VISION_API_ERROR',
        message: error.message,
        retryable: false,
      };
    }
    
    return {
      code: 'VISION_API_ERROR',
      message: 'Unknown error',
      retryable: false,
    };
  }

  /**
   * Create typed error
   */
  private createError(pdfError: PDFError): PDFApiError {
    return new PDFApiError(pdfError);
  }

  /**
   * Rate limiting
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60_000;
    
    if (now - this.rateLimiter.windowStart >= windowDuration) {
      this.rateLimiter = {
        requestsThisMinute: 0,
        windowStart: now,
      };
      return;
    }
    
    if (this.rateLimiter.requestsThisMinute >= this.config.requestsPerMinute) {
      const waitTime = windowDuration - (now - this.rateLimiter.windowStart);
      await this.sleep(waitTime + 100);
      this.rateLimiter = {
        requestsThisMinute: 0,
        windowStart: Date.now(),
      };
    }
  }

  private updateRateLimiter(): void {
    this.rateLimiter.requestsThisMinute++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// -----------------------------------------------------------------------------
// Error Class
// -----------------------------------------------------------------------------

/**
 * PDF API Error with structured details
 */
export class PDFApiError extends Error {
  readonly pdfError: PDFError;

  constructor(pdfError: PDFError) {
    super(pdfError.message);
    this.name = 'PDFApiError';
    this.pdfError = pdfError;
  }

  get code(): PDFErrorCode {
    return this.pdfError.code;
  }

  get retryable(): boolean {
    return this.pdfError.retryable;
  }

  get retryAfterMs(): number | undefined {
    return this.pdfError.retryAfterMs;
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create Vision client with config
 */
export function createVisionClient(config?: Partial<VisionServiceConfig>): ClaudeVisionClient {
  return new ClaudeVisionClient(config);
}

// -----------------------------------------------------------------------------
// Mock Client for Testing
// -----------------------------------------------------------------------------

/**
 * Mock Vision client for testing
 */
export class MockVisionClient {
  private callCount = 0;

  async extractPage(): Promise<VisionExtractionResponse> {
    this.callCount++;
    return this.createMockResponse();
  }

  async extractPages(images: VisionImage[]): Promise<VisionExtractionResponse> {
    this.callCount++;
    return this.createMockResponse(images.length);
  }

  async extractTables(): Promise<VisionExtractedTable[]> {
    this.callCount++;
    return [this.createMockTable()];
  }

  async extractText(): Promise<string> {
    this.callCount++;
    return 'Mock extracted text content from the document page.';
  }

  async detectSections(): Promise<VisionDetectedSection[]> {
    this.callCount++;
    return [this.createMockSection()];
  }

  async extractFigures(): Promise<VisionExtractedFigure[]> {
    this.callCount++;
    return [this.createMockFigure()];
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private createMockResponse(pageCount: number = 1): VisionExtractionResponse {
    return {
      text: 'Mock extracted text',
      tables: [this.createMockTable()],
      figures: [this.createMockFigure()],
      sections: [this.createMockSection()],
      model: 'mock-model',
      processingTimeMs: 100 * pageCount,
      tokensUsed: { input: 1000, output: 500 },
      confidence: 0.95,
    };
  }

  private createMockTable(): VisionExtractedTable {
    return {
      tableNumber: 'Table 1',
      title: 'Mock Table',
      headers: ['Column A', 'Column B', 'Column C'],
      rows: [
        ['Row 1 A', 'Row 1 B', 'Row 1 C'],
        ['Row 2 A', 'Row 2 B', 'Row 2 C'],
      ],
      confidence: 0.95,
    };
  }

  private createMockSection(): VisionDetectedSection {
    return {
      number: '1.1',
      title: 'Mock Section',
      level: 2,
      pageNumber: 1,
    };
  }

  private createMockFigure(): VisionExtractedFigure {
    return {
      figureNumber: 'Figure 1',
      title: 'Mock Figure',
      figureType: 'chart',
      chartType: 'bar',
      description: 'A mock bar chart showing sample data',
      confidence: 0.9,
    };
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Create minimal test image for health check
 * A 1x1 white PNG in base64
 */
function createMinimalTestImage(): string {
  // Minimal 1x1 white PNG
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}
