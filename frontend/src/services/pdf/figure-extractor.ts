
// =============================================================================
// Figure Extractor
// =============================================================================
// Extracts and classifies figures from PDF pages using Claude Vision API.
// Handles clinical chart types (Kaplan-Meier, forest plots, waterfall),
// chemical structures, diagrams, and photographs.
// =============================================================================

import type {
  ExtractedFigure,
  FigureType,
  ChartType,
  ImageFormat,
  AxisLabels,
  DataPoint,
  BoundingBox,
} from '@/types/pdf-extraction';

import type {
  VisionImage,
  VisionExtractedFigure,
  FigureExtractionConfig,
} from './types';

import { ClaudeVisionClient } from './claude-vision-client';
import { DEFAULT_FIGURE_CONFIG } from './pdf-config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Figure extraction result
 */
export interface FigureExtractionResult {
  figures: ExtractedFigure[];
  rawFigures: VisionExtractedFigure[];
  processingTimeMs: number;
  tokensUsed: { input: number; output: number };
  warnings: string[];
}

/**
 * Clinical chart classification
 */
export interface ClinicalChartInfo {
  chartType: ChartType;
  confidence: number;
  characteristics: ClinicalChartCharacteristics;
}

/**
 * Characteristics of clinical charts
 */
export interface ClinicalChartCharacteristics {
  hasTimeAxis: boolean;
  hasSurvivalCurve: boolean;
  hasConfidenceBands: boolean;
  hasAtRiskTable: boolean;
  hasHazardRatio: boolean;
  hasForestPlotStructure: boolean;
  hasWaterfallBars: boolean;
  hasSwimmerLanes: boolean;
  estimatedGroups: number;
}

/**
 * Figure caption analysis
 */
export interface CaptionAnalysis {
  figureNumber?: string;
  title: string;
  description?: string;
  source?: string;
  abbreviations?: string[];
}

/**
 * Figure extraction options
 */
export interface FigureExtractionOptions {
  extractImages?: boolean;
  classifyChartType?: boolean;
  detectCaptions?: boolean;
  extractChartData?: boolean;
  minSize?: number;
  maxSize?: number;
  outputFormat?: ImageFormat;
  outputQuality?: number;
}

/**
 * Default figure extraction options
 */
export const DEFAULT_FIGURE_EXTRACTION_OPTIONS: FigureExtractionOptions = {
  extractImages: true,
  classifyChartType: true,
  detectCaptions: true,
  extractChartData: false, // Disabled by default (expensive)
  minSize: 50,
  maxSize: 4000,
  outputFormat: 'png',
  outputQuality: 90,
};

// -----------------------------------------------------------------------------
// Clinical Chart Patterns
// -----------------------------------------------------------------------------

/**
 * Keywords indicating specific chart types
 */
export const CHART_TYPE_KEYWORDS: Record<ChartType, string[]> = {
  kaplan_meier: [
    'kaplan-meier', 'kaplan meier', 'survival', 'time to event',
    'progression-free', 'overall survival', 'os', 'pfs', 'efs',
    'at risk', 'number at risk', 'censored',
  ],
  forest_plot: [
    'forest plot', 'forest-plot', 'meta-analysis', 'subgroup',
    'hazard ratio', 'odds ratio', 'relative risk', 'favors',
  ],
  waterfall: [
    'waterfall', 'tumor change', 'best response', 'percent change',
    'tumor shrinkage', 'target lesion',
  ],
  swimmer: [
    'swimmer', 'swimmer plot', 'patient timeline', 'treatment duration',
    'response duration', 'time on treatment',
  ],
  bar: [
    'bar chart', 'bar graph', 'incidence', 'frequency',
  ],
  line: [
    'line chart', 'line graph', 'trend', 'time series',
  ],
  scatter: [
    'scatter', 'correlation', 'pk', 'pharmacokinetic',
  ],
  pie: [
    'pie chart', 'proportion', 'distribution',
  ],
  box_whisker: [
    'box plot', 'boxplot', 'box-whisker', 'quartile',
  ],
  histogram: [
    'histogram', 'distribution', 'frequency distribution',
  ],
  heatmap: [
    'heatmap', 'heat map', 'correlation matrix',
  ],
  other: [],
};

/**
 * Figure type classification keywords
 */
export const FIGURE_TYPE_KEYWORDS: Record<FigureType, string[]> = {
  chart: [
    'figure', 'chart', 'graph', 'plot', 'curve',
  ],
  diagram: [
    'diagram', 'flowchart', 'flow chart', 'schematic', 'workflow',
    'study design', 'consort', 'disposition',
  ],
  photograph: [
    'photograph', 'photo', 'image', 'picture', 'micrograph',
  ],
  illustration: [
    'illustration', 'drawing', 'anatomy', 'mechanism',
  ],
  chemical: [
    'structure', 'chemical', 'molecule', 'compound', 'formula',
  ],
  screenshot: [
    'screenshot', 'screen capture', 'interface',
  ],
  logo: [
    'logo', 'brand', 'trademark',
  ],
  unknown: [],
};

// -----------------------------------------------------------------------------
// Figure Extractor
// -----------------------------------------------------------------------------

/**
 * Extracts and classifies figures from PDF pages
 */
export class FigureExtractor {
  private readonly config: FigureExtractionConfig;
  private readonly options: FigureExtractionOptions;
  private readonly visionClient: ClaudeVisionClient;

  constructor(
    visionClient: ClaudeVisionClient,
    config?: Partial<FigureExtractionConfig>,
    options?: Partial<FigureExtractionOptions>
  ) {
    this.visionClient = visionClient;
    this.config = { ...DEFAULT_FIGURE_CONFIG, ...config };
    this.options = { ...DEFAULT_FIGURE_EXTRACTION_OPTIONS, ...options };
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Extract figures from page images
   */
  async extractFigures(
    pageImages: VisionImage[],
    options?: Partial<FigureExtractionOptions>
  ): Promise<FigureExtractionResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = Date.now();
    const warnings: string[] = [];

    // Use Vision API to extract raw figures
    let rawFigures: VisionExtractedFigure[];
    let tokensUsed = { input: 0, output: 0 };

    try {
      rawFigures = await this.visionClient.extractFigures(pageImages);
    } catch (error) {
      warnings.push(`Vision API extraction failed: ${error}`);
      rawFigures = [];
    }

    // Process raw figures into structured format
    const figures: ExtractedFigure[] = [];
    let figureIndex = 1;

    for (let pageIdx = 0; pageIdx < pageImages.length; pageIdx++) {
      const pageNumber = pageImages[pageIdx].pageNumber || pageIdx + 1;
      const pageFigures = rawFigures.filter((_, idx) =>
        Math.floor(idx / Math.max(1, rawFigures.length / pageImages.length)) === pageIdx
      );

      for (const rawFigure of pageFigures) {
        const processedFigure = this.processRawFigure(
          rawFigure,
          pageNumber,
          figureIndex++,
          mergedOptions
        );
        figures.push(processedFigure);
      }
    }

    return {
      figures,
      rawFigures,
      processingTimeMs: Date.now() - startTime,
      tokensUsed,
      warnings,
    };
  }

  /**
   * Classify a figure's chart type
   */
  classifyChartType(
    figure: VisionExtractedFigure,
    captionText?: string
  ): ClinicalChartInfo {
    const text = `${figure.description || ''} ${figure.title || ''} ${captionText || ''}`.toLowerCase();

    // Check for specific clinical chart types
    const characteristics = this.analyzeChartCharacteristics(text, figure);

    // Kaplan-Meier detection
    if (characteristics.hasSurvivalCurve || this.matchesKeywords(text, 'kaplan_meier')) {
      return {
        chartType: 'kaplan_meier',
        confidence: characteristics.hasAtRiskTable ? 0.95 : 0.85,
        characteristics,
      };
    }

    // Forest plot detection
    if (characteristics.hasForestPlotStructure || this.matchesKeywords(text, 'forest_plot')) {
      return {
        chartType: 'forest_plot',
        confidence: 0.9,
        characteristics,
      };
    }

    // Waterfall plot detection
    if (characteristics.hasWaterfallBars || this.matchesKeywords(text, 'waterfall')) {
      return {
        chartType: 'waterfall',
        confidence: 0.9,
        characteristics,
      };
    }

    // Swimmer plot detection
    if (characteristics.hasSwimmerLanes || this.matchesKeywords(text, 'swimmer')) {
      return {
        chartType: 'swimmer',
        confidence: 0.9,
        characteristics,
      };
    }

    // Check other chart types
    for (const chartType of ['bar', 'line', 'scatter', 'pie', 'box_whisker', 'histogram', 'heatmap'] as ChartType[]) {
      if (this.matchesKeywords(text, chartType)) {
        return {
          chartType,
          confidence: 0.7,
          characteristics,
        };
      }
    }

    // Use the figure's own classification if available
    if (figure.chartType && figure.chartType !== 'other') {
      return {
        chartType: figure.chartType as ChartType,
        confidence: figure.confidence,
        characteristics,
      };
    }

    return {
      chartType: 'other',
      confidence: 0.5,
      characteristics,
    };
  }

  /**
   * Classify figure type
   */
  classifyFigureType(figure: VisionExtractedFigure): FigureType {
    // Use the figure's own classification if available
    if (figure.figureType && figure.figureType !== 'unknown') {
      return figure.figureType as FigureType;
    }

    const text = `${figure.description || ''} ${figure.title || ''}`.toLowerCase();

    // Check each figure type
    for (const [type, keywords] of Object.entries(FIGURE_TYPE_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        return type as FigureType;
      }
    }

    // Default to chart if it looks like a graph
    if (/chart|graph|plot|figure \d/i.test(text)) {
      return 'chart';
    }

    return 'unknown';
  }

  /**
   * Parse figure caption
   */
  parseCaption(captionText: string): CaptionAnalysis {
    const analysis: CaptionAnalysis = {
      title: captionText,
    };

    // Extract figure number
    const figureMatch = captionText.match(/^(Figure\s+\d+\.?\d*)/i);
    if (figureMatch) {
      analysis.figureNumber = figureMatch[1];
      analysis.title = captionText.substring(figureMatch[0].length).trim();
    }

    // Remove leading punctuation
    analysis.title = analysis.title.replace(/^[:\.\s]+/, '').trim();

    // Try to split title and description
    const periodMatch = analysis.title.match(/^([^.]+\.)\s+(.+)$/);
    if (periodMatch) {
      analysis.title = periodMatch[1].replace(/\.$/, '');
      analysis.description = periodMatch[2];
    }

    // Extract abbreviations
    const abbrMatch = captionText.match(/Abbreviations?:?\s*([^.]+)/i);
    if (abbrMatch) {
      analysis.abbreviations = abbrMatch[1]
        .split(/[,;]/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
    }

    // Extract source
    const sourceMatch = captionText.match(/Source:?\s*([^.]+)/i);
    if (sourceMatch) {
      analysis.source = sourceMatch[1].trim();
    }

    return analysis;
  }

  /**
   * Estimate data points from a chart (basic extraction)
   */
  estimateDataPoints(figure: VisionExtractedFigure): DataPoint[] {
    // This is a placeholder for actual data extraction
    // Real implementation would use image analysis
    return [];
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Process raw Vision figure into structured format
   */
  private processRawFigure(
    raw: VisionExtractedFigure,
    pageNumber: number,
    figureIndex: number,
    options: FigureExtractionOptions
  ): ExtractedFigure {
    const figureType = this.classifyFigureType(raw);
    const chartInfo = options.classifyChartType && figureType === 'chart'
      ? this.classifyChartType(raw)
      : undefined;

    const captionAnalysis = raw.title
      ? this.parseCaption(raw.title)
      : undefined;

    return {
      id: `figure-${pageNumber}-${figureIndex}`,
      pageNumber,
      figureNumber: raw.figureNumber || captionAnalysis?.figureNumber,
      title: captionAnalysis?.title || raw.title,
      imageFormat: options.outputFormat || 'png',
      width: 0, // Would be set if extracting actual images
      height: 0,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      figureType,
      chartType: chartInfo?.chartType,
      confidence: raw.confidence,
    };
  }

  /**
   * Analyze characteristics of clinical charts
   */
  private analyzeChartCharacteristics(
    text: string,
    figure: VisionExtractedFigure
  ): ClinicalChartCharacteristics {
    return {
      hasTimeAxis: /time|month|week|day|year|duration/i.test(text),
      hasSurvivalCurve: /survival|probability|event-free|progression/i.test(text),
      hasConfidenceBands: /confidence|ci|band|interval/i.test(text),
      hasAtRiskTable: /at risk|number at risk|patients at risk/i.test(text),
      hasHazardRatio: /hazard ratio|hr\s*[:=]/i.test(text),
      hasForestPlotStructure: /favor|diamond|overall effect/i.test(text),
      hasWaterfallBars: /change|reduction|increase.*%/i.test(text),
      hasSwimmerLanes: /patient|subject.*duration|response/i.test(text),
      estimatedGroups: this.estimateGroupCount(text, figure),
    };
  }

  /**
   * Estimate number of groups/series in a chart
   */
  private estimateGroupCount(text: string, figure: VisionExtractedFigure): number {
    // Look for common group indicators
    const groupIndicators = [
      /treatment\s+(?:vs?\.?|and)\s+placebo/i,
      /drug\s+(?:vs?\.?|and)\s+control/i,
      /group\s+[a-z]\s+(?:vs?\.?|and)\s+group\s+[a-z]/i,
      /\d+\s*mg\s+(?:vs?\.?|and)\s+\d+\s*mg/i,
    ];

    for (const pattern of groupIndicators) {
      if (pattern.test(text)) return 2;
    }

    // Check for multiple dosing groups
    const doseMatch = text.match(/(\d+\s*mg)/gi);
    if (doseMatch && doseMatch.length > 1) {
      return doseMatch.length;
    }

    // Default assumption
    return 2;
  }

  /**
   * Check if text matches keywords for a chart type
   */
  private matchesKeywords(text: string, chartType: ChartType): boolean {
    const keywords = CHART_TYPE_KEYWORDS[chartType];
    return keywords.some(kw => text.includes(kw));
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a figure extractor with configuration
 */
export function createFigureExtractor(
  visionClient: ClaudeVisionClient,
  config?: Partial<FigureExtractionConfig>,
  options?: Partial<FigureExtractionOptions>
): FigureExtractor {
  return new FigureExtractor(visionClient, config, options);
}

// -----------------------------------------------------------------------------
// Mock Figure Extractor for Testing
// -----------------------------------------------------------------------------

/**
 * Mock figure extractor for testing
 */
export class MockFigureExtractor {
  private callCount = 0;

  async extractFigures(): Promise<FigureExtractionResult> {
    this.callCount++;
    return {
      figures: [this.createMockFigure()],
      rawFigures: [this.createMockRawFigure()],
      processingTimeMs: 200,
      tokensUsed: { input: 1500, output: 800 },
      warnings: [],
    };
  }

  classifyChartType(): ClinicalChartInfo {
    this.callCount++;
    return {
      chartType: 'kaplan_meier',
      confidence: 0.92,
      characteristics: {
        hasTimeAxis: true,
        hasSurvivalCurve: true,
        hasConfidenceBands: true,
        hasAtRiskTable: true,
        hasHazardRatio: true,
        hasForestPlotStructure: false,
        hasWaterfallBars: false,
        hasSwimmerLanes: false,
        estimatedGroups: 2,
      },
    };
  }

  parseCaption(text: string): CaptionAnalysis {
    this.callCount++;
    return {
      figureNumber: 'Figure 2.1',
      title: 'Kaplan-Meier Curve for Overall Survival',
      description: 'Intent-to-treat population',
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private createMockFigure(): ExtractedFigure {
    return {
      id: 'figure-1-1',
      pageNumber: 1,
      figureNumber: 'Figure 2.1',
      title: 'Kaplan-Meier Curve for Overall Survival',
      imageFormat: 'png',
      width: 600,
      height: 400,
      boundingBox: { x: 72, y: 300, width: 468, height: 312 },
      figureType: 'chart',
      chartType: 'kaplan_meier',
      axisLabels: {
        xAxis: 'Time (months)',
        yAxis: 'Probability of Survival',
      },
      confidence: 0.92,
    };
  }

  private createMockRawFigure(): VisionExtractedFigure {
    return {
      figureNumber: 'Figure 2.1',
      title: 'Kaplan-Meier Curve for Overall Survival',
      figureType: 'chart',
      chartType: 'kaplan_meier',
      description: 'Kaplan-Meier survival curves showing overall survival in the intent-to-treat population. Treatment group (blue) vs placebo (red). Hazard ratio: 0.68 (95% CI: 0.52-0.89, p=0.005).',
      confidence: 0.92,
    };
  }
}
