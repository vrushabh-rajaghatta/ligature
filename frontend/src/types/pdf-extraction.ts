
// =============================================================================
// PDF Extraction Types
// =============================================================================
// Foundation types for extracting text, tables, and figures from PDF documents.
// Enables RAG ingestion and AI authoring from source documents.
//
// Per AI Authoring Specs v1.0 - GAP 2: PDF Text & Table Extraction
// Implementation planned for v0.18.x (Q2 2026)
// =============================================================================

// -----------------------------------------------------------------------------
// Extraction Result Types
// -----------------------------------------------------------------------------

/**
 * Complete extraction result for a PDF document
 */
export interface ExtractedDocument {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  
  // Document structure
  pageCount: number;
  pages: ExtractedPage[];
  
  // Extracted content
  text: PageText[];
  tables: ExtractedTable[];
  figures: ExtractedFigure[];
  sections: DetectedSection[];
  
  // Document metadata
  metadata: PDFMetadata;
  
  // Processing info
  extractionMethod: ExtractionMethod;
  processingTimeMs: number;
  extractedAt: string;
  
  // Quality metrics
  quality: ExtractionQuality;
  
  // Errors/warnings during extraction
  errors?: ExtractionError[];
  warnings?: ExtractionWarning[];
}

/**
 * Extraction method used
 */
export type ExtractionMethod =
  | 'native'        // Native PDF text extraction (pdf-parse)
  | 'ocr'           // OCR for scanned documents
  | 'vision'        // Claude Vision API
  | 'hybrid'        // Combination of methods
  | 'textract';     // AWS Textract

/**
 * A single page from the PDF
 */
export interface ExtractedPage {
  pageNumber: number;
  width: number;           // Points
  height: number;          // Points
  rotation: number;        // Degrees (0, 90, 180, 270)
  
  // Content on this page
  text: string;
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  figures: ExtractedFigure[];
  
  // Page-level metadata
  hasImages: boolean;
  isScanned: boolean;      // Likely a scanned page
  confidence: number;      // OCR confidence if applicable (0-1)
}

/**
 * Text content by page
 */
export interface PageText {
  pageNumber: number;
  text: string;
  tokenCount: number;
  
  // Structured text blocks
  blocks?: TextBlock[];
}

/**
 * A block of text with positioning
 */
export interface TextBlock {
  id: string;
  text: string;
  
  // Position on page
  boundingBox: BoundingBox;
  
  // Text properties
  fontSize?: number;
  fontName?: string;
  isBold?: boolean;
  isItalic?: boolean;
  
  // Block type classification
  blockType: TextBlockType;
  
  // Reading order
  readingOrder: number;
  
  // Confidence (for OCR)
  confidence?: number;
}

export type TextBlockType =
  | 'paragraph'
  | 'heading'
  | 'list_item'
  | 'table_cell'
  | 'caption'
  | 'footnote'
  | 'header'
  | 'footer'
  | 'page_number'
  | 'unknown';

// -----------------------------------------------------------------------------
// Table Extraction Types
// -----------------------------------------------------------------------------

/**
 * An extracted table from a PDF
 */
export interface ExtractedTable {
  id: string;
  pageNumber: number;
  pageEnd?: number;        // For tables spanning multiple pages
  
  // Table identification
  tableNumber?: number;    // e.g., "Table 14.1"
  title?: string;          // Table title/caption
  
  // Table structure
  headers: TableHeader[];
  rows: TableRow[];
  
  // Raw data
  headerRow: string[];     // Simple header array
  dataRows: string[][];    // Simple 2D array
  
  // Table properties
  rowCount: number;
  columnCount: number;
  hasHeaderRow: boolean;
  hasRowHeaders: boolean;
  
  // Footnotes
  footnotes?: TableFootnote[];
  
  // Position
  boundingBox: BoundingBox;
  
  // Quality
  confidence: number;      // 0-1
  
  // Spanning cells
  mergedCells?: MergedCell[];
  
  // Source reference
  sourceSection?: string;  // e.g., "11.1.2"
}

/**
 * Table header cell
 */
export interface TableHeader {
  text: string;
  columnIndex: number;
  columnSpan: number;
  rowSpan: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Table data row
 */
export interface TableRow {
  rowIndex: number;
  cells: TableCell[];
  isHeaderRow: boolean;
  isSubheaderRow: boolean;
  isTotalRow: boolean;
}

/**
 * Table cell
 */
export interface TableCell {
  text: string;
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  columnSpan: number;
  
  // Cell properties
  isHeader: boolean;
  isRowHeader: boolean;
  alignment?: 'left' | 'center' | 'right';
  
  // Numeric detection
  isNumeric: boolean;
  numericValue?: number;
  
  // Statistical values
  isPValue?: boolean;
  isConfidenceInterval?: boolean;
  isPercentage?: boolean;
}

/**
 * Merged cell specification
 */
export interface MergedCell {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  text: string;
}

/**
 * Table footnote
 */
export interface TableFootnote {
  marker: string;          // e.g., "a", "*", "†"
  text: string;
  referencedCells?: { row: number; col: number }[];
}

// -----------------------------------------------------------------------------
// Figure Extraction Types
// -----------------------------------------------------------------------------

/**
 * An extracted figure from a PDF
 */
export interface ExtractedFigure {
  id: string;
  pageNumber: number;
  
  // Figure identification
  figureNumber?: string;   // e.g., "Figure 2.1"
  title?: string;          // Figure title/caption
  
  // Image data
  imageData?: string;      // Base64 encoded
  imageFormat: ImageFormat;
  width: number;
  height: number;
  resolution?: number;     // DPI
  
  // Position
  boundingBox: BoundingBox;
  
  // Figure type classification
  figureType: FigureType;
  
  // For charts/graphs
  chartType?: ChartType;
  axisLabels?: AxisLabels;
  legendItems?: string[];
  dataPoints?: DataPoint[];
  
  // Source reference
  sourceSection?: string;
  
  // Quality
  confidence: number;
}

export type ImageFormat = 'png' | 'jpeg' | 'tiff' | 'svg' | 'unknown';

export type FigureType =
  | 'chart'           // Statistical chart/graph
  | 'diagram'         // Flow diagram, process diagram
  | 'photograph'      // Photo/image
  | 'illustration'    // Medical illustration
  | 'chemical'        // Chemical structure
  | 'screenshot'      // Screen capture
  | 'logo'            // Logo/branding
  | 'unknown';

export type ChartType =
  | 'bar'
  | 'line'
  | 'scatter'
  | 'pie'
  | 'kaplan_meier'    // Survival curves
  | 'forest_plot'     // Meta-analysis
  | 'waterfall'       // Tumor response
  | 'swimmer'         // Patient timeline
  | 'box_whisker'
  | 'histogram'
  | 'heatmap'
  | 'other';

export interface AxisLabels {
  xAxis?: string;
  yAxis?: string;
  xUnit?: string;
  yUnit?: string;
}

export interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  series?: string;
}

// -----------------------------------------------------------------------------
// Section Detection Types
// -----------------------------------------------------------------------------

/**
 * A detected document section
 */
export interface DetectedSection {
  id: string;
  
  // Section identification
  number: string;          // e.g., "11.1.2"
  title: string;           // e.g., "Primary Efficacy Analysis"
  level: number;           // Hierarchy level (1, 2, 3, etc.)
  
  // Location
  pageStart: number;
  pageEnd: number;
  
  // Content boundaries (character offsets in full text)
  textStart?: number;
  textEnd?: number;
  
  // Hierarchy
  parentId?: string;
  childIds?: string[];
  
  // Section type classification
  sectionType?: SectionType;
  
  // ICH E3 mapping (for CSRs)
  ichE3Section?: string;   // Standard section mapping
  
  // Confidence
  confidence: number;
}

export type SectionType =
  // Front matter
  | 'title_page'
  | 'synopsis'
  | 'table_of_contents'
  | 'abbreviations'
  
  // ICH E3 main sections
  | 'introduction'
  | 'study_objectives'
  | 'investigational_plan'
  | 'study_patients'
  | 'efficacy_evaluation'
  | 'safety_evaluation'
  | 'discussion'
  | 'conclusions'
  
  // Back matter
  | 'references'
  | 'appendix'
  | 'listings'
  | 'figures'
  | 'tables'
  
  // Other
  | 'unknown';

// -----------------------------------------------------------------------------
// Bounding Box & Position Types
// -----------------------------------------------------------------------------

/**
 * Bounding box for positioned elements
 */
export interface BoundingBox {
  x: number;       // Left edge (points from page left)
  y: number;       // Top edge (points from page top)
  width: number;   // Width in points
  height: number;  // Height in points
  
  // Alternative representation
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

// -----------------------------------------------------------------------------
// Metadata Types
// -----------------------------------------------------------------------------

/**
 * PDF document metadata
 */
export interface PDFMetadata {
  // Standard PDF metadata
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;        // Creating application
  producer?: string;       // PDF producer
  creationDate?: string;
  modificationDate?: string;
  
  // PDF properties
  pdfVersion?: string;
  isEncrypted: boolean;
  isLinearized: boolean;
  hasOutline: boolean;     // Bookmarks
  hasAcroForm: boolean;    // Form fields
  
  // Document properties
  language?: string;
  pageLayout?: string;
  pageMode?: string;
  
  // Custom metadata
  customProperties?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Quality Assessment Types
// -----------------------------------------------------------------------------

/**
 * Quality assessment of extraction
 */
export interface ExtractionQuality {
  overallScore: number;    // 0-1
  
  // Component scores
  textQuality: number;
  tableQuality: number;
  figureQuality: number;
  structureQuality: number;
  
  // Issues detected
  issues: QualityIssue[];
  
  // Recommendations
  recommendations: string[];
}

export interface QualityIssue {
  type: QualityIssueType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  pageNumbers?: number[];
  affectedElements?: string[];
}

export type QualityIssueType =
  | 'low_resolution'
  | 'poor_ocr'
  | 'missing_text'
  | 'garbled_text'
  | 'table_detection_failed'
  | 'table_structure_unclear'
  | 'figure_extraction_failed'
  | 'section_detection_failed'
  | 'font_encoding_issue'
  | 'image_only_page'
  | 'password_protected'
  | 'corrupted_content';

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export interface ExtractionError {
  code: string;
  message: string;
  pageNumber?: number;
  element?: string;
  fatal: boolean;
}

export interface ExtractionWarning {
  code: string;
  message: string;
  pageNumber?: number;
  element?: string;
}

// -----------------------------------------------------------------------------
// Extraction Options
// -----------------------------------------------------------------------------

/**
 * Options for PDF extraction
 */
export interface PDFExtractionOptions {
  // What to extract
  extractText?: boolean;
  extractTables?: boolean;
  extractFigures?: boolean;
  detectSections?: boolean;
  
  // Page range
  pageStart?: number;
  pageEnd?: number;
  pages?: number[];        // Specific pages
  
  // Text options
  preserveFormatting?: boolean;
  detectColumns?: boolean;
  
  // Table options
  tableDetectionMethod?: TableDetectionMethod;
  minTableRows?: number;
  minTableCols?: number;
  
  // Figure options
  extractImages?: boolean;
  imageFormat?: ImageFormat;
  minImageSize?: number;   // Minimum pixels
  maxImageSize?: number;   // Maximum pixels
  
  // OCR options
  enableOcr?: boolean;
  ocrLanguage?: string;
  ocrDpi?: number;
  
  // Vision API options
  useVisionApi?: boolean;
  visionModel?: string;
  
  // Performance
  timeout?: number;        // Max processing time (ms)
  maxPages?: number;       // Max pages to process
}

export type TableDetectionMethod =
  | 'rule_based'     // Traditional line/border detection
  | 'ml_based'       // Machine learning model
  | 'vision'         // Claude Vision
  | 'hybrid';        // Combination

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * PDF Extraction Service interface
 * Implementation planned for v0.18.x
 */
export interface IPDFExtractionService {
  // Full document extraction
  extractDocument(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedDocument>;
  
  // Text-only extraction (faster)
  extractText(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<PageText[]>;
  
  // Table-specific extraction
  extractTables(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedTable[]>;
  
  // Figure-specific extraction
  extractFigures(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<ExtractedFigure[]>;
  
  // Section detection only
  detectSections(
    file: File | Buffer | ArrayBuffer,
    options?: PDFExtractionOptions
  ): Promise<DetectedSection[]>;
  
  // Single page extraction
  extractPage(
    file: File | Buffer | ArrayBuffer,
    pageNumber: number,
    options?: PDFExtractionOptions
  ): Promise<ExtractedPage>;
  
  // Metadata extraction (fast)
  extractMetadata(
    file: File | Buffer | ArrayBuffer
  ): Promise<PDFMetadata>;
  
  // Quality assessment
  assessQuality(
    file: File | Buffer | ArrayBuffer
  ): Promise<ExtractionQuality>;
  
  // Health check
  healthCheck(): Promise<PDFExtractionHealthStatus>;
}

/**
 * Service health status
 */
export interface PDFExtractionHealthStatus {
  healthy: boolean;
  
  // Component availability
  nativeExtractionAvailable: boolean;
  ocrAvailable: boolean;
  visionApiAvailable: boolean;
  textractAvailable: boolean;
  
  // Performance stats
  avgExtractionTimeMs: number;
  avgPagesPerSecond: number;
  
  // Limits
  maxFileSizeMb: number;
  maxPageCount: number;
}

// -----------------------------------------------------------------------------
// Table Conversion Types (for output)
// -----------------------------------------------------------------------------

/**
 * Table output formats
 */
export type TableOutputFormat =
  | 'markdown'
  | 'html'
  | 'csv'
  | 'json'
  | 'latex'
  | 'docx_xml';

/**
 * Convert extracted table to output format
 */
export interface TableConversionOptions {
  format: TableOutputFormat;
  includeTitle?: boolean;
  includeFootnotes?: boolean;
  preserveMergedCells?: boolean;
  maxWidth?: number;       // For markdown tables
}

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

export const DEFAULT_EXTRACTION_OPTIONS: PDFExtractionOptions = {
  extractText: true,
  extractTables: true,
  extractFigures: false,   // Disabled by default (slower)
  detectSections: true,
  preserveFormatting: false,
  detectColumns: true,
  tableDetectionMethod: 'hybrid',
  minTableRows: 2,
  minTableCols: 2,
  enableOcr: false,        // Only enable when needed
  ocrLanguage: 'eng',
  ocrDpi: 300,
  useVisionApi: false,     // Only enable for complex tables
  timeout: 300000,         // 5 minutes
};

export const DEFAULT_TABLE_CONVERSION_OPTIONS: TableConversionOptions = {
  format: 'markdown',
  includeTitle: true,
  includeFootnotes: true,
  preserveMergedCells: false,
  maxWidth: 120,
};
