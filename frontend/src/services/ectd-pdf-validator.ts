
/**
 * eCTD PDF Validation Service
 * 
 * Validates PDFs for eCTD compliance including:
 * - PDF/A compliance
 * - Font embedding
 * - Page size and margins
 * - Bookmarks structure
 * - Text searchability
 * - Regional requirements (FDA, EMA, HC, PMDA)
 */

// Validation rule severity
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Regional specifications
export type RegionalSpec = 'FDA' | 'EMA' | 'HC' | 'PMDA' | 'TGA' | 'ANVISA' | 'ICH';

// PDF validation result
export interface PDFValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: string;
  rule: string;
  message: string;
  details?: string;
  page?: number;
  location?: string;
  autoFixable: boolean;
  fixSuggestion?: string;
}

export interface PDFValidationResult {
  documentId: string;
  documentName: string;
  isValid: boolean;
  score: number; // 0-100
  issues: PDFValidationIssue[];
  metadata: PDFMetadata;
  validatedAt: Date;
  validatedAgainst: RegionalSpec[];
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pdfVersion: string;
  pageCount: number;
  fileSize: number;
  isEncrypted: boolean;
  isPDFA: boolean;
  pdfaConformance?: string;
  hasBookmarks: boolean;
  bookmarkCount: number;
  isTagged: boolean;
  isLinearized: boolean;
}

export interface FontInfo {
  name: string;
  type: 'Type1' | 'TrueType' | 'OpenType' | 'CID' | 'Unknown';
  isEmbedded: boolean;
  isSubset: boolean;
  encoding?: string;
  usedOnPages: number[];
}

export interface PageInfo {
  pageNumber: number;
  width: number;  // in points (72 points = 1 inch)
  height: number;
  orientation: 'portrait' | 'landscape';
  hasText: boolean;
  isScanned: boolean;
  rotation: number;
}

export interface BookmarkInfo {
  title: string;
  level: number;
  pageNumber?: number;
  children: BookmarkInfo[];
}

// Regional validation rules
interface ValidationRule {
  id: string;
  category: string;
  severity: ValidationSeverity;
  regions: RegionalSpec[];
  check: (metadata: PDFMetadata, fonts: FontInfo[], pages: PageInfo[], bookmarks: BookmarkInfo[]) => PDFValidationIssue | null;
}

// Validation rules database
const VALIDATION_RULES: ValidationRule[] = [
  // PDF Version Rules
  {
    id: 'PDF-001',
    category: 'PDF Version',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'],
    check: (meta) => {
      const version = parseFloat(meta.pdfVersion);
      if (version < 1.4 || version > 1.7) {
        return {
          id: 'PDF-001',
          severity: 'error',
          category: 'PDF Version',
          rule: 'PDF version must be 1.4-1.7',
          message: `PDF version ${meta.pdfVersion} is not compliant`,
          details: 'eCTD requires PDF version 1.4, 1.5, 1.6, or 1.7',
          autoFixable: false,
          fixSuggestion: 'Re-export the document as PDF 1.4-1.7',
        };
      }
      return null;
    },
  },
  
  // Font Embedding Rules
  {
    id: 'FONT-001',
    category: 'Fonts',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'],
    check: (meta, fonts) => {
      const unembeddedFonts = fonts.filter(f => !f.isEmbedded);
      if (unembeddedFonts.length > 0) {
        return {
          id: 'FONT-001',
          severity: 'error',
          category: 'Fonts',
          rule: 'All fonts must be embedded',
          message: `${unembeddedFonts.length} font(s) not embedded`,
          details: `Unembedded fonts: ${unembeddedFonts.map(f => f.name).join(', ')}`,
          autoFixable: true,
          fixSuggestion: 'Embed all fonts when exporting to PDF',
        };
      }
      return null;
    },
  },
  {
    id: 'FONT-002',
    category: 'Fonts',
    severity: 'warning',
    regions: ['FDA', 'EMA'],
    check: (meta, fonts) => {
      const nonSubsetFonts = fonts.filter(f => f.isEmbedded && !f.isSubset);
      if (nonSubsetFonts.length > 0 && meta.fileSize > 10 * 1024 * 1024) {
        return {
          id: 'FONT-002',
          severity: 'warning',
          category: 'Fonts',
          rule: 'Font subsetting recommended for large files',
          message: `${nonSubsetFonts.length} font(s) fully embedded (not subset)`,
          details: 'Consider font subsetting to reduce file size',
          autoFixable: true,
          fixSuggestion: 'Enable font subsetting when exporting to PDF',
        };
      }
      return null;
    },
  },

  // Page Size Rules
  {
    id: 'PAGE-001',
    category: 'Page Size',
    severity: 'error',
    regions: ['FDA'],
    check: (meta, fonts, pages) => {
      // FDA: Letter size (8.5 x 11 inches = 612 x 792 points) or A4
      const invalidPages = pages.filter(p => {
        const isLetter = Math.abs(p.width - 612) < 2 && Math.abs(p.height - 792) < 2;
        const isA4 = Math.abs(p.width - 595) < 2 && Math.abs(p.height - 842) < 2;
        const isLetterLandscape = Math.abs(p.width - 792) < 2 && Math.abs(p.height - 612) < 2;
        const isA4Landscape = Math.abs(p.width - 842) < 2 && Math.abs(p.height - 595) < 2;
        return !(isLetter || isA4 || isLetterLandscape || isA4Landscape);
      });

      if (invalidPages.length > 0) {
        return {
          id: 'PAGE-001',
          severity: 'error',
          category: 'Page Size',
          rule: 'Page size must be Letter or A4',
          message: `${invalidPages.length} page(s) have non-standard size`,
          details: `Pages: ${invalidPages.map(p => p.pageNumber).join(', ')}`,
          page: invalidPages[0]?.pageNumber,
          autoFixable: false,
          fixSuggestion: 'Resize pages to Letter (8.5x11") or A4',
        };
      }
      return null;
    },
  },
  {
    id: 'PAGE-002',
    category: 'Page Size',
    severity: 'error',
    regions: ['EMA', 'HC'],
    check: (meta, fonts, pages) => {
      // EMA/HC: A4 preferred (595 x 842 points)
      const nonA4Pages = pages.filter(p => {
        const isA4 = Math.abs(p.width - 595) < 2 && Math.abs(p.height - 842) < 2;
        const isA4Landscape = Math.abs(p.width - 842) < 2 && Math.abs(p.height - 595) < 2;
        return !(isA4 || isA4Landscape);
      });

      if (nonA4Pages.length > 0) {
        return {
          id: 'PAGE-002',
          severity: 'warning',
          category: 'Page Size',
          rule: 'A4 page size preferred',
          message: `${nonA4Pages.length} page(s) are not A4 size`,
          details: `Pages: ${nonA4Pages.map(p => p.pageNumber).slice(0, 10).join(', ')}${nonA4Pages.length > 10 ? '...' : ''}`,
          autoFixable: false,
          fixSuggestion: 'Consider using A4 page size for EMA submissions',
        };
      }
      return null;
    },
  },

  // Bookmark Rules
  {
    id: 'BOOK-001',
    category: 'Bookmarks',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'],
    check: (meta) => {
      if (meta.pageCount > 5 && !meta.hasBookmarks) {
        return {
          id: 'BOOK-001',
          severity: 'error',
          category: 'Bookmarks',
          rule: 'Documents over 5 pages must have bookmarks',
          message: 'No bookmarks found in multi-page document',
          details: `Document has ${meta.pageCount} pages but no bookmarks`,
          autoFixable: false,
          fixSuggestion: 'Add bookmarks based on document headings',
        };
      }
      return null;
    },
  },
  {
    id: 'BOOK-002',
    category: 'Bookmarks',
    severity: 'warning',
    regions: ['FDA', 'EMA'],
    check: (meta, fonts, pages, bookmarks) => {
      // Check for overly deep bookmark hierarchy
      const maxDepth = getMaxBookmarkDepth(bookmarks);
      if (maxDepth > 6) {
        return {
          id: 'BOOK-002',
          severity: 'warning',
          category: 'Bookmarks',
          rule: 'Bookmark hierarchy should not exceed 6 levels',
          message: `Bookmark hierarchy is ${maxDepth} levels deep`,
          details: 'Deep hierarchies may cause navigation issues',
          autoFixable: false,
          fixSuggestion: 'Consider flattening bookmark structure',
        };
      }
      return null;
    },
  },
  {
    id: 'BOOK-003',
    category: 'Bookmarks',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA'],
    check: (meta, fonts, pages, bookmarks) => {
      // Check for bookmarks without destinations
      const orphanedBookmarks = findOrphanedBookmarks(bookmarks);
      if (orphanedBookmarks.length > 0) {
        return {
          id: 'BOOK-003',
          severity: 'error',
          category: 'Bookmarks',
          rule: 'All bookmarks must have valid destinations',
          message: `${orphanedBookmarks.length} bookmark(s) without valid destination`,
          details: `Orphaned: ${orphanedBookmarks.slice(0, 5).join(', ')}${orphanedBookmarks.length > 5 ? '...' : ''}`,
          autoFixable: false,
          fixSuggestion: 'Fix bookmark destinations to point to valid pages',
        };
      }
      return null;
    },
  },

  // Security Rules
  {
    id: 'SEC-001',
    category: 'Security',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'],
    check: (meta) => {
      if (meta.isEncrypted) {
        return {
          id: 'SEC-001',
          severity: 'error',
          category: 'Security',
          rule: 'PDF must not be encrypted',
          message: 'Document is encrypted/password protected',
          details: 'eCTD documents must be unencrypted for regulatory review',
          autoFixable: false,
          fixSuggestion: 'Remove encryption and password protection',
        };
      }
      return null;
    },
  },

  // Text Searchability Rules
  {
    id: 'TEXT-001',
    category: 'Text',
    severity: 'error',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'],
    check: (meta, fonts, pages) => {
      const scannedPages = pages.filter(p => p.isScanned || !p.hasText);
      if (scannedPages.length > 0 && scannedPages.length === pages.length) {
        return {
          id: 'TEXT-001',
          severity: 'error',
          category: 'Text',
          rule: 'Document must contain searchable text',
          message: 'Document appears to be scanned/image-only',
          details: 'No searchable text found - document may be a scanned image',
          autoFixable: true,
          fixSuggestion: 'Apply OCR to make text searchable',
        };
      }
      return null;
    },
  },
  {
    id: 'TEXT-002',
    category: 'Text',
    severity: 'warning',
    regions: ['FDA', 'EMA'],
    check: (meta, fonts, pages) => {
      const scannedPages = pages.filter(p => p.isScanned);
      if (scannedPages.length > 0 && scannedPages.length < pages.length) {
        return {
          id: 'TEXT-002',
          severity: 'warning',
          category: 'Text',
          rule: 'Mixed content detected',
          message: `${scannedPages.length} page(s) appear to be scanned`,
          details: `Scanned pages: ${scannedPages.map(p => p.pageNumber).slice(0, 10).join(', ')}`,
          page: scannedPages[0]?.pageNumber,
          autoFixable: true,
          fixSuggestion: 'Apply OCR to scanned pages',
        };
      }
      return null;
    },
  },

  // File Size Rules
  {
    id: 'SIZE-001',
    category: 'File Size',
    severity: 'error',
    regions: ['FDA'],
    check: (meta) => {
      const maxSize = 100 * 1024 * 1024; // 100 MB
      if (meta.fileSize > maxSize) {
        return {
          id: 'SIZE-001',
          severity: 'error',
          category: 'File Size',
          rule: 'File size must not exceed 100 MB',
          message: `File size (${(meta.fileSize / 1024 / 1024).toFixed(1)} MB) exceeds limit`,
          details: 'FDA eCTD limit is 100 MB per PDF',
          autoFixable: false,
          fixSuggestion: 'Split document or reduce image quality',
        };
      }
      return null;
    },
  },
  {
    id: 'SIZE-002',
    category: 'File Size',
    severity: 'warning',
    regions: ['FDA', 'EMA'],
    check: (meta) => {
      const warningSize = 50 * 1024 * 1024; // 50 MB
      if (meta.fileSize > warningSize) {
        return {
          id: 'SIZE-002',
          severity: 'warning',
          category: 'File Size',
          rule: 'Large file size detected',
          message: `File size (${(meta.fileSize / 1024 / 1024).toFixed(1)} MB) is large`,
          details: 'Consider optimizing for faster gateway processing',
          autoFixable: true,
          fixSuggestion: 'Optimize images and remove unnecessary content',
        };
      }
      return null;
    },
  },

  // PDF/A Compliance
  {
    id: 'PDFA-001',
    category: 'PDF/A',
    severity: 'info',
    regions: ['EMA'],
    check: (meta) => {
      if (!meta.isPDFA) {
        return {
          id: 'PDFA-001',
          severity: 'info',
          category: 'PDF/A',
          rule: 'PDF/A compliance recommended',
          message: 'Document is not PDF/A compliant',
          details: 'PDF/A ensures long-term archival compatibility',
          autoFixable: true,
          fixSuggestion: 'Convert to PDF/A-1b or PDF/A-2b format',
        };
      }
      return null;
    },
  },

  // Linearization (Fast Web View)
  {
    id: 'OPT-001',
    category: 'Optimization',
    severity: 'info',
    regions: ['FDA', 'EMA'],
    check: (meta) => {
      if (!meta.isLinearized && meta.fileSize > 5 * 1024 * 1024) {
        return {
          id: 'OPT-001',
          severity: 'info',
          category: 'Optimization',
          rule: 'Linearization recommended for large files',
          message: 'Document is not optimized for fast web view',
          details: 'Linearization enables incremental loading',
          autoFixable: true,
          fixSuggestion: 'Enable "Fast Web View" when saving PDF',
        };
      }
      return null;
    },
  },
];

// Helper functions
function getMaxBookmarkDepth(bookmarks: BookmarkInfo[], currentDepth = 1): number {
  if (bookmarks.length === 0) return 0;
  
  let maxDepth = currentDepth;
  for (const bookmark of bookmarks) {
    if (bookmark.children.length > 0) {
      const childDepth = getMaxBookmarkDepth(bookmark.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }
  return maxDepth;
}

function findOrphanedBookmarks(bookmarks: BookmarkInfo[]): string[] {
  const orphaned: string[] = [];
  
  function traverse(bms: BookmarkInfo[]) {
    for (const bm of bms) {
      if (bm.pageNumber === undefined || bm.pageNumber < 1) {
        orphaned.push(bm.title);
      }
      if (bm.children.length > 0) {
        traverse(bm.children);
      }
    }
  }
  
  traverse(bookmarks);
  return orphaned;
}

class ECTDPDFValidator {
  private validationResults: Map<string, PDFValidationResult> = new Map();

  /**
   * Validate a PDF document against eCTD specifications
   */
  async validateDocument(
    documentId: string,
    documentName: string,
    pdfData: ArrayBuffer | { metadata: PDFMetadata; fonts: FontInfo[]; pages: PageInfo[]; bookmarks: BookmarkInfo[] },
    regions: RegionalSpec[] = ['FDA', 'ICH']
  ): Promise<PDFValidationResult> {
    // In real implementation, would parse PDF to extract metadata
    // For now, accept either raw data or pre-extracted info
    let metadata: PDFMetadata;
    let fonts: FontInfo[];
    let pages: PageInfo[];
    let bookmarks: BookmarkInfo[];

    if (pdfData instanceof ArrayBuffer) {
      // Simulate PDF parsing
      const parsed = this.simulatePDFParse(pdfData, documentName);
      metadata = parsed.metadata;
      fonts = parsed.fonts;
      pages = parsed.pages;
      bookmarks = parsed.bookmarks;
    } else {
      metadata = pdfData.metadata;
      fonts = pdfData.fonts;
      pages = pdfData.pages;
      bookmarks = pdfData.bookmarks;
    }

    // Run validation rules
    const issues: PDFValidationIssue[] = [];
    
    for (const rule of VALIDATION_RULES) {
      // Skip rules not applicable to selected regions
      if (!rule.regions.some(r => regions.includes(r))) {
        continue;
      }

      const issue = rule.check(metadata, fonts, pages, bookmarks);
      if (issue) {
        issues.push(issue);
      }
    }

    // Calculate score
    const score = this.calculateScore(issues);

    const result: PDFValidationResult = {
      documentId,
      documentName,
      isValid: !issues.some(i => i.severity === 'error'),
      score,
      issues,
      metadata,
      validatedAt: new Date(),
      validatedAgainst: regions,
    };

    this.validationResults.set(documentId, result);
    return result;
  }

  /**
   * Validate multiple documents (batch validation)
   */
  async validateBatch(
    documents: Array<{ id: string; name: string; data: ArrayBuffer }>,
    regions: RegionalSpec[] = ['FDA', 'ICH'],
    onProgress?: (current: number, total: number) => void
  ): Promise<PDFValidationResult[]> {
    const results: PDFValidationResult[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const result = await this.validateDocument(doc.id, doc.name, doc.data, regions);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, documents.length);
      }
    }

    return results;
  }

  /**
   * Get validation summary for a submission
   */
  getValidationSummary(): {
    totalDocuments: number;
    validDocuments: number;
    invalidDocuments: number;
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    averageScore: number;
    issuesByCategory: Record<string, number>;
  } {
    const results = Array.from(this.validationResults.values());
    const allIssues = results.flatMap(r => r.issues);

    const issuesByCategory: Record<string, number> = {};
    for (const issue of allIssues) {
      issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
    }

    return {
      totalDocuments: results.length,
      validDocuments: results.filter(r => r.isValid).length,
      invalidDocuments: results.filter(r => !r.isValid).length,
      totalIssues: allIssues.length,
      errorCount: allIssues.filter(i => i.severity === 'error').length,
      warningCount: allIssues.filter(i => i.severity === 'warning').length,
      infoCount: allIssues.filter(i => i.severity === 'info').length,
      averageScore: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0,
      issuesByCategory,
    };
  }

  /**
   * Get cached validation result
   */
  getValidationResult(documentId: string): PDFValidationResult | undefined {
    return this.validationResults.get(documentId);
  }

  /**
   * Get all validation results
   */
  getAllResults(): PDFValidationResult[] {
    return Array.from(this.validationResults.values());
  }

  /**
   * Get auto-fixable issues
   */
  getAutoFixableIssues(documentId?: string): PDFValidationIssue[] {
    const results = documentId
      ? [this.validationResults.get(documentId)].filter(Boolean) as PDFValidationResult[]
      : Array.from(this.validationResults.values());

    return results.flatMap(r => r.issues.filter(i => i.autoFixable));
  }

  /**
   * Clear validation cache
   */
  clearCache(documentId?: string): void {
    if (documentId) {
      this.validationResults.delete(documentId);
    } else {
      this.validationResults.clear();
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateScore(issues: PDFValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Simulate PDF parsing (in real impl would use pdf.js or similar)
   */
  private simulatePDFParse(data: ArrayBuffer, documentName: string): {
    metadata: PDFMetadata;
    fonts: FontInfo[];
    pages: PageInfo[];
    bookmarks: BookmarkInfo[];
  } {
    // Simulate realistic PDF metadata based on file size
    const fileSize = data.byteLength || 1024 * 1024; // Default 1MB
    const pageCount = Math.max(1, Math.floor(fileSize / 50000)); // ~50KB per page estimate

    const metadata: PDFMetadata = {
      title: documentName.replace('.pdf', ''),
      pdfVersion: '1.6',
      pageCount,
      fileSize,
      isEncrypted: false,
      isPDFA: Math.random() > 0.5,
      pdfaConformance: Math.random() > 0.5 ? 'PDF/A-1b' : undefined,
      hasBookmarks: pageCount > 5 ? Math.random() > 0.3 : false,
      bookmarkCount: pageCount > 5 ? Math.floor(pageCount / 3) : 0,
      isTagged: Math.random() > 0.5,
      isLinearized: Math.random() > 0.5,
    };

    // Simulate fonts
    const fonts: FontInfo[] = [
      { name: 'Arial', type: 'TrueType', isEmbedded: true, isSubset: true, usedOnPages: [1, 2, 3] },
      { name: 'Times New Roman', type: 'TrueType', isEmbedded: true, isSubset: true, usedOnPages: [1, 2] },
      { name: 'Calibri', type: 'TrueType', isEmbedded: Math.random() > 0.2, isSubset: true, usedOnPages: [1] },
    ];

    // Simulate pages
    const pages: PageInfo[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      width: 612, // Letter width
      height: 792, // Letter height
      orientation: 'portrait' as const,
      hasText: Math.random() > 0.1,
      isScanned: Math.random() < 0.05,
      rotation: 0,
    }));

    // Simulate bookmarks
    const bookmarks: BookmarkInfo[] = metadata.hasBookmarks
      ? this.generateSimulatedBookmarks(pageCount)
      : [];

    return { metadata, fonts, pages, bookmarks };
  }

  private generateSimulatedBookmarks(pageCount: number): BookmarkInfo[] {
    const bookmarks: BookmarkInfo[] = [];
    const sectionsPerLevel = 3;

    for (let i = 1; i <= Math.min(sectionsPerLevel, pageCount); i++) {
      const section: BookmarkInfo = {
        title: `Section ${i}`,
        level: 1,
        pageNumber: Math.ceil((i / sectionsPerLevel) * pageCount * 0.3),
        children: [],
      };

      // Add subsections
      for (let j = 1; j <= 2; j++) {
        section.children.push({
          title: `Section ${i}.${j}`,
          level: 2,
          pageNumber: section.pageNumber! + j,
          children: [],
        });
      }

      bookmarks.push(section);
    }

    return bookmarks;
  }
}

// Export singleton instance
export const ectdPDFValidator = new ECTDPDFValidator();

// Export types and class for testing
export { ECTDPDFValidator, VALIDATION_RULES };
