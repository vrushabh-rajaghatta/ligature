
/**
 * Citation & Cross-Reference System Types
 * 
 * A2.3: Types for managing citations, cross-references, and bibliography
 * in AI-generated regulatory documents.
 */

// ============================================================================
// CITATION TYPES
// ============================================================================

/**
 * Type of citation source
 */
export type CitationSourceType =
  | 'source_document'   // Uploaded source documents (CSR, Protocol, etc.)
  | 'literature'        // Published literature
  | 'table'             // Table reference
  | 'figure'            // Figure reference
  | 'listing'           // Listing reference
  | 'section'           // Cross-reference to another section
  | 'appendix'          // Appendix reference
  | 'external';         // External reference (website, etc.)

/**
 * Citation style format
 */
export type CitationStyle =
  | 'numeric'           // [1], [2], [3]
  | 'author_year'       // (Smith, 2024)
  | 'superscript'       // ¹, ², ³
  | 'inline'            // Smith et al. (2024)
  | 'ama'               // AMA style (numeric superscript)
  | 'vancouver';        // Vancouver style (numeric)

/**
 * Individual citation instance in text
 */
export interface Citation {
  id: string;
  /** Reference number or key */
  key: string;
  /** Type of citation */
  type: CitationSourceType;
  /** Display text in document */
  displayText: string;
  /** Position in document (character offset) */
  position: {
    sectionId: string;
    start: number;
    end: number;
  };
  /** Reference to source */
  sourceRef: CitationSourceRef;
  /** Whether citation has been verified */
  verified: boolean;
  /** Verification status */
  verificationStatus?: 'valid' | 'broken' | 'outdated' | 'pending';
  /** Last verification timestamp */
  verifiedAt?: Date;
  /** Created by */
  createdBy: 'ai' | 'user';
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Reference to the cited source
 */
export interface CitationSourceRef {
  /** Source document ID (for uploaded docs) */
  sourceId?: string;
  /** Chunk ID within source */
  chunkId?: string;
  /** Page number(s) */
  pageNumbers?: number[];
  /** Specific text excerpt that supports the citation */
  excerpt?: string;
  /** Section title in source */
  sectionTitle?: string;
  /** For tables/figures/listings */
  tflNumber?: string;
  /** For cross-references */
  targetSectionId?: string;
  /** For literature citations */
  bibliographyEntryId?: string;
}

// ============================================================================
// CROSS-REFERENCE TYPES
// ============================================================================

/**
 * Cross-reference between document sections
 */
export interface CrossReference {
  id: string;
  /** Source section ID */
  fromSectionId: string;
  /** Target section ID */
  toSectionId: string;
  /** Type of reference */
  type: 'section' | 'table' | 'figure' | 'listing' | 'appendix';
  /** Reference text (e.g., "Section 11.4.1") */
  referenceText: string;
  /** Position in source section */
  position: {
    start: number;
    end: number;
  };
  /** Target number/identifier */
  targetNumber: string;
  /** Target title */
  targetTitle?: string;
  /** Validation status */
  status: 'valid' | 'broken' | 'target_moved' | 'target_deleted';
  /** Last validated */
  validatedAt?: Date;
}

/**
 * Table/Figure/Listing reference
 */
export interface TFLReference {
  id: string;
  /** Type of TFL */
  type: 'table' | 'figure' | 'listing';
  /** Number (e.g., "11.4.1") */
  number: string;
  /** Title */
  title: string;
  /** Section where TFL is defined */
  definedInSectionId: string;
  /** All sections that reference this TFL */
  referencedInSections: string[];
  /** Source document ID (if TFL comes from source) */
  sourceId?: string;
  /** Status */
  status: 'defined' | 'pending' | 'draft';
}

// ============================================================================
// BIBLIOGRAPHY TYPES
// ============================================================================

/**
 * Bibliography entry for literature references
 */
export interface BibliographyEntry {
  id: string;
  /** Citation key (e.g., "smith2024") */
  key: string;
  /** Entry type */
  type: 'article' | 'book' | 'chapter' | 'conference' | 'report' | 'website' | 'other';
  /** Authors */
  authors: Author[];
  /** Title */
  title: string;
  /** Journal/Book title */
  journalTitle?: string;
  /** Year */
  year: number;
  /** Volume */
  volume?: string;
  /** Issue */
  issue?: string;
  /** Pages */
  pages?: string;
  /** DOI */
  doi?: string;
  /** PubMed ID */
  pmid?: string;
  /** URL */
  url?: string;
  /** Access date (for websites) */
  accessDate?: Date;
  /** Publisher */
  publisher?: string;
  /** Edition */
  edition?: string;
  /** Notes */
  notes?: string;
  /** Times cited in document */
  citationCount: number;
  /** First citation position */
  firstCitedInSection?: string;
}

/**
 * Author information
 */
export interface Author {
  firstName?: string;
  lastName: string;
  initials?: string;
  suffix?: string;
  isOrganization?: boolean;
  organizationName?: string;
}

// ============================================================================
// CITATION MANAGER STATE
// ============================================================================

/**
 * Citation manager state for a document
 */
export interface CitationManagerState {
  /** Document ID */
  documentId: string;
  /** Citation style being used */
  style: CitationStyle;
  /** All citations in document */
  citations: Citation[];
  /** Cross-references */
  crossReferences: CrossReference[];
  /** TFL references */
  tflReferences: TFLReference[];
  /** Bibliography entries */
  bibliography: BibliographyEntry[];
  /** Last validation timestamp */
  lastValidated?: Date;
  /** Validation summary */
  validationSummary?: ValidationSummary;
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  totalCitations: number;
  validCitations: number;
  brokenCitations: number;
  outdatedCitations: number;
  pendingVerification: number;
  totalCrossRefs: number;
  validCrossRefs: number;
  brokenCrossRefs: number;
  missingTFLs: string[];
  duplicateTFLNumbers: string[];
}

// ============================================================================
// CITATION OPERATIONS
// ============================================================================

/**
 * Request to add a citation
 */
export interface AddCitationRequest {
  sectionId: string;
  position: { start: number; end: number };
  type: CitationSourceType;
  sourceRef: CitationSourceRef;
  createdBy: 'ai' | 'user';
}

/**
 * Request to update a citation
 */
export interface UpdateCitationRequest {
  citationId: string;
  updates: Partial<Pick<Citation, 'sourceRef' | 'verified' | 'verificationStatus'>>;
}

/**
 * Citation search/filter options
 */
export interface CitationFilterOptions {
  type?: CitationSourceType[];
  verified?: boolean;
  verificationStatus?: Citation['verificationStatus'][];
  sectionId?: string;
  createdBy?: 'ai' | 'user';
}

// ============================================================================
// CITATION PANEL TYPES
// ============================================================================

/**
 * Citation panel view mode
 */
export type CitationPanelView = 
  | 'citations'      // List of inline citations
  | 'crossrefs'      // Cross-references
  | 'tfls'           // Table/Figure/Listing references
  | 'bibliography';  // Bibliography entries

/**
 * Citation with resolved source information
 */
export interface ResolvedCitation extends Citation {
  /** Resolved source document name */
  sourceName?: string;
  /** Resolved source document type */
  sourceType?: string;
  /** Full excerpt text */
  fullExcerpt?: string;
  /** Section in current document */
  sectionTitle?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate citation display text based on style
 */
export function formatCitationDisplay(
  entry: BibliographyEntry,
  style: CitationStyle,
  number?: number
): string {
  switch (style) {
    case 'numeric':
      return `[${number}]`;
    case 'superscript':
    case 'ama':
      return `${number}`;
    case 'author_year':
      return formatAuthorYear(entry);
    case 'inline':
      return formatInline(entry);
    case 'vancouver':
      return `(${number})`;
    default:
      return `[${number}]`;
  }
}

/**
 * Format author-year citation
 */
function formatAuthorYear(entry: BibliographyEntry): string {
  const firstAuthor = entry.authors[0];
  if (!firstAuthor) return `(${entry.year})`;
  
  const authorName = firstAuthor.isOrganization 
    ? firstAuthor.organizationName 
    : firstAuthor.lastName;
  
  if (entry.authors.length === 1) {
    return `(${authorName}, ${entry.year})`;
  } else if (entry.authors.length === 2) {
    const secondAuthor = entry.authors[1];
    const secondName = secondAuthor.isOrganization 
      ? secondAuthor.organizationName 
      : secondAuthor.lastName;
    return `(${authorName} & ${secondName}, ${entry.year})`;
  } else {
    return `(${authorName} et al., ${entry.year})`;
  }
}

/**
 * Format inline citation
 */
function formatInline(entry: BibliographyEntry): string {
  const firstAuthor = entry.authors[0];
  if (!firstAuthor) return `(${entry.year})`;
  
  const authorName = firstAuthor.isOrganization 
    ? firstAuthor.organizationName 
    : firstAuthor.lastName;
  
  if (entry.authors.length === 1) {
    return `${authorName} (${entry.year})`;
  } else if (entry.authors.length === 2) {
    const secondAuthor = entry.authors[1];
    const secondName = secondAuthor.isOrganization 
      ? secondAuthor.organizationName 
      : secondAuthor.lastName;
    return `${authorName} and ${secondName} (${entry.year})`;
  } else {
    return `${authorName} et al. (${entry.year})`;
  }
}

/**
 * Format bibliography entry for display
 */
export function formatBibliographyEntry(
  entry: BibliographyEntry,
  style: CitationStyle = 'ama'
): string {
  const authors = formatAuthors(entry.authors, style);
  
  switch (entry.type) {
    case 'article':
      return formatArticle(entry, authors, style);
    case 'book':
      return formatBook(entry, authors);
    case 'chapter':
      return formatChapter(entry, authors);
    case 'website':
      return formatWebsite(entry, authors);
    default:
      return `${authors}. ${entry.title}. ${entry.year}.`;
  }
}

/**
 * Format authors list
 */
function formatAuthors(authors: Author[], style: CitationStyle): string {
  if (authors.length === 0) return '';
  
  const formatted = authors.map(a => {
    if (a.isOrganization) return a.organizationName || '';
    const initials = a.initials || (a.firstName ? a.firstName[0] : '');
    return `${a.lastName} ${initials}`;
  });
  
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, ${formatted[1]}`;
  if (formatted.length <= 6) {
    return formatted.slice(0, -1).join(', ') + ', ' + formatted[formatted.length - 1];
  }
  return formatted.slice(0, 3).join(', ') + ', et al';
}

/**
 * Format journal article
 */
function formatArticle(entry: BibliographyEntry, authors: string, style: CitationStyle): string {
  let citation = `${authors}. ${entry.title}. `;
  if (entry.journalTitle) {
    citation += `${entry.journalTitle}. `;
  }
  citation += `${entry.year}`;
  if (entry.volume) {
    citation += `;${entry.volume}`;
    if (entry.issue) citation += `(${entry.issue})`;
  }
  if (entry.pages) citation += `:${entry.pages}`;
  citation += '.';
  if (entry.doi) citation += ` doi:${entry.doi}`;
  return citation;
}

/**
 * Format book
 */
function formatBook(entry: BibliographyEntry, authors: string): string {
  let citation = `${authors}. ${entry.title}. `;
  if (entry.edition) citation += `${entry.edition} ed. `;
  if (entry.publisher) citation += `${entry.publisher}; `;
  citation += `${entry.year}.`;
  return citation;
}

/**
 * Format book chapter
 */
function formatChapter(entry: BibliographyEntry, authors: string): string {
  let citation = `${authors}. ${entry.title}. `;
  if (entry.journalTitle) citation += `In: ${entry.journalTitle}. `;
  if (entry.publisher) citation += `${entry.publisher}; `;
  citation += `${entry.year}`;
  if (entry.pages) citation += `:${entry.pages}`;
  citation += '.';
  return citation;
}

/**
 * Format website
 */
function formatWebsite(entry: BibliographyEntry, authors: string): string {
  let citation = authors ? `${authors}. ` : '';
  citation += `${entry.title}. `;
  if (entry.url) citation += `${entry.url}. `;
  if (entry.accessDate) {
    citation += `Accessed ${entry.accessDate.toLocaleDateString()}.`;
  }
  return citation;
}

/**
 * Generate a unique citation key
 */
export function generateCitationKey(entry: Partial<BibliographyEntry>): string {
  const firstAuthor = entry.authors?.[0];
  const authorPart = firstAuthor?.lastName?.toLowerCase().replace(/\s+/g, '') || 'unknown';
  const yearPart = entry.year || new Date().getFullYear();
  const randomSuffix = Math.random().toString(36).substring(2, 4);
  return `${authorPart}${yearPart}${randomSuffix}`;
}

/**
 * Validate citation reference
 */
export function validateCitationRef(
  citation: Citation,
  availableSources: { id: string; type: string }[],
  availableSections: { id: string; number: string }[]
): { valid: boolean; error?: string } {
  const { sourceRef, type } = citation;
  
  // Check source document reference
  if (type === 'source_document' && sourceRef.sourceId) {
    const sourceExists = availableSources.some(s => s.id === sourceRef.sourceId);
    if (!sourceExists) {
      return { valid: false, error: 'Source document not found' };
    }
  }
  
  // Check cross-reference
  if (type === 'section' && sourceRef.targetSectionId) {
    const sectionExists = availableSections.some(s => s.id === sourceRef.targetSectionId);
    if (!sectionExists) {
      return { valid: false, error: 'Target section not found' };
    }
  }
  
  // Check TFL reference
  if (['table', 'figure', 'listing'].includes(type) && !sourceRef.tflNumber) {
    return { valid: false, error: 'TFL number required' };
  }
  
  return { valid: true };
}

/**
 * Get validation summary from citations and cross-refs
 */
export function calculateValidationSummary(
  citations: Citation[],
  crossRefs: CrossReference[],
  tflRefs: TFLReference[]
): ValidationSummary {
  const totalCitations = citations.length;
  const validCitations = citations.filter(c => c.verificationStatus === 'valid').length;
  const brokenCitations = citations.filter(c => c.verificationStatus === 'broken').length;
  const outdatedCitations = citations.filter(c => c.verificationStatus === 'outdated').length;
  const pendingVerification = citations.filter(c => c.verificationStatus === 'pending' || !c.verified).length;
  
  const totalCrossRefs = crossRefs.length;
  const validCrossRefs = crossRefs.filter(c => c.status === 'valid').length;
  const brokenCrossRefs = crossRefs.filter(c => c.status === 'broken' || c.status === 'target_deleted').length;
  
  const missingTFLs = tflRefs.filter(t => t.status === 'pending').map(t => t.number);
  
  // Find duplicate TFL numbers
  const tflNumbers = tflRefs.map(t => `${t.type}-${t.number}`);
  const duplicateTFLNumbers = tflNumbers.filter((num, idx) => tflNumbers.indexOf(num) !== idx);
  
  return {
    totalCitations,
    validCitations,
    brokenCitations,
    outdatedCitations,
    pendingVerification,
    totalCrossRefs,
    validCrossRefs,
    brokenCrossRefs,
    missingTFLs,
    duplicateTFLNumbers: Array.from(new Set(duplicateTFLNumbers)),
  };
}

/**
 * Sort bibliography entries
 */
export function sortBibliography(
  entries: BibliographyEntry[],
  by: 'author' | 'year' | 'citation_order' = 'citation_order'
): BibliographyEntry[] {
  const sorted = [...entries];
  
  switch (by) {
    case 'author':
      return sorted.sort((a, b) => {
        const aName = a.authors[0]?.lastName || '';
        const bName = b.authors[0]?.lastName || '';
        return aName.localeCompare(bName);
      });
    case 'year':
      return sorted.sort((a, b) => b.year - a.year);
    case 'citation_order':
    default:
      // Sort by first citation position (would need additional data)
      return sorted;
  }
}
