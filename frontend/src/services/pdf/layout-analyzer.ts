
// =============================================================================
// Layout Analyzer
// =============================================================================
// Analyzes PDF page layout to detect document structure, reading order,
// columns, headers, footers, and content regions.
// =============================================================================

import type {
  ExtractedPage,
  TextBlock,
  TextBlockType,
  BoundingBox,
  DetectedSection,
  SectionType,
} from '@/types/pdf-extraction';

import type {
  VisionImage,
  VisionDetectedSection,
  ProcessingConfig,
  VisionExtractionResponse,
} from './types';

import { ClaudeVisionClient } from './claude-vision-client';
import { DEFAULT_PROCESSING_CONFIG } from './pdf-config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Layout region detected on a page
 */
export interface LayoutRegion {
  id: string;
  type: LayoutRegionType;
  boundingBox: BoundingBox;
  confidence: number;
  content?: string;
  children?: LayoutRegion[];
}

/**
 * Types of layout regions
 */
export type LayoutRegionType =
  | 'header'
  | 'footer'
  | 'body'
  | 'sidebar'
  | 'column'
  | 'table'
  | 'figure'
  | 'caption'
  | 'footnote'
  | 'page_number'
  | 'margin_note'
  | 'watermark'
  | 'unknown';

/**
 * Column detection result
 */
export interface ColumnLayout {
  columnCount: number;
  columns: ColumnRegion[];
  gutter: number; // Space between columns
}

/**
 * A single column region
 */
export interface ColumnRegion {
  columnIndex: number;
  boundingBox: BoundingBox;
  textBlocks: TextBlock[];
}

/**
 * Reading order analysis result
 */
export interface ReadingOrderResult {
  blocks: OrderedBlock[];
  isMultiColumn: boolean;
  readingDirection: 'ltr' | 'rtl' | 'ttb';
}

/**
 * A block with reading order
 */
export interface OrderedBlock {
  block: TextBlock;
  readingOrder: number;
  columnIndex: number;
  regionType: LayoutRegionType;
}

/**
 * Page structure analysis
 */
export interface PageStructure {
  pageNumber: number;
  dimensions: { width: number; height: number };
  regions: LayoutRegion[];
  columns: ColumnLayout;
  readingOrder: ReadingOrderResult;
  sections: VisionDetectedSection[];
  hasHeader: boolean;
  hasFooter: boolean;
  hasPageNumber: boolean;
  headerHeight: number;
  footerHeight: number;
  margins: PageMargins;
}

/**
 * Page margins
 */
export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Layout analysis options
 */
export interface LayoutAnalysisOptions {
  detectColumns?: boolean;
  detectHeaders?: boolean;
  detectFooters?: boolean;
  detectSections?: boolean;
  detectReadingOrder?: boolean;
  sectionPatterns?: string[];
  minColumnWidth?: number;
  headerMaxHeight?: number;
  footerMaxHeight?: number;
}

/**
 * Section detection patterns for CSR documents
 */
export const ICH_E3_SECTION_PATTERNS = [
  /^(\d+\.?\d*\.?\d*)\s+(.+)$/,                    // 1. Title, 1.1 Section
  /^(SECTION|CHAPTER)\s+(\d+)/i,                   // SECTION 1
  /^(Synopsis|Introduction|Objectives?)/i,         // Named sections
  /^(Efficacy|Safety)\s+(Evaluation|Results)/i,   // Common CSR sections
  /^(Discussion|Conclusion)/i,                     // Closing sections
  /^(Appendix|Appendices)\s+([A-Z0-9])/i,         // Appendices
  /^(Table|Figure|Listing)\s+(\d+)/i,             // Numbered items
];

/**
 * Default layout analysis options
 */
export const DEFAULT_LAYOUT_OPTIONS: LayoutAnalysisOptions = {
  detectColumns: true,
  detectHeaders: true,
  detectFooters: true,
  detectSections: true,
  detectReadingOrder: true,
  sectionPatterns: ICH_E3_SECTION_PATTERNS.map(r => r.source),
  minColumnWidth: 100,      // Minimum column width in points
  headerMaxHeight: 72,      // 1 inch max header
  footerMaxHeight: 72,      // 1 inch max footer
};

// -----------------------------------------------------------------------------
// Layout Analyzer
// -----------------------------------------------------------------------------

/**
 * Analyzes PDF page layouts for document structure
 */
export class LayoutAnalyzer {
  private readonly config: ProcessingConfig;
  private readonly options: LayoutAnalysisOptions;
  private readonly visionClient?: ClaudeVisionClient;

  constructor(
    config?: Partial<ProcessingConfig>,
    options?: Partial<LayoutAnalysisOptions>,
    visionClient?: ClaudeVisionClient
  ) {
    this.config = { ...DEFAULT_PROCESSING_CONFIG, ...config };
    this.options = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
    this.visionClient = visionClient;
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Analyze layout of a single page
   */
  async analyzePage(
    pageImage: VisionImage,
    existingBlocks?: TextBlock[]
  ): Promise<PageStructure> {
    const startTime = Date.now();

    // Detect regions
    const regions = await this.detectRegions(pageImage, existingBlocks);

    // Detect columns
    const columns = this.options.detectColumns
      ? this.detectColumns(regions, existingBlocks || [])
      : { columnCount: 1, columns: [], gutter: 0 };

    // Detect sections using Vision API if available
    const sections = this.options.detectSections && this.visionClient
      ? await this.detectSectionsVision(pageImage)
      : this.detectSectionsLocal(existingBlocks || []);

    // Analyze reading order
    const readingOrder = this.options.detectReadingOrder
      ? this.analyzeReadingOrder(existingBlocks || [], columns, regions)
      : { blocks: [], isMultiColumn: false, readingDirection: 'ltr' as const };

    // Detect header/footer
    const { hasHeader, headerHeight } = this.detectHeader(regions);
    const { hasFooter, footerHeight } = this.detectFooter(regions);
    const hasPageNumber = this.detectPageNumber(regions);

    // Calculate margins
    const margins = this.calculateMargins(regions, {
      width: 612,  // Default US Letter width in points
      height: 792, // Default US Letter height in points
    });

    return {
      pageNumber: pageImage.pageNumber || 1,
      dimensions: { width: 612, height: 792 },
      regions,
      columns,
      readingOrder,
      sections,
      hasHeader,
      hasFooter,
      hasPageNumber,
      headerHeight,
      footerHeight,
      margins,
    };
  }

  /**
   * Analyze layout of multiple pages
   */
  async analyzePages(
    pageImages: VisionImage[],
    existingPages?: ExtractedPage[]
  ): Promise<PageStructure[]> {
    const structures: PageStructure[] = [];

    for (let i = 0; i < pageImages.length; i++) {
      const image = pageImages[i];
      const existingPage = existingPages?.[i];
      const structure = await this.analyzePage(
        { ...image, pageNumber: i + 1 },
        existingPage?.textBlocks
      );
      structures.push(structure);
    }

    return structures;
  }

  /**
   * Detect document sections across pages
   */
  async detectDocumentSections(
    pageImages: VisionImage[]
  ): Promise<DetectedSection[]> {
    const allSections: DetectedSection[] = [];
    let sectionId = 1;

    for (const image of pageImages) {
      const pageSections = this.visionClient
        ? await this.detectSectionsVision(image)
        : [];

      for (const section of pageSections) {
        allSections.push({
          id: `section-${sectionId++}`,
          number: section.number,
          title: section.title,
          level: section.level,
          pageStart: section.pageNumber,
          pageEnd: section.pageNumber,
          sectionType: this.mapToSectionType(section.ichE3Mapping),
          ichE3Section: section.ichE3Mapping,
          confidence: 0.9,
        });
      }
    }

    // Merge consecutive sections on same page
    return this.mergeSections(allSections);
  }

  /**
   * Detect columns in a page
   */
  detectColumns(
    regions: LayoutRegion[],
    textBlocks: TextBlock[]
  ): ColumnLayout {
    if (textBlocks.length === 0) {
      return { columnCount: 1, columns: [], gutter: 0 };
    }

    // Get body regions (exclude header/footer)
    const bodyBlocks = textBlocks.filter(
      b => b.blockType !== 'header' && b.blockType !== 'footer'
    );

    if (bodyBlocks.length === 0) {
      return { columnCount: 1, columns: [], gutter: 0 };
    }

    // Analyze horizontal distribution
    const xPositions = bodyBlocks.map(b => b.boundingBox.x);
    const gaps = this.findSignificantGaps(xPositions);

    // Determine column count based on gaps
    const columnCount = gaps.length + 1;

    if (columnCount === 1) {
      return { columnCount: 1, columns: [], gutter: 0 };
    }

    // Create column regions
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const columns: ColumnRegion[] = [];

    let prevEnd = 0;
    for (let i = 0; i <= sortedGaps.length; i++) {
      const start = prevEnd;
      const end = i < sortedGaps.length ? sortedGaps[i] : 612; // Page width

      const columnBlocks = bodyBlocks.filter(
        b => b.boundingBox.x >= start && b.boundingBox.x < end
      );

      if (columnBlocks.length > 0) {
        columns.push({
          columnIndex: i,
          boundingBox: this.calculateBoundingBox(columnBlocks),
          textBlocks: columnBlocks,
        });
      }

      prevEnd = end;
    }

    // Calculate average gutter
    const gutter = sortedGaps.length > 0
      ? sortedGaps.reduce((sum, gap) => sum + gap, 0) / sortedGaps.length
      : 0;

    return { columnCount, columns, gutter };
  }

  /**
   * Analyze reading order of text blocks
   */
  analyzeReadingOrder(
    textBlocks: TextBlock[],
    columns: ColumnLayout,
    regions: LayoutRegion[]
  ): ReadingOrderResult {
    if (textBlocks.length === 0) {
      return {
        blocks: [],
        isMultiColumn: false,
        readingDirection: 'ltr',
      };
    }

    const orderedBlocks: OrderedBlock[] = [];
    let readingOrder = 1;

    // If single column, sort by Y position
    if (columns.columnCount === 1) {
      const sorted = [...textBlocks].sort(
        (a, b) => a.boundingBox.y - b.boundingBox.y
      );

      for (const block of sorted) {
        orderedBlocks.push({
          block,
          readingOrder: readingOrder++,
          columnIndex: 0,
          regionType: this.classifyBlockRegion(block, regions),
        });
      }
    } else {
      // Multi-column: read column by column, top to bottom
      for (const column of columns.columns) {
        const columnBlocks = [...column.textBlocks].sort(
          (a, b) => a.boundingBox.y - b.boundingBox.y
        );

        for (const block of columnBlocks) {
          orderedBlocks.push({
            block,
            readingOrder: readingOrder++,
            columnIndex: column.columnIndex,
            regionType: this.classifyBlockRegion(block, regions),
          });
        }
      }
    }

    return {
      blocks: orderedBlocks,
      isMultiColumn: columns.columnCount > 1,
      readingDirection: 'ltr',
    };
  }

  /**
   * Classify a text block into a block type
   */
  classifyBlockType(
    block: { text: string; boundingBox: BoundingBox; fontSize?: number },
    pageHeight: number
  ): TextBlockType {
    const { text, boundingBox, fontSize } = block;

    // Check position for header/footer
    if (boundingBox.y < 72) {
      return 'header';
    }
    if (boundingBox.y > pageHeight - 72) {
      return 'footer';
    }

    // Check for page number
    if (/^(Page\s+)?\d+(\s+of\s+\d+)?$/i.test(text.trim())) {
      return 'page_number';
    }

    // Check for footnote
    if (/^[\*†‡§‖¶]\s/.test(text) || /^\[\d+\]/.test(text)) {
      return 'footnote';
    }

    // Check for list item
    if (/^[\-\•\*]\s/.test(text) || /^\d+\.\s/.test(text)) {
      return 'list_item';
    }

    // Check for heading (larger font or matches section pattern)
    if (fontSize && fontSize > 12) {
      return 'heading';
    }
    if (this.matchesSectionPattern(text)) {
      return 'heading';
    }

    // Default to paragraph
    return 'paragraph';
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Detect layout regions using Vision API or heuristics
   */
  private async detectRegions(
    pageImage: VisionImage,
    existingBlocks?: TextBlock[]
  ): Promise<LayoutRegion[]> {
    const regions: LayoutRegion[] = [];
    let regionId = 1;

    // If we have existing blocks, classify them into regions
    if (existingBlocks && existingBlocks.length > 0) {
      // Group blocks by vertical position
      const headerBlocks = existingBlocks.filter(b => b.blockType === 'header');
      const footerBlocks = existingBlocks.filter(b => b.blockType === 'footer');
      const bodyBlocks = existingBlocks.filter(
        b => b.blockType !== 'header' && b.blockType !== 'footer'
      );

      if (headerBlocks.length > 0) {
        regions.push({
          id: `region-${regionId++}`,
          type: 'header',
          boundingBox: this.calculateBoundingBox(headerBlocks),
          confidence: 0.9,
        });
      }

      if (footerBlocks.length > 0) {
        regions.push({
          id: `region-${regionId++}`,
          type: 'footer',
          boundingBox: this.calculateBoundingBox(footerBlocks),
          confidence: 0.9,
        });
      }

      if (bodyBlocks.length > 0) {
        regions.push({
          id: `region-${regionId++}`,
          type: 'body',
          boundingBox: this.calculateBoundingBox(bodyBlocks),
          confidence: 0.9,
        });
      }
    }

    return regions;
  }

  /**
   * Detect sections using Vision API
   */
  private async detectSectionsVision(
    pageImage: VisionImage
  ): Promise<VisionDetectedSection[]> {
    if (!this.visionClient) {
      return [];
    }

    try {
      const response = await this.visionClient.detectSections([pageImage]);
      return response;
    } catch {
      return [];
    }
  }

  /**
   * Detect sections using local pattern matching
   */
  private detectSectionsLocal(textBlocks: TextBlock[]): VisionDetectedSection[] {
    const sections: VisionDetectedSection[] = [];

    for (const block of textBlocks) {
      if (block.blockType === 'heading' || this.matchesSectionPattern(block.text)) {
        const parsed = this.parseSectionHeader(block.text);
        if (parsed) {
          sections.push({
            number: parsed.number,
            title: parsed.title,
            level: parsed.level,
            pageNumber: 1, // Will be set by caller
            ichE3Mapping: this.mapToIchE3(parsed.title),
          });
        }
      }
    }

    return sections;
  }

  /**
   * Check if text matches a section pattern
   */
  private matchesSectionPattern(text: string): boolean {
    const patterns = this.options.sectionPatterns || [];
    return patterns.some(pattern => {
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch {
        return false;
      }
    });
  }

  /**
   * Parse section header into components
   */
  private parseSectionHeader(text: string): {
    number: string;
    title: string;
    level: number;
  } | null {
    // Try numbered section pattern
    const numberedMatch = text.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const level = number.split('.').length;
      return {
        number,
        title: numberedMatch[2].trim(),
        level,
      };
    }

    // Try named section pattern
    const namedMatch = text.match(/^(Synopsis|Introduction|Objectives?|Efficacy|Safety|Discussion|Conclusion)/i);
    if (namedMatch) {
      return {
        number: '',
        title: text.trim(),
        level: 1,
      };
    }

    return null;
  }

  /**
   * Map section title to ICH E3 section
   */
  private mapToIchE3(title: string): string | undefined {
    const lower = title.toLowerCase();

    if (lower.includes('synopsis')) return '2';
    if (lower.includes('introduction')) return '7';
    if (lower.includes('objective')) return '8';
    if (lower.includes('investigational') || lower.includes('plan')) return '9';
    if (lower.includes('patient') || lower.includes('subject')) return '10';
    if (lower.includes('efficacy')) return '11';
    if (lower.includes('safety')) return '12';
    if (lower.includes('discussion')) return '13';
    if (lower.includes('conclusion')) return '13';

    return undefined;
  }

  /**
   * Map ICH E3 section to SectionType
   */
  private mapToSectionType(ichSection?: string): SectionType {
    if (!ichSection) return 'unknown';

    const sectionNum = parseInt(ichSection);
    switch (sectionNum) {
      case 1: return 'title_page';
      case 2: return 'synopsis';
      case 3: return 'table_of_contents';
      case 4: return 'abbreviations';
      case 7: return 'introduction';
      case 8: return 'study_objectives';
      case 9: return 'investigational_plan';
      case 10: return 'study_patients';
      case 11: return 'efficacy_evaluation';
      case 12: return 'safety_evaluation';
      case 13: return 'discussion';
      case 15: return 'references';
      case 16: return 'appendix';
      default: return 'unknown';
    }
  }

  /**
   * Merge consecutive sections
   */
  private mergeSections(sections: DetectedSection[]): DetectedSection[] {
    if (sections.length <= 1) return sections;

    const merged: DetectedSection[] = [];
    let current = sections[0];

    for (let i = 1; i < sections.length; i++) {
      const next = sections[i];

      if (current.number === next.number && current.title === next.title) {
        // Extend the current section
        current = {
          ...current,
          pageEnd: next.pageEnd,
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Detect header region
   */
  private detectHeader(regions: LayoutRegion[]): {
    hasHeader: boolean;
    headerHeight: number;
  } {
    const headerRegion = regions.find(r => r.type === 'header');
    return {
      hasHeader: !!headerRegion,
      headerHeight: headerRegion?.boundingBox.height || 0,
    };
  }

  /**
   * Detect footer region
   */
  private detectFooter(regions: LayoutRegion[]): {
    hasFooter: boolean;
    footerHeight: number;
  } {
    const footerRegion = regions.find(r => r.type === 'footer');
    return {
      hasFooter: !!footerRegion,
      footerHeight: footerRegion?.boundingBox.height || 0,
    };
  }

  /**
   * Detect page number
   */
  private detectPageNumber(regions: LayoutRegion[]): boolean {
    return regions.some(r => r.type === 'page_number');
  }

  /**
   * Calculate page margins
   */
  private calculateMargins(
    regions: LayoutRegion[],
    pageDimensions: { width: number; height: number }
  ): PageMargins {
    if (regions.length === 0) {
      return { top: 72, bottom: 72, left: 72, right: 72 };
    }

    const allBoxes = regions.map(r => r.boundingBox);

    const minX = Math.min(...allBoxes.map(b => b.x));
    const maxX = Math.max(...allBoxes.map(b => b.x + b.width));
    const minY = Math.min(...allBoxes.map(b => b.y));
    const maxY = Math.max(...allBoxes.map(b => b.y + b.height));

    return {
      top: minY,
      bottom: pageDimensions.height - maxY,
      left: minX,
      right: pageDimensions.width - maxX,
    };
  }

  /**
   * Find significant gaps in positions (for column detection)
   */
  private findSignificantGaps(positions: number[]): number[] {
    if (positions.length < 2) return [];

    const sorted = [...positions].sort((a, b) => a - b);
    const gaps: { position: number; size: number }[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > (this.options.minColumnWidth || 100)) {
        gaps.push({
          position: sorted[i - 1] + gap / 2,
          size: gap,
        });
      }
    }

    // Return positions of significant gaps
    return gaps
      .filter(g => g.size > 50) // At least 50pt gap
      .map(g => g.position);
  }

  /**
   * Calculate bounding box for a set of blocks
   */
  private calculateBoundingBox(blocks: TextBlock[]): BoundingBox {
    if (blocks.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const boxes = blocks.map(b => b.boundingBox);

    const minX = Math.min(...boxes.map(b => b.x));
    const minY = Math.min(...boxes.map(b => b.y));
    const maxX = Math.max(...boxes.map(b => b.x + b.width));
    const maxY = Math.max(...boxes.map(b => b.y + b.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Classify a block into a region type
   */
  private classifyBlockRegion(
    block: TextBlock,
    regions: LayoutRegion[]
  ): LayoutRegionType {
    // Find the region containing this block
    for (const region of regions) {
      if (this.isBlockInRegion(block, region)) {
        return region.type;
      }
    }

    // Default based on block type
    switch (block.blockType) {
      case 'header':
        return 'header';
      case 'footer':
        return 'footer';
      case 'footnote':
        return 'footnote';
      case 'caption':
        return 'caption';
      default:
        return 'body';
    }
  }

  /**
   * Check if a block is within a region
   */
  private isBlockInRegion(block: TextBlock, region: LayoutRegion): boolean {
    const bb = block.boundingBox;
    const rb = region.boundingBox;

    return (
      bb.x >= rb.x &&
      bb.y >= rb.y &&
      bb.x + bb.width <= rb.x + rb.width &&
      bb.y + bb.height <= rb.y + rb.height
    );
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a layout analyzer with configuration
 */
export function createLayoutAnalyzer(
  config?: Partial<ProcessingConfig>,
  options?: Partial<LayoutAnalysisOptions>,
  visionClient?: ClaudeVisionClient
): LayoutAnalyzer {
  return new LayoutAnalyzer(config, options, visionClient);
}

// -----------------------------------------------------------------------------
// Mock Layout Analyzer for Testing
// -----------------------------------------------------------------------------

/**
 * Mock layout analyzer for testing
 */
export class MockLayoutAnalyzer {
  private callCount = 0;

  async analyzePage(): Promise<PageStructure> {
    this.callCount++;
    return this.createMockPageStructure();
  }

  async analyzePages(pageImages: VisionImage[]): Promise<PageStructure[]> {
    this.callCount++;
    return pageImages.map((_, i) => this.createMockPageStructure(i + 1));
  }

  async detectDocumentSections(): Promise<DetectedSection[]> {
    this.callCount++;
    return [this.createMockSection()];
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private createMockPageStructure(pageNumber: number = 1): PageStructure {
    return {
      pageNumber,
      dimensions: { width: 612, height: 792 },
      regions: [
        {
          id: 'region-1',
          type: 'body',
          boundingBox: { x: 72, y: 72, width: 468, height: 648 },
          confidence: 0.95,
        },
      ],
      columns: {
        columnCount: 1,
        columns: [],
        gutter: 0,
      },
      readingOrder: {
        blocks: [],
        isMultiColumn: false,
        readingDirection: 'ltr',
      },
      sections: [
        {
          number: '1',
          title: 'Mock Section',
          level: 1,
          pageNumber,
        },
      ],
      hasHeader: true,
      hasFooter: true,
      hasPageNumber: true,
      headerHeight: 36,
      footerHeight: 36,
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
    };
  }

  private createMockSection(): DetectedSection {
    return {
      id: 'section-1',
      number: '1',
      title: 'Mock Section',
      level: 1,
      pageStart: 1,
      pageEnd: 1,
      sectionType: 'introduction',
      confidence: 0.95,
    };
  }
}
