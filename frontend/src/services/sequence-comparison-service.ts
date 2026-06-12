
// Sequence Comparison Service
// Compares documents and structure between eCTD submission sequences

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface SubmissionDocument {
  id: string;
  fileName: string;
  title: string;
  section: string;
  module: string;
  status: string;
  version: number;
  checksum: string;
  size: number;
}

// ============================================================================
// TYPES
// ============================================================================

export type ChangeType = 'added' | 'removed' | 'modified' | 'replaced' | 'unchanged';

export type ChangeCategory = 
  | 'new-document'      // Document added in new sequence
  | 'deleted-document'  // Document removed
  | 'content-change'    // Document content modified
  | 'version-update'    // New version of existing document
  | 'metadata-change'   // Only metadata changed (title, etc.)
  | 'location-change'   // Document moved to different section
  | 'leaf-operation';   // eCTD leaf operation (new, replace, append, delete)

export interface SequenceInfo {
  sequenceNumber: string;
  submissionDate?: string;
  submissionType: string;
  description?: string;
  documentCount: number;
  totalSize: number;
}

export interface DocumentChange {
  id: string;
  changeType: ChangeType;
  category: ChangeCategory;
  
  // Document info
  documentId: string;
  title: string;
  fileName: string;
  section: string;
  module: string;
  
  // Source sequence info (if exists)
  sourceSequence?: string;
  sourceVersion?: number;
  sourceChecksum?: string;
  sourceSize?: number;
  
  // Target sequence info (if exists)
  targetSequence?: string;
  targetVersion?: number;
  targetChecksum?: string;
  targetSize?: number;
  
  // Change details
  leafOperation?: 'new' | 'replace' | 'append' | 'delete';
  sizeDelta?: number;
  metadata?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

export interface SectionChange {
  sectionId: string;
  sectionTitle: string;
  module: string;
  changeType: ChangeType;
  documentChanges: DocumentChange[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface SequenceComparisonResult {
  id: string;
  comparedAt: string;
  
  // Sequence info
  sourceSequence: SequenceInfo;
  targetSequence: SequenceInfo;
  
  // Summary statistics
  summary: {
    totalChanges: number;
    documentsAdded: number;
    documentsRemoved: number;
    documentsModified: number;
    documentsUnchanged: number;
    sectionsAffected: number;
    totalSizeDelta: number;
  };
  
  // Detailed changes by section
  sectionChanges: SectionChange[];
  
  // All document changes flattened
  documentChanges: DocumentChange[];
  
  // Changes by module
  changesByModule: Record<string, {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  }>;
}

export interface ComparisonFilter {
  modules?: string[];
  changeTypes?: ChangeType[];
  categories?: ChangeCategory[];
  searchText?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_DOCUMENTS_SEQ_0000: SubmissionDocument[] = [
  { id: 'doc-1', fileName: 'cover-letter.pdf', title: 'Cover Letter', section: '1.0', module: 'm1', status: 'final', version: 1, checksum: 'abc123', size: 245000 },
  { id: 'doc-2', fileName: 'form-1571.pdf', title: 'FDA Form 1571', section: '1.1', module: 'm1', status: 'final', version: 1, checksum: 'def456', size: 156000 },
  { id: 'doc-3', fileName: 'form-356h.pdf', title: 'FDA Form 356h', section: '1.2', module: 'm1', status: 'final', version: 1, checksum: 'ghi789', size: 89000 },
  { id: 'doc-4', fileName: 'intro-summary.pdf', title: 'Introduction and Summary', section: '2.1', module: 'm2', status: 'final', version: 1, checksum: 'jkl012', size: 1245000 },
  { id: 'doc-5', fileName: 'quality-overall.pdf', title: 'Quality Overall Summary', section: '2.3', module: 'm2', status: 'final', version: 1, checksum: 'mno345', size: 2340000 },
  { id: 'doc-6', fileName: 'nonclin-overview.pdf', title: 'Nonclinical Overview', section: '2.4', module: 'm2', status: 'final', version: 1, checksum: 'pqr678', size: 1890000 },
  { id: 'doc-7', fileName: 'clin-overview.pdf', title: 'Clinical Overview', section: '2.5', module: 'm2', status: 'final', version: 1, checksum: 'stu901', size: 3450000 },
  { id: 'doc-8', fileName: 'drug-substance.pdf', title: 'Drug Substance', section: '3.2.S', module: 'm3', status: 'final', version: 1, checksum: 'vwx234', size: 5670000 },
  { id: 'doc-9', fileName: 'drug-product.pdf', title: 'Drug Product', section: '3.2.P', module: 'm3', status: 'final', version: 1, checksum: 'yza567', size: 4230000 },
  { id: 'doc-10', fileName: 'pk-study-001.pdf', title: 'PK Study 001 Report', section: '4.2.1', module: 'm4', status: 'final', version: 1, checksum: 'bcd890', size: 8900000 },
  { id: 'doc-11', fileName: 'tox-study-001.pdf', title: 'Toxicology Study Report', section: '4.2.3', module: 'm4', status: 'final', version: 1, checksum: 'efg123', size: 12300000 },
  { id: 'doc-12', fileName: 'protocol-001.pdf', title: 'Study Protocol 001', section: '5.3.5', module: 'm5', status: 'final', version: 1, checksum: 'hij456', size: 2100000 },
  { id: 'doc-13', fileName: 'csr-001.pdf', title: 'Clinical Study Report 001', section: '5.3.5', module: 'm5', status: 'final', version: 1, checksum: 'klm789', size: 45600000 },
];

const MOCK_DOCUMENTS_SEQ_0001: SubmissionDocument[] = [
  // Unchanged from 0000
  { id: 'doc-1', fileName: 'cover-letter.pdf', title: 'Cover Letter', section: '1.0', module: 'm1', status: 'final', version: 1, checksum: 'abc123', size: 245000 },
  { id: 'doc-2', fileName: 'form-1571.pdf', title: 'FDA Form 1571', section: '1.1', module: 'm1', status: 'final', version: 1, checksum: 'def456', size: 156000 },
  { id: 'doc-3', fileName: 'form-356h.pdf', title: 'FDA Form 356h', section: '1.2', module: 'm1', status: 'final', version: 1, checksum: 'ghi789', size: 89000 },
  { id: 'doc-4', fileName: 'intro-summary.pdf', title: 'Introduction and Summary', section: '2.1', module: 'm2', status: 'final', version: 1, checksum: 'jkl012', size: 1245000 },
  // Modified - new version
  { id: 'doc-5', fileName: 'quality-overall.pdf', title: 'Quality Overall Summary', section: '2.3', module: 'm2', status: 'final', version: 2, checksum: 'mno345-v2', size: 2540000 },
  { id: 'doc-6', fileName: 'nonclin-overview.pdf', title: 'Nonclinical Overview', section: '2.4', module: 'm2', status: 'final', version: 1, checksum: 'pqr678', size: 1890000 },
  // Modified - content update
  { id: 'doc-7', fileName: 'clin-overview.pdf', title: 'Clinical Overview (Updated)', section: '2.5', module: 'm2', status: 'final', version: 2, checksum: 'stu901-v2', size: 3680000 },
  { id: 'doc-8', fileName: 'drug-substance.pdf', title: 'Drug Substance', section: '3.2.S', module: 'm3', status: 'final', version: 1, checksum: 'vwx234', size: 5670000 },
  { id: 'doc-9', fileName: 'drug-product.pdf', title: 'Drug Product', section: '3.2.P', module: 'm3', status: 'final', version: 1, checksum: 'yza567', size: 4230000 },
  { id: 'doc-10', fileName: 'pk-study-001.pdf', title: 'PK Study 001 Report', section: '4.2.1', module: 'm4', status: 'final', version: 1, checksum: 'bcd890', size: 8900000 },
  { id: 'doc-11', fileName: 'tox-study-001.pdf', title: 'Toxicology Study Report', section: '4.2.3', module: 'm4', status: 'final', version: 1, checksum: 'efg123', size: 12300000 },
  { id: 'doc-12', fileName: 'protocol-001.pdf', title: 'Study Protocol 001', section: '5.3.5', module: 'm5', status: 'final', version: 1, checksum: 'hij456', size: 2100000 },
  { id: 'doc-13', fileName: 'csr-001.pdf', title: 'Clinical Study Report 001', section: '5.3.5', module: 'm5', status: 'final', version: 1, checksum: 'klm789', size: 45600000 },
  // New documents
  { id: 'doc-14', fileName: 'ir-response.pdf', title: 'Information Request Response', section: '1.12.1', module: 'm1', status: 'final', version: 1, checksum: 'nop012', size: 567000 },
  { id: 'doc-15', fileName: 'stability-update.pdf', title: 'Stability Data Update', section: '3.2.P.8', module: 'm3', status: 'final', version: 1, checksum: 'qrs345', size: 1230000 },
];

// ============================================================================
// SEQUENCE COMPARISON SERVICE
// ============================================================================

export class SequenceComparisonService {
  /**
   * Compare two sequences and generate a detailed diff
   */
  compareSequences(
    sourceSequence: string,
    targetSequence: string,
    applicationId?: string
  ): SequenceComparisonResult {
    // Get documents for each sequence (in production, this would query the database)
    const sourceDocs = this.getDocumentsForSequence(sourceSequence);
    const targetDocs = this.getDocumentsForSequence(targetSequence);
    
    const sourceInfo = this.getSequenceInfo(sourceSequence, sourceDocs);
    const targetInfo = this.getSequenceInfo(targetSequence, targetDocs);
    
    // Generate document changes
    const documentChanges = this.generateDocumentChanges(
      sourceDocs, 
      targetDocs, 
      sourceSequence, 
      targetSequence
    );
    
    // Group by section
    const sectionChanges = this.groupChangesBySection(documentChanges);
    
    // Calculate summary statistics
    const summary = this.calculateSummary(documentChanges, sectionChanges);
    
    // Group by module
    const changesByModule = this.groupChangesByModule(documentChanges);
    
    return {
      id: `cmp-${Date.now()}`,
      comparedAt: new Date().toISOString(),
      sourceSequence: sourceInfo,
      targetSequence: targetInfo,
      summary,
      sectionChanges,
      documentChanges,
      changesByModule,
    };
  }

  /**
   * Filter comparison results
   */
  filterResults(
    result: SequenceComparisonResult,
    filter: ComparisonFilter
  ): SequenceComparisonResult {
    let filteredChanges = [...result.documentChanges];
    
    // Filter by modules
    if (filter.modules && filter.modules.length > 0) {
      filteredChanges = filteredChanges.filter(c => 
        filter.modules!.includes(c.module)
      );
    }
    
    // Filter by change types
    if (filter.changeTypes && filter.changeTypes.length > 0) {
      filteredChanges = filteredChanges.filter(c =>
        filter.changeTypes!.includes(c.changeType)
      );
    }
    
    // Filter by categories
    if (filter.categories && filter.categories.length > 0) {
      filteredChanges = filteredChanges.filter(c =>
        filter.categories!.includes(c.category)
      );
    }
    
    // Filter by search text
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filteredChanges = filteredChanges.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.fileName.toLowerCase().includes(searchLower) ||
        c.section.toLowerCase().includes(searchLower)
      );
    }
    
    // Recalculate section changes and summary
    const sectionChanges = this.groupChangesBySection(filteredChanges);
    const summary = this.calculateSummary(filteredChanges, sectionChanges);
    const changesByModule = this.groupChangesByModule(filteredChanges);
    
    return {
      ...result,
      summary,
      sectionChanges,
      documentChanges: filteredChanges,
      changesByModule,
    };
  }

  /**
   * Filter document changes (convenience method returning just the changes array)
   */
  filterChanges(
    result: SequenceComparisonResult,
    filter: ComparisonFilter
  ): DocumentChange[] {
    let filteredChanges = [...result.documentChanges];
    
    // Filter by modules
    if (filter.modules && filter.modules.length > 0) {
      filteredChanges = filteredChanges.filter(c => 
        filter.modules!.includes(c.module)
      );
    }
    
    // Filter by change types
    if (filter.changeTypes && filter.changeTypes.length > 0) {
      filteredChanges = filteredChanges.filter(c =>
        filter.changeTypes!.includes(c.changeType)
      );
    }
    
    // Filter by search text
    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      filteredChanges = filteredChanges.filter(c =>
        c.title.toLowerCase().includes(search) ||
        c.fileName.toLowerCase().includes(search)
      );
    }
    
    return filteredChanges;
  }

  /**
   * Get documents that were added in the target sequence
   */
  getAddedDocuments(result: SequenceComparisonResult): DocumentChange[] {
    return result.documentChanges.filter(c => c.changeType === 'added');
  }

  /**
   * Get documents that were removed in the target sequence
   */
  getRemovedDocuments(result: SequenceComparisonResult): DocumentChange[] {
    return result.documentChanges.filter(c => c.changeType === 'removed');
  }

  /**
   * Get documents that were modified in the target sequence
   */
  getModifiedDocuments(result: SequenceComparisonResult): DocumentChange[] {
    return result.documentChanges.filter(c => 
      c.changeType === 'modified' || c.changeType === 'replaced'
    );
  }

  /**
   * Export comparison to a structured format
   */
  exportComparison(
    result: SequenceComparisonResult,
    format: 'json' | 'csv' | 'markdown'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
        
      case 'csv':
        return this.exportToCSV(result);
        
      case 'markdown':
        return this.exportToMarkdown(result);
        
      default:
        return JSON.stringify(result);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getDocumentsForSequence(sequenceNumber: string): SubmissionDocument[] {
    // In production, this would query the database
    if (sequenceNumber === '0000') {
      return MOCK_DOCUMENTS_SEQ_0000;
    } else if (sequenceNumber === '0001') {
      return MOCK_DOCUMENTS_SEQ_0001;
    }
    return [];
  }

  private getSequenceInfo(
    sequenceNumber: string, 
    documents: SubmissionDocument[]
  ): SequenceInfo {
    const totalSize = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
    
    return {
      sequenceNumber,
      submissionType: sequenceNumber === '0000' ? 'original-application' : 'amendment',
      documentCount: documents.length,
      totalSize,
    };
  }

  private generateDocumentChanges(
    sourceDocs: SubmissionDocument[],
    targetDocs: SubmissionDocument[],
    sourceSeq: string,
    targetSeq: string
  ): DocumentChange[] {
    const changes: DocumentChange[] = [];
    
    // Create maps for lookup
    const sourceMap = new Map(sourceDocs.map(d => [d.id, d]));
    const targetMap = new Map(targetDocs.map(d => [d.id, d]));
    
    // Check for added and modified documents
    for (const targetDoc of targetDocs) {
      const sourceDoc = sourceMap.get(targetDoc.id);
      
      if (!sourceDoc) {
        // Document added
        changes.push({
          id: `chg-${Date.now()}-${targetDoc.id}`,
          changeType: 'added',
          category: 'new-document',
          documentId: targetDoc.id,
          title: targetDoc.title,
          fileName: targetDoc.fileName,
          section: targetDoc.section,
          module: targetDoc.module,
          targetSequence: targetSeq,
          targetVersion: targetDoc.version,
          targetChecksum: targetDoc.checksum,
          targetSize: targetDoc.size,
          leafOperation: 'new',
        });
      } else if (sourceDoc.checksum !== targetDoc.checksum) {
        // Document modified
        const isVersionUpdate = (targetDoc.version || 1) > (sourceDoc.version || 1);
        const isTitleChange = sourceDoc.title !== targetDoc.title;
        
        changes.push({
          id: `chg-${Date.now()}-${targetDoc.id}`,
          changeType: isVersionUpdate ? 'replaced' : 'modified',
          category: isVersionUpdate ? 'version-update' : 
                    isTitleChange ? 'metadata-change' : 'content-change',
          documentId: targetDoc.id,
          title: targetDoc.title,
          fileName: targetDoc.fileName,
          section: targetDoc.section,
          module: targetDoc.module,
          sourceSequence: sourceSeq,
          sourceVersion: sourceDoc.version,
          sourceChecksum: sourceDoc.checksum,
          sourceSize: sourceDoc.size,
          targetSequence: targetSeq,
          targetVersion: targetDoc.version,
          targetChecksum: targetDoc.checksum,
          targetSize: targetDoc.size,
          leafOperation: 'replace',
          sizeDelta: (targetDoc.size || 0) - (sourceDoc.size || 0),
          metadata: isTitleChange ? [{
            field: 'title',
            oldValue: sourceDoc.title,
            newValue: targetDoc.title,
          }] : undefined,
        });
      } else {
        // Unchanged
        changes.push({
          id: `chg-${Date.now()}-${targetDoc.id}`,
          changeType: 'unchanged',
          category: 'leaf-operation',
          documentId: targetDoc.id,
          title: targetDoc.title,
          fileName: targetDoc.fileName,
          section: targetDoc.section,
          module: targetDoc.module,
          sourceSequence: sourceSeq,
          sourceVersion: sourceDoc.version,
          sourceChecksum: sourceDoc.checksum,
          sourceSize: sourceDoc.size,
          targetSequence: targetSeq,
          targetVersion: targetDoc.version,
          targetChecksum: targetDoc.checksum,
          targetSize: targetDoc.size,
        });
      }
    }
    
    // Check for removed documents
    for (const sourceDoc of sourceDocs) {
      if (!targetMap.has(sourceDoc.id)) {
        changes.push({
          id: `chg-${Date.now()}-${sourceDoc.id}`,
          changeType: 'removed',
          category: 'deleted-document',
          documentId: sourceDoc.id,
          title: sourceDoc.title,
          fileName: sourceDoc.fileName,
          section: sourceDoc.section,
          module: sourceDoc.module,
          sourceSequence: sourceSeq,
          sourceVersion: sourceDoc.version,
          sourceChecksum: sourceDoc.checksum,
          sourceSize: sourceDoc.size,
          leafOperation: 'delete',
        });
      }
    }
    
    return changes;
  }

  private groupChangesBySection(changes: DocumentChange[]): SectionChange[] {
    const sectionMap = new Map<string, SectionChange>();
    
    for (const change of changes) {
      const sectionKey = `${change.module}-${change.section}`;
      
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          sectionId: sectionKey,
          sectionTitle: change.section,
          module: change.module,
          changeType: 'unchanged',
          documentChanges: [],
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 0,
        });
      }
      
      const section = sectionMap.get(sectionKey)!;
      section.documentChanges.push(change);
      
      switch (change.changeType) {
        case 'added':
          section.addedCount++;
          section.changeType = 'modified';
          break;
        case 'removed':
          section.removedCount++;
          section.changeType = 'modified';
          break;
        case 'modified':
        case 'replaced':
          section.modifiedCount++;
          section.changeType = 'modified';
          break;
      }
    }
    
    return Array.from(sectionMap.values());
  }

  private calculateSummary(
    changes: DocumentChange[],
    sectionChanges: SectionChange[]
  ): SequenceComparisonResult['summary'] {
    const documentsAdded = changes.filter(c => c.changeType === 'added').length;
    const documentsRemoved = changes.filter(c => c.changeType === 'removed').length;
    const documentsModified = changes.filter(c => 
      c.changeType === 'modified' || c.changeType === 'replaced'
    ).length;
    const documentsUnchanged = changes.filter(c => c.changeType === 'unchanged').length;
    const sectionsAffected = sectionChanges.filter(s => s.changeType !== 'unchanged').length;
    
    const totalSizeDelta = changes.reduce((sum, c) => {
      if (c.changeType === 'added') return sum + (c.targetSize || 0);
      if (c.changeType === 'removed') return sum - (c.sourceSize || 0);
      if (c.sizeDelta) return sum + c.sizeDelta;
      return sum;
    }, 0);
    
    return {
      totalChanges: documentsAdded + documentsRemoved + documentsModified,
      documentsAdded,
      documentsRemoved,
      documentsModified,
      documentsUnchanged,
      sectionsAffected,
      totalSizeDelta,
    };
  }

  private groupChangesByModule(
    changes: DocumentChange[]
  ): Record<string, { added: number; removed: number; modified: number; unchanged: number }> {
    const moduleStats: Record<string, { added: number; removed: number; modified: number; unchanged: number }> = {};
    
    for (const change of changes) {
      if (!moduleStats[change.module]) {
        moduleStats[change.module] = { added: 0, removed: 0, modified: 0, unchanged: 0 };
      }
      
      switch (change.changeType) {
        case 'added':
          moduleStats[change.module].added++;
          break;
        case 'removed':
          moduleStats[change.module].removed++;
          break;
        case 'modified':
        case 'replaced':
          moduleStats[change.module].modified++;
          break;
        case 'unchanged':
          moduleStats[change.module].unchanged++;
          break;
      }
    }
    
    return moduleStats;
  }

  private exportToCSV(result: SequenceComparisonResult): string {
    const headers = [
      'Change Type', 'Category', 'Document Title', 'File Name', 
      'Module', 'Section', 'Source Version', 'Target Version',
      'Size Delta', 'Leaf Operation'
    ];
    
    const rows = result.documentChanges.map(c => [
      c.changeType,
      c.category,
      `"${c.title}"`,
      c.fileName,
      c.module,
      c.section,
      c.sourceVersion || '',
      c.targetVersion || '',
      c.sizeDelta || '',
      c.leafOperation || '',
    ]);
    
    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }

  private exportToMarkdown(result: SequenceComparisonResult): string {
    const lines: string[] = [];
    
    lines.push(`# Sequence Comparison: ${result.sourceSequence.sequenceNumber} → ${result.targetSequence.sequenceNumber}`);
    lines.push('');
    lines.push(`Generated: ${new Date(result.comparedAt).toLocaleString()}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Documents Added:** ${result.summary.documentsAdded}`);
    lines.push(`- **Documents Removed:** ${result.summary.documentsRemoved}`);
    lines.push(`- **Documents Modified:** ${result.summary.documentsModified}`);
    lines.push(`- **Documents Unchanged:** ${result.summary.documentsUnchanged}`);
    lines.push(`- **Sections Affected:** ${result.summary.sectionsAffected}`);
    lines.push(`- **Total Size Change:** ${this.formatBytes(result.summary.totalSizeDelta)}`);
    lines.push('');
    
    // Changes by module
    lines.push('## Changes by Module');
    lines.push('');
    for (const [module, stats] of Object.entries(result.changesByModule)) {
      if (stats.added + stats.removed + stats.modified > 0) {
        lines.push(`### ${module.toUpperCase()}`);
        lines.push(`- Added: ${stats.added}, Removed: ${stats.removed}, Modified: ${stats.modified}`);
        lines.push('');
      }
    }
    
    // Detailed changes
    lines.push('## Detailed Changes');
    lines.push('');
    
    const addedDocs = this.getAddedDocuments(result);
    if (addedDocs.length > 0) {
      lines.push('### Added Documents');
      for (const doc of addedDocs) {
        lines.push(`- **${doc.title}** (${doc.fileName}) - ${doc.module}/${doc.section}`);
      }
      lines.push('');
    }
    
    const removedDocs = this.getRemovedDocuments(result);
    if (removedDocs.length > 0) {
      lines.push('### Removed Documents');
      for (const doc of removedDocs) {
        lines.push(`- **${doc.title}** (${doc.fileName}) - ${doc.module}/${doc.section}`);
      }
      lines.push('');
    }
    
    const modifiedDocs = this.getModifiedDocuments(result);
    if (modifiedDocs.length > 0) {
      lines.push('### Modified Documents');
      for (const doc of modifiedDocs) {
        const sizeDelta = doc.sizeDelta ? ` (${this.formatBytes(doc.sizeDelta)})` : '';
        lines.push(`- **${doc.title}** v${doc.sourceVersion} → v${doc.targetVersion}${sizeDelta}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  private formatBytes(bytes: number): string {
    const sign = bytes >= 0 ? '+' : '';
    const absBytes = Math.abs(bytes);
    if (absBytes < 1024) return `${sign}${bytes} B`;
    if (absBytes < 1024 * 1024) return `${sign}${(bytes / 1024).toFixed(1)} KB`;
    return `${sign}${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

// Singleton instance
export const sequenceComparisonService = new SequenceComparisonService();
