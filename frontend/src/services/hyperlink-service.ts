
/**
 * Hyperlink Management Service for eCTD Documents
 * 
 * Provides functionality similar to ISIToolbox/aPulse for:
 * - Auto-detecting linkable references in PDFs
 * - Creating and validating hyperlinks within/across documents
 * - Managing cross-module references
 * - PDF bookmark synchronization
 */

// Types for hyperlink management
export interface HyperlinkTarget {
  id: string;
  type: 'document' | 'section' | 'bookmark' | 'external' | 'table' | 'figure' | 'reference';
  module: string;
  section?: string;
  documentId?: string;
  documentTitle?: string;
  bookmarkName?: string;
  pageNumber?: number;
  url?: string;
  anchorText?: string;
}

export interface DetectedReference {
  id: string;
  text: string;
  type: 'study' | 'table' | 'figure' | 'section' | 'appendix' | 'reference' | 'module';
  sourceDocument: string;
  sourcePage: number;
  sourcePosition: { x: number; y: number; width: number; height: number };
  suggestedTarget?: HyperlinkTarget;
  confidence: number; // 0-100
  status: 'unlinked' | 'linked' | 'broken' | 'ignored';
}

export interface Hyperlink {
  id: string;
  sourceDocument: string;
  sourcePage: number;
  sourceRect: { x: number; y: number; width: number; height: number };
  sourceText: string;
  target: HyperlinkTarget;
  status: 'valid' | 'broken' | 'pending';
  createdAt: Date;
  createdBy: string;
  lastValidated?: Date;
}

export interface HyperlinkValidationResult {
  linkId: string;
  status: 'valid' | 'broken' | 'warning';
  message: string;
  details?: {
    targetExists: boolean;
    targetAccessible: boolean;
    pageExists: boolean;
    bookmarkExists: boolean;
  };
}

export interface DocumentLinkSummary {
  documentId: string;
  documentTitle: string;
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  pendingLinks: number;
  incomingLinks: number;
  outgoingLinks: number;
}

export interface CrossModuleLinkMap {
  sourceModule: string;
  targetModule: string;
  linkCount: number;
  links: Hyperlink[];
}

// Reference detection patterns
const REFERENCE_PATTERNS = {
  study: [
    /\b(Study\s+)?([A-Z]{2,4}[-\s]?\d{3,6}[-\s]?\d{0,4})\b/gi,  // Study ABC-123-456
    /\bCSR\s+([A-Z0-9-]+)\b/gi,  // CSR ABC-123
    /\b(Protocol\s+)?([A-Z]{2,4}[-]?\d{4,})\b/gi,  // Protocol ABC1234
  ],
  table: [
    /\bTable\s+(\d+(?:\.\d+)*(?:[a-z])?)\b/gi,  // Table 1, Table 2.1, Table 3.1a
    /\bTable\s+([IVXLC]+(?:\.\d+)?)\b/gi,  // Table IV, Table II.3
  ],
  figure: [
    /\bFigure\s+(\d+(?:\.\d+)*(?:[a-z])?)\b/gi,  // Figure 1, Figure 2.1
    /\bFig\.?\s+(\d+(?:\.\d+)*)\b/gi,  // Fig. 1, Fig 2.1
  ],
  section: [
    /\bSection\s+(\d+(?:\.\d+)*)\b/gi,  // Section 2.7.1
    /\b([Mm]odule\s+)?(\d)\.\d+(?:\.\d+)*\b/g,  // Module 2.7.1 or just 2.7.1
  ],
  appendix: [
    /\bAppendix\s+([A-Z](?:\.\d+)?)\b/gi,  // Appendix A, Appendix B.1
    /\bAppendix\s+(\d+(?:\.\d+)?)\b/gi,  // Appendix 1, Appendix 1.2
  ],
  reference: [
    /\[(\d+(?:[-–,]\d+)*)\]/g,  // [1], [1-3], [1,2,3]
    /\(([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}[a-z]?)\)/gi,  // (Smith et al., 2020)
  ],
  module: [
    /\bModule\s+([1-5])\b/gi,  // Module 1, Module 2, etc.
    /\bM([1-5])(?:\.\d+)*\b/gi,  // M1, M2.7, M5.3.5
  ],
};

// CTD Module cross-reference map (common linkages)
const CTD_CROSS_REFERENCES: Record<string, string[]> = {
  'm2.2': ['m3.2.s', 'm3.2.p'],  // Quality Overview → Drug Substance/Product
  'm2.3': ['m3'],  // Quality Summary → Quality Module
  'm2.4': ['m4'],  // Nonclinical Overview → Nonclinical Module
  'm2.5': ['m5'],  // Clinical Overview → Clinical Module
  'm2.6': ['m4'],  // Nonclinical Written Summaries → Nonclinical
  'm2.7': ['m5.3'],  // Clinical Summary → Clinical Study Reports
  'm2.7.1': ['m5.3.5'],  // Biopharmaceutics → BA/BE Studies
  'm2.7.2': ['m5.3.3', 'm5.3.4'],  // Pharmacokinetics → PK Studies
  'm2.7.3': ['m5.3.1', 'm5.3.2'],  // Pharmacodynamics → PD Studies
  'm2.7.4': ['m5.3.5'],  // Efficacy → Efficacy Studies
  'm2.7.6': ['m5.3.6'],  // Safety → Safety Studies
};

class HyperlinkService {
  private hyperlinks: Map<string, Hyperlink> = new Map();
  private detectedReferences: Map<string, DetectedReference[]> = new Map();
  private documentIndex: Map<string, { title: string; module: string; section: string }> = new Map();

  /**
   * Scan a document for potential linkable references
   */
  async scanDocument(
    documentId: string,
    documentContent: string,
    documentModule: string
  ): Promise<DetectedReference[]> {
    const references: DetectedReference[] = [];
    let refId = 0;

    // Simulate page-by-page scanning (in real impl, would parse PDF structure)
    const pages = this.splitIntoPages(documentContent);

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageContent = pages[pageNum];

      // Scan for each reference type
      for (const [refType, patterns] of Object.entries(REFERENCE_PATTERNS)) {
        for (const pattern of patterns) {
          let match;
          // Reset regex state
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(pageContent)) !== null) {
            const detectedRef: DetectedReference = {
              id: `ref-${documentId}-${refId++}`,
              text: match[0],
              type: refType as DetectedReference['type'],
              sourceDocument: documentId,
              sourcePage: pageNum + 1,
              sourcePosition: this.estimatePosition(match.index, pageContent),
              confidence: this.calculateConfidence(match[0], refType),
              status: 'unlinked',
            };

            // Try to find suggested target
            detectedRef.suggestedTarget = this.findSuggestedTarget(
              match[0],
              refType,
              documentModule
            );

            references.push(detectedRef);
          }
        }
      }
    }

    // Store for later use
    this.detectedReferences.set(documentId, references);

    return references;
  }

  /**
   * Auto-link detected references to targets
   */
  async autoLink(
    documentId: string,
    options: {
      minConfidence?: number;
      types?: DetectedReference['type'][];
      overwriteExisting?: boolean;
    } = {}
  ): Promise<{ linked: number; skipped: number; failed: number }> {
    const { minConfidence = 70, types, overwriteExisting = false } = options;
    const references = this.detectedReferences.get(documentId) || [];
    
    let linked = 0;
    let skipped = 0;
    let failed = 0;

    for (const ref of references) {
      // Skip if type filter doesn't match
      if (types && !types.includes(ref.type)) {
        skipped++;
        continue;
      }

      // Skip low confidence matches
      if (ref.confidence < minConfidence) {
        skipped++;
        continue;
      }

      // Skip already linked unless overwriting
      if (ref.status === 'linked' && !overwriteExisting) {
        skipped++;
        continue;
      }

      // Skip if no suggested target
      if (!ref.suggestedTarget) {
        failed++;
        continue;
      }

      // Create the hyperlink
      const hyperlink: Hyperlink = {
        id: `link-${Date.now()}-${linked}`,
        sourceDocument: documentId,
        sourcePage: ref.sourcePage,
        sourceRect: ref.sourcePosition,
        sourceText: ref.text,
        target: ref.suggestedTarget,
        status: 'pending',
        createdAt: new Date(),
        createdBy: 'auto-link',
      };

      this.hyperlinks.set(hyperlink.id, hyperlink);
      ref.status = 'linked';
      linked++;
    }

    return { linked, skipped, failed };
  }

  /**
   * Create a manual hyperlink
   */
  createHyperlink(
    sourceDocument: string,
    sourcePage: number,
    sourceRect: { x: number; y: number; width: number; height: number },
    sourceText: string,
    target: HyperlinkTarget,
    createdBy: string
  ): Hyperlink {
    const hyperlink: Hyperlink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceDocument,
      sourcePage,
      sourceRect,
      sourceText,
      target,
      status: 'pending',
      createdAt: new Date(),
      createdBy,
    };

    this.hyperlinks.set(hyperlink.id, hyperlink);
    return hyperlink;
  }

  /**
   * Validate all hyperlinks in a document or submission
   */
  async validateLinks(
    scope: { documentId?: string; submissionId?: string } = {}
  ): Promise<HyperlinkValidationResult[]> {
    const results: HyperlinkValidationResult[] = [];
    
    const linksToValidate = Array.from(this.hyperlinks.values()).filter(link => {
      if (scope.documentId) {
        return link.sourceDocument === scope.documentId;
      }
      return true; // Validate all if no scope specified
    });

    for (const link of linksToValidate) {
      const result = await this.validateSingleLink(link);
      results.push(result);

      // Update link status
      link.status = result.status === 'valid' ? 'valid' : 'broken';
      link.lastValidated = new Date();
    }

    return results;
  }

  /**
   * Validate a single hyperlink
   */
  private async validateSingleLink(link: Hyperlink): Promise<HyperlinkValidationResult> {
    const details = {
      targetExists: false,
      targetAccessible: false,
      pageExists: false,
      bookmarkExists: false,
    };

    // Check based on target type
    switch (link.target.type) {
      case 'document':
        details.targetExists = this.documentIndex.has(link.target.documentId || '');
        details.targetAccessible = details.targetExists;
        break;

      case 'bookmark':
        details.targetExists = this.documentIndex.has(link.target.documentId || '');
        // In real impl, would check if bookmark exists in PDF
        details.bookmarkExists = true; // Simulated
        break;

      case 'external':
        // In real impl, would check if URL is accessible
        details.targetExists = !!link.target.url;
        details.targetAccessible = true; // Simulated
        break;

      case 'section':
        details.targetExists = true; // Simulated
        break;

      default:
        details.targetExists = true;
    }

    const isValid = details.targetExists && details.targetAccessible;

    return {
      linkId: link.id,
      status: isValid ? 'valid' : 'broken',
      message: isValid 
        ? 'Link is valid' 
        : `Target not found: ${link.target.documentTitle || link.target.url || link.target.bookmarkName}`,
      details,
    };
  }

  /**
   * Get link summary for a document
   */
  getDocumentLinkSummary(documentId: string): DocumentLinkSummary {
    const allLinks = Array.from(this.hyperlinks.values());
    const outgoing = allLinks.filter(l => l.sourceDocument === documentId);
    const incoming = allLinks.filter(l => l.target.documentId === documentId);

    return {
      documentId,
      documentTitle: this.documentIndex.get(documentId)?.title || 'Unknown',
      totalLinks: outgoing.length,
      validLinks: outgoing.filter(l => l.status === 'valid').length,
      brokenLinks: outgoing.filter(l => l.status === 'broken').length,
      pendingLinks: outgoing.filter(l => l.status === 'pending').length,
      incomingLinks: incoming.length,
      outgoingLinks: outgoing.length,
    };
  }

  /**
   * Get cross-module link map
   */
  getCrossModuleLinkMap(): CrossModuleLinkMap[] {
    const linkMap = new Map<string, Hyperlink[]>();
    
    for (const link of Array.from(Array.from(Array.from(Array.from(Array.from(this.hyperlinks.values())))))) {
      const sourceDoc = this.documentIndex.get(link.sourceDocument);
      const targetDoc = link.target.documentId 
        ? this.documentIndex.get(link.target.documentId)
        : null;

      if (sourceDoc && targetDoc) {
        const key = `${sourceDoc.module}->${targetDoc.module}`;
        if (!linkMap.has(key)) {
          linkMap.set(key, []);
        }
        linkMap.get(key)!.push(link);
      }
    }

    return Array.from(linkMap.entries()).map(([key, links]) => {
      const [source, target] = key.split('->');
      return {
        sourceModule: source,
        targetModule: target,
        linkCount: links.length,
        links,
      };
    });
  }

  /**
   * Get suggested cross-module links based on CTD structure
   */
  getSuggestedCrossModuleLinks(sourceModule: string): string[] {
    const normalizedModule = sourceModule.toLowerCase().replace(/\s+/g, '');
    return CTD_CROSS_REFERENCES[normalizedModule] || [];
  }

  /**
   * Register a document in the index for link resolution
   */
  registerDocument(documentId: string, title: string, module: string, section: string): void {
    this.documentIndex.set(documentId, { title, module, section });
  }

  /**
   * Get all hyperlinks for a document
   */
  getDocumentHyperlinks(documentId: string): Hyperlink[] {
    return Array.from(this.hyperlinks.values()).filter(
      l => l.sourceDocument === documentId
    );
  }

  /**
   * Delete a hyperlink
   */
  deleteHyperlink(linkId: string): boolean {
    return this.hyperlinks.delete(linkId);
  }

  /**
   * Export hyperlinks for a submission (for embedding in PDFs)
   */
  exportHyperlinks(submissionId?: string): {
    links: Hyperlink[];
    summary: {
      total: number;
      valid: number;
      broken: number;
      byType: Record<string, number>;
    };
  } {
    const links = Array.from(this.hyperlinks.values());
    
    const byType: Record<string, number> = {};
    for (const link of links) {
      byType[link.target.type] = (byType[link.target.type] || 0) + 1;
    }

    return {
      links,
      summary: {
        total: links.length,
        valid: links.filter(l => l.status === 'valid').length,
        broken: links.filter(l => l.status === 'broken').length,
        byType,
      },
    };
  }

  // Helper methods
  private splitIntoPages(content: string): string[] {
    // Simulated page splitting - in real impl would parse PDF structure
    const avgCharsPerPage = 3000;
    const pages: string[] = [];
    for (let i = 0; i < content.length; i += avgCharsPerPage) {
      pages.push(content.slice(i, i + avgCharsPerPage));
    }
    return pages.length > 0 ? pages : [content];
  }

  private estimatePosition(
    charIndex: number,
    pageContent: string
  ): { x: number; y: number; width: number; height: number } {
    // Simulated position estimation
    const lineHeight = 12;
    const charsPerLine = 80;
    const line = Math.floor(charIndex / charsPerLine);
    const col = charIndex % charsPerLine;

    return {
      x: 72 + col * 7,  // ~72pt margin, ~7pt per char
      y: 72 + line * lineHeight,
      width: 100,
      height: lineHeight,
    };
  }

  private calculateConfidence(matchText: string, refType: string): number {
    // Base confidence by type
    const baseConfidence: Record<string, number> = {
      study: 85,
      table: 90,
      figure: 90,
      section: 80,
      appendix: 85,
      reference: 75,
      module: 95,
    };

    let confidence = baseConfidence[refType] || 70;

    // Adjust based on match quality
    if (matchText.length > 20) confidence -= 10;  // Long matches less reliable
    if (/^\d+$/.test(matchText)) confidence -= 20;  // Pure numbers less reliable
    if (matchText.includes(' ')) confidence += 5;  // Space-separated more reliable

    return Math.max(0, Math.min(100, confidence));
  }

  private findSuggestedTarget(
    matchText: string,
    refType: string,
    sourceModule: string
  ): HyperlinkTarget | undefined {
    // Try to find a matching document in the index
    const normalizedMatch = matchText.toLowerCase().replace(/\s+/g, '');
    
    for (const [docId, doc] of Array.from(Array.from(Array.from(Array.from(Array.from(this.documentIndex.entries())))))) {
      const normalizedTitle = doc.title.toLowerCase().replace(/\s+/g, '');
      
      if (normalizedTitle.includes(normalizedMatch) || normalizedMatch.includes(normalizedTitle)) {
        return {
          id: `target-${docId}`,
          type: 'document',
          module: doc.module,
          section: doc.section,
          documentId: docId,
          documentTitle: doc.title,
        };
      }
    }

    // Return a placeholder target based on reference type
    if (refType === 'section') {
      const sectionMatch = matchText.match(/(\d+(?:\.\d+)*)/);
      if (sectionMatch) {
        return {
          id: `target-section-${sectionMatch[1]}`,
          type: 'section',
          module: sectionMatch[1].split('.')[0] || sourceModule,
          section: sectionMatch[1],
          anchorText: matchText,
        };
      }
    }

    return undefined;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.hyperlinks.clear();
    this.detectedReferences.clear();
    this.documentIndex.clear();
  }
}

// Export singleton instance
export const hyperlinkService = new HyperlinkService();

// Export types and class for testing
export { HyperlinkService };
