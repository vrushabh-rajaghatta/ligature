
// =============================================================================
// PDF Processor
// =============================================================================
// Main orchestrator for PDF extraction. Coordinates Vision API, layout analysis,
// table extraction, and figure extraction to produce comprehensive document
// extraction results.
// =============================================================================

import type {
  ExtractedDocument,
  ExtractedPage,
  PageText,
  ExtractedTable,
  ExtractedFigure,
  DetectedSection,
  PDFMetadata,
  ExtractionQuality,
  ExtractionMethod,
  QualityIssue,
  PDFExtractionOptions,
  IPDFExtractionService,
  PDFExtractionHealthStatus,
} from '@/types/pdf-extraction';

import type {
  PDFProductionConfig,
  VisionImage,
  VisionExtractionResponse,
  PDFHealthCheckResult,
} from './types';

import { ClaudeVisionClient, PDFApiError } from './claude-vision-client';
import { DEFAULT_PDF_CONFIG } from './pdf-config';
import { LayoutAnalyzer, type PageStructure } from './layout-analyzer';
import { TableExtractor, type TableExtractionResult } from './table-extractor';
import { FigureExtractor, type FigureExtractionResult } from './figure-extractor';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * PDF processing result
 */
export interface PDFProcessingResult {
  document: ExtractedDocument;
  processingTimeMs: number;
  tokensUsed: { input: number; output: number };
  warnings: string[];
  errors: string[];
}

/**
 * Page processing result
 */
export interface PageProcessingResult {
  page: ExtractedPage;
  structure: PageStructure;
  tables: ExtractedTable[];
  figures: ExtractedFigure[];
  processingTimeMs: number;
}

/**
 * PDF processor state
 */
export interface ProcessorState {
  isProcessing: boolean;
  currentPage: number;
  totalPages: number;
  progress: number;
  status: string;
}

/**
 * Processing progress callback
 */
export type ProgressCallback = (state: ProcessorState) => void;

/**
 * PDF processing options
 */
export interface PDFProcessorOptions extends PDFExtractionOptions {
  onProgress?: ProgressCallback;
  abortSignal?: AbortSignal;
}

// -----------------------------------------------------------------------------
// PDF Processor
// -----------------------------------------------------------------------------

/**
 * Main PDF processing orchestrator
 */
export class PDFProcessor implements IPDFExtractionService {
  private readonly config: PDFProductionConfig;
  private readonly visionClient: ClaudeVisionClient;
  private readonly layoutAnalyzer: LayoutAnalyzer;
  private readonly tableExtractor: TableExtractor;
  private readonly figureExtractor: FigureExtractor;

  private state: ProcessorState = {
    isProcessing: false,
    currentPage: 0,
    totalPages: 0,
    progress: 0,
    status: 'idle',
  };

  constructor(config?: Partial<PDFProductionConfig>) {
    this.config = { ...DEFAULT_PDF_CONFIG, ...config };

    // Initialize vision client
    this.visionClient = new ClaudeVisionClient(this.config.vision);

    // Initialize extractors
    this.layoutAnalyzer = new LayoutAnalyzer(
      this.config.processing,
      undefined,
      this.visionClient
    );
    this.tableExtractor = new TableExtractor(
      this.visionClient,
      this.config.tables
    );
    this.figureExtractor = new FigureExtractor(
      this.visionClient,
      this.config.figures
    );
  }

  // ---------------------------------------------------------------------------
  // IPDFExtractionService Implementation
  // ---------------------------------------------------------------------------

  /**
   * Extract complete document
   */
  async extractDocument(
    file: File | Buffer | ArrayBuffer,
    options?: PDFProcessorOptions
  ): Promise<ExtractedDocument> {
    const result = await this.processDocument(file, options);
    return result.document;
  }

  /**
   * Extract text only (faster)
   */
  async extractText(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<PageText[]> {
    const pageImages = await this.convertToImages(file, options);
    const pageTexts: PageText[] = [];

    for (let i = 0; i < pageImages.length; i++) {
      const image = pageImages[i];
      const text = await this.visionClient.extractText([image]);
      pageTexts.push({
        pageNumber: i + 1,
        text,
        tokenCount: this.estimateTokens(text),
      });
    }

    return pageTexts;
  }

  /**
   * Extract tables only
   */
  async extractTables(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedTable[]> {
    const pageImages = await this.convertToImages(file, options);
    const result = await this.tableExtractor.extractTables(pageImages);
    return result.tables;
  }

  /**
   * Extract figures only
   */
  async extractFigures(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedFigure[]> {
    const pageImages = await this.convertToImages(file, options);
    const result = await this.figureExtractor.extractFigures(pageImages);
    return result.figures;
  }

  /**
   * Detect sections only
   */
  async detectSections(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<DetectedSection[]> {
    const pageImages = await this.convertToImages(file, options);
    return this.layoutAnalyzer.detectDocumentSections(pageImages);
  }

  /**
   * Extract single page
   */
  async extractPage(
    file: File | Buffer | ArrayBuffer,
    pageNumber: number,
    options?: PDFExtractionOptions
  ): Promise<ExtractedPage> {
    const pageImages = await this.convertToImages(file, {
      ...options,
      pages: [pageNumber],
    });

    if (pageImages.length === 0) {
      throw new Error(`Page ${pageNumber} not found`);
    }

    const pageResult = await this.processPage(pageImages[0], pageNumber);
    return pageResult.page;
  }

  /**
   * Extract metadata only (fast)
   */
  async extractMetadata(
    file: File | Buffer | ArrayBuffer
  ): Promise<PDFMetadata> {
    // In production, this would use a PDF parser
    // For now, return placeholder
    return {
      isEncrypted: false,
      isLinearized: false,
      hasOutline: false,
      hasAcroForm: false,
    };
  }

  /**
   * Assess extraction quality
   */
  async assessQuality(
    file: File | Buffer | ArrayBuffer
  ): Promise<ExtractionQuality> {
    const pageImages = await this.convertToImages(file);
    return this.assessExtractionQuality(pageImages);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PDFExtractionHealthStatus> {
    const visionHealth = await this.visionClient.healthCheck();

    return {
      healthy: visionHealth.healthy,
      nativeExtractionAvailable: true,
      ocrAvailable: this.config.features.enableOCR,
      visionApiAvailable: visionHealth.healthy,
      textractAvailable: false,
      avgExtractionTimeMs: visionHealth.latencyMs || 0,
      avgPagesPerSecond: visionHealth.latencyMs ? 1000 / visionHealth.latencyMs : 0,
      maxFileSizeMb: this.config.processing.maxFileSizeMb,
      maxPageCount: this.config.processing.maxPagesPerDocument,
    };
  }

  // ---------------------------------------------------------------------------
  // Extended Methods
  // ---------------------------------------------------------------------------

  /**
   * Process a complete PDF document
   */
  async processDocument(
    file: File | Buffer | ArrayBuffer,
    options?: PDFProcessorOptions
  ): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    let totalTokens = { input: 0, output: 0 };

    // Validate file
    const validation = await this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Convert to page images
    this.updateState({ status: 'Converting PDF to images', progress: 5 });
    const pageImages = await this.convertToImages(file, options);
    this.updateState({ totalPages: pageImages.length, progress: 10 });

    // Abort check
    if (options?.abortSignal?.aborted) {
      throw new Error('Processing aborted');
    }

    // Process pages
    const pages: ExtractedPage[] = [];
    const allTables: ExtractedTable[] = [];
    const allFigures: ExtractedFigure[] = [];
    const allSections: DetectedSection[] = [];
    const pageTexts: PageText[] = [];

    for (let i = 0; i < pageImages.length; i++) {
      if (options?.abortSignal?.aborted) {
        throw new Error('Processing aborted');
      }

      const pageNumber = i + 1;
      this.updateState({
        currentPage: pageNumber,
        status: `Processing page ${pageNumber} of ${pageImages.length}`,
        progress: 10 + (80 * pageNumber / pageImages.length),
      });

      try {
        const pageResult = await this.processPage(pageImages[i], pageNumber);
        pages.push(pageResult.page);

        if (options?.extractTables !== false) {
          allTables.push(...pageResult.tables);
        }
        if (options?.extractFigures !== false) {
          allFigures.push(...pageResult.figures);
        }

        pageTexts.push({
          pageNumber,
          text: pageResult.page.text,
          tokenCount: this.estimateTokens(pageResult.page.text),
        });

        options?.onProgress?.(this.state);
      } catch (error) {
        const errorMsg = `Page ${pageNumber}: ${error}`;
        errors.push(errorMsg);
        if (this.config.features.enableDetailedLogging) {
          console.error(errorMsg);
        }
      }
    }

    // Detect sections across document
    this.updateState({ status: 'Detecting sections', progress: 90 });
    try {
      const sections = await this.layoutAnalyzer.detectDocumentSections(pageImages);
      allSections.push(...sections);
    } catch (error) {
      warnings.push(`Section detection failed: ${error}`);
    }

    // Extract metadata
    const metadata = await this.extractMetadata(file);

    // Assess quality
    this.updateState({ status: 'Assessing quality', progress: 95 });
    const quality = await this.assessExtractionQuality(pageImages, pages);

    // Build document
    const document: ExtractedDocument = {
      id: this.generateDocumentId(),
      filename: file instanceof File ? file.name : 'document.pdf',
      mimeType: 'application/pdf',
      fileSize: this.getFileSize(file),
      pageCount: pageImages.length,
      pages,
      text: pageTexts,
      tables: allTables,
      figures: allFigures,
      sections: allSections,
      metadata,
      extractionMethod: this.determineExtractionMethod(),
      processingTimeMs: Date.now() - startTime,
      extractedAt: new Date().toISOString(),
      quality,
      warnings: warnings.length > 0 ? warnings.map(w => ({ code: 'WARN', message: w })) : undefined,
      errors: errors.length > 0 ? errors.map(e => ({ code: 'ERR', message: e, fatal: false })) : undefined,
    };

    this.updateState({
      status: 'Complete',
      progress: 100,
      isProcessing: false,
    });

    return {
      document,
      processingTimeMs: Date.now() - startTime,
      tokensUsed: totalTokens,
      warnings,
      errors,
    };
  }

  /**
   * Process a single page
   */
  async processPage(
    pageImage: VisionImage,
    pageNumber: number
  ): Promise<PageProcessingResult> {
    const startTime = Date.now();

    // Analyze layout
    const structure = await this.layoutAnalyzer.analyzePage(pageImage);

    // Extract content using Vision API
    const response = await this.visionClient.extractPage(pageImage, 'full');

    // Extract tables if enabled
    let tables: ExtractedTable[] = [];
    if (this.config.features.enableTableExtraction) {
      const tableResult = await this.tableExtractor.extractTables([pageImage]);
      tables = tableResult.tables;
    }

    // Extract figures if enabled
    let figures: ExtractedFigure[] = [];
    if (this.config.features.enableFigureExtraction) {
      const figureResult = await this.figureExtractor.extractFigures([pageImage]);
      figures = figureResult.figures;
    }

    // Build page
    const page: ExtractedPage = {
      pageNumber,
      width: structure.dimensions.width,
      height: structure.dimensions.height,
      rotation: 0,
      text: response.text || '',
      textBlocks: [],
      tables,
      figures,
      hasImages: figures.length > 0,
      isScanned: false,
      confidence: response.confidence,
    };

    return {
      page,
      structure,
      tables,
      figures,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get current processing state
   */
  getState(): ProcessorState {
    return { ...this.state };
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Convert file to page images
   */
  private async convertToImages(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<VisionImage[]> {
    // In production, this would use pdf.js or similar
    // For now, create placeholder images for testing
    const pageCount = options?.pages?.length || 1;
    const images: VisionImage[] = [];

    for (let i = 0; i < pageCount; i++) {
      const pageNumber = options?.pages?.[i] || i + 1;
      images.push({
        data: this.createPlaceholderImage(),
        mediaType: 'image/png',
        pageNumber,
      });
    }

    return images;
  }

  /**
   * Create placeholder image for testing
   */
  private createPlaceholderImage(): string {
    // Minimal 1x1 white PNG
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }

  /**
   * Validate file before processing
   */
  private async validateFile(
    file: File | Buffer | ArrayBuffer
  ): Promise<{ valid: boolean; error?: string }> {
    const size = this.getFileSize(file);
    const maxSize = this.config.processing.maxFileSizeMb * 1024 * 1024;

    if (size > maxSize) {
      return {
        valid: false,
        error: `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${this.config.processing.maxFileSizeMb}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Get file size in bytes
   */
  private getFileSize(file: File | Buffer | ArrayBuffer): number {
    if (file instanceof File) {
      return file.size;
    }
    if (Buffer.isBuffer(file)) {
      return file.length;
    }
    return file.byteLength;
  }

  /**
   * Assess extraction quality
   */
  private async assessExtractionQuality(
    pageImages: VisionImage[],
    pages?: ExtractedPage[]
  ): Promise<ExtractionQuality> {
    const issues: QualityIssue[] = [];
    let textQuality = 1.0;
    let tableQuality = 1.0;
    let figureQuality = 1.0;
    let structureQuality = 1.0;

    // Check for potential issues
    if (pages) {
      for (const page of pages) {
        // Low text confidence
        if (page.confidence < 0.7) {
          textQuality *= page.confidence;
          issues.push({
            type: 'poor_ocr',
            severity: page.confidence < 0.5 ? 'high' : 'medium',
            description: `Page ${page.pageNumber} has low OCR confidence`,
            pageNumbers: [page.pageNumber],
          });
        }

        // Tables with low confidence
        for (const table of page.tables) {
          if (table.confidence < 0.7) {
            tableQuality *= table.confidence;
            issues.push({
              type: 'table_structure_unclear',
              severity: 'medium',
              description: `Table on page ${page.pageNumber} has uncertain structure`,
              pageNumbers: [page.pageNumber],
            });
          }
        }
      }
    }

    const overallScore = (textQuality + tableQuality + figureQuality + structureQuality) / 4;

    return {
      overallScore,
      textQuality,
      tableQuality,
      figureQuality,
      structureQuality,
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * Generate quality recommendations
   */
  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];

    const hasOcrIssues = issues.some(i => i.type === 'poor_ocr');
    const hasTableIssues = issues.some(i => i.type === 'table_structure_unclear');

    if (hasOcrIssues) {
      recommendations.push('Consider using higher resolution images for better OCR accuracy');
    }
    if (hasTableIssues) {
      recommendations.push('Manual review recommended for tables with unclear structure');
    }

    return recommendations;
  }

  /**
   * Determine extraction method used
   */
  private determineExtractionMethod(): ExtractionMethod {
    if (this.config.features.enableVisionExtraction) {
      return 'vision';
    }
    if (this.config.features.enableOCR) {
      return 'ocr';
    }
    return 'native';
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Update processing state
   */
  private updateState(updates: Partial<ProcessorState>): void {
    this.state = { ...this.state, ...updates };
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a PDF processor with configuration
 */
export function createPDFProcessor(
  config?: Partial<PDFProductionConfig>
): PDFProcessor {
  return new PDFProcessor(config);
}

// -----------------------------------------------------------------------------
// Mock PDF Processor for Testing
// -----------------------------------------------------------------------------

/**
 * Mock PDF processor for testing
 */
export class MockPDFProcessor implements IPDFExtractionService {
  private callCount = 0;

  async extractDocument(): Promise<ExtractedDocument> {
    this.callCount++;
    return this.createMockDocument();
  }

  async extractText(): Promise<PageText[]> {
    this.callCount++;
    return [{ pageNumber: 1, text: 'Mock extracted text', tokenCount: 100 }];
  }

  async extractTables(): Promise<ExtractedTable[]> {
    this.callCount++;
    return [this.createMockTable()];
  }

  async extractFigures(): Promise<ExtractedFigure[]> {
    this.callCount++;
    return [this.createMockFigure()];
  }

  async detectSections(): Promise<DetectedSection[]> {
    this.callCount++;
    return [this.createMockSection()];
  }

  async extractPage(): Promise<ExtractedPage> {
    this.callCount++;
    return this.createMockPage();
  }

  async extractMetadata(): Promise<PDFMetadata> {
    this.callCount++;
    return {
      title: 'Mock Document',
      isEncrypted: false,
      isLinearized: false,
      hasOutline: true,
      hasAcroForm: false,
    };
  }

  async assessQuality(): Promise<ExtractionQuality> {
    this.callCount++;
    return {
      overallScore: 0.95,
      textQuality: 0.95,
      tableQuality: 0.92,
      figureQuality: 0.90,
      structureQuality: 0.96,
      issues: [],
      recommendations: [],
    };
  }

  async healthCheck(): Promise<PDFExtractionHealthStatus> {
    this.callCount++;
    return {
      healthy: true,
      nativeExtractionAvailable: true,
      ocrAvailable: true,
      visionApiAvailable: true,
      textractAvailable: false,
      avgExtractionTimeMs: 500,
      avgPagesPerSecond: 2,
      maxFileSizeMb: 100,
      maxPageCount: 500,
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private createMockDocument(): ExtractedDocument {
    return {
      id: 'mock-doc-1',
      filename: 'mock-document.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 1024,
      pageCount: 10,
      pages: [this.createMockPage()],
      text: [{ pageNumber: 1, text: 'Mock text', tokenCount: 50 }],
      tables: [this.createMockTable()],
      figures: [this.createMockFigure()],
      sections: [this.createMockSection()],
      metadata: { isEncrypted: false, isLinearized: false, hasOutline: true, hasAcroForm: false },
      extractionMethod: 'vision',
      processingTimeMs: 5000,
      extractedAt: new Date().toISOString(),
      quality: { overallScore: 0.95, textQuality: 0.95, tableQuality: 0.92, figureQuality: 0.90, structureQuality: 0.96, issues: [], recommendations: [] },
    };
  }

  private createMockPage(): ExtractedPage {
    return {
      pageNumber: 1,
      width: 612,
      height: 792,
      rotation: 0,
      text: 'Mock page text content for testing purposes.',
      textBlocks: [],
      tables: [],
      figures: [],
      hasImages: true,
      isScanned: false,
      confidence: 0.95,
    };
  }

  private createMockTable(): ExtractedTable {
    return {
      id: 'table-1',
      pageNumber: 1,
      tableNumber: 1,
      title: 'Mock Table',
      headers: [{ text: 'A', columnIndex: 0, columnSpan: 1, rowSpan: 1 }],
      rows: [{ rowIndex: 0, cells: [{ text: '1', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1, isHeader: false, isRowHeader: false, isNumeric: true }], isHeaderRow: false, isSubheaderRow: false, isTotalRow: false }],
      headerRow: ['A'],
      dataRows: [['1']],
      rowCount: 1,
      columnCount: 1,
      hasHeaderRow: true,
      hasRowHeaders: false,
      boundingBox: { x: 72, y: 200, width: 468, height: 100 },
      confidence: 0.95,
    };
  }

  private createMockFigure(): ExtractedFigure {
    return {
      id: 'figure-1',
      pageNumber: 1,
      figureNumber: 'Figure 1',
      title: 'Mock Figure',
      imageFormat: 'png',
      width: 600,
      height: 400,
      boundingBox: { x: 72, y: 300, width: 468, height: 312 },
      figureType: 'chart',
      chartType: 'bar',
      confidence: 0.90,
    };
  }

  private createMockSection(): DetectedSection {
    return {
      id: 'section-1',
      number: '1',
      title: 'Introduction',
      level: 1,
      pageStart: 1,
      pageEnd: 5,
      sectionType: 'introduction',
      ichE3Section: '7',
      confidence: 0.95,
    };
  }
}
