
// =============================================================================
// Track Changes Configuration
// =============================================================================
// Configuration options for track changes export and document generation.
// =============================================================================

import type {
  RevisionGranularity,
  TrackChangesStyles,
} from '@/types/track-changes';

import type {
  PageSize,
  PageMargins,
  RunProperties,
} from './ooxml-types';

import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_MARGINS,
  TRACK_CHANGES_COLORS,
  inchesToTwips,
} from './ooxml-types';

// -----------------------------------------------------------------------------
// Configuration Types
// -----------------------------------------------------------------------------

/**
 * Complete track changes export configuration
 */
export interface TrackChangesConfig {
  // Document settings
  document: DocumentConfig;
  
  // Track changes settings
  trackChanges: TrackChangesSettings;
  
  // Styling
  styles: StyleConfig;
  
  // Output options
  output: OutputConfig;
  
  // Feature flags
  features: TrackChangesFeatureFlags;
}

/**
 * Document configuration
 */
export interface DocumentConfig {
  // Page setup
  pageSize: PageSize;
  pageMargins: PageMargins;
  
  // Document properties
  defaultAuthor: string;
  company?: string;
  title?: string;
  subject?: string;
  
  // Compatibility
  compatibilityMode: number; // 15 = Word 2013+
  
  // Default language
  language: string;
}

/**
 * Track changes specific settings
 */
export interface TrackChangesSettings {
  // Enable tracking
  enabled: boolean;
  
  // What to track
  trackFormatting: boolean;
  trackMoves: boolean;
  
  // View options
  showRevisions: boolean;
  showComments: boolean;
  showMarkup: boolean;
  
  // Revision granularity
  granularity: RevisionGranularity;
  
  // Combine adjacent changes from same author
  combineAdjacentChanges: boolean;
  combineThresholdMs: number;
  
  // Author settings
  aiAuthorName: string;
  systemAuthorName: string;
  
  // Protection
  protectDocument: boolean;
  allowOnlyComments: boolean;
  
  // RSID tracking
  generateRsids: boolean;
}

/**
 * Style configuration
 */
export interface StyleConfig {
  // Track changes colors
  insertionColor: string;
  deletionColor: string;
  formattingColor: string;
  moveColor: string;
  commentHighlightColor: string;
  
  // Formatting options
  insertionUnderline: boolean;
  deletionStrikethrough: boolean;
  showBalloons: boolean;
  balloonWidth: number; // Points
  
  // Default paragraph style
  defaultParagraphStyle?: string;
  
  // Default run properties
  defaultRunProperties?: RunProperties;
  
  // Heading styles
  headingStyles: HeadingStyleConfig[];
}

/**
 * Heading style configuration
 */
export interface HeadingStyleConfig {
  level: number;
  styleId: string;
  name: string;
  fontSize: number; // Points
  bold: boolean;
  color?: string;
  spaceBefore?: number; // Points
  spaceAfter?: number;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  // File format
  format: 'docx' | 'docm'; // docm for macros
  
  // Compression
  compressionLevel: number; // 0-9
  
  // Include components
  includeStyles: boolean;
  includeNumbering: boolean;
  includeTheme: boolean;
  
  // Custom XML
  includeCustomXml: boolean;
  customXmlNamespace?: string;
  
  // Metadata
  includeDocumentProperties: boolean;
  stripSensitiveMetadata: boolean;
}

/**
 * Feature flags
 */
export interface TrackChangesFeatureFlags {
  // Core features
  enableInsertions: boolean;
  enableDeletions: boolean;
  enableFormatting: boolean;
  enableMoves: boolean;
  enableComments: boolean;
  
  // Advanced features
  enableTables: boolean;
  enableImages: boolean;
  enableHyperlinks: boolean;
  enableBookmarks: boolean;
  enableFootnotes: boolean;
  enableHeaders: boolean;
  
  // AI features
  enableCitationComments: boolean;
  enableSourceTracking: boolean;
  enableConfidenceScores: boolean;
  
  // Debug
  enableDebugComments: boolean;
  verboseXml: boolean;
}

// -----------------------------------------------------------------------------
// Default Configurations
// -----------------------------------------------------------------------------

/**
 * Default document configuration
 */
export const DEFAULT_DOCUMENT_CONFIG: DocumentConfig = {
  pageSize: DEFAULT_PAGE_SIZE,
  pageMargins: DEFAULT_PAGE_MARGINS,
  defaultAuthor: 'Ligature AI',
  company: 'Ligature',
  compatibilityMode: 15,
  language: 'en-US',
};

/**
 * Default track changes settings
 */
export const DEFAULT_TRACK_CHANGES_SETTINGS: TrackChangesSettings = {
  enabled: true,
  trackFormatting: true,
  trackMoves: true,
  showRevisions: true,
  showComments: true,
  showMarkup: true,
  granularity: 'word',
  combineAdjacentChanges: true,
  combineThresholdMs: 1000,
  aiAuthorName: 'Ligature AI',
  systemAuthorName: 'Ligature System',
  protectDocument: false,
  allowOnlyComments: false,
  generateRsids: true,
};

/**
 * Default heading styles
 */
export const DEFAULT_HEADING_STYLES: HeadingStyleConfig[] = [
  { level: 1, styleId: 'Heading1', name: 'Heading 1', fontSize: 16, bold: true, spaceBefore: 12, spaceAfter: 4 },
  { level: 2, styleId: 'Heading2', name: 'Heading 2', fontSize: 14, bold: true, spaceBefore: 10, spaceAfter: 4 },
  { level: 3, styleId: 'Heading3', name: 'Heading 3', fontSize: 12, bold: true, spaceBefore: 8, spaceAfter: 4 },
  { level: 4, styleId: 'Heading4', name: 'Heading 4', fontSize: 11, bold: true, spaceBefore: 6, spaceAfter: 2 },
  { level: 5, styleId: 'Heading5', name: 'Heading 5', fontSize: 11, bold: false, spaceBefore: 4, spaceAfter: 2 },
];

/**
 * Default style configuration
 */
export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  insertionColor: TRACK_CHANGES_COLORS.insertion,
  deletionColor: TRACK_CHANGES_COLORS.deletion,
  formattingColor: TRACK_CHANGES_COLORS.formatting,
  moveColor: TRACK_CHANGES_COLORS.move,
  commentHighlightColor: TRACK_CHANGES_COLORS.comment,
  insertionUnderline: true,
  deletionStrikethrough: true,
  showBalloons: true,
  balloonWidth: 180,
  headingStyles: DEFAULT_HEADING_STYLES,
};

/**
 * Default output configuration
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  format: 'docx',
  compressionLevel: 6,
  includeStyles: true,
  includeNumbering: true,
  includeTheme: false,
  includeCustomXml: false,
  includeDocumentProperties: true,
  stripSensitiveMetadata: false,
};

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: TrackChangesFeatureFlags = {
  enableInsertions: true,
  enableDeletions: true,
  enableFormatting: true,
  enableMoves: true,
  enableComments: true,
  enableTables: true,
  enableImages: false, // Not implemented yet
  enableHyperlinks: true,
  enableBookmarks: true,
  enableFootnotes: false, // Not implemented yet
  enableHeaders: false, // Not implemented yet
  enableCitationComments: true,
  enableSourceTracking: true,
  enableConfidenceScores: false,
  enableDebugComments: false,
  verboseXml: false,
};

/**
 * Complete default configuration
 */
export const DEFAULT_TRACK_CHANGES_CONFIG: TrackChangesConfig = {
  document: DEFAULT_DOCUMENT_CONFIG,
  trackChanges: DEFAULT_TRACK_CHANGES_SETTINGS,
  styles: DEFAULT_STYLE_CONFIG,
  output: DEFAULT_OUTPUT_CONFIG,
  features: DEFAULT_FEATURE_FLAGS,
};

// -----------------------------------------------------------------------------
// Configuration Builder
// -----------------------------------------------------------------------------

/**
 * Builder for creating track changes configurations
 */
export class TrackChangesConfigBuilder {
  private config: TrackChangesConfig;
  
  constructor(baseConfig?: Partial<TrackChangesConfig>) {
    this.config = {
      document: { ...DEFAULT_DOCUMENT_CONFIG, ...baseConfig?.document },
      trackChanges: { ...DEFAULT_TRACK_CHANGES_SETTINGS, ...baseConfig?.trackChanges },
      styles: { ...DEFAULT_STYLE_CONFIG, ...baseConfig?.styles },
      output: { ...DEFAULT_OUTPUT_CONFIG, ...baseConfig?.output },
      features: { ...DEFAULT_FEATURE_FLAGS, ...baseConfig?.features },
    };
  }
  
  /**
   * Configure document settings
   */
  withDocument(config: Partial<DocumentConfig>): this {
    this.config.document = { ...this.config.document, ...config };
    return this;
  }
  
  /**
   * Configure page size
   */
  withPageSize(size: 'letter' | 'a4' | 'legal' | PageSize): this {
    if (typeof size === 'string') {
      this.config.document.pageSize = PAGE_SIZES[size];
    } else {
      this.config.document.pageSize = size;
    }
    return this;
  }
  
  /**
   * Configure page margins
   */
  withMargins(margins: 'normal' | 'narrow' | 'wide' | Partial<PageMargins>): this {
    if (typeof margins === 'string') {
      this.config.document.pageMargins = MARGIN_PRESETS[margins];
    } else {
      this.config.document.pageMargins = { ...this.config.document.pageMargins, ...margins };
    }
    return this;
  }
  
  /**
   * Configure track changes settings
   */
  withTrackChanges(config: Partial<TrackChangesSettings>): this {
    this.config.trackChanges = { ...this.config.trackChanges, ...config };
    return this;
  }
  
  /**
   * Set AI author name
   */
  withAIAuthor(name: string): this {
    this.config.trackChanges.aiAuthorName = name;
    return this;
  }
  
  /**
   * Configure styles
   */
  withStyles(config: Partial<StyleConfig>): this {
    this.config.styles = { ...this.config.styles, ...config };
    return this;
  }
  
  /**
   * Configure output options
   */
  withOutput(config: Partial<OutputConfig>): this {
    this.config.output = { ...this.config.output, ...config };
    return this;
  }
  
  /**
   * Configure feature flags
   */
  withFeatures(config: Partial<TrackChangesFeatureFlags>): this {
    this.config.features = { ...this.config.features, ...config };
    return this;
  }
  
  /**
   * Enable debug mode
   */
  withDebug(enabled: boolean = true): this {
    this.config.features.enableDebugComments = enabled;
    this.config.features.verboseXml = enabled;
    return this;
  }
  
  /**
   * Configure for regulatory documents
   */
  forRegulatoryDocuments(): this {
    return this
      .withTrackChanges({
        trackFormatting: true,
        trackMoves: true,
        granularity: 'word',
        combineAdjacentChanges: false,
      })
      .withFeatures({
        enableCitationComments: true,
        enableSourceTracking: true,
      })
      .withOutput({
        includeDocumentProperties: true,
        stripSensitiveMetadata: false,
      });
  }
  
  /**
   * Configure for review-only output (no editing)
   */
  forReviewOnly(): this {
    return this.withTrackChanges({
      protectDocument: true,
      allowOnlyComments: true,
    });
  }
  
  /**
   * Build the configuration
   */
  build(): TrackChangesConfig {
    return { ...this.config };
  }
  
  /**
   * Build with validation
   */
  buildValidated(): TrackChangesConfig {
    const errors = validateTrackChangesConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.map(e => e.message).join(', ')}`);
    }
    return { ...this.config };
  }
}

// -----------------------------------------------------------------------------
// Page Size Presets
// -----------------------------------------------------------------------------

/**
 * Standard page sizes
 */
export const PAGE_SIZES: Record<string, PageSize> = {
  letter: {
    width: inchesToTwips(8.5),
    height: inchesToTwips(11),
    orientation: 'portrait',
  },
  a4: {
    width: inchesToTwips(8.27),
    height: inchesToTwips(11.69),
    orientation: 'portrait',
  },
  legal: {
    width: inchesToTwips(8.5),
    height: inchesToTwips(14),
    orientation: 'portrait',
  },
  a3: {
    width: inchesToTwips(11.69),
    height: inchesToTwips(16.54),
    orientation: 'portrait',
  },
};

/**
 * Margin presets
 */
export const MARGIN_PRESETS: Record<string, PageMargins> = {
  normal: {
    top: inchesToTwips(1),
    bottom: inchesToTwips(1),
    left: inchesToTwips(1),
    right: inchesToTwips(1),
    header: inchesToTwips(0.5),
    footer: inchesToTwips(0.5),
    gutter: 0,
  },
  narrow: {
    top: inchesToTwips(0.5),
    bottom: inchesToTwips(0.5),
    left: inchesToTwips(0.5),
    right: inchesToTwips(0.5),
    header: inchesToTwips(0.5),
    footer: inchesToTwips(0.5),
    gutter: 0,
  },
  wide: {
    top: inchesToTwips(1),
    bottom: inchesToTwips(1),
    left: inchesToTwips(2),
    right: inchesToTwips(2),
    header: inchesToTwips(0.5),
    footer: inchesToTwips(0.5),
    gutter: 0,
  },
  moderate: {
    top: inchesToTwips(1),
    bottom: inchesToTwips(1),
    left: inchesToTwips(0.75),
    right: inchesToTwips(0.75),
    header: inchesToTwips(0.5),
    footer: inchesToTwips(0.5),
    gutter: 0,
  },
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validate track changes configuration
 */
export function validateTrackChangesConfig(config: TrackChangesConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  
  // Document validation
  if (config.document.pageSize.width <= 0) {
    errors.push({ field: 'document.pageSize.width', message: 'Page width must be positive' });
  }
  if (config.document.pageSize.height <= 0) {
    errors.push({ field: 'document.pageSize.height', message: 'Page height must be positive' });
  }
  
  // Margin validation
  const margins = config.document.pageMargins;
  if (margins.left + margins.right >= config.document.pageSize.width) {
    errors.push({ field: 'document.pageMargins', message: 'Horizontal margins exceed page width' });
  }
  if (margins.top + margins.bottom >= config.document.pageSize.height) {
    errors.push({ field: 'document.pageMargins', message: 'Vertical margins exceed page height' });
  }
  
  // Track changes validation
  if (!config.trackChanges.aiAuthorName) {
    errors.push({ field: 'trackChanges.aiAuthorName', message: 'AI author name is required' });
  }
  if (config.trackChanges.combineThresholdMs < 0) {
    errors.push({ field: 'trackChanges.combineThresholdMs', message: 'Combine threshold must be non-negative' });
  }
  
  // Style validation
  if (!isValidHexColor(config.styles.insertionColor)) {
    errors.push({ field: 'styles.insertionColor', message: 'Invalid hex color', value: config.styles.insertionColor });
  }
  if (!isValidHexColor(config.styles.deletionColor)) {
    errors.push({ field: 'styles.deletionColor', message: 'Invalid hex color', value: config.styles.deletionColor });
  }
  
  // Output validation
  if (config.output.compressionLevel < 0 || config.output.compressionLevel > 9) {
    errors.push({ field: 'output.compressionLevel', message: 'Compression level must be 0-9' });
  }
  
  return errors;
}

/**
 * Check if string is valid hex color (6 characters)
 */
function isValidHexColor(color: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(color);
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create configuration for CSR document export
 */
export function createCSRExportConfig(): TrackChangesConfig {
  return new TrackChangesConfigBuilder()
    .withDocument({
      title: 'Clinical Study Report',
      defaultAuthor: 'Ligature AI',
    })
    .forRegulatoryDocuments()
    .withPageSize('letter')
    .withMargins('normal')
    .build();
}

/**
 * Create configuration for labeling document export
 */
export function createLabelingExportConfig(): TrackChangesConfig {
  return new TrackChangesConfigBuilder()
    .withDocument({
      title: 'Product Labeling',
      defaultAuthor: 'Ligature AI',
    })
    .forRegulatoryDocuments()
    .withPageSize('letter')
    .withMargins('normal')
    .withTrackChanges({
      granularity: 'character', // More precise for labeling
    })
    .build();
}

/**
 * Create configuration for review output
 */
export function createReviewConfig(): TrackChangesConfig {
  return new TrackChangesConfigBuilder()
    .forReviewOnly()
    .withStyles({
      showBalloons: true,
      balloonWidth: 200,
    })
    .withFeatures({
      enableComments: true,
      enableCitationComments: true,
    })
    .build();
}

/**
 * Create configuration for testing
 */
export function createTestConfig(): TrackChangesConfig {
  return new TrackChangesConfigBuilder()
    .withDebug(true)
    .withOutput({
      compressionLevel: 0, // Faster
    })
    .build();
}
