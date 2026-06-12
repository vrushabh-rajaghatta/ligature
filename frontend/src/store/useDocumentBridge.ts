

/**
 * Document Bridge - Authoring → Document Store Integration
 * 
 * This hook provides the bridge between the Authoring module and the Document Store,
 * enabling documents finalized in Authoring to flow into the submission-ready 
 * document inventory.
 * 
 * v38 Feature: Authoring → Document Store Flow
 */

import { useCallback } from 'react';
import { useDocumentStore, CTDDocument, CTDModule, DocumentType as CTDDocumentType } from '@/stores/document-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { 
  AuthoringDocument, 
  CTDSection, 
  CTD_SECTION_INFO, 
  DOCUMENT_TYPE_TO_CTD,
  DocumentType as AuthoringDocumentType 
} from '@/types/authoring';

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Map authoring document type to document store document type
 */
export function mapAuthoringTypeToDocumentType(authoringType: AuthoringDocumentType): CTDDocumentType {
  const mapping: Record<string, CTDDocumentType> = {
    'protocol': 'other',
    'ib': 'other',
    'csr': 'csr',
    'module-25': 'summary',
    'module-27': 'summary',
    'module-24': 'summary',
    'module-26': 'summary',
    'module-32s': 'specification',
    'module-32p': 'specification',
    'module-32a': 'other',
    'module-33': 'other',
    'uspi': 'labeling',
    'ccds': 'labeling',
    'smpc': 'labeling',
    'pil': 'labeling',
    'ise': 'summary',
    'iss': 'summary',
    'sap': 'other',
    'icf': 'other',
    'briefing-book': 'other',
    'dsur': 'other',
    'pbrer': 'other',
    'other': 'other',
  };
  return mapping[authoringType] || 'other';
}

/**
 * Map CTD section to module
 */
export function ctdSectionToModule(section: CTDSection): CTDModule {
  const info = CTD_SECTION_INFO[section];
  return info?.module || 'm5';
}

/**
 * Generate a standardized filename for the document
 */
export function generateFileName(doc: AuthoringDocument, section: CTDSection): string {
  const info = CTD_SECTION_INFO[section];
  const sanitizedTitle = doc.shortTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const modulePrefix = info?.module || 'm5';
  const sectionForFile = section.replace(/\./g, '-');
  return `${modulePrefix}-${sectionForFile}-${sanitizedTitle}.pdf`;
}

/**
 * Get CTD title for the section
 */
export function getCTDTitle(section: CTDSection): string {
  const info = CTD_SECTION_INFO[section];
  return info?.title || 'Document';
}

// ============================================================================
// FINALIZATION RESULT
// ============================================================================

export interface FinalizationResult {
  success: boolean;
  documentStoreId?: string;
  error?: string;
  ctdDocument?: CTDDocument;
}

// ============================================================================
// DOCUMENT BRIDGE HOOK
// ============================================================================

export function useDocumentBridge() {
  const documentStore = useDocumentStore();
  const portfolioStore = usePortfolioStore();

  /**
   * Finalize an authoring document and push it to the document store.
   * This is the main entry point for the Authoring → Document Store flow.
   */
  const finalizeDocument = useCallback((
    authoringDoc: AuthoringDocument,
    options?: {
      applicationId?: string;
      sequenceId?: string;
      ctdSection?: CTDSection;
    }
  ): FinalizationResult => {
    try {
      // Determine CTD section - explicit override > document field > type mapping
      const ctdSection = options?.ctdSection 
        || authoringDoc.ctdSection 
        || DOCUMENT_TYPE_TO_CTD[authoringDoc.documentType]
        || '5.3.5'; // Default to Clinical Study Reports

      const ctdModule = ctdSectionToModule(ctdSection);
      
      // Determine application ID - explicit override > document field > find from program
      let applicationId = options?.applicationId || authoringDoc.applicationId;
      
      if (!applicationId && authoringDoc.programId) {
        // Try to find a suitable application for this program
        const applications = portfolioStore.getApplicationsForProgram(authoringDoc.programId);
        // Prefer NDA/BLA applications, then any active application
        const primaryApp = applications.find(a => ['NDA', 'BLA', 'MAA'].includes(a.type))
          || applications.find(a => a.status === 'Active' || a.status === 'Under Review')
          || applications[0];
        applicationId = primaryApp?.id;
      }

      if (!applicationId) {
        return {
          success: false,
          error: 'No application found for this document. Please specify an application.',
        };
      }

      // Create the CTD document entry
      const ctdDocument: Omit<CTDDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        applicationId,
        sequenceId: options?.sequenceId,
        module: ctdModule,
        section: ctdSection,
        ctdTitle: getCTDTitle(ctdSection),
        title: authoringDoc.title,
        fileName: generateFileName(authoringDoc, ctdSection),
        documentType: mapAuthoringTypeToDocumentType(authoringDoc.documentType),
        fileFormat: 'pdf',
        status: 'approved', // Finalized documents are approved
        version: authoringDoc.version,
        author: authoringDoc.authorName,
        approver: authoringDoc.ownerName,
        // Page count estimation based on content (mock for now)
        pageCount: Math.max(10, Math.round(authoringDoc.progress * 2)),
        // File size estimation (mock)
        fileSize: Math.max(100000, Math.round(authoringDoc.progress * 50000)),
      };

      // Add to document store
      const documentStoreId = documentStore.addDocument(ctdDocument);

      // Return success with the created document
      const createdDoc = documentStore.getDocument(documentStoreId);

      return {
        success: true,
        documentStoreId,
        ctdDocument: createdDoc,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during finalization',
      };
    }
  }, [documentStore, portfolioStore]);

  /**
   * Check if a document has already been finalized to the document store
   */
  const isDocumentFinalized = useCallback((authoringDocId: string): boolean => {
    // Check if any document in the store has a matching source ID
    // This is a simple check - in production you'd have explicit linking
    const documents = documentStore.documents;
    return documents.some(d => d.title.includes(authoringDocId));
  }, [documentStore.documents]);

  /**
   * Get documents from the document store for a specific application
   */
  const getDocumentsForApplication = useCallback((applicationId: string) => {
    return documentStore.getDocumentsForApplication(applicationId);
  }, [documentStore]);

  /**
   * Get documents from the document store for a specific CTD section
   */
  const getDocumentsBySection = useCallback((applicationId: string, section: string) => {
    return documentStore.getDocumentsBySection(applicationId, section);
  }, [documentStore]);

  /**
   * Get available applications for a program (for UI selection)
   */
  const getApplicationsForProgram = useCallback((programId: string) => {
    return portfolioStore.getApplicationsForProgram(programId);
  }, [portfolioStore]);

  /**
   * Get the suggested CTD section for a document type
   */
  const getSuggestedCTDSection = useCallback((documentType: AuthoringDocumentType): CTDSection | undefined => {
    return DOCUMENT_TYPE_TO_CTD[documentType];
  }, []);

  /**
   * Get CTD section info
   */
  const getCTDSectionInfo = useCallback((section: CTDSection) => {
    return CTD_SECTION_INFO[section];
  }, []);

  return {
    // Main finalization function
    finalizeDocument,
    
    // Query functions
    isDocumentFinalized,
    getDocumentsForApplication,
    getDocumentsBySection,
    getApplicationsForProgram,
    
    // Helper functions
    getSuggestedCTDSection,
    getCTDSectionInfo,
  };
}

// ============================================================================
// SYNC FUNCTION (for non-hook contexts)
// ============================================================================

/**
 * Synchronous version of finalize for use in non-React contexts
 */
export function finalizeDocumentSync(
  authoringDoc: AuthoringDocument,
  options?: {
    applicationId?: string;
    sequenceId?: string;
    ctdSection?: CTDSection;
  }
): FinalizationResult {
  const documentStore = useDocumentStore.getState();
  const portfolioStore = usePortfolioStore.getState();

  try {
    const ctdSection = options?.ctdSection 
      || authoringDoc.ctdSection 
      || DOCUMENT_TYPE_TO_CTD[authoringDoc.documentType]
      || '5.3.5';

    const ctdModule = ctdSectionToModule(ctdSection);
    
    let applicationId = options?.applicationId || authoringDoc.applicationId;
    
    if (!applicationId && authoringDoc.programId) {
      const applications = portfolioStore.getApplicationsForProgram(authoringDoc.programId);
      const primaryApp = applications.find(a => ['NDA', 'BLA', 'MAA'].includes(a.type))
        || applications.find(a => a.status === 'Active' || a.status === 'Under Review')
        || applications[0];
      applicationId = primaryApp?.id;
    }

    if (!applicationId) {
      return {
        success: false,
        error: 'No application found for this document.',
      };
    }

    const ctdDocument: Omit<CTDDocument, 'id' | 'createdAt' | 'updatedAt'> = {
      applicationId,
      sequenceId: options?.sequenceId,
      module: ctdModule,
      section: ctdSection,
      ctdTitle: getCTDTitle(ctdSection),
      title: authoringDoc.title,
      fileName: generateFileName(authoringDoc, ctdSection),
      documentType: mapAuthoringTypeToDocumentType(authoringDoc.documentType),
      fileFormat: 'pdf',
      status: 'approved',
      version: authoringDoc.version,
      author: authoringDoc.authorName,
      approver: authoringDoc.ownerName,
      pageCount: Math.max(10, Math.round(authoringDoc.progress * 2)),
      fileSize: Math.max(100000, Math.round(authoringDoc.progress * 50000)),
    };

    const documentStoreId = documentStore.addDocument(ctdDocument);
    const createdDoc = documentStore.getDocument(documentStoreId);

    return {
      success: true,
      documentStoreId,
      ctdDocument: createdDoc,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
