
// =============================================================================
// Mock PDF Extraction Service
// =============================================================================
// Mock implementation for demo/testing purposes
// =============================================================================

import type { 
  IPDFExtractionService,
  ExtractedDocument,
  PageText,
  ExtractedTable,
  ExtractedFigure,
  DetectedSection,
  PDFExtractionOptions,
  ExtractionQuality,
  PDFExtractionHealthStatus,
} from '@/types/pdf-extraction';

export class MockPDFExtractionService implements IPDFExtractionService {
  async extractDocument(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedDocument> {
    const size = file instanceof File ? file.size : (file as ArrayBuffer).byteLength || 0;
    const filename = file instanceof File ? file.name : 'document.pdf';
    
    // Return a minimal mock that satisfies the interface
    return {
      id: `doc-${Date.now()}`,
      filename,
      mimeType: 'application/pdf',
      fileSize: size,
      pageCount: 1,
      pages: [],
      text: [{ pageNumber: 1, text: 'Mock extracted text content', tokenCount: 5 }],
      tables: [],
      figures: [],
      sections: [],
      metadata: {} as any,
      extractionMethod: 'native',
      processingTimeMs: 100,
      extractedAt: new Date().toISOString(),
      quality: { overallScore: 0.95, textQuality: 0.95, tableQuality: 0.9, figureQuality: 0.9, structureQuality: 0.9, issues: [], recommendations: [] },
    };
  }

  async extractText(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<PageText[]> {
    return [{ pageNumber: 1, text: 'Mock extracted text content', tokenCount: 5 }];
  }

  async extractTables(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedTable[]> {
    return [];
  }

  async extractFigures(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedFigure[]> {
    return [];
  }

  async detectSections(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<DetectedSection[]> {
    return [];
  }

  async extractPage(
    file: File | Buffer | ArrayBuffer,
    pageNumber: number,
    options?: PDFExtractionOptions
  ): Promise<any> {
    return { pageNumber, text: 'Mock page content', textBlocks: [], tables: [], figures: [] };
  }

  async extractMetadata(file: File | Buffer | ArrayBuffer): Promise<any> {
    return {};
  }

  async assessQuality(file: File | Buffer | ArrayBuffer): Promise<ExtractionQuality> {
    return { 
      overallScore: 0.95, 
      textQuality: 0.95,
      tableQuality: 0.90,
      figureQuality: 0.88,
      structureQuality: 0.95,
      issues: [], 
      recommendations: [] 
    };
  }

  async healthCheck(): Promise<PDFExtractionHealthStatus> {
    return { 
      healthy: true, 
      nativeExtractionAvailable: true,
      ocrAvailable: true,
      visionApiAvailable: true,
      textractAvailable: false,
      avgExtractionTimeMs: 150,
      avgPagesPerSecond: 3.5,
      maxFileSizeMb: 50,
      maxPageCount: 500,
    };
  }
}
