

/**
 * PDF Metadata Extraction Store
 * v0.9.17c - Zustand store for managing PDF metadata extraction and validation
 * 
 * Features:
 * - Automatic extraction of PDF metadata
 * - eCTD compliance validation
 * - Batch extraction with progress tracking
 * - Statistics and filtering
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  type PDFMetadataState,
  type PDFMetadataActions,
  type ExtractedPDFMetadata,
  type PDFMetadataFilters,
  type PDFMetadataStatistics,
  type BatchExtractionJob,
  type RegionalSpec,
  type ExtractionStatus,
  type ComplianceLevel,
  type ECTDComplianceIssue,
  type ECTDComplianceSummary,
  type ECTDComplianceCategory,
  type ExtractedFontInfo,
  type ExtractedImageInfo,
  type ExtractedPageInfo,
  type ExtractedBookmarkInfo,
  type FontAnalysisSummary,
  type ImageAnalysisSummary,
  type PageAnalysisSummary,
  type BookmarkAnalysisSummary,
  type AccessibilitySummary,
  type SecuritySummary,
  type PDFDocumentInfo,
  type PDFVersion,
  type PDFAConformance,
  type FontType,
  type ImageCompression,
  type ImageColorSpace,
  type StandardPageSize,
  type PageOrientation,
  DEFAULT_METADATA_FILTERS,
  generatePDFMetadataId,
  ECTD_VALIDATION_RULES,
} from './pdf-metadata-types';

// =============================================================================
// Initial State
// =============================================================================

const initialState: PDFMetadataState = {
  metadata: {},
  selectedMetadataId: null,
  filters: DEFAULT_METADATA_FILTERS,
  statistics: null,
  batchJobs: {},
  isLoading: false,
  error: null,
  defaultRegions: ['FDA', 'ICH'],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate MD5-like hash (simulation)
 */
function generateMD5Hash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 32; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

/**
 * Generate SHA-256-like hash (simulation)
 */
function generateSHA256Hash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

/**
 * Detect standard page size from dimensions
 */
function detectPageSize(width: number, height: number): StandardPageSize {
  const tolerance = 2;
  
  // Normalize to portrait for comparison
  const w = Math.min(width, height);
  const h = Math.max(width, height);
  
  if (Math.abs(w - 612) < tolerance && Math.abs(h - 792) < tolerance) return 'Letter';
  if (Math.abs(w - 595) < tolerance && Math.abs(h - 842) < tolerance) return 'A4';
  if (Math.abs(w - 612) < tolerance && Math.abs(h - 1008) < tolerance) return 'Legal';
  if (Math.abs(w - 792) < tolerance && Math.abs(h - 1224) < tolerance) return 'Tabloid';
  if (Math.abs(w - 842) < tolerance && Math.abs(h - 1190) < tolerance) return 'A3';
  
  return 'Custom';
}

/**
 * Detect page orientation
 */
function detectOrientation(width: number, height: number): PageOrientation {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Calculate overall compliance level from score
 */
function calculateComplianceLevel(score: number, hasErrors: boolean): ComplianceLevel {
  if (hasErrors) return 'non-compliant';
  if (score >= 95) return 'full';
  if (score >= 70) return 'partial';
  return 'non-compliant';
}

// =============================================================================
// Simulation Functions
// =============================================================================

/**
 * Simulate PDF metadata extraction
 * In production, this would use pdf.js or a server-side PDF parser
 */
function simulateMetadataExtraction(
  documentId: string,
  filename: string,
  fileSize: number,
  regions: RegionalSpec[]
): ExtractedPDFMetadata {
  const startTime = Date.now();
  
  // Estimate page count from file size
  const pageCount = Math.max(1, Math.floor(fileSize / 50000));
  
  // Generate simulated PDF version
  const pdfVersions: PDFVersion[] = ['1.4', '1.5', '1.6', '1.7'];
  const pdfVersion = pdfVersions[Math.floor(Math.random() * pdfVersions.length)];
  
  // Simulate PDF/A conformance
  const pdfaOptions: PDFAConformance[] = ['PDF/A-1b', 'PDF/A-2b', 'none', 'none'];
  const pdfaConformance = pdfaOptions[Math.floor(Math.random() * pdfaOptions.length)];
  
  // Generate document info
  const documentInfo: PDFDocumentInfo = {
    title: filename.replace('.pdf', ''),
    author: 'Regulatory Affairs',
    subject: 'eCTD Submission Document',
    keywords: ['eCTD', 'regulatory', 'submission'],
    creator: 'Microsoft Word',
    producer: 'Adobe PDF Library 15.0',
    creationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    modificationDate: new Date().toISOString(),
  };
  
  // Simulate fonts
  const fonts = simulateFonts(pageCount);
  const fontSummary = calculateFontSummary(fonts);
  
  // Simulate images
  const images = simulateImages(pageCount);
  const imageSummary = calculateImageSummary(images);
  
  // Simulate pages
  const pages = simulatePages(pageCount);
  const pageSummary = calculatePageSummary(pages);
  
  // Simulate bookmarks
  const bookmarks = pageCount > 3 ? simulateBookmarks(pageCount) : [];
  const bookmarkSummary = calculateBookmarkSummary(bookmarks, pageCount);
  
  // Simulate accessibility
  const accessibility = simulateAccessibility(pageCount);
  
  // Simulate security
  const security = simulateSecurity();
  
  // Run compliance validation
  const ectdCompliance = validateECTDCompliance(
    pdfVersion,
    pdfaConformance,
    fontSummary,
    imageSummary,
    pageSummary,
    bookmarkSummary,
    accessibility,
    security,
    pageCount,
    documentInfo,
    regions
  );
  
  const extractionDuration = Date.now() - startTime + Math.floor(Math.random() * 100);
  
  return {
    id: generatePDFMetadataId('meta'),
    documentId,
    filename,
    fileSize,
    md5Hash: generateMD5Hash(),
    sha256Hash: generateSHA256Hash(),
    extractedAt: new Date().toISOString(),
    extractionDurationMs: extractionDuration,
    status: 'completed',
    pdfVersion,
    pdfaConformance,
    documentInfo,
    fonts,
    fontSummary,
    images,
    imageSummary,
    pages,
    pageSummary,
    bookmarks,
    bookmarkSummary,
    accessibility,
    security,
    isLinearized: Math.random() > 0.3,
    hasIncrementalUpdates: Math.random() > 0.7,
    incrementalUpdateCount: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
    hasEmbeddedFiles: false,
    embeddedFileCount: 0,
    hasJavaScript: false,
    hasForms: Math.random() > 0.8,
    formType: Math.random() > 0.8 ? 'AcroForm' : 'none',
    ectdCompliance,
  };
}

/**
 * Simulate font extraction
 */
function simulateFonts(pageCount: number): ExtractedFontInfo[] {
  const fontNames = [
    'Arial', 'Times New Roman', 'Calibri', 'Helvetica', 
    'Courier New', 'Georgia', 'Verdana', 'Cambria'
  ];
  const fontTypes: FontType[] = ['TrueType', 'Type1', 'OpenType', 'CIDFontType2'];
  
  const fontCount = Math.min(Math.floor(Math.random() * 5) + 2, fontNames.length);
  const fonts: ExtractedFontInfo[] = [];
  
  for (let i = 0; i < fontCount; i++) {
    const isEmbedded = Math.random() > 0.1; // 90% embedded rate
    const fontType = fontTypes[Math.floor(Math.random() * fontTypes.length)];
    
    fonts.push({
      fontName: `ABCDEF+${fontNames[i]}`,
      baseFontName: fontNames[i],
      fontType,
      encoding: fontType === 'TrueType' ? 'WinAnsiEncoding' : 'Identity-H',
      isEmbedded,
      isSubset: isEmbedded && Math.random() > 0.2,
      isSymbolic: fontNames[i] === 'Symbol',
      usedOnPages: Array.from({ length: Math.min(pageCount, 5) }, (_, j) => j + 1),
      unicodeCoverage: {
        hasToUnicode: isEmbedded,
        mappedGlyphs: 256,
        unmappedGlyphs: isEmbedded ? 0 : Math.floor(Math.random() * 10),
      },
      issues: isEmbedded ? [] : ['Font not embedded'],
    });
  }
  
  return fonts;
}

/**
 * Calculate font analysis summary
 */
function calculateFontSummary(fonts: ExtractedFontInfo[]): FontAnalysisSummary {
  const nonEmbedded = fonts.filter(f => !f.isEmbedded);
  const byType: Record<FontType, number> = {
    'Type1': 0, 'Type1C': 0, 'MMType1': 0, 'Type3': 0,
    'TrueType': 0, 'CIDFontType0': 0, 'CIDFontType2': 0, 'OpenType': 0, 'Unknown': 0
  };
  
  fonts.forEach(f => {
    byType[f.fontType] = (byType[f.fontType] || 0) + 1;
  });
  
  return {
    totalFonts: fonts.length,
    embeddedFonts: fonts.filter(f => f.isEmbedded).length,
    subsetFonts: fonts.filter(f => f.isSubset).length,
    nonEmbeddedFonts: nonEmbedded.length,
    byType,
    nonEmbeddedFontNames: nonEmbedded.map(f => f.baseFontName),
    isCompliant: nonEmbedded.length === 0,
  };
}

/**
 * Simulate image extraction
 */
function simulateImages(pageCount: number): ExtractedImageInfo[] {
  const imageCount = Math.floor(Math.random() * (pageCount * 2)) + 1;
  const images: ExtractedImageInfo[] = [];
  const compressions: ImageCompression[] = ['DCTDecode', 'FlateDecode', 'JPXDecode'];
  const colorSpaces: ImageColorSpace[] = ['DeviceRGB', 'DeviceCMYK', 'DeviceGray'];
  
  for (let i = 0; i < imageCount; i++) {
    const widthPx = 800 + Math.floor(Math.random() * 1600);
    const heightPx = 600 + Math.floor(Math.random() * 1200);
    const renderedWidthPts = 200 + Math.floor(Math.random() * 300);
    const renderedHeightPts = (renderedWidthPts * heightPx) / widthPx;
    const effectiveDpiX = (widthPx / renderedWidthPts) * 72;
    const effectiveDpiY = (heightPx / renderedHeightPts) * 72;
    
    const compression = compressions[Math.floor(Math.random() * compressions.length)];
    const issues: string[] = [];
    
    if (effectiveDpiX < 150) issues.push('Resolution below 150 DPI');
    if (effectiveDpiX > 300) issues.push('Resolution above recommended 300 DPI');
    
    images.push({
      imageId: `img-${i + 1}`,
      pageNumber: Math.floor(Math.random() * pageCount) + 1,
      widthPx,
      heightPx,
      bitsPerComponent: 8,
      colorSpace: colorSpaces[Math.floor(Math.random() * colorSpaces.length)],
      colorComponents: 3,
      compression: [compression],
      hasSoftMask: Math.random() > 0.9,
      isInline: false,
      renderedWidthPts,
      renderedHeightPts,
      effectiveDpiX: Math.round(effectiveDpiX),
      effectiveDpiY: Math.round(effectiveDpiY),
      compressedSize: Math.floor(widthPx * heightPx * 0.1),
      issues,
    });
  }
  
  return images;
}

/**
 * Calculate image analysis summary
 */
function calculateImageSummary(images: ExtractedImageInfo[]): ImageAnalysisSummary {
  const byCompression: Record<ImageCompression, number> = {
    'DCTDecode': 0, 'FlateDecode': 0, 'LZWDecode': 0, 'CCITTFaxDecode': 0,
    'JBIG2Decode': 0, 'JPXDecode': 0, 'RunLengthDecode': 0, 'ASCIIHexDecode': 0,
    'ASCII85Decode': 0, 'None': 0, 'Unknown': 0
  };
  
  const byColorSpace: Record<ImageColorSpace, number> = {
    'DeviceGray': 0, 'DeviceRGB': 0, 'DeviceCMYK': 0, 'CalGray': 0,
    'CalRGB': 0, 'Lab': 0, 'ICCBased': 0, 'Indexed': 0, 'Pattern': 0,
    'Separation': 0, 'DeviceN': 0, 'Unknown': 0
  };
  
  images.forEach(img => {
    img.compression.forEach(c => {
      byCompression[c] = (byCompression[c] || 0) + 1;
    });
    byColorSpace[img.colorSpace] = (byColorSpace[img.colorSpace] || 0) + 1;
  });
  
  const dpis = images.map(i => i.effectiveDpiX);
  const lowRes = images.filter(i => i.effectiveDpiX < 150);
  const highRes = images.filter(i => i.effectiveDpiX > 300);
  
  return {
    totalImages: images.length,
    byCompression,
    byColorSpace,
    lowResolutionImages: lowRes.length,
    highResolutionImages: highRes.length,
    minDpi: dpis.length > 0 ? Math.min(...dpis) : 0,
    maxDpi: dpis.length > 0 ? Math.max(...dpis) : 0,
    avgDpi: dpis.length > 0 ? Math.round(dpis.reduce((a, b) => a + b, 0) / dpis.length) : 0,
    totalImageSize: images.reduce((sum, img) => sum + img.compressedSize, 0),
    imagesWithIssues: images.filter(i => i.issues.length > 0).length,
    isCompliant: lowRes.length === 0,
  };
}

/**
 * Simulate page extraction
 */
function simulatePages(pageCount: number): ExtractedPageInfo[] {
  const pages: ExtractedPageInfo[] = [];
  
  // Most pages are Letter or A4
  const useA4 = Math.random() > 0.5;
  const baseWidth = useA4 ? 595 : 612;
  const baseHeight = useA4 ? 842 : 792;
  
  for (let i = 0; i < pageCount; i++) {
    const isLandscape = Math.random() > 0.9; // 10% landscape
    const width = isLandscape ? baseHeight : baseWidth;
    const height = isLandscape ? baseWidth : baseHeight;
    
    // Occasionally throw in a non-standard page
    const isNonStandard = Math.random() > 0.95;
    const finalWidth = isNonStandard ? width + 50 : width;
    const finalHeight = isNonStandard ? height + 50 : height;
    
    const issues: string[] = [];
    if (isNonStandard) issues.push('Non-standard page size');
    
    pages.push({
      pageNumber: i + 1,
      mediaBoxWidth: finalWidth,
      mediaBoxHeight: finalHeight,
      rotation: 0,
      standardSize: detectPageSize(finalWidth, finalHeight),
      orientation: detectOrientation(finalWidth, finalHeight),
      hasText: Math.random() > 0.05,
      isScanned: Math.random() > 0.95,
      hasAnnotations: Math.random() > 0.8,
      hasFormFields: Math.random() > 0.95,
      contentStreamCount: 1,
      userUnit: 1.0,
      issues,
    });
  }
  
  return pages;
}

/**
 * Calculate page analysis summary
 */
function calculatePageSummary(pages: ExtractedPageInfo[]): PageAnalysisSummary {
  const bySize: Record<StandardPageSize, number> = {
    'Letter': 0, 'A4': 0, 'Legal': 0, 'Tabloid': 0, 'A3': 0, 'Custom': 0
  };
  
  const byOrientation: Record<PageOrientation, number> = {
    'portrait': 0, 'landscape': 0, 'square': 0
  };
  
  pages.forEach(p => {
    bySize[p.standardSize] = (bySize[p.standardSize] || 0) + 1;
    byOrientation[p.orientation] = (byOrientation[p.orientation] || 0) + 1;
  });
  
  return {
    totalPages: pages.length,
    bySize,
    byOrientation,
    nonStandardPages: pages.filter(p => p.standardSize === 'Custom').length,
    rotatedPages: pages.filter(p => p.rotation !== 0).length,
    scannedPages: pages.filter(p => p.isScanned).length,
    annotatedPages: pages.filter(p => p.hasAnnotations).length,
    formPages: pages.filter(p => p.hasFormFields).length,
    isCompliant: pages.every(p => p.standardSize !== 'Custom'),
  };
}

/**
 * Simulate bookmark extraction
 */
function simulateBookmarks(pageCount: number): ExtractedBookmarkInfo[] {
  const bookmarks: ExtractedBookmarkInfo[] = [];
  const sectionsCount = Math.min(Math.floor(pageCount / 3), 8);
  
  for (let i = 0; i < sectionsCount; i++) {
    const children: ExtractedBookmarkInfo[] = [];
    const subCount = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < subCount; j++) {
      children.push({
        id: `bm-${i}-${j}`,
        title: `Section ${i + 1}.${j + 1}`,
        level: 1,
        targetPage: Math.min((i * 3) + j + 2, pageCount),
        destinationType: 'XYZ',
        isOpen: false,
        isValid: true,
        children: [],
        issues: [],
      });
    }
    
    bookmarks.push({
      id: `bm-${i}`,
      title: `Section ${i + 1}`,
      level: 0,
      targetPage: Math.min(i * 3 + 1, pageCount),
      destinationType: 'XYZ',
      isOpen: true,
      isValid: true,
      children,
      issues: [],
    });
  }
  
  return bookmarks;
}

/**
 * Calculate bookmark summary
 */
function calculateBookmarkSummary(bookmarks: ExtractedBookmarkInfo[], pageCount: number): BookmarkAnalysisSummary {
  function countBookmarks(bms: ExtractedBookmarkInfo[]): number {
    return bms.reduce((sum, b) => sum + 1 + countBookmarks(b.children), 0);
  }
  
  function getMaxDepth(bms: ExtractedBookmarkInfo[], current: number = 0): number {
    if (bms.length === 0) return current;
    return Math.max(...bms.map(b => getMaxDepth(b.children, current + 1)));
  }
  
  function countInvalid(bms: ExtractedBookmarkInfo[]): number {
    return bms.reduce((sum, b) => sum + (b.isValid ? 0 : 1) + countInvalid(b.children), 0);
  }
  
  const totalBookmarks = countBookmarks(bookmarks);
  
  return {
    totalBookmarks,
    maxDepth: getMaxDepth(bookmarks),
    topLevelCount: bookmarks.length,
    invalidBookmarks: countInvalid(bookmarks),
    externalLinks: 0,
    hasOutline: bookmarks.length > 0,
    bookmarksPerTenPages: pageCount > 0 ? Math.round((totalBookmarks / pageCount) * 10 * 10) / 10 : 0,
    isCompliant: pageCount <= 5 || bookmarks.length > 0,
  };
}

/**
 * Simulate accessibility analysis
 */
function simulateAccessibility(pageCount: number): AccessibilitySummary {
  const isTagged = Math.random() > 0.3;
  
  return {
    isTagged,
    pdfuaConformance: isTagged && Math.random() > 0.5 ? 'PDF/UA-1' : 'none',
    structureTree: {
      hasStructureTree: isTagged,
      rootType: isTagged ? 'Document' : undefined,
      totalElements: isTagged ? pageCount * 10 : 0,
      byType: isTagged ? { 'Document': 1, 'P': pageCount * 5, 'H1': pageCount } : {},
      isFullyTagged: isTagged && Math.random() > 0.2,
      taggedPercentage: isTagged ? 80 + Math.random() * 20 : 0,
      figuresWithAltText: isTagged ? Math.floor(Math.random() * 5) : 0,
      totalFigures: Math.floor(Math.random() * 8),
      properlyStructuredTables: isTagged ? Math.floor(Math.random() * 3) : 0,
      totalTables: Math.floor(Math.random() * 5),
      documentLanguage: isTagged ? 'en-US' : undefined,
      readingOrderIssues: isTagged ? 0 : Math.floor(Math.random() * 3),
    },
    hasLogicalReadingOrder: isTagged,
    hasTitleInMetadata: Math.random() > 0.2,
    hasLanguage: isTagged,
    hasStructureTabOrder: isTagged,
    formFieldsAccessible: true,
    linksAccessible: isTagged,
    accessibilityScore: isTagged ? 70 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40),
    criticalIssues: isTagged ? [] : ['Document not tagged'],
  };
}

/**
 * Simulate security analysis
 */
function simulateSecurity(): SecuritySummary {
  // eCTD documents should NOT be encrypted
  const isEncrypted = Math.random() > 0.95; // 5% chance of encryption (error case)
  
  return {
    isEncrypted,
    hasUserPassword: isEncrypted,
    hasOwnerPassword: isEncrypted,
    permissions: {
      canPrint: true,
      canPrintHighQuality: true,
      canModify: !isEncrypted,
      canCopy: true,
      canAnnotate: true,
      canFillForms: true,
      canAccessibility: true,
      canAssemble: true,
    },
    hasDigitalSignatures: false,
    signatureCount: 0,
    signaturesValid: true,
    hasCertification: false,
    issues: isEncrypted ? ['Document is encrypted - not allowed for eCTD'] : [],
  };
}

/**
 * Validate eCTD compliance
 */
function validateECTDCompliance(
  pdfVersion: PDFVersion,
  pdfaConformance: PDFAConformance,
  fontSummary: FontAnalysisSummary,
  imageSummary: ImageAnalysisSummary,
  pageSummary: PageAnalysisSummary,
  bookmarkSummary: BookmarkAnalysisSummary,
  accessibility: AccessibilitySummary,
  security: SecuritySummary,
  pageCount: number,
  documentInfo: PDFDocumentInfo,
  regions: RegionalSpec[]
): ECTDComplianceSummary {
  const issues: ECTDComplianceIssue[] = [];
  
  // PDF Version validation
  const version = parseFloat(pdfVersion);
  if (version < 1.4 || version > 1.7) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'pdf-version',
      severity: 'error',
      ruleId: 'PDF-001',
      message: ECTD_VALIDATION_RULES['PDF-001'].message,
      details: `PDF version ${pdfVersion} is outside the allowed range 1.4-1.7`,
      applicableRegions: ECTD_VALIDATION_RULES['PDF-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Re-export document as PDF 1.4-1.7',
      specificationReference: ECTD_VALIDATION_RULES['PDF-001'].specificationReference,
    });
  }
  
  // PDF/A recommendation
  if (pdfaConformance === 'none' && regions.some(r => ['FDA', 'EMA'].includes(r))) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'pdf-version',
      severity: 'warning',
      ruleId: 'PDF-002',
      message: ECTD_VALIDATION_RULES['PDF-002'].message,
      applicableRegions: ECTD_VALIDATION_RULES['PDF-002'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Consider exporting as PDF/A-1b or PDF/A-2b',
      specificationReference: ECTD_VALIDATION_RULES['PDF-002'].specificationReference,
    });
  }
  
  // Font validation
  if (fontSummary.nonEmbeddedFonts > 0) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'fonts',
      severity: 'error',
      ruleId: 'FONT-001',
      message: ECTD_VALIDATION_RULES['FONT-001'].message,
      details: `${fontSummary.nonEmbeddedFonts} font(s) not embedded: ${fontSummary.nonEmbeddedFontNames.join(', ')}`,
      applicableRegions: ECTD_VALIDATION_RULES['FONT-001'].regions as RegionalSpec[],
      autoFixable: true,
      fixSuggestion: 'Embed all fonts when exporting to PDF',
      specificationReference: ECTD_VALIDATION_RULES['FONT-001'].specificationReference,
    });
  }
  
  // Image validation
  if (imageSummary.lowResolutionImages > 0) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'images',
      severity: 'warning',
      ruleId: 'IMG-001',
      message: ECTD_VALIDATION_RULES['IMG-001'].message,
      details: `${imageSummary.lowResolutionImages} image(s) below 150 DPI (minimum: ${imageSummary.minDpi} DPI)`,
      applicableRegions: ECTD_VALIDATION_RULES['IMG-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Use higher resolution source images',
      specificationReference: ECTD_VALIDATION_RULES['IMG-001'].specificationReference,
    });
  }
  
  // Page size validation
  if (pageSummary.nonStandardPages > 0) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'page-size',
      severity: 'error',
      ruleId: 'PAGE-001',
      message: ECTD_VALIDATION_RULES['PAGE-001'].message,
      details: `${pageSummary.nonStandardPages} page(s) have non-standard size`,
      applicableRegions: ECTD_VALIDATION_RULES['PAGE-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Resize pages to Letter (8.5x11") or A4',
      specificationReference: ECTD_VALIDATION_RULES['PAGE-001'].specificationReference,
    });
  }
  
  // Bookmark validation
  if (pageCount > 5 && !bookmarkSummary.hasOutline) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'bookmarks',
      severity: 'error',
      ruleId: 'BOOK-001',
      message: ECTD_VALIDATION_RULES['BOOK-001'].message,
      details: `Document has ${pageCount} pages but no bookmarks`,
      applicableRegions: ECTD_VALIDATION_RULES['BOOK-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Add bookmarks based on document headings',
      specificationReference: ECTD_VALIDATION_RULES['BOOK-001'].specificationReference,
    });
  }
  
  // Security validation
  if (security.isEncrypted) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'security',
      severity: 'error',
      ruleId: 'SEC-001',
      message: ECTD_VALIDATION_RULES['SEC-001'].message,
      applicableRegions: ECTD_VALIDATION_RULES['SEC-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Remove password protection before submission',
      specificationReference: ECTD_VALIDATION_RULES['SEC-001'].specificationReference,
    });
  }
  
  // Accessibility validation
  if (!accessibility.isTagged && regions.some(r => ['FDA', 'EMA'].includes(r))) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'accessibility',
      severity: 'warning',
      ruleId: 'ACC-001',
      message: ECTD_VALIDATION_RULES['ACC-001'].message,
      applicableRegions: ECTD_VALIDATION_RULES['ACC-001'].regions as RegionalSpec[],
      autoFixable: false,
      fixSuggestion: 'Export document with tags for accessibility',
      specificationReference: ECTD_VALIDATION_RULES['ACC-001'].specificationReference,
    });
  }
  
  // Metadata validation
  if (!documentInfo.title) {
    issues.push({
      id: generatePDFMetadataId('issue'),
      category: 'metadata',
      severity: 'warning',
      ruleId: 'META-001',
      message: ECTD_VALIDATION_RULES['META-001'].message,
      applicableRegions: ECTD_VALIDATION_RULES['META-001'].regions as RegionalSpec[],
      autoFixable: true,
      fixSuggestion: 'Set document title in PDF properties',
      specificationReference: ECTD_VALIDATION_RULES['META-001'].specificationReference,
    });
  }
  
  // Calculate category compliance
  const categories: ECTDComplianceCategory[] = [
    'pdf-version', 'fonts', 'images', 'page-size', 'bookmarks',
    'accessibility', 'security', 'metadata', 'structure', 'hyperlinks'
  ];
  
  const byCategory: ECTDComplianceSummary['byCategory'] = {} as ECTDComplianceSummary['byCategory'];
  
  categories.forEach(cat => {
    const catIssues = issues.filter(i => i.category === cat);
    byCategory[cat] = {
      isCompliant: !catIssues.some(i => i.severity === 'error'),
      errorCount: catIssues.filter(i => i.severity === 'error').length,
      warningCount: catIssues.filter(i => i.severity === 'warning').length,
      infoCount: catIssues.filter(i => i.severity === 'info').length,
    };
  });
  
  // Calculate score
  const totalErrors = issues.filter(i => i.severity === 'error').length;
  const totalWarnings = issues.filter(i => i.severity === 'warning').length;
  const totalInfo = issues.filter(i => i.severity === 'info').length;
  
  let score = 100;
  score -= totalErrors * 20;
  score -= totalWarnings * 5;
  score -= totalInfo * 1;
  score = Math.max(0, Math.min(100, score));
  
  return {
    overallCompliance: calculateComplianceLevel(score, totalErrors > 0),
    complianceScore: score,
    byCategory,
    totalErrors,
    totalWarnings,
    totalInfo,
    issues,
    validatedRegions: regions,
    autoFixableCount: issues.filter(i => i.autoFixable).length,
  };
}

// =============================================================================
// Store Definition
// =============================================================================

export const usePDFMetadataStore = create<PDFMetadataState & PDFMetadataActions>((set, get) => ({
  ...initialState,
  
  // Extraction
  extractMetadata: async (documentId, filename, pdfData, regions) => {
    const activeRegions = regions || get().defaultRegions;
    
    set({ isLoading: true, error: null });
    
    try {
      // Simulate extraction (in production, would use pdf.js)
      const metadata = simulateMetadataExtraction(
        documentId,
        filename,
        pdfData.byteLength,
        activeRegions
      );
      
      set(state => ({
        metadata: { ...state.metadata, [documentId]: metadata },
        isLoading: false,
      }));
      
      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },
  
  extractBatch: async (documents, regions) => {
    const jobId = generatePDFMetadataId('batch');
    const activeRegions = regions || get().defaultRegions;
    
    const job: BatchExtractionJob = {
      id: jobId,
      status: 'pending',
      documentIds: documents.map(d => d.id),
      completedIds: [],
      failedIds: [],
      regions: activeRegions,
      progress: 0,
      startedAt: new Date().toISOString(),
    };
    
    set(state => ({
      batchJobs: { ...state.batchJobs, [jobId]: job },
    }));
    
    // Start processing
    set(state => ({
      batchJobs: {
        ...state.batchJobs,
        [jobId]: { ...state.batchJobs[jobId], status: 'running' },
      },
    }));
    
    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const currentJob = get().batchJobs[jobId];
      
      if (currentJob?.status === 'cancelled') break;
      
      try {
        await get().extractMetadata(doc.id, doc.filename, doc.data, activeRegions);
        
        set(state => ({
          batchJobs: {
            ...state.batchJobs,
            [jobId]: {
              ...state.batchJobs[jobId],
              completedIds: [...state.batchJobs[jobId].completedIds, doc.id],
              progress: Math.round(((i + 1) / documents.length) * 100),
            },
          },
        }));
      } catch {
        set(state => ({
          batchJobs: {
            ...state.batchJobs,
            [jobId]: {
              ...state.batchJobs[jobId],
              failedIds: [...state.batchJobs[jobId].failedIds, doc.id],
              progress: Math.round(((i + 1) / documents.length) * 100),
            },
          },
        }));
      }
    }
    
    // Complete job
    set(state => ({
      batchJobs: {
        ...state.batchJobs,
        [jobId]: {
          ...state.batchJobs[jobId],
          status: state.batchJobs[jobId].failedIds.length > 0 ? 'completed' : 'completed',
          completedAt: new Date().toISOString(),
        },
      },
    }));
    
    return jobId;
  },
  
  // CRUD
  addMetadata: (metadata) => {
    set(state => ({
      metadata: { ...state.metadata, [metadata.documentId]: metadata },
    }));
  },
  
  updateMetadata: (documentId, updates) => {
    set(state => ({
      metadata: {
        ...state.metadata,
        [documentId]: state.metadata[documentId]
          ? { ...state.metadata[documentId], ...updates }
          : state.metadata[documentId],
      },
    }));
  },
  
  deleteMetadata: (documentId) => {
    set(state => {
      const { [documentId]: _, ...rest } = state.metadata;
      return {
        metadata: rest,
        selectedMetadataId: state.selectedMetadataId === documentId ? null : state.selectedMetadataId,
      };
    });
  },
  
  clearAllMetadata: () => {
    set({
      metadata: {},
      selectedMetadataId: null,
      statistics: null,
    });
  },
  
  // Selection
  selectMetadata: (documentId) => {
    set({ selectedMetadataId: documentId });
  },
  
  // Filtering
  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },
  
  clearFilters: () => {
    set({ filters: DEFAULT_METADATA_FILTERS });
  },
  
  // Batch jobs
  cancelBatchJob: (jobId) => {
    set(state => ({
      batchJobs: {
        ...state.batchJobs,
        [jobId]: state.batchJobs[jobId]
          ? { ...state.batchJobs[jobId], status: 'cancelled' }
          : state.batchJobs[jobId],
      },
    }));
  },
  
  getBatchJob: (jobId) => {
    return get().batchJobs[jobId];
  },
  
  // Statistics
  refreshStatistics: () => {
    const { metadata } = get();
    const allMetadata = Object.values(metadata);
    
    if (allMetadata.length === 0) {
      set({ statistics: null });
      return;
    }
    
    const byComplianceLevel: Record<ComplianceLevel, number> = {
      'full': 0, 'partial': 0, 'non-compliant': 0, 'unknown': 0
    };
    
    const byStatus: Record<ExtractionStatus, number> = {
      'pending': 0, 'processing': 0, 'completed': 0, 'failed': 0
    };
    
    let totalScore = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let fontCompliant = 0;
    let imageCompliant = 0;
    let bookmarkCompliant = 0;
    
    const issueCount: Record<string, { count: number; message: string }> = {};
    
    allMetadata.forEach(m => {
      byComplianceLevel[m.ectdCompliance.overallCompliance]++;
      byStatus[m.status]++;
      totalScore += m.ectdCompliance.complianceScore;
      totalErrors += m.ectdCompliance.totalErrors;
      totalWarnings += m.ectdCompliance.totalWarnings;
      
      if (m.fontSummary.isCompliant) fontCompliant++;
      if (m.imageSummary.isCompliant) imageCompliant++;
      if (m.bookmarkSummary.isCompliant) bookmarkCompliant++;
      
      m.ectdCompliance.issues.forEach(issue => {
        if (!issueCount[issue.ruleId]) {
          issueCount[issue.ruleId] = { count: 0, message: issue.message };
        }
        issueCount[issue.ruleId].count++;
      });
    });
    
    const topIssues = Object.entries(issueCount)
      .map(([ruleId, data]) => ({ ruleId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    set({
      statistics: {
        totalDocuments: allMetadata.length,
        byComplianceLevel,
        byStatus,
        averageComplianceScore: Math.round(totalScore / allMetadata.length),
        totalErrors,
        totalWarnings,
        topIssues,
        fontComplianceRate: Math.round((fontCompliant / allMetadata.length) * 100),
        imageComplianceRate: Math.round((imageCompliant / allMetadata.length) * 100),
        bookmarkComplianceRate: Math.round((bookmarkCompliant / allMetadata.length) * 100),
      },
    });
  },
  
  // Queries
  getMetadataForDocument: (documentId) => {
    return get().metadata[documentId];
  },
  
  getMetadataForApplication: (applicationId) => {
    // In production, would filter by applicationId field
    return Object.values(get().metadata).filter(
      m => m.documentId.includes(applicationId)
    );
  },
  
  getMetadataForSequence: (sequenceId) => {
    // In production, would filter by sequenceId field
    return Object.values(get().metadata).filter(
      m => m.documentId.includes(sequenceId)
    );
  },
  
  getDocumentsWithErrors: () => {
    return Object.values(get().metadata).filter(
      m => m.ectdCompliance.totalErrors > 0
    );
  },
  
  getDocumentsWithWarnings: () => {
    return Object.values(get().metadata).filter(
      m => m.ectdCompliance.totalWarnings > 0
    );
  },
  
  getNonCompliantDocuments: () => {
    return Object.values(get().metadata).filter(
      m => m.ectdCompliance.overallCompliance === 'non-compliant'
    );
  },
  
  // Re-validation
  revalidateDocument: (documentId, regions) => {
    const metadata = get().metadata[documentId];
    if (!metadata) return;
    
    const activeRegions = regions || get().defaultRegions;
    
    // Re-run validation with potentially new regions
    const ectdCompliance = validateECTDCompliance(
      metadata.pdfVersion,
      metadata.pdfaConformance,
      metadata.fontSummary,
      metadata.imageSummary,
      metadata.pageSummary,
      metadata.bookmarkSummary,
      metadata.accessibility,
      metadata.security,
      metadata.pageSummary.totalPages,
      metadata.documentInfo,
      activeRegions
    );
    
    set(state => ({
      metadata: {
        ...state.metadata,
        [documentId]: { ...metadata, ectdCompliance },
      },
    }));
  },
  
  revalidateAll: (regions) => {
    const { metadata } = get();
    Object.keys(metadata).forEach(docId => {
      get().revalidateDocument(docId, regions);
    });
  },
  
  // Settings
  setDefaultRegions: (regions) => {
    set({ defaultRegions: regions });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

/**
 * Get selected metadata
 */
export function useSelectedPDFMetadata() {
  const selectedId = usePDFMetadataStore(state => state.selectedMetadataId);
  const metadata = usePDFMetadataStore(state => state.metadata);
  return useMemo(() => selectedId ? metadata[selectedId] : null, [selectedId, metadata]);
}

/**
 * Get all metadata as list
 */
export function usePDFMetadataList() {
  const metadata = usePDFMetadataStore(state => state.metadata);
  return useMemo(() => Object.values(metadata), [metadata]);
}

/**
 * Get filtered metadata list
 */
export function useFilteredPDFMetadata() {
  const metadata = usePDFMetadataStore(state => state.metadata);
  const filters = usePDFMetadataStore(state => state.filters);
  
  return useMemo(() => {
    let result = Object.values(metadata);
    
    if (filters.complianceLevel?.length) {
      result = result.filter(m => 
        filters.complianceLevel!.includes(m.ectdCompliance.overallCompliance)
      );
    }
    
    if (filters.status?.length) {
      result = result.filter(m => filters.status!.includes(m.status));
    }
    
    if (filters.pdfVersion?.length) {
      result = result.filter(m => filters.pdfVersion!.includes(m.pdfVersion));
    }
    
    if (filters.minComplianceScore !== undefined) {
      result = result.filter(m => 
        m.ectdCompliance.complianceScore >= filters.minComplianceScore!
      );
    }
    
    if (filters.hasErrors !== undefined) {
      result = result.filter(m => 
        (m.ectdCompliance.totalErrors > 0) === filters.hasErrors
      );
    }
    
    if (filters.hasWarnings !== undefined) {
      result = result.filter(m => 
        (m.ectdCompliance.totalWarnings > 0) === filters.hasWarnings
      );
    }
    
    if (filters.filenameSearch) {
      const search = filters.filenameSearch.toLowerCase();
      result = result.filter(m => m.filename.toLowerCase().includes(search));
    }
    
    return result;
  }, [metadata, filters]);
}

/**
 * Get metadata statistics
 */
export function usePDFMetadataStatistics() {
  return usePDFMetadataStore(state => state.statistics);
}

/**
 * Get documents with errors
 */
export function usePDFDocumentsWithErrors() {
  const metadata = usePDFMetadataStore(state => state.metadata);
  return useMemo(() => 
    Object.values(metadata).filter(m => m.ectdCompliance.totalErrors > 0),
    [metadata]
  );
}

/**
 * Get documents with warnings
 */
export function usePDFDocumentsWithWarnings() {
  const metadata = usePDFMetadataStore(state => state.metadata);
  return useMemo(() => 
    Object.values(metadata).filter(m => m.ectdCompliance.totalWarnings > 0),
    [metadata]
  );
}

/**
 * Get non-compliant documents
 */
export function useNonCompliantPDFDocuments() {
  const metadata = usePDFMetadataStore(state => state.metadata);
  return useMemo(() => 
    Object.values(metadata).filter(m => m.ectdCompliance.overallCompliance === 'non-compliant'),
    [metadata]
  );
}

/**
 * Get loading state
 */
export function usePDFMetadataLoading() {
  return usePDFMetadataStore(state => state.isLoading);
}

/**
 * Get error state
 */
export function usePDFMetadataError() {
  return usePDFMetadataStore(state => state.error);
}

/**
 * Get active filters
 */
export function usePDFMetadataFilters() {
  return usePDFMetadataStore(state => state.filters);
}

/**
 * Get batch jobs
 */
export function usePDFBatchJobs() {
  const batchJobs = usePDFMetadataStore(state => state.batchJobs);
  return useMemo(() => Object.values(batchJobs), [batchJobs]);
}

/**
 * Get default regions
 */
export function usePDFDefaultRegions() {
  return usePDFMetadataStore(state => state.defaultRegions);
}
