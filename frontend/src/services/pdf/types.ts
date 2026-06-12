
// =============================================================================
// Production PDF Extraction Types
// =============================================================================
// Extended types for production PDF extraction service.
// Builds on base types from src/types/pdf-extraction.ts
// =============================================================================

import type {
  ExtractionMethod,
  TableDetectionMethod,
  ImageFormat,
} from '@/types/pdf-extraction';

// -----------------------------------------------------------------------------
// Provider Types
// -----------------------------------------------------------------------------

/**
 * PDF extraction providers
 */
export type PDFExtractionProvider =
  | 'claude-vision'   // Claude Vision API (primary)
  | 'pdf-parse'       // Native PDF text extraction
  | 'tesseract'       // Tesseract OCR
  | 'textract'        // AWS Textract
  | 'document-ai';    // Google Document AI

/**
 * Claude Vision models for PDF extraction
 */
export type ClaudeVisionModel =
  | 'claude-sonnet-4-6'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

// -----------------------------------------------------------------------------
// Configuration Types
// -----------------------------------------------------------------------------

/**
 * Complete production PDF extraction configuration
 */
export interface PDFProductionConfig {
  // Vision API configuration
  vision: VisionServiceConfig;
  
  // Processing configuration
  processing: ProcessingConfig;
  
  // Table extraction configuration
  tables: TableExtractionConfig;
  
  // Figure extraction configuration
  figures: FigureExtractionConfig;
  
  // OCR configuration
  ocr: OCRConfig;
  
  // Performance settings
  performance: PDFPerformanceConfig;
  
  // Feature flags
  features: PDFFeatureFlags;
}

/**
 * Claude Vision API configuration
 */
export interface VisionServiceConfig {
  provider: 'claude-vision';
  model: ClaudeVisionModel;
  apiKey?: string;              // From env if not provided
  baseUrl?: string;             // Override API endpoint
  
  // Request settings
  maxTokens: number;            // Max output tokens
  temperature: number;          // Generation temperature
  
  // Rate limiting
  requestsPerMinute: number;
  imagesPerRequest: number;     // Max images per API call
  
  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  
  // Timeout
  timeoutMs: number;
}

/**
 * Document processing configuration
 */
export interface ProcessingConfig {
  // Page handling
  maxPagesPerDocument: number;
  maxFileSizeMb: number;
  supportedFormats: string[];
  
  // Image conversion
  pageImageFormat: 'png' | 'jpeg';
  pageImageQuality: number;       // 0-100 for JPEG
  pageImageDpi: number;           // Resolution for rendering
  maxImageDimension: number;      // Max width/height in pixels
  
  // Text extraction
  preserveLayout: boolean;
  detectColumns: boolean;
  detectHeaders: boolean;
  detectFooters: boolean;
  
  // Section detection
  detectSections: boolean;
  sectionPatterns: string[];      // Regex patterns for section headers
}

/**
 * Table extraction configuration
 */
export interface TableExtractionConfig {
  enabled: boolean;
  method: TableDetectionMethod;
  
  // Detection thresholds
  minRows: number;
  minColumns: number;
  minConfidence: number;
  
  // Structure detection
  detectMergedCells: boolean;
  detectHeaderRows: boolean;
  detectRowHeaders: boolean;
  detectFootnotes: boolean;
  
  // Statistical value detection
  detectPValues: boolean;
  detectConfidenceIntervals: boolean;
  detectPercentages: boolean;
  
  // Output
  outputFormats: ('json' | 'markdown' | 'csv' | 'html')[];
}

/**
 * Figure extraction configuration
 */
export interface FigureExtractionConfig {
  enabled: boolean;
  
  // Detection
  minSizePixels: number;
  maxSizePixels: number;
  detectCaptions: boolean;
  
  // Classification
  classifyFigureType: boolean;
  classifyChartType: boolean;
  
  // Image handling
  outputFormat: ImageFormat;
  outputQuality: number;
  maxOutputDimension: number;
  
  // Data extraction (for charts)
  extractChartData: boolean;
  extractAxisLabels: boolean;
  extractLegend: boolean;
}

/**
 * OCR configuration
 */
export interface OCRConfig {
  enabled: boolean;
  provider: 'tesseract' | 'textract' | 'vision';
  
  // Languages
  languages: string[];
  
  // Quality settings
  dpi: number;
  preprocessImage: boolean;
  
  // Confidence
  minConfidence: number;
  
  // When to use OCR
  autoDetectScanned: boolean;
  forceOcrThreshold: number;    // Text density threshold
}

/**
 * Performance tuning configuration
 */
export interface PDFPerformanceConfig {
  // Concurrency
  maxConcurrentPages: number;
  maxConcurrentDocuments: number;
  
  // Caching
  enablePageCache: boolean;
  pageCacheTtlMs: number;
  maxCachedPages: number;
  
  // Timeouts
  pageTimeoutMs: number;
  documentTimeoutMs: number;
  
  // Memory management
  maxMemoryMb: number;
  cleanupIntervalMs: number;
}

/**
 * Feature flags for gradual rollout
 */
export interface PDFFeatureFlags {
  enableVisionExtraction: boolean;
  enableTableExtraction: boolean;
  enableFigureExtraction: boolean;
  enableOCR: boolean;
  enableSectionDetection: boolean;
  enableQualityAssessment: boolean;
  enableCaching: boolean;
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
}

// -----------------------------------------------------------------------------
// Request/Response Types
// -----------------------------------------------------------------------------

/**
 * Vision API extraction request
 */
export interface VisionExtractionRequest {
  images: VisionImage[];
  extractionType: VisionExtractionType;
  options?: VisionExtractionOptions;
}

/**
 * Image for Vision API
 */
export interface VisionImage {
  data: string;                 // Base64 encoded
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  pageNumber?: number;
}

/**
 * Types of extraction to perform
 */
export type VisionExtractionType =
  | 'full'            // Extract everything
  | 'text'            // Text only
  | 'table'           // Tables only
  | 'figure'          // Figures only
  | 'structure';      // Document structure

/**
 * Options for Vision extraction
 */
export interface VisionExtractionOptions {
  // Output format
  outputFormat?: 'json' | 'markdown';
  
  // Detail level
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  
  // Specific extractions
  extractTablesAs?: 'json' | 'markdown' | 'csv';
  identifySections?: boolean;
  mapToIchE3?: boolean;
  
  // Statistical focus
  focusOnStatistics?: boolean;
  identifyPValues?: boolean;
}

/**
 * Vision API extraction response
 */
export interface VisionExtractionResponse {
  // Extracted content
  text?: string;
  tables?: VisionExtractedTable[];
  figures?: VisionExtractedFigure[];
  sections?: VisionDetectedSection[];
  
  // Processing info
  model: string;
  processingTimeMs: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  
  // Quality
  confidence: number;
  warnings?: string[];
}

/**
 * Table extracted via Vision API
 */
export interface VisionExtractedTable {
  tableNumber?: string;
  title?: string;
  headers: string[];
  rows: string[][];
  footnotes?: string[];
  confidence: number;
  boundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

/**
 * Figure extracted via Vision API
 */
export interface VisionExtractedFigure {
  figureNumber?: string;
  title?: string;
  figureType: string;
  chartType?: string;
  description: string;
  confidence: number;
}

/**
 * Section detected via Vision API
 */
export interface VisionDetectedSection {
  number: string;
  title: string;
  level: number;
  pageNumber: number;
  ichE3Mapping?: string;
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

/**
 * PDF extraction error codes
 */
export type PDFErrorCode =
  | 'VISION_API_ERROR'
  | 'VISION_RATE_LIMITED'
  | 'VISION_TIMEOUT'
  | 'INVALID_PDF'
  | 'PDF_ENCRYPTED'
  | 'PDF_CORRUPTED'
  | 'PAGE_RENDER_FAILED'
  | 'TABLE_DETECTION_FAILED'
  | 'FIGURE_EXTRACTION_FAILED'
  | 'OCR_FAILED'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_PAGES'
  | 'UNSUPPORTED_FORMAT'
  | 'PROCESSING_TIMEOUT';

/**
 * PDF extraction error with details
 */
export interface PDFError {
  code: PDFErrorCode;
  message: string;
  pageNumber?: number;
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
export interface PDFHealthCheckResult {
  healthy: boolean;
  timestamp: string;
  
  // Component status
  components: {
    visionApi: ComponentHealth;
    pdfParser: ComponentHealth;
    ocr?: ComponentHealth;
  };
  
  // Capabilities
  capabilities: {
    maxFileSizeMb: number;
    maxPages: number;
    supportedFormats: string[];
    extractionMethods: ExtractionMethod[];
  };
  
  // Performance metrics
  metrics?: {
    avgExtractionTimeMs: number;
    avgPagesPerSecond: number;
    successRate: number;
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
 * Environment variables for PDF configuration
 */
export const PDF_ENV_VARS = {
  // Anthropic
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  
  // Vision settings
  PDF_VISION_MODEL: 'PDF_VISION_MODEL',
  PDF_MAX_PAGES: 'PDF_MAX_PAGES',
  PDF_MAX_FILE_SIZE_MB: 'PDF_MAX_FILE_SIZE_MB',
  
  // Feature flags
  PDF_ENABLE_OCR: 'PDF_ENABLE_OCR',
  PDF_ENABLE_TABLES: 'PDF_ENABLE_TABLES',
  PDF_ENABLE_FIGURES: 'PDF_ENABLE_FIGURES',
} as const;

// -----------------------------------------------------------------------------
// Prompt Templates
// -----------------------------------------------------------------------------

/**
 * Prompt template types for Vision extraction
 */
export type PromptTemplate =
  | 'text_extraction'
  | 'table_extraction'
  | 'table_statistical'
  | 'figure_extraction'
  | 'section_detection'
  | 'full_page_extraction';

/**
 * Prompt template registry
 */
export interface PromptTemplateConfig {
  template: PromptTemplate;
  systemPrompt: string;
  userPromptPrefix: string;
  outputFormat: 'json' | 'markdown' | 'text';
  maxTokens: number;
}
