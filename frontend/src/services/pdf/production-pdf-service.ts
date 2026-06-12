
import { getAnthropicApiKey } from '@/config/api-keys';
import { logger } from '@/lib/logger';
/**
 * Production PDF Extraction Service
 * =============================================================================
 * Factory for creating production PDF extraction service.
 * Uses Claude Vision for intelligent document extraction.
 * 
 * Components:
 * - ClaudeVisionClient: Extracts content using Claude's vision capabilities
 * - LayoutAnalyzer: Detects page structure and reading order
 * - TableExtractor: Extracts and structures tabular data
 * - FigureExtractor: Identifies and classifies figures/charts
 * - PDFProcessor: Orchestrates all extraction components
 * 
 * Version: 0.27.14
 */

import type { IPDFExtractionService } from '@/types/pdf-extraction';
import type { PDFProductionConfig } from './types';
import { PDFProcessor } from './pdf-processor';

/**
 * Configuration for production PDF service
 */
interface ProductionPDFConfig {
  /** Anthropic API key for Claude Vision */
  apiKey?: string;
  /** Claude model to use */
  model?: string;
  /** Maximum retries for API calls */
  maxRetries?: number;
  /** Enable OCR for scanned pages */
  enableOCR?: boolean;
  /** Maximum pages to process (0 = unlimited) */
  maxPages?: number;
}

/**
 * Creates a production PDF extraction service instance
 * Automatically configures based on environment variables
 */
export async function createProductionPDFService(
  config?: ProductionPDFConfig
): Promise<IPDFExtractionService> {
  const apiKey = config?.apiKey || getAnthropicApiKey();
  
  if (!apiKey) {
    throw new Error(
      'PDF extraction service requires ANTHROPIC_API_KEY environment variable'
    );
  }

  // Create processor with nested config structure
  const processor = new PDFProcessor({
    vision: {
      provider: 'claude-vision',
      model: (config?.model as 'claude-sonnet-4-6') || 'claude-sonnet-4-6',
      apiKey,
      maxRetries: config?.maxRetries || 3,
    },
    ocr: {
      enabled: config?.enableOCR ?? true,
    },
    processing: {
      maxPages: config?.maxPages ?? 0,
    },
  } as unknown as Partial<PDFProductionConfig>);

  logger.debug('ProductionPDF', 'PDF extraction service initialized');
  
  return processor;
}

/**
 * Creates a lightweight PDF service for quick text extraction only
 * (No tables, figures, or advanced analysis)
 */
export async function createLightweightPDFService(): Promise<IPDFExtractionService> {
  const apiKey = getAnthropicApiKey();
  
  if (!apiKey) {
    throw new Error(
      'PDF extraction service requires ANTHROPIC_API_KEY environment variable'
    );
  }

  const processor = new PDFProcessor({
    vision: {
      provider: 'claude-vision',
      model: 'claude-sonnet-4-6',
      apiKey,
      maxRetries: 2,
    },
    ocr: {
      enabled: false,
    },
    processing: {
      maxPages: 50,
    },
    features: {
      extractTables: false,
      extractFigures: false,
    },
  } as unknown as Partial<PDFProductionConfig>);

  logger.debug('ProductionPDF', 'Lightweight PDF extraction service initialized');
  
  return processor;
}

export type { ProductionPDFConfig };
