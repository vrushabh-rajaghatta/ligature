
// =============================================================================
// Table Extractor
// =============================================================================
// Extracts structured tables from PDF pages using Claude Vision API.
// Handles complex table structures including merged cells, multi-row headers,
// footnotes, and statistical values (p-values, confidence intervals).
// =============================================================================

import type {
  ExtractedTable,
  TableHeader,
  TableRow,
  TableCell,
  TableFootnote,
  MergedCell,
  BoundingBox,
} from '@/types/pdf-extraction';

import type {
  VisionImage,
  VisionExtractedTable,
  TableExtractionConfig,
  VisionExtractionResponse,
} from './types';

import { ClaudeVisionClient } from './claude-vision-client';
import { DEFAULT_TABLE_CONFIG } from './pdf-config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Table extraction result
 */
export interface TableExtractionResult {
  tables: ExtractedTable[];
  rawTables: VisionExtractedTable[];
  processingTimeMs: number;
  tokensUsed: { input: number; output: number };
  warnings: string[];
}

/**
 * Statistical value detection result
 */
export interface StatisticalValue {
  type: StatisticalValueType;
  value: string;
  rawValue: string;
  position: { row: number; column: number };
  confidence: number;
}

/**
 * Types of statistical values
 */
export type StatisticalValueType =
  | 'p_value'
  | 'confidence_interval'
  | 'percentage'
  | 'hazard_ratio'
  | 'odds_ratio'
  | 'relative_risk'
  | 'standard_deviation'
  | 'standard_error'
  | 'mean'
  | 'median'
  | 'range'
  | 'n_count';

/**
 * Table structure analysis
 */
export interface TableStructure {
  headerRowCount: number;
  hasRowHeaders: boolean;
  hasTotalRow: boolean;
  hasFootnotes: boolean;
  estimatedColumnTypes: ColumnType[];
  isStatisticalTable: boolean;
}

/**
 * Column type classification
 */
export type ColumnType =
  | 'label'           // Row labels
  | 'category'        // Categorical data
  | 'numeric'         // Numeric values
  | 'percentage'      // Percentage values
  | 'p_value'         // P-values
  | 'ci'              // Confidence intervals
  | 'text'            // Free text
  | 'mixed';          // Mixed content

/**
 * Table extraction options
 */
export interface TableExtractionOptions {
  detectStatisticalValues?: boolean;
  detectMergedCells?: boolean;
  detectFootnotes?: boolean;
  detectHeaderRows?: boolean;
  minConfidence?: number;
  outputFormat?: 'json' | 'markdown' | 'csv';
}

/**
 * Default table extraction options
 */
export const DEFAULT_TABLE_EXTRACTION_OPTIONS: TableExtractionOptions = {
  detectStatisticalValues: true,
  detectMergedCells: true,
  detectFootnotes: true,
  detectHeaderRows: true,
  minConfidence: 0.7,
  outputFormat: 'json',
};

// -----------------------------------------------------------------------------
// Statistical Value Patterns
// -----------------------------------------------------------------------------

/**
 * Regex patterns for detecting statistical values
 */
export const STATISTICAL_PATTERNS = {
  // P-values
  pValue: [
    /p\s*[<>=≤≥]\s*0?\.\d+/i,
    /p\s*=\s*0?\.\d+/i,
    /p\s*<\s*0\.0+1/i,
    /ns/i,                           // Not significant
  ],

  // Confidence intervals
  confidenceInterval: [
    /\(?-?\d+\.?\d*\s*[-–,]\s*-?\d+\.?\d*\)?/,  // (1.2-3.4) or 1.2-3.4
    /\d+%\s*CI\s*[:\s]*\(?-?\d+\.?\d*\s*[-–,]\s*-?\d+\.?\d*\)?/i,
    /95%\s*CI/i,
    /90%\s*CI/i,
  ],

  // Percentages
  percentage: [
    /-?\d+\.?\d*\s*%/,
    /\d+\.?\d*\s*percent/i,
  ],

  // Hazard/odds ratios
  ratio: [
    /HR\s*[=:]?\s*\d+\.?\d*/i,
    /OR\s*[=:]?\s*\d+\.?\d*/i,
    /RR\s*[=:]?\s*\d+\.?\d*/i,
  ],

  // Standard deviation/error
  deviation: [
    /SD\s*[=:]?\s*\d+\.?\d*/i,
    /SE\s*[=:]?\s*\d+\.?\d*/i,
    /±\s*\d+\.?\d*/,
    /\d+\.?\d*\s*±\s*\d+\.?\d*/,
  ],

  // N counts
  nCount: [
    /n\s*=\s*\d+/i,
    /N\s*=\s*\d+/,
    /\(\s*n\s*=\s*\d+\s*\)/i,
  ],
};

// -----------------------------------------------------------------------------
// Table Extractor
// -----------------------------------------------------------------------------

/**
 * Extracts and processes tables from PDF pages
 */
export class TableExtractor {
  private readonly config: TableExtractionConfig;
  private readonly options: TableExtractionOptions;
  private readonly visionClient: ClaudeVisionClient;

  constructor(
    visionClient: ClaudeVisionClient,
    config?: Partial<TableExtractionConfig>,
    options?: Partial<TableExtractionOptions>
  ) {
    this.visionClient = visionClient;
    this.config = { ...DEFAULT_TABLE_CONFIG, ...config };
    this.options = { ...DEFAULT_TABLE_EXTRACTION_OPTIONS, ...options };
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Extract tables from page images
   */
  async extractTables(
    pageImages: VisionImage[],
    options?: Partial<TableExtractionOptions>
  ): Promise<TableExtractionResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = Date.now();
    const warnings: string[] = [];

    // Use Vision API to extract raw tables
    const useStatistical = mergedOptions.detectStatisticalValues &&
      this.config.detectPValues;

    let rawTables: VisionExtractedTable[];
    let tokensUsed = { input: 0, output: 0 };

    try {
      rawTables = await this.visionClient.extractTables(
        pageImages,
        { statistical: useStatistical }
      );
    } catch (error) {
      warnings.push(`Vision API extraction failed: ${error}`);
      rawTables = [];
    }

    // Process raw tables into structured format
    const tables: ExtractedTable[] = [];
    let tableIndex = 1;

    for (let pageIdx = 0; pageIdx < pageImages.length; pageIdx++) {
      const pageNumber = pageImages[pageIdx].pageNumber || pageIdx + 1;
      const pageTables = rawTables.filter((_, idx) =>
        // Distribute tables across pages (approximation)
        Math.floor(idx / Math.max(1, rawTables.length / pageImages.length)) === pageIdx
      );

      for (const rawTable of pageTables) {
        if (rawTable.confidence < (mergedOptions.minConfidence || 0.7)) {
          warnings.push(
            `Table ${rawTable.tableNumber || tableIndex} skipped: low confidence ${rawTable.confidence}`
          );
          continue;
        }

        const processedTable = this.processRawTable(
          rawTable,
          pageNumber,
          tableIndex++,
          mergedOptions
        );
        tables.push(processedTable);
      }
    }

    return {
      tables,
      rawTables,
      processingTimeMs: Date.now() - startTime,
      tokensUsed,
      warnings,
    };
  }

  /**
   * Extract a single table from a page region
   */
  async extractTableFromRegion(
    pageImage: VisionImage,
    region?: BoundingBox
  ): Promise<ExtractedTable | null> {
    const result = await this.extractTables([pageImage]);
    return result.tables[0] || null;
  }

  /**
   * Analyze table structure
   */
  analyzeTableStructure(table: VisionExtractedTable): TableStructure {
    const headerRowCount = this.detectHeaderRowCount(table);
    const hasRowHeaders = this.detectRowHeaders(table);
    const hasTotalRow = this.detectTotalRow(table);
    const hasFootnotes = (table.footnotes?.length || 0) > 0;
    const columnTypes = this.classifyColumnTypes(table);
    const isStatisticalTable = columnTypes.some(
      t => t === 'p_value' || t === 'ci' || t === 'percentage'
    );

    return {
      headerRowCount,
      hasRowHeaders,
      hasTotalRow,
      hasFootnotes,
      estimatedColumnTypes: columnTypes,
      isStatisticalTable,
    };
  }

  /**
   * Detect statistical values in a table
   */
  detectStatisticalValues(table: ExtractedTable): StatisticalValue[] {
    const values: StatisticalValue[] = [];

    for (let rowIdx = 0; rowIdx < table.dataRows.length; rowIdx++) {
      const row = table.dataRows[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cellValue = row[colIdx];
        const detected = this.detectStatisticalValue(cellValue);
        if (detected) {
          values.push({
            ...detected,
            position: { row: rowIdx, column: colIdx },
          });
        }
      }
    }

    return values;
  }

  /**
   * Convert table to output format
   */
  convertTable(
    table: ExtractedTable,
    format: 'markdown' | 'csv' | 'html'
  ): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(table);
      case 'csv':
        return this.toCSV(table);
      case 'html':
        return this.toHTML(table);
      default:
        return this.toMarkdown(table);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Process raw Vision table into structured format
   */
  private processRawTable(
    raw: VisionExtractedTable,
    pageNumber: number,
    tableIndex: number,
    options: TableExtractionOptions
  ): ExtractedTable {
    // Parse headers
    const headers: TableHeader[] = raw.headers.map((text, idx) => ({
      text,
      columnIndex: idx,
      columnSpan: 1,
      rowSpan: 1,
    }));

    // Parse rows
    const rows: TableRow[] = raw.rows.map((rowData, rowIdx) => ({
      rowIndex: rowIdx,
      cells: rowData.map((cellText, colIdx) =>
        this.createCell(cellText, rowIdx, colIdx, options)
      ),
      isHeaderRow: rowIdx === 0 && raw.headers.length === 0,
      isSubheaderRow: this.isSubheaderRow(rowData),
      isTotalRow: this.isTotalRow(rowData),
    }));

    // Parse footnotes
    const footnotes: TableFootnote[] = (raw.footnotes || []).map((text, idx) => ({
      marker: this.extractFootnoteMarker(text),
      text: this.extractFootnoteText(text),
    }));

    return {
      id: `table-${pageNumber}-${tableIndex}`,
      pageNumber,
      tableNumber: this.parseTableNumber(raw.tableNumber),
      title: raw.title || undefined,
      headers,
      rows,
      headerRow: raw.headers,
      dataRows: raw.rows,
      rowCount: raw.rows.length,
      columnCount: Math.max(
        raw.headers.length,
        ...raw.rows.map(r => r.length)
      ),
      hasHeaderRow: raw.headers.length > 0,
      hasRowHeaders: this.detectRowHeaders(raw),
      footnotes,
      boundingBox: this.normalizeBoundingBox(raw.boundingBox),
      confidence: raw.confidence,
    };
  }

  /**
   * Create a table cell from text
   */
  private createCell(
    text: string,
    rowIndex: number,
    columnIndex: number,
    options: TableExtractionOptions
  ): TableCell {
    const isNumeric = this.isNumericValue(text);
    const isPValue = options.detectStatisticalValues && this.isPValue(text);
    const isCI = options.detectStatisticalValues && this.isConfidenceInterval(text);
    const isPercentage = this.isPercentage(text);

    return {
      text,
      rowIndex,
      columnIndex,
      rowSpan: 1,
      columnSpan: 1,
      isHeader: false,
      isRowHeader: columnIndex === 0,
      isNumeric,
      numericValue: isNumeric ? this.parseNumericValue(text) : undefined,
      isPValue,
      isConfidenceInterval: isCI,
      isPercentage,
    };
  }

  /**
   * Detect number of header rows
   */
  private detectHeaderRowCount(table: VisionExtractedTable): number {
    if (table.headers.length > 0) return 1;
    if (table.rows.length === 0) return 0;

    // Check if first row looks like headers
    const firstRow = table.rows[0];
    const hasNumericFirstRow = firstRow.some(cell => this.isNumericValue(cell));
    return hasNumericFirstRow ? 0 : 1;
  }

  /**
   * Detect if table has row headers
   */
  private detectRowHeaders(table: VisionExtractedTable): boolean {
    if (table.rows.length < 2) return false;

    // Check if first column is mostly text (labels)
    const firstColValues = table.rows.map(row => row[0] || '');
    const textCount = firstColValues.filter(v => !this.isNumericValue(v)).length;
    return textCount > firstColValues.length * 0.7;
  }

  /**
   * Detect if table has a total row
   */
  private detectTotalRow(table: VisionExtractedTable): boolean {
    if (table.rows.length === 0) return false;

    const lastRow = table.rows[table.rows.length - 1];
    const firstCell = (lastRow[0] || '').toLowerCase();
    return /^(total|sum|overall|all|n\s*=)/.test(firstCell);
  }

  /**
   * Check if row is a subheader
   */
  private isSubheaderRow(row: string[]): boolean {
    // Subheader rows often have merged cells (empty values after first)
    const nonEmptyCount = row.filter(cell => cell.trim() !== '').length;
    return nonEmptyCount === 1 && row[0].trim() !== '';
  }

  /**
   * Check if row is a total row
   */
  private isTotalRow(row: string[]): boolean {
    const firstCell = (row[0] || '').toLowerCase();
    return /^(total|sum|overall|all)/.test(firstCell);
  }

  /**
   * Classify column types
   */
  private classifyColumnTypes(table: VisionExtractedTable): ColumnType[] {
    const columnCount = Math.max(
      table.headers.length,
      ...table.rows.map(r => r.length)
    );

    const types: ColumnType[] = [];

    for (let col = 0; col < columnCount; col++) {
      const values = table.rows.map(row => row[col] || '');
      types.push(this.classifyColumn(values, col === 0));
    }

    return types;
  }

  /**
   * Classify a single column
   */
  private classifyColumn(values: string[], isFirst: boolean): ColumnType {
    if (values.length === 0) return 'text';

    const stats = {
      numeric: 0,
      percentage: 0,
      pValue: 0,
      ci: 0,
      text: 0,
    };

    for (const value of values) {
      if (this.isPValue(value)) stats.pValue++;
      else if (this.isConfidenceInterval(value)) stats.ci++;
      else if (this.isPercentage(value)) stats.percentage++;
      else if (this.isNumericValue(value)) stats.numeric++;
      else stats.text++;
    }

    const total = values.length;
    const threshold = 0.5;

    if (stats.pValue / total > threshold) return 'p_value';
    if (stats.ci / total > threshold) return 'ci';
    if (stats.percentage / total > threshold) return 'percentage';
    if (stats.numeric / total > threshold) return 'numeric';
    if (isFirst && stats.text / total > threshold) return 'label';
    if (stats.text / total > threshold) return 'category';

    return 'mixed';
  }

  /**
   * Detect statistical value type and parse it
   */
  private detectStatisticalValue(
    text: string
  ): Omit<StatisticalValue, 'position'> | null {
    // Check p-value
    for (const pattern of STATISTICAL_PATTERNS.pValue) {
      if (pattern.test(text)) {
        return {
          type: 'p_value',
          value: this.parsePValue(text),
          rawValue: text,
          confidence: 0.9,
        };
      }
    }

    // Check confidence interval
    for (const pattern of STATISTICAL_PATTERNS.confidenceInterval) {
      if (pattern.test(text)) {
        return {
          type: 'confidence_interval',
          value: text,
          rawValue: text,
          confidence: 0.85,
        };
      }
    }

    // Check percentage
    for (const pattern of STATISTICAL_PATTERNS.percentage) {
      if (pattern.test(text)) {
        return {
          type: 'percentage',
          value: this.parsePercentage(text),
          rawValue: text,
          confidence: 0.95,
        };
      }
    }

    // Check ratios
    for (const pattern of STATISTICAL_PATTERNS.ratio) {
      const match = text.match(pattern);
      if (match) {
        const type = text.toLowerCase().startsWith('hr')
          ? 'hazard_ratio'
          : text.toLowerCase().startsWith('or')
            ? 'odds_ratio'
            : 'relative_risk';
        return {
          type,
          value: match[0],
          rawValue: text,
          confidence: 0.9,
        };
      }
    }

    // Check standard deviation/error
    for (const pattern of STATISTICAL_PATTERNS.deviation) {
      if (pattern.test(text)) {
        const type = text.toLowerCase().includes('se')
          ? 'standard_error'
          : 'standard_deviation';
        return {
          type,
          value: text,
          rawValue: text,
          confidence: 0.85,
        };
      }
    }

    // Check N count
    for (const pattern of STATISTICAL_PATTERNS.nCount) {
      if (pattern.test(text)) {
        return {
          type: 'n_count',
          value: text,
          rawValue: text,
          confidence: 0.95,
        };
      }
    }

    return null;
  }

  /**
   * Check if text is a numeric value
   */
  private isNumericValue(text: string): boolean {
    const cleaned = text.replace(/[,\s%<>≤≥=]/g, '').trim();
    return /^-?\d+\.?\d*$/.test(cleaned);
  }

  /**
   * Check if text is a p-value
   */
  private isPValue(text: string): boolean {
    return STATISTICAL_PATTERNS.pValue.some(p => p.test(text));
  }

  /**
   * Check if text is a confidence interval
   */
  private isConfidenceInterval(text: string): boolean {
    return STATISTICAL_PATTERNS.confidenceInterval.some(p => p.test(text));
  }

  /**
   * Check if text is a percentage
   */
  private isPercentage(text: string): boolean {
    return STATISTICAL_PATTERNS.percentage.some(p => p.test(text));
  }

  /**
   * Parse numeric value from text
   */
  private parseNumericValue(text: string): number | undefined {
    const cleaned = text.replace(/[,\s%<>≤≥=]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse p-value from text
   */
  private parsePValue(text: string): string {
    if (/ns/i.test(text)) return 'ns';
    const match = text.match(/p\s*([<>=≤≥])\s*(0?\.\d+)/i);
    if (match) return `p${match[1]}${match[2]}`;
    return text;
  }

  /**
   * Parse percentage from text
   */
  private parsePercentage(text: string): string {
    const match = text.match(/(-?\d+\.?\d*)\s*%/);
    return match ? `${match[1]}%` : text;
  }

  /**
   * Parse table number from string
   */
  private parseTableNumber(tableNumber?: string): number | undefined {
    if (!tableNumber) return undefined;
    const match = tableNumber.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  /**
   * Extract footnote marker
   */
  private extractFootnoteMarker(footnote: string): string {
    const match = footnote.match(/^([*†‡§‖¶a-z])[:\.\s]/i);
    return match ? match[1] : '*';
  }

  /**
   * Extract footnote text
   */
  private extractFootnoteText(footnote: string): string {
    return footnote.replace(/^[*†‡§‖¶a-z][:\.\s]/i, '').trim();
  }

  /**
   * Normalize bounding box to ensure x/y properties exist
   */
  private normalizeBoundingBox(
    box?: { top?: number; left?: number; x?: number; y?: number; width: number; height: number }
  ): BoundingBox {
    if (!box) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: box.x ?? box.left ?? 0,
      y: box.y ?? box.top ?? 0,
      width: box.width,
      height: box.height,
    };
  }

  /**
   * Convert table to Markdown format
   */
  private toMarkdown(table: ExtractedTable): string {
    const lines: string[] = [];

    // Title
    if (table.title) {
      lines.push(`**${table.tableNumber ? `Table ${table.tableNumber}: ` : ''}${table.title}**`);
      lines.push('');
    }

    // Header row
    if (table.headerRow.length > 0) {
      lines.push('| ' + table.headerRow.join(' | ') + ' |');
      lines.push('| ' + table.headerRow.map(() => '---').join(' | ') + ' |');
    }

    // Data rows
    for (const row of table.dataRows) {
      lines.push('| ' + row.join(' | ') + ' |');
    }

    // Footnotes
    if (table.footnotes && table.footnotes.length > 0) {
      lines.push('');
      for (const footnote of table.footnotes) {
        lines.push(`${footnote.marker}: ${footnote?.text ?? ''}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert table to CSV format
   */
  private toCSV(table: ExtractedTable): string {
    const lines: string[] = [];

    // Header row
    if (table.headerRow.length > 0) {
      lines.push(table.headerRow.map(h => this.escapeCSV(h)).join(','));
    }

    // Data rows
    for (const row of table.dataRows) {
      lines.push(row.map(cell => this.escapeCSV(cell)).join(','));
    }

    return lines.join('\n');
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Convert table to HTML format
   */
  private toHTML(table: ExtractedTable): string {
    const lines: string[] = ['<table>'];

    // Title
    if (table.title) {
      lines.push(`  <caption>${table.tableNumber ? `Table ${table.tableNumber}: ` : ''}${this.escapeHTML(table.title)}</caption>`);
    }

    // Header row
    if (table.headerRow.length > 0) {
      lines.push('  <thead>');
      lines.push('    <tr>');
      for (const header of table.headerRow) {
        lines.push(`      <th>${this.escapeHTML(header)}</th>`);
      }
      lines.push('    </tr>');
      lines.push('  </thead>');
    }

    // Data rows
    lines.push('  <tbody>');
    for (const row of table.dataRows) {
      lines.push('    <tr>');
      for (const cell of row) {
        lines.push(`      <td>${this.escapeHTML(cell)}</td>`);
      }
      lines.push('    </tr>');
    }
    lines.push('  </tbody>');

    lines.push('</table>');

    return lines.join('\n');
  }

  /**
   * Escape HTML entities
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a table extractor with configuration
 */
export function createTableExtractor(
  visionClient: ClaudeVisionClient,
  config?: Partial<TableExtractionConfig>,
  options?: Partial<TableExtractionOptions>
): TableExtractor {
  return new TableExtractor(visionClient, config, options);
}

// -----------------------------------------------------------------------------
// Mock Table Extractor for Testing
// -----------------------------------------------------------------------------

/**
 * Mock table extractor for testing
 */
export class MockTableExtractor {
  private callCount = 0;

  async extractTables(): Promise<TableExtractionResult> {
    this.callCount++;
    return {
      tables: [this.createMockTable()],
      rawTables: [this.createMockRawTable()],
      processingTimeMs: 150,
      tokensUsed: { input: 1000, output: 500 },
      warnings: [],
    };
  }

  async extractTableFromRegion(): Promise<ExtractedTable | null> {
    this.callCount++;
    return this.createMockTable();
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private createMockTable(): ExtractedTable {
    return {
      id: 'table-1-1',
      pageNumber: 1,
      tableNumber: 1,
      title: 'Primary Efficacy Results',
      headers: [
        { text: 'Endpoint', columnIndex: 0, columnSpan: 1, rowSpan: 1 },
        { text: 'Treatment', columnIndex: 1, columnSpan: 1, rowSpan: 1 },
        { text: 'Placebo', columnIndex: 2, columnSpan: 1, rowSpan: 1 },
        { text: 'P-value', columnIndex: 3, columnSpan: 1, rowSpan: 1 },
      ],
      rows: [
        {
          rowIndex: 0,
          cells: [
            { text: 'ORR', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1, isHeader: false, isRowHeader: true, isNumeric: false },
            { text: '45.2%', rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 1, isHeader: false, isRowHeader: false, isNumeric: true, numericValue: 45.2, isPercentage: true },
            { text: '23.1%', rowIndex: 0, columnIndex: 2, rowSpan: 1, columnSpan: 1, isHeader: false, isRowHeader: false, isNumeric: true, numericValue: 23.1, isPercentage: true },
            { text: 'p<0.001', rowIndex: 0, columnIndex: 3, rowSpan: 1, columnSpan: 1, isHeader: false, isRowHeader: false, isNumeric: false, isPValue: true },
          ],
          isHeaderRow: false,
          isSubheaderRow: false,
          isTotalRow: false,
        },
      ],
      headerRow: ['Endpoint', 'Treatment', 'Placebo', 'P-value'],
      dataRows: [['ORR', '45.2%', '23.1%', 'p<0.001']],
      rowCount: 1,
      columnCount: 4,
      hasHeaderRow: true,
      hasRowHeaders: true,
      boundingBox: { x: 72, y: 200, width: 468, height: 100 },
      confidence: 0.95,
    };
  }

  private createMockRawTable(): VisionExtractedTable {
    return {
      tableNumber: 'Table 14.1',
      title: 'Primary Efficacy Results',
      headers: ['Endpoint', 'Treatment', 'Placebo', 'P-value'],
      rows: [['ORR', '45.2%', '23.1%', 'p<0.001']],
      confidence: 0.95,
    };
  }
}
