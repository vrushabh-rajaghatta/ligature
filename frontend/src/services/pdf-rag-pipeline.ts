
/**
 * PDF to RAG Ingestion Pipeline
 * 
 * End-to-end pipeline that:
 * 1. Extracts content from uploaded PDFs
 * 2. Processes and chunks the content
 * 3. Ingests into RAG for semantic search
 * 4. Returns extraction + ingestion results
 * 
 * @version 0.23.2
 */

import { aiServices } from '@/services/AIServiceContainer';
import { logger } from '@/lib/logger';
import type { IPDFExtractionService, PageText } from '@/types/pdf-extraction';
import type { SourceDocument } from '@/store/useAuthoringStore';

// =============================================================================
// TYPES
// =============================================================================

export interface PDFIngestionOptions {
  /** Document ID for RAG storage */
  documentId: string;
  /** Document title for metadata */
  title: string;
  /** Document type (csr, protocol, ib, etc.) */
  documentType?: string;
  /** Version string */
  version?: string;
  /** Extract tables from PDF */
  extractTables?: boolean;
  /** Extract figures from PDF */
  extractFigures?: boolean;
  /** Use OCR for scanned documents */
  useOCR?: boolean;
  /** Maximum pages to process (default: all) */
  maxPages?: number;
  /** Product name for context */
  productName?: string;
  /** Study name for context */
  studyName?: string;
  /** Skip RAG ingestion (extraction only) */
  skipIngestion?: boolean;
}

export interface PDFIngestionResult {
  success: boolean;
  documentId: string;
  
  /** PDF extraction results */
  extraction: {
    success: boolean;
    pageCount: number;
    textLength: number;
    tablesExtracted: number;
    figuresExtracted: number;
    sectionsDetected: number;
    processingTimeMs: number;
    error?: string;
  };
  
  /** RAG ingestion results */
  ingestion: {
    success: boolean;
    chunksCreated: number;
    tokensProcessed: number;
    error?: string;
  };
  
  /** Extracted content for immediate use */
  content?: {
    fullText: string;
    sections: Array<{
      title: string;
      content: string;
      pageStart: number;
    }>;
    tables: Array<{
      title: string;
      data: string[][];
      page: number;
    }>;
  };
  
  /** Processing metadata */
  metadata: {
    startedAt: Date;
    completedAt: Date;
    totalTimeMs: number;
    pdfServiceMode: string;
    ragServiceMode: string;
  };
}

export interface BatchIngestionResult {
  totalFiles: number;
  successful: number;
  failed: number;
  results: PDFIngestionResult[];
  errors: Array<{ documentId: string; error: string }>;
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Process a PDF file and ingest into RAG
 * This is the main entry point for the pipeline
 */
export async function processPDFForRAG(
  pdfBuffer: Buffer | ArrayBuffer,
  options: PDFIngestionOptions
): Promise<PDFIngestionResult> {
  const startedAt = new Date();
  const {
    documentId,
    title,
    documentType = 'document',
    version = '1.0',
    extractTables = true,
    extractFigures = false,
    useOCR = false,
    maxPages,
    productName,
    studyName,
    skipIngestion = false,
  } = options;

  // Initialize result structure
  const result: PDFIngestionResult = {
    success: false,
    documentId,
    extraction: {
      success: false,
      pageCount: 0,
      textLength: 0,
      tablesExtracted: 0,
      figuresExtracted: 0,
      sectionsDetected: 0,
      processingTimeMs: 0,
    },
    ingestion: {
      success: false,
      chunksCreated: 0,
      tokensProcessed: 0,
    },
    metadata: {
      startedAt,
      completedAt: new Date(),
      totalTimeMs: 0,
      pdfServiceMode: 'unknown',
      ragServiceMode: 'unknown',
    },
  };

  try {
    // Step 1: Get PDF extraction service
    const pdfService = await aiServices.pdfExtraction();
    result.metadata.pdfServiceMode = aiServices.getProvider();

    // Step 2: Extract content from PDF
    logger.debug('PDF-RAG', ` Starting extraction for ${documentId}`);
    const extractionStart = Date.now();
    
    const extractionResult = await pdfService.extractDocument(
      pdfBuffer instanceof ArrayBuffer ? Buffer.from(pdfBuffer) : pdfBuffer,
      {
        extractTables,
        extractFigures,
        enableOcr: useOCR,
        pageEnd: maxPages,
      }
    );

    result.extraction = {
      success: true,
      pageCount: extractionResult.pageCount || 0,
      textLength: Array.isArray(extractionResult.text) 
        ? extractionResult.text.reduce((sum, p) => sum + (p.text?.length || 0), 0) 
        : 0,
      tablesExtracted: extractionResult.tables?.length || 0,
      figuresExtracted: extractionResult.figures?.length || 0,
      sectionsDetected: extractionResult.sections?.length || 0,
      processingTimeMs: Date.now() - extractionStart,
    };

    // Build content for immediate use
    const fullText = Array.isArray(extractionResult.text)
      ? extractionResult.text.map(p => p.text).join('\n\n')
      : '';
    
    result.content = {
      fullText,
      sections: (extractionResult.sections || []).map(s => ({
        title: s.title || 'Untitled Section',
        content: '', // DetectedSection uses textStart/textEnd offsets, not content
        pageStart: s.pageStart || 1,
      })),
      tables: (extractionResult.tables || []).map(t => ({
        title: t.title || 'Table',
        data: t.dataRows || [],
        page: t.pageNumber || 1,
      })),
    };

    logger.debug('PDF-RAG', ` Extraction complete: ${result.extraction.pageCount} pages, ${result.extraction.textLength} chars`);

    // Step 3: Ingest into RAG (unless skipped)
    if (!skipIngestion && result.content.fullText.length > 0) {
      result.metadata.ragServiceMode = aiServices.getProvider();
      
      try {
        const ragService = await aiServices.rag();
        
        // Build metadata for RAG
        const ragMetadata: Record<string, string | number> = {
          title,
          documentType,
          version,
          pageCount: result.extraction.pageCount,
          tablesCount: result.extraction.tablesExtracted,
          sectionsCount: result.extraction.sectionsDetected,
        };
        
        if (productName) ragMetadata.productName = productName;
        if (studyName) ragMetadata.studyName = studyName;

        // Ingest the full text
        logger.debug('PDF-RAG', ` Starting RAG ingestion for ${documentId}`);
        const ingestionResult = await ragService.ingestDocument(
          documentId,
          result.content.fullText,
          ragMetadata
        );

        result.ingestion = {
          success: ingestionResult.status === 'completed',
          chunksCreated: ingestionResult.chunksCreated || 0,
          tokensProcessed: estimateTokens(result.content.fullText),
        };

        logger.debug('PDF-RAG', ` RAG ingestion complete: ${result.ingestion.chunksCreated} chunks`);

        // Also ingest tables as separate chunks for better retrieval
        if (extractTables && result.content.tables.length > 0) {
          await ingestTablesAsChunks(ragService, documentId, result.content.tables, ragMetadata);
        }

      } catch (ingestionError) {
        logger.error('PDF-RAG', 'RAG ingestion failed', ingestionError);
        result.ingestion.error = (ingestionError as Error).message;
      }
    } else if (skipIngestion) {
      result.ingestion.success = true; // Skipped is considered success
    }

    // Mark overall success
    result.success = result.extraction.success && (skipIngestion || result.ingestion.success);

  } catch (error) {
    logger.error('PDF-RAG', 'Pipeline error', error);
    result.extraction.error = (error as Error).message;
  }

  // Finalize timing
  result.metadata.completedAt = new Date();
  result.metadata.totalTimeMs = result.metadata.completedAt.getTime() - startedAt.getTime();

  return result;
}

/**
 * Process multiple PDFs in batch
 */
export async function processPDFBatchForRAG(
  files: Array<{
    buffer: Buffer | ArrayBuffer;
    options: PDFIngestionOptions;
  }>
): Promise<BatchIngestionResult> {
  const results: PDFIngestionResult[] = [];
  const errors: Array<{ documentId: string; error: string }> = [];
  
  for (const { buffer, options } of files) {
    try {
      const result = await processPDFForRAG(buffer, options);
      results.push(result);
      
      if (!result.success) {
        errors.push({
          documentId: options.documentId,
          error: result.extraction.error || result.ingestion.error || 'Unknown error',
        });
      }
    } catch (error) {
      errors.push({
        documentId: options.documentId,
        error: (error as Error).message,
      });
    }
  }

  return {
    totalFiles: files.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    errors,
  };
}

/**
 * Extract PDF and create a SourceDocument for authoring
 * Convenience wrapper that returns format suitable for authoring module
 */
export async function extractPDFAsSourceDocument(
  pdfBuffer: Buffer | ArrayBuffer,
  options: PDFIngestionOptions
): Promise<{ sourceDocument: SourceDocument; extractedText: string } | null> {
  const result = await processPDFForRAG(pdfBuffer, {
    ...options,
    skipIngestion: false, // Ensure it gets ingested
  });

  if (!result.success || !result.content) {
    logger.error('PDF-RAG', 'Failed to extract source document');
    return null;
  }

  // Build SourceDocument format for authoring
  const sourceDocument: SourceDocument = {
    id: options.documentId,
    title: options.title,
    type: mapDocumentType(options.documentType || 'document'),
    version: options.version || '1.0',
    status: 'available',
    sections: result.content.sections.map((s, idx) => ({
      id: `${options.documentId}-section-${idx}`,
      number: `${idx + 1}`,
      title: s.title,
      excerpt: s.content ? (s.content.slice(0, 500) + (s.content.length > 500 ? '...' : '')) : undefined,
    })),
  };

  return {
    sourceDocument,
    extractedText: result.content.fullText,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Ingest table data as separate chunks for better retrieval
 */
async function ingestTablesAsChunks(
  ragService: Awaited<ReturnType<typeof aiServices.rag>>,
  documentId: string,
  tables: Array<{ title: string; data: string[][]; page: number }>,
  baseMetadata: Record<string, string | number>
): Promise<void> {
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    
    // Convert table to text representation
    const tableText = formatTableAsText(table);
    
    if (tableText.length > 50) {
      try {
        await ragService.ingestDocument(
          `${documentId}-table-${i}`,
          tableText,
          {
            ...baseMetadata,
            contentType: 'table',
            tableIndex: i,
            tableTitle: table.title,
            sourcePage: table.page,
          }
        );
      } catch (error) {
        logger.warn('PDF-RAG', ` Failed to ingest table ${i}:`, error);
      }
    }
  }
}

/**
 * Format table data as searchable text
 */
function formatTableAsText(table: { title: string; data: string[][]; page: number }): string {
  const lines: string[] = [];
  
  // Add title
  if (table.title) {
    lines.push(`Table: ${table.title}`);
  }
  
  // Add header row if exists
  if (table.data.length > 0) {
    const headers = table.data[0];
    lines.push(`Columns: ${headers.join(', ')}`);
  }
  
  // Add data rows
  for (let i = 1; i < table.data.length; i++) {
    const row = table.data[i];
    const headers = table.data[0];
    
    // Format as "Column: Value" pairs for better searchability
    const rowParts = row.map((cell, j) => {
      const header = headers[j] || `Column ${j + 1}`;
      return `${header}: ${cell}`;
    });
    
    lines.push(rowParts.join('; '));
  }
  
  return lines.join('\n');
}

/**
 * Map document type string to SourceDocument type
 */
function mapDocumentType(docType: string): SourceDocument['type'] {
  const typeMap: Record<string, SourceDocument['type']> = {
    'csr': 'clinical-study-report',
    'clinical-study-report': 'clinical-study-report',
    'protocol': 'protocol',
    'ib': 'investigator-brochure',
    'investigator-brochure': 'investigator-brochure',
    'sap': 'statistical-analysis',
    'statistical-analysis-plan': 'statistical-analysis',
    'safety': 'safety-database',
    'safety-database': 'safety-database',
    'regulatory': 'regulatory-guidance',
    'guidance': 'regulatory-guidance',
    'literature': 'literature',
  };
  
  return typeMap[docType.toLowerCase()] || 'clinical-study-report';
}

/**
 * Estimate token count from text (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Check if a file is a supported PDF
 */
export function isPDFFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Get pipeline health status
 */
export async function getPipelineHealth(): Promise<{
  available: boolean;
  pdfExtraction: { available: boolean; mode: string };
  ragIngestion: { available: boolean; mode: string };
}> {
  const health = await aiServices.getHealth();
  
  return {
    available: health.services.pdfExtraction.available && health.services.rag.available,
    pdfExtraction: {
      available: health.services.pdfExtraction.available,
      mode: health.provider,
    },
    ragIngestion: {
      available: health.services.rag.available,
      mode: health.provider,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  processPDFForRAG,
  processPDFBatchForRAG,
  extractPDFAsSourceDocument,
  getPipelineHealth,
  isPDFFile,
};
