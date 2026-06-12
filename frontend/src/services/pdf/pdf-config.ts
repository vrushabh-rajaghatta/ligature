
// =============================================================================
// PDF Production Configuration
// =============================================================================
// Configuration management for production PDF extraction service.
// Supports environment variable overrides and validation.
// =============================================================================

import type {
  PDFProductionConfig,
  VisionServiceConfig,
  ProcessingConfig,
  TableExtractionConfig,
  FigureExtractionConfig,
  OCRConfig,
  PDFPerformanceConfig,
  PDFFeatureFlags,
  ClaudeVisionModel,
} from './types';

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

/**
 * Default Vision API configuration
 */
export const DEFAULT_VISION_CONFIG: VisionServiceConfig = {
  provider: 'claude-vision',
  model: 'claude-sonnet-4-6',
  // apiKey loaded from ANTHROPIC_API_KEY env var
  
  // Request settings
  maxTokens: 4096,
  temperature: 0,               // Deterministic for extraction
  
  // Rate limits (conservative defaults)
  requestsPerMinute: 50,
  imagesPerRequest: 20,         // Claude supports up to 20 images
  
  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  
  // Timeout
  timeoutMs: 60_000,            // 60 seconds per request
};

/**
 * Default processing configuration
 */
export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  // Page handling
  maxPagesPerDocument: 500,
  maxFileSizeMb: 100,
  supportedFormats: ['application/pdf'],
  
  // Image conversion
  pageImageFormat: 'png',
  pageImageQuality: 90,
  pageImageDpi: 150,            // Balance quality vs size
  maxImageDimension: 2048,      // Max pixels
  
  // Text extraction
  preserveLayout: true,
  detectColumns: true,
  detectHeaders: true,
  detectFooters: true,
  
  // Section detection
  detectSections: true,
  sectionPatterns: [
    // ICH E3 section patterns
    '^\\d+\\.?\\s+[A-Z]',       // "1. INTRODUCTION" or "1 INTRODUCTION"
    '^\\d+\\.\\d+\\.?\\s+',     // "1.1 Study Design"
    '^\\d+\\.\\d+\\.\\d+\\.?\\s+', // "1.1.1 Details"
    '^Section\\s+\\d+',         // "Section 1"
    '^APPENDIX\\s+',            // "APPENDIX A"
  ],
};

/**
 * Default table extraction configuration
 */
export const DEFAULT_TABLE_CONFIG: TableExtractionConfig = {
  enabled: true,
  method: 'vision',
  
  // Detection thresholds
  minRows: 2,
  minColumns: 2,
  minConfidence: 0.7,
  
  // Structure detection
  detectMergedCells: true,
  detectHeaderRows: true,
  detectRowHeaders: true,
  detectFootnotes: true,
  
  // Statistical value detection
  detectPValues: true,
  detectConfidenceIntervals: true,
  detectPercentages: true,
  
  // Output
  outputFormats: ['json', 'markdown'],
};

/**
 * Default figure extraction configuration
 */
export const DEFAULT_FIGURE_CONFIG: FigureExtractionConfig = {
  enabled: false,               // Disabled by default (slower)
  
  // Detection
  minSizePixels: 100,
  maxSizePixels: 4000,
  detectCaptions: true,
  
  // Classification
  classifyFigureType: true,
  classifyChartType: true,
  
  // Image handling
  outputFormat: 'png',
  outputQuality: 90,
  maxOutputDimension: 2048,
  
  // Data extraction
  extractChartData: false,      // Expensive operation
  extractAxisLabels: true,
  extractLegend: true,
};

/**
 * Default OCR configuration
 */
export const DEFAULT_OCR_CONFIG: OCRConfig = {
  enabled: false,               // Only enable when needed
  provider: 'vision',           // Use Claude Vision for OCR
  
  // Languages
  languages: ['eng'],
  
  // Quality settings
  dpi: 300,
  preprocessImage: true,
  
  // Confidence
  minConfidence: 0.8,
  
  // When to use OCR
  autoDetectScanned: true,
  forceOcrThreshold: 0.1,       // If <10% text extracted, use OCR
};

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PDFPerformanceConfig = {
  // Concurrency
  maxConcurrentPages: 5,
  maxConcurrentDocuments: 2,
  
  // Caching
  enablePageCache: true,
  pageCacheTtlMs: 10 * 60 * 1000,  // 10 minutes
  maxCachedPages: 100,
  
  // Timeouts
  pageTimeoutMs: 30_000,
  documentTimeoutMs: 300_000,   // 5 minutes
  
  // Memory management
  maxMemoryMb: 512,
  cleanupIntervalMs: 60_000,
};

/**
 * Default feature flags (conservative for initial rollout)
 */
export const DEFAULT_FEATURE_FLAGS: PDFFeatureFlags = {
  enableVisionExtraction: true,
  enableTableExtraction: true,
  enableFigureExtraction: false,  // Disabled by default
  enableOCR: false,               // Disabled by default
  enableSectionDetection: true,
  enableQualityAssessment: true,
  enableCaching: true,
  enableMetrics: true,
  enableDetailedLogging: false,
};

/**
 * Complete default configuration
 */
export const DEFAULT_PDF_CONFIG: PDFProductionConfig = {
  vision: DEFAULT_VISION_CONFIG,
  processing: DEFAULT_PROCESSING_CONFIG,
  tables: DEFAULT_TABLE_CONFIG,
  figures: DEFAULT_FIGURE_CONFIG,
  ocr: DEFAULT_OCR_CONFIG,
  performance: DEFAULT_PERFORMANCE_CONFIG,
  features: DEFAULT_FEATURE_FLAGS,
};

// -----------------------------------------------------------------------------
// Configuration Builder
// -----------------------------------------------------------------------------

/**
 * Builder for creating PDF configuration with overrides
 */
export class PDFConfigBuilder {
  private config: PDFProductionConfig;

  constructor(base: Partial<PDFProductionConfig> = {}) {
    this.config = {
      ...DEFAULT_PDF_CONFIG,
      ...base,
      vision: { ...DEFAULT_VISION_CONFIG, ...base.vision },
      processing: { ...DEFAULT_PROCESSING_CONFIG, ...base.processing },
      tables: { ...DEFAULT_TABLE_CONFIG, ...base.tables },
      figures: { ...DEFAULT_FIGURE_CONFIG, ...base.figures },
      ocr: { ...DEFAULT_OCR_CONFIG, ...base.ocr },
      performance: { ...DEFAULT_PERFORMANCE_CONFIG, ...base.performance },
      features: { ...DEFAULT_FEATURE_FLAGS, ...base.features },
    };
  }

  /**
   * Set Vision API configuration
   */
  withVision(config: Partial<VisionServiceConfig>): this {
    this.config.vision = { ...this.config.vision, ...config };
    return this;
  }

  /**
   * Set processing configuration
   */
  withProcessing(config: Partial<ProcessingConfig>): this {
    this.config.processing = { ...this.config.processing, ...config };
    return this;
  }

  /**
   * Set table extraction configuration
   */
  withTables(config: Partial<TableExtractionConfig>): this {
    this.config.tables = { ...this.config.tables, ...config };
    return this;
  }

  /**
   * Set figure extraction configuration
   */
  withFigures(config: Partial<FigureExtractionConfig>): this {
    this.config.figures = { ...this.config.figures, ...config };
    return this;
  }

  /**
   * Set OCR configuration
   */
  withOCR(config: Partial<OCRConfig>): this {
    this.config.ocr = { ...this.config.ocr, ...config };
    return this;
  }

  /**
   * Set performance configuration
   */
  withPerformance(config: Partial<PDFPerformanceConfig>): this {
    this.config.performance = { ...this.config.performance, ...config };
    return this;
  }

  /**
   * Set feature flags
   */
  withFeatures(flags: Partial<PDFFeatureFlags>): this {
    this.config.features = { ...this.config.features, ...flags };
    return this;
  }

  /**
   * Apply environment variable overrides
   */
  withEnvOverrides(): this {
    const env = typeof process !== 'undefined' ? process.env as Record<string, string | undefined> : {};

    // API key
    if (env['ANTHROPIC_API_KEY'] && !this.config.vision.apiKey) {
      this.config.vision.apiKey = env['ANTHROPIC_API_KEY'];
    }

    // Vision model
    if (env['PDF_VISION_MODEL']) {
      const model = env['PDF_VISION_MODEL'] as ClaudeVisionModel;
      if (isValidVisionModel(model)) {
        this.config.vision.model = model;
      }
    }

    // Processing limits
    if (env['PDF_MAX_PAGES']) {
      const maxPages = parseInt(env['PDF_MAX_PAGES'], 10);
      if (!isNaN(maxPages) && maxPages > 0) {
        this.config.processing.maxPagesPerDocument = maxPages;
      }
    }

    if (env['PDF_MAX_FILE_SIZE_MB']) {
      const maxSize = parseInt(env['PDF_MAX_FILE_SIZE_MB'], 10);
      if (!isNaN(maxSize) && maxSize > 0) {
        this.config.processing.maxFileSizeMb = maxSize;
      }
    }

    // Feature flags
    if (env['PDF_ENABLE_OCR'] !== undefined) {
      this.config.features.enableOCR = env['PDF_ENABLE_OCR'] === 'true';
      this.config.ocr.enabled = env['PDF_ENABLE_OCR'] === 'true';
    }

    if (env['PDF_ENABLE_TABLES'] !== undefined) {
      this.config.features.enableTableExtraction = env['PDF_ENABLE_TABLES'] === 'true';
      this.config.tables.enabled = env['PDF_ENABLE_TABLES'] === 'true';
    }

    if (env['PDF_ENABLE_FIGURES'] !== undefined) {
      this.config.features.enableFigureExtraction = env['PDF_ENABLE_FIGURES'] === 'true';
      this.config.figures.enabled = env['PDF_ENABLE_FIGURES'] === 'true';
    }

    return this;
  }

  /**
   * Build the configuration
   */
  build(): PDFProductionConfig {
    return this.config;
  }

  /**
   * Build with validation
   */
  buildValidated(): PDFProductionConfig {
    const errors = validatePDFConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid PDF configuration: ${errors.map(e => e.message).join('; ')}`);
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
 * Validate PDF configuration
 */
export function validatePDFConfig(config: PDFProductionConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Vision validation
  if (!config.vision.model) {
    errors.push({ field: 'vision.model', message: 'Vision model is required' });
  }
  if (config.vision.maxTokens < 100 || config.vision.maxTokens > 16384) {
    errors.push({
      field: 'vision.maxTokens',
      message: 'Max tokens must be between 100 and 16384',
      value: config.vision.maxTokens,
    });
  }
  if (config.vision.temperature < 0 || config.vision.temperature > 1) {
    errors.push({
      field: 'vision.temperature',
      message: 'Temperature must be between 0 and 1',
      value: config.vision.temperature,
    });
  }
  if (config.vision.timeoutMs < 1000) {
    errors.push({
      field: 'vision.timeoutMs',
      message: 'Timeout must be at least 1000ms',
      value: config.vision.timeoutMs,
    });
  }

  // Processing validation
  if (config.processing.maxPagesPerDocument < 1) {
    errors.push({
      field: 'processing.maxPagesPerDocument',
      message: 'Max pages must be at least 1',
      value: config.processing.maxPagesPerDocument,
    });
  }
  if (config.processing.maxFileSizeMb < 1) {
    errors.push({
      field: 'processing.maxFileSizeMb',
      message: 'Max file size must be at least 1 MB',
      value: config.processing.maxFileSizeMb,
    });
  }
  if (config.processing.pageImageDpi < 72 || config.processing.pageImageDpi > 600) {
    errors.push({
      field: 'processing.pageImageDpi',
      message: 'DPI must be between 72 and 600',
      value: config.processing.pageImageDpi,
    });
  }

  // Table validation
  if (config.tables.minRows < 1) {
    errors.push({
      field: 'tables.minRows',
      message: 'Min rows must be at least 1',
      value: config.tables.minRows,
    });
  }
  if (config.tables.minConfidence < 0 || config.tables.minConfidence > 1) {
    errors.push({
      field: 'tables.minConfidence',
      message: 'Min confidence must be between 0 and 1',
      value: config.tables.minConfidence,
    });
  }

  // Performance validation
  if (config.performance.maxConcurrentPages < 1) {
    errors.push({
      field: 'performance.maxConcurrentPages',
      message: 'Max concurrent pages must be at least 1',
      value: config.performance.maxConcurrentPages,
    });
  }
  if (config.performance.pageTimeoutMs < 1000) {
    errors.push({
      field: 'performance.pageTimeoutMs',
      message: 'Page timeout must be at least 1000ms',
      value: config.performance.pageTimeoutMs,
    });
  }

  return errors;
}

/**
 * Check if configuration has required secrets
 */
export function validateProductionSecrets(config: PDFProductionConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!config.vision.apiKey) {
    errors.push({
      field: 'vision.apiKey',
      message: 'Anthropic API key required (set ANTHROPIC_API_KEY env var)',
    });
  }

  return errors;
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create configuration for development
 */
export function createDevConfig(): PDFProductionConfig {
  return new PDFConfigBuilder()
    .withFeatures({
      enableDetailedLogging: true,
      enableCaching: false,
    })
    .withPerformance({
      pageTimeoutMs: 60_000,
      documentTimeoutMs: 600_000,
    })
    .build();
}

/**
 * Create configuration for production
 */
export function createProductionConfig(): PDFProductionConfig {
  return new PDFConfigBuilder()
    .withEnvOverrides()
    .withFeatures({
      enableMetrics: true,
      enableCaching: true,
    })
    .buildValidated();
}

/**
 * Create configuration for testing
 */
export function createTestConfig(): PDFProductionConfig {
  return new PDFConfigBuilder()
    .withVision({
      maxRetries: 1,
      timeoutMs: 5000,
    })
    .withPerformance({
      maxConcurrentPages: 1,
      enablePageCache: false,
      pageTimeoutMs: 5000,
      documentTimeoutMs: 30000,
    })
    .withFeatures({
      enableCaching: false,
      enableMetrics: false,
      enableDetailedLogging: false,
    })
    .build();
}

/**
 * Create configuration optimized for CSR documents
 */
export function createCSRConfig(): PDFProductionConfig {
  return new PDFConfigBuilder()
    .withTables({
      enabled: true,
      method: 'vision',
      detectPValues: true,
      detectConfidenceIntervals: true,
      detectPercentages: true,
      detectFootnotes: true,
    })
    .withProcessing({
      detectSections: true,
      sectionPatterns: [
        // ICH E3 specific patterns
        '^\\d+\\.\\s+[A-Z]',
        '^\\d+\\.\\d+\\s+',
        '^Table\\s+\\d+',
        '^Figure\\s+\\d+',
        '^SYNOPSIS',
        '^ABBREVIATIONS',
      ],
    })
    .withFeatures({
      enableTableExtraction: true,
      enableSectionDetection: true,
    })
    .build();
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Valid Claude Vision models
 */
const VALID_VISION_MODELS: ClaudeVisionModel[] = [
  'claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

/**
 * Check if a model string is a valid Vision model
 */
export function isValidVisionModel(model: string): model is ClaudeVisionModel {
  return VALID_VISION_MODELS.includes(model as ClaudeVisionModel);
}

/**
 * Get recommended DPI based on use case
 */
export function getRecommendedDpi(useCase: 'speed' | 'balanced' | 'quality'): number {
  switch (useCase) {
    case 'speed': return 100;
    case 'balanced': return 150;
    case 'quality': return 300;
    default: return 150;
  }
}

/**
 * Calculate estimated processing time
 */
export function estimateProcessingTime(
  pageCount: number,
  config: PDFProductionConfig
): { minMs: number; maxMs: number; avgMs: number } {
  const pagesPerBatch = config.vision.imagesPerRequest;
  const batches = Math.ceil(pageCount / pagesPerBatch);
  const concurrency = config.performance.maxConcurrentPages;
  
  const avgTimePerPage = 2000; // ~2 seconds per page
  const parallelBatches = Math.ceil(batches / concurrency);
  
  const avgMs = parallelBatches * avgTimePerPage * Math.min(pagesPerBatch, pageCount);
  const minMs = avgMs * 0.5;
  const maxMs = avgMs * 2;
  
  return { minMs, maxMs, avgMs };
}
