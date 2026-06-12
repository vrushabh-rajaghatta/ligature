
/**
 * Citation Manager Service
 * 
 * A2.3: Service for managing citations, cross-references, and bibliography
 * in AI-generated regulatory documents.
 */

import {
  Citation,
  CitationSourceType,
  CitationSourceRef,
  CitationStyle,
  CitationManagerState,
  CrossReference,
  TFLReference,
  BibliographyEntry,
  AddCitationRequest,
  UpdateCitationRequest,
  CitationFilterOptions,
  ValidationSummary,
  ResolvedCitation,
  calculateValidationSummary,
  formatCitationDisplay,
  formatBibliographyEntry,
  generateCitationKey,
  validateCitationRef,
} from '@/types/citation';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ICitationManager {
  // State
  getState(): CitationManagerState;
  setState(state: Partial<CitationManagerState>): void;
  setStyle(style: CitationStyle): void;
  
  // Citations
  addCitation(request: AddCitationRequest): Citation;
  updateCitation(request: UpdateCitationRequest): Citation | null;
  removeCitation(citationId: string): boolean;
  getCitation(citationId: string): Citation | null;
  getCitations(filter?: CitationFilterOptions): Citation[];
  getCitationsForSection(sectionId: string): Citation[];
  resolveCitation(citation: Citation): ResolvedCitation;
  
  // Cross-references
  addCrossReference(crossRef: Omit<CrossReference, 'id' | 'status' | 'validatedAt'>): CrossReference;
  updateCrossReference(id: string, updates: Partial<CrossReference>): CrossReference | null;
  removeCrossReference(id: string): boolean;
  getCrossReferences(sectionId?: string): CrossReference[];
  validateCrossReferences(): CrossReference[];
  
  // TFL References
  addTFLReference(tfl: Omit<TFLReference, 'id' | 'referencedInSections'>): TFLReference;
  updateTFLReference(id: string, updates: Partial<TFLReference>): TFLReference | null;
  removeTFLReference(id: string): boolean;
  getTFLReferences(type?: TFLReference['type']): TFLReference[];
  getTFLByNumber(type: TFLReference['type'], number: string): TFLReference | null;
  
  // Bibliography
  addBibliographyEntry(entry: Omit<BibliographyEntry, 'id' | 'key' | 'citationCount'>): BibliographyEntry;
  updateBibliographyEntry(id: string, updates: Partial<BibliographyEntry>): BibliographyEntry | null;
  removeBibliographyEntry(id: string): boolean;
  getBibliographyEntry(id: string): BibliographyEntry | null;
  getBibliographyEntryByKey(key: string): BibliographyEntry | null;
  getBibliography(): BibliographyEntry[];
  generateBibliographyText(style?: CitationStyle): string;
  
  // Validation
  validate(): ValidationSummary;
  validateCitation(citationId: string): Citation;
  
  // Renumbering
  renumberCitations(): void;
  renumberTFLs(type: TFLReference['type']): void;
  
  // Import/Export
  exportState(): string;
  importState(json: string): boolean;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export class CitationManager implements ICitationManager {
  private state: CitationManagerState;
  private sourceResolver?: (sourceId: string) => { name: string; type: string } | null;
  private sectionResolver?: (sectionId: string) => { number: string; title: string } | null;
  
  constructor(
    documentId: string,
    style: CitationStyle = 'numeric',
    resolvers?: {
      sourceResolver?: (sourceId: string) => { name: string; type: string } | null;
      sectionResolver?: (sectionId: string) => { number: string; title: string } | null;
    }
  ) {
    this.state = {
      documentId,
      style,
      citations: [],
      crossReferences: [],
      tflReferences: [],
      bibliography: [],
    };
    this.sourceResolver = resolvers?.sourceResolver;
    this.sectionResolver = resolvers?.sectionResolver;
  }
  
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  getState(): CitationManagerState {
    return { ...this.state };
  }
  
  setState(updates: Partial<CitationManagerState>): void {
    this.state = { ...this.state, ...updates };
  }
  
  setStyle(style: CitationStyle): void {
    this.state.style = style;
    // Renumber citations to update display text
    this.renumberCitations();
  }
  
  // ---------------------------------------------------------------------------
  // CITATIONS
  // ---------------------------------------------------------------------------
  
  addCitation(request: AddCitationRequest): Citation {
    const id = `cit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const citationNumber = this.state.citations.length + 1;
    
    const citation: Citation = {
      id,
      key: `${citationNumber}`,
      type: request.type,
      displayText: this.formatCitationKey(citationNumber),
      position: {
        sectionId: request.sectionId,
        ...request.position,
      },
      sourceRef: request.sourceRef,
      verified: false,
      verificationStatus: 'pending',
      createdBy: request.createdBy,
      createdAt: new Date(),
    };
    
    this.state.citations.push(citation);
    
    // Update bibliography citation count if applicable
    if (request.sourceRef.bibliographyEntryId) {
      const entry = this.getBibliographyEntry(request.sourceRef.bibliographyEntryId);
      if (entry) {
        entry.citationCount++;
        if (!entry.firstCitedInSection) {
          entry.firstCitedInSection = request.sectionId;
        }
      }
    }
    
    return citation;
  }
  
  updateCitation(request: UpdateCitationRequest): Citation | null {
    const index = this.state.citations.findIndex(c => c.id === request.citationId);
    if (index === -1) return null;
    
    const citation = this.state.citations[index];
    this.state.citations[index] = {
      ...citation,
      ...request.updates,
      verifiedAt: request.updates.verified ? new Date() : citation.verifiedAt,
    };
    
    return this.state.citations[index];
  }
  
  removeCitation(citationId: string): boolean {
    const index = this.state.citations.findIndex(c => c.id === citationId);
    if (index === -1) return false;
    
    const citation = this.state.citations[index];
    
    // Update bibliography citation count
    if (citation.sourceRef.bibliographyEntryId) {
      const entry = this.getBibliographyEntry(citation.sourceRef.bibliographyEntryId);
      if (entry && entry.citationCount > 0) {
        entry.citationCount--;
      }
    }
    
    this.state.citations.splice(index, 1);
    this.renumberCitations();
    return true;
  }
  
  getCitation(citationId: string): Citation | null {
    return this.state.citations.find(c => c.id === citationId) || null;
  }
  
  getCitations(filter?: CitationFilterOptions): Citation[] {
    let citations = [...this.state.citations];
    
    if (filter) {
      if (filter.type && filter.type.length > 0) {
        citations = citations.filter(c => filter.type!.includes(c.type));
      }
      if (filter.verified !== undefined) {
        citations = citations.filter(c => c.verified === filter.verified);
      }
      if (filter.verificationStatus && filter.verificationStatus.length > 0) {
        citations = citations.filter(c => 
          c.verificationStatus && filter.verificationStatus!.includes(c.verificationStatus)
        );
      }
      if (filter.sectionId) {
        citations = citations.filter(c => c.position.sectionId === filter.sectionId);
      }
      if (filter.createdBy) {
        citations = citations.filter(c => c.createdBy === filter.createdBy);
      }
    }
    
    return citations;
  }
  
  getCitationsForSection(sectionId: string): Citation[] {
    return this.state.citations
      .filter(c => c.position.sectionId === sectionId)
      .sort((a, b) => a.position.start - b.position.start);
  }
  
  resolveCitation(citation: Citation): ResolvedCitation {
    const resolved: ResolvedCitation = { ...citation };
    
    // Resolve source document
    if (citation.sourceRef.sourceId && this.sourceResolver) {
      const source = this.sourceResolver(citation.sourceRef.sourceId);
      if (source) {
        resolved.sourceName = source.name;
        resolved.sourceType = source.type;
      }
    }
    
    // Resolve section
    if (this.sectionResolver) {
      const section = this.sectionResolver(citation.position.sectionId);
      if (section) {
        resolved.sectionTitle = section.title;
      }
    }
    
    // Copy excerpt
    if (citation.sourceRef.excerpt) {
      resolved.fullExcerpt = citation.sourceRef.excerpt;
    }
    
    return resolved;
  }
  
  private formatCitationKey(number: number): string {
    switch (this.state.style) {
      case 'numeric':
        return `[${number}]`;
      case 'superscript':
      case 'ama':
        return `${number}`;
      case 'vancouver':
        return `(${number})`;
      default:
        return `[${number}]`;
    }
  }
  
  // ---------------------------------------------------------------------------
  // CROSS-REFERENCES
  // ---------------------------------------------------------------------------
  
  addCrossReference(crossRef: Omit<CrossReference, 'id' | 'status' | 'validatedAt'>): CrossReference {
    const id = `xref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCrossRef: CrossReference = {
      ...crossRef,
      id,
      status: 'valid',
      validatedAt: new Date(),
    };
    
    this.state.crossReferences.push(newCrossRef);
    return newCrossRef;
  }
  
  updateCrossReference(id: string, updates: Partial<CrossReference>): CrossReference | null {
    const index = this.state.crossReferences.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    this.state.crossReferences[index] = {
      ...this.state.crossReferences[index],
      ...updates,
    };
    
    return this.state.crossReferences[index];
  }
  
  removeCrossReference(id: string): boolean {
    const index = this.state.crossReferences.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.state.crossReferences.splice(index, 1);
    return true;
  }
  
  getCrossReferences(sectionId?: string): CrossReference[] {
    if (sectionId) {
      return this.state.crossReferences.filter(c => c.fromSectionId === sectionId);
    }
    return [...this.state.crossReferences];
  }
  
  validateCrossReferences(): CrossReference[] {
    const invalidRefs: CrossReference[] = [];
    
    for (const crossRef of this.state.crossReferences) {
      // Check if target section exists
      if (this.sectionResolver) {
        const targetSection = this.sectionResolver(crossRef.toSectionId);
        if (!targetSection) {
          crossRef.status = 'target_deleted';
          invalidRefs.push(crossRef);
        } else if (targetSection.number !== crossRef.targetNumber) {
          crossRef.status = 'target_moved';
          invalidRefs.push(crossRef);
        } else {
          crossRef.status = 'valid';
        }
        crossRef.validatedAt = new Date();
      }
    }
    
    return invalidRefs;
  }
  
  // ---------------------------------------------------------------------------
  // TFL REFERENCES
  // ---------------------------------------------------------------------------
  
  addTFLReference(tfl: Omit<TFLReference, 'id' | 'referencedInSections'>): TFLReference {
    const id = `tfl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTFL: TFLReference = {
      ...tfl,
      id,
      referencedInSections: [],
    };
    
    this.state.tflReferences.push(newTFL);
    return newTFL;
  }
  
  updateTFLReference(id: string, updates: Partial<TFLReference>): TFLReference | null {
    const index = this.state.tflReferences.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.state.tflReferences[index] = {
      ...this.state.tflReferences[index],
      ...updates,
    };
    
    return this.state.tflReferences[index];
  }
  
  removeTFLReference(id: string): boolean {
    const index = this.state.tflReferences.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.state.tflReferences.splice(index, 1);
    return true;
  }
  
  getTFLReferences(type?: TFLReference['type']): TFLReference[] {
    if (type) {
      return this.state.tflReferences.filter(t => t.type === type);
    }
    return [...this.state.tflReferences];
  }
  
  getTFLByNumber(type: TFLReference['type'], number: string): TFLReference | null {
    return this.state.tflReferences.find(t => t.type === type && t.number === number) || null;
  }
  
  // ---------------------------------------------------------------------------
  // BIBLIOGRAPHY
  // ---------------------------------------------------------------------------
  
  addBibliographyEntry(entry: Omit<BibliographyEntry, 'id' | 'key' | 'citationCount'>): BibliographyEntry {
    const id = `bib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const key = generateCitationKey(entry);
    
    const newEntry: BibliographyEntry = {
      ...entry,
      id,
      key,
      citationCount: 0,
    };
    
    this.state.bibliography.push(newEntry);
    return newEntry;
  }
  
  updateBibliographyEntry(id: string, updates: Partial<BibliographyEntry>): BibliographyEntry | null {
    const index = this.state.bibliography.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    this.state.bibliography[index] = {
      ...this.state.bibliography[index],
      ...updates,
    };
    
    return this.state.bibliography[index];
  }
  
  removeBibliographyEntry(id: string): boolean {
    const index = this.state.bibliography.findIndex(b => b.id === id);
    if (index === -1) return false;
    
    // Remove associated citations
    const entry = this.state.bibliography[index];
    this.state.citations = this.state.citations.filter(
      c => c.sourceRef.bibliographyEntryId !== id
    );
    
    this.state.bibliography.splice(index, 1);
    this.renumberCitations();
    return true;
  }
  
  getBibliographyEntry(id: string): BibliographyEntry | null {
    return this.state.bibliography.find(b => b.id === id) || null;
  }
  
  getBibliographyEntryByKey(key: string): BibliographyEntry | null {
    return this.state.bibliography.find(b => b.key === key) || null;
  }
  
  getBibliography(): BibliographyEntry[] {
    return [...this.state.bibliography];
  }
  
  generateBibliographyText(style?: CitationStyle): string {
    const useStyle = style || this.state.style;
    const entries = this.state.bibliography
      .filter(e => e.citationCount > 0)
      .sort((a, b) => {
        // Sort by first citation order
        const aIndex = this.state.citations.findIndex(
          c => c.sourceRef.bibliographyEntryId === a.id
        );
        const bIndex = this.state.citations.findIndex(
          c => c.sourceRef.bibliographyEntryId === b.id
        );
        return aIndex - bIndex;
      });
    
    return entries
      .map((entry, index) => {
        const formatted = formatBibliographyEntry(entry, useStyle);
        if (useStyle === 'numeric' || useStyle === 'vancouver' || useStyle === 'ama') {
          return `${index + 1}. ${formatted}`;
        }
        return formatted;
      })
      .join('\n\n');
  }
  
  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------
  
  validate(): ValidationSummary {
    // Validate all citations
    for (const citation of this.state.citations) {
      this.validateCitation(citation.id);
    }
    
    // Validate cross-references
    this.validateCrossReferences();
    
    // Calculate summary
    const summary = calculateValidationSummary(
      this.state.citations,
      this.state.crossReferences,
      this.state.tflReferences
    );
    
    this.state.validationSummary = summary;
    this.state.lastValidated = new Date();
    
    return summary;
  }
  
  validateCitation(citationId: string): Citation {
    const citation = this.getCitation(citationId);
    if (!citation) throw new Error(`Citation not found: ${citationId}`);
    
    // Build available sources and sections for validation
    const availableSources: { id: string; type: string }[] = [];
    const availableSections: { id: string; number: string }[] = [];
    
    // Validate
    const result = validateCitationRef(citation, availableSources, availableSections);
    
    citation.verified = true;
    citation.verificationStatus = result.valid ? 'valid' : 'broken';
    citation.verifiedAt = new Date();
    
    return citation;
  }
  
  // ---------------------------------------------------------------------------
  // RENUMBERING
  // ---------------------------------------------------------------------------
  
  renumberCitations(): void {
    // Sort by section order and position
    const sorted = [...this.state.citations].sort((a, b) => {
      if (a.position.sectionId !== b.position.sectionId) {
        return a.position.sectionId.localeCompare(b.position.sectionId);
      }
      return a.position.start - b.position.start;
    });
    
    // Renumber
    sorted.forEach((citation, index) => {
      citation.key = `${index + 1}`;
      citation.displayText = this.formatCitationKey(index + 1);
    });
    
    this.state.citations = sorted;
  }
  
  renumberTFLs(type: TFLReference['type']): void {
    const tfls = this.state.tflReferences
      .filter(t => t.type === type)
      .sort((a, b) => {
        // Sort by section order
        return a.definedInSectionId.localeCompare(b.definedInSectionId);
      });
    
    // Would need section numbering info to properly renumber
    // This is a placeholder that maintains current order
  }
  
  // ---------------------------------------------------------------------------
  // IMPORT/EXPORT
  // ---------------------------------------------------------------------------
  
  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }
  
  importState(json: string): boolean {
    try {
      const imported = JSON.parse(json) as CitationManagerState;
      
      // Validate structure
      if (!imported.documentId || !imported.style || !Array.isArray(imported.citations)) {
        return false;
      }
      
      // Convert date strings back to Date objects
      imported.citations = imported.citations.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        verifiedAt: c.verifiedAt ? new Date(c.verifiedAt) : undefined,
      }));
      
      imported.crossReferences = imported.crossReferences.map(c => ({
        ...c,
        validatedAt: c.validatedAt ? new Date(c.validatedAt) : undefined,
      }));
      
      this.state = imported;
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let citationManagerInstance: CitationManager | null = null;

export function getCitationManager(
  documentId: string,
  style?: CitationStyle
): CitationManager {
  if (!citationManagerInstance || citationManagerInstance.getState().documentId !== documentId) {
    citationManagerInstance = new CitationManager(documentId, style);
  }
  return citationManagerInstance;
}

export function resetCitationManager(): void {
  citationManagerInstance = null;
}

export default CitationManager;
