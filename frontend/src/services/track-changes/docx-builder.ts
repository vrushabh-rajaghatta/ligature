
// =============================================================================
// DOCX Builder
// =============================================================================
// Builds Microsoft Word (.docx) documents with track changes support.
// Generates valid OOXML structure that Word can open and display.
// =============================================================================

import type {
  ChangeAuthor,
  TrackedChange,
  ReviewComment,
} from '@/types/track-changes';

import type {
  OOXMLDocument,
  OOXMLBody,
  OOXMLParagraph,
  OOXMLRun,
  OOXMLText,
  OOXMLInsertion,
  OOXMLDeletion,
  OOXMLComment,
  OOXMLCommentRangeStart,
  OOXMLCommentRangeEnd,
  OOXMLCommentReference,
  OOXMLTable,
  OOXMLTableRow,
  OOXMLTableCell,
  OOXMLBookmarkStart,
  OOXMLBookmarkEnd,
  OOXMLHyperlink,
  OOXMLStyle,
  OOXMLRelationship,
  DocumentProperties,
  DocumentSettings,
  ParagraphProperties,
  RunProperties,
  TableProperties,
  RevisionMetadata,
  SectionProperties,
} from './ooxml-types';

import {
  generateRsid,
  pointsToTwips,
  inchesToTwips,
  getAuthorInitials,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_MARGINS,
  TRACK_CHANGES_COLORS,
} from './ooxml-types';

import type {
  TrackChangesConfig,
} from './config';

import {
  DEFAULT_TRACK_CHANGES_CONFIG,
} from './config';

// v0.42.28: Union types for inline elements and run content
type OOXMLInlineElement = 
  | OOXMLRun 
  | OOXMLInsertion 
  | OOXMLDeletion 
  | OOXMLCommentRangeStart 
  | OOXMLCommentRangeEnd 
  | OOXMLHyperlink 
  | OOXMLBookmarkStart 
  | OOXMLBookmarkEnd;

type OOXMLRunContent = 
  | OOXMLText 
  | { type: 'break'; breakType?: 'page' | 'line' } 
  | { type: 'tab' } 
  | OOXMLCommentReference;

// -----------------------------------------------------------------------------
// Builder Types
// -----------------------------------------------------------------------------

/**
 * Build result
 */
export interface DocxBuildResult {
  // Document buffer
  buffer: Buffer;
  
  // Build metadata
  metadata: BuildMetadata;
  
  // Warnings during build
  warnings: BuildWarning[];
}

/**
 * Build metadata
 */
export interface BuildMetadata {
  documentId: string;
  createdAt: Date;
  revisionCount: number;
  commentCount: number;
  pageCount: number; // Estimated
  wordCount: number;
  characterCount: number;
}

/**
 * Build warning
 */
export interface BuildWarning {
  code: string;
  message: string;
  location?: string;
}

/**
 * Paragraph input
 */
export interface ParagraphInput {
  text?: string;
  runs?: RunInput[];
  style?: string;
  properties?: Partial<ParagraphProperties>;
}

/**
 * Run input
 */
export interface RunInput {
  text: string;
  properties?: Partial<RunProperties>;
  isInsertion?: boolean;
  isDeletion?: boolean;
  author?: ChangeAuthor | string;
  date?: Date;
}

/**
 * Table input
 */
export interface TableInput {
  headers?: string[];
  rows: string[][];
  style?: string;
  properties?: Partial<TableProperties>;
}

/**
 * Comment input
 */
export interface CommentInput {
  text: string;
  author: ChangeAuthor | string;
  date?: Date;
  parentId?: number;
}

// -----------------------------------------------------------------------------
// DOCX Builder Class
// -----------------------------------------------------------------------------

/**
 * Builder for creating Word documents with track changes
 */
export class DocxBuilder {
  private config: TrackChangesConfig;
  private document: OOXMLDocument;
  private warnings: BuildWarning[] = [];
  
  // ID counters
  private revisionId = 0;
  private commentId = 0;
  private bookmarkId = 0;
  private relationshipId = 0;
  
  // Tracking
  private rsidRoot: string;
  private wordCount = 0;
  private characterCount = 0;
  
  constructor(config?: Partial<TrackChangesConfig>) {
    this.config = {
      ...DEFAULT_TRACK_CHANGES_CONFIG,
      ...config,
      document: { ...DEFAULT_TRACK_CHANGES_CONFIG.document, ...config?.document },
      trackChanges: { ...DEFAULT_TRACK_CHANGES_CONFIG.trackChanges, ...config?.trackChanges },
      styles: { ...DEFAULT_TRACK_CHANGES_CONFIG.styles, ...config?.styles },
      output: { ...DEFAULT_TRACK_CHANGES_CONFIG.output, ...config?.output },
      features: { ...DEFAULT_TRACK_CHANGES_CONFIG.features, ...config?.features },
    };
    
    this.rsidRoot = generateRsid();
    this.document = this.createEmptyDocument();
  }
  
  // ---------------------------------------------------------------------------
  // Document Creation
  // ---------------------------------------------------------------------------
  
  /**
   * Create an empty document structure
   */
  private createEmptyDocument(): OOXMLDocument {
    return {
      properties: this.createDocumentProperties(),
      settings: this.createDocumentSettings(),
      styles: this.createDefaultStyles(),
      numbering: [],
      body: {
        content: [],
        sectionProperties: this.createSectionProperties(),
      },
      comments: [],
      footnotes: [],
      endnotes: [],
      headers: [],
      footers: [],
      relationships: this.createBaseRelationships(),
    };
  }
  
  /**
   * Create document properties
   */
  private createDocumentProperties(): DocumentProperties {
    return {
      title: this.config.document.title,
      subject: this.config.document.subject,
      creator: this.config.document.defaultAuthor,
      company: this.config.document.company,
      created: new Date(),
      modified: new Date(),
      revision: 1,
      application: 'Ligature',
      appVersion: '1.0',
    };
  }
  
  /**
   * Create document settings
   */
  private createDocumentSettings(): DocumentSettings {
    return {
      trackRevisions: this.config.trackChanges.enabled,
      trackFormatting: this.config.trackChanges.trackFormatting,
      trackMoves: this.config.trackChanges.trackMoves,
      showRevisions: this.config.trackChanges.showRevisions,
      showComments: this.config.trackChanges.showComments,
      showInkAnnotations: false,
      compatibilityMode: this.config.document.compatibilityMode,
      rsidRoot: this.rsidRoot,
    };
  }
  
  /**
   * Create section properties
   */
  private createSectionProperties(): SectionProperties {
    return {
      pageSize: this.config.document.pageSize,
      pageMargins: this.config.document.pageMargins,
    };
  }
  
  /**
   * Create default styles
   */
  private createDefaultStyles(): OOXMLStyle[] {
    const styles: OOXMLStyle[] = [
      // Normal paragraph style
      {
        type: 'paragraph',
        styleId: 'Normal',
        name: 'Normal',
        isDefault: true,
        paragraphProperties: {
          spacing: { after: pointsToTwips(8), line: 276, lineRule: 'auto' },
        },
        runProperties: {
          fontName: 'Calibri',
          fontSize: 22, // 11pt in half-points
        },
      },
      // Default character style
      {
        type: 'character',
        styleId: 'DefaultParagraphFont',
        name: 'Default Paragraph Font',
        isDefault: true,
      },
    ];
    
    // Add heading styles
    for (const heading of this.config.styles.headingStyles) {
      styles.push({
        type: 'paragraph',
        styleId: heading.styleId,
        name: heading.name,
        basedOn: 'Normal',
        next: 'Normal',
        paragraphProperties: {
          outlineLevel: heading.level - 1,
          spacing: {
            before: heading.spaceBefore ? pointsToTwips(heading.spaceBefore) : undefined,
            after: heading.spaceAfter ? pointsToTwips(heading.spaceAfter) : undefined,
          },
        },
        runProperties: {
          bold: heading.bold,
          fontSize: heading.fontSize * 2, // Half-points
          color: heading.color,
        },
      });
    }
    
    return styles;
  }
  
  /**
   * Create base relationships
   */
  private createBaseRelationships(): OOXMLRelationship[] {
    return [
      { id: this.nextRelId(), type: 'styles', target: 'styles.xml' },
      { id: this.nextRelId(), type: 'settings', target: 'settings.xml' },
      { id: this.nextRelId(), type: 'fontTable', target: 'fontTable.xml' },
    ];
  }
  
  // ---------------------------------------------------------------------------
  // Content Addition Methods
  // ---------------------------------------------------------------------------
  
  /**
   * Add a paragraph
   */
  addParagraph(input: string | ParagraphInput): this {
    const paragraph = this.createParagraph(input);
    this.document.body.content.push(paragraph);
    return this;
  }
  
  /**
   * Add multiple paragraphs
   */
  addParagraphs(inputs: (string | ParagraphInput)[]): this {
    for (const input of inputs) {
      this.addParagraph(input);
    }
    return this;
  }
  
  /**
   * Add a heading
   */
  addHeading(text: string, level: number = 1): this {
    const styleId = `Heading${Math.min(Math.max(level, 1), 9)}`;
    return this.addParagraph({
      text,
      style: styleId,
    });
  }
  
  /**
   * Add a table
   */
  addTable(input: TableInput): this {
    const table = this.createTable(input);
    this.document.body.content.push(table);
    return this;
  }
  
  /**
   * Add an insertion (tracked change)
   */
  addInsertion(text: string, author?: ChangeAuthor | string, date?: Date): this {
    const authorName = this.resolveAuthorName(author);
    const paragraph = this.createParagraphWithInsertion(text, authorName, date);
    this.document.body.content.push(paragraph);
    return this;
  }
  
  /**
   * Add a deletion (tracked change)
   */
  addDeletion(text: string, author?: ChangeAuthor | string, date?: Date): this {
    const authorName = this.resolveAuthorName(author);
    const paragraph = this.createParagraphWithDeletion(text, authorName, date);
    this.document.body.content.push(paragraph);
    return this;
  }
  
  /**
   * Add a tracked change
   */
  addTrackedChange(change: TrackedChange): this {
    if (change.type === 'insertion' && change.insertedContent) {
      return this.addInsertion(
        change.insertedContent,
        change.author,
        change.timestamp
      );
    } else if (change.type === 'deletion' && change.deletedContent) {
      return this.addDeletion(
        change.deletedContent,
        change.author,
        change.timestamp
      );
    }
    // Other types handled in future versions
    return this;
  }
  
  /**
   * Add a comment
   */
  addComment(input: CommentInput, targetParagraphIndex?: number): this {
    const comment = this.createComment(input);
    this.document.comments.push(comment);
    
    // If target paragraph specified, add comment markers
    if (targetParagraphIndex !== undefined && targetParagraphIndex >= 0) {
      const paragraph = this.document.body.content[targetParagraphIndex];
      if (paragraph && paragraph.type === 'paragraph') {
        this.addCommentMarkersToParagraph(paragraph as OOXMLParagraph, comment.id);
      }
    }
    
    return this;
  }
  
  /**
   * Add a bookmark
   */
  addBookmark(name: string, paragraphIndex: number): this {
    const id = this.nextBookmarkId();
    const paragraph = this.document.body.content[paragraphIndex];
    
    if (paragraph && paragraph.type === 'paragraph') {
      const p = paragraph as OOXMLParagraph;
      const start: OOXMLBookmarkStart = { type: 'bookmarkStart', id, name };
      const end: OOXMLBookmarkEnd = { type: 'bookmarkEnd', id };
      
      // Insert at beginning and end
      p.content.unshift(start);
      p.content.push(end);
    }
    
    return this;
  }
  
  /**
   * Add a hyperlink
   */
  addHyperlink(text: string, url: string, tooltip?: string): this {
    const relId = this.nextRelId();
    
    // Add relationship
    this.document.relationships.push({
      id: relId,
      type: 'hyperlink',
      target: url,
      targetMode: 'External',
    });
    
    // Create hyperlink element
    const hyperlink: OOXMLHyperlink = {
      type: 'hyperlink',
      relationshipId: relId,
      tooltip,
      content: [this.createRun({ text, properties: { color: '0563C1', underline: 'single' } })],
    };
    
    // Wrap in paragraph
    const paragraph: OOXMLParagraph = {
      type: 'paragraph',
      id: generateRsid(),
      rsidR: generateRsid(),
      content: [hyperlink],
    };
    
    this.document.body.content.push(paragraph);
    return this;
  }
  
  /**
   * Add a page break
   */
  addPageBreak(): this {
    const paragraph: OOXMLParagraph = {
      type: 'paragraph',
      id: generateRsid(),
      rsidR: generateRsid(),
      content: [{
        type: 'run',
        content: [{ type: 'break', breakType: 'page' }],
      }],
    };
    
    this.document.body.content.push(paragraph);
    return this;
  }
  
  // ---------------------------------------------------------------------------
  // Element Creation Methods
  // ---------------------------------------------------------------------------
  
  /**
   * Create a paragraph
   */
  private createParagraph(input: string | ParagraphInput): OOXMLParagraph {
    const normalized = typeof input === 'string' ? { text: input } : input;
    const rsid = generateRsid();
    
    let content: OOXMLParagraph['content'];
    
    if (normalized.runs) {
      content = normalized.runs.map(run => this.createRunFromInput(run));
    } else if (normalized.text) {
      content = [this.createRun({ text: normalized.text })];
      this.updateCounts(normalized.text);
    } else {
      content = [];
    }
    
    return {
      type: 'paragraph',
      id: rsid,
      rsidR: rsid,
      properties: {
        styleId: normalized.style,
        ...normalized.properties,
      },
      content,
    };
  }
  
  /**
   * Create a paragraph with insertion
   */
  private createParagraphWithInsertion(
    text: string,
    author: string,
    date?: Date
  ): OOXMLParagraph {
    const rsid = generateRsid();
    const insertion: OOXMLInsertion = {
      type: 'insertion',
      id: this.nextRevisionId(),
      author,
      date: date ?? new Date(),
      content: [this.createRun({ text })],
    };
    
    this.updateCounts(text);
    
    return {
      type: 'paragraph',
      id: rsid,
      rsidR: rsid,
      content: [insertion],
    };
  }
  
  /**
   * Create a paragraph with deletion
   */
  private createParagraphWithDeletion(
    text: string,
    author: string,
    date?: Date
  ): OOXMLParagraph {
    const rsid = generateRsid();
    const deletion: OOXMLDeletion = {
      type: 'deletion',
      id: this.nextRevisionId(),
      author,
      date: date ?? new Date(),
      content: [{ type: 'deletedText', text }],
    };
    
    return {
      type: 'paragraph',
      id: rsid,
      rsidR: rsid,
      content: [deletion],
    };
  }
  
  /**
   * Create a run from input
   */
  private createRunFromInput(input: RunInput): OOXMLRun | OOXMLInsertion | OOXMLDeletion {
    const author = this.resolveAuthorName(input.author);
    
    if (input.isInsertion) {
      return {
        type: 'insertion',
        id: this.nextRevisionId(),
        author,
        date: input.date ?? new Date(),
        content: [this.createRun({ text: input.text, properties: input.properties })],
      };
    }
    
    if (input.isDeletion) {
      return {
        type: 'deletion',
        id: this.nextRevisionId(),
        author,
        date: input.date ?? new Date(),
        content: [{ type: 'deletedText', text: input.text, properties: input.properties }],
      };
    }
    
    this.updateCounts(input.text);
    return this.createRun({ text: input.text, properties: input.properties });
  }
  
  /**
   * Create a basic run
   */
  private createRun(input: { text: string; properties?: Partial<RunProperties> }): OOXMLRun {
    const textContent: OOXMLText = {
      type: 'text',
      value: input.text,
      preserveSpace: input.text.includes(' '),
    };
    
    return {
      type: 'run',
      rsidR: generateRsid(),
      properties: input.properties,
      content: [textContent],
    };
  }
  
  /**
   * Create a table
   */
  private createTable(input: TableInput): OOXMLTable {
    const rows: OOXMLTableRow[] = [];
    
    // Add header row if present
    if (input.headers) {
      rows.push(this.createTableRow(input.headers, true));
    }
    
    // Add data rows
    for (const rowData of input.rows) {
      rows.push(this.createTableRow(rowData, false));
    }
    
    // Calculate column widths (equal distribution)
    const columnCount = input.headers?.length ?? input.rows[0]?.length ?? 1;
    const totalWidth = this.config.document.pageSize.width -
      this.config.document.pageMargins.left -
      this.config.document.pageMargins.right;
    const columnWidth = Math.floor(totalWidth / columnCount);
    
    return {
      type: 'table',
      properties: {
        styleId: input.style,
        width: { value: 5000, type: 'pct' }, // 100%
        ...input.properties,
      },
      grid: {
        columns: Array(columnCount).fill(null).map(() => ({ width: columnWidth })),
      },
      rows,
    };
  }
  
  /**
   * Create a table row
   */
  private createTableRow(cells: string[], isHeader: boolean): OOXMLTableRow {
    return {
      type: 'tableRow',
      properties: {
        headerRow: isHeader,
      },
      cells: cells.map(text => this.createTableCell(text, isHeader)),
    };
  }
  
  /**
   * Create a table cell
   */
  private createTableCell(text: string, isHeader: boolean): OOXMLTableCell {
    const paragraph: OOXMLParagraph = {
      type: 'paragraph',
      id: generateRsid(),
      rsidR: generateRsid(),
      content: [this.createRun({
        text,
        properties: isHeader ? { bold: true } : undefined,
      })],
    };
    
    this.updateCounts(text);
    
    return {
      type: 'tableCell',
      properties: {
        shading: isHeader ? { fill: 'E7E6E6' } : undefined,
      },
      content: [paragraph],
    };
  }
  
  /**
   * Create a comment
   */
  private createComment(input: CommentInput): OOXMLComment {
    const id = this.nextCommentId();
    const authorName = this.resolveAuthorName(input.author);
    
    return {
      id,
      author: authorName,
      date: input.date ?? new Date(),
      initials: getAuthorInitials(authorName),
      content: [{
        type: 'paragraph',
        id: generateRsid(),
        rsidR: generateRsid(),
        content: [this.createRun({ text: input.text })],
      }],
      parentId: input.parentId,
    };
  }
  
  /**
   * Add comment markers to a paragraph
   */
  private addCommentMarkersToParagraph(paragraph: OOXMLParagraph, commentId: number): void {
    const start: OOXMLCommentRangeStart = { type: 'commentRangeStart', id: commentId };
    const end: OOXMLCommentRangeEnd = { type: 'commentRangeEnd', id: commentId };
    const ref: OOXMLCommentReference = { type: 'commentReference', id: commentId };
    
    // Insert markers
    paragraph.content.unshift(start);
    paragraph.content.push(end);
    paragraph.content.push({ type: 'run', content: [ref] } as OOXMLRun);
  }
  
  // ---------------------------------------------------------------------------
  // Build Methods
  // ---------------------------------------------------------------------------
  
  /**
   * Build the document
   */
  build(): DocxBuildResult {
    // Update modified date
    this.document.properties.modified = new Date();
    
    // Generate XML parts
    const xmlParts = this.generateXmlParts();
    
    // Create ZIP buffer (simplified - in production would use JSZip)
    const buffer = this.createDocxBuffer(xmlParts);
    
    return {
      buffer,
      metadata: {
        documentId: this.rsidRoot,
        createdAt: this.document.properties.created ?? new Date(),
        revisionCount: this.revisionId,
        commentCount: this.commentId,
        pageCount: this.estimatePageCount(),
        wordCount: this.wordCount,
        characterCount: this.characterCount,
      },
      warnings: this.warnings,
    };
  }
  
  /**
   * Generate XML parts for the document
   */
  private generateXmlParts(): Map<string, string> {
    const parts = new Map<string, string>();
    
    // [Content_Types].xml
    parts.set('[Content_Types].xml', this.generateContentTypes());
    
    // _rels/.rels
    parts.set('_rels/.rels', this.generateRootRels());
    
    // word/document.xml
    parts.set('word/document.xml', this.generateDocumentXml());
    
    // word/_rels/document.xml.rels
    parts.set('word/_rels/document.xml.rels', this.generateDocumentRels());
    
    // word/styles.xml
    parts.set('word/styles.xml', this.generateStylesXml());
    
    // word/settings.xml
    parts.set('word/settings.xml', this.generateSettingsXml());
    
    // word/fontTable.xml
    parts.set('word/fontTable.xml', this.generateFontTableXml());
    
    // word/comments.xml (if any)
    if (this.document.comments.length > 0) {
      parts.set('word/comments.xml', this.generateCommentsXml());
    }
    
    // docProps/core.xml
    parts.set('docProps/core.xml', this.generateCorePropsXml());
    
    // docProps/app.xml
    parts.set('docProps/app.xml', this.generateAppPropsXml());
    
    return parts;
  }
  
  /**
   * Generate [Content_Types].xml
   */
  private generateContentTypes(): string {
    const hasComments = this.document.comments.length > 0;
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  ${hasComments ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' : ''}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  }
  
  /**
   * Generate root .rels
   */
  private generateRootRels(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  }
  
  /**
   * Generate document.xml (main content)
   */
  private generateDocumentXml(): string {
    const body = this.generateBodyXml();
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${body}
    <w:sectPr>
      <w:pgSz w:w="${this.config.document.pageSize.width}" w:h="${this.config.document.pageSize.height}"/>
      <w:pgMar w:top="${this.config.document.pageMargins.top}" w:right="${this.config.document.pageMargins.right}" w:bottom="${this.config.document.pageMargins.bottom}" w:left="${this.config.document.pageMargins.left}" w:header="${this.config.document.pageMargins.header}" w:footer="${this.config.document.pageMargins.footer}"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }
  
  /**
   * Generate body content XML
   */
  private generateBodyXml(): string {
    return this.document.body.content
      .map(element => this.elementToXml(element))
      .join('\n');
  }
  
  /**
   * Convert element to XML
   */
  private elementToXml(element: OOXMLParagraph | OOXMLTable | any): string {
    if (element.type === 'paragraph') {
      return this.paragraphToXml(element as OOXMLParagraph);
    }
    if (element.type === 'table') {
      return this.tableToXml(element as OOXMLTable);
    }
    return '';
  }
  
  /**
   * Convert paragraph to XML
   */
  private paragraphToXml(p: OOXMLParagraph): string {
    const propsXml = this.paragraphPropsToXml(p.properties);
    const contentXml = p.content.map(c => this.inlineElementToXml(c as any)).join('');
    
    return `    <w:p w:rsidR="${p.rsidR || ''}" w:rsidP="${p.rsidP || p.rsidR || ''}">
${propsXml}${contentXml}
    </w:p>`;
  }
  
  /**
   * Convert paragraph properties to XML
   */
  private paragraphPropsToXml(props?: ParagraphProperties): string {
    if (!props) return '';
    
    const parts: string[] = [];
    
    if (props.styleId) {
      parts.push(`<w:pStyle w:val="${props.styleId}"/>`);
    }
    if (props.alignment) {
      const alignMap: Record<string, string> = {
        left: 'left', center: 'center', right: 'right', justify: 'both'
      };
      parts.push(`<w:jc w:val="${alignMap[props.alignment] || 'left'}"/>`);
    }
    if (props.spacing) {
      const attrs: string[] = [];
      if (props.spacing.before !== undefined) attrs.push(`w:before="${props.spacing.before}"`);
      if (props.spacing.after !== undefined) attrs.push(`w:after="${props.spacing.after}"`);
      if (props.spacing.line !== undefined) attrs.push(`w:line="${props.spacing.line}"`);
      if (attrs.length > 0) {
        parts.push(`<w:spacing ${attrs.join(' ')}/>`);
      }
    }
    
    return parts.length > 0 ? `      <w:pPr>\n        ${parts.join('\n        ')}\n      </w:pPr>\n` : '';
  }
  
  /**
   * Convert inline element to XML
   */
  private inlineElementToXml(element: OOXMLInlineElement): string {
    switch (element.type) {
      case 'run':
        return this.runToXml(element as OOXMLRun);
      case 'insertion':
        return this.insertionToXml(element as OOXMLInsertion);
      case 'deletion':
        return this.deletionToXml(element as OOXMLDeletion);
      case 'commentRangeStart':
        return `<w:commentRangeStart w:id="${(element as OOXMLCommentRangeStart).id}"/>`;
      case 'commentRangeEnd':
        return `<w:commentRangeEnd w:id="${(element as OOXMLCommentRangeEnd).id}"/>`;
      case 'hyperlink':
        return this.hyperlinkToXml(element as OOXMLHyperlink);
      case 'bookmarkStart':
        return `<w:bookmarkStart w:id="${(element as OOXMLBookmarkStart).id}" w:name="${this.escapeXml((element as OOXMLBookmarkStart).name)}"/>`;
      case 'bookmarkEnd':
        return `<w:bookmarkEnd w:id="${(element as OOXMLBookmarkEnd).id}"/>`;
      default:
        return '';
    }
  }
  
  /**
   * Convert run to XML
   */
  private runToXml(run: OOXMLRun): string {
    const propsXml = this.runPropsToXml(run.properties);
    const contentXml = run.content.map(c => this.runContentToXml(c as any)).join('');
    
    return `      <w:r>${propsXml}${contentXml}</w:r>`;
  }
  
  /**
   * Convert run properties to XML
   */
  private runPropsToXml(props?: RunProperties): string {
    if (!props) return '';
    
    const parts: string[] = [];
    
    if (props.bold) parts.push('<w:b/>');
    if (props.italic) parts.push('<w:i/>');
    if (props.underline) parts.push(`<w:u w:val="${props.underline}"/>`);
    if (props.strike) parts.push('<w:strike/>');
    if (props.color) parts.push(`<w:color w:val="${props?.color ?? ''}"/>`);
    if (props.fontSize) parts.push(`<w:sz w:val="${props.fontSize}"/>`);
    if (props.fontName) parts.push(`<w:rFonts w:ascii="${props.fontName}" w:hAnsi="${props.fontName}"/>`);
    if (props.highlight) parts.push(`<w:highlight w:val="${props.highlight}"/>`);
    
    return parts.length > 0 ? `<w:rPr>${parts.join('')}</w:rPr>` : '';
  }
  
  /**
   * Convert run content to XML
   */
  private runContentToXml(content: OOXMLRunContent): string {
    switch (content.type) {
      case 'text':
        const textContent = content as OOXMLText;
        const space = textContent.preserveSpace ? ' xml:space="preserve"' : '';
        return `<w:t${space}>${this.escapeXml(textContent.value)}</w:t>`;
      case 'break':
        const breakContent = content as { type: 'break'; breakType?: 'page' | 'line' };
        return breakContent.breakType === 'page' ? '<w:br w:type="page"/>' : '<w:br/>';
      case 'tab':
        return '<w:tab/>';
      case 'commentReference':
        return `<w:commentReference w:id="${(content as OOXMLCommentReference).id}"/>`;
      default:
        return '';
    }
  }
  
  /**
   * Convert insertion to XML
   */
  private insertionToXml(ins: OOXMLInsertion): string {
    const dateStr = ins.date.toISOString();
    const runsXml = ins.content.map(r => this.runToXml(r)).join('');
    
    return `      <w:ins w:id="${ins.id}" w:author="${this.escapeXml(ins.author)}" w:date="${dateStr}">${runsXml}</w:ins>`;
  }
  
  /**
   * Convert deletion to XML
   */
  private deletionToXml(del: OOXMLDeletion): string {
    const dateStr = del.date.toISOString();
    const contentXml = del.content.map(c => {
      if (c.type === 'deletedText') {
        return `<w:r><w:delText>${this.escapeXml(c.text || '')}</w:delText></w:r>`;
      }
      return '';
    }).join('');
    
    return `      <w:del w:id="${del.id}" w:author="${this.escapeXml(del.author)}" w:date="${dateStr}">${contentXml}</w:del>`;
  }
  
  /**
   * Convert hyperlink to XML
   */
  private hyperlinkToXml(link: OOXMLHyperlink): string {
    const runsXml = link.content.map(r => this.runToXml(r)).join('');
    const tooltip = link.tooltip ? ` w:tooltip="${this.escapeXml(link.tooltip)}"` : '';
    
    return `      <w:hyperlink r:id="${link.relationshipId}"${tooltip}>${runsXml}</w:hyperlink>`;
  }
  
  /**
   * Convert table to XML
   */
  private tableToXml(table: OOXMLTable): string {
    const gridXml = table.grid.columns
      .map(col => `<w:gridCol w:w="${col.width}"/>`)
      .join('');
    
    const rowsXml = table.rows
      .map(row => this.tableRowToXml(row))
      .join('\n');
    
    return `    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4"/>
          <w:left w:val="single" w:sz="4"/>
          <w:bottom w:val="single" w:sz="4"/>
          <w:right w:val="single" w:sz="4"/>
          <w:insideH w:val="single" w:sz="4"/>
          <w:insideV w:val="single" w:sz="4"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${gridXml}</w:tblGrid>
${rowsXml}
    </w:tbl>`;
  }
  
  /**
   * Convert table row to XML
   */
  private tableRowToXml(row: OOXMLTableRow): string {
    const cellsXml = row.cells
      .map(cell => this.tableCellToXml(cell))
      .join('');
    
    const headerProp = row.properties?.headerRow ? '<w:tblHeader/>' : '';
    const propsXml = headerProp ? `<w:trPr>${headerProp}</w:trPr>` : '';
    
    return `      <w:tr>${propsXml}${cellsXml}</w:tr>`;
  }
  
  /**
   * Convert table cell to XML
   */
  private tableCellToXml(cell: OOXMLTableCell): string {
    const contentXml = cell.content
      .map(el => this.elementToXml(el))
      .join('');
    
    let propsXml = '';
    if (cell.properties?.shading) {
      propsXml = `<w:tcPr><w:shd w:fill="${cell.properties.shading.fill}"/></w:tcPr>`;
    }
    
    return `<w:tc>${propsXml}${contentXml}</w:tc>`;
  }
  
  /**
   * Generate document.xml.rels
   */
  private generateDocumentRels(): string {
    const hasComments = this.document.comments.length > 0;
    
    let rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>`;
    
    if (hasComments) {
      rels += `
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
    }
    
    // Add hyperlink relationships
    for (const rel of this.document.relationships) {
      if (rel.type === 'hyperlink') {
        rels += `
  <Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${this.escapeXml(rel.target)}" TargetMode="External"/>`;
      }
    }
    
    rels += `
</Relationships>`;
    
    return rels;
  }
  
  /**
   * Generate styles.xml
   */
  private generateStylesXml(): string {
    const stylesXml = this.document.styles
      .map(style => this.styleToXml(style))
      .join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
${stylesXml}
</w:styles>`;
  }
  
  /**
   * Convert style to XML
   */
  private styleToXml(style: OOXMLStyle): string {
    const defaultAttr = style.isDefault ? ' w:default="1"' : '';
    const basedOn = style.basedOn ? `<w:basedOn w:val="${style.basedOn}"/>` : '';
    const next = style.next ? `<w:next w:val="${style.next}"/>` : '';
    
    let propsXml = '';
    if (style.paragraphProperties) {
      propsXml += this.paragraphPropsToXml(style.paragraphProperties).trim();
    }
    if (style.runProperties) {
      const rPr = this.runPropsToXml(style.runProperties);
      if (rPr) propsXml += `<w:rPr>${rPr.replace('<w:rPr>', '').replace('</w:rPr>', '')}</w:rPr>`;
    }
    
    return `  <w:style w:type="${style.type}" w:styleId="${style.styleId}"${defaultAttr}>
    <w:name w:val="${style.name}"/>
    ${basedOn}${next}
    ${propsXml}
  </w:style>`;
  }
  
  /**
   * Generate settings.xml
   */
  private generateSettingsXml(): string {
    const trackRevisions = this.document.settings.trackRevisions ? '<w:trackRevisions/>' : '';
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${trackRevisions}
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:val="${this.config.document.compatibilityMode}"/>
  </w:compat>
  <w:rsids>
    <w:rsidRoot w:val="${this.rsidRoot}"/>
  </w:rsids>
</w:settings>`;
  }
  
  /**
   * Generate fontTable.xml
   */
  private generateFontTableXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:panose1 w:val="020F0502020204030204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>`;
  }
  
  /**
   * Generate comments.xml
   */
  private generateCommentsXml(): string {
    const commentsXml = this.document.comments
      .map(comment => this.commentToXml(comment))
      .join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${commentsXml}
</w:comments>`;
  }
  
  /**
   * Convert comment to XML
   */
  private commentToXml(comment: OOXMLComment): string {
    const dateStr = comment.date.toISOString();
    const contentXml = comment.content
      .map(p => this.paragraphToXml(p))
      .join('');
    
    return `  <w:comment w:id="${comment.id}" w:author="${this.escapeXml(comment.author)}" w:date="${dateStr}" w:initials="${comment.initials || ''}">
${contentXml}
  </w:comment>`;
  }
  
  /**
   * Generate core.xml (document properties)
   */
  private generateCorePropsXml(): string {
    const props = this.document.properties;
    const created = props.created?.toISOString() ?? new Date().toISOString();
    const modified = props.modified?.toISOString() ?? new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${this.escapeXml(props.title || '')}</dc:title>
  <dc:subject>${this.escapeXml(props.subject || '')}</dc:subject>
  <dc:creator>${this.escapeXml(props.creator || '')}</dc:creator>
  <cp:lastModifiedBy>${this.escapeXml(props.lastModifiedBy || props.creator || '')}</cp:lastModifiedBy>
  <cp:revision>${props.revision || 1}</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${modified}</dcterms:modified>
</cp:coreProperties>`;
  }
  
  /**
   * Generate app.xml
   */
  private generateAppPropsXml(): string {
    const props = this.document.properties;
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>${this.escapeXml(props.application || 'Ligature')}</Application>
  <AppVersion>${this.escapeXml(props.appVersion || '1.0')}</AppVersion>
  <Company>${this.escapeXml(props.company || '')}</Company>
</Properties>`;
  }
  
  /**
   * Create DOCX buffer from XML parts
   * In production, this would use JSZip or similar
   */
  private createDocxBuffer(parts: Map<string, string>): Buffer {
    // For now, create a simple representation
    // In production, use JSZip to create actual .docx
    const content = Array.from(parts.entries())
      .map(([path, xml]) => `--- ${path} ---\n${xml}`)
      .join('\n\n');
    
    return Buffer.from(content, 'utf-8');
  }
  
  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------
  
  /**
   * Get next revision ID
   */
  private nextRevisionId(): number {
    return this.revisionId++;
  }
  
  /**
   * Get next comment ID
   */
  private nextCommentId(): number {
    return this.commentId++;
  }
  
  /**
   * Get next bookmark ID
   */
  private nextBookmarkId(): number {
    return this.bookmarkId++;
  }
  
  /**
   * Get next relationship ID
   */
  private nextRelId(): string {
    return `rId${++this.relationshipId}`;
  }
  
  /**
   * Resolve author name
   */
  private resolveAuthorName(author?: ChangeAuthor | string): string {
    if (!author) {
      return this.config.trackChanges.aiAuthorName;
    }
    return typeof author === 'string' ? author : author.name;
  }
  
  /**
   * Update word and character counts
   */
  private updateCounts(text: string): void {
    this.characterCount += text.length;
    this.wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  /**
   * Estimate page count
   */
  private estimatePageCount(): number {
    // Rough estimate: ~500 words per page
    return Math.max(1, Math.ceil(this.wordCount / 500));
  }
  
  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Get the document structure (for inspection)
   */
  getDocument(): OOXMLDocument {
    return this.document;
  }
  
  /**
   * Get current revision count
   */
  getRevisionCount(): number {
    return this.revisionId;
  }
  
  /**
   * Get current comment count
   */
  getCommentCount(): number {
    return this.commentId;
  }
}

// -----------------------------------------------------------------------------
// Mock Builder for Testing
// -----------------------------------------------------------------------------

/**
 * Mock DOCX builder for testing
 */
export class MockDocxBuilder {
  private paragraphs: string[] = [];
  private revisions: { type: 'insertion' | 'deletion'; text: string; author: string }[] = [];
  private comments: { text: string; author: string }[] = [];
  private buildCount = 0;
  
  addParagraph(input: string | ParagraphInput): this {
    const text = typeof input === 'string' ? input : input.text || '';
    this.paragraphs.push(text);
    return this;
  }
  
  addParagraphs(inputs: (string | ParagraphInput)[]): this {
    for (const input of inputs) {
      this.addParagraph(input);
    }
    return this;
  }
  
  addHeading(text: string, _level: number = 1): this {
    this.paragraphs.push(text);
    return this;
  }
  
  addInsertion(text: string, author: string = 'AI'): this {
    this.revisions.push({ type: 'insertion', text, author });
    return this;
  }
  
  addDeletion(text: string, author: string = 'AI'): this {
    this.revisions.push({ type: 'deletion', text, author });
    return this;
  }
  
  addComment(input: CommentInput): this {
    this.comments.push({
      text: input.text,
      author: typeof input.author === 'string' ? input.author : input.author.name,
    });
    return this;
  }
  
  addTable(_input: TableInput): this {
    return this;
  }
  
  addHyperlink(_text: string, _url: string): this {
    return this;
  }
  
  addPageBreak(): this {
    return this;
  }
  
  addBookmark(_name: string, _index: number): this {
    return this;
  }
  
  build(): DocxBuildResult {
    this.buildCount++;
    
    return {
      buffer: Buffer.from('mock-docx-content'),
      metadata: {
        documentId: 'mock-doc-id',
        createdAt: new Date(),
        revisionCount: this.revisions.length,
        commentCount: this.comments.length,
        pageCount: 1,
        wordCount: this.paragraphs.join(' ').split(/\s+/).length,
        characterCount: this.paragraphs.join('').length,
      },
      warnings: [],
    };
  }
  
  // Test helpers
  getParagraphs(): string[] {
    return this.paragraphs;
  }
  
  getRevisions(): typeof this.revisions {
    return this.revisions;
  }
  
  getComments(): typeof this.comments {
    return this.comments;
  }
  
  getBuildCount(): number {
    return this.buildCount;
  }
  
  reset(): void {
    this.paragraphs = [];
    this.revisions = [];
    this.comments = [];
    this.buildCount = 0;
  }
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create a DOCX builder
 */
export function createDocxBuilder(config?: Partial<TrackChangesConfig>): DocxBuilder {
  return new DocxBuilder(config);
}

/**
 * Create a mock DOCX builder for testing
 */
export function createMockDocxBuilder(): MockDocxBuilder {
  return new MockDocxBuilder();
}
