
// Document Conversion Utilities - v82
// Converts between different document formats for cross-module integration

import { AuthoringDocument, DocumentSection, ContentBlock } from '@/types/authoring';
import { ViewerDocument, ViewerSection } from '@/store/useDocumentViewerStore';

// ============================================================================
// CONTENT BLOCK TO HTML
// ============================================================================

function contentBlockToHTML(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return `<p>${block.content}</p>`;
    case 'table':
      return `<div class="table-container">${block.content}</div>`;
    case 'figure':
      return `<figure>${block.content}</figure>`;
    case 'list':
      return `<ul>${block.content}</ul>`;
    case 'component':
      return `<div class="component-block">${block.content}</div>`;
    case 'tfl-reference':
      return `<div class="tfl-reference" data-tfl-id="${block.tflId}">[${block.tflType?.toUpperCase()} Reference: ${block.content}]</div>`;
    default:
      return `<p>${block.content}</p>`;
  }
}

// ============================================================================
// DOCUMENT SECTION CONVERSION
// ============================================================================

function documentSectionToViewerSection(section: DocumentSection): ViewerSection {
  // Convert content blocks to HTML content
  const htmlContent = section.contentBlocks
    .map(block => contentBlockToHTML(block))
    .join('\n');

  // Or use direct content if available
  const content = section.content || htmlContent || `<p><em>Section content pending...</em></p>`;

  return {
    id: section.id,
    number: section.number,
    title: section.title,
    level: section.level,
    content,
    wordCount: section.wordCount || content.split(/\s+/).length,
    subsections: section.subsections?.map(documentSectionToViewerSection),
  };
}

// ============================================================================
// AUTHORING TO VIEWER DOCUMENT
// ============================================================================

export function authoringToViewerDocument(doc: AuthoringDocument): ViewerDocument {
  // Guard against documents arriving from the API without sections populated
  const sections = doc.sections ?? [];

  // Estimate page count from word count (average ~300 words per page)
  const totalWords = sections.reduce((sum, s) => {
    const sectionWords = s.wordCount || 0;
    const subWords = s.subsections?.reduce((ss, sub) => ss + (sub.wordCount || 0), 0) || 0;
    return sum + sectionWords + subWords;
  }, 0);
  
  const pageCount = Math.max(1, Math.ceil(totalWords / 300));

  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.shortTitle,
    documentType: formatDocumentType(doc.documentType),
    version: doc.version,
    status: formatStatus(doc.status),
    author: doc.authorName,
    lastModified: doc.updatedAt,
    sections: sections.map(documentSectionToViewerSection),
    productName: doc.productName,
    studyName: doc.studyName,
    ctdSection: doc.ctdSection,
    wordCount: totalWords || 5000, // fallback
    pageCount,
  };
}

// ============================================================================
// HELPER FORMATTERS
// ============================================================================

function formatDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    'protocol': 'Clinical Protocol',
    'ib': 'Investigator Brochure',
    'csr': 'Clinical Study Report',
    'module-25': 'Module 2.5 Clinical Overview',
    'module-27': 'Module 2.7 Clinical Summary',
    'picf': 'Patient Information & Consent',
    'sae-narrative': 'SAE Narrative',
    'briefing-doc': 'Briefing Document',
    'response-doc': 'Response Document',
    'annual-report': 'Annual Report',
    'dsur': 'Development Safety Update Report',
    'pbrer': 'Periodic Benefit-Risk Evaluation Report',
  };
  return typeMap[type] || type;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'Draft',
    'in-review': 'In Review',
    'pending-approval': 'Pending Approval',
    'approved': 'Approved',
    'finalized': 'Finalized',
    'archived': 'Archived',
    'superseded': 'Superseded',
  };
  return statusMap[status] || status;
}

// ============================================================================
// CROSS-REFERENCE TYPES
// ============================================================================

export interface DocumentCrossReference {
  id: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sourceSectionId?: string;
  sourceSectionTitle?: string;
  
  targetDocumentId: string;
  targetDocumentTitle: string;
  targetSectionId?: string;
  targetSectionTitle?: string;
  
  referenceType: CrossReferenceType;
  referenceText: string;
  
  createdAt: string;
  createdBy: string;
  
  // Validation
  isValid: boolean;
  lastValidated?: string;
}

export type CrossReferenceType = 
  | 'cites'           // Document A cites Document B
  | 'references'      // General reference
  | 'supersedes'      // Document A supersedes Document B
  | 'amends'          // Document A amends Document B
  | 'supports'        // Document A provides supporting data for B
  | 'derived-from'    // Document A derived from Document B
  | 'see-also'        // Related document
  | 'prerequisite';   // Document B must be read/approved before A

export interface CrossReferenceGroup {
  documentId: string;
  documentTitle: string;
  outgoingReferences: DocumentCrossReference[];
  incomingReferences: DocumentCrossReference[];
}

// ============================================================================
// CROSS-REFERENCE DISPLAY HELPERS
// ============================================================================

export const crossReferenceTypeLabels: Record<CrossReferenceType, string> = {
  'cites': 'Cites',
  'references': 'References',
  'supersedes': 'Supersedes',
  'amends': 'Amends',
  'supports': 'Supports',
  'derived-from': 'Derived From',
  'see-also': 'See Also',
  'prerequisite': 'Prerequisite',
};

export const crossReferenceTypeIcons: Record<CrossReferenceType, string> = {
  'cites': 'quote',
  'references': 'link',
  'supersedes': 'arrow-up-right',
  'amends': 'edit',
  'supports': 'check-circle',
  'derived-from': 'git-branch',
  'see-also': 'external-link',
  'prerequisite': 'lock',
};

export function getCrossReferenceDescription(type: CrossReferenceType, isOutgoing: boolean): string {
  if (isOutgoing) {
    const descriptions: Record<CrossReferenceType, string> = {
      'cites': 'This document cites',
      'references': 'This document references',
      'supersedes': 'This document supersedes',
      'amends': 'This document amends',
      'supports': 'This document supports',
      'derived-from': 'This document is derived from',
      'see-also': 'See also',
      'prerequisite': 'Requires',
    };
    return descriptions[type];
  } else {
    const descriptions: Record<CrossReferenceType, string> = {
      'cites': 'Cited by',
      'references': 'Referenced by',
      'supersedes': 'Superseded by',
      'amends': 'Amended by',
      'supports': 'Supported by',
      'derived-from': 'Source for',
      'see-also': 'Related to',
      'prerequisite': 'Required by',
    };
    return descriptions[type];
  }
}
