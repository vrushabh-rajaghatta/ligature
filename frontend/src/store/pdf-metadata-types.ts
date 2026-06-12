
/**
 * PDF Metadata Extraction Types
 * v0.9.17c - Comprehensive PDF metadata extraction for eCTD compliance
 * 
 * This module provides types for:
 * - Automatic extraction of PDF metadata for eCTD documents
 * - Validation of PDF properties (fonts, images, bookmarks)
 * - Integration with eCTD validation rules
 */

// =============================================================================
// ID Generation
// =============================================================================

let metadataIdCounter = 0;

export function generatePDFMetadataId(prefix: string = 'meta'): string {
  metadataIdCounter += 1;
  return `${prefix}-${Date.now()}-${metadataIdCounter}`;
}

export function resetMetadataIdCounter(): void {
  metadataIdCounter = 0;
}

// =============================================================================
// Core Types
// =============================================================================

/** PDF version conformance levels */
export type PDFVersion = '1.0' | '1.1' | '1.2' | '1.3' | '1.4' | '1.5' | '1.6' | '1.7' | '2.0';

/** PDF/A conformance levels for archival */
export type PDFAConformance = 
  | 'PDF/A-1a' 
  | 'PDF/A-1b' 
  | 'PDF/A-2a' 
  | 'PDF/A-2b' 
  | 'PDF/A-2u'
  | 'PDF/A-3a' 
  | 'PDF/A-3b' 
  | 'PDF/A-3u'
  | 'PDF/A-4'
  | 'none';

/** PDF/UA accessibility conformance */
export type PDFUAConformance = 'PDF/UA-1' | 'PDF/UA-2' | 'none';

/** Extraction status for tracking processing */
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Compliance level based on validation */
export type ComplianceLevel = 'full' | 'partial' | 'non-compliant' | 'unknown';

/** Regional specification for validation context */
export type RegionalSpec = 'FDA' | 'EMA' | 'HC' | 'PMDA' | 'TGA' | 'ANVISA' | 'ICH' | 'NMPA';

// =============================================================================
// Document Properties
// =============================================================================

/** Core document information dictionary properties */
export interface PDFDocumentInfo {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document subject/description */
  subject?: string;
  /** Keywords for search */
  keywords?: string[];
  /** Application that created the source document */
  creator?: string;
  /** Application that produced the PDF */
  producer?: string;
  /** Original creation date */
  creationDate?: string;
  /** Last modification date */
  modificationDate?: string;
  /** Trapped flag for prepress */
  trapped?: 'True' | 'False' | 'Unknown';
}

/** XMP metadata properties */
export interface XMPMetadata {
  /** Dublin Core namespace properties */
  dublinCore?: {
    title?: string;
    creator?: string[];
    subject?: string[];
    description?: string;
    publisher?: string[];
    date?: string[];
    type?: string;
    format?: string;
    identifier?: string;
    language?: string[];
    rights?: string;
  };
  /** PDF namespace properties */
  pdf?: {
    producer?: string;
    keywords?: string;
    pdfVersion?: string;
  };
  /** XMP namespace properties */
  xmp?: {
    createDate?: string;
    modifyDate?: string;
    metadataDate?: string;
    creatorTool?: string;
  };
  /** PDF/A namespace properties */
  pdfaid?: {
    part?: number;
    conformance?: string;
    amd?: string;
    corr?: string;
  };
  /** PDF/UA namespace properties */
  pdfuaid?: {
    part?: number;
  };
  /** Custom properties from other namespaces */
  custom?: Record<string, unknown>;
}

// =============================================================================
// Font Analysis
// =============================================================================

/** Font type classification */
export type FontType = 
  | 'Type1' 
  | 'Type1C' 
  | 'MMType1'  // Multiple Master
  | 'Type3' 
  | 'TrueType' 
  | 'CIDFontType0'  // CID Type 1
  | 'CIDFontType2'  // CID TrueType
  | 'OpenType'
  | 'Unknown';

/** Font encoding type */
export type FontEncoding = 
  | 'WinAnsiEncoding' 
  | 'MacRomanEncoding' 
  | 'MacExpertEncoding'
  | 'StandardEncoding'
  | 'Identity-H'
  | 'Identity-V'
  | 'Custom'
  | 'Unknown';

/** Detailed font information extracted from PDF */
export interface ExtractedFontInfo {
  /** Internal font name in PDF */
  fontName: string;
  /** Base font name (PostScript name) */
  baseFontName: string;
  /** Font type */
  fontType: FontType;
  /** Font encoding */
  encoding: FontEncoding;
  /** Whether font is embedded */
  isEmbedded: boolean;
  /** Whether font is subset embedded */
  isSubset: boolean;
  /** Whether font is symbolic (non-standard character set) */
  isSymbolic: boolean;
  /** CID font system info if applicable */
  cidSystemInfo?: {
    registry: string;
    ordering: string;
    supplement: number;
  };
  /** Font descriptor metrics */
  descriptor?: {
    fontFamily?: string;
    fontWeight?: number;
    fontStretch?: string;
    italicAngle?: number;
    ascent?: number;
    descent?: number;
    capHeight?: number;
    xHeight?: number;
    stemV?: number;
    stemH?: number;
    avgWidth?: number;
    maxWidth?: number;
    missingWidth?: number;
  };
  /** Pages where font is used */
  usedOnPages: number[];
  /** Unicode coverage analysis */
  unicodeCoverage?: {
    hasToUnicode: boolean;
    mappedGlyphs: number;
    unmappedGlyphs: number;
  };
  /** Compliance issues specific to this font */
  issues: string[];
}

/** Font analysis summary */
export interface FontAnalysisSummary {
  /** Total unique fonts in document */
  totalFonts: number;
  /** Number of embedded fonts */
  embeddedFonts: number;
  /** Number of subset fonts */
  subsetFonts: number;
  /** Number of non-embedded fonts (compliance issue) */
  nonEmbeddedFonts: number;
  /** Fonts by type */
  byType: Record<FontType, number>;
  /** List of non-embedded font names */
  nonEmbeddedFontNames: string[];
  /** Overall font compliance */
  isCompliant: boolean;
}

// =============================================================================
// Image Analysis
// =============================================================================

/** Image compression type */
export type ImageCompression = 
  | 'DCTDecode'     // JPEG
  | 'FlateDecode'   // ZIP/Deflate
  | 'LZWDecode'     // LZW
  | 'CCITTFaxDecode' // CCITT Group 3/4
  | 'JBIG2Decode'   // JBIG2
  | 'JPXDecode'     // JPEG2000
  | 'RunLengthDecode'
  | 'ASCIIHexDecode'
  | 'ASCII85Decode'
  | 'None'
  | 'Unknown';

/** Image color space */
export type ImageColorSpace = 
  | 'DeviceGray'
  | 'DeviceRGB'
  | 'DeviceCMYK'
  | 'CalGray'
  | 'CalRGB'
  | 'Lab'
  | 'ICCBased'
  | 'Indexed'
  | 'Pattern'
  | 'Separation'
  | 'DeviceN'
  | 'Unknown';

/** Detailed image information */
export interface ExtractedImageInfo {
  /** Image identifier in PDF */
  imageId: string;
  /** Page number where image appears */
  pageNumber: number;
  /** Image width in pixels */
  widthPx: number;
  /** Image height in pixels */
  heightPx: number;
  /** Bits per component */
  bitsPerComponent: number;
  /** Color space */
  colorSpace: ImageColorSpace;
  /** Number of color components */
  colorComponents: number;
  /** Compression filter(s) applied */
  compression: ImageCompression[];
  /** Whether image has soft mask (transparency) */
  hasSoftMask: boolean;
  /** Whether image is inline (vs XObject) */
  isInline: boolean;
  /** Rendered width on page in points */
  renderedWidthPts: number;
  /** Rendered height on page in points */
  renderedHeightPts: number;
  /** Effective resolution in DPI (horizontal) */
  effectiveDpiX: number;
  /** Effective resolution in DPI (vertical) */
  effectiveDpiY: number;
  /** Compressed stream size in bytes */
  compressedSize: number;
  /** ICC profile name if embedded */
  iccProfileName?: string;
  /** Compliance issues specific to this image */
  issues: string[];
}

/** Image analysis summary */
export interface ImageAnalysisSummary {
  /** Total images in document */
  totalImages: number;
  /** Images by compression type */
  byCompression: Record<ImageCompression, number>;
  /** Images by color space */
  byColorSpace: Record<ImageColorSpace, number>;
  /** Images below minimum DPI threshold (typically 150 DPI for eCTD) */
  lowResolutionImages: number;
  /** Images above recommended DPI (typically 300 DPI) */
  highResolutionImages: number;
  /** Minimum DPI found */
  minDpi: number;
  /** Maximum DPI found */
  maxDpi: number;
  /** Average DPI */
  avgDpi: number;
  /** Total image data size (compressed) */
  totalImageSize: number;
  /** Images with compliance issues */
  imagesWithIssues: number;
  /** Overall image compliance */
  isCompliant: boolean;
}

// =============================================================================
// Page Analysis
// =============================================================================

/** Standard page sizes */
export type StandardPageSize = 
  | 'Letter'      // 8.5 x 11 in (612 x 792 pts)
  | 'A4'          // 210 x 297 mm (595 x 842 pts)
  | 'Legal'       // 8.5 x 14 in (612 x 1008 pts)
  | 'Tabloid'     // 11 x 17 in (792 x 1224 pts)
  | 'A3'          // 297 x 420 mm (842 x 1190 pts)
  | 'Custom';

/** Page orientation */
export type PageOrientation = 'portrait' | 'landscape' | 'square';

/** Detailed page information */
export interface ExtractedPageInfo {
  /** Page number (1-based) */
  pageNumber: number;
  /** Media box width in points */
  mediaBoxWidth: number;
  /** Media box height in points */
  mediaBoxHeight: number;
  /** Crop box if different from media box */
  cropBox?: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Trim box if defined */
  trimBox?: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Bleed box if defined */
  bleedBox?: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Art box if defined */
  artBox?: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Page rotation (0, 90, 180, 270) */
  rotation: number;
  /** Detected standard page size */
  standardSize: StandardPageSize;
  /** Page orientation based on dimensions */
  orientation: PageOrientation;
  /** Whether page contains text content */
  hasText: boolean;
  /** Whether page appears to be scanned (image-based) */
  isScanned: boolean;
  /** Whether page has annotations */
  hasAnnotations: boolean;
  /** Whether page has form fields */
  hasFormFields: boolean;
  /** Number of content streams */
  contentStreamCount: number;
  /** User unit (default 1.0 = 1/72 inch) */
  userUnit: number;
  /** Compliance issues specific to this page */
  issues: string[];
}

/** Page analysis summary */
export interface PageAnalysisSummary {
  /** Total page count */
  totalPages: number;
  /** Pages by standard size */
  bySize: Record<StandardPageSize, number>;
  /** Pages by orientation */
  byOrientation: Record<PageOrientation, number>;
  /** Number of pages with non-standard sizes */
  nonStandardPages: number;
  /** Number of rotated pages */
  rotatedPages: number;
  /** Number of scanned pages */
  scannedPages: number;
  /** Number of pages with annotations */
  annotatedPages: number;
  /** Number of pages with form fields */
  formPages: number;
  /** Overall page compliance */
  isCompliant: boolean;
}

// =============================================================================
// Bookmark/Outline Analysis
// =============================================================================

/** Bookmark destination type */
export type BookmarkDestinationType = 
  | 'XYZ'       // Go to specific position
  | 'Fit'       // Fit page in window
  | 'FitH'      // Fit width
  | 'FitV'      // Fit height
  | 'FitR'      // Fit rectangle
  | 'FitB'      // Fit bounding box
  | 'FitBH'     // Fit bounding box width
  | 'FitBV'     // Fit bounding box height
  | 'GoToR'     // Remote destination
  | 'GoToE'     // Embedded destination
  | 'Launch'    // Launch application
  | 'URI'       // Web link
  | 'Named'     // Named destination
  | 'Unknown';

/** Detailed bookmark information */
export interface ExtractedBookmarkInfo {
  /** Bookmark identifier */
  id: string;
  /** Bookmark title text */
  title: string;
  /** Nesting level (0 = top level) */
  level: number;
  /** Target page number (if internal) */
  targetPage?: number;
  /** Destination type */
  destinationType: BookmarkDestinationType;
  /** Whether bookmark is open by default */
  isOpen: boolean;
  /** Whether destination is valid/resolvable */
  isValid: boolean;
  /** Child bookmarks */
  children: ExtractedBookmarkInfo[];
  /** Destination details */
  destination?: {
    pageIndex?: number;
    left?: number;
    top?: number;
    zoom?: number;
    uri?: string;
    fileName?: string;
  };
  /** Text style */
  style?: {
    bold: boolean;
    italic: boolean;
    color?: string;
  };
  /** Issues with this bookmark */
  issues: string[];
}

/** Bookmark analysis summary */
export interface BookmarkAnalysisSummary {
  /** Total bookmark count */
  totalBookmarks: number;
  /** Maximum nesting depth */
  maxDepth: number;
  /** Number of top-level bookmarks */
  topLevelCount: number;
  /** Number of invalid/broken bookmarks */
  invalidBookmarks: number;
  /** Number of external links */
  externalLinks: number;
  /** Document has outline structure */
  hasOutline: boolean;
  /** Average bookmarks per 10 pages */
  bookmarksPerTenPages: number;
  /** Overall bookmark compliance */
  isCompliant: boolean;
}

// =============================================================================
// Accessibility & Structure
// =============================================================================

/** Structure element types (Tagged PDF) */
export type StructureElementType = 
  | 'Document'
  | 'Part'
  | 'Sect'
  | 'Div'
  | 'H' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6'
  | 'P'
  | 'L' | 'LI' | 'Lbl' | 'LBody'
  | 'Table' | 'TR' | 'TH' | 'TD'
  | 'Figure'
  | 'Formula'
  | 'Form'
  | 'Span'
  | 'Link'
  | 'Annot'
  | 'Quote'
  | 'Note'
  | 'Reference'
  | 'BibEntry'
  | 'Code'
  | 'TOC' | 'TOCI'
  | 'Index'
  | 'NonStruct'
  | 'Private'
  | 'Unknown';

/** Structure tree summary */
export interface StructureTreeSummary {
  /** Whether document has structure tree */
  hasStructureTree: boolean;
  /** Root element type */
  rootType?: StructureElementType;
  /** Total structure elements */
  totalElements: number;
  /** Elements by type */
  byType: Partial<Record<StructureElementType, number>>;
  /** Whether all content is tagged */
  isFullyTagged: boolean;
  /** Percentage of content that is tagged */
  taggedPercentage: number;
  /** Number of figures with alt text */
  figuresWithAltText: number;
  /** Total figures */
  totalFigures: number;
  /** Number of tables properly structured */
  properlyStructuredTables: number;
  /** Total tables */
  totalTables: number;
  /** Language specified */
  documentLanguage?: string;
  /** Reading order issues detected */
  readingOrderIssues: number;
}

/** Accessibility analysis summary */
export interface AccessibilitySummary {
  /** Whether document is tagged */
  isTagged: boolean;
  /** PDF/UA conformance level */
  pdfuaConformance: PDFUAConformance;
  /** Structure tree summary */
  structureTree: StructureTreeSummary;
  /** Whether document has logical reading order */
  hasLogicalReadingOrder: boolean;
  /** Whether document title is set */
  hasTitleInMetadata: boolean;
  /** Whether document language is set */
  hasLanguage: boolean;
  /** Tab order is structure-based */
  hasStructureTabOrder: boolean;
  /** All form fields have tooltips */
  formFieldsAccessible: boolean;
  /** All links have alt text */
  linksAccessible: boolean;
  /** Accessibility score (0-100) */
  accessibilityScore: number;
  /** Critical accessibility issues */
  criticalIssues: string[];
}

// =============================================================================
// Security Analysis
// =============================================================================

/** Document permissions */
export interface PDFPermissions {
  /** Can print document */
  canPrint: boolean;
  /** Can print at high quality */
  canPrintHighQuality: boolean;
  /** Can modify document */
  canModify: boolean;
  /** Can copy content */
  canCopy: boolean;
  /** Can add/modify annotations */
  canAnnotate: boolean;
  /** Can fill form fields */
  canFillForms: boolean;
  /** Can extract content for accessibility */
  canAccessibility: boolean;
  /** Can assemble document */
  canAssemble: boolean;
}

/** Security analysis summary */
export interface SecuritySummary {
  /** Document is encrypted */
  isEncrypted: boolean;
  /** Encryption algorithm */
  encryptionAlgorithm?: string;
  /** Key length in bits */
  keyLength?: number;
  /** Has user password */
  hasUserPassword: boolean;
  /** Has owner password */
  hasOwnerPassword: boolean;
  /** Document permissions */
  permissions: PDFPermissions;
  /** Has digital signatures */
  hasDigitalSignatures: boolean;
  /** Number of signatures */
  signatureCount: number;
  /** All signatures valid */
  signaturesValid: boolean;
  /** Has certification signature */
  hasCertification: boolean;
  /** Compliance issues (eCTD typically requires no encryption) */
  issues: string[];
}

// =============================================================================
// eCTD Compliance Analysis
// =============================================================================

/** eCTD compliance rule category */
export type ECTDComplianceCategory = 
  | 'pdf-version'
  | 'fonts'
  | 'images'
  | 'page-size'
  | 'bookmarks'
  | 'accessibility'
  | 'security'
  | 'metadata'
  | 'structure'
  | 'hyperlinks';

/** eCTD compliance issue */
export interface ECTDComplianceIssue {
  /** Issue identifier */
  id: string;
  /** Issue category */
  category: ECTDComplianceCategory;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Rule identifier */
  ruleId: string;
  /** Human-readable message */
  message: string;
  /** Detailed description */
  details?: string;
  /** Affected page number */
  pageNumber?: number;
  /** Affected element (font name, image id, etc.) */
  affectedElement?: string;
  /** Regions this rule applies to */
  applicableRegions: RegionalSpec[];
  /** Whether issue can be auto-fixed */
  autoFixable: boolean;
  /** Suggested fix */
  fixSuggestion?: string;
  /** Reference to specification */
  specificationReference?: string;
}

/** eCTD compliance summary by category */
export interface ECTDComplianceSummary {
  /** Overall compliance level */
  overallCompliance: ComplianceLevel;
  /** Compliance score (0-100) */
  complianceScore: number;
  /** Issues by category */
  byCategory: Record<ECTDComplianceCategory, {
    isCompliant: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  }>;
  /** Total error count */
  totalErrors: number;
  /** Total warning count */
  totalWarnings: number;
  /** Total info count */
  totalInfo: number;
  /** All compliance issues */
  issues: ECTDComplianceIssue[];
  /** Regions validated against */
  validatedRegions: RegionalSpec[];
  /** Auto-fixable issue count */
  autoFixableCount: number;
}

// =============================================================================
// Complete Extracted Metadata
// =============================================================================

/** Complete PDF metadata extraction result */
export interface ExtractedPDFMetadata {
  /** Unique identifier for this extraction */
  id: string;
  /** Document identifier in system */
  documentId: string;
  /** Document filename */
  filename: string;
  /** File size in bytes */
  fileSize: number;
  /** MD5 hash for integrity */
  md5Hash: string;
  /** SHA-256 hash for integrity */
  sha256Hash: string;
  /** Extraction timestamp */
  extractedAt: string;
  /** Extraction duration in milliseconds */
  extractionDurationMs: number;
  /** Extraction status */
  status: ExtractionStatus;
  /** Error message if extraction failed */
  errorMessage?: string;
  
  // Document properties
  /** PDF version */
  pdfVersion: PDFVersion;
  /** PDF/A conformance */
  pdfaConformance: PDFAConformance;
  /** Document info dictionary */
  documentInfo: PDFDocumentInfo;
  /** XMP metadata */
  xmpMetadata?: XMPMetadata;
  
  // Content analysis
  /** Font analysis */
  fonts: ExtractedFontInfo[];
  /** Font summary */
  fontSummary: FontAnalysisSummary;
  /** Image analysis */
  images: ExtractedImageInfo[];
  /** Image summary */
  imageSummary: ImageAnalysisSummary;
  /** Page analysis */
  pages: ExtractedPageInfo[];
  /** Page summary */
  pageSummary: PageAnalysisSummary;
  /** Bookmark analysis */
  bookmarks: ExtractedBookmarkInfo[];
  /** Bookmark summary */
  bookmarkSummary: BookmarkAnalysisSummary;
  
  // Accessibility & Structure
  /** Accessibility analysis */
  accessibility: AccessibilitySummary;
  
  // Security
  /** Security analysis */
  security: SecuritySummary;
  
  // Additional properties
  /** Whether PDF is linearized (fast web view) */
  isLinearized: boolean;
  /** Whether PDF has incremental updates */
  hasIncrementalUpdates: boolean;
  /** Number of incremental updates */
  incrementalUpdateCount: number;
  /** Whether PDF has embedded files */
  hasEmbeddedFiles: boolean;
  /** Number of embedded files */
  embeddedFileCount: number;
  /** Whether PDF has JavaScript */
  hasJavaScript: boolean;
  /** Whether PDF has forms */
  hasForms: boolean;
  /** Form type (AcroForm, XFA, both, none) */
  formType?: 'AcroForm' | 'XFA' | 'both' | 'none';
  
  // Compliance
  /** eCTD compliance summary */
  ectdCompliance: ECTDComplianceSummary;
}

// =============================================================================
// Store State Types
// =============================================================================

/** Filter options for metadata list */
export interface PDFMetadataFilters {
  /** Filter by compliance level */
  complianceLevel?: ComplianceLevel[];
  /** Filter by extraction status */
  status?: ExtractionStatus[];
  /** Filter by PDF version */
  pdfVersion?: PDFVersion[];
  /** Filter by minimum compliance score */
  minComplianceScore?: number;
  /** Filter by has errors */
  hasErrors?: boolean;
  /** Filter by has warnings */
  hasWarnings?: boolean;
  /** Search by filename */
  filenameSearch?: string;
  /** Filter by application ID */
  applicationId?: string;
  /** Filter by sequence ID */
  sequenceId?: string;
}

/** Default filter values */
export const DEFAULT_METADATA_FILTERS: PDFMetadataFilters = {};

/** Statistics for the metadata store */
export interface PDFMetadataStatistics {
  /** Total documents analyzed */
  totalDocuments: number;
  /** Documents by compliance level */
  byComplianceLevel: Record<ComplianceLevel, number>;
  /** Documents by extraction status */
  byStatus: Record<ExtractionStatus, number>;
  /** Average compliance score */
  averageComplianceScore: number;
  /** Total errors across all documents */
  totalErrors: number;
  /** Total warnings across all documents */
  totalWarnings: number;
  /** Most common issues */
  topIssues: Array<{ ruleId: string; count: number; message: string }>;
  /** Font compliance rate */
  fontComplianceRate: number;
  /** Image compliance rate */
  imageComplianceRate: number;
  /** Bookmark compliance rate */
  bookmarkComplianceRate: number;
}

/** Batch extraction job */
export interface BatchExtractionJob {
  /** Job identifier */
  id: string;
  /** Job status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Document IDs to process */
  documentIds: string[];
  /** Completed document IDs */
  completedIds: string[];
  /** Failed document IDs */
  failedIds: string[];
  /** Regions to validate against */
  regions: RegionalSpec[];
  /** Progress percentage */
  progress: number;
  /** Start time */
  startedAt?: string;
  /** Completion time */
  completedAt?: string;
  /** Error message if failed */
  errorMessage?: string;
}

/** Store state */
export interface PDFMetadataState {
  /** All extracted metadata by document ID */
  metadata: Record<string, ExtractedPDFMetadata>;
  /** Currently selected metadata ID */
  selectedMetadataId: string | null;
  /** Active filters */
  filters: PDFMetadataFilters;
  /** Computed statistics */
  statistics: PDFMetadataStatistics | null;
  /** Active batch jobs */
  batchJobs: Record<string, BatchExtractionJob>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Default regions for validation */
  defaultRegions: RegionalSpec[];
}

/** Store actions */
export interface PDFMetadataActions {
  // Extraction
  extractMetadata: (documentId: string, filename: string, pdfData: ArrayBuffer, regions?: RegionalSpec[]) => Promise<ExtractedPDFMetadata>;
  extractBatch: (documents: Array<{ id: string; filename: string; data: ArrayBuffer }>, regions?: RegionalSpec[]) => Promise<string>;
  
  // CRUD
  addMetadata: (metadata: ExtractedPDFMetadata) => void;
  updateMetadata: (id: string, updates: Partial<ExtractedPDFMetadata>) => void;
  deleteMetadata: (documentId: string) => void;
  clearAllMetadata: () => void;
  
  // Selection
  selectMetadata: (documentId: string | null) => void;
  
  // Filtering
  setFilters: (filters: Partial<PDFMetadataFilters>) => void;
  clearFilters: () => void;
  
  // Batch jobs
  cancelBatchJob: (jobId: string) => void;
  getBatchJob: (jobId: string) => BatchExtractionJob | undefined;
  
  // Statistics
  refreshStatistics: () => void;
  
  // Queries
  getMetadataForDocument: (documentId: string) => ExtractedPDFMetadata | undefined;
  getMetadataForApplication: (applicationId: string) => ExtractedPDFMetadata[];
  getMetadataForSequence: (sequenceId: string) => ExtractedPDFMetadata[];
  getDocumentsWithErrors: () => ExtractedPDFMetadata[];
  getDocumentsWithWarnings: () => ExtractedPDFMetadata[];
  getNonCompliantDocuments: () => ExtractedPDFMetadata[];
  
  // Re-validation
  revalidateDocument: (documentId: string, regions?: RegionalSpec[]) => void;
  revalidateAll: (regions?: RegionalSpec[]) => void;
  
  // Settings
  setDefaultRegions: (regions: RegionalSpec[]) => void;
}

// =============================================================================
// Color Maps for UI
// =============================================================================

export const COMPLIANCE_LEVEL_COLORS: Record<ComplianceLevel, string> = {
  'full': '#22c55e',       // green-500
  'partial': '#eab308',    // yellow-500
  'non-compliant': '#ef4444', // red-500
  'unknown': '#6b7280',    // gray-500
};

export const EXTRACTION_STATUS_COLORS: Record<ExtractionStatus, string> = {
  'pending': '#6b7280',    // gray-500
  'processing': '#3b82f6', // blue-500
  'completed': '#22c55e',  // green-500
  'failed': '#ef4444',     // red-500
};

export const COMPLIANCE_CATEGORY_COLORS: Record<ECTDComplianceCategory, string> = {
  'pdf-version': '#8b5cf6',   // violet-500
  'fonts': '#ec4899',         // pink-500
  'images': '#f97316',        // orange-500
  'page-size': '#14b8a6',     // teal-500
  'bookmarks': '#6366f1',     // indigo-500
  'accessibility': '#22c55e', // green-500
  'security': '#ef4444',      // red-500
  'metadata': '#3b82f6',      // blue-500
  'structure': '#84cc16',     // lime-500
  'hyperlinks': '#06b6d4',    // cyan-500
};

// =============================================================================
// Label Maps for UI
// =============================================================================

export const COMPLIANCE_LEVEL_LABELS: Record<ComplianceLevel, string> = {
  'full': 'Fully Compliant',
  'partial': 'Partially Compliant',
  'non-compliant': 'Non-Compliant',
  'unknown': 'Unknown',
};

export const EXTRACTION_STATUS_LABELS: Record<ExtractionStatus, string> = {
  'pending': 'Pending',
  'processing': 'Processing',
  'completed': 'Completed',
  'failed': 'Failed',
};

export const COMPLIANCE_CATEGORY_LABELS: Record<ECTDComplianceCategory, string> = {
  'pdf-version': 'PDF Version',
  'fonts': 'Fonts',
  'images': 'Images',
  'page-size': 'Page Size',
  'bookmarks': 'Bookmarks',
  'accessibility': 'Accessibility',
  'security': 'Security',
  'metadata': 'Metadata',
  'structure': 'Structure',
  'hyperlinks': 'Hyperlinks',
};

export const PDFA_CONFORMANCE_LABELS: Record<PDFAConformance, string> = {
  'PDF/A-1a': 'PDF/A-1a (Level A)',
  'PDF/A-1b': 'PDF/A-1b (Level B)',
  'PDF/A-2a': 'PDF/A-2a (Level A)',
  'PDF/A-2b': 'PDF/A-2b (Level B)',
  'PDF/A-2u': 'PDF/A-2u (Level U)',
  'PDF/A-3a': 'PDF/A-3a (Level A)',
  'PDF/A-3b': 'PDF/A-3b (Level B)',
  'PDF/A-3u': 'PDF/A-3u (Level U)',
  'PDF/A-4': 'PDF/A-4',
  'none': 'Not PDF/A',
};

export const FONT_TYPE_LABELS: Record<FontType, string> = {
  'Type1': 'Type 1',
  'Type1C': 'Type 1 CFF',
  'MMType1': 'Multiple Master Type 1',
  'Type3': 'Type 3',
  'TrueType': 'TrueType',
  'CIDFontType0': 'CID Type 0 (PostScript)',
  'CIDFontType2': 'CID Type 2 (TrueType)',
  'OpenType': 'OpenType',
  'Unknown': 'Unknown',
};

export const IMAGE_COMPRESSION_LABELS: Record<ImageCompression, string> = {
  'DCTDecode': 'JPEG',
  'FlateDecode': 'ZIP/Deflate',
  'LZWDecode': 'LZW',
  'CCITTFaxDecode': 'CCITT Fax',
  'JBIG2Decode': 'JBIG2',
  'JPXDecode': 'JPEG 2000',
  'RunLengthDecode': 'Run Length',
  'ASCIIHexDecode': 'ASCII Hex',
  'ASCII85Decode': 'ASCII 85',
  'None': 'Uncompressed',
  'Unknown': 'Unknown',
};

// =============================================================================
// eCTD Validation Rule Definitions
// =============================================================================

/** Built-in eCTD validation rules */
export const ECTD_VALIDATION_RULES = {
  // PDF Version Rules
  'PDF-001': {
    id: 'PDF-001',
    category: 'pdf-version' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'PDF version must be 1.4-1.7 for eCTD',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  'PDF-002': {
    id: 'PDF-002',
    category: 'pdf-version' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'PDF/A conformance recommended for long-term archival',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  
  // Font Rules
  'FONT-001': {
    id: 'FONT-001',
    category: 'fonts' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'All fonts must be embedded',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0 Section 5.3',
  },
  'FONT-002': {
    id: 'FONT-002',
    category: 'fonts' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Font subsetting recommended to reduce file size',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  'FONT-003': {
    id: 'FONT-003',
    category: 'fonts' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Type 3 fonts should be avoided',
    regions: ['FDA', 'EMA', 'PMDA'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  
  // Image Rules
  'IMG-001': {
    id: 'IMG-001',
    category: 'images' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Image resolution below recommended 150 DPI',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  'IMG-002': {
    id: 'IMG-002',
    category: 'images' as ECTDComplianceCategory,
    severity: 'info' as const,
    message: 'Image resolution above 300 DPI may increase file size unnecessarily',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  'IMG-003': {
    id: 'IMG-003',
    category: 'images' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'LZW compression not recommended',
    regions: ['FDA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  
  // Page Size Rules
  'PAGE-001': {
    id: 'PAGE-001',
    category: 'page-size' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'Page size must be Letter (8.5x11") or A4',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  'PAGE-002': {
    id: 'PAGE-002',
    category: 'page-size' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'A4 page size preferred for EMA submissions',
    regions: ['EMA'] as RegionalSpec[],
    specificationReference: 'EMA eCTD Guidance',
  },
  
  // Bookmark Rules
  'BOOK-001': {
    id: 'BOOK-001',
    category: 'bookmarks' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'Documents over 5 pages must have bookmarks',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0 Section 5.4',
  },
  'BOOK-002': {
    id: 'BOOK-002',
    category: 'bookmarks' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Bookmark hierarchy should not exceed 6 levels',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  'BOOK-003': {
    id: 'BOOK-003',
    category: 'bookmarks' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'Broken bookmark destination detected',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  
  // Security Rules
  'SEC-001': {
    id: 'SEC-001',
    category: 'security' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'PDF encryption/password protection not allowed',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0 Section 5.2',
  },
  'SEC-002': {
    id: 'SEC-002',
    category: 'security' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'Copy/extract restrictions not allowed',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  
  // Accessibility Rules
  'ACC-001': {
    id: 'ACC-001',
    category: 'accessibility' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Document not tagged (accessibility)',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'Section 508 / EN 301 549',
  },
  'ACC-002': {
    id: 'ACC-002',
    category: 'accessibility' as ECTDComplianceCategory,
    severity: 'info' as const,
    message: 'Document language not specified',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'PDF/UA-1',
  },
  
  // Metadata Rules
  'META-001': {
    id: 'META-001',
    category: 'metadata' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Document title not set in metadata',
    regions: ['FDA', 'EMA', 'PMDA'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0',
  },
  'META-002': {
    id: 'META-002',
    category: 'metadata' as ECTDComplianceCategory,
    severity: 'info' as const,
    message: 'Creation/modification dates should be set',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
  
  // Hyperlink Rules
  'LINK-001': {
    id: 'LINK-001',
    category: 'hyperlinks' as ECTDComplianceCategory,
    severity: 'error' as const,
    message: 'External hyperlinks not allowed in eCTD',
    regions: ['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[],
    specificationReference: 'ICH eCTD Specification v4.0 Section 5.5',
  },
  'LINK-002': {
    id: 'LINK-002',
    category: 'hyperlinks' as ECTDComplianceCategory,
    severity: 'warning' as const,
    message: 'Relative hyperlinks should use forward slashes',
    regions: ['FDA', 'EMA'] as RegionalSpec[],
    specificationReference: 'FDA eCTD Technical Conformance Guide',
  },
} as const;

// Type for rule IDs
export type ECTDRuleId = keyof typeof ECTD_VALIDATION_RULES;
