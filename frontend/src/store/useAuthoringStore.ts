

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  AuthoringDocument, 
  DocumentSection, 
  DocumentType,
  SectionStatus 
} from '@/types/authoring';
import { SourceType } from '@/config/ai-authoring-config';
import { 
  CSRTemplateResult, 
  CSRTemplateSection,
  LineageRecord,
  TemplateGenerationOptions,
  generateEfficacySections,
  getTemplatePreview,
  validateEndpointsForTemplate,
} from '@/services/usdm-authoring-template-service';
import { USDMObjective, USDMEndpoint } from '@/domains/usdm/contracts';
import { useCrossModuleStore } from './useCrossModuleStore';

// Source document for AI generation
export interface SourceDocument {
  id: string;
  title: string;
  type: SourceType;
  version: string;
  status: 'available' | 'linked' | 'pending';
  sections?: { id: string; number: string; title: string; excerpt?: string }[];
}

// Citation from AI generation
export interface Citation {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceSection?: string;
  quotedText?: string;
  pageNumber?: string;
  confidence: 'high' | 'medium' | 'low';
  position?: { start: number; end: number };
}

// AI generation result for a section
export interface SectionDraft {
  sectionId: string;
  content: string;
  citations: Citation[];
  generatedAt: Date;
  sourceIds: string[];
  isAccepted: boolean;
  wordCount: number;
}

// Authoring store state
interface AuthoringState {
  // Document list (centralized - v0.21.4)
  documents: AuthoringDocument[];
  
  // Current document
  currentDocument: AuthoringDocument | null;
  
  // Available sources for the document
  availableSources: SourceDocument[];
  selectedSourceIds: Set<string>;
  
  // AI generation state
  sectionDrafts: Record<string, SectionDraft>;
  isGenerating: boolean;
  generatingSection: string | null;
  
  // Editor state
  selectedSectionId: string | null;
  expandedSections: Set<string>;
  hasUnsavedChanges: boolean;
  
  // CSR Template Generation (v204c-b2)
  csrTemplateResult: CSRTemplateResult | null;
  isGeneratingCSR: boolean;
  csrGenerationError: string | null;
  
  // Actions
  setCurrentDocument: (doc: AuthoringDocument | null) => void;
  setAvailableSources: (sources: SourceDocument[]) => void;
  toggleSourceSelection: (sourceId: string) => void;
  selectAllSources: () => void;
  clearSourceSelection: () => void;
  
  setSelectedSection: (sectionId: string | null) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  
  startGeneration: (sectionId: string) => void;
  completeGeneration: (sectionId: string, draft: Omit<SectionDraft, 'sectionId'>) => void;
  failGeneration: () => void;
  
  acceptDraft: (sectionId: string) => void;
  discardDraft: (sectionId: string) => void;
  
  updateSectionStatus: (sectionId: string, status: SectionStatus) => void;
  updateSectionContent: (sectionId: string, content: string) => void;
  
  setUnsavedChanges: (hasChanges: boolean) => void;
  
  // Document list management (v0.21.4)
  initializeDocuments: (docs: AuthoringDocument[]) => void;
  addDocument: (doc: AuthoringDocument) => void;
  updateDocument: (id: string, updates: Partial<AuthoringDocument>) => void;
  getDocumentById: (id: string) => AuthoringDocument | undefined;
  
  // CSR Template Generation Actions (v204c-b2)
  generateCSRFromUSDM: (
    studyId: string,
    studyDesignId: string,
    objectives: USDMObjective[],
    endpoints: USDMEndpoint[],
    options?: Partial<TemplateGenerationOptions>
  ) => CSRTemplateResult;
  previewCSRTemplate: (
    objectives: USDMObjective[],
    endpoints: USDMEndpoint[]
  ) => { sectionCount: number; estimatedWordCount: number; hasObjective: boolean };
  validateCSREndpoints: (
    endpoints: USDMEndpoint[]
  ) => { isValid: boolean; errors: string[]; warnings: string[] };
  clearCSRTemplate: () => void;
  
  // Computed
  getSelectedSources: () => SourceDocument[];
  getSectionDraft: (sectionId: string) => SectionDraft | undefined;
  canGenerate: () => boolean;
  getCSRTemplateResult: () => CSRTemplateResult | null;
}

// Mock sources - in production these would come from your document management system
const createMockSources = (documentType: DocumentType): SourceDocument[] => {
  const baseSources: SourceDocument[] = [
    {
      id: 'src-csr-001',
      title: 'Clinical Study Report - Study LIG-301',
      type: 'clinical-study-report',
      version: '2.1',
      status: 'available',
      sections: [
        { id: 'csr-11', number: '11', title: 'Efficacy Evaluation' },
        { id: 'csr-12', number: '12', title: 'Safety Evaluation' },
        { id: 'csr-14', number: '14', title: 'Tables, Figures, and Listings' },
      ],
    },
    {
      id: 'src-sap-001',
      title: 'Statistical Analysis Plan v1.0',
      type: 'statistical-analysis',
      version: '1.0',
      status: 'available',
      sections: [
        { id: 'sap-4', number: '4', title: 'Analysis Methods' },
        { id: 'sap-5', number: '5', title: 'Endpoints' },
      ],
    },
    {
      id: 'src-protocol-001',
      title: 'Protocol LIG-301-v3',
      type: 'protocol',
      version: '3.0',
      status: 'available',
      sections: [
        { id: 'proto-6', number: '6', title: 'Study Design' },
        { id: 'proto-7', number: '7', title: 'Selection of Subjects' },
      ],
    },
    {
      id: 'src-safety-001',
      title: 'Safety Database Extract',
      type: 'safety-database',
      version: '2024-12-01',
      status: 'available',
    },
    {
      id: 'src-ib-001',
      title: "Investigator's Brochure v8",
      type: 'investigator-brochure',
      version: '8.0',
      status: 'available',
      sections: [
        { id: 'ib-4', number: '4', title: 'Nonclinical Studies' },
        { id: 'ib-5', number: '5', title: 'Effects in Humans' },
      ],
    },
    {
      id: 'src-pk-001',
      title: 'Population PK Analysis Report',
      type: 'pk-data',
      version: '1.0',
      status: 'available',
    },
    {
      id: 'src-nonclin-001',
      title: 'Nonclinical Overview',
      type: 'nonclinical-studies',
      version: '1.0',
      status: 'available',
    },
  ];
  
  return baseSources;
};

export const useAuthoringStore = create<AuthoringState>()(
  devtools(
    (set, get) => ({
      // Initial state
      documents: [],  // Centralized document list (v0.21.4)
      currentDocument: null,
      availableSources: [],
      selectedSourceIds: new Set(),
      sectionDrafts: {},
      isGenerating: false,
      generatingSection: null,
      selectedSectionId: null,
      expandedSections: new Set(),
      hasUnsavedChanges: false,
      
      // CSR Template Generation state (v204c-b2)
      csrTemplateResult: null,
      isGeneratingCSR: false,
      csrGenerationError: null,
      
      // Actions
      setCurrentDocument: (doc) => {
        const sources = doc ? createMockSources(doc.documentType) : [];
        set((state) => {
          // v0.21.5: Ensure document is in documents[] array
          let updatedDocuments = state.documents;
          if (doc) {
            const exists = state.documents.some(d => d.id === doc.id);
            if (exists) {
              // Update existing document
              updatedDocuments = state.documents.map(d => d.id === doc.id ? doc : d);
            } else {
              // Add new document
              updatedDocuments = [...state.documents, doc];
            }
          }
          
          return {
            documents: updatedDocuments,
            currentDocument: doc,
            availableSources: sources,
            selectedSourceIds: new Set(),
            sectionDrafts: {},
            selectedSectionId: (doc?.sections ?? [])[0]?.id || null,
            expandedSections: new Set((doc?.sections ?? []).map(s => s.id)),
            hasUnsavedChanges: false,
          };
        }, false, 'setCurrentDocument');
      },
      
      setAvailableSources: (sources) => 
        set({ availableSources: sources }, false, 'setAvailableSources'),
      
      toggleSourceSelection: (sourceId) => 
        set((state) => {
          const next = new Set(state.selectedSourceIds);
          if (next.has(sourceId)) {
            next.delete(sourceId);
          } else {
            next.add(sourceId);
          }
          return { selectedSourceIds: next };
        }, false, 'toggleSourceSelection'),
      
      selectAllSources: () =>
        set((state) => ({
          selectedSourceIds: new Set(state.availableSources.map(s => s.id))
        }), false, 'selectAllSources'),
      
      clearSourceSelection: () =>
        set({ selectedSourceIds: new Set() }, false, 'clearSourceSelection'),
      
      setSelectedSection: (sectionId) =>
        set({ selectedSectionId: sectionId }, false, 'setSelectedSection'),
      
      toggleSectionExpanded: (sectionId) =>
        set((state) => {
          const next = new Set(state.expandedSections);
          if (next.has(sectionId)) {
            next.delete(sectionId);
          } else {
            next.add(sectionId);
          }
          return { expandedSections: next };
        }, false, 'toggleSectionExpanded'),
      
      startGeneration: (sectionId) =>
        set({ 
          isGenerating: true, 
          generatingSection: sectionId 
        }, false, 'startGeneration'),
      
      completeGeneration: (sectionId, draft) =>
        set((state) => ({
          isGenerating: false,
          generatingSection: null,
          sectionDrafts: {
            ...state.sectionDrafts,
            [sectionId]: { ...draft, sectionId },
          },
        }), false, 'completeGeneration'),
      
      failGeneration: () =>
        set({ 
          isGenerating: false, 
          generatingSection: null 
        }, false, 'failGeneration'),
      
      acceptDraft: (sectionId) =>
        set((state) => {
          const draft = state.sectionDrafts[sectionId];
          if (!draft) return state;
          
          return {
            sectionDrafts: {
              ...state.sectionDrafts,
              [sectionId]: { ...draft, isAccepted: true },
            },
            hasUnsavedChanges: true,
          };
        }, false, 'acceptDraft'),
      
      discardDraft: (sectionId) =>
        set((state) => {
          const { [sectionId]: _, ...rest } = state.sectionDrafts;
          return { sectionDrafts: rest };
        }, false, 'discardDraft'),
      
      updateSectionStatus: (sectionId, status) =>
        set((state) => {
          if (!state.currentDocument) return state;
          
          const updateSections = (sections: DocumentSection[]): DocumentSection[] =>
            sections.map(s => 
              s.id === sectionId 
                ? { ...s, status }
                : s.subsections 
                  ? { ...s, subsections: updateSections(s.subsections) }
                  : s
            );
          
          const updatedDoc = {
            ...state.currentDocument,
            sections: updateSections(state.currentDocument.sections ?? []),
            updatedAt: new Date().toISOString(),
          };
          
          return {
            currentDocument: updatedDoc,
            // v0.21.5: Also sync to documents[] array for persistence
            documents: state.documents.map(d =>
              d.id === updatedDoc.id ? updatedDoc : d
            ),
            hasUnsavedChanges: true,
          };
        }, false, 'updateSectionStatus'),
      
      updateSectionContent: (sectionId, content) =>
        set((state) => {
          if (!state.currentDocument) return state;
          
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          
          const updateSections = (sections: DocumentSection[]): DocumentSection[] =>
            sections.map(s => 
              s.id === sectionId 
                ? { ...s, content, wordCount, lastEditedAt: new Date().toISOString() }
                : s.subsections 
                  ? { ...s, subsections: updateSections(s.subsections) }
                  : s
            );
          
          const updatedDoc = {
            ...state.currentDocument,
            sections: updateSections(state.currentDocument.sections ?? []),
            updatedAt: new Date().toISOString(),
          };
          
          return {
            currentDocument: updatedDoc,
            // v0.21.5: Also sync to documents[] array for persistence
            documents: state.documents.map(d =>
              d.id === updatedDoc.id ? updatedDoc : d
            ),
            hasUnsavedChanges: true,
          };
        }, false, 'updateSectionContent'),
      
      setUnsavedChanges: (hasChanges) =>
        set({ hasUnsavedChanges: hasChanges }, false, 'setUnsavedChanges'),
      
      // Document list management actions (v0.21.4)
      initializeDocuments: (docs) =>
        set({ documents: docs }, false, 'initializeDocuments'),
      
      addDocument: (doc) => {
        set((state) => ({
          documents: [...state.documents, doc],
        }), false, 'addDocument');
        
        // Emit cross-module event
        useCrossModuleStore.getState().emitEvent({
          eventType: 'entity-created',
          sourceModule: 'authoring',
          targetModules: ['tmf', 'submissions', 'regulatory'],
          entityType: 'document',
          entityId: doc.id,
          description: `Document created: ${doc.title}`,
          payload: { title: doc.title, documentType: doc.documentType, status: doc.status },
        });
      },
      
      updateDocument: (id, updates) => {
        const existingDoc = get().documents.find(d => d.id === id);
        
        set((state) => ({
          documents: state.documents.map(d =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
          // Also update currentDocument if it's the same one
          currentDocument: state.currentDocument?.id === id
            ? { ...state.currentDocument, ...updates, updatedAt: new Date().toISOString() }
            : state.currentDocument,
        }), false, 'updateDocument');
        
        // v0.40.9: Auto-link to TMF when document is approved/finalized
        const newStatus = updates.status;
        const isFinalized = newStatus === 'approved' || newStatus === 'submission-ready';
        const tmfDocTypes = ['protocol', 'ib', 'icf', 'csr', 'dsur'];
        
        if (isFinalized && existingDoc && tmfDocTypes.includes(existingDoc.documentType) && typeof window !== 'undefined') {
          import('@/services/tmf-auto-link-service').then(({ tmfAutoLinkService }) => {
            // Map authoring doc types to TMF auto-link types
            const typeMap: Record<string, 'protocol' | 'ib' | 'icf' | 'other'> = {
              'protocol': 'protocol',
              'ib': 'ib',
              'icf': 'icf',
              'csr': 'other',
              'dsur': 'other',
            };
            
            tmfAutoLinkService.onDocumentFinalized({
              documentId: id,
              studyId: existingDoc.studyId || 'study-001',
              documentType: typeMap[existingDoc.documentType] || 'other',
              documentTitle: existingDoc.title,
              version: existingDoc.version,
            }).then(result => {
              if (result.success && result.artifact) {
                /* TMF auto-linked */
              }
            }).catch(err => {
              console.warn('[TMF Auto-Link] Failed to auto-link document:', err);
            });
          }).catch(() => {
            // Service not available (SSR or build time)
          });
        }
      },
      
      getDocumentById: (id) => get().documents.find(d => d.id === id),
      
      // CSR Template Generation Actions (v204c-b2)
      generateCSRFromUSDM: (studyId, studyDesignId, objectives, endpoints, options = {}) => {
        set({ isGeneratingCSR: true, csrGenerationError: null }, false, 'generateCSRFromUSDM:start');
        
        try {
          const defaultOptions: TemplateGenerationOptions = {
            includeMethodology: true,
            includeStatisticalApproach: true,
            includePlaceholders: true,
            ...options,
          };
          
          const result = generateEfficacySections(
            studyId,
            studyDesignId,
            objectives,
            endpoints,
            defaultOptions
          );
          
          set({ 
            csrTemplateResult: result, 
            isGeneratingCSR: false,
            csrGenerationError: null,
          }, false, 'generateCSRFromUSDM:complete');
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate CSR template';
          set({ 
            isGeneratingCSR: false, 
            csrGenerationError: errorMessage,
            csrTemplateResult: null,
          }, false, 'generateCSRFromUSDM:error');
          throw error;
        }
      },
      
      previewCSRTemplate: (objectives, endpoints) => {
        const preview = getTemplatePreview(objectives, endpoints);
        return {
          sectionCount: preview.sectionCount,
          estimatedWordCount: preview.estimatedWordCount,
          hasObjective: preview.hasObjective,
        };
      },
      
      validateCSREndpoints: (endpoints) => {
        return validateEndpointsForTemplate(endpoints);
      },
      
      clearCSRTemplate: () =>
        set({ 
          csrTemplateResult: null, 
          csrGenerationError: null,
        }, false, 'clearCSRTemplate'),
      
      // Computed
      getSelectedSources: () => {
        const state = get();
        return state.availableSources.filter(s => state.selectedSourceIds.has(s.id));
      },
      
      getSectionDraft: (sectionId) => get().sectionDrafts[sectionId],
      
      canGenerate: () => {
        const state = get();
        return state.selectedSourceIds.size > 0 && !state.isGenerating;
      },
      
      getCSRTemplateResult: () => get().csrTemplateResult,
    }),
    { name: 'AuthoringStore' }
  )
);
