

// Platform-Level Document Viewer Service - v83
// Enables opening the document viewer from any module in the platform

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ViewerDocument } from '@/store/useDocumentViewerStore';
import { authoringToViewerDocument } from '@/utils/document-converters';
import { AuthoringDocument } from '@/types/authoring';
import { ECTDDocument } from '@/types/ectd';

// ============================================================================
// TYPES
// ============================================================================

export type ViewerSourceModule = 
  | 'authoring'
  | 'ectd'
  | 'submissions'
  | 'haq'
  | 'correspondence'
  | 'tmf'
  | 'safety'
  | 'clinical';

export interface ViewerContext {
  sourceModule: ViewerSourceModule;
  sourceId?: string;
  returnAction?: () => void;
  readOnly?: boolean;
  highlightSectionId?: string;
  highlightAnnotationId?: string;
}

export interface ECTDViewerDocument {
  id: string;
  title: string;
  filePath: string;
  fileType: 'pdf' | 'xml' | 'doc' | 'docx' | 'rtf';
  module: string;
  section?: string;
  operation: string;
  sequenceNumber: string;
  applicationNumber: string;
  archivePath: string;
}

export interface CorrespondenceDocument {
  id: string;
  title: string;
  type: 'ha-letter' | 'response' | 'attachment' | 'cover-letter';
  filePath?: string;
  content?: string;
  dateReceived?: string;
  dateSent?: string;
  applicationNumber: string;
}

export interface TMFArtifactDocument {
  id: string;
  title: string;
  zone: string;
  section: string;
  artifactNumber: string;
  filePath?: string;
  content?: string;
  studyId: string;
  status: string;
}

export interface SafetyCaseDocument {
  id: string;
  title: string;
  type: 'narrative' | 'source-doc' | 'medwatch' | 'e2b-r3';
  caseNumber: string;
  content?: string;
  filePath?: string;
}

// Union type for any viewable document
export type ViewableDocument = 
  | { type: 'authoring'; document: AuthoringDocument }
  | { type: 'viewer'; document: ViewerDocument }
  | { type: 'ectd'; document: ECTDViewerDocument }
  | { type: 'correspondence'; document: CorrespondenceDocument }
  | { type: 'tmf'; document: TMFArtifactDocument }
  | { type: 'safety'; document: SafetyCaseDocument };

// ============================================================================
// SERVICE STATE
// ============================================================================

interface DocumentViewerServiceState {
  // Viewer state
  isOpen: boolean;
  currentDocument: ViewerDocument | null;
  viewerContext: ViewerContext | null;
  
  // Document source (for reference)
  sourceDocument: ViewableDocument | null;
  
  // History for back navigation
  documentHistory: Array<{
    document: ViewerDocument;
    context: ViewerContext;
  }>;
  historyIndex: number;
  
  // Actions
  openDocument: (doc: ViewableDocument, context: ViewerContext) => void;
  openAuthoringDocument: (doc: AuthoringDocument, context?: Partial<ViewerContext>) => void;
  openViewerDocument: (doc: ViewerDocument, context?: Partial<ViewerContext>) => void;
  openECTDDocument: (doc: ECTDViewerDocument, context?: Partial<ViewerContext>) => void;
  openCorrespondenceDocument: (doc: CorrespondenceDocument, context?: Partial<ViewerContext>) => void;
  openTMFDocument: (doc: TMFArtifactDocument, context?: Partial<ViewerContext>) => void;
  openSafetyDocument: (doc: SafetyCaseDocument, context?: Partial<ViewerContext>) => void;
  
  closeViewer: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
  canNavigateBack: () => boolean;
  canNavigateForward: () => boolean;
  
  // For cross-reference navigation
  navigateToDocument: (documentId: string, sectionId?: string) => void;
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

function generateECTDSampleContent(doc: ECTDViewerDocument): { content: string; sections: ViewerDocument['sections']; wordCount: number; pageCount: number } {
  // Generate realistic demo content based on document type and module
  const module = doc.module;
  const section = doc.section || '';
  const title = doc.title;
  
  // Module 1 - Administrative documents
  if (module === '1') {
    if (title.includes('356h') || title.includes('Form')) {
      return {
        content: `<h2>FDA Form 356h - Application to Market a New Drug, Biologic, or an Antibiotic Drug for Human Use</h2>
          <div class="form-section">
            <p><strong>Application Number:</strong> ${doc.applicationNumber}</p>
            <p><strong>Sequence:</strong> ${doc.sequenceNumber}</p>
            <p><strong>Applicant:</strong> Ligature Therapeutics, Inc.</p>
            <p><strong>Product Name:</strong> Nexavant (LIG-2847)</p>
            <p><strong>Indication:</strong> Treatment of advanced non-small cell lung cancer (NSCLC) with EGFR exon 20 insertion mutations</p>
          </div>
          <h3>Application Type</h3>
          <p>☐ New Drug Application (NDA) under section 505(b)(1)<br/>
          ☑ New Drug Application (NDA) under section 505(b)(2)<br/>
          ☐ Biologics License Application (BLA)</p>`,
        sections: [{ id: 'form', number: '1.1', title: 'Form FDA 356h', level: 1, content: 'Administrative form content', wordCount: 150 }],
        wordCount: 150,
        pageCount: 4,
      };
    }
    if (title.includes('Cover Letter')) {
      return {
        content: `<h2>Cover Letter</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>To:</strong> Center for Drug Evaluation and Research<br/>Food and Drug Administration</p>
          <p><strong>Re:</strong> ${doc.applicationNumber} - Sequence ${doc.sequenceNumber}</p>
          <hr/>
          <p>Dear Sir/Madam,</p>
          <p>Ligature Therapeutics, Inc. hereby submits this ${doc.operation === 'new' ? 'original' : 'amendment'} submission for Nexavant (LIG-2847) for the treatment of advanced NSCLC with EGFR exon 20 insertion mutations.</p>
          <p>This submission contains the following:</p>
          <ul>
            <li>Module 1: Administrative Information and Prescribing Information</li>
            <li>Module 2: Common Technical Document Summaries</li>
            <li>Module 3: Quality Documentation</li>
            <li>Module 5: Clinical Study Reports</li>
          </ul>
          <p>We request priority review based on the unmet medical need in this patient population.</p>
          <p>Sincerely,<br/>Regulatory Affairs Team<br/>Ligature Therapeutics, Inc.</p>`,
        sections: [{ id: 'letter', number: '1.2', title: 'Cover Letter', level: 1, content: 'Cover letter content', wordCount: 200 }],
        wordCount: 200,
        pageCount: 2,
      };
    }
  }
  
  // Module 2 - CTD Summaries
  if (module === '2') {
    return {
      content: `<h2>${title}</h2>
        <div class="summary-document">
          <h3>Document Information</h3>
          <p><strong>Section:</strong> ${section || 'Module 2 Summary'}</p>
          <p><strong>Product:</strong> Nexavant (LIG-2847)</p>
          <p><strong>Version:</strong> Sequence ${doc.sequenceNumber}</p>
          <hr/>
          <h3>Executive Summary</h3>
          <p>Nexavant (LIG-2847) is a novel, selective EGFR tyrosine kinase inhibitor specifically designed to target exon 20 insertion mutations. This document provides a comprehensive overview of the quality, nonclinical, and clinical data supporting the safety and efficacy of Nexavant.</p>
          <h3>Key Findings</h3>
          <ul>
            <li><strong>Efficacy:</strong> Phase 3 study (LIG-301) demonstrated significant improvement in overall survival (HR 0.71, p=0.012)</li>
            <li><strong>Safety:</strong> Manageable safety profile with diarrhea (52%) and nausea (36%) as most common AEs</li>
            <li><strong>Quality:</strong> Consistent manufacturing process with well-characterized drug substance and product</li>
          </ul>
        </div>`,
      sections: [{ id: 'summary', number: section || '2.0', title: title, level: 1, content: 'CTD summary content', wordCount: 5000 }],
      wordCount: 5000,
      pageCount: 25,
    };
  }
  
  // Module 3 - Quality (CMC)
  if (module === '3') {
    return {
      content: `<h2>${title}</h2>
        <div class="quality-document">
          <h3>Section: ${section || '3.2.P Drug Product'}</h3>
          <h4>3.2.P.1 Description and Composition of the Drug Product</h4>
          <p>Nexavant tablets contain 200 mg of LIG-2847 as the active pharmaceutical ingredient. The tablets are formulated with standard excipients for immediate release oral administration.</p>
          <h4>3.2.P.2 Pharmaceutical Development</h4>
          <p>The drug product was developed to achieve rapid dissolution and consistent bioavailability. A wet granulation process was selected based on compatibility studies and processability assessments.</p>
          <h4>3.2.P.3 Manufacture</h4>
          <p><strong>Manufacturer:</strong> Ligature Pharma Manufacturing, LLC<br/>
          <strong>Site Address:</strong> 1234 Pharmaceutical Drive, Research Triangle Park, NC 27709</p>
          <h4>3.2.P.5 Control of Drug Product</h4>
          <table border="1" cellpadding="8">
            <tr><th>Test</th><th>Method</th><th>Specification</th></tr>
            <tr><td>Appearance</td><td>Visual</td><td>White to off-white oval tablet</td></tr>
            <tr><td>Identification</td><td>HPLC</td><td>RT matches reference standard</td></tr>
            <tr><td>Assay</td><td>HPLC</td><td>95.0% - 105.0%</td></tr>
            <tr><td>Dissolution</td><td>USP &lt;711&gt;</td><td>NLT 80% (Q) in 30 min</td></tr>
          </table>
        </div>`,
      sections: [{ id: 'quality', number: section || '3.2.P', title: title, level: 1, content: 'Quality section content', wordCount: 8000 }],
      wordCount: 8000,
      pageCount: 45,
    };
  }
  
  // Module 5 - Clinical
  if (module === '5') {
    return {
      content: `<h2>${title}</h2>
        <div class="clinical-document">
          <h3>Clinical Study Report</h3>
          <p><strong>Study:</strong> LIG-301 - Phase 3 Pivotal Study</p>
          <p><strong>Protocol:</strong> LIG-301-001</p>
          <h4>Synopsis</h4>
          <p>A randomized, open-label, Phase 3 study evaluating the efficacy and safety of Nexavant compared with standard of care chemotherapy in patients with locally advanced or metastatic NSCLC harboring EGFR exon 20 insertion mutations.</p>
          <h4>Primary Endpoint Results</h4>
          <table border="1" cellpadding="8">
            <tr><th>Parameter</th><th>Nexavant</th><th>Control</th><th>HR (95% CI)</th></tr>
            <tr><td>Median OS</td><td>14.8 months</td><td>10.2 months</td><td>0.71 (0.54-0.93)</td></tr>
            <tr><td>Median PFS</td><td>7.2 months</td><td>4.8 months</td><td>0.58 (0.43-0.78)</td></tr>
            <tr><td>ORR</td><td>43.6%</td><td>21.5%</td><td>p < 0.001</td></tr>
          </table>
          <h4>Safety Summary</h4>
          <p>Treatment was generally well-tolerated. Most common TEAEs included diarrhea (52.0%), nausea (36.0%), fatigue (32.0%), decreased appetite (22.0%), and vomiting (18.0%). Grade ≥3 AEs occurred in 34.7% of Nexavant patients vs 45.3% in the control arm.</p>
        </div>`,
      sections: [{ id: 'clinical', number: section || '5.3.5', title: title, level: 1, content: 'Clinical study report content', wordCount: 45000 }],
      wordCount: 45000,
      pageCount: 156,
    };
  }
  
  // Default for any other modules
  return {
    content: `<h2>${title}</h2>
      <div class="document-preview">
        <p><strong>Document Information</strong></p>
        <ul>
          <li><strong>File:</strong> ${doc.filePath}</li>
          <li><strong>Module:</strong> ${doc.module}</li>
          <li><strong>Section:</strong> ${doc.section || 'N/A'}</li>
          <li><strong>Operation:</strong> ${doc.operation}</li>
          <li><strong>Sequence:</strong> ${doc.sequenceNumber}</li>
        </ul>
        <p><em>This is a demo preview of an eCTD document. In production, the actual document content would be rendered from the eCTD archive.</em></p>
      </div>`,
    sections: [{ id: 'main', number: doc.module, title: title, level: 1, content: 'Document content', wordCount: 100 }],
    wordCount: 100,
    pageCount: 1,
  };
}

function ectdToViewerDocument(doc: ECTDViewerDocument): ViewerDocument {
  const sampleContent = generateECTDSampleContent(doc);
  
  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.title.substring(0, 30) + (doc.title.length > 30 ? '...' : ''),
    documentType: `eCTD ${doc.fileType.toUpperCase()}`,
    version: `Seq ${doc.sequenceNumber}`,
    status: doc.operation,
    author: 'Ligature Therapeutics',
    lastModified: new Date().toISOString(),
    sections: [{
      id: 'main',
      number: doc.module,
      title: doc.section || doc.title,
      level: 1,
      content: sampleContent.content,
      wordCount: sampleContent.wordCount,
    }],
    productName: doc.applicationNumber,
    ctdSection: doc.module,
    wordCount: sampleContent.wordCount,
    pageCount: sampleContent.pageCount,
  };
}

function correspondenceToViewerDocument(doc: CorrespondenceDocument): ViewerDocument {
  const typeLabels: Record<CorrespondenceDocument['type'], string> = {
    'ha-letter': 'Health Authority Letter',
    'response': 'Response Document',
    'attachment': 'Attachment',
    'cover-letter': 'Cover Letter',
  };
  
  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.title.substring(0, 30) + (doc.title.length > 30 ? '...' : ''),
    documentType: typeLabels[doc.type],
    version: '1.0',
    status: doc.dateSent ? 'Sent' : (doc.dateReceived ? 'Received' : 'Draft'),
    author: doc.type === 'ha-letter' ? 'Health Authority' : 'Sponsor',
    lastModified: doc.dateSent || doc.dateReceived || new Date().toISOString(),
    sections: [{
      id: 'main',
      number: '1',
      title: 'Content',
      level: 1,
      content: doc.content || `<p><em>Document content available in external viewer</em></p>`,
      wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    }],
    productName: doc.applicationNumber,
    wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    pageCount: 1,
  };
}

function tmfToViewerDocument(doc: TMFArtifactDocument): ViewerDocument {
  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.title.substring(0, 30) + (doc.title.length > 30 ? '...' : ''),
    documentType: `TMF Artifact (${doc.zone})`,
    version: '1.0',
    status: doc.status,
    author: 'System',
    lastModified: new Date().toISOString(),
    sections: [{
      id: 'main',
      number: doc.artifactNumber,
      title: doc.section,
      level: 1,
      content: doc.content || `<p><em>Artifact content from TMF archive</em></p>`,
      wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    }],
    studyName: doc.studyId,
    wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    pageCount: 1,
  };
}

function safetyToViewerDocument(doc: SafetyCaseDocument): ViewerDocument {
  const typeLabels: Record<SafetyCaseDocument['type'], string> = {
    'narrative': 'Case Narrative',
    'source-doc': 'Source Document',
    'medwatch': 'MedWatch Form',
    'e2b-r3': 'E2B(R3) Report',
  };
  
  return {
    id: doc.id,
    title: doc.title,
    shortTitle: `Case ${doc.caseNumber}`,
    documentType: typeLabels[doc.type],
    version: '1.0',
    status: 'Active',
    author: 'Safety Team',
    lastModified: new Date().toISOString(),
    sections: [{
      id: 'main',
      number: '1',
      title: 'Case Information',
      level: 1,
      content: doc.content || `<p><em>Case documentation</em></p>`,
      wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    }],
    wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    pageCount: 1,
  };
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDocumentViewerService = create<DocumentViewerServiceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isOpen: false,
      currentDocument: null,
      viewerContext: null,
      sourceDocument: null,
      documentHistory: [],
      historyIndex: -1,
      
      // Main open method
      openDocument: (doc, context) => {
        let viewerDoc: ViewerDocument;
        
        switch (doc.type) {
          case 'authoring':
            viewerDoc = authoringToViewerDocument(doc.document);
            break;
          case 'viewer':
            viewerDoc = doc.document;
            break;
          case 'ectd':
            viewerDoc = ectdToViewerDocument(doc.document);
            break;
          case 'correspondence':
            viewerDoc = correspondenceToViewerDocument(doc.document);
            break;
          case 'tmf':
            viewerDoc = tmfToViewerDocument(doc.document);
            break;
          case 'safety':
            viewerDoc = safetyToViewerDocument(doc.document);
            break;
          default:
            throw new Error('Unknown document type');
        }
        
        const { documentHistory, historyIndex } = get();
        
        // Add to history
        const newHistory = documentHistory.slice(0, historyIndex + 1);
        newHistory.push({ document: viewerDoc, context });
        
        // Limit history to 20 entries
        if (newHistory.length > 20) {
          newHistory.shift();
        }
        
        set({
          isOpen: true,
          currentDocument: viewerDoc,
          viewerContext: context,
          sourceDocument: doc,
          documentHistory: newHistory,
          historyIndex: newHistory.length - 1,
        }, false, 'openDocument');
      },
      
      // Convenience methods
      openAuthoringDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'authoring', document: doc },
          { sourceModule: 'authoring', ...context }
        );
      },
      
      openViewerDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'viewer', document: doc },
          { sourceModule: context.sourceModule || 'authoring', ...context }
        );
      },
      
      openECTDDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'ectd', document: doc },
          { sourceModule: 'ectd', ...context }
        );
      },
      
      openCorrespondenceDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'correspondence', document: doc },
          { sourceModule: 'correspondence', ...context }
        );
      },
      
      openTMFDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'tmf', document: doc },
          { sourceModule: 'tmf', ...context }
        );
      },
      
      openSafetyDocument: (doc, context = {}) => {
        get().openDocument(
          { type: 'safety', document: doc },
          { sourceModule: 'safety', ...context }
        );
      },
      
      closeViewer: () => {
        const { viewerContext } = get();
        
        // Call return action if defined
        if (viewerContext?.returnAction) {
          viewerContext.returnAction();
        }
        
        set({
          isOpen: false,
          currentDocument: null,
          viewerContext: null,
          sourceDocument: null,
        }, false, 'closeViewer');
      },
      
      navigateBack: () => {
        const { documentHistory, historyIndex } = get();
        if (historyIndex > 0) {
          const prevEntry = documentHistory[historyIndex - 1];
          set({
            currentDocument: prevEntry.document,
            viewerContext: prevEntry.context,
            historyIndex: historyIndex - 1,
          }, false, 'navigateBack');
        }
      },
      
      navigateForward: () => {
        const { documentHistory, historyIndex } = get();
        if (historyIndex < documentHistory.length - 1) {
          const nextEntry = documentHistory[historyIndex + 1];
          set({
            currentDocument: nextEntry.document,
            viewerContext: nextEntry.context,
            historyIndex: historyIndex + 1,
          }, false, 'navigateForward');
        }
      },
      
      canNavigateBack: () => {
        return get().historyIndex > 0;
      },
      
      canNavigateForward: () => {
        const { documentHistory, historyIndex } = get();
        return historyIndex < documentHistory.length - 1;
      },
      
      // Cross-reference navigation (will be enhanced with actual lookup)
      navigateToDocument: (documentId, sectionId) => {
        // This would integrate with cross-reference store to find and open the document
        // For now, we log the navigation request
        // In full implementation, this would:
        // 1. Look up document in authoring store or submission store
        // 2. Convert to viewer document
        // 3. Open with context including highlightSectionId
      },
    }),
    { name: 'DocumentViewerService' }
  )
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export function useViewerIsOpen() {
  return useDocumentViewerService(s => s.isOpen);
}

export function useViewerDocument() {
  return useDocumentViewerService(s => s.currentDocument);
}

export function useViewerContext() {
  return useDocumentViewerService(s => s.viewerContext);
}

// Get stable action references
// Using useMemo to ensure actions work correctly across renders
export function useViewerActions() {
  const store = useDocumentViewerService;
  
  return useMemo(() => ({
    openDocument: (doc: ViewableDocument, context: ViewerContext) => store.getState().openDocument(doc, context),
    openAuthoringDocument: (doc: AuthoringDocument, context?: Partial<ViewerContext>) => store.getState().openAuthoringDocument(doc, context),
    openViewerDocument: (doc: ViewerDocument, context?: Partial<ViewerContext>) => store.getState().openViewerDocument(doc, context),
    openECTDDocument: (doc: ECTDViewerDocument, context?: Partial<ViewerContext>) => store.getState().openECTDDocument(doc, context),
    openCorrespondenceDocument: (doc: CorrespondenceDocument, context?: Partial<ViewerContext>) => store.getState().openCorrespondenceDocument(doc, context),
    openTMFDocument: (doc: TMFArtifactDocument, context?: Partial<ViewerContext>) => store.getState().openTMFDocument(doc, context),
    openSafetyDocument: (doc: SafetyCaseDocument, context?: Partial<ViewerContext>) => store.getState().openSafetyDocument(doc, context),
    closeViewer: () => store.getState().closeViewer(),
    navigateBack: () => store.getState().navigateBack(),
    navigateForward: () => store.getState().navigateForward(),
    navigateToDocument: (docId: string, sectionId?: string) => store.getState().navigateToDocument(docId, sectionId),
  }), []);
}

export function useViewerNavigation() {
  const historyIndex = useDocumentViewerService(s => s.historyIndex);
  const historyLength = useDocumentViewerService(s => s.documentHistory.length);
  
  return useMemo(() => ({ 
    canBack: historyIndex > 0, 
    canForward: historyIndex < historyLength - 1, 
    back: useDocumentViewerService.getState().navigateBack, 
    forward: useDocumentViewerService.getState().navigateForward,
  }), [historyIndex, historyLength]);
}
