

/**
 * usePDFIngestion Hook
 * 
 * React hook for ingesting PDFs into RAG
 * Can be used alongside DocumentUploadPanel to automatically
 * ingest uploaded PDFs for AI-powered authoring
 * 
 * @version 0.23.2
 */


import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { UploadResult } from '@/components/documents/DocumentUploadPanel';

// =============================================================================
// TYPES
// =============================================================================

export interface IngestionStatus {
  documentId: string;
  fileName: string;
  status: 'pending' | 'extracting' | 'ingesting' | 'complete' | 'error';
  progress: number;
  extraction?: {
    pageCount: number;
    textLength: number;
    tablesExtracted: number;
  };
  ingestion?: {
    chunksCreated: number;
  };
  error?: string;
}

export interface IngestionOptions {
  /** Document type for RAG metadata */
  documentType?: string;
  /** Product name for context */
  productName?: string;
  /** Study name for context */
  studyName?: string;
  /** Extract tables from PDFs */
  extractTables?: boolean;
  /** Extract figures from PDFs */
  extractFigures?: boolean;
  /** Use OCR for scanned documents */
  useOCR?: boolean;
  /** Maximum pages to process */
  maxPages?: number;
}

export interface UsePDFIngestionReturn {
  /** Current ingestion statuses by document ID */
  statuses: Record<string, IngestionStatus>;
  /** Whether any ingestion is in progress */
  isProcessing: boolean;
  /** Total files being processed */
  totalFiles: number;
  /** Files completed */
  completedFiles: number;
  /** Files with errors */
  errorFiles: number;
  /** Ingest a single uploaded PDF */
  ingestPDF: (uploadResult: UploadResult, options?: IngestionOptions) => Promise<void>;
  /** Ingest multiple uploaded PDFs */
  ingestPDFs: (uploadResults: UploadResult[], options?: IngestionOptions) => Promise<void>;
  /** Clear all statuses */
  clearStatuses: () => void;
  /** Clear status for a specific document */
  clearStatus: (documentId: string) => void;
  /** Retry a failed ingestion */
  retryIngestion: (documentId: string) => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePDFIngestion(): UsePDFIngestionReturn {
  const [statuses, setStatuses] = useState<Record<string, IngestionStatus>>({});
  const [pendingRetries, setPendingRetries] = useState<Map<string, { result: UploadResult; options?: IngestionOptions }>>(new Map());

  // Update status for a document
  const updateStatus = useCallback((documentId: string, update: Partial<IngestionStatus>) => {
    setStatuses(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        ...update,
      },
    }));
  }, []);

  // Ingest a single PDF
  const ingestPDF = useCallback(async (
    uploadResult: UploadResult,
    options?: IngestionOptions
  ): Promise<void> => {
    // Only process PDFs
    if (uploadResult.mimeType !== 'application/pdf') {
      logger.debug('PDFIngestion', ` Skipping non-PDF: ${uploadResult.fileName}`);
      return;
    }

    const documentId = uploadResult.fileId;
    
    // Store for potential retry
    setPendingRetries(prev => {
      const next = new Map(prev);
      next.set(documentId, { result: uploadResult, options });
      return next;
    });

    // Initialize status
    setStatuses(prev => ({
      ...prev,
      [documentId]: {
        documentId,
        fileName: uploadResult.fileName,
        status: 'pending',
        progress: 0,
      },
    }));

    try {
      // Build form data for API
      const formData = new FormData();
      
      // Fetch the file from storage
      // In a real implementation, this would get the file buffer
      // For now, we'll call the API with metadata
      formData.append('documentId', documentId);
      formData.append('title', uploadResult.fileName.replace(/\.pdf$/i, ''));
      formData.append('documentType', options?.documentType || 'document');
      
      if (options?.productName) formData.append('productName', options.productName);
      if (options?.studyName) formData.append('studyName', options.studyName);
      if (options?.extractTables !== undefined) formData.append('extractTables', String(options.extractTables));
      if (options?.extractFigures !== undefined) formData.append('extractFigures', String(options.extractFigures));
      if (options?.useOCR !== undefined) formData.append('useOCR', String(options.useOCR));
      if (options?.maxPages !== undefined) formData.append('maxPages', String(options.maxPages));

      // Update status to extracting
      updateStatus(documentId, {
        status: 'extracting',
        progress: 25,
      });

      // Note: In production, you'd need to either:
      // 1. Re-upload the file from client storage
      // 2. Have the server fetch from cloud storage using filePath
      // 3. Use a queue system where files are processed server-side
      
      // For demo purposes, we'll simulate the pipeline
      // In production, replace with actual API call:
      /*
      const response = await fetch('/api/documents/ingest', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      */

      // Simulated processing (replace with real API call)
      await simulateIngestion(documentId, uploadResult.fileName, updateStatus);

      // Mark complete
      updateStatus(documentId, {
        status: 'complete',
        progress: 100,
      });

      logger.debug('PDFIngestion', ` Completed: ${uploadResult.fileName}`);

    } catch (error) {
      logger.error('PDFIngestion', ` Error processing ${uploadResult.fileName}:`, error);
      updateStatus(documentId, {
        status: 'error',
        error: (error as Error).message,
        progress: 0,
      });
    }
  }, [updateStatus]);

  // Ingest multiple PDFs
  const ingestPDFs = useCallback(async (
    uploadResults: UploadResult[],
    options?: IngestionOptions
  ): Promise<void> => {
    const pdfResults = uploadResults.filter(r => r.mimeType === 'application/pdf');
    
    logger.debug('PDFIngestion', ` Processing ${pdfResults.length} PDFs`);
    
    // Process sequentially to avoid overwhelming the API
    for (const result of pdfResults) {
      await ingestPDF(result, options);
    }
  }, [ingestPDF]);

  // Clear all statuses
  const clearStatuses = useCallback(() => {
    setStatuses({});
    setPendingRetries(new Map());
  }, []);

  // Clear specific status
  const clearStatus = useCallback((documentId: string) => {
    setStatuses(prev => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
    setPendingRetries(prev => {
      const next = new Map(prev);
      next.delete(documentId);
      return next;
    });
  }, []);

  // Retry failed ingestion
  const retryIngestion = useCallback(async (documentId: string) => {
    const pending = pendingRetries.get(documentId);
    if (pending) {
      await ingestPDF(pending.result, pending.options);
    }
  }, [pendingRetries, ingestPDF]);

  // Computed values
  const statusList = Object.values(statuses);
  const isProcessing = statusList.some(s => 
    s.status === 'pending' || s.status === 'extracting' || s.status === 'ingesting'
  );
  const totalFiles = statusList.length;
  const completedFiles = statusList.filter(s => s.status === 'complete').length;
  const errorFiles = statusList.filter(s => s.status === 'error').length;

  return {
    statuses,
    isProcessing,
    totalFiles,
    completedFiles,
    errorFiles,
    ingestPDF,
    ingestPDFs,
    clearStatuses,
    clearStatus,
    retryIngestion,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Simulated ingestion for demo
 * Replace with actual API call in production
 */
async function simulateIngestion(
  documentId: string,
  fileName: string,
  updateStatus: (id: string, update: Partial<IngestionStatus>) => void
): Promise<void> {
  // Simulate extraction phase
  await delay(800);
  updateStatus(documentId, {
    status: 'extracting',
    progress: 50,
    extraction: {
      pageCount: Math.floor(Math.random() * 50) + 5,
      textLength: Math.floor(Math.random() * 50000) + 10000,
      tablesExtracted: Math.floor(Math.random() * 10),
    },
  });

  // Simulate ingestion phase
  await delay(600);
  updateStatus(documentId, {
    status: 'ingesting',
    progress: 75,
  });

  // Complete
  await delay(400);
  updateStatus(documentId, {
    status: 'complete',
    progress: 100,
    ingestion: {
      chunksCreated: Math.floor(Math.random() * 30) + 10,
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// COMPONENT: Ingestion Status Display
// =============================================================================

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, FileText, RefreshCw } from 'lucide-react';

export interface PDFIngestionStatusProps {
  statuses: Record<string, IngestionStatus>;
  onRetry?: (documentId: string) => void;
  onClear?: (documentId: string) => void;
}

export function PDFIngestionStatus({ 
  statuses, 
  onRetry, 
  onClear 
}: PDFIngestionStatusProps) {
  const statusList = Object.values(statuses);
  
  if (statusList.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        RAG Ingestion Status
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {statusList.map(status => (
          <div 
            key={status.documentId}
            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {status.status === 'complete' && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              {status.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              {(status.status === 'extracting' || status.status === 'ingesting' || status.status === 'pending') && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              )}
              
              <span className="truncate text-slate-700 dark:text-slate-300">
                {status.fileName}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {status.status === 'complete' && status.ingestion && (
                <span className="text-xs text-slate-500">
                  {status.ingestion.chunksCreated} chunks
                </span>
              )}
              
              {status.status === 'error' && onRetry && (
                <button
                  onClick={() => onRetry(status.documentId)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  title="Retry"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              
              {(status.status === 'complete' || status.status === 'error') && onClear && (
                <button
                  onClick={() => onClear(status.documentId)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
                  title="Dismiss"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default usePDFIngestion;
