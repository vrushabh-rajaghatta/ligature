
// Document Template Style Service - v0.25.8
// Ensures generated/drafted text follows document template formatting standards
// Addresses the requirement: "Text must appear in expected style format per applicable document template"

// Note: DocumentTemplate and TemplateSection types are defined locally since the authoring-data
// module exports the data array but not the type interface

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentStyleConfig {
  fontFamily: string;
  baseFontSize: string;
  lineHeight: string;
  paragraphSpacing: string;
  headingStyles: {
    h1: HeadingStyle;
    h2: HeadingStyle;
    h3: HeadingStyle;
    h4: HeadingStyle;
  };
  listStyles: {
    bullet: ListStyle;
    numbered: ListStyle;
  };
  tableStyles: TableStyle;
  marginStyles: MarginStyle;
}

interface HeadingStyle {
  fontSize: string;
  fontWeight: string;
  color: string;
  marginTop: string;
  marginBottom: string;
  textTransform?: string;
  borderBottom?: string;
}

interface ListStyle {
  indent: string;
  itemSpacing: string;
  markerStyle?: string;
}

interface TableStyle {
  borderColor: string;
  headerBackground: string;
  headerColor: string;
  cellPadding: string;
  alternateRowBackground?: string;
}

interface MarginStyle {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export interface StyledContent {
  html: string;
  css: string;
  plainText: string;
}

export type DocumentType = 
  | 'protocol' 
  | 'ib' 
  | 'csr' 
  | 'dsur' 
  | 'module-24' 
  | 'module-25' 
  | 'module-26' 
  | 'module-27'
  | 'smpc'
  | 'pil'
  | 'label'
  | 'sop'
  | 'work-instruction'
  | 'haq-response'
  | 'briefing-document'
  | 'generic';

// ============================================================================
// DEFAULT STYLE CONFIGURATIONS BY DOCUMENT TYPE
// ============================================================================

const ICH_REGULATORY_STYLE: DocumentStyleConfig = {
  fontFamily: "'Times New Roman', Times, serif",
  baseFontSize: '12pt',
  lineHeight: '1.5',
  paragraphSpacing: '12pt',
  headingStyles: {
    h1: {
      fontSize: '16pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '24pt',
      marginBottom: '12pt',
      textTransform: 'uppercase',
      borderBottom: '1px solid #000000',
    },
    h2: {
      fontSize: '14pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '18pt',
      marginBottom: '9pt',
    },
    h3: {
      fontSize: '12pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '12pt',
      marginBottom: '6pt',
    },
    h4: {
      fontSize: '12pt',
      fontWeight: '600',
      color: '#333333',
      marginTop: '9pt',
      marginBottom: '6pt',
    },
  },
  listStyles: {
    bullet: {
      indent: '36pt',
      itemSpacing: '6pt',
      markerStyle: 'disc',
    },
    numbered: {
      indent: '36pt',
      itemSpacing: '6pt',
    },
  },
  tableStyles: {
    borderColor: '#000000',
    headerBackground: '#E6E6E6',
    headerColor: '#000000',
    cellPadding: '6pt',
    alternateRowBackground: '#F5F5F5',
  },
  marginStyles: {
    top: '1in',
    bottom: '1in',
    left: '1.25in',
    right: '1in',
  },
};

const FDA_SUBMISSION_STYLE: DocumentStyleConfig = {
  ...ICH_REGULATORY_STYLE,
  fontFamily: "'Arial', sans-serif",
  baseFontSize: '11pt',
  lineHeight: '1.4',
};

const EMA_STYLE: DocumentStyleConfig = {
  ...ICH_REGULATORY_STYLE,
  fontFamily: "'Arial', Helvetica, sans-serif",
  baseFontSize: '11pt',
};

const QMS_DOCUMENT_STYLE: DocumentStyleConfig = {
  fontFamily: "'Arial', sans-serif",
  baseFontSize: '11pt',
  lineHeight: '1.4',
  paragraphSpacing: '10pt',
  headingStyles: {
    h1: {
      fontSize: '18pt',
      fontWeight: '700',
      color: '#1a365d',
      marginTop: '24pt',
      marginBottom: '12pt',
      borderBottom: '2px solid #2563eb',
    },
    h2: {
      fontSize: '14pt',
      fontWeight: '700',
      color: '#1e40af',
      marginTop: '18pt',
      marginBottom: '9pt',
    },
    h3: {
      fontSize: '12pt',
      fontWeight: '600',
      color: '#1e3a8a',
      marginTop: '12pt',
      marginBottom: '6pt',
    },
    h4: {
      fontSize: '11pt',
      fontWeight: '600',
      color: '#1e40af',
      marginTop: '9pt',
      marginBottom: '6pt',
    },
  },
  listStyles: {
    bullet: {
      indent: '24pt',
      itemSpacing: '4pt',
      markerStyle: 'square',
    },
    numbered: {
      indent: '24pt',
      itemSpacing: '4pt',
    },
  },
  tableStyles: {
    borderColor: '#cbd5e1',
    headerBackground: '#1e40af',
    headerColor: '#ffffff',
    cellPadding: '8pt',
    alternateRowBackground: '#f1f5f9',
  },
  marginStyles: {
    top: '0.75in',
    bottom: '0.75in',
    left: '1in',
    right: '1in',
  },
};

const LABELING_STYLE: DocumentStyleConfig = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  baseFontSize: '10pt',
  lineHeight: '1.3',
  paragraphSpacing: '8pt',
  headingStyles: {
    h1: {
      fontSize: '14pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '18pt',
      marginBottom: '9pt',
      textTransform: 'uppercase',
    },
    h2: {
      fontSize: '12pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '12pt',
      marginBottom: '6pt',
    },
    h3: {
      fontSize: '10pt',
      fontWeight: '700',
      color: '#000000',
      marginTop: '9pt',
      marginBottom: '4pt',
    },
    h4: {
      fontSize: '10pt',
      fontWeight: '600',
      color: '#333333',
      marginTop: '6pt',
      marginBottom: '4pt',
    },
  },
  listStyles: {
    bullet: {
      indent: '18pt',
      itemSpacing: '4pt',
      markerStyle: 'disc',
    },
    numbered: {
      indent: '18pt',
      itemSpacing: '4pt',
    },
  },
  tableStyles: {
    borderColor: '#333333',
    headerBackground: '#EEEEEE',
    headerColor: '#000000',
    cellPadding: '4pt',
  },
  marginStyles: {
    top: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    right: '0.5in',
  },
};

// ============================================================================
// STYLE CONFIGURATION MAP
// ============================================================================

const DOCUMENT_STYLE_MAP: Record<DocumentType, DocumentStyleConfig> = {
  'protocol': ICH_REGULATORY_STYLE,
  'ib': ICH_REGULATORY_STYLE,
  'csr': ICH_REGULATORY_STYLE,
  'dsur': ICH_REGULATORY_STYLE,
  'module-24': ICH_REGULATORY_STYLE,
  'module-25': ICH_REGULATORY_STYLE,
  'module-26': ICH_REGULATORY_STYLE,
  'module-27': ICH_REGULATORY_STYLE,
  'smpc': LABELING_STYLE,
  'pil': LABELING_STYLE,
  'label': LABELING_STYLE,
  'sop': QMS_DOCUMENT_STYLE,
  'work-instruction': QMS_DOCUMENT_STYLE,
  'haq-response': FDA_SUBMISSION_STYLE,
  'briefing-document': FDA_SUBMISSION_STYLE,
  'generic': ICH_REGULATORY_STYLE,
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DocumentTemplateStyleService {
  private static instance: DocumentTemplateStyleService;

  private constructor() {}

  static getInstance(): DocumentTemplateStyleService {
    if (!DocumentTemplateStyleService.instance) {
      DocumentTemplateStyleService.instance = new DocumentTemplateStyleService();
    }
    return DocumentTemplateStyleService.instance;
  }

  /**
   * Get the style configuration for a document type
   */
  getStyleConfig(documentType: DocumentType): DocumentStyleConfig {
    return DOCUMENT_STYLE_MAP[documentType] || DOCUMENT_STYLE_MAP['generic'];
  }

  /**
   * Generate CSS for a document type
   */
  generateCSS(documentType: DocumentType): string {
    const config = this.getStyleConfig(documentType);
    
    return `
      .document-template-content {
        font-family: ${config.fontFamily};
        font-size: ${config.baseFontSize};
        line-height: ${config.lineHeight};
        color: #000000;
        max-width: 8.5in;
        margin: 0 auto;
        padding: ${config.marginStyles.top} ${config.marginStyles.right} ${config.marginStyles.bottom} ${config.marginStyles.left};
        background: #ffffff;
      }

      .document-template-content p {
        margin-bottom: ${config.paragraphSpacing};
        text-align: justify;
      }

      .document-template-content h1 {
        font-size: ${config.headingStyles.h1.fontSize};
        font-weight: ${config.headingStyles.h1.fontWeight};
        color: ${config.headingStyles.h1.color};
        margin-top: ${config.headingStyles.h1.marginTop};
        margin-bottom: ${config.headingStyles.h1.marginBottom};
        ${config.headingStyles.h1.textTransform ? `text-transform: ${config.headingStyles.h1.textTransform};` : ''}
        ${config.headingStyles.h1.borderBottom ? `border-bottom: ${config.headingStyles.h1.borderBottom}; padding-bottom: 6pt;` : ''}
      }

      .document-template-content h2 {
        font-size: ${config.headingStyles.h2.fontSize};
        font-weight: ${config.headingStyles.h2.fontWeight};
        color: ${config.headingStyles.h2.color};
        margin-top: ${config.headingStyles.h2.marginTop};
        margin-bottom: ${config.headingStyles.h2.marginBottom};
      }

      .document-template-content h3 {
        font-size: ${config.headingStyles.h3.fontSize};
        font-weight: ${config.headingStyles.h3.fontWeight};
        color: ${config.headingStyles.h3.color};
        margin-top: ${config.headingStyles.h3.marginTop};
        margin-bottom: ${config.headingStyles.h3.marginBottom};
      }

      .document-template-content h4 {
        font-size: ${config.headingStyles.h4.fontSize};
        font-weight: ${config.headingStyles.h4.fontWeight};
        color: ${config.headingStyles.h4.color};
        margin-top: ${config.headingStyles.h4.marginTop};
        margin-bottom: ${config.headingStyles.h4.marginBottom};
      }

      .document-template-content ul {
        list-style-type: ${config.listStyles.bullet.markerStyle || 'disc'};
        padding-left: ${config.listStyles.bullet.indent};
        margin-bottom: ${config.paragraphSpacing};
      }

      .document-template-content ul li {
        margin-bottom: ${config.listStyles.bullet.itemSpacing};
      }

      .document-template-content ol {
        padding-left: ${config.listStyles.numbered.indent};
        margin-bottom: ${config.paragraphSpacing};
      }

      .document-template-content ol li {
        margin-bottom: ${config.listStyles.numbered.itemSpacing};
      }

      .document-template-content table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: ${config.paragraphSpacing};
        font-size: calc(${config.baseFontSize} - 1pt);
      }

      .document-template-content table th,
      .document-template-content table td {
        border: 1px solid ${config.tableStyles.borderColor};
        padding: ${config.tableStyles.cellPadding};
        text-align: left;
      }

      .document-template-content table th {
        background-color: ${config.tableStyles.headerBackground};
        color: ${config.tableStyles.headerColor};
        font-weight: 700;
      }

      ${config.tableStyles.alternateRowBackground ? `
      .document-template-content table tr:nth-child(even) td {
        background-color: ${config.tableStyles.alternateRowBackground};
      }
      ` : ''}

      .document-template-content .section-number {
        color: #666666;
        margin-right: 12pt;
        font-weight: 400;
      }

      .document-template-content blockquote {
        margin: 12pt 0 12pt 24pt;
        padding-left: 12pt;
        border-left: 3px solid #cccccc;
        font-style: italic;
        color: #555555;
      }

      .document-template-content code {
        font-family: 'Courier New', Courier, monospace;
        font-size: calc(${config.baseFontSize} - 1pt);
        background: #f5f5f5;
        padding: 2pt 4pt;
        border-radius: 2pt;
      }

      .document-template-content pre {
        font-family: 'Courier New', Courier, monospace;
        font-size: calc(${config.baseFontSize} - 1pt);
        background: #f5f5f5;
        padding: 12pt;
        border-radius: 4pt;
        overflow-x: auto;
        margin-bottom: ${config.paragraphSpacing};
      }

      @media print {
        .document-template-content {
          padding: 0;
        }
        
        .document-template-content h1,
        .document-template-content h2,
        .document-template-content h3 {
          page-break-after: avoid;
        }
        
        .document-template-content table {
          page-break-inside: avoid;
        }
      }
    `.trim();
  }

  /**
   * Apply template styling to raw content
   * Converts markdown/plain text to styled HTML
   */
  applyTemplateStyle(
    content: string,
    documentType: DocumentType,
    sectionNumber?: string,
    sectionTitle?: string
  ): StyledContent {
    const config = this.getStyleConfig(documentType);
    const css = this.generateCSS(documentType);
    
    // Process content to HTML with proper styling
    let html = this.convertToStyledHTML(content, sectionNumber, sectionTitle);
    
    // Wrap in template container
    html = `<div class="document-template-content">${html}</div>`;
    
    return {
      html,
      css,
      plainText: this.extractPlainText(content),
    };
  }

  /**
   * Convert raw content to styled HTML
   */
  private convertToStyledHTML(
    content: string,
    sectionNumber?: string,
    sectionTitle?: string
  ): string {
    let html = content;

    // Add section header if provided
    if (sectionTitle) {
      const numberPrefix = sectionNumber ? `<span class="section-number">${sectionNumber}</span>` : '';
      html = `<h2>${numberPrefix}${sectionTitle}</h2>\n${html}`;
    }

    // Convert markdown-style headings to HTML
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert bullet lists
    const bulletListRegex = /^[-•]\s+(.+)$/gm;
    let inList = false;
    const lines = html.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[-•]\s+/.test(line);

      if (isBullet && !inList) {
        processedLines.push('<ul>');
        inList = true;
      } else if (!isBullet && inList) {
        processedLines.push('</ul>');
        inList = false;
      }

      if (isBullet) {
        processedLines.push(`<li>${line.replace(/^[-•]\s+/, '')}</li>`);
      } else {
        processedLines.push(line);
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }
    html = processedLines.join('\n');

    // Convert numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.+<\/li>\n?)+/g, (match) => {
      if (!match.includes('<ul>')) {
        return `<ol>${match}</ol>`;
      }
      return match;
    });

    // Convert paragraphs (double newlines)
    html = html.replace(/\n\n+/g, '</p><p>');
    
    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<p>')) {
      html = `<p>${html}</p>`;
    }

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6])/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul|<ol)/g, '$1');
    html = html.replace(/(<\/ul>|<\/ol>)<\/p>/g, '$1');

    return html;
  }

  /**
   * Extract plain text from content
   */
  private extractPlainText(content: string): string {
    // Remove HTML tags
    let text = content.replace(/<[^>]+>/g, '');
    // Remove markdown syntax
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/^#+\s+/gm, '');
    text = text.replace(/^[-•]\s+/gm, '• ');
    return text.trim();
  }

  /**
   * Get the template style as inline styles for components that can't use CSS classes
   */
  getInlineStyles(documentType: DocumentType): Record<string, React.CSSProperties> {
    const config = this.getStyleConfig(documentType);
    
    return {
      container: {
        fontFamily: config.fontFamily,
        fontSize: config.baseFontSize,
        lineHeight: config.lineHeight,
        color: '#000000',
        maxWidth: '8.5in',
        margin: '0 auto',
        padding: `${config.marginStyles.top} ${config.marginStyles.right} ${config.marginStyles.bottom} ${config.marginStyles.left}`,
        background: '#ffffff',
      },
      paragraph: {
        marginBottom: config.paragraphSpacing,
        textAlign: 'justify' as const,
      },
      h1: {
        fontSize: config.headingStyles.h1.fontSize,
        fontWeight: config.headingStyles.h1.fontWeight as any,
        color: config.headingStyles.h1.color,
        marginTop: config.headingStyles.h1.marginTop,
        marginBottom: config.headingStyles.h1.marginBottom,
        textTransform: config.headingStyles.h1.textTransform as any,
        borderBottom: config.headingStyles.h1.borderBottom,
        paddingBottom: config.headingStyles.h1.borderBottom ? '6pt' : undefined,
      },
      h2: {
        fontSize: config.headingStyles.h2.fontSize,
        fontWeight: config.headingStyles.h2.fontWeight as any,
        color: config.headingStyles.h2.color,
        marginTop: config.headingStyles.h2.marginTop,
        marginBottom: config.headingStyles.h2.marginBottom,
      },
      h3: {
        fontSize: config.headingStyles.h3.fontSize,
        fontWeight: config.headingStyles.h3.fontWeight as any,
        color: config.headingStyles.h3.color,
        marginTop: config.headingStyles.h3.marginTop,
        marginBottom: config.headingStyles.h3.marginBottom,
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        marginBottom: config.paragraphSpacing,
      },
      tableHeader: {
        backgroundColor: config.tableStyles.headerBackground,
        color: config.tableStyles.headerColor,
        fontWeight: 700,
        padding: config.tableStyles.cellPadding,
        border: `1px solid ${config.tableStyles.borderColor}`,
        textAlign: 'left' as const,
      },
      tableCell: {
        padding: config.tableStyles.cellPadding,
        border: `1px solid ${config.tableStyles.borderColor}`,
        textAlign: 'left' as const,
      },
    };
  }

  /**
   * Determine document type from template or document metadata
   */
  detectDocumentType(
    templateId?: string,
    documentTypeName?: string,
    ctdSection?: string
  ): DocumentType {
    // Check CTD section mapping
    if (ctdSection) {
      if (ctdSection.startsWith('2.4')) return 'module-24';
      if (ctdSection.startsWith('2.5')) return 'module-25';
      if (ctdSection.startsWith('2.6')) return 'module-26';
      if (ctdSection.startsWith('2.7')) return 'module-27';
    }

    // Check document type name
    const typeLower = (documentTypeName || '').toLowerCase();
    if (typeLower.includes('protocol')) return 'protocol';
    if (typeLower.includes('investigator') && typeLower.includes('brochure')) return 'ib';
    if (typeLower.includes('csr') || typeLower.includes('clinical study report')) return 'csr';
    if (typeLower.includes('dsur')) return 'dsur';
    if (typeLower.includes('smpc') || typeLower.includes('summary of product')) return 'smpc';
    if (typeLower.includes('pil') || typeLower.includes('patient information')) return 'pil';
    if (typeLower.includes('label')) return 'label';
    if (typeLower.includes('sop')) return 'sop';
    if (typeLower.includes('work instruction')) return 'work-instruction';
    if (typeLower.includes('haq') || typeLower.includes('health authority')) return 'haq-response';
    if (typeLower.includes('briefing')) return 'briefing-document';

    return 'generic';
  }
}

// Export singleton instance
export const documentTemplateStyleService = DocumentTemplateStyleService.getInstance();

// Export helper function for direct use
export function applyDocumentTemplateStyle(
  content: string,
  documentType: DocumentType,
  sectionNumber?: string,
  sectionTitle?: string
): StyledContent {
  return documentTemplateStyleService.applyTemplateStyle(content, documentType, sectionNumber, sectionTitle);
}

export function getDocumentTemplateCSS(documentType: DocumentType): string {
  return documentTemplateStyleService.generateCSS(documentType);
}

export function getDocumentInlineStyles(documentType: DocumentType): Record<string, React.CSSProperties> {
  return documentTemplateStyleService.getInlineStyles(documentType);
}
