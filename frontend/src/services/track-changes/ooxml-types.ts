
// =============================================================================
// OOXML Types for Track Changes
// =============================================================================
// Microsoft Word OOXML structure types for generating documents with
// tracked changes, comments, and revision marks.
// =============================================================================

import type {
  RevisionType,
  RevisionStatus,
  ChangeAuthor,
} from '@/types/track-changes';

// -----------------------------------------------------------------------------
// Document Structure Types
// -----------------------------------------------------------------------------

/**
 * Complete OOXML document structure
 */
export interface OOXMLDocument {
  // Document properties
  properties: DocumentProperties;
  
  // Settings (track changes, protection, etc.)
  settings: DocumentSettings;
  
  // Styles
  styles: OOXMLStyle[];
  
  // Numbering definitions
  numbering: NumberingDefinition[];
  
  // Document body
  body: OOXMLBody;
  
  // Comments (separate part)
  comments: OOXMLComment[];
  
  // Footnotes
  footnotes: OOXMLFootnote[];
  
  // Endnotes
  endnotes: OOXMLEndnote[];
  
  // Headers
  headers: OOXMLHeader[];
  
  // Footers
  footers: OOXMLFooter[];
  
  // Relationships
  relationships: OOXMLRelationship[];
}

/**
 * Document properties (core.xml + app.xml)
 */
export interface DocumentProperties {
  // Core properties
  title?: string;
  subject?: string;
  creator?: string;
  keywords?: string;
  description?: string;
  lastModifiedBy?: string;
  revision?: number;
  created?: Date;
  modified?: Date;
  
  // App properties
  application?: string;
  appVersion?: string;
  company?: string;
  manager?: string;
  
  // Custom properties
  custom?: Record<string, string | number | boolean | Date>;
}

/**
 * Document settings (settings.xml)
 */
export interface DocumentSettings {
  // Track changes
  trackRevisions: boolean;
  trackFormatting: boolean;
  trackMoves: boolean;
  
  // Revision view
  showRevisions: boolean;
  showComments: boolean;
  showInkAnnotations: boolean;
  
  // Document protection
  protection?: DocumentProtectionSettings;
  
  // Default zoom
  zoom?: number;
  zoomType?: 'none' | 'fullPage' | 'bestFit' | 'textFit';
  
  // Compatibility
  compatibilityMode?: number; // 15 = Word 2013+
  
  // RSID (revision save ID) tracking
  rsidRoot?: string;
}

/**
 * Document protection settings
 */
export interface DocumentProtectionSettings {
  type: 'none' | 'readOnly' | 'comments' | 'trackedChanges' | 'forms';
  password?: string; // Hashed password
  algorithm?: string;
  salt?: string;
  spinCount?: number;
  enforcement?: boolean;
}

// -----------------------------------------------------------------------------
// Body Content Types
// -----------------------------------------------------------------------------

/**
 * Document body
 */
export interface OOXMLBody {
  // Content elements
  content: OOXMLBlockElement[];
  
  // Section properties (page setup, columns, etc.)
  sectionProperties?: SectionProperties;
}

/**
 * Block-level elements
 */
export type OOXMLBlockElement =
  | OOXMLParagraph
  | OOXMLTable
  | OOXMLSectionBreak
  | OOXMLBookmarkStart
  | OOXMLBookmarkEnd
  | OOXMLCommentRangeStart
  | OOXMLCommentRangeEnd;

/**
 * Paragraph element (w:p)
 */
export interface OOXMLParagraph {
  type: 'paragraph';
  
  // Paragraph ID (for tracking)
  id?: string;
  rsidR?: string; // Revision save ID - added
  rsidRPr?: string; // Revision save ID - properties
  rsidP?: string; // Revision save ID - paragraph properties
  
  // Paragraph properties
  properties?: ParagraphProperties;
  
  // Content (runs and other inline elements)
  content: OOXMLInlineElement[];
}

/**
 * Paragraph properties (w:pPr)
 */
export interface ParagraphProperties {
  // Style reference
  styleId?: string;
  
  // Alignment
  alignment?: 'left' | 'center' | 'right' | 'justify' | 'distribute';
  
  // Indentation
  indentation?: {
    left?: number; // Twips (1/20 of a point)
    right?: number;
    firstLine?: number;
    hanging?: number;
  };
  
  // Spacing
  spacing?: {
    before?: number; // Twips
    after?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  };
  
  // Outline level (for headings)
  outlineLevel?: number;
  
  // Keep with next/keep lines together
  keepNext?: boolean;
  keepLines?: boolean;
  
  // Page break before
  pageBreakBefore?: boolean;
  
  // Numbering
  numberingId?: string;
  numberingLevel?: number;
  
  // Borders
  borders?: ParagraphBorders;
  
  // Shading
  shading?: Shading;
  
  // Tab stops
  tabs?: TabStop[];
  
  // Revision tracking for properties
  pPrChange?: ParagraphPropertiesRevision;
}

/**
 * Paragraph borders
 */
export interface ParagraphBorders {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
  between?: Border;
  bar?: Border;
}

/**
 * Border definition
 */
export interface Border {
  style: BorderStyle;
  width?: number; // Eighths of a point
  color?: string; // Hex color or 'auto'
  space?: number; // Points
}

/**
 * Border styles
 */
export type BorderStyle =
  | 'nil'
  | 'none'
  | 'single'
  | 'thick'
  | 'double'
  | 'dotted'
  | 'dashed'
  | 'dashDotStroked'
  | 'triple'
  | 'wave'
  | 'doubleWave';

/**
 * Shading definition
 */
export interface Shading {
  fill?: string; // Background color
  color?: string; // Pattern color
  pattern?: string;
}

/**
 * Tab stop definition
 */
export interface TabStop {
  position: number; // Twips
  type: 'left' | 'center' | 'right' | 'decimal' | 'bar' | 'clear';
  leader?: 'none' | 'dot' | 'hyphen' | 'underscore' | 'middleDot';
}

// -----------------------------------------------------------------------------
// Inline Content Types
// -----------------------------------------------------------------------------

/**
 * Inline elements within a paragraph
 */
export type OOXMLInlineElement =
  | OOXMLRun
  | OOXMLInsertion
  | OOXMLDeletion
  | OOXMLMoveFrom
  | OOXMLMoveTo
  | OOXMLHyperlink
  | OOXMLBookmarkStart
  | OOXMLBookmarkEnd
  | OOXMLCommentRangeStart
  | OOXMLCommentRangeEnd
  | OOXMLCommentReference
  | OOXMLFieldCode
  | OOXMLFieldChar;

/**
 * Text run (w:r)
 */
export interface OOXMLRun {
  type: 'run';
  
  // Run ID for tracking
  rsidR?: string;
  rsidRPr?: string;
  
  // Run properties
  properties?: RunProperties;
  
  // Content
  content: OOXMLRunContent[];
}

/**
 * Run content elements
 */
export type OOXMLRunContent =
  | OOXMLText
  | OOXMLBreak
  | OOXMLTab
  | OOXMLSymbol
  | OOXMLDrawing
  | OOXMLFootnoteReference
  | OOXMLEndnoteReference
  | OOXMLCommentReference;

/**
 * Text content (w:t)
 */
export interface OOXMLText {
  type: 'text';
  value: string;
  preserveSpace?: boolean;
}

/**
 * Break (w:br)
 */
export interface OOXMLBreak {
  type: 'break';
  breakType?: 'line' | 'page' | 'column' | 'textWrapping';
  clear?: 'none' | 'left' | 'right' | 'all';
}

/**
 * Tab character (w:tab)
 */
export interface OOXMLTab {
  type: 'tab';
}

/**
 * Symbol (w:sym)
 */
export interface OOXMLSymbol {
  type: 'symbol';
  font: string;
  char: string; // Hex character code
}

/**
 * Drawing/image placeholder
 */
export interface OOXMLDrawing {
  type: 'drawing';
  relationshipId: string;
  width?: number; // EMUs
  height?: number;
  altText?: string;
  inline?: boolean;
}

/**
 * Run properties (w:rPr)
 */
export interface RunProperties {
  // Style reference
  styleId?: string;
  
  // Font
  fontName?: string;
  fontNameAscii?: string;
  fontNameEastAsia?: string;
  fontNameComplex?: string;
  fontSize?: number; // Half-points
  fontSizeComplex?: number;
  
  // Basic formatting
  bold?: boolean;
  boldComplex?: boolean;
  italic?: boolean;
  italicComplex?: boolean;
  
  // Underline
  underline?: UnderlineType;
  underlineColor?: string;
  
  // Strike through
  strike?: boolean;
  doubleStrike?: boolean;
  
  // Position
  verticalAlign?: 'baseline' | 'superscript' | 'subscript';
  position?: number; // Half-points (positive = raised)
  
  // Color
  color?: string; // Hex color
  
  // Highlight
  highlight?: HighlightColor;
  
  // Shading
  shading?: Shading;
  
  // Caps
  caps?: boolean;
  smallCaps?: boolean;
  
  // Spacing
  spacing?: number; // Twips (letter spacing)
  
  // Width scaling
  width?: number; // Percentage (100 = normal)
  
  // Language
  language?: string;
  languageEastAsia?: string;
  languageBidi?: string;
  
  // Revision tracking for properties
  rPrChange?: RunPropertiesRevision;
}

/**
 * Underline types
 */
export type UnderlineType =
  | 'none'
  | 'single'
  | 'words'
  | 'double'
  | 'thick'
  | 'dotted'
  | 'dottedHeavy'
  | 'dash'
  | 'dashLong'
  | 'dashDotHeavy'
  | 'dotDash'
  | 'dotDotDash'
  | 'wave'
  | 'wavyHeavy'
  | 'wavyDouble';

/**
 * Highlight colors
 */
export type HighlightColor =
  | 'black'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'magenta'
  | 'red'
  | 'yellow'
  | 'white'
  | 'darkBlue'
  | 'darkCyan'
  | 'darkGreen'
  | 'darkMagenta'
  | 'darkRed'
  | 'darkYellow'
  | 'darkGray'
  | 'lightGray'
  | 'none';

// -----------------------------------------------------------------------------
// Revision Types
// -----------------------------------------------------------------------------

/**
 * Insertion revision (w:ins)
 */
export interface OOXMLInsertion {
  type: 'insertion';
  id: number; // Revision ID
  author: string;
  date: Date;
  content: OOXMLRun[];
}

/**
 * Deletion revision (w:del)
 */
export interface OOXMLDeletion {
  type: 'deletion';
  id: number;
  author: string;
  date: Date;
  content: OOXMLDeletedContent[];
}

/**
 * Content within a deletion
 */
export interface OOXMLDeletedContent {
  type: 'deletedText' | 'deletedRun';
  properties?: RunProperties;
  text?: string;
}

/**
 * Move from marker (w:moveFrom)
 */
export interface OOXMLMoveFrom {
  type: 'moveFrom';
  id: number;
  author: string;
  date: Date;
  name: string; // Move name/ID for linking
  content: OOXMLRun[];
}

/**
 * Move to marker (w:moveTo)
 */
export interface OOXMLMoveTo {
  type: 'moveTo';
  id: number;
  author: string;
  date: Date;
  name: string; // Must match moveFrom name
  content: OOXMLRun[];
}

/**
 * Paragraph properties revision (w:pPrChange)
 */
export interface ParagraphPropertiesRevision {
  id: number;
  author: string;
  date: Date;
  previousProperties: ParagraphProperties;
}

/**
 * Run properties revision (w:rPrChange)
 */
export interface RunPropertiesRevision {
  id: number;
  author: string;
  date: Date;
  previousProperties: RunProperties;
}

// -----------------------------------------------------------------------------
// Comment Types
// -----------------------------------------------------------------------------

/**
 * Comment (in comments.xml)
 */
export interface OOXMLComment {
  id: number;
  author: string;
  date: Date;
  initials?: string;
  
  // Comment content (paragraphs)
  content: OOXMLParagraph[];
  
  // Reply to another comment
  parentId?: number;
  
  // Resolution status (extension)
  done?: boolean;
}

/**
 * Comment range start marker
 */
export interface OOXMLCommentRangeStart {
  type: 'commentRangeStart';
  id: number;
}

/**
 * Comment range end marker
 */
export interface OOXMLCommentRangeEnd {
  type: 'commentRangeEnd';
  id: number;
}

/**
 * Comment reference (in run)
 */
export interface OOXMLCommentReference {
  type: 'commentReference';
  id: number;
}

// -----------------------------------------------------------------------------
// Bookmark Types
// -----------------------------------------------------------------------------

/**
 * Bookmark start
 */
export interface OOXMLBookmarkStart {
  type: 'bookmarkStart';
  id: number;
  name: string;
}

/**
 * Bookmark end
 */
export interface OOXMLBookmarkEnd {
  type: 'bookmarkEnd';
  id: number;
}

// -----------------------------------------------------------------------------
// Table Types
// -----------------------------------------------------------------------------

/**
 * Table element (w:tbl)
 */
export interface OOXMLTable {
  type: 'table';
  
  // Table properties
  properties?: TableProperties;
  
  // Table grid (column widths)
  grid: TableGrid;
  
  // Rows
  rows: OOXMLTableRow[];
}

/**
 * Table properties (w:tblPr)
 */
export interface TableProperties {
  // Style
  styleId?: string;
  
  // Width
  width?: TableWidth;
  
  // Alignment
  alignment?: 'left' | 'center' | 'right';
  
  // Indentation
  indentation?: number;
  
  // Borders
  borders?: TableBorders;
  
  // Cell margins (default)
  cellMargins?: CellMargins;
  
  // Cell spacing
  cellSpacing?: number;
  
  // Layout
  layout?: 'fixed' | 'autofit';
  
  // Look (banded rows, etc.)
  look?: TableLook;
}

/**
 * Table width
 */
export interface TableWidth {
  value: number;
  type: 'auto' | 'dxa' | 'nil' | 'pct';
}

/**
 * Table borders
 */
export interface TableBorders {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
  insideH?: Border;
  insideV?: Border;
}

/**
 * Cell margins
 */
export interface CellMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Table look (conditional formatting flags)
 */
export interface TableLook {
  firstRow?: boolean;
  lastRow?: boolean;
  firstColumn?: boolean;
  lastColumn?: boolean;
  noHBand?: boolean;
  noVBand?: boolean;
}

/**
 * Table grid
 */
export interface TableGrid {
  columns: TableGridColumn[];
}

/**
 * Table grid column
 */
export interface TableGridColumn {
  width: number; // Twips
}

/**
 * Table row (w:tr)
 */
export interface OOXMLTableRow {
  type: 'tableRow';
  
  // Row properties
  properties?: TableRowProperties;
  
  // Cells
  cells: OOXMLTableCell[];
  
  // Revision tracking
  trPr?: TableRowPropertiesRevision;
  
  // Insertion/deletion tracking
  revision?: TableRowRevision;
}

/**
 * Table row properties
 */
export interface TableRowProperties {
  // Height
  height?: number;
  heightRule?: 'auto' | 'exact' | 'atLeast';
  
  // Header row
  headerRow?: boolean;
  
  // Can't split across pages
  cantSplit?: boolean;
}

/**
 * Table row properties revision
 */
export interface TableRowPropertiesRevision {
  id: number;
  author: string;
  date: Date;
}

/**
 * Table row revision (insertion/deletion)
 */
export interface TableRowRevision {
  type: 'insertion' | 'deletion';
  id: number;
  author: string;
  date: Date;
}

/**
 * Table cell (w:tc)
 */
export interface OOXMLTableCell {
  type: 'tableCell';
  
  // Cell properties
  properties?: TableCellProperties;
  
  // Content (paragraphs, tables, etc.)
  content: OOXMLBlockElement[];
  
  // Revision tracking
  revision?: TableCellRevision;
}

/**
 * Table cell properties
 */
export interface TableCellProperties {
  // Width
  width?: TableWidth;
  
  // Merge
  gridSpan?: number; // Horizontal merge
  vMerge?: 'restart' | 'continue'; // Vertical merge
  
  // Borders
  borders?: TableBorders;
  
  // Shading
  shading?: Shading;
  
  // Vertical alignment
  verticalAlignment?: 'top' | 'center' | 'bottom';
  
  // Text direction
  textDirection?: 'lrTb' | 'tbRl' | 'btLr' | 'lrTbV' | 'tbRlV';
  
  // No wrap
  noWrap?: boolean;
  
  // Cell margins
  margins?: CellMargins;
}

/**
 * Table cell revision
 */
export interface TableCellRevision {
  type: 'insertion' | 'deletion';
  id: number;
  author: string;
  date: Date;
}

// -----------------------------------------------------------------------------
// Section Types
// -----------------------------------------------------------------------------

/**
 * Section break
 */
export interface OOXMLSectionBreak {
  type: 'sectionBreak';
  breakType: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage' | 'nextColumn';
  properties?: SectionProperties;
}

/**
 * Section properties (w:sectPr)
 */
export interface SectionProperties {
  // Page size
  pageSize?: PageSize;
  
  // Page margins
  pageMargins?: PageMargins;
  
  // Columns
  columns?: ColumnDefinition;
  
  // Headers/footers
  headerReference?: HeaderFooterReference[];
  footerReference?: HeaderFooterReference[];
  
  // Page numbering
  pageNumbering?: PageNumbering;
  
  // Document grid
  docGrid?: DocumentGrid;
  
  // Line numbering
  lineNumbering?: LineNumbering;
}

/**
 * Page size
 */
export interface PageSize {
  width: number; // Twips
  height: number;
  orientation?: 'portrait' | 'landscape';
  code?: number; // Paper size code
}

/**
 * Page margins
 */
export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
  header?: number;
  footer?: number;
  gutter?: number;
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  count?: number;
  space?: number;
  equalWidth?: boolean;
  columns?: { width: number; space?: number }[];
  separator?: boolean;
}

/**
 * Header/footer reference
 */
export interface HeaderFooterReference {
  type: 'default' | 'first' | 'even';
  relationshipId: string;
}

/**
 * Page numbering
 */
export interface PageNumbering {
  format?: 'decimal' | 'upperRoman' | 'lowerRoman' | 'upperLetter' | 'lowerLetter';
  start?: number;
  chapStyle?: number;
  chapSep?: 'hyphen' | 'period' | 'colon' | 'emDash' | 'enDash';
}

/**
 * Document grid
 */
export interface DocumentGrid {
  type?: 'default' | 'lines' | 'linesAndChars' | 'snapToChars';
  linePitch?: number;
  charSpace?: number;
}

/**
 * Line numbering
 */
export interface LineNumbering {
  start?: number;
  countBy?: number;
  restart?: 'newPage' | 'newSection' | 'continuous';
  distance?: number;
}

// -----------------------------------------------------------------------------
// Header/Footer/Note Types
// -----------------------------------------------------------------------------

/**
 * Header (header.xml)
 */
export interface OOXMLHeader {
  type: 'default' | 'first' | 'even';
  content: OOXMLBlockElement[];
}

/**
 * Footer (footer.xml)
 */
export interface OOXMLFooter {
  type: 'default' | 'first' | 'even';
  content: OOXMLBlockElement[];
}

/**
 * Footnote (footnotes.xml)
 */
export interface OOXMLFootnote {
  id: number;
  type?: 'normal' | 'separator' | 'continuationSeparator';
  content: OOXMLParagraph[];
}

/**
 * Footnote reference in run
 */
export interface OOXMLFootnoteReference {
  type: 'footnoteReference';
  id: number;
}

/**
 * Endnote (endnotes.xml)
 */
export interface OOXMLEndnote {
  id: number;
  type?: 'normal' | 'separator' | 'continuationSeparator';
  content: OOXMLParagraph[];
}

/**
 * Endnote reference in run
 */
export interface OOXMLEndnoteReference {
  type: 'endnoteReference';
  id: number;
}

// -----------------------------------------------------------------------------
// Style Types
// -----------------------------------------------------------------------------

/**
 * Style definition (styles.xml)
 */
export interface OOXMLStyle {
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  styleId: string;
  name: string;
  basedOn?: string;
  next?: string;
  link?: string;
  isDefault?: boolean;
  isCustom?: boolean;
  uiPriority?: number;
  semiHidden?: boolean;
  unhideWhenUsed?: boolean;
  qFormat?: boolean;
  
  // Properties based on type
  paragraphProperties?: ParagraphProperties;
  runProperties?: RunProperties;
  tableProperties?: TableProperties;
  tableRowProperties?: TableRowProperties;
  tableCellProperties?: TableCellProperties;
}

// -----------------------------------------------------------------------------
// Numbering Types
// -----------------------------------------------------------------------------

/**
 * Numbering definition (numbering.xml)
 */
export interface NumberingDefinition {
  numId: string;
  abstractNumId: string;
  levels: NumberingLevel[];
}

/**
 * Numbering level
 */
export interface NumberingLevel {
  level: number;
  start: number;
  format: NumberFormat;
  text: string;
  alignment?: 'left' | 'center' | 'right';
  paragraphProperties?: ParagraphProperties;
  runProperties?: RunProperties;
}

/**
 * Number formats
 */
export type NumberFormat =
  | 'decimal'
  | 'upperRoman'
  | 'lowerRoman'
  | 'upperLetter'
  | 'lowerLetter'
  | 'bullet'
  | 'none';

// -----------------------------------------------------------------------------
// Field Types
// -----------------------------------------------------------------------------

/**
 * Field code (complex fields)
 */
export interface OOXMLFieldCode {
  type: 'fieldCode';
  code: string;
}

/**
 * Field character (begin/separate/end)
 */
export interface OOXMLFieldChar {
  type: 'fieldChar';
  charType: 'begin' | 'separate' | 'end';
  dirty?: boolean;
  locked?: boolean;
}

// -----------------------------------------------------------------------------
// Hyperlink Types
// -----------------------------------------------------------------------------

/**
 * Hyperlink
 */
export interface OOXMLHyperlink {
  type: 'hyperlink';
  relationshipId?: string;
  anchor?: string;
  tooltip?: string;
  content: OOXMLRun[];
}

// -----------------------------------------------------------------------------
// Relationship Types
// -----------------------------------------------------------------------------

/**
 * Relationship (for _rels files)
 */
export interface OOXMLRelationship {
  id: string;
  type: RelationshipType;
  target: string;
  targetMode?: 'Internal' | 'External';
}

/**
 * Relationship types
 */
export type RelationshipType =
  | 'officeDocument'
  | 'styles'
  | 'settings'
  | 'webSettings'
  | 'fontTable'
  | 'theme'
  | 'numbering'
  | 'footnotes'
  | 'endnotes'
  | 'comments'
  | 'header'
  | 'footer'
  | 'image'
  | 'hyperlink'
  | 'customXml';

// -----------------------------------------------------------------------------
// Helper Types
// -----------------------------------------------------------------------------

/**
 * Revision metadata (common fields)
 */
export interface RevisionMetadata {
  id: number;
  author: string;
  date: Date;
}

/**
 * Create revision metadata
 */
export function createRevisionMetadata(
  id: number,
  author: ChangeAuthor | string,
  date?: Date
): RevisionMetadata {
  return {
    id,
    author: typeof author === 'string' ? author : author.name,
    date: date ?? new Date(),
  };
}

/**
 * Generate a random RSID (8 hex characters)
 */
export function generateRsid(): string {
  return Math.random().toString(16).substring(2, 10).toUpperCase().padStart(8, '0');
}

/**
 * Convert points to twips (1 point = 20 twips)
 */
export function pointsToTwips(points: number): number {
  return Math.round(points * 20);
}

/**
 * Convert twips to points
 */
export function twipsToPoints(twips: number): number {
  return twips / 20;
}

/**
 * Convert inches to twips (1 inch = 1440 twips)
 */
export function inchesToTwips(inches: number): number {
  return Math.round(inches * 1440);
}

/**
 * Convert inches to EMUs (1 inch = 914400 EMUs)
 */
export function inchesToEmus(inches: number): number {
  return Math.round(inches * 914400);
}

/**
 * Convert centimeters to twips (1 cm = 567 twips)
 */
export function cmToTwips(cm: number): number {
  return Math.round(cm * 567);
}

/**
 * Default page size (Letter)
 */
export const DEFAULT_PAGE_SIZE: PageSize = {
  width: inchesToTwips(8.5),
  height: inchesToTwips(11),
  orientation: 'portrait',
};

/**
 * Default page margins (1 inch all around)
 */
export const DEFAULT_PAGE_MARGINS: PageMargins = {
  top: inchesToTwips(1),
  bottom: inchesToTwips(1),
  left: inchesToTwips(1),
  right: inchesToTwips(1),
  header: inchesToTwips(0.5),
  footer: inchesToTwips(0.5),
  gutter: 0,
};

/**
 * Standard colors for track changes
 */
export const TRACK_CHANGES_COLORS = {
  insertion: '2E74B5', // Blue
  deletion: 'C00000', // Red
  formatting: '7030A0', // Purple
  move: '00B050', // Green
  comment: 'FFFF00', // Yellow (highlight)
} as const;

/**
 * Author initials extraction
 */
export function getAuthorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
    .substring(0, 3);
}
